# KAI OS — Phase 1 Architecture v2.0
## Status: APPROVED with revisions — awaiting final approval

---

## REVISION LOG (v1 → v2)

| # | Revision | Applied |
|---|---|---|
| 1 | RESERVED candidates excluded from matching AND new submissions | ✅ |
| 2 | clientCode + projectCode added to all project entities | ✅ |
| 3 | candidateOwner, currentHandler, submittedBy added to CandidateSlots | ✅ |
| 4 | sourceType added to CandidateSlots | ✅ |
| 5 | sourcingLocations and campingLocations separated | ✅ |
| 6 | deploymentRate, selectionRate, interviewRate added to taxonomy | ✅ |
| 7 | Associates collection created | ✅ |
| 8 | RecruiterMetrics collection created | ✅ |
| 9 | ER Diagram | ✅ |
| 10 | Firestore Tree | ✅ |
| 11 | GAS-to-Firestore Mapping | ✅ |
| 12 | Candidate Lifecycle Diagram | ✅ |
| 13 | Recruiter Workflow Diagram | ✅ |
| 14 | Associate Workflow Diagram | ✅ |

---

## SECTION 1 — ENTITY RELATIONSHIP DIAGRAM

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   TENANT    │ 1──────M│   PROJECT    │ 1──────M │   CAMPAIGN   │
│─────────────│         │──────────────│         │──────────────│
│ tenantId    │         │ projectId    │         │ campaignId   │
│ name        │         │ projectCode  │         │ hiringMode   │
│ country     │         │ clientCode   │         │ sourcingLocs │
│ plan        │         │ client       │         │ campingLocs  │
└─────────────┘         │ name         │         │ targetCount  │
                        │ country      │         │ status       │
                        │ status       │         └──────┬───────┘
                        └──────────────┘                │ 1
                                                        │
                                                        M
                                               ┌──────────────────┐
                                               │   DEPARTMENT     │
                                               │──────────────────│
                                               │ deptId           │
                                               │ name             │
                                               │ headCount        │
                                               │ recruiterId      │
                                               └────────┬─────────┘
                                                        │ 1
                                                        │
                                                        M
┌─────────────────┐                           ┌──────────────────┐
│   CANDIDATE     │ 1──────────────────────M  │      ROLE        │
│─────────────────│   (via CandidateSlot)     │──────────────────│
│ candidateId     │                           │ roleId           │
│ kaiNo           │                           │ title            │
│ name            │                           │ trade            │
│ passportNo ─────┼──── dedup key 1           │ quantity         │
│ mobile ─────────┼──── dedup key 2           │ filled           │
│ email ───────────┼──── dedup key 3          │ jdId ────────────┼──┐
│ status          │                           │ status           │  │
│ candidateOwner  │                           └──────────────────┘  │
└────────┬────────┘                                                  │
         │ 1                                                         │
         │                                                           │
         M                                                           │
┌─────────────────────────────────────────────────────┐             │
│                  CANDIDATE_SLOT                     │             │
│─────────────────────────────────────────────────────│             │
│ slotId          candidateId         roleId          │             │
│ projectId       campaignId          deptId          │             │
│ slotStatus      sourceType          candidateOwner  │             │
│ currentHandler  submittedBy         addedBy         │             │
│ offerAcceptedDate  visaInitiatedDate  deployedDate  │             │
└─────────────────────────────────────────────────────┘             │
                                                                     │
┌─────────────────┐         ┌──────────────┐                        │
│      JD         │ ────────┤ ORIGINAL DOC │         ┌─────────────┘
│─────────────────│         │──────────────│         │
│ jdId            │         │ docId        │         │
│ roles[]         │         │ driveUrl     │    ┌────┴────────────┐
│ linkedProjectId │         │ contentHash  │    │      JD         │
└─────────────────┘         │ visibility   │    │ jdId            │
         │                  └──────────────┘    └─────────────────┘
         │ M
         │
┌────────┴────────┐         ┌──────────────────────────────────────┐
│  REQUIREMENT    │         │           REQUIREMENT                │
│─────────────────│         │ (3-layer commercial privacy)         │
│ reqId           │         │──────────────────────────────────────│
│ publicTerms     │         │ LAYER 1: commercial (ADMIN+MGR only) │
│ clientTerms     │         │ LAYER 2: clientTerms (MGR+RECRUITER) │
│ commercial ─────┼─────────│ LAYER 3: publicTerms (everyone)      │
└─────────────────┘         └──────────────────────────────────────┘

