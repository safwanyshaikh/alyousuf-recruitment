# KAI14-Core — Runtime Validation Protocol

**Phase:** Runtime Validation ONLY. Implementation FROZEN. No new code, no UI,
no mobilization, no backlog replay, no migration.
**Goal:** produce runtime EVIDENCE for 5 steps, in order. Each step must pass
before the next begins.

**Execution boundary:** all functions already exist (commit 90de9a4). They are run
by the operator in the Apps Script editor. No code is added during this phase
(exception noted at Step 5).

**Functions used (all pre-existing):**
| Step | Function(s) | Production impact |
|------|-------------|-------------------|
| 1 Sequential | `kai14ProofSequential` | none (isolated `_TEST_*`) |
| 2 Concurrency | `kai14ProofConcInstall` → `kai14ProofConcReport` → `kai14ProofCleanup` | none (isolated) |
| 3 Real CV ×10 | `kai14Setup` then `kai14RealCvTest` (×10) | writes real candidates (intended) |
| 4 Requirement ×3 | `requirementCreate` + `matchRequirement` | writes real requirements (intended) |
| 5 Shadow 7-day | shadow harness — NOT YET BUILT (see Step 5) | parse-only, no production write |

---

## Evidence Pack (required for EVERY step)

1. **Logs** — full Execution Log text, pasted.
2. **Screenshots** — the relevant sheet tab(s) after the run.
3. **Candidate counts** — rows before / after.
4. **KAI numbers** — the actual issued numbers (range + sample).
5. **Duplicate evidence** — outcome of any dedup decision.
6. **Queue evidence** — `_Queue` (or `_TEST_Queue`) rows created.
7. **Match evidence** — ranked output (Steps 4 only).

A step is **PASS** only when its full Evidence Pack exists and meets the pass condition.

---

## STEP 1 — Sequential Proof (isolated)

**Run:** `kai14ProofSequential`
**Then:** `kai14ProofCleanup` (after capturing evidence)
**Pass condition:** Attempted=100 · Created=100 · Unique=100 · Collisions=0 · VERDICT=PASS
**Evidence:**
- Log line: `Attempted=100 Created=100 Unique=100 Collisions=0 Range=… VERDICT=PASS`
- Screenshot: `_TEST_Candidates` (100 rows, KAINo col 1), `_TEST_Queue` (100 rows)
- KAI numbers: first → last from the log
**Impact:** none — `_TEST_*` sheets + `TEST-KAI` counter only.

---

## STEP 2 — Concurrency Proof (isolated, true parallel)

**Run:** `kai14ProofConcInstall` → wait ~3 min → `kai14ProofConcReport` → `kai14ProofCleanup`
**Pass condition:** CONC rows=500 · Unique=500 · Blank=0 · Collisions=0 · VERDICT=PASS
**Evidence:**
- Install log (5 batches scheduled), Report log (verdict line)
- Screenshot: `_TEST_Candidates` filtered to `CONC_` rows
- Collision count = 0 (this is the legacy-90-collision killer test)
**Impact:** none — isolated.

---

## STEP 3 — 10 Real CV Validation

**Prereq:** `GEMINI_API_KEY` set · `kai14Setup` run once · 10 real CV emails labelled `kai14/intake`.
**Run:** `kai14RealCvTest` once per CV (10 runs), OR `gmailIntakeRun(10)`.
**Pass condition (per CV):** outcome=CREATED · valid KAINo at col 1 · 1 `_Queue` row · candidate row complete; duplicates correctly flagged.
**Evidence (per CV):**
- Log: subject, parse result (trade/exp/nationality), duplicate decision, KAINo, row, queue id
- Screenshot: `Candidates` row + `_Queue` row + `_Logs` entries
- Count: Candidates before/after (= +10 minus any true duplicates)
- Duplicate evidence: any DUPLICATE/CONFLICT/REVIEW outcome with the key that matched
**Impact:** real candidates created (intended — these are the first real KAI14 records).

---

## STEP 4 — 3 Real Requirement Validation

**Run:** `requirementCreate({clientName, trade, quantity, location, minExperience, nationality, priority})` ×3,
then `matchRequirement(reqId)` for each.
**Pass condition:** requirement created FK-clean (ClientID + CampaignID resolve) · match returns ≥1 ranked candidate from Step 3 pool with transparent reasons.
**Evidence (per requirement):**
- Log: REQUIREMENT_CREATED (reqId, clientId), MATCH_RUN (candidates scanned, matched)
- Screenshot: `_Requirements` row, `_Clients` row, match output
- Match evidence: ranked list (KAINo, name, trade, matchScore, reasons)
**Impact:** real requirements created (intended).

---

## STEP 5 — 7-Day Shadow Mode

**Status:** the shadow harness (parse live emails in parallel, write `_KAI14_Shadow`
comparison rows, NO production write) is **specified in the Transition Plan but NOT yet
built.** Building it is the ONE code exception this phase will need.

**DECISION REQUIRED before Step 5:** authorize the minimal shadow harness, or defer Step 5.
Until authorized, Step 5 does not run. Steps 1–4 proceed without it.

**When authorized, pass condition:** ≥50 CVs shadow-parsed over the window · parse parity ≥90%
vs legacy · zero production write from KAI14.
**Evidence:** `_KAI14_Shadow` sheet (ThreadID, K14 vs legacy trade/score, parity), daily log.

---

## Phase Gate

```
Step 1 PASS → Step 2 PASS → Step 3 PASS → Step 4 PASS → Step 5 (on authorization) PASS
        │
        ▼
Runtime Validation COMPLETE → (only then) consider UI / cutover planning
```

No deployment, UI, mobilization, replay, or migration is unlocked until this completes.
