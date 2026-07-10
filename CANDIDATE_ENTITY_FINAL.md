# CANDIDATE ENTITY — FINAL FREEZE
**Phase 5.1 · Step 6 freeze document · Final entity in the Foundation chain**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → freeze on approval
**Governed by:** FOUNDATION_CONSTITUTION §2.6 · FOUNDATION_BUILD_RULES (14 rules)
**Prerequisite:** CANDIDATE_FIELD_OWNERSHIP.md — 100% field ownership confirmed before this freeze

> Candidate is the highest-volume entity (10,072 rows, 48 columns). Foundation governs
> identity + source FKs + factual recruiter-entered data only. Execution governs pipeline
> and operational records. K14 governs all intelligence. The 10-column gap between
> CONFIG_V2 (38 known) and the live sheet (48 total) is closed here by explicit
> verification/addition of every missing field shown on the finalized UI.

---

## 1. COLUMNS — COMPLETE SCHEMA

### 1A. CONFIRMED LEGACY COLUMNS (keep in place — Rule 2 + Rule 11)

These are the columns confirmed in CONFIG_V2 or known from Phase 0 evidence. Positions
are approximate (exact column numbers verified at build time from the live sheet).

| Group | Columns (approx) | Owner | Action |
|-------|-----------------|-------|--------|
| Identity core | Name, Mobile, Email, Nationality, KAI No | **F** | KEEP |
| Demographics | DOB, Age | **F** | KEEP |
| Operational state | Candidate State (col 28) | **F** | KEEP — legacy value untouched |
| Source tracking | Source Type (col 43), Source Associate (col 44), Source Lead (col 45), Source Campaign (col 46), Received Via (col 47), Received Date (col 48) | **F** | KEEP (FK cols unpopulated — backfill in migration) |
| K14 output cols | Score, Verdict, Assessment, Match IDs, Deployability, Top3 positions, Tech Review | **K** | KEEP — Foundation never writes to these; K14 owns |

### 1B. NEW COLUMNS (appended right — cols 49 onward, Rule 4)

Every field from the finalized UI screen that is unconfirmed or missing from the 38-col
CONFIG_V2 map is added here. Existing fields in the unmapped 10-col gap (cols 39–48) are
verified at build time; if already present, the new column is NOT added (no duplication).

| # | New column | Owner | Governed values / format |
|---|-----------|-------|--------------------------|
| A | **PhotoUrl** | F | Drive URL string; recruiter-uploaded; empty = no photo (never AI-generated) |
| B | **WhatsApp** | F | Phone number; may mirror Mobile; separate field for messaging |
| C | **PassportNumber** | F | String; recruiter-entered |
| D | **PassportExpiry** | F | Date `YYYY-MM-DD`; recruiter-entered; drives PassportStatus |
| E | **PassportStatus** | F | Governed: `VALID · EXPIRED · EXPIRING-SOON · MISSING`; derived from PassportExpiry at write time; recruiter-correctable |
| F | **TotalExperience** | F | Numeric (years); recruiter-verified |
| G | **GCCExperience** | F | Numeric (years); recruiter-verified; separate from TotalExperience |
| H | **CurrentCountry** | F | String; recruiter-entered |
| I | **CurrentCity** | F | String; recruiter-entered |
| J | **PreviousGCCCountry** | F | String; last GCC country worked in |
| K | **CurrentEmployer** | F | String; recruiter-entered |
| L | **Education** | F | Highest qualification; string |
| M | **Languages** | F | Multi-value string (e.g. "Arabic:Native,English:Fluent") |
| N | **Certificates** | F | Multi-value string (e.g. "OSHA 30-Hr,NEBOSH") |
| O | **NoticeRaw** | F | Numeric (days); raw recruiter-captured notice period |
| P | **FoundationState** | F | Governed 18-state vocabulary (Rule 11 — beside legacy Candidate State col 28) |
| Q | **UpdatedAt** | F | SYS timestamp; set on every Foundation write |
| R | **CreatedAt** | F | SYS timestamp; set once at creation |

**Verification instruction (at build time, before adding):** for each column A–R, check
whether it already exists in the live 48-column sheet. If it does, map the existing
column; do NOT add a duplicate. Add only what is genuinely absent.

**Excluded (not Foundation):** Rating, AssociateReliability, Deployability (K14 col),
Assessment (K14 col), Match IDs (K14 col), Submission count, Pipeline state-dots
(Execution), Notes (Execution), Documents (Execution).

---

## 2. PRIMARY KEY

- **KAI No** (col 25) — existing PK. Format already established. No change.
- System-generated, never null, never duplicated, never changed.
- All 10,072 rows keep their KAI No exactly.

---

## 3. FOREIGN KEYS (two, immutable — Rule 12)

