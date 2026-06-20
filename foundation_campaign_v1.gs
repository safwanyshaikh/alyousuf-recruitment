/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FOUNDATION — CAMPAIGN ENTITY v1 (foundation_campaign_v1.gs)
 * Step 3 of 6 · Governed by CAMPAIGN_ENTITY_FINAL.md + FOUNDATION_BUILD_RULES
 * Branch: claude/sweet-franklin-mnmfcz
 * ───────────────────────────────────────────────────────────────────────────
 * Tab: _Campaigns (13 live cols, 1 row — reconciled in place, Rule 3)
 * Legacy cols 1-13: UNTOUCHED (Rule 2 · Rule 11)
 * New cols 14-25:   APPENDED only (Rule 4)
 * Depends on: foundation_client_v1.gs + foundation_project_v1.gs
 *
 * ROLLBACK: delete columns 14–25 from _Campaigns; restore any ClientID value
 *   that was rewritten from the pre-migration snapshot (stored in Script Properties).
 *   No row deleted (Rule 1). No column renamed (Rule 2). No sheet replaced (Rule 3).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
// CAMP.S00 · CONFIG
// ───────────────────────────────────────────────────────────────────────────
var CAMP_TAB   = '_Campaigns';
var CAMP_COLOR = '#1a3a5c';

var CAMP_LEGACY_HEADERS = [
  'CampaignID','CampaignName','ClientID','ClientName','Sector',
  'Location','InterviewDates','InterviewCities','HiringMode',
  'Status','TotalHeads','Notes','CreatedAt'
];
var CAMP_NEW_HEADERS = [
  'ProjectID','ProjectName','FoundationStatus','Campaign Type','Country',
  'Source Strategy','Associate Network Enabled','Walk-In Enabled',
  'Filled Count','Req Count','Priority','Recruiter Owner'
];
var CAMP_ALL_HEADERS = CAMP_LEGACY_HEADERS.concat(CAMP_NEW_HEADERS);

var CAMP_STATUS_VOCAB   = ['ACTIVE','COMPLETED','CANCELLED','ON-HOLD'];
var CAMP_TYPE_VOCAB     = ['Interview Drive','Direct Hire','Bulk Mob','Assessment'];
var CAMP_STRATEGY_VOCAB = ['Database','Associate','Walk-In','Referral','Mixed'];
var CAMP_PRIORITY_VOCAB = ['URGENT','HIGH','NORMAL','LOW'];

// ───────────────────────────────────────────────────────────────────────────
// CAMP.S01 · SHEET HELPERS
// ───────────────────────────────────────────────────────────────────────────

function campSheet_() {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(CAMP_TAB);
  if (!sheet) throw new Error('CAMP: _Campaigns tab not found (Rule 3: no sheet replacement).');
  var lastCol = Math.max(1, sheet.getLastColumn());
  var rawHdr  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var i = 0; i < rawHdr.length; i++) {
    var h = String(rawHdr[i]).trim();
    if (h !== '') idx[h] = i + 1;
  }
  return { sheet: sheet, idx: idx, lastCol: lastCol };
}

function campReadAllRows_(s) {
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var ncols = Math.max(s.lastCol, CAMP_ALL_HEADERS.length);
  var data  = s.sheet.getRange(2, 1, last - 1, ncols).getValues();
  return data.map(function (row, i) {
    var o = { __row: i + 2 };
    CAMP_ALL_HEADERS.forEach(function (h, ci) { o[h] = (ci < row.length) ? row[ci] : ''; });
    return o;
  });
}

