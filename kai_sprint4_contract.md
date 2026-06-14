# KAI Sprint 4A — Backend Contract

**Version**: 1.0.0  
**Date**: 14-Jun-2026  
**Base URL**: `KAI_API_URL` (GAS Web App URL, set in Lovable env)  
**Protocol**: `POST KAI_API_URL` · `Content-Type: application/json`  
**Auth**: GAS session (Execute as: ai@alyousufent.com · Access: Anyone in org)

---

## Global Request / Response

### Request envelope
```json
{ "action": "<actionName>", "params": { ...args } }
```

### Success envelope
```json
{ "ok": true, "data": <result> }
```

### Error envelope
```json
{ "ok": false, "error": "<message>" }
```

### GET — connectivity
```
GET KAI_API_URL?action=ping
→ { "ok": true, "data": { "status": "KAI API online", "version": "4.0.0" } }

GET KAI_API_URL?action=health
→ { "ok": true, "routeCount": 34, "sheetsMissing": [], "sheetsOk": [...] }
```

---

## ENDPOINT MATRIX

---

### GROUP 1 — Project Candidates

Replaces legacy `addSlot` path in MatchPanel, AssignToRequirementModal, AssignCandidatesModal.

---

#### `addCandidateToProject`

| Field | Value |
|-------|-------|
| Action | `addCandidateToProject` |
| Sheet written | `_ProjectCandidates` |
| Idempotent | Yes — reactivates if soft-removed |

**Request**
```json
{
  "action": "addCandidateToProject",
  "params": {
    "reqId":  "REQ-001",
    "kaiNo":  "KAI-0042",
    "source": "MANUAL"
  }
}
```

**Params**

| Param | Type | Required | Values |
|-------|------|----------|--------|
| `reqId` | string | Yes | Any valid requirement ID |
| `kaiNo` | string | Yes | Any valid KAI number |
| `source` | string | No | `MANUAL` (default) · `MATCH` |

**Response (success)**
```json
{ "ok": true, "projectCandidateId": "PC-20260614-4821", "reactivated": false }
```

**Error responses**

| Error | Cause |
|-------|-------|
| `reqId is required.` | Missing reqId |
| `kaiNo is required.` | Missing kaiNo |
| `source must be MATCH or MANUAL.` | Invalid source value |
| `Candidate KAI-0042 already in project REQ-001.` | Active duplicate |

---

#### `removeCandidateFromProject`

**Request**
```json
{ "action": "removeCandidateFromProject", "params": { "projectCandidateId": "PC-20260614-4821" } }
```

**Response**
```json
{ "ok": true }
```

**Errors**: `projectCandidateId is required.` · `Project candidate not found.` · `Already removed.`

---

#### `getProjectCandidates`

**Request**
```json
{ "action": "getProjectCandidates", "params": { "reqId": "REQ-001" } }
```

**Response**
```json
{
  "ok": true,
  "data": [
    {
      "projectCandidateId": "PC-20260614-4821",
      "reqId": "REQ-001",
      "kaiNo": "KAI-0042",
      "source": "MANUAL",
      "addedAt": "2026-06-14T10:00:00Z",
      "addedBy": "recruiter@alyousufent.com",
      "recruiterRemark": ""
    }
  ]
}
```

---

#### `getCandidateProjects`

**Request**
```json
{ "action": "getCandidateProjects", "params": { "kaiNo": "KAI-0042" } }
```

**Response**: array of `{ projectCandidateId, reqId, source, addedAt, addedBy }`

---

### GROUP 2 — Submission Batches

---

#### `createSubmissionBatch`

**Request**
```json
{
  "action": "createSubmissionBatch",
  "params": {
    "reqId": "REQ-001",
    "options": {
      "capacity": 8,
      "recruiterRemark": "Priority batch for client XYZ"
    }
  }
}
```

**Params**

| Param | Type | Required | Constraint |
|-------|------|----------|------------|
| `reqId` | string | Yes | Must exist in `_Requirements` with trade set |
| `options.capacity` | int | No | 1–20 (default: `_Config.submission_batch_capacity`) |
| `options.recruiterRemark` | string | No | Max 300 chars |

**Response**
```json
{ "ok": true, "batchId": "SUB-2026-0001" }
```

**Errors**: `reqId is required.` · `Requirement not found.` · `Requirement has no trade.` · `Capacity must be 1–20.`

---

#### `getSubmissionBatches`

