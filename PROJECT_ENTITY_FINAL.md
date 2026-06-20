# PROJECT ENTITY — FINAL FREEZE
**Phase 5.1 · Step 2 freeze document · The Project schema is frozen before any code**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → freeze on approval
**Governed by:** FOUNDATION_CONSTITUTION §2.2 · FOUNDATION_BUILD_RULES (11 rules)
**Depends on:** CLIENT_ENTITY_FINAL ✓ (Project carries ClientID FK → Client)

> Project sits below Client and above Campaign. It is the parent that Campaign's
> ProjectID FK will reference. Phase 0 evidence: `_Projects` has **9 columns and 0 rows**
> — never operationally used — so this is a schema-only freeze with zero data migration.

---

## 1. COLUMNS (21 — additive, no renames, no repurposing)

Tab `_Projects`. Live today = 9 columns (cols 1–9, **0 rows**). New = 12 columns
(additive, Rule 4). Legacy `Client` name-string column is kept untouched; FK + DEN are
added beside it (Rule 2 + Rule 11).

| # | Column | Source | State |
|---|--------|--------|-------|
| 1 | ProjectID | SYS | LIVE (col 1) — **PK**, kept in place |
| 2 | ProjectName | REC | LIVE (col 2) |
| 3 | Client | REC | LIVE (col 3) — **legacy name string, untouched** (Rule 11) |
| 4 | Country | REC | LIVE (col 4) |
| 5 | Status | REC | LIVE (col 5) — **legacy, untouched** (header AND value, Rule 11) |
| 6 | CreatedAt | SYS | LIVE (col 6) |
| 7 | ActiveReqs | SYS | LIVE (col 7) — computed |
| 8 | TotalPositions | REC | LIVE (col 8) — kept in place (= mobilization target, same meaning, not duplicated) |
| 9 | Notes | REC | LIVE (col 9) — narrative only |
| 10 | **ClientID** | SYS | **NEW — FK → Client.ClientID (mandatory)** |
| 11 | **ClientName** | DEN | **NEW — denormalized display, set from Client** |
| 12 | **FoundationStatus** | REC | **NEW — governed vocabulary** (Rule 11) |
| 13 | **Project Code** | REC | NEW — short working code |
| 14 | **Client Reference Number** | REC | NEW — client PO/contract |
| 15 | **Department** | REC | NEW |
| 16 | **Location / Site** | REC | NEW |
| 17 | **Project Type** | REC | NEW — Labour Supply/Turnkey/Staff Aug/Manpower |
| 18 | **Start Date** | REC | NEW |
| 19 | **End Date** | REC | NEW |
| 20 | **Recruiter Owner** | REC | NEW |
| 21 | **Priority** | REC | NEW — HIGH/NORMAL/ON-HOLD |

**Rule compliance:** every LIVE column keeps its exact header, position, AND meaning.
Legacy `Client` (col 3) is never repurposed — the FK lives in new `ClientID` (col 10),
the display copy in new `ClientName` (col 11). Legacy `Status` (col 5) is never
repurposed — governance lives in new `FoundationStatus` (col 12). `TotalPositions`
(col 8) already means total positions = mobilization target, so it is reused in place,
not duplicated. All 12 new columns are appended right (cols 10–21).

---

## 2. PRIMARY KEY

- **ProjectID** — format `PROJ-YYYYMMDD-NNNN` (e.g. `PROJ-20260620-0001`).
- Already the live col 1; format is governed for all future rows.
- System-generated, never null, never duplicated, never changed after creation.
- Because the tab has **0 rows**, there is no PK backfill — the format simply applies to
  every Project created from go-live onward.

---

## 3. STATUS VALUES

Governance lives in the **new `FoundationStatus` column** (col 12). Legacy `Status`
(col 5) is left untouched (Rule 11).

Governed vocabulary (no free text):

```
ACTIVE · COMPLETED · CANCELLED · ON-HOLD
```

