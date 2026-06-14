# KAI NL Search — GAS Field Requirements

**Status:** DESIGN LOCKED  
**Version:** 1.0  
**Date:** 2026-06-12  
**Target file:** `KAI_API_Bridge_MASTER.gs`

---

## 1. Summary

This document defines every GAS-side change required to support NL search.
All changes are **additive only** — no existing function is modified,
no column is removed, no existing API param behaviour changes.

---

## 2. Existing Fields (Already Present — No Changes)

These sheet columns and `getCandidates_` params are already available
and used directly by NL search without any GAS change:

| Sheet Col | COL key | Field | NL Param |
|-----------|---------|-------|----------|
| 9  | `trade` | Trade / Position | `trade` |
| 3  | `nationality` | Nationality | `nationality` |
| 11 | `experience` | Years Experience | `experienceMin`, `experienceMax` |
| 12 | `gulfExp` | Gulf Experience text | `gccMobility` (computed) |
| 20 | `kaiAssessment` | AI full assessment | `q` full-text blob |
| 8  | `positionApplied` | Applied position | `q` full-text blob |
| 26 | `currentLocation` | Current location | location display |
| 42 | `top3Positions` | Top 3 positions | `top3Label` filter |
| 17 | `score` | KAI readiness score | sort + confidence tier |
| 39 | `educationEnum` | Education level enum | `q` full-text blob |
| 16 | `flags` | Source flags | `q` full-text blob |

---

## 3. New GAS Action: `nlSearch_`

### 3.1 Routing

Add to `doGet` action router (Section 1):

```javascript
else if (action === 'nlSearch') out = JSON.stringify(nlSearch_(params));
```

Placement: after the existing `else if (action === 'search')` line.

### 3.2 Function Signature

```javascript
function nlSearch_(params) {
  // 1. Map NL-specific params to getCandidates_ params
  // 2. Handle trade2 OR logic
  // 3. Handle cert filter
  // 4. Handle gccDest filter
  // 5. Handle shutdownExp filter
  // 6. Handle positionLevel filter
  // 7. Delegate to getCandidates_
  // 8. Return with queryInterpreted echo
}
```

### 3.3 New Params to Handle

#### `trade2` — Secondary trade (OR logic)

```javascript
var fTrade2 = String(params.trade2 || '').trim().toLowerCase();
```

In the row filter loop (after existing `fTrade` check):
```javascript
if (fTrade || fTrade2) {
  var tradeStr = trade.toLowerCase();
  var matchesTrade  = fTrade  && tradeStr.indexOf(fTrade)  >= 0;
  var matchesTrade2 = fTrade2 && tradeStr.indexOf(fTrade2) >= 0;
  if (!matchesTrade && !matchesTrade2) return;
}
```

#### `cert` — Certification filter

```javascript
var fCert = String(params.cert || '').trim().toLowerCase();
var fCertList = fCert ? fCert.split(',').map(function(c){ return c.trim(); }).filter(Boolean) : [];
```

In row filter loop:
```javascript
if (fCertList.length > 0) {
  var certBlob = [
    String(row[COL.kaiAssessment-1]||''),
    String(row[COL.positionApplied-1]||''),
    String(row[COL.top3Positions-1]||''),
    String(row[COL.flags-1]||'')
  ].join(' ').toLowerCase();
  var certMatch = fCertList.some(function(c){ return certBlob.indexOf(c) >= 0; });
  if (!certMatch) return;
}
```

#### `gccDest` — GCC destination country filter

```javascript
var fGccDest = String(params.gccDest || '').trim().toLowerCase();
```

In row filter loop:
```javascript
if (fGccDest) {
  var gulfExpStr = String(row[COL.gulfExp-1]||'').toLowerCase();
  if (gulfExpStr.indexOf(fGccDest) < 0) return;
}
```

#### `shutdownExp` — Shutdown/TAR experience

```javascript
var fShutdown = String(params.shutdownExp || '').trim();
```

In row filter loop:
```javascript
if (fShutdown === '1') {
  var kaiStr = String(row[COL.kaiAssessment-1]||'').toLowerCase();
  var posStr = String(row[COL.positionApplied-1]||'').toLowerCase();
  var hasShutdown = /shutdown|turnaround|\btar\b|overhaul|outage/.test(kaiStr + ' ' + posStr);
  if (!hasShutdown) return;
}
```

#### `positionLevel` — Level filter via T13 eligibility engine

```javascript
var fPosLevel = String(params.positionLevel || '').trim().toUpperCase();
```

In row filter loop (after trade filter):
```javascript
if (fPosLevel) {
  var candLevel = getPositionLevel_(trade);
  var eligibility = getEligibility_(fPosLevel, candLevel);
  if (eligibility < ELIGIBILITY_FLOOR) return;
}
```

### 3.4 Response Shape

