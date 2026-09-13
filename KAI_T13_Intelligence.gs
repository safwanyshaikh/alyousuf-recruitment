// ═══════════════════════════════════════════════════════════════════════════
// KAI T13 — GCC RECRUITMENT INTELLIGENCE LAYER  (PARALLEL BRAIN)
// ═══════════════════════════════════════════════════════════════════════════
//
// STRATEGIC RULE (per approved design):
//   • This file does NOT modify the current matching engine.
//   • It runs in PARALLEL. Compare old vs T13 with compareEnginesT13_()
//     across up to 100 requirements BEFORE replacing production matching.
//   • BLS taxonomy is SEED DATA ONLY. Final authority = GCC recruitment reality.
//

// ── PUBLIC ENTRY POINTS (no trailing underscore = visible in GAS dropdown) ──
// Run these in order from the GAS editor function selector.
// Step 0: seed taxonomy first
function seedTaxonomyGCC()          { return seedTaxonomyGCC_(); }
// Step 0b: verify T13 logic is clean (must show 0 leaks)
// testT13SuccessCase — already public, defined below
// Step 1: full evidence suite (all 7 steps)
function runT13EvidenceSuite()      { return runT13EvidenceSuite_(); }
// Or run individual steps:
function compareEnginesT13()        { return compareEnginesT13_(); }
function falsePositiveReport()      { return falsePositiveReportT13_(); }
function falseNegativeReport()      { return falseNegativeReportT13_(); }
function dualTradeAnalysis()        { return dualTradeAnalysisT13_(); }
function governanceQueue()          { return governanceQueueT13_(); }
function recruiterValidationSet()   { return recruiterValidationDatasetT13_(10); }
function tradeFamilyAudit()         { return tradeFamilyAuditT13_(); }
// ────────────────────────────────────────────────────────────────────────────

// PIPELINE (Decisions 2,3,7,10):
//   Industry → Department → Trade Family → Trade → Specialization
//   Raw CV Trade → Trade Resolver → Taxonomy Trade → Trade Family
//                → Collar → Position Level → Eligibility → (then Gemini ranks)
//
//   Gemini is RANKING ONLY. It never runs on an ineligible candidate.
//
// DELIVERABLES IMPLEMENTED HERE:
//   1  Taxonomy Extension Layer      → _Taxonomy sheet + TAXONOMY_HEADERS
//   2  Collar Classification Engine  → detectLevelT13_ + T13_COLLAR_OF_LEVEL
//   3  Position Classification Engine→ T13_LADDER + detectLevelT13_
//   4  Trade Family Engine           → detectDisciplineT13_ + assignGroupT13_
//   5  Human Approval Workflow       → suggestClassificationT13_ / approvePendingT13_
//   6  Eligibility Engine            → checkEligibilityT13_
//   7  Match Matrix Engine           → T13_ALLOWED + levelFactorT13_
//   8  Recruiter Learning Engine     → affinityMultiplierT13_ (reads _MatchFeedback)
//   9  Top-3 Position Engine         → getTop3PositionsT13_  (no Gemini)
//   10 Match Audit Engine            → getMatchedCandidatesT13_ returns full reason
//   11 Gemini Repositioning          → eligibility precedes any scoring (by design)
//   12 Migration Script              → importBLSTaxonomyT13_ + seedTaxonomyGCC_
//
// ═══════════════════════════════════════════════════════════════════════════


// ── GCC POSITION LADDER (Decision 4) — low → high seniority ─────────────────
var T13_LADDER = [
  'HELPER','WORKER','ASSISTANT','OPERATOR','TECHNICIAN','TRADESMAN',
  'LEADMAN','CHARGEMAN','FOREMAN','SUPERVISOR','COORDINATOR','PLANNER',
  'INSPECTOR','ENGINEER','SPECIALIST','MANAGER','HEAD','DIRECTOR'
];

// ── COLLAR CLASSIFICATION (Decision 5) ──────────────────────────────────────
var T13_COLLAR_OF_LEVEL = {
  HELPER:'BLUE', WORKER:'BLUE', ASSISTANT:'BLUE', OPERATOR:'BLUE',
  TECHNICIAN:'BLUE', TRADESMAN:'BLUE', LEADMAN:'BLUE',
  CHARGEMAN:'GREY', FOREMAN:'GREY', SUPERVISOR:'GREY', COORDINATOR:'GREY', PLANNER:'GREY',
  INSPECTOR:'WHITE', ENGINEER:'WHITE', SPECIALIST:'WHITE', MANAGER:'WHITE',
  HEAD:'WHITE', DIRECTOR:'WHITE'
};

// PINK collar trades (Decision 5) — detected separately, never matched to industrial trades
var T13_PINK_KEYWORDS = /secretary|receptionist|front office|nurse|caregiver|customer service|telecaller|hostess|housekeep/;

// ── ELIGIBILITY GROUP ALLOW MATRIX (Decisions 6,7,9) — DEFAULT DENY ──────────
// ALLOWED[requirementGroup][candidateGroup] = base affinity 0-100.
// Any pair not listed = BLOCKED (candidate hidden, never scored).
var T13_ALLOWED = {
  // ---- BLUE collar trade groups ----
  WELDER_GROUP:            { WELDER_GROUP:100, FABRICATOR_GROUP:60 },
  FABRICATOR_GROUP:        { FABRICATOR_GROUP:100, WELDER_GROUP:55, FITTER_GROUP:50 },
  FITTER_GROUP:            { FITTER_GROUP:100, FABRICATOR_GROUP:45 },
  RIGGER_GROUP:            { RIGGER_GROUP:100, SCAFFOLDER_GROUP:40 },
  SCAFFOLDER_GROUP:        { SCAFFOLDER_GROUP:100 },
  PAINTER_GROUP:           { PAINTER_GROUP:100 },
  ELECTRICIAN_GROUP:       { ELECTRICIAN_GROUP:100, INSTRUMENT_GROUP:45 },
  INSTRUMENT_GROUP:        { INSTRUMENT_GROUP:100, ELECTRICIAN_GROUP:45 },
  MECHANICAL_TECH_GROUP:   { MECHANICAL_TECH_GROUP:100, FITTER_GROUP:50 },
  CIVIL_TRADE_GROUP:       { CIVIL_TRADE_GROUP:100 },
  HEAVY_EQUIP_GROUP:       { HEAVY_EQUIP_GROUP:100 },
  GENERAL_WORKER_GROUP:    { GENERAL_WORKER_GROUP:100 },
  // ---- WHITE collar inspection groups ----
  WELDING_INSPECTOR_GROUP: { WELDING_INSPECTOR_GROUP:100, NDT_GROUP:55, QAQC_INSPECTOR_GROUP:50 },
  NDT_GROUP:               { NDT_GROUP:100, WELDING_INSPECTOR_GROUP:55 },
  QAQC_INSPECTOR_GROUP:    { QAQC_INSPECTOR_GROUP:100, WELDING_INSPECTOR_GROUP:50, NDT_GROUP:45 },
  // ---- WHITE collar technical ----
  ENGINEER_GROUP:          { ENGINEER_GROUP:100 },
  HSE_GROUP:               { HSE_GROUP:100 },
  MANAGER_GROUP:           { MANAGER_GROUP:100, ENGINEER_GROUP:50 },
  // ---- GREY collar supervision ----
  SUPERVISOR_GROUP:        { SUPERVISOR_GROUP:100 },
  PLANNER_GROUP:           { PLANNER_GROUP:100 }
};

// Tier thresholds (mirrors production for fair comparison)
var T13_STRONG = 75, T13_GOOD = 55, T13_POSSIBLE = 40;

// Governance switch: when true, trades not APPROVED in _Taxonomy are flagged
// but STILL matched by the rule engine (safe default). When false, identical.
// (Hard-blocking unknown trades is a deployment decision — kept off so the
//  parallel engine never hides candidates during the learning phase.)
var T13_STRICT_GOVERNANCE = false;


// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE 2 + 3 — POSITION LEVEL ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Most senior / most specific token wins. Order matters.
function detectLevelT13_(text) {
  var t = ' ' + String(text || '').toLowerCase() + ' ';
  if (/\bdirector\b/.test(t)) return 'DIRECTOR';
  if (/\bhead\b|\bchief\b|\bvp\b/.test(t)) return 'HEAD';
  if (/\bmanager\b|\bmgr\b/.test(t)) return 'MANAGER';
  if (/\bspecialist\b/.test(t)) return 'SPECIALIST';
  if (/\bengineer\b|\bengineering\b/.test(t)) return 'ENGINEER';
  if (/\bplanner\b|\bplanning\b|\bscheduler\b|cost control|quantity surveyor|\bqs\b/.test(t)) return 'PLANNER';
  if (/\bcoordinator\b|\bco-ordinator\b/.test(t)) return 'COORDINATOR';
  if (/inspector|inspection|\bqa\/qc\b|\bqaqc\b|\bqa\b|\bqc\b|\bndt\b|cswip|\bbgas\b|\bcwi\b|\bnace\b|\basnt\b/.test(t)) return 'INSPECTOR';
  if (/supervisor|superintendent/.test(t)) return 'SUPERVISOR';
  if (/foreman/.test(t)) return 'FOREMAN';
  if (/chargehand|charge hand|chargeman/.test(t)) return 'CHARGEMAN';
  if (/leadman|lead man|\bleadhand\b|gang leader/.test(t)) return 'LEADMAN';
  if (/technician|\btech\b/.test(t)) return 'TECHNICIAN';
  if (/operator/.test(t)) return 'OPERATOR';
  if (/assistant/.test(t)) return 'ASSISTANT';
  if (/helper/.test(t)) return 'HELPER';
  return 'WORKER';
}

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE 4 — TRADE FAMILY / DISCIPLINE ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Discipline is level-independent (a Welder and a Welding Inspector share
// discipline WELDING but differ by LEVEL → different eligibility groups).
function detectDisciplineT13_(text) {
  var t = ' ' + String(text || '').toLowerCase() + ' ';
  if (/welder|welding|\btig\b|\bmig\b|\bsmaw\b|\bgtaw\b|\bfcaw\b|\b6g\b|arc weld/.test(t)) return 'WELDING';
  if (/fabricat/.test(t)) return 'FABRICATION';
  if (/pipe fitter|pipefitter|pipe fitting|\bfitter\b|fit-up|fit up/.test(t)) return 'FITTING';
  if (/\bpiping\b|\bpipe\b/.test(t)) return 'PIPING';
  if (/scaffold/.test(t)) return 'SCAFFOLDING';
  if (/rigger|rigging|banksman|slinger|\blifting\b/.test(t)) return 'RIGGING';
  if (/painter|painting|\bcoating\b|blaster|sandblast|\bblasting\b/.test(t)) return 'PAINTING';
  if (/electric|\be&i\b/.test(t)) return 'ELECTRICAL';
  if (/instrument|\bdcs\b|\bplc\b|\bscada\b|calibrat/.test(t)) return 'INSTRUMENTATION';
  if (/\bndt\b|radiograph|ultrasonic|\bmpi\b|\bdpt\b/.test(t)) return 'NDT';
  if (/mechanical|rotating|static equipment|\bpump\b|compressor|turbine|gearbox/.test(t)) return 'MECHANICAL';
  if (/civil|mason|carpenter|steel fixer|rebar|shutter|concrete|formwork/.test(t)) return 'CIVIL';
  if (/\bhse\b|safety|\bhsse\b|nebosh|iosh|environment/.test(t)) return 'HSE';
  if (/crane|excavator|forklift|loader|bulldozer|backhoe|grader/.test(t)) return 'HEAVY_EQUIP';
  return 'GENERAL';
}

// (level, discipline) → controlled Eligibility Group (Decision 6)
function assignGroupT13_(level, disc) {
  if (level === 'INSPECTOR') {
    if (disc === 'WELDING' || disc === 'FABRICATION') return 'WELDING_INSPECTOR_GROUP';
    if (disc === 'NDT') return 'NDT_GROUP';
    return 'QAQC_INSPECTOR_GROUP';
  }
  if (level === 'ENGINEER' || level === 'SPECIALIST') return 'ENGINEER_GROUP';
  if (level === 'MANAGER' || level === 'HEAD' || level === 'DIRECTOR') return 'MANAGER_GROUP';
  if (level === 'PLANNER') return 'PLANNER_GROUP';
  if (level === 'FOREMAN' || level === 'SUPERVISOR' || level === 'CHARGEMAN' || level === 'COORDINATOR')
    return 'SUPERVISOR_GROUP';
  if (disc === 'HSE') return 'HSE_GROUP';
  switch (disc) {
    case 'WELDING':         return 'WELDER_GROUP';
    case 'FABRICATION':     return 'FABRICATOR_GROUP';
    case 'FITTING':         return 'FITTER_GROUP';
    case 'PIPING':          return 'FITTER_GROUP';
    case 'SCAFFOLDING':     return 'SCAFFOLDER_GROUP';
    case 'RIGGING':         return 'RIGGER_GROUP';
    case 'PAINTING':        return 'PAINTER_GROUP';
    case 'ELECTRICAL':      return 'ELECTRICIAN_GROUP';
    case 'INSTRUMENTATION': return 'INSTRUMENT_GROUP';
    case 'NDT':             return 'NDT_GROUP';
    case 'MECHANICAL':      return 'MECHANICAL_TECH_GROUP';
    case 'CIVIL':           return 'CIVIL_TRADE_GROUP';
    case 'HEAVY_EQUIP':     return 'HEAVY_EQUIP_GROUP';
    default:                return 'GENERAL_WORKER_GROUP';
  }
}

// Full classification of a single trade string → {level,discipline,collar,group,pink}
function classifyTradeT13_(text) {
  var s = String(text || '').trim();
  if (T13_PINK_KEYWORDS.test(' ' + s.toLowerCase() + ' ')) {
    return { text:s, level:'WORKER', discipline:'PINK', collar:'PINK', group:'PINK_GROUP', pink:true };
  }
  var level = detectLevelT13_(s);
  var disc  = detectDisciplineT13_(s);
  var group = assignGroupT13_(level, disc);
  return { text:s, level:level, discipline:disc, collar:T13_COLLAR_OF_LEVEL[level] || 'BLUE', group:group, pink:false };
}


// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE 3 (candidate side) — TRADE RESOLVER
// ═══════════════════════════════════════════════════════════════════════════
// Raw CV trade may be messy: "Welder/Fabricator Cum Rigger 6G".
// Split into tokens → classify each → return Primary, Secondary, Third.
// Matching uses Primary first, then Secondary, then Third (best eligible wins).
function resolveCandidateTradesT13_(cand) {
  var sources = [];
  if (cand.trade)           sources.push(String(cand.trade));
  if (cand.positionApplied) sources.push(String(cand.positionApplied));
  if (cand.top3Positions && cand.top3Positions.full)
    sources.push(cand.top3Positions.full.join(' / '));

  var raw = sources.join(' / ');
  // split on separators commonly seen in CV trade fields
  var tokens = raw.split(/\s*(?:\/|,|\bcum\b|&|\+|\||;|\-\s)\s*/i)
                  .map(function(x){ return x.trim(); })
                  .filter(function(x){ return x.length > 1; });
  if (!tokens.length) tokens = [raw];

  var seen = {}, classes = [];
  for (var i = 0; i < tokens.length && classes.length < 3; i++) {
    var c = classifyTradeT13_(tokens[i]);
    if (c.group === 'GENERAL_WORKER_GROUP') continue; // skip noise tokens like "6g", "experienced"
    if (seen[c.group]) continue;
    seen[c.group] = true;
    classes.push(c);
  }
  if (!classes.length) classes.push(classifyTradeT13_(tokens[0]));
  return classes; // [primary, secondary?, third?]
}


// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE 7 — MATCH MATRIX  +  DELIVERABLE 6 — ELIGIBILITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════
function levelFactorT13_(reqLevel, candLevel) {
  var a = T13_LADDER.indexOf(reqLevel), b = T13_LADDER.indexOf(candLevel);
  if (a < 0 || b < 0) return 0.8;
  var d = Math.abs(a - b);
  if (d === 0) return 1.0;
  if (d === 1) return 0.8;
  if (d === 2) return 0.6;
  return 0.4;
}

// Validation order (Decision 7): Collar → Group → Level → Discipline refine.
// Returns { eligible, score, tier, reason, blockedBy }.
function checkEligibilityT13_(reqClass, candClass) {
  // PINK collar is fully isolated from industrial trades
  if (reqClass.collar === 'PINK' || candClass.collar === 'PINK') {
    if (reqClass.group !== candClass.group)
      return { eligible:false, score:0, tier:'HIDDEN', reason:'PINK_ISOLATION', blockedBy:'COLLAR' };
  }
  // 1. COLLAR hard block (Decision 8) — cross-collar never matches
  if (reqClass.collar !== candClass.collar) {
    return { eligible:false, score:0, tier:'HIDDEN',
             reason:'COLLAR_BLOCK ' + reqClass.collar + '≠' + candClass.collar, blockedBy:'COLLAR' };
  }
  // 2. ELIGIBILITY GROUP allow-list (default deny)
  var allow = T13_ALLOWED[reqClass.group] || {};
  if (!(candClass.group in allow)) {
    return { eligible:false, score:0, tier:'HIDDEN',
             reason:'GROUP_BLOCK ' + candClass.group + '∉allowed(' + reqClass.group + ')', blockedBy:'GROUP' };
  }
  // 3. SCORE = base affinity × level factor
  var base  = allow[candClass.group];
  var lf    = levelFactorT13_(reqClass.level, candClass.level);
  var score = base * lf;
  // 4. DISCIPLINE refinement for grey/white discipline-bearing groups
  if ((reqClass.group === 'SUPERVISOR_GROUP' || reqClass.group === 'ENGINEER_GROUP') &&
      reqClass.discipline !== candClass.discipline &&
      reqClass.discipline !== 'GENERAL' && candClass.discipline !== 'GENERAL') {
    score = score * 0.7;
  }
  score = Math.round(score);
  var tier = score >= T13_STRONG ? 'STRONG' :
             score >= T13_GOOD ? 'GOOD' :
             score >= T13_POSSIBLE ? 'POSSIBLE' : 'HIDDEN';
  return { eligible: tier !== 'HIDDEN', score:score, tier:tier,
           reason:'base=' + base + ' lf=' + lf, blockedBy:null };
}

// Best eligibility across a candidate's resolved trades (primary→secondary→third)
function bestEligibilityT13_(reqClass, candClasses) {
  var best = { eligible:false, score:0, tier:'HIDDEN', reason:'no-trade', via:null };
  for (var i = 0; i < candClasses.length; i++) {
    var e = checkEligibilityT13_(reqClass, candClasses[i]);
    // small penalty for matching on secondary/third trade
    if (i > 0 && e.eligible) e.score = Math.round(e.score * (i === 1 ? 0.9 : 0.8));
    if (e.score > best.score) {
      best = e; best.via = candClasses[i].text; best.viaGroup = candClasses[i].group; best.rank = i;
    }
  }
  // recompute tier after the secondary/third penalty
  best.tier = best.score >= T13_STRONG ? 'STRONG' :
              best.score >= T13_GOOD ? 'GOOD' :
              best.score >= T13_POSSIBLE ? 'POSSIBLE' : 'HIDDEN';
  best.eligible = best.tier !== 'HIDDEN';
  return best;
}


// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE 8 — RECRUITER LEARNING (affinity multiplier from _MatchFeedback)
// ═══════════════════════════════════════════════════════════════════════════
// Reads the _MatchFeedback sheet (written by the existing learning hooks) and
// returns a 0.5–1.0 multiplier per (reqGroup→candGroup). Heavy rejection of a
// pair drives its affinity toward 0 → suppressed. Cached per execution.
var _t13AffinityCache = null;
function affinityMultiplierT13_(ss, reqGroup, candGroup) {
  if (_t13AffinityCache === null) {
    _t13AffinityCache = {};
    var sheet = ss.getSheetByName('_MatchFeedback');
    if (sheet && sheet.getLastRow() > 1) {
      var d = sheet.getDataRange().getValues();
      for (var i = 1; i < d.length; i++) {
        var rg = classifyTradeT13_(String(d[i][3] || '')).group; // ReqTrade
        var cg = classifyTradeT13_(String(d[i][6] || '')).group; // CandTrade
        var act = String(d[i][8] || '');
        var key = rg + '>' + cg;
        if (!_t13AffinityCache[key]) _t13AffinityCache[key] = { pos:0, neg:0 };
        if (act === 'REJECTED') _t13AffinityCache[key].neg++;
        else if (act === 'SHORTLISTED' || act === 'SUBMITTED' || act === 'SELECTED' || act === 'DEPLOYED')
          _t13AffinityCache[key].pos++;
      }
    }
  }
  var rec = _t13AffinityCache[reqGroup + '>' + candGroup];
  if (!rec || (rec.pos + rec.neg) < 5) return 1.0; // not enough signal
  var ratio = rec.pos / (rec.pos + rec.neg);        // 0..1
  return 0.5 + ratio * 0.5;                          // 0.5..1.0
}


// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE 1 + 12 — TAXONOMY SHEET + MIGRATION + GOVERNANCE
// ═══════════════════════════════════════════════════════════════════════════
var TAXONOMY_HEADERS = [
  'Industry','Department','TradeFamily','Trade','Specialization',
  'CollarType','PositionLevel','EligibilityGroup','AllowedGroups','BlockedGroups',
  'CriticalKeywords','BlockedKeywords','PromotionPath','CrossMatchRules',
  'ApprovalStatus','CreatedByAI','ApprovedByHuman','ApprovedDate','Aliases','Active'
];

function ensureTaxonomySheetT13_(ss) {
  var s = ss.getSheetByName('_Taxonomy');
  if (!s) {
    s = ss.insertSheet('_Taxonomy');
    s.appendRow(TAXONOMY_HEADERS);
    s.getRange(1,1,1,TAXONOMY_HEADERS.length)
     .setFontWeight('bold').setBackground('#0B3D2E').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
  }
  return s;
}

// DELIVERABLE 5 — when a new trade appears, AI suggests classification and the
// row is written as PENDING. Never auto-activated (Decision 8).
function suggestClassificationT13_(ss, industry, department, trade, specialization) {
  var sheet = ensureTaxonomySheetT13_(ss);
  // de-dupe on Specialization (or Trade)
  var key = String(specialization || trade || '').toLowerCase().trim();
  var d = sheet.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][4] || d[i][3]).toLowerCase().trim() === key) return { ok:true, existing:true };
  }
  var c = classifyTradeT13_(specialization || trade);
  var allowed = Object.keys(T13_ALLOWED[c.group] || { }).join(',');
  sheet.appendRow([
    industry || '', department || '', c.discipline, trade || '', specialization || trade || '',
    c.collar, c.level, c.group, allowed, '',
    '', '', '', '',
    'PENDING', 'YES', '', '', '', 'NO'
  ]);
  return { ok:true, suggested:c, status:'PENDING' };
}

