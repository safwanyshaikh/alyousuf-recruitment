RUNTIME OWNERSHIP AUDIT
KAI GCC Recruitment OS — Branch: claude/sweet-franklin-mnmfcz
Date: 2026-06-20
Method: Static analysis of compiled .gs files only. .txt files are evidence archives; they are NOT compiled by Google Apps Script and have ZERO runtime presence.

---

ARCHITECTURE REFERENCE

Foundation  ->  K14  ->  Execution  ->  UI
Truth       ->  Intelligence  ->  Action  ->  Presentation

Infrastructure supplies services (Gemini, Email, Auth, Quota, Logging) to all layers.

---

SECTION 1: ACTIVE COMPILED FILES

These 9 .gs files are the only code that Google Apps Script compiles and runs.

File                           Layer            Purpose
infrastructure_gemini.gs       Infrastructure   Gemini gateway (canonical owner)
k14_core.gs                    K14              ALL recruitment intelligence (single owner)
execution_engine_v1.gs         Execution        Pipeline state transitions + workflow actions
foundation_candidate_fk_v1.gs  Foundation       Candidate entity truth
foundation_requirement_v1.gs   Foundation       Requirement entity truth
foundation_client_v1.gs        Foundation       Client entity truth
foundation_project_v1.gs       Foundation       Project entity truth
foundation_campaign_v1.gs      Foundation       Campaign entity truth
foundation_associate_v1.gs     Foundation       Associate entity truth

Two HTML files are served but contain no GAS backend logic:
index.html        (UI — see Section 5 for violations)
KAI_Login.html    (UI — login form only)

---

SECTION 2: ALL PUBLIC ENTRY POINTS

Public = function name with no trailing underscore; callable from dashboards, triggers, or google.script.run.

K14 INTELLIGENCE LAYER — k14_core.gs

Function                              Owner         Layer   Description
getOpenRequirementsPublic()           k14_core.gs   K14     All open requirements (read-only)
matchCandidatesForReqPublic()         k14_core.gs   K14     Primary match API; calls K14.REASON
getTopMatchSummaryPublic()            k14_core.gs   K14     Top-3 match preview per requirement
getRequirementByIdPublic()            k14_core.gs   K14     Single requirement detail

K14 NAMESPACE FACADE — k14_core.gs (all resolve to K14-owned functions above)

K14.tradeScore()                      k14_core.gs   K14     -> getTradeScore285_
K14.tradeGroup()                      k14_core.gs   K14     -> findTradeGroup285_
K14.classifyEmail()                   k14_core.gs   K14     -> classifyEmail_
K14.scoreCandidate()                  k14_core.gs   K14     -> computeMatchScore285_
K14.matchRequirement()                k14_core.gs   K14     -> matchCandidatesForReqPublic
K14.topMatches()                      k14_core.gs   K14     -> getTopMatchSummaryPublic
K14.freshnessLabel()                  k14_core.gs   K14     -> getCvFreshnessV288_
K14.freshnessUrgency()                k14_core.gs   K14     -> getFreshnessUrgencyV288_
K14.extractJdFromPdf()                k14_core.gs   K14     -> extractJdFromPdfInline_v293_
K14.openRequirements()                k14_core.gs   K14     -> getOpenRequirementsPublic
K14.requirement()                     k14_core.gs   K14     -> getRequirementByIdPublic

EXECUTION LAYER — execution_engine_v1.gs

Function                              Owner                  Layer      Description
addProjectCandidate()                 execution_engine_v1.gs Execution  Add candidate to requirement (Match entity)
shortlistProjectCandidate()           execution_engine_v1.gs Execution  MATCHED -> SHORTLISTED
createSubmissionBatch()               execution_engine_v1.gs Execution  Open a submission batch
addCandidateToBatch()                 execution_engine_v1.gs Execution  Add ProjectCandidate to batch
generateSubmissionPackage()           execution_engine_v1.gs Execution  Build client deliverable
submitBatch()                         execution_engine_v1.gs Execution  Submit batch; open _SelectionPipeline records
advancePipeline()                     execution_engine_v1.gs Execution  Selection state transitions (SUBMITTED->OFFER->SELECTED)
advanceMobilizationGate()             execution_engine_v1.gs Execution  Mob gate progression (DOCUMENTATION->DEPLOYED)
captureOutcome()                      execution_engine_v1.gs Execution  Write raw fact to _ExecutionOutcomes
runExecutionUAT()                     execution_engine_v1.gs Execution  End-to-end chain test

FOUNDATION LAYER

