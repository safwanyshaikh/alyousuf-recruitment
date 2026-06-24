/**
 * KAI14-Core · k14/verdict.gs   (Phase 1: KAI Verdict Engine)
 * LAYER OWNER: K14 (intelligence)
 * ─────────────────────────────────────────────────────────────
 * Generates three recommended positions + qualification intelligence
 * for every candidate from stored evidence signals.
 * Reads candidate sheet. Writes verdict columns. Calls no parsers.
 *
 * Entry points:
 *   kaiVerdictBatch()      — run on all candidates, write results
 *   kaiVerdictOne(kaiNo)   — run on one candidate by KAINo
 */

var VERDICT_COLS = [
  'KAIPosition1', 'KAIPosition2', 'KAIPosition3',
  'KAIQualLevel', 'KAICapSummary', 'KAIConfidence',
  'KAIQualNote',  'KAIVerdictAt'
];

var K14_VERDICT_PROMPT =
  'You are KAI — a recruitment intelligence system.\n' +
  'Your job: infer what positions this human can genuinely hold, based on evidence.\n' +
  'Title is a signal, not a conclusion.\n' +
  'Education defines qualification level.\n' +
  'Experience defines capability depth.\n' +
  'Do NOT simply echo the claimed title. Assess the evidence.\n\n' +
  'CANDIDATE EVIDENCE:\n' +
  'Position Applied For: {{positionApplied}}\n' +
  'Current / Recent Title: {{trade}}\n' +
  'Education: {{education}}\n' +
  'Total Experience: {{experience}} years\n' +
  'Gulf Experience: {{gulfExperience}} years\n' +
  'Industry: {{industry}}\n\n' +
  'Return ONLY this JSON (no markdown, no code fences, nothing else):\n' +
  '{\n' +
  '  "position1": "",\n' +
  '  "position2": "",\n' +
  '  "position3": "",\n' +
  '  "qual_level": "",\n' +
  '  "cap_summary": "",\n' +
  '  "confidence": 0,\n' +
  '  "qual_note": ""\n' +
  '}\n\n' +
  'FIELD RULES:\n' +
  'position1 — The most evidence-supported position. May be HIGHER than claimed title ' +
  'if education + experience support it, or LOWER if they do not.\n' +
  'position2 — Second most accurate position. Must differ from position1.\n' +
  'position3 — Third position. Can be the claimed title if evidence confirms it.\n' +
  'qual_level — Exactly one of: "Degree Engineer" | "Diploma Technician" | ' +
  '"Trade Certified" | "Experienced Professional" | "Unknown". ' +
  'Derived from education evidence only — never from title.\n' +
  'cap_summary — One sentence. What this human demonstrably can do. Evidence only.\n' +
  'confidence — Integer 0–100. Confidence in position1. Low when signals are weak ' +
  'or contradictory. High when education, experience, and title all align.\n' +
  'qual_note — If education does NOT support position1 (e.g. Diploma holding Engineer ' +
  'title), state the gap clearly. Empty string if qualification is consistent.\n\n' +
  'QUALIFICATION RULE (apply strictly):\n' +
  '"Engineer" classification requires Degree evidence (B.E., B.Tech, B.Sc Eng, etc.).\n' +
  '"Diploma" evidence supports Technician or Supervisor classification, not Engineer.\n' +
  '"Trade Certificate" evidence supports Tradesperson or Foreman, not Engineer.\n' +
  'A strong experience record (15+ years) in absence of degree = "Experienced Professional".\n\n' +
  'Return ONLY the raw JSON object. Nothing before it. Nothing after it.';

/**
 * kaiVerdict_ — run verdict on one candidate evidence object.
 * @param {object} c — candidate object from candidateAll_ or candidateGetByKai_
 * @returns {object} { position1, position2, position3, qual_level, cap_summary,
 *                     confidence, qual_note }
 */
