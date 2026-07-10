/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFRASTRUCTURE — GEMINI GATEWAY
 * ───────────────────────────────────────────────────────────────────────────
 * Single owner of all Gemini API calls for KAI GCC Recruitment OS.
 * Architecture: Foundation → K14 → Execution → UI
 *               Infrastructure supplies services; it does not own intelligence.
 *
 * K14 calls this gateway through the k14Gemini_() seam in k14_core.gs:
 *   k14Gemini_() → kaiGeminiGenerate_()  (canonical — resolves here)
 *
 * Functions exported:
 *   kaiGeminiGenerate_(parts, circuit)   — canonical gateway (K14 + pipeline)
 *   callGemini_v291_(parts, circuit)     — backward-compat alias
 *   callGeminiString_v291_(prompt, circuit) — string→parts wrapper
 *   buildGeminiPartsWithFallback_(...)   — large-attachment fallback builder
 *   getEffectiveGeminiModel_()           — model resolver
 *   validateApiKey_v291_()               — API key validator
 *
 * Configuration (Script Properties):
 *   GEMINI_API_KEY              — required
 *   KAI_GEMINI_MODEL_OVERRIDE   — optional; overrides default model
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
// GW.F01 — Model resolver: respects Script Property override.
// ───────────────────────────────────────────────────────────────────────────
function getEffectiveGeminiModel_() {
  var override = PropertiesService.getScriptProperties()
                                  .getProperty('KAI_GEMINI_MODEL_OVERRIDE');
  return override || (typeof CONFIG !== 'undefined' && CONFIG.defaultModel) || 'gemini-2.0-flash';
}

// ───────────────────────────────────────────────────────────────────────────
// GW.F02 — API key validator. Refuses undefined keys; warns on test key.
// ───────────────────────────────────────────────────────────────────────────
function validateApiKey_v291_() {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY not set in Script Properties.');
  if (key === 'AIzaSyCZL-NEYMWK1Z18Q2BTy_vRiyIiT_Yz1Qk') {
    Logger.log('WARNING: Default/test API key in use. Replace with production key.');
  }
  return key;
}

// ───────────────────────────────────────────────────────────────────────────
// GW.F03 — Canonical Gemini gateway.
// Accepts parts as an ARRAY of {text:...} / {inlineData:...} objects.
// circuit (optional): circuit-breaker state object {consecutive429, broken}.
// Returns raw response text (JSON string from Gemini).
// ───────────────────────────────────────────────────────────────────────────
function kaiGeminiGenerate_(parts, circuit) {
  var apiKey    = validateApiKey_v291_();
  var model     = getEffectiveGeminiModel_();
  var url       = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                  model + ':generateContent?key=' + encodeURIComponent(apiKey);
  var maxTokens = (typeof CONFIG !== 'undefined' && CONFIG.maxOutputTokens) || 4000;
  var retries   = (typeof CONFIG !== 'undefined' && CONFIG.geminiRetries)   || 5;
  var payload   = {
    contents: [{ role: 'user', parts: parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1, topP: 0.1,
      maxOutputTokens: maxTokens
    }
  };
  var lastErr = null;
  for (var attempt = 1; attempt <= retries; attempt++) {
    try {
      Utilities.sleep(attempt > 1 ? Math.min(Math.pow(2, attempt - 1) * 1500, 30000) : 0);
      var resp = UrlFetchApp.fetch(url, {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify(payload), muteHttpExceptions: true
      });
      var code = resp.getResponseCode();
      var text = resp.getContentText();
      if (code === 200) {
        if (circuit) circuit.consecutive429 = 0;
        return text;
      }
      if (code === 429) {
        if (circuit) {
          circuit.consecutive429 = (circuit.consecutive429 || 0) + 1;
          var cbThreshold = (typeof CONFIG !== 'undefined' && CONFIG.geminiCircuitBreakerThreshold) || 8;
          if (circuit.consecutive429 >= cbThreshold) {
            circuit.broken = true;
            throw new Error('CIRCUIT_BROKEN after ' + circuit.consecutive429 + ' 429s');
          }
        }
        var retryMs = parseInt((resp.getHeaders()['retry-after'] || '0'), 10) * 1000 || 15000;
        Utilities.sleep(Math.min(retryMs * attempt, 60000));
      }
      lastErr = new Error('Gemini HTTP ' + code + ': ' + text.slice(0, 300));
    } catch (e) {
      if (e.message && e.message.indexOf('CIRCUIT_BROKEN') === 0) throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini failed after ' + retries + ' attempts');
}

// ───────────────────────────────────────────────────────────────────────────
// GW.F04 — Backward-compat alias. Callers that reference callGemini_v291_
// by name continue to work without change.
// ───────────────────────────────────────────────────────────────────────────
function callGemini_v291_(parts, circuit) {
  return kaiGeminiGenerate_(parts, circuit);
}

// ───────────────────────────────────────────────────────────────────────────
// GW.F05 — String-to-parts compatibility wrapper.
// v284's extractSingleJdBlock_ passes a STRING prompt. This wraps it into
// the correct ARRAY format before calling the canonical gateway.
// ───────────────────────────────────────────────────────────────────────────
function callGeminiString_v291_(prompt, circuit) {
  if (!prompt) return null;
  var parts = [{ text: String(prompt) }];
  return kaiGeminiGenerate_(parts, circuit);
}

// ───────────────────────────────────────────────────────────────────────────
// GW.F06 — Large-attachment fallback parts builder.
// If attachment exceeds maxAttachmentBytes, attempts text extraction via
// DOCX unzip, Drive conversion, or raw byte decode before giving up.
// Returns a valid parts array or null if all extraction attempts fail.
// ───────────────────────────────────────────────────────────────────────────
function buildGeminiPartsWithFallback_(attachment, emailBody, senderEmail, subject) {
  var maxBytes = (typeof CONFIG !== 'undefined' && CONFIG.maxAttachmentBytes) || 15728640;
  var size     = attachment.getSize();
  var ext      = (attachment.getName() || '').split('.').pop().toLowerCase();

  if (size <= maxBytes) {
    return (typeof buildGeminiParts_ === 'function')
      ? buildGeminiParts_(attachment, emailBody, senderEmail, subject)
      : null;
  }

  Logger.log('GW.F06: Attachment oversized (' + size + ' bytes). Attempting text extraction.');
  var text = '';

  if (ext === 'docx' && typeof extractTextFromDocxSafe_ === 'function') {
    text = extractTextFromDocxSafe_(attachment);
  }
  if ((!text || text.length < 100) && typeof extractTextFromDocViaDrive_ === 'function') {
    try { text = extractTextFromDocViaDrive_(attachment); } catch (e) {}
  }
  if (!text || text.length < 100) {
    try {
      var raw = attachment.getBytes();
      text = String.fromCharCode.apply(null, raw)
               .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
               .replace(/\s+/g, ' ').trim().slice(0, 30000);
    } catch (e) {}
  }

  var promptFn = (typeof buildParsePrompt_ === 'function')
    ? buildParsePrompt_
    : function(b, e, s) { return 'Parse this CV. Sender: ' + s; };

  if (text && text.length >= 100) {
    Logger.log('GW.F06: Text extraction succeeded (' + text.length + ' chars).');
    return [
      { text: promptFn(emailBody, senderEmail, subject) },
      { text: 'CV text (extracted from large attachment):\n' + text.slice(0, 30000) }
    ];
  }

  Logger.log('GW.F06: All extraction attempts failed for ' + size + '-byte attachment.');
  return null;
}
