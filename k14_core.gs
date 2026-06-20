/**
 * ═══════════════════════════════════════════════════════════════════
 *  k14_core.gs — KAI INTELLIGENCE CORE
 *  The single, permanent owner of all recruitment intelligence.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Phase 5.1 · Phase 4D execution · One file. One owner. No patch chain.
 *  Repository : safwanyshaikh/alyousuf-recruitment
 *  Branch     : claude/sweet-franklin-mnmfcz
 *  Governed by: K14_OWNERSHIP_AUDIT.md · K14_CONSOLIDATION_PLAN.md
 *
 *  MANDATE (non-negotiable)
 *  ─────────────────────────────────────────────────────────────────
 *  • This is the ONLY intelligence file. There is no k14_reason.gs,
 *    k14_classify.gs, k14_memory.gs, k14_outcomes.gs, or k14_learn.gs.
 *    The modules below are SECTIONS of this one file, not files.
 *  • Patch files (v280–v294) are evidence sources only. Nothing here
 *    imports from a patch_vNNN file at runtime.
 *  • Foundation owns identity + relationships. K14 READS Foundation
 *    truth (read-only) and never writes it.
 *  • Infrastructure owns Gemini, Email, Auth, Quota, Logging. K14 calls
 *    THROUGH infrastructure (see k14Gemini_ seam) — it never owns a
 *    service.
 *  • Execution consumes K14 outputs but never generates intelligence.
 *  • UI (index.html, dashboards, Lovable) are presentation-only
 *    consumers of the K14.* public surface at the bottom of this file.
 *
 *  MIGRATED FROM (canonical sources, minimal behavioral change)
 *  ─────────────────────────────────────────────────────────────────
 *  v285  → CLASSIFY (trade taxonomy) + REASON (scoring + match engine)
 *  v288  → REASON (freshness label / urgency for display)
 *  v286  → CLASSIFY (email classifier)
 *  v293  → INTAKE  (multimodal PDF JD extraction)
 *
 *  CROSS-LAYER DEPENDENCIES (the only seams K14 is allowed)
 *  ─────────────────────────────────────────────────────────────────
 *  Infrastructure : getMasterSS_()        — sheets accessor
 *                   k14Gemini_()          — Gemini gateway seam (below)
 *                   CacheService, Logger  — platform services
 *  Foundation/Cfg : CONFIG, CONFIG_V2     — sheet names + column maps
 *
 *  SECTION INDEX
 *  ─────────────────────────────────────────────────────────────────
 *  K0   NAMESPACE + INFRASTRUCTURE SEAMS
 *  K1   CLASSIFY · Trade Taxonomy        (from v285 S82)
 *  K2   CLASSIFY · Email Classifier      (from v286 S76)
 *  K3   REASON   · Freshness             (from v288 S98 + v285 S83.F01)
 *  K4   REASON   · Candidate Scoring     (from v285 S83)
 *  K5   REASON   · Match Engine          (from v285 S84)
 *  K6   INTAKE   · JD Extraction         (from v293 S93.F01)
 *  K7   FOUNDATION READ ADAPTERS         (read-only truth access)
 *  K8   PUBLIC SURFACE — K14.* + dashboard entry points
 * ═══════════════════════════════════════════════════════════════════
 */


// ═══════════════════════════════════════════════════════════════════
// K0 · NAMESPACE + INFRASTRUCTURE SEAMS
// ═══════════════════════════════════════════════════════════════════

var K14_CORE = {
  version: '1.0',
  build:   '2026-06-20',
  owner:   'K14 Intelligence Core',
  tz:      'Asia/Kolkata'
};

/**
 * K0.F01 — The ONLY Gemini seam K14 is permitted.
 * K14 never owns the gateway (Constraint 9: Infrastructure owns Gemini).
 * It calls through whatever Infrastructure gateway is present.
 *
 * Resolution order:
 *   1. kaiGeminiGenerate_  — canonical Infrastructure gateway (target)
 *   2. callGemini_v291_    — transitional gateway (still physically in
 *                            patch_v291 until Infrastructure extraction
 *                            relocates it; see migration report)
 */
function k14Gemini_(parts, schema) {
  if (typeof kaiGeminiGenerate_ === 'function') return kaiGeminiGenerate_(parts, schema);
  if (typeof callGemini_v291_   === 'function') return callGemini_v291_(parts, schema);
  throw new Error('K14: no Infrastructure Gemini gateway available.');
}

/** K0.F02 — Resolve the master spreadsheet via Infrastructure accessor. */
function k14MasterSS_() {
  if (typeof getMasterSS_ === 'function') return getMasterSS_();
  throw new Error('K14: Infrastructure getMasterSS_() not available.');
}


// ═══════════════════════════════════════════════════════════════════
// K1 · CLASSIFY — TRADE TAXONOMY  (migrated verbatim from v285 S82)
// GCC trade groups. primary = canonical, similar = equivalents,
// related = adjacent trades. Three-pass lookup guarantees a primary
// match in ANY group beats a related match in an earlier group.
// ═══════════════════════════════════════════════════════════════════

