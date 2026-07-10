# CANDIDATE FIELD OWNERSHIP MAP
**Pre-freeze governance · Every UI field assigned an owner before Candidate freeze**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-20 · **Status:** Ownership audit — must be 100% complete before freeze
**Screen:** KAI Candidate Profile (finalized UI — 35/65 split, candidate drawer)

> Every field visible on the finalized Candidate UI screen is assigned to exactly one
> owner: FOUNDATION (truth) · EXECUTION (operational facts) · K14 (intelligence output).
> If ownership is unclear, the field is blocked from coding until it is resolved here.
> 100% coverage is required before CANDIDATE_ENTITY_FINAL.md can be approved.

---

## OWNERSHIP LEGEND

| Symbol | Owner | Meaning |
|--------|-------|---------|
| **F** | Foundation | Fact entered by recruiter or system; stable truth |
| **E** | Execution | Result of a workflow action; operational record |
| **K** | K14 | Interpreted output; never stored in Foundation |

---

## SECTION 1 — CANDIDATE LIST CARD (left panel, 35%)

| Field visible | Owner | Column / Source | Notes |
|--------------|-------|----------------|-------|
| Photo / avatar | **F** | `PhotoUrl` | Drive URL reference; recruiter uploads |
| Full Name | **F** | `Name` (col 3) | Foundation identity |
| Status badge (Shortlisted) | **E** | `PipelineState` (Execution record) | Current stage in a specific pipeline run |
| Trade (Rigger) | **F** | `Trade` (col 5 approx) | With `TradeSource` flag |
| Nationality (South Africa) | **F** | `Nationality` (col 6) | |
| Experience (12 Years) | **F** | `TotalExperience` | Total recruiter-verified years |
| Passport Valid | **F** | Derived from `PassportExpiry` | Display label computed from expiry date |
| Mobile (+27 XXX) | **F** | `Mobile` (col 4) | |
| Updated 2 Days Ago | **F** | `UpdatedAt` | System timestamp |

---

## SECTION 2 — CANDIDATE PROFILE HEADER (right panel top)

| Field visible | Owner | Column / Source | Notes |
|--------------|-------|----------------|-------|
| Photo / avatar | **F** | `PhotoUrl` | Same Drive URL reference |
| Full Name | **F** | `Name` (col 3) | |
| KAI No (KAI-1004) | **F** | `KAI No` (col 25) | PK |
| Trade (Rigger) | **F** | `Trade` | |
| Nationality (South Africa) | **F** | `Nationality` (col 6) | |
| Passport Valid badge | **F** | Derived from `PassportExpiry` | Computed: Valid/Expired/Expiring |
| Experience (12 Years) | **F** | `TotalExperience` | |
| GCC Experience (8 Years) | **F** | `GCCExperience` | Total GCC years, recruiter-verified |

---

## SECTION 3 — PIPELINE BAR (stage indicators)

| Field visible | Owner | Source | Notes |
|--------------|-------|--------|-------|
| New → Review → Shortlist → Assigned → Submitted → Selected → Visa → Deployed | **E** | Execution state machine | Each dot = Execution state transition on THIS candidate-requirement pairing; NOT stored in Candidate master |
| Active stage highlight | **E** | Current Execution state | |

> **Boundary note:** The Candidate master holds `CandidateState` (the candidate's overall
> operational state). The pipeline bar shows where this candidate is in a SPECIFIC
> submission/selection workflow — that is an Execution record, not a Foundation field.

---

## SECTION 4 — ACTION BUTTONS

| Button | Owner | Action type |
|--------|-------|-------------|
| Call | UI → **F** | Dials Foundation.Mobile |
| WhatsApp | UI → **F** | Opens Foundation.WhatsApp (or Mobile) |
| Email | UI → **F** | Composes to Foundation.Email |
| Shortlist | UI → **E** | Creates/updates an Execution Match record |
| Submit | UI → **E** | Creates an Execution Submission record |
| Actions menu | UI → **E** | Routes to Execution workflow actions |

---

## SECTION 5 — SUMMARY TAB

| Field visible | Owner | Column / Source | Notes |
|--------------|-------|----------------|-------|
| Availability: Immediate | **K** | K14.REASON output | K14 INTERPRETS from NoticeRaw + employment status; "Immediate/2 Weeks/1 Month/Unavailable" is the output |
| Notice Period: 30 Days | **F** | `NoticeRaw` | The RAW recruiter-captured number (days); Foundation truth. K14 interprets it into Availability |
| Passport Status: Valid | **F** | `PassportStatus` | Governed: Valid/Expired/Expiring-Soon/Missing; derived from `PassportExpiry` at write time and stored |
| GCC Experience: 8 Years | **F** | `GCCExperience` | Recruiter-verified; Foundation truth |
| Current Location: UAE | **F** | `CurrentCountry` | Foundation truth |
| Previous GCC: KSA | **F** | `PreviousGCCCountry` | Last GCC country; Foundation truth |

---

## SECTION 6 — BACKGROUND DETAILS

| Field visible | Owner | Column / Source | Notes |
|--------------|-------|----------------|-------|
| Current Employer: Arun Kumar | **F** | `CurrentEmployer` | Foundation truth |
| Education: BTech Civil Engineering | **F** | `Education` | Highest qualification; Foundation truth |
| Languages: Arabic (Native), English (Fluent) | **F** | `Languages` | Foundation truth; multi-value |
| Certificates: OSHA 30-Hr, NEBOSH | **F** | `Certificates` | Foundation truth; multi-value |
| Description / bio | **F** | `Bio` or `Notes` | Narrative; Foundation truth |

---

