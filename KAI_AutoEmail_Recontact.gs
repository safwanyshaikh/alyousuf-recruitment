// ============================================================
// KAI Auto-Email Recontact Campaign
// Project: KAI-Recontact-Campaign (NEW standalone GAS project)
// Purpose: Email 67,781 legacy CV senders asking for fresh CV
// DO NOT add this to existing GAS projects
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
var CONFIG = {
  SHEET_ID:        '',          // ← Paste your Google Sheet ID here (where you pasted the CSV)
  SHEET_NAME:      'Gmail_CV_Candidates',
  DAILY_LIMIT:     80,          // 80/day = safe margin (Gmail limit 500/day)
  FROM_NAME:       'Al Yousuf Recruitment',
  REPLY_TO:        'ai@alyousufent.com',
  
  // Column indices (0-based) — matches the CSV exactly
  COL_NAME:        0,  // A
  COL_EMAIL:       1,  // B
  COL_DATE:        2,  // C
  COL_SUBJECT:     3,  // D
  COL_ATT_NAMES:   4,  // E
  COL_STATUS:      5,  // F  ← PENDING_RECONTACT / SENT / BOUNCED / OPT_OUT / ERROR
  COL_SENT_DATE:   6,  // G  (add this column header in sheet: "Sent Date")
  COL_NOTES:       7,  // H  (add this column header in sheet: "Notes")
};

// ── MAIN: Run daily via Time Trigger ────────────────────────
function runDailyRecontactBatch() {
  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) { Logger.log('Sheet not found: ' + CONFIG.SHEET_NAME); return; }

  var data      = sheet.getDataRange().getValues();
  var headers   = data[0];
  var sent      = 0;
  var skipped   = 0;
  var errors    = 0;
  var today     = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd');

  Logger.log('=== KAI Recontact Batch — ' + today + ' ===');

  for (var i = 1; i < data.length; i++) {
    if (sent >= CONFIG.DAILY_LIMIT) break;

    var row    = data[i];
    var status = String(row[CONFIG.COL_STATUS] || '').trim().toUpperCase();

    // Only process rows still pending
    if (status !== 'PENDING_RECONTACT') { skipped++; continue; }

    var name  = String(row[CONFIG.COL_NAME]  || '').trim();
    var email = String(row[CONFIG.COL_EMAIL] || '').trim().toLowerCase();

    // Basic validation
    if (!email || email.indexOf('@') === -1) {
      sheet.getRange(i + 1, CONFIG.COL_STATUS + 1).setValue('INVALID_EMAIL');
      errors++;
      continue;
    }

    // Skip obvious opt-outs / bounces already stored
    if (isOptOut_(email)) {
      sheet.getRange(i + 1, CONFIG.COL_STATUS + 1).setValue('OPT_OUT');
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

      // Mark row as sent
      sheet.getRange(i + 1, CONFIG.COL_STATUS  + 1).setValue('SENT');
      sheet.getRange(i + 1, CONFIG.COL_SENT_DATE + 1).setValue(today);
      sent++;
      Utilities.sleep(500); // 0.5s pause between sends
    } catch (err) {
      var errMsg = err.message || String(err);
      sheet.getRange(i + 1, CONFIG.COL_STATUS + 1).setValue('ERROR');
      sheet.getRange(i + 1, CONFIG.COL_NOTES  + 1).setValue(errMsg.substring(0, 100));
      Logger.log('ERROR row ' + (i+1) + ' ' + email + ': ' + errMsg);
      errors++;
    }
  }

  // Log summary to sheet
  logBatchSummary_(ss, today, sent, skipped, errors);
  Logger.log('Done — Sent: ' + sent + ' | Skipped: ' + skipped + ' | Errors: ' + errors);
}

// ── EMAIL CONTENT ────────────────────────────────────────────
function buildSubject_() {
  return 'Your CV with Al Yousuf — Update Required for Current Openings';
}

function buildPlainBody_(firstName) {
  return [
    'Dear ' + firstName + ',',
    '',
    'Thank you for previously submitting your CV to Al Yousuf Manpower Recruitment.',
    '',
    'We currently have several active openings across the Gulf region and your profile',
    'may be a strong match. However, we need your most up-to-date CV to proceed.',
    '',
    'Please reply to this email with your latest CV attached (PDF or Word format).',
    '',
    'Once received, our KAI screening system will review your profile and our team',
    'will contact you if there is a suitable match.',
    '',
    'Current active sectors:',
    '  • Oil & Gas (Engineers, Technicians, Safety Officers)',
    '  • Construction (Civil, Electrical, Mechanical)',
    '  • HVAC & MEP',
    '  • Hospitality & Facilities Management',
    '',
    'To unsubscribe from future messages, reply with "UNSUBSCRIBE" in the subject.',
    '',
    'Best regards,',
    'KAI Recruitment Team',
    'Al Yousuf Manpower Recruitment',
    'Email: ai@alyousufent.com',
  ].join('\n');
}