┌─────────────────┐         ┌──────────────────┐
│     USER        │         │    ASSOCIATE     │
│─────────────────│         │──────────────────│
│ userId          │         │ associateId      │
│ role            │         │ name             │
│ assignedProjs[] │         │ agency           │
│ assignedCamps[] │         │ assignedMode     │
└────────┬────────┘         │ assignedScope    │
         │                  └──────────────────┘
         │ 1
         M
┌─────────────────────┐     ┌──────────────────────┐
│  RECRUITER_METRICS  │     │   ACTIVITY_LOG       │
│─────────────────────│     │──────────────────────│
│ recruiterId         │     │ logId                │
│ totalSourced        │     │ candidateId          │
│ totalShortlisted    │     │ action               │
│ selectionRate       │     │ actor                │
│ avgResponseTime     │     │ timestamp            │
└─────────────────────┘     └──────────────────────┘
```

**Cardinality Summary:**
```
Tenant          1 ──── M    Projects
Project         1 ──── M    Campaigns
Campaign        1 ──── M    Departments
Department      1 ──── M    Roles
Candidate       M ──── M    Roles          (via CandidateSlot)
JD              1 ──── M    Roles
Requirement     1 ──── 1    JD
OriginalDoc     1 ──── 1    Requirement
User            M ──── M    Campaigns      (via assignment)
Associate       M ──── M    Roles          (via assignment)
Candidate       1 ──── M    ActivityLog
Recruiter       1 ──── 1    RecruiterMetrics
```

---

## SECTION 2 — UPDATED FIRESTORE COLLECTIONS

### 2.1 — Projects (revised)
```
/tenants/{tenantId}/projects/{projectId}
  projectId: string           // auto-generated
  projectCode: string         // AYE-PROJ-2026-001  ← NEW
  clientCode: string          // NMDC-001  ← NEW (client reference code)
  name: string
  client: string
  country: string
  sector: string
  status: enum                // ACTIVE | PAUSED | CLOSED | ARCHIVED
  phase: number
  totalPositions: number
  managerId: string
  createdAt: timestamp
  startDate: date
  targetDate: date
  notes: string
  originalSourceId: string
```

### 2.2 — Campaigns (revised)
```
/tenants/{tenantId}/projects/{projectId}/campaigns/{campaignId}
  campaignId: string
  projectCode: string         // ← NEW (inherited from project)
  clientCode: string          // ← NEW (inherited from project)
  name: string
  hiringMode: enum            // ONLINE_INTERVIEW | CAMPING | HYBRID
  
  sourcingLocations: array    // ← NEW (separated from camping)
    [{
      city: string,
      state: string,
      country: string,
      targetCount: number,
      historicalRate: number  // from taxonomy.locationPerformance
    }]
  
  campingLocations: array     // ← NEW (physical interview venues, CAMPING mode only)
    [{
      city: string,
      venue: string,
      date: date,
      allocatedCount: number,
      assignedRecruiterId: string
    }]
  
  targetCount: number
  selectedCount: number
  status: enum
  assignedRecruiters: string[]
  assignedAssociates: string[]
  createdAt: timestamp
```

### 2.3 — Departments (revised)
```
/tenants/{tenantId}/projects/{projectId}/campaigns/{campaignId}/departments/{deptId}
  deptId: string
  projectCode: string         // ← NEW
  clientCode: string          // ← NEW
  name: string
  headCount: number
  filled: number
  recruiterId: string
  associateIds: string[]
  status: enum
```

### 2.4 — Roles (revised)
```
/tenants/{tenantId}/projects/{projectId}/campaigns/{campaignId}/departments/{deptId}/roles/{roleId}
  roleId: string
  projectCode: string         // ← NEW
  clientCode: string          // ← NEW
  title: string
  trade: string
  quantity: number
  filled: number
  remaining: number
  minExperience: number
  minAge: number
  maxAge: number
  certifications: string[]
  gccPreference: boolean
  localTransferOK: boolean
  visitVisaOK: boolean
  urgency: enum
  jdId: string
  status: enum
