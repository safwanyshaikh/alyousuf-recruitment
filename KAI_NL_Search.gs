// ════════════════════════════════════════════════════════════════════════════════
// KAI NL SEARCH  —  Natural-Language Skill-Mining Search + Self-Learning Taxonomy
// ════════════════════════════════════════════════════════════════════════════════
//
// SEPARATE MODULE. Hooks into the master bridge with ONE permanent router line.
// After that single line is added once, ALL future NL changes happen HERE — you
// never touch KAI_API_Bridge_MASTER.gs again for search/learning logic.
//
// ── ONE-TIME MASTER HOOK ────────────────────────────────────────────────────────
// In KAI_API_Bridge_MASTER.gs doGet(), AFTER the `action === 'search'` line, add:
//
//     else if (action.indexOf('nl') === 0)
//         out = JSON.stringify(kaiNLRoute_(action, params));
//
// That prefix-route sends every action starting with "nl" (nlSearch, nlTaxonomy,
// nlLearnNow, and any you add later) into THIS file. Master never changes again.
// ────────────────────────────────────────────────────────────────────────────────
//
// REUSES (does not reinvent) the existing intelligence:
//   • classifyTradeT13_()            — trade → {level,collar,group,discipline}
//   • resolveCandidateTradesT13_()   — mines primary+secondary+third trade
//   • bestEligibilityT13_()          — collar/group/level eligibility gate
//   • affinityMultiplierT13_()       — recruiter-learning nudge (_MatchFeedback)
//   • getAllCandidatesRaw_()         — active candidate corpus
//   • TRADE_FAMILIES                 — SEED trade dictionary
//   • T13_STRONG / T13_GOOD / T13_POSSIBLE — tier thresholds
//
// SaaS-READY: every data access flows through nlContext_(params) → a tenant-scoped
// context. Today it resolves to the single master spreadsheet; tomorrow it maps a
// tenantId to that tenant's own data store (sheet today → Firestore later) with NO
// change to any search/learning logic. Migration seams are marked  // ‹SaaS SEAM›.
//
// ════════════════════════════════════════════════════════════════════════════════


// ── MODULE CONFIG (one place to tune; maps cleanly to a future tenant config doc) ─
var NL_CONFIG = {
  version: 'nlSearch-v1.0',
  defaultTenant: 'default',
  sheets: {
    candidates: 'Candidates',
    taxonomy:   '_Taxonomy',
    knowledge:  '_KAI_Knowledge',
    queryLog:   '_NLQueryLog',
    learnLog:   '_TaxonomyLearningLog',
    feedback:   '_MatchFeedback'
  },
  tiers: {
    strong:   (typeof T13_STRONG   !== 'undefined') ? T13_STRONG   : 75,
    good:     (typeof T13_GOOD     !== 'undefined') ? T13_GOOD     : 55,
    possible: (typeof T13_POSSIBLE !== 'undefined') ? T13_POSSIBLE : 40
  },
  certBoost:     8,   // score bump when a demanded cert is mined from the CV
  destBoost:     8,   // score bump when the demanded GCC destination is mined
  gccExpBoost:  10,   // score bump when the man has GCC current/past experience
  shutdownBoost: 8,   // score bump when shutdown/TAR experience is mined
  learnLookbackDays: 7,
  geminiCallCap: 20   // hard cap of classify calls per weekly run (cost guard)
};


// ════════════════════════════════════════════════════════════════════════════════
// SaaS TENANT CONTEXT  (the migration foundation)
// ════════════════════════════════════════════════════════════════════════════════

// Resolves a tenant-scoped context from request params.
// ‹SaaS SEAM› Today → master spreadsheet. Tomorrow → per-tenant store / Firestore.
function nlContext_(params) {
  var tenantId = String((params && params.tenantId) || NL_CONFIG.defaultTenant);
  var ssId = nlResolveTenantSpreadsheet_(tenantId);
  return {
    tenantId: tenantId,
    ssId:     ssId,
    ss:       SpreadsheetApp.openById(ssId),
    actor:    (typeof CURRENT_ACTOR_ !== 'undefined') ? CURRENT_ACTOR_ : ''
  };
}

// ‹SaaS SEAM› Maps tenantId → data store id. Single-tenant today.
function nlResolveTenantSpreadsheet_(tenantId) {
  if (tenantId && tenantId !== NL_CONFIG.defaultTenant) {
    try {
      var reg = _nlTenantRegistry_();
      if (reg[tenantId]) return reg[tenantId];
    } catch (e) {}
  }
  return SS_ID; // master bridge spreadsheet
}

