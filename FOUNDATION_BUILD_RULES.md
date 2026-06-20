# FOUNDATION BUILD RULES (LOCKED)
**Phase 5 governance · Binding on every Foundation code commit**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** LOCKED (CEO-approved)

> These fifteen rules bind every line of Foundation code in Phase 5. No commit may
> violate them. They sit above the implementation plan: where the plan and a rule
> disagree, the rule wins.

---

## THE FIFTEEN RULES

| # | Rule |
|---|------|
| 1 | **No existing data deletion.** No row is ever removed. |
| 2 | **No column renaming.** Existing columns keep their headers; new fields are added beside them. |
| 3 | **No sheet replacement.** Tabs are reconciled in place, never dropped and recreated. |
| 4 | **New columns are additive only.** Schema changes append; they never overwrite or reorder destructively. |
| 5 | **Every migration must be reversible.** A documented rollback restores the prior state. |
| 6 | **Every entity must pass acceptance criteria before the next entity starts.** Six sequential gates. |
| 7 | **No K14 fields inside Foundation.** Intelligence output never enters the truth layer. |
| 8 | **No Execution fields inside Foundation.** Match/Submission/Selection/Mobilization state stays out. |
| 9 | **No AI-generated values written into Foundation** except governed fields already approved (today: `Trade` with `Trade Source = AI`). |
| 10 | **Every commit must include rollback instructions.** No exceptions. |
| 11 | **No existing column may change meaning.** If a meaning changes, create a new column. Never repurpose an old column. |
| 12 | **Foreign keys are immutable after creation, and no child may be orphaned.** A child's parent FK is never reassigned; create a new record instead. Every child must resolve to a live parent. |
| 13 | **Campaign is mandatory for every Requirement.** The only creation path is Client → Project → Campaign → Requirement. No direct Client→Requirement or Project→Requirement path exists. No migration may guess a parent: missing FK → lock for human resolution, never infer/auto-map/AI-map/nearest-match. |
| 14 | **Foundation stores identity, not performance.** Who an entity *is* lives in Foundation; how well it *performs* lives in K14 (Outcomes + Memory). No reliability, fill-rate, or success-count field ever enters a Foundation tab. |
| 15 | **UI owns presentation only — never data.** A screen may display data from many layers but owns none of it. Foundation owns truth, K14 owns intelligence, Execution owns actions, UI owns layout. No business logic, scoring, matching, or decision rule lives in a UI page. |

---

## RULE 15 — UI OWNERSHIP

A screen may **display** data from multiple layers. A screen may **never own** data or
logic.

```
Foundation   owns TRUTH
K14          owns INTELLIGENCE
Execution    owns ACTIONS
UI           owns PRESENTATION only
```

Example (Candidate page):
```
Candidate Name   → Foundation
Submitted        → Execution
Readiness        → K14
Candidate Screen → owns NONE of them (presentation only)
```

This guarantees any UI — Lovable, SaaS, React, Flutter, mobile, dashboard, API — can be
connected or swapped without changing architecture, because KAI already owns truth,
actions, and intelligence separately. No developer may put scoring, matching, validation,
or decision logic inside a UI page; that logic belongs to Foundation, K14, or Execution.

---

## RULE 14 — IDENTITY vs PERFORMANCE

Foundation answers **who** an entity is. K14 answers **how well** it performs. The two
never share a column.

```
FOUNDATION (identity)        K14 (performance — Outcomes + Memory)
  who the Associate is         how well the Associate performs
  name, license, type,         reliability, fill rate, submission
  coverage, contact,           success, selection success,
  specialization, status       mobilization success, rating
```

Applies to every entity, most visibly the Associate: Foundation links to the Associate;
K14 judges the Associate. Performance metrics are derived by `K14.OUTCOMES` → `K14.MEMORY`
from execution history (evidenced today by `_AssociateReliability`, `_Commitments`) — they
are never written back into the Foundation master.

---

## RULE 13 — CAMPAIGN-MANDATORY + NO-GUESS MIGRATION

**Campaign-Mandatory.** A Requirement cannot exist without a Campaign. The creation path
is fixed and has no bypass:

```
Client
 → Project
   → Campaign
     → Requirement     (CampaignID is mandatory and non-null)
```

```
FORBIDDEN   Client → Requirement        (no such path)
FORBIDDEN   Project → Requirement       (no such path)
REQUIRED    Client → Project → Campaign → Requirement
```

The Requirement write engine refuses any write whose `CampaignID` is null or unresolved.

**No-Guess Migration (global, all entities).** When a parent FK is missing or ambiguous,
the record is **locked for human resolution**. The system never:

```
✗ infers a parent
✗ auto-maps by name
✗ AI-maps
✗ nearest-matches
```