var TRADE_GROUPS_V285_ = [

  { id: 'structural_steel', label: 'Structural Steel',
    primary: ['structural steel fabricator','structural fabricator','steel fabricator',
      'st fabricator','structural steel erector','structural erector',
      'structural steel fitter','structural steelwork fabricator'],
    similar: ['structural fitter','plate fitter','steelwork fabricator',
      'structural welder','steel fitter','structural ironworker','iron worker'],
    related: ['rigger','steel erector','fabricator helper','scaffolder','crane rigger','ironworker'] },

  { id: 'pipe_fitting', label: 'Pipe Fitting / Piping',
    primary: ['pipe fitter','pipefitter','piping fitter','pipe mechanic','piping erector','mechanical pipe fitter'],
    similar: ['pipe welder','pipe fabricator','pipeline fitter','pipe plumber','industrial plumber','plumber','pipework fitter'],
    related: ['mechanical fitter','instrument fitter','valve technician','pressure vessel fitter'] },

  { id: 'welding', label: 'Welding',
    primary: ['welder','coded welder','certified welder','structural welder','pipe welder','pressure welder','6g welder','3g welder'],
    similar: ['mig welder','tig welder','smaw welder','fcaw welder','saw welder','gtaw welder','gmaw welder','flux core welder','stick welder'],
    related: ['fabricator','cutting technician','grinding technician','welder helper','fitter welder'] },

  { id: 'electrical', label: 'Electrical',
    primary: ['electrician','electrical technician','electrical engineer','industrial electrician','maintenance electrician'],
    similar: ['wireman','cable jointer','cable puller','switchboard operator','panel wireman','lineman','hv electrician','lv electrician','mv electrician','cable technician'],
    related: ['instrument technician','hvac technician','transformer technician','substation operator','power plant electrician'] },

  { id: 'instrumentation', label: 'Instrumentation / Control',
    primary: ['instrument technician','instrumentation technician','instrument fitter','control technician','field instrument technician'],
    similar: ['inst tech','control room operator','dcs operator','scada technician','plc technician','calibration technician','metering technician','analyser technician','safety instrumentation technician'],
    related: ['electrical technician','hvac controls','automation technician','instrument engineer','commissioning technician'] },

  { id: 'hvac', label: 'HVAC / Air Conditioning',
    primary: ['hvac technician','ac technician','air conditioning technician','hvac mechanic','ac mechanic','a c mechanic','hvac engineer','air conditioning mechanic'],
    similar: ['refrigeration technician','hvac engineer','chiller technician','bms technician','mep technician','ahu technician','vrf technician'],
    related: ['electrical technician','pipe fitter','mechanical technician','building services technician','facilities technician'] },

  { id: 'civil', label: 'Civil / Construction',
    primary: ['mason','bricklayer','block layer','concrete worker','shuttering carpenter','formwork carpenter','bar bender','steel fixer','rebar fixer','rebar bender'],
    similar: ['civil worker','construction worker','floor layer','tile fixer','plasterer','civil mason','waterproofing applicator'],
    related: ['civil helper','laborer','construction helper','general worker','site helper','building worker'] },

  { id: 'painting', label: 'Industrial Painting / Blasting',
    primary: ['industrial painter','painter','spray painter','coating applicator','industrial blaster','grit blaster','sandblaster'],
    similar: ['surface preparation technician','corrosion protection applicator','fireproofing applicator','protective coatings applicator','painter blaster'],
    related: ['painter helper','structural steel worker','scaffolder','rope access technician','coating inspector'] },

  { id: 'scaffolding', label: 'Scaffolding',
    primary: ['scaffolder','scaffold erector','scaffolding erector','tube and fitting scaffolder','system scaffolder'],
    similar: ['scaffold supervisor','scaffold inspector','scaffold coordinator','leading scaffolder','access erector'],
    related: ['rigger','rope access technician','construction worker','insulation installer','painter'] },

  { id: 'mechanical', label: 'Mechanical / Maintenance',
    primary: ['mechanical fitter','mechanical technician','mechanic','maintenance technician','plant mechanic','rotating equipment technician'],
    similar: ['equipment mechanic','machine fitter','turbine technician','pump technician','compressor technician','gearbox technician','general mechanic'],
    related: ['pipe fitter','instrument technician','hvac technician','vibration analyst','lubrication technician'] },

  { id: 'rigging', label: 'Rigging / Lifting',
    primary: ['rigger','rigging supervisor','crane rigger','lifting rigger','industrial rigger'],
    similar: ['banksman','signal man','lifting supervisor','slinger rigger','dogman','rigging technician','heavy lift rigger'],
    related: ['scaffolder','crane operator','forklift operator','structural steel worker'] },

  { id: 'driving', label: 'Driving / Transport',
    primary: ['heavy driver','hgv driver','trailer driver','tanker driver','tipper driver','truck driver'],
    similar: ['ltv driver','bus driver','mini bus driver','pickup driver','car driver','light vehicle driver','staff bus driver'],
    related: ['forklift operator','mobile crane operator','vehicle coordinator','transport coordinator'] },

  { id: 'crane_plant', label: 'Crane / Heavy Plant Operations',
    primary: ['crane operator','mobile crane operator','tower crane operator','overhead crane operator','crawler crane operator'],
    similar: ['forklift operator','telehandler operator','rough terrain crane operator','pick and carry operator','all terrain crane operator'],
    related: ['jcb operator','excavator operator','backhoe operator','plant operator','heavy driver','rigger'] },

  { id: 'hse', label: 'HSE / Safety',
    primary: ['safety officer','hse officer','safety engineer','osh officer','safety advisor','health safety environment officer'],
    similar: ['safety supervisor','fire warden','safety inspector','hse coordinator','safety technician','fire safety officer','process safety engineer'],
    related: ['project engineer','first aider','security officer','risk assessor','toolbox talk coordinator'] },

  { id: 'qaqc', label: 'QA/QC / Inspection',
    primary: ['qc inspector','qa qc inspector','quality inspector','ndt inspector','welding inspector','cwi','cswip'],
    similar: ['qc engineer','qa engineer','quality engineer','ndt technician','ut technician','rt inspector','mt inspector','pt inspector','civil qc inspector','structural qc inspector'],
    related: ['site engineer','project engineer','metrologist','dimensional control inspector'] },

  { id: 'civil_supervisor', label: 'Civil Supervision',
    primary: ['civil foreman','construction supervisor','site supervisor','site foreman','general foreman','area supervisor'],
    similar: ['civil supervisor','sub foreman','leading hand','charge hand','construction foreman','structural supervisor','gang foreman'],
    related: ['project engineer','planning engineer','site engineer','area engineer','works supervisor'] },

  { id: 'admin', label: 'Administration / Office',
    primary: ['admin officer','administrative officer','office administrator','office manager','administrative assistant'],
    similar: ['hr assistant','secretary','receptionist','document controller','document control officer','records clerk','office clerk'],
    related: ['hr officer','project coordinator','procurement officer','account assistant','logistics coordinator'] },

  { id: 'store_logistics', label: 'Stores / Logistics',
    primary: ['store keeper','storekeeper','warehouse keeper','stores officer','warehouse supervisor','inventory controller'],
    similar: ['logistics coordinator','material controller','material engineer','expeditor','supply chain coordinator','warehouse assistant'],
    related: ['admin officer','purchasing officer','document controller','forklift operator','fleet coordinator'] },

  { id: 'surveying', label: 'Surveying',
    primary: ['surveyor','civil surveyor','layout surveyor','quantity surveyor','survey technician'],
    similar: ['survey engineer','leveling technician','gps surveyor','total station operator','qs engineer','cost estimator'],
    related: ['civil engineer','site engineer','project engineer','planning engineer','as built surveyor'] },

  { id: 'engineering', label: 'Engineering (Professional)',
    primary: ['civil engineer','structural engineer','mechanical engineer','electrical engineer','process engineer','chemical engineer','petroleum engineer'],
    similar: ['project engineer','site engineer','design engineer','planning engineer','commissioning engineer','cost engineer','piping engineer','instrument engineer'],
    related: ['project manager','construction manager','technical advisor','consultant','technical coordinator'] }

]; // end TRADE_GROUPS_V285_


