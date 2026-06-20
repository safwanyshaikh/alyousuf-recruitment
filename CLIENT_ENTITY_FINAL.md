# CLIENT ENTITY — FINAL FREEZE
**Phase 5.1 · Step 1 freeze document · The Client schema is frozen before any code**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → freeze on approval, then code
**Governed by:** FOUNDATION_CONSTITUTION §2.1 · FOUNDATION_BUILD_RULES (10 rules)

> Client is the root of the hierarchy. Once frozen, ClientID becomes the FK every
> downstream entity (Project, Campaign, Requirement, Candidate) depends on. Freeze first,
> code second.

---

## 1. COLUMNS (18 — additive, no renames)

Tab `_Clients`. Live today = 9 columns (cols 1–9). New = 9 columns (additive, Rule 4).

| # | Column | Source | State |
|---|--------|--------|-------|
| 1 | ClientCode | REC | LIVE (col 1) — kept in place |
| 2 | ClientName | REC | LIVE (col 2) |
| 3 | Country | REC | LIVE (col 3) |
| 4 | Sector | REC | LIVE (col 4) |
| 5 | ContactName | REC | LIVE (col 5) |
| 6 | ContactEmail | REC | LIVE (col 6) |
| 7 | Status | REC | LIVE (col 7) — values normalized, header unchanged |
| 8 | CreatedAt | SYS | LIVE (col 8) |
| 9 | Notes | REC | LIVE (col 9) — narrative only |
| 10 | **ClientID** | SYS | **NEW — PK** `CLI-YYYYMMDD-NNNN` |
| 11 | **MEA Client Category** | REC | NEW — Tier A/B/C/New |
| 12 | **Ownership Type** | REC | NEW — Govt/Semi-Govt/Private/JV |
| 13 | **State / Emirate** | REC | NEW |
| 14 | **ContactMobile** | REC | NEW |
| 15 | **Preferred Submission Format** | REC | NEW — PDF/Excel/Portal/Email |
| 16 | **Payment Terms** | REC | NEW |
| 17 | **SLA Days** | REC | NEW |
| 18 | **CreatedBy** | SYS | NEW |

**Rule 2 compliance:** every LIVE column keeps its exact header and position. All 9 new
columns are appended to the right (cols 10–18). Nothing is renamed or moved.

---

## 2. PRIMARY KEY

- **ClientID** — format `CLI-YYYYMMDD-NNNN` (e.g. `CLI-20260620-0001`).
- System-generated, never null, never duplicated, never changed after creation.
- The 1 existing live row is backfilled with `CLI-<migration-date>-0001`.
- `ClientCode` remains a human alias (ARAMCO, ADNOC) and a uniqueness check, but is
  **no longer the join key** — every downstream FK references ClientID, not ClientCode.

---

## 3. STATUS VALUES

Governed vocabulary (no free text):

```
ACTIVE · INACTIVE · BLACKLISTED · PROSPECT
```

- Default on create: `ACTIVE`.
- `BLACKLISTED` is terminal — no system process reverts it; recruiter authority only,
  with a Notes entry stating the reason.
- Migration normalizes the live value `Active` → `ACTIVE` (value change only, header
  unchanged — Rule 2 respected).

---

## 4. VALIDATION RULES (enforced at write time)

1. `ClientID` — system-generated; reject null or duplicate.
2. `ClientCode` — required; unique across all Client rows.
3. `ClientName` — required.
4. `Status` — must be one of the 4 governed values; reject any other string.
5. `Notes` — free text; reject if it contains any bracket-enclosed ID pattern
   (`[Project:...]`, `[Client:...]`) — IDs belong in FK columns (Rule 7/8 hygiene).
6. No K14 field written (Rule 7). No Execution field written (Rule 8). No AI value
   written (Rule 9 — Client has no approved AI field).

---

## 5. MIGRATION IMPACT

- **Rows affected:** 1 (the single existing `_Clients` row). Risk: minimal.
- **Operations:** append 9 columns (cols 10–18); backfill `ClientID` for the 1 row;
  set `CreatedBy = SYSTEM-MIGRATION`; normalize `Status` value `Active` → `ACTIVE`.
- **Data deleted:** none (Rule 1). **Columns renamed:** none (Rule 2). **Sheet
  replaced:** no (Rule 3). **Additive only:** yes (Rule 4).
- **Reversibility (Rule 5 / Rule 10):**
  - ROLLBACK: delete columns 10–18; restore `Status` value `ACTIVE` → `Active` on the
    1 migrated row. The original 9-column sheet is thereby restored byte-for-byte.
  - A pre-migration snapshot of `_Clients` is captured before any write.

---

## 6. ACCEPTANCE CRITERIA

Client (Step 1) is accepted only when ALL pass:

1. Row count before = row count after = **1** (no data loss).
2. The 1 existing row has a valid `ClientID` (`CLI-...` format, non-null).
3. `Status` on the existing row reads `ACTIVE` (normalized).
4. New Client creation, end-to-end, generates a unique ClientID and writes all 18
   columns.
5. An invalid write is **refused** (missing ClientName, duplicate ClientCode, or an
   off-vocabulary Status) — not silently accepted.
6. `Notes` contains no bracket-enclosed ID strings.
7. No K14, Execution, or unapproved-AI value present in any Foundation column.
8. Pre-migration snapshot exists; documented rollback restores the original 9-column
   state.
9. Commit to `claude/sweet-franklin-mnmfcz` includes a `ROLLBACK:` block (Rule 10).

---

## FREEZE DECLARATION

On approval, the Client schema above is **FROZEN**. `foundation_client_v1.gs` will be
written to exactly this specification. Any later change to Client requires a new freeze
document and re-evaluation of every downstream entity that carries ClientID.

```
Step 1  CLIENT_ENTITY_FINAL.md   ◀ this document (awaiting approval)
        foundation_client_v1.gs  (only after this freeze is approved)
```

**STOP. Await Client freeze approval before writing foundation_client_v1.gs.**
