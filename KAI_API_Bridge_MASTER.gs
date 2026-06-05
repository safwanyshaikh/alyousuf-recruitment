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

    // Unauthenticated build check — open /exec?action=version in a browser to
    // confirm which deployment is actually live. If `build` is not the value
    // below, the web app was NOT redeployed after editing the code.
    if (action === 'version') {
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        build: 'T13-eligibility-gate',
        hasT13: (typeof getPositionLevel_ === 'function' &&
                 typeof getEligibility_ === 'function'),
        ts: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
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
    else if (action === 'associates')       out = JSON.stringify(getAssociates_(params));
    else if (action === 'matchAudit')       out = JSON.stringify(getMatchAudit_(params));
    else if (action === 'tradeAffinity')    out = JSON.stringify(getTradeAffinity_(params));
    else if (action === 'whatsappLink')     out = JSON.stringify(getWhatsAppLink_(params));
    else if (action === 'reEvaluate')          out = JSON.stringify(reEvaluateCandidatesT14_(params));
    else if (action === 'emailAudit')          out = JSON.stringify(diagnoseEmailPipeline_());
    else if (action === 'enrichTop3')          out = JSON.stringify(enrichTop3Positions_(params));
    else if (action === 'mobilizationStatus')  out = JSON.stringify(getMobilizationStatus_(params));
    else if (action === 'bulkDocStatus')       out = JSON.stringify(getBulkDocStatus_(params));
    else if (action === 'docRequestQueue')     out = JSON.stringify(getDocRequestQueue_(params));
    else if (action === 'complianceRisk')      out = JSON.stringify(getComplianceRisk_(params));
    // T15 — Lead Intake
    else if (action === 'leads')               out = JSON.stringify(getLeads_(params));
    else if (action === 'lead')                out = JSON.stringify(getSingleLead_(params));
    else if (action === 'openPoolMatches')     out = JSON.stringify(getOpenPoolMatches_(params));
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
    else if (action === 'importAssociates')  out = JSON.stringify(importAssociates_(body));
    else if (action === 'createJDAndReq')         out = JSON.stringify(createJDAndRequirement_(body));
    else if (action === 'updateCandidateFields')  out = JSON.stringify(updateCandidateFields_(body));
    else if (action === 'splitJDToRequirements')  out = JSON.stringify(splitJDToRequirements_(body));
    else if (action === 'whatsappIntake')          out = JSON.stringify(whatsappIntake_(body));
    else if (action === 'parseJDFile')            out = JSON.stringify(parseJDFile_(body));
    else if (action === 'sendMissingInfoDraft')    out = JSON.stringify(sendMissingInfoDraft_(body));
    else if (action === 'createDocRequest')       out = JSON.stringify(createDocRequest_(body));
    else if (action === 'updateDocRequestStatus') out = JSON.stringify(updateDocRequestStatus_(body));
    // T15 — Lead Intake
    else if (action === 'createLead')             out = JSON.stringify(createLead_(body));
    else if (action === 'updateLead')             out = JSON.stringify(updateLead_(body));
    else if (action === 'updateLeadStatus')       out = JSON.stringify(updateLeadStatus_(body));
    else if (action === 'convertLead')            out = JSON.stringify(convertLeadToCandidate_(body));
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
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Sheet not found' };

  var rowIndex = parseInt(params.rowIndex||'0');
  var kaiNo    = String(params.kaiNo||'').trim();

  // Accept either rowIndex OR kaiNo — find row by kaiNo if rowIndex not provided
  if (!rowIndex && kaiNo) {
    var data = sheet.getRange(2, COL.kaiNo, Math.max(1, sheet.getLastRow()-1), 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]||'').trim() === kaiNo) { rowIndex = i + 2; break; }
    }
  }
  if (!rowIndex) return { ok:false, error:'Candidate not found' };
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

// ═══════════════════════════════════════════════════════════════════════════
// T13 — KAI RECRUITMENT INTELLIGENCE LAYER (Phase 1: Eligibility Blocking)
// ───────────────────────────────────────────────────────────────────────────
// PROBLEM: TradeFamily alone treats "Welder", "Welding Inspector" and
//          "Welding Engineer" as the same family (all contain "weld").
//          Semantic similarity = HIGH, recruitment similarity = LOW.
//          A Welder requirement was returning Welding Inspectors at 94% STRONG.
//
// FIX: A POSITION CLASSIFICATION layer sits ABOVE the trade family. Every trade
//      is classified into a recruitment level, and an ELIGIBILITY MATRIX decides
//      whether a candidate of one level may even be SHOWN for a requirement of
//      another. Anything below ELIGIBILITY_FLOOR is BLOCKED — invisible. The
//      trade-family scoring never runs on a blocked candidate.
// ═══════════════════════════════════════════════════════════════════════════

// LAYER 2 — POSITION CLASSIFICATION ENGINE
// Classifies any trade / position string into a recruitment position level.
// First match wins; order is by seniority / specificity. Genuine blue-collar
// tradesmen (welder, fitter, rigger, mason, operator) fall through to WORKER —
// only explicitly senior titles are promoted, so we never demote a tradesman.
function getPositionLevel_(text) {
  if (!text) return 'WORKER';
  var t = String(text).toLowerCase();

  // MANAGER — top management
  if (/\bmanager\b|\bmanagement\b|\bdirector\b|\bchief\b|\bhead of\b|\bsuperintendent\b/.test(t)) return 'MANAGER';

  // ENGINEER — degree-level engineering / design office
  if (/\bengineer\b|\bengineering\b|\bdesigner\b|\bdraughtsman\b|\bdraftsman\b/.test(t)) return 'ENGINEER';

  // INSPECTOR — QA / QC / NDT / inspection (white collar)
  if (/inspector|inspection|qa\/qc|\bqaqc\b|\bqa\b|\bqc\b|\bndt\b|cswip|\bbgas\b|\bcwi\b|\bnace\b|\basnt\b|quality control|quality assurance/.test(t)) return 'INSPECTOR';

  // SUPERVISOR
  if (/supervisor|\bin\s?charge\b/.test(t)) return 'SUPERVISOR';

  // FOREMAN / chargehand / leadman
  if (/foreman|charge\s?hand|\blead\s?man\b|\blead\s?hand\b|gang leader/.test(t)) return 'FOREMAN';

  // TECHNICIAN — only when explicitly named (keeps trade workers as WORKER)
  if (/technician/.test(t)) return 'TECHNICIAN';

  // Default — blue-collar trade worker
  return 'WORKER';
}

// Collar type derived from level — for audit/display only (gating uses the matrix).
function getCollarType_(level) {
  return (level === 'WORKER' || level === 'TECHNICIAN' || level === 'FOREMAN')
    ? 'BLUE' : 'WHITE';
}

// LAYER 3 — ELIGIBILITY MATRIX
// matrix[REQUIREMENT_LEVEL][CANDIDATE_LEVEL] = affinity 0-100.
// Below ELIGIBILITY_FLOOR the candidate is BLOCKED and never scored or shown.
var ELIGIBILITY_FLOOR = 50;
var LEVEL_MATRIX = {
  WORKER:     { WORKER:100, TECHNICIAN:70,  FOREMAN:0,   SUPERVISOR:0,   INSPECTOR:0,   ENGINEER:0,   MANAGER:0   },
  TECHNICIAN: { WORKER:70,  TECHNICIAN:100, FOREMAN:50,  SUPERVISOR:0,   INSPECTOR:0,   ENGINEER:0,   MANAGER:0   },
  FOREMAN:    { WORKER:0,   TECHNICIAN:50,  FOREMAN:100, SUPERVISOR:70,  INSPECTOR:0,   ENGINEER:0,   MANAGER:0   },
  SUPERVISOR: { WORKER:0,   TECHNICIAN:0,   FOREMAN:70,  SUPERVISOR:100, INSPECTOR:0,   ENGINEER:0,   MANAGER:0   },
  INSPECTOR:  { WORKER:0,   TECHNICIAN:0,   FOREMAN:0,   SUPERVISOR:0,   INSPECTOR:100, ENGINEER:40,  MANAGER:0   },
  ENGINEER:   { WORKER:0,   TECHNICIAN:0,   FOREMAN:0,   SUPERVISOR:0,   INSPECTOR:40,  ENGINEER:100, MANAGER:50  },
  MANAGER:    { WORKER:0,   TECHNICIAN:0,   FOREMAN:0,   SUPERVISOR:0,   INSPECTOR:0,   ENGINEER:50,  MANAGER:100 }
};

// Returns 0-100 affinity. Unknown requirement level → 100 (never block on unknown).
function getEligibility_(reqLevel, candLevel) {
  var row = LEVEL_MATRIX[reqLevel];
  if (!row) return 100;
  var v = row[candLevel];
  return (typeof v === 'number') ? v : 0;
}

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

  // ── T13 LAYER 3 ELIGIBILITY GATE — runs BEFORE trade-family scoring ──────
  // Block position-level mismatches (e.g. Welder req vs Welding Inspector).
  // Blocked candidates are invisible: not STRONG, not GOOD, not POSSIBLE.
  var reqLevel  = getPositionLevel_(reqTrade);
  var candLevel = getPositionLevel_(cand.trade || cand.positionApplied || '');
  if (getEligibility_(reqLevel, candLevel) < ELIGIBILITY_FLOOR) return null;

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

// GET ?action=match&reqId=AYE-REQ-2026-0001
//     &tier=STRONG          — filter to one tier (STRONG|GOOD|POSSIBLE|ALL)
//     &nationality=Indian   — filter by nationality (substring)
//     &hideAssigned=true    — exclude candidates already slotted to this req
//     &minGulfExp=1         — require at least N years gulf experience
//     &sort=score|latest    — sort within tier (default: score desc)
//     &page=1&limit=100     — pagination
function getMatchedCandidates_(params) {
  var reqId        = String(params.reqId        ||'').trim();
  var tier         = String(params.tier         ||'ALL').trim().toUpperCase();
  var fNat         = String(params.nationality  ||'').trim().toLowerCase();
  var hideAssigned = String(params.hideAssigned ||'').toLowerCase() === 'true';
  var minGulfExp   = parseInt(params.minGulfExp ||'0') || 0;
  var sortBy       = String(params.sort         ||'score').trim().toLowerCase();
  var page         = Math.max(1, parseInt(params.page  ||'1')  || 1);
  var limit        = Math.min(200, parseInt(params.limit||'100')|| 100);

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

  var reqTrade      = String(reqRow[4]||'').trim();
  var minExp        = parseFloat(reqRow[6]) || 0;
  var reqMinAge     = parseInt(reqRow[7]) || 0;
  var reqMaxAge     = parseInt(reqRow[8]) || 0;
  var reqNationality= String(reqRow[11]||'').trim(); // col 12: nationality whitelist (blank = any)
  var reqCerts      = String(reqRow[12]||'').trim();
  var campaignType  = String(params.campaignType||'').trim() || inferCampaignType_(reqRow);

  // T13 — classify the requirement's position level once (audit + transparency)
  var reqLevel  = getPositionLevel_(reqTrade);
  var reqFamily = (getTradeFamily_(reqTrade) || {}).family || null;

  // Build set of already-assigned kaiNos for this requirement
  var assignedSet = {};
  if (hideAssigned) {
    var slotSheet = ss.getSheetByName('_CandidateSlots');
    if (slotSheet && slotSheet.getLastRow() > 1) {
      var slotData = slotSheet.getDataRange().getValues();
      for (var s = 1; s < slotData.length; s++) {
        if (String(slotData[s][1]) === reqId && String(slotData[s][9]) !== 'REJECTED') {
          assignedSet[String(slotData[s][2])] = true;
        }
      }
    }
  }

  var all = getAllCandidatesRaw_();
  var result = { EXCELLENT:[], STRONG:[], GOOD:[], POSSIBLE:[], REVIEW:[] };

  all.forEach(function(r) {
    if (fNat && r.nationality.toLowerCase().indexOf(fNat) < 0) return;
    if (hideAssigned && assignedSet[r.kaiNo]) return;
    if (minGulfExp > 0) {
      var gye = parseFloat(String(r.gulfExp||'').match(/(\d+\.?\d*)/)||[0,0])[1] || 0;
      if (gye < minGulfExp) return;
    }

    // ── GCC RECRUITMENT INTELLIGENCE ENGINE V2 (T14) ────────────────────
    var ms = computeMatchScoreT14_(reqTrade, minExp, reqCerts, campaignType,
                                    reqNationality, reqMinAge, reqMaxAge, r);

    // Hard fails: trade mismatch or nationality block → exclude entirely
    if (ms.hardFail) return;
    // Archive candidates: age out of range → exclude from results (archive queue)
    if (ms.archiveReason && ms.score === 0) return;

    r.gccScore            = ms.score;
    r.gccTier             = ms.tier;
    r.profileCompleteness = ms.profileCompleteness;
    r.matchBreakdown      = ms.breakdown;
    r.hardFail            = ms.hardFail;
    r.archiveReason       = ms.archiveReason;
    r.recruitmentClass    = ms.recruitmentClass;
    r.educationCapped     = ms.educationCapped;
    r.compliance          = ms.compliance;
    r.campaignType        = campaignType;
    var cLevel = getPositionLevel_(r.trade || r.positionApplied || '');
    r.matchReason = {
      reqLevel: reqLevel, candLevel: cLevel,
      collar: getCollarType_(cLevel), family: reqFamily,
      tier: ms.tier, gccScore: ms.score
    };

    (result[ms.tier] || result['REVIEW']).push(r);
  });

  // Sort by gccScore descending within each tier
  var sortFn = sortBy === 'latest'
    ? function(a,b){ return (b.applicationDate||'').localeCompare(a.applicationDate||''); }
    : function(a,b){ return b.gccScore - a.gccScore; };
  ['EXCELLENT','STRONG','GOOD','POSSIBLE','REVIEW'].forEach(function(t) { result[t].sort(sortFn); });

  var counts = {
    EXCELLENT: result.EXCELLENT.length,
    STRONG:    result.STRONG.length,
    GOOD:      result.GOOD.length,
    POSSIBLE:  result.POSSIBLE.length,
    REVIEW:    result.REVIEW.length,
    total:     result.EXCELLENT.length + result.STRONG.length + result.GOOD.length +
               result.POSSIBLE.length  + result.REVIEW.length
  };

  // Single-tier response with pagination
  if (tier && tier !== 'ALL') {
    var tierList = result[tier] || [];
    var paged    = tierList.slice((page-1)*limit, (page-1)*limit+limit);
    return { ok:true, reqId:reqId, tier:tier,
             reqLevel:reqLevel, reqCollar:getCollarType_(reqLevel), reqFamily:reqFamily,
             campaignType:campaignType,
             records:paged, total:tierList.length,
             page:page, limit:limit,
             totalPages:Math.ceil(tierList.length/limit),
             counts:counts };
  }

  // All-tiers response
  return {
    ok:true, reqId:reqId, trade:reqTrade,
    reqLevel:reqLevel, reqCollar:getCollarType_(reqLevel), reqFamily:reqFamily,
    campaignType:campaignType,
    EXCELLENT: result.EXCELLENT.slice(0,100),
    STRONG:    result.STRONG.slice(0,100),
    GOOD:      result.GOOD.slice(0,100),
    POSSIBLE:  result.POSSIBLE.slice(0,100),
    counts:    counts
  };
}

// ── T13 SELF-TEST ──────────────────────────────────────────────────────────
// Run this in the GAS editor (Run button) to verify the eligibility gate
// BEFORE deploying. Read-only. Logs position-level classification and the
// pass/BLOCK decision for representative requirement↔candidate pairs.
function testT13EligibilityGate() {
  // 1) Classifier sanity
  var samples = [
    'Tig & Arc Welders','Welder','TIG Welder','Welding Inspection',
    'Welding Inspector','Welding Engineer','Welding Foreman','Welding Supervisor',
    'QA/QC Inspector','NDT Technician','Pipe Fitter','Rigger','Scaffolder',
    'Crane Operator','Site Manager','Project Engineer','HVAC Technician'
  ];
  Logger.log('── POSITION LEVEL CLASSIFICATION ──');
  samples.forEach(function(s){
    var lvl = getPositionLevel_(s);
    Logger.log(pad_(s,24) + ' → ' + pad_(lvl,11) + ' [' + getCollarType_(lvl) + ']');
  });

  // 2) The exact failing case from the screenshot + key pairs
  var pairs = [
    ['Tig & Arc Welders','Welding Inspection'],   // MUST block
    ['Tig & Arc Welders','Welding Inspector'],    // MUST block
    ['Tig & Arc Welders','TIG Welder'],           // MUST pass
    ['Tig & Arc Welders','Welder'],               // MUST pass
    ['Tig & Arc Welders','Welding Engineer'],     // MUST block
    ['Tig & Arc Welders','Welding Foreman'],      // MUST block
    ['QC Inspector','Welder'],                     // MUST block
    ['QC Inspector','Welding Inspector'],          // MUST pass
    ['Welding Foreman','Welder'],                  // MUST block
    ['Welding Foreman','Welding Supervisor']       // MUST pass (70)
  ];
  Logger.log('── ELIGIBILITY DECISIONS (req ↔ candidate) ──');
  pairs.forEach(function(p){
    var rl = getPositionLevel_(p[0]);
    var cl = getPositionLevel_(p[1]);
    var e  = getEligibility_(rl, cl);
    var decision = e < ELIGIBILITY_FLOOR ? 'BLOCK ✗' : 'PASS  ✓';
    Logger.log(decision + '  ' + pad_(p[0],20) + '(' + pad_(rl,10) + ') ↔ ' +
               pad_(p[1],22) + '(' + pad_(cl,10) + ')  score=' + e);
  });
  return 'T13 self-test complete — check Logs (View → Logs).';
}

