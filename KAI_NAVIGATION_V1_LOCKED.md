# KAI Recruitment OS — Navigation & Ownership Architecture V1 (LOCKED)

## The One Question Test
> "Which module owns this?"
> If the answer is unclear, the feature is being added to the wrong place.

## Ownership Map (No Overlap Permitted)

| Module | Owns |
|--------|------|
| Dashboard | Nothing — aggregates only |
| Requirements | Demand |
| Campaigns | Projects |
| Candidates | Profiles |
| Pipeline | Status |
| Associates | Supply Network |
| KAI Intelligence | Learning |
| Admin & Settings | Configuration |

---

## 1. DASHBOARD
**Owner:** Manager / Operations Head

**Purpose:** Operational pulse. Reads everything. Owns nothing.

**Displays:**
- Active Requirements / Urgent Requirements
- Candidates Ready / Submitted Today / Selected / Mobilizing / Deployed
- Activity Feed (last 24hrs across all recruiters)
- Alerts (stale requirements, overdue submissions, expiring documents)
- Management Attention Items

**Rule:** Dashboard never creates, edits, or owns records. Aggregates only.

---

## 2. LEADS
**Owner:** Recruiter

**Purpose:** Capture raw inquiries before they become candidates.

**Lifecycle:**
```
New Lead → Contacted → CV Received → Converted to Candidate
                                   OR
                                   Rejected
```

**Rules:**
- No KI Number
- No KAI Assessment
- No Candidate Profile
- No Pipeline Status
- Candidate record created ONLY after CV is received and parsed

---

## 3. REQUIREMENTS
**Owner:** Recruiter + Manager

**Purpose:** Manage client demand.

**Contains:** Open | Urgent | On Hold | Closed

**Requirement Detail:**
```
Command Center
 ├─ Supply Health (Ready / Revalidation / Expired)
 ├─ Fill Probability
 ├─ Match Panel (STRONG / GOOD / POSSIBLE)
 ├─ Assigned Candidates
 ├─ Submission Actions
 └─ Timeline
```

**Rule:** Requirements own demand. Requirements do NOT own candidate status.

---

## 4. CAMPAIGNS
**Owner:** Manager

**Purpose:** Project war room.

**Hierarchy:**
```
Client → Project → Department → Requirement

Example:
GAS Arabian Services → Saudi Shutdown 2026 → Mechanical → Pipe Fitters
```

**Campaign KPIs:** Required | Submitted | Selected | Mobilized | Deployed

**Rule:** Campaigns aggregate project performance. Campaigns do NOT own candidate records.

---

## 5. CANDIDATES
**Owner:** Recruiter

**Purpose:** Recruiter working desk.

**Contains:** Search · Assessment · CV Management · Contact Actions · Requirement Assignment

**Candidate Grid V1 (locked):**
```
1. Stage          2. Candidate       3. Location      4. Education
5. Experience     6. Top 3 Positions 7. Trade/Skills  8. Readiness
9. GCC Match      10. CV             11. Contact      12. Actions
```

**Rule:** Candidates display Pipeline status. Candidates NEVER own Pipeline status.

---

## 6. PIPELINE
**Owner:** Recruiter + Operations

**Purpose:** Single Source of Truth for all status.

**Lifecycle:**
```
Added → Submitted → Interviewed → Selected → Medical → Visa → Travel → Deployed
```

**Status Ownership:**
```
Pipeline      → WRITES status
Requirements  → READS status
Candidates    → READS status
Campaigns     → READS status
Dashboard     → READS status
Intelligence  → READS status
```

**Rule:** ONLY Pipeline updates status. Every other module reads from Pipeline.

---

## 7. ASSOCIATES
**Owner:** Associate Coordinator / Manager

**Purpose:** Supply network management.

**Associate Profile Contains:** Capacity · Coverage · Trade Specialization · Region · Performance

**SAC Performance Sub-tab:**
- Assigned / Arranged / Submitted / Selected / Travelled
- Trade Performance · Country Performance · Conversion Rates · Reliability Scores

**Rule:** Associates represent manpower supply capability. Associates do NOT own candidate status.

---

## 8. KAI INTELLIGENCE
**Owner:** Manager / Director

**Purpose:** Read-only intelligence layer.

**Contains:**
- Learning (Country × Trade conversion rates)
- Recruiter Scoreboard (Primary=Selected | Operational=Mobilized | Business=Completed Mobilization)
- Revenue & Pipeline
- Historical Analytics
- Deployment Analytics
- Lead Analytics
- Market Intelligence *(locked — future)*

**Rules:**
- No operational actions
- No status changes
- No candidate edits
- Reads from all modules. Writes nowhere.

**Role Gate:** ASSOCIATE=none | RECRUITER=Learning only | MANAGER/ADMIN=full

---

## 9. ADMIN & SETTINGS
**Owner:** Admin only

**Purpose:** System governance and configuration.

**Contains:**
- Users & Roles · Permissions · Recruiters · Associates
- Taxonomy: Trade Lists · Skill Lists · Certification Lists · Country Lists
- CV Parsing Controls · Email Controls · WhatsApp Templates
- Audit Logs · System Controls · API Settings

**Rule:** No recruitment operations occur here. Admin controls configuration only.

---

## Core Governance Rules

```
Dashboard         =  Reads Everything
Requirements      =  Own Demand
Campaigns         =  Own Projects
Candidates        =  Own Profiles
Pipeline          =  Owns Status          ← most important
Associates        =  Own Supply Network
KAI Intelligence  =  Owns Learning
Admin             =  Owns Configuration
```

**No module may duplicate ownership of another module's responsibility.**

---

## Scale Target
Designed to support without navigation redesign:
- 10,000 candidates
- 100 recruiters
- 1,000 associates
- 100,000 JDs
- Multi-country GCC operations
