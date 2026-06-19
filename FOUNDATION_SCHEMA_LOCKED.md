# FOUNDATION — LOCKED SCHEMA & DATA DICTIONARY
**Status:** FROZEN — Foundation backbone for the next 10 years
**Repository:** safwanyshaikh/alyousuf-recruitment (ACTIVE — only place new work lands)
**Legacy:** safwanyshaikh/kai (FROZEN — no new code, fixes, APIs, screens, or architecture changes)
**Date Locked:** 2026-06-19 (amended with 3 final amendments)

> This document is the single source of truth for the Foundation layer.
> No code. No UI redesign. Schema + architecture + migration only.
> Build order is at the bottom. Start at Step 1 tomorrow.

---

## 0. ENTITY HIERARCHY (LOCKED)

```
Client
  └── Project
        └── Campaign
              └── Requirement        ← MUST belong to a Campaign. No standalone requirements.
                    └── Associate    ← CORE Foundation entity (build now)
                          └── Candidate
```

**AMENDMENT 1 — Requirement must belong to a Campaign. No bypass.**
Requirement creation flow is fixed: `Client → Project → Campaign → Requirement`.
A Requirement cannot exist without a Campaign ID. This prevents orphan requirements.

**Execution chain (reserved — DO NOT build now, but architecture must not block it):**

```
Requirement → Match → Submission → Selection → Mobilization
```

GCC recruitment reality: a Requirement is worked by an **Associate** (agency / sub-agent / freelancer),
who supplies **Candidates**. It is never Requirement → Candidate directly.

---

## 1. CLIENT — LOCKED

| # | Field | Type | Source | Notes |
|---|-------|------|--------|-------|
| 1 | Client ID | String | System | `CLI-YYYYMMDD-NNNN` |
| 2 | Client Name | String | Recruiter | Full legal name |
| 3 | Client Code | String | Recruiter | Short alias (ARAMCO, ADNOC, ALDAR) |
| 4 | Industry | Enum | Recruiter | Oil & Gas / Construction / Hospitality / Manufacturing / Healthcare / Logistics / Other |
| 5 | MEA Client Category | Enum | Recruiter | Tier A / Tier B / Tier C / New |
| 6 | Ownership Type | Enum | Recruiter | Government / Semi-Government / Private / JV |
| 7 | Country | String | Recruiter | Primary HQ country |
| 8 | State / Emirate | String | Recruiter | Abu Dhabi, Dubai, Jubail, etc. |
| 9 | Contact Person | String | Recruiter | Primary contact name |
| 10 | Contact Email | String | Recruiter | |
| 11 | Contact Mobile | String | Recruiter | |
| 12 | Preferred Submission Format | Enum | Recruiter | PDF / Excel / Portal / Email Body |
| 13 | Payment Terms | String | Recruiter | e.g. "30 days", "On mobilization" |
| 14 | SLA Days | Number | Recruiter | Submission-to-feedback SLA |
| 15 | Status | Enum | Recruiter | ACTIVE / INACTIVE / BLACKLISTED / PROSPECT |
| 16 | Blacklisted | Boolean | Recruiter | Hard stop on new submissions |
| 17 | Created Date | Date | System | |
| 18 | Created By | String | System | Recruiter who onboarded |
| 19 | Notes | Text | Recruiter | Free-form |

---

## 2. PROJECT — LOCKED

| # | Field | Type | Source | Notes |
|---|-------|------|--------|-------|
| 1 | Project ID | String | System | `PROJ-YYYYMMDD-NNNN` |
| 2 | Project Code | String | Recruiter | Short working code — recruiters use this, not the long name |
| 3 | Project Name | String | Recruiter | Engagement name |
| 4 | Client ID | String (FK) | System | FK → Client. **Not Client Name.** |
| 5 | Client Name | String | System | Denormalized for display only |
| 6 | Client Reference Number | String | Recruiter | Client's own PO / contract / requisition number |
| 7 | Department | String | Recruiter | Construction / Maintenance / HSE / Operations / QA-QC / Project Management |
| 8 | Country | String | Recruiter | Deployment country |
| 9 | Location / Site | String | Recruiter | Jubail, Ruwais, Jebel Ali, etc. |
| 10 | Project Type | Enum | Recruiter | Labour Supply / Turnkey / Staff Augmentation / Manpower Contract |
| 11 | Start Date | Date | Recruiter | |
| 12 | End Date | Date | Recruiter | Expected close |
| 13 | Mobilization Target | Number | Recruiter | Total headcount needed |
| 14 | Recruiter Owner | String | Recruiter | Primary recruiter |
| 15 | Priority | Enum | Recruiter | HIGH / NORMAL / ON-HOLD |
| 16 | Status | Enum | Recruiter | ACTIVE / COMPLETED / CANCELLED / ON-HOLD |
| 17 | Created Date | Date | System | |
| 18 | Notes | Text | Recruiter | |