Function                              Owner                       Layer       Description
migrateClientFoundation()             foundation_client_v1.gs     Foundation  One-time client schema migration
createClient()                        foundation_client_v1.gs     Foundation  New client record with FK
findClientById()                      foundation_client_v1.gs     Foundation  Read client by ID
findClientByCode()                    foundation_client_v1.gs     Foundation  Read client by code
findClientByName()                    foundation_client_v1.gs     Foundation  Read client by name
verifyClientAcceptance()              foundation_client_v1.gs     Foundation  Post-migration acceptance test
rollbackClientMigration()             foundation_client_v1.gs     Foundation  Rollback (non-destructive)

migrateProjectFoundation()            foundation_project_v1.gs    Foundation  One-time project schema migration
createProject()                       foundation_project_v1.gs    Foundation  New project with FK to client
findProjectById()                     foundation_project_v1.gs    Foundation  Read project by ID
verifyProjectAcceptance()             foundation_project_v1.gs    Foundation  Post-migration acceptance test
rollbackProjectMigration()            foundation_project_v1.gs    Foundation  Rollback

migrateCampaignFoundation()           foundation_campaign_v1.gs   Foundation  One-time campaign schema migration
createCampaign()                      foundation_campaign_v1.gs   Foundation  New campaign with FK to project
findCampaignById()                    foundation_campaign_v1.gs   Foundation  Read campaign by ID
findCampaignsByProject()              foundation_campaign_v1.gs   Foundation  All campaigns under a project
verifyCampaignAcceptance()            foundation_campaign_v1.gs   Foundation  Post-migration acceptance test
rollbackCampaignMigration()           foundation_campaign_v1.gs   Foundation  Rollback

migrateRequirementFoundation()        foundation_requirement_v1.gs Foundation  One-time requirement schema migration
dryRunRequirementMigration()          foundation_requirement_v1.gs Foundation  Safe preview of migration
createRequirement()                   foundation_requirement_v1.gs Foundation  New requirement (Campaign-mandatory, Rule 13)
findRequirementById()                 foundation_requirement_v1.gs Foundation  Read requirement by ID
verifyRequirementAcceptance()         foundation_requirement_v1.gs Foundation  Post-migration acceptance test
rollbackRequirementMigration()        foundation_requirement_v1.gs Foundation  Rollback

migrateAssociateFoundation()          foundation_associate_v1.gs  Foundation  One-time associate schema migration
createAssociate()                     foundation_associate_v1.gs  Foundation  New associate (identity only, Rule 14)
findAssociateById()                   foundation_associate_v1.gs  Foundation  Read associate by ID
findAssociateByContact()              foundation_associate_v1.gs  Foundation  Read associate by email/company
verifyAssociateAcceptance()           foundation_associate_v1.gs  Foundation  Post-migration acceptance test
rollbackAssociateMigration()          foundation_associate_v1.gs  Foundation  Rollback

migrateCandidateFoundation()          foundation_candidate_fk_v1.gs Foundation One-time candidate FK migration (500-row batch)
dryRunCandidateMigration()            foundation_candidate_fk_v1.gs Foundation Safe preview
createCandidate()                     foundation_candidate_fk_v1.gs Foundation New candidate with 18-state FoundationState
findCandidateByKaiNo()                foundation_candidate_fk_v1.gs Foundation Read candidate by KAI No
updateCandidateFoundationState()      foundation_candidate_fk_v1.gs Foundation State write (guarded, append-only audit)
verifyCandidateAcceptance()           foundation_candidate_fk_v1.gs Foundation Post-migration acceptance test
rollbackCandidateMigration()          foundation_candidate_fk_v1.gs Foundation Rollback

INFRASTRUCTURE LAYER — infrastructure_gemini.gs

All functions in this file are internal services (trailing underscore). No public entry point.
kaiGeminiGenerate_()    — canonical Gemini gateway. Called by k14Gemini_ seam in k14_core.gs.
callGemini_v291_()      — backward-compat alias to kaiGeminiGenerate_. DEFINED here; not from patch.
callGeminiString_v291_() — string->parts wrapper. DEFINED here; not from patch.
validateApiKey_v291_()  — API key validator. DEFINED here; not from patch.
getEffectiveGeminiModel_() — model resolver.
buildGeminiPartsWithFallback_() — large-attachment fallback parts builder.

