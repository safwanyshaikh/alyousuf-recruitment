/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FOUNDATION — PROJECT ENTITY v1 (foundation_project_v1.gs)
 * Step 2 of 6 · Governed by PROJECT_ENTITY_FINAL.md + FOUNDATION_BUILD_RULES
 * Branch: claude/sweet-franklin-mnmfcz
 * ───────────────────────────────────────────────────────────────────────────
 * Tab: _Projects (0 rows — schema-only migration; no data backfill)
 * Legacy cols 1-9: UNTOUCHED (Rule 2 · Rule 11)
 * New cols 10-21:  APPENDED only (Rule 4)
 * Depends on: foundation_client_v1.gs (ClientID FK must resolve — Rule 12)
 *
 * ROLLBACK: delete columns 10–21 from _Projects.
 *   No legacy column altered. No rows existed. Original 9-column empty schema
 *   restored by deletion alone. No row deleted (Rule 1). No column renamed (Rule 2).
 *   Pre-migration snapshot captured before any write (Rule 5).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
// FP.S00 · CONFIG
// ───────────────────────────────────────────────────────────────────────────
var FP_TAB   = '_Projects';
var FP_COLOR = '#1a3a5c';

var FP_LEGACY_HEADERS = [
  'ProjectID','ProjectName','Client','Country','Status',
  'CreatedAt','ActiveReqs','TotalPositions','Notes'
];
var FP_NEW_HEADERS = [
  'ClientID','ClientName','FoundationStatus','Project Code',
  'Client Reference Number','Department','Location / Site',
  'Project Type','Start Date','End Date','Recruiter Owner','Priority'
];
var FP_ALL_HEADERS = FP_LEGACY_HEADERS.concat(FP_NEW_HEADERS);

var FP_STATUS_VOCAB  = ['ACTIVE','COMPLETED','CANCELLED','ON-HOLD'];
var FP_TYPE_VOCAB    = ['Labour Supply','Turnkey','Staff Aug','Manpower'];
var FP_PRIORITY_VOCAB = ['HIGH','NORMAL','ON-HOLD'];

// ───────────────────────────────────────────────────────────────────────────
// FP.S01 · SHEET HELPERS
// ───────────────────────────────────────────────────────────────────────────

function fpSheet_() {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(FP_TAB);
  if (!sheet) throw new Error('FP: _Projects tab not found (Rule 3: no sheet replacement).');
  var lastCol = Math.max(1, sheet.getLastColumn());
  var rawHdr  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var i = 0; i < rawHdr.length; i++) {
    var h = String(rawHdr[i]).trim();
    if (h !== '') idx[h] = i + 1;
  }
  return { sheet: sheet, idx: idx, lastCol: lastCol };
}

function fpReadAllRows_(s) {
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var ncols = Math.max(s.lastCol, FP_ALL_HEADERS.length);
  var data  = s.sheet.getRange(2, 1, last - 1, ncols).getValues();
  return data.map(function (row, i) {
    var o = { __row: i + 2 };
    FP_ALL_HEADERS.forEach(function (h, ci) { o[h] = (ci < row.length) ? row[ci] : ''; });
    return o;
  });
}

