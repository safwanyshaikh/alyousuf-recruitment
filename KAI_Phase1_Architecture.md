# KAI OS — Phase 1 Architecture
## Validated Against: NMDC Energy June 2026 · CNCEC WEP · Al Yousuf 5,766 Candidates

---

## SECTION 1 — CORE ENTITIES & RELATIONSHIPS

```
Tenant
  └── Projects
        └── Campaigns
              └── Departments
                    └── Roles
                          └── CandidateSlots (link table)
                                └── Candidate (master asset, shared)

Candidate ←→ CandidateSlots (many-to-many)
Candidate ←→ Submissions (one candidate → many clients)
Candidate ←→ ActivityLog (permanent history)
JD → Role (one JD may spawn many roles)
Requirement → Campaign (one requirement → one campaign)
```

**Key rule:** Candidate is never inside a Project. Candidate is linked to a Role via
CandidateSlot. If the project closes, the slot is archived. The Candidate remains.

---

## SECTION 2 — FIRESTORE COLLECTIONS

### 2.1 — Tenant Root
```
/tenants/{tenantId}
  name: string
  country: string
  plan: "GAS" | "FIREBASE_SAAS"
  createdAt: timestamp
  adminEmail: string
```

### 2.2 — Candidates (Master Asset — Never Deleted)
```
/tenants/{tenantId}/candidates/{candidateId}
  
  -- IDENTITY --
  kaiNo: string               // AYE-KAI-2026-000001 (immutable)
  name: string
  nationality: string
  dob: date
  age: number                 // computed
  mobile: string              // deduplication key 2
  email: string               // deduplication key 3
  passportNo: string          // deduplication key 1 (primary)
  passportExpiry: date
  ecrStatus: "ECNR" | "ECR" | ""
  
  -- PROFESSIONAL --
  trade: string               // canonical taxonomy value
  positionApplied: string     // raw from CV
  industry: string
  experience: number          // years
  gulfExp: string             // raw text
  gccMobility: enum           // INDIA_AVAILABLE | GCC_TRANSFERABLE | SAUDI_LOCAL | UAE_LOCAL | ...
  currentLocation: string
  empStatus: string
  noticeDays: number
  
  -- EDUCATION --
  educationLevel: enum        // Degree | Diploma | ITI | High School | ...
  educationSubject: string
  educationRaw: string        // original text
  
  -- KAI INTELLIGENCE --
  score: number               // 0-100
  confidenceTier: enum        // STRONG | GOOD | POSSIBLE | REVIEW
  verdict: enum               // SHORTLISTED | NEEDS_REVIEW | NEEDS_CALL | SELECTED | REJECTED
  kaiAssessment: string       // full AI text (drawer only, never grid)
  scoreBreakdown: string
  recommendedRoles: string[]
  top3Positions: object       // { first, rest[], count }
  flags: string               // GREEN | AMBER | RED
  deployScore: number
  missingFields: string[]
  
  -- DOCUMENTS --
  cvLink: string              // Drive URL
  cvUploadedAt: timestamp
  passportScan: string        // Drive URL (future)
  
  -- STATUS --
  status: enum                // ACTIVE | RESERVED | LOCKED | ARCHIVED | SUPERSEDED
  stage: string               // recruiter-set pipeline stage
  active: boolean | "SUPERSEDED" | "ARCHIVED"
  
  -- TRACKING --
  applicationDate: timestamp
  lastContact: timestamp
  sourceEmail: string         // original sender email
  sourceThread: string        // Gmail thread ID
  recruiterAction: string
  notes: string
  timeline: array             // [{ts, action, by, note}]
  
  -- OWNERSHIP --
  ownedBy: string             // tenantId (permanent)
  createdBy: string           // userId
  updatedAt: timestamp
```

### 2.3 — Projects
```
/tenants/{tenantId}/projects/{projectId}
  projectId: string           // PROJ-20260601-NMDC-001
  name: string                // "NMDC Energy Offshore Jun 2026"
  client: string              // "NMDC Energy"
  country: string             // "UAE"
  sector: string              // "Offshore Oil & Gas"
  status: enum                // ACTIVE | PAUSED | CLOSED | ARCHIVED
  phase: number               // 1, 2, 3 (supports multi-phase without duplication)
  totalPositions: number      // sum of all role quantities
  managerId: string           // userId
  createdAt: timestamp
  startDate: date
  targetDate: date
  notes: string
  originalSourceId: string    // link to /originalDocuments/{docId}
```

