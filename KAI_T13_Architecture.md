# KAI T13 — GCC Recruitment Intelligence Layer

**Status:** Parallel brain built. NOT yet replacing production. A/B comparison required first.

## Why
The old engine matched on keywords: `"welding inspection".indexOf("welding")` → a Welding
Inspector scored STRONG for a Welder requirement. Patching keywords created endless edge
cases (242/242 foremen, "qc" too short, etc.). T13 replaces *guessing* with *classification*.

## The core insight
The taxonomy already separates doers from checkers **by Department**, not keyword:

```
Construction | Operations           | Welding  | Welder – TIG / Pipe / Arc
Construction | Quality & Inspection  | …        | Welding Inspector
Construction | Engineering           | …        | Welding Engineer
```

A Welder (Operations) and a Welding Inspector (Quality & Inspection) share the word
"welding" and **nothing else**. T13 classifies on `Department → Collar → Level → Group`,
so they can never match.

## Pipeline (Decisions 2, 3, 7, 10)
```
Industry → Department → Trade Family → Trade → Specialization
Raw CV Trade → Trade Resolver → Taxonomy Trade → Family → Collar → Level
            → Eligibility (hard gate) → [Gemini ranks only the survivors]
```
Gemini is **ranking only** and never runs on an ineligible candidate.

## Engines (file: `KAI_T13_Intelligence.gs`)
| Deliverable | Function |
|---|---|
| 1 Taxonomy layer | `_Taxonomy` sheet, `TAXONOMY_HEADERS`, `ensureTaxonomySheetT13_` |
| 2 Collar | `T13_COLLAR_OF_LEVEL` (BLUE/GREY/WHITE/PINK) |
| 3 Position level | `T13_LADDER` (17 GCC levels), `detectLevelT13_` |
| 4 Trade family | `detectDisciplineT13_`, `assignGroupT13_` |
| 5 Human approval | `suggestClassificationT13_` (→PENDING), `approvePendingT13_` |
| 6 Eligibility | `checkEligibilityT13_` |
| 7 Match matrix | `T13_ALLOWED` (default-deny), `levelFactorT13_` |
| 8 Learning | `affinityMultiplierT13_` (reads `_MatchFeedback`) |
| 9 Top-3 | `getTop3PositionsT13_` (no Gemini) |
| 10 Match audit | `getMatchedCandidatesT13_` returns `t13Reason` per record |
| 11 Gemini reposition | eligibility precedes scoring by construction |
| 12 Migration | `seedTaxonomyGCC_`, `importBLSTaxonomyT13_` |

## Eligibility groups (Decision 6)
Default **deny**. A requirement group only sees candidate groups listed in `T13_ALLOWED`.
Cross-collar is always blocked. Example: `WELDER_GROUP` allows only `{WELDER:100, FABRICATOR:60}`
— inspectors/engineers/managers are invisible.

## How to run (GAS editor, in order)
1. `seedTaxonomyGCC_()` — seed the curated GCC core trades as APPROVED.
2. `testT13SuccessCase()` — must print **"SUCCESS TEST PASSED — 0 leaks"**.
3. `compareEnginesT13_(100)` — old vs T13 STRONG counts across up to 100 requirements.
   Read the "% noise eliminated" line. This is the evidence before any production switch.

## Parallel rollout (your rule: don't break recruiters)
- T13 lives in its own file. The production matcher is untouched and still serves the UI.
- Nothing is wired to Lovable yet. When the A/B numbers look right, we add a single
  `action=matchT13` route and run both engines side by side in the drawer for final sign-off.

## Open tuning decisions (flagged, your call)
1. **Dual-trade candidates.** "Welding Inspector/Welder" currently SHOWS (via the Welder
   trade, Decision 3 best-of-three). A *pure* inspector stays hidden. Toggle to
   primary-trade-only if you want stricter purity.
2. **Cross-discipline foremen.** Fabrication Foreman ↔ Scaffolding Foreman = GOOD (demoted),
   not STRONG, not blocked. Tunable via the `×0.7` discipline penalty.
3. **Governance strictness.** `T13_STRICT_GOVERNANCE=false` — unknown trades are matched by
   the rule engine AND queued as PENDING for human refinement (so recruiters are never
   blocked during learning). Flip to enforce hard approval-gating later.

## Not built yet (Lovable — deferred per "finish GAS first")
- Admin approval screen for the PENDING queue (Deliverable 5 UI).
- Side-by-side old/T13 drawer toggle.
- Recruiter learning dashboard (the backend hooks already write `_MatchFeedback`).