TRIGGERS (no trigger functions found in any .gs file)
No onOpen, onEdit, doGet, doPost, runPipeline, or ScriptApp.newTrigger calls exist in the 9 active .gs files. Trigger functions (runPipeline_v291, processThread_v291_, etc.) remain in patch_v291.txt — which is a .txt file and is NOT compiled. Triggers are therefore currently unregistered in the new architecture. This is an Infrastructure task pending.

TOTAL PUBLIC ENTRY POINTS: 51
  K14:          4 public + 11 K14.* namespace aliases
  Execution:    10 public
  Foundation:   31 public (6 entities x migrate/create/find/verify/rollback)
  Infrastructure: 0 public

---

SECTION 3: INTELLIGENCE FUNCTION OWNERSHIP

Mandate: ALL intelligence must be defined in k14_core.gs and nowhere else.

Function                        Defined In      Owner   Verified
findTradeGroup285_()            k14_core.gs     K14     K1.F03
getTradeScore285_()             k14_core.gs     K14     K1.F04
normalizeTrade285_()            k14_core.gs     K14     K1.F01
tradeTermMatch285_()            k14_core.gs     K14     K1.F02
classifyEmail_()                k14_core.gs     K14     K2.F01
countSignals_()                 k14_core.gs     K14     K2.F02
getFreshnessScore285_()         k14_core.gs     K14     K3.F01
getCvFreshnessV288_()           k14_core.gs     K14     K3.F02
getFreshnessScoreV288_()        k14_core.gs     K14     K3.F03
getFreshnessUrgencyV288_()      k14_core.gs     K14     K3.F04
getDeployReadyScore285_()       k14_core.gs     K14     K4.F01
getExperienceScore285_()        k14_core.gs     K14     K4.F02
getGulfExpScore285_()           k14_core.gs     K14     K4.F03
getNationalityScore285_()       k14_core.gs     K14     K4.F04
getPassportScore285_()          k14_core.gs     K14     K4.F05
computeMatchScore285_()         k14_core.gs     K14     K4.F06
matchCandidatesForReq285_()     k14_core.gs     K14     K5.F01
extractJdFromPdfInline_v293_()  k14_core.gs     K14     K6.F01

Search result from all .gs files for these function names:
RESULT: Every function above appears ONLY in k14_core.gs. No other .gs file defines any of them.

INTELLIGENCE OWNERSHIP: CLEAN. Zero violations in compiled .gs files.

---

SECTION 4: PATCH FILE DEPENDENCY STATUS (v280-v294)

A patch file has a live runtime dependency ONLY IF a function defined solely in that .txt file is called by a compiled .gs file. Determination method: grep all .gs files for every function unique to each patch.

patch_v280.txt  — submitCsvImport, submitExcelImport, generateJobId_, ensureImportSheets_
  Called by any .gs file? NO
  Status: DEAD (evidence only)

patch_v281      — not found in repository
  Status: NOT IN REPO

patch_v282.txt  — updateCandidateState, updateCandidateStateWithOwner, isInternalDomain_, normalizeNationality_
  Called by any .gs file? NO
  Status: DEAD (evidence only)

patch_v283.txt  — getCvFreshness_, getFreshnessUrgency_, extractJdEnhanced_, clientFreshness_
  Called by any .gs file? NO
  Status: DEAD (evidence only — superseded by k14_core K3 + K6)

patch_v284.txt  — extractJdV284_, extractJdPublic, extractJdFromPastePublic, cleanOcrText_, splitMultipleJds_
  Called by any .gs file? NO
  Status: DEAD (evidence only — superseded by k14_core K6.F01)

KAI_17May2026_patch_v284.txt  — same function set as patch_v284.txt (A/B duplicate)
  Called by any .gs file? NO
  Status: DEAD (evidence only — v284 B duplicate)

patch_v285.txt  — findTradeGroup285_, getTradeScore285_, computeMatchScore285_, matchCandidatesForReq285_, getFreshnessScore285_, matchCandidatesForReqPublic, getTopMatchSummaryPublic, getRequirementByIdPublic, getOpenRequirementsPublic
  Called by any .gs file? NO — these names are now defined in k14_core.gs (migrated K1/K3/K4/K5/K8)
  Status: DEAD (evidence only — all logic migrated into k14_core.gs)
  NOTE: The public function names (matchCandidatesForReqPublic etc.) are retained in k14_core.gs so existing dashboard calls resolve to k14_core.gs, not to patch_v285.txt.

patch_v286.txt  — classifyEmail_, countSignals_
  Called by any .gs file? NO — defined in k14_core.gs K2
  Status: DEAD (evidence only — migrated into k14_core.gs)

