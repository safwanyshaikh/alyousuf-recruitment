# KAI14-Core — Phase 0 Architecture Artifacts (for CEO approval)

**Status:** SPECIFICATION ONLY — no code exists in this repo yet.
**Rule:** No `.gs` / `.html` file is created until all 10 artifacts below are approved.
**Scope lock:** Only the 8-step chain is in scope. Everything else is frozen.

```
Email → Attachment → Parse → Duplicate Check → Candidate → KAI → Queue → Requirement → Match
```

---

## ARTIFACT 1 — Repository Tree

```
KAI14-Core/
├── foundation/          # owns TRUTH (entities, identity, FK integrity)
│   ├── candidate.gs
│   ├── requirement.gs
│   ├── campaign.gs
│   ├── project.gs
│   └── client.gs
├── k14/                 # owns INTELLIGENCE (parse, score, match)
│   ├── parser.gs
│   ├── scoring.gs
│   └── matching.gs
├── intake/              # owns INGESTION (gmail, cv, dedup)
│   ├── gmail_intake.gs
│   ├── cv_parser.gs
│   └── duplicate_engine.gs
├── execution/           # owns OUTCOMES (orchestration of the chain)
│   └── execution_engine.gs
├── infrastructure/      # owns SERVICES (auth, log, queue, llm)
│   ├── auth.gs
│   ├── logging.gs       # also holds platform CONFIG (single source)
│   ├── queue.gs
│   └── gemini_gateway.gs
├── ui/                  # owns PRESENTATION (read-only views)
│   ├── dashboard.html
│   └── recruiter_console.html
└── docs/                # owns DECISIONS-OF-RECORD
    ├── architecture.md
    ├── ownership.md
    └── schema.md
```

No code yet. This tree is the contract for where each future function lives.

---

## ARTIFACT 2 — Candidate Canonical Schema

Single sheet `Candidates`. **KAINo is the primary key and the FIRST column** (identity at birth, column 1 — never a back-filled trailing column as in legacy).

| # | Field | Group | Owner | Required | Notes |
|--:|-------|-------|-------|:--------:|-------|
| 1 | `KAINo` | Identity | Foundation | ✅ | PK. `AYE-KAI-2026-NNNNNN`. Immutable. |
| 2 | `CreatedAt` | Identity | Foundation | ✅ | Timestamp at row birth. |
| 3 | `Source` | Identity | Foundation | ✅ | `GMAIL` \| `CSV` \| `MANUAL`. Rule 5. |
| 4 | `CampaignID` | Foundation FK | Foundation | ✅ | Rule 13 — never blank (default campaign). |
| 5 | `FullName` | Required | Intake→Foundation | ✅ | |
| 6 | `Email` | Duplicate Key | Intake→Foundation | ⚠️ | Dedup key 3. |
| 7 | `Mobile` | Duplicate Key | Intake→Foundation | ⚠️ | Dedup key 2. |
| 8 | `PassportNo` | Duplicate Key | Intake→Foundation | ⚠️ | Dedup key 1 (strongest). |
| 9 | `Nationality` | Required | K14 | ✅ | |
| 10 | `DOB` | Optional | K14 | ❌ | |
| 11 | `Age` | Optional | K14 | ❌ | Derived. |
| 12 | `Trade` | Required | K14 | ✅ | Classified trade. |
| 13 | `Industry` | Optional | K14 | ❌ | |
| 14 | `Experience` | Required | K14 | ✅ | Years. |
| 15 | `GulfExperience` | Optional | K14 | ❌ | Years in GCC. |
| 16 | `Education` | Optional | K14 | ❌ | |
| 17 | `PositionApplied` | Optional | K14 | ❌ | |
| 18 | `CVLink` | Required | Intake | ✅ | Drive URL. |
| 19 | `Score` | K14 output | K14 | ✅ | Deployability score. |
| 20 | `Verdict` | K14 output | K14 | ✅ | `SHORTLISTED`/`NEEDS_CALL`/`REJECT`/`NEEDS_REVIEW`. |
| 21 | `Flags` | K14 output | K14 | ❌ | Risk/colour flags. |
| 22 | `KAIAssessment` | K14 output | K14 | ❌ | One-line reasoning. |
| 23 | `MissingFields` | K14 output | K14 | ❌ | JSON array of gaps. |
| 24 | `State` | Execution | Execution | ✅ | Lifecycle state (one of 18). |
| 25 | `RequirementID` | Execution FK | Execution | ❌ | Set on match (nullable until matched). |
| 26 | `UpdatedAt` | Execution | Execution | ✅ | Last mutation. |

