# KAI NL Search — Parser Specification

**Status:** DESIGN LOCKED — implement against this spec, no deviation without PR update.  
**Version:** 1.0  
**Date:** 2026-06-12

---

## 1. Purpose

The NL Parser converts a free-text recruiter query into a structured
`ParsedQuery` object that the Matching Engine consumes.  
The parser runs **entirely on the frontend** (TypeScript).  
GAS never sees the raw query string — only the structured parameters.

---

## 2. Input Examples → Expected ParsedQuery

| Input | trade | qty | location | gccExp | cert | expMin | level |
|-------|-------|-----|----------|--------|------|--------|-------|
| `get 6gr welders available in india` | WELDER | – | India (SOURCE) | – | 6G | – | WORKER |
| `instrument technicians gcc experience` | INSTRUMENTATION | – | – | true | – | – | TECHNICIAN |
| `heavy driver saudi license` | HEAVY_EQUIPMENT | – | – | – | Saudi Driving License | – | WORKER |
| `hse officer nebosh` | HSE | – | – | – | NEBOSH IGC | – | WORKER |
| `mechanical fitter shutdown experience` | PIPEFITTER / MECHANICAL | – | – | – | – | – | WORKER |
| `need 10 pipe welders uae 5 years exp` | WELDER | 10 | UAE (GCC) | – | – | 5 | WORKER |
| `qc inspector cswip saudi` | QA_QC | – | Saudi Arabia | – | CSWIP 3.1 | – | INSPECTOR |

---

## 3. ParsedQuery Type

