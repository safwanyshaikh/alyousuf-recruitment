# CLIENT ENTITY — FINAL FREEZE
**Phase 5.1 · Step 1 freeze document · The Client schema is frozen before any code**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → freeze on approval, then code
**Governed by:** FOUNDATION_CONSTITUTION §2.1 · FOUNDATION_BUILD_RULES (11 rules)

> Client is the root of the hierarchy. Once frozen, ClientID becomes the FK every
> downstream entity (Project, Campaign, Requirement, Candidate) depends on. Freeze first,
> code second.

---

## 1. COLUMNS (19 — additive, no renames, no repurposing)

Tab `_Clients`. Live today = 9 columns (cols 1–9). New = 10 columns (additive, Rule 4).

| # | Column | Source | State |
|---|--------|--------|-------|
| 1 | ClientCode | REC | LIVE (col 1) — kept in place, untouched |
| 2 | ClientName | REC | LIVE (col 2) |
| 3 | Country | REC | LIVE (col 3) |
| 4 | Sector | REC | LIVE (col 4) |
| 5 | ContactName | REC | LIVE (col 5) |
| 6 | ContactEmail | REC | LIVE (col 6) |
| 7 | Status | REC | LIVE (col 7) — **legacy, untouched** (header AND value unchanged, Rule 11) |
| 8 | CreatedAt | SYS | LIVE (col 8) |
| 9 | Notes | REC | LIVE (col 9) — narrative only |
| 10 | **ClientID** | SYS | **NEW — PK** `CLI-YYYYMMDD-NNNN` |
| 11 | **FoundationStatus** | REC | **NEW — governed vocabulary** (derived from legacy Status, Rule 11) |
| 12 | **MEA Client Category** | REC | NEW — Tier A/B/C/New |
| 13 | **Ownership Type** | REC | NEW — Govt/Semi-Govt/Private/JV |
| 14 | **State / Emirate** | REC | NEW |
| 15 | **ContactMobile** | REC | NEW |
| 16 | **Preferred Submission Format** | REC | NEW — PDF/Excel/Portal/Email |
| 17 | **Payment Terms** | REC | NEW |
| 18 | **SLA Days** | REC | NEW |
| 19 | **CreatedBy** | SYS | NEW |

**Rule 2 + Rule 11 compliance:** every LIVE column keeps its exact header, position, AND
meaning. The legacy `Status` (col 7) is never repurposed — governance lives in the new
`FoundationStatus` (col 11). All 10 new columns are appended to the right (cols 10–19).
Nothing is renamed, moved, or repurposed.

---

## 2. PRIMARY KEY

- **ClientID** — format `CLI-YYYYMMDD-NNNN` (e.g. `CLI-20260620-0001`).
- System-generated, never null, never duplicated, never changed after creation.
- The 1 existing live row is backfilled with `CLI-<migration-date>-0001`.
- `ClientCode` remains a human alias (ARAMCO, ADNOC) and a uniqueness check, but is
  **no longer the join key** — every downstream FK references ClientID, not ClientCode.

---

## 3. STATUS VALUES

Governance lives in the **new `FoundationStatus` column** (col 11), not the legacy
`Status` column (col 7, which is left untouched per Rule 11).

Governed vocabulary (no free text):

```
ACTIVE · INACTIVE · BLACKLISTED · PROSPECT
```

- Default on create: `FoundationStatus = ACTIVE`.
- `BLACKLISTED` is terminal — no system process reverts it; recruiter authority only,
  with a Notes entry stating the reason.
- Migration **derives** `FoundationStatus` from the legacy `Status` value
  (`Active` → `ACTIVE`). The legacy `Status` column keeps its original value — no
  in-place change, no repurposing (Rule 11).

---

## 4. VALIDATION RULES (enforced at write time)

1. `ClientID` — system-generated; reject null or duplicate.
2. `ClientCode` — required; unique across all Client rows.
3. `ClientName` — required.
4. `FoundationStatus` — must be one of the 4 governed values; reject any other string.
   The legacy `Status` column is not validated and not written by Foundation.
5. `Notes` — free text; reject if it contains any bracket-enclosed ID pattern
   (`[Project:...]`, `[Client:...]`) — IDs belong in FK columns (Rule 7/8 hygiene).
6. No K14 field written (Rule 7). No Execution field written (Rule 8). No AI value
   written (Rule 9 — Client has no approved AI field). Legacy `Status` not repurposed
   (Rule 11).

---

## 5. MIGRATION IMPACT

- **Rows affected:** 1 (the single existing `_Clients` row). Risk: minimal.
- **Operations:** append 10 columns (cols 10–19); backfill `ClientID` for the 1 row;
  derive `FoundationStatus` from legacy `Status` (`Active` → `ACTIVE`); set
  `CreatedBy = SYSTEM-MIGRATION`. The legacy `Status` column is **not modified**.
- **Data deleted:** none (Rule 1). **Columns renamed:** none (Rule 2). **Sheet
  replaced:** no (Rule 3). **Additive only:** yes (Rule 4). **Meaning repurposed:**
  none (Rule 11).
- **Reversibility (Rule 5 / Rule 10):**
  - ROLLBACK: delete columns 10–19. No legacy column was altered, so the original
    9-column sheet is restored byte-for-byte by deletion alone.
  - A pre-migration snapshot of `_Clients` is captured before any write.

---

## 6. ACCEPTANCE CRITERIA

Client (Step 1) is accepted only when ALL pass:

1. Row count before = row count after = **1** (no data loss).
2. The 1 existing row has a valid `ClientID` (`CLI-...` format, non-null).
3. The 1 existing row has `FoundationStatus = ACTIVE` (derived); legacy `Status` still
   reads its original value `Active` (untouched, Rule 11).
4. New Client creation, end-to-end, generates a unique ClientID and writes all 10 new
   columns.
5. An invalid write is **refused** (missing ClientName, duplicate ClientCode, or an
   off-vocabulary FoundationStatus) — not silently accepted.
6. `Notes` contains no bracket-enclosed ID strings.
7. No K14, Execution, or unapproved-AI value present in any Foundation column; no legacy
   column repurposed.
8. Pre-migration snapshot exists; documented rollback (delete cols 10–19) restores the
   original 9-column state.
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
