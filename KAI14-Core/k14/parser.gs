/**
 * KAI14-Core · k14/parser.gs   (Deliverable 3: K14 Parsing)
 * LAYER OWNER: K14 (intelligence)
 * ───────────────────────────────────────────────────────────────────
 * Turns a CV (inline file) + email text into structured candidate fields.
 * Pure intelligence: returns an object. Writes nothing, mints nothing.
 */

var K14_PARSE_PROMPT =
  'You are a CV data extractor. Your only job is to COPY text from the CV into JSON fields. ' +
  'Do NOT interpret. Do NOT normalize. Do NOT infer. Do NOT reclassify. Do NOT rephrase. ' +
  'Copy verbatim. If a field is not present in the CV write empty string or 0. ' +
  'No markdown. No code fences. Return ONLY the raw JSON object.\n\n' +
  'Schema:\n' +
  '{\n' +
  '  "full_name": "", "email": "", "mobile": "", "passport_no": "",\n' +
  '  "nationality": "", "dob": "", "age": 0,\n' +
  '  "trade": "", "industry": "", "experience_years": 0, "gulf_experience_years": 0,\n' +
  '  "education": "", "position_applied": ""\n' +
  '}\n\n' +
  'FIELD EXTRACTION RULES:\n' +
  'full_name — COPY the name exactly as it appears at the top of the CV.\n' +
  'email — COPY the email address exactly as written.\n' +
  'mobile — COPY the phone number digits exactly, include country code digits if shown.\n' +
  'passport_no — COPY the passport or national ID number exactly as printed. ' +
  'Empty string if not found anywhere on the CV.\n' +
  'nationality — COPY the exact word(s) from the "Nationality" or "Citizenship" field. ' +
  'Look in personal details, header, and profile sections. ' +
  'Empty string only if the word "nationality" or "citizenship" does not appear on the CV.\n' +
  'dob — COPY the date of birth exactly, convert to YYYY-MM-DD format only.\n' +
  'age — COPY the age number if stated. Zero if not found.\n' +
  'trade — COPY the job title using this EXACT priority order:\n' +
  '  1. "Position Applied For" field — copy verbatim\n' +
  '  2. "Applying For" field — copy verbatim\n' +
  '  3. "Desired Position" field — copy verbatim\n' +
  '  4. "Current Position" field — copy verbatim\n' +
  '  5. Most recent job title from work history — copy verbatim\n' +
  '  6. Empty string — if none of the above exist\n' +
  'STOP copying at the first period, comma, semicolon, or line break. ' +
  'Maximum 8 words. Return the job title only — not a sentence, not an objective, ' +
  'not a description, not a paragraph. ' +
  'Do NOT use Career Objective, Career Summary, or Profile sections as the trade source. ' +
  'Do NOT infer. Do NOT rewrite. Do NOT normalize. Do NOT summarize. Do NOT convert.\n' +
  'industry — COPY the industry or sector name as it appears on the CV. ' +
  'Empty string if not stated.\n' +
  'experience_years — COPY the number from any "Total Experience" or "Years of Experience" ' +
  'statement as a number (e.g. "12 years experience" = 12). ' +
  'If no total is stated, write the number of years from first employment year to 2026.\n' +
  'gulf_experience_years — COPY the number of years worked in UAE, Saudi Arabia, Qatar, ' +
  'Kuwait, Oman, or Bahrain if stated. Zero if not mentioned.\n' +
  'education — COPY the highest qualification exactly as written.\n' +
  'position_applied — COPY the text from "Position Applied", "Applying For", or ' +
  '"Desired Role" field exactly. Empty string if not present.\n' +
  'Return ONLY the raw JSON object. Nothing before it. Nothing after it.';

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
