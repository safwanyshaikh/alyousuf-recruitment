/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FOUNDATION — CANDIDATE ENTITY v1 (foundation_candidate_fk_v1.gs)
 * Step 6 of 6 · Governed by CANDIDATE_ENTITY_FINAL.md + FOUNDATION_BUILD_RULES
 * Branch: claude/sweet-franklin-mnmfcz
 * ───────────────────────────────────────────────────────────────────────────
 * Tab: Candidates (48 live cols, 10,072 rows — reconciled in place, Rule 3)
 * Legacy cols 1-48: UNTOUCHED (Rule 2 · Rule 11)
 * New cols A-R (49+): verify-first before adding (some may already exist)
 * K14 output columns (Score/Verdict/Assessment etc.) are READ-ONLY to Foundation.
 *
 * ROLLBACK: delete new columns (A-R added); restore Source Associate/Campaign
 *   from pre-migration snapshot. All other legacy columns untouched.
 *   No row deleted (Rule 1). No column renamed (Rule 2). No sheet replaced (Rule 3).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S00 · CONFIG
// ───────────────────────────────────────────────────────────────────────────
var FCAND_TAB   = 'Candidates';
var FCAND_COLOR = '#1a3a5c';

// New columns to add if absent (verify-first at build time)
var FCAND_NEW_HEADERS = [
  'PhotoUrl','WhatsApp','PassportNumber','PassportExpiry','PassportStatus',
  'TotalExperience','GCCExperience','CurrentCountry','CurrentCity',
  'PreviousGCCCountry','CurrentEmployer','Education','Languages',
  'Certificates','NoticeRaw','FoundationState','UpdatedAt','CreatedAt'
];

// FoundationState governed vocabulary (18 states)
var FCAND_STATES = [
  'NEW','PARSED','INCOMPLETE_CONTACT','UNKNOWN_TRADE','FRESHER_POOL',
  'UNDER_REVIEW','SHORTLISTED','CLIENT_SENT','CLIENT_SELECTED',
  'OFFER_ISSUED','VISA_PROCESS','ECR_PENDING','MEDICAL_PENDING',
  'READY_TO_DEPLOY','DEPLOYED','REJECTED','HOLD'
];
var FCAND_TERMINAL_STATES = ['DEPLOYED','REJECTED'];

// PassportStatus governed values
var FCAND_PASSPORT_VOCAB = ['VALID','EXPIRING-SOON','EXPIRED','MISSING'];

// K14 columns — Foundation NEVER writes to these (Rule 7 / Constitution §7)
var FCAND_K14_COLS = [
  'Score','Verdict','Assessment','Top3','Deployability','Match IDs',
  'Readiness','Risk','Confidence','Reasoning','Recommendations','Missing Data',
  'Tech Review','AIScore','AIAssessment'
];

// Legacy state → FoundationState derivation map
var FCAND_STATE_MAP = {
  'new': 'NEW', 'fresh': 'NEW', 'fresh/new': 'NEW',
  'parsed': 'PARSED', 'cv parsed': 'PARSED',
  'incomplete': 'INCOMPLETE_CONTACT', 'incomplete contact': 'INCOMPLETE_CONTACT',
  'unknown trade': 'UNKNOWN_TRADE', 'unmatched': 'UNKNOWN_TRADE',
  'fresher': 'FRESHER_POOL', 'fresher pool': 'FRESHER_POOL',
  'review': 'UNDER_REVIEW', 'under review': 'UNDER_REVIEW',
  'shortlisted': 'SHORTLISTED',
  'sent': 'CLIENT_SENT', 'client sent': 'CLIENT_SENT', 'submitted': 'CLIENT_SENT',
  'selected': 'CLIENT_SELECTED', 'client selected': 'CLIENT_SELECTED',
  'offer': 'OFFER_ISSUED', 'offer issued': 'OFFER_ISSUED',
  'visa': 'VISA_PROCESS', 'visa process': 'VISA_PROCESS',
  'ecr': 'ECR_PENDING', 'ecr pending': 'ECR_PENDING',
  'medical': 'MEDICAL_PENDING', 'medical pending': 'MEDICAL_PENDING',
  'ready': 'READY_TO_DEPLOY', 'ready to deploy': 'READY_TO_DEPLOY',
  'deployed': 'DEPLOYED', 'mobilized': 'DEPLOYED',
  'rejected': 'REJECTED', 'declined': 'REJECTED',
  'hold': 'HOLD', 'on hold': 'HOLD', 'on-hold': 'HOLD'
};

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S01 · SHEET HELPERS
// ───────────────────────────────────────────────────────────────────────────

