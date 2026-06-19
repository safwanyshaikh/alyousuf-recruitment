# EXECUTION CONSTITUTION — KAI OS Operations Layer
**Phase 3 deliverable · Governing operations constitution · No code, no workflow, no UI**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-19 · **Status:** PROPOSED → awaiting approval before Phase 4

> This is not a technical design, a workflow document, or a UI document.
> It defines how recruitment operations move through the system — the governing
> rules of action. A future engineer must be able to build the entire operational
> workflow of KAI OS from this document alone, without seeing any code.

---

## EXECUTION DOCTRINE (Pre-Phase 3 Lock — supreme over all sections)

```
Foundation stores FACTS.
K14        interprets FACTS.
Execution  performs ACTIONS.
```

- Execution **never creates intelligence.**
- Execution **never creates truth.**
- Execution **consumes Foundation facts and K14 outputs. Nothing else.**
- Execution **produces OUTCOMES**, which return to K14 as evidence.

Every principle below serves this doctrine.

---

## 1. EXECUTION PURPOSE

1. Execution exists to **move recruitment operations forward** — to turn a reasoned
   recommendation into a real-world result.
2. Execution is the **only layer that acts.** Foundation records, K14 reasons,
   Execution does.
3. Execution **produces outcomes, not opinions** — its product is what actually
   happened (a submission sent, a candidate selected, a worker deployed), never a
   judgment about what should happen.
4. Execution **operates strictly on inputs it does not own:** Foundation facts (truth)
   and K14 outputs (interpretation). It adds operational records, never new truth or
   new intelligence.

---

## 2. EXECUTION ENTITIES

Execution governs **exactly four** entities — no more:

```
MATCH → SUBMISSION → SELECTION → MOBILIZATION
```

1. **Match** — a candidate associated to a requirement as a potential fit.
2. **Submission** — a candidate formally presented to a client for a requirement.
3. **Selection** — a client's decision outcome on a submitted candidate.
4. **Mobilization** — the movement of a selected candidate to deployment.

No fifth execution entity may be created. Anything that is not one of these four is
either Foundation (a fact), K14 (an interpretation), or out of scope.

---

## 3. EXECUTION STATE MODEL

Each entity advances through governed states. States are **valid**, **invalid**, or
**terminal**. Movement is forward through valid states; terminal states close the
entity.

| Entity | Valid (in-progress) | Terminal |
|--------|---------------------|----------|
| Match | MATCHED · SHORTLISTED | ADVANCED-TO-SUBMISSION · MATCH-REJECTED |
| Submission | SUBMITTED · AWAITING-CLIENT | CLIENT-RESPONDED · SUBMISSION-WITHDRAWN |
| Selection | INTERVIEW · OFFER | SELECTED · DECLINED |
| Mobilization | OFFER-ACCEPTED · DOCUMENTATION · VISA · MEDICAL · TRAVEL | DEPLOYED · MOBILIZATION-ABORTED |

**Principles:**
1. **Invalid state = any transition whose required evidence is absent** (Mandatory Rule
   7). It is refused, not forced.
2. **Forward-only by default.** Backward movement occurs only where governance explicitly
   permits reversal (Section 9 / Mandatory Rule 9).
3. **A terminal state is closed.** It is not silently re-opened; a new entity instance is
   created if operations must resume.
4. The candidate's own status (Foundation-governed state machine) mirrors execution
   progress; Execution requests the transition, Foundation records it — Execution never
   edits truth directly (Mandatory Rule 3).

---

## 4. MATCH CONSTITUTION

1. **A match is a K14-evidenced fit** between a candidate and a requirement. It exists
   because K14 reasoned that the evidence supports a fit.
2. **K14 provides:** the Match, its Rank, its Risk, its Readiness signal, and the
   reasoning and confidence behind them.
3. **Recruiters decide:** which matches to advance. K14 recommends; the recruiter
   selects. A match never auto-advances.
4. **A match is not a submission.** Advancing a match to submission is a separate,
   recruiter-authored action subject to the Submission Constitution.
5. **Rejected matches are evidence.** A recruiter declining a match feeds K14 as a
   correction (the supreme learning signal).

---

## 5. SUBMISSION CONSTITUTION

1. **A submission is the formal presentation of a candidate to a client** for a specific
   requirement.
2. **Required evidence (before submission):** candidate readiness, document/compliance
   sufficiency, valid consent, and requirement-fit minimums — all validated by K14
   (Mandatory Rule 2). Missing evidence blocks the submission (Mandatory Rule 7).
3. **Required approvals:** a recruiter must authorize the submission. No candidate is
   submitted without an attributable human approval (Section 8).
4. **A submission targets a Foundation-resolved client/requirement** under the mandatory
   hierarchy (Client→Project→Campaign→Requirement). Execution cannot submit against an
   orphan or an unresolved target (Mandatory Rule 1).
5. **Every submission outcome is recorded and returned to K14.OUTCOMES** (Mandatory Rule
   8) — submitted, acknowledged, advanced, or rejected.

---

