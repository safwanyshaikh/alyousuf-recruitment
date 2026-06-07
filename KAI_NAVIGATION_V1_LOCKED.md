# KAI Recruitment OS — Navigation Architecture V1 (LOCKED)

## Final Structure: 9 Tabs

```
1  Dashboard
2  Leads
3  Requirements
4  Campaigns
5  Candidates
6  Pipeline
7  Associates
8  KAI Intelligence
9  Admin & Settings
```

Designed to support: 10,000 candidates · 100 recruiters · 1,000 associates · 100,000 JDs · multi-country GCC operations — without navigation redesign.

---

## 1. DASHBOARD
**Owner:** Manager / Operations Head
**Question:** What needs my attention right now?

```
Dashboard
 ├─ Summary Cards: Active Requirements | Urgent | Candidates Ready | Submitted | Selected | Mobilizing | Deployed
 ├─ Alerts: Stale requirements | Overdue submissions | Expiring documents
 ├─ Activity Feed: Last 24hrs across all recruiters
 └─ Quick Nav: Jump to urgent requirement / candidate / pipeline action
```

Rules:
- Pure operational pulse. No workflow ownership.
- Displays status. Never owns status.
- Dashboard reads from Pipeline (single source of truth).

---

## 2. LEADS
**Owner:** Recruiter / Front Desk
**Question:** Who came in today and what do they want?

```
Leads
 ├─ Lead List (New | CV Received | Converted | Rejected)
 ├─ Lead Detail
 │    ├─ Contact Info
 │    ├─ Trade Interest
 │    ├─ Source (Walk-in / Call / WhatsApp / Referral / Email)
 │    └─ Timeline
 └─ Convert to Candidate (triggers CV parse → KI number assigned)
```

Rules:
- Lead = raw inquiry before CV assessment. No KI number. No match score.
- When CV received → parse → auto-promote to Candidate profile.
- Until promoted → stays as Lead only. Never appears in Candidates grid.
- A recruiter may process 100 leads/day. Separate from Dashboard intentionally.
- Source of Lead always recorded (Associate / Walk-in / Campaign / Referral).

---

## 3. REQUIREMENTS
**Owner:** Recruiter + Manager
**Question:** What does the client need and can we fill it?

```
Requirements
 ├─ Requirements List (Active | Urgent | On Hold | Closed | Archived)
 └─ Requirement Detail
      ├─ Command Center   ← fill probability, supply health, freshness
      ├─ Matches          ← STRONG / GOOD / POSSIBLE candidates
      ├─ Assigned         ← candidates added to this requirement
      ├─ Submission       ← submit to client workflow
      └─ Timeline         ← full activity history
```

Rules:
- Command Center exists ONLY inside a Requirement. Not a standalone nav item.
- Requirements display Pipeline status. Requirements do NOT own status.
- JD Repository lives here (attach JD to requirement).

---

## 4. CAMPAIGNS
**Owner:** Manager
**Question:** How is this project tracking overall?

```
Campaigns
 └─ Campaign (e.g. GAS Arabian Services — Saudi Shutdown 2026)
      ├─ Client
      ├─ Project
      ├─ Departments
      │    ├─ Mechanical
      │    │    └─ Requirements: Pipe Fitter, Welder, Fitter Helper
      │    ├─ Electrical
      │    │    └─ Requirements: Electrician, Instrument Technician
      │    └─ Civil
      │         └─ Requirements: Mason, Shuttering Carpenter
      ├─ Trades Summary
      ├─ Hiring Mode: Online Interview / Camping / Hybrid
      └─ Campaign KPIs: Required vs Submitted vs Selected vs Deployed
```

Rules:
- Campaign = war room for one client project.
- Campaign does not own candidate records. Reads from Pipeline.
- A requirement can only belong to one campaign.
- Campaigns link to Associates (who is supplying for this campaign).

---

## 5. CANDIDATES
**Owner:** Recruiter
**Question:** Who can I deploy for this requirement?

```
Candidates
 ├─ Grid (V1 locked — 12 columns)
 ├─ Global Search (name/passport/mobile/trade/KI/campaign/associate)
 ├─ Filters (always visible: stage/nationality/trade/education/location/readiness/GCC match)
 └─ Candidate Drawer
      ├─ Profile
      ├─ Assessment
      ├─ Documents
      ├─ History
      └─ Notes
```

Rules:
- Candidates display Pipeline status. Candidates do NOT own status.
- Only Pipeline owns movement (Added → Submitted → Selected → Deployed).
- No KI Number in grid (drawer only). No passport expiry in grid (drawer only).

---

## 6. PIPELINE
**Owner:** Recruiter + Operations
**Question:** Where is every candidate in the process?

```
Pipeline (SINGLE SOURCE OF TRUTH for all status)
 └─ Slot: Candidate × Requirement
      ├─ Added
      ├─ Submitted
      ├─ Interview Scheduled
      ├─ Selected
      ├─ Medical Pending
      ├─ Visa Processing
      ├─ Travel Ready
      └─ Deployed
```

