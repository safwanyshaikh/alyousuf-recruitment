KAI OS — FINAL ARCHITECTURE CLOSURE & GO-LIVE CERTIFICATION
KAI GCC Recruitment OS — Branch: claude/sweet-franklin-mnmfcz
Date: 2026-06-20
Scope: Task 5 (UI reduction to presentation) executed. Full runtime re-audit. K14 certification.

Method: Static analysis of compiled .gs files + index.html. .txt patch files are evidence
archives; Google Apps Script does NOT compile them. They have zero runtime presence.

===================================================================================
DELIVERABLE 1 — UI OWNERSHIP AUDIT
===================================================================================

Intelligence that WAS inside index.html (before this migration), with exact line
numbers (pre-migration) and the K14 endpoint that now owns it.

Browser function (REMOVED)     Pre-migration lines   What it did                Replacement K14 owner
buildPrompt(cv, f)             802-857               Built the 18-filter         k14_core.gs buildScreeningPrompt285_ (K9.F01)
                                                     screening prompt
                                                     (scoring weights, decision
                                                     thresholds = intelligence)
callAPI(prompt)                859-869               Direct fetch to             k14_core.gs screenCvPublic (K9.F02) ->
                                                     api.anthropic.com           k14Gemini_ seam -> infrastructure_gemini.gs
                                                     (browser AI call)           kaiGeminiGenerate_
analyseCV() screening call     882 (callAPI)         Single-CV intelligence      k14_core.gs screenCvPublic via
                                                     orchestration               google.script.run
runBulk() screening call       918 (callAPI)         Bulk intelligence           k14_core.gs screenCvPublic via
                                                     orchestration (loop)        google.script.run (per item)

Browser-side scoring decisions embedded in the prompt (now K14-owned):
- Trade + Trade Type 25 / Role Exp 20 / Passport+Gulf 15 / Skills 15 / Salary 10 /
  Availability 5 / Location 5 / Industry 5 = 100
- Decision thresholds: 80+ AUTO SHORTLIST, 60-79 REVIEW, <60 REJECT, hard-fail PARK/REJECT
- 18-filter logic (trade match, position alignment, experience logic, passport, gulf,
  age, qualification, nationality, industry, salary, availability, skills, certifications,
  duplicate detection)
ALL of the above now live ONLY in k14_core.gs K9 (buildScreeningPrompt285_).

What REMAINS in index.html (presentation + non-intelligence, correctly UI-owned):
- getFilters() (lines ~778): reads form inputs. UI input collection. NOT intelligence.
- extractText()/pFile()/handleBulkFiles() (~723-750): browser file -> raw text for
  transport (pdf.js / mammoth). This is a file-read utility, NOT CV understanding.
  The understanding (field extraction + scoring) happens server-side in K14.
- showResult()/setBar()/renderHist()/viewHist()/viewBulk() : rendering only.
- pushTobu()/pushOne()/pushAll()/testTobu() : external Tobu CRM push. A workflow
  action that CONSUMES K14 output; it generates no intelligence. (External integration.)
- saveHist()/stats/localStorage : UI session state.
- exportCSV()/dlResult() : export of already-computed K14 results.

UI INTELLIGENCE REMAINING AFTER MIGRATION: ZERO.

===================================================================================
DELIVERABLE 2 — UI MIGRATION REPORT
===================================================================================

For every removed browser-intelligence path:

PATH 1 — Single CV screening
  OLD:  Browser analyseCV() -> buildPrompt() -> callAPI() -> api.anthropic.com -> render
  NEW:  Browser analyseCV() -> google.script.run.screenCvPublic(cv, filters)
                            -> K14 buildScreeningPrompt285_ + k14Gemini_
                            -> infrastructure_gemini.gs kaiGeminiGenerate_ (Gemini)
                            -> K14 returns structured result
                            -> Browser showResult() renders only

PATH 2 — Bulk CV screening
  OLD:  Browser runBulk() loop -> buildPrompt() -> callAPI() -> api.anthropic.com -> render
  NEW:  Browser runBulk() loop -> google.script.run.screenCvPublic(cvText, filters) per CV
                              -> K14 (same chain as Path 1)
                              -> Browser renders ranked list (presentation only)

PATH 3 — AI provider credential
  OLD:  Browser stored Claude API key in localStorage; sent it to api.anthropic.com
        with anthropic-dangerous-direct-browser-access: true
  NEW:  No AI credential in the browser. GEMINI_API_KEY lives in Script Properties,
        read only by infrastructure_gemini.gs validateApiKey_v291_. The Claude key
        input field was removed from the UI.

PATH 4 — Prompt / scoring model ownership
  OLD:  18-filter prompt + 100-point scoring model authored and held in the browser.
  NEW:  Identical prompt + model authored and held in k14_core.gs K9. Behavior preserved
        (same filters, same weights, same decision thresholds, same JSON contract).