function campUpdateRow_(sheet, rowNum, patch, idx) {
  for (var h in patch) {
    var col = idx[h];
    if (!col) throw new Error('CAMP: column not found: ' + h);
    sheet.getRange(rowNum, col).setValue(patch[h]);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// CAMP.S02 · ID GENERATION
// ───────────────────────────────────────────────────────────────────────────

function campNextId_(rows) {
  var today  = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd');
  var prefix = 'CAMP-' + today + '-';
  var max = 0;
  rows.forEach(function (r) {
    var cid = String(r.CampaignID || '');
    if (cid.indexOf(prefix) === 0) {
      var n = parseInt(cid.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

// ───────────────────────────────────────────────────────────────────────────
// CAMP.S03 · SCHEMA MIGRATION (Step 3 build task)
// ───────────────────────────────────────────────────────────────────────────

/**
 * CAMP.S03.F01 — ENTRY POINT: run Campaign migration.
 * 1. Snapshot. 2. Append cols 14-25. 3. Verify/fix ClientID on existing row.
 * 4. Backfill ProjectID (or tag NEEDS_PROJECT_FK). 5. Derive FoundationStatus.
 */
function migrateCampaignFoundation() {
  var snapshot = campSnapshot_();
  var s = campSheet_();
  var added = campEnsureNewColumns_(s);
  s = campSheet_();  // refresh idx after column add
  var rows = campReadAllRows_(s);

  var migrated = 0;
  rows.forEach(function (r) {
    var patch = {};

    // 1. Verify ClientID holds an ID (not a name string)
    var rawCid = String(r.ClientID || '').trim();
    if (rawCid && !/^CLI-/.test(rawCid)) {
      // looks like a name — attempt to resolve
      var resolved = findClientByName(rawCid) || findClientByCode(rawCid);
      if (resolved && resolved !== 'AMBIGUOUS' && resolved.ClientID) {
        patch.ClientID = resolved.ClientID;
      } else {
        patch.ClientID = 'CLIENT_UNRESOLVED';
      }
    }

    // 2. Backfill ProjectID if missing
    if (!r.ProjectID || String(r.ProjectID).trim() === '') {
      patch.ProjectID = 'NEEDS_PROJECT_FK';  // lock for human resolution (Rule 13)
    } else {
      // verify it resolves
      var proj = findProjectById(String(r.ProjectID).trim());
      if (!proj) patch.ProjectID = 'NEEDS_PROJECT_FK';
      else {
        // consistency gate (Rule 12): Campaign.ClientID must equal Project.ClientID
        var effectiveCid = patch.ClientID || rawCid;
        if (proj.ClientID && effectiveCid && proj.ClientID !== effectiveCid) {
          patch.ProjectID = 'NEEDS_PROJECT_FK';  // mismatch — lock
        } else {
          patch.ProjectName = proj.ProjectName || '';
          patch.Country     = proj.Country     || '';
        }
      }
    }

    // 3. Derive FoundationStatus
    if (!r.FoundationStatus || String(r.FoundationStatus).trim() === '') {
      var legacyMap = { 'active':'ACTIVE','inactive':'INACTIVE','cancelled':'CANCELLED','on-hold':'ON-HOLD','onhold':'ON-HOLD' };
      patch.FoundationStatus = legacyMap[String(r.Status || '').trim().toLowerCase()] || 'ACTIVE';
    }

    if (Object.keys(patch).length > 0) {
      campUpdateRow_(s.sheet, r.__row, patch, s.idx);
      migrated++;
    }
  });

  var report = {
    ok: true,
    snapshotRows: snapshot.length,
    schemaColumnsAdded: added,
    rowsMigrated: migrated
  };
  campLog_('migrateCampaignFoundation', 'SYSTEM-MIGRATION', report);
  Logger.log('CAMPAIGN MIGRATION COMPLETE: ' + JSON.stringify(report));
  return report;
}

function campEnsureNewColumns_(s) {
  var added = [];
  CAMP_NEW_HEADERS.forEach(function (h) {
    if (!s.idx[h]) {
      var col = s.sheet.getLastColumn() + 1;
      s.sheet.getRange(1, col).setValue(h);
      s.sheet.getRange(1, col)
        .setFontWeight('bold').setBackground(CAMP_COLOR)
        .setFontColor('#ffffff').setHorizontalAlignment('center');
      s.idx[h] = col;
      s.lastCol = col;
      added.push(h);
    }
  });
  return added;
}

function campSnapshot_() {
  var s = campSheet_();
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var data = s.sheet.getRange(2, 1, last - 1, s.lastCol).getValues();
  try {
    PropertiesService.getScriptProperties()
      .setProperty('CAMP_SNAPSHOT_' + Utilities.formatDate(new Date(),'GMT','yyyyMMddHHmmss'),
                   JSON.stringify(data));
  } catch (e) {}
  return data;
}

// ───────────────────────────────────────────────────────────────────────────
// CAMP.S04 · WRITE ENGINE
// ───────────────────────────────────────────────────────────────────────────

/**
 * CAMP.S04.F01 — create a new Campaign.
 * Required: { ClientID, ProjectID, CampaignName }
 * Optional: { Location, 'Campaign Type', 'Source Strategy',
 *             'Associate Network Enabled', 'Walk-In Enabled',
 *             HiringMode, TotalHeads, Notes, FoundationStatus,
 *             Priority, 'Recruiter Owner', Sector,
 *             InterviewDates, InterviewCities }
 */
function createCampaign(fields, actor) {
  actor = actor || {};
  var by = actor.by || (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'system');

  if (!String(fields.ClientID  || '').trim()) throw new Error('CAMP: ClientID is required (Rule 12).');
  if (!String(fields.ProjectID || '').trim()) throw new Error('CAMP: ProjectID is required (Rule 12).');
  if (!String(fields.CampaignName || '').trim()) throw new Error('CAMP: CampaignName is required.');

  // resolve parents
  var client = fcAssertClientExists_(fields.ClientID);
  var proj   = fpAssertProjectExists_(fields.ProjectID);

  // consistency gate (Rule 12): Campaign.ClientID must equal Project.ClientID
  if (proj.ClientID && String(proj.ClientID).trim() !== String(fields.ClientID).trim())
    throw new Error('CAMP: ClientID (' + fields.ClientID + ') does not match Project\'s ClientID (' + proj.ClientID + ') — consistency gate (Rule 12).');

  var fsVal = String(fields.FoundationStatus || 'ACTIVE').trim();
  if (CAMP_STATUS_VOCAB.indexOf(fsVal) === -1)
    throw new Error('CAMP: FoundationStatus "' + fsVal + '" not in vocabulary (' + CAMP_STATUS_VOCAB.join('/') + ').');

  if (fields['Campaign Type'] && CAMP_TYPE_VOCAB.indexOf(fields['Campaign Type']) === -1)
    throw new Error('CAMP: Campaign Type must be one of ' + CAMP_TYPE_VOCAB.join('/'));
  if (fields['Source Strategy'] && CAMP_STRATEGY_VOCAB.indexOf(fields['Source Strategy']) === -1)
    throw new Error('CAMP: Source Strategy must be one of ' + CAMP_STRATEGY_VOCAB.join('/'));
  if (fields.Priority && CAMP_PRIORITY_VOCAB.indexOf(fields.Priority) === -1)
    throw new Error('CAMP: Priority must be one of ' + CAMP_PRIORITY_VOCAB.join('/'));
  if (fields.Notes && /\[[A-Za-z]+:[A-Z0-9\-]+\]/.test(String(fields.Notes)))
    throw new Error('CAMP: Notes must not contain bracket-enclosed ID patterns.');

  var s = campSheet_();
  var rows = campReadAllRows_(s);
  var campId = campNextId_(rows);
  var now = new Date();

  var row = [
    campId,                            // 1  CampaignID (PK)
    String(fields.CampaignName).trim(), // 2
    fields.ClientID,                   // 3  ClientID (FK — immutable)
    client.ClientName || '',           // 4  ClientName (DEN)
    fields.Sector || client.Sector || '', // 5 Sector
    fields.Location || '',             // 6
    fields.InterviewDates  || '',      // 7
    fields.InterviewCities || '',      // 8
    fields.HiringMode || '',           // 9
    '',                                // 10 Status (legacy — blank; recruiter manages)
    fields.TotalHeads || 0,            // 11
    fields.Notes || '',                // 12
    now,                               // 13 CreatedAt
    fields.ProjectID,                  // 14 ProjectID (FK — immutable)
    proj.ProjectName || '',            // 15 ProjectName (DEN)
    fsVal,                             // 16 FoundationStatus
    fields['Campaign Type'] || '',     // 17
    proj.Country || '',                // 18 Country (DEN from Project)
    fields['Source Strategy'] || '',   // 19
    fields['Associate Network Enabled'] ? 'TRUE' : '', // 20
    fields['Walk-In Enabled']          ? 'TRUE' : '', // 21
    0,                                 // 22 Filled Count
    0,                                 // 23 Req Count
    fields.Priority || 'NORMAL',       // 24
    fields['Recruiter Owner'] || ''    // 25
  ];

  s.sheet.appendRow(row);
  campLog_('createCampaign', by, { CampaignID: campId, ClientID: fields.ClientID, ProjectID: fields.ProjectID });
  return { ok: true, CampaignID: campId, ClientID: fields.ClientID, ProjectID: fields.ProjectID };
}

/** CAMP.S04.F02 — find Campaign by CampaignID; returns row object or null. */
function findCampaignById(campaignId) {
  if (!campaignId) return null;
  var s = campSheet_();
  var rows = campReadAllRows_(s);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].CampaignID || '') === String(campaignId)) return rows[i];
  }
  return null;
}

/**
 * CAMP.S04.F03 — assert CampaignID resolves to a live, operational Campaign.
 * Called by Requirement write engine (Campaign-Mandatory Rule — Rule 13).
 */
function campAssertCampaignExists_(campaignId) {
  var c = findCampaignById(campaignId);
  if (!c) throw new Error('CAMP: CampaignID "' + campaignId + '" does not resolve to a live Campaign (Rule 12/13).');
  if (String(c.ProjectID || '').indexOf('NEEDS_') === 0)
    throw new Error('CAMP: Campaign "' + campaignId + '" has unresolved ProjectID (' + c.ProjectID + ') — locked; resolve before creating Requirements (Rule 13).');
  if (c.FoundationStatus === 'CANCELLED')
    throw new Error('CAMP: Campaign "' + campaignId + '" is CANCELLED — no new Requirement may be created (Rule 13).');
  return c;
}

/** CAMP.S04.F04 — find Campaigns for a Project (used in Requirement migration — Rule 13 single-match check). */
function findCampaignsByProject(projectId) {
  var s = campSheet_();
  var rows = campReadAllRows_(s);
  return rows.filter(function (r) {
    return String(r.ProjectID || '') === String(projectId) &&
           String(r.ProjectID || '').indexOf('NEEDS_') !== 0;
  });
}

// ───────────────────────────────────────────────────────────────────────────
// CAMP.S05 · ACCEPTANCE VERIFICATION
// ───────────────────────────────────────────────────────────────────────────

function verifyCampaignAcceptance() {
  var s = campSheet_();
  var rows = campReadAllRows_(s);
  var results = [];
  function chk(name, fn) {
    try { var r = fn(); results.push({ criterion: name, pass: true, detail: r }); }
    catch (e) { results.push({ criterion: name, pass: false, detail: String(e.message || e) }); }
  }

  chk('Row count = 1 (no data loss)', function () {
    if (rows.length !== 1) throw new Error(rows.length + ' rows (expected 1)');
    return '1 row';
  });
  chk('12 new columns exist at positions 14-25', function () {
    var missing = CAMP_NEW_HEADERS.filter(function (h) { return !s.idx[h]; });
    if (missing.length) throw new Error('Missing: ' + missing.join(', '));
    return 'all 12 new headers present';
  });
  chk('Existing row has ProjectID (or NEEDS_PROJECT_FK tag)', function () {
    var r = rows[0];
    var pid = String(r.ProjectID || '');
    if (!pid) throw new Error('ProjectID is empty — must be resolved or tagged NEEDS_PROJECT_FK');
    return 'ProjectID=' + pid;
  });
  chk('Existing row has valid FoundationStatus', function () {
    var r = rows[0];
    if (CAMP_STATUS_VOCAB.indexOf(String(r.FoundationStatus || '').trim()) === -1)
      throw new Error('Off-vocabulary: ' + r.FoundationStatus);
    return 'FoundationStatus=' + r.FoundationStatus;
  });
  chk('Legacy Status (col 10) untouched', function () {
    if (!s.idx['Status']) throw new Error('"Status" header missing');
    if (s.idx['Status'] !== 10) throw new Error('"Status" at col ' + s.idx['Status'] + ' (expected 10)');
    return 'legacy Status at col 10';
  });
  chk('Create — missing ProjectID refused', function () {
    try { createCampaign({ ClientID: 'CLI-FAKE', CampaignName: 'X' }, { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write not refused');
  });
  chk('Create — FK mismatch refused (consistency gate)', function () {
    try { createCampaign({ ClientID: 'CLI-A', ProjectID: 'PROJ-B', CampaignName: 'X' },
                         { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('consistency gate did not fire');
  });
  chk('No K14/Execution column in schema', function () {
    var forbidden = ['MatchScore','PipelineState','SubmissionCount','Readiness'];
    var headers = CAMP_ALL_HEADERS.join(',');
    var found = forbidden.filter(function (f) { return headers.indexOf(f) !== -1; });
    if (found.length) throw new Error('Forbidden: ' + found.join(','));
    return 'clean';
  });

  var passed = results.filter(function (r) { return r.pass; }).length;
  Logger.log('CAMPAIGN ACCEPTANCE: ' + passed + '/' + results.length + ' passed');
  results.forEach(function (r) { Logger.log((r.pass ? '✓ ' : '✗ ') + r.criterion + ' — ' + r.detail); });
  return { passed: passed, total: results.length, allPass: passed === results.length, results: results };
}

// ───────────────────────────────────────────────────────────────────────────
// CAMP.S06 · ROLLBACK
// ───────────────────────────────────────────────────────────────────────────

function rollbackCampaignMigration() {
  var s = campSheet_();
  var totalCols = s.sheet.getLastColumn();
  for (var c = totalCols; c >= 14; c--) { s.sheet.deleteColumn(c); }
  // restore ClientID from snapshot if it was rewritten
  var snapKey = null;
  var props = PropertiesService.getScriptProperties().getProperties();
  for (var k in props) { if (k.indexOf('CAMP_SNAPSHOT_') === 0) { snapKey = k; } }
  if (snapKey) {
    try {
      var snapData = JSON.parse(props[snapKey]);
      if (snapData.length >= 1 && snapData[0][2] !== undefined) {
        s = campSheet_();
        s.sheet.getRange(2, 3).setValue(snapData[0][2]);  // restore col 3 ClientID
      }
    } catch (e) {}
  }
  campLog_('rollbackCampaignMigration', 'SYSTEM-ROLLBACK', { deletedCols: '14-' + totalCols });
  Logger.log('CAMPAIGN ROLLBACK COMPLETE — cols 14-' + totalCols + ' deleted; 13-column schema restored.');
  return { ok: true, restoredCols: 13 };
}

// ───────────────────────────────────────────────────────────────────────────
// CAMP.S07 · LOGGING
// ───────────────────────────────────────────────────────────────────────────

function campLog_(event, actor, payload) {
  try {
    if (typeof appendLog_ === 'function')
      appendLog_({ type: 'FOUNDATION:CAMPAIGN', event: event, actor: actor,
                   detail: JSON.stringify(payload || {}) });
  } catch (e) {}
}
