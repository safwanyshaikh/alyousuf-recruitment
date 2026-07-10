# KAI OS — PHASE 0 FINAL REPORT (Evidence & Classification only)

**Single source of truth:** safwanyshaikh/alyousuf-recruitment. No Lovable. No old
`kai`. No assumed source outside the repo. Evidence = repo (measured) + the live
spreadsheet schema (`Gmail_CV_Candidates`, 64 tabs).
**Locked architecture:** Foundation → K14 → Execution → Outcomes → Memory → Learning.
**Status:** APPROVED 2026-06-19. No business decision may exist outside K14.

---

## 1. SOURCE RECOVERY REPORT

Repo measured: **25 code files · 705 function definitions · 34 live entry points.**
Live spreadsheet: **64 tabs (44 with data, 20 empty scaffold).** Repo references only
**17 of 64 tabs (27%).**

### A. PRESENT IN GITHUB
24 code files + taxonomy data. 17 tabs with code: _PendingEmails, _Campaigns,
_Clients, _Projects, _LoginSystem, _ImportQueue, _ReviewQueue, _ImportHistory,
_Requirements, _Timeline, _ClientSubs, _Quota, _JDs, _ClientRouting, _Config,
_Consent, _Rules.

### B. MISSING FROM GITHUB (no source — priority recovery targets)
| Priority target | Live evidence (data) | Source |
|-----------------|----------------------|--------|
| 1. T13 Matching Engine | _T13_FalseNegative(14,249), _T13_GovernanceQueue(1,594), _T13_FalsePositive(262), _T13_ValidationSet(100), _T13_CompareReport(30), _T13_FamilyAudit(21), _T13_DualTrade(0) | **MISSING** |
| 2. Submission Engine | _Submissions, _SubmissionBatches, _SubmissionBatchItems, _SubmissionPackages, _CandidateSubmissionHistory, _ClientResponseLog, _Pipeline (0 rows) | **MISSING** |
| 3. Mobilization Engine | _Commitments, _AssociateCapacity, _AssociateReliability, _ProjectCandidates, _CandidateSlots(57) | **MISSING** |
| 4. Taxonomy Engine | _Taxonomy(1,037×20), Taxonomy(2,735), _TaxonomyLearningLog, _Taxonomy_Suggestions | **MISSING** |
| 5. Memory/Outcome sources | _KAI_Knowledge(4), _MatchFeedback(58), _NLQueryLog(35), Archive(1,229), Rejected(172) | **MISSING code** |
| 6. Hidden helper libraries | no evidence in repo | **UNKNOWN** |
| 7. Trigger files | partial in Code.gs/patches | PARTIAL |
| 8. Utility files | scattered in patches | PARTIAL |

Plus 23 more tabs with no repo code (Leads, DocRequestQueue, ProcessingQueue,
RecontactLog, Associates, MatchFeedback, etc.).

### C. DUPLICATE
- v284 A (patch_v284.txt, canonical, has API) vs B (KAI_17May2026_patch_v284.txt) — **33 shared functions**.
- v287 A (patch_v287.txt, baseline) vs B (KAI_17May2026_patch_v287.gs.txt, hardened) — **26 shared functions**.
- **74 function names** defined in >1 file.

### D. DEAD
V1 dashboard, 28th April 1356 hrs.txt (dup getDashboardData), patch_v293_test.gs.txt,
*_DEPRECATED_ functions, patch_v287.txt baseline, v1 scoring in Code.gs.

### E. UNKNOWN
Helper/util libraries, webhook handlers, and the source behind the 40 missing tabs.
Under single-source-of-truth: unrecoverable from repo, treated as not-existing until
authored. Not assumed to live elsewhere.

---

## 2. DEPENDENCY ATLAS (exact totals)

| Metric | Count |
|--------|------:|
| Code files | 25 |
| Function definitions | 705 |
| Live entry points | 34 |
| Duplicated names | 74 |
| v284 A/B shared | 33 |
| v287 A/B shared | 26 |
| Largest file (V2 dashboard) | 4,718 lines / 129 backend calls |

**Status (repo):** LIVE ~180–220 · DUPLICATE 74 names (~130 defs) · DEAD ~100 ·
UNKNOWN hundreds (live engines absent from repo). 705 = repo population only;
whole-system split cannot close while 40 tabs have no source.

---

## 3. K14 MODULE MAP

**Core rule:** K14 does not score — it evaluates evidence. Score/Match/Rank/Assess/
Shortlist/Readiness are OUTPUTS of K14.REASON, not modules.

| Decision logic | Functions (file) | K14 module |
|----------------|------------------|------------|
| JD Parsing | extractJd*(v293/284/291), splitMultipleJds_, routeJdToQueue_ | K14.INTAKE |
| CV Parsing | scoreAttachment_, normalize* | K14.INTAKE |
| Trade Detection | normalizeTrade285_, v283 patterns, mapCandidateToTaxonomy_, tradeFamilies | K14.CLASSIFY |
| Patterns/history | _KAI_Knowledge, _MatchFeedback, corrections (MISSING) | K14.MEMORY |
| Assessment | KAI Assessment, buildCandidateObj_ | K14.REASON → output |
| Scoring | scoreCandidate_×2, get*Score285_, deployability, contextScore_, index.html weights | K14.REASON → output |
| Matching | matchCandidates*, computeMatchScore285_, runMatch*; T13 (MISSING) | K14.REASON → output |
| Ranking | computeTop3Positions_ ×2 | K14.REASON → output |
| Shortlisting | shortlist*, approve/rejectReviewItem, deriveCandidateState_ | K14.REASON → output |
| Submission Validation | _Submissions/_Pipeline (MISSING) | K14.VALIDATE |
| Mobilization Validation | OFFER→VISA→MEDICAL→DEPLOY, _Commitments/_AssocReliability (MISSING) | K14.VALIDATE |
| Outcome capture | _ClientResponseLog, Rejected, Archive, MobRate | K14.OUTCOMES |
| Learning | MEMORY+OUTCOMES+corrections | K14.LEARN |

