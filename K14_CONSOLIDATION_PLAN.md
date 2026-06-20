# K14 CONSOLIDATION PLAN — PHASE 4D
**Phase 5.1 · Patch-era retirement plan · The bridge from patch chain to permanent architecture**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED — awaiting approval before any K14 code
**Depends on:** K14_OWNERSHIP_AUDIT.md (113 functions classified) · KAI_PHASE0_FINAL.md
**Governed by:** K14 Ownership Lock (10-point directive)

> **The destination is not many K14 files. It is ONE K14 Intelligence Core.**
> v280–v294 are temporary evidence sources, not future architecture. After migration
> the repository trends toward exactly five layers — Foundation · K14 · Execution ·
> Infrastructure · UI — and away from patch chains, multiple scorers, multiple matchers,
> multiple rankers, and multiple assessors.
>
> **Success condition: no future architecture depends on any patch file.**
> Patch files become migration evidence only.

---

## 1. THE DESTINATION (locked)

```
BEFORE (patch era)                          AFTER (permanent architecture)
─────────────────────                       ──────────────────────────────
Code.gs.txt (V1)                            Foundation/
KAI_16May2026_V2.txt                          foundation_client_v1.gs        ✓ built
KAI_16May2026_V2_Dashboard.txt                foundation_project_v1.gs       ✓ built
patch_v280 … patch_v294    ───────────►       foundation_campaign_v1.gs      ✓ built
KAI_17May2026_patch_v28x                       foundation_requirement_v1.gs   ✓ built
patch_v29x                                     foundation_associate_v1.gs     ✓ built
index.html (browser engine)                    foundation_candidate_fk_v1.gs  ✓ built
KAI_Login.html                              K14/
                                              k14_core.gs   ◀ ONE intelligence core (future)
16 patch files                              Execution/
74 duplicate function names                   execution_engine_v1.gs         ✓ built (reconcile)
3 parallel scoring engines                  Infrastructure/
2 parallel match engines                      (auth · gemini · email · quota · drive · log)
multiple freshness systems                  UI/
                                              index.html (presentation only)
                                              KAI_Login.html (presentation only)
```

**Rule:** every patch function lands in exactly ONE destination layer. Intelligence
consolidates into the single K14 core. Nothing in the future architecture imports from
a `patch_vNNN` file.

---

## 2. PER-PATCH-FILE CLASSIFICATION

Each file is classified by where its **surviving** content goes. A file may contribute
to multiple layers; the **File Verdict** names its center of gravity. "Superseded"
means a v1 Foundation/Execution file already built in this branch replaces it.

### patch_v280.txt — Import / Upload Engine (39 functions)
| Destination | Functions | Note |
|-------------|-----------|------|
| **Infrastructure** | ensureImportSheets_, generateJobId_, generateItemId_, submitCsvImport, submitExcelImport, submitJdText, submitJdFile, getImportQueue, getImportStats, parseCsv_, parseCsvLine_, detectFieldMap_, estimateRowCount_, convertExcelToDriveData_, storePayloadChunked_, readPayloadChunked_, deletePayloadChunked_, extractTextFromFile_, processImportQueue_, processCsvJob_, updateQueueStatus_, getImportHistory, previewFieldMapping, addImportMenuItems_, openImportSidebar_, openReviewSidebar_ | Upload pipeline, CSV parse, chunked Drive storage, queue mgmt |
| **K14** | validateImportRow_ (INTAKE) · processJdTextJob_ (INTAKE orchestrator) | Import validation + JD intake trigger |
| **Infrastructure.INTEGRITY** | checkImportDuplicate_ | Identity dedup |
| **Foundation** | appendImportedCandidate_, mergeImportedCandidate_, buildSheetRowFromData_ | Candidate persistence — **superseded by `createCandidate()` in foundation_candidate_fk_v1.gs** |
| **Execution** | addToReviewQueue_, getReviewQueue, approveReviewItem, rejectReviewItem, bulkApproveReview | Review-queue actions |
| **Archive** | addToHistory_ (→ Infra log), setupImportEngine | Setup glue |