// Approve a pending classification → Active (Decision 6 human governance)
function approvePendingT13_(specialization, approver) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('_Taxonomy');
  if (!sheet) return { ok:false, error:'_Taxonomy not found' };
  var d = sheet.getDataRange().getValues();
  var key = String(specialization || '').toLowerCase().trim();
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][4]).toLowerCase().trim() === key) {
      sheet.getRange(i+1, 15).setValue('APPROVED');
      sheet.getRange(i+1, 17).setValue(approver || 'admin');
      sheet.getRange(i+1, 18).setValue(Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd'));
      sheet.getRange(i+1, 20).setValue('YES');
      return { ok:true, approved:specialization };
    }
  }
  return { ok:false, error:'Specialization not found: ' + specialization };
}

// DELIVERABLE 12 — import BLS rows as PENDING suggestions (seed only).
// Run from editor. Reads the existing taxonomy data already mirrored in
// the candidate corpus is NOT required — this imports from the _Taxonomy
// seeding source if present. Safe to re-run (de-dupes).
function importBLSTaxonomyT13_() {
  var ss = SpreadsheetApp.openById(SS_ID);
  ensureTaxonomySheetT13_(ss);
  // BLS seed is held in the repo file, not the sheet; this function seeds the
  // GCC core (the trades AYE actually recruits) as APPROVED, and is the entry
  // point to later bulk-import BLS rows as PENDING.
  return seedTaxonomyGCC_();
}