## 6. SELECTION CONSTITUTION

1. **Selection is owned by the client.** The client's response is the authority; K14 and
   the recruiter capture and interpret it, they do not author it.
2. **Client response** — acknowledgement, shortlist, or rejection of the submission — is
   captured as evidence and timestamped.
3. **Interview outcome** — scheduled, held, passed, failed, no-show — is captured per
   candidate as client-driven evidence.
4. **Offer outcome** — offer made, accepted, declined, withdrawn — is captured.
5. **Selection outcome** — SELECTED or DECLINED — is the terminal client decision.
6. **All selection evidence returns to K14.OUTCOMES** as ground truth (Mandatory Rule 8),
   superseding any prior K14 prediction about that candidate.

---

## 7. MOBILIZATION CONSTITUTION

Mobilization moves a **selected** candidate toward deployment through gated steps. Each
step has a hard prerequisite; **no candidate moves to a later stage if required evidence
is missing** (Mandatory Rule 7).

| Step | Must exist before movement |
|------|----------------------------|
| Documentation | Required documents present and valid |
| Visa | Documentation complete; visa evidence issued/valid |
| Medical | Visa stage cleared; medical result meets the required standard |
| Travel | Medical cleared; travel/commitment evidence in place |
| Deployment | All prior gates satisfied; deployment confirmed |

**Principles:**
1. **Selection is the prerequisite of mobilization.** Mobilization cannot begin without a
   terminal SELECTED outcome.
2. **Gates are sequential and evidence-bound.** A later gate cannot open while an earlier
   gate's evidence is absent.
3. **Compliance and consent remain hard gates** throughout (K14 Constitution §5).
4. **Each mobilization result (including abort and its reason) returns to K14.OUTCOMES**
   (Mandatory Rule 8) and informs associate reliability and future reasoning.
5. **DEPLOYED is terminal** — the operational goal of the entire system.

---

## 8. EXECUTION AUDIT TRAIL

1. **Every action is attributable** to one of: **Recruiter · Associate · Client ·
   System** (Mandatory Rule 5). No anonymous actions.
2. **Every state transition is auditable** — who, what, from-state, to-state, when, and
   why (Mandatory Rule 6).
3. **Nothing is hidden and nothing is anonymous.** An action without an actor and a
   timestamp is invalid and is refused.
4. **The audit trail is append-only.** Records are added, never overwritten or deleted;
   corrections are new entries that reference the prior state.
5. **The trail is the source of operational history** that feeds K14.OUTCOMES and
   K14.MEMORY — making every result traceable to the decision and actor that produced it.

---

## 9. EXECUTION GOVERNANCE — what Execution may NEVER do

1. **Never bypass Foundation** (Mandatory Rule 1) — no action against an unresolved or
   orphan entity.
2. **Never bypass K14 validation** (Mandatory Rule 2) — no consequential step without the
   K14 gate.
3. **Never modify Foundation truth** (Mandatory Rule 3) — Execution requests truth
   changes; Foundation records them.
4. **Never create intelligence** (Mandatory Rule 4) — no scoring, matching, ranking, or
   assessment inside Execution; those are K14's alone.
5. **Never act without attribution** (Mandatory Rule 5).
6. **Never transition without an audit record** (Mandatory Rule 6).
7. **Never advance a candidate past a missing evidence gate** (Mandatory Rule 7).
8. **Never withhold an outcome from K14.OUTCOMES** (Mandatory Rule 8).
9. **Never reverse a state except where governance explicitly permits** (Mandatory Rule
   9).
10. **Never substitute opinion for outcome** (Mandatory Rule 10) — Execution records what
    happened, never what it thinks should happen.

---

## 10. EXECUTION NON-NEGOTIABLE RULES (permanent)

1. Execution cannot bypass Foundation.
2. Execution cannot bypass K14 validation.
3. Execution cannot modify Foundation truth.
4. Execution cannot create intelligence.
5. Every action must be attributable to: Recruiter · Associate · Client · System.
6. Every state transition must be auditable.
7. No candidate may move to a later stage if required evidence is missing.
8. Submission, Selection, and Mobilization outcomes must feed K14.OUTCOMES.
9. Execution is reversible only where governance permits.
10. Execution exists to produce outcomes, not opinions.

These rules are permanent. Implementations may change across versions; these rules do
not.

---

## SUCCESS CONDITION

When complete, a future engineer can build the entire operational workflow of KAI OS
from the three constitutions alone:
```
Foundation explains TRUTH.
K14        explains INTELLIGENCE.
Execution  explains OPERATIONS.
```

## PHASE BOUNDARY
No code, no technical design, no workflow diagrams, no UI. Governing principles only.

```
PHASE 0  Reality Map             ✓ complete
PHASE 1  Foundation Constitution ✓ complete
PHASE 2  K14 Constitution        ✓ complete
PHASE 3  Execution Constitution  ◀ this document (awaiting approval)
PHASE 4  Technical Architecture
PHASE 5  Implementation
```

**STOP. Await approval before Phase 4.**