// ‹SaaS SEAM› Future tenant registry. Stored as JSON in Script Properties for now;
// becomes a _Tenants collection / Firestore lookup under multi-tenant SaaS.
function _nlTenantRegistry_() {
  var p = PropertiesService.getScriptProperties().getProperty('NL_TENANTS');
  return p ? JSON.parse(p) : {};
}

// ‹SaaS SEAM› Candidate corpus accessor. Today reuses master getAllCandidatesRaw_()
// (reads the master spreadsheet). The single function to swap for per-tenant reads.
function nlGetCandidates_(ctx) {
  return getAllCandidatesRaw_();
}


// ════════════════════════════════════════════════════════════════════════════════
// ROUTER  —  the only entry master calls. Add NL sub-actions here forever.
// ════════════════════════════════════════════════════════════════════════════════
function kaiNLRoute_(action, params) {
  try {
    switch (action) {
      case 'nlSearch':    return nlSearch_(params);
      case 'nlTaxonomy':  return nlTaxonomyStatus_(params);   // taxonomy growth view
      case 'nlLearnNow':  return { ok: true, report: learnTaxonomyWeekly() }; // admin manual run
      case 'nlVersion':   return { ok: true, version: NL_CONFIG.version, ts: new Date().toISOString() };
      default:            return { ok: false, error: 'Unknown NL action: ' + action };
    }
  } catch (e) {
    return { ok: false, error: 'NL route error: ' + e.message, action: action };
  }
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 47 — nlSearch_  (skill-mining, dynamic, T13-powered)
// ════════════════════════════════════════════════════════════════════════════════
function nlSearch_(params) {
  var ctx = nlContext_(params);

  // 1. Parse the typed query → synthetic requirement + Gulf-reality filters.
  var q = parseNLQuery_(String((params && (params.q || params.rawQuery)) || ''));
  if (!q.rawQuery) {
    return { ok: true, total: 0, counts: { STRONG:0, GOOD:0, POSSIBLE:0, blocked:0 },
             queryInterpreted: {}, records: [], note: 'Empty query' };
  }

  // 2. Resolve the trade term against SEED ∪ LEARNED taxonomy (dynamic).
  var reqTrade = resolveTradeDynamic_(ctx, q.tradeTerm) || q.tradeTerm;
  var reqClass = classifyTradeT13_(reqTrade);

  // 3. Run the EXISTING T13 skill-matching engine across the candidate corpus.
  if (typeof _t13AffinityCache !== 'undefined') _t13AffinityCache = null; // reset learning cache
  var all = nlGetCandidates_(ctx);
  var buckets = { STRONG: [], GOOD: [], POSSIBLE: [] };
  var blocked = 0;

  all.forEach(function (cand) {
    // 3a. Skill-mined trade eligibility (primary + secondary + third) — existing T13.
    var candClasses = resolveCandidateTradesT13_(cand);
    var e = bestEligibilityT13_(reqClass, candClasses);
    if (!e.eligible) { blocked++; return; }

    // 3b. Recruiter-learning affinity — existing T13.
    var mult  = affinityMultiplierT13_(ctx.ss, reqClass.group, e.viaGroup || candClasses[0].group);
    var score = Math.round(e.score * mult);

    // 3c. Soft signals — boost when the query DEMANDED something the CV carries.
    //     cert / GCC-destination / GCC-experience are PREFERENCES, not hard cuts:
    //     a strong trade match still surfaces (at a lower tier) when these are
    //     absent, instead of producing a 0-result screen.
    //     Match cert against ALIASES (6g/6gr/nebosh/saudi), never the canonical
    //     display name — CVs carry the alias, not "6G Weld Test".
    var blob = nlBlob_(cand);
    var certHit = q.certAliases.length &&
                  q.certAliases.some(function (a) { return nlAliasHit_(blob, a); });
    var shutHit = q.shutdown && /shutdown|turnaround|\btar\b|overhaul|outage/.test(blob);
    if (certHit) score = Math.min(100, score + NL_CONFIG.certBoost);
    if (shutHit) score = Math.min(100, score + NL_CONFIG.shutdownBoost);

    // GCC destination preference (saudi/ksa/aramco) — boost across gulfExp + CV.
    if (q.gccDest) {
      var hay = (String(cand.gulfExp || '') + ' ' + blob).toLowerCase();
      if (q.gccDestAliases.some(function (a) { return hay.indexOf(a) >= 0; }))
        score = Math.min(100, score + NL_CONFIG.destBoost);
    }

    // GCC experience preference — boost, not filter. gulfExp is sparsely parsed,
    // so a hard cut would hide real Gulf-returnees whose field is simply blank.
    if (q.gccExpRequired) {
      var mob = cand.gccMobility || classifyGCCMobility_(cand.gulfExp, cand.currentLocation);
      if (mob === 'GCC_CURRENT' || mob === 'GCC_PAST')
        score = Math.min(100, score + NL_CONFIG.gccExpBoost);
    }

    // 3d. HARD filters — explicit recruiter requirements that genuinely exclude.
    //     Source nationality and minimum experience stay mandatory: a wrong-country
    //     or under-experienced man is not the requirement, regardless of trade fit.
    if (q.sourceCountry) {
      var src = (String(cand.nationality || '') + ' ' + String(cand.currentLocation || '')).toLowerCase();
      var srcAliases = q.sourceAliases.length ? q.sourceAliases : [q.sourceCountry.toLowerCase()];
      if (!srcAliases.some(function (a) { return src.indexOf(a) >= 0; })) return;
    }
    if (q.expMin > 0 && (parseFloat(cand.experience) || 0) < q.expMin) return;

    // 3e. Final tier.
    var tier = score >= NL_CONFIG.tiers.strong   ? 'STRONG'   :
               score >= NL_CONFIG.tiers.good     ? 'GOOD'     :
               score >= NL_CONFIG.tiers.possible ? 'POSSIBLE' : 'HIDDEN';
    if (tier === 'HIDDEN') { blocked++; return; }

    cand.confidenceTier = tier;
    cand.matchScore     = score;
    cand.matchedVia     = e.via;        // which mined trade matched
    cand.matchedGroup   = e.viaGroup || (candClasses[0] && candClasses[0].group) || '';
    buckets[tier].push(cand);
  });

  ['STRONG', 'GOOD', 'POSSIBLE'].forEach(function (t) {
    buckets[t].sort(function (a, b) { return b.matchScore - a.matchScore; });
  });

  var limit   = Math.min(200, parseInt((params && params.limit) || '50', 10) || 50);
  var records = buckets.STRONG.concat(buckets.GOOD, buckets.POSSIBLE).slice(0, limit);

  // 4. Log the query (feeds the weekly learning loop). Never blocks search.
  nlLogQuery_(ctx, q, records.length);

  return {
    ok: true,
    engine: NL_CONFIG.version,
    total: records.length,
    counts: {
      STRONG: buckets.STRONG.length,
      GOOD:   buckets.GOOD.length,
      POSSIBLE: buckets.POSSIBLE.length,
      blocked: blocked
    },
    queryInterpreted: {
      trade:         reqTrade,
      reqGroup:      reqClass.group,
      reqCollar:     reqClass.collar,
      reqLevel:      reqClass.level,
      certs:         q.certs.join(','),
      gccDest:       q.gccDest || '',
      sourceCountry: q.sourceCountry || '',
      gccExp:        q.gccExpRequired,
      shutdown:      q.shutdown,
      experienceMin: q.expMin,
      positionLevel: q.positionLevel || '',
      qty:           q.qty
    },
    learningNote: nlLatestLearningNote_(ctx),
    records: records
  };
}


// Word-boundary alias match. Critical for tokens that are substrings of others:
// "6g" must NOT match inside "6gr", "api" must NOT match inside "rapid".
// A boundary = start/end of string or any non-alphanumeric char (space, -, _, /, .).
function nlAliasHit_(haystack, alias) {
  var a = String(alias || '').toLowerCase().trim();
  if (!a) return false;
  var esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)').test(String(haystack || '').toLowerCase());
}

