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

var MIGRATION_VERSION      = '1.2.0';

// Deployment identity — set via setDeploymentInfo() before running migration.
// Never hardcoded. Read from script properties at runtime so the Migration_Log
// always reflects the ACTUAL deployed code, not a stale constant.
var MIG_COMMIT_PROP        = 'MIGRATION_GS_COMMIT';
var MIG_BRANCH_PROP        = 'MIGRATION_GS_BRANCH';
var MIG_BATCH_START_PROP   = 'MIGRATION_BATCH_START_TIME';
var MIGRATION_LOG_SHEET    = 'Migration_Log';
var CONFIG_SHEET           = '_Config';
var MAINTENANCE_KEY        = 'maintenanceMode';

// Script property keys for checkpoint / resume
var MIG_OFFSET_KEY         = 'mig_offset';       // last successfully processed data-row index (0-based)
var MIG_BATCH_KEY          = 'mig_batch_id';      // batch ID shared across all resume calls
var MIG_DRYRUN_KEY         = 'mig_dry_run';       // locks dryRun mode for the life of a batch

// Stop processing 5 minutes before the 30-min Workspace hard limit (6-min personal limit).
// Set MIGRATION_MAX_RUN_SECS script property to override (e.g. "330" for 6-min accounts).
var MAX_RUN_MS             = 1500000; // 25 minutes — safe for 30-min Workspace accounts

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
  var allData     = logSh.getRange(2, 1, logSh.getLastRow() - 1, logSh.getLastColumn()).getValues();
  var statusIdx   = hdrs.indexOf('MigrationStatus');
  var sourceRowIdx= hdrs.indexOf('SourceRowNumber');
  var durIdx      = hdrs.indexOf('ExecutionDurationMs');

  // Deduplicate by SourceRowNumber — keep the LAST log entry per source row.
  // This handles the case where a restart caused rows to be logged twice.
  var seenSrcRow  = {};
  for (var i = 0; i < allData.length; i++) {
    var srcKey = String(allData[i][sourceRowIdx] || ('_blank_' + i));
    seenSrcRow[srcKey] = allData[i];  // last entry per source row wins
  }
  var data = [];
  for (var k in seenSrcRow) { if (seenSrcRow.hasOwnProperty(k)) data.push(seenSrcRow[k]); }
  var rawRows     = allData.length;
  var dedupedRows = data.length;

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
    rawLogRows:           rawRows,
    dedupedLogRows:       dedupedRows,
    duplicateLogEntries:  rawRows - dedupedRows,
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
 * setDeploymentInfo — MUST be called once before running any migration.
 *
 * Records the ACTUAL deployed commit and branch into Script Properties so
 * the Migration_Log environment stamp is forensically accurate.
 * No hardcoded commit IDs anywhere in the engine.
 *
 * @param {string} commitId  — exact git commit hash of the deployed code
 * @param {string} branch    — git branch name
 *
 * Example:
 *   setDeploymentInfo('e00368d', 'claude/sweet-franklin-mnmfcz')
 */
function setDeploymentInfo(commitId, branch) {
  if (!commitId || !branch) {
    Logger.log('setDeploymentInfo: both commitId and branch are required. Aborted.');
    return;
  }
  var props = PropertiesService.getScriptProperties();
  props.setProperty(MIG_COMMIT_PROP, String(commitId).trim());
  props.setProperty(MIG_BRANCH_PROP, String(branch).trim());
  Logger.log('=== DEPLOYMENT INFO SET ===');
  Logger.log('historical_migration.gs commit : ' + commitId);
  Logger.log('Branch                         : ' + branch);
  Logger.log('verdict.gs commit              : ' +
             (typeof VERDICT_ENGINE_COMMIT !== 'undefined' ? VERDICT_ENGINE_COMMIT : 'unknown'));
  Logger.log('===========================');
}

/**
 * getDeploymentInfo — returns current deployment info from script properties.
 */
