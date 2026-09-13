# KAI Skill Mining & Dynamic Matching Specification

**Status:** DESIGN LOCKED
**Version:** 1.0
**Date:** 2026-06-12

> Match the skill in the man's hands, not the title on his payslip.
> Search is dynamic and requirement-driven. The same candidate ranks
> differently for a Welder req vs a Fabricator req — because matching is
> computed live against the demand, never read from a static label.

---

## 1. The Skill-First Principle

A CV is a **bag of skills**, not a single job title. KAI mines every skill from
every candidate and matches the bag against the live requirement.

```
Traditional:  candidate.trade === req.trade           → brittle, misses 90%
KAI:          mineSkills(candidate) ⊇ requiredSkills(req) → finds the real talent
```

---

## 2. `_SkillIndex` — The Mined Skill Sheet (NEW)

One row per active candidate. Rebuilt at parse time and by the weekly sweep.

### Columns

| Col | Field | Source | Example |
|-----|-------|--------|---------|
| 1 | `kaiNo` | identity | AYE-KAI-2026-001234 |
| 2 | `primaryTrade` | `trade` col | Welder |
| 3 | `tradeFamily` | `classifyTradeT13_(trade)` | WELDER_GROUP |
| 4 | `collar` | T13 collar | BLUE |
| 5 | `recruitmentClass` | T14 class | SKILLED_TRADESMAN |
| 6 | `secondaryTrades` | top3Positions + positionApplied, resolved | Fabricator,Rigger |
| 7 | `codedTests` | mined from kaiAssessment/CV | 6G,6GR,3G |
| 8 | `certs` | mined | CSWIP 3.1 |
| 9 | `processSkills` | mined | TIG,SMAW,DCS,PLC |
| 10 | `shutdownSignal` | mined boolean | true |
| 11 | `gccEmployers` | mined from gulfExp | Aramco,ADNOC |
| 12 | `gccCountries` | mined from gulfExp | Saudi Arabia,UAE |
| 13 | `licenses` | mined | Saudi DL |
| 14 | `sourceCountry` | nationality/currentLocation | India |
| 15 | `skillBlob` | all of the above, lowercased, joined | (full-text search) |
| 16 | `lastMined` | timestamp | 2026-06-12 |

### Mining Rules (applied to every CV)

```
codedTests   ← regex over kaiAssessment + CV text:
               /\b(1g|2g|3g|4g|5g|6g|6gr)\b/  (weld positions)
certs        ← match against CERTIFICATIONS aliases (trade-taxonomy.ts)
processSkills← match dictionary: tig,mig,smaw,gtaw,gmaw,fcaw,dcs,plc,scada,
               hvac,vrf,ndt,rt,ut,mt,pt,...
shutdownSignal← match SHUTDOWN_PHRASES (trade-taxonomy.ts)
gccEmployers ← dictionary: aramco,sabic,adnoc,qatarenergy,koc,pdo,bapco,neom,
               +client list grows from _KAI_Knowledge
gccCountries ← match GCC_DESTINATIONS aliases against gulfExp
licenses     ← match driving-license cert aliases
secondaryTrades← resolve each top3Positions entry through classifyTradeT13_
```

---

## 3. Dynamic Match Scoring (per requirement)

Matching is **computed live** using the EXISTING T14 engine — we do not invent a
new scorer. `computeMatchScoreT14_` already weights:

```
Trade Relevance   40%   (T13 eligibility hard-gate at 0)
Experience        25%
Age               10%
GCC Experience    10%
Campaign Location 10%
Certifications     5%
+ education tier cap, nationality hard-block
```

### What skill mining ADDS to this (additive, not replacing)

The `tradeRelevanceScoreGCC_` step currently reads the single `trade` cell.
We extend its INPUT to the mined skill bag:

```
tradeRelevance(req, cand):
  best = 0
  for each tradeSignal in [cand.primaryTrade, ...cand.secondaryTrades]:
     elig = T13 eligibility(req.tradeFamily, familyOf(tradeSignal))
     best = max(best, elig)
  # skill boosters (only when req demands them)
  if req.needsCoded   and cand.codedTests ⊇ req.codedTests:   best = min(100, best+10)
  if req.needsShutdown and cand.shutdownSignal:               best = min(100, best+10)
  if req.needsLicense  and cand.licenses ⊇ req.license:       best = min(100, best+10)
  return best
```

A Fabricator CV that carries a 6G coded test now scores STRONG for a 6G Welder
requirement — because the skill is mined, even though the title says Fabricator.

---

## 4. Gulf Recruitment Reality Filters (hard gates)

These are not "nice to have" — a Gulf recruiter cannot deploy a man who fails
these, regardless of skill. Already partly in T14 compliance; surfaced in search:

| Gate | Rule | Source |
|------|------|--------|
| Nationality block | JD whitelist (e.g. Indian,Nepali only) | T14 `nationalityBlockT14_` |
| Age | JD min/max, else 18–50 → archive not reject | T14 `ageScoreT14_` |
| Passport validity | expired/<6mo → compliance risk flag | T14 compliance |
| ECR/ECNR | Indian + Saudi destination → ECR check | T14 + GCC_DESTINATIONS |
| License | Heavy driver JD → Saudi/GCC DL mandatory | skill mining `licenses` |
| GCC experience | "GCC experience" JD → must have gccCountries | skill mining |

---

## 5. Result Tiers (what the recruiter sees)

Mirror the existing T13/T14 tier thresholds — no new scale:

| Tier | Score | Meaning for recruiter |
|------|-------|----------------------|
| STRONG | ≥ 75 | Skill + Gulf reality both green. Submit now. |
| GOOD | 55–74 | Skill matches, one reality gap (e.g. needs passport renewal). |
| POSSIBLE | 40–54 | Adjacent skill or India-ready, no GCC exp yet. |
| HIDDEN | < 40 / hard-fail | Nationality/trade mismatch. Never shown. |
| ARCHIVED | age/compliance | Out of band, retained forever, not deleted. |

The recruiter sees `STRONG 22 · GOOD 48 · POSSIBLE 55` — the same intelligence
shape KAI already produces after JD upload. NL search reuses it.

---

## 6. Why the Same Candidate Ranks Differently (dynamic proof)

Candidate: Welder, 6G coded, Aramco 4yr, Indian, valid passport.

| Requirement | Score | Tier | Why |
|---|---|---|---|
| 6G Pipe Welder, Saudi | 92 | STRONG | coded + Saudi exp + nationality OK |
| Fabricator, UAE | 64 | GOOD | adjacent family (T13 affinity 60) |
| QC Welding Inspector | 0 | HIDDEN | WORKER→INSPECTOR blocked (T13/T14) |
| HSE Officer | 0 | HIDDEN | trade mismatch |

Nothing is stored as "this man's match level." It is **recomputed against each
demand**. That is the definition of dynamic, requirement-driven matching.

---

## 7. Feeds Back Into Learning

Every search + every recruiter action feeds the mutation loop:
- Recruiter opens/submits a POSSIBLE candidate → `_MatchFeedback` row → next
  weekly run nudges that cross-trade affinity up.
- A JD demands a skill not yet in `processSkills` dictionary → weekly run learns it.
- A new GCC employer appears in CVs → added to `gccEmployers` dictionary.

The search gets sharper every week without a developer touching the code.
See **taxonomy-learning-engine.md** for the loop.
