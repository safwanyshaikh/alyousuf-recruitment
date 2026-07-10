# REQUIREMENT ENTITY — FINAL FREEZE
**Phase 5.1 · Step 4 freeze document · The load-bearing entity of the entire Foundation**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → freeze on approval
**Governed by:** FOUNDATION_CONSTITUTION §2.4, §6, §7 · FOUNDATION_BUILD_RULES (13 rules)
**Depends on:** CLIENT ✓ · PROJECT ✓ · CAMPAIGN ✓

> Requirement is the most important freeze in the Foundation. Phase 0 evidence:
> `_Requirements` has **25 columns and 97 load-bearing rows**; the repo writes only 19.
> **All three parent FKs are missing** — CampaignID and ClientID absent, ProjectID buried
> in Notes as `[Project:PROJ-xxx]`. The master holds operational truth ONLY; all AI/K14
> intelligence is forbidden here (Constitution §7).

---

## 1. COLUMNS (38 — additive, no renames, no repurposing)

Tab `_Requirements`. Live today = 25 columns (cols 1–25, **97 rows**). New = 13 columns
(additive, Rule 4).

### Legacy columns (cols 1–25 — untouched)
| # | Column | Source | Note |
|---|--------|--------|------|
| 1 | ReqID | SYS | **PK**, kept in place |
| 2 | Received Date | REC | |
| 3 | ClientName | REC | legacy name string — **untouched** (FK added separately, Rule 11) |
| 4 | Deploy Country | REC | |
| 5 | Trade | REC/AI | the ONLY AI-touched master field (Constitution §7) |
| 6 | Quantity | REC | |
| 7 | Min Experience | REC | |
| 8 | Min Age | REC | |
| 9 | Max Age | REC | |
| 10 | GCC Preference | REC | |
| 11 | Local Transfer Req | REC | |
| 12 | Visit Visa OK | REC | |
| 13 | Certifications | REC | |
| 14 | Urgency | REC | |
| 15 | Status | REC | **legacy, untouched** (header AND value, Rule 11) |
| 16 | Sourced By | REC | |
| 17 | Special Requirements | REC | |
| 18 | Shortlist Count | SYS | computed |
| 19 | Selected Count | SYS | computed |
| 20 | Notes | REC | narrative only — FK strings purged at migration |
| 21 | Raw JD | SYS | JD upload evidence, read-only |
| 22 | Start_Date | REC | |
| 23 | End_Date | REC | |
| 24 | Committed Qty | SYS | |
| 25 | Interview Date | REC | |

### New columns (cols 26–38 — appended)
| # | Column | Source | Note |
|---|--------|--------|------|
| 26 | **CampaignID** | SYS | **FK → Campaign.CampaignID · MANDATORY (Rule 13)** |
| 27 | **ProjectID** | SYS | **FK → Project.ProjectID · MANDATORY · extracted from Notes** |
| 28 | **ClientID** | SYS | **FK → Client.ClientID · MANDATORY · resolved from ClientName** |
| 29 | **TradeSource** | SYS | AI / Recruiter flag for col 5 Trade |
| 30 | **FoundationStatus** | REC | governed vocabulary (Rule 11) |
| 31 | **Interview Mode** | REC | Face-to-Face/Virtual/Telephonic/CV |
| 32 | **Food/Accommodation/Transport** | REC | Provided/Allowance/Not |
| 33 | **Duty Hours** | REC | |
| 34 | **Contract Period** | REC | derived view of Start_Date/End_Date (cols 22–23) |
| 35 | **Rotation** | REC | |
| 36 | **Medical Standard** | REC | |
| 37 | **Passport Validity Required** | REC | |
| 38 | **Recruiter Owner** | REC | |

**Rule compliance:** all 25 legacy columns keep header, position, AND meaning. Legacy
`Status` (col 15) and `ClientName` (col 3) are never repurposed — governance lives in new
`FoundationStatus` (col 30), the FK in new `ClientID` (col 28). The 13 new columns are
appended right (cols 26–38).

---

## 2. PRIMARY KEY

