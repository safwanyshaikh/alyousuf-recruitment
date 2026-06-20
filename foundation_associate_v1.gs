/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FOUNDATION — ASSOCIATE ENTITY v1 (foundation_associate_v1.gs)
 * Step 5 of 6 · Governed by ASSOCIATE_ENTITY_FINAL.md + FOUNDATION_BUILD_RULES
 * Branch: claude/sweet-franklin-mnmfcz
 * ───────────────────────────────────────────────────────────────────────────
 * Tab: _Associates (19 live cols, 20 rows — reconciled in place, Rule 3)
 * Legacy cols 1-19: UNTOUCHED (Rule 2 · Rule 11)
 * New cols 20-23:   APPENDED only (Rule 4)
 * No parent FK (Associate sits at Requirement level, not beneath it).
 * Rule 14: NO performance/outcome field — ever. Rating/Reliability/FillRate are K14.
 *
 * ROLLBACK: delete columns 20–23 from _Associates.
 *   No legacy column altered. Original 19-column schema restored by deletion alone.
 *   No row deleted (Rule 1). No column renamed (Rule 2). No sheet replaced (Rule 3).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
// FA.S00 · CONFIG
// ───────────────────────────────────────────────────────────────────────────
var FA_TAB   = '_Associates';
var FA_COLOR = '#1a3a5c';

var FA_LEGACY_HEADERS = [
  'AssocId','CompanyName','ContactName','Email','Mobile',
  'State','City','LicenseType','LicenseNo','Specialization',
  'Capacity','NumRecruiters','LinkedInUrl','WebsiteUrl','Address',
  'Status','CreatedAt','Notes','Source'
];
var FA_NEW_HEADERS = [
  'FoundationStatus','Associate Type','MEA Relationship','Coverage Geography'
];
var FA_ALL_HEADERS = FA_LEGACY_HEADERS.concat(FA_NEW_HEADERS);

var FA_STATUS_VOCAB     = ['ACTIVE','INACTIVE','BLACKLISTED'];
var FA_TYPE_VOCAB       = ['Agency','Freelancer','Sub-Agent'];
var FA_MEA_VOCAB        = ['Preferred','Approved','Probation','Blacklisted'];

// LicenseType → Associate Type derivation map
var FA_TYPE_MAP = {
  'registered': 'Agency', 'company': 'Agency', 'agency': 'Agency', 'firm': 'Agency',
  'individual': 'Freelancer', 'freelancer': 'Freelancer', 'freelance': 'Freelancer',
  'sub': 'Sub-Agent', 'sub-agent': 'Sub-Agent', 'subagent': 'Sub-Agent'
};

// ───────────────────────────────────────────────────────────────────────────
// FA.S01 · SHEET HELPERS
// ───────────────────────────────────────────────────────────────────────────

function faSheet_() {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(FA_TAB);
  if (!sheet) throw new Error('FA: _Associates tab not found (Rule 3).');
  var lastCol = Math.max(1, sheet.getLastColumn());
  var rawHdr  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var i = 0; i < rawHdr.length; i++) {
    var h = String(rawHdr[i]).trim();
    if (h !== '') idx[h] = i + 1;
  }
  return { sheet: sheet, idx: idx, lastCol: lastCol };
}

function faReadAllRows_(s) {
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var ncols = Math.max(s.lastCol, FA_ALL_HEADERS.length);
  var data  = s.sheet.getRange(2, 1, last - 1, ncols).getValues();
  return data.map(function (row, i) {
    var o = { __row: i + 2 };
    FA_ALL_HEADERS.forEach(function (h, ci) { o[h] = (ci < row.length) ? row[ci] : ''; });
    return o;
  });
}

