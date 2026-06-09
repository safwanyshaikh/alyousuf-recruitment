// ============================================================
// KAI Auto-Email Recontact Campaign
// Project: KAI-Recontact-Campaign (NEW standalone GAS project)
// Purpose: Email 67,781 legacy CV senders asking for fresh CV
// DO NOT add this to existing GAS projects
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
var CONFIG = {
  SHEET_ID:        '1dqz_Eq8tGnm6YwWac-vj2imffKW_fBKLoY1ZscD7Wbs',
  SHEET_NAME:      'Gmail_CV_Candidates',
  DAILY_LIMIT:     400,         // 400/day — safe within Gmail's 500/day limit
  FROM_NAME:       'Al Yousuf Recruitment',
  REPLY_TO:        'ai@alyousufent.com',

  // Column indices (0-based) — matches the sheet exactly
  COL_NAME:        0,  // A
  COL_EMAIL:       1,  // B
  COL_DATE:        2,  // C
  COL_SUBJECT:     3,  // D
  COL_ATT_NAMES:   4,  // E
  COL_STATUS:      5,  // F  ← PENDING_RECONTACT / SENT / BOUNCED / OPT_OUT / ERROR
  COL_SENT_DATE:   6,  // G
  COL_NOTES:       7,  // H
};

// ── MAIN: Run daily via Time Trigger ────────────────────────
/**
 * Daily flow (runs at 9am):
 *   1. Mark bounced addresses from Gmail bounce notifications → no more wasted sends
 *   2. Process UNSUBSCRIBE replies → OPT_OUT
 *   3. Send today's batch of 400 recontact emails
 *
 * CV replies are handled automatically by the KAI main pipeline
 * (processAllInboxEmails trigger) — no action needed here.
 */
function runDailyRecontactBatch() {
  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME)
             || ss.getSheetByName('Sheet1')
             || ss.getSheets()[0];
  if (!sheet) { Logger.log('No sheet found in spreadsheet'); return; }
  Logger.log('Using sheet: ' + sheet.getName());

  // Step 1 — mark bounced addresses first so we don't re-send to them today
  var bounced = processBounceReplies_(ss, sheet);
  Logger.log('Bounces marked today: ' + bounced);

  // Step 2 — process UNSUBSCRIBE replies
  processOptOutReplies();

  var data    = sheet.getDataRange().getValues(); // refresh after bounce updates
  var today   = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd');
  var sent    = 0, skipped = 0, errors = 0;

  // Load opt-out set ONCE before the loop — fixes the timeout bug that
  // caused the 14.29% trigger error rate (previously opened the sheet 400×).
  var optOutSet = loadOptOutSet_(ss);

  // Collect all row updates in memory; write them in one batch at the end.
  var updates = {};

  Logger.log('=== KAI Recontact Batch — ' + today + ' ===');

  for (var i = 1; i < data.length; i++) {
    if (sent >= CONFIG.DAILY_LIMIT) break;

    var row    = data[i];
    var status = String(row[CONFIG.COL_STATUS] || '').trim();

    // Treat blank status and corrupted date-serial-number statuses as pending.
    // Some rows have an Excel date number (e.g. 46173) in the Status column
    // due to a column-shift bug in earlier data exports.
    var isDateSerial = /^\d{5}(\.\d+)?$/.test(status);
    if (status === '' || isDateSerial) status = 'PENDING_RECONTACT';

    if (status.toUpperCase() !== 'PENDING_RECONTACT') { skipped++; continue; }

    var name  = String(row[CONFIG.COL_NAME]  || '').trim();
    var email = String(row[CONFIG.COL_EMAIL] || '').trim().toLowerCase();

    if (!email || email.indexOf('@') === -1) {
      updates[i] = ['INVALID_EMAIL', '', ''];
      errors++;
      continue;
    }

    if (optOutSet[email]) {
      updates[i] = ['OPT_OUT', '', ''];
      continue;
    }

    var firstName = extractFirstName_(name);

    try {
      GmailApp.sendEmail(
        email,
        buildSubject_(),
        buildPlainBody_(firstName),
        {
          name:     CONFIG.FROM_NAME,
          replyTo:  CONFIG.REPLY_TO,
          htmlBody: buildHtmlBody_(firstName),
          noReply:  false,
        }
      );
      updates[i] = ['SENT', today, ''];
      sent++;
      Utilities.sleep(300); // 0.3s pause — enough to avoid burst throttle
    } catch (err) {
      var errMsg = (err.message || String(err)).substring(0, 100);
      updates[i] = ['ERROR', '', errMsg];
      Logger.log('ERROR row ' + (i + 1) + ' ' + email + ': ' + errMsg);
      errors++;
    }
  }

  // Write all status/date/notes updates in one batch
  flushUpdates_(sheet, updates);

  logBatchSummary_(ss, today, sent, skipped, errors);
  Logger.log('Done — Sent: ' + sent + ' | Skipped: ' + skipped + ' | Errors: ' + errors);
}

