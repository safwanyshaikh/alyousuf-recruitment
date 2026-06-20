/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXECUTION ENGINE v1 — KAI GCC Recruitment OS · Operations Layer
 * ───────────────────────────────────────────────────────────────────────────
 * Chain: Requirement → Match(ProjectCandidate) → Submission → Pipeline
 *        → Selection → Mobilization → Outcome Capture
 *
 * Governed by EXECUTION_CONSTITUTION (4 entities, 10 non-negotiable rules):
 *   - Execution consumes Foundation FACTS + K14 OUTPUTS; never creates truth.
 *   - Execution never scores/matches/ranks (that is K14's alone).
 *   - Every action is attributable; every transition is auditable (append-only).
 *   - Outcomes feed K14.OUTCOMES / K14.MEMORY.
 *
 * LOCK 2 (read-only, never written by this engine):
 *   _T13_* benchmark · _AssociateReliability/_Commitments seed · _Taxonomy
 *   This engine WRITES the operational mirror it owns; it does NOT mutate the
 *   protected seed data. Reliability updates are appended to _AssociateReliability
 *   as new evidence rows, never overwriting prior rows (append-only, Rule on
 *   Lock 2 = "only read" the seed → we append outcome evidence, never edit).
 *
 * Shared infra reused (Phase 0 KEEP-AS-IS): getMasterSS_, ensureSheet_, appendLog_.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
// EX.S00 · CONFIG — tab names + governed state vocabularies
// ───────────────────────────────────────────────────────────────────────────
var EXEC_CONFIG = {
  tabs: {
    projectCandidates:   '_ProjectCandidates',
    submissionBatches:   '_SubmissionBatches',
    batchItems:          '_SubmissionBatchItems',
    packages:            '_SubmissionPackages',
    pipeline:            '_Pipeline',
    clientResponseLog:   '_ClientResponseLog',
    candidateSubHistory: '_CandidateSubmissionHistory',
    outcomeLog:          '_DeploymentOutcomes',
    reliability:         '_AssociateReliability',   // append-only evidence (Lock 2)
    requirements:        '_Requirements',           // Foundation truth (read)
    candidates:          'Candidates'                // Foundation truth (read)
  },

  // EXECUTION_CONSTITUTION §3 state model
  matchStates:       ['MATCHED','SHORTLISTED','ADVANCED-TO-SUBMISSION','MATCH-REJECTED'],
  submissionStates:  ['DRAFT','SUBMITTED','AWAITING-CLIENT','CLIENT-RESPONDED','SUBMISSION-WITHDRAWN'],
  pipelineStates:    ['SUBMITTED','SHORTLISTED','INTERVIEW','SELECTED','OFFERED','OFFER-ACCEPTED','MOBILIZATION','DEPLOYED','DECLINED','ABORTED'],
  mobilizationGates: ['OFFER-ACCEPTED','DOCUMENTATION','VISA','MEDICAL','TRAVEL','DEPLOYED','MOBILIZATION-ABORTED'],

  actors: ['Recruiter','Associate','Client','System']
};

// ───────────────────────────────────────────────────────────────────────────
// EX.S01 · INFRASTRUCTURE — headers, helpers, ID generation
// ───────────────────────────────────────────────────────────────────────────

/** EX.S01.F01 — STEP 1: ensure every execution tab exists with its schema. */
function exEnsureExecutionTabs_() {
  var ss = getMasterSS_();
  var H = exHeaders_();
  var created = [], existing = [];
  for (var tabKey in H) {
    var name = EXEC_CONFIG.tabs[tabKey];
    var had = !!ss.getSheetByName(name);
    ensureSheet_(ss, name, H[tabKey], '#1f3a5f');
    (had ? existing : created).push(name);
  }
  exLog_('ensureExecutionTabs', 'System', { created: created, existing: existing });
  return { created: created, existing: existing };
}

/** EX.S01.F02 — canonical execution schemas (headers only; additive, never destructive). */
function exHeaders_() {
  return {
    projectCandidates: [
      'PCID','ReqID','CampaignID','ProjectID','ClientID','KAI No','CandidateName','Trade',
      'MatchState','MatchRank','MatchRisk','MatchReadiness','MatchConfidence','SourceAssociate',
      'CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'
    ],
    submissionBatches: [
      'BatchID','ReqID','CampaignID','ProjectID','ClientID','BatchState','ItemCount','PackageID',
      'SubmittedBy','SubmittedAt','CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'
    ],
    batchItems: [
      'ItemID','BatchID','PCID','ReqID','KAI No','CandidateName','ItemState',
      'CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'
    ],
    packages: [
      'PackageID','BatchID','ReqID','ClientID','CandidateCount','PackagePayload','GeneratedBy','GeneratedAt'
    ],
    pipeline: [
      'PipelineID','PCID','BatchID','ReqID','CampaignID','ProjectID','ClientID','KAI No','CandidateName',
      'SourceAssociate','PipelineState','PrevState','InterviewOutcome','OfferOutcome','SelectionOutcome',
      'MobilizationGate','TransitionBy','TransitionAt','CreatedAt'
    ],
    clientResponseLog: [
      'ResponseID','PipelineID','ReqID','ClientID','KAI No','ResponseType','ResponseDetail',
      'RespondedBy','RespondedAt'
    ],
    candidateSubHistory: [
      'HistoryID','KAI No','CandidateName','ReqID','ClientID','BatchID','PipelineID','Event','EventDetail',
      'ActorRole','ActorBy','EventAt'
    ],
    outcomeLog: [
      'OutcomeID','PipelineID','PCID','ReqID','ClientID','KAI No','SourceAssociate','OutcomeType',
      'OutcomeDetail','AbortReason','CapturedBy','CapturedAt','FedToK14Memory'
    ],
    reliability: [
      // append-only outcome evidence (Lock 2: seed is read-only; we add evidence rows)
      'EvidenceID','SourceAssociate','KAI No','ReqID','OutcomeType','MobilizationResult','RecordedBy','RecordedAt'
    ]
  };
}

/** EX.S01.F03 — open a sheet + build a header→index map (header-driven; drift-safe). */
function exSheet_(tabKey) {
  var ss = getMasterSS_();
  var name = EXEC_CONFIG.tabs[tabKey];
  var sheet = ss.getSheetByName(name);
  if (!sheet) { exEnsureExecutionTabs_(); sheet = ss.getSheetByName(name); }
  if (!sheet) throw new Error('EXEC: tab not found and could not be created: ' + name);
  var lastCol = Math.max(1, sheet.getLastColumn());
  var hdr = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var i = 0; i < hdr.length; i++) if (hdr[i] !== '') idx[String(hdr[i])] = i;
  return { sheet: sheet, idx: idx, headers: hdr };
}

