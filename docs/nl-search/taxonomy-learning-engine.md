# KAI Taxonomy Learning Engine — The Mutating Brain

**Status:** DESIGN LOCKED — this is the heart of KAI Intelligence.
**Version:** 1.0
**Date:** 2026-06-12

> KAI does not search a database. KAI mines skill from CVs and grows its own
> intelligence every week from the demand that walks in the door. The taxonomy
> is alive. It gets wilder, sharper, bigger — and it never asks permission to
> learn a trade a real Gulf client just demanded.

---

## 0. The Core Belief

| Static ATS thinking (WRONG) | KAI mutating intelligence (RIGHT) |
|---|---|
| Match job title → job title | Mine skill from CV → match skill to demand |
| Fixed trade dropdown | Trade list grows from every JD |
| "We don't have that trade" | "We learned that trade the moment a client asked" |
| Recruiter searches manually | Engine surfaces the right man for the skill |
| Taxonomy updated by a developer | Taxonomy mutates itself weekly, automatically |

KAI is a **skill miner**. The candidate is the permanent asset; his last
designation is just the most recent label. A "Mechanical Fitter" CV may contain
a 6G welder, a shutdown specialist, and a rigger — KAI mines all three and makes
the man findable for all three.

---

## 1. The Three Taxonomy Layers

```
┌─ LAYER 1 — SEED ──────────────────────────────────────────────┐
│ docs/nl-search/trade-taxonomy.ts                              │
│ GAS seedTaxonomyGCC_()  →  _Taxonomy sheet (status SEED)      │
│ Hand-curated. ~18 trade families. The embryo. Never the cap.  │
└───────────────────────────────────────────────────────────────┘
                          │ feeds
                          ▼
┌─ LAYER 2 — LEARNED ───────────────────────────────────────────┐
│ _Taxonomy        sheet (T13)  — trades, aliases, collar, level │
│ _KAI_Knowledge   sheet (T14)  — JD demand, certs, nationality  │
│ _SkillIndex      sheet (NEW)  — mined skills per candidate      │
│ _MatchFeedback   sheet (T13)  — recruiter accept/reject signal  │
│ Grows every week. Auto-approved when confident, queued if not.  │
└───────────────────────────────────────────────────────────────┘
                          │ unioned at query time
                          ▼
┌─ LAYER 3 — RUNTIME UNION ─────────────────────────────────────┐
│ nlSearch_  reads  SEED ∪ LEARNED                              │
│ A trade learned on Tuesday is searchable on Wednesday.         │
│ Zero code change. Zero redeploy.                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. The Weekly Mutation Loop

A single new time-based trigger — `learnTaxonomyWeekly` — runs every 7 days and
mutates the brain. It NEVER touches the live email pipeline and NEVER calls
Gemini on candidates (only on unresolved JD trade strings, cheaply).

```
learnTaxonomyWeekly  (every 7 days)
  │
  ├─ STEP 1 — HARVEST DEMAND
  │    Read _KAI_Knowledge rows added since last run.
  │    Every JD already captured: trade, certs, nationality, country, positions.
  │    → This is what Gulf clients actually demanded this week.
  │
  ├─ STEP 2 — HARVEST SUPPLY
  │    Read Candidates added since last run.
  │    Mine skill tokens from: trade, positionApplied, top3Positions,
  │    kaiAssessment, gulfExp, recommendedRoles.
  │    → This is what skill actually arrived this week.
  │
  ├─ STEP 3 — DETECT UNKNOWN TRADES & ALIASES
  │    For each demand/supply trade string:
  │      resolve against SEED ∪ LEARNED taxonomy (classifyTradeT13_).
  │      If UNRESOLVED → candidate for learning.
  │      Cluster near-duplicates (e.g. "instr tech", "inst. technician",
  │      "i&c tech" → INSTRUMENTATION).
  │
  ├─ STEP 4 — CLASSIFY THE NEW TRADE  (cheap Gemini, JD strings only)
  │    For each unresolved cluster, ask Gemini ONE question:
  │      "Classify this GCC trade: <string>. Return tradeFamily, collar
  │       (BLUE/GREY/WHITE), recruitmentClass (1 of 7), and 5 aliases."
  │    ~1 call per new trade per week. Pennies.
  │
  ├─ STEP 5 — CONFIDENCE GATE
  │    AUTO-APPROVE  → frequency ≥ 3 JDs OR ≥ 5 CVs, clear classification.
  │                    Write to _Taxonomy with status LEARNED_AUTO.
  │    QUEUE         → ambiguous / low frequency.
  │                    Write to _T13_GovernanceQueue status PENDING.
  │                    Recruiter approves from UI (existing approvePendingT13_).
  │    REJECT        → matches a NEVER-ADD pattern (IT/health/finance noise).
  │
  ├─ STEP 6 — ENRICH EXISTING TRADES
  │    New aliases for KNOWN trades → append to that family's alias list.
  │    New certs seen in JDs → append to cert index.
  │    New country×trade demand → update _KAI_Knowledge demand counters.
  │
  ├─ STEP 7 — MUTATE THE AFFINITY MATRIX
  │    Read _MatchFeedback (recruiter accepted/rejected which cross-trade subs).
  │    If recruiters repeatedly accept Fabricators for Welder reqs → nudge the
  │    T13_ALLOWED[WELDER_GROUP][FABRICATOR_GROUP] affinity up (bounded).
  │    If they always reject → nudge down. The matrix learns the desk's taste.
  │
  └─ STEP 8 — STAMP & REPORT
       Write _TaxonomyLearningLog: runDate, newTrades, newAliases, newCerts,
       autoApproved, queued, affinityChanges, jdsScanned, cvsScanned.
       This log is the visible proof the brain grew this week.