**K14 modules (locked):** INTAKE · CLASSIFY · MEMORY · REASON · VALIDATE · OUTCOMES · LEARN.
**REASON outputs (one pass):** Assessment, Match, Rank, Shortlist, Submission Readiness,
Mobilization Readiness, Risk Alerts, Missing Data Alerts.
**T13 = frozen benchmark + evidence (its sheet output), NOT a target.**

---

## 4. INFRASTRUCTURE SURVIVAL MAP (no decisions here)

| System | Evidence | Verdict |
|--------|----------|---------|
| Authentication / session | _LoginSystem(6) | KEEP AS IS |
| Drive | saveCvToDrive_, _ManualUpload(65) | KEEP AS IS |
| Email | v286/v289, _PendingEmails(5,688), _RecontactLog(7,471) | KEEP w/ REFACTOR |
| Triggers | runPipeline, _ProcessingQueue(3,754), _Quota(36) | KEEP w/ REFACTOR |
| Logging | Logs(14,329), _Errors(4,022), _ActivityLog(714) | KEEP AS IS |
| Quota | CONFIG_QUOTA (×3 dup) | KEEP w/ REFACTOR |
| User management | setUserRole, _LoginSystem | KEEP AS IS |
| File upload | v280, _ImportQueue(7) | KEEP AS IS |
| Consent | _Consent(4,371) | KEEP AS IS |
| Monitoring | _Errors writer | KEEP AS IS |
| Gemini gateway | callGemini_v291_ | KEEP AS IS |
| Sheets helpers | getMasterSS_, ensureSheet_ | KEEP AS IS |

No infrastructure is REBUILD.

---

## 5. FOUNDATION READINESS REPORT

| Entity | Tab | Cols | Rows | Verdict |
|--------|-----|-----:|-----:|---------|
| Client | _Clients | 9 | 1 | REUSABLE engine; not driving ops |
| Project | _Projects | 9 | 0 | BROKEN — 0 ever created; no FK |
| Campaign | _Campaigns | 13 | 1 | MISMATCH — live 13 vs repo 9; has ClientID FK |
| Requirement | _Requirements | 25 | 97 | MISMATCH + load-bearing — repo writes 19; no Campaign/Project/Client FK cols |
| Associate | _Associates | 19 | 20 | ORPHAN — 20 real, zero repo code |
| Candidate | Candidates | 48 | 10,072 | DRIFT — repo knows 38; live has Source Associate/Lead/Campaign cols |

**Foundation is not "to build" — it is "to reconcile and lock."**

---

## SUCCESS CONDITION — WHAT WE KNOW

| Question | Answer |
|----------|--------|
| What survives? | all infrastructure |
| What becomes K14? | all decision logic (7 modules) |
| What becomes Foundation? | 6 live entities, reconciled to one schema each |
| What becomes Execution? | scaffolded Submission/Pipeline/Mobilization tables |
| What is archived? | v284 B, v287 A, V1 dashboard, dead snippets, *_DEPRECATED_, browser scoring, 74 duplicate defs |

**Critical constraint finding:** Under "GitHub = single source of truth," the T13 /
Submission / Mobilization / Taxonomy engines are MISSING SOURCE. Their sheet OUTPUT
(~16,000 T13 rows etc.) survives as frozen benchmark for K14.REASON — but the logic
must be authored fresh inside K14, not recovered.

---

## ═══════════════════════════════════════════════════════════════
## K14 GOVERNANCE LOCK (permanent)
## ═══════════════════════════════════════════════════════════════

The 10,072 candidate records, recruiter corrections, assessments, trade mappings,
requirement history, campaign history, submission history, mobilization history,
rejection history, archive history, and future execution outcomes are strategic assets.

**These assets are DATA.**
- They are not architecture.
- They are not code.
- They are not engines.
- They are not modules.

**K14 may:** learn from them · benchmark against them · validate against them ·
reason over them.
**K14 may never:** inherit their architecture.

No legacy engine, scoring model, matching model, ranking model, assessment model,
taxonomy model, workflow model, or patch chain is **automatically promoted** into K14.

**Every legacy system is evidence only.**

K14 is authored from first principles using:
```
Foundation Truth + Evidence + Outcomes + Reasoning
```
— not from legacy implementation.

---

## PHASE ORDER (LOCKED)
```
PHASE 0  Reality Map               ✓ COMPLETE (this document)
PHASE 1  Foundation Constitution
PHASE 2  K14 Constitution
PHASE 3  Execution Constitution
PHASE 4  Technical Architecture
PHASE 5  Implementation
```
No phase skipping. No parallel implementation. No coding before constitutions are locked.

**END PHASE 0.**