/** EX.S01.F04 — append a fully-mapped row from an object keyed by header. */
function exAppend_(tabKey, obj) {
  var s = exSheet_(tabKey);
  var row = new Array(s.headers.length).fill('');
  for (var k in obj) {
    if (s.idx[k] === undefined) throw new Error('EXEC: unknown column "' + k + '" for ' + tabKey);
    row[s.idx[k]] = obj[k];
  }
  s.sheet.appendRow(row);
  return s.sheet.getLastRow();
}

/** EX.S01.F05 — find the row number (1-based) where column==value; 0 if none. */
function exFindRow_(tabKey, header, value) {
  var s = exSheet_(tabKey);
  if (s.idx[header] === undefined) throw new Error('EXEC: no column ' + header + ' in ' + tabKey);
  var last = s.sheet.getLastRow();
  if (last < 2) return 0;
  var col = s.sheet.getRange(2, s.idx[header] + 1, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) if (String(col[i][0]) === String(value)) return i + 2;
  return 0;
}

/** EX.S01.F06 — read a row as an object keyed by header. */
function exReadRow_(tabKey, rowNum) {
  var s = exSheet_(tabKey);
  var vals = s.sheet.getRange(rowNum, 1, 1, s.headers.length).getValues()[0];
  var o = {};
  for (var h in s.idx) o[h] = vals[s.idx[h]];
  return o;
}

/** EX.S01.F07 — update named columns on an existing row (audited via UpdatedBy/At). */
function exUpdateRow_(tabKey, rowNum, patch) {
  var s = exSheet_(tabKey);
  for (var k in patch) {
    if (s.idx[k] === undefined) throw new Error('EXEC: unknown column "' + k + '" for ' + tabKey);
    s.sheet.getRange(rowNum, s.idx[k] + 1).setValue(patch[k]);
  }
  return rowNum;
}

/** EX.S01.F08 — deterministic, collision-resistant ID. */
function exId_(prefix) {
  var d = new Date();
  var stamp = Utilities.formatDate(d, 'GMT', 'yyyyMMdd-HHmmss');
  var rand = ('000' + Math.floor(Math.random() * 10000)).slice(-4);
  return prefix + '-' + stamp + '-' + rand;
}

function exNow_()  { return new Date(); }

/** EX.S01.F09 — attribution guard (Mandatory Rule 5: no anonymous actions). */
function exActor_(actor) {
  actor = actor || {};
  var role = actor.role || 'Recruiter';
  var by   = actor.by   || (typeof getSessionUser === 'function' ? '' : '') || Session.getActiveUser().getEmail() || 'system';
  if (EXEC_CONFIG.actors.indexOf(role) === -1)
    throw new Error('EXEC: invalid actor role "' + role + '" (Mandatory Rule 5)');
  if (!by) throw new Error('EXEC: action requires an attributable actor (Mandatory Rule 5)');
  return { role: role, by: by };
}

/** EX.S01.F10 — log via shared infra if present, else no-op safe. */
function exLog_(event, actorBy, payload) {
  try {
    if (typeof appendLog_ === 'function') {
      appendLog_({ type: 'EXEC', event: event, actor: actorBy, detail: JSON.stringify(payload || {}) });
    }
  } catch (e) { /* logging must never block execution */ }
}

