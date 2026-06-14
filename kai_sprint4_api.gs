/**
 * ═══════════════════════════════════════════════════════════════════
 *  KAI — Sprint 4 · GAS Web App API Router
 *  Version  : 1.0.0
 *  Date     : 14-Jun-2026
 *
 *  This file is the ONLY entry point for Lovable frontend calls.
 *  Lovable makes HTTP POST requests to the GAS Web App URL.
 *  Every Sprint 1–3 function is reachable via the action router.
 *
 *  DEPLOY
 *    1. In Apps Script: Deploy → New deployment → Web App
 *       Execute as: Me (ai@alyousufent.com)
 *       Who has access: Anyone (or Anyone within organisation)
 *    2. Copy the Web App URL → paste into Lovable as KAI_API_URL env var
 *    3. Run healthCheckApi() to verify all routes resolve
 *
 *  REQUEST FORMAT (all endpoints)
 *    POST <Web App URL>
 *    Content-Type: application/json
 *    Body: { "action": "<actionName>", "params": { ...args } }
 *
 *  RESPONSE FORMAT
 *    Success: { "ok": true,  "data": <result> }
 *    Error:   { "ok": false, "error": "<message>" }
 *
 *  SCREENS → ACTIONS MAP
 *    MatchPanel / AssignToRequirementModal / AssignCandidatesModal
 *      addCandidateToProject   (replaces legacy addSlot path)
 *    Project Candidates screen
 *      getProjectCandidates · removeCandidateFromProject · getCandidateProjects
 *    Submission Batch Queue screen
 *      createSubmissionBatch · getSubmissionBatches · getSubmissionBatch
 *      updateBatchCapacity · updateBatchRemark · generatePackage · submitBatch
 *    Submission Batch detail screen
 *      addCandidateToBatch · removeCandidateFromBatch · getBatchItems · reorderBatchItems
 *      updateItemRemark · getBatchTimelineEvents · closeSubmissionBatch
 *    Submission Package screen
 *      getPackage · getPackagesByBatch · updatePackage
 *    Pipeline screen
 *      getPipelineEntries · getPipelineEntry · updatePipelineStatus
 *      closePipelineEntry · logClientResponse · getClientResponses
 *      getCandidateSubmissionHistory · getBatchSubmissionHistory
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// HTTP ENTRY POINTS
// ───────────────────────────────────────────────────────────────────

function doPost(e) {
  var result;
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = String(body.action || '');
    var params = body.params || {};

    if (!action) {
      result = { ok: false, error: 'action is required.' };
    } else {
      var handler = ROUTES_[action] ||
                    (typeof PERF_ROUTES_ !== 'undefined' ? PERF_ROUTES_[action] : null);
      if (!handler) {
        result = { ok: false, error: 'Unknown action: ' + action + '. See healthCheckApi() for available actions.' };
      } else {
        result = handler(params);
      }
    }
  } catch (ex) {
    result = { ok: false, error: 'API error: ' + ex.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET — lightweight read for ping / health from Lovable
function doGet(e) {
  var action = e.parameter.action || '';
  var result;

  if (action === 'ping') {
    result = { ok: true, data: { status: 'KAI API online', version: '4.0.0' } };
  } else if (action === 'health') {
    result = healthCheckApi();
  } else {
    result = { ok: true, data: { status: 'KAI API online. Use POST with action param.' } };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────────────────────────────────────────────────
// ROUTE MAP — action name → handler function
// ───────────────────────────────────────────────────────────────────

var ROUTES_ = {

  // ── Authentication ─────────────────────────────────────────────
  'login':                     function(p) { return kaiLogin_(p.email, p.password); },

  // ── Project Candidates (Sprint 1 / S61) ────────────────────────
  // Replaces: addSlot in MatchPanel, AssignToRequirementModal, AssignCandidatesModal
  'addCandidateToProject':     function(p) { return addCandidateToProject(p.reqId, p.kaiNo, p.source); },
  'removeCandidateFromProject':function(p) { return removeCandidateFromProject(p.projectCandidateId); },
  'getProjectCandidates':      function(p) { return { ok: true, data: getProjectCandidates(p.reqId) }; },
  'getCandidateProjects':      function(p) { return { ok: true, data: getCandidateProjects(p.kaiNo) }; },

  // ── Submission Batches (Sprint 1 / S62) ────────────────────────
  'createSubmissionBatch':     function(p) { return createSubmissionBatch(p.reqId, p.options); },
  'getSubmissionBatches':      function(p) { return { ok: true, data: getSubmissionBatches(p.filters) }; },
  'getSubmissionBatch':        function(p) { return { ok: true, data: getSubmissionBatch(p.batchId) }; },
  'updateBatchCapacity':       function(p) { return updateBatchCapacity(p.batchId, p.capacity); },
  'updateBatchRemark':         function(p) { return updateBatchRemark(p.batchId, p.remark); },
  'closeSubmissionBatch':      function(p) { return closeSubmissionBatch(p.batchId); },

  // ── Submission Batch Items (Sprint 1 / S63) ────────────────────
  'addCandidateToBatch':       function(p) { return addCandidateToBatch(p.batchId, p.kaiNo); },
  'removeCandidateFromBatch':  function(p) { return removeCandidateFromBatch(p.batchId, p.kaiNo); },
  'getBatchItems':             function(p) { return { ok: true, data: getBatchItems(p.batchId) }; },
  'reorderBatchItems':         function(p) { return reorderBatchItems(p.batchId, p.orderedKaiNos); },
  'updateItemRemark':          function(p) { return updateItemRemark(p.itemId, p.remark); },

  // ── Recruiter Activity Log (Sprint 1 / S64) ───────────────────
  'getActivityLog':            function(p) { return { ok: true, data: getActivityLog(p.filters) }; },

  // ── Submission Packages (Sprint 2 / S71) ──────────────────────
  'generatePackage':           function(p) { return generatePackage(p.batchId, p.options); },
  'getPackage':                function(p) { return { ok: true, data: getPackage(p.packageId) }; },
  'getPackagesByBatch':        function(p) { return { ok: true, data: getPackagesByBatch(p.batchId) }; },
  'updatePackage':             function(p) { return updatePackage(p.packageId, p.updates); },

  // ── Batch Timeline (Sprint 2 / S72) ───────────────────────────
  'getBatchTimelineEvents':    function(p) { return { ok: true, data: getBatchTimelineEvents(p.batchId) }; },

  // ── Batch Submission / Pipeline Entry (Sprint 3 / S81) ────────
  'submitBatch':               function(p) { return submitBatch(p.batchId, p.options); },

  // ── Pipeline (Sprint 3 / S82) ─────────────────────────────────
  'getPipelineEntries':        function(p) { return { ok: true, data: getPipelineEntries(p.filters) }; },
  'getPipelineEntry':          function(p) { return { ok: true, data: getPipelineEntry(p.pipelineId) }; },
  'updatePipelineStatus':      function(p) { return updatePipelineStatus(p.pipelineId, p.newStatus, p.options); },
  'closePipelineEntry':        function(p) { return closePipelineEntry(p.pipelineId, p.closedStatus, p.remark); },

  // ── Client Response Log (Sprint 3 / S83) ─────────────────────
  'logClientResponse':         function(p) { return logClientResponse(p.pipelineId, p.clientResponseStatus, p.responseSource, p.notes); },
  'getClientResponses':        function(p) { return { ok: true, data: getClientResponses(p.filters) }; },

  // ── Candidate Submission History (Sprint 3 / S84) ─────────────
  'getCandidateSubmissionHistory': function(p) { return { ok: true, data: getCandidateSubmissionHistory(p.kaiNo) }; },
  'getBatchSubmissionHistory':     function(p) { return { ok: true, data: getBatchSubmissionHistory(p.batchId) }; }

};

// ───────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ───────────────────────────────────────────────────────────────────

function healthCheckApi() {
  var actions  = Object.keys(ROUTES_);
  var ss       = getMasterSS_();
  var sheets   = [
    '_LoginSystem',
    '_ProjectCandidates','_SubmissionBatches','_SubmissionBatchItems',
    '_RecruiterActivityLog','_Timeline',
    '_SubmissionPackages','_BatchTimeline',
    '_Pipeline','_CandidateSubmissionHistory','_ClientResponseLog'
  ];
  var sheetStatus = sheets.map(function(name) {
    return { sheet: name, exists: !!(ss && ss.getSheetByName(name)) };
  });
  var missing = sheetStatus.filter(function(s) { return !s.exists; }).map(function(s) { return s.sheet; });

  Logger.log('═══ KAI API HEALTH CHECK ═══');
  Logger.log('Routes registered: ' + actions.length);
  Logger.log('Sheets OK    : ' + sheetStatus.filter(function(s) { return s.exists; }).map(function(s) { return s.sheet; }).join(', '));
  if (missing.length) Logger.log('Sheets MISSING: ' + missing.join(', '));
  Logger.log(missing.length ? 'FAIL — run setupSprint1/2/3()' : 'PASS — API ready');

  return {
    ok:             missing.length === 0,
    routeCount:     actions.length,
    routes:         actions,
    sheetsMissing:  missing,
    sheetsOk:       sheetStatus.filter(function(s) { return s.exists; }).map(function(s) { return s.sheet; })
  };
}
