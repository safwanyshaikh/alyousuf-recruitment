# KAI NL Search — GAS Implementation Task Prompt

**Status:** BUILD-READY
**Version:** 1.0
**Date:** 2026-06-12
**Target:** `KAI_API_Bridge_MASTER.gs` (Sections 47, 47b) + new `KAI_T15_Learning.gs` (Section 48)

> KEY INSIGHT: The dynamic skill-matching brain ALREADY EXISTS in T13.
> `getMatchedCandidatesT13_` already mines a candidate's primary + secondary +
> third trade (`resolveCandidateTradesT13_`), runs collar/group/level eligibility
> (`bestEligibilityT13_`), and applies recruiter-learning affinity
> (`affinityMultiplierT13_`). nlSearch_ does NOT reinvent matching — it builds a
> SYNTHETIC requirement from the typed query and runs that same engine.
> This is a small, safe, additive patch. The existing pipeline is untouched.

---

## DO NOT TOUCH

- `getCandidates_`, `getMatchedCandidates_`, `parseCV_`, email pipeline,
  any of the 5 blessed triggers, any existing `doGet` action.
- Only ADD new functions and ONE new router line. Additive only.

---

## EXISTING FUNCTIONS YOU WILL REUSE (verified signatures)

```javascript
// T13 — KAI_T13_Intelligence.gs
classifyTradeT13_(text)
  → { text, level, discipline, collar, group, pink }
resolveCandidateTradesT13_(cand)            // mines primary+secondary+third trade
  → [ classObj, ... ]   (already skill-mines top3Positions + positionApplied)
bestEligibilityT13_(reqClass, candClasses)
  → { eligible, score, tier, via, viaGroup, rank }
affinityMultiplierT13_(ss, reqGroup, candGroup)   // recruiter-learning nudge
  → number (multiplier)
getAllCandidatesRaw_()                       // all active candidate objects
T13_STRONG=75, T13_GOOD=55, T13_POSSIBLE=40  // tier thresholds

// T14 — KAI_T14_Intelligence.gs (optional richer scoring + compliance)
computeMatchScoreT14_(reqTrade, reqMinExp, reqCerts, campaignType,
                      reqNationality, reqMinAge, reqMaxAge, cand)
  → { score, tier, recruitmentClass, compliance:{score,riskLevel,flags}, ... }
getRecruitmentClassT14_(trade)

// Master — KAI_API_Bridge_MASTER.gs
var COL = { ... }                            // column map (1-based)
SS_ID                                        // spreadsheet id
classifyGCCMobility_(gulfExp, currentLocation) → 'GCC_CURRENT'|'GCC_PAST'|...
```

---

## SECTION 47 — `nlSearch_` (the search entry point)

### Router (add ONE line in doGet, after `action === 'search'`)

```javascript
else if (action === 'nlSearch') out = JSON.stringify(nlSearch_(params));
```

### Function

