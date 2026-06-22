/**
 * KAI14-Core · k14/parser.gs   (Deliverable 3: K14 Parsing)
 * LAYER OWNER: K14 (intelligence)
 * ───────────────────────────────────────────────────────────────────
 * Turns a CV (inline file) + email text into structured candidate fields.
 * Pure intelligence: returns an object. Writes nothing, mints nothing.
 */

var K14_PARSE_PROMPT =
  'You are a recruitment CV parser for GCC-based hiring. ' +
  'Extract STRICT JSON only. No markdown. No prose. No code fences. ' +
  'Use empty string for unknown fields. Schema:\n' +
  '{\n' +
  '  "full_name": "", "email": "", "mobile": "", "passport_no": "",\n' +
  '  "nationality": "", "dob": "", "age": 0,\n' +
  '  "trade": "", "industry": "", "experience_years": 0, "gulf_experience_years": 0,\n' +
  '  "education": "", "position_applied": ""\n' +
  '}\n' +
  'RULES — follow exactly:\n' +
  'full_name: exact name from CV header or top section.\n' +
  'email: exact email address from CV.\n' +
  'mobile: phone number digits only, include country code digits if present.\n' +
  'passport_no: exact passport or ID number as printed. Empty string if not found.\n' +
  'nationality: country of citizenship exactly as written in the CV ' +
  '(look in personal details, header, or objective section). ' +
  'Empty string only if genuinely absent — do not guess.\n' +
  'dob: date of birth in YYYY-MM-DD format. Empty string if not found.\n' +
  'age: age as integer. Calculate from DOB if age not stated.\n' +
  'trade: the EXACT primary job title or role as it appears in the CV. ' +
  'Copy the title from the "Position Applied For", "Objective", or most recent job. ' +
  'Do NOT rephrase, generalize, or translate to a different role family. ' +
  'If CV says "Engine Officer" write "Engine Officer". ' +
  'If CV says "Panchayat Secretary" write "Panchayat Secretary". ' +
  'If CV says "QC Inspector" write "QC Inspector". ' +
  'Never substitute a different trade.\n' +
  'industry: the sector or industry the candidate has primarily worked in.\n' +
  'experience_years: TOTAL years of professional work experience as a decimal number. ' +
  'If the CV states a total (e.g. "12 years experience"), use that number. ' +
  'Otherwise sum all individual job durations shown in the work history.\n' +
  'gulf_experience_years: years worked specifically inside GCC countries ' +
  '(UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain) as a decimal number. ' +
  'Zero if none found.\n' +
  'education: highest academic qualification.\n' +
  'position_applied: exact text from any "Position Applied" or "Applying For" field. ' +
  'Empty string if not present.\n' +
  'Return ONLY the raw JSON object. No other text before or after.';

/**
 * parseCv_ — parse one CV.
 * @param {object} input - { bytesBase64, mimeType, emailText }
 * @returns {object} normalized parsed fields
 */
function parseCv_(input) {
  var prompt = K14_PARSE_PROMPT;
  if (input.emailText) prompt += '\n\nEmail body context:\n' + String(input.emailText).slice(0, 1500);

  var j = geminiJson(prompt,
    input.bytesBase64 ? { mimeType: input.mimeType, bytesBase64: input.bytesBase64 } : null);

  return {
    fullName:        normText_(j.full_name),
    email:           normEmail_(j.email),
    mobile:          normMobile_(j.mobile),
    passportNo:      normText_(j.passport_no),
    nationality:     normText_(j.nationality),
    dob:             normText_(j.dob),
    age:             parseInt(j.age, 10) || '',
    trade:           normText_(j.trade),
    industry:        normText_(j.industry),
    experience:      parseFloat(j.experience_years) || 0,
    gulfExperience:  parseFloat(j.gulf_experience_years) || 0,
    education:       normText_(j.education),
    positionApplied: normText_(j.position_applied)
  };
}
