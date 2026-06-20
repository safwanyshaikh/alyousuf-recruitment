# KAI OS — FOUNDATION IMPLEMENTATION PLAN
**Phase 5.1 deliverable · Planning only · No code, no sheet changes**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** PROPOSED → awaiting approval before coding begins
**Governed by:** FOUNDATION_CONSTITUTION · KAI_PHASE0_FINAL · TECHNICAL_ARCHITECTURE

> This document answers: WHAT will be built, in WHAT order, from WHAT starting state,
> to WHAT target state, with WHAT migration rules, validation rules, and dependencies.
> No code appears here. Coding begins only after this plan is approved.

---

## PLAN PRINCIPLES

1. **Additive only.** No live data is destroyed. Every change adds columns or backfills
   values; no column is dropped or overwritten.
2. **FK-first.** The hierarchy chain `Client → Project → Campaign → Requirement →
   Associate → Candidate` must be established top-down. A child cannot be reconciled
   before its parent's PK exists.
3. **Campaign-mandatory enforced at write time.** Once the plan is implemented, the
   system refuses any Requirement write without a resolved CampaignID.
4. **Intelligence out of Foundation.** No AI/K14 output columns are added here. If a
   live column holds AI output, it is left in place but governed read-only by Foundation
   rules; K14 owns its values.
5. **No big-bang.** Each entity is reconciled, tested, and accepted before the next
   entity begins. Six sequential gates, not one simultaneous change.
6. **Single source of truth is the repo.** Completed code for each entity is committed
   to `claude/sweet-franklin-mnmfcz` before the next entity begins.

---

## ENTITY BUILD ORDER

```
1. CLIENT       — top of hierarchy; must exist before Project can carry a ClientID FK
2. PROJECT      — parent of Campaign; currently 0 rows (broken); simplest schema to fix
3. CAMPAIGN     — receives ProjectID FK; Campaign-mandatory rule depends on this existing
4. REQUIREMENT  — most complex migration; 97 live rows; 3 FKs to backfill; CampaignID mandatory
5. ASSOCIATE    — no existing code; 20 live rows valid; write engine must be authored from scratch
6. CANDIDATE    — identity and FK columns only; 10,072 rows touched minimally (FK backfill only)
```

Rationale: each entity below depends on the PK of the entity above. Reversing this
order would block FK resolution and require a second pass.

---

## 1. CLIENT IMPLEMENTATION PLAN

### 1.1 Current State
- Tab: `_Clients`
- Live columns: 9 (`ClientCode, ClientName, Country, Sector, ContactName, ContactEmail,
  Status, CreatedAt, Notes`)
- Live rows: **1** (low risk for migration)
- Repo code: `findOrCreateClient_` (patch_v292.txt) — functional find-or-create engine
- Issues: `ClientCode` is used as the join key (a name string). No system PK (`ClientID`)
  exists. Status uses free-text values, not the governed vocabulary.

### 1.2 Target State
18 columns per FOUNDATION_CONSTITUTION §2.1:

| # | Column | Source | New? |
|---|--------|--------|------|
| 1 | ClientID | SYS `CLI-YYYYMMDD-NNNN` | **NEW — promoted PK** |
| 2 | ClientCode | REC | existing (col 1) |
| 3 | ClientName | REC | existing (col 2) |
| 4 | Country | REC | existing (col 3) |
| 5 | Sector | REC governed list | existing (col 4) |
| 6 | MEA Client Category | REC Tier A/B/C/New | **NEW** |
| 7 | Ownership Type | REC Govt/Semi-Govt/Private/JV | **NEW** |
| 8 | State / Emirate | REC | **NEW** |
| 9 | ContactName | REC | existing (col 5) |
| 10 | ContactEmail | REC | existing (col 6) |
| 11 | ContactMobile | REC | **NEW** |
| 12 | Preferred Submission Format | REC PDF/Excel/Portal/Email | **NEW** |
| 13 | Payment Terms | REC | **NEW** |
| 14 | SLA Days | REC | **NEW** |
| 15 | Status | REC governed | existing (col 7) — values need normalization |
| 16 | CreatedAt | SYS | existing (col 8) |
| 17 | CreatedBy | SYS | **NEW** |
| 18 | Notes | REC narrative only | existing (col 9) |

### 1.3 Primary Key
`ClientID` — format `CLI-YYYYMMDD-NNNN`. Backfilled for the 1 existing row. Auto-
generated for all new rows. Never changed after creation. All downstream FKs reference
this value.

### 1.4 Foreign Keys
None. Client is the root of the hierarchy.

### 1.5 Status Rules
Allowed values: `ACTIVE · INACTIVE · BLACKLISTED · PROSPECT`
- Default on create: `ACTIVE`
- `BLACKLISTED` is terminal — no system process reverts it; only a recruiter with write
  authority may change it and must leave a Notes entry explaining why.
- Free-text status values in the live row (`Active`) must be normalized to `ACTIVE` on
  migration.

