/**
 * KAI14-Core · k14/parser.gs   (Deliverable 3: K14 Parsing)
 * LAYER OWNER: K14 (intelligence)
 * ───────────────────────────────────────────────────────────────────
 * Turns a CV (inline file) + email text into structured candidate fields.
 * Pure intelligence: returns an object. Writes nothing, mints nothing.
 */

var K14_PARSE_PROMPT =
  'You are a GCC blue-collar recruitment CV parser. Extract STRICT JSON only, ' +
  'no prose. Use empty string for unknown fields. Schema:\n' +
  '{\n' +
  '  "full_name": "", "email": "", "mobile": "", "passport_no": "",\n' +
  '  "nationality": "", "dob": "", "age": 0,\n' +
  '  "trade": "", "industry": "", "experience_years": 0, "gulf_experience_years": 0,\n' +
  '  "education": "", "position_applied": ""\n' +
  '}\n' +
  'Rules: mobile = digits with country code if present. trade = the single primary ' +
  'blue-collar trade (e.g. Welder, Electrician, Mason, Driver). experience_years = ' +
  'total years as a number. Return ONLY the JSON object.';

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
