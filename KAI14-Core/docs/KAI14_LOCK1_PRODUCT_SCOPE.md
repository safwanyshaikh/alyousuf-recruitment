# KAI14-Core — LOCK-1 PRODUCT SCOPE (FROZEN)

**Status:** LOCKED. This is the binding scope for Phase 1. Any work outside this
document requires a new CEO authorization and a LOCK-2.

**Approvals on record:** Architecture = YES · Transition = YES · Implementation = APPROVED (post scope-lock).

---

## IN SCOPE — Phase 1 Deliverables (the only 9)

| # | Deliverable | Layer | File |
|--:|-------------|-------|------|
| 1 | Gmail Intake | Intake | `intake/gmail_intake.gs` |
| 2 | CV Extraction | Intake | `intake/cv_parser.gs` |
| 3 | K14 Parsing | K14 | `k14/parser.gs` |
| 4 | Duplicate Detection | Intake | `intake/duplicate_engine.gs` |
| 5 | Candidate Creation | Foundation | `foundation/candidate.gs` |
| 6 | KAI Generation | Foundation | `foundation/kai_generator.gs` |
| 7 | Foundation Queue | Infrastructure | `infrastructure/queue.gs` |
| 8 | Requirement Creation | Foundation | `foundation/requirement.gs` |
| 9 | Candidate Matching | K14 | `k14/matching.gs` |

**Mandatory support files** (required for the 9 above to function — not new features):
| Support file | Why mandatory |
|--------------|---------------|
| `infrastructure/logging.gs` | Platform config + attributable logs (Rule 5). |
| `infrastructure/gemini_gateway.gs` | The only LLM path; K14 parsing depends on it. |
| `k14/scoring.gs` | Score + verdict — output of K14 parse, needed before candidate write. |
| `foundation/client.gs` | FK target for Requirement (FK-clean mandate). |
| `foundation/campaign.gs` | Rule 13 — CampaignID mandatory on every candidate/requirement. |
| `execution/execution_engine.gs` | Orchestrates the chain + runtime proof entry points. |

---

## EXPLICITLY EXCLUDED (do not build, do not call, do not stub)

- Submission Engine
- Mobilization Engine
- Learning Engine
- Outcome Engine
- Recruiter Automation
- Auto Follow-up
- Auto Document Collection
- Historical Replay
- Analytics
- Reporting
- Dashboard Optimization
- Associate Performance
- AI Recommendations beyond matching
- Project hierarchy (`project.gs`) — deferred; `ProjectID` stays nullable in Phase 1

---

## SUCCESS DEFINITION (Phase 1 sign-off)

A recruiter can:
```
Receive a CV → Create a Candidate → Receive a KAI Number → See Candidate in Queue
→ Create Requirement → Run Match → See Ranked Candidates
```
Nothing else is required for Phase 1 sign-off.

---

## RUNTIME (the only approved chain)

```
Email → CV Extraction → K14 Parse → Duplicate Check → Candidate → KAI → Queue → Requirement → Match
```

---

## BUILD ORDER

```
1. infrastructure/logging.gs        (config + logs)
2. infrastructure/gemini_gateway.gs (LLM transport)
3. infrastructure/queue.gs          (Foundation Queue)
4. foundation/kai_generator.gs      (KAI single writer)
5. foundation/client.gs             (FK target)
6. foundation/campaign.gs           (Rule 13 default)
7. foundation/candidate.gs          (atomic create)
8. foundation/requirement.gs        (FK-clean create)
9. intake/cv_parser.gs              (attachment extraction)
10. k14/parser.gs                   (CV parse)
11. k14/scoring.gs                  (score + verdict)
12. intake/duplicate_engine.gs      (passport→mobile→email)
13. intake/gmail_intake.gs          (label scan)
14. k14/matching.gs                 (candidate ↔ requirement)
15. execution/execution_engine.gs   (orchestration + runtime proof)
```

UI (`recruiter_console.html`, `dashboard.html`) and `auth.gs` are the immediate next
delivery AFTER the backend chain passes its runtime proof — they present what the engine
produces; they create nothing.

LOCKED. Delivery starts now.
