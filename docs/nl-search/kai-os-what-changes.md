# What Changes in KAI OS — Before vs After NL Intelligence

**Status:** REFERENCE
**Version:** 1.0
**Date:** 2026-06-12

> The honest list of every place a recruiter will SEE the difference once the
> NL search + skill mining + weekly learning engine goes live. Nothing in the
> existing platform breaks — this is all additive.

---

## 1. The Search Box (most visible change)

| Before | After |
|--------|-------|
| Filter dropdowns: trade, nationality, score, stage | One typed box: "6gr welders india" |
| Recruiter must know the exact trade name in the list | Recruiter types like he speaks to a colleague |
| `trade` cell must literally match | Skill is MINED from the whole CV |
| Returns rows where one column matched | Returns ranked STRONG / GOOD / POSSIBLE |

**Where:** Candidates page, top bar. New `?action=nlSearch` endpoint.

---

## 2. Results Are Now RANKED, Not Just Filtered

| Before | After |
|--------|-------|
| Flat list, sorted by date or score | Three tiers: STRONG · GOOD · POSSIBLE |
| "Here is everyone with trade = Welder" | "22 Strong · 48 Good · 55 Possible" |
| Recruiter scans 200 rows manually | Best-fit men float to the top automatically |
| No reason shown | Each card shows `matchedVia` — which skill matched |

**The dashboard finally answers "who do I submit?" not "what data exists?"**

---

## 3. Skill Mining — The Hidden Talent Surfaces

| Before | After |
|--------|-------|
| A Fabricator CV never appears for a Welder search | Fabricator with a 6G coded test appears as GOOD |
| `trade = "Mechanical Fitter"` hides his welding skill | His mined skills (TIG, 6G, shutdown) are all searchable |
| One man = one trade | One man = a bag of mined skills |

**Concrete:** ~3,000 candidates whose `trade` cell says one thing but whose CV
holds three skills become findable for all three. No re-parsing — mined live
from `kaiAssessment`, `top3Positions`, `gulfExp`, `positionApplied`.

---

## 4. Gulf-Reality Filters Are Now Enforced in Search

| Before | After |
|--------|-------|
| Search ignored deployability | "saudi license" filters to men who actually hold it |
| "gcc experience" was just text | Engine checks real `gulfExp` (GCC_CURRENT/PAST) |
| Nationality/ECR not in search | Saudi destination → ECR/ECNR surfaced on card |
| Shutdown specialists buried | "shutdown" boosts TAR-experienced men to STRONG |

**Where:** Built on existing T14 compliance + `classifyGCCMobility_`. The
recruiter stops short-listing men who can't actually be deployed.

---

## 5. The Taxonomy Now GROWS ITSELF (the big one)

| Before | After |
|--------|-------|
| Trade list fixed until a developer edits code | `learnTaxonomyWeekly` adds trades every 7 days |
| New client trade = "we don't have that" | New trade learned the week the JD arrives |
| Aliases hand-maintained | New aliases mined from JDs + CVs automatically |
| Static dictionary | Living organism — wilder, sharper, bigger weekly |

**Where:** New `_TaxonomyLearningLog` sheet shows weekly growth. A subtle banner
under the search bar: *"KAI learned 3 new trades and 11 aliases this week."*

---

## 6. The Engine Learns the Desk's Taste

| Before | After |
|--------|-------|
| Cross-trade matches fixed forever | Recruiter accept/reject nudges affinity |
| Fabricator-for-Welder always 60% | If recruiters keep accepting → nudges up (capped) |
| No feedback memory | `_MatchFeedback` → weekly affinity mutation |

**Where:** Reuses existing `affinityMultiplierT13_`. The matrix slowly bends
toward what this specific desk actually deploys.

---

## 7. New Sheets You Will See in the Spreadsheet

| Sheet | Purpose | Lifecycle |
|-------|---------|-----------|
| `_NLQueryLog` | Every NL search logged | append-only |
| `_TaxonomyLearningLog` | Weekly proof of growth | append-only |
| `_Taxonomy` (already exists) | Now actively grown | append + governance |
| `_KAI_Knowledge` (already exists) | Now read back weekly | append-only |
| `_SkillIndex` (Phase-2, optional) | Pre-mined skills cache | upsert |

---

## 8. What Does NOT Change (the safety guarantee)

- `getCandidates_` — identical. Existing grid, filters, drawer all work as-is.
- `parseCV_` + email pipeline — untouched. CVs parse exactly as before.
- All 5 blessed triggers — unchanged (one NEW trigger added: `learnTaxonomyWeekly`).
- Existing `?action=candidates`, `?action=match`, `?action=requirements` — identical.
- KAI Number still hidden in grid (drawer + search only).
- No Firebase, no multi-tenancy, no Phase-2 modules pulled forward.
- Lovable still UI-only — all new brains live in GAS.

---

## 9. New GAS Surface Area (for the record)

| Section | Function | File | Risk |
|---------|----------|------|------|
| 47 | `nlSearch_`, `parseNLQuery_`, `nlBlob_`, `logNLQuery_` | Master | additive |
| 47c | `resolveTradeDynamic_`, `getLearnedTaxonomyCached_` | Master | additive |
| 48 | `learnTaxonomyWeekly` + helpers | new KAI_T15_Learning.gs | additive |
| router | 1 line: `action === 'nlSearch'` | Master doGet | additive |
| trigger | `learnTaxonomyWeekly` every 7 days | — | additive |

**Net:** ~1 new endpoint, 1 new weekly trigger, 2 new log sheets. Zero changes
to anything currently working.

---

## 10. Rollout Order (safe, reversible)

1. Build + test `nlSearch_` in GAS editor (`testNLSearch`) — no UI yet.
2. Deploy. Confirm `?action=version`. Existing platform unaffected.
3. Build `learnTaxonomyWeekly`, run once manually, inspect `_TaxonomyLearningLog`.
4. Install the 7-day trigger.
5. THEN unblock Lovable to build the search box (the 5 patches).
6. Watch `_NLQueryLog` + tier counts to validate quality before announcing.