// ───────────────────────────────────────────────────────────────────────────
// EX.S02 · FOUNDATION READ (truth in; never mutated — Mandatory Rule 3)
// ───────────────────────────────────────────────────────────────────────────

/** EX.S02.F01 — resolve a Requirement to its FK lineage; refuse orphans (Rule 1/13). */
function exResolveRequirement_(reqId) {
  var ss = getMasterSS_();
  var sheet = ss.getSheetByName(EXEC_CONFIG.tabs.requirements);
  if (!sheet) throw new Error('EXEC: Requirements tab missing');
  var lastCol = sheet.getLastColumn(), last = sheet.getLastRow();
  var hdr = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {}; for (var i = 0; i < hdr.length; i++) idx[String(hdr[i])] = i;
  if (idx['ReqID'] === undefined) throw new Error('EXEC: Requirements has no ReqID column');
  for (var r = 2; r <= last; r++) {
    var row = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    if (String(row[idx['ReqID']]) === String(reqId)) {
      var camp = idx['CampaignID'] !== undefined ? row[idx['CampaignID']] : '';
      if (!camp || /UNRESOLVED|NEEDS_/.test(String(camp)))
        throw new Error('EXEC: Requirement ' + reqId + ' has no resolved CampaignID — locked (Rule 13). Cannot execute against an unresolved target.');
      return {
        ReqID: reqId,
        CampaignID: camp,
        ProjectID:  idx['ProjectID'] !== undefined ? row[idx['ProjectID']] : '',
        ClientID:   idx['ClientID']  !== undefined ? row[idx['ClientID']]  : '',
        row: r
      };
    }
  }
  throw new Error('EXEC: Requirement ' + reqId + ' not found (no orphan execution — Mandatory Rule 1)');
}

/** EX.S02.F02 — resolve a Candidate (KAI No) to identity facts; refuse if absent. */
function exResolveCandidate_(kaiNo) {
  var ss = getMasterSS_();
  var sheet = ss.getSheetByName(EXEC_CONFIG.tabs.candidates);
  if (!sheet) throw new Error('EXEC: Candidates tab missing');
  var lastCol = sheet.getLastColumn(), last = sheet.getLastRow();
  var hdr = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {}; for (var i = 0; i < hdr.length; i++) idx[String(hdr[i])] = i;
  var keyCol = idx['KAI No'] !== undefined ? idx['KAI No'] : idx['KAI No '];
  if (keyCol === undefined) throw new Error('EXEC: Candidates has no "KAI No" column');
  for (var r = 2; r <= last; r++) {
    var row = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    if (String(row[keyCol]) === String(kaiNo)) {
      return {
        'KAI No': kaiNo,
        Name:  pick_(row, idx, ['Name','Full Name','CandidateName']),
        Trade: pick_(row, idx, ['Trade']),
        SourceAssociate: pick_(row, idx, ['Source Associate','SourceAssociate']),
        row: r
      };
    }
  }
  throw new Error('EXEC: Candidate ' + kaiNo + ' not found (no orphan execution — Mandatory Rule 1)');
}

function pick_(row, idx, names) {
  for (var i = 0; i < names.length; i++) if (idx[names[i]] !== undefined) return row[idx[names[i]]];
  return '';
}

// ───────────────────────────────────────────────────────────────────────────
// EX.S03 · STEP 2 — PROJECT CANDIDATE ENGINE (Match entity)
//   Requirement → Add Candidate → ProjectCandidate record
// ───────────────────────────────────────────────────────────────────────────

/**
 * EX.S03.F01 — Add a candidate to a requirement as a ProjectCandidate (a Match).
 * K14 supplies rank/risk/readiness (passed in); Execution only records the fit.
 */
function addProjectCandidate(reqId, kaiNo, k14, actor) {
  var a = exActor_(actor);
  var req = exResolveRequirement_(reqId);
  var cand = exResolveCandidate_(kaiNo);
  k14 = k14 || {};

  // idempotency: one active ProjectCandidate per (ReqID, KAI No)
  var existing = exFindProjectCandidate_(reqId, kaiNo);
  if (existing) return { ok: true, PCID: existing.PCID, duplicate: true };

  var pcid = exId_('PC');
  var now = exNow_();
  exAppend_('projectCandidates', {
    'PCID': pcid, 'ReqID': reqId,
    'CampaignID': req.CampaignID, 'ProjectID': req.ProjectID, 'ClientID': req.ClientID,
    'KAI No': kaiNo, 'CandidateName': cand.Name, 'Trade': cand.Trade,
    'MatchState': 'MATCHED',
    'MatchRank': k14.rank || '', 'MatchRisk': k14.risk || '',
    'MatchReadiness': k14.readiness || '', 'MatchConfidence': k14.confidence || '',
    'SourceAssociate': cand.SourceAssociate || '',
    'CreatedBy': a.by, 'CreatedAt': now, 'UpdatedBy': a.by, 'UpdatedAt': now
  });

  exHistory_(kaiNo, cand.Name, reqId, req.ClientID, '', '', 'MATCHED', 'ProjectCandidate created', a);
  exLog_('addProjectCandidate', a.by, { PCID: pcid, reqId: reqId, kaiNo: kaiNo });
  return { ok: true, PCID: pcid, duplicate: false };
}

