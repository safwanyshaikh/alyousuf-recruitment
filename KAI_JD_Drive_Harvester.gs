// ════════════════════════════════════════════════════════════════════════════════
// KAI JD DRIVE HARVESTER  —  Daily JD intake from the overseas JD Drive folder
// ════════════════════════════════════════════════════════════════════════════════
//
// PURPOSE
//   A Google Drive folder receives overseas JDs daily (trial client: Al Yousuf
//   Enterprises, also used for INTERNAL LEARNING). This module is KAI's daily
//   feeding tube: every new JD in that folder is parsed and injected into the
//   intelligence layer so matches + decisions across KAI OS keep getting sharper.
//
// THE LOOP IT CLOSES
//   Drive JD  →  parse (Gemini multimodal)  →  _JD_Repository (immortal)
//             →  _KAI_Knowledge (T14 capture)  →  learnTaxonomyWeekly (mutation)
//             →  richer taxonomy  →  better nlSearch matches.  Self-feeding.
//
// SOURCE FOLDER (overseas JDs, updated daily):
//   https://drive.google.com/drive/folders/1Il5PpFBYBEHZ8G8uSajAwFeWhFHFu7dm
//   folderId = 1Il5PpFBYBEHZ8G8uSajAwFeWhFHFu7dm
//
// DESIGN
//   • LEARNING mode (default): parse → _JD_Repository + _KAI_Knowledge only.
//     Does NOT create live _Requirements rows — keeps real client dashboards clean
//     while still feeding the brain every single day.
//   • REQUIREMENT mode (flag): also creates real requirements via the existing
//     bulkCreateRequirementsFromJDs_ pipeline (for when Al Yousuf goes live).
//   • Processed files are moved to a "_KAI_Processed" subfolder so they are never
//     parsed twice. Originals are never deleted (audit-safe).
//   • No ScriptLock, disjoint from the email pipeline — never blocks CV intake.
//   • Self-contained multimodal JD parse (reads PDF/image/Doc directly via Gemini)
//     so it does not depend on OCR / Advanced Drive Service.
//
// SaaS-READY: folder + mode live in JD_DRIVE_CONFIG. Multi-tenant later = one
//   folderId per tenant in a registry. Marked  // <SaaS SEAM>.
//
// ════════════════════════════════════════════════════════════════════════════════


var JD_DRIVE_CONFIG = {
  version: 'jdHarvester-v1.0',

  // <SaaS SEAM> single folder today; per-tenant folder map later.
  folderId: '1Il5PpFBYBEHZ8G8uSajAwFeWhFHFu7dm',

  processedSubfolder: '_KAI_Processed',   // files moved here after ingestion
  errorSubfolder:     '_KAI_Error',       // unparseable files moved here

  // LEARNING = feed intelligence only. REQUIREMENT = also create live requirements.
  mode: 'LEARNING',

  // Used only in REQUIREMENT mode (the trial client identity).
  learningClientName: 'Al Yousuf Enterprises',
  learningClientId:   'AYE-TRIAL',
  learningCampaignId: 'AYE-LEARNING',
  learningCampaignName: 'Overseas JD Learning Feed',

  maxFilesPerRun: 30,     // throttle so a 100-JD dump spreads over a few daily runs
  geminiModel: 'gemini-2.5-flash-lite'
};


