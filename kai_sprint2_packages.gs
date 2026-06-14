/**
 * ═══════════════════════════════════════════════════════════════════
 *  KAI — Sprint 2 · Submission Packages
 *  Entities : _SubmissionPackages · _BatchTimeline
 *  Version  : 1.0.0
 *  Date     : 14-Jun-2026
 *
 *  Sprint 2 scope:
 *    generatePackage()   — builds email draft + CV manifest; DRAFT → READY
 *    getPackage()        — single package lookup
 *    getPackagesByBatch()— all versions (newest first)
 *    updatePackage()     — edit emailDraft / submissionSheetUrl / remark
 *    getBatchTimelineEvents() — full event log for a batch
 *
 *  D3 package contents:
 *    Email Draft (HTML stored in _SubmissionPackages.emailDraftHtml)
 *    Submission Sheet URL (stored in .submissionSheetUrl — recruiter-populated)
 *    CV Attachment Manifest (JSON array in .cvManifestJson)
 *    Versioning — each regeneration creates new version; prior → SUPERSEDED
 *
 *  D4 Timeline:
 *    _BatchTimeline (detailed, package-linked) — this file
 *    _Timeline (lightweight status transitions) — Sprint 1; still written
 *
 *  Dependencies:
 *    kai_sprint1_submission.gs — SUB_SHEETS_ · BATCH_COL_ · BATCH_STATUS_
 *    RAL_ENTITY_ · findRowById_ · generateId_ · getCallerEmail_
 *    validateRemark_ · _err_ · logActivity_ · appendTimelineEvent_
 *    getSubmissionBatch · getBatchItems · getMasterSS_
 *
 *  SAFE — zero writes to:
 *    Candidates · _Requirements · existing pipeline ·
 *    email intake · matching engine · _Submissions · _ClientSubs
 *
 *  SETUP
 *    1. Paste alongside kai_sprint1_submission.gs in Apps Script
 *    2. Run setupSprint2() once (after setupSprint1())
 *    3. Run healthCheckSprint2() to verify green
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// CONSTANTS
// ───────────────────────────────────────────────────────────────────

var PKG_SHEETS_ = {
  PACKAGES:       '_SubmissionPackages',
  BATCH_TIMELINE: '_BatchTimeline'
};

var PKG_STATUS_ = {
  CURRENT:    'CURRENT',
  SUPERSEDED: 'SUPERSEDED'
};

var BTL_EVENT_ = {
  STATUS_CHANGE:     'STATUS_CHANGE',
  PACKAGE_GENERATED: 'PACKAGE_GENERATED',
  PACKAGE_UPDATED:   'PACKAGE_UPDATED'
};

// Column indices (1-based)

var PKG_COL_ = {
  ID: 1, BATCH: 2, REQ: 3, VERSION: 4, STATUS: 5,
  EMAIL_DRAFT: 6, SHEET_URL: 7, CV_MANIFEST: 8, ITEM_COUNT: 9,
  GENERATED_AT: 10, GENERATED_BY: 11, REMARK: 12
};

var BTL_COL_ = {
  ID: 1, BATCH: 2, REQ: 3, PACKAGE: 4,
  EVENT_TYPE: 5, FROM_STATUS: 6, TO_STATUS: 7,
  TRIGGERED_BY: 8, TRIGGERED_AT: 9, REMARK: 10
};

// ───────────────────────────────────────────────────────────────────
// S70 · SETUP & HEALTH CHECK
// ───────────────────────────────────────────────────────────────────

function setupSprint2() {
  var ss = getMasterSS_();
  if (!ss) { Logger.log('setupSprint2: master spreadsheet not found.'); return; }

  var created = [], existed = [];

  var HEADERS = {};
  HEADERS[PKG_SHEETS_.PACKAGES] = [
    'packageId','batchId','reqId','version','packageStatus',
    'emailDraftHtml','submissionSheetUrl','cvManifestJson','itemCount',
    'generatedAt','generatedBy','recruiterRemark'
  ];
  HEADERS[PKG_SHEETS_.BATCH_TIMELINE] = [
    'eventId','batchId','reqId','packageId',
    'eventType','fromStatus','toStatus',
    'triggeredBy','triggeredAt','remark'
  ];

  Object.keys(PKG_SHEETS_).forEach(function(key) {
    var name = PKG_SHEETS_[key];
    if (ss.getSheetByName(name)) { existed.push(name); return; }
    var sheet = ss.insertSheet(name);
    var h = HEADERS[name];
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
    sheet.setFrozenRows(1);
    created.push(name);
  });

  Logger.log([
    'setupSprint2 complete.',
    '  Created : ' + (created.join(', ') || 'none'),
    '  Existed : ' + (existed.join(', ') || 'none')
  ].join('\n'));
}

function healthCheckSprint2() {
  var ss = getMasterSS_();
  var ok = [], issues = [];

  // Sprint 2 sheets
  Object.keys(PKG_SHEETS_).forEach(function(key) {
    var name = PKG_SHEETS_[key];
    if (ss && ss.getSheetByName(name)) ok.push(name + ' ✓');
    else issues.push(name + ' MISSING — run setupSprint2()');
  });

  // Sprint 1 dependency check
  var s1Required = ['_ProjectCandidates','_SubmissionBatches','_SubmissionBatchItems',
                    '_RecruiterActivityLog','_Timeline'];
  s1Required.forEach(function(name) {
    if (ss && ss.getSheetByName(name)) ok.push(name + ' (Sprint 1) ✓');
    else issues.push(name + ' MISSING — run setupSprint1() first');
  });

  Logger.log(
    '═══ SPRINT 2 HEALTH CHECK ═══\n' +
    (ok.length     ? '✓ OK:\n  '     + ok.join('\n  ')     + '\n' : '') +
    (issues.length ? '⚠ ISSUES:\n  ' + issues.join('\n  ') + '\n' : '') +
    (issues.length ? 'Resolve issues above before using Sprint 2.' : 'All Sprint 2 checks passed.')
  );
  return { ok: ok, issues: issues };
}

// ───────────────────────────────────────────────────────────────────
// S71 · SUBMISSION PACKAGES
// ───────────────────────────────────────────────────────────────────

/**
 * Generate a submission package for a batch.
 *
 * DRAFT batch  → transitions to READY, creates package v1 (or vN if prior existed).
 * READY batch  → stays READY, supersedes prior CURRENT package, creates new version.
 * SUBMITTED / CLOSED → rejected.
 *
 * Package contains:
 *   emailDraftHtml     — formatted HTML ready to paste into email client
 *   cvManifestJson     — JSON array of {order, kaiNo, cvLink, cvFileId}
 *   submissionSheetUrl — blank by default; recruiter fills via updatePackage()
 *
 * @param {string} batchId
 * @param {{recruiterRemark:string, submissionSheetUrl:string}} options
 */