### 1.6 Migration Rules
1. Read the 1 existing row.
2. Generate `ClientID = CLI-<today>-0001`.
3. Normalize `Status` from `Active` → `ACTIVE`.
4. Insert 9 new columns (empty/null for new optional fields).
5. Set `CreatedBy = SYSTEM-MIGRATION`.
6. Verify: row count before = row count after = 1.

### 1.7 Validation Rules (enforced at write time after build)
- `ClientID` — system-generated, never null, never duplicate.
- `ClientCode` — required, unique across all Client rows.
- `ClientName` — required.
- `Status` — must be one of the 4 governed values; reject any other string.
- Notes — free text; must NOT contain any ID references (IDs belong in FK columns).

### 1.8 Dependencies
- None upstream.
- Downstream: Project, Campaign, Requirement all carry `ClientID` FK — they cannot be
  built FK-clean until ClientID exists.
- `findOrCreateClient_` must be updated to generate and write ClientID.

---

## 2. PROJECT IMPLEMENTATION PLAN

### 2.1 Current State
- Tab: `_Projects`
- Live columns: 9 (`ProjectID, ProjectName, Client, Country, Status, CreatedAt,
  ActiveReqs, TotalPositions, Notes`)
- Live rows: **0 — completely empty; never operationally used**
- Repo code: `createProject_`, `findOrCreateProject_` exist but are non-functional
  (Projects tab never populated; function linked to Campaign form but broken).
- Issues: `Client` column is a name string — no FK. No `ClientID` column exists.
  0 rows means migration risk is zero; schema rebuild is clean.

### 2.2 Target State
19 columns per FOUNDATION_CONSTITUTION §2.2:

| # | Column | Source | New? |
|---|--------|--------|------|
| 1 | ProjectID | SYS `PROJ-YYYYMMDD-NNNN` | existing (col 1) — format governed |
| 2 | Project Code | REC | **NEW** |
| 3 | Project Name | REC | existing (col 2) |
| 4 | **ClientID** | SYS FK → Client | **NEW — critical FK** |
| 5 | ClientName | DEN | existing col 3 (`Client`) → renamed, role changed to DEN |
| 6 | Client Reference Number | REC | **NEW** |
| 7 | Department | REC | **NEW** |
| 8 | Country | REC | existing (col 4) |
| 9 | Location / Site | REC | **NEW** |
| 10 | Project Type | REC Labour/Turnkey/StaffAug/Manpower | **NEW** |
| 11 | Start Date | REC | **NEW** |
| 12 | End Date | REC | **NEW** |
| 13 | Mobilization Target | REC | existing col 8 (`TotalPositions`) → renamed |
| 14 | Recruiter Owner | REC | **NEW** |
| 15 | Priority | REC HIGH/NORMAL/ON-HOLD | **NEW** |
| 16 | Status | REC governed | existing (col 5) |
| 17 | Active Reqs | SYS computed | existing (col 7) |
| 18 | CreatedAt | SYS | existing (col 6) |
| 19 | Notes | REC | existing (col 9) |

### 2.3 Primary Key
`ProjectID` — format `PROJ-YYYYMMDD-NNNN`. Since the tab has 0 rows, the format is
established for all future rows. No backfill needed.

### 2.4 Foreign Keys
- `ClientID` → `Client.ClientID` — **mandatory, non-null**. No Project may be created
  without a resolved Client. `ClientName` (col 5) is denormalized from Client.ClientName
  at write time; it is display-only and never used as a join key.

### 2.5 Status Rules
Allowed values: `ACTIVE · COMPLETED · CANCELLED · ON-HOLD`
- Default on create: `ACTIVE`
- `COMPLETED` or `CANCELLED` are soft-terminal: a recruiter can re-open ON-HOLD;
  CANCELLED requires explicit authority.

### 2.6 Migration Rules
No data rows to migrate. The schema is rebuilt clean. The `Client` column (name string)
is renamed to `ClientName` and its role changes to DEN (denormalized). A new `ClientID`
column is inserted at position 4.

### 2.7 Validation Rules
- `ProjectID` — system-generated, never null, never duplicate.
- `ClientID` — required, must resolve to an existing `Client.ClientID`.
- `ClientName` — DEN: set by the system from Client at write time; recruiter may not
  overwrite directly.
- `Status` — must be one of the 4 governed values.
- `Country` — required (a Project without a country cannot be used for visa/compliance).

### 2.8 Dependencies
- Depends on: Client (ClientID must exist).
- Downstream: Campaign carries ProjectID FK; cannot be FK-clean until Project schema
  exists.
- `createProject_` / `findOrCreateProject_` must be rewritten to resolve ClientID
  before insert and populate ClientName as DEN.

---

## 3. CAMPAIGN IMPLEMENTATION PLAN

### 3.1 Current State
- Tab: `_Campaigns`
- Live columns: 13 (`CampaignID, CampaignName, ClientID[?], ClientName, Sector,
  Location, InterviewDates, InterviewCities, HiringMode, Status, TotalHeads,
  Notes, CreatedAt`)
