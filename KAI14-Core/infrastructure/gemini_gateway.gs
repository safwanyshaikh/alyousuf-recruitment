/**
 * KAI14-Core · infrastructure/gemini_gateway.gs
 * LAYER OWNER: Infrastructure (services)
 * ───────────────────────────────────────────────────────────────────
 * The ONLY path to the LLM. K14 calls through this gateway. The gateway
 * makes no recruiting decision — it transports prompts and returns text.
 */

function geminiModel_() {
  return PropertiesService.getScriptProperties().getProperty(K14.gemini.modelProp) ||
         K14.gemini.modelDef;
}

function geminiKey_() {
  var k = PropertiesService.getScriptProperties().getProperty(K14.gemini.apiKeyProp);
  if (!k) throw new Error('gemini_gateway: GEMINI_API_KEY script property not set.');
  return k;
}

/**
 * geminiText — send a prompt, optionally with one inline file part.
 * @param {string} prompt
 * @param {object} [inline] - { mimeType, bytesBase64 }
 * @returns {string}
 */
function geminiText(prompt, inline) {
  var url = K14.gemini.endpoint + geminiModel_() + ':generateContent?key=' + geminiKey_();
  var parts = [{ text: prompt }];
  if (inline && inline.bytesBase64) {
    parts.push({ inline_data: { mime_type: inline.mimeType, data: inline.bytesBase64 } });
  }
  var payload = {
    contents: [{ parts: parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
  };
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code !== 200) throw new Error('gemini ' + code + ': ' + res.getContentText().slice(0, 300));
  var json = JSON.parse(res.getContentText());
  try { return json.candidates[0].content.parts[0].text || ''; }
  catch (e) { throw new Error('gemini: empty/blocked response'); }
}

/** geminiJson — parse a JSON object out of model text (handles ```json fences). */
function geminiJson(prompt, inline) {
  var raw = geminiText(prompt, inline);
  var m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('gemini: no JSON object in response');
  return JSON.parse(m[0]);
}
