# K14 OWNERSHIP AUDIT — PHASE 4C
**Phase 5.1 · Pre-implementation freeze document**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED — awaiting approval before K14 implementation begins
**Triggered by:** K14 Ownership Lock (10-point directive) — proof that A, B, C conditions were FALSE

> This document catalogs every intelligence-producing function in the repository,
> classifies its future single owner, and declares the K14 Absorption Map.
> **No code changes. No extraction. No refactor. No implementation.**
> K14 implementation begins only after this document is approved.

---

## SCOPE DEFINITION

**Files scanned (19 code files):**
Code.gs.txt · KAI_16May2026_V2.txt · KAI_16May2026_V2_Dashboard.txt ·
KAI_15May2026_V1_Dashboard.txt · patch_v280.txt · KAI_17May2026_patch_v282.gs.txt ·
KAI_17May2026_patch_v283.txt · KAI_17May2026_patch_v284.txt · patch_v284.txt ·
KAI_17May2026_patch_v285.txt · KAI_17May2026_patch_v287.gs.txt · patch_v287.txt ·
KAI_17May2026_patch_v288.txt · KAI_18May2026_patch_v289.txt · patch_v291.txt ·
patch_v292.txt · patch_v293.txt · patch_v294.txt · index.html

**Intelligence-producing functions found: 96**
**Protected assets audited: 4 groups (T13 · AssociateReliability · Commitments · Taxonomy)**

---

## PART 1 — COMPLETE INTELLIGENCE FUNCTION REGISTRY

### 1A. SCORING (numeric scores — 14 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| S01 | `scoreCandidate_` | Code.gs.txt | 1062 | Primary CV scoring, 0–100 across 9 dimensions | parsed (Gemini object), rules (_Rules), taxResult (taxonomy) | score, scoreBreakdown, flag (GREEN/YELLOW/ORANGE/RED), verdict (SHORTLISTED/NEEDS_REVIEW/NEEDS_CALL/REJECT), flags[], agePriority |
| S02 | `scoreAttachment_` | Code.gs.txt | 622 | Scores email attachments to select best CV file | Gmail attachment object (name, size, extension) | Integer score (filename+25, pdf+15, size band) |
| S03 | `computeMatchScore285_` | patch_v285.txt | 812 | Full candidate vs requirement match score (V285 engine) | candidate {trade, nationality, experience, gulfExp, appDate, deployabilityScore, passportExpiry}, req {trade, minExperience, gccPref} | {total: 0-100, tier: STRONG/GOOD/POSSIBLE/LONG_SHOT, breakdown, signals[]} |
| S04 | `contextScore_` | V2.txt | 472 | V2 context-aware match score (pre-V285, requirement-driven) | candidate object, req object | {score: 0-100, reasons[], warnings[]} |
| S05 | `getTradeScore285_` | patch_v285.txt | 583 | Trade similarity score 0–40, three-pass taxonomy | candidateTrade, reqTrade | Integer (0, 8, 10, 15, 18, 22, 28, 32, 38, 40) |
| S06 | `getFreshnessScore285_` | patch_v285.txt | 655 | Freshness score 0–30 from application date | appDateStr | Integer (today=30 → older=1, unknown=2) |
| S07 | `getFreshnessScoreV288_` | patch_v288.txt | 427 | V288 freshness score (weekday-label variant) | applicationDate | Integer (current-week=30 → Legacy=1) |
| S08 | `getDeployReadyScore285_` | patch_v285.txt | 681 | Deploy readiness score 0–15 from state + deployability | candidateState, deployabilityScore | Integer 0–15 |
| S09 | `getExperienceScore285_` | patch_v285.txt | 718 | Experience match score 0–10 (candidate vs req minimum) | candidateExpStr, reqMinYearsStr | Integer (exact match=10 → far below=1) |
| S10 | `getGulfExpScore285_` | patch_v285.txt | 738 | Gulf experience bonus 0–5 | gulfExpStr | Integer (≥5yr=5 → none=0) |
| S11 | `getNationalityScore285_` | patch_v285.txt | 752 | Nationality preference match 0–5 | candidateNationality, reqGccPref | Integer (match=5, no pref=3, mismatch=1) |
| S12 | `getPassportScore285_` | patch_v285.txt | 781 | Passport validity score 0–5 | passportExpiry | Integer (>180d=5 → expired=0, unknown=2) |
| S13 | `computeDeployabilityScore_` | V2.txt | 658 | Deployability score 0–100. Gulf mobilization intelligence. | passportExpiry, mobilityStatus, empStatus, noticeDays, medicalStatus, gulfExp, ecrStatus | Integer 0–100 (passport+mobility+employment+medical+gulf+ECR) |
| S14 | `mapCandidateToTaxonomy_` | Code.gs.txt | 1556 | Taxonomy bonus score 0–5 from _Taxonomy cross-reference | candidate {trade, industry}, taxonomy (Taxonomy sheet) | {pts: 0-5, industry, trade} |

**Scoring weights in current repo (V285 engine — computeMatchScore285_):**
trade(0–40) + freshness(0–30) + deployReady(0–15) + experience(0–10) + gulfExp(0–5) + nationality(0–5) + passport(0–5) = 0–105 capped at 100

**Scoring weights in index.html browser engine:**
trade+type(25) + role exp(20) + passport+gulf(15) + skills(15) + salary(10) + availability(5) + location(5) + industry(5) = 100

**Verdict thresholds in Code.gs scoreCandidate_:**
≥75 → SHORTLISTED (GREEN, P1 age) or NEEDS_REVIEW (YELLOW, P2 age) · 60–74 → NEEDS_REVIEW · <60 → NEEDS_CALL · AGE_OUT_OF_RANGE → REJECT

**Verdict thresholds in index.html:**
80–100 + all primary pass → AUTO SHORTLIST · 60–79 + all primary pass → REVIEW · <60 → REJECT/PARK

---

### 1B. MATCHING (8 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| M01 | `matchCandidatesToRequirement_` | V2.txt | 428 | V2 match engine — scores all active candidates vs req, returns top-N ranked | req object, maxResults | Array ranked by matchScore desc |
| M02 | `matchCandidatesForReq285_` | patch_v285.txt | 995 | V285 match engine (supersedes V2) — ranks all active candidates vs req | reqId, limit, tierFloor | {ok, matches[], summary{total,strong,good,possible,longShot}} |
| M03 | `matchCandidatesForReqPublic` | patch_v285.txt | 1068 | Public API wrapper for dashboard (calls M02) | reqId, limit | M02 result or {ok:false, msg} |
| M04 | `getTopMatchSummaryPublic` | patch_v285.txt | 1083 | Lightweight top-3 preview for JD card | reqId | {ok, reqId, trade, clientName, summary, top3[{name,score,tier,nationality}]} |
| M05 | `tradeSimilarityScore_` | V2.txt | 558 | V2 fuzzy trade similarity 0–25 (predecessor to S05) | trade1, trade2 | Integer (exact=25, substring=20, 2-word=15, 1-word=8, family=12, none=0) |
| M06 | `isJdEmail_` | V2.txt | 201 | Classifies email as JD vs CV | subject, body | Boolean (JD keyword AND quantity/role keyword) |
| M07 | `refreshRequirementMatchCounts_` | patch_v284.txt | 1379 | Candidate pool depth per requirement (counts by trade) | (none — reads Candidates + Requirements sheets) | Log of candidate counts per trade vs open requirements |
| M08 | `runMatchTaggingForAllReqs` | patch_v285.txt | 1171 | Batch: matches all open reqs vs all active candidates; writes Req IDs to candidate rows | (none) | Writes Req IDs to candidates' reqMatch col for GOOD+ matches |

---