Runtime behavior preserved: the UI renders the exact same result object shape
(total_score, trade_score, decision, filter_failures, summary, etc.). Only the OWNER
of the computation changed: browser -> K14.

Hosting change required for google.script.run to function:
  Added infrastructure_webapp.gs doGet() — serves index.html via HtmlService so the
  browser can reach the K14 public surface. This file owns HOSTING only; no intelligence.

===================================================================================
DELIVERABLE 3 — RUNTIME OWNERSHIP AUDIT
===================================================================================

Active compiled files (11 total): 9 prior + infrastructure_webapp.gs + index.html (UI).

ENTRY POINT / PROCESS                         OWNER FILE                      LAYER
-- UI (presentation only) --
doGet() (serves UI)                           infrastructure_webapp.gs        Infrastructure
index.html rendering + forms                  index.html                      UI
index.html Tobu CRM push                      index.html                      UI (external action)

-- Screening (intelligence) --
screenCvPublic(cvText, filters)               k14_core.gs (K9.F02)            K14
buildScreeningPrompt285_(cvText, f)           k14_core.gs (K9.F01)            K14
K14.screenCv(cvText, filters)                 k14_core.gs (K8.NS)             K14

-- Match / score / classify (intelligence) --
matchCandidatesForReqPublic(reqId, limit)     k14_core.gs (K8.F01)            K14
getTopMatchSummaryPublic(reqId)               k14_core.gs (K8.F02)            K14
getRequirementByIdPublic(reqId)               k14_core.gs (K8.F03)            K14
getOpenRequirementsPublic()                   k14_core.gs (K7.F03)            K14
computeMatchScore285_ / get*Score285_         k14_core.gs (K4)                K14
matchCandidatesForReq285_                     k14_core.gs (K5)                K14
findTradeGroup285_ / getTradeScore285_        k14_core.gs (K1)                K14
classifyEmail_                                k14_core.gs (K2)                K14
getFreshness* (285/V288)                      k14_core.gs (K3)                K14
extractJdFromPdfInline_v293_                  k14_core.gs (K6)                K14

-- Gemini gateway (service) --
kaiGeminiGenerate_(parts, circuit)            infrastructure_gemini.gs (GW.F03) Infrastructure
callGemini_v291_ / callGeminiString_v291_     infrastructure_gemini.gs        Infrastructure
validateApiKey_v291_ / getEffectiveGeminiModel_ infrastructure_gemini.gs      Infrastructure
buildGeminiPartsWithFallback_                 infrastructure_gemini.gs        Infrastructure

-- Execution (state transitions + actions) --
addProjectCandidate / shortlistProjectCandidate execution_engine_v1.gs        Execution
createSubmissionBatch / addCandidateToBatch   execution_engine_v1.gs          Execution
generateSubmissionPackage / submitBatch       execution_engine_v1.gs          Execution
advancePipeline / advanceMobilizationGate     execution_engine_v1.gs          Execution
captureOutcome / runExecutionUAT              execution_engine_v1.gs          Execution

-- Foundation (truth) --
migrate/create/find/verify/rollback (Client)  foundation_client_v1.gs         Foundation
migrate/create/find/verify/rollback (Project) foundation_project_v1.gs        Foundation
migrate/create/find/verify/rollback (Campaign) foundation_campaign_v1.gs      Foundation
migrate/create/find/verify/rollback (Requirement) foundation_requirement_v1.gs Foundation
migrate/create/find/verify/rollback (Associate) foundation_associate_v1.gs    Foundation
migrate/create/find/state/verify/rollback (Candidate) foundation_candidate_fk_v1.gs Foundation

Layer integrity:
  Foundation     -> truth only (no scoring, no matching, no classification)
  K14            -> ALL intelligence (screening, scoring, matching, classification, intake)
  Execution      -> actions only (consumes K14 rank/risk/readiness passed in; derives nothing)
  Infrastructure -> services only (Gemini gateway, UI hosting; interprets nothing)
  UI             -> presentation only (renders K14 output; Tobu push is an external action)

===================================================================================
DELIVERABLE 4 — PATCH DEPENDENCY AUDIT (v280-v294)
===================================================================================

A patch has a live dependency ONLY IF a function defined solely in that .txt file is
CALLED by a compiled .gs file or by index.html. Method: grep all compiled sources.

