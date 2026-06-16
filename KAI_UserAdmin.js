// ═══════════════════════════════════════════════════════════════════
// KAI USER ADMIN — Self-service user management
// ═══════════════════════════════════════════════════════════════════
// HOW TO USE:
//   1. Run seedKAIUsers()     → creates/restores all standard accounts
//   2. Run listKAIUsers()     → shows all accounts + roles (no passwords)
//   3. Run addOneUser()       → edit the config inside, run to add one user
//   4. Run resetPassword()    → edit the config inside, run to reset
//   5. Run disableUser()      → removes session token (forces re-login)
// ═══════════════════════════════════════════════════════════════════

var ADMIN_SS_ID_ = '101iCo5lPpGOZc5CGGZA_kaYugbPHzRXQstl3WsRKBRE';

// ── Hash helper (SHA-256 hex — matches frontend) ───────────────────
function kaiHash_(plainText) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    plainText,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// ── Ensure _LoginSystem sheet exists with headers ──────────────────
function ensureLoginSheet_(ss) {
  var s = ss.getSheetByName('_LoginSystem');
  if (!s) {
    s = ss.insertSheet('_LoginSystem');
    s.appendRow(['email','passwordHash','role','name','createdAt','sessionToken','tokenExpiry','notes']);
    s.getRange(1, 1, 1, 8).setFontWeight('bold')
      .setBackground('#1e3a5f').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// ══════════════════════════════════════════════════════════════════
// SEED — Run once to create/restore all standard accounts
// Default password for all new users: Kai@2026
// Users who already exist are NOT overwritten.
// ══════════════════════════════════════════════════════════════════
function seedKAIUsers() {
  var defaultPassword = 'Kai@2026';

  var users = [
    { email:'admin@alyousufent.com',  name:'KAI Admin',    role:'ADMIN'     },
    { email:'hr5@alyousufent.com',    name:'HR Officer 5', role:'RECRUITER' },
    { email:'hr7@alyousufent.com',    name:'HR Officer 7', role:'RECRUITER' },
    { email:'hr8@alyousufent.com',    name:'HR Officer 8', role:'RECRUITER' },
    { email:'hr10@alyousufent.com',   name:'HR Officer 10',role:'RECRUITER' },
  ];

  var ss    = SpreadsheetApp.openById(ADMIN_SS_ID_);
  var sheet = ensureLoginSheet_(ss);
  var data  = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow()-1, 4).getValues()
    : [];

  var existingEmails = {};
  data.forEach(function(r) {
    existingEmails[String(r[0]||'').trim().toLowerCase()] = true;
  });

  var hash    = kaiHash_(defaultPassword);
  var created = 0;
  var skipped = 0;

  users.forEach(function(u) {
    var key = u.email.toLowerCase();
    if (existingEmails[key]) {
      Logger.log('SKIP (exists): ' + u.email);
      skipped++;
      return;
    }
    sheet.appendRow([u.email.toLowerCase(), hash, u.role, u.name, new Date(), '', '', '']);
    Logger.log('CREATED: ' + u.email + ' | role=' + u.role);
    created++;
  });

  Logger.log('--- seedKAIUsers complete ---');
  Logger.log('Created: ' + created + ' | Already existed: ' + skipped);
  Logger.log('Default password for new accounts: ' + defaultPassword);
  Logger.log('Tell each user to change their password after first login.');
}

// ══════════════════════════════════════════════════════════════════
// LIST — Shows all users (no passwords shown)
// ══════════════════════════════════════════════════════════════════
function listKAIUsers() {
  var ss    = SpreadsheetApp.openById(ADMIN_SS_ID_);
  var sheet = ss.getSheetByName('_LoginSystem');
  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log('No users found. Run seedKAIUsers() first.');
    return;
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
  Logger.log('=== KAI Users (' + (data.length) + ' total) ===');
  data.forEach(function(r) {
    var email   = String(r[0]||'').trim();
    var role    = String(r[2]||'').trim();
    var name    = String(r[3]||'').trim();
    var hasToken = !!String(r[5]||'').trim();
    var expiry   = String(r[6]||'').trim();
    var expired  = expiry ? new Date(expiry) < new Date() : true;
    Logger.log(
      email + ' | ' + role + ' | ' + name +
      ' | session: ' + (hasToken ? (expired ? 'EXPIRED' : 'ACTIVE') : 'none')
    );
  });
}

// ══════════════════════════════════════════════════════════════════
// ADD ONE USER — Edit config below, then run this function
// ══════════════════════════════════════════════════════════════════
function addOneUser() {
  // ── EDIT THESE FOUR VALUES ──────────────────────────────────────
  var newEmail    = 'hr99@alyousufent.com';
  var newName     = 'HR Officer 99';
  var newRole     = 'RECRUITER';           // ADMIN | MANAGER | RECRUITER | ASSOCIATE
  var newPassword = 'Kai@2026';
  // ───────────────────────────────────────────────────────────────

  var ss    = SpreadsheetApp.openById(ADMIN_SS_ID_);
  var sheet = ensureLoginSheet_(ss);
  var data  = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow()-1, 1).getValues()
    : [];

  var emailKey = newEmail.trim().toLowerCase();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]||'').trim().toLowerCase() === emailKey) {
      Logger.log('ERROR: ' + newEmail + ' already exists. Use resetPassword() to change password or listKAIUsers() to check roles.');
      return;
    }
  }

  var hash = kaiHash_(newPassword);
  sheet.appendRow([emailKey, hash, newRole.toUpperCase(), newName, new Date(), '', '', '']);
  Logger.log('CREATED: ' + emailKey + ' | role=' + newRole + ' | password=' + newPassword);
}

