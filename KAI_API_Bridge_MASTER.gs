// ╔══════════════════════════════════════════════════════════════════╗
// ║        KAI API BRIDGE — MASTER FILE (Complete)                  ║
// ║        Project: KAI-API-Bridge (standalone GAS project)         ║
// ║        Account: ai@alyousufent.com                              ║
// ║        Spreadsheet: 101iCo5lPpGOZc5CGGZA_kaYugbPHzRXQstl3WsRKBRE ║
// ║                                                                  ║
// ║  HOW TO USE:                                                     ║
// ║  1. Open script.google.com → KAI-API-Bridge project             ║
// ║  2. Select ALL in Code.gs (Ctrl+A) → Delete                     ║
// ║  3. Paste this ENTIRE file                                       ║
// ║  4. Save (Ctrl+S)                                               ║
// ║  5. Run setupAllNewSheets() once                                 ║
// ║  6. Run testBridgeEndpoints() to verify                         ║
// ║  7. Deploy → Manage deployments → pencil → New version → Deploy  ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── MASTER CONFIG ────────────────────────────────────────────────────
var SS_ID = '101iCo5lPpGOZc5CGGZA_kaYugbPHzRXQstl3WsRKBRE';

// ── COLUMN MAP (1-based, matches Code.gs CONFIG.inputColumns + extCol + extCol2)
var COL = {
  // Standard cols 1–24
  stage:1, applicationDate:2, nationality:3, name:4, mobile:5, email:6,
  education:7, positionApplied:8, trade:9, industry:10,
  experience:11, gulfExp:12, dob:13, age:14,
  verdict:15, flags:16, score:17, scoreBreakdown:18,
  recommendedRoles:19, kaiAssessment:20, recruiterAction:21,
  cvLink:22, notes:23, active:24,
  // extCol v2 — cols 25–38
  kaiNo:25, currentLocation:26, empStatus:27, candidateState:28,
  mobility:29, passportExpiry:30, ecrStatus:31, noticeDays:32,
  medicalStatus:33, deployScore:34, missingFields:35,
  lastContact:36, reqMatch:37, timeline:38,
  // extCol2 v282 — cols 39–42
  educationEnum:39, techReview:40, reviewedBy:41, top3Positions:42
};

// Valid stage values
var VALID_STAGES = [
  'Pending action','New','Under Review','Shortlisted',
  'Client Sent','Client Selected','Offer Issued',
  'Visa Processing','Deployed','On Hold','Rejected','HOLD'
];

var VALID_SLOT_STATUSES = [
  'ADDED','SHORTLISTED','SUBMITTED','INTERVIEWED',
  'SELECTED','REJECTED','DEPLOYED'
];

// ════════════════════════════════════════════════════════════════════
// SECTION 1 — ROUTING (doGet + doPost)
// ════════════════════════════════════════════════════════════════════

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = params.action || 'candidates';
  var token  = params.token  || '';
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

    if      (action === 'candidates')       out = JSON.stringify(getCandidates_(params));
    else if (action === 'candidate')        out = JSON.stringify(getSingleCandidate_(params));
    else if (action === 'search')           out = JSON.stringify(globalSearch_(params));
    else if (action === 'requirements')     out = JSON.stringify(getRequirementsEnhanced_());
    else if (action === 'match')            out = JSON.stringify(getMatchedCandidates_(params));
    else if (action === 'metrics')          out = JSON.stringify(getMetrics_());
    else if (action === 'sac')              out = JSON.stringify(getSacPerformance_());
    else if (action === 'activityLog')      out = JSON.stringify(getActivityLog_(params));
    else if (action === 'jds')              out = JSON.stringify(getJDs_(params));
    else if (action === 'jdDetail')         out = JSON.stringify(getJDDetail_(params));
    else if (action === 'gmailInbox')       out = JSON.stringify(getGmailInbox_(params));
    else if (action === 'gmailThread')      out = JSON.stringify(getGmailThread_(params));
    else if (action === 'slots')            out = JSON.stringify(getCandidateSlots_(params));
    else if (action === 'clients')          out = JSON.stringify(getClients_(params));
    else if (action === 'locationAudit')    out = JSON.stringify(getLocationAudit_());
    else out = JSON.stringify({ ok: false, error: 'Unknown action: ' + action });

  } catch(err) {
    out = JSON.stringify({ ok: false, error: err.message, stack: err.stack });
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var out;
  try {
    var body = {};
    try { body = JSON.parse(e.postData.contents); } catch(x) {}
    var params = e && e.parameter ? e.parameter : {};
    var action = body.action || params.action || '';
    var token  = body.token  || params.token  || '';

    if (!isTokenValid_(token)) {
      out = JSON.stringify({ ok: false, error: 'Unauthorized' });
      return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
    }

    if      (action === 'updateStage')       out = JSON.stringify(updateStage_(body));
    else if (action === 'saveNote')          out = JSON.stringify(saveNote_(body));
    else if (action === 'createRequirement')    out = JSON.stringify(createRequirement_(body));
    else if (action === 'updateRequirement')    out = JSON.stringify(updateRequirement_(body));
    else if (action === 'deleteRequirement')    out = JSON.stringify(deleteRequirement_(body));
    else if (action === 'duplicateRequirement') out = JSON.stringify(duplicateRequirement_(body));
    else if (action === 'createJD')          out = JSON.stringify(createJD_(body));
    else if (action === 'uploadCV')          out = JSON.stringify(uploadCV_(body));
    else if (action === 'gmailReply')        out = JSON.stringify(gmailReply_(body));
    else if (action === 'gmailConvert')      out = JSON.stringify(gmailConvert_(body));
    else if (action === 'addSlot')           out = JSON.stringify(addCandidateToSlot_(body));
    else if (action === 'updateSlot')        out = JSON.stringify(updateSlotStatus_(body));
    else if (action === 'createClient')      out = JSON.stringify(createClient_(body));
    else out = JSON.stringify({ ok: false, error: 'Unknown POST action: ' + action });

  } catch(err) {
    out = JSON.stringify({ ok: false, error: err.message });
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════════════════════════════════
// SECTION 2 — AUTH (Login + Token Validation)
// ════════════════════════════════════════════════════════════════════

function handleLogin_(email, passwordHash) {
  if (!email || !passwordHash) return { ok: false, msg: 'Email and password required' };
  try {
    var ss    = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('_LoginSystem');
    if (!sheet) return { ok: false, msg: 'Login system not set up.' };

    var data = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow()-1), 8).getValues();
    for (var i = 0; i < data.length; i++) {
      var row      = data[i];
      var rowEmail = String(row[0]||'').trim().toLowerCase();
      var rowHash  = String(row[1]||'').trim().toLowerCase();
      var rowRole  = String(row[2]||'recruiter').trim();
      var rowName  = String(row[3]||'').trim();

      if (rowEmail !== email.trim().toLowerCase()) continue;
      if (rowHash  !== passwordHash.trim().toLowerCase()) {
        return { ok: false, msg: 'Incorrect password.' };
      }

      var token   = Utilities.getUuid();
      var expiry  = new Date(Date.now() + 24*60*60*1000);
      var expiryStr = expiry.toISOString();

      sheet.getRange(i + 2, 6).setValue(token);
      sheet.getRange(i + 2, 7).setValue(expiryStr);

      CacheService.getScriptCache().put('KAI_TOK_' + token, '1', 82800);

      return { ok: true, token: token, email: rowEmail, role: rowRole,
               name: rowName, expiry: expiryStr };
    }
    return { ok: false, msg: 'Email not found.' };
  } catch(e) {
    return { ok: false, msg: 'Login error: ' + e.message };
  }
}

function isTokenValid_(token) {
  if (!token) return false;
  try {
    var cache = CacheService.getScriptCache().get('KAI_TOK_' + token);
    if (cache) return true;
    var ss    = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('_LoginSystem');
    if (!sheet || sheet.getLastRow() < 2) return false;
    var data  = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][5]||'').trim() === token) {
        return new Date(data[i][6]) > new Date();
      }
    }
    return false;
  } catch(e) { return false; }
}

// ════════════════════════════════════════════════════════════════════
// SECTION 3 — CANDIDATE HELPERS
// ════════════════════════════════════════════════════════════════════

function getConfidenceTier_(score) {
  if (score >= 75) return 'STRONG';
  if (score >= 55) return 'GOOD';
  if (score >= 35) return 'POSSIBLE';
  return 'REVIEW';
}

function classifyGCCMobility_(gulfExpText, currentLocationText) {
  var text = (String(gulfExpText||'') + ' ' + String(currentLocationText||'')).toLowerCase();
  if (!text.trim() || text.trim() === 'na' || text.trim() === 'nil')
    return 'INDIA_AVAILABLE';
  var isCurrent = /current|present|working|employed|ongoing|till date|till now/i.test(gulfExpText);
  if (/saudi|ksa|riyadh|jeddah|dammam|jubail|yanbu|aramco|sabic/i.test(text) && isCurrent) return 'SAUDI_LOCAL';
  if (/\buae\b|dubai|abu dhabi|sharjah|ajman|adnoc/i.test(text) && isCurrent) return 'UAE_LOCAL';
  if (/qatar|doha|qatarenergy/i.test(text) && isCurrent) return 'QATAR_LOCAL';
  if (/kuwait/i.test(text) && isCurrent) return 'KUWAIT_LOCAL';
  if (/bahrain|manama/i.test(text) && isCurrent) return 'BAHRAIN_LOCAL';
  if (/oman|muscat|sohar|salalah|pdo/i.test(text) && isCurrent) return 'OMAN_LOCAL';
  if (/saudi|ksa|uae|dubai|qatar|kuwait|bahrain|oman|gcc|gulf/i.test(text)) return 'GCC_TRANSFERABLE';
  return 'INDIA_AVAILABLE';
}

function parseEducation_(rawEdu) {
  var s = String(rawEdu||'').trim();
  if (!s) return { level:'', subject:'' };
  var levelMap = [
    { re:/\bphd\b|\bdoctorate\b/i,              level:'PhD' },
    { re:/\bmaster|mba|m\.?tech|m\.?e\b/i,      level:'Masters' },
    { re:/\bdegree|bachelor|b\.?tech|b\.?e\b|b\.?sc/i, level:'Degree' },
    { re:/\bdiploma\b/i,                          level:'Diploma' },
    { re:/\biti\b|\bcertificate\b|\bcertification\b/i, level:'ITI / Certificate' },
    { re:/\bhigh school|10\+2|12th|intermediate/i,level:'High School' },
    { re:/\bmatriculation|ssc|10th/i,             level:'Matriculation' },
  ];
  var level = '';
  for (var i = 0; i < levelMap.length; i++) {
    if (levelMap[i].re.test(s)) { level = levelMap[i].level; break; }
  }
  var subject = s
    .replace(/degree in|diploma in|b\.?tech in|b\.?e in|bachelor of|master of|iti in/gi,'')
    .replace(/\bpassed\b|\bcompleted\b/gi,'').trim()
    .replace(/^[,\s]+|[,\s]+$/g,'');
  if (!level) return { level:'', subject: s.slice(0,60) };
  return { level: level, subject: subject.slice(0,80) };
}

function extractPassportNo_(kaiText, notesText) {
  var text = String(kaiText||'') + ' ' + String(notesText||'');
  var m = text.match(/\b([A-Z]\d{7})\b/);
  return m ? m[1] : '';
}

function parseTop3Positions_(raw) {
  if (!raw) return { first:'', rest:[], count:0, full:[] };
  var parts = String(raw).split(/[,\n|]/).map(function(p){ return p.trim(); }).filter(Boolean);
  return { first: parts[0]||'', rest: parts.slice(1), count: parts.length, full: parts };
}

// Compute display stage from raw stage + verdict (handles "Pending action" / blank)
function computeDisplayStage_(stageRaw, verdict) {
  var PENDING = (!stageRaw || stageRaw === 'Pending action');
  if (!PENDING) return stageRaw;
  var v = String(verdict||'').toUpperCase();
  if (v === 'SHORTLISTED')  return 'Shortlisted';
  if (v === 'NEEDS_REVIEW') return 'Review';
  if (v === 'NEEDS_CALL')   return 'Needs Call';
  if (v === 'SELECTED')     return 'Selected';
  if (v === 'REJECTED')     return 'Rejected';
  return 'New';
}

// ════════════════════════════════════════════════════════════════════
// SECTION 3B — INTERNAL: Read ALL active candidates (no pagination cap)
// Used by getMetrics_, getSacPerformance_, getMatchedCandidates_
// Do NOT call this from the public API directly — use getCandidates_ for paginated reads
// ════════════════════════════════════════════════════════════════════

