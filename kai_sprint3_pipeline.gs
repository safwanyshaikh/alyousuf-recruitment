/**
 * ═══════════════════════════════════════════════════════════════════
 *  KAI — Sprint 3 · Pipeline & Client Response
 *  Entities : _Pipeline · _CandidateSubmissionHistory · _ClientResponseLog
 *  Version  : 1.0.0
 *  Date     : 14-Jun-2026
 *
 *  Sprint 3 scope:
 *    submitBatch()            — READY → SUBMITTED; fires pipeline + history per candidate
 *    Pipeline CRUD            — add · status transitions · close
 *    Client Response Log      — log responses per pipeline entry
 *    Candidate Submission History — append-only record
 *
 *  Pipeline rules (KAI FLOW locked):
 *    Candidate enters Pipeline ONLY after submitBatch() fires
 *    Status is forward-only (no rollback)
 *    INTERVIEW_SCHEDULED requires interviewType (ONLINE / F2F / TELEPHONIC)
 *    Terminal statuses: JOINED · REJECTED · WITHDRAWN
 *
 *  Client response rules (D2):
 *    clientResponseStatus is separate from pipelineStatus
 *    Values: NO_RESPONSE · SHORTLISTED · ON_HOLD · MORE_INFO · REJECTED
 *    responseSource: EMAIL · WHATSAPP · PHONE · MEETING · OTHER
 *
 *  Dependencies:
 *    kai_sprint1_submission.gs — SUB_SHEETS_ · BATCH_COL_ · BATCH_STATUS_
 *      RAL_ENTITY_ · findRowById_ · generateId_ · getCallerEmail_
 *      validateRemark_ · _err_ · logActivity_ · appendTimelineEvent_
 *      getSubmissionBatch · getBatchItems · getMasterSS_
 *    kai_sprint2_packages.gs — appendBatchEvent_ · BTL_EVENT_ · PKG_SHEETS_
 *      getPackagesByBatch · PKG_STATUS_
 *
 *  SAFE — zero writes to:
 *    Candidates · _Requirements · existing pipeline · _Submissions
 *    _ClientSubs · email intake · matching engine
 *
 *  SETUP
 *    1. Paste alongside Sprint 1 + Sprint 2 files in Apps Script
 *    2. Run setupSprint3() once (after setupSprint1, setupSprint2)
 *    3. Run healthCheckSprint3() to verify green
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// CONSTANTS
// ───────────────────────────────────────────────────────────────────

var PIPE_SHEETS_ = {
  PIPELINE: '_Pipeline',
  HISTORY:  '_CandidateSubmissionHistory',
  CRL:      '_ClientResponseLog'
};

var PIPELINE_STATUS_ = {
  SUBMITTED:           'SUBMITTED',
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  INTERVIEWED:         'INTERVIEWED',
  SELECTED:            'SELECTED',
  OFFERED:             'OFFERED',
  OFFER_ACCEPTED:      'OFFER_ACCEPTED',
  REJECTED_BY_CLIENT:  'REJECTED_BY_CLIENT',
  WITHDRAWN:           'WITHDRAWN',
  ON_HOLD:             'ON_HOLD'
};

var INTERVIEW_TYPE_ = {
  ONLINE:     'ONLINE',
  F2F:        'F2F',
  TELEPHONIC: 'TELEPHONIC'
};

var CLIENT_RESPONSE_STATUS_ = {
  NO_RESPONSE:  'NO_RESPONSE',
  SHORTLISTED:  'SHORTLISTED',
  ON_HOLD:      'ON_HOLD',
  MORE_INFO:    'MORE_INFO',
  REJECTED:     'REJECTED'
};

var RESPONSE_SOURCE_ = {
  EMAIL:    'EMAIL',
  WHATSAPP: 'WHATSAPP',
  PHONE:    'PHONE',
  MEETING:  'MEETING',
  OTHER:    'OTHER'
};

// Forward-only valid transitions
var PIPE_TRANSITIONS_ = {
  'SUBMITTED':           ['INTERVIEW_SCHEDULED', 'REJECTED_BY_CLIENT', 'WITHDRAWN', 'ON_HOLD'],
  'INTERVIEW_SCHEDULED': ['INTERVIEWED',         'REJECTED_BY_CLIENT', 'WITHDRAWN', 'ON_HOLD'],
  'INTERVIEWED':         ['SELECTED',            'REJECTED_BY_CLIENT', 'WITHDRAWN', 'ON_HOLD'],
  'SELECTED':            ['OFFERED',             'REJECTED_BY_CLIENT', 'WITHDRAWN', 'ON_HOLD'],
  'OFFERED':             ['OFFER_ACCEPTED',      'REJECTED_BY_CLIENT', 'WITHDRAWN', 'ON_HOLD']
};

// Terminal statuses — no further transitions allowed
var PIPE_TERMINAL_ = {
  REJECTED_BY_CLIENT: true,
  WITHDRAWN:          true,
  ON_HOLD:            true,
  OFFER_ACCEPTED:     true
};

// Column indices (1-based)

var PIPE_COL_ = {
  ID: 1, BATCH: 2, REQ: 3, KAI: 4, PACKAGE: 5,
  STATUS: 6, INTERVIEW_TYPE: 7, CLIENT_STATUS: 8,
  ADDED_AT: 9, ADDED_BY: 10,
  UPDATED_AT: 11, UPDATED_BY: 12,
  CLOSED_AT: 13, CLOSED_BY: 14, CLOSED_STATUS: 15,
  REMARK: 16
};

var HIST_COL_ = {
  ID: 1, BATCH: 2, REQ: 3, KAI: 4,
  PACKAGE: 5, PIPELINE: 6,
  SUBMITTED_AT: 7, SUBMITTED_BY: 8
};

var CRL_COL_ = {
  ID: 1, PIPELINE: 2, BATCH: 3, REQ: 4, KAI: 5,
  CLIENT_STATUS: 6, SOURCE: 7, NOTES: 8,
  RESPONDED_AT: 9, LOGGED_BY: 10
};

// ───────────────────────────────────────────────────────────────────
// S80 · SETUP & HEALTH CHECK
// ───────────────────────────────────────────────────────────────────

function setupSprint3() {
  var ss = getMasterSS_();
  if (!ss) { Logger.log('setupSprint3: master spreadsheet not found.'); return; }

  var created = [], existed = [];

  var HEADERS = {};
  HEADERS[PIPE_SHEETS_.PIPELINE] = [
    'pipelineId','batchId','reqId','kaiNo','packageId',
    'pipelineStatus','interviewType','clientResponseStatus',
    'addedAt','addedBy',
    'updatedAt','updatedBy',
    'closedAt','closedBy','closedStatus',
    'recruiterRemark'
  ];
  HEADERS[PIPE_SHEETS_.HISTORY] = [
    'historyId','batchId','reqId','kaiNo',
    'packageId','pipelineId',
    'submittedAt','submittedBy'
  ];
  HEADERS[PIPE_SHEETS_.CRL] = [
    'responseId','pipelineId','batchId','reqId','kaiNo',
    'clientResponseStatus','responseSource','notes',
    'respondedAt','loggedBy'
  ];

  Object.keys(PIPE_SHEETS_).forEach(function(key) {
    var name = PIPE_SHEETS_[key];
    if (ss.getSheetByName(name)) { existed.push(name); return; }
    var sheet = ss.insertSheet(name);
    var h = HEADERS[name];
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
    sheet.setFrozenRows(1);
    created.push(name);
  });

  Logger.log([
    'setupSprint3 complete.',
    '  Created : ' + (created.join(', ') || 'none'),
    '  Existed : ' + (existed.join(', ') || 'none')
  ].join('\n'));
}

function healthCheckSprint3() {
  var ss = getMasterSS_();
  var ok = [], issues = [];

  Object.keys(PIPE_SHEETS_).forEach(function(key) {
    var name = PIPE_SHEETS_[key];
    if (ss && ss.getSheetByName(name)) ok.push(name + ' ✓');
    else issues.push(name + ' MISSING — run setupSprint3()');
  });

  // Sprint 1 + 2 dependency check
  var deps = [
    '_SubmissionBatches','_SubmissionBatchItems','_RecruiterActivityLog',
    '_Timeline','_SubmissionPackages','_BatchTimeline'
  ];
  deps.forEach(function(name) {
    if (ss && ss.getSheetByName(name)) ok.push(name + ' (dependency) ✓');
    else issues.push(name + ' MISSING — run setupSprint1/2() first');
  });

  Logger.log(
    '═══ SPRINT 3 HEALTH CHECK ═══\n' +
    (ok.length     ? '✓ OK:\n  '     + ok.join('\n  ')     + '\n' : '') +
    (issues.length ? '⚠ ISSUES:\n  ' + issues.join('\n  ') + '\n' : '') +
    (issues.length ? 'Resolve issues above before using Sprint 3.' : 'All Sprint 3 checks passed.')
  );
  return { ok: ok, issues: issues };
}

// ───────────────────────────────────────────────────────────────────
// S81 · BATCH SUBMISSION (READY → SUBMITTED)
// ───────────────────────────────────────────────────────────────────

/**
 * Submit a READY batch to the client.
 * Transitions batch READY → SUBMITTED.
 * Creates one Pipeline entry + one History record per active batch item.
 * Writes BatchTimeline + _Timeline.
 *
 * Per KAI FLOW: candidates enter _Pipeline ONLY when this fires.
 *
 * @param {string} batchId
 * @param {{recruiterRemark:string}} options
 */