function buildHtmlBody_(firstName) {
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">'
    + '<div style="background:#1F4E79;padding:20px 30px;">'
    + '<h2 style="color:#fff;margin:0;font-size:20px;">Al Yousuf Manpower Recruitment</h2>'
    + '<p style="color:#9DC3E6;margin:4px 0 0;font-size:13px;">KAI Intelligent Screening System</p>'
    + '</div>'
    + '<div style="padding:30px;">'
    + '<p>Dear <strong>' + firstName + '</strong>,</p>'
    + '<p>Thank you for previously submitting your CV to <strong>Al Yousuf Manpower Recruitment</strong>.</p>'
    + '<p>We currently have <strong>active openings across the Gulf region</strong> and your profile may be a strong match. '
    + 'To proceed, we need your <strong>most up-to-date CV</strong>.</p>'
    + '<div style="background:#E8F4FF;border-left:4px solid #1F4E79;padding:15px 20px;margin:20px 0;border-radius:4px;">'
    + '<p style="margin:0;font-weight:bold;">&#128206; Please reply to this email with your latest CV (PDF or Word format)</p>'
    + '</div>'
    + '<p><strong>Current active sectors:</strong></p>'
    + '<ul>'
    + '<li>Oil &amp; Gas — Engineers, Technicians, Safety Officers</li>'
    + '<li>Construction — Civil, Electrical, Mechanical</li>'
    + '<li>HVAC &amp; MEP</li>'
    + '<li>Hospitality &amp; Facilities Management</li>'
    + '</ul>'
    + '<p>Once received, our KAI system will screen your profile and our team will contact you if there is a match.</p>'
    + '<hr style="border:none;border-top:1px solid #eee;margin:25px 0;">'
    + '<p style="font-size:12px;color:#999;">To unsubscribe, reply with "UNSUBSCRIBE" in the subject line.<br>'
    + 'Al Yousuf Manpower | ai@alyousufent.com</p>'
    + '</div>'
    + '</div>';
}

// ── HELPERS ──────────────────────────────────────────────────
function extractFirstName_(fullName) {
  if (!fullName) return 'Candidate';
  // Take first word, capitalise properly
  var first = fullName.split(/[\s,]+/)[0];
  if (!first) return 'Candidate';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// Maintain opt-out list in a sheet named "_OptOut"
function isOptOut_(email) {
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sheet = ss.getSheetByName('_OptOut');
    if (!sheet) return false;
    var data  = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === email) return true;
    }
  } catch(e) {}
  return false;
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

// ── SETUP: Run ONCE to create daily trigger ──────────────────
function setupDailyTrigger() {
  // Delete existing triggers for this function first
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runDailyRecontactBatch') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // Create new trigger: runs daily at 9am Dubai time
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
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) { Logger.log('Sheet not found'); return; }

  var data  = sheet.getDataRange().getValues();
  var stats = { PENDING_RECONTACT: 0, SENT: 0, ERROR: 0, OPT_OUT: 0,
                INVALID_EMAIL: 0, BOUNCED: 0, OTHER: 0 };

  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][CONFIG.COL_STATUS] || '').trim().toUpperCase();
    if (stats.hasOwnProperty(status)) stats[status]++;
    else stats.OTHER++;
  }

  var total = data.length - 1;
  var pct   = total > 0 ? Math.round(stats.SENT * 100 / total) : 0;

  Logger.log('=== Campaign Stats ===');
  Logger.log('Total rows:    ' + total);
  Logger.log('Sent:          ' + stats.SENT + ' (' + pct + '%)');
  Logger.log('Pending:       ' + stats.PENDING_RECONTACT);
  Logger.log('Errors:        ' + stats.ERROR);
  Logger.log('Opt-out:       ' + stats.OPT_OUT);
  Logger.log('Invalid email: ' + stats.INVALID_EMAIL);
  Logger.log('Days to complete at 80/day: ' + Math.ceil(stats.PENDING_RECONTACT / 80));
}

// ── OPT-OUT HANDLER: Run daily to process unsubscribe replies ─
function processOptOutReplies() {
  var ss       = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var optSheet = ss.getSheetByName('_OptOut');
  if (!optSheet) {
    optSheet = ss.insertSheet('_OptOut');
    optSheet.appendRow(['Email', 'Date']);
  }

  // Search for UNSUBSCRIBE replies in last 2 days
  var threads = GmailApp.search('to:ai@alyousufent.com subject:UNSUBSCRIBE newer_than:2d');
  var added   = 0;

  for (var i = 0; i < threads.length; i++) {
    var msgs  = threads[i].getMessages();
    var email = msgs[0].getFrom();
    // Extract just the email address
    var match = email.match(/<([^>]+)>/);
    var addr  = match ? match[1].toLowerCase() : email.toLowerCase();

    optSheet.appendRow([addr, new Date()]);

    // Update status in main sheet
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
