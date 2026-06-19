# KAI OS — TECHNICAL ARCHITECTURE
**Phase 4B deliverable · Target architecture · No code, no implementation**
**Repository:** safwanyshaikh/alyousuf-recruitment · **Branch:** claude/sweet-franklin-mnmfcz
**Date:** 2026-06-19 · **Status:** PROPOSED → awaiting approval (with Phase 4A) before Phase 5
**Governed by (frozen):** FOUNDATION · K14 · EXECUTION constitutions + KAI_OS_BLUEPRINT

> Translates the constitutions into the architecture that **should exist** — storage-,
> runtime-, and vendor-neutral. Per directive: NOT designed around Apps Script, current
> patches, sheet limits, or today's implementation. Implementation constraints are Phase
> 5 concerns. This is architecture, not code.

---

## 1. SYSTEM BOUNDARIES

KAI OS is six bounded services, one per layer, communicating only through defined
contracts. A boundary is a wall: a layer may only reach another through its published
contract, never through its internals.

```
            ┌─────────────── KAI OS ────────────────┐
 Clients/   │  [Foundation]  [K14]  [Execution]      │
 Recruiters │       │         │         │            │
 (UI, thin) │  [Outcomes]  [Memory]  [Learning]      │
            └────────────────┬──────────────────────┘
                             │ only via contracts (§8–10)
        External evidence sources (CV/JD intake, client comms) → ingested as evidence
```

**Boundary rules**
1. **The UI is outside the boundary.** It is a thin display/command surface; it holds no
   truth, intelligence, or operational logic. It calls service contracts only.
2. **Each layer owns its store.** No layer reads another layer's storage directly; it
   asks via contract.
3. **One direction of authority:** Foundation→K14→Execution→Outcomes→Memory→Learning, with
   Learning feeding K14. Cross-cutting concerns (Audit, Security) wrap all layers.
4. **Multi-tenant by design.** Every record and every contract is tenant-scoped from day
   one (SaaS-ready), even if first deployed single-tenant.

---

## 2. FOUNDATION ARCHITECTURE (truth service)

**Responsibility:** authoritative facts for the six entities. The system of record.

- **Entity stores** for Client, Project, Campaign, Requirement, Associate, Candidate,
  each with a system primary key and the locked schema (Foundation Constitution §2).
- **Referential integrity enforced at write time:** foreign keys resolve to existing
  parents; the Campaign-mandatory rule and "no FK in free text" rule are enforced by the
  service, not by convention.
- **Status governance enforced:** only constitutional status values accepted; terminal
  statuses are write-protected from auto-revert.
- **Append-only history:** facts are versioned; a change creates a new version with
  provenance, never a destructive overwrite.
- **Read-only to K14 and Execution.** Writes come only from authorized recruiter/system
  commands through the Foundation write-contract, which validates against the
  constitution.
- **Intelligence is forbidden here.** No score, assessment, or match field exists in
  Foundation (Foundation Constitution §7).

---

## 3. K14 ARCHITECTURE (intelligence service)

**Responsibility:** the single reasoning brain. Stateless on facts (reads them), stateful
on patterns (via Memory).

Internal capabilities (from the K14 module map; not separate engines — facets of one
reasoning pass):
```
INTAKE     ingest + normalize + deduplicate + validate raw evidence (CV/JD/...)
CLASSIFY   trade + taxonomy classification of evidence
MEMORY-RD  read learned patterns as priors (store owned by Memory service, §6)
REASON     one reasoning pass over Foundation facts + classified evidence + priors
VALIDATE   gate checks before consequential conclusions
LEARN-WR   emit learning signals to the Learning service (§7)
```
- **One reasoning pass, many outputs.** REASON produces Assessment, Match, Rank,
  Shortlist, Risk, Readiness, Missing Data, Recommendations together and coherently.
- **Every output is a contract object** carrying: the conclusion, its confidence, and its
  **evidence chain** (what supported and what opposed it). No black-box outputs.
- **K14 owns an intelligence store** keyed by entity PK (e.g. requirement-intelligence by
  ReqID) — **separate from Foundation.** This is where derived fields live.
- **Brain version is swappable.** REASON is a versioned component (K14 → K15 → K20);
  swapping it never touches Foundation, Execution, or the contracts.
- **Vendor-neutral reasoning.** The reasoning mechanism (model, technique) is an internal
  detail behind the K14 contract; the contract never names a vendor.

---

## 4. EXECUTION ARCHITECTURE (operations service)

**Responsibility:** the only actor. Drives Match → Submission → Selection → Mobilization.

- **Four entity workflows**, each a governed state machine (Execution Constitution §3)
  with valid/invalid/terminal states and forward-only-by-default transitions.
- **Every transition is a command** that: (a) reads required Foundation facts, (b)
  requests the K14 validation gate, (c) requires an attributable actor, (d) writes an
  audit record, (e) emits an outcome event. A transition missing any of these is refused.
