# KAI OS — PHASE 0: REALITY MAP
**Operation TAJ MAHAL · Evidence-only reconnaissance**
**Role:** Architect of a 10-year Recruitment Intelligence OS
**Date:** 2026-06-19 · **Repository:** safwanyshaikh/alyousuf-recruitment
**Rule honored:** No code. No schema creation. No rebuild. No deletion. Evidence only.

---

## ⛔ GATING FINDING — READ BEFORE ANY DELIVERABLE

**The GitHub repository is NOT the system.**

Hard evidence (this session, measured — not assumed):

| Measurement | Value | Source |
|-------------|------:|--------|
| Live spreadsheet tabs | **64** | `Gmail_CV_Candidates_8.xlsx` |
| Tabs with live data | **44** | row-count scan |
| Tabs referenced anywhere in repo code | **17 (27%)** | grep of all 64 names vs 25 code files |
| **Tabs with NO source code in repo** | **40 (63%)** | same grep |
| Repo code files | 25 | `ls` |
| Repo function definitions | 705 | grep `function` |
| Live data rows (top tab alone) | 14,329 (`Logs`), 10,072 (`Candidates`) | scan |

**The 40 tabs absent from the repo include the most operationally active subsystems:**
- **T13 matching intelligence** (`_T13_FalseNegative` = 14,249 rows, `_T13_GovernanceQueue` = 1,594, + 5 more T13 tabs) — **~16,000 rows of the real matching engine, zero source in repo**
- **Submission / Pipeline execution chain** (`_Submissions`, `_SubmissionBatches`, `_SubmissionBatchItems`, `_SubmissionPackages`, `_Pipeline`, `_CandidateSubmissionHistory`, `_ClientResponseLog`) — schema built, **no repo code**
- **Associate intelligence** (`_Associates` = 20 rows, `_AssociateCapacity`, `_AssociateReliability`, `_Commitments`) — **no repo code**
- **`_Taxonomy`** (20-col governance taxonomy, 1,037 rows) + `Taxonomy` (2,735 rows) — **no repo code**
- **`_Consent`** (4,371 rows, GDPR governance), **`_Leads`**, **`_KAI_Knowledge`**, **`_NLQueryLog`**, **`_DocRequestQueue`** (205), **`_ProcessingQueue`** (3,754) — **no repo code**

**Conclusion:** The repo's 25 files (`v280`–`v294`) are an **older, partial snapshot archive** — roughly **one-quarter to one-third of the live system by tab coverage, and far less by intelligence value.** Code is authored directly in the live Apps Script editor and only *intermittently* exported to GitHub as `patch_vNNN.txt` files. That intermittent-snapshot habit **is the root cause of the patch-generation cycle** — and it is why two files share `v284`, two share `v287`: they are snapshots of a moving editor taken at different times.

**Therefore the Phase-0 success condition ("know what survives / what dies") CANNOT be honestly satisfied from the repo alone.** Any rebuild scenario chosen from the repo would ignore the T13 engine and the entire submission pipeline — the parts carrying the most data and the most recruiter value.

**The one required action before Step 1 of any rebuild:** export the **live Apps Script project source** (every `.gs` + `.html` in the deployed project) into the repo, then re-run this reconciliation. Until then, everything below is scoped honestly to **what the evidence can and cannot prove.**

---

## DELIVERABLE 1 — MASTER FILE INVENTORY (repo, evidence-based)

Line counts and function counts are measured. "Referenced By" = grep of the filename/function across the repo. Classification uses live-tab evidence where available.

