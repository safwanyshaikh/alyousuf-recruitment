/**
 * KAI14-Core · foundation/candidate.gs   (Deliverable 5: Candidate Creation)
 * LAYER OWNER: Foundation (owns truth)
 * ───────────────────────────────────────────────────────────────────
 * Atomic candidate creation. KAINo is written at column 1 in the SAME
 * critical section that mints it — a candidate row without a KAINo cannot
 * exist. The whole section is serialized by LockService:
 *
 *   lock → race-dup re-check (_Meta) → kaiMint_ → write row → write _Meta → enqueue → unlock
 *
 * Test isolation: opts.testMode routes every write to _TEST_* sheets + the
 * TEST KAI counter. Zero production impact.
 */

// Canonical schema (Artifact 2) — KAINo is PK at column 1.
var CANDIDATE_HEADERS = [
  'KAINo', 'CreatedAt', 'Source', 'CampaignID',           // 1-4 Foundation/identity
  'FullName', 'Email', 'Mobile', 'PassportNo',            // 5-8 required + dup keys
  'Nationality', 'DOB', 'Age', 'Trade', 'Industry',       // 9-13 K14
  'Experience', 'GulfExperience', 'Education', 'PositionApplied', // 14-17 K14
  'CVLink',                                                // 18 intake
  'Score', 'Verdict', 'Flags', 'KAIAssessment', 'MissingFields', // 19-23 K14 output
  'State', 'RequirementID', 'UpdatedAt'                   // 24-26 execution
];

var META_HEADERS = ['Key', 'Email', 'Mobile', 'PassportNo', 'KAINo', 'Name', 'CreatedAt'];

function candSheetName_(testMode) { return testMode ? K14.testSheets.candidates : K14.sheets.candidates; }
function metaSheetName_(testMode) { return testMode ? K14.testSheets.meta       : K14.sheets.meta; }

/**
 * candidateCreate_ — the atomic write.
 * @param {object} rec  - { source, campaignId, fullName, email, mobile, passportNo,
 *                          nationality, dob, age, trade, industry, experience,
 *                          gulfExperience, education, positionApplied, cvLink,
 *                          score, verdict, flags, kaiAssessment, missingFields[], state }
 * @param {object} [opts] - { testMode:true }
 * @returns {object} { outcome:'CREATED'|'DUPLICATE'|'CONFLICT'|'LOCK_TIMEOUT'|'ERROR',
 *                     kaiNo, row, key }
 */
function candidateCreate_(rec, opts) {
  opts = opts || {};
  var testMode = opts.testMode === true;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(K14.lockWaitMs)) {
    logEvent('Foundation', 'CANDIDATE_LOCK_TIMEOUT', { level: 'WARN',
      detail: maskEmail(rec.email) });
    return { outcome: 'LOCK_TIMEOUT' };
  }
  try {
    // STEP 1 — race-condition dedup re-check inside the lock (Artifact 5, phase b)
    var dup = duplicateCheck_(rec.passportNo, rec.mobile, rec.email, rec.fullName, testMode);
    if (dup.outcome === 'DUPLICATE') {
      logEvent('Foundation', 'CANDIDATE_DUP_RACE', { kaiNo: dup.kaiNo, detail: dup.key });
      return { outcome: 'DUPLICATE', kaiNo: dup.kaiNo, key: dup.key };
    }
    if (dup.outcome === 'CONFLICT') {
      logEvent('Foundation', 'CANDIDATE_CONFLICT', { level: 'WARN', detail: dup.key });
      return { outcome: 'CONFLICT', key: dup.key };
    }

    // STEP 2 — mint KAI inside the lock (single writer)
    var kaiNo = kaiMint_({ lockHeld: true, testMode: testMode });

    // STEP 3 — write candidate row, KAINo at column 1, at birth
    var sheet = K14_sheet_(candSheetName_(testMode), CANDIDATE_HEADERS);
    var row = new Array(CANDIDATE_HEADERS.length).fill('');
    row[0]  = kaiNo;
    row[1]  = K14_now_();
    row[2]  = rec.source || 'GMAIL';
    row[3]  = rec.campaignId || campaignEnsureDefault();
    row[4]  = normText_(rec.fullName);
    row[5]  = normText_(rec.email);
    row[6]  = rec.mobile ? "'" + normText_(rec.mobile) : '';
    row[7]  = normText_(rec.passportNo);
    row[8]  = normText_(rec.nationality);
    row[9]  = rec.dob || '';
    row[10] = rec.age || '';
    row[11] = normText_(rec.trade);
    row[12] = normText_(rec.industry);
    row[13] = (rec.experience === 0 || rec.experience) ? rec.experience : '';
    row[14] = rec.gulfExperience || '';
    row[15] = normText_(rec.education);
    row[16] = normText_(rec.positionApplied);
    row[17] = rec.cvLink || '';
    row[18] = (rec.score === 0 || rec.score) ? rec.score : '';
    row[19] = normText_(rec.verdict);
    row[20] = normText_(rec.flags);
    row[21] = normText_(rec.kaiAssessment);
    row[22] = JSON.stringify(rec.missingFields || []);
    row[23] = rec.state || 'PARSED';
    row[24] = '';                 // RequirementID — set on match
    row[25] = K14_now_();
    sheet.appendRow(row);
    var rowIndex = sheet.getLastRow();

    // STEP 4 — write dedup index (_Meta) inside the lock so the next thread sees it
    var ms = K14_sheet_(metaSheetName_(testMode), META_HEADERS);
    var key = normEmail_(rec.email) + '|' + normMobile_(rec.mobile) + '|' + normText_(rec.passportNo);
    ms.appendRow([key, normEmail_(rec.email), normMobile_(rec.mobile),
                  normText_(rec.passportNo), kaiNo, normText_(rec.fullName), K14_now_()]);

    // STEP 5 — Foundation Queue enqueue (candidate visible to next layer)
    var qId = queueEnqueue(kaiNo, QUEUE_STEP.INTAKE, testMode);

    // STEP 6 — attributable audit
    logEvent('Foundation', 'CANDIDATE_CREATED', {
      kaiNo: kaiNo,
      detail: 'row=' + rowIndex + ' queue=' + qId + ' | ' + maskEmail(rec.email) +
              ' | ' + maskPhone(rec.mobile) + (testMode ? ' [TEST]' : '')
    });

    return { outcome: 'CREATED', kaiNo: kaiNo, row: rowIndex };

  } catch (err) {
    logError('Foundation', 'candidateCreate_', err.message, maskEmail(rec.email));
    return { outcome: 'ERROR', error: err.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/** Read a candidate row by KAINo (for UI / matching). Returns object or null. */
function candidateGetByKai_(kaiNo, testMode) {
  var sh = K14_sheet_(candSheetName_(testMode), CANDIDATE_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return null;
  var data = sh.getRange(2, 1, last - 1, CANDIDATE_HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === kaiNo) return candidateRowToObj_(data[i], i + 2);
  }
  return null;
}

function candidateRowToObj_(r, rowIndex) {
  var o = { _row: rowIndex };
  for (var i = 0; i < CANDIDATE_HEADERS.length; i++) o[CANDIDATE_HEADERS[i]] = r[i];
  o.Mobile = String(o.Mobile || '').replace(/^'/, '');
  return o;
}

/** All candidates as objects (for matching). */
function candidateAll_(testMode) {
  var sh = K14_sheet_(candSheetName_(testMode), CANDIDATE_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var data = sh.getRange(2, 1, last - 1, CANDIDATE_HEADERS.length).getValues();
  return data.map(function (r, i) { return candidateRowToObj_(r, i + 2); });
}