---

## 3. CAMPAIGN — LOCKED

A Campaign is a **sourcing operation**, not a marketing campaign.

| # | Field | Type | Source | Notes |
|---|-------|------|--------|-------|
| 1 | Campaign ID | String | System | `CAMP-YYYYMMDD-NNNN` |
| 2 | Campaign Name | String | Recruiter | Drive name (may differ from Project name) |
| 3 | Client ID | String (FK) | System | FK → Client |
| 4 | Client Name | String | System | Denormalized |
| 5 | Project ID | String (FK) | System | FK → Project |
| 6 | Project Name | String | System | Denormalized |
| 7 | Campaign Type | Enum | Recruiter | Interview Drive / Direct Hire / Bulk Mobilization / Assessment Camp |
| 8 | Country | String | System | Inherited from Project |
| 9 | Target Headcount | Number | Recruiter | Positions this campaign covers |
| 10 | Filled Count | Number | System | Running filled tally |
| 11 | Req Count | Number | System | Linked requirements count |
| 12 | Priority | Enum | Recruiter | URGENT / HIGH / NORMAL / LOW |
| 13 | Recruiter Owner | String | Recruiter | |
| 14 | Associate Network Enabled | Boolean | Recruiter | Whether associate/network sourcing is active |
| 15 | Walk-In Enabled | Boolean | Recruiter | Whether walk-in sourcing is active |
| 16 | Source Strategy | Enum | Recruiter | Database / Associate / Walk-In / Referral / Mixed |
| 17 | Start Date | Date | Recruiter | |
| 18 | Target Close Date | Date | Recruiter | |
| 19 | Interview Date | Date | Recruiter | If interview-type |
| 20 | Interview Location | String | Recruiter | Address or "Virtual" |
| 21 | Interview Contact | String | Recruiter | Client coordinator |
| 22 | Status | Enum | Recruiter | ACTIVE / COMPLETED / CANCELLED / ON-HOLD |
| 23 | Created Date | Date | System | |
| 24 | Notes | Text | Recruiter | |

---

## 4. REQUIREMENT (MASTER) — LOCKED

**Rule:** Requirement master stays **operational**. AI output does NOT live here.
AI extraction lands in a separate `Requirement Intelligence` table (Section 5).

**Trade rule:** ONE trade field + ONE source flag. Never two trades.