```

### 2.5 — CandidateSlots (revised)
```
/tenants/{tenantId}/candidateSlots/{slotId}
  slotId: string
  candidateId: string
  roleId: string
  projectId: string
  campaignId: string
  deptId: string
  kaiNo: string
  
  -- OWNERSHIP CHAIN ← NEW --
  candidateOwner: string      // tenantId that owns the candidate record
  currentHandler: string      // userId currently working this candidate in this slot
  submittedBy: string         // userId who submitted to client
  
  -- SOURCE TRACKING ← NEW --
  sourceType: enum            // DIRECT | ASSOCIATE | TELEGRAM | MANUAL_UPLOAD |
                              // RECONTACT_CAMPAIGN | IMPORT | REFERRAL | WALK_IN
  associateId: string         // if sourceType = ASSOCIATE
  sourceRef: string           // email thread ID, campaign batch ID, etc.
  
  -- STATUS --
  slotStatus: enum            // SOURCED | SCREENED | SHORTLISTED | SUBMITTED |
                              // INTERVIEWED | SELECTED | OFFER_SENT | OFFER_ACCEPTED |
                              // VISA_INITIATED | DEPLOYED | REJECTED | WITHDRAWN
  
  -- DATES --
  addedAt: timestamp
  addedBy: string
  screenedAt: timestamp
  shortlistedAt: timestamp
  submittedAt: timestamp
  interviewDate: date
  interviewMode: enum
  interviewVenue: string
  interviewOutcome: string
  selectedAt: timestamp
  offerSentAt: timestamp
  offerAcceptedDate: date     // → triggers Candidate.status = RESERVED
  visaInitiatedDate: date     // → triggers Candidate.status = LOCKED
  deployedDate: date          // → triggers Candidate.status = DEPLOYED
  
  -- CLIENT --
  submittedToClient: boolean
  clientResponse: enum        // PENDING | ACCEPTED | REJECTED | SHORTLISTED
  protectedCvUrl: string
  
  -- NOTES --
  recruiterNotes: string
  recruiterAction: string
  updatedAt: timestamp
```

### 2.6 — Associates Collection ← NEW
```
/tenants/{tenantId}/associates/{associateId}
  associateId: string         // ASSOC-20260601-001
  name: string
  agencyName: string
  contactEmail: string
  contactMobile: string
  country: string
  city: string
  
  -- ASSIGNMENT --
  assignedMode: enum          // FULL_PROJECT | DEPARTMENT | ROLE | SELECTED_REQUIREMENTS
  assignedProjects: string[]
  assignedCampaigns: string[]
  assignedDepts: string[]
  assignedRoles: string[]
  
  -- PERFORMANCE --
  totalCandidatesSent: number
  totalShortlisted: number
  totalSelected: number
  totalDeployed: number
  passRate: number            // shortlisted / sent
  selectionRate: number       // selected / shortlisted
  deploymentRate: number      // deployed / selected
  avgScore: number            // avg KAI score of their candidates
  grade: enum                 // A | B+ | B | C (same as SAC model)
  
  -- ACCESS CONTROL --
  visibilityScope: object     // what they can see (publicTerms only, no commercial)
  active: boolean
  createdAt: timestamp
  lastActivity: timestamp
```

### 2.7 — RecruiterMetrics Collection ← NEW
```
/tenants/{tenantId}/recruiterMetrics/{recruiterId}
  recruiterId: string         // userId
  name: string
  
  -- VOLUME METRICS --
  totalSourced: number        // candidates added to any slot
  totalScreened: number
  totalShortlisted: number
  totalSubmitted: number
  totalInterviewed: number
  totalSelected: number
  totalDeployed: number
  
  -- RATE METRICS --
  screeningRate: number       // screened / sourced
  shortlistRate: number       // shortlisted / screened
  submissionRate: number      // submitted / shortlisted
  interviewRate: number       // ← NEW: interviewed / submitted
  selectionRate: number       // ← NEW: selected / interviewed
  deploymentRate: number      // ← NEW: deployed / selected
  overallConversion: number   // deployed / sourced
  
  -- QUALITY METRICS --
  avgCandidateScore: number
  avgResponseTimeDays: number // avg days from add to submission
  clientRejectionRate: number
  
  -- BY PROJECT --
  projectBreakdown: array     // [{projectId, projectCode, sourced, selected, deployed}]
  
  -- PERIOD --
  periodStart: date
  periodEnd: date
  updatedAt: timestamp
```

### 2.8 — Taxonomy (revised — with rates)
```
/tenants/{tenantId}/taxonomy/trades/{tradeId}
  canonical: string           // "Structural Welder"
  aliases: string[]
  sector: string
  certifications: string[]
  avgScore: number
  
  locationPerformance: map    // ← REVISED: keyed by city
    {
      "Vishakhapatnam": {
        submitted: number,
        interviewed: number,      // ← NEW
        selected: number,
        deployed: number,
        interviewRate: number,    // ← NEW: interviewed/submitted
        selectionRate: number,    // ← NEW: selected/interviewed
        deploymentRate: number,   // ← NEW: deployed/selected
        overallRate: number,      // deployed/submitted
        lastUpdated: timestamp
      }
    }
  
  campingPerformance: map     // ← NEW: separate from sourcing
    {
      "Mumbai NSDC Center": {
        date: date,
        targetCount: number,
        attended: number,
        selected: number,
        successRate: number
      }
    }
  
  lastUpdated: timestamp