function generatePackage(batchId, options) {
  if (!batchId) return _err_('batchId is required.');

  var batch = getSubmissionBatch(batchId);
  if (!batch) return _err_('Batch not found: ' + batchId);

  if (batch.status === BATCH_STATUS_.SUBMITTED)
    return _err_('Cannot generate package for a SUBMITTED batch.');
  if (batch.status === BATCH_STATUS_.CLOSED)
    return _err_('Cannot generate package for a CLOSED batch.');

  var items = getBatchItems(batchId);
  if (!items || items.length === 0)
    return _err_('Batch has no items. Add candidates before generating a package.');

  // GAS validation: item count must not exceed batch capacity
  if (items.length > batch.capacity)
    return _err_('Item count (' + items.length + ') exceeds batch capacity (' + batch.capacity + '). Reduce items or increase capacity first.');

  var ss       = getMasterSS_();
  var pkgSheet = ss.getSheetByName(PKG_SHEETS_.PACKAGES);
  if (!pkgSheet) return _err_('_SubmissionPackages missing. Run setupSprint2().');

  var opts     = options || {};
  var rv       = validateRemark_(opts.recruiterRemark);
  if (!rv.ok)  return _err_(rv.error);

  var recruiter  = getCallerEmail_();
  var fromStatus = batch.status;

  // Supersede any existing CURRENT package for this batch
  supercedePriorPackages_(pkgSheet, batchId);

  // Build package content
  var version    = getNextPackageVersion_(pkgSheet, batchId);
  var profileMap = {};
  items.forEach(function(item) {
    profileMap[item.kaiNo] = getCandidateProfile_(ss, item.kaiNo);
  });
  var emailDraft = buildEmailDraft_(batch, items, profileMap);
  var cvManifest = buildCvManifest_(items, profileMap);
  var packageId  = generateId_('PKG');

  pkgSheet.appendRow([
    packageId,
    batchId,
    batch.reqId,
    version,
    PKG_STATUS_.CURRENT,
    emailDraft,
    opts.submissionSheetUrl || '',
    cvManifest,
    items.length,
    new Date(),
    recruiter,
    opts.recruiterRemark || ''
  ]);

  // Transition DRAFT → READY if batch was DRAFT
  if (fromStatus === BATCH_STATUS_.DRAFT) {
    var batchSheet = ss.getSheetByName(SUB_SHEETS_.BATCHES);
    var batchRow   = findRowById_(batchSheet, BATCH_COL_.ID, batchId);
    batchSheet.getRange(batchRow, BATCH_COL_.STATUS).setValue(BATCH_STATUS_.READY);
    batchSheet.getRange(batchRow, BATCH_COL_.READY_AT).setValue(new Date());
    batchSheet.getRange(batchRow, BATCH_COL_.READY_BY).setValue(recruiter);

    // _BatchTimeline: STATUS_CHANGE
    appendBatchEvent_(batchId, batch.reqId, packageId,
      BTL_EVENT_.STATUS_CHANGE,
      BATCH_STATUS_.DRAFT, BATCH_STATUS_.READY,
      'Package v' + version + ' generated — batch marked READY');

    // _Timeline (Sprint 1 / D4 compliance)
    appendTimelineEvent_(batchId, batch.reqId,
      BATCH_STATUS_.DRAFT, BATCH_STATUS_.READY,
      'Package v' + version + ' generated');
  }

  // _BatchTimeline: PACKAGE_GENERATED
  appendBatchEvent_(batchId, batch.reqId, packageId,
    BTL_EVENT_.PACKAGE_GENERATED,
    fromStatus, PKG_STATUS_.CURRENT,
    'Package v' + version + ' · ' + items.length + ' candidate(s)');

  logActivity_(RAL_ENTITY_.BATCH, batchId, 'READY',
    'READY - Package v' + version + ' generated · ' + items.length + ' candidate(s)',
    { batchId: batchId, reqId: batch.reqId });

  return { ok: true, packageId: packageId, version: version, itemCount: items.length };
}

