/**
 * ═══════════════════════════════════════════════════════════════════
 *  KAI — Sprint 1 · Submission Module
 *  Entities : _ProjectCandidates · _SubmissionBatches
 *             _SubmissionBatchItems · _RecruiterActivityLog
 *  Version  : 1.0.0
 *  Date     : 14-Jun-2026
 *
 *  SAFE — parallel build. Zero writes to:
 *    Candidates · _Requirements · existing pipeline ·
 *    email intake · matching engine
 *
 *  SETUP
 *    1. Add this file to Apps Script as kai_sprint1_submission.gs
 *    2. Run setupSprint1() once
 *    3. Run healthCheckSprint1() to verify green
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// CONSTANTS — locked values from approved architecture
// ───────────────────────────────────────────────────────────────────

var SUB_SHEETS_ = {
  PROJECT_CANDIDATES: '_ProjectCandidates',
  BATCHES:            '_SubmissionBatches',
  ITEMS:              '_SubmissionBatchItems',
  ACTIVITY_LOG:       '_RecruiterActivityLog'
};

var BATCH_STATUS_ = {
  DRAFT:     'DRAFT',
  READY:     'READY',
  SUBMITTED: 'SUBMITTED',
  CLOSED:    'CLOSED'
};

var PC_SOURCE_ = { MATCH: 'MATCH', MANUAL: 'MANUAL' };

var RAL_ENTITY_ = {
  BATCH:     'BATCH',
  ITEM:      'ITEM',
  PROJECT:   'PROJECT_CANDIDATE'
};

var BATCH_CAPACITY_DEFAULT_ = 10;
var BATCH_CAPACITY_MIN_     = 1;
var BATCH_CAPACITY_MAX_     = 20;
var REMARK_MAX_LEN_         = 300;

// Column indices (1-based) for each sheet
var PC_COL_ = {
  ID: 1, REQ: 2, KAI: 3, SOURCE: 4,
  ADDED_AT: 5, ADDED_BY: 6,
  REMOVED_AT: 7, REMOVED_BY: 8,
  REMARK: 9
};

var BATCH_COL_ = {
  ID: 1, REQ: 2, CLIENT: 3, TRADE: 4, STATUS: 5,
  CAPACITY: 6, ITEM_COUNT: 7,
  CREATED_AT: 8, CREATED_BY: 9,
  READY_AT: 10, READY_BY: 11,
  SUBMITTED_AT: 12, SUBMITTED_BY: 13,
  CLOSED_AT: 14, CLOSED_BY: 15,
  REMARK: 16
};

var ITEM_COL_ = {
  ID: 1, BATCH: 2, KAI: 3, CV_LINK: 4, CV_FILE_ID: 5,
  ADDED_AT: 6, ADDED_BY: 7,
  REMOVED_AT: 8, REMOVED_BY: 9,
  ORDER: 10, REMARK: 11
};

var RAL_COL_ = {
  ID: 1, ENTITY_TYPE: 2, ENTITY_ID: 3,
  KAI: 4, BATCH: 5, REQ: 6,
  STAGE: 7, REMARK: 8,
  LOGGED_AT: 9, LOGGED_BY: 10
};

// ───────────────────────────────────────────────────────────────────
// S60 · SETUP & HEALTH CHECK
// ───────────────────────────────────────────────────────────────────

function setupSprint1() {
  var ss = getMasterSS_();
  if (!ss) { Logger.log('setupSprint1: master spreadsheet not found.'); return; }

  var created = [], existed = [];

  var HEADERS = {};
  HEADERS[SUB_SHEETS_.PROJECT_CANDIDATES] = [
    'projectCandidateId','reqId','kaiNo','source',
    'addedAt','addedBy','removedAt','removedBy','recruiterRemark'
  ];
  HEADERS[SUB_SHEETS_.BATCHES] = [
    'batchId','reqId','clientName','trade','status','capacity','itemCount',
    'createdAt','createdBy',
    'readyAt','readyBy',
    'submittedAt','submittedBy',
    'closedAt','closedBy',
    'recruiterRemark'
  ];
  HEADERS[SUB_SHEETS_.ITEMS] = [
    'itemId','batchId','kaiNo','cvLink','cvFileId',
    'addedAt','addedBy','removedAt','removedBy',
    'displayOrder','recruiterRemark'
  ];
  HEADERS[SUB_SHEETS_.ACTIVITY_LOG] = [
    'logId','entityType','entityId',
    'kaiNo','batchId','reqId',
    'stage','remark','loggedAt','loggedBy'
  ];

  Object.keys(SUB_SHEETS_).forEach(function(key) {
    var name = SUB_SHEETS_[key];
    if (ss.getSheetByName(name)) { existed.push(name); return; }
    var sheet = ss.insertSheet(name);
    var h = HEADERS[name];
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
    // Freeze header row
    sheet.setFrozenRows(1);
    created.push(name);
  });

  // Write _Config defaults (idempotent)
  setConfigDefault_('submission_batch_capacity', String(BATCH_CAPACITY_DEFAULT_));
  setConfigDefault_('submission_batch_max',      String(BATCH_CAPACITY_MAX_));

  var msg = [
    'setupSprint1 complete.',
    '  Created : ' + (created.join(', ') || 'none'),
    '  Existed : ' + (existed.join(', ') || 'none')
  ].join('\n');
  Logger.log(msg);
}

function healthCheckSprint1() {
  var ss = getMasterSS_();
  var ok = [], issues = [];

  Object.keys(SUB_SHEETS_).forEach(function(key) {
    var name = SUB_SHEETS_[key];
    if (ss && ss.getSheetByName(name)) ok.push(name + ' ✓');
    else issues.push(name + ' MISSING — run setupSprint1()');
  });

  // Verify _Requirements is untouched (read-only check)
  if (ss && ss.getSheetByName('_Requirements')) ok.push('_Requirements present (read-only) ✓');
  else issues.push('_Requirements not found — matching engine check');

  // Verify Candidates is untouched
  var candName = (typeof CONFIG !== 'undefined' && CONFIG.sheetName) || 'Candidates';
  if (ss && ss.getSheetByName(candName)) ok.push(candName + ' present (read-only) ✓');
  else issues.push(candName + ' not found');

  Logger.log(
    '═══ SPRINT 1 HEALTH CHECK ═══\n' +
    (ok.length     ? '✓ OK:\n  '     + ok.join('\n  ')     + '\n' : '') +
    (issues.length ? '⚠ ISSUES:\n  ' + issues.join('\n  ') + '\n' : '') +
    (issues.length ? 'Run setupSprint1() to resolve.' : 'All Sprint 1 checks passed.')
  );
  return { ok: ok, issues: issues };
}

// ───────────────────────────────────────────────────────────────────
// S61 · PROJECT CANDIDATES
// ───────────────────────────────────────────────────────────────────

/**
 * Add a candidate to a requirement's project pool.
 * Idempotent: re-adds if previously soft-removed.
 */