- Live rows: **1** (low risk)
- Repo code: `findOrCreateCampaign_` — writes 9 of 13 cols; live has `ClientID` present
  but `ProjectID` FK is missing. Verified ClientID is already a FK column in live.
- Issues: `ProjectID` FK missing entirely. 11 new columns needed for target schema.

### 3.2 Target State
24 columns per FOUNDATION_CONSTITUTION §2.3:

| # | Column | Source | New? |
|---|--------|--------|------|
| 1 | CampaignID | SYS `CAMP-YYYYMMDD-NNNN` | existing (col 1) |
| 2 | CampaignName | REC | existing (col 2) |
| 3 | **ClientID** | SYS FK → Client | existing (col 3) — already present |
| 4 | ClientName | DEN | existing (col 4) |
| 5 | **ProjectID** | SYS FK → Project | **NEW — critical FK** |
| 6 | ProjectName | DEN | **NEW** |
| 7 | Campaign Type | REC Interview/DirectHire/BulkMob/Assessment | **NEW** |
| 8 | Sector | DEN from Client | existing (col 5) |
| 9 | Location | REC | existing (col 6) |
| 10 | Country | DEN from Project | **NEW** |
| 11 | Interview Dates | REC | existing (col 7) |
| 12 | Interview Cities | REC | existing (col 8) |
| 13 | Hiring Mode | REC | existing (col 9) |
| 14 | Source Strategy | REC DB/Associate/Walk-In/Referral/Mixed | **NEW** |
| 15 | Associate Network Enabled | REC bool | **NEW** |
| 16 | Walk-In Enabled | REC bool | **NEW** |
| 17 | Target Headcount | REC | existing col 11 (`TotalHeads`) → renamed |
| 18 | Filled Count | SYS computed | **NEW** |
| 19 | Req Count | SYS computed | **NEW** |
| 20 | Priority | REC URGENT/HIGH/NORMAL/LOW | **NEW** |
| 21 | Recruiter Owner | REC | **NEW** |
| 22 | Status | REC governed | existing (col 10) |
| 23 | CreatedAt | SYS | existing (col 13) |
| 24 | Notes | REC | existing (col 12) |

### 3.3 Primary Key
`CampaignID` — format `CAMP-YYYYMMDD-NNNN`. Existing col 1 retains its value.

### 3.4 Foreign Keys
- `ClientID` → `Client.ClientID` — **mandatory**. Already present in live; verify it
  holds the actual ClientID value (not a name string).
- `ProjectID` → `Project.ProjectID` — **mandatory, new column**. The 1 live row must
  have a ProjectID backfilled; recruiter must confirm which Project this Campaign belongs
  to during migration (or the Campaign is tagged `ORPHAN-PENDING` and locked until
  resolved).

### 3.5 Status Rules
Allowed values: `ACTIVE · COMPLETED · CANCELLED · ON-HOLD`
- Default on create: `ACTIVE`
- A Campaign in `COMPLETED` or `CANCELLED` status may not accept new Requirements.
  This gate is enforced at write time by the Requirement write engine (Step 4).

### 3.6 Migration Rules
1. Verify `ClientID` in col 3 holds a value matching a `Client.ClientID`. If it holds a
   name string, resolve it against the Client tab and replace with the ID.
2. Insert `ProjectID` (col 5) — null initially; recruiter must provide the matching
   ProjectID for the 1 live row. Tag row as `NEEDS_PROJECT_FK` if not resolved.
3. Insert 11 new columns at target positions; all new optional fields default to empty.
4. `TotalHeads` (col 11) → renamed `Target Headcount` (col 17); values unchanged.

### 3.7 Validation Rules
- `CampaignID` — system-generated, never null, never duplicate.
- `ClientID` — required, must resolve to `Client.ClientID`.
- `ProjectID` — required, must resolve to `Project.ProjectID`.
- `Status` — must be one of the 4 governed values.
- New Requirements may not be linked to a Campaign with Status `COMPLETED` or
  `CANCELLED`.

### 3.8 Dependencies
- Depends on: Client (ClientID), Project (ProjectID).
- Downstream: Requirement.CampaignID → Campaign.CampaignID. The Campaign-mandatory
  rule (FOUNDATION_CONSTITUTION §6) is enforced by the Requirement write engine, which
  will be built in step 4 below. Campaign must be fully reconciled before Requirement
  build begins.

---

## 4. REQUIREMENT IMPLEMENTATION PLAN

### 4.1 Current State
- Tab: `_Requirements`
- Live columns: 25 (see Phase 0 evidence for full list)
- Live rows: **97 — load-bearing data**
- Repo code: `saveRequirementV293_` writes 19 columns; 6 live columns not written by repo
- Critical issues:
  1. **No CampaignID column** — Campaign-Mandatory Rule violation on all 97 rows
  2. **No ClientID column** — Client stored as name string in live col 3
  3. **ProjectID buried in Notes** as `[Project:PROJ-xxx]` strings — FK in free text
     violation (FOUNDATION_CONSTITUTION §4)
  4. 6-column drift between what the live tab has and what the repo writes

