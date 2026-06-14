# KAI Sprint 4 — Lovable Integration Spec

**GAS Web App URL**: set as `KAI_API_URL` env var in Lovable  
**All calls**: `POST KAI_API_URL` · `Content-Type: application/json`  
**All responses**: `{ ok: true, data: ... }` or `{ ok: false, error: "..." }`

---

## 1. MatchPanel / AssignToRequirementModal / AssignCandidatesModal

**Replace `addSlot()` / legacy assignment path with:**

```json
POST KAI_API_URL
{ "action": "addCandidateToProject", "params": { "reqId": "REQ-001", "kaiNo": "KAI-0042", "source": "MANUAL" } }
```
Response: `{ ok: true, projectCandidateId: "PC-20260614-1234", reactivated: false }`

**source values**: `MANUAL` (recruiter picks) · `MATCH` (AI match result)

---

## 2. Project Candidates Screen

| UI Action | Action | Params |
|-----------|--------|--------|
| Load candidates for requirement | `getProjectCandidates` | `{ reqId }` |
| Remove candidate from project | `removeCandidateFromProject` | `{ projectCandidateId }` |
| See all requirements for a candidate | `getCandidateProjects` | `{ kaiNo }` |

---

## 3. Submission Batch Queue Screen

| UI Action | Action | Params |
|-----------|--------|--------|
| List all batches | `getSubmissionBatches` | `{ filters: { status, trade, clientName } }` |
| Create new batch | `createSubmissionBatch` | `{ reqId, options: { capacity, recruiterRemark } }` |
| Get single batch | `getSubmissionBatch` | `{ batchId }` |
| Update capacity | `updateBatchCapacity` | `{ batchId, capacity }` |
| Add remark | `updateBatchRemark` | `{ batchId, remark }` |
| Generate package → mark READY | `generatePackage` | `{ batchId, options: { recruiterRemark } }` |
| Submit batch → SUBMITTED | `submitBatch` | `{ batchId }` |
| Close batch | `closeSubmissionBatch` | `{ batchId }` |
| View batch timeline | `getBatchTimelineEvents` | `{ batchId }` |

---

## 4. Submission Batch Detail Screen

| UI Action | Action | Params |
|-----------|--------|--------|
| Load items | `getBatchItems` | `{ batchId }` |
| Add candidate | `addCandidateToBatch` | `{ batchId, kaiNo }` |
| Remove candidate | `removeCandidateFromBatch` | `{ batchId, kaiNo }` |
| Drag to reorder | `reorderBatchItems` | `{ batchId, orderedKaiNos: ["KAI-001","KAI-002"] }` |
| Add item remark | `updateItemRemark` | `{ itemId, remark }` |

---

## 5. Submission Package Screen

| UI Action | Action | Params |
|-----------|--------|--------|
| Load current package | `getPackagesByBatch` | `{ batchId }` → first result (CURRENT) |
| Get single package | `getPackage` | `{ packageId }` |
| Edit email draft | `updatePackage` | `{ packageId, updates: { emailDraftHtml } }` |
| Save submission sheet URL | `updatePackage` | `{ packageId, updates: { submissionSheetUrl } }` |
| Regenerate (new version) | `generatePackage` | `{ batchId }` |

**cvManifestJson field** — parse and use for ZIP generation:
```json
[
  { "order": 1, "kaiNo": "KAI-001", "candidateName": "John Doe",
    "trade": "Electrician", "nationality": "Indian", "experience": "5 years",
    "cvLink": "https://drive.google.com/...", "cvFileId": "1abc..." }
]
```

---

## 6. Pipeline Screen

| UI Action | Action | Params |
|-----------|--------|--------|
| Load pipeline entries | `getPipelineEntries` | `{ filters: { batchId, reqId, pipelineStatus } }` |
| Get single entry | `getPipelineEntry` | `{ pipelineId }` |
| Advance status | `updatePipelineStatus` | `{ pipelineId, newStatus, options: { interviewType, recruiterRemark } }` |
| Close entry | `closePipelineEntry` | `{ pipelineId, closedStatus, remark }` |
| Log client response | `logClientResponse` | `{ pipelineId, clientResponseStatus, responseSource, notes }` |
| View client responses | `getClientResponses` | `{ filters: { pipelineId } }` |
| Candidate history | `getCandidateSubmissionHistory` | `{ kaiNo }` |

**Pipeline status flow**:
```
SUBMITTED → INTERVIEW_SCHEDULED → INTERVIEWED → SELECTED → OFFERED → OFFER_ACCEPTED
         ↘ REJECTED_BY_CLIENT  (from any active status)
         ↘ WITHDRAWN           (from any active status)
         ↘ ON_HOLD             (from any active status)
```
`interviewType` required only when `newStatus = INTERVIEW_SCHEDULED` (`ONLINE` / `F2F` / `TELEPHONIC`)

**responseSource values**: `EMAIL` · `WHATSAPP` · `PHONE` · `MEETING` · `OTHER`

---

## Deploy Checklist (GAS side)

```
[ ] Deploy as Web App (Execute as: Me, Access: Anyone)
[ ] Copy Web App URL → set KAI_API_URL in Lovable env
[ ] GET KAI_API_URL?action=ping → { ok: true, data: { status: "KAI API online" } }
[ ] GET KAI_API_URL?action=health → routeCount: 34, sheetsMissing: []
```