- Default on create: `FoundationStatus = ACTIVE`.
- `COMPLETED` / `CANCELLED` are soft-terminal: a recruiter may re-open to `ON-HOLD`;
  `CANCELLED` requires explicit recruiter authority.
- A Project in `COMPLETED` or `CANCELLED` may not parent new Campaigns (gate enforced by
  the Campaign write engine, Step 3).

---

## 4. VALIDATION RULES (enforced at write time)

1. `ProjectID` — system-generated; reject null or duplicate.
2. `ClientID` — **required; must resolve to an existing `Client.ClientID`.** No Project
   may exist without a resolved Client (no-orphan rule).
3. `ClientName` — DEN: set by the system from Client at write time; recruiter may not
   overwrite it directly.
4. `ProjectName` — required.
5. `Country` — required (a Project without a country cannot drive visa/compliance later).
6. `FoundationStatus` — must be one of the 4 governed values; reject any other string.
   Legacy `Status` is not validated and not written by Foundation.
7. `Notes` — reject any bracket-enclosed ID pattern (IDs belong in FK columns).
8. No K14 field (Rule 7), no Execution field (Rule 8), no unapproved-AI value (Rule 9);
   no legacy column repurposed (Rule 11).

---

## 5. MIGRATION IMPACT

- **Rows affected:** 0 (the `_Projects` tab is empty). Risk: **none** — schema-only.
- **Operations:** append 12 columns (cols 10–21). No data backfill (no rows). Legacy
  `Client` and `Status` columns are not modified.
- **Data deleted:** none (Rule 1). **Columns renamed:** none (Rule 2). **Sheet
  replaced:** no (Rule 3). **Additive only:** yes (Rule 4). **Meaning repurposed:**
  none (Rule 11).
- **Reversibility (Rule 5 / Rule 10):**
  - ROLLBACK: delete columns 10–21. No legacy column was altered and no row existed, so
    the original 9-column empty sheet is restored exactly by deletion alone.
  - A pre-migration snapshot of `_Projects` is captured before any write.

---

## 6. ACCEPTANCE CRITERIA

Project (Step 2) is accepted only when ALL pass:

1. Row count before = row count after = **0** (no rows invented, no data loss).
2. The 12 new columns exist at positions 10–21 with the exact headers above.
3. Legacy `Client` (col 3) and `Status` (col 5) headers and (absent) values are
   unchanged (Rule 11).
4. New Project creation, end-to-end, generates a unique `ProjectID`, requires a valid
   `ClientID`, and writes `ClientName` as DEN from the resolved Client.
5. An invalid write is **refused** (missing/unresolvable ClientID, missing ProjectName,
   off-vocabulary FoundationStatus) — not silently accepted.
6. `Notes` contains no bracket-enclosed ID strings.
7. No K14, Execution, or unapproved-AI value present in any Foundation column; no legacy
   column repurposed.
8. Pre-migration snapshot exists; documented rollback (delete cols 10–21) restores the
   original 9-column empty state.
9. Commit to `claude/sweet-franklin-mnmfcz` includes a `ROLLBACK:` block (Rule 10).

---

## FREEZE DECLARATION

On approval, the Project schema above is **FROZEN**. Project carries a mandatory
`ClientID` FK to the already-frozen Client. Campaign (Step 3) will carry a `ProjectID`
FK to this entity. Any later change to Project requires a new freeze document and
re-evaluation of Campaign and Requirement, which depend on ProjectID.

```
Step 1  CLIENT_ENTITY_FINAL.md    ✓ approved
Step 2  PROJECT_ENTITY_FINAL.md   ◀ this document (awaiting approval)
Step 3  CAMPAIGN_ENTITY_FINAL.md  (next, after Project freeze)
```

**STOP. Await Project freeze approval before proceeding to Campaign.**
No code · no Apps Script · no sheet changes · no migration execution.
