/**
 * KAI14-Core · k14/verdict.gs   (Phase 1: KAI Verdict Engine — Capability Intelligence)
 * LAYER OWNER: K14 (intelligence)
 * ─────────────────────────────────────────────────────────────
 * SINGLE ENGINE. Evidence → Reasoning → Verdict.
 *
 *   evidencePrepare_(c)  — DETERMINISTIC. Produces FACTS. Decides NOTHING.
 *                          No thresholds. No classification. No scoring.
 *                          No trust points. Arithmetic + assembly only.
 *                          Names every absence explicitly. Prepares source
 *                          inputs for S3/S4/S6/S7 of the 7-source model.
 *
 *   kaiVerdict_(c)       — THE ONLY DECISION-MAKER. One Gemini call.
 *                          Executes the 7-step Constitutional reasoning chain.
 *                          Decides: positions · capability · credibility ·
 *                          timeline · regional · human-review.
 *
 * 13 Constitutional Principles govern every reasoning step.
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
  if (/ph\.?d|doctorate|d\.phil/.test(e))                        return { label: 'PhD',       min: 24, max: 27 };
  if (/m\.?tech|m\.?e\b|m\.?sc|mba|m\.?phil|master/.test(e))    return { label: 'Masters',   min: 22, max: 25 };
  if (/b\.?tech|b\.?e\b|b\.?sc|b\.?eng|b\.?com|b\.?a\b|bachelor|degree|graduat/.test(e))
                                                                  return { label: 'Degree',    min: 20, max: 23 };
  if (/diploma|dip\./.test(e))                                   return { label: 'Diploma',   min: 18, max: 20 };
  if (/iti|ncvt|ntc|trade cert|vocational/.test(e))             return { label: 'ITI/Trade', min: 17, max: 19 };
  if (/ssc|hsc|sslc|matric|10th|12th|secondary|high school/.test(e))
                                                                  return { label: 'Secondary', min: 16, max: 18 };
  return null;  // present but unrecognized — Verdict reasons from the raw string
}

/**
 * evidencePrepare_ — DETERMINISTIC. Produces facts only. Decides nothing.
 * Names every absence explicitly. Computes source-specific inputs for
 * Sources S3, S4, S6, S7 of the 7-source credibility model.
 * @param {object} c — candidate object
 * @returns {object} facts assembled for the Verdict prompt
 */