function getAllCandidatesRaw_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1,
             Math.min(sheet.getLastColumn(), 42)).getValues();
  var records = [];

  data.forEach(function(row, i) {
    var active = String(row[COL.active-1]||'').toUpperCase().trim();
    if (active === 'SUPERSEDED' || active === 'ARCHIVED') return;
    var name  = String(row[COL.name-1]||'').trim();
    var email = String(row[COL.email-1]||'').trim();
    if (!name && !email) return;

    var score    = parseInt(row[COL.score-1])   || 0;
    var stageRaw = String(row[COL.stage-1]||'').trim();
    var verdict  = String(row[COL.verdict-1]||'').trim().toUpperCase();
    var gulfExp  = String(row[COL.gulfExp-1]||'').trim();
    var loc      = String(row[COL.currentLocation-1]||'').trim();
    var kaiText  = String(row[COL.kaiAssessment-1]||'').trim();
    var edu      = parseEducation_(String(row[COL.education-1]||''));
    var top3     = parseTop3Positions_(String(row[COL.top3Positions-1]||''));
    var appDt    = row[COL.applicationDate-1];
    var ppExpR   = row[COL.passportExpiry-1];
    var ppExp    = ppExpR instanceof Date ? ppExpR : null;
    var ppStat   = 'Unknown';
    if (ppExp && !isNaN(ppExp)) {
      var mLeft = (ppExp - new Date()) / (1000*60*60*24*30);
      ppStat = mLeft > 6 ? 'Valid' : (mLeft > 0 ? '<6mo' : 'Expired');
    }

    records.push({
      rowIndex:         i + 2,
      kaiNo:            String(row[COL.kaiNo-1]||'').trim(),
      name:             name,
      nationality:      String(row[COL.nationality-1]||'').trim(),
      age:              parseInt(row[COL.age-1]) || 0,
      stage:            computeDisplayStage_(stageRaw, verdict),
      trade:            String(row[COL.trade-1]||'').trim(),
      score:            score,
      confidenceTier:   getConfidenceTier_(score),
      verdict:          verdict,
      positionApplied:  String(row[COL.positionApplied-1]||'').trim(),
      industry:         String(row[COL.industry-1]||'').trim(),
      experience:       parseFloat(row[COL.experience-1]) || 0,
      gulfExp:          gulfExp,
      gccMobility:      classifyGCCMobility_(gulfExp, loc),
      currentLocation:  loc,
      educationRaw:     String(row[COL.education-1]||'').trim(),
      educationLevel:   edu.level,
      educationSubject: edu.subject,
      mobile:           String(row[COL.mobile-1]||'').replace(/^'/,'').trim(),
      email:            email,
      cvLink:           String(row[COL.cvLink-1]||'').trim(),
      kaiAssessment:    kaiText,
      kaiSnippet:       kaiText.slice(0,150),
      applicationDate:  appDt instanceof Date ?
                          Utilities.formatDate(appDt,'Asia/Dubai','yyyy-MM-dd') : '',
      passportStatus:   ppStat,
      passportExpiry:   ppExp ? Utilities.formatDate(ppExp,'Asia/Dubai','yyyy-MM-dd') : '',
      passportNo:       extractPassportNo_(kaiText, String(row[COL.notes-1]||'')),
      ecrStatus:        String(row[COL.ecrStatus-1]||'').trim(),
      missingFields:    String(row[COL.missingFields-1]||'').trim(),
      deployScore:      parseInt(row[COL.deployScore-1]) || 0,
      top3Positions:    top3,
      flags:            String(row[COL.flags-1]||'').trim(),
      recruiterAction:  String(row[COL.recruiterAction-1]||'').trim(),
      notes:            String(row[COL.notes-1]||'').trim().slice(0,200),
      scoreBreakdown:   String(row[COL.scoreBreakdown-1]||'').trim(),
      recommendedRoles: String(row[COL.recommendedRoles-1]||'').trim(),
    });
  });

  return records;
}

// ════════════════════════════════════════════════════════════════════
// SECTION 4 — CANDIDATES (Read)
// ════════════════════════════════════════════════════════════════════

// GET ?action=candidates&page=1&limit=100&stage=X&trade=X&nationality=X
//     &gccMobility=X&scoreMin=X&scoreMax=X&verdict=X&q=searchterm
function getCandidates_(params) {
  params = params || {};
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, records:[], total:0 };

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1,
             Math.min(sheet.getLastColumn(), 42)).getValues();

  var fStage  = String(params.stage       ||'').trim().toLowerCase();
  var fTrade  = String(params.trade       ||'').trim().toLowerCase();
  var fNat    = String(params.nationality ||'').trim().toLowerCase();
  var fGCC    = String(params.gccMobility ||'').trim().toUpperCase();
  var fVerdict= String(params.verdict     ||'').trim().toLowerCase();
  var fMin    = parseInt(params.scoreMin  ||'0')   || 0;
  var fMax    = parseInt(params.scoreMax  ||'100') || 100;
  var fSearch = String(params.q           ||'').trim().toLowerCase();
  var page    = Math.max(1, parseInt(params.page  ||'1')  || 1);
  var limit   = Math.min(200, parseInt(params.limit||'100')|| 100);

  var records = [];
  var excludedCount = 0;

  data.forEach(function(row, i) {
    var active = String(row[COL.active-1]||'').toUpperCase().trim();
    if (active === 'SUPERSEDED' || active === 'ARCHIVED') { excludedCount++; return; }
    var name  = String(row[COL.name-1]||'').trim();
    var email = String(row[COL.email-1]||'').trim();
    if (!name && !email) { excludedCount++; return; }

    var score    = parseInt(row[COL.score-1])   || 0;
    var stageRaw = String(row[COL.stage-1]||'').trim();
    var trade    = String(row[COL.trade-1]||'').trim();
    var nat      = String(row[COL.nationality-1]||'').trim();
    var verdict  = String(row[COL.verdict-1]||'').trim().toUpperCase();
    var gulfExp  = String(row[COL.gulfExp-1]||'').trim();
    var loc      = String(row[COL.currentLocation-1]||'').trim();
    var stage    = computeDisplayStage_(stageRaw, verdict);

    if (fStage   && stage.toLowerCase().indexOf(fStage)   < 0) return;
    if (fTrade   && trade.toLowerCase().indexOf(fTrade)   < 0) return;
    if (fNat     && nat.toLowerCase().indexOf(fNat)       < 0) return;
    if (fVerdict && verdict.toLowerCase().indexOf(fVerdict)< 0) return;
    if (score < fMin || score > fMax) return;

    var gccMobility = classifyGCCMobility_(gulfExp, loc);
    if (fGCC && gccMobility !== fGCC) return;

    if (fSearch) {
      var kaiNo  = String(row[COL.kaiNo-1]||'');
      var mobile = String(row[COL.mobile-1]||'').replace(/^'/,'');
      var pos    = String(row[COL.positionApplied-1]||'');
      var kai    = String(row[COL.kaiAssessment-1]||'');
      var ppNo   = extractPassportNo_(kai, String(row[COL.notes-1]||''));
      var blob   = [name,kaiNo,mobile,email,ppNo,trade,pos,
                    String(row[COL.educationEnum-1]||''),nat].join(' ').toLowerCase();
      if (blob.indexOf(fSearch) < 0) return;
    }

    var kaiText = String(row[COL.kaiAssessment-1]||'').trim();
    var edu     = parseEducation_(String(row[COL.education-1]||''));
    var top3    = parseTop3Positions_(String(row[COL.top3Positions-1]||''));
    var appDt   = row[COL.applicationDate-1];
    var ppExpR  = row[COL.passportExpiry-1];
    var ppExp   = ppExpR instanceof Date ? ppExpR : null;
    var ppStat  = 'Unknown';
    if (ppExp && !isNaN(ppExp)) {
      var mLeft = (ppExp - new Date()) / (1000*60*60*24*30);
      ppStat = mLeft > 6 ? 'Valid' : (mLeft > 0 ? '<6mo' : 'Expired');
    }

    records.push({
      rowIndex:         i + 2,
      kaiNo:            String(row[COL.kaiNo-1]||'').trim(),
      name:             name,
      nationality:      nat,
      age:              parseInt(row[COL.age-1])     || 0,
      stage:            stage,
      trade:            trade,
      score:            score,
      confidenceTier:   getConfidenceTier_(score),
      verdict:          verdict,
      positionApplied:  String(row[COL.positionApplied-1]||'').trim(),
      industry:         String(row[COL.industry-1]||'').trim(),
      experience:       parseFloat(row[COL.experience-1]) || 0,
      gulfExp:          gulfExp,
      gccMobility:      gccMobility,
      currentLocation:  loc,
      educationRaw:     String(row[COL.education-1]||'').trim(),
      educationLevel:   edu.level,
      educationSubject: edu.subject,
      mobile:           String(row[COL.mobile-1]||'').replace(/^'/,'').trim(),
      email:            email,
      cvLink:           String(row[COL.cvLink-1]||'').trim(),
      kaiAssessment:    kaiText,
      kaiSnippet:       kaiText.slice(0,150),
      applicationDate:  appDt instanceof Date ?
                          Utilities.formatDate(appDt,'Asia/Dubai','yyyy-MM-dd') : '',
      passportStatus:   ppStat,
      passportExpiry:   ppExp ? Utilities.formatDate(ppExp,'Asia/Dubai','yyyy-MM-dd') : '',
      passportNo:       extractPassportNo_(kaiText, String(row[COL.notes-1]||'')),
      ecrStatus:        String(row[COL.ecrStatus-1]||'').trim(),
      missingFields:    String(row[COL.missingFields-1]||'').trim(),
      deployScore:      parseInt(row[COL.deployScore-1]) || 0,
      top3Positions:    top3,
      flags:            String(row[COL.flags-1]||'').trim(),
      recruiterAction:  String(row[COL.recruiterAction-1]||'').trim(),
      notes:            String(row[COL.notes-1]||'').trim().slice(0,200),
    });
  });

  // Sort newest first by applicationDate. Null/empty dates go to end.
  records.sort(function(a, b) {
    var da = a.applicationDate ? new Date(a.applicationDate).getTime() : 0;
    var db = b.applicationDate ? new Date(b.applicationDate).getTime() : 0;
    return db - da;
  });

  var activeCount   = records.length;
  var totalSheetCount = activeCount + excludedCount;
  var paged = records.slice((page-1)*limit, (page-1)*limit + limit);
  return {
    ok:true, records:paged,
    total:activeCount, page:page, limit:limit,
    totalPages:    Math.ceil(activeCount/limit),
    activeCount:   activeCount,
    excludedCount: excludedCount,
    totalCount:    totalSheetCount
  };
}

// GET ?action=candidate&rowIndex=5
// FIX: computes displayStage from verdict (was returning raw "Pending action")
function getSingleCandidate_(params) {
  var rowIndex = parseInt(params.rowIndex||'0');
  if (!rowIndex) return { ok:false, error:'rowIndex required' };
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Sheet not found' };
  var lc  = Math.min(sheet.getLastColumn(), 42);
  var row = sheet.getRange(rowIndex, 1, 1, lc).getValues()[0];

  var gulfExp  = String(row[COL.gulfExp-1]||'').trim();
  var loc      = String(row[COL.currentLocation-1]||'').trim();
  var score    = parseInt(row[COL.score-1]) || 0;
  var edu      = parseEducation_(String(row[COL.education-1]||''));
  var top3     = parseTop3Positions_(String(row[COL.top3Positions-1]||''));
  var appDt    = row[COL.applicationDate-1];
  var ppExpR   = row[COL.passportExpiry-1];
  var ppExp    = ppExpR instanceof Date ? ppExpR : null;
  var kaiText  = String(row[COL.kaiAssessment-1]||'').trim();
  var stageRaw = String(row[COL.stage-1]||'').trim();
  var verdict  = String(row[COL.verdict-1]||'').trim().toUpperCase();
  var ppStat   = 'Unknown';
  if (ppExp && !isNaN(ppExp)) {
    var mLeft = (ppExp - new Date()) / (1000*60*60*24*30);
    ppStat = mLeft > 6 ? 'Valid' : (mLeft > 0 ? '<6mo' : 'Expired');
  }

  return {
    ok:true, rowIndex:rowIndex,
    kaiNo:            String(row[COL.kaiNo-1]||'').trim(),
    name:             String(row[COL.name-1]||'').trim(),
    nationality:      String(row[COL.nationality-1]||'').trim(),
    age:              parseInt(row[COL.age-1]) || 0,
    dob:              row[COL.dob-1] instanceof Date ?
                        Utilities.formatDate(row[COL.dob-1],'Asia/Dubai','yyyy-MM-dd') : '',
    stage:            computeDisplayStage_(stageRaw, verdict),
    stageRaw:         stageRaw,
    trade:            String(row[COL.trade-1]||'').trim(),
    score:            score,
    confidenceTier:   getConfidenceTier_(score),
    verdict:          verdict,
    positionApplied:  String(row[COL.positionApplied-1]||'').trim(),
    industry:         String(row[COL.industry-1]||'').trim(),
    experience:       parseFloat(row[COL.experience-1]) || 0,
    gulfExp:          gulfExp,
    gccMobility:      classifyGCCMobility_(gulfExp, loc),
    currentLocation:  loc,
    empStatus:        String(row[COL.empStatus-1]||'').trim(),
    noticeDays:       parseInt(row[COL.noticeDays-1]) || 0,
    educationRaw:     String(row[COL.education-1]||'').trim(),
    educationLevel:   edu.level,
    educationSubject: edu.subject,
    mobile:           String(row[COL.mobile-1]||'').replace(/^'/,'').trim(),
    email:            String(row[COL.email-1]||'').trim(),
    cvLink:           String(row[COL.cvLink-1]||'').trim(),
    kaiAssessment:    kaiText,
    applicationDate:  appDt instanceof Date ?
                        Utilities.formatDate(appDt,'Asia/Dubai','yyyy-MM-dd') : '',
    passportStatus:   ppStat,
    passportExpiry:   ppExp ? Utilities.formatDate(ppExp,'Asia/Dubai','yyyy-MM-dd') : '',
    passportNo:       extractPassportNo_(kaiText, String(row[COL.notes-1]||'')),
    ecrStatus:        String(row[COL.ecrStatus-1]||'').trim(),
    medicalStatus:    String(row[COL.medicalStatus-1]||'').trim(),
    missingFields:    String(row[COL.missingFields-1]||'').trim(),
    deployScore:      parseInt(row[COL.deployScore-1]) || 0,
    top3Positions:    top3,
    flags:            String(row[COL.flags-1]||'').trim(),
    scoreBreakdown:   String(row[COL.scoreBreakdown-1]||'').trim(),
    recommendedRoles: String(row[COL.recommendedRoles-1]||'').trim(),
    recruiterAction:  String(row[COL.recruiterAction-1]||'').trim(),
    notes:            String(row[COL.notes-1]||'').trim(),
    techReview:       String(row[COL.techReview-1]||'').trim(),
  };
}

function globalSearch_(params) {
  params.limit = params.limit || '30';
  return getCandidates_(params);
}

// GET ?action=locationAudit
// Counts population of every address-related field so Lovable can use the richest one
function getLocationAudit_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, total:0 };

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1,
             Math.min(sheet.getLastColumn(), 42)).getValues();

  var total = 0;
  var counts = {
    currentLocation: 0,   // col 26
    candidateState:  0,   // col 28
    kaiAddressHint:  0    // address keyword in kaiAssessment col 20
  };

  data.forEach(function(row) {
    var active = String(row[COL.active-1]||'').toUpperCase().trim();
    if (active === 'SUPERSEDED' || active === 'ARCHIVED') return;
    var name  = String(row[COL.name-1]||'').trim();
    var email = String(row[COL.email-1]||'').trim();
    if (!name && !email) return;
    total++;

    if (String(row[COL.currentLocation-1]||'').trim()) counts.currentLocation++;
    if (String(row[COL.candidateState-1] ||'').trim()) counts.candidateState++;

    var kai = String(row[COL.kaiAssessment-1]||'').toLowerCase();
    if (/\b(location|city|resident|address|based in|lives in|staying in|from)\b/.test(kai))
      counts.kaiAddressHint++;
  });

  var result = {
    ok: true,
    totalActive: total,
    fields: [
      { field:'currentLocation', populated:counts.currentLocation,
        pct: total ? Math.round(counts.currentLocation/total*100)+'%' : '0%', col:26 },
      { field:'candidateState',  populated:counts.candidateState,
        pct: total ? Math.round(counts.candidateState/total*100)+'%'  : '0%', col:28 },
      { field:'kaiAddressHint',  populated:counts.kaiAddressHint,
        pct: total ? Math.round(counts.kaiAddressHint/total*100)+'%'  : '0%', col:'kaiAssessment (text hint)' }
    ]
  };
  result.recommendation = result.fields.reduce(function(best, f) {
    return (!best || f.populated > best.populated) ? f : best;
  }, null);
  return result;
}

