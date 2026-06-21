# KAI14-Core — Phase 1 Code Audit

**Scope:** static integration audit of the 15 delivered files (commit 90de9a4).
**Method:** read every file; trace data keys across every seam; map tables, properties,
triggers, KAI writers, candidate writers, duplicate paths, delete paths.
**Honest limit:** this is a STATIC audit. No GAS runtime has executed yet. It proves the
files are internally consistent and wire together; it does NOT replace the sequential /
concurrency / real-CV runtime proofs (those remain required before deployment).

---

## PART 1 — Per-file matrix (10 attributes each)

### infrastructure/logging.gs
1. **Purpose:** platform config (single source) + attributable logging + shared normalizers.
2. **Public fns:** `K14` (config), `K14_ss_`, `K14_sheet_`, `K14_now_`, `K14_today_`, `logEvent`, `logError`, `maskEmail`, `maskPhone`, `normEmail_`, `normMobile_`, `normText_`.
3. **Deps:** SpreadsheetApp.
4. **Tables created:** `_Logs`, `_Errors`.
5. **Tables read:** none.
6. **Tables written:** `_Logs`, `_Errors`.
7. **Owner:** Infrastructure.
8. **Error handling:** log writers wrapped in try/catch → fall back to `Logger.log`.
9. **Duplicate protection:** n/a.
10. **Entry points:** none (library).

### infrastructure/gemini_gateway.gs
1. **Purpose:** only LLM path.
2. **Public fns:** `geminiText`, `geminiJson` (+ `geminiModel_`, `geminiKey_`).
3. **Deps:** UrlFetchApp, Script Property `GEMINI_API_KEY`.
4–6. **Tables:** none.
7. **Owner:** Infrastructure.
8. **Error handling:** throws on non-200, empty/blocked, missing key, no-JSON.
9. **Dup protection:** n/a.
10. **Entry points:** none (called by K14).

### infrastructure/queue.gs
1. **Purpose:** Foundation Queue (Deliverable 7).
2. **Public fns:** `queueEnqueue`, `queuePending`, `queueMark` (+ `queueSheetName_`).
3. **Deps:** logging helpers.
4–6. **Tables:** `_Queue` / `_TEST_Queue` (created/read/written).
7. **Owner:** Infrastructure.
8. **Error handling:** inherits sheet helper; caller logs.
9. **Dup protection:** n/a.
10. **Entry points:** none (called by Foundation/Execution).

### foundation/kai_generator.gs
1. **Purpose:** KAI Generation (Deliverable 6) — the SINGLE WRITER.
2. **Public fns:** `kaiMint_`, `kaiIsValid_`.
3. **Deps:** PropertiesService, LockService, `K14`.
4–6. **Tables:** none. **Script props:** `kai14_counter` / `kai14_counter_test`.
7. **Owner:** Foundation.
8. **Error handling:** throws if lock unavailable (refuse-to-mint).
9. **Dup protection:** LockService serializes counter RMW (the collision guarantee).
10. **Entry points:** none (called by candidate/proofs).

### foundation/client.gs
1. **Purpose:** Client entity, FK target.
2. **Public fns:** `clientFindOrCreate`.
3. **Deps:** logging.
4–6. **Tables:** `_Clients` (created/read/written).
7. **Owner:** Foundation.
8. **Error:** throws if name empty.
9. **Dup protection:** find-or-create by name (case-insensitive).
10. **Entry points:** none (called by requirement).

### foundation/campaign.gs
1. **Purpose:** Campaign entity, Rule 13 default.
2. **Public fns:** `campaignEnsureDefault`, `campaignFindOrCreate`.
3. **Deps:** logging.
4–6. **Tables:** `_Campaigns`.
7. **Owner:** Foundation.
8. **Error:** none thrown (defaults).
9. **Dup protection:** find-or-create by (clientId,name); default id constant.
10. **Entry points:** none.