function evidencePrepare_(c) {
  var age        = parseInt(c.Age, 10)          || 0;
  var expClaimed = parseFloat(c.Experience)     || 0;
  var gulfExp    = parseFloat(c.GulfExperience) || 0;
  var eduRange   = educationCompletionRange_(c.Education);
  var mobile     = String(c.Mobile || '').replace(/^'/, '').trim();

  // ── Age-based max possible experience ──
  var maxPossible, variance;
  if (age <= 0) {
    maxPossible = 'N/A — age absent';
    variance    = 'N/A — age absent';
  } else if (!eduRange) {
    maxPossible = 'N/A — education not recognized';
    variance    = 'N/A — education not recognized';
  } else {
    var mp = Math.max(0, age - eduRange.min);
    maxPossible = mp;
    variance    = Math.round((expClaimed - mp) * 10) / 10;
  }

  // ── Gulf coherence inputs (S3) ──
  var gulfDelta      = Math.round((gulfExp - expClaimed) * 10) / 10;
  var gulfImpossible = gulfExp > 0 && expClaimed > 0 && gulfExp > expClaimed;
  var gulfPresent    = gulfExp > 0;

  // ── Location evidence stack (S7) ──
  var stack = [];
  if (mobile)                           stack.push('mobile: ' + mobile);
  if (normText_(c.Nationality))         stack.push('nationality: ' + normText_(c.Nationality));
  if (gulfPresent)                      stack.push('gulf experience: ' + gulfExp + 'y');
  if (normText_(c.Industry))            stack.push('industry: ' + normText_(c.Industry));
  if (normText_(c.PositionApplied))     stack.push('applied for: ' + normText_(c.PositionApplied));

  // ── Identity evidence ──
  var identityFacts =
    'passport ' + (normText_(c.PassportNo) ? 'present' : 'absent') + '; ' +
    'email '    + (normText_(c.Email)      ? 'present' : 'absent') + '; ' +
    'mobile '   + (mobile                  ? 'present' : 'absent');

  // ── Credential indicator (S6) ──
  var credentialIndicator = eduRange
    ? (eduRange.label + ' — recognized credential type')
    : (normText_(c.Education)
        ? 'Education present but type unrecognized by intake parser'
        : 'Education absent');

  // ── Project / industry evidence (S4) ──
  var projectEvidence = normText_(c.Industry)
    ? 'Industry: ' + normText_(c.Industry)
    : 'industry absent';

  // ── Explicit absence list for Evidence Inventory step (P1) ──
  var absent = [];
  if (age <= 0)                          absent.push('Age');
  if (!normText_(c.Education))           absent.push('Education');
  if (!normText_(c.Trade))               absent.push('Current/Recent Title');
  if (!normText_(c.PositionApplied))     absent.push('Position Applied For');
  if (!normText_(c.Nationality))         absent.push('Nationality');
  if (!normText_(c.Industry))            absent.push('Industry');
  if (!gulfPresent)                      absent.push('Gulf Experience');
  if (!mobile)                           absent.push('Mobile');
  if (!normText_(c.PassportNo))          absent.push('Passport');
  if (!normText_(c.Email))               absent.push('Email');

  return {
    age:                 age,
    expClaimed:          expClaimed,
    gulfExp:             gulfExp,
    eduRange:            eduRange,
    maxPossible:         maxPossible,
    variance:            variance,
    gulfDelta:           gulfDelta,
    gulfImpossible:      gulfImpossible,
    gulfPresent:         gulfPresent,
    stack:               stack,
    identityFacts:       identityFacts,
    credentialIndicator: credentialIndicator,
    projectEvidence:     projectEvidence,
    absentFields:        absent
  };
}

/**
 * buildVerdictPrompt_ — assemble the 7-step Constitutional reasoning prompt.
 * The 13 Principles govern every step. Facts are EVIDENCE, not rules.
 * Gemini executes the full chain in one call and returns the complete JSON.
 */
function buildVerdictPrompt_(c, f) {
  var eduRangeStr = f.eduRange
    ? f.eduRange.label + ' (typically completed age ' + f.eduRange.min + '–' + f.eduRange.max + ')'
    : 'not recognized / not stated';

  var absentStr = f.absentFields.length
    ? f.absentFields.join(', ')
    : 'none — all key fields present';

  return (
'You are KAI — the Human Intelligence recruitment reasoning engine.\n' +
'Your task: execute the 7-step Constitutional reasoning chain below and return\n' +
'a single JSON verdict. Do NOT shortcut, skip, or merge steps.\n\n' +

'══════════════════════════════════════════════════════\n' +
'13 CONSTITUTIONAL PRINCIPLES (govern every step)\n' +
'══════════════════════════════════════════════════════\n' +
'P1  Evidence Inventory First — enumerate what IS present and what is ABSENT\n' +
'    before any judgment. Named absences are inputs, not disqualifiers.\n' +
'P2  Inference Before Interrogation — reason from available evidence;\n' +
'    never penalize a candidate for data that was simply not collected.\n' +
'P3  Capability Is What Was Done — capability_domain is plain English describing\n' +
'    demonstrated field of work. No taxonomy. No role families. No keywords.\n' +
'P4  Capability Wins — when capability and credential disagree, capability\n' +
'    governs position generation. Always. A B.E. Mechanical who has spent\n' +
'    8 years in piping engineering IS a Piping Engineer, not a Mechanical\n' +
'    Engineer. 8 years in HSE IS an HSE professional, not a civil engineer.\n' +
'P5  Credential Extends or Confirms — education is positioned relative to\n' +
'    demonstrated capability. Education NEVER overrides career trajectory.\n' +
'P6  Seven Sources — confidence and credibility emerge from corroboration\n' +
'    across 7 independent sources. Count is context, not a rule. One hard\n' +
'    CONTRADICTS (Gulf > Total) may outweigh several SUPPORTS.\n' +
'P7  Absence Is Neutral — evidence absence is NEUTRAL unless other evidence\n' +
'    actively contradicts it. Never treat absence as contradiction.\n' +
'P8  Credibility Is Not Age-Centric — experience_credibility reasons from\n' +
'    internal coherence of the whole evidence picture. When age is absent,\n' +
'    judge on role-title progression, gulf-vs-total coherence, and seniority\n' +
'    consistency. Do NOT default to LOW when age is absent.\n' +
'P9  Capability Level Is Inferred — infer capability_level from duration,\n' +
'    complexity, environment, and consistency. No fixed year bands ever.\n' +
'P10 qual_risk Is Always False at Intake — qual_risk is requirement-specific.\n' +
'    It has no meaning at intake. Always return false.\n' +
'P11 Human Review Is Success — LOW credibility, INCOHERENT timeline, thin\n' +
'    identity (all three absent), or critical missing evidence routes to a\n' +
'    human. This is the engine working correctly. Never minimize it.\n' +
'P12 Three Positions From Capability — all three positions are capability-driven.\n' +
'    No credential fallback for position3. Gemini decides all three from\n' +
'    demonstrated work evidence. Empty string if no third can be inferred.\n' +
'P13 qual_level Is Credential Vocabulary Only — exactly one of:\n' +
'    Degree | Diploma | ITI Trade | Certification Based | Unknown.\n' +
'    Never an occupational label (not "Engineer", not "Technician").\n' +
'P14 Current Designation Is Evidence, Never The Ceiling — the current or\n' +
'    recent title tells you what the candidate was called, not what they can\n' +
'    do. Visa classifications, employer structures, and historical opportunity\n' +
'    routinely mean GCC professionals perform engineering responsibilities\n' +
'    while holding draftsman, technician, or supervisor titles. You must\n' +
'    determine the highest role the candidate can credibly perform based on\n' +
'    ALL available evidence: education, career progression, years of\n' +
'    experience, industry, projects, gulf exposure, credential contribution,\n' +
'    capability consistency, and overall evidence coherence. You may\n' +
'    recommend a role that has never appeared on the CV if the evidence\n' +
'    credibly supports that capability. Never anchor position1 on the\n' +
'    current title. Capability always wins over designation.\n' +
'P15 Age Absence Never Reduces Credibility — when age is absent, the Age\n' +
'    source (S1) is NEUTRAL. Evaluate credibility from the remaining 6\n' +
'    sources only. If those sources demonstrate consistent career\n' +
'    progression, logical industry history, coherent gulf experience,\n' +
'    consistent role evolution, no timeline contradictions, and no\n' +
'    impossible arithmetic, then HIGH credibility remains fully valid.\n' +
'    Age absence removes one corroborating source. It never becomes a\n' +
'    contradiction. Never downgrade credibility solely because age is\n' +
'    unavailable.\n' +
'P16 Recommend Deployment Opportunities, Not Titles — KAI does not\n' +
'    recommend titles; it recommends deployment opportunities. Every\n' +
'    recommended position must INCREASE the recruiter\'s deployment options.\n' +
'    If a recommendation does not expand deployment possibilities, it does\n' +
'    not deserve a recommendation slot. Qualification is already captured\n' +
'    separately in qual_level, education, and credential_contribution — and\n' +
'    so are current title, stored trade, and industry. A position that\n' +
'    merely restates evidence already known (e.g. recommending "Mechanical\n' +
'    Engineer" for a B.E. Mechanical holder who has actually worked 8 years\n' +
'    in piping) contributes no new recruiter value. Recommend adjacent roles\n' +
'    supported by demonstrated work evidence — actual experience, industry,\n' +
'    projects, tools, responsibilities, career progression — NOT roles\n' +
'    derived solely from the qualification or restating the stored title.\n' +
'    The three positions must COMPLEMENT each other: each must broaden\n' +
'    deployable capability inside the demonstrated career domain, and none\n' +
'    may communicate the same capability as another using different words.\n' +
'    Every recommendation must earn its place.\n\n' +

'══════════════════════════════════════════════════════\n' +
'CANDIDATE EVIDENCE (verbatim from CV)\n' +
'══════════════════════════════════════════════════════\n' +
'Position Applied For : ' + (normText_(c.PositionApplied) || '(absent)') + '\n' +
'Current/Recent Title : ' + (normText_(c.Trade)           || '(absent)') + '\n' +
'Education            : ' + (normText_(c.Education)       || '(absent)') + '\n' +
'Total Experience     : ' + (f.expClaimed > 0 ? f.expClaimed + ' years' : '(absent)') + '\n' +
'Gulf Experience      : ' + (f.gulfPresent ? f.gulfExp + ' years' : '(absent)') + '\n' +
'Industry             : ' + (normText_(c.Industry)        || '(absent)') + '\n' +
'Age                  : ' + (f.age > 0 ? f.age + ' years' : '(absent)') + '\n' +
'Nationality          : ' + (normText_(c.Nationality)     || '(absent)') + '\n\n' +

'══════════════════════════════════════════════════════\n' +
'PREPARED ARITHMETIC FACTS (do not re-compute — use as inputs)\n' +
'══════════════════════════════════════════════════════\n' +
'Education completion band : ' + eduRangeStr + '\n' +
'Max possible experience   : ' + f.maxPossible + '\n' +
'Experience variance       : ' + f.variance + '   (positive = claim exceeds generous max)\n' +
'Gulf-vs-Total delta       : ' + f.gulfDelta + '   (positive = Gulf > Total = impossible)\n' +
'Gulf impossible flag      : ' + (f.gulfImpossible
    ? 'YES — Gulf (' + f.gulfExp + 'y) exceeds Total (' + f.expClaimed + 'y)'
    : 'no') + '\n' +
'Credential indicator (S6) : ' + f.credentialIndicator + '\n' +
'Project / industry (S4)   : ' + f.projectEvidence + '\n' +
'Identity evidence         : ' + f.identityFacts + '\n' +
'Location stack (S7)       : ' + (f.stack.length ? f.stack.join(' | ') : '(none)') + '\n' +
'Named absences (P1)       : ' + absentStr + '\n\n' +

'══════════════════════════════════════════════════════\n' +
'DETERMINISTIC EVIDENCE — IMMUTABILITY RULE\n' +
'══════════════════════════════════════════════════════\n' +
'The arithmetic facts above are computed by the KAI intake engine.\n' +
'They are objective evidence. They have higher authority than your\n' +
'interpretation. You reason OVER them. You never rewrite them.\n\n' +
'You MAY: interpret context · explain contributing factors · soften\n' +
'  consequence · adjust confidence · explain why the gap may be minor.\n' +
'You must NEVER: contradict an arithmetic result · describe a timeline\n' +
'  as "no gaps" or "no impossible arithmetic" when the evidence shows\n' +
'  otherwise · return timeline_credibility = COHERENT when a factual\n' +
'  contradiction exists in the prepared data.\n\n' +
'SPECIFIC RULES (non-negotiable):\n' +
'  · If Experience Variance > 0 (claimed exceeds the generous max):\n' +
'    acknowledge this discrepancy in your reasoning. You may assess it\n' +
'    as minor or major, but you cannot deny it exists. timeline_credibility\n' +
'    must be MINOR_GAPS or INCOHERENT — never COHERENT.\n' +
'  · If Gulf impossible flag = YES (Gulf > Total):\n' +
'    you must flag this. timeline_credibility must be INCOHERENT.\n' +
'  Human Review remains your judgment call. These rules govern only\n' +
'  whether you may deny a deterministic arithmetic fact.\n\n' + +
'Execute in order. Do not skip. Do not output partial JSON mid-chain.\n' +
'══════════════════════════════════════════════════════\n\n' +

'STEP 1 — EVIDENCE INVENTORY (P1, P7)\n' +
'  Enumerate what IS present from the evidence above.\n' +
'  Enumerate what is ABSENT using the named absences list.\n' +
'  Apply P7: each absence is NEUTRAL unless other evidence actively\n' +
'  contradicts it. Do not penalize. Do not assume.\n\n' +

'STEP 2 — CAPABILITY INTELLIGENCE (P3, P4, P9)\n' +
'  From work history, title, industry, duration, and environment:\n' +
'  capability_domain — plain English field this person has demonstrated.\n' +
'    Examples: "piping engineering", "HSE management", "civil construction",\n' +
'    "electrical installation", "quantity surveying". No taxonomy.\n' +
'  capability_level — Gemini-inferred from duration + complexity + environment\n' +
'    + consistency. Examples: "entry-level practitioner", "mid-career\n' +
'    specialist", "senior practitioner", "expert". No fixed year bands (P9).\n' +
'  capability_clarity — HIGH | MEDIUM | LOW. How clearly does the evidence\n' +
'    establish the domain? Multiple consistent titles in one domain = HIGH.\n' +
'    Single vague title = LOW. Conflicting domains = LOW.\n\n' +

'STEP 3 — CREDENTIAL VALIDATION (P5, P13)\n' +
'  credential_relationship — one of:\n' +
'    EXTENDS (education goes beyond or deepens the capability claim)\n' +
'    CONFIRMS (education subject aligns with demonstrated work)\n' +
'    IRRELEVANT (education subject unrelated to demonstrated work)\n' +
'    ABSENT (no education data available)\n' +
'  credential_contribution — one sentence on how education contributes to\n' +
'    understanding this candidate\'s capability. This is a note, not a verdict.\n' +
'    Example: "B.E. Mechanical provides foundational theory that supports but\n' +
'    does not define 8 years of specialist piping engineering practice."\n' +
'  qual_level — exactly one of (P13): Degree | Diploma | ITI Trade |\n' +
'    Certification Based | Unknown. From education evidence only.\n' +
'  qual_note — note anything about the qualification worth flagging for a\n' +
'    recruiter. GCC context: Diploma Engineer is normal, not a concern.\n' +
'    Empty string if nothing notable.\n' +
'  qual_risk — always false at intake (P10).\n\n' +

'STEP 4 — MULTI-EVIDENCE CREDIBILITY (P6, P7, P8)\n' +
'  Assess each source independently. Return SUPPORTS | NEUTRAL | CONTRADICTS.\n\n' +
'  S1 Age (biological timeline check)\n' +
'    Is claimed experience physically possible given age and eduRange.min?\n' +
'    Age absent → NEUTRAL. Apply P15: the remaining 6 sources carry the\n' +
'    credibility judgment. Do NOT reduce experience_credibility because\n' +
'    age is absent. Absence here is silence, not contradiction.\n' +
'  S2 Education (credential-experience alignment)\n' +
'    Does the education level fit the seniority and role complexity claimed?\n' +
'  S3 Gulf (regional coherence)\n' +
'    Is gulf experience plausible vs total? Gulf > Total = CONTRADICTS.\n' +
'    Gulf absent but high total claimed in region = NEUTRAL (P7).\n' +
'  S4 Project (industry / project context)\n' +
'    Does the industry context support the depth and specialisation claimed?\n' +
'  S5 Role (title and career progression)\n' +
'    Does title progression reflect realistic career growth in this domain?\n' +
'    An established HSE professional is not a civil engineer (P4).\n' +
'  S6 Credential (formal qualification as independent signal)\n' +
'    Does the qualification level, as a standalone signal, align with the\n' +
'    seniority and experience claimed?\n' +
'  S7 Regional (location evidence stack)\n' +
'    Does the location stack (mobile, nationality, gulf) support realistic\n' +
'    employment in the claimed region?\n\n' +
'  After assessing all 7 sources:\n' +
'  sources_supporting — count of SUPPORTS verdicts\n' +
'  sources_contradicting — count of CONTRADICTS verdicts\n' +
'  experience_credibility — YOU reason to HIGH | MEDIUM | LOW (P6, P8).\n' +
'    Count is context, not a rule. Reason from the dominant evidence picture.\n' +
'    A hard CONTRADICTS (Gulf > Total) can outweigh multiple SUPPORTS.\n' +
'    When age is absent, judge coherence from the other 6 sources (P8).\n' +
'  credibility_reasoning — one sentence citing dominant evidence behind\n' +
'    your credibility call.\n\n' +

'STEP 5 — POSITION GENERATION (P4, P12, P14, P16)\n' +
'  Generate three positions from demonstrated capability. Apply the\n' +
'  following mandatory priority order. Each position must add UNIQUE\n' +
'  recruiter value and expand deployment opportunity (P16).\n\n' +
'  position1 — HIGHEST DEPLOYABLE CAPABILITY.\n' +
'    Ask: given ALL evidence (education + years + industry + progression +\n' +
'    credential + gulf), what is the most senior role this person can\n' +
'    credibly perform? This may be ABOVE their current title. It may be a\n' +
'    role that never appeared on the CV. Capability governs (P14).\n' +
'    PROHIBITED: anchoring position1 on the current or most recent title.\n' +
'    A B.E. Mechanical engineer with 8 years in piping domain work is a\n' +
'    Piping Engineer, not a Piping Draftsman, even if that was their title.\n' +
'    A candidate with 8 years of consistent HSE work is an HSE professional,\n' +
'    not a civil engineer, even if their degree is civil.\n' +
'  position2 — MOST DEPLOYABLE ADJACENT CAPABILITY (within the demonstrated\n' +
'    career domain).\n' +
'    The closest adjacent role that BROADENS deployment inside the domain\n' +
'    the candidate has actually worked in. It must be supported by demonstrated\n' +
'    work evidence (experience, industry, projects, tools, responsibilities),\n' +
'    NOT by the educational qualification (P16).\n' +
'    PROHIBITED: restating the educational discipline as position2. For a\n' +
'    B.E. Mechanical holder with 8 years of piping work, position2 is\n' +
'    "Piping Designer" (broadens piping deployment) — NOT "Mechanical\n' +
'    Engineer" (merely repeats the degree already captured in qual_level).\n' +
'  position3 — STRONGEST HISTORICALLY EVIDENCED ROLE.\n' +
'    The most concrete role directly supported by documented title history.\n' +
'    This is where the current or past designation belongs if it represents\n' +
'    a real capability ceiling. May be empty string if positions 1 and 2\n' +
'    already fully represent the evidence.\n\n' +
'  SELF-CHECK before returning the final three positions (P16):\n' +
'    1. For each position ask: "Does this recommendation create an\n' +
'       ADDITIONAL deployment opportunity, or does it merely restate evidence\n' +
'       already known?" Evidence already known includes education,\n' +
'       qualification, credential, current title, stored trade, and industry.\n' +
'       A position that only restates known evidence does not earn a slot —\n' +
'       discard it and choose a better adjacent capability from demonstrated\n' +
'       work evidence.\n' +
'    2. Compare the three positions against each other. If any two\n' +
'       communicate essentially the same capability using different words,\n' +
'       remove the weaker one and replace it with another capability that\n' +
'       broadens deployment options and is supported by evidence. The three\n' +
'       must COMPLEMENT each other, never duplicate.\n' +
'    Every recommendation must earn its place by providing unique deployment\n' +
'    value to the recruiter.\n\n' +
'  PROHIBITED ORDERING: current title → related title → past title.\n' +
'  That is ATS title-matching behaviour. KAI does not do this.\n\n' +

'STEP 6 — CONFIDENCE AND HUMAN REVIEW (P11)\n' +
'  confidence — 0 to 100. Your reasoning-based confidence in position1.\n' +
'    No caps. No floors. Earn it from genuine corroboration across sources.\n' +
'  human_review — true if ANY of the following:\n' +
'    · experience_credibility is LOW\n' +
'    · timeline_credibility is INCOHERENT\n' +
'    · identity is thin (passport AND email AND mobile all absent)\n' +
'    · critical evidence is absent that would materially change the verdict\n' +
'    Human review is intelligence success (P11). Do NOT minimize it.\n' +
'  human_review_reason — one sentence for the recruiter: what to verify.\n' +
'    Empty string if human_review is false.\n\n' +

'STEP 7 — VERDICT ASSEMBLY\n' +
'  Compile all fields into the final JSON.\n' +
'  timeline_credibility — COHERENT | MINOR_GAPS | INCOHERENT.\n' +
'    Reason across education span, employment duration, seniority\n' +
'    progression, and the Gulf-vs-Total delta.\n' +
'  timeline_notes — one sentence on what you observed in the chronology.\n' +
'  regional_confidence — plain English judgment of where this candidate\n' +
'    is regionally established. Examples: "Saudi: High", "UAE: Medium",\n' +
'    "India-based, no GCC presence evident", "Region unclear".\n' +
'  inference_notes — one sentence on the regional inference and any gap.\n' +
'  cap_summary — one sentence on what this human can demonstrably do.\n\n' +

'══════════════════════════════════════════════════════\n' +
'RETURN ONLY THIS JSON — NO MARKDOWN, NO CODE FENCES, NOTHING ELSE\n' +
'══════════════════════════════════════════════════════\n' +
'{\n' +
'  "position1": "",\n' +
'  "position2": "",\n' +
'  "position3": "",\n' +
'  "capability_domain": "",\n' +
'  "capability_level": "",\n' +
'  "capability_clarity": "",\n' +
'  "credential_relationship": "",\n' +
'  "credential_contribution": "",\n' +
'  "qual_level": "",\n' +
'  "qual_note": "",\n' +
'  "qual_risk": false,\n' +
'  "cap_summary": "",\n' +
'  "confidence": 0,\n' +
'  "source_s1_age": "",\n' +
'  "source_s2_education": "",\n' +
'  "source_s3_gulf": "",\n' +
'  "source_s4_project": "",\n' +
'  "source_s5_role": "",\n' +
'  "source_s6_credential": "",\n' +
'  "source_s7_regional": "",\n' +
'  "sources_supporting": 0,\n' +
'  "sources_contradicting": 0,\n' +
'  "experience_credibility": "",\n' +
'  "credibility_reasoning": "",\n' +
'  "timeline_credibility": "",\n' +
'  "timeline_notes": "",\n' +
'  "regional_confidence": "",\n' +
'  "inference_notes": "",\n' +
'  "human_review": false,\n' +
'  "human_review_reason": ""\n' +
'}'
  );
}

/**
 * kaiVerdict_ — THE decision-maker. One Gemini call. 7-step Constitutional chain.
 * Maps expanded JSON schema to the 19 existing verdict columns.
 * @param {object} c — candidate object
 * @returns {object} prepared facts + verdict decisions, ready for verdictWriteRow_
 */
function kaiVerdict_(c) {
  var f = evidencePrepare_(c);
  var j = geminiJson(buildVerdictPrompt_(c, f), null);

  // ── KAIQualNote: credential_contribution (primary) + qual_note if distinct ──
  var credContrib  = normText_(j.credential_contribution) || '';
  var qualNoteRaw  = normText_(j.qual_note)               || '';
  var qualNote     = (credContrib && qualNoteRaw && credContrib !== qualNoteRaw)
    ? credContrib + ' | ' + qualNoteRaw
    : (credContrib || qualNoteRaw);

  // ── KAICredReasoning: reasoning sentence + all 7 source verdicts ──
  var sourcesSummary = [
    'S1-Age:'  + (normText_(j.source_s1_age)         || '?'),
    'S2-Edu:'  + (normText_(j.source_s2_education)   || '?'),
    'S3-Gulf:' + (normText_(j.source_s3_gulf)        || '?'),
    'S4-Proj:' + (normText_(j.source_s4_project)     || '?'),
    'S5-Role:' + (normText_(j.source_s5_role)        || '?'),
    'S6-Cred:' + (normText_(j.source_s6_credential)  || '?'),
    'S7-Reg:'  + (normText_(j.source_s7_regional)    || '?')
  ].join(' | ');
  var credReasoning =
    (normText_(j.credibility_reasoning) || '') +
    ' [' + sourcesSummary + ']' +
    ' sup=' + (parseInt(j.sources_supporting,    10) || 0) +
    ' con=' + (parseInt(j.sources_contradicting, 10) || 0);

  // ── KAIEvidenceStack: location stack + capability domain + level ──
  var stackParts = [];
  if (f.stack.length)                    stackParts.push(f.stack.join(' | '));
  if (normText_(j.capability_domain))    stackParts.push('domain:' + normText_(j.capability_domain));
  if (normText_(j.capability_level))     stackParts.push('level:' + normText_(j.capability_level));
  var evidenceStack = stackParts.join(' || ');

  // ── KAIInferenceNotes: domain + level + clarity + inference_notes ──
  var inferParts = [];
  if (normText_(j.capability_domain))    inferParts.push('domain:' + normText_(j.capability_domain));
  if (normText_(j.capability_level))     inferParts.push('level:' + normText_(j.capability_level));
  if (normText_(j.capability_clarity))   inferParts.push('clarity:' + normText_(j.capability_clarity));
  if (normText_(j.inference_notes))      inferParts.push(normText_(j.inference_notes));
  var inferenceNotes = inferParts.join(' | ');

  // ── KAIHumanReview: 'REVIEW — [reason]' or '' ──
  var humanReview = (j.human_review === true || String(j.human_review).toLowerCase() === 'true');
  var humanReviewVal = humanReview
    ? 'REVIEW — ' + (normText_(j.human_review_reason) || 'recruiter review required')
    : '';

  return {
    // facts (from prep — deterministic)
    exp_claimed:      f.expClaimed,
    exp_max_possible: f.maxPossible,
    exp_variance:     f.variance,
    evidence_stack:   evidenceStack,
    // decisions (from Verdict — one Gemini call)
    position1:        normText_(j.position1)  || '',
    position2:        normText_(j.position2)  || '',
    position3:        normText_(j.position3)  || '',
    qual_level:       normText_(j.qual_level) || 'Unknown',
    qual_note:        qualNote,
    cap_summary:      normText_(j.cap_summary) || '',
    confidence:       parseInt(j.confidence, 10) || 0,
    exp_credibility:  normText_(j.experience_credibility) || 'MEDIUM',
    cred_reasoning:   credReasoning,
    timeline_cred:    normText_(j.timeline_credibility) || '',
    timeline_notes:   normText_(j.timeline_notes)       || '',
    regional_conf:    normText_(j.regional_confidence)  || '',
    inference_notes:  inferenceNotes,
    human_review:     humanReview,
    human_review_val: humanReviewVal
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

  putNum('KAIExpClaimed',     v.exp_claimed,      '0.#');
  putNum('KAIExpMaxPossible', v.exp_max_possible,  '0.#');
  putNum('KAIExpVariance',    v.exp_variance,      '0.#');
  put('KAIExpCredibility', v.exp_credibility);
  put('KAICredReasoning',  v.cred_reasoning);

  put('KAITimelineCred',  v.timeline_cred);
  put('KAITimelineNotes', v.timeline_notes);

  put('KAIEvidenceStack',  v.evidence_stack);
  put('KAIRegionalConf',   v.regional_conf);
  put('KAIInferenceNotes', v.inference_notes);

  put('KAIHumanReview', v.human_review_val);
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
        '  Exp Credibility: ' + v.exp_credibility + '\n' +
        '  Timeline:        ' + v.timeline_cred + '  — ' + v.timeline_notes + '\n' +
        '  Regional:        ' + v.regional_conf + '\n' +
        '  Human Review:    ' + (v.human_review ? v.human_review_val : 'no') + '\n' +
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