function submitBatch(batchId, options) {
  if (!batchId) return _err_('batchId is required.');

  var batch = getSubmissionBatch(batchId);
  if (!batch) return _err_('Batch not found: ' + batchId);
  if (batch.status !== BATCH_STATUS_.READY)
    return _err_('Only READY batches can be submitted. Current status: ' + batch.status);

  var items = getBatchItems(batchId);
  if (!items || items.length === 0)
    return _err_('Batch has no active items. Cannot submit an empty batch.');

  var ss = getMasterSS_();

  // Resolve current package (CURRENT version required)
  var packages = getPackagesByBatch(batchId);
  var pkg      = packages.filter(function(p) { return p.packageStatus === PKG_STATUS_.CURRENT; })[0];
  if (!pkg)
    return _err_('No CURRENT package for batch ' + batchId + '. Run generatePackage() first.');

  var opts      = options || {};
  var rv        = validateRemark_(opts.recruiterRemark);
  if (!rv.ok)   return _err_(rv.error);

  var recruiter = getCallerEmail_();

  // Transition batch READY → SUBMITTED
  var batchSheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  var batchRow   = findRowById_(batchSheet, BATCH_COL_.ID, batchId);
  batchSheet.getRange(batchRow, BATCH_COL_.STATUS).setValue(BATCH_STATUS_.SUBMITTED);
  batchSheet.getRange(batchRow, BATCH_COL_.SUBMITTED_AT).setValue(new Date());
  batchSheet.getRange(batchRow, BATCH_COL_.SUBMITTED_BY).setValue(recruiter);

  // _BatchTimeline: STATUS_CHANGE READY → SUBMITTED
  appendBatchEvent_(batchId, batch.reqId, pkg.packageId,
    BTL_EVENT_.STATUS_CHANGE,
    BATCH_STATUS_.READY, BATCH_STATUS_.SUBMITTED,
    'Batch submitted · ' + items.length + ' candidate(s)');

  // _Timeline (D4)
  appendTimelineEvent_(batchId, batch.reqId,
    BATCH_STATUS_.READY, BATCH_STATUS_.SUBMITTED,
    'Batch submitted · ' + items.length + ' candidate(s)');

  // Create Pipeline + History entries for each item
  var pipelineIds = [];
  items.forEach(function(item) {
    var pipelineId = createPipelineEntry_(ss, batchId, batch.reqId, item.kaiNo, pkg.packageId, recruiter);
    appendHistoryRecord_(ss, batchId, batch.reqId, item.kaiNo, pkg.packageId, pipelineId, recruiter);
    pipelineIds.push(pipelineId);
  });

  logActivity_(RAL_ENTITY_.BATCH, batchId, 'SUBMITTED',
    'SUBMITTED - Batch submitted · ' + items.length + ' candidate(s) · package ' + pkg.packageId,
    { batchId: batchId, reqId: batch.reqId });

  return { ok: true, submittedCount: items.length, pipelineIds: pipelineIds };
}

