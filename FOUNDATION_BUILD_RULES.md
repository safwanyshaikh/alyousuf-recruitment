# FOUNDATION BUILD RULES (LOCKED)
**Phase 5 governance · Binding on every Foundation code commit**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** LOCKED (CEO-approved)

> These eleven rules bind every line of Foundation code in Phase 5. No commit may
> violate them. They sit above the implementation plan: where the plan and a rule
> disagree, the rule wins.

---

## THE ELEVEN RULES

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