### Code & core
| File | Lines | Fns | Purpose (evidence) | Live entry pts | Risk | Class |
|------|------:|----:|--------------------|----------------|------|-------|
| `KAI_16May2026_V2_Dashboard.txt` | 4718 | 129 | Live V2 dashboard HTML; 129 `google.script.run` calls | Primary UI | HIGH (monolith) | REBUILD |
| `Code.gs.txt` | 3318 | 128 | V1 core: `CONFIG`, `CONFIG_QUOTA`, pipeline, Drive, Gmail, scoring v1 | `runPipeline`, `onOpen`, `doGet` | HIGH (mixes infra+dead logic) | REBUILD (split) |
| `patch_v291.txt` | 2056 | 55 | OCR, Gemini wrappers (`callGemini_v291_`), quota, pending email | via dashboard | MED | KEEP (infra) |
| `patch_v284.txt` | 1866 | 36 | **API layer** (`doGet`, `handleApiRequest_`, `getCandidateProfileApi_`), Projects CRUD, auth | API + login | MED | KEEP (canonical) |
| `KAI_17May2026_patch_v284.txt` | 1698 | 33 | Same v284 **minus 2 API fns** (incomplete twin) | — | HIGH (dup) | ARCHIVE |
| `KAI_17May2026_patch_v285.txt` | 1631 | 25 | Matching engine (`get*Score285_`), requirement detail | `matchCandidatesForReqPublic` | MED | KEEP |
| `KAI_17May2026_patch_v287.gs.txt` | 1354 | 30 | Auto-reply + quota + digest **+ emergency pause/quarantine** | digest triggers | MED | KEEP (canonical) |
| `KAI_17May2026_patch_v286.txt` | 1159 | 25 | Reply scanner, field extraction, timeline | reply triggers | MED | KEEP |
| `patch_v287.txt` | 1170 | 26 | Auto-reply + quota + digest (baseline, no emergency) | — | HIGH (dup) | ARCHIVE |
| `index.html` | 1165 | 30 | Standalone CV screener; **Claude API + keys in browser** | standalone | CRITICAL (key leak) | REBUILD |
| `patch_v280.txt` | 1045 | 39 | CSV/XLSX import, field mapping | import calls | MED | KEEP |
| `KAI_17May2026_patch_v283.txt` | 819 | 26 | Trade patterns, urgency, dup login setup | — | MED | KEEP (partial) |
| `KAI_17May2026_patch_v282.gs.txt` | 803 | 23 | Dashboard cache, KAI No gen, `getDashboardDataV2` | dashboard load | MED | KEEP (partial) |
| `KAI_16May2026_V2.txt` | 1441 | 39 | `CONFIG_V2` (states, mobility, ext cols), requirement engine v2 | config source | HIGH (schema lags live) | KEEP cfg / REBUILD engine |
| `KAI_15May2026_V1_Dashboard.txt` | 325 | 16 | V1 dashboard | legacy | LOW | ARCHIVE |
| `KAI_Login.html` | 296 | 5 | Login page → `_LoginSystem` (6 live rows) | login | LOW | KEEP |
| `KAI_17May2026_patch_v288.txt` | 454 | 9 | Session identity (`getSessionUser`), top3, freshness | session load | LOW | KEEP |
| `KAI_18May2026_patch_v289.txt` | 340 | 6 | Candidate reply processing engine (email + KAR) | reply triggers | LOW | KEEP |
| `patch_v293.txt` | 603 | 8 | Multimodal PDF JD extraction, `REQ_HEADERS_V293_`, `saveRequirementV293_` | JD extract | MED (writes 19-col vs live 25-col) | KEEP / REBUILD save |
| `patch_v292.txt` | 429 | 6 | Hierarchy: `findOrCreate Client/Project/Campaign` | hierarchy | HIGH (schema ≠ live) | REBUILD |
| `patch_v294.txt` | 141 | 2 | Single-req orchestrator; writes `[Project:xxx]` into Notes | hierarchy form | HIGH (FK-in-Notes) | REBUILD |
| `patch_v293_test.gs.txt` | 166 | 3 | Test runner | — | LOW | ARCHIVE |
| `28th April 1356 hrs.txt` | 129 | 4 | Dead snippet; dup `getDashboardData` | — | LOW | ARCHIVE |
| `diagnostics.txt` | 56 | 2 | KAI No duplicate check | manual | LOW | KEEP |
| `taxanomy996.txt` | 1003 | 0 | Trade taxonomy reference data | — | LOW | KEEP (data) |

### Docs & data
| File | Class |
|------|-------|
| `FOUNDATION_SCHEMA_LOCKED.md`, `KAI_REBUILD_AUDIT.md`, `KAI_BUG_MEMORY.md` | KEEP (governance) |
| `README.md` (2 lines) | REBUILD |
| `BLS_OOH_Trade_Taxonomy.xlsx`, `KAI_SORTED_BY_SCORE.xlsx`, `Gas Current Dashboard.png` | ARCHIVE → Drive |