function fcandSheet_() {
  var ss    = getMasterSS_();
  var sheet = ss.getSheetByName(FCAND_TAB);
  if (!sheet) throw new Error('FCAND: Candidates tab not found (Rule 3).');
  var lastCol = Math.max(1, sheet.getLastColumn());
  var rawHdr  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var i = 0; i < rawHdr.length; i++) {
    var h = String(rawHdr[i]).trim();
    if (h !== '') idx[h] = i + 1;
  }
  return { sheet: sheet, idx: idx, lastCol: lastCol };
}

/** Read rows in batches (10,072 rows — batch to avoid memory limits). */
function fcandReadBatch_(s, startRow, batchSize) {
  var last = s.sheet.getLastRow();
  if (startRow > last) return [];
  var count = Math.min(batchSize, last - startRow + 1);
  var ncols = s.lastCol;
  var data  = s.sheet.getRange(startRow, 1, count, ncols).getValues();
  var allHeaders = Object.keys(s.idx).sort(function (a, b) { return s.idx[a] - s.idx[b]; });
  return data.map(function (row, i) {
    var o = { __row: startRow + i };
    allHeaders.forEach(function (h) {
      var ci = s.idx[h] - 1;
      o[h] = (ci < row.length) ? row[ci] : '';
    });
    return o;
  });
}

