# KAI14-Core — Artifact 11: Live Operational Transition Plan

**Status:** SPECIFICATION ONLY — no code exists.
**Rule:** This document must be internally consistent with KAI14_PHASE0_ARTIFACTS.md before any approval.
**Premise:** KAI OS is LIVE. jobs@alyousufent.com is receiving CVs today. Recruiters are working daily.
KAI14 cannot be designed like a greenfield startup.

---

## The 10 Transition Questions (answered)

**Q1. During KAI14 build, where do new CVs go?**
Legacy KAI OS. Legacy remains the system of record from today until Phase 2 cutover.
New CVs continue to route to `ai@alyousufent.com` → legacy pipeline untouched.

**Q2. Are they stored in legacy Candidates or KAI14 Candidates?**
Legacy `Candidates` sheet. During Phase 1 (shadow), KAI14 also parses the same emails
but writes ONLY to `_KAI14_Shadow` (a staging sheet). No production write from KAI14
until Phase 2 is declared.

**Q3. How are recruiters working while migration happens?**
Exactly as today — legacy dashboard, legacy `Candidates` sheet. Zero disruption.
KAI14 is invisible to recruiters until Phase 2 go-live.

**Q4. What happens to today's incoming CVs?**
Parsed and stored by legacy (unchanged). Simultaneously shadow-parsed by KAI14 (Phase 1).
Shadow output is compared against legacy output to validate K14 parse quality.
No action taken on shadow output; recruiter never sees it.

**Q5. What happens to Jan 2026 → Today backlog CVs?**
FROZEN. `backfillCVs` and `runBacklogClearance` remain disabled (Mission Zero mandate).
Backlog is addressed ONLY after Phase 2 cutover is proven stable. Sequence:
  Phase 2 stable (≥7 days) → CEO approval → backlog replay in controlled batches.
Backlog CVs enter KAI14 directly (not legacy) when replay is enabled.

**Q6. When does legacy stop accepting new candidates?**
Phase 2 cutover day (TBD by CEO). After that day, legacy intake trigger is disabled;
KAI14 intake trigger is the only active processor. Legacy sheet becomes read-only.

**Q7. What is the exact cutover day?**
Not set here — CEO decides. Prerequisites that must be met before cutover can be declared:
  (a) KAI14 isolation proof: 100 sequential + 5×100 concurrent, 0 collisions.
  (b) KAI14 real CV proof: 1 real Gmail CV → candidate → KAI → queue → match evidenced.
  (c) Shadow comparison: ≥50 CVs parsed in shadow, K14 parse parity ≥ 90%.
  (d) Migration dry-run: CLEAN legacy rows imported to KAI14 staging, row-count reconciled.
  (e) Rollback tested: rollback procedure executed successfully in staging.
  (f) CEO approval on all five above.

**Q8. How do you rollback if KAI14 fails?**
Rollback procedure (see Phase 2 section below):
  Step 1 — Re-enable legacy intake trigger (one click, Apps Script editor).
  Step 2 — Disable KAI14 intake trigger (one click).
  Step 3 — KAI14 `Candidates` sheet is preserved read-only for forensics.
  Step 4 — Legacy `Candidates` resumes as system of record.
  Recovery time: < 5 minutes. No data loss (KAI14 rows preserved, never deleted).
Rollback window: 7 days post-cutover. After 7 stable days, legacy is archived (Phase 4).

**Q9. How do you prevent duplicate candidates across legacy and KAI14 during transition?**
Three controls:
  (a) During Phase 1 (shadow): KAI14 writes ONLY to `_KAI14_Shadow` — no production
      `Candidates` rows, so no cross-system duplicates possible.
  (b) At Phase 2 cutover: Migration step imports legacy CLEAN rows into KAI14 first,
      with `LegacyKAINo` in audit column. KAI14 `_Meta` dedup index is pre-populated
      from legacy `_Meta` before the first live KAI14 intake run.
  (c) Post-cutover: legacy intake trigger is disabled immediately at cutover.
      The two systems are never simultaneously writing production candidates.