function addCandidateToProject(reqId, kaiNo, source) {
  if (!reqId) return _err_('reqId is required.');
  if (!kaiNo) return _err_('kaiNo is required.');

  var src = String(source || PC_SOURCE_.MANUAL).toUpperCase();
  if (src !== PC_SOURCE_.MATCH && src !== PC_SOURCE_.MANUAL)
    return _err_('source must be MATCH or MANUAL.');

  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.PROJECT_CANDIDATES);
  if (!sheet) return _err_('_ProjectCandidates missing. Run setupSprint1().');

  var existing = findProjectCandidate_(sheet, reqId, kaiNo);

  // Already active — block duplicate
  if (existing.found && !existing.removed)
    return _err_('Candidate ' + kaiNo + ' already in project ' + reqId + '.');

  var recruiter = getCallerEmail_();
  var id;

  if (existing.found && existing.removed) {
    // Reactivate soft-removed row
    id = existing.id;
    sheet.getRange(existing.rowNum, PC_COL_.REMOVED_AT).setValue('');
    sheet.getRange(existing.rowNum, PC_COL_.REMOVED_BY).setValue('');
    sheet.getRange(existing.rowNum, PC_COL_.ADDED_AT).setValue(new Date());
    sheet.getRange(existing.rowNum, PC_COL_.ADDED_BY).setValue(recruiter);
  } else {
    // New row
    id = generateId_('PC');
    sheet.appendRow([
      id, reqId, kaiNo, src,
      new Date(), recruiter,
      '', '', ''
    ]);
  }

  logActivity_(RAL_ENTITY_.PROJECT, id, 'PROJECT',
    'PROJECT - Added to requirement ' + reqId + ' [' + src + ']',
    { kaiNo: kaiNo, reqId: reqId });

  return { ok: true, projectCandidateId: id };
}