Rules:
- ONLY Pipeline writes status. Requirements and Candidates only READ from Pipeline.
- Every status change is logged with timestamp, actor, and reason.
- No other module sets candidate stage — Pipeline owns it exclusively.
- Bulk operations: bulk submit, bulk status update, bulk document request.
- Interview modes: Camping / Online / Hybrid — each with its own scheduling flow.

---

## 7. ASSOCIATES
**Owner:** Manager / Associate Coordinator
**Question:** Who is bringing quality supply and from where?

```
Associates
 ├─ Associate List
 ├─ Associate Detail
 │    ├─ Profile (company, contact, region, trade specialization)
 │    ├─ Capacity Commitments (per requirement)
 │    ├─ Active Leads
 │    └─ Performance History
 └─ SAC Performance (sub-tab)
      ├─ Conversion Rate by Associate
      ├─ Trade Affinity (which associate is best for which trade)
      ├─ Country Performance (Saudi vs UAE vs Qatar sourcing quality)
      └─ Match Audit (associate-sourced vs direct candidates)
```

Rules:
- Associates bring Leads. Leads become Candidates. Pipeline tracks movement.
- SAC = Source / Associate / Campaign performance analytics.
- Associate identity never shown as phone number (assocDisplayName_ rule).

---

## 8. KAI INTELLIGENCE
**Owner:** Manager / Director
**Question:** What has KAI learned and what does it predict?

```
KAI Intelligence (absorbs Reports completely — Reports nav removed)
 ├─ Learning          ← Country × Trade conversion rates (trusted vs default)
 ├─ Recruiter Scoreboard ← Primary=Selected | Operational=Mobilized | Business=Completed Mobilization
 ├─ Revenue & Pipeline   ← Placement counts + projected revenue
 ├─ Historical Analytics ← Deployment history by client/country/trade/month
 ├─ Deployment Analytics ← Fill rates, time-to-deploy, source performance
 ├─ Lead Analytics       ← Lead conversion funnel by source/associate/trade
 └─ Market Intelligence  ← LOCKED (future: demand trends, salary benchmarks, hard-to-fill trades)
```

Rules:
- READ ONLY. No create, no edit, no delete.
- Success = Completed Mobilization (not Selected, not Submitted).
- Reports navigation item removed entirely — absorbed here.
- Role gate: ASSOCIATE → no access. RECRUITER → Learning tab only. MANAGER/ADMIN → full access.

---

## 9. ADMIN & SETTINGS
**Owner:** ADMIN only
**Question:** How is KAI configured and who has access?

```
Admin & Settings
 ├─ Users & Roles
 │    ├─ User list (email | role | last active)
 │    ├─ Role assignment (ADMIN / MANAGER / RECRUITER / ASSOCIATE)
 │    └─ Permissions matrix
 ├─ System Controls
 │    ├─ CV Parsing Controls
 │    ├─ Email Controls (sender address, SMTP)
 │    └─ WhatsApp Templates
 ├─ Taxonomy Management
 │    ├─ Trade List
 │    ├─ Skill List
 │    ├─ Certification List
 │    ├─ Country List
 │    └─ Education Levels
 ├─ JD Repository (manage + archive)
 ├─ Learning Settings
 │    ├─ Min sample threshold
 │    ├─ Default conversion rate
 │    └─ Freshness windows (Ready / Revalidation / Expired months)
 └─ Audit Logs
```

Rules:
- Entire section gated: ADMIN role only (verified via myContext API, not client-side).
- Settings write via POST action=updateSetting (already built in Phase 5).
- User role changes via POST action=setUserRole (already built in Phase 5).
- Last ADMIN cannot be demoted (server-side guard already active).
- Future: Subscription/Billing, API Keys, Webhook management.

---

## Status Map (Single Source of Truth)

```
PIPELINE owns:   Added → Submitted → Interview → Selected → Medical → Visa → Travel → Deployed
REQUIREMENTS read: slot counts per status for their reqId
CANDIDATES read:   highest pipeline status across all their slots
DASHBOARD reads:   aggregate counts from Pipeline
KAI INTELLIGENCE reads: completed mobilizations only (for learning + revenue)
```

---

## Role Access Matrix

| Tab | ASSOCIATE | RECRUITER | MANAGER | ADMIN |
|-----|-----------|-----------|---------|-------|
| Dashboard | Read (own) | Read (own) | Read (all) | Full |
| Leads | Create | Full | Full | Full |
| Requirements | Read assigned | Full | Full | Full |
| Campaigns | Read assigned | Read | Full | Full |
| Candidates | Read assigned | Full | Full | Full |
| Pipeline | Read assigned | Full | Full | Full |
| Associates | Read own | Read | Full | Full |
| KAI Intelligence | None | Learning only | Full | Full |
| Admin & Settings | None | None | None | Full |