**Request**
```json
{
  "action": "getSubmissionBatches",
  "params": {
    "filters": {
      "status": "DRAFT",
      "trade": "Electrician",
      "clientName": "ADNOC",
      "createdBy": "recruiter@alyousufent.com"
    }
  }
}
```

`status` = exact match. `trade` / `clientName` = partial match (case-insensitive). `createdBy` = exact.

**Response**: array of batch objects (see schema below)

**Batch object schema**
```json
{
  "batchId": "SUB-2026-0001",
  "reqId": "REQ-001",
  "clientName": "ADNOC",
  "trade": "Electrician",
  "status": "DRAFT",
  "capacity": 10,
  "itemCount": 3,
  "createdAt": "2026-06-14T10:00:00Z",
  "createdBy": "recruiter@alyousufent.com",
  "readyAt": "", "readyBy": "",
  "submittedAt": "", "submittedBy": "",
  "closedAt": "", "closedBy": "",
  "recruiterRemark": ""
}
```

---

#### `getSubmissionBatch`

**Request**: `{ "action": "getSubmissionBatch", "params": { "batchId": "SUB-2026-0001" } }`  
**Response**: `{ "ok": true, "data": <batchObject> }` or `{ "ok": true, "data": null }` if not found

---

#### `updateBatchCapacity`

**Request**: `{ "action": "updateBatchCapacity", "params": { "batchId": "SUB-2026-0001", "capacity": 15 } }`  
**Validation**: DRAFT only · capacity 1–20 · capacity ≥ itemCount  
**Errors**: `Capacity can only change on DRAFT batches.` · `Capacity cannot be less than current item count (N).`

---

#### `updateBatchRemark`

**Request**: `{ "action": "updateBatchRemark", "params": { "batchId": "SUB-2026-0001", "remark": "DRAFT - priority batch" } }`  
**Validation**: max 300 chars

---

#### `closeSubmissionBatch`

**Request**: `{ "action": "closeSubmissionBatch", "params": { "batchId": "SUB-2026-0001" } }`  
**Validation**: status must be `SUBMITTED`  
**Error**: `Only SUBMITTED batches can be closed. Current: READY`

---

### GROUP 3 — Submission Batch Items

---

#### `addCandidateToBatch`

**Request**
```json
{ "action": "addCandidateToBatch", "params": { "batchId": "SUB-2026-0001", "kaiNo": "KAI-0042" } }
```

**Validation**: batch must be DRAFT · itemCount < capacity · no active duplicate  
**Response**: `{ "ok": true, "itemId": "ITEM-20260614-1234", "cvLink": "https://drive.google.com/..." }`  
**Errors**: `Batch is at capacity (10).` · `Candidate already in batch.` · `Items can only be added to DRAFT batches.`

---

#### `removeCandidateFromBatch`

**Request**: `{ "action": "removeCandidateFromBatch", "params": { "batchId": "SUB-2026-0001", "kaiNo": "KAI-0042" } }`  
**Validation**: batch must be DRAFT or READY  
**Error**: `Cannot remove items from a SUBMITTED batch.`

---

#### `getBatchItems`

**Request**: `{ "action": "getBatchItems", "params": { "batchId": "SUB-2026-0001" } }`

**Response**: sorted by `displayOrder`
```json
{
  "ok": true,
  "data": [
    {
      "itemId": "ITEM-20260614-1234",
      "batchId": "SUB-2026-0001",
      "kaiNo": "KAI-0042",
      "cvLink": "https://drive.google.com/file/d/1abc.../view",
      "cvFileId": "1abc...",
      "addedAt": "2026-06-14T10:05:00Z",
      "addedBy": "recruiter@alyousufent.com",
      "displayOrder": 1,
      "recruiterRemark": ""
    }
  ]
}
```

---

#### `reorderBatchItems`

**Request**
```json
{
  "action": "reorderBatchItems",
  "params": {
    "batchId": "SUB-2026-0001",
    "orderedKaiNos": ["KAI-0055", "KAI-0042", "KAI-0031"]
  }
}
```
**Validation**: batch must be DRAFT

---

#### `updateItemRemark`

**Request**: `{ "action": "updateItemRemark", "params": { "itemId": "ITEM-...", "remark": "DRAFT - strong candidate" } }`  
**Validation**: max 300 chars

---

### GROUP 4 — Submission Packages

---

#### `generatePackage`