| # | Field | Type | Source | Notes |
|---|-------|------|--------|-------|
| 1 | Req ID | String | System | `REQ-YYYYMMDD-NNNN` |
| 2 | Campaign ID | String (FK) | System | **MANDATORY. Dedicated column. NOT in Notes. No requirement without a Campaign (Amendment 1).** |
| 3 | Project ID | String (FK) | System | **Dedicated column. NOT in Notes.** |
| 4 | Client ID | String (FK) | System | FK → Client |
| 5 | Client Name | String | System | Denormalized |
| 6 | Received Date | Date | Recruiter | When JD received |
| 7 | JD Source | Enum | Recruiter | Email / XLSX / Manual / WhatsApp / Portal |
| 8 | JD File Link | String | System | Drive URL to original JD |
| 9 | Trade | String | Recruiter/AI | The one trade. |
| 10 | Trade Source | Enum | System | AI / Recruiter — who set the current Trade value |
| 11 | Department | String | Recruiter | |
| 12 | Deploy Country | String | Recruiter | |
| 13 | Quantity | Number | Recruiter | |
| 14 | Salary | String | Recruiter | |
| 15 | Local Transfer | Boolean | Recruiter | |
| 16 | Visit Visa OK | Boolean | Recruiter | |
| 17 | GCC Preferred | Boolean | Recruiter | |
| 18 | Notice Accepted | Boolean | Recruiter | Client accepts notice-period candidates |
| 19 | Visa Type | Enum | Recruiter | Employment / Freelance / Contractor |
| 20 | Interview Mode | Enum | Recruiter | Face-to-Face / Virtual / Telephonic / CV Selection |
| 21 | Interview Date | Date | Recruiter | |
| 22 | Interview Location | String | Recruiter | |
| 23 | Food | Enum | Recruiter | Provided / Allowance / Not Provided |
| 24 | Accommodation | Enum | Recruiter | Provided / Allowance / Not Provided |
| 25 | Transport | Enum | Recruiter | Provided / Allowance / Not Provided |
| 26 | Duty Hours | String | Recruiter | e.g. "10 hrs/day, 6 days" |
| 27 | Contract Period | String | Recruiter | e.g. "2 years renewable" |
| 28 | Rotation | String | Recruiter | e.g. "Continuous", "3 months on / 1 off" |
| 29 | Medical Standard | String | Recruiter | e.g. "GAMCA", "Aramco medical" |
| 30 | Passport Validity Required | String | Recruiter | e.g. "Min 6 months", "Min 2 years" |
| 31 | Urgency | Enum | Recruiter | URGENT / HIGH / NORMAL |
| 32 | Submission Deadline | Date | Recruiter | Client's CV deadline |
| 33 | Client Contact | String | Recruiter | Submission recipient |
| 34 | Recruiter Owner | String | Recruiter | |
| 35 | Status | Enum | Recruiter | OPEN / FILLED / CLOSED / ON-HOLD |
| 36 | Filled Count | Number | System | |
| 37 | Submitted Count | Number | System | |
| 38 | Notes | Text | Recruiter | Free-form ONLY. No FKs hidden here. |

---

## 5. KAI INTELLIGENCE (SEPARATE SYSTEM LAYER) — RESERVED

**AMENDMENT 3 — Renamed `Requirement Intelligence` → `KAI Intelligence`.**
This is not a requirement-only feature. It is the system intelligence layer for the whole platform.
Built later. Architecture reserved now. Keeps Requirement master operational.
AI **never** writes to the Requirement master except `Trade` (with `Trade Source = AI`).

**This is NOT "JD parsing." JD parsing is ~5% of it.** KAI Intelligence is computed from many signals.

**INPUTS:**

```
JD
Client History
Project History
Submission History
Selection History
Mobilization History
Country Rules
Trade Taxonomy
Salary Benchmarks
Failure Reasons
Associate Performance
Recruiter Performance
```

**OUTPUTS:**

```
Requirement Score
Candidate Match Score
Submission Recommendation
Risk Flags
Salary Guidance
Mobilization Prediction
```

**Requirement-level extraction fields (the JD-parsing slice, keyed by Req ID):**

| # | Field | Type | Notes |
|---|-------|------|-------|
| 1 | Req ID | String (FK) | FK → Requirement master |
| 2 | AI Trade | String | Raw AI suggestion (feeds master Trade when Trade Source = AI) |
| 3 | Skills | Text | AI-extracted skills |
| 4 | Min Experience (yr) | Number | AI-extracted |
| 5 | Min Age | Number | AI-extracted |
| 6 | Max Age | Number | AI-extracted |
| 7 | Certifications | Text | AI-extracted |
| 8 | Qualifications | String | AI-extracted education level |
| 9 | Responsibilities | Text | AI-extracted duties |
| 10 | Special Requirements | Text | Rotation, accommodation, transport notes |
| 11 | Industry Classification | String | AI-classified industry |
| 12 | Requirement Score | Number | KAI-computed (fillability / quality) |
| 13 | Historical Fill Rate | Number | From past submissions for similar reqs |
| 14 | Salary Guidance | String | From salary benchmarks |
| 15 | Mobilization Prediction | Text | Likelihood / timeline based on history |
| 16 | Risk Flags | Text | Country, visa, associate, client risk signals |
| 17 | Submission Recommendation | Text | KAI guidance on who/what to submit |
| 18 | AI Confidence Score | Number | 0-100 |
| 19 | AI Extraction Date | Date | |
| 20 | AI Model Version | String | Traceability |

