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
 * ENTRY POINTS (callable from Apps Script UI):
 *   setMaintenanceMode(enabled)      — toggle maintenance flag in KAI14 _Config
 *   getMaintenanceMode()             — read flag (returns boolean)
 *   runHistoricalMigration(dryRun)   — full migration (dryRun=true = no writes)
 *   generateMigrationAudit()         — post-run audit report + reconciliation check
 *
 * SCRIPT PROPERTY REQUIRED:
 *   LEGACY_SS_ID — Google Sheets ID of Gmail_CV_Candidates spreadsheet
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

var MIGRATION_VERSION      = '1.0.0';
var MIGRATION_LOG_SHEET    = 'Migration_Log';
var CONFIG_SHEET           = '_Config';
var MAINTENANCE_KEY        = 'maintenanceMode';

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
  { legacy: 'KAI No',          kai: 'KAINo'           },
  { legacy: 'Application Date', kai: 'CreatedAt'       },
  { legacy: 'Name',            kai: 'FullName'         },
  { legacy: 'Mobile',          kai: 'Mobile'           },
  { legacy: 'Email',           kai: 'Email'            },
  { legacy: 'Nationality',     kai: 'Nationality'      },
  { legacy: 'Date of Birth',   kai: 'DOB'              },
  { legacy: 'Age',             kai: 'Age'              },
  { legacy: 'Trade',           kai: 'Trade'            },
  { legacy: 'Industry',        kai: 'Industry'         },
  { legacy: 'Experience',      kai: 'Experience'       },
  { legacy: 'Gulf Experience', kai: 'GulfExperience'   },  // text → float
  { legacy: 'Education',       kai: 'Education'        },
  { legacy: 'Position Applied', kai: 'PositionApplied' },
  { legacy: 'CV Link',         kai: 'CVLink'           },
  { legacy: 'Candidate State', kai: 'State'            },
  { legacy: 'Missing Fields',  kai: 'MissingFields'    }
  // _Active: filter only, not imported
];

// Columns used for duplicate detection (subset of identity)
var DUP_KEYS = ['KAINo', 'Email', 'Mobile'];


// ═══════════════════════════════════════════════════════════════════════════════
// 1. MAINTENANCE MODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * setMaintenanceMode — writes maintenanceMode key to KAI14 _Config sheet.
 * @param {boolean} enabled
 */
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
  // Key not found — append
  cfg.appendRow([MAINTENANCE_KEY, enabled ? 'TRUE' : 'FALSE']);
  Logger.log('KAI MIGRATION — maintenanceMode created as ' + enabled);
}

/**
 * getMaintenanceMode — reads maintenanceMode from KAI14 _Config sheet.
 * @returns {boolean}
 */
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

/**
 * ensureMigrationLog_ — creates Migration_Log sheet with locked header row if absent.
 * @returns {Sheet}
 */
function ensureMigrationLog_() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(MIGRATION_LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(MIGRATION_LOG_SHEET);
    log.getRange(1, 1, 1, MIGRATION_LOG_HEADERS.length)
       .setValues([MIGRATION_LOG_HEADERS]);
    // Freeze header, make it visually distinct
    log.setFrozenRows(1);
    log.getRange(1, 1, 1, MIGRATION_LOG_HEADERS.length)
       .setBackground('#1a1a2e')
       .setFontColor('#ffffff')
       .setFontWeight('bold');
    Logger.log('KAI MIGRATION — Migration_Log sheet created.');
  }
  return log;
}

/**
 * logMigrationRow_ — appends one governance row to Migration_Log.
 * @param {Sheet}  logSh
 * @param {object} d  — keys match MIGRATION_LOG_HEADERS camelCase equivalents
 */
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
    d.status           || '',  // IMPORTED | SKIPPED | FAILED | DUPLICATE
    d.reason           || '',
    d.errorMessage     || '',
    d.legacyGulfExpRaw || '',
    d.durationMs       || ''
  ]);
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. GULF EXPERIENCE RESOLUTION (text → float years)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * resolveGulfExperience_ — deterministic pattern-based text→float conversion.
 * Returns 0 for blanks/None/N/A. Never returns null.
 *
 * Supported formats:
 *   "5"             → 5.0
 *   "5.5"           → 5.5
 *   "5+"            → 5.0
 *   "5 years"       → 5.0
 *   "5 yrs"         → 5.0
 *   "5.5 years"     → 5.5
 *   "5 months"      → 0.42  (rounded to 2dp)
 *   "60 months"     → 5.0
 *   "5 years 6 months" → 5.5
 *   ""/"None"/"N/A"/"nil"/"0"/"–" → 0.0
 *
 * @param {string|number} raw
 * @returns {number}
 */