| FK column | References | Migration action |
|-----------|-----------|-----------------|
| Source Associate (col 44) | Associate.AssocId | Backfill by exact match (email/company) where possible; otherwise `ASSOC_UNRESOLVED` + lock (no guess — Rule 13) |
| Source Campaign (col 46) | Campaign.CampaignID | Backfill from import-batch metadata where unambiguous; otherwise `CAMP_UNRESOLVED` + lock (no guess) |

`Source Lead` (col 45) → `_Leads` FK backfill is out of scope for Phase 5.1 (Lead entity not yet frozen). Column preserved as-is; not written by Foundation in this phase.

---

## 4. FOUNDATION STATE (18-state machine)

Legacy state column (col 28) is **left untouched** (Rule 11). Governance lives in new
`FoundationState` column (col P above), derived from the legacy value at migration.

Governed vocabulary:
```
NEW · PARSED · INCOMPLETE_CONTACT · UNKNOWN_TRADE · FRESHER_POOL ·
UNDER_REVIEW · SHORTLISTED · CLIENT_SENT · CLIENT_SELECTED ·
OFFER_ISSUED · VISA_PROCESS · ECR_PENDING · MEDICAL_PENDING ·
READY_TO_DEPLOY · DEPLOYED · REJECTED · HOLD
```

- Terminal states: `DEPLOYED · REJECTED` — never auto-reverted by any process.
- Execution (Phase 5.3) drives state transitions; Foundation records them.
- A recruiter-set terminal state is never overwritten by K14 or any system process.

---

## 5. TRUTH-ONLY RULE (Constitution §7 / Rule 7 — restated)

```
FOUNDATION  =  WHO the candidate is + verifiable facts about them
K14         =  WHAT K14 interprets about the candidate
EXECUTION   =  WHAT has happened to the candidate in the pipeline
```

**Foundation writes:** identity, factual inputs (passport, experience, education,
languages, certs, employer, contact details, source FKs, state).

**Foundation NEVER writes:**
- K14 outputs: Assessment, Score, Verdict, Match, Rank, Deployability, Top3, Risk,
  Readiness, Confidence, Reasoning, Recommendations, Missing Data.
- Execution outputs: Submission records, Selection records, Pipeline stage per requirement.

Existing K14 output columns in the live sheet (Score col 15, Verdict 16, Assessment 17,
Top3 34, Tech Review 37, Deployability 40, Match IDs) are **left in place, read-only to
Foundation**. Foundation write engine refuses any write to these columns.

---

## 6. PASSPORT STATUS GOVERNANCE

`PassportStatus` is a Foundation-governed field, not a K14 output:

```
PassportExpiry (Foundation fact)
  ↓
PassportStatus (Foundation derived, governed)
  VALID          = expiry > 6 months from today
  EXPIRING-SOON  = expiry within 6 months
  EXPIRED        = expiry in the past
  MISSING        = no PassportExpiry recorded
```

The derivation rule is deterministic (no inference). The recruiter may override
PassportStatus directly (e.g. passport renewed, not yet updated in system). The override
is recorded as a recruiter write.

---

## 7. K14 OUTPUT PACKAGE (separate store — not in Candidate master)

K14 intelligence is stored separately, keyed by KAI No. Nothing in this package lives
in the Candidate Foundation tab.

| K14 field | Type | Owned by |
|-----------|------|---------|
| CandidateID (KAI No) | Link key | K14 store |
| Assessment | Full text | K14 |
| Readiness | READY / CONDITIONAL / NOT-READY | K14 |
| Risk | Classification + reason | K14 |
| Recommendations | Requirements/Clients/Campaigns | K14 |
| Missing Data | List of blocking absences | K14 |
| Evidence References | Which Foundation facts drove output | K14 |
| Confidence | 0–100 with basis | K14 |
| Last Evaluated | Timestamp | K14 |
| K14 Version | Brain version string | K14 |
| Availability | Immediate/2Weeks/1Month/Unavailable | K14 |
| Deployability | Computed signal | K14 |
| Top Positions | 3 best-matched roles | K14 |

This package is produced by K14.REASON in Phase 5.4. It is referenced here only to
confirm its fields are **explicitly excluded** from the Candidate Foundation master.

---

## 8. VALIDATION RULES (enforced at write time)

1. `KAI No` — system-generated; reject null or duplicate.
2. `Name` — required.
3. Contact governance — at least one of `Mobile` / `Email` required and format-valid.
4. `FoundationState` — must be one of the 18 governed values; terminal states
   (`DEPLOYED`, `REJECTED`) refuse system-initiated reversion.
5. `Source Associate` — if set, must resolve to `Associate.AssocId`; reject if
   unresolvable (not silently cleared).