// ════════════════════════════════════════════════════════════════════════════════
// PUBLIC TRIGGER ENTRY  (runs daily)
// ════════════════════════════════════════════════════════════════════════════════
function harvestDriveJDsDaily() {
  var report = { runDate: new Date(), scanned: 0, learned: 0, requirements: 0,
                 skipped: 0, failed: 0, files: [] };

  var folder;
  try {
    folder = DriveApp.getFolderById(JD_DRIVE_CONFIG.folderId);
  } catch (e) {
    Logger.log('JD Harvester: cannot open folder ' + JD_DRIVE_CONFIG.folderId + ' — ' + e.message);
    return { ok: false, error: 'Folder not accessible: ' + e.message };
  }

  var processedFolder = jdGetOrCreateSubfolder_(folder, JD_DRIVE_CONFIG.processedSubfolder);
  var errorFolder     = jdGetOrCreateSubfolder_(folder, JD_DRIVE_CONFIG.errorSubfolder);
  var ss = SpreadsheetApp.openById(SS_ID);

  var files = folder.getFiles();
  var reqBatch = [];   // for REQUIREMENT mode

  while (files.hasNext() && report.scanned < JD_DRIVE_CONFIG.maxFilesPerRun) {
    var file = files.next();
    var name = file.getName();
    var mime = file.getMimeType();

    // Skip sub-things and non-document files.
    if (mime === MimeType.FOLDER) continue;
    if (!jdIsParseableType_(mime, name)) { report.skipped++; continue; }

    report.scanned++;

    try {
      // 1. Extract a PDF-equivalent blob + base64 for multimodal parse.
      var blob = jdToParseableBlob_(file, mime);
      if (!blob) {
        jdMoveFile_(file, errorFolder);
        report.failed++;
        report.files.push({ file: name, status: 'UNREADABLE' });
        continue;
      }

      // 2. Parse JD with Gemini multimodal → structured JD JSON.
      var parsed = jdParseFileGemini_(blob);
      if (!parsed || !parsed.trade) {
        jdMoveFile_(file, errorFolder);
        report.failed++;
        report.files.push({ file: name, status: 'PARSE_FAILED' });
        continue;
      }

      // 3. Store in _JD_Repository (immortal) — header-driven, defensive.
      var jdId = jdStoreInRepository_(ss, file, parsed);

      // 4. Feed the learning brain — _KAI_Knowledge (T14 capture).
      try {
        if (typeof captureJDIntelligenceT14_ === 'function') {
          captureJDIntelligenceT14_(ss, jdId, JD_DRIVE_CONFIG.learningClientName,
            parsed.trade, parsed.country || '', jdParsedToText_(parsed, name), null);
        }
      } catch (ke) { Logger.log('captureJDIntelligenceT14_ (harvester): ' + ke.message); }
      report.learned++;

      // 5. REQUIREMENT mode — also queue for the live requirement pipeline.
      if (JD_DRIVE_CONFIG.mode === 'REQUIREMENT') {
        reqBatch.push({ fileName: name, content: jdParsedToText_(parsed, name) });
      }

      // 6. Move original out of the inbox so it is never parsed twice.
      jdMoveFile_(file, processedFolder);
      report.files.push({ file: name, status: 'LEARNED', jdId: jdId, trade: parsed.trade,
                          country: parsed.country || '' });

    } catch (e) {
      Logger.log('JD Harvester error [' + name + ']: ' + e.message);
      try { jdMoveFile_(file, errorFolder); } catch (me) {}
      report.failed++;
      report.files.push({ file: name, status: 'ERROR', reason: e.message });
    }

    Utilities.sleep(800); // gentle throttle
  }

  // REQUIREMENT mode — run the existing bulk pipeline on the parsed batch.
  if (JD_DRIVE_CONFIG.mode === 'REQUIREMENT' && reqBatch.length &&
      typeof bulkCreateRequirementsFromJDs_ === 'function') {
    try {
      var bulk = bulkCreateRequirementsFromJDs_({
        jds: reqBatch,
        clientId:     JD_DRIVE_CONFIG.learningClientId,
        clientName:   JD_DRIVE_CONFIG.learningClientName,
        campaignId:   JD_DRIVE_CONFIG.learningCampaignId,
        campaignName: JD_DRIVE_CONFIG.learningCampaignName,
        sourcedBy:    'jdHarvester'
      });
      report.requirements = (bulk && bulk.created) || 0;
    } catch (be) { Logger.log('bulkCreateRequirementsFromJDs_ (harvester): ' + be.message); }
  }

  jdAppendHarvestLog_(ss, report);
  Logger.log('JD Harvester: scanned=' + report.scanned + ' learned=' + report.learned +
             ' requirements=' + report.requirements + ' failed=' + report.failed);
  return { ok: true, report: report };
}