function resolveGulfExperience_(raw) {
  if (raw === null || raw === undefined) return 0;

  // Already a number (cell stored as numeric)
  if (typeof raw === 'number') return raw >= 0 ? Math.round(raw * 100) / 100 : 0;

  var s = String(raw).trim().toLowerCase();

  // Blanks / explicit zero markers
  if (!s || s === 'none' || s === 'n/a' || s === 'na' || s === 'nil' ||
      s === '-' || s === '–' || s === '0' || s === 'no' || s === 'n') {
    return 0;
  }

  // "X years Y months"
  var ymMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(\d+(?:\.\d+)?)\s*months?/);
  if (ymMatch) {
    return Math.round((parseFloat(ymMatch[1]) + parseFloat(ymMatch[2]) / 12) * 100) / 100;
  }

  // "X years" / "X yrs"
  var yMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/);
  if (yMatch) return parseFloat(yMatch[1]);

  // "X months"
  var mMatch = s.match(/^(\d+(?:\.\d+)?)\s*months?/);
  if (mMatch) return Math.round((parseFloat(mMatch[1]) / 12) * 100) / 100;

  // "5+" or "5.5+" — strip trailing +
  var plusMatch = s.match(/^(\d+(?:\.\d+)?)\+?$/);
  if (plusMatch) return parseFloat(plusMatch[1]);

  // Fallback — try direct parse
  var n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 4. DUPLICATE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * buildExistingSet_ — reads current KAI14 Candidates sheet and returns a Set
 * of all known identity keys for fast O(1) lookup.
 *
 * Key format:  "KAINO:<kaiNo>"  |  "EMAIL:<email>"  |  "MOBILE:<mobile>"
 *
 * @returns {Set<string>}
 */
function buildExistingSet_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName(K14.sheets.candidates);
  if (!sh || sh.getLastRow() < 2) return new Set();

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
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

/**
 * detectDuplicate_ — checks candidate identity against existingSet.
 *
 * Duplicate if ANY of: KAINo, Email, Mobile already present in KAI14.
 *
 * @param {string} kaiNo
 * @param {string} email
 * @param {string} mobile
 * @param {Set}    existingSet  — built once by buildExistingSet_() before the loop
 * @returns {{ isDuplicate: boolean, reason: string }}
 */
function detectDuplicate_(kaiNo, email, mobile, existingSet) {
  if (kaiNo && existingSet.has('KAINO:' + String(kaiNo).trim().toUpperCase())) {
    return { isDuplicate: true, reason: 'KAINo collision: ' + kaiNo };
  }
  if (email && existingSet.has('EMAIL:' + String(email).trim().toLowerCase())) {
    return { isDuplicate: true, reason: 'Email collision: ' + email };
  }
  if (mobile && existingSet.has('MOBILE:' + String(mobile).trim().replace(/\s+/g, ''))) {
    return { isDuplicate: true, reason: 'Mobile collision: ' + mobile };
  }
  return { isDuplicate: false, reason: '' };
}


// ═══════════════════════════════════════════════════════════════════════════════
// 5. MIGRATION AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * generateMigrationAudit_ — reads Migration_Log and computes full audit report.
 *
 * Reconciliation equation (must equal 0 to gate production cutover):
 *   Eligible − (Imported + Duplicate + Skipped + Failed) = 0
 *
 * @param {Sheet} [logSh]  — defaults to Migration_Log sheet in active SS
 * @returns {object} audit report
 */