**Request**
```json
{
  "action": "generatePackage",
  "params": {
    "batchId": "SUB-2026-0001",
    "options": { "recruiterRemark": "READY - approved for client submission" }
  }
}
```

**Validation**:
- Batch must be DRAFT or READY
- Batch must have items
- `items.length` must not exceed `batch.capacity`

**What fires**:
- If DRAFT: transitions batch to READY (sets `readyAt`, `readyBy`)
- Marks prior CURRENT package as SUPERSEDED
- Creates new CURRENT package (new version number)
- Builds `emailDraftHtml` and `cvManifestJson`
- Writes `_BatchTimeline` + `_Timeline`

**Response**: `{ "ok": true, "packageId": "PKG-...", "version": 1, "itemCount": 3 }`

**Errors**: `Batch has no items.` · `Item count (N) exceeds batch capacity (M).` · `Cannot generate package for a SUBMITTED batch.`

---

#### `getPackage`

**Request**: `{ "action": "getPackage", "params": { "packageId": "PKG-..." } }`

**Package object schema**
```json
{
  "packageId": "PKG-20260614-5521",
  "batchId": "SUB-2026-0001",
  "reqId": "REQ-001",
  "version": 1,
  "packageStatus": "CURRENT",
  "emailDraftHtml": "<html>...</html>",
  "submissionSheetUrl": "",
  "cvManifestJson": "[{\"order\":1,\"kaiNo\":\"KAI-0042\",\"candidateName\":\"John Doe\",\"trade\":\"Electrician\",\"nationality\":\"Indian\",\"experience\":\"5 years\",\"cvLink\":\"...\",\"cvFileId\":\"...\"}]",
  "itemCount": 3,
  "generatedAt": "2026-06-14T10:10:00Z",
  "generatedBy": "recruiter@alyousufent.com",
  "recruiterRemark": ""
}
```

---

#### `getPackagesByBatch`

**Request**: `{ "action": "getPackagesByBatch", "params": { "batchId": "SUB-2026-0001" } }`  
**Response**: array sorted newest first · first item is always CURRENT

---

#### `updatePackage`

**Request**
```json
{
  "action": "updatePackage",
  "params": {
    "packageId": "PKG-...",
    "updates": {
      "emailDraftHtml": "<html>...edited...</html>",
      "submissionSheetUrl": "https://docs.google.com/spreadsheets/d/...",
      "remark": "READY - email edited, sheet attached"
    }
  }
}
```

**Validation**: only CURRENT packages can be updated  
**Response**: `{ "ok": true, "updated": ["emailDraftHtml", "submissionSheetUrl"] }`

---

### GROUP 5 — Batch Submission

---

#### `submitBatch`

**Request**: `{ "action": "submitBatch", "params": { "batchId": "SUB-2026-0001" } }`

**What fires**:
- Batch must be READY with active items and a CURRENT package
- Transitions batch READY → SUBMITTED
- Creates one `_Pipeline` row per candidate (status = `SUBMITTED`, clientResponseStatus = `NO_RESPONSE`)
- Creates one `_CandidateSubmissionHistory` row per candidate (append-only)
- Writes `_BatchTimeline` + `_Timeline`

**Response**: `{ "ok": true, "submittedCount": 3, "pipelineIds": ["PIPE-...", "PIPE-...", "PIPE-..."] }`

**Errors**: `Only READY batches can be submitted.` · `No CURRENT package for batch.` · `Batch has no active items.`

---

### GROUP 6 — Pipeline

---

#### `getPipelineEntries`

**Request**
```json
{
  "action": "getPipelineEntries",
  "params": {
    "filters": {
      "batchId": "SUB-2026-0001",
      "reqId": "REQ-001",
      "kaiNo": "KAI-0042",
      "pipelineStatus": "SUBMITTED",
      "clientResponseStatus": "SHORTLISTED"
    }
  }
}
```

**Pipeline entry schema**
```json
{
  "pipelineId": "PIPE-20260614-7712",
  "batchId": "SUB-2026-0001",
  "reqId": "REQ-001",
  "kaiNo": "KAI-0042",
  "packageId": "PKG-...",
  "pipelineStatus": "SUBMITTED",
  "interviewType": "",
  "clientResponseStatus": "NO_RESPONSE",
  "addedAt": "2026-06-14T10:15:00Z",
  "addedBy": "recruiter@alyousufent.com",
  "updatedAt": "", "updatedBy": "",
  "closedAt": "", "closedBy": "", "closedStatus": "",
  "recruiterRemark": ""
}
```

