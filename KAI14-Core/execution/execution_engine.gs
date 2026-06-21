/**
 * KAI14-Core · execution/execution_engine.gs
 * LAYER OWNER: Execution (outcomes / orchestration)
 * ───────────────────────────────────────────────────────────────────
 * Orchestrates the ONLY approved chain for one thread:
 *   Extract → Parse → Score → Duplicate → Candidate → KAI → Queue
 * Plus the runtime-proof entry points. Holds no parse/score/identity logic
 * itself — it composes the layers in order.
 */

// ═══════════════════════════════════════════════════════════════════
// SETUP — labels + default campaign (run once before first intake)
// ═══════════════════════════════════════════════════════════════════
function kai14Setup() {
  [K14.labels.input, K14.labels.done, K14.labels.error, K14.labels.duplicate]
    .forEach(function (n) { gmailLabel_(n); });
  campaignEnsureDefault();
  logEvent('Execution', 'SETUP_DONE', { detail: 'labels + default campaign ready' });
  return 'KAI14 setup complete. Apply label "' + K14.labels.input + '" to CV emails.';
}

// ═══════════════════════════════════════════════════════════════════
// CHAIN — process one Gmail thread end to end
// ═══════════════════════════════════════════════════════════════════
function executionProcessThread_(thread, opts) {
  opts = opts || {};
  var msgs = thread.getMessages();
  var message = msgs[msgs.length - 1];

  // 1) CV Extraction
  var cv = extractCv_(message);
  if (!cv) {
    gmailMove_(thread, K14.labels.input, K14.labels.error);
    logEvent('Execution', 'NO_ATTACHMENT', { level: 'WARN', detail: thread.getFirstMessageSubject() });
    return { outcome: 'ERROR', reason: 'no attachment' };
  }

  // 2) K14 Parse
  var parsed = parseCv_({ bytesBase64: cv.bytesBase64, mimeType: cv.mimeType, emailText: cv.emailText });

  // 3) K14 Score
  var scored = scoreCandidate_(parsed);

  // 4) Duplicate Check (pre-lock fast check)
  var dup = duplicateCheck_(parsed.passportNo, parsed.mobile, parsed.email, parsed.fullName, false);
  if (dup.outcome === 'DUPLICATE') {
    gmailMove_(thread, K14.labels.input, K14.labels.duplicate);
    logEvent('Execution', 'DUPLICATE', { kaiNo: dup.kaiNo, detail: dup.key });
    return { outcome: 'DUPLICATE', kaiNo: dup.kaiNo, key: dup.key };
  }
  if (dup.outcome === 'CONFLICT' || dup.outcome === 'REVIEW') {
    gmailMove_(thread, K14.labels.input, K14.labels.error);
    logEvent('Execution', dup.outcome, { level: 'WARN', detail: dup.key });
    return { outcome: dup.outcome, key: dup.key };
  }

  // 5+6+7) Candidate Creation + KAI + Queue (atomic, in Foundation)
  var rec = {
    source: 'GMAIL', campaignId: campaignEnsureDefault(),
    fullName: parsed.fullName, email: parsed.email, mobile: parsed.mobile,
    passportNo: parsed.passportNo, nationality: parsed.nationality, dob: parsed.dob,
    age: parsed.age, trade: parsed.trade, industry: parsed.industry,
    experience: parsed.experience, gulfExperience: parsed.gulfExperience,
    education: parsed.education, positionApplied: parsed.positionApplied,
    cvLink: cv.cvLink,
    score: scored.score, verdict: scored.verdict, flags: scored.flags,
    kaiAssessment: scored.kaiAssessment, missingFields: scored.missingFields, state: scored.state
  };
  var created = candidateCreate_(rec, {});

  if (created.outcome === 'CREATED') {
    gmailMove_(thread, K14.labels.input, K14.labels.done);
    return { outcome: 'CREATED', kaiNo: created.kaiNo, row: created.row,
             subject: thread.getFirstMessageSubject(), cvLink: cv.cvLink,
             trade: parsed.trade, verdict: scored.verdict };
  }
  if (created.outcome === 'DUPLICATE') {
    gmailMove_(thread, K14.labels.input, K14.labels.duplicate);
    return { outcome: 'DUPLICATE', kaiNo: created.kaiNo, key: created.key };
  }
  gmailMove_(thread, K14.labels.input, K14.labels.error);
  return { outcome: created.outcome, reason: created.error };
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME PROOF 1 — isolated sequential (zero production impact)
// Run kai14ProofSequential(); inspect log; then kai14ProofCleanup().
// ═══════════════════════════════════════════════════════════════════
function kai14ProofSequential(n) {
  n = n || 100;
  var seen = {}, collisions = [], created = 0;
  var first = '', lastKai = '';
  var t0 = Date.now();

  for (var i = 1; i <= n; i++) {
    var rec = {
      source: 'TEST', campaignId: campaignEnsureDefault(),
      fullName: 'PROOF_' + i, email: 'proof' + i + '.' + Date.now() + '@kai14.test',
      mobile: '900000' + ('0000' + i).slice(-4), passportNo: 'TP' + Date.now() + i,
      nationality: 'Testistan', trade: 'Welder', experience: 5, gulfExperience: 1,
      education: 'Diploma', score: 60, verdict: 'NEEDS_CALL', flags: 'YELLOW',
      kaiAssessment: 'proof', missingFields: [], state: 'PARSED'
    };
    var r = candidateCreate_(rec, { testMode: true });
    if (r.outcome !== 'CREATED') { collisions.push({ i: i, outcome: r.outcome }); continue; }
    created++;
    if (!first) first = r.kaiNo;
    lastKai = r.kaiNo;
    if (seen[r.kaiNo]) collisions.push({ i: i, kaiNo: r.kaiNo, firstAt: seen[r.kaiNo] });
    else seen[r.kaiNo] = i;
  }

  var unique = Object.keys(seen).length;
  var verdict = (created === n && collisions.length === 0 && unique === n) ? 'PASS' : 'FAIL';
  Logger.log('═══ KAI14 PROOF (sequential, isolated) ═══');
  Logger.log('Attempted=' + n + ' Created=' + created + ' Unique=' + unique +
             ' Collisions=' + collisions.length + ' Range=' + first + '→' + lastKai +
             ' Elapsed=' + (Date.now() - t0) + 'ms VERDICT=' + verdict);
  if (collisions.length) Logger.log('COLLISIONS: ' + JSON.stringify(collisions));
  return { attempted: n, created: created, unique: unique,
           collisions: collisions.length, first: first, last: lastKai, verdict: verdict };
}

// RUNTIME PROOF 2 — isolated concurrency (5 separate executions)
function kai14ProofConcInstall() {
  ['A', 'B', 'C', 'D', 'E'].forEach(function (t) {
    ScriptApp.newTrigger('kai14ProofConc' + t).timeBased().after(60 * 1000).create();
  });
  return '5 concurrency batches scheduled (~60s). Run kai14ProofConcReport() after ~3 min.';
}
function kai14ProofConcA() { kai14ProofConcRun_('A'); }
function kai14ProofConcB() { kai14ProofConcRun_('B'); }
function kai14ProofConcC() { kai14ProofConcRun_('C'); }
function kai14ProofConcD() { kai14ProofConcRun_('D'); }
function kai14ProofConcE() { kai14ProofConcRun_('E'); }

function kai14ProofConcRun_(tag) {
  for (var i = 1; i <= 100; i++) {
    candidateCreate_({
      source: 'TEST', campaignId: campaignEnsureDefault(),
      fullName: 'CONC_' + tag + '_' + i,
      email: 'conc.' + tag + '.' + i + '.' + Date.now() + '@kai14.test',
      mobile: '9' + tag.charCodeAt(0) + ('00000' + i).slice(-5),
      passportNo: 'CP' + tag + Date.now() + i, nationality: 'Testistan',
      trade: 'Welder', experience: 5, gulfExperience: 1, score: 55,
      verdict: 'NEEDS_CALL', flags: 'YELLOW', kaiAssessment: 'conc',
      missingFields: [], state: 'PARSED'
    }, { testMode: true });
  }
  Logger.log('KAI14 conc batch ' + tag + ' done.');
}

function kai14ProofConcReport() {
  var rows = candidateAll_(true);
  var seen = {}, collisions = [], blank = 0, n = 0;
  rows.forEach(function (c, idx) {
    if (String(c.FullName || '').indexOf('CONC_') !== 0) return;
    n++;
    var k = String(c.KAINo || '').trim();
    if (!k) { blank++; return; }
    if (seen[k]) collisions.push({ kaiNo: k, a: seen[k], b: idx }); else seen[k] = idx;
  });
  var verdict = (n > 0 && collisions.length === 0 && blank === 0) ? 'PASS' : 'FAIL';
  Logger.log('═══ KAI14 PROOF (concurrency 5x100, isolated) ═══');
  Logger.log('CONC rows=' + n + ' Unique=' + Object.keys(seen).length +
             ' Blank=' + blank + ' Collisions=' + collisions.length + ' VERDICT=' + verdict);
  return { rows: n, unique: Object.keys(seen).length, blank: blank,
           collisions: collisions.length, verdict: verdict };
}

function kai14ProofCleanup() {
  var ss = K14_ss_();
  ['_TEST_Candidates', '_TEST_Meta', '_TEST_Queue'].forEach(function (nm) {
    var sh = ss.getSheetByName(nm); if (sh) ss.deleteSheet(sh);
  });
  PropertiesService.getScriptProperties().deleteProperty(K14.kai.testCounterKey);
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (String(t.getHandlerFunction()).indexOf('kai14ProofConc') === 0) ScriptApp.deleteTrigger(t);
  });
  return 'KAI14 proof cleanup done — test sheets deleted, TEST counter reset.';
}

// RUNTIME PROOF 3 — one REAL Gmail CV (production path)
function kai14RealCvTest() {
  var label = GmailApp.getUserLabelByName(K14.labels.input);
  if (!label) return { ok: false, error: 'intake label missing — run kai14Setup()' };
  var threads = label.getThreads(0, 1);
  if (!threads.length) return { ok: false, error: 'no CV on intake label' };
  var res = executionProcessThread_(threads[0], {});
  Logger.log('═══ KAI14 REAL CV TEST ═══\n' + JSON.stringify(res, null, 2));
  return res;
}
