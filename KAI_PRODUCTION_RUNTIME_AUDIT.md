KAI PRODUCTION RUNTIME AUDIT
KAI GCC Recruitment OS — Branch: claude/sweet-franklin-mnmfcz
Date: 2026-06-20

Scope: ACTIVE runtime paths only. "Active" = reachable in the COMPILED project
(.gs files + the HtmlService-served index.html). The 23 .txt files in the repo are
evidence archives; Google Apps Script does not compile them, so they execute nothing.

Tobu CRM: REMOVED. The K14 intelligence version contains no Tobu CRM integration.
index.html has zero references to Tobu, recruitcrm.io, crmKey, or any external push.

Compiled runtime files (12):
  k14_core.gs, infrastructure_gemini.gs, infrastructure_webapp.gs,
  execution_engine_v1.gs, foundation_{client,project,campaign,requirement,associate,
  candidate_fk}_v1.gs, index.html, KAI_Login.html

===================================================================================
CHANNEL-BY-CHANNEL RUNTIME PATHS
===================================================================================

----------------------------------------------------------------------
CHANNEL 1 — EMAIL INTAKE
----------------------------------------------------------------------
Status: NOT WIRED IN COMPILED RUNTIME.
Entry point: none. No Gmail trigger, no processThread, no doPost exists in any .gs.
The email pipeline (runPipeline_v291, processThread_v291_, queuePendingEmail_v291_)
lives ONLY in patch_v291.txt, which is not compiled.
Owner file: n/a (pending Infrastructure trigger extraction)
Owner layer: would be Infrastructure (intake transport) + K14 (classify/extract)
Conclusion: Email intake does not run in production today. Because it does not run,
it cannot bypass K14. When it is wired, classification MUST call K14 classifyEmail_
and extraction MUST call K14 extractJdFromPdf / screenCv. (Tracked as pending.)

----------------------------------------------------------------------
CHANNEL 2 — KAI OS CV UPLOAD                              [ACTIVE]
----------------------------------------------------------------------
1. Entry point:    index.html — Upload File / Paste CV -> analyseCV() / runBulk()
2. Functions called (in order):
   - extractText() / pFile() / handleBulkFiles()   (browser file -> raw text)
   - k14ScreenCv() -> google.script.run.screenCvPublic(cvText, filters)
   - screenCvPublic() -> buildScreeningPrompt285_() -> k14Gemini_()
   - kaiGeminiGenerate_()  (Gemini call)
   - showResult() / renderHist()                    (render only)
3. Owner files / layers:
   index.html ....................................... UI
   screenCvPublic / buildScreeningPrompt285_ ........ K14 (k14_core.gs, K9)
   k14Gemini_ seam .................................. K14 -> Infrastructure
   kaiGeminiGenerate_ ............................... Infrastructure (infrastructure_gemini.gs)
   doGet (hosting) .................................. Infrastructure (infrastructure_webapp.gs)
Intelligence owner: K14 only. Browser computes nothing.

----------------------------------------------------------------------
CHANNEL 3 — RECRUITER DIRECT ENTRY                       [ACTIVE — backend]
----------------------------------------------------------------------
1. Entry point:    createCandidate(fields, actor)  (and findCandidateByKaiNo)
2. Functions called:
   - createCandidate() -> FK validation -> append to Candidates
   - updateCandidateFoundationState() for state writes
3. Owner file / layer:
   createCandidate / find / updateState ............. Foundation (foundation_candidate_fk_v1.gs)
Intelligence: none required (identity truth only). If a recruiter-entered candidate is
later scored, scoring goes through K14 (Channel 5). No intelligence in this path.
Note: callable backend entry point exists; a dedicated recruiter-entry UI form is
pending (not blocking — the function is the contract).

----------------------------------------------------------------------
CHANNEL 4 — TELEGRAM INTAKE
----------------------------------------------------------------------
Status: NOT PRESENT.
Entry point: none. No Telegram code exists anywhere in the repository (compiled or .txt).
Owner file: n/a    Owner layer: n/a
Conclusion: Not an active runtime path. Nothing to bypass. When built, it must route
intake through K14 (same rule as Email).

----------------------------------------------------------------------
CHANNEL 5 — REQUIREMENT CREATION                         [ACTIVE]
----------------------------------------------------------------------
1. Entry point:    createRequirement(fields, actor)   |  JD intake: K14.extractJdFromPdf
2. Functions called:
   - extractJdFromPdfInline_v293_() (if JD is a PDF)  -> k14Gemini_ -> Gemini
   - createRequirement() -> Campaign-mandatory FK check (Rule 13) -> append _Requirements
   - findCampaignById / findClientById (FK resolution)