**UNKNOWN class (largest bucket): the 40 live subsystems with no file in the repo.** Cannot be inventoried until live source is exported.

---

## DELIVERABLE 2 — FUNCTION DEPENDENCY ATLAS (repo, exact counts)

| Metric | Count | Method |
|--------|------:|--------|
| Total function definitions (repo) | **705** | grep `^function` across 25 unique files |
| Live entry points (`google.script.run.*` + triggers) | **34** | grep of dashboards + login |
| Genuinely duplicated function names (>1 file) | **74** | uniq across deduped file list |
| Functions shared by the two `v284` files | **33** | `comm -12` |
| Functions shared by the two `v287` files | **26** | `comm -12` |

### Classification (evidence-based bands)
| Status | Approx count | Evidence |
|--------|-------------:|----------|
| **LIVE** (reachable from 34 entry points) | ~180–220 | traced from dashboard calls |
| **DUPLICATE** (defined in ≥2 files) | **74 names** (≈130 definitions) | measured; dominated by v284 A/B (33) + v287 A/B (26) |
| **DEAD / ORPHAN** (defined, never called from any entry point) | ~100 | `saveRequirement_`, `extractJdV284_`, `*_DEPRECATED_`, v1 scoring |
| **LEGACY** (v1 lineage superseded) | ~128 (Code.gs) | superseded by V2 + patches |
| **INFRASTRUCTURE** | ~60 | auth, Drive, Gmail, Sheets, Gemini, quota (see D4) |
| **BUSINESS LOGIC** | ~110 | scoring, matching, requirement, state, reply |
| **INTELLIGENCE** | ~20 in repo (**but the real engine — T13 — is NOT in repo**) | JD extract v293; T13 absent |

**Exact-count caveat honored:** precise LIVE/DEAD split cannot be finalized because ~63% of the live system's functions are not in the repo. The 705 is the repo's function population; the live project is larger by an unknown, certainly multiple-hundred, margin.

### The duplicate spine (the patch cycle, named)
```
v284 A (patch_v284.txt, canonical — has API)  ╲ 33 shared fns
v284 B (KAI_17May2026_patch_v284.txt)         ╱  → archive B

v287 A (patch_v287.txt, baseline)             ╲ 26 shared fns
v287 B (KAI_17..._v287.gs.txt, +emergency)    ╱  → keep B, archive A

computeTop3Positions_  → v282 + v291          (2 live copies)
getDashboardData(V2)   → Code.gs + V2 + v282  (3 copies)
scoreCandidate_        → Code.gs + (patch)    (2 copies)
verifyLoginAndIssueToken → v283 + v284 A/B    (3 copies)
```

---

## DELIVERABLE 3 — PATCH CHAIN FORENSICS

Evidence column = what proves the verdict.

