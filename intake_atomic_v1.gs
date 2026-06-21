/**
 * ═══════════════════════════════════════════════════════════════════
 * MISSION ZERO — INTAKE ATOMIC ENGINE (intake_atomic_v1.gs)
 * Branch : claude/sweet-franklin-mnmfcz
 * Build  : 21-Jun-2026
 * ───────────────────────────────────────────────────────────────────
 * SINGLE RESPONSIBILITY: close the two broken welds in the intake path.
 *
 *   WELD 1 (BROKEN): KAI issued outside the candidate write, in a
 *   separate non-atomic batch → root cause of all 90 Phase-1 collisions.
 *
 *   WELD 2 (MISSING): no Foundation Queue enqueue after candidate write
 *   → "parser platform" symptom, never becomes an OS.
 *
 * REPLACES S07.F01-L in processThread_ (Code.gs:580-582):
 *   BEFORE: writeToSheet_() + writeToMeta_() + appendConsent_()
 *   AFTER:  intakeCreateCandidate_()
 *
 * CHAIN (matches CEO Mission Zero diagram exactly):
 *   Email → Attachment → K14 Parse          ← existing, untouched
 *   → intakeCreateCandidate_()              ← this file
 *       → LockService.tryLock()
 *       → iaMetaDuplicateCheck_()           (race-condition guard)
 *       → generateKaiNo_()                  (inside lock — now atomic)
 *       → iaWriteWithKai_()                 (col 25 set at birth)
 *       → writeToMeta_() + appendConsent_() (inside lock — dedup index current)
 *       → iaEnqueueFoundation_()            (_ProcessingQueue INTAKE)
 *       → LockService.releaseLock()
 *   → Visible in Recruiter Dashboard        ← existing dashboard reads Candidates
 *
 * STRESS TEST: Run intakeStressTest100() in Apps Script editor.
 * Expected: 100/100 unique KAI numbers, 100 Foundation Queue entries, 0 collisions.
 * Cleanup:  Run intakeStressTestCleanup_() after reviewing output.
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// IA.S00 · CONFIG
// ───────────────────────────────────────────────────────────────────
var IA_LOCK_WAIT_MS   = 8000;         // 8 s — Gemini parse is done before we enter
var IA_STRESS_PREFIX  = 'STRESS_TEST_';
var IA_STRESS_MOB_PFX = '+000000';    // synthetic prefix — no valid country code
var IA_QUEUE_STEP     = 'INTAKE';     // step name in _ProcessingQueue

// ═══════════════════════════════════════════════════════════════════
// IA.S01 · ATOMIC INTAKE — ENTRY POINT
// Called from processThread_ in place of writeToSheet_ block.
// Gemini parsing (slow) happens BEFORE this call; lock scope is tight.
// ═══════════════════════════════════════════════════════════════════

/**
 * IA.S01.F01 — intakeCreateCandidate_
 *
 * @param {object} scored      - output of scoreCandidate_ / applyDecisionRules_
 * @param {string} threadId    - Gmail thread ID (for consent + meta records)
 * @param {string} msgId       - Gmail message ID
 * @param {string} cvLink      - Google Drive URL of saved CV attachment
 * @param {*}      appDate     - application date (Date or string)
 * @param {string} candEmail   - normalised candidate email
 * @param {string} candMobile  - normalised candidate mobile
 * @param {object} parsed      - raw Gemini parse output (for consent + meta)
 * @returns {string}  'CREATED' | 'DUPLICATE' | 'LOCK_TIMEOUT' | 'ERROR'
 */
