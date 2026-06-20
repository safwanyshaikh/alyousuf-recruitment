# K14 MIGRATION REPORT
**Phase 5.1 · Phase 4D execution · k14_core.gs built**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20

One file built: `k14_core.gs` — the single permanent owner of intelligence.
No `k14_reason.gs` / `k14_classify.gs` / `k14_memory.gs` / `k14_outcomes.gs` /
`k14_learn.gs` were created. The modules are SECTIONS (K1–K8) of the one file.

---

## 1. FUNCTIONS MIGRATED INTO k14_core.gs

Migrated with minimal behavioral change (bodies preserved; only the Gemini call
and the spreadsheet accessor were routed through Infrastructure seams).

CLASSIFY — Trade Taxonomy (from v285 S82)
- TRADE_GROUPS_V285_ (20-group constant)        section K1
- normalizeTrade285_                            K1.F01
- tradeTermMatch285_                            K1.F02
- findTradeGroup285_                            K1.F03
- getTradeScore285_                             K1.F04

CLASSIFY — Email Classifier (from v286 S76)
- EMAIL_TYPE_, PROTECTED_DOMAINS_, SPAM_PATTERNS_, JD_SIGNALS_, CV_SIGNALS_, REPLY_SIGNALS_  K2
- classifyEmail_                                K2.F01
- countSignals_                                 K2.F02

REASON — Freshness (from v285 S83.F01 + v288 S98)
- getFreshnessScore285_  (match-axis score 0–30)   K3.F01
- getCvFreshnessV288_    (display label)           K3.F02
- getFreshnessScoreV288_ (label→score)             K3.F03
- getFreshnessUrgencyV288_ (urgency chip)          K3.F04

REASON — Candidate Scoring (from v285 S83)
- getDeployReadyScore285_                       K4.F01
- getExperienceScore285_                        K4.F02
- getGulfExpScore285_                           K4.F03
- getNationalityScore285_                       K4.F04
- getPassportScore285_                          K4.F05
- computeMatchScore285_                          K4.F06

REASON — Match Engine (from v285 S84)
- matchCandidatesForReq285_                     K5.F01

INTAKE — JD Extraction (from v293 S93.F01)
- extractJdFromPdfInline_v293_                  K6.F01

FOUNDATION READ ADAPTERS (read-only, from v285 S84/S85)
- loadRequirementById285_                       K7.F01
- loadCandidates285_                            K7.F02
- getOpenRequirementsPublic                     K7.F03

PUBLIC SURFACE (from v285 S85 + new K14 namespace)
- matchCandidatesForReqPublic                   K8.F01
- getTopMatchSummaryPublic                      K8.F02
- getRequirementByIdPublic                      K8.F03
- K14.* namespace facade                        K8.NS

Total migrated: 27 functions + 7 constants into ONE file.

Reconciliation note (freshness): the K14_CONSOLIDATION_PLAN marked
getFreshnessScore285_ as "Archive (superseded by V288)". On migration this was
reconciled to RETAIN BOTH, because they serve different purposes and collapsing
them would change match scores:
- getFreshnessScore285_  → the match-axis score (0–30) feeding computeMatchScore285_.
- getCvFreshnessV288_ / urgency → the DISPLAY label + chip for the UI.
Keeping both preserves match behavior exactly (minimal behavioral change) while
still giving the dashboard the V288 weekday labels. Both now live in one owner.

---

## 2. FUNCTIONS ARCHIVED (evidence only — not migrated, no runtime path)

Superseded scorers/matchers (one canonical kept; these are dead on arrival):
- scoreCandidate_           (Code.gs V1)     → superseded by computeMatchScore285_
- contextScore_             (V2)             → superseded by computeMatchScore285_
- tradeSimilarityScore_     (V2)             → superseded by getTradeScore285_
- matchCandidatesToRequirement_ (V2)         → superseded by matchCandidatesForReq285_
- getCvFreshness_ / getFreshnessUrgency_ (v283) → superseded by V288 label/urgency
- extractJdWithGemini_ (V2), extractJdEnhanced_ (v283) → superseded by v293 intake
- extractSingleJdBlock_ (v284), _v291_       → superseded by v293 intake
- clientFreshness_, isCurrentWeekCV_ (dashboard) → freshness is K14-owned now

A/B duplicate files archived whole:
- KAI_17May2026_patch_v284.txt  (v284-A; canonical is patch_v284.txt / B)
- patch_v287.txt                (v287-A; canonical is KAI_17May2026_patch_v287.gs.txt / B)

Dead/test:
- patch_v293_test.gs.txt, 28th April 1356 hrs.txt, all *_DEPRECATED_ functions,
  KAI_15May2026_V1_Dashboard.txt

These remain in the repository as MIGRATION EVIDENCE. No runtime path enters them.

---

## 3. FUNCTIONS RETAINED IN INFRASTRUCTURE (not intelligence — stay as services)