### 2.4 — Campaigns
```
/tenants/{tenantId}/projects/{projectId}/campaigns/{campaignId}
  campaignId: string          // CAMP-20260601-NMDC-OFFSHORE-01
  name: string                // "Offshore Mobilization Batch 1"
  hiringMode: enum            // ONLINE_INTERVIEW | CAMPING | HYBRID
  interviewDate: date
  interviewLocations: string[]  // ["Mumbai", "Hyderabad", "Chennai"]
  sourceRegions: string[]       // from location intelligence
  targetCount: number
  selectedCount: number
  status: enum                // PLANNING | ACTIVE | COMPLETED | CANCELLED
  assignedRecruiters: string[]  // userIds
  assignedAssociates: string[]  // userIds
  createdAt: timestamp
```

### 2.5 — Departments
```
/tenants/{tenantId}/projects/{projectId}/campaigns/{campaignId}/departments/{deptId}
  name: string                // "Welding", "Civil", "Mechanical", "HSE"
  headCount: number           // total positions in this dept
  recruiterId: string         // primary recruiter
  status: enum                // OPEN | FILLED | PARTIAL
```

### 2.6 — Roles (Execution Unit — maps 1:1 with JD line item)
```
/tenants/{tenantId}/projects/{projectId}/campaigns/{campaignId}/departments/{deptId}/roles/{roleId}
  roleId: string              // ROLE-NMDC-001-WELDER
  title: string               // "Welder"
  trade: string               // canonical taxonomy
  quantity: number            // 49 (from NMDC JD)
  filled: number              // running count
  remaining: number           // quantity - filled
  minExperience: number       // years
  minAge: number
  maxAge: number
  certifications: string[]    // required certs
  gccPreference: boolean
  localTransferOK: boolean
  visitVisaOK: boolean
  urgency: enum               // URGENT | NORMAL | LOW
  jdId: string                // link to /jds/{jdId}
  status: enum                // OPEN | PARTIAL | FILLED | CLOSED
```

### 2.7 — CandidateSlots (Link Table — Candidate ↔ Role)
```
/tenants/{tenantId}/candidateSlots/{slotId}
  candidateId: string
  roleId: string
  projectId: string
  campaignId: string
  kaiNo: string
  
  slotStatus: enum            // SOURCED | SCREENED | SHORTLISTED | SUBMITTED |
                              // INTERVIEWED | SELECTED | OFFER_SENT | OFFER_ACCEPTED |
                              // VISA_INITIATED | DEPLOYED | REJECTED | WITHDRAWN
  
  addedAt: timestamp
  addedBy: string             // userId
  updatedAt: timestamp
  
  interviewDate: date
  interviewMode: enum
  interviewVenue: string
  interviewOutcome: string
  selectionDate: date
  offerDate: date
  offerAcceptedDate: date     // triggers candidate status → RESERVED
  visaInitiatedDate: date     // triggers candidate status → LOCKED
  deployedDate: date
  
  submittedToClient: boolean
  clientResponse: string
  protectedCvUrl: string      // watermarked CV for client
  
  recruiterNotes: string
  recruiterAction: string
```

### 2.8 — JDs (Structured Intelligence Layer)
```
/tenants/{tenantId}/jds/{jdId}
  jdId: string                // JD-20260601-NMDC-OFFSHORE
  receivedAt: timestamp
  source: string              // "email" | "upload" | "manual"
  originalDocumentId: string  // link to raw PDF/Excel
  
  -- PARSED INTELLIGENCE --
  client: string
  projectName: string
  country: string
  sector: string
  roles: array                // [{title, quantity, minExp, certs}]
  totalPositions: number
  minExperience: number
  certifications: string[]
  specialRequirements: string
  
  status: enum                // DRAFT | ACTIVE | ARCHIVED
  linkedProjectId: string
  parsedBy: string            // "KAI-AUTO" | userId
  parsedAt: timestamp
```

### 2.9 — Original Documents (Audit Layer — Immutable)
```
/tenants/{tenantId}/originalDocuments/{docId}
  docId: string
  type: enum                  // PDF | EXCEL | EMAIL | IMAGE | TEXT
  fileName: string
  driveUrl: string            // original file, never modified
  receivedAt: timestamp
  receivedFrom: string        // email or userId
  contentHash: string         // SHA256 for integrity check
  linkedJdId: string
  linkedProjectId: string
  visibilityLevel: enum       // AGENCY_INTERNAL | CLIENT_FACING | CANDIDATE_FACING
```

### 2.10 — Requirements (Commercial Intelligence — SPLIT BY VISIBILITY)