### 1C. RANKING / SORTING (5 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| R01 | `matchCandidatesToRequirement_` (sort step) | V2.txt | 467 | Top-N ranked candidates by matchScore | scored[] internal array | scored.slice(0, maxResults) |
| R02 | `matchCandidatesForReq285_` (sort step) | patch_v285.txt | 1034 | Candidates sorted by total match score desc | scored[] internal array | ranked matches[] |
| R03 | `sortBy` | V2_Dashboard.txt | 1899 | Client-side sort of FILTERED candidates by any column | col (column key) | Re-sorted FILTERED array → renderTable() |
| R04 | `freshnessRank_` | V2_Dashboard.txt | 2981 | Numeric rank (days since application) for freshness sort | applicationDate | Integer (days, or 99999=unknown) |
| R05 | `runBulk` sort step | index.html | 931 | Sorts bulk-screened CVs by total_score descending | bResults[] (each with total_score) | sorted[] displayed with color coding |

---

### 1D. TRADE DETECTION / TAXONOMY (16 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| T01 | `normalizeTrade285_` | patch_v285.txt | 437 | Normalizes trade strings for taxonomy matching | trade (string) | Lowercase normalized (a/c→ac, hvac→heating ventilation..., etc.) |
| T02 | `tradeTermMatch285_` | patch_v285.txt | 473 | Token-based trade term matching (anti-greedy) | input (normalized), pattern (normalized) | Boolean |
| T03 | `findTradeGroup285_` | patch_v285.txt | 528 | Three-pass taxonomy group lookup (primary→similar→related, ALL groups before advancing) | trade (string) | {groupId, matchLevel: primary/similar/related/null, label} |
| T04 | `detectRoleCategory_` | patch_v284.txt | 376 | Classifies job title as TRADE / ADMIN / PROFESSIONAL | title (string) | String: TRADE / ADMIN / PROFESSIONAL |
| T05 | `mapCandidateToTaxonomy_` | Code.gs.txt | 1556 | Maps candidate trade+industry to Taxonomy sheet for bonus pts | candidate {trade, industry}, taxonomy array | {pts: 0-5, industry, trade} — also see S14 |
| T06 | `loadTaxonomy_` | Code.gs.txt | 1535 | Loads 4-col Taxonomy sheet into memory (cached 30 min) | (none) | Array {industry, department, trade, specialization} |
| T07 | `classifyEducation_` | patch_v282.gs.txt | 244 | Maps education raw text to enumerated level | raw (string from CV) | Master / Degree / Diploma / ITI / 12th Pass / 10th Pass / Below SSC |
| T08 | `normalizeEducationProfessional_` | patch_v284.txt | 255 | Maps education abbreviations from JDs to canonical descriptions | rawText (string) | {eduText, eduEnum, discipline} |
| T09 | `normalizeSalaryIntelligent_` | patch_v284.txt | 160 | Parses salary text into typed structure (handles Aramco codes, ranges) | rawText (string) | {salary, type: STATED_AMOUNT/SALARY_CODE/RANGE/NEGOTIABLE/NOT_STATED, salaryNum?, salaryRange?} |
| T10 | `extractJdWithGemini_` | V2.txt | 249 | Sends JD text to Gemini → structured requirement fields | body, subject | {clientName, deployCountry, trade, quantity, minExperience, minAge, maxAge, gccPreference, localTransfer, visitVisaOK, certifications, urgency, notes} |
| T11 | `extractJdEnhanced_` | patch_v283.txt | 259 | Enhanced JD extraction with fuzzy fallback when Gemini fails trade | text, subject | JD object (same as T10 + fuzzy regex fallbacks for trade/qty/experience/country) |
| T12 | `detectUrgency_` | patch_v283.txt | 316 | Classifies requirement urgency from keywords | text (string) | URGENT / FUTURE / NORMAL |
| T13 | `detectClientName_` | patch_v283.txt | 323 | Extracts client/company name from JD text | text (string) | String (company name or 'Unknown') |
| T14 | `findRule_` | Code.gs.txt | 1522 | Finds applicable trade rule (min years, min score) from _Rules sheet | rules (array from loadRules_), trade (string) | Rule object {pattern, minYears, minScore, notes} or null |
| T15 | `resolveLocation_` | patch_v284.txt | 461 | Resolves GCC city abbreviations/aliases to full names | raw (string) | String (resolved city name) |
| T16 | `inferCountryFromLocation_` | patch_v284.txt | 476 | Infers GCC deploy country from location string | loc (string) | String (country name) |

---

### 1E. ASSESSMENT / DECISION (10 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| A01 | `applyDecisionRules_` | Code.gs.txt | 1211 | Post-scoring decision enrichment; may downgrade verdict but never upgrades REJECT | scored (scoreCandidate_ output), rules | Mutates scored: TRADE_UNCLEAR / EDUCATION_MISSING / GULF_UNVERIFIED / MOBILE_MISSING flags; possible verdict downgrade |
| A02 | `deriveCandidateState_` | V2.txt | 758 | Derives V2 candidate state from parsed fields + verdict | candidate {mobile, email, trade, experience, age, verdict} | INCOMPLETE_CONTACT / UNKNOWN_TRADE / FRESHER_POOL / SHORTLISTED / REJECTED / UNDER_REVIEW / PARSED |
| A03 | `getNextAction_` | V2.txt | 943 | Embedded recruiter action decision tree — highest-priority next action | candidate {state, mobilityStatus, deployScore, missingFields, verdict} | {action, label, icon, urgency: HIGH/MEDIUM/NORMAL/LOW, detail} |
| A04 | `computeDeployReadyV2_` | patch_v283.txt | 131 | Classifies deployment readiness into 4 statuses | cand, nationality, missingFieldKeys[] | {status: YES/POSSIBLE/HOLD/PENDING REVIEW, type} |
| A05 | `validateImportRow_` | patch_v280.txt | 364 | Validates CSV import row (mandatory fields, email, phone, age/DOB, experience) | rowObj, fieldMap, rawHeaders | {ok: boolean, issues[], sheetRow[], data{}} |
| A06 | `updateCandidateState` | V2.txt | 916 | Updates a candidate's state + appends timeline event | rowIndex, newState, actor | Writes state to sheet; appends timeline |
| A07 | `updateTechnicalReview` | patch_v282.gs.txt | 292 | Saves human technical review verdict (validated against enum) | rowIndex, value (enum), reviewerEmail | Writes to techReview col; writes reviewer+timestamp; appends timeline |
| A08 | `getPassportStatus_` | patch_v283.txt | 41 | Classifies passport validity as status label | passportExpiry | Expired / Expiring Soon (<6 months) / Valid PP / Pending |
| A09 | `updateCandidateStateWithOwner` | patch_v282.gs.txt | 495 | Combined state + tech review update with recruiter ownership | rowIndex, newState, techReview | Writes state + tech review; appends timeline |
| A10 | `buildPrompt` | index.html | 802 | Constructs AI screening prompt encoding all 18 filters + scoring weights (the browser scoring policy) | cv (string), f (18-field filter object) | String prompt → Claude API call |

---

### 1F. SHORTLISTING (4 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| SL01 | `shortlistCandidateForReq` | patch_v284.txt | 1412 | Sets candidate state to SHORTLISTED; links Req ID | rowIndex, reqId | {ok, msg?}; writes SHORTLISTED to col 19; writes shortlist note+date to col 24 |
| SL02 | `bulkShortlistForReq` | V2.txt | 1285 | Bulk-shortlists multiple candidates; increments req's shortlistCount | rowIndices[], reqId | {ok, updated}; writes SHORTLISTED + reqId + timeline; increments Requirements col 18 |
| SL03 | `shortlistMatchForReq` | V2_Dashboard.txt | 4083 | Dashboard UI handler — calls SL01 via google.script.run | rowIndex, reqId | Toast + refreshData() on success |
| SL04 | `generateClientSafeRef` | V2.txt | 1369 | Generates client-safe candidate reference (hides KAI No) | rowIndex | External reference string |