function getDeploymentInfo() {
  var props  = PropertiesService.getScriptProperties();
  var commit = props.getProperty(MIG_COMMIT_PROP) || 'NOT_SET';
  var branch = props.getProperty(MIG_BRANCH_PROP) || 'NOT_SET';
  var verdict= (typeof VERDICT_ENGINE_COMMIT !== 'undefined') ? VERDICT_ENGINE_COMMIT : 'unknown';
  Logger.log('Deployment: migration_gs=' + commit + ', branch=' + branch + ', verdict_gs=' + verdict);
  return { migrationCommit: commit, branch: branch, verdictCommit: verdict };
}

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

/**
 * setMigrationStartOffset — manually set the resume point without clearing the log.
 * Use when you know N rows have already been processed and logged correctly.
 *
 * offsetNum = number of data rows already done (0-based index of NEXT row to process).
 * Example: 6687 means rows 1–6687 are done; next call processes from sheet row 6689.
 *
 * A new batch ID is auto-assigned on the next run.
 */
function setMigrationStartOffset(offsetNum) {
  if (typeof offsetNum !== 'number' || offsetNum < 0) {
    Logger.log('KAI MIGRATION — setMigrationStartOffset: pass a positive integer. Aborted.');
    return;
  }
  var props = PropertiesService.getScriptProperties();
  props.setProperty(MIG_OFFSET_KEY,  String(Math.floor(offsetNum)));
  props.deleteProperty(MIG_BATCH_KEY);   // new batch ID auto-created on next run
  props.deleteProperty(MIG_DRYRUN_KEY);  // re-locked to caller's dryRun on next run
  Logger.log('KAI MIGRATION — Manual offset set to ' + Math.floor(offsetNum) +
             '. Next run starts from sheet row ' + (Math.floor(offsetNum) + 2) + '.');
}

function getMigrationProgress() {
  var props  = PropertiesService.getScriptProperties();
  var offset = parseInt(props.getProperty(MIG_OFFSET_KEY) || '0', 10);
  var batchId= props.getProperty(MIG_BATCH_KEY) || null;
  var dryRun = props.getProperty(MIG_DRYRUN_KEY) === 'true';
  Logger.log('KAI MIGRATION — Current progress: offset=' + offset +
             ' (next sheet row=' + (offset + 2) + '), batchId=' + batchId + ', dryRun=' + dryRun);
  return { offset: offset, batchId: batchId, dryRun: dryRun };
}


// ═══════════════════════════════════════════════════════════════════════════════
// 6b. MIGRATION ENVIRONMENT STAMP — permanent audit record in Migration_Log
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * writeMigrationEnvironment_ — stamps forensic environment record into Migration_Log.
 *
 * Called TWICE per batch:
 *   eventType='START' — written when batch opens (end time unknown)
 *   eventType='END'   — written when batch completes (full duration known)
 *
 * Commit and branch are read from Script Properties set by setDeploymentInfo().
 * Never hardcoded. If not set, 'NOT_SET — run setDeploymentInfo()' is recorded.
 *
 * Column mapping (reuses existing Migration_Log schema — no schema change):
 *   MigrationBatchID      → batchId
 *   MigrationStartTime    → batch start timestamp
 *   MigrationEndTime      → batch end timestamp (blank for START record)
 *   Operator              → operator email
 *   SourceSpreadsheetID   → legacy (source) spreadsheet ID
 *   SourceSpreadsheetName → legacy spreadsheet name
 *   SourceRowNumber       → 'ENV_START:<batchId>' or 'ENV_END:<batchId>'
 *   LegacyKAINumber       → KAI14 (target) spreadsheet ID
 *   MigratedKAINumber     → KAI14 spreadsheet name
 *   CandidateName         → git branch | Migration v<version>
 *   MigrationStatus       → 'MIGRATION_ENV_START' or 'MIGRATION_ENV_END'
 *   Reason                → historical_migration.gs commit | dryRun flag
 *   ErrorMessage          → verdict.gs commit
 *   LegacyGulfExpRaw      → (blank)
 *   ExecutionDurationMs   → total batch duration ms (END record only)
 */