// Seed the GCC oil & gas core trades as APPROVED (the precise, curated set).
function seedTaxonomyGCC_() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ensureTaxonomySheetT13_(ss);
  var existing = {};
  var d = sheet.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) existing[String(d[i][4]).toLowerCase().trim()] = true;

  // [Industry, Department, Trade, Specialization]
  var core = [
    ['Oil & Gas','Operations','Welding','Pipe Welder'],
    ['Oil & Gas','Operations','Welding','TIG Welder'],
    ['Oil & Gas','Operations','Welding','MIG Welder'],
    ['Oil & Gas','Operations','Welding','ARC Welder'],
    ['Oil & Gas','Operations','Welding','Structural Welder'],
    ['Oil & Gas','Operations','Welding','6G Welder'],
    ['Oil & Gas','Operations','Fabrication','Structural Fabricator'],
    ['Oil & Gas','Operations','Fabrication','Plate Fabricator'],
    ['Oil & Gas','Operations','Fitting','Pipe Fitter'],
    ['Oil & Gas','Operations','Fitting','Mechanical Fitter'],
    ['Oil & Gas','Operations','Fitting','Structural Fitter'],
    ['Oil & Gas','Operations','Scaffolding','Scaffolder'],
    ['Oil & Gas','Operations','Rigging','Rigger'],
    ['Oil & Gas','Operations','Rigging','Banksman'],
    ['Oil & Gas','Operations','Painting','Painter'],
    ['Oil & Gas','Operations','Painting','Blaster'],
    ['Oil & Gas','Operations','Electrical','Electrician'],
    ['Oil & Gas','Operations','Instrumentation','Instrument Technician'],
    ['Oil & Gas','Operations','Mechanical','Mechanical Technician'],
    ['Oil & Gas','Operations','Heavy Equipment','Crane Operator'],
    ['Oil & Gas','Quality & Inspection','Welding Inspection','Welding Inspector'],
    ['Oil & Gas','Quality & Inspection','Welding Inspection','CSWIP Inspector'],
    ['Oil & Gas','Quality & Inspection','NDT','NDT Technician'],
    ['Oil & Gas','Quality & Inspection','QAQC','QA/QC Inspector'],
    ['Oil & Gas','Quality & Inspection','QAQC','Piping Inspector'],
    ['Oil & Gas','Engineering','Welding','Welding Engineer'],
    ['Oil & Gas','Engineering','Mechanical','Mechanical Engineer'],
    ['Oil & Gas','Engineering','Piping','Piping Engineer'],
    ['Oil & Gas','Supervision','Welding','Welding Foreman'],
    ['Oil & Gas','Supervision','Fabrication','Fabrication Foreman'],
    ['Oil & Gas','Supervision','Scaffolding','Scaffolding Foreman'],
    ['Oil & Gas','Supervision','Rigging','Rigging Foreman'],
    ['Oil & Gas','HSE','HSE','Safety Officer'],
    ['Oil & Gas','Management','General','Project Manager']
  ];

  var added = 0, now = Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd');
  core.forEach(function(r) {
    var spec = r[3];
    if (existing[spec.toLowerCase().trim()]) return;
    var c = classifyTradeT13_(spec);
    var allowed = Object.keys(T13_ALLOWED[c.group] || {}).join(',');
    sheet.appendRow([
      r[0], r[1], c.discipline, r[2], spec,
      c.collar, c.level, c.group, allowed, '',
      '', '', '', '',
      'APPROVED', 'YES', 'system-seed', now, '', 'YES'
    ]);
    added++;
  });
  Logger.log('seedTaxonomyGCC_: ' + added + ' core GCC trades seeded as APPROVED.');
  return { ok:true, added:added };
}


// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE 9 — TOP-3 POSITION ENGINE (taxonomy-driven, NO Gemini)
// ═══════════════════════════════════════════════════════════════════════════
// For a given trade, return the allowed sibling positions (visible) and the
// explicitly blocked positions (hidden) — generated from group relationships.
function getTop3PositionsT13_(trade) {
  var rc = classifyTradeT13_(trade);
  var allow = T13_ALLOWED[rc.group] || {};
  // representative specializations per group (display labels)
  var SAMPLE = {
    WELDER_GROUP:['Pipe Welder','TIG Welder','MIG Welder','ARC Welder','Structural Welder'],
    FABRICATOR_GROUP:['Structural Fabricator','Plate Fabricator'],
    FITTER_GROUP:['Pipe Fitter','Mechanical Fitter','Structural Fitter'],
    RIGGER_GROUP:['Rigger','Banksman'],
    SCAFFOLDER_GROUP:['Scaffolder'],
    PAINTER_GROUP:['Painter','Blaster'],
    WELDING_INSPECTOR_GROUP:['Welding Inspector','CSWIP Inspector'],
    NDT_GROUP:['NDT Technician'],
    QAQC_INSPECTOR_GROUP:['QA/QC Inspector','Piping Inspector'],
    ENGINEER_GROUP:['Mechanical Engineer','Piping Engineer','Welding Engineer'],
    SUPERVISOR_GROUP:['Foreman','Supervisor'],
    MANAGER_GROUP:['Project Manager']
  };
  var allowedGroups = Object.keys(allow).sort(function(a,b){ return allow[b]-allow[a]; });
  var visible = [];
  allowedGroups.forEach(function(g){
    (SAMPLE[g] || []).forEach(function(p){
      if (p.toLowerCase() !== rc.text.toLowerCase() && visible.length < 5) visible.push(p);
    });
  });
  // blocked examples = a few groups NOT in allow
  var blocked = [];
  Object.keys(SAMPLE).forEach(function(g){
    if (!(g in allow) && blocked.length < 5) {
      var ex = SAMPLE[g][0];
      blocked.push(ex);
    }
  });
  return {
    trade: trade, group: rc.group, collar: rc.collar, level: rc.level,
    visible: visible.slice(0,3),
    blocked: blocked.slice(0,4)
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE 10 + 11 — PARALLEL MATCHER (eligibility BEFORE any scoring)
// ═══════════════════════════════════════════════════════════════════════════
// Same response shape as production getMatchedCandidates_, plus full audit:
// each record carries t13Reason { reqGroup, candGroup, via, score, tier }.
function getMatchedCandidatesT13_(params) {
  var reqId = String(params.reqId || '').trim();
  var tier  = String(params.tier || 'ALL').trim().toUpperCase();
  if (!reqId) return { ok:false, error:'reqId required' };

  var ss = SpreadsheetApp.openById(SS_ID);
  var rs = ss.getSheetByName('_Requirements');
  if (!rs) return { ok:false, error:'_Requirements not found' };
  var rData = rs.getDataRange().getValues(), reqRow = null;
  for (var i = 1; i < rData.length; i++) if (String(rData[i][0]) === reqId) { reqRow = rData[i]; break; }
  if (!reqRow) return { ok:false, error:'Requirement not found: ' + reqId };

  var reqTrade = String(reqRow[4] || '').trim();
  var reqClass = classifyTradeT13_(reqTrade);
  _t13AffinityCache = null; // reset learning cache per request

  var all = getAllCandidatesRaw_();
  var result = { STRONG:[], GOOD:[], POSSIBLE:[] }, blocked = 0;

  all.forEach(function(r) {
    var candClasses = resolveCandidateTradesT13_(r);
    var e = bestEligibilityT13_(reqClass, candClasses);
    if (!e.eligible) { blocked++; return; }
    // learning multiplier (Deliverable 8)
    var mult = affinityMultiplierT13_(ss, reqClass.group, e.viaGroup || candClasses[0].group);
    var finalScore = Math.round(e.score * mult);
    var finalTier = finalScore >= T13_STRONG ? 'STRONG' :
                    finalScore >= T13_GOOD ? 'GOOD' :
                    finalScore >= T13_POSSIBLE ? 'POSSIBLE' : 'HIDDEN';
    if (finalTier === 'HIDDEN') { blocked++; return; }
    r.t13Reason = {
      reqGroup: reqClass.group, reqCollar: reqClass.collar, reqLevel: reqClass.level,
      candGroup: e.viaGroup, via: e.via, baseScore: e.score,
      affinity: mult, finalScore: finalScore, tier: finalTier
    };
    result[finalTier].push(r);
  });

  ['STRONG','GOOD','POSSIBLE'].forEach(function(t){
    result[t].sort(function(a,b){ return b.t13Reason.finalScore - a.t13Reason.finalScore; });
  });

  var counts = { STRONG:result.STRONG.length, GOOD:result.GOOD.length,
                 POSSIBLE:result.POSSIBLE.length, BLOCKED:blocked,
                 total:result.STRONG.length+result.GOOD.length+result.POSSIBLE.length };

  if (tier && tier !== 'ALL') {
    return { ok:true, engine:'T13', reqId:reqId, trade:reqTrade,
             reqGroup:reqClass.group, reqCollar:reqClass.collar, reqLevel:reqClass.level,
             records:(result[tier]||[]).slice(0,200), counts:counts };
  }
  return { ok:true, engine:'T13', reqId:reqId, trade:reqTrade,
           reqGroup:reqClass.group, reqCollar:reqClass.collar, reqLevel:reqClass.level,
           STRONG:result.STRONG.slice(0,100), GOOD:result.GOOD.slice(0,100),
           POSSIBLE:result.POSSIBLE.slice(0,100), counts:counts };
}


// ═══════════════════════════════════════════════════════════════════════════
// A/B COMPARISON HARNESS — OLD ENGINE vs T13  (Step 1 of evidence suite)
// ═══════════════════════════════════════════════════════════════════════════
// Runs against ALL active requirements (pass limit=N to cap for a quick test).
// Writes full breakdown to _T13_CompareReport and logs a summary.
function compareEnginesT13_(limit) {
  limit = limit || 9999;
  var ss   = SpreadsheetApp.openById(SS_ID);
  var rs   = ss.getSheetByName('_Requirements');
  if (!rs || rs.getLastRow() < 2) { Logger.log('No requirements.'); return; }
  var rData = rs.getRange(2,1,rs.getLastRow()-1,25).getValues();
  var cands = getAllCandidatesRaw_();

  // Prepare output sheet (clear and re-write)
  var reportSheet = ss.getSheetByName('_T13_CompareReport') ||
                    ss.insertSheet('_T13_CompareReport');
  reportSheet.clearContents();
  var headers = ['ReqId','Trade','T13Group','T13Collar',
                 'OldTotal','OldStrong','OldGood','OldPossible',
                 'T13Total','T13Strong','T13Good','T13Possible',
                 'RemovedStrong','NoiseReduction%','RunDate'];
  reportSheet.appendRow(headers);
  reportSheet.getRange(1,1,1,headers.length)
             .setFontWeight('bold').setBackground('#0B3D2E').setFontColor('#FFFFFF');
  reportSheet.setFrozenRows(1);

  Logger.log('═══ OLD ENGINE vs T13 — FULL BREAKDOWN (Step 1) ═══');
  Logger.log(pad_('ReqId',18)+pad_('Trade',24)+pad_('OldStr',8)+pad_('OldGd',7)+
             pad_('OldPos',8)+pad_('T13Str',8)+pad_('T13Gd',7)+pad_('T13Pos',8)+
             pad_('Removed',9)+'Noise%');

  var n = 0, tOldStr = 0, tOldGd = 0, tOldPos = 0;
  var tT13Str = 0, tT13Gd = 0, tT13Pos = 0;
  var now = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  var rows = [];

  for (var i = 0; i < rData.length && n < limit; i++) {
    var row   = rData[i];
    var reqId = String(row[0]||'').trim();
    var trade = String(row[4]||'').trim();
    if (!reqId || !trade) continue;
    var status = String(row[14]||'Active').trim();
    if (status === 'Closed' || status === 'Archived') continue;
    n++;

    // ── OLD engine counts (full three tiers) ─────────────────────────────
    var oldStr = 0, oldGd = 0, oldPos = 0;
    cands.forEach(function(c) {
      var t = getTradeMatchTier_(trade, c);
      if      (t === 'STRONG')   oldStr++;
      else if (t === 'GOOD')     oldGd++;
      else if (t === 'POSSIBLE') oldPos++;
    });

    // ── T13 counts ────────────────────────────────────────────────────────
    var reqClass = classifyTradeT13_(trade);
    _t13AffinityCache = null;
    var t13Str = 0, t13Gd = 0, t13Pos = 0;
    cands.forEach(function(c) {
      var e = bestEligibilityT13_(reqClass, resolveCandidateTradesT13_(c));
      if      (e.tier === 'STRONG')   t13Str++;
      else if (e.tier === 'GOOD')     t13Gd++;
      else if (e.tier === 'POSSIBLE') t13Pos++;
    });

    var oldTotal = oldStr + oldGd + oldPos;
    var t13Total = t13Str + t13Gd + t13Pos;
    var removed  = oldStr - t13Str;
    var noise    = oldStr > 0 ? Math.round(removed / oldStr * 100) : 0;

    tOldStr += oldStr; tOldGd += oldGd; tOldPos += oldPos;
    tT13Str += t13Str; tT13Gd += t13Gd; tT13Pos += t13Pos;

    Logger.log(pad_(reqId,18)+pad_(trade,24)+pad_(String(oldStr),8)+pad_(String(oldGd),7)+
               pad_(String(oldPos),8)+pad_(String(t13Str),8)+pad_(String(t13Gd),7)+
               pad_(String(t13Pos),8)+pad_(String(removed),9)+noise+'%');

    rows.push([reqId, trade, reqClass.group, reqClass.collar,
               oldTotal, oldStr, oldGd, oldPos,
               t13Total, t13Str, t13Gd, t13Pos,
               removed, noise, now]);
  }

  if (rows.length) {
    reportSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  var totalRemoved = tOldStr - tT13Str;
  var totalNoise   = tOldStr > 0 ? Math.round(totalRemoved / tOldStr * 100) : 0;
  Logger.log('');
  Logger.log('═══ TOTALS over ' + n + ' requirements ═══');
  Logger.log('OLD   Strong=' + tOldStr + '  Good=' + tOldGd + '  Possible=' + tOldPos +
             '  Total=' + (tOldStr+tOldGd+tOldPos));
  Logger.log('T13   Strong=' + tT13Str + '  Good=' + tT13Gd + '  Possible=' + tT13Pos +
             '  Total=' + (tT13Str+tT13Gd+tT13Pos));
  Logger.log('Noise eliminated from STRONG: ' + totalRemoved + ' (' + totalNoise + '%)');
  Logger.log('Results written → _T13_CompareReport');
}


// ═══════════════════════════════════════════════════════════════════════════
// SUCCESS SELF-TEST (Decision: run before trusting T13)
// ═══════════════════════════════════════════════════════════════════════════
function testT13SuccessCase() {
  var req = 'Pipe Welder';
  var rc = classifyTradeT13_(req);
  Logger.log('═══ T13 SUCCESS TEST — Requirement: ' + req + ' ('+rc.group+'/'+rc.collar+') ═══');

  var mustShow = ['Pipe Welder','TIG Welder','MIG Welder','ARC Welder','Structural Welder'];
  var mustHide = ['Welding Inspector','QAQC Inspector','NDT Inspector',
                  'Mechanical Engineer','Piping Engineer','Engineering Manager','Welding Foreman'];
  var fails = 0;

  Logger.log('-- MUST SHOW --');
  mustShow.forEach(function(s){
    var e = checkEligibilityT13_(rc, classifyTradeT13_(s));
    var ok = e.tier !== 'HIDDEN'; if(!ok) fails++;
    Logger.log((ok?'PASS ':'FAIL ')+pad_(s,22)+' '+e.tier+' ('+e.score+')');
  });
  Logger.log('-- MUST HIDE --');
  mustHide.forEach(function(s){
    var cc = classifyTradeT13_(s);
    var e = checkEligibilityT13_(rc, cc);
    var ok = e.tier === 'HIDDEN'; if(!ok) fails++;
    Logger.log((ok?'PASS ':'FAIL ')+pad_(s,22)+'→ '+pad_(cc.group,24)+e.tier+' '+(ok?'(hidden)':'(LEAKED!)'));
  });

  Logger.log('');
  Logger.log(fails===0 ? '✓ SUCCESS TEST PASSED — 0 leaks' : '✗ '+fails+' FAILURES — T13 NOT READY');

  // Top-3 demo
  var t3 = getTop3PositionsT13_(req);
  Logger.log('');
  Logger.log('TOP-3 for '+req+' → visible: '+t3.visible.join(', '));
  Logger.log('               blocked: '+t3.blocked.join(', '));
}


// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE SUITE — Steps 2-7  (run after Step 1 compareEnginesT13_)
// ═══════════════════════════════════════════════════════════════════════════

// ── STEP 2 — FALSE POSITIVE REPORT ──────────────────────────────────────────
// OLD engine showed these candidates as STRONG; T13 hides them.
// These are the noise T13 eliminates. Write top-100 worst offenders per req.
function falsePositiveReportT13_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var rs    = ss.getSheetByName('_Requirements');
  if (!rs || rs.getLastRow() < 2) { Logger.log('No requirements.'); return; }
  var rData = rs.getRange(2,1,rs.getLastRow()-1,25).getValues();
  var cands = getAllCandidatesRaw_();

  var sheet = ss.getSheetByName('_T13_FalsePositive') ||
              ss.insertSheet('_T13_FalsePositive');
  sheet.clearContents();
  var hdr = ['ReqId','ReqTrade','ReqGroup','CandKaiNo','CandName',
             'CandTrade','CandGroup','CandCollar','OldTier','T13Tier','BlockReason','RunDate'];
  sheet.appendRow(hdr);
  sheet.getRange(1,1,1,hdr.length).setFontWeight('bold').setBackground('#7B0000').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  var now  = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  var rows = [];
  var reqCount = 0;

  for (var i = 0; i < rData.length; i++) {
    var reqId = String(rData[i][0]||'').trim();
    var trade = String(rData[i][4]||'').trim();
    if (!reqId || !trade) continue;
    var status = String(rData[i][14]||'Active').trim();
    if (status === 'Closed' || status === 'Archived') continue;
    reqCount++;

    var reqClass = classifyTradeT13_(trade);
    _t13AffinityCache = null;

    cands.forEach(function(c) {
      var oldTier = getTradeMatchTier_(trade, c);
      if (oldTier !== 'STRONG') return;
      var candClasses = resolveCandidateTradesT13_(c);
      var e = bestEligibilityT13_(reqClass, candClasses);
      if (e.eligible) return; // not a false positive — T13 also shows it
      var cc = candClasses[0];
      rows.push([reqId, trade, reqClass.group,
                 c.kaiNo||'', c.name||'', c.trade||c.positionApplied||'',
                 cc.group, cc.collar, 'STRONG', e.tier||'HIDDEN',
                 e.reason||e.blockedBy||'', now]);
    });
  }

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, hdr.length).setValues(rows);
  }
  Logger.log('Step 2 — False Positives: ' + rows.length + ' records across ' + reqCount +
             ' requirements → _T13_FalsePositive');
  return { falsePositives: rows.length, requirements: reqCount };
}