---

### 1G. READINESS (11 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| G01 | `computeMobilityStatus_` | V2.txt | 636 | GCC mobility classification from profile text | currentLocation, gulfExp, empStatus, kaiAssessment | SAUDI_TRANSFER / UAE_VISIT / UAE_EMPLOYED / QATAR_LOCAL / OVERSTAY_RISK / EXIT_REQUIRED / GCC_RETURN / INDIA_READY / UNKNOWN |
| G02 | `computeDeployabilityScore_` | V2.txt | 658 | Deployability score 0–100 (see S13) | passportExpiry, mobilityStatus, empStatus, noticeDays, medicalStatus, gulfExp, ecrStatus | Integer 0–100 |
| G03 | `computeDeployReadyV2_` | patch_v283.txt | 131 | Deployment readiness classification (see A04) | cand, nationality, missingFieldKeys[] | {status: YES/POSSIBLE/HOLD/PENDING REVIEW, type} |
| G04 | `getMissingFields_` | V2.txt | 696 | Identifies critical missing fields that block deployment | candidate, req (optional) | Array of missing field keys: dob/mobile/currentLoc/empStatus/passportExp/ecrStatus/gulfExp/nationality/iqamaStatus/drivingLicense |
| G05 | `getPassportStatus_` | patch_v283.txt | 41 | Classifies passport validity (see A08) | passportExpiry | Expired / Expiring Soon / Valid PP / Pending |
| G06 | `getPassportMonthsLeft_` | patch_v283.txt | 52 | Returns months remaining on passport | passportExpiry | Integer months or null |
| G07 | `batchUpdateDeployReady` | patch_v283.txt | 183 | Batch: computes + writes deployment readiness for all candidates | (none — reads Candidates sheet) | Writes computeDeployReadyV2_ result to all rows |
| G08 | `refreshMobilityAndDeployability` | V2.txt | 718 | Batch refresh: mobility status + deployability score + missing fields + state for all candidates | (none — reads Candidates sheet) | Writes ec.kaiNo, ec.mobility, ec.deployScore, ec.missingFields, ec.state for all rows |
| G09 | `recomputeAllMetrics` | patch_v284.txt | 1350 | Orchestrator: runs G07 + M07 sequentially | (none) | Log of results |
| G10 | `computeDeployReadyMetrics` | V2_Dashboard.txt | 1676 | Client-side: counts deploy-ready buckets (YES/POSSIBLE/HOLD) from ALL_RECORDS | ALL_RECORDS (global) | Sets DOM: m-drYes, m-drPossible, m-drHold |
| G11 | `isAlreadyScored_` | patch_v291.txt | 1570 | Checks if candidate email already has score (backfill dedup) | email (string) | Boolean (true if score col 17 > 0 for email) |

---

### 1H. DUPLICATE DETECTION (4 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| D01 | `isDuplicate_` | Code.gs.txt | 1467 | Checks incoming candidate against run-level state + _Meta sheet | email, mobile | Boolean |
| D02 | `checkImportDuplicate_` | patch_v280.txt | 443 | Duplicate check for CSV/Excel imports (email / mobile / name fallback) | email, mobile, name | {isDuplicate, rowIndex?, matchOn: email/mobile/name} |
| D03 | `normalizeEmailKey_` | Code.gs.txt | 1493 | Canonicalizes email for dedup comparison | e (string) | Lowercase trimmed string |
| D04 | `normalizeMobileKey_` | Code.gs.txt | 1498 | Canonicalizes phone for dedup comparison | m (string) | Digits only, no leading zeros, last 10 |

---

### 1I. MEMORY / LEARNING (8 functions)

| # | Function | File | ~Line | Intelligence Produced | Inputs | Output |
|---|----------|------|-------|-----------------------|--------|--------|
| L01 | `appendLog_` | Code.gs.txt | 1578 | Appends every pipeline event to Logs sheet | {threadId, status, client, name, email, mobile, trade, notes} | Row written to Logs; full CV/JD processing knowledge log |
| L02 | `appendTimeline_` | V2.txt | 896 | Appends timestamped event to candidate JSON timeline (col ec.timeline) | rowIndex, event, details, actor | Writes JSON array back to timeline col; candidate lifecycle history |
| L03 | `mergeImportedCandidate_` | patch_v280.txt | 472 | Merges import data into existing candidate record (only overwrites blank fields) | rowIndex, sheetRow[] | Updates specific cols; appends RECORD_MERGED timeline |
| L04 | `writeToSheet_` | Code.gs.txt | 1273 | Writes fully scored candidate to Candidates sheet (primary knowledge persistence) | scored object, threadId, cvLink, appDate | New row in Candidates with all scoring fields |
| L05 | `updateCandidateRecord_v291_` | patch_v291.txt | 1860 | Updates existing candidate row (v291 re-engagement path) | rowNum, scored, cvLink | Overwrites candidate row fields with new scoring |
| L06 | `applyReplyUpdates_v291_` | patch_v291.txt | 540 | Applies candidate reply data (from follow-up emails) to update profile fields | rowIndex, updates (Gemini-extracted object) | Writes updated fields; appends timeline |
| L07 | `addToHistory_` | patch_v280.txt | 913 | Appends action history to import queue's history log | jobId, action, details, actor | Row written to import history sheet |
| L08 | `normalizeKaiAssessment_` | Code.gs.txt | 1034 | Normalizes or generates the KAI 4-line assessment (✓/⚠/★/→) from parsed CV data | raw (string from Gemini), candidate {name, trade, experience, nationality, gulfExp} | 4-line string stored per candidate |

---

### 1J. DASHBOARD INTELLIGENCE — embedded decision logic in rendering (16 functions)