### 4.2 Target State
34 columns per FOUNDATION_CONSTITUTION §2.4:

| # | Column | Source | New? |
|---|--------|--------|------|
| 1 | ReqID | SYS `REQ-YYYYMMDD-NNNN` | existing (col 1) |
| 2 | **CampaignID** | SYS FK → Campaign | **NEW — MANDATORY** |
| 3 | **ProjectID** | SYS FK → Project | **NEW — extracted from Notes** |
| 4 | **ClientID** | SYS FK → Client | **NEW — resolved from name string** |
| 5 | ClientName | DEN | existing (col 3) — role changes to DEN only |
| 6 | Received Date | REC | existing (col 2) |
| 7 | Deploy Country | REC | existing (col 4) |
| 8 | Trade | REC/AI | existing (col 5) |
| 9 | Trade Source | SYS AI/Recruiter flag | **NEW** |
| 10 | Quantity | REC | existing (col 6) |
| 11 | Min Experience (yr) | REC | existing (col 7) |
| 12 | Min Age | REC | existing (col 8) |
| 13 | Max Age | REC | existing (col 9) |
| 14 | GCC Preference | REC | existing (col 10) |
| 15 | Local Transfer Req | REC | existing (col 11) |
| 16 | Visit Visa OK | REC | existing (col 12) |
| 17 | Certifications | REC | existing (col 13) |
| 18 | Urgency | REC | existing (col 14) |
| 19 | Sourced By | REC | existing (col 16) |
| 20 | Special Requirements | REC | existing (col 17) |
| 21 | Interview Mode | REC Face-to-Face/Virtual/Telephonic/CV | **NEW** |
| 22 | Interview Date | REC | existing (col 25) |
| 23 | Food / Accommodation / Transport | REC | **NEW** |
| 24 | Duty Hours | REC | **NEW** |
| 25 | Contract Period | REC | derived from live cols 22–23 (Start/End Date) |
| 26 | Rotation | REC | **NEW** |
| 27 | Medical Standard | REC | **NEW** |
| 28 | Passport Validity Required | REC | **NEW** |
| 29 | Committed Qty | SYS | existing (col 24) |
| 30 | Shortlist Count | SYS computed | existing (col 18) |
| 31 | Selected Count | SYS computed | existing (col 19) |
| 32 | Recruiter Owner | REC | **NEW** |
| 33 | Status | REC governed | existing (col 15) |
| 34 | Raw JD | SYS evidence only | existing (col 21) |
| 35 | Notes | REC narrative ONLY | existing (col 20) — purged of FK strings |

### 4.3 Primary Key
`ReqID` — format `REQ-YYYYMMDD-NNNN`. Existing col 1 values are retained exactly.

### 4.4 Foreign Keys
Three FKs, all mandatory, all new:

| FK column | References | Migration source |
|-----------|-----------|-----------------|
| CampaignID | Campaign.CampaignID | **Must be derived** — no current column. Resolved via ProjectID if available, or assigned from the Campaign linked to the Project. |
| ProjectID | Project.ProjectID | **Parse from Notes** — extract `[Project:PROJ-xxx]` pattern from Notes column. |
| ClientID | Client.ClientID | **Resolve from name string** — match ClientName (col 3) against `_Clients.ClientName`; replace with ClientID. |

### 4.5 Status Rules
Allowed values: `OPEN · FILLED · CLOSED · ON-HOLD`
- Default on create: `OPEN`
- `FILLED` and `CLOSED` are terminal — system processes may not revert them. A recruiter
  may re-open ON-HOLD with attribution.
- Once `CampaignID` is mandatory, a Requirement whose Campaign has Status `COMPLETED` or
  `CANCELLED` is blocked from further transitions.

### 4.6 Migration Rules (ordered steps — 97 rows)

**Step 4.6.1 — ProjectID extraction from Notes**
- For each of the 97 rows, scan Notes (col 20) for the pattern `[Project:PROJ-...]`.
- If found: extract the ProjectID value; write to new `ProjectID` column; remove the
  `[Project:...]` string from Notes (leaving any other narrative text intact).
- If not found: set ProjectID = `NEEDS_MANUAL_RESOLUTION`; flag row for recruiter review.
- Expected outcome: most of the 97 rows carry this Notes pattern (the existing
  `saveRequirementV293_` writes it at col 96 / line of patch_v294). Rows without it
  have never been linked to a project and must be resolved manually.

**Step 4.6.2 — CampaignID derivation from ProjectID**
- For each row with a resolved ProjectID: look up all Campaigns where `Campaign.ProjectID
  = resolved ProjectID`. If exactly 1 Campaign exists, assign it as CampaignID.