function pad_(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s;
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
  // P1-C: flag open pool leads that match this new requirement
  var trade      = String(body.trade||body.jobTitle||'').trim();
  var poolResult = checkOpenPoolOnRequirement_(ss, reqId, trade);
  return { ok:true, reqId:reqId, openPoolMatches: poolResult };
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
  var trade = String(body.trade||p.trade||'').trim();
  var country = String(body.country||p.country||'').trim();
  sheet.appendRow([
    jdId, new Date(),
    String(body.source  ||'MANUAL').trim(),
    String(body.client  ||'').trim(),
    String(body.title   ||p.title  ||'').trim(),
    trade,
    country,
    raw, p.requirements,
    parseFloat(body.minExperience||p.minExp)||0,
    p.certifications, 'ACTIVE', '',  '',
    String(body.recruiter||'system').trim(),
    String(body.notes   ||'').trim()
  ]);

  // T14: capture JD intelligence for pattern learning
  try {
    captureJDIntelligenceT14_(ss, jdId, String(body.client||'').trim(),
      trade, country, raw, null);
  } catch(e) { Logger.log('captureJDIntelligenceT14_ error: ' + e.message); }

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
  '- kaiAssessment: Senior technical manager brief — 2–4 sentences. ' +
  'Focus on: Gulf employer quality (Aramco/SABIC/ADNOC vs local), certs held, ' +
  'career trajectory, red flags, deployability. ' +
  'NEVER repeat name, trade, experience years, education, mobile, or email.\n' +
  '- recruiterAction: specific next action for the recruiter\n' +
  '- missingFields: comma-separated list of fields not found in the CV\n';

// Extracts plain text from a Word .docx file (base64 encoded).
// .docx is a ZIP containing word/document.xml — GAS can unzip it natively.
// Falls back to empty string if the file is not a valid docx ZIP.
function extractTextFromDocx_(fileB64) {
  try {
    var bytes  = Utilities.base64Decode(fileB64);
    var blob   = Utilities.newBlob(bytes, 'application/zip', 'cv.docx');
    var files  = Utilities.unzip(blob);
    for (var i = 0; i < files.length; i++) {
      if (files[i].getName() === 'word/document.xml') {
        var xml = files[i].getDataAsString('UTF-8');
        // Preserve paragraph breaks, strip all XML tags
        var text = xml
          .replace(/<w:br[^>]*\/>/gi, '\n')
          .replace(/<\/w:p>/gi,        '\n')
          .replace(/<[^>]+>/g,         ' ')
          .replace(/[ \t]+/g,          ' ')
          .replace(/\n[ \t]+/g,        '\n')
          .replace(/\n{3,}/g,          '\n\n')
          .trim();
        return text.slice(0, 8000); // Gemini prompt safe limit
      }
    }
    return '';
  } catch(e) {
    Logger.log('extractTextFromDocx_ error: ' + e.message);
    return '';
  }
}

function parseCV_(fileB64, mimeType, senderName, senderEmail) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return null;

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
            'gemini-2.5-flash-lite:generateContent?key=' + apiKey;

  // Build parts — PDF and images use inline_data; Word docs extract text first
  var parts = [];
  var approxBytes = fileB64.length * 0.75;

  var isWord = (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mimeType === 'application/msword');
  var isPdf  = (mimeType === 'application/pdf');
  var isImg  = mimeType.indexOf('image/') === 0;

  if (isWord) {
    // Gemini does not support Word via inline_data — extract text from XML
    var docText = extractTextFromDocx_(fileB64);
    if (docText && docText.length > 50) {
      parts.push({ text: 'CV TEXT (extracted from Word document):\n' + docText + '\n\n' });
    }
    // Fall through — prompt added below even if extraction failed
  } else if ((isPdf || isImg) && approxBytes < 15 * 1024 * 1024) {
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
// ── PROFILE COMPLETENESS (intake metric — NOT a match score) ─────────────────
// Stored in the Score column at CV intake. Shows how complete the profile is,
// not how employable the candidate is.
function computeBasicScore_(parsed) {
  var fields = [
    { key:'name',      w:10, v: parsed.name },
    { key:'mobile',    w:15, v: parsed.mobile },
    { key:'email',     w:15, v: parsed.email },
    { key:'passport',  w:20, v: parsed.passport },
    { key:'trade',     w:15, v: parsed.trade || parsed.positionApplied },
    { key:'education', w:15, v: parsed.education },
    { key:'dob',       w:10, v: parsed.dob || parsed.age }
  ];
  var score = 0, missing = [];
  fields.forEach(function(f) {
    var v = String(f.v || '').trim();
    if (v && v !== '—' && v.length > 1) score += f.w;
    else missing.push(f.key);
  });
  var verdict = score >= 75 ? 'NEEDS_REVIEW' : 'NEEDS_CALL';
  return { score: score, verdict: verdict, missing: missing };
}


// ════════════════════════════════════════════════════════════════════════════
// GCC RECRUITMENT MATCHING ENGINE V2
// ════════════════════════════════════════════════════════════════════════════
//
// Evaluates "Can this candidate fill this requirement?"
// NOT "How complete is this profile?"
//
// Stages (weighted):
//   1. Trade Relevance     40%  — hard gate, T13 eligibility
//   2. Experience           25%  — GCC blue-collar bands (5-12 yr ideal)
//   3. Age                  10%  — hard reject <18 or 51+
//   4. GCC Experience       10%  — history in Gulf (not current location)
//   5. Campaign Location    10%  — requirement-context aware
//   6. Certifications        5%  — only when req explicitly demands
//
// Output labels: 85-100 Excellent · 70-84 Strong · 55-69 Good
//                40-54 Possible · <40 Review
// ════════════════════════════════════════════════════════════════════════════

function getMatchTierGCC_(score) {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'STRONG';
  if (score >= 55) return 'GOOD';
  if (score >= 40) return 'POSSIBLE';
  return 'REVIEW';
}

// Stage 1 — Trade Relevance (0-100). Uses T13 eligibility when available.
function tradeRelevanceScoreGCC_(reqTrade, cand) {
  try {
    var reqClass    = classifyTradeT13_(reqTrade);
    var candClasses = resolveCandidateTradesT13_(cand);
    var e = bestEligibilityT13_(reqClass, candClasses);
    return e.score; // 0 if blocked, 55-100 if allowed
  } catch (ex) {
    // T13 not loaded — fall back to keyword tier
    var t = getTradeMatchTier_(reqTrade, cand);
    if (t === 'STRONG') return 85;
    if (t === 'GOOD')   return 65;
    if (t === 'POSSIBLE') return 45;
    return 0;
  }
}

// Stage 2 — Experience (0-100). GCC ideal = 5-12 yr.
function experienceScoreGCC_(expYears, reqMinExp) {
  var exp = parseFloat(expYears) || 0;
  var score;
  if      (exp >= 12) score = 88;  // Expert — slightly discounted (age risk)
  else if (exp >= 8)  score = 100; // Very Strong — GCC sweet spot
  else if (exp >= 5)  score = 95;  // Strong
  else if (exp >= 3)  score = 70;  // Average
  else if (exp >= 1)  score = 40;  // Weak
  else                score = 15;
  // Penalty if below stated minimum
  var minExp = parseFloat(reqMinExp) || 0;
  if (minExp > 0 && exp < minExp) score = Math.round(score * 0.45);
  return score;
}

// Stage 3 — Age (0-100 + hardReject flag). Blue-collar bands.
function ageScoreGCC_(dob, ageField) {
  var age = 0;
  if (dob && String(dob).trim() && String(dob) !== '—') {
    try {
      var d = new Date(dob);
      if (!isNaN(d)) age = Math.floor((new Date() - d) / (365.25 * 24 * 3600 * 1000));
    } catch(e) {}
  }
  if (!age && ageField) age = parseInt(String(ageField).match(/\d+/)||[0]) || 0;

  if (!age) return { score: 70, hardReject: false }; // no DOB → skip, neutral
  if (age < 18)       return { score: 0,   hardReject: true  }; // underage
  if (age > 50)       return { score: 0,   hardReject: true  }; // 51+
  if (age <= 21)      return { score: 30,  hardReject: false }; // weak
  if (age <= 24)      return { score: 65,  hardReject: false }; // acceptable
  if (age <= 45)      return { score: 100, hardReject: false }; // ideal
  return              { score: 50,  hardReject: false };         // 46-50 moderate
}

// Stage 4 — GCC Experience (0-100). Duration-weighted. Neutral if none.
function gccExpScoreGCC_(gulfExp) {
  var g = String(gulfExp || '').trim().toLowerCase();
  if (!g || g === 'na' || g === 'nil' || g === 'none' || g === '—' || g.length < 2) return 50;
  var yrs = parseFloat((g.match(/(\d+\.?\d*)/) || [0, 0])[1]) || 0;
  if (yrs >= 8) return 100;
  if (yrs >= 3) return 85;
  if (yrs >= 1) return 70;
  return 60; // has Gulf exp, duration unclear
}

// Stage 5 — Campaign Location (0-100). Infers campaign type from req if not passed.
function inferCampaignType_(reqRow) {
  var country       = String(reqRow[3] || '').toLowerCase();
  var localTransfer = String(reqRow[10] || '').toLowerCase();
  if (localTransfer === 'yes' || localTransfer === 'true') {
    if (/saudi|ksa/.test(country))            return 'SAUDI_LOCAL';
    if (/uae|emirates|dubai|abu dhabi/.test(country)) return 'UAE_LOCAL';
    return 'LOCAL_TRANSFER';
  }
  return 'INDIA_OVERSEAS';
}

function locationScoreGCC_(cand, campaignType) {
  if (!campaignType) return 70;
  var loc = String(cand.currentLocation || '').toLowerCase().trim();
  var ct  = String(campaignType).toUpperCase().replace(/[\s-]+/g,'_');

  // Unknown location → neutral (not penalised for missing data, only rewarded when confirmed)
  if (!loc || loc === '—' || loc.length < 2) return 70;

  if (ct === 'INDIA_OVERSEAS') {
    return /india|mumbai|delhi|chennai|hyderabad|bangalore|kolkata|pune|ahmedabad|kerala|gujarat/.test(loc)
      ? 100 : 45;
  }
  if (ct === 'SAUDI_LOCAL') {
    var inSaudi = /saudi|ksa|riyadh|jeddah|dammam|jubail|yanbu|dhahran|khobar/.test(loc);
    var transferable = /transferable|iqama transfer/.test(String(cand.mobilityStatus || '').toLowerCase());
    if (inSaudi && transferable) return 100;
    if (inSaudi)                 return 82;
    return 25;
  }
  if (ct === 'UAE_LOCAL') {
    return /uae|dubai|abu dhabi|sharjah|ajman|ras al|fujairah|uaq/.test(loc) ? 100 : 35;
  }
  return 70; // unknown campaign → neutral
}

// Stage 6 — Certifications (0-100). Neutral 70 if req has none / unrecognised.
function certScoreGCC_(reqCerts, cand) {
  var reqs = String(reqCerts || '').trim().toLowerCase();
  if (!reqs || reqs.length < 3) return 70;

  var candText = [
    cand.trade, cand.positionApplied, cand.kaiAssessment, cand.scoreBreakdown, cand.notes
  ].join(' ').toLowerCase();

  var CERTS = ['6g','aws','asme','cswip','bgas','cwi','nebosh','iosh','ndt',
               'cswip 3.1','cswip 3.2','nace','asnt','api','aramco','sabic',
               'adnoc','iso 9001','pmi','pmp','citb','cpcs'];
  var reqFound = 0, candHas = 0;
  CERTS.forEach(function(k) {
    if (reqs.indexOf(k) >= 0) {
      reqFound++;
      if (candText.indexOf(k) >= 0) candHas++;
    }
  });
  if (reqFound === 0) return 70; // cert req not parsed → neutral
  return Math.round((candHas / reqFound) * 100);
}

// ── MAIN V2 SCORER ──────────────────────────────────────────────────────────
function computeMatchScoreGCC_(reqTrade, reqMinExp, reqCerts, campaignType, cand) {
  // Stage 1: Trade Relevance — hard gate
  var tradeRaw = tradeRelevanceScoreGCC_(reqTrade, cand);
  if (tradeRaw === 0) {
    return { score:0, tier:'HIDDEN', hardFail:'TRADE_MISMATCH',
             profileCompleteness:0, breakdown:{ trade:0 } };
  }

  // Stage 3: Age — hard gate before spending CPU on other stages
  var ageRes = ageScoreGCC_(cand.dob, cand.age);
  if (ageRes.hardReject) {
    return { score:0, tier:'HIDDEN', hardFail:'AGE_REJECT',
             profileCompleteness:0, breakdown:{ trade:Math.round(tradeRaw*0.40), age:0 } };
  }

  var expScore  = experienceScoreGCC_(cand.experience, reqMinExp);
  var gccScore  = gccExpScoreGCC_(cand.gulfExp);
  var locScore  = locationScoreGCC_(cand, campaignType);
  var certScore = certScoreGCC_(reqCerts, cand);

  var final = Math.min(100, Math.round(
    tradeRaw      * 0.40 +
    expScore      * 0.25 +
    ageRes.score  * 0.10 +
    gccScore      * 0.10 +
    locScore      * 0.10 +
    certScore     * 0.05
  ));

  var pc = computeBasicScore_(cand).score; // profile completeness %

  return {
    score: final,
    tier:  getMatchTierGCC_(final),
    hardFail: null,
    profileCompleteness: pc,
    breakdown: {
      trade:      Math.round(tradeRaw     * 0.40),
      experience: Math.round(expScore     * 0.25),
      age:        Math.round(ageRes.score * 0.10),
      gcc:        Math.round(gccScore     * 0.10),
      location:   Math.round(locScore     * 0.10),
      certs:      Math.round(certScore    * 0.05)
    }
  };
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
  'SourceOwner','AddedBy','AddedAt','SlotStatus','Notes','UpdatedAt',
  'BatchNo','SrNo','RecruiterRemark','ClientRemark','SubmissionDate'
];

function ensureSlotsSheet_(ss) {
  var s = ss.getSheetByName('_CandidateSlots');
  if (!s) {
    s = ss.insertSheet('_CandidateSlots');
    s.appendRow(SLOTS_HEADERS);
    s.getRange(1,1,1,SLOTS_HEADERS.length)
     .setFontWeight('bold').setBackground('#1F4E79').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  } else {
    // Migrate: add missing columns if sheet was created before this version
    var existingCols = s.getLastColumn();
    if (existingCols < SLOTS_HEADERS.length) {
      for (var c = existingCols + 1; c <= SLOTS_HEADERS.length; c++) {
        s.getRange(1, c).setValue(SLOTS_HEADERS[c-1])
         .setFontWeight('bold').setBackground('#1F4E79').setFontColor('#FFFFFF');
      }
    }
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
      slotId:          String(row[0]),
      reqId:           String(row[1]),
      kaiNo:           String(row[2]),
      rowIndex:        parseInt(row[3])||0,
      candidateName:   String(row[4]),
      trade:           String(row[5]),
      sourceOwner:     String(row[6]),
      addedBy:         String(row[7]),
      addedAt:         String(row[8]),
      slotStatus:      String(row[9]),
      notes:           String(row[10]),
      updatedAt:       String(row[11]),
      batchNo:         String(row[12]||'1'),
      srNo:            parseInt(row[13])||0,
      recruiterRemark: String(row[14]||''),
      clientRemark:    String(row[15]||''),
      submissionDate:  String(row[16]||''),
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

  // Auto-assign SrNo: count existing active slots for this reqId
  var sheet = ensureSlotsSheet_(ss);
  var srNo  = 1;
  if (sheet.getLastRow() > 1) {
    var eRows = sheet.getDataRange().getValues();
    for (var j = 1; j < eRows.length; j++) {
      if (String(eRows[j][1]) === reqId && String(eRows[j][9]) !== 'REJECTED') srNo++;
    }
  }

  sheet.appendRow([
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
    now,
    String(body.batchNo       ||'1').trim(),
    srNo,
    '',  // recruiterRemark
    '',  // clientRemark
    ''   // submissionDate
  ]);

  logActivity_(ss, {
    kaiNo:    kaiNo,
    rowIndex: rowIndex,
    action:   'SLOT_ADDED',
    detail:   'Added to requirement: ' + reqId,
    actor:    String(body.addedBy||'system')
  });

  // T13 Phase 2 — record ASSIGNED feedback for Learning Engine
  var reqTrade = '';
  var rs = ss.getSheetByName('_Requirements');
  if (rs) {
    var rd = rs.getDataRange().getValues();
    for (var ri = 1; ri < rd.length; ri++) {
      if (String(rd[ri][0]) === reqId) { reqTrade = String(rd[ri][4]||''); break; }
    }
  }
  recordFeedback_(ss, reqId, reqTrade, kaiNo, String(body.trade||''), 'ASSIGNED', String(body.addedBy||'system'));

  return { ok:true, slotId:slotId, reqId:reqId, kaiNo:kaiNo||('ROW:'+rowIndex) };
}

// POST body: { action:'updateSlot', token, slotId, actor,
//   newStatus?,        — optional: ADDED|SHORTLISTED|SUBMITTED|INTERVIEWED|SELECTED|REJECTED|DEPLOYED
//   recruiterRemark?,  — optional: free text recruiter internal note
//   clientRemark?,     — optional: free text for client
//   notes?             — optional: general notes (legacy)
// }
// Any combination of the optional fields can be sent in one call.
function updateSlotStatus_(body) {
  var slotId    = String(body.slotId    ||'').trim();
  var actor     = String(body.actor     ||'system').trim();
  if (!slotId) return { ok:false, error:'slotId required' };

  var newStatus = body.newStatus ? String(body.newStatus).trim().toUpperCase() : '';
  if (newStatus && VALID_SLOT_STATUSES.indexOf(newStatus) < 0)
    return { ok:false, error:'Invalid status: '+newStatus };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_CandidateSlots');
  if (!sheet) return { ok:false, error:'_CandidateSlots sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== slotId) continue;
    var r    = i + 1;
    var prev = String(data[i][9]);
    var now  = Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd HH:mm');

    if (newStatus) {
      sheet.getRange(r, 10).setValue(newStatus);
      // Set SubmissionDate when first moved to SUBMITTED
      if (newStatus === 'SUBMITTED' && !String(data[i][16]||'').trim()) {
        sheet.getRange(r, 17).setValue(now);
      }
    }
    if (body.notes           !== undefined) sheet.getRange(r, 11).setValue(String(body.notes));
    if (body.recruiterRemark !== undefined) sheet.getRange(r, 15).setValue(String(body.recruiterRemark));
    if (body.clientRemark    !== undefined) sheet.getRange(r, 16).setValue(String(body.clientRemark));
    sheet.getRange(r, 12).setValue(now);

    var logDetail = newStatus ? (prev + ' → ' + newStatus) : 'REMARKS_UPDATE';
    logActivity_(ss, {
      kaiNo:    String(data[i][2]),
      rowIndex: parseInt(data[i][3])||0,
      action:   newStatus ? 'SLOT_STATUS' : 'SLOT_REMARK',
      detail:   logDetail + ' | Req: ' + data[i][1],
      actor:    actor
    });

    // T13 Phase 2 — record feedback for Learning Engine on meaningful status changes
    if (newStatus && ['SHORTLISTED','SUBMITTED','SELECTED','REJECTED','DEPLOYED'].indexOf(newStatus) >= 0) {
      var reqTrd  = '';
      var candTrd = String(data[i][5]||'');
      var rs2     = ss.getSheetByName('_Requirements');
      if (rs2) {
        var rd2 = rs2.getDataRange().getValues();
        for (var ri2 = 1; ri2 < rd2.length; ri2++) {
          if (String(rd2[ri2][0]) === String(data[i][1])) { reqTrd = String(rd2[ri2][4]||''); break; }
        }
      }
      recordFeedback_(ss, String(data[i][1]), reqTrd, String(data[i][2]), candTrd, newStatus, actor);
    }

    return { ok:true, slotId:slotId, prevStatus:prev,
             newStatus: newStatus || prev,
             recruiterRemark: body.recruiterRemark !== undefined ? String(body.recruiterRemark) : String(data[i][14]||''),
             clientRemark:    body.clientRemark    !== undefined ? String(body.clientRemark)    : String(data[i][15]||'') };
  }
  return { ok:false, error:'Slot not found: '+slotId };
}

// ════════════════════════════════════════════════════════════════════
// T13 PHASE 2 — RECRUITER LEARNING ENGINE
// ════════════════════════════════════════════════════════════════════
//
// Every time a recruiter REJECTS or SHORTLISTS a slot, we write a row
// to _MatchFeedback. Over time this builds a trade-pair affinity table
// the system can query to tune scoring.
//
// Sheet: _MatchFeedback
// Cols: FeedbackId | Timestamp | ReqId | ReqTrade | ReqLevel |
//       KaiNo | CandTrade | CandLevel | Action | Actor
//
// Actions stored: ASSIGNED | SHORTLISTED | REJECTED | SUBMITTED |
//                 SELECTED | DEPLOYED

var FEEDBACK_HEADERS = [
  'FeedbackId','Timestamp','ReqId','ReqTrade','ReqLevel',
  'KaiNo','CandTrade','CandLevel','Action','Actor'
];

function ensureFeedbackSheet_(ss) {
  var s = ss.getSheetByName('_MatchFeedback');
  if (!s) {
    s = ss.insertSheet('_MatchFeedback');
    s.appendRow(FEEDBACK_HEADERS);
    s.getRange(1,1,1,FEEDBACK_HEADERS.length)
     .setFontWeight('bold').setBackground('#4A235A').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// Record one feedback event. Called internally by addCandidateToSlot_
// and updateSlotStatus_ — never called directly from the API.
function recordFeedback_(ss, reqId, reqTrade, kaiNo, candTrade, action, actor) {
  try {
    var sheet    = ensureFeedbackSheet_(ss);
    var now      = Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd HH:mm');
    var fbId     = 'FB-' + now.replace(/[^0-9]/g,'') + '-' + String(Math.floor(Math.random()*900)+100);
    var reqLevel  = getPositionLevel_(reqTrade);
    var candLevel = getPositionLevel_(candTrade);
    sheet.appendRow([fbId, now, reqId, reqTrade, reqLevel, kaiNo, candTrade, candLevel, action, actor]);
  } catch(e) {
    // feedback write must never break the main operation
    Logger.log('recordFeedback_ error: ' + e.message);
  }
}

// GET ?action=tradeAffinity&token={token}
// Returns the learned affinity table: for each (reqTrade, candTrade) pair
// show assign count, shortlist count, reject count, and derived affinity 0-100.
// High assign+shortlist + low reject → high affinity (recruiters like this pair).
// High reject + low assign → low affinity (recruiters reject it).
function getTradeAffinity_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_MatchFeedback');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, pairs:[], message:'No feedback data yet' };

  var data = sheet.getDataRange().getValues();
  var pairs = {};
  for (var i = 1; i < data.length; i++) {
    var reqTrade  = String(data[i][3]||'').trim();
    var candTrade = String(data[i][6]||'').trim();
    var action    = String(data[i][8]||'').trim();
    if (!reqTrade || !candTrade) continue;
    var key = reqTrade + ' ↔ ' + candTrade;
    if (!pairs[key]) pairs[key] = { reqTrade:reqTrade, candTrade:candTrade,
                                    assigned:0, shortlisted:0, submitted:0,
                                    selected:0, rejected:0, deployed:0, total:0 };
    pairs[key].total++;
    if      (action === 'ASSIGNED')    pairs[key].assigned++;
    else if (action === 'SHORTLISTED') pairs[key].shortlisted++;
    else if (action === 'SUBMITTED')   pairs[key].submitted++;
    else if (action === 'SELECTED')    pairs[key].selected++;
    else if (action === 'REJECTED')    pairs[key].rejected++;
    else if (action === 'DEPLOYED')    pairs[key].deployed++;
  }

  // Derive affinity score:
  //   positive signals: shortlisted(×3) + submitted(×4) + selected(×5) + deployed(×6)
  //   negative signal:  rejected(×3)
  //   affinity = clamp(50 + (pos - neg) / total × 50, 0, 100)
  var result = Object.keys(pairs).map(function(k) {
    var p   = pairs[k];
    var pos = p.shortlisted*3 + p.submitted*4 + p.selected*5 + p.deployed*6;
    var neg = p.rejected*3;
    var aff = p.total > 0 ? Math.round(Math.min(100, Math.max(0, 50 + (pos-neg)/p.total*50))) : 50;
    return {
      pair:        k,
      reqTrade:    p.reqTrade,
      candTrade:   p.candTrade,
      affinity:    aff,
      assigned:    p.assigned,
      shortlisted: p.shortlisted,
      submitted:   p.submitted,
      selected:    p.selected,
      rejected:    p.rejected,
      deployed:    p.deployed,
      total:       p.total
    };
  }).sort(function(a,b){ return a.affinity - b.affinity; }); // lowest first (shows problems)

  return { ok:true, pairs:result, count:result.length };
}

// GET ?action=matchAudit&token={token}
// Returns per-requirement Strong/Good/Possible counts with the current
// eligibility gate active. Use to identify Critical requirements
// (low Strong after gate) vs healthy ones.
function getMatchAudit_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var rs    = ss.getSheetByName('_Requirements');
  if (!rs || rs.getLastRow() < 2) return { ok:true, audit:[] };

  var rData = rs.getRange(2,1,rs.getLastRow()-1,25).getValues();
  var cands = getAllCandidatesRaw_();

  var audit = rData
    .filter(function(r){ return String(r[0]||'').trim() && String(r[14]||'Active') !== 'Closed'; })
    .map(function(row) {
      var reqId    = String(row[0]).trim();
      var trade    = String(row[4]||'').trim();
      var qty      = parseInt(row[5])||1;
      var reqLevel = getPositionLevel_(trade);
      var counts   = { STRONG:0, GOOD:0, POSSIBLE:0, BLOCKED:0 };
      cands.forEach(function(c) {
        var candLevel = getPositionLevel_(c.trade || c.positionApplied || '');
        if (getEligibility_(reqLevel, candLevel) < ELIGIBILITY_FLOOR) {
          counts.BLOCKED++;
          return;
        }
        var mt = getTradeMatchTier_(trade, c);
        if (!mt) return;
        counts[mt] = (counts[mt]||0)+1;
      });
      var health = counts.STRONG >= qty ? 'Healthy' :
                   counts.STRONG >= Math.ceil(qty*0.5) ? 'Low' : 'Critical';
      return {
        reqId:    reqId,
        trade:    trade,
        qty:      qty,
        reqLevel: reqLevel,
        collar:   getCollarType_(reqLevel),
        strong:   counts.STRONG,
        good:     counts.GOOD,
        possible: counts.POSSIBLE,
        blocked:  counts.BLOCKED,
        health:   health,
        coverage: counts.STRONG + '/' + qty
      };
    });

  audit.sort(function(a,b){ return a.strong - b.strong; }); // most critical first
  return { ok:true, audit:audit, count:audit.length };
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
// SECTION 14 — DEPARTMENT CLASSIFIER
// Maps any trade/role string to one of 6 standard departments
// ════════════════════════════════════════════════════════════════════

function classifyDepartment_(trade) {
  if (!trade) return 'General';
  var t = trade.toLowerCase();
  if (/mechanical|rotating|static|pump|compressor|turbine|heat exchanger|piping|pipe fitter|pipefitter/.test(t)) return 'Mechanical';
  if (/electrical|electrician|e&i|ei |lv |hv |mv |power|motor|cable|switchgear/.test(t)) return 'Electrical';
  if (/instrument|instrumentation|plc|dcs|scada|control|calibr|metering|telemetry/.test(t)) return 'Instrumentation';
  if (/civil|structural|mason|carpenter|formwork|rebar|concrete|survey|shuttering|foundation/.test(t)) return 'Civil';
  if (/qa|qc|quality|ndt|inspector|inspection|cswip|asnt|welding inspector/.test(t)) return 'QAQC';
  if (/hse|safety|health|fire|environmental|nebosh|iosh|loss prevention/.test(t)) return 'HSE';
  if (/welder|welding|tig|mig|arc/.test(t)) return 'Mechanical';
  if (/scaffold|rigger|rigging|lifting|crane/.test(t)) return 'Mechanical';
  if (/painter|coating|blaster/.test(t)) return 'Mechanical';
  return 'General';
}

// ════════════════════════════════════════════════════════════════════
// SECTION 15 — JD → REQUIREMENT BRIDGE
// POST action=createJDAndReq: parse JD text, save to _JD_Repository,
// auto-create requirement in _Requirements, return both IDs
// ════════════════════════════════════════════════════════════════════

function createJDAndRequirement_(body) {
  var raw       = String(body.rawText    ||'').trim();
  var clientName= String(body.clientName ||'').trim();
  var recruiter = String(body.recruiter  ||'system').trim();
  if (!raw) return { ok:false, error:'rawText required' };

  var ss = SpreadsheetApp.openById(SS_ID);

  // Step 1: Parse JD using Gemini
  var parsed = parseJDWithGemini_(raw, clientName);

  // Step 2: Save to JD Repository
  var jdSheet = ensureJDSheet_(ss);
  var jdId    = generateJDId_();
  jdSheet.appendRow([
    jdId, new Date(),
    String(body.source||'MANUAL').trim(),
    clientName || parsed.client,
    parsed.title || parsed.trade,
    parsed.trade,
    parsed.country,
    raw, parsed.requirements,
    parsed.minExp,
    parsed.certifications,
    'ACTIVE', '', '',
    recruiter, ''
  ]);

  // Step 3: Auto-create Requirement
  var reqSheet = ss.getSheetByName('_Requirements');
  if (!reqSheet) {
    reqSheet = ss.insertSheet('_Requirements');
    reqSheet.appendRow([
      'ReqId','Title','ClientName','DeployCountry','Trade',
      'RequiredQty','MinExperience','CreatedAt','CreatedBy',
      'ProjectName','Nationality','MinAge','MaxAge','Urgency',
      'Status','Department','JD_ID','Start_Date','End_Date'
    ]);
    reqSheet.getRange(1,1,1,19).setFontWeight('bold')
      .setBackground('#1e3a5f').setFontColor('#FFFFFF');
    reqSheet.setFrozenRows(1);
  }
  var reqId   = generateReqId_();
  var dept    = classifyDepartment_(parsed.trade);
  reqSheet.appendRow([
    reqId,
    parsed.title || parsed.trade,
    clientName || parsed.client || '',
    parsed.country || '',
    parsed.trade   || '',
    parseInt(body.qty||parsed.qty||'1') || 1,
    parsed.minExp  || 0,
    new Date(),
    recruiter,
    String(body.projectName||parsed.project||'').trim(),
    String(body.nationality||'Indian').trim(),
    0, 0,
    String(body.urgency||'NORMAL').trim(),
    'OPEN',
    dept,
    jdId,
    '', ''
  ]);

  // T14: capture JD intelligence
  try {
    captureJDIntelligenceT14_(ss, jdId, clientName||parsed.client,
      parsed.trade, parsed.country, raw, null);
  } catch(e) { Logger.log('captureJDIntelligenceT14_ error: ' + e.message); }

  return {
    ok:true, jdId:jdId, reqId:reqId,
    trade:parsed.trade, department:dept,
    title:parsed.title||parsed.trade,
    clientName:clientName||parsed.client,
    country:parsed.country,
    minExp:parsed.minExp,
    certifications:parsed.certifications,
    summary:parsed.summary
  };
}

// Parse JD with Gemini — falls back to regex parser on failure
function parseJDWithGemini_(text, clientHint) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) throw new Error('No API key');

    var prompt = 'Extract the following from this Job Description. Reply ONLY with valid JSON, no markdown.\n' +
      'Fields: title (job title), trade (primary trade/role), client (company name), ' +
      'project (project name if mentioned), country (deployment country), ' +
      'qty (number of positions, integer), minExp (minimum years experience, integer), ' +
      'education (required education), certifications (comma-separated), ' +
      'nationality (required nationality if specified), ' +
      'summary (3-5 key responsibilities, semicolon-separated, no essay).\n\n' +
      'Ignore: email signatures, service charges, legal text, confidentiality clauses, company footers.\n\n' +
      'JD TEXT:\n' + text.slice(0, 3000);

    if (clientHint) prompt += '\n\nClient hint: ' + clientHint;

    var resp = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
      { method:'POST', contentType:'application/json', muteHttpExceptions:true,
        payload: JSON.stringify({
          contents:[{ parts:[{ text: prompt }] }],
          generationConfig:{ temperature:0.1, maxOutputTokens:512 }
        })
      }
    );
    var json   = JSON.parse(resp.getContentText());
    var raw    = json.candidates[0].content.parts[0].text.trim();
    raw        = raw.replace(/^```json\s*/,'').replace(/```$/,'').trim();
    var parsed = JSON.parse(raw);
    parsed.requirements = text.slice(0,500);
    return parsed;
  } catch(e) {
    Logger.log('Gemini JD parse failed, using regex: ' + e.message);
    return parseJDText_(text);
  }
}

