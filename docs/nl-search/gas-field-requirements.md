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

## 6. No New Sheet Columns Required

NL search uses only existing COL definitions (cols 1–42).
No new columns are added to the Candidates sheet.
`_NLQueryLog` is a new analytics sheet only — not part of the candidate record.

---

## 7. BLESSED_TRIGGERS_ — No Change

`nlSearch_` is a web app request handler (`doGet`), not a time-based trigger.
`BLESSED_TRIGGERS_` list is unchanged:

```javascript
var BLESSED_TRIGGERS_ = [
  'processAllInboxEmails',
  'watchNewCandidates',
  'runQueueBatch',
  'enrichTop3Positions',
  'processNightBacklog'
];
```

---

## 8. Implementation Checklist (for GAS developer)

Before marking NL search LIVE, verify each item:

- [ ] `nlSearch_` function added to `KAI_API_Bridge_MASTER.gs`
- [ ] `doGet` router entry added for `action=nlSearch`
- [ ] `trade2` OR logic implemented and tested with `"mechanical fitter"`
- [ ] `cert` filter tested with `"nebosh"` → returns HSE candidates only
- [ ] `gccDest` filter tested with `"Saudi Arabia"` → only Saudi gulfExp
- [ ] `shutdownExp=1` tested → only candidates with shutdown in assessment
- [ ] `positionLevel=WORKER` tested → welders returned, welding inspectors blocked
- [ ] `queryInterpreted` echo present in every response
- [ ] `_NLQueryLog` sheet auto-created on first search
- [ ] Existing `?action=candidates` returns identical results as before (regression test)
- [ ] New deployment version created and URL confirmed via `?action=version`

---

## 9. GAS Section Placement

Add `nlSearch_` as **Section 47** in `KAI_API_Bridge_MASTER.gs`.

Follow the existing section header pattern:
```javascript
// ════════════════════════════════════════════════════════════════════
// SECTION 47 — NL SEARCH ENGINE
// ════════════════════════════════════════════════════════════════════
```