- **ReqID** — format `REQ-YYYYMMDD-NNNN`. Already live col 1; the 97 existing rows keep
  their ReqID exactly.
- System-generated, never null, never duplicated, never changed.

---

## 3. FOREIGN KEYS (three — all mandatory, all immutable, Rule 12)

| FK column | References | Migration source |
|-----------|-----------|-----------------|
| CampaignID (col 26) | Campaign.CampaignID | **derived from resolved ProjectID** (no guess — Rule 13) |
| ProjectID (col 27) | Project.ProjectID | **parsed from Notes** `[Project:PROJ-xxx]` |
| ClientID (col 28) | Client.ClientID | **resolved from ClientName** (col 3) by exact match |

**Hierarchy (Rule 12 + Rule 13):** every Requirement MUST resolve to a Campaign, which
resolves to a Project, which resolves to a Client. No Client→Requirement or
Project→Requirement shortcut exists. FKs are immutable; wrong parent → create a new
Requirement, never reassign.

---

## 4. TRUTH-ONLY RULE (Constitution §7 — restated and locked)

The Requirement master stores **operational truth only.**

**Allowed (Foundation):** Trade · TradeSource · Quantity · Deploy Country · Status/
FoundationStatus · ClientID · ProjectID · CampaignID · Raw JD · Interview (Mode/Date) ·
Benefits (Food/Accom/Transport) · Contract Period · Rotation · Medical Standard ·
Passport Validity · Min Exp/Age · Certifications · Special Requirements.

**Forbidden (K14 only — never written to this tab):** AI Score · AI Match · AI Assessment
· AI Ranking · AI Reasoning · AI Recommendation · extracted skills · parsed qualifications
· requirement score · salary guidance · risk flags · match intelligence · confidence.

The ONLY AI-touched master field is `Trade` (col 5), and only with `TradeSource = AI`; a
recruiter override flips it to `TradeSource = Recruiter` and locks it against automated
overwrite.

---

## 5. STATUS VALUES

Governance lives in the **new `FoundationStatus` column** (col 30). Legacy `Status`
(col 15) is left untouched (Rule 11).

Governed vocabulary (no free text):

```
OPEN · FILLED · CLOSED · ON-HOLD
```

- Default on create: `FoundationStatus = OPEN`.
- `FILLED` / `CLOSED` are terminal — no system process reverts them; recruiter authority
  re-opens to `ON-HOLD` with attribution.
- A Requirement whose parent Campaign is `COMPLETED`/`CANCELLED` is blocked from further
  transitions.

---

## 6. VALIDATION RULES (enforced at write time)

1. `ReqID` — system-generated; reject null or duplicate.
2. `CampaignID` — **required, non-null, must resolve to a live Campaign** (Rule 13).
   Write is **refused** if CampaignID is absent or unresolved. No exceptions.
3. `ProjectID` — required; must resolve to a live `Project.ProjectID`.
4. `ClientID` — required; must resolve to a live `Client.ClientID`.
5. **Consistency gate** — the Requirement's ClientID/ProjectID must match its Campaign's
   ClientID/ProjectID; reject on mismatch.
6. `FoundationStatus` — must be one of the 4 governed values.
7. `TradeSource` — set `AI` by system; only a recruiter write sets `Recruiter`; the AI
   process may not overwrite a `Recruiter`-set Trade.
8. `Notes` (col 20) — reject any bracket-enclosed ID pattern (`[Project:...]`,
   `[Campaign:...]`, `[Client:...]`); IDs live in FK columns only.
9. FK immutability — reject any write that changes an existing row's CampaignID,
   ProjectID, or ClientID (Rule 12).
10. **No AI/K14 field written** to any master column (Constitution §7 / Rule 7); no
    Execution field (Rule 8); no legacy column repurposed (Rule 11).

---

## 7. MIGRATION IMPACT (97 rows — the most complex migration)

Ordered steps; **dry-run first**, producing a reconciliation report for recruiter review
before any write.