- If 0 Campaigns exist for that Project: create a default Campaign for that Project
  (CampaignName = `[Auto: from Req migration]`, Type = `Direct Hire`) and assign it.
- If >1 Campaign exists for that Project: flag row as `NEEDS_CAMPAIGN_SELECTION` for
  recruiter to choose which Campaign this Requirement belongs to.
- For rows with ProjectID = `NEEDS_MANUAL_RESOLUTION`: set CampaignID = `UNRESOLVED`
  and exclude from operations until reconciled.

**Step 4.6.3 — ClientID resolution**
- For each row: match ClientName (col 3) against `_Clients.ClientName`. Write matching
  ClientID to new `ClientID` column.
- If no match: flag as `CLIENT_UNRESOLVED`; require recruiter to select from Client list.

**Step 4.6.4 — Trade Source flag**
- For all 97 existing rows: set `Trade Source = AI` (because current Trade values come
  from the automated trade detection engine).
- A recruiter reviewing and confirming the Trade value flips it to `Trade Source =
  Recruiter` and locks the Trade against automated overwrite.

**Step 4.6.5 — Status normalization**
- Normalize any free-text status values to the governed vocabulary (`OPEN / FILLED /
  CLOSED / ON-HOLD`). Map `Active` → `OPEN`, `Filled` → `FILLED`, etc.

**Step 4.6.6 — Notes cleanup**
- After ProjectID extraction (Step 4.6.1), verify Notes contains no remaining FK
  patterns. Notes is narrative-only from this point forward.

### 4.7 Validation Rules (enforced at write time after build)
- `ReqID` — system-generated, never null, never duplicate.
- `CampaignID` — **required, non-null**. Campaign-Mandatory Rule (§6). Write is refused
  if CampaignID is absent or unresolved.
- `ProjectID` — required, must resolve to `Project.ProjectID`.
- `ClientID` — required, must resolve to `Client.ClientID`.
- `Status` — must be one of the 4 governed values.
- Notes — must NOT contain bracket-enclosed ID patterns (`[Project:...]`, `[Client:...]`
  etc.). Write engine validates and rejects if found.
- `Trade Source` — set to `AI` by system; only a recruiter write sets it to `Recruiter`.
  The AI process may not overwrite a Recruiter-set Trade value.

### 4.8 Dependencies
- Depends on: Client (ClientID), Project (ProjectID), Campaign (CampaignID).
- All 3 parents must be reconciled before Requirement migration can complete.
- The `saveRequirementV293_` function is the load-bearing write path for the live
  system. It must be updated — not replaced — to add the 3 FK columns and the
  Campaign-Mandatory enforcement gate.
- After this step, Requirement is the last Foundation entity that Execution (Phase 5.3)
  will read for `Requirement → Candidate` matching. The ReqID is the stable identifier
  used throughout Execution and K14.

---

## 5. ASSOCIATE IMPLEMENTATION PLAN

### 5.1 Current State
- Tab: `_Associates`
- Live columns: 19 (`AssocId, CompanyName, ContactName, Email, Mobile, State, City,
  LicenseType, LicenseNo, Specialization, Capacity, NumRecruiters, LinkedInUrl,
  WebsiteUrl, Address, Status, CreatedAt, Notes, Source`)
- Live rows: **20 — real operational associates**
- Repo code: **ZERO** — no read, no write, no find function exists in the repo
- Issues: Associates are an operational orphan. They exist in the sheet with 20 rows
  but the repo has never written or read them. No `Source Associate` FK is populated
  on any Candidate row (Candidate.col 44 exists but is empty or inconsistent).

### 5.2 Target State
15 field groups per FOUNDATION_CONSTITUTION §2.5 (most map to existing columns):

| # | Column | Source | New? |
|---|--------|--------|------|
| 1 | AssocId | SYS | existing (col 1) — format to be governed |
| 2 | CompanyName | REC | existing (col 2) |
| 3 | ContactName | REC | existing (col 3) |
| 4 | Email | REC | existing (col 4) |
| 5 | Mobile | REC | existing (col 5) |
| 6 | Type | REC Agency/Freelancer/Sub-Agent | **NEW — derived from LicenseType** |
| 7 | State | REC | existing (col 6) |
| 8 | City | REC | existing (col 7) |
| 9 | LicenseType | REC | existing (col 8) |
| 10 | LicenseNo | REC | existing (col 9) |
| 11 | Specialization | REC | existing (col 10) |
| 12 | Capacity | REC | existing (col 11) |
| 13 | NumRecruiters | REC | existing (col 12) |
| 14 | LinkedInUrl | REC | existing (col 13) |
| 15 | WebsiteUrl | REC | existing (col 14) |
| 16 | Address | REC | existing (col 15) |
| 17 | Status | REC governed | existing (col 16) |
| 18 | CreatedAt | SYS | existing (col 17) |
| 19 | Source | REC | existing (col 19) |
| 20 | Notes | REC | existing (col 18) |