```javascript
function nlSearch_(params) {
  // ... build enriched params ...
  var result = getCandidates_(enrichedParams);

  // Echo back what was interpreted
  result.queryInterpreted = {
    trade:        String(params.trade || ''),
    trade2:       String(params.trade2 || ''),
    cert:         String(params.cert || ''),
    gccMobility:  String(params.gccMobility || ''),
    gccDest:      String(params.gccDest || ''),
    positionLevel:String(params.positionLevel || ''),
    experienceMin:parseFloat(params.experienceMin || '0') || 0,
    shutdownExp:  params.shutdownExp === '1'
  };

  // Log raw query for future intelligence learning
  if (params.rawQuery) {
    logNLQuery_(params.rawQuery, result.queryInterpreted, result.total);
  }

  return result;
}
```

---

## 4. New Sheet: `_NLQueryLog`

Captures every NL search for future intelligence learning.
(Optional at launch — add when intelligence layer is ready.)

### Headers

```
queryId | timestamp | rawQuery | interpretedJSON | resultCount | recruiterId
```

### `logNLQuery_` function

```javascript
function logNLQuery_(rawQuery, interpreted, resultCount) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var s  = ss.getSheetByName('_NLQueryLog');
    if (!s) {
      s = ss.insertSheet('_NLQueryLog');
      s.appendRow(['queryId','timestamp','rawQuery','interpretedJSON','resultCount','recruiterId']);
    }
    s.appendRow([
      'NLQ-' + new Date().getTime(),
      new Date(),
      rawQuery,
      JSON.stringify(interpreted),
      resultCount,
      CURRENT_ACTOR_ || ''
    ]);
  } catch(e) { /* non-fatal — never block search for logging */ }
}
```

---

## 5. Existing Fields — Data Quality Requirements for NL Search

These fields must be populated for NL search to return accurate results.
Document current population rates (from `auditBacklog` / recontact campaign data):

| Field | COL | Current Population | Required for NL | Fix Path |
|-------|-----|--------------------|-----------------|----------|
| `trade` | 9 | ~85% | Trade filter | `enrichTop3Positions` backfill |
| `gulfExp` | 12 | ~70% | GCC mobility + gccDest | Recontact campaign |
| `experience` | 11 | ~75% | expMin/expMax filter | Recontact campaign |
| `kaiAssessment` | 20 | ~90% | cert + shutdown filter | Auto-filled by Gemini at parse |
| `currentLocation` | 26 | ~40% | location display | Recontact campaign |
| `top3Positions` | 42 | ~60% | top3Label + cert hint | `enrichTop3Positions` trigger |

**Minimum viable NL search quality threshold:** `trade` >= 80% populated.  
Below this, the primary filter returns too few results for NL to be useful.

---

## 6. New Sheet: `_SkillIndex` — The Mined Skill Layer

KAI mines skill from every CV, not just the single `trade` cell. One row per
active candidate. Written at parse time + by the weekly sweep + one-time backfill.

Full column spec: **skill-mining-spec.md §2**. Summary:

```
kaiNo | primaryTrade | tradeFamily | collar | recruitmentClass |
secondaryTrades | codedTests | certs | processSkills | shutdownSignal |
gccEmployers | gccCountries | licenses | sourceCountry | skillBlob | lastMined
```

### `buildSkillIndexRow_(cand)` — mining function

Reuses existing engines — does NOT re-parse CVs, does NOT call Gemini:
```javascript
function buildSkillIndexRow_(cand) {
  var blob = [cand.kaiAssessment, cand.positionApplied, cand.top3Positions,
              cand.gulfExp, cand.recommendedRoles].join(' ').toLowerCase();
  return {
    kaiNo:            cand.kaiNo,
    primaryTrade:     cand.trade,
    tradeFamily:      classifyTradeT13_(cand.trade).group,   // existing T13
    collar:           classifyTradeT13_(cand.trade).collar,  // existing T13
    recruitmentClass: getRecruitmentClassT14_(cand.trade),   // existing T14
    secondaryTrades:  mineSecondaryTrades_(cand.top3Positions, cand.positionApplied),
    codedTests:       (blob.match(/\b[1-6]g[r]?\b/g) || []).join(','),
    certs:            mineCerts_(blob),          // match CERTIFICATIONS aliases
    processSkills:    mineProcessSkills_(blob),  // tig,smaw,dcs,plc,ndt,...
    shutdownSignal:   /shutdown|turnaround|\btar\b|overhaul|outage/.test(blob),
    gccEmployers:     mineEmployers_(cand.gulfExp),
    gccCountries:     mineGCCCountries_(cand.gulfExp),
    licenses:         mineLicenses_(blob),
    sourceCountry:    cand.nationality || cand.currentLocation,
    skillBlob:        blob,
    lastMined:        new Date()
  };
}
```

`nlSearch_` matches against `_SkillIndex.skillBlob` and structured tags — this is
what lets a Fabricator CV surface for a 6G Welder requirement.

---

## 7. New Trigger: `learnTaxonomyWeekly` — The Mutation Loop

Full spec: **taxonomy-learning-engine.md §2**. This is the heartbeat that makes
the taxonomy grow wilder/sharper/bigger every week.

### Function