### foundation/candidate.gs
1. **Purpose:** Candidate Creation (Deliverable 5), atomic.
2. **Public fns:** `candidateCreate_`, `candidateGetByKai_`, `candidateAll_` (+ `candidateRowToObj_`, schema consts `CANDIDATE_HEADERS`, `META_HEADERS`).
3. **Deps:** `kaiMint_`, `duplicateCheck_`, `queueEnqueue`, `campaignEnsureDefault`, LockService, logging.
4. **Tables created:** `Candidates`/`_TEST_Candidates`, `_Meta`/`_TEST_Meta`.
5. **Tables read:** `_Meta` (via duplicateCheck_), `Candidates` (getters).
6. **Tables written:** `Candidates`, `_Meta`, `_Queue` (via queueEnqueue).
7. **Owner:** Foundation.
8. **Error handling:** full try/catch/finally; lock always released; returns ERROR/LOCK_TIMEOUT.
9. **Dup protection:** LockService + in-lock `duplicateCheck_` (race guard); `_Meta` written inside lock.
10. **Entry points:** none (called by execution).

### foundation/requirement.gs
1. **Purpose:** Requirement Creation (Deliverable 8), FK-clean.
2. **Public fns:** `requirementCreate`, `requirementGet`, `requirementOpen` (+ `reqIdMint_`).
3. **Deps:** `clientFindOrCreate`, `campaignFindOrCreate`, LockService, logging.
4–6. **Tables:** `_Requirements` (created/read/written), `_Clients`/`_Campaigns` (via FK resolve). **Script prop:** `kai14_req_counter`.
7. **Owner:** Foundation.
8. **Error:** throws if Trade/Client missing.
9. **Dup protection:** client/campaign find-or-create; req IDs lock-minted.
10. **Entry points:** `requirementCreate` (recruiter UI / manual).

### k14/parser.gs
1. **Purpose:** K14 Parsing (Deliverable 3).
2. **Public fns:** `parseCv_`.
3. **Deps:** `geminiJson`, normalizers.
4–6. **Tables:** none.
7. **Owner:** K14.
8. **Error:** propagates gateway throws.
9. **Dup protection:** n/a.
10. **Entry points:** none (called by execution).

### k14/scoring.gs
1. **Purpose:** K14 score/verdict output.
2. **Public fns:** `scoreCandidate_`.
3. **Deps:** none (pure).
4–6. **Tables:** none.
7. **Owner:** K14.
8. **Error:** pure, total function.
9. **Dup protection:** n/a.
10. **Entry points:** none.

### k14/matching.gs
1. **Purpose:** Candidate Matching (Deliverable 9).
2. **Public fns:** `matchRequirement`.
3. **Deps:** `requirementGet`, `candidateAll_`, logging.
4. **Tables created:** none.
5. **Tables read:** `_Requirements`, `Candidates`.
6. **Tables written:** none.
7. **Owner:** K14.
8. **Error:** returns `{ok:false}` if requirement missing.
9. **Dup protection:** n/a (read-only).
10. **Entry points:** `matchRequirement` (recruiter UI / manual).

### intake/cv_parser.gs
1. **Purpose:** CV Extraction (Deliverable 2).
2. **Public fns:** `extractCv_` (+ `cvDriveFolder_`).
3. **Deps:** DriveApp, GmailMessage.
4–6. **Tables:** none (writes Drive files in folder `KAI14_CVs`).
7. **Owner:** Intake.
8. **Error:** returns null if no attachment.
9. **Dup protection:** n/a.
10. **Entry points:** none (called by execution).

### intake/duplicate_engine.gs
1. **Purpose:** Duplicate Detection (Deliverable 4).
2. **Public fns:** `duplicateCheck_`.
3. **Deps:** `_Meta`, normalizers.
4. **Tables created:** none.
5. **Tables read:** `_Meta`/`_TEST_Meta`.
6. **Tables written:** none.
7. **Owner:** Intake.
8. **Error:** total; returns outcome object.
9. **Dup protection:** THIS IS the protection (passport→mobile→email + conflict).
10. **Entry points:** none (called by execution + candidate in-lock).