// ════════════════════════════════════════════════════════════════════
// TRADE NORMALIZATION — GCC Oil & Gas trade family dictionary
// Used by getMatchedCandidates_ and getRequirementsEnhanced_ counts
// ════════════════════════════════════════════════════════════════════

var TRADE_FAMILIES = {
  WELDER: [
    'welder','welding','tig','arc welder','mig','pipe welder','structural welder',
    '6g','smaw','gtaw','gmaw','fcaw','coded welder','tig/mig','tig & arc',
    'stick welder','pressure welder','aluminium welder','ss welder','stainless welder',
    'weld','argon welder','co2 welder','combo welder','multi-process welder'
  ],
  PIPEFITTER: [
    'pipe fitter','pipefitter','pipe layer','pipe erector','piping',
    'pipe fabricator','piping erector','pipe mechanic','pipeline','pipe fitting',
    'piping fitter','pipe work','mechanical fitter'
  ],
  HVAC: [
    'hvac','air conditioning','refrigeration','chiller','ac technician',
    'hvac engineer','hvac/r','hvac technician','ductwork','ventilation',
    'heating cooling','air handling','vrf','vrv'
  ],
  ELECTRICIAN: [
    'electrician','electrical technician','electrical engineer','electrical fitter',
    'instrumentation electrician','hv electrician','lv electrician',
    'electrical & instrumentation','e&i','ei technician','mv electrician',
    'power electrician','industrial electrician','auto electrician'
  ],
  INSTRUMENTATION: [
    'instrumentation','instrument technician','instrument engineer',
    'control & instrumentation','process control','dcs','plc','scada',
    'instrumentation & control','i&c','field instrument','instrument fitter',
    'calibration','metering','telemetry','bms','ems'
  ],
  QA_QC: [
    'qa/qc','quality control','quality assurance','quality inspector',
    'qc inspector','qa inspector','qc engineer','qa engineer',
    'qc supervisor','qa supervisor','qa/qc engineer','qa/qc supervisor',
    'qc civil','qc mechanical','qc electrical','qc piping','qc welding',
    'welding inspector','piping inspector','mechanical inspector',
    'coating inspector','civil inspector','structural inspector',
    'dimensional inspection','visual inspection',
    'ndt','ndt technician','ndt inspector','cswip','asnt',
    'radiographic testing','ultrasonic testing',
    'magnetic particle testing','dye penetrant testing',
    'rt technician','ut technician','mt technician','pt technician',
    'quality','inspector','inspection','aws'
  ],
  HSE: [
    'hse','safety','health safety','safety officer','safety engineer',
    'fire safety','environmental','ehs','ohs','occupational health',
    'safety supervisor','nebosh','iosh','fire warden','safety inspector',
    'loss prevention','safety coordinator','ems coordinator'
  ],
  RIGGER: [
    'rigger','rigging','lifting','banksman','slinger','rigger banksman',
    'lift supervisor','lifting supervisor','crane banksman'
  ],
  CRANE_OPERATOR: [
    'crane operator','mobile crane','tower crane','overhead crane',
    'crawler crane','rough terrain crane','all terrain crane','lattice crane'
  ],
  SCAFFOLDER: [
    'scaffolder','scaffolding','scaffold erector','scaffold inspector',
    'scaffold supervisor','tube and fitting','system scaffold'
  ],
  MECHANICAL: [
    'mechanical','mechanical technician','mechanical engineer','rotating equipment',
    'static equipment','mechanical supervisor','maintenance technician',
    'machinery','pump','compressor','turbine','heat exchanger','vessel'
  ],
  CIVIL: [
    'civil','civil engineer','structural','mason','carpenter','formwork',
    'civil technician','surveyor','civil supervisor','shuttering','concrete',
    'reinforced concrete','piling','foundation','civil works'
  ],
  REBARMAN: [
    'rebar','rebarman','bar bender','steel fixer','iron worker','rebaring',
    'bar bending','reinforcement','rod buster'
  ],
  PAINTER: [
    'painter','painting','coating','blaster','sandblaster','surface treatment',
    'industrial painter','coating applicator','abrasive blasting',
    'spray painter','protective coating','anti-corrosion'
  ],
  HEAVY_EQUIPMENT: [
    'heavy equipment','equipment operator','forklift','excavator','bulldozer',
    'grader','loader','backhoe','crane','compactor','roller',
    'heavy plant','plant operator','machinery operator'
  ],
  SUPERVISOR: [
    'supervisor','foreman','site supervisor','construction supervisor',
    'mechanical supervisor','electrical supervisor','piping supervisor',
    'welding supervisor','civil supervisor','project supervisor','gang leader'
  ],
  MANAGER: [
    'manager','project manager','construction manager','site manager',
    'operations manager','maintenance manager','procurement manager',
    'contracts manager','project engineer','site engineer'
  ]
};

// Returns array of keywords for the family that best matches reqTrade.
// Also returns family name. Returns null if no family found.
function getTradeFamily_(reqTrade) {
  if (!reqTrade) return null;
  var norm = reqTrade.toLowerCase().trim();
  var bestFamily = null;
  var bestLen = 0;
  for (var fam in TRADE_FAMILIES) {
    var kws = TRADE_FAMILIES[fam];
    for (var k = 0; k < kws.length; k++) {
      var kw = kws[k];
      if (norm.indexOf(kw) >= 0 || kw.indexOf(norm) >= 0) {
        if (kw.length > bestLen) { bestLen = kw.length; bestFamily = fam; }
      }
    }
  }
  return bestFamily ? { family: bestFamily, keywords: TRADE_FAMILIES[bestFamily] } : null;
}

// Returns 'STRONG', 'GOOD', 'POSSIBLE', or null (no match).
// STRONG  = candidate.trade matches req family keywords
// GOOD    = candidate.positionApplied or top3Positions matches family keywords
// POSSIBLE = candidate.kaiAssessment text mentions family keywords
function getTradeMatchTier_(reqTrade, cand) {
  if (!reqTrade) return 'POSSIBLE'; // no trade filter = all candidates possible

  var famInfo = getTradeFamily_(reqTrade);
  var keywords = famInfo ? famInfo.keywords : [reqTrade.toLowerCase().trim()];

  var candTrade = (cand.trade || '').toLowerCase();
  var candPos   = (cand.positionApplied || '').toLowerCase();
  var candTop3  = '';
  if (cand.top3Positions && cand.top3Positions.full) {
    candTop3 = cand.top3Positions.full.join(' ').toLowerCase();
  }
  var candText  = (cand.kaiAssessment || '').toLowerCase().slice(0, 800);

  for (var k = 0; k < keywords.length; k++) {
    var kw = keywords[k];
    if (candTrade.indexOf(kw) >= 0 || (candTrade && kw.indexOf(candTrade) >= 0 && candTrade.length > 3)) {
      return 'STRONG';
    }
  }
  for (var k = 0; k < keywords.length; k++) {
    var kw = keywords[k];
    if (candPos.indexOf(kw) >= 0 || candTop3.indexOf(kw) >= 0) return 'GOOD';
  }
  for (var k = 0; k < keywords.length; k++) {
    // Skip short keywords in assessment text — 2-3 char strings cause false positives
    // in normal English words (e.g. 'rt' in 'report', 'ut' in 'about')
    if (keywords[k].length < 4) continue;
    if (candText.indexOf(keywords[k]) >= 0) return 'POSSIBLE';
  }
  return null;
}