**Field groups (per CEO spec):**
- **Identity Fields:** `KAINo`, `CreatedAt`, `Source`
- **Required Fields:** `FullName`, `Trade`, `Experience`, `Nationality`, `CVLink`, `Score`, `Verdict`, `State`
- **Optional Fields:** `DOB`, `Age`, `Industry`, `GulfExperience`, `Education`, `PositionApplied`, `Flags`, `KAIAssessment`, `MissingFields`
- **Duplicate Keys:** `PassportNo` → `Mobile` → `Email` (priority order)
- **Foundation Fields:** `KAINo`, `CreatedAt`, `Source`, `CampaignID`
- **K14 Fields:** `Nationality`…`MissingFields` (cols 9–23)
- **Execution Fields:** `State`, `RequirementID`, `UpdatedAt`

---

## ARTIFACT 3 — Requirement Canonical Schema

Single sheet `_Requirements`. **RequirementID is PK, FK-clean (Client/Project/Campaign are IDs, never name strings).**

| # | Field | Owner | Required | Notes |
|--:|-------|-------|:--------:|-------|
| 1 | `RequirementID` | Foundation | ✅ | PK. `AYE-REQ-2026-NNNN`. |
| 2 | `CreatedAt` | Foundation | ✅ | |
| 3 | `ClientID` | Foundation FK | ✅ | → `_Clients`. |
| 4 | `ProjectID` | Foundation FK | ❌ | → `_Projects`. |
| 5 | `CampaignID` | Foundation FK | ✅ | Rule 13. |
| 6 | `Trade` | Foundation | ✅ | |
| 7 | `Quantity` | Foundation | ✅ | Headcount. |
| 8 | `Location` | Foundation | ✅ | Deploy country/city. |
| 9 | `MinExperience` | Foundation | ✅ | Years. |
| 10 | `Nationality` | Foundation | ❌ | Preferred. |
| 11 | `Priority` | Execution | ✅ | `HIGH`/`MED`/`LOW`. |
| 12 | `Status` | Execution | ✅ | `OPEN`/`FILLING`/`CLOSED`. |
| 13 | `JDLink` | Intake | ❌ | Source JD. |

**Ownership:** Foundation owns rows 1–10 (truth); Execution owns `Priority`/`Status` (workflow). K14 never writes this sheet — it only reads it to match.

---

## ARTIFACT 4 — KAI Number Specification

| Aspect | Specification |
|--------|---------------|
| **Format** | `AYE-KAI-<YYYY>-<NNNNNN>` — fixed prefix, 4-digit year, 6-digit zero-padded sequence. Example: `AYE-KAI-2026-000001`. |
| **Generation** | One function (`foundation/candidate.gs :: kaiMint_`) is the SINGLE WRITER. No other code may increment the counter. |
| **Counter** | `PropertiesService` script property `kai14_counter` (integer). Test runs use a separate `kai14_counter_test` with `TEST-KAI` prefix — synthetic data never consumes production numbers. |
| **Locking** | `LockService.getScriptLock()` wraps the read-modify-write of the counter. `tryLock(8000ms)`; on failure, REFUSE to mint (throw) rather than risk a collision. |
| **Uniqueness** | Guaranteed by serialization (lock) + monotonic counter. Concurrency proof required before production (5×100 isolated test, 0 collisions). |
| **Immutability** | Once written (column 1, at row birth), a KAINo is NEVER modified, reissued, recalculated, or back-filled. No dashboard, trigger, or maintenance job may mint or overwrite it. |
| **Birth rule** | KAINo is written in the SAME atomic operation that creates the candidate row. A candidate row without a KAINo cannot exist. |

Specification only — no implementation in this document.

---

## ARTIFACT 5 — Duplicate Engine Specification