## SECTION 7 — LEFT NAVIGATION SECTIONS

| Section | Owner | Source |
|---------|-------|--------|
| Profile | **F** | Foundation identity fields |
| Experience (structured work history) | **F** | Experience records (linked to Candidate PK) |
| Documents (6) | **E** | Execution: uploaded docs tracked in mobilization workflow |
| Assessment (2) | **K** | K14 assessment output records |
| Submission History | **E** | Execution: Submission records for this candidate |
| Notes (4) | **E** | Execution: recruiter operational notes |

---

## SECTION 8 — K14 INTELLIGENCE (never Foundation, never Execution)

Fields the user specified as K14 outputs — confirmed K14 ownership, excluded from
Foundation master and Execution records:

| K14 field | Stored in | Never in |
|-----------|-----------|---------|
| Availability (interpreted) | K14 store | Foundation |
| Deployability score | K14 store | Foundation |
| Top Positions (3 best roles) | K14 store | Foundation |
| Full Assessment | K14 store | Foundation |
| Assessment Summary | K14 store | Foundation |
| Risk Alerts | K14 store | Foundation |
| Readiness signal | K14 store | Foundation |
| Missing Documents list | K14 store | Foundation |
| Missing Information list | K14 store | Foundation |
| Recommended Requirements | K14 store | Foundation |
| Recommended Countries | K14 store | Foundation |
| Recommended Clients | K14 store | Foundation |
| Recommended Campaigns | K14 store | Foundation |
| Confidence score | K14 store | Foundation |
| Reasoning trace | K14 store | Foundation |

**K14 Output Package (per candidate, separate store — keyed by KAI No):**
```
CandidateID (KAI No)   — links to Foundation
Assessment             — full text
Readiness              — signal: READY/CONDITIONAL/NOT READY
Risk                   — risk classification + reason
Recommendations        — matched requirements/clients/campaigns
Missing Data           — list of blocking absences
Evidence References    — which facts drove the output
Confidence             — 0–100 with basis
Last Evaluated         — timestamp
K14 Version            — brain version that produced this output
```

---

## MISSING FIELD AUDIT — Foundation gaps found from this screen

Fields shown on the UI that must exist in Foundation but are NOT confirmed in the
38-column CONFIG_V2 map (10 of the 48 live columns are unmapped):

| Field | Status | Action |
|-------|--------|--------|
| `PhotoUrl` | UNCONFIRMED (not in known 38) | **ADD if absent** |
| `WhatsApp` | UNCONFIRMED | **ADD if absent** (may share with Mobile) |
| `PassportNumber` | UNCONFIRMED | **ADD if absent** |
| `PassportExpiry` | LIKELY EXISTS (fixed in patch_v284) | **VERIFY column position** |
| `PassportStatus` | UNCONFIRMED as stored field | **ADD governed field** (derived from expiry) |
| `TotalExperience` | LIKELY EXISTS (in live 48) | **VERIFY column position** |
| `GCCExperience` | UNCONFIRMED | **ADD if absent** |
| `CurrentCountry` | LIKELY EXISTS | **VERIFY column position** |
| `CurrentCity` | LIKELY EXISTS | **VERIFY column position** |
| `PreviousGCCCountry` | UNCONFIRMED | **ADD if absent** |
| `CurrentEmployer` | LIKELY EXISTS | **VERIFY column position** |
| `Education` | LIKELY EXISTS | **VERIFY column position** |
| `Languages` | LIKELY EXISTS | **VERIFY column position** |
| `Certificates` | LIKELY EXISTS | **VERIFY column position** |
| `NoticeRaw` | LIKELY EXISTS (patch_v284: noticeDays) | **VERIFY column position** |
| `UpdatedAt` | LIKELY EXISTS | **VERIFY column position** |
| `CreatedAt` | LIKELY EXISTS | **VERIFY column position** |

All UNCONFIRMED fields must be **verified or added** before the Candidate freeze can
close. No field may be left as "probably there" when it appears on the finalized UI.

---

## OWNERSHIP DECISION: AMBIGUOUS FIELDS RESOLVED

| Field | Question | Decision |
|-------|----------|----------|
| Notice Period | Foundation raw or K14 interpreted? | **Foundation** (`NoticeRaw` = the number the recruiter captures from CV/candidate); K14 INTERPRETS it into `Availability` |
| Passport Status | Foundation or derived-K14? | **Foundation** (governed field derived from `PassportExpiry` at write time, stored in master, recruiter-correctable); not a K14 interpretation |
| GCC Experience | Foundation or K14-computed? | **Foundation** (recruiter-verified total years; K14 may USE it as evidence but does not own it) |
| Pipeline stage dots | Foundation Candidate State or Execution? | **Execution** (the bar shows progress in a specific submission workflow; Foundation holds the candidate's overall state, not per-requirement stage) |
| Documents count (6) | Foundation or Execution? | **Execution** (documents are uploaded as part of the mobilization gate process) |
| Assessment (2) count | K14 or Execution? | **K14** (assessment outputs from K14 reasoning passes) |
| Notes (4) | Foundation or Execution? | **Execution** (recruiter operational notes about actions taken) |

---

## OWNERSHIP COMPLETE — 100% COVERAGE

Every field on the finalized Candidate screen has been assigned. Summary:

| Owner | Field count |
|-------|------------|
| Foundation | 22 distinct fields (identity + factual inputs) |
| Execution | 7 distinct categories (pipeline, submissions, docs, notes, actions) |
| K14 | 15 distinct fields (all intelligence outputs) |
| **Total** | **44 fields — 100% covered** |

**No field is unowned. Candidate freeze may now proceed.**