patch_v287.txt  — resetQuotaIfNewDay287_, getQuotaStateV287, consumeParserQuota287_
  Called by any .gs file? NO
  Status: DEAD (evidence only)

KAI_17May2026_patch_v287.gs.txt — same quota/auth functions (A/B duplicate, hardened version)
  Called by any .gs file? NO
  Status: DEAD (evidence only)

patch_v288.txt  — getCvFreshnessV288_, getFreshnessScoreV288_, getFreshnessUrgencyV288_
  Called by any .gs file? NO — defined in k14_core.gs K3
  Status: DEAD (evidence only — migrated into k14_core.gs)

KAI_18May2026_patch_v289.txt  — (email/quota functions)
  Called by any .gs file? NO
  Status: DEAD (evidence only)

patch_v291.txt  — callGemini_v291_, callGeminiString_v291_, validateApiKey_v291_, buildGeminiPartsWithFallback_, runPipeline_v291, processThread_v291_, etc.
  Called by any .gs file? NO
  IMPORTANT CLARIFICATION: infrastructure_gemini.gs DEFINES its own callGemini_v291_, validateApiKey_v291_, callGeminiString_v291_, and buildGeminiPartsWithFallback_ with those names — it does NOT call them from patch_v291.txt. The .txt file is not compiled. The definitions in infrastructure_gemini.gs are the live versions; patch_v291.txt versions are unreachable dead text.
  Status: DEAD (evidence only — gateway functions extracted into infrastructure_gemini.gs)

patch_v292.txt  — findOrCreateClient_, findOrCreateProject_, findOrCreateCampaign_
  Called by any .gs file? NO — superseded by Foundation entity files
  Status: DEAD (evidence only)

patch_v293.txt  — extractJdFromPdfInline_v293_, extractSingleJdBlock_v293_, extractJdPublicV293Fixed
  Called by any .gs file? NO
  IMPORTANT CLARIFICATION: k14_core.gs defines extractJdFromPdfInline_v293_ at K6.F01 — its own migrated implementation. It does NOT call patch_v293.txt. The .txt file is not compiled.
  Status: DEAD (evidence only — extracted into k14_core.gs K6)

patch_v293_test.gs.txt  — test runner
  Called by any .gs file? NO
  Status: DEAD (test artifact)

patch_v294.txt  — createClientHierarchyAndMapReq_, createClientHierarchyAndMapReqPublic
  Called by any .gs file? NO — superseded by Foundation entity files
  Status: DEAD (evidence only)

PATCH DEPENDENCY SUMMARY:
  v280: DEAD
  v281: NOT IN REPO
  v282: DEAD
  v283: DEAD
  v284 (A+B): DEAD
  v285: DEAD (migrated into k14_core.gs)
  v286: DEAD (migrated into k14_core.gs)
  v287 (A+B): DEAD
  v288: DEAD (migrated into k14_core.gs)
  v289: DEAD
  v290: NOT IN REPO
  v291: DEAD (gateway extracted into infrastructure_gemini.gs)
  v292: DEAD
  v293: DEAD (JD extraction migrated into k14_core.gs K6)
  v294: DEAD

CONFIRMED: ZERO runtime dependencies on any patch file (v280-v294).

---

SECTION 5: INDEX.HTML ANALYSIS

index.html is a standalone web app loaded directly in the browser. It is NOT a Google Apps Script HtmlService page backed by a .gs server.

google.script.run calls in index.html: ZERO
Calls to any k14_core.gs function: ZERO
Connection to the GAS backend: NONE

A. Direct API Calls Found

Line 860: fetch('https://api.anthropic.com/v1/messages', ...)
  Model: claude-sonnet-4-20250514
  Header: anthropic-dangerous-direct-browser-access: true
  API key: read from localStorage (client-side)
  Violation: Intelligence called directly from browser; bypasses K14 entirely.

B. Intelligence Logic Found in index.html

Lines 800-850: buildPrompt() function
  Contains 18 filters (PRIMARY and SECONDARY) with full scoring rules:
  - Trade match / trade type
  - Gulf experience logic (MANDATORY / preferred / not required)
  - Passport scoring
  - Nationality preference
  - Salary fit calculation
  - Skills match percentage
  - Decision thresholds: 80+ = SHORTLIST, 60-79 = REVIEW, under 60 = REJECT
  Violation: All of this belongs in k14_core.gs K4.REASON.

Lines 920-990: Score rendering with raw score logic
  total_score, trade_score, role_exp_score, pg_score, skills_score, salary_score, etc.
  Violation: Scoring model exposed directly to browser; should be K14 outputs only.