**FILE VERDICT: INFRASTRUCTURE.** The import engine survives as infrastructure. Intake
validation moves to K14. Candidate persistence is superseded by Foundation.

### KAI_17May2026_patch_v282.gs.txt — Extended Columns / Normalization / Top3 (23)
| Destination | Functions |
|-------------|-----------|
| **K14.INTAKE** | normalizeNationality_, batchNormalizeNationality, getDisplayLocation_, extractIndiaState_, formatAbroadLocation_, classifyEducation_ |
| **K14.REASON** | computeTop3Positions_, batchComputeTop3Positions |
| **Foundation** | ensureExtendedColumnsV2_, setupExtendedColumnsV2 — **superseded by foundation_candidate_fk_v1.gs column provisioning** |
| **Execution** | updateTechnicalReview, updateCandidateStateWithOwner, getRecruiterIdentity |
| **Infrastructure.COMMS** | generateMissingInfoEmail_, generateMissingInfoWhatsApp_, getMissingActionDefs, isInternalEmail_, safeSendEmail_, isInternalDomain_ |
| **Archive** | generateMissingInfoDraft_v282_DEPRECATED_, getDashboardDataV2_v282_DEPRECATED_, clearDashboardCacheV2_v282_DEPRECATED_, setupV282 |

**FILE VERDICT: SPLIT** — intelligence → K14, comms → Infrastructure, 3 DEPRECATED → Archive.

### KAI_17May2026_patch_v283.txt — Passport / Freshness / Deploy-Ready / Replies (26)
| Destination | Functions |
|-------------|-----------|
| **K14.REASON** | getPassportStatus_, getPassportMonthsLeft_, computeDeployReadyV2_, batchUpdateDeployReady |
| **K14.INTAKE** | extractJdEnhanced_ (Archive — superseded by v293), detectUrgency_, detectClientName_, processJdEmailEnhanced_, mapCandidateReplyToProfile_, extractMissingFromReply_ |
| **Infrastructure.AUTH** | isValidSession_, getSessionEmail_, logoutSession, setUserPassword, hashSimple_ |
| **Infrastructure.COMMS** | generateBrandedMissingInfoEmail_, generateBrandedWhatsApp_, generateMissingInfoDraft, formatPassportExpiry_ |
| **Infrastructure** | runBacklogClearance, scheduleBacklogClearance |
| **Archive** | getCvFreshness_ (superseded by V288), getFreshnessUrgency_ (superseded by V288), verifyLoginAndIssueToken_v283_DEPRECATED_, setupLoginSystem_v283_DEPRECATED_, setupV283 |

**FILE VERDICT: SPLIT** — readiness intelligence → K14; freshness here is superseded by V288.

### patch_v284.txt (canonical B) + KAI_17May2026_patch_v284.txt (duplicate A) — JD / Projects / API
**A vs B:** `patch_v284.txt` (B, 36 fns) is canonical — it adds `handleApiRequest_`, `out`,
`getCandidateProfileApi_` (the API surface). `KAI_17May2026_patch_v284.txt` (A, 33 fns,
33 shared) → **ARCHIVE as duplicate.**

| Destination | Functions (from canonical B) |
|-------------|------------------------------|
| **K14.INTAKE** | cleanOcrText_, splitMultipleJds_, normalizeSalaryIntelligent_, resolveLocation_, inferCountryFromLocation_, extractClientFromContext_, normalizeExperienceRange_, extractSingleJdBlock_ (Archive — superseded by v293), extractJdV284_ (Archive), extractJdPublic, extractJdFromPastePublic |
| **K14.CLASSIFY** | detectRoleCategory_, normalizeEducationProfessional_ |
| **K14.REASON** | recomputeAllMetrics, refreshRequirementMatchCounts_, getCandidateProfileApi_ |
| **Foundation** | setupProjectsSheet, listProjects, createProject_, createProjectPublic, mapReqToProject_, mapReqToProjectPublic, saveRequirementV284_, processXlsxRequirements_, detectRequirementColumns_, processXlsxRequirementsPublic — **superseded by foundation_project_v1.gs + foundation_requirement_v1.gs** |
| **Execution** | shortlistCandidateForReq, saveMultiJdBatch |
| **Infrastructure.WEB** | doGet, handleApiRequest_, out |
| **Infrastructure.AUTH** | verifyLoginAndIssueToken, validateSessionToken, isValidToken_, setupLoginSystem |
| **Archive** | setupV284, entire v284-A file (duplicate) |