/** K1.F01 — Normalize a trade string for comparison. (v285 S82.F01) */
function normalizeTrade285_(trade) {
  if (!trade) return '';
  return String(trade)
    .toLowerCase()
    .replace(/\ba\/c\b/g,  'ac')
    .replace(/\bqa\/qc\b/g,'qa qc')
    .replace(/[\/\-\(\)\.&,]+/g, ' ')
    .replace(/\bsr\b/g,   'senior')
    .replace(/\bjr\b/g,   'junior')
    .replace(/\bqc\b/g,   'quality control')
    .replace(/\bqa\b/g,   'quality assurance')
    .replace(/\bhse\b/g,  'health safety environment')
    .replace(/\bhvac\b/g, 'heating ventilation air conditioning')
    .replace(/\bndt\b/g,  'non destructive testing')
    .replace(/\bst\b/g,   'structural')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** K1.F02 — Token-based trade term matching (anti-greedy). (v285 S82.F01b) */
function tradeTermMatch285_(input, pattern) {
  if (!input || !pattern) return false;
  if (input === pattern) return true;

  var STOP_ = { 'and':1,'the':1,'for':1,'with':1,'in':1,'of':1,'to':1,'a':1,'an':1 };
  function tokenize(s) {
    return s.split(/\s+/).filter(function(t) { return t.length > 2 && !STOP_[t]; });
  }

  var iToks = tokenize(input);
  var pToks = tokenize(pattern);
  if (iToks.length === 0 || pToks.length === 0) return false;

  if (pToks.length === 1) return iToks.length === 1 && iToks[0] === pToks[0];
  if (iToks.length === 1) return pToks.length === 1 && pToks[0] === iToks[0];

  var shorter = pToks.length <= iToks.length ? pToks : iToks;
  var longer  = pToks.length <= iToks.length ? iToks  : pToks;

  var allIn = shorter.every(function(t) { return longer.indexOf(t) > -1; });
  if (!allIn) return false;

  var extra = longer.filter(function(t) { return shorter.indexOf(t) < 0; });
  return extra.length <= 2;
}

/** K1.F03 — Three-pass taxonomy group lookup. (v285 S82.F02) */
function findTradeGroup285_(trade) {
  var norm = normalizeTrade285_(trade);
  if (!norm) return { groupId: null, matchLevel: null };

  var g, grp, i, termNorm;

  for (g = 0; g < TRADE_GROUPS_V285_.length; g++) {
    grp = TRADE_GROUPS_V285_[g];
    for (i = 0; i < grp.primary.length; i++) {
      termNorm = normalizeTrade285_(grp.primary[i]);
      if (norm === termNorm || tradeTermMatch285_(norm, termNorm))
        return { groupId: grp.id, matchLevel: 'primary', label: grp.label };
    }
  }
  for (g = 0; g < TRADE_GROUPS_V285_.length; g++) {
    grp = TRADE_GROUPS_V285_[g];
    for (i = 0; i < grp.similar.length; i++) {
      termNorm = normalizeTrade285_(grp.similar[i]);
      if (norm === termNorm || tradeTermMatch285_(norm, termNorm))
        return { groupId: grp.id, matchLevel: 'similar', label: grp.label };
    }
  }
  for (g = 0; g < TRADE_GROUPS_V285_.length; g++) {
    grp = TRADE_GROUPS_V285_[g];
    for (i = 0; i < grp.related.length; i++) {
      termNorm = normalizeTrade285_(grp.related[i]);
      if (norm === termNorm || tradeTermMatch285_(norm, termNorm))
        return { groupId: grp.id, matchLevel: 'related', label: grp.label };
    }
  }
  return { groupId: null, matchLevel: null };
}

/** K1.F04 — Trade similarity score 0–40. (v285 S82.F03) */
function getTradeScore285_(candidateTrade, reqTrade) {
  if (!candidateTrade || !reqTrade) return 0;

  var cNorm = normalizeTrade285_(candidateTrade);
  var rNorm = normalizeTrade285_(reqTrade);

  if (cNorm === rNorm) return 40;
  if (tradeTermMatch285_(cNorm, rNorm)) return 38;

  var cGroup = findTradeGroup285_(candidateTrade);
  var rGroup = findTradeGroup285_(reqTrade);

  if (!cGroup.groupId || !rGroup.groupId) {
    var STOP2_ = { 'and':1,'the':1,'for':1,'with':1,'in':1,'of':1,'to':1,'a':1,'an':1 };
    var cTokens = cNorm.split(' ').filter(function(t){ return t.length > 3 && !STOP2_[t]; });
    var rTokens = rNorm.split(' ').filter(function(t){ return t.length > 3 && !STOP2_[t]; });
    var overlap = 0;
    cTokens.forEach(function(t) { if (rTokens.indexOf(t) > -1) overlap++; });
    if (overlap >= 2) return 15;
    if (overlap === 1) return 8;
    return 0;
  }

  if (cGroup.groupId !== rGroup.groupId) return 0;

  var cLevel = cGroup.matchLevel;
  var rLevel = rGroup.matchLevel;
  if (cLevel === 'primary' && rLevel === 'primary')   return 38;
  if (cLevel === 'primary' && rLevel === 'similar')   return 32;
  if (cLevel === 'similar' && rLevel === 'primary')   return 32;
  if (cLevel === 'similar' && rLevel === 'similar')   return 28;
  if (cLevel === 'primary' && rLevel === 'related')   return 22;
  if (cLevel === 'related' && rLevel === 'primary')   return 22;
  if (cLevel === 'similar' && rLevel === 'related')   return 18;
  if (cLevel === 'related' && rLevel === 'similar')   return 18;
  if (cLevel === 'related' && rLevel === 'related')   return 10;
  return 10;
}


// ═══════════════════════════════════════════════════════════════════
// K2 · CLASSIFY — EMAIL CLASSIFIER  (migrated verbatim from v286 S76)
// ═══════════════════════════════════════════════════════════════════

var EMAIL_TYPE_ = {
  CV_APPLICATION:'CV_APPLICATION', JD_REQUIREMENT:'JD_REQUIREMENT',
  REPLY_TO_PENDING:'REPLY_TO_PENDING', INTERNAL:'INTERNAL',
  CLIENT_EMAIL:'CLIENT_EMAIL', SUB_AGENCY:'SUB_AGENCY',
  MARKETING_SPAM:'MARKETING_SPAM', SYSTEM_BOUNCE:'SYSTEM_BOUNCE', UNKNOWN:'UNKNOWN'
};

var PROTECTED_DOMAINS_ = [
  'alyousufent.com','alyousuf.com','aramco.com','saudiaramco.com','sabic.com',
  'neom.com','aramco.com.sa','adnoc.ae','petrofac.com','worleyparsons.com',
  'technimont.com','kentz.com','naffco.com'
];

var SPAM_PATTERNS_ = [
  /naukri\.com/i,/monster\.com/i,/indeed\.com/i,/linkedin\.com/i,/bayt\.com/i,
  /gulftalent\.com/i,/noreply@/i,/no-reply@/i,/donotreply@/i,/notifications?@/i,
  /alerts?@/i,/newsletter@/i,/unsubscribe/i,/mailer-daemon/i,/postmaster@/i,/bounce[d]?@/i
];

var JD_SIGNALS_ = [
  /urgently\s+required/i,/manpower\s+requirement/i,/manpower\s+requisition/i,
  /requirement\s+for\s+\d+/i,/\d+\s+nos?\s+(required|needed|urgently)/i,
  /we\s+(?:are\s+)?(?:looking|seeking)\s+for/i,/job\s+description/i,
  /position[s]?\s+available/i,/vacancy|vacancies/i,/hiring\s+for/i,/trade\s*:/i,
  /qty\s*:/i,/quantity\s*:/i,
  /deployment\s+to\s+(?:saudi|uae|qatar|kuwait|oman|bahrain)/i,
  /iqama\s+transfer\s+accepted/i,/salary\s*:\s*(?:sar|aed|omr|qar)/i
];

var CV_SIGNALS_ = [
  /please\s+find\s+(?:my|attached|enclosed)/i,
  /i\s+(?:am\s+)?(?:applying|interested|submitting)/i,
  /kindly\s+(?:consider|review|find)/i,
  /attached\s+(?:is\s+)?(?:my|the)\s+(?:cv|resume)/i,
  /cv\s+(?:for\s+)?(?:your\s+)?(?:consideration|review|reference)/i,
  /seeking\s+(?:a\s+)?(?:suitable\s+)?(?:position|job|opportunity|role)/i,
  /years?\s+of\s+experience/i,/currently\s+(?:working|employed|based)/i,
  /my\s+(?:total\s+)?experience/i,/gulf\s+experience/i,
  /available\s+(?:for\s+)?(?:immediate|joining)/i
];

var REPLY_SIGNALS_ = [
  /(?:please\s+find|here\s+is|attaching|enclosed)\s+(?:my\s+)?(?:passport|visa|iqama|certificate|document)/i,
  /as\s+(?:requested|per\s+your\s+request|you\s+asked)/i,
  /(?:date\s+of\s+birth|dob)\s*[:\-]/i,
  /my\s+(?:passport\s+(?:number|expiry|copy)|iqama|visa)\s*[:\-]/i,
  /current(?:ly)?\s+(?:in|at|based\s+in)\s+/i,
  /(?:notice\s+period|available\s+from)\s*[:\-]/i,
  /(?:ecr|ecnr)\s*[:\-]/i,/i\s+am\s+(?:currently\s+)?(?:in|at)\s+/i
];

/** K2.F01 — Main email classifier. (v286 S76.F01) */
function classifyEmail_(from, subject, body, hasAttachment, attachmentNames) {
  var result = { type: EMAIL_TYPE_.UNKNOWN, confidence: 0, signals: [] };
  attachmentNames = attachmentNames || [];

  var fromLower    = (from || '').toLowerCase();
  var subjectLower = (subject || '').toLowerCase();
  var bodyLower    = (body || '').toLowerCase().slice(0, 3000);
  var fullText     = subjectLower + ' ' + bodyLower;

  if (/mailer-daemon|postmaster|delivery.*fail|undeliverable/i.test(from + subject)) {
    return { type: EMAIL_TYPE_.SYSTEM_BOUNCE, confidence: 0.99, signals: ['mailer-daemon'] };
  }

  for (var si = 0; si < SPAM_PATTERNS_.length; si++) {
    if (SPAM_PATTERNS_[si].test(fromLower)) {
      return { type: EMAIL_TYPE_.MARKETING_SPAM, confidence: 0.95,
               signals: ['spam-pattern:' + SPAM_PATTERNS_[si].source.slice(0,30)] };
    }
  }

  var senderDomain = fromLower.split('@')[1] || '';
  for (var di = 0; di < PROTECTED_DOMAINS_.length; di++) {
    if (senderDomain === PROTECTED_DOMAINS_[di] || senderDomain.endsWith('.' + PROTECTED_DOMAINS_[di])) {
      result.signals.push('protected-domain:' + senderDomain);
      var jdScore0 = countSignals_(fullText, JD_SIGNALS_);
      if (jdScore0 > 0) return { type: EMAIL_TYPE_.CLIENT_EMAIL, confidence: 0.9, signals: result.signals };
      return { type: EMAIL_TYPE_.INTERNAL, confidence: 0.95, signals: result.signals };
    }
  }

  var hasCvAttachment = hasAttachment && attachmentNames.some(function(n) {
    return /\.(pdf|doc|docx)$/i.test(n) && !/jd|job.desc|requirement|manpower/i.test(n);
  });
  var hasJdAttachment = hasAttachment && attachmentNames.some(function(n) {
    return /jd|job.desc|requirement|manpower|vacancy|position/i.test(n) ||
           (/\.(xlsx?|pdf)$/i.test(n) && /requirement|manpower|jd/i.test(n));
  });

  var isReply = /^re:/i.test(subject) || /^fwd?:/i.test(subject);
  if (isReply) {
    var replyScore = countSignals_(fullText, REPLY_SIGNALS_);
    var kaiNoMatch = (body || '').match(/AYE-KAI-\d{4}-\d{6}/i) ||
                     (subject || '').match(/AYE-KAI-\d{4}-\d{6}/i);
    if (kaiNoMatch || replyScore >= 2) {
      return { type: EMAIL_TYPE_.REPLY_TO_PENDING, confidence: 0.85 + Math.min(replyScore*0.03, 0.1),
               signals: ['is-reply', 'reply-signals:' + replyScore, kaiNoMatch ? 'kai-no-match' : ''] };
    }
  }

  var jdScore = countSignals_(fullText, JD_SIGNALS_);
  if (hasJdAttachment) jdScore += 3;
  if (jdScore >= 3) {
    return { type: EMAIL_TYPE_.JD_REQUIREMENT, confidence: Math.min(0.5 + jdScore * 0.08, 0.96),
             signals: ['jd-signals:' + jdScore, hasJdAttachment ? 'jd-attachment' : ''] };
  }

  var cvScore = countSignals_(fullText, CV_SIGNALS_);
  if (hasCvAttachment) cvScore += 4;
  if (cvScore >= 2) {
    return { type: EMAIL_TYPE_.CV_APPLICATION, confidence: Math.min(0.45 + cvScore * 0.1, 0.97),
             signals: ['cv-signals:' + cvScore, hasCvAttachment ? 'cv-attachment' : ''] };
  }

  if (jdScore >= 1) {
    return { type: EMAIL_TYPE_.JD_REQUIREMENT, confidence: 0.4 + jdScore * 0.05,
             signals: ['jd-weak:' + jdScore] };
  }
  return { type: EMAIL_TYPE_.UNKNOWN, confidence: 0.3, signals: ['no-strong-signal'] };
}

/** K2.F02 — Count pattern matches in text. (v286 helper) */
function countSignals_(text, patterns) {
  var count = 0;
  patterns.forEach(function(p) { if (p.test(text)) count++; });
  return count;
}


// ═══════════════════════════════════════════════════════════════════
// K3 · REASON — FRESHNESS
// Two distinct freshness signals, each retained for its own purpose
// (reconciliation note in migration report):
//   • match-axis score 0–30   (v285 S83.F01)  → feeds the match score
//   • display label + urgency  (v288 S98)      → feeds UI freshness chips
// ═══════════════════════════════════════════════════════════════════

/** K3.F01 — Match-axis freshness score 0–30 from application date. (v285 S83.F01) */
function getFreshnessScore285_(appDateStr) {
  if (!appDateStr) return 2;
  try {
    var appDate = new Date(appDateStr);
    if (isNaN(appDate.getTime())) return 2;
    var days = Math.floor((Date.now() - appDate.getTime()) / 86400000);
    if (days <= 0)   return 30;
    if (days === 1)  return 28;
    if (days <= 7)   return 25;
    if (days <= 15)  return 22;
    if (days <= 30)  return 18;
    if (days <= 45)  return 14;
    if (days <= 60)  return 11;
    if (days <= 90)  return 8;
    if (days <= 180) return 4;
    return 1;
  } catch(e) { return 2; }
}

/** K3.F02 — Display freshness label (weekday-based). (v288 S98.F01) */
function getCvFreshnessV288_(applicationDate) {
  if (!applicationDate) return '';
  var d = (applicationDate instanceof Date) ? applicationDate
        : new Date(String(applicationDate).slice(0,10));
  if (isNaN(d.getTime())) return '';

  var tz       = K14_CORE.tz;
  var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var today    = new Date(todayStr);
  var appDay   = new Date(Utilities.formatDate(d, tz, 'yyyy-MM-dd'));
  if (appDay > today) return '';

  var diffDays = Math.round((today - appDay) / 86400000);

  var dow          = today.getDay();
  var daysToMonday = (dow === 0) ? 6 : dow - 1;
  var weekStart    = new Date(today);
  weekStart.setDate(today.getDate() - daysToMonday);

  if (appDay >= weekStart && appDay <= today) {
    var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return DAYS[d.getDay()];
  }
  if (diffDays <= 15)  return '15 Days';
  if (diffDays <= 30)  return '30 Days';
  if (diffDays <= 45)  return '45 Days';
  if (diffDays <= 60)  return '60 Days';
  if (diffDays <= 90)  return '3 Month';
  if (diffDays <= 120) return '4 Month';
  if (diffDays <= 150) return '5 Month';
  if (diffDays <= 180) return '6 Month';
  return 'Legacy';
}

/** K3.F03 — Freshness label → display score. (v288 S98.F02) */
function getFreshnessScoreV288_(applicationDate) {
  var label = getCvFreshnessV288_(applicationDate);
  var scores = {
    'Monday':30,'Tuesday':30,'Wednesday':30,'Thursday':30,'Friday':30,'Saturday':28,'Sunday':28,
    '15 Days':22,'30 Days':18,'45 Days':14,'60 Days':11,
    '3 Month':8,'4 Month':6,'5 Month':4,'6 Month':2,'Legacy':1
  };
  return scores[label] !== undefined ? scores[label] : 1;
}

/** K3.F04 — Freshness urgency chip. (v288 S98.F03) */
function getFreshnessUrgencyV288_(applicationDate) {
  var label = getCvFreshnessV288_(applicationDate);
  var weekdays = {'Monday':1,'Tuesday':1,'Wednesday':1,'Thursday':1,'Friday':1,'Saturday':1,'Sunday':1};
  if (weekdays[label])      return 'HOT';
  if (label === '15 Days')  return 'HOT';
  if (label === '30 Days')  return 'WARM';
  if (label === '45 Days')  return 'WARM';
  if (label === '60 Days')  return 'COOL';
  return 'COLD';
}


// ═══════════════════════════════════════════════════════════════════
// K4 · REASON — CANDIDATE SCORING  (migrated verbatim from v285 S83)
// ═══════════════════════════════════════════════════════════════════

/** K4.F01 — Deploy readiness score 0–15. (v285 S83.F02) */
function getDeployReadyScore285_(candidateState, deployabilityScore) {
  var dScore = parseFloat(deployabilityScore) || 0;
  if (dScore >= 80) return 15;
  if (dScore >= 65) return 12;
  if (dScore >= 50) return 9;
  if (dScore >= 30) return 6;
  if (dScore > 0)   return 4;

  var state = String(candidateState || '').toUpperCase().trim();
  var stateMap = {
    'READY_TO_DEPLOY':15,'INDIA_READY':14,'GCC_RETURN':13,'SHORTLISTED':11,
    'UNDER_REVIEW':9,'PARSED':8,'NEW':7,'FRESHER_POOL':6,'INCOMPLETE_CONTACT':5,
    'UNKNOWN_TRADE':4,'HOLD':3,'VISA_PROCESS':2,'MEDICAL_PENDING':2,'DEPLOYED':0,'REJECTED':0
  };
  return stateMap[state] !== undefined ? stateMap[state] : 5;
}

/** K4.F02 — Experience match score 0–10. (v285 S83.F03) */
function getExperienceScore285_(candidateExpStr, reqMinYearsStr) {
  var cExp   = parseFloat(String(candidateExpStr || '').replace(/[^\d\.]/g,'')) || 0;
  var reqMin = parseFloat(String(reqMinYearsStr  || '').replace(/[^\d\.]/g,'')) || 0;
  if (reqMin === 0) return 7;
  if (cExp === 0)   return 3;
  var gap = cExp - reqMin;
  if (gap >= 0 && gap <= 5) return 10;
  if (gap > 5)              return 9;
  if (gap >= -2)            return 6;
  if (gap >= -5)            return 3;
  return 1;
}

/** K4.F03 — Gulf experience bonus 0–5. (v285 S83.F04) */
function getGulfExpScore285_(gulfExpStr) {
  var gExp = parseFloat(String(gulfExpStr || '').replace(/[^\d\.]/g,'')) || 0;
  if (gExp >= 5) return 5;
  if (gExp >= 3) return 4;
  if (gExp >= 1) return 3;
  if (gExp > 0)  return 2;
  return 0;
}

/** K4.F04 — Nationality preference match 0–5. (v285 S83.F05) */
function getNationalityScore285_(candidateNationality, reqGccPref) {
  var cNat = String(candidateNationality || '').toLowerCase().trim();
  var pref = String(reqGccPref || '').toLowerCase().trim();
  if (!pref || pref === 'any' || pref === 'gcc' || pref === '') return 3;

  var NATIONALITY_MAP_ = {
    'indian':['india','indian'],'pakistani':['pakistan','pakistani'],
    'nepali':['nepal','nepali','nepalese'],'bangladeshi':['bangladesh','bangladeshi'],
    'filipino':['philippines','filipino','filipina'],'sri lankan':['sri lanka','sri lankan'],
    'arab':['saudi','uae','qatar','kuwait','bahrain','oman','jordan','egypt','syria','iraq','lebanon','yemen'],
    'gcc':['saudi','uae','qatar','kuwait','bahrain','oman']
  };
  var prefNats = NATIONALITY_MAP_[pref] || [pref];
  for (var i = 0; i < prefNats.length; i++) {
    if (cNat.indexOf(prefNats[i]) > -1) return 5;
  }
  return 1;
}

/** K4.F05 — Passport validity score 0–5. (v285 S83.F06) */
function getPassportScore285_(passportExpiry) {
  if (!passportExpiry || passportExpiry === '' || passportExpiry === 'Unknown') return 2;
  try {
    var exp = new Date(passportExpiry);
    if (isNaN(exp.getTime())) return 2;
    var daysLeft = Math.floor((exp.getTime() - Date.now()) / 86400000);
    if (daysLeft > 180) return 5;
    if (daysLeft > 90)  return 3;
    if (daysLeft > 0)   return 1;
    return 0;
  } catch(e) { return 2; }
}

/**
 * K4.F06 — Total match score for one candidate vs one requirement. (v285 S83.F07)
 * Axes: trade 0-40 · freshness 0-30 · deployReady 0-15 · experience 0-10 ·
 *       gulfExp 0-5 · nationality 0-5 · passport 0-5  → capped 0-100.
 * Tiers: STRONG ≥75 · GOOD ≥55 · POSSIBLE ≥35 · LONG_SHOT <35.
 */
function computeMatchScore285_(candidate, req) {
  var tradeScore    = getTradeScore285_(candidate.trade, req.trade);
  var freshScore    = getFreshnessScore285_(candidate.appDate);
  var deployScore   = getDeployReadyScore285_(candidate.candidateState, candidate.deployabilityScore);
  var expScore      = getExperienceScore285_(candidate.experience, req.minExperience);
  var gulfScore     = getGulfExpScore285_(candidate.gulfExp);
  var natScore      = getNationalityScore285_(candidate.nationality, req.gccPref);
  var passportScore = getPassportScore285_(candidate.passportExpiry);

  var total = tradeScore + freshScore + deployScore + expScore + gulfScore + natScore + passportScore;
  total = Math.min(100, Math.max(0, total));

  var tier = total >= 75 ? 'STRONG' : total >= 55 ? 'GOOD' : total >= 35 ? 'POSSIBLE' : 'LONG_SHOT';

  var signals = [];
  if (tradeScore >= 38)       signals.push('exact trade match');
  else if (tradeScore >= 28)  signals.push('same trade group');
  else if (tradeScore >= 18)  signals.push('related trade');
  else if (tradeScore > 0)    signals.push('partial trade overlap');
  else                        signals.push('trade mismatch');

  if (freshScore >= 17)       signals.push('active candidate (≤30d)');
  else if (freshScore >= 10)  signals.push('recent candidate');
  else if (freshScore <= 3)   signals.push('aged profile');

  if (deployScore >= 13)      signals.push('deploy ready');
  else if (deployScore >= 8)  signals.push('available');
  else if (deployScore <= 3)  signals.push('deployment uncertain');

  if (expScore === 10)        signals.push('experience meets req');
  else if (expScore <= 3)     signals.push('experience below req');

  if (gulfScore >= 4)         signals.push('strong GCC exp');
  else if (gulfScore >= 2)    signals.push('some GCC exp');

  if (natScore === 5)         signals.push('preferred nationality');
  if (passportScore === 5)    signals.push('passport valid');
  else if (passportScore === 0) signals.push('passport expired');

  return {
    total: total, tier: tier,
    breakdown: { trade:tradeScore, freshness:freshScore, deployReady:deployScore,
                 experience:expScore, gulfExp:gulfScore, nationality:natScore, passport:passportScore },
    signals: signals
  };
}


// ═══════════════════════════════════════════════════════════════════
// K5 · REASON — MATCH ENGINE  (migrated verbatim from v285 S84)
// ═══════════════════════════════════════════════════════════════════

/**
 * K5.F01 — Rank all active candidates against a requirement.
 * Pure compute, read-only against Foundation truth (K7 adapters).
 */
function matchCandidatesForReq285_(reqId, limit, tierFloor) {
  limit     = limit     || 20;
  tierFloor = tierFloor || 'POSSIBLE';

  var req = loadRequirementById285_(reqId);
  if (!req) return { ok: false, msg: 'Requirement ' + reqId + ' not found.' };

  var candidates = loadCandidates285_();
  if (candidates.length === 0) return { ok: false, msg: 'No candidates in sheet.' };

  var TIER_ORDER_ = { 'STRONG':4, 'GOOD':3, 'POSSIBLE':2, 'LONG_SHOT':1 };
  var floorVal    = TIER_ORDER_[tierFloor] || 2;

  var scored = [];
  candidates.forEach(function(c) {
    var result = computeMatchScore285_(c, req);
    if (TIER_ORDER_[result.tier] >= floorVal) {
      scored.push({
        rowIndex:c.rowIndex, name:c.name, nationality:c.nationality, trade:c.trade,
        experience:c.experience, gulfExp:c.gulfExp, age:c.age, stage:c.stage,
        currentLocation:c.currentLocation, passportExpiry:c.passportExpiry,
        kaiAssessment:c.kaiAssessment, cvLink:c.cvLink,
        score:result.total, tier:result.tier, breakdown:result.breakdown, signals:result.signals
      });
    }
  });

  scored.sort(function(a, b) { return (b.score !== a.score) ? b.score - a.score : 0; });

  var summary = { total: scored.length, strong:0, good:0, possible:0, longShot:0 };
  scored.forEach(function(m) {
    if (m.tier === 'STRONG')        summary.strong++;
    else if (m.tier === 'GOOD')     summary.good++;
    else if (m.tier === 'POSSIBLE') summary.possible++;
    else                            summary.longShot++;
  });

  return { ok:true, reqId:reqId, req:req, matches:scored.slice(0, limit), summary:summary };
}


// ═══════════════════════════════════════════════════════════════════
// K6 · INTAKE — JD EXTRACTION  (migrated from v293 S93.F01)
// Multimodal PDF → Gemini (through Infrastructure seam k14Gemini_).
// ═══════════════════════════════════════════════════════════════════

/**
 * K6.F01 — Extract structured JD(s) from a PDF by sending it inline to
 * Gemini (bypasses glyph-fragmented PDF OCR). Returns raw JD facts only;
 * persistence is Foundation's job (createRequirement), not K14's.
 */
function extractJdFromPdfInline_v293_(base64Data, mimeType, filename) {
  var result = { ok: false, jds: [], count: 0, errors: [] };
  try {
    var mime = mimeType || 'application/pdf';

    var prompt =
      'This PDF is a Job Description document. Extract structured data from it.\n\n' +
      'Rules:\n' +
      '- Map the field labelled "Position Title", "Designation", "Position", or "Job Title" to "trade".\n' +
      '- For "department" choose the closest match from: ' +
        'Project Management, Operations, Maintenance, Construction, QA/QC, HSE.\n' +
      '- quantity = number of open positions (default 1 if not stated).\n' +
      '- If multiple positions are in the document, return a JSON array.\n' +
      '- Return ONLY valid JSON. No markdown, no explanation.\n\n' +
      'Schema (single position):\n' +
      '{"trade":"","department":"","quantity":1,"deployCountry":"","location":"",' +
      '"minExperience":0,"maxExperience":0,"educationReq":"","salary":"","clientName":"",' +
      '"localTransfer":false,"visitVisaOK":false,"gccPreference":false,"languageReq":"",' +
      '"certifications":[],"urgency":"NORMAL",' +
      '"specialRequirements":{"rotation":"","accommodation":"","transport":"","iqamaTransfer":false},' +
      '"externalRefNo":"","notes":""}';

    var parts = [
      { inlineData: { mimeType: mime, data: base64Data } },
      { text: prompt }
    ];

    var rawResp = k14Gemini_(parts, null);   // ← through Infrastructure, never owned by K14
    if (!rawResp) { result.errors.push('No response from Gemini'); return result; }

    var gText = rawResp;
    try {
      var envelope = JSON.parse(rawResp);
      var candidate = (envelope.candidates || [])[0] || {};
      if (candidate.content) gText = ((candidate.content.parts || [])[0] || {}).text || rawResp;
    } catch(pe) {}

    var jdList = null;
    var aStart = gText.indexOf('[');
    var oStart = gText.indexOf('{');
    if (aStart >= 0 && (oStart < 0 || aStart < oStart)) {
      var aEnd = gText.lastIndexOf(']') + 1;
      if (aEnd > aStart) { try { jdList = JSON.parse(gText.slice(aStart, aEnd)); } catch(pe2) {} }
    }
    if (!jdList) {
      var oEnd = gText.lastIndexOf('}') + 1;
      if (oStart >= 0 && oEnd > oStart) {
        try { jdList = [JSON.parse(gText.slice(oStart, oEnd))]; } catch(pe3) {}
      }
    }

    if (!jdList || !Array.isArray(jdList) || jdList.length === 0) {
      result.errors.push('Gemini returned no parseable JSON');
      return result;
    }

    var valid = [];
    jdList.forEach(function(jd) {
      if (!jd || typeof jd !== 'object') return;
      if (!jd.trade && filename) {
        jd.trade = filename.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').trim();
      }
      if (jd.trade || jd.externalRefNo) {
        if (!jd.quantity) jd.quantity = 1;
        if (!jd.salary)   jd.salary   = 'Not Stated';
        if (!jd.urgency)  jd.urgency  = 'NORMAL';
        valid.push(jd);
      }
    });

    result.ok    = valid.length > 0;
    result.jds   = valid;
    result.count = valid.length;
    return result;

  } catch(err) {
    result.errors.push('PDF inline extraction error: ' + err.message);
    Logger.log('K6.F01 error: ' + err.message);
    return result;
  }
}


// ═══════════════════════════════════════════════════════════════════
// K7 · FOUNDATION READ ADAPTERS
// K14 consumes Foundation truth read-only. These adapters read the
// _Requirements and Candidates sheets. They never write. (Constraint 8)
// Source: v285 S84.F01/F02 — unchanged behavior.
// ═══════════════════════════════════════════════════════════════════

/** K7.F01 — Load one requirement by Req ID (read-only). (v285 S84.F01) */
function loadRequirementById285_(reqId) {
  var ss    = k14MasterSS_();
  var sheet = ss.getSheetByName(CONFIG_V2.requirementsSheet);
  if (!sheet || sheet.getLastRow() < 2) return null;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, CONFIG_V2.reqHeaders.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(reqId).trim()) {
      return {
        reqId:String(data[i][0]||''), receivedDate:data[i][1],
        clientName:String(data[i][2]||''), deployCountry:String(data[i][3]||''),
        trade:String(data[i][4]||''), quantity:parseInt(data[i][5])||1,
        minExperience:String(data[i][6]||'0'), minAge:parseInt(data[i][7])||18,
        maxAge:parseInt(data[i][8])||60, gccPref:String(data[i][9]||''),
        localTransfer:String(data[i][10]||''), visitVisaOk:String(data[i][11]||''),
        certifications:String(data[i][12]||''), urgency:String(data[i][13]||''),
        status:String(data[i][14]||''), sourcedBy:String(data[i][15]||''),
        shortlistCount:parseInt(data[i][17])||0, selectedCount:parseInt(data[i][18])||0,
        notes:String(data[i][19]||'')
      };
    }
  }
  return null;
}