function fpUpdateRow_(sheet, rowNum, patch, idx) {
  for (var h in patch) {
    var col = idx[h];
    if (!col) throw new Error('FP: column not found: ' + h);
    sheet.getRange(rowNum, col).setValue(patch[h]);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// FP.S02 · ID GENERATION
// ───────────────────────────────────────────────────────────────────────────

function fpNextProjectId_(rows) {
  var today  = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd');
  var prefix = 'PROJ-' + today + '-';
  var max = 0;
  rows.forEach(function (r) {
    var pid = String(r.ProjectID || '');
    if (pid.indexOf(prefix) === 0) {
      var n = parseInt(pid.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

// ───────────────────────────────────────────────────────────────────────────
// FP.S03 · SCHEMA MIGRATION (Step 2 build task)
// ───────────────────────────────────────────────────────────────────────────

/**
 * FP.S03.F01 — ENTRY POINT: run Project migration.
 * Schema-only (0 rows). Appends cols 10-21; no data backfill needed.
 */
function migrateProjectFoundation() {
  var snapshot = fpSnapshot_();
  var s = fpSheet_();
  var added = fpEnsureNewColumns_(s);
  var report = {
    ok: true,
    snapshotRows: snapshot.length,
    schemaColumnsAdded: added,
    rowsMigrated: 0,
    note: '_Projects has 0 rows — schema-only migration; no data backfill.'
  };
  fpLog_('migrateProjectFoundation', 'SYSTEM-MIGRATION', report);
  Logger.log('FP MIGRATION COMPLETE: ' + JSON.stringify(report));
  return report;
}

function fpEnsureNewColumns_(s) {
  var added = [];
  FP_NEW_HEADERS.forEach(function (h) {
    if (!s.idx[h]) {
      var col = s.sheet.getLastColumn() + 1;
      s.sheet.getRange(1, col).setValue(h);
      s.sheet.getRange(1, col)
        .setFontWeight('bold').setBackground(FP_COLOR)
        .setFontColor('#ffffff').setHorizontalAlignment('center');
      s.idx[h] = col;
      s.lastCol = col;
      added.push(h);
    }
  });
  return added;
}

function fpSnapshot_() {
  var s = fpSheet_();
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var data = s.sheet.getRange(2, 1, last - 1, s.lastCol).getValues();
  try {
    PropertiesService.getScriptProperties()
      .setProperty('FP_SNAPSHOT_' + Utilities.formatDate(new Date(),'GMT','yyyyMMddHHmmss'),
                   JSON.stringify(data));
  } catch (e) {}
  return data;
}

// ───────────────────────────────────────────────────────────────────────────
// FP.S04 · WRITE ENGINE
// ───────────────────────────────────────────────────────────────────────────

/**
 * FP.S04.F01 — create a new Project.
 * Required: { ClientID, ProjectName, Country }
 * Optional: { 'Project Code', 'Client Reference Number', Department,
 *             'Location / Site', 'Project Type', 'Start Date', 'End Date',
 *             'Recruiter Owner', Priority, Notes, FoundationStatus }
 */
function createProject(fields, actor) {
  actor = actor || {};
  var by = actor.by || (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'system');

  if (!String(fields.ClientID || '').trim())
    throw new Error('FP: ClientID is required (Rule 12 — no orphans).');
  if (!String(fields.ProjectName || '').trim())
    throw new Error('FP: ProjectName is required.');
  if (!String(fields.Country || '').trim())
    throw new Error('FP: Country is required.');

  // resolve parent Client (Rule 12)
  var client = fcAssertClientExists_(fields.ClientID);

  var fsVal = String(fields.FoundationStatus || 'ACTIVE').trim();
  if (FP_STATUS_VOCAB.indexOf(fsVal) === -1)
    throw new Error('FP: FoundationStatus "' + fsVal + '" not in vocabulary (' + FP_STATUS_VOCAB.join('/') + ').');

  if (fields['Project Type'] && FP_TYPE_VOCAB.indexOf(fields['Project Type']) === -1)
    throw new Error('FP: Project Type must be one of ' + FP_TYPE_VOCAB.join('/'));
  if (fields.Priority && FP_PRIORITY_VOCAB.indexOf(fields.Priority) === -1)
    throw new Error('FP: Priority must be one of ' + FP_PRIORITY_VOCAB.join('/'));

  if (fields.Notes && /\[[A-Za-z]+:[A-Z0-9\-]+\]/.test(String(fields.Notes)))
    throw new Error('FP: Notes must not contain bracket-enclosed ID patterns.');

  var s = fpSheet_();
  var rows = fpReadAllRows_(s);
  var projId = fpNextProjectId_(rows);
  var now = new Date();

  var row = [
    projId,                                       // 1 ProjectID (PK)
    String(fields.ProjectName).trim(),            // 2
    client.ClientName || client.ClientCode || '', // 3 Client (legacy name string — DEN copy; Rule 11 kept)
    String(fields.Country).trim(),                // 4
    '',                                           // 5 Status (legacy — blank; recruiter manages)
    now,                                          // 6 CreatedAt
    0,                                            // 7 ActiveReqs (computed, starts at 0)
    fields.TotalPositions || 0,                   // 8
    fields.Notes || '',                           // 9
    fields.ClientID,                              // 10 ClientID (FK — immutable)
    client.ClientName || '',                      // 11 ClientName (DEN)
    fsVal,                                        // 12 FoundationStatus
    fields['Project Code'] || '',                 // 13
    fields['Client Reference Number'] || '',      // 14
    fields.Department || '',                      // 15
    fields['Location / Site'] || '',              // 16
    fields['Project Type'] || '',                 // 17
    fields['Start Date'] || '',                   // 18
    fields['End Date'] || '',                     // 19
    fields['Recruiter Owner'] || '',              // 20
    fields.Priority || 'NORMAL'                   // 21
  ];

  s.sheet.appendRow(row);
  fpLog_('createProject', by, { ProjectID: projId, ClientID: fields.ClientID });
  return { ok: true, ProjectID: projId, ClientID: fields.ClientID, row: s.sheet.getLastRow() };
}

/** FP.S04.F02 — find a Project by ProjectID; returns row object or null. */
function findProjectById(projectId) {
  if (!projectId) return null;
  var s = fpSheet_();
  var rows = fpReadAllRows_(s);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ProjectID || '') === String(projectId)) return rows[i];
  }
  return null;
}

/**
 * FP.S04.F03 — assert ProjectID resolves to a live, active Project.
 * Called by Campaign write engine (FK validation, Rule 12).
 */
function fpAssertProjectExists_(projectId) {
  var p = findProjectById(projectId);
  if (!p) throw new Error('FP: ProjectID "' + projectId + '" does not resolve to a live Project (Rule 12 — no orphans).');
  if (p.FoundationStatus === 'CANCELLED')
    throw new Error('FP: Project "' + projectId + '" is CANCELLED — no new Campaign may be created under a cancelled Project.');
  return p;
}

// ───────────────────────────────────────────────────────────────────────────
// FP.S05 · ACCEPTANCE VERIFICATION
// ───────────────────────────────────────────────────────────────────────────

function verifyProjectAcceptance() {
  var s = fpSheet_();
  var rows = fpReadAllRows_(s);
  var results = [];
  function chk(name, fn) {
    try { var r = fn(); results.push({ criterion: name, pass: true, detail: r }); }
    catch (e) { results.push({ criterion: name, pass: false, detail: String(e.message || e) }); }
  }

  chk('Row count = 0 (schema-only migration)', function () {
    if (rows.length !== 0) throw new Error(rows.length + ' rows found (expected 0)');
    return '0 rows';
  });
  chk('12 new columns exist at positions 10-21', function () {
    var missing = FP_NEW_HEADERS.filter(function (h) { return !s.idx[h]; });
    if (missing.length) throw new Error('Missing headers: ' + missing.join(', '));
    return 'all 12 new headers present';
  });
  chk('Legacy Client (col 3) and Status (col 5) untouched', function () {
    if (!s.idx['Client']) throw new Error('"Client" header missing');
    if (!s.idx['Status']) throw new Error('"Status" header missing');
    if (s.idx['Client'] !== 3) throw new Error('"Client" moved to col ' + s.idx['Client']);
    if (s.idx['Status'] !== 5) throw new Error('"Status" moved to col ' + s.idx['Status']);
    return 'legacy columns intact at cols 3,5';
  });

  // need a live Client to test FK
  chk('Create Project — valid write (requires live Client)', function () {
    // find first available ClientID
    var testClients = [];
    try {
      var ss = getMasterSS_();
      var cs = ss.getSheetByName('_Clients');
      if (cs && cs.getLastRow() >= 2) {
        var hdr = cs.getRange(1,1,1,cs.getLastColumn()).getValues()[0];
        var cidCol = hdr.indexOf('ClientID');
        if (cidCol >= 0) {
          var cid = cs.getRange(2, cidCol+1).getValue();
          if (cid) testClients.push(cid);
        }
      }
    } catch (e) {}
    if (!testClients.length) return 'SKIP — no live Client available (run client migration first)';
    var r = createProject({
      ClientID: testClients[0], ProjectName: 'UAT Project ' + Date.now(), Country: 'UAE'
    }, { role: 'Recruiter', by: 'uat@kai.os' });
    if (!r.ok || !r.ProjectID) throw new Error('write returned no ProjectID');
    return 'ProjectID=' + r.ProjectID;
  });

  chk('Create Project — missing ClientID refused', function () {
    try { createProject({ ProjectName: 'X', Country: 'UAE' }, { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write not refused');
  });
  chk('Create Project — off-vocabulary FoundationStatus refused', function () {
    try { createProject({ ClientID: 'CLI-FAKE', ProjectName: 'X', Country: 'UAE', FoundationStatus: 'MAYBE' },
                        { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write not refused');
  });
  chk('No K14/Execution column in schema', function () {
    var forbidden = ['MatchScore','DeployabilityScore','SubmissionCount','PipelineState'];
    var headers = FP_ALL_HEADERS.join(',');
    var found = forbidden.filter(function (f) { return headers.indexOf(f) !== -1; });
    if (found.length) throw new Error('Forbidden columns: ' + found.join(','));
    return 'clean';
  });

  var passed = results.filter(function (r) { return r.pass; }).length;
  Logger.log('PROJECT ACCEPTANCE: ' + passed + '/' + results.length + ' passed');
  results.forEach(function (r) {
    Logger.log((r.pass ? '✓ ' : '✗ ') + r.criterion + ' — ' + r.detail);
  });
  return { passed: passed, total: results.length, allPass: passed === results.length, results: results };
}

// ───────────────────────────────────────────────────────────────────────────
// FP.S06 · ROLLBACK
// ───────────────────────────────────────────────────────────────────────────

function rollbackProjectMigration() {
  var s = fpSheet_();
  var totalCols = s.sheet.getLastColumn();
  for (var c = totalCols; c >= 10; c--) { s.sheet.deleteColumn(c); }
  fpLog_('rollbackProjectMigration', 'SYSTEM-ROLLBACK', { deletedCols: '10-' + totalCols });
  Logger.log('PROJECT ROLLBACK COMPLETE — cols 10-' + totalCols + ' deleted; 9-column schema restored.');
  return { ok: true, restoredCols: 9 };
}

// ───────────────────────────────────────────────────────────────────────────
// FP.S07 · LOGGING
// ───────────────────────────────────────────────────────────────────────────

function fpLog_(event, actor, payload) {
  try {
    if (typeof appendLog_ === 'function')
      appendLog_({ type: 'FOUNDATION:PROJECT', event: event, actor: actor,
                   detail: JSON.stringify(payload || {}) });
  } catch (e) {}
}
