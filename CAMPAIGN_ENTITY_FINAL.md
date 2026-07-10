# CAMPAIGN ENTITY — FINAL FREEZE
**Phase 5.1 · Step 3 freeze document · The Campaign schema is frozen before any code**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → freeze on approval
**Governed by:** FOUNDATION_CONSTITUTION §2.3 · FOUNDATION_BUILD_RULES (12 rules)
**Depends on:** CLIENT_ENTITY_FINAL ✓ · PROJECT_ENTITY_FINAL ✓

> Campaign is the first entity where governance becomes load-bearing. It is the parent
> of Requirement (Campaign-Mandatory Rule). Phase 0 evidence: `_Campaigns` has **13
> columns and 1 row**; `ClientID` FK is already present in live, but the **`ProjectID`
> FK is missing entirely** and must be added. Campaign cannot exist orphaned (Rule 12).

---

## 1. COLUMNS (25 — additive, no renames, no repurposing)

Tab `_Campaigns`. Live today = 13 columns (cols 1–13, **1 row**). New = 12 columns
(additive, Rule 4).

| # | Column | Source | State |
|---|--------|--------|-------|
| 1 | CampaignID | SYS | LIVE (col 1) — **PK**, kept in place |
| 2 | CampaignName | REC | LIVE (col 2) |
| 3 | ClientID | SYS | LIVE (col 3) — **FK → Client, already present** (verify holds ID, not name) |
| 4 | ClientName | DEN | LIVE (col 4) — display copy |
| 5 | Sector | DEN | LIVE (col 5) |
| 6 | Location | REC | LIVE (col 6) |
| 7 | InterviewDates | REC | LIVE (col 7) |
| 8 | InterviewCities | REC | LIVE (col 8) |
| 9 | HiringMode | REC | LIVE (col 9) |
| 10 | Status | REC | LIVE (col 10) — **legacy, untouched** (header AND value, Rule 11) |
| 11 | TotalHeads | REC | LIVE (col 11) — kept in place (= target headcount, same meaning, not duplicated) |
| 12 | Notes | REC | LIVE (col 12) — narrative only |
| 13 | CreatedAt | SYS | LIVE (col 13) |
| 14 | **ProjectID** | SYS | **NEW — FK → Project.ProjectID (mandatory)** |
| 15 | **ProjectName** | DEN | **NEW — denormalized display, set from Project** |
| 16 | **FoundationStatus** | REC | **NEW — governed vocabulary** (Rule 11) |
| 17 | **Campaign Type** | REC | NEW — Interview Drive/Direct Hire/Bulk Mob/Assessment |
| 18 | **Country** | DEN | NEW — denormalized from Project |
| 19 | **Source Strategy** | REC | NEW — Database/Associate/Walk-In/Referral/Mixed |
| 20 | **Associate Network Enabled** | REC | NEW — bool |
| 21 | **Walk-In Enabled** | REC | NEW — bool |
| 22 | **Filled Count** | SYS | NEW — computed |
| 23 | **Req Count** | SYS | NEW — computed |
| 24 | **Priority** | REC | NEW — URGENT/HIGH/NORMAL/LOW |
| 25 | **Recruiter Owner** | REC | NEW |

**Rule compliance:** every LIVE column keeps its exact header, position, AND meaning.
Legacy `Status` (col 10) is never repurposed — governance lives in new `FoundationStatus`
(col 16). `TotalHeads` (col 11) already means target headcount, so it is reused in place,
not duplicated. The existing `ClientID` (col 3) is kept; the missing `ProjectID` (col 14)
is added. All 12 new columns are appended right (cols 14–25).

---

## 2. PRIMARY KEY

- **CampaignID** — format `CAMP-YYYYMMDD-NNNN` (e.g. `CAMP-20260620-0001`).
- Already the live col 1; the 1 existing row keeps its CampaignID exactly.
- System-generated, never null, never duplicated, never changed after creation.

---

## 3. FOREIGN KEYS (two — both mandatory, both immutable)

| FK column | References | Rule |
|-----------|-----------|------|
| ClientID (col 3) | Client.ClientID | mandatory · immutable (Rule 12) |
| ProjectID (col 14) | Project.ProjectID | mandatory · immutable (Rule 12) · **NEW** |

**Hierarchy enforcement (Rule 12 — no orphans):**
- A Campaign MUST resolve to a live Project (ProjectID) AND a live Client (ClientID).
- **Consistency:** `Campaign.ClientID` must equal `Project.ClientID` of its parent
  Project. A Campaign cannot belong to one Client while its Project belongs to another.
- Once set, neither FK is ever reassigned. To move a Campaign under a different Project
  or Client, a **new Campaign** is created (Rule 12 immutability).
- `ClientName` (col 4) and `ProjectName` (col 15) are DEN copies, refreshed from the FK,
  never used as join keys.

---

## 4. STATUS VALUES

Governance lives in the **new `FoundationStatus` column** (col 16). Legacy `Status`
(col 10) is left untouched (Rule 11).