/**
 * Get a single package by ID.
 * @returns {object|null}
 */
function getPackage(packageId) {
  if (!packageId) return null;
  var ss       = getMasterSS_();
  var pkgSheet = ss.getSheetByName(PKG_SHEETS_.PACKAGES);
  if (!pkgSheet || pkgSheet.getLastRow() < 2) return null;
  var rowNum = findRowById_(pkgSheet, PKG_COL_.ID, packageId);
  if (!rowNum) return null;
  return rowToPackage_(pkgSheet.getRange(rowNum, 1, 1, 12).getValues()[0]);
}

/**
 * Get all package versions for a batch, newest first.
 * @returns {object[]}
 */
function getPackagesByBatch(batchId) {
  if (!batchId) return [];
  var ss       = getMasterSS_();
  var pkgSheet = ss.getSheetByName(PKG_SHEETS_.PACKAGES);
  if (!pkgSheet || pkgSheet.getLastRow() < 2) return [];

  var data = pkgSheet.getRange(2, 1, pkgSheet.getLastRow() - 1, 12).getValues();
  var out  = [];
  data.forEach(function(r) {
    if (!r[0]) return;
    if (String(r[PKG_COL_.BATCH - 1]) !== batchId) return;
    out.push(rowToPackage_(r));
  });
  out.sort(function(a, b) { return b.version - a.version; });
  return out;
}

