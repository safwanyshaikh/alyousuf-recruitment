# ASSOCIATE ENTITY — FINAL FREEZE
**Phase 5.1 · Step 5 freeze document · The Associate schema is frozen before any code**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → freeze on approval
**Governed by:** FOUNDATION_CONSTITUTION §2.5, §8 · FOUNDATION_BUILD_RULES (14 rules)
**Depends on:** CLIENT ✓ (Associate sits at the requirement level; links to Candidate via Source Associate)

> Associate is the supply partner between Requirement and Candidate. Phase 0 evidence:
> `_Associates` has **19 columns and 20 real rows** — but **zero repo code** (no read, no
> write, no find). The write engine is authored entirely fresh. Foundation stores who the
> Associate IS; performance is K14's (Rule 14 / Constitution §8).

---

## 1. COLUMNS (23 — additive, no renames, no repurposing)

Tab `_Associates`. Live today = 19 columns (cols 1–19, **20 rows**). New = 4 columns
(additive, Rule 4).

### Legacy columns (cols 1–19 — untouched)
| # | Column | Source | Note |
|---|--------|--------|------|
| 1 | AssocId | SYS | **PK**, kept in place |
| 2 | CompanyName | REC | |
| 3 | ContactName | REC | |
| 4 | Email | REC | |
| 5 | Mobile | REC | |
| 6 | State | REC | |
| 7 | City | REC | |
| 8 | LicenseType | REC | source for derived Type |
| 9 | LicenseNo | REC | |
| 10 | Specialization | REC | |
| 11 | Capacity | REC | |
| 12 | NumRecruiters | REC | |
| 13 | LinkedInUrl | REC | |
| 14 | WebsiteUrl | REC | |
| 15 | Address | REC | |
| 16 | Status | REC | **legacy, untouched** (header AND value, Rule 11) |
| 17 | CreatedAt | SYS | |
| 18 | Notes | REC | narrative only |
| 19 | Source | REC | how the associate was acquired |

### New columns (cols 20–23 — appended)
| # | Column | Source | Note |
|---|--------|--------|------|
| 20 | **FoundationStatus** | REC | governed vocabulary (Rule 11) |
| 21 | **Associate Type** | SYS/REC | Agency / Freelancer / Sub-Agent (derived from LicenseType, recruiter-confirmable) |
| 22 | **MEA Relationship** | REC | Preferred / Approved / Probation / Blacklisted (commercial standing) |
| 23 | **Coverage Geography** | REC | countries/regions the associate sources from |

**Rule compliance:** all 19 legacy columns keep header, position, AND meaning. Legacy
`Status` (col 16) is never repurposed — governance lives in new `FoundationStatus`
(col 20). Specialization (col 10) and contact fields (cols 3–5) already exist and are
kept. The 4 new columns are appended right (cols 20–23).

**Explicitly NOT added (Rule 14 / Constitution §8 — K14 owns these):** Rating,
Reliability, Fill Rate, Total Submissions, Total Selections, Total Mobilizations,
Commitment Accuracy, Mobilization Rate. These are `K14.OUTCOMES`/`K14.MEMORY`, never
Foundation columns.

---

## 2. PRIMARY KEY

- **AssocId** — live col 1. The 20 existing rows keep their AssocId exactly (no renumber).
- The existing ID format is audited at migration; if consistent it is retained as-is. The
  write engine enforces the format for all future rows.
- System-managed, never null, never duplicated, never changed.

---

## 3. FOREIGN KEYS

- Associate has **no parent FK** in the hierarchy — it sits at the Requirement level, not
  beneath it.
- Its relationship to Candidate is expressed by **Candidate.`Source Associate` → AssocId**
  (frozen in Step 6, Candidate). That FK is immutable once set (Rule 12).

---

## 4. IDENTITY-ONLY RULE (Rule 14 / Constitution §8 — locked)

```
FOUNDATION  =  WHO the Associate is
K14         =  HOW WELL the Associate performs
```

**Foundation (identity):** company, contact, license, type, specialization, capacity,
coverage, MEA relationship, status.
**K14 (performance — never in Foundation):** reliability, fill rate, submission success,
selection success, mobilization success, rating.

Foundation links to the Associate; K14 judges the Associate.

---

## 5. STATUS VALUES

Governance lives in the **new `FoundationStatus` column** (col 20). Legacy `Status`
(col 16) is left untouched (Rule 11).

Governed vocabulary (no free text):

```
ACTIVE · INACTIVE · BLACKLISTED
```

- Default on create: `FoundationStatus = ACTIVE`.
- `BLACKLISTED` is terminal — no system process reverts it; recruiter authority only,
  with a Notes entry stating the reason.