/** EX.S03.F02 — find an existing ProjectCandidate row object for (ReqID, KAI No). */
function exFindProjectCandidate_(reqId, kaiNo) {
  var s = exSheet_('projectCandidates');
  var last = s.sheet.getLastRow();
  if (last < 2) return null;
  var data = s.sheet.getRange(2, 1, last - 1, s.headers.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][s.idx['ReqID']]) === String(reqId) &&
        String(data[i][s.idx['KAI No']]) === String(kaiNo)) {
      var o = {}; for (var h in s.idx) o[h] = data[i][s.idx[h]]; o.__row = i + 2;
      return o;
    }
  }
  return null;
}

/** EX.S03.F03 — recruiter shortlists a match (MATCHED → SHORTLISTED). */
function shortlistProjectCandidate(pcid, actor) {
  var a = exActor_(actor);
  var rowNum = exFindRow_('projectCandidates', 'PCID', pcid);
  if (!rowNum) throw new Error('EXEC: PCID not found: ' + pcid);
  var cur = exReadRow_('projectCandidates', rowNum);
  if (cur.MatchState === 'MATCH-REJECTED') throw new Error('EXEC: cannot shortlist a rejected match (terminal).');
  exUpdateRow_('projectCandidates', rowNum, { 'MatchState': 'SHORTLISTED', 'UpdatedBy': a.by, 'UpdatedAt': exNow_() });
  exHistory_(cur['KAI No'], cur.CandidateName, cur.ReqID, cur.ClientID, '', '', 'SHORTLISTED', 'Match shortlisted', a);
  exLog_('shortlistProjectCandidate', a.by, { PCID: pcid });
  return { ok: true, PCID: pcid, state: 'SHORTLISTED' };
}

// ───────────────────────────────────────────────────────────────────────────
// EX.S04 · STEP 3 — SUBMISSION ENGINE (Submission entity)
//   ProjectCandidate → Batch → Add To Batch → Generate Package → Submit
// ───────────────────────────────────────────────────────────────────────────

/** EX.S04.F01 — create a submission batch against a requirement. */
function createSubmissionBatch(reqId, actor) {
  var a = exActor_(actor);
  var req = exResolveRequirement_(reqId);
  var batchId = exId_('BATCH');
  var now = exNow_();
  exAppend_('submissionBatches', {
    'BatchID': batchId, 'ReqID': reqId,
    'CampaignID': req.CampaignID, 'ProjectID': req.ProjectID, 'ClientID': req.ClientID,
    'BatchState': 'DRAFT', 'ItemCount': 0, 'PackageID': '',
    'SubmittedBy': '', 'SubmittedAt': '',
    'CreatedBy': a.by, 'CreatedAt': now, 'UpdatedBy': a.by, 'UpdatedAt': now
  });
  exLog_('createSubmissionBatch', a.by, { BatchID: batchId, reqId: reqId });
  return { ok: true, BatchID: batchId };
}

/** EX.S04.F02 — add a ProjectCandidate to a batch (creates a batch item). */
function addCandidateToBatch(batchId, pcid, actor) {
  var a = exActor_(actor);
  var batchRow = exFindRow_('submissionBatches', 'BatchID', batchId);
  if (!batchRow) throw new Error('EXEC: BatchID not found: ' + batchId);
  var batch = exReadRow_('submissionBatches', batchRow);
  if (batch.BatchState !== 'DRAFT')
    throw new Error('EXEC: cannot add to a ' + batch.BatchState + ' batch; only DRAFT accepts items.');

  var pcRow = exFindRow_('projectCandidates', 'PCID', pcid);
  if (!pcRow) throw new Error('EXEC: PCID not found: ' + pcid);
  var pc = exReadRow_('projectCandidates', pcRow);
  if (String(pc.ReqID) !== String(batch.ReqID))
    throw new Error('EXEC: candidate requirement (' + pc.ReqID + ') != batch requirement (' + batch.ReqID + ')');

  // dedupe within batch
  var s = exSheet_('batchItems');
  if (s.sheet.getLastRow() >= 2) {
    var data = s.sheet.getRange(2, 1, s.sheet.getLastRow() - 1, s.headers.length).getValues();
    for (var i = 0; i < data.length; i++)
      if (String(data[i][s.idx['BatchID']]) === String(batchId) &&
          String(data[i][s.idx['PCID']]) === String(pcid))
        return { ok: true, ItemID: data[i][s.idx['ItemID']], duplicate: true };
  }

  var itemId = exId_('ITEM');
  var now = exNow_();
  exAppend_('batchItems', {
    'ItemID': itemId, 'BatchID': batchId, 'PCID': pcid, 'ReqID': pc.ReqID,
    'KAI No': pc['KAI No'], 'CandidateName': pc.CandidateName, 'ItemState': 'ADDED',
    'CreatedBy': a.by, 'CreatedAt': now, 'UpdatedBy': a.by, 'UpdatedAt': now
  });
  exUpdateRow_('submissionBatches', batchRow, {
    'ItemCount': Number(batch.ItemCount || 0) + 1, 'UpdatedBy': a.by, 'UpdatedAt': now
  });
  // advance the match to ADVANCED-TO-SUBMISSION
  exUpdateRow_('projectCandidates', pcRow, { 'MatchState': 'ADVANCED-TO-SUBMISSION', 'UpdatedBy': a.by, 'UpdatedAt': now });
  exLog_('addCandidateToBatch', a.by, { BatchID: batchId, ItemID: itemId, PCID: pcid });
  return { ok: true, ItemID: itemId, duplicate: false };
}