**CRITICAL: Three-layer visibility. Enforced at Firestore rules + GAS + UI.**

```
/tenants/{tenantId}/requirements/{reqId}
  reqId: string

  ── LAYER 1: AGENCY_INTERNAL (managers + admins only) ──────────────
  commercial:
    agencyFeePerCandidate_INR: number     // e.g. 35400 (NMDC)
    clientPaymentPerForeman_USD: number   // e.g. 350 (NMDC)
    agencyMargin: number                  // computed
    vendorTerms: string                   // performance clauses
    competingAgencies: number             // e.g. 1 (NMDC: "one more agency")
    successRatioKPI: number               // e.g. 0.80 (NMDC: 80%)
    discontinuationTerms: string          // "2 consecutive failures = removed"
    hourlyRates: map                      // AED rates by role (CNCEC rate schedule)
    visibilityLevel: "AGENCY_INTERNAL"
  
  ── LAYER 2: CLIENT_FACING (recruiters + managers) ─────────────────
  clientTerms:
    rotation: string                      // e.g. "60/30"
    accommodation: string                 // "sharing 4-8 person"
    transport: string
    iqamaTransfer: boolean
    salaryRange: map                      // {min, max, currency} — when received
    salaryStatus: enum                    // CONFIRMED | PENDING | TBD
    visibilityLevel: "CLIENT_FACING"
  
  ── LAYER 3: CANDIDATE_FACING (everyone) ───────────────────────────
  publicTerms:
    positions: array                      // titles + quantities only
    country: string                       // "UAE"
    workType: string                      // "Offshore"
    benefits:
      airTicket: boolean                  // true
      medicalInsurance: boolean           // true
      accommodation: boolean             // true
      food: boolean                       // true
      overtime: boolean                   // true
    labourLaw: string                     // "UAE Labour Law"
    minExperience: string                 // "Offshore experience required"
    candidateFeeINR: number               // 35400 (this IS public per Indian govt)
    visibilityLevel: "CANDIDATE_FACING"
```

### 2.11 — Users & Permissions
```
/tenants/{tenantId}/users/{userId}
  email: string
  name: string
  role: enum                  // ADMIN | MANAGER | RECRUITER | ASSOCIATE | VIEWER
  assignedProjects: string[]
  assignedCampaigns: string[]
  assignedDepts: string[]
  active: boolean
  passwordHash: string
  sessionToken: string
  tokenExpiry: timestamp
```

### 2.12 — Submissions (Client-Facing Records)
```
/tenants/{tenantId}/submissions/{subId}
  subId: string
  roleId: string
  projectId: string
  candidateIds: string[]
  submittedAt: timestamp
  submittedBy: string
  clientName: string
  clientContact: string
  fileUrl: string             // protected/watermarked PDF
  clientResponse: enum        // PENDING | ACCEPTED | REJECTED | SHORTLISTED
  notes: string
```

### 2.13 — Activity Log (Permanent — Never Deleted)
```
/tenants/{tenantId}/activityLog/{logId}
  candidateId: string
  kaiNo: string
  timestamp: timestamp
  action: enum                // ADDED | STAGE_CHANGE | SUBMITTED | INTERVIEWED |
                              // SELECTED | OFFER_SENT | OFFER_ACCEPTED | VISA_STARTED |
                              // DEPLOYED | NOTE_ADDED | CV_UPDATED | DUPLICATE_MERGED
  detail: string
  actor: string               // userId or "KAI-AUTO"
  projectId: string
  roleId: string
```

### 2.14 — Taxonomy (Always Evolving)
```
/tenants/{tenantId}/taxonomy/trades/{tradeId}
  canonical: string           // "Structural Welder"
  aliases: string[]           // ["welder", "struct welder", "Structure Welder"]
  sector: string              // "Offshore Oil & Gas"
  certifications: string[]    // typical certs for this trade
  avgScore: number            // learned from history
  sourceLocations: map        // {city: {submitted, selected, deployed}}
  lastUpdated: timestamp

/tenants/{tenantId}/taxonomy/certifications/{certId}
  name: string
  aliases: string[]
  trades: string[]            // which trades typically need this

/tenants/{tenantId}/taxonomy/locations/{locationId}
  city: string
  state: string
  country: string
  performance: map            // by trade: {submitted, interviewed, selected, deployed}
```

---

## SECTION 3 — GAS SHEET STRUCTURE