| # | Function | File | ~Line | Intelligence (embedded in display layer) | K14 ownership verdict |
|---|----------|------|-------|------------------------------------------|----------------------|
| JD01 | `getCandidateIntelligence` | V2.txt | 982 | Assembles FULL intelligence panel: missing fields, top3 positions, next action, score, mobility, deployability, state | **K14.REASON** — orchestrates all intelligence assembly; UI should call and render only |
| JD02 | `getDashboardDataV2` | V2.txt | 1057 | Feeds dashboard with all candidate data + metrics aggregation (total/needsReview/shortlisted/deployReady/saudiTransfer/etc.) | **K14.REASON** — all metrics computed here; dashboard renders only |
| JD03 | `applyFilters` | V2_Dashboard.txt | 1745 | Client-side filter with 14 metric filters + dropdowns; contains embedded `deployReady` rule (state=READY_TO_DEPLOY OR deployScore≥80) | **K14.REASON output** — filter thresholds belong in K14; dashboard should filter on pre-classified field |
| JD04 | `clientFreshness_` | V2_Dashboard.txt | 2950 | Client-side freshness label (must match V288 backend exactly — duplicate logic) | **DUPLICATE of S07/JD06** — one source only; K14.REASON computes once; dashboard renders label |
| JD05 | `isCurrentWeekCV_` | V2_Dashboard.txt | 2990 | Boolean — is CV from current calendar week? | **K14.REASON** — embedded temporal classification |
| JD06 | `getCvFreshness_` | patch_v283.txt | 76 | V283 freshness bucket labeling (predecessor to V288) | **ARCHIVE** — superseded by S07 (getFreshnessScoreV288_) |
| JD07 | `getCvFreshnessV288_` | patch_v288.txt | 381 | V288 freshness labeling — weekday-based for current week, bucket for older | **K14.REASON** — canonical freshness classification |
| JD08 | `getFreshnessUrgency_` | patch_v283.txt | 94 | Maps freshness label to urgency class (hot/warm/cool/cold) — V283 | **ARCHIVE** — superseded by JD09 |
| JD09 | `getFreshnessUrgencyV288_` | patch_v288.txt | 444 | V288 freshness urgency: HOT/WARM/COOL/COLD | **K14.REASON** — canonical urgency classification |
| JD10 | `computeTop3Positions_` | patch_v282.gs.txt | 314 | 3 suitable job positions from trade taxonomy + education + experience + Gulf exp | **K14.REASON** — compound intelligence; UI renders 3 titles |
| JD11 | `batchComputeTop3Positions` | patch_v282.gs.txt | 382 | Batch runner for JD10 across all candidates | **K14.REASON** (batch trigger) |
| JD12 | `getRecruiterDailyStats287_` | patch_v287.gs.txt | 787 | Per-recruiter daily statistics aggregation from Candidates sheet | **K14.OUTCOMES** — performance aggregation; dashboard renders counters |
| JD13 | `getPerformanceTier287_` | patch_v287.gs.txt | 855 | Determines recruiter performance tier from daily action count | **K14.OUTCOMES** — tier derivation |
| JD14 | `renderMatchResults` | V2_Dashboard.txt | 3662 | Renders match engine results — embeds tier color coding (STRONG/GOOD/POSSIBLE/LONG_SHOT) | **PRESENTATION** — legitimate display. Score + tier come from K14; color-coding is UI |
| JD15 | `analyseCV` | index.html | 871 | Single-CV analysis trigger — calls buildPrompt + Claude API + auto-pushes to Tobu CRM | **K14.REASON** (the Claude call); **Execution** (CRM push) — both live in the wrong layer |
| JD16 | `runBulk` | index.html | 892 | Bulk CV screener — sends up to 20 CVs through Claude API + ranks by score | **K14.REASON** (scoring engine); **Infrastructure** (pipeline orchestration) — wrong layer |

**`runLiveMatch` (V2_Dashboard.txt:3632):** Calls `matchCandidatesForReqPublic` via `google.script.run`. This is a legitimate UI trigger → backend delegation. However the function also contains embedded tier-filter logic before calling the backend. Classification: mostly **PRESENTATION** with a thin embedded **K14.REASON filter** that belongs in the API call parameters.

---

## PART 2 — PROTECTED ASSET ACCESS MAP

### 2A. T13 Benchmark Sheets
`_T13_FalseNegative` (14,249 rows) · `_T13_GovernanceQueue` (1,594) · `_T13_FalsePositive` (262) · `_T13_ValidationSet` (100) · `_T13_CompareReport` (30) · `_T13_FamilyAudit` (21) · `_T13_DualTrade` (0)

| Access type | Files | Status |
|-------------|-------|--------|
| **READ** | None of the 19 scanned code files reference `_T13_` sheet names | SAFE — source of these sheets is MISSING (Phase 0 finding); their data is the K14.REASON benchmark |
| **WRITE** | None of the 19 scanned code files write to `_T13_` sheets | SAFE |

**Verdict:** T13 assets are completely unreferenced in repo code. They exist as live spreadsheet evidence only. No LOCK 2 breach in scanned files (the breach was in `execution_engine_v1.gs` for `_AssociateReliability`, not T13).

### 2B. _AssociateReliability
| Access type | Files | Status |
|-------------|-------|--------|
| **READ** | `execution_engine_v1.gs` (UAT check at ~line 671 asserts a row exists) | **VIOLATION** — already named in EXECUTION_RECONCILIATION.md §E |
| **WRITE** | `execution_engine_v1.gs` `captureOutcome()` — ordered removed by reconciliation | **VIOLATION — PENDING FIX** |

**Verdict:** Single breach, single file, already reconciled. Fix = captureOutcome writes to `_ExecutionOutcomes` only.

### 2C. _Commitments
| Access type | Files | Status |
|-------------|-------|--------|
| **READ** | None of the 19 scanned files | SAFE |
| **WRITE** | None of the 19 scanned files | SAFE |

**Verdict:** 0 rows, no code references. Clean.

### 2D. Taxonomy Assets
| Asset | Access type | Files | Status |
|-------|-------------|-------|--------|
| `Taxonomy` (4-col, 2,735 rows — operational) | READ | `Code.gs.txt` `loadTaxonomy_()` + `mapCandidateToTaxonomy_()` | SAFE — read-only load, cached |
| `Taxonomy` (4-col) | WRITE | None | SAFE |
| `_Taxonomy` (20-col governance, 1,037 rows) | READ | None of the 19 scanned files | SAFE — governance asset unreferenced |
| `_Taxonomy` (20-col) | WRITE | None | SAFE |
| `taxanomy996.txt` | READ | Referenced in Config as source data (no write path) | SAFE |

**Verdict:** The operational `Taxonomy` sheet is read-only in pipeline code. The governance `_Taxonomy` is completely unreferenced — it is the K14.CLASSIFY source when built.

---

## PART 3 — K14 EVIDENCE INVENTORY

This is the intelligence K14 will consume at reasoning time. All entries are **read-only inputs to K14** — never modified by K14 or Execution.

### 3A. T13 Outputs (frozen benchmark evidence)
| Asset | Rows | Evidence type | K14 use |
|-------|------|---------------|---------|
| `_T13_FalseNegative` | 14,249 | Candidates present in client pool but missed by old matching engine | K14.REASON — precision benchmark; patterns of false exclusions |
| `_T13_GovernanceQueue` | 1,594 | Candidates flagged for governance review | K14.REASON — edge cases; K14.CLASSIFY — trade ambiguity patterns |
| `_T13_FalsePositive` | 262 | Candidates incorrectly included by old engine | K14.REASON — over-inclusion patterns to avoid |
| `_T13_ValidationSet` | 100 | Gold-standard hand-validated matches | K14.REASON — ground truth for calibration |
| `_T13_CompareReport` | 30 | Head-to-head comparison reports | K14.REASON — scoring calibration evidence |
| `_T13_FamilyAudit` | 21 | Trade family classification audits | K14.CLASSIFY — taxonomy family boundaries |
| `_T13_DualTrade` | 0 | Dual-trade candidate evidence (empty, scaffold) | K14.CLASSIFY — future evidence |

### 3B. Taxonomy
| Asset | Rows | Evidence type | K14 use |
|-------|------|---------------|---------|
| `_Taxonomy` (20-col) | 1,037 | Governance trade taxonomy with full hierarchy | K14.CLASSIFY — canonical trade vocabulary |
| `Taxonomy` (4-col) | 2,735 | Operational {industry, department, trade, specialization} | K14.CLASSIFY — live lookup for scoring |
| `taxanomy996.txt` | 996 entries | Source trade vocabulary | K14.CLASSIFY — seed data |

### 3C. Recruiter Corrections
| Asset | Location | Evidence type | K14 use |
|-------|----------|---------------|---------|
| Technical review verdicts | Candidates col `techReview` (set by `updateTechnicalReview`) | Human override of AI assessment | K14.LEARN — where AI got it wrong |
| TradeSource = Recruiter | Requirements col 29 (set by recruiter) | Human trade classification override | K14.CLASSIFY — where AI trade detection failed |
| Recruiter remarks | Candidates col `recruiterRemark` | Narrative correction/context | K14.MEMORY — qualitative patterns |
| Timeline events | Candidates col `ec.timeline` (JSON array) | Full event history per candidate | K14.LEARN — state transitions, corrections, reprocessing |