| Aspect | Specification |
|--------|---------------|
| **Key priority** | 1) `PassportNo` (exact, normalized) → 2) `Mobile` (digits-only, last-9 match, len > 7) → 3) `Email` (lowercased, exact). |
| **Fallback rule** | If no passport/mobile/email present: `FullName` exact (lowercased, len > 3) — flagged `WEAK_MATCH`, routed to recruiter review, NOT auto-merged. |
| **Index** | `_Meta` sheet holds `Key = Email|Mobile|Passport → KAINo`. Written inside the same lock as candidate creation so a race duplicate is caught by the next thread immediately. |
| **Two-phase check** | (a) Pre-lock fast check against `_Meta` (cheap reject). (b) In-lock re-check (race guard) before minting KAI. |
| **Merge rule** | On duplicate, NEW data fills ONLY blank fields of the existing record (never overwrites populated truth). Logged as `RECORD_MERGED`. |
| **Conflict rule** | If incoming and existing disagree on a populated field (e.g., different passport for same mobile): NO merge — raise `IDENTITY_CONFLICT`, quarantine to review, attributable log entry. |
| **Outcome codes** | `UNIQUE` → create. `DUPLICATE` → merge-blanks + label duplicate. `CONFLICT` → quarantine. |

No code.

---

## ARTIFACT 6 — Runtime Flow (the ONLY approved runtime)

```
   jobs@alyousufent.com  (candidate sends CV)
            │  forward
            ▼
   ai@alyousufent.com  (Gmail label: kai14/intake)
            │
   [intake/gmail_intake.gs]   scan label, one thread at a time
            ▼
   [intake/cv_parser.gs]      extract attachment → bytes
            ▼
   [k14/parser.gs]            Gemini parse → structured candidate fields
            ▼
   [k14/scoring.gs]           score + verdict (evidence evaluation)
            ▼
   [intake/duplicate_engine.gs]  passport→mobile→email check
            │
       ┌────┴─────────────┐
   DUPLICATE/CONFLICT    UNIQUE
       │                  │
   merge/quarantine   [foundation/candidate.gs]  ── LockService ──┐
   + label                │                                        │
                          ├─ race re-check (_Meta)                 │
                          ├─ kaiMint_()  ← SINGLE WRITER           │ atomic
                          ├─ write Candidate row (KAINo col 1)     │ critical
                          ├─ write _Meta dedup index               │ section
                          └─ [infrastructure/queue.gs] enqueue ────┘
                          ▼
   [foundation/requirement.gs]   recruiter creates Requirement (FK-clean)
                          ▼
   [k14/matching.gs]      match candidate(s) ↔ requirement → ranked Top-N
                          ▼
   [ui/recruiter_console.html]   read-only view of matches
```

**Nothing else runs.** No submission, no mobilization, no learning, no outcome engine, no historical replay, no automation beyond this line.

---

## ARTIFACT 7 — Layer Ownership Matrix

| Layer | Owns | May WRITE | May READ | Must NEVER do |
|-------|------|-----------|----------|---------------|
| **Foundation** | Truth: identity, entities, FK | `Candidates`(identity+FK), `_Requirements`(truth cols), `_Clients`, `_Projects`, `_Campaigns`, `_Meta` | all | Score, match, send email, mint metrics |
| **K14** | Intelligence: parse, score, match | nothing persistent (returns objects); `Candidates` K14 cols via Foundation only | `Candidates`, `_Requirements` | Create identity, write FK, mint KAI |
| **Execution** | Outcomes: orchestration, state | `Candidates`(State, RequirementID, UpdatedAt), `_Requirements`(Status, Priority), `_Queue` | all | Parse, score, mint KAI |
| **Infrastructure** | Services: auth, log, queue, LLM | `_Logs`, `_Errors`, `_Sessions`, `_Queue` | config | Make a recruiting decision |
| **UI** | Presentation | nothing (read-only) | via Execution/Foundation getters | Write any sheet, mint identity |

**Single-owner rule:** every function maps to exactly one layer. KAI minting belongs to Foundation and only Foundation.

---

## ARTIFACT 8 — Production Data Migration Plan

Legacy live data (measured): **10,314 candidate rows · 90 KAI collisions · ~2,386 duplicates · only 11 rows with provenance.**