// ───────────────────────────────────────────────────────────────────
// S82 · PIPELINE
// ───────────────────────────────────────────────────────────────────

/**
 * Get pipeline entries with optional filters.
 * Filters: batchId · reqId · kaiNo · pipelineStatus · clientResponseStatus
 */
function getPipelineEntries(filters) {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(PIPE_SHEETS_.PIPELINE);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var f    = filters || {};
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();
  var out  = [];

  data.forEach(function(r) {
    if (!r[0]) return;
    if (f.batchId              && String(r[PIPE_COL_.BATCH         - 1]) !== f.batchId)             return;
    if (f.reqId                && String(r[PIPE_COL_.REQ           - 1]) !== f.reqId)               return;
    if (f.kaiNo                && String(r[PIPE_COL_.KAI           - 1]) !== f.kaiNo)               return;
    if (f.pipelineStatus       && String(r[PIPE_COL_.STATUS        - 1]) !== f.pipelineStatus)       return;
    if (f.clientResponseStatus && String(r[PIPE_COL_.CLIENT_STATUS - 1]) !== f.clientResponseStatus) return;
    out.push(rowToPipeline_(r));
  });
  return out;
}

/** Get a single pipeline entry by ID. */
function getPipelineEntry(pipelineId) {
  if (!pipelineId) return null;
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(PIPE_SHEETS_.PIPELINE);
  if (!sheet || sheet.getLastRow() < 2) return null;
  var rowNum = findRowById_(sheet, PIPE_COL_.ID, pipelineId);
  if (!rowNum) return null;
  return rowToPipeline_(sheet.getRange(rowNum, 1, 1, 16).getValues()[0]);
}