```

---

## SECTION 3 — FIRESTORE TREE (COMPLETE)

```
/tenants
  /{tenantId}                         e.g. "aye-manpower"
    name: "Al Yousuf Manpower"
    plan: "GAS"
    
    /candidates
      /{candidateId}                  e.g. "AYE-KAI-2026-000001"
        kaiNo, name, passportNo, mobile, email
        trade, score, verdict, stage, status
        cvLink, top3Positions, missingFields
        candidateOwner, createdBy
        [all 42 fields]
    
    /projects
      /{projectId}                    e.g. "PROJ-20260601-NMDC-001"
        projectCode: "AYE-PROJ-2026-001"
        clientCode: "NMDC-001"
        name, client, country, status
        
        /campaigns
          /{campaignId}               e.g. "CAMP-NMDC-BATCH1"
            projectCode, clientCode
            hiringMode: "CAMPING"
            sourcingLocations: [{city, state, targetCount}]
            campingLocations: [{city, venue, date}]
            
            /departments
              /{deptId}               e.g. "DEPT-WELDING"
                name: "Welding"
                headCount: 98
                recruiterId
                
                /roles
                  /{roleId}           e.g. "ROLE-NMDC-WELDER"
                    title: "Welder"
                    trade: "Structural Welder"
                    quantity: 49
                    filled: 0
                    jdId: "JD-20260601-NMDC"
    
    /candidateSlots
      /{slotId}                       e.g. "SLOT-20260601-001"
        candidateId, roleId, projectId, campaignId
        candidateOwner, currentHandler, submittedBy
        sourceType: "DIRECT"
        slotStatus: "SHORTLISTED"
        offerAcceptedDate, visaInitiatedDate
    
    /requirements
      /{reqId}                        e.g. "REQ-20260517-0001"
        publicTerms: {positions, benefits, candidateFeeINR}
        clientTerms: {rotation, accommodation, salary}
        commercial: {agencyFee, clientPayment, successRatioKPI}
    
    /jds
      /{jdId}                         e.g. "JD-20260601-NMDC"
        client, roles[], totalPositions
        linkedProjectId, linkedReqId
    
    /originalDocuments
      /{docId}                        e.g. "DOC-20260601-001"
        fileName: "NMDC_Short_JD_June_2026.txt"
        driveUrl, contentHash
        visibilityLevel: "AGENCY_INTERNAL"
    
    /submissions
      /{subId}
        candidateIds[], roleId, projectId
        submittedBy, clientName
        fileUrl, clientResponse
    
    /associates
      /{associateId}                  e.g. "ASSOC-20260601-001"
        name, agencyName
        assignedMode, assignedRoles[]
        selectionRate, deploymentRate, grade
    
    /users
      /{userId}
        email, name
        role: "ADMIN|MANAGER|RECRUITER|ASSOCIATE|VIEWER"
        assignedProjects[], assignedCampaigns[]
    
    /recruiterMetrics
      /{recruiterId}
        totalSourced, totalDeployed
        interviewRate, selectionRate, deploymentRate
        projectBreakdown[]
    
    /activityLog
      /{logId}
        candidateId, kaiNo, action, actor
        timestamp, projectId, roleId
    
    /taxonomy
      /trades
        /{tradeId}
          canonical, aliases
          locationPerformance: {city: {rates}}
          campingPerformance: {venue: {rates}}
      /certifications
        /{certId}
          name, aliases, trades[]
      /locations
        /{locationId}
          city, state, country
          performance: {trade: {rates}}
