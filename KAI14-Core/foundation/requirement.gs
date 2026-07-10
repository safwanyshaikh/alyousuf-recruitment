/**
 * KAI14-Core · foundation/requirement.gs   (Deliverable 8: Requirement Creation)
 * LAYER OWNER: Foundation (owns truth)
 * ───────────────────────────────────────────────────────────────────
 * Requirement entity. PK: RequirementID (AYE-REQ-YYYY-NNNN). FK-clean:
 * ClientID + CampaignID are resolved to IDs (never name strings). K14 never
 * writes this sheet — it only reads it to match.
 */

var REQUIREMENT_HEADERS = [
  'RequirementID', 'CreatedAt', 'ClientID', 'ProjectID', 'CampaignID',
  'Trade', 'Quantity', 'Location', 'MinExperience', 'Nationality',
  'Priority', 'Status', 'JDLink'
];

function reqIdMint_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(K14.lockWaitMs)) throw new Error('reqIdMint_: lock unavailable.');
  try {
    var p = PropertiesService.getScriptProperties();
    var n = parseInt(p.getProperty(K14.req.counterKey) || '0', 10) + 1;
    p.setProperty(K14.req.counterKey, String(n));
    return K14.req.prefix + '-' + new Date().getFullYear() + '-' + ('0000' + n).slice(-4);
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/**
 * requirementCreate — FK-clean. Resolves client/campaign names to IDs.
 * @param {object} r - { clientName, country, industry, campaignName, trade,
 *                       quantity, location, minExperience, nationality,
 *                       priority, jdLink }
 * @returns {object} { ok, requirementId }
 */
function requirementCreate(r) {
  if (!normText_(r.trade))    throw new Error('requirement: Trade required.');
  if (!normText_(r.clientName)) throw new Error('requirement: Client required (FK).');

  var clientId   = clientFindOrCreate(r.clientName, r.country, r.industry);
  var campaignId = campaignFindOrCreate(clientId, r.campaignName, 'STANDARD');
  var reqId      = reqIdMint_();

  K14_sheet_(K14.sheets.requirements, REQUIREMENT_HEADERS).appendRow([
    reqId, K14_now_(), clientId, '', campaignId,
    normText_(r.trade), parseInt(r.quantity, 10) || 1, normText_(r.location),
    parseFloat(r.minExperience) || 0, normText_(r.nationality),
    r.priority || 'MED', 'OPEN', r.jdLink || ''
  ]);
  logEvent('Foundation', 'REQUIREMENT_CREATED',
    { detail: reqId + ' | client=' + clientId + ' | trade=' + r.trade });
  return { ok: true, requirementId: reqId, clientId: clientId, campaignId: campaignId };
}

function requirementGet(reqId) {
  var sh = K14_sheet_(K14.sheets.requirements, REQUIREMENT_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return null;
  var data = sh.getRange(2, 1, last - 1, REQUIREMENT_HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === reqId) {
      var o = {};
      for (var j = 0; j < REQUIREMENT_HEADERS.length; j++) o[REQUIREMENT_HEADERS[j]] = data[i][j];
      return o;
    }
  }
  return null;
}

function requirementOpen() {
  var sh = K14_sheet_(K14.sheets.requirements, REQUIREMENT_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var data = sh.getRange(2, 1, last - 1, REQUIREMENT_HEADERS.length).getValues();
  var out = [];
  data.forEach(function (r) {
    if (String(r[11]).toUpperCase() === 'OPEN') {
      var o = {};
      for (var j = 0; j < REQUIREMENT_HEADERS.length; j++) o[REQUIREMENT_HEADERS[j]] = r[j];
      out.push(o);
    }
  });
  return out;
}