Note: `Rating, TotalSubmissions, TotalSelections, TotalMobilizations` are **NOT added**
here — they are K14.OUTCOMES intelligence (FOUNDATION_CONSTITUTION §8).

### 5.3 Primary Key
`AssocId` — existing col 1. The format used by the 20 live rows must be audited;
if it is consistent (e.g. numeric or code-based) it is retained as-is. If it is
inconsistent, each AssocId is left in place (no renumber) but the write engine enforces
the format for all future rows.

### 5.4 Foreign Keys
Associate has no parent FK in the hierarchy (it sits at the Requirement level, not
below it). Its relationship to Candidate is expressed via Candidate's `Source Associate`
FK (Step 6 below).

### 5.5 Status Rules
Allowed values: `ACTIVE · INACTIVE · BLACKLISTED`
- Default on create: `ACTIVE`
- `BLACKLISTED` is terminal — no system process reverts it; recruiter authority only.

### 5.6 Migration Rules
1. Read the 20 existing rows; verify all AssocId values are unique and non-null.
2. Map `LicenseType` values to the `Type` classification: if LicenseType indicates a
   registered agency → `Agency`; an individual without a firm → `Freelancer`; otherwise
   → `Sub-Agent`. Add `Type` column.
3. Normalize `Status` to the governed vocabulary (`ACTIVE / INACTIVE / BLACKLISTED`).
4. No rows are deleted or overwritten. Column order may shift to match the target schema
   (additive insert of the `Type` column at position 6).

### 5.7 Validation Rules
- `AssocId` — non-null, unique.
- `CompanyName` — required.
- `Status` — must be one of the 3 governed values.
- No performance metrics (Rating, submission counts) stored in Foundation columns.

### 5.8 Dependencies
- No upstream Foundation FK dependency. Associate may be built after Client (so a
  Candidate can later carry both a Source Associate FK and a Source Campaign FK, both of
  which need the referenced entities to exist).
- Downstream: Candidate.`Source Associate` FK → Associate.AssocId. The Candidate FK
  backfill (Step 6) depends on this schema existing and AssocId values being stable.
- **New code required:** `findOrCreateAssociate_`, `saveAssociate_`, `getAssociate_`.
  These are authored fresh from the Foundation Constitution — no legacy engine to port.

---

## 6. CANDIDATE IMPLEMENTATION PLAN

### 6.1 Current State
- Tab: `Candidates`
- Live columns: **48**
- Live rows: **10,072 — the most sensitive data in the system**
- Repo code: `CONFIG_V2` references 38 column indices; 10 live columns are unknown to
  the repo (`Source Associate` col 44, `Source Lead` col 45, `Source Campaign` col 46,
  and others).
- Issues:
  1. `Source Associate` (col 44), `Source Campaign` (col 46) exist in the live tab but
     are empty or inconsistently populated — no FK write engine populates them.
  2. 10-column drift between repo CONFIG and live sheet.
  3. Intelligence columns (Score, Verdict, Assessment, K14 Match IDs, Deployability,
     Top3 positions, Tech Review) live alongside Foundation truth columns in the same
     sheet — Foundation governs only the truth columns.

### 6.2 Target State (Foundation scope only)
Foundation governs identity and source FK columns only. The full 48-column sheet is
left intact; Foundation implementation adds discipline to specific columns, not new ones.

| Foundation column | Position (live) | Governance |
|-------------------|----------------|-----------|
| KAI No | 25 | PK — system-generated, stable |
| Name | 3 | Foundation truth |
| Mobile | 4 | Foundation truth |
| Email | 5 | Foundation truth (dedup key alongside KAI No) |
| Nationality | 6 | Foundation truth |
| DOB | 13 | Foundation truth |
| Age | 14 | Foundation truth (computed from DOB) |
| Candidate State | 28 | Governed state machine (18 states per Constitution §5) |
| **Source Associate** | **44** | **FK → Associate.AssocId — needs write engine** |
| **Source Lead** | **45** | FK → _Leads (out of scope for Phase 5.1) |
| **Source Campaign** | **46** | **FK → Campaign.CampaignID — needs write engine** |
| Source Type | 43 | Foundation truth (DB/Walk-In/Referral/Associate) |
| Received Via | 47 | Foundation truth |
| Received Date | 48 | Foundation truth |

Intelligence columns (Score col 15, Verdict col 16, Assessment col 17, Match IDs,
Deployability col 40, Top3 col 34, Tech Review col 37, K14 outputs): **left in place,
governed as K14 output — Foundation does not write to these**.

### 6.3 Primary Key
`KAI No` — col 25. Format already established and stable. No change.

### 6.4 Foreign Keys
Two FK columns that require backfill:

| FK column | References | Backfill source |
|-----------|-----------|----------------|
| Source Associate | Associate.AssocId | Match against _Associates by CompanyName or Email if available; otherwise flag as `UNRESOLVED` |
| Source Campaign | Campaign.CampaignID | Match against _Campaigns by CampaignID or CampaignName in the import record; otherwise flag as `UNRESOLVED` |

