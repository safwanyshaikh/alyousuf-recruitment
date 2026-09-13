// ============================================================
// KAI SPRINT 1 — GAS API BRIDGE UPDATE
// File: Replace getCandidates_() and doGet() in KAI-API-Bridge
// New capabilities:
//   • kaiNo, passportNo, ECR/ECNR, location, gccMobility
//   • confidenceTier (STRONG/GOOD/POSSIBLE/REVIEW)
//   • pagination (?page=1&limit=50)
//   • server-side filters (?stage=Shortlisted&trade=Welder&...)
//   • global search (?q=ravish+kumar)
// ============================================================

// ── COLUMN MAP (matches Code.gs CONFIG.inputColumns + extCol + extCol2) ──
var COL = {
  // Standard cols (1-based → use col-1 for 0-based array access)
  stage:          1,
  applicationDate:2,
  nationality:    3,
  name:           4,
  mobile:         5,
  email:          6,
  education:      7,
  positionApplied:8,
  trade:          9,
  industry:       10,
  experience:     11,
  gulfExp:        12,
  dob:            13,
  age:            14,
  verdict:        15,
  flags:          16,
  score:          17,
  scoreBreakdown: 18,
  recommendedRoles:19,
  kaiAssessment:  20,
  recruiterAction:21,
  cvLink:         22,
  notes:          23,
  active:         24,
  // extCol v2 (cols 25-38)
  kaiNo:          25,
  currentLocation:26,
  empStatus:      27,
  candidateState: 28,
  mobility:       29,
  passportExpiry: 30,
  ecrStatus:      31,
  noticeDays:     32,
  medicalStatus:  33,
  deployScore:    34,
  missingFields:  35,
  lastContact:    36,
  reqMatch:       37,
  timeline:       38,
  // extCol2 v282 (cols 39-42)
  educationEnum:  39,
  techReview:     40,
  reviewedBy:     41,
  top3Positions:  42
};

// ── CONFIDENCE TIER ──────────────────────────────────────────
function getConfidenceTier_(score) {
  if (score >= 75) return 'STRONG';
  if (score >= 55) return 'GOOD';
  if (score >= 35) return 'POSSIBLE';
  return 'REVIEW';
}

// ── GCC MOBILITY CLASSIFICATION ──────────────────────────────
// Derives mobility from gulfExp text (existing column, no new column needed)
function classifyGCCMobility_(gulfExpText, currentLocationText) {
  var text = (String(gulfExpText||'') + ' ' + String(currentLocationText||'')).toLowerCase();
  
  if (!text.trim() || text.trim() === 'na' || text.trim() === 'nil') {
    return 'INDIA_AVAILABLE';
  }
  
  // Check current/recent location for local transfer potential
  var loc = String(currentLocationText||'').toLowerCase();
  
  // Check Gulf text for current employment clues
  var isCurrentGulf = /current|present|working|employed|ongoing|till date|till now/i.test(gulfExpText);
  
  if (/saudi|ksa|riyadh|jeddah|dammam|jubail|yanbu|aramco|sabic/i.test(text) && isCurrentGulf)
    return 'SAUDI_LOCAL';
  if (/\buae\b|dubai|abu dhabi|sharjah|ajman|adnoc|emaar/i.test(text) && isCurrentGulf)
    return 'UAE_LOCAL';
  if (/qatar|doha|qatarenergy|ras laffan/i.test(text) && isCurrentGulf)
    return 'QATAR_LOCAL';
  if (/kuwait|kuwait city/i.test(text) && isCurrentGulf)
    return 'KUWAIT_LOCAL';
  if (/bahrain|manama/i.test(text) && isCurrentGulf)
    return 'BAHRAIN_LOCAL';
  if (/oman|muscat|sohar|salalah|pdo/i.test(text) && isCurrentGulf)
    return 'OMAN_LOCAL';
  
  // Has Gulf experience but not currently there
  if (/saudi|ksa|uae|dubai|qatar|kuwait|bahrain|oman|gcc|gulf/i.test(text))
    return 'GCC_TRANSFERABLE';
  
  return 'INDIA_AVAILABLE';
}

