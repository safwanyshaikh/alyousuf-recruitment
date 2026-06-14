// ============================================================
// KAI API BRIDGE — COMPLETE ENDPOINTS (Sprints 2–7)
// Project: KAI-API-Bridge (standalone GAS project)
// Add these functions AFTER the Sprint 1 code already pasted.
// DO NOT modify any existing KAI GAS files.
// ============================================================
// CONTENTS:
//   S2  — POST handler (doPost) for all write operations
//   S3  — updateStage, saveNote, activityLog
//   S4  — createRequirement, getRequirementsEnhanced
//   S5  — JD Repository (createJD, getJDs, getJDDetail)
//   S6  — uploadCV (unified pipeline trigger)
//   S7  — Email Workspace (inbox, thread, reply, convert)
//   S8  — Setup: create _ActivityLog + _JD_Repository sheets
// ============================================================

// ── UPDATE doGet to include new endpoints ────────────────────
// Replace/extend the existing doGet in Bridge with this version:
function doGet(e) {
  var params  = e && e.parameter ? e.parameter : {};
  var action  = params.action || 'candidates';
  var token   = params.token  || '';
  var out;

  try {
    if (action === 'login') {
      out = JSON.stringify(handleLogin_(params.email||'', params.password||''));
      return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
    }
    if (!isTokenValid_(token)) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: 'Unauthorized' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ── READ endpoints ────────────────────────────────────────
    if      (action === 'candidates')           out = JSON.stringify(getCandidates_(params));
    else if (action === 'candidate')            out = JSON.stringify(getSingleCandidate_(params));
    else if (action === 'search')               out = JSON.stringify(globalSearch_(params));
    else if (action === 'requirements')         out = JSON.stringify(getRequirementsEnhanced_());
    else if (action === 'match')                out = JSON.stringify(getMatchedCandidates_(params));
    else if (action === 'metrics')              out = JSON.stringify(getMetrics_());
    else if (action === 'sac')                  out = JSON.stringify(getSacPerformance_());
    else if (action === 'activityLog')          out = JSON.stringify(getActivityLog_(params));
    else if (action === 'jds')                  out = JSON.stringify(getJDs_(params));
    else if (action === 'jdDetail')             out = JSON.stringify(getJDDetail_(params));
    else if (action === 'gmailInbox')           out = JSON.stringify(getGmailInbox_(params));
    else if (action === 'gmailThread')          out = JSON.stringify(getGmailThread_(params));
    else                                        out = JSON.stringify({ ok: false, error: 'Unknown action: ' + action });

  } catch(err) {
    out = JSON.stringify({ ok: false, error: err.message, stack: err.stack });
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

// ── doPost — handles all write operations ────────────────────
function doPost(e) {
  var out;
  try {
    var params  = e && e.parameter ? e.parameter : {};
    var body    = {};
    try { body = JSON.parse(e.postData.contents); } catch(x) {}

    var action = body.action || params.action || '';
    var token  = body.token  || params.token  || '';

    if (!isTokenValid_(token)) {
      out = JSON.stringify({ ok: false, error: 'Unauthorized' });
      return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
    }

    if      (action === 'updateStage')       out = JSON.stringify(updateStage_(body));
    else if (action === 'saveNote')          out = JSON.stringify(saveNote_(body));
    else if (action === 'createRequirement') out = JSON.stringify(createRequirement_(body));
    else if (action === 'updateRequirement') out = JSON.stringify(updateRequirement_(body));
    else if (action === 'createJD')          out = JSON.stringify(createJD_(body));
    else if (action === 'uploadCV')          out = JSON.stringify(uploadCV_(body));
    else if (action === 'gmailReply')        out = JSON.stringify(gmailReply_(body));
    else if (action === 'gmailConvert')      out = JSON.stringify(gmailConvert_(body));
    else                                     out = JSON.stringify({ ok: false, error: 'Unknown POST action: ' + action });

  } catch(err) {
    out = JSON.stringify({ ok: false, error: err.message });
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════════════════════════
// S3 — STAGE + NOTES + ACTIVITY LOG
// ════════════════════════════════════════════════════════════

// Valid stage values (must match GAS pipeline exactly)
var VALID_STAGES = [
  'Pending action','New','Under Review','Shortlisted',
  'Client Sent','Client Selected','Offer Issued',
  'Visa Processing','Deployed','On Hold','Rejected','HOLD'
];

// POST body: { token, rowIndex, newStage, recruiter }
function updateStage_(body) {
  var rowIndex  = parseInt(body.rowIndex||'0');
  var newStage  = String(body.newStage ||'').trim();
  var recruiter = String(body.recruiter||'recruiter@system').trim();

  if (!rowIndex)  return { ok: false, error: 'rowIndex required' };
  if (!newStage)  return { ok: false, error: 'newStage required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok: false, error: 'Candidates sheet not found' };

  var prevStage = String(sheet.getRange(rowIndex, 1).getValue()||'').trim();
  sheet.getRange(rowIndex, 1).setValue(newStage);

  // Log to _ActivityLog
  logActivity_(ss, {
    kaiNo:     String(sheet.getRange(rowIndex, 25).getValue()||''),
    rowIndex:  rowIndex,
    action:    'STAGE_CHANGE',
    detail:    prevStage + ' → ' + newStage,
    actor:     recruiter
  });

  return { ok: true, rowIndex: rowIndex, prevStage: prevStage, newStage: newStage };
}

// POST body: { token, rowIndex, kaiNo, note, recruiter }
function saveNote_(body) {
  var rowIndex  = parseInt(body.rowIndex||'0');
  var kaiNo     = String(body.kaiNo    ||'').trim();
  var note      = String(body.note     ||'').trim();
  var recruiter = String(body.recruiter||'recruiter@system').trim();

  if (!note)    return { ok: false, error: 'note text required' };
  if (!rowIndex && !kaiNo) return { ok: false, error: 'rowIndex or kaiNo required' };

  var ss        = SpreadsheetApp.openById(SS_ID);
  var noteSheet = ensureActivitySheet_(ss);

  // Append note as activity entry
  noteSheet.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm'),
    kaiNo || ('ROW:' + rowIndex),
    rowIndex || '',
    'NOTE',
    note.slice(0, 500),
    recruiter,
    ''
  ]);

  return { ok: true, saved: true };
}

// GET ?action=activityLog&rowIndex=5&kaiNo=AYE-KAI-2026-001
function getActivityLog_(params) {
  var rowIndex = parseInt(params.rowIndex||'0');
  var kaiNo    = String(params.kaiNo||'').trim();
  if (!rowIndex && !kaiNo) return { ok: false, error: 'rowIndex or kaiNo required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_ActivityLog');
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, log: [] };

  var data = sheet.getDataRange().getValues();
  var log  = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var match = (kaiNo   && String(row[1]) === kaiNo) ||
                (rowIndex && parseInt(row[2]) === rowIndex);
    if (!match) continue;
    log.push({
      timestamp: String(row[0]),
      kaiNo:     String(row[1]),
      rowIndex:  parseInt(row[2])||0,
      action:    String(row[3]),
      detail:    String(row[4]),
      actor:     String(row[5]),
      notes:     String(row[6])
    });
  }

  // Sort newest first
  log.reverse();
  return { ok: true, log: log, count: log.length };
}

function logActivity_(ss, entry) {
  var sheet = ensureActivitySheet_(ss);
  sheet.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm'),
    entry.kaiNo    || '',
    entry.rowIndex || '',
    entry.action   || '',
    (entry.detail  || '').slice(0, 500),
    entry.actor    || 'system',
    entry.notes    || ''
  ]);
}

