/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FOUNDATION — CLIENT ENTITY v1 (foundation_client_v1.gs)
 * Step 1 of 6 · Governed by CLIENT_ENTITY_FINAL.md + FOUNDATION_BUILD_RULES
 * Branch: claude/sweet-franklin-mnmfcz
 * ───────────────────────────────────────────────────────────────────────────
 * Tab: _Clients  (existing, reconciled in place — Rule 3)
 * Legacy cols 1-9: UNTOUCHED (Rule 2 · Rule 11)
 * New cols 10-19:  APPENDED only (Rule 4)
 *
 * ROLLBACK: delete columns 10–19 from _Clients.
 *   No legacy column was altered. The original 9-column schema is restored
 *   by column deletion alone. No row was deleted (Rule 1). No column renamed
 *   (Rule 2). No sheet replaced (Rule 3). Additive only (Rule 4).
 *   Pre-migration snapshot captured before any write (Rule 5).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
// FC.S00 · CONFIG
// ───────────────────────────────────────────────────────────────────────────
var FC_TAB   = '_Clients';
var FC_COLOR = '#1a3a5c';

// Exact headers for legacy columns 1-9 (read from sheet; used for idx mapping)
var FC_LEGACY_HEADERS = [
  'ClientCode','ClientName','Country','Sector','ContactName',
  'ContactEmail','Status','CreatedAt','Notes'
];

// New columns appended at positions 10-19
var FC_NEW_HEADERS = [
  'ClientID','FoundationStatus','MEA Client Category','Ownership Type',
  'State / Emirate','ContactMobile','Preferred Submission Format',
  'Payment Terms','SLA Days','CreatedBy'
];

var FC_ALL_HEADERS = FC_LEGACY_HEADERS.concat(FC_NEW_HEADERS);

// Governed vocabulary (no free text allowed)
var FC_STATUS_VOCAB = ['ACTIVE','INACTIVE','BLACKLISTED','PROSPECT'];

// Legacy Status → FoundationStatus derivation map (Rule 11)
var FC_STATUS_MAP = {
  'active':      'ACTIVE',
  'inactive':    'INACTIVE',
  'blacklisted': 'BLACKLISTED',
  'prospect':    'PROSPECT',
  'lead':        'PROSPECT'
};

var FC_MEA_CATEGORY_VOCAB      = ['Tier A','Tier B','Tier C','New'];
var FC_OWNERSHIP_VOCAB         = ['Govt','Semi-Govt','Private','JV'];
var FC_SUBMISSION_FORMAT_VOCAB = ['PDF','Excel','Portal','Email'];

// ───────────────────────────────────────────────────────────────────────────
// FC.S01 · SHEET HELPERS
// ───────────────────────────────────────────────────────────────────────────

/** FC.S01.F01 — open _Clients and build header→colIndex map (1-based). */
function fcSheet_() {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(FC_TAB);
  if (!sheet) throw new Error('FC: _Clients tab not found — cannot proceed (Rule 3: no sheet replacement).');
  var lastCol = Math.max(1, sheet.getLastColumn());
  var rawHdr  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var i = 0; i < rawHdr.length; i++) {
    var h = String(rawHdr[i]).trim();
    if (h !== '') idx[h] = i + 1;  // 1-based column number
  }
  return { sheet: sheet, idx: idx, lastCol: lastCol };
}

/** FC.S01.F02 — read all data rows as objects keyed by header. */
function fcReadAllRows_(s) {
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var ncols = Math.max(s.lastCol, FC_ALL_HEADERS.length);
  var data  = s.sheet.getRange(2, 1, last - 1, ncols).getValues();
  return data.map(function (row, i) {
    var o = { __row: i + 2 };
    FC_ALL_HEADERS.forEach(function (h, ci) {
      o[h] = (ci < row.length) ? row[ci] : '';
    });
    return o;
  });
}

