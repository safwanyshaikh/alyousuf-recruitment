# EXECUTION RECONCILIATION
**Phase 5.1 · Compliance remediation document**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED — awaiting approval before any code change
**Governed by:** Execution Constitution §2–§4 · FOUNDATION_BUILD_RULES (Rules 7, 8, 14)
**Triggered by:** 4 violations found in execution_engine_v1.gs compliance audit

> This document maps the frozen constitutional workflow against the current
> implementation, names every divergence, and declares the final frozen workflow
> that all Execution code must conform to. No code changes are made until this
> document is approved.

---

## A. CONSTITUTIONAL WORKFLOW (Execution Constitution §3 — verbatim)

### Execution entities (frozen — exactly 4)
```
Match  →  Submission  →  Selection  →  Mobilization
```
No other Execution entity exists. No shortcut paths. No merged tables.

### State model (§3 — frozen vocabulary)

**Match**
```
MATCHED  →  SHORTLISTED  →  ADVANCED-TO-SUBMISSION
                          →  MATCH-REJECTED
```

**Submission**
```
SUBMITTED  →  AWAITING-CLIENT  →  CLIENT-RESPONDED
                               →  SUBMISSION-WITHDRAWN
```

**Selection**
```
INTERVIEW  →  OFFER  →  SELECTED
                     →  DECLINED
```

**Mobilization**
```
OFFER-ACCEPTED  →  DOCUMENTATION  →  VISA  →  MEDICAL  →  TRAVEL  →  DEPLOYED
                                                                    →  MOBILIZATION-ABORTED
```

### Execution data boundary (Constitution §4)

Execution consumes:
- Foundation truth (read-only): Client, Project, Campaign, Requirement, Associate, Candidate
- K14 outputs (read-only): match scores, assessments, rankings, shortlist signals

Execution produces:
- State transitions with attribution and timestamp
- Raw outcome facts (what happened, when, who, evidence reference)

Execution never produces:
- Reliability scores, quality signals, trust indicators, confidence values
- Performance derivations (SUCCESS/FAILURE classifications)
- Intelligence of any kind — that is K14.OUTCOMES + K14.MEMORY territory

### LOCK 2 — Protected intelligence assets (never written by Execution)
```
_T13_FalseNegative    _T13_GovernanceQueue    _T13_FalsePositive
_T13_ValidationSet    _T13_CompareReport      _T13_FamilyAudit
_AssociateReliability _Commitments            _Taxonomy
```
Read-only. Never modified. Never appended. Execution has no write path to any of these.

---

## B. IMPLEMENTATION WORKFLOW (execution_engine_v1.gs — as built)

### Tabs created by current implementation (9)
```
_ProjectCandidates      (Match entity)
_SubmissionBatches      (Submission entity)
_SubmissionBatchItems   (Submission entity)
_SubmissionPackages     (Submission entity)
_Pipeline               (merged Selection + Mobilization)
_CandidateSubmissionHistory  (audit trail)
_DeploymentOutcomes     (introduced without freeze authority)
```
Plus writes appended to: `_AssociateReliability` (LOCK 2 protected)

### State vocabulary used by `_Pipeline` (as built)
```
SUBMITTED · AWAITING-CLIENT · CLIENT-RESPONDED · SUBMISSION-WITHDRAWN
INTERVIEW · OFFERED · SELECTED · DECLINED
MOBILIZATION · OFFER-ACCEPTED · DOCUMENTATION · VISA · MEDICAL · TRAVEL
DEPLOYED · ABORTED
```

### `captureOutcome` behavior (as built)
```javascript
// Writes reliability signal to LOCK 2 asset:
sheet_AssociateReliability.appendRow([associateId, reqId, MobilizationResult, ...])

// Derives performance intelligence:
const MobilizationResult = (outcomeType === 'DEPLOYED') ? 'SUCCESS' : 'FAILURE'

// Writes to unfrozen tab:
sheet_DeploymentOutcomes.appendRow([pipelineId, outcomeType, MobilizationResult, ...])
```

