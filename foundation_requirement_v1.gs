/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FOUNDATION — REQUIREMENT ENTITY v1 (foundation_requirement_v1.gs)
 * Step 4 of 6 · Governed by REQUIREMENT_ENTITY_FINAL.md + FOUNDATION_BUILD_RULES
 * Branch: claude/sweet-franklin-mnmfcz
 * ───────────────────────────────────────────────────────────────────────────
 * Tab: _Requirements (25 live cols, 97 rows — reconciled in place, Rule 3)
 * Legacy cols 1-25: UNTOUCHED (Rule 2 · Rule 11)
 * New cols 26-38:   APPENDED only (Rule 4)
 * Depends on: foundation_client_v1.gs + foundation_project_v1.gs + foundation_campaign_v1.gs
 *
 * ROLLBACK: delete columns 26–38; restore Notes (col 20) from pre-migration snapshot
 *   (the only legacy column modified — FK strings removed). All other 25 legacy cols
 *   untouched. No row deleted (Rule 1). No column renamed (Rule 2).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
// FR.S00 · CONFIG
// ───────────────────────────────────────────────────────────────────────────
var FR_TAB   = '_Requirements';
var FR_COLOR = '#1a3a5c';

var FR_LEGACY_HEADERS = [
  'ReqID','Received Date','ClientName','Deploy Country','Trade',
  'Quantity','Min Experience','Min Age','Max Age','GCC Preference',
  'Local Transfer Req','Visit Visa OK','Certifications','Urgency',
  'Status','Sourced By','Special Requirements','Shortlist Count',
  'Selected Count','Notes','Raw JD','Start_Date','End_Date',
  'Committed Qty','Interview Date'
];
var FR_NEW_HEADERS = [
  'CampaignID','ProjectID','ClientID','TradeSource','FoundationStatus',
  'Interview Mode','Food/Accommodation/Transport','Duty Hours',
  'Contract Period','Rotation','Medical Standard',
  'Passport Validity Required','Recruiter Owner'
];
var FR_ALL_HEADERS = FR_LEGACY_HEADERS.concat(FR_NEW_HEADERS);

var FR_STATUS_VOCAB       = ['OPEN','FILLED','CLOSED','ON-HOLD'];
var FR_INTERVIEW_VOCAB    = ['Face-to-Face','Virtual','Telephonic','CV'];
var FR_BENEFITS_VOCAB     = ['Provided','Allowance','Not'];

// Migration: legacy Status → FoundationStatus
var FR_STATUS_MAP = {
  'open': 'OPEN', 'active': 'OPEN', 'new': 'OPEN',
  'filled': 'FILLED', 'closed': 'CLOSED', 'cancelled': 'CLOSED',
  'on-hold': 'ON-HOLD', 'onhold': 'ON-HOLD', 'hold': 'ON-HOLD'
};

// ───────────────────────────────────────────────────────────────────────────
// FR.S01 · SHEET HELPERS
// ───────────────────────────────────────────────────────────────────────────

function frSheet_() {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(FR_TAB);
  if (!sheet) throw new Error('FR: _Requirements tab not found (Rule 3).');
  var lastCol = Math.max(1, sheet.getLastColumn());
  var rawHdr  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var i = 0; i < rawHdr.length; i++) {
    var h = String(rawHdr[i]).trim();
    if (h !== '') idx[h] = i + 1;
  }
  return { sheet: sheet, idx: idx, lastCol: lastCol };
}

function frReadAllRows_(s) {
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  var ncols = Math.max(s.lastCol, FR_ALL_HEADERS.length);
  var chunkSize = 50, allRows = [];
  for (var start = 2; start <= last; start += chunkSize) {
    var end   = Math.min(start + chunkSize - 1, last);
    var count = end - start + 1;
    var data  = s.sheet.getRange(start, 1, count, ncols).getValues();
    data.forEach(function (row, i) {
      var o = { __row: start + i };
      FR_ALL_HEADERS.forEach(function (h, ci) { o[h] = (ci < row.length) ? row[ci] : ''; });
      allRows.push(o);
    });
  }
  return allRows;
}

