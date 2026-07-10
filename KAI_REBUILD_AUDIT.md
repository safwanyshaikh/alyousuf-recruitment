# KAI OS — REBUILD AUDIT & DEMOLITION PLAN
**Role:** Product Architect + Technical Director
**Status:** AUDIT ONLY — no code in this phase
**Repository:** safwanyshaikh/alyousuf-recruitment (ACTIVE) · safwanyshaikh/kai (FROZEN)
**Date:** 2026-06-19
**Authority document:** `FOUNDATION_SCHEMA_LOCKED.md` (the Constitution)

> Product principle: KAI is a **GCC Recruitment Intelligence Operating System**.
> The asset is the intelligence + data + outcomes — NOT the UI.
> Single repo. Single backend. Single intelligence layer. Replaceable UI.

---

## 0. HEADLINE FINDINGS (read first)

1. **The patch chain is worse than reported.** 17 code files, ~34,000 lines, **700+ functions, 59 duplicated across files, 34 live entry points.** Two files share version `v284`, two share `v287`. The prior audit miscounted line sizes by 3-5× and called the 340-line live reply engine "18 lines, unknown."
2. **No single source of truth.** Two configs (`CONFIG` v1 dead, `CONFIG_V2` live), two requirement schemas (`CONFIG_V2.reqHeaders` 18-col dead, `REQ_HEADERS_V293_` 19-col live), three `saveRequirement*` functions, three `computeTop3Positions_`.
3. **The live code already violates the locked Foundation.** `patch_v294.txt:96` writes `[Project:PROJ-xxx]` into the requirement **Notes** column and links requirements to a **Project, not a Campaign**. Amendment 1 (Campaign mandatory, no FK-in-Notes) is broken in production today.
4. **The right move is NOT a big-bang rewrite.** It is **module consolidation via the strangler pattern** + **rebuild of the business/intelligence layer** around Foundation. A stop-the-world rewrite of a system processing live candidates is itself the largest risk. Demolition is controlled and incremental, not detonated.
5. **Infrastructure is sound and stays.** Auth, Drive, Gmail, Sheets, Gemini, quota — these work. They are buried inside patch files and must be *extracted into clean modules*, not rewritten.

---

## 1. EXISTING PATCH INVENTORY (corrected, complete)

### Code & core (keep the capability, relocate the code)

| File | Lines | What it really is | Verdict |
|------|------:|-------------------|---------|
| `Code.gs.txt` | 3318 | V1 core: `CONFIG`, `CONFIG_QUOTA`, pipeline, Drive, Gmail, scoring v1 | SPLIT — extract infra, archive v1 business logic |
| `KAI_16May2026_V2.txt` | 1441 | `CONFIG_V2` (states, mobility, ext cols 25-38), requirement engine v2 | KEEP config, REBUILD requirement engine |
| `KAI_16May2026_V2_Dashboard.txt` | 4718 | Live dashboard HTML — **129 backend calls** | REBUILD as thin client |
| `KAI_15May2026_V1_Dashboard.txt` | 325 | V1 dashboard | ARCHIVE |
| `KAI_Login.html` | 296 | Login page | KEEP (infra) |
| `index.html` | 1165 | Standalone CV screener, Claude API **in browser**, keys in localStorage | QUARANTINE → rebuild server-side |

### The patch chain (the fragmentation)