```

---

## 3. Skill Mining — Not Job Matching

The single most important shift. A CV is not one trade. It is a **bag of skills**.

### What gets mined from every CV (at parse time + weekly sweep)

| Skill signal | Mined from | Example |
|---|---|---|
| Primary trade | `trade` col | Welder |
| Secondary trades | `top3Positions`, `positionApplied` | Fabricator, Rigger |
| Coded tests | `kaiAssessment`, CV text | 6G, 6GR, 3G |
| Certifications | `kaiAssessment`, `flags` | CSWIP 3.1, NEBOSH |
| Equipment/process | `kaiAssessment` | DCS, PLC, TIG, SMAW |
| Shutdown/TAR | `kaiAssessment`, `positionApplied` | Shutdown specialist |
| GCC employers | `gulfExp` | Aramco, ADNOC, SABIC |
| Licenses | `kaiAssessment`, `flags` | Saudi DL, GCC DL |

These are written to a new **`_SkillIndex`** sheet — one row per candidate, a
flattened searchable skill blob + structured tags. NL search matches against
THIS, not just the single `trade` column.

### Why this wins

Query: `6gr welders available in india`
- **Job-title search:** returns only CVs whose `trade` cell literally says "6GR Welder" → misses 90% of qualified men.
- **KAI skill mining:** returns every CV where the skill blob contains a 6G/6GR coded test signal AND current location/nationality = India — even if his `trade` cell just says "Welder" or "Fabricator". The skill is in his hands; we found it.

---

## 4. What Already Exists vs What Is New

| Capability | Status | Source |
|---|---|---|
| `_Taxonomy` sheet + governance queue | ✅ EXISTS | T13 Deliverable 1, 5 |
| JD intelligence capture → `_KAI_Knowledge` | ✅ EXISTS | T14 `captureJDIntelligenceT14_` |
| Trade resolver / family detection | ✅ EXISTS | T13 `classifyTradeT13_` |
| Collar + level + recruitment class | ✅ EXISTS | T13 ladder, T14 classes |
| Recruiter feedback learning | ✅ EXISTS (read-only) | T13 `affinityMultiplierT13_` |
| Country×Trade demand learning | ✅ EXISTS | `runLearning` → `_KAI_Knowledge` |
| **`learnTaxonomyWeekly` closed loop** | 🔶 NEW | this doc |
| **`_SkillIndex` skill mining sheet** | 🔶 NEW | this doc |
| **Auto-approve confidence gate** | 🔶 NEW | this doc |
| **Affinity matrix self-mutation** | 🔶 NEW | this doc |
| **`_TaxonomyLearningLog`** | 🔶 NEW | this doc |
| **NL search reads SEED ∪ LEARNED** | 🔶 NEW | candidate-search-contract.md |

**The organs exist. We are connecting the nervous system and giving it a heartbeat.**

---

## 5. Safety Rails (so the brain grows wild but never breaks)

1. **No pipeline conflict** — `learnTaxonomyWeekly` reads disjoint sheets, holds
   no `ScriptLock`, never blocks `processAllInboxEmails`.
2. **Append-only learning** — `_Taxonomy` and `_KAI_Knowledge` are never
   destructively rewritten. New knowledge is added; old is never deleted.
3. **Governance for the uncertain** — anything below the confidence gate goes to
   the existing recruiter approval queue, not straight into production.
4. **Bounded mutation** — affinity nudges are clamped (e.g. ±5 per week, floor 0,
   ceiling 100). The matrix evolves; it cannot stampede.
5. **NEVER-ADD filter** — IT/health/finance/hospitality noise is rejected before
   it can pollute the industrial taxonomy.
6. **Reversible** — every mutation is logged in `_TaxonomyLearningLog` with the
   JD/CV evidence that caused it. Any learned entry can be rolled back by status.
7. **Cheap** — Gemini is called only on UNRESOLVED JD trade strings (a handful
   per week), never re-parsing CVs. Cost: pennies/week.

---

## 6. The Recruiter's Experience (the only thing that matters)

Before:
> Recruiter types "instrument tech shutdown saudi" → 4 results, because only 4
> CVs literally say that in the trade cell.

After (mutating intelligence):
> Recruiter types "instrument tech shutdown saudi" → 60 results, ranked:
> - STRONG: I&C techs with shutdown signal + Saudi gulfExp + valid passport
> - GOOD: instrument techs with shutdown signal, GCC-past, India-ready
> - POSSIBLE: instrument fitters with DCS/PLC skill, no shutdown tag yet
>
> And next to the search: *"KAI learned 3 new trades and 11 aliases this week."*

The dashboard answers **"who do I deploy?"** — never **"what data exists?"**

---

## 7. Implementation Order (for GAS developer)

1. Build `_SkillIndex` writer — runs inside existing CV parse + a one-time backfill.
2. Build `learnTaxonomyWeekly` (Steps 1–8 above) as a new GAS section.
3. Add the `learnTaxonomyWeekly` trigger to `BLESSED_TRIGGERS_`.
4. Wire `nlSearch_` to read SEED ∪ `_Taxonomy`(LEARNED) ∪ `_SkillIndex`.
5. Surface `_TaxonomyLearningLog` latest row in the search UI banner.

Full GAS field + function spec: **gas-field-requirements.md**.
Skill-mining match logic: **skill-mining-spec.md**.