// ── STEP 3 — FALSE NEGATIVE REPORT ──────────────────────────────────────────
// T13 shows these candidates; old engine missed them entirely.
// These are hidden matches the old engine could not surface.
function falseNegativeReportT13_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var rs    = ss.getSheetByName('_Requirements');
  if (!rs || rs.getLastRow() < 2) { Logger.log('No requirements.'); return; }
  var rData = rs.getRange(2,1,rs.getLastRow()-1,25).getValues();
  var cands = getAllCandidatesRaw_();

  var sheet = ss.getSheetByName('_T13_FalseNegative') ||
              ss.insertSheet('_T13_FalseNegative');
  sheet.clearContents();
  var hdr = ['ReqId','ReqTrade','ReqGroup','CandKaiNo','CandName',
             'CandTrade','CandGroup','T13Score','T13Tier','MatchedVia','OldTier','RunDate'];
  sheet.appendRow(hdr);
  sheet.getRange(1,1,1,hdr.length).setFontWeight('bold').setBackground('#003D0B').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  var now  = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  var rows = [];
  var reqCount = 0;

  for (var i = 0; i < rData.length; i++) {
    var reqId = String(rData[i][0]||'').trim();
    var trade = String(rData[i][4]||'').trim();
    if (!reqId || !trade) continue;
    var status = String(rData[i][14]||'Active').trim();
    if (status === 'Closed' || status === 'Archived') continue;
    reqCount++;

    var reqClass = classifyTradeT13_(trade);
    _t13AffinityCache = null;

    cands.forEach(function(c) {
      var oldTier = getTradeMatchTier_(trade, c);
      if (oldTier) return; // old engine already caught it
      var candClasses = resolveCandidateTradesT13_(c);
      var e = bestEligibilityT13_(reqClass, candClasses);
      if (!e.eligible) return;
      if (e.tier !== 'STRONG' && e.tier !== 'GOOD') return; // only meaningful new finds
      rows.push([reqId, trade, reqClass.group,
                 c.kaiNo||'', c.name||'', c.trade||c.positionApplied||'',
                 e.viaGroup||candClasses[0].group, e.score||0, e.tier, e.via||'',
                 '(none)', now]);
    });
  }

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, hdr.length).setValues(rows);
  }
  Logger.log('Step 3 — False Negatives (T13 new finds): ' + rows.length +
             ' records across ' + reqCount + ' requirements → _T13_FalseNegative');
  return { falseNegatives: rows.length, requirements: reqCount };
}