### 3.1 — Current Production Sheets (SS_ID: 101iCo5lPpGOZc5CGGZA_kaYugbPHzRXQstl3WsRKBRE)

| Sheet | Purpose | Firestore Equivalent |
|---|---|---|
| Candidates | Master candidate asset (42 cols) | /candidates |
| _LoginSystem | Auth tokens | /users |
| _Requirements | Parsed requirements | /requirements (layer 2+3 only) |
| _JD_Repository | JD intelligence | /jds |
| _ActivityLog | Permanent event log | /activityLog |
| _ManualUpload | CV upload staging | upload queue |
| _Projects | Project list | /projects |
| _ClientSubs | Client submissions | /submissions |
| _JD_Matches | Candidate-JD match scores | /candidateSlots |
| _JDs | Parsed JDs | /jds |
| _Timeline | Candidate timelines | embedded in candidate |
| Archive | Superseded candidates | status=ARCHIVED |
| Rejected | Rejected candidates | status=REJECTED |
| Taxonomy | Trade/skill taxonomy | /taxonomy |
| _KAI_Knowledge | AI learning patterns | /taxonomy enrichment |
| Logs | System events | /activityLog |
| _Errors | Pipeline errors | monitoring |
| _Meta | Email metadata | source tracking |

### 3.2 — NEW Sheets Required (Phase 1 additions)

| Sheet | Purpose | Columns |
|---|---|---|
| _CommercialTerms | Agency-internal commercial data | ReqID, AgencyFee_INR, ClientFee_USD, SuccessRatio, VendorTerms, HourlyRates_JSON, VisibilityLevel |
| _CandidateSlots | Candidate ↔ Role link table | SlotID, CandidateID, RoleID, ProjectID, CampaignID, SlotStatus, Dates... |
| _Departments | Department structure | DeptID, CampaignID, Name, HeadCount, RecruiterID |
| _Roles | Role definitions | RoleID, DeptID, Title, Trade, Quantity, Filled, MinExp |
| _LocationPerformance | Sourcing location KPIs | City, State, Trade, Submitted, Interviewed, Selected, Deployed |

---

## SECTION 4 — DUPLICATE DETECTION LOGIC

### Priority Order (enforced in sequence):

```
1. PASSPORT NUMBER (primary key)
   If passportNo matches existing → MERGE (keep latest data, append source history)
   
2. MOBILE NUMBER (secondary key)
   If mobile matches AND name similarity > 85% → FLAG for review
   If mobile matches AND name similarity < 85% → WARN (different person, same number)
   
3. EMAIL ADDRESS (tertiary key)
   If email matches AND name similarity > 80% → FLAG for review
   
4. AI SIMILARITY (fallback)
   If name similarity > 90% AND trade matches AND nationality matches → FLAG
   Human review required before merge
```

### On Duplicate Detection:
```
Action: MERGE
- Keep the row with higher score / more complete data
- Append source history: [{date, source, originalKaiNo}]
- Set superseded row: active = "SUPERSEDED", notes = {reason: "duplicate", keptRow: X}
- Preserve ALL submission history on surviving record
- Log: action = "DUPLICATE_MERGED", detail = "kept KAI-XXXX, superseded KAI-YYYY"
```

---

## SECTION 5 — CANDIDATE STATUS WORKFLOW

```
ACTIVE          ← default on entry
    ↓
ACTIVE          ← shortlisted, submitted, interviewed (still available for other projects)
    ↓
RESERVED        ← Offer Accepted (soft lock — available for discussion only)
    ↓
LOCKED          ← Visa Process Initiated (hard lock — removed from all matching)
    ↓
DEPLOYED        ← On ground (historical record)
    ↓
ACTIVE          ← Returns after contract end (re-enters candidate pool)

REJECTED        ← Failed interview / trade test (still searchable, not deleted)
ARCHIVED        ← Superseded / duplicate
```

### Status Transition Rules:
- `ACTIVE → RESERVED`: Only on `offerAcceptedDate` written to CandidateSlot
- `RESERVED → LOCKED`: Only on `visaInitiatedDate` written to CandidateSlot
- `LOCKED → DEPLOYED`: Only on `deployedDate` written
- `DEPLOYED → ACTIVE`: On contract end date (re-activation)
- **LOCKED candidates must NOT appear in matching results**
- **RESERVED candidates appear in results with "RESERVED" badge — no new submissions**

---

## SECTION 6 — CANDIDATE OWNERSHIP LOGIC