**FILE VERDICT: SPLIT + DUPLICATE.** v284-A archived. Foundation creation superseded.

### KAI_17May2026_patch_v285.txt — THE MATCH ENGINE (25) ★ K14 CORE
| Destination | Functions |
|-------------|-----------|
| **K14.CLASSIFY** | normalizeTrade285_, tradeTermMatch285_, tokenize, findTradeGroup285_, `TRADE_GROUPS_V285_` constant |
| **K14.REASON** | getTradeScore285_, getDeployReadyScore285_, getExperienceScore285_, getGulfExpScore285_, getNationalityScore285_, getPassportScore285_, **computeMatchScore285_**, **matchCandidatesForReq285_**, matchCandidatesForReqPublic, getTopMatchSummaryPublic, runMatchTaggingForAllReqs |
| **Foundation (read)** | loadRequirementById285_, loadCandidates285_, getRequirementByIdPublic, getOpenRequirementsPublic |
| **K14.INTAKE** | extractJdPublicV2, extractJdFromPastePublicV2 (Archive — superseded by v293) |
| **Archive** | getFreshnessScore285_ (superseded by getFreshnessScoreV288_), setupV285, testMatchEngineV285, testTaxonomyV285 |

**FILE VERDICT: K14 CORE.** This is the single largest and most important K14 source file —
the canonical scoring + matching + taxonomy engine. It is **the seed of `k14_core.gs`.**

### KAI_17May2026_patch_v286.txt — Email Classification / Routing / Identity (25)
| Destination | Functions |
|-------------|-----------|
| **K14.INTAKE** | classifyEmail_, countSignals_, isClientJd_, detectCvSource_, processReply_ (Archive — superseded by v291), extractFieldsFromReply_, applyReplyUpdates_ (Archive — superseded by v291) |
| **Infrastructure.COMMS** | getOrCreateLabel_, applyLabel_, setupKaiLabels_, processIncomingEmails286, routeCvToIntake_, routeJdToQueue_, extractEmail_, checkInternalGuard_ |
| **Infrastructure.INTEGRITY** | detectDuplicate_ |
| **Foundation (lookup)** | findCandidateByKaiNo_, findCandidateByEmail_, findCandidateByPhone_ — **superseded by findCandidateByKaiNo() in foundation_candidate_fk_v1.gs** |
| **K14.MEMORY** | addTimelineEvent_ |
| **Archive** | VERIFY_KAI_LOOKUP, DIAGNOSE_CANDIDATE_IDENTITY, DIAGNOSE_DUPLICATE_KAIS, setupV286, testEmailClassifier |

**FILE VERDICT: SPLIT** — `classifyEmail_` is critical K14.INTAKE; routing/labels → Infrastructure.

### KAI_17May2026_patch_v287.gs.txt (canonical B) + patch_v287.txt (duplicate A) — Quota / Auto-Reply / Digest
**A vs B:** `KAI_17May2026_patch_v287.gs.txt` (B, 30 fns, hardened) is canonical — adds
emergency pause + quarantine. `patch_v287.txt` (A, 26 fns, 26 shared) → **ARCHIVE as duplicate.**