// ── BATCH WRITE ──────────────────────────────────────────────
function flushUpdates_(sheet, updates) {
  var rows = Object.keys(updates);
  for (var k = 0; k < rows.length; k++) {
    var i   = parseInt(rows[k]);
    var upd = updates[i];
    // Write status, sentDate, notes in one setValues call per row
    sheet.getRange(i + 1, CONFIG.COL_STATUS   + 1).setValue(upd[0]);
    if (upd[1]) sheet.getRange(i + 1, CONFIG.COL_SENT_DATE + 1).setValue(upd[1]);
    if (upd[2]) sheet.getRange(i + 1, CONFIG.COL_NOTES     + 1).setValue(upd[2]);
  }
}

// ── ONE-TIME DATA FIX ────────────────────────────────────────
/**
 * Fixes two data corruption issues in the sheet:
 * 1. Rows with blank Status → set to PENDING_RECONTACT
 * 2. Rows with date-serial Status (e.g. 46173) → set to SENT
 * Run ONCE from the editor after deploying this code.
 */
function fixCorruptedStatusRows() {
  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  var data  = sheet.getDataRange().getValues();
  var fixed = { blank: 0, dateSerial: 0 };

  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][CONFIG.COL_STATUS] || '').trim();
    var isDateSerial = /^\d{5}(\.\d+)?$/.test(status);

    if (status === '') {
      sheet.getRange(i + 1, CONFIG.COL_STATUS + 1).setValue('PENDING_RECONTACT');
      fixed.blank++;
    } else if (isDateSerial) {
      // The Sent Date got shifted into the Status column — mark as SENT
      sheet.getRange(i + 1, CONFIG.COL_STATUS   + 1).setValue('SENT');
      sheet.getRange(i + 1, CONFIG.COL_SENT_DATE + 1).setValue(status); // put date back
      fixed.dateSerial++;
    }

    if (i % 1000 === 999) Utilities.sleep(1000); // avoid quota on large sheet
  }
  Logger.log('fixCorruptedStatusRows: ' + JSON.stringify(fixed));
  return fixed;
}

// ── EMAIL CONTENT ────────────────────────────────────────────
function buildSubject_() {
  return 'Your Updated CV — Al Yousuf Recruitment';
}

function buildPlainBody_(firstName) {
  var greeting = firstName ? 'Hi ' + firstName + ',' : 'Hi,';
  return [
    greeting,
    '',
    "It's been a while. We received your CV earlier and would appreciate it if you could",
    'share your latest updated CV (PDF). Please also update your passport details if possible.',
    '',
    "We're expanding across Saudi Arabia, Dubai, Bahrain, and Malaysia, and would like",
    'to keep your profile active for future opportunities.',
    '',
    'Looking forward to your updated CV.',
    '',
    'Best regards,',
    'Al Yousuf Recruitment Team',
    'Email: ai@alyousufent.com',
    '',
    'To unsubscribe, reply with "UNSUBSCRIBE" in the subject.',
  ].join('\n');
}

