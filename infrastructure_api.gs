/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFRASTRUCTURE — API HANDLER LAYER (infrastructure_api.gs)
 * ───────────────────────────────────────────────────────────────────────────
 * Thin JSON wrappers over Foundation, K14, and Execution functions.
 * Called by the doPost router in infrastructure_webapp.gs.
 *
 * Architecture:
 *   Lovable (React) → doPost JSON → api handlers → Foundation/K14/Execution
 *
 * Rules:
 *   - Handlers are read/write pass-throughs only. Zero business logic here.
 *   - All business decisions remain in K14.
 *   - All truth mutations go through Foundation.
 *   - All state transitions go through Execution.
 *   - Every handler returns { ok, data } | { ok, error }.
 *
 * Handlers:
 *   CANDIDATES  : apiHCandidateList_, apiHCandidateGet_, apiHCandidateCreate_,
 *                 apiHCandidateUpdateState_, apiHCandidateTimeline_
 *   REQUIREMENTS: apiHRequirementList_, apiHRequirementGet_, apiHRequirementCreate_
 *   CLIENTS     : apiHClientList_, apiHClientGet_, apiHClientCreate_
 *   PROJECTS    : apiHProjectList_, apiHProjectGet_, apiHProjectCreate_
 *   CAMPAIGNS   : apiHCampaignList_, apiHCampaignGet_, apiHCampaignCreate_
 *   ASSOCIATES  : apiHAssociateList_, apiHAssociateGet_, apiHAssociateCreate_
 *   K14         : apiHScreenCv_, apiHMatchCandidates_, apiHGetTopMatches_,
 *                 apiHGetRequirementMatch_
 *   SUBMISSION  : apiHAddToProject_, apiHShortlist_, apiHSubmissionCreate_,
 *                 apiHSubmissionAddCandidate_, apiHSubmissionGeneratePackage_,
 *                 apiHSubmissionSubmit_
 *   PIPELINE    : apiHPipelineAdvance_, apiHMobilizationAdvance_,
 *                 apiHOutcomeCapture_
 *   QUEUE       : apiHQueueGet_
 *   DASHBOARD   : apiHDashboard_
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── HELPER ────────────────────────────────────────────────────────────────

function apiOk_(data) { return { ok: true, data: data }; }
function apiErr_(msg) { return { ok: false, error: String(msg) }; }

/** Read a sheet and return all rows as header-keyed objects (with row index). */
function apiReadSheet_(sheetName, maxCols) {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var lastCol = maxCols ? Math.min(maxCols, sheet.getLastColumn()) : sheet.getLastColumn();
  if (lastCol < 1) return [];
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h){ return String(h).trim(); });
  var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
  return data.map(function(row, ri) {
    var obj = { _rowIndex: ri + 2 };
    headers.forEach(function(h, ci) {
      if (h) obj[h] = row[ci] instanceof Date ? row[ci].toISOString() : row[ci];
    });
    return obj;
  });
}

