/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFRASTRUCTURE — AUTH LAYER (infrastructure_auth.gs)
 * ───────────────────────────────────────────────────────────────────────────
 * Session management for the Lovable React frontend via doPost JSON API.
 * Architecture: Foundation → K14 → Execution → Infrastructure → UI
 *
 * Auth model:
 *   - Credentials stored in `_LoginSystem` sheet (Email, PasswordHash, Role,
 *     DisplayName, CreatedAt, LastLoginAt, Token, ExpiresAt, IsActive)
 *   - Password stored as SHA-256 hex hash
 *   - Session token = UUID + timestamp suffix; stored in ScriptCache (8 h TTL)
 *   - Sheet row also updated on login (LastLoginAt, Token, ExpiresAt)
 *   - Token validation: cache-first (fast), sheet fallback (recovery)
 *
 * Public surface (called by infrastructure_webapp.gs doPost router):
 *   apiLogin_(email, password)    → { ok, token, user, role, email } | { ok, error }
 *   apiValidateToken_(token)      → { ok, email, role, name }         | { ok, error }
 *   apiLogout_(token)             → { ok }
 *   apiGetUser_(token)            → { email, role, name }             | null
 *
 * Infrastructure owns SESSIONS. It makes no recruiting decision.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── AUTH.C01 · Constants ──────────────────────────────────────────────────

var AUTH_LOGIN_SHEET  = '_LoginSystem';
var AUTH_SESSION_TTL  = 8 * 60 * 60 * 1000;   // 8 h in ms
var AUTH_CACHE_TTL_S  = 28800;                  // 8 h in seconds (CacheService limit)
var AUTH_CACHE_PREFIX = 'KAI_TOK_';

// Column indices (0-based) in _LoginSystem sheet data rows
var AUTH_COL_EMAIL    = 0;
var AUTH_COL_HASH     = 1;
var AUTH_COL_ROLE     = 2;
var AUTH_COL_NAME     = 3;
// col 4 = CreatedAt  (read-only after creation)
var AUTH_COL_LAST_LOGIN = 4;   // LastLoginAt — 1-based col 5
var AUTH_COL_TOKEN      = 5;   // Token        — 1-based col 6
var AUTH_COL_EXPIRES    = 6;   // ExpiresAt     — 1-based col 7
var AUTH_COL_ACTIVE     = 7;   // IsActive      — 1-based col 8

// ── AUTH.F01 · Login ─────────────────────────────────────────────────────

/**
 * AUTH.F01 — Validate credentials against _LoginSystem, issue session token.
 * @param {string} email
 * @param {string} password  plaintext (hashed server-side)
 * @return {{ ok:boolean, token?:string, user?:string, role?:string, email?:string, error?:string }}
 */
function apiLogin_(email, password) {
  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.' };
  }

  try {
    var ss    = getMasterSS_();
    var sheet = ss.getSheetByName(AUTH_LOGIN_SHEET);
    if (!sheet || sheet.getLastRow() < 2) {
      return { ok: false, error: 'Login system not configured. Ask admin to run Setup Login System.' };
    }

    var emailLower = String(email).trim().toLowerCase();
    var pwHash     = authHash_(password);
    var numCols    = Math.max(8, sheet.getLastColumn());
    var data       = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();

    for (var i = 0; i < data.length; i++) {
      var row       = data[i];
      var rowEmail  = String(row[AUTH_COL_EMAIL]  || '').trim().toLowerCase();
      var rowHash   = String(row[AUTH_COL_HASH]   || '').trim().toLowerCase();
      var rowRole   = String(row[AUTH_COL_ROLE]   || 'recruiter').trim();
      var rowName   = String(row[AUTH_COL_NAME]   || emailLower.split('@')[0]).trim();
      var isActive  = String(row[AUTH_COL_ACTIVE] || 'YES').trim().toUpperCase() !== 'NO';

      if (rowEmail !== emailLower || rowHash !== pwHash || !isActive) continue;

      // Matched — issue token
      var token     = Utilities.getUuid() + '-' + Date.now().toString(36);
      var expiry    = new Date(Date.now() + AUTH_SESSION_TTL);
      var expiryStr = Utilities.formatDate(expiry, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
      var loginTs   = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM-yyyy HH:mm');

      // Persist to sheet
      sheet.getRange(i + 2, AUTH_COL_LAST_LOGIN + 1).setValue(loginTs);
      sheet.getRange(i + 2, AUTH_COL_TOKEN      + 1).setValue(token);
      sheet.getRange(i + 2, AUTH_COL_EXPIRES    + 1).setValue(expiryStr);
      SpreadsheetApp.flush();

      // Store in cache (fast validation path)
      var session = JSON.stringify({ email: rowEmail, role: rowRole, name: rowName });
      CacheService.getScriptCache().put(AUTH_CACHE_PREFIX + token, session, AUTH_CACHE_TTL_S);

      return { ok: true, token: token, user: rowName, role: rowRole, email: rowEmail };
    }

    return { ok: false, error: 'Invalid email or password.' };

  } catch (err) {
    return { ok: false, error: 'Auth error: ' + err.message };
  }
}