| Destination | Functions (from canonical B) |
|-------------|------------------------------|
| **Infrastructure.QUOTA** | resetQuotaIfNewDay287_, getQuotaStateV287, consumeParserQuota287_, consumeEmailQuota287_, getParserQuotaStatus, resetQuotaV287 |
| **Infrastructure.COMMS** | wasAutoRepliedRecently287_, markAutoReplySent287_, buildAutoReplyEmail287_, processCandidateAutoReply287_, runAutoReplyBatchV287, postParseAutoReply287_, sendAutoReplyForRow287, buildDigestEmail287_, kpiCard, barRow, buildDigestPlain287_, sendDigestToRecruiter287_, sendAllDailyDigests287, sendTestDigest287, setupDigestTriggers287_, setupDailyDigestV287 |
| **Infrastructure.SAFETY** | emergencyPauseAutoReplyV287, isV287Paused_, quarantineSuspectRowsV287, emergencyAutoReplyResponseV287 |
| **K14.OUTCOMES** | getRecruiterDailyStats287_, getPerformanceTier287_ |
| **Archive** | setupV287, testAutoReplyV287, entire v287-A file (duplicate) |

**FILE VERDICT: INFRASTRUCTURE.** v287-A archived. Recruiter performance stats → K14.OUTCOMES.

### KAI_17May2026_patch_v288.txt — Freshness V288 / Top3 Fix / Session (9) ★ canonical freshness
| Destination | Functions |
|-------------|-----------|
| **K14.REASON** | **getCvFreshnessV288_**, **getFreshnessScoreV288_**, **getFreshnessUrgencyV288_** (canonical freshness — supersedes v283 + v285 freshness), fixTop3PositionsV288, refreshTop3ForRow |
| **Infrastructure.AUTH** | getSessionUser |
| **Infrastructure** | clearDashboardCacheV288_, clearDashboardCachePublic |
| **Infrastructure.COMMS** | sendCandidateEmailV288 |

**FILE VERDICT: SPLIT** — owns the canonical freshness classification for K14.REASON.

### KAI_18May2026_patch_v289.txt — Reply Processing (6)
| Destination | Functions |
|-------------|-----------|
| **K14.INTAKE / LEARN** | processActionRequiredRepliesV289_, buildCandidateEmailIndexV289_, applyEmailMatchedReplyV289_ |
| **Infrastructure** | forceProcessRepliesNow |
| **Archive** | empty_, addV289MenuItems_ |

**FILE VERDICT: SPLIT** — reply-matching intelligence → K14; triggers → Infrastructure.

### patch_v291.txt — Gemini Gateway / Pipeline / SaaS / Backfill (55) ★ INFRA BACKBONE
| Destination | Functions |
|-------------|-----------|
| **Infrastructure.GEMINI** | getEffectiveGeminiModel_, validateApiKey_v291_, callGemini_v291_, callGeminiString_v291_, buildGeminiPartsWithFallback_ |
| **Infrastructure.PIPELINE** | runPipeline_v291, processThread_v291_, queuePendingEmail_v291_, flushPendingEmails_v291_, logQuota_v291_, appendLog_v291_, clearCache, queueResendReply_, processThreadWithReply_ |
| **Infrastructure.AUTH** | getSessionUser_v291_ |
| **Infrastructure.SAAS** | resolveTenantSheet_, getTenantBrand_, fixClientRoutingAlYousuf, generateSaasHandoffChecklist, setupV291Triggers_, rollbackV291Triggers_, healthCheckV291 |
| **Infrastructure.BACKFILL** | backfillCVs, resetBackfill, autoBackfillTrigger, stopAutoBackfill, backfillErrorReplies, extractEmailFromSender_ |
| **Infrastructure.COMMS** | sendStatusReport, scheduleStatusReports, sendRecruiterDailyReport, getRecruitersForReport_, buildRecruiterReportHtml_, rptStatCell_, scheduleRecruiterDailyReport |
| **K14.INTAKE** | extractSingleJdBlock_v291_ (Archive — superseded by v293), extractJdV284_v291_ (Archive), extractJdPublicV2Fixed, extractJdFromPastePublicV2Fixed, processReply_v291_, applyReplyUpdates_v291_ |
| **K14.REASON** | computeTop3Positions_ (dup), isAlreadyScored_ |
| **K14.LEARN** | updateCandidateRecord_v291_, handleReEngagement_ |
| **K14.OUTCOMES** | buildIndustrySuggestion_ |
| **Foundation (lookup)** | findCandidateByEmail_v291_, findCandidateByPhone_v291_ — superseded by foundation_candidate_fk_v1.gs |
| **Archive** | setupV291, onOpen_v291_addMenuItems |