/** Apply simple filters: search (string, matches any string field), exact field matches. */
function apiFilter_(rows, opts) {
  opts = opts || {};
  var search = String(opts.search || '').toLowerCase().trim();
  var exact  = opts.exact || {};  // { FieldName: 'value' } — case-insensitive match
  return rows.filter(function(row) {
    // Exact field matches
    for (var field in exact) {
      if (!exact.hasOwnProperty(field)) continue;
      var val = String(row[field] || '').trim().toLowerCase();
      if (val !== String(exact[field] || '').trim().toLowerCase()) return false;
    }
    // Full-text search across all string fields
    if (search) {
      var found = false;
      for (var k in row) {
        if (!row.hasOwnProperty(k) || k === '_rowIndex') continue;
        if (String(row[k] || '').toLowerCase().indexOf(search) >= 0) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  });
}

/** Paginate a filtered array. */
function apiPaginate_(rows, opts) {
  opts   = opts || {};
  var page  = Math.max(1, parseInt(opts.page)  || 1);
  var limit = Math.min(200, Math.max(1, parseInt(opts.limit) || 50));
  var total = rows.length;
  var start = (page - 1) * limit;
  return { rows: rows.slice(start, start + limit), total: total, page: page, limit: limit };
}

// ── CANDIDATES ────────────────────────────────────────────────────────────

/**
 * API.H01 — List candidates with optional search, state, trade filters.
 * Reads from KAI14 Candidates sheet (post-migration).
 */
function apiHCandidateList_(payload, user) {
  try {
    var rows = apiReadSheet_('Candidates');
    var exact = {};
    if (payload.state) exact['State'] = payload.state;
    if (payload.verdict) exact['Verdict'] = payload.verdict;
    if (payload.source) exact['Source'] = payload.source;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    // Trade partial match (since exact isn't right for partial)
    if (payload.trade) {
      var t = String(payload.trade).toLowerCase();
      filtered = filtered.filter(function(r){
        return String(r['Trade'] || '').toLowerCase().indexOf(t) >= 0;
      });
    }
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ candidates: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listCandidates: ' + err.message);
  }
}

/**
 * API.H02 — Get a single candidate by KAINo.
 */
function apiHCandidateGet_(payload, user) {
  if (!payload.kaiNo) return apiErr_('kaiNo is required.');
  try {
    var candidate = findCandidateByKaiNo(payload.kaiNo);
    if (!candidate) return apiErr_('Candidate not found: ' + payload.kaiNo);
    return apiOk_({ candidate: candidate });
  } catch (err) {
    return apiErr_('getCandidate: ' + err.message);
  }
}

/**
 * API.H03 — Create a candidate (via Foundation).
 */
function apiHCandidateCreate_(payload, user) {
  try {
    var result = createCandidate(payload.fields || payload, { by: user ? user.email : 'api' });
    return result.ok ? apiOk_(result) : apiErr_(result.error || 'createCandidate failed');
  } catch (err) {
    return apiErr_('createCandidate: ' + err.message);
  }
}

/**
 * API.H04 — Update candidate state (via Foundation).
 */
function apiHCandidateUpdateState_(payload, user) {
  if (!payload.kaiNo || !payload.state) return apiErr_('kaiNo and state are required.');
  try {
    var result = updateCandidateFoundationState(
      payload.kaiNo, payload.state, { by: user ? user.email : 'api' }
    );
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'updateState failed');
  } catch (err) {
    return apiErr_('updateCandidateState: ' + err.message);
  }
}

/**
 * API.H05 — Create candidate from a K14 CV screening result.
 */
function apiHCandidateCreateFromScreening_(payload, user) {
  try {
    var result = createCandidateFromScreeningPublic(payload.screeningResult || payload);
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'createFromScreening failed');
  } catch (err) {
    return apiErr_('createCandidateFromScreening: ' + err.message);
  }
}

/**
 * API.H06 — Get candidate timeline (from execution history).
 */
function apiHCandidateTimeline_(payload, user) {
  if (!payload.kaiNo) return apiErr_('kaiNo is required.');
  try {
    var rows = apiReadSheet_('_Logs');
    var timeline = rows.filter(function(r) {
      return String(r['KAINo'] || r['Payload'] || '').indexOf(payload.kaiNo) >= 0;
    }).slice(0, 200);
    return apiOk_({ timeline: timeline, kaiNo: payload.kaiNo });
  } catch (err) {
    return apiErr_('getTimeline: ' + err.message);
  }
}

// ── REQUIREMENTS ──────────────────────────────────────────────────────────

/**
 * API.H10 — List requirements.
 */
function apiHRequirementList_(payload, user) {
  try {
    var rows = apiReadSheet_('_Requirements');
    var exact = {};
    if (payload.status) exact['Status'] = payload.status;
    if (payload.trade)  exact['Trade']  = payload.trade;
    if (payload.clientId) exact['ClientID'] = payload.clientId;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ requirements: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listRequirements: ' + err.message);
  }
}