// ── Backend NL parser (mirrors docs/nl-search/search-parser-spec.md) ─────────────
function parseNLQuery_(raw) {
  var s = String(raw || '').toLowerCase().trim().replace(/\s+/g, ' ');
  var q = {
    tradeTerm: s, certs: [], certAliases: [], gccDest: '', gccDestAliases: [],
    sourceCountry: '', sourceAliases: [],
    gccExpRequired: false, shutdown: false, expMin: 0, expMax: 0,
    positionLevel: '', qty: 0, rawQuery: raw
  };
  if (!s) return q;

  // Quantity
  var qm = s.match(/\b(?:get|need|want|find|show|give|send)\s+(\d+)\b/) ||
           s.match(/\b(\d+)\s+(?:welders?|fitters?|technicians?|drivers?|operators?|inspectors?|officers?|riggers?|electricians?|painters?|scaffolders?|candidates?|workers?|nos?)\b/);
  if (qm) q.qty = parseInt(qm[1], 10);

  // Experience (single or range)
  var er = s.match(/(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)/);
  if (er) { q.expMin = parseInt(er[1], 10); q.expMax = parseInt(er[2], 10); }
  else {
    var em = s.match(/(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:exp(?:erience)?)?/);
    if (em) q.expMin = parseInt(em[1], 10);
  }

  // Certifications (required + trade-hinting).
  // Keep the alias list too — CVs contain the alias ("6g","saudi","nebosh"),
  // NEVER the canonical display name ("6G Weld Test"). Matching must use aliases.
  NL_CERTS.forEach(function (c) {
    if (c.aliases.some(function (a) { return nlAliasHit_(s, a); })) {
      if (q.certs.indexOf(c.canonical) < 0) {
        q.certs.push(c.canonical);
        c.aliases.forEach(function (a) { if (q.certAliases.indexOf(a) < 0) q.certAliases.push(a); });
      }
    }
  });

  // GCC destination (deployment target) — keep aliases for CV/gulfExp matching.
  NL_GCC_DEST.forEach(function (d) {
    if (!q.gccDest && d.aliases.some(function (a) { return s.indexOf(a) >= 0; })) {
      q.gccDest = d.canonical;
      q.gccDestAliases = d.aliases.slice();
    }
  });

  // Source country (where the candidate is sourced from) — keep aliases too.
  NL_SOURCE.forEach(function (d) {
    if (!q.sourceCountry && d.aliases.some(function (a) { return s.indexOf(a) >= 0; })) {
      q.sourceCountry = d.canonical;
      q.sourceAliases = d.aliases.slice();
    }
  });

  // GCC experience intent
  q.gccExpRequired = /\bgcc\s*exp(?:erience)?\b|\bgulf\s*exp(?:erience)?\b|worked in (?:gcc|gulf|saudi|uae|qatar|kuwait|oman|bahrain)/.test(s);

  // Shutdown / turnaround
  q.shutdown = /shutdown|turn ?around|\btar\b|overhaul|outage/.test(s);

  // Position level (most senior token wins)
  if (/\bmanager\b/.test(s))                              q.positionLevel = 'MANAGER';
  else if (/\bengineer\b/.test(s))                        q.positionLevel = 'ENGINEER';
  else if (/inspector|\bqa\/qc\b|\bqaqc\b|\bqc\b|\bqa\b|\bndt\b|cswip/.test(s)) q.positionLevel = 'INSPECTOR';
  else if (/supervisor|superintendent|in ?charge/.test(s)) q.positionLevel = 'SUPERVISOR';
  else if (/foreman|chargeman|leadman|charge ?hand/.test(s)) q.positionLevel = 'FOREMAN';
  else if (/technician/.test(s))                          q.positionLevel = 'TECHNICIAN';

  return q;
}