function kaiVerdict_(c) {
  var prompt = K14_VERDICT_PROMPT
    .replace('{{positionApplied}}', normText_(c.PositionApplied) || '(not stated)')
    .replace('{{trade}}',          normText_(c.Trade)           || '(not stated)')
    .replace('{{education}}',      normText_(c.Education)       || '(not stated)')
    .replace('{{experience}}',     String(c.Experience || 0))
    .replace('{{gulfExperience}}', String(c.GulfExperience || 0))
    .replace('{{industry}}',       normText_(c.Industry)        || '(not stated)');

  var j = geminiJson(prompt, null);
  return {
    position1:  normText_(j.position1)  || '',
    position2:  normText_(j.position2)  || '',
    position3:  normText_(j.position3)  || '',
    qual_level: normText_(j.qual_level) || 'Unknown',
    cap_summary:normText_(j.cap_summary)|| '',
    confidence: parseInt(j.confidence, 10) || 0,
    qual_note:  normText_(j.qual_note)  || ''
  };
}

/**
 * verdictColMap_ — ensure verdict columns exist on sheet, return col index map.
 * Adds missing columns at the right edge. Never reorders existing columns.
 * @param {Sheet} sh
 * @returns {object} { colName: colNumber_1based }
 */
function verdictColMap_(sh) {
  var lastCol  = sh.getLastColumn();
  var headers  = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var map      = {};
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
 * verdictWriteRow_ — write one verdict result to a specific sheet row.
 */
function verdictWriteRow_(sh, colMap, row, v) {
  sh.getRange(row, colMap['KAIPosition1']).setValue(v.position1);
  sh.getRange(row, colMap['KAIPosition2']).setValue(v.position2);
  sh.getRange(row, colMap['KAIPosition3']).setValue(v.position3);
  sh.getRange(row, colMap['KAIQualLevel']).setValue(v.qual_level);
  sh.getRange(row, colMap['KAICapSummary']).setValue(v.cap_summary);
  var confCell = sh.getRange(row, colMap['KAIConfidence']);
  confCell.setNumberFormat('0');
  confCell.setValue(v.confidence);
  sh.getRange(row, colMap['KAIQualNote']).setValue(v.qual_note);
  sh.getRange(row, colMap['KAIVerdictAt']).setValue(K14_now_());
}

// ═══════════════════════════════════════════════════════════════
// ENTRY POINTS
// ═══════════════════════════════════════════════════════════════

/**
 * kaiVerdictBatch — run verdict engine on all production candidates.
 * Adds verdict columns if not present. Overwrites existing verdict values.
 * Execution time: ~1.5s per candidate (Gemini) + sheet writes.
 * For 20 candidates: ~35–40 seconds.
 */
function kaiVerdictBatch() {
  var sh        = K14_sheet_(K14.sheets.candidates, CANDIDATE_HEADERS);
  var colMap    = verdictColMap_(sh);
  var candidates = candidateAll_(false);

  var passed = 0, failed = 0, skipped = 0;

  Logger.log('═══ KAI VERDICT BATCH — ' + candidates.length + ' candidates ═══');

  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (!c.KAINo) { skipped++; continue; }

    try {
      var v = kaiVerdict_(c);
      verdictWriteRow_(sh, colMap, c._row, v);
      passed++;

      Logger.log(
        c.KAINo + ' | ' + (c.FullName || '(blank)') + '\n' +
        '  Stored Trade:  ' + (c.Trade || '—') + '\n' +
        '  Position 1:    ' + v.position1 + '  (confidence=' + v.confidence + '%)\n' +
        '  Position 2:    ' + v.position2 + '\n' +
        '  Position 3:    ' + v.position3 + '\n' +
        '  Qual Level:    ' + v.qual_level + '\n' +
        '  Qual Note:     ' + (v.qual_note || 'none') + '\n' +
        '  Summary:       ' + v.cap_summary
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
             '  Failed=' + failed + '  Skipped=' + skipped);
  logEvent('K14', 'VERDICT_BATCH_DONE',
    { detail: 'passed=' + passed + ' failed=' + failed });
  return { total: candidates.length, passed: passed, failed: failed, skipped: skipped };
}

/**
 * kaiVerdictOne — run verdict on a single candidate. For testing.
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
