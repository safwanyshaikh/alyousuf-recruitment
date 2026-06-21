# KAI14-Core — Architecture

Locked layering: **Foundation → K14 → Execution**, with **Infrastructure** as shared
services and **UI** as read-only presentation. No business decision lives outside K14;
no identity is minted outside Foundation.

## Runtime (the only approved chain)
```
Email (kai14/intake)
  → cv_parser.extractCv_        (Intake)      attachment → Drive + bytes
  → parser.parseCv_            (K14)         bytes → structured fields
  → scoring.scoreCandidate_    (K14)         fields → score/verdict/flags
  → duplicate_engine.duplicateCheck_ (Intake) passport→mobile→email
  → candidate.candidateCreate_ (Foundation)  LOCK { recheck → kaiMint_ → row(KAINo col1) → _Meta → queue }
  → requirement.requirementCreate (Foundation) recruiter creates req (FK-clean)
  → matching.matchRequirement  (K14)         ranked Top-N
```

## Atomicity
`candidateCreate_` holds `LockService.getScriptLock()` for the full critical section.
A candidate row never exists without its KAINo; the dedup index is written inside the
same lock so the next thread sees it immediately. Concurrency is proven by
`kai14ProofConc*` (5×100 isolated, 0 collisions expected).

## Test isolation
`testMode:true` redirects all writes to `_TEST_*` sheets and the `kai14_counter_test`
counter. Synthetic runs consume zero production KAI numbers and create zero production rows.

## Entry points
- `kai14Setup()` — create labels + default campaign (run once)
- `gmailIntakeRun(max)` — production intake (trigger target in Phase 2)
- `kai14ProofSequential()` / `kai14ProofConcInstall()` / `kai14ProofConcReport()` / `kai14ProofCleanup()` — runtime proof
- `kai14RealCvTest()` — one real CV through the production path
- `requirementCreate(r)` / `matchRequirement(reqId)` — requirement + match