// ════════════════════════════════════════════════════════════════════════════════
// MULTIMODAL JD PARSE  (PDF / image / Doc → structured JSON, no OCR service needed)
// ════════════════════════════════════════════════════════════════════════════════
function jdParseFileGemini_(blob) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) { Logger.log('JD Harvester: no GEMINI_API_KEY'); return null; }

  var prompt =
    'You are a GCC overseas recruitment specialist. Read the attached Job Description ' +
    'file and extract structured data. Return ONLY valid JSON (no markdown), exact keys:\n' +
    '{\n' +
    '  "trade": "normalized trade / job title",\n' +
    '  "industry": "Oil & Gas / Construction / Power & Utilities / Manufacturing / Shipping & Marine / Cement, Mining & Steel / Other",\n' +
    '  "sector": "sub-sector",\n' +
    '  "department": "Mechanical / Electrical / Instrumentation / Civil / Welding / QA-QC / HSE / Maintenance / Operations / Logistics",\n' +
    '  "specialization": "specific specialization",\n' +
    '  "qty": <integer vacancies, default 1>,\n' +
    '  "expMin": <integer>, "expMax": <integer>,\n' +
    '  "minAge": <integer, else 18>, "maxAge": <integer, else 45>,\n' +
    '  "salaryMin": <integer, 0 if none>, "salaryMax": <integer, 0 if none>,\n' +
    '  "salaryCurrency": "SAR / AED / QAR / KWD / USD",\n' +
    '  "country": "deployment country", "city": "deployment city",\n' +
    '  "nationality": "preferred nationality if stated else empty",\n' +
    '  "certifications": "required certs (6G, CSWIP 3.1, NEBOSH, Saudi License, ...)",\n' +
    '  "educationRequired": "education requirement if stated",\n' +
    '  "urgency": "Urgent or Normal",\n' +
    '  "keySkills": "comma-separated key technical skills"\n' +
    '}';

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
            JD_DRIVE_CONFIG.geminiModel + ':generateContent?key=' + apiKey;

  try {
    var resp = UrlFetchApp.fetch(url, {
      method: 'POST', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: blob.getContentType(),
                           data: Utilities.base64Encode(blob.getBytes()) } }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 700 }
      })
    });
    var json = JSON.parse(resp.getContentText());
    var cand = (json.candidates || [])[0];
    if (!cand || !cand.content) return null;
    var text = cand.content.parts[0].text.trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    var parsed = JSON.parse(text);
    if (typeof scalarizeParsedCV_ === 'function') parsed = scalarizeParsedCV_(parsed);
    return parsed;
  } catch (e) {
    Logger.log('jdParseFileGemini_ error: ' + e.message);
    return null;
  }
}


// ════════════════════════════════════════════════════════════════════════════════
// _JD_Repository writer (defensive, header-driven — tolerant of existing schema)
// ════════════════════════════════════════════════════════════════════════════════
function jdStoreInRepository_(ss, file, parsed) {
  var jdId = 'AYE-JD-DRIVE-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd-HHmmss') +
             '-' + Math.floor(Math.random() * 1000);
  var sheet = ss.getSheetByName('_JD_Repository');
  if (!sheet) {
    // Reuse master constant if present, else inline the LOCKED field list.
    var headers = (typeof JD_HEADERS !== 'undefined') ? JD_HEADERS : [
      'jdId','campaignId','clientId','clientName','industry','sector','department',
      'trade','specialization','requiredQty','salaryMin','salaryMax','country','city',
      'experienceMin','experienceMax','educationRequired','certifications','interviewMode',
      'interviewDate','interviewCities','originalJDText','parsedJDJSON','createdBy',
      'createdAt','reqId','status'
    ];
    sheet = ss.insertSheet('_JD_Repository');
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }

  var H = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
              .map(function (h) { return String(h).trim(); });
  var driveLink = 'https://drive.google.com/file/d/' + file.getId() + '/view';
  var map = {
    jdId: jdId, campaignId: JD_DRIVE_CONFIG.learningCampaignId,
    clientId: JD_DRIVE_CONFIG.learningClientId, clientName: JD_DRIVE_CONFIG.learningClientName,
    industry: parsed.industry || '', sector: parsed.sector || '', department: parsed.department || '',
    trade: parsed.trade || '', specialization: parsed.specialization || '',
    requiredQty: parsed.qty || 1, salaryMin: parsed.salaryMin || 0, salaryMax: parsed.salaryMax || 0,
    country: parsed.country || '', city: parsed.city || '',
    experienceMin: parsed.expMin || 0, experienceMax: parsed.expMax || 0,
    educationRequired: parsed.educationRequired || '', certifications: parsed.certifications || '',
    interviewMode: '', interviewDate: '', interviewCities: '',
    originalJDText: 'Source file: ' + file.getName() + ' | ' + driveLink,
    parsedJDJSON: JSON.stringify(parsed), createdBy: 'jdHarvester',
    createdAt: new Date(), reqId: '', status: 'LEARNED'
  };

  var row = H.map(function (col) { return (col in map) ? map[col] : ''; });
  sheet.appendRow(row);
  return jdId;
}


// ════════════════════════════════════════════════════════════════════════════════
// FILE HELPERS
// ════════════════════════════════════════════════════════════════════════════════

// Which Drive file types are worth parsing as a JD.
function jdIsParseableType_(mime, name) {
  if (mime === 'application/pdf') return true;
  if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg') return true;
  if (mime === 'application/vnd.google-apps.document') return true;
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true; // .docx
  if (mime === 'text/plain') return true;
  // fallback by extension
  return /\.(pdf|png|jpe?g|docx?|txt)$/i.test(String(name || ''));
}