// GET ?action=match&reqId=AYE-REQ-2026-0001&tier=STRONG
// Uses normalized trade family matching — no exact string equality
function getMatchedCandidates_(params) {
  var reqId = String(params.reqId||'').trim();
  var tier  = String(params.tier ||'').trim().toUpperCase();
  if (!reqId) return { ok:false, error:'reqId required' };

  var ss = SpreadsheetApp.openById(SS_ID);
  var rs = ss.getSheetByName('_Requirements');
  if (!rs) return { ok:false, error:'_Requirements sheet not found' };

  var rData  = rs.getDataRange().getValues();
  var reqRow = null;
  for (var i = 1; i < rData.length; i++) {
    if (String(rData[i][0]) === reqId) { reqRow = rData[i]; break; }
  }
  if (!reqRow) return { ok:false, error:'Requirement not found: ' + reqId };

  var reqTrade = String(reqRow[4]||'').trim();
  var minExp   = parseFloat(reqRow[6]) || 0;

  var all = getAllCandidatesRaw_();
  var result = { STRONG:[], GOOD:[], POSSIBLE:[], REVIEW:[] };

  all.forEach(function(r) {
    if (minExp > 0 && r.experience < minExp) return;
    var matchTier = getTradeMatchTier_(reqTrade, r);
    if (!matchTier) return;
    // Use trade match tier as bucket; sort within bucket by score
    result[matchTier].push(r);
  });

  // Sort each tier by score descending
  ['STRONG','GOOD','POSSIBLE','REVIEW'].forEach(function(t) {
    result[t].sort(function(a,b){ return b.score - a.score; });
  });

  var matched = result.STRONG.concat(result.GOOD).concat(result.POSSIBLE).concat(result.REVIEW);

  if (tier && tier !== 'ALL') {
    return { ok:true, reqId:reqId, tier:tier,
             records: result[tier]||[], total:(result[tier]||[]).length };
  }
  return {
    ok:true, reqId:reqId,
    STRONG:result.STRONG, GOOD:result.GOOD,
    POSSIBLE:result.POSSIBLE, REVIEW:result.REVIEW,
    counts: {
      STRONG:result.STRONG.length, GOOD:result.GOOD.length,
      POSSIBLE:result.POSSIBLE.length, REVIEW:result.REVIEW.length,
      total:matched.length
    }
  };
}

// Run this directly in GAS editor (Run button) to audit QA_QC match counts.
// Read-only. Does not modify any data.
function auditQAQCMatching() {
  var tradesToAudit = ['QC Inspector','QA/QC','Welder','Pipe Fitter','Electrician','Rigger','HSE Officer'];
  var all = getAllCandidatesRaw_();
  Logger.log('Total active candidates: ' + all.length);
  Logger.log('─────────────────────────────────────────────────');
  tradesToAudit.forEach(function(trade) {
    var strong=0, good=0, possible=0;
    all.forEach(function(c) {
      var tier = getTradeMatchTier_(trade, c);
      if      (tier === 'STRONG')   strong++;
      else if (tier === 'GOOD')     good++;
      else if (tier === 'POSSIBLE') possible++;
    });
    Logger.log(trade + ':  Total=' + (strong+good+possible) +
      '  Strong=' + strong + '  Good=' + good + '  Possible=' + possible);
  });
}

// Read-only audit: trade breakdown of all Strong QA/QC matches.
// Run directly in GAS editor. Does not modify any data.
function auditQAQCStrong() {
  var all = getAllCandidatesRaw_();
  var strongMatches = [];

  all.forEach(function(c) {
    if (getTradeMatchTier_('QC Inspector', c) === 'STRONG') {
      strongMatches.push(c.trade || '(blank)');
    }
  });

  Logger.log('Total Strong QA/QC matches: ' + strongMatches.length);
  Logger.log('─────────────────────────────────────────────────');

  // Count by exact trade value
  var tradeCounts = {};
  strongMatches.forEach(function(t) {
    var key = t.trim().toLowerCase();
    tradeCounts[key] = (tradeCounts[key] || 0) + 1;
  });

  // Known legitimate QA/QC trades
  var knownQC = [
    'qa/qc engineer','qa engineer','qc engineer','qc inspector','qa inspector',
    'qa/qc inspector','qa/qc supervisor','qc supervisor','qa supervisor',
    'qa/qc manager','qc manager','quality engineer','quality inspector',
    'quality control engineer','quality assurance engineer',
    'welding inspector','piping inspector','mechanical inspector',
    'electrical inspector','civil inspector','structural inspector',
    'coating inspector','ndt inspector','ndt technician',
    'cswip inspector','qc civil','qc mechanical','qc electrical',
    'qc piping','qc welding','quality control','quality assurance',
    'quality technician','quality supervisor','quality manager',
    'qa/qc technician','qc technician','qa technician'
  ];

  var legitimateCount  = 0;
  var unexpectedCount  = 0;
  var knownTotals      = {};
  var unexpectedTrades = {};

  for (var trade in tradeCounts) {
    var cnt = tradeCounts[trade];
    var isKnown = false;
    for (var i = 0; i < knownQC.length; i++) {
      if (trade.indexOf(knownQC[i]) >= 0 || knownQC[i].indexOf(trade) >= 0) {
        isKnown = true;
        knownTotals[trade] = cnt;
        legitimateCount += cnt;
        break;
      }
    }
    if (!isKnown) {
      unexpectedTrades[trade] = cnt;
      unexpectedCount += cnt;
    }
  }

  Logger.log('LEGITIMATE QA/QC trades: ' + legitimateCount);
  var knownSorted = Object.keys(knownTotals).sort(function(a,b){
    return knownTotals[b] - knownTotals[a];
  });
  knownSorted.forEach(function(t) {
    Logger.log('  ' + t + ': ' + knownTotals[t]);
  });

  Logger.log('─────────────────────────────────────────────────');
  Logger.log('UNEXPECTED trades (possible leakage): ' + unexpectedCount);
  var unexpSorted = Object.keys(unexpectedTrades).sort(function(a,b){
    return unexpectedTrades[b] - unexpectedTrades[a];
  });
  // Show top 50
  unexpSorted.slice(0, 50).forEach(function(t) {
    Logger.log('  ' + t + ': ' + unexpectedTrades[t]);
  });
}

// ════════════════════════════════════════════════════════════════════
// SECTION 5 — METRICS + SAC
// FIX: uses getAllCandidatesRaw_ — sees all 4,520+ candidates, not just 200
// ════════════════════════════════════════════════════════════════════

function getMetrics_() {
  var records = getAllCandidatesRaw_();
  var m = { total:0, shortlisted:0, needsReview:0, needsCall:0,
            clientSent:0, selected:0, deployed:0, todayCount:0,
            strongMatch:0, goodMatch:0, possibleMatch:0, reviewMatch:0,
            unscored:0 };
  var today = Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd');

  records.forEach(function(r) {
    m.total++;
    var v = (r.verdict||'').toUpperCase();
    var s = (r.stage||'').toLowerCase();
    if (v === 'SHORTLISTED')                        m.shortlisted++;
    if (v === 'NEEDS_REVIEW')                       m.needsReview++;
    if (v === 'NEEDS_CALL')                         m.needsCall++;
    if (s.indexOf('client sent') >= 0)              m.clientSent++;
    if (s.indexOf('selected') >= 0)                 m.selected++;
    if (s.indexOf('deployed') >= 0)                 m.deployed++;
    if (r.applicationDate === today)                m.todayCount++;
    if (r.confidenceTier === 'STRONG')              m.strongMatch++;
    else if (r.confidenceTier === 'GOOD')           m.goodMatch++;
    else if (r.confidenceTier === 'POSSIBLE')       m.possibleMatch++;
    else if (r.confidenceTier === 'REVIEW')         m.reviewMatch++;
    if (!r.score || r.score === 0)                  m.unscored++;
  });
  return { ok:true, metrics:m };
}

function getSacPerformance_() {
  var records = getAllCandidatesRaw_();
  var groups  = {};
  records.forEach(function(r) {
    var src = r.source || 'Direct';
    if (!groups[src]) groups[src] = { source:src, total:0, shortlisted:0, selected:0, scores:[] };
    var g = groups[src];
    g.total++;
    if ((r.verdict||'').toUpperCase() === 'SHORTLISTED') g.shortlisted++;
    var s = (r.stage||'').toLowerCase();
    if (s.indexOf('selected') >= 0 || s.indexOf('deployed') >= 0) g.selected++;
    if (r.score > 0) g.scores.push(r.score);
  });
  var result = Object.keys(groups).map(function(src) {
    var g = groups[src];
    var avg = g.scores.length ?
      Math.round(g.scores.reduce(function(a,b){return a+b;},0) / g.scores.length) : 0;
    return {
      source:g.source, total:g.total, shortlisted:g.shortlisted, selected:g.selected,
      passRate: g.total > 0 ? Math.round(g.shortlisted/g.total*100)+'%':'0%',
      avgScore:avg,
      grade: avg>=75?'A':(avg>=65?'B+':(avg>=55?'B':'C')),
      readiness: avg>=72?'HIGH':(avg>=62?'MODERATE':'LOW')
    };
  });
  result.sort(function(a,b){ return b.avgScore - a.avgScore; });
  return { ok:true, sacPerformance:result };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 6 — STAGE + NOTES + ACTIVITY LOG (Write)
// ════════════════════════════════════════════════════════════════════

function updateStage_(body) {
  var rowIndex  = parseInt(body.rowIndex||'0');
  var newStage  = String(body.newStage  ||'').trim();
  var recruiter = String(body.recruiter ||'recruiter@system').trim();
  if (!rowIndex) return { ok:false, error:'rowIndex required' };
  if (!newStage) return { ok:false, error:'newStage required' };
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Candidates sheet not found' };
  var prev = String(sheet.getRange(rowIndex, 1).getValue()||'').trim();
  sheet.getRange(rowIndex, 1).setValue(newStage);
  logActivity_(ss, {
    kaiNo:    String(sheet.getRange(rowIndex, 25).getValue()||''),
    rowIndex: rowIndex, action:'STAGE_CHANGE',
    detail:   prev + ' → ' + newStage, actor:recruiter
  });
  return { ok:true, rowIndex:rowIndex, prevStage:prev, newStage:newStage };
}

function saveNote_(body) {
  var rowIndex  = parseInt(body.rowIndex||'0');
  var kaiNo     = String(body.kaiNo    ||'').trim();
  var note      = String(body.note     ||'').trim();
  var recruiter = String(body.recruiter||'recruiter@system').trim();
  if (!note) return { ok:false, error:'note text required' };
  if (!rowIndex && !kaiNo) return { ok:false, error:'rowIndex or kaiNo required' };
  var ss = SpreadsheetApp.openById(SS_ID);
  ensureActivitySheet_(ss).appendRow([
    Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd HH:mm'),
    kaiNo || ('ROW:'+rowIndex), rowIndex||'', 'NOTE',
    note.slice(0,500), recruiter, ''
  ]);
  return { ok:true, saved:true };
}

function getActivityLog_(params) {
  var rowIndex = parseInt(params.rowIndex||'0');
  var kaiNo    = String(params.kaiNo||'').trim();
  if (!rowIndex && !kaiNo) return { ok:false, error:'rowIndex or kaiNo required' };
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_ActivityLog');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, log:[], count:0 };
  var data = sheet.getDataRange().getValues();
  var log  = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if ((kaiNo && String(row[1])===kaiNo) ||
        (rowIndex && parseInt(row[2])===rowIndex)) {
      log.push({ timestamp:String(row[0]), kaiNo:String(row[1]),
                 rowIndex:parseInt(row[2])||0, action:String(row[3]),
                 detail:String(row[4]), actor:String(row[5]), notes:String(row[6]) });
    }
  }
  log.reverse();
  return { ok:true, log:log, count:log.length };
}

function logActivity_(ss, entry) {
  ensureActivitySheet_(ss).appendRow([
    Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd HH:mm'),
    entry.kaiNo||'', entry.rowIndex||'', entry.action||'',
    (entry.detail||'').slice(0,500), entry.actor||'system', entry.notes||''
  ]);
}