### intake/gmail_intake.gs
1. **Purpose:** Gmail Intake (Deliverable 1).
2. **Public fns:** `gmailIntakeRun` (+ `gmailLabel_`, `gmailMove_`).
3. **Deps:** GmailApp, `executionProcessThread_`, logging.
4–6. **Tables:** none (Gmail labels only).
7. **Owner:** Intake.
8. **Error:** per-thread try/catch → error label; missing label returns error.
9. **Dup protection:** delegates to chain.
10. **Entry points:** `gmailIntakeRun` (Phase-2 trigger target).

### execution/execution_engine.gs
1. **Purpose:** orchestration + runtime proofs.
2. **Public fns:** `kai14Setup`, `executionProcessThread_`, `kai14ProofSequential`, `kai14ProofConcInstall`, `kai14ProofConcA..E`, `kai14ProofConcReport`, `kai14ProofCleanup`, `kai14RealCvTest`.
3. **Deps:** every layer (composes them).
4. **Tables created:** none directly (delegates).
5. **Tables read:** via getters.
6. **Tables written:** via `candidateCreate_` / `queue` / labels.
7. **Owner:** Execution.
8. **Error:** per-step guards → error label; proofs report verdict.
9. **Dup protection:** pre-lock `duplicateCheck_` then Foundation in-lock guard.
10. **Entry points:** `kai14Setup`, `kai14ProofSequential`, `kai14ProofConcInstall/Report/Cleanup`, `kai14RealCvTest`.

---

## PART 2 — Flow traces

### A. Candidate creation flow
```
gmailIntakeRun
  → executionProcessThread_(thread)
      → extractCv_(message)            → {cvLink, bytesBase64, mimeType, emailText}
      → parseCv_({bytes,mime,text})    → parsed{fullName,email,mobile,passportNo,...}
      → scoreCandidate_(parsed)        → scored{score,verdict,flags,missingFields,state}
      → duplicateCheck_(passport,mobile,email,name)  [PRE-LOCK]
          UNIQUE → candidateCreate_(rec)
              ├ LockService.tryLock
              ├ duplicateCheck_(...)    [IN-LOCK race guard]
              ├ kaiMint_({lockHeld:true})          ← only KAI writer
              ├ Candidates.appendRow(row[KAINo@col1])
              ├ _Meta.appendRow(key,email,mobile,passport,KAINo)
              ├ queueEnqueue(KAINo, INTAKE)
              └ releaseLock
          DUPLICATE → label duplicate    CONFLICT/REVIEW → label error
```
**Seam check (parser → candidate):** every `parsed.X` key is consumed by `rec.X` with the
SAME name (fullName,email,mobile,passportNo,nationality,dob,age,trade,industry,experience,
gulfExperience,education,positionApplied). **MATCH ✓**

### B. Requirement → Match flow
```
requirementCreate(r)
  → clientFindOrCreate(r.clientName)   → ClientID
  → campaignFindOrCreate(...)          → CampaignID
  → reqIdMint_()                       → AYE-REQ-YYYY-NNNN
  → _Requirements.appendRow(FK-clean)
matchRequirement(reqId)
  → requirementGet(reqId)              → req{Trade,MinExperience,Nationality,...}
  → candidateAll_()                    → [c{Trade,Experience,GulfExperience,Nationality,Score,KAINo,FullName,Verdict}]
  → gate on Trade, score exp/gulf/nat  → ranked Top-N
```
**Seam check (requirement & candidate → matching):** matching reads `req.Trade`,
`req.MinExperience`, `req.Nationality` (all in REQUIREMENT_HEADERS) and `c.Trade`,
`c.Experience`, `c.GulfExperience`, `c.Nationality`, `c.Score`, `c.KAINo`, `c.FullName`,
`c.Verdict` (all in CANDIDATE_HEADERS). **MATCH ✓**