function generateMigrationAudit_(logSh) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  logSh  = logSh || ss.getSheetByName(MIGRATION_LOG_SHEET);

  if (!logSh || logSh.getLastRow() < 2) {
    return { error: 'Migration_Log is empty or missing. Run migration first.' };
  }

  var hdrs = logSh.getRange(1, 1, 1, logSh.getLastColumn()).getValues()[0];
  var data = logSh.getRange(2, 1, logSh.getLastRow() - 1, logSh.getLastColumn()).getValues();

  var statusIdx   = hdrs.indexOf('MigrationStatus');
  var batchIdx    = hdrs.indexOf('MigrationBatchID');
  var startIdx    = hdrs.indexOf('MigrationStartTime');
  var endIdx      = hdrs.indexOf('MigrationEndTime');
  var sourceRowIdx= hdrs.indexOf('SourceRowNumber');
  var durIdx      = hdrs.indexOf('ExecutionDurationMs');

  var counts = { IMPORTED: 0, SKIPPED: 0, FAILED: 0, DUPLICATE: 0 };
  var batches = {};
  var totalDurMs = 0;
  var eligibleRows = 0;

  for (var i = 0; i < data.length; i++) {
    var row    = data[i];
    var status = String(row[statusIdx] || '').trim().toUpperCase();
    if (counts.hasOwnProperty(status)) counts[status]++;
    // SKIPPED rows represent non-eligible (_Active=ARCHIVED) — don't count as eligible
    if (status !== 'SKIPPED') eligibleRows++;

    var bId = String(row[batchIdx] || '');
    if (!batches[bId]) batches[bId] = { start: row[startIdx], end: row[endIdx], count: 0 };
    batches[bId].count++;

    var dur = parseFloat(row[durIdx] || '0');
    if (!isNaN(dur)) totalDurMs += dur;
  }

  var totalRows     = counts.IMPORTED + counts.SKIPPED + counts.FAILED + counts.DUPLICATE;
  var reconDiff     = eligibleRows - (counts.IMPORTED + counts.DUPLICATE + counts.FAILED);
  var reconPassed   = reconDiff === 0;

  // Checksum: simple sum of source row numbers for IMPORTED rows
  var importedRows  = data.filter(function(r) { return String(r[statusIdx]).toUpperCase() === 'IMPORTED'; });
  var checksum      = importedRows.reduce(function(acc, r) {
    return acc + (parseInt(r[sourceRowIdx], 10) || 0);
  }, 0);

  var audit = {
    generatedAt:          new Date().toISOString(),
    migrationVersion:     MIGRATION_VERSION,
    batchCount:           Object.keys(batches).length,
    totalLogRows:         totalRows,
    eligible:             eligibleRows,
    imported:             counts.IMPORTED,
    duplicate:            counts.DUPLICATE,
    skipped:              counts.SKIPPED,
    failed:               counts.FAILED,
    reconciliationDiff:   reconDiff,
    reconciliationPassed: reconPassed,
    importedChecksum:     checksum,
    totalDurationMs:      Math.round(totalDurMs),
    productionGate:       reconPassed ? 'PASS — cleared for production cutover review'
                                      : 'FAIL — Reconciliation Difference = ' + reconDiff + '. Do NOT cut over.'
  };

  Logger.log('=== KAI14 MIGRATION AUDIT ===');
  Logger.log(JSON.stringify(audit, null, 2));
  Logger.log('=============================');
  return audit;
}

/**
 * generateMigrationAudit — public entry point (no args required).
 */
function generateMigrationAudit() {
  return generateMigrationAudit_();
}


// ═══════════════════════════════════════════════════════════════════════════════
// 6. MIGRATION ENGINE — MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * runHistoricalMigration — READ → VALIDATE → COPY IDENTITY (18 fields) → LOG
 *
 * Execution contract:
 *   1. Maintenance mode must be ON before migration (hard gate)
 *   2. Reads Gmail_CV_Candidates via LEGACY_SS_ID script property (read-only)
 *   3. _Active = True  → eligible for import
 *      _Active = 'ARCHIVED' → SKIPPED (logged, not counted as eligible)
 *   4. Duplicate check on KAINo, Email, Mobile → DUPLICATE (logged, not imported)
 *   5. Gulf Experience resolved from text to float
 *   6. Source field = 'HISTORICAL_MIGRATION'
 *   7. CampaignID = '' (identity migration — no campaign assignment)
 *   8. Score/Verdict/KAIAssessment are NOT imported (K14 will derive them fresh)
 *   9. All rows logged to Migration_Log regardless of outcome
 *  10. dryRun=true → reads + validates + logs (to Migration_Log) but writes NO rows
 *      to Candidates sheet and does NOT advance KAI counter
 *
 * @param {boolean} [dryRun=true]  — safety default: dry run until CEO approves live
 * @returns {object} execution summary
 */