function ensureActivitySheet_(ss) {
  var s = ss.getSheetByName('_ActivityLog');
  if (!s) {
    s = ss.insertSheet('_ActivityLog');
    s.appendRow(['Timestamp','KAI No','Row Index','Action','Detail','Actor','Notes']);
    s.getRange(1,1,1,7).setFontWeight('bold').setBackground('#1F4E79').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// ════════════════════════════════════════════════════════════════════
// SECTION 7 — REQUIREMENTS
// ════════════════════════════════════════════════════════════════════

function getRequirementsEnhanced_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, requirements:[] };
  var data  = sheet.getRange(2, 1, sheet.getLastRow()-1, 25).getValues();
  var cands = getAllCandidatesRaw_();

  var reqs = data.filter(function(r){ return String(r[0]||'').trim(); })
    .map(function(row) {
      var trade  = String(row[4]||'').trim();
      var minExp = parseFloat(row[6])||0;
      var counts = { STRONG:0, GOOD:0, POSSIBLE:0, REVIEW:0 };
      cands.forEach(function(c) {
        if (minExp > 0 && c.experience < minExp) return;
        var mt = getTradeMatchTier_(trade, c);
        if (!mt) return;
        counts[mt] = (counts[mt]||0)+1;
      });
      return {
        reqId:         String(row[0]||'').trim(),
        receivedDate:  row[1] instanceof Date ?
                         Utilities.formatDate(row[1],'Asia/Dubai','dd-MMM-yyyy'):'',
        clientName:    String(row[2]||'Unknown').trim(),
        deployCountry: String(row[3]||'').trim(),
        jobTitle:      String(row[4]||'').trim(),
        trade:         String(row[4]||'').trim(),
        requiredQty:   parseInt(row[5])||0,
        minExperience: parseInt(row[6])||0,
        minAge:        parseInt(row[7])||0,
        maxAge:        parseInt(row[8])||0,
        projectName:   String(row[9]||'').trim(),
        urgency:       String(row[13]||'Normal').trim(),
        status:        String(row[14]||'Open').trim(),
        sourcedBy:     String(row[15]||'').trim(),
        notes:         String(row[19]||'').trim(),
        jdId:          String(row[20]||'').trim(),
        startDate:     row[21] instanceof Date ?
                         Utilities.formatDate(row[21],'Asia/Dubai','yyyy-MM-dd'):String(row[21]||''),
        endDate:       row[22] instanceof Date ?
                         Utilities.formatDate(row[22],'Asia/Dubai','yyyy-MM-dd'):String(row[22]||''),
        matchCounts:   counts,
        totalMatches:  counts.STRONG+counts.GOOD+counts.POSSIBLE
      };
    });
  return { ok:true, requirements:reqs, count:reqs.length };
}

function createRequirement_(body) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) return { ok:false, error:'_Requirements sheet not found' };
  var reqId = generateReqId_();
  sheet.appendRow([
    reqId, new Date(),
    String(body.clientName    ||'').trim(),
    String(body.deployCountry ||'').trim(),
    String(body.trade||body.jobTitle||'').trim(),
    parseInt(body.requiredQty ||'1')||1,
    parseFloat(body.minExperience||'0')||0,
    parseInt(body.minAge      ||'0')||0,
    parseInt(body.maxAge      ||'0')||0,
    String(body.projectName   ||'').trim(),
    '', '', '',
    String(body.urgency       ||'Normal').trim(),
    'Active',
    String(body.sourcedBy||body.recruiter||'').trim(),
    String(body.specialReq    ||'').trim(),
    0, 0,
    String(body.notes         ||'').trim(),
    String(body.jdId          ||'').trim(),
    body.startDate||'', body.endDate||''
  ]);
  return { ok:true, reqId:reqId };
}

function updateRequirement_(body) {
  var reqId = String(body.reqId||'').trim();
  if (!reqId) return { ok:false, error:'reqId required' };
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) return { ok:false, error:'_Requirements sheet not found' };
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== reqId) continue;
    var r = i + 1;
    if (body.clientName)      sheet.getRange(r,3).setValue(body.clientName);
    if (body.deployCountry)   sheet.getRange(r,4).setValue(body.deployCountry);
    if (body.trade||body.jobTitle) sheet.getRange(r,5).setValue(body.trade||body.jobTitle);
    if (body.requiredQty)     sheet.getRange(r,6).setValue(parseInt(body.requiredQty)||0);
    if (body.minExperience !== undefined) sheet.getRange(r,7).setValue(parseFloat(body.minExperience)||0);
    if (body.projectName !== undefined)   sheet.getRange(r,10).setValue(body.projectName);
    if (body.urgency)         sheet.getRange(r,14).setValue(body.urgency);
    if (body.status)          sheet.getRange(r,15).setValue(body.status);
    if (body.notes)           sheet.getRange(r,20).setValue(body.notes);
    if (body.startDate)       sheet.getRange(r,22).setValue(body.startDate);
    if (body.endDate)         sheet.getRange(r,23).setValue(body.endDate);
    if (body.shortlistCount !== undefined)
      sheet.getRange(r,18).setValue(parseInt(body.shortlistCount)||0);
    return { ok:true, reqId:reqId, updated:true };
  }
  return { ok:false, error:'Requirement not found: '+reqId };
}

function deleteRequirement_(body) {
  var reqId = String(body.reqId||'').trim();
  if (!reqId) return { ok:false, error:'reqId required' };
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) return { ok:false, error:'_Requirements sheet not found' };
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== reqId) continue;
    sheet.deleteRow(i + 1);
    return { ok:true, reqId:reqId, deleted:true };
  }
  return { ok:false, error:'Requirement not found: '+reqId };
}

function duplicateRequirement_(body) {
  var reqId = String(body.reqId||'').trim();
  if (!reqId) return { ok:false, error:'reqId required' };
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) return { ok:false, error:'_Requirements sheet not found' };
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== reqId) continue;
    var newReqId = generateReqId_();
    var newRow = data[i].slice();
    newRow[0]  = newReqId;
    newRow[1]  = new Date();
    newRow[14] = 'Active';
    newRow[17] = 0;
    newRow[18] = 0;
    sheet.appendRow(newRow);
    return { ok:true, reqId:newReqId, copiedFrom:reqId };
  }
  return { ok:false, error:'Requirement not found: '+reqId };
}

function generateReqId_() {
  var props   = PropertiesService.getScriptProperties();
  var counter = parseInt(props.getProperty('req_id_counter')||'0') + 1;
  props.setProperty('req_id_counter', String(counter));
  return 'AYE-REQ-' + new Date().getFullYear() + '-' + String(counter).padStart(4,'0');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 8 — JD REPOSITORY
// ════════════════════════════════════════════════════════════════════

var JD_HEADERS = [
  'JD_ID','Received_Date','Source','Client','Title','Trade','Country',
  'Raw_Text','Parsed_Requirements','Min_Experience','Certifications',
  'Status','Linked_Req_ID','Drive_Link','Created_By','Notes'
];

function getJDs_(params) {
  params = params || {};
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_JD_Repository');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, jds:[], count:0 };
  var fStatus = String(params.status||'').trim().toUpperCase();
  var fTrade  = String(params.trade ||'').trim().toLowerCase();
  var data    = sheet.getDataRange().getValues();
  var jds     = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!String(row[0]||'').trim()) continue;
    if (fStatus && String(row[11]||'').toUpperCase() !== fStatus) continue;
    if (fTrade  && String(row[5]||'').toLowerCase().indexOf(fTrade) < 0) continue;
    jds.push({
      jdId:          String(row[0]||'').trim(),
      receivedDate:  row[1] instanceof Date ?
                       Utilities.formatDate(row[1],'Asia/Dubai','dd-MMM-yyyy'):String(row[1]||''),
      source:        String(row[2]||'').trim(),
      client:        String(row[3]||'').trim(),
      title:         String(row[4]||'').trim(),
      trade:         String(row[5]||'').trim(),
      country:       String(row[6]||'').trim(),
      parsedReq:     String(row[8]||'').trim(),
      minExperience: parseFloat(row[9])||0,
      certifications:String(row[10]||'').trim(),
      status:        String(row[11]||'').trim(),
      linkedReqId:   String(row[12]||'').trim(),
      driveLink:     String(row[13]||'').trim(),
      createdBy:     String(row[14]||'').trim(),
      notes:         String(row[15]||'').trim(),
    });
  }
  return { ok:true, jds:jds, count:jds.length };
}

function getJDDetail_(params) {
  var jdId = String(params.jdId||'').trim();
  if (!jdId) return { ok:false, error:'jdId required' };
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_JD_Repository');
  if (!sheet) return { ok:false, error:'_JD_Repository not found' };
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== jdId) continue;
    var row = data[i];
    return {
      ok:true, jdId:String(row[0]).trim(),
      receivedDate:  row[1] instanceof Date ?
                       Utilities.formatDate(row[1],'Asia/Dubai','dd-MMM-yyyy'):String(row[1]||''),
      source:String(row[2]||'').trim(), client:String(row[3]||'').trim(),
      title:String(row[4]||'').trim(),  trade:String(row[5]||'').trim(),
      country:String(row[6]||'').trim(), rawText:String(row[7]||'').trim(),
      parsedReq:String(row[8]||'').trim(), minExperience:parseFloat(row[9])||0,
      certifications:String(row[10]||'').trim(), status:String(row[11]||'').trim(),
      linkedReqId:String(row[12]||'').trim(), driveLink:String(row[13]||'').trim(),
      createdBy:String(row[14]||'').trim(), notes:String(row[15]||'').trim(),
    };
  }
  return { ok:false, error:'JD not found: '+jdId };
}

function createJD_(body) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ensureJDSheet_(ss);
  var jdId  = generateJDId_();
  var raw   = String(body.rawText||'').trim();
  var p     = parseJDText_(raw);
  sheet.appendRow([
    jdId, new Date(),
    String(body.source  ||'MANUAL').trim(),
    String(body.client  ||'').trim(),
    String(body.title   ||p.title  ||'').trim(),
    String(body.trade   ||p.trade  ||'').trim(),
    String(body.country ||p.country||'').trim(),
    raw, p.requirements,
    parseFloat(body.minExperience||p.minExp)||0,
    p.certifications, 'ACTIVE', '',  '',
    String(body.recruiter||'system').trim(),
    String(body.notes   ||'').trim()
  ]);
  return { ok:true, jdId:jdId, parsed:p };
}

function parseJDText_(text) {
  var r = { title:'', trade:'', country:'', requirements:'', minExp:0, certifications:'' };
  if (!text) return r;
  var em = text.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
  if (em) r.minExp = parseInt(em[1]);
  var countries = ['Saudi Arabia','UAE','Qatar','Bahrain','Kuwait','Oman','Malaysia'];
  for (var i=0;i<countries.length;i++) {
    if (text.toLowerCase().indexOf(countries[i].toLowerCase())>=0) { r.country=countries[i]; break; }
  }
  var trades = ['Welder','Pipe Fitter','QC Inspector','Electrician','Safety Officer',
                'HVAC','Mechanical','Civil','Structural','Instrumentation','Rigger'];
  for (var j=0;j<trades.length;j++) {
    if (new RegExp(trades[j],'i').test(text)) { r.trade=trades[j]; break; }
  }
  var certs=[];
  [/\bCSWIP\b/i,/\bAPI\s*570\b/i,/\bNEBOSH\b/i,/\bIOSH\b/i,/\b6G\b/,/\bNDT\b/i,/\bOPITO\b/i]
    .forEach(function(p){ var m=text.match(p); if(m) certs.push(m[0]); });
  r.certifications = certs.join(', ');
  r.requirements   = text.slice(0,500);
  return r;
}