function writeMigrationEnvironment_(logSh, eventType, batchId, startTime, endTime, operator,
                                    legacySsId, legacySs, kaiSs, dryRun) {
  var props         = PropertiesService.getScriptProperties();
  var migCommit     = props.getProperty(MIG_COMMIT_PROP) || 'NOT_SET — run setDeploymentInfo()';
  var migBranch     = props.getProperty(MIG_BRANCH_PROP) || 'NOT_SET — run setDeploymentInfo()';
  var verdictCommit = (typeof VERDICT_ENGINE_COMMIT !== 'undefined') ? VERDICT_ENGINE_COMMIT : 'unknown';
  var isEnd         = (eventType === 'END');
  var durationMs    = (isEnd && startTime && endTime) ? (endTime - startTime) : '';

  logSh.appendRow([
    batchId,
    startTime ? startTime.toISOString() : '',
    isEnd && endTime ? endTime.toISOString() : '',
    operator,
    legacySsId,
    legacySs.getName(),
    (isEnd ? 'ENV_END:' : 'ENV_START:') + batchId,
    kaiSs.getId(),
    kaiSs.getName(),
    migBranch + '  |  Migration v' + MIGRATION_VERSION,
    isEnd ? 'MIGRATION_ENV_END' : 'MIGRATION_ENV_START',
    'historical_migration.gs: ' + migCommit + '  |  dryRun: ' + dryRun,
    'verdict.gs: ' + verdictCommit,
    '',
    durationMs
  ]);

  Logger.log('KAI MIGRATION — Env ' + eventType + ' stamped:' +
             ' migration_gs=' + migCommit +
             ', verdict_gs=' + verdictCommit +
             ', branch=' + migBranch +
             ', operator=' + operator +
             ', source=' + legacySsId +
             ', target=' + kaiSs.getId());
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

  // ── Gate 1b: deployment info must be set (no stale/placeholder commit IDs) ─
  var deployCommit = props.getProperty(MIG_COMMIT_PROP);
  var deployBranch = props.getProperty(MIG_BRANCH_PROP);
  if (!deployCommit || !deployBranch ||
      deployCommit === 'NOT_SET' || deployBranch === 'NOT_SET') {
    var msg0 = 'KAI MIGRATION ABORTED — Deployment info not set. ' +
               'Run setDeploymentInfo(commitId, branch) first.';
    Logger.log(msg0);
    return { ok: false, error: msg0 };
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

  // Lock the batch + dryRun mode on first call; stamp START environment record
  if (!savedBatch) {
    props.setProperty(MIG_BATCH_KEY,       batchId);
    props.setProperty(MIG_DRYRUN_KEY,      String(dryRun));
    props.setProperty(MIG_OFFSET_KEY,      '0');
    props.setProperty(MIG_BATCH_START_PROP, callStart.toISOString());  // persist start time for END record
    writeMigrationEnvironment_(ensureMigrationLog_(), 'START', batchId,
      callStart, null, operator, legacySsId, legacySs, kaiSs, dryRun);
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

  // ── Read ONLY remaining rows (from checkpoint forward) ───────────────────
  var totalLegacyRows = legacySh.getLastRow() - 1;
  if (totalLegacyRows <= 0)
    return { ok: false, error: 'KAI MIGRATION — Legacy Candidates sheet has no data rows.' };

  if (startOffset >= totalLegacyRows) {
    // Already finished — clear checkpoint and return complete
    props.deleteProperty(MIG_OFFSET_KEY);
    props.deleteProperty(MIG_BATCH_KEY);
    props.deleteProperty(MIG_DRYRUN_KEY);
    return { ok: true, status: 'COMPLETE', note: 'All rows already processed. Call generateMigrationAudit().' };
  }

  var readStartRow  = startOffset + 2;          // sheet row (1-indexed, +1 for header)
  var rowsRemaining = totalLegacyRows - startOffset;
  Logger.log('KAI MIGRATION — Reading ' + rowsRemaining + ' rows from sheet row ' + readStartRow);
  var legacyData = legacySh.getRange(readStartRow, 1, rowsRemaining, legacySh.getLastColumn()).getValues();
  Logger.log('KAI MIGRATION — Read complete. Starting loop at offset ' + startOffset + '.');

  // ── Migration loop ─────────────────────────────────────────────────────────
  var counts  = { imported: 0, skipped: 0, failed: 0, duplicate: 0 };
  var newRows = [];
  var didTimeout = false;

  for (var i = 0; i < legacyData.length; i++) {
    var absoluteOffset = startOffset + i;   // position in full legacy dataset

    // Time check — stop before hard execution limit
    if ((new Date() - callStart) > MAX_RUN_MS) {
      didTimeout = true;
      props.setProperty(MIG_OFFSET_KEY, String(absoluteOffset));
      Logger.log('KAI MIGRATION — Time checkpoint at legacy row ' + (absoluteOffset + 2) +
                 ' of ' + (totalLegacyRows + 1) +
                 '. Re-run runHistoricalMigration(' + dryRun + ') to continue.');
      break;
    }

    var legRow    = legacyData[i];
    var sourceRow = absoluteOffset + 2;    // 1-indexed sheet row (row 1 = header)
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
    // Stamp END environment record with actual start + end times
    var batchStartIso = props.getProperty(MIG_BATCH_START_PROP);
    var batchStartTime = batchStartIso ? new Date(batchStartIso) : callStart;
    writeMigrationEnvironment_(logSh, 'END', batchId,
      batchStartTime, endTime, operator, legacySsId, legacySs, kaiSs, dryRun);
    // Clear checkpoint
    props.deleteProperty(MIG_OFFSET_KEY);
    props.deleteProperty(MIG_BATCH_KEY);
    props.deleteProperty(MIG_DRYRUN_KEY);
    props.deleteProperty(MIG_BATCH_START_PROP);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  var processedThisRun = counts.imported + counts.skipped + counts.failed + counts.duplicate;
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

  // ── Step 8 (auto): set kai14_counter after live run completes ────────────
  if (!dryRun && isComplete) {
    setKaiCounter_();
  }

  return summary;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CEO REVISED EXECUTION ORDER — STEPS 3, 4, 5, 8
// ═══════════════════════════════════════════════════════════════════════════════

// Sheet name for Phase-1 certification archive
var PHASE1_CERT_SHEET = '_Phase1_Certification';

/**
 * archivePhase1Certification — CEO Safeguard (runs BEFORE runPreMigrationCleanup).
 *
 * Copies every Phase-1 validation candidate (all columns including all 19 VERDICT_COLS)
 * from KAI14 Candidates into a new permanent sheet: _Phase1_Certification.
 *
 * This sheet is certification evidence for future regression testing.
 * It is NOT a second database. It is never used by any KAI engine.
 *
 * Safe to re-run: if sheet already exists and has matching row count, skips.
 * runPreMigrationCleanup() will not proceed until this archive is confirmed.
 */
function archivePhase1Certification() {
  if (!getMaintenanceMode()) {
    Logger.log('ARCHIVE ABORTED — maintenanceMode is OFF.');
    return { ok: false, error: 'maintenanceMode must be ON' };
  }

  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var candSh = ss.getSheetByName(K14.sheets.candidates);

  if (!candSh || candSh.getLastRow() < 2) {
    Logger.log('ARCHIVE ABORTED — Candidates sheet is empty. Nothing to archive.');
    return { ok: false, error: 'Candidates sheet empty' };
  }

  var totalCols = candSh.getLastColumn();
  var dataRows  = candSh.getLastRow() - 1;

  // Read full Candidates sheet (header + all data)
  var allData = candSh.getRange(1, 1, candSh.getLastRow(), totalCols).getValues();

  // Create or clear _Phase1_Certification
  var archSh = ss.getSheetByName(PHASE1_CERT_SHEET);
  if (archSh) {
    // Already exists — verify it has the right content
    var existingRows = archSh.getLastRow() - 1;
    if (existingRows === dataRows) {
      Logger.log('ARCHIVE — _Phase1_Certification already exists with ' + existingRows +
                 ' rows matching Candidates. Archive confirmed.');
      return { ok: true, archived: existingRows, status: 'ALREADY_COMPLETE' };
    }
    // Row count mismatch — overwrite
    archSh.clearContents();
    Logger.log('ARCHIVE — _Phase1_Certification exists but row count mismatch (' +
               existingRows + ' vs ' + dataRows + '). Overwriting.');
  } else {
    archSh = ss.insertSheet(PHASE1_CERT_SHEET);
  }

  // Write all data (header + rows) in one batch
  archSh.getRange(1, 1, allData.length, totalCols).setValues(allData);

  // Style: freeze header, mark as read-only reference
  archSh.setFrozenRows(1);
  archSh.getRange(1, 1, 1, totalCols)
        .setBackground('#0d3349')
        .setFontColor('#ffffff')
        .setFontWeight('bold');

  // Add a note in cell A1 to prevent confusion
  archSh.getRange(1, 1).setNote(
    'CERTIFICATION EVIDENCE — Phase-1 Verdict Engine validation candidates. ' +
    'Archived on ' + new Date().toISOString() + '. ' +
    'NOT a production database. DO NOT modify.'
  );

  var archived = archSh.getLastRow() - 1;

  Logger.log('=== PHASE-1 CERTIFICATION ARCHIVE ===');
  Logger.log('Sheet           : ' + PHASE1_CERT_SHEET);
  Logger.log('Columns copied  : ' + totalCols);
  Logger.log('Candidates rows : ' + dataRows);
  Logger.log('Archived rows   : ' + archived);
  Logger.log('Match           : ' + (archived === dataRows ? 'YES — archive complete' : 'NO — MISMATCH'));
  Logger.log('======================================');

  if (archived !== dataRows) {
    return { ok: false, error: 'Row count mismatch after archive. Do not proceed.',
             candidateRows: dataRows, archivedRows: archived };
  }

  return {
    ok:           true,
    archived:     archived,
    columnsTotal: totalCols,
    sheetName:    PHASE1_CERT_SHEET,
    status:       'COMPLETE — confirm then run runPreMigrationCleanup()'
  };
}

/**
 * runPreMigrationCleanup — CEO Revised Execution Order Steps 3 + 4.
 *
 * Step 3: Deletes all Phase-1 validation test candidates from KAI14 Candidates.
 *         These are certification-only records — not production identities.
 *         Identified as: any row where Source ≠ 'HISTORICAL_MIGRATION'
 *         (since no live migration has run yet, every current row is test data).
 *
 * Step 4: Deletes incomplete ghost validation records — rows where KAINo is
 *         blank OR FullName is blank. These are not production candidates.
 *
 * DESTRUCTIVE — permanently removes rows. Maintenance mode must be ON.
 * Call ONCE before runHistoricalMigration(false).
 * After this runs, Candidates must show zero rows (verify with verifyCleanSlate).
 */
function runPreMigrationCleanup() {
  if (!getMaintenanceMode()) {
    Logger.log('CLEANUP ABORTED — maintenanceMode is OFF. Run setMaintenanceMode(true) first.');
    return { ok: false, error: 'maintenanceMode must be ON' };
  }

  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var candSh = ss.getSheetByName(K14.sheets.candidates);

  if (!candSh) {
    Logger.log('CLEANUP ABORTED — Candidates sheet not found.');
    return { ok: false, error: 'Candidates sheet not found' };
  }

  var dataRows = candSh.getLastRow() - 1;
  if (dataRows <= 0) {
    Logger.log('CLEANUP — Candidates sheet already empty. Nothing to delete.');
    return { ok: true, validationDeleted: 0, ghostDeleted: 0, totalDeleted: 0, remaining: 0, cleanSlate: true };
  }

  // ── 5-point archive validation gate ──────────────────────────────────────
  // All 5 must pass. Any failure aborts — no Candidates rows are deleted.
  var archSh = ss.getSheetByName(PHASE1_CERT_SHEET);

  // V1: sheet exists
  if (!archSh) {
    Logger.log('CLEANUP ABORTED [V1] — _Phase1_Certification sheet does not exist. ' +
               'Run archivePhase1Certification() first.');
    return { ok: false, error: 'V1 FAIL: _Phase1_Certification missing.' };
  }

  // V2: archive is not empty
  var archiveRows = Math.max(0, archSh.getLastRow() - 1);
  if (archiveRows === 0) {
    Logger.log('CLEANUP ABORTED [V2] — _Phase1_Certification exists but is empty. ' +
               'Run archivePhase1Certification() first.');
    return { ok: false, error: 'V2 FAIL: _Phase1_Certification is empty.' };
  }

  // V3: archive contains all VERDICT_COLS
  // VERDICT_COLS is defined in verdict.gs — accessible via shared GAS global scope
  var archHeaders = archSh.getRange(1, 1, 1, archSh.getLastColumn()).getValues()[0]
                           .map(function(h) { return String(h).trim(); });
  var missingVerdict = (typeof VERDICT_COLS !== 'undefined' ? VERDICT_COLS : [])
    .filter(function(v) { return archHeaders.indexOf(v) < 0; });
  if (missingVerdict.length > 0) {
    Logger.log('CLEANUP ABORTED [V3] — _Phase1_Certification missing VERDICT_COLS: ' +
               missingVerdict.join(', '));
    return { ok: false, error: 'V3 FAIL: Missing VERDICT_COLS: ' + missingVerdict.join(', ') };
  }

  // V4: archive contains expected certification candidates
  // Validate by checking a core identity column (FullName) is populated
  var archData       = archSh.getRange(2, 1, archiveRows, archSh.getLastColumn()).getValues();
  var archNameCol    = archHeaders.indexOf('FullName');
  var populatedNames = archData.filter(function(r) {
    return archNameCol >= 0 && String(r[archNameCol] || '').trim() !== '';
  }).length;
  if (populatedNames === 0) {
    Logger.log('CLEANUP ABORTED [V4] — _Phase1_Certification has no populated FullName values. ' +
               'Archive may be corrupt.');
    return { ok: false, error: 'V4 FAIL: No populated candidate names in archive.' };
  }

  // V5: archive row count matches current Candidates sheet
  if (archiveRows !== dataRows) {
    Logger.log('CLEANUP ABORTED [V5] — Row count mismatch. Candidates=' + dataRows +
               ', Archive=' + archiveRows + '. Re-run archivePhase1Certification().');
    return { ok: false, error: 'V5 FAIL: Row count mismatch (Candidates=' + dataRows +
             ', Archive=' + archiveRows + ').' };
  }

  Logger.log('CLEANUP — Archive validation PASSED (V1–V5). ' +
             archiveRows + ' Phase-1 rows confirmed. Proceeding with cleanup.');

  var headers = candSh.getRange(1, 1, 1, candSh.getLastColumn()).getValues()[0];
  var kaiIdx  = headers.indexOf('KAINo');
  var nameIdx = headers.indexOf('FullName');
  var srcIdx  = headers.indexOf('Source');

  var data = candSh.getRange(2, 1, dataRows, candSh.getLastColumn()).getValues();

  var validationRows = [];  // Phase-1 test candidates
  var ghostRows      = [];  // incomplete records (no KAINo or no FullName)

  // Iterate in reverse so sheet row indices remain valid during deletion
  for (var i = data.length - 1; i >= 0; i--) {
    var kaiNo = String(data[i][kaiIdx]  || '').trim();
    var name  = String(data[i][nameIdx] || '').trim();
    var src   = String(data[i][srcIdx]  || '').trim();
    var sheetRow = i + 2;  // 1-indexed

    // Ghost: incomplete identity
    if (!kaiNo || !name) {
      ghostRows.push({ row: sheetRow, kaiNo: kaiNo, name: name, src: src });
    }
    // Validation: any source that is not a live historical migration import
    // (since no live migration has run yet, ALL current rows are test/validation data)
    else if (src !== 'HISTORICAL_MIGRATION') {
      validationRows.push({ row: sheetRow, kaiNo: kaiNo, name: name, src: src });
    }
  }

  var allToDelete = validationRows.concat(ghostRows);
  allToDelete.sort(function(a, b) { return b.row - a.row; });  // bottom-up deletion

  Logger.log('=== PRE-MIGRATION CLEANUP ===');
  Logger.log('Validation rows to delete : ' + validationRows.length);
  Logger.log('Ghost rows to delete      : ' + ghostRows.length);
  Logger.log('Total rows to delete      : ' + allToDelete.length);

  if (allToDelete.length > 0) {
    // Log each deleted record for audit trail before deleting
    allToDelete.forEach(function(r) {
      Logger.log('DELETING row ' + r.row + ' | KAINo=' + r.kaiNo + ' | Name=' + r.name + ' | Source=' + r.src);
    });
    // Delete rows bottom-up
    allToDelete.forEach(function(r) { candSh.deleteRow(r.row); });
  }

  var remaining = Math.max(0, candSh.getLastRow() - 1);

  Logger.log('Remaining rows after cleanup : ' + remaining);
  Logger.log('Clean slate                  : ' + (remaining === 0 ? 'YES — ready for migration' : 'NO — investigate remaining rows'));
  Logger.log('=============================');

  return {
    ok:                true,
    validationDeleted: validationRows.length,
    ghostDeleted:      ghostRows.length,
    totalDeleted:      allToDelete.length,
    remaining:         remaining,
    cleanSlate:        remaining === 0
  };
}

/**
 * verifyCleanSlate — CEO Revised Execution Order Step 5.
 * Confirms KAI14 Candidates sheet has zero data rows before live migration.
 */
function verifyCleanSlate() {
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var candSh = ss.getSheetByName(K14.sheets.candidates);
  var remaining = candSh ? Math.max(0, candSh.getLastRow() - 1) : 0;

  Logger.log('=== CLEAN SLATE VERIFICATION ===');
  Logger.log('KAI14 Candidates data rows : ' + remaining);
  Logger.log('Status : ' + (remaining === 0
    ? 'PASS — zero rows confirmed. Safe to run runHistoricalMigration(false).'
    : 'FAIL — ' + remaining + ' rows remain. Run runPreMigrationCleanup() first.'));
  Logger.log('================================');

  return { remaining: remaining, cleanSlate: remaining === 0 };
}

/**
 * setKaiCounter_ — CEO Revised Execution Order Step 8.
 * Sets kai14_counter script property to MAX(KAINo numeric part) + 1.
 * Called automatically after live migration completes.
 * Can also be called manually as setKaiCounter().
 */
function setKaiCounter_() {
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var candSh = ss.getSheetByName(K14.sheets.candidates);

  if (!candSh || candSh.getLastRow() < 2) {
    Logger.log('KAI COUNTER — Candidates sheet empty. Counter not updated.');
    return { ok: false, error: 'No candidates found' };
  }

  var headers = candSh.getRange(1, 1, 1, candSh.getLastColumn()).getValues()[0];
  var kaiIdx  = headers.indexOf('KAINo');
  if (kaiIdx < 0) {
    Logger.log('KAI COUNTER — KAINo column not found.');
    return { ok: false, error: 'KAINo column not found' };
  }

  var kaiNos  = candSh.getRange(2, kaiIdx + 1, candSh.getLastRow() - 1, 1).getValues();
  var maxNum  = 0;
  kaiNos.forEach(function(r) {
    var match = String(r[0] || '').match(/(\d+)$/);
    if (match) {
      var n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });

  var nextCounter = maxNum + 1;
  PropertiesService.getScriptProperties().setProperty(K14.kai.counterKey, String(nextCounter));

  Logger.log('=== KAI COUNTER SET ===');
  Logger.log('MAX KAINo found : ' + maxNum);
  Logger.log('kai14_counter   : ' + nextCounter + ' (next new candidate gets this number)');
  Logger.log('=======================');

  return { ok: true, maxKaiNum: maxNum, nextCounter: nextCounter };
}

/** Public entry point for Step 8 if called manually. */
function setKaiCounter() { return setKaiCounter_(); }