Governed vocabulary (no free text):

```
ACTIVE · COMPLETED · CANCELLED · ON-HOLD
```

- Default on create: `FoundationStatus = ACTIVE`.
- A Campaign in `COMPLETED` or `CANCELLED` may not accept new Requirements (gate enforced
  by the Requirement write engine, Step 4).
- `CANCELLED` requires explicit recruiter authority.

---

## 5. VALIDATION RULES (enforced at write time)

1. `CampaignID` — system-generated; reject null or duplicate.
2. `ClientID` — **required; must resolve to a live `Client.ClientID`.**
3. `ProjectID` — **required; must resolve to a live `Project.ProjectID`.**
4. **Consistency gate** — `Campaign.ClientID` must equal the parent Project's `ClientID`;
   reject on mismatch.
5. `CampaignName` — required.
6. `ClientName` / `ProjectName` / `Country` — DEN: system-set from the resolved parents;
   recruiter may not overwrite directly.
7. `FoundationStatus` — must be one of the 4 governed values; reject any other string.
   Legacy `Status` is not validated and not written by Foundation.
8. `Notes` — reject any bracket-enclosed ID pattern (IDs belong in FK columns).
9. FK immutability — reject any write that changes an existing row's `ClientID` or
   `ProjectID` (Rule 12).
10. No K14 field (Rule 7), no Execution field (Rule 8), no unapproved-AI value (Rule 9);
    no legacy column repurposed (Rule 11).

---

## 6. MIGRATION IMPACT

- **Rows affected:** 1 (the single existing `_Campaigns` row). Risk: low.
- **Operations:**
  1. Append 12 columns (cols 14–25).
  2. **Verify `ClientID` (col 3)** holds an actual ClientID; if it holds a name string,
     resolve against `_Clients` and write the matching ClientID.
  3. **Backfill `ProjectID` (col 14)** for the 1 live row — recruiter confirms which
     Project this Campaign belongs to. If unresolved, tag the row `NEEDS_PROJECT_FK` and
     lock it from operations until reconciled (no guessing — Rule: absence is declared).
  4. Set `ProjectName` / `Country` as DEN from the resolved Project.
  5. **Derive `FoundationStatus`** from legacy `Status` (`Active` → `ACTIVE`). Legacy
     `Status` is not modified.
- **Data deleted:** none (Rule 1). **Renamed:** none (Rule 2). **Sheet replaced:** no
  (Rule 3). **Additive only:** yes (Rule 4). **Repurposed:** none (Rule 11).
- **Reversibility (Rule 5 / Rule 10):**
  - ROLLBACK: delete columns 14–25; restore any `ClientID` value that was rewritten from
    the pre-migration snapshot. No other legacy column was altered.
  - A pre-migration snapshot of `_Campaigns` is captured before any write.

---

## 7. ACCEPTANCE CRITERIA

Campaign (Step 3) is accepted only when ALL pass:

1. Row count before = row count after = **1** (no data loss).
2. The 12 new columns exist at positions 14–25 with the exact headers above.
3. The 1 existing row has a resolved `ProjectID` (or is explicitly tagged
   `NEEDS_PROJECT_FK` and locked) and a verified `ClientID`.
4. Consistency holds: the row's `ClientID` equals its parent Project's `ClientID`.
5. `FoundationStatus` on the row is derived correctly; legacy `Status` is unchanged
   (Rule 11).
6. New Campaign creation, end-to-end, requires a valid ClientID + ProjectID, enforces the
   consistency gate, and writes DEN names from the parents.
7. An invalid write is **refused** (missing/unresolvable FK, Client/Project mismatch,
   off-vocabulary FoundationStatus, or an attempt to reassign an existing FK) — not
   silently accepted.
8. `Notes` contains no bracket-enclosed ID strings.
9. No K14, Execution, or unapproved-AI value present; no legacy column repurposed.
10. Pre-migration snapshot exists; documented rollback restores the original 13-column
    state. Commit includes a `ROLLBACK:` block (Rule 10).

---

## FREEZE DECLARATION

On approval, the Campaign schema above is **FROZEN**. Campaign carries mandatory,
immutable `ClientID` and `ProjectID` FKs and may never exist orphaned (Rule 12).
Requirement (Step 4) will carry a mandatory `CampaignID` FK to this entity — the
Campaign-Mandatory Rule. Any later change to Campaign requires a new freeze document and
re-evaluation of Requirement.

```
Step 1  CLIENT_ENTITY_FINAL.md      ✓ approved
Step 2  PROJECT_ENTITY_FINAL.md     ✓ approved
Step 3  CAMPAIGN_ENTITY_FINAL.md    ◀ this document (awaiting approval)
Step 4  REQUIREMENT_ENTITY_FINAL.md (next, after Campaign freeze)
```

**STOP. Await Campaign freeze approval before proceeding to Requirement.**
No code · no Apps Script · no sheet changes · no migration execution.