/**
 * Update a CURRENT package's email draft, submission sheet URL, or remark.
 * Only the CURRENT (latest) version can be updated.
 *
 * @param {string} packageId
 * @param {{emailDraftHtml:string, submissionSheetUrl:string, remark:string}} updates
 */
function updatePackage(packageId, updates) {
  if (!packageId) return _err_('packageId is required.');
  if (!updates)   return _err_('updates object is required.');

  var ss       = getMasterSS_();
  var pkgSheet = ss.getSheetByName(PKG_SHEETS_.PACKAGES);
  if (!pkgSheet) return _err_('_SubmissionPackages missing.');

  var rowNum = findRowById_(pkgSheet, PKG_COL_.ID, packageId);
  if (!rowNum) return _err_('Package not found: ' + packageId);

  var data   = pkgSheet.getRange(rowNum, 1, 1, 12).getValues()[0];
  var status = String(data[PKG_COL_.STATUS - 1]);
  if (status !== PKG_STATUS_.CURRENT)
    return _err_('Only CURRENT packages can be updated. This package is ' + status + '.');

  var changed = [];

  if (updates.emailDraftHtml !== undefined) {
    pkgSheet.getRange(rowNum, PKG_COL_.EMAIL_DRAFT).setValue(updates.emailDraftHtml);
    changed.push('emailDraftHtml');
  }
  if (updates.submissionSheetUrl !== undefined) {
    pkgSheet.getRange(rowNum, PKG_COL_.SHEET_URL).setValue(updates.submissionSheetUrl);
    changed.push('submissionSheetUrl');
  }
  if (updates.remark !== undefined) {
    var rv = validateRemark_(updates.remark);
    if (!rv.ok) return _err_(rv.error);
    pkgSheet.getRange(rowNum, PKG_COL_.REMARK).setValue(updates.remark);
    changed.push('remark');
  }

  if (changed.length === 0) return _err_('No valid fields in updates. Allowed: emailDraftHtml · submissionSheetUrl · remark.');

  var batchId = String(data[PKG_COL_.BATCH - 1]);
  var reqId   = String(data[PKG_COL_.REQ   - 1]);

  appendBatchEvent_(batchId, reqId, packageId,
    BTL_EVENT_.PACKAGE_UPDATED, null, null,
    'Updated: ' + changed.join(', '));

  logActivity_(RAL_ENTITY_.BATCH, batchId, 'READY',
    'READY - Package ' + packageId + ' updated: ' + changed.join(', '),
    { batchId: batchId, reqId: reqId });

  return { ok: true, updated: changed };
}

// ───────────────────────────────────────────────────────────────────
// S72 · BATCH TIMELINE
// ───────────────────────────────────────────────────────────────────

/**
 * Get all timeline events for a batch, chronological order.
 * @returns {object[]}
 */
function getBatchTimelineEvents(batchId) {
  if (!batchId) return [];
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(PKG_SHEETS_.BATCH_TIMELINE);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  var out  = [];
  data.forEach(function(r) {
    if (!r[0]) return;
    if (String(r[BTL_COL_.BATCH - 1]) !== batchId) return;
    out.push({
      eventId:     r[BTL_COL_.ID           - 1],
      batchId:     r[BTL_COL_.BATCH        - 1],
      reqId:       r[BTL_COL_.REQ          - 1],
      packageId:   r[BTL_COL_.PACKAGE      - 1],
      eventType:   r[BTL_COL_.EVENT_TYPE   - 1],
      fromStatus:  r[BTL_COL_.FROM_STATUS  - 1],
      toStatus:    r[BTL_COL_.TO_STATUS    - 1],
      triggeredBy: r[BTL_COL_.TRIGGERED_BY - 1],
      triggeredAt: r[BTL_COL_.TRIGGERED_AT - 1],
      remark:      r[BTL_COL_.REMARK       - 1]
    });
  });
  return out;
}