Lines 1045-1070: Decision and shortlist logic
  Computes decision from score; calls Tobu CRM API directly.
  Violation: Decision logic belongs in K14.REASON.

C. External API Calls

api.anthropic.com (line 860): Direct browser Claude call — VIOLATION
api.recruitcrm.io (lines 683, 1073): Tobu CRM push — UI action, acceptable if score is from K14

D. Required Fix

Replace the entire buildPrompt + callAPI + score rendering block with:
  google.script.run
    .withSuccessHandler(function(result) { renderScores(result); })
    .matchCandidatesForReqPublic(reqId, limit);

The K14.* public surface in k14_core.gs already provides every output index.html needs:
  K14.scoreCandidate(candidate, req)   -> score + tier + breakdown + signals
  K14.matchRequirement(reqId, limit)   -> ranked list with scores
  K14.freshnessLabel(appDate)          -> display label
  K14.freshnessUrgency(appDate)        -> HOT/WARM/COOL/COLD

This is the pending Task 5 (UI layer reduction).

---

SECTION 6: PROOF THAT NO PRODUCTION PATH BYPASSES K14 FOR INTELLIGENCE

Claim: No .gs file calls an intelligence function outside k14_core.gs.

Evidence:
1. grep for computeMatchScore in *.gs -> only k14_core.gs (K4.F06)
2. grep for getTradeScore in *.gs -> only k14_core.gs (K1.F04)
3. grep for findTradeGroup in *.gs -> only k14_core.gs (K1.F03)
4. grep for classifyEmail in *.gs -> only k14_core.gs (K2.F01)
5. grep for extractJd in *.gs -> only k14_core.gs (K6.F01)
6. grep for getFreshness in *.gs -> only k14_core.gs (K3.F01/F02/F03)
7. grep for matchCandidates in *.gs -> only k14_core.gs (K5.F01 + K8.F01)

Execution engine: reads k14 outputs (rank, risk, readiness, confidence) passed IN by the caller. It never calls any scoring or matching function directly. No intelligence derivation in execution_engine_v1.gs (4 violations remediated in commit 0e90b92).

Foundation files: read-only entity access + FK enforcement. No scoring. No matching. No classification.

Infrastructure: Gemini gateway only. Calls the API; does not interpret the result.

VERDICT:
  GAS backend (.gs files):    K14 is the SOLE intelligence owner. PROVEN.
  UI layer (index.html):      VIOLATION. Browser contains full scoring engine. FIX PENDING (Task 5).

---

SECTION 7: OUTSTANDING ITEMS (not blocking intelligence ownership, but required for full closure)

1. Trigger functions (INFRASTRUCTURE)
   runPipeline_v291, processThread_v291_, flushPendingEmails_v291_ are in patch_v291.txt (NOT compiled).
   The new architecture has no trigger entry point in any .gs file.
   Requires: infrastructure_triggers.gs (or equivalent) to re-register pipeline trigger + email flush.
   Risk: Email processing pipeline is currently inactive in the new .gs architecture.

2. index.html (UI REDUCTION — Task 5)
   Remove buildPrompt + callAPI + scoring logic from browser.
   Replace with google.script.run -> K14.* public surface calls.
   Priority: HIGH (intelligence currently runs in browser, bypassing K14).

3. V2 Dashboard (UI REDUCTION — Task 6)
   KAI_16May2026_V2_Dashboard.txt contains embedded runLiveMatch, scoring functions.
   These are in a .txt file (evidence, not compiled) but when deployed to Apps Script they
   will conflict with k14_core.gs definitions.
   Fix: Remove intelligence functions from V2 dashboard before deployment.

4. KAI_Login.html
   Login-only UI. No intelligence. No scoring. No API calls found.
   Status: CLEAN. No action needed.

---

AUDIT VERDICT

Architecture layer                 Ownership               Status
Foundation (6 entities)            foundation_*_v1.gs      CLEAN
K14 Intelligence                   k14_core.gs             CLEAN
Execution Engine                   execution_engine_v1.gs  CLEAN (4 violations remediated)
Infrastructure / Gemini Gateway    infrastructure_gemini.gs CLEAN
Patch files v280-v294              Evidence archives only   ZERO runtime dependencies CONFIRMED

Remaining violation:
index.html browser scoring engine  Intelligence in UI       FIX PENDING (Task 5)

GitHub is 100% source of truth for all compiled .gs files.
Patch era is closed for all compiled architecture layers.