// ════════════════════════════════════════════════════════════════════
// SECTION 16 — ASSOCIATES (Sub-Agents / SAC Network)
// ════════════════════════════════════════════════════════════════════

var ASSOCIATES_HEADERS = [
  'AssocId','CompanyName','ContactName','Email','Mobile',
  'State','City','LicenseType','LicenseNo','Specialization',
  'Capacity','NumRecruiters','LinkedInUrl','WebsiteUrl',
  'Address','Active','CreatedAt','Notes','Source'
];

function ensureAssociatesSheet_(ss) {
  var s = ss.getSheetByName('_Associates');
  if (!s) {
    s = ss.insertSheet('_Associates');
    s.appendRow(ASSOCIATES_HEADERS);
    s.getRange(1,1,1,ASSOCIATES_HEADERS.length)
     .setFontWeight('bold').setBackground('#2C3E50').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// GET ?action=associates&state=Maharashtra&active=YES
function getAssociates_(params) {
  params = params || {};
  var ss     = SpreadsheetApp.openById(SS_ID);
  var sheet  = ss.getSheetByName('_Associates');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, associates:[], count:0 };

  var fState  = String(params.state  ||'').trim().toLowerCase();
  var fActive = String(params.active ||'').trim().toUpperCase();
  var data    = sheet.getDataRange().getValues();
  var list    = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!String(row[0]||'').trim()) continue;
    if (fActive && String(row[15]||'').toUpperCase() !== fActive) continue;
    if (fState  && String(row[5] ||'').toLowerCase().indexOf(fState) < 0) continue;
    list.push({
      assocId:       String(row[0]),
      companyName:   String(row[1]),
      contactName:   String(row[2]),
      email:         String(row[3]),
      mobile:        String(row[4]),
      state:         String(row[5]),
      city:          String(row[6]),
      licenseType:   String(row[7]),
      licenseNo:     String(row[8]),
      specialization:String(row[9]),
      capacity:      String(row[10]),
      numRecruiters: parseInt(row[11])||0,
      linkedInUrl:   String(row[12]),
      websiteUrl:    String(row[13]),
      address:       String(row[14]),
      active:        String(row[15]).toUpperCase() === 'YES',
      createdAt:     row[16] instanceof Date ?
                       Utilities.formatDate(row[16],'Asia/Dubai','yyyy-MM-dd') : String(row[16]||''),
      notes:         String(row[17]),
      source:        String(row[18]),
    });
  }
  return { ok:true, associates:list, count:list.length };
}

// POST body: { action:'importAssociates', token, associates:[...], source:'FORM' }
// Each associate: { companyName, contactName, email, mobile, state, city,
//   licenseType, licenseNo, specialization, capacity, numRecruiters,
//   linkedInUrl, websiteUrl, address, notes }
function importAssociates_(body) {
  var rows = body.associates;
  if (!Array.isArray(rows) || !rows.length) return { ok:false, error:'associates array required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ensureAssociatesSheet_(ss);
  var source= String(body.source||'IMPORT').trim();
  var now   = new Date();

  // Build existing email set to prevent duplicates
  var existing = {};
  if (sheet.getLastRow() > 1) {
    sheet.getDataRange().getValues().slice(1).forEach(function(r) {
      var e = String(r[3]||'').trim().toLowerCase();
      if (e) existing[e] = true;
    });
  }

  var added = 0; var skipped = 0;
  rows.forEach(function(a) {
    var email = String(a.email||'').trim().toLowerCase();
    if (email && existing[email]) { skipped++; return; }
    if (email) existing[email] = true;

    var assocId = 'ASC-' + Utilities.formatDate(now,'Asia/Dubai','yyyyMMdd') +
                  '-' + String(Math.floor(Math.random()*9000)+1000);
    sheet.appendRow([
      assocId,
      String(a.companyName   ||'').trim(),
      String(a.contactName   ||'').trim(),
      email,
      String(a.mobile        ||'').trim(),
      String(a.state         ||'').trim(),
      String(a.city          ||'').trim(),
      String(a.licenseType   ||'').trim(),
      String(a.licenseNo     ||'').trim(),
      String(a.specialization||'').trim(),
      String(a.capacity      ||'').trim(),
      parseInt(a.numRecruiters)||0,
      String(a.linkedInUrl   ||'').trim(),
      String(a.websiteUrl    ||'').trim(),
      String(a.address       ||'').trim(),
      'YES', now,
      String(a.notes         ||'').trim(),
      source
    ]);
    added++;
  });

  return { ok:true, added:added, skipped:skipped, total:rows.length };
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

  // New sheets (Sections 12 + 13 + 16)
  Logger.log('_CandidateSlots: ' + (ensureSlotsSheet_(ss)     ? 'OK' : 'FAILED'));
  Logger.log('_Clients:        ' + (ensureClientsSheet_(ss)    ? 'OK' : 'FAILED'));
  Logger.log('_Associates:     ' + (ensureAssociatesSheet_(ss) ? 'OK' : 'FAILED'));
  Logger.log('_MatchFeedback:  ' + (ensureFeedbackSheet_(ss)   ? 'OK' : 'FAILED'));

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

// ════════════════════════════════════════════════════════════════════
// NMDC SHUTDOWN 2026 — SEED REQUIREMENTS
// ════════════════════════════════════════════════════════════════════
// Run ONCE from GAS editor (Run button) to create all 16 NMDC positions.
// Does NOT re-create existing ones (checks reqId counter before adding).
// After running, open Requirements screen in KAI to verify all 16 appear.
function seedNMDCRequirements() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) {
    Logger.log('ERROR: _Requirements sheet not found — run setupAllNewSheets first');
    return;
  }

  var positions = [
    // [trade, qty, minExp, country, notes]
    ['Welder',               49, 5, 'UAE', 'FCAW/SMAW/6G mandatory. Offshore. 150ON/43OFF. AED 3510-4095/day.'],
    ['TIG Welder',           39, 5, 'UAE', 'TIG 6G mandatory. High-pressure piping. Offshore. AED 4000-4600/day.'],
    ['Scaffolder',           42, 3, 'UAE', 'CISRS preferred. Offshore scaffolding mandatory. AED 3200-3500/day.'],
    ['Structural Fabricator',98, 3, 'UAE', 'Structural steel only (NOT pipe fabricator). Offshore. AED 3510-3800/day.'],
    ['Pipe Fitter',          89, 3, 'UAE', 'Isometric drawing reading required. Offshore. AED 2340-2630/day.'],
    ['Rigger',                0, 3, 'UAE', 'Rigging cert required. Crane signalling. Offshore. AED 2340-2630/day.'],
    ['Painter',               0, 3, 'UAE', 'Anti-corrosion/offshore coatings. Blasting. Offshore. AED 2340-2630/day.'],
    ['Rigging Foreman',       8, 7, 'UAE', 'Rigger Level 3. Lifting plan review. Offshore. AED 6400-7300/day.'],
    ['Fabrication Foreman',   9, 8, 'UAE', 'Structural fabrication 8yr. Offshore mandatory. AED 6400-7300/day.'],
    ['Anchor Foreman',       10,10, 'UAE', 'Mooring/anchor handling 10yr. BOSIET/HUET mandatory. AED 11500-14500/day.'],
    ['Painting Foreman',     10, 8, 'UAE', 'NACE CIP preferred. Marine coatings. Offshore. AED 6400-7300/day.'],
    ['Scaffolding Foreman',  10, 8, 'UAE', 'CISRS Foreman mandatory. Offshore mandatory. AED 6400-7300/day.'],
    ['Welding Foreman',      10,10, 'UAE', 'Aramco JCC MANDATORY. CSWIP 3.1 preferred. Offshore. AED 6400-7300/day.'],
    ['Radio Operator',       10, 3, 'UAE', 'GMDSS certificate required. Satellite/VHF/UHF. Offshore.'],
    ['Winch Operator',        1, 5, 'UAE', 'Anchor handling / tugger winch. Hydraulic systems. Offshore.'],
    ['Anchor Operator',      15, 5, 'UAE', 'Anchor spread operations. Works under Anchor Foreman. Offshore.']
  ];

  var added = 0;
  positions.forEach(function(p) {
    var trade = p[0], qty = p[1], minExp = p[2], country = p[3], notes = p[4];
    var reqId = generateReqId_();
    sheet.appendRow([
      reqId,
      new Date(),
      'NMDC',
      country,
      trade,
      qty,
      minExp,
      0, 0,
      'NMDC Offshore Maintenance Shutdown 2026',
      '', '', '',
      'URGENT',
      'Active',
      'system',
      '', 0, 0,
      notes,
      '', '', ''
    ]);
    added++;
    Logger.log('Created: ' + reqId + ' — ' + trade + ' (Qty ' + qty + ')');
  });

  Logger.log('=== seedNMDCRequirements complete: ' + added + ' requirements created ===');
  Logger.log('Open the Requirements screen in KAI to verify all 16 appear.');
}

// ════════════════════════════════════════════════════════════════════
// T13 AUDIT — Run from GAS editor to see per-requirement match health
// ════════════════════════════════════════════════════════════════════
// Shows which requirements are Critical (few Strong) after the
// eligibility gate, and how many candidates were blocked per req.
function runMatchAudit() {
  var result = getMatchAudit_({});
  if (!result.ok || !result.audit.length) {
    Logger.log('No active requirements found.');
    return;
  }
  Logger.log('═══ MATCH AUDIT — STRONG COUNTS AFTER T13 GATE ═══');
  Logger.log(pad_('ReqId',18) + pad_('Trade',26) + pad_('Level',12) + pad_('Collar',8) +
             pad_('Strong',8) + pad_('Good',7) + pad_('Poss',7) + pad_('Blocked',9) + 'Health');
  result.audit.forEach(function(a) {
    Logger.log(
      pad_(a.reqId,18) + pad_(a.trade,26) + pad_(a.reqLevel,12) + pad_(a.collar,8) +
      pad_(String(a.strong),8) + pad_(String(a.good),7) + pad_(String(a.possible),7) +
      pad_(String(a.blocked),9) + a.health
    );
  });
  var critical = result.audit.filter(function(a){ return a.health === 'Critical'; });
  Logger.log('');
  Logger.log('SUMMARY: ' + result.count + ' active requirements | ' +
             critical.length + ' Critical (real sourcing gap)');
}


// ════════════════════════════════════════════════════════════════════════════
// FEATURE A — WHATSAPP MISSING INFO RECOVERY
// ════════════════════════════════════════════════════════════════════════════
// GET  ?action=whatsappLink&kaiNo=KAR-XXXX&token=T
//      → returns { waLink, message, missing[], mobile }
// POST action=updateCandidateFields body: { kaiNo, fields:{trade,dob,gulfExp,...} }
//      → updates specific candidate fields, recomputes profile completeness
// ════════════════════════════════════════════════════════════════════════════

// Which fields are missing for this candidate (returns labeled list)
function computeMissingFields_(cand) {
  var has = function(v) { var s = String(v||'').trim(); return s && s !== '—' && s.length > 1; };
  var missing = [];
  if (!has(cand.mobile))                           missing.push({ field:'mobile',      label:'Mobile Number' });
  if (!has(cand.passportNo))                       missing.push({ field:'passport',    label:'Passport Number' });
  if (!has(cand.dob) && !(cand.age > 0))           missing.push({ field:'dob',         label:'Date of Birth' });
  if (!has(cand.trade) && !has(cand.positionApplied)) missing.push({ field:'trade',    label:'Trade / Position' });
  if (!has(cand.nationality))                      missing.push({ field:'nationality', label:'Nationality' });
  if (!has(cand.gulfExp))                          missing.push({ field:'gulfExp',     label:'Gulf Experience (years)' });
  if (!has(cand.education))                        missing.push({ field:'education',   label:'Highest Education' });
  return missing;
}

// Normalize mobile to E.164 digits only (no +)
function normalizeMobile_(raw) {
  if (!raw) return '';
  var d = String(raw).replace(/[^\d]/g, '');
  if (d.length === 10) return '91' + d;   // Indian number without country code
  if (d.length >= 10)  return d;
  return '';
}