**FILE VERDICT: INFRASTRUCTURE BACKBONE.** The Gemini gateway and pipeline are the
operational spine — K14 calls *through* the gateway; it never lives inside K14. The SaaS
skeleton is infrastructure scaffolding. JD-extraction copies here are superseded by v293.

### patch_v292.txt — Find-or-Create Hierarchy (6) ★ SUPERSEDED BY FOUNDATION
| Destination | Functions |
|-------------|-----------|
| **Foundation — SUPERSEDED** | findOrCreateClient_ → `createClient()` (foundation_client_v1.gs) · findOrCreateProject_ → `createProject()` (foundation_project_v1.gs) · findOrCreateCampaign_ → `createCampaign()` (foundation_campaign_v1.gs) · getCampaignById_ → `findCampaignById()` · incrementCampaignReqCount_ → Campaign FoundationStatus logic · bulkCreateRequirementsFromJDs → `createRequirement()` (foundation_requirement_v1.gs) |

**FILE VERDICT: FOUNDATION — ENTIRELY SUPERSEDED.** Every function here is replaced by a
governed `foundation_*_v1.gs` function that enforces the 15 Build Rules (FK immutability,
Campaign-mandatory, no inference). **This is the cleanest "old patch → new patch"
replacement in the repo.** → Archive after migration.

### patch_v293.txt — PDF JD Extraction (8) ★ canonical INTAKE + superseded persistence
| Destination | Functions |
|-------------|-----------|
| **K14.INTAKE** | **extractJdFromPdfInline_v293_** (canonical PDF multimodal extractor), **extractSingleJdBlock_v293_** (canonical text fallback), extractJdV284_v293_, extractJdPublicV293Fixed, saveAndReturnJds_v293_, extractJdFromPastePublicV293Fixed |
| **Foundation — SUPERSEDED** | saveRequirementV293_ → `createRequirement()` · bulkCreateRequirementsFromJDsV293 → `createRequirement()` batch |

**FILE VERDICT: SPLIT.** JD extraction is canonical K14.INTAKE; persistence superseded by Foundation.

### patch_v294.txt — Client Hierarchy Creation (2) ★ SUPERSEDED BY FOUNDATION
| Destination | Functions |
|-------------|-----------|
| **Foundation — SUPERSEDED** | createClientHierarchyAndMapReq_, createClientHierarchyAndMapReqPublic → replaced by the Foundation migration chain (Client→Project→Campaign→Requirement) in FOUNDATION_IMPLEMENTATION_MASTERPLAN.md |

**FILE VERDICT: FOUNDATION — ENTIRELY SUPERSEDED.** → Archive after migration.

### patch_v293_test.gs.txt — Test Runner (3) → **ARCHIVE** (test-only, no production path)

---

## 3. CONSOLIDATION SUMMARY — WHAT SURVIVES, WHERE