/**
 * API.H11 — Get a single requirement.
 */
function apiHRequirementGet_(payload, user) {
  if (!payload.requirementId) return apiErr_('requirementId is required.');
  try {
    var req = findRequirementById(payload.requirementId);
    if (!req) return apiErr_('Requirement not found: ' + payload.requirementId);
    return apiOk_({ requirement: req });
  } catch (err) {
    return apiErr_('getRequirement: ' + err.message);
  }
}

/**
 * API.H12 — Create a requirement (via Foundation).
 */
function apiHRequirementCreate_(payload, user) {
  try {
    var result = createRequirement(payload.fields || payload, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'createRequirement failed');
  } catch (err) {
    return apiErr_('createRequirement: ' + err.message);
  }
}

// ── CLIENTS ───────────────────────────────────────────────────────────────

/**
 * API.H20 — List clients.
 */
function apiHClientList_(payload, user) {
  try {
    var rows = apiReadSheet_('_Clients');
    var exact = {};
    if (payload.status) exact['FoundationStatus'] = payload.status;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ clients: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listClients: ' + err.message);
  }
}

/**
 * API.H21 — Get a single client.
 */
function apiHClientGet_(payload, user) {
  if (!payload.clientId && !payload.clientCode && !payload.clientName) {
    return apiErr_('clientId, clientCode, or clientName is required.');
  }
  try {
    var client = payload.clientId   ? findClientById(payload.clientId)
               : payload.clientCode ? findClientByCode(payload.clientCode)
               :                      findClientByName(payload.clientName);
    if (!client) return apiErr_('Client not found.');
    return apiOk_({ client: client });
  } catch (err) {
    return apiErr_('getClient: ' + err.message);
  }
}

/**
 * API.H22 — Create a client (via Foundation).
 */
function apiHClientCreate_(payload, user) {
  try {
    var result = createClient(payload.fields || payload, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'createClient failed');
  } catch (err) {
    return apiErr_('createClient: ' + err.message);
  }
}

// ── PROJECTS ──────────────────────────────────────────────────────────────

/**
 * API.H30 — List projects.
 */
function apiHProjectList_(payload, user) {
  try {
    var rows = apiReadSheet_('_Projects');
    var exact = {};
    if (payload.clientId) exact['ClientID'] = payload.clientId;
    if (payload.status)   exact['FoundationStatus'] = payload.status;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ projects: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listProjects: ' + err.message);
  }
}

/**
 * API.H31 — Get a single project.
 */
function apiHProjectGet_(payload, user) {
  if (!payload.projectId) return apiErr_('projectId is required.');
  try {
    var project = findProjectById(payload.projectId);
    if (!project) return apiErr_('Project not found: ' + payload.projectId);
    return apiOk_({ project: project });
  } catch (err) {
    return apiErr_('getProject: ' + err.message);
  }
}

/**
 * API.H32 — Create a project (via Foundation).
 */
function apiHProjectCreate_(payload, user) {
  try {
    var result = createProject(payload.fields || payload, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'createProject failed');
  } catch (err) {
    return apiErr_('createProject: ' + err.message);
  }
}

// ── CAMPAIGNS ─────────────────────────────────────────────────────────────

/**
 * API.H40 — List campaigns.
 */
function apiHCampaignList_(payload, user) {
  try {
    var rows = apiReadSheet_('_Campaigns');
    var exact = {};
    if (payload.projectId) exact['ProjectID'] = payload.projectId;
    if (payload.clientId)  exact['ClientID']  = payload.clientId;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ campaigns: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listCampaigns: ' + err.message);
  }
}

/**
 * API.H41 — Get a single campaign.
 */
function apiHCampaignGet_(payload, user) {
  if (!payload.campaignId) return apiErr_('campaignId is required.');
  try {
    var campaign = findCampaignById(payload.campaignId);
    if (!campaign) return apiErr_('Campaign not found: ' + payload.campaignId);
    return apiOk_({ campaign: campaign });
  } catch (err) {
    return apiErr_('getCampaign: ' + err.message);
  }
}

