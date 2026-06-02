# KAI OS — Phase 1 Architecture v3 FINAL
## Status: Approved — Final Adjustments Applied

---

## ADJUSTMENT 1 — ASSOCIATE WEIGHTED PERFORMANCE SCORE

Replaces simple threshold grading. Four weighted components computed monthly.

```
WEIGHTED SCORE FORMULA
═══════════════════════

Score = (QualityScore × 0.40)
      + (ConversionScore × 0.35)
      + (SpeedScore × 0.15)
      + (VolumeScore × 0.10)

─────────────────────────────────────────────────────────
COMPONENT 1: Quality Score (weight 40%)
  = avgKAIScoreOfSubmittedCandidates / 100 × 100
  
  Logic: Associates who send stronger candidates score higher.
  A candidate with KAI score 85 contributes more than one with 45.
  Source: CandidateSlots WHERE sourceType=ASSOCIATE → avg(candidate.score)

─────────────────────────────────────────────────────────
COMPONENT 2: Conversion Score (weight 35%)
  = (deployed / submitted) × 100
  
  If submitted = 0: score = 0
  Cap at 100.
  
  Logic: End-to-end conversion. Did the candidates actually get deployed?
  Source: CandidateSlots WHERE sourceType=ASSOCIATE
          COUNT WHERE slotStatus=DEPLOYED / COUNT total

─────────────────────────────────────────────────────────
COMPONENT 3: Speed Score (weight 15%)
  = MAX(0, 100 - ((avgDaysToSelection - 14) × 3))
  
  Benchmark: 14 days from submission to selection = 100 points
  Every day over 14: -3 points
  Floor: 0
  
  Logic: Faster placements are better. Associates who submit
  ready candidates with complete docs score higher.
  Source: CandidateSlots — days between addedAt and selectedAt

─────────────────────────────────────────────────────────
COMPONENT 4: Volume Score (weight 10%)
  = MIN(100, (deployedCount / targetCount) × 100)
  
  targetCount = roles allocated to this associate in the period
  If no target set: use 5 as minimum benchmark
  
  Logic: Did the associate fill their allocated quota?
  Source: CandidateSlots WHERE associateId = X

─────────────────────────────────────────────────────────
GRADE TABLE
  Weighted Score ≥ 80  → Grade A     (Premier Partner)
  Weighted Score 65–79 → Grade B+    (Strong Partner)
  Weighted Score 50–64 → Grade B     (Active Partner)
  Weighted Score 35–49 → Grade C     (Needs Improvement)
  Weighted Score < 35  → Grade D     (Performance Review)

─────────────────────────────────────────────────────────
STORED IN: /associates/{associateId}
  weightedScore: number
  scoreComponents:
    qualityScore: number
    conversionScore: number
    speedScore: number
    volumeScore: number
  grade: enum           A | B+ | B | C | D
  gradePeriod: string   "2026-06" (YYYY-MM)
  computedAt: timestamp
```

---

## ADJUSTMENT 2 — RECRUITER METRICS: CALENDAR MONTH PERIODS

```
PERIOD MODEL
═════════════

Metrics are stored by calendar month (YYYY-MM).
Manager can query any combination at any time.

AVAILABLE PERIODS (filter options):
  Current Month     → from 1st of current month to today (live, partial)
  Previous Month    → complete previous calendar month
  Last 3 Months     → previous 3 complete months
  Last 6 Months     → previous 6 complete months
  Custom Range      → manager selects: fromDate, toDate (any range)
  Lifetime          → all records since recruiter joined

STORAGE MODEL IN GAS (_RecruiterMetrics sheet):
  One row per recruiter per calendar month:
  RecruiterId | Month (YYYY-MM) | Sourced | Screened | Shortlisted |
  Submitted | Interviewed | Selected | Deployed | AvgScore |
  AvgResponseDays | ClientRejectionCount | ProjectBreakdown_JSON

QUERY LOGIC:
  For "Last 3 Months" query:
    → Fetch rows WHERE month IN [2026-03, 2026-04, 2026-05]
    → Sum all numeric columns
    → Recompute rates from summed values

  For "Current Month" (live):
    → Read from _CandidateSlots WHERE addedAt >= 2026-06-01
    → Count by status, compute rates in real-time
    → Do NOT rely on pre-aggregated monthly row (it's partial)

  For "Custom Range":
    → If range spans multiple months: SUM monthly rows in range
    → For partial months at boundaries: compute from _CandidateSlots directly

STORED IN GAS: _RecruiterMetrics sheet
  Columns: RecruiterId, RecruitName, Month, Sourced, Screened,
           Shortlisted, Submitted, Interviewed, Selected, Deployed,
           ScreenRate, ShortlistRate, SubmissionRate, InterviewRate,
           SelectionRate, DeploymentRate, OverallConversion,
           AvgCandidateScore, AvgResponseDays, ClientRejectionRate,
           ProjectBreakdown_JSON, UpdatedAt

STORED IN FIRESTORE: /recruiterMetrics/{recruiterId}/monthly/{YYYY-MM}
  (same fields — enables real-time dashboard queries)

API ACTIONS (GAS):
  GET ?action=recruiterMetrics&recruiterId=X&period=CURRENT_MONTH
  GET ?action=recruiterMetrics&recruiterId=X&period=PREV_MONTH
  GET ?action=recruiterMetrics&recruiterId=X&period=LAST_3_MONTHS
  GET ?action=recruiterMetrics&recruiterId=X&period=LAST_6_MONTHS
  GET ?action=recruiterMetrics&recruiterId=X&period=LIFETIME
  GET ?action=recruiterMetrics&recruiterId=X&from=2026-01-01&to=2026-05-31
  GET ?action=recruiterMetrics&period=ALL (all recruiters, manager view)
```