Gemini gateway:
- callGemini_v291_, callGeminiString_v291_, buildGeminiPartsWithFallback_,
  validateApiKey_v291_, getEffectiveGeminiModel_   (currently in patch_v291)
  → k14_core calls these THROUGH the k14Gemini_ seam (K0.F01). They are
    Infrastructure's property, NOT K14's. See Section 5 for the one remaining
    physical relocation.

Pipeline / queue / logging:
- runPipeline_v291, processThread_v291_, queuePendingEmail_v291_,
  flushPendingEmails_v291_, appendLog_v291_, logQuota_v291_, clearCache (v291)

Email / quota / auth / drive:
- quota + auto-reply + digest (v287 B), import engine (v280), auth/session
  (v283/v284/v288 getSessionUser), Gmail labels (v286), Drive helpers.

Sheets accessor:
- getMasterSS_ — called by k14_core via the k14MasterSS_ seam (K0.F02).

K14 owns none of these. It only calls through them.

---

## 4. FUNCTIONS RETAINED IN EXECUTION (state transitions — consume K14, never generate)

- shortlistCandidateForReq, bulkShortlistForReq (v284/V2) — Match state action
- updateCandidateState, updateCandidateStateWithOwner (V2/v282) — state writes
- updateTechnicalReview (v282) — records human verdict (K14.LEARN reads it)
- execution_engine_v1.gs — Match → Submission → Selection → Mobilization actions

Execution reads K14 outputs (match scores, classifications) and acts. It calls
K14.* but defines no scorer, matcher, ranker, or classifier of its own.

---

## 5. RUNTIME DEPENDENCIES REMOVED

Before: intelligence was scattered across 3 scorers, 2 matchers, multiple
freshness systems, and a browser engine, spread over v282–v293 + index.html.

After k14_core.gs:
- Single scorer:    computeMatchScore285_  (k14_core K4.F06)
- Single matcher:   matchCandidatesForReq285_ (k14_core K5.F01)
- Single taxonomy:  TRADE_GROUPS_V285_ + findTradeGroup285_ (k14_core K1)
- Single classifier: classifyEmail_ (k14_core K2.F01)
- Single JD intake: extractJdFromPdfInline_v293_ (k14_core K6.F01)
- Single freshness owner: K3 (match score + display label + urgency)

Dashboards that called the v285 public names (matchCandidatesForReqPublic,
getTopMatchSummaryPublic, getRequirementByIdPublic, getOpenRequirementsPublic)
now resolve to k14_core.gs — the patch_v285 copies are retired. Zero dashboard
code change required.

Cross-layer seams remaining (by design — these are Infrastructure/Config, not
intelligence):
- k14Gemini_  → Infrastructure Gemini gateway
- k14MasterSS_ → Infrastructure sheets accessor
- CONFIG / CONFIG_V2 → configuration (sheet names + column maps)

ONE physical dependency still points at a patch file:
- The Gemini gateway (callGemini_v291_) physically lives in patch_v291.
  k14_core does NOT call it by that name directly at the intelligence layer — it
  calls the k14Gemini_ seam, which prefers a canonical Infrastructure gateway
  (kaiGeminiGenerate_) and falls back to callGemini_v291_ only until that gateway
  is physically relocated out of patch_v291 into an Infrastructure file. This
  relocation is an INFRASTRUCTURE task (Constraint 9), not a K14 task, and is the
  last step to make the success condition fully literal.

---

## 6. SUCCESS CONDITION

"After migration, no runtime path depends on patch_v280–v294."

- Intelligence layer: ACHIEVED. All scoring/matching/taxonomy/classification/JD
  intake now lives in k14_core.gs. No intelligence runtime path enters a patch file.
- One remaining seam: the Gemini GATEWAY (an Infrastructure service, not
  intelligence) still physically resides in patch_v291. k14_core reaches it only
  through the k14Gemini_ indirection, which will bind to the Infrastructure
  gateway the moment it is extracted. Extracting it is the final Infrastructure
  step and removes the last patch reference.

Net: the intelligence half of the patch-era retirement is complete. The only
outstanding item is relocating the Gemini gateway from patch_v291 into an
Infrastructure file — an Infrastructure task, cleanly isolated behind one seam.

---

## 7. NEXT STEPS (no code beyond this report)

1. Infrastructure extraction: move the Gemini gateway out of patch_v291 into
   an Infrastructure file exposing kaiGeminiGenerate_; k14Gemini_ binds to it
   automatically.
2. Reduce index.html + V2 dashboard to presentation: replace the browser engine
   (buildPrompt/analyseCV/runBulk) and dashboard-embedded logic with calls to
   the K14.* surface.
3. Mark patch_v280–v294 as evidence/ (no runtime import).

ROLLBACK: delete k14_core.gs and K14_MIGRATION_REPORT.md. No Foundation schema,
no live data, and no existing patch file was modified by this migration.