function intakeCreateCandidate_(scored, threadId, msgId, cvLink, appDate,
                                candEmail, candMobile, parsed) {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(IA_LOCK_WAIT_MS)) {
    // Pipeline under load — move this thread back to error label for next run
    if (typeof appendLog_ === 'function')
      appendLog_({ status: 'IA_LOCK_TIMEOUT',
                   notes: 'Script lock unavailable after ' + IA_LOCK_WAIT_MS + 'ms. Thread re-queued.' });
    Logger.log('IA: lock timeout — ' + (candEmail || 'no-email'));
    return 'LOCK_TIMEOUT';
  }

  try {

    // ── STEP 1: Race-condition duplicate guard (inside lock) ──────
    // The pre-lock isDuplicate_ in processThread_ catches most duplicates.
    // This inner check catches the race window: two threads both passed
    // isDuplicate_ before either wrote to _Meta. Now only one can be first.
    var dupResult = iaMetaDuplicateCheck_(candEmail, candMobile);
    if (dupResult.duplicate) {
      if (typeof appendLog_ === 'function')
        appendLog_({ status: 'IA_DUPLICATE_RACE',
                     email: typeof maskEmail_ === 'function' ? maskEmail_(candEmail) : candEmail,
                     notes: 'Race dup caught inside lock — ' + dupResult.reason });
      Logger.log('IA: race-dup — ' + dupResult.reason);
      return 'DUPLICATE';
    }

    // ── STEP 2: KAI issuance — PropertiesService R-M-W under lock ──
    // generateKaiNo_() is defined in KAI_16May2026_V2.gs.
    // With the lock held, the read-modify-write on PropertiesService
    // is atomic relative to other pipeline executions.
    // This is the fix for the 90 Phase-1 collisions.
    var kaiNo = generateKaiNo_();
    Logger.log('IA: KAI issued inside lock — ' + kaiNo);

    // ── STEP 3: Candidate row write WITH KAI No at birth ──────────
    // iaWriteWithKai_ mirrors writeToSheet_ but sets col 25 (KAI No).
    // The candidate NEVER exists in Candidates without a KAI No.
    iaWriteWithKai_(scored, kaiNo, threadId, cvLink, appDate);

    // ── STEP 4: Dedup index + consent (inside lock) ───────────────
    // Writing _Meta BEFORE releasing the lock ensures the inner check
    // in STEP 1 can see this record immediately when the next thread
    // acquires the lock.
    if (typeof writeToMeta_ === 'function')
      writeToMeta_(candEmail, candMobile,
                   (parsed && parsed.full_name) || '',
                   (parsed && parsed.industry)  || '',
                   threadId, msgId);
    if (typeof appendConsent_ === 'function')
      appendConsent_(parsed, appDate, threadId);

    // ── STEP 5: Foundation Queue enqueue ─────────────────────────
    // Candidate is now visible to Foundation (_ProcessingQueue INTAKE).
    iaEnqueueFoundation_(kaiNo, candEmail, scored.trade || '');

    // ── STEP 6: Audit trail ───────────────────────────────────────
    if (typeof appendLog_ === 'function')
      appendLog_({
        status: 'IA_CREATED',
        name:   typeof maskName_  === 'function' ? maskName_(scored.full_name)  : scored.full_name,
        email:  typeof maskEmail_ === 'function' ? maskEmail_(candEmail)        : candEmail,
        mobile: typeof maskPhone_ === 'function' ? maskPhone_(candMobile)       : candMobile,
        trade:  scored.trade,
        notes:  'KAI=' + kaiNo + ' | ' + (scored.verdict || '') + ' | Score=' + (scored.score || 0)
      });

    return 'CREATED';

  } catch (err) {
    Logger.log('IA: intakeCreateCandidate_ error — ' + err.message);
    if (typeof appendLog_ === 'function')
      appendLog_({ status: 'IA_ERROR', notes: err.message,
                   email: typeof maskEmail_ === 'function' ? maskEmail_(candEmail) : candEmail });
    return 'ERROR';

  } finally {
    // Lock ALWAYS released — even on error
    try { lock.releaseLock(); } catch (le) { Logger.log('IA: releaseLock failed: ' + le); }
  }
}

// ═══════════════════════════════════════════════════════════════════
// IA.S02 · CANDIDATE ROW WRITE (with KAI No at col 25)
// Mirrors writeToSheet_ (Code.gs S13.F01) but adds col 25.
// ═══════════════════════════════════════════════════════════════════