| Patch file | Lines | Center of gravity | Survives into | Superseded by new file? |
|------------|------:|-------------------|---------------|-------------------------|
| patch_v280 | 1045 | Import engine | **Infrastructure** | Candidate persist → Foundation |
| patch_v282 | 803 | Normalization + Top3 | **K14 + Infra** | Columns → Foundation; 3 DEPRECATED → Archive |
| patch_v283 | 819 | Passport/deploy/replies | **K14 + Infra** | Freshness → Archive (V288) |
| patch_v284 (B) | 1866 | JD + Projects + API | **K14 + Infra + Foundation** | Project/Req create → Foundation |
| patch_v284 (A) | 1698 | duplicate of B | **Archive** | 33 shared fns; v284-B canonical |
| patch_v285 | 1631 | **MATCH ENGINE** | **K14 CORE ★** | — (this is the K14 seed) |
| patch_v286 | 1159 | Email classify/route | **K14 + Infra** | Lookup → Foundation |
| patch_v287 (B) | 1354 | Quota/auto-reply/digest | **Infrastructure** | Stats → K14.OUTCOMES |
| patch_v287 (A) | 1170 | duplicate of B | **Archive** | 26 shared fns; v287-B canonical |
| patch_v288 | 454 | **Freshness V288** | **K14 ★** (canonical freshness) | — |
| patch_v289 | 340 | Reply processing | **K14 + Infra** | — |
| patch_v291 | 2056 | **Gemini gateway/pipeline** | **Infrastructure BACKBONE ★** | JD extract → v293; lookup → Foundation |
| patch_v292 | 429 | Find-or-create hierarchy | **Foundation (SUPERSEDED)** | **ALL → foundation_*_v1.gs** |
| patch_v293 | 603 | **PDF JD extraction** | **K14.INTAKE ★** | Persist → Foundation |
| patch_v294 | 141 | Client hierarchy | **Foundation (SUPERSEDED)** | **ALL → foundation_*_v1.gs + masterplan** |
| patch_v293_test | 166 | Test runner | **Archive** | — |

### The three pillars that seed the permanent architecture
1. **K14 core** ← `patch_v285` (scoring/matching/taxonomy) + `patch_v288` (freshness) +
   `patch_v293` (JD intake) + `patch_v286` (email classify) + scattered REASON functions
   from v282/v283/v284. **All collapse into one `k14_core.gs`.**
2. **Infrastructure** ← `patch_v291` (Gemini gateway + pipeline + SaaS), `patch_v280`
   (import), `patch_v287` (quota/auto-reply/digest), plus auth/email/log helpers.
3. **Foundation** ← already rebuilt as `foundation_*_v1.gs`; **fully supersedes** the
   find-or-create logic in v292, v294, and the persistence halves of v284/v293.

---

## 4. THE PATCH-RETIREMENT REPLACEMENT MAP

This is the explicit "replace old patches with new patches" instrument. Each row is a
retirement: old patch logic → permanent owner.

| Old (patch era) | New (permanent) | Status |
|-----------------|-----------------|--------|
| `findOrCreateClient_` (v292) | `createClient()` foundation_client_v1.gs | ✓ new file built |
| `findOrCreateProject_` (v292), `createProject_` (v284) | `createProject()` foundation_project_v1.gs | ✓ new file built |
| `findOrCreateCampaign_` (v292) | `createCampaign()` foundation_campaign_v1.gs | ✓ new file built |
| `saveRequirementV284_/V293_`, `bulkCreateRequirementsFromJDs(V293)` (v284/292/293) | `createRequirement()` foundation_requirement_v1.gs | ✓ new file built |
| `createClientHierarchyAndMapReq_` (v294) | Foundation migration chain (masterplan) | ✓ planned |
| `appendImportedCandidate_/mergeImportedCandidate_` (v280) | `createCandidate()` foundation_candidate_fk_v1.gs | ✓ new file built |
| `findCandidateByKaiNo_/Email_/Phone_` (v286/v291) | `findCandidateByKaiNo()` foundation_candidate_fk_v1.gs | ✓ new file built |
| `computeMatchScore285_` + 7 sub-scores (v285) | `k14_core.gs` REASON | ◀ next phase |
| `findTradeGroup285_` + taxonomy (v285) | `k14_core.gs` CLASSIFY | ◀ next phase |
| `getCvFreshnessV288_` + freshness (v288) | `k14_core.gs` REASON | ◀ next phase |
| `extractJdFromPdfInline_v293_` (v293) | `k14_core.gs` INTAKE | ◀ next phase |
| `classifyEmail_` (v286) | `k14_core.gs` INTAKE | ◀ next phase |
| `scoreCandidate_` (Code.gs), `contextScore_` (V2) | **Archive** — superseded by v285 in k14_core | ◀ next phase |
| `captureOutcome` derivation (execution_engine) | `k14_core.gs` OUTCOMES (raw facts stay in Execution) | per EXECUTION_RECONCILIATION.md |
| `callGemini_v291_` gateway (v291) | Infrastructure — K14 calls *through* it | survives as infra |