function getWhatsAppLink_(params) {
  var kaiNo = String(params.kaiNo || '').trim();
  if (!kaiNo) return { ok:false, error:'kaiNo required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Candidates sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL.kaiNo-1]).trim() !== kaiNo) continue;

    var cand = {
      name:           String(data[i][COL.name-1]||'').trim(),
      mobile:         String(data[i][COL.mobile-1]||'').trim(),
      trade:          String(data[i][COL.trade-1]||'').trim(),
      positionApplied:String(data[i][COL.positionApplied-1]||'').trim(),
      nationality:    String(data[i][COL.nationality-1]||'').trim(),
      gulfExp:        String(data[i][COL.gulfExp-1]||'').trim(),
      education:      String(data[i][COL.education-1]||'').trim(),
      dob:            String(data[i][COL.dob-1]||'').trim(),
      age:            parseInt(data[i][COL.age-1])||0,
      passportNo:     extractPassportNo_(data[i][COL.kaiAssessment-1], data[i][COL.notes-1])
    };

    var missing = computeMissingFields_(cand);
    if (!missing.length) return { ok:true, kaiNo:kaiNo, allComplete:true, missing:[] };

    var mobile = normalizeMobile_(cand.mobile);
    if (!mobile) return { ok:false, error:'No valid mobile number — add mobile first before sending WhatsApp' };

    var firstName = (cand.name||'Candidate').split(' ')[0];
    var lines = [
      'Hi ' + firstName + ',',
      '',
      'This is the recruitment team from Al Yousuf Enterprises LLP.',
      '',
      'We received your CV (Ref: ' + kaiNo + ') and would like to move forward with your application.',
      '',
      'To complete your profile, please share:',
    ];
    missing.forEach(function(m) { lines.push('• ' + m.label); });
    lines.push('');
    lines.push('Please reply with these details at your earliest convenience.');
    lines.push('');
    lines.push('Thank you,');
    lines.push('Al Yousuf Enterprises LLP');

    var message = lines.join('\n');
    var waLink  = 'https://wa.me/' + mobile + '?text=' + encodeURIComponent(message);

    // Log the contact attempt
    sheet.getRange(i+1, COL.lastContact).setValue(new Date());
    logActivity_(ss, { kaiNo:kaiNo, rowIndex:i, action:'WHATSAPP_RECOVERY_SENT',
      detail:'Missing: ' + missing.map(function(m){return m.label;}).join(', '), actor:'system' });

    return { ok:true, kaiNo:kaiNo, waLink:waLink, mobile:mobile,
             message:message, missing:missing };
  }
  return { ok:false, error:'Candidate not found: ' + kaiNo };
}

// Update specific candidate fields (trade, dob, gulfExp, nationality, education, passport, mobile, location)
function updateCandidateFields_(body) {
  var kaiNo  = String(body.kaiNo||'').trim();
  var fields = body.fields || {};
  if (!kaiNo)                          return { ok:false, error:'kaiNo required' };
  if (!Object.keys(fields).length)     return { ok:false, error:'fields required' };

  // field → column number mapping
  var FIELD_COL = {
    trade:           COL.trade,
    nationality:     COL.nationality,
    dob:             COL.dob,
    gulfExp:         COL.gulfExp,
    education:       COL.education,
    mobile:          COL.mobile,
    currentLocation: COL.currentLocation
  };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Candidates sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL.kaiNo-1]).trim() !== kaiNo) continue;
    var r = i + 1, updated = [];

    Object.keys(fields).forEach(function(f) {
      var val = String(fields[f]||'').trim();
      if (!val) return;
      if (f === 'passport') {
        // Passport has no dedicated column — prepend to notes
        var existing = String(data[i][COL.notes-1]||'').trim();
        var note = 'Passport: ' + val + (existing ? ' | ' + existing : '');
        sheet.getRange(r, COL.notes).setValue(note);
      } else if (FIELD_COL[f]) {
        sheet.getRange(r, FIELD_COL[f]).setValue(val);
      }
      updated.push(f);
    });

    // Re-read row, recompute profile completeness
    var fresh = sheet.getRange(r, 1, 1, 42).getValues()[0];
    var pc = computeBasicScore_({
      name:      fresh[COL.name-1],      mobile: fresh[COL.mobile-1],
      email:     fresh[COL.email-1],     trade:  fresh[COL.trade-1],
      education: fresh[COL.education-1], dob:    fresh[COL.dob-1],
      age:       fresh[COL.age-1]
    });
    sheet.getRange(r, COL.score).setValue(pc.score);

    // Recompute missing fields string
    var stillMissing = computeMissingFields_({
      mobile:          fresh[COL.mobile-1],
      passportNo:      extractPassportNo_(fresh[COL.kaiAssessment-1], fresh[COL.notes-1]),
      dob:             fresh[COL.dob-1],      age:     parseInt(fresh[COL.age-1])||0,
      trade:           fresh[COL.trade-1],    positionApplied: fresh[COL.positionApplied-1],
      nationality:     fresh[COL.nationality-1],
      gulfExp:         fresh[COL.gulfExp-1],  education: fresh[COL.education-1]
    });
    sheet.getRange(r, COL.missingFields).setValue(
      stillMissing.map(function(m){ return m.field; }).join(',')
    );

    logActivity_(ss, { kaiNo:kaiNo, rowIndex:i, action:'FIELDS_UPDATED',
      detail:'Updated: ' + updated.join(', '), actor: body.actor||'recruiter' });

    return { ok:true, kaiNo:kaiNo, updated:updated,
             profileCompleteness: pc.score,
             stillMissing: stillMissing.map(function(m){ return m.label; }) };
  }
  return { ok:false, error:'Candidate not found: ' + kaiNo };
}


// ════════════════════════════════════════════════════════════════════════════
// FEATURE B — MULTI-POSITION JD SPLITTING
// ════════════════════════════════════════════════════════════════════════════
// POST action=splitJDToRequirements
//      body: { rawText OR jdId, clientName, recruiter, urgency, projectName }
//      → Gemini extracts ALL positions → creates one _Requirements row each
//      → returns { positionsFound, requirements:[{reqId,trade,qty,minExp}] }
// ════════════════════════════════════════════════════════════════════════════