---

#### `updatePipelineStatus`

**Request**
```json
{
  "action": "updatePipelineStatus",
  "params": {
    "pipelineId": "PIPE-...",
    "newStatus": "INTERVIEW_SCHEDULED",
    "options": {
      "interviewType": "F2F",
      "recruiterRemark": "INTERVIEW_SCHEDULED - F2F at client site 20-Jun"
    }
  }
}
```

**Valid transitions**

| From | To (allowed) |
|------|--------------|
| `SUBMITTED` | `INTERVIEW_SCHEDULED` · `REJECTED_BY_CLIENT` · `WITHDRAWN` · `ON_HOLD` |
| `INTERVIEW_SCHEDULED` | `INTERVIEWED` · `REJECTED_BY_CLIENT` · `WITHDRAWN` · `ON_HOLD` |
| `INTERVIEWED` | `SELECTED` · `REJECTED_BY_CLIENT` · `WITHDRAWN` · `ON_HOLD` |
| `SELECTED` | `OFFERED` · `REJECTED_BY_CLIENT` · `WITHDRAWN` · `ON_HOLD` |
| `OFFERED` | `OFFER_ACCEPTED` · `REJECTED_BY_CLIENT` · `WITHDRAWN` · `ON_HOLD` |

**`interviewType` required only when `newStatus = INTERVIEW_SCHEDULED`**  
Values: `ONLINE` · `F2F` · `TELEPHONIC`

**Errors**: `Invalid transition: SUBMITTED → OFFERED.` · `interviewType is required for INTERVIEW_SCHEDULED.` · `Pipeline entry is in terminal status OFFER_ACCEPTED.`

---

#### `closePipelineEntry`

**Request**: `{ "action": "closePipelineEntry", "params": { "pipelineId": "PIPE-...", "closedStatus": "OFFER_ACCEPTED", "remark": "OFFER_ACCEPTED - joins 01-Jul-2026" } }`  
**closedStatus values**: `REJECTED_BY_CLIENT` · `WITHDRAWN` · `ON_HOLD` · `OFFER_ACCEPTED`

---

### GROUP 7 — Client Response Log

---

#### `logClientResponse`

**Request**
```json
{
  "action": "logClientResponse",
  "params": {
    "pipelineId": "PIPE-...",
    "clientResponseStatus": "SHORTLISTED",
    "responseSource": "WHATSAPP",
    "notes": "Client confirmed shortlisted via WhatsApp 14-Jun"
  }
}
```

**`clientResponseStatus` values**: `NO_RESPONSE` · `SHORTLISTED` · `ON_HOLD` · `MORE_INFO` · `REJECTED`  
**`responseSource` values**: `EMAIL` · `WHATSAPP` · `PHONE` · `MEETING` · `OTHER`

**What fires**: appends to `_ClientResponseLog` AND updates `clientResponseStatus` on the pipeline entry.

**Response**: `{ "ok": true, "responseId": "CRL-..." }`

---

#### `getClientResponses`

**Request**: `{ "action": "getClientResponses", "params": { "filters": { "pipelineId": "PIPE-..." } } }`

**Client response object**
```json
{
  "responseId": "CRL-20260614-3301",
  "pipelineId": "PIPE-...",
  "batchId": "SUB-2026-0001",
  "reqId": "REQ-001",
  "kaiNo": "KAI-0042",
  "clientResponseStatus": "SHORTLISTED",
  "responseSource": "WHATSAPP",
  "notes": "Client confirmed shortlisted via WhatsApp 14-Jun",
  "respondedAt": "2026-06-14T11:00:00Z",
  "loggedBy": "recruiter@alyousufent.com"
}
```

---

### GROUP 8 — Submission History

---

#### `getCandidateSubmissionHistory`

**Request**: `{ "action": "getCandidateSubmissionHistory", "params": { "kaiNo": "KAI-0042" } }`  
**Response**: array of `{ historyId, batchId, reqId, kaiNo, packageId, pipelineId, submittedAt, submittedBy }`

---

#### `getBatchSubmissionHistory`

**Request**: `{ "action": "getBatchSubmissionHistory", "params": { "batchId": "SUB-2026-0001" } }`

---

### GROUP 9 — Read-only utility

---

#### `getActivityLog`