/** K7.F02 — Load all active candidates (read-only). (v285 S84.F02) */
function loadCandidates285_() {
  var ss    = k14MasterSS_();
  var sheet = ss.getSheetByName(CONFIG.sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var lastRow = sheet.getLastRow() - 1;
  var lastCol = Math.min(38, sheet.getLastColumn());
  var data    = sheet.getRange(2, 1, lastRow, lastCol).getValues();

  var candidates = [];
  data.forEach(function(row, idx) {
    var active = String(row[23] || '').toUpperCase();
    if (active === 'REJECTED' || active === 'ARCHIVED') return;

    var candidateState  = lastCol >= 28 ? String(row[27] || '') : '';
    var deployScore     = lastCol >= 34 ? parseFloat(row[33]) || 0 : 0;
    var passportExpiry  = lastCol >= 30 ? String(row[29] || '') : '';
    var currentLocation = lastCol >= 26 ? String(row[25] || '') : '';
    var gulfExp         = String(row[11] || '');

    candidates.push({
      rowIndex:idx + 2, stage:String(row[0]||''), appDate:row[1]?String(row[1]):'',
      nationality:String(row[2]||''), name:String(row[3]||''), mobile:String(row[4]||''),
      email:String(row[5]||''), education:String(row[6]||''), positionApplied:String(row[7]||''),
      trade:String(row[8]||''), industry:String(row[9]||''), experience:String(row[10]||''),
      gulfExp:gulfExp, dob:row[12]?String(row[12]):'', age:parseInt(row[13])||0,
      verdict:String(row[14]||''), score:parseFloat(row[16])||0, kaiAssessment:String(row[19]||''),
      cvLink:String(row[21]||''), notes:String(row[22]||''),
      candidateState:candidateState, currentLocation:currentLocation,
      passportExpiry:passportExpiry, deployabilityScore:deployScore
    });
  });
  return candidates;
}

/** K7.F03 — All open requirements (read-only). (v285 S85.F04) */
function getOpenRequirementsPublic() {
  try {
    var ss    = k14MasterSS_();
    var sheet = ss.getSheetByName(CONFIG_V2.requirementsSheet);
    if (!sheet || sheet.getLastRow() < 2) return { ok: true, reqs: [] };

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, CONFIG_V2.reqHeaders.length).getValues();
    var reqs = [];
    data.forEach(function(row) {
      var status = String(row[14] || '').toUpperCase();
      if (status === 'CLOSED' || status === 'CANCELLED' || status === 'FILLED') return;
      reqs.push({
        reqId:String(row[0]||''),
        receivedDate:row[1]?Utilities.formatDate(new Date(row[1]),'Asia/Kolkata','dd-MMM-yyyy'):'',
        clientName:String(row[2]||''), deployCountry:String(row[3]||''), trade:String(row[4]||''),
        quantity:parseInt(row[5])||1, minExperience:String(row[6]||''), gccPref:String(row[9]||''),
        urgency:String(row[13]||''), status:String(row[14]||'OPEN'),
        shortlistCount:parseInt(row[17])||0, selectedCount:parseInt(row[18])||0
      });
    });
    reqs.sort(function(a, b) { return new Date(b.receivedDate) - new Date(a.receivedDate); });
    return { ok: true, reqs: reqs };
  } catch(e) {
    Logger.log('getOpenRequirementsPublic error: ' + e.message);
    return { ok: false, msg: e.message };
  }
}