/** EX.S04.F03 — generate the submission package (formatted deliverable for the client). */
function generateSubmissionPackage(batchId, actor) {
  var a = exActor_(actor);
  var batchRow = exFindRow_('submissionBatches', 'BatchID', batchId);
  if (!batchRow) throw new Error('EXEC: BatchID not found: ' + batchId);
  var batch = exReadRow_('submissionBatches', batchRow);
  if (Number(batch.ItemCount || 0) < 1)
    throw new Error('EXEC: cannot generate a package for an empty batch (Mandatory Rule 7: missing evidence).');

  var items = exBatchItems_(batchId);
  var payload = {
    reqId: batch.ReqID, clientId: batch.ClientID, generatedAt: String(exNow_()),
    candidates: items.map(function (it) {
      var c = exResolveCandidate_(it['KAI No']);
      return { kaiNo: it['KAI No'], name: c.Name, trade: c.Trade };
    })
  };
  var packageId = exId_('PKG');
  exAppend_('packages', {
    'PackageID': packageId, 'BatchID': batchId, 'ReqID': batch.ReqID, 'ClientID': batch.ClientID,
    'CandidateCount': items.length, 'PackagePayload': JSON.stringify(payload),
    'GeneratedBy': a.by, 'GeneratedAt': exNow_()
  });
  exUpdateRow_('submissionBatches', batchRow, { 'PackageID': packageId, 'UpdatedBy': a.by, 'UpdatedAt': exNow_() });
  exLog_('generateSubmissionPackage', a.by, { BatchID: batchId, PackageID: packageId, count: items.length });
  return { ok: true, PackageID: packageId, candidateCount: items.length };
}

/** EX.S04.F04 — submit the batch: records the submission and opens a Pipeline per candidate. */
function submitBatch(batchId, actor) {
  var a = exActor_(actor);
  var batchRow = exFindRow_('submissionBatches', 'BatchID', batchId);
  if (!batchRow) throw new Error('EXEC: BatchID not found: ' + batchId);
  var batch = exReadRow_('submissionBatches', batchRow);
  if (!batch.PackageID)
    throw new Error('EXEC: cannot submit before a package is generated (Mandatory Rule 7).');
  if (batch.BatchState === 'SUBMITTED')
    return { ok: true, BatchID: batchId, duplicate: true };

  var now = exNow_();
  var items = exBatchItems_(batchId);
  var pipelines = [];
  items.forEach(function (it) {
    var pc = exReadRow_('projectCandidates', exFindRow_('projectCandidates', 'PCID', it.PCID));
    var pipelineId = exId_('PIPE');
    exAppend_('pipeline', {
      'PipelineID': pipelineId, 'PCID': it.PCID, 'BatchID': batchId, 'ReqID': batch.ReqID,
      'CampaignID': batch.CampaignID, 'ProjectID': batch.ProjectID, 'ClientID': batch.ClientID,
      'KAI No': it['KAI No'], 'CandidateName': it.CandidateName, 'SourceAssociate': pc.SourceAssociate || '',
      'PipelineState': 'SUBMITTED', 'PrevState': '',
      'InterviewOutcome': '', 'OfferOutcome': '', 'SelectionOutcome': '', 'MobilizationGate': '',
      'TransitionBy': a.by, 'TransitionAt': now, 'CreatedAt': now
    });
    exUpdateRow_('batchItems', exFindRow_('batchItems', 'ItemID', it.ItemID),
      { 'ItemState': 'SUBMITTED', 'UpdatedBy': a.by, 'UpdatedAt': now });
    exHistory_(it['KAI No'], it.CandidateName, batch.ReqID, batch.ClientID, batchId, pipelineId,
      'SUBMITTED', 'Submitted to client', a);
    pipelines.push(pipelineId);
  });

  exUpdateRow_('submissionBatches', batchRow, {
    'BatchState': 'SUBMITTED', 'SubmittedBy': a.by, 'SubmittedAt': now, 'UpdatedBy': a.by, 'UpdatedAt': now
  });
  exLog_('submitBatch', a.by, { BatchID: batchId, pipelines: pipelines.length });
  return { ok: true, BatchID: batchId, pipelines: pipelines, duplicate: false };
}