```

---

## SECTION 4 — GAS-TO-FIRESTORE MAPPING

| GAS Sheet | Firestore Collection | Notes |
|---|---|---|
| `Candidates` (42 cols) | `/candidates` | Direct field mapping, kaiNo = doc ID |
| `_LoginSystem` | `/users` | Add role, assignedProjects |
| `_Requirements` | `/requirements` (layers 2+3) | Split publicTerms / clientTerms |
| `_CommercialTerms` (NEW) | `/requirements/{id}/commercial` | Layer 1, ADMIN+MGR only |
| `_JD_Repository` | `/jds` | Direct mapping |
| `_JDs` | `/jds` | Merge with _JD_Repository |
| `_ActivityLog` | `/activityLog` | Direct mapping |
| `_ManualUpload` | Upload queue → `/candidates` | Staging only, not persisted |
| `_Projects` | `/projects` | Add projectCode, clientCode |
| `_CandidateSlots` (NEW) | `/candidateSlots` | New link table |
| `_Departments` (NEW) | `/campaigns/{id}/departments` | New |
| `_Roles` (NEW) | `/departments/{id}/roles` | New |
| `_ClientSubs` | `/submissions` | Add submittedBy |
| `_JD_Matches` | `/candidateSlots` | Merge into slot record |
| `_Timeline` | embedded in `/candidates` | Keep in candidate.timeline array |
| `Archive` | `/candidates` (status=ARCHIVED) | Filter, not separate collection |
| `Rejected` | `/candidates` (status=REJECTED) | Filter, not separate collection |
| `Taxonomy` | `/taxonomy/trades` | Expand with locationPerformance |
| `_KAI_Knowledge` | `/taxonomy` enrichment | Feed into trade/location performance |
| `_LocationPerformance` (NEW) | `/taxonomy/locations` | Separate from trades |
| `Logs` | `/activityLog` | Merge |
| `_Errors` | monitoring service | Not in Firestore |
| `_Meta` | source tracking in `/candidates` | Embed in candidate.sourceThread |
| `_RecruiterMetrics` (NEW) | `/recruiterMetrics` | New |
| `_Associates` (NEW) | `/associates` | New |

**Column → Field mapping for Candidates:**
```
Col 1  stage            → stage
Col 2  applicationDate  → applicationDate
Col 3  nationality      → nationality
Col 4  name             → name
Col 5  mobile           → mobile           (dedup key 2)
Col 6  email            → email            (dedup key 3)
Col 7  education        → educationRaw
Col 8  positionApplied  → positionApplied
Col 9  trade            → trade
Col 10 industry         → industry
Col 11 experience       → experience
Col 12 gulfExp          → gulfExp
Col 13 dob              → dob
Col 14 age              → age              (computed)
Col 15 verdict          → verdict
Col 16 flags            → flags
Col 17 score            → score
Col 18 scoreBreakdown   → scoreBreakdown
Col 19 recommendedRoles → recommendedRoles
Col 20 kaiAssessment    → kaiAssessment    (drawer only, never grid)
Col 21 recruiterAction  → recruiterAction
Col 22 cvLink           → cvLink
Col 23 notes            → notes
Col 24 _active          → active
Col 25 kaiNo            → kaiNo            (document ID)
Col 26 currentLocation  → currentLocation
Col 27 empStatus        → empStatus
Col 28 candidateState   → candidateState
Col 29 mobility         → gccMobility
Col 30 passportExpiry   → passportExpiry
Col 31 ecrStatus        → ecrStatus        (dedup key 1 companion)
Col 32 noticeDays       → noticeDays
Col 33 medicalStatus    → medicalStatus
Col 34 deployScore      → deployScore
Col 35 missingFields    → missingFields
Col 36 lastContact      → lastContact
Col 37 reqMatch         → reqMatchIds
Col 38 timeline         → timeline
Col 39 educationEnum    → educationLevel
Col 40 techReview       → techReview
Col 41 reviewedBy       → reviewedBy
Col 42 top3Positions    → top3Positions
       passportNo       → passportNo       (extracted from kaiAssessment)