// ───────────────────────────────────────────────────────────────────
// S73 · PRIVATE HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Append an event to _BatchTimeline. Append-only. Never updated. Never deleted.
 */
function appendBatchEvent_(batchId, reqId, packageId, eventType, fromStatus, toStatus, remark) {
  try {
    var ss    = getMasterSS_();
    var sheet = ss.getSheetByName(PKG_SHEETS_.BATCH_TIMELINE);
    if (!sheet) return;
    sheet.appendRow([
      generateId_('BTL'),
      batchId,
      reqId       || '',
      packageId   || '',
      eventType,
      fromStatus  || '',
      toStatus    || '',
      getCallerEmail_(),
      new Date(),
      String(remark || '').slice(0, REMARK_MAX_LEN_)
    ]);
  } catch (e) {
    Logger.log('appendBatchEvent_: ' + e.message);
  }
}

/**
 * Build HTML email draft from batch metadata and active items.
 * Includes candidateName, trade, nationality, experience columns.
 * Recruiter can edit the output via updatePackage().
 * @param {object} batch
 * @param {object[]} items
 * @param {object} profileMap  — {kaiNo: {candidateName, trade, nationality, experience}}
 */
function buildEmailDraft_(batch, items, profileMap) {
  var pm = profileMap || {};
  var rows = items.map(function(item) {
    var p      = pm[item.kaiNo] || {};
    var cvCell = item.cvLink
      ? '<a href="' + item.cvLink + '" style="color:#1a73e8;">View CV</a>'
      : '<span style="color:#999;">No CV</span>';
    return '<tr>' +
      '<td style="padding:6px 10px;text-align:center;border:1px solid #ddd;">' + item.displayOrder           + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">'                   + item.kaiNo                  + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">'                   + (p.candidateName || '')     + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">'                   + (p.trade        || '')      + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">'                   + (p.nationality   || '')     + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">'                   + (p.experience    || '')     + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">'                   + cvCell                      + '</td>' +
      '</tr>';
  }).join('');

  var th = function(label) {
    return '<td style="padding:8px 10px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">' + label + '</td>';
  };

  return '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:900px;margin:0 auto;">' +
    '<p>Dear Hiring Team,</p>' +
    '<p>Please find below our candidate submission for the position of ' +
    '<strong>' + batch.trade + '</strong>.</p>' +
    '<table style="border-collapse:collapse;width:100%;margin:16px 0;">' +
    '<thead><tr>' +
    th('#') + th('KAI No') + th('Name') + th('Trade') + th('Nationality') + th('Experience') + th('CV') +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '<p><strong>Batch Ref:</strong> ' + batch.batchId + ' &nbsp;|&nbsp; ' +
    '<strong>Candidates:</strong> ' + items.length + '</p>' +
    '<p>Please revert with your evaluation at your earliest convenience.</p>' +
    '<p>Best regards,<br>' +
    '<strong>Al Yousuf Enterprises LLP</strong><br>' +
    'Recruitment Team</p>' +
    '</body></html>';
}

/**
 * Build JSON manifest for CV attachment assembly and Submission Sheet generation.
 * Fields: order, kaiNo, candidateName, trade, nationality, experience, cvLink, cvFileId.
 * Lovable / ZIP generator reads this manifest to attach and label CVs.
 * @param {object[]} items
 * @param {object} profileMap  — {kaiNo: {candidateName, trade, nationality, experience}}
 */
function buildCvManifest_(items, profileMap) {
  var pm = profileMap || {};
  var manifest = items.map(function(item) {
    var p = pm[item.kaiNo] || {};
    return {
      order:         item.displayOrder,
      kaiNo:         item.kaiNo,
      candidateName: p.candidateName || '',
      trade:         p.trade         || '',
      nationality:   p.nationality   || '',
      experience:    p.experience    || '',
      cvLink:        item.cvLink     || '',
      cvFileId:      item.cvFileId   || ''
    };
  });
  return JSON.stringify(manifest);
}