- **Execution holds operational state only** (where a candidate is in the pipeline), never
  truth or intelligence.
- **Reversibility is policy-driven:** a transition is reversible only if the governance
  policy for that state marks it reversible; otherwise it is terminal.
- **Idempotent commands:** re-issuing the same action does not double-apply (safe retries).

---

## 5. OUTCOME ARCHITECTURE (evidence service)

**Responsibility:** capture what actually happened and make it the strongest evidence.

- **Outcome ledger:** submission, selection, deployment, failure (with reason), and
  retention results — append-only, attributed to requirement, candidate, associate,
  recruiter, and the decision tested.
- **Outcomes are immutable evidence.** Once recorded, an outcome is not edited; a
  correcting outcome is a new entry referencing the prior.
- **Outcomes fan out:** to K14 (as top-authority evidence), to Memory (as pattern
  reinforcement), and to Learning (as a training signal).
- **Outcomes never rewrite Foundation facts;** they annotate intelligence and history.

---

## 6. MEMORY ARCHITECTURE (pattern service)

**Responsibility:** the permanent learned-pattern store. K14 is not stateless because
Memory persists.

- **Pattern store** of client/project/campaign/trade/country/submission/selection/
  mobilization patterns, recruiter-correction patterns, and success/failure history.
- **Append-only with reinforcement counts;** patterns strengthen as outcomes confirm them
  and are reviewed for expiry when never reinforced.
- **Read by K14 as priors;** a pattern is advisory weight, never an override of current
  evidence or recruiter authority.
- **Never-forget guarantee** for outcomes and corrections; survives every brain-version
  upgrade so learning compounds.
- **Tenant-scoped;** patterns never leak across tenants.

---

## 7. LEARNING ARCHITECTURE (evolution service)

**Responsibility:** convert corrections and outcomes into sharper future interpretation —
without changing governing principles.

- **Learning pipeline** consumes recruiter corrections (supreme), and submission/
  selection/mobilization/deployment results.
- **Adjusts interpretation, not the constitution.** It tunes how K14 weighs evidence;
  it cannot alter the constitutions or move intelligence into other layers.
- **Reversible and auditable:** every learned adjustment is traceable to its causing
  evidence and can be rolled back when later evidence contradicts it.
- **Gated promotion:** a pattern becomes decision-weight only after outcome reinforcement
  (no promotion on faith).
- **Versioned:** learning artifacts are versioned with the brain so an upgrade or rollback
  is clean.

---

## 8. DATA CONTRACTS

Conceptual (vendor-neutral) shapes that move between layers. Not database schemas, not
JSON specifics — the *agreement* on what data means.

| Contract | Owner | Consumers | Essence |
|----------|-------|-----------|---------|
| Entity-Fact | Foundation | K14, Execution | A versioned, tenant-scoped fact record keyed by entity PK; FK-clean; status-governed |
| Evidence | Intake→K14 | K14 | A timestamped, provenance-stamped unit of admissible evidence |
| Intelligence | K14 | UI, Execution | A conclusion + confidence + evidence chain, keyed to the entity it describes |
| Outcome | Execution→Outcomes | K14, Memory, Learning | An immutable, attributed result of an action |
| Pattern | Memory | K14, Learning | A reinforced regularity with provenance and reinforcement history |
| Audit-Record | all layers | Audit | Actor, action, before/after state, timestamp, reason |

**Rule:** a data contract is the only legitimate way data crosses a boundary. Internal
representations are private to each service.

---

## 9. SERVICE CONTRACTS

What each layer exposes to the others (capabilities, not endpoints).

| Service | Exposes (consumed by) |
|---------|------------------------|
| Foundation | read-fact, write-fact (validated), resolve-hierarchy — to K14/Execution/UI |
| K14 | submit-evidence, request-interpretation, request-validation-gate — to Execution/UI |
| Execution | advance-state (Match/Submission/Selection/Mobilization), each guarded — to UI |
| Outcomes | record-outcome, read-outcome — to Execution/K14 |
| Memory | read-patterns — to K14; reinforce-pattern — to Learning |
| Learning | apply-learning-signal — internal; publishes brain-version readiness |

**Rules:** services are stateless at the contract boundary except where the constitution
requires state (Memory); contracts are versioned; a consumer never reaches past a contract
into another service's store.

---

## 10. EVENT CONTRACTS

KAI OS is **event-driven** so layers stay decoupled and the learning loop is asynchronous.

```
EvidenceIngested      → K14 (interpret)
InterpretationReady   → UI / Execution (advisory)
StateTransitioned     → Audit + Outcomes (if it produced a result)
OutcomeRecorded       → K14 (evidence) + Memory (reinforce) + Learning (signal)
PatternReinforced     → K14 (priors refresh)
LearningApplied       → K14 (brain-version interpretation sharpened)
```

