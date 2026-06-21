# KAI14-Core — Layer Ownership (enforced)

Every file maps to exactly one layer owner.

| Layer | Owns | Files | May WRITE | Never |
|-------|------|-------|-----------|-------|
| Foundation | Truth / identity / FK | `candidate.gs`, `requirement.gs`, `kai_generator.gs`, `client.gs`, `campaign.gs` | Candidates, _Requirements, _Clients, _Campaigns, _Meta, KAI counter | score, match, send email |
| K14 | Intelligence | `parser.gs`, `scoring.gs`, `matching.gs` | nothing persistent (returns objects) | mint KAI, write identity/FK |
| Intake | Ingestion | `gmail_intake.gs`, `cv_parser.gs`, `duplicate_engine.gs` | Drive CV files, Gmail labels | mint KAI, write Candidates |
| Execution | Outcomes / orchestration | `execution_engine.gs` | Candidates(State/ReqID/UpdatedAt via Foundation), _Queue marks | parse, score, mint KAI |
| Infrastructure | Services | `logging.gs`, `gemini_gateway.gs`, `queue.gs` | _Logs, _Errors, _Queue | make a recruiting decision |

**Single-writer mandate:** `kaiMint_` (foundation/kai_generator.gs) is the only function that increments the KAI counter.