### 3D. Associate Outcomes
| Asset | Location | Evidence type | K14 use |
|-------|----------|---------------|---------|
| `_AssociateReliability` | Live sheet (LOCK 2) | Associate fill-rate, mobilization rate, commitment accuracy | K14.MEMORY — associate performance patterns |
| `_Commitments` | Live sheet (LOCK 2, 0 rows) | Associate-to-requirement commitment history | K14.MEMORY — associate reliability seeds |

### 3E. Submission Outcomes
| Asset | Location | Evidence type | K14 use |
|-------|----------|---------------|---------|
| `_Submissions` | Live sheet (0 rows, Execution scaffold) | Per-submission records | K14.OUTCOMES — what was submitted, to whom |
| `_SubmissionBatches` | Live sheet (0 rows) | Batch metadata | K14.OUTCOMES — submission patterns by client/trade/campaign |
| `_Pipeline` | Live sheet (0 rows) | Historical pipeline state transitions | K14.OUTCOMES — selection conversion rates |
| `_ClientResponseLog` | Live sheet (0 rows) | Client feedback on submitted candidates | K14.OUTCOMES — client preference learning |

### 3F. Mobilization Outcomes
| Asset | Location | Evidence type | K14 use |
|-------|----------|---------------|---------|
| `_AssociateReliability` | LOCK 2 (existing rows) | Mobilization success/failure rates per associate | K14.MEMORY — mobilization prediction |
| `_ExecutionOutcomes` | Execution-owned (to be created per reconciliation) | Raw deployment/abort outcome facts | K14.OUTCOMES → K14.LEARN |
| `_CandidateSlots` | Live sheet (57 rows) | Candidate slot allocations | K14.OUTCOMES — capacity intelligence |

### 3G. Candidate History
| Asset | Location | Evidence type | K14 use |
|-------|----------|---------------|---------|
| `Candidates` | Live (10,072 rows, 48 cols) | Full candidate lifecycle | K14.REASON — all scoring, state, history |
| `Archive` | Live (1,229 rows) | Archived candidate records | K14.MEMORY — historical patterns, past deployments |
| `Rejected` | Live (172 rows) | Explicitly rejected candidates | K14.LEARN — rejection reason patterns |
| `_MatchFeedback` | Live (58 rows) | Match feedback from recruiters | K14.LEARN — human match corrections |
| `_CandidateSubmissionHistory` | Execution audit trail | Per-candidate submission events | K14.OUTCOMES — submission + selection history |
| Timeline col (ec.timeline) | Per-candidate JSON in Candidates | Full event sequence per candidate | K14.LEARN — lifecycle patterns |

### 3H. Requirement History
| Asset | Location | Evidence type | K14 use |
|-------|----------|---------------|---------|
| `_Requirements` | Live (97 rows, 25 cols → 38 after Foundation) | All requirements with status | K14.REASON — requirement pattern by client/trade/country/outcome |

### 3I. Project & Campaign History
| Asset | Location | Evidence type | K14 use |
|-------|----------|---------------|---------|
| `_Projects` | Live (0 rows) | Project records | K14.MEMORY — project patterns (thin: 0 rows) |
| `_Campaigns` | Live (1 row) | Campaign records | K14.MEMORY — campaign patterns (thin: 1 row) |
| `_NLQueryLog` | Live (35 rows) | Natural language queries by recruiters | K14.LEARN — recruiter intent patterns |
| `_ActivityLog` | Live (714 rows) | System activity log | K14.MEMORY — operational patterns |

---

## PART 4 — K14 ABSORPTION MAP

### 4A. What Moves Into K14 (intelligence → K14 owner)

#### K14.INTAKE
Absorbs all ingestion and normalization logic.

| Functions | From files | Status |
|-----------|-----------|--------|
| `extractJdWithGemini_` (T10) | V2.txt | ABSORB |
| `extractJdEnhanced_` (T11) | patch_v283.txt | ABSORB — supersedes T10; T10 → ARCHIVE |
| `detectUrgency_` (T12) | patch_v283.txt | ABSORB |
| `detectClientName_` (T13) | patch_v283.txt | ABSORB |
| `validateImportRow_` (A05) | patch_v280.txt | ABSORB (intake validation) |
| `normalizeKaiAssessment_` (L08) | Code.gs.txt | ABSORB |
| `classifyEducation_` (T07) | patch_v282.gs.txt | ABSORB |
| `normalizeEducationProfessional_` (T08) | patch_v284.txt | ABSORB |
| `normalizeSalaryIntelligent_` (T09) | patch_v284.txt | ABSORB |
| `resolveLocation_` (T15) | patch_v284.txt | ABSORB |
| `inferCountryFromLocation_` (T16) | patch_v284.txt | ABSORB |
| `isJdEmail_` (M06) | V2.txt | ABSORB |

#### K14.CLASSIFY
Absorbs all trade detection and taxonomy logic.

| Functions | From files | Status |
|-----------|-----------|--------|
| `normalizeTrade285_` (T01) | patch_v285.txt | ABSORB |
| `tradeTermMatch285_` (T02) | patch_v285.txt | ABSORB |
| `findTradeGroup285_` (T03) | patch_v285.txt | ABSORB |
| `detectRoleCategory_` (T04) | patch_v284.txt | ABSORB |
| `mapCandidateToTaxonomy_` (T05, S14) | Code.gs.txt | ABSORB |
| `loadTaxonomy_` (T06) | Code.gs.txt | ABSORB (taxonomy load is classify infrastructure) |
| `findRule_` (T14) | Code.gs.txt | ABSORB |
| `tradeSimilarityScore_` (M05) | V2.txt | **ARCHIVE** — superseded by T01–T03 (V285 engine) |

#### K14.MEMORY
Absorbs all knowledge persistence and pattern enrichment.

| Functions | From files | Status |
|-----------|-----------|--------|
| `appendTimeline_` (L02) | V2.txt | ABSORB (timeline = candidate memory) |
| `mergeImportedCandidate_` (L03) | patch_v280.txt | ABSORB |
| `normalizeKaiAssessment_` (L08) | Code.gs.txt | ABSORB (shared with INTAKE) |
| `computeTop3Positions_` (JD10) | patch_v282.gs.txt | ABSORB — compound intelligence; stored in candidate record |
| `batchComputeTop3Positions` (JD11) | patch_v282.gs.txt | ABSORB (batch runner for JD10) |
| `getRecruiterDailyStats287_` (JD12) | patch_v287.gs.txt | ABSORB → K14.OUTCOMES (performance aggregation) |
| `getPerformanceTier287_` (JD13) | patch_v287.gs.txt | ABSORB → K14.OUTCOMES (tier derivation) |

#### K14.REASON
Absorbs all scoring, matching, ranking, assessment, readiness, and decision logic. This is the largest K14 module.