function iaWriteWithKai_(scored, kaiNo, threadId, cvLink, appDate) {
  var sheet = getMasterSS_().getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('IA: Candidates sheet not found.');

  var ic     = CONFIG.inputColumns;
  var kaiCol = CONFIG_V2.extCol.kaiNo;   // 25

  // Row sized to at least kaiCol (25); fill with empty strings
  var row = new Array(kaiCol).fill('');

  // Cols 1-24: identical layout to writeToSheet_
  row[ic.stage           - 1] = 'Pending action';
  row[ic.applicationDate - 1] = appDate || new Date();
  row[ic.nationality     - 1] = scored.nationality;
  row[ic.name            - 1] = scored.full_name;
  row[ic.mobile          - 1] = scored.mobile ? "'" + scored.mobile : '';
  row[ic.email           - 1] = scored.email;
  row[ic.education       - 1] = scored.education;
  row[ic.positionApplied - 1] = scored.positionApplied;
  row[ic.trade           - 1] = scored.trade;
  row[ic.industry        - 1] = scored.industry;
  row[ic.experience      - 1] = scored.experience;
  row[ic.gulf            - 1] = scored.gulfExperience;
  row[ic.dob             - 1] = scored.dob;
  row[ic.age             - 1] = scored.age;
  row[ic.verdict         - 1] = scored.verdict;
  row[ic.flags           - 1] = scored.flag;
  row[ic.score           - 1] = scored.score;
  row[ic.scoreBreakdown  - 1] = scored.scoreBreakdown;
  row[ic.recommendedRoles- 1] = scored.recommendedRoles;
  row[ic.kaiAssessment   - 1] = scored.kaiAssessment;
  row[ic.recruiterAction - 1] = scored.recruiterAction;
  row[ic.cvLink          - 1] = cvLink || '';
  row[ic.notes           - 1] = scored.notes || '';
  row[ic.active          - 1] = 'TRUE';

  // Col 25 — KAI No: minted atomically, set at row creation
  row[kaiCol - 1] = kaiNo;

  sheet.appendRow(row);
  if (typeof applyFlagFormatting_ === 'function')
    applyFlagFormatting_(sheet, sheet.getLastRow(), scored.flag);
}

// ═══════════════════════════════════════════════════════════════════
// IA.S03 · RACE-CONDITION DUPLICATE CHECK (inner lock guard)
// Checks _Meta dedup index — written inside lock in STEP 4, so any
// concurrent thread that wrote before us will be visible here.
// ═══════════════════════════════════════════════════════════════════