```

**New fields added on Firebase migration (not in GAS):**
```
status          ACTIVE | RESERVED | LOCKED | DEPLOYED | ARCHIVED
candidateOwner  tenantId
createdBy       userId
updatedAt       timestamp
```

---

## SECTION 5 — CANDIDATE LIFECYCLE DIAGRAM

```
                              ┌─────────────────────────┐
                              │      ENTRY POINTS        │
                              │  Gmail → KAI Pipeline    │
                              │  Manual Upload           │
                              │  Telegram Intake         │
                              │  Recontact Campaign      │
                              │  Associate Submission    │
                              │  Walk-in / Import        │
                              └────────────┬────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │    DUPLICATE CHECK       │◄── Runs on every entry
                              │  1. Passport match?      │
                              │  2. Mobile match?        │
                              │  3. Email match?         │
                              │  4. AI similarity?       │
                              └────────────┬────────────┘
                                           │
                          ┌────────────────┼──────────────────┐
                          │                │                  │
                          ▼                ▼                  ▼
               ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
               │     NEW      │  │   DUPLICATE  │  │   NEAR-MATCH     │
               │  Create      │  │   MERGE      │  │  Flag for human  │
               │  candidate   │  │  Attach to   │  │  review          │
               └──────┬───────┘  │  existing    │  └──────────────────┘
                      │          └──────────────┘
                      │
                      ▼
            ┌──────────────────────────────────────────────┐
            │              STATUS: ACTIVE                   │
            │   Available for matching, sourcing, linking  │
            │   May appear in multiple project slots       │
            └───────────────────┬──────────────────────────┘
                                │
            ┌───────────────────┼─────────────────────────────┐
            │                   │                             │
            ▼                   ▼                             ▼
   ┌─────────────────┐ ┌───────────────────┐     ┌──────────────────┐
   │  Slot: SOURCED  │ │ Slot: SHORTLISTED │     │  Slot: REJECTED  │
   │  Added to role  │ │ KAI score > 55    │     │  Score < 35 OR   │
   │  by recruiter   │ │ Recruiter approves│     │  Manual reject   │
   └────────┬────────┘ └────────┬──────────┘     └──────────────────┘
            │                   │
            ▼                   ▼
   ┌─────────────────┐ ┌───────────────────┐
   │ Slot: SUBMITTED │ │ Slot: INTERVIEWED │
   │ Protected CV    │ │ Interview outcome │
   │ sent to client  │ │ recorded          │
   └────────┬────────┘ └────────┬──────────┘
            │                   │
            ▼                   ▼
   ┌─────────────────┐ ┌───────────────────┐
   │ Client Response │ │  Slot: SELECTED   │
   │ ACCEPTED /      │ │  Client approves  │
   │ REJECTED        │ │  candidate        │
   └────────┬────────┘ └────────┬──────────┘
            │                   │
            ▼                   ▼
                       ┌───────────────────────┐
                       │   Slot: OFFER_SENT    │
                       │   Offer letter issued  │
                       └──────────┬────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
                    ▼                            ▼
          ┌──────────────────────┐    ┌──────────────────────┐
          │  Slot: OFFER_ACCEPTED│    │  Slot: WITHDRAWN     │
          │  ─────────────────── │    │  Candidate declines  │
          │  Candidate.status    │    │  → back to ACTIVE    │
          │  = RESERVED          │    └──────────────────────┘
          │                      │
          │  ⚠ EXCLUDED FROM:    │
          │  • New matching      │
          │  • New submissions   │
          │  • Associate briefs  │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Slot: VISA_INITIATED │
          │  ─────────────────── │
          │  Candidate.status    │
          │  = LOCKED            │
          │                      │
          │  ⛔ EXCLUDED FROM:   │
          │  • All matching      │
          │  • All submissions   │
          │  • All search results│
          │    (except history)  │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   Slot: DEPLOYED     │
          │  ─────────────────── │
          │  Candidate.status    │
          │  = DEPLOYED          │
          │                      │
          │  Record preserved    │
          │  for future sourcing │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  CONTRACT ENDS       │
          │  ─────────────────── │
          │  Candidate.status    │
          │  = ACTIVE            │
          │  (returns to pool)   │
          └──────────────────────┘

PARALLEL PATHS (candidate can be in multiple slots simultaneously):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ACTIVE candidate → Slot A (NMDC Welder) + Slot B (CNCEC Welder) simultaneously
  RESERVED candidate → Slot A confirmed → Slot B must be WITHDRAWN automatically
  LOCKED candidate → All other slots auto-WITHDRAWN, removed from all search
```

---

## SECTION 6 — RECRUITER WORKFLOW DIAGRAM

```
RECRUITER DAILY WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━

START OF DAY
     │
     ▼
┌────────────────────────────────────────┐
│  1. DASHBOARD — Morning Briefing       │
│  ─────────────────────────────────────│
│  • New candidates overnight (Gmail)   │
│  • Pending actions (call/screen)      │
│  • Interview schedule today           │
│  • Offers awaiting response           │
│  • Slots near deadline                │
└────────────────────┬───────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌──────────────────┐   ┌─────────────────────────┐
│  2. SCREEN QUEUE │   │  3. ASSIGNED CAMPAIGNS   │
│  ───────────────│   │  ─────────────────────── │
│  New candidates  │   │  View roles & open slots │
│  waiting review  │   │  See sourcing locations  │
│  Score < 35 ?    │   │  Track filled vs target  │
│    → Reject      │   └────────────┬────────────┘
│  Score 35-54 ?   │                │
│    → Needs Review│                ▼
│  Score 55-74 ?   │   ┌─────────────────────────┐
│    → Good Match  │   │  4. CANDIDATE MATCHING   │
│  Score 75+ ?     │   │  ─────────────────────── │
│    → Strong Match│   │  Search by trade/score   │
└────────┬─────────┘   │  Filter: ACTIVE only     │
         │             │  (RESERVED & LOCKED       │
         ▼             │   automatically excluded) │