| File | Lines | Capability | Winning? | Verdict |
|------|------:|-----------|----------|---------|
| `patch_v280.txt` | 1045 | CSV/XLSX import, field mapping | yes | KEEP → infra/import module |
| `KAI_17May2026_patch_v282.gs.txt` | 803 | Dashboard cache, KAI No generation, `getDashboardDataV2` | partial | KEEP cache+KAI No, dedup `computeTop3Positions_` |
| `KAI_17May2026_patch_v283.txt` | 819 | Trade patterns, urgency, `setupLoginSystem` (dup) | partial | KEEP trade patterns, ARCHIVE dup login |
| **`patch_v284.txt`** | 1866 | **API layer (`doGet`, `handleApiRequest_`, `getCandidateProfileApi_`), Projects CRUD, auth** | **YES — canonical** | KEEP → api + foundation modules |
| `KAI_17May2026_patch_v284.txt` | 1698 | Same v284 **minus** the 2 API functions | NO — incomplete subset | ARCHIVE |
| `KAI_17May2026_patch_v285.txt` | 1631 | Matching engine (`get*Score285_`, `matchCandidatesForReq285_`), requirement detail | yes | KEEP → intelligence/match module |
| `KAI_17May2026_patch_v286.txt` | 1159 | Reply scanner, field extraction from email, timeline | yes | KEEP → infra/reply module |
| `patch_v287.txt` | 1170 | Auto-reply, quota, daily digest (baseline) | NO | ARCHIVE (superseded) |
| `KAI_17May2026_patch_v287.gs.txt` | 1354 | Same v287 **+ emergency pause + quarantine** (hardened) | YES — canonical | KEEP → infra/autoreply module |
| `KAI_17May2026_patch_v288.txt` | 454 | Session identity (`getSessionUser`), top3 fix, freshness labels, cache | yes | KEEP → infra/session + intelligence |
| `KAI_18May2026_patch_v289.txt` | 340 | **Candidate reply processing engine** (email-matched + KAR token) | yes | KEEP → infra/reply module |
| `patch_v291.txt` | 2056 | OCR fixes, Gemini wrappers (`callGemini_v291_`), quota, pending email queue | yes | KEEP → infra/gemini module |
| `patch_v292.txt` | 429 | Hierarchy: `findOrCreateClient_/Project_/Campaign_` | yes | KEEP → foundation module (REBUILD for Amendment 1) |
| `patch_v293.txt` | 603 | Multimodal PDF JD extraction, `REQ_HEADERS_V293_`, `saveRequirementV293_` | yes | KEEP → intelligence/JD (REBUILD save for FK columns) |
| `patch_v293_test.gs.txt` | 166 | Test runner | ARCHIVE after freeze |
| `patch_v294.txt` | 141 | Single-req hierarchy orchestrator | REBUILD — violates Amendment 1 |

### Data, docs, assets

| File | Verdict |
|------|---------|
| `FOUNDATION_SCHEMA_LOCKED.md` | KEEP — Constitution |
| `KAI_BUG_MEMORY.md` | KEEP — running ledger |
| `diagnostics.txt` | KEEP — ops tool |
| `taxanomy996.txt` (1003 lines) | KEEP — Trade Taxonomy intelligence input |
| `28th April 1356 hrs.txt` | ARCHIVE — dead snippet, dup `getDashboardData` |
| `README.md` (2 lines) | REWRITE |
| `BLS_OOH_Trade_Taxonomy.xlsx`, `KAI_SORTED_BY_SCORE.xlsx` | MOVE to Drive, out of repo |
| `Gas Current Dashboard.png` | MOVE to Drive |

---

## 2. DEPENDENCY MAP

### Live entry points (34) — the only code that actually runs

```
LOGIN (KAI_Login.html)
  verifyLoginAndIssueToken(email,password) ─┐
  validateSessionToken(token) ──────────────┼─▶ [auth infra]

V2 DASHBOARD (KAI_16May2026_V2_Dashboard.txt — 129 calls, 28 unique critical)
  getDashboardDataV2() ─────────────────────▶ candidate metrics, quota, dropdowns
  getSessionUser_v291_() ───────────────────▶ [session infra]
  getCandidateIntelligence(kaiNo) ──────────▶ candidate drawer (race-condition history)
  getReviewQueue / approveReviewItem / rejectReviewItem / bulkApproveReview
  assignRecruiterOwner / updateCandidateStateWithOwner / bulkUpdateState
  updateTechnicalReview
  extractJdPublicV293Fixed / extractJdFromPastePublicV293Fixed ─▶ [JD intelligence]
  bulkCreateRequirementsFromJDsV293 ─────────▶ saveRequirementV293_ ─▶ REQ_HEADERS_V293_
  listProjects / mapReqToProjectPublic / createClientHierarchyAndMapReqPublic ─▶ [hierarchy]
  matchCandidatesForReqPublic ──────────────▶ get*Score285_ [match intelligence]
  shortlistCandidateForReq / bulkShortlistForReq
  sendMissingInfoRequest / bulkSendMissingInfo / generateMissingInfoDraft ─▶ [reply]
  previewFieldMapping / submitCsvImport / submitExcelImport / processXlsxRequirementsPublic
  clearDashboardCacheV2

V1 DASHBOARD (legacy) → getDashboardData, updateCandidateStage  [ARCHIVE path]
```