/**
 * Read candidate profile fields from Candidates sheet (read-only).
 * Column positions sourced from _Config; defaults match standard KAI sheet layout.
 * Adjust _Config keys if your sheet differs:
 *   candidates_col_name        (default 2)
 *   candidates_col_trade       (default 4)
 *   candidates_col_nationality (default 6)
 *   candidates_col_experience  (default 8)
 * KAI No is always col 25.
 */
function getCandidateProfile_(ss, kaiNo) {
  var candName  = (typeof CONFIG !== 'undefined' && CONFIG.sheetName) || 'Candidates';
  var candSheet = ss.getSheetByName(candName);
  if (!candSheet || candSheet.getLastRow() < 2)
    return { candidateName: '', trade: '', nationality: '', experience: '' };

  var colName        = getConfigInt_('candidates_col_name',        2);
  var colTrade       = getConfigInt_('candidates_col_trade',       4);
  var colNationality = getConfigInt_('candidates_col_nationality', 6);
  var colExperience  = getConfigInt_('candidates_col_experience',  8);
  var maxCol         = Math.max(colName, colTrade, colNationality, colExperience, 25);

  var data = candSheet.getRange(2, 1, candSheet.getLastRow() - 1, maxCol).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][24]) === kaiNo) {          // col 25 = index 24
      return {
        candidateName: String(data[i][colName        - 1] || ''),
        trade:         String(data[i][colTrade       - 1] || ''),
        nationality:   String(data[i][colNationality - 1] || ''),
        experience:    String(data[i][colExperience  - 1] || '')
      };
    }
  }
  return { candidateName: '', trade: '', nationality: '', experience: '' };
}

/**
 * Find the next sequential version number for a batch's packages.
 */
function getNextPackageVersion_(pkgSheet, batchId) {
  if (pkgSheet.getLastRow() < 2) return 1;
  var data = pkgSheet.getRange(2, PKG_COL_.BATCH, pkgSheet.getLastRow() - 1, 3).getValues();
  var max  = 0;
  data.forEach(function(r) {
    if (String(r[0]) === batchId) {
      var v = parseInt(r[2]);
      if (!isNaN(v) && v > max) max = v;
    }
  });
  return max + 1;
}

/**
 * Mark all CURRENT packages for a batch as SUPERSEDED before generating a new version.
 */
function supercedePriorPackages_(pkgSheet, batchId) {
  if (pkgSheet.getLastRow() < 2) return;
  var data = pkgSheet.getRange(2, 1, pkgSheet.getLastRow() - 1, 5).getValues();
  data.forEach(function(r, i) {
    if (String(r[PKG_COL_.BATCH  - 1]) === batchId &&
        String(r[PKG_COL_.STATUS - 1]) === PKG_STATUS_.CURRENT) {
      pkgSheet.getRange(i + 2, PKG_COL_.STATUS).setValue(PKG_STATUS_.SUPERSEDED);
    }
  });
}

/**
 * Map a sheet row array to a package object.
 */
function rowToPackage_(r) {
  return {
    packageId:          r[PKG_COL_.ID           - 1],
    batchId:            r[PKG_COL_.BATCH        - 1],
    reqId:              r[PKG_COL_.REQ          - 1],
    version:            r[PKG_COL_.VERSION      - 1],
    packageStatus:      r[PKG_COL_.STATUS       - 1],
    emailDraftHtml:     r[PKG_COL_.EMAIL_DRAFT  - 1],
    submissionSheetUrl: r[PKG_COL_.SHEET_URL    - 1],
    cvManifestJson:     r[PKG_COL_.CV_MANIFEST  - 1],
    itemCount:          r[PKG_COL_.ITEM_COUNT   - 1],
    generatedAt:        r[PKG_COL_.GENERATED_AT - 1],
    generatedBy:        r[PKG_COL_.GENERATED_BY - 1],
    recruiterRemark:    r[PKG_COL_.REMARK       - 1]
  };
}

// END OF FILE — kai_sprint2_packages.gs  v1.1.0