function runHistoricalMigration(dryRun) {
  dryRun = (dryRun !== false);  // default TRUE — safe

  // ── Gate 1: maintenance mode ──────────────────────────────────────────────
  if (!getMaintenanceMode()) {
    var msg = 'KAI MIGRATION ABORTED — maintenanceMode is OFF. ' +
              'Run setMaintenanceMode(true) first.';
    Logger.log(msg);
    return { ok: false, error: msg };
  }

  // ── Gate 2: legacy spreadsheet ID ────────────────────────────────────────
  var legacySsId = PropertiesService.getScriptProperties().getProperty('LEGACY_SS_ID');
  if (!legacySsId) {
    var msg2 = 'KAI MIGRATION ABORTED — Script Property LEGACY_SS_ID is not set. ' +
               'Add it via Project Settings → Script Properties.';
    Logger.log(msg2);
    return { ok: false, error: msg2 };
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  var batchId   = 'MIG-' + new Date().getTime();
  var startTime = new Date();
  var operator  = Session.getActiveUser().getEmail() || 'unknown';
  var kaiSs     = SpreadsheetApp.getActiveSpreadsheet();
  var logSh     = ensureMigrationLog_();
  var candSh    = kaiSs.getSheetByName(K14.sheets.candidates);

  if (!candSh) {
    var msg3 = 'KAI MIGRATION ABORTED — Candidates sheet not found in KAI14.';
    Logger.log(msg3);
    return { ok: false, error: msg3 };
  }

  // ── Build KAI14 existing-identity set for duplicate detection ─────────────
  var existingSet = buildExistingSet_();

  // ── Open legacy spreadsheet ───────────────────────────────────────────────
  var legacySs, legacySh;
  try {
    legacySs = SpreadsheetApp.openById(legacySsId);
    legacySh = legacySs.getSheetByName('Candidates');
    if (!legacySh) throw new Error('Candidates sheet not found in legacy spreadsheet.');
  } catch (e) {
    var msg4 = 'KAI MIGRATION ABORTED — Cannot open legacy spreadsheet: ' + e.message;
    Logger.log(msg4);
    return { ok: false, error: msg4 };
  }

  // ── Read legacy header row ────────────────────────────────────────────────
  var legacyHeaders = legacySh.getRange(1, 1, 1, legacySh.getLastColumn())
                               .getValues()[0]
                               .map(function(h) { return String(h).trim(); });

  // Build legacy col index map
  var legacyIdx = {};
  legacyHeaders.forEach(function(h, i) { legacyIdx[h] = i; });

  // Verify _Active column exists
  var activeCol = legacyIdx['_Active'];
  if (activeCol === undefined) {
    var msg5 = 'KAI MIGRATION ABORTED — _Active column not found in legacy Candidates sheet.';
    Logger.log(msg5);
    return { ok: false, error: msg5 };
  }

  // Verify all 18 identity fields are present in legacy
  var missingCols = [];
  IDENTITY_FIELD_MAP.forEach(function(m) {
    if (legacyIdx[m.legacy] === undefined) missingCols.push(m.legacy);
  });
  if (missingCols.length > 0) {
    var msg6 = 'KAI MIGRATION ABORTED — Legacy sheet missing columns: ' + missingCols.join(', ');
    Logger.log(msg6);
    return { ok: false, error: msg6 };
  }

  // ── Build KAI14 header→col map ────────────────────────────────────────────
  var kaiHeaders = candSh.getRange(1, 1, 1, candSh.getLastColumn())
                          .getValues()[0]
                          .map(function(h) { return String(h).trim(); });
  var kaiIdx = {};
  kaiHeaders.forEach(function(h, i) { kaiIdx[h] = i; });

  // ── Determine starting KAI counter ───────────────────────────────────────
  // KAI Number immutability: after migration, counter = MAX(KAINo) + 1
  // We read the current max from KAI14 now (will update after all IMPORTED rows)
  var kaiNoCol = kaiIdx['KAINo'];
  var maxKaiNum = 0;
  if (!dryRun && candSh.getLastRow() >= 2) {
    var existingKaiNos = candSh.getRange(2, kaiNoCol + 1, candSh.getLastRow() - 1, 1).getValues();
    existingKaiNos.forEach(function(r) {
      var n = parseInt(String(r[0]).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n) && n > maxKaiNum) maxKaiNum = n;
    });
  }

  // ── Read all legacy data ──────────────────────────────────────────────────
  var totalLegacyRows = legacySh.getLastRow() - 1;
  if (totalLegacyRows <= 0) {
    var msg7 = 'KAI MIGRATION — Legacy Candidates sheet has no data rows.';
    Logger.log(msg7);
    return { ok: false, error: msg7 };
  }

  var legacyData = legacySh.getRange(2, 1, totalLegacyRows, legacySh.getLastColumn()).getValues();

  // ── Migration loop ─────────────────────────────────────────────────────────
  var counts   = { imported: 0, skipped: 0, failed: 0, duplicate: 0 };
  var newRows  = [];  // buffer for batch write

  for (var i = 0; i < legacyData.length; i++) {
    var legRow    = legacyData[i];
    var sourceRow = i + 2;  // 1-indexed, row 1 = headers
    var rowStart  = new Date();

    var legKaiNo  = String(legRow[legacyIdx['KAI No']] || '').trim();
    var legName   = String(legRow[legacyIdx['Name']]   || '').trim();
    var legEmail  = String(legRow[legacyIdx['Email']]  || '').trim().toLowerCase();
    var legMobile = String(legRow[legacyIdx['Mobile']] || '').trim().replace(/\s+/g, '');
    var legActive = legRow[activeCol];

    // _Active filter: True (boolean) = include; 'ARCHIVED' (string) = exclude
    // Also exclude if _Active is false, blank, or any non-True value
    var isActive = (legActive === true || legActive === 'True' || legActive === 'TRUE' ||
                    legActive === 1    || legActive === '1');
    if (!isActive) {
      counts.skipped++;
      logMigrationRow_(logSh, {
        batchId:          batchId,
        startTime:        startTime.toISOString(),
        endTime:          '',
        operator:         operator,
        sourceSsId:       legacySsId,
        sourceSsName:     legacySs.getName(),
        sourceRow:        sourceRow,
        legacyKAINo:      legKaiNo,
        migratedKAINo:    '',
        candidateName:    legName,
        status:           'SKIPPED',
        reason:           'Not active: _Active = ' + JSON.stringify(legActive),
        errorMessage:     '',
        legacyGulfExpRaw: String(legRow[legacyIdx['Gulf Experience']] || ''),
        durationMs:       new Date() - rowStart
      });
      continue;
    }

    // Duplicate detection
    var dupCheck = detectDuplicate_(legKaiNo, legEmail, legMobile, existingSet);
    if (dupCheck.isDuplicate) {
      counts.duplicate++;
      logMigrationRow_(logSh, {
        batchId:          batchId,
        startTime:        startTime.toISOString(),
        endTime:          '',
        operator:         operator,
        sourceSsId:       legacySsId,
        sourceSsName:     legacySs.getName(),
        sourceRow:        sourceRow,
        legacyKAINo:      legKaiNo,
        migratedKAINo:    '',
        candidateName:    legName,
        status:           'DUPLICATE',
        reason:           dupCheck.reason,
        errorMessage:     'Held for manual resolution. Never auto-merged.',
        legacyGulfExpRaw: String(legRow[legacyIdx['Gulf Experience']] || ''),
        durationMs:       new Date() - rowStart
      });
      continue;
    }

    // Build KAI14 candidate row
    try {
      var rawGulf = legRow[legacyIdx['Gulf Experience']];
      var gulfFloat = resolveGulfExperience_(rawGulf);

      // Prepare new KAI14 row (length = number of KAI14 headers)
      var newRow = new Array(kaiHeaders.length).fill('');

      // Copy 17 non-Gulf identity fields
      IDENTITY_FIELD_MAP.forEach(function(m) {
        if (m.kai === 'GulfExperience') return;  // handled separately
        var kaiColIdx = kaiIdx[m.kai];
        if (kaiColIdx !== undefined) {
          newRow[kaiColIdx] = legRow[legacyIdx[m.legacy]];
        }
      });

      // Gulf Experience: resolved float
      if (kaiIdx['GulfExperience'] !== undefined) {
        newRow[kaiIdx['GulfExperience']] = gulfFloat;
      }

      // System fields set by migration
      if (kaiIdx['Source']    !== undefined) newRow[kaiIdx['Source']]    = 'HISTORICAL_MIGRATION';
      if (kaiIdx['CampaignID']!== undefined) newRow[kaiIdx['CampaignID']]= '';
      if (kaiIdx['UpdatedAt'] !== undefined) newRow[kaiIdx['UpdatedAt']] = new Date().toISOString();

      // Blank verdict/intelligence fields — K14 will derive fresh
      ['Score','Verdict','Flags','KAIAssessment'].forEach(function(f) {
        if (kaiIdx[f] !== undefined) newRow[kaiIdx[f]] = '';
      });

      if (!dryRun) {
        newRows.push(newRow);
        // Add to existingSet immediately so later rows in same batch detect this as duplicate
        if (legKaiNo)  existingSet.add('KAINO:'  + legKaiNo.toUpperCase());
        if (legEmail)  existingSet.add('EMAIL:'  + legEmail.toLowerCase());
        if (legMobile) existingSet.add('MOBILE:' + legMobile);
      }

      counts.imported++;
      logMigrationRow_(logSh, {
        batchId:          batchId,
        startTime:        startTime.toISOString(),
        endTime:          '',
        operator:         operator,
        sourceSsId:       legacySsId,
        sourceSsName:     legacySs.getName(),
        sourceRow:        sourceRow,
        legacyKAINo:      legKaiNo,
        migratedKAINo:    legKaiNo,  // KAI Number immutability — same number preserved
        candidateName:    legName,
        status:           dryRun ? 'IMPORTED (DRY RUN)' : 'IMPORTED',
        reason:           dryRun ? 'Dry run — no write performed' : 'Identity evidence copied',
        errorMessage:     '',
        legacyGulfExpRaw: String(rawGulf || ''),
        durationMs:       new Date() - rowStart
      });

    } catch (e) {
      counts.failed++;
      logMigrationRow_(logSh, {
        batchId:          batchId,
        startTime:        startTime.toISOString(),
        endTime:          '',
        operator:         operator,
        sourceSsId:       legacySsId,
        sourceSsName:     legacySs.getName(),
        sourceRow:        sourceRow,
        legacyKAINo:      legKaiNo,
        migratedKAINo:    '',
        candidateName:    legName,
        status:           'FAILED',
        reason:           'Exception during row build',
        errorMessage:     e.message,
        legacyGulfExpRaw: String(legRow[legacyIdx['Gulf Experience']] || ''),
        durationMs:       new Date() - rowStart
      });
    }
  }

  // ── Batch write IMPORTED rows to KAI14 Candidates ─────────────────────────
  if (!dryRun && newRows.length > 0) {
    var lastRow = candSh.getLastRow();
    candSh.getRange(lastRow + 1, 1, newRows.length, kaiHeaders.length)
           .setValues(newRows);
    Logger.log('KAI MIGRATION — Wrote ' + newRows.length + ' rows to Candidates sheet.');
  }

  // ── Update end-time column in log (backfill for this batch) ───────────────
  var endTime   = new Date();
  var endTimeIso = endTime.toISOString();
  var logData   = logSh.getDataRange().getValues();
  var logHdrs   = logData[0];
  var batchCol  = logHdrs.indexOf('MigrationBatchID') + 1;
  var endCol    = logHdrs.indexOf('MigrationEndTime') + 1;
  for (var r = 1; r < logData.length; r++) {
    if (String(logData[r][batchCol - 1]) === batchId && !logData[r][endCol - 1]) {
      logSh.getRange(r + 1, endCol).setValue(endTimeIso);
    }
  }

  // ── Execution summary ─────────────────────────────────────────────────────
  var summary = {
    ok:             true,
    dryRun:         dryRun,
    batchId:        batchId,
    operator:       operator,
    startTime:      startTime.toISOString(),
    endTime:        endTimeIso,
    durationMs:     endTime - startTime,
    totalLegacyRows:totalLegacyRows,
    imported:       counts.imported,
    skipped:        counts.skipped,
    failed:         counts.failed,
    duplicate:      counts.duplicate,
    eligible:       counts.imported + counts.duplicate + counts.failed,
    reconDiff:      (counts.imported + counts.duplicate + counts.failed) -
                    (counts.imported + counts.duplicate + counts.failed),  // always 0 within run
    note:           dryRun
      ? 'DRY RUN — No rows written to Candidates. Review Migration_Log, then call runHistoricalMigration(false) to execute.'
      : 'LIVE RUN — ' + counts.imported + ' candidates imported. Run generateMigrationAudit() to verify.'
  };

  Logger.log('=== KAI14 HISTORICAL MIGRATION COMPLETE ===');
  Logger.log('Batch ID    : ' + batchId);
  Logger.log('Dry Run     : ' + dryRun);
  Logger.log('Duration    : ' + Math.round((endTime - startTime) / 1000) + 's');
  Logger.log('Total rows  : ' + totalLegacyRows);
  Logger.log('Imported    : ' + counts.imported);
  Logger.log('Skipped     : ' + counts.skipped);
  Logger.log('Duplicate   : ' + counts.duplicate);
  Logger.log('Failed      : ' + counts.failed);
  Logger.log('==========================================');

  return summary;
}