/**
 * API.H42 — Create a campaign (via Foundation).
 */
function apiHCampaignCreate_(payload, user) {
  try {
    var result = createCampaign(payload.fields || payload, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'createCampaign failed');
  } catch (err) {
    return apiErr_('createCampaign: ' + err.message);
  }
}

// ── ASSOCIATES / SOURCING PARTNERS ───────────────────────────────────────

/**
 * API.H50 — List associates (sourcing partners).
 */
function apiHAssociateList_(payload, user) {
  try {
    var rows = apiReadSheet_('_Associates');
    var exact = {};
    if (payload.status) exact['FoundationStatus'] = payload.status;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ associates: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listAssociates: ' + err.message);
  }
}

/**
 * API.H51 — Get a single associate.
 */
function apiHAssociateGet_(payload, user) {
  if (!payload.associateId) return apiErr_('associateId is required.');
  try {
    var assoc = findAssociateById(payload.associateId);
    if (!assoc) return apiErr_('Associate not found: ' + payload.associateId);
    return apiOk_({ associate: assoc });
  } catch (err) {
    return apiErr_('getAssociate: ' + err.message);
  }
}

/**
 * API.H52 — Create an associate (sourcing partner) (via Foundation).
 */
function apiHAssociateCreate_(payload, user) {
  try {
    var result = createAssociate(payload.fields || payload, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'createAssociate failed');
  } catch (err) {
    return apiErr_('createAssociate: ' + err.message);
  }
}

// ── K14 INTELLIGENCE ──────────────────────────────────────────────────────

/**
 * API.H60 — Screen a CV with K14 (returns assessment, score, verdict).
 */
function apiHScreenCv_(payload, user) {
  if (!payload.cvText) return apiErr_('cvText is required.');
  try {
    var result = screenCvPublic(payload.cvText, payload.filters || {});
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'screenCv failed');
  } catch (err) {
    return apiErr_('screenCv: ' + err.message);
  }
}

/**
 * API.H61 — Match candidates to a requirement (K14 ranked output).
 */
function apiHMatchCandidates_(payload, user) {
  if (!payload.requirementId) return apiErr_('requirementId is required.');
  try {
    var result = matchCandidatesForReqPublic(
      payload.requirementId,
      payload.limit || 20
    );
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'matchCandidates failed');
  } catch (err) {
    return apiErr_('matchCandidates: ' + err.message);
  }
}

/**
 * API.H62 — Get top match summary for a requirement.
 */
function apiHGetTopMatches_(payload, user) {
  if (!payload.requirementId) return apiErr_('requirementId is required.');
  try {
    var result = getTopMatchSummaryPublic(payload.requirementId);
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'getTopMatches failed');
  } catch (err) {
    return apiErr_('getTopMatches: ' + err.message);
  }
}

/**
 * API.H63 — Get requirement details (K14 public surface).
 */
function apiHGetRequirementMatch_(payload, user) {
  if (!payload.requirementId) return apiErr_('requirementId is required.');
  try {
    var result = getRequirementByIdPublic(payload.requirementId);
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'getRequirementMatch failed');
  } catch (err) {
    return apiErr_('getRequirementByIdPublic: ' + err.message);
  }
}

// ── SUBMISSION WORKFLOW ───────────────────────────────────────────────────

/**
 * API.H70 — Add candidate to a project/requirement (first step of submission chain).
 */
function apiHAddToProject_(payload, user) {
  if (!payload.requirementId || !payload.kaiNo) return apiErr_('requirementId and kaiNo are required.');
  try {
    var result = addProjectCandidate(
      payload.requirementId,
      payload.kaiNo,
      payload.k14 || {},
      { by: user ? user.email : 'api' }
    );
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'addToProject failed');
  } catch (err) {
    return apiErr_('addToProject: ' + err.message);
  }
}