**Rules:** events are immutable, ordered per entity, tenant-scoped, and carry correlation
identifiers so any decision can be traced end to end. Every consequential event is also an
audit event.

---

## 11. AUDIT ARCHITECTURE (cross-cutting)

- **Append-only audit log spanning all layers.** Every fact change, every interpretation,
  every action, every outcome is recorded with actor, timestamp, before/after, and reason.
- **Attribution is mandatory:** Recruiter · Associate · Client · System. No anonymous
  action is accepted (Execution Constitution §8).
- **Correlation:** a single correlation id links the evidence → interpretation → action →
  outcome chain for any case, making the whole system explainable after the fact.
- **Immutable and queryable** independently of operational stores, so audit survives even
  if an operational store is rebuilt.

---

## 12. SECURITY ARCHITECTURE (cross-cutting)

- **Tenant isolation** at every layer and contract; no cross-tenant read or pattern leak.
- **Role-based authority:** recruiter/admin/system roles; the recruiter's final-decision
  authority and terminal-status protection are enforced, not advisory.
- **Consent & compliance as hard gates:** PII consent, retention windows, and cross-border
  rules are enforced before any submission or mobilization (K14 §5, Execution §7).
- **Least-privilege secrets:** credentials for external services live in a secret store,
  never in code, UI, or client-side surfaces (closes the current browser-key risk).
- **PII minimization & protection:** candidate personal data is access-controlled,
  audited on read, and never exposed to the thin UI beyond need.

---

## 13. SCALABILITY ARCHITECTURE

- **Stateless services scale horizontally;** stateful stores (Foundation, Memory,
  Outcomes, Audit) scale independently behind their contracts.
- **Read/write separation:** heavy read workloads (dashboards, matching evidence) are
  served from read-optimized projections; writes stay transactional and validated.
- **Asynchronous learning loop:** outcomes and learning process off the critical path so
  operations never wait on intelligence training.
- **Volume targets are first-class:** the design assumes growth far beyond today's ~10k
  candidates / ~16k match rows — entities and events are partitionable by tenant and time.
- **Brain scaling:** K14 interpretation is a scalable, swappable compute component
  independent of storage.

---

## 14. MIGRATION ARCHITECTURE

How today's reality (one multi-tab spreadsheet, partial repo source, missing engines)
becomes the target — **without inventing truth and without losing data.**

- **Truth migration:** the six live entity tabs map to the locked Foundation schema;
  reconciliation adds FK columns, derives Campaign/Project IDs from the legacy
  `[Project:xxx]`-in-Notes strings, and standardizes status — additive, dry-run-first,
  originals preserved.
- **Evidence migration:** the 10k candidates, taxonomy, T13 match history, outcomes,
  corrections, archive and rejection history are imported as **evidence and frozen
  benchmark** for K14 — never as architecture (K14 Governance Lock).
- **Engine handling:** missing engines (T13/Submission/Mobilization/Taxonomy) are **not
  ported**; their outputs are benchmarks against which the new K14 is measured.
- **No big-bang:** migration is staged and reversible; each entity is reconciled and
  verified before the next.

---

## 15. CUTOVER ARCHITECTURE

How the system goes live without stopping operations.

- **Strangler pattern:** new layer services run alongside the current system; one decision
  type at a time is routed through K14 and the new contracts, then the old path is retired.
- **Decision-by-decision cutover order:** intake → classify → interpret (assessment/
  match/rank/shortlist) → validate (submission/mobilization) → outcomes/learning — each
  proven against its frozen benchmark before the old path is removed.
- **Shadow running:** new K14 outputs run in shadow against live outcomes until they meet
  or beat the benchmark; only then do they become authoritative.
- **Reversible cutover:** every step can fall back to the prior path until the new path is
  signed off.
- **UI last:** the thin UI is repointed to the new contracts only after the services
  behind them are proven; the recruiter experience never goes dark.
- **Archive, never delete:** retired code and superseded data are archived for audit, not
  destroyed.

---

## SUCCESS CONDITION
Together with the Blueprint and the three constitutions, this architecture is sufficient
to implement KAI OS — independent of any specific runtime, database, or vendor. A future
team can choose the technology in Phase 5 and build to these boundaries and contracts
without revisiting principles.

```
PHASE 0  Reality Map             ✓ complete
PHASE 1  Foundation Constitution ✓ complete
PHASE 2  K14 Constitution        ✓ complete
PHASE 3  Execution Constitution  ✓ complete
PHASE 4A KAI OS Blueprint        ✓ complete
PHASE 4B Technical Architecture  ◀ this document (awaiting approval)
PHASE 5  Implementation          (only after 4A AND 4B approved)
```

**STOP. Await approval of Phase 4A + 4B before Phase 5.**