Note: `Source Lead` → `_Leads` is out of scope for Phase 5.1 (no Lead entity
reconciliation plan exists yet). The column is left as-is.

### 6.5 Status Rules
Candidate State governs a strict 18-state machine (FOUNDATION_CONSTITUTION §5):
`NEW · PARSED · INCOMPLETE_CONTACT · UNKNOWN_TRADE · FRESHER_POOL · UNDER_REVIEW ·
SHORTLISTED · CLIENT_SENT · CLIENT_SELECTED · OFFER_ISSUED · VISA_PROCESS ·
ECR_PENDING · MEDICAL_PENDING · READY_TO_DEPLOY · DEPLOYED · REJECTED · HOLD`

- Terminal states: `DEPLOYED · REJECTED`
- A recruiter-set terminal state is never auto-reverted.
- Execution (Phase 5.3) drives state transitions; Foundation records them.

### 6.6 Migration Rules
**Conservative: do not touch what works.**

1. Audit `Source Associate` (col 44) and `Source Campaign` (col 46) for each of the
   10,072 rows:
   - Where a value exists and is recognizable: validate it resolves to a live
     Associate or Campaign; leave it if valid.
   - Where empty: attempt to infer from import metadata (email headers, campaign name
     in import batch) if available; if not, leave empty (do not guess).
2. Normalize `Candidate State` (col 28) values to the governed 18-state vocabulary.
   Map legacy states: `Active` → `UNDER_REVIEW`, `Shortlisted` → `SHORTLISTED`, etc.
   Document the full mapping before executing (recruiter approval required).
3. No other columns are touched. No Intelligence columns are migrated or moved.
4. Row count before = row count after = 10,072 (additive rule, no deletes).

### 6.7 Validation Rules (enforced at write time after build)
- `KAI No` — system-generated, never null, never duplicate.
- `Mobile` or `Email` — at least one required (dedup key for identity check).
- `Candidate State` — must be one of the 18 governed state values.
- `Source Associate` — if populated, must resolve to `Associate.AssocId`; rejected if
  unresolvable (not silently cleared).
- `Source Campaign` — if populated, must resolve to `Campaign.CampaignID`.
- Intelligence columns — Foundation write engine does not touch them; if a Foundation
  write operation attempts to write to columns 15, 16, 17, 34, 37, 40 or K14-owned
  columns, the write is refused.

### 6.8 Dependencies
- Depends on: Associate (AssocId must exist to validate Source Associate FK), Campaign
  (CampaignID must exist to validate Source Campaign FK).
- Because Candidate has 10,072 rows, FK backfill is the highest-volume migration in
  Phase 5. It is done in batches (suggested: 500 rows per batch) with a dry-run
  producing a reconciliation report before the actual write.
- `CONFIG_V2` column index map must be updated to reference all 48 live columns (not 38).
  This is a configuration update, not a logic change.

---

## MIGRATION MAPPING

| Current Sheet | Foundation Entity | Key Action |
|---------------|------------------|------------|
| `_Clients` | Client | Generate ClientID (PK); add 9 new cols; normalize Status |
| `_Projects` | Project | Rebuild schema; add ClientID FK col; 0 data rows (clean) |
| `_Campaigns` | Campaign | Verify ClientID; add ProjectID FK col; add 11 new cols |
| `_Requirements` | Requirement | Extract ProjectID from Notes; derive CampaignID; add ClientID; normalize Status; purge Notes of FK strings |
| `_Associates` | Associate | Add Type col; normalize Status; write engine authored from scratch |
| `Candidates` | Candidate | Backfill Source Associate + Source Campaign FKs; normalize Candidate State; update CONFIG_V2 map |

---

## GAP ANALYSIS

### What Exists (usable as-is or with minor adjustment)
| Asset | Verdict |
|-------|---------|
| `findOrCreateClient_` (v292) | Update to write ClientID; otherwise functional |
| `createProject_` / `findOrCreateProject_` | Rewrite FK logic; schema rename; otherwise structure usable |
| `findOrCreateCampaign_` | Add ProjectID write; add 11 new cols; otherwise functional |
| `saveRequirementV293_` | Add 3 FK columns + Campaign-Mandatory gate; most of the 19 existing writes stay intact |
| `_Clients` (1 row) | Valid data; migrate with low risk |
| `_Campaigns` (1 row, ClientID present) | Valid data; add ProjectID FK |
| `_Requirements` (97 rows) | Load-bearing data; migrate in place with the 6-step plan above |
| `_Associates` (19 cols, 20 rows) | Valid schema and data; just needs write engine + Type col |
| `Candidates` (48 cols, 10,072 rows) | Foundation identity columns are solid; FK backfill needed |

