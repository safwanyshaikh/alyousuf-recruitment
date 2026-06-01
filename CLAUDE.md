# KAI Recruitment OS — Project Memory

## Core Identity
KAI is NOT an ATS, CRM, or Resume Database.
KAI is a **GCC Recruitment Operating System** — converts manpower demand into successful overseas deployment.

## Candidate-First Architecture
- Candidate = permanent master asset
- Projects, Requirements, Clients = temporary references
- All architecture decisions follow this rule

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
- Bridge URL: `https://script.google.com/macros/s/AKfycbykwLnVJW8ukP_ibPZ36cfsKrUxZJ7uIcWh5Eksz4JMLtlxG73UBazJ6T1HV_KleNLrEQ/exec`
- Master file: `KAI_API_Bridge_MASTER.gs` (1134 lines, all Sprints 1–7)
- Token key in localStorage: `kai_session_token`
- Stage computed from verdict when col1 is blank/"Pending action"

## Do NOT
- Redesign KAI as a generic ATS
- Build Firebase now (design for it, build later)
- Build multi-tenancy now
- Show KI Number in the grid (drawer + search only)
- Show passport expiry in grid (drawer only)
- Touch existing GAS pipeline files
