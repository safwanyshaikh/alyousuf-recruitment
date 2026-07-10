/**
 * KAI14-Core · intake/duplicate_engine.gs   (Deliverable 4: Duplicate Detection)
 * LAYER OWNER: Intake (ingestion)
 * ───────────────────────────────────────────────────────────────────
 * Detects duplicates against the _Meta index. Key priority (Artifact 5):
 *   1) PassportNo  2) Mobile (last-9, len>7)  3) Email
 *   fallback) FullName (exact, len>3) → REVIEW (never auto-create/merge)
 *
 * Conflict rule: same Mobile but different PassportNo (both present) → CONFLICT.
 *
 * @returns {object} { outcome:'UNIQUE'|'DUPLICATE'|'CONFLICT'|'REVIEW', kaiNo, key }
 */
function duplicateCheck_(passport, mobile, email, name, testMode) {
  var P = normText_(passport);
  var M = normMobile_(mobile);
  var E = normEmail_(email);
  var N = normText_(name).toLowerCase();

  var sh = K14_sheet_(testMode ? K14.testSheets.meta : K14.sheets.meta, META_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) {
    if (!P && !M && !E) {
      return N && N.length > 3 ? { outcome: 'REVIEW', key: 'name(weak)' }
                               : { outcome: 'REVIEW', key: 'no-keys' };
    }
    return { outcome: 'UNIQUE' };
  }

  // _Meta cols: Key, Email, Mobile, PassportNo, KAINo, Name
  var data = sh.getRange(2, 1, last - 1, META_HEADERS.length).getValues();

  for (var i = 0; i < data.length; i++) {
    var mE = normEmail_(data[i][1]);
    var mM = normMobile_(data[i][2]);
    var mP = normText_(data[i][3]);
    var kai = data[i][4];

    // 1) Passport — strongest.
    if (P && mP && P === mP) return { outcome: 'DUPLICATE', kaiNo: kai, key: 'passport' };

    // 2) Mobile — with conflict detection.
    if (M && mM && M.length > 7 && M.slice(-9) === mM.slice(-9)) {
      if (P && mP && P !== mP)
        return { outcome: 'CONFLICT', kaiNo: kai, key: 'mobile-match/passport-differ' };
      return { outcome: 'DUPLICATE', kaiNo: kai, key: 'mobile' };
    }

    // 3) Email.
    if (E && mE && E === mE) return { outcome: 'DUPLICATE', kaiNo: kai, key: 'email' };
  }

  // No strong key present → weak fallback → recruiter review, never auto-create.
  if (!P && !M && !E) {
    return N && N.length > 3 ? { outcome: 'REVIEW', key: 'name(weak)' }
                             : { outcome: 'REVIEW', key: 'no-keys' };
  }
  return { outcome: 'UNIQUE' };
}