### What Is Missing (must be created)
| Gap | Description |
|----|-------------|
| ClientID generation | No system PK for Clients; must be generated and backfilled |
| Project.ClientID column | FK column missing from _Projects tab |
| Campaign.ProjectID column | FK column missing from _Campaigns tab |
| Requirement.CampaignID column | Campaign-Mandatory rule column does not exist |
| Requirement.ProjectID column | Currently buried in Notes strings |
| Requirement.ClientID column | Currently stored as name string only |
| Requirement.TradeSource column | No flag to distinguish AI-detected vs recruiter-set Trade |
| Associate write engine | `findOrCreateAssociate_`, `saveAssociate_`, `getAssociate_` — none exist |
| Associate.Type column | Must be derived from LicenseType and added |
| Candidate.Source Associate FK enforcement | Column exists (col 44) but no write engine validates or populates it |
| Candidate.Source Campaign FK enforcement | Column exists (col 46) but same gap |
| Candidate State normalization | 18-state vocabulary not enforced; free-text values present |
| CONFIG_V2 column map update | Repo references 38 cols; live has 48; 10-col gap |

### What Must NOT Be Created (out of scope for Foundation)
| Item | Reason |
|------|--------|
| Scoring columns on Requirement | K14 output, not Foundation truth |
| Match/Assessment columns on Candidate | K14 output |
| AssociateReliability/Rating columns | K14.OUTCOMES intelligence |
| Any T13, submission, pipeline, mobilization tables | Phase 5.3 (Execution) scope |
| Taxonomy tables | Phase 5.4 (K14) scope |
| Any AI-generated field in Foundation master | Forbidden by Foundation Constitution §7 |

---

## BUILD SEQUENCE (code delivery order)

Once this plan is approved, code is delivered in this exact order:

```
STEP 1  foundation_client_v1.gs
        - generateClientID_()
        - saveClient_() / findOrCreateClient_v2_() with all 18 cols
        - validateClient_() status gate
        Acceptance: 1 existing row migrated; new Client creation tested end-to-end

STEP 2  foundation_project_v1.gs
        - saveProject_() / findOrCreateProject_v2_() with ClientID FK
        - validateProject_() ClientID resolve gate
        Acceptance: schema clean; new Project creation requires valid ClientID

STEP 3  foundation_campaign_v1.gs
        - saveCampaign_() / findOrCreateCampaign_v2_() with ClientID + ProjectID FKs
        - validateCampaign_() FK resolve gate
        Acceptance: 1 existing row migrated with ProjectID; new Campaign creation gated

STEP 4  foundation_requirement_v1.gs
        - migrateRequirements_() — the 6-step migration script (dry-run first)
        - saveRequirement_v1_() with CampaignID mandatory gate
        - validateRequirement_() CampaignID + ClientID + ProjectID gate
        Acceptance: 97 rows migrated; CampaignID populated or flagged; Notes purged

STEP 5  foundation_associate_v1.gs
        - saveAssociate_() / findOrCreateAssociate_() / getAssociate_()
        - validateAssociate_() status gate
        Acceptance: 20 existing rows validated; write/read round-trip tested

STEP 6  foundation_candidate_fk_v1.gs
        - backfillCandidateFKs_() — Source Associate + Source Campaign (batched, dry-run first)
        - updateCandidateStateVocabulary_() — normalize to 18-state machine
        - CONFIG_V2 column map update (38→48 cols)
        Acceptance: FK backfill report produced and approved; state values normalized
```

---

## ACCEPTANCE CRITERIA (per entity)

Before any entity is accepted as complete:
1. Row count before migration = row count after migration (no data loss).
2. All FK columns populated or explicitly flagged `NEEDS_MANUAL_RESOLUTION` (no silent nulls on mandatory FKs).
3. Status values for all existing rows conform to the governed vocabulary.
4. Write engine tested: a new record write enforces all validation rules.
5. Write engine tested: an invalid write (missing mandatory FK, invalid status) is refused with an error, not silently accepted.
6. Notes columns contain no bracket-enclosed ID strings.
7. No K14 / intelligence output written by the Foundation engine.
8. Changes committed to `claude/sweet-franklin-mnmfcz` with a per-entity commit.

---

## PHASE BOUNDARY

This document is the Phase 5.1 implementation plan. Coding begins only after this plan
is approved.

```
PHASE 0   Reality Map              ✓ complete
PHASE 1   Foundation Constitution  ✓ complete
PHASE 2   K14 Constitution         ✓ complete
PHASE 3   Execution Constitution   ✓ complete
PHASE 4A  KAI OS Blueprint         ✓ complete
PHASE 4B  Technical Architecture   ✓ complete
PHASE 5.1 Foundation Plan          ◀ this document (awaiting approval)
PHASE 5.2 Foundation Migration     (only after 5.1 approved)
PHASE 5.3 Execution Build
PHASE 5.4 K14 Build
PHASE 5.5 K14 Training/Benchmarking
PHASE 5.6 Cutover
```

**STOP. Await approval before writing any code.**
