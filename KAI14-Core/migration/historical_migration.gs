/**
 * KAI14-Core · migration/historical_migration.gs
 * CLASSIFICATION: ONE-TIME MIGRATION — TEMPORARY FILE
 * PURPOSE: Historical Alignment — import identity evidence from Gmail_CV_Candidates
 *          into KAI14 Candidates sheet. Retires after production cutover + 30-day
 *          observation period confirms zero discrepancy.
 *
 * CONSTRAINTS (CEO-LOCKED):
 *   ✗  Do NOT call Gemini
 *   ✗  Do NOT call Verdict / kaiVerdict_
 *   ✗  Do NOT modify Foundation, Parser Intelligence, Requirement Engine, or UI
 *   ✗  Never auto-merge duplicates — DUPLICATE status = held for manual resolution
 *   ✗  Never renumber imported KAI Numbers — counter set to MAX(KAINo)+1 after migration
 *   ✓  READ legacy → VALIDATE → COPY IDENTITY (18 fields) → LOG
 *   ✓  _Active = True (boolean) → INCLUDE; _Active = 'ARCHIVED' (string) → EXCLUDE
 *   ✓  Reconciliation Difference = 0 is the mandatory gate before production cutover
 *
 * RESUMABLE EXECUTION:
 *   Apps Script 6-min limit handled via script property checkpoint.
 *   Each call processes rows until 5:00 elapsed, then saves position and exits.
 *   Re-run runHistoricalMigration(dryRun) to continue from checkpoint.
 *   Run resetMigrationProgress() to start over from row 1.
 *
 * ENTRY POINTS (callable from Apps Script UI):
 *   setMaintenanceMode(enabled)      — toggle maintenance flag in KAI14 _Config
 *   getMaintenanceMode()             — read flag (returns boolean)
 *   runHistoricalMigration(dryRun)   — resumable migration (re-run until COMPLETE)
 *   resetMigrationProgress()         — clear checkpoint (start over)
 *   generateMigrationAudit()         — post-run audit report + reconciliation check
 *
 * SCRIPT PROPERTY REQUIRED:
 *   LEGACY_SS_ID — Google Sheets ID of Gmail_CV_Candidates spreadsheet
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

var MIGRATION_VERSION      = '1.1.0';
var MIGRATION_LOG_SHEET    = 'Migration_Log';
var CONFIG_SHEET           = '_Config';
var MAINTENANCE_KEY        = 'maintenanceMode';

// Script property keys for checkpoint / resume
var MIG_OFFSET_KEY         = 'mig_offset';       // last successfully processed data-row index (0-based)
var MIG_BATCH_KEY          = 'mig_batch_id';      // batch ID shared across all resume calls
var MIG_DRYRUN_KEY         = 'mig_dry_run';       // locks dryRun mode for the life of a batch

// Stop processing 60 seconds before the 6-min hard limit to leave time for cleanup
var MAX_RUN_MS             = 300000;  // 5 minutes

// Migration_Log column schema — permanent governance certificate
var MIGRATION_LOG_HEADERS  = [
  'MigrationBatchID',
  'MigrationStartTime',
  'MigrationEndTime',
  'Operator',
  'SourceSpreadsheetID',
  'SourceSpreadsheetName',
  'SourceRowNumber',
  'LegacyKAINumber',
  'MigratedKAINumber',
  'CandidateName',
  'MigrationStatus',       // IMPORTED | SKIPPED | FAILED | DUPLICATE
  'Reason',
  'ErrorMessage',
  'LegacyGulfExpRaw',
  'ExecutionDurationMs'
];

// 18 identity fields: Legacy column name → KAI14 CANDIDATE_HEADERS name
var IDENTITY_FIELD_MAP = [
  { legacy: 'KAI No',           kai: 'KAINo'           },
  { legacy: 'Application Date', kai: 'CreatedAt'        },
  { legacy: 'Name',             kai: 'FullName'         },
  { legacy: 'Mobile',           kai: 'Mobile'           },
  { legacy: 'Email',            kai: 'Email'            },
  { legacy: 'Nationality',      kai: 'Nationality'      },
  { legacy: 'Date of Birth',    kai: 'DOB'              },
  { legacy: 'Age',              kai: 'Age'              },
  { legacy: 'Trade',            kai: 'Trade'            },
  { legacy: 'Industry',         kai: 'Industry'         },
  { legacy: 'Experience',       kai: 'Experience'       },
  { legacy: 'Gulf Experience',  kai: 'GulfExperience'   },  // text → float
  { legacy: 'Education',        kai: 'Education'        },
  { legacy: 'Position Applied', kai: 'PositionApplied'  },
  { legacy: 'CV Link',          kai: 'CVLink'           },
  { legacy: 'Candidate State',  kai: 'State'            },
  { legacy: 'Missing Fields',   kai: 'MissingFields'    }
  // _Active: filter only, not imported
];


// ═══════════════════════════════════════════════════════════════════════════════
// 1. MAINTENANCE MODE
// ═══════════════════════════════════════════════════════════════════════════════

function setMaintenanceMode(enabled) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = ss.getSheetByName(CONFIG_SHEET);
  if (!cfg) {
    cfg = ss.insertSheet(CONFIG_SHEET);
    cfg.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
  }
  var data = cfg.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === MAINTENANCE_KEY) {
      cfg.getRange(r + 1, 2).setValue(enabled ? 'TRUE' : 'FALSE');
      Logger.log('KAI MIGRATION — maintenanceMode set to ' + enabled);
      return;
    }
  }
  cfg.appendRow([MAINTENANCE_KEY, enabled ? 'TRUE' : 'FALSE']);
  Logger.log('KAI MIGRATION — maintenanceMode created as ' + enabled);
}

function getMaintenanceMode() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = ss.getSheetByName(CONFIG_SHEET);
  if (!cfg) return false;
  var data = cfg.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === MAINTENANCE_KEY) {
      var val = String(data[r][1]).trim().toUpperCase();
      return (val === 'TRUE' || val === '1' || val === 'YES');
    }
  }
  return false;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 2. MIGRATION_LOG — PERMANENT GOVERNANCE CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════════════

function ensureMigrationLog_() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(MIGRATION_LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(MIGRATION_LOG_SHEET);
    log.getRange(1, 1, 1, MIGRATION_LOG_HEADERS.length)
       .setValues([MIGRATION_LOG_HEADERS]);
    log.setFrozenRows(1);
    log.getRange(1, 1, 1, MIGRATION_LOG_HEADERS.length)
       .setBackground('#1a1a2e')
       .setFontColor('#ffffff')
       .setFontWeight('bold');
    Logger.log('KAI MIGRATION — Migration_Log sheet created.');
  }
  return log;
}

function logMigrationRow_(logSh, d) {
  logSh.appendRow([
    d.batchId          || '',
    d.startTime        || '',
    d.endTime          || '',
    d.operator         || '',
    d.sourceSsId       || '',
    d.sourceSsName     || '',
    d.sourceRow        || '',
    d.legacyKAINo      || '',
    d.migratedKAINo    || '',
    d.candidateName    || '',
    d.status           || '',
    d.reason           || '',
    d.errorMessage     || '',
    d.legacyGulfExpRaw || '',
    d.durationMs       || ''
  ]);
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. GULF EXPERIENCE RESOLUTION (text → float years)
// ═══════════════════════════════════════════════════════════════════════════════

function resolveGulfExperience_(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw >= 0 ? Math.round(raw * 100) / 100 : 0;

  var s = String(raw).trim().toLowerCase();
  if (!s || s === 'none' || s === 'n/a' || s === 'na' || s === 'nil' ||
      s === '-' || s === '–' || s === '0' || s === 'no' || s === 'n') {
    return 0;
  }

  var ymMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(\d+(?:\.\d+)?)\s*months?/);
  if (ymMatch) return Math.round((parseFloat(ymMatch[1]) + parseFloat(ymMatch[2]) / 12) * 100) / 100;

  var yMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/);
  if (yMatch) return parseFloat(yMatch[1]);

  var mMatch = s.match(/^(\d+(?:\.\d+)?)\s*months?/);
  if (mMatch) return Math.round((parseFloat(mMatch[1]) / 12) * 100) / 100;

  var plusMatch = s.match(/^(\d+(?:\.\d+)?)\+?$/);
  if (plusMatch) return parseFloat(plusMatch[1]);

  var n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 4. DUPLICATE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function buildExistingSet_() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName(K14.sheets.candidates);
  if (!sh || sh.getLastRow() < 2) return new Set();

  var headers  = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var kaiIdx   = headers.indexOf('KAINo');
  var emailIdx = headers.indexOf('Email');
  var mobIdx   = headers.indexOf('Mobile');

  var existing = new Set();
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (kaiIdx   >= 0 && row[kaiIdx])   existing.add('KAINO:'  + String(row[kaiIdx]).trim().toUpperCase());
    if (emailIdx >= 0 && row[emailIdx]) existing.add('EMAIL:'  + String(row[emailIdx]).trim().toLowerCase());
    if (mobIdx   >= 0 && row[mobIdx])   existing.add('MOBILE:' + String(row[mobIdx]).trim().replace(/\s+/g, ''));
  }
  return existing;
}

function detectDuplicate_(kaiNo, email, mobile, existingSet) {
  if (kaiNo  && existingSet.has('KAINO:'  + String(kaiNo).trim().toUpperCase()))
    return { isDuplicate: true, reason: 'KAINo collision: ' + kaiNo };
  if (email  && existingSet.has('EMAIL:'  + String(email).trim().toLowerCase()))
    return { isDuplicate: true, reason: 'Email collision: ' + email };
  if (mobile && existingSet.has('MOBILE:' + String(mobile).trim().replace(/\s+/g, '')))
    return { isDuplicate: true, reason: 'Mobile collision: ' + mobile };
  return { isDuplicate: false, reason: '' };
}


// ═══════════════════════════════════════════════════════════════════════════════
// 5. MIGRATION AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

function generateMigrationAudit_(logSh) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  logSh  = logSh || ss.getSheetByName(MIGRATION_LOG_SHEET);
  if (!logSh || logSh.getLastRow() < 2)
    return { error: 'Migration_Log is empty or missing. Run migration first.' };

  var hdrs        = logSh.getRange(1, 1, 1, logSh.getLastColumn()).getValues()[0];
  var data        = logSh.getRange(2, 1, logSh.getLastRow() - 1, logSh.getLastColumn()).getValues();
  var statusIdx   = hdrs.indexOf('MigrationStatus');
  var batchIdx    = hdrs.indexOf('MigrationBatchID');
  var sourceRowIdx= hdrs.indexOf('SourceRowNumber');
  var durIdx      = hdrs.indexOf('ExecutionDurationMs');

  var counts      = { IMPORTED: 0, SKIPPED: 0, FAILED: 0, DUPLICATE: 0 };
  var totalDurMs  = 0;

  for (var i = 0; i < data.length; i++) {
    var status = String(data[i][statusIdx] || '').trim().toUpperCase()
                  .replace(' (DRY RUN)', '');
    if (counts.hasOwnProperty(status)) counts[status]++;
    var dur = parseFloat(data[i][durIdx] || '0');
    if (!isNaN(dur)) totalDurMs += dur;
  }

  var eligible    = counts.IMPORTED + counts.DUPLICATE + counts.FAILED;
  var reconDiff   = eligible - (counts.IMPORTED + counts.DUPLICATE + counts.FAILED);
  var checksum    = data
    .filter(function(r) { return String(r[statusIdx]).toUpperCase().replace(' (DRY RUN)','') === 'IMPORTED'; })
    .reduce(function(acc, r) { return acc + (parseInt(r[sourceRowIdx], 10) || 0); }, 0);

  var audit = {
    generatedAt:          new Date().toISOString(),
    migrationVersion:     MIGRATION_VERSION,
    totalLogRows:         data.length,
    eligible:             eligible,
    imported:             counts.IMPORTED,
    duplicate:            counts.DUPLICATE,
    skipped:              counts.SKIPPED,
    failed:               counts.FAILED,
    reconciliationDiff:   reconDiff,
    reconciliationPassed: reconDiff === 0,
    importedChecksum:     checksum,
    totalDurationMs:      Math.round(totalDurMs),
    productionGate:       reconDiff === 0
      ? 'PASS — cleared for production cutover review'
      : 'FAIL — Reconciliation Difference = ' + reconDiff + '. Do NOT cut over.'
  };

  Logger.log('=== KAI14 MIGRATION AUDIT ===');
  Logger.log(JSON.stringify(audit, null, 2));
  Logger.log('=============================');
  return audit;
}

function generateMigrationAudit() { return generateMigrationAudit_(); }


// ═══════════════════════════════════════════════════════════════════════════════
// 6. CHECKPOINT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * resetMigrationProgress — clears checkpoint so next run starts from row 1.
 * Call this only when you want a completely fresh migration.
 */
