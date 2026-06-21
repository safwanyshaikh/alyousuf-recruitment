/**
 * KAI14-Core · foundation/client.gs
 * LAYER OWNER: Foundation (owns truth)
 * ───────────────────────────────────────────────────────────────────
 * Client entity. PK: ClientID. Find-or-create. FK target for Requirement.
 */

var CLIENT_SCHEMA = ['ClientID', 'Name', 'Country', 'Industry', 'CreatedAt'];

function clientFindOrCreate(name, country, industry) {
  name = normText_(name);
  if (!name) throw new Error('client: name required (no anonymous truth).');
  var sh = K14_sheet_(K14.sheets.clients, CLIENT_SCHEMA);
  var last = sh.getLastRow();
  if (last >= 2) {
    var data = sh.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase().trim() === name.toLowerCase())
        return data[i][0];
    }
  }
  var id = 'CL-' + Utilities.formatDate(new Date(), K14.tz, 'yyyyMMddHHmmss') +
           '-' + Math.floor(Math.random() * 900 + 100);
  sh.appendRow([id, name, country || '', industry || '', K14_now_()]);
  logEvent('Foundation', 'CLIENT_CREATED', { detail: id + ' | ' + name });
  return id;
}