function ensureActivitySheet_(ss) {
  var sheet = ss.getSheetByName('_ActivityLog');
  if (!sheet) {
    sheet = ss.insertSheet('_ActivityLog');
    sheet.appendRow(['Timestamp','KAI No','Row Index','Action','Detail','Actor','Notes']);
    sheet.getRange(1,1,1,7).setFontWeight('bold')
         .setBackground('#1F4E79').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ════════════════════════════════════════════════════════════
// S4 — REQUIREMENTS (Enhanced)
// ════════════════════════════════════════════════════════════

// GET — returns requirements with tier match counts
function getRequirementsEnhanced_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, requirements: [] };

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 25).getValues();

  // Pre-load candidates once for match counting
  var cands = getCandidates_({ limit: '500' }).records || [];

  var reqs = data
    .filter(function(row) { return String(row[0]||'').trim(); })
    .map(function(row) {
      var trade    = String(row[4]||'').toLowerCase();
      var minExp   = parseFloat(row[6])||0;
      var status   = String(row[14]||'Open').trim();
      var jdId     = String(row[20]||'').trim(); // col 21 — JD_ID (new)
      var startDt  = row[21] instanceof Date ?
                       Utilities.formatDate(row[21],'Asia/Kolkata','yyyy-MM-dd') : String(row[21]||'');
      var endDt    = row[22] instanceof Date ?
                       Utilities.formatDate(row[22],'Asia/Kolkata','yyyy-MM-dd') : String(row[22]||'');

      // Count matches by tier
      var counts = { STRONG:0, GOOD:0, POSSIBLE:0, REVIEW:0 };
      cands.forEach(function(c) {
        if (trade && c.trade.toLowerCase().indexOf(trade) < 0 &&
            c.positionApplied.toLowerCase().indexOf(trade) < 0) return;
        if (minExp > 0 && c.experience < minExp) return;
        counts[c.confidenceTier] = (counts[c.confidenceTier]||0) + 1;
      });

      return {
        reqId:         String(row[0]||'').trim(),
        receivedDate:  row[1] instanceof Date ?
                         Utilities.formatDate(row[1],'Asia/Kolkata','dd-MMM-yyyy') : '',
        clientName:    String(row[2]||'Unknown').trim(),
        deployCountry: String(row[3]||'').trim(),
        jobTitle:      String(row[4]||'').trim(),
        trade:         String(row[4]||'').trim(),
        requiredQty:   parseInt(row[5])||0,
        minExperience: parseInt(row[6])||0,
        minAge:        parseInt(row[7])||0,
        maxAge:        parseInt(row[8])||0,
        gccPreference: String(row[9]||'').trim(),
        urgency:       String(row[13]||'Normal').trim(),
        status:        status,
        sourcedBy:     String(row[15]||'').trim(),
        specialReq:    String(row[16]||'').trim(),
        shortlistCount:parseInt(row[17])||0,
        selectedCount: parseInt(row[18])||0,
        notes:         String(row[19]||'').trim(),
        jdId:          jdId,
        startDate:     startDt,
        endDate:       endDt,
        matchCounts:   counts,
        totalMatches:  counts.STRONG + counts.GOOD + counts.POSSIBLE
      };
    });

  return { ok: true, requirements: reqs, count: reqs.length };
}