---

## C. DIVERGENCE MAP

| # | Constitutional requirement | Current implementation | Violation type |
|---|---------------------------|------------------------|----------------|
| 1 | State: `OFFER` (Selection entity) | State: `OFFERED` | Vocabulary divergence |
| 2 | State: `MOBILIZATION-ABORTED` (Mobilization terminal) | State: `ABORTED` | Vocabulary divergence |
| 3 | `MOBILIZATION` is an **entity name**, not a state | `MOBILIZATION` used as a `_Pipeline` state | Entity/state confusion |
| 4 | Selection and Mobilization are **separate entities** with separate tables | Both merged into one `_Pipeline` table | Entity architecture violation |
| 5 | `_AssociateReliability` is LOCK 2 — never written by Execution | `captureOutcome` appends rows to it | LOCK 2 breach |
| 6 | Execution derives no intelligence; `SUCCESS/FAILURE` is K14.OUTCOMES | `MobilizationResult = SUCCESS/FAILURE` derived in Execution | Rule 14 / Constitution §4 breach |
| 7 | Only 4 frozen Execution entities; every tab must map to one | `_DeploymentOutcomes` introduced with no freeze authority | Unfrozen entity |
| 8 | Execution emits raw outcome facts only | `captureOutcome` classifies the outcome before emitting it | Intelligence derivation in Execution |

---

## D. FINAL FROZEN WORKFLOW

### D1 — Frozen tab list (exactly 8 Execution-owned tabs)

| Tab | Maps to entity | Role |
|-----|----------------|------|
| `_ProjectCandidates` | Match | One row per (Requirement, Candidate) pair |
| `_SubmissionBatches` | Submission | Batch header |
| `_SubmissionBatchItems` | Submission | Per-candidate batch line |
| `_SubmissionPackages` | Submission | Package JSON payload |
| `_SelectionPipeline` | Selection | INTERVIEW → OFFER → SELECTED/DECLINED |
| `_MobilizationPipeline` | Mobilization | OFFER-ACCEPTED → … → DEPLOYED/MOBILIZATION-ABORTED |
| `_ExecutionOutcomes` | Outcomes sink | Raw outcome facts; no intelligence derived |
| `_CandidateSubmissionHistory` | Audit trail | Append-only event log for all entities |

`_Pipeline` (merged) is **retired**. Selection and Mobilization get separate tabs.
`_DeploymentOutcomes` is **retired**. Raw outcome facts go to `_ExecutionOutcomes`.
`_AssociateReliability` is **never touched** by any Execution function.

### D2 — Frozen state vocabulary (exact strings — no variants permitted)

**Match** (`_ProjectCandidates.MatchStatus`)
```
MATCHED · SHORTLISTED · ADVANCED-TO-SUBMISSION · MATCH-REJECTED
```

**Submission** (`_SubmissionBatches.BatchStatus`)
```
DRAFT · SUBMITTED · AWAITING-CLIENT · CLIENT-RESPONDED · SUBMISSION-WITHDRAWN
```

**Selection** (`_SelectionPipeline.SelectionStatus`)
```
INTERVIEW · OFFER · SELECTED · DECLINED
```

**Mobilization** (`_MobilizationPipeline.MobilizationStatus`)
```
OFFER-ACCEPTED · DOCUMENTATION · VISA · MEDICAL · TRAVEL · DEPLOYED · MOBILIZATION-ABORTED
```

### D3 — `_ExecutionOutcomes` schema (raw facts only — no derived intelligence)

| Column | Type | Rule |
|--------|------|------|
| `OutcomeID` | String | System-generated `OUT-YYYYMMDD-NNNN` |
| `EntityType` | Enum | `MATCH · SUBMISSION · SELECTION · MOBILIZATION` |
| `EntityID` | String | FK to the relevant entity row |
| `RequirementID` | String | FK → `_Requirements.ReqID` |
| `CandidateKaiNo` | String | FK → `Candidates.KAI No` |
| `OutcomeType` | String | Raw event name (e.g., `DEPLOYED`, `MOBILIZATION-ABORTED`, `CLIENT-RESPONDED`) |
| `OutcomeAt` | DateTime | When the event occurred |
| `EvidenceRef` | String | Document ID, email ID, or note — recruiter-provided |
| `RecordedBy` | String | Actor attribution (mandatory) |
| `RecordedAt` | DateTime | System timestamp |