// ── EDUCATION PARSER ─────────────────────────────────────────
// Splits "Degree in Mechanical Engineering" → { level: "Degree", subject: "Mechanical Engineering" }
function parseEducation_(rawEdu) {
  var s = String(rawEdu||'').trim();
  if (!s) return { level: '', subject: '' };
  
  var levelMap = [
    { key: /\bphd\b|\bdoctorate\b/i,          level: 'PhD' },
    { key: /\bmaster|mba|m\.?tech|m\.?e\b/i,  level: 'Masters' },
    { key: /\bdegree|bachelor|b\.?tech|b\.?e\b|b\.?sc/i, level: 'Degree' },
    { key: /\bdiploma\b/i,                     level: 'Diploma' },
    { key: /\biti\b|\bcertificate\b|\bcertification\b/i, level: 'ITI / Certificate' },
    { key: /\bhigh school|10\+2|12th|intermediate/i,     level: 'High School' },
    { key: /\bmatriculation|ssc|10th/i,        level: 'Matriculation' },
  ];
  
  var level = '';
  for (var i = 0; i < levelMap.length; i++) {
    if (levelMap[i].key.test(s)) { level = levelMap[i].level; break; }
  }
  
  // Subject = remove degree keyword, clean up
  var subject = s
    .replace(/degree in|diploma in|b\.?tech in|b\.?e in|bachelor of|master of|iti in/gi, '')
    .replace(/\bpassed\b|\bcompleted\b/gi, '')
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, '');
  
  if (!level) {
    // If we can't classify, put full text in subject
    return { level: '', subject: s.slice(0, 60) };
  }
  
  return { level: level, subject: subject.slice(0, 80) };
}

// ── PASSPORT NUMBER EXTRACTOR ────────────────────────────────
// Indian passport numbers: 1 letter + 7 digits (e.g. E4147854)
// Try to extract from kaiAssessment or notes text
function extractPassportNo_(kaiText, notesText) {
  var text = String(kaiText||'') + ' ' + String(notesText||'');
  var m = text.match(/\b([A-Z]\d{7})\b/);
  return m ? m[1] : '';
}

// ── FORMAT TOP 3 POSITIONS ───────────────────────────────────
// Input: "QA QC Lead Inspector, Welding Inspector, Coating Inspector"
// Output: { first: "QA QC Lead Inspector", rest: ["Welding Inspector", "Coating Inspector"], count: 3 }
function parseTop3Positions_(raw) {
  if (!raw) return { first: '', rest: [], count: 0 };
  var parts = String(raw).split(/[,\n|]/).map(function(p){ return p.trim(); }).filter(Boolean);
  return {
    first: parts[0] || '',
    rest:  parts.slice(1),
    count: parts.length,
    full:  parts
  };
}