### Schema-identity verdict (the integration that matters)
```
Parser output  ≡  candidate record input   ✓ (same key names)
Candidate row  ≡  matching input (header-keyed objects via candidateRowToObj_)  ✓
Dedup input (passport/mobile/email/name) ≡ _Meta columns written by candidate  ✓
Requirement output ≡ matching input  ✓
```
No schema fork found across the four seams.

---

## PART 3 — Required resources

### C. Sheets/tabs (auto-created on first use)
Production: `Candidates`, `_Meta`, `_Queue`, `_Requirements`, `_Clients`, `_Campaigns`, `_Logs`, `_Errors`.
Test (isolated): `_TEST_Candidates`, `_TEST_Meta`, `_TEST_Queue`.

### D. Script Properties
| Property | Required? | Set by |
|----------|-----------|--------|
| `GEMINI_API_KEY` | **YES (manual)** | operator |
| `KAI14_GEMINI_MODEL` | optional (defaults `gemini-2.5-flash`) | operator |
| `kai14_counter` | auto | kaiMint_ |
| `kai14_counter_test` | auto | kaiMint_ (test) |
| `kai14_req_counter` | auto | reqIdMint_ |

### E. Triggers
| Trigger | Required? | When |
|---------|-----------|------|
| time-trigger → `gmailIntakeRun` | Phase 2 only (production intake) | after cutover |
| `kai14ProofConcA..E` (5 temp) | proof only | auto-installed/removed by proof fns |
| **For sequential proof + real-CV test:** NONE | — | run manually |

### F. Functions that call Gemini
`geminiText` / `geminiJson` (gateway) — business caller: **`parseCv_` only**.

### G. Functions that create KAI numbers
**`kaiMint_` ONLY.** Sole caller for candidates: `candidateCreate_` (lockHeld). Proof fns call `candidateCreate_`. (`reqIdMint_` mints AYE-REQ requirement IDs on a separate counter — not KAI.)

### H. Functions that write Candidate rows
**`candidateCreate_` ONLY** (`sheet.appendRow`). No other writer exists.

### I. Functions that can create duplicates
By design: **none.** `candidateCreate_` is the only writer and is guarded by LockService +
in-lock `duplicateCheck_`, with `_Meta` written inside the same lock. Residual risk: if a
candidate is created with NO passport/mobile/email (all blank), `_Meta` key is `||` and
future blank-key records cannot be deduped — mitigated by `duplicateCheck_` returning
`REVIEW` for no-key candidates (they are NOT auto-created; routed to error/review label).

### J. Functions that can delete records
**`kai14ProofCleanup` only** — deletes the three `_TEST_*` sheets (synthetic data) and resets
the TEST counter. **No function deletes any production row.** `queueMark` updates status, never deletes.

---

## PART 4 — Risks / assumptions (honest)

| # | Item | Severity | Note |
|--:|------|----------|------|
| 1 | Runtime unverified | HIGH | Static audit only — sequential/concurrency/real-CV proofs still required. |
| 2 | Gemini PDF inline support | MED | Assumes `gemini-2.5-flash` accepts inline PDF/doc bytes. Validate in real-CV test. |
| 3 | OAuth scopes | MED | First run will prompt for Gmail + Drive + Sheets + external request scopes. |
| 4 | `_Meta` O(n) scan per create | LOW | Linear scan; fine at current volume; revisit if >50k. |
| 5 | `candidateAll_` loads all rows per match | LOW | Acceptable for Phase 1; paginate later if needed. |
| 6 | No-contact candidates → REVIEW | INFO | Intentional: never auto-create an un-dedupable identity. |

---

## VERDICT

```
Static integration audit ......... PASS (no schema fork across the 4 seams)
Single-writer invariant .......... PASS (kaiMint_ only; candidateCreate_ only row writer)
Delete-safety .................... PASS (no production delete path)
Duplicate protection ............. PASS (lock + in-lock recheck + _Meta-in-lock)
Runtime proof .................... NOT YET RUN (required before deploy)
Deployment ....................... NOT APPROVED until runtime proofs pass
```

Next gate: sequential proof → concurrency proof → real Gmail CV → recruiter queue → match.