function buildHtmlBody_(firstName) {
  var greeting = firstName ? 'Hi <strong>' + firstName + '</strong>,' : 'Hi,';
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">'
    + '<div style="background:#1F4E79;padding:20px 30px;">'
    + '<h2 style="color:#fff;margin:0;font-size:20px;">Al Yousuf Recruitment</h2>'
    + '</div>'
    + '<div style="padding:30px;">'
    + '<p>' + greeting + '</p>'
    + "<p>It's been a while. We received your CV earlier and would appreciate it if you could share your <strong>latest updated CV (PDF)</strong>. Please also update your passport details if possible.</p>"
    + '<div style="background:#E8F4FF;border-left:4px solid #1F4E79;padding:15px 20px;margin:20px 0;border-radius:4px;">'
    + '<p style="margin:0;">&#128206; <strong>Simply reply to this email with your updated CV attached.</strong></p>'
    + '</div>'
    + "<p>We're expanding across <strong>Saudi Arabia, Dubai, Bahrain, and Malaysia</strong>, and would like to keep your profile active for future opportunities.</p>"
    + '<p>Looking forward to your updated CV.</p>'
    + '<hr style="border:none;border-top:1px solid #eee;margin:25px 0;">'
    + '<p style="font-size:13px;"><strong>Al Yousuf Recruitment Team</strong><br>'
    + '<a href="mailto:ai@alyousufent.com" style="color:#1F4E79;">ai@alyousufent.com</a></p>'
    + '<p style="font-size:11px;color:#aaa;">To unsubscribe, reply with "UNSUBSCRIBE" in the subject line.</p>'
    + '</div>'
    + '</div>';
}