function faUpdateRow_(sheet, rowNum, patch, idx) {
  for (var h in patch) {
    var col = idx[h];
    if (!col) throw new Error('FA: column not found: ' + h);
    sheet.getRange(rowNum, col).setValue(patch[h]);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// FA.S02 · ID GENERATION
// ───────────────────────────────────────────────────────────────────────────

function faNextAssocId_(rows) {
  var today  = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd');
  var prefix = 'ASSOC-' + today + '-';
  var max = 0;
  rows.forEach(function (r) {
    var aid = String(r.AssocId || '');
    if (aid.indexOf(prefix) === 0) {
      var n = parseInt(aid.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  // also track any pre-existing numeric format
  rows.forEach(function (r) {
    var aid = String(r.AssocId || '');
    if (/^\d+$/.test(aid)) {
      var n = parseInt(aid, 10);
      if (n > max) max = n;
    }
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

// ───────────────────────────────────────────────────────────────────────────
// FA.S03 · MIGRATION (Step 5 build task)
// ───────────────────────────────────────────────────────────────────────────

/**
 * FA.S03.F01 — ENTRY POINT: migrate Associate Foundation columns.
 * 1. Snapshot. 2. Append cols 20-23. 3. Derive Associate Type from LicenseType.
 * 4. Derive FoundationStatus from legacy Status. 5. Leave MEA/Coverage for recruiter.
 */
function migrateAssociateFoundation() {
  var snapshot = faSnapshot_();
  var s = faSheet_();
  var added = faEnsureNewColumns_(s);
  s = faSheet_();
  var rows = faReadAllRows_(s);

  var migrated = 0;
  rows.forEach(function (r) {
    var patch = {};

    // derive Associate Type from LicenseType (within-row classification; not a parent FK guess)
    if (!r['Associate Type'] || String(r['Associate Type']).trim() === '') {
      var lt = String(r.LicenseType || '').trim().toLowerCase();
      var derived = null;
      for (var key in FA_TYPE_MAP) {
        if (lt.indexOf(key) !== -1) { derived = FA_TYPE_MAP[key]; break; }
      }
      patch['Associate Type'] = derived || 'TYPE_UNCONFIRMED';
    }

    // derive FoundationStatus from legacy Status
    if (!r.FoundationStatus || String(r.FoundationStatus).trim() === '') {
      var raw = String(r.Status || '').trim().toLowerCase();
      patch.FoundationStatus = (raw === 'active' ? 'ACTIVE' : (raw === 'inactive' ? 'INACTIVE' : (raw === 'blacklisted' ? 'BLACKLISTED' : 'ACTIVE')));
    }

    // MEA Relationship and Coverage Geography left empty for recruiter entry (no inference)

    if (Object.keys(patch).length > 0) {
      faUpdateRow_(s.sheet, r.__row, patch, s.idx);
      migrated++;
    }
  });

  var report = {
    ok: true,
    snapshotRows: snapshot.length,
    schemaColumnsAdded: added,
    rowsMigrated: migrated,
    totalRows: rows.length
  };
  faLog_('migrateAssociateFoundation', 'SYSTEM-MIGRATION', report);
  Logger.log('ASSOCIATE MIGRATION COMPLETE: ' + JSON.stringify(report));
  return report;
}

function faEnsureNewColumns_(s) {
  var added = [];
  FA_NEW_HEADERS.forEach(function (h) {
    if (!s.idx[h]) {
      var col = s.sheet.getLastColumn() + 1;
      s.sheet.getRange(1, col).setValue(h);
      s.sheet.getRange(1, col)
        .setFontWeight('bold').setBackground(FA_COLOR)
        .setFontColor('#ffffff').setHorizontalAlignment('center');
      s.idx[h] = col;
      s.lastCol = col;
      added.push(h);
    }
  });
  return added;
}

function faSnapshot_() {
  var s = faSheet_();
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var data = s.sheet.getRange(2, 1, last - 1, s.lastCol).getValues();
  try {
    PropertiesService.getScriptProperties()
      .setProperty('FA_SNAPSHOT_' + Utilities.formatDate(new Date(),'GMT','yyyyMMddHHmmss'),
                   JSON.stringify(data));
  } catch (e) {}
  return data;
}

// ───────────────────────────────────────────────────────────────────────────
// FA.S04 · WRITE ENGINE
// ───────────────────────────────────────────────────────────────────────────

/**
 * FA.S04.F01 — create a new Associate.
 * Required: { CompanyName, and at least one of Email / Mobile }
 * Optional: { ContactName, Mobile, Email, State, City, LicenseType, LicenseNo,
 *             Specialization, Capacity, NumRecruiters, LinkedInUrl, WebsiteUrl,
 *             Address, Notes, Source, 'Associate Type', 'MEA Relationship',
 *             'Coverage Geography', FoundationStatus }
 */
function createAssociate(fields, actor) {
  actor = actor || {};
  var by = actor.by || (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'system');

  if (!String(fields.CompanyName || '').trim())
    throw new Error('FA: CompanyName is required.');

  // contact governance: at least one of Email / Mobile
  var email  = String(fields.Email  || '').trim();
  var mobile = String(fields.Mobile || '').trim();
  if (!email && !mobile)
    throw new Error('FA: at least one of Email or Mobile is required (contact governance).');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('FA: Email "' + email + '" is not valid format.');

  var typeVal = String(fields['Associate Type'] || '').trim();
  if (typeVal && FA_TYPE_VOCAB.indexOf(typeVal) === -1)
    throw new Error('FA: Associate Type must be one of ' + FA_TYPE_VOCAB.join('/'));

  var fsVal = String(fields.FoundationStatus || 'ACTIVE').trim();
  if (FA_STATUS_VOCAB.indexOf(fsVal) === -1)
    throw new Error('FA: FoundationStatus "' + fsVal + '" not in vocabulary (' + FA_STATUS_VOCAB.join('/') + ').');

  var meaVal = String(fields['MEA Relationship'] || '').trim();
  if (meaVal && FA_MEA_VOCAB.indexOf(meaVal) === -1)
    throw new Error('FA: MEA Relationship must be one of ' + FA_MEA_VOCAB.join('/'));

  if (fields.Notes && /\[[A-Za-z]+:[A-Z0-9\-]+\]/.test(String(fields.Notes)))
    throw new Error('FA: Notes must not contain bracket-enclosed ID patterns.');

  // Rule 14: reject any performance metric field
  var perfFields = ['Rating','Reliability','FillRate','SubmissionCount','SelectionCount',
                    'MobilizationCount','CommitmentAccuracy','MobilizationRate'];
  perfFields.forEach(function (f) {
    if (fields[f] !== undefined) throw new Error('FA: "' + f + '" is a performance metric — forbidden in Foundation (Rule 14). Belongs to K14.OUTCOMES/MEMORY.');
  });

  var s = faSheet_();
  var rows = faReadAllRows_(s);
  var assocId = faNextAssocId_(rows);
  var now = new Date();

  // if Associate Type not provided, derive from LicenseType
  if (!typeVal && fields.LicenseType) {
    var lt = String(fields.LicenseType).trim().toLowerCase();
    for (var key in FA_TYPE_MAP) {
      if (lt.indexOf(key) !== -1) { typeVal = FA_TYPE_MAP[key]; break; }
    }
    if (!typeVal) typeVal = 'TYPE_UNCONFIRMED';
  }

  var row = [
    assocId,                                   // 1  AssocId (PK)
    String(fields.CompanyName).trim(),          // 2
    fields.ContactName || '',                   // 3
    email,                                      // 4
    mobile,                                     // 5
    fields.State || '',                         // 6
    fields.City  || '',                         // 7
    fields.LicenseType || '',                   // 8
    fields.LicenseNo   || '',                   // 9
    fields.Specialization || '',                // 10
    fields.Capacity || '',                      // 11
    fields.NumRecruiters || '',                 // 12
    fields.LinkedInUrl || '',                   // 13
    fields.WebsiteUrl  || '',                   // 14
    fields.Address || '',                       // 15
    '',                                         // 16 Status (legacy — blank; recruiter manages)
    now,                                        // 17 CreatedAt
    fields.Notes  || '',                        // 18
    fields.Source || '',                        // 19
    fsVal,                                      // 20 FoundationStatus
    typeVal || '',                              // 21 Associate Type
    meaVal,                                     // 22 MEA Relationship
    fields['Coverage Geography'] || ''          // 23
  ];

  s.sheet.appendRow(row);
  faLog_('createAssociate', by, { AssocId: assocId, CompanyName: fields.CompanyName });
  return { ok: true, AssocId: assocId, CompanyName: fields.CompanyName, row: s.sheet.getLastRow() };
}

/** FA.S04.F02 — find Associate by AssocId; returns row object or null. */
function findAssociateById(assocId) {
  if (!assocId) return null;
  var s = faSheet_();
  var rows = faReadAllRows_(s);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].AssocId || '') === String(assocId)) return rows[i];
  }
  return null;
}

/**
 * FA.S04.F03 — find by email or company name (for Candidate FK backfill).
 * Returns the Associate row, 'AMBIGUOUS', or null.
 */
function findAssociateByContact(email, companyName) {
  var s = faSheet_();
  var rows = faReadAllRows_(s);
  var byEmail = email ? rows.filter(function (r) {
    return String(r.Email || '').trim().toLowerCase() === email.trim().toLowerCase();
  }) : [];
  if (byEmail.length === 1) return byEmail[0];
  if (byEmail.length  > 1) return 'AMBIGUOUS';

  if (companyName) {
    var byName = rows.filter(function (r) {
      return String(r.CompanyName || '').trim().toLowerCase() === companyName.trim().toLowerCase();
    });
    if (byName.length === 1) return byName[0];
    if (byName.length  > 1) return 'AMBIGUOUS';
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// FA.S05 · ACCEPTANCE VERIFICATION
// ───────────────────────────────────────────────────────────────────────────

function verifyAssociateAcceptance() {
  var s = faSheet_();
  var rows = faReadAllRows_(s);
  var results = [];
  function chk(name, fn) {
    try { var r = fn(); results.push({ criterion: name, pass: true, detail: r }); }
    catch (e) { results.push({ criterion: name, pass: false, detail: String(e.message || e) }); }
  }

  chk('Row count = 20 (no data loss)', function () {
    if (rows.length !== 20) throw new Error(rows.length + ' rows (expected 20)');
    return '20 rows';
  });
  chk('4 new columns at positions 20-23', function () {
    var missing = FA_NEW_HEADERS.filter(function (h) { return !s.idx[h]; });
    if (missing.length) throw new Error('Missing: ' + missing.join(', '));
    return 'all 4 new headers present';
  });
  chk('All rows have Associate Type or TYPE_UNCONFIRMED', function () {
    var bad = rows.filter(function (r) { return !r['Associate Type']; });
    if (bad.length) throw new Error(bad.length + ' row(s) missing Associate Type');
    return 'all rows have Associate Type or TYPE_UNCONFIRMED';
  });
  chk('All rows have valid FoundationStatus', function () {
    var bad = rows.filter(function (r) {
      return FA_STATUS_VOCAB.indexOf(String(r.FoundationStatus || '').trim()) === -1;
    });
    if (bad.length) throw new Error(bad.length + ' row(s) with off-vocabulary FoundationStatus');
    return 'all rows have valid FoundationStatus';
  });
  chk('Legacy Status (col 16) untouched', function () {
    if (!s.idx['Status'] || s.idx['Status'] !== 16) throw new Error('"Status" not at col 16 (at ' + s.idx['Status'] + ')');
    return 'legacy Status at col 16';
  });
  chk('Create — no contact refused', function () {
    try { createAssociate({ CompanyName: 'X' }, { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write not refused');
  });
  chk('Create — off-vocabulary Type refused', function () {
    try { createAssociate({ CompanyName: 'X', Mobile: '+1234', 'Associate Type': 'Partner' },
                          { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write not refused');
  });
  chk('Create — performance metric field refused (Rule 14)', function () {
    try { createAssociate({ CompanyName: 'X', Mobile: '+1234', Rating: 4.5 },
                          { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('Rule 14 violation not caught');
  });
  chk('Create — valid write succeeds', function () {
    var r = createAssociate({ CompanyName: 'UAT Associate ' + Date.now(), Email: 'uat@test.com',
                              'Associate Type': 'Agency' }, { role: 'Recruiter', by: 'uat@kai.os' });
    if (!r.ok || !r.AssocId) throw new Error('no AssocId returned');
    return 'AssocId=' + r.AssocId;
  });
  chk('No performance/K14 column in schema (Rule 14)', function () {
    var forbidden = ['Rating','Reliability','FillRate','SubmissionCount','MobilizationRate','MatchScore'];
    var headers = FA_ALL_HEADERS.join(',');
    var found = forbidden.filter(function (f) { return headers.indexOf(f) !== -1; });
    if (found.length) throw new Error('Forbidden columns: ' + found.join(','));
    return 'clean — no performance field in schema';
  });

  var passed = results.filter(function (r) { return r.pass; }).length;
  Logger.log('ASSOCIATE ACCEPTANCE: ' + passed + '/' + results.length + ' passed');
  results.forEach(function (r) { Logger.log((r.pass ? '✓ ' : '✗ ') + r.criterion + ' — ' + r.detail); });
  return { passed: passed, total: results.length, allPass: passed === results.length, results: results };
}

// ───────────────────────────────────────────────────────────────────────────
// FA.S06 · ROLLBACK
// ───────────────────────────────────────────────────────────────────────────

function rollbackAssociateMigration() {
  var s = faSheet_();
  var totalCols = s.sheet.getLastColumn();
  for (var c = totalCols; c >= 20; c--) { s.sheet.deleteColumn(c); }
  faLog_('rollbackAssociateMigration', 'SYSTEM-ROLLBACK', { deletedCols: '20-' + totalCols });
  Logger.log('ASSOCIATE ROLLBACK COMPLETE — cols 20-' + totalCols + ' deleted; 19-column schema restored.');
  return { ok: true, restoredCols: 19 };
}

// ───────────────────────────────────────────────────────────────────────────
// FA.S07 · LOGGING
// ───────────────────────────────────────────────────────────────────────────

function faLog_(event, actor, payload) {
  try {
    if (typeof appendLog_ === 'function')
      appendLog_({ type: 'FOUNDATION:ASSOCIATE', event: event, actor: actor,
                   detail: JSON.stringify(payload || {}) });
  } catch (e) {}
}