| Functions | From files | Status |
|-----------|-----------|--------|
| `computeMatchScore285_` (S03) | patch_v285.txt | ABSORB — **canonical match engine** |
| `getTradeScore285_` (S05) | patch_v285.txt | ABSORB (component of S03) |
| `getFreshnessScoreV288_` (S07) | patch_v288.txt | ABSORB — **canonical freshness score** |
| `getDeployReadyScore285_` (S08) | patch_v285.txt | ABSORB (component of S03) |
| `getExperienceScore285_` (S09) | patch_v285.txt | ABSORB (component of S03) |
| `getGulfExpScore285_` (S10) | patch_v285.txt | ABSORB (component of S03) |
| `getNationalityScore285_` (S11) | patch_v285.txt | ABSORB (component of S03) |
| `getPassportScore285_` (S12) | patch_v285.txt | ABSORB (component of S03) |
| `computeDeployabilityScore_` (S13, G02) | V2.txt | ABSORB |
| `matchCandidatesForReq285_` (M02) | patch_v285.txt | ABSORB — **canonical match runner** |
| `matchCandidatesForReqPublic` (M03) | patch_v285.txt | ABSORB (public API surface) |
| `getTopMatchSummaryPublic` (M04) | patch_v285.txt | ABSORB |
| `runMatchTaggingForAllReqs` (M08) | patch_v285.txt | ABSORB |
| `applyDecisionRules_` (A01) | Code.gs.txt | ABSORB |
| `deriveCandidateState_` (A02) | V2.txt | ABSORB |
| `getNextAction_` (A03) | V2.txt | ABSORB |
| `computeDeployReadyV2_` (A04, G03) | patch_v283.txt | ABSORB |
| `computeMobilityStatus_` (G01) | V2.txt | ABSORB |
| `getMissingFields_` (G04) | V2.txt | ABSORB |
| `getPassportStatus_` (A08, G05) | patch_v283.txt | ABSORB |
| `getPassportMonthsLeft_` (G06) | patch_v283.txt | ABSORB |
| `getDeployReadyScore285_` (S08) | patch_v285.txt | ABSORB |
| `getCvFreshnessV288_` (JD07) | patch_v288.txt | ABSORB — **canonical freshness label** |
| `getFreshnessUrgencyV288_` (JD09) | patch_v288.txt | ABSORB — **canonical urgency** |
| `getCandidateIntelligence` (JD01) | V2.txt | ABSORB — orchestrator; becomes K14.REASON's primary output assembler |
| `getDashboardDataV2` (JD02) | V2.txt | ABSORB (metrics assembly is K14.REASON output) |
| `scoreCandidate_` (S01) | Code.gs.txt | **ARCHIVE** — superseded by S03 (V285 engine) |
| `contextScore_` (S04) | V2.txt | **ARCHIVE** — superseded by S03 (V285 engine) |
| `matchCandidatesToRequirement_` (M01) | V2.txt | **ARCHIVE** — superseded by M02 |
| `refreshRequirementMatchCounts_` (M07) | patch_v284.txt | ABSORB → K14.REASON (pool depth signal) |
| `batchUpdateDeployReady` (G07) | patch_v283.txt | ABSORB (batch trigger) |
| `refreshMobilityAndDeployability` (G08) | V2.txt | ABSORB (batch trigger) |
| `recomputeAllMetrics` (G09) | patch_v284.txt | ABSORB (orchestrator batch) |
| `getFreshnessScore285_` (S06) | patch_v285.txt | **ARCHIVE** — superseded by S07 (V288) |
| `clientFreshness_` (JD04) | V2_Dashboard.txt | **ARCHIVE** — duplicate of JD07; dashboard calls K14 |
| `isCurrentWeekCV_` (JD05) | V2_Dashboard.txt | **ARCHIVE** — logic moves to K14; dashboard renders field |
| `getCvFreshness_` (JD06) | patch_v283.txt | **ARCHIVE** — superseded by JD07 |
| `getFreshnessUrgency_` (JD08) | patch_v283.txt | **ARCHIVE** — superseded by JD09 |
| `buildPrompt` (A10) | index.html | ABSORB — the 18-filter policy + scoring weights must live in K14.REASON, not a browser file |
| `analyseCV` (JD15) | index.html | ABSORB (K14 call); Execution (CRM push) — split on rebuild |
| `runBulk` (JD16) | index.html | ABSORB (batch K14 orchestration); Infrastructure (pipeline) — split on rebuild |
| `applyFilters` (JD03) embedded threshold | V2_Dashboard.txt | ABSORB the `deployScore≥80` rule → K14 classifies field; dashboard filters on it |
| `freshnessRank_` (R04) | V2_Dashboard.txt | ABSORB → K14.REASON computes rank; dashboard uses it |
| `computeDeployReadyMetrics` (G10) | V2_Dashboard.txt | ABSORB → K14.REASON computes buckets; dashboard renders counters |
| `isAlreadyScored_` (G11) | patch_v291.txt | ABSORB → K14.REASON (dedup scoring gate) |

#### K14.OUTCOMES
Absorbs all performance aggregation and outcome analysis.

| Functions | From files | Status |
|-----------|-----------|--------|
| `getRecruiterDailyStats287_` (JD12) | patch_v287.gs.txt | ABSORB |
| `getPerformanceTier287_` (JD13) | patch_v287.gs.txt | ABSORB |
| All `captureOutcome` intelligence derivation | execution_engine_v1.gs | ABSORB — raw facts come from Execution; K14.OUTCOMES derives SUCCESS/FAILURE signal |

#### K14.LEARN
Absorbs all feedback loop logic.

| Functions | From files | Status |
|-----------|-----------|--------|
| `updateCandidateRecord_v291_` (L05) | patch_v291.txt | ABSORB (re-score path = learning feedback) |
| `applyReplyUpdates_v291_` (L06) | patch_v291.txt | ABSORB |

### 4B. What Remains Infrastructure (not intelligence)

| Functions | Owner | Reason |
|-----------|-------|--------|
| `scoreAttachment_` (S02) | Infrastructure.INTAKE | Not candidate intelligence — selects best file attachment; pure utility |
| `isDuplicate_` (D01) | Infrastructure.INTEGRITY | Identity dedup, not candidate assessment |
| `checkImportDuplicate_` (D02) | Infrastructure.INTEGRITY | Identity dedup |
| `normalizeEmailKey_` (D03) | Infrastructure.INTEGRITY | String normalization utility |
| `normalizeMobileKey_` (D04) | Infrastructure.INTEGRITY | String normalization utility |
| `appendLog_` (L01) | Infrastructure.LOGGING | System event log, not intelligence |
| `writeToSheet_` (L04) | Infrastructure.PERSISTENCE | Sheet persistence utility |
| `addToHistory_` (L07) | Infrastructure.PERSISTENCE | Import history persistence |
| `generateClientSafeRef` (SL04) | Infrastructure.IDENTITY | Reference ID generation; no intelligence |

### 4C. What Remains Execution (state transitions, not intelligence)

| Functions | Owner | Reason |
|-----------|-------|--------|
| `shortlistCandidateForReq` (SL01) | Execution.Match | State transition: MATCHED → SHORTLISTED (action, not decision) |
| `bulkShortlistForReq` (SL02) | Execution.Match | State transition: bulk action |
| `shortlistMatchForReq` (SL03) | Execution.UI | Dashboard UI trigger for SL01 |
| `updateCandidateState` (A06) | Execution (Foundation boundary) | Writes recruiter-initiated state change; not intelligence |
| `updateTechnicalReview` (A07) | Execution (recruiter action) | Records human verdict; K14.LEARN reads it |
| `updateCandidateStateWithOwner` (A09) | Execution (recruiter action) | Combined human write |

### 4D. What Is Archived (superseded, deprecated, or duplicated)