// ── STEP 4 — DUAL TRADE ANALYSIS ────────────────────────────────────────────
// Candidates with secondary/third trades — what trade did they match on?
// Reveals how many matches are primary vs secondary trade driven.
function dualTradeAnalysisT13_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var rs    = ss.getSheetByName('_Requirements');
  if (!rs || rs.getLastRow() < 2) { Logger.log('No requirements.'); return; }
  var rData = rs.getRange(2,1,rs.getLastRow()-1,25).getValues();
  var cands = getAllCandidatesRaw_();

  var sheet = ss.getSheetByName('_T13_DualTrade') ||
              ss.insertSheet('_T13_DualTrade');
  sheet.clearContents();
  var hdr = ['ReqId','ReqTrade','ReqGroup','CandKaiNo','CandName',
             'PrimaryTrade','PrimaryGroup','SecondaryTrade','SecondaryGroup',
             'MatchedOn','MatchedVia','T13Score','T13Tier','RunDate'];
  sheet.appendRow(hdr);
  sheet.getRange(1,1,1,hdr.length).setFontWeight('bold').setBackground('#1A3A5C').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  var now  = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  var rows = [];
  var reqCount = 0;

  // Candidate stats (regardless of requirement — dual-trade prevalence)
  var totalCands = cands.length, dualCount = 0, tripleCount = 0;

  for (var i = 0; i < rData.length; i++) {
    var reqId = String(rData[i][0]||'').trim();
    var trade = String(rData[i][4]||'').trim();
    if (!reqId || !trade) continue;
    var status = String(rData[i][14]||'Active').trim();
    if (status === 'Closed' || status === 'Archived') continue;
    reqCount++;
    if (reqCount > 1) continue; // only count dual-trade candidate stats once

    var reqClass = classifyTradeT13_(trade);
    _t13AffinityCache = null;

    cands.forEach(function(c) {
      var classes = resolveCandidateTradesT13_(c);
      if (classes.length === 1) return; // single trade, not interesting here
      if (classes.length === 2) dualCount++;
      if (classes.length >= 3) tripleCount++;

      var e = bestEligibilityT13_(reqClass, classes);
      if (!e.eligible) return;
      rows.push([reqId, trade, reqClass.group,
                 c.kaiNo||'', c.name||'',
                 classes[0].text, classes[0].group,
                 classes[1] ? classes[1].text : '', classes[1] ? classes[1].group : '',
                 'trade#' + ((e.rank||0)+1), e.via||classes[0].text,
                 e.score||0, e.tier, now]);
    });
  }

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, hdr.length).setValues(rows);
  }
  Logger.log('Step 4 — Dual Trade Analysis:');
  Logger.log('  Total candidates: ' + totalCands);
  Logger.log('  Dual-trade candidates: ' + dualCount + ' (' +
             Math.round(dualCount/totalCands*100) + '%)');
  Logger.log('  Triple-trade candidates: ' + tripleCount + ' (' +
             Math.round(tripleCount/totalCands*100) + '%)');
  Logger.log('  Rows written: ' + rows.length + ' → _T13_DualTrade');
  return { total: totalCands, dual: dualCount, triple: tripleCount };
}


// ── STEP 5 — GOVERNANCE QUEUE ────────────────────────────────────────────────
// Scan all candidate trades; any that resolve to GENERAL_WORKER_GROUP with no
// clear discipline are "unknown trades". Queue them PENDING in _Taxonomy and
// write a summary sheet so a human can review the approval workload.
function governanceQueueT13_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var cands = getAllCandidatesRaw_();

  var sheet = ss.getSheetByName('_T13_GovernanceQueue') ||
              ss.insertSheet('_T13_GovernanceQueue');
  sheet.clearContents();
  var hdr = ['RawTrade','DetectedLevel','DetectedDiscipline','SuggestedGroup',
             'SuggestedCollar','CandidateCount','ApprovalStatus','RunDate'];
  sheet.appendRow(hdr);
  sheet.getRange(1,1,1,hdr.length).setFontWeight('bold').setBackground('#5C3A00').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  var now    = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  var counts = {};

  cands.forEach(function(c) {
    var raw = String(c.trade || c.positionApplied || '').trim();
    if (!raw) return;
    var cc = classifyTradeT13_(raw);
    var key = raw.toLowerCase().trim();
    if (!counts[key]) counts[key] = { raw:raw, cls:cc, n:0 };
    counts[key].n++;
  });

  var rows = [], pendingAdded = 0;
  Object.keys(counts).forEach(function(k) {
    var rec   = counts[k];
    // Only queue trades where discipline resolution is weak (GENERAL or discipline unknown)
    var isWeak = rec.cls.group === 'GENERAL_WORKER_GROUP' && rec.cls.discipline === 'GENERAL';
    var status = isWeak ? 'PENDING' : 'KNOWN';

    if (isWeak && rec.n >= 3) { // only queue if at least 3 candidates carry this trade
      var result = suggestClassificationT13_(ss, 'Unknown', 'Unknown', rec.raw, rec.raw);
      if (result.ok && !result.existing) pendingAdded++;
    }

    rows.push([rec.raw, rec.cls.level, rec.cls.discipline, rec.cls.group,
               rec.cls.collar, rec.n, status, now]);
  });

  // Sort: PENDING first, then by candidate count descending
  rows.sort(function(a,b) {
    if (a[6] === 'PENDING' && b[6] !== 'PENDING') return -1;
    if (b[6] === 'PENDING' && a[6] !== 'PENDING') return 1;
    return b[5] - a[5];
  });

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, hdr.length).setValues(rows);
  }
  var pendingTotal = rows.filter(function(r){ return r[6]==='PENDING'; }).length;
  Logger.log('Step 5 — Governance Queue:');
  Logger.log('  Unique trade strings: ' + rows.length);
  Logger.log('  PENDING (unknown, ≥3 candidates): ' + pendingTotal);
  Logger.log('  Queued in _Taxonomy: ' + pendingAdded + ' → _T13_GovernanceQueue');
  return { uniqueTrades: rows.length, pending: pendingTotal, addedToTaxonomy: pendingAdded };
}


// ── STEP 6 — RECRUITER VALIDATION DATASET ───────────────────────────────────
// Picks up to maxReqs active requirements, takes top 10 T13 STRONG per req.
// Export for recruiter to manually score each match Correct / Incorrect.
function recruiterValidationDatasetT13_(maxReqs) {
  maxReqs = maxReqs || 10;
  var ss    = SpreadsheetApp.openById(SS_ID);
  var rs    = ss.getSheetByName('_Requirements');
  if (!rs || rs.getLastRow() < 2) { Logger.log('No requirements.'); return; }
  var rData = rs.getRange(2,1,rs.getLastRow()-1,25).getValues();
  var cands = getAllCandidatesRaw_();

  var sheet = ss.getSheetByName('_T13_ValidationSet') ||
              ss.insertSheet('_T13_ValidationSet');
  sheet.clearContents();
  var hdr = ['ReqId','ReqTrade','ReqGroup','Rank','CandKaiNo','CandName',
             'CandTrade','CandGroup','T13Score','T13Tier','MatchedVia',
             'RecruiterVerdict','RunDate'];
  sheet.appendRow(hdr);
  sheet.getRange(1,1,1,hdr.length).setFontWeight('bold').setBackground('#1A1A5C').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  var now   = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  var rows  = [], reqCount = 0;

  for (var i = 0; i < rData.length && reqCount < maxReqs; i++) {
    var reqId = String(rData[i][0]||'').trim();
    var trade = String(rData[i][4]||'').trim();
    if (!reqId || !trade) continue;
    var status = String(rData[i][14]||'Active').trim();
    if (status === 'Closed' || status === 'Archived') continue;
    reqCount++;

    var reqClass = classifyTradeT13_(trade);
    _t13AffinityCache = null;

    var matches = [];
    cands.forEach(function(c) {
      var candClasses = resolveCandidateTradesT13_(c);
      var e = bestEligibilityT13_(reqClass, candClasses);
      if (e.tier === 'STRONG') {
        matches.push({ c:c, e:e, candGroup:candClasses[0].group });
      }
    });
    matches.sort(function(a,b){ return b.e.score - a.e.score; });

    matches.slice(0,10).forEach(function(m, idx) {
      rows.push([reqId, trade, reqClass.group,
                 idx+1, m.c.kaiNo||'', m.c.name||'',
                 m.c.trade||m.c.positionApplied||'',
                 m.e.viaGroup||m.candGroup, m.e.score, m.e.tier, m.e.via||'',
                 '', now]); // RecruiterVerdict left blank for manual fill
    });
  }

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, hdr.length).setValues(rows);
    // Colour the RecruiterVerdict column light yellow to invite input
    sheet.getRange(2, 12, rows.length, 1).setBackground('#FFFDE7');
  }
  Logger.log('Step 6 — Recruiter Validation Dataset: ' + rows.length +
             ' rows across ' + reqCount + ' requirements → _T13_ValidationSet');
  Logger.log('  Open _T13_ValidationSet, fill column L (RecruiterVerdict) with Correct/Incorrect.');
  return { rows: rows.length, requirements: reqCount };
}