### Critical call chain (requirement creation — the Foundation-violating path)

```
Dashboard
 └▶ bulkCreateRequirementsFromJDsV293()
     ├▶ getMasterSS_()            [sheet infra ✓]
     ├▶ ensureSheet_()           [sheet infra ✓]
     ├▶ REQ_HEADERS_V293_        [19-col schema — NO Campaign/Project/Client ID columns ✗]
     ├▶ saveRequirementV293_(jd) [writes row]
     └▶ createClientHierarchyAndMapReq_()
         ├▶ findOrCreateClient_()    [v292 ✓]
         ├▶ findOrCreateProject_()   [v292 ✓]
         ├▶ findOrCreateCampaign_()  [v292 ✓ — campaign IS created]
         └▶ mapReqToProject_()       [✗ writes "[Project:PROJ-xxx]" into NOTES, links to PROJECT not CAMPAIGN]
```
**This is the single most important defect in the system.** The hierarchy is built correctly but the requirement is bolted to it through a string in a free-text column, and to the wrong parent.

### Hidden coupling

- **Config coupling:** 6 files read `CONFIG_V2`; 2 files read dead `CONFIG`. Any schema change ripples across 6 files.
- **Version coupling:** `get*Score285_` (match) depends on candidate ext-columns from `CONFIG_V2` defined in a different file; `saveRequirementV293_` depends on `callGemini_v291_` from yet another. Cross-version function calls are everywhere.
- **Counter coupling:** Req IDs and KAI Nos use `PropertiesService` counters (`reqIdCounterKey`, `kaiNoCounterKey`) — single-writer assumption, drift risk under concurrency.

---

## 3. COMPONENTS TO KEEP

> Keep = the capability is correct and stays. Code gets **relocated into a clean module**, duplicates collapsed to one.

### Infrastructure (non-negotiable)
| Capability | Source of winning code | Target module |
|-----------|------------------------|---------------|
| Auth / token / session | `patch_v284.txt` (`verifyLoginAndIssueToken`, `isValidToken_`, `validateSessionToken`) + `v288` `getSessionUser` | `01_infra_auth` |
| Drive (CV/JD storage) | `Code.gs.txt` (`saveCvToDrive_`, `extractText*`) | `01_infra_drive` |
| Gmail (labels, send, parse) | `Code.gs.txt` + `v286` + `v289` | `01_infra_gmail` |
| Sheets (`getMasterSS_`, `ensureSheet_`, `ensureExtendedColumns_`) | `Code.gs.txt` / `KAI_16May2026_V2.txt` | `01_infra_sheets` |
| Gemini wrappers + quota | `patch_v291.txt` (`callGemini_v291_`, `callGeminiString_v291_`), `CONFIG_QUOTA` | `01_infra_gemini` |

### Business logic (winning versions only)
| Capability | Winning version | Target module |
|-----------|-----------------|---------------|
| JD multimodal extraction | `v293` (`extractJdFromPdfInline_v293_`) | `20_intelligence/jd` |
| Requirement write schema | `REQ_HEADERS_V293_` (extend to Foundation) | `10_foundation/requirement` |
| Client/Project/Campaign find-or-create | `v292` | `10_foundation` |
| Matching engine | `v285` (`get*Score285_`, `matchCandidatesForReq285_`) | `20_intelligence/match` |
| Reply processing | `v286` + `v289` | `01_infra_gmail` + `20_intelligence/reply` |
| Auto-reply + emergency controls | `KAI_17May2026_patch_v287.gs.txt` (hardened) | `01_infra_autoreply` |
| Candidate state machine | `CONFIG_V2` states + `deriveCandidateState_` | `30_candidate` |
| Candidate Profile API | `patch_v284.txt` `getCandidateProfileApi_` (just patched) | `90_api` |
| Import (CSV/XLSX) | `v280` | `01_infra_import` |
| Trade taxonomy | `taxanomy996.txt` + `v283` patterns | `20_intelligence/taxonomy` |