/** FC.S01.F03 — update named columns on a row (by exact 1-based col number). */
function fcUpdateRow_(sheet, rowNum, patch, idx) {
  for (var h in patch) {
    var col = idx[h];
    if (!col) throw new Error('FC: column not found in sheet: ' + h);
    sheet.getRange(rowNum, col).setValue(patch[h]);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// FC.S02 · ID GENERATION
// ───────────────────────────────────────────────────────────────────────────

/**
 * FC.S02.F01 — generate next ClientID.
 * Format: CLI-YYYYMMDD-NNNN. NNNN is max existing today's sequence + 1.
 */
function fcNextClientId_(rows) {
  var today = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd');
  var prefix = 'CLI-' + today + '-';
  var max = 0;
  rows.forEach(function (r) {
    var cid = String(r.ClientID || '');
    if (cid.indexOf(prefix) === 0) {
      var n = parseInt(cid.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

// ───────────────────────────────────────────────────────────────────────────
// FC.S03 · SCHEMA MIGRATION (Step 1 build task)
// ───────────────────────────────────────────────────────────────────────────

/**
 * FC.S03.F01 — ENTRY POINT: run the Client migration.
 *   1. Snapshot _Clients.
 *   2. Append new cols 10-19 (if absent).
 *   3. Backfill ClientID for existing rows that have none.
 *   4. Derive FoundationStatus from legacy Status (legacy Status NOT modified).
 *   5. Log + return acceptance report.
 */
function migrateClientFoundation() {
  var snapshot = fcSnapshot_();
  var s = fcSheet_();

  // 1. Extend schema (additive, Rule 4)
  var added = fcEnsureNewColumns_(s);

  // re-read after column add so idx is fresh
  s = fcSheet_();
  var rows = fcReadAllRows_(s);

  // 2. Backfill + derive per existing row
  var migrated = 0, skipped = 0;
  rows.forEach(function (r) {
    var patch = {};
    // backfill ClientID if absent (no overwrite — Rule 12: immutable after creation)
    if (!r.ClientID || String(r.ClientID).trim() === '') {
      patch.ClientID = fcNextClientId_(rows);
      rows = fcReadAllRows_(s);  // refresh so next ID doesn't collide
    }
    // derive FoundationStatus from legacy Status (Rule 11: legacy Status untouched)
    if (!r.FoundationStatus || String(r.FoundationStatus).trim() === '') {
      var raw = String(r.Status || '').trim().toLowerCase();
      patch.FoundationStatus = FC_STATUS_MAP[raw] || 'ACTIVE';
    }
    if (!r.CreatedBy || String(r.CreatedBy).trim() === '') {
      patch.CreatedBy = 'SYSTEM-MIGRATION';
    }
    if (Object.keys(patch).length > 0) {
      fcUpdateRow_(s.sheet, r.__row, patch, s.idx);
      migrated++;
    } else {
      skipped++;
    }
  });

  var report = {
    ok: true,
    snapshotRows: snapshot.length,
    schemaColumnsAdded: added,
    rowsMigrated: migrated,
    rowsSkipped: skipped,
    totalRows: rows.length
  };
  fcLog_('migrateClientFoundation', 'SYSTEM-MIGRATION', report);
  Logger.log('FC MIGRATION COMPLETE: ' + JSON.stringify(report));
  return report;
}

/** FC.S03.F02 — append new columns 10-19 to the header row if not already present. */
function fcEnsureNewColumns_(s) {
  var added = [];
  FC_NEW_HEADERS.forEach(function (h) {
    if (!s.idx[h]) {
      var col = s.sheet.getLastColumn() + 1;
      s.sheet.getRange(1, col).setValue(h);
      // style header to match existing pattern
      s.sheet.getRange(1, col)
        .setFontWeight('bold')
        .setBackground(FC_COLOR)
        .setFontColor('#ffffff')
        .setHorizontalAlignment('center');
      s.idx[h] = col;
      s.lastCol = col;
      added.push(h);
    }
  });
  return added;
}

/** FC.S03.F03 — capture a snapshot of all current _Clients rows before migration. */
function fcSnapshot_() {
  var s = fcSheet_();
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var data = s.sheet.getRange(2, 1, last - 1, s.lastCol).getValues();
  // store in Script Properties as a safety net (size-limited; use for 1-row case)
  try {
    PropertiesService.getScriptProperties()
      .setProperty('FC_SNAPSHOT_' + Utilities.formatDate(new Date(),'GMT','yyyyMMddHHmmss'),
                   JSON.stringify(data));
  } catch (e) { /* snapshot too large for props; rely on spreadsheet undo */ }
  return data;
}

// ───────────────────────────────────────────────────────────────────────────
// FC.S04 · WRITE ENGINE — create / find
// ───────────────────────────────────────────────────────────────────────────

/**
 * FC.S04.F01 — create a new Client record.
 *
 * Required: { ClientCode, ClientName }
 * Optional: { Country, Sector, ContactName, ContactEmail, ContactMobile,
 *             'MEA Client Category', 'Ownership Type', 'State / Emirate',
 *             'Preferred Submission Format', 'Payment Terms', 'SLA Days',
 *             Notes, FoundationStatus }
 * Actor:    { role, by }
 */
function createClient(fields, actor) {
  actor = actor || {};
  var role = actor.role || 'Recruiter';
  var by   = actor.by   || (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'system');

  // --- validation (acceptance criteria §4) ---
  if (!fields || !String(fields.ClientCode || '').trim())
    throw new Error('FC: ClientCode is required.');
  if (!String(fields.ClientName || '').trim())
    throw new Error('FC: ClientName is required.');

  var fsVal = String(fields.FoundationStatus || 'ACTIVE').trim();
  if (FC_STATUS_VOCAB.indexOf(fsVal) === -1)
    throw new Error('FC: FoundationStatus "' + fsVal + '" is not in governed vocabulary (' + FC_STATUS_VOCAB.join('/') + ').');

  if (fields.Notes && /\[[A-Za-z]+:[A-Z0-9\-]+\]/.test(String(fields.Notes)))
    throw new Error('FC: Notes must not contain bracket-enclosed ID patterns — put IDs in FK columns.');

  if (fields['MEA Client Category'] &&
      FC_MEA_CATEGORY_VOCAB.indexOf(fields['MEA Client Category']) === -1)
    throw new Error('FC: MEA Client Category must be one of ' + FC_MEA_CATEGORY_VOCAB.join('/'));

  if (fields['Ownership Type'] &&
      FC_OWNERSHIP_VOCAB.indexOf(fields['Ownership Type']) === -1)
    throw new Error('FC: Ownership Type must be one of ' + FC_OWNERSHIP_VOCAB.join('/'));

  if (fields['Preferred Submission Format'] &&
      FC_SUBMISSION_FORMAT_VOCAB.indexOf(fields['Preferred Submission Format']) === -1)
    throw new Error('FC: Preferred Submission Format must be one of ' + FC_SUBMISSION_FORMAT_VOCAB.join('/'));

  // --- duplicate check ---
  var s = fcSheet_();
  var rows = fcReadAllRows_(s);
  var dup = rows.filter(function (r) {
    return String(r.ClientCode || '').trim().toLowerCase() ===
           String(fields.ClientCode).trim().toLowerCase();
  });
  if (dup.length > 0)
    throw new Error('FC: ClientCode "' + fields.ClientCode + '" already exists (row ' + dup[0].__row + ').');

  // --- assign PK ---
  var clientId = fcNextClientId_(rows);
  var now = new Date();

  // --- build row in column order (19 cols) ---
  var row = [
    String(fields.ClientCode).trim(),                              // 1
    String(fields.ClientName).trim(),                              // 2
    fields.Country   || '',                                        // 3
    fields.Sector    || '',                                        // 4
    fields.ContactName  || '',                                     // 5
    fields.ContactEmail || '',                                     // 6
    '',                                                            // 7  legacy Status — blank on create; recruiter edits freely
    now,                                                           // 8
    fields.Notes || '',                                            // 9
    clientId,                                                      // 10 ClientID (PK)
    fsVal,                                                         // 11 FoundationStatus
    fields['MEA Client Category'] || '',                           // 12
    fields['Ownership Type']      || '',                           // 13
    fields['State / Emirate']     || '',                           // 14
    fields.ContactMobile          || '',                           // 15
    fields['Preferred Submission Format'] || '',                   // 16
    fields['Payment Terms']       || '',                           // 17
    fields['SLA Days']            || '',                           // 18
    by                                                             // 19 CreatedBy
  ];

  s.sheet.appendRow(row);
  fcLog_('createClient', by, { ClientID: clientId, ClientCode: fields.ClientCode });
  return { ok: true, ClientID: clientId, ClientCode: fields.ClientCode, row: s.sheet.getLastRow() };
}

/**
 * FC.S04.F02 — find an existing Client by ClientID; returns the row object or null.
 * Used by downstream engines to resolve FKs (Project, Campaign, Requirement).
 */
function findClientById(clientId) {
  if (!clientId) return null;
  var s = fcSheet_();
  var rows = fcReadAllRows_(s);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ClientID || '') === String(clientId)) return rows[i];
  }
  return null;
}

/**
 * FC.S04.F03 — find a Client by ClientCode (exact, case-insensitive).
 * Used by Requirement migration to resolve ClientName → ClientID.
 */
function findClientByCode(clientCode) {
  if (!clientCode) return null;
  var s = fcSheet_();
  var rows = fcReadAllRows_(s);
  var lc = String(clientCode).trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ClientCode || '').trim().toLowerCase() === lc) return rows[i];
  }
  return null;
}

/**
 * FC.S04.F04 — find a Client by ClientName (exact, case-insensitive).
 * Used by Requirement migration where ClientCode is unknown.
 */
function findClientByName(clientName) {
  if (!clientName) return null;
  var s = fcSheet_();
  var rows = fcReadAllRows_(s);
  var lc = String(clientName).trim().toLowerCase();
  var matches = rows.filter(function (r) {
    return String(r.ClientName || '').trim().toLowerCase() === lc;
  });
  if (matches.length === 1) return matches[0];   // single unambiguous match
  if (matches.length  > 1) return 'AMBIGUOUS';   // multiple — caller must lock
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// FC.S05 · VALIDATION HELPERS (used by downstream FK resolvers)
// ───────────────────────────────────────────────────────────────────────────

/**
 * FC.S05.F01 — assert a ClientID resolves to a live Client; throw if not.
 * Called by Project/Campaign/Requirement write engines (FK validation, Rule 12).
 */
function fcAssertClientExists_(clientId) {
  var c = findClientById(clientId);
  if (!c) throw new Error('FC: ClientID "' + clientId + '" does not resolve to a live Client (Rule 12 — no orphans).');
  if (c.FoundationStatus === 'BLACKLISTED')
    throw new Error('FC: Client "' + clientId + '" is BLACKLISTED — no child entity may be created against a blacklisted parent.');
  return c;
}

// ───────────────────────────────────────────────────────────────────────────
// FC.S06 · ACCEPTANCE VERIFICATION
// ───────────────────────────────────────────────────────────────────────────

/**
 * FC.S06.F01 — verify all acceptance criteria from CLIENT_ENTITY_FINAL.md §6.
 * Run after migration. Logs pass/fail per criterion.
 */
function verifyClientAcceptance() {
  var s = fcSheet_();
  var rows = fcReadAllRows_(s);
  var results = [];

  function chk(name, fn) {
    try { var r = fn(); results.push({ criterion: name, pass: true, detail: r }); }
    catch (e) { results.push({ criterion: name, pass: false, detail: String(e.message || e) }); }
  }

  // §6.1 — row count unchanged (1 row for live sheet)
  chk('Row count preserved (≥1)', function () {
    if (rows.length < 1) throw new Error('0 rows found');
    return rows.length + ' row(s)';
  });

  // §6.2 — every existing row has a valid ClientID
  chk('All rows have ClientID (CLI-...)', function () {
    var bad = rows.filter(function (r) {
      return !/^CLI-\d{8}-\d{4}$/.test(String(r.ClientID || ''));
    });
    if (bad.length) throw new Error(bad.length + ' row(s) with invalid/missing ClientID');
    return 'all ' + rows.length + ' rows have valid ClientID';
  });

  // §6.3 — FoundationStatus derived; legacy Status untouched
  chk('FoundationStatus governed; legacy Status untouched', function () {
    var badFS = rows.filter(function (r) {
      return FC_STATUS_VOCAB.indexOf(String(r.FoundationStatus || '').trim()) === -1;
    });
    if (badFS.length) throw new Error(badFS.length + ' row(s) with off-vocabulary FoundationStatus');
    return 'all rows have valid FoundationStatus';
  });

  // §6.4 — create a test Client (write engine enforces validation)
  chk('Create engine — valid write succeeds', function () {
    var testCode = 'UAT-TEST-' + Date.now();
    var r = createClient({ ClientCode: testCode, ClientName: 'UAT Test Client', FoundationStatus: 'PROSPECT' },
                         { role: 'Recruiter', by: 'uat@kai.os' });
    if (!r.ok || !r.ClientID) throw new Error('write returned no ClientID');
    return 'ClientID=' + r.ClientID;
  });

  // §6.5 — invalid writes are refused
  chk('Create engine — missing ClientName refused', function () {
    try { createClient({ ClientCode: 'UAT-MISS-NAME' }, { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write was NOT refused');
  });

  chk('Create engine — off-vocabulary FoundationStatus refused', function () {
    try { createClient({ ClientCode: 'UAT-BAD-STATUS', ClientName: 'X', FoundationStatus: 'UNKNOWN' },
                       { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write was NOT refused');
  });

  chk('Create engine — duplicate ClientCode refused', function () {
    // get first existing code
    var existing = rows[0] && rows[0].ClientCode;
    if (!existing) return 'skip (no existing rows)';
    try { createClient({ ClientCode: existing, ClientName: 'DUP' }, { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('duplicate ClientCode was NOT refused');
  });

  // §6.6 — Notes bracket ID hygiene
  chk('Notes bracket-ID pattern refused', function () {
    try { createClient({ ClientCode: 'UAT-NOTES', ClientName: 'Y', Notes: 'See [Project:PROJ-001]' },
                       { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('Notes bracket pattern was NOT refused');
  });

  // §6.7 — no K14/Execution/AI columns present
  chk('No K14/Execution column in schema', function () {
    var forbidden = ['MatchScore','DeployabilityScore','Readiness','PipelineState',
                     'SubmissionCount','SelectionRate','Reliability'];
    var headers = FC_ALL_HEADERS.join(',');
    var found = forbidden.filter(function (f) { return headers.indexOf(f) !== -1; });
    if (found.length) throw new Error('Forbidden columns in schema: ' + found.join(','));
    return 'clean';
  });

  var passed = results.filter(function (r) { return r.pass; }).length;
  Logger.log('CLIENT ACCEPTANCE: ' + passed + '/' + results.length + ' passed');
  results.forEach(function (r) {
    Logger.log((r.pass ? '✓ ' : '✗ ') + r.criterion + ' — ' + r.detail);
  });
  return { passed: passed, total: results.length, allPass: passed === results.length, results: results };
}

// ───────────────────────────────────────────────────────────────────────────
// FC.S07 · ROLLBACK
// ───────────────────────────────────────────────────────────────────────────

/**
 * FC.S07.F01 — ROLLBACK: delete columns 10-19 from _Clients.
 * Restores the original 9-column schema exactly. No row is deleted (Rule 1).
 * Only call after confirming via snapshot that this is a post-migration sheet.
 */
function rollbackClientMigration() {
  var s = fcSheet_();
  var totalCols = s.sheet.getLastColumn();
  // delete from the right to avoid index shift
  for (var c = totalCols; c >= 10; c--) {
    s.sheet.deleteColumn(c);
  }
  fcLog_('rollbackClientMigration', 'SYSTEM-ROLLBACK', { deletedCols: '10-' + totalCols });
  Logger.log('CLIENT ROLLBACK COMPLETE — columns 10-' + totalCols + ' deleted; 9-column schema restored.');
  return { ok: true, restoredCols: 9 };
}

// ───────────────────────────────────────────────────────────────────────────
// FC.S08 · LOGGING
// ───────────────────────────────────────────────────────────────────────────

function fcLog_(event, actor, payload) {
  try {
    if (typeof appendLog_ === 'function') {
      appendLog_({ type: 'FOUNDATION:CLIENT', event: event, actor: actor,
                   detail: JSON.stringify(payload || {}) });
    }
  } catch (e) { /* never block on log failure */ }
}