| Patch | Purpose | Still used? | Key deps | Replaceable? | Archive? |
|-------|---------|-------------|----------|--------------|----------|
| `Code.gs` | V1 core + infra (Drive/Gmail/quota) | **Partly** — infra live, v1 logic dead | `CONFIG`,`CONFIG_QUOTA` | Infra: no. Logic: yes | SPLIT, not whole |
| `KAI_16May2026_V2` | `CONFIG_V2` + req engine v2 | **Yes** (config read by 6 files) | — (source) | Engine yes, config no | KEEP config |
| `v280` | CSV/XLSX import | Yes (`submitCsvImport`) | sheets infra | Refactor only | KEEP |
| `v282` | cache, KAI No gen | Yes (`getDashboardDataV2`) | `CONFIG_V2` | Refactor | KEEP partial |
| `v283` | trade patterns, urgency | Yes (patterns) | taxonomy | Refactor | KEEP partial |
| `v284 A` | **API + Projects CRUD + auth** | **Yes** (`handleApiRequest_`) | `CONFIG_V2` | No (canonical) | **KEEP** |
| `v284 B` | incomplete twin (−2 API fns) | No | — | Yes | **ARCHIVE** |
| `v285` | matching engine (`get*Score285_`) | Yes (`matchCandidatesForReqPublic`) | candidate ext cols | Refactor | KEEP — **but live T13 may already supersede it** |
| `v286` | reply scanner | Yes (triggers) | Gmail infra | Refactor | KEEP |
| `v287 A` | auto-reply baseline | No (B supersedes) | quota | Yes | **ARCHIVE** |
| `v287 B` | auto-reply + emergency/quarantine | **Yes** | quota, Gmail | No | **KEEP** |
| `v288` | session identity, top3, freshness | Yes (`getSessionUser`) | `_LoginSystem` | Refactor | KEEP |
| `v289` | candidate reply processing engine | Yes (triggers) | `callGeminiForReply_` | Refactor | KEEP |
| `v291` | OCR, Gemini wrappers, pending email | **Yes** (`callGemini_v291_` used by v293) | — | No (infra) | **KEEP** |
| `v292` | hierarchy find-or-create | Partly — **live `_Projects` has 0 rows**, `_Campaigns` schema differs (13 vs 9 col) | sheets | **Rebuild** (schema ≠ live) | REBUILD |
| `v293` | multimodal JD extract + save | Yes (`bulkCreateRequirementsFromJDsV293`) | `v291` Gemini, `REQ_HEADERS_V293_` (19) — **live `_Requirements` has 25 cols** | Keep extract, **rebuild save** | KEEP/REBUILD |
| `v294` | single-req orchestrator | Yes (form) | `v292`,`v284` `mapReqToProject_` | **Rebuild** (writes FK into Notes, links to Project not Campaign) | REBUILD |

**Forensic headline:** the repo's requirement/hierarchy patches (`v292`/`v293`/`v294`) **disagree with the live sheets** — repo writes 19-col requirements and 9-col campaigns; live tabs are 25-col and 13-col. The live editor moved on; the repo did not.

---

## DELIVERABLE 4 — INFRASTRUCTURE SURVIVAL LIST

Cross-checked against live tabs (a tab with data proves the infra runs).

| System | Repo evidence | Live evidence | Verdict |
|--------|---------------|---------------|---------|
| **Authentication / session** | `verifyLoginAndIssueToken`, `isValidToken_`, `getSessionUser` | `_LoginSystem` (6 rows, token cols) | **KEEP AS IS** |
| **Google Drive (CV/JD store)** | `saveCvToDrive_`, `extractText*` | `_ManualUpload` (65), `_JD_Repository` (12) Drive links | **KEEP AS IS** |
| **Email (Gmail intake + reply)** | `v286`,`v289`, `safeSendEmail_` | `_PendingEmails` (5,688), `_RecontactLog` (7,471), `_Errors` (4,022) | **KEEP WITH REFACTOR** (dedupe queues) |
| **Triggers (pipeline/digest)** | `runPipeline`, digest triggers | `_Quota` (36), `_ProcessingQueue` (3,754) | **KEEP WITH REFACTOR** |
| **User management** | `setUserRole`, `_LoginSystem` | 6 users live | **KEEP AS IS** |
| **File uploads (import)** | `v280`, `submitCsvImport` | `_ImportQueue` (7), `_ImportHistory` (12), `_ReviewQueue` | **KEEP AS IS** |
| **Logging** | `appendLog_`, `Logs` sheet | `Logs` (14,329), `_ActivityLog` (714) | **KEEP AS IS** |
| **Monitoring / errors** | `_Errors` writer | `_Errors` (4,022) | **KEEP AS IS** |
| **Quota governance** | `CONFIG_QUOTA`, `consume*Quota` | `_Quota` (36) | **KEEP WITH REFACTOR** (3× duplicate quota fns) |
| **Gemini AI gateway** | `callGemini_v291_`, `callGeminiString_v291_` | JD/CV parse volume | **KEEP AS IS** |
| **Consent / compliance** | grep: `_Consent` referenced 2 files | `_Consent` (4,371 rows) | **KEEP — but code largely live-only** |

**Infrastructure is the system's strongest layer and overwhelmingly survives.** Refactor = collapse duplicates (quota ×3, email queues), not rewrite.

---

## DELIVERABLE 5 — FOUNDATION READINESS (audit only)