### Config (collapse to one)
- `CONFIG_V2` → master config (states, mobility, ext columns)
- `CONFIG_QUOTA` → quota limits
- `REQ_HEADERS_V293_` → requirement schema (to be extended for Foundation FKs)

---

## 4. COMPONENTS TO ARCHIVE

> Archive = move to an `/_archive` folder (not deleted yet — reference until rebuild verified), no new calls.

| Item | Reason |
|------|--------|
| `CONFIG` (v1, in `Code.gs.txt`) | Superseded by `CONFIG_V2` |
| `saveRequirement_()` (v2), `saveRequirementV284_()` | Superseded by `saveRequirementV293_` |
| `extractJdV284_`, `extractJdPublicV2Fixed`, `extractJdPublic` (v283/v284) | Superseded by v293 |
| `KAI_17May2026_patch_v284.txt` | Incomplete subset of canonical `patch_v284.txt` |
| `patch_v287.txt` | Superseded by hardened `KAI_..._v287.gs.txt` |
| `KAI_15May2026_V1_Dashboard.txt` | V1 dashboard, V2 is live |
| `28th April 1356 hrs.txt` | Dead snippet, dup `getDashboardData` |
| `*_DEPRECATED_` functions (`generateMissingInfoDraft_v282_DEPRECATED_`, `setupLoginSystem_v283_DEPRECATED_`) | Self-labelled dead |
| `patch_v293_test.gs.txt` | Test runner — archive after Foundation freeze |
| Duplicate `computeTop3Positions_` (3×), dup `setupV*`, dup `onOpen`/`doGet` | Collapse to one each |
| `BLS_OOH_Trade_Taxonomy.xlsx`, `KAI_SORTED_BY_SCORE.xlsx`, `.png` | Binary assets → Drive |

**Estimated dead/duplicate surface: ~100 functions** out of 700+ (≈14%).

---

## 5. COMPONENTS TO REBUILD

> Rebuild = the capability must change to honor the locked Foundation. These are the only places new code gets written.

| # | Component | Why rebuild | Target |
|---|-----------|-------------|--------|
| R1 | **Requirement write** | Must persist `Campaign ID` (mandatory), `Project ID`, `Client ID` as **dedicated FK columns**; stop using Notes. Extend `REQ_HEADERS_V293_` to the locked 38-col schema. | `10_foundation/requirement` |
| R2 | **Hierarchy orchestrator (`v294`)** | Must link requirement to **Campaign** (Amendment 1), not Project-via-Notes. No requirement without a Campaign. | `10_foundation/orchestrator` |
| R3 | **Trade verify gate** | One `Trade` + `Trade Source` (AI/Recruiter). AI writes Trade only when source=AI; recruiter override flips source and locks it. | `10_foundation/requirement` |
| R4 | **KAI Intelligence layer** | Extract all AI output OUT of the requirement master into a separate keyed table. Requirement master stays operational. | `20_intelligence` |
| R5 | **Associate entity** | Does not exist. Net-new core Foundation entity between Requirement and Candidate. | `10_foundation/associate` |
| R6 | **Scoring consolidation** | 3× `computeTop3Positions_`, scattered `get*Score285_` → one scoring module, one weight table. Move `index.html` browser scoring server-side. | `20_intelligence/match` |
| R7 | **Config unification** | Collapse `CONFIG`/`CONFIG_V2`/`reqHeaders`/`REQ_HEADERS_V293_` into one schema module. | `00_config` |
| R8 | **Dashboard → thin client** | 4718-line monolith with 129 backend calls becomes a display layer over named APIs. No business logic in HTML. | UI layer |
| R9 | **Execution chain (reserved)** | Match → Submission → Selection → Mobilization tables — architecture reserved, built after Foundation freeze. | `40_flow` |

