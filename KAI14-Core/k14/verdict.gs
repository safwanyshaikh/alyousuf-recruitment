/**
 * KAI14-Core · k14/verdict.gs   (Phase 1: KAI Verdict Engine — Capability Intelligence)
 * LAYER OWNER: K14 (intelligence)
 * ─────────────────────────────────────────────────────────────
 * SINGLE ENGINE. Evidence → Reasoning → Verdict.
 *
 *   evidencePrepare_(c)  — DETERMINISTIC. Produces FACTS. Decides NOTHING.
 *                          No thresholds. No classification. No scoring.
 *                          No trust points. Arithmetic + assembly only.
 *
 *   kaiVerdict_(c)       — THE ONLY DECISION-MAKER. One Gemini call.
 *                          Reasons over raw evidence + prepared facts.
 *                          Decides positions, credibility, timeline,
 *                          regional confidence, and human-review need.
 *
 * Phase-1 scope: P1 Validation-Before-Acceptance · P2 Inference-Before-
 * Interrogation · P3 Experience Credibility · P4 Timeline Validation ·
 * P5 Location Intelligence · P13 Multi-Evidence Confidence · P14 Human-First.
 *
 * NO taxonomy. NO role families. NO keyword tables. NO ATS logic.
 * LOW / INCOHERENT / review-flag NEVER reject — they route to a human.
 *
 * Entry points:
 *   kaiVerdictBatch()      — run on all candidates, write results
 *   kaiVerdictOne(kaiNo)   — run on one candidate by KAINo
 */

var VERDICT_COLS = [
  // ── Primary intelligence (Verdict decides) ──
  'KAIPosition1', 'KAIPosition2', 'KAIPosition3',
  'KAIQualLevel', 'KAIQualNote', 'KAICapSummary', 'KAIConfidence',
  // ── Experience: facts (prep) then judgment (Verdict) ──
  'KAIExpClaimed', 'KAIExpMaxPossible', 'KAIExpVariance',
  'KAIExpCredibility', 'KAICredReasoning',
  // ── Timeline (Verdict decides) ──
  'KAITimelineCred', 'KAITimelineNotes',
  // ── Location: stack (prep) then judgment (Verdict) ──
  'KAIEvidenceStack', 'KAIRegionalConf', 'KAIInferenceNotes',
  // ── Human-first + meta ──
  'KAIHumanReview', 'KAIVerdictAt'
];

/**
 * educationCompletionRange_ — biological reference RANGE, not a decision table.
 * Returns the earliest..latest realistic age at which this education completes.
 * Used as EVIDENCE handed to Verdict — never to classify a candidate.
 * @returns {object|null} { label, min, max } or null if unknown
 */
function educationCompletionRange_(education) {
  var e = String(education || '').toLowerCase();
  if (!e.trim()) return null;
  if (/ph\.?d|doctorate|d\.phil/.test(e))                       return { label: 'PhD',        min: 24, max: 27 };
  if (/m\.?tech|m\.?e\b|m\.?sc|mba|m\.?phil|master/.test(e))    return { label: 'Masters',    min: 22, max: 25 };
  if (/b\.?tech|b\.?e\b|b\.?sc|b\.?eng|b\.?com|b\.?a\b|bachelor|degree|graduat/.test(e))
                                                                return { label: 'Degree',     min: 20, max: 23 };
  if (/diploma|dip\./.test(e))                                  return { label: 'Diploma',    min: 18, max: 20 };
  if (/iti|ncvt|ntc|trade cert|vocational/.test(e))            return { label: 'ITI/Trade',  min: 17, max: 19 };
  if (/ssc|hsc|sslc|matric|10th|12th|secondary|high school/.test(e))
                                                                return { label: 'Secondary',  min: 16, max: 18 };
  return null;  // present but unrecognized — Verdict reasons from the raw string
}

/**
 * evidencePrepare_ — DETERMINISTIC. Produces facts only. Decides nothing.
 * @param {object} c — candidate object
 * @returns {object} facts assembled for the Verdict prompt
 */