// Returns a Gemini-readable blob (PDF or image). Converts Docs to PDF.
function jdToParseableBlob_(file, mime) {
  try {
    if (mime === 'application/pdf' || /^image\//.test(mime)) return file.getBlob();
    if (mime === 'application/vnd.google-apps.document') return file.getAs('application/pdf');
    if (mime === 'text/plain') {
      // wrap text as a blob Gemini can read inline
      return Utilities.newBlob(file.getBlob().getDataAsString(), 'text/plain', file.getName());
    }
    // .docx and others — try PDF conversion via Drive; if not possible, raw blob.
    try { return file.getAs('application/pdf'); } catch (e) { return file.getBlob(); }
  } catch (e) {
    Logger.log('jdToParseableBlob_ error: ' + e.message);
    return null;
  }
}

function jdGetOrCreateSubfolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// Move a file into target folder (add to target, remove from all current parents).
function jdMoveFile_(file, target) {
  try {
    target.addFile(file);
    var parents = file.getParents();
    while (parents.hasNext()) {
      var p = parents.next();
      if (p.getId() !== target.getId()) p.removeFile(file);
    }
  } catch (e) { Logger.log('jdMoveFile_ error: ' + e.message); }
}

// Compact text form of a parsed JD (for _KAI_Knowledge raw extract + repository).
function jdParsedToText_(parsed, fileName) {
  return [
    'JD: ' + (fileName || ''),
    'Trade: ' + (parsed.trade || ''),
    'Industry: ' + (parsed.industry || '') + ' / ' + (parsed.sector || ''),
    'Department: ' + (parsed.department || ''),
    'Specialization: ' + (parsed.specialization || ''),
    'Country: ' + (parsed.country || '') + ' ' + (parsed.city || ''),
    'Qty: ' + (parsed.qty || 1),
    'Experience: ' + (parsed.expMin || 0) + '-' + (parsed.expMax || 0) + ' yrs',
    'Nationality: ' + (parsed.nationality || ''),
    'Certifications: ' + (parsed.certifications || ''),
    'Key Skills: ' + (parsed.keySkills || '')
  ].join('\n');
}

function jdAppendHarvestLog_(ss, report) {
  try {
    var s = ss.getSheetByName('_JD_HarvestLog');
    if (!s) {
      s = ss.insertSheet('_JD_HarvestLog');
      s.appendRow(['RunDate','Mode','Scanned','Learned','Requirements','Skipped','Failed','Detail']);
      s.setFrozenRows(1);
    }
    s.appendRow([report.runDate, JD_DRIVE_CONFIG.mode, report.scanned, report.learned,
                 report.requirements, report.skipped, report.failed,
                 JSON.stringify(report.files).slice(0, 4000)]);
  } catch (e) { Logger.log('jdAppendHarvestLog_ error: ' + e.message); }
}


// ════════════════════════════════════════════════════════════════════════════════
// TEST + TRIGGER INSTALL  (run from the GAS editor dropdown)
// ════════════════════════════════════════════════════════════════════════════════

// Dry check: confirms the folder is reachable and lists what WOULD be parsed.
function testJDHarvestFolder() {
  try {
    var folder = DriveApp.getFolderById(JD_DRIVE_CONFIG.folderId);
    Logger.log('Folder OK: ' + folder.getName());
    var files = folder.getFiles(), n = 0, parseable = 0;
    while (files.hasNext() && n < 50) {
      var f = files.next(); n++;
      var ok = jdIsParseableType_(f.getMimeType(), f.getName());
      if (ok) parseable++;
      Logger.log((ok ? '[JD] ' : '[skip] ') + f.getName() + '  (' + f.getMimeType() + ')');
    }
    Logger.log('Total listed: ' + n + ' | parseable JDs: ' + parseable);
  } catch (e) {
    Logger.log('Folder NOT accessible: ' + e.message +
               '\nMake sure the GAS account has access to folder ' + JD_DRIVE_CONFIG.folderId);
  }
}

// Run ONCE to install the daily harvest trigger.
function installJDHarvestTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++)
    if (existing[i].getHandlerFunction() === 'harvestDriveJDsDaily') {
      Logger.log('JD harvest trigger already installed.'); return;
    }
  ScriptApp.newTrigger('harvestDriveJDsDaily').timeBased().everyDays(1).atHour(7).create();
  Logger.log('harvestDriveJDsDaily trigger installed (daily, 07:00).');
}

function removeJDHarvestTrigger() {
  var t = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < t.length; i++)
    if (t[i].getHandlerFunction() === 'harvestDriveJDsDaily') { ScriptApp.deleteTrigger(t[i]); n++; }
  Logger.log('Removed ' + n + ' harvestDriveJDsDaily trigger(s).');
}