/**
 * API.H71 — Shortlist a project candidate.
 */
function apiHShortlist_(payload, user) {
  if (!payload.pcid) return apiErr_('pcid (project candidate ID) is required.');
  try {
    var result = shortlistProjectCandidate(payload.pcid, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'shortlist failed');
  } catch (err) {
    return apiErr_('shortlistCandidate: ' + err.message);
  }
}

/**
 * API.H72 — Create a submission batch for a requirement.
 */
function apiHSubmissionCreate_(payload, user) {
  if (!payload.requirementId) return apiErr_('requirementId is required.');
  try {
    var result = createSubmissionBatch(payload.requirementId, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'createSubmissionBatch failed');
  } catch (err) {
    return apiErr_('createSubmissionBatch: ' + err.message);
  }
}

/**
 * API.H73 — Add a project candidate to a submission batch.
 */
function apiHSubmissionAddCandidate_(payload, user) {
  if (!payload.batchId || !payload.pcid) return apiErr_('batchId and pcid are required.');
  try {
    var result = addCandidateToBatch(payload.batchId, payload.pcid, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'addCandidateToBatch failed');
  } catch (err) {
    return apiErr_('addCandidateToBatch: ' + err.message);
  }
}

/**
 * API.H74 — Generate the submission package (document export).
 */
function apiHSubmissionGeneratePackage_(payload, user) {
  if (!payload.batchId) return apiErr_('batchId is required.');
  try {
    var result = generateSubmissionPackage(payload.batchId, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'generatePackage failed');
  } catch (err) {
    return apiErr_('generateSubmissionPackage: ' + err.message);
  }
}

/**
 * API.H75 — Submit a batch to the client.
 */
function apiHSubmissionSubmit_(payload, user) {
  if (!payload.batchId) return apiErr_('batchId is required.');
  try {
    var result = submitBatch(payload.batchId, { by: user ? user.email : 'api' });
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'submitBatch failed');
  } catch (err) {
    return apiErr_('submitBatch: ' + err.message);
  }
}

// ── PIPELINE / MOBILIZATION ───────────────────────────────────────────────

/**
 * API.H80 — Advance pipeline state (interview scheduled → offer released, etc.).
 */
function apiHPipelineAdvance_(payload, user) {
  if (!payload.pipelineId || !payload.toState) return apiErr_('pipelineId and toState are required.');
  try {
    var result = advancePipeline(
      payload.pipelineId,
      payload.toState,
      payload.evidence || {},
      { by: user ? user.email : 'api' }
    );
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'advancePipeline failed');
  } catch (err) {
    return apiErr_('advancePipeline: ' + err.message);
  }
}

/**
 * API.H81 — Advance a mobilization gate (visa, medical, deployment, etc.).
 */
function apiHMobilizationAdvance_(payload, user) {
  if (!payload.mobPipeId || !payload.toGate) return apiErr_('mobPipeId and toGate are required.');
  try {
    var result = advanceMobilizationGate(
      payload.mobPipeId,
      payload.toGate,
      payload.evidence || {},
      { by: user ? user.email : 'api' }
    );
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'advanceMobilization failed');
  } catch (err) {
    return apiErr_('advanceMobilization: ' + err.message);
  }
}

/**
 * API.H82 — Capture an outcome (selection, rejection, deployment, offer accepted, etc.).
 */
function apiHOutcomeCapture_(payload, user) {
  if (!payload.mobPipeId || !payload.outcomeType) return apiErr_('mobPipeId and outcomeType are required.');
  try {
    var result = captureOutcome(
      payload.mobPipeId,
      payload.outcomeType,
      payload.evidence || {},
      { by: user ? user.email : 'api' }
    );
    return result && result.ok ? apiOk_(result) : apiErr_((result && result.error) || 'captureOutcome failed');
  } catch (err) {
    return apiErr_('captureOutcome: ' + err.message);
  }
}

// ── QUEUE ─────────────────────────────────────────────────────────────────