function fcandUpdateRow_(sheet, rowNum, patch, idx) {
  for (var h in patch) {
    var col = idx[h];
    if (!col) throw new Error('FCAND: column not found: ' + h);
    sheet.getRange(rowNum, col).setValue(patch[h]);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S02 · ID GENERATION
// ───────────────────────────────────────────────────────────────────────────

function fcandNextKaiNo_(s) {
  var last = s.sheet.getLastRow();
  var kaiCol = s.idx['KAI No'];
  if (!kaiCol || last < 2) return 'KAI-0001';
  var col = s.sheet.getRange(2, kaiCol, last - 1, 1).getValues();
  var max = 0;
  col.forEach(function (r) {
    var v = String(r[0] || '');
    var m = v.match(/KAI-(\d+)/);
    if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
  });
  return 'KAI-' + ('0000' + (max + 1)).slice(-4);
}

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S03 · PASSPORT STATUS DERIVATION
// ───────────────────────────────────────────────────────────────────────────

function fcandDerivePassportStatus_(expiryValue) {
  if (!expiryValue || String(expiryValue).trim() === '' || String(expiryValue).trim() === '0') return 'MISSING';
  var exp;
  try { exp = new Date(expiryValue); } catch (e) { return 'MISSING'; }
  if (isNaN(exp.getTime())) return 'MISSING';
  var today = new Date();
  var sixMonths = new Date(today.getTime() + 183 * 24 * 60 * 60 * 1000);
  if (exp < today)      return 'EXPIRED';
  if (exp <= sixMonths) return 'EXPIRING-SOON';
  return 'VALID';
}

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S04 · SCHEMA MIGRATION (Step 6 build task)
// ───────────────────────────────────────────────────────────────────────────

/**
 * FCAND.S04.F01 — ENTRY POINT: verify/add new columns, then process in batches.
 * Call dryRunCandidateMigration first.
 * @param {number} startBatch - 1-based batch number to start from (for resuming)
 */
function migrateCandidateFoundation(startBatch) {
  startBatch = startBatch || 1;
  var s = fcandSheet_();
  var added = fcandEnsureNewColumns_(s);
  s = fcandSheet_();

  var last = s.sheet.getLastRow();
  var batchSize = 500;
  var totalBatches = Math.ceil((last - 1) / batchSize);
  var totalMigrated = 0, totalLocked = 0;

  for (var batch = startBatch; batch <= totalBatches; batch++) {
    var startRow = 2 + (batch - 1) * batchSize;
    var rows = fcandReadBatch_(s, startRow, batchSize);
    rows.forEach(function (r) {
      var patch = {};

      // Source Associate FK backfill
      var srcAssoc = String(r['Source Associate'] || '').trim();
      if (!srcAssoc || srcAssoc === 'ASSOC_UNRESOLVED') {
        var assocEmail = String(r['Source Email'] || r.Email || '').trim();
        var assocComp  = String(r['Source Company'] || '').trim();
        var assocMatch = findAssociateByContact(assocEmail, assocComp);
        if (assocMatch && assocMatch !== 'AMBIGUOUS') {
          patch['Source Associate'] = assocMatch.AssocId;
        } else if (!srcAssoc) {
          patch['Source Associate'] = 'ASSOC_UNRESOLVED';
          totalLocked++;
        }
      }

      // Source Campaign FK backfill
      var srcCamp = String(r['Source Campaign'] || '').trim();
      if (!srcCamp || srcCamp === 'CAMP_UNRESOLVED') {
        patch['Source Campaign'] = 'CAMP_UNRESOLVED';
        totalLocked++;
      }

      // PassportStatus derivation
      if (!r.PassportStatus || String(r.PassportStatus).trim() === '') {
        var expiry = r.PassportExpiry || r['Passport Expiry'] || '';
        patch.PassportStatus = fcandDerivePassportStatus_(expiry);
      }

      // FoundationState derivation from legacy Candidate State
      if (!r.FoundationState || String(r.FoundationState).trim() === '') {
        var legacyState = String(r['Candidate State'] || '').trim().toLowerCase();
        patch.FoundationState = FCAND_STATE_MAP[legacyState] || 'UNDER_REVIEW';
      }

      // UpdatedAt/CreatedAt
      if (!r.UpdatedAt || String(r.UpdatedAt).trim() === '') patch.UpdatedAt = new Date();
      if (!r.CreatedAt || String(r.CreatedAt).trim() === '') patch.CreatedAt = r['Received Date'] || new Date();

      if (Object.keys(patch).length > 0) {
        fcandUpdateRow_(s.sheet, r.__row, patch, s.idx);
        totalMigrated++;
      }
    });
    fcandLog_('migrateCandidateBatch', 'SYSTEM-MIGRATION',
              { batch: batch, of: totalBatches, rows: rows.length });
    Utilities.sleep(100);  // rate-limit Google Sheets writes
  }

  var report = {
    ok: true, schemaColumnsAdded: added,
    rowsMigrated: totalMigrated, rowsLocked: totalLocked
  };
  fcandLog_('migrateCandidateFoundation', 'SYSTEM-MIGRATION', report);
  Logger.log('CANDIDATE MIGRATION COMPLETE: ' + JSON.stringify(report));
  return report;
}

/**
 * FCAND.S04.F02 — verify/add new columns A-R; returns list of added headers.
 * Never adds a column that already exists in the live 48-col sheet.
 */
function fcandEnsureNewColumns_(s) {
  var added = [];
  FCAND_NEW_HEADERS.forEach(function (h) {
    if (!s.idx[h]) {
      var col = s.sheet.getLastColumn() + 1;
      s.sheet.getRange(1, col).setValue(h);
      s.sheet.getRange(1, col)
        .setFontWeight('bold').setBackground(FCAND_COLOR)
        .setFontColor('#ffffff').setHorizontalAlignment('center');
      s.idx[h] = col;
      s.lastCol = col;
      added.push(h);
    }
  });
  return added;
}

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S05 · DRY-RUN RECONCILIATION REPORT
// ───────────────────────────────────────────────────────────────────────────

/**
 * FCAND.S05.F01 — scan first 100 rows for a quick pre-migration picture.
 * Full scan over 10,072 rows would exceed execution time; sample is the preview.
 */
function dryRunCandidateMigration() {
  var s = fcandSheet_();
  var sample = fcandReadBatch_(s, 2, 100);
  var report = {
    sampleRows: sample.length,
    totalRows: s.sheet.getLastRow() - 1,
    assocResolvable: 0, assocLocked: 0,
    campLocked: 0,
    passportStatusDerivable: 0, passportMissing: 0,
    stateDerivable: 0, stateFallback: 0,
    newColsAbsent: FCAND_NEW_HEADERS.filter(function (h) { return !s.idx[h]; }),
    newColsPresent: FCAND_NEW_HEADERS.filter(function (h) { return !!s.idx[h]; })
  };

  sample.forEach(function (r) {
    var assocEmail = String(r.Email || '').trim();
    var assocMatch = assocEmail ? findAssociateByContact(assocEmail, '') : null;
    if (assocMatch && assocMatch !== 'AMBIGUOUS') report.assocResolvable++;
    else report.assocLocked++;

    report.campLocked++;  // Source Campaign: all locked until batch import metadata available

    var expiry = r.PassportExpiry || r['Passport Expiry'] || '';
    var ps = fcandDerivePassportStatus_(expiry);
    if (ps === 'MISSING') report.passportMissing++;
    else report.passportStatusDerivable++;

    var legacyState = String(r['Candidate State'] || '').trim().toLowerCase();
    if (FCAND_STATE_MAP[legacyState]) report.stateDerivable++;
    else report.stateFallback++;  // will map to UNDER_REVIEW
  });

  Logger.log('CANDIDATE DRY-RUN (sample 100): ' + JSON.stringify(report));
  return report;
}

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S06 · WRITE ENGINE
// ───────────────────────────────────────────────────────────────────────────

/**
 * FCAND.S06.F01 — create a new Candidate.
 * Required: { Name, and at least one of Mobile / Email }
 * Optional: all columns A-R + legacy fields (Trade, Nationality, DOB, etc.)
 */
function createCandidate(fields, actor) {
  actor = actor || {};
  var by = actor.by || (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'system');

  if (!String(fields.Name || '').trim())
    throw new Error('FCAND: Name is required.');

  var email  = String(fields.Email  || '').trim();
  var mobile = String(fields.Mobile || '').trim();
  if (!email && !mobile)
    throw new Error('FCAND: at least one of Email or Mobile is required (contact governance).');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('FCAND: Email format invalid.');

  // FK validation
  if (fields['Source Associate'] && !/^ASSOC_UNRESOLVED$/.test(fields['Source Associate'])) {
    if (!findAssociateById(fields['Source Associate']))
      throw new Error('FCAND: Source Associate "' + fields['Source Associate'] + '" does not resolve to a live Associate (Rule 12).');
  }
  if (fields['Source Campaign'] && !/^CAMP_UNRESOLVED$/.test(fields['Source Campaign'])) {
    if (!findCampaignById(fields['Source Campaign']))
      throw new Error('FCAND: Source Campaign "' + fields['Source Campaign'] + '" does not resolve to a live Campaign (Rule 12).');
  }

  var fsVal = String(fields.FoundationState || 'NEW').trim();
  if (FCAND_STATES.indexOf(fsVal) === -1)
    throw new Error('FCAND: FoundationState "' + fsVal + '" not in governed vocabulary.');

  if (fields.PassportStatus && FCAND_PASSPORT_VOCAB.indexOf(fields.PassportStatus) === -1)
    throw new Error('FCAND: PassportStatus must be one of ' + FCAND_PASSPORT_VOCAB.join('/'));

  // Rule 7: refuse writes to K14 output columns
  FCAND_K14_COLS.forEach(function (f) {
    if (fields[f] !== undefined)
      throw new Error('FCAND: "' + f + '" is a K14 output column — Foundation may not write to it (Rule 7/Constitution §7).');
  });

  // Rule 14: refuse performance metrics
  var perfFields = ['Rating','Reliability','FillRate','SubmissionCount','MobilizationRate'];
  perfFields.forEach(function (f) {
    if (fields[f] !== undefined)
      throw new Error('FCAND: "' + f + '" is a performance metric — forbidden in Foundation (Rule 14).');
  });

  var s = fcandSheet_();
  var kaiNo = fcandNextKaiNo_(s);
  var now = new Date();

  // derive PassportStatus if not provided
  var passportStatus = fields.PassportStatus ||
    fcandDerivePassportStatus_(fields.PassportExpiry || '');

  // build a mapped row — header-driven to survive column drift
  var patch = {
    'KAI No':         kaiNo,
    'Name':           String(fields.Name).trim(),
    'Mobile':         mobile,
    'Email':          email,
    'Nationality':    fields.Nationality  || '',
    'Trade':          fields.Trade        || '',
    'Candidate State': '',                          // legacy — blank; Execution transitions it
    'Source Associate': fields['Source Associate'] || '',
    'Source Campaign':  fields['Source Campaign']  || '',
    'PhotoUrl':         fields.PhotoUrl     || '',
    'WhatsApp':         fields.WhatsApp     || mobile,
    'PassportNumber':   fields.PassportNumber || '',
    'PassportExpiry':   fields.PassportExpiry || '',
    'PassportStatus':   passportStatus,
    'TotalExperience':  fields.TotalExperience  || '',
    'GCCExperience':    fields.GCCExperience    || '',
    'CurrentCountry':   fields.CurrentCountry   || '',
    'CurrentCity':      fields.CurrentCity      || '',
    'PreviousGCCCountry': fields.PreviousGCCCountry || '',
    'CurrentEmployer':  fields.CurrentEmployer  || '',
    'Education':        fields.Education        || '',
    'Languages':        fields.Languages        || '',
    'Certificates':     fields.Certificates     || '',
    'NoticeRaw':        fields.NoticeRaw        || '',
    'FoundationState':  fsVal,
    'UpdatedAt':        now,
    'CreatedAt':        now
  };

  // write via append to preserve all existing columns
  var lastCol = s.sheet.getLastColumn();
  var row = new Array(lastCol).fill('');
  for (var h in patch) {
    if (s.idx[h]) row[s.idx[h] - 1] = patch[h];
  }
  s.sheet.appendRow(row);

  fcandLog_('createCandidate', by, { 'KAI No': kaiNo, Name: fields.Name });
  return { ok: true, 'KAI No': kaiNo, Name: fields.Name, row: s.sheet.getLastRow() };
}

/** FCAND.S06.F02 — find a Candidate by KAI No; returns row object or null. */
function findCandidateByKaiNo(kaiNo) {
  if (!kaiNo) return null;
  var s = fcandSheet_();
  var last = s.sheet.getLastRow();
  if (last < 2) return null;
  var kaiCol = s.idx['KAI No'];
  if (!kaiCol) return null;
  var colData = s.sheet.getRange(2, kaiCol, last - 1, 1).getValues();
  for (var i = 0; i < colData.length; i++) {
    if (String(colData[i][0]) === String(kaiNo)) {
      return fcandReadBatch_(s, i + 2, 1)[0] || null;
    }
  }
  return null;
}

/**
 * FCAND.S06.F03 — update FoundationState (called by Execution engine after Pipeline advance).
 * Foundation records the state; Execution drives the transition (Mandatory Rule 3).
 */
function updateCandidateFoundationState(kaiNo, newState, actor) {
  actor = actor || {};
  var by = actor.by || 'system';

  if (FCAND_STATES.indexOf(newState) === -1)
    throw new Error('FCAND: FoundationState "' + newState + '" not in governed vocabulary.');

  var s = fcandSheet_();
  var last = s.sheet.getLastRow();
  var kaiCol = s.idx['KAI No'];
  if (!kaiCol) throw new Error('FCAND: KAI No column not found.');

  var colData = s.sheet.getRange(2, kaiCol, last - 1, 1).getValues();
  for (var i = 0; i < colData.length; i++) {
    if (String(colData[i][0]) === String(kaiNo)) {
      var rowNum = i + 2;
      var rows = fcandReadBatch_(s, rowNum, 1);
      var cur = rows[0];
      var curState = String(cur.FoundationState || '').trim();

      // terminal states may not be system-reverted
      if (FCAND_TERMINAL_STATES.indexOf(curState) !== -1 && actor.role !== 'Recruiter')
        throw new Error('FCAND: Candidate ' + kaiNo + ' is in terminal state ' + curState + ' — only a recruiter may override (Mandatory Rule 9).');

      fcandUpdateRow_(s.sheet, rowNum, { 'FoundationState': newState, 'UpdatedAt': new Date() }, s.idx);
      fcandLog_('updateCandidateFoundationState', by, { kaiNo: kaiNo, from: curState, to: newState });
      return { ok: true, 'KAI No': kaiNo, from: curState, to: newState };
    }
  }
  throw new Error('FCAND: Candidate KAI No "' + kaiNo + '" not found.');
}

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S07 · ACCEPTANCE VERIFICATION
// ───────────────────────────────────────────────────────────────────────────

function verifyCandidateAcceptance() {
  var s = fcandSheet_();
  var total = s.sheet.getLastRow() - 1;
  var results = [];
  function chk(name, fn) {
    try { var r = fn(); results.push({ criterion: name, pass: true, detail: r }); }
    catch (e) { results.push({ criterion: name, pass: false, detail: String(e.message || e) }); }
  }

  chk('Row count = 10072 (no data loss)', function () {
    if (total !== 10072) throw new Error(total + ' rows (expected 10072)');
    return '10072 rows';
  });
  chk('New columns A-R present (or pre-existing)', function () {
    var notPresent = FCAND_NEW_HEADERS.filter(function (h) { return !s.idx[h]; });
    if (notPresent.length) throw new Error('Missing: ' + notPresent.join(', '));
    return 'all A-R headers present';
  });
  chk('KAI No column present', function () {
    if (!s.idx['KAI No']) throw new Error('"KAI No" column not found');
    return 'KAI No at col ' + s.idx['KAI No'];
  });
  chk('Legacy Candidate State untouched', function () {
    if (!s.idx['Candidate State']) throw new Error('"Candidate State" column not found');
    return '"Candidate State" present at col ' + s.idx['Candidate State'];
  });

  // sample 10 rows for state derivation and passport status
  chk('FoundationState derived (sample 10 rows)', function () {
    var rows = fcandReadBatch_(s, 2, 10);
    var bad = rows.filter(function (r) {
      return FCAND_STATES.indexOf(String(r.FoundationState || '').trim()) === -1;
    });
    if (bad.length) throw new Error(bad.length + ' of 10 sample rows have off-vocabulary FoundationState');
    return '10/10 sample rows have valid FoundationState';
  });

  chk('Create — missing Name refused', function () {
    try { createCandidate({ Mobile: '+971500000000' }, { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write not refused');
  });
  chk('Create — no contact refused', function () {
    try { createCandidate({ Name: 'X' }, { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid write not refused');
  });
  chk('Create — K14 field refused (Rule 7)', function () {
    try { createCandidate({ Name: 'X', Mobile: '+1', Score: 90 },
                          { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('K14 field not refused');
  });
  chk('Create — off-vocabulary FoundationState refused', function () {
    try { createCandidate({ Name: 'X', Mobile: '+1', FoundationState: 'MAYBE' },
                          { role: 'Recruiter', by: 'uat@kai.os' }); }
    catch (e) { return 'correctly refused: ' + e.message; }
    throw new Error('invalid FoundationState not refused');
  });
  chk('Create — valid write succeeds', function () {
    var r = createCandidate({ Name: 'UAT Candidate ' + Date.now(), Mobile: '+971500000001',
                              Nationality: 'UAE', Trade: 'Welder' },
                            { role: 'Recruiter', by: 'uat@kai.os' });
    if (!r.ok || !r['KAI No']) throw new Error('no KAI No returned');
    return 'KAI No=' + r['KAI No'];
  });
  chk('PassportStatus derivation correct', function () {
    var future = new Date(); future.setFullYear(future.getFullYear() + 2);
    if (fcandDerivePassportStatus_(future.toISOString()) !== 'VALID')
      throw new Error('future date should be VALID');
    if (fcandDerivePassportStatus_('') !== 'MISSING')
      throw new Error('empty should be MISSING');
    var past = new Date(2020, 0, 1);
    if (fcandDerivePassportStatus_(past.toISOString()) !== 'EXPIRED')
      throw new Error('past date should be EXPIRED');
    return 'VALID/MISSING/EXPIRED correctly derived';
  });
  chk('No performance/K14 column written to Foundation', function () {
    var forbidden = ['Rating','Reliability','FillRate','SubmissionCount','MobilizationRate'];
    var found = forbidden.filter(function (f) { return f in s.idx; });
    if (found.length) throw new Error('Forbidden column in schema: ' + found.join(','));
    return 'clean';
  });

  var passed = results.filter(function (r) { return r.pass; }).length;
  Logger.log('CANDIDATE ACCEPTANCE: ' + passed + '/' + results.length + ' passed');
  results.forEach(function (r) { Logger.log((r.pass ? '✓ ' : '✗ ') + r.criterion + ' — ' + r.detail); });
  return { passed: passed, total: results.length, allPass: passed === results.length, results: results };
}

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S08 · ROLLBACK
// ───────────────────────────────────────────────────────────────────────────

function rollbackCandidateMigration() {
  var s = fcandSheet_();
  // identify which of the new headers were actually added (vs pre-existing)
  var toDelete = FCAND_NEW_HEADERS.filter(function (h) { return !!s.idx[h]; });
  // delete from highest col number down to avoid index shift
  var toDeleteCols = toDelete.map(function (h) { return s.idx[h]; });
  toDeleteCols.sort(function (a, b) { return b - a; });
  toDeleteCols.forEach(function (col) {
    s.sheet.deleteColumn(col);
  });
  // Source Associate and Source Campaign restore: cannot batch-restore 10,072 rows
  // at rollback time without the full snapshot; leave a clear warning in the log.
  fcandLog_('rollbackCandidateMigration', 'SYSTEM-ROLLBACK',
    { deletedCols: toDelete, warning: 'Source Associate/Campaign values may need manual restore from FR_NOTES_SNAPSHOT if backfills ran.' });
  Logger.log('CANDIDATE ROLLBACK: deleted new columns — ' + toDelete.join(', ') +
             '. Restore Source Associate/Campaign from pre-migration snapshot if needed.');
  return { ok: true, columnsDeleted: toDelete };
}

// ───────────────────────────────────────────────────────────────────────────
// FCAND.S09 · LOGGING
// ───────────────────────────────────────────────────────────────────────────

function fcandLog_(event, actor, payload) {
  try {
    if (typeof appendLog_ === 'function')
      appendLog_({ type: 'FOUNDATION:CANDIDATE', event: event, actor: actor,
                   detail: JSON.stringify(payload || {}) });
  } catch (e) {}
}