3. Owner files / layers:
   extractJdFromPdfInline_v293_ (JD extraction) ..... K14 (k14_core.gs, K6)
   createRequirement / FK checks .................... Foundation (foundation_requirement_v1.gs)
   findCampaignById / findClientById ................ Foundation (campaign/client files)
   Gemini gateway .................................. Infrastructure (infrastructure_gemini.gs)
Intelligence owner: K14 owns JD extraction. Foundation owns the requirement truth + FK.

----------------------------------------------------------------------
CHANNEL 6 — CANDIDATE MATCHING                           [ACTIVE]
----------------------------------------------------------------------
1. Entry point:    matchCandidatesForReqPublic(reqId, limit)   [google.script.run / dashboard]
2. Functions called:
   - matchCandidatesForReq285_()         (K5 match engine)
   - loadRequirementById285_ / loadCandidates285_   (Foundation read)
   - computeMatchScore285_()             (K4 master scorer)
     -> getTradeScore285_ (K1), getFreshnessScore285_ (K3),
        getDeployReadyScore285_/getExperienceScore285_/getGulfExpScore285_/
        getNationalityScore285_/getPassportScore285_ (K4)
3. Owner file / layer:
   ALL of the above ................................. K14 (k14_core.gs, K1/K3/K4/K5/K7/K8)
Intelligence owner: K14 only. Classification + scoring + freshness + ranking all K14.

----------------------------------------------------------------------
CHANNEL 7 — SHORTLISTING                                 [ACTIVE]
----------------------------------------------------------------------
1. Entry point:    addProjectCandidate(reqId, kaiNo, k14, actor)
                   shortlistProjectCandidate(pcid, actor)
2. Functions called:
   - exResolveRequirement_ / exResolveCandidate_     (Foundation read)
   - addProjectCandidate() writes MatchState=MATCHED, stores K14 rank/risk/readiness
     that were PASSED IN by the caller (from Channel 6 K14 output)
   - shortlistProjectCandidate() MATCHED -> SHORTLISTED
3. Owner file / layer:
   addProjectCandidate / shortlistProjectCandidate .. Execution (execution_engine_v1.gs)
   requirement/candidate resolution ................. Foundation (read)
Intelligence owner: NONE generated here. Execution consumes K14 match output; it does
not score, rank, or classify. (Verified: no scoring functions in execution_engine_v1.gs.)

----------------------------------------------------------------------
CHANNEL 8 — MOBILIZATION                                 [ACTIVE]
----------------------------------------------------------------------
1. Entry point:    advancePipeline(selPipeId, toState, evidence, actor)  [selection]
                   advanceMobilizationGate(mobPipeId, toGate, evidence, actor)
                   captureOutcome(mobPipeId, outcomeType, evidence, actor)
2. Functions called:
   - advancePipeline(): SUBMITTED->SHORTLISTED->INTERVIEW->OFFER->SELECTED|DECLINED;
     on SELECTED auto-opens _MobilizationPipeline at OFFER-ACCEPTED
   - advanceMobilizationGate(): OFFER-ACCEPTED->DOCUMENTATION->VISA->MEDICAL->TRAVEL
     ->DEPLOYED | MOBILIZATION-ABORTED
   - captureOutcome(): writes ONE raw fact row to _ExecutionOutcomes (frozen schema)
3. Owner file / layer:
   all pipeline/gate/outcome functions .............. Execution (execution_engine_v1.gs)
Intelligence owner: NONE. Execution records raw facts only. No MobilizationResult
SUCCESS/FAILURE derivation (removed). No _AssociateReliability write (LOCK 2 honored).
K14.OUTCOMES reads _ExecutionOutcomes and derives any intelligence independently.

----------------------------------------------------------------------
CHANNEL 9 — DASHBOARD VIEWS                              [ACTIVE — K14 read surface]
----------------------------------------------------------------------
1. Entry point (read-only):
   getOpenRequirementsPublic()
   getRequirementByIdPublic(reqId)
   getTopMatchSummaryPublic(reqId)
2. Functions called:
   - getOpenRequirementsPublic() -> Foundation read of _Requirements
   - getRequirementByIdPublic() -> loadRequirementById285_
   - getTopMatchSummaryPublic() -> matchCandidatesForReq285_ (K5) -> K4 scorers
3. Owner file / layer:
   all three public read endpoints .................. K14 (k14_core.gs, K7/K8)
   rendering (index.html) .......................... UI
