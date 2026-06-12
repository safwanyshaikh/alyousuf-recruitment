# KAI NL Search — API Contract (Lovable ↔ GAS)

**Status:** DESIGN LOCKED  
**Version:** 1.0  
**Date:** 2026-06-12  
**GAS Bridge URL:** `https://script.google.com/macros/s/AKfycbxfNPL371bf8UF84bMz3E2i8drw4opVpWJMb24w2pW_p_og08_MwlJ5PyRqtaZPHv02Ng/exec`

---

## 1. New Action: `nlSearch`

Lovable calls this action for NL search. GAS routes it through the NL
query interpreter, then delegates to `getCandidates_` with enriched params.
Existing `candidates` and `search` actions are unchanged.

### Request

```
GET ?action=nlSearch&token=<jwt>&<params>
```

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `trade` | string | Primary trade keyword (alias or gasKey, case-insensitive) |
| `trade2` | string | Secondary trade keyword — OR logic with `trade` |
| `positionLevel` | string | WORKER \| TECHNICIAN \| FOREMAN \| SUPERVISOR \| INSPECTOR \| ENGINEER \| MANAGER |
| `cert` | string | Comma-separated canonical cert names (e.g. `NEBOSH IGC,IOSH`) |
| `gccMobility` | string | GCC_CURRENT \| GCC_PAST \| INDIA_READY \| UNKNOWN |
| `gccDest` | string | Canonical GCC country name (e.g. `Saudi Arabia`) — filters by target deployment country in gulfExp |
| `nationality` | string | Source country name for nationality filter (e.g. `India`) |
| `experienceMin` | number | Minimum years experience |
| `experienceMax` | number | Maximum years experience |
| `limit` | number | Max results (1–200, default 50) |
| `q` | string | Additional free-text fallback (appended after NL extraction) |
| `shutdownExp` | `1` | Restrict to candidates with shutdown/TAR experience in kaiAssessment |
| `page` | number | Pagination (default 1) |
| `rawQuery` | string | Original NL input preserved for logging |

All params are optional. Missing params = no filter applied for that dimension.

### Response

```typescript
interface NLSearchResponse {
  ok: boolean;
  // Meta
  total: number;         // total matching records
  page: number;
  limit: number;
  queryInterpreted: {    // echo of what GAS understood
    trade: string;
    trade2: string;
    cert: string;
    gccMobility: string;
    gccDest: string;
    positionLevel: string;
    experienceMin: number;
    shutdownExp: boolean;
  };
  // Result set — same shape as existing getCandidates_ records
  records: CandidateRecord[];
}

interface CandidateRecord {
  // Identity (never shown in grid — drawer + search only per CLAUDE.md)
  kaiNo: string;
  name: string;
  nationality: string;
  age: number;

  // Trade + Position
  trade: string;
  positionApplied: string;
  top3Positions: Top3Position[];

  // Experience
  experience: number;          // years total
  gulfExp: string;             // raw GCC exp text
  gccMobility: 'GCC_CURRENT' | 'GCC_PAST' | 'INDIA_READY' | 'UNKNOWN';

  // Location
  currentLocation: string;

  // Score
  score: number;               // 0-100 KAI readiness score
  confidenceTier: 'STRONG' | 'GOOD' | 'POSSIBLE';
  deployScore: number;

  // Stage
  stage: string;               // display stage
  verdict: string;

  // Education
  educationLevel: string;
  educationSubject: string;

  // Contact (for drawer only)
  mobile: string;
  email: string;

  // CV
  cvLink: string;

  // Certs / Flags
  ecrStatus: string;
  flags: string;
  missingFields: string;

  // AI Output
  kaiSnippet: string;          // first 150 chars of kaiAssessment
  recommendedRoles: string;

  // Sort
  applicationDate: string;     // yyyy-MM-dd
  _sortTs: number;             // epoch ms for precise sort
}

interface Top3Position {
  rank: number;
  label: string;
  yearsExp: number;
}
```

---

## 2. Cert Filter Behaviour (GAS side)

When `cert` param is present, GAS applies **substring matching** against:
- `COL.kaiAssessment` (col 20)
- `COL.positionApplied` (col 8)
- `COL.top3Positions` (col 42)
- `COL.flags` (col 16)

All four columns concatenated into a search blob, `indexOf(certAlias) >= 0`.  
Each cert in the comma-separated list is OR-ed (candidate must match at least one).

---

## 3. GCC Destination Filter (`gccDest`)

When `gccDest` is present, GAS applies substring match against `COL.gulfExp` (col 12).  
Example: `gccDest=Saudi Arabia` → returns only candidates whose gulf exp text
contains "saudi" or "saudi arabia" (case-insensitive).

---

## 4. Shutdown Experience Filter (`shutdownExp=1`)

GAS adds `shutdown` to the `fSearch` blob (existing full-text search field).  
Matches `kaiAssessment`, `positionApplied`, `top3Positions`, `educationEnum`, `nationality` blob.

---

## 5. Trade2 (Secondary Trade OR Logic)

When both `trade` and `trade2` are present:
- `trade` filter: `trade.toLowerCase().indexOf(fTrade) >= 0`
- `trade2` filter: `trade.toLowerCase().indexOf(fTrade2) >= 0`
- Row passes if **either** matches (OR logic)

---

## 6. Position Level Filter

When `positionLevel` is present, GAS applies `getPositionLevel_(candidate.trade)`
and compares using `LEVEL_MATRIX`. A candidate passes if `getEligibility_(reqLevel, candLevel) >= ELIGIBILITY_FLOOR (50)`.

This reuses the existing T13 eligibility engine — no new code path.

---

## 7. Result Ranking

NL search results are returned in this sort order (applied in GAS):
1. `score` descending (KAI readiness score)
2. `_sortTs` descending (newest application first, within same score band)

Lovable must NOT re-sort the response — trust GAS sort order.

---

## 8. Error Responses

```typescript
// 400 — bad params
{ ok: false, error: 'trade param required for nlSearch' }

// 401 — token missing/expired
{ ok: false, error: 'Unauthorized' }

// 500 — GAS internal error
{ ok: false, error: '<message>' }
```

---

## 9. Caching Policy

`nlSearch` results are **not cached** (personalised per query).  
`tradeLookup` and `positionLookup` remain cached (6h and 1h respectively) —
use these for autocomplete in the NL search input bar.

---

## 10. Search UI Contract (Lovable responsibility)

| Behaviour | Spec |
|-----------|------|
| Debounce input | 400ms after last keystroke |
| Minimum query length | 2 characters before calling parser |
| Show `queryInterpreted` | Yes — display interpreted chips (trade, cert, location) below input so recruiter can confirm NL was understood correctly |
| Confidence indicator | Show LOW confidence as a yellow warning: "Showing broad results — refine your query" |
| Pagination | Standard pagination using existing grid pattern |
| Empty result | "No candidates matched. Try a broader search." |
| Raw fallback | If confidence = LOW, also call `?action=candidates&q=<rawQuery>` in parallel and merge results |

---

## 11. Backward Compatibility

- `?action=candidates` — unchanged, still works
- `?action=search` — unchanged, still works (thin wrapper around candidates)
- `?action=nlSearch` — NEW, additive only
- No existing fields removed from `CandidateRecord`
- `trade2`, `cert`, `gccDest`, `shutdownExp`, `positionLevel` are new optional params
  that `getCandidates_` ignores if absent

---

## 12. Authentication

Same token as all other actions.  
Token key in localStorage: `kai_session_token`  
Header not used — token passed as query param `?token=<jwt>`