---

## ADJUSTMENT 3 — CLIENT CODE FORMAT

```
FORMAT: CL followed by 4-digit zero-padded number
  CL0001  →  First client registered
  CL0002  →  Second client
  ...
  CL9999  →  Maximum (expandable to CL00001 if needed)

AUTO-GENERATION RULE:
  On new client: find MAX existing clientCode → increment by 1 → zero-pad to 4 digits
  Store in: _Config sheet KEY=lastClientCode VALUE=CL0001

APPLIED TO:
  Project.clientCode       → CL0001
  Campaign.clientCode      → CL0001 (inherited)
  Department.clientCode    → CL0001 (inherited)
  Role.clientCode          → CL0001 (inherited)
  Submission.clientCode    → CL0001

CLIENT REGISTRY (_Clients sheet — NEW):
  ClientCode | ClientName       | Country | Sector         | Active | CreatedAt
  CL0001     | NMDC Energy      | UAE     | Offshore O&G   | YES    | 2026-06-01
  CL0002     | Saudi Aramco     | KSA     | Upstream O&G   | YES    | 2026-05-17
  CL0003     | CNCEC WEP        | KSA     | EPC            | YES    | 2026-06-01

NOTE: ClientName is internal only. External documents use clientCode only
      to protect commercial confidentiality.
```

---

## ADJUSTMENT 4 — sourceOwner FIELD

```
DEFINITION:
  sourceOwner = the person or entity that owns the SOURCING RELATIONSHIP
                for this candidate entry into the system.

  This is different from:
    currentHandler  → who is actively working this candidate now
    submittedBy     → who submitted to client
    addedBy         → who clicked "add to slot" in the system

APPLIED TO: CandidateSlots + Candidate record

VALUES:
  SYSTEM            → KAI auto-pipeline (Gmail, Telegram)
  {userId}          → Specific recruiter who sourced directly
  {associateId}     → Associate who submitted
  RECONTACT         → From KAI recontact campaign batch

RULES:
  1. sourceOwner is SET ONCE on creation — never changed
  2. sourceOwner ≠ currentHandler (handler changes, owner never does)
  3. On performance reports: credit always flows to sourceOwner
  4. Associate commissions (if applicable): calculated from sourceOwner match

STORED IN:
  CandidateSlots.sourceOwner  → per-slot ownership
  Candidate.sourceOwner       → first-ever sourcing credit (set on creation)

GAS SHEET (_CandidateSlots):
  Add column: SourceOwner
  Values: SYSTEM | userId | associateId | RECONTACT

REPORTING USE:
  "Which recruiter's network produced the most deployments?"
  → GROUP BY CandidateSlots.sourceOwner WHERE slotStatus=DEPLOYED

  "Which associate's pipeline has the best quality?"
  → GROUP BY sourceOwner WHERE sourceType=ASSOCIATE → avg(candidate.score)
```

---

## SECTION A — SCREEN INVENTORY (Phase 1)

### All screens in KAI OS Phase 1:

| # | Screen | Module | Auth Required | Role Access |
|---|---|---|---|---|
| 01 | Login | Auth | No | All |
| 02 | Dashboard (Home) | Home | Yes | All |
| 03 | **Candidate Database** | Candidates | Yes | All |
| 04 | **Candidate Drawer** | Candidates | Yes | All |
| 05 | Candidate Compare (future) | Candidates | Yes | MGR+ |
| 06 | Jobs — Active JDs | Jobs | Yes | All |
| 07 | Jobs — Create JD | Jobs | Yes | RECRUITER+ |
| 08 | Jobs — JD Detail | Jobs | Yes | All |
| 09 | Campaigns — List | Campaigns | Yes | All |
| 10 | Campaigns — Detail | Campaigns | Yes | All |
| 11 | Campaigns — Create | Campaigns | Yes | MGR+ |
| 12 | Pipeline — Interview Tracker | Pipeline | Yes | RECRUITER+ |
| 13 | Pipeline — Interview Detail | Pipeline | Yes | RECRUITER+ |
| 14 | SAC Performance | SAC | Yes | MGR+ |
| 15 | Reports | Reports | Yes | MGR+ |
| 16 | Settings — Agency Profile | Settings | Yes | ADMIN |
| 17 | Settings — Users & Roles | Settings | Yes | ADMIN |
| 18 | Settings — Taxonomy | Settings | Yes | MGR+ |
| 19 | Settings — Intake Email | Settings | Yes | ADMIN |
| 20 | Settings — Clients | Settings | Yes | MGR+ |
| 21 | Settings — Associates | Settings | Yes | MGR+ |
| 22 | Recruiter Metrics | Reports | Yes | MGR+ |
| 23 | Location Intelligence | Reports | Yes | MGR+ |

**Total Phase 1 screens: 23**
**This sprint (Candidate module): Screens 03 + 04**

---

## SECTION B — SCREEN PRIORITIES