**Prohibited columns (never added to `_ExecutionOutcomes`):**
`MobilizationResult · SuccessFlag · ReliabilitySignal · QualityScore · PerformanceRating`
— all of these are K14.OUTCOMES / K14.MEMORY territory.

### D4 — `captureOutcome` revised contract

**Before (violation):**
```
captureOutcome(pipelineId, outcomeType, evidence, actor)
  → derives MobilizationResult = SUCCESS/FAILURE          ← FORBIDDEN
  → appends to _AssociateReliability                       ← LOCK 2 BREACH
  → appends to _DeploymentOutcomes                         ← UNFROZEN TAB
```

**After (frozen):**
```
captureOutcome(entityType, entityId, reqId, kaiNo, outcomeType, evidenceRef, actor)
  → validates outcomeType against frozen vocabulary for entityType
  → appends one raw-fact row to _ExecutionOutcomes         ← Execution-owned, frozen
  → appends audit entry to _CandidateSubmissionHistory     ← frozen audit trail
  → returns outcomeId
  → NOTHING ELSE. No derivation. No LOCK 2 touch. No intelligence.
```

K14.OUTCOMES reads `_ExecutionOutcomes` and derives reliability, quality, and
performance signals independently. Execution has no knowledge of that derivation.

### D5 — Architecture boundary diagram

```
Foundation (truth)
  _Clients · _Projects · _Campaigns · _Requirements · _Associates · Candidates
       ↓ (read-only)
K14 (intelligence)
  INTAKE → CLASSIFY → MEMORY → REASON → VALIDATE → OUTCOMES → LEARN
       ↓ (K14 outputs: match scores, rankings, assessments — read-only)
Execution (actions)
  _ProjectCandidates → _SubmissionBatches/Items/Packages → _SelectionPipeline
                                                         → _MobilizationPipeline
       ↓ (raw outcome facts only)
  _ExecutionOutcomes  ←  captureOutcome (no derivation)
       ↓ (K14 reads for learning)
K14.OUTCOMES → K14.MEMORY (derives reliability, quality, trust — never Execution's job)
```

---

## E. IMPACT ON execution_engine_v1.gs

When this reconciliation is approved, the following changes will be made (no changes before):

| Violation | Change required |
|-----------|-----------------|
| LOCK 2 breach (`_AssociateReliability`) | Remove all write paths to `_AssociateReliability` from `captureOutcome` |
| Intelligence derivation (`MobilizationResult`) | Delete the `SUCCESS/FAILURE` derivation; emit raw `outcomeType` only |
| Unfrozen tab (`_DeploymentOutcomes`) | Retire `_DeploymentOutcomes`; replace with `_ExecutionOutcomes` per D3 schema |
| Vocabulary divergence (`OFFERED`, `ABORTED`, `MOBILIZATION` state) | Adopt frozen vocab from D2 exactly; split `_Pipeline` into `_SelectionPipeline` + `_MobilizationPipeline` |

After approved changes: full re-audit against this reconciliation document.
If zero violations remain: issue `EXECUTION ENGINE APPROVED`.

---

## FREEZE DECLARATION

```
EXECUTION_RECONCILIATION.md     ◀ this document (awaiting approval)
```

On approval:
1. Apply the 4 changes in §E to `execution_engine_v1.gs` — no other changes.
2. Re-audit `execution_engine_v1.gs` against this document.
3. If violations = 0: issue **EXECUTION ENGINE APPROVED**.
4. Only then: proceed with Foundation migration scripts in order.

**No code changes before this document is approved.**