**Foundation half of the retirement is already done** — the six `foundation_*_v1.gs`
files are the "new patches" that replace v292/v294 and the persistence logic of
v280/v284/v293. **The K14 half is the next phase: one `k14_core.gs` replacing the
intelligence scattered across v282–v293.**

---

## 5. SUCCESS CONDITION VERIFICATION

| Condition | Status | Evidence |
|-----------|--------|----------|
| No future architecture depends on patch files | ✓ ACHIEVABLE | Every patch function mapped to Foundation/K14/Execution/Infrastructure/Archive; future files import from those layers, never from `patch_vNNN` |
| Patch files become migration evidence only | ✓ BY DESIGN | After K14 core is built, patches are read-once sources; no runtime path enters them |
| K14 becomes the permanent owner of intelligence | ✓ MAPPED | 113 intelligence functions (K14_OWNERSHIP_AUDIT.md) converge on one `k14_core.gs` |
| GitHub remains the only source of executable logic | ✓ HELD | All logic lives in `.gs` files in this repo; index.html browser engine is slated for extraction (K14 Ownership Lock) |
| Lovable remains presentation only | ⚠ PENDING | index.html still holds the browser engine; retired when k14_core absorbs A10/JD15/JD16 |
| One scorer / matcher / ranker / assessor | ✓ MAPPED | Canonical: computeMatchScore285_ (scorer), matchCandidatesForReq285_ (matcher), freshness-sort (ranker), k14_core REASON (assessor). All v1/V2 duplicates → Archive |
| No A/B duplicate files in runtime | ✓ RESOLVED | v284-A and v287-A both archived; v284-B and v287-B canonical |

**Patch-era retirement is fully planned. No patch file is future architecture.**

---

## 6. EXECUTION ORDER (after this plan is approved — no code yet)

```
Phase A  Foundation migration (6 foundation_*_v1.gs)   ── retires v292, v294, persistence of v280/v284/v293
Phase B  Execution remediation (execution_engine_v1)   ── per EXECUTION_RECONCILIATION.md
Phase C  Build k14_core.gs (ONE file)                   ── absorbs v285 + v288 + v293 + v286 + REASON fragments
Phase D  Reduce index.html + dashboard to presentation  ── per K14 Ownership Lock
Phase E  Mark patch_v280–v294 as evidence/ (no runtime import)
```

After Phase E: the repository is Foundation · K14 · Execution · Infrastructure · UI.
The patch era is retired.

---

## FREEZE DECLARATION

```
Step 1–6  Foundation entity freezes               ✓ approved
Step 7    EXECUTION_CONSTITUTION.md                ✓ approved
Step 8    EXECUTION_RECONCILIATION.md              ✓ committed (awaiting code fix)
Step 9    K14_OWNERSHIP_AUDIT.md                   ✓ committed (awaiting approval)
Step 10   K14_CONSOLIDATION_PLAN.md                ◀ this document (awaiting approval)
```

On approval: K14 implementation may begin — as **ONE** `k14_core.gs`, not a new patch chain.

**No code changes. No extraction. No k14_core.gs yet. No refactor. No migration.**
This document is a planning instrument only.

```
ROLLBACK: delete K14_CONSOLIDATION_PLAN.md (governance document only;
no schema, no data, no code touched).
```