```
PRIORITY 0 — BLOCKING (must exist to use the system)
  01 Login
  03 Candidate Database       ← CURRENT SPRINT
  04 Candidate Drawer         ← CURRENT SPRINT

PRIORITY 1 — CORE OPERATIONS (needed for first live campaign)
  02 Dashboard (Home)         ← Next sprint
  06 Jobs — Active JDs
  07 Jobs — Create JD
  09 Campaigns — List
  10 Campaigns — Detail
  12 Pipeline — Interview Tracker

PRIORITY 2 — MANAGEMENT VISIBILITY
  14 SAC Performance          ← Already live (placeholder data)
  22 Recruiter Metrics
  11 Campaigns — Create
  13 Pipeline — Interview Detail

PRIORITY 3 — INTELLIGENCE & ADMIN
  15 Reports
  23 Location Intelligence
  17 Settings — Users & Roles
  18 Settings — Taxonomy
  20 Settings — Clients
  21 Settings — Associates

PRIORITY 4 — FUTURE
  05 Candidate Compare
  08 Jobs — JD Detail (advanced)
  16 Settings — Agency Profile
  19 Settings — Intake Email
```

---

## SECTION C — CANDIDATE DATABASE SCREEN SPECIFICATION

### Screen ID: 03
### Route: /candidates
### Access: All authenticated roles

---

### C.1 — LAYOUT OVERVIEW

```
┌────────────────────────────────────────────────────────────────────┐
│  HEADER — Page title + count                                       │
│  "Candidates"                              Showing 100 of 4,520   │
├────────────────────────────────────────────────────────────────────┤
│  STATS BAR (Row 1)                                                 │
│  [Total: 4,520] [Shortlisted: 1,411] [Strong: 1,505] [Deployed: 0]│
├────────────────────────────────────────────────────────────────────┤
│  FILTER BAR (Row 2)                                                │
│  [🔍 Search...              ] [Stage▼] [Trade▼] [Nat▼] [Score▼]  │
│                               [GCC▼]  [Source▼]  Clear All        │
├────────────────────────────────────────────────────────────────────┤
│  GRID (12 columns, horizontal scroll, sticky cols 1+2)            │
│  ─────────────────────────────────────────────────────────────────│
│  [STAGE] [CANDIDATE] │ PASSPORT │ LOC │ EDU │ POS │ TRADE │ KAI  │
│                      │          │     │     │     │       │ SCORE │
│  [chip]  Name        │ PP No    │ —   │ Deg │ ... │ Weld  │  90% │
│          Nat · Age   │ ECNR     │     │ ... │     │       │Strong│
├────────────────────────────────────────────────────────────────────┤
│  HORIZONTAL SCROLLBAR                                              │
├────────────────────────────────────────────────────────────────────┤
│  PAGINATION: [← Prev]  Page 1 of 46  [Next →]   [100 per page ▼] │
└────────────────────────────────────────────────────────────────────┘
```

---

### C.2 — STATS BAR

| Chip | Value | Colour | Source |
|---|---|---|---|
| Total | total from API | Grey | API response.total |
| Shortlisted | count where stage="Shortlisted" | Amber | client-side filter |
| Strong Match | count where confidenceTier="STRONG" | Green | client-side filter |
| Deployed | count where stage="Deployed" | Dark Green | client-side filter |

Rules:
- Stats always reflect the FILTERED set, not the full 4,520
- When no filter: shows full set counts
- When filtered: shows filtered set counts
- Total chip text changes: "4,520" → "39 of 4,520" when filtered

---

### C.3 — FILTER BAR

**Search Input:**
- Placeholder: `Search name, KI number, trade, passport, mobile...`
- Debounced: 300ms
- Client-side search on loaded records
- Fields searched: name, kaiNo, trade, positionApplied, nationality, mobile (last 4 digits)
- KI Number search: kaiNo field (never shown in grid, only in search)

**Filter Chips:**

| Chip | Options | Logic |
|---|---|---|
| Stage ▼ | New, Review, Needs Call, Shortlisted, Client Sent, Selected, Deployed, On Hold, Rejected | exact match on stage field |
| Trade ▼ | Top 10 unique trades from loaded data + "Other" | case-insensitive contains |
| Nationality ▼ | Top 10 unique nationalities from data | exact match |
| Score ▼ | Strong (75-100), Good (55-74), Possible (35-54), Review (0-34), Unscored (0) | range filter on score |
| GCC Mobility ▼ | India Available, GCC Transferable, Saudi Local, UAE Local, Qatar Local, Kuwait Local, Bahrain Local, Oman Local | exact match on gccMobility |
| Source ▼ | Direct, Associate, Telegram, Manual Upload, Recontact, Import | exact match on sourceType |

Active filter chip: shows label + × button (e.g. `Stage: Shortlisted ×`)
"Clear All" link: visible when any filter is active

---

### C.4 — GRID COLUMN SPECIFICATIONS

**Sticky columns (fixed left, do not scroll):**
- Col 1: Stage (120px)
- Col 2: Candidate (180px)

**Scrollable columns:**
- Col 3 onward scroll horizontally

| Col | Header | Width | Content | Notes |
|---|---|---|---|---|
| 1 | STAGE | 120px | Chip badge from stage field | Sticky. Checkbox on hover (bulk) |
| 2 | CANDIDATE | 180px | L1: name bold 14px. L2: nationality · age grey 12px | Sticky |
| 3 | PASSPORT | 120px | L1: passportNo. L2: ECNR/ECR chip | "—" if empty |
| 4 | LOCATION | 110px | currentLocation | "—" if empty |
| 5 | EDUCATION | 160px | L1: educationLevel. L2: educationSubject grey 12px | fallback to educationRaw if level empty |
| 6 | POSITION APPLIED | 150px | positionApplied truncated 30 chars | ellipsis |
| 7 | TRADE / SKILL | 140px | trade bold | Slightly darker text |
| 8 | KAI ASSESSMENT | 130px | L1: score% bold 16px. L2: tier label | No AI text. Score + tier only. |
| 9 | CV | 100px | 👁 ↗ ⬇ icon buttons | "No CV" grey 11px if empty |
| 10 | TOP 3 POSITIONS | 180px | first position + "+N" grey if more | Hover: tooltip with all positions |
| 11 | CONTACT | 90px | 📞 💬 ✉ icons if not empty | Icon = action button (tel: / mailto:) |
| 12 | ACTIONS | 60px | ⋮ dropdown | See actions spec below |

