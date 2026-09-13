# KAI Recruitment OS — Candidate Page V1 (LOCKED)

## Purpose
The Candidate Page is the Recruiter's Working Desk.
Within 5 seconds the recruiter must know:
1. Who is this candidate?
2. What trade can he work in?
3. How much India and GCC experience?
4. Is he ready for deployment?
5. Is he suitable for Gulf recruitment?
6. Can I contact him now?
7. What action should I take next?

## Top Summary Cards
Total Candidates | Needs Call | Ready | Shortlisted | Submitted | Selected | Mobilization | Deployed

## Global Search
Searches: Name, Passport No, Mobile, Email, KI Number, Trade, Skill, Top Position, City, State, Nationality, Requirement ID, Associate, Campaign, Previous Client, Certification, Recruiter Notes

## Filters (Always Visible)
Stage, Nationality, Country, State, City, Education, Qualification, Primary Trade, Top Position, Readiness, GCC Match, India Exp, Saudi Exp, UAE Exp, Qatar Exp, Kuwait Exp, Bahrain Exp, Oman Exp, Associate, Campaign, CV Available, Passport Available, Contact Available

## Column Structure

| # | Column | Display | Source |
|---|--------|---------|--------|
| 1 | STAGE | Stage badge (Review/Needs Call/Shortlisted/Submitted/Selected/Mobilization/Deployed) | computeDisplayStage_ |
| 2 | CANDIDATE | Name / Nationality \| Age \| Passport No | master record |
| 3 | LOCATION | State \| City | currentLocation |
| 4 | EDUCATION | Education Level \| Qualification | education field |
| 5 | EXPERIENCE | IND 3Y \| GCC 4Y | experience + gulfExp |
| 6 | TOP 3 POSITIONS | P1 / P2 / P3 (AI-weighted) | top3Positions.full[] |
| 7 | TRADE / SKILL | Primary Trade + Key Skills | trade + kaiAssessment |
| 8 | READINESS | Ready/Needs Call/Docs Pending/Assessment Pending/Interview Ready/Selected/Mobilization/Deployed | derived |
| 9 | GCC MATCH | 87% Strong GCC Match | gccScore + gccTier |
| 10 | CV | View/Download/Open | cvLink |
| 11 | CONTACT | Call/WhatsApp/Email | mobile/email |
| 12 | ACTIONS | Shortlist/Request Docs/Submit To Client/View History/Assign Requirement/Change Stage/Archive | workflow |

## GCC Match Formula (Future)
30% Candidate Experience + 25% GCC Experience + 20% Trade Intelligence + 15% JD Intelligence + 10% Historical Success Intelligence

## KAI Intelligence Foundation
CV parsing → Trade/Occupation/Skill Taxonomy
JD uploads → Country Requirements/Client Preferences/Selection Patterns/Deployment Patterns
Goal: KAI = Gulf Recruitment Intelligence Engine, not a candidate database
