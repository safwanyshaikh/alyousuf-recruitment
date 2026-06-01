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
// ║  7. Deploy → New deployment → Web app → Anyone → Deploy         ║
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

    if      (action === 'candidates')    out = JSON.stringify(getCandidates_(params));
    else if (action === 'candidate')     out = JSON.stringify(getSingleCandidate_(params));
    else if (action === 'search')        out = JSON.stringify(globalSearch_(params));
    else if (action === 'requirements')  out = JSON.stringify(getRequirementsEnhanced_());
    else if (action === 'match')         out = JSON.stringify(getMatchedCandidates_(params));
    else if (action === 'metrics')       out = JSON.stringify(getMetrics_());
    else if (action === 'sac')           out = JSON.stringify(getSacPerformance_());
    else if (action === 'activityLog')   out = JSON.stringify(getActivityLog_(params));
    else if (action === 'jds')           out = JSON.stringify(getJDs_(params));
    else if (action === 'jdDetail')      out = JSON.stringify(getJDDetail_(params));
    else if (action === 'gmailInbox')    out = JSON.stringify(getGmailInbox_(params));
    else if (action === 'gmailThread')   out = JSON.stringify(getGmailThread_(params));
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
    else if (action === 'createRequirement') out = JSON.stringify(createRequirement_(body));
    else if (action === 'updateRequirement') out = JSON.stringify(updateRequirement_(body));
    else if (action === 'createJD')          out = JSON.stringify(createJD_(body));
    else if (action === 'uploadCV')          out = JSON.stringify(uploadCV_(body));
    else if (action === 'gmailReply')        out = JSON.stringify(gmailReply_(body));
    else if (action === 'gmailConvert')      out = JSON.stringify(gmailConvert_(body));
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

      // Issue new token
      var token   = Utilities.getUuid();
      var expiry  = new Date(Date.now() + 24*60*60*1000); // 24 hours
      var expiryStr = expiry.toISOString();

      // Store in sheet cols 6 (token) and 7 (expiry)
      sheet.getRange(i + 2, 6).setValue(token);
      sheet.getRange(i + 2, 7).setValue(expiryStr);

      // Cache for fast validation
      CacheService.getScriptCache().put('KAI_TOK_' + token, '1', 82800); // 23hr cache

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

  data.forEach(function(row, i) {
    var active = String(row[COL.active-1]||'').toUpperCase().trim();
    if (active === 'SUPERSEDED' || active === 'ARCHIVED') return;
    var name  = String(row[COL.name-1]||'').trim();
    var email = String(row[COL.email-1]||'').trim();
    if (!name && !email) return;

    var score   = parseInt(row[COL.score-1])   || 0;
    var stageRaw= String(row[COL.stage-1]||'').trim();
    var trade   = String(row[COL.trade-1]||'').trim();
    var nat     = String(row[COL.nationality-1]||'').trim();
    var verdict = String(row[COL.verdict-1]||'').trim().toUpperCase();
    var gulfExp = String(row[COL.gulfExp-1]||'').trim();
    var loc     = String(row[COL.currentLocation-1]||'').trim();

    // Compute display stage: use recruiter-set stage if meaningful,
    // otherwise derive from AI verdict so chips are never blank
    var PENDING = (stageRaw === '' || stageRaw === 'Pending action');
    var stage = PENDING
      ? (verdict === 'SHORTLISTED' ? 'Shortlisted'
       : verdict === 'NEEDS_REVIEW' ? 'Review'
       : verdict === 'NEEDS_CALL'   ? 'Needs Call'
       : verdict === 'SELECTED'     ? 'Selected'
       : verdict === 'REJECTED'     ? 'Rejected'
       : 'New')
      : stageRaw;

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

  var total  = records.length;
  var paged  = records.slice((page-1)*limit, (page-1)*limit + limit);
  return { ok:true, records:paged, total:total, page:page,
           limit:limit, totalPages: Math.ceil(total/limit) };
}

// GET ?action=candidate&rowIndex=5
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

  return {
    ok:true, rowIndex:rowIndex,
    kaiNo:            String(row[COL.kaiNo-1]||'').trim(),
    name:             String(row[COL.name-1]||'').trim(),
    nationality:      String(row[COL.nationality-1]||'').trim(),
    age:              parseInt(row[COL.age-1]) || 0,
    dob:              row[COL.dob-1] instanceof Date ?
                        Utilities.formatDate(row[COL.dob-1],'Asia/Dubai','yyyy-MM-dd') : '',
    stage:            String(row[COL.stage-1]||'').trim(),
    trade:            String(row[COL.trade-1]||'').trim(),
    score:            score,
    confidenceTier:   getConfidenceTier_(score),
    verdict:          String(row[COL.verdict-1]||'').trim(),
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
    email:            String(row[COL.email-1]||'').trim(),
    cvLink:           String(row[COL.cvLink-1]||'').trim(),
    kaiAssessment:    kaiText,
    applicationDate:  appDt instanceof Date ?
                        Utilities.formatDate(appDt,'Asia/Dubai','yyyy-MM-dd') : '',
    passportStatus:   ppExp ? ((ppExp-new Date())/(1000*60*60*24*30) > 6 ? 'Valid':'<6mo'):'Unknown',
    passportExpiry:   ppExp ? Utilities.formatDate(ppExp,'Asia/Dubai','yyyy-MM-dd') : '',
    passportNo:       extractPassportNo_(kaiText, String(row[COL.notes-1]||'')),
    ecrStatus:        String(row[COL.ecrStatus-1]||'').trim(),
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

// GET ?action=match&reqId=AYE-REQ-2026-0001&tier=STRONG&days=30
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

  var reqTrade = String(reqRow[4]||'').toLowerCase();
  var minExp   = parseFloat(reqRow[6]) || 0;

  var all = getCandidates_({ limit:'500' }).records;
  var matched = all.filter(function(r) {
    if (reqTrade && r.trade.toLowerCase().indexOf(reqTrade) < 0 &&
        r.positionApplied.toLowerCase().indexOf(reqTrade) < 0) return false;
    if (minExp > 0 && r.experience < minExp) return false;
    return true;
  }).sort(function(a,b){ return b.score - a.score; });

  var result = { STRONG:[], GOOD:[], POSSIBLE:[], REVIEW:[] };
  matched.forEach(function(r){ result[r.confidenceTier].push(r); });

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

// ════════════════════════════════════════════════════════════════════
// SECTION 5 — METRICS + SAC
// ════════════════════════════════════════════════════════════════════

function getMetrics_() {
  var records = getCandidates_({ limit:'500' }).records || [];
  var m = { total:0, shortlisted:0, needsReview:0, needsCall:0,
            clientSent:0, selected:0, deployed:0, todayCount:0,
            strongMatch:0, goodMatch:0 };
  var today = Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd');

  records.forEach(function(r) {
    m.total++;
    var v = (r.verdict||'').toUpperCase();
    var s = (r.stage||'').toLowerCase();
    if (v === 'SHORTLISTED')                       m.shortlisted++;
    if (v === 'NEEDS_REVIEW')                      m.needsReview++;
    if (v === 'NEEDS_CALL')                        m.needsCall++;
    if (s.indexOf('client sent') >= 0)             m.clientSent++;
    if (s.indexOf('selected') >= 0)                m.selected++;
    if (s.indexOf('deployed') >= 0)                m.deployed++;
    if (r.applicationDate === today)               m.todayCount++;
    if (r.confidenceTier === 'STRONG')             m.strongMatch++;
    if (r.confidenceTier === 'GOOD')               m.goodMatch++;
  });
  return { ok:true, metrics:m };
}

function getSacPerformance_() {
  var records = getCandidates_({ limit:'500' }).records || [];
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
  var cands = getCandidates_({ limit:'500' }).records || [];

  var reqs = data.filter(function(r){ return String(r[0]||'').trim(); })
    .map(function(row) {
      var trade  = String(row[4]||'').toLowerCase();
      var minExp = parseFloat(row[6])||0;
      var counts = { STRONG:0, GOOD:0, POSSIBLE:0, REVIEW:0 };
      cands.forEach(function(c) {
        if (trade && c.trade.toLowerCase().indexOf(trade)<0 &&
            c.positionApplied.toLowerCase().indexOf(trade)<0) return;
        if (minExp > 0 && c.experience < minExp) return;
        counts[c.confidenceTier] = (counts[c.confidenceTier]||0)+1;
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
    '', '', '', '',
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
    if (body.status)      sheet.getRange(r,15).setValue(body.status);
    if (body.notes)       sheet.getRange(r,20).setValue(body.notes);
    if (body.startDate)   sheet.getRange(r,22).setValue(body.startDate);
    if (body.endDate)     sheet.getRange(r,23).setValue(body.endDate);
    if (body.shortlistCount !== undefined)
      sheet.getRange(r,18).setValue(parseInt(body.shortlistCount)||0);
    return { ok:true, reqId:reqId, updated:true };
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
    var bytes  = Utilities.base64Decode(fileB64);
    var blob   = Utilities.newBlob(bytes, mimeType, fileName);
    var folder = getOrCreateUploadFolder_();
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var driveUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';
    var ss = SpreadsheetApp.openById(SS_ID);
    var uploadId = 'UPL-' + Utilities.formatDate(new Date(),'Asia/Dubai','yyyyMMdd-HHmmss');
    ensureUploadSheet_(ss).appendRow([
      uploadId, new Date(), fileName, file.getId(), driveUrl,
      senderName, senderEmail, recruiter, 'PENDING_PARSE', '', '', ''
    ]);
    return { ok:true, uploadId:uploadId, driveUrl:driveUrl,
             status:'PENDING_PARSE',
             message:'CV uploaded. KAI will parse within the next pipeline run.' };
  } catch(e) {
    return { ok:false, error:'Upload failed: '+e.message };
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
// SECTION 11 — SETUP + TEST (Run from GAS editor, not from web)
// ════════════════════════════════════════════════════════════════════

// Run ONCE after pasting this file
function setupAllNewSheets() {
  var ss = SpreadsheetApp.openById(SS_ID);
  Logger.log('_ActivityLog: '    + (ensureActivitySheet_(ss) ? 'OK' : 'FAILED'));
  Logger.log('_JD_Repository: '  + (ensureJDSheet_(ss)       ? 'OK' : 'FAILED'));
  Logger.log('_ManualUpload: '   + (ensureUploadSheet_(ss)   ? 'OK' : 'FAILED'));

  var req = ss.getSheetByName('_Requirements');
  if (req) {
    var lc = req.getLastColumn();
    if (lc < 21) req.getRange(1,21).setValue('JD_ID');
    if (lc < 22) req.getRange(1,22).setValue('Start_Date');
    if (lc < 23) req.getRange(1,23).setValue('End_Date');
    Logger.log('_Requirements: extended to 23 cols');
  } else {
    Logger.log('_Requirements: sheet not found (will be created when first req is added)');
  }

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('jd_id_counter'))  props.setProperty('jd_id_counter',  '0');
  if (!props.getProperty('req_id_counter')) props.setProperty('req_id_counter', '0');
  Logger.log('Setup complete.');
}

// Run to verify all endpoints are working
function testBridgeEndpoints() {
  Logger.log('=== KAI Bridge Endpoint Test ===');

  // Candidates list
  var cands = getCandidates_({});
  Logger.log('Candidates: ' + (cands.ok ? cands.total+' total, page 1 of '+cands.totalPages : 'FAILED — '+cands.error));

  // Single candidate (first row from sheet)
  if (cands.ok && cands.records && cands.records.length > 0) {
    var firstRow = cands.records[0].rowIndex;
    var single = getSingleCandidate_({ rowIndex: String(firstRow) });
    Logger.log('SingleCandidate: ' + (single.ok ? 'OK — ' + single.name : 'FAILED — '+single.error));
  }

  // Global search (returns same shape as getCandidates_ — uses .total)
  var search = globalSearch_({ q: 'welder' });
  Logger.log('GlobalSearch "welder": ' + (search.ok ? search.total+' results' : 'FAILED — '+search.error));

  // Requirements
  var reqs = getRequirementsEnhanced_();
  Logger.log('Requirements: ' + (reqs.ok ? reqs.count+' found' : 'FAILED — '+reqs.error));

  // JDs
  var jds = getJDs_({});
  Logger.log('JDs: ' + (jds.ok ? jds.count+' found' : 'FAILED — '+jds.error));

  // Metrics
  var metrics = getMetrics_();
  Logger.log('Metrics: ' + (metrics.ok ? JSON.stringify(metrics.metrics) : 'FAILED — '+metrics.error));

  // SAC performance (returns { sacPerformance: [...] })
  var sac = getSacPerformance_();
  Logger.log('SAC Performance: ' + (sac.ok ? sac.sacPerformance.length+' source groups' : 'FAILED — '+sac.error));

  // Activity log — requires rowIndex or kaiNo; use first candidate's rowIndex
  if (cands.ok && cands.records && cands.records.length > 0) {
    var actLog = getActivityLog_({ rowIndex: String(cands.records[0].rowIndex) });
    Logger.log('ActivityLog: ' + (actLog.ok ? actLog.count+' entries for row '+cands.records[0].rowIndex : 'FAILED — '+actLog.error));
  }

  // Gmail inbox (may need Gmail scope — OK if fails with scope error)
  try {
    var inbox = getGmailInbox_({ tab: 'all', limit: '3' });
    Logger.log('GmailInbox: ' + (inbox.ok ? inbox.count+' threads' : 'FAILED — '+inbox.error));
  } catch(e) {
    Logger.log('GmailInbox: SCOPE ERROR (add Gmail scope in manifest) — ' + e.message);
  }

  Logger.log('=== Test complete ===');
}