1. **ProjectID extraction (col 27).** Scan Notes (col 20) for `[Project:PROJ-xxx]`;
   extract the ID into ProjectID; strip the string from Notes (other narrative kept). If
   absent → tag `NEEDS_PROJECT_FK`, lock the row (Rule 13 — no guess).
2. **CampaignID derivation (col 26).** For a resolved ProjectID, find Campaigns where
   `Campaign.ProjectID = ProjectID`. **Exactly one** match → assign it. **Zero or more
   than one** → tag `NEEDS_CAMPAIGN_FK`, lock for recruiter (Rule 13 — **no default
   Campaign is auto-created**; this supersedes the implementation plan's earlier
   "create default Campaign" step).
3. **ClientID resolution (col 28).** Exact-match ClientName (col 3) against `_Clients`;
   write the matching ClientID. No exact match → tag `CLIENT_UNRESOLVED`, lock (no
   nearest-match).
4. **TradeSource (col 29).** Set `AI` for all 97 existing rows (Trade came from the
   automated engine). Recruiter confirmation later flips to `Recruiter` and locks Trade.
5. **FoundationStatus (col 30).** Derive from legacy `Status` (`Active`→`OPEN`,
   `Filled`→`FILLED`, etc.). Legacy `Status` is not modified.
6. **Notes cleanup (col 20).** After step 1, verify Notes holds no remaining FK pattern;
   Notes is narrative-only from here.

- **Data deleted:** none (Rule 1). **Renamed:** none (Rule 2). **Sheet replaced:** no
  (Rule 3). **Additive only:** yes (Rule 4). **Repurposed:** none (Rule 11).
- **Reversibility (Rule 5 / Rule 10):**
  - ROLLBACK: delete columns 26–38 and restore Notes (col 20) from the pre-migration
    snapshot (the only legacy column touched, by FK-string removal). All 25 legacy
    columns otherwise unchanged.
  - A pre-migration snapshot of `_Requirements` (all 97 rows) is captured before any write.

---

## 8. ACCEPTANCE CRITERIA

Requirement (Step 4) is accepted only when ALL pass:

1. Row count before = row count after = **97** (no data loss).
2. The 13 new columns exist at positions 26–38 with the exact headers above.
3. Every row either has all three FKs resolved, OR is explicitly tagged
   (`NEEDS_PROJECT_FK` / `NEEDS_CAMPAIGN_FK` / `CLIENT_UNRESOLVED`) and locked — **no
   silent nulls on a mandatory FK**.
4. Consistency holds for every resolved row (Req FKs match Campaign's FKs).
5. Notes (col 20) contains no bracket-enclosed ID strings on any row.
6. `FoundationStatus` derived for all rows; legacy `Status` unchanged (Rule 11).
7. New Requirement creation is **refused without a resolved CampaignID** (Rule 13),
   end-to-end.
8. An invalid write is refused (missing/unresolvable FK, mismatch, off-vocabulary status,
   AI field, FK reassignment) — not silently accepted.
9. No AI/K14, Execution, or unapproved value present in any master column; no legacy
   column repurposed.
10. Dry-run reconciliation report produced and recruiter-approved before the write;
    pre-migration snapshot exists; documented rollback restores the original 25-column
    state. Commit includes a `ROLLBACK:` block (Rule 10).

---

## FREEZE DECLARATION

On approval, the Requirement schema above is **FROZEN**. Requirement carries three
mandatory, immutable FKs and may never exist without a Campaign (Rule 13). It holds
operational truth only; all intelligence is K14's (Constitution §7). Any later change
requires a new freeze document.

```
Step 1  CLIENT_ENTITY_FINAL.md       ✓ approved
Step 2  PROJECT_ENTITY_FINAL.md      ✓ approved
Step 3  CAMPAIGN_ENTITY_FINAL.md     ✓ approved
Step 4  REQUIREMENT_ENTITY_FINAL.md  ◀ this document (awaiting approval)
Step 5  ASSOCIATE_ENTITY_FINAL.md    (next, after Requirement freeze)
```

**STOP. Await Requirement freeze approval before proceeding to Associate.**
No code · no Apps Script · no sheet changes · no migration execution.
