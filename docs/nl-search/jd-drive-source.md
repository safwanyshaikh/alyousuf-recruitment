# KAI Daily JD Source — Overseas JD Drive Folder

**Status:** LIVE SOURCE
**Module:** `KAI_JD_Drive_Harvester.gs`
**Date:** 2026-06-12

> This Google Drive folder is KAI's daily feeding tube. Overseas JDs land here
> every day; KAI ingests them automatically and uses them to sharpen its
> taxonomy, matches, and every decision across KAI OS.

---

## 1. The Source

| | |
|---|---|
| **Folder** | https://drive.google.com/drive/folders/1Il5PpFBYBEHZ8G8uSajAwFeWhFHFu7dm |
| **Folder ID** | `1Il5PpFBYBEHZ8G8uSajAwFeWhFHFu7dm` |
| **Trial client** | Al Yousuf Enterprises |
| **Dual purpose** | Live trial client demand **+** internal intelligence learning |
| **Update cadence** | Daily — new overseas JDs added by the team |
| **Config location** | `JD_DRIVE_CONFIG.folderId` in `KAI_JD_Drive_Harvester.gs` |

---

## 2. What Happens to Every JD (the daily loop)

```
New JD lands in the Drive folder
        │
        ▼
harvestDriveJDsDaily   (daily trigger, 07:00)
        │
        ├─ Gemini multimodal reads the file (PDF / image / Doc) → structured JD JSON
        │     trade · industry · sector · department · specialization · country ·
        │     qty · experience · nationality · certifications · key skills
        │
        ├─ Writes _JD_Repository   (immortal — every JD kept forever, LOCKED rule)
        │
        ├─ Writes _KAI_Knowledge   (T14 capture — the learning substrate)
        │
        ├─ Moves the file → _KAI_Processed subfolder (never parsed twice)
        │
        └─ Logs _JD_HarvestLog
                 │
                 ▼ (every 7 days)
        learnTaxonomyWeekly reads _KAI_Knowledge
                 │
                 ├─ Detects new trades / aliases / certs the JDs demanded
                 ├─ Queues unknown trades for governance approval
                 └─ Sharpens the taxonomy
                         │
                         ▼
                 nlSearch returns better matches — automatically, forever.
```

**The JD that arrived this morning makes tomorrow's search smarter.**

---

## 3. Two Modes

Set by `JD_DRIVE_CONFIG.mode`:

| Mode | What it does | When to use |
|------|--------------|-------------|
| **LEARNING** (default) | Parse → `_JD_Repository` + `_KAI_Knowledge` only. No live requirements created. | Now — feed the brain daily without cluttering real client dashboards. |
| **REQUIREMENT** | Everything above **plus** creates live requirements + runs matching via the existing `bulkCreateRequirementsFromJDs_` pipeline. | When Al Yousuf goes live as a real recruiting campaign. |

Flip the flag in one line — no other change needed.

---

## 4. Why It Does NOT Pollute Live Data (LEARNING mode)

- It writes to `_JD_Repository` (the immortal sidecar — designed to hold every JD
  ever seen) and `_KAI_Knowledge` (append-only learning sheet).
- It does **not** create `_Requirements` rows, so your real GAS Arabia / NMDC /
  ZAMIL dashboards stay clean.
- Original files are **moved, never deleted** → `_KAI_Processed` subfolder. Full
  audit trail. Re-runs are idempotent (a processed file is out of the inbox).

---

## 5. Where You See the Difference in KAI OS

| Surface | Before | After |
|---------|--------|-------|
| Taxonomy | Static until a developer edits it | Grows from real overseas demand daily |
| Search matches | Limited to trades already known | New overseas trades become searchable |
| Decisions | Based on candidate corpus only | Demand-aware — KAI knows what clients ask for |
| `_JD_HarvestLog` | — | Daily proof: "scanned 12, learned 12" |
| `_KAI_Knowledge` | Grew only on manual JD upload | Grows every single day, automatically |

---

## 6. Safety

- No `ScriptLock`, disjoint from the email pipeline — never blocks CV intake.
- Throttled (`maxFilesPerRun = 30`, 0.8s/file) so a 100-JD dump spreads safely
  across daily runs.
- Unparseable files → `_KAI_Error` subfolder (not lost, not retried forever).
- Gemini uses the existing `GEMINI_API_KEY` + `gemini-2.5-flash-lite` — pennies/day.
- `harvestDriveJDsDaily` is in `BLESSED_TRIGGERS_` (governed by `auditTriggers`).

---

## 7. Setup (one time)

1. Paste `KAI_JD_Drive_Harvester.gs` into the Apps Script project.
2. Confirm the GAS account can read the folder — run `testJDHarvestFolder`
   (logs every file it would parse).
3. Run `harvestDriveJDsDaily` once manually — check `_JD_HarvestLog` +
   `_JD_Repository` + `_KAI_Processed`.
4. Run `installJDHarvestTrigger` once → daily 07:00 intake begins.
5. Leave `mode = 'LEARNING'` until Al Yousuf goes live, then flip to `REQUIREMENT`.

---

## 8. SaaS Migration

`JD_DRIVE_CONFIG.folderId` is the only tenant-specific value. Under multi-tenant
SaaS this becomes one folderId per tenant in a registry (same seam pattern as
`nlResolveTenantSpreadsheet_`). The parse → repository → knowledge → learning
flow is identical for every tenant. Marked `// <SaaS SEAM>` in code.