/**
 * API.H90 — Get the active queue (recruiter's work list).
 */
function apiHQueueGet_(payload, user) {
  try {
    var rows = apiReadSheet_('_Queue');
    var exact = {};
    if (payload.status)     exact['Status']  = payload.status;
    if (payload.assignedTo) exact['AssignedTo'] = payload.assignedTo;
    if (payload.step)       exact['Step']    = payload.step;

    // Default: filter to this user's queue if no explicit assignedTo
    if (!payload.assignedTo && !payload.all && user) {
      exact['AssignedTo'] = user.email;
    }

    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    // Sort by priority then created
    filtered.sort(function(a, b) {
      var pa = String(a['Priority'] || '').toLowerCase();
      var pb = String(b['Priority'] || '').toLowerCase();
      var order = { high: 0, med: 1, low: 2 };
      return (order[pa] || 99) - (order[pb] || 99);
    });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ queue: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('getQueue: ' + err.message);
  }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────

/**
 * API.H100 — Return summary dashboard metrics.
 */
function apiHDashboard_(payload, user) {
  try {
    var ss = getMasterSS_();

    function sheetCount(name, filterFn) {
      var sh = ss.getSheetByName(name);
      if (!sh || sh.getLastRow() < 2) return 0;
      if (!filterFn) return sh.getLastRow() - 1;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
      return data.filter(filterFn).length;
    }

    // Candidate stats
    var totalCandidates = sheetCount('Candidates');
    var queueRows = apiReadSheet_('_Queue');
    var pendingQueue = queueRows.filter(function(r){ return String(r['Status']||'').toUpperCase() === 'PENDING'; }).length;
    var totalReqs    = sheetCount('_Requirements');
    var openReqs     = apiReadSheet_('_Requirements').filter(function(r){ return String(r['Status']||'').toUpperCase() === 'OPEN'; }).length;

    return apiOk_({
      totalCandidates: totalCandidates,
      totalRequirements: totalReqs,
      openRequirements: openReqs,
      queuePending: pendingQueue,
      queueTotal: queueRows.length
    });
  } catch (err) {
    return apiErr_('getDashboard: ' + err.message);
  }
}

// ── SUBMISSION LIST ───────────────────────────────────────────────────────

/**
 * API.H76 — List submission batches (for submission workspace).
 */
function apiHSubmissionList_(payload, user) {
  try {
    var rows = apiReadSheet_('_SubmissionBatches');
    var exact = {};
    if (payload.requirementId) exact['RequirementID'] = payload.requirementId;
    if (payload.status)        exact['Status']        = payload.status;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ batches: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listSubmissions: ' + err.message);
  }
}

/**
 * API.H77 — List pipeline records (interview/offer tracking).
 */
function apiHPipelineList_(payload, user) {
  try {
    var rows = apiReadSheet_('_Pipeline');
    var exact = {};
    if (payload.batchId)       exact['BatchID']    = payload.batchId;
    if (payload.requirementId) exact['RequirementID'] = payload.requirementId;
    if (payload.kaiNo)         exact['KAINo']      = payload.kaiNo;
    if (payload.state)         exact['State']      = payload.state;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ pipeline: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listPipeline: ' + err.message);
  }
}

/**
 * API.H78 — List mobilization pipeline records.
 */
function apiHMobilizationList_(payload, user) {
  try {
    var rows = apiReadSheet_('_MobilizationPipeline');
    var exact = {};
    if (payload.kaiNo)         exact['KAINo']         = payload.kaiNo;
    if (payload.requirementId) exact['RequirementID'] = payload.requirementId;
    if (payload.gate)          exact['CurrentGate']   = payload.gate;
    var filtered = apiFilter_(rows, { search: payload.search, exact: exact });
    var p = apiPaginate_(filtered, payload);
    return apiOk_({ mobilization: p.rows, total: p.total, page: p.page, limit: p.limit });
  } catch (err) {
    return apiErr_('listMobilization: ' + err.message);
  }
}