---

## 6. FOUNDATION IMPLEMENTATION PLAN

**Target backend module structure (single backend, clean ownership):**

```
00_config          CONFIG_V2 + CONFIG_QUOTA + all schema constants (ONE source)
01_infra_auth      login, token, session, user mgmt
01_infra_sheets    getMasterSS_, ensureSheet_, ensureExtendedColumns_
01_infra_drive     CV/JD storage
01_infra_gmail     labels, send, reply scan
01_infra_gemini    callGemini wrappers, quota
01_infra_import    CSV/XLSX import
10_foundation
   ├─ client        _Clients  (locked 19-col schema)
   ├─ project       _Projects (locked 18-col, Client ID FK)
   ├─ campaign      _Campaigns (locked 24-col)
   ├─ requirement   _Requirements (locked 38-col, Campaign ID MANDATORY)
   ├─ associate     _Associates (locked 14-col)  ← net new
   └─ orchestrator  Client→Project→Campaign→Requirement (no bypass)
20_intelligence    KAI Intelligence (jd, match, taxonomy, predict)
30_candidate       state machine, profile API
40_flow            match→submission→selection→mobilization (reserved)
90_api             doGet router, handleApiRequest_, all public endpoints
99_admin           setup, diagnostics, menu, onOpen
```

**Sequenced steps (matches `FOUNDATION_SCHEMA_LOCKED.md` Section 13):**

```
STEP 0  Create _archive/ folder, move Section-4 items there (NO deletes yet)
STEP 1  00_config — unify config + write 5 locked schema constants
STEP 2  _Clients schema  + ensureSheet at 19 cols
STEP 3  _Projects schema + Client ID FK
STEP 4  _Campaigns schema (24 cols)
STEP 5  _Requirements schema (38 cols) — add Campaign/Project/Client ID columns
STEP 6  _Associates schema (14 cols)
STEP 7  Rebuild orchestrator: req → Campaign (mandatory), FKs in columns
STEP 8  Migration script: backfill existing rows, parse "[Project:xxx]" out of Notes
STEP 9  Foundation APIs (getClients/Projects/Campaigns/Requirements/Associates)
STEP 10 Foundation Detail pages (thin client)
STEP 11 FREEZE Foundation
```

Every step is **additive + reversible** until STEP 11. The `_archive` folder means nothing is destroyed before the replacement is proven.

---

## 7. INTELLIGENCE 14+ INTEGRATION PLAN

**Reframe locked:** Intelligence is a **recruiter**, not a parser. JD parsing is ~5%.

```
INPUT SIGNALS (14)                    KAI INTELLIGENCE              OUTPUTS
─────────────────                     ────────────────              ───────
JD                          ┐
CV                          │
Client history              │
Project history             │
Campaign history            ├────────▶  Requirement Intelligence
Country rules               │           Candidate Intelligence
Trade taxonomy              │           Match Intelligence
Historical submissions      ├────────▶  Submission Intelligence
Historical selections       │           Mobilization Intelligence
Historical mobilizations    │
Associate performance       │                    │
Recruiter performance       │                    ▼
Salary benchmarks           │           Requirement Score
Failure reasons             ┘           Candidate Match Score
                                        Submission Recommendation
                                        Risk Flags
                                        Salary Guidance
                                        Mobilization Prediction
```

**Integration rules:**
1. KAI Intelligence is a **separate module + separate table**, keyed by entity ID. It never writes to the operational masters except the single `Trade` field (with `Trade Source = AI`).
2. It is **read-only to recruiters** and **append-only from AI** (every output carries `AI Model Version` + `AI Extraction Date`).
3. Build order: JD extraction (exists, v293) → requirement scoring → candidate match scoring (exists, v285, consolidate) → submission/mobilization prediction (after Execution chain exists).
4. **Today's intelligence is extraction-grade. Target is decision-grade.** The history tables (submissions/selections/mobilizations) don't exist yet — so prediction is Phase-after-Foundation. Don't promise prediction before the data exists to train it.