function ensureJDSheet_(ss) {
  var s = ss.getSheetByName('_JD_Repository');
  if (!s) {
    s = ss.insertSheet('_JD_Repository');
    s.appendRow(JD_HEADERS);
    s.getRange(1,1,1,JD_HEADERS.length).setFontWeight('bold')
     .setBackground('#1e3a5f').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

function generateJDId_() {
  var props   = PropertiesService.getScriptProperties();
  var counter = parseInt(props.getProperty('jd_id_counter')||'0') + 1;
  props.setProperty('jd_id_counter', String(counter));
  return 'AYE-JD-' + new Date().getFullYear() + '-' + String(counter).padStart(4,'0');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 9 — UNIFIED CV UPLOAD
// ════════════════════════════════════════════════════════════════════

var UPLOAD_HEADERS = [
  'Upload_ID','Upload_Timestamp','File_Name','Drive_File_ID','Drive_Link',
  'Sender_Name','Sender_Email','Uploader','Status','KAI_No','Parse_Result','Notes'
];

function uploadCV_(body) {
  var fileName    = String(body.fileName   ||'cv.pdf').trim();
  var fileB64     = String(body.fileBase64 ||'').trim();
  var mimeType    = String(body.mimeType   ||'application/pdf').trim();
  var senderName  = String(body.senderName ||'').trim();
  var senderEmail = String(body.senderEmail||'').trim();
  var recruiter   = String(body.recruiter  ||'system').trim();
  if (!fileB64) return { ok:false, error:'fileBase64 required' };

  try {
    var ss       = SpreadsheetApp.openById(SS_ID);
    var uploadId = 'UPL-' + Utilities.formatDate(new Date(),'Asia/Dubai','yyyyMMdd-HHmmss');
    var driveUrl = '';
    var driveFileId = '';

    // STEP 1 — Save file to Drive (optional — continues if Drive not authorized)
    try {
      var bytes  = Utilities.base64Decode(fileB64);
      var blob   = Utilities.newBlob(bytes, mimeType, fileName);
      var folder = getOrCreateUploadFolder_();
      var file   = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveFileId = file.getId();
      driveUrl    = 'https://drive.google.com/file/d/' + driveFileId + '/view';
    } catch(driveErr) {
      Logger.log('Drive upload skipped: ' + driveErr.message);
    }

    var uploadSheet = ensureUploadSheet_(ss);

    // STEP 2 — Log row immediately (status PARSING)
    uploadSheet.appendRow([
      uploadId, new Date(), fileName, driveFileId, driveUrl,
      senderName, senderEmail, recruiter, 'PARSING', '', '', ''
    ]);
    var uploadRowNum = uploadSheet.getLastRow();

    // STEP 3 — Parse CV with Gemini
    var parsed = parseCV_(fileB64, mimeType, senderName, senderEmail);

    if (!parsed) {
      // No API key or Gemini failed — keep file in Drive, mark for pipeline
      uploadSheet.getRange(uploadRowNum, 9).setValue('PENDING_PARSE');
      uploadSheet.getRange(uploadRowNum, 12).setValue('GEMINI_API_KEY missing or Gemini error');
      return { ok:true, uploadId:uploadId, driveUrl:driveUrl, status:'PENDING_PARSE',
               message:'CV saved to Drive. Set GEMINI_API_KEY in Bridge script properties to enable instant parsing.' };
    }

    // STEP 4 — Generate KI Number
    var kaiNo = generateKaiNumber_(ss);

    // STEP 5 — Score candidate
    var scoreResult = computeBasicScore_(parsed);

    // STEP 6 — Write candidate record to Candidates sheet (42 cols)
    var candidatesSheet = ss.getSheetByName('Candidates');
    if (!candidatesSheet) throw new Error('Candidates sheet not found');
    candidatesSheet.appendRow(buildCandidateRow_(parsed, scoreResult, kaiNo, driveUrl, recruiter, senderName, senderEmail));
    var candidateRowIndex = candidatesSheet.getLastRow();

    // STEP 7 — Update upload log
    uploadSheet.getRange(uploadRowNum, 9).setValue('PARSED');
    uploadSheet.getRange(uploadRowNum, 10).setValue(kaiNo);
    uploadSheet.getRange(uploadRowNum, 11).setValue('Score:' + scoreResult.score + ' | ' + scoreResult.verdict);

    // STEP 8 — Log activity
    logActivity_(ss, {
      kaiNo:    kaiNo,
      rowIndex: candidateRowIndex,
      action:   'MANUAL_UPLOAD',
      detail:   'CV uploaded by ' + recruiter + ' — ' + fileName,
      actor:    recruiter
    });

    return {
      ok:               true,
      uploadId:         uploadId,
      driveUrl:         driveUrl,
      kaiNo:            kaiNo,
      candidateRowIndex:candidateRowIndex,
      status:           'PARSED',
      score:            scoreResult.score,
      verdict:          scoreResult.verdict,
      name:             String(parsed.name || senderName),
      trade:            String(parsed.trade || ''),
      message:          'CV parsed and candidate record created. KI: ' + kaiNo
    };

  } catch(e) {
    return { ok:false, error:'Upload failed: ' + e.message };
  }
}

function getOrCreateUploadFolder_() {
  var name    = 'KAI Manual CV Uploads';
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function ensureUploadSheet_(ss) {
  var s = ss.getSheetByName('_ManualUpload');
  if (!s) {
    s = ss.insertSheet('_ManualUpload');
    s.appendRow(UPLOAD_HEADERS);
    s.getRange(1,1,1,UPLOAD_HEADERS.length).setFontWeight('bold')
     .setBackground('#2d6a4f').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// ════════════════════════════════════════════════════════════════════
// SECTION 9B — CV PARSE + CANDIDATE WRITE (Manual Upload Pipeline)
// ════════════════════════════════════════════════════════════════════

// Calls Gemini to extract structured fields from a CV file.
// Requires GEMINI_API_KEY in this Bridge project's Script Properties.
// Returns parsed object or null if key missing / Gemini error.
var CV_PARSE_PROMPT =
  'You are a GCC recruitment CV parser for an oil & gas agency.\n' +
  'Extract all information from the attached CV.\n' +
  'Return ONLY a valid JSON object — no markdown, no explanation, just JSON.\n' +
  '{\n' +
  '  "name": "",\n' +
  '  "nationality": "",\n' +
  '  "mobile": "",\n' +
  '  "email": "",\n' +
  '  "dob": "",\n' +
  '  "age": 0,\n' +
  '  "education": "",\n' +
  '  "positionApplied": "",\n' +
  '  "trade": "",\n' +
  '  "industry": "",\n' +
  '  "experience": 0,\n' +
  '  "gulfExp": "",\n' +
  '  "currentLocation": "",\n' +
  '  "empStatus": "",\n' +
  '  "noticeDays": 0,\n' +
  '  "top3Positions": "",\n' +
  '  "passportNo": "",\n' +
  '  "passportExpiry": "",\n' +
  '  "ecrStatus": "",\n' +
  '  "kaiAssessment": "",\n' +
  '  "recruiterAction": "",\n' +
  '  "recommendedRoles": "",\n' +
  '  "missingFields": ""\n' +
  '}\n\n' +
  'Rules:\n' +
  '- experience: total years as a decimal number (e.g. 8.5)\n' +
  '- gulfExp: all GCC/Gulf experience — countries, companies, duration, current or past\n' +
  '- trade: primary technical trade (e.g. "Welder", "QC Inspector", "Pipe Fitter", "Safety Officer")\n' +
  '- industry: e.g. "Oil & Gas", "Construction", "Petrochemical"\n' +
  '- positionApplied: the most recent or most senior role held\n' +
  '- top3Positions: up to 3 roles this candidate qualifies for, comma-separated\n' +
  '- passportNo: one capital letter + 7 digits (Indian format, e.g. A1234567)\n' +
  '- passportExpiry: yyyy-MM-dd format, or empty string\n' +
  '- ecrStatus: "ECNR" if stamp mentioned, otherwise "ECR" for Indian nationals\n' +
  '- kaiAssessment: 2–3 sentences: strengths, GCC suitability, concerns\n' +
  '- recruiterAction: specific next action for the recruiter\n' +
  '- missingFields: comma-separated list of fields not found in the CV\n';

function parseCV_(fileB64, mimeType, senderName, senderEmail) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return null;

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
            'gemini-2.5-flash-lite:generateContent?key=' + apiKey;

  // Build parts: attach file first, then prompt
  var parts = [];
  var approxBytes = fileB64.length * 0.75;
  var supported   = (mimeType === 'application/pdf' ||
                     mimeType.indexOf('image/') === 0);

  if (supported && approxBytes < 15 * 1024 * 1024) {
    parts.push({ inline_data: { mime_type: mimeType, data: fileB64 } });
  }
  parts.push({ text: CV_PARSE_PROMPT });

  var payload = {
    contents: [{ parts: parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
  };

  var options = {
    method:          'post',
    contentType:     'application/json',
    payload:         JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var result   = JSON.parse(response.getContentText());

    if (!result.candidates || !result.candidates[0]) {
      Logger.log('parseCV_: Gemini returned no candidates — ' +
                 response.getContentText().slice(0, 300));
      return null;
    }

    var text = String(result.candidates[0].content.parts[0].text || '');
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    var parsed = JSON.parse(text);

    // Fallbacks from sender metadata
    if (!parsed.name  && senderName)  parsed.name  = senderName;
    if (!parsed.email && senderEmail) parsed.email = senderEmail;

    return parsed;
  } catch(e) {
    Logger.log('parseCV_ error: ' + e.message);
    return null;
  }
}

// Read col 25 (kaiNo) to find the current max, then increment.
// Safe to use alongside the main pipeline because it reads the sheet,
// not a separate counter — both will see each other's records.
function generateKaiNumber_(ss) {
  var sheet  = ss.getSheetByName('Candidates');
  var year   = new Date().getFullYear();
  var prefix = 'AYE-KAI-' + year + '-';

  if (!sheet || sheet.getLastRow() < 2) return prefix + '000001';

  var lr   = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 25, lr, 1).getValues();
  var max  = 0;

  data.forEach(function(row) {
    var val = String(row[0]||'').trim();
    if (!val) return;
    var m = val.match(/AYE-KAI-\d{4}-(\d+)/);
    if (m) {
      var num = parseInt(m[1]);
      if (num > max) max = num;
    }
  });

  return prefix + String(max + 1).padStart(6, '0');
}

// Simplified scoring for manually uploaded CVs.
// Mirrors the spirit of Code.gs scoring without replicating its full engine.
function computeBasicScore_(parsed) {
  var score  = 0;
  var exp    = parseFloat(parsed.experience) || 0;
  var gulf   = String(parsed.gulfExp || '').trim().toLowerCase();
  var hasGulf = gulf.length > 3 && gulf !== 'na' && gulf !== 'nil' && gulf !== 'none';
  var isCurrentGulf = hasGulf && /current|present|working|employed|ongoing|till date|till now/i.test(parsed.gulfExp||'');

  // Experience (max 30)
  if      (exp >= 10) score += 30;
  else if (exp >= 5)  score += 22;
  else if (exp >= 2)  score += 12;
  else if (exp >= 1)  score += 5;

  // Gulf experience (max 25)
  if      (isCurrentGulf) score += 25;
  else if (hasGulf)        score += 15;

  // Trade + position clarity (max 20)
  if (parsed.trade            && parsed.trade.length > 2)            score += 10;
  if (parsed.positionApplied  && parsed.positionApplied.length > 2)  score += 10;

  // Contact completeness (max 10)
  if (parsed.mobile && parsed.mobile.length > 5) score += 5;
  if (parsed.email  && parsed.email.length  > 5) score += 5;

  // Education (max 10)
  if (parsed.education && parsed.education.length > 2) score += 10;

  // KAI assessment quality (max 5)
  if (parsed.kaiAssessment && parsed.kaiAssessment.length > 50) score += 5;

  score = Math.min(100, score);

  var verdict;
  if      (score >= 75) verdict = 'SHORTLISTED';
  else if (score >= 60) verdict = 'NEEDS_REVIEW';
  else                  verdict = 'NEEDS_CALL';

  return { score: score, verdict: verdict };
}

// Builds a 42-column array matching the Candidates sheet COL map exactly.
function buildCandidateRow_(parsed, scoreResult, kaiNo, driveUrl, recruiter, senderName, senderEmail) {
  var now = new Date();
  var edu = parseEducation_(String(parsed.education || ''));

  var age = parseInt(parsed.age) || 0;
  if (!age && parsed.dob) {
    try {
      var dob = new Date(parsed.dob);
      if (!isNaN(dob)) {
        var computed = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
        if (computed >= 15 && computed <= 80) age = computed;
      }
    } catch(e) {}
  }

  // Passport expiry as Date object (or blank)
  var ppExp = '';
  if (parsed.passportExpiry) {
    try {
      var d = new Date(parsed.passportExpiry);
      if (!isNaN(d)) ppExp = d;
    } catch(e) {}
  }

  var row = new Array(42).fill('');

  // ── Cols 1-24 (standard schema) ──────────────────────────────────
  row[0]  = 'Pending action';                                             // Stage
  row[1]  = now;                                                          // Application Date
  row[2]  = String(parsed.nationality        || '').trim();               // Nationality
  row[3]  = String(parsed.name || senderName || '').trim();               // Name
  row[4]  = String(parsed.mobile             || '').replace(/^'/,'').trim(); // Mobile
  row[5]  = String(parsed.email || senderEmail || '').trim();             // Email
  row[6]  = String(parsed.education          || '').trim();               // Education
  row[7]  = String(parsed.positionApplied    || '').trim();               // Position Applied
  row[8]  = String(parsed.trade              || '').trim();               // Trade
  row[9]  = String(parsed.industry           || '').trim();               // Industry
  row[10] = parseFloat(parsed.experience)    || 0;                        // Experience
  row[11] = String(parsed.gulfExp            || '').trim();               // Gulf Experience
  row[12] = String(parsed.dob               || '').trim();               // Date of Birth
  row[13] = age;                                                          // Age
  row[14] = scoreResult.verdict;                                          // Verdict
  row[15] = 'MANUAL_UPLOAD';                                             // FLAGS
  row[16] = scoreResult.score;                                            // Score
  row[17] = '';                                                           // Score Breakdown
  row[18] = String(parsed.recommendedRoles  || '').trim();               // Recommended Roles
  row[19] = String(parsed.kaiAssessment     || '').trim();               // KAI Assessment
  row[20] = String(parsed.recruiterAction   || '').trim();               // Recruiter Action
  row[21] = driveUrl;                                                     // CV Link
  row[22] = 'Uploaded by: ' + recruiter;                                  // Notes
  row[23] = '';                                                           // _Active (blank = active)

  // ── Cols 25-38 (extCol v2) ────────────────────────────────────────
  row[24] = kaiNo;                                                        // KAI No
  row[25] = String(parsed.currentLocation   || '').trim();               // Current Location
  row[26] = String(parsed.empStatus         || '').trim();               // Employment Status
  row[27] = '';                                                           // Candidate State
  row[28] = '';                                                           // Mobility
  row[29] = ppExp;                                                        // Passport Expiry
  row[30] = String(parsed.ecrStatus         || '').trim();               // ECR Status
  row[31] = parseInt(parsed.noticeDays)     || 0;                        // Notice Days
  row[32] = '';                                                           // Medical Status
  row[33] = 0;                                                            // Deploy Score
  row[34] = String(parsed.missingFields     || '').trim();               // Missing Fields
  row[35] = '';                                                           // Last Contact
  row[36] = '';                                                           // Req Match
  row[37] = '';                                                           // Timeline

  // ── Cols 39-42 (extCol2 v282) ─────────────────────────────────────
  row[38] = edu.level;                                                    // Education Enum
  row[39] = '';                                                           // Tech Review
  row[40] = recruiter;                                                    // Reviewed By
  row[41] = String(parsed.top3Positions     || '').trim();               // Top 3 Positions

  return row;
}

// ════════════════════════════════════════════════════════════════════
// SECTION 10 — EMAIL WORKSPACE
// ════════════════════════════════════════════════════════════════════

function getGmailInbox_(params) {
  params = params || {};
  var tab = String(params.tab||'inbox').toLowerCase();
  var max = Math.min(50, parseInt(params.max||'20')||20);
  var query = buildGmailQuery_(tab);
  var threads;
  try { threads = GmailApp.search(query, 0, max); }
  catch(e) { return { ok:false, error:'Gmail search failed: '+e.message }; }
  var results = threads.map(function(t) {
    var msgs   = t.getMessages();
    var last   = msgs[msgs.length-1];
    var hasAtt = msgs.some(function(m){ return m.getAttachments().length>0; });
    return {
      threadId:     t.getId(),
      subject:      last.getSubject()||'(no subject)',
      from:         msgs[0].getFrom(),
      fromName:     extractNameFromHeader_(msgs[0].getFrom()),
      fromEmail:    extractEmailFromHeader_(msgs[0].getFrom()),
      date:         Utilities.formatDate(last.getDate(),'Asia/Dubai','dd-MMM HH:mm'),
      dateRaw:      last.getDate().getTime(),
      snippet:      last.getPlainBody().slice(0,120).replace(/<[^>]+>/g,''),
      messageCount: msgs.length,
      hasAttachment:hasAtt,
      isUnread:     t.isUnread(),
      labels:       t.getLabels().map(function(l){ return l.getName(); }),
    };
  });
  return { ok:true, threads:results, count:results.length, tab:tab };
}

function buildGmailQuery_(tab) {
  var now = new Date();
  if (tab==='inbox')  return 'in:inbox';
  if (tab==='sent')   return 'in:sent';
  if (tab==='unread') return 'in:inbox is:unread';
  if (tab==='today') {
    return 'in:inbox after:'+Utilities.formatDate(now,'Asia/Dubai','yyyy/MM/dd');
  }
  if (tab==='week') {
    return 'in:inbox after:'+Utilities.formatDate(
      new Date(now.getTime()-7*24*60*60*1000),'Asia/Dubai','yyyy/MM/dd');
  }
  if (tab==='cv')
    return 'in:inbox has:attachment (filename:pdf OR filename:doc OR filename:docx) '+
           '(subject:cv OR subject:resume OR subject:application OR subject:apply)';
  if (tab==='jd')
    return 'in:inbox (subject:vacancy OR subject:requirement OR subject:position '+
           'OR subject:manpower OR subject:urgently OR subject:hiring)';
  return 'in:inbox';
}

function getGmailThread_(params) {
  var threadId = String(params.threadId||'').trim();
  if (!threadId) return { ok:false, error:'threadId required' };
  var thread;
  try { thread = GmailApp.getThreadById(threadId); }
  catch(e) { return { ok:false, error:'Thread not found: '+e.message }; }
  var msgs = thread.getMessages();
  var messages = msgs.map(function(msg) {
    var atts = msg.getAttachments();
    return {
      messageId:  msg.getId(),
      from:       msg.getFrom(),
      fromName:   extractNameFromHeader_(msg.getFrom()),
      fromEmail:  extractEmailFromHeader_(msg.getFrom()),
      to:         msg.getTo(),
      date:       Utilities.formatDate(msg.getDate(),'Asia/Dubai','dd-MMM-yyyy HH:mm'),
      subject:    msg.getSubject(),
      bodyHtml:   msg.getBody().slice(0,5000),
      bodyPlain:  msg.getPlainBody().slice(0,3000),
      attachments:atts.map(function(a) {
        return {
          name:a.getName(), mimeType:a.getContentType(), size:a.getSize(),
          data: a.getSize()<512000 ? Utilities.base64Encode(a.getBytes()) : null,
          tooLarge: a.getSize()>=512000
        };
      }),
    };
  });
  thread.markRead();
  return { ok:true, threadId:threadId, subject:msgs[0].getSubject(),
           messages:messages, count:messages.length };
}

function gmailReply_(body) {
  var threadId  = String(body.threadId ||'').trim();
  var replyText = String(body.replyBody||'').trim();
  if (!threadId)  return { ok:false, error:'threadId required' };
  if (!replyText) return { ok:false, error:'replyBody required' };
  try {
    var thread = GmailApp.getThreadById(threadId);
    var msgs   = thread.getMessages();
    msgs[msgs.length-1].reply(replyText, {
      name:'Al Yousuf Recruitment', replyTo:'ai@alyousufent.com'
    });
    return { ok:true, replied:true, threadId:threadId };
  } catch(e) { return { ok:false, error:'Reply failed: '+e.message }; }
}

function gmailConvert_(body) {
  var threadId  = String(body.threadId ||'').trim();
  var convertTo = String(body.convertTo||'').trim().toUpperCase();
  var recruiter = String(body.recruiter||'system').trim();
  if (!threadId)  return { ok:false, error:'threadId required' };
  if (convertTo!=='CANDIDATE' && convertTo!=='JD')
    return { ok:false, error:'convertTo must be CANDIDATE or JD' };
  try {
    var thread = GmailApp.getThreadById(threadId);
    var msg    = thread.getMessages()[0];
    var from_  = msg.getFrom();
    if (convertTo==='JD') {
      var result = createJD_({ token:body.token, source:'EMAIL',
        client:extractNameFromHeader_(from_), rawText:msg.getPlainBody().slice(0,3000),
        recruiter:recruiter, notes:'From email thread: '+threadId });
      return { ok:true, convertTo:'JD', jdId:result.jdId };
    }
    var atts = msg.getAttachments();
    var cvAtt = null;
    atts.forEach(function(a){
      var n=a.getName().toLowerCase();
      if (!cvAtt&&(n.endsWith('.pdf')||n.endsWith('.doc')||n.endsWith('.docx'))) cvAtt=a;
    });
    if (!cvAtt) return { ok:false, error:'No CV attachment found' };
    var up = uploadCV_({ token:body.token, fileName:cvAtt.getName(),
      fileBase64:Utilities.base64Encode(cvAtt.getBytes()),
      mimeType:cvAtt.getContentType(),
      senderName:extractNameFromHeader_(from_),
      senderEmail:extractEmailFromHeader_(from_), recruiter:recruiter });
    return { ok:true, convertTo:'CANDIDATE', uploadResult:up };
  } catch(e) { return { ok:false, error:'Convert failed: '+e.message }; }
}

function extractNameFromHeader_(h) {
  var m = String(h||'').match(/^"?([^"<]+)"?\s*</);
  return m ? m[1].trim() : String(h||'').split('@')[0];
}
function extractEmailFromHeader_(h) {
  var m = String(h||'').match(/<([^>]+)>/);
  return m ? m[1].toLowerCase() : String(h||'').toLowerCase();
}

// ════════════════════════════════════════════════════════════════════
// SECTION 12 — CANDIDATE SLOTS (Many-to-many: Candidate ↔ Requirement)
// ════════════════════════════════════════════════════════════════════
//
// SlotStatus flow:  ADDED → SHORTLISTED → SUBMITTED → INTERVIEWED → SELECTED → DEPLOYED
//                   REJECTED (terminal, can be set from any status)
//
// One slot = one candidate linked to one requirement.
// Duplicate prevention: same reqId + kaiNo cannot be added twice.

var SLOTS_HEADERS = [
  'SlotId','ReqId','KaiNo','RowIndex','CandidateName','Trade',
  'SourceOwner','AddedBy','AddedAt','SlotStatus','Notes','UpdatedAt'
];

function ensureSlotsSheet_(ss) {
  var s = ss.getSheetByName('_CandidateSlots');
  if (!s) {
    s = ss.insertSheet('_CandidateSlots');
    s.appendRow(SLOTS_HEADERS);
    s.getRange(1,1,1,SLOTS_HEADERS.length)
     .setFontWeight('bold').setBackground('#1F4E79').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// GET ?action=slots&reqId=AYE-REQ-2026-0001
// GET ?action=slots&kaiNo=AYE-KAI-2026-000001
// GET ?action=slots&rowIndex=5
function getCandidateSlots_(params) {
  params = params || {};
  var reqId    = String(params.reqId    ||'').trim();
  var kaiNo    = String(params.kaiNo    ||'').trim();
  var rowIndex = parseInt(params.rowIndex||'0');

  if (!reqId && !kaiNo && !rowIndex)
    return { ok:false, error:'reqId, kaiNo, or rowIndex required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_CandidateSlots');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, slots:[], count:0 };

  var data  = sheet.getDataRange().getValues();
  var slots = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!String(row[0]||'').trim()) continue;
    var match = (reqId    && String(row[1]) === reqId)    ||
                (kaiNo    && String(row[2]) === kaiNo)    ||
                (rowIndex && parseInt(row[3]) === rowIndex);
    if (!match) continue;
    slots.push({
      slotId:        String(row[0]),
      reqId:         String(row[1]),
      kaiNo:         String(row[2]),
      rowIndex:      parseInt(row[3])||0,
      candidateName: String(row[4]),
      trade:         String(row[5]),
      sourceOwner:   String(row[6]),
      addedBy:       String(row[7]),
      addedAt:       String(row[8]),
      slotStatus:    String(row[9]),
      notes:         String(row[10]),
      updatedAt:     String(row[11]),
    });
  }
  return { ok:true, slots:slots, count:slots.length };
}

// POST body: { action:'addSlot', token, reqId, kaiNo, rowIndex, candidateName,
//              trade, sourceOwner, addedBy, notes }
function addCandidateToSlot_(body) {
  var reqId    = String(body.reqId         ||'').trim();
  var kaiNo    = String(body.kaiNo         ||'').trim();
  var rowIndex = parseInt(body.rowIndex    ||'0');
  if (!reqId) return { ok:false, error:'reqId required' };
  if (!kaiNo && !rowIndex) return { ok:false, error:'kaiNo or rowIndex required' };

  var ss = SpreadsheetApp.openById(SS_ID);

  // Prevent duplicate: same reqId + kaiNo
  var existing = ss.getSheetByName('_CandidateSlots');
  if (existing && existing.getLastRow() > 1) {
    var eData = existing.getDataRange().getValues();
    for (var i = 1; i < eData.length; i++) {
      if (String(eData[i][1]) === reqId && String(eData[i][2]) === kaiNo) {
        return { ok:false, error:'Candidate already added to this requirement',
                 existing:true, slotId:String(eData[i][0]) };
      }
    }
  }

  var slotId = 'SLT-' + Utilities.formatDate(new Date(),'Asia/Dubai','yyyyMMdd-HHmmss') +
               '-' + String(Math.floor(Math.random()*900)+100);
  var now    = Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd HH:mm');

  ensureSlotsSheet_(ss).appendRow([
    slotId,
    reqId,
    kaiNo,
    rowIndex || '',
    String(body.candidateName ||'').trim(),
    String(body.trade         ||'').trim(),
    String(body.sourceOwner   ||'SYSTEM').trim(),
    String(body.addedBy       ||'system').trim(),
    now,
    'ADDED',
    String(body.notes         ||'').trim(),
    now
  ]);

  logActivity_(ss, {
    kaiNo:    kaiNo,
    rowIndex: rowIndex,
    action:   'SLOT_ADDED',
    detail:   'Added to requirement: ' + reqId,
    actor:    String(body.addedBy||'system')
  });

  return { ok:true, slotId:slotId, reqId:reqId, kaiNo:kaiNo||('ROW:'+rowIndex) };
}

// POST body: { action:'updateSlot', token, slotId, newStatus, notes, actor }
// Valid newStatus: ADDED | SHORTLISTED | SUBMITTED | INTERVIEWED | SELECTED | REJECTED | DEPLOYED
function updateSlotStatus_(body) {
  var slotId    = String(body.slotId    ||'').trim();
  var newStatus = String(body.newStatus ||'').trim().toUpperCase();
  var actor     = String(body.actor     ||'system').trim();
  if (!slotId)                                        return { ok:false, error:'slotId required' };
  if (VALID_SLOT_STATUSES.indexOf(newStatus) < 0)     return { ok:false, error:'Invalid status: '+newStatus };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_CandidateSlots');
  if (!sheet) return { ok:false, error:'_CandidateSlots sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== slotId) continue;
    var r    = i + 1;
    var prev = String(data[i][9]);
    sheet.getRange(r, 10).setValue(newStatus);
    if (body.notes) sheet.getRange(r, 11).setValue(String(body.notes));
    sheet.getRange(r, 12).setValue(Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd HH:mm'));

    logActivity_(ss, {
      kaiNo:    String(data[i][2]),
      rowIndex: parseInt(data[i][3])||0,
      action:   'SLOT_STATUS',
      detail:   prev + ' → ' + newStatus + ' | Req: ' + data[i][1],
      actor:    actor
    });

    return { ok:true, slotId:slotId, prevStatus:prev, newStatus:newStatus };
  }
  return { ok:false, error:'Slot not found: '+slotId };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 13 — CLIENT REGISTRY
// ════════════════════════════════════════════════════════════════════
//
// Client codes: CL0001, CL0002, CL0003 ... auto-incremented.
// ClientName is internal — external submissions use clientCode only.

var CLIENTS_HEADERS = [
  'ClientCode','ClientName','Country','Sector',
  'ContactName','ContactEmail','Active','CreatedAt','Notes'
];

function ensureClientsSheet_(ss) {
  var s = ss.getSheetByName('_Clients');
  if (!s) {
    s = ss.insertSheet('_Clients');
    s.appendRow(CLIENTS_HEADERS);
    s.getRange(1,1,1,CLIENTS_HEADERS.length)
     .setFontWeight('bold').setBackground('#2C3E50').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// GET ?action=clients  (returns all clients)
// GET ?action=clients&active=YES  (active only)
function getClients_(params) {
  params = params || {};
  var fActive = String(params.active||'').trim().toUpperCase();
  var ss      = SpreadsheetApp.openById(SS_ID);
  var sheet   = ss.getSheetByName('_Clients');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, clients:[], count:0 };
  var data    = sheet.getDataRange().getValues();
  var clients = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!String(row[0]||'').trim()) continue;
    if (fActive && String(row[6]||'').toUpperCase() !== fActive) continue;
    clients.push({
      clientCode:   String(row[0]).trim(),
      clientName:   String(row[1]).trim(),
      country:      String(row[2]).trim(),
      sector:       String(row[3]).trim(),
      contactName:  String(row[4]).trim(),
      contactEmail: String(row[5]).trim(),
      active:       String(row[6]).trim().toUpperCase() === 'YES',
      createdAt:    row[7] instanceof Date ?
                      Utilities.formatDate(row[7],'Asia/Dubai','yyyy-MM-dd') : String(row[7]||''),
      notes:        String(row[8]).trim(),
    });
  }
  return { ok:true, clients:clients, count:clients.length };
}

// POST body: { action:'createClient', token, clientName, country, sector,
//              contactName, contactEmail, notes }
function createClient_(body) {
  var clientName = String(body.clientName||'').trim();
  if (!clientName) return { ok:false, error:'clientName required' };

  var ss         = SpreadsheetApp.openById(SS_ID);
  var clientCode = generateClientCode_(ss);
  var sheet      = ensureClientsSheet_(ss);

  sheet.appendRow([
    clientCode,
    clientName,
    String(body.country      ||'').trim(),
    String(body.sector       ||'').trim(),
    String(body.contactName  ||'').trim(),
    String(body.contactEmail ||'').trim(),
    'YES',
    new Date(),
    String(body.notes        ||'').trim(),
  ]);

  return { ok:true, clientCode:clientCode, clientName:clientName };
}

// Auto-increment: finds max existing CL#### and increments by 1
function generateClientCode_(ss) {
  var sheet = ss.getSheetByName('_Clients');
  if (!sheet || sheet.getLastRow() < 2) return 'CL0001';
  var data  = sheet.getDataRange().getValues();
  var max   = 0;
  for (var i = 1; i < data.length; i++) {
    var code = String(data[i][0]||'').trim();
    var num  = parseInt(code.replace(/^CL/i,'')) || 0;
    if (num > max) max = num;
  }
  return 'CL' + String(max + 1).padStart(4,'0');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 11 — SETUP + TEST (Run from GAS editor, not from web)
// ════════════════════════════════════════════════════════════════════

// Run ONCE after pasting this file (or after any new section is added)
function setupAllNewSheets() {
  var ss = SpreadsheetApp.openById(SS_ID);

  // Core auxiliary sheets
  Logger.log('_ActivityLog:    ' + (ensureActivitySheet_(ss) ? 'OK' : 'FAILED'));
  Logger.log('_JD_Repository:  ' + (ensureJDSheet_(ss)       ? 'OK' : 'FAILED'));
  Logger.log('_ManualUpload:   ' + (ensureUploadSheet_(ss)   ? 'OK' : 'FAILED'));

  // New sheets (Sections 12 + 13)
  Logger.log('_CandidateSlots: ' + (ensureSlotsSheet_(ss)    ? 'OK' : 'FAILED'));
  Logger.log('_Clients:        ' + (ensureClientsSheet_(ss)   ? 'OK' : 'FAILED'));

  // _Requirements column extension
  var req = ss.getSheetByName('_Requirements');
  if (req) {
    var lc = req.getLastColumn();
    if (lc < 21) req.getRange(1,21).setValue('JD_ID');
    if (lc < 22) req.getRange(1,22).setValue('Start_Date');
    if (lc < 23) req.getRange(1,23).setValue('End_Date');
    Logger.log('_Requirements: cols OK (' + req.getLastColumn() + ' cols)');
  } else {
    Logger.log('_Requirements: sheet not found (created when first req is added)');
  }

  // Script properties init
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('jd_id_counter'))  props.setProperty('jd_id_counter',  '0');
  if (!props.getProperty('req_id_counter')) props.setProperty('req_id_counter', '0');
  Logger.log('Setup complete.');
}

// Run after every deployment to verify all endpoints
function testBridgeEndpoints() {
  Logger.log('=== KAI Bridge Endpoint Test ===');

  // 1. Candidates list (paginated)
  var cands = getCandidates_({});
  Logger.log('Candidates: ' + (cands.ok
    ? cands.total+' total, page 1 of '+cands.totalPages+' ('+cands.records.length+' returned)'
    : 'FAILED — '+cands.error));

  // 2. getAllCandidatesRaw_ (internal no-limit read)
  var all = getAllCandidatesRaw_();
  Logger.log('AllCandidatesRaw: ' + all.length + ' records (should match total above)');

  // 3. Single candidate
  if (cands.ok && cands.records.length > 0) {
    var firstRow = cands.records[0].rowIndex;
    var single   = getSingleCandidate_({ rowIndex: String(firstRow) });
    Logger.log('SingleCandidate: ' + (single.ok
      ? 'OK — ' + single.name + ' | stage: ' + single.stage + ' | score: ' + single.score
      : 'FAILED — '+single.error));
  }

  // 4. Global search
  var search = globalSearch_({ q: 'welder' });
  Logger.log('GlobalSearch "welder": ' + (search.ok
    ? search.total+' results' : 'FAILED — '+search.error));

  // 5. Requirements + match counts
  var reqs = getRequirementsEnhanced_();
  Logger.log('Requirements: ' + (reqs.ok ? reqs.count+' found' : 'FAILED — '+reqs.error));

  // 6. Match (first requirement)
  if (reqs.ok && reqs.requirements.length > 0) {
    var firstReqId = reqs.requirements[0].reqId;
    var match      = getMatchedCandidates_({ reqId: firstReqId });
    Logger.log('Match for '+firstReqId+': ' + (match.ok
      ? JSON.stringify(match.counts) : 'FAILED — '+match.error));
  }

  // 7. JDs
  var jds = getJDs_({});
  Logger.log('JDs: ' + (jds.ok ? jds.count+' found' : 'FAILED — '+jds.error));

  // 8. Metrics (uses getAllCandidatesRaw_ — should see all candidates)
  var metrics = getMetrics_();
  Logger.log('Metrics: ' + (metrics.ok
    ? 'total='+metrics.metrics.total+' strong='+metrics.metrics.strongMatch
      +' good='+metrics.metrics.goodMatch+' unscored='+metrics.metrics.unscored
    : 'FAILED — '+metrics.error));

  // 9. SAC Performance
  var sac = getSacPerformance_();
  Logger.log('SAC Performance: ' + (sac.ok
    ? sac.sacPerformance.length+' source groups' : 'FAILED — '+sac.error));

  // 10. Activity log
  if (cands.ok && cands.records.length > 0) {
    var actLog = getActivityLog_({ rowIndex: String(cands.records[0].rowIndex) });
    Logger.log('ActivityLog: ' + (actLog.ok
      ? actLog.count+' entries for row '+cands.records[0].rowIndex
      : 'FAILED — '+actLog.error));
  }

  // 11. Slots (should return empty on fresh setup)
  if (reqs.ok && reqs.requirements.length > 0) {
    var slots = getCandidateSlots_({ reqId: reqs.requirements[0].reqId });
    Logger.log('CandidateSlots: ' + (slots.ok
      ? slots.count+' slots for '+reqs.requirements[0].reqId
      : 'FAILED — '+slots.error));
  }

  // 12. Clients (may be empty on fresh setup)
  var clients = getClients_({});
  Logger.log('Clients: ' + (clients.ok
    ? clients.count+' clients' : 'FAILED — '+clients.error));

  // 13. Gmail inbox (requires Gmail scope)
  try {
    var inbox = getGmailInbox_({ tab: 'inbox', max: '3' });
    Logger.log('GmailInbox: ' + (inbox.ok ? inbox.count+' threads' : 'FAILED — '+inbox.error));
  } catch(e) {
    Logger.log('GmailInbox: SCOPE ERROR (add Gmail scope in manifest) — ' + e.message);
  }

  Logger.log('=== Test complete ===');
}

// ── TEST: Upload CV parse pipeline ───────────────────────────────────
// Run this standalone to verify the manual upload → parse → candidate flow.
// Uses a tiny 1x1 white PNG as the "CV" so no real file is needed.
function testUploadCV_() {
  Logger.log('=== testUploadCV_ ===');

  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    Logger.log('STOP: GEMINI_API_KEY not set. Add it to Bridge Script Properties first.');
    Logger.log('  Project Settings → Script Properties → Add: GEMINI_API_KEY = AIzaSy...');
    return;
  }
  Logger.log('GEMINI_API_KEY: found (length ' + apiKey.length + ')');

  // Test generateKaiNumber_
  var ss    = SpreadsheetApp.openById(SS_ID);
  var kaiNo = generateKaiNumber_(ss);
  Logger.log('Next KAI No would be: ' + kaiNo);

  // Test parseCV_ with a minimal text prompt (no file attached)
  // We pass empty fileB64 so the inline_data part is skipped;
  // Gemini will return a placeholder parse from the prompt alone.
  var sampleText = 'Name: Test Candidate\nNationality: Indian\n' +
                   'Trade: Pipe Fitter\nExperience: 8 years\n' +
                   'Gulf Experience: 5 years in Saudi Arabia (SABIC, current)\n' +
                   'Mobile: 9876543210\nEmail: test@example.com';

  // Encode sample text as a PDF mime (Gemini will treat as text if can't decode)
  var fakeB64 = Utilities.base64Encode(sampleText);
  var parsed  = parseCV_(fakeB64, 'text/plain', 'Test Candidate', 'test@example.com');

  if (!parsed) {
    Logger.log('parseCV_: returned null — check GEMINI_API_KEY validity and quota');
    return;
  }
  Logger.log('parseCV_: OK');
  Logger.log('  name:       ' + parsed.name);
  Logger.log('  trade:      ' + parsed.trade);
  Logger.log('  experience: ' + parsed.experience);
  Logger.log('  verdict:    ' + computeBasicScore_(parsed).verdict);
  Logger.log('  score:      ' + computeBasicScore_(parsed).score);
  Logger.log('=== testUploadCV_ complete ===');
}
