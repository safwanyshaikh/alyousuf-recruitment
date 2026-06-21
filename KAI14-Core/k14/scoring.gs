/**
 * KAI14-Core · k14/scoring.gs   (part of Deliverable 3: K14 output)
 * LAYER OWNER: K14 (intelligence)
 * ───────────────────────────────────────────────────────────────────
 * Evidence evaluation → Score + Verdict + Flags + MissingFields. Pure
 * function: takes parsed fields, returns a scored object. No persistence.
 *
 * Score is a transparent deployability signal (0-100), NOT a hidden model.
 * Verdict drives the recruiter's next action.
 */

function scoreCandidate_(p) {
  var score = 0;
  var missing = [];

  // Evidence weights (transparent, additive).
  if (p.trade)                       score += 25; else missing.push('trade');
  if (p.experience >= 2)             score += 20;
  else if (p.experience > 0)         score += 10;
  else                               missing.push('experience');
  if (p.gulfExperience > 0)          score += 15;
  if (p.nationality)                 score += 10; else missing.push('nationality');
  if (p.email || p.mobile)           score += 15; else missing.push('contact');
  if (p.passportNo)                  score += 10; else missing.push('passport');
  if (p.education)                   score += 5;
  if (score > 100) score = 100;

  // Verdict from evidence completeness + strength.
  var verdict, flags = '';
  if (!p.trade || (!p.email && !p.mobile)) {
    verdict = 'NEEDS_REVIEW'; flags = 'INCOMPLETE';
  } else if (score >= 70) {
    verdict = 'SHORTLISTED'; flags = 'GREEN';
  } else if (score >= 45) {
    verdict = 'NEEDS_CALL';  flags = 'YELLOW';
  } else {
    verdict = 'NEEDS_REVIEW'; flags = 'ORANGE';
  }

  var assessment = p.trade
    ? (p.trade + ', ' + (p.experience || 0) + 'y exp' +
       (p.gulfExperience ? ' (' + p.gulfExperience + 'y Gulf)' : '') + ' — ' + verdict)
    : 'Trade unresolved — manual review';

  return {
    score: score,
    verdict: verdict,
    flags: flags,
    kaiAssessment: assessment,
    missingFields: missing,
    state: (!p.email && !p.mobile) ? 'INCOMPLETE_CONTACT'
         : (!p.trade)              ? 'UNKNOWN_TRADE'
         :                           'PARSED'
  };
}
