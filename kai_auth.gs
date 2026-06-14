/**
 * ═══════════════════════════════════════════════════════════════════
 *  KAI — Authentication
 *  Version  : 1.0.0
 *  Date     : 14-Jun-2026
 *
 *  Provides the login route consumed by Lovable's LoginPage.
 *  Validates credentials against _LoginSystem sheet.
 *  Token validation (for subsequent requests) is handled by
 *  getSessionUser_v291_ in patch_v291 — this file does NOT touch it.
 *
 *  _LoginSystem column map (8 cols, 1-indexed):
 *    A(0) email  B(1) password  C(2) role  D(3) name
 *    E(4) active F(5) token     G(6) expiry H(7) lastLogin
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// PUBLIC — called from ROUTES_ in kai_sprint4_api.gs
// ───────────────────────────────────────────────────────────────────

/**
 * Validate email + password against _LoginSystem.
 * Returns the pre-set session token on success.
 *
 * @param {string} email
 * @param {string} password  plain-text (stored hashed as SHA-256 hex or plain)
 * @return {{ ok, data: { token, role, name, email } } | { ok, error }}
 */
function kaiLogin_(email, password) {
  if (!email || !password) {
    return { ok: false, error: 'email and password are required.' };
  }

  var emailNorm = String(email).toLowerCase().trim();

  try {
    var ss    = getMasterSS_();
    var sheet = ss ? ss.getSheetByName('_LoginSystem') : null;
    if (!sheet || sheet.getLastRow() < 2) {
      return { ok: false, error: 'Login system not configured. Contact administrator.' };
    }

    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();

    for (var i = 0; i < rows.length; i++) {
      var rowEmail = String(rows[i][0] || '').toLowerCase().trim();
      if (rowEmail !== emailNorm) continue;

      // Check active flag (col 4) — skip row if explicitly FALSE
      var active = String(rows[i][4] || '').toUpperCase().trim();
      if (active === 'FALSE' || active === '0') {
        return { ok: false, error: 'Account is inactive. Contact administrator.' };
      }

      // Validate password — support plain text and SHA-256 hex
      var storedPw   = String(rows[i][1] || '').trim();
      var inputPlain = String(password).trim();
      var inputHash  = computeSha256Hex_(inputPlain);
      var pwValid    = (storedPw === inputPlain) || (storedPw !== '' && storedPw === inputHash);

      if (!pwValid) {
        return { ok: false, error: 'Invalid email or password.' };
      }

      // Retrieve pre-set session token
      var token  = String(rows[i][5] || '').trim();
      var expiry = rows[i][6] ? new Date(String(rows[i][6])) : null;

      if (!token) {
        return { ok: false, error: 'Session token not configured. Contact administrator.' };
      }
      if (expiry && expiry <= new Date()) {
        return { ok: false, error: 'Session expired. Contact administrator to refresh.' };
      }

      var role = String(rows[i][2] || 'recruiter').toLowerCase().trim();
      var name = String(rows[i][3] || 'Recruiter').trim();

      // Warm the token cache so first authenticated request skips sheet read
      try {
        CacheService.getScriptCache().put(
          'KAI_TOK_' + token,
          JSON.stringify({ role: role, name: name, email: emailNorm }),
          21600  // 6 hours
        );
      } catch (cacheErr) {}

      // Record last login timestamp (best effort — non-blocking)
      try { sheet.getRange(i + 2, 8).setValue(new Date()); } catch (e) {}

      return {
        ok:   true,
        data: { token: token, role: role, name: name, email: emailNorm }
      };
    }

    return { ok: false, error: 'Invalid email or password.' };

  } catch (ex) {
    Logger.log('kaiLogin_ error: ' + ex.message);
    return { ok: false, error: 'Login error: ' + ex.message };
  }
}

// ───────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ───────────────────────────────────────────────────────────────────

function computeSha256Hex_(input) {
  try {
    var bytes  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
    return bytes.map(function(b) {
      var hex = (b < 0 ? b + 256 : b).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  } catch (e) {
    return '';
  }
}