**Stage chip colour mapping:**
```
"Shortlisted"   → green    (#16A34A bg, white text)
"Review"        → blue     (#2563EB bg, white text)
"Needs Call"    → orange   (#EA580C bg, white text)
"Selected"      → dark green (#15803D)
"Deployed"      → dark green darker (#166534)
"Client Sent"   → purple   (#7C3AED)
"On Hold"       → amber    (#D97706)
"Rejected"      → red      (#DC2626)
"New"           → grey     (#6B7280)
(any other)     → grey
```

**KAI Assessment tier label mapping:**
```
STRONG   → "Strong Match"   green text
GOOD     → "Good Match"     blue text
POSSIBLE → "Possible Match" amber text
REVIEW   → "Review"         grey text
```

**Col 9 CV icons:**
```
👁 Preview  → open cvLink in new tab (or iframe modal)
↗ Open      → window.open(cvLink)
⬇ Download  → <a href=cvLink download>
```

**Col 12 Recruiter Actions dropdown:**
```
📞 Call Candidate     → tel:{mobile}
💬 WhatsApp           → https://wa.me/{mobile}
⭐ Shortlist          → toast "Shortlisted: {name}"  [GAS POST updateStage]
📋 Request Documents  → toast "Documents requested"
📤 Submit to Client   → opens submission modal (future)
```

---

### C.5 — ROW BEHAVIOUR

**Row click:** Opens Candidate Drawer (Screen 04) — slide in from right
**Click target:** Entire row except action buttons in Col 9, 11, 12
**Hover:** Row background lightens slightly, checkbox appears in Col 1
**Selected rows:** Checkbox checked, row highlighted, bulk action bar appears

**Bulk Action Bar (appears when ≥1 row selected):**
```
[X selected]  [⭐ Shortlist All]  [📤 Submit Selected]  [✕ Clear]
```

---

### C.6 — SORT BEHAVIOUR

Sortable columns: Stage, Candidate (name), KAI Assessment (score), Application Date
Click header: sort ascending → click again: descending → click again: clear sort
Default sort: applicationDate descending (newest first)
Sort indicator: ↑ ↓ in column header

---

### C.7 — DATA LOADING

```
On mount:
  1. Read token from localStorage key: "kai_session_token"
  2. If null → show "Not logged in" error (do NOT redirect)
  3. Fetch: GET {GAS_URL}?action=candidates&token={token}&page=1&limit=100
  4. Show skeleton rows while loading (8 rows, animated pulse)
  5. On success: setCandidates(data.records), setTotal(data.total)
  6. On error: show error banner with message

Skeleton loader: 8 rows, each row shows grey animated blocks
  matching the column widths

Error banner: full-width amber strip above grid
  "⚠ Could not load candidates: {error message}"  [Retry]

Empty state (no candidates match filters):
  Centred text: "No candidates match your filters"
  [Clear all filters] button

GAS URL:
  https://script.google.com/macros/s/AKfycbxfNPL371bf8UF84bMz3E2i8drw4opVpWJMb24w2pW_p_og08_MwlJ5PyRqtaZPHv02Ng/exec
```

---

### C.8 — PAGINATION

- Page size: 100 per page (default)
- Options: 25 / 50 / 100 per page
- Show: "Page X of Y" and "Showing N–M of total"
- Prev/Next buttons
- Jump to page: input field
- On filter change: reset to page 1

---

### C.9 — MOBILE LAYOUT (< 768px)

Hide the 12-column table. Show card layout:

```
┌──────────────────────────────────────────┐
│ [Shortlisted chip]              90% STRONG│
│ Bibin Raju                                │
│ Indian · —  · —                          │
│ Trade: Welding QA   Exp: 12yr            │
│ ──────────────────────────────────────── │
│ [📞] [💬] [✉]            [⋮ Actions]    │
└──────────────────────────────────────────┘
```

Card fields:
- Row 1: stage chip (left) + score% + tier (right)
- Row 2: candidate name (bold)
- Row 3: nationality · age · location
- Row 4: Trade: {trade}   Exp: {experience}yr
- Row 5 (divider)
- Row 6: contact icons + actions button

Card click → opens drawer (full screen on mobile)
Above cards: search bar + Stage filter chips only

---

### C.10 — STATE MANAGEMENT

```
State variables:
  candidates: Candidate[]       → loaded from API, current page
  total: number                 → from API response.total
  isLoading: boolean
  error: string | null
  page: number                  → current page (1-based)
  limit: number                 → page size (default 100)
  sortField: string             → "applicationDate"
  sortDir: "asc" | "desc"       → default "desc"
  filters: {
    search: string
    stage: string
    trade: string
    nationality: string
    scoreRange: string          → "75-100" | "55-74" | "35-54" | "0-34" | ""
    gccMobility: string
    sourceType: string
  }
  selectedRows: string[]        → array of kaiNo
  drawerOpen: boolean
  drawerCandidate: Candidate | null
```