**Confidence gate:** If AI Confidence Score < 70 → flag Requirement for manual review before activation.

---

## 6. ASSOCIATE — CORE FOUNDATION ENTITY (BUILD NOW)

**AMENDMENT 2 — Associate is NOT future. It is a core Foundation entity. Build the schema now.**
Sits between Requirement and Candidate. This is GCC recruitment reality:
`Requirement → Associate → Candidate`.

| # | Field | Type | Source | Notes |
|---|-------|------|--------|-------|
| 1 | Associate ID | String | System | `ASC-YYYYMMDD-NNNN` |
| 2 | Associate Name | String | Recruiter | |
| 3 | Type | Enum | Recruiter | Agency / Freelancer / Sub-Agent |
| 4 | Country | String | Recruiter | |
| 5 | City | String | Recruiter | |
| 6 | Mobile | String | Recruiter | |
| 7 | Email | String | Recruiter | |
| 8 | Status | Enum | Recruiter | ACTIVE / INACTIVE / BLACKLISTED |
| 9 | Created Date | Date | System | |
| 10 | Owner | String | Recruiter | Recruiter who owns the relationship |
| 11 | Rating | Number | Recruiter | Performance rating |
| 12 | Total Submissions | Number | System | Running count |
| 13 | Total Selections | Number | System | Running count |
| 14 | Total Mobilizations | Number | System | Running count |

**Link:** Candidate gains an `Associate ID` (FK) so every candidate traces to its source.

---

## 7. EXECUTION LAYER — RESERVED (DO NOT BUILD NOW)

Reserve architecture only. These four entities complete the chain.

| Entity | Purpose | Key Link |
|--------|---------|----------|
| **Match** | Candidate scored against a Requirement | Req ID + Candidate ID + Score |
| **Submission** | Candidate formally submitted to client | Req ID + Candidate ID + Submission Date + Client Feedback |
| **Selection** | Client selected the candidate | Submission ID + Selection Date + Outcome |
| **Mobilization** | Selected candidate moved through offer→visa→medical→deploy | Selection ID + State + Timeline |

No columns locked yet. Reserved so the Requirement Detail tabs (Section 8) have a home.

---

## 8. REQUIREMENT DETAIL ARCHITECTURE — LOCKED

Display layer only. No tab computes data. Every tab reads a named backend endpoint.

| Tab | Purpose | Data Source | SaaS Ready |
|-----|---------|-------------|------------|
| Overview | Header, status, counts, owner, deadline, GCC terms (food/accom/transport/rotation) | Requirement master | Yes |
| JD | Original JD render + file link + source metadata | JD File Link, JD Source | Yes |
| AI Analysis | AI-extracted fields, confidence, AI Trade vs current Trade | KAI Intelligence layer | Yes |
| Matching | Ranked candidate matches + score breakdown | Match (reserved) → matching engine | Yes |
| Submissions | Candidates submitted, feedback, outcome | Submission (reserved) | Yes |
| Mobilization | Candidates in offer/visa/medical/deploy for this req | Mobilization (reserved) + Candidate state machine | Yes |
| Activity Log | Every action on this requirement | Timeline events filtered by Req ID | Yes |

---

## 9. MANUAL vs AI SEPARATION — LOCKED

```
REQUIREMENT MASTER  →  100% operational. Recruiter-owned.
                       AI touches ONE field: Trade (with Trade Source = AI).

KAI INTELLIGENCE  →  100% AI-owned. Separate system layer.
                     Recruiter reads only.
```

**Rules:**
1. AI never overwrites a Recruiter-set value. If `Trade Source = Recruiter`, AI cannot change Trade.
2. If `Status = FILLED` (recruiter-set), AI pipeline cannot reset it.
3. AI Confidence < 70 → manual review flag.
4. All AI output is traceable via AI Extraction Date + AI Model Version.

---

## 10. SAAS MIGRATION — CRITICAL FIXES (do during schema lock)