/** EX.S04.F05 — all batch items for a batch as row objects. */
function exBatchItems_(batchId) {
  var s = exSheet_('batchItems');
  var out = [];
  if (s.sheet.getLastRow() < 2) return out;
  var data = s.sheet.getRange(2, 1, s.sheet.getLastRow() - 1, s.headers.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][s.idx['BatchID']]) === String(batchId)) {
      var o = {}; for (var h in s.idx) o[h] = data[i][s.idx[h]];
      out.push(o);
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// EX.S05 · STEP 4 — PIPELINE ENGINE (Selection + Mobilization entities)
//   SUBMITTED → SHORTLISTED → INTERVIEW → SELECTED → OFFERED
//            → OFFER-ACCEPTED → MOBILIZATION → DEPLOYED
// ───────────────────────────────────────────────────────────────────────────

/** EX.S05.F01 — legal forward transitions (governance §3; forward-only by default). */
function exPipelineTransitions_() {
  return {
    'SUBMITTED':      ['SHORTLISTED','DECLINED'],
    'SHORTLISTED':    ['INTERVIEW','DECLINED'],
    'INTERVIEW':      ['SELECTED','DECLINED'],
    'SELECTED':       ['OFFERED','DECLINED'],
    'OFFERED':        ['OFFER-ACCEPTED','DECLINED'],
    'OFFER-ACCEPTED': ['MOBILIZATION','ABORTED'],
    'MOBILIZATION':   ['DEPLOYED','ABORTED'],
    'DEPLOYED':       [],  // terminal
    'DECLINED':       [],  // terminal
    'ABORTED':        []   // terminal
  };
}

/**
 * EX.S05.F02 — advance a pipeline to a new state with evidence gating + audit.
 * @param evidence {object} optional: {interviewOutcome, offerOutcome, selectionOutcome,
 *                                     mobilizationGate, detail}
 */
function advancePipeline(pipelineId, toState, evidence, actor) {
  var a = exActor_(actor);
  evidence = evidence || {};
  var rowNum = exFindRow_('pipeline', 'PipelineID', pipelineId);
  if (!rowNum) throw new Error('EXEC: PipelineID not found: ' + pipelineId);
  var cur = exReadRow_('pipeline', rowNum);
  var from = cur.PipelineState;

  var allowed = exPipelineTransitions_()[from];
  if (!allowed) throw new Error('EXEC: unknown current state ' + from);
  if (allowed.indexOf(toState) === -1)
    throw new Error('EXEC: illegal transition ' + from + ' → ' + toState + ' (governance §3 forward-only)');

  // evidence gates (Mandatory Rule 7)
  if (toState === 'SELECTED'    && !evidence.interviewOutcome)
    throw new Error('EXEC: SELECTED requires interviewOutcome evidence (Rule 7)');
  if (toState === 'OFFER-ACCEPTED' && !evidence.offerOutcome)
    throw new Error('EXEC: OFFER-ACCEPTED requires offerOutcome evidence (Rule 7)');

  var now = exNow_();
  var patch = { 'PipelineState': toState, 'PrevState': from, 'TransitionBy': a.by, 'TransitionAt': now };
  if (toState === 'INTERVIEW'  && evidence.interviewOutcome) patch['InterviewOutcome'] = evidence.interviewOutcome;
  if (toState === 'SELECTED') { patch['InterviewOutcome'] = evidence.interviewOutcome; patch['SelectionOutcome'] = 'SELECTED'; }
  if (toState === 'DECLINED')  patch['SelectionOutcome'] = 'DECLINED';
  if (toState === 'OFFERED')   patch['OfferOutcome'] = evidence.offerOutcome || 'OFFER-MADE';
  if (toState === 'OFFER-ACCEPTED') patch['OfferOutcome'] = 'ACCEPTED';
  if (toState === 'MOBILIZATION') patch['MobilizationGate'] = evidence.mobilizationGate || 'DOCUMENTATION';
  exUpdateRow_('pipeline', rowNum, patch);

  // client-owned responses logged as evidence (Selection Constitution §6)
  if (['SHORTLISTED','INTERVIEW','SELECTED','DECLINED','OFFERED'].indexOf(toState) !== -1) {
    exAppend_('clientResponseLog', {
      'ResponseID': exId_('RESP'), 'PipelineID': pipelineId, 'ReqID': cur.ReqID, 'ClientID': cur.ClientID,
      'KAI No': cur['KAI No'], 'ResponseType': toState,
      'ResponseDetail': evidence.detail || evidence.interviewOutcome || evidence.offerOutcome || '',
      'RespondedBy': a.by, 'RespondedAt': now
    });
  }

  exHistory_(cur['KAI No'], cur.CandidateName, cur.ReqID, cur.ClientID, cur.BatchID, pipelineId,
    toState, 'Pipeline ' + from + ' → ' + toState, a);
  exLog_('advancePipeline', a.by, { PipelineID: pipelineId, from: from, to: toState });
  return { ok: true, PipelineID: pipelineId, from: from, to: toState };
}

/** EX.S05.F03 — mobilization gate progression (DOCUMENTATION→VISA→MEDICAL→TRAVEL→DEPLOYED). */
function advanceMobilizationGate(pipelineId, toGate, evidence, actor) {
  var a = exActor_(actor);
  evidence = evidence || {};
  var rowNum = exFindRow_('pipeline', 'PipelineID', pipelineId);
  if (!rowNum) throw new Error('EXEC: PipelineID not found: ' + pipelineId);
  var cur = exReadRow_('pipeline', rowNum);
  if (cur.PipelineState !== 'MOBILIZATION' && cur.PipelineState !== 'OFFER-ACCEPTED')
    throw new Error('EXEC: mobilization gates require pipeline in MOBILIZATION (current: ' + cur.PipelineState + ')');

  var order = ['DOCUMENTATION','VISA','MEDICAL','TRAVEL','DEPLOYED'];
  var fromGate = cur.MobilizationGate || '';
  var fromIdx = order.indexOf(fromGate), toIdx = order.indexOf(toGate);
  if (toIdx === -1) throw new Error('EXEC: unknown mobilization gate ' + toGate);
  if (toIdx !== fromIdx + 1 && !(fromIdx === -1 && toIdx === 0))
    throw new Error('EXEC: gates are sequential — cannot jump ' + (fromGate||'(none)') + ' → ' + toGate + ' (Rule 7)');

  var now = exNow_();
  var patch = { 'MobilizationGate': toGate, 'TransitionBy': a.by, 'TransitionAt': now };
  if (toGate === 'DEPLOYED') { patch['PipelineState'] = 'DEPLOYED'; patch['PrevState'] = 'MOBILIZATION'; }
  exUpdateRow_('pipeline', rowNum, patch);
  exHistory_(cur['KAI No'], cur.CandidateName, cur.ReqID, cur.ClientID, cur.BatchID, pipelineId,
    'MOB:' + toGate, 'Mobilization gate → ' + toGate, a);
  exLog_('advanceMobilizationGate', a.by, { PipelineID: pipelineId, gate: toGate });

  if (toGate === 'DEPLOYED') captureOutcome(pipelineId, 'DEPLOYED', { detail: evidence.detail || 'Deployed' }, actor);
  return { ok: true, PipelineID: pipelineId, gate: toGate, deployed: toGate === 'DEPLOYED' };
}

// ───────────────────────────────────────────────────────────────────────────
// EX.S06 · STEP 5 — OUTCOME CAPTURE
//   Deployment Result → Associate Reliability (append evidence)
//                     → Candidate History → K14 Memory feed
// ───────────────────────────────────────────────────────────────────────────

/**
 * EX.S06.F01 — capture a terminal outcome and feed it back to K14 (Mandatory Rule 8).
 * outcomeType: DEPLOYED | DECLINED | MOBILIZATION-ABORTED
 */
function captureOutcome(pipelineId, outcomeType, evidence, actor) {
  var a = exActor_(actor);
  evidence = evidence || {};
  var rowNum = exFindRow_('pipeline', 'PipelineID', pipelineId);
  if (!rowNum) throw new Error('EXEC: PipelineID not found: ' + pipelineId);
  var cur = exReadRow_('pipeline', rowNum);
  var now = exNow_();

  var outcomeId = exId_('OUT');
  exAppend_('outcomeLog', {
    'OutcomeID': outcomeId, 'PipelineID': pipelineId, 'PCID': cur.PCID, 'ReqID': cur.ReqID,
    'ClientID': cur.ClientID, 'KAI No': cur['KAI No'], 'SourceAssociate': cur.SourceAssociate || '',
    'OutcomeType': outcomeType, 'OutcomeDetail': evidence.detail || '',
    'AbortReason': evidence.abortReason || '', 'CapturedBy': a.by, 'CapturedAt': now,
    'FedToK14Memory': 'YES'
  });

  // append-only associate reliability EVIDENCE (Lock 2: seed read-only; we add new rows)
  if (cur.SourceAssociate) {
    exAppend_('reliability', {
      'EvidenceID': exId_('REL'), 'SourceAssociate': cur.SourceAssociate, 'KAI No': cur['KAI No'],
      'ReqID': cur.ReqID, 'OutcomeType': outcomeType,
      'MobilizationResult': (outcomeType === 'DEPLOYED' ? 'SUCCESS' : 'FAILURE'),
      'RecordedBy': a.by, 'RecordedAt': now
    });
  }

  // candidate submission history (append-only audit)
  exHistory_(cur['KAI No'], cur.CandidateName, cur.ReqID, cur.ClientID, cur.BatchID, pipelineId,
    'OUTCOME:' + outcomeType, evidence.detail || '', a);

  exLog_('captureOutcome', a.by, { PipelineID: pipelineId, outcome: outcomeType, OutcomeID: outcomeId });
  return { ok: true, OutcomeID: outcomeId, outcome: outcomeType, fedToK14: true };
}

/** EX.S06.F02 — append-only candidate submission-history event (audit trail §8). */
function exHistory_(kaiNo, name, reqId, clientId, batchId, pipelineId, event, detail, a) {
  exAppend_('candidateSubHistory', {
    'HistoryID': exId_('HIST'), 'KAI No': kaiNo, 'CandidateName': name, 'ReqID': reqId,
    'ClientID': clientId, 'BatchID': batchId || '', 'PipelineID': pipelineId || '',
    'Event': event, 'EventDetail': detail || '', 'ActorRole': a.role, 'ActorBy': a.by, 'EventAt': exNow_()
  });
}

// ───────────────────────────────────────────────────────────────────────────
// EX.S07 · UAT — end-to-end execution-chain test (self-contained, idempotent)
// ───────────────────────────────────────────────────────────────────────────

/**
 * EX.S07.F01 — run the full chain against a real ReqID + KAI No and assert each step.
 * Usage:  runExecutionUAT('REQ-YYYYMMDD-0001', 'KAI-1004')
 * Returns a checklist matching the directive's UAT criteria.
 */
function runExecutionUAT(reqId, kaiNo) {
  var actor = { role: 'Recruiter', by: 'uat@kai.os' };
  var results = [];
  function check(name, fn) {
    try { var r = fn(); results.push({ step: name, pass: true, info: r }); return r; }
    catch (e) { results.push({ step: name, pass: false, error: String(e && e.message || e) }); throw e; }
  }

  try {
    check('Execution tabs exist', function () { return exEnsureExecutionTabs_(); });
    check('Requirement resolves (Foundation truth)', function () { return exResolveRequirement_(reqId); });
    check('Candidate resolves (Foundation truth)', function () { return exResolveCandidate_(kaiNo); });

    var pc = check('Project Candidate created', function () {
      return addProjectCandidate(reqId, kaiNo, { rank: 1, risk: 'LOW', readiness: 'READY', confidence: 90 }, actor);
    });
    check('Match shortlisted', function () { return shortlistProjectCandidate(pc.PCID, actor); });

    var batch = check('Submission Batch created', function () { return createSubmissionBatch(reqId, actor); });
    check('Candidate added to batch', function () { return addCandidateToBatch(batch.BatchID, pc.PCID, actor); });
    var pkg = check('Submission Package generated', function () { return generateSubmissionPackage(batch.BatchID, actor); });
    var sub = check('Submission recorded', function () { return submitBatch(batch.BatchID, actor); });

    var pipelineId = sub.pipelines[0];
    check('Pipeline created', function () { if (!pipelineId) throw new Error('no pipeline'); return pipelineId; });
    check('Shortlist status updated', function () { return advancePipeline(pipelineId, 'SHORTLISTED', { detail: 'client shortlisted' }, actor); });
    check('Interview status updated', function () { return advancePipeline(pipelineId, 'INTERVIEW', { interviewOutcome: 'PASSED' }, actor); });
    check('Selection recorded', function () { return advancePipeline(pipelineId, 'SELECTED', { interviewOutcome: 'PASSED' }, actor); });
    check('Offer made', function () { return advancePipeline(pipelineId, 'OFFERED', { offerOutcome: 'OFFER-MADE' }, actor); });
    check('Offer accepted recorded', function () { return advancePipeline(pipelineId, 'OFFER-ACCEPTED', { offerOutcome: 'ACCEPTED' }, actor); });
    check('Mobilization started', function () { return advancePipeline(pipelineId, 'MOBILIZATION', { mobilizationGate: 'DOCUMENTATION' }, actor); });
    check('Mobilization VISA gate', function () { return advanceMobilizationGate(pipelineId, 'VISA', {}, actor); });
    check('Mobilization MEDICAL gate', function () { return advanceMobilizationGate(pipelineId, 'MEDICAL', {}, actor); });
    check('Mobilization TRAVEL gate', function () { return advanceMobilizationGate(pipelineId, 'TRAVEL', {}, actor); });
    check('Mobilization recorded (DEPLOYED)', function () { return advanceMobilizationGate(pipelineId, 'DEPLOYED', { detail: 'On-site' }, actor); });
    check('Associate reliability updated', function () {
      var s = exSheet_('reliability');
      if (s.sheet.getLastRow() < 2) throw new Error('no reliability evidence row');
      return 'reliability evidence appended';
    });
  } catch (e) { /* checklist captures the failure */ }

  var passed = results.filter(function (r) { return r.pass; }).length;
  Logger.log('EXECUTION UAT — ' + passed + '/' + results.length + ' passed');
  results.forEach(function (r) {
    Logger.log((r.pass ? '✓ ' : '✗ ') + r.step + (r.pass ? '' : '  — ' + r.error));
  });
  return { passed: passed, total: results.length, allPass: passed === results.length, results: results };
}