// ── HELPERS ──────────────────────────────────────────────────
function extractFirstName_(fullName) {
  if (!fullName) return 'Candidate';
  var first = fullName.split(/[\s,]+/)[0];
  if (!first) return 'Candidate';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/**
 * Load opt-out emails into a plain object for O(1) lookup.
 * Called ONCE per batch run — not once per email.
 */
/**
 * Scans inbox for Gmail bounce notifications (last 14 days) and marks the
 * corresponding rows BOUNCED in the campaign sheet.
 * Called automatically at the start of each daily batch.
 *
 * Why this matters: at ~64,000 recipients, expect 5-15% bounce rate
 * (~3,000-9,000 dead addresses). Without this, we waste API quota and
 * Gmail sending quota resending to addresses that will never receive mail.
 */
function processBounceReplies_(ss, sheet) {
  var data  = sheet.getDataRange().getValues();

  // Build email → sheet row map for O(1) lookup
  var emailRowMap = {};
  for (var i = 1; i < data.length; i++) {
    var e = String(data[i][CONFIG.COL_EMAIL] || '').trim().toLowerCase();
    if (e) emailRowMap[e] = i;
  }

  // Gmail bounce notifications: from mailer-daemon OR delivery failure subjects
  var query = '(from:mailer-daemon OR from:postmaster ' +
              'OR subject:"delivery status notification" ' +
              'OR subject:"undelivered mail returned" ' +
              'OR subject:"mail delivery failed" ' +
              'OR subject:"failure notice") newer_than:14d';
  var threads = [];
  try { threads = GmailApp.search(query, 0, 100); } catch(e) { return 0; }

  var marked = 0;
  var today  = new Date().toISOString().substring(0, 10);

  for (var t = 0; t < threads.length; t++) {
    var msgs = threads[t].getMessages();
    for (var m = 0; m < msgs.length; m++) {
      var body = msgs[m].getPlainBody() || '';

      // Extract all email addresses from the bounce body using common patterns
      var found = {};

      // Pattern 1: RFC 3464 — Final-Recipient: rfc822; user@domain
      var re1 = /(?:final-recipient|original-recipient)[^\n]*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
      var m1;
      while ((m1 = re1.exec(body)) !== null) found[m1[1].toLowerCase()] = true;

      // Pattern 2: "failed to deliver to <user@domain>"
      var re2 = /(?:failed to deliver to|could not be delivered to|delivery failed to)[^<\n]*?<?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/gi;
      var m2;
      while ((m2 = re2.exec(body)) !== null) found[m2[1].toLowerCase()] = true;

      // Pattern 3: "<user@domain>" anywhere in typical bounce headers
      var re3 = /<([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>/g;
      var m3;
      while ((m3 = re3.exec(body)) !== null) found[m3[1].toLowerCase()] = true;

      for (var addr in found) {
        if (!emailRowMap.hasOwnProperty(addr)) continue;
        var rowIdx = emailRowMap[addr];
        var curStatus = String(data[rowIdx][CONFIG.COL_STATUS] || '').toUpperCase();
        if (curStatus === 'BOUNCED' || curStatus === 'OPT_OUT') continue; // already handled
        sheet.getRange(rowIdx + 1, CONFIG.COL_STATUS + 1).setValue('BOUNCED');
        sheet.getRange(rowIdx + 1, CONFIG.COL_NOTES  + 1).setValue('Bounced ' + today);
        marked++;
      }
    }
    if (t % 20 === 19) Utilities.sleep(500);
  }

  Logger.log('processBounceReplies_: marked ' + marked + ' rows BOUNCED from ' + threads.length + ' threads');
  return marked;
}

function loadOptOutSet_(ss) {
  var set = {};
  try {
    var sheet = ss.getSheetByName('_OptOut');
    if (!sheet) return set;
    var data  = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      var email = String(data[i][0] || '').trim().toLowerCase();
      if (email) set[email] = true;
    }
  } catch(e) { Logger.log('loadOptOutSet_ error: ' + e.message); }
  return set;
}

function logBatchSummary_(ss, date, sent, skipped, errors) {
  var logSheet = ss.getSheetByName('_CampaignLog');
  if (!logSheet) {
    logSheet = ss.insertSheet('_CampaignLog');
    logSheet.appendRow(['Date', 'Sent', 'Skipped', 'Errors', 'Running Total Sent']);
  }
  var prev = 0;
  var lastRow = logSheet.getLastRow();
  if (lastRow > 1) {
    prev = Number(logSheet.getRange(lastRow, 5).getValue()) || 0;
  }
  logSheet.appendRow([date, sent, skipped, errors, prev + sent]);
}

/// ── DIAGNOSTIC: Run this first if you see "An unknown error" ────────────────
/**
 * Tests every dependency one by one and logs exactly which step fails.
 * Select diagnoseCampaign from the dropdown and click Run.
 */
function diagnoseCampaign() {
  Logger.log('--- diagnoseCampaign START ---');

  // 1. Can we open the spreadsheet?
  var ss;
  try {
    ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    Logger.log('✓ Spreadsheet opened: ' + ss.getName());
  } catch(e) {
    Logger.log('✗ FAILED to open spreadsheet ID: ' + CONFIG.SHEET_ID);
    Logger.log('  Error: ' + e.message);
    Logger.log('  Fix: open the Google Sheet, copy the ID from the URL, update CONFIG.SHEET_ID');
    return;
  }

  // 2. Can we find the main sheet?
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    var allSheets = ss.getSheets().map(function(s){ return s.getName(); });
    Logger.log('✗ Sheet "' + CONFIG.SHEET_NAME + '" not found');
    Logger.log('  Available sheets: ' + allSheets.join(', '));
    Logger.log('  Fix: update CONFIG.SHEET_NAME to match one of the above');
    return;
  }
  Logger.log('✓ Main sheet found: ' + sheet.getName() + ' | Rows: ' + sheet.getLastRow());

  // 3. Check column headers match what the code expects
  var headers = sheet.getRange(1, 1, 1, 8).getValues()[0];
  Logger.log('✓ Column headers: ' + JSON.stringify(headers));
  Logger.log('  Expected: Name | Email | Date | Subject | Attachments | Status | Sent Date | Notes');

  // 4. Sample first pending row
  var data = sheet.getDataRange().getValues();
  var sample = null;
  for (var i = 1; i < Math.min(data.length, 500); i++) {
    var st = String(data[i][CONFIG.COL_STATUS] || '').trim().toUpperCase();
    if (st === 'PENDING_RECONTACT' || st === '') { sample = data[i]; break; }
  }
  if (sample) {
    Logger.log('✓ First pending row — Name: ' + sample[0] + ' | Email: ' + sample[1] + ' | Status: "' + sample[5] + '"');
  } else {
    Logger.log('! No PENDING_RECONTACT rows found in first 500 rows');
  }

  // 5. Status breakdown (first 1000 rows only — fast check)
  var counts = {};
  for (var j = 1; j < Math.min(data.length, 1000); j++) {
    var s = String(data[j][CONFIG.COL_STATUS] || '(blank)').trim();
    if (/^\d{5}/.test(s)) s = '(date-serial: ' + s + ')';
    counts[s] = (counts[s] || 0) + 1;
  }
  Logger.log('✓ Status sample (first 1000 rows): ' + JSON.stringify(counts));

  // 6. Can we access Gmail?
  try {
    var quota = MailApp.getRemainingDailyQuota();
    Logger.log('✓ Gmail quota remaining today: ' + quota);
    if (quota < 10) Logger.log('  WARNING: quota nearly exhausted — emails will fail today');
  } catch(e) {
    Logger.log('✗ Gmail access failed: ' + e.message);
  }

  // 7. _OptOut sheet
  var optSheet = ss.getSheetByName('_OptOut');
  Logger.log(optSheet
    ? '✓ _OptOut sheet exists: ' + (optSheet.getLastRow() - 1) + ' opt-outs'
    : '! _OptOut sheet missing — will be created on first run');

  Logger.log('--- diagnoseCampaign END ---');
}

// ── SETUP: Run ONCE to create daily trigger ──────────────────
function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runDailyRecontactBatch') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('runDailyRecontactBatch')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  Logger.log('Daily trigger set for 9am. Run setupDailyTrigger() only once.');
}