// POST — create new requirement
// body: { token, jobTitle, trade, deployCountry, clientName, requiredQty,
//         minExperience, startDate, endDate, notes, jdId, sourcedBy }
function createRequirement_(body) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) return { ok: false, error: '_Requirements sheet not found' };

  var now   = new Date();
  var reqId = generateReqId_(ss);

  var row = [
    reqId,                                          // Req ID
    now,                                            // Received Date
    String(body.clientName    ||'').trim(),         // Client Name
    String(body.deployCountry ||'').trim(),         // Deploy Country
    String(body.trade         || body.jobTitle ||'').trim(), // Trade / Job Title
    parseInt(body.requiredQty ||'1') || 1,          // Quantity
    parseFloat(body.minExperience||'0') || 0,       // Min Experience
    parseInt(body.minAge      ||'0') || 0,          // Min Age
    parseInt(body.maxAge      ||'0') || 0,          // Max Age
    '',                                             // GCC Preference
    '',                                             // Local Transfer Req
    '',                                             // Visit Visa OK
    '',                                             // Certifications
    String(body.urgency       ||'Normal').trim(),   // Urgency
    'Active',                                       // Status
    String(body.sourcedBy     || body.recruiter||'').trim(), // Sourced By
    String(body.specialReq    ||'').trim(),         // Special Requirements
    0,                                              // Shortlist Count
    0,                                              // Selected Count
    String(body.notes         ||'').trim(),         // Notes
    String(body.jdId          ||'').trim(),         // JD_ID (linked JD)
    body.startDate || '',                           // Start Date
    body.endDate   || '',                           // End Date
  ];

  sheet.appendRow(row);
  return { ok: true, reqId: reqId, message: 'Requirement created: ' + reqId };
}

// POST — update existing requirement
function updateRequirement_(body) {
  var reqId = String(body.reqId||'').trim();
  if (!reqId) return { ok: false, error: 'reqId required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) return { ok: false, error: '_Requirements sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === reqId) {
      var rowNum = i + 1;
      if (body.status)      sheet.getRange(rowNum, 15).setValue(body.status);
      if (body.notes)       sheet.getRange(rowNum, 20).setValue(body.notes);
      if (body.startDate)   sheet.getRange(rowNum, 22).setValue(body.startDate);
      if (body.endDate)     sheet.getRange(rowNum, 23).setValue(body.endDate);
      if (body.shortlistCount !== undefined)
        sheet.getRange(rowNum, 18).setValue(parseInt(body.shortlistCount)||0);
      return { ok: true, reqId: reqId, updated: true };
    }
  }
  return { ok: false, error: 'Requirement not found: ' + reqId };
}

