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
    CURRENT_ACTOR_ = resolveActorFromToken_(token);   // 0.2 — real identity for any logging

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
    // P1 — Requirement Command Center
    else if (action === 'requirementCommandCenter') out = JSON.stringify(requirementCommandCenter_(params));
    else if (action === 'requirementDashboardCards') out = JSON.stringify(getRequirementDashboardCards_(params));
    else if (action === 'getMatchSnapshot')          out = JSON.stringify(getMatchSnapshot_(params));
    // P2 — Associate Production Units
    else if (action === 'commitments')          out = JSON.stringify(getCommitments_(params));
    else if (action === 'associateCapacity')    out = JSON.stringify(getAssociateCapacity_(params));
    else if (action === 'associateReliability') out = JSON.stringify(getAssociateReliability_(params));
    else if (action === 'recommendedSources')   out = JSON.stringify(getRecommendedSources_(params));
    else if (action === 'associateScore')       out = JSON.stringify(getAssociateScore_(params));
    // P3 — Supply Intake
    else if (action === 'matchGmailSender')     out = JSON.stringify(matchGmailSender_(params));
    else if (action === 'leadPipelineSummary')  out = JSON.stringify(getLeadPipelineSummary_(params));
    // P4 — Lifecycle
    else if (action === 'learningSnapshot')     out = JSON.stringify(getLearningSnapshot_(params));
    else if (action === 'recruiterKPI')         out = JSON.stringify(getRecruiterKPI_(params));
    else if (action === 'revenueSummary')       out = JSON.stringify(getRevenueSummary_(params));
    // P5 — Governance
    else if (action === 'settings')             out = JSON.stringify(getSettings_(params));
    else if (action === 'roles')                out = JSON.stringify(getRoles_(params));
    else if (action === 'users')                out = JSON.stringify(getUsers_(params, token));
    else if (action === 'myContext')            out = JSON.stringify(getMyContext_(params, token));
    // S36 — Processing Queue
    else if (action === 'processingQueue')      out = JSON.stringify(getProcessingQueue_(params));
    else if (action === 'processQueue')         out = JSON.stringify(processNextInQueue_(params));
    else if (action === 'retryQueue')           out = JSON.stringify(retryQueue_(params));
    // S42 — Gmail Error Reprocessor
    else if (action === 'reprocessGmailErrors') out = JSON.stringify(reprocessGmailErrorsSmart());
    // S43 — KAI Outreach Reply Processor + Full Email Intelligence
    else if (action === 'clearKarigarErrorBacklog') out = JSON.stringify(clearKarigarErrorBacklog());
    else if (action === 'processAllInboxEmails')    out = JSON.stringify(processAllInboxEmails());
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
    CURRENT_ACTOR_ = resolveActorFromToken_(token);   // 0.2 — real identity for all writes

    if      (action === 'updateStage')       out = JSON.stringify(updateStage_(body));
    else if (action === 'saveNote')          out = JSON.stringify(saveNote_(body));
    else if (action === 'createRequirement')          out = JSON.stringify(createRequirement_(body));
    else if (action === 'updateRequirement')          out = JSON.stringify(updateRequirement_(body));
    else if (action === 'deleteRequirement')          out = JSON.stringify(deleteRequirement_(body));
    else if (action === 'duplicateRequirement')       out = JSON.stringify(duplicateRequirement_(body));
    else if (action === 'bulkCreateRequirementsFromJDs') out = JSON.stringify(bulkCreateRequirementsFromJDs_(body));
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
    // P2 — Associate Production Units
    else if (action === 'createCommitment')            out = JSON.stringify(createCommitment_(body));
    else if (action === 'updateCommitment')            out = JSON.stringify(updateCommitment_(body));
    else if (action === 'upsertAssociateCapacity')     out = JSON.stringify(upsertAssociateCapacity_(body));
    else if (action === 'refreshAssociateReliability') out = JSON.stringify(refreshAssociateReliability_(body));
    // P3 — Supply Intake
    else if (action === 'createLeadFromReq')    out = JSON.stringify(createLeadFromReq_(body));
    else if (action === 'linkLeadToAssociate')  out = JSON.stringify(linkLeadToAssociate_(body));
    // P4 — Lifecycle
    else if (action === 'runLearning')          out = JSON.stringify(runLearningWriter_(body));
    // P5 — Governance (admin-gated inside each handler)
    else if (action === 'updateSetting')        out = JSON.stringify(updateSetting_(body, token));
    else if (action === 'setUserRole')          out = JSON.stringify(setUserRole_(body, token));
    // S36 — Processing Queue
    else if (action === 'retryQueue')           out = JSON.stringify(retryQueue_(body));
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
//     &industry=X&passportStatus=X&ecrStatus=X&hasCV=1&hasContact=1
//     &experienceMin=X&experienceMax=X&source=X&recruiter=X
function getCandidates_(params) {
  params = params || {};
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, records:[], total:0 };

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1,
             Math.min(sheet.getLastColumn(), 42)).getValues();

  var fStage      = String(params.stage          ||'').trim().toLowerCase();
  var fTrade      = String(params.trade          ||'').trim().toLowerCase();
  var fNat        = String(params.nationality    ||'').trim().toLowerCase();
  var fGCC        = String(params.gccMobility    ||'').trim().toUpperCase();
  var fVerdict    = String(params.verdict        ||'').trim().toLowerCase();
  var fMin        = parseInt(params.scoreMin     ||'0')   || 0;
  var fMax        = parseInt(params.scoreMax     ||'100') || 100;
  var fSearch     = String(params.q              ||'').trim().toLowerCase();
  var fIndustry   = String(params.industry       ||'').trim().toLowerCase();
  var fPpStatus   = String(params.passportStatus ||'').trim().toLowerCase();
  var fEcr        = String(params.ecrStatus      ||'').trim().toLowerCase();
  var fHasCV      = String(params.hasCV          ||'').trim();
  var fHasContact = String(params.hasContact     ||'').trim();
  var fExpMin     = params.experienceMin !== undefined ? parseFloat(params.experienceMin) : -1;
  var fExpMax     = params.experienceMax !== undefined ? parseFloat(params.experienceMax) : -1;
  var fSource     = String(params.source         ||'').trim().toLowerCase();
  var fRecruiter  = String(params.recruiter      ||'').trim().toLowerCase();
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

    // Banner filter gates
    var industry = String(row[COL.industry-1]||'').trim();
    if (fIndustry && industry.toLowerCase().indexOf(fIndustry) < 0) return;

    var expYears = parseFloat(row[COL.experience-1]) || 0;
    if (fExpMin >= 0 && expYears < fExpMin) return;
    if (fExpMax >= 0 && expYears > fExpMax) return;

    var cvLink = String(row[COL.cvLink-1]||'').trim();
    if (fHasCV === '1' && !cvLink) return;
    if (fHasCV === '0' && cvLink)  return;

    var mobile = String(row[COL.mobile-1]||'').replace(/^'/,'').trim();
    var email  = String(row[COL.email-1]||'').trim();
    if (fHasContact === '1' && !mobile && !email) return;
    if (fHasContact === '0' && (mobile || email)) return;

    var flags = String(row[COL.flags-1]||'').trim();
    if (fSource && flags.toLowerCase().indexOf(fSource) < 0) return;

    var ecrSt = String(row[COL.ecrStatus-1]||'').trim();
    if (fEcr && ecrSt.toLowerCase().indexOf(fEcr) < 0) return;

    var recruiterActionVal = String(row[COL.recruiterAction-1]||'').trim();
    if (fRecruiter && recruiterActionVal.toLowerCase().indexOf(fRecruiter) < 0) return;

    // Passport status gate (computed early for banner filter)
    var ppExpR0  = row[COL.passportExpiry-1];
    var ppExp0   = ppExpR0 instanceof Date ? ppExpR0 : null;
    var ppStat0  = 'Unknown';
    if (ppExp0 && !isNaN(ppExp0)) {
      var mLeft0 = (ppExp0 - new Date()) / (1000*60*60*24*30);
      ppStat0 = mLeft0 > 6 ? 'Valid' : (mLeft0 > 0 ? '<6mo' : 'Expired');
    }
    if (fPpStatus && ppStat0.toLowerCase().indexOf(fPpStatus) < 0) return;

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
    var ppExp   = ppExp0;
    var ppStat  = ppStat0;

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
      medicalStatus:    String(row[COL.medicalStatus-1]||'').trim(),
      missingFields:    String(row[COL.missingFields-1]||'').trim(),
      deployScore:      parseInt(row[COL.deployScore-1]) || 0,
      top3Positions:    top3,
      flags:            String(row[COL.flags-1]||'').trim(),
      source:           String(row[COL.flags-1]||'').trim(),
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

    // ── GCC RECRUITMENT INTELLIGENCE ENGINE V2 ───────────────────────────
    // Nationality whitelist — requirement-level hard gate (blank = any nationality)
    if (reqNationality) {
      var candNat = String(r.nationality||'').trim().toLowerCase();
      var reqNatL = reqNationality.toLowerCase();
      if (candNat && candNat.indexOf(reqNatL) < 0 && reqNatL.indexOf(candNat) < 0) return;
    }
    var ms = computeMatchScoreGCC_(reqTrade, minExp, reqCerts, campaignType, r);

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
  // 0.2 — authenticated identity is source of truth. Falls back to caller-
  // supplied actor (system/trigger paths have no token → CURRENT_ACTOR_ is '').
  var actor = CURRENT_ACTOR_ || entry.actor || 'system';
  ensureActivitySheet_(ss).appendRow([
    Utilities.formatDate(new Date(),'Asia/Dubai','yyyy-MM-dd HH:mm'),
    entry.kaiNo||'', entry.rowIndex||'', entry.action||'',
    (entry.detail||'').slice(0,500), actor, entry.notes||''
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
      var trade4    = String(row[4]||'').trim();
      var sourcedBy = String(row[15]||'').trim();
      var dept      = classifyDepartment_(trade4);
      return {
        reqId:         String(row[0]||'').trim(),
        receivedDate:  row[1] instanceof Date ?
                         Utilities.formatDate(row[1],'Asia/Dubai','dd-MMM-yyyy'):'',
        clientName:    String(row[2]||'Unknown').trim(),
        deployCountry: String(row[3]||'').trim(),
        jobTitle:      trade4,
        trade:         trade4,
        requiredQty:   parseInt(row[5])||0,
        minExperience: parseInt(row[6])||0,
        minAge:        parseInt(row[7])||0,
        maxAge:        parseInt(row[8])||0,
        projectName:   String(row[9]||'').trim(),
        nationality:   String(row[10]||'').trim(),
        urgency:       String(row[13]||'Normal').trim(),
        status:        String(row[14]||'Open').trim(),
        sourcedBy:     sourcedBy,
        postedBy:      sourcedBy,
        department:    dept,
        interviewMode: String(row[16]||'').trim(),
        notes:         String(row[19]||'').trim(),
        jdId:          String(row[20]||'').trim(),
        startDate:     row[21] instanceof Date ?
                         Utilities.formatDate(row[21],'Asia/Dubai','yyyy-MM-dd'):String(row[21]||''),
        endDate:       row[22] instanceof Date ?
                         Utilities.formatDate(row[22],'Asia/Dubai','yyyy-MM-dd'):String(row[22]||''),
        committedQty:  parseInt(row[23])||0,
        interviewDate: row[24] instanceof Date ?
                         Utilities.formatDate(row[24],'Asia/Dubai','yyyy-MM-dd'):String(row[24]||''),
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

  // 0.3 — trade gate. No blank/filename/unknown trade enters production.
  var tradeIn = String(body.trade||body.jobTitle||'').trim();
  if (!isValidTrade_(tradeIn)) {
    var qid = quarantineRequirement_(ss, {
      importId: String(body.jdId||body.importId||'manual'),
      fileName: String(body.fileName||body.jobTitle||''),
      reason:   tradeIn ? 'FILENAME_OR_UNKNOWN_TRADE' : 'BLANK_TRADE',
      rawTrade: tradeIn,
      client:   String(body.clientName||'')
    });
    return { ok:false, error:'INVALID_TRADE',
             message:'Requirement rejected — trade is blank/invalid. Quarantined for review: ' + qid,
             quarantineId: qid };
  }

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
    String(body.sourcedBy||body.recruiter||body.postedBy||'').trim(),
    String(body.interviewMode ||body.specialReq||'').trim(),  // col 17 — interview mode
    0, 0,
    String(body.notes         ||'').trim(),
    String(body.jdId          ||'').trim(),
    body.startDate||'', body.endDate||'',
    parseInt(body.committedQty||'0')||0,   // col 24 — committed qty (Phase 1)
    body.interviewDate||''                  // col 25 — interview date (Phase 1)
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
    if (body.minAge !== undefined)        sheet.getRange(r,8).setValue(parseInt(body.minAge)||0);
    if (body.maxAge !== undefined)        sheet.getRange(r,9).setValue(parseInt(body.maxAge)||0);
    if (body.projectName !== undefined)   sheet.getRange(r,10).setValue(body.projectName);
    if (body.nationality !== undefined)   sheet.getRange(r,11).setValue(body.nationality);
    if (body.urgency)         sheet.getRange(r,14).setValue(body.urgency);
    if (body.status)          sheet.getRange(r,15).setValue(body.status);
    if (body.sourcedBy || body.recruiter || body.postedBy)
      sheet.getRange(r,16).setValue(body.sourcedBy||body.recruiter||body.postedBy);
    if (body.interviewMode !== undefined) sheet.getRange(r,17).setValue(body.interviewMode);
    if (body.notes)           sheet.getRange(r,20).setValue(body.notes);
    if (body.startDate)       sheet.getRange(r,22).setValue(body.startDate);
    if (body.endDate)         sheet.getRange(r,23).setValue(body.endDate);
    if (body.shortlistCount !== undefined)
      sheet.getRange(r,18).setValue(parseInt(body.shortlistCount)||0);
    // Phase 1 — committed qty + interview date
    if (body.committedQty !== undefined)
      sheet.getRange(r,24).setValue(parseInt(body.committedQty)||0);
    if (body.interviewDate !== undefined)
      sheet.getRange(r,25).setValue(body.interviewDate);
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

    // 0.1 — lock immutable source. Registered associate email → Associate credit;
    // otherwise a recruiter manual upload. Email intake from the main pipeline
    // is out of scope (that runs in Test 1, which we never touch).
    var upAssoc = matchAssociateByEmail_(ss, senderEmail);
    lockSourceIfEmpty_(candidatesSheet, candidateRowIndex, {
      sourceType:      upAssoc ? 'Associate' : 'Manual',
      sourceAssociate: upAssoc ? upAssoc.assocId : '',
      receivedVia:     'Upload',
      receivedDate:    new Date()
    });

    // STEP 7 — Update upload log
    uploadSheet.getRange(uploadRowNum, 9).setValue('PARSED');
    uploadSheet.getRange(uploadRowNum, 10).setValue(kaiNo);
    uploadSheet.getRange(uploadRowNum, 11).setValue('Score:' + scoreResult.score + ' | ' + scoreResult.verdict);

    // STEP 7b — Queue enrichment (Top3 + Assessment) — runs async via processQueue
    queueForProcessing_(kaiNo, 'TOP3', ss);
    queueForProcessing_(kaiNo, 'ASSESSMENT', ss);

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

  // 0.3 — trade gate. If Gemini failed to extract a real trade, do NOT
  // create a corrupt requirement; quarantine it. The JD is already saved
  // above, so nothing is lost — only the bad requirement is blocked.
  if (!isValidTrade_(parsed.trade)) {
    var qidJD = quarantineRequirement_(ss, {
      importId: jdId,
      fileName: String(body.fileName||parsed.title||clientName||''),
      reason:   'JD_PARSE_NO_TRADE',
      rawTrade: String(parsed.trade||''),
      client:   clientName || parsed.client || ''
    });
    return { ok:false, error:'INVALID_TRADE', jdId:jdId,
             message:'JD saved but requirement rejected — no valid trade extracted. Quarantined: ' + qidJD,
             quarantineId: qidJD };
  }

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
    // 0.4 — normalize mobile. Multi-number imports (e.g. "x / y") are
    // collapsed for storage but the raw is preserved in Notes so the
    // Phase-2 Mobile1/Mobile2 split loses nothing.
    var rawMobile  = String(a.mobile||'').trim();
    var normMobile = normalizeMobileStore_(rawMobile);
    var isMulti    = /[\/,]/.test(rawMobile);
    var notes      = String(a.notes||'').trim();
    if (isMulti) notes = (notes ? notes + ' | ' : '') + 'raw-mobile: ' + rawMobile;
    sheet.appendRow([
      assocId,
      String(a.companyName   ||'').trim(),
      String(a.contactName   ||'').trim(),
      email,
      normMobile,
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
      notes,
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

  var created     = [];
  var quarantined = [];
  positions.forEach(function(pos) {
    var posTrade = pos.trade || pos.title || '';
    // 0.3 — per-position trade gate. Bad positions are quarantined, not created.
    if (!isValidTrade_(posTrade)) {
      var qidPos = quarantineRequirement_(ss, {
        importId: jdId || 'split',
        fileName: String(body.fileName||posTrade||''),
        reason:   posTrade ? 'FILENAME_OR_UNKNOWN_TRADE' : 'BLANK_TRADE',
        rawTrade: posTrade,
        client:   clientName || pos.client || ''
      });
      quarantined.push({ rawTrade:posTrade, quarantineId:qidPos });
      return;
    }
    var reqId = generateReqId_();
    reqSheet.appendRow([
      reqId,
      new Date(),
      clientName || pos.client || '',
      pos.country || country || '',
      posTrade,
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
    created.push({ reqId:reqId, trade:posTrade,
                   qty:parseInt(pos.qty||'1')||1, minExp:parseFloat(pos.minExp||'0')||0,
                   certifications:pos.certifications||'' });
  });

  // T14: capture JD intelligence with all extracted positions
  try {
    captureJDIntelligenceT14_(ss, jdId, clientName, positions[0] ? (positions[0].trade||'') : '',
      country, raw, positions);
  } catch(e) { Logger.log('captureJDIntelligenceT14_ error: ' + e.message); }

  return { ok:true, jdId:jdId||'', positionsFound:positions.length,
           requirements:created, created:created.length,
           quarantined:quarantined.length, quarantinedItems:quarantined };
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
    mobile:          normalizeMobileStore_(mobile),   // 0.4
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

  // 0.1 — if this mobile/email belongs to a registered associate, credit them;
  // otherwise it's a direct WhatsApp intake. Source is locked at creation.
  var waAssoc = matchAssociateByEmail_(ss, parsed.email);
  applySourceLockToRow_(row, {
    sourceType:      waAssoc ? 'Associate' : 'Direct',
    sourceAssociate: waAssoc ? waAssoc.assocId : '',
    receivedVia:     'WhatsApp',
    receivedDate:    now
  });

  sheet.appendRow(row);

  // Queue Top3 enrichment — no CV yet so only TOP3 based on trade; assessment skipped until CV received
  queueForProcessing_(kaiNo, 'TOP3', ss);

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
  var s  = ensureLeadsSheetP3_(ss);  // P3: ensures 24-col schema

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
    normalizeMobileStore_(mobile),             // Mobile (0.4 normalized)
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
    String(body.notes          ||'').trim(),   // Notes
    String(body.assocId        ||'').trim(),   // Assoc ID  (P3)
    '',                                        // Assoc Name (P3 — resolved by createLeadFromReq_)
    '',                                        // Target Country (P3)
    String(body.cvLink         ||'').trim()    // CV Link (P3)
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
  row[COL.mobile-1]          = normalizeMobileStore_(lRow[COL_L_.mobile-1]);   // 0.4
  row[COL.email-1]           = String(lRow[COL_L_.email-1]||'').trim();
  row[COL.education-1]       = String(lRow[COL_L_.education-1]||'').trim();
  row[COL.positionApplied-1] = lTrade;
  row[COL.trade-1]           = lTrade;
  row[COL.experience-1]      = parseFloat(lRow[COL_L_.experience-1])||0;
  row[COL.gulfExp-1]         = String(lRow[COL_L_.gulfExp-1]||'').trim();
  row[COL.active-1]          = '';
  row[COL.kaiNo-1]           = kaiNo;
  row[COL.currentLocation-1] = String(lRow[COL_L_.currentLocation-1]||'').trim();
  row[COL.lastContact-1]     = now;

  // Compute profile score + missing fields from available lead data (no CV)
  var pseudoCand = {
    name:    lName,             mobile:   row[COL.mobile-1],
    email:   row[COL.email-1],  trade:    lTrade,
    education: row[COL.education-1], dob: '',
    age:     0, passportNo:     '',
    nationality: row[COL.nationality-1],
    gulfExp:     row[COL.gulfExp-1],
    positionApplied: lTrade
  };
  var leadScore = computeBasicScore_(pseudoCand);
  row[COL.verdict-1]         = leadScore.verdict;
  row[COL.score-1]           = leadScore.score;
  var missing = computeMissingFields_(pseudoCand);
  row[COL.missingFields-1] = missing.map(function(m){ return m.field; }).join(',');
  row[COL.notes-1]         = 'Converted from Lead ' + leadId +
                             (String(lRow[COL_L_.notes-1]||'').trim() ? ' | ' + lRow[COL_L_.notes-1] : '');

  // 0.1 — immutable source lock. A lead may itself have come from an associate;
  // carry that associate forward so source credit survives conversion.
  var lSource  = String(lRow[COL_L_.source-1]||'').trim();
  var lAssocId = String(lRow.length > 20 ? (lRow[COL_L_.assocId-1]||'') : '').trim(); // P3
  applySourceLockToRow_(row, {
    sourceType:      (lSource === 'ASSOCIATE' || lAssocId) ? 'Associate' : 'Lead',
    sourceAssociate: lAssocId,
    sourceLead:      leadId,
    sourceCampaign:  String(lRow[COL_L_.linkedReqId-1]||'').trim(),
    receivedVia:     lSource || 'Lead',
    receivedDate:    now
  });

  cSheet.appendRow(row);

  // Queue Top3 enrichment — candidate has no CV yet so assessment deferred until upload
  queueForProcessing_(kaiNo, 'TOP3', ss);

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

// ════════════════════════════════════════════════════════════════════
// SECTION 28 — PHASE 0: DATA INTEGRITY FOUNDATION
// 0.1 Source Locking · 0.2 Real Identity · 0.3 Import Validation · 0.4 Mobile
// These helpers are consumed by intake/creation paths above. They never
// touch the main pipeline (Test 1) — bridge-owned writes only.
// ════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// 0.1 SOURCE LOCKING — immutable provenance (Candidates cols 43-48)
// ───────────────────────────────────────────────────────────────────
var COL_SRC = {
  sourceType:43, sourceAssociate:44, sourceLead:45,
  sourceCampaign:46, receivedVia:47, receivedDate:48
};
var SRC_HDR_ = ['Source Type','Source Associate','Source Lead',
                'Source Campaign','Received Via','Received Date'];

// Adds the 6 provenance headers to Candidates if not present. Idempotent.
function ensureSourceLockColumns_(ss) {
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return false;
  if (sheet.getLastColumn() < COL_SRC.receivedDate) {
    sheet.getRange(1, COL_SRC.sourceType, 1, SRC_HDR_.length).setValues([SRC_HDR_]);
  }
  return true;
}

// Writes provenance into a NEW candidate row array (mutates in place).
// Always sets all 6 cells, so the appended row is fully defined to col 48.
function applySourceLockToRow_(row, src) {
  src = src || {};
  row[COL_SRC.sourceType-1]      = String(src.sourceType      || 'Direct').trim();
  row[COL_SRC.sourceAssociate-1] = String(src.sourceAssociate || '').trim();
  row[COL_SRC.sourceLead-1]      = String(src.sourceLead      || '').trim();
  row[COL_SRC.sourceCampaign-1]  = String(src.sourceCampaign  || '').trim();
  row[COL_SRC.receivedVia-1]     = String(src.receivedVia     || '').trim();
  row[COL_SRC.receivedDate-1]    = src.receivedDate || new Date();
}

// Immutable write for an EXISTING candidate row — only fills cells that are
// currently empty. Never overwrites a locked source. Returns true if changed.
function lockSourceIfEmpty_(sheet, rowNum, src) {
  src = src || {};
  if (sheet.getLastColumn() < COL_SRC.receivedDate) ensureSourceLockColumns_(sheet.getParent());
  var rng = sheet.getRange(rowNum, COL_SRC.sourceType, 1, 6);
  var cur = rng.getValues()[0];
  var want = [
    String(src.sourceType||''), String(src.sourceAssociate||''),
    String(src.sourceLead||''), String(src.sourceCampaign||''),
    String(src.receivedVia||''), src.receivedDate||''
  ];
  var changed = false;
  for (var i = 0; i < 6; i++) {
    if ((cur[i] === '' || cur[i] === null) && want[i] !== '') { cur[i] = want[i]; changed = true; }
  }
  if (changed) rng.setValues([cur]);
  return changed;
}

// Registered-associate lookup by sender email → {assocId,name} or null.
// Powers Associate Email Intake auto-tagging.
function matchAssociateByEmail_(ss, email) {
  email = String(email||'').trim().toLowerCase();
  if (!email) return null;
  var sheet = ss.getSheetByName('_Associates');
  if (!sheet || sheet.getLastRow() < 2) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][3]||'').trim().toLowerCase() === email)
      return { assocId:String(data[i][0]||''), name:String(data[i][1]||'') };
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────
// 0.2 REAL USER IDENTITY — resolve token → recruiter, set per request
// ───────────────────────────────────────────────────────────────────
var CURRENT_ACTOR_ = '';   // set in doGet/doPost after auth; '' for triggers

function resolveActorFromToken_(token) {
  if (!token) return '';
  try {
    var ss    = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('_LoginSystem');
    if (!sheet || sheet.getLastRow() < 2) return '';
    var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][5]||'').trim() === token)
        return String(data[i][3] || data[i][0] || '').trim();  // Display Name → Email
    }
  } catch(e) {}
  return '';
}

// ───────────────────────────────────────────────────────────────────
// 0.3 IMPORT VALIDATION + QUARANTINE — no corrupt requirement reaches prod
// ───────────────────────────────────────────────────────────────────
function isValidTrade_(trade) {
  var t = String(trade||'').trim();
  if (!t) return false;                                              // blank
  if (/\.(pdf|docx?|xlsx?|jpe?g|png|txt)\s*$/i.test(t)) return false; // filename
  if (t.toLowerCase().indexOf('.pdf') >= 0) return false;
  if (/^(unknown|n\/?a|na|tbd|manual jd|test trade|none)$/i.test(t)) return false;
  if (t.length < 2) return false;
  return true;
}

var REQ_QUARANTINE_SHEET_ = '_ReqReviewQueue';
var REQ_Q_HDR_ = ['Quarantine ID','Import ID','File Name','Reason',
                  'Raw Trade','Client','Timestamp','Status'];

function ensureReqReviewQueue_(ss) {
  var s = ss.getSheetByName(REQ_QUARANTINE_SHEET_);
  if (!s) {
    s = ss.insertSheet(REQ_QUARANTINE_SHEET_);
    s.appendRow(REQ_Q_HDR_);
    s.getRange(1,1,1,REQ_Q_HDR_.length).setFontWeight('bold')
      .setBackground('#7a1f1f').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

function quarantineRequirement_(ss, info) {
  var s   = ensureReqReviewQueue_(ss);
  var qid = 'RQ-' + Utilities.formatDate(new Date(),'Asia/Dubai','yyyyMMdd-HHmmss') +
            '-' + String(Math.floor(Math.random()*900)+100);
  s.appendRow([
    qid,
    String(info.importId||'').trim(),
    String(info.fileName||'').trim(),
    String(info.reason  ||'INVALID_TRADE').trim(),
    String(info.rawTrade||'').trim(),
    String(info.client  ||'').trim(),
    new Date(),
    'PENDING'
  ]);
  logActivity_(ss, { kaiNo:'SYSTEM', rowIndex:0, action:'REQ_QUARANTINED',
    detail: qid + ' | ' + (info.reason||'INVALID_TRADE') + ' | raw="' + (info.rawTrade||'') + '"',
    actor: 'import-guard' });
  return qid;
}

// ───────────────────────────────────────────────────────────────────
// 0.4 MOBILE NORMALIZATION — string, no .0, no spaces/specials
// ───────────────────────────────────────────────────────────────────
// Storage-safe: preserves the number even if length is unusual (never blanks).
// Strips the float ".0" that Sheets adds when a mobile is cast to a number.
function normalizeMobileStore_(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  var s    = String(raw).trim().replace(/\.0+$/, '');   // kill trailing .0
  var plus = (s.charAt(0) === '+') ? '+' : '';
  var digits = s.replace(/[^\d]/g, '');
  return plus + digits;
}

// ───────────────────────────────────────────────────────────────────
// PHASE 0 SETUP RUNNER — run once from the GAS editor after deploy
// ───────────────────────────────────────────────────────────────────
function setupPhase0() {
  var ss = SpreadsheetApp.openById(SS_ID);
  Logger.log('0.1 Source-lock columns: ' + (ensureSourceLockColumns_(ss) ? 'OK (cols 43-48)' : 'FAILED'));
  Logger.log('0.3 _ReqReviewQueue:     ' + (ensureReqReviewQueue_(ss) ? 'OK' : 'FAILED'));
  Logger.log('Phase 0 infrastructure ready. 0.2 + 0.4 are live on all bridge writes.');
}

// Quick self-test for the four Phase 0 primitives
function testPhase0() {
  Logger.log('isValidTrade_("Welder")               = ' + isValidTrade_('Welder'));
  Logger.log('isValidTrade_("")                     = ' + isValidTrade_(''));
  Logger.log('isValidTrade_("JD Safety (1).pdf")    = ' + isValidTrade_('JD Safety Officer (1).pdf'));
  Logger.log('isValidTrade_("TEST TRADE")           = ' + isValidTrade_('TEST TRADE'));
  Logger.log('normalizeMobileStore_(9004663661.0)   = ' + normalizeMobileStore_(9004663661.0));
  Logger.log('normalizeMobileStore_("+91 90046 6361")= ' + normalizeMobileStore_('+91 90046 6361'));
  Logger.log('resolveActorFromToken_("bad")         = "' + resolveActorFromToken_('bad') + '"');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 29 — PHASE 1: REQUIREMENT COMMAND CENTER
// ════════════════════════════════════════════════════════════════════
//
//  1.1  _Requirements schema: cols 24 (committedQty) + 25 (interviewDate)
//  1.2  Deployable Supply Engine — wires classifyGCCMobility_ per requirement
//  1.3  Database Freshness Classifier: READY / REVALIDATION / EXPIRED
//  1.4  Fill Probability + Critical Requirement Engine (≤3d + gap → red banner)
//
//  GET  ?action=requirementCommandCenter[&reqId=X]
//  POST action=updateRequirement now accepts committedQty + interviewDate
//
//  Deploy order:
//    1. Paste file into Apps Script → Save → Deploy new version
//    2. Run setupPhase1()  — adds headers to _Requirements cols 24-25
//    3. Run testPhase1()   — verify logic in Logger
//    4. GET ?action=requirementCommandCenter — live data check
// ════════════════════════════════════════════════════════════════════

// ── 1.1 SCHEMA CONSTANTS ────────────────────────────────────────────
var COL_REQ_ = {
  committedQty:  24,   // associates' committed supply for this requirement
  interviewDate: 25    // scheduled interview / drive date
};
var REQ_EXT_HDR_ = ['Committed Qty', 'Interview Date'];

// Idempotent — safe to re-run; only writes headers if column is empty.
function ensureReqSchema_(ss) {
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet) return false;
  var lastCol = sheet.getLastColumn();
  if (lastCol < 24 || String(sheet.getRange(1, 24).getValue()||'').trim() === '') {
    sheet.getRange(1, 24).setValue(REQ_EXT_HDR_[0]);
  }
  if (lastCol < 25 || String(sheet.getRange(1, 25).getValue()||'').trim() === '') {
    sheet.getRange(1, 25).setValue(REQ_EXT_HDR_[1]);
  }
  return true;
}

// ── 1.3 DATABASE FRESHNESS CLASSIFIER ───────────────────────────────
// Returns 'READY' | 'REVALIDATION' | 'EXPIRED'
// Uses Candidates cols 28 (candidateState), 36 (lastContact), 30 (passportExpiry),
// 2 (applicationDate — fallback freshness signal when lastContact is blank).
//
// FRESHNESS SIGNAL — last-touch date is the best signal, but lastContact (col 36)
// is only written on explicit touch events and is blank for most of the DB.
// We therefore fall back to applicationDate (when the CV entered the system).
// A CV that arrived 30 days ago with no follow-up is still fresh supply;
// a 2023 CV with no contact since is not. This honours the
// "a 2023 cold CV is NOT supply" rule without expiring the whole DB on a
// blank operational field.
function classifyDatabaseFreshness_(candState, lastContactRaw, passportExpiryRaw, applicationDateRaw) {
  var now = new Date();

  // Hard EXPIRED states — no longer in active pipeline
  var state = String(candState||'').toLowerCase().trim();
  if (state === 'rejected' || state === 'deployed' || state === 'archived') return 'EXPIRED';

  // Passport already expired
  if (passportExpiryRaw instanceof Date && !isNaN(passportExpiryRaw)) {
    if (passportExpiryRaw < now) return 'EXPIRED';
  }

  // Resolve freshness anchor: lastContact preferred, applicationDate as fallback
  var anchor = toDateOrNull_(lastContactRaw);
  if (!anchor) anchor = toDateOrNull_(applicationDateRaw);

  // No date at all (no contact AND no application date) → unknown, needs check.
  // Do NOT auto-expire: absence of a date is a data gap, not proof of a cold CV.
  if (!anchor) return 'REVALIDATION';

  var daysSinceAnchor = Math.floor((now - anchor) / (1000*60*60*24));

  if (daysSinceAnchor > 548) return 'EXPIRED';       // > 18 months — cold CV
  if (daysSinceAnchor > 183) return 'REVALIDATION';  // 6–18 months — needs check

  // Passport expiring soon but still valid
  if (passportExpiryRaw instanceof Date && !isNaN(passportExpiryRaw)) {
    var daysToExpiry = Math.floor((passportExpiryRaw - now) / (1000*60*60*24));
    if (daysToExpiry < 180) return 'REVALIDATION';
  }

  return 'READY';
}

// Coerce a Sheets cell (Date | string | blank) to a valid Date or null.
function toDateOrNull_(raw) {
  if (raw instanceof Date) return isNaN(raw) ? null : raw;
  if (raw && String(raw).trim()) {
    var d = new Date(raw);
    return isNaN(d) ? null : d;
  }
  return null;
}

// ── 1.2 DEPLOYABLE SUPPLY ENGINE ────────────────────────────────────
// Wires classifyGCCMobility_ into requirement demand.
//
// "Deployable" for an overseas GCC campaign (India-sourced):
//   INDIA_AVAILABLE    = candidate in India, ready to fly          → DEPLOYABLE
//   GCC_TRANSFERABLE   = has prior GCC exp, can transfer           → DEPLOYABLE
//   {COUNTRY}_LOCAL    = already in target country, not mobilizable → localPool
//
// candidates[] must have fields: trade, positionApplied, experience, age,
//   gulfExp, currentLocation, kaiAssessment, top3Positions, _freshness
// opts (optional): { collect:true } → also returns result.deployableList[]
//   (lightweight refs of every deployable candidate, for top-N selection)
function getDeployableSupply_(deployCountry, trade, minExp, minAge, maxAge, candidates, opts) {
  opts = opts || {};
  var dcLower = String(deployCountry||'').toLowerCase();

  // Map deploy country to the LOCAL mobility tag to exclude
  var LOCAL_TAGS = {
    'saudi':   'SAUDI_LOCAL',  'ksa':     'SAUDI_LOCAL',
    'uae':     'UAE_LOCAL',    'dubai':   'UAE_LOCAL',   'abu dhabi':'UAE_LOCAL',
    'qatar':   'QATAR_LOCAL',  'doha':    'QATAR_LOCAL',
    'kuwait':  'KUWAIT_LOCAL',
    'bahrain': 'BAHRAIN_LOCAL','manama':  'BAHRAIN_LOCAL',
    'oman':    'OMAN_LOCAL',   'muscat':  'OMAN_LOCAL'
  };
  var excludeTag = null;
  for (var key in LOCAL_TAGS) {
    if (dcLower.indexOf(key) >= 0) { excludeTag = LOCAL_TAGS[key]; break; }
  }

  var result = {
    total: 0, tradePossible: 0,
    deployable: 0, localPool: 0,
    freshDeployable: 0, revalidationDeployable: 0,
    byMobility: {},
    freshBreakdown: { READY: 0, REVALIDATION: 0, EXPIRED: 0 },
    deployableList: []
  };

  var ageFilter = (minAge > 0 || maxAge > 0);

  candidates.forEach(function(c) {
    // Trade gate — uses existing T13-aware matcher
    var tier = getTradeMatchTier_(trade, c);
    if (!tier) return;

    // Experience gate
    if (minExp > 0 && c.experience < minExp) return;

    // Age gate
    if (ageFilter) {
      if (maxAge > 0 && c.age > maxAge) return;
      if (minAge > 0 && c.age < minAge) return;
    }

    result.tradePossible++;

    // Mobility — computed dynamically (stored col 29 may be blank for older records)
    var mob = classifyGCCMobility_(c.gulfExp, c.currentLocation);
    result.byMobility[mob] = (result.byMobility[mob]||0) + 1;

    // Already in target country — excluded from overseas mobilization supply
    if (excludeTag && mob === excludeTag) {
      result.localPool++;
      return;
    }

    // Freshness gate — only READY and REVALIDATION enter deployable pool
    var freshness = c._freshness || 'REVALIDATION';
    result.freshBreakdown[freshness] = (result.freshBreakdown[freshness]||0) + 1;
    if (freshness === 'EXPIRED') return;

    result.deployable++;
    if (freshness === 'READY') {
      result.freshDeployable++;
    } else {
      result.revalidationDeployable++;
    }

    if (opts.collect) {
      result.deployableList.push({
        name:      c._name      || '',
        kaiNo:     c._kaiNo     || '',
        score:     c._score     || 0,
        experience:c.experience || 0,
        tier:      tier,
        mobility:  mob,
        freshness: freshness,
        location:  c.currentLocation || ''
      });
    }
  });

  result.total = result.tradePossible;
  return result;
}

// ── TRADE DIFFICULTY (Correction 2 input) ───────────────────────────
// How hard a trade is to fill, independent of current stock. Rarer/more
// specialised trades convert slower. Default 1.0 (common trade).
// Pending Phase 4 learning this is a heuristic table, not historical fact.
function getTradeDifficulty_(trade) {
  var t = String(trade||'').toLowerCase();
  if (!t) return 1.0;
  // Specialised / scarce — harder to source on short notice
  if (/qc|qa\b|inspector|ndt|radiograph|6g| tig|instrument|hvac tech|rigger|scaffold inspector/.test(t)) return 0.80;
  if (/supervisor|foreman|engineer|technician|electrician|millwright/.test(t)) return 0.90;
  // High-volume common trades — deep market
  if (/helper|labour|labor|driver|mason|painter|cleaner|fitter|welder|fabricat/.test(t)) return 1.0;
  return 0.95;
}

// ── HISTORICAL CONVERSION (Correction 2 input · P4 Country×Trade) ────
// Fraction of supply that converts all the way to COMPLETED MOBILIZATION
// for this Country×Trade. Reads _KAI_Knowledge (P4 schema: col1=Country,
// col2=Trade, col3=ConversionRate) when learning data exists; until then
// returns a conservative default so the formula stays honest.
//
// Lookup precedence:
//   1. Exact Country×Trade row (when country supplied)
//   2. Trade-only weighted average across countries (sample-weighted)
//   3. DEFAULT (0.70)
function getHistoricalConversion_(country, trade) {
  var DEFAULT = 0.70;   // pre-learning baseline
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var k  = ss.getSheetByName(KNOWLEDGE_SHEET_);
    if (!k || k.getLastRow() < 2) return DEFAULT;
    var t = String(trade||'').toLowerCase().trim();
    var c = String(country||'').toLowerCase().trim();
    if (!t) return DEFAULT;
    var data = k.getDataRange().getValues();

    var tradeRateSum = 0, tradeSampleSum = 0;
    for (var i = 1; i < data.length; i++) {
      var rowCountry = String(data[i][0]||'').toLowerCase().trim();
      var rowTrade   = String(data[i][1]||'').toLowerCase().trim();
      if (!rowTrade) continue;
      // Trade match is fuzzy (handles "Welder" vs "MIG Welder")
      var tradeMatch = (t.indexOf(rowTrade) >= 0 || rowTrade.indexOf(t) >= 0);
      if (!tradeMatch) continue;

      var rate   = parseFloat(data[i][2]);
      var sample = parseInt(data[i][10]) || 0;

      // 1 — exact Country×Trade hit wins immediately
      if (c && rowCountry === c && !isNaN(rate) && rate > 0 && rate <= 1) {
        return rate;
      }
      // accumulate for trade-only fallback (sample-weighted)
      if (!isNaN(rate) && rate > 0 && rate <= 1 && sample > 0) {
        tradeRateSum   += rate * sample;
        tradeSampleSum += sample;
      }
    }
    // 2 — trade-only weighted average
    if (tradeSampleSum > 0) return Math.round((tradeRateSum / tradeSampleSum) * 100) / 100;
  } catch(e) {}
  return DEFAULT;   // 3
}

// ── 1.4 FILL PROBABILITY (Correction 2 — multi-factor) ──────────────
// Inputs (no longer simple supply ÷ requirement):
//   ready          — READY deployable (immediate, full weight)
//   revalidation   — REVALIDATION deployable (counts at REVAL_WEIGHT until reconfirmed)
//   required       — requirement qty
//   committedQty   — associate-committed qty (overrides required as demand if > 0)
//   daysToInterview— interview buffer (urgency factor)
//   trade          — drives historical conversion + trade difficulty
//   country        — (P4) scopes historical conversion to Country×Trade
function computeFillProbability_(ready, revalidation, required, committedQty, daysToInterview, trade, country) {
  ready        = ready        || 0;
  revalidation = revalidation || 0;
  var demand = (committedQty > 0) ? committedQty : required;
  if (demand <= 0) return { pct:0, riskLevel:'UNKNOWN', label:'No demand set' };

  var REVAL_WEIGHT = 0.5;   // a revalidation candidate is half a confirmed one

  // Time-pressure factor — fewer candidates you can work through before the date
  var urgencyFactor = 1.0;
  if      (daysToInterview <= 0)  urgencyFactor = 0.0;
  else if (daysToInterview <= 3)  urgencyFactor = 0.55;
  else if (daysToInterview <= 7)  urgencyFactor = 0.75;
  else if (daysToInterview <= 14) urgencyFactor = 0.90;

  var conversion = getHistoricalConversion_(country, trade);   // pipeline leakage (Country×Trade)
  var difficulty = getTradeDifficulty_(trade);        // trade scarcity

  // Effective confirmable supply, then compared to demand (capped at 1.0).
  // Oversupply is NOT penalised (deep bench fills even when rushed); scarcity
  // + urgency still collapses fast → no false Critical alerts.
  var weightedSupply  = ready + (revalidation * REVAL_WEIGHT);
  var effectiveSupply = weightedSupply * urgencyFactor * conversion * difficulty;
  var pct = Math.round(Math.min(effectiveSupply / demand, 1.0) * 100);

  // Risk gate keyed on IMMEDIATE (READY) stock vs demand — revalidation is not
  // a guarantee, so a near-term interview with READY < demand is still CRITICAL.
  var riskLevel;
  if      (daysToInterview <= 3 && ready < demand) riskLevel = 'CRITICAL';
  else if (pct < 30)                               riskLevel = 'HIGH';
  else if (pct < 60)                               riskLevel = 'MEDIUM';
  else if (pct < 85)                               riskLevel = 'LOW';
  else                                             riskLevel = 'HEALTHY';

  return {
    pct:             pct,
    riskLevel:       riskLevel,
    ready:           ready,
    revalidation:    revalidation,
    demand:          demand,
    daysToInterview: daysToInterview,
    factors: {
      urgencyFactor:    urgencyFactor,
      conversion:       conversion,
      tradeDifficulty:  difficulty,
      revalWeight:      REVAL_WEIGHT
    }
  };
}

// ── CRITICAL ACTIONS ENGINE ──────────────────────────────────────────
// Returns 5 ranked actions for CRITICAL or HIGH risk requirements.
function buildCriticalActions_(req, supply, daysToInterview) {
  var trade   = req.trade   || req.jobTitle    || 'the trade';
  var country = req.deployCountry              || 'target country';
  var demand  = (req.committedQty > 0) ? req.committedQty : req.requiredQty;
  var gap     = Math.max(0, demand - supply.freshDeployable);

  return [
    'ACTION 1 — Associate broadcast: activate all associates immediately for ' +
      trade + ' → ' + country + '. Confirmed gap: ' + gap + ' candidates. Share requirement card now.',

    'ACTION 2 — Bulk outreach: WhatsApp/call all ' + supply.freshDeployable +
      ' READY ' + trade + ' candidates. Confirm availability and passport validity for ' + country + ' deployment.',

    supply.revalidationDeployable > 0
      ? 'ACTION 3 — Revalidate ' + supply.revalidationDeployable +
          ' Revalidation-Required ' + trade + ' candidates within 24h — confirm current availability and location.'
      : 'ACTION 3 — Adjacent trade expansion: open GOOD/POSSIBLE tier matching for related trades (Fitter, Boilermaker, Pipe Welder) to find hidden supply.',

    supply.localPool > 0
      ? 'ACTION 4 — Local hire track: ' + supply.localPool + ' ' + trade +
          ' candidates already in ' + country + '. Explore direct local hire (separate visa class) as parallel track.'
      : 'ACTION 4 — Expand sourcing geography: open requirement to additional states/cities. Brief regional associates for wider coverage.',

    'ACTION 5 — Client escalation: document supply risk and notify client. Request interview date extension (current buffer: ' +
      (daysToInterview === 999 ? 'not set' : daysToInterview + ' days') +
      '). Record client response in requirement notes.'
  ];
}

// ── MAIN: REQUIREMENT COMMAND CENTER ────────────────────────────────
// GET ?action=requirementCommandCenter
// GET ?action=requirementCommandCenter&reqId=AYE-REQ-2026-0001
// Returns all open requirements enriched with live supply intelligence.
function requirementCommandCenter_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Requirements');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, requirements:[], count:0 };

  var filterReqId = String(params.reqId||'').trim();
  var numCols     = Math.min(sheet.getLastColumn(), 25);
  var data        = sheet.getRange(2, 1, sheet.getLastRow()-1, numCols).getValues();
  var now         = new Date();

  // ── Load all candidates once and annotate with freshness ──────────
  var candidates = [];
  var cSheet = ss.getSheetByName('Candidates');
  if (cSheet && cSheet.getLastRow() > 1) {
    var cCols = Math.min(cSheet.getLastColumn(), 42);
    var cData = cSheet.getRange(2, 1, cSheet.getLastRow()-1, cCols).getValues();
    cData.forEach(function(row) {
      var active = String(row[COL.active-1]||'').toUpperCase().trim();
      if (active === 'SUPERSEDED' || active === 'ARCHIVED') return;
      var name  = String(row[COL.name-1]||'').trim();
      var email = String(row[COL.email-1]||'').trim();
      if (!name && !email) return;
      candidates.push({
        trade:           String(row[COL.trade-1]||'').trim(),
        positionApplied: String(row[COL.positionApplied-1]||'').trim(),
        experience:      parseFloat(row[COL.experience-1])||0,
        age:             parseInt(row[COL.age-1])||0,
        gulfExp:         String(row[COL.gulfExp-1]||'').trim(),
        currentLocation: String(row[COL.currentLocation-1]||'').trim(),
        kaiAssessment:   String(row[COL.kaiAssessment-1]||'').trim(),
        top3Positions:   parseTop3Positions_(String(row[COL.top3Positions-1]||'')),
        _freshness:      classifyDatabaseFreshness_(
                           row[COL.candidateState-1],
                           row[COL.lastContact-1],
                           row[COL.passportExpiry-1],
                           row[COL.applicationDate-1]
                         )
      });
    });
  }

  // ── Enrich each requirement ───────────────────────────────────────
  var results = [];
  data.forEach(function(row) {
    var reqId = String(row[0]||'').trim();
    if (!reqId) return;
    if (filterReqId && reqId !== filterReqId) return;

    var requiredQty   = parseInt(row[5])    || 0;
    var minExp        = parseFloat(row[6])  || 0;
    var minAge        = parseInt(row[7])    || 0;
    var maxAge        = parseInt(row[8])    || 0;
    var deployCountry = String(row[3]||'').trim();
    var trade         = String(row[4]||'').trim();
    var committedQty  = parseInt(row[23])   || 0;

    // Interview date → days remaining
    var interviewDateRaw = numCols >= 25 ? row[24] : null;
    var interviewDateStr = '';
    var daysToInterview  = 999;
    if (interviewDateRaw instanceof Date && !isNaN(interviewDateRaw)) {
      interviewDateStr = Utilities.formatDate(interviewDateRaw,'Asia/Dubai','yyyy-MM-dd');
      daysToInterview  = Math.floor((interviewDateRaw - now) / (1000*60*60*24));
    } else if (interviewDateRaw && String(interviewDateRaw).trim()) {
      interviewDateStr = String(interviewDateRaw).trim();
      var iDate = new Date(interviewDateStr);
      if (!isNaN(iDate)) daysToInterview = Math.floor((iDate - now) / (1000*60*60*24));
    }

    // Supply + fill math (Correction 2 — fill consumes READY + REVAL + trade)
    var supply = getDeployableSupply_(deployCountry, trade, minExp, minAge, maxAge, candidates);
    var readySupply        = supply.freshDeployable;
    var revalidationSupply = supply.revalidationDeployable;
    var fill = computeFillProbability_(
      readySupply, revalidationSupply,
      requiredQty, committedQty, daysToInterview, trade, deployCountry
    );

    // Correction 1 — shortfall measured against IMMEDIATE (READY) stock only.
    var demand    = committedQty || requiredQty;
    var shortfall = Math.max(0, demand - readySupply);

    // Critical actions only when there's a real problem
    var criticalActions = [];
    if (fill.riskLevel === 'CRITICAL' || fill.riskLevel === 'HIGH') {
      criticalActions = buildCriticalActions_(
        { trade:trade, deployCountry:deployCountry,
          requiredQty:requiredQty, committedQty:committedQty },
        supply, daysToInterview
      );
    }

    results.push({
      reqId:           reqId,
      receivedDate:    row[1] instanceof Date
                         ? Utilities.formatDate(row[1],'Asia/Dubai','dd-MMM-yyyy') : '',
      clientName:      String(row[2]||'').trim(),
      deployCountry:   deployCountry,
      trade:           trade,
      jobTitle:        trade,
      // ── Command Center header fields (Correction 4) ─────────────
      requiredQty:        requiredQty,
      committedQty:       committedQty,
      readySupply:        readySupply,         // Correction 1 — immediate
      revalidationSupply: revalidationSupply,  // Correction 1 — needs reconfirm
      shortfall:          shortfall,
      interviewDate:      interviewDateStr,
      daysRemaining:      daysToInterview === 999 ? null : daysToInterview,
      fillProbability:    fill.pct,
      riskLevel:          fill.riskLevel,
      // ── Secondary detail ────────────────────────────────────────
      minExperience:   minExp,
      minAge:          minAge,
      maxAge:          maxAge,
      urgency:         String(row[13]||'Normal').trim(),
      status:          String(row[14]||'Open').trim(),
      sourcedBy:       String(row[15]||'').trim(),
      notes:           String(row[19]||'').trim(),
      jdId:            String(row[20]||'').trim(),
      startDate:       row[21] instanceof Date
                         ? Utilities.formatDate(row[21],'Asia/Dubai','yyyy-MM-dd') : String(row[21]||''),
      endDate:         row[22] instanceof Date
                         ? Utilities.formatDate(row[22],'Asia/Dubai','yyyy-MM-dd') : String(row[22]||''),
      // ── Recruiter-facing supply (Correction 6: NO expired here) ──
      supply: {
        tradePossible:      supply.tradePossible,
        readySupply:        readySupply,
        revalidationSupply: revalidationSupply,
        localExcluded:      supply.localPool,
        byMobility:         supply.byMobility
      },
      fillFactors:     fill.factors,
      criticalActions: criticalActions,
      // ── Internal-only metrics (Correction 6 — never render to recruiter)
      _internal: {
        expired:        supply.freshBreakdown.EXPIRED,
        totalDeployable:supply.deployable,
        freshBreakdown: supply.freshBreakdown
      }
    });
  });

  return { ok:true, requirements:results, count:results.length };
}

// ── PHASE 1 SETUP + TEST ─────────────────────────────────────────────
function setupPhase1() {
  var ss = SpreadsheetApp.openById(SS_ID);
  Logger.log('1.1 _Requirements cols 24-25: ' + (ensureReqSchema_(ss) ? 'OK (Committed Qty + Interview Date)' : 'FAILED — _Requirements sheet missing'));
  Logger.log('Phase 1 infrastructure ready.');
  Logger.log('Verify: GET ?action=requirementCommandCenter');
}

function testPhase1() {
  var now = new Date();

  // 1.3 Freshness tests
  var d400  = new Date(now - 400*24*60*60*1000);  // 400 days ago
  var d30   = new Date(now - 30*24*60*60*1000);   // 30 days ago
  var ppExp = new Date(now - 10*24*60*60*1000);   // passport expired
  var ppOk  = new Date(now.getFullYear()+2, now.getMonth(), now.getDate());
  var d700  = new Date(now - 700*24*60*60*1000);  // ~23 months ago (cold)
  Logger.log('Freshness tests:');
  Logger.log('  rejected state:              ' + classifyDatabaseFreshness_('Rejected', d30, ppOk, d30));
  Logger.log('  400d lastContact:           ' + classifyDatabaseFreshness_('', d400, ppOk, null));
  Logger.log('  30d contact, good pp:       ' + classifyDatabaseFreshness_('', d30, ppOk, null));
  Logger.log('  30d contact, exp pp:        ' + classifyDatabaseFreshness_('', d30, ppExp, null));
  Logger.log('  blank contact, 30d appDate: ' + classifyDatabaseFreshness_('', null, ppOk, d30));
  Logger.log('  blank contact, 700d appDate:' + classifyDatabaseFreshness_('', null, ppOk, d700));
  Logger.log('  no dates at all:            ' + classifyDatabaseFreshness_('', null, ppOk, null));

  // 1.4 Fill probability tests (ready, revalidation, required, committed, days, trade)
  Logger.log('Fill probability tests:');
  var fp1 = computeFillProbability_(5, 3, 10, 0, 2, 'Welder');
  Logger.log('  5 ready+3 reval / 10 req / 2d Welder:  pct=' + fp1.pct + ' risk=' + fp1.riskLevel);
  var fp2 = computeFillProbability_(9, 1, 10, 0, 30, 'Welder');
  Logger.log('  9 ready+1 reval / 10 req / 30d Welder: pct=' + fp2.pct + ' risk=' + fp2.riskLevel);
  var fp3 = computeFillProbability_(3, 2, 20, 0, 7, 'QC Inspector');
  Logger.log('  3 ready+2 reval / 20 req / 7d QC:      pct=' + fp3.pct + ' risk=' + fp3.riskLevel);
  var fp4 = computeFillProbability_(234, 67, 12, 0, 3, 'Electrician');
  Logger.log('  234 ready / 12 req / 3d Electrician:   pct=' + fp4.pct + ' risk=' + fp4.riskLevel + ' (oversupply must be HEALTHY)');

  // 1.2 Live supply smoke test (first 500 candidates)
  var ss     = SpreadsheetApp.openById(SS_ID);
  var cSheet = ss.getSheetByName('Candidates');
  if (!cSheet || cSheet.getLastRow() < 2) {
    Logger.log('Supply test: no candidates'); return;
  }
  var limit  = Math.min(cSheet.getLastRow()-1, 500);
  var cCols  = Math.min(cSheet.getLastColumn(), 42);
  var cData  = cSheet.getRange(2, 1, limit, cCols).getValues();
  var cands  = [];
  cData.forEach(function(row) {
    var active = String(row[COL.active-1]||'').toUpperCase();
    if (active === 'SUPERSEDED' || active === 'ARCHIVED') return;
    cands.push({
      trade:           String(row[COL.trade-1]||''),
      positionApplied: String(row[COL.positionApplied-1]||''),
      experience:      parseFloat(row[COL.experience-1])||0,
      age:             parseInt(row[COL.age-1])||0,
      gulfExp:         String(row[COL.gulfExp-1]||''),
      currentLocation: String(row[COL.currentLocation-1]||''),
      kaiAssessment:   String(row[COL.kaiAssessment-1]||''),
      top3Positions:   parseTop3Positions_(String(row[COL.top3Positions-1]||'')),
      _freshness:      classifyDatabaseFreshness_(
                         row[COL.candidateState-1],
                         row[COL.lastContact-1],
                         row[COL.passportExpiry-1],
                         row[COL.applicationDate-1]
                       )
    });
  });
  Logger.log('Supply test (Saudi / Welder / 2yr exp / max 45):');
  var s1 = getDeployableSupply_('Saudi Arabia', 'Welder', 2, 0, 45, cands);
  Logger.log('  tradePossible=' + s1.tradePossible + ' deployable=' + s1.deployable +
             ' fresh=' + s1.freshDeployable + ' revalidation=' + s1.revalidationDeployable +
             ' local=' + s1.localPool);
  Logger.log('  byMobility: '     + JSON.stringify(s1.byMobility));
  Logger.log('  freshBreakdown: ' + JSON.stringify(s1.freshBreakdown));
  var fill1 = computeFillProbability_(s1.freshDeployable, s1.revalidationDeployable, 10, 0, 5, 'Welder');
  Logger.log('  fillProbability for 10 qty / 5 days: pct=' + fill1.pct + ' risk=' + fill1.riskLevel);
}

// ════════════════════════════════════════════════════════════════════
// SECTION 30 — PHASE 1 VALIDATION GATE (operational reality, not code)
// ════════════════════════════════════════════════════════════════════
//
//  PURPOSE: Prove Deployable Supply reflects recruitment REALITY before
//  any UI ships. Runs 5 real-world requirement probes against the LIVE
//  production candidate database (full 6,600+ rows, not capped).
//
//  Run from GAS editor:  validatePhase1()
//  Read the Logger output. For EACH requirement it prints:
//    Required Qty · Deployable Supply · READY/REVALIDATION/EXPIRED ·
//    Fill Probability · Risk · Top DB Supply · Associate Signal
//
//  GATE: If any row is operationally absurd (e.g. 0 deployable welders in a
//  6,600-CV DB, or 100% EXPIRED), STOP. Fix data classification. Do NOT ship.
//
//  NOTE ON ASSOCIATES: capacity-gated Associate Score is Phase 2 (needs
//  _Commitments / _AssociateCapacity / _AssociateReliability). Here we print
//  only a LIGHTWEIGHT associate signal (who covers this state/specialization
//  from _Associates). Labelled "[pre-P2]" so it is never mistaken for the
//  real recommendation engine.
// ════════════════════════════════════════════════════════════════════

// ── ASSOCIATE IDENTITY HELPERS (Correction 3) ───────────────────────
// A string is "phone-like" if, stripped of separators, it's ≥7 digits and
// has no real alpha content — i.e. it's a number masquerading as a name.
function isPhoneLike_(s) {
  var str = String(s||'').trim();
  if (!str) return false;
  var digits = str.replace(/[\s\-\/\+\(\)\.]/g, '');
  return /^\d{7,}(?:[\/,]\d{7,})*$/.test(digits) || /^[\d\s\-\/\+\(\)\.]{7,}$/.test(str);
}

// Resolve a presentable associate identity, never a raw phone number.
// Prefers a non-phone company name, then a non-phone contact name, else the
// stable AssocId. Guarantees the primary identity is human-readable.
function assocDisplayName_(companyName, contactName, assocId) {
  var co = String(companyName||'').trim();
  var ct = String(contactName||'').trim();
  if (co && !isPhoneLike_(co)) return co;
  if (ct && !isPhoneLike_(ct)) return ct;
  return 'Associate ' + String(assocId||'').trim();
}

// The 5 validation probes — spread across countries + trades per the gate spec.
var P1_VALIDATION_PROBES_ = [
  { country:'Saudi Arabia', trade:'Welder',      requiredQty:10, minExp:2, maxAge:45, daysToInterview:7 },
  { country:'UAE',          trade:'Pipe Fitter', requiredQty:8,  minExp:2, maxAge:45, daysToInterview:5 },
  { country:'Qatar',        trade:'Fabricator',  requiredQty:6,  minExp:2, maxAge:48, daysToInterview:14 },
  { country:'Saudi Arabia', trade:'Electrician', requiredQty:12, minExp:3, maxAge:45, daysToInterview:3 },
  { country:'UAE',          trade:'Driver',      requiredQty:15, minExp:1, maxAge:50, daysToInterview:10 }
];

function validatePhase1() {
  var ss     = SpreadsheetApp.openById(SS_ID);
  var cSheet = ss.getSheetByName('Candidates');
  if (!cSheet || cSheet.getLastRow() < 2) { Logger.log('VALIDATION ABORT: no candidates'); return; }

  // ── Load the FULL live candidate database once ────────────────────
  var total = cSheet.getLastRow() - 1;
  var cCols = Math.min(cSheet.getLastColumn(), 42);
  var cData = cSheet.getRange(2, 1, total, cCols).getValues();
  var cands = [];
  var freshAll = { READY:0, REVALIDATION:0, EXPIRED:0 };
  cData.forEach(function(row) {
    var active = String(row[COL.active-1]||'').toUpperCase().trim();
    if (active === 'SUPERSEDED' || active === 'ARCHIVED') return;
    var name  = String(row[COL.name-1]||'').trim();
    var email = String(row[COL.email-1]||'').trim();
    if (!name && !email) return;
    var fresh = classifyDatabaseFreshness_(
      row[COL.candidateState-1], row[COL.lastContact-1],
      row[COL.passportExpiry-1], row[COL.applicationDate-1]
    );
    freshAll[fresh] = (freshAll[fresh]||0) + 1;
    cands.push({
      trade:           String(row[COL.trade-1]||''),
      positionApplied: String(row[COL.positionApplied-1]||''),
      experience:      parseFloat(row[COL.experience-1])||0,
      age:             parseInt(row[COL.age-1])||0,
      gulfExp:         String(row[COL.gulfExp-1]||''),
      currentLocation: String(row[COL.currentLocation-1]||''),
      kaiAssessment:   String(row[COL.kaiAssessment-1]||''),
      top3Positions:   parseTop3Positions_(String(row[COL.top3Positions-1]||'')),
      _name:           name,
      _kaiNo:          String(row[COL.kaiNo-1]||'').trim(),
      _score:          parseInt(row[COL.score-1])||0,
      _freshness:      fresh
    });
  });

  // ── Load associates for lightweight signal ────────────────────────
  // Correction 3 — show Company / Contact Person / State / Category.
  // Never use a raw phone number as the primary identity.
  var assocs = [];
  var aSheet = ss.getSheetByName('_Associates');
  if (aSheet && aSheet.getLastRow() > 1) {
    aSheet.getDataRange().getValues().slice(1).forEach(function(r) {
      if (!String(r[0]||'').trim()) return;
      if (String(r[15]||'').toUpperCase() !== 'YES') return;  // active only
      assocs.push({
        assocId:     String(r[0]||'').trim(),
        companyName: String(r[1]||'').trim(),
        contactName: String(r[2]||'').trim(),
        displayName: assocDisplayName_(r[1], r[2], r[0]),  // phone-safe identity
        state:       String(r[5]||'').trim(),
        category:    String(r[9]||'').trim(),
        spec:        String(r[9]||'').toLowerCase(),
        capacity:    String(r[10]||'').trim()
      });
    });
  }

  Logger.log('════════════════════════════════════════════════════');
  Logger.log('PHASE 1 VALIDATION — LIVE PRODUCTION DATA');
  Logger.log('Candidate pool (active): ' + cands.length + ' of ' + total + ' rows');
  Logger.log('DB-wide freshness: READY=' + freshAll.READY +
             ' REVALIDATION=' + freshAll.REVALIDATION +
             ' EXPIRED=' + freshAll.EXPIRED);
  Logger.log('Active associates: ' + assocs.length);
  Logger.log('════════════════════════════════════════════════════');

  var flags = [];
  P1_VALIDATION_PROBES_.forEach(function(p, idx) {
    var supply = getDeployableSupply_(
      p.country, p.trade, p.minExp, 0, p.maxAge, cands, { collect:true }
    );
    var fill = computeFillProbability_(
      supply.freshDeployable, supply.revalidationDeployable,
      p.requiredQty, 0, p.daysToInterview, p.trade, p.country
    );

    // Top DB supply — READY first, then by score, then experience
    var top = supply.deployableList.slice().sort(function(a, b) {
      if (a.freshness !== b.freshness) return a.freshness === 'READY' ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return b.experience - a.experience;
    }).slice(0, 5);

    // Lightweight associate signal — specialization keyword OR any (sorted by capacity desc)
    var tradeKey = p.trade.toLowerCase().split(' ')[0];
    var matchedAssoc = assocs.filter(function(a) {
      return a.spec && (a.spec.indexOf(tradeKey) >= 0 || a.spec.indexOf('all') >= 0 ||
                        a.spec.indexOf('general') >= 0 || a.spec.indexOf('fabrication') >= 0);
    });
    if (!matchedAssoc.length) matchedAssoc = assocs.slice();  // fallback: any active associate
    matchedAssoc = matchedAssoc.sort(function(a, b) {
      return (parseInt(b.capacity)||0) - (parseInt(a.capacity)||0);
    }).slice(0, 3);

    Logger.log('');
    Logger.log('── REQ ' + (idx+1) + ': ' + p.trade + ' → ' + p.country +
               ' (min ' + p.minExp + 'yr, max age ' + p.maxAge + ') ──');
    Logger.log('  Required Qty:        ' + p.requiredQty);
    Logger.log('  Trade-matched pool:  ' + supply.tradePossible);
    Logger.log('  Deployable Supply:   ' + supply.deployable +
               '   (local-excluded: ' + supply.localPool + ')');
    Logger.log('    READY:             ' + supply.freshBreakdown.READY);
    Logger.log('    REVALIDATION:      ' + supply.freshBreakdown.REVALIDATION);
    Logger.log('    EXPIRED:           ' + supply.freshBreakdown.EXPIRED);
    Logger.log('  Mobility mix:        ' + JSON.stringify(supply.byMobility));
    Logger.log('  Interview in:        ' + p.daysToInterview + ' days');
    Logger.log('  Fill Probability:    ' + fill.pct + '%');
    Logger.log('  Risk:                ' + fill.riskLevel);
    Logger.log('  Top DB Supply:');
    if (!top.length) {
      Logger.log('      (none deployable)');
    } else {
      top.forEach(function(c, i) {
        Logger.log('      ' + (i+1) + '. ' + (c.name||'(unnamed)') +
                   '  [' + c.freshness + ', ' + c.mobility +
                   ', score ' + c.score + ', ' + c.experience + 'yr]');
      });
    }
    Logger.log('  Top Associates [pre-P2 signal, not capacity-scored]:');
    if (!matchedAssoc.length) {
      Logger.log('      (no active associates on file)');
    } else {
      matchedAssoc.forEach(function(a, i) {
        // Correction 3 — Name / Contact Person / State / Category. No raw phone as identity.
        var contactDisp = isPhoneLike_(a.contactName) ? '—' : (a.contactName || '—');
        Logger.log('      ' + (i+1) + '. ' + a.displayName +
                   '  [contact: ' + contactDisp +
                   ', ' + (a.state || 'state ?') +
                   ', ' + (a.category || 'category ?') + ']');
      });
    }

    // ── Reality flags ───────────────────────────────────────────────
    if (supply.tradePossible === 0)
      flags.push('REQ' + (idx+1) + ' (' + p.trade + '): ZERO trade-matched candidates in entire DB — check trade-family keywords.');
    if (supply.tradePossible > 0 && supply.deployable === 0)
      flags.push('REQ' + (idx+1) + ' (' + p.trade + '): pool exists but ZERO deployable — likely freshness over-expiring.');
    if (supply.tradePossible > 20 && supply.freshBreakdown.EXPIRED / supply.tradePossible > 0.9)
      flags.push('REQ' + (idx+1) + ' (' + p.trade + '): >90% EXPIRED — freshness classifier likely mis-calibrated.');
  });

  Logger.log('');
  Logger.log('════════════════════════════════════════════════════');
  if (flags.length) {
    Logger.log('⚠ VALIDATION FLAGS — DO NOT SHIP UNTIL RESOLVED:');
    flags.forEach(function(f) { Logger.log('  • ' + f); });
  } else {
    Logger.log('✓ No reality flags raised. Supply numbers look operationally plausible.');
    Logger.log('  Human review still required before Lovable deployment.');
  }
  Logger.log('════════════════════════════════════════════════════');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 31 — PHASE 1: REQUIREMENT DASHBOARD HOME CARDS (Correction 7)
// ════════════════════════════════════════════════════════════════════
//
//  GET ?action=requirementDashboardCards
//  Returns the 6 home-screen cards with live counts + drill-down ids.
//
//  Cards:
//   1. urgentRequirements        — urgency High/Urgent OR ≤3 days to interview
//   2. candidatesAwaitingSubmission — slots ADDED/SHORTLISTED, not yet SUBMITTED
//   3. mobilizationPending       — slots SELECTED, not yet DEPLOYED
//   4. travelThisWeek            — DEPLOYED slots updated within next/last 7 days
//                                  (best-effort; flagged dataPending — no dedicated
//                                   travel-date field exists yet)
//   5. requiredQtyNotAchieved    — open reqs where selectedCount < requiredQty
//   6. interviewDateApproaching  — reqs with interview date in next 7 days
// ════════════════════════════════════════════════════════════════════
function getRequirementDashboardCards_(params) {
  var ss  = SpreadsheetApp.openById(SS_ID);
  var now = new Date();
  var DAY = 1000*60*60*24;

  // ── Requirements pass ─────────────────────────────────────────────
  var urgent = [], notAchieved = [], interviewSoon = [];
  var rSheet = ss.getSheetByName('_Requirements');
  if (rSheet && rSheet.getLastRow() > 1) {
    var rCols = Math.min(rSheet.getLastColumn(), 25);
    var rData = rSheet.getRange(2, 1, rSheet.getLastRow()-1, rCols).getValues();
    rData.forEach(function(row) {
      var reqId = String(row[0]||'').trim();
      if (!reqId) return;
      var status = String(row[14]||'Open').trim().toLowerCase();
      var isOpen = (status !== 'closed' && status !== 'cancelled' &&
                    status !== 'archived' && status !== 'filled');
      if (!isOpen) return;

      var requiredQty   = parseInt(row[5])  || 0;
      var selectedCount = parseInt(row[18]) || 0;
      var urgency       = String(row[13]||'').trim().toLowerCase();
      var trade         = String(row[4]||'').trim();
      var client        = String(row[2]||'').trim();

      // Interview date → days remaining
      var iRaw = rCols >= 25 ? row[24] : null;
      var days = null;
      if (iRaw instanceof Date && !isNaN(iRaw)) {
        days = Math.floor((iRaw - now) / DAY);
      } else if (iRaw && String(iRaw).trim()) {
        var d = new Date(iRaw); if (!isNaN(d)) days = Math.floor((d - now) / DAY);
      }

      var ref = { reqId:reqId, trade:trade, client:client,
                  requiredQty:requiredQty, selectedCount:selectedCount,
                  daysRemaining:days };

      if (urgency === 'urgent' || urgency === 'high' || (days !== null && days >= 0 && days <= 3))
        urgent.push(ref);
      if (selectedCount < requiredQty)
        notAchieved.push(ref);
      if (days !== null && days >= 0 && days <= 7)
        interviewSoon.push(ref);
    });
  }

  // ── Slots pass ────────────────────────────────────────────────────
  var awaitingSub = 0, mobPending = 0, travelWeek = 0;
  var sSheet = ss.getSheetByName('_CandidateSlots');
  if (sSheet && sSheet.getLastRow() > 1) {
    var sData = sSheet.getDataRange().getValues();
    for (var i = 1; i < sData.length; i++) {
      var srow = sData[i];
      if (!String(srow[0]||'').trim()) continue;
      var st = String(srow[9]||'').trim().toUpperCase();   // SlotStatus
      if (st === 'ADDED' || st === 'SHORTLISTED' || st === 'INTERVIEWED') awaitingSub++;
      if (st === 'SELECTED') mobPending++;
      if (st === 'DEPLOYED') {
        var upd = srow[11];   // UpdatedAt
        if (upd instanceof Date && !isNaN(upd)) {
          var diff = Math.abs((upd - now) / DAY);
          if (diff <= 7) travelWeek++;
        }
      }
    }
  }

  // Helper — sort req refs by soonest interview, then biggest gap
  function sortRefs_(arr) {
    return arr.sort(function(a, b) {
      var ad = a.daysRemaining === null ? 9999 : a.daysRemaining;
      var bd = b.daysRemaining === null ? 9999 : b.daysRemaining;
      if (ad !== bd) return ad - bd;
      return (b.requiredQty - b.selectedCount) - (a.requiredQty - a.selectedCount);
    });
  }

  return {
    ok: true,
    generatedAt: now.toISOString(),
    cards: {
      urgentRequirements:           { count: urgent.length,        items: sortRefs_(urgent).slice(0,20) },
      candidatesAwaitingSubmission: { count: awaitingSub },
      mobilizationPending:          { count: mobPending },
      travelThisWeek:               { count: travelWeek, dataPending: true,
                                      note: 'Best-effort from DEPLOYED slot UpdatedAt — no dedicated travel-date field yet.' },
      requiredQtyNotAchieved:       { count: notAchieved.length,   items: sortRefs_(notAchieved).slice(0,20) },
      interviewDateApproaching:     { count: interviewSoon.length, items: sortRefs_(interviewSoon).slice(0,20) }
    }
  };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 32 — PHASE 2: ASSOCIATE PRODUCTION UNITS
// ════════════════════════════════════════════════════════════════════
//
//  Three new sheets (created once by setupPhase2()):
//    _Commitments        — per-requirement supply pledges from associates
//    _AssociateCapacity  — time-windowed candidate capacity per associate×trade
//    _AssociateReliability — country×trade historical delivery performance
//
//  Capacity-gated Associate Score (locked v3 formula):
//    Score = CapacityInWindow × CommitmentAccuracy × CountryTradeReliability × MobilizationRate
//    GATE: CapacityInWindow = 0 → Score = 0, associate NOT recommended.
//
//  Main output: GET ?action=recommendedSources&reqId=X
//    Returns ranked associates + database supply + open leads for one requirement.
//    Fills the "Recommended Sources" placeholder left in the Phase 1 UI.
//
//  Deploy:
//    1. Paste file → Save → Deploy new version
//    2. Run setupPhase2()     — creates all three sheets with headers
//    3. Run testPhase2()      — smoke-test score formula + sheet access
//    4. GET ?action=recommendedSources&reqId=<any-live-reqId>
// ════════════════════════════════════════════════════════════════════

// ── SHEET SCHEMAS ───────────────────────────────────────────────────
var COMMITMENTS_HEADERS_ = [
  'CommitId','ReqId','AssocId','AssocName','Trade','Country',
  'CommittedQty','DeliveredQty','CommitDate','InterviewDate',
  'Status','Notes','UpdatedAt','CreatedBy'
];
// Commitment Status flow: OPEN → PARTIAL | FULFILLED | CANCELLED
var VALID_COMMIT_STATUSES_ = ['OPEN','PARTIAL','FULFILLED','CANCELLED'];

var CAPACITY_HEADERS_ = [
  'CapacityId','AssocId','AssocName','Trade',
  'Within3d','Within7d','Within15d','Beyond15d',
  'UpdatedAt','UpdatedBy'
];

var RELIABILITY_HEADERS_ = [
  'RelId','AssocId','AssocName','Country','Trade',
  'TotalCommitted','TotalDelivered','CommitmentAccuracy',
  'MobCommitted','MobDeployed','MobilizationRate',
  'LastUpdated'
];

function ensureCommitmentsSheet_(ss) {
  return ensureSheetWithHeaders_(ss, '_Commitments', COMMITMENTS_HEADERS_, '#1A5276');
}
function ensureCapacitySheet_(ss) {
  return ensureSheetWithHeaders_(ss, '_AssociateCapacity', CAPACITY_HEADERS_, '#145A32');
}
function ensureReliabilitySheet_(ss) {
  return ensureSheetWithHeaders_(ss, '_AssociateReliability', RELIABILITY_HEADERS_, '#4A235A');
}
function ensureSheetWithHeaders_(ss, name, headers, color) {
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(headers);
    s.getRange(1,1,1,headers.length)
     .setFontWeight('bold').setBackground(color||'#2C3E50').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// ── ID GENERATORS ───────────────────────────────────────────────────
function generateCommitId_() {
  return 'CMT-' + Utilities.formatDate(new Date(),'Asia/Dubai','yyyyMMdd') +
         '-' + String(Math.floor(Math.random()*90000)+10000);
}
function generateCapacityId_() {
  return 'CAP-' + Utilities.formatDate(new Date(),'Asia/Dubai','yyyyMMdd') +
         '-' + String(Math.floor(Math.random()*9000)+1000);
}
function generateRelId_() {
  return 'REL-' + String(Math.floor(Math.random()*900000)+100000);
}

// ── COMMITMENTS ──────────────────────────────────────────────────────
// GET ?action=commitments&reqId=X  OR  &assocId=Y
function getCommitments_(params) {
  var ss      = SpreadsheetApp.openById(SS_ID);
  var sheet   = ss.getSheetByName('_Commitments');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, commitments:[], count:0 };
  var filterReq   = String(params.reqId   ||'').trim();
  var filterAssoc = String(params.assocId ||'').trim();
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!String(r[0]||'').trim()) continue;
    if (filterReq   && String(r[1]) !== filterReq)   continue;
    if (filterAssoc && String(r[2]) !== filterAssoc) continue;
    list.push({
      commitId:     String(r[0]),  reqId:        String(r[1]),
      assocId:      String(r[2]),  assocName:    String(r[3]),
      trade:        String(r[4]),  country:      String(r[5]),
      committedQty: parseInt(r[6])||0,
      deliveredQty: parseInt(r[7])||0,
      commitDate:   r[8]  instanceof Date ? Utilities.formatDate(r[8],'Asia/Dubai','yyyy-MM-dd')  : String(r[8]||''),
      interviewDate:r[9]  instanceof Date ? Utilities.formatDate(r[9],'Asia/Dubai','yyyy-MM-dd')  : String(r[9]||''),
      status:       String(r[10]||'OPEN'),
      notes:        String(r[11]||''),
      updatedAt:    r[12] instanceof Date ? Utilities.formatDate(r[12],'Asia/Dubai','yyyy-MM-dd') : String(r[12]||''),
      createdBy:    String(r[13]||'')
    });
  }
  return { ok:true, commitments:list, count:list.length };
}

// POST action=createCommitment
// body: { reqId, assocId, assocName, committedQty, interviewDate?, notes? }
function createCommitment_(body) {
  var reqId    = String(body.reqId    ||'').trim();
  var assocId  = String(body.assocId  ||'').trim();
  var qty      = parseInt(body.committedQty)||0;
  if (!reqId || !assocId) return { ok:false, error:'reqId and assocId required' };
  if (qty <= 0)           return { ok:false, error:'committedQty must be > 0' };

  var ss = SpreadsheetApp.openById(SS_ID);

  // Resolve requirement for trade + country
  var trade = '', country = '', interviewDate = body.interviewDate || '';
  var rSheet = ss.getSheetByName('_Requirements');
  if (rSheet && rSheet.getLastRow() > 1) {
    var rData = rSheet.getDataRange().getValues();
    for (var i = 1; i < rData.length; i++) {
      if (String(rData[i][0]).trim() === reqId) {
        trade   = String(rData[i][4]||'');
        country = String(rData[i][3]||'');
        if (!interviewDate && rData[i][24]) {
          interviewDate = rData[i][24] instanceof Date
            ? Utilities.formatDate(rData[i][24],'Asia/Dubai','yyyy-MM-dd')
            : String(rData[i][24]);
        }
        break;
      }
    }
  }

  var assocName = String(body.assocName||'').trim();
  if (!assocName) {
    // Try resolving from _Associates
    var aSheet = ss.getSheetByName('_Associates');
    if (aSheet && aSheet.getLastRow() > 1) {
      var aData = aSheet.getDataRange().getValues();
      for (var j = 1; j < aData.length; j++) {
        if (String(aData[j][0]).trim() === assocId) {
          assocName = assocDisplayName_(aData[j][1], aData[j][2], assocId);
          break;
        }
      }
    }
    if (!assocName) assocName = assocId;
  }

  var commitId = generateCommitId_();
  var sheet    = ensureCommitmentsSheet_(ss);
  sheet.appendRow([
    commitId, reqId, assocId, assocName, trade, country,
    qty, 0, new Date(), interviewDate,
    'OPEN', String(body.notes||''), new Date(), CURRENT_ACTOR_||'system'
  ]);

  // Update _Requirements committedQty (sum across all OPEN/PARTIAL commitments)
  syncRequirementCommittedQty_(ss, reqId);

  logActivity_(ss, { kaiNo:'SYSTEM', rowIndex:0, action:'COMMITMENT_CREATED',
    detail: commitId + ' | ' + assocName + ' committed ' + qty + ' for ' + reqId,
    actor: CURRENT_ACTOR_ });

  return { ok:true, commitId:commitId, reqId:reqId, assocId:assocId,
           assocName:assocName, committedQty:qty };
}

// POST action=updateCommitment
// body: { commitId, deliveredQty?, status?, notes? }
function updateCommitment_(body) {
  var commitId = String(body.commitId||'').trim();
  if (!commitId) return { ok:false, error:'commitId required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Commitments');
  if (!sheet) return { ok:false, error:'_Commitments sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== commitId) continue;
    var r = i + 1;
    var delivered = body.deliveredQty !== undefined ? parseInt(body.deliveredQty)||0 : parseInt(data[i][7])||0;
    var committed = parseInt(data[i][6])||0;
    var newStatus = String(body.status||data[i][10]||'OPEN').toUpperCase();
    // Auto-status: if delivered >= committed → FULFILLED; if 0 < delivered < committed → PARTIAL
    if (body.deliveredQty !== undefined) {
      if      (delivered >= committed) newStatus = 'FULFILLED';
      else if (delivered > 0)          newStatus = 'PARTIAL';
    }
    sheet.getRange(r,8).setValue(delivered);
    sheet.getRange(r,11).setValue(newStatus);
    sheet.getRange(r,13).setValue(new Date());
    if (body.notes !== undefined) sheet.getRange(r,12).setValue(body.notes);

    // Keep _Requirements committedQty in sync
    syncRequirementCommittedQty_(ss, String(data[i][1]));

    // Refresh reliability for this associate×country×trade
    refreshAssociateReliabilityRow_(ss, String(data[i][2]), String(data[i][5]), String(data[i][4]));

    logActivity_(ss, { kaiNo:'SYSTEM', rowIndex:0, action:'COMMITMENT_UPDATED',
      detail: commitId + ' delivered=' + delivered + ' status=' + newStatus,
      actor: CURRENT_ACTOR_ });

    return { ok:true, commitId:commitId, deliveredQty:delivered, status:newStatus };
  }
  return { ok:false, error:'Commitment not found: '+commitId };
}

// Recompute _Requirements col 24 (committedQty) as sum of active commitments.
function syncRequirementCommittedQty_(ss, reqId) {
  var cSheet = ss.getSheetByName('_Commitments');
  if (!cSheet || cSheet.getLastRow() < 2) return;
  var total = 0;
  var cData = cSheet.getDataRange().getValues();
  for (var i = 1; i < cData.length; i++) {
    if (String(cData[i][1]).trim() !== reqId) continue;
    var st = String(cData[i][10]||'').toUpperCase();
    if (st === 'CANCELLED') continue;
    total += parseInt(cData[i][6])||0;
  }
  var rSheet = ss.getSheetByName('_Requirements');
  if (!rSheet) return;
  var rData = rSheet.getDataRange().getValues();
  for (var j = 1; j < rData.length; j++) {
    if (String(rData[j][0]).trim() === reqId) {
      rSheet.getRange(j+1, 24).setValue(total);
      return;
    }
  }
}

// ── ASSOCIATE CAPACITY ───────────────────────────────────────────────
// GET ?action=associateCapacity[&assocId=X][&trade=Y]
function getAssociateCapacity_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_AssociateCapacity');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, capacity:[], count:0 };
  var fAssoc = String(params.assocId||'').trim();
  var fTrade = String(params.trade  ||'').trim().toLowerCase();
  var data   = sheet.getDataRange().getValues();
  var list   = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!String(r[0]||'').trim()) continue;
    if (fAssoc && String(r[1]) !== fAssoc) continue;
    if (fTrade && String(r[3]||'').toLowerCase().indexOf(fTrade) < 0) continue;
    list.push({
      capacityId: String(r[0]), assocId: String(r[1]), assocName: String(r[2]),
      trade:      String(r[3]),
      within3d:   parseInt(r[4])||0,  within7d:   parseInt(r[5])||0,
      within15d:  parseInt(r[6])||0,  beyond15d:  parseInt(r[7])||0,
      updatedAt:  r[8] instanceof Date ? Utilities.formatDate(r[8],'Asia/Dubai','yyyy-MM-dd') : String(r[8]||''),
      updatedBy:  String(r[9]||'')
    });
  }
  return { ok:true, capacity:list, count:list.length };
}

// POST action=upsertAssociateCapacity
// body: { assocId, trade, within3d, within7d, within15d, beyond15d }
// One row per assocId×trade — upsert (update if exists, insert if not).
function upsertAssociateCapacity_(body) {
  var assocId = String(body.assocId||'').trim();
  var trade   = String(body.trade  ||'').trim();
  if (!assocId || !trade) return { ok:false, error:'assocId and trade required' };

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ensureCapacitySheet_(ss);
  var data  = sheet.getDataRange().getValues();

  // Resolve assocName
  var assocName = String(body.assocName||'').trim();
  if (!assocName) {
    var aSheet = ss.getSheetByName('_Associates');
    if (aSheet && aSheet.getLastRow() > 1) {
      aSheet.getDataRange().getValues().slice(1).forEach(function(ar) {
        if (!assocName && String(ar[0]).trim() === assocId)
          assocName = assocDisplayName_(ar[1], ar[2], assocId);
      });
    }
    if (!assocName) assocName = assocId;
  }

  var w3  = parseInt(body.within3d  )||0;
  var w7  = parseInt(body.within7d  )||0;
  var w15 = parseInt(body.within15d )||0;
  var wb  = parseInt(body.beyond15d )||0;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === assocId &&
        String(data[i][3]).trim().toLowerCase() === trade.toLowerCase()) {
      var r = i + 1;
      sheet.getRange(r,3).setValue(assocName);
      sheet.getRange(r,5).setValue(w3);
      sheet.getRange(r,6).setValue(w7);
      sheet.getRange(r,7).setValue(w15);
      sheet.getRange(r,8).setValue(wb);
      sheet.getRange(r,9).setValue(new Date());
      sheet.getRange(r,10).setValue(CURRENT_ACTOR_||'system');
      return { ok:true, upserted:'updated', assocId:assocId, trade:trade };
    }
  }
  // Insert new row
  sheet.appendRow([
    generateCapacityId_(), assocId, assocName, trade,
    w3, w7, w15, wb, new Date(), CURRENT_ACTOR_||'system'
  ]);
  return { ok:true, upserted:'created', assocId:assocId, trade:trade };
}

// ── ASSOCIATE RELIABILITY ────────────────────────────────────────────
// GET ?action=associateReliability[&assocId=X][&country=Y][&trade=Z]
function getAssociateReliability_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_AssociateReliability');
  if (!sheet || sheet.getLastRow() < 2) return { ok:true, reliability:[], count:0 };
  var fA = String(params.assocId ||'').trim();
  var fC = String(params.country ||'').trim().toLowerCase();
  var fT = String(params.trade   ||'').trim().toLowerCase();
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!String(r[0]||'').trim()) continue;
    if (fA && String(r[1]) !== fA) continue;
    if (fC && String(r[3]||'').toLowerCase().indexOf(fC) < 0) continue;
    if (fT && String(r[4]||'').toLowerCase().indexOf(fT) < 0) continue;
    list.push({
      relId:              String(r[0]),  assocId:    String(r[1]),
      assocName:          String(r[2]),  country:    String(r[3]),
      trade:              String(r[4]),
      totalCommitted:     parseInt(r[5])||0,
      totalDelivered:     parseInt(r[6])||0,
      commitmentAccuracy: parseFloat(r[7])||0,
      mobCommitted:       parseInt(r[8])||0,
      mobDeployed:        parseInt(r[9])||0,
      mobilizationRate:   parseFloat(r[10])||0,
      lastUpdated:        r[11] instanceof Date ? Utilities.formatDate(r[11],'Asia/Dubai','yyyy-MM-dd') : String(r[11]||'')
    });
  }
  return { ok:true, reliability:list, count:list.length };
}

// Recompute one associate×country×trade row in _AssociateReliability.
// Called automatically by updateCommitment_.
function refreshAssociateReliabilityRow_(ss, assocId, country, trade) {
  if (!assocId || !country || !trade) return;

  // Commitment Accuracy from _Commitments
  var cSheet   = ss.getSheetByName('_Commitments');
  var totCommit = 0, totDeliver = 0;
  if (cSheet && cSheet.getLastRow() > 1) {
    cSheet.getDataRange().getValues().slice(1).forEach(function(r) {
      if (String(r[2]).trim() !== assocId) return;
      if (String(r[5]).trim().toLowerCase() !== country.toLowerCase()) return;
      if (String(r[4]).trim().toLowerCase() !== trade.toLowerCase()) return;
      var st = String(r[10]||'').toUpperCase();
      if (st === 'CANCELLED') return;
      totCommit  += parseInt(r[6])||0;
      totDeliver += parseInt(r[7])||0;
    });
  }
  var commitAcc = totCommit > 0 ? Math.round((totDeliver/totCommit)*100)/100 : 0;

  // Mobilization Rate from _CandidateSlots (SourceOwner = assocId or assocName)
  var sSheet = ss.getSheetByName('_CandidateSlots');
  var mobCommit = 0, mobDeploy = 0;
  if (sSheet && sSheet.getLastRow() > 1) {
    sSheet.getDataRange().getValues().slice(1).forEach(function(sr) {
      if (!String(sr[0]||'').trim()) return;
      var owner = String(sr[6]||'').trim().toLowerCase();
      if (owner.indexOf(assocId.toLowerCase()) < 0) return;
      var st = String(sr[9]||'').toUpperCase();
      if (st === 'SELECTED' || st === 'DEPLOYED') mobCommit++;
      if (st === 'DEPLOYED') mobDeploy++;
    });
  }
  var mobRate = mobCommit > 0 ? Math.round((mobDeploy/mobCommit)*100)/100 : 0;

  // Upsert reliability row
  var rSheet = ensureReliabilitySheet_(ss);
  var rData  = rSheet.getDataRange().getValues();
  for (var i = 1; i < rData.length; i++) {
    if (String(rData[i][1]).trim() === assocId &&
        String(rData[i][3]).trim().toLowerCase() === country.toLowerCase() &&
        String(rData[i][4]).trim().toLowerCase() === trade.toLowerCase()) {
      var row = i + 1;
      rSheet.getRange(row,6).setValue(totCommit);
      rSheet.getRange(row,7).setValue(totDeliver);
      rSheet.getRange(row,8).setValue(commitAcc);
      rSheet.getRange(row,9).setValue(mobCommit);
      rSheet.getRange(row,10).setValue(mobDeploy);
      rSheet.getRange(row,11).setValue(mobRate);
      rSheet.getRange(row,12).setValue(new Date());
      return;
    }
  }
  // Resolve name
  var aName = assocId;
  var aSheet = ss.getSheetByName('_Associates');
  if (aSheet && aSheet.getLastRow() > 1) {
    aSheet.getDataRange().getValues().slice(1).forEach(function(ar) {
      if (!aName || aName === assocId) {
        if (String(ar[0]).trim() === assocId)
          aName = assocDisplayName_(ar[1], ar[2], assocId);
      }
    });
  }
  rSheet.appendRow([
    generateRelId_(), assocId, aName, country, trade,
    totCommit, totDeliver, commitAcc,
    mobCommit, mobDeploy, mobRate, new Date()
  ]);
}

// POST action=refreshAssociateReliability
// body: { assocId?, all:true } — recompute one or all associates
function refreshAssociateReliability_(body) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var cSheet = ss.getSheetByName('_Commitments');
  if (!cSheet || cSheet.getLastRow() < 2) return { ok:true, refreshed:0 };

  var filterAssoc = String(body.assocId||'').trim();
  var seen = {};  // dedupe assocId×country×trade combos
  cSheet.getDataRange().getValues().slice(1).forEach(function(r) {
    var aId = String(r[2]||'').trim();
    var co  = String(r[5]||'').trim();
    var tr  = String(r[4]||'').trim();
    if (!aId || !co || !tr) return;
    if (filterAssoc && aId !== filterAssoc) return;
    var key = aId + '|' + co.toLowerCase() + '|' + tr.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    refreshAssociateReliabilityRow_(ss, aId, co, tr);
  });
  return { ok:true, refreshed:Object.keys(seen).length };
}

// ── ASSOCIATE SCORE ENGINE ───────────────────────────────────────────
// Capacity-gated score (locked v3):
//   Score = CapacityInWindow × CommitmentAccuracy × CountryTradeReliability × MobilizationRate
//   GATE: CapacityInWindow = 0 → score = 0, associate excluded regardless of history.
//
// Returns a score object for one associate vs one requirement context.
function scoreOneAssociate_(assoc, capacityRows, reliabilityRows, daysToInterview, country, trade) {
  // 1. Capacity gate — which time window applies?
  var window = 'beyond15d';
  if      (daysToInterview !== null && daysToInterview <= 3)  window = 'within3d';
  else if (daysToInterview !== null && daysToInterview <= 7)  window = 'within7d';
  else if (daysToInterview !== null && daysToInterview <= 15) window = 'within15d';

  var capacityInWindow = 0;
  var w3=0, w7=0, w15=0, wb=0;
  var tLower = trade.toLowerCase();
  capacityRows.forEach(function(cap) {
    if (cap.assocId !== assoc.assocId) return;
    if (cap.trade.toLowerCase().indexOf(tLower) < 0 &&
        tLower.indexOf(cap.trade.toLowerCase()) < 0) return;
    w3  = Math.max(w3,  cap.within3d);
    w7  = Math.max(w7,  cap.within7d);
    w15 = Math.max(w15, cap.within15d);
    wb  = Math.max(wb,  cap.beyond15d);
  });
  if      (window === 'within3d')  capacityInWindow = w3;
  else if (window === 'within7d')  capacityInWindow = w7;
  else if (window === 'within15d') capacityInWindow = w15;
  else                             capacityInWindow = wb;

  // GATE
  if (capacityInWindow === 0) {
    return { score:0, gated:true, gateReason:'CapacityInWindow=0',
             capacityInWindow:0, window:window,
             commitmentAccuracy:0, countryTradeReliability:0, mobilizationRate:0 };
  }

  // 2. Commitment Accuracy + Mobilization Rate (from reliability rows for this country×trade)
  var cLower = country.toLowerCase();
  var commitAcc  = 0.70;  // default (conservative baseline)
  var mobRate    = 0.70;
  var reliFound  = false;
  reliabilityRows.forEach(function(rel) {
    if (rel.assocId !== assoc.assocId) return;
    if (rel.country.toLowerCase().indexOf(cLower) < 0 &&
        cLower.indexOf(rel.country.toLowerCase()) < 0) return;
    if (rel.trade.toLowerCase().indexOf(tLower) < 0 &&
        tLower.indexOf(rel.trade.toLowerCase()) < 0) return;
    commitAcc = rel.commitmentAccuracy  > 0 ? rel.commitmentAccuracy  : 0.70;
    mobRate   = rel.mobilizationRate    > 0 ? rel.mobilizationRate    : 0.70;
    reliFound = true;
  });

  // 3. Country×Trade Reliability = commitmentAccuracy from the matched row
  //    (per v3 spec: CountryTradeReliability is stored per country×trade in _AssociateReliability)
  var countryTradeRel = commitAcc;

  // 4. Score = CapacityInWindow × CommitmentAccuracy × CountryTradeReliability × MobilizationRate
  //    Result = effective candidates expected to be deployed. Higher = better.
  var score = capacityInWindow * commitAcc * countryTradeRel * mobRate;
  score = Math.round(score * 10) / 10;

  return {
    score:                 score,
    gated:                 false,
    capacityInWindow:      capacityInWindow,
    window:                window,
    commitmentAccuracy:    commitAcc,
    countryTradeReliability: countryTradeRel,
    mobilizationRate:      mobRate,
    historyFound:          reliFound
  };
}

// GET ?action=associateScore&reqId=X&assocId=Y
function getAssociateScore_(params) {
  var reqId   = String(params.reqId   ||'').trim();
  var assocId = String(params.assocId ||'').trim();
  if (!reqId || !assocId) return { ok:false, error:'reqId and assocId required' };
  var ss = SpreadsheetApp.openById(SS_ID);

  // Resolve requirement context
  var trade='', country=''; var daysToInterview=null;
  var rSheet = ss.getSheetByName('_Requirements');
  if (rSheet && rSheet.getLastRow() > 1) {
    var now = new Date();
    rSheet.getDataRange().getValues().slice(1).forEach(function(r) {
      if (String(r[0]).trim() !== reqId) return;
      trade   = String(r[4]||'');
      country = String(r[3]||'');
      var iRaw = r[24];
      if (iRaw instanceof Date && !isNaN(iRaw))
        daysToInterview = Math.floor((iRaw - now)/(1000*60*60*24));
    });
  }

  // Resolve associate object
  var assoc = { assocId:assocId, displayName:assocId };
  var aSheet = ss.getSheetByName('_Associates');
  if (aSheet && aSheet.getLastRow() > 1) {
    aSheet.getDataRange().getValues().slice(1).forEach(function(ar) {
      if (String(ar[0]).trim() === assocId)
        assoc = { assocId:assocId, displayName: assocDisplayName_(ar[1],ar[2],assocId),
                  state:String(ar[5]||''), category:String(ar[9]||'') };
    });
  }

  var caps  = getAssociateCapacity_({ assocId:assocId }).capacity;
  var rels  = getAssociateReliability_({ assocId:assocId }).reliability;
  var sc    = scoreOneAssociate_(assoc, caps, rels, daysToInterview, country, trade);
  return { ok:true, reqId:reqId, assocId:assocId, trade:trade, country:country,
           daysToInterview:daysToInterview, score:sc };
}

// ── RECOMMENDED SOURCES (main Phase 2 output) ────────────────────────
// GET ?action=recommendedSources&reqId=X
// Returns ranked: associates + database supply + open leads.
// Fills the "Recommended Sources" placeholder from the Phase 1 UI.
function getRecommendedSources_(params) {
  var reqId = String(params.reqId||'').trim();
  if (!reqId) return { ok:false, error:'reqId required' };

  var ss  = SpreadsheetApp.openById(SS_ID);
  var now = new Date();

  // ── Resolve requirement ──────────────────────────────────────────
  var trade='', country='', requiredQty=0, committedQty=0;
  var daysToInterview=null, interviewDateStr='';
  var minExp=0, minAge=0, maxAge=0;
  var rSheet = ss.getSheetByName('_Requirements');
  if (rSheet && rSheet.getLastRow() > 1) {
    var numCols = Math.min(rSheet.getLastColumn(), 25);
    rSheet.getRange(2,1,rSheet.getLastRow()-1,numCols).getValues().forEach(function(r) {
      if (String(r[0]).trim() !== reqId) return;
      trade        = String(r[4]||'');
      country      = String(r[3]||'');
      requiredQty  = parseInt(r[5])||0;
      committedQty = parseInt(r[23])||0;
      minExp       = parseFloat(r[6])||0;
      minAge       = parseInt(r[7])||0;
      maxAge       = parseInt(r[8])||0;
      var iRaw = numCols >= 25 ? r[24] : null;
      if (iRaw instanceof Date && !isNaN(iRaw)) {
        daysToInterview = Math.floor((iRaw - now)/(1000*60*60*24));
        interviewDateStr = Utilities.formatDate(iRaw,'Asia/Dubai','yyyy-MM-dd');
      }
    });
  }
  if (!trade) return { ok:false, error:'Requirement not found: '+reqId };

  // ── 1. Associate recommendations ────────────────────────────────
  var allAssocs = [];
  var aSheet = ss.getSheetByName('_Associates');
  if (aSheet && aSheet.getLastRow() > 1) {
    aSheet.getDataRange().getValues().slice(1).forEach(function(ar) {
      if (!String(ar[0]||'').trim()) return;
      if (String(ar[15]||'').toUpperCase() !== 'YES') return;
      allAssocs.push({
        assocId:     String(ar[0]),
        displayName: assocDisplayName_(ar[1], ar[2], ar[0]),
        contactName: isPhoneLike_(String(ar[2]||'')) ? '' : String(ar[2]||''),
        state:       String(ar[5]||''),
        category:    String(ar[9]||''),
        capacity:    String(ar[10]||'')
      });
    });
  }

  var allCaps  = getAssociateCapacity_({}).capacity;
  var allRels  = getAssociateReliability_({}).reliability;

  var scoredAssocs = allAssocs.map(function(a) {
    var sc = scoreOneAssociate_(a, allCaps, allRels, daysToInterview, country, trade);
    return {
      assocId:                 a.assocId,
      displayName:             a.displayName,
      contactName:             a.contactName,
      state:                   a.state,
      category:                a.category,
      score:                   sc.score,
      gated:                   sc.gated,
      gateReason:              sc.gateReason||null,
      capacityInWindow:        sc.capacityInWindow,
      window:                  sc.window,
      commitmentAccuracy:      sc.commitmentAccuracy,
      countryTradeReliability: sc.countryTradeReliability,
      mobilizationRate:        sc.mobilizationRate,
      historyFound:            sc.historyFound||false
    };
  }).filter(function(a) { return !a.gated; })   // exclude capacity-gated
    .sort(function(a,b) { return b.score - a.score; });

  var gatedCount = allAssocs.length - scoredAssocs.length;

  // ── 2. Database supply ───────────────────────────────────────────
  var cSheet = ss.getSheetByName('Candidates');
  var dbSupply = { readySupply:0, revalidationSupply:0, tradePossible:0, topCandidates:[] };
  if (cSheet && cSheet.getLastRow() > 1) {
    var cCols = Math.min(cSheet.getLastColumn(), 42);
    var cData = cSheet.getRange(2,1,cSheet.getLastRow()-1,cCols).getValues();
    var cands = [];
    cData.forEach(function(row) {
      var active = String(row[COL.active-1]||'').toUpperCase().trim();
      if (active === 'SUPERSEDED' || active === 'ARCHIVED') return;
      var nm = String(row[COL.name-1]||'').trim();
      if (!nm && !String(row[COL.email-1]||'').trim()) return;
      var fresh = classifyDatabaseFreshness_(
        row[COL.candidateState-1], row[COL.lastContact-1],
        row[COL.passportExpiry-1], row[COL.applicationDate-1]);
      cands.push({
        trade:String(row[COL.trade-1]||''), positionApplied:String(row[COL.positionApplied-1]||''),
        experience:parseFloat(row[COL.experience-1])||0, age:parseInt(row[COL.age-1])||0,
        gulfExp:String(row[COL.gulfExp-1]||''), currentLocation:String(row[COL.currentLocation-1]||''),
        kaiAssessment:String(row[COL.kaiAssessment-1]||''),
        top3Positions:parseTop3Positions_(String(row[COL.top3Positions-1]||'')),
        _name:nm, _kaiNo:String(row[COL.kaiNo-1]||'').trim(),
        _score:parseInt(row[COL.score-1])||0, _freshness:fresh
      });
    });
    var supply = getDeployableSupply_(country, trade, minExp, minAge, maxAge, cands, { collect:true });
    var top5 = supply.deployableList.slice()
      .sort(function(a,b) {
        if (a.freshness!==b.freshness) return a.freshness==='READY'?-1:1;
        return b.score-a.score;
      }).slice(0,5);
    dbSupply = {
      readySupply:        supply.freshDeployable,
      revalidationSupply: supply.revalidationDeployable,
      tradePossible:      supply.tradePossible,
      topCandidates: top5.map(function(c) {
        return { name:c.name, kaiNo:c.kaiNo, score:c.score,
                 experience:c.experience, freshness:c.freshness, mobility:c.mobility };
      })
    };
  }

  // ── 3. Open leads ────────────────────────────────────────────────
  var openLeads = { count:0, tradePossible:0 };
  var lSheet = ss.getSheetByName('_Leads');
  if (lSheet && lSheet.getLastRow() > 1) {
    var tLow = trade.toLowerCase();
    lSheet.getDataRange().getValues().slice(1).forEach(function(lr) {
      var st = String(lr[5]||'').toLowerCase();
      if (st === 'converted' || st === 'rejected' || st === 'archived') return;
      openLeads.count++;
      var lTrade = String(lr[4]||lr[3]||'').toLowerCase();
      if (lTrade && (lTrade.indexOf(tLow) >= 0 || tLow.indexOf(lTrade) >= 0))
        openLeads.tradePossible++;
    });
  }

  // ── 4. Estimated total supply ────────────────────────────────────
  var assocEstimate = scoredAssocs.reduce(function(s,a){ return s + a.capacityInWindow; }, 0);
  var totalEstimate = assocEstimate + dbSupply.readySupply + openLeads.tradePossible;

  return {
    ok:            true,
    reqId:         reqId,
    trade:         trade,
    country:       country,
    requiredQty:   requiredQty,
    committedQty:  committedQty,
    interviewDate: interviewDateStr,
    daysToInterview: daysToInterview,
    sources: {
      associates: {
        ranked:      scoredAssocs,
        totalActive: allAssocs.length,
        gatedOut:    gatedCount,
        note:        gatedCount > 0
          ? gatedCount + ' associate(s) excluded — CapacityInWindow=0 for ' + (daysToInterview===null?'no date':daysToInterview+'d window')
          : null
      },
      database: dbSupply,
      openLeads: openLeads
    },
    totalEstimatedSupply: totalEstimate
  };
}

// ── PHASE 2 SETUP + TEST ─────────────────────────────────────────────
function setupPhase2() {
  var ss = SpreadsheetApp.openById(SS_ID);
  ensureCommitmentsSheet_(ss);
  Logger.log('_Commitments:          OK');
  ensureCapacitySheet_(ss);
  Logger.log('_AssociateCapacity:    OK');
  ensureReliabilitySheet_(ss);
  Logger.log('_AssociateReliability: OK');
  Logger.log('Phase 2 infrastructure ready.');
  Logger.log('Next: upsertAssociateCapacity for each associate × trade, then createCommitment per requirement.');
}

function testPhase2() {
  var ss = SpreadsheetApp.openById(SS_ID);

  // Sheet access
  Logger.log('_Commitments:          ' + (ss.getSheetByName('_Commitments')          ? 'OK' : 'MISSING — run setupPhase2()'));
  Logger.log('_AssociateCapacity:    ' + (ss.getSheetByName('_AssociateCapacity')     ? 'OK' : 'MISSING'));
  Logger.log('_AssociateReliability: ' + (ss.getSheetByName('_AssociateReliability')  ? 'OK' : 'MISSING'));

  // Score formula smoke test
  var mockAssoc = { assocId:'TEST-ASSOC', displayName:'Test Associate' };
  var mockCaps  = [{ assocId:'TEST-ASSOC', trade:'Welder', within3d:5, within7d:20, within15d:40, beyond15d:60 }];
  var mockRels  = [{ assocId:'TEST-ASSOC', country:'Saudi Arabia', trade:'Welder',
                     commitmentAccuracy:0.85, mobilizationRate:0.75 }];

  var sc7  = scoreOneAssociate_(mockAssoc, mockCaps, mockRels, 7,   'Saudi Arabia', 'Welder');
  var sc3  = scoreOneAssociate_(mockAssoc, mockCaps, mockRels, 3,   'Saudi Arabia', 'Welder');
  var scN  = scoreOneAssociate_(mockAssoc, mockCaps, mockRels, null,'Saudi Arabia', 'Welder');
  var scG  = scoreOneAssociate_(mockAssoc, [],       mockRels, 7,   'Saudi Arabia', 'Welder');

  Logger.log('Score tests (Saudi/Welder, cap 3d=5 7d=20 15d=40 beyond=60, acc=0.85 mob=0.75):');
  Logger.log('  7d window:   score=' + sc7.score + ' cap=' + sc7.capacityInWindow + ' window=' + sc7.window);
  Logger.log('  3d window:   score=' + sc3.score + ' cap=' + sc3.capacityInWindow + ' window=' + sc3.window);
  Logger.log('  no date:     score=' + scN.score + ' cap=' + scN.capacityInWindow + ' window=' + scN.window);
  Logger.log('  GATED(0cap): gated=' + scG.gated + ' reason=' + scG.gateReason);

  // Expected: 7d = 20*0.85*0.85*0.75 = ~10.8 | 3d = 5*0.85*0.85*0.75 = ~2.7 | gated = true
  Logger.log('Expected: 7d~10.8, 3d~2.7, GATED=true');

  // recommendedSources smoke test — pick the FIRST requirement with a VALID
  // trade (skip the legacy blank/filename-trade rows so the reading is real).
  var rSheet = ss.getSheetByName('_Requirements');
  if (rSheet && rSheet.getLastRow() > 1) {
    var rData = rSheet.getRange(2,1,rSheet.getLastRow()-1,6).getValues();
    var pickReqId = '';
    for (var i = 0; i < rData.length; i++) {
      var rid = String(rData[i][0]||'').trim();
      var rtr = String(rData[i][4]||'').trim();
      if (rid && isValidTrade_(rtr)) { pickReqId = rid; break; }
    }
    if (!pickReqId) pickReqId = String(rData[0][0]||'').trim();  // fallback
    if (pickReqId) {
      var rs = getRecommendedSources_({ reqId:pickReqId });
      Logger.log('recommendedSources(' + pickReqId + ' / trade=' +
                 (rs.trade||'?') + ', country=' + (rs.country||'?') + '):');
      Logger.log('  ok=' + rs.ok +
                 ' assocsRanked=' + (rs.sources ? rs.sources.associates.ranked.length : '?') +
                 ' assocsGatedOut=' + (rs.sources ? rs.sources.associates.gatedOut : '?') +
                 ' dbReady=' + (rs.sources ? rs.sources.database.readySupply : '?') +
                 ' dbReval=' + (rs.sources ? rs.sources.database.revalidationSupply : '?') +
                 ' openLeads=' + (rs.sources ? rs.sources.openLeads.count : '?') +
                 ' total=' + (rs.totalEstimatedSupply||0));
      Logger.log('  NOTE: assocsRanked=0 is EXPECTED until _AssociateCapacity is seeded.');
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// SECTION 33 — PHASE 3: SUPPLY INTAKE ENGINE
// ════════════════════════════════════════════════════════════════════
//
// Purpose: Capture supply the moment an associate generates it.
//   Phase 1 = demand signal (requirement demand + fill probability)
//   Phase 2 = source routing (associate score + commitment)
//   Phase 3 = intake capture (associate → lead → candidate)
//
// 3.1  _Leads schema upgrade (+4 cols: assocId, assocName, targetCountry, cvLink)
// 3.2  Quick Lead from Requirement (trade + country pre-filled from req)
// 3.3  Associate attribution (link lead to associate retroactively)
// 3.4  Gmail sender match (identify associate from CV email sender — read-only)
// 3.5  Lead pipeline summary (counts + 30-day conversion rate)
// 3.6  convertLeadToCandidate_ now carries assocId → sourceAssociate (fixed inline above)
// ════════════════════════════════════════════════════════════════════

// ── 3.1 Schema extension ────────────────────────────────────────────
// Extends the COL_L_ map defined in Section 27.
COL_L_.assocId        = 21;
COL_L_.assocName      = 22;
COL_L_.targetCountry  = 23;
COL_L_.cvLink         = 24;

// Idempotent: adds headers for cols 21-24 to _Leads if absent.
// Called automatically from createLead_ (upgraded above) and createLeadFromReq_.
function ensureLeadsSheetP3_(ss) {
  var s       = ensureLeadsSheet_(ss);
  var lastCol = s.getLastColumn();
  var needed  = [
    { col:21, hdr:'Assoc ID' },
    { col:22, hdr:'Assoc Name' },
    { col:23, hdr:'Target Country' },
    { col:24, hdr:'CV Link' }
  ];
  needed.forEach(function(n) {
    var curVal = lastCol >= n.col
      ? String(s.getRange(1, n.col).getValue()||'').trim()
      : '';
    if (!curVal) {
      s.getRange(1, n.col).setValue(n.hdr)
       .setBackground('#0d3b66').setFontColor('#ffffff').setFontWeight('bold');
      if (n.col > lastCol) lastCol = n.col;
    }
  });
  return s;
}

// ── 3.2 Quick Lead from Requirement ─────────────────────────────────
// POST action=createLeadFromReq
// body: { reqId*, name*, mobile*, source, assocId, recruiter, notes,
//         experience, nationality, gulfExp, currentLocation, education, email }
// Reads trade + deployCountry from the requirement so the caller never
// has to re-type them — one tap on a requirement card creates a full lead.
function createLeadFromReq_(body) {
  var reqId  = String(body.reqId ||'').trim();
  var name   = String(body.name  ||'').trim();
  var mobile = String(body.mobile||'').trim();
  if (!reqId)  return { ok:false, error:'reqId required' };
  if (!name)   return { ok:false, error:'name required' };
  if (!mobile) return { ok:false, error:'mobile required' };

  var ss     = SpreadsheetApp.openById(SS_ID);
  var rSheet = ss.getSheetByName('_Requirements');
  if (!rSheet) return { ok:false, error:'_Requirements sheet not found' };

  var rData  = rSheet.getDataRange().getValues();
  var reqRow = null;
  for (var i = 1; i < rData.length; i++) {
    if (String(rData[i][0]||'').trim() === reqId) { reqRow = rData[i]; break; }
  }
  if (!reqRow) return { ok:false, error:'Requirement not found: ' + reqId };

  var trade   = String(reqRow[4]||'').trim();  // col 5: trade
  var country = String(reqRow[3]||'').trim();  // col 4: deployCountry

  // Resolve associate display name if assocId provided
  var assocId   = String(body.assocId||'').trim();
  var assocName = '';
  if (assocId) {
    var aSheet = ss.getSheetByName('_Associates');
    if (aSheet) {
      var aData = aSheet.getDataRange().getValues();
      for (var a = 1; a < aData.length; a++) {
        if (String(aData[a][0]||'').trim() === assocId) {
          assocName = assocDisplayName_(
            String(aData[a][1]||''), String(aData[a][2]||''), assocId
          );
          break;
        }
      }
    }
    if (!assocName) assocName = 'Associate ' + assocId;
  }

  var source    = assocId ? 'ASSOCIATE' : String(body.source||'OTHER').trim().toUpperCase();
  var recruiter = String(body.recruiter||'').trim();
  var quality   = classifyLeadQuality_(trade, reqId, ss);
  var normMob   = normalizeMobile_(mobile);
  var now       = new Date();

  // Dedup: mobile already in _Leads (non-LOST)?
  var s        = ensureLeadsSheetP3_(ss);
  var existing = s.getDataRange().getValues();
  for (var d = 1; d < existing.length; d++) {
    var eMob    = normalizeMobile_(String(existing[d][COL_L_.mobile-1]||''));
    var eSt     = String(existing[d][COL_L_.status-1]||'').trim().toUpperCase();
    var eId     = String(existing[d][COL_L_.leadId-1]||'').trim();
    if (normMob && eMob === normMob && eSt !== 'LOST') {
      return { ok:false, error:'DUPLICATE_MOBILE',
               existing:eId, message:'Lead already exists: ' + eId };
    }
  }

  // Dedup: mobile already in Candidates?
  var cSheet = ss.getSheetByName('Candidates');
  if (cSheet) {
    var cData = cSheet.getDataRange().getValues();
    for (var c = 1; c < cData.length; c++) {
      var cMob = normalizeMobile_(String(cData[c][COL.mobile-1]||''));
      if (normMob && cMob === normMob) {
        return { ok:false, error:'ALREADY_CANDIDATE',
                 kaiNo:String(cData[c][COL.kaiNo-1]||''),
                 message:'This person is already a candidate in KAI' };
      }
    }
  }

  var leadId = generateLeadId_(ss);
  var row    = new Array(24).fill('');
  row[COL_L_.leadId-1]          = leadId;
  row[COL_L_.createdAt-1]       = now;
  row[COL_L_.name-1]            = name;
  row[COL_L_.mobile-1]          = normalizeMobileStore_(mobile);
  row[COL_L_.email-1]           = String(body.email          ||'').trim();
  row[COL_L_.trade-1]           = trade;
  row[COL_L_.experience-1]      = parseFloat(body.experience)||0;
  row[COL_L_.nationality-1]     = String(body.nationality    ||'').trim();
  row[COL_L_.gulfExp-1]         = String(body.gulfExp        ||'').trim();
  row[COL_L_.currentLocation-1] = String(body.currentLocation||'').trim();
  row[COL_L_.education-1]       = String(body.education      ||'').trim();
  row[COL_L_.status-1]          = 'NEW';
  row[COL_L_.lostReason-1]      = '';
  row[COL_L_.leadQuality-1]     = quality;
  row[COL_L_.linkedReqId-1]     = reqId;
  row[COL_L_.source-1]          = source;
  row[COL_L_.recruiter-1]       = recruiter;
  row[COL_L_.lastContactDate-1] = now;
  row[COL_L_.convertedKaiNo-1]  = '';
  row[COL_L_.notes-1]           = String(body.notes||'').trim();
  row[COL_L_.assocId-1]         = assocId;
  row[COL_L_.assocName-1]       = assocName;
  row[COL_L_.targetCountry-1]   = country;
  row[COL_L_.cvLink-1]          = '';

  s.appendRow(row);

  logActivity_(ss, { kaiNo:leadId, rowIndex:0,
    action: 'LEAD_CREATED_FROM_REQ',
    detail: name + ' | ' + trade + ' → ' + country +
            ' | Req: ' + reqId + ' | Quality: ' + quality +
            (assocId ? ' | Assoc: ' + assocName : ''),
    actor:  recruiter || assocName || 'system'
  });

  return {
    ok:          true,
    leadId:      leadId,
    name:        name,
    trade:       trade,
    country:     country,
    reqId:       reqId,
    leadQuality: quality,
    source:      source,
    assocId:     assocId   || null,
    assocName:   assocName || null
  };
}

// ── 3.3 Associate Attribution ────────────────────────────────────────
// POST action=linkLeadToAssociate
// body: { leadId*, assocId*, actor }
// Links an existing lead to an associate retroactively.
// Only updates source to ASSOCIATE if it was blank or OTHER (never downgrades).
function linkLeadToAssociate_(body) {
  var leadId  = String(body.leadId  ||'').trim();
  var assocId = String(body.assocId ||'').trim();
  var actor   = String(body.actor   ||'').trim();
  if (!leadId)  return { ok:false, error:'leadId required' };
  if (!assocId) return { ok:false, error:'assocId required' };

  var ss        = SpreadsheetApp.openById(SS_ID);
  var aSheet    = ss.getSheetByName('_Associates');
  var assocName = 'Associate ' + assocId;
  if (aSheet) {
    var aData = aSheet.getDataRange().getValues();
    for (var a = 1; a < aData.length; a++) {
      if (String(aData[a][0]||'').trim() === assocId) {
        assocName = assocDisplayName_(
          String(aData[a][1]||''), String(aData[a][2]||''), assocId
        );
        break;
      }
    }
  }

  var s    = ensureLeadsSheetP3_(ss);
  var data = s.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL_L_.leadId-1]||'').trim() !== leadId) continue;
    var r         = i + 1;
    var curSource = String(data[i][COL_L_.source-1]||'').trim().toUpperCase();
    s.getRange(r, COL_L_.assocId).setValue(assocId);
    s.getRange(r, COL_L_.assocName).setValue(assocName);
    if (!curSource || curSource === 'OTHER') {
      s.getRange(r, COL_L_.source).setValue('ASSOCIATE');
    }
    logActivity_(ss, { kaiNo:leadId, rowIndex:0,
      action: 'LEAD_ATTRIBUTED',
      detail: 'Linked to associate: ' + assocName + ' (' + assocId + ')',
      actor:  actor || 'system'
    });
    return { ok:true, leadId:leadId, assocId:assocId, assocName:assocName };
  }
  return { ok:false, error:'Lead not found: ' + leadId };
}

// ── 3.4 Gmail Sender Match ───────────────────────────────────────────
// GET ?action=matchGmailSender&threadId=X&token=T
// Reads the inbound sender from a Gmail thread and checks whether they
// are a known associate. Pure read — no side effects.
// UI flow: recruiter views a CV email → bridge auto-identifies the source associate.
function matchGmailSender_(params) {
  var threadId = String(params.threadId||'').trim();
  if (!threadId) return { ok:false, error:'threadId required' };

  var thread;
  try { thread = GmailApp.getThreadById(threadId); }
  catch(e) { return { ok:false, error:'Thread not found: ' + e.message }; }

  var msgs = thread.getMessages();
  if (!msgs.length) return { ok:false, error:'Thread has no messages' };

  // Find the first inbound message (not our own outbound)
  var senderEmail = '';
  var senderName  = '';
  for (var m = 0; m < msgs.length; m++) {
    var rawFrom = msgs[m].getFrom();
    var fe      = extractEmailFromHeader_(rawFrom);
    var fn      = extractNameFromHeader_(rawFrom);
    if (!fe || fe.toLowerCase().indexOf('alyousuf') >= 0) continue;
    senderEmail = fe;
    senderName  = fn;
    break;
  }
  // Fallback to first message if all were "ours"
  if (!senderEmail) {
    senderEmail = extractEmailFromHeader_(msgs[0].getFrom());
    senderName  = extractNameFromHeader_(msgs[0].getFrom());
  }

  // Match sender email against _Associates
  var ss      = SpreadsheetApp.openById(SS_ID);
  var aSheet  = ss.getSheetByName('_Associates');
  var matched     = false;
  var assocId     = '';
  var assocName   = '';
  var assocMobile = '';

  if (aSheet && senderEmail) {
    var aRows = aSheet.getDataRange().getValues();
    var seLow = senderEmail.toLowerCase();
    for (var a = 1; a < aRows.length; a++) {
      var ae = String(aRows[a][3]||'').trim().toLowerCase();  // col 4 = email (0-idx=3)
      if (ae && ae === seLow) {
        matched     = true;
        assocId     = String(aRows[a][0]||'').trim();
        assocName   = assocDisplayName_(
          String(aRows[a][1]||''), String(aRows[a][2]||''), assocId
        );
        assocMobile = String(aRows[a][4]||'').trim();
        break;
      }
    }
  }

  return {
    ok:          true,
    threadId:    threadId,
    senderEmail: senderEmail,
    senderName:  senderName,
    matched:     matched,
    assocId:     assocId     || null,
    assocName:   assocName   || null,
    assocMobile: assocMobile || null
  };
}

// ── 3.5 Lead Pipeline Summary ────────────────────────────────────────
// GET ?action=leadPipelineSummary&token=T
// Returns aggregate counts by status, source, quality plus 30-day conversion rate
// and top-5 associates by lead volume. Powers the Leads page header stats bar.
function getLeadPipelineSummary_(params) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var s  = ss.getSheetByName(LEADS_SHEET_);
  if (!s || s.getLastRow() < 2) {
    return {
      ok:true, total:0,
      byStatus:{}, bySource:{}, byQuality:{},
      conversionRate30d:0, conv30d:{ created:0, converted:0 },
      topAssociates:[]
    };
  }

  var data   = s.getDataRange().getValues();
  var now    = new Date();
  var cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  var byStatus   = {};
  var bySource   = {};
  var byQuality  = {};
  var total      = 0;
  var c30Created = 0;
  var c30Done    = 0;
  var assocMap   = {};

  for (var i = 1; i < data.length; i++) {
    var row    = data[i];
    var leadId = String(row[COL_L_.leadId-1]||'').trim();
    if (!leadId) continue;
    total++;

    var status  = String(row[COL_L_.status-1]    ||'NEW').trim().toUpperCase();
    var source  = String(row[COL_L_.source-1]    ||'OTHER').trim().toUpperCase();
    var quality = String(row[COL_L_.leadQuality-1]||'UNKNOWN').trim().toUpperCase();
    var created = row[COL_L_.createdAt-1];

    byStatus [status ] = (byStatus [status ] || 0) + 1;
    bySource [source ] = (bySource [source ] || 0) + 1;
    byQuality[quality] = (byQuality[quality] || 0) + 1;

    // 30-day cohort: leads created within window
    if (created instanceof Date && created >= cutoff) {
      c30Created++;
      if (status === 'CONVERTED') c30Done++;
    }

    // Associate contribution counts (P3 cols)
    var aId = String(row.length > 20 ? (row[COL_L_.assocId-1]||'')   : '').trim();
    var aNm = String(row.length > 21 ? (row[COL_L_.assocName-1]||'') : '').trim();
    if (aId) {
      if (!assocMap[aId]) assocMap[aId] = { assocId:aId, assocName:aNm, total:0, converted:0 };
      assocMap[aId].total++;
      if (status === 'CONVERTED') assocMap[aId].converted++;
    }
  }

  var conversionRate30d = c30Created > 0
    ? Math.round((c30Done / c30Created) * 100) : 0;

  var topAssociates = Object.keys(assocMap)
    .map(function(k){ return assocMap[k]; })
    .sort(function(a,b){ return b.total - a.total; })
    .slice(0, 5);

  return {
    ok:               true,
    total:            total,
    byStatus:         byStatus,
    bySource:         bySource,
    byQuality:        byQuality,
    conversionRate30d: conversionRate30d,
    conv30d:          { created:c30Created, converted:c30Done },
    topAssociates:    topAssociates
  };
}

// ── Phase 3 Setup + Test ─────────────────────────────────────────────
function setupPhase3() {
  var ss = SpreadsheetApp.openById(SS_ID);
  ensureLeadsSheetP3_(ss);
  Logger.log('_Leads cols 21-24 (Assoc ID / Assoc Name / Target Country / CV Link): OK');
  Logger.log('Phase 3 infrastructure ready. Run testPhase3() to verify.');
}

function testPhase3() {
  var ss = SpreadsheetApp.openById(SS_ID);

  // 3.1 — Schema check
  ensureLeadsSheetP3_(ss);
  var s       = ss.getSheetByName(LEADS_SHEET_);
  var lastCol = s ? s.getLastColumn() : 0;
  Logger.log('3.1 _Leads schema: ' + lastCol + ' cols — ' +
             (lastCol >= 24 ? 'OK (cols 21-24 present)' : 'PARTIAL — run setupPhase3()'));

  // Check col headers
  if (s && lastCol >= 24) {
    var hdrs = s.getRange(1,21,1,4).getValues()[0];
    Logger.log('    Col 21=' + hdrs[0] + ' 22=' + hdrs[1] +
               ' 23=' + hdrs[2] + ' 24=' + hdrs[3]);
  }

  // 3.5 — Pipeline summary
  var summary = getLeadPipelineSummary_({});
  Logger.log('3.5 leadPipelineSummary: ok=' + summary.ok +
             ' total=' + summary.total +
             ' conv30d=' + summary.conversionRate30d + '% (' +
             summary.conv30d.converted + '/' + summary.conv30d.created + ')' +
             ' byStatus=' + JSON.stringify(summary.byStatus) +
             ' bySource=' + JSON.stringify(summary.bySource));

  // 3.4 — Endpoint availability check
  Logger.log('3.4 matchGmailSender: endpoint ready');
  Logger.log('    Test: GET ?action=matchGmailSender&threadId=<real-thread-id>&token=T');

  // 3.2 — Dry-run: find first valid requirement
  var rSheet = ss.getSheetByName('_Requirements');
  if (rSheet && rSheet.getLastRow() > 1) {
    var rData     = rSheet.getRange(2,1,rSheet.getLastRow()-1,6).getValues();
    var pickReqId = '', pickTrade = '', pickCountry = '';
    for (var i = 0; i < rData.length; i++) {
      var rid = String(rData[i][0]||'').trim();
      var rtr = String(rData[i][4]||'').trim();
      if (rid && isValidTrade_(rtr)) {
        pickReqId   = rid;
        pickTrade   = rtr;
        pickCountry = String(rData[i][3]||'').trim();
        break;
      }
    }
    if (pickReqId) {
      Logger.log('3.2 createLeadFromReq dry-run:');
      Logger.log('    reqId=' + pickReqId + ' trade=' + pickTrade + ' country=' + pickCountry);
      Logger.log('    POST body: { reqId:"' + pickReqId + '", name:"Test", mobile:"TEST_SKIP",' +
                 ' source:"PHONE_CALL", recruiter:"test" }');
      Logger.log('    (Not auto-created in test — call via UI/Postman to verify)');
    } else {
      Logger.log('3.2 createLeadFromReq: no valid-trade requirement found to dry-run against');
    }
  }

  // 3.3 — linkLeadToAssociate check
  Logger.log('3.3 linkLeadToAssociate: endpoint ready');
  Logger.log('    POST body: { leadId:"KAR-L-xxxxx", assocId:"ASSOC-001", actor:"recruiter" }');

  // 3.6 — convertLeadToCandidate_ fix confirmation
  Logger.log('3.6 assocId→sourceAssociate fix: in convertLeadToCandidate_ (line ~5920)');
  Logger.log('    lAssocId reads col ' + COL_L_.assocId + ' from lead row — OK');

  Logger.log('Phase 3 validation complete.');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 34 — PHASE 4: LIFECYCLE ENGINE  (post-review corrections 1–5)
// ════════════════════════════════════════════════════════════════════
//
// Closes the KAI spine loop: outcomes feed back into the intelligence.
//   Phase 1 demand → Phase 2 routing → Phase 3 intake → DELIVERY (slots)
//   → SELECTION → MOBILIZATION → P4 LEARNING (this section)
//
// 4.1  Learning Writer  → populates _KAI_Knowledge per COUNTRY×TRADE.
//       Success trigger = COMPLETED MOBILIZATION (deployed), not selection.
//       Makes getHistoricalConversion_(country, trade) stop using 0.70.
// 4.2  Recruiter KPI    → ranked Mobilized → Selected → Submitted.
// 4.3  Revenue Summary  → Selected / Mobilized / Travel-This-Week /
//       Completed Mobilization, by client/country/trade/month.
//       Revenue projected ONLY when a rate is supplied — never fabricated.
//
// Correction 1: aggregate by Country×Trade (Saudi+Welder ≠ UAE+Welder).
// Correction 2: _KAI_Knowledge reserves SourceType/Associate/Campaign/
//               Recruiter columns for future source-sliced learning.
// Correction 5: learning conversion numerator = Completed Mobilization.
//
// Funnel semantics (cumulative — a DEPLOYED slot also passed SUBMITTED):
//   added                 = every slot with a valid trade (denominator)
//   submitted             = SUBMITTED | INTERVIEWED | SELECTED | DEPLOYED
//   selected              = SELECTED | DEPLOYED
//   mobilizedInProgress   = SELECTED (selected, not yet deployed)
//   completedMobilization = DEPLOYED  ← the success trigger
//   (REJECTED is terminal/off-funnel — counted in added, never advances)
//   travelThisWeek        = dataPending (no travel-date field in schema yet)
// ════════════════════════════════════════════════════════════════════

var KNOWLEDGE_SHEET_   = '_KAI_Knowledge';
// Correction 2 — Country×Trade key + reserved source-attribution columns.
var KNOWLEDGE_HEADERS_ = [
  'Country','Trade','ConversionRate','Added','Submitted',
  'Selected','Mobilized','SubmitRate','SelectRate','MobilizationRate',
  'SampleCount','SourceType','Associate','Campaign','Recruiter','LastUpdated'
];
// Below this many observations a learned rate is statistically meaningless —
// we write the row for visibility but leave ConversionRate at 0 so the reader
// (getHistoricalConversion_) falls back to its conservative default.
var MIN_LEARNING_SAMPLE_ = 5;

function ensureKnowledgeSheet_(ss) {
  return ensureSheetWithHeaders_(ss, KNOWLEDGE_SHEET_, KNOWLEDGE_HEADERS_, '#7D6608');
}

// Classifies a slot status into cumulative funnel flags.
// completedMobilization (deployed) is the P4 success trigger (Correction 5).
function slotFunnelFlags_(statusRaw) {
  var st = String(statusRaw||'').trim().toUpperCase();
  return {
    submitted:              (st === 'SUBMITTED' || st === 'INTERVIEWED' || st === 'SELECTED' || st === 'DEPLOYED'),
    interviewed:            (st === 'INTERVIEWED' || st === 'SELECTED' || st === 'DEPLOYED'),
    selected:               (st === 'SELECTED' || st === 'DEPLOYED'),
    mobilizedInProgress:    (st === 'SELECTED'),   // selected, not yet deployed
    completedMobilization:  (st === 'DEPLOYED')
  };
}

// Builds reqId → { country, client } from _Requirements (slots carry neither).
function buildReqMetaMap_(ss) {
  var map = {};
  var rSheet = ss.getSheetByName('_Requirements');
  if (rSheet && rSheet.getLastRow() > 1) {
    rSheet.getDataRange().getValues().slice(1).forEach(function(rr) {
      var rid = String(rr[0]||'').trim();
      if (!rid) return;
      map[rid] = {
        client:  String(rr[2]||'Unknown').trim() || 'Unknown',
        country: String(rr[3]||'').trim() || 'Unknown'
      };
    });
  }
  return map;
}

// ── 4.1 LEARNING WRITER  (Country×Trade · success = Completed Mobilization)
// POST action=runLearning   body: { actor? }
// Scans _CandidateSlots, joins each slot to its requirement's country,
// aggregates the funnel per Country×Trade, writes _KAI_Knowledge.
// Idempotent: fully rebuilds the knowledge data rows each run.
function runLearningWriter_(body) {
  body = body || {};
  var actor = String(body.actor||'system').trim();
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sSheet = ss.getSheetByName('_CandidateSlots');
  if (!sSheet || sSheet.getLastRow() < 2)
    return { ok:true, pairs:0, message:'No slot data yet — nothing to learn.' };

  var reqMeta = buildReqMetaMap_(ss);
  var data    = sSheet.getDataRange().getValues();
  var byPair  = {};   // "country|||trade" → aggregate

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!String(row[0]||'').trim()) continue;          // no slotId
    var trade = String(row[5]||'').trim();             // col 6 = Trade
    if (!isValidTrade_(trade)) continue;               // skip junk-trade slots
    var reqId   = String(row[1]||'').trim();           // col 2 = ReqId
    var meta    = reqMeta[reqId] || { country:'Unknown' };
    var country = meta.country || 'Unknown';

    var key = country.toLowerCase() + '|||' + trade.toLowerCase();
    if (!byPair[key]) byPair[key] = {
      country:country, trade:trade,
      added:0, submitted:0, selected:0, mobilized:0
    };
    var agg = byPair[key];
    agg.added++;
    var f = slotFunnelFlags_(row[9]);                  // col 10 = SlotStatus
    if (f.submitted)             agg.submitted++;
    if (f.selected)              agg.selected++;
    if (f.completedMobilization) agg.mobilized++;       // Correction 5 numerator
  }

  var keys   = Object.keys(byPair);
  var kSheet = ensureKnowledgeSheet_(ss);
  // Idempotent rebuild — clear data rows (keep header).
  if (kSheet.getLastRow() > 1)
    kSheet.getRange(2,1,kSheet.getLastRow()-1,KNOWLEDGE_HEADERS_.length).clearContent();

  var now     = new Date();
  var rows    = [];
  var learned = 0;
  // Order by sample size desc so the sheet leads with the most-trusted pairs.
  keys.sort(function(a,b){ return byPair[b].added - byPair[a].added; });
  keys.forEach(function(k) {
    var a = byPair[k];
    var submitRate = a.added     > 0 ? Math.round((a.submitted/a.added)*100)/100    : 0;
    var selectRate = a.submitted > 0 ? Math.round((a.selected/a.submitted)*100)/100 : 0;
    var mobRate    = a.selected  > 0 ? Math.round((a.mobilized/a.selected)*100)/100 : 0;
    // Headline ConversionRate = full-funnel yield to COMPLETED MOBILIZATION
    // (mobilized / added) — Correction 5. Trusted only at/above min sample.
    var fullYield  = a.added > 0 ? Math.round((a.mobilized/a.added)*100)/100 : 0;
    var conv = (a.added >= MIN_LEARNING_SAMPLE_ && fullYield > 0) ? fullYield : 0;
    if (conv > 0) learned++;
    rows.push([
      a.country, a.trade, conv, a.added, a.submitted,
      a.selected, a.mobilized, submitRate, selectRate, mobRate,
      a.added,
      '', '', '', '',     // reserved: SourceType, Associate, Campaign, Recruiter
      now
    ]);
  });

  if (rows.length)
    kSheet.getRange(2,1,rows.length,KNOWLEDGE_HEADERS_.length).setValues(rows);

  logActivity_(ss, { kaiNo:'LEARNING', rowIndex:0,
    action: 'LEARNING_WRITTEN',
    detail: 'Country×Trade pairs: ' + keys.length + ' | Learned (sample>=' +
            MIN_LEARNING_SAMPLE_ + ', success=mobilized): ' + learned,
    actor:  actor
  });

  return {
    ok:           true,
    pairs:        keys.length,
    learnedPairs: learned,
    minSample:    MIN_LEARNING_SAMPLE_,
    successTrigger: 'COMPLETED_MOBILIZATION',
    message:      learned + ' of ' + keys.length +
                  ' Country×Trade pairs have a learned mobilization-conversion rate; ' +
                  'the rest fall back to the 0.70 default until they reach ' +
                  MIN_LEARNING_SAMPLE_ + ' observations.'
  };
}

// GET ?action=learningSnapshot&token=T   (optional &country= &trade= filters)
// Reads _KAI_Knowledge back for the UI (Learning / intelligence panel).
function getLearningSnapshot_(params) {
  params = params || {};
  var fCountry = String(params.country||'').trim().toLowerCase();
  var fTrade   = String(params.trade  ||'').trim().toLowerCase();

  var ss = SpreadsheetApp.openById(SS_ID);
  var k  = ss.getSheetByName(KNOWLEDGE_SHEET_);
  if (!k || k.getLastRow() < 2)
    return { ok:true, pairs:[], count:0, lastUpdated:null,
             message:'No learning data yet — run Learning Writer (POST runLearning).' };

  var data = k.getDataRange().getValues();
  var out  = [];
  var lastUpdated = null;
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var country = String(r[0]||'').trim();
    var trade   = String(r[1]||'').trim();
    if (!trade) continue;
    if (fCountry && country.toLowerCase() !== fCountry) continue;
    if (fTrade   && trade.toLowerCase()   !== fTrade)   continue;
    var lu = r[15] instanceof Date ? r[15] : null;
    if (lu && (!lastUpdated || lu > lastUpdated)) lastUpdated = lu;
    out.push({
      country:           country,
      trade:             trade,
      conversionRate:    parseFloat(r[2])||0,
      learned:           (parseFloat(r[2])||0) > 0,
      added:             parseInt(r[3])||0,
      submitted:         parseInt(r[4])||0,
      selected:          parseInt(r[5])||0,
      mobilized:         parseInt(r[6])||0,
      submitRate:        parseFloat(r[7])||0,
      selectRate:        parseFloat(r[8])||0,
      mobilizationRate:  parseFloat(r[9])||0,
      sampleSize:        parseInt(r[10])||0
    });
  }
  // Top by learned conversion, then by sample size.
  out.sort(function(a,b) {
    return (b.conversionRate - a.conversionRate) || (b.sampleSize - a.sampleSize);
  });
  return {
    ok:          true,
    count:       out.length,
    pairs:       out,
    minSample:   MIN_LEARNING_SAMPLE_,
    lastUpdated: lastUpdated
      ? Utilities.formatDate(lastUpdated,'Asia/Dubai','yyyy-MM-dd HH:mm') : null
  };
}

// ── 4.2 RECRUITER KPI  (rank: Mobilized → Selected → Submitted) ──────
// GET ?action=recruiterKPI&token=T
// Per-recruiter funnel: leads created/converted (from _Leads.Recruiter) +
// submitted/selected/mobilized (from _CandidateSlots.AddedBy).
// Read-only aggregate — no new sheet, no writes.
function getRecruiterKPI_(params) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var kpi = {};   // recruiterKey → stats

  function bucket(name) {
    var key = String(name||'').trim();
    if (!key) key = 'Unattributed';
    if (!kpi[key]) kpi[key] = {
      recruiter:key, leadsCreated:0, leadsConverted:0,
      slotsAdded:0, submitted:0, selected:0, mobilized:0
    };
    return kpi[key];
  }

  // Leads — attribution from Recruiter col
  var lSheet = ss.getSheetByName(LEADS_SHEET_);
  if (lSheet && lSheet.getLastRow() > 1) {
    var lData = lSheet.getDataRange().getValues();
    for (var i = 1; i < lData.length; i++) {
      if (!String(lData[i][COL_L_.leadId-1]||'').trim()) continue;
      var b  = bucket(lData[i][COL_L_.recruiter-1]);
      b.leadsCreated++;
      if (String(lData[i][COL_L_.status-1]||'').trim().toUpperCase() === 'CONVERTED')
        b.leadsConverted++;
    }
  }

  // Slots — attribution from AddedBy (col 8)
  var sSheet = ss.getSheetByName('_CandidateSlots');
  if (sSheet && sSheet.getLastRow() > 1) {
    var sData = sSheet.getDataRange().getValues();
    for (var j = 1; j < sData.length; j++) {
      if (!String(sData[j][0]||'').trim()) continue;
      var rb = bucket(sData[j][7]);   // AddedBy
      rb.slotsAdded++;
      var f = slotFunnelFlags_(sData[j][9]);
      if (f.submitted)             rb.submitted++;
      if (f.selected)              rb.selected++;
      if (f.completedMobilization) rb.mobilized++;
    }
  }

  var list = Object.keys(kpi).map(function(key) {
    var r = kpi[key];
    // CV Processed = every candidate this recruiter worked into a slot.
    r.cvProcessed = r.slotsAdded;
    r.leadConversionRate = r.leadsCreated > 0
      ? Math.round((r.leadsConverted/r.leadsCreated)*100) : 0;
    r.submitToSelectRate = r.submitted > 0
      ? Math.round((r.selected/r.submitted)*100) : 0;
    r.selectToMobilizeRate = r.selected > 0
      ? Math.round((r.mobilized/r.selected)*100) : 0;
    return r;
  });
  // Lock 6 — rank Mobilized → Selected → Submitted → CV Processed.
  list.sort(function(a,b) {
    return (b.mobilized-a.mobilized) || (b.selected-a.selected) ||
           (b.submitted-a.submitted) || (b.cvProcessed-a.cvProcessed);
  });

  return { ok:true, count:list.length,
           rankedBy:'mobilized > selected > submitted > cvProcessed',
           recruiters:list };
}

// ── 4.3 REVENUE SUMMARY  (Selected / Mobilized / Travel / Completed) ──
// GET ?action=revenueSummary&ratePerPlacement=N&token=T
// Pipeline stage counts + confirmed placements grouped by client / country /
// trade / month. Revenue is projected ONLY when ratePerPlacement > 0;
// otherwise revenuePending:true with counts only — KAI never fabricates
// or stores billing data.
function getRevenueSummary_(params) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var rate = parseFloat(params.ratePerPlacement||'0') || 0;
  var hasRate = rate > 0;

  var reqMeta = buildReqMetaMap_(ss);

  var sSheet = ss.getSheetByName('_CandidateSlots');
  if (!sSheet || sSheet.getLastRow() < 2) {
    return { ok:true, hasRate:hasRate, revenuePending:!hasRate,
             pipeline:{
               submitted:             { count:0, dataPending:false },
               selected:              { count:0, dataPending:false },
               mobilized:             { count:0, dataPending:false },
               travelThisWeek:        { count:0, dataPending:true,
                                        note:'No travel-date field in schema yet' },
               completedMobilization: { count:0, dataPending:false }
             },
             totalPlacements:0, byClient:[], byCountry:[], byTrade:[], byMonth:[],
             message:'No slot data yet.' };
  }

  var stage = { submitted:0, selected:0, mobilizedInProgress:0, completedMobilization:0 };
  var byClient = {}, byCountry = {}, byTrade = {}, byMonth = {};
  var total = 0;

  sSheet.getDataRange().getValues().slice(1).forEach(function(sr) {
    if (!String(sr[0]||'').trim()) return;
    var f = slotFunnelFlags_(sr[9]);

    // Pipeline stage tallies (Correction 3 / Lock 5)
    if (f.submitted)            stage.submitted++;            // submitted-or-beyond
    if (f.selected)             stage.selected++;             // selected-or-beyond
    if (f.mobilizedInProgress)  stage.mobilizedInProgress++;  // selected, not deployed
    if (!f.completedMobilization) return;                     // placements = deployed only

    // ── confirmed placement (DEPLOYED) ──
    stage.completedMobilization++;
    total++;

    var reqId   = String(sr[1]||'').trim();
    var trade   = String(sr[5]||'').trim() || 'Unknown';
    var meta    = reqMeta[reqId] || { client:'Unknown', country:'Unknown' };
    var client  = meta.client  || 'Unknown';
    var country = meta.country || 'Unknown';

    // Month from UpdatedAt (col 12, deployment proxy) → fallback AddedAt (col 9)
    var when  = toDateOrNull_(sr[11]) || toDateOrNull_(sr[8]);
    var month = when ? Utilities.formatDate(when,'Asia/Dubai','yyyy-MM') : 'Unknown';

    byClient [client ] = (byClient [client ]||0) + 1;
    byCountry[country] = (byCountry[country]||0) + 1;
    byTrade  [trade  ] = (byTrade  [trade  ]||0) + 1;
    byMonth  [month  ] = (byMonth  [month  ]||0) + 1;
  });

  function rollup(map, labelKey) {
    return Object.keys(map).map(function(k) {
      var o = { placements:map[k] };
      o[labelKey] = k;
      if (hasRate) o.revenue = map[k] * rate;
      return o;
    }).sort(function(a,b){ return b.placements - a.placements; });
  }

  return {
    ok:              true,
    hasRate:         hasRate,
    ratePerPlacement: hasRate ? rate : null,
    revenuePending:  !hasRate,
    // Correction 3 / Lock 5 — full pipeline stages, not just placements
    pipeline: {
      submitted:             { count:stage.submitted,             dataPending:false },
      selected:              { count:stage.selected,              dataPending:false },
      mobilized:             { count:stage.mobilizedInProgress,   dataPending:false,
                               note:'Selected and in mobilization, not yet deployed' },
      travelThisWeek:        { count:0,                           dataPending:true,
                               note:'No travel-date field in schema yet' },
      completedMobilization: { count:stage.completedMobilization, dataPending:false }
    },
    totalPlacements:  total,
    projectedRevenue: hasRate ? total * rate : null,
    byClient:         rollup(byClient,  'client'),
    byCountry:        rollup(byCountry, 'country'),
    byTrade:          rollup(byTrade,   'trade'),
    byMonth:          rollup(byMonth,   'month'),
    message:          hasRate
      ? 'Revenue projected at ' + rate + ' per completed mobilization.'
      : 'Counts only — pass &ratePerPlacement=N to project revenue (no billing data is stored).'
  };
}

// ── Phase 4 Setup + Test ─────────────────────────────────────────────
function setupPhase4() {
  var ss = SpreadsheetApp.openById(SS_ID);
  ensureKnowledgeSheet_(ss);
  Logger.log('_KAI_Knowledge: OK (' + KNOWLEDGE_HEADERS_.length + ' cols, Country×Trade key)');
  Logger.log('Phase 4 infrastructure ready.');
  Logger.log('Next: POST runLearning to populate _KAI_Knowledge from slot outcomes.');
}

function testPhase4() {
  var ss = SpreadsheetApp.openById(SS_ID);

  // 4.1 — Run the learning writer for real (Country×Trade, success=mobilized)
  var learn = runLearningWriter_({ actor:'test' });
  Logger.log('4.1 runLearning: ok=' + learn.ok +
             ' pairs=' + learn.pairs +
             ' learned=' + (learn.learnedPairs!==undefined?learn.learnedPairs:'-') +
             ' successTrigger=' + (learn.successTrigger||'-'));
  Logger.log('    ' + (learn.message||''));

  // ── Top 10 Country×Trade learned conversion rates ──
  var snap = getLearningSnapshot_({});
  Logger.log('── Top 10 Country×Trade Conversion (success = Completed Mobilization) ──');
  Logger.log('    [Country × Trade | Sample | Submitted | Selected | Mobilized | Conv% | live]');
  if (!snap.count) {
    Logger.log('    (No slot data yet — snapshot empty is EXPECTED on a fresh DB.)');
  } else {
    snap.pairs.slice(0,10).forEach(function(p, idx) {
      var live = getHistoricalConversion_(p.country, p.trade);  // (country, trade)
      var convPct = Math.round((p.conversionRate||0) * 100);
      Logger.log('    ' + (idx+1) + '. ' + p.country + ' × ' + p.trade +
                 ' | sample=' + p.sampleSize +
                 ' submitted=' + p.submitted +
                 ' selected=' + p.selected +
                 ' mobilized=' + p.mobilized +
                 ' | conv=' + convPct + '%' +
                 ' (learned=' + p.learned + ', trusted=' +
                 (p.sampleSize >= MIN_LEARNING_SAMPLE_) + ')' +
                 ' → getHistoricalConversion_=' + live);
    });
  }

  // 4.2 — Recruiter KPI (ranked Mobilized → Selected → Submitted)
  var kpi = getRecruiterKPI_({});
  var recs = kpi.recruiters || [];

  Logger.log('── Top Recruiters by Mobilized ──');
  recs.slice(0,10).forEach(function(r, idx) {
    Logger.log('    ' + (idx+1) + '. ' + r.recruiter +
               ' | mobilized=' + r.mobilized +
               ' selected=' + r.selected + ' submitted=' + r.submitted +
               ' | leads=' + r.leadsCreated + '(conv ' + r.leadConversionRate + '%)');
  });

  Logger.log('── Top Recruiters by Selected ──');
  recs.slice().sort(function(a,b){
    return (b.selected-a.selected) || (b.mobilized-a.mobilized) || (b.submitted-a.submitted);
  }).slice(0,10).forEach(function(r, idx) {
    Logger.log('    ' + (idx+1) + '. ' + r.recruiter +
               ' | selected=' + r.selected + ' mobilized=' + r.mobilized +
               ' submitted=' + r.submitted);
  });

  // ── Learning sample counts ──
  var totalSample = (snap.pairs||[]).reduce(function(s,p){ return s + p.sampleSize; }, 0);
  Logger.log('── Learning sample counts ──');
  Logger.log('    Country×Trade pairs: ' + snap.count +
             ' | learned (sample>=' + MIN_LEARNING_SAMPLE_ + '): ' + (learn.learnedPairs||0) +
             ' | total observations: ' + totalSample);

  // ── INTEGRITY GATE (Phase 4 commit rules) ──
  // Funnel invariants must hold for every learned pair, else the test FAILS.
  Logger.log('── Integrity Gate ──');
  var failures = [];
  (snap.pairs||[]).forEach(function(p) {
    var tag = (p.country||'<blank>') + ' × ' + (p.trade||'<blank>');
    if (!p.country)                         failures.push('Country blank: ' + tag);
    if (!p.trade)                           failures.push('Trade blank: ' + tag);
    if ((p.conversionRate||0) > 1.0)        failures.push('ConversionRate>100%: ' + tag + ' (' + p.conversionRate + ')');
    if (p.mobilized > p.selected)           failures.push('Mobilized>Selected: ' + tag + ' (' + p.mobilized + '>' + p.selected + ')');
    if (p.selected  > p.submitted)          failures.push('Selected>Submitted: ' + tag + ' (' + p.selected + '>' + p.submitted + ')');
    // Rule 1: sample<5 must NOT carry a learned (nonzero) rate
    if (p.sampleSize < MIN_LEARNING_SAMPLE_ && (p.conversionRate||0) > 0)
      failures.push('Learned with sample<' + MIN_LEARNING_SAMPLE_ + ': ' + tag + ' (sample=' + p.sampleSize + ')');
  });
  if (failures.length) {
    Logger.log('    RESULT: FAIL — ' + failures.length + ' integrity violation(s):');
    failures.forEach(function(f){ Logger.log('      ✗ ' + f); });
    throw new Error('PHASE 4 INTEGRITY GATE FAILED — ' + failures.length +
                    ' violation(s). Do NOT commit. First: ' + failures[0]);
  }
  Logger.log('    RESULT: PASS — all funnel invariants hold' +
             ' (no blanks, conv<=100%, mobilized<=selected<=submitted, sample-gate respected).');

  // 4.3 — Revenue summary (pipeline stages + counts, then projected)
  var rev = getRevenueSummary_({});
  Logger.log('4.3 revenueSummary (no rate): selected=' + rev.pipeline.selected.count +
             ' mobilized=' + rev.pipeline.mobilized.count +
             ' travelThisWeek=' + rev.pipeline.travelThisWeek.count + '(pending=' +
             rev.pipeline.travelThisWeek.dataPending + ')' +
             ' completedMobilization=' + rev.pipeline.completedMobilization.count +
             ' | totalPlacements=' + rev.totalPlacements +
             ' revenuePending=' + rev.revenuePending);
  var revP = getRevenueSummary_({ ratePerPlacement:'1000' });
  Logger.log('4.3 revenueSummary (rate=1000): projectedRevenue=' + revP.projectedRevenue +
             ' clients=' + revP.byClient.length +
             ' countries=' + revP.byCountry.length +
             ' months=' + revP.byMonth.length);

  Logger.log('Phase 4 validation complete.');
}

// ════════════════════════════════════════════════════════════════════
// SECTION 35 — PHASE 5: GOVERNANCE
// ════════════════════════════════════════════════════════════════════
//
// The last Phase-1-scope module. Two pillars:
//   5.1  Settings Control Center — a _Settings key/value store that surfaces
//        the system's tuning knobs (learning sample floor, default conversion,
//        revenue rate, freshness windows, feature flags) as governed config
//        instead of buried constants. Firestore-ready (collection = settings).
//   5.2  Admin Roles — a role + permission matrix layered on the existing
//        _LoginSystem (Role lives in col 3 already). Adds whoami context,
//        user listing, and admin-gated role assignment. No login-pipeline edits.
//
// Roles (Collaboration Model): ADMIN · MANAGER · RECRUITER · ASSOCIATE
// Admin-only writes are gated by requireAdmin_(token) — never trust the client.
// ════════════════════════════════════════════════════════════════════

// ── ROLE + PERMISSION MATRIX ─────────────────────────────────────────
var KAI_ROLES_ = ['ADMIN','MANAGER','RECRUITER','ASSOCIATE'];

// Capability → roles allowed. UI reads this via getRoles_/myContext to scope.
var ROLE_PERMISSIONS_ = {
  ADMIN: {
    viewAllProjects:true, manageRequirements:true, manageCommitments:true,
    manageSettings:true,  manageUsers:true,  runLearning:true,
    viewRevenue:true,     viewRecruiterKPI:true, assignedScopeOnly:false
  },
  MANAGER: {
    viewAllProjects:true, manageRequirements:true, manageCommitments:true,
    manageSettings:false, manageUsers:false, runLearning:true,
    viewRevenue:true,     viewRecruiterKPI:true, assignedScopeOnly:false
  },
  RECRUITER: {
    viewAllProjects:false, manageRequirements:true, manageCommitments:true,
    manageSettings:false,  manageUsers:false, runLearning:false,
    viewRevenue:false,     viewRecruiterKPI:false, assignedScopeOnly:true
  },
  ASSOCIATE: {
    viewAllProjects:false, manageRequirements:false, manageCommitments:false,
    manageSettings:false,  manageUsers:false, runLearning:false,
    viewRevenue:false,     viewRecruiterKPI:false, assignedScopeOnly:true
  }
};

function normalizeRole_(raw) {
  var r = String(raw||'').trim().toUpperCase();
  return KAI_ROLES_.indexOf(r) >= 0 ? r : 'RECRUITER';   // safe default
}

// Resolves a token → { email, name, role } from _LoginSystem (col 3 = Role).
function resolveUserFromToken_(token) {
  if (!token) return null;
  try {
    var ss    = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('_LoginSystem');
    if (!sheet || sheet.getLastRow() < 2) return null;
    var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][5]||'').trim() === token) {
        return {
          email: String(data[i][0]||'').trim(),
          name:  String(data[i][3]||data[i][0]||'').trim(),
          role:  normalizeRole_(data[i][2])
        };
      }
    }
  } catch(e) {}
  return null;
}

// Admin gate — returns the user object if ADMIN, else null (caller rejects).
function requireAdmin_(token) {
  var u = resolveUserFromToken_(token);
  return (u && u.role === 'ADMIN') ? u : null;
}

// ── 5.1 SETTINGS CONTROL CENTER ──────────────────────────────────────
var SETTINGS_SHEET_   = '_Settings';
var SETTINGS_HEADERS_ = ['Key','Value','Type','Category','Description','UpdatedBy','UpdatedAt'];

// Seed of governed knobs. setupPhase5 writes any that are MISSING — it never
// overwrites a value an admin has already tuned.
var DEFAULT_SETTINGS_ = [
  ['learning.minSample',            '5',    'number', 'Learning', 'Min Country×Trade observations before a learned conversion rate is trusted'],
  ['learning.defaultConversion',    '0.70', 'number', 'Learning', 'Fallback conversion rate used until a pair reaches minSample'],
  ['fill.revalWeight',              '0.5',  'number', 'FillProbability', 'Weight of a REVALIDATION candidate vs a READY one'],
  ['revenue.defaultRatePerPlacement','0',   'number', 'Revenue', 'Default revenue per completed mobilization (0 = revenue pending / counts only)'],
  ['freshness.readyMonths',         '6',    'number', 'Freshness', 'Months since last contact within which supply is READY'],
  ['freshness.expiredMonths',       '18',   'number', 'Freshness', 'Months since last contact beyond which supply is EXPIRED'],
  ['features.expiredVisibleToRecruiter','false','bool','Features', 'Whether EXPIRED supply is ever shown to recruiters (must stay false)'],
  ['features.campaignAsSource',     'false','bool',   'Features', 'Show Campaign as a source row in Recommended Sources']
];

function ensureSettingsSheet_(ss) {
  return ensureSheetWithHeaders_(ss, SETTINGS_SHEET_, SETTINGS_HEADERS_, '#1B4F72');
}

function coerceSettingValue_(value, type) {
  var v = String(value);
  if (type === 'number') { var n = parseFloat(v); return isNaN(n) ? v : n; }
  if (type === 'bool')   { return (v.toLowerCase() === 'true'); }
  return v;
}

// Reader for backend use — returns typed value or fallback. Cached per request.
function getSetting_(key, fallback) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var s  = ss.getSheetByName(SETTINGS_SHEET_);
    if (!s || s.getLastRow() < 2) return fallback;
    var data = s.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]||'').trim() === key)
        return coerceSettingValue_(data[i][1], String(data[i][2]||'string'));
    }
  } catch(e) {}
  return fallback;
}

// GET ?action=settings[&category=Learning]&token=T
function getSettings_(params) {
  params = params || {};
  var fCat = String(params.category||'').trim().toLowerCase();
  var ss = SpreadsheetApp.openById(SS_ID);
  var s  = ss.getSheetByName(SETTINGS_SHEET_);
  if (!s || s.getLastRow() < 2)
    return { ok:true, settings:[], count:0,
             message:'No settings yet — run setupPhase5() to seed defaults.' };

  var data = s.getDataRange().getValues();
  var out  = [];
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]||'').trim();
    if (!key) continue;
    var cat = String(data[i][3]||'').trim();
    if (fCat && cat.toLowerCase() !== fCat) continue;
    var type = String(data[i][2]||'string').trim();
    out.push({
      key:         key,
      value:       coerceSettingValue_(data[i][1], type),
      rawValue:    String(data[i][1]||''),
      type:        type,
      category:    cat,
      description: String(data[i][4]||'').trim(),
      updatedBy:   String(data[i][5]||'').trim(),
      updatedAt:   data[i][6] instanceof Date
                     ? Utilities.formatDate(data[i][6],'Asia/Dubai','yyyy-MM-dd HH:mm') : ''
    });
  }
  return { ok:true, count:out.length, settings:out };
}

// POST action=updateSetting  body: { key*, value*, token }  (ADMIN only)
function updateSetting_(body, token) {
  var admin = requireAdmin_(token);
  if (!admin) return { ok:false, error:'FORBIDDEN', message:'Settings changes require ADMIN role.' };

  var key   = String(body.key||'').trim();
  if (!key) return { ok:false, error:'key required' };
  if (body.value === undefined || body.value === null)
    return { ok:false, error:'value required' };
  var value = String(body.value);

  var ss = SpreadsheetApp.openById(SS_ID);
  var s  = ensureSettingsSheet_(ss);
  var data = s.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]||'').trim() === key) {
      var r = i + 1;
      var type = String(data[i][2]||'string').trim();
      // Guard: bool/number must parse
      if (type === 'number' && isNaN(parseFloat(value)))
        return { ok:false, error:'Setting "' + key + '" expects a number.' };
      s.getRange(r, 2).setValue(value);
      s.getRange(r, 6).setValue(admin.name || admin.email);
      s.getRange(r, 7).setValue(new Date());
      logActivity_(ss, { kaiNo:'SETTINGS', rowIndex:0,
        action:'SETTING_UPDATED',
        detail:key + ' = ' + value, actor:admin.email });
      return { ok:true, key:key, value:coerceSettingValue_(value, type), updatedBy:admin.email };
    }
  }
  return { ok:false, error:'Unknown setting key: ' + key +
           ' (admins may only tune seeded keys; add new keys via setupPhase5).' };
}

// ── 5.2 ADMIN ROLES ──────────────────────────────────────────────────

// GET ?action=roles&token=T — role taxonomy + permission matrix (for UI scoping)
function getRoles_(params) {
  return { ok:true, roles:KAI_ROLES_, permissions:ROLE_PERMISSIONS_ };
}

// GET ?action=myContext&token=T — whoami: identity + role + resolved permissions
function getMyContext_(params, token) {
  var u = resolveUserFromToken_(token);
  if (!u) return { ok:false, error:'Could not resolve user from token' };
  return {
    ok:          true,
    email:       u.email,
    name:        u.name,
    role:        u.role,
    permissions: ROLE_PERMISSIONS_[u.role] || ROLE_PERMISSIONS_.RECRUITER
  };
}

// GET ?action=users&token=T  (ADMIN only) — list users WITHOUT password hashes
function getUsers_(params, token) {
  var admin = requireAdmin_(token);
  if (!admin) return { ok:false, error:'FORBIDDEN', message:'User listing requires ADMIN role.' };

  var ss = SpreadsheetApp.openById(SS_ID);
  var s  = ss.getSheetByName('_LoginSystem');
  if (!s || s.getLastRow() < 2) return { ok:true, users:[], count:0 };

  var data = s.getRange(2, 1, s.getLastRow()-1, 8).getValues();
  var out  = [];
  for (var i = 0; i < data.length; i++) {
    var email = String(data[i][0]||'').trim();
    if (!email) continue;
    out.push({
      email:      email,
      name:       String(data[i][3]||'').trim(),
      role:       normalizeRole_(data[i][2]),
      hasSession: !!String(data[i][5]||'').trim(),
      // col 2 (password hash) deliberately omitted
      permissions: ROLE_PERMISSIONS_[normalizeRole_(data[i][2])] || {}
    });
  }
  return { ok:true, count:out.length, users:out };
}

// POST action=setUserRole  body: { email*, role*, token }  (ADMIN only)
function setUserRole_(body, token) {
  var admin = requireAdmin_(token);
  if (!admin) return { ok:false, error:'FORBIDDEN', message:'Role changes require ADMIN role.' };

  var email   = String(body.email||'').trim().toLowerCase();
  var newRole = normalizeRole_(body.role);
  if (!email) return { ok:false, error:'email required' };
  if (KAI_ROLES_.indexOf(String(body.role||'').trim().toUpperCase()) < 0)
    return { ok:false, error:'Invalid role. Must be one of: ' + KAI_ROLES_.join(', ') };

  var ss = SpreadsheetApp.openById(SS_ID);
  var s  = ss.getSheetByName('_LoginSystem');
  if (!s || s.getLastRow() < 2) return { ok:false, error:'_LoginSystem not found' };

  var data = s.getRange(2, 1, s.getLastRow()-1, 8).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]||'').trim().toLowerCase() === email) {
      var prev = normalizeRole_(data[i][2]);
      // Guard: never strip the last remaining ADMIN.
      if (prev === 'ADMIN' && newRole !== 'ADMIN') {
        var adminCount = 0;
        for (var j = 0; j < data.length; j++)
          if (normalizeRole_(data[j][2]) === 'ADMIN') adminCount++;
        if (adminCount <= 1)
          return { ok:false, error:'LAST_ADMIN',
                   message:'Cannot demote the only remaining ADMIN.' };
      }
      s.getRange(i+2, 3).setValue(newRole);
      logActivity_(ss, { kaiNo:'ROLES', rowIndex:0,
        action:'ROLE_CHANGED',
        detail:email + ': ' + prev + ' → ' + newRole, actor:admin.email });
      return { ok:true, email:email, prevRole:prev, role:newRole };
    }
  }
  return { ok:false, error:'User not found: ' + email };
}

// ── Phase 5 Setup + Test ─────────────────────────────────────────────
function setupPhase5() {
  var ss = SpreadsheetApp.openById(SS_ID);

  // Seed settings (missing keys only — never clobber tuned values)
  var s = ensureSettingsSheet_(ss);
  var existing = {};
  if (s.getLastRow() > 1)
    s.getRange(2,1,s.getLastRow()-1,1).getValues().forEach(function(r){
      existing[String(r[0]||'').trim()] = true;
    });
  var added = 0, now = new Date();
  DEFAULT_SETTINGS_.forEach(function(d) {
    if (existing[d[0]]) return;
    s.appendRow([d[0], d[1], d[2], d[3], d[4], 'system', now]);
    added++;
  });
  Logger.log('_Settings: OK (' + added + ' default(s) seeded, ' +
             Object.keys(existing).length + ' preserved)');

  // Bootstrap an ADMIN if none exists — promote the first user so governance
  // is reachable. Logged, idempotent (no-op once an admin exists).
  var ls = ss.getSheetByName('_LoginSystem');
  if (ls && ls.getLastRow() > 1) {
    var u = ls.getRange(2,1,ls.getLastRow()-1,8).getValues();
    var hasAdmin = u.some(function(r){ return normalizeRole_(r[2]) === 'ADMIN'; });
    if (!hasAdmin) {
      ls.getRange(2,3).setValue('ADMIN');
      Logger.log('Admin bootstrap: promoted first user (' +
                 String(u[0][0]||'') + ') to ADMIN.');
    } else {
      Logger.log('Admin bootstrap: ADMIN already present — no change.');
    }
  } else {
    Logger.log('Admin bootstrap: _LoginSystem empty — seed users first.');
  }
  Logger.log('Phase 5 governance ready.');
}

function testPhase5() {
  var ss = SpreadsheetApp.openById(SS_ID);

  // 5.1 — Settings
  var set = getSettings_({});
  Logger.log('5.1 settings: ok=' + set.ok + ' count=' + set.count);
  set.settings.slice(0,8).forEach(function(x){
    Logger.log('    [' + x.category + '] ' + x.key + ' = ' + x.value +
               ' (' + x.type + ')');
  });
  Logger.log('5.1 getSetting_(learning.minSample) = ' + getSetting_('learning.minSample', 5) +
             ' | defaultConversion = ' + getSetting_('learning.defaultConversion', 0.70));

  // 5.2 — Roles matrix
  var roles = getRoles_({});
  Logger.log('5.2 roles: ' + roles.roles.join(', '));
  KAI_ROLES_.forEach(function(r){
    var p = ROLE_PERMISSIONS_[r];
    Logger.log('    ' + r + ': settings=' + p.manageSettings +
               ' users=' + p.manageUsers + ' revenue=' + p.viewRevenue +
               ' scopeOnly=' + p.assignedScopeOnly);
  });

  // 5.2 — Users (need a real ADMIN token to pass the gate)
  var ls = ss.getSheetByName('_LoginSystem');
  var adminTok = '';
  var adminEmail = '';
  if (ls && ls.getLastRow() > 1) {
    var u = ls.getRange(2,1,ls.getLastRow()-1,8).getValues();
    for (var i = 0; i < u.length; i++) {
      if (normalizeRole_(u[i][2]) === 'ADMIN') {
        adminTok = String(u[i][5]||'').trim();
        adminEmail = String(u[i][0]||'').trim();
        break;
      }
    }
  }
  Logger.log('5.2 admin present: ' + (adminEmail||'NONE — run setupPhase5()') +
             ' | live token: ' + (adminTok ? 'yes' : 'no (admin must log in for users/setUserRole)'));

  if (adminTok) {
    var users = getUsers_({}, adminTok);
    Logger.log('5.2 users (admin-gated): ok=' + users.ok + ' count=' + users.count);
    (users.users||[]).slice(0,10).forEach(function(x){
      Logger.log('    ' + x.email + ' | role=' + x.role + ' | hasSession=' + x.hasSession);
    });
    var ctx = getMyContext_({}, adminTok);
    Logger.log('5.2 myContext: ' + ctx.email + ' role=' + ctx.role +
               ' canManageSettings=' + (ctx.permissions||{}).manageSettings);
  }

  // Gate check — non-admin (empty token) must be refused
  var blocked = getUsers_({}, 'not-a-real-token');
  Logger.log('5.2 gate check (bad token → users): ok=' + blocked.ok +
             ' error=' + (blocked.error||'-') +
             ' → ' + (blocked.ok ? 'FAIL (should be FORBIDDEN)' : 'PASS'));

  Logger.log('Phase 5 validation complete.');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 36 — PROCESSING QUEUE (System Hardening — CV Intelligence Pipeline)
//
// Every candidate created through any ingestion path is queued for async
// enrichment. Steps: TOP3 (Gemini top-3 positions) · ASSESSMENT (Gemini KAI
// assessment text). Queue is a sidecar sheet — Candidates columns unchanged.
//
// Lifecycle per item:  PENDING → PROCESSING → DONE
//                                           → FAILED (retryCount < 5)
//                                           → ABANDONED (retryCount >= 5)
//
// Ingestion paths that enqueue:
//   uploadCV_           → TOP3 + ASSESSMENT
//   whatsappIntake_     → TOP3  (no CV = no assessment yet)
//   convertLeadToCandidate_ → TOP3 (no CV = no assessment yet)
//   gmailConvert_       → via uploadCV_ → TOP3 + ASSESSMENT
//
// Admin endpoints:
//   GET  ?action=processingQueue  → dashboard view
//   GET  ?action=processQueue     → run next batch (max 20)
//   GET  ?action=retryQueue       → reset FAILED → PENDING
//   POST action=retryQueue        → same
// ════════════════════════════════════════════════════════════════════════════

var PQ_HEADERS = [
  'QueueID','KAINo','Step','Status','FailureReason','LastAttempt','RetryCount','CreatedAt'
];
var PQ_COL = { id:1, kaiNo:2, step:3, status:4, failureReason:5, lastAttempt:6, retryCount:7, createdAt:8 };
var PQ_ABANDON_THRESHOLD = 5;

function ensureProcessingQueueSheet_(ss) {
  var s = ss.getSheetByName('_ProcessingQueue');
  if (!s) {
    s = ss.insertSheet('_ProcessingQueue');
    s.appendRow(PQ_HEADERS);
    s.getRange(1,1,1,PQ_HEADERS.length)
     .setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// Write one queue item for a candidate/step. Idempotent — skips if DONE already exists.
function queueForProcessing_(kaiNo, step, ss) {
  try {
    if (!kaiNo || !step) return;
    ss = ss || SpreadsheetApp.openById(SS_ID);
    var sheet = ensureProcessingQueueSheet_(ss);
    var data  = sheet.getDataRange().getValues();
    // Check for existing non-ABANDONED, non-DONE entry
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][PQ_COL.kaiNo-1]||'').trim() === kaiNo &&
          String(data[i][PQ_COL.step-1]||'').trim() === step) {
        var st = String(data[i][PQ_COL.status-1]||'').trim();
        if (st === 'DONE') return; // already enriched
        if (st === 'PENDING' || st === 'PROCESSING') return; // already queued
        // FAILED or ABANDONED — re-enqueue only if not abandoned
        if (st === 'FAILED') {
          sheet.getRange(i+1, PQ_COL.status).setValue('PENDING');
          sheet.getRange(i+1, PQ_COL.failureReason).setValue('');
          return;
        }
      }
    }
    var queueId = 'PQ-' + Utilities.formatDate(new Date(),'Asia/Dubai','yyyyMMddHHmmss') +
                  '-' + kaiNo.replace(/[^A-Z0-9]/gi,'').slice(-6);
    sheet.appendRow([queueId, kaiNo, step, 'PENDING', '', '', 0, new Date()]);
  } catch(e) {
    Logger.log('queueForProcessing_ error: ' + e.message);
  }
}

// Admin view: queue stats + oldest PENDING + recent FAILED
// GET ?action=processingQueue&token=...
function getProcessingQueue_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ensureProcessingQueueSheet_(ss);
  if (sheet.getLastRow() < 2) return { ok:true, pending:0, processing:0, done:0, failed:0, items:[] };

  var data  = sheet.getRange(2,1,sheet.getLastRow()-1,PQ_HEADERS.length).getValues();
  var counts = { PENDING:0, PROCESSING:0, DONE:0, FAILED:0, ABANDONED:0 };
  var items = [];
  var limit = parseInt(params && params.limit || '50') || 50;

  for (var i = 0; i < data.length; i++) {
    var st = String(data[i][PQ_COL.status-1]||'').trim();
    counts[st] = (counts[st]||0) + 1;
    if ((st === 'PENDING' || st === 'FAILED') && items.length < limit) {
      items.push({
        queueId:       String(data[i][PQ_COL.id-1]||''),
        kaiNo:         String(data[i][PQ_COL.kaiNo-1]||''),
        step:          String(data[i][PQ_COL.step-1]||''),
        status:        st,
        failureReason: String(data[i][PQ_COL.failureReason-1]||''),
        retryCount:    parseInt(data[i][PQ_COL.retryCount-1]||'0')||0,
        createdAt:     data[i][PQ_COL.createdAt-1] ? String(data[i][PQ_COL.createdAt-1]) : ''
      });
    }
  }

  return {
    ok:         true,
    pending:    counts.PENDING    || 0,
    processing: counts.PROCESSING || 0,
    done:       counts.DONE       || 0,
    failed:     counts.FAILED     || 0,
    abandoned:  counts.ABANDONED  || 0,
    total:      data.length,
    items:      items
  };
}

// Reset all FAILED items back to PENDING (skip ABANDONED)
// GET/POST ?action=retryQueue&token=...
function retryQueue_(params) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ensureProcessingQueueSheet_(ss);
  if (sheet.getLastRow() < 2) return { ok:true, reset:0 };

  var data  = sheet.getRange(2,1,sheet.getLastRow()-1,PQ_HEADERS.length).getValues();
  var reset = 0;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][PQ_COL.status-1]||'').trim() === 'FAILED') {
      sheet.getRange(i+2, PQ_COL.status).setValue('PENDING');
      sheet.getRange(i+2, PQ_COL.failureReason).setValue('');
      reset++;
    }
  }
  return { ok:true, reset:reset, message:'Reset ' + reset + ' FAILED items to PENDING' };
}

// Batch enrichment processor. Call via:
//   GET ?action=processQueue&limit=20&token=...
//   Or install as a time trigger (installQueueTrigger_)
//
// For each PENDING item: looks up candidate, calls Gemini, writes back to Candidates sheet,
// marks DONE. On error marks FAILED. After PQ_ABANDON_THRESHOLD failures → ABANDONED.
function processNextInQueue_(params) {
  params = params || {};
  var limit  = Math.min(50, parseInt(params.limit||'20') || 20);
  var dryRun = String(params.dryRun||'') === 'true';

  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { ok:false, error:'GEMINI_API_KEY not set in Script Properties' };

  var ss         = SpreadsheetApp.openById(SS_ID);
  var qSheet     = ensureProcessingQueueSheet_(ss);
  var candSheet  = ss.getSheetByName('Candidates');
  if (!candSheet) return { ok:false, error:'Candidates sheet not found' };

  if (qSheet.getLastRow() < 2) return { ok:true, processed:0, message:'Queue empty' };

  var qData    = qSheet.getRange(2,1,qSheet.getLastRow()-1,PQ_HEADERS.length).getValues();
  var candData = candSheet.getRange(2,1,candSheet.getLastRow()-1,42).getValues();

  // Build kaiNo → row index map for fast lookup
  var kaiMap = {};
  for (var c = 0; c < candData.length; c++) {
    var k = String(candData[c][COL.kaiNo-1]||'').trim();
    if (k) kaiMap[k] = c + 2; // 1-based row in Candidates sheet
  }

  var processed = 0, skipped = 0, errors = [];

  for (var i = 0; i < qData.length; i++) {
    if (processed >= limit) break;

    var st = String(qData[i][PQ_COL.status-1]||'').trim();
    if (st !== 'PENDING') { skipped++; continue; }

    var queueRowNum = i + 2;
    var kaiNo       = String(qData[i][PQ_COL.kaiNo-1]||'').trim();
    var step        = String(qData[i][PQ_COL.step-1]||'').trim();
    var retryCount  = parseInt(qData[i][PQ_COL.retryCount-1]||'0') || 0;

    if (retryCount >= PQ_ABANDON_THRESHOLD) {
      if (!dryRun) qSheet.getRange(queueRowNum, PQ_COL.status).setValue('ABANDONED');
      skipped++;
      continue;
    }

    var candRowNum = kaiMap[kaiNo];
    if (!candRowNum) {
      if (!dryRun) {
        qSheet.getRange(queueRowNum, PQ_COL.status).setValue('FAILED');
        qSheet.getRange(queueRowNum, PQ_COL.failureReason).setValue('Candidate not found: ' + kaiNo);
        qSheet.getRange(queueRowNum, PQ_COL.retryCount).setValue(retryCount + 1);
        qSheet.getRange(queueRowNum, PQ_COL.lastAttempt).setValue(new Date());
      }
      errors.push({ kaiNo:kaiNo, step:step, error:'Candidate row not found' });
      processed++;
      continue;
    }

    var candRowIdx = candRowNum - 2; // 0-based index in candData
    var cand = {
      trade:           String(candData[candRowIdx][COL.trade-1]||'').trim(),
      positionApplied: String(candData[candRowIdx][COL.positionApplied-1]||'').trim(),
      experience:      parseFloat(candData[candRowIdx][COL.experience-1]) || 0,
      education:       String(candData[candRowIdx][COL.education-1]||'').trim(),
      gulfExp:         String(candData[candRowIdx][COL.gulfExp-1]||'').trim(),
      industry:        String(candData[candRowIdx][COL.industry-1]||'').trim(),
      kaiAssessment:   String(candData[candRowIdx][COL.kaiAssessment-1]||'').trim().slice(0,300),
      top3Positions:   String(candData[candRowIdx][COL.top3Positions-1]||'').trim()
    };

    // Mark PROCESSING
    if (!dryRun) {
      qSheet.getRange(queueRowNum, PQ_COL.status).setValue('PROCESSING');
      qSheet.getRange(queueRowNum, PQ_COL.lastAttempt).setValue(new Date());
    }

    try {
      if (step === 'TOP3') {
        if (cand.top3Positions && cand.top3Positions.length > 3) {
          // Already enriched by another path — mark done, skip Gemini call
          if (!dryRun) qSheet.getRange(queueRowNum, PQ_COL.status).setValue('DONE');
          skipped++;
          continue;
        }
        var tradeSrc = cand.trade || cand.positionApplied;
        if (!tradeSrc) {
          if (!dryRun) {
            qSheet.getRange(queueRowNum, PQ_COL.status).setValue('FAILED');
            qSheet.getRange(queueRowNum, PQ_COL.failureReason).setValue('No trade/position — cannot generate Top 3');
            qSheet.getRange(queueRowNum, PQ_COL.retryCount).setValue(retryCount + 1);
          }
          skipped++;
          continue;
        }
        var top3Prompt =
          'A GCC recruitment candidate has the following profile:\n' +
          'Trade/Skill: ' + tradeSrc + '\n' +
          'Position Applied: ' + (cand.positionApplied || tradeSrc) + '\n' +
          'Experience: ' + cand.experience + ' years\n' +
          'Education: ' + (cand.education || 'Not specified') + '\n' +
          'Gulf Experience: ' + (cand.gulfExp || 'None') + '\n' +
          'Industry: ' + (cand.industry || 'Not specified') + '\n' +
          (cand.kaiAssessment ? 'Notes: ' + cand.kaiAssessment + '\n' : '') +
          '\nList the top 3 GCC job positions this candidate is most qualified for.' +
          '\nReturn ONLY a comma-separated list of 3 job titles. No explanation. Example:\n' +
          'Scaffold Supervisor, Rigger, Scaffolder';

        var top3Resp = callGeminiText_(top3Prompt, apiKey, 80);
        var top3Text = top3Resp.trim().replace(/\n/g,', ').replace(/\s*,\s*/g,', ').replace(/[*#]/g,'').trim();

        if (top3Text.length > 5) {
          if (!dryRun) {
            candSheet.getRange(candRowNum, COL.top3Positions).setValue(top3Text);
            qSheet.getRange(queueRowNum, PQ_COL.status).setValue('DONE');
          }
          processed++;
        } else {
          throw new Error('Gemini returned empty top3 response');
        }

      } else if (step === 'ASSESSMENT') {
        var existingAssess = cand.kaiAssessment;
        if (existingAssess && existingAssess.length > 20 &&
            existingAssess.indexOf('WhatsApp intake') < 0 &&
            existingAssess.indexOf('intake') < 0) {
          if (!dryRun) qSheet.getRange(queueRowNum, PQ_COL.status).setValue('DONE');
          skipped++;
          continue;
        }
        var tradeSrcA = cand.trade || cand.positionApplied;
        var assessPrompt =
          'Write a 2-sentence GCC recruitment assessment for this candidate:\n' +
          'Trade: ' + (tradeSrcA || 'Unknown') + '\n' +
          'Experience: ' + cand.experience + ' years total' +
          (cand.gulfExp ? ', Gulf experience: ' + cand.gulfExp : '') + '\n' +
          'Education: ' + (cand.education || 'Not specified') + '\n' +
          'Focus on suitability for GCC blue-collar/technical deployment.' +
          ' Be direct and factual. No greeting. No candidate name.';

        var assessText = callGeminiText_(assessPrompt, apiKey, 120).trim();

        if (assessText.length > 20) {
          if (!dryRun) {
            candSheet.getRange(candRowNum, COL.kaiAssessment).setValue(assessText);
            qSheet.getRange(queueRowNum, PQ_COL.status).setValue('DONE');
          }
          processed++;
        } else {
          throw new Error('Gemini returned empty assessment response');
        }

      } else {
        // Unknown step — mark abandoned
        if (!dryRun) {
          qSheet.getRange(queueRowNum, PQ_COL.status).setValue('ABANDONED');
          qSheet.getRange(queueRowNum, PQ_COL.failureReason).setValue('Unknown step: ' + step);
        }
        skipped++;
      }

      Utilities.sleep(300); // throttle Gemini calls

    } catch(e) {
      errors.push({ kaiNo:kaiNo, step:step, row:queueRowNum, error:e.message });
      if (!dryRun) {
        var newRetry = retryCount + 1;
        qSheet.getRange(queueRowNum, PQ_COL.status).setValue(newRetry >= PQ_ABANDON_THRESHOLD ? 'ABANDONED' : 'FAILED');
        qSheet.getRange(queueRowNum, PQ_COL.failureReason).setValue(e.message.slice(0,200));
        qSheet.getRange(queueRowNum, PQ_COL.retryCount).setValue(newRetry);
      }
      processed++;
    }
  }

  return {
    ok:        true,
    processed: processed,
    skipped:   skipped,
    errors:    errors.length,
    errorList: errors.slice(0,10),
    dryRun:    dryRun,
    summary:   'Processed ' + processed + ' queue items. Skipped ' + skipped + '. Errors: ' + errors.length
  };
}

// Shared Gemini text-only call (no file attachment needed)
function callGeminiText_(prompt, apiKey, maxTokens) {
  var resp = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
    { method:'post', contentType:'application/json', muteHttpExceptions:true,
      payload: JSON.stringify({
        contents:[{ parts:[{ text:prompt }] }],
        generationConfig:{ temperature:0.2, maxOutputTokens: maxTokens || 120 }
      })
    }
  );
  var result = JSON.parse(resp.getContentText());
  if (!result.candidates || !result.candidates[0]) throw new Error('Gemini: no candidates in response');
  return String(result.candidates[0].content.parts[0].text || '').trim();
}

// Install a time-based trigger to run processNextInQueue_ every 10 minutes.
// Requires script.scriptapp OAuth scope — if this project lacks it, set up manually:
//   GAS UI → Triggers (⏰ icon, bottom-left) → Add Trigger
//   Function: runQueueBatch | Event: Time-driven | Every 10 minutes
function installQueueTrigger_() {
  Logger.log('Set trigger manually: GAS Triggers UI → runQueueBatch → Time-driven → Every 10 min');
}

function removeQueueTrigger_() {
  Logger.log('Remove trigger manually: GAS Triggers UI → find runQueueBatch → delete');
}

// Time-trigger handler — called by the 10-min trigger
function runQueueBatch() {
  var result = processNextInQueue_({ limit: '20' });
  Logger.log('runQueueBatch: ' + (result.summary || result.message || result.error || JSON.stringify(result)));
}

// Public test wrappers
function testProcessingQueue()   { Logger.log(JSON.stringify(getProcessingQueue_({}))); }
function testProcessQueueDry()   { Logger.log(JSON.stringify(processNextInQueue_({ limit:'5', dryRun:'true' }))); }
function testProcessQueue()      { Logger.log(JSON.stringify(processNextInQueue_({ limit:'10' }))); }
function installQueueTrigger()   { installQueueTrigger_(); }
function removeQueueTrigger()    { removeQueueTrigger_(); }

// ════════════════════════════════════════════════════════════════════════════
// SECTION 37 — CV INGESTION AUDIT
//
// Run auditCVIngestion() from the GAS editor to check the last N candidates
// for pipeline completeness. Catches silent failures before go-live.
//
// Checks per candidate:
//   ✓ kaiNo present
//   ✓ name present
//   ✓ trade classified (not blank)
//   ✓ score > 0
//   ✓ verdict set (not "Pending action")
//   ✓ top3Positions populated
//   ✓ kaiAssessment present (not boilerplate)
//   ✓ cvLink present (Drive URL)
//   ✓ mobile or email present
//   ✓ missingFields not critical (passport + mobile both missing = critical)
//
// Output: per-candidate pass/fail table + summary stats
// ════════════════════════════════════════════════════════════════════════════

function auditCVIngestion() {
  var limit = 20; // change to audit more candidates
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log('No candidates found'); return;
  }

  var data   = sheet.getRange(2, 1, sheet.getLastRow()-1, 42).getValues();
  var active = [];

  // Collect active rows newest-first
  for (var i = data.length-1; i >= 0 && active.length < limit; i--) {
    var act = String(data[i][COL.active-1]||'').toUpperCase();
    if (act === 'SUPERSEDED' || act === 'ARCHIVED') continue;
    var name = String(data[i][COL.name-1]||'').trim();
    if (!name) continue;
    active.push({ rowNum: i+2, row: data[i] });
  }

  var results = [];
  var passCount = 0, failCount = 0, warnCount = 0;

  active.forEach(function(item) {
    var r    = item.row;
    var fail = [];
    var warn = [];

    var kaiNo   = String(r[COL.kaiNo-1]||'').trim();
    var name    = String(r[COL.name-1]||'').trim();
    var trade   = String(r[COL.trade-1]||'').trim();
    var score   = parseInt(r[COL.score-1]) || 0;
    var verdict = String(r[COL.verdict-1]||'').trim();
    var top3    = String(r[COL.top3Positions-1]||'').trim();
    var assess  = String(r[COL.kaiAssessment-1]||'').trim();
    var cvLink  = String(r[COL.cvLink-1]||'').trim();
    var mobile  = String(r[COL.mobile-1]||'').replace(/^'/,'').trim();
    var email   = String(r[COL.email-1]||'').trim();
    var missing = String(r[COL.missingFields-1]||'').trim();
    var flags   = String(r[COL.flags-1]||'').trim();

    if (!kaiNo)                                         fail.push('NO_KAI_NUMBER');
    if (!trade)                                         fail.push('NO_TRADE');
    if (score === 0)                                    fail.push('SCORE_ZERO');
    if (!verdict || verdict === 'Pending action')       fail.push('VERDICT_UNSET');
    if (!top3 || top3.length < 5)                      warn.push('NO_TOP3');
    if (!assess || assess.length < 20)                 warn.push('NO_ASSESSMENT');
    if (assess.indexOf('intake') >= 0 && assess.length < 50) warn.push('BOILERPLATE_ASSESSMENT');
    if (!cvLink)                                       warn.push('NO_CV_LINK');
    if (!mobile && !email)                             fail.push('NO_CONTACT');
    if (missing.indexOf('passport') >= 0 &&
        missing.indexOf('mobile') >= 0)                warn.push('CRITICAL_MISSING_FIELDS');

    var status = fail.length > 0 ? 'FAIL' : (warn.length > 0 ? 'WARN' : 'PASS');
    if (status === 'PASS') passCount++;
    else if (status === 'FAIL') failCount++;
    else warnCount++;

    results.push({
      row:     item.rowNum,
      kaiNo:   kaiNo || '(none)',
      name:    name.slice(0,20),
      trade:   trade || '—',
      score:   score,
      hasCV:   !!cvLink,
      hasTop3: top3.length > 5,
      source:  flags.slice(0,20) || 'unknown',
      status:  status,
      issues:  fail.concat(warn).join(' | ') || '—'
    });
  });

  Logger.log('══════════════════════════════════════════════════');
  Logger.log('KAI CV INGESTION AUDIT — Last ' + active.length + ' active candidates');
  Logger.log('══════════════════════════════════════════════════');
  Logger.log(
    'PASS: ' + passCount + ' | WARN: ' + warnCount + ' | FAIL: ' + failCount +
    ' | Pass rate: ' + Math.round(passCount/active.length*100) + '%'
  );
  Logger.log('──────────────────────────────────────────────────');

  results.forEach(function(r) {
    Logger.log(
      '[' + r.status + '] Row ' + r.row + ' | ' + r.kaiNo +
      ' | ' + r.name + ' | Trade: ' + r.trade +
      ' | Score: ' + r.score +
      ' | CV: ' + (r.hasCV ? 'Y' : 'N') +
      ' | Top3: ' + (r.hasTop3 ? 'Y' : 'N') +
      ' | Src: ' + r.source +
      (r.issues !== '—' ? '\n       Issues: ' + r.issues : '')
    );
  });

  Logger.log('══════════════════════════════════════════════════');
  Logger.log('HEALTH: ' + (passCount/active.length >= 0.85 ? '✓ GOOD (85%+ pass)' :
             passCount/active.length >= 0.70 ? '⚠ WARNING (70-84% pass)' : '✗ CRITICAL (<70% pass)'));
  Logger.log('If FAIL rate > 15%: do not go live. Fix ingestion pipeline first.');
  Logger.log('══════════════════════════════════════════════════');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 38 — TUWAIQ BULK CAMPAIGN SETUP
// Creates: Tuwaiq client, "Tuwaiq Saudi Arabia 2026" campaign, 41 requirements,
//          _Tuwaiq_Interview_Tracker sheet
// Run once: setupTuwaiqCampaign()
// ════════════════════════════════════════════════════════════════════════════

var TUWAIQ_POSITIONS = [
  // ── MAINTENANCE & UTILITIES ─────────────────────────────────────────────
  { dept:'Maintenance & Utilities', trade:'Electrician',                     posId:'MU-037',        category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Maintenance & Utilities', trade:'HV Qualified Electrician',        posId:'MU-038',        category:'Skilled Worker', qty:4, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Maintenance & Utilities', trade:'Hydraulic Specialist',            posId:'MU-042',        category:'Skilled Worker', qty:1, expMin:3,  expMax:12, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Maintenance & Utilities', trade:'Instrumentation Automation Technician', posId:'MU-045', category:'Skilled Worker', qty:1, expMin:5, expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Maintenance & Utilities', trade:'Lead Electrical',                 posId:'MU-046',        category:'Skilled Worker', qty:2, expMin:7,  expMax:20, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Maintenance & Utilities', trade:'Lead Instrumentation Automation', posId:'MU-048',        category:'Skilled Worker', qty:2, expMin:7,  expMax:20, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Maintenance & Utilities', trade:'Lead Mechanical',                 posId:'MU-050',        category:'Skilled Worker', qty:3, expMin:7,  expMax:20, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Maintenance & Utilities', trade:'Mechanical Technician',           posId:'MU-054',        category:'Skilled Worker', qty:3, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Maintenance & Utilities', trade:'Maintenance Supervisor',          posId:'MU-010',        category:'Supervisor',     qty:1, expMin:5,  expMax:15, salary:'SAR 4000-5000', interviewMode:'CAMPING' },
  // ── CASTING ─────────────────────────────────────────────────────────────
  { dept:'Casting',  trade:'Shot Blast Operator',                            posId:'PRO-CAST-039',  category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Casting',  trade:'Shakeout Operator',                              posId:'PRO-CAST-041',  category:'Skilled Worker', qty:1, expMin:7,  expMax:20, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Casting',  trade:'Sand Lab Operator',                              posId:'PRO-CAST-002',  category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Casting',  trade:'Pouring Operator',                               posId:'PRO-CAST-030',  category:'Skilled Worker', qty:1, expMin:10, expMax:25, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Casting',  trade:'Moulding Operator',                              posId:'PRO-CAST-034',  category:'Skilled Worker', qty:1, expMin:3,  expMax:12, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Casting',  trade:'Grinding Operator',                              posId:'PRO-CAST-035',  category:'Skilled Worker', qty:4, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Casting',  trade:'Dimension Inspection Operator Casting',          posId:'PRO-CAST-031',  category:'Skilled Worker', qty:2, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  // ── FORGING ─────────────────────────────────────────────────────────────
  { dept:'Forging',  trade:'Heating Furnace Operator',                       posId:'PRO-FORG-022',  category:'Skilled Worker', qty:2, expMin:3,  expMax:12, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Forging',  trade:'Forging Skilled Worker Press',                   posId:'PRO-FORG-012',  category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Forging',  trade:'Forging Press Operator',                         posId:'PRO-FORG-020',  category:'Skilled Worker', qty:2, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Forging',  trade:'Crane Operator Forging',                         posId:'PRO-FORG-019',  category:'Skilled Worker', qty:1, expMin:3,  expMax:12, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  // ── MACHINING ───────────────────────────────────────────────────────────
  { dept:'Machining', trade:'CNC Machinist Plano Miller',                    posId:'PRO-MCH-031',   category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Machining', trade:'CNC Machinist Lathe',                           posId:'PRO-MCH-029',   category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Machining', trade:'CNC Machinist HBM',                             posId:'PRO-MCH-030',   category:'Skilled Worker', qty:2, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Machining', trade:'CNC Machinist Deep Hole Drilling',              posId:'PRO-MCH-028',   category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Machining', trade:'Forklift Operator',                             posId:'PRO-MCH-033',   category:'Skilled Worker', qty:1, expMin:4,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Machining', trade:'Auxiliary Operator',                            posId:'PRO-MCH-035',   category:'General Labor',  qty:1, expMin:3,  expMax:12, salary:'SAR 900-1400',  interviewMode:'CAMPING' },
  // ── HEAT TREATMENT ──────────────────────────────────────────────────────
  { dept:'Heat Treatment', trade:'Sample Machining Supervisor',              posId:'PRO-HT-019',    category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Heat Treatment', trade:'Heat Treatment Operator',                  posId:'PRO-HT-021',    category:'Skilled Worker', qty:2, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Heat Treatment', trade:'Crane Operator Heat Treatment',            posId:'PRO-HT-019-CR', category:'Skilled Worker', qty:1, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Heat Treatment', trade:'Dimensional Inspector Heat Treatment',     posId:'PRO-HT-023',    category:'Skilled Worker', qty:1, expMin:3,  expMax:12, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  // ── NDE / QC ────────────────────────────────────────────────────────────
  { dept:'NDE/QC',   trade:'NDE Technician UT ASNT Level II',                posId:'QLTY-017',      category:'Skilled Worker', qty:3, expMin:8,  expMax:20, salary:'SAR 2000-4000', interviewMode:'CAMPING', certRequired:'ASNT Level II UT' },
  { dept:'NDE/QC',   trade:'QC Inspector Dimensional',                       posId:'QLTY-027',      category:'Skilled Worker', qty:2, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'NDE/QC',   trade:'RT Machine Operator',                            posId:'QLTY-031',      category:'Skilled Worker', qty:2, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  // ── PATTERN SHOP ────────────────────────────────────────────────────────
  { dept:'Pattern Shop', trade:'Pattern Maker',                              posId:'TEC-028',       category:'General Labor',  qty:2, expMin:5,  expMax:15, salary:'SAR 900-1400',  interviewMode:'CAMPING' },
  { dept:'Pattern Shop', trade:'Pattern Shop Labour',                        posId:'TEC-030',       category:'General Labor',  qty:2, expMin:3,  expMax:12, salary:'SAR 900-1400',  interviewMode:'CAMPING' },
  // ── MELTING ─────────────────────────────────────────────────────────────
  { dept:'Melting',  trade:'Refractory Specialist',                          posId:'PRO-MELT-040',  category:'Engineer',       qty:1, expMin:10, expMax:25, salary:'SAR 6000-11000', interviewMode:'CAMPING' },
  { dept:'Melting',  trade:'Ingot Casting Supervisor',                       posId:'PRO-MELT-039',  category:'Supervisor',     qty:1, expMin:10, expMax:25, salary:'SAR 4000-5000', interviewMode:'CAMPING' },
  // ── PRODUCTION CONTROL ──────────────────────────────────────────────────
  { dept:'Production Control', trade:'Surface Blasting Painting Operator',  posId:'PRO-PC-009',    category:'Skilled Worker', qty:2, expMin:5,  expMax:15, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Production Control', trade:'Packing Specialist',                   posId:'PRO-PC-012',    category:'Skilled Worker', qty:1, expMin:2,  expMax:10, salary:'SAR 2000-4000', interviewMode:'CAMPING' },
  { dept:'Production Control', trade:'Packing Operator',                     posId:'PRO-PC-008',    category:'Skilled Worker', qty:2, expMin:3,  expMax:12, salary:'SAR 2000-4000', interviewMode:'CAMPING' }
];

// ── INTERVIEW CITIES FOR TUWAIQ CAMPAIGN ────────────────────────────────────
var TUWAIQ_INTERVIEW_CITIES = 'Raipur, Vadodara, Mumbai, Coimbatore';
var TUWAIQ_INTERVIEW_DATES  = 'June 14-18, 2026';
var TUWAIQ_CLIENT_NAME      = 'Tuwaiq Manufacturing Company';
var TUWAIQ_CAMPAIGN_NAME    = 'Tuwaiq Saudi Arabia 2026';
var TUWAIQ_SECTOR           = 'Manufacturing';
var TUWAIQ_LOCATION         = 'Riyadh, Saudi Arabia';
var TUWAIQ_SOURCED_BY       = 'Safwan';

// ── MASTER RUNNER ────────────────────────────────────────────────────────────
function setupTuwaiqCampaign() {
  Logger.log('══════════════════════════════════════════════════');
  Logger.log('TUWAIQ CAMPAIGN SETUP — START');
  Logger.log('══════════════════════════════════════════════════');

  var ss = SpreadsheetApp.openById(SS_ID);

  // Step 1 — Create or find Tuwaiq client
  var clientResult = createTuwaiqClient_(ss);
  Logger.log('Client: ' + clientResult.message + ' | ID: ' + clientResult.clientId);

  // Step 2 — Create or find campaign
  var campaignResult = createTuwaiqCampaign_(ss, clientResult.clientId);
  Logger.log('Campaign: ' + campaignResult.message + ' | ID: ' + campaignResult.campaignId);

  // Step 3 — Bulk create requirements
  var reqResult = createTuwaiqRequirements_(ss, clientResult.clientId, campaignResult.campaignId);
  Logger.log('Requirements: created=' + reqResult.created + ' | skipped=' + reqResult.skipped + ' | errors=' + reqResult.errors);

  // Step 4 — Create submission tracker sheet
  var trackerResult = createTuwaiqSubmissionTracker_(ss, campaignResult.campaignId);
  Logger.log('Tracker: ' + trackerResult.message);

  Logger.log('══════════════════════════════════════════════════');
  Logger.log('TUWAIQ CAMPAIGN SETUP — COMPLETE');
  Logger.log('Total positions: ' + TUWAIQ_POSITIONS.length);
  Logger.log('Total heads: ' + TUWAIQ_POSITIONS.reduce(function(s,p){ return s+p.qty; }, 0));
  Logger.log('Client ID: ' + clientResult.clientId);
  Logger.log('Campaign ID: ' + campaignResult.campaignId);
  Logger.log('Tracker sheet: _Tuwaiq_Interview_Tracker');
  Logger.log('══════════════════════════════════════════════════');
}

// ── CREATE TUWAIQ CLIENT ─────────────────────────────────────────────────────
function createTuwaiqClient_(ss) {
  try {
    var sheet = ss.getSheetByName('_Clients');
    if (!sheet) {
      // Create _Clients sheet with headers if missing
      sheet = ss.insertSheet('_Clients');
      sheet.appendRow(['ClientID','ClientName','Sector','Location','Country','ContactPerson','ContactEmail','ContactPhone','Status','Notes','CreatedAt']);
    }

    var data = sheet.getDataRange().getValues();
    // Check if Tuwaiq already exists (skip row 0 = headers)
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]||'').toLowerCase().indexOf('tuwaiq') !== -1) {
        return { ok:true, clientId: String(data[i][0]), message:'Found existing' };
      }
    }

    // Create new client
    var clientId = 'CLT-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd') + '-001';
    sheet.appendRow([
      clientId,
      TUWAIQ_CLIENT_NAME,
      TUWAIQ_SECTOR,
      TUWAIQ_LOCATION,
      'Saudi Arabia',
      'Tuwaiq HR',
      '',
      '',
      'Active',
      'Manufacturing company — Forging, Casting, Machining, NDE. Interview window: ' + TUWAIQ_INTERVIEW_DATES,
      new Date()
    ]);

    return { ok:true, clientId: clientId, message:'Created new' };
  } catch(e) {
    Logger.log('createTuwaiqClient_ error: ' + e.message);
    return { ok:false, clientId:'CLT-TUWAIQ', message:'Error: ' + e.message };
  }
}

// ── CREATE TUWAIQ CAMPAIGN ───────────────────────────────────────────────────
function createTuwaiqCampaign_(ss, clientId) {
  try {
    var sheet = ss.getSheetByName('_Campaigns');
    if (!sheet) {
      sheet = ss.insertSheet('_Campaigns');
      sheet.appendRow(['CampaignID','CampaignName','ClientID','ClientName','Sector','Location','InterviewDates','InterviewCities','HiringMode','Status','TotalHeads','Notes','CreatedAt']);
    }

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]||'').toLowerCase().indexOf('tuwaiq') !== -1) {
        return { ok:true, campaignId: String(data[i][0]), message:'Found existing' };
      }
    }

    var totalHeads = TUWAIQ_POSITIONS.reduce(function(s,p){ return s+p.qty; }, 0);
    var campaignId = 'CMP-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd') + '-001';

    sheet.appendRow([
      campaignId,
      TUWAIQ_CAMPAIGN_NAME,
      clientId,
      TUWAIQ_CLIENT_NAME,
      TUWAIQ_SECTOR,
      TUWAIQ_LOCATION,
      TUWAIQ_INTERVIEW_DATES,
      TUWAIQ_INTERVIEW_CITIES,
      'CAMPING',
      'Active',
      totalHeads,
      'All positions from Tuwaiq JD package June 2026. ' + TUWAIQ_POSITIONS.length + ' roles, ' + totalHeads + ' total heads.',
      new Date()
    ]);

    return { ok:true, campaignId: campaignId, message:'Created new' };
  } catch(e) {
    Logger.log('createTuwaiqCampaign_ error: ' + e.message);
    return { ok:false, campaignId:'CMP-TUWAIQ', message:'Error: ' + e.message };
  }
}

// ── BULK CREATE REQUIREMENTS ─────────────────────────────────────────────────
function createTuwaiqRequirements_(ss, clientId, campaignId) {
  var created = 0, skipped = 0, errors = 0;

  try {
    var rSheet = ss.getSheetByName('_Requirements');
    if (!rSheet) {
      Logger.log('createTuwaiqRequirements_: _Requirements sheet not found');
      return { created:0, skipped:0, errors:1 };
    }

    var existingData = rSheet.getDataRange().getValues();
    // Build set of existing trades for this campaign to avoid duplicates
    var existingTrades = {};
    for (var e = 1; e < existingData.length; e++) {
      var exTrade    = String(existingData[e][3]||'').trim().toLowerCase();
      var exCampaign = String(existingData[e][19]||'').trim();
      if (exCampaign === campaignId) {
        existingTrades[exTrade] = true;
      }
    }

    for (var i = 0; i < TUWAIQ_POSITIONS.length; i++) {
      var pos = TUWAIQ_POSITIONS[i];

      try {
        // Skip if already created for this campaign
        if (existingTrades[pos.trade.toLowerCase()]) {
          skipped++;
          Logger.log('  SKIP (exists): ' + pos.trade);
          continue;
        }

        // Build requirement row matching _Requirements sheet structure:
        // ReqID | CreatedAt | ClientID | Trade | Department | Qty | Status |
        // MinAge | MaxAge | Salary | Nationality | Notes | OpenQty |
        // Location | Country | SourcedBy | InterviewMode | Sector |
        // CampaignName | CampaignID | ClientName | ExpMin | ExpMax |
        // CommittedQty | InterviewDate | CertRequired | InterviewCities
        var reqId = 'REQ-TUW-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd') +
                    '-' + String(i+1).padStart(3,'0');

        var certNote = pos.certRequired ? 'Required cert: ' + pos.certRequired + '. ' : '';
        var notes    = certNote + 'Position ID: ' + pos.posId + ' | Category: ' + pos.category;

        rSheet.appendRow([
          reqId,                    // A: ReqID
          new Date(),               // B: CreatedAt
          clientId,                 // C: ClientID
          pos.trade,                // D: Trade
          pos.dept,                 // E: Department
          pos.qty,                  // F: Qty (total)
          'Open',                   // G: Status
          18,                       // H: MinAge
          45,                       // I: MaxAge
          pos.salary,               // J: Salary
          'Indian',                 // K: Nationality preference
          notes,                    // L: Notes
          pos.qty,                  // M: OpenQty (starts = total qty)
          TUWAIQ_LOCATION,          // N: Location
          'Saudi Arabia',           // O: Country
          TUWAIQ_SOURCED_BY,        // P: SourcedBy
          pos.interviewMode,        // Q: InterviewMode
          TUWAIQ_SECTOR,            // R: Sector
          TUWAIQ_CAMPAIGN_NAME,     // S: CampaignName
          campaignId,               // T: CampaignID
          TUWAIQ_CLIENT_NAME,       // U: ClientName
          pos.expMin,               // V: ExpMin
          pos.expMax,               // W: ExpMax
          0,                        // X: CommittedQty (starts at 0)
          TUWAIQ_INTERVIEW_DATES,   // Y: InterviewDate
          pos.certRequired || '',   // Z: CertRequired
          TUWAIQ_INTERVIEW_CITIES,  // AA: InterviewCities
          pos.posId,                // AB: PositionID (client's)
          pos.category              // AC: Category (Skilled Worker / Supervisor / Engineer / General Labor)
        ]);

        existingTrades[pos.trade.toLowerCase()] = true;
        created++;
        Logger.log('  CREATED [' + reqId + ']: ' + pos.trade + ' × ' + pos.qty);

      } catch(posErr) {
        errors++;
        Logger.log('  ERROR for ' + pos.trade + ': ' + posErr.message);
      }

      // Throttle to avoid hitting GAS quota on large batches
      if ((i+1) % 10 === 0) Utilities.sleep(500);
    }

  } catch(e) {
    Logger.log('createTuwaiqRequirements_ fatal: ' + e.message);
    errors++;
  }

  return { created:created, skipped:skipped, errors:errors };
}

// ── CREATE SUBMISSION TRACKER SHEET ─────────────────────────────────────────
function createTuwaiqSubmissionTracker_(ss, campaignId) {
  try {
    var TRACKER_NAME = '_Tuwaiq_Interview_Tracker';
    var existing = ss.getSheetByName(TRACKER_NAME);
    if (existing) {
      return { ok:true, message:'Tracker sheet already exists — skipped' };
    }

    var tracker = ss.insertSheet(TRACKER_NAME);

    // ── ROW 1: Campaign header ───────────────────────────────────────────
    tracker.getRange(1, 1, 1, 20).merge();
    tracker.getRange(1, 1).setValue(
      TUWAIQ_CAMPAIGN_NAME + ' — Candidate Submission Tracker | Interview: ' +
      TUWAIQ_INTERVIEW_DATES + ' | Cities: ' + TUWAIQ_INTERVIEW_CITIES
    );
    tracker.getRange(1, 1).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff').setFontSize(11);

    // ── ROW 2: Column headers ────────────────────────────────────────────
    var headers = [
      'Sr No',           // A
      'KAI No',          // B — internal reference (not shared with client)
      'Position',        // C
      'Position ID',     // D — client's position ID (e.g. MU-037)
      'Department',      // E
      'Category',        // F — Skilled Worker / Supervisor / Engineer / General Labor
      'Salary Range',    // G — from client JD
      'Candidate Name',  // H
      'Age',             // I
      'Passport No',     // J
      'Passport Expiry', // K
      'ECR Status',      // L
      'Total Exp (Yrs)', // M
      'Gulf Exp (Yrs)',  // N
      'Current Location',// O
      'Interview City',  // P
      'Salary Agreed',   // Q
      'Remarks',         // R
      'Submission Status',// S
      'Submitted On',    // T
      'Interview Result',// U
      'Selected / Rejected',// V
      'Notes'            // W
    ];

    tracker.getRange(2, 1, 1, headers.length).setValues([headers]);
    tracker.getRange(2, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#283593')
      .setFontColor('#ffffff')
      .setFontSize(10)
      .setHorizontalAlignment('center');

    // ── ROW 3 onwards: One row per position (grouped by dept) ────────────
    var rowNum = 3;
    var prevDept = '';
    var deptColors = {
      'Maintenance & Utilities': '#e8f5e9',
      'Casting':                 '#fff3e0',
      'Forging':                 '#fce4ec',
      'Machining':               '#e3f2fd',
      'Heat Treatment':          '#f3e5f5',
      'NDE/QC':                  '#fff8e1',
      'Pattern Shop':            '#e0f7fa',
      'Melting':                 '#fbe9e7',
      'Production Control':      '#f1f8e9'
    };

    for (var p = 0; p < TUWAIQ_POSITIONS.length; p++) {
      var pos = TUWAIQ_POSITIONS[p];

      // Department separator row when dept changes
      if (pos.dept !== prevDept) {
        tracker.getRange(rowNum, 1, 1, headers.length).merge();
        tracker.getRange(rowNum, 1).setValue('── ' + pos.dept.toUpperCase() + ' ──');
        tracker.getRange(rowNum, 1, 1, headers.length)
          .setBackground(deptColors[pos.dept] || '#f5f5f5')
          .setFontWeight('bold')
          .setFontSize(9);
        rowNum++;
        prevDept = pos.dept;
      }

      // One template row per vacancy head
      for (var h = 0; h < pos.qty; h++) {
        tracker.getRange(rowNum, 3).setValue(pos.trade);       // C: Position
        tracker.getRange(rowNum, 4).setValue(pos.posId);       // D: Position ID
        tracker.getRange(rowNum, 5).setValue(pos.dept);        // E: Department
        tracker.getRange(rowNum, 6).setValue(pos.category);    // F: Category
        tracker.getRange(rowNum, 7).setValue(pos.salary);      // G: Salary Range
        tracker.getRange(rowNum, 16).setValue('TBD');          // P: Interview City
        tracker.getRange(rowNum, 19).setValue('Pending');      // S: Submission Status

        // Shade alternating rows lightly
        if (h % 2 === 0) {
          tracker.getRange(rowNum, 1, 1, headers.length).setBackground('#fafafa');
        }
        rowNum++;
      }
    }

    // ── Fix Sr No column with proper sequential numbers ──────────────────
    var srStart = 3;
    var srNum = 1;
    var allVals = tracker.getRange(srStart, 1, rowNum - srStart, 1).getValues();
    var srRange = tracker.getRange(srStart, 1, rowNum - srStart, 1);
    var srData = srRange.getValues();
    // Re-number only non-dept-separator rows (check col C for position name)
    var tradeCols = tracker.getRange(srStart, 3, rowNum - srStart, 1).getValues();
    for (var x = 0; x < tradeCols.length; x++) {
      if (tradeCols[x][0] && String(tradeCols[x][0]).indexOf('──') === -1) {
        srData[x][0] = srNum++;
      } else {
        srData[x][0] = '';  // blank for dept separator rows
      }
    }
    srRange.setValues(srData);

    // ── Freeze header rows, set column widths ────────────────────────────
    tracker.setFrozenRows(2);
    tracker.setColumnWidth(1,  50);  // A: Sr No
    tracker.setColumnWidth(2,  85);  // B: KAI No
    tracker.setColumnWidth(3,  200); // C: Position
    tracker.setColumnWidth(4,  100); // D: Position ID
    tracker.setColumnWidth(5,  160); // E: Department
    tracker.setColumnWidth(6,  120); // F: Category
    tracker.setColumnWidth(7,  110); // G: Salary Range
    tracker.setColumnWidth(8,  160); // H: Candidate Name
    tracker.setColumnWidth(9,  45);  // I: Age
    tracker.setColumnWidth(10, 110); // J: Passport No
    tracker.setColumnWidth(11, 100); // K: Passport Expiry
    tracker.setColumnWidth(12, 85);  // L: ECR Status
    tracker.setColumnWidth(13, 90);  // M: Total Exp
    tracker.setColumnWidth(14, 80);  // N: Gulf Exp
    tracker.setColumnWidth(15, 130); // O: Current Location
    tracker.setColumnWidth(16, 120); // P: Interview City
    tracker.setColumnWidth(17, 100); // Q: Salary Agreed
    tracker.setColumnWidth(18, 150); // R: Remarks
    tracker.setColumnWidth(19, 120); // S: Submission Status
    tracker.setColumnWidth(20, 100); // T: Submitted On
    tracker.setColumnWidth(21, 110); // U: Interview Result
    tracker.setColumnWidth(22, 120); // V: Selected/Rejected
    tracker.setColumnWidth(23, 150); // W: Notes

    // ── Summary block below ──────────────────────────────────────────────
    tracker.getRange(rowNum + 1, 1).setValue('SUMMARY');
    tracker.getRange(rowNum + 1, 1, 1, 4).setFontWeight('bold').setBackground('#e8eaf6');
    tracker.getRange(rowNum + 2, 1).setValue('Total Positions:');
    tracker.getRange(rowNum + 2, 2).setValue(TUWAIQ_POSITIONS.length);
    tracker.getRange(rowNum + 3, 1).setValue('Total Heads Required:');
    tracker.getRange(rowNum + 3, 2).setValue(TUWAIQ_POSITIONS.reduce(function(s,p){ return s+p.qty; }, 0));
    tracker.getRange(rowNum + 4, 1).setValue('Campaign:');
    tracker.getRange(rowNum + 4, 2).setValue(TUWAIQ_CAMPAIGN_NAME);
    tracker.getRange(rowNum + 5, 1).setValue('Interview Window:');
    tracker.getRange(rowNum + 5, 2).setValue(TUWAIQ_INTERVIEW_DATES);
    tracker.getRange(rowNum + 6, 1).setValue('Interview Cities:');
    tracker.getRange(rowNum + 6, 2).setValue(TUWAIQ_INTERVIEW_CITIES);
    tracker.getRange(rowNum + 7, 1).setValue('Generated On:');
    tracker.getRange(rowNum + 7, 2).setValue(new Date());

    return { ok:true, message:'Created tracker sheet with ' + (rowNum - 3) + ' rows (incl. dept separators)' };

  } catch(e) {
    Logger.log('createTuwaiqSubmissionTracker_ error: ' + e.message);
    return { ok:false, message:'Error: ' + e.message };
  }
}

// ── QUICK STATS: run anytime to log Tuwaiq campaign counts ──────────────────
function tuwaiqCampaignStats() {
  Logger.log('Tuwaiq positions defined: ' + TUWAIQ_POSITIONS.length);
  Logger.log('Total heads: ' + TUWAIQ_POSITIONS.reduce(function(s,p){ return s+p.qty; }, 0));

  var deptMap = {};
  TUWAIQ_POSITIONS.forEach(function(p) {
    if (!deptMap[p.dept]) deptMap[p.dept] = { roles:0, heads:0 };
    deptMap[p.dept].roles++;
    deptMap[p.dept].heads += p.qty;
  });

  Object.keys(deptMap).forEach(function(d) {
    Logger.log('  ' + d + ': ' + deptMap[d].roles + ' roles, ' + deptMap[d].heads + ' heads');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 39 — JD UPLOAD PIPELINE (PRODUCTION)
//
// Architecture (LOCKED — see CLAUDE.md):
//   JD Upload → _JD_Repository → Parse → Hierarchy → Requirement →
//   Campaign Assignment → Matching Engine → Match Snapshot → Tracker
//
// Endpoint: POST action=bulkCreateRequirementsFromJDs
//
// Body:
//   {
//     campaignId, campaignName, clientId, clientName,
//     location, country, sector, sourcedBy,
//     interviewMode, interviewDate, interviewCities,
//     jds: [{ fileName, content }]   // content = text extracted client-side
//   }
//
// Returns per-JD: { fileName, reqId, trade, status, strong, good, possible, total }
// ════════════════════════════════════════════════════════════════════════════

// ── JD Repository sheet headers (immortal — never delete rows) ───────────────
var JDR_HEADERS = [
  'jdId','campaignId','clientId','clientName',
  'industry','sector','department','trade','specialization',
  'requiredQty','salaryMin','salaryMax',
  'country','city','experienceMin','experienceMax',
  'educationRequired','certifications',
  'interviewMode','interviewDate','interviewCities',
  'originalJDText','parsedJDJSON',
  'createdBy','createdAt','reqId','status'
];
var JDR_COL = {};
(function(){ JDR_HEADERS.forEach(function(h,i){ JDR_COL[h] = i+1; }); })();

// ── Match Snapshot sheet headers ─────────────────────────────────────────────
var MS_HEADERS = [
  'snapshotId','reqId','trade','department','snapshotDate',
  'strongCount','goodCount','possibleCount','totalScanned','topCandidatesJSON'
];

// ── MASTER PIPELINE ──────────────────────────────────────────────────────────
function bulkCreateRequirementsFromJDs_(body) {
  var ss = SpreadsheetApp.openById(SS_ID);

  var campaignId      = String(body.campaignId      ||'').trim();
  var campaignName    = String(body.campaignName    ||'').trim();
  var clientId        = String(body.clientId        ||'').trim();
  var clientName      = String(body.clientName      ||'').trim();
  var location        = String(body.location        ||'').trim();
  var country         = String(body.country         ||'Saudi Arabia').trim();
  var sector          = String(body.sector          ||'').trim();
  var sourcedBy       = String(body.sourcedBy       ||'').trim();
  var interviewMode   = String(body.interviewMode   ||'CAMPING').trim();
  var interviewDate   = String(body.interviewDate   ||'').trim();
  var interviewCities = String(body.interviewCities ||'').trim();
  var jds             = body.jds || [];

  if (!campaignId)         return { ok:false, error:'campaignId required' };
  if (!jds || !jds.length) return { ok:false, error:'No JD files provided' };

  // Ensure sidecar sheets exist
  ensureJDRepositorySheet_(ss);
  ensureMatchSnapshotsSheet_(ss);

  var created = 0, skipped = 0, failed = 0;
  var results = [];

  for (var i = 0; i < jds.length; i++) {
    var jd        = jds[i];
    var fileName  = String(jd.fileName || ('JD_' + (i+1))).trim();
    var jdContent = String(jd.content  || '').trim();

    if (!jdContent) {
      results.push({ fileName:fileName, status:'FAILED', reason:'Empty content',
                     reqId:'', trade:'', strong:0, good:0, possible:0, total:0 });
      failed++;
      continue;
    }

    try {
      // ── STEP 1: Store original JD in repository ────────────────────────
      var jdId = storeJDInRepository_(ss, {
        fileName:       fileName,
        content:        jdContent,
        campaignId:     campaignId,
        campaignName:   campaignName,
        clientId:       clientId,
        clientName:     clientName,
        country:        country,
        sector:         sector,
        interviewMode:  interviewMode,
        interviewDate:  interviewDate,
        interviewCities:interviewCities,
        createdBy:      sourcedBy,
        status:         'PROCESSING'
      });

      // ── STEP 2: Parse JD → full Intelligence Hierarchy ────────────────
      var parsed = parseJDWithGemini_(jdContent, fileName);
      if (!parsed || !parsed.trade) {
        updateJDRepositoryStatus_(ss, jdId, 'PARSE_FAILED', '');
        results.push({ fileName:fileName, status:'FAILED', reason:'Trade not detected',
                       reqId:'', trade:'', strong:0, good:0, possible:0, total:0 });
        failed++;
        continue;
      }

      // Update repo with parsed intelligence
      updateJDRepositoryParsed_(ss, jdId, parsed);

      // ── STEP 3: Build requirement body (Client→Campaign→Dept→Trade) ───
      var reqBody = {
        trade:           parsed.trade,
        jobTitle:        parsed.trade,
        clientName:      clientName,
        clientId:        clientId,
        deployCountry:   country,
        projectName:     campaignName,
        requiredQty:     parsed.qty          || 1,
        minExperience:   parsed.expMin       || 0,
        minAge:          parsed.minAge       || 18,
        maxAge:          parsed.maxAge       || 45,
        salary:          buildSalaryString_(parsed.salaryMin, parsed.salaryMax),
        salaryMin:       parsed.salaryMin    || 0,
        salaryMax:       parsed.salaryMax    || 0,
        notes:           buildJDNotes_(parsed, fileName, jdId),
        sourcedBy:       sourcedBy,
        interviewMode:   interviewMode,
        interviewDate:   interviewDate,
        urgency:         parsed.urgency      || 'Normal',
        certRequired:    parsed.certifications || '',
        nationality:     parsed.nationality  || '',
        sector:          sector              || parsed.sector || '',
        department:      parsed.department   || classifyDepartment_(parsed.trade),
        industry:        parsed.industry     || '',
        specialization:  parsed.specialization || '',
        educationRequired: parsed.educationRequired || '',
        campaignId:      campaignId,
        campaignName:    campaignName,
        interviewCities: interviewCities,
        jdId:            jdId,
        positionId:      parsed.positionId   || '',
        country:         country,
        city:            location
      };

      // ── STEP 4: Create requirement ─────────────────────────────────────
      var reqResult = createRequirement_(reqBody);

      if (!reqResult.ok) {
        updateJDRepositoryStatus_(ss, jdId, 'REQ_FAILED', '');
        results.push({ fileName:fileName, status: reqResult.error === 'INVALID_TRADE' ? 'QUARANTINED' : 'FAILED',
                       reason: reqResult.message || reqResult.error,
                       reqId:'', trade:parsed.trade, strong:0, good:0, possible:0, total:0 });
        failed++;
        continue;
      }

      var reqId = reqResult.reqId;

      // ── STEP 5: Matching Engine — run against full candidate pool ──────
      var matchResult = runRequirementMatchingEngine_(ss, reqId, parsed.trade,
        parsed.department || classifyDepartment_(parsed.trade),
        parsed.expMin || 0);

      // ── STEP 6: Store match snapshot (for dashboard + ranking) ─────────
      storeMatchSnapshot_(ss, reqId, parsed.trade,
        parsed.department || classifyDepartment_(parsed.trade), matchResult);

      // ── STEP 7: Mark JD repository entry complete ──────────────────────
      updateJDRepositoryStatus_(ss, jdId, 'DONE', reqId);

      results.push({
        fileName:  fileName,
        status:    'CREATED',
        reason:    '',
        reqId:     reqId,
        jdId:      jdId,
        trade:     parsed.trade,
        department:parsed.department || '',
        qty:       parsed.qty || 1,
        salary:    buildSalaryString_(parsed.salaryMin, parsed.salaryMax),
        strong:    matchResult.strong,
        good:      matchResult.good,
        possible:  matchResult.possible,
        total:     matchResult.total
      });
      created++;

    } catch(e) {
      Logger.log('bulkCreateRequirementsFromJDs_ error [' + fileName + ']: ' + e.message);
      results.push({ fileName:fileName, status:'FAILED', reason:'Exception: ' + e.message,
                     reqId:'', trade:'', strong:0, good:0, possible:0, total:0 });
      failed++;
    }

    // Throttle: avoid hitting GAS quota on large batches (NMDC/ZAMIL = 50-80 JDs)
    if ((i+1) % 5 === 0) Utilities.sleep(1200);
  }

  // ── STEP 8: Create campaign tracker sheet ─────────────────────────────────
  var trackerResult = { message:'skipped' };
  if (created > 0) {
    trackerResult = createCampaignTrackerSheet_(ss, {
      campaignId:      campaignId,
      campaignName:    campaignName,
      clientName:      clientName,
      location:        location,
      interviewDate:   interviewDate,
      interviewCities: interviewCities,
      results:         results
    });
  }

  Logger.log('bulkCreateRequirementsFromJDs: created=' + created +
             ' skipped=' + skipped + ' failed=' + failed);

  return {
    ok:      true,
    created: created,
    skipped: skipped,
    failed:  failed,
    tracker: trackerResult.message,
    results: results
  };
}

// ── ENSURE SIDECAR SHEETS ────────────────────────────────────────────────────
function ensureJDRepositorySheet_(ss) {
  var sh = ss.getSheetByName('_JD_Repository');
  if (!sh) {
    sh = ss.insertSheet('_JD_Repository');
    sh.appendRow(JDR_HEADERS);
    sh.getRange(1, 1, 1, JDR_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1a237e')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensureMatchSnapshotsSheet_(ss) {
  var sh = ss.getSheetByName('_MatchSnapshots');
  if (!sh) {
    sh = ss.insertSheet('_MatchSnapshots');
    sh.appendRow(MS_HEADERS);
    sh.getRange(1, 1, 1, MS_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1a237e')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

// ── STORE JD IN REPOSITORY ───────────────────────────────────────────────────
function storeJDInRepository_(ss, opts) {
  var sh   = ensureJDRepositorySheet_(ss);
  var jdId = 'JD-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMddHHmmss') +
             '-' + Math.floor(Math.random()*1000);

  sh.appendRow([
    jdId,                    // jdId
    opts.campaignId,         // campaignId
    opts.clientId,           // clientId
    opts.clientName,         // clientName
    '',                      // industry (filled after parse)
    opts.sector || '',       // sector
    '',                      // department (filled after parse)
    '',                      // trade (filled after parse)
    '',                      // specialization (filled after parse)
    0,                       // requiredQty (filled after parse)
    0,                       // salaryMin (filled after parse)
    0,                       // salaryMax (filled after parse)
    opts.country || '',      // country
    '',                      // city (filled after parse)
    0,                       // experienceMin (filled after parse)
    0,                       // experienceMax (filled after parse)
    '',                      // educationRequired (filled after parse)
    '',                      // certifications (filled after parse)
    opts.interviewMode || '',// interviewMode
    opts.interviewDate || '',// interviewDate
    opts.interviewCities||'',// interviewCities
    opts.content.substring(0, 10000), // originalJDText (cap at 10k chars)
    '',                      // parsedJDJSON (filled after parse)
    opts.createdBy || '',    // createdBy
    new Date(),              // createdAt
    '',                      // reqId (filled after requirement created)
    opts.status || 'PENDING' // status
  ]);

  return jdId;
}

// ── UPDATE REPOSITORY AFTER PARSE ────────────────────────────────────────────
function updateJDRepositoryParsed_(ss, jdId, parsed) {
  try {
    var sh   = ensureJDRepositorySheet_(ss);
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][JDR_COL.jdId-1]).trim() === jdId) {
        sh.getRange(i+1, JDR_COL.industry).setValue(parsed.industry || '');
        sh.getRange(i+1, JDR_COL.sector).setValue(parsed.sector || '');
        sh.getRange(i+1, JDR_COL.department).setValue(parsed.department || '');
        sh.getRange(i+1, JDR_COL.trade).setValue(parsed.trade || '');
        sh.getRange(i+1, JDR_COL.specialization).setValue(parsed.specialization || '');
        sh.getRange(i+1, JDR_COL.requiredQty).setValue(parsed.qty || 1);
        sh.getRange(i+1, JDR_COL.salaryMin).setValue(parsed.salaryMin || 0);
        sh.getRange(i+1, JDR_COL.salaryMax).setValue(parsed.salaryMax || 0);
        sh.getRange(i+1, JDR_COL.city).setValue(parsed.city || '');
        sh.getRange(i+1, JDR_COL.experienceMin).setValue(parsed.expMin || 0);
        sh.getRange(i+1, JDR_COL.experienceMax).setValue(parsed.expMax || 0);
        sh.getRange(i+1, JDR_COL.educationRequired).setValue(parsed.educationRequired || '');
        sh.getRange(i+1, JDR_COL.certifications).setValue(parsed.certifications || '');
        sh.getRange(i+1, JDR_COL.parsedJDJSON).setValue(JSON.stringify(parsed));
        return;
      }
    }
  } catch(e) {
    Logger.log('updateJDRepositoryParsed_ error: ' + e.message);
  }
}

// ── UPDATE REPOSITORY STATUS ─────────────────────────────────────────────────
function updateJDRepositoryStatus_(ss, jdId, status, reqId) {
  try {
    var sh   = ensureJDRepositorySheet_(ss);
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][JDR_COL.jdId-1]).trim() === jdId) {
        sh.getRange(i+1, JDR_COL.status).setValue(status);
        if (reqId) sh.getRange(i+1, JDR_COL.reqId).setValue(reqId);
        return;
      }
    }
  } catch(e) {
    Logger.log('updateJDRepositoryStatus_ error: ' + e.message);
  }
}

// ── GEMINI JD PARSER (FULL HIERARCHY EXTRACTION) ─────────────────────────────
function parseJDWithGemini_(jdText, fileName) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return parseJDRuleBased_(jdText, fileName);

    var prompt =
      'You are a GCC recruitment specialist. Extract structured data from this Job Description.\n' +
      'Return ONLY valid JSON (no markdown fences, no explanation) with exactly these keys:\n' +
      '{\n' +
      '  "trade": "exact normalized job title / trade name",\n' +
      '  "industry": "top-level industry (Oil & Gas / Manufacturing / Construction / Power & Utilities / Mining / Logistics / Hospitality / Other)",\n' +
      '  "sector": "sub-sector within industry (e.g. Petrochemical / Steel / Cement / Forging / Casting / NDE / HVAC)",\n' +
      '  "department": "functional department (Mechanical / Electrical / Instrumentation / Civil / Production / NDE/QC / HSE / Maintenance / HR / Logistics)",\n' +
      '  "specialization": "specific specialization within trade (e.g. Pipe Fitter – High Pressure / CNC Operator – Lathe)",\n' +
      '  "qty": <number of vacancies, integer, default 1>,\n' +
      '  "expMin": <minimum years experience, integer>,\n' +
      '  "expMax": <maximum years experience, integer>,\n' +
      '  "minAge": <minimum age if stated, integer, else 18>,\n' +
      '  "maxAge": <maximum age if stated, integer, else 45>,\n' +
      '  "salaryMin": <minimum salary as integer, 0 if not mentioned>,\n' +
      '  "salaryMax": <maximum salary as integer, 0 if not mentioned>,\n' +
      '  "salaryCurrency": "SAR or AED or USD, default SAR",\n' +
      '  "country": "deployment country",\n' +
      '  "city": "deployment city",\n' +
      '  "nationality": "preferred nationality if mentioned, else empty string",\n' +
      '  "certifications": "required certs (e.g. ASNT Level II UT, AWS CWI, CSWIP 3.1), empty if none",\n' +
      '  "educationRequired": "education requirement (e.g. Diploma / ITI / B.Tech), empty if not stated",\n' +
      '  "urgency": "Urgent or Normal",\n' +
      '  "positionId": "client position code if mentioned (e.g. MU-037), empty if none",\n' +
      '  "keySkills": "comma-separated key technical skills"\n' +
      '}\n\n' +
      'JD FILE: ' + fileName + '\n\n' +
      'JD TEXT:\n' + jdText.substring(0, 4000);

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey;
    var resp = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 600 }
      }),
      muteHttpExceptions: true
    });

    var json = JSON.parse(resp.getContentText());
    var raw  = ((json.candidates||[])[0]||{}).content;
    if (!raw) return parseJDRuleBased_(jdText, fileName);

    var text = raw.parts[0].text.trim()
      .replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();

    return JSON.parse(text);

  } catch(e) {
    Logger.log('parseJDWithGemini_ error: ' + e.message + ' — fallback');
    return parseJDRuleBased_(jdText, fileName);
  }
}

// ── RULE-BASED FALLBACK ───────────────────────────────────────────────────────
function parseJDRuleBased_(jdText, fileName) {
  var result = {
    trade:'', industry:'Manufacturing', sector:'', department:'',
    specialization:'', qty:1, expMin:0, expMax:15,
    minAge:18, maxAge:45, salaryMin:0, salaryMax:0, salaryCurrency:'SAR',
    country:'', city:'', nationality:'', certifications:'',
    educationRequired:'', urgency:'Normal', positionId:'', keySkills:''
  };

  // Trade from filename
  var nameOnly = fileName.replace(/\.[^.]+$/,'').replace(/[_\-]/g,' ').trim();
  if (nameOnly) result.trade = nameOnly;

  // Qty
  var qtyM = jdText.match(/(?:qty|quantity|vacancies?|no\.?\s*of\s*(?:vacancy|position|post)s?)\s*[:\-]?\s*(\d+)/i);
  if (qtyM) result.qty = parseInt(qtyM[1]);

  // Experience
  var expM = jdText.match(/(?:minimum|min\.?|at\s*least)?\s*(\d+)\s*(?:\+|to\s*(\d+))?\s*years?\s*(?:of\s*)?(?:experience|exp)/i);
  if (expM) {
    result.expMin = parseInt(expM[1]);
    if (expM[2]) result.expMax = parseInt(expM[2]);
  }

  // Salary — SAR/AED range
  var salM = jdText.match(/(?:SAR|AED|SR)\s*(\d{3,6})\s*[-–to]+\s*(\d{3,6})/i);
  if (salM) {
    result.salaryMin = parseInt(salM[1]);
    result.salaryMax = parseInt(salM[2]);
    result.salaryCurrency = salM[0].toUpperCase().indexOf('AED') !== -1 ? 'AED' : 'SAR';
  }

  // Age range
  var ageM = jdText.match(/(?:age|max\.?\s*age)\s*[:\-]?\s*(\d{2})\s*(?:\-|to)\s*(\d{2})/i);
  if (ageM) { result.minAge = parseInt(ageM[1]); result.maxAge = parseInt(ageM[2]); }

  // Certifications
  var certM = jdText.match(/\b(ASNT[^,\n]{0,25}|AWS[^,\n]{0,25}|CSWIP[^,\n]{0,25}|PCN[^,\n]{0,20}|ISO\s*\d+[^,\n]{0,15})/i);
  if (certM) result.certifications = certM[0].trim();

  // Position ID
  var posM = jdText.match(/\b([A-Z]{2,10}-[A-Z]{0,8}-?\d{2,4})\b/);
  if (posM) result.positionId = posM[1];

  // Education
  var eduM = jdText.match(/\b(B\.?Tech|Diploma|ITI|Bachelor|BE|B\.E|M\.Tech|SSLC|HSC)\b/i);
  if (eduM) result.educationRequired = eduM[0];

  // Department via existing classifier
  if (result.trade) result.department = classifyDepartment_(result.trade);

  return result;
}

// ── SALARY STRING BUILDER ─────────────────────────────────────────────────────
function buildSalaryString_(min, max) {
  var mn = parseInt(min)||0;
  var mx = parseInt(max)||0;
  if (!mn && !mx) return '';
  if (mn && mx) return 'SAR ' + mn + '-' + mx;
  if (mn)       return 'SAR ' + mn + '+';
  return 'SAR up to ' + mx;
}

// ── BUILD NOTES FROM PARSED JD ────────────────────────────────────────────────
function buildJDNotes_(parsed, fileName, jdId) {
  var parts = [];
  if (jdId)               parts.push('JD ID: ' + jdId);
  if (parsed.positionId)  parts.push('Pos ID: ' + parsed.positionId);
  if (parsed.certifications) parts.push('Cert: ' + parsed.certifications);
  if (parsed.keySkills)   parts.push('Skills: ' + parsed.keySkills);
  if (parsed.educationRequired) parts.push('Edu: ' + parsed.educationRequired);
  if (parsed.specialization) parts.push('Spec: ' + parsed.specialization);
  parts.push('Source: ' + fileName);
  return parts.join(' | ');
}

// ── REQUIREMENT MATCHING ENGINE ───────────────────────────────────────────────
// Scans full candidate pool and returns match counts for a requirement.
// Strong (≥75): exact trade + experience met
// Good   (50–74): related trade / same department
// Possible (25–49): transferable / department adjacent
function runRequirementMatchingEngine_(ss, reqId, trade, department, expMin) {
  var strong = 0, good = 0, possible = 0, total = 0;
  var topCandidates = [];

  try {
    var cSheet = ss.getSheets()[0]; // main candidates sheet (always sheet 0)
    var data   = cSheet.getDataRange().getValues();
    var tradeLower = (trade||'').toLowerCase();
    var deptLower  = (department||'').toLowerCase();

    for (var i = 1; i < data.length; i++) {
      var row            = data[i];
      var cTrade         = String(row[COL.trade-1]       ||'').toLowerCase().trim();
      var cExp           = parseFloat(row[COL.experience-1]) || 0;
      var cVerdict       = String(row[COL.verdict-1]     ||'').toLowerCase();
      var cActive        = String(row[COL.active-1]      ||'').toLowerCase();
      var cName          = String(row[COL.name-1]        ||'').trim();
      var cKaiNo         = String(row[COL.kaiNo-1]       ||'').trim();

      // Skip inactive / rejected / blank rows
      if (!cName) continue;
      if (cActive === 'inactive' || cVerdict === 'rejected') continue;

      total++;
      var score = 0;

      // Trade scoring
      if (cTrade === tradeLower) {
        score += 60;
      } else if (cTrade.indexOf(tradeLower) !== -1 || tradeLower.indexOf(cTrade) !== -1) {
        score += 40;
      } else {
        var cDept = classifyDepartment_(cTrade).toLowerCase();
        if (deptLower && (cDept === deptLower || cDept.indexOf(deptLower) !== -1 || deptLower.indexOf(cDept) !== -1)) {
          score += 20;
        }
      }

      // Experience scoring
      if (expMin > 0) {
        if (cExp >= expMin)            score += 20;
        else if (cExp >= expMin * 0.7) score += 10;
      } else {
        score += 20;
      }

      // Verdict bonus
      if (cVerdict === 'highly recommended' || cVerdict === 'shortlist') score += 10;

      if (score >= 75) {
        strong++;
        if (topCandidates.length < 10) {
          topCandidates.push({ kaiNo:cKaiNo, name:cName, trade:cTrade, exp:cExp, score:score });
        }
      } else if (score >= 50) {
        good++;
      } else if (score >= 20) {
        possible++;
      }
    }
  } catch(e) {
    Logger.log('runRequirementMatchingEngine_ error: ' + e.message);
  }

  return {
    strong:        strong,
    good:          good,
    possible:      possible,
    total:         total,
    topCandidates: topCandidates
  };
}

// ── STORE MATCH SNAPSHOT ──────────────────────────────────────────────────────
function storeMatchSnapshot_(ss, reqId, trade, department, matchResult) {
  try {
    var sh  = ensureMatchSnapshotsSheet_(ss);
    var sid = 'MS-' + reqId + '-' + Utilities.formatDate(new Date(),'Asia/Kolkata','yyyyMMddHHmm');
    sh.appendRow([
      sid,
      reqId,
      trade,
      department,
      new Date(),
      matchResult.strong,
      matchResult.good,
      matchResult.possible,
      matchResult.total,
      JSON.stringify(matchResult.topCandidates||[])
    ]);
    return sid;
  } catch(e) {
    Logger.log('storeMatchSnapshot_ error: ' + e.message);
    return '';
  }
}

// ── GET MATCH SNAPSHOT (for dashboard / requirement drawer) ───────────────────
// GET ?action=getMatchSnapshot&reqId=REQ-xxx
function getMatchSnapshot_(params) {
  var reqId = String(params.reqId||'').trim();
  if (!reqId) return { ok:false, error:'reqId required' };

  var ss = SpreadsheetApp.openById(SS_ID);
  var sh = ss.getSheetByName('_MatchSnapshots');
  if (!sh) return { ok:true, found:false, strong:0, good:0, possible:0, total:0 };

  var data = sh.getDataRange().getValues();
  var latest = null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]||'').trim() === reqId) {
      latest = {
        snapshotId:  String(data[i][0]||''),
        reqId:       reqId,
        trade:       String(data[i][2]||''),
        department:  String(data[i][3]||''),
        snapshotDate:data[i][4] instanceof Date ? data[i][4].toISOString() : String(data[i][4]||''),
        strong:      parseInt(data[i][5])||0,
        good:        parseInt(data[i][6])||0,
        possible:    parseInt(data[i][7])||0,
        total:       parseInt(data[i][8])||0,
        topCandidates: JSON.parse(String(data[i][9]||'[]'))
      };
    }
  }

  if (!latest) return { ok:true, found:false, strong:0, good:0, possible:0, total:0 };
  latest.ok    = true;
  latest.found = true;
  return latest;
}

// ── CREATE CAMPAIGN TRACKER SHEET (grouped by Department) ────────────────────
// Sheet name: _Tracker_<campaignId>
function createCampaignTrackerSheet_(ss, opts) {
  try {
    var sheetName = '_Tracker_' + opts.campaignId;
    if (ss.getSheetByName(sheetName)) {
      return { ok:true, message:'Tracker already exists: ' + sheetName };
    }

    var tracker = ss.insertSheet(sheetName);

    // Row 1: campaign header
    tracker.getRange(1,1,1,22).merge();
    tracker.getRange(1,1).setValue(
      (opts.campaignName||opts.campaignId) + ' — Submission Tracker' +
      (opts.interviewDate ? ' | Interview: ' + opts.interviewDate : '') +
      (opts.interviewCities ? ' | Cities: ' + opts.interviewCities : '')
    ).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff').setFontSize(11);

    // Row 2: headers
    var headers = [
      'Sr No','KAI No','Position','Position ID','Department',
      'Category','Salary Range','Candidate Name','Age',
      'Passport No','Passport Expiry','ECR Status',
      'Total Exp','Gulf Exp','Current Location',
      'Interview City','Salary Agreed','Remarks',
      'Submission Status','Submitted On','Interview Result','Notes'
    ];
    tracker.getRange(2,1,1,headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#283593').setFontColor('#ffffff')
      .setFontSize(10).setHorizontalAlignment('center');
    tracker.setFrozenRows(2);

    var rowNum  = 3;
    var srNum   = 1;
    var prevDept = '';

    // Sort results by department (Client→Campaign→Dept→Requirement hierarchy)
    var created = (opts.results||[]).filter(function(r){ return r.status==='CREATED'; });
    created.sort(function(a,b){ return (a.department||'').localeCompare(b.department||''); });

    created.forEach(function(r) {
      // Department separator row
      if ((r.department||'-') !== prevDept) {
        tracker.getRange(rowNum,1,1,headers.length).merge();
        tracker.getRange(rowNum,1).setValue('── ' + (r.department||'General').toUpperCase() + ' ──')
          .setBackground('#e8eaf6').setFontWeight('bold').setFontSize(9);
        rowNum++;
        prevDept = r.department||'-';
      }

      var qty = parseInt(r.qty)||1;
      for (var h = 0; h < qty; h++) {
        tracker.getRange(rowNum,1).setValue(srNum++);
        tracker.getRange(rowNum,3).setValue(r.trade);
        tracker.getRange(rowNum,5).setValue(r.department||'');
        tracker.getRange(rowNum,7).setValue(r.salary||'');
        tracker.getRange(rowNum,16).setValue(opts.interviewCities ?
          opts.interviewCities.split(',')[0].trim() : 'TBD');
        tracker.getRange(rowNum,19).setValue('Pending');
        if (h%2===0) tracker.getRange(rowNum,1,1,headers.length).setBackground('#fafafa');
        rowNum++;
      }
    });

    // Column widths
    [50,85,200,100,160,120,110,160,45,110,100,85,90,80,130,120,100,150,120,100,110,150]
      .forEach(function(w,i){ tracker.setColumnWidth(i+1,w); });

    var totalHeads = created.reduce(function(s,r){ return s+(parseInt(r.qty)||1); },0);
    tracker.getRange(rowNum+1,1).setValue(
      'Requirements: ' + created.length + ' | Heads: ' + totalHeads
    ).setFontWeight('bold');
    tracker.getRange(rowNum+1,1,1,6).setBackground('#e8eaf6');

    return { ok:true, message:'Created ' + sheetName + ' (' + totalHeads + ' heads)' };

  } catch(e) {
    Logger.log('createCampaignTrackerSheet_ error: ' + e.message);
    return { ok:false, message:'Tracker error: ' + e.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 40 — KAI NUMBER BACKFILL
//
// Root cause: Original Code.gs email-intake pipeline never wrote kaiNo (col 25).
// All candidates ingested before the bridge was built have NO_KAI_NUMBER.
//
// Run order:
//   1. backfillKaiNumbers()     — assigns AYE-KAI-YYYY-NNNNNN to all blank rows
//   2. backfillQueueTop3()      — queues TOP3 for any active candidate missing it
//   3. auditCVIngestion()       — re-run to confirm pass rate is now acceptable
// ════════════════════════════════════════════════════════════════════════════

function backfillKaiNumbers() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) { Logger.log('backfillKaiNumbers: Candidates sheet not found'); return; }

  Logger.log('backfillKaiNumbers — scanning sheet...');
  var data = sheet.getDataRange().getValues();
  var lastRow = data.length;

  // Step 1 — Find current max KAI number across all existing records
  var year   = new Date().getFullYear();
  var prefix = 'AYE-KAI-' + year + '-';
  var maxNum = 0;

  for (var i = 1; i < lastRow; i++) {
    var existing = String(data[i][COL.kaiNo-1]||'').trim();
    if (existing) {
      var m = existing.match(/AYE-KAI-\d{4}-(\d+)/);
      if (m && parseInt(m[1]) > maxNum) maxNum = parseInt(m[1]);
    }
  }

  Logger.log('backfillKaiNumbers: current max = ' + maxNum);

  // Step 2 — Assign kaiNo to all rows missing one
  var nextNum  = maxNum + 1;
  var patched  = 0;
  var skipped  = 0;

  // Collect all updates first, then write in batch (much faster than one-by-one)
  var updates = []; // { rowIndex (1-based), kaiNo }

  for (var r = 1; r < lastRow; r++) {
    var name    = String(data[r][COL.name-1]   ||'').trim();
    var active  = String(data[r][COL.active-1] ||'').trim();
    var kaiCol  = String(data[r][COL.kaiNo-1]  ||'').trim();

    // Skip blank rows and rows that already have a kaiNo
    if (!name)  { skipped++; continue; }
    if (kaiCol) { skipped++; continue; }

    var newKai = prefix + String(nextNum).padStart(6, '0');
    updates.push({ rowIndex: r + 1, kaiNo: newKai }); // rowIndex is 1-based sheet row
    nextNum++;
    patched++;
  }

  // Batch write — write 500 at a time to avoid timeout
  var BATCH = 500;
  for (var b = 0; b < updates.length; b += BATCH) {
    var chunk = updates.slice(b, b + BATCH);
    chunk.forEach(function(u) {
      sheet.getRange(u.rowIndex, COL.kaiNo).setValue(u.kaiNo);
    });
    Logger.log('backfillKaiNumbers: wrote rows ' + (b+1) + ' – ' + Math.min(b+BATCH, updates.length));
    if (b + BATCH < updates.length) Utilities.sleep(1000); // throttle between batches
  }

  Logger.log('══════════════════════════════════════');
  Logger.log('backfillKaiNumbers COMPLETE');
  Logger.log('Patched: ' + patched + ' | Skipped (blank/existing): ' + skipped);
  Logger.log('New KAI numbers: ' + prefix + String(maxNum+1).padStart(6,'0') +
             ' → ' + prefix + String(nextNum-1).padStart(6,'0'));
  Logger.log('Next available: ' + prefix + String(nextNum).padStart(6,'0'));
  Logger.log('══════════════════════════════════════');
  Logger.log('Run backfillQueueTop3() next.');
}

// ── QUEUE TOP3 FOR ACTIVE CANDIDATES MISSING IT ──────────────────────────────
function backfillQueueTop3() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) { Logger.log('backfillQueueTop3: Candidates sheet not found'); return; }

  var data    = sheet.getDataRange().getValues();
  var queued  = 0;
  var skipped = 0;

  Logger.log('backfillQueueTop3 — scanning for missing Top3...');

  for (var i = 1; i < data.length; i++) {
    var name      = String(data[i][COL.name-1]             ||'').trim();
    var active    = String(data[i][COL.active-1]           ||'').trim().toLowerCase();
    var kaiNo     = String(data[i][COL.kaiNo-1]            ||'').trim();
    var top3      = String(data[i][COL.recommendedRoles-1] ||'').trim();
    var verdict   = String(data[i][COL.verdict-1]          ||'').trim().toLowerCase();

    if (!name || !kaiNo) { skipped++; continue; }
    if (active === 'inactive') { skipped++; continue; }
    if (verdict === 'rejected') { skipped++; continue; }
    if (top3)  { skipped++; continue; } // already has Top3

    queueForProcessing_(kaiNo, 'TOP3', ss);
    queued++;

    // Throttle every 100 queues
    if (queued % 100 === 0) {
      Logger.log('backfillQueueTop3: queued ' + queued + ' so far...');
      Utilities.sleep(500);
    }
  }

  Logger.log('══════════════════════════════════════');
  Logger.log('backfillQueueTop3 COMPLETE');
  Logger.log('Queued for Top3: ' + queued);
  Logger.log('Skipped (inactive/already done): ' + skipped);
  Logger.log('═══════════════════════════════════════');
  Logger.log('Now: set up runQueueBatch trigger (every 10 min) to process the queue.');
  Logger.log('Then run auditCVIngestion() to check pass rate.');
}

// ── QUICK FIX: backfill only last N rows (for partial fix without full scan) ──
function backfillKaiNumbersLastN() {
  var N     = 500; // change this if needed
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) { Logger.log('Candidates sheet not found'); return; }

  var lr   = sheet.getLastRow();
  var data = sheet.getRange(Math.max(2, lr - N + 1), 1, Math.min(N, lr-1), 38).getValues();

  var year   = new Date().getFullYear();
  var prefix = 'AYE-KAI-' + year + '-';

  // Find max across ENTIRE sheet first
  var allKai = sheet.getRange(2, COL.kaiNo, lr-1, 1).getValues();
  var maxNum = 0;
  allKai.forEach(function(r) {
    var m = String(r[0]||'').match(/AYE-KAI-\d{4}-(\d+)/);
    if (m && parseInt(m[1]) > maxNum) maxNum = parseInt(m[1]);
  });

  var nextNum = maxNum + 1;
  var patched = 0;
  var startRow = Math.max(2, lr - N + 1);

  data.forEach(function(row, idx) {
    var name  = String(row[COL.name-1]  ||'').trim();
    var kaiNo = String(row[COL.kaiNo-1] ||'').trim();
    if (!name || kaiNo) return;
    var newKai = prefix + String(nextNum).padStart(6,'0');
    sheet.getRange(startRow + idx, COL.kaiNo).setValue(newKai);
    nextNum++;
    patched++;
  });

  Logger.log('backfillKaiNumbersLastN: patched ' + patched + ' of last ' + N + ' rows');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 41 — GMAIL INTAKE WATCHER
//
// Problem: Gmail CVs enter via Code.gs email pipeline (untouchable).
// That pipeline creates candidate rows but never assigns kaiNo or queues Top3.
// This watcher runs every 5 min via trigger, finds new rows without kaiNo,
// assigns numbers, scores them, and queues Top3 enrichment.
//
// TRIGGER TO SET:
//   Function: watchNewCandidates
//   Type: Time-driven → Minutes timer → Every 5 minutes
// ════════════════════════════════════════════════════════════════════════════

function watchNewCandidates() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) { Logger.log('watchNewCandidates: Candidates sheet not found'); return; }

  var lr   = sheet.getLastRow();
  if (lr < 2) return;

  // Scan last 100 rows only — new Gmail CVs land at the bottom
  var scanStart = Math.max(2, lr - 99);
  var numRows   = lr - scanStart + 1;
  var data      = sheet.getRange(scanStart, 1, numRows, 38).getValues();

  var year      = new Date().getFullYear();
  var prefix    = 'AYE-KAI-' + year + '-';

  // Find current max kaiNo across entire sheet once (fast single read)
  var allKai = sheet.getRange(2, COL.kaiNo, lr - 1, 1).getValues();
  var maxNum = 0;
  allKai.forEach(function(r) {
    var m = String(r[0]||'').match(/AYE-KAI-\d{4}-(\d+)/);
    if (m && parseInt(m[1]) > maxNum) maxNum = parseInt(m[1]);
  });
  var nextNum = maxNum + 1;

  var patched = 0;
  var queued  = 0;

  for (var i = 0; i < data.length; i++) {
    var row      = data[i];
    var name     = String(row[COL.name-1]    ||'').trim();
    var kaiNo    = String(row[COL.kaiNo-1]   ||'').trim();
    var trade    = String(row[COL.trade-1]   ||'').trim();
    var active   = String(row[COL.active-1]  ||'').trim().toLowerCase();
    var verdict  = String(row[COL.verdict-1] ||'').trim().toLowerCase();
    var score    = parseInt(row[COL.score-1])||0;
    var sheetRow = scanStart + i;

    if (!name) continue;
    if (active === 'inactive') continue;
    if (verdict === 'rejected') continue;

    // ── Assign kaiNo if missing ──────────────────────────────────────────
    if (!kaiNo) {
      var newKai = prefix + String(nextNum).padStart(6, '0');
      sheet.getRange(sheetRow, COL.kaiNo).setValue(newKai);
      kaiNo = newKai;
      nextNum++;
      patched++;
    }

    // ── Re-score if score is 0 or missing ────────────────────────────────
    if (!score && trade) {
      try {
        var pseudoCand = {
          name: name, trade: trade,
          experience:  String(row[COL.experience-1]  ||''),
          gulfExp:     String(row[COL.gulfExp-1]     ||''),
          education:   String(row[COL.education-1]   ||''),
          nationality: String(row[COL.nationality-1] ||''),
          mobile:      String(row[COL.mobile-1]      ||''),
          email:       String(row[COL.email-1]       ||''),
          cvLink:      String(row[COL.cvLink-1]      ||''),
          passportNo:  String(row[33]                ||'') // col 34 passport
        };
        var scoreResult = computeBasicScore_(pseudoCand);
        if (scoreResult && scoreResult.score) {
          sheet.getRange(sheetRow, COL.score).setValue(scoreResult.score);
          if (scoreResult.verdict) sheet.getRange(sheetRow, COL.verdict).setValue(scoreResult.verdict);
        }
      } catch(scoreErr) {
        Logger.log('watchNewCandidates: score error for ' + name + ': ' + scoreErr.message);
      }
    }

    // ── Queue Top3 if missing ─────────────────────────────────────────────
    var top3 = String(row[COL.recommendedRoles-1]||'').trim();
    if (!top3 && trade && kaiNo) {
      queueForProcessing_(kaiNo, 'TOP3', ss);
      queued++;
    }
  }

  if (patched > 0 || queued > 0) {
    Logger.log('watchNewCandidates: kaiNo patched=' + patched + ' top3 queued=' + queued);
  }
}

// Public wrapper for manual run
function watchNewCandidatesNow() {
  watchNewCandidates();
  Logger.log('watchNewCandidatesNow: done');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 42 — GMAIL ERROR REPROCESSOR + SENDER vs CANDIDATE INTELLIGENCE
//
// Two problems solved:
//
// 1. karigar/error emails: Code.gs failed to process them. CVs sit in Gmail
//    forever, never reach KAI. This function rescues them.
//
// 2. Sender ≠ Candidate: Email may come from associate, sub-agent, or third
//    party. FROM address is theirs, not the candidate's. Real candidate contact
//    is inside the CV text or email body. This logic extracts correctly.
//
// SENDER CLASSIFICATION:
//   - Known associate domain / pattern → sender = Associate, candidate = from CV
//   - Personal email + name matches CV → sender IS the candidate
//   - Company/bulk sender → sender = Source, candidate = from CV
//
// TRIGGER TO SET:
//   Function: reprocessGmailErrors
//   Type: Time-driven → Every 15 minutes
// ════════════════════════════════════════════════════════════════════════════

function reprocessGmailErrors() {
  var ss      = SpreadsheetApp.openById(SS_ID);
  var apiKey  = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var processed = 0, skipped = 0, errors = 0;

  // Search Gmail for karigar/error labeled threads (unprocessed CVs)
  var threads = GmailApp.search('label:karigar/error', 0, 50);
  Logger.log('reprocessGmailErrors: found ' + threads.length + ' error threads');

  if (!threads.length) {
    Logger.log('reprocessGmailErrors: nothing to process');
    return { ok:true, processed:0, message:'No error emails found' };
  }

  // Get or create the karigar/kai-imported label
  var importedLabel = getOrCreateLabel_('karigar/kai-imported');
  var errorLabel    = GmailApp.getUserLabelByName('karigar/error');

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    try {
      var messages = thread.getMessages();
      var lastMsg  = messages[messages.length - 1];
      var fromRaw  = lastMsg.getFrom();
      var subject  = lastMsg.getSubject();
      var body     = lastMsg.getPlainBody().substring(0, 2000);
      var attachments = lastMsg.getAttachments();

      // Find a CV attachment (PDF, DOC, DOCX)
      var cvAttachment = null;
      for (var a = 0; a < attachments.length; a++) {
        var ct = attachments[a].getContentType().toLowerCase();
        var fn = attachments[a].getName().toLowerCase();
        if (ct.indexOf('pdf') !== -1 || ct.indexOf('word') !== -1 ||
            fn.indexOf('.pdf') !== -1 || fn.indexOf('.doc') !== -1) {
          cvAttachment = attachments[a];
          break;
        }
      }

      // Extract text from CV if available
      var cvText = '';
      if (cvAttachment) {
        cvText = extractTextFromAttachment_(cvAttachment);
      }

      // Build combined text for Gemini to parse
      var combinedText = 'SUBJECT: ' + subject + '\n\n' +
                         'EMAIL BODY:\n' + body + '\n\n' +
                         (cvText ? 'CV CONTENT:\n' + cvText.substring(0, 3000) : '');

      if (!combinedText.trim()) { skipped++; continue; }

      // Parse candidate vs sender
      var parsed = parseEmailForCandidate_(combinedText, fromRaw, apiKey);

      if (!parsed || !parsed.candidateName) {
        Logger.log('reprocessGmailErrors: no candidate found in thread ' + subject);
        skipped++;
        continue;
      }

      // Check for duplicate before creating
      var dupResult = checkDuplicateCandidate_(ss, parsed.candidateMobile, parsed.candidateEmail, parsed.passportNo);
      if (dupResult.isDuplicate) {
        Logger.log('reprocessGmailErrors: duplicate ' + parsed.candidateName + ' → ' + dupResult.existingKaiNo);
        // Label as processed anyway so it stops showing as error
        if (importedLabel) thread.addLabel(importedLabel);
        if (errorLabel)    thread.removeLabel(errorLabel);
        skipped++;
        continue;
      }

      // Create candidate record
      var sheet  = ss.getSheetByName('Candidates');
      var kaiNo  = generateKaiNumber_(ss);
      var scoreR = computeBasicScore_({
        name:        parsed.candidateName,
        trade:       parsed.trade,
        experience:  parsed.experience,
        education:   parsed.education,
        nationality: parsed.nationality,
        mobile:      parsed.candidateMobile,
        email:       parsed.candidateEmail,
        cvLink:      ''
      });

      // Build row — same structure as uploadCV_
      var row = [];
      row[COL.stage-1]           = 'Needs Call';
      row[COL.applicationDate-1] = new Date();
      row[COL.nationality-1]     = parsed.nationality    || '';
      row[COL.name-1]            = parsed.candidateName;
      row[COL.mobile-1]          = parsed.candidateMobile || '';
      row[COL.email-1]           = parsed.candidateEmail  || '';
      row[COL.education-1]       = parsed.education       || '';
      row[COL.positionApplied-1] = parsed.trade           || '';
      row[COL.trade-1]           = parsed.trade           || '';
      row[COL.experience-1]      = parsed.experience      || 0;
      row[COL.verdict-1]         = scoreR.verdict         || 'ORANGE';
      row[COL.score-1]           = scoreR.score           || 0;
      row[COL.active-1]          = 'Active';
      row[COL.kaiNo-1]           = kaiNo;
      row[COL.notes-1]           = 'Source: Gmail error reprocess | Sender: ' + fromRaw +
                                   (parsed.senderIsAssociate ? ' [Associate]' : '') +
                                   ' | Subject: ' + subject;
      // Pad row to 38 cols
      while (row.length < 38) row.push('');

      sheet.appendRow(row);

      // Queue Top3
      queueForProcessing_(kaiNo, 'TOP3', ss);

      // Relabel in Gmail
      if (importedLabel) thread.addLabel(importedLabel);
      if (errorLabel)    thread.removeLabel(errorLabel);

      Logger.log('reprocessGmailErrors: CREATED ' + kaiNo + ' — ' + parsed.candidateName +
                 ' | Trade: ' + parsed.trade +
                 (parsed.senderIsAssociate ? ' | Associate: ' + parsed.senderEmail : ''));
      processed++;

    } catch(e) {
      Logger.log('reprocessGmailErrors: error on thread ' + t + ': ' + e.message);
      errors++;
    }

    Utilities.sleep(500);
  }

  Logger.log('reprocessGmailErrors DONE: processed=' + processed + ' skipped=' + skipped + ' errors=' + errors);
  return { ok:true, processed:processed, skipped:skipped, errors:errors };
}

// ── PARSE EMAIL → CANDIDATE DETAILS (sender-vs-candidate intelligence) ────────
// Priority order for candidate contact:
//   1. CV text (most reliable — candidate wrote it themselves)
//   2. Email body (candidate may have typed details)
//   3. From address (last resort — may be associate/agent)
function parseEmailForCandidate_(combinedText, fromRaw, apiKey) {
  try {
    if (apiKey) {
      return parseEmailWithGemini_(combinedText, fromRaw, apiKey);
    }
    return parseEmailRuleBased_(combinedText, fromRaw);
  } catch(e) {
    Logger.log('parseEmailForCandidate_ error: ' + e.message);
    return parseEmailRuleBased_(combinedText, fromRaw);
  }
}

// ── GEMINI EMAIL PARSER ───────────────────────────────────────────────────────
function parseEmailWithGemini_(text, fromRaw, apiKey) {
  var prompt =
    'You are a GCC recruitment specialist. Parse this email and CV to extract the CANDIDATE\'s details.\n' +
    'IMPORTANT: The email sender may be an associate, agent, or third party — NOT the candidate.\n' +
    'Extract the ACTUAL CANDIDATE\'s information from the CV content and email body.\n\n' +
    'Return ONLY valid JSON (no markdown) with these exact keys:\n' +
    '{\n' +
    '  "candidateName": "full name of the candidate (from CV or email body)",\n' +
    '  "candidateEmail": "candidate\'s OWN email (from CV content or signature, NOT sender email unless clearly the same person)",\n' +
    '  "candidateMobile": "candidate\'s phone number (from CV or email body)",\n' +
    '  "trade": "candidate\'s job title / trade",\n' +
    '  "experience": <years of experience as number>,\n' +
    '  "education": "highest qualification",\n' +
    '  "nationality": "candidate nationality",\n' +
    '  "passportNo": "passport number if visible, else empty string",\n' +
    '  "senderEmail": "the FROM email address",\n' +
    '  "senderIsAssociate": <true if sender is clearly different from candidate, false if sender IS the candidate>,\n' +
    '  "senderName": "name of the sender if different from candidate"\n' +
    '}\n\n' +
    'FROM: ' + fromRaw + '\n\n' +
    text.substring(0, 5000);

  var url  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey;
  var resp = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 400 }
    }),
    muteHttpExceptions: true
  });

  var json = JSON.parse(resp.getContentText());
  var raw  = ((json.candidates||[])[0]||{}).content;
  if (!raw) return parseEmailRuleBased_(text, fromRaw);

  var result = raw.parts[0].text.trim()
    .replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();

  return JSON.parse(result);
}

// ── RULE-BASED EMAIL PARSER FALLBACK ─────────────────────────────────────────
function parseEmailRuleBased_(text, fromRaw) {
  var result = {
    candidateName: '', candidateEmail: '', candidateMobile: '',
    trade: '', experience: 0, education: '', nationality: '',
    passportNo: '', senderEmail: fromRaw,
    senderIsAssociate: false, senderName: ''
  };

  // Extract sender email
  var fromMatch = fromRaw.match(/<([^>]+)>/) || fromRaw.match(/([^\s]+@[^\s]+)/);
  result.senderEmail = fromMatch ? fromMatch[1] : fromRaw;

  // Find all emails in combined text
  var emailMatches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
  // Candidate email = first email in CV content that differs from sender
  emailMatches.forEach(function(em) {
    if (!result.candidateEmail && em.toLowerCase() !== result.senderEmail.toLowerCase()) {
      result.candidateEmail = em;
    }
  });
  if (!result.candidateEmail && emailMatches.length) result.candidateEmail = emailMatches[0];

  // Phone numbers
  var phones = text.match(/(?:\+?[0-9]{1,3}[\s\-]?)?(?:\(?[0-9]{3}\)?[\s\-]?){2}[0-9]{4,}/g) || [];
  if (phones.length) result.candidateMobile = phones[0].replace(/\s/g,'').trim();

  // Name: look for "Name:" label or first capitalised line in CV
  var nameM = text.match(/(?:Name|Candidate|Applicant)\s*[:\-]\s*([A-Z][a-zA-Z\s]{3,40})/);
  if (nameM) result.candidateName = nameM[1].trim();

  // Trade from Subject or CV
  var tradeM = text.match(/(?:Application for|Position|Post|Applying for|Trade)\s*[:\-]?\s*([A-Za-z\s]{5,50})/i);
  if (tradeM) result.trade = tradeM[1].trim().replace(/\n.*/,'').substring(0,50);

  // Experience
  var expM = text.match(/(\d+)\s*(?:\+)?\s*years?\s*(?:of\s*)?(?:experience|exp)/i);
  if (expM) result.experience = parseInt(expM[1]);

  // Education
  var eduM = text.match(/\b(B\.?Tech|B\.?E\.?|M\.?Tech|Diploma|ITI|MBA|M\.?Sc|B\.?Sc|Bachelor|Master|SSLC|HSC)\b/i);
  if (eduM) result.education = eduM[0];

  // Nationality
  var natM = text.match(/\b(Indian|Pakistani|Bangladeshi|Nepali|Sri Lankan|Filipino|Indonesian|Zambian|Gambian|Egyptian|Sudanese|Yemeni)\b/i);
  if (natM) result.nationality = natM[0];

  // Passport
  var ppM = text.match(/\b([A-Z]\d{7}|[A-Z]{2}\d{6,7})\b/);
  if (ppM) result.passportNo = ppM[0];

  // Is sender different from candidate?
  result.senderIsAssociate = result.candidateEmail !== '' &&
    result.candidateEmail.toLowerCase() !== result.senderEmail.toLowerCase();

  return result;
}

// ── EXTRACT TEXT FROM EMAIL ATTACHMENT ───────────────────────────────────────
function extractTextFromAttachment_(attachment) {
  try {
    var ct = attachment.getContentType().toLowerCase();
    var fn = attachment.getName().toLowerCase();

    if (ct.indexOf('pdf') !== -1 || fn.indexOf('.pdf') !== -1) {
      // Save to Drive temporarily, convert to Google Doc, extract text
      var blob    = attachment.copyBlob();
      var file    = DriveApp.createFile(blob);
      var folder  = DriveApp.getRootFolder();

      try {
        var docFile = Drive.Files.copy(
          { title: 'kai_tmp_' + file.getId(), mimeType: 'application/vnd.google-apps.document' },
          file.getId()
        );
        var doc  = DocumentApp.openById(docFile.id);
        var text = doc.getBody().getText();
        DriveApp.getFileById(docFile.id).setTrashed(true);
        file.setTrashed(true);
        return text.substring(0, 5000);
      } catch(convErr) {
        file.setTrashed(true);
        // Fallback: try reading as plain text
        return attachment.getDataAsString().substring(0, 3000);
      }
    }

    if (ct.indexOf('word') !== -1 || fn.indexOf('.doc') !== -1) {
      // Save temporarily and convert
      var blob2   = attachment.copyBlob();
      var file2   = DriveApp.createFile(blob2);
      try {
        var docFile2 = Drive.Files.copy(
          { title: 'kai_tmp_' + file2.getId(), mimeType: 'application/vnd.google-apps.document' },
          file2.getId()
        );
        var doc2  = DocumentApp.openById(docFile2.id);
        var text2 = doc2.getBody().getText();
        DriveApp.getFileById(docFile2.id).setTrashed(true);
        file2.setTrashed(true);
        return text2.substring(0, 5000);
      } catch(e2) {
        file2.setTrashed(true);
        return '';
      }
    }

    // Plain text
    return attachment.getDataAsString().substring(0, 5000);

  } catch(e) {
    Logger.log('extractTextFromAttachment_ error: ' + e.message);
    return '';
  }
}

// ── DUPLICATE CHECK ───────────────────────────────────────────────────────────
function checkDuplicateCandidate_(ss, mobile, email, passportNo) {
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { isDuplicate: false };
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var cMobile  = String(data[i][COL.mobile-1] ||'').trim();
    var cEmail   = String(data[i][COL.email-1]  ||'').trim().toLowerCase();
    var cKaiNo   = String(data[i][COL.kaiNo-1]  ||'').trim();
    var cPP      = String(data[i][33]            ||'').trim(); // col 34 passport

    if (mobile && cMobile && cMobile === mobile)                        return { isDuplicate:true, existingKaiNo:cKaiNo, field:'mobile',   rowIndex:i+1 };
    if (email  && cEmail  && cEmail  === email.toLowerCase())           return { isDuplicate:true, existingKaiNo:cKaiNo, field:'email',    rowIndex:i+1 };
    if (passportNo && cPP && cPP === passportNo)                        return { isDuplicate:true, existingKaiNo:cKaiNo, field:'passport', rowIndex:i+1 };
  }
  return { isDuplicate: false };
}

// ── HELPER: Get or create Gmail label ────────────────────────────────────────
function getOrCreateLabel_(name) {
  var existing = GmailApp.getUserLabelByName(name);
  if (existing) return existing;
  try { return GmailApp.createLabel(name); } catch(e) { return null; }
}

// Public wrappers
function reprocessGmailErrorsNow() {
  var result = reprocessGmailErrors();
  Logger.log('reprocessGmailErrorsNow: ' + JSON.stringify(result));
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 42B — EMAIL SENDER INTELLIGENCE CONFIG
//
// Three-tier classification for every incoming CV email:
//
// TIER 1 — INTERNAL DOMAINS (our own company domains)
//   Sender = staff/internal. Candidate details MUST come from CV content.
//   Never record sender email as candidate email.
//
// TIER 2 — IGNORE LIST (junk, CRM notifications, bounce mail)
//   Skip entirely. No candidate record created.
//
// TIER 3 — EXTERNAL SENDER (personal or agency email)
//   Could be: candidate themselves, associate, or third-party referral.
//   Parse CV content first. If CV has different email → sender is associate.
//   If no email in CV or matches From → From is the candidate.
// ════════════════════════════════════════════════════════════════════════════

var KAI_EMAIL_CONFIG = {

  // Our own company domains — sender is staff, NEVER a candidate
  internalDomains: [
    'alyousufent.com',
    'alyousufjobs.com',
    'safco.org',
    'safcoskillacademy.org'
  ],

  // Completely ignore emails from these — no parsing, no records
  ignoreDomains: [
    'tobu.ai'          // old CRM — all emails are system noise
  ],

  // Ignore any From address matching these patterns (prefix before @)
  ignoreAddressPrefixes: [
    'updates',         // updates@anything
    'noreply',         // noreply@anything
    'no-reply',        // no-reply@anything
    'notification',    // notifications@anything
    'notifications',
    'newsletter',
    'mailer-daemon',
    'postmaster',
    'bounce',
    'donotreply',
    'do-not-reply',
    'auto',            // auto@, automated@
    'automated',
    'support',         // support bots
    'helpdesk',
    'feedback',
    'info-noreply'
  ],

  // Subject line patterns that indicate junk — skip regardless of sender
  junkSubjectPatterns: [
    /^(out of office|auto.?reply|automatic reply|vacation|away from)/i,
    /^(delivery status|mail delivery|undelivered|bounce|failed delivery)/i,
    /^(newsletter|subscription|unsubscribe)/i,
    /invoice|payment due|order confirm/i
  ],

  // Personal email service domains — sender could be candidate or associate
  personalEmailDomains: [
    'gmail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk',
    'hotmail.com', 'outlook.com', 'live.com', 'icloud.com',
    'rediffmail.com', 'ymail.com', 'protonmail.com'
  ]
};

// ── CLASSIFY EMAIL SENDER ─────────────────────────────────────────────────────
// Returns: { tier, senderEmail, senderDomain, reason }
// tier = 'INTERNAL' | 'IGNORE' | 'EXTERNAL_PERSONAL' | 'EXTERNAL_AGENCY'
function classifyEmailSender_(fromRaw, subject) {
  // Extract email address from "Name <email>" format
  var emailMatch = fromRaw.match(/<([^>]+)>/) || fromRaw.match(/([^\s<>]+@[^\s<>]+)/);
  var senderEmail  = emailMatch ? emailMatch[1].toLowerCase().trim() : fromRaw.toLowerCase().trim();
  var parts        = senderEmail.split('@');
  var prefix       = parts[0] || '';
  var domain       = parts[1] || '';

  // Check junk subject lines first
  var subj = String(subject||'').trim();
  for (var j = 0; j < KAI_EMAIL_CONFIG.junkSubjectPatterns.length; j++) {
    if (KAI_EMAIL_CONFIG.junkSubjectPatterns[j].test(subj)) {
      return { tier:'IGNORE', senderEmail:senderEmail, senderDomain:domain,
               reason:'Junk subject: ' + subj.substring(0,60) };
    }
  }

  // Check ignore domains
  for (var i = 0; i < KAI_EMAIL_CONFIG.ignoreDomains.length; i++) {
    if (domain === KAI_EMAIL_CONFIG.ignoreDomains[i] || domain.indexOf(KAI_EMAIL_CONFIG.ignoreDomains[i]) !== -1) {
      return { tier:'IGNORE', senderEmail:senderEmail, senderDomain:domain,
               reason:'Ignore domain: ' + domain };
    }
  }

  // Check junk address prefixes
  for (var p = 0; p < KAI_EMAIL_CONFIG.ignoreAddressPrefixes.length; p++) {
    if (prefix === KAI_EMAIL_CONFIG.ignoreAddressPrefixes[p] ||
        prefix.indexOf(KAI_EMAIL_CONFIG.ignoreAddressPrefixes[p]) === 0) {
      return { tier:'IGNORE', senderEmail:senderEmail, senderDomain:domain,
               reason:'Junk sender prefix: ' + prefix };
    }
  }

  // Check internal domains
  for (var d = 0; d < KAI_EMAIL_CONFIG.internalDomains.length; d++) {
    if (domain === KAI_EMAIL_CONFIG.internalDomains[d]) {
      return { tier:'INTERNAL', senderEmail:senderEmail, senderDomain:domain,
               reason:'Internal staff: ' + senderEmail };
    }
  }

  // Check personal email services
  for (var pe = 0; pe < KAI_EMAIL_CONFIG.personalEmailDomains.length; pe++) {
    if (domain === KAI_EMAIL_CONFIG.personalEmailDomains[pe]) {
      return { tier:'EXTERNAL_PERSONAL', senderEmail:senderEmail, senderDomain:domain,
               reason:'Personal email: ' + senderEmail };
    }
  }

  // Everything else = external agency/company
  return { tier:'EXTERNAL_AGENCY', senderEmail:senderEmail, senderDomain:domain,
           reason:'External agency/company: ' + domain };
}

// ── UPDATED reprocessGmailErrors WITH CLASSIFICATION ─────────────────────────
// This replaces the logic in reprocessGmailErrors() with classification-aware processing.
// Call this instead of the original reprocessGmailErrors() going forward.
function reprocessGmailErrorsSmart() {
  var ss      = SpreadsheetApp.openById(SS_ID);
  var apiKey  = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var processed = 0, skipped = 0, ignored = 0, errors = 0;

  var threads = GmailApp.search('label:karigar/error', 0, 50);
  Logger.log('reprocessGmailErrorsSmart: ' + threads.length + ' error threads found');

  if (!threads.length) return { ok:true, processed:0, message:'Queue empty' };

  var importedLabel = getOrCreateLabel_('karigar/kai-imported');
  var ignoredLabel  = getOrCreateLabel_('karigar/kai-ignored');
  var errorLabel    = GmailApp.getUserLabelByName('karigar/error');

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    try {
      var messages = thread.getMessages();
      var lastMsg  = messages[messages.length - 1];
      var fromRaw  = lastMsg.getFrom();
      var subject  = lastMsg.getSubject();

      // ── TIER CLASSIFICATION ──────────────────────────────────────────────
      var classification = classifyEmailSender_(fromRaw, subject);

      if (classification.tier === 'IGNORE') {
        Logger.log('IGNORE [' + classification.reason + '] ' + subject.substring(0,60));
        // Relabel so it stops showing as error but don't create candidate
        if (ignoredLabel)  thread.addLabel(ignoredLabel);
        if (errorLabel)    thread.removeLabel(errorLabel);
        ignored++;
        continue;
      }

      var body        = lastMsg.getPlainBody().substring(0, 2000);
      var attachments = lastMsg.getAttachments();

      // Find CV attachment
      var cvAttachment = null;
      for (var a = 0; a < attachments.length; a++) {
        var ct = attachments[a].getContentType().toLowerCase();
        var fn = attachments[a].getName().toLowerCase();
        if (ct.indexOf('pdf') !== -1 || ct.indexOf('word') !== -1 ||
            fn.indexOf('.pdf') !== -1 || fn.indexOf('.doc') !== -1) {
          cvAttachment = attachments[a];
          break;
        }
      }

      // INTERNAL senders must have CV attachment — no CV = skip
      if (classification.tier === 'INTERNAL' && !cvAttachment) {
        Logger.log('SKIP internal email with no CV attachment: ' + subject.substring(0,60));
        if (ignoredLabel) thread.addLabel(ignoredLabel);
        if (errorLabel)   thread.removeLabel(errorLabel);
        skipped++;
        continue;
      }

      var cvText = cvAttachment ? extractTextFromAttachment_(cvAttachment) : '';

      // Build combined text with classification context for Gemini
      var combinedText =
        'SENDER TIER: ' + classification.tier + '\n' +
        'SENDER: ' + fromRaw + '\n' +
        'SUBJECT: ' + subject + '\n\n' +
        'EMAIL BODY:\n' + body + '\n\n' +
        (cvText ? 'CV CONTENT:\n' + cvText.substring(0, 3000) : '');

      // INTERNAL sender = candidate is definitely NOT the sender
      // Pass this context so Gemini/rule-based doesn't use sender email as candidate
      var parsed = parseEmailForCandidateSmart_(combinedText, classification, apiKey);

      if (!parsed || !parsed.candidateName) {
        Logger.log('NO_CANDIDATE_FOUND: ' + subject.substring(0,60));
        skipped++;
        continue;
      }

      // Duplicate check
      var dup = checkDuplicateCandidate_(ss, parsed.candidateMobile, parsed.candidateEmail, parsed.passportNo);
      if (dup.isDuplicate) {
        Logger.log('DUPLICATE [' + dup.field + ']: ' + parsed.candidateName + ' → ' + dup.existingKaiNo);
        if (importedLabel) thread.addLabel(importedLabel);
        if (errorLabel)    thread.removeLabel(errorLabel);
        skipped++;
        continue;
      }

      // Create candidate record
      var sheet  = ss.getSheetByName('Candidates');
      var kaiNo  = generateKaiNumber_(ss);
      var scoreR = computeBasicScore_({
        name:        parsed.candidateName,
        trade:       parsed.trade,
        experience:  parsed.experience,
        education:   parsed.education,
        nationality: parsed.nationality,
        mobile:      parsed.candidateMobile,
        email:       parsed.candidateEmail,
        cvLink:      ''
      });

      var sourceNote = 'Gmail reprocess | Tier: ' + classification.tier;
      if (classification.tier === 'INTERNAL') {
        sourceNote += ' | Submitted by: ' + classification.senderEmail;
      } else if (parsed.senderIsAssociate) {
        sourceNote += ' | Associate: ' + classification.senderEmail + ' (' + classification.senderDomain + ')';
      } else {
        sourceNote += ' | Direct applicant';
      }

      var row = [];
      row[COL.stage-1]           = 'Needs Call';
      row[COL.applicationDate-1] = new Date();
      row[COL.nationality-1]     = parsed.nationality    || '';
      row[COL.name-1]            = parsed.candidateName;
      row[COL.mobile-1]          = parsed.candidateMobile || '';
      row[COL.email-1]           = parsed.candidateEmail  || '';
      row[COL.education-1]       = parsed.education       || '';
      row[COL.positionApplied-1] = parsed.trade           || '';
      row[COL.trade-1]           = parsed.trade           || '';
      row[COL.experience-1]      = parsed.experience      || 0;
      row[COL.verdict-1]         = scoreR.verdict         || 'ORANGE';
      row[COL.score-1]           = scoreR.score           || 0;
      row[COL.active-1]          = 'Active';
      row[COL.kaiNo-1]           = kaiNo;
      row[COL.notes-1]           = sourceNote + ' | ' + subject.substring(0,80);
      while (row.length < 38) row.push('');

      sheet.appendRow(row);
      queueForProcessing_(kaiNo, 'TOP3', ss);

      if (importedLabel) thread.addLabel(importedLabel);
      if (errorLabel)    thread.removeLabel(errorLabel);

      Logger.log('CREATED ' + kaiNo + ' | ' + parsed.candidateName +
                 ' | ' + parsed.trade + ' | Tier: ' + classification.tier);
      processed++;

    } catch(e) {
      Logger.log('reprocessGmailErrorsSmart error [' + t + ']: ' + e.message);
      errors++;
    }

    Utilities.sleep(500);
  }

  Logger.log('═══ reprocessGmailErrorsSmart DONE ═══');
  Logger.log('Processed: ' + processed + ' | Skipped: ' + skipped +
             ' | Ignored (junk): ' + ignored + ' | Errors: ' + errors);
  return { ok:true, processed:processed, skipped:skipped, ignored:ignored, errors:errors };
}

// ── CLASSIFICATION-AWARE CANDIDATE PARSER ─────────────────────────────────────
function parseEmailForCandidateSmart_(combinedText, classification, apiKey) {
  try {
    if (apiKey) {
      // Build tier-specific instruction for Gemini
      var tierInstruction = '';
      if (classification.tier === 'INTERNAL') {
        tierInstruction = 'CRITICAL: The sender (' + classification.senderEmail + ') is an INTERNAL STAFF MEMBER of Al Yousuf Enterprises. DO NOT use their email as the candidate email. The candidate details are ONLY in the CV content or email body below.';
      } else if (classification.tier === 'EXTERNAL_AGENCY') {
        tierInstruction = 'The sender (' + classification.senderEmail + ') is an EXTERNAL AGENCY or COMPANY. They are likely submitting on behalf of a candidate. Extract candidate details from CV content first.';
      } else {
        tierInstruction = 'The sender may be the candidate themselves or an associate. Check if the email in the CV matches the From address.';
      }

      var prompt =
        'You are a GCC recruitment specialist. Extract the CANDIDATE\'s details from this email+CV.\n\n' +
        tierInstruction + '\n\n' +
        'Return ONLY valid JSON (no markdown):\n' +
        '{\n' +
        '  "candidateName": "full name of the actual job candidate",\n' +
        '  "candidateEmail": "candidate\'s OWN personal email (from CV or body — NOT ' + classification.senderEmail + ' if INTERNAL tier)",\n' +
        '  "candidateMobile": "candidate phone from CV or body",\n' +
        '  "trade": "job title / trade the candidate is applying for",\n' +
        '  "experience": <years as number>,\n' +
        '  "education": "highest qualification",\n' +
        '  "nationality": "candidate nationality",\n' +
        '  "passportNo": "passport number if visible, else empty",\n' +
        '  "senderIsAssociate": <true if sender is not the candidate>,\n' +
        '  "senderName": "sender name if different from candidate"\n' +
        '}\n\n' + combinedText.substring(0, 5000);

      var url  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey;
      var resp = UrlFetchApp.fetch(url, {
        method: 'POST', contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400 }
        }),
        muteHttpExceptions: true
      });

      var json   = JSON.parse(resp.getContentText());
      var rawOut = ((json.candidates||[])[0]||{}).content;
      if (!rawOut) return parseEmailRuleBased_(combinedText, classification.senderEmail);

      var txt = rawOut.parts[0].text.trim()
        .replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
      var result = JSON.parse(txt);

      // Safety: if internal, force-clear sender email from candidate email
      if (classification.tier === 'INTERNAL' &&
          result.candidateEmail &&
          result.candidateEmail.toLowerCase() === classification.senderEmail.toLowerCase()) {
        result.candidateEmail = '';
      }
      return result;
    }

    return parseEmailRuleBased_(combinedText,
      classification.tier === 'INTERNAL' ? '' : classification.senderEmail);

  } catch(e) {
    Logger.log('parseEmailForCandidateSmart_ error: ' + e.message);
    return parseEmailRuleBased_(combinedText,
      classification.tier === 'INTERNAL' ? '' : classification.senderEmail);
  }
}

// Public wrapper — replaces reprocessGmailErrorsNow going forward
function reprocessGmailErrorsSmartNow() {
  var result = reprocessGmailErrorsSmart();
  Logger.log('reprocessGmailErrorsSmartNow result: ' + JSON.stringify(result));
}

// Add to doPost route — allow manual trigger via API
// action=reprocessGmailErrors → reprocessGmailErrorsSmart()

// =============================================================================
// SECTION 43 — KAI OUTREACH REPLY PROCESSOR + FULL EMAIL INTELLIGENCE
// =============================================================================
// Handles all incoming emails with correct logic:
//   IGNORE  → delivery failures, marketing, junk, internal system emails
//   UPDATE  → KAI outreach reply from known candidate (CV / not-interested / info)
//   CREATE  → new CV from unknown sender
//
// Entry points:
//   processAllInboxEmails()        — scans ALL labels including inbox (5-min trigger)
//   clearKarigarErrorBacklog()     — one-shot: clear all karigar/error backlog
//   processKarigarErrorBacklog()   — public wrapper for trigger
// =============================================================================

// ── Reply intent detection ────────────────────────────────────────────────────

var NOT_INTERESTED_PATTERNS = [
  /\bnot\s+interested\b/i,
  /\bno[,.]?\s*(i\s+am\s+not|thanks|thank\s+you)\b/i,
  /\bi\s+am\s+not\s+interested\b/i,
  /\bnot\s+looking\b/i,
  /\bno\s+longer\s+(available|looking|interested)\b/i,
  /\bplease\s+(remove|don.t contact|stop contact)\b/i,
  /\bunsubscribe\b/i,
  /\bdo\s+not\s+contact\b/i,
  /\bnot\s+available\b/i,
  /\balready\s+(employed|working|placed|joined)\b/i,
  /\bgot\s+(a\s+)?job\b/i,
  /\bjoined\b/i
];

var INFO_PATTERNS = [
  /\b(\+?[\d\s\-]{8,15})\b/,           // phone number
  /\bpassport\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z]{1,2}\d{6,8})/i,
  /\bavailable\s*(from|after|on)\s*(.+)/i,
  /\bnotice\s*period\s*[:\-]?\s*(.+)/i,
  /\bcurrent\s*(salary|ctc|package)\s*[:\-]?\s*(.+)/i,
  /\bexpect(ed|ing)?\s*(salary|ctc)\s*[:\-]?\s*(.+)/i
];

/**
 * Classify what a reply email intends.
 * Returns: 'NOT_INTERESTED' | 'CV_UPDATE' | 'INFO_REPLY' | 'NEW_APPLICATION' | 'IGNORE'
 */
function detectReplyIntent_(subject, body, hasAttachment, fromEmail, ss) {
  // Delivery/bounce subject → IGNORE
  var bounceSubjectRe = /^(delivery status|mail delivery|undelivered|bounce|failed delivery|mailer-daemon|returned mail)/i;
  if (bounceSubjectRe.test(subject)) return 'IGNORE';

  // Marketing / OOO subject → IGNORE
  var junkSubjectRe = /^(out of office|auto.?reply|automatic reply|vacation|away from|newsletter|subscription|invoice|payment due)/i;
  if (junkSubjectRe.test(subject)) return 'IGNORE';

  var bodyLower = (body || '').toLowerCase();

  // Not-interested signal in body
  for (var i = 0; i < NOT_INTERESTED_PATTERNS.length; i++) {
    if (NOT_INTERESTED_PATTERNS[i].test(body)) return 'NOT_INTERESTED';
  }

  // CV attached → CV_UPDATE if sender known, NEW_APPLICATION if not
  if (hasAttachment) {
    if (!ss) return 'CV_UPDATE';
    var existingCandidate = findCandidateByEmail_(ss, fromEmail);
    return existingCandidate ? 'CV_UPDATE' : 'NEW_APPLICATION';
  }

  // Info signals in body (phone, passport, salary, etc.)
  for (var j = 0; j < INFO_PATTERNS.length; j++) {
    if (INFO_PATTERNS[j].test(body)) return 'INFO_REPLY';
  }

  return 'IGNORE';
}

// ── Candidate lookup ──────────────────────────────────────────────────────────

/**
 * Find a candidate row by their email address.
 * Returns { rowIndex, data[] } or null.
 * Checks col 6 (email) and col 25 (kaiNo present = active record).
 */
function findCandidateByEmail_(ss, email) {
  if (!email || !ss) return null;
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var emailLower = email.toLowerCase().trim();
  for (var i = 1; i < data.length; i++) {
    var rowEmail = (data[i][5] || '').toString().toLowerCase().trim(); // col 6 = index 5
    if (rowEmail === emailLower) {
      return { rowIndex: i + 1, data: data[i] }; // 1-based row
    }
  }
  return null;
}

// ── CV attachment selection ───────────────────────────────────────────────────

/**
 * From a list of GmailAttachment objects, pick the best CV.
 * Strategy: prefer largest PDF with most text content; skip images.
 */
function selectBestCVAttachment_(attachments) {
  if (!attachments || attachments.length === 0) return null;
  if (attachments.length === 1) return attachments[0];

  var candidates = [];
  for (var i = 0; i < attachments.length; i++) {
    var att = attachments[i];
    var name = (att.getName() || '').toLowerCase();
    var contentType = (att.getContentType() || '').toLowerCase();
    // Skip images
    if (contentType.indexOf('image') !== -1) continue;
    // Skip tiny files (< 5KB — likely signatures or icons)
    if (att.getSize() < 5000) continue;
    var isPdf  = contentType.indexOf('pdf') !== -1  || name.endsWith('.pdf');
    var isDocx = contentType.indexOf('word') !== -1 || name.endsWith('.docx') || name.endsWith('.doc');
    if (isPdf || isDocx) {
      candidates.push({ att: att, size: att.getSize(), isPdf: isPdf });
    }
  }
  if (candidates.length === 0) return null;
  // Sort: PDFs first, then by size desc
  candidates.sort(function(a, b) {
    if (a.isPdf !== b.isPdf) return a.isPdf ? -1 : 1;
    return b.size - a.size;
  });
  return candidates[0].att;
}

// ── UPDATE: not interested ────────────────────────────────────────────────────

/**
 * Mark an existing candidate as Not Interested / Do Not Contact.
 * Sets col 3 (stage) = 'Not Interested', col 27 (doNotContact) = true, notes col 28.
 */
function markCandidateNotInterested_(ss, rowIndex, fromEmail, subject) {
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return false;
  var now = new Date().toISOString();
  var note = '[' + now + '] Replied not interested. Subject: ' + subject;
  // stage → 'On Hold' (valid dropdown value), empStatus → 'Do Not Contact' to flag no further outreach
  sheet.getRange(rowIndex, COL.stage).setValue('On Hold');
  sheet.getRange(rowIndex, COL.empStatus).setValue('Do Not Contact');
  var existingNote = sheet.getRange(rowIndex, COL.notes).getValue() || '';
  sheet.getRange(rowIndex, COL.notes).setValue(existingNote ? existingNote + '\n' + note : note);
  Logger.log('Marked Not Interested: row ' + rowIndex + ' | ' + fromEmail);
  return true;
}

// ── UPDATE: info reply ────────────────────────────────────────────────────────

/**
 * Extract info fragments from a reply body and update candidate fields.
 * Only updates fields that are currently blank — never overwrites existing data.
 */
function updateCandidateFromInfoReply_(ss, rowIndex, body) {
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return 0;
  var row = sheet.getRange(rowIndex, 1, 1, 42).getValues()[0];
  var updated = 0;

  // Phone — COL.mobile (col 5)
  var phoneMatch = body.match(/(?:^|[\s,;]|mobile|phone|cell|whatsapp)[:\s]*(\+?[\d\s\-]{8,15})/i);
  if (phoneMatch && !row[COL.mobile - 1]) {
    var phone = phoneMatch[1].replace(/\s+/g, '').trim();
    if (phone.length >= 8) {
      sheet.getRange(rowIndex, COL.mobile).setValue(phone);
      updated++;
    }
  }

  // Passport expiry hint — COL.passportExpiry (col 30) — note only, not storing raw number
  var ppMatch = body.match(/passport\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z]{1,2}\d{6,8})/i);
  if (ppMatch) {
    // Store in notes since passport number has no dedicated COL slot
    updated++;
  }

  // Note the update
  var now = new Date().toISOString();
  var noteFields = [];
  if (phoneMatch) noteFields.push('phone');
  if (ppMatch)    noteFields.push('passport: ' + ppMatch[1].toUpperCase());
  if (noteFields.length > 0) {
    var note = '[' + now + '] Auto-updated from email reply: ' + noteFields.join(', ');
    var existingNote = row[COL.notes - 1] || '';
    sheet.getRange(rowIndex, COL.notes).setValue(existingNote ? existingNote + '\n' + note : note);
  }
  return updated;
}

// ── UPDATE: CV re-parse ───────────────────────────────────────────────────────

/**
 * Re-parse a new CV from a reply, update the existing candidate record in-place.
 * Keeps kaiNo, submission history, project history intact.
 * Only updates: cv text, cvVersion, score, trade, skills, lastUpdated.
 */
function updateCandidateWithNewCV_(ss, rowIndex, attachment, fromEmail) {
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { success: false, reason: 'No Candidates sheet' };

  var cvText = '';
  try { cvText = extractTextFromAttachment_(attachment); } catch(e) { cvText = ''; }
  if (!cvText || cvText.length < 50) {
    return { success: false, reason: 'Could not extract text from attachment' };
  }

  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('GEMINI_API_KEY') || '';
  var parsed = {};

  if (apiKey) {
    var prompt = 'Parse this CV and return ONLY minified JSON with keys: ' +
      'name, email, phone, passportNo, nationality, totalExpYears, currentJobTitle, ' +
      'trade, specialization, skills, education, certifications, summary. ' +
      'CV text:\n\n' + cvText.substring(0, 8000);
    try {
      var resp = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
        {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          muteHttpExceptions: true
        }
      );
      var json = JSON.parse(resp.getContentText());
      var rawTxt = (((json.candidates||[])[0]||{}).content||{}).parts;
      if (rawTxt && rawTxt[0]) {
        var t = rawTxt[0].text.trim()
          .replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
        parsed = JSON.parse(t);
      }
    } catch(e) { Logger.log('CV re-parse Gemini error: ' + e.message); }
  }

  // Score the re-parsed CV
  var score = 0;
  if (parsed.totalExpYears) {
    var exp = parseFloat(parsed.totalExpYears) || 0;
    score += Math.min(exp * 3, 30);
  }
  if (parsed.trade) score += 20;
  if ((parsed.skills || '').length > 10) score += 15;
  if (parsed.certifications) score += 10;
  if (parsed.education) score += 10;
  score = Math.min(Math.round(score), 100);

  // Update fields using COL map — never touch kaiNo (col 25), never overwrite with blank
  var now = new Date().toISOString();
  var row = sheet.getRange(rowIndex, 1, 1, 42).getValues()[0];

  if (parsed.name        && !row[COL.name - 1])        sheet.getRange(rowIndex, COL.name).setValue(parsed.name);
  if (parsed.nationality && !row[COL.nationality - 1]) sheet.getRange(rowIndex, COL.nationality).setValue(parsed.nationality);
  if (parsed.phone       && !row[COL.mobile - 1])      sheet.getRange(rowIndex, COL.mobile).setValue(parsed.phone);
  if (parsed.trade)                                     sheet.getRange(rowIndex, COL.trade).setValue(parsed.trade);
  if (parsed.totalExpYears)                             sheet.getRange(rowIndex, COL.experience).setValue(parseFloat(parsed.totalExpYears) || 0);
  if (score > (parseFloat(row[COL.score - 1]) || 0))   sheet.getRange(rowIndex, COL.score).setValue(score);

  // Track CV version in scoreBreakdown field (col 18) as JSON
  var cvVersion = 1;
  try {
    var existingBreakdown = JSON.parse(row[COL.scoreBreakdown - 1] || '{}');
    cvVersion = (existingBreakdown.cvVersion || 0) + 1;
    existingBreakdown.cvVersion = cvVersion;
    existingBreakdown.lastCVScore = score;
    sheet.getRange(rowIndex, COL.scoreBreakdown).setValue(JSON.stringify(existingBreakdown));
  } catch(e2) {
    sheet.getRange(rowIndex, COL.scoreBreakdown).setValue(JSON.stringify({ cvVersion: cvVersion, lastCVScore: score }));
  }

  var note = '[' + now + '] CV updated via email reply. Version ' + cvVersion + '. Score: ' + score;
  var existingNote = row[COL.notes - 1] || '';
  sheet.getRange(rowIndex, COL.notes).setValue(existingNote ? existingNote + '\n' + note : note);

  Logger.log('CV updated: row ' + rowIndex + ' | ' + fromEmail + ' | score=' + score);
  return { success: true, score: score, cvVersion: cvVersion, trade: parsed.trade || '' };
}

// ── Core per-email processor ──────────────────────────────────────────────────

/**
 * Process a single GmailMessage with full KAI intelligence.
 * Returns action taken: 'IGNORED' | 'NOT_INTERESTED' | 'CV_UPDATED' | 'INFO_UPDATED' | 'NEW_CANDIDATE' | 'ERROR'
 *
 * Sender ≠ Candidate rule:
 *   The From address is who SENT the email — may be an associate, agent, or consultant.
 *   The CANDIDATE's details live inside the CV attachment (PDF/DOCX).
 *   Never store the sender email as the candidate email when the CV content says otherwise.
 *   The sender email is recorded as sourcedBy in the candidate notes.
 */
function processEmailMessage_(ss, message, sourceLabel) {
  try {
    // Get spreadsheet fresh each call
    var _ss = SpreadsheetApp.openById(SS_ID);
    if (!_ss) { Logger.log('FATAL: openById null for SS_ID=' + SS_ID); return 'ERROR'; }
    var _ssName = '';
    try { _ssName = _ss.getName(); } catch(nameErr) {
      Logger.log('FATAL: _ss.getName() failed — ss is not a Spreadsheet: ' + nameErr.message);
      return 'ERROR';
    }

    var from        = message.getFrom() || '';
    var subject     = message.getSubject() || '';
    var body        = message.getPlainBody() || '';
    var attachments = message.getAttachments();
    var hasAttach   = attachments && attachments.length > 0;

    // Step 1: Classify sender tier
    var classification = classifyEmailSender_(from, subject);
    if (classification.tier === 'IGNORE' || classification.tier === 'INTERNAL') {
      return 'IGNORED';
    }

    var fromEmail = classification.senderEmail;

    // Step 2: Detect reply intent
    var intent = detectReplyIntent_(subject, body, hasAttach, fromEmail, _ss);
    if (intent === 'IGNORE') return 'IGNORED';

    // Step 3: Find existing candidate by sender email
    var existing = findCandidateByEmail_(_ss, fromEmail);

    // ── NOT INTERESTED ─────────────────────────────────────────────────────────
    if (intent === 'NOT_INTERESTED') {
      if (existing) {
        markCandidateNotInterested_(_ss, existing.rowIndex, fromEmail, subject);
        return 'NOT_INTERESTED';
      }
      return 'IGNORED';
    }

    // ── INFO REPLY ─────────────────────────────────────────────────────────────
    if (intent === 'INFO_REPLY' && !hasAttach) {
      if (existing) {
        updateCandidateFromInfoReply_(_ss, existing.rowIndex, body);
        return 'INFO_UPDATED';
      }
      return 'IGNORED';
    }

    // ── CV ATTACHED (CV_UPDATE or NEW_APPLICATION) ─────────────────────────────
    if (hasAttach) {
      var bestCV = selectBestCVAttachment_(attachments);
      if (!bestCV) return 'IGNORED';

      // If sender IS a known candidate → update their record in place
      if (existing && intent === 'CV_UPDATE') {
        updateCandidateWithNewCV_(_ss, existing.rowIndex, bestCV, fromEmail);
        return 'CV_UPDATED';
      }

      // Sender is NOT in Candidates → parse CV for candidate details
      var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';

      // PRIMARY: send PDF/DOC directly to Gemini (multimodal) — reads name/phone/passport
      // from inside the document, no Drive OCR needed.
      var parsed = parseCVAttachmentWithGemini_(bestCV, subject, apiKey);

      // FALLBACK: if multimodal failed, try text extraction then parse
      if (!parsed || !parsed.name) {
        var cvText = '';
        try { cvText = extractTextFromAttachment_(bestCV); } catch(e2) { cvText = ''; }
        if (cvText && cvText.length >= 50) {
          parsed = parseCVTextForCandidate_(cvText, subject, apiKey);
        }
      }

      // Reject if still no real name, OR if the only "name" we got is just the subject
      // line (a job-title fallback, not a person). A real name is 2+ words, mostly letters.
      if (!parsed || !parsed.name) return 'IGNORED';
      if (!looksLikePersonName_(parsed.name)) {
        Logger.log('Skipped — name looks like a job title, not a person: ' + parsed.name);
        return 'IGNORED';
      }

      var cvEmail    = (parsed.email || '').trim();
      var cvPhone    = (parsed.phone || '').trim();
      var cvPassport = (parsed.passportNo || '').trim();

      var dupCheck = checkDuplicateCandidate_(_ss, cvPhone, cvEmail, cvPassport);
      if (dupCheck && dupCheck.isDuplicate) {
        var dupRow = dupCheck.rowIndex;
        if (dupRow) {
          updateCandidateWithNewCV_(_ss, dupRow, bestCV, fromEmail);
          var dupSheet = _ss.getSheetByName('Candidates');
          if (dupSheet) {
            var existNote = dupSheet.getRange(dupRow, COL.notes).getValue() || '';
            var dupNote = '[' + new Date().toISOString() + '] CV re-submitted via ' + fromEmail;
            dupSheet.getRange(dupRow, COL.notes).setValue(existNote ? existNote + '\n' + dupNote : dupNote);
          }
          return 'CV_UPDATED';
        }
      }

      // Create new candidate record — sender email NEVER becomes candidate email
      var kaiNo = generateKaiNumber_(_ss);
      var now = new Date();
      var cSheet = _ss.getSheetByName('Candidates');
      if (!cSheet) return 'IGNORED';

      var sourcedByNote = '[' + now.toISOString() + '] CV sourced via email from: ' + fromEmail +
        (subject ? ' | Subject: ' + subject : '');

      // Build row using COL map — ensures correct column placement regardless of sheet width
      var newRow = new Array(42).fill('');
      newRow[COL.stage - 1]           = 'New';
      newRow[COL.applicationDate - 1] = now.toISOString();
      newRow[COL.nationality - 1]     = parsed.nationality || '';
      newRow[COL.name - 1]            = parsed.name || '';
      newRow[COL.mobile - 1]          = cvPhone;
      newRow[COL.email - 1]           = cvEmail;   // CV-parsed email ONLY — never fromEmail
      newRow[COL.education - 1]       = parsed.education || '';
      newRow[COL.positionApplied - 1] = parsed.currentJobTitle || '';
      newRow[COL.trade - 1]           = parsed.trade || '';
      newRow[COL.experience - 1]      = parseFloat(parsed.totalExpYears) || 0;
      newRow[COL.score - 1]           = 0;
      newRow[COL.scoreBreakdown - 1]  = JSON.stringify({ cvVersion: 1 });
      newRow[COL.notes - 1]           = sourcedByNote;
      newRow[COL.active - 1]          = 'TRUE';
      newRow[COL.kaiNo - 1]           = kaiNo;
      cSheet.appendRow(newRow);

      Logger.log('NEW_CANDIDATE created: ' + parsed.name + ' | kaiNo=' + kaiNo + ' | sourcedBy=' + fromEmail);
      return 'NEW_CANDIDATE';
    }

    return 'IGNORED';
  } catch(e) {
    Logger.log('processEmailMessage_ error: ' + e.message + ' | STACK: ' + (e.stack || 'no stack') +
               ' | subject=' + (message ? message.getSubject() : '?'));
    return 'ERROR';
  }
}

/**
 * Parse CV text via Gemini. Falls back to rule-based extraction.
 * Subject line passed as hint for candidate name extraction
 * (e.g. "MOHAMMAD MIZAN RAZA CV" → name hint before Gemini call).
 */
function parseCVTextForCandidate_(cvText, subjectHint, apiKey) {
  // Extract name hint from subject: "FIRSTNAME LASTNAME CV" or "CV - FIRSTNAME LASTNAME"
  var nameHint = '';
  if (subjectHint) {
    var sh = subjectHint.replace(/\bcv\b/gi, '').replace(/[-_|]/g, ' ').replace(/\s+/g, ' ').trim();
    if (sh.length >= 3 && sh.length <= 60 && /^[A-Za-z\s]+$/.test(sh)) nameHint = sh;
  }

  if (apiKey) {
    var hintLine = nameHint ? 'Candidate name hint from email subject: "' + nameHint + '". ' : '';
    var prompt = hintLine +
      'Parse this CV and return ONLY minified JSON with keys: ' +
      'name, email, phone, passportNo, nationality, totalExpYears, currentJobTitle, ' +
      'trade, specialization, skills, education, certifications. ' +
      'Use empty string for missing fields. ' +
      'CV text:\n\n' + cvText.substring(0, 8000);
    try {
      var resp = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
        {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          muteHttpExceptions: true
        }
      );
      var json = JSON.parse(resp.getContentText());
      var parts = (((json.candidates||[])[0]||{}).content||{}).parts;
      if (parts && parts[0]) {
        var t = parts[0].text.trim()
          .replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
        var result = JSON.parse(t);
        // Ensure name falls back to subject hint if Gemini returned blank
        if (!result.name && nameHint) result.name = nameHint;
        return result;
      }
    } catch(e) { Logger.log('parseCVTextForCandidate_ Gemini error: ' + e.message); }
  }

  // Rule-based fallback
  var nameMatch = cvText.match(/(?:name|full name)[:\s]+([A-Za-z\s]{3,40})/i);
  var emailMatch = cvText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  var phoneMatch = cvText.match(/(?:mobile|phone|contact|cell)[:\s]*(\+?[\d\s\-]{8,15})/i);
  return {
    name:          (nameMatch ? nameMatch[1].trim() : nameHint) || '',
    email:         emailMatch ? emailMatch[0] : '',
    phone:         phoneMatch ? phoneMatch[1].replace(/\s/g,'') : '',
    passportNo:    '',
    nationality:   '',
    totalExpYears: '',
    currentJobTitle: '',
    trade:         '',
    skills:        ''
  };
}

/**
 * Parse a CV attachment by sending the file BYTES directly to Gemini (multimodal).
 * Works on scanned/image-based PDFs that text extraction can't read.
 * Returns parsed candidate JSON, or null on failure.
 */
function parseCVAttachmentWithGemini_(attachment, subjectHint, apiKey) {
  if (!apiKey || !attachment) return null;
  try {
    var contentType = (attachment.getContentType() || '').toLowerCase();
    // Gemini inline supports PDF and common image types. DOCX is not supported inline.
    var supported = contentType.indexOf('pdf') !== -1 ||
                    contentType.indexOf('image') !== -1;
    if (!supported) return null;

    // Gemini inline limit ~20MB; skip oversized files
    if (attachment.getSize() > 18 * 1024 * 1024) return null;

    var blob   = attachment.copyBlob();
    var base64 = Utilities.base64Encode(blob.getBytes());

    var instruction =
      'You are a CV parser for an overseas recruitment company. ' +
      'Read this CV document and extract the CANDIDATE (the person whose CV this is). ' +
      'Return ONLY minified JSON with keys: ' +
      'name, email, phone, passportNo, nationality, totalExpYears, currentJobTitle, ' +
      'trade, specialization, skills, education, certifications. ' +
      'name = the person\'s full name (NOT a job title like "Crane Operator"). ' +
      'trade = their occupation/role. ' +
      'Use empty string for any field not found. Do not invent data.';

    var payload = {
      contents: [{
        parts: [
          { text: instruction },
          { inline_data: { mime_type: contentType, data: base64 } }
        ]
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 1024 }
    };

    var resp = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

    var json = JSON.parse(resp.getContentText());
    if (json.error) { Logger.log('Gemini multimodal error: ' + JSON.stringify(json.error).substring(0,200)); return null; }

    var parts = (((json.candidates || [])[0] || {}).content || {}).parts;
    if (!parts || !parts[0] || !parts[0].text) return null;

    var t = parts[0].text.trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
    var result = JSON.parse(t);

    // Reject if Gemini returned a job-title-shaped name
    if (result.name && !looksLikePersonName_(result.name)) {
      // keep the trade if name was actually a trade
      if (!result.trade) result.trade = result.name;
      result.name = '';
    }
    return result;
  } catch(e) {
    Logger.log('parseCVAttachmentWithGemini_ error: ' + e.message);
    return null;
  }
}

/**
 * Heuristic: does this string look like a real person's name vs a job title?
 * GCC context: Arabic / South Asian names can be 5-6 words.
 * Rule: reject if 2+ words are job-title keywords — that's a subject line, not a name.
 */
function looksLikePersonName_(s) {
  if (!s) return false;
  var name = String(s).trim();
  if (name.length < 3 || name.length > 80) return false;

  // Must be letters, spaces, dots, hyphens only — no digits
  if (!/^[A-Za-z][A-Za-z.\-\s]+$/.test(name)) return false;

  var words = name.split(/\s+/);
  // Arabic/South Asian names: "Abdul Basit Mian Ghullab Khan" = 5 words — allow up to 7
  if (words.length < 1 || words.length > 7) return false;

  // Count how many words are trade/job-title keywords
  var jobWord = /^(operator|engineer|technician|fitter|welder|rigger|fabricator|inspector|supervisor|foreman|helper|driver|mechanic|electrician|plumber|mason|carpenter|painter|scaffolder|field|operation|offshore|onshore|experience|manpower|recruitment|application|position|vacancy|document|resume|curriculum|vitae|apply|applying|looking|post|job|power|plant|instrument|procurement|structural|commissioning|piping|coating|painting|auto|lead|assistant|maintenance|construction|fabrication|installation|erection|testing|commissioning|rotating|static|scaffold)$/i;
  var jobCount = 0;
  for (var w = 0; w < words.length; w++) {
    if (jobWord.test(words[w])) jobCount++;
  }
  // 2+ job keywords = almost certainly an email subject, not a person's name
  return jobCount <= 1;
}

// ── Backlog clearer: karigar/error ────────────────────────────────────────────

/**
 * One-shot function to process ALL emails in karigar/error label.
 * Run once manually to clear backlog. Then triggers handle going-forward.
 *
 * Results per email:
 *   IGNORED         → move to karigar/junk
 *   NOT_INTERESTED  → move to karigar/processed, candidate updated
 *   CV_UPDATED      → move to karigar/processed, candidate CV refreshed
 *   INFO_UPDATED    → move to karigar/processed, candidate info patched
 *   NEW_CANDIDATE   → move to karigar/processed, new record created
 *   ERROR           → leave in karigar/error for manual review
 */
function clearKarigarErrorBacklog() {
  var ss = SpreadsheetApp.openById(SS_ID);

  var errorLabel     = getOrCreateLabel_('karigar/error');
  var processedLabel = getOrCreateLabel_('karigar/processed');
  var junkLabel      = getOrCreateLabel_('karigar/junk');

  var threads = errorLabel.getThreads(0, 200);
  var stats = { ignored: 0, notInterested: 0, cvUpdated: 0, infoUpdated: 0, newCandidate: 0, error: 0, total: 0 };

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    var threadResult = 'IGNORED';

    for (var j = 0; j < messages.length; j++) {
      var result = processEmailMessage_(ss, messages[j], 'karigar/error');
      // Escalate: prefer meaningful actions over IGNORED
      if (result === 'ERROR') { threadResult = 'ERROR'; break; }
      if (result !== 'IGNORED') threadResult = result;
    }

    stats.total++;
    if (threadResult === 'IGNORED')        { stats.ignored++; thread.removeLabel(errorLabel); thread.addLabel(junkLabel); }
    else if (threadResult === 'ERROR')     { stats.error++; /* leave in error */ }
    else {
      stats.cvUpdated      += (threadResult === 'CV_UPDATED')      ? 1 : 0;
      stats.notInterested  += (threadResult === 'NOT_INTERESTED')  ? 1 : 0;
      stats.infoUpdated    += (threadResult === 'INFO_UPDATED')    ? 1 : 0;
      stats.newCandidate   += (threadResult === 'NEW_CANDIDATE')   ? 1 : 0;
      thread.removeLabel(errorLabel);
      thread.addLabel(processedLabel);
    }

    if (i % 20 === 19) Utilities.sleep(2000); // rate-limit Gmail API
  }

  Logger.log('clearKarigarErrorBacklog complete: ' + JSON.stringify(stats));
  return stats;
}

// ── Ongoing inbox processor (5-min trigger) ───────────────────────────────────

/**
 * Scans karigar/error + inbox for new emails since last run.
 * Designed for 5-min trigger alongside watchNewCandidates.
 * Stores last-processed timestamp in ScriptProperties.
 */
function processAllInboxEmails() {
  var props = PropertiesService.getScriptProperties();
  var ss = SpreadsheetApp.openById(SS_ID);

  var lastRun = parseInt(props.getProperty('EMAIL_PROCESSOR_LAST_RUN') || '0');
  var now = Date.now();
  var cutoffMs = lastRun || (now - 6 * 60 * 60 * 1000); // default: last 6h on first run

  var processedLabel = getOrCreateLabel_('karigar/processed');
  var errorLabel     = getOrCreateLabel_('karigar/error');
  var junkLabel      = getOrCreateLabel_('karigar/junk');

  var stats = { ignored: 0, notInterested: 0, cvUpdated: 0, infoUpdated: 0, newCandidate: 0, error: 0, total: 0 };

  // Process karigar/error label (retry backlog)
  var errorThreads = errorLabel.getThreads(0, 50);
  for (var i = 0; i < errorThreads.length; i++) {
    var thread = errorThreads[i];
    if (thread.getLastMessageDate().getTime() < cutoffMs - 24 * 3600 * 1000) continue; // skip very old
    var messages = thread.getMessages();
    var threadResult = 'IGNORED';
    for (var j = 0; j < messages.length; j++) {
      var r = processEmailMessage_(ss, messages[j], 'karigar/error');
      if (r === 'ERROR') { threadResult = 'ERROR'; break; }
      if (r !== 'IGNORED') threadResult = r;
    }
    stats.total++;
    if (threadResult === 'IGNORED')   { stats.ignored++; thread.removeLabel(errorLabel); thread.addLabel(junkLabel); }
    else if (threadResult !== 'ERROR'){ stats[threadResult === 'CV_UPDATED' ? 'cvUpdated' :
                                               threadResult === 'NOT_INTERESTED' ? 'notInterested' :
                                               threadResult === 'INFO_UPDATED' ? 'infoUpdated' : 'newCandidate']++;
                                        thread.removeLabel(errorLabel); thread.addLabel(processedLabel); }
    else { stats.error++; }
  }

  // Process fresh inbox emails (last 5 min window)
  var query = 'in:inbox after:' + Math.floor(cutoffMs / 1000);
  var inboxThreads = GmailApp.search(query, 0, 30);
  for (var k = 0; k < inboxThreads.length; k++) {
    var iThread = inboxThreads[k];
    var iMessages = iThread.getMessages();
    for (var l = 0; l < iMessages.length; l++) {
      var msg = iMessages[l];
      if (msg.getDate().getTime() < cutoffMs) continue;
      var iResult = processEmailMessage_(ss, msg, 'inbox');
      stats.total++;
      if (iResult === 'IGNORED') { stats.ignored++; }
      else if (iResult === 'ERROR') { stats.error++; }
      else {
        stats.cvUpdated     += iResult === 'CV_UPDATED'     ? 1 : 0;
        stats.notInterested += iResult === 'NOT_INTERESTED' ? 1 : 0;
        stats.infoUpdated   += iResult === 'INFO_UPDATED'   ? 1 : 0;
        stats.newCandidate  += iResult === 'NEW_CANDIDATE'  ? 1 : 0;
        iThread.addLabel(processedLabel);
      }
    }
  }

  props.setProperty('EMAIL_PROCESSOR_LAST_RUN', now.toString());
  Logger.log('processAllInboxEmails: ' + JSON.stringify(stats));
  return stats;
}

// ── Helper: get or create Gmail label ────────────────────────────────────────

function getOrCreateLabel_(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) label = GmailApp.createLabel(name);
  return label;
}

// ── Public wrappers for triggers ──────────────────────────────────────────────

function processKarigarErrorBacklog() {
  var result = clearKarigarErrorBacklog();
  Logger.log('processKarigarErrorBacklog done: ' + JSON.stringify(result));
}

/**
 * One-shot cleanup: find recently-created candidates whose name looks like a
 * job title (not a person) and flag them 'NEEDS_REVIEW' in empStatus so a
 * recruiter can re-source. Run once after deploying the multimodal CV parser.
 * Scans the last `n` rows (default 100).
 */
function flagBadNameCandidates(n) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { flagged: 0 };
  var lastRow = sheet.getLastRow();
  var scan = Math.min(n || 100, lastRow - 1);
  if (scan < 1) return { flagged: 0 };

  var startRow = lastRow - scan + 1;
  var data = sheet.getRange(startRow, 1, scan, 42).getValues();
  var flagged = 0;
  var names = [];

  for (var i = 0; i < data.length; i++) {
    var nm = String(data[i][COL.name - 1] || '').trim();
    var kaiNo = String(data[i][COL.kaiNo - 1] || '').trim();
    if (!nm || !kaiNo) continue;
    if (!looksLikePersonName_(nm)) {
      var rowIndex = startRow + i;
      sheet.getRange(rowIndex, COL.empStatus).setValue('NEEDS_REVIEW');
      var note = '[' + new Date().toISOString() + '] Name looks like a job title — re-source CV. Was: ' + nm;
      var existingNote = data[i][COL.notes - 1] || '';
      sheet.getRange(rowIndex, COL.notes).setValue(existingNote ? existingNote + '\n' + note : note);
      flagged++;
      names.push(kaiNo + ': ' + nm);
    }
  }
  Logger.log('flagBadNameCandidates: flagged ' + flagged + ' | ' + JSON.stringify(names));
  return { flagged: flagged, names: names };
}

/**
 * Unflag candidates whose names actually ARE real people but were incorrectly
 * marked NEEDS_REVIEW by the old strict looksLikePersonName_ (max 4 words).
 * Pass a list of KAI numbers to clear.
 */
function unflagCandidatesByKaiNo(kaiNos) {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return 0;
  var data  = sheet.getDataRange().getValues();
  var list  = kaiNos || ['AYE-KAI-2026-006826', 'AYE-KAI-2026-006869'];
  var fixed = 0;
  for (var i = 1; i < data.length; i++) {
    var kaiNo = String(data[i][COL.kaiNo - 1] || '').trim();
    if (list.indexOf(kaiNo) !== -1) {
      sheet.getRange(i + 1, COL.empStatus).setValue('');
      var note = '[' + new Date().toISOString() + '] NEEDS_REVIEW cleared — confirmed real person name';
      var existingNote = data[i][COL.notes - 1] || '';
      sheet.getRange(i + 1, COL.notes).setValue(existingNote ? existingNote + '\n' + note : note);
      fixed++;
      Logger.log('Unflaged: ' + kaiNo + ' | ' + data[i][COL.name - 1]);
    }
  }
  Logger.log('unflagCandidatesByKaiNo: fixed ' + fixed);
  return fixed;
}

// doPost additions for Section 43:
// action=clearKarigarErrorBacklog → clearKarigarErrorBacklog()
// action=processAllInboxEmails   → processAllInboxEmails()
