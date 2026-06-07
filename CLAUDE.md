# KAI Recruitment OS — Project Memory

## Core Identity
KAI is NOT an ATS, CRM, or Resume Database.
KAI is a **GCC Recruitment Operating System** — converts manpower demand into successful overseas deployment.

## The Universal Intelligence Hierarchy
Everything in KAI must resolve into this hierarchy or it does not belong in the platform:

```
Industry
→ Sector
→ Department
→ Trade
→ Specialization
```

Every CV, JD, Requirement, Campaign, Submission, Deployment, Learning record and Forecast must map into this hierarchy. No exceptions.

## What KAI Is
- Trade Taxonomy Engine
- Candidate Scoring Engine
- JD Matching Engine
- Email Intelligence Engine
- Candidate Reply Processing
- Auto Reply System
- Recruiter Session System
- Dashboard Intelligence Layer
- SaaS Tenant Routing Foundation

## What KAI Is NOT (remove before SaaS)
- Old ATS thinking
- Flat trade lists
- Static candidate database
- Manual recruiter searching
- Separate disconnected modules

## The Permanent Architecture Test
If NMDC, GAS Arabian, ZAMIL, Al Arrab, Aramco Contractor, SABIC Contractor, NEOM Contractor, ADNOC Contractor, QatarEnergy Contractor or any future GCC client arrives, KAI must NOT need:
- New code
- New database
- New workflow
- New matching engine
- New pipeline
- New readiness model
- New recruiter model
- New associate model

Only: Client Requirement → Auto Classification → Requirement Creation → Industry Mapping → Trade Mapping → Candidate Discovery → Readiness Scoring → Submission Pipeline → Selection → Visa Process → Deployment → History Retained Forever.

## Candidate-First Architecture
**Candidate = the permanent asset. Not submission. Not job. Not recruiter.**

One Candidate Record (KAI Number) contains:
- Full history
- All CV versions
- All requirements matched
- All submissions
- All interviews
- All selections
- All deployments
- All countries worked
- All recruiters who touched
- All associates who sourced

Projects, Requirements, Clients = temporary references only.
All architecture decisions follow this rule.

## Role Architecture
- **Recruiter** = Requirement Manager → Match → Review → Assign → Submit
- **Associate** = Candidate Supply Network → Upload → Track → Follow Up → Earn Reputation
- **Agency** = Compliance Layer → RA Verification → eMigrate Validation → Deployment Authority
- **AI** = CV Parser → JD Parser → Trade Classifier → Matching Engine → Readiness Engine → Communication Engine → Intelligence Engine

## Dashboard Rule
Dashboard = Action Dashboard, NOT Data Dashboard.
Every row must answer: "What should recruiter do next?"
Never: "What data exists?"

## Final SaaS Tenant Architecture
```
Tenant → Agency → Recruiter → Associate → Candidate → Requirement → Submission → Deployment
```
Intelligence sits across all layers.

## Dual Storage Model
Every requirement creates two versions:
1. **Original Source** — PDF/Excel/Image/Email, stored as-is (print, audit, client reference)
2. **Structured Intelligence** — parsed, matched, analysed (Firestore)
Never use PDFs as the intelligence layer.

## Data Architecture (Firestore-First)
Every decision must answer: Firestore Collection? Cloud Function? Permission Model? API Contract? Migration Path?
If not defined — do not implement.

Collections follow:
```
Project → Campaigns → Departments → Roles → Candidates
```
Candidate participates in multiple projects. Locked only when: Offer Accepted AND Visa Initiated.

## Duplicate Management Priority
1. Passport  2. Mobile  3. Email  4. AI Similarity
Never create duplicates. Attach source history, submission history, project history.

## Collaboration Model
- Manager: consolidated project view
- Recruiter: assigned scope only
- Associate: receives Project / Department / Role / Selected Requirements (all 4 modes)

## Hiring Modes
Support all three: ONLINE INTERVIEW · CAMPING · HYBRID

## Lovable Rule
Lovable = UI skin only. Never becomes:
- System of Record
- Business Logic Layer
- Workflow / Matching / Permission Engine

Those belong to backend (GAS now → Firebase later).

## Screen Validation Rule
After every Lovable change: stop → screenshot → validate UI + workflow + permissions + data flow → only then continue.

## Phase 1 Scope
**Allowed:** Candidate DB, CV Parsing/Scoring, JD Parsing, Project/Campaign/Department/Role/Recruiter/Associate, Telegram Intake, Matching, Interview Tracking, Selection, Project Dashboard

**Not Allowed (future phases):** Visa OS, Medical OS, Deployment OS, Payroll, CRM, Accounting, Marketplace

## Firebase Migration Rule
Every module built today must migrate to Firebase Multi-Tenant SaaS without redesigning:
Collections · Permissions · Workflows · Taxonomy · Business Logic
Only the UI (Lovable) should change.

## Taxonomy (Always Evolving)
Every new project enriches: Roles, Skills, Certifications, Locations, Industries, Clients, Submission formats, Interview patterns, Deployment patterns.

## Location Intelligence
Track per role: Source City/State/Country × Submitted/Interviewed/Selected/Deployed
Use historical performance to recommend sourcing locations.

## GAS Bridge (Current Backend)
- SS_ID: `101iCo5lPpGOZc5CGGZA_kaYugbPHzRXQstl3WsRKBRE`
- Bridge URL: `https://script.google.com/macros/s/AKfycbxfNPL371bf8UF84bMz3E2i8drw4opVpWJMb24w2pW_p_og08_MwlJ5PyRqtaZPHv02Ng/exec`
- Master file: `KAI_API_Bridge_MASTER.gs` (9600+ lines, Sections 1–37)
- Token key in localStorage: `kai_session_token`
- Stage computed from verdict when col1 is blank/"Pending action"

## Do NOT
- Redesign KAI as a generic ATS
- Build Firebase now (design for it, build later)
- Build multi-tenancy now
- Show KI Number in the grid (drawer + search only)
- Show passport expiry in grid (drawer only)
- Touch existing GAS pipeline files
- Add features outside Phase 1 scope
- Build Dashboard V2, Intelligence UI, Admin UI, Associate UI polishing before go-live