/**
 * Advance a pipeline entry to a new status (forward-only).
 * INTERVIEW_SCHEDULED requires options.interviewType (ONLINE / F2F / TELEPHONIC).
 *
 * @param {string} pipelineId
 * @param {string} newStatus
 * @param {{interviewType:string, recruiterRemark:string}} options
 */
function updatePipelineStatus(pipelineId, newStatus, options) {
  if (!pipelineId) return _err_('pipelineId is required.');
  if (!newStatus)  return _err_('newStatus is required.');

  var entry = getPipelineEntry(pipelineId);
  if (!entry) return _err_('Pipeline entry not found: ' + pipelineId);

  var current = entry.pipelineStatus;
  if (PIPE_TERMINAL_[current])
    return _err_('Pipeline entry is in terminal status ' + current + '. No further transitions allowed.');

  var allowed = PIPE_TRANSITIONS_[current] || [];
  if (allowed.indexOf(newStatus) < 0)
    return _err_('Invalid transition: ' + current + ' → ' + newStatus + '. Allowed: ' + allowed.join(', '));

  var opts = options || {};

  // INTERVIEW_SCHEDULED requires interviewType
  if (newStatus === PIPELINE_STATUS_.INTERVIEW_SCHEDULED) {
    var iType = String(opts.interviewType || '').toUpperCase();
    if (!INTERVIEW_TYPE_[iType])
      return _err_('interviewType is required for INTERVIEW_SCHEDULED. Must be: ONLINE, F2F, or TELEPHONIC.');
  }

  var rv = validateRemark_(opts.recruiterRemark);
  if (!rv.ok) return _err_(rv.error);

  var ss        = getMasterSS_();
  var sheet     = ss.getSheetByName(PIPE_SHEETS_.PIPELINE);
  var rowNum    = findRowById_(sheet, PIPE_COL_.ID, pipelineId);
  var recruiter = getCallerEmail_();

  sheet.getRange(rowNum, PIPE_COL_.STATUS).setValue(newStatus);
  sheet.getRange(rowNum, PIPE_COL_.UPDATED_AT).setValue(new Date());
  sheet.getRange(rowNum, PIPE_COL_.UPDATED_BY).setValue(recruiter);

  if (newStatus === PIPELINE_STATUS_.INTERVIEW_SCHEDULED) {
    sheet.getRange(rowNum, PIPE_COL_.INTERVIEW_TYPE).setValue(opts.interviewType.toUpperCase());
  }
  if (opts.recruiterRemark) {
    sheet.getRange(rowNum, PIPE_COL_.REMARK).setValue(opts.recruiterRemark);
  }

  logActivity_(RAL_ENTITY_.BATCH, entry.batchId, newStatus,
    newStatus + ' - ' + entry.kaiNo + ' · ' + current + ' → ' + newStatus,
    { kaiNo: entry.kaiNo, batchId: entry.batchId, reqId: entry.reqId });

  return { ok: true, pipelineId: pipelineId, fromStatus: current, toStatus: newStatus };
}