/**
 * Soft-remove a candidate from a project pool.
 */
function removeCandidateFromProject(projectCandidateId) {
  if (!projectCandidateId) return _err_('projectCandidateId is required.');

  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.PROJECT_CANDIDATES);
  if (!sheet) return _err_('_ProjectCandidates missing.');

  var rowNum = findRowById_(sheet, PC_COL_.ID, projectCandidateId);
  if (!rowNum) return _err_('Project candidate not found: ' + projectCandidateId);

  var data = sheet.getRange(rowNum, 1, 1, 9).getValues()[0];
  if (data[PC_COL_.REMOVED_AT - 1]) return _err_('Already removed.');

  var recruiter = getCallerEmail_();
  sheet.getRange(rowNum, PC_COL_.REMOVED_AT).setValue(new Date());
  sheet.getRange(rowNum, PC_COL_.REMOVED_BY).setValue(recruiter);

  logActivity_(RAL_ENTITY_.PROJECT, projectCandidateId, 'PROJECT',
    'PROJECT - Removed from requirement ' + data[PC_COL_.REQ - 1],
    { kaiNo: data[PC_COL_.KAI - 1], reqId: data[PC_COL_.REQ - 1] });

  return { ok: true };
}

/**
 * Get all active (non-removed) candidates in a requirement's project pool.
 */
function getProjectCandidates(reqId) {
  if (!reqId) return [];
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.PROJECT_CANDIDATES);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var results = [];
  data.forEach(function(r) {
    if (String(r[PC_COL_.REQ - 1])        !== reqId) return;
    if (r[PC_COL_.REMOVED_AT - 1])                   return; // soft-deleted
    results.push({
      projectCandidateId: r[PC_COL_.ID     - 1],
      reqId:              r[PC_COL_.REQ    - 1],
      kaiNo:              r[PC_COL_.KAI    - 1],
      source:             r[PC_COL_.SOURCE - 1],
      addedAt:            r[PC_COL_.ADDED_AT - 1],
      addedBy:            r[PC_COL_.ADDED_BY - 1],
      recruiterRemark:    r[PC_COL_.REMARK  - 1]
    });
  });
  return results;
}

/**
 * Get all active projects (requirements) a candidate has been added to.
 */
function getCandidateProjects(kaiNo) {
  if (!kaiNo) return [];
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.PROJECT_CANDIDATES);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var results = [];
  data.forEach(function(r) {
    if (String(r[PC_COL_.KAI - 1])    !== kaiNo) return;
    if (r[PC_COL_.REMOVED_AT - 1])               return;
    results.push({
      projectCandidateId: r[PC_COL_.ID     - 1],
      reqId:              r[PC_COL_.REQ    - 1],
      source:             r[PC_COL_.SOURCE - 1],
      addedAt:            r[PC_COL_.ADDED_AT - 1],
      addedBy:            r[PC_COL_.ADDED_BY - 1]
    });
  });
  return results;
}

// ───────────────────────────────────────────────────────────────────
// S62 · SUBMISSION BATCHES
// ───────────────────────────────────────────────────────────────────

/**
 * Create a new DRAFT submission batch.
 * Resolves trade from _Requirements automatically.
 * @param {string} reqId
 * @param {{capacity:number, recruiterRemark:string}} options
 */
function createSubmissionBatch(reqId, options) {
  if (!reqId) return _err_('reqId is required.');

  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  if (!sheet) return _err_('_SubmissionBatches missing. Run setupSprint1().');

  // Requirement must exist and have a trade
  var req = getRequirementById_(ss, reqId);
  if (!req)       return _err_('Requirement not found: ' + reqId);
  if (!req.trade) return _err_('Requirement ' + reqId + ' has no trade. Add trade to _Requirements first.');

  var opts     = options || {};
  var capacity = parseInt(opts.capacity) ||
                 getConfigInt_('submission_batch_capacity', BATCH_CAPACITY_DEFAULT_);

  if (capacity < BATCH_CAPACITY_MIN_ || capacity > BATCH_CAPACITY_MAX_)
    return _err_('Capacity must be ' + BATCH_CAPACITY_MIN_ + '–' + BATCH_CAPACITY_MAX_ + '.');

  var rv = validateRemark_(opts.recruiterRemark);
  if (!rv.ok) return _err_(rv.error);

  var batchId   = generateBatchId_(sheet);
  var recruiter = getCallerEmail_();

  sheet.appendRow([
    batchId, reqId, req.clientName, req.trade,
    BATCH_STATUS_.DRAFT, capacity, 0,
    new Date(), recruiter,
    '', '', '', '', '', '',
    opts.recruiterRemark || ''
  ]);

  logActivity_(RAL_ENTITY_.BATCH, batchId, 'DRAFT',
    'DRAFT - Batch created for ' + req.clientName + ' · ' + req.trade,
    { batchId: batchId, reqId: reqId });

  return { ok: true, batchId: batchId };
}