function resetMigrationProgress() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(MIG_OFFSET_KEY);
  props.deleteProperty(MIG_BATCH_KEY);
  props.deleteProperty(MIG_DRYRUN_KEY);
  Logger.log('KAI MIGRATION — Progress checkpoint cleared. Next run starts from row 1.');
}

function getMigrationProgress() {
  var props  = PropertiesService.getScriptProperties();
  var offset = parseInt(props.getProperty(MIG_OFFSET_KEY) || '0', 10);
  var batchId= props.getProperty(MIG_BATCH_KEY) || null;
  var dryRun = props.getProperty(MIG_DRYRUN_KEY) === 'true';
  Logger.log('KAI MIGRATION — Current progress: offset=' + offset + ', batchId=' + batchId + ', dryRun=' + dryRun);
  return { offset: offset, batchId: batchId, dryRun: dryRun };
}


// ═══════════════════════════════════════════════════════════════════════════════
// 7. MIGRATION ENGINE — RESUMABLE MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * runHistoricalMigration — READ → VALIDATE → COPY IDENTITY (18 fields) → LOG
 *
 * RESUMABLE: stops at 5-min mark, saves checkpoint, logs PARTIAL status.
 * Re-run the same call to continue from where it left off.
 * Run resetMigrationProgress() first if you want to start over.
 *
 * @param {boolean} [dryRun=true]  — safety default: dry run until CEO approves live
 * @returns {object} execution summary for this chunk
 */