**Request**: `{ "action": "getActivityLog", "params": { "filters": { "batchId": "SUB-2026-0001" } } }`  
Filters: `entityType` · `batchId` · `kaiNo` · `reqId`

#### `getBatchTimeline`

**Request**: `{ "action": "getBatchTimeline", "params": { "batchId": "SUB-2026-0001" } }`

#### `getBatchTimelineEvents`

**Request**: `{ "action": "getBatchTimelineEvents", "params": { "batchId": "SUB-2026-0001" } }`

---

## LEGACY MIGRATION MATRIX

| Legacy identifier | Classification | Action |
|-------------------|----------------|--------|
| `addSlot(reqId, kaiNo)` | **REPLACE** | → `addCandidateToProject(reqId, kaiNo, 'MANUAL')` |
| `updateSlot(slotId, data)` | **REPLACE** | → `updatePipelineStatus(pipelineId, newStatus, options)` |
| `slots` (collection) | **DEPRECATE** | → `_ProjectCandidates` for pool; `_Pipeline` after submission |
| `_CandidateSlots` (sheet) | **DEPRECATE** | Do not write; read legacy data only during transition |
| `addSlot` in MatchPanel | **REPLACE** | → `addCandidateToProject` via `POST action=addCandidateToProject` |
| `addSlot` in AssignToRequirementModal | **REPLACE** | → same |
| `addSlot` in AssignCandidatesModal | **REPLACE** | → same |

---

## WIRING MAP — Legacy → New

### MatchPanel

```
OLD:  POST /addSlot  { reqId, kaiNo }
NEW:  POST KAI_API_URL
      { "action": "addCandidateToProject", "params": { "reqId": reqId, "kaiNo": kaiNo, "source": "MATCH" } }
```

### AssignToRequirementModal

```
OLD:  addSlot(selectedReqId, candidate.kaiNo)
NEW:  POST KAI_API_URL
      { "action": "addCandidateToProject", "params": { "reqId": selectedReqId, "kaiNo": candidate.kaiNo, "source": "MANUAL" } }
```

### AssignCandidatesModal

```
OLD:  candidates.forEach(c => addSlot(reqId, c.kaiNo))
NEW:  candidates.forEach(c =>
        POST KAI_API_URL
        { "action": "addCandidateToProject", "params": { "reqId": reqId, "kaiNo": c.kaiNo, "source": "MANUAL" } }
      )
```
Note: call sequentially (not parallel) — GAS does not support concurrent writes to the same sheet.

---

## SCREEN → ENDPOINT MAP

### Project Candidates Screen
```
Load:   getProjectCandidates { reqId }
Add:    addCandidateToProject { reqId, kaiNo, source }
Remove: removeCandidateFromProject { projectCandidateId }
X-ref:  getCandidateProjects { kaiNo }
```

### Submission Batch Queue Screen
```
Load:   getSubmissionBatches { filters }
Create: createSubmissionBatch { reqId, options }
Open:   getSubmissionBatch { batchId }
Update: updateBatchCapacity / updateBatchRemark
Action: generatePackage → submitBatch → closeSubmissionBatch
```

### Submission Batch Detail Screen
```
Load:   getBatchItems { batchId }
Add:    addCandidateToBatch { batchId, kaiNo }
Remove: removeCandidateFromBatch { batchId, kaiNo }
Reorder: reorderBatchItems { batchId, orderedKaiNos }
Timeline: getBatchTimelineEvents { batchId }
```

### Submission Package Screen
```
Load:    getPackagesByBatch { batchId } → first = CURRENT
Preview: emailDraftHtml field (render as innerHTML)
CVs:     parse cvManifestJson → list files for ZIP
Edit:    updatePackage { packageId, updates }
Regen:   generatePackage { batchId }
```

### Pipeline Screen
```
Load:   getPipelineEntries { filters }
Detail: getPipelineEntry { pipelineId }
Advance: updatePipelineStatus { pipelineId, newStatus, options }
Close:  closePipelineEntry { pipelineId, closedStatus, remark }
History: getCandidateSubmissionHistory { kaiNo }
```

### Client Response Log Screen
```
Log:    logClientResponse { pipelineId, clientResponseStatus, responseSource, notes }
Load:   getClientResponses { filters: { pipelineId } }
```

---

## END-TO-END UAT CHECKLIST

Full flow: Candidate → Project → Batch → Package → Submit → Pipeline → Offer Accepted