┌──────────────────┐   │  Review KAI assessment   │
│  5. CANDIDATE    │   │  Add to slot: SOURCED    │
│     DRAWER       │◄──┘  ───────────────────────│
│  ───────────────│      Send to screening queue  │
│  Full profile    │   └─────────────────────────┘
│  KAI assessment  │
│  Contact history │
│  Actions:        │
│   📞 Call        │
│   💬 WhatsApp    │
│   ✉ Email        │
│   ⭐ Shortlist   │
│   📋 Req Docs    │
│   📤 Submit      │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  6. SUBMISSION WORKFLOW                   │
│  ───────────────────────────────────────│
│  Select candidates for client            │
│  System auto-generates protected CV PDF  │
│  (watermarked, commercial terms stripped)│
│  Submit to client portal                 │
│  Record: submittedBy, submittedAt        │
│  Await client response                   │
└────────────────────┬─────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌──────────────────┐   ┌─────────────────────┐
│  CLIENT: ACCEPT  │   │   CLIENT: REJECT     │
│  ──────────────  │   │  ──────────────────  │
│  → Slot:SELECTED │   │  Record reason       │
│  → Issue offer   │   │  → back to SOURCED   │
│  → Track response│   │  → find replacement  │
└────────┬─────────┘   └─────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  7. POST-SELECTION                        │
│  ───────────────────────────────────────│
│  Offer accepted → mark RESERVED          │
│  Coordinate docs: passport, medical      │
│  Visa initiated → mark LOCKED            │
│  Track deployment date                   │
│  Record deployed → update location KPIs  │
└──────────────────────────────────────────┘

RECRUITER VISIBILITY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Can see: Candidate profiles, scores, assessments
✅ Can see: Client requirements (Layer 2 — clientTerms)
✅ Can see: Position details, quantities, benefits
✅ Can see: Their assigned campaigns, departments, roles
⛔ Cannot see: Commercial terms (agency fees, client payment rates)
⛔ Cannot see: Other recruiters' assigned campaigns
⛔ Cannot see: LOCKED candidates in search/match results
```

---

## SECTION 7 — ASSOCIATE WORKFLOW DIAGRAM

```
ASSOCIATE (SUB-AGENT) WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ONBOARDING
     │
     ▼
┌────────────────────────────────────────────────┐
│  MANAGER assigns Associate to scope            │
│  ──────────────────────────────────────────── │
│  MODE 1: Full Project                          │
│    → Associate sees all departments + roles    │
│    → Highest trust level                       │
│                                                │
│  MODE 2: Department                            │
│    → Associate sees only assigned dept         │
│    → Can source for any role in that dept      │
│                                                │
│  MODE 3: Specific Roles                        │
│    → Associate sees only listed roles          │
│    → Standard sub-agent arrangement            │
│                                                │
│  MODE 4: Selected Requirements PDF             │
│    → Receives sanitized PDF brief              │
│    → Minimum disclosure, maximum privacy       │
│    → No system access                          │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│  WHAT ASSOCIATE RECEIVES (always Layer 3 only) │
│  ──────────────────────────────────────────── │
│  ✅ Position titles and quantities             │
│  ✅ Country and work type (offshore/onshore)   │
│  ✅ Minimum experience requirements            │
│  ✅ Required certifications                    │
│  ✅ Candidate benefits (air ticket, medical)   │
│  ✅ Candidate fee (INR 35,400 per govt rules)  │
│                                                │
│  ⛔ NEVER RECEIVES:                            │
│  ⛔ Agency commercial rates (USD 350/foreman)  │
│  ⛔ Client hourly rate schedule (AED rates)    │
│  ⛔ Performance/vendor terms                   │
│  ⛔ Other associates' assignments              │
│  ⛔ Client direct contacts                     │
│  ⛔ Candidate contact details (until submitted)│
└────────────────────┬───────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│  ASSOCIATE SOURCING CYCLE                      │
│  ──────────────────────────────────────────── │
│                                                │
│  Associate sources candidates independently    │
│            │                                   │
│            ▼                                   │
│  Submits candidate profiles to KAI             │
│  (via: email / upload / Telegram / portal)     │
│            │                                   │
│            ▼                                   │
│  KAI records: sourceType = "ASSOCIATE"         │
│               associateId = ASSOC-XXX          │
│            │                                   │
│            ▼                                   │
│  KAI runs duplicate check                      │
│  → Duplicate: attached to existing candidate   │
│  → New: creates candidate record               │
│            │                                   │
│            ▼                                   │
│  KAI runs scoring (score, tier, verdict)       │
│            │                                   │
│            ▼                                   │
│  Slot created: sourceType=ASSOCIATE            │
│  Recruiter reviews and takes over              │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│  ASSOCIATE PERFORMANCE TRACKING                │
│  ──────────────────────────────────────────── │
│                                                │
│  Every candidate submitted by associate:       │
│  → RecordedIn: /associates/{id}               │
│  → Counted in: totalCandidatesSent            │
│                                                │
│  On shortlist: shortlisted++                   │
│  On selection: selected++, selectionRate calc  │
│  On deployment: deployed++, deploymentRate calc│
│                                                │
│  Monthly grade computed:                       │
│  A  = deploymentRate ≥ 40%                     │
│  B+ = deploymentRate 30-39%                    │
│  B  = deploymentRate 20-29%                    │
│  C  = deploymentRate < 20%                     │
│                                                │
│  Grade determines:                             │
│  • Priority in future campaign assignments     │
│  • Volume of roles allocated                   │
│  • Payment terms (if commission model)         │
└────────────────────────────────────────────────┘