```typescript
interface ParsedQuery {
  // Always present after parsing (may be empty arrays)
  tradeKeys: string[];          // gasKey values from TRADE_FAMILIES, e.g. ['WELDER']
  certs: string[];              // canonical cert names
  gccExpRequired: boolean;      // true if query implies GCC experience needed
  locationContext: {
    country: string;            // canonical country name
    type: 'GCC' | 'SOURCE' | null;
  } | null;
  expMin: number;               // 0 = not specified
  expMax: number;               // 0 = not specified
  qty: number;                  // 0 = not specified (Lovable uses default limit)
  positionLevel: PositionLevel | null; // null = use trade default
  shutdownExperience: boolean;  // true if "shutdown", "turnaround", "TAR" found
  rawQuery: string;             // original input preserved for debug
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

---

## 4. Parsing Pipeline (ordered steps)

Execute in this order. Each step mutates the `parsed` accumulator.

### Step 1 — Normalize

```
input.toLowerCase().trim()
collapse multiple spaces → single space
remove punctuation except hyphens and /
```

### Step 2 — Extract Quantity

Match against `QUANTITY_PATTERNS` (see trade-taxonomy.ts).  
First match wins. Store in `parsed.qty`.  
Remove matched text from working string before next steps.

### Step 3 — Extract Experience

Match against `EXP_PATTERNS`.  
If range found (e.g. `3-5 years`): `expMin = 3`, `expMax = 5`.  
If single value: `expMin = N`, `expMax = 0`.  
Remove matched text from working string.

### Step 4 — Detect Certifications

For each `CertDef` in `CERTIFICATIONS`, check if any alias appears in
the normalized string.  
Collect all matches into `parsed.certs` (canonical names).  
**Do not remove from string** — cert keywords also act as trade hints in Step 6.

### Step 5 — Detect Location

For each `CountryDef` in `COUNTRIES`, check if any alias appears in
the normalized string.  
First match wins. Store canonical + type in `parsed.locationContext`.

### Step 6 — Detect GCC Experience Intent

Check if any `GCC_EXP_PHRASES` alias appears in the string.  
Also trigger `gccExpRequired = true` if `locationContext.type === 'GCC'`
**and** the query contains one of: `experience`, `exp`, `background`,
`worked`, `based`.

### Step 7 — Detect Shutdown / Turnaround

If string contains any of: `shutdown`, `shut down`, `turnaround`,
`turn around`, `tar`, `outage`, `overhaul` → `shutdownExperience = true`.

### Step 8 — Detect Trade

For each `TradeFamilyDef` in `TRADE_FAMILIES`:
  - Check every alias against the normalized string
  - Score = length of matched alias (longer match wins; avoids "mechanical" matching before "mechanical fitter")
  - Cert hints add +10 to score for cert's `tradesHint` trades

Collect **all** families with score > 0, sort by score descending.  
Store top 2 in `parsed.tradeKeys` (multi-trade is valid for ambiguous queries).

### Step 9 — Detect Position Level

Check normalized string for level override patterns:

| Pattern | Level |
|---------|-------|
| `supervisor`, `in charge` | SUPERVISOR |
| `foreman`, `chargeman`, `leadman` | FOREMAN |
| `technician` | TECHNICIAN |
| `inspector`, `qa`, `qc`, `ndt` | INSPECTOR |
| `engineer` | ENGINEER |
| `manager` | MANAGER |

If no override found, `positionLevel = null` (Matching Engine uses trade default).

### Step 10 — Confidence Score

| Condition | Level |
|-----------|-------|
| tradeKeys non-empty AND (cert OR location OR gccExp) | HIGH |
| tradeKeys non-empty | MEDIUM |
| only cert or only location found | LOW |
| nothing found | LOW (return empty result to UI) |

---

## 5. Ambiguity Resolution Rules

### "mechanical fitter"
- Matches both PIPEFITTER alias (`mechanical fitter`) and MECHANICAL family
- Both trade keys returned: `['PIPEFITTER', 'MECHANICAL']`
- GAS will OR the two families when filtering

### "6gr welder"
- `6gr` matches WELDER cert (`6G Weld Test`) and alias (`6gr`)
- Both cert + trade detected → confidence HIGH

### "hse officer nebosh"
- `nebosh` in cert → tradesHint = HSE → reinforces WELDER=0, HSE+=10
- `hse` + `officer` = trade HSE + level WORKER (officer = no level modifier)
- `positionLevel = null` → use HSE default = WORKER

### "heavy driver saudi license"
- `heavy driver` → alias in HEAVY_EQUIPMENT
- `saudi license` → cert `Saudi Driving License`
- No GCC exp phrase → `gccExpRequired = false`
- But Saudi is GCC country → `locationContext = { country: 'Saudi Arabia', type: 'GCC' }`
- Recruiter intent: candidates WITH Saudi driving license, sourced from anywhere

---

## 6. What the Parser Does NOT Do

- **No Gemini call.** Parser is pure regex + dictionary. Fast, free, offline.
- **No candidate data access.** Parser only reads taxonomy constants.
- **No spelling correction.** Alias list handles common variants; typos surface as LOW confidence.
- **No intent classification beyond search.** Parser returns a query struct; it does not route to actions like "add candidate" or "create requirement".

---

## 7. Parser Output → GAS Parameters Mapping

The Matching Engine (Lovable → GAS API call) maps `ParsedQuery` to
`getCandidates_` / `nlSearch_` query params:

| ParsedQuery field | GAS param |
|---|---|
| `tradeKeys[0]` | `trade` (primary) |
| `tradeKeys[1]` | `trade2` (secondary, OR logic) |
| `locationContext.type === 'SOURCE'` | `nationality` (country name) |
| `locationContext.type === 'GCC'` | `gccDest` (new param — see gas-field-requirements.md) |
| `gccExpRequired: true` | `gccMobility=GCC_CURRENT` or `gccMobility=GCC_PAST` |
| `certs` | `cert` (comma-separated canonical names) |
| `expMin` | `experienceMin` |
| `expMax` | `experienceMax` |
| `qty` | `limit` (capped at 200 by GAS) |
| `shutdownExperience: true` | `q=shutdown` (full-text search added) |
| `positionLevel` | `positionLevel` (new param) |

---

## 8. Edge Cases

| Query | Handling |
|-------|----------|
| Empty string | Return null → show default candidate list |
| Only a number (`"6"`) | `qty=6`, no trade → LOW confidence → show full list with limit=6 |
| Only a location (`"india"`) | `locationContext=India/SOURCE`, no trade → LOW confidence |
| Unknown trade (`"drone pilot"`) | No match → LOW confidence → `q=drone pilot` as full-text fallback |
| All caps (`"NEBOSH HSE OFFICER"`) | Normalize to lowercase first → works normally |