---

## SECTION D — CANDIDATE DRAWER SPECIFICATION

### Screen ID: 04
### Trigger: Row click on Candidate Database
### Type: Right-side slide panel, 480px width (640px on large screens)
### Overlay: Semi-transparent backdrop, click to close

---

### D.1 — DRAWER LAYOUT

```
┌─────────────────────────────────────────────────────┐
│ [←Close]    Bibin Raju         [⭐ Shortlist] [⋮]  │  HEADER
├─────────────────────────────────────────────────────┤
│ AYE-KAI-2026-000001    [Shortlisted]    Score: 90% │  IDENTITY BAR
├─────────────────────────────────────────────────────┤
│ [📞 Call] [💬 WhatsApp] [✉ Email] [📤 Submit]      │  QUICK ACTIONS
├─────────────────────────────────────────────────────┤
│ [Profile] [Assessment] [Documents] [History] [Notes]│  TAB NAV
├─────────────────────────────────────────────────────┤
│                                                     │
│  TAB CONTENT (scrollable)                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### D.2 — HEADER

```
Left:    [← Close] or [✕] button
Centre:  Candidate name (bold 18px)
Right:   [⭐ Shortlist] action button + [⋮] more menu

⋮ menu items:
  📤 Submit to Client
  📋 Request Documents
  🔄 Update Stage
  📝 Add Note
  🚫 Reject
```

---

### D.3 — IDENTITY BAR (always visible below header)

```
KAI No:  AYE-KAI-2026-000001   |   [Shortlisted chip]   |   Score: 90% Strong
```

Rules:
- KAI No shown here (this is the drawer — not the grid)
- Stage chip uses same colour mapping as grid
- Score + tier always visible

---

### D.4 — QUICK ACTIONS BAR

| Button | Icon | Action | Condition |
|---|---|---|---|
| Call | 📞 | tel:{mobile} | Show only if mobile not empty |
| WhatsApp | 💬 | https://wa.me/{mobile} | Show only if mobile not empty |
| Email | ✉ | mailto:{email} | Show only if email not empty |
| Submit to Client | 📤 | Opens submission flow | Show always |

---

### D.5 — TAB: PROFILE

```
SECTION: Personal
  Name:           Bibin Raju
  Nationality:    Indian         (or "—" if empty)
  Age:            —              (or "41Y" if available)
  Date of Birth:  —              (or "12 Jan 1982")
  Current Location: —            (or city name)
  Employment Status: —
  Notice Period:  —              (or "30 days")

SECTION: Professional
  Trade:          Welding QA
  Industry:       Oil & Gas
  Experience:     12 years
  Gulf Exp:       GCC: 12 years  (raw text)
  GCC Mobility:   GCC Transferable  (classified)
  Position Applied: Welding QA
  Top 3 Positions: [listed vertically]
    1. Welding Engineer/Inspector
    2. Senior Welder (TIG/MIG)

SECTION: Education
  Level:    Degree
  Subject:  Welding Inspection
  Raw:      "Degree in Welding Inspection"

SECTION: Missing Fields
  If missingFields array not empty:
  ⚠ Missing: DOB, Current Location, Passport Expiry, ECR Status, Nationality
  (amber strip, collapsible)
```

---

### D.6 — TAB: KAI ASSESSMENT

```
SCORE BREAKDOWN
  Overall Score: 90 / 100
  
  Technical Fit:      22 / 25   ████████████████████▒▒▒▒
  GCC Experience:     23 / 25   ████████████████████████▒
  CV Clarity:         20 / 25   ████████████████▒▒▒▒▒▒▒▒
  Trade Fit:          25 / 25   ████████████████████████
  Age Fit:             0 / 5    ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒

CONFIDENCE TIER
  ● STRONG MATCH    [Green badge]

KAI FULL ASSESSMENT
  [Full text from kaiAssessment field — displayed as-is]

  ✓ Strengths: GCC experience, NDT coordination, Code compliance
  ⚠ Concerns: CV lacks specific project details...
  ★ Strength Marker: GCC EXPERIENCE
  → Action: Call to confirm specific GCC countries...

RECOMMENDED ROLES
  • Quality Welding Engineer
  • Senior Welding Inspector
```

Rules:
- Score breakdown parsed from scoreBreakdown field ("Tech:22 | GCC:23 | Clarity:20 | TradeFit:25 | Age:0")
- Progress bars: filled width = (component/max) × 100%
- Full KAI text displayed verbatim — no truncation in drawer

---

### D.7 — TAB: DOCUMENTS

```
PASSPORT
  Passport No:    [Extract from kaiAssessment/notes or "—"]
  Expiry:         [passportExpiry formatted or "Unknown"]
  Status:         Valid / <6 months / Expired / Unknown
  ECR Status:     ECNR / ECR / —
  Medical Status: —

CV
  [If cvLink exists]:
    [Preview CV button → open in iframe below or new tab]
    [Open in Drive ↗]  [Download ⬇]
    
    Iframe preview (if PDF):
    ┌──────────────────────────┐
    │  [PDF embedded here]     │
    │  Scrollable, 300px tall  │
    └──────────────────────────┘
  
  [If no cvLink]:
    "No CV uploaded"
    [Upload CV] button → triggers manual upload flow