/**
 * Get submission batches with optional filters.
 * Supports: trade (partial), clientName (partial), status (exact), createdBy (exact).
 */
function getSubmissionBatches(filters) {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var f    = filters || {};
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();
  var out  = [];

  data.forEach(function(r) {
    if (!r[0]) return;
    if (f.trade      && String(r[BATCH_COL_.TRADE  - 1]).toLowerCase().indexOf(f.trade.toLowerCase()) < 0) return;
    if (f.clientName && String(r[BATCH_COL_.CLIENT - 1]).toLowerCase().indexOf(f.clientName.toLowerCase()) < 0) return;
    if (f.status     && String(r[BATCH_COL_.STATUS - 1]) !== f.status)    return;
    if (f.createdBy  && String(r[BATCH_COL_.CREATED_BY - 1]) !== f.createdBy) return;
    out.push(rowToBatch_(r));
  });
  return out;
}

/**
 * Get a single submission batch by ID.
 */
function getSubmissionBatch(batchId) {
  if (!batchId) return null;
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  if (!sheet || sheet.getLastRow() < 2) return null;
  var rowNum = findRowById_(sheet, BATCH_COL_.ID, batchId);
  if (!rowNum) return null;
  return rowToBatch_(sheet.getRange(rowNum, 1, 1, 16).getValues()[0]);
}

/**
 * Update batch capacity. DRAFT only.
 */
function updateBatchCapacity(batchId, capacity) {
  var batch = getSubmissionBatch(batchId);
  if (!batch) return _err_('Batch not found: ' + batchId);
  if (batch.status !== BATCH_STATUS_.DRAFT)
    return _err_('Capacity can only change on DRAFT batches.');
  var cap = parseInt(capacity);
  if (isNaN(cap) || cap < BATCH_CAPACITY_MIN_ || cap > BATCH_CAPACITY_MAX_)
    return _err_('Capacity must be ' + BATCH_CAPACITY_MIN_ + '–' + BATCH_CAPACITY_MAX_ + '.');
  if (cap < batch.itemCount)
    return _err_('Capacity cannot be less than current item count (' + batch.itemCount + ').');

  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  sheet.getRange(findRowById_(sheet, BATCH_COL_.ID, batchId), BATCH_COL_.CAPACITY).setValue(cap);

  logActivity_(RAL_ENTITY_.BATCH, batchId, 'DRAFT',
    'DRAFT - Capacity updated to ' + cap,
    { batchId: batchId, reqId: batch.reqId });
  return { ok: true };
}

/**
 * Update batch recruiter remark. Format: [STAGE] - detail. Max 300 chars.
 */
function updateBatchRemark(batchId, remark) {
  var rv = validateRemark_(remark);
  if (!rv.ok) return _err_(rv.error);
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  if (!sheet) return _err_('_SubmissionBatches missing.');
  var rowNum = findRowById_(sheet, BATCH_COL_.ID, batchId);
  if (!rowNum) return _err_('Batch not found: ' + batchId);
  sheet.getRange(rowNum, BATCH_COL_.REMARK).setValue(remark);
  return { ok: true };
}

/**
 * Close a SUBMITTED batch → CLOSED.
 */