// ── STATS: Run anytime to check campaign progress ────────────
function getCampaignStats() {
  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  if (!sheet) { Logger.log('Sheet not found'); return; }

  var data  = sheet.getDataRange().getValues();
  var stats = { PENDING_RECONTACT: 0, SENT: 0, ERROR: 0, OPT_OUT: 0,
                INVALID_EMAIL: 0, BOUNCED: 0, BLANK: 0, DATE_CORRUPTED: 0, OTHER: 0 };

  for (var i = 1; i < data.length; i++) {
    var raw    = String(data[i][CONFIG.COL_STATUS] || '').trim();
    var status = raw.toUpperCase();
    if (raw === '') { stats.BLANK++; continue; }
    if (/^\d{5}(\.\d+)?$/.test(raw)) { stats.DATE_CORRUPTED++; continue; }
    if (stats.hasOwnProperty(status)) stats[status]++;
    else stats.OTHER++;
  }

  var total      = data.length - 1;
  var pct        = total > 0 ? Math.round(stats.SENT * 100 / total) : 0;
  var pendingAll = stats.PENDING_RECONTACT + stats.BLANK + stats.DATE_CORRUPTED;

  Logger.log('=== Campaign Stats ===');
  Logger.log('Total rows:          ' + total);
  Logger.log('Sent:                ' + stats.SENT + ' (' + pct + '%)');
  Logger.log('Pending (clean):     ' + stats.PENDING_RECONTACT);
  Logger.log('Pending (blank):     ' + stats.BLANK + '  ← run fixCorruptedStatusRows()');
  Logger.log('Pending (corrupted): ' + stats.DATE_CORRUPTED + '  ← run fixCorruptedStatusRows()');
  Logger.log('Total still to send: ' + pendingAll);
  Logger.log('Days left at 400/day:' + Math.ceil(pendingAll / 400));
  Logger.log('Errors:              ' + stats.ERROR);
  Logger.log('Opt-out:             ' + stats.OPT_OUT);
  Logger.log('Invalid email:       ' + stats.INVALID_EMAIL);
}

// ── OPT-OUT HANDLER: Run daily to process unsubscribe replies ─
function processOptOutReplies() {
  var ss       = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var optSheet = ss.getSheetByName('_OptOut');
  if (!optSheet) {
    optSheet = ss.insertSheet('_OptOut');
    optSheet.appendRow(['Email', 'Date']);
  }

  var threads = GmailApp.search('to:ai@alyousufent.com subject:UNSUBSCRIBE newer_than:2d');
  var added   = 0;

  for (var i = 0; i < threads.length; i++) {
    var msgs  = threads[i].getMessages();
    var from  = msgs[0].getFrom();
    var match = from.match(/<([^>]+)>/);
    var addr  = (match ? match[1] : from).toLowerCase().trim();

    optSheet.appendRow([addr, new Date()]);

    var mainSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    var data = mainSheet.getDataRange().getValues();
    for (var j = 1; j < data.length; j++) {
      if (String(data[j][CONFIG.COL_EMAIL]).trim().toLowerCase() === addr) {
        mainSheet.getRange(j + 1, CONFIG.COL_STATUS + 1).setValue('OPT_OUT');
        break;
      }
    }
    added++;
  }
  Logger.log('Opt-outs processed: ' + added);
}