```javascript
// SECTION 48 — TAXONOMY LEARNING ENGINE (weekly mutation)
function learnTaxonomyWeekly() {
  // 1. Harvest demand   — _KAI_Knowledge rows since last run
  // 2. Harvest supply   — Candidates since last run → mine skills
  // 3. Detect unknown trades/aliases (classifyTradeT13_ → UNRESOLVED)
  // 4. Classify new trade (1 cheap Gemini call per new cluster)
  // 5. Confidence gate  — auto-approve OR queue _T13_GovernanceQueue
  // 6. Enrich known trades — append aliases/certs to _Taxonomy
  // 7. Mutate affinity  — read _MatchFeedback, nudge T13_ALLOWED (±5 clamp)
  // 8. Stamp _TaxonomyLearningLog
}
```

### Reads/writes (all disjoint from live email pipeline — NO ScriptLock)

| Sheet | Access | Purpose |
|-------|--------|---------|
| `_KAI_Knowledge` | read | weekly demand |
| `Candidates` | read | weekly supply |
| `_Taxonomy` | append | new trades/aliases (status LEARNED_AUTO) |
| `_T13_GovernanceQueue` | append | uncertain trades → recruiter approval |
| `_MatchFeedback` | read | recruiter accept/reject signal |
| `_SkillIndex` | upsert | refresh skills for new candidates |
| `_TaxonomyLearningLog` | append | visible proof of weekly growth |

### Cost guard
Gemini called ONLY on unresolved JD trade strings (a handful/week). No CV
re-parsing. Pennies/week. Hard cap: 20 Gemini calls per run.

---

## 8. `nlSearch_` Reads SEED ∪ LEARNED (dynamic taxonomy)

`nlSearch_` must NOT hardcode the trade list. At query time it resolves trade
terms against the union:

```javascript
function resolveTradeDynamic_(term) {
  // 1. SEED   — TRADE_FAMILIES dict (in-code)
  // 2. LEARNED — _Taxonomy sheet rows (status SEED|LEARNED_AUTO|APPROVED)
  // Cached 1 hour. A trade learned this week is searchable now.
  var seed = resolveAgainstSeed_(term);
  if (seed) return seed;
  return resolveAgainstTaxonomySheet_(term);  // reads _Taxonomy
}
```

This is the line between a static ATS and a mutating intelligence: the search
vocabulary grows on its own.

---

## 9. BLESSED_TRIGGERS_ — Add the Heartbeat

`nlSearch_` itself is a `doGet` handler (no trigger). But the learning loop adds
ONE new time-based trigger:

```javascript
var BLESSED_TRIGGERS_ = [
  'processAllInboxEmails',
  'watchNewCandidates',
  'runQueueBatch',
  'enrichTop3Positions',
  'processNightBacklog',
  'learnTaxonomyWeekly'      // NEW — weekly taxonomy mutation (every 7 days)
];
```

---

## 10. Implementation Checklist (for GAS developer)

NL Search (Section 47):
- [ ] `nlSearch_` added, `doGet` router entry for `action=nlSearch`
- [ ] `trade2` OR logic tested with `"mechanical fitter"`
- [ ] `cert` filter tested with `"nebosh"` → HSE only
- [ ] `gccDest` filter tested with `"Saudi Arabia"`
- [ ] `shutdownExp=1` tested
- [ ] `positionLevel=WORKER` tested → welders in, inspectors blocked
- [ ] `queryInterpreted` echo present
- [ ] `nlSearch_` resolves trades via SEED ∪ `_Taxonomy` (not hardcoded)
- [ ] matches against `_SkillIndex.skillBlob` (skill mining, not trade cell only)
- [ ] Existing `?action=candidates` regression-identical

Skill Index (Section 47b):
- [ ] `buildSkillIndexRow_` written, reuses T13/T14 (no re-parse, no Gemini)
- [ ] One-time `backfillSkillIndex()` run over all active candidates
- [ ] Parse pipeline writes `_SkillIndex` row on every new CV

Learning Engine (Section 48):
- [ ] `learnTaxonomyWeekly` written (Steps 1–8)
- [ ] Auto-approve confidence gate (≥3 JDs or ≥5 CVs)
- [ ] Affinity mutation clamped ±5, floor 0 / ceiling 100
- [ ] NEVER-ADD filter rejects IT/health/finance noise
- [ ] `_TaxonomyLearningLog` written every run
- [ ] `learnTaxonomyWeekly` added to `BLESSED_TRIGGERS_` + 7-day trigger installed
- [ ] Gemini hard cap 20 calls/run verified
- [ ] New deployment version confirmed via `?action=version`

---

## 11. GAS Section Placement

| Section | Function | File |
|---------|----------|------|
| 47 | `nlSearch_` + `resolveTradeDynamic_` | KAI_API_Bridge_MASTER.gs |
| 47b | `buildSkillIndexRow_` + `backfillSkillIndex` | KAI_API_Bridge_MASTER.gs |
| 48 | `learnTaxonomyWeekly` + mutation helpers | KAI_API_Bridge_MASTER.gs (or new KAI_T15_Learning.gs) |

```javascript
// ════════════════════════════════════════════════════════════════════
// SECTION 48 — TAXONOMY LEARNING ENGINE (the mutating brain)
// ════════════════════════════════════════════════════════════════════
```