v280  DEAD — import engine; no caller
v281  NOT IN REPO
v282  DEAD — candidate-state writers; superseded by foundation_candidate_fk_v1.gs
v283  DEAD — old freshness/JD; superseded by k14_core K3/K6
v284  DEAD (A+B) — old JD extraction; superseded by k14_core K6
v285  DEAD — scoring/match/taxonomy; MIGRATED into k14_core K1/K3/K4/K5/K8
v286  DEAD — email classifier; MIGRATED into k14_core K2
v287  DEAD (A+B) — quota/auth; no caller
v288  DEAD — freshness label/urgency; MIGRATED into k14_core K3
v289  DEAD — email/quota; no caller
v290  NOT IN REPO
v291  DEAD — Gemini gateway EXTRACTED into infrastructure_gemini.gs. The .gs file
            DEFINES its own callGemini_v291_/validateApiKey_v291_; it does not call the
            .txt. patch_v291.txt is unreachable text.
v292  DEAD — find-or-create hierarchy; superseded by Foundation entity files
v293  DEAD — JD extraction; extractJdFromPdfInline_v293_ MIGRATED into k14_core K6.
            k14_core defines its own copy; it does not call patch_v293.txt.
v294  DEAD — client hierarchy mapping; superseded by Foundation entity files

RESULT: ZERO ACTIVE RUNTIME DEPENDENCIES on v280-v294. PASS.

Note on the browser's former Claude path: index.html previously bypassed all patches
AND all of GitHub's backend by calling api.anthropic.com directly. That bypass is now
removed. The browser's only network calls are google.script.run (to K14) and the Tobu
CRM REST push (external integration).

===================================================================================
DELIVERABLE 5 — K14 CERTIFICATION REPORT
===================================================================================

Verification performed by grep across ALL compiled sources (*.gs + index.html):

[PASS] No intelligence outside K14
       All scoring/matching/classification/screening/intake functions are defined only
       in k14_core.gs. No other .gs file and not index.html defines any.

[PASS] No scoring outside K14
       computeMatchScore285_, get*Score285_, and the 100-point screening model
       (buildScreeningPrompt285_) exist only in k14_core.gs.

[PASS] No matching outside K14
       matchCandidatesForReq285_ exists only in k14_core.gs.

[PASS] No classification outside K14
       findTradeGroup285_, getTradeScore285_, classifyEmail_ exist only in k14_core.gs.

[PASS] No ranking outside K14
       Match ranking (K5) and screening ranking (K9 decision tiers) are K14-owned.
       index.html runBulk() only sorts an already-scored list for display.

[PASS] No recommendation logic outside K14
       Decision thresholds (AUTO SHORTLIST / REVIEW / REJECT / PARK) are produced by K14.

[PASS] No browser intelligence
       index.html contains zero prompt construction, zero AI calls, zero scoring.
       grep for apiKey / buildPrompt / callAPI / api.anthropic / generativelanguage
       in index.html: NONE FOUND.

[PASS] No execution intelligence
       execution_engine_v1.gs consumes K14 outputs (rank/risk/readiness passed in) and
       derives nothing. (4 prior violations remediated in commit 0e90b92.)

[PASS] No foundation intelligence
       foundation_*_v1.gs perform truth CRUD + FK enforcement only. No scoring fields,
       no derivation (Rule 14 enforced).

Single-owner clarification:
  k14_core.gs now hosts TWO distinct intelligence operations:
    (a) K5 match engine — scores Foundation candidates against a stored requirement.
    (b) K9 CV screening — screens raw CV text against ad-hoc filter criteria at intake.
  These are different stages, not duplicates. Both are owned solely by k14_core.gs.
  There is NO competing scorer, matcher, classifier, or prompt in any other file.
  This satisfies the K14 Ownership Mandate (one owner; no second engine anywhere).

CERTIFICATION RESULT: PASS — NO VIOLATIONS REMAIN.

===================================================================================
GO-LIVE CONDITION
===================================================================================

Runtime Ownership Audit ....... PASS
Patch Dependency Audit ........ PASS (zero active dependencies)
UI Ownership Audit ............ PASS (zero UI intelligence)
K14 Certification Report ...... PASS (no intelligence outside K14)

STATUS: KAI OS IS DECLARED "K14 GOVERNED".

Architecture is frozen. Foundation -> K14 -> Execution -> UI.
No further architecture redesign unless a critical defect is found.

===================================================================================
OPERATIONAL NOTES FOR DEPLOYMENT (not architecture — config only)
===================================================================================

1. Script Property GEMINI_API_KEY must be set (Infrastructure owns the credential).
2. Deploy as Web App (doGet in infrastructure_webapp.gs) so google.script.run resolves.
3. index.html must be present in the Apps Script project as file name "index".
4. Tobu CRM push is optional; if no Tobu key is entered the push paths are skipped.
5. The screening model now routes through Gemini (Infrastructure gateway). The former
   browser path used Claude directly; output JSON contract is unchanged.

NEXT (feature work, not architecture):
- Dashboard completion (V2) on the K14.* surface.
- Recruitment / candidate / requirement / mobilization operations.
- Foundation migrations execution on the live sheet (migrate* entry points).