function closeSubmissionBatch(batchId) {
  var batch = getSubmissionBatch(batchId);
  if (!batch) return _err_('Batch not found: ' + batchId);
  if (batch.status !== BATCH_STATUS_.SUBMITTED)
    return _err_('Only SUBMITTED batches can be closed. Current status: ' + batch.status);

  var ss        = getMasterSS_();
  var sheet     = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  var rowNum    = findRowById_(sheet, BATCH_COL_.ID, batchId);
  var recruiter = getCallerEmail_();

  sheet.getRange(rowNum, BATCH_COL_.STATUS).setValue(BATCH_STATUS_.CLOSED);
  sheet.getRange(rowNum, BATCH_COL_.CLOSED_AT).setValue(new Date());
  sheet.getRange(rowNum, BATCH_COL_.CLOSED_BY).setValue(recruiter);

  logActivity_(RAL_ENTITY_.BATCH, batchId, 'CLOSED',
    'CLOSED - Batch closed',
    { batchId: batchId, reqId: batch.reqId });
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────
// S63 · SUBMISSION BATCH ITEMS
// ───────────────────────────────────────────────────────────────────

/**
 * Add a candidate to a DRAFT submission batch.
 * Guards: batch must be DRAFT · capacity not exceeded · no duplicate.
 */
function addCandidateToBatch(batchId, kaiNo) {
  if (!batchId) return _err_('batchId is required.');
  if (!kaiNo)   return _err_('kaiNo is required.');

  var batch = getSubmissionBatch(batchId);
  if (!batch) return _err_('Batch not found: ' + batchId);

  if (batch.status !== BATCH_STATUS_.DRAFT)
    return _err_('Items can only be added to DRAFT batches. Current status: ' + batch.status);
  if (batch.itemCount >= batch.capacity)
    return _err_('Batch is at capacity (' + batch.capacity + '). Increase capacity or create a new batch.');

  var ss        = getMasterSS_();
  var itemSheet = ss.getSheetByName(SUB_SHEETS_.ITEMS);
  if (!itemSheet) return _err_('_SubmissionBatchItems missing. Run setupSprint1().');

  var existing = findBatchItem_(itemSheet, batchId, kaiNo);
  if (existing.found && !existing.removed)
    return _err_('Candidate ' + kaiNo + ' is already in batch ' + batchId + '.');

  // Resolve CV data from Candidates (read-only)
  var cvData   = getCandidateCvData_(ss, kaiNo);
  var recruiter = getCallerEmail_();
  var itemId    = generateId_('ITEM');
  var nextOrder = batch.itemCount + 1;

  if (existing.found && existing.removed) {
    // Reactivate soft-removed item
    itemId = existing.id;
    var r  = existing.rowNum;
    itemSheet.getRange(r, ITEM_COL_.REMOVED_AT).setValue('');
    itemSheet.getRange(r, ITEM_COL_.REMOVED_BY).setValue('');
    itemSheet.getRange(r, ITEM_COL_.ADDED_AT).setValue(new Date());
    itemSheet.getRange(r, ITEM_COL_.ADDED_BY).setValue(recruiter);
    itemSheet.getRange(r, ITEM_COL_.CV_LINK).setValue(cvData.cvLink);
    itemSheet.getRange(r, ITEM_COL_.CV_FILE_ID).setValue(cvData.cvFileId);
    itemSheet.getRange(r, ITEM_COL_.ORDER).setValue(nextOrder);
  } else {
    itemSheet.appendRow([
      itemId, batchId, kaiNo,
      cvData.cvLink, cvData.cvFileId,
      new Date(), recruiter,
      '', '',
      nextOrder, ''
    ]);
  }

  // Increment batch itemCount
  var batchSheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  var batchRow   = findRowById_(batchSheet, BATCH_COL_.ID, batchId);
  batchSheet.getRange(batchRow, BATCH_COL_.ITEM_COUNT).setValue(batch.itemCount + 1);

  logActivity_(RAL_ENTITY_.ITEM, itemId, 'DRAFT',
    'DRAFT - Candidate added to ' + batchId,
    { kaiNo: kaiNo, batchId: batchId, reqId: batch.reqId });

  return { ok: true, itemId: itemId, cvLink: cvData.cvLink };
}

/**
 * Soft-remove a candidate from a batch.
 * Only allowed when batch is DRAFT or READY.
 */
function removeCandidateFromBatch(batchId, kaiNo) {
  if (!batchId) return _err_('batchId is required.');
  if (!kaiNo)   return _err_('kaiNo is required.');

  var batch = getSubmissionBatch(batchId);
  if (!batch) return _err_('Batch not found: ' + batchId);
  if (batch.status === BATCH_STATUS_.SUBMITTED || batch.status === BATCH_STATUS_.CLOSED)
    return _err_('Cannot remove items from a ' + batch.status + ' batch.');

  var ss        = getMasterSS_();
  var itemSheet = ss.getSheetByName(SUB_SHEETS_.ITEMS);
  if (!itemSheet) return _err_('_SubmissionBatchItems missing.');

  var item = findBatchItem_(itemSheet, batchId, kaiNo);
  if (!item.found || item.removed)
    return _err_('Item not found or already removed. kaiNo: ' + kaiNo + ' batchId: ' + batchId);

  var recruiter = getCallerEmail_();
  itemSheet.getRange(item.rowNum, ITEM_COL_.REMOVED_AT).setValue(new Date());
  itemSheet.getRange(item.rowNum, ITEM_COL_.REMOVED_BY).setValue(recruiter);

  // Decrement batch itemCount
  var batchSheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
  var batchRow   = findRowById_(batchSheet, BATCH_COL_.ID, batchId);
  batchSheet.getRange(batchRow, BATCH_COL_.ITEM_COUNT).setValue(Math.max(0, batch.itemCount - 1));

  logActivity_(RAL_ENTITY_.ITEM, item.id, 'DRAFT',
    'DRAFT - Candidate removed from ' + batchId,
    { kaiNo: kaiNo, batchId: batchId, reqId: batch.reqId });

  return { ok: true };
}

/**
 * Get all active items in a batch, sorted by displayOrder.
 */
function getBatchItems(batchId) {
  if (!batchId) return [];
  var ss        = getMasterSS_();
  var itemSheet = ss.getSheetByName(SUB_SHEETS_.ITEMS);
  if (!itemSheet || itemSheet.getLastRow() < 2) return [];

  var data = itemSheet.getRange(2, 1, itemSheet.getLastRow() - 1, 11).getValues();
  var out  = [];
  data.forEach(function(r) {
    if (String(r[ITEM_COL_.BATCH - 1]) !== batchId) return;
    if (r[ITEM_COL_.REMOVED_AT - 1])                return;
    out.push({
      itemId:          r[ITEM_COL_.ID         - 1],
      batchId:         r[ITEM_COL_.BATCH      - 1],
      kaiNo:           r[ITEM_COL_.KAI        - 1],
      cvLink:          r[ITEM_COL_.CV_LINK    - 1],
      cvFileId:        r[ITEM_COL_.CV_FILE_ID - 1],
      addedAt:         r[ITEM_COL_.ADDED_AT   - 1],
      addedBy:         r[ITEM_COL_.ADDED_BY   - 1],
      displayOrder:    r[ITEM_COL_.ORDER      - 1],
      recruiterRemark: r[ITEM_COL_.REMARK     - 1]
    });
  });
  out.sort(function(a, b) { return a.displayOrder - b.displayOrder; });
  return out;
}

/**
 * Reorder items within a DRAFT batch.
 * @param {string} batchId
 * @param {string[]} orderedKaiNos — full ordered list of kaiNos
 */
function reorderBatchItems(batchId, orderedKaiNos) {
  if (!batchId || !orderedKaiNos || !orderedKaiNos.length)
    return _err_('batchId and orderedKaiNos are required.');

  var batch = getSubmissionBatch(batchId);
  if (!batch) return _err_('Batch not found: ' + batchId);
  if (batch.status !== BATCH_STATUS_.DRAFT)
    return _err_('Reorder only allowed on DRAFT batches.');

  var ss        = getMasterSS_();
  var itemSheet = ss.getSheetByName(SUB_SHEETS_.ITEMS);
  if (!itemSheet || itemSheet.getLastRow() < 2) return _err_('No items found.');

  var orderMap = {};
  orderedKaiNos.forEach(function(k, i) { orderMap[String(k)] = i + 1; });

  var data = itemSheet.getRange(2, 1, itemSheet.getLastRow() - 1, 11).getValues();
  data.forEach(function(r, i) {
    if (String(r[ITEM_COL_.BATCH - 1]) !== batchId) return;
    if (r[ITEM_COL_.REMOVED_AT - 1])                return;
    var newOrder = orderMap[String(r[ITEM_COL_.KAI - 1])];
    if (newOrder !== undefined)
      itemSheet.getRange(i + 2, ITEM_COL_.ORDER).setValue(newOrder);
  });
  return { ok: true };
}

/**
 * Update a batch item's recruiter remark. Format: [STAGE] - detail. Max 300 chars.
 */
function updateItemRemark(itemId, remark) {
  var rv = validateRemark_(remark);
  if (!rv.ok) return _err_(rv.error);

  var ss        = getMasterSS_();
  var itemSheet = ss.getSheetByName(SUB_SHEETS_.ITEMS);
  if (!itemSheet) return _err_('_SubmissionBatchItems missing.');

  var rowNum = findRowById_(itemSheet, ITEM_COL_.ID, itemId);
  if (!rowNum) return _err_('Item not found: ' + itemId);

  itemSheet.getRange(rowNum, ITEM_COL_.REMARK).setValue(remark);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────
// S64 · RECRUITER ACTIVITY LOG
// ───────────────────────────────────────────────────────────────────

/**
 * Get activity log entries. Filters: batchId, kaiNo, reqId, entityType.
 */
function getActivityLog(filters) {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(SUB_SHEETS_.ACTIVITY_LOG);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var f    = filters || {};
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  var out  = [];

  data.forEach(function(r) {
    if (!r[0]) return;
    if (f.entityType && String(r[RAL_COL_.ENTITY_TYPE - 1]) !== f.entityType) return;
    if (f.batchId    && String(r[RAL_COL_.BATCH       - 1]) !== f.batchId)    return;
    if (f.kaiNo      && String(r[RAL_COL_.KAI         - 1]) !== f.kaiNo)      return;
    if (f.reqId      && String(r[RAL_COL_.REQ         - 1]) !== f.reqId)      return;
    out.push({
      logId:      r[RAL_COL_.ID          - 1],
      entityType: r[RAL_COL_.ENTITY_TYPE - 1],
      entityId:   r[RAL_COL_.ENTITY_ID   - 1],
      kaiNo:      r[RAL_COL_.KAI         - 1],
      batchId:    r[RAL_COL_.BATCH       - 1],
      reqId:      r[RAL_COL_.REQ         - 1],
      stage:      r[RAL_COL_.STAGE       - 1],
      remark:     r[RAL_COL_.REMARK      - 1],
      loggedAt:   r[RAL_COL_.LOGGED_AT   - 1],
      loggedBy:   r[RAL_COL_.LOGGED_BY   - 1]
    });
  });
  return out;
}

/**
 * Private: append one row to _RecruiterActivityLog. Append-only. No updates.
 */
function logActivity_(entityType, entityId, stage, remark, meta) {
  try {
    var ss    = getMasterSS_();
    var sheet = ss.getSheetByName(SUB_SHEETS_.ACTIVITY_LOG);
    if (!sheet) return;
    var m = meta || {};
    sheet.appendRow([
      generateId_('RAL'),
      entityType,
      entityId,
      m.kaiNo   || '',
      m.batchId || '',
      m.reqId   || '',
      stage,
      String(remark || '').slice(0, REMARK_MAX_LEN_),
      new Date(),
      getCallerEmail_()
    ]);
  } catch (e) {
    Logger.log('logActivity_: ' + e.message);
  }
}

// ───────────────────────────────────────────────────────────────────
// S65 · PRIVATE HELPERS
// ───────────────────────────────────────────────────────────────────

function _err_(msg) { return { ok: false, error: msg }; }

function generateId_(prefix) {
  var d   = new Date();
  var pad = function(n, l) { return ('0000' + n).slice(-l); };
  var ts  = pad(d.getFullYear(), 4) + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2);
  var rnd = pad(Math.floor(Math.random() * 9000) + 1000, 4);
  return prefix + '-' + ts + '-' + rnd;
}

function generateBatchId_(batchSheet) {
  var year   = new Date().getFullYear();
  var prefix = 'SUB-' + year + '-';
  var max    = 0;
  if (batchSheet.getLastRow() >= 2) {
    var ids = batchSheet.getRange(2, 1, batchSheet.getLastRow() - 1, 1).getValues();
    ids.forEach(function(r) {
      var id = String(r[0] || '');
      if (id.indexOf(prefix) === 0) {
        var n = parseInt(id.slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
  }
  return prefix + ('0000' + (max + 1)).slice(-4);
}

function validateRemark_(remark) {
  if (!remark || remark === '') return { ok: true };
  if (String(remark).length > REMARK_MAX_LEN_)
    return { ok: false, error: 'Remark exceeds ' + REMARK_MAX_LEN_ + ' characters (' + String(remark).length + ').' };
  return { ok: true };
}

function getCallerEmail_() {
  try { return Session.getActiveUser().getEmail() || 'system'; } catch (e) { return 'system'; }
}

/** Find a row number (1-based) by matching value in a given column. Returns null if not found. */
function findRowById_(sheet, col, id) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  var vals = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(id)) return i + 2;
  }
  return null;
}

function findProjectCandidate_(sheet, reqId, kaiNo) {
  if (sheet.getLastRow() < 2) return { found: false };
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][PC_COL_.REQ - 1]) === reqId &&
        String(data[i][PC_COL_.KAI - 1]) === kaiNo) {
      return {
        found:   true,
        rowNum:  i + 2,
        id:      data[i][PC_COL_.ID - 1],
        removed: !!data[i][PC_COL_.REMOVED_AT - 1]
      };
    }
  }
  return { found: false };
}