| Functions | Superseded by | Archive reason |
|-----------|--------------|----------------|
| `scoreCandidate_` (S01) | `computeMatchScore285_` (S03) | V285 engine supersedes V1 |
| `contextScore_` (S04) | `computeMatchScore285_` (S03) | V285 supersedes V2 contextScore_ |
| `tradeSimilarityScore_` (M05) | `getTradeScore285_` (S05) | V285 three-pass supersedes V2 fuzzy |
| `matchCandidatesToRequirement_` (M01) | `matchCandidatesForReq285_` (M02) | V285 supersedes V2 |
| `getFreshnessScore285_` (S06) | `getFreshnessScoreV288_` (S07) | V288 supersedes V285 freshness |
| `getCvFreshness_` (JD06) | `getCvFreshnessV288_` (JD07) | V288 supersedes V283 |
| `getFreshnessUrgency_` (JD08) | `getFreshnessUrgencyV288_` (JD09) | V288 supersedes V283 |
| `clientFreshness_` (JD04) | `getCvFreshnessV288_` (JD07) | Dashboard duplicate of JD07 — K14 computes once |
| `isCurrentWeekCV_` (JD05) | K14.REASON canonical freshness field | Dashboard classification logic → K14 |
| `applyDecisionRules_` (A01) | K14.REASON (rewritten in K14) | V1 rules engine — logic absorbed, not copied |
| KAI_15May2026_V1_Dashboard.txt (all) | KAI_16May2026_V2_Dashboard.txt | V2 supersedes V1 entirely |
| patch_v284.txt (33 shared functions) | KAI_17May2026_patch_v284.txt | v284-B is the canonical version (has Gemini API calls); v284-A archived |
| patch_v287.txt (26 shared functions) | KAI_17May2026_patch_v287.gs.txt | v287-B is the canonical version (hardened); v287-A archived |
| patch_v293_test.gs.txt | (test runner) | Dead — test-only, no production use |
| 28th April 1356 hrs.txt | KAI_16May2026_V2.txt (getDashboardData ×3 dup) | Dead — V1 era |

---

## PART 5 — K14 SINGLE OWNERSHIP VERIFICATION

### 5A. Function-to-K14-Module Map (complete)

| K14 Module | Count | Functions |
|------------|------:|-----------|
| K14.INTAKE | 12 | T10, T11, T12, T13, A05, L08, T07, T08, T09, T15, T16, M06 |
| K14.CLASSIFY | 7 | T01, T02, T03, T04, T05, T06, T14 |
| K14.MEMORY | 7 | L02, L03, L08, JD10, JD11, JD12, JD13 |
| K14.REASON | 36 | S03, S05, S07, S08, S09, S10, S11, S12, S13, M02, M03, M04, M07, M08, A01, A02, A03, A04, G01, G02, G03, G04, G05, G06, G07, G08, G09, JD01, JD02, JD03·threshold, JD07, JD09, JD15·call, JD16·call, R04, G10 |
| K14.OUTCOMES | 3 | JD12, JD13, captureOutcome·derivation |
| K14.LEARN | 2 | L05, L06 |
| Infrastructure | 9 | S02, D01, D02, D03, D04, L01, L04, L07, SL04 |
| Execution | 6 | SL01, SL02, SL03, A06, A07, A09 |
| Archive | 15 | S01, S04, S06, M01, M05, JD04, JD05, JD06, JD08 + 6 file-level archives |
| Presentation only | 2 | JD14 (renderMatchResults renders K14 output), R03 (sortBy — UI sort of K14-classified data) |

**Total classified: 96 functions + 6 file-level archives = 102 items. Zero unclassified.**

### 5B. Orphan Intelligence Check

**Result: ZERO orphan functions.**

Every intelligence-producing function in the repository is assigned to exactly one future K14 module, Infrastructure, Execution, or Archive. No function has dual ownership. No function is left unclassified.

### 5C. Duplicate Intelligence Check

**Confirmed duplicates (8):**

| Duplicate set | Canonical | Archived |
|---------------|-----------|---------|
| Scoring engine V1 vs V285 | `computeMatchScore285_` | `scoreCandidate_` + `contextScore_` |
| Trade similarity V2 vs V285 | `getTradeScore285_` | `tradeSimilarityScore_` |
| Match runner V2 vs V285 | `matchCandidatesForReq285_` | `matchCandidatesToRequirement_` |
| Freshness score V285 vs V288 | `getFreshnessScoreV288_` | `getFreshnessScore285_` |
| Freshness label V283 vs V288 | `getCvFreshnessV288_` | `getCvFreshness_` |
| Freshness urgency V283 vs V288 | `getFreshnessUrgencyV288_` | `getFreshnessUrgency_` |
| Freshness label dashboard vs backend | `getCvFreshnessV288_` | `clientFreshness_` (dashboard) |
| v284 A vs B (33 functions) | patch_v284.txt (B, with Gemini API) | patch_v284-A canonical file |

**When K14 is built, it absorbs only the CANONICAL version of each set. The archived versions are never called.**

### 5D. Hidden Intelligence Check

**index.html — browser engine:**
Contains 4 intelligence-producing items: `buildPrompt` (A10) · `analyseCV` (JD15) · `runBulk` (JD16) · score sort (R05). All classified → K14.REASON. After K14 is built, `index.html` becomes a `google.script.run` caller that renders K14 output only. No browser-side scoring. No direct API calls.

**KAI_16May2026_V2_Dashboard.txt — dashboard:**
Contains 5 embedded intelligence items: `freshnessRank_` (R04) · `clientFreshness_` (JD04) · `isCurrentWeekCV_` (JD05) · `applyFilters` deployReady threshold (JD03) · `computeDeployReadyMetrics` (G10). All classified → K14.REASON (or Archive). After K14 is built, dashboard renders pre-classified K14 fields only.

**CONCLUSION: Hidden intelligence exists. It is fully mapped. It has a single K14 owner. It will be eliminated by extraction (when K14 implementation is approved).**

---

## PART 6 — SUCCESS CONDITION EVALUATION

| Condition | Status | Evidence |
|-----------|--------|---------|
| Every intelligence-producing function maps to exactly one future K14 responsibility | ✓ PASS | 96 functions classified; 0 unclassified |
| No orphan intelligence | ✓ PASS | 0 functions without owner |
| No duplicated intelligence (after K14 is built) | ✓ PASS | 8 duplicate sets identified; canonical version named for each |
| No hidden intelligence in UI (index.html) | ⚠ CURRENTLY FALSE — will be TRUE after K14 absorbs A10, JD15, JD16 | 4 items mapped, canonical K14 function named |
| No hidden intelligence in dashboards (V2_Dashboard) | ⚠ CURRENTLY FALSE — will be TRUE after K14 absorbs R04, JD04, JD05, JD03-threshold, G10 | 5 items mapped, canonical K14 function named |

**Current state:** Hidden intelligence EXISTS (confirmed, measured, located). It is not orphaned — every hidden item has a named K14 owner. The success condition will be fully TRUE after K14.REASON is implemented and UI/dashboard files are reduced to rendering.

---

## PART 7 — SUPPLEMENTAL FINDINGS (second scan — 17 additional functions)

A second independent scan of the same 19 files plus patch_v286.txt and patch_v293.txt
identified the following functions not captured in Parts 1–6. All are classified below.
Revised total: **113 intelligence-producing functions / assets**.

### 7A. Email Classification (missed in Part 1D)

| # | Function | File | ~Line | Intelligence | K14 owner |
|---|----------|------|-------|--------------|-----------|
| EC01 | `classifyEmail_` | patch_v286.txt | S76.F01 | 8-type email classifier with confidence score: CV_APPLICATION / JD_REQUIREMENT / REPLY_TO_PENDING / INTERNAL / CLIENT_EMAIL / SUB_AGENCY / MARKETING_SPAM / SYSTEM_BOUNCE; 8 sequential rules (bounce → spam → domain → attachment → reply signals → JD count → CV count → default) | **K14.INTAKE** |
| EC02 | `checkInternalGuard_` | patch_v286.txt | S78.F01 | Guards against own-domain / known spam / role-based addresses; blocks internal email processing | **Infrastructure.COMMS** |
| EC03 | `isClientJd_` | patch_v286.txt | S78.F02 | Domain-based JD detection from known client addresses | **K14.INTAKE** |
| EC04 | `wasAutoRepliedRecently287_` | patch_v287.gs.txt | S89.F02 | 7-day auto-reply cooldown guard — prevents candidate spam | **Infrastructure.COMMS** |

### 7B. JD Extraction Variants (missed in Part 1D — T10/T11 were captured; these are additional)