// ═══════════════════════════════════════════════════════════════════
// K8 · PUBLIC SURFACE — K14.* + dashboard entry points
// UI / Execution call these. They consume intelligence; they never
// generate it. Original v285 public names are retained so existing
// dashboards resolve to k14_core.gs (the patch copy is retired).
// ═══════════════════════════════════════════════════════════════════

/** K8.F01 — Primary match API (dashboard). (v285 S85.F01) */
function matchCandidatesForReqPublic(reqId, limit) {
  try {
    if (!reqId) return { ok: false, msg: 'No Req ID provided.' };
    return matchCandidatesForReq285_(reqId, limit || 20, 'POSSIBLE');
  } catch(err) {
    Logger.log('matchCandidatesForReqPublic error: ' + err.message);
    return { ok: false, msg: 'Match engine error: ' + err.message };
  }
}

/** K8.F02 — Top-3 match preview (JD card). (v285 S85.F02) */
function getTopMatchSummaryPublic(reqId) {
  try {
    if (!reqId) return { ok: false };
    var result = matchCandidatesForReq285_(reqId, 3, 'POSSIBLE');
    if (!result.ok) return result;
    return {
      ok:true, reqId:reqId, trade:result.req.trade, clientName:result.req.clientName,
      summary:result.summary,
      top3:(result.matches || []).slice(0, 3).map(function(m) {
        return { name:m.name, score:m.score, tier:m.tier, nationality:m.nationality };
      })
    };
  } catch(e) { return { ok: false, msg: e.message }; }
}