// ══════════════════════════════════════════════════════════════════
// RESET PASSWORD — Edit config below, then run this function
// ══════════════════════════════════════════════════════════════════
function resetPassword() {
  // ── EDIT THESE TWO VALUES ───────────────────────────────────────
  var targetEmail   = 'hr5@alyousufent.com';
  var newPassword   = 'Kai@2026';
  // ───────────────────────────────────────────────────────────────

  var ss    = SpreadsheetApp.openById(ADMIN_SS_ID_);
  var sheet = ss.getSheetByName('_LoginSystem');
  if (!sheet || sheet.getLastRow() < 2) { Logger.log('_LoginSystem not found.'); return; }

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
  var key  = targetEmail.trim().toLowerCase();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]||'').trim().toLowerCase() === key) {
      var hash = kaiHash_(newPassword);
      sheet.getRange(i+2, 2).setValue(hash);
      sheet.getRange(i+2, 6).setValue('');   // clear session token
      sheet.getRange(i+2, 7).setValue('');   // clear expiry
      Logger.log('Password reset for: ' + key);
      Logger.log('New password: ' + newPassword);
      Logger.log('Session cleared — user must log in again.');
      return;
    }
  }
  Logger.log('User not found: ' + targetEmail);
}

// ══════════════════════════════════════════════════════════════════
// ACTIVATE ALL SESSIONS — Extends all existing sessions to 30 days
// Users whose browser has a token will be active immediately.
// Users with no token (never logged in) must log in once first.
// ══════════════════════════════════════════════════════════════════
function activateAllSessions() {
  var ss    = SpreadsheetApp.openById(ADMIN_SS_ID_);
  var sheet = ss.getSheetByName('_LoginSystem');
  if (!sheet || sheet.getLastRow() < 2) { Logger.log('_LoginSystem not found.'); return; }

  var data    = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
  var expiry  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  var extended = 0;
  var noToken  = 0;

  data.forEach(function(r, i) {
    var email = String(r[0]||'').trim();
    var token = String(r[5]||'').trim();
    if (!email) return;
    if (token) {
      sheet.getRange(i+2, 7).setValue(expiry.toISOString());
      Logger.log('ACTIVATED (30d): ' + email);
      extended++;
    } else {
      Logger.log('NO TOKEN — must log in first: ' + email);
      noToken++;
    }
  });

  Logger.log('--- activateAllSessions complete ---');
  Logger.log('Extended: ' + extended + ' | Must log in: ' + noToken);
  Logger.log('Sessions valid until: ' + expiry.toDateString());
}

// ══════════════════════════════════════════════════════════════════
// DISABLE USER — Clears session, user is logged out immediately
// ══════════════════════════════════════════════════════════════════
function disableUser() {
  // ── EDIT THIS VALUE ─────────────────────────────────────────────
  var targetEmail = 'hr5@alyousufent.com';
  // ───────────────────────────────────────────────────────────────

  var ss    = SpreadsheetApp.openById(ADMIN_SS_ID_);
  var sheet = ss.getSheetByName('_LoginSystem');
  if (!sheet || sheet.getLastRow() < 2) { Logger.log('_LoginSystem not found.'); return; }

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
  var key  = targetEmail.trim().toLowerCase();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]||'').trim().toLowerCase() === key) {
      sheet.getRange(i+2, 6).setValue('');
      sheet.getRange(i+2, 7).setValue('');
      Logger.log('Session cleared for: ' + key + '. User is now logged out.');
      return;
    }
  }
  Logger.log('User not found: ' + targetEmail);
}