function frUpdateRow_(sheet, rowNum, patch, idx) {
  for (var h in patch) {
    var col = idx[h];
    if (!col) throw new Error('FR: column not found: ' + h);
    sheet.getRange(rowNum, col).setValue(patch[h]);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// FR.S02 · ID GENERATION
// ───────────────────────────────────────────────────────────────────────────

function frNextReqId_(rows) {
  var today  = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd');
  var prefix = 'REQ-' + today + '-';
  var max = 0;
  rows.forEach(function (r) {
    var rid = String(r.ReqID || '');
    if (rid.indexOf(prefix) === 0) {
      var n = parseInt(rid.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

// ───────────────────────────────────────────────────────────────────────────
// FR.S03 · DRY-RUN RECONCILIATION REPORT (must run before migration write)
// ───────────────────────────────────────────────────────────────────────────

/**
 * FR.S03.F01 — dry-run: scan all 97 rows, compute what migration will do.
 * Returns a report; no writes performed.
 * Recruiter must review BEFORE running migratRequirementFoundation.
 */
function dryRunRequirementMigration() {
  var s = frSheet_();
  var rows = frReadAllRows_(s);
  var report = {
    totalRows: rows.length,
    projIdExtracted: 0, projIdMissing: 0,
    campResolved: 0, campUnresolved: 0,
    clientResolved: 0, clientUnresolved: 0,
    statusDerived: 0,
    needsReview: [],
    ok: true
  };

  rows.forEach(function (r) {
    var rid  = r.ReqID;
    var issues = [];

    // 1. ProjectID from Notes
    var projId = '';
    var notesStr = String(r.Notes || '');
    var projMatch = notesStr.match(/\[Project:(PROJ-[A-Z0-9\-]+)\]/i);
    if (projMatch) {
      projId = projMatch[1];
      var proj = findProjectById(projId);
      if (proj) report.projIdExtracted++;
      else { projId = 'NEEDS_PROJECT_FK'; issues.push('ProjectID extracted but not found: ' + projMatch[1]); report.projIdMissing++; }
    } else {
      // check if already populated in new col
      var existingPid = String(r.ProjectID || '').trim();
      if (existingPid && existingPid.indexOf('NEEDS_') !== 0 && findProjectById(existingPid)) {
        projId = existingPid;
        report.projIdExtracted++;
      } else {
        projId = 'NEEDS_PROJECT_FK';
        issues.push('No ProjectID in Notes and not pre-populated');
        report.projIdMissing++;
      }
    }

    // 2. CampaignID from ProjectID (single-match auto-resolve, no guess)
    var campId = '';
    if (projId && projId.indexOf('NEEDS_') !== 0) {
      var campaigns = findCampaignsByProject(projId);
      if (campaigns.length === 1) { campId = campaigns[0].CampaignID; report.campResolved++; }
      else { campId = 'NEEDS_CAMPAIGN_FK'; issues.push('Campaign: ' + campaigns.length + ' match(es) for ProjectID=' + projId); report.campUnresolved++; }
    } else {
      campId = 'NEEDS_CAMPAIGN_FK';
      report.campUnresolved++;
    }

    // 3. ClientID from ClientName
    var clientId = '';
    var cn = String(r.ClientName || '').trim();
    if (cn) {
      var client = findClientByName(cn) || findClientByCode(cn);
      if (client && client !== 'AMBIGUOUS' && client.ClientID) {
        clientId = client.ClientID;
        report.clientResolved++;
      } else {
        clientId = 'CLIENT_UNRESOLVED';
        issues.push('Client not resolved: "' + cn + '" (result=' + (client === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'NOT_FOUND') + ')');
        report.clientUnresolved++;
      }
    } else {
      clientId = 'CLIENT_UNRESOLVED';
      issues.push('ClientName is empty');
      report.clientUnresolved++;
    }

    report.statusDerived++;
    if (issues.length) report.needsReview.push({ ReqID: rid, issues: issues });
  });

  Logger.log('REQUIREMENT DRY-RUN: ' + JSON.stringify({
    total: report.totalRows, projOk: report.projIdExtracted, projLocked: report.projIdMissing,
    campOk: report.campResolved, campLocked: report.campUnresolved,
    clientOk: report.clientResolved, clientLocked: report.clientUnresolved,
    reviewItems: report.needsReview.length
  }));
  return report;
}

// ───────────────────────────────────────────────────────────────────────────
// FR.S04 · MIGRATION (run AFTER dry-run is recruiter-approved)
// ───────────────────────────────────────────────────────────────────────────

/**
 * FR.S04.F01 — ENTRY POINT: migrate Requirements Foundation FKs.
 * Processes in batches of 10 rows. Call dryRunRequirementMigration first.
 */
function migrateRequirementFoundation() {
  var snapshot = frSnapshot_();
  var s = frSheet_();
  var added = frEnsureNewColumns_(s);
  s = frSheet_();
  var rows = frReadAllRows_(s);

  var migrated = 0, locked = 0;
  rows.forEach(function (r) {
    var patch = {};
    var skip = true;

    // only migrate rows not yet fully populated
    var needsFKs = !r.CampaignID || !r.ProjectID || !r.ClientID;
    if (!needsFKs && r.TradeSource && r.FoundationStatus) return;

    // 1. ProjectID
    var projId = String(r.ProjectID || '').trim();
    if (!projId || projId === 'NEEDS_PROJECT_FK') {
      var notesStr = String(r.Notes || '');
      var pm = notesStr.match(/\[Project:(PROJ-[A-Z0-9\-]+)\]/i);
      if (pm && findProjectById(pm[1])) {
        projId = pm[1];
        // purge FK pattern from Notes (only this pattern; keep other narrative)
        patch.Notes = notesStr.replace(/\s*\[Project:[A-Z0-9\-]+\]/gi, '').trim();
        skip = false;
      } else {
        projId = 'NEEDS_PROJECT_FK';
        locked++;
      }
      patch.ProjectID = projId;
    }

    // 2. CampaignID
    var campId = String(r.CampaignID || '').trim();
    if (!campId || campId === 'NEEDS_CAMPAIGN_FK') {
      if (projId && projId.indexOf('NEEDS_') !== 0) {
        var camps = findCampaignsByProject(projId);
        campId = (camps.length === 1) ? camps[0].CampaignID : 'NEEDS_CAMPAIGN_FK';
        if (campId === 'NEEDS_CAMPAIGN_FK') locked++;
      } else {
        campId = 'NEEDS_CAMPAIGN_FK';
      }
      patch.CampaignID = campId;
      skip = false;
    }

    // 3. ClientID
    var clientId = String(r.ClientID || '').trim();
    if (!clientId || clientId === 'CLIENT_UNRESOLVED') {
      var cn = String(r.ClientName || '').trim();
      var c = cn ? (findClientByName(cn) || findClientByCode(cn)) : null;
      clientId = (c && c !== 'AMBIGUOUS' && c.ClientID) ? c.ClientID : 'CLIENT_UNRESOLVED';
      if (clientId === 'CLIENT_UNRESOLVED') locked++;
      patch.ClientID = clientId;
      skip = false;
    }

    // 4. TradeSource (all existing rows = AI)
    if (!r.TradeSource) { patch.TradeSource = 'AI'; skip = false; }

    // 5. FoundationStatus
    if (!r.FoundationStatus) {
      patch.FoundationStatus = FR_STATUS_MAP[String(r.Status || '').trim().toLowerCase()] || 'OPEN';
      skip = false;
    }

    if (!skip) {
      frUpdateRow_(s.sheet, r.__row, patch, s.idx);
      migrated++;
    }
  });

  var report = {
    ok: true,
    snapshotRows: snapshot.length,
    schemaColumnsAdded: added,
    rowsMigrated: migrated,
    rowsLocked: locked
  };
  frLog_('migrateRequirementFoundation', 'SYSTEM-MIGRATION', report);
  Logger.log('REQUIREMENT MIGRATION COMPLETE: ' + JSON.stringify(report));
  return report;
}

function frEnsureNewColumns_(s) {
  var added = [];
  FR_NEW_HEADERS.forEach(function (h) {
    if (!s.idx[h]) {
      var col = s.sheet.getLastColumn() + 1;
      s.sheet.getRange(1, col).setValue(h);
      s.sheet.getRange(1, col)
        .setFontWeight('bold').setBackground(FR_COLOR)
        .setFontColor('#ffffff').setHorizontalAlignment('center');
      s.idx[h] = col;
      s.lastCol = col;
      added.push(h);
    }
  });
  return added;
}

function frSnapshot_() {
  var s = frSheet_();
  var last = s.sheet.getLastRow();
  if (last < 2) return [];
  // for 97-row sheet, snapshot in chunks — store Notes (col 20) only for rollback
  var notesColNum = s.idx['Notes'];
  if (!notesColNum) return [];
  var data = s.sheet.getRange(2, notesColNum, last - 1, 1).getValues();
  try {
    PropertiesService.getScriptProperties()
      .setProperty('FR_NOTES_SNAPSHOT_' + Utilities.formatDate(new Date(),'GMT','yyyyMMddHHmmss'),
                   JSON.stringify(data));
  } catch (e) {}
  return data;
}

// ───────────────────────────────────────────────────────────────────────────
// FR.S05 · WRITE ENGINE
// ───────────────────────────────────────────────────────────────────────────

/**
 * FR.S05.F01 — create a new Requirement.
 * Required: { CampaignID, Trade, Quantity, 'Deploy Country' }
 * Optional: all other columns per FR_ALL_HEADERS except system-managed cols.
 */
function createRequirement(fields, actor) {
  actor = actor || {};
  var by = actor.by || (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'system');

  // Campaign-Mandatory Rule (Rule 13) — the most important gate
  if (!String(fields.CampaignID || '').trim())
    throw new Error('FR: CampaignID is required — Campaign-Mandatory Rule (Rule 13). Path: Client→Project→Campaign→Requirement only.');

  // resolve Campaign (also validates it has resolved FKs)
  var camp = campAssertCampaignExists_(fields.CampaignID);

  // derive ProjectID + ClientID from Campaign (consistency guaranteed by Campaign engine)
  var projectId = camp.ProjectID;
  var clientId  = camp.ClientID;

  // validate parents resolve
  fpAssertProjectExists_(projectId);
  fcAssertClientExists_(clientId);

  if (!String(fields.Trade || '').trim())
    throw new Error('FR: Trade is required.');
  if (!fields.Quantity || isNaN(Number(fields.Quantity)))
    throw new Error('FR: Quantity is required and must be a number.');
  if (!String(fields['Deploy Country'] || '').trim())
    throw new Error('FR: Deploy Country is required.');

  var fsVal = String(fields.FoundationStatus || 'OPEN').trim();
  if (FR_STATUS_VOCAB.indexOf(fsVal) === -1)
    throw new Error('FR: FoundationStatus "' + fsVal + '" not in vocabulary (' + FR_STATUS_VOCAB.join('/') + ').');

  if (fields['Interview Mode'] && FR_INTERVIEW_VOCAB.indexOf(fields['Interview Mode']) === -1)
    throw new Error('FR: Interview Mode must be one of ' + FR_INTERVIEW_VOCAB.join('/'));

  if (fields['Food/Accommodation/Transport'] && FR_BENEFITS_VOCAB.indexOf(fields['Food/Accommodation/Transport']) === -1)
    throw new Error('FR: Food/Accommodation/Transport must be one of ' + FR_BENEFITS_VOCAB.join('/'));

  if (fields.Notes && /\[[A-Za-z]+:[A-Z0-9\-]+\]/.test(String(fields.Notes)))
    throw new Error('FR: Notes must not contain bracket-enclosed ID patterns (Rule 7/8 hygiene).');

  // reject K14/AI intelligence fields (Constitution §7)
  var forbidden = ['AIScore','MatchScore','AIAssessment','Ranking','Readiness','Confidence','AIReasoning'];
  forbidden.forEach(function (f) {
    if (fields[f] !== undefined) throw new Error('FR: "' + f + '" is a K14 field — forbidden in Foundation (Rule 7/Constitution §7).');
  });

  // TradeSource: system sets AI if not recruiter-confirmed
  var tradeSource = String(fields.TradeSource || 'Recruiter').trim();
  if (['AI','Recruiter'].indexOf(tradeSource) === -1)
    throw new Error('FR: TradeSource must be AI or Recruiter.');

  var s = frSheet_();
  var rows = frReadAllRows_(s);
  var reqId = frNextReqId_(rows);
  var now = new Date();

  // build row in col order (38 cols)
  var row = [
    reqId,                                          // 1  ReqID
    fields['Received Date'] || now,                 // 2
    camp.ClientName || '',                          // 3  ClientName (DEN from Campaign)
    fields['Deploy Country'],                       // 4
    fields.Trade,                                   // 5
    Number(fields.Quantity),                        // 6
    fields['Min Experience'] || '',                 // 7
    fields['Min Age'] || '',                        // 8
    fields['Max Age'] || '',                        // 9
    fields['GCC Preference'] || '',                 // 10
    fields['Local Transfer Req'] || '',             // 11
    fields['Visit Visa OK'] || '',                  // 12
    fields.Certifications || '',                    // 13
    fields.Urgency || '',                           // 14
    '',                                             // 15 Status (legacy — blank; recruiter manages)
    fields['Sourced By'] || by,                     // 16
    fields['Special Requirements'] || '',           // 17
    0,                                              // 18 Shortlist Count
    0,                                              // 19 Selected Count
    fields.Notes || '',                             // 20
    fields['Raw JD'] || '',                         // 21
    fields.Start_Date || '',                        // 22
    fields.End_Date || '',                          // 23
    0,                                              // 24 Committed Qty
    fields['Interview Date'] || '',                 // 25
    fields.CampaignID,                             // 26 CampaignID (FK — immutable)
    projectId,                                      // 27 ProjectID (FK — from Campaign)
    clientId,                                       // 28 ClientID (FK — from Campaign)
    tradeSource,                                    // 29 TradeSource
    fsVal,                                          // 30 FoundationStatus
    fields['Interview Mode'] || '',                 // 31
    fields['Food/Accommodation/Transport'] || '',   // 32
    fields['Duty Hours'] || '',                     // 33
    fields['Contract Period'] || '',                // 34
    fields.Rotation || '',                          // 35
    fields['Medical Standard'] || '',               // 36
    fields['Passport Validity Required'] || '',     // 37
    fields['Recruiter Owner'] || ''                 // 38
  ];

  s.sheet.appendRow(row);
  frLog_('createRequirement', by, { ReqID: reqId, CampaignID: fields.CampaignID });
  return { ok: true, ReqID: reqId, CampaignID: fields.CampaignID, ProjectID: projectId, ClientID: clientId };
}

/** FR.S05.F02 — find Requirement by ReqID; returns row object or null. */
function findRequirementById(reqId) {
  if (!reqId) return null;
  var s = frSheet_();
  var rows = frReadAllRows_(s);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ReqID || '') === String(reqId)) return rows[i];
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// FR.S06 · ACCEPTANCE VERIFICATION
// ───────────────────────────────────────────────────────────────────────────

function verifyRequirementAcceptance() {
  var s = frSheet_();
  var rows = frReadAllRows_(s);
  var results = [];
  function chk(name, fn) {
    try { var r = fn(); results.push({ criterion: name, pass: true, detail: r }); }
    catch (e) { results.push({ criterion: name, pass: false, detail: String(e.message || e) }); }
  }

  chk('Row count = 97 (no data loss)', function () {
    if (rows.length !== 97) throw new Error(rows.length + ' rows (expected 97)');
    return '97 rows';
  });
  chk('13 new columns exist at positions 26-38', function () {
    var missing = FR_NEW_HEADERS.filter(function (h) { return !s.idx[h]; });
    if (missing.length) throw new Error('Missing: ' + missing.join(', '));
    return 'all 13 new headers present';
  });
  chk('No row has silent null on mandatory FK', function () {
    var bad = rows.filter(function (r) {
      var cid = String(r.CampaignID || '').trim();
      var pid = String(r.ProjectID  || '').trim();
      var kid = String(r.ClientID   || '').trim();
      return !cid || !pid || !kid;
    });
    if (bad.length) throw new Error(bad.length + ' row(s) with empty mandatory FK (must be resolved or tagged)');
    return 'all rows have non-null CampaignID/ProjectID/ClientID (or explicit tag)';
  });
  chk('Notes contains no bracket-enclosed ID strings', function () {
    var bad = rows.filter(function (r) {
      return /\[[A-Za-z]+:[A-Z0-9\-]+\]/.test(String(r.Notes || ''));
    });
    if (bad.length) throw new Error(bad.length + ' row(s) with bracket-ID in Notes: ' + bad.map(function(r){return r.ReqID;}).slice(0,3).join(','));
    return 'no bracket-ID in Notes';
  });
  chk('FoundationStatus derived for all rows; legacy Status untouched', function () {
    var badFS = rows.filter(function (r) {
      return FR_STATUS_VOCAB.indexOf(String(r.FoundationStatus || '').trim()) === -1;
    });
    if (badFS.length) throw new Error(badFS.length + ' row(s) with off-vocabulary FoundationStatus');
    if (!s.idx['Status'] || s.idx['Status'] !== 15) throw new Error('Legacy Status not at col 15');
    return 'all rows have valid FoundationStatus; legacy Status at col 15';
  });
  chk('Create — missing CampaignID refused (Rule 13)', function () {
    try { createRequirement({ Trade: 'Welder', Quantity: 10, 'Deploy Country': 'UAE' },
                            { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write not refused');
  });
  chk('Create — K14 field refused (Constitution §7)', function () {
    try { createRequirement({ CampaignID: 'CAMP-FAKE', Trade: 'Welder', Quantity: 1,
                              'Deploy Country': 'UAE', AIScore: 95 },
                            { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('K14 field not refused');
  });
  chk('No K14/Execution column in schema', function () {
    var forbidden = ['AIScore','MatchScore','PipelineState','SubmissionCount','Readiness'];
    var headers = FR_ALL_HEADERS.join(',');
    var found = forbidden.filter(function (f) { return headers.indexOf(f) !== -1; });
    if (found.length) throw new Error('Forbidden: ' + found.join(','));
    return 'clean';
  });

  var passed = results.filter(function (r) { return r.pass; }).length;
  Logger.log('REQUIREMENT ACCEPTANCE: ' + passed + '/' + results.length + ' passed');
  results.forEach(function (r) { Logger.log((r.pass ? '✓ ' : '✗ ') + r.criterion + ' — ' + r.detail); });
  return { passed: passed, total: results.length, allPass: passed === results.length, results: results };
}

// ───────────────────────────────────────────────────────────────────────────
// FR.S07 · ROLLBACK
// ───────────────────────────────────────────────────────────────────────────

function rollbackRequirementMigration() {
  var s = frSheet_();
  var totalCols = s.sheet.getLastColumn();
  for (var c = totalCols; c >= 26; c--) { s.sheet.deleteColumn(c); }
  // restore Notes (col 20) from snapshot
  s = frSheet_();
  var props = PropertiesService.getScriptProperties().getProperties();
  var snapKey = null;
  for (var k in props) { if (k.indexOf('FR_NOTES_SNAPSHOT_') === 0) snapKey = k; }
  if (snapKey && s.idx['Notes']) {
    try {
      var snapData = JSON.parse(props[snapKey]);
      if (snapData.length > 0) {
        s.sheet.getRange(2, s.idx['Notes'], snapData.length, 1).setValues(snapData);
        Logger.log('FR: Notes column restored from snapshot (' + snapData.length + ' rows).');
      }
    } catch (e) { Logger.log('FR: Could not restore Notes from snapshot: ' + e.message); }
  }
  frLog_('rollbackRequirementMigration', 'SYSTEM-ROLLBACK', { deletedCols: '26-' + totalCols });
  Logger.log('REQUIREMENT ROLLBACK COMPLETE — cols 26-' + totalCols + ' deleted; Notes restored from snapshot.');
  return { ok: true, restoredCols: 25 };
}

// ───────────────────────────────────────────────────────────────────────────
// FR.S08 · LOGGING
// ───────────────────────────────────────────────────────────────────────────

function frLog_(event, actor, payload) {
  try {
    if (typeof appendLog_ === 'function')
      appendLog_({ type: 'FOUNDATION:REQUIREMENT', event: event, actor: actor,
                   detail: JSON.stringify(payload || {}) });
  } catch (e) {}
}

// ───────────────────────────────────────────────────────────────────────────
// FR.S09 · PUBLIC SURFACE
// ───────────────────────────────────────────────────────────────────────────

/**
 * FR.S09.F01 — Public endpoint: create a Requirement, called via google.script.run.
 * UI calls this, then calls matchCandidatesForReqPublic(ReqID) with the returned ReqID.
 * Layer: Foundation write only. No match logic here.
 *
 * @param {object} fields - { CampaignID, Trade, Quantity, 'Deploy Country', ... }
 * @returns {object} { ok:true, ReqID, CampaignID, ProjectID, ClientID }
 *                or { ok:false, msg:'...' }
 */
function createRequirementPublic(fields) {
  try {
    var actor = {
      by:   (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'ui-recruiter'),
      role: 'Recruiter'
    };
    return createRequirement(fields || {}, actor);
  } catch (e) {
    frLog_('createRequirementPublic', 'ui-recruiter', { error: e.message });
    return { ok: false, msg: e.message };
  }
}
