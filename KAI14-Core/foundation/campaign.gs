/**
 * KAI14-Core · foundation/campaign.gs
 * LAYER OWNER: Foundation (owns truth)
 * ───────────────────────────────────────────────────────────────────
 * Campaign entity. PK: CampaignID. FK: ClientID. Rule 13 (Campaign-mandatory):
 * every candidate and requirement carries a CampaignID. A default inbound
 * campaign guarantees intake is never anonymous.
 */

var CAMPAIGN_SCHEMA  = ['CampaignID', 'ClientID', 'Name', 'HiringMode', 'CreatedAt'];
var CAMPAIGN_DEFAULT = 'CMP-INBOUND-DEFAULT';

function campaignEnsureDefault() {
  var sh = K14_sheet_(K14.sheets.campaigns, CAMPAIGN_SCHEMA);
  var last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++)
      if (String(ids[i][0]) === CAMPAIGN_DEFAULT) return CAMPAIGN_DEFAULT;
  }
  sh.appendRow([CAMPAIGN_DEFAULT, '', 'Inbound CV (default)', 'INBOUND', K14_now_()]);
  logEvent('Foundation', 'CAMPAIGN_DEFAULT_CREATED', { detail: CAMPAIGN_DEFAULT });
  return CAMPAIGN_DEFAULT;
}

function campaignFindOrCreate(clientId, name, hiringMode) {
  name = normText_(name);
  if (!name) return campaignEnsureDefault();
  var sh = K14_sheet_(K14.sheets.campaigns, CAMPAIGN_SCHEMA);
  var last = sh.getLastRow();
  if (last >= 2) {
    var data = sh.getRange(2, 1, last - 1, 3).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][1]) === (clientId || '') &&
          String(data[i][2]).toLowerCase().trim() === name.toLowerCase())
        return data[i][0];
    }
  }
  var id = 'CMP-' + Utilities.formatDate(new Date(), K14.tz, 'yyyyMMddHHmmss') +
           '-' + Math.floor(Math.random() * 900 + 100);
  sh.appendRow([id, clientId || '', name, hiringMode || 'STANDARD', K14_now_()]);
  logEvent('Foundation', 'CAMPAIGN_CREATED', { detail: id + ' | ' + name });
  return id;
}