**Q10. How do you migrate active requirements currently being worked by recruiters?**
  Step 1 — Freeze: snapshot `_Requirements` at cutover day T-0.
  Step 2 — Import: all OPEN requirements imported to KAI14 `_Requirements` with fresh
            `AYE-REQ-*` IDs. LegacyReqID preserved in audit column.
  Step 3 — Remap: any `_Queue` or candidate `RequirementID` links updated to new IDs.
  Step 4 — Recruiters: handed a mapping sheet (LegacyReqID → KAI14ReqID) on cutover day.
  CLOSED requirements are not migrated — they are archived in legacy read-only.

---

## Four-Phase Transition (CEO-defined)

```
Phase 0  Legacy = system of record     (NOW — until KAI14 proofs complete)
Phase 1  KAI14 shadow mode             (parallel parse, no production write)
Phase 2  KAI14 primary                 (cutover, legacy read-only, rollback window)
Phase 3  Legacy read-only              (KAI14 only accepts new CVs)
Phase 4  Legacy archived               (after 7-day stable window)
```

---

## PHASE 0 — Legacy Remains System of Record

**Duration:** Today → until Phase 1 prerequisites met.
**What runs:** Legacy pipeline only. KAI14 code is being built and tested in isolation.

| System | Role | Writes to |
|--------|------|-----------|
| Legacy KAI OS | ACTIVE | `Candidates`, `_Meta`, `_ProcessingQueue` |
| KAI14-Core | BUILD / TEST | `_TEST_Candidates`, `_TEST_Meta`, `_TEST_Queue` (isolated) |

**Recruiter experience:** Unchanged. Legacy dashboard, legacy data, zero disruption.

**Phase 0 exits when (all required):**
- [ ] 10 Phase 0 artifacts approved by CEO.
- [ ] KAI14 isolation proof passed (0 collisions, 0 production impact).
- [ ] 1 real CV end-to-end proof passed in KAI14 staging.

---

## PHASE 1 — KAI14 Shadow Mode

**Duration:** Shadow start → ≥50 CVs compared → CEO declares Phase 2 ready.
**What runs:** Legacy pipeline (production) + KAI14 parser (shadow, no production write).

```
Email arrives at ai@alyousufent.com
        │
        ├──► Legacy pipeline     → writes Candidates (production)
        │
        └──► KAI14 parser        → writes _KAI14_Shadow (staging only, NOT production)
                                   NO KAI minted. NO queue entry. NO recruiter visibility.
```

**Shadow comparison sheet `_KAI14_Shadow`:**

| Column | Value |
|--------|-------|
| `ThreadID` | Gmail thread ID (join key to legacy) |
| `LegacyKAINo` | KAI assigned by legacy |
| `K14_ParsedTrade` | KAI14 K14 parse result |
| `Legacy_Trade` | Legacy parse result |
| `K14_Score` | KAI14 score |
| `Legacy_Score` | Legacy score |
| `ParseParity` | MATCH \| DIFF \| MISS |
| `DeltaNotes` | Any difference detail |

**Acceptance threshold:** ≥90% `ParseParity = MATCH` across ≥50 CVs.

**Phase 1 exits when (all required):**
- [ ] ≥50 shadow CVs parsed.
- [ ] Parse parity ≥ 90%.
- [ ] Migration dry-run complete (CLEAN rows imported to KAI14 staging, row-count reconciled).
- [ ] Rollback procedure tested successfully.
- [ ] CEO approves cutover date.

---

## PHASE 2 — KAI14 Becomes Primary (Cutover)

**Cutover day T-0 (CEO-declared). Sequence executed in order. No step skipped.**

```
T-0  08:00  Recruiter notification: "System maintenance window 08:00–10:00."
T-0  08:05  Legacy intake trigger DISABLED (Apps Script editor, one click).
T-0  08:10  MIGRATION RUN:
              (a) CLEAN legacy rows → KAI14 Candidates (fresh AYE-KAI, LegacyKAINo audit col).
              (b) Legacy _Meta → KAI14 _Meta (dedup index pre-populated).
              (c) OPEN requirements → KAI14 _Requirements (fresh AYE-REQ, LegacyReqID audit col).
              (d) Row-count assertion: CLEAN_migrated + quarantined = 10,314. If fails → ABORT.
T-0  09:00  KAI14 intake trigger ENABLED.
T-0  09:05  SMOKE TEST: send one real CV → verify KAI14 Candidate row + KAI + Queue entry.
T-0  09:15  Recruiter notification: "KAI14 is live. New dashboard link."
T-0  09:20  Legacy dashboard marked read-only with banner: "Archived — view only."
```