Every Foundation entity **physically exists as a live tab.** The problem is not absence — it is (a) repo code disagreeing with live schema, and (b) the hierarchy being unpopulated scaffolding while operations run elsewhere.

| Entity | Live tab | Cols | Rows | Repo code | Readiness verdict |
|--------|----------|-----:|-----:|-----------|-------------------|
| **Clients** | `_Clients` | 9 | **1** | `findOrCreateClient_` (v292) | REUSABLE engine, but **1 row = not driving ops** |
| **Projects** | `_Projects` | 9 | **0** | `createProject_`/`findOrCreateProject_` | **BROKEN** — code exists, **0 projects ever created**; "Client" stored as name string (no FK) |
| **Campaigns** | `_Campaigns` | 13 | **1** | `findOrCreateCampaign_` writes **9 cols** | **MISMATCH** — live schema (has `ClientID` FK, `HiringMode`, `InterviewCities`) ≠ repo schema |
| **Requirements** | `_Requirements` | 25 | **97** | `saveRequirementV293_` writes **19 cols** | **MISMATCH + load-bearing** — 97 real reqs; **no Campaign/Project/Client FK columns**; client as name string |
| **Associates** | `_Associates` | 19 | **20** | **NONE** | **ORPHAN** — 20 real associates, rich schema (License, Capacity, Specialization), **zero repo code manages it** |

**Supporting Foundation-adjacent tables (live, mostly empty scaffolding):**
`_Commitments` (associate→req commitments, 0), `_AssociateCapacity` (0), `_AssociateReliability` (CommitmentAccuracy/MobilizationRate, 0), `_CandidateSlots` (57), `_ProjectCandidates` (0), `_Leads` (24-col lead funnel, 2).

**Readiness summary:**
- **Reusable:** Client + Requirement + Associate **schemas** (live, richer than repo) and the v292 find-or-create pattern.
- **Broken:** Projects (0 rows, no FK), Campaign schema drift, Requirement FK-in-Notes, Associate has no code.
- **Missing:** a single agreed schema. The repo and the live sheet are two different schemas for the same entities. **Foundation is not "to be built" — it is "to be reconciled and locked."**

---

## DELIVERABLE 6 — INTELLIGENCE READINESS (audit only)

| Capability | Exists where | Duplicated? | Reuse? | Replace w/ Intelligence 14+? |
|-----------|--------------|-------------|--------|------------------------------|
| **JD parsing** | Repo `v293` (multimodal PDF→Gemini) + live `_JDs`(10), `_JD_Repository`(12) | 3 JD tables live (`_JDs`,`_JD_Repository`,`_Requirements.Raw JD`) | Engine yes | Wrap as one input signal (≈5%) |
| **CV parsing** | Repo `Code.gs`/`index.html` + live `Candidates` (10,072) | `index.html` (browser) vs backend | Backend yes; **kill browser path** | Keep parse, feed Intelligence |
| **Assessment** | `KAI Assessment` col (Candidates 20) + `Score`/`Verdict` | scoring in Code.gs + v285 + index.html | Consolidate | Replace scattered scoring w/ one engine |
| **Matching** | **LIVE `_T13_*` (≈16,000 rows) — NOT in repo**; repo `v285` `get*Score285_` | **YES — repo v285 vs live T13 are two engines** | **T13 is the real one** | **T13 IS the matching intelligence; repo v285 likely superseded** |
| **Shortlisting** | `_CandidateSlots` (57), `_MatchFeedback` (58), repo `shortlistCandidateForReq` | — | Reuse slots | Feed match feedback to learning |
| **Submission** | Live `_Submissions`/`_SubmissionBatches`/`_Pipeline` (**all 0 rows, schema only**) | — | Schema reusable | Build on existing scaffolding |
| **Taxonomy / learning** | LIVE `_Taxonomy` (20-col, 1,037), `Taxonomy` (2,735), `_TaxonomyLearningLog`, `_Taxonomy_Suggestions`, `_KAI_Knowledge` (4) — **none in repo** | — | **This IS Intelligence-in-progress** | Core of 14+ |
| **NL query** | LIVE `_NLQueryLog` (35) — **not in repo** | — | — | Already a 14+ feature live |