```
Candidate.ownedBy = tenantId (PERMANENT, set on creation, never changed)

Candidate.kaiNo = globally unique, immutable, assigned once

Candidate may be:
  - Linked to 0 projects   → available in pool
  - Linked to 1 project    → assigned, still available for others
  - Linked to N projects   → multi-project, still available until RESERVED
  - Status = RESERVED      → soft-locked, 1 pending offer
  - Status = LOCKED        → hard-locked, visa processing, excluded from all matching
```

---

## SECTION 7 — COMMERCIAL TERM PRIVACY ARCHITECTURE

### The Problem (validated against NMDC JD):
The same client document contains:
- PUBLIC: positions, quantities, offshore requirement, benefits
- CONFIDENTIAL: agency commercial rate (USD 350/foreman), performance KPIs, vendor competition terms

### The Solution — Three Visibility Layers:

```
LAYER 1: AGENCY_INTERNAL
  Who sees it: ADMIN + MANAGER only
  Contains: agencyFeePerCandidate, clientPaymentRates, successRatioKPIs,
            vendorTerms, competingAgencies, hourlyRatesSchedule (CNCEC AED rates)
  GAS Sheet: _CommercialTerms (separate sheet, separate API action)
  Firestore: /requirements/{id}/commercial (subcollection)
  API: action=commercialTerms (requires role=MANAGER|ADMIN)
  UI: never rendered in candidate-facing or recruiter grid screens

LAYER 2: CLIENT_FACING  
  Who sees it: MANAGER + RECRUITER
  Contains: rotation, accommodation, transport, salary (when confirmed)
  GAS Sheet: _Requirements col 18+ 
  API: action=requirements (filtered by user role)
  UI: visible in recruiter campaign view, hidden from candidates

LAYER 3: CANDIDATE_FACING
  Who sees it: everyone (candidates, associates, recruiters, public)
  Contains: positions, country, benefits, labour law, candidateFeeINR
  API: action=publicJD (no auth required for read)
  UI: candidate notification emails, Telegram intake confirmation

ENFORCEMENT POINTS:
  1. GAS Bridge: check token role before returning commercial fields
  2. Firestore rules: role-based document access (when migrated)
  3. Lovable UI: recruiter screens never render commercial fields
  4. Email templates: only candidateFacing fields used in outbound emails
  5. Protected CVs: watermarked PDF strips commercial header before sending to candidates
```

### Implementation in GAS Bridge:
```
function getRequirementsEnhanced_() {
  var role = getUserRole_(token);   // get role from _LoginSystem
  var req = getBaseRequirements_();
  
  if (role === 'MANAGER' || role === 'ADMIN') {
    req = mergeCommercialTerms_(req);  // add commercial layer
  }
  // Recruiters get clientTerms but not commercial
  // Associates get publicTerms only
  return req;
}
```

---

## SECTION 8 — SOURCING LOCATION INTELLIGENCE

### Data Collected Per Deployment:
```
For each candidate selected and deployed:
  record: {
    trade: "Structural Welder",
    sourceCity: "Vishakhapatnam",
    sourceState: "Andhra Pradesh",
    submitted: date,
    interviewed: date,
    selected: boolean,
    deployed: boolean
  }
```

### Location Performance Score:
```
performanceScore = (selected/submitted) × (deployed/selected) × 100

Recommendation logic:
  For trade "Welder", country "UAE":
    → Sort sourcing locations by performanceScore DESC
    → Recommend top 3 cities for next campaign
    → Flag cities with <30% selection rate
```

### Validation Dataset — NMDC Camping:
- 14 trades, 14 Indian cities potential sources
- System should recommend: Vizag, Bhavnagar, Surat for welders (offshore hub cities)
- System should flag: metros (Mumbai, Delhi) for blue-collar — lower conversion

---

## SECTION 9 — PROJECT / CAMPAIGN / DEPARTMENT / ROLE STRUCTURE

### NMDC June 2026 — Validated Example:
```
Project: NMDC Energy Offshore Jun 2026
  └── Campaign: Batch 1 — South India Camping
        └── Department: Welding
              └── Role: Welder (qty: 49)
              └── Role: TIG Welder (qty: 39)
              └── Role: Welding Foreman (qty: 10)
        └── Department: Civil & Structural
              └── Role: Scaffolder (qty: 42)
              └── Role: Fabricator (qty: 98)
              └── Role: Fitter (qty: 89)
              └── Role: Rigging Foreman (qty: 8)
              └── Role: Fabrication Foreman (qty: 9)
              └── Role: Scaffolding Foreman (qty: 10)
        └── Department: Marine & Operations
              └── Role: Anchor Foreman (qty: 10)
              └── Role: Anchor Operator (qty: 15)
              └── Role: Radio Operator (qty: 10)
              └── Role: Winch Operator (qty: 1)
        └── Department: Painting & Finishing
              └── Role: Painting Foreman (qty: 10)
  
  Total: 400 positions | Priority: Welders (88 of 400 = 22%)
```