// ── Lowercased searchable skill blob mined from a candidate ──────────────────────
function nlBlob_(cand) {
  var top3 = '';
  if (cand.top3Positions) {
    if (cand.top3Positions.full && cand.top3Positions.full.join) top3 = cand.top3Positions.full.join(' ');
    else top3 = String(cand.top3Positions);
  }
  return [
    cand.kaiAssessment || '', cand.positionApplied || '', top3,
    cand.gulfExp || '', cand.recommendedRoles || '', cand.trade || ''
  ].join(' ').toLowerCase();
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 47c — resolveTradeDynamic_  (SEED ∪ LEARNED — the dynamic vocabulary)
// ════════════════════════════════════════════════════════════════════════════════
// A trade KAI learned last week is searchable today, with no code change.
function resolveTradeDynamic_(ctx, term) {
  if (!term) return '';
  var t = String(term).toLowerCase();

  // 1. SEED — in-code TRADE_FAMILIES (longest alias wins for specificity).
  var best = '', bestLen = 0;
  if (typeof TRADE_FAMILIES !== 'undefined') {
    for (var fam in TRADE_FAMILIES) {
      var kws = TRADE_FAMILIES[fam];
      for (var i = 0; i < kws.length; i++) {
        if (t.indexOf(kws[i]) >= 0 && kws[i].length > bestLen) { best = kws[i]; bestLen = kws[i].length; }
      }
    }
  }
  if (best) return best;

  // 2. LEARNED — _Taxonomy sheet aliases (cached 1h).
  var learned = nlLearnedTaxonomyCached_(ctx);
  for (var j = 0; j < learned.length; j++) {
    var L = learned[j];
    if (L.aliases.some(function (a) { return a && t.indexOf(a) >= 0; })) return L.trade;
  }
  return '';
}

// Reads APPROVED + LEARNED_AUTO + SEED rows from _Taxonomy. Cached 1 hour.
function nlLearnedTaxonomyCached_(ctx) {
  var cache = CacheService.getScriptCache();
  var key = 'nl_learned_tax_' + ctx.tenantId;
  var hit = cache.get(key);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }

  var out = [];
  var sheet = ctx.ss.getSheetByName(NL_CONFIG.sheets.taxonomy);
  if (sheet && sheet.getLastRow() > 1) {
    var data = sheet.getDataRange().getValues();
    var H = data[0].map(function (h) { return String(h).toLowerCase(); });
    var iTrade   = H.indexOf('trade');
    var iAliases = H.indexOf('aliases');
    var iStatus  = H.indexOf('approvalstatus');
    var iActive  = H.indexOf('active');
    for (var r = 1; r < data.length; r++) {
      var status = iStatus >= 0 ? String(data[r][iStatus] || '').toUpperCase() : '';
      var active = iActive >= 0 ? String(data[r][iActive] || '').toUpperCase() : 'TRUE';
      if (active === 'FALSE') continue;
      if (status && status === 'PENDING') continue; // not yet searchable
      var trade = iTrade >= 0 ? String(data[r][iTrade] || '').trim() : '';
      if (!trade) continue;
      var aliases = iAliases >= 0
        ? String(data[r][iAliases] || '').toLowerCase().split(/[,;|]/).map(function (x) { return x.trim(); }).filter(Boolean)
        : [];
      aliases.push(trade.toLowerCase());
      out.push({ trade: trade, aliases: aliases });
    }
  }
  try { cache.put(key, JSON.stringify(out), 3600); } catch (e) {}
  return out;
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 48 — learnTaxonomyWeekly  (the mutating brain — runs every 7 days)
// ════════════════════════════════════════════════════════════════════════════════
// Harvests this week's demand (_KAI_Knowledge) + supply (Candidates), detects trade
// strings the taxonomy cannot yet resolve, and QUEUES them for governance approval.
// Conservative + safe: it never auto-injects into production matching; uncertain
// trades land in _Taxonomy as PENDING for the recruiter to approve (existing flow).
// No ScriptLock, disjoint sheets — never blocks the live email pipeline.
//
// Public (no trailing underscore) so it is selectable as a trigger / dropdown.
function learnTaxonomyWeekly() {
  var ctx = nlContext_({});
  var report = {
    runDate: new Date(), jdsScanned: 0, cvsScanned: 0,
    unknownTrades: 0, queued: 0, aliasesEnriched: 0, note: ''
  };

  var sinceTs = nlLastLearnTs_();
  var now = new Date().getTime();
  var seenUnknown = {};   // group dedupe
  var queueRows = [];

  // STEP 1 — HARVEST DEMAND from _KAI_Knowledge (header-driven; tolerant of schema).
  var kSheet = ctx.ss.getSheetByName(NL_CONFIG.sheets.knowledge);
  if (kSheet && kSheet.getLastRow() > 1) {
    var kData = kSheet.getDataRange().getValues();
    var kH = kData[0].map(function (h) { return String(h).toLowerCase(); });
    var kTradeIdx = kH.indexOf('trade');
    var kTimeIdx  = kH.findIndex
      ? kH.findIndex(function (h) { return h.indexOf('captured') >= 0 || h.indexOf('date') >= 0 || h.indexOf('time') >= 0; })
      : nlFindIdx_(kH, ['captured', 'date', 'time']);
    for (var i = 1; i < kData.length; i++) {
      if (kTimeIdx >= 0 && sinceTs > 0) {
        var ts = nlToTime_(kData[i][kTimeIdx]);
        if (ts && ts < sinceTs) continue;
      }
      report.jdsScanned++;
      var tradeStr = kTradeIdx >= 0 ? String(kData[i][kTradeIdx] || '').trim() : '';
      nlConsiderUnknownTrade_(ctx, tradeStr, seenUnknown, queueRows, report);
    }
  }

  // STEP 2 — HARVEST SUPPLY from new candidates (trade + position strings).
  var all = nlGetCandidates_(ctx);
  all.forEach(function (cand) {
    var ts = cand._sortTs || 0;
    if (sinceTs > 0 && ts && ts < sinceTs) return;
    report.cvsScanned++;
    nlConsiderUnknownTrade_(ctx, cand.trade, seenUnknown, queueRows, report);
    nlConsiderUnknownTrade_(ctx, cand.positionApplied, seenUnknown, queueRows, report);
  });

  // STEP 3 — QUEUE unknown trades into _Taxonomy as PENDING (governance).
  if (queueRows.length) {
    var taxSheet = nlEnsureTaxonomySheet_(ctx);
    queueRows.forEach(function (row) { taxSheet.appendRow(row); });
    report.queued = queueRows.length;
  }

  // STEP 4 — STAMP learning log + advance the watermark. Invalidate taxonomy cache.
  report.note = 'Scanned ' + report.jdsScanned + ' JDs + ' + report.cvsScanned +
                ' CVs. Queued ' + report.queued + ' new trade(s) for approval.';
  nlAppendLearningLog_(ctx, report);
  nlSetLastLearnTs_(now);
  try { CacheService.getScriptCache().remove('nl_learned_tax_' + ctx.tenantId); } catch (e) {}

  Logger.log(report.note);
  return report;
}

// Considers a trade string; if the existing engine cannot resolve it, queue PENDING.
function nlConsiderUnknownTrade_(ctx, tradeStr, seen, queueRows, report) {
  tradeStr = String(tradeStr || '').trim();
  if (tradeStr.length < 3) return;

  // Already resolvable by SEED ∪ LEARNED? → known, skip.
  if (resolveTradeDynamic_(ctx, tradeStr)) return;

  // Classify with the existing T13 engine. Generic/unknown groups = unlearned.
  var cls = classifyTradeT13_(tradeStr);
  var groupKey = cls.group || 'UNKNOWN';
  if (groupKey !== 'GENERAL_WORKER_GROUP' && groupKey !== 'UNKNOWN' && groupKey !== 'PINK_GROUP') {
    // Engine already understands it via family rules — not "unknown".
    return;
  }
  // NEVER-ADD filter — keep the industrial taxonomy clean of office/health noise.
  if (NL_NEVER_ADD.test(tradeStr.toLowerCase())) return;

  var dedupe = tradeStr.toLowerCase();
  if (seen[dedupe]) return;
  seen[dedupe] = true;
  report.unknownTrades++;

  // Build a PENDING _Taxonomy row using the T13 classification we already have.
  queueRows.push(nlTaxonomyRow_(tradeStr, cls));
}

// Builds a _Taxonomy row (matches TAXONOMY_HEADERS order — 20 cols) status PENDING.
function nlTaxonomyRow_(tradeStr, cls) {
  return [
    '',                 // Industry
    '',                 // Department
    cls.group || '',    // TradeFamily
    tradeStr,           // Trade
    '',                 // Specialization
    cls.collar || '',   // CollarType
    cls.level || '',    // PositionLevel
    cls.group || '',    // EligibilityGroup
    '', '',             // AllowedGroups, BlockedGroups
    '', '',             // CriticalKeywords, BlockedKeywords
    '', '',             // PromotionPath, CrossMatchRules
    'PENDING',          // ApprovalStatus
    true,               // CreatedByAI
    '', '',             // ApprovedByHuman, ApprovedDate
    tradeStr.toLowerCase(), // Aliases (seed alias = the trade text itself)
    'TRUE'              // Active
  ];
}

function nlEnsureTaxonomySheet_(ctx) {
  var s = ctx.ss.getSheetByName(NL_CONFIG.sheets.taxonomy);
  if (!s) {
    // Reuse master header constant if available; else inline the known 20-col schema.
    var headers = (typeof TAXONOMY_HEADERS !== 'undefined') ? TAXONOMY_HEADERS : [
      'Industry','Department','TradeFamily','Trade','Specialization','CollarType',
      'PositionLevel','EligibilityGroup','AllowedGroups','BlockedGroups',
      'CriticalKeywords','BlockedKeywords','PromotionPath','CrossMatchRules',
      'ApprovalStatus','CreatedByAI','ApprovedByHuman','ApprovedDate','Aliases','Active'
    ];
    s = ctx.ss.insertSheet(NL_CONFIG.sheets.taxonomy);
    s.appendRow(headers);
    s.setFrozenRows(1);
  }
  return s;
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 47d — TAXONOMY STATUS  (?action=nlTaxonomy — growth view for UI banner)
// ════════════════════════════════════════════════════════════════════════════════
function nlTaxonomyStatus_(params) {
  var ctx = nlContext_(params);
  var tax = ctx.ss.getSheetByName(NL_CONFIG.sheets.taxonomy);
  var total = 0, pending = 0, approved = 0, learned = 0;
  if (tax && tax.getLastRow() > 1) {
    var d = tax.getDataRange().getValues();
    var H = d[0].map(function (h) { return String(h).toLowerCase(); });
    var iStatus = H.indexOf('approvalstatus');
    for (var r = 1; r < d.length; r++) {
      total++;
      var st = iStatus >= 0 ? String(d[r][iStatus] || '').toUpperCase() : '';
      if (st === 'PENDING') pending++;
      else if (st === 'APPROVED') approved++;
      else if (st === 'LEARNED_AUTO') learned++;
    }
  }
  return {
    ok: true, version: NL_CONFIG.version,
    taxonomy: { total: total, approved: approved, learnedAuto: learned, pendingApproval: pending },
    learningNote: nlLatestLearningNote_(ctx)
  };
}


// ════════════════════════════════════════════════════════════════════════════════
// LOGGING + WATERMARK HELPERS
// ════════════════════════════════════════════════════════════════════════════════

function nlLogQuery_(ctx, q, resultCount) {
  try {
    var s = ctx.ss.getSheetByName(NL_CONFIG.sheets.queryLog);
    if (!s) { s = ctx.ss.insertSheet(NL_CONFIG.sheets.queryLog);
      s.appendRow(['queryId','timestamp','tenant','rawQuery','interpretedJSON','resultCount','recruiterId']); }
    s.appendRow(['NLQ-' + new Date().getTime(), new Date(), ctx.tenantId,
                 q.rawQuery, JSON.stringify(q), resultCount, ctx.actor]);
  } catch (e) {}
}

function nlAppendLearningLog_(ctx, report) {
  try {
    var s = ctx.ss.getSheetByName(NL_CONFIG.sheets.learnLog);
    if (!s) { s = ctx.ss.insertSheet(NL_CONFIG.sheets.learnLog);
      s.appendRow(['RunDate','Tenant','JDsScanned','CVsScanned','UnknownTrades','Queued','Note']); }
    s.appendRow([report.runDate, ctx.tenantId, report.jdsScanned, report.cvsScanned,
                 report.unknownTrades, report.queued, report.note]);
  } catch (e) {}
}

function nlLatestLearningNote_(ctx) {
  try {
    var s = ctx.ss.getSheetByName(NL_CONFIG.sheets.learnLog);
    if (!s || s.getLastRow() < 2) return '';
    var last = s.getRange(s.getLastRow(), 1, 1, s.getLastColumn()).getValues()[0];
    var queued = last[5] || 0;
    if (!queued) return '';
    return 'KAI queued ' + queued + ' new trade(s) for approval this week.';
  } catch (e) { return ''; }
}

function nlLastLearnTs_() {
  var v = PropertiesService.getScriptProperties().getProperty('NL_LAST_LEARN_TS');
  return v ? parseInt(v, 10) : 0;
}
function nlSetLastLearnTs_(ts) {
  PropertiesService.getScriptProperties().setProperty('NL_LAST_LEARN_TS', String(ts));
}

// Date coercion + header index helpers (defensive against schema drift).
function nlToTime_(v) {
  if (v instanceof Date) return v.getTime();
  if (!v) return 0;
  var d = new Date(v); return isNaN(d) ? 0 : d.getTime();
}
function nlFindIdx_(arr, needles) {
  for (var i = 0; i < arr.length; i++)
    for (var j = 0; j < needles.length; j++)
      if (arr[i].indexOf(needles[j]) >= 0) return i;
  return -1;
}


// ════════════════════════════════════════════════════════════════════════════════
// COMPACT NL DICTIONARIES  (kept in sync with docs/nl-search/trade-taxonomy.ts)
// Edit HERE for quick tuning; the canonical source remains the .ts seed file.
// ════════════════════════════════════════════════════════════════════════════════

// NEVER-ADD: office / health / finance / hospitality noise must never pollute the
// industrial GCC taxonomy (per CLAUDE.md — KAI is not a generic ATS).
var NL_NEVER_ADD = /\b(developer|programmer|nurse|doctor|physician|accountant|teacher|trainer|receptionist|secretary|chef|cook|waiter|cashier|sales|marketing|hr |human resource|banker|lawyer|designer|analyst|consultant)\b/;

var NL_CERTS = [
  { canonical: 'NEBOSH IGC',            aliases: ['nebosh', 'nebosh igc', 'nebosh diploma'] },
  { canonical: 'IOSH',                  aliases: ['iosh', 'iosh managing safely'] },
  // 6G and 6GR are DIFFERENT tests — 6GR adds a Restriction ring (harder).
  // Never alias one to the other. Matched with word boundaries (nlAliasHit_)
  // so "6g" can never match inside "6gr".
  { canonical: '6G Weld Test',          aliases: ['6g', '6g welder', '6g welding', 'coded 6g', '6g position'] },
  { canonical: '6GR Weld Test',         aliases: ['6gr', '6gr welder', '6gr welding', 'coded 6gr', '6gr position'] },
  { canonical: 'CSWIP 3.1',             aliases: ['cswip', 'cswip 3.1', 'cswip 3.2'] },
  { canonical: 'API 570',               aliases: ['api 570', 'api 510', 'api 653', 'api570'] },
  { canonical: 'NDT Level II',          aliases: ['ndt', 'ndt level ii', 'ndt level 2', 'asnt'] },
  { canonical: 'Saudi Driving License', aliases: ['saudi license', 'saudi driving license', 'saudi dl'] },
  { canonical: 'GCC Driving License',   aliases: ['gcc license', 'gcc driving license', 'gcc dl', 'gulf license'] },
  { canonical: 'BOSIET',                aliases: ['bosiet', 'huet', 'offshore survival'] },
  { canonical: 'CISRS',                 aliases: ['cisrs', 'cisrs card', 'cisrs scaffolder', 'cisrs foreman', 'cisrs advanced'] },
  { canonical: 'Aramco JCC',            aliases: ['jcc', 'aramco jcc', 'joint certification', 'aramco approved welder', 'adnoc approved welder', 'adnoc approved', 'aramco approved'] },
  { canonical: 'NACE CIP',              aliases: ['nace', 'nace cip', 'nace level 1', 'nace level 2', 'nace inspector', 'coating inspector cert'] },
  { canonical: 'GMDSS',                 aliases: ['gmdss', 'gmdss certificate', 'global maritime distress'] },
  { canonical: 'Work at Height',        aliases: ['work at height', 'wah', 'height certification', 'working at heights', 'height safety'] }
];

var NL_GCC_DEST = [
  { canonical: 'Saudi Arabia', aliases: ['saudi', 'saudi arabia', 'ksa', 'aramco', 'sabic', 'neom'] },
  { canonical: 'UAE',          aliases: ['uae', 'emirates', 'dubai', 'abu dhabi', 'sharjah', 'adnoc'] },
  { canonical: 'Qatar',        aliases: ['qatar', 'doha', 'qatarenergy', 'ras laffan'] },
  { canonical: 'Kuwait',       aliases: ['kuwait', 'koc', 'knpc'] },
  { canonical: 'Bahrain',      aliases: ['bahrain', 'manama', 'bapco'] },
  { canonical: 'Oman',         aliases: ['oman', 'muscat', 'salalah', 'pdo'] }
];

var NL_SOURCE = [
  { canonical: 'India',       aliases: ['india', 'indian', 'kerala', 'punjab', 'mumbai', 'delhi', 'hyderabad', 'chennai'] },
  { canonical: 'Pakistan',    aliases: ['pakistan', 'pakistani', 'lahore', 'karachi'] },
  { canonical: 'Nepal',       aliases: ['nepal', 'nepali', 'nepalese', 'kathmandu'] },
  { canonical: 'Philippines', aliases: ['philippines', 'filipino', 'manila'] },
  { canonical: 'Sri Lanka',   aliases: ['sri lanka', 'srilankan', 'colombo'] },
  { canonical: 'Bangladesh',  aliases: ['bangladesh', 'bangladeshi', 'dhaka'] }
];


// ════════════════════════════════════════════════════════════════════════════════
// TEST + TRIGGER INSTALL  (run from the GAS editor dropdown)
// ════════════════════════════════════════════════════════════════════════════════

// Run this FIRST to confirm the engine works against your live data.
function testNLSearch() {
  ['6gr welders available in india',
   'instrument technicians gcc experience',
   'heavy driver saudi license',
   'hse officer nebosh',
   'mechanical fitter shutdown experience'].forEach(function (query) {
    var r = nlSearch_({ q: query, limit: 20 });
    Logger.log(query + '  →  ' + r.counts.STRONG + ' STRONG / ' + r.counts.GOOD +
               ' GOOD / ' + r.counts.POSSIBLE + ' POSSIBLE   | trade=' +
               r.queryInterpreted.trade + ' certs=[' + r.queryInterpreted.certs +
               '] gccDest=' + r.queryInterpreted.gccDest + ' gccExp=' +
               r.queryInterpreted.gccExp + ' shutdown=' + r.queryInterpreted.shutdown);
  });
}

// Run ONCE to install the weekly learning trigger.
function installLearnTaxonomyTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++)
    if (existing[i].getHandlerFunction() === 'learnTaxonomyWeekly') {
      Logger.log('Trigger already installed.'); return;
    }
  ScriptApp.newTrigger('learnTaxonomyWeekly').timeBased().everyDays(7).atHour(3).create();
  Logger.log('learnTaxonomyWeekly trigger installed (every 7 days, 03:00).');
}

// Run to remove the weekly learning trigger.
function removeLearnTaxonomyTrigger() {
  var t = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < t.length; i++)
    if (t[i].getHandlerFunction() === 'learnTaxonomyWeekly') { ScriptApp.deleteTrigger(t[i]); n++; }
  Logger.log('Removed ' + n + ' learnTaxonomyWeekly trigger(s).');
}