```javascript
// ════════════════════════════════════════════════════════════════════
// SECTION 47 — NL SEARCH ENGINE (skill-mining, dynamic, T13-powered)
// ════════════════════════════════════════════════════════════════════
function nlSearch_(params) {
  var ss = SpreadsheetApp.openById(SS_ID);

  // 1. PARSE the typed query into a synthetic requirement + filters
  var q = parseNLQuery_(String(params.q || params.rawQuery || ''));
  // q = { tradeTerm, certs[], gccDest, sourceCountry, gccExpRequired,
  //       shutdown, expMin, expMax, positionLevel, qty, rawQuery }

  // 2. Build the synthetic requirement class from the trade term.
  //    Resolve trade via SEED ∪ LEARNED taxonomy (dynamic — Section 47c).
  var reqTrade = resolveTradeDynamic_(q.tradeTerm) || q.tradeTerm;
  var reqClass = classifyTradeT13_(reqTrade);

  // 3. Run the EXISTING T13 skill-matching engine across all candidates.
  var all = getAllCandidatesRaw_();
  var buckets = { STRONG:[], GOOD:[], POSSIBLE:[] };
  var blocked = 0;

  all.forEach(function(cand) {
    // 3a. Skill-mined trade eligibility (primary+secondary+third) — existing T13
    var candClasses = resolveCandidateTradesT13_(cand);
    var e = bestEligibilityT13_(reqClass, candClasses);
    if (!e.eligible) { blocked++; return; }

    // 3b. Recruiter-learning affinity (existing T13)
    var mult = affinityMultiplierT13_(ss, reqClass.group, e.viaGroup || candClasses[0].group);
    var score = Math.round(e.score * mult);

    // 3c. Skill boosters — only when the query demanded them
    var blob = nlBlob_(cand);   // lowercased kaiAssessment+top3+gulfExp+position
    if (q.certs.length && q.certs.some(function(c){ return blob.indexOf(c.toLowerCase()) >= 0; }))
      score = Math.min(100, score + 8);
    if (q.shutdown && /shutdown|turnaround|\btar\b|overhaul|outage/.test(blob))
      score = Math.min(100, score + 8);

    // 3d. Gulf-reality HARD filters (a man who fails these cannot deploy)
    if (q.gccDest && blob.indexOf(q.gccDest.toLowerCase()) < 0 &&
        String(cand.gulfExp||'').toLowerCase().indexOf(q.gccDest.toLowerCase()) < 0) return;
    if (q.gccExpRequired) {
      var mob = classifyGCCMobility_(cand.gulfExp, cand.currentLocation);
      if (mob !== 'GCC_CURRENT' && mob !== 'GCC_PAST') return;
    }
    if (q.sourceCountry) {
      var src = (String(cand.nationality||'') + ' ' + String(cand.currentLocation||'')).toLowerCase();
      if (src.indexOf(q.sourceCountry.toLowerCase()) < 0) return;
    }
    if (q.expMin > 0 && (parseFloat(cand.experience)||0) < q.expMin) return;
    if (q.certs.length) {  // cert was REQUIRED, not just a booster
      if (!q.certs.some(function(c){ return blob.indexOf(c.toLowerCase()) >= 0; })) return;
    }

    // 3e. Final tier
    var tier = score >= T13_STRONG ? 'STRONG' :
               score >= T13_GOOD   ? 'GOOD'   :
               score >= T13_POSSIBLE ? 'POSSIBLE' : 'HIDDEN';
    if (tier === 'HIDDEN') { blocked++; return; }

    cand.confidenceTier = tier;
    cand.matchScore = score;
    cand.matchedVia = e.via;        // which mined trade matched
    buckets[tier].push(cand);
  });

  ['STRONG','GOOD','POSSIBLE'].forEach(function(t){
    buckets[t].sort(function(a,b){ return b.matchScore - a.matchScore; });
  });

  var limit = Math.min(200, parseInt(params.limit||'50')||50);
  var records = buckets.STRONG.concat(buckets.GOOD, buckets.POSSIBLE).slice(0, limit);

  // 4. Log query for the weekly learning loop
  logNLQuery_(q.rawQuery, q, records.length);

  return {
    ok: true,
    engine: 'nlSearch-T13',
    total: records.length,
    counts: { STRONG:buckets.STRONG.length, GOOD:buckets.GOOD.length,
              POSSIBLE:buckets.POSSIBLE.length, blocked:blocked },
    queryInterpreted: {
      trade: reqTrade, reqGroup: reqClass.group, reqCollar: reqClass.collar,
      certs: q.certs.join(','), gccDest: q.gccDest||'', sourceCountry: q.sourceCountry||'',
      gccExp: q.gccExpRequired, shutdown: q.shutdown, experienceMin: q.expMin,
      positionLevel: q.positionLevel||''
    },
    learningNote: latestLearningNote_(),   // "KAI learned 3 trades this week" or ''
    records: records
  };
}
```

### `parseNLQuery_` — backend parser (mirrors search-parser-spec.md)