/**
 * Close a pipeline entry at a terminal status (JOINED / REJECTED / WITHDRAWN).
 * @param {string} pipelineId
 * @param {string} closedStatus  — JOINED | REJECTED | WITHDRAWN
 * @param {string} remark
 */
function closePipelineEntry(pipelineId, closedStatus, remark) {
  if (!pipelineId)   return _err_('pipelineId is required.');
  if (!closedStatus) return _err_('closedStatus is required.');
  if (!PIPE_TERMINAL_[closedStatus])
    return _err_('closedStatus must be REJECTED_BY_CLIENT, WITHDRAWN, ON_HOLD, or OFFER_ACCEPTED. Got: ' + closedStatus);

  var entry = getPipelineEntry(pipelineId);
  if (!entry) return _err_('Pipeline entry not found: ' + pipelineId);
  if (PIPE_TERMINAL_[entry.pipelineStatus])
    return _err_('Entry is already closed with status: ' + entry.pipelineStatus);

  var rv = validateRemark_(remark);
  if (!rv.ok) return _err_(rv.error);

  var ss        = getMasterSS_();
  var sheet     = ss.getSheetByName(PIPE_SHEETS_.PIPELINE);
  var rowNum    = findRowById_(sheet, PIPE_COL_.ID, pipelineId);
  var recruiter = getCallerEmail_();

  sheet.getRange(rowNum, PIPE_COL_.STATUS).setValue(closedStatus);
  sheet.getRange(rowNum, PIPE_COL_.CLOSED_STATUS).setValue(closedStatus);
  sheet.getRange(rowNum, PIPE_COL_.CLOSED_AT).setValue(new Date());
  sheet.getRange(rowNum, PIPE_COL_.CLOSED_BY).setValue(recruiter);
  sheet.getRange(rowNum, PIPE_COL_.UPDATED_AT).setValue(new Date());
  sheet.getRange(rowNum, PIPE_COL_.UPDATED_BY).setValue(recruiter);
  if (remark) sheet.getRange(rowNum, PIPE_COL_.REMARK).setValue(remark);

  logActivity_(RAL_ENTITY_.BATCH, entry.batchId, closedStatus,
    closedStatus + ' - ' + entry.kaiNo + ' · pipeline closed',
    { kaiNo: entry.kaiNo, batchId: entry.batchId, reqId: entry.reqId });

  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────
// S83 · CLIENT RESPONSE LOG  (D2: separate from pipelineStatus)
// ───────────────────────────────────────────────────────────────────

/**
 * Log a client response for a pipeline entry.
 * Also updates the pipeline entry's clientResponseStatus.
 *
 * @param {string} pipelineId
 * @param {string} clientResponseStatus  — NO_RESPONSE | SHORTLISTED | ON_HOLD | MORE_INFO | REJECTED
 * @param {string} responseSource        — EMAIL | WHATSAPP | PHONE | MEETING | OTHER
 * @param {string} notes                 — max 300 chars
 */
function logClientResponse(pipelineId, clientResponseStatus, responseSource, notes) {
  if (!pipelineId)           return _err_('pipelineId is required.');
  if (!clientResponseStatus) return _err_('clientResponseStatus is required.');
  if (!responseSource)       return _err_('responseSource is required.');

  if (!CLIENT_RESPONSE_STATUS_[clientResponseStatus])
    return _err_('Invalid clientResponseStatus: ' + clientResponseStatus +
                 '. Must be: ' + Object.keys(CLIENT_RESPONSE_STATUS_).join(', '));

  var src = String(responseSource).toUpperCase();
  if (!RESPONSE_SOURCE_[src])
    return _err_('Invalid responseSource: ' + responseSource +
                 '. Must be: ' + Object.keys(RESPONSE_SOURCE_).join(', '));

  var rv = validateRemark_(notes);
  if (!rv.ok) return _err_(rv.error);

  var entry = getPipelineEntry(pipelineId);
  if (!entry) return _err_('Pipeline entry not found: ' + pipelineId);

  var ss        = getMasterSS_();
  var crlSheet  = ss.getSheetByName(PIPE_SHEETS_.CRL);
  if (!crlSheet) return _err_('_ClientResponseLog missing. Run setupSprint3().');

  var recruiter  = getCallerEmail_();
  var responseId = generateId_('CRL');

  crlSheet.appendRow([
    responseId,
    pipelineId,
    entry.batchId,
    entry.reqId,
    entry.kaiNo,
    clientResponseStatus,
    src,
    String(notes || '').slice(0, REMARK_MAX_LEN_),
    new Date(),
    recruiter
  ]);

  // Update pipeline entry's clientResponseStatus (D2: separate field)
  var pipeSheet = ss.getSheetByName(PIPE_SHEETS_.PIPELINE);
  var pipeRow   = findRowById_(pipeSheet, PIPE_COL_.ID, pipelineId);
  pipeSheet.getRange(pipeRow, PIPE_COL_.CLIENT_STATUS).setValue(clientResponseStatus);
  pipeSheet.getRange(pipeRow, PIPE_COL_.UPDATED_AT).setValue(new Date());
  pipeSheet.getRange(pipeRow, PIPE_COL_.UPDATED_BY).setValue(recruiter);

  logActivity_(RAL_ENTITY_.BATCH, entry.batchId, 'CLIENT_RESPONSE',
    'CLIENT_RESPONSE - ' + clientResponseStatus + ' via ' + src + ' · ' + entry.kaiNo,
    { kaiNo: entry.kaiNo, batchId: entry.batchId, reqId: entry.reqId });

  return { ok: true, responseId: responseId };
}

/**
 * Get client response log entries. Filters: pipelineId · batchId · kaiNo · clientResponseStatus.
 */
function getClientResponses(filters) {
  var ss       = getMasterSS_();
  var crlSheet = ss.getSheetByName(PIPE_SHEETS_.CRL);
  if (!crlSheet || crlSheet.getLastRow() < 2) return [];

  var f    = filters || {};
  var data = crlSheet.getRange(2, 1, crlSheet.getLastRow() - 1, 10).getValues();
  var out  = [];

  data.forEach(function(r) {
    if (!r[0]) return;
    if (f.pipelineId           && String(r[CRL_COL_.PIPELINE      - 1]) !== f.pipelineId)           return;
    if (f.batchId              && String(r[CRL_COL_.BATCH         - 1]) !== f.batchId)              return;
    if (f.kaiNo                && String(r[CRL_COL_.KAI           - 1]) !== f.kaiNo)                return;
    if (f.clientResponseStatus && String(r[CRL_COL_.CLIENT_STATUS - 1]) !== f.clientResponseStatus) return;
    out.push(rowToClientResponse_(r));
  });
  return out;
}

// ───────────────────────────────────────────────────────────────────
// S84 · CANDIDATE SUBMISSION HISTORY
// ───────────────────────────────────────────────────────────────────

/** All submissions for a specific candidate across all batches. */
function getCandidateSubmissionHistory(kaiNo) {
  if (!kaiNo) return [];
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(PIPE_SHEETS_.HISTORY);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  var out  = [];
  data.forEach(function(r) {
    if (!r[0]) return;
    if (String(r[HIST_COL_.KAI - 1]) !== kaiNo) return;
    out.push(rowToHistory_(r));
  });
  return out;
}

/** All history records for a specific batch. */
function getBatchSubmissionHistory(batchId) {
  if (!batchId) return [];
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(PIPE_SHEETS_.HISTORY);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  var out  = [];
  data.forEach(function(r) {
    if (!r[0]) return;
    if (String(r[HIST_COL_.BATCH - 1]) !== batchId) return;
    out.push(rowToHistory_(r));
  });
  return out;
}

// ───────────────────────────────────────────────────────────────────
// S85 · PRIVATE HELPERS
// ───────────────────────────────────────────────────────────────────

/** Create one Pipeline entry for a submitted candidate. Returns pipelineId. */
function createPipelineEntry_(ss, batchId, reqId, kaiNo, packageId, recruiter) {
  var sheet      = ss.getSheetByName(PIPE_SHEETS_.PIPELINE);
  var pipelineId = generateId_('PIPE');
  sheet.appendRow([
    pipelineId,
    batchId,
    reqId,
    kaiNo,
    packageId,
    PIPELINE_STATUS_.SUBMITTED,
    '',                                        // interviewType — set when scheduled
    CLIENT_RESPONSE_STATUS_.NO_RESPONSE,       // default
    new Date(),
    recruiter,
    '', '', '', '', '',                        // updatedAt/By, closedAt/By/Status
    ''                                         // remark
  ]);
  return pipelineId;
}

/** Append one history record. Append-only. Never updated. Never deleted. */
function appendHistoryRecord_(ss, batchId, reqId, kaiNo, packageId, pipelineId, recruiter) {
  var sheet = ss.getSheetByName(PIPE_SHEETS_.HISTORY);
  if (!sheet) return;
  sheet.appendRow([
    generateId_('HIST'),
    batchId,
    reqId,
    kaiNo,
    packageId,
    pipelineId,
    new Date(),
    recruiter
  ]);
}

function rowToPipeline_(r) {
  return {
    pipelineId:           r[PIPE_COL_.ID             - 1],
    batchId:              r[PIPE_COL_.BATCH          - 1],
    reqId:                r[PIPE_COL_.REQ            - 1],
    kaiNo:                r[PIPE_COL_.KAI            - 1],
    packageId:            r[PIPE_COL_.PACKAGE        - 1],
    pipelineStatus:       r[PIPE_COL_.STATUS         - 1],
    interviewType:        r[PIPE_COL_.INTERVIEW_TYPE - 1],
    clientResponseStatus: r[PIPE_COL_.CLIENT_STATUS  - 1],
    addedAt:              r[PIPE_COL_.ADDED_AT       - 1],
    addedBy:              r[PIPE_COL_.ADDED_BY       - 1],
    updatedAt:            r[PIPE_COL_.UPDATED_AT     - 1],
    updatedBy:            r[PIPE_COL_.UPDATED_BY     - 1],
    closedAt:             r[PIPE_COL_.CLOSED_AT      - 1],
    closedBy:             r[PIPE_COL_.CLOSED_BY      - 1],
    closedStatus:         r[PIPE_COL_.CLOSED_STATUS  - 1],
    recruiterRemark:      r[PIPE_COL_.REMARK         - 1]
  };
}

function rowToHistory_(r) {
  return {
    historyId:   r[HIST_COL_.ID           - 1],
    batchId:     r[HIST_COL_.BATCH        - 1],
    reqId:       r[HIST_COL_.REQ          - 1],
    kaiNo:       r[HIST_COL_.KAI         - 1],
    packageId:   r[HIST_COL_.PACKAGE     - 1],
    pipelineId:  r[HIST_COL_.PIPELINE    - 1],
    submittedAt: r[HIST_COL_.SUBMITTED_AT - 1],
    submittedBy: r[HIST_COL_.SUBMITTED_BY - 1]
  };
}

function rowToClientResponse_(r) {
  return {
    responseId:           r[CRL_COL_.ID            - 1],
    pipelineId:           r[CRL_COL_.PIPELINE      - 1],
    batchId:              r[CRL_COL_.BATCH         - 1],
    reqId:                r[CRL_COL_.REQ           - 1],
    kaiNo:                r[CRL_COL_.KAI           - 1],
    clientResponseStatus: r[CRL_COL_.CLIENT_STATUS - 1],
    responseSource:       r[CRL_COL_.SOURCE        - 1],
    notes:                r[CRL_COL_.NOTES         - 1],
    respondedAt:          r[CRL_COL_.RESPONDED_AT  - 1],
    loggedBy:             r[CRL_COL_.LOGGED_BY     - 1]
  };
}

// END OF FILE — kai_sprint3_pipeline.gs  v1.1.0