// ── AUTH.F02 · Validate token ─────────────────────────────────────────────

/**
 * AUTH.F02 — Validate a session token. Returns user info if valid.
 * @param {string} token
 * @return {{ ok:boolean, email?:string, role?:string, name?:string, error?:string }}
 */
function apiValidateToken_(token) {
  if (!token) return { ok: false, error: 'No token provided.' };

  try {
    // Cache-first (fast path)
    var cached = CacheService.getScriptCache().get(AUTH_CACHE_PREFIX + token);
    if (cached) {
      var s = JSON.parse(cached);
      return { ok: true, email: s.email, role: s.role, name: s.name };
    }

    // Sheet fallback (cache miss after restart / >8h)
    var ss    = getMasterSS_();
    var sheet = ss.getSheetByName(AUTH_LOGIN_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { ok: false, error: 'Login system not found.' };

    var numCols = Math.max(8, sheet.getLastColumn());
    var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();

    for (var i = 0; i < data.length; i++) {
      var row      = data[i];
      var rowToken = String(row[AUTH_COL_TOKEN]   || '').trim();
      var expires  = row[AUTH_COL_EXPIRES];
      if (rowToken !== token) continue;
      if (!expires || new Date(expires) <= new Date()) {
        return { ok: false, error: 'Session expired.' };
      }
      // Re-warm cache
      var session = JSON.stringify({
        email: String(row[AUTH_COL_EMAIL] || '').trim().toLowerCase(),
        role:  String(row[AUTH_COL_ROLE]  || 'recruiter').trim(),
        name:  String(row[AUTH_COL_NAME]  || '').trim()
      });
      CacheService.getScriptCache().put(AUTH_CACHE_PREFIX + token, session, AUTH_CACHE_TTL_S);
      var s2 = JSON.parse(session);
      return { ok: true, email: s2.email, role: s2.role, name: s2.name };
    }

    return { ok: false, error: 'Invalid or expired session.' };

  } catch (err) {
    return { ok: false, error: 'Token validation error: ' + err.message };
  }
}

// ── AUTH.F03 · Get user (convenience) ────────────────────────────────────

/**
 * AUTH.F03 — Return user info for a valid token, or null.
 * @param {string} token
 * @return {{ email:string, role:string, name:string }|null}
 */
function apiGetUser_(token) {
  var result = apiValidateToken_(token);
  return result.ok ? { email: result.email, role: result.role, name: result.name } : null;
}

// ── AUTH.F04 · Logout ─────────────────────────────────────────────────────

/**
 * AUTH.F04 — Invalidate a session token.
 * @param {string} token
 * @return {{ ok:boolean }}
 */
function apiLogout_(token) {
  if (!token) return { ok: true };
  try {
    CacheService.getScriptCache().remove(AUTH_CACHE_PREFIX + token);
    // Optionally clear from sheet too
    try {
      var ss    = getMasterSS_();
      var sheet = ss.getSheetByName(AUTH_LOGIN_SHEET);
      if (sheet && sheet.getLastRow() > 1) {
        var numCols = Math.max(8, sheet.getLastColumn());
        var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();
        for (var i = 0; i < data.length; i++) {
          if (String(data[i][AUTH_COL_TOKEN] || '').trim() === token) {
            sheet.getRange(i + 2, AUTH_COL_TOKEN   + 1).setValue('');
            sheet.getRange(i + 2, AUTH_COL_EXPIRES + 1).setValue('');
            SpreadsheetApp.flush();
            break;
          }
        }
      }
    } catch (_) {}
    return { ok: true };
  } catch (err) {
    return { ok: true };  // always succeed on logout
  }
}

// ── AUTH.U01 · Utility ────────────────────────────────────────────────────

/** AUTH.U01 — SHA-256 hex hash of a string. */
function authHash_(str) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(str),
    Utilities.Charset.UTF_8
  ).map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}