Note: `MEA Relationship` (col 22) is a **commercial standing**, distinct from operational
`FoundationStatus`. `BLACKLISTED` may appear in either dimension and both are recruiter-set.

---

## 6. VALIDATION RULES (enforced at write time)

1. `AssocId` — system-managed; reject null or duplicate.
2. `CompanyName` — required.
3. **Contact governance** — at least one of `Email` / `Mobile` required and format-valid;
   an associate with no reachable contact is refused.
4. `Associate Type` — must be one of Agency / Freelancer / Sub-Agent.
5. `FoundationStatus` — must be one of the 3 governed values. Legacy `Status` not
   validated, not written by Foundation.
6. `MEA Relationship` — must be one of Preferred / Approved / Probation / Blacklisted (if
   set).
7. `Notes` — reject any bracket-enclosed ID pattern (IDs belong in FK columns).
8. **No performance metric written** (Rule 14): reject any attempt to write reliability/
   fill-rate/success-count fields to this tab.
9. No K14 field (Rule 7), no Execution field (Rule 8), no unapproved-AI value (Rule 9);
   no legacy column repurposed (Rule 11).

---

## 7. MIGRATION IMPACT

- **Rows affected:** 20. Risk: low (clean identity data; no FK reconciliation needed).
- **Operations:**
  1. Append 4 columns (cols 20–23).
  2. **Derive `Associate Type` (col 21)** from `LicenseType` (col 8): registered firm →
     `Agency`; individual without a firm → `Freelancer`; otherwise → `Sub-Agent`. This is
     a deterministic rule-map, surfaced for recruiter confirmation — **not a guess** about
     a parent (Rule 13 governs parent FKs; this is a within-row classification of existing
     data). Ambiguous rows are tagged `TYPE_UNCONFIRMED` for recruiter review.
  3. **Derive `FoundationStatus` (col 20)** from legacy `Status` (`Active`→`ACTIVE`).
     Legacy `Status` not modified.
  4. `MEA Relationship` (col 22) and `Coverage Geography` (col 23) are **new fields with
     no legacy source** — left empty for recruiter entry. No inference (Rule 13/14).
- **Data deleted:** none (Rule 1). **Renamed:** none (Rule 2). **Sheet replaced:** no
  (Rule 3). **Additive only:** yes (Rule 4). **Repurposed:** none (Rule 11). **Performance
  written:** none (Rule 14).
- **Reversibility (Rule 5 / Rule 10):**
  - ROLLBACK: delete columns 20–23. No legacy column altered, so the original 19-column
    sheet is restored exactly by deletion alone.
  - A pre-migration snapshot of `_Associates` (all 20 rows) is captured before any write.

---

## 8. ACCEPTANCE CRITERIA

Associate (Step 5) is accepted only when ALL pass:

1. Row count before = row count after = **20** (no data loss).
2. The 4 new columns exist at positions 20–23 with the exact headers above.
3. Every row has a derived `Associate Type` (or is tagged `TYPE_UNCONFIRMED`) and a
   derived `FoundationStatus`; legacy `Status` unchanged (Rule 11).
4. New Associate creation, end-to-end, enforces contact governance, Type vocabulary, and
   FoundationStatus vocabulary.
5. An invalid write is **refused** (no contact, off-vocabulary Type/Status, or any
   performance-metric field) — not silently accepted.
6. `Notes` contains no bracket-enclosed ID strings.
7. **No performance/outcome field present** in any Associate column (Rule 14); no K14,
   Execution, or unapproved-AI value; no legacy column repurposed.
8. Pre-migration snapshot exists; documented rollback (delete cols 20–23) restores the
   original 19-column state.
9. Commit to `claude/sweet-franklin-mnmfcz` includes a `ROLLBACK:` block (Rule 10).

---

## FREEZE DECLARATION

On approval, the Associate schema above is **FROZEN**. Foundation holds Associate identity
only; performance is K14's (Rule 14). Candidate (Step 6) will carry a `Source Associate`
FK to this entity. Any later change requires a new freeze document.

```
Step 1  CLIENT_ENTITY_FINAL.md       ✓ approved
Step 2  PROJECT_ENTITY_FINAL.md      ✓ approved
Step 3  CAMPAIGN_ENTITY_FINAL.md     ✓ approved
Step 4  REQUIREMENT_ENTITY_FINAL.md  ✓ approved
Step 5  ASSOCIATE_ENTITY_FINAL.md    ◀ this document (awaiting approval)
Step 6  CANDIDATE_ENTITY_FINAL.md    (final freeze, after Associate)
```

**STOP. Await Associate freeze approval before proceeding to Candidate.**
No code · no Apps Script · no sheet changes · no migration execution.