---

## 8. CANDIDATE ARCHITECTURE PLAN

| Aspect | Current | Target |
|--------|---------|--------|
| Master | `Candidates` sheet, 24 base + 14 ext (cols 25-38) via `CONFIG_V2` | Keep — it works |
| Identity | `KAI No` (col 25), `findCandidateByKaiNo_` (fixed) | Keep |
| State machine | 18 states, 9 mobility (`CONFIG_V2`) | Keep, formalize transitions |
| Source tracing | none | **Add `Associate ID` FK** — every candidate traces to its source |
| Profile API | `getCandidateProfileApi_` (patched, GREEN pending verify) | Keep → `90_api` |
| Intelligence | mixed into candidate columns (Score, Verdict, Assessment) | Move AI outputs to KAI Intelligence (candidate-keyed) |
| Drawer | race condition (no identity guard in `renderPanel`) | Apply token-counter guard |

**Candidate is downstream of Foundation.** Per the locked sequence, candidate work resumes **after Foundation freeze** — except the in-flight Profile API GREEN, which finishes the current micro-task.

---

## 9. REQUIREMENT ARCHITECTURE PLAN

**The requirement is the spine. Two layers, hard-separated:**

```
REQUIREMENT MASTER (_Requirements, 38 cols)        KAI INTELLIGENCE (keyed by Req ID)
─ operational, recruiter-owned                      ─ AI-owned, recruiter reads only
─ Campaign ID (MANDATORY FK)                        ─ AI Trade, Skills, Certs, Quals
─ Project ID, Client ID (FK columns)                ─ Responsibilities, Industry
─ Trade + Trade Source                              ─ Requirement Score, Risk Flags
─ GCC terms (food/accom/transport/rotation/         ─ Salary Guidance
   medical/passport validity/duty hours/contract)   ─ Mobilization Prediction
─ Status, counts                                    ─ AI Confidence + Model Version
```

**Rebuild specifics:**
- R1: extend schema to 38 cols, add the 3 FK columns.
- R2: orchestrator links to Campaign, not Project; Campaign ID never null.
- R3: Trade verify gate (one trade, source flag).
- R8 migration: parse every existing `[Project:PROJ-xxx]` out of Notes into the new Project ID column, derive Campaign ID from the project's campaign.
- Requirement Detail page: 7 tabs (Overview / JD / AI Analysis / Matching / Submissions / Mobilization / Activity Log) — each reads a named endpoint, computes nothing.

---

## 10. KAI FLOW ARCHITECTURE PLAN

KAI Flow = the **execution chain** the recruiter drives day to day.

```
Requirement ─▶ Match ─▶ Submission ─▶ Selection ─▶ Mobilization
   (built)    (v285,    (RESERVED)    (RESERVED)    (RESERVED)
              consolidate)
```

| Stage | State today | Plan |
|-------|-------------|------|
| Match | Engine exists (`v285`), wired to `matchCandidatesForReqPublic` | Consolidate into `20_intelligence/match`; persist matches to a `_Match` table (reserved) |
| Submission | none | Build `_Submissions` after Foundation freeze: Req ID + Candidate ID + Associate ID + date + client feedback |
| Selection | none | Build `_Selections`: Submission ID + outcome |
| Mobilization | partial (candidate states OFFER→VISA→MEDICAL→DEPLOY) | Link state machine to `_Mobilization` keyed by Selection ID |

**Rule:** KAI Flow tables are **reserved now, built after Foundation freeze.** The candidate state machine already models mobilization sub-states — reuse it, don't rebuild it.

---

## 11. SaaS MIGRATION READINESS PLAN