// ── UPDATED doGet ────────────────────────────────────────────
// Replace the existing doGet in KAI-API-Bridge project with this
function doGet(e) {
  var params   = e && e.parameter ? e.parameter : {};
  var action   = params.action   || 'candidates';
  var token    = params.token    || '';
  var out;

  try {
    // Login — no token required
    if (action === 'login') {
      out = JSON.stringify(handleLogin_(params.email||'', params.password||''));
      return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
    }

    // All other actions require valid token
    if (!isTokenValid_(token)) {
      out = JSON.stringify({ ok: false, error: 'Unauthorized' });
      return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
    }

    if      (action === 'candidates')    out = JSON.stringify(getCandidates_(params));
    else if (action === 'candidate')     out = JSON.stringify(getSingleCandidate_(params));
    else if (action === 'requirements')  out = JSON.stringify(getRequirements_());
    else if (action === 'metrics')       out = JSON.stringify(getMetrics_());
    else if (action === 'sac')           out = JSON.stringify(getSacPerformance_());
    else if (action === 'search')        out = JSON.stringify(globalSearch_(params));
    else if (action === 'match')         out = JSON.stringify(getMatchedCandidates_(params));
    else                                 out = JSON.stringify({ ok: false, error: 'Unknown action' });

  } catch(err) {
    out = JSON.stringify({ ok: false, error: err.message });
  }

  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

// ── UPDATED getCandidates_ ───────────────────────────────────
// Supports: ?page=1&limit=50&stage=X&trade=X&nationality=X&
//           gccMobility=X&scoreMin=X&scoreMax=X&verdict=X&q=search
function getCandidates_(params) {
  params = params || {};
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, records: [], total: 0 };

  var lr   = sheet.getLastRow();
  var lc   = Math.min(sheet.getLastColumn(), 42);
  var data = sheet.getRange(2, 1, lr - 1, lc).getValues();

  // ── Parse filter params ──────────────────────────────────
  var filterStage       = String(params.stage       ||'').trim().toLowerCase();
  var filterTrade       = String(params.trade       ||'').trim().toLowerCase();
  var filterNationality = String(params.nationality ||'').trim().toLowerCase();
  var filterGCC         = String(params.gccMobility ||'').trim().toUpperCase();
  var filterVerdict     = String(params.verdict     ||'').trim().toLowerCase();
  var filterScoreMin    = parseInt(params.scoreMin  ||'0')  || 0;
  var filterScoreMax    = parseInt(params.scoreMax  ||'100')|| 100;
  var filterSearch      = String(params.q           ||'').trim().toLowerCase();
  var page              = Math.max(1, parseInt(params.page  ||'1')  || 1);
  var limit             = Math.min(200, parseInt(params.limit||'100')|| 100);

  var records = [];

  data.forEach(function(row, i) {
    // Skip inactive / archived
    var active = String(row[COL.active-1]||'').toUpperCase().trim();
    if (active === 'SUPERSEDED' || active === 'ARCHIVED') return;

    var name  = String(row[COL.name-1]||'').trim();
    var email = String(row[COL.email-1]||'').trim();
    if (!name && !email) return;

    var score   = parseInt(row[COL.score-1]) || 0;
    var stage   = String(row[COL.stage-1]||'').trim();
    var trade   = String(row[COL.trade-1]||'').trim();
    var nat     = String(row[COL.nationality-1]||'').trim();
    var verdict = String(row[COL.verdict-1]||'').trim();
    var gulfExp = String(row[COL.gulfExp-1]||'').trim();
    var loc     = String(row[COL.currentLocation-1]||'').trim();

    // ── Apply filters ─────────────────────────────────────
    if (filterStage       && stage.toLowerCase().indexOf(filterStage) < 0) return;
    if (filterTrade       && trade.toLowerCase().indexOf(filterTrade) < 0) return;
    if (filterNationality && nat.toLowerCase().indexOf(filterNationality) < 0) return;
    if (filterVerdict     && verdict.toLowerCase().indexOf(filterVerdict) < 0) return;
    if (score < filterScoreMin || score > filterScoreMax) return;

    var gccMobility = classifyGCCMobility_(gulfExp, loc);
    if (filterGCC && gccMobility !== filterGCC) return;

    // ── Search filter ─────────────────────────────────────
    if (filterSearch) {
      var kaiNo   = String(row[COL.kaiNo-1]||'');
      var mobile  = String(row[COL.mobile-1]||'').replace(/^'/,'');
      var pos     = String(row[COL.positionApplied-1]||'');
      var kai     = String(row[COL.kaiAssessment-1]||'');
      var ppNo    = extractPassportNo_(kai, String(row[COL.notes-1]||''));
      var searchableText = [name, kaiNo, mobile, email, ppNo, trade, pos, 
                            String(row[COL.educationEnum-1]||''), nat].join(' ').toLowerCase();
      if (searchableText.indexOf(filterSearch) < 0) return;
    }

    // ── Build record ──────────────────────────────────────
    var kaiAssessmentFull = String(row[COL.kaiAssessment-1]||'').trim();
    var education         = parseEducation_(String(row[COL.education-1]||''));
    var top3              = parseTop3Positions_(String(row[COL.top3Positions-1]||''));
    var ppExpRaw          = row[COL.passportExpiry-1];
    var ppExp             = ppExpRaw instanceof Date ? ppExpRaw : null;
    var ppStatus          = 'Unknown';
    if (ppExp && !isNaN(ppExp)) {
      var mLeft = (ppExp - new Date()) / (1000*60*60*24*30);
      ppStatus  = mLeft > 6 ? 'Valid' : (mLeft > 0 ? '<6mo' : 'Expired');
    }
    var appDt = row[COL.applicationDate-1];

    records.push({
      rowIndex:         i + 2,
      kaiNo:            String(row[COL.kaiNo-1]||'').trim(),
      name:             name,
      nationality:      nat,
      age:              parseInt(row[COL.age-1]) || 0,
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
      educationLevel:   education.level,
      educationSubject: education.subject,
      mobile:           String(row[COL.mobile-1]||'').replace(/^'/,'').trim(),
      email:            email,
      cvLink:           String(row[COL.cvLink-1]||'').trim(),
      kaiAssessment:    kaiAssessmentFull,           // full text (for drawer)
      kaiSnippet:       kaiAssessmentFull.slice(0,150), // truncated (for list if needed)
      applicationDate:  appDt instanceof Date ?
                          Utilities.formatDate(appDt,'Asia/Kolkata','yyyy-MM-dd') : '',
      passportStatus:   ppStatus,
      passportExpiry:   ppExp ? Utilities.formatDate(ppExp,'Asia/Kolkata','yyyy-MM-dd') : '',
      passportNo:       extractPassportNo_(kaiAssessmentFull, String(row[COL.notes-1]||'')),
      ecrStatus:        String(row[COL.ecrStatus-1]||'').trim(),
      missingFields:    String(row[COL.missingFields-1]||'').trim(),
      deployScore:      parseInt(row[COL.deployScore-1]) || 0,
      top3Positions:    top3,
      flags:            String(row[COL.flags-1]||'').trim(),
      recruiterAction:  String(row[COL.recruiterAction-1]||'').trim(),
      notes:            String(row[COL.notes-1]||'').trim().slice(0, 200),
    });
  });

  // ── Pagination ────────────────────────────────────────────
  var total  = records.length;
  var start  = (page - 1) * limit;
  var paged  = records.slice(start, start + limit);

  return {
    ok:         true,
    records:    paged,
    total:      total,
    page:       page,
    limit:      limit,
    totalPages: Math.ceil(total / limit)
  };
}

// ── getSingleCandidate_ ──────────────────────────────────────
// ?action=candidate&rowIndex=5
function getSingleCandidate_(params) {
  var rowIndex = parseInt(params.rowIndex||'0');
  if (!rowIndex) return { ok: false, error: 'rowIndex required' };
  
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet) return { ok: false, error: 'Sheet not found' };

  var lc  = Math.min(sheet.getLastColumn(), 42);
  var row = sheet.getRange(rowIndex, 1, 1, lc).getValues()[0];

  var gulfExp  = String(row[COL.gulfExp-1]||'').trim();
  var loc      = String(row[COL.currentLocation-1]||'').trim();
  var score    = parseInt(row[COL.score-1]) || 0;
  var edu      = parseEducation_(String(row[COL.education-1]||''));
  var top3     = parseTop3Positions_(String(row[COL.top3Positions-1]||''));
  var appDt    = row[COL.applicationDate-1];
  var ppExpRaw = row[COL.passportExpiry-1];
  var ppExp    = ppExpRaw instanceof Date ? ppExpRaw : null;
  var kaiText  = String(row[COL.kaiAssessment-1]||'').trim();

  return {
    ok:               true,
    rowIndex:         rowIndex,
    kaiNo:            String(row[COL.kaiNo-1]||'').trim(),
    name:             String(row[COL.name-1]||'').trim(),
    nationality:      String(row[COL.nationality-1]||'').trim(),
    age:              parseInt(row[COL.age-1]) || 0,
    dob:              row[COL.dob-1] instanceof Date ?
                        Utilities.formatDate(row[COL.dob-1],'Asia/Kolkata','yyyy-MM-dd') : '',
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
                        Utilities.formatDate(appDt,'Asia/Kolkata','yyyy-MM-dd') : '',
    passportStatus:   ppExp ? ((ppExp - new Date()) / (1000*60*60*24*30) > 6 ? 'Valid' : '<6mo') : 'Unknown',
    passportExpiry:   ppExp ? Utilities.formatDate(ppExp,'Asia/Kolkata','yyyy-MM-dd') : '',
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

// ── globalSearch_ ────────────────────────────────────────────
// ?action=search&q=ravish+kumar&token=XXX
function globalSearch_(params) {
  params.q     = params.q || '';
  params.limit = params.limit || '30';
  return getCandidates_(params);
}

// ── getMatchedCandidates_ ────────────────────────────────────
// ?action=match&reqId=AYE-REQ-2026-001&tier=STRONG&days=30
// Returns candidates ranked by score for a given requirement's trade
function getMatchedCandidates_(params) {
  var reqId = String(params.reqId||'').trim();
  var tier  = String(params.tier ||'').trim().toUpperCase(); // STRONG/GOOD/POSSIBLE/ALL
  var days  = parseInt(params.days||'0') || 0;

  if (!reqId) return { ok: false, error: 'reqId required' };

  // Load requirement
  var ss   = SpreadsheetApp.openById(SS_ID);
  var rs   = ss.getSheetByName('_Requirements');
  if (!rs) return { ok: false, error: '_Requirements sheet not found' };

  var rData  = rs.getDataRange().getValues();
  var rHdr   = rData[0];
  var reqRow = null;
  for (var i = 1; i < rData.length; i++) {
    if (String(rData[i][0]) === reqId) { reqRow = rData[i]; break; }
  }
  if (!reqRow) return { ok: false, error: 'Requirement not found: ' + reqId };

  var reqTrade  = String(reqRow[4]||'').toLowerCase();
  var minExp    = parseFloat(reqRow[6]) || 0;

  // Fetch all candidates, filter + rank
  var allParams = { limit: '500' };
  if (days > 0) allParams.daysBack = String(days);
  var all = getCandidates_(allParams);

  // Filter to matching trade
  var matched = all.records.filter(function(r) {
    if (reqTrade && r.trade.toLowerCase().indexOf(reqTrade) < 0 &&
        r.positionApplied.toLowerCase().indexOf(reqTrade) < 0) return false;
    if (minExp > 0 && r.experience < minExp) return false;
    return true;
  });

  // Sort by score descending
  matched.sort(function(a, b) { return b.score - a.score; });

  // Group by tier
  var result = { STRONG: [], GOOD: [], POSSIBLE: [], REVIEW: [] };
  matched.forEach(function(r) {
    result[r.confidenceTier].push(r);
  });

  if (tier && tier !== 'ALL') {
    return { ok: true, reqId: reqId, tier: tier, records: result[tier]||[], total: (result[tier]||[]).length };
  }

  return {
    ok:       true,
    reqId:    reqId,
    STRONG:   result.STRONG,
    GOOD:     result.GOOD,
    POSSIBLE: result.POSSIBLE,
    REVIEW:   result.REVIEW,
    counts: {
      STRONG:   result.STRONG.length,
      GOOD:     result.GOOD.length,
      POSSIBLE: result.POSSIBLE.length,
      REVIEW:   result.REVIEW.length,
      total:    matched.length
    }
  };
}