**Intelligence headline:** the real intelligence (T13 matching + 20-col governance taxonomy + KAI Knowledge + NL query) **already exists live and is heavily used (≈20,000 rows across T13+Taxonomy), yet none of it is in the repo.** Any "Intelligence 14+" plan that ignores T13 would rebuild what already runs. **T13 must be exported and studied before it is "replaced."**

---

## DELIVERABLE 7 — REBUILD COST MAP

Honest framing: **no scenario can be costed precisely until the live source is exported** (Gating Finding). The estimates below assume that export happens first; effort is relative, not calendar.

| Scenario | What it touches | Risk | Effort | Tech debt removed | SaaS readiness gain |
|----------|-----------------|------|--------|-------------------|---------------------|
| **20% — Reconcile & Consolidate** | Export live source; collapse 74 duplicate fns; archive v284 B / v287 A; lock ONE schema per Foundation entity (reconcile repo 19-col ↔ live 25-col); add Campaign/Project/Client FK columns to `_Requirements`; wire `_Associates` to code | **LOW** | **LOW–MED** | ~40% (kills duplicate spine + FK-in-Notes) | **Medium** — entities become FK-clean |
| **50% — Reconcile + Rebuild Foundation & Wiring** | All of 20% **+** rebuild hierarchy (`v292`/`v294`) to honor Campaign-mandatory; populate Projects; unify 3 JD tables → 1; consolidate scoring (Code.gs+v285+index.html) into one module; move `index.html` Claude calls server-side | **MED** | **MED–HIGH** | ~65% | **High** — operational layer table-clean, 1:1 SQL-mappable |
| **80% — Reconcile + Rebuild + Intelligence Unification** | All of 50% **+** fold T13 + Taxonomy + KAI Knowledge into one **KAI Intelligence** layer; activate the empty Submission/Pipeline/Mobilization scaffolding; retire the V1 dashboard + browser screener | **HIGH** | **HIGH** | ~85% | **Highest** — single backend, single intelligence, replaceable UI |

**Risk note:** the dominant risk in **every** scenario is the same — **acting before the live source is in the repo.** A "demolition" planned against 27% visibility would delete around the T13 engine and the live submission scaffolding without knowing the code that drives them.

---

## SUCCESS CONDITION — WHAT WE NOW KNOW

| Question | Evidence-based answer |
|----------|----------------------|
| **What survives?** | Infrastructure (auth, Drive, Gmail, import, logging, quota, Gemini gateway) — overwhelmingly. Live schemas for Client/Requirement/Associate. The T13 matching engine and governance Taxonomy. |
| **What dies?** | Duplicate twins (`v284 B`, `v287 A`), `*_DEPRECATED_` fns, V1 dashboard, browser-side `index.html` scoring, FK-in-Notes pattern, 19-col requirement save. |
| **What becomes Foundation?** | The five live entities — **reconciled to one schema each**, FK-clean. They exist; they are not built, they are *unified*. |
| **What becomes Intelligence?** | T13 matching + `_Taxonomy` governance + `_KAI_Knowledge` + `_NLQueryLog` + JD/CV parse — folded into one KAI Intelligence layer. |
| **What becomes KAI Flow?** | The already-scaffolded (empty) execution chain: `_SubmissionBatches → _Submissions → _Pipeline → Mobilization`, driven by `_Associates`/`_Commitments`. |
| **Can we choose a rebuild scenario now?** | **No — not honestly.** First export the live Apps Script source and re-run this reconciliation. Then 20/50/80 becomes a real decision instead of a guess against 27% visibility. |

---

## THE ONE NEXT STEP (process, not architecture)

**Export the live Apps Script project source** (all `.gs` + `.html` from the deployed editor) into this repo on the working branch. That single act:
1. Closes the 63% blind spot,
2. Brings T13 + Submissions + Associates + Taxonomy + Consent under version control,
3. Ends the snapshot-archive habit that *is* the patch-generation cycle,
4. Makes Phase 0 truly complete and the rebuild scenario a measured choice.

Until then, this map is the maximum truth the evidence allows — and its loudest signal is: **the repo is a quarter of the building. Bring the rest of the blueprint into the repo before laying a charge.**

---
**END PHASE 0 — evidence only, no code, by directive.**