function generateReqId_(ss) {
  var props   = PropertiesService.getScriptProperties();
  var counter = parseInt(props.getProperty('req_id_counter')||'0') + 1;
  props.setProperty('req_id_counter', String(counter));
  return 'AYE-REQ-' + new Date().getFullYear() + '-' +
         String(counter).padStart(4, '0');
}

// ════════════════════════════════════════════════════════════
// S5 — JD REPOSITORY
// ════════════════════════════════════════════════════════════

var JD_HEADERS = [
  'JD_ID','Received_Date','Source','Client','Title','Trade','Country',
  'Raw_Text','Parsed_Requirements','Min_Experience','Certifications',
  'Status','Linked_Req_ID','Drive_Link','Created_By','Notes'
];

// GET ?action=jds&status=ACTIVE&trade=Welder
function getJDs_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_JD_Repository');
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, jds: [] };

  var filterStatus = String(params.status||'').trim().toUpperCase();
  var filterTrade  = String(params.trade ||'').trim().toLowerCase();

  var data = sheet.getDataRange().getValues();
  var jds  = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!String(row[0]||'').trim()) continue;

    var status = String(row[11]||'').toUpperCase();
    var trade  = String(row[5]||'').toLowerCase();

    if (filterStatus && status !== filterStatus) continue;
    if (filterTrade  && trade.indexOf(filterTrade) < 0) continue;

    jds.push({
      jdId:           String(row[0]||'').trim(),
      receivedDate:   row[1] instanceof Date ?
                        Utilities.formatDate(row[1],'Asia/Kolkata','dd-MMM-yyyy') : String(row[1]||''),
      source:         String(row[2]||'').trim(),
      client:         String(row[3]||'').trim(),
      title:          String(row[4]||'').trim(),
      trade:          String(row[5]||'').trim(),
      country:        String(row[6]||'').trim(),
      parsedReq:      String(row[8]||'').trim(),
      minExperience:  parseFloat(row[9])||0,
      certifications: String(row[10]||'').trim(),
      status:         String(row[11]||'').trim(),
      linkedReqId:    String(row[12]||'').trim(),
      driveLink:      String(row[13]||'').trim(),
      createdBy:      String(row[14]||'').trim(),
      notes:          String(row[15]||'').trim(),
      // Full raw text intentionally excluded from list (use jdDetail for that)
    });
  }

  return { ok: true, jds: jds, count: jds.length };
}

// GET ?action=jdDetail&jdId=AYE-JD-2026-0001
function getJDDetail_(params) {
  var jdId  = String(params.jdId||'').trim();
  if (!jdId) return { ok: false, error: 'jdId required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_JD_Repository');
  if (!sheet) return { ok: false, error: '_JD_Repository sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === jdId) {
      var row = data[i];
      return {
        ok:             true,
        jdId:           String(row[0]||'').trim(),
        receivedDate:   row[1] instanceof Date ?
                          Utilities.formatDate(row[1],'Asia/Kolkata','dd-MMM-yyyy') : String(row[1]||''),
        source:         String(row[2]||'').trim(),
        client:         String(row[3]||'').trim(),
        title:          String(row[4]||'').trim(),
        trade:          String(row[5]||'').trim(),
        country:        String(row[6]||'').trim(),
        rawText:        String(row[7]||'').trim(),
        parsedReq:      String(row[8]||'').trim(),
        minExperience:  parseFloat(row[9])||0,
        certifications: String(row[10]||'').trim(),
        status:         String(row[11]||'').trim(),
        linkedReqId:    String(row[12]||'').trim(),
        driveLink:      String(row[13]||'').trim(),
        createdBy:      String(row[14]||'').trim(),
        notes:          String(row[15]||'').trim(),
      };
    }
  }
  return { ok: false, error: 'JD not found: ' + jdId };
}