6. `Source Campaign` — if set, must resolve to `Campaign.CampaignID`.
7. `PassportStatus` — must be one of the 4 governed values; derive from `PassportExpiry`
   at write time; recruiter override accepted with attribution.
8. `TradeSource` flag — set `AI` by system; only a recruiter write sets `Recruiter`;
   AI may not overwrite a Recruiter-set Trade.
9. **No K14 field written** by Foundation engine (Rule 7): refuse writes to Score,
   Verdict, Assessment, Top3, Deployability, Match ID, Readiness, Risk columns.
10. `Notes` (if present in master) — narrative only; no bracket-enclosed ID patterns.
11. FK immutability — `Source Associate` and `Source Campaign` are immutable once set;
    reject any write that changes them (Rule 12).
12. No performance metric written (Rule 14): reject associate-reliability or submission-
    count fields.

---

## 9. MIGRATION IMPACT (10,072 rows — highest volume)

**Ordered steps; dry-run first; 500-row batches; recruiter-approved reconciliation
report before any write. No-guess doctrine (Rule 13) applies to every step.**

1. **Verify new columns A–R** — check each against the live 48-col sheet. Map existing;
   add only those genuinely absent. Record exact column positions.
2. **Source Associate backfill** — exact-match by associate email or company name; single
   unambiguous match → write AssocId; ambiguous or absent → `ASSOC_UNRESOLVED`, lock.
3. **Source Campaign backfill** — match from import-batch campaign tag where unambiguous;
   otherwise → `CAMP_UNRESOLVED`, lock.
4. **PassportStatus derivation** — compute from PassportExpiry for all rows where expiry
   is known; `MISSING` where no expiry exists.
5. **FoundationState derivation** — map legacy state column values to governed vocabulary.
   Full mapping table produced and recruiter-approved before execution.
6. **NoticeRaw population** — already in live data for candidates processed through
   patch_v284+; confirm column; do not re-derive.

- **Data deleted:** none (Rule 1). **Renamed:** none (Rule 2). **Sheet replaced:** no
  (Rule 3). **Additive only:** yes (Rule 4). **Repurposed:** none (Rule 11). **K14
  fields touched:** none (Rule 7).
- **Reversibility (Rule 5 / Rule 10):**
  - ROLLBACK: delete new columns (A–R added); restore Source Associate/Campaign to pre-
    migration values from snapshot. All legacy columns otherwise unchanged.
  - A full pre-migration snapshot (all 10,072 rows) is captured before any write.

---

## 10. ACCEPTANCE CRITERIA

Candidate (Step 6) is accepted only when ALL pass:

1. Row count before = row count after = **10,072** (no data loss).
2. All new columns exist at confirmed positions with exact headers above.
3. Every row has `FoundationState` derived (or explicitly tagged if the legacy value
   could not be mapped); legacy state column unchanged.
4. `PassportStatus` derived for all rows with a known `PassportExpiry`.
5. Source Associate and Source Campaign: every row either resolved or explicitly tagged
   (`ASSOC_UNRESOLVED` / `CAMP_UNRESOLVED`) — no silent nulls.
6. Foundation write engine **refuses** writes to K14 output columns (Score, Verdict,
   Assessment, Top3, Deployability, Match IDs) — verified by test.
7. Foundation write engine **refuses** writes that would change an existing Source
   Associate or Source Campaign FK (Rule 12).
8. New Candidate creation, end-to-end, enforces contact governance, FoundationState
   vocabulary, and FK validation.
9. All 22 Foundation fields shown on the finalized UI are readable from the master via
   the Candidate read API.
10. Pre-migration snapshot exists; documented rollback confirmed; commit includes a
    `ROLLBACK:` block (Rule 10).

---

## FREEZE DECLARATION

On approval, the Candidate schema above is **FROZEN**. Foundation holds identity and
factual inputs; Execution holds pipeline and operational records; K14 holds all
intelligence. The K14 Output Package (Section 7) is confirmed excluded from Foundation
and reserved for Phase 5.4.

```
Step 1  CLIENT_ENTITY_FINAL.md       ✓ approved
Step 2  PROJECT_ENTITY_FINAL.md      ✓ approved
Step 3  CAMPAIGN_ENTITY_FINAL.md     ✓ approved
Step 4  REQUIREMENT_ENTITY_FINAL.md  ✓ approved
Step 5  ASSOCIATE_ENTITY_FINAL.md    ✓ approved (pending)
Step 6  CANDIDATE_ENTITY_FINAL.md    ◀ this document (awaiting approval)
```

**When all six freezes are approved: Foundation chain is constitutionally locked.**
**Next: foundation_client_v1.gs → first line of Foundation code is authorized.**

No code · no Apps Script · no sheet changes · no migration execution.