ASSOCIATE VISIBILITY BY MODE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 1 (Full Project):   Roles in all departments  | Layer 3 terms
MODE 2 (Department):     Roles in assigned dept    | Layer 3 terms
MODE 3 (Specific Roles): Only listed roles         | Layer 3 terms
MODE 4 (PDF Brief):      No system access          | Sanitized PDF
```

---

## SECTION 8 — CANDIDATE STATUS — MATCHING EXCLUSION RULES

```
Status          Matching    New Submissions   Search Results   History
─────────────   ─────────   ───────────────   ──────────────   ───────
ACTIVE          ✅ YES      ✅ YES            ✅ YES           ✅ YES
RESERVED        ⛔ NO       ⛔ NO             ✅ YES*          ✅ YES
LOCKED          ⛔ NO       ⛔ NO             ⛔ NO**          ✅ YES
DEPLOYED        ⛔ NO       ⛔ NO             ✅ YES*          ✅ YES
REJECTED        ⛔ NO       ⛔ NO             ✅ YES*          ✅ YES
ARCHIVED        ⛔ NO       ⛔ NO             ⛔ NO            ✅ YES

* Appears with status badge — informational only, no action possible
** Excluded entirely from search to protect privacy during visa processing

RESERVED auto-withdrawal rule:
  When Candidate.status → RESERVED:
    All other CandidateSlots for this candidate WHERE slotStatus ∈
    [SOURCED, SCREENED, SHORTLISTED] → set slotStatus = WITHDRAWN
    Notify: currentHandler of each withdrawn slot
```

---

## SECTION 9 — SOURCE TRACKING WORKFLOW

```
sourceType Values and Entry Points:
────────────────────────────────────────────────────────────────────────
DIRECT              → Gmail CV submission to ai@alyousufent.com
                      KAI pipeline auto-processes
                      
ASSOCIATE           → Submitted by sub-agent (associateId recorded)
                      Performance tracked in /associates

TELEGRAM            → Candidate submits via Telegram bot
                      sourceRef = telegram messageId

MANUAL_UPLOAD       → Recruiter uploads CV via dashboard
                      sourceRef = uploadId from _ManualUpload

RECONTACT_CAMPAIGN  → From KAI-Recontact-Campaign (67,781 legacy CVs)
                      sourceRef = batch date / campaign ID

IMPORT              → Bulk import from Excel/CSV
                      sourceRef = importJobId

REFERRAL            → Referred by existing candidate or employee
                      sourceRef = referring candidateId

WALK_IN             → Candidate appears in person at camping
                      sourceRef = campingLocationId + date

────────────────────────────────────────────────────────────────────────
All sourceTypes → recorded in CandidateSlot.sourceType
Associate sources → additionally recorded in /associates/{id} performance
Location sources → feed /taxonomy/locations performance tracking
```

---

## SECTION 10 — APPROVAL CHECKLIST

Before any implementation begins, confirm:

- [ ] Candidate exclusion rules for RESERVED status are correct
- [ ] clientCode format agreed (e.g. NMDC-001 or client-defined)
- [ ] projectCode format agreed (e.g. AYE-PROJ-2026-001)
- [ ] Associate grading thresholds (A/B+/B/C) are correct
- [ ] Recruiter metrics period (monthly vs rolling 90 days)
- [ ] sourcingLocations vs campingLocations separation is correct
- [ ] 4 hiring modes are sufficient (or add more)
- [ ] Commercial term 3-layer visibility model is approved
- [ ] GAS new sheets (_CommercialTerms, _CandidateSlots, _Departments, _Roles) approved
- [ ] Firestore collection structure approved
- [ ] Migration path approved

---

*Architecture v2.0 — Revised per 14-point approval directive*
*Validated: NMDC Energy Jun 2026 (400 positions) · CNCEC WEP (47 roles) · Al Yousuf 5,766 candidates*
*No implementation until approval received.*