// ── STEP 7 — TRADE FAMILY AUDIT ──────────────────────────────────────────────
// Per eligibility group: how many candidates, how often they appear as STRONG
// across all active requirements.  Shows group coverage vs demand.
function tradeFamilyAuditT13_() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var rs    = ss.getSheetByName('_Requirements');
  if (!rs || rs.getLastRow() < 2) { Logger.log('No requirements.'); return; }
  var rData = rs.getRange(2,1,rs.getLastRow()-1,25).getValues();
  var cands = getAllCandidatesRaw_();

  var sheet = ss.getSheetByName('_T13_FamilyAudit') ||
              ss.insertSheet('_T13_FamilyAudit');
  sheet.clearContents();
  var hdr = ['EligibilityGroup','Collar','CandidateCount','ActiveReqCount',
             'TotalStrongHits','AvgStrongPerReq','DemandCoverage','RunDate'];
  sheet.appendRow(hdr);
  sheet.getRange(1,1,1,hdr.length).setFontWeight('bold').setBackground('#0B3D2E').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  var now = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');

  // Count candidates per group
  var candPerGroup = {};
  cands.forEach(function(c) {
    var classes = resolveCandidateTradesT13_(c);
    var g = classes[0].group;
    candPerGroup[g] = (candPerGroup[g] || 0) + 1;
  });

  // Count active requirements per group + STRONG hits across requirements
  var reqPerGroup    = {};
  var strongPerGroup = {};
  var reqCount = 0;

  for (var i = 0; i < rData.length; i++) {
    var reqId = String(rData[i][0]||'').trim();
    var trade = String(rData[i][4]||'').trim();
    if (!reqId || !trade) continue;
    var status = String(rData[i][14]||'Active').trim();
    if (status === 'Closed' || status === 'Archived') continue;
    reqCount++;

    var reqClass = classifyTradeT13_(trade);
    var rg = reqClass.group;
    reqPerGroup[rg] = (reqPerGroup[rg] || 0) + 1;
    _t13AffinityCache = null;

    cands.forEach(function(c) {
      var e = bestEligibilityT13_(reqClass, resolveCandidateTradesT13_(c));
      if (e.tier === 'STRONG') {
        strongPerGroup[rg] = (strongPerGroup[rg] || 0) + 1;
      }
    });
  }

  // Merge all known groups
  var allGroups = {};
  Object.keys(T13_ALLOWED).forEach(function(g){ allGroups[g] = true; });
  Object.keys(candPerGroup).forEach(function(g){ allGroups[g] = true; });
  Object.keys(reqPerGroup).forEach(function(g){ allGroups[g] = true; });

  var rows = [];
  Object.keys(allGroups).forEach(function(g) {
    var cc   = candPerGroup[g] || 0;
    var rc   = reqPerGroup[g]  || 0;
    var sh   = strongPerGroup[g] || 0;
    var avg  = rc > 0 ? Math.round(sh / rc * 10) / 10 : 0;
    var cov  = rc > 0 ? (cc > 0 ? 'COVERED' : 'NO SUPPLY') : 'NO DEMAND';
    var GROUP_COLLAR = {
      WELDER_GROUP:'BLUE', FABRICATOR_GROUP:'BLUE', FITTER_GROUP:'BLUE',
      RIGGER_GROUP:'BLUE', SCAFFOLDER_GROUP:'BLUE', PAINTER_GROUP:'BLUE',
      ELECTRICIAN_GROUP:'BLUE', INSTRUMENT_GROUP:'BLUE', MECHANICAL_TECH_GROUP:'BLUE',
      CIVIL_TRADE_GROUP:'BLUE', HEAVY_EQUIP_GROUP:'BLUE', GENERAL_WORKER_GROUP:'BLUE',
      WELDING_INSPECTOR_GROUP:'WHITE', NDT_GROUP:'WHITE', QAQC_INSPECTOR_GROUP:'WHITE',
      ENGINEER_GROUP:'WHITE', HSE_GROUP:'WHITE', MANAGER_GROUP:'WHITE',
      SUPERVISOR_GROUP:'GREY', PLANNER_GROUP:'GREY'
    };
    var col = GROUP_COLLAR[g] || '?';
    rows.push([g, col, cc, rc, sh, avg, cov, now]);
  });
  rows.sort(function(a,b){ return b[2] - a[2]; });

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, hdr.length).setValues(rows);
  }
  Logger.log('Step 7 — Trade Family Audit: ' + rows.length + ' groups across ' +
             reqCount + ' active requirements → _T13_FamilyAudit');
  return { groups: rows.length, requirements: reqCount };
}


// ── RUN ALL EVIDENCE STEPS IN SEQUENCE ───────────────────────────────────────
// Helper to run all 7 steps. Call runT13EvidenceSuite_() from the GAS editor.
function runT13EvidenceSuite_() {
  Logger.log('▶ Starting T13 Evidence Suite — ' +
             Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd HH:mm'));
  Logger.log('');

  Logger.log('── Step 1: Compare Engines (ALL requirements) ──');
  compareEnginesT13_();
  Logger.log('');

  Logger.log('── Step 2: False Positive Report ──');
  falsePositiveReportT13_();
  Logger.log('');

  Logger.log('── Step 3: False Negative Report ──');
  falseNegativeReportT13_();
  Logger.log('');

  Logger.log('── Step 4: Dual Trade Analysis ──');
  dualTradeAnalysisT13_();
  Logger.log('');

  Logger.log('── Step 5: Governance Queue ──');
  governanceQueueT13_();
  Logger.log('');

  Logger.log('── Step 6: Recruiter Validation Dataset (10 reqs) ──');
  recruiterValidationDatasetT13_(10);
  Logger.log('');

  Logger.log('── Step 7: Trade Family Audit ──');
  tradeFamilyAuditT13_();
  Logger.log('');

  Logger.log('▶ Evidence Suite COMPLETE. Review these sheets:');
  Logger.log('  _T13_CompareReport   → Step 1 (noise elimination %)');
  Logger.log('  _T13_FalsePositive   → Step 2 (old engine leaks)');
  Logger.log('  _T13_FalseNegative   → Step 3 (T13 new finds)');
  Logger.log('  _T13_DualTrade       → Step 4 (multi-trade matching)');
  Logger.log('  _T13_GovernanceQueue → Step 5 (unknown trades + PENDING queue)');
  Logger.log('  _T13_ValidationSet   → Step 6 (fill column L Correct/Incorrect)');
  Logger.log('  _T13_FamilyAudit     → Step 7 (supply vs demand per group)');
}