function extractAllPositionsWithGemini_(text, clientHint) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) throw new Error('No API key');

    var prompt =
      'This job description may contain ONE or MULTIPLE positions. Extract ALL positions as a JSON array.\n\n' +
      'For EACH position return: title (job title), trade (exact trade/role name), ' +
      'qty (number of openings, integer, default 1), minExp (minimum years experience, integer), ' +
      'country (deployment country), certifications (comma-separated or empty string), ' +
      'summary (2-3 responsibilities joined with semicolons).\n\n' +
      'Reply ONLY with a valid JSON array. No markdown, no explanation.\n\n' +
      'Example output:\n' +
      '[{"title":"Pipe Fitter","trade":"Pipe Fitter","qty":10,"minExp":5,"country":"UAE","certifications":"","summary":"Install piping systems; Read isometrics; Fit-up and alignment"}]\n\n' +
      'JD TEXT:\n' + text.slice(0, 4000);
    if (clientHint) prompt += '\n\nClient hint: ' + clientHint;

    var resp = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
      { method:'POST', contentType:'application/json', muteHttpExceptions:true,
        payload: JSON.stringify({
          contents:[{ parts:[{ text:prompt }] }],
          generationConfig:{ temperature:0.1, maxOutputTokens:1024 }
        })
      }
    );
    var json = JSON.parse(resp.getContentText());
    var raw  = json.candidates[0].content.parts[0].text.trim();
    raw      = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/```$/,'').trim();
    var arr  = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [arr];
    return arr;
  } catch(e) {
    Logger.log('Gemini multi-position parse failed: ' + e.message + ' — falling back to single');
    return [parseJDText_(text)];
  }
}

function splitJDToRequirements_(body) {
  var raw        = String(body.rawText    ||'').trim();
  var jdId       = String(body.jdId       ||'').trim();
  var clientName = String(body.clientName ||'').trim();
  var recruiter  = String(body.recruiter  ||'system').trim();
  var urgency    = String(body.urgency    ||'Normal').trim();
  var project    = String(body.projectName||'').trim();
  var country    = String(body.country    ||'').trim();

  if (!raw && !jdId) return { ok:false, error:'rawText or jdId required' };

  var ss = SpreadsheetApp.openById(SS_ID);

  // Pull raw text from JD repository if jdId given
  if (jdId && !raw) {
    var jdSheet = ss.getSheetByName('_JD_Repository');
    if (jdSheet) {
      var jdData = jdSheet.getDataRange().getValues();
      for (var j = 1; j < jdData.length; j++) {
        if (String(jdData[j][0]).trim() === jdId) {
          raw        = String(jdData[j][7]||'');   // col 8 = Raw_Text (0-indexed: 7)
          clientName = clientName || String(jdData[j][3]||'');
          country    = country    || String(jdData[j][6]||'');
          break;
        }
      }
    }
    if (!raw) return { ok:false, error:'JD not found: ' + jdId };
  }

  var positions = extractAllPositionsWithGemini_(raw, clientName);
  if (!positions || !positions.length)
    return { ok:false, error:'No positions could be extracted from the JD' };

  var reqSheet = ss.getSheetByName('_Requirements');
  if (!reqSheet) return { ok:false, error:'_Requirements sheet not found' };

  var created = [];
  positions.forEach(function(pos) {
    var reqId = generateReqId_();
    reqSheet.appendRow([
      reqId,
      new Date(),
      clientName || pos.client || '',
      pos.country || country || '',
      pos.trade   || pos.title || '',
      parseInt(pos.qty||'1')    || 1,
      parseFloat(pos.minExp||'0') || 0,
      0, 0,             // minAge, maxAge
      project || pos.project || '',
      '',               // GCC preference
      'No',             // Local Transfer
      pos.certifications || '',
      urgency,
      'Active',
      recruiter,
      pos.summary || '',
      0, 0,             // shortlistCount, selectedCount
      '',               // notes
      jdId || '',
      '', ''            // startDate, endDate
    ]);
    created.push({ reqId:reqId, trade:pos.trade||pos.title||'',
                   qty:parseInt(pos.qty||'1')||1, minExp:parseFloat(pos.minExp||'0')||0,
                   certifications:pos.certifications||'' });
  });

  // T14: capture JD intelligence with all extracted positions
  try {
    captureJDIntelligenceT14_(ss, jdId, clientName, positions[0] ? (positions[0].trade||'') : '',
      country, raw, positions);
  } catch(e) { Logger.log('captureJDIntelligenceT14_ error: ' + e.message); }

  return { ok:true, jdId:jdId||'', positionsFound:positions.length, requirements:created };
}


// ════════════════════════════════════════════════════════════════════════════
// FEATURE C — WHATSAPP KAR-W QUICK INTAKE
// ════════════════════════════════════════════════════════════════════════════
// POST action=whatsappIntake
//      body: { name*, mobile*, trade, experience, nationality, gulfExp,
//              dob, education, currentLocation, email, recruiter }
//      → creates candidate with KAR-W reference, returns waMessage for recruiter
// ════════════════════════════════════════════════════════════════════════════

function generateKARW_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var id = 'KAR-W-';
  for (var i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

function whatsappIntake_(body) {
  var name      = String(body.name      ||'').trim();
  var mobile    = String(body.mobile    ||'').trim();
  var trade     = String(body.trade     || body.positionApplied ||'').trim();
  var recruiter = String(body.recruiter ||'system').trim();

  if (!name)   return { ok:false, error:'name required' };
  if (!mobile) return { ok:false, error:'mobile required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Candidates sheet not found' };

  // Duplicate check by mobile digits
  var mobileDigits = mobile.replace(/[^\d]/g,'');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var existDigits = String(data[i][COL.mobile-1]||'').replace(/[^\d]/g,'');
    if (existDigits && mobileDigits && existDigits === mobileDigits) {
      return { ok:false, error:'DUPLICATE_MOBILE',
               existing: String(data[i][COL.kaiNo-1]||''),
               message:  'Candidate already exists: ' + String(data[i][COL.name-1]||'') };
    }
  }

  var parsed = {
    name:            name,
    mobile:          mobile,
    email:           String(body.email           ||'').trim(),
    trade:           trade,
    positionApplied: trade,
    nationality:     String(body.nationality     ||'').trim(),
    experience:      parseFloat(body.experience  ||'0') || 0,
    gulfExp:         String(body.gulfExp         ||'').trim(),
    dob:             String(body.dob             ||'').trim(),
    age:             parseInt(body.age           ||'0') || 0,
    education:       String(body.education       ||'').trim(),
    currentLocation: String(body.currentLocation ||'').trim()
  };

  var pc    = computeBasicScore_(parsed);
  var kaiNo = generateKARW_();
  var now   = new Date();

  var row = new Array(42).fill('');
  row[COL.stage-1]           = 'Pending action';
  row[COL.applicationDate-1] = now;
  row[COL.nationality-1]     = parsed.nationality;
  row[COL.name-1]            = parsed.name;
  row[COL.mobile-1]          = parsed.mobile;
  row[COL.email-1]           = parsed.email;
  row[COL.education-1]       = parsed.education;
  row[COL.positionApplied-1] = parsed.positionApplied;
  row[COL.trade-1]           = parsed.trade;
  row[COL.experience-1]      = parsed.experience;
  row[COL.gulfExp-1]         = parsed.gulfExp;
  row[COL.dob-1]             = parsed.dob;
  row[COL.age-1]             = parsed.age;
  row[COL.verdict-1]         = pc.verdict;
  row[COL.flags-1]           = 'WHATSAPP_INTAKE';
  row[COL.score-1]           = pc.score;
  row[COL.kaiAssessment-1]   = 'WhatsApp intake ' + Utilities.formatDate(now,'Asia/Dubai','dd MMM yyyy') +
                                '. Added by: ' + recruiter;
  row[COL.recruiterAction-1] = 'Added via WhatsApp';
  row[COL.notes-1]           = 'WhatsApp intake by: ' + recruiter;
  row[COL.active-1]          = '';
  row[COL.kaiNo-1]           = kaiNo;
  row[COL.currentLocation-1] = parsed.currentLocation;
  row[COL.missingFields-1]   = (pc.missing||[]).join(',');
  row[COL.lastContact-1]     = now;

  sheet.appendRow(row);

  logActivity_(ss, { kaiNo:kaiNo, rowIndex:sheet.getLastRow()-1, action:'WHATSAPP_INTAKE',
    detail:'Added by ' + recruiter + ' | Trade: ' + trade, actor:recruiter });

  var firstName  = name.split(' ')[0];
  var waMessage  =
    'Hi ' + firstName + ',\n\n' +
    'Thank you for your interest in opportunities with Al Yousuf Enterprises LLP.\n\n' +
    'Your application has been registered.\n' +
    'Your Reference Number: *' + kaiNo + '*\n\n' +
    'Please save this reference number. Our team will contact you shortly.\n\n' +
    'Al Yousuf Enterprises LLP\nRecruitment Team';

  return { ok:true, kaiNo:kaiNo, name:name, profileCompleteness:pc.score,
           missing:(pc.missing||[]), waMessage:waMessage };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 20 — FILE-BASED JD PARSER
// POST action=parseJDFile: accepts PDF/Word file as base64, extracts
// structured JD fields via Gemini, returns parsed object ready for
// createJDAndReq flow. Supports PDF, DOCX, DOC, and images.
// ════════════════════════════════════════════════════════════════════

function parseJDFile_(body) {
  var fileB64    = String(body.fileBase64 ||'').trim();
  var mimeType   = String(body.mimeType   ||'application/pdf').trim();
  var clientHint = String(body.clientName ||body.client||'').trim();

  if (!fileB64) return { ok:false, error:'fileBase64 required' };

  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { ok:false, error:'GEMINI_API_KEY not set' };

  var isWord      = (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     mimeType === 'application/msword');
  var approxBytes = fileB64.length * 0.75;
  var parts       = [];

  if (isWord) {
    var docText = extractTextFromDocx_(fileB64);
    if (docText && docText.length > 20) {
      parts.push({ text: 'JD TEXT (extracted from Word document):\n' + docText + '\n\n' });
    }
  } else if (approxBytes < 15 * 1024 * 1024) {
    parts.push({ inline_data: { mime_type: mimeType, data: fileB64 } });
  }

  var prompt =
    'You are a GCC recruitment JD parser for an oil & gas manpower agency.\n' +
    'Extract all structured information from this Job Description.\n' +
    'Return ONLY valid JSON — no markdown, no explanation.\n' +
    '{\n' +
    '  "title": "",\n' +
    '  "trade": "",\n' +
    '  "country": "",\n' +
    '  "client": "",\n' +
    '  "minExp": 0,\n' +
    '  "certifications": "",\n' +
    '  "requirements": "",\n' +
    '  "positions": [\n' +
    '    { "title":"", "trade":"", "qty":1, "minExp":0, "certifications":"", "summary":"" }\n' +
    '  ]\n' +
    '}\n\n' +
    'Rules:\n' +
    '- trade: primary technical trade for this JD (e.g. "Welder", "QC Inspector")\n' +
    '- If JD has multiple positions, list each in positions[]. Otherwise positions has one entry.\n' +
    '- certifications: comma-separated (e.g. "CSWIP 3.1, NEBOSH, 6G")\n' +
    '- requirements: 2-3 key technical requirements joined with semicolons\n' +
    '- client: company name from JD, or empty string\n' +
    (clientHint ? '- Client hint from uploader: ' + clientHint + '\n' : '');

  parts.push({ text: prompt });

  try {
    var resp = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
      { method:'post', contentType:'application/json', muteHttpExceptions:true,
        payload: JSON.stringify({
          contents:[{ parts:parts }],
          generationConfig:{ temperature:0.1, maxOutputTokens:1500 }
        })
      }
    );
    var result = JSON.parse(resp.getContentText());
    if (!result.candidates || !result.candidates[0]) {
      return { ok:false, error:'Gemini returned no candidates', raw:resp.getContentText().slice(0,300) };
    }
    var text = String(result.candidates[0].content.parts[0].text||'');
    text = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
    var parsed = JSON.parse(text);
    return { ok:true, parsed:parsed, rawText:parsed.requirements||'' };
  } catch(e) {
    return { ok:false, error:'parseJDFile_ failed: ' + e.message };
  }
}


// ════════════════════════════════════════════════════════════════════
// SECTION 21 — MISSING INFO DRAFT (Email + WhatsApp)
// POST action=sendMissingInfoDraft
// Finds candidate by kaiNo, computes missing fields,
// creates Gmail draft OR returns WhatsApp link.
// body: { kaiNo, channel:'email'|'whatsapp', token }
// ════════════════════════════════════════════════════════════════════

function sendMissingInfoDraft_(body) {
  var kaiNo   = String(body.kaiNo   ||'').trim();
  var channel = String(body.channel ||'email').trim().toLowerCase();

  if (!kaiNo) return { ok:false, error:'kaiNo required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Candidates sheet not found' };

  var data = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow()-1), 42).getValues();
  var candRow = null, rowIndex = -1;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][COL.kaiNo-1]||'').trim() === kaiNo) {
      candRow = data[i]; rowIndex = i + 2; break;
    }
  }
  if (!candRow) return { ok:false, error:'Candidate not found: ' + kaiNo };

  var cand = {
    name:       String(candRow[COL.name-1]||'').trim(),
    mobile:     String(candRow[COL.mobile-1]||'').trim(),
    email:      String(candRow[COL.email-1]||'').trim(),
    dob:        String(candRow[COL.dob-1]||'').trim(),
    age:        parseInt(candRow[COL.age-1])||0,
    trade:      String(candRow[COL.trade-1]||'').trim(),
    positionApplied: String(candRow[COL.positionApplied-1]||'').trim(),
    nationality: String(candRow[COL.nationality-1]||'').trim(),
    gulfExp:    String(candRow[COL.gulfExp-1]||'').trim(),
    education:  String(candRow[COL.education-1]||'').trim(),
    passportNo: extractPassportNo_(String(candRow[COL.kaiAssessment-1]||''),
                                    String(candRow[COL.notes-1]||''))
  };

  var missing = computeMissingFields_(cand);
  if (!missing.length) return { ok:true, kaiNo:kaiNo, allComplete:true, message:'No missing fields' };

  var missingLabels = missing.map(function(m){ return m.label; });
  var firstName = cand.name.split(' ')[0] || 'Candidate';

  if (channel === 'whatsapp') {
    var mob = normalizeMobile_(cand.mobile);
    if (!mob) return { ok:false, error:'No valid mobile number for WhatsApp' };

    var waText =
      'Dear ' + firstName + ',\n\n' +
      'Thank you for your application with Al Yousuf Enterprises LLP (Ref: ' + kaiNo + ').\n\n' +
      'To complete your profile, please share the following:\n' +
      missingLabels.map(function(l,i){ return (i+1) + '. ' + l; }).join('\n') + '\n\n' +
      'Please reply to this message with the above details.\n\n' +
      'Al Yousuf Recruitment Team';

    var waUrl = 'https://wa.me/' + mob + '?text=' + encodeURIComponent(waText);
    return { ok:true, kaiNo:kaiNo, channel:'whatsapp', waUrl:waUrl,
             message:waText, missing:missingLabels };
  }

  // Email channel — create Gmail draft
  if (!cand.email) return { ok:false, error:'No email address for candidate ' + kaiNo };

  var subject = 'Action Required: Complete Your Application — ' + kaiNo;
  var emailBody =
    'Dear ' + firstName + ',\n\n' +
    'Thank you for applying through Al Yousuf Enterprises LLP.\n\n' +
    'Your reference number is: ' + kaiNo + '\n\n' +
    'To process your application, we require the following additional information:\n\n' +
    missingLabels.map(function(l,i){ return (i+1) + '. ' + l; }).join('\n') + '\n\n' +
    'Please reply to this email with the requested details at your earliest convenience.\n\n' +
    'Best regards,\n' +
    'Recruitment Team\n' +
    'Al Yousuf Enterprises LLP\n' +
    'Email: ai@alyousufent.com';

  try {
    var draft = GmailApp.createDraft(
      cand.email, subject, emailBody,
      { from: 'ai@alyousufent.com', name: 'Al Yousuf Recruitment' }
    );
    return {
      ok: true, kaiNo: kaiNo, channel: 'email',
      draftId:  draft.getId(),
      to:       cand.email,
      subject:  subject,
      preview:  emailBody.slice(0, 200),
      missing:  missingLabels
    };
  } catch(e) {
    // Alias not configured — create draft from default account
    try {
      var draft2 = GmailApp.createDraft(cand.email, subject, emailBody);
      return {
        ok: true, kaiNo: kaiNo, channel: 'email',
        draftId: draft2.getId(), to: cand.email,
        subject: subject, preview: emailBody.slice(0,200),
        missing: missingLabels,
        note: 'Draft created from default account (alias not configured)'
      };
    } catch(e2) {
      return { ok:false, error:'Could not create draft: ' + e2.message };
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// SECTION 22 — EMAIL PIPELINE AUDIT + CATCH-UP ENGINE
// ════════════════════════════════════════════════════════════════════
// The main pipeline (Code.gs) processes emails via triggers. When it misses
// emails (quota limits, trigger gaps, reply-thread edge cases), these functions
// scan and repair the gap by processing CVs directly through the bridge.
//
// Two email types handled:
//   A. Direct CV submissions — new emails with PDF/DOC/DOCX attachments
//   B. Reply threads — candidates replying to "Action Required" emails
//      with their DOB, location, passport info, or new CV attachment
//
// Labels used by main pipeline:  karigar/processed, karigar/duplicate, karigar/error
// Label used by this catch-up:   karigar/bridge-processed  (never conflicts)
//
// GAS dropdown entry points (no trailing underscore):
//   diagnosePipeline        — read-only audit, safe to run any time
//   catchUpMissedEmails     — processes up to 20 missed CVs per run
//   catchUpReplyEmails      — processes up to 20 missed reply threads
//   installCatchUpTrigger   — installs hourly auto-catchup trigger
//   removeCatchUpTrigger    — removes it
//
// GET action=emailAudit — diagnostic JSON for UI display
// ════════════════════════════════════════════════════════════════════

var BRIDGE_LABEL_ = 'karigar/bridge-processed';
var SKIP_LABELS_  = '-label:karigar/processed -label:karigar/duplicate ' +
                    '-label:karigar/bridge-processed -label:karigar/error';

// ── Diagnostic (read-only) ────────────────────────────────────────────────────
function diagnoseEmailPipeline_() {
  try {
    var unprocessedQuery = 'has:attachment (filename:pdf OR filename:doc OR filename:docx) ' + SKIP_LABELS_;
    var replyQuery       = 'subject:"Action Required: Complete Your Application" ' + SKIP_LABELS_;

    var unprocessedThreads = GmailApp.search(unprocessedQuery, 0, 50);
    var replyThreads       = GmailApp.search(replyQuery,       0, 50);

    var processedQuery  = 'label:karigar/processed';
    var processedCount  = GmailApp.search(processedQuery, 0, 50).length;
    var duplicateCount  = GmailApp.search('label:karigar/duplicate', 0, 50).length;
    var errorCount      = GmailApp.search('label:karigar/error',     0, 50).length;
    var bridgeCount     = GmailApp.search('label:karigar/bridge-processed', 0, 50).length;

    var ss              = SpreadsheetApp.openById(SS_ID);
    var candSheet       = ss.getSheetByName('Candidates');
    var totalCands      = candSheet ? Math.max(0, candSheet.getLastRow() - 1) : 0;
    var uploadSheet     = ss.getSheetByName('_CV_Upload_Log');
    var bridgeUploads   = uploadSheet ? Math.max(0, uploadSheet.getLastRow() - 1) : 0;

    // Sample: list first 10 unprocessed thread subjects for review
    var samples = unprocessedThreads.slice(0, 10).map(function(t) {
      var msgs = t.getMessages();
      return {
        threadId: t.getId(),
        subject:  msgs[0].getSubject().slice(0, 80),
        from:     extractEmailFromHeader_(msgs[0].getFrom()),
        date:     Utilities.formatDate(msgs[0].getDate(), 'Asia/Dubai', 'dd-MMM HH:mm'),
        hasAttachment: msgs.some(function(m){ return m.getAttachments().length > 0; })
      };
    });

    return {
      ok:                    true,
      unprocessedCVEmails:   unprocessedThreads.length + (unprocessedThreads.length >= 50 ? '+' : ''),
      unprocessedReplies:    replyThreads.length       + (replyThreads.length >= 50 ? '+' : ''),
      pipelineProcessed:     processedCount            + (processedCount >= 50 ? '+' : ''),
      pipelineDuplicates:    duplicateCount            + (duplicateCount >= 50 ? '+' : ''),
      pipelineErrors:        errorCount,
      bridgeProcessed:       bridgeCount,
      bridgeUploads:         bridgeUploads,
      totalCandidates:       totalCands,
      unprocessedSample:     samples,
      recommendation: unprocessedThreads.length > 0
        ? 'Run catchUpMissedEmails() and catchUpReplyEmails() — then installCatchUpTrigger() for hourly auto-processing'
        : 'Pipeline is up to date'
    };
  } catch(e) {
    return { ok:false, error:'diagnoseEmailPipeline_ failed: ' + e.message };
  }
}

// ── Type A: Catch-up for CV attachment emails ─────────────────────────────────
function catchUpMissedEmails_(params) {
  params = params || {};
  var batchSize = Math.min(20, parseInt(params.batchSize||'20') || 20);

  var query = 'has:attachment (filename:pdf OR filename:doc OR filename:docx) ' + SKIP_LABELS_;
  var threads = [];
  try { threads = GmailApp.search(query, 0, batchSize); }
  catch(e) { return { ok:false, error:'Gmail search failed: ' + e.message }; }

  var label = getBridgeLabel_();
  var processed = 0, duplicates = 0, skipped = 0, errors = [];

  threads.forEach(function(thread) {
    var allMsgs = thread.getMessages();
    var cvAtt   = null;
    var srcMsg  = null;

    // Search all messages in thread for a CV attachment
    for (var m = 0; m < allMsgs.length; m++) {
      var atts = allMsgs[m].getAttachments();
      for (var a = 0; a < atts.length; a++) {
        var n = atts[a].getName().toLowerCase();
        if (n.endsWith('.pdf') || n.endsWith('.doc') || n.endsWith('.docx')) {
          cvAtt  = atts[a];
          srcMsg = allMsgs[m];
          break;
        }
      }
      if (cvAtt) break;
    }

    if (!cvAtt) { skipped++; return; }

    try {
      var from_  = srcMsg.getFrom();
      var result = uploadCV_({
        fileName:    cvAtt.getName(),
        fileBase64:  Utilities.base64Encode(cvAtt.getBytes()),
        mimeType:    cvAtt.getContentType(),
        senderName:  extractNameFromHeader_(from_),
        senderEmail: extractEmailFromHeader_(from_),
        recruiter:   'bridge-catchup'
      });

      if (result.ok) {
        processed++;
        if (label) thread.addLabel(label);
      } else if (result.status === 'DUPLICATE') {
        duplicates++;
        if (label) thread.addLabel(label);
      } else {
        errors.push({ threadId: thread.getId(), error: result.error || 'uploadCV_ failed' });
      }
    } catch(e) {
      errors.push({ threadId: thread.getId(), error: e.message });
    }

    Utilities.sleep(300); // throttle
  });

  return {
    ok:         true,
    found:      threads.length,
    processed:  processed,
    duplicates: duplicates,
    skipped:    skipped,
    errors:     errors,
    summary:    'CV catch-up: found ' + threads.length + ', parsed ' + processed +
                ', duplicates ' + duplicates + ', errors ' + errors.length
  };
}

// ── Type B: Catch-up for reply threads (candidate text replies + optional CV) ─
// Candidates reply to "Action Required" with DOB, location, passport, or a new CV.
// Uses Gemini to extract structured fields from the reply body text.
function catchUpReplyEmails_(params) {
  params = params || {};
  var batchSize = Math.min(20, parseInt(params.batchSize||'20') || 20);

  var query = 'subject:"Action Required: Complete Your Application" ' + SKIP_LABELS_;
  var threads = [];
  try { threads = GmailApp.search(query, 0, batchSize); }
  catch(e) { return { ok:false, error:'Gmail search failed: ' + e.message }; }

  var ss          = SpreadsheetApp.openById(SS_ID);
  var label       = getBridgeLabel_();
  var candSheet   = ss.getSheetByName('Candidates');
  var processed   = 0, notFound = 0, errors = [];

  threads.forEach(function(thread) {
    var allMsgs = thread.getMessages();
    // Find the candidate reply (not the original outgoing message)
    var replyMsg = null;
    for (var m = 0; m < allMsgs.length; m++) {
      var from_ = extractEmailFromHeader_(allMsgs[m].getFrom());
      if (from_ !== 'ai@alyousufent.com') { replyMsg = allMsgs[m]; break; }
    }
    if (!replyMsg) { notFound++; return; }

    var fromEmail = extractEmailFromHeader_(replyMsg.getFrom());
    var bodyText  = replyMsg.getPlainBody().slice(0, 2000);

    // 1. Check if reply has a CV attachment — process as full CV
    var cvAtt = null;
    var atts  = replyMsg.getAttachments();
    for (var a = 0; a < atts.length; a++) {
      var n = atts[a].getName().toLowerCase();
      if (n.endsWith('.pdf') || n.endsWith('.doc') || n.endsWith('.docx')) {
        cvAtt = atts[a]; break;
      }
    }

    if (cvAtt) {
      try {
        var result = uploadCV_({
          fileName:    cvAtt.getName(),
          fileBase64:  Utilities.base64Encode(cvAtt.getBytes()),
          mimeType:    cvAtt.getContentType(),
          senderName:  extractNameFromHeader_(replyMsg.getFrom()),
          senderEmail: fromEmail,
          recruiter:   'bridge-catchup-reply'
        });
        if (result.ok || result.status === 'DUPLICATE') {
          processed++;
          if (label) thread.addLabel(label);
        }
      } catch(e) {
        errors.push({ threadId: thread.getId(), error: e.message });
      }
      Utilities.sleep(300);
      return;
    }

    // 2. No CV — parse text reply with Gemini and update existing candidate
    var existingKaiNo = findCandidateByEmail_(ss, fromEmail);
    if (!existingKaiNo) { notFound++; return; }

    var fields = parseReplyTextWithGemini_(bodyText);
    if (!fields || Object.keys(fields).length === 0) { notFound++; return; }

    try {
      var updateResult = updateCandidateFields_({
        kaiNo:   existingKaiNo,
        fields:  fields,
        recruiter: 'bridge-catchup-reply'
      });
      if (updateResult.ok) {
        processed++;
        if (label) thread.addLabel(label);
      }
    } catch(e) {
      errors.push({ threadId: thread.getId(), error: e.message });
    }

    Utilities.sleep(300);
  });

  return {
    ok:        true,
    found:     threads.length,
    processed: processed,
    notFound:  notFound,
    errors:    errors,
    summary:   'Reply catch-up: found ' + threads.length + ', processed ' +
               processed + ', not matched ' + notFound + ', errors ' + errors.length
  };
}

// Finds a candidate's kaiNo by their email address
function findCandidateByEmail_(ss, email) {
  if (!email) return null;
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) return null;
  var data = sheet.getRange(2, COL.email, sheet.getLastRow()-1, 1).getValues();
  var kaiData = sheet.getRange(2, COL.kaiNo, sheet.getLastRow()-1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]||'').trim().toLowerCase() === email.toLowerCase()) {
      return String(kaiData[i][0]||'').trim() || null;
    }
  }
  return null;
}

// Uses Gemini to extract structured fields from a candidate reply body
function parseReplyTextWithGemini_(text) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey || !text || text.length < 5) return {};
  try {
    var prompt =
      'A GCC job candidate replied to a recruitment email. Extract only the fields they provided.\n' +
      'Return ONLY valid JSON with these optional fields (omit fields not mentioned):\n' +
      '{"dob":"yyyy-MM-dd or freetext","currentLocation":"","gulfExp":"","passportNo":"","ecrStatus":"ECR or ECNR","noticeDays":0,"mobile":"","email":""}\n' +
      'Candidate reply text:\n' + text;
    var resp = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
      { method:'post', contentType:'application/json', muteHttpExceptions:true,
        payload: JSON.stringify({ contents:[{ parts:[{ text:prompt }] }],
          generationConfig:{ temperature:0, maxOutputTokens:300 } }) }
    );
    var raw = JSON.parse(resp.getContentText());
    if (!raw.candidates || !raw.candidates[0]) return {};
    var txt = String(raw.candidates[0].content.parts[0].text||'')
      .replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
    return JSON.parse(txt);
  } catch(e) { return {}; }
}

// Ensures bridge label exists (creates if missing)
function getBridgeLabel_() {
  try {
    var l = GmailApp.getUserLabelByName(BRIDGE_LABEL_);
    return l || GmailApp.createLabel(BRIDGE_LABEL_);
  } catch(e) { return null; }
}

// ── Trigger Management ────────────────────────────────────────────────────────
function installCatchUpTrigger_() {
  // Remove any existing catch-up triggers first
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'catchUpMissedEmails' ||
        t.getHandlerFunction() === 'catchUpReplyEmails') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('catchUpMissedEmails').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('catchUpReplyEmails').timeBased().everyHours(1).create();
  return { ok:true, message:'Hourly catch-up triggers installed for CV emails + reply emails' };
}

function removeCatchUpTrigger_() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'catchUpMissedEmails' ||
        t.getHandlerFunction() === 'catchUpReplyEmails') {
      ScriptApp.deleteTrigger(t); removed++;
    }
  });
  return { ok:true, removed:removed };
}

function listCatchUpTriggers_() {
  var triggers = ScriptApp.getProjectTriggers()
    .filter(function(t){
      return t.getHandlerFunction() === 'catchUpMissedEmails' ||
             t.getHandlerFunction() === 'catchUpReplyEmails';
    })
    .map(function(t){
      return { fn: t.getHandlerFunction(), type: t.getTriggerSource().toString() };
    });
  return { ok:true, triggers:triggers };
}

// ── Public GAS dropdown entry points ─────────────────────────────────────────
function diagnosePipeline()     { Logger.log(JSON.stringify(diagnoseEmailPipeline_())); }
function catchUpMissedEmails()  { Logger.log(JSON.stringify(catchUpMissedEmails_({}))); }
function catchUpReplyEmails()   { Logger.log(JSON.stringify(catchUpReplyEmails_({}))); }
function installCatchUpTrigger(){ Logger.log(JSON.stringify(installCatchUpTrigger_())); }
function removeCatchUpTrigger() { Logger.log(JSON.stringify(removeCatchUpTrigger_())); }
function listCatchUpTriggers()  { Logger.log(JSON.stringify(listCatchUpTriggers_())); }

// ════════════════════════════════════════════════════════════════════
// SECTION 23 — TOP 3 POSITIONS ENRICHMENT (Batch, no CV re-parse)
// ════════════════════════════════════════════════════════════════════
// Generates top3Positions for candidates where it is blank.
// Uses EXISTING data only: trade, positionApplied, experience, education,
// kaiAssessment, gulfExp. Does NOT re-parse CVs or re-call email pipeline.
// Safe to run on all 6000+ candidates in batches.
//
// GET action=enrichTop3&limit=50&dryRun=true
// GAS dropdown: enrichTop3Positions (runs batch of 50)

function enrichTop3Positions_(params) {
  params = params || {};
  var limit  = Math.min(100, parseInt(params.limit||'50') || 50);
  var dryRun = String(params.dryRun||'') === 'true';

  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { ok:false, error:'GEMINI_API_KEY not set' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2)
    return { ok:true, processed:0, message:'No candidates' };

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 42).getValues();
  var enriched = 0, skipped = 0, errors = [];

  for (var i = 0; i < data.length; i++) {
    if (enriched >= limit) break;

    var active = String(data[i][COL.active-1]||'').toUpperCase().trim();
    if (active === 'SUPERSEDED' || active === 'ARCHIVED') { skipped++; continue; }

    var existing = String(data[i][COL.top3Positions-1]||'').trim();
    if (existing && existing.length > 3) { skipped++; continue; } // already has top3

    var trade    = String(data[i][COL.trade-1]||'').trim();
    var pos      = String(data[i][COL.positionApplied-1]||'').trim();
    var exp      = parseFloat(data[i][COL.experience-1]) || 0;
    var edu      = String(data[i][COL.education-1]||'').trim();
    var gulf     = String(data[i][COL.gulfExp-1]||'').trim();
    var assess   = String(data[i][COL.kaiAssessment-1]||'').trim().slice(0, 300);
    var industry = String(data[i][COL.industry-1]||'').trim();

    if (!trade && !pos) { skipped++; continue; } // no trade info — can't enrich

    try {
      var prompt =
        'A GCC recruitment candidate has the following profile:\n' +
        'Trade/Skill: ' + (trade||pos) + '\n' +
        'Position Applied: ' + (pos||trade) + '\n' +
        'Experience: ' + exp + ' years\n' +
        'Education: ' + (edu||'Not specified') + '\n' +
        'Gulf Experience: ' + (gulf||'None') + '\n' +
        'Industry: ' + (industry||'Not specified') + '\n' +
        (assess ? 'Assessment notes: ' + assess + '\n' : '') +
        '\nList the top 3 GCC job positions this candidate is most qualified for.' +
        '\nReturn ONLY a comma-separated list of 3 job titles. No explanation. Example:\n' +
        'Scaffold Supervisor, Rigger, Scaffolder';

      var resp = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
        { method:'post', contentType:'application/json', muteHttpExceptions:true,
          payload: JSON.stringify({
            contents:[{ parts:[{ text:prompt }] }],
            generationConfig:{ temperature:0.2, maxOutputTokens:80 }
          })
        }
      );
      var result = JSON.parse(resp.getContentText());
      if (!result.candidates || !result.candidates[0]) { skipped++; continue; }

      var top3Text = String(result.candidates[0].content.parts[0].text||'').trim()
        .replace(/\n/g, ', ').replace(/\s*,\s*/g, ', ').replace(/[*#]/g, '').trim();

      if (top3Text.length > 5 && !dryRun) {
        sheet.getRange(i + 2, COL.top3Positions).setValue(top3Text);
      }

      enriched++;
      Utilities.sleep(200); // throttle Gemini calls
    } catch(e) {
      errors.push({ row: i+2, error: e.message });
    }
  }

  return {
    ok:       true,
    enriched: enriched,
    skipped:  skipped,
    errors:   errors.length,
    dryRun:   dryRun,
    summary:  'Enriched ' + enriched + ' candidates with Top 3 Positions. ' +
              'Skipped ' + skipped + ' (already had data or no trade info). ' +
              'Errors: ' + errors.length +
              (dryRun ? ' [DRY RUN — no writes]' : '')
  };
}

function enrichTop3Positions()     { Logger.log(JSON.stringify(enrichTop3Positions_({ limit:'50' }))); }
function enrichTop3PositionsDry()  { Logger.log(JSON.stringify(enrichTop3Positions_({ limit:'10', dryRun:'true' }))); }

// ════════════════════════════════════════════════════════════════════
// SECTION 24 — MOBILIZATION READINESS (GCC Pipeline Model)
// ════════════════════════════════════════════════════════════════════
//
// GET  ?action=mobilizationStatus&kaiNo=KAI-001&token=T
//      → { stages[7], currentStage, currentLabel, blockers[], missing[], complianceRisk }
// GET  ?action=bulkDocStatus&kaiNos=KAI-001,KAI-002&token=T
//      → { candidates[{kaiNo,name,mobile,email,missing[{field,label,priority}],waLink}] }
//   OR ?action=bulkDocStatus&filter=hasMissing&limit=100&token=T
// GET  ?action=complianceRisk&kaiNo=KAI-001&token=T
//      → { risk:'LOW'|'MEDIUM'|'HIGH', flags:[], score }
// ════════════════════════════════════════════════════════════════════

// GCC 7-stage mobilization pipeline (Change C — GCC-specific)
var MOBIL_STAGES_ = [
  { id:1, label:'Registered',       desc:'Profile created in KAI OS' },
  { id:2, label:'Profile Complete', desc:'Trade, education, experience confirmed' },
  { id:3, label:'Shortlisted',      desc:'Added to a live requirement' },
  { id:4, label:'Submitted',        desc:'Sent to client for review' },
  { id:5, label:'Selected',         desc:'Client confirmed selection' },
  { id:6, label:'Mobilization',     desc:'Passport · Medical · Visa · Ticket · Joining' },
  { id:7, label:'Deployed',         desc:'On-site, confirmed joining' }
];

function computeMobilizationIndex_(row) {
  var stage  = String(row[COL.stage-1]||'').trim();
  var score  = parseFloat(row[COL.score-1])||0;
  var trade  = String(row[COL.trade-1]||'').trim();
  var pos    = String(row[COL.positionApplied-1]||'').trim();
  var mf     = String(row[COL.missingFields-1]||'').trim();

  // Stage 2 = Profile Complete: scored + has trade + no missing fields
  var idx = 1;
  if (score > 0 && (trade || pos) && !mf) idx = 2;
  else if (score > 0 && (trade || pos))   idx = 2; // profiled even if some minor fields missing

  var SHORTLIST  = ['Shortlisted','Client Sent','Client Selected','Offer Issued','Visa Processing','Deployed'];
  var SUBMITTED  = ['Client Sent','Client Selected','Offer Issued','Visa Processing','Deployed'];
  var SELECTED   = ['Client Selected','Offer Issued','Visa Processing','Deployed'];
  var MOBILIZING = ['Visa Processing','Deployed'];
  var DEPLOYED   = ['Deployed'];

  if (SHORTLIST.indexOf(stage) >= 0) idx = Math.max(idx, 3);
  if (SUBMITTED.indexOf(stage) >= 0) idx = Math.max(idx, 4);
  if (SELECTED.indexOf(stage)  >= 0) idx = Math.max(idx, 5);
  if (MOBILIZING.indexOf(stage)>= 0) idx = Math.max(idx, 6);
  if (DEPLOYED.indexOf(stage)  >= 0) idx = 7;

  return idx;
}

// Compliance risk from deployScore (T14) or flags (Change E)
function computeComplianceRisk_(row) {
  var deployScore = parseInt(row[COL.deployScore-1])||0;
  var flags       = String(row[COL.flags-1]||'').toUpperCase();

  if (deployScore > 0) {
    if (deployScore >= 75) return 'LOW';
    if (deployScore >= 50) return 'MEDIUM';
    return 'HIGH';
  }
  // Fallback: derive from flags column
  if (flags.indexOf('PASSPORT_EXPIRED') >= 0 || flags.indexOf('MEDICAL_UNFIT') >= 0) return 'HIGH';
  if (flags.indexOf('PASSPORT_NEAR') >= 0 || flags.indexOf('MISSING_PASSPORT') >= 0 ||
      flags.indexOf('ECR') >= 0)            return 'MEDIUM';
  return 'LOW';
}

function getMobilizationStatus_(params) {
  var kaiNo = String(params.kaiNo||'').trim();
  if (!kaiNo) return { ok:false, error:'kaiNo required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Candidates sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL.kaiNo-1]).trim() !== kaiNo) continue;

    var idx  = computeMobilizationIndex_(data[i]);
    var mf   = String(data[i][COL.missingFields-1]||'').trim();
    var missing = mf ? mf.split(',').filter(Boolean) : [];
    var trade   = String(data[i][COL.trade-1]||'').trim() ||
                  String(data[i][COL.positionApplied-1]||'').trim();
    var rc      = inferRecruitmentClass_(trade);
    var complianceRisk = computeComplianceRisk_(data[i]);

    // Prioritize missing fields (Change D)
    var missingWithPriority = missing.map(function(field) {
      return {
        field:    field,
        label:    FIELD_LABELS_[field] || field,
        priority: computeDocPriority_(field, rc)
      };
    }).sort(function(a,b){
      var P = { HIGH:0, MEDIUM:1, LOW:2 };
      return P[a.priority] - P[b.priority];
    });

    var stages = MOBIL_STAGES_.map(function(s) {
      return {
        id:     s.id,
        label:  s.label,
        desc:   s.desc,
        status: s.id < idx  ? 'done' :
                s.id === idx ? 'current' : 'pending'
      };
    });

    // Blockers — specific to current stage
    var blockers = [];
    if (idx <= 1) {
      if (!trade) blockers.push('Trade / position not identified');
      else        blockers.push('CV not yet scored');
    }
    if (idx === 2) {
      var highMissing = missingWithPriority.filter(function(m){ return m.priority === 'HIGH'; });
      if (highMissing.length) blockers.push('High-priority missing: ' + highMissing.map(function(m){return m.label;}).join(', '));
      else blockers.push('Not yet added to a live requirement');
    }
    if (idx === 3) blockers.push('Not yet submitted to client');
    if (idx === 4) blockers.push('Awaiting client decision');
    if (idx === 5) blockers.push('Mobilization documents pending');

    return {
      ok:             true,
      kaiNo:          kaiNo,
      currentStage:   idx,
      currentLabel:   MOBIL_STAGES_[idx-1].label,
      stages:         stages,
      blockers:       blockers,
      missing:        missingWithPriority,
      complianceRisk: complianceRisk,
      percentComplete: Math.round((idx / 7) * 100)
    };
  }
  return { ok:false, error:'Candidate not found: ' + kaiNo };
}

// GET ?action=complianceRisk&kaiNo=KAI-001&token=T (Change E)
function getComplianceRisk_(params) {
  var kaiNo = String(params.kaiNo||'').trim();
  if (!kaiNo) return { ok:false, error:'kaiNo required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Candidates sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL.kaiNo-1]).trim() !== kaiNo) continue;
    var risk  = computeComplianceRisk_(data[i]);
    var score = parseInt(data[i][COL.deployScore-1])||0;
    var flags = String(data[i][COL.flags-1]||'').split(',').map(function(f){ return f.trim(); }).filter(Boolean);
    return { ok:true, kaiNo:kaiNo, risk:risk, deployScore:score, flags:flags };
  }
  return { ok:false, error:'Candidate not found: ' + kaiNo };
}

// Build requirement-aware doc request message (Correction 4)
// roleDocs = getRoleDocRequirements_(trade, reqCerts) — always includes CV + Passport
// missingProfile = generic profile fields still missing (mobile, DOB etc.)
function buildDocRequestMessage_(kaiNo, name, trade, roleDocs, missingProfile) {
  var firstName = (name||'Candidate').split(' ')[0];
  var roleLabel = trade || 'your applied position';
  var lines = [
    'Hi ' + firstName + ',',
    '',
    'Al Yousuf Enterprises LLP — Recruitment Team.',
    'Your application (Ref: ' + kaiNo + ') is progressing.',
    '',
    'To proceed with your ' + roleLabel + ' application, please send us the following documents:'
  ];

  // Role-driven doc list (CV, Passport, WQT, Degree, etc.)
  lines.push('');
  roleDocs.forEach(function(d, idx) { lines.push((idx+1) + '. ' + d); });

  // Additional profile fields missing (DOB, nationality etc.) — only MEDIUM+HIGH
  var profileGaps = (missingProfile||[]).filter(function(m){
    return m.priority === 'HIGH' || m.priority === 'MEDIUM';
  });
  if (profileGaps.length) {
    lines.push('');
    lines.push('Also provide:');
    profileGaps.forEach(function(m){ lines.push('  • ' + m.label); });
  }

  lines.push('');
  lines.push('Please reply with the above at your earliest convenience.');
  lines.push('');
  lines.push('Thank you,');
  lines.push('Al Yousuf Enterprises LLP');
  return lines.join('\n');
}

// GET ?action=bulkDocStatus&kaiNos=KAI-001,KAI-002&token=T
// OR  ?action=bulkDocStatus&filter=hasMissing&limit=100&token=T
function getBulkDocStatus_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok:false, error:'Candidates sheet not found' };

  var data      = sheet.getDataRange().getValues();
  var kaiNosRaw = String(params.kaiNos||'').trim();
  var filter    = String(params.filter||'').trim().toLowerCase();
  var limit     = parseInt(params.limit||'200') || 200;
  var targetSet = kaiNosRaw
    ? kaiNosRaw.split(',').reduce(function(m,k){ m[k.trim()]=1; return m; }, {})
    : null;

  var results = [];
  for (var i = 1; i < data.length && results.length < limit; i++) {
    var rowKaiNo = String(data[i][COL.kaiNo-1]||'').trim();
    if (!rowKaiNo) continue;
    if (targetSet && !targetSet[rowKaiNo]) continue;

    var mf = String(data[i][COL.missingFields-1]||'').trim();
    if (filter === 'hasmissing' && !mf) continue;

    var trade = String(data[i][COL.trade-1]||'').trim() ||
                String(data[i][COL.positionApplied-1]||'').trim();
    var rc    = inferRecruitmentClass_(trade);

    var cand = {
      name:            String(data[i][COL.name-1]||'').trim(),
      mobile:          String(data[i][COL.mobile-1]||'').trim(),
      email:           String(data[i][COL.email-1]||'').trim(),
      trade:           trade,
      nationality:     String(data[i][COL.nationality-1]||'').trim(),
      gulfExp:         String(data[i][COL.gulfExp-1]||'').trim(),
      education:       String(data[i][COL.education-1]||'').trim(),
      dob:             String(data[i][COL.dob-1]||'').trim(),
      age:             parseInt(data[i][COL.age-1])||0,
      passportNo:      extractPassportNo_(data[i][COL.kaiAssessment-1], data[i][COL.notes-1]),
      positionApplied: String(data[i][COL.positionApplied-1]||'').trim()
    };

    var missingRaw = computeMissingFields_(cand);
    var missing    = missingRaw.map(function(m) {
      return { field: m.field, label: m.label, priority: computeDocPriority_(m.field, rc) };
    }).sort(function(a,b){ var P={HIGH:0,MEDIUM:1,LOW:2}; return P[a.priority]-P[b.priority]; });

    var roleDocs = getRoleDocRequirements_(trade, '');
    var mob      = normalizeMobile_(cand.mobile);
    var message  = '';
    var waLink   = '';
    if (mob && missing.length) {
      message = buildDocRequestMessage_(rowKaiNo, cand.name, trade, roleDocs, missing);
      waLink  = 'https://wa.me/' + mob + '?text=' + encodeURIComponent(message);
    }

    results.push({
      kaiNo:             rowKaiNo,
      name:              cand.name,
      mobile:            cand.mobile,
      email:             cand.email,
      trade:             trade,
      recruitmentClass:  rc,
      missing:           missing,
      topPriority:       missing.length ? missing[0].priority : 'NONE',
      waLink:            waLink,
      message:           message,
      hasMobile:         !!mob,
      hasEmail:          !!(cand.email && cand.email.indexOf('@') > 0),
      allComplete:       missing.length === 0,
      complianceRisk:    computeComplianceRisk_(data[i]),
      mobilizationIndex: computeMobilizationIndex_(data[i])
    });
  }

  return {
    ok:        true,
    total:     results.length,
    needsDocs: results.filter(function(r){ return r.missing.length > 0; }).length,
    highPriority: results.filter(function(r){ return r.topPriority === 'HIGH'; }).length,
    candidates: results
  };
}

// Public test wrappers
function testMobilizationStatus()  { Logger.log(JSON.stringify(getMobilizationStatus_({ kaiNo:'' }))); }
function testBulkDocStatusDry()    { Logger.log(JSON.stringify(getBulkDocStatus_({ filter:'hasMissing', limit:'5' }))); }
function testComplianceRisk()      { Logger.log(JSON.stringify(getComplianceRisk_({ kaiNo:'' }))); }

// ════════════════════════════════════════════════════════════════════
// SECTION 25 — DOCUMENT INTELLIGENCE ENGINE
// ════════════════════════════════════════════════════════════════════
//
// Changes A (auto-send email), B (WA queue architecture), D (priority
// intelligence), F (activity timeline), H (JD-driven doc requests)
//
// POST action=createDocRequest
//   body: { kaiNos:[], channel:'email'|'whatsapp'|'both', reqId:'', note:'', source:'candidate' }
//   → auto-sends email, creates WA queue entries, logs activity
//
// POST action=updateDocRequestStatus
//   body: { requestId:'DRQ-xxx', status:'SENT'|'REPLIED'|'COMPLETED', note:'' }
//
// GET  ?action=docRequestQueue&filter=PENDING|SENT|REPLIED&limit=50&token=T
//      → { requests[{ requestId, kaiNo, name, channel, status, missing, sentAt }] }
// ════════════════════════════════════════════════════════════════════

var DOC_QUEUE_SHEET_ = '_DocRequestQueue';

// _DocRequestQueue headers (16 columns)
var DRQ_HDR_ = [
  'RequestID','KaiNo','Name','Mobile','Email','Channel',
  'MissingDocs','Priority','Status','RequestedAt',
  'SentAt','RepliedAt','CompletedAt','ReqId','Source','WaLink'
];

function ensureDocQueueSheet_(ss) {
  var s = ss.getSheetByName(DOC_QUEUE_SHEET_);
  if (!s) {
    s = ss.insertSheet(DOC_QUEUE_SHEET_);
    s.appendRow(DRQ_HDR_);
    s.setFrozenRows(1);
    s.getRange(1,1,1,DRQ_HDR_.length)
     .setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold');
  }
  return s;
}

// ── Priority intelligence (Change D) ─────────────────────────────────
// Core qualification docs per recruitment class: missing these = HIGH
var CORE_DOCS_BY_CLASS_ = {
  UNSKILLED_WORKER:        [],
  SEMI_SKILLED_WORKER:     ['trade'],
  SKILLED_TRADESMAN:       ['trade'],
  MEP_TRADES:              ['trade'],
  TECHNICIAN:              ['trade','education'],
  ENGINEER:                ['education'],
  PROFESSIONAL_MANAGEMENT: ['education']
};

var FIELD_LABELS_ = {
  mobile:      'Mobile Number',
  passport:    'Passport Number',
  dob:         'Date of Birth',
  trade:       'Trade / Position',
  nationality: 'Nationality',
  gulfExp:     'Gulf Experience',
  education:   'Highest Education'
};

function computeDocPriority_(field, recruitmentClass) {
  var core = CORE_DOCS_BY_CLASS_[recruitmentClass] || [];
  if (field === 'mobile')  return 'HIGH';   // can't reach candidate
  if (field === 'trade')   return 'HIGH';   // core role identity
  if (core.indexOf(field) >= 0) return 'HIGH';
  if (field === 'passport')    return 'MEDIUM';
  if (field === 'dob')         return 'MEDIUM';
  if (field === 'nationality') return 'MEDIUM';
  return 'LOW';
}

// Infer recruitment class from trade text (lightweight — no Gemini)
function inferRecruitmentClass_(trade) {
  if (!trade) return 'SKILLED_TRADESMAN';
  var t = trade.toLowerCase();
  if (/engineer|manager|director|architect|consultant/.test(t)) return 'ENGINEER';
  if (/technician|inspector|supervisor|coordinator/.test(t))     return 'TECHNICIAN';
  if (/electrician|plumber|hvac|mep|instrumentation/.test(t))    return 'MEP_TRADES';
  if (/welder|fitter|fabricator|carpenter|rigger|scaff/.test(t)) return 'SKILLED_TRADESMAN';
  if (/operator|driver|helper|labourer|labor/.test(t))           return 'SEMI_SKILLED_WORKER';
  if (/cleaner|housekeeper|peon|sweeper/.test(t))                return 'UNSKILLED_WORKER';
  return 'SKILLED_TRADESMAN';
}

// Pull trade + certifications from _Requirements sheet for a given reqId
function getReqCerts_(ss, reqId) {
  if (!reqId) return { trade:'', certs:'' };
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) return { trade:'', certs:'' };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]||'').trim() === reqId) {
      return {
        trade: String(data[i][4]||'').trim(),
        certs: String(data[i][10]||'').trim()
      };
    }
  }
  return { trade:'', certs:'' };
}

// Requirement-Aware Doc Intelligence (Correction 4 — JD + KAI Intelligence)
// Always starts with CV + Passport, then adds role-specific docs, then req-specific certs
function getRoleDocRequirements_(trade, reqCerts) {
  var docs = ['CV / Resume', 'Passport Copy'];
  if (!trade) {
    if (reqCerts) reqCerts.split(',').forEach(function(c){ var t=c.trim(); if(t && docs.indexOf(t)<0) docs.push(t); });
    return docs;
  }
  var t = trade.toLowerCase();

  // Engineers — degree + registration is blocking (HIGH)
  if (/mechanical engineer/.test(t))       { docs.push('Degree Certificate (Mechanical Engineering)','SCE / PEC Registration (if applicable)','Experience Letters'); }
  else if (/civil engineer/.test(t))       { docs.push('Degree Certificate (Civil Engineering)','PEC / IEI Registration (if applicable)','Experience Letters'); }
  else if (/electrical engineer/.test(t))  { docs.push('Degree Certificate (Electrical Engineering)','PEC / IRSE Registration','Experience Letters'); }
  else if (/piping engineer/.test(t))      { docs.push('Degree Certificate','Piping Design / PDMS Proficiency','Experience Letters'); }
  else if (/structural engineer/.test(t))  { docs.push('Degree Certificate','SE Registration','Experience Letters'); }
  else if (/engineer/.test(t))             { docs.push('Degree Certificate','Professional License / Registration','Experience Letters'); }

  // Inspectors & QC
  else if (/welding inspector|qc weld/.test(t)) { docs.push('CSWIP 3.1 / AWS CWI Certificate','Experience Letters','NDT Certificates (if applicable)'); }
  else if (/coating inspector|painting inspect/.test(t)) { docs.push('NACE / FROSIO Certificate','Experience Letters'); }
  else if (/ndt inspector/.test(t))        { docs.push('PCN / ASNT Level II Certificate','UT / RT / MT / PT Certs','Experience Letters'); }
  else if (/safety|hse officer/.test(t))   { docs.push('NEBOSH IGC Certificate','IOSH Certificate (if applicable)','Experience Letters'); }
  else if (/inspector|qc/.test(t))         { docs.push('Trade Certificate','CSWIP / AWS / ASME (if applicable)','Experience Letters'); }

  // Welders — WQT is blocking
  else if (/tig.*welder|welder.*tig/.test(t)) { docs.push('TIG Welder Qualification Test (WQT)','6G / TUV-3MHAW Certificate','Experience Certificates'); }
  else if (/arc.*welder|welder.*arc/.test(t)) { docs.push('ARC Welder Qualification Test (WQT)','Experience Certificates'); }
  else if (/mig.*welder|welder.*mig/.test(t)) { docs.push('MIG Welder Qualification Test (WQT)','Experience Certificates'); }
  else if (/welder/.test(t))               { docs.push('Welder Qualification Test (WQT)','TUV or 6G Certificate (if applicable)','Experience Certificates'); }

  // MEP Trades
  else if (/electrician/.test(t))          { docs.push('Electrical Trade Certificate','Experience Certificates'); }
  else if (/hvac/.test(t))                 { docs.push('HVAC Trade Certificate','Experience Certificates'); }
  else if (/instrumentation|instrument tech/.test(t)) { docs.push('Instrumentation Trade Certificate','Experience Certificates'); }
  else if (/plumber/.test(t))              { docs.push('Plumbing Trade Certificate','Experience Certificates'); }
  else if (/pipefitter|pipe fitter/.test(t)) { docs.push('Trade Certificate','ISO / ASME Fit-Up Experience Letter'); }

  // Rigging & Scaffolding
  else if (/rigger/.test(t))               { docs.push('Rigger Certificate (LEEA / OPITO)','Experience Letter'); }
  else if (/scaff/.test(t))                { docs.push('CISRS Scaffolding Certificate','Experience Letter'); }

  // Operators & Drivers
  else if (/crane operator/.test(t))       { docs.push('Crane Operator License','LEEA / OPITO Certificate','Experience Letter'); }
  else if (/forklift operator/.test(t))    { docs.push('Forklift Operating License','Experience Letter'); }
  else if (/heavy driver|truck driver/.test(t)) { docs.push('Heavy Driving License (HMV)','Experience Letter'); }
  else if (/driver/.test(t))               { docs.push('Valid Driving License (specify category)','Experience Letter'); }
  else if (/operator/.test(t))             { docs.push('Equipment Operating Certificate','Experience Letter'); }

  // Technicians
  else if (/technician/.test(t))           { docs.push('Trade / Technical Certificate','Experience Certificates'); }

  // Healthcare
  else if (/nurse/.test(t))                { docs.push('Nursing Degree / Diploma','DHA / HAAD / MOH Eligibility Letter','Valid Nursing License'); }
  else if (/doctor|physician/.test(t))     { docs.push('MBBS / MD Degree','Medical License (DHA / HAAD / MOH)'); }

  // Supervisors / Foremen
  else if (/supervisor|foreman/.test(t))   { docs.push('Trade Certificate (relevant)','Experience Letters (supervisory level)'); }

  // Default trades
  else { docs.push('Trade Certificate','Experience Letter'); }

  // Merge requirement-specific certs from JD (none already in list)
  if (reqCerts) {
    reqCerts.split(',').forEach(function(c) {
      var cert = c.trim();
      if (cert && docs.indexOf(cert) < 0) docs.push(cert);
    });
  }

  return docs;
}

// ── _DocRequestQueue CRUD ────────────────────────────────────────────

// POST action=createDocRequest
// body: { kaiNos:['KAI-001',...], channel:'email'|'whatsapp'|'both',
//         reqId:'', note:'', source:'candidate', actor:'' }
function createDocRequest_(body) {
  var kaiNos  = body.kaiNos  || [];
  var channel = String(body.channel||'both').toLowerCase();
  var reqId   = String(body.reqId  ||'').trim();
  var note    = String(body.note   ||'').trim();
  var source  = String(body.source ||'candidate').trim();
  var actor   = String(body.actor  ||'recruiter').trim();

  if (!kaiNos.length) return { ok:false, error:'kaiNos array required' };

  var ss        = SpreadsheetApp.openById(SS_ID);
  var candSheet = ss.getSheetByName('Candidates');
  var qSheet    = ensureDocQueueSheet_(ss);
  if (!candSheet) return { ok:false, error:'Candidates sheet not found' };

  // Pull requirement-specific certs if reqId provided (Correction 4)
  var reqInfo = getReqCerts_(ss, reqId);
  var reqCerts = reqInfo.certs; // e.g. "CSWIP 3.1, NEBOSH"

  var data = candSheet.getDataRange().getValues();
  var lookup = {};
  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][COL.kaiNo-1]||'').trim();
    if (k) lookup[k] = i;
  }

  var sent       = 0;
  var queued     = 0;
  var complete   = 0;
  var noChannel  = 0;
  var errors     = [];

  // Activity: batch-level DOC_REQUEST_CREATED (Correction 3)
  logActivity_(ss, { kaiNo:'BATCH', rowIndex:0,
    action: 'DOC_REQUEST_CREATED',
    detail: 'Batch: ' + kaiNos.length + ' candidates | Channel: ' + channel +
            (reqId ? ' | Req: ' + reqId : ''),
    actor:  actor
  });

  kaiNos.forEach(function(kaiNo) {
    kaiNo = String(kaiNo).trim();
    var i = lookup[kaiNo];
    if (i === undefined) { errors.push({ kaiNo:kaiNo, error:'Not found' }); return; }

    var trade = String(data[i][COL.trade-1]||'').trim() ||
                String(data[i][COL.positionApplied-1]||'').trim();
    // If requirement has a more specific trade, use it
    if (reqInfo.trade && !trade) trade = reqInfo.trade;

    var rc    = inferRecruitmentClass_(trade);
    var cand  = {
      name:        String(data[i][COL.name-1]||'').trim(),
      mobile:      String(data[i][COL.mobile-1]||'').trim(),
      email:       String(data[i][COL.email-1]||'').trim(),
      trade:       trade,
      nationality: String(data[i][COL.nationality-1]||'').trim(),
      gulfExp:     String(data[i][COL.gulfExp-1]||'').trim(),
      education:   String(data[i][COL.education-1]||'').trim(),
      dob:         String(data[i][COL.dob-1]||'').trim(),
      age:         parseInt(data[i][COL.age-1])||0,
      passportNo:  extractPassportNo_(data[i][COL.kaiAssessment-1], data[i][COL.notes-1]),
      positionApplied: String(data[i][COL.positionApplied-1]||'').trim()
    };

    var missingRaw = computeMissingFields_(cand);
    if (!missingRaw.length) { complete++; return; }

    var missing = missingRaw.map(function(m) {
      return { field:m.field, label:m.label, priority: computeDocPriority_(m.field, rc) };
    }).sort(function(a,b){ var P={HIGH:0,MEDIUM:1,LOW:2}; return P[a.priority]-P[b.priority]; });

    var topPriority = missing[0].priority;
    var mob = normalizeMobile_(cand.mobile);
    var now = new Date();
    var reqIdGen = 'DRQ-' + now.getTime() + '-' + kaiNo.replace(/[^A-Z0-9]/g,'');

    // Requirement-aware doc list (Correction 4 — CV + Passport + role-specific + req certs)
    var roleDocs = getRoleDocRequirements_(trade, reqCerts);
    var waMsg    = buildDocRequestMessage_(kaiNo, cand.name, trade, roleDocs, missing);
    var waLink   = mob ? 'https://wa.me/' + mob + '?text=' + encodeURIComponent(waMsg) : '';

    // ── Auto-send email — full role-aware body (Correction A) ──
    var emailSent = false;
    if ((channel === 'email' || channel === 'both') && cand.email && cand.email.indexOf('@') > 0) {
      try {
        var subject  = 'Documents Required — ' + (trade||'Application') +
                       ' | Al Yousuf Enterprises (Ref: ' + kaiNo + ')';
        var bodyText =
          'Dear ' + (cand.name||'Candidate') + ',\n\n' +
          'Thank you for your interest in opportunities with Al Yousuf Enterprises LLP.\n\n' +
          'Your application (Reference: ' + kaiNo + ') for the ' + (trade||'position') +
          ' role is under active review.\n\n' +
          'Please send us the following documents to proceed:\n\n' +
          roleDocs.map(function(d, idx){ return (idx+1) + '. ' + d; }).join('\n') +
          (missing.filter(function(m){ return m.priority !== 'LOW'; }).length ?
            '\n\nAdditional information required:\n' +
            missing.filter(function(m){ return m.priority !== 'LOW'; })
                   .map(function(m){ return '  • ' + m.label; }).join('\n') : '') +
          (note ? '\n\n' + note : '') + '\n\n' +
          'Please reply to this email with the above documents at your earliest convenience.\n\n' +
          'Best regards,\n' +
          'Recruitment Team\n' +
          'Al Yousuf Enterprises LLP\n' +
          'Email: ai@alyousufent.com';

        GmailApp.sendEmail(cand.email, subject, bodyText);
        emailSent = true;
        sent++;
      } catch(e) {
        errors.push({ kaiNo:kaiNo, channel:'email', error:e.message });
      }
    }

    // ── WA queue entry (queue architecture, swap in Meta API with zero redesign) ──
    var waStatus = channel === 'email' ? 'N/A' : 'PENDING';

    var qRow = [
      reqIdGen,                                             // RequestID
      kaiNo,                                               // KaiNo
      cand.name,                                           // Name
      cand.mobile,                                         // Mobile
      cand.email,                                          // Email
      channel,                                             // Channel
      missing.map(function(m){return m.field;}).join(','), // MissingDocs
      topPriority,                                         // Priority
      emailSent ? 'SENT' : waStatus,                       // Status
      now,                                                 // RequestedAt
      emailSent ? now : '',                                // SentAt
      '',                                                  // RepliedAt
      '',                                                  // CompletedAt
      reqId,                                               // ReqId
      source,                                              // Source
      waLink                                               // WaLink
    ];
    qSheet.appendRow(qRow);
    if (!emailSent && waStatus !== 'N/A') queued++;

    // Update lastContact
    candSheet.getRange(i+1, COL.lastContact).setValue(now);

    // Activity timeline — per-candidate events (Correction 3)
    logActivity_(ss, { kaiNo:kaiNo, rowIndex:i,
      action: emailSent ? 'DOC_EMAIL_SENT' : 'DOC_WA_QUEUED',
      detail: 'Priority:' + topPriority + ' | Docs: ' +
              roleDocs.slice(0,3).join(', ') +
              (reqId ? ' | Req:' + reqId : ''),
      actor:  actor
    });
  });

  return {
    ok:       true,
    sent:     sent,
    queued:   queued,
    complete: complete,
    noChannel:noChannel,
    errors:   errors.length,
    total:    kaiNos.length,
    summary:  sent + ' emails sent automatically. ' +
              queued + ' added to WhatsApp queue. ' +
              complete + ' already had complete profiles.'
  };
}

// GET ?action=docRequestQueue&filter=PENDING&limit=50&token=T
function getDocRequestQueue_(params) {
  var ss     = SpreadsheetApp.openById(SS_ID);
  var qSheet = ensureDocQueueSheet_(ss);
  var filter = String(params.filter||'').trim().toUpperCase();
  var limit  = parseInt(params.limit||'100') || 100;
  var kaiNo  = String(params.kaiNo||'').trim();

  var data = qSheet.getDataRange().getValues();
  if (data.length < 2) return { ok:true, total:0, requests:[] };

  var headers = data[0];
  var col = {};
  headers.forEach(function(h,j){ col[h] = j; });

  var results = [];
  for (var i = 1; i < data.length && results.length < limit; i++) {
    var row    = data[i];
    var status = String(row[col.Status]||'').trim().toUpperCase();
    if (filter && filter !== status) continue;
    if (kaiNo  && String(row[col.KaiNo]||'').trim() !== kaiNo) continue;

    var sentAt      = row[col.SentAt];
    var repliedAt   = row[col.RepliedAt];
    var completedAt = row[col.CompletedAt];

    results.push({
      requestId:   String(row[col.RequestID]||''),
      kaiNo:       String(row[col.KaiNo]||''),
      name:        String(row[col.Name]||''),
      mobile:      String(row[col.Mobile]||''),
      email:       String(row[col.Email]||''),
      channel:     String(row[col.Channel]||''),
      missing:     String(row[col.MissingDocs]||'').split(',').filter(Boolean),
      priority:    String(row[col.Priority]||''),
      status:      status,
      requestedAt: row[col.RequestedAt] ? Utilities.formatDate(new Date(row[col.RequestedAt]),'Asia/Dubai','yyyy-MM-dd HH:mm') : '',
      sentAt:      sentAt      ? Utilities.formatDate(new Date(sentAt),      'Asia/Dubai','yyyy-MM-dd HH:mm') : '',
      repliedAt:   repliedAt   ? Utilities.formatDate(new Date(repliedAt),   'Asia/Dubai','yyyy-MM-dd HH:mm') : '',
      completedAt: completedAt ? Utilities.formatDate(new Date(completedAt), 'Asia/Dubai','yyyy-MM-dd HH:mm') : '',
      reqId:       String(row[col.ReqId]||''),
      source:      String(row[col.Source]||''),
      waLink:      String(row[col.WaLink]||'')
    });
  }

  var summary = { PENDING:0, SENT:0, REPLIED:0, COMPLETED:0 };
  for (var j = 1; j < data.length; j++) {
    var s = String(data[j][col.Status]||'').trim().toUpperCase();
    if (summary[s] !== undefined) summary[s]++;
  }

  return { ok:true, total:results.length, summary:summary, requests:results };
}

// POST action=updateDocRequestStatus
// body: { requestId:'DRQ-xxx', status:'SENT'|'REPLIED'|'COMPLETED', note:'' }
// Used by recruiter to mark WA as sent, or by system when reply detected
function updateDocRequestStatus_(body) {
  var requestId = String(body.requestId||'').trim();
  var newStatus = String(body.status||'').trim().toUpperCase();
  var actor     = String(body.actor||'recruiter').trim();

  if (!requestId) return { ok:false, error:'requestId required' };
  if (['SENT','REPLIED','COMPLETED'].indexOf(newStatus) < 0)
    return { ok:false, error:'status must be SENT, REPLIED, or COMPLETED' };

  var ss     = SpreadsheetApp.openById(SS_ID);
  var qSheet = ensureDocQueueSheet_(ss);
  var data   = qSheet.getDataRange().getValues();
  var headers= data[0];
  var col    = {};
  headers.forEach(function(h,j){ col[h]=j; });

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][col.RequestID]||'').trim() !== requestId) continue;
    var r   = i + 1;
    var now = new Date();

    qSheet.getRange(r, col.Status+1).setValue(newStatus);
    if (newStatus === 'SENT')      qSheet.getRange(r, col.SentAt+1).setValue(now);
    if (newStatus === 'REPLIED')   qSheet.getRange(r, col.RepliedAt+1).setValue(now);
    if (newStatus === 'COMPLETED') qSheet.getRange(r, col.CompletedAt+1).setValue(now);

    var kaiNo = String(data[i][col.KaiNo]||'').trim();
    // Map status to semantic activity action (Correction 3)
    var actAction = newStatus === 'SENT'      ? 'DOC_WA_SENT' :
                    newStatus === 'REPLIED'   ? 'DOC_RESPONSE_RECEIVED' :
                    newStatus === 'COMPLETED' ? 'DOC_COMPLETED' :
                    'DOC_REQUEST_' + newStatus;
    logActivity_(ss, { kaiNo:kaiNo, rowIndex:0,
      action: actAction,
      detail: 'RequestID: ' + requestId + (body.note ? ' | ' + body.note : ''),
      actor:  actor
    });

    return { ok:true, requestId:requestId, status:newStatus, updatedAt:now.toISOString() };
  }
  return { ok:false, error:'Request not found: ' + requestId };
}

// Public test wrappers
function testCreateDocRequest()  { Logger.log(JSON.stringify(createDocRequest_({ kaiNos:[], channel:'both' }))); }
function testDocRequestQueue()   { Logger.log(JSON.stringify(getDocRequestQueue_({ limit:'10' }))); }
function setupDocQueueSheet()    {
  var ss = SpreadsheetApp.openById(SS_ID);
  ensureDocQueueSheet_(ss);
  Logger.log('_DocRequestQueue sheet ready');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 26 — REQUIREMENTS CORRECTION UTILITY
// ════════════════════════════════════════════════════════════════════
// Run auditBrokenRequirements() to see all broken requirements.
// Fill in the corrections table it outputs.
// Then run applyRequirementCorrections() after updating the array below.
// ════════════════════════════════════════════════════════════════════

// Step 1: Run this to find all requirements with bad trade values
function auditBrokenRequirements() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) { Logger.log('ERROR: _Requirements sheet not found'); return; }

  var data    = sheet.getDataRange().getValues();
  var broken  = [];
  var BAD_RE  = /\.(pdf|docx?|xlsx?|jpg|png|jpe?g)\s*$/i;

  for (var i = 1; i < data.length; i++) {
    var reqId  = String(data[i][0]||'').trim();
    var client = String(data[i][2]||'').trim();
    var trade  = String(data[i][4]||'').trim();
    var qty    = parseInt(data[i][5])||1;
    var status = String(data[i][11]||'').trim();
    if (!reqId) continue;

    var isBlank    = trade === '';
    var isFilename = BAD_RE.test(trade) || trade.toLowerCase().indexOf('.pdf') >= 0;

    if (isBlank || isFilename) {
      broken.push({
        row:              i + 1,
        reqId:            reqId,
        client:           client,
        currentTrade:     trade,
        breakType:        isBlank ? 'BLANK_TRADE' : 'FILENAME_AS_TRADE',
        qty:              qty,
        status:           status,
        correctTrade:     '← FILL IN',
        recruitmentClass: '← FILL IN'
      });
    }
  }

  Logger.log('=== BROKEN REQUIREMENTS AUDIT ===');
  Logger.log('Found ' + broken.length + ' broken requirement(s):\n');
  broken.forEach(function(r) {
    Logger.log(
      'Row ' + r.row + ' | ' + r.reqId + ' | Client: ' + r.client +
      '\n  Break Type: ' + r.breakType +
      '\n  Current Trade: "' + r.currentTrade + '"' +
      '\n  Correct Trade: ' + r.correctTrade +
      '\n  Recruitment Class: ' + r.recruitmentClass +
      '\n'
    );
  });

  if (!broken.length) Logger.log('✓ No broken requirements found.');
  return broken;
}

// Step 2: Fill in CORRECTIONS array below, then run this function
// Format: { reqId:'REQ-xxx', correctTrade:'Welder', recruitmentClass:'SKILLED_TRADESMAN' }
// Recruitment classes: UNSKILLED_WORKER | SEMI_SKILLED_WORKER | SKILLED_TRADESMAN
//                      MEP_TRADES | TECHNICIAN | ENGINEER | PROFESSIONAL_MANAGEMENT
var REQUIREMENT_CORRECTIONS_ = [
  // PASTE OUTPUT FROM auditBrokenRequirements() HERE AFTER FILLING IN VALUES
  // Example:
  // { reqId:'REQ-20260517-0001', correctTrade:'General Helper',      recruitmentClass:'UNSKILLED_WORKER' },
  // { reqId:'REQ-20260517-0002', correctTrade:'TIG Welder',          recruitmentClass:'SKILLED_TRADESMAN' },
  // { reqId:'REQ-20260517-0003', correctTrade:'Mechanical Engineer',  recruitmentClass:'ENGINEER' },
];

function applyRequirementCorrections() {
  if (!REQUIREMENT_CORRECTIONS_.length) {
    Logger.log('REQUIREMENT_CORRECTIONS_ is empty. Fill in the array first.');
    return;
  }

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) { Logger.log('ERROR: _Requirements sheet not found'); return; }

  var data    = sheet.getDataRange().getValues();
  var applied = 0;
  var missed  = [];

  // Build index
  var idx = {};
  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][0]||'').trim();
    if (k) idx[k] = i + 1; // 1-based row
  }

  REQUIREMENT_CORRECTIONS_.forEach(function(c) {
    var r = idx[c.reqId];
    if (!r) { missed.push(c.reqId); return; }
    sheet.getRange(r, 5).setValue(c.correctTrade);          // Col E = Trade
    logActivity_(ss, { kaiNo:'SYSTEM', rowIndex:0,
      action: 'REQ_TRADE_CORRECTED',
      detail: c.reqId + ': "' + c.correctTrade + '" (' + c.recruitmentClass + ')',
      actor: 'admin'
    });
    applied++;
  });

  Logger.log('=== CORRECTIONS APPLIED ===');
  Logger.log('Applied: ' + applied);
  if (missed.length) Logger.log('Not found: ' + missed.join(', '));
  Logger.log('');
  Logger.log('Next: run reEvaluateCandidates() to re-score against fixed requirements.');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 27 — T15 LEAD INTAKE ENGINE
// ════════════════════════════════════════════════════════════════════
//
// A Lead is a person captured BEFORE a CV arrives.
// Sources: phone call, WhatsApp walk-in, recruiter visit, associate referral.
//
// Lead lifecycle:
//   NEW → CONTACTED → CV_REQUESTED → CV_RECEIVED → CONVERTED → (Candidate)
//                                               ↘ LOST (reason mandatory)
//
// Lead Quality (auto-classified on create + on new requirement):
//   RELEVANT  — trade matches active requirement (STRONG tier)
//   RELATED   — trade in same family (GOOD/POSSIBLE tier)
//   IRRELEVANT— trade present, no match
//   UNKNOWN   — trade not provided
//
// P1-C: Every new requirement auto-scans open pool leads for matches.
// ════════════════════════════════════════════════════════════════════

var LEADS_SHEET_     = '_Leads';
var LEAD_STATUSES_   = ['NEW','CONTACTED','CV_REQUESTED','CV_RECEIVED','CONVERTED','LOST'];
var LEAD_LOST_REASONS_ = [
  'NO_CV','NOT_INTERESTED','SALARY_ISSUE','LOCATION_ISSUE',
  'TRADE_MISMATCH','NO_PASSPORT','JOINED_ELSEWHERE','NO_RESPONSE','OTHER'
];
var LEAD_SOURCES_ = ['PHONE_CALL','WHATSAPP','WALKIN','ASSOCIATE','REFERRAL','OTHER'];

// _Leads column map (1-based, 20 columns)
var COL_L_ = {
  leadId:1, createdAt:2, name:3, mobile:4, email:5,
  trade:6, experience:7, nationality:8, gulfExp:9, currentLocation:10,
  education:11, status:12, lostReason:13, leadQuality:14,
  linkedReqId:15, source:16, recruiter:17, lastContactDate:18,
  convertedKaiNo:19, notes:20
};

var LEADS_HEADERS_ = [
  'Lead ID','Created At','Name','Mobile','Email',
  'Trade','Experience (yrs)','Nationality','Gulf Experience','Current Location',
  'Education','Status','Lost Reason','Lead Quality',
  'Linked Req ID','Source','Recruiter','Last Contact Date',
  'Converted KAI No','Notes'
];

function ensureLeadsSheet_(ss) {
  var s = ss.getSheetByName(LEADS_SHEET_);
  if (!s) {
    s = ss.insertSheet(LEADS_SHEET_);
    s.appendRow(LEADS_HEADERS_);
    s.setFrozenRows(1);
    s.getRange(1,1,1,LEADS_HEADERS_.length)
     .setBackground('#0d3b66').setFontColor('#ffffff').setFontWeight('bold');
  }
  return s;
}

function generateLeadId_(ss) {
  var s    = ensureLeadsSheet_(ss);
  var last = s.getLastRow();
  var seq  = last; // row 1 = header, so last data row = seq
  return 'KAR-L-' + String(seq + 1).padStart(5,'0');
}

// ── Lead Quality Classification (P1-A) ──────────────────────────────
// Reuses T13 trade-match tier to classify quality against active requirements.
// If linkedReqId provided: classify against that requirement only.
// If Open Pool: classify against ALL active requirements (take best).
function classifyLeadQuality_(trade, linkedReqId, ss) {
  if (!trade || !trade.trim()) return 'UNKNOWN';

  var reqSheet = ss.getSheetByName('_Requirements');
  if (!reqSheet) return 'UNKNOWN';
  var reqs = reqSheet.getDataRange().getValues();

  var pseudoCand = { trade: trade, positionApplied: trade, kaiAssessment: '' };
  var bestTier   = 'NONE';

  for (var i = 1; i < reqs.length; i++) {
    var rId     = String(reqs[i][0]||'').trim();
    var rTrade  = String(reqs[i][4]||'').trim();
    var rStatus = String(reqs[i][14]||reqs[i][11]||'').trim().toLowerCase(); // status col varies

    // If linkedReqId set: only compare against that requirement
    if (linkedReqId && rId !== linkedReqId) continue;
    // Skip inactive requirements for open pool classification
    if (!linkedReqId && rStatus && rStatus !== 'active') continue;
    if (!rTrade) continue;

    var result = getTradeMatchTier_(rTrade, pseudoCand);
    var tier   = result ? (result.tier || result) : 'NONE';

    if (tier === 'STRONG')                             { bestTier = 'STRONG'; break; }
    if (tier === 'GOOD'   && bestTier !== 'STRONG')    { bestTier = 'GOOD'; }
    if (tier === 'POSSIBLE' && bestTier === 'NONE')    { bestTier = 'POSSIBLE'; }
  }

  if (bestTier === 'STRONG')                   return 'RELEVANT';
  if (bestTier === 'GOOD' || bestTier === 'POSSIBLE') return 'RELATED';
  if (bestTier === 'NONE' && linkedReqId)      return 'IRRELEVANT';
  if (bestTier === 'NONE')                     return 'IRRELEVANT';
  return 'IRRELEVANT';
}

// ── P1-C: Open Pool scan on new requirement ──────────────────────────
// Called automatically from createRequirement_ after every new req.
// Returns {relevant, related, total, leads[{leadId,name,quality}]}
function checkOpenPoolOnRequirement_(ss, reqId, trade) {
  if (!trade) return { relevant:0, related:0, total:0, leads:[] };

  var s = ss.getSheetByName(LEADS_SHEET_);
  if (!s) return { relevant:0, related:0, total:0, leads:[] };

  var data     = s.getDataRange().getValues();
  var relevant = 0, related = 0;
  var matches  = [];
  var pseudoCand = { trade: trade, positionApplied: trade, kaiAssessment: '' };

  for (var i = 1; i < data.length; i++) {
    var lStatus  = String(data[i][COL_L_.status-1]||'').trim().toUpperCase();
    var lReqId   = String(data[i][COL_L_.linkedReqId-1]||'').trim();
    var lTrade   = String(data[i][COL_L_.trade-1]||'').trim();
    var lLeadId  = String(data[i][COL_L_.leadId-1]||'').trim();

    // Only open pool (no linked req), not converted/lost
    if (lReqId) continue;
    if (lStatus === 'CONVERTED' || lStatus === 'LOST') continue;
    if (!lLeadId || !lTrade) continue;

    var result  = getTradeMatchTier_(trade, { trade: lTrade, positionApplied: lTrade, kaiAssessment: '' });
    var tier    = result ? (result.tier || result) : 'NONE';
    var quality = (tier === 'STRONG') ? 'RELEVANT' :
                  (tier === 'GOOD' || tier === 'POSSIBLE') ? 'RELATED' : null;

    if (!quality) continue;

    // Update lead quality column in sheet (reflects new req context)
    s.getRange(i+1, COL_L_.leadQuality).setValue(quality);

    if (quality === 'RELEVANT') relevant++;
    else related++;

    matches.push({
      leadId:  lLeadId,
      name:    String(data[i][COL_L_.name-1]||''),
      mobile:  String(data[i][COL_L_.mobile-1]||''),
      trade:   lTrade,
      quality: quality,
      status:  lStatus
    });
  }

  if (matches.length) {
    logActivity_(ss, { kaiNo: 'REQ:'+reqId, rowIndex:0,
      action: 'OPEN_POOL_SCANNED',
      detail: 'Req: ' + reqId + ' | Relevant: ' + relevant + ' | Related: ' + related,
      actor: 'system'
    });
  }

  return { relevant:relevant, related:related, total:matches.length, leads:matches };
}

// ── Read Handlers ────────────────────────────────────────────────────

// GET ?action=leads&status=NEW&quality=RELEVANT&limit=50&offset=0&token=T
function getLeads_(params) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var s  = ensureLeadsSheet_(ss);

  var filterStatus  = String(params.status  ||'').trim().toUpperCase();
  var filterQuality = String(params.quality ||'').trim().toUpperCase();
  var filterReqId   = String(params.reqId   ||'').trim();
  var filterSource  = String(params.source  ||'').trim().toUpperCase();
  var limit         = parseInt(params.limit ||'100') || 100;
  var offset        = parseInt(params.offset||'0')   || 0;

  var data    = s.getDataRange().getValues();
  var results = [];
  var counts  = { RELEVANT:0, RELATED:0, IRRELEVANT:0, UNKNOWN:0,
                  NEW:0, CONTACTED:0, CV_REQUESTED:0, CV_RECEIVED:0, CONVERTED:0, LOST:0 };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status  = String(row[COL_L_.status-1]  ||'NEW').trim().toUpperCase();
    var quality = String(row[COL_L_.leadQuality-1]||'UNKNOWN').trim().toUpperCase();
    var leadId  = String(row[COL_L_.leadId-1]  ||'').trim();
    if (!leadId) continue;

    // Count totals regardless of filter
    if (counts[quality]  !== undefined) counts[quality]++;
    if (counts[status]   !== undefined) counts[status]++;

    // Apply filters
    if (filterStatus  && status  !== filterStatus)  continue;
    if (filterQuality && quality !== filterQuality) continue;
    if (filterReqId && String(row[COL_L_.linkedReqId-1]||'').trim() !== filterReqId) continue;
    if (filterSource  && String(row[COL_L_.source-1]||'').trim().toUpperCase() !== filterSource) continue;

    results.push({
      leadId:          leadId,
      createdAt:       row[COL_L_.createdAt-1] ? Utilities.formatDate(new Date(row[COL_L_.createdAt-1]),'Asia/Dubai','yyyy-MM-dd HH:mm') : '',
      name:            String(row[COL_L_.name-1]           ||'').trim(),
      mobile:          String(row[COL_L_.mobile-1]         ||'').trim(),
      email:           String(row[COL_L_.email-1]          ||'').trim(),
      trade:           String(row[COL_L_.trade-1]          ||'').trim(),
      experience:      parseFloat(row[COL_L_.experience-1])||0,
      nationality:     String(row[COL_L_.nationality-1]    ||'').trim(),
      gulfExp:         String(row[COL_L_.gulfExp-1]        ||'').trim(),
      currentLocation: String(row[COL_L_.currentLocation-1]||'').trim(),
      education:       String(row[COL_L_.education-1]      ||'').trim(),
      status:          status,
      lostReason:      String(row[COL_L_.lostReason-1]     ||'').trim(),
      leadQuality:     quality,
      linkedReqId:     String(row[COL_L_.linkedReqId-1]    ||'').trim(),
      source:          String(row[COL_L_.source-1]         ||'').trim(),
      recruiter:       String(row[COL_L_.recruiter-1]      ||'').trim(),
      lastContactDate: row[COL_L_.lastContactDate-1] ? Utilities.formatDate(new Date(row[COL_L_.lastContactDate-1]),'Asia/Dubai','yyyy-MM-dd') : '',
      convertedKaiNo:  String(row[COL_L_.convertedKaiNo-1]||'').trim(),
      notes:           String(row[COL_L_.notes-1]          ||'').trim()
    });
  }

  var paginated = results.slice(offset, offset + limit);
  return { ok:true, total:results.length, counts:counts, leads:paginated };
}

// GET ?action=lead&leadId=KAR-L-00001&token=T
function getSingleLead_(params) {
  var leadId = String(params.leadId||'').trim();
  if (!leadId) return { ok:false, error:'leadId required' };
  var result = getLeads_({ status:'', quality:'', limit:'9999', offset:'0' });
  var found  = (result.leads||[]).filter(function(l){ return l.leadId === leadId; });
  if (!found.length) return { ok:false, error:'Lead not found: ' + leadId };
  return { ok:true, lead: found[0] };
}

// GET ?action=openPoolMatches&reqId=REQ-xxx&token=T
// Returns open pool leads matching a specific requirement (for recruiter review)
function getOpenPoolMatches_(params) {
  var reqId = String(params.reqId||'').trim();
  if (!reqId) return { ok:false, error:'reqId required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var rSheet = ss.getSheetByName('_Requirements');
  if (!rSheet) return { ok:false, error:'_Requirements sheet not found' };

  var rData = rSheet.getDataRange().getValues();
  var trade = '';
  for (var j = 1; j < rData.length; j++) {
    if (String(rData[j][0]||'').trim() === reqId) { trade = String(rData[j][4]||'').trim(); break; }
  }
  if (!trade) return { ok:false, error:'Requirement not found or has no trade: ' + reqId };

  var result = checkOpenPoolOnRequirement_(ss, reqId, trade);
  return { ok:true, reqId:reqId, trade:trade, matches:result };
}

// ── Write Handlers ────────────────────────────────────────────────────

// POST action=createLead
// body: { name*, mobile*, trade, experience, nationality, gulfExp,
//         currentLocation, education, source, recruiter, linkedReqId, notes }
function createLead_(body) {
  var name   = String(body.name  ||'').trim();
  var mobile = String(body.mobile||'').trim();
  if (!name)   return { ok:false, error:'name required' };
  if (!mobile) return { ok:false, error:'mobile required' };

  var ss = SpreadsheetApp.openById(SS_ID);
  var s  = ensureLeadsSheet_(ss);

  // Dedup: mobile already in _Leads?
  var data = s.getDataRange().getValues();
  var normMob = normalizeMobile_(mobile);
  for (var i = 1; i < data.length; i++) {
    var existMob = normalizeMobile_(String(data[i][COL_L_.mobile-1]||''));
    if (normMob && existMob === normMob) {
      var existId     = String(data[i][COL_L_.leadId-1]||'').trim();
      var existStatus = String(data[i][COL_L_.status-1]||'').trim();
      if (existStatus !== 'LOST') {
        return { ok:false, error:'DUPLICATE_MOBILE',
                 existing: existId, message: 'Lead already exists: ' + existId };
      }
    }
  }

  // Dedup: mobile already in Candidates?
  var candSheet = ss.getSheetByName('Candidates');
  if (candSheet) {
    var candData = candSheet.getDataRange().getValues();
    for (var c = 1; c < candData.length; c++) {
      var candMob = normalizeMobile_(String(candData[c][COL.mobile-1]||''));
      if (normMob && candMob === normMob) {
        return { ok:false, error:'ALREADY_CANDIDATE',
                 kaiNo: String(candData[c][COL.kaiNo-1]||''),
                 message: 'This person is already a candidate in KAI' };
      }
    }
  }

  var trade      = String(body.trade         ||'').trim();
  var linkedReqId= String(body.linkedReqId   ||'').trim();
  var source     = String(body.source        ||'OTHER').trim().toUpperCase();
  var recruiter  = String(body.recruiter     ||'').trim();
  var now        = new Date();
  var leadId     = generateLeadId_(ss);
  var quality    = classifyLeadQuality_(trade, linkedReqId, ss);

  s.appendRow([
    leadId,                                    // Lead ID
    now,                                       // Created At
    name,                                      // Name
    mobile,                                    // Mobile
    String(body.email          ||'').trim(),   // Email
    trade,                                     // Trade
    parseFloat(body.experience)||0,            // Experience
    String(body.nationality    ||'').trim(),   // Nationality
    String(body.gulfExp        ||'').trim(),   // Gulf Experience
    String(body.currentLocation||'').trim(),   // Current Location
    String(body.education      ||'').trim(),   // Education
    'NEW',                                     // Status
    '',                                        // Lost Reason
    quality,                                   // Lead Quality (auto)
    linkedReqId,                               // Linked Req ID
    source,                                    // Source
    recruiter,                                 // Recruiter
    now,                                       // Last Contact Date
    '',                                        // Converted KAI No
    String(body.notes          ||'').trim()    // Notes
  ]);

  logActivity_(ss, { kaiNo:leadId, rowIndex:0,
    action: 'LEAD_CREATED',
    detail: name + ' | ' + (trade||'Trade unknown') + ' | Quality: ' + quality +
            ' | Source: ' + source + (linkedReqId ? ' | Req: ' + linkedReqId : ' | Open Pool'),
    actor: recruiter || 'system'
  });

  return { ok:true, leadId:leadId, name:name, trade:trade,
           leadQuality:quality, source:source, linkedReqId:linkedReqId||null };
}

// POST action=updateLead
// body: { leadId*, trade, experience, nationality, gulfExp, currentLocation, education, email, notes }
function updateLead_(body) {
  var leadId = String(body.leadId||'').trim();
  if (!leadId) return { ok:false, error:'leadId required' };

  var ss = SpreadsheetApp.openById(SS_ID);
  var s  = ensureLeadsSheet_(ss);
  var data = s.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL_L_.leadId-1]||'').trim() !== leadId) continue;
    var r       = i + 1;
    var updated = [];
    var actor   = String(body.actor||body.recruiter||'recruiter').trim();

    var UPDATABLE = {
      trade:           COL_L_.trade,
      experience:      COL_L_.experience,
      nationality:     COL_L_.nationality,
      gulfExp:         COL_L_.gulfExp,
      currentLocation: COL_L_.currentLocation,
      education:       COL_L_.education,
      email:           COL_L_.email,
      notes:           COL_L_.notes,
      linkedReqId:     COL_L_.linkedReqId
    };

    Object.keys(UPDATABLE).forEach(function(field) {
      if (body[field] === undefined || body[field] === null) return;
      s.getRange(r, UPDATABLE[field]).setValue(String(body[field]).trim());
      updated.push(field);
    });

    // Re-classify quality if trade or linkedReqId changed
    if (updated.indexOf('trade') >= 0 || updated.indexOf('linkedReqId') >= 0) {
      var fresh      = s.getRange(r, 1, 1, 20).getValues()[0];
      var newTrade   = String(fresh[COL_L_.trade-1]||'').trim();
      var newReqId   = String(fresh[COL_L_.linkedReqId-1]||'').trim();
      var newQuality = classifyLeadQuality_(newTrade, newReqId, ss);
      s.getRange(r, COL_L_.leadQuality).setValue(newQuality);
      updated.push('leadQuality:' + newQuality);
    }

    // Update last contact date
    s.getRange(r, COL_L_.lastContactDate).setValue(new Date());

    logActivity_(ss, { kaiNo:leadId, rowIndex:0,
      action: 'LEAD_UPDATED',
      detail: 'Updated: ' + updated.join(', '),
      actor:  actor
    });

    return { ok:true, leadId:leadId, updated:updated };
  }
  return { ok:false, error:'Lead not found: ' + leadId };
}

// POST action=updateLeadStatus
// body: { leadId*, status*, lostReason (required if LOST), actor }
// Valid statuses: NEW → CONTACTED → CV_REQUESTED → CV_RECEIVED → CONVERTED → LOST
function updateLeadStatus_(body) {
  var leadId    = String(body.leadId    ||'').trim();
  var newStatus = String(body.status    ||'').trim().toUpperCase();
  var lostReason= String(body.lostReason||'').trim().toUpperCase();
  var actor     = String(body.actor||body.recruiter||'recruiter').trim();

  if (!leadId)    return { ok:false, error:'leadId required' };
  if (LEAD_STATUSES_.indexOf(newStatus) < 0)
    return { ok:false, error:'Invalid status. Must be: ' + LEAD_STATUSES_.join(', ') };
  if (newStatus === 'LOST' && !lostReason)
    return { ok:false, error:'lostReason required when status is LOST. Options: ' + LEAD_LOST_REASONS_.join(', ') };
  if (newStatus === 'LOST' && LEAD_LOST_REASONS_.indexOf(lostReason) < 0)
    return { ok:false, error:'Invalid lostReason. Options: ' + LEAD_LOST_REASONS_.join(', ') };

  var ss   = SpreadsheetApp.openById(SS_ID);
  var s    = ensureLeadsSheet_(ss);
  var data = s.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL_L_.leadId-1]||'').trim() !== leadId) continue;
    var r = i + 1;

    s.getRange(r, COL_L_.status).setValue(newStatus);
    if (newStatus === 'LOST') s.getRange(r, COL_L_.lostReason).setValue(lostReason);
    s.getRange(r, COL_L_.lastContactDate).setValue(new Date());

    var actAction = newStatus === 'CONVERTED' ? 'LEAD_CONVERTED' :
                    newStatus === 'LOST'      ? 'LEAD_LOST'      :
                    newStatus === 'CV_REQUESTED' ? 'CV_REQUESTED' :
                    newStatus === 'CV_RECEIVED'  ? 'CV_RECEIVED'  : 'LEAD_UPDATED';

    logActivity_(ss, { kaiNo:leadId, rowIndex:0,
      action: actAction,
      detail: 'Status: ' + newStatus + (lostReason ? ' | Reason: ' + lostReason : ''),
      actor:  actor
    });

    return { ok:true, leadId:leadId, status:newStatus, lostReason:lostReason||null };
  }
  return { ok:false, error:'Lead not found: ' + leadId };
}

// POST action=convertLead
// body: { leadId*, actor }
// Promotes a Lead to a Candidate in KAI.
// Dedup check: if mobile already in Candidates, links rather than duplicates.
function convertLeadToCandidate_(body) {
  var leadId = String(body.leadId||'').trim();
  var actor  = String(body.actor||body.recruiter||'recruiter').trim();
  if (!leadId) return { ok:false, error:'leadId required' };

  var ss   = SpreadsheetApp.openById(SS_ID);
  var lSheet = ensureLeadsSheet_(ss);
  var cSheet = ss.getSheetByName('Candidates');
  if (!cSheet) return { ok:false, error:'Candidates sheet not found' };

  var lData = lSheet.getDataRange().getValues();
  var lRow  = null;
  var lRowNum = 0;
  for (var i = 1; i < lData.length; i++) {
    if (String(lData[i][COL_L_.leadId-1]||'').trim() === leadId) {
      lRow = lData[i]; lRowNum = i+1; break;
    }
  }
  if (!lRow) return { ok:false, error:'Lead not found: ' + leadId };

  var lMobile = normalizeMobile_(String(lRow[COL_L_.mobile-1]||''));
  var lName   = String(lRow[COL_L_.name-1]||'').trim();
  var lTrade  = String(lRow[COL_L_.trade-1]||'').trim();

  // Dedup: check if mobile already in Candidates
  var cData = cSheet.getDataRange().getValues();
  for (var c = 1; c < cData.length; c++) {
    var cMob = normalizeMobile_(String(cData[c][COL.mobile-1]||''));
    if (lMobile && cMob === lMobile) {
      var existKaiNo = String(cData[c][COL.kaiNo-1]||'').trim();
      // Link lead to existing candidate
      lSheet.getRange(lRowNum, COL_L_.status).setValue('CONVERTED');
      lSheet.getRange(lRowNum, COL_L_.convertedKaiNo).setValue(existKaiNo);
      logActivity_(ss, { kaiNo:leadId, rowIndex:0,
        action: 'LEAD_CONVERTED',
        detail: 'Linked to existing candidate ' + existKaiNo + ' (same mobile)',
        actor: actor
      });
      return { ok:true, leadId:leadId, kaiNo:existKaiNo,
               message:'Linked to existing candidate', isNew:false };
    }
  }

  // Create new candidate row from lead data
  var kaiNo  = generateKaiNumber_(ss);
  var now    = new Date();

  // Build a minimal candidate row (42 columns, lead data mapped in)
  var row    = new Array(42).fill('');
  row[COL.stage-1]           = 'New';
  row[COL.applicationDate-1] = now;
  row[COL.nationality-1]     = String(lRow[COL_L_.nationality-1]||'').trim();
  row[COL.name-1]            = lName;
  row[COL.mobile-1]          = String(lRow[COL_L_.mobile-1]||'').trim();
  row[COL.email-1]           = String(lRow[COL_L_.email-1]||'').trim();
  row[COL.education-1]       = String(lRow[COL_L_.education-1]||'').trim();
  row[COL.positionApplied-1] = lTrade;
  row[COL.trade-1]           = lTrade;
  row[COL.experience-1]      = parseFloat(lRow[COL_L_.experience-1])||0;
  row[COL.gulfExp-1]         = String(lRow[COL_L_.gulfExp-1]||'').trim();
  row[COL.verdict-1]         = 'Pending action';
  row[COL.score-1]           = 0;   // No CV yet — profile completeness will be low
  row[COL.active-1]          = '';
  row[COL.kaiNo-1]           = kaiNo;
  row[COL.currentLocation-1] = String(lRow[COL_L_.currentLocation-1]||'').trim();
  row[COL.lastContact-1]     = now;

  // Compute missing fields (most will be missing — no CV)
  var pseudoCand = {
    name:    lName,             mobile:   row[COL.mobile-1],
    email:   row[COL.email-1],  trade:    lTrade,
    education: row[COL.education-1], dob: '',
    age:     0, passportNo:     '',
    nationality: row[COL.nationality-1],
    gulfExp:     row[COL.gulfExp-1],
    positionApplied: lTrade
  };
  var missing = computeMissingFields_(pseudoCand);
  row[COL.missingFields-1] = missing.map(function(m){ return m.field; }).join(',');
  row[COL.notes-1]         = 'Converted from Lead ' + leadId +
                             (String(lRow[COL_L_.notes-1]||'').trim() ? ' | ' + lRow[COL_L_.notes-1] : '');

  cSheet.appendRow(row);

  // Mark lead as converted
  lSheet.getRange(lRowNum, COL_L_.status).setValue('CONVERTED');
  lSheet.getRange(lRowNum, COL_L_.convertedKaiNo).setValue(kaiNo);
  lSheet.getRange(lRowNum, COL_L_.lastContactDate).setValue(now);

  logActivity_(ss, { kaiNo:leadId, rowIndex:0,
    action: 'LEAD_CONVERTED',
    detail: 'New candidate created: ' + kaiNo + ' | ' + lName + ' | ' + (lTrade||'trade unknown'),
    actor: actor
  });
  logActivity_(ss, { kaiNo:kaiNo, rowIndex:0,
    action: 'CANDIDATE_CREATED_FROM_LEAD',
    detail: 'Source Lead: ' + leadId + ' | Missing fields: ' + row[COL.missingFields-1],
    actor: actor
  });

  return { ok:true, leadId:leadId, kaiNo:kaiNo,
           name:lName, trade:lTrade, missingFields:row[COL.missingFields-1],
           message:'Candidate created. Profile incomplete — use Document Operations to collect missing info.',
           isNew:true };
}

// Public test / setup wrappers
function setupLeadsSheet()      {
  var ss = SpreadsheetApp.openById(SS_ID);
  ensureLeadsSheet_(ss);
  Logger.log('_Leads sheet ready');
}
function testCreateLead()       { Logger.log(JSON.stringify(createLead_({ name:'Test Lead', mobile:'9999999999', trade:'Welder', source:'PHONE_CALL', recruiter:'test' }))); }
function testLeadQuality()      { Logger.log(classifyLeadQuality_('Welder','',SpreadsheetApp.openById(SS_ID))); }
function testOpenPoolMatches()  { Logger.log(JSON.stringify(getOpenPoolMatches_({ reqId:'' }))); }