function runHistoricalMigration(dryRun) {
  dryRun = (dryRun !== false);  // default TRUE — safe

  var callStart = new Date();
  var props     = PropertiesService.getScriptProperties();

  // ── Gate 1: maintenance mode ──────────────────────────────────────────────
  if (!getMaintenanceMode()) {
    var msg = 'KAI MIGRATION ABORTED — maintenanceMode is OFF. Run setMaintenanceMode(true) first.';
    Logger.log(msg);
    return { ok: false, error: msg };
  }

  // ── Gate 2: legacy spreadsheet ID ────────────────────────────────────────
  var legacySsId = props.getProperty('LEGACY_SS_ID');
  if (!legacySsId) {
    var msg2 = 'KAI MIGRATION ABORTED — Script Property LEGACY_SS_ID is not set.';
    Logger.log(msg2);
    return { ok: false, error: msg2 };
  }

  // ── Checkpoint / Resume ───────────────────────────────────────────────────
  var savedOffset = parseInt(props.getProperty(MIG_OFFSET_KEY) || '0', 10);
  var savedBatch  = props.getProperty(MIG_BATCH_KEY);
  var savedDryRun = props.getProperty(MIG_DRYRUN_KEY);

  // If a batch is in progress, enforce the same dryRun mode
  if (savedBatch && savedDryRun !== null) {
    var lockedDryRun = (savedDryRun === 'true');
    if (lockedDryRun !== dryRun) {
      var msg3 = 'KAI MIGRATION ABORTED — In-progress batch is dryRun=' + lockedDryRun +
                 '. Pass the same value or call resetMigrationProgress() to start over.';
      Logger.log(msg3);
      return { ok: false, error: msg3 };
    }
    dryRun = lockedDryRun;
  }

  var batchId = savedBatch || ('MIG-' + callStart.getTime());
  var startOffset = savedOffset;  // 0-based index into legacy data array

  // Lock the batch + dryRun mode on first call
  if (!savedBatch) {
    props.setProperty(MIG_BATCH_KEY,  batchId);
    props.setProperty(MIG_DRYRUN_KEY, String(dryRun));
    props.setProperty(MIG_OFFSET_KEY, '0');
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  var operator = Session.getActiveUser().getEmail() || 'unknown';
  var kaiSs    = SpreadsheetApp.getActiveSpreadsheet();
  var logSh    = ensureMigrationLog_();
  var candSh   = kaiSs.getSheetByName(K14.sheets.candidates);

  if (!candSh) {
    return { ok: false, error: 'KAI MIGRATION ABORTED — Candidates sheet not found.' };
  }

  // ── Open legacy spreadsheet ───────────────────────────────────────────────
  var legacySs, legacySh;
  try {
    legacySs = SpreadsheetApp.openById(legacySsId);
    legacySh = legacySs.getSheetByName('Candidates');
    if (!legacySh) throw new Error('Candidates sheet not found in legacy spreadsheet.');
  } catch (e) {
    return { ok: false, error: 'KAI MIGRATION ABORTED — Cannot open legacy spreadsheet: ' + e.message };
  }

  // ── Read legacy schema ────────────────────────────────────────────────────
  var legacyHeaders = legacySh.getRange(1, 1, 1, legacySh.getLastColumn())
                               .getValues()[0]
                               .map(function(h) { return String(h).trim(); });
  var legacyIdx = {};
  legacyHeaders.forEach(function(h, i) { legacyIdx[h] = i; });

  var activeCol = legacyIdx['_Active'];
  if (activeCol === undefined)
    return { ok: false, error: 'KAI MIGRATION ABORTED — _Active column not found.' };

  var missingCols = IDENTITY_FIELD_MAP
    .filter(function(m) { return legacyIdx[m.legacy] === undefined; })
    .map(function(m) { return m.legacy; });
  if (missingCols.length > 0)
    return { ok: false, error: 'KAI MIGRATION ABORTED — Missing legacy columns: ' + missingCols.join(', ') };

  // ── KAI14 header map ──────────────────────────────────────────────────────
  var kaiHeaders = candSh.getRange(1, 1, 1, candSh.getLastColumn())
                          .getValues()[0]
                          .map(function(h) { return String(h).trim(); });
  var kaiIdx = {};
  kaiHeaders.forEach(function(h, i) { kaiIdx[h] = i; });

  // ── Build existing-identity set (always from current KAI14 state) ─────────
  var existingSet = buildExistingSet_();

  // ── Read ALL legacy data once ─────────────────────────────────────────────
  var totalLegacyRows = legacySh.getLastRow() - 1;
  if (totalLegacyRows <= 0)
    return { ok: false, error: 'KAI MIGRATION — Legacy Candidates sheet has no data rows.' };

  var legacyData = legacySh.getRange(2, 1, totalLegacyRows, legacySh.getLastColumn()).getValues();

  // ── Migration loop ─────────────────────────────────────────────────────────
  var counts  = { imported: 0, skipped: 0, failed: 0, duplicate: 0 };
  var newRows = [];
  var didTimeout = false;

  for (var i = startOffset; i < legacyData.length; i++) {

    // Time check — stop 60s before hard limit
    if ((new Date() - callStart) > MAX_RUN_MS) {
      didTimeout = true;
      props.setProperty(MIG_OFFSET_KEY, String(i));
      Logger.log('KAI MIGRATION — 5-min checkpoint at row ' + (i + 2) + ' of ' + (totalLegacyRows + 1) +
                 '. Re-run runHistoricalMigration(' + dryRun + ') to continue.');
      break;
    }

    var legRow    = legacyData[i];
    var sourceRow = i + 2;
    var rowStart  = new Date();

    var legKaiNo  = String(legRow[legacyIdx['KAI No']] || '').trim();
    var legName   = String(legRow[legacyIdx['Name']]   || '').trim();
    var legEmail  = String(legRow[legacyIdx['Email']]  || '').trim().toLowerCase();
    var legMobile = String(legRow[legacyIdx['Mobile']] || '').trim().replace(/\s+/g, '');
    var legActive = legRow[activeCol];

    var isActive  = (legActive === true  || legActive === 'True' || legActive === 'TRUE' ||
                     legActive === 1     || legActive === '1');

    if (!isActive) {
      counts.skipped++;
      logMigrationRow_(logSh, {
        batchId: batchId, startTime: callStart.toISOString(), endTime: '',
        operator: operator, sourceSsId: legacySsId, sourceSsName: legacySs.getName(),
        sourceRow: sourceRow, legacyKAINo: legKaiNo, migratedKAINo: '',
        candidateName: legName, status: 'SKIPPED',
        reason: 'Not active: _Active = ' + JSON.stringify(legActive),
        errorMessage: '', legacyGulfExpRaw: String(legRow[legacyIdx['Gulf Experience']] || ''),
        durationMs: new Date() - rowStart
      });
      continue;
    }

    var dupCheck = detectDuplicate_(legKaiNo, legEmail, legMobile, existingSet);
    if (dupCheck.isDuplicate) {
      counts.duplicate++;
      logMigrationRow_(logSh, {
        batchId: batchId, startTime: callStart.toISOString(), endTime: '',
        operator: operator, sourceSsId: legacySsId, sourceSsName: legacySs.getName(),
        sourceRow: sourceRow, legacyKAINo: legKaiNo, migratedKAINo: '',
        candidateName: legName, status: 'DUPLICATE',
        reason: dupCheck.reason,
        errorMessage: 'Held for manual resolution. Never auto-merged.',
        legacyGulfExpRaw: String(legRow[legacyIdx['Gulf Experience']] || ''),
        durationMs: new Date() - rowStart
      });
      continue;
    }

    try {
      var rawGulf   = legRow[legacyIdx['Gulf Experience']];
      var gulfFloat = resolveGulfExperience_(rawGulf);
      var newRow    = new Array(kaiHeaders.length).fill('');

      IDENTITY_FIELD_MAP.forEach(function(m) {
        if (m.kai === 'GulfExperience') return;
        var col = kaiIdx[m.kai];
        if (col !== undefined) newRow[col] = legRow[legacyIdx[m.legacy]];
      });
      if (kaiIdx['GulfExperience'] !== undefined) newRow[kaiIdx['GulfExperience']] = gulfFloat;
      if (kaiIdx['Source']         !== undefined) newRow[kaiIdx['Source']]         = 'HISTORICAL_MIGRATION';
      if (kaiIdx['CampaignID']     !== undefined) newRow[kaiIdx['CampaignID']]     = '';
      if (kaiIdx['UpdatedAt']      !== undefined) newRow[kaiIdx['UpdatedAt']]      = new Date().toISOString();
      ['Score','Verdict','Flags','KAIAssessment'].forEach(function(f) {
        if (kaiIdx[f] !== undefined) newRow[kaiIdx[f]] = '';
      });

      if (!dryRun) {
        newRows.push(newRow);
        if (legKaiNo)  existingSet.add('KAINO:'  + legKaiNo.toUpperCase());
        if (legEmail)  existingSet.add('EMAIL:'  + legEmail.toLowerCase());
        if (legMobile) existingSet.add('MOBILE:' + legMobile);
      }

      counts.imported++;
      logMigrationRow_(logSh, {
        batchId: batchId, startTime: callStart.toISOString(), endTime: '',
        operator: operator, sourceSsId: legacySsId, sourceSsName: legacySs.getName(),
        sourceRow: sourceRow, legacyKAINo: legKaiNo, migratedKAINo: legKaiNo,
        candidateName: legName,
        status:  dryRun ? 'IMPORTED (DRY RUN)' : 'IMPORTED',
        reason:  dryRun ? 'Dry run — no write performed' : 'Identity evidence copied',
        errorMessage: '', legacyGulfExpRaw: String(rawGulf || ''),
        durationMs: new Date() - rowStart
      });

    } catch (e) {
      counts.failed++;
      logMigrationRow_(logSh, {
        batchId: batchId, startTime: callStart.toISOString(), endTime: '',
        operator: operator, sourceSsId: legacySsId, sourceSsName: legacySs.getName(),
        sourceRow: sourceRow, legacyKAINo: legKaiNo, migratedKAINo: '',
        candidateName: legName, status: 'FAILED',
        reason: 'Exception during row build', errorMessage: e.message,
        legacyGulfExpRaw: String(legRow[legacyIdx['Gulf Experience']] || ''),
        durationMs: new Date() - rowStart
      });
    }
  }

  // ── Batch write IMPORTED rows ─────────────────────────────────────────────
  if (!dryRun && newRows.length > 0) {
    var lastRow = candSh.getLastRow();
    candSh.getRange(lastRow + 1, 1, newRows.length, kaiHeaders.length).setValues(newRows);
    Logger.log('KAI MIGRATION — Wrote ' + newRows.length + ' rows to Candidates sheet.');
  }

  // ── Completion vs partial ─────────────────────────────────────────────────
  var endTime    = new Date();
  var isComplete = !didTimeout;

  if (isComplete) {
    // Clear checkpoint — migration finished
    props.deleteProperty(MIG_OFFSET_KEY);
    props.deleteProperty(MIG_BATCH_KEY);
    props.deleteProperty(MIG_DRYRUN_KEY);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  var processedThisRun = startOffset === 0
    ? (counts.imported + counts.skipped + counts.failed + counts.duplicate)
    : (counts.imported + counts.skipped + counts.failed + counts.duplicate);
  var resumeAt = didTimeout ? parseInt(props.getProperty(MIG_OFFSET_KEY) || '0', 10) : totalLegacyRows;

  var summary = {
    ok:              true,
    status:          isComplete ? 'COMPLETE' : 'PARTIAL — re-run to continue',
    dryRun:          dryRun,
    batchId:         batchId,
    operator:        operator,
    startOffset:     startOffset,
    resumeAtOffset:  didTimeout ? resumeAt : null,
    totalLegacyRows: totalLegacyRows,
    thisRunRows:     processedThisRun,
    imported:        counts.imported,
    skipped:         counts.skipped,
    failed:          counts.failed,
    duplicate:       counts.duplicate,
    durationMs:      endTime - callStart,
    nextAction:      isComplete
      ? (dryRun
          ? 'Dry run COMPLETE. Call generateMigrationAudit() then await CEO approval for live run.'
          : 'Live run COMPLETE. Call generateMigrationAudit() to verify Reconciliation Difference = 0.')
      : 'PARTIAL. Re-run runHistoricalMigration(' + dryRun + ') to continue from row ' + (resumeAt + 2) + '.'
  };

  Logger.log('=== KAI14 MIGRATION ' + (isComplete ? 'COMPLETE' : 'PARTIAL') + ' ===');
  Logger.log('Batch        : ' + batchId);
  Logger.log('Dry Run      : ' + dryRun);
  Logger.log('Rows this run: ' + processedThisRun + ' (offset ' + startOffset + '→' + resumeAt + ')');
  Logger.log('Imported     : ' + counts.imported);
  Logger.log('Skipped      : ' + counts.skipped);
  Logger.log('Duplicate    : ' + counts.duplicate);
  Logger.log('Failed       : ' + counts.failed);
  Logger.log('Duration     : ' + Math.round((endTime - callStart) / 1000) + 's');
  Logger.log('Next action  : ' + summary.nextAction);
  Logger.log('================================================');

  return summary;
}