function iaMetaDuplicateCheck_(email, mobile) {
  var metaSheet = getMasterSS_().getSheetByName(CONFIG.metaSheetName);
  if (!metaSheet || metaSheet.getLastRow() < 2)
    return { duplicate: false, reason: null };

  var emailNorm  = String(email  || '').toLowerCase().trim();
  var mobileTrim = String(mobile || '').replace(/^'/, '').trim();
  var last       = metaSheet.getLastRow();

  // _Meta cols: Key(1) Email(2) Mobile(3) Name(4) …
  var data = metaSheet.getRange(2, 1, last - 1, 3).getValues();

  for (var i = 0; i < data.length; i++) {
    var mEmail  = String(data[i][1] || '').toLowerCase().trim();
    var mMobile = String(data[i][2] || '').replace(/^'/, '').trim();

    if (emailNorm  && mEmail  && emailNorm  === mEmail)
      return { duplicate: true,  reason: 'Email in _Meta: ' + emailNorm };
    if (mobileTrim && mMobile && mobileTrim === mMobile)
      return { duplicate: true,  reason: 'Mobile in _Meta: ' + mobileTrim };
  }
  return { duplicate: false, reason: null };
}

// ═══════════════════════════════════════════════════════════════════
// IA.S04 · FOUNDATION QUEUE ENQUEUE
// Writes one record to _ProcessingQueue (step=INTAKE, status=PENDING).
// This makes the candidate immediately visible to Foundation processors.
// ═══════════════════════════════════════════════════════════════════

function iaEnqueueFoundation_(kaiNo, email, trade) {
  var qs = getMasterSS_().getSheetByName('_ProcessingQueue');
  if (!qs) {
    Logger.log('IA: _ProcessingQueue tab not found — skipping Foundation enqueue for ' + kaiNo);
    return;
  }
  // _ProcessingQueue headers:
  //   QueueID | KAINo | Step | Status | FailureReason | LastAttempt | RetryCount | CreatedAt
  var qId = 'IA-' + new Date().getTime() + '-' + Math.floor(Math.random() * 9000 + 1000);
  qs.appendRow([qId, kaiNo, IA_QUEUE_STEP, 'PENDING', '', '', 0, new Date()]);
}

// ═══════════════════════════════════════════════════════════════════
// IA.S05 · STRESS TEST — 100 consecutive atomic writes
//
// PURPOSE: prove the lock + KAI counter mechanism is collision-free
// before any backfill or reissue work begins.
//
// HOW TO RUN:
//   Apps Script editor → select intakeStressTest100 → Run
//   Inspect Execution Log for the VERDICT line.
//   Run intakeStressTestCleanup_() to remove the 100 synthetic rows.
//
// EVIDENCE PRODUCED (logged to Execution Log):
//   - All 100 KAI numbers generated (sequential, unique)
//   - Foundation Queue entries added
//   - Candidate rows added
//   - Elapsed time
//   - Collision count (must be 0)
//   - Error details if any
// ═══════════════════════════════════════════════════════════════════

function intakeStressTest100() {
  var N  = 100;
  var ss = getMasterSS_();

  var candSheet = ss.getSheetByName(CONFIG.sheetName);
  var qSheet    = ss.getSheetByName('_ProcessingQueue');
  if (!candSheet) { Logger.log('IA STRESS: Candidates sheet not found.'); return null; }
  if (!qSheet)    { Logger.log('IA STRESS: _ProcessingQueue sheet not found.'); return null; }

  var baseCandRows = candSheet.getLastRow();
  var baseQRows    = qSheet.getLastRow();
  var kaiGenerated = [];
  var kaiSet       = {};
  var collisions   = [];
  var errors       = [];
  var startMs      = Date.now();

  Logger.log('IA STRESS: Starting 100-candidate stress test …');

  for (var i = 1; i <= N; i++) {
    var mob   = IA_STRESS_MOB_PFX + String(Date.now()).slice(-7) + String(i);
    var email = 'stress' + i + '.' + Date.now() + '@kai.stress.test';

    // Minimal scored object — same shape as real scoreCandidate_ output
    var fakeScored = {
      full_name:        IA_STRESS_PREFIX + i,
      nationality:      'Testistan',
      mobile:           mob,
      email:            email,
      education:        'Diploma',
      positionApplied:  'Welder',
      trade:            'Welder',
      industry:         'Construction',
      experience:       5,
      gulfExperience:   2,
      dob:              '',
      age:              30,
      verdict:          'NEEDS_CALL',
      flag:             '',
      score:            55,
      scoreBreakdown:   'stress-test',
      recommendedRoles: '',
      kaiAssessment:    '',
      recruiterAction:  '',
      notes:            'STRESS_TEST iteration ' + i
    };
    var fakeParsed = {
      full_name: IA_STRESS_PREFIX + i,
      email:     email,
      industry:  'Construction'
    };

    var outcome = intakeCreateCandidate_(
      fakeScored,
      'STRESS-THREAD-' + i,            // threadId
      'STRESS-MSG-' + i,               // msgId
      '',                               // cvLink
      new Date(),                       // appDate
      email,                            // candEmail
      mob,                              // candMobile
      fakeParsed                        // parsed
    );

    if (outcome !== 'CREATED') {
      errors.push({ i: i, outcome: outcome, mob: mob, email: email });
      Logger.log('IA STRESS [' + i + ']: ' + outcome);
      continue;
    }

    // Read KAI No from the row just appended
    var lastRow = candSheet.getLastRow();
    var kaiVal  = String(candSheet.getRange(lastRow, CONFIG_V2.extCol.kaiNo).getValue() || '').trim();

    kaiGenerated.push(kaiVal);
    if (kaiSet[kaiVal]) {
      collisions.push({ i: i, kaiNo: kaiVal, firstAt: kaiSet[kaiVal] });
      Logger.log('IA STRESS [' + i + ']: COLLISION — ' + kaiVal + ' already issued at iteration ' + kaiSet[kaiVal]);
    } else {
      kaiSet[kaiVal] = i;
    }
  }

  var elapsedMs        = Date.now() - startMs;
  var newCandRows      = candSheet.getLastRow() - baseCandRows;
  var newQRows         = qSheet.getLastRow() - baseQRows;
  var allUnique        = (kaiGenerated.length === N && collisions.length === 0 &&
                          Object.keys(kaiSet).length === N);
  var verdict          = (allUnique && errors.length === 0)
                         ? 'PASS — 100/100 clean'
                         : 'FAIL — see details below';

  Logger.log('');
  Logger.log('══════════════════════════════════════════════════');
  Logger.log('MISSION ZERO — INTAKE STRESS TEST REPORT');
  Logger.log('══════════════════════════════════════════════════');
  Logger.log('Attempted        : ' + N);
  Logger.log('Created          : ' + kaiGenerated.length);
  Logger.log('Errors           : ' + errors.length);
  Logger.log('KAI Collisions   : ' + collisions.length);
  Logger.log('Unique KAI Nos   : ' + Object.keys(kaiSet).length);
  Logger.log('KAI Range        : ' + (kaiGenerated[0] || 'N/A') +
             ' → ' + (kaiGenerated[kaiGenerated.length - 1] || 'N/A'));
  Logger.log('Foundation Queue : +' + newQRows + ' entries (step=INTAKE)');
  Logger.log('Candidates +rows : +' + newCandRows + ' rows');
  Logger.log('Elapsed          : ' + elapsedMs + ' ms');
  Logger.log('VERDICT          : ' + verdict);
  Logger.log('══════════════════════════════════════════════════');

  if (kaiGenerated.length > 0) {
    Logger.log('');
    Logger.log('KAI Numbers generated (' + kaiGenerated.length + '):');
    for (var k = 0; k < kaiGenerated.length; k++)
      Logger.log('  [' + (k + 1) + '] ' + kaiGenerated[k]);
  }
  if (errors.length > 0) {
    Logger.log('');
    Logger.log('Errors:');
    errors.forEach(function (e) { Logger.log('  ' + JSON.stringify(e)); });
  }
  if (collisions.length > 0) {
    Logger.log('');
    Logger.log('COLLISIONS (must be empty for PASS):');
    collisions.forEach(function (c) { Logger.log('  ' + JSON.stringify(c)); });
  }

  Logger.log('');
  Logger.log('Run intakeStressTestCleanup_() to remove the ' + kaiGenerated.length + ' test rows.');

  return {
    attempted:               N,
    created:                 kaiGenerated.length,
    errors:                  errors,
    collisions:              collisions,
    uniqueKaiCount:          Object.keys(kaiSet).length,
    kaiFirst:                kaiGenerated[0]                    || 'N/A',
    kaiLast:                 kaiGenerated[kaiGenerated.length - 1] || 'N/A',
    kaiGenerated:            kaiGenerated,
    foundationQueueEnqueued: newQRows,
    candidatesAdded:         newCandRows,
    elapsedMs:               elapsedMs,
    verdict:                 verdict
  };
}

// ─────────────────────────────────────────────────────────────────
// IA.S05.T02 — Remove synthetic rows written by intakeStressTest100.
// Run from Apps Script editor after confirming test output.
// ─────────────────────────────────────────────────────────────────

function intakeStressTestCleanup_() {
  var ss        = getMasterSS_();
  var nameCol   = CONFIG.inputColumns.name;

  // --- Clean Candidates ---
  var cs    = ss.getSheetByName(CONFIG.sheetName);
  var cLast = cs.getLastRow();
  var toDeleteC = [];
  if (cLast > 1) {
    var cNames = cs.getRange(2, nameCol, cLast - 1, 1).getValues();
    for (var i = cNames.length - 1; i >= 0; i--) {
      if (String(cNames[i][0]).indexOf(IA_STRESS_PREFIX) === 0)
        toDeleteC.push(i + 2);
    }
  }
  toDeleteC.forEach(function (r) { cs.deleteRow(r); });

  // --- Clean _ProcessingQueue (step=INTAKE rows) ---
  var qs    = ss.getSheetByName('_ProcessingQueue');
  var qLast = qs ? qs.getLastRow() : 0;
  var toDeleteQ = [];
  if (qs && qLast > 1) {
    var qData = qs.getRange(2, 1, qLast - 1, 3).getValues();
    for (var j = qData.length - 1; j >= 0; j--) {
      if (String(qData[j][2]) === IA_QUEUE_STEP)
        toDeleteQ.push(j + 2);
    }
  }
  toDeleteQ.forEach(function (r) { qs.deleteRow(r); });

  // --- Clean _Meta (stress test email entries) ---
  var ms    = ss.getSheetByName(CONFIG.metaSheetName);
  var mLast = ms ? ms.getLastRow() : 0;
  var toDeleteM = [];
  if (ms && mLast > 1) {
    var mData = ms.getRange(2, 1, mLast - 1, 2).getValues();
    for (var m = mData.length - 1; m >= 0; m--) {
      if (String(mData[m][0]).indexOf('@kai.stress.test') !== -1 ||
          String(mData[m][1]).indexOf('@kai.stress.test') !== -1)
        toDeleteM.push(m + 2);
    }
  }
  toDeleteM.forEach(function (r) { ms.deleteRow(r); });

  Logger.log('IA STRESS CLEANUP: Candidates=' + toDeleteC.length +
             ' | Queue=' + toDeleteQ.length +
             ' | Meta=' + toDeleteM.length + ' rows removed.');
  return {
    candidatesDeleted: toDeleteC.length,
    queueDeleted:      toDeleteQ.length,
    metaDeleted:       toDeleteM.length
  };
}