Deployability Score:  23 / 100
```

---

### D.8 — TAB: HISTORY

```
PROJECT HISTORY
  [If in any slots]:
  ┌─────────────────────────────────────────────────────┐
  │ Project        │ Role      │ Status      │ Date     │
  │ NMDC Offshore  │ Welder    │ Shortlisted │ Jun 2026 │
  └─────────────────────────────────────────────────────┘
  [If no history]: "Not linked to any project yet"

TIMELINE
  [Chronological activity log — newest first]
  
  2026-06-01 12:00  AUTO_REPLY_SENT
    Missing info request sent to bibinraj11@yahoo.com · Ref: AYE-2026-36735
    By: KAI-AUTO
  
  2026-05-24 05:37  AUTO_REPLY_SENT
    Missing info request sent · Ref: AYE-2026-52429
    By: KAI-AUTO
  
  [Load more] if > 10 entries
```

---

### D.9 — TAB: NOTES

```
EXISTING NOTES
  [If notes not empty]:
    [Note text displayed]
    [timestamp · author]

ADD NOTE
  ┌──────────────────────────────────────────────────────┐
  │ Type your note here...                               │
  │                                                      │
  └──────────────────────────────────────────────────────┘
  [Save Note] button → POST action=saveNote to GAS

RECRUITER ACTION (from KAI)
  "Call to confirm specific GCC countries and durations,
   request certifications and CV for review."
  [This field is KAI's recommended next action — read-only here]
```

---

### D.10 — DRAWER BEHAVIOUR

```
Open:   Slides in from right, 300ms ease
Close:  [← Close] button OR click backdrop OR Escape key
Width:  480px (desktop) / full screen (mobile)
Scroll: Drawer body scrolls independently of grid

On open:
  1. Fetch single candidate: GET ?action=candidate&rowIndex={rowIndex}&token={token}
  2. Show skeleton while loading
  3. Populate all tabs with fetched data

On stage change (from ⋮ menu):
  1. Show stage selector dropdown
  2. POST ?action=updateStage {rowIndex, newStage, recruiter}
  3. On success: update stage chip in drawer + in grid row
  4. Log activity

On note save:
  1. POST ?action=saveNote {rowIndex, note, recruiter}
  2. On success: append note to history, clear input
```

---

## SECTION E — GAS IMPLEMENTATION TASKS

### Tasks required to fully support Candidate Database + Drawer:

---

**TASK E-01: Create _Clients sheet**
```
Sheet: _Clients
Columns: ClientCode | ClientName | Country | Sector | Active | CreatedAt
Auto-generate: CL0001 format
New function: getClients_(), createClient_(body), generateClientCode_()
```

**TASK E-02: Create _CandidateSlots sheet**
```
Sheet: _CandidateSlots
Columns: SlotID | CandidateID | KAINo | RoleID | ProjectID | CampaignID |
         DeptID | SlotStatus | SourceType | SourceOwner | CandidateOwner |
         CurrentHandler | SubmittedBy | AddedAt | AddedBy | ScreenedAt |
         ShortlistedAt | SubmittedAt | InterviewDate | InterviewMode |
         InterviewVenue | InterviewOutcome | SelectedAt | OfferSentAt |
         OfferAcceptedDate | VisaInitiatedDate | DeployedDate |
         ClientResponse | ProtectedCvUrl | RecruiterNotes | UpdatedAt
New functions: getCandidateSlots_(params), createCandidateSlot_(body), 
               updateCandidateSlot_(body)
```

**TASK E-03: Create _Associates sheet**
```
Sheet: _Associates
Columns: AssociateID | Name | AgencyName | ContactEmail | ContactMobile |
         Country | City | AssignedMode | AssignedProjects_JSON | 
         AssignedCampaigns_JSON | AssignedRoles_JSON |
         TotalSent | TotalShortlisted | TotalSelected | TotalDeployed |
         QualityScore | ConversionScore | SpeedScore | VolumeScore |
         WeightedScore | Grade | GradePeriod | Active | CreatedAt
New functions: getAssociates_(), computeAssociateScore_(associateId),
               updateAssociateMetrics_(associateId)
```

**TASK E-04: Create _RecruiterMetrics sheet**
```
Sheet: _RecruiterMetrics
Columns: RecruiterId | RecruitName | Month (YYYY-MM) | Sourced | Screened |
         Shortlisted | Submitted | Interviewed | Selected | Deployed |
         ScreenRate | ShortlistRate | SubmissionRate | InterviewRate |
         SelectionRate | DeploymentRate | OverallConversion |
         AvgCandidateScore | AvgResponseDays | ClientRejectionRate |
         ProjectBreakdown_JSON | UpdatedAt
New functions: getRecruiterMetrics_(params), computeMonthlyMetrics_(recruiterId, month),
               rollupRecruiterMetrics_()
```

**TASK E-05: Update getCandidates_ — add sourceOwner field**
```
In getCandidates_ record builder, add:
  sourceOwner: String(row[COL.sourceOwner-1]||'SYSTEM').trim()
  
Note: sourceOwner column needs to be added to Candidates sheet
OR read from _CandidateSlots for candidates that came via slots
Default: 'SYSTEM' (auto-pipeline)
```

**TASK E-06: Update getRequirementsEnhanced_ — role-based commercial filtering**
```
Add getUserRole_(token) helper
In getRequirementsEnhanced_:
  var role = getUserRole_(token)
  if (role === 'RECRUITER' || role === 'ASSOCIATE') {
    delete req.commercial  // strip Layer 1
  }
  if (role === 'ASSOCIATE') {
    delete req.clientTerms  // strip Layer 2 also
  }
```

**TASK E-07: Add getRecruiterMetrics_ endpoint**
```
doGet routing: action === 'recruiterMetrics' → getRecruiterMetrics_(params)

params:
  recruiterId: string (or 'ALL' for manager view)
  period: 'CURRENT_MONTH' | 'PREV_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'LIFETIME'
  from: date string (for custom range)
  to: date string (for custom range)

Response: { ok: true, metrics: {...}, period: {...} }
```

**TASK E-08: Add computeAssociateScore_ endpoint**
```
doGet routing: action === 'associateMetrics' → getAssociateMetrics_(params)
Computes weighted score from _CandidateSlots WHERE sourceType=ASSOCIATE AND associateId=X
Returns: { weightedScore, components, grade, gradePeriod }
```

**TASK E-09: Update setupAllNewSheets()**
```
Add creation of:
  _Clients (with headers)
  _CandidateSlots (with headers)
  _Associates (with headers)
  _RecruiterMetrics (with headers)
```

**TASK E-10: Update testBridgeEndpoints()**
```
Add tests for:
  getClients_
  getCandidateSlots_
  getAssociates_
  getRecruiterMetrics_ (CURRENT_MONTH)
```

---

**PRIORITY ORDER FOR GAS TASKS:**
```
Sprint 2 (now): E-01, E-02, E-05, E-06  ← needed for Candidate Drawer + submissions
Sprint 3:       E-03, E-04, E-07, E-08  ← needed for SAC + Recruiter screens
Sprint 4:       E-09, E-10              ← cleanup + test coverage
```

---

## SECTION F — LOVABLE CANDIDATE DATABASE PROMPT

*Paste this into Lovable chat to rebuild or update the Candidates screen.*

---

```
================================================================
KAI SPRINT 1 — FINAL: Candidate Database Screen
================================================================

This is the Candidates screen for KAI OS — a GCC Recruitment
Operating System for Al Yousuf Manpower.

Do NOT change any other screen. Only the Candidates page.

================================================================
DATA SOURCE
================================================================

GAS_URL = "https://script.google.com/macros/s/AKfycbxfNPL371bf8UF84bMz3E2i8drw4opVpWJMb24w2pW_p_og08_MwlJ5PyRqtaZPHv02Ng/exec"

Token: localStorage.getItem('kai_session_token')
If token is null: show error "Not logged in" — do NOT redirect.

Fetch on mount:
  GET {GAS_URL}?action=candidates&token={token}&page=1&limit=100
  fetch(url, { method: 'GET', redirect: 'follow' })

Response shape:
  { ok: true, records: [...], total: 4520, page: 1, limit: 100, totalPages: 46 }

Single candidate fetch (for drawer):
  GET {GAS_URL}?action=candidate&token={token}&rowIndex={rowIndex}

Save note:
  POST body: { action: 'saveNote', token, rowIndex, note, recruiter }

Update stage:
  POST body: { action: 'updateStage', token, rowIndex, newStage, recruiter }

================================================================
STATS BAR
================================================================

Show 4 chips above the grid:
  Total: {total from API}          — grey chip
  Shortlisted: {count where stage = "Shortlisted"} — amber chip
  Strong Match: {count where confidenceTier = "STRONG"} — green chip
  Deployed: {count where stage = "Deployed"} — dark green chip

Stats reflect the CURRENTLY FILTERED set.
When no filter active: reflects all loaded candidates.

================================================================
FILTER BAR
================================================================

Search input (full width on mobile):
  Placeholder: "Search name, KI number, trade, passport, mobile..."
  Debounced 300ms
  Client-side: searches name, kaiNo, trade, positionApplied, nationality

Filter chips (right side):
  [Stage ▼]  [Trade ▼]  [Nationality ▼]  [Score ▼]  [GCC Mobility ▼]  [Source ▼]

Stage options: New, Review, Needs Call, Shortlisted, Client Sent, Selected, Deployed, On Hold, Rejected
Score options: Strong (75-100), Good (55-74), Possible (35-54), Review (0-34)
GCC options: India Available, GCC Transferable, Saudi Local, UAE Local, Qatar Local
Source options: Direct, Associate, Telegram, Manual Upload, Recontact, Import

Active filter chips: show label + × button.
"Clear All" link when any filter is active.

================================================================
12-COLUMN GRID
================================================================

Sticky (fixed left, do not scroll): COL 1 + COL 2
All other columns: scroll horizontally
Horizontal scrollbar: always visible at bottom
Minimum row height: 56px
Default sort: applicationDate descending

COL 1 — Stage (120px)
  Badge chip with colour:
  "Shortlisted" → green
  "Review" → blue
  "Needs Call" → orange
  "Selected" → dark green
  "Deployed" → darker green
  "Client Sent" → purple
  "On Hold" → amber
  "Rejected" → red
  "New" or other → grey
  Show checkbox on hover for bulk select.

COL 2 — Candidate (180px)
  Line 1: name, bold, 14px
  Line 2: nationality · age (e.g. "Indian · 31Y"), grey 12px
  If age = 0: show nationality only
  DO NOT show KI number here.

COL 3 — Passport (120px)
  Line 1: passportNo (or "—" in grey if empty)
  Line 2: "ECNR" or "ECR" small chip (if ecrStatus not empty)

COL 4 — Location (110px)
  currentLocation (or "—")

COL 5 — Education (160px)
  Line 1: educationLevel
  Line 2: educationSubject, grey 12px
  If educationLevel empty: show educationRaw truncated 40 chars

COL 6 — Position Applied (150px)
  positionApplied truncated at 30 chars with ellipsis

COL 7 — Trade / Skill (140px)
  trade, bold, slightly darker text

COL 8 — KAI Assessment (130px)
  Line 1: score + "%" bold 16px (e.g. "90%")
  Line 2: tier label
    STRONG   → "Strong Match" green text
    GOOD     → "Good Match" blue text
    POSSIBLE → "Possible Match" amber text
    REVIEW   → "Review" grey text
  NO AI text. Score + tier only.

COL 9 — CV (100px)
  If cvLink not empty:
    👁 (preview) ↗ (open) ⬇ (download) — small icon buttons in a row
  If cvLink empty: "No CV" grey 11px

COL 10 — Top 3 Positions (180px)
  Show top3Positions.first (truncated 25 chars)
  If top3Positions.count > 1: append " +{rest.length}" in grey
  Hover tooltip: list all positions

COL 11 — Contact (90px)
  Show icons only when data exists:
    📞 if mobile not empty → clicking opens tel:{mobile}
    💬 if mobile not empty → clicking opens https://wa.me/{mobile}
    ✉  if email not empty  → clicking opens mailto:{email}
  16px icons, spaced evenly.
  DO NOT show phone/email text in grid.

COL 12 — Recruiter Actions (60px)
  Single "⋮" button → dropdown menu:
    📞 Call Candidate
    💬 WhatsApp
    ⭐ Shortlist
    📋 Request Documents
    📤 Submit to Client
  Actions show toast "Action: {name}" for now.

================================================================
ROW CLICK → CANDIDATE DRAWER
================================================================

Clicking anywhere on row (except action buttons in cols 9, 11, 12)
→ opens Candidate Drawer

Drawer: slides in from right, 480px wide
Backdrop: semi-transparent, click to close

DRAWER HEADER:
  [← Close]   {candidate.name}   [⭐ Shortlist]  [⋮]

IDENTITY BAR (always visible):
  KAI No: {kaiNo}  |  [stage chip]  |  Score: {score}% {tier}

QUICK ACTIONS BAR:
  [📞 Call]  [💬 WhatsApp]  [✉ Email]  [📤 Submit]
  Show only if corresponding data exists.

TABS:  Profile | Assessment | Documents | History | Notes

TAB — Profile:
  Personal: name, nationality, age, dob, currentLocation, empStatus, noticeDays
  Professional: trade, industry, experience, gulfExp, gccMobility, positionApplied
  Top 3 Positions: listed vertically (full list, no truncation)
  Education: educationLevel, educationSubject, educationRaw
  Missing Fields: amber warning strip if missingFields array not empty
    "⚠ Missing: {missingFields joined with comma}"

TAB — Assessment:
  Score breakdown parsed from scoreBreakdown field format "Tech:22 | GCC:23 | Clarity:20 | TradeFit:25 | Age:0"
  Show each component as progress bar (label, value/max, bar)
  Confidence Tier badge
  Full kaiAssessment text (verbatim, no truncation)
  Recommended Roles: recommendedRoles field

TAB — Documents:
  Passport: passportNo, passportExpiry (formatted), passportStatus, ecrStatus
  CV: if cvLink → preview button + open + download + iframe embed (300px tall)
      if no cvLink → "No CV uploaded"
  Deployability Score: {deployScore} / 100

TAB — History:
  Project slots (from candidate.slots if available, else "Not linked to any project")
  Timeline: parse candidate.timeline JSON array
    Show each entry: timestamp + action + note + actor
    Newest first. Max 10 visible, [Load more] if more.

TAB — Notes:
  Show existing notes field content
  Textarea input for new note
  [Save Note] button → POST saveNote to GAS
  Show recruiterAction field as read-only "KAI Recommended Action"

================================================================
LOADING STATES
================================================================

While fetching candidates:
  Show 8 skeleton rows with animated grey blocks

While fetching single candidate (drawer):
  Show skeleton in drawer content area

Error state:
  Amber banner: "⚠ Could not load: {error message}" with [Retry] button

Empty state (no matches):
  "No candidates match your filters"
  [Clear all filters] button

================================================================
MOBILE LAYOUT (< 768px)
================================================================

HIDE the 12-column table.
SHOW card layout instead:

Each card:
  Row 1: [stage chip left]  [score% + tier right]
  Row 2: candidate name (bold)
  Row 3: nationality · age · location (grey)
  Row 4: Trade: {trade}   Exp: {experience}yr
  ─────────────────────────────────────────────
  Row 5: [📞] [💬] [✉]              [⋮ Actions]

Card click → opens drawer (full screen on mobile)
Show: search bar + Stage chip filter only (above cards)

================================================================
RULES
================================================================

1. DO NOT show KI Number (kaiNo) in the grid — drawer only
2. DO NOT show passport expiry in the grid — drawer only
3. DO NOT show full KAI assessment text in the grid — drawer only
4. Token key: localStorage.getItem('kai_session_token') — do NOT change
5. fetch with { method: 'GET', redirect: 'follow' } — required for GAS
6. Map API response.records to candidates, response.total to total count
7. RESERVED and LOCKED candidates: show in grid with status badge
   but disable Submit action button for them
8. Preserve existing login flow — do not touch auth
9. Use Tailwind CSS only
================================================================
```

---

*v3 FINAL — All adjustments applied. Candidate Database module complete.*
*Next: Review and approve before Lovable build begins.*