function findBatchItem_(sheet, batchId, kaiNo) {
  if (sheet.getLastRow() < 2) return { found: false };
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][ITEM_COL_.BATCH - 1]) === batchId &&
        String(data[i][ITEM_COL_.KAI   - 1]) === kaiNo) {
      return {
        found:   true,
        rowNum:  i + 2,
        id:      data[i][ITEM_COL_.ID - 1],
        removed: !!data[i][ITEM_COL_.REMOVED_AT - 1]
      };
    }
  }
  return { found: false };
}

function rowToBatch_(r) {
  return {
    batchId:         r[BATCH_COL_.ID          - 1],
    reqId:           r[BATCH_COL_.REQ         - 1],
    clientName:      r[BATCH_COL_.CLIENT      - 1],
    trade:           r[BATCH_COL_.TRADE       - 1],
    status:          r[BATCH_COL_.STATUS      - 1],
    capacity:        r[BATCH_COL_.CAPACITY    - 1],
    itemCount:       r[BATCH_COL_.ITEM_COUNT  - 1],
    createdAt:       r[BATCH_COL_.CREATED_AT  - 1],
    createdBy:       r[BATCH_COL_.CREATED_BY  - 1],
    readyAt:         r[BATCH_COL_.READY_AT    - 1],
    readyBy:         r[BATCH_COL_.READY_BY    - 1],
    submittedAt:     r[BATCH_COL_.SUBMITTED_AT - 1],
    submittedBy:     r[BATCH_COL_.SUBMITTED_BY - 1],
    closedAt:        r[BATCH_COL_.CLOSED_AT   - 1],
    closedBy:        r[BATCH_COL_.CLOSED_BY   - 1],
    recruiterRemark: r[BATCH_COL_.REMARK      - 1]
  };
}