// POST — create JD manually or from email
// body: { token, title, trade, country, client, rawText, source, notes, recruiter }
function createJD_(body) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ensureJDSheet_(ss);

  var jdId  = generateJDId_(ss);
  var now   = new Date();

  // Auto-parse basic fields from raw text if provided
  var rawText = String(body.rawText||'').trim();
  var parsed  = parseJDText_(rawText);

  var row = [
    jdId,                                               // JD_ID
    now,                                                // Received_Date
    String(body.source       ||'MANUAL').trim(),        // Source
    String(body.client       ||'').trim(),              // Client
    String(body.title        || parsed.title||'').trim(),// Title
    String(body.trade        || parsed.trade||'').trim(),// Trade
    String(body.country      || parsed.country||'').trim(),// Country
    rawText,                                            // Raw_Text
    parsed.requirements,                                // Parsed_Requirements
    parseFloat(body.minExperience || parsed.minExp)||0, // Min_Experience
    parsed.certifications,                              // Certifications
    'ACTIVE',                                           // Status
    '',                                                 // Linked_Req_ID
    '',                                                 // Drive_Link
    String(body.recruiter    ||'system').trim(),        // Created_By
    String(body.notes        ||'').trim(),              // Notes
  ];

  sheet.appendRow(row);
  return { ok: true, jdId: jdId, parsed: parsed, message: 'JD created: ' + jdId };
}

function parseJDText_(text) {
  if (!text) return { title:'', trade:'', country:'', requirements:'', minExp:0, certifications:'' };

  var result = { title:'', trade:'', country:'', requirements:'', minExp:0, certifications:'' };

  // Extract min experience
  var expMatch = text.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
  if (expMatch) result.minExp = parseInt(expMatch[1]);

  // Extract country
  var countries = ['Saudi Arabia','UAE','Qatar','Bahrain','Kuwait','Oman','Malaysia','India'];
  for (var i = 0; i < countries.length; i++) {
    if (text.toLowerCase().indexOf(countries[i].toLowerCase()) >= 0) {
      result.country = countries[i]; break;
    }
  }

  // Extract trade keywords (simplified)
  var trades = ['Welder','Pipe Fitter','QC Inspector','Electrician','Safety Officer',
                'HVAC','Mechanical','Civil','Structural','Instrumentation','Rigger',
                'Scaffolder','Painter','Blaster','Driver','Operator','Supervisor'];
  for (var j = 0; j < trades.length; j++) {
    if (new RegExp(trades[j],'i').test(text)) {
      result.trade = trades[j]; break;
    }
  }

  // Certifications
  var certPhrases = [];
  var certPatterns = [/\bCSWIP\b/i,/\bAPI\s*570\b/i,/\bAPI\s*510\b/i,/\bNEBOSH\b/i,
                      /\bIOSH\b/i,/\bCITB\b/i,/\bAWS\b/i,/\b6G\b/,/\bNDT\b/i,
                      /\bPTW\b/i,/\bHuet\b/i,/\bBOSIET\b/i,/\bOPITO\b/i];
  certPatterns.forEach(function(p){ var m=text.match(p); if(m) certPhrases.push(m[0]); });
  result.certifications = certPhrases.join(', ');

  // Summary of requirements (first 500 chars)
  result.requirements = text.slice(0, 500);

  return result;
}

function ensureJDSheet_(ss) {
  var sheet = ss.getSheetByName('_JD_Repository');
  if (!sheet) {
    sheet = ss.insertSheet('_JD_Repository');
    sheet.appendRow(JD_HEADERS);
    sheet.getRange(1,1,1,JD_HEADERS.length).setFontWeight('bold')
         .setBackground('#1e3a5f').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(8, 400); // Raw Text col
    sheet.setColumnWidth(9, 400); // Parsed Requirements col
  }
  return sheet;
}

function generateJDId_(ss) {
  var props   = PropertiesService.getScriptProperties();
  var counter = parseInt(props.getProperty('jd_id_counter')||'0') + 1;
  props.setProperty('jd_id_counter', String(counter));
  return 'AYE-JD-' + new Date().getFullYear() + '-' +
         String(counter).padStart(4, '0');
}

// ════════════════════════════════════════════════════════════
// S6 — UNIFIED CV UPLOAD
// ════════════════════════════════════════════════════════════

// POST — triggers the same KAI parse pipeline as Gmail intake
// body: { token, fileName, fileBase64, mimeType, senderName, senderEmail, recruiter }
//
// HOW IT WORKS:
//   1. Save the file to a staging Google Drive folder
//   2. Create a staged record in a _ManualUpload sheet
//   3. The main KAI pipeline processes _ManualUpload on next run
//   4. OR: we call the main GAS parseAndScore via a shared trigger
//
// NOTE: Cannot call main GAS functions directly (different project).
//       Instead: write to _ManualUpload staging sheet.
//       Main KAI GAS should check this sheet on each pipeline run.
//       (Add a check in main GAS S06 to process _ManualUpload rows)