| # | Risk | Fix | Severity |
|---|------|-----|----------|
| 1 | Project/Campaign ID stored in Requirement Notes column (`[Project:PROJ-xxx]`) | Move to dedicated FK columns (Req fields 2, 3) | CRITICAL |
| 2 | Project stores Client Name string, not Client ID | Add Client ID FK (Project field 4) | HIGH |
| 3 | AI output mixed into Requirement master | Separate KAI Intelligence layer (Section 5) | HIGH |
| 4 | Country stored as free text everywhere | Standardize to ISO-3166 country codes | MEDIUM |
| 5 | Req Count / Filled Count as counter columns | Document as computed-in-SaaS; flush on every write to avoid drift | MEDIUM |
| 6 | Standalone requirements = orphan risk | Campaign ID MANDATORY on every Requirement (Amendment 1) | HIGH |
| 7 | Associate built late = source untraceable | Build _Associates as core Foundation schema NOW (Section 6) | HIGH |

---

## 11. GITHUB CONSOLIDATION — LOCKED

```
ACTIVE   : safwanyshaikh/alyousuf-recruitment   ← everything new lands here
LEGACY   : safwanyshaikh/kai                     ← FROZEN
```

**Hard rule for `kai` (PERMANENT, effective immediately):**
No new code. No fixes. No APIs. No screens. No architecture changes.
Everything goes into `safwanyshaikh/alyousuf-recruitment` only.

**Retire from active repo (after V2 confirmed stable):**
- `KAI_15May2026_V1_Dashboard.txt` — V1 dashboard, superseded by V2
- `28th April 1356 hrs.txt` — dead snippet
- `KAI_18May2026_patch_v289.txt` — 18 lines, no active function
- `KAI_17May2026_patch_v284.txt` — old Requirements processor, replaced by v293
- `KAI_17May2026_patch_v287.gs.txt` — duplicate of patch_v287.txt (deduplicate)
- `BLS_OOH_Trade_Taxonomy.xlsx`, `KAI_SORTED_BY_SCORE.xlsx` — move to Drive, out of repo

**Quarantine until logic moves to backend:**
- `index.html` — API keys, scoring weights, decision thresholds, Tobu push all live in browser. Must move to GAS before safe.

**Keep (active Foundation):**
- `patch_v284.txt` (API layer), `patch_v292.txt` (hierarchy), `patch_v293.txt` (JD extraction),
  `patch_v294.txt` (orchestrator), `KAI_16May2026_V2.txt` (config/state/matching),
  `KAI_16May2026_V2_Dashboard.txt` (dashboard), `patch_v280.txt` (import),
  `patch_v287.txt` (missing-field), `patch_v291.txt` (OCR/quota), `patch_v286.txt` (reply scanner)

---

## 12. FINAL FROZEN OPERATING MODEL

```
FOUNDATION
├─ Clients
├─ Projects
├─ Campaigns
├─ Requirements
└─ Associates

EXECUTION
├─ Candidates
├─ Matching
├─ Submissions
├─ Selections
└─ Mobilization

INTELLIGENCE
└─ KAI Intelligence
```

---

## 13. BUILD ORDER — START TOMORROW

**Foundation first. Not Candidates. Not KAI Flow. Not Matching. Not AI.**

```
STEP 1   Create _Clients schema        (Section 1)
STEP 2   Create _Projects schema       (Section 2)
STEP 3   Create _Campaigns schema      (Section 3)
STEP 4   Create _Requirements schema   (Section 4 — Campaign ID MANDATORY)
STEP 5   Create _Associates schema     (Section 6 — core, build now)
STEP 6   Create Foundation APIs
STEP 7   Create Foundation Detail Pages (Section 8)
STEP 8   FREEZE Foundation
STEP 9   Move to Candidates
```

After freeze, Foundation is the permanent base layer for SaaS migration,
multi-tenant deployment, and future KAI Intelligence versions — with no
further structural rewrite required.

**Only after Foundation freeze:**

```
→ Candidates
→ Matching
→ Submissions / Selections / Mobilization
→ KAI Intelligence
```

---

## 14. WHAT IS RESERVED BUT NOT BUILT

Architecture reserved so no rewrite is needed later:

- KAI Intelligence layer (Section 5) — reserved
- Match / Submission / Selection / Mobilization (Section 7) — reserved

**NOT reserved — build now as core Foundation:**

- Associate entity (Section 6) — CORE, built in Step 5

---

**END OF LOCKED FOUNDATION SPEC.**
Three amendments applied. Foundation frozen. Build Section 13, Step 1 tomorrow.