Intelligence owner: K14. The dashboard renders K14 output; it computes nothing.
Note: the legacy V2 dashboard (KAI_16May2026_V2_Dashboard.txt) is NOT compiled and
NOT served. The active read surface is the K14 public endpoints above. A deployed
dashboard UI on these endpoints is the next feature-phase task (not architecture).

===================================================================================
CERTIFICATION
===================================================================================

A. ALL INTELLIGENCE ORIGINATES FROM k14_core.gs
   PASS. Every active intelligence operation resolves to k14_core.gs:
   - CV screening ......... screenCvPublic / buildScreeningPrompt285_ (K9)
   - JD extraction ........ extractJdFromPdfInline_v293_ (K6)
   - Classification ....... findTradeGroup285_, getTradeScore285_, classifyEmail_ (K1/K2)
   - Scoring .............. computeMatchScore285_ + get*Score285_ (K4)
   - Matching ............. matchCandidatesForReq285_ (K5)
   - Freshness ............ getFreshnessScore285_ / V288 label+urgency (K3)
   - Recommendations ...... decision tiers (screening K9 + match tiers K4)
   grep confirms none of these are defined in any other .gs file or in index.html.

B. NO ACTIVE RUNTIME PATH BYPASSES K14 FOR:
   - Classification ....... PASS (only K1/K2 in k14_core.gs)
   - Scoring .............. PASS (only K4 in k14_core.gs; index.html computes nothing)
   - Matching ............. PASS (only K5 in k14_core.gs)
   - Freshness ............ PASS (only K3 in k14_core.gs)
   - JD Extraction ........ PASS (only K6 in k14_core.gs)
   - Recommendations ...... PASS (decision logic only in k14_core.gs K4/K9)
   The former bypass (index.html direct Anthropic call) is removed. The only browser
   network call is google.script.run -> K14. No external AI or CRM call remains.

C. NO PATCH FILE v280-v294 PARTICIPATES IN COMPILED RUNTIME
   PASS. Zero compiled .gs file and index.html call any function defined solely in a
   patch .txt. The Gemini gateway was extracted into infrastructure_gemini.gs; JD
   extraction and scoring were migrated into k14_core.gs. v280-v294 are evidence only.

D. REMAINING LEGACY FILES NOT USED BY PRODUCTION RUNTIME (evidence only — safe to archive)
   Patch chain:   patch_v280.txt, KAI_17May2026_patch_v282.gs.txt,
                  KAI_17May2026_patch_v283.txt, patch_v284.txt,
                  KAI_17May2026_patch_v284.txt, KAI_17May2026_patch_v285.txt,
                  KAI_17May2026_patch_v286.txt, patch_v287.txt,
                  KAI_17May2026_patch_v287.gs.txt, KAI_17May2026_patch_v288.txt,
                  KAI_18May2026_patch_v289.txt, patch_v291.txt, patch_v292.txt,
                  patch_v293.txt, patch_v293_test.gs.txt, patch_v294.txt
   Old base/UI:   Code.gs.txt, KAI_16May2026_V2.txt, KAI_16May2026_V2_Dashboard.txt,
                  KAI_15May2026_V1_Dashboard.txt, 28th April 1356 hrs.txt
   Reference:     taxanomy996.txt (taxonomy seed data), diagnostics.txt
   Total: 23 .txt files. None compiled. None on any active runtime path.
   Recommendation: move to an evidence/ folder (or delete) in the feature phase. Keep
   taxanomy996.txt as reference data until the taxonomy is fully sheet-backed.

   Also present but NOT on an active path yet:
   - KAI_Login.html — login UI; no auth doGet is wired, so it is not currently served.
     (Auth hosting is a pending Infrastructure task, not an intelligence concern.)

E. ARCHITECTURE FREEZE & IMPLEMENTATION READINESS
   READY.
   - Intelligence ownership: single owner (k14_core.gs). PASS.
   - Layer boundaries: Foundation / K14 / Execution / Infrastructure / UI all clean. PASS.
   - Patch era: closed in compiled runtime. PASS.
   - UI: presentation only; no intelligence, no Tobu, no external AI. PASS.
   KAI is declared K14 GOVERNED and READY FOR ARCHITECTURE FREEZE.

   Carry-forward items for the IMPLEMENTATION phase (feature work, NOT redesign):
   1. Wire Email Intake as an Infrastructure trigger that calls K14 classify/extract.
   2. Build the dashboard + recruiter-entry UI on the existing K14 public endpoints.
   3. Run Foundation migrations on the live sheet (migrate* entry points).
   4. Archive the 23 legacy .txt files to evidence/.
   5. (Optional) Telegram intake — only if/when required; must route through K14.

   None of the carry-forward items reopen architecture. The boundaries are frozen.