```
SETUP
[ ] setupSprint1() + setupSprint2() + setupSprint3()        → all 10 sheets created
[ ] GET KAI_API_URL?action=ping                             → { ok: true }
[ ] GET KAI_API_URL?action=health                           → routeCount: 34, sheetsMissing: []

STEP 1 — Add candidate to project
[ ] POST addCandidateToProject { reqId:"REQ-001", kaiNo:"KAI-0042", source:"MANUAL" }
    → ok:true, projectCandidateId:"PC-...", reactivated:false
[ ] POST addCandidateToProject (same params)
    → ok:false "already in project"
[ ] POST getProjectCandidates { reqId:"REQ-001" }
    → array length = 1

STEP 2 — Create and populate batch
[ ] POST createSubmissionBatch { reqId:"REQ-001", options:{ capacity:5 } }
    → ok:true, batchId:"SUB-2026-0001"
[ ] POST addCandidateToBatch { batchId:"SUB-2026-0001", kaiNo:"KAI-0042" }
    → ok:true, itemId:"ITEM-..."
[ ] POST getBatchItems { batchId:"SUB-2026-0001" }
    → array length = 1, displayOrder = 1

STEP 3 — Generate package (DRAFT → READY)
[ ] POST generatePackage { batchId:"SUB-2026-0001" }
    → ok:true, version:1, itemCount:1
    → batch status = READY
    → getPackagesByBatch → [{ packageStatus:"CURRENT", version:1 }]
    → emailDraftHtml contains candidate row
    → cvManifestJson has candidateName, trade, nationality, experience

STEP 4 — Edit package
[ ] POST updatePackage { packageId:"PKG-...", updates:{ submissionSheetUrl:"https://..." } }
    → ok:true, updated:["submissionSheetUrl"]

STEP 5 — Submit batch (READY → SUBMITTED)
[ ] POST submitBatch { batchId:"SUB-2026-0001" }
    → ok:true, submittedCount:1, pipelineIds:["PIPE-..."]
    → batch status = SUBMITTED
    → getPipelineEntries { filters:{ batchId:"SUB-2026-0001" } } → 1 entry, status=SUBMITTED
    → getCandidateSubmissionHistory { kaiNo:"KAI-0042" } → 1 record

STEP 6 — Pipeline progression
[ ] POST updatePipelineStatus { pipelineId:"PIPE-...", newStatus:"INTERVIEW_SCHEDULED", options:{ interviewType:"F2F" } }
    → ok:true, fromStatus:"SUBMITTED", toStatus:"INTERVIEW_SCHEDULED"
[ ] POST updatePipelineStatus { pipelineId:"PIPE-...", newStatus:"SUBMITTED" }
    → ok:false "Invalid transition"
[ ] POST updatePipelineStatus { pipelineId:"PIPE-...", newStatus:"INTERVIEWED" }
    → ok:true
[ ] POST updatePipelineStatus { pipelineId:"PIPE-...", newStatus:"SELECTED" }   → ok:true
[ ] POST updatePipelineStatus { pipelineId:"PIPE-...", newStatus:"OFFERED" }    → ok:true

STEP 7 — Client response
[ ] POST logClientResponse { pipelineId:"PIPE-...", clientResponseStatus:"SHORTLISTED", responseSource:"WHATSAPP", notes:"Confirmed" }
    → ok:true, responseId:"CRL-..."
    → getPipelineEntry → clientResponseStatus = "SHORTLISTED"
[ ] POST logClientResponse { responseSource:"TELEGRAM" }
    → ok:false "Invalid responseSource"

STEP 8 — Offer accepted (terminal)
[ ] POST closePipelineEntry { pipelineId:"PIPE-...", closedStatus:"OFFER_ACCEPTED", remark:"OFFER_ACCEPTED - joins 01-Jul-2026" }
    → ok:true
    → getPipelineEntry → pipelineStatus = "OFFER_ACCEPTED", closedAt populated
[ ] POST updatePipelineStatus { pipelineId:"PIPE-...", newStatus:"SELECTED" }
    → ok:false "Pipeline entry is in terminal status OFFER_ACCEPTED"

STEP 9 — Close batch
[ ] POST closeSubmissionBatch { batchId:"SUB-2026-0001" }
    → ok:true
    → getSubmissionBatch → status = "CLOSED"

COMPLETE — full KAI FLOW traversed end-to-end.
```