var MANUAL_UPLOAD_HEADERS = [
  'Upload_ID','Upload_Timestamp','File_Name','Drive_File_ID','Drive_Link',
  'Sender_Name','Sender_Email','Uploader','Status','KAI_No','Parse_Result','Notes'
];

function uploadCV_(body) {
  var fileName   = String(body.fileName   ||'cv.pdf').trim();
  var fileB64    = String(body.fileBase64 ||'').trim();
  var mimeType   = String(body.mimeType   ||'application/pdf').trim();
  var senderName = String(body.senderName ||'').trim();
  var senderEmail= String(body.senderEmail||'').trim();
  var recruiter  = String(body.recruiter  ||'system').trim();

  if (!fileB64) return { ok: false, error: 'fileBase64 required' };

  try {
    // Decode base64 and save to Drive
    var bytes    = Utilities.base64Decode(fileB64);
    var blob     = Utilities.newBlob(bytes, mimeType, fileName);
    var folder   = getOrCreateUploadFolder_();
    var file     = folder.createFile(blob);
    var fileId   = file.getId();
    var driveUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Write to staging sheet
    var ss       = SpreadsheetApp.openById(SS_ID);
    var stgSheet = ensureUploadStagingSheet_(ss);
    var uploadId = 'UPL-' + Utilities.formatDate(new Date(),'Asia/Kolkata','yyyyMMdd-HHmmss');

    stgSheet.appendRow([
      uploadId,
      new Date(),
      fileName,
      fileId,
      driveUrl,
      senderName,
      senderEmail,
      recruiter,
      'PENDING_PARSE',  // Status — main GAS will update to PARSED when done
      '',               // KAI_No — filled by main GAS after parse
      '',               // Parse_Result
      ''                // Notes
    ]);

    return {
      ok:       true,
      uploadId: uploadId,
      driveUrl: driveUrl,
      fileId:   fileId,
      status:   'PENDING_PARSE',
      message:  'CV uploaded. KAI will parse and score within the next pipeline run (usually within 5 minutes).'
    };

  } catch(err) {
    return { ok: false, error: 'Upload failed: ' + err.message };
  }
}