function evidencePrepare_(c) {
  var age        = parseInt(c.Age, 10)            || 0;
  var expClaimed = parseFloat(c.Experience)       || 0;
  var gulfExp    = parseFloat(c.GulfExperience)   || 0;
  var eduRange   = educationCompletionRange_(c.Education);

  // Max possible experience — only when age exists. Use the EARLIEST completion
  // age (most generous to the candidate) so the fact never overstates a concern.
  var maxPossible = 'N/A — age absent';
  var variance    = 'N/A';
  if (age > 0 && eduRange) {
    var mp = age - eduRange.min;
    if (mp < 0) mp = 0;
    maxPossible = mp;
    variance    = Math.round((expClaimed - mp) * 10) / 10;
  } else if (age > 0 && !eduRange) {
    maxPossible = 'N/A — education not recognized';
  }

  // Gulf vs total — raw delta (positive = gulf exceeds total = impossible).
  var gulfDelta = Math.round((gulfExp - expClaimed) * 10) / 10;

  // Location evidence stack — assembled, NOT judged. Country detection is a
  // byproduct; the stack + (later) KAI inference are the deliverable.
  var mobile = String(c.Mobile || '').replace(/^'/, '').trim();
  var stack = [];
  if (mobile)          stack.push('mobile: ' + mobile);
  if (normText_(c.Nationality)) stack.push('nationality: ' + normText_(c.Nationality));
  if (gulfExp > 0)     stack.push('gulf experience: ' + gulfExp + 'y');
  if (normText_(c.Industry))    stack.push('industry: ' + normText_(c.Industry));

  // Identity evidence presence — plain facts, NO trust points, NO scoring.
  var identityFacts =
    'passport ' + (normText_(c.PassportNo) ? 'present' : 'absent') + '; ' +
    'email '    + (normText_(c.Email)      ? 'present' : 'absent') + '; ' +
    'mobile '   + (mobile                  ? 'present' : 'absent');

  return {
    age: age,
    expClaimed: expClaimed,
    gulfExp: gulfExp,
    eduRange: eduRange,
    maxPossible: maxPossible,
    variance: variance,
    gulfDelta: gulfDelta,
    stack: stack,
    identityFacts: identityFacts
  };
}

/**
 * buildVerdictPrompt_ — assemble the reasoning prompt from raw evidence + facts.
 * Facts are presented as EVIDENCE. The prompt asks KAI to REASON, never to
 * apply a threshold.
 */
function buildVerdictPrompt_(c, f) {
  var eduRangeStr = f.eduRange
    ? f.eduRange.label + ' (typically completed age ' + f.eduRange.min + '-' + f.eduRange.max + ')'
    : 'not recognized / not stated';

  return '' +
  'You are KAI — a Human Intelligence recruitment engine.\n' +
  'Reason from evidence. A job title is a signal, not a conclusion.\n' +
  'Education indicates qualification level. Experience indicates depth.\n' +
  'You DECIDE every judgment below. The numbers given are EVIDENCE, not rules.\n' +
  'Never reject a candidate. When evidence is thin or conflicting, lower your\n' +
  'confidence and set human_review = true. Missing data is normal — reason from\n' +
  'whatever evidence exists and say what is missing.\n\n' +

  'CANDIDATE EVIDENCE (verbatim from CV):\n' +
  '  Position Applied For : ' + (normText_(c.PositionApplied) || '(not stated)') + '\n' +
  '  Current/Recent Title : ' + (normText_(c.Trade)           || '(not stated)') + '\n' +
  '  Education            : ' + (normText_(c.Education)        || '(not stated)') + '\n' +
  '  Total Experience     : ' + f.expClaimed + ' years\n' +
  '  Gulf Experience      : ' + f.gulfExp + ' years\n' +
  '  Industry             : ' + (normText_(c.Industry)        || '(not stated)') + '\n' +
  '  Age                  : ' + (f.age > 0 ? f.age + ' years' : '(not stated)') + '\n' +
  '  Nationality          : ' + (normText_(c.Nationality)     || '(not stated)') + '\n\n' +

  'PREPARED FACTS (arithmetic evidence — reason with these, do not just echo):\n' +
  '  Education completion band : ' + eduRangeStr + '\n' +
  '  Max possible experience   : ' + f.maxPossible + '\n' +
  '  Experience variance       : ' + f.variance +
        '   (positive = claim exceeds the generous maximum)\n' +
  '  Gulf-vs-Total delta       : ' + f.gulfDelta +
        '   (positive = Gulf exceeds Total = impossible)\n' +
  '  Identity evidence         : ' + f.identityFacts + '\n' +
  '  Location evidence stack   : ' + (f.stack.length ? f.stack.join(' | ') : '(none)') + '\n\n' +

  'Return ONLY this JSON (no markdown, no code fences):\n' +
  '{\n' +
  '  "position1": "", "position2": "", "position3": "",\n' +
  '  "qual_level": "", "qual_note": "", "cap_summary": "", "confidence": 0,\n' +
  '  "experience_credibility": "", "credibility_reasoning": "",\n' +
  '  "timeline_credibility": "", "timeline_notes": "",\n' +
  '  "regional_confidence": "", "inference_notes": "",\n' +
  '  "human_review": false\n' +
  '}\n\n' +

  'HOW TO DECIDE EACH FIELD:\n' +
  'position1/2/3 — The three positions this human can most credibly hold, best\n' +
  '  first. May rank ABOVE or BELOW the claimed title depending on evidence.\n' +
  '  Reason from education + experience + industry + history. No lookup tables.\n' +
  'qual_level — One of: "Degree Engineer" | "Diploma Technician" | "Trade\n' +
  '  Certified" | "Experienced Professional" | "Unknown". From education evidence\n' +
  '  only. If education is absent, "Unknown" — do NOT penalize, infer from work.\n' +
  'qual_note — Note any qualification gap relative to the claimed title. Note GCC\n' +
  '  reality: "Diploma Engineer", "Site Engineer", "Junior Engineer" are common\n' +
  '  and NOT problems. Empty if nothing notable.\n' +
  'cap_summary — One sentence on what this human can demonstrably do.\n' +
  'confidence — 0-100 in position1. Lower it when key evidence (age, education,\n' +
  '  applied position) is missing or signals conflict.\n' +
  'experience_credibility — YOU decide: "HIGH" | "MEDIUM" | "LOW". Ask: can this\n' +
  '  claimed experience realistically exist given the band, variance, and title?\n' +
  '  When age is absent, judge on internal coherence, not a formula.\n' +
  'credibility_reasoning — One sentence citing the evidence behind your call.\n' +
  'timeline_credibility — YOU decide: "COHERENT" | "MINOR_GAPS" | "INCOHERENT".\n' +
  '  Reason across education, employment span, seniority progression, and the\n' +
  '  Gulf-vs-Total delta. Gulf exceeding Total, or seniority impossible for the\n' +
  '  years, is INCOHERENT.\n' +
  'timeline_notes — One sentence on what you observed in the chronology.\n' +
  'regional_confidence — From the location evidence stack, your judgment of where\n' +
  '  this candidate is established, e.g. "Saudi: High", "UAE: Medium", "Unclear".\n' +
  '  Country detection is incidental — the reasoning matters.\n' +
  'inference_notes — One sentence explaining the regional inference and any gap.\n' +
  'human_review — true if anything (LOW credibility, INCOHERENT timeline, thin\n' +
  '  identity, missing critical evidence) warrants a recruiter looking. Never\n' +
  '  reject — flag.\n\n' +
  'Return ONLY the raw JSON object. Nothing before it. Nothing after it.';
}

/**
 * kaiVerdict_ — THE decision-maker. One Gemini call. Reasons over everything.
 * @param {object} c — candidate object
 * @returns {object} prepared facts + verdict decisions, merged
 */
function kaiVerdict_(c) {
  var f = evidencePrepare_(c);
  var j = geminiJson(buildVerdictPrompt_(c, f), null);

  return {
    // facts (from prep)
    exp_claimed:      f.expClaimed,
    exp_max_possible: f.maxPossible,
    exp_variance:     f.variance,
    evidence_stack:   f.stack.join(' | '),
    // decisions (from Verdict)
    position1:        normText_(j.position1)  || '',
    position2:        normText_(j.position2)  || '',
    position3:        normText_(j.position3)  || '',
    qual_level:       normText_(j.qual_level) || 'Unknown',
    qual_note:        normText_(j.qual_note)  || '',
    cap_summary:      normText_(j.cap_summary)|| '',
    confidence:       parseInt(j.confidence, 10) || 0,
    exp_credibility:  normText_(j.experience_credibility) || 'MEDIUM',
    cred_reasoning:   normText_(j.credibility_reasoning)  || '',
    timeline_cred:    normText_(j.timeline_credibility)   || '',
    timeline_notes:   normText_(j.timeline_notes)         || '',
    regional_conf:    normText_(j.regional_confidence)    || '',
    inference_notes:  normText_(j.inference_notes)        || '',
    human_review:     (j.human_review === true || String(j.human_review).toLowerCase() === 'true')
  };
}

/**
 * verdictColMap_ — ensure verdict columns exist on sheet, return col index map.
 * Adds missing columns at the right edge. Never reorders existing columns.
 */
function verdictColMap_(sh) {
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var map     = {};
  VERDICT_COLS.forEach(function (col) {
    var idx = headers.indexOf(col);
    if (idx < 0) {
      lastCol++;
      sh.getRange(1, lastCol).setValue(col);
      headers.push(col);
      idx = headers.length - 1;
    }
    map[col] = idx + 1;
  });
  return map;
}

/**
 * verdictWriteRow_ — write full verdict to a candidate row.
 * Numeric cells get explicit number format to prevent Sheets date coercion.
 */
function verdictWriteRow_(sh, colMap, row, v) {
  function put(col, val) { sh.getRange(row, colMap[col]).setValue(val); }
  function putNum(col, val, fmt) {
    var cell = sh.getRange(row, colMap[col]);
    cell.setNumberFormat(fmt);
    cell.setValue(val);
  }

  put('KAIPosition1', v.position1);
  put('KAIPosition2', v.position2);
  put('KAIPosition3', v.position3);
  put('KAIQualLevel', v.qual_level);
  put('KAIQualNote',  v.qual_note);
  put('KAICapSummary',v.cap_summary);
  putNum('KAIConfidence', v.confidence, '0');

  putNum('KAIExpClaimed',     v.exp_claimed, '0.#');
  // max/variance may be a number or an "N/A …" string; '0.#' is ignored for text.
  putNum('KAIExpMaxPossible', v.exp_max_possible, '0.#');
  putNum('KAIExpVariance',    v.exp_variance, '0.#');
  put('KAIExpCredibility', v.exp_credibility);
  put('KAICredReasoning',  v.cred_reasoning);

  put('KAITimelineCred',  v.timeline_cred);
  put('KAITimelineNotes', v.timeline_notes);

  put('KAIEvidenceStack',  v.evidence_stack);
  put('KAIRegionalConf',   v.regional_conf);
  put('KAIInferenceNotes', v.inference_notes);

  put('KAIHumanReview', v.human_review ? 'REVIEW' : '');
  put('KAIVerdictAt',   K14_now_());
}

// ═══════════════════════════════════════════════════════════════
// ENTRY POINTS
// ═══════════════════════════════════════════════════════════════

/**
 * kaiVerdictBatch — run the engine on all production candidates.
 * One Gemini call per candidate. ~2s each. 20 candidates ≈ 45s.
 */
function kaiVerdictBatch() {
  var sh         = K14_sheet_(K14.sheets.candidates, CANDIDATE_HEADERS);
  var colMap     = verdictColMap_(sh);
  var candidates = candidateAll_(false);

  var passed = 0, failed = 0, skipped = 0, review = 0;
  Logger.log('═══ KAI VERDICT BATCH — ' + candidates.length + ' candidates ═══');

  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (!c.KAINo) { skipped++; continue; }

    try {
      var v = kaiVerdict_(c);
      verdictWriteRow_(sh, colMap, c._row, v);
      passed++;
      if (v.human_review) review++;

      Logger.log(
        c.KAINo + ' | ' + (c.FullName || '(blank)') + '\n' +
        '  Stored Trade:    ' + (c.Trade || '—') + '\n' +
        '  Position 1:      ' + v.position1 + '  (confidence=' + v.confidence + '%)\n' +
        '  Position 2:      ' + v.position2 + '\n' +
        '  Position 3:      ' + v.position3 + '\n' +
        '  Qual Level:      ' + v.qual_level + (v.qual_note ? '  [' + v.qual_note + ']' : '') + '\n' +
        '  Exp:             claimed=' + v.exp_claimed +
              '  max=' + v.exp_max_possible + '  var=' + v.exp_variance + '\n' +
        '  Exp Credibility: ' + v.exp_credibility + '  — ' + v.cred_reasoning + '\n' +
        '  Timeline:        ' + v.timeline_cred + '  — ' + v.timeline_notes + '\n' +
        '  Regional:        ' + v.regional_conf + '  — ' + v.inference_notes + '\n' +
        '  Human Review:    ' + (v.human_review ? 'YES' : 'no') + '\n' +
        '  Summary:         ' + v.cap_summary
      );
    } catch (e) {
      failed++;
      Logger.log('FAIL ' + c.KAINo + ': ' + e.message);
      logError('K14', 'kaiVerdictBatch', e.message, c.KAINo);
    }

    if (i < candidates.length - 1) Utilities.sleep(1500);
  }

  Logger.log('──────────────────────────────────');
  Logger.log('Total=' + candidates.length + '  Passed=' + passed +
             '  Failed=' + failed + '  Skipped=' + skipped +
             '  HumanReview=' + review);
  logEvent('K14', 'VERDICT_BATCH_DONE',
    { detail: 'passed=' + passed + ' failed=' + failed + ' review=' + review });
  return { total: candidates.length, passed: passed, failed: failed,
           skipped: skipped, review: review };
}

/**
 * kaiVerdictOne — run the engine on a single candidate. For testing.
 * @param {string} kaiNo  e.g. 'AYE-KAI-2026-000016'
 */
function kaiVerdictOne(kaiNo) {
  var sh     = K14_sheet_(K14.sheets.candidates, CANDIDATE_HEADERS);
  var colMap = verdictColMap_(sh);
  var c      = candidateGetByKai_(kaiNo, false);
  if (!c) return { ok: false, error: 'KAINo not found: ' + kaiNo };

  var v = kaiVerdict_(c);
  verdictWriteRow_(sh, colMap, c._row, v);

  Logger.log('═══ KAI VERDICT: ' + kaiNo + ' ═══');
  Logger.log(JSON.stringify(v, null, 2));
  logEvent('K14', 'VERDICT_ONE', { kaiNo: kaiNo, detail: v.position1 });
  return { ok: true, kaiNo: kaiNo, verdict: v };
}