Resolution states: `NEEDS_PROJECT_FK` · `NEEDS_CAMPAIGN_FK` · `CLIENT_UNRESOLVED`. A
locked record is excluded from operations until a recruiter confirms the parent. Only a
single, unambiguous, deterministic match may auto-resolve; anything else waits for a
human. This supersedes any "create a default parent" step in the implementation plan.

---

## RULE 12 — FK IMMUTABILITY + NO ORPHANS

**Immutability.** Once a record is created with a parent FK, that FK is frozen for the
life of the record. Reassigning ownership breaks historical auditability.

```
BAD   Project P attached to ClientID=C123  →  later reassigned to ClientID=C999
GOOD  Project P keeps ClientID=C123 forever  →  create a NEW Project under C999
```

Applies to every FK in the chain: Project.ClientID · Campaign.ClientID ·
Campaign.ProjectID · Requirement.CampaignID/ProjectID/ClientID · Candidate.SourceAssociate
/SourceCampaign.

**No orphans.** Every child must resolve to a live parent at write time. The hierarchy is
permanent and enforced top-down:

```
Client
 → Project      (Project MUST belong to a Client)
   → Campaign   (Campaign MUST belong to a Project AND a Client)
     → Requirement   (Requirement MUST belong to a Campaign — Campaign-Mandatory Rule)
       → Associate
         → Candidate
```

A child with a missing or unresolvable parent FK is **refused**, never silently created.
Consistency is enforced: a Campaign's ClientID must equal its Project's ClientID.

---

## RULE 11 — MEANING IS IMMUTABLE

An existing column's **meaning** is frozen, not just its header (Rule 2). If governance
needs a different meaning, a new column is created beside the legacy one.

```
BAD   Status (old meaning)  →  reuse for new governed meaning
GOOD  Status (legacy, untouched)  +  FoundationStatus (new governance)
```

This applies to value vocabularies too: legacy free-text values stay in the legacy
column; the governed vocabulary lives in the new column, derived from the legacy value
at migration time.

**Universal pattern for every future entity:**
```
OLD COLUMN  → stays (header AND meaning untouched)
NEW COLUMN  → added
MIGRATION   → copy / derive the new value from the old
```

Examples (Project/Campaign):
```
Client            stays   →   ClientID (new FK) + ClientName (new DEN) added
TotalPositions    stays   →   MobilizationTarget added (if distinct meaning)
TotalHeads        stays   →   TargetHeadcount added (if distinct meaning)
Status            stays   →   FoundationStatus added (governed vocabulary)
```

This protects existing formulas, scripts, dashboards, imports, reports, and recruiter
workflows while letting Foundation evolve.

---

## PLAN RECONCILIATION (Rule 2 override)

The Foundation Implementation Plan proposed renaming three live columns. **Rule 2
forbids renaming.** These are corrected to additive operations:

| Entity | Plan said (rename) | Rule-2 correction (additive) |
|--------|--------------------|------------------------------|
| Project | `Client` → `ClientName` | Keep `Client` column as-is; **add** new `ClientName` (DEN) + `ClientID` (FK) columns |
| Project | `TotalPositions` → `Mobilization Target` | Keep `TotalPositions`; **add** `Mobilization Target` if a distinct meaning is needed, else reuse `TotalPositions` in place |
| Campaign | `TotalHeads` → `Target Headcount` | Keep `TotalHeads`; **add** `Target Headcount` only if semantically distinct, else reuse in place |

**Client (Step 1) has no renames.** Under Rule 11 the legacy `Status` column is left
untouched and a new governed `FoundationStatus` column is added beside it (rather than
normalizing `Status` in place).

---

## COMMIT REQUIREMENT (Rule 10)

Every Foundation commit message MUST contain a `ROLLBACK:` block describing:
1. Which columns/values were added or changed.
2. The exact reverse operation to restore the prior state.
3. Confirmation that no data was deleted (Rule 1) and no column renamed (Rule 2).

---

## ACCEPTANCE GATE (Rule 6)

No entity's code is written until the entity's one-page FINAL freeze document is
approved. Build order and freeze gates:

```
Step 1  CLIENT_ENTITY_FINAL.md       → foundation_client_v1.gs
Step 2  PROJECT_ENTITY_FINAL.md      → foundation_project_v1.gs
Step 3  CAMPAIGN_ENTITY_FINAL.md     → foundation_campaign_v1.gs
Step 4  REQUIREMENT_ENTITY_FINAL.md  → foundation_requirement_v1.gs
Step 5  ASSOCIATE_ENTITY_FINAL.md    → foundation_associate_v1.gs
Step 6  CANDIDATE_ENTITY_FINAL.md    → foundation_candidate_fk_v1.gs
```

Client is frozen first because every downstream entity carries a ClientID FK; a later
Client change cascades through all six. Freeze the root, then build.

**These rules are permanent for Phase 5.**