function getOrCreateUploadFolder_() {
  var folderName = 'KAI Manual CV Uploads';
  var folders    = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function ensureUploadStagingSheet_(ss) {
  var sheet = ss.getSheetByName('_ManualUpload');
  if (!sheet) {
    sheet = ss.insertSheet('_ManualUpload');
    sheet.appendRow(MANUAL_UPLOAD_HEADERS);
    sheet.getRange(1,1,1,MANUAL_UPLOAD_HEADERS.length).setFontWeight('bold')
         .setBackground('#2d6a4f').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ════════════════════════════════════════════════════════════
// S7 — EMAIL WORKSPACE
// ════════════════════════════════════════════════════════════

// GET ?action=gmailInbox&tab=inbox&max=20
// tab options: inbox | sent | cv | jd | unread | today | week
function getGmailInbox_(params) {
  var tab = String(params.tab||'inbox').toLowerCase();
  var max = Math.min(50, parseInt(params.max||'20')||20);

  var query = buildGmailQuery_(tab);
  var threads;
  try {
    threads = GmailApp.search(query, 0, max);
  } catch(e) {
    return { ok: false, error: 'Gmail search failed: ' + e.message };
  }

  var results = threads.map(function(thread) {
    var msgs    = thread.getMessages();
    var last    = msgs[msgs.length - 1];
    var first   = msgs[0];
    var hasAtt  = msgs.some(function(m){ return m.getAttachments().length > 0; });
    var unread  = thread.isUnread();

    return {
      threadId:    thread.getId(),
      subject:     last.getSubject() || '(no subject)',
      from:        first.getFrom(),
      fromName:    extractNameFromHeader_(first.getFrom()),
      fromEmail:   extractEmailFromHeader_(first.getFrom()),
      date:        Utilities.formatDate(last.getDate(),'Asia/Kolkata','dd-MMM HH:mm'),
      dateRaw:     last.getDate().getTime(),
      snippet:     thread.getFirstMessageSubject() || last.getBody().slice(0,120).replace(/<[^>]+>/g,''),
      messageCount:msgs.length,
      hasAttachment:hasAtt,
      isUnread:    unread,
      labels:      thread.getLabels().map(function(l){ return l.getName(); }),
    };
  });

  return { ok: true, threads: results, count: results.length, tab: tab, query: query };
}

function buildGmailQuery_(tab) {
  var base = 'in:anywhere';
  var now  = new Date();

  if (tab === 'inbox')  return 'in:inbox';
  if (tab === 'sent')   return 'in:sent';
  if (tab === 'unread') return 'in:inbox is:unread';

  if (tab === 'today') {
    var today = Utilities.formatDate(now,'Asia/Kolkata','yyyy/MM/dd');
    return 'in:inbox after:' + today;
  }
  if (tab === 'week') {
    var weekAgo = new Date(now.getTime() - 7*24*60*60*1000);
    var wa = Utilities.formatDate(weekAgo,'Asia/Kolkata','yyyy/MM/dd');
    return 'in:inbox after:' + wa;
  }
  if (tab === 'cv') {
    return 'in:inbox (has:attachment (filename:pdf OR filename:doc OR filename:docx)) ' +
           '(subject:cv OR subject:resume OR subject:application OR subject:apply)';
  }
  if (tab === 'jd') {
    return 'in:inbox (subject:vacancy OR subject:requirement OR subject:position ' +
           'OR subject:manpower OR subject:urgently OR subject:hiring)';
  }
  return 'in:inbox';
}

// GET ?action=gmailThread&threadId=XXXX
function getGmailThread_(params) {
  var threadId = String(params.threadId||'').trim();
  if (!threadId) return { ok: false, error: 'threadId required' };

  var thread;
  try { thread = GmailApp.getThreadById(threadId); }
  catch(e) { return { ok: false, error: 'Thread not found: ' + e.message }; }

  var msgs = thread.getMessages();
  var messages = msgs.map(function(msg) {
    var atts = msg.getAttachments();
    return {
      messageId:   msg.getId(),
      from:        msg.getFrom(),
      fromName:    extractNameFromHeader_(msg.getFrom()),
      fromEmail:   extractEmailFromHeader_(msg.getFrom()),
      to:          msg.getTo(),
      date:        Utilities.formatDate(msg.getDate(),'Asia/Kolkata','dd-MMM-yyyy HH:mm'),
      subject:     msg.getSubject(),
      bodyHtml:    msg.getBody().slice(0, 5000),       // cap at 5K chars
      bodyPlain:   msg.getPlainBody().slice(0, 3000),
      attachments: atts.map(function(a) {
        return {
          name:     a.getName(),
          mimeType: a.getContentType(),
          size:     a.getSize(),
          // Base64 of attachment — only for small files (<500KB)
          data:     a.getSize() < 512000 ?
                      Utilities.base64Encode(a.getBytes()) : null,
          tooLarge: a.getSize() >= 512000
        };
      }),
    };
  });

  // Mark as read
  thread.markRead();

  return {
    ok:       true,
    threadId: threadId,
    subject:  msgs[0].getSubject(),
    messages: messages,
    count:    messages.length
  };
}

// POST — send reply to a thread
// body: { token, threadId, replyBody, recruiter }
function gmailReply_(body) {
  var threadId  = String(body.threadId ||'').trim();
  var replyText = String(body.replyBody||'').trim();
  var recruiter = String(body.recruiter||'').trim();

  if (!threadId)  return { ok: false, error: 'threadId required' };
  if (!replyText) return { ok: false, error: 'replyBody required' };

  try {
    var thread = GmailApp.getThreadById(threadId);
    var msgs   = thread.getMessages();
    var last   = msgs[msgs.length - 1];

    // Reply to last message in thread
    last.reply(replyText, {
      name:    'Al Yousuf Recruitment',
      replyTo: 'ai@alyousufent.com',
    });

    return { ok: true, replied: true, threadId: threadId };
  } catch(e) {
    return { ok: false, error: 'Reply failed: ' + e.message };
  }
}

// POST — convert email thread to Candidate or JD
// body: { token, threadId, convertTo, recruiter }
// convertTo: 'CANDIDATE' | 'JD'
function gmailConvert_(body) {
  var threadId  = String(body.threadId ||'').trim();
  var convertTo = String(body.convertTo||'').trim().toUpperCase();
  var recruiter = String(body.recruiter||'system').trim();

  if (!threadId)  return { ok: false, error: 'threadId required' };
  if (convertTo !== 'CANDIDATE' && convertTo !== 'JD')
    return { ok: false, error: 'convertTo must be CANDIDATE or JD' };

  try {
    var thread = GmailApp.getThreadById(threadId);
    var msgs   = thread.getMessages();
    var first  = msgs[0];
    var body_  = first.getPlainBody() || '';
    var from_  = first.getFrom();

    if (convertTo === 'JD') {
      // Create JD from email body
      var result = createJD_({
        token:      body.token,
        source:     'EMAIL',
        client:     extractNameFromHeader_(from_),
        rawText:    body_.slice(0, 3000),
        recruiter:  recruiter,
        notes:      'Converted from email thread: ' + threadId
      });
      return { ok: true, convertTo: 'JD', jdId: result.jdId, result: result };
    }

    if (convertTo === 'CANDIDATE') {
      // Check if there's a CV attachment
      var atts = first.getAttachments();
      var cvAtt = null;
      atts.forEach(function(a) {
        var n = a.getName().toLowerCase();
        if (!cvAtt && (n.endsWith('.pdf')||n.endsWith('.doc')||n.endsWith('.docx')))
          cvAtt = a;
      });

      if (!cvAtt) return { ok: false, error: 'No CV attachment found in this email' };

      // Upload the CV through the unified pipeline
      var uploadResult = uploadCV_({
        token:       body.token,
        fileName:    cvAtt.getName(),
        fileBase64:  Utilities.base64Encode(cvAtt.getBytes()),
        mimeType:    cvAtt.getContentType(),
        senderName:  extractNameFromHeader_(from_),
        senderEmail: extractEmailFromHeader_(from_),
        recruiter:   recruiter
      });
      return { ok: true, convertTo: 'CANDIDATE', uploadResult: uploadResult };
    }

  } catch(e) {
    return { ok: false, error: 'Convert failed: ' + e.message };
  }
}

// ── Email helpers ─────────────────────────────────────────────
function extractNameFromHeader_(header) {
  var m = String(header||'').match(/^"?([^"<]+)"?\s*</);
  return m ? m[1].trim() : String(header||'').split('@')[0];
}
function extractEmailFromHeader_(header) {
  var m = String(header||'').match(/<([^>]+)>/);
  return m ? m[1].toLowerCase() : String(header||'').toLowerCase();
}

// ════════════════════════════════════════════════════════════
// S8 — SETUP (run once from GAS editor)
// ════════════════════════════════════════════════════════════

// Run this ONCE from the GAS editor to create all new sheets
function setupAllNewSheets() {
  var ss = SpreadsheetApp.openById(SS_ID);

  // _ActivityLog
  var act = ensureActivitySheet_(ss);
  Logger.log('_ActivityLog: ' + (act ? 'OK' : 'FAILED'));

  // _JD_Repository
  var jd = ensureJDSheet_(ss);
  Logger.log('_JD_Repository: ' + (jd ? 'OK' : 'FAILED'));

  // _ManualUpload
  var mu = ensureUploadStagingSheet_(ss);
  Logger.log('_ManualUpload: ' + (mu ? 'OK' : 'FAILED'));

  // Ensure _Requirements has enough columns for new fields
  var req = ss.getSheetByName('_Requirements');
  if (req) {
    var lc = req.getLastColumn();
    if (lc < 23) {
      // Add missing headers
      if (lc < 21) req.getRange(1, 21).setValue('JD_ID');
      if (lc < 22) req.getRange(1, 22).setValue('Start_Date');
      if (lc < 23) req.getRange(1, 23).setValue('End_Date');
      Logger.log('_Requirements: extended to 23 columns');
    } else {
      Logger.log('_Requirements: already has ' + lc + ' columns');
    }
  }

  // Initialize ID counters if not set
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('jd_id_counter'))  props.setProperty('jd_id_counter',  '0');
  if (!props.getProperty('req_id_counter')) props.setProperty('req_id_counter', '0');

  Logger.log('Setup complete.');
}

// Quick test function — run from editor to verify endpoints
function testBridgeEndpoints() {
  Logger.log('=== KAI Bridge Endpoint Test ===');

  var ss = SpreadsheetApp.openById(SS_ID);

  // Test candidates
  var cands = getCandidates_({});
  Logger.log('Candidates: ' + (cands.ok ? cands.total + ' total' : 'FAILED: ' + cands.error));

  // Test requirements
  var reqs = getRequirementsEnhanced_();
  Logger.log('Requirements: ' + (reqs.ok ? reqs.count + ' found' : 'FAILED: ' + reqs.error));

  // Test JDs
  var jds = getJDs_({});
  Logger.log('JDs: ' + (jds.ok ? jds.count + ' found' : 'FAILED: ' + jds.error));

  // Test activity log
  var log = getActivityLog_({ rowIndex: '2' });
  Logger.log('ActivityLog: ' + (log.ok ? log.count + ' entries for row 2' : 'FAILED: ' + log.error));

  Logger.log('=== Test complete ===');
}