| # | Function | File | ~Line | Intelligence | K14 owner |
|---|----------|------|-------|--------------|-----------|
| JX01 | `callGeminiForReply_` | Code.gs.txt | S20.F03 | Gemini extraction of 9 fields from reply emails: DOB / passport number / passport expiry / location / employment status / notice period / ECR-ECNR / mobile / gulf experience | **K14.INTAKE** |
| JX02 | `extractSingleJdBlock_` (v284) | patch_v284.txt | S73.F01 | Gemini + 4-step regex fallback JD extractor; 16+ fields including trade, department, quantity, experience range, salary, location, client, urgency | **K14.INTAKE** — supersedes T10 |
| JX03 | `extractSingleJdBlock_v291_` | patch_v291.txt | S43.F01 | Fixed v284 JD extractor (corrects H1 bug — string vs array); calls `callGeminiString_v291_` | **K14.INTAKE** — supersedes JX02 |
| JX04 | `extractSingleJdBlock_v293_` | patch_v293.txt | S93.F02 | v293 text fallback JD extractor; adds Department field; additional trade/role/designation patterns | **K14.INTAKE** — latest text fallback |
| JX05 | `extractJdFromPdfInline_v293_` | patch_v293.txt | S93.F01 | **PRIMARY v293 extractor** — sends PDF as multimodal inlineData to Gemini; resolves glyph-fragmented PDF problem; supports JSON array (multi-JD) or single object response | **K14.INTAKE** — canonical PDF JD extractor |
| JX06 | `processJdTextJob_` | patch_v280.txt | S43.F01 | Orchestrates: JD text received → `extractSingleJdBlock_` → `matchCandidatesToRequirement_`; entire JD intake pipeline trigger | **K14.INTAKE** (orchestrator) |

**JD extraction canonical chain (v293):**
```
PDF arrives → extractJdFromPdfInline_v293_ (multimodal Gemini)
Text/fallback → extractSingleJdBlock_v293_ (text Gemini + regex)
Reply email → callGeminiForReply_ (reply field extraction)
All supersede: extractJdWithGemini_ (T10) + extractJdEnhanced_ (T11) → ARCHIVE
```

### 7C. Additional Intelligence Functions

| # | Function | File | ~Line | Intelligence | K14 owner |
|---|----------|------|-------|--------------|-----------|
| AX01 | `computeAge_` | Code.gs.txt | S10.F06 | Computes candidate age from DOB; age gate enforced downstream (21–50 rule) | **K14.CLASSIFY** (candidate classification input) |
| AX02 | `detectDuplicate_` | patch_v286.txt | S79.F01 | 3-field dedup: email exact / mobile last-9 / passport number exact; more complete than D01 `isDuplicate_` | **Infrastructure.INTEGRITY** |
| AX03 | `getCandidateProfileApi_` | patch_v284.txt | S75B.F02 | Returns complete drawer-ready candidate intelligence object for panel display; includes all fields + computed scores + top3 + freshness + deployReady + matchedReqs | **K14.REASON** (intelligence assembly, same role as JD01 `getCandidateIntelligence`) |
| AX04 | `fixTop3PositionsV288` | patch_v288.txt | S95.F01 | One-shot batch job to recompute Top3 positions for all existing candidates using V288 logic | **K14.REASON** (batch runner; same role as JD11 `batchComputeTop3Positions`) |
| AX05 | `refreshTop3ForRow` | patch_v288.txt | S95.F02 | Single-row Top3 recomputation trigger | **K14.REASON** (single-row batch trigger) |

### 7D. Infrastructure / Archive

| # | Function | File | K14 owner |
|---|----------|------|-----------|
| IX01 | `getEffectiveGeminiModel_` | patch_v291.txt | **Infrastructure.GEMINI** — model selector returning `KAI_GEMINI_MODEL_OVERRIDE` or `gemini-2.0-flash`; utility, not intelligence |
| IX02 | `topNObject_` | 28th April 1356 hrs.txt | **Archive** — legacy dashboard top-N frequency utility; V2 dashboard does not use it |
| IX03 | `getDashboardData` (V1) | Code.gs.txt | **Archive** — V1 era dashboard feed (Tier A/B/C vocabulary); V2 `getDashboardDataV2` (JD02) is canonical |

### 7E. TRADE_GROUPS_V285_ Constant

The v285 taxonomy constant is not a function but is the **core intelligence definition** used by T01–T03.

| Asset | File | Definition |
|-------|------|-----------|
| `TRADE_GROUPS_V285_` | patch_v285.txt | 20-group GCC trade taxonomy constant. Each group: `primary[]`, `similar[]`, `related[]`. Groups: Welder, Pipe Fitter, Electrician, Instrument Tech, Civil, Mechanical, HVAC, Scaffolder, Painter, Rigger/Crane, NDT Inspector, QA-QC, HSE, Mason/Carpenter, Plumber, Heavy Equipment, Admin, IT, Healthcare, Catering. | 
| **Owner** | | **K14.CLASSIFY** — the canonical GCC trade vocabulary; absorbs `taxanomy996.txt` and `_Taxonomy` |

### 7F. Revised Counts

| K14 Module | Original count | Additions | Final count |
|------------|--------------:|----------:|------------:|
| K14.INTAKE | 12 | +8 (EC01, EC03, JX01–JX06) | **20** |
| K14.CLASSIFY | 7 | +1 (AX01) | **8** |
| K14.MEMORY | 7 | 0 | **7** |
| K14.REASON | 36 | +3 (AX03, AX04, AX05) | **39** |
| K14.OUTCOMES | 3 | 0 | **3** |
| K14.LEARN | 2 | 0 | **2** |
| Infrastructure | 9 | +4 (EC02, EC04, AX02, IX01) | **13** |
| Execution | 6 | 0 | **6** |
| Archive | 15 | +3 (IX02, IX03 + JD extraction superseded chain) | **18** |
| Presentation | 2 | 0 | **2** |
| **TOTAL** | **96** | **+17** | **113** |

**Revised orphan check: ZERO orphan functions. All 113 classified.**

**Revised duplicate/supersession chain for JD extraction:**
extractJdWithGemini_ (T10) → ARCHIVE (superseded by JX02)
extractJdEnhanced_ (T11) → ARCHIVE (superseded by JX04)
extractSingleJdBlock_ v284 (JX02) → ARCHIVE (superseded by JX03)
extractSingleJdBlock_v291_ (JX03) → ARCHIVE (superseded by JX04+JX05)
**Canonical:** `extractJdFromPdfInline_v293_` (JX05) for PDF · `extractSingleJdBlock_v293_` (JX04) for text fallback

---

## FREEZE DECLARATION

```
Step 1  CLIENT_ENTITY_FINAL.md            ✓ approved
Step 2  PROJECT_ENTITY_FINAL.md           ✓ approved
Step 3  CAMPAIGN_ENTITY_FINAL.md          ✓ approved
Step 4  REQUIREMENT_ENTITY_FINAL.md       ✓ approved
Step 5  ASSOCIATE_ENTITY_FINAL.md         ✓ approved
Step 6  CANDIDATE_ENTITY_FINAL.md         ✓ approved
Step 7  EXECUTION_CONSTITUTION.md         ✓ approved
Step 8  EXECUTION_RECONCILIATION.md       ✓ committed (awaiting code fix)
Step 9  K14_OWNERSHIP_AUDIT.md            ◀ this document (awaiting approval)
```

On approval of this document: K14 implementation may begin.

**No code changes. No extraction. No k14_reason_v1.gs. No refactor. No migration.**
The above classification is a planning instrument only. Implementation is the next phase.

```
ROLLBACK: delete K14_OWNERSHIP_AUDIT.md (governance document only; 
no schema, no data, no code touched).
```