| Stage | Action | Detail |
|-------|--------|--------|
| **0. Freeze** | Snapshot legacy `Candidates` read-only | No writes to legacy during migration. |
| **1. Classify** | Tag every legacy row | `CLEAN` (unique identity), `COLLISION` (shares KAINo), `DUPLICATE` (shares passport/mobile/email), `BLANK_KAI`, `NO_PROVENANCE`. |
| **2. Quarantine** | Move non-CLEAN rows to `_Migration_Quarantine` | The 90 collisions + 2,386 duplicates NEVER enter KAI14 `Candidates` directly. |
| **3. Re-mint** | CLEAN rows imported with FRESH KAI14 numbers | Legacy KAINo preserved in a `LegacyKAINo` audit column; new `AYE-KAI-2026-*` is canonical PK. No legacy collision can propagate. |
| **4. Repair (collisions)** | For each collision cluster, split into distinct identities | Recruiter-assisted; each gets a unique fresh KAINo; mapping table `_Migration_KAIMap` (LegacyKAINo → new KAINo[]). |
| **5. De-dup (duplicates)** | Apply Artifact-5 merge rules | Merge-blanks into a single surviving identity; losers archived with pointer to survivor. |
| **6. Reconcile** | Row-count assertion | `CLEAN_imported + quarantined = 10,314`. No row lost, none silently dropped. |
| **7. Sign-off** | CEO approves counts | Migration is REVERSIBLE until sign-off (legacy untouched). |

Migration is a **separate, later phase** — NOT part of the initial 8-step build. Listed here so the path is known.

---

## ARTIFACT 9 — Legacy Retirement Plan

| Verdict | Items |
|---------|-------|
| **SURVIVES (as reference/data only)** | Legacy `Candidates` data (→ migrated per Artifact 8), live spreadsheet schemas (as evidence), Gemini API key/quota, Drive CV files, auth user list. |
| **DIES (not carried into KAI14)** | `patch_v280/284/287/291/292/293/294`, `KAI_17May2026_*`, `KAI_18May2026_*`, legacy `writeToSheet_`, dashboard-side KAI back-fill, `fcandNextKaiNo_` column-scan, `getDashboardDataV2` mint, `refreshMobilityAndDeployability` mint, all duplicate `getDashboardData` variants, V1 dashboard. |
| **FREEZES (exists, untouched, out of scope)** | Submission engine, Mobilization engine, Learning loop, Outcome engine, T13 matching, Taxonomy engine, Recruiter workflow automation, Historical replay (`backfillCVs`, `runBacklogClearance`), GAP-4/GAP-5. |

KAI14-Core imports **none** of the DIES list. Not one line.

---

## ARTIFACT 10 — Production Acceptance Criteria

KAI14-Core is "operational" ONLY when a **real** end-to-end run passes, evidenced:

| # | Criterion | Pass condition |
|--:|-----------|----------------|
| 1 | Real Email | A genuine CV email on `kai14/intake` is picked up. |
| 2 | Real Attachment | CV attachment extracted to Drive, `CVLink` populated. |
| 3 | Real Parse | Gemini returns structured fields; `Trade`+`Experience`+`Nationality` non-empty. |
| 4 | Real Duplicate Check | Outcome ∈ {UNIQUE, DUPLICATE, CONFLICT} logged with the key that matched. |
| 5 | Real Candidate | One row in `Candidates`, all Required fields present. |
| 6 | Real KAI | `KAINo` present at column 1, format-valid, unique (no collision in sheet). |
| 7 | Real Queue | One `_Queue` row, `Step=INTAKE`, `Status=PENDING`, correct KAINo. |
| 8 | Real Requirement | A requirement created FK-clean (Client/Campaign IDs resolve). |
| 9 | Real Match | `k14/matching` returns ≥1 ranked candidate for that requirement. |
| 10 | Attributable | Every step has a `_Logs` entry (Rule 5). |

**Isolation pre-proof (before any real run):** sequential 100 + concurrent 5×100 in `_TEST_*` sheets with `TEST-KAI` counter → 0 collisions, 0 blank KAI, 0 production impact.

---

## APPROVAL GATE

```
These 10 artifacts → CEO review → APPROVE
        │
        ▼  (only then)
Write KAI14-Core code: candidate.gs, requirement.gs, gmail_intake.gs, parser.gs, matching.gs …
```

No implementation begins until this document is approved.
