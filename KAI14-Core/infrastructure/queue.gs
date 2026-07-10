/**
 * KAI14-Core · infrastructure/queue.gs   (Deliverable 7: Foundation Queue)
 * LAYER OWNER: Infrastructure (services)
 * ───────────────────────────────────────────────────────────────────
 * Durable hand-off buffer. Holds NO business logic — stores/reads/updates
 * queue records only. Test mode redirects to the isolated _TEST_Queue.
 */

var QUEUE_HEADERS = ['QueueID', 'KAINo', 'Step', 'Status', 'FailureReason',
                     'RetryCount', 'CreatedAt', 'UpdatedAt'];

var QUEUE_STEP   = { INTAKE: 'INTAKE', MATCH: 'MATCH' };
var QUEUE_STATUS = { PENDING: 'PENDING', DONE: 'DONE', FAILED: 'FAILED' };

function queueSheetName_(testMode) {
  return testMode ? K14.testSheets.queue : K14.sheets.queue;
}

/** Enqueue one record. Returns the QueueID. Caller may already hold the lock. */
function queueEnqueue(kaiNo, step, testMode) {
  var sh = K14_sheet_(queueSheetName_(testMode), QUEUE_HEADERS);
  var id = 'Q-' + new Date().getTime() + '-' + Math.floor(Math.random() * 9000 + 1000);
  sh.appendRow([id, kaiNo, step || QUEUE_STEP.INTAKE, QUEUE_STATUS.PENDING, '', 0,
                K14_now_(), K14_now_()]);
  return id;
}

/** Read PENDING records (optionally filtered by step). */
function queuePending(step, testMode) {
  var sh = K14_sheet_(queueSheetName_(testMode), QUEUE_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var data = sh.getRange(2, 1, last - 1, QUEUE_HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][3]) === QUEUE_STATUS.PENDING &&
        (!step || String(data[i][2]) === step)) {
      out.push({ row: i + 2, queueId: data[i][0], kaiNo: data[i][1], step: data[i][2] });
    }
  }
  return out;
}

function queueMark(row, status, reason, testMode) {
  var sh = K14_sheet_(queueSheetName_(testMode), QUEUE_HEADERS);
  sh.getRange(row, 4).setValue(status);
  if (reason) sh.getRange(row, 5).setValue(reason);
  sh.getRange(row, 8).setValue(K14_now_());
}