### CNCEC WEP — Validated Example:
```
Project: CNCEC WEP Overseas Oil & Gas
  └── Campaign: Management Track
        └── Department: Project Management
              └── Role: QA/QC Manager
              └── Role: Project Control Manager
              └── Role: Interface Manager
        └── Department: HSE
              └── Role: HSE Manager
              └── Role: HSE Engineer
              └── Role: HSE Officer
        └── Department: Procurement
              └── Role: Procurement Engineer
              └── Role: Material Control Engineer (Mech)
              └── Role: Material Control Engineer (E&I)
  [46 more roles across departments]
```

---

## SECTION 10 — RECRUITER & ASSOCIATE ASSIGNMENT LOGIC

### Recruiter Assignment:
```
Recruiter is assigned at Campaign level.
Recruiter sees: all candidates linked to their campaign's roles
Recruiter cannot see: other campaigns, commercial terms, other tenants

Assignment modes:
  1. FULL CAMPAIGN  — recruiter sees all departments in this campaign
  2. DEPARTMENT     — recruiter sees only their assigned departments
  3. ROLE           — recruiter sees only their assigned roles
```

### Associate Assignment:
```
Associate is an external sub-agent.
Associate receives one of:
  MODE 1: Entire Project brief (high trust)
  MODE 2: Department brief (specific dept)
  MODE 3: Role brief (specific roles only)
  MODE 4: Selected requirements PDF (minimum disclosure)

Associate NEVER sees:
  - Commercial terms
  - Other associates' assignments
  - Candidate contact details (until candidate is submitted to client)
  - Client direct contacts
```

---

## SECTION 11 — MIGRATION PATH TO FIREBASE SAAS

### Phase 1 (Now — GAS Bridge):
```
Storage:    Google Sheets (42-col Candidates, 15+ auxiliary sheets)
Auth:       GAS CacheService + _LoginSystem sheet
API:        GAS doGet/doPost → ContentService JSON
UI:         Lovable → fetch GAS URL
Logic:      All in GAS functions
```

### Phase 2 (Firebase Migration — When Ready):
```
Storage:    Firestore (collections defined above — no redesign needed)
Auth:       Firebase Auth + custom claims (role, tenantId)
API:        Cloud Functions → same JSON contract as GAS
UI:         Lovable → fetch Cloud Function URL (change 1 config line)
Logic:      Move GAS functions to Cloud Functions line-by-line
```

### Migration Guarantees:
```
1. Collection names match sheet names (Candidates, Requirements, JDs, ActivityLog)
2. Field names match column names (kaiNo, name, trade, score, verdict, stage)
3. API action names stay identical (action=candidates, action=requirements, etc.)
4. Token becomes Firebase ID token — same header, different issuer
5. Lovable changes: update BASE_URL + swap localStorage token for Firebase token
   Everything else stays identical.
```

### What NEVER changes on migration:
- Candidate schema (all 42 fields)
- KAI scoring logic
- Duplicate detection rules
- Stage/status workflow
- Commercial term visibility layers
- Activity log structure
- Taxonomy structure

---

## SECTION 12 — VALIDATION SUMMARY

| Rule | NMDC Test | CNCEC Test | Status |
|---|---|---|---|
| Candidate-first | Candidates exist before project | Candidates searched against roles | ✅ |
| Dual storage | Original JD PDF + parsed roles | Original Excel + parsed JDs | ✅ |
| Commercial privacy | USD 350/foreman hidden from candidates | AED hourly rates hidden from candidates | ✅ |
| Role hierarchy | Project→Campaign→Dept→Role | Project→Campaign→Dept→Role | ✅ |
| Duplicate detection | Passport→Mobile→Email→AI | Same | ✅ |
| Candidate locking | LOCKED after visa initiated | LOCKED after visa initiated | ✅ |
| Multi-project | Candidate for welding + scaffolding | Candidate for 2 CNCEC campaigns | ✅ |
| Location intelligence | South India sourcing for offshore | Track by city/state | ✅ |
| Firebase migration | All collections defined | All fields named | ✅ |

---

*Architecture version: 1.0 — Validated June 2026*
*Do not implement until approved.*