/** Read-only lookup into _Requirements. Returns {reqId, clientName, trade, country, quantity} or null. */
function getRequirementById_(ss, reqId) {
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet || sheet.getLastRow() < 2) return null;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 21).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === reqId) {
      return {
        reqId:      data[i][0],
        clientName: data[i][2],
        trade:      data[i][4],
        country:    data[i][3],
        quantity:   data[i][5]
      };
    }
  }
  return null;
}

/** Read-only CV data from Candidates sheet. Returns {cvLink, cvFileId}. */
function getCandidateCvData_(ss, kaiNo) {
  var candName  = (typeof CONFIG !== 'undefined' && CONFIG.sheetName) || 'Candidates';
  var candSheet = ss.getSheetByName(candName);
  if (!candSheet || candSheet.getLastRow() < 2) return { cvLink: '', cvFileId: '' };
  // KAI No = col 25, cvLink = col 22 (1-based)
  var data = candSheet.getRange(2, 1, candSheet.getLastRow() - 1, 25).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][24]) === kaiNo) {
      var link    = String(data[i][21] || '');
      var fmatch  = link.match(/\/d\/([a-zA-Z0-9_-]+)\//);
      return { cvLink: link, cvFileId: fmatch ? fmatch[1] : '' };
    }
  }
  return { cvLink: '', cvFileId: '' };
}

function setConfigDefault_(key, value) {
  try {
    var ss  = getMasterSS_();
    var cfg = ss ? ss.getSheetByName('_Config') : null;
    if (!cfg) return;
    var data = cfg.getRange(1, 1, cfg.getLastRow(), 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === key) return;
    }
    cfg.appendRow([key, value]);
  } catch (e) { Logger.log('setConfigDefault_: ' + e.message); }
}

function getConfigInt_(key, fallback) {
  try {
    var ss  = getMasterSS_();
    var cfg = ss ? ss.getSheetByName('_Config') : null;
    if (!cfg) return fallback;
    var data = cfg.getRange(1, 1, cfg.getLastRow(), 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === key) return parseInt(data[i][1]) || fallback;
    }
  } catch (e) {}
  return fallback;
}

// END OF FILE — kai_sprint1_submission.gs
