# KAI Bug Report Memory — JD Upload Failure (0 Created / 4 Failed)

## Status: ROOT CAUSE IDENTIFIED — Fix NOT yet implemented

---

## Confirmed Facts (verbatim code verified)

### extractSingleJdBlock_v291_ — Gemini prompt (EXACT)

```
{"trade":"","quantity":1,"deployCountry":"","location":"","minExperience":0,"maxExperience":0,
"educationReq":"","salary":"","clientName":"","localTransfer":false,"visitVisaOK":false,
"gccPreference":false,"languageReq":"","certifications":[],"urgency":"NORMAL",
"specialRequirements":{"rotation":"","accommodation":"","transport":"","iqamaTransfer":false},
"externalRefNo":"","notes":""}
```

NO `department` field in prompt. NO `department` anywhere in patch_v291.txt or KAI_16May2026_V2_Dashboard.txt.

### Validation gate (patch_v291, extractJdV284_v291_)

```javascript
if (jd.trade || jd.externalRefNo) result.jds.push(jd);
```

If neither `trade` nor `externalRefNo` is set → JD silently dropped → `result.ok = false` → caller returns `"Could not identify a valid JD."`.

### Regex fallback in extractSingleJdBlock_v291_

```javascript
var tradePatterns = [
  /^position\s*:\s*([^\n]+)/im,    // FAILS on "Position Title: C.P.TECHNICIAN"
  /job\s+title\s*[:\s]+([^\n]+)/i,
  /role\s*:\s*([^\n]+)/i,
  /seeking\s+(?:a\s+)?([^\n]+?)(?:\s+to\s+join|\s+for|\s*$)/i
];
```

Pattern 1 fails because "Title" sits between "Position" and ":". PDFs use "Position Title:" not "Position:".

### Dashboard confirmed

- `bulkCreateRequirementsFromJDs` → NOT FOUND in KAI_16May2026_V2_Dashboard.txt
- `department` → NOT FOUND anywhere in dashboard
- `processJdFile` → index 171532
- `renderJdResult` → index 179016
- `confirmSaveMultiJds` → calls `saveMultiJdBatch` (NOT `bulkCreateRequirementsFromJDs`)

---

## Root Cause Summary

A. PDFs use HR template format: "Position Title: ROLE" — not Gulf demand format: "Position: ROLE"
B. Gemini extracts no `trade`, no `externalRefNo` → validation gate drops all JDs
C. `extractJdPublicV2Fixed` returns `{ ok: false, msg: "Could not identify a valid JD." }` for all 4 files
D. `department` field does not exist in schema at all — UI showing it is from NEW frontend code not in current dashboard

---

## Fix Plan (NOT implemented — awaiting approval)

File to create: `patch_v293.txt`

### Fix 1 — Add "Position Title" regex to tradePatterns

```javascript
// BEFORE (line ~1 of tradePatterns array in extractSingleJdBlock_v291_):
/^position\s*:\s*([^\n]+)/im,

// AFTER:
/position\s+title\s*:\s*([^\n]+)/im,
/^position\s*:\s*([^\n]+)/im,
```

### Fix 2 — Add department to Gemini prompt

```javascript
// Add to the JSON fields string:
'"department":"",'
// After "trade":""
```

### Fix 3 — Add department to saveRequirementV284_ schema (patch_v284)

Column 19 in `_Requirements` sheet: `Department`

### Fix 4 — Return department in requirements[] response

In `bulkCreateRequirementsFromJDs` (patch_v292, S92.F06), add `department: jd.department||''` to requirements push.

---

## Files Involved

| File | Role | Status |
|------|------|--------|
| patch_v291.txt | extractSingleJdBlock_v291_, extractJdPublicV2Fixed | EXISTS on branch |
| patch_v284.txt | saveRequirementV284_ | EXISTS on branch |
| patch_v292.txt | bulkCreateRequirementsFromJDs | CREATED on branch |
| patch_v293.txt | JD extraction fix | NOT YET CREATED |
| KAI_16May2026_V2_Dashboard.txt | Frontend upload UI | NOT MODIFIED |

Branch: `claude/sweet-franklin-mnmfcz`
Repo: `safwanyshaikh/alyousuf-recruitment`
