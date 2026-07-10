/**
 * KAI14-Core · infrastructure/logging.gs
 * LAYER OWNER: Infrastructure (services)
 * ───────────────────────────────────────────────────────────────────
 * Platform configuration (single source for all layers) + structured,
 * attributable logging (Rule 5). No business decisions live here.
 */

// ═══════════════════════════════════════════════════════════════════
// PLATFORM CONFIG — the one place sheet names / labels / ids are defined
// ═══════════════════════════════════════════════════════════════════
var K14 = {
  tz: 'Asia/Kolkata',
  lockWaitMs: 8000,
  matchTopN: 10,

  sheets: {
    candidates:   'Candidates',
    meta:         '_Meta',
    queue:        '_Queue',
    requirements: '_Requirements',
    clients:      '_Clients',
    campaigns:    '_Campaigns',
    logs:         '_Logs',
    errors:       '_Errors'
  },

  labels: {
    input:     'kai14/intake',
    done:      'kai14/done',
    error:     'kai14/error',
    duplicate: 'kai14/duplicate'
  },

  kai: {
    prefix:         'AYE-KAI',
    counterKey:     'kai14_counter',
    testPrefix:     'TEST-KAI',
    testCounterKey: 'kai14_counter_test'
  },

  req: { prefix: 'AYE-REQ', counterKey: 'kai14_req_counter' },

  // Test isolation: when testMode is on, these sheet names replace the
  // production ones so synthetic data never touches live truth.
  testSheets: {
    candidates: '_TEST_Candidates',
    meta:       '_TEST_Meta',
    queue:      '_TEST_Queue'
  },

  gemini: {
    modelProp:  'KAI14_GEMINI_MODEL',
    modelDef:   'gemini-2.5-flash',
    apiKeyProp: 'GEMINI_API_KEY',
    endpoint:   'https://generativelanguage.googleapis.com/v1beta/models/'
  }
};

// ── Spreadsheet helpers ────────────────────────────────────────────
function K14_ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function K14_sheet_(name, headers) {
  var ss = K14_ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) {
      sh.appendRow(headers);
      sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function K14_now_()   { return new Date(); }
function K14_today_() { return Utilities.formatDate(new Date(), K14.tz, 'yyyy-MM-dd'); }

// ═══════════════════════════════════════════════════════════════════
// STRUCTURED LOG (Rule 5: every action attributable)
// ═══════════════════════════════════════════════════════════════════
var LOG_HEADERS = ['Timestamp', 'Level', 'Layer', 'Event', 'KAINo', 'Actor', 'Detail'];

function logEvent(layer, event, fields) {
  fields = fields || {};
  try {
    K14_sheet_(K14.sheets.logs, LOG_HEADERS).appendRow([
      K14_now_(), fields.level || 'INFO', layer, event,
      fields.kaiNo || '', fields.actor || 'system', fields.detail || ''
    ]);
  } catch (e) { Logger.log('logEvent failed: ' + e.message); }
}

var ERR_HEADERS = ['Timestamp', 'Layer', 'Where', 'Message', 'Context'];

function logError(layer, where, message, context) {
  try {
    K14_sheet_(K14.sheets.errors, ERR_HEADERS).appendRow([
      K14_now_(), layer, where, String(message), context || ''
    ]);
  } catch (e) { Logger.log('logError failed: ' + e.message); }
  Logger.log('[ERR][' + layer + '] ' + where + ': ' + message);
}

// PII masking — logs never store raw contact details.
function maskEmail(e) {
  e = String(e || ''); var at = e.indexOf('@');
  return at < 2 ? (e ? '***' : '') : e.slice(0, 2) + '***' + e.slice(at);
}
function maskPhone(p) {
  p = String(p || '').replace(/\D/g, '');
  return p.length < 4 ? '***' : '***' + p.slice(-4);
}

// Normalizers used across layers (kept here so all layers agree).
function normEmail_(e)  { return String(e || '').toLowerCase().trim(); }
function normMobile_(m) { return String(m || '').replace(/\D/g, ''); }
function normText_(t)   { return String(t || '').trim(); }