/** K8.F03 — Single requirement detail (JD header). (v285 S85.F03) */
function getRequirementByIdPublic(reqId) {
  try {
    if (!reqId) return { ok: false, msg: 'No Req ID provided.' };
    var req = loadRequirementById285_(reqId);
    if (!req) return { ok: false, msg: 'Requirement not found: ' + reqId };
    return { ok: true, req: req };
  } catch(e) { return { ok: false, msg: e.message }; }
}

/**
 * K8.NS — The official K14 namespace surface for new consumers.
 * Presentation and Execution layers should depend on K14.* rather than
 * the legacy v285 function names (which are retained only for transition).
 */
var K14 = {
  version: K14_CORE.version,

  // CLASSIFY
  tradeScore:      function(candidateTrade, reqTrade) { return getTradeScore285_(candidateTrade, reqTrade); },
  tradeGroup:      function(trade)                     { return findTradeGroup285_(trade); },
  classifyEmail:   function(from, subj, body, hasAtt, names) { return classifyEmail_(from, subj, body, hasAtt, names); },

  // REASON
  scoreCandidate:  function(candidate, req)            { return computeMatchScore285_(candidate, req); },
  matchRequirement:function(reqId, limit)              { return matchCandidatesForReqPublic(reqId, limit); },
  topMatches:      function(reqId)                     { return getTopMatchSummaryPublic(reqId); },
  freshnessLabel:  function(appDate)                   { return getCvFreshnessV288_(appDate); },
  freshnessUrgency:function(appDate)                   { return getFreshnessUrgencyV288_(appDate); },

  // INTAKE
  extractJdFromPdf:function(base64, mime, filename)    { return extractJdFromPdfInline_v293_(base64, mime, filename); },

  // FOUNDATION READ (read-only truth)
  openRequirements:function()                          { return getOpenRequirementsPublic(); },
  requirement:     function(reqId)                     { return getRequirementByIdPublic(reqId); }
};
