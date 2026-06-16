# KAI Bug Report Memory — JD Upload Failure (0 Created / 4 Failed)

---

## PATCH_V293 DEPLOYMENT — COPY-PASTE ACTION PLAN

### PROJECT: ORIGINAL KAI PROJECT (NOT Sky API Bridge)
Sky API Bridge → do nothing.
All steps below are in the ORIGINAL project only.

---

**STEP 1 — Open Apps Script editor**

1. Open the original KAI Google Spreadsheet
2. Extensions → Apps Script

---

**STEP 2 — Add patch_v293 as a new script file**

1. Click `+` next to Files → Script
2. Name it exactly: `patch_v293`
3. Delete the default `function myFunction() {}` placeholder
4. Go to GitHub → branch `claude/sweet-franklin-mnmfcz` → file `patch_v293.txt`
5. Copy entire file content → paste into `patch_v293`
6. Save (Ctrl+S)

---

**STEP 3 — Add patch_v293_test as a new script file**

1. Click `+` next to Files → Script
2. Name it exactly: `patch_v293_test`
3. Delete the default placeholder
4. Go to GitHub → branch `claude/sweet-franklin-mnmfcz` → file `patch_v293_test.gs.txt`
5. Copy entire file content → paste into `patch_v293_test`
6. Save (Ctrl+S)

---

**STEP 4 — Update Dashboard (2 function name changes)**

1. In Apps Script, open the file that contains the KAI Dashboard HTML
   (look for the file with `google.script.run.extractJdPublicV2Fixed`)
2. Find and Replace (Ctrl+H):

   FIND: `extractJdPublicV2Fixed`
   REPLACE WITH: `extractJdPublicV293Fixed`

3. Find and Replace again:

   FIND: `bulkCreateRequirementsFromJDs(`
   REPLACE WITH: `bulkCreateRequirementsFromJDsV293(`

4. Save (Ctrl+S)

---

**STEP 5 — Run Preflight test**

1. In Apps Script, select function: `testPatch_v293_Preflight`
2. Click Run
3. View → Logs
4. All 13 checks must show `[PASS]`

---

**STEP 6 — Upload 4 PDFs to Drive**

1. Go to Google Drive
2. Create a folder named exactly: `KAI_Test_JDs`
3. Upload these 4 files into that folder:
   - Communication Technician PDF
   - Admin Coordinator PDF
   - CP Technician (NACE I/II) PDF
   - Electrical Technician PDF

---

**STEP 7 — Run Full Upload test**

1. In Apps Script, select function: `testPatch_v293_FullUpload`
2. Click Run
3. View → Logs
4. Expected result:

```
4 Requirements Created
0 Failed

Communication Technician   — Department: Project Management
Admin Coordinator          — Department: Operations
CP Technician (NACE I/II)  — Department: Project Management
Electrical Technician      — Department: Project Management
```

---

**STEP 8 — After 4/0 confirmed**

1. Delete the `patch_v293_test` script file from Apps Script
2. Report results back → PATCH_V293 marked COMPLETE → Task 1C unblocked

---

## GitHub Reference

- Repo: `safwanyshaikh/alyousuf-recruitment`
- Branch: `claude/sweet-franklin-mnmfcz`
- `patch_v293.txt` → commit `11efe00`
- `patch_v293_test.gs.txt` → commit `9be7133`

---

## Root Cause (archived)

PDFs use character-level glyph fragmentation. Drive OCR returns empty text.
Fix: `patch_v293` sends PDF as base64 inlineData directly to Gemini multimodal — Gemini reads PDF visually, bypassing Drive OCR entirely.

---

## KAI Board

```
[✓] Task 1A Requirement Detail Page
[✓] Task 1B Client/Project Architecture
[✓] Task 1B Backend Engine
[✓] Candidate Drawer Bug
[🟡] PATCH_V293 — Ready For Live Execution
[ ] Task 1C Auto Redirect
[ ] Task 1D Requirement Actions
[ ] Task 2 Find Matches
[ ] Task 3 Assign Candidate
```
