# FOUNDATION IMPLEMENTATION MASTERPLAN
**Final governance artifact before code · Construction sequence only**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → on approval, foundation_client_v1.gs is authorized
**Governed by:** FOUNDATION_BUILD_RULES (15 rules) · six approved entity freezes

> The governance layer is complete. This is the construction sequence — build order,
> dependencies, rollback, validation, acceptance. No code, no schema changes, no
> implementation. Just the order in which Foundation is built.

---

## BUILD ORDER

```
1  Client       foundation_client_v1.gs
2  Project      foundation_project_v1.gs
3  Campaign     foundation_campaign_v1.gs
4  Requirement  foundation_requirement_v1.gs
5  Associate    foundation_associate_v1.gs
6  Candidate    foundation_candidate_fk_v1.gs
```

One entity at a time. Each must pass acceptance (Rule 6) before the next begins. The
order is fixed by the FK dependency chain — a parent's PK must exist before a child can
reference it.

| Step | Entity | Freeze doc | Rows | Headline build task |
|------|--------|-----------|-----:|---------------------|
| 1 | Client | CLIENT_ENTITY_FINAL ✓ | 1 | Generate ClientID PK; +10 cols |
| 2 | Project | PROJECT_ENTITY_FINAL ✓ | 0 | ClientID FK; +12 cols (schema only) |
| 3 | Campaign | CAMPAIGN_ENTITY_FINAL ✓ | 1 | Add ProjectID FK; +12 cols |
| 4 | Requirement | REQUIREMENT_ENTITY_FINAL ✓ | 97 | 3 FKs; Notes→ProjectID; +13 cols |
| 5 | Associate | ASSOCIATE_ENTITY_FINAL ✓ | 20 | Fresh write engine; +4 cols |
| 6 | Candidate | CANDIDATE_ENTITY_FINAL ✓ | 10,072 | 2 source FK backfills; +18 cols |

---

## DEPENDENCIES

```
Client      → none (root)
Project     → Client      (ClientID must exist)
Campaign    → Client + Project   (ClientID + ProjectID must exist)
Requirement → Client + Project + Campaign   (all 3 FKs; CampaignID mandatory)
Associate   → none upstream (sits at requirement level; Client frozen first is sufficient)
Candidate   → Associate + Campaign   (Source Associate + Source Campaign FKs)
```

**Cross-cutting (all steps):** every write engine depends on the shared infrastructure
that Phase 0 marked KEEP-AS-IS — `getMasterSS_`, `ensureSheet_`, ID generators, logging,
the pre-migration snapshot helper. No step may begin until its parent step is accepted.

**Build-order rationale:** reversing any arrow blocks FK resolution and forces a second
pass. Client is frozen and built first because all five downstream entities carry a
ClientID lineage; a late Client change cascades through the whole chain.

---

## ROLLBACK

Every step is reversible (Rule 5) and every commit carries a `ROLLBACK:` block (Rule 10).

| Step | Rollback action |
|------|-----------------|
| 1 Client | Delete new cols (10–19). Legacy 9 cols untouched → original restored by deletion. |
| 2 Project | Delete new cols (10–21). 0 rows, no legacy change → original empty sheet restored. |
| 3 Campaign | Delete new cols (14–25); restore any rewritten ClientID from snapshot. |
| 4 Requirement | Delete new cols (26–38); restore Notes (col 20) from snapshot (only legacy col touched). |
| 5 Associate | Delete new cols (20–23). No legacy change → original restored by deletion. |
| 6 Candidate | Delete new cols (A–R); restore Source Associate/Campaign from snapshot. |

**Universal rollback guarantees:**
1. A full pre-migration snapshot of the tab is captured before any write.
2. No row is ever deleted (Rule 1); rollback only removes appended columns and restores
   the handful of legacy values a migration derived from.
3. No legacy column is renamed or repurposed (Rules 2, 11), so column deletion alone
   restores the original schema in steps 1, 2, and 5.
4. Rollback is verified against the snapshot before the step is closed.

---

## VALIDATION

Each write engine enforces, at write time, the freeze-document validation rules. Common
gates across all six:

| Gate | Rule |
|------|------|
| PK present, non-null, unique | every entity |
| Mandatory parent FK resolves to a live parent, or write is refused | Rule 12, 13 |
| FK immutable — reject reassignment of an existing FK | Rule 12 |
| Status written only to the new governed `Foundation*` column | Rule 11 |
| Governed status value within the entity's vocabulary | freeze docs §Status |
| No K14 / intelligence field written | Rule 7 |
| No Execution field written | Rule 8 |
| No performance metric written | Rule 14 |
| No unapproved AI value (only `Trade` + `TradeSource=AI`) | Rule 9 |
| Notes contain no bracket-enclosed ID strings | FK hygiene |
| Consistency: child FKs match parent's FKs | Rule 12 |

**Migration validation (no-guess, Rule 13):** any unresolved parent FK is tagged
(`NEEDS_PROJECT_FK` / `NEEDS_CAMPAIGN_FK` / `CLIENT_UNRESOLVED` / `ASSOC_UNRESOLVED` /
`CAMP_UNRESOLVED`) and the record is locked — never inferred, auto-mapped, AI-mapped, or
nearest-matched. Migrations run dry-run first and produce a recruiter-approved
reconciliation report before any write (steps 4 and 6 run in batches).

---

## ACCEPTANCE

An entity is accepted — and the next step authorized — only when ALL pass (Rule 6):

1. **No data loss** — row count before = row count after (Client 1 · Project 0 ·
   Campaign 1 · Requirement 97 · Associate 20 · Candidate 10,072).
2. **Schema correct** — all new columns exist at their positions with exact headers; no
   legacy column renamed, moved, or repurposed.
3. **FKs resolved or locked** — every mandatory FK either resolves to a live parent or is
   explicitly tagged and locked; no silent nulls.
4. **Governed status** — every existing row carries a valid `Foundation*` status; legacy
   status column unchanged.
5. **Write engine enforces** — a valid create succeeds end-to-end; an invalid write
   (missing FK, off-vocabulary status, K14/Execution/performance field, FK reassignment)
   is refused, not silently accepted.
6. **Layer purity** — no K14, Execution, or unapproved-AI value present in any Foundation
   column.
7. **Reversibility proven** — pre-migration snapshot exists; documented rollback restores
   the prior state; verified before closing.
8. **Committed** — changes committed to `claude/sweet-franklin-mnmfcz` with a `ROLLBACK:`
   block; one commit per entity.

Only after step N is accepted does step N+1 begin.

---

## SEQUENCE STATE

```
GOVERNANCE LAYER — COMPLETE
  Reality Map · Foundation/K14/Execution Constitutions · Blueprint · Technical Architecture
  Client · Project · Campaign · Requirement · Associate · Candidate freezes  ✓
  Foundation Build Rules (15)  ✓

CONSTRUCTION LAYER — AUTHORIZED ON APPROVAL OF THIS DOCUMENT
  Step 1  foundation_client_v1.gs        ◀ first line of code
  Step 2  foundation_project_v1.gs
  Step 3  foundation_campaign_v1.gs
  Step 4  foundation_requirement_v1.gs
  Step 5  foundation_associate_v1.gs
  Step 6  foundation_candidate_fk_v1.gs
```

**On approval of this Masterplan, `foundation_client_v1.gs` is officially authorized.**
The next milestone is no longer architecture — it is controlled construction.

No code · no schema changes · no implementation in this document.