```javascript
function parseNLQuery_(raw) {
  var s = String(raw||'').toLowerCase().trim().replace(/\s+/g,' ');
  var q = { tradeTerm:'', certs:[], gccDest:'', sourceCountry:'',
            gccExpRequired:false, shutdown:false, expMin:0, expMax:0,
            positionLevel:'', qty:0, rawQuery:raw };

  // qty
  var qm = s.match(/\b(?:get|need|want|find|show|give)\s+(\d+)\b/) ||
           s.match(/\b(\d+)\s+(?:welders?|fitters?|technicians?|drivers?|operators?|inspectors?|officers?|candidates?|nos?)\b/);
  if (qm) q.qty = parseInt(qm[1]);

  // experience
  var em = s.match(/(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:exp)?/);
  if (em) q.expMin = parseInt(em[1]);

  // certs (from NL_CERTS dictionary — keep in sync with trade-taxonomy.ts CERTIFICATIONS)
  NL_CERTS.forEach(function(c){
    if (c.aliases.some(function(a){ return s.indexOf(a) >= 0; })) q.certs.push(c.canonical);
  });

  // gcc destination
  NL_GCC_DEST.forEach(function(d){
    if (!q.gccDest && d.aliases.some(function(a){ return s.indexOf(a) >= 0; })) q.gccDest = d.canonical;
  });

  // source country
  NL_SOURCE.forEach(function(d){
    if (!q.sourceCountry && d.aliases.some(function(a){ return s.indexOf(a) >= 0; })) q.sourceCountry = d.canonical;
  });

  // gcc experience intent
  q.gccExpRequired = /gcc exp|gulf exp|gcc experience|gulf experience|worked in (gcc|saudi|uae|qatar)/.test(s);

  // shutdown
  q.shutdown = /shutdown|turnaround|\btar\b|overhaul|outage/.test(s);

  // position level
  if (/supervisor|in charge/.test(s)) q.positionLevel='SUPERVISOR';
  else if (/foreman|chargeman|leadman/.test(s)) q.positionLevel='FOREMAN';
  else if (/inspector|\bqc\b|\bqa\b|\bndt\b/.test(s)) q.positionLevel='INSPECTOR';
  else if (/engineer/.test(s)) q.positionLevel='ENGINEER';
  else if (/manager/.test(s)) q.positionLevel='MANAGER';
  else if (/technician/.test(s)) q.positionLevel='TECHNICIAN';

  // trade term = the remaining strongest noun phrase.
  // Strip qty/exp/cert/country words, hand the rest to resolveTradeDynamic_.
  q.tradeTerm = s;   // resolveTradeDynamic_ does fuzzy family match anyway
  return q;
}
```

### Helpers

```javascript
function nlBlob_(cand) {
  return [cand.kaiAssessment, cand.positionApplied,
          (cand.top3Positions && cand.top3Positions.full ? cand.top3Positions.full.join(' ') : cand.top3Positions),
          cand.gulfExp, cand.recommendedRoles].join(' ').toLowerCase();
}

function logNLQuery_(rawQuery, interpreted, resultCount) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var s = ss.getSheetByName('_NLQueryLog') || ss.insertSheet('_NLQueryLog');
    if (s.getLastRow() === 0)
      s.appendRow(['queryId','timestamp','rawQuery','interpretedJSON','resultCount','recruiterId']);
    s.appendRow(['NLQ-'+new Date().getTime(), new Date(), rawQuery,
                 JSON.stringify(interpreted), resultCount, (typeof CURRENT_ACTOR_!=='undefined'?CURRENT_ACTOR_:'')]);
  } catch(e){}
}
```

---

## SECTION 47c — `resolveTradeDynamic_` (SEED ∪ LEARNED)

```javascript
// Resolves a typed term to a canonical trade using SEED (in-code TRADE_FAMILIES)
// THEN the LEARNED _Taxonomy sheet. A trade learned last week is searchable now.
function resolveTradeDynamic_(term) {
  if (!term) return '';
  var t = String(term).toLowerCase();
  // 1. SEED — existing TRADE_FAMILIES dict
  for (var fam in TRADE_FAMILIES) {
    var kws = TRADE_FAMILIES[fam];
    for (var i=0;i<kws.length;i++) if (t.indexOf(kws[i]) >= 0) return kws[i];
  }
  // 2. LEARNED — _Taxonomy sheet (cached 1h)
  var learned = getLearnedTaxonomyCached_();   // [{term, aliases[], family}]
  for (var j=0;j<learned.length;j++)
    if (learned[j].aliases.some(function(a){ return t.indexOf(a) >= 0; })) return learned[j].term;
  return '';
}
```