**Rollback trigger:** any smoke test failure or CEO call during 08:00–10:00 window.

**Rollback steps (< 5 min):**
```
Step 1  Disable KAI14 intake trigger.
Step 2  Re-enable legacy intake trigger.
Step 3  Notify recruiters: "Maintenance extended. Legacy resumes."
Step 4  KAI14 rows preserved read-only for forensics.
```

**Rollback window:** 7 calendar days post-cutover. After 7 stable days → Phase 4.

---

## PHASE 3 — Legacy Read-Only

**What changes:** Legacy `Candidates` sheet and dashboard are read-only.
Recruiters use KAI14 console exclusively for new work.
Legacy data remains accessible for historical reference (open requirements, existing candidates).

**Active requirements:** recruiters work from KAI14 `_Requirements` (migrated at cutover).
Legacy requirements remain queryable but no new matches run against them.

---

## PHASE 4 — Legacy Archived

**Triggered by:** 7 days post-cutover with zero rollback events + CEO approval.

```
Action 1   Legacy Apps Script project triggers all disabled.
Action 2   Legacy spreadsheet permissions set to View Only.
Action 3   Legacy spreadsheet renamed: "KAI OS Legacy — Archived YYYY-MM-DD".
Action 4   KAI14 _Migration_KAIMap sheet (LegacyKAINo → KAI14KAINo) preserved permanently.
Action 5   Quarantine sheet _Migration_Quarantine preserved for identity repair work.
```

Legacy data is never deleted. It is the forensic record for the 90 collisions, 2,386 duplicates, and provenance of 10,314 rows. The repair of quarantined records (collision clusters, duplicate clusters) is a separate post-archive workstream, CEO-scheduled.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| KAI14 parse quality < 90% parity | MED | HIGH | Extend Phase 1 shadow; retune K14 prompts; do not proceed to Phase 2. |
| Migration row-count mismatch | LOW | HIGH | Abort cutover; investigate; re-run after fix. |
| Rollback needed post-cutover | LOW | MED | Rollback procedure tested before cutover; < 5 min recovery. |
| Cross-system duplicates during transition | LOW | HIGH | Legacy trigger disabled before KAI14 trigger enabled; never simultaneous. |
| Active requirement data loss | LOW | HIGH | Requirements migrated with LegacyReqID audit; mapping sheet given to recruiters. |
| Backlog CVs entering KAI14 prematurely | NONE | HIGH | backfillCVs / runBacklogClearance remain disabled; CEO-gated re-enable. |

---

## Consistency Check Against Artifact 10 (Acceptance Criteria)

Every Phase 2 prerequisite maps directly to an Artifact 10 acceptance criterion:

| Artifact 10 Criterion | Phase 1 Gate |
|-----------------------|--------------|
| Real Email processed | Smoke test T-0 09:05 |
| Real Parse (Trade+Exp+Nat non-empty) | Shadow parity ≥ 90% |
| Real Duplicate Check logged | Shadow comparison + Migration dedup pre-population |
| Real Candidate row | Smoke test T-0 09:05 |
| Real KAI (col 1, format valid) | Smoke test T-0 09:05 |
| Real Queue entry | Smoke test T-0 09:05 |
| Real Requirement (FK-clean) | Migration dry-run |
| Real Match returned | Phase 1 matching validation |
| Attributable logs | _Logs entry verified per event |

No criterion is gated on legacy data; all criteria are KAI14-native.

---

## APPROVAL GATE (both documents required)

```
KAI14_PHASE0_ARTIFACTS.md        → CEO review
KAI14_OPERATIONAL_TRANSITION_PLAN.md → CEO review
        │
        ▼ ONLY when both approved
Write ONLY these files:
  foundation/candidate.gs
  intake/gmail_intake.gs
  intake/duplicate_engine.gs
  infrastructure/kai_generator.gs   (single writer)
  infrastructure/queue.gs
  k14/matching.gs
```

Nothing else. Every other file in the repo tree is created only when the function above it
in the runtime flow is proven working on real data.