| # | Risk | Severity | Fix (when) |
|---|------|----------|-----------|
| M1 | FKs (`Project`/`Campaign`) stored in Notes string | CRITICAL | R1/R2 — dedicated columns (Foundation build) |
| M2 | Client stored as **name string**, not Client ID, across 4 sheets | HIGH | Add Client ID FK everywhere (Foundation build) |
| M3 | AI output mixed into operational masters | HIGH | R4 — KAI Intelligence separate table |
| M4 | No Associate entity = source untraceable | HIGH | R5 — build `_Associates` now |
| M5 | Standalone requirements possible (orphans) | HIGH | R2 — Campaign ID mandatory |
| M6 | Country as free text | MEDIUM | Standardize to ISO-3166 |
| M7 | `PropertiesService` counters for IDs | MEDIUM | Move to UUID or sheet-max in SaaS |
| M8 | Req/Filled counts as stored counters (drift) | MEDIUM | Document as computed-in-SaaS; flush on write |
| M9 | Single Google Sheet = single tenant | STRUCTURAL | SaaS = per-tenant DB; sheet schema must map 1:1 to tables (the locked schema does) |

**Migration posture:** the locked Foundation schema is **already table-shaped** — every entity maps 1:1 to a future SQL table. Fix M1-M5 during the Foundation build and the SaaS migration becomes an export, not a rewrite.

---

## 12. RISK ASSESSMENT

### Execution risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Big-bang rewrite breaks live pipeline** | High | Severe | **Strangler pattern.** New modules run alongside old; cut over endpoint by endpoint. `_archive`, never delete-before-proven. |
| Migration corrupts existing requirements | Medium | Severe | R8 backfill is **dry-run first**, writes to new columns only, originals untouched until verified |
| Hidden dependency surfaces mid-cut | High | Medium | Dependency map (§2) is the guide; every cut re-runs the entry-point check |
| Counter drift under concurrency | Low | Medium | Lock service already used in `v289`; formalize for ID issuance |
| Scope creep into Candidates/KAI Flow before Foundation freeze | High | High | **Hard gate:** nothing past Foundation until STEP 11. Sequence is locked. |

### Architectural risks if we DON'T do this
| Risk | Consequence |
|------|-------------|
| Continue patch chain | v295, v296… each adds duplicates; 59 dup functions becomes 90; nobody can find the winning version |
| Leave FKs in Notes | First SaaS export needs a regex parser per row; data loss on edge cases |
| Leave AI in masters | Recruiter edits and AI writes collide; the "empty profile / contradictory assessment" class of bug recurs forever |
| Keep `index.html` browser keys | API keys exfiltrable from any recruiter's browser; one screenshot = leaked Gemini/Claude key |

### What I am challenging in the directive
1. **"Controlled demolition" ≠ rewrite.** I recommend consolidation + targeted rebuild via strangler pattern. A from-scratch rewrite of a live recruitment pipeline is the highest-risk path and contradicts "survive 10 years without another rewrite" — you'd be doing the rewrite *now* to avoid one *later*. We rebuild the **business/intelligence layer** and **relocate** the proven infra.
2. **Don't promise decision-grade Intelligence yet.** Prediction needs submission/selection/mobilization history that doesn't exist. Intelligence is extraction-grade today; it becomes decision-grade only after KAI Flow accumulates outcomes. Sequence: Foundation → Flow → Intelligence-as-recruiter.
3. **Keep `Code.gs.txt` until infra is extracted.** It's tagged "V1" but holds live Drive/Gmail/quota infra. Archive the v1 *business logic*, not the file, until the infra modules exist.

---

## NET RECOMMENDATION

**Do not write a single new patch (`v295`).** Open the clean module structure (§6), move dead/duplicate code to `_archive`, and rebuild only the 9 components in §5 — all behind the locked Foundation schema, all via strangler cut-over so the live pipeline never stops.

**Tomorrow = STEP 0 + STEP 1:** create `_archive/`, stand up `00_config` as the single schema source. Everything else sequences from there, gated at Foundation freeze before Candidates resume.

---
**END OF REBUILD AUDIT — no code written, by directive.**