---

## SECTION 48 — `learnTaxonomyWeekly` (the mutation loop)

Implement the 8 steps from **taxonomy-learning-engine.md §2**. Skeleton:

```javascript
// ════════════════════════════════════════════════════════════════════
// SECTION 48 — TAXONOMY LEARNING ENGINE (the mutating brain, weekly)
// ════════════════════════════════════════════════════════════════════
function learnTaxonomyWeekly() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var since = lastLearnRunTs_();
  var report = { newTrades:0, newAliases:0, newCerts:0, autoApproved:0, queued:0,
                 affinityChanges:0, jdsScanned:0, cvsScanned:0 };

  // STEP 1 — harvest demand from _KAI_Knowledge (rows since `since`)
  // STEP 2 — harvest supply from Candidates (rows since `since`) → mine skills
  // STEP 3 — collect UNRESOLVED trade strings (classifyTradeT13_ group GENERAL/unknown)
  // STEP 4 — for each unresolved cluster, ONE Gemini call (cap 20/run):
  //          "Classify GCC trade <x>: family, collar, recruitmentClass, 5 aliases"
  // STEP 5 — confidence gate:
  //            freq>=3 JDs OR >=5 CVs & clean → append _Taxonomy status LEARNED_AUTO
  //            else → append _T13_GovernanceQueue status PENDING
  //            NEVER-ADD filter rejects it/health/finance/hospitality
  // STEP 6 — append new aliases/certs to known trades in _Taxonomy
  // STEP 7 — read _MatchFeedback; nudge T13 affinity (write _MatchFeedback agg);
  //          clamp ±5, floor 0 ceiling 100
  // STEP 8 — append _TaxonomyLearningLog row + stamp lastLearnRunTs_

  appendLearningLog_(ss, report);
  return report;
}

function latestLearningNote_() {
  // reads last _TaxonomyLearningLog row → "KAI learned N trades, M aliases this week"
  // returns '' if nothing learned
}
```

### Install trigger + bless it

```javascript
// add to BLESSED_TRIGGERS_:
//   'learnTaxonomyWeekly'
function installLearnTaxonomyTrigger() {
  ScriptApp.newTrigger('learnTaxonomyWeekly').timeBased().everyDays(7).atHour(3).create();
}
```

---

## SECTION 47b — `_SkillIndex` (optional Phase-2, not required for v1)

v1 works WITHOUT `_SkillIndex` because `resolveCandidateTradesT13_` + `nlBlob_`
already mine skills live per query. Build `_SkillIndex` later only if query
latency over the full candidate corpus becomes too slow (pre-computed cache).
See skill-mining-spec.md §2.

---

## TEST PLAN (run from GAS editor before deploy)

```javascript
function testNLSearch() {
  ['6gr welders available in india',
   'instrument technicians gcc experience',
   'heavy driver saudi license',
   'hse officer nebosh',
   'mechanical fitter shutdown experience'].forEach(function(query){
     var r = nlSearch_({ q: query, limit: 20 });
     Logger.log(query + '  →  ' + r.counts.STRONG + ' STRONG / ' +
                r.counts.GOOD + ' GOOD / ' + r.counts.POSSIBLE + ' POSSIBLE  ' +
                '| interpreted: ' + JSON.stringify(r.queryInterpreted));
  });
}
```

Expected: each query returns non-zero results, `queryInterpreted.trade` resolves
to the right family, certs/gccDest/shutdown flags set correctly.

---

## DEPLOY

1. Paste Sections 47, 47c into `KAI_API_Bridge_MASTER.gs`.
2. Create `KAI_T15_Learning.gs` with Section 48.
3. Add the ONE router line in `doGet`.
4. Run `testNLSearch` → confirm log output.
5. Run `installLearnTaxonomyTrigger` once.
6. Deploy new web app version. Confirm via `?action=version`.
7. Hand the live `?action=nlSearch` URL to Lovable.
