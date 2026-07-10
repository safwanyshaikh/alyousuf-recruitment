/**
 * KAI14-Core · intake/gmail_intake.gs   (Deliverable 1: Gmail Intake)
 * LAYER OWNER: Intake (ingestion)
 * ───────────────────────────────────────────────────────────────────
 * Scans the kai14/intake label and hands each thread to the execution
 * engine. This is the production entry point (run by a time trigger once
 * KAI14 is primary — Phase 2). Holds NO parse/score/identity logic.
 */

function gmailLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function gmailMove_(thread, fromName, toName) {
  try {
    var from = GmailApp.getUserLabelByName(fromName);
    if (from) thread.removeLabel(from);
    thread.addLabel(gmailLabel_(toName));
  } catch (e) { logError('Intake', 'gmailMove_', e.message, fromName + '→' + toName); }
}

/**
 * gmailIntakeRun — process up to `max` threads from the intake label.
 * @param {number} [max]
 * @returns {object} summary counts
 */
function gmailIntakeRun(max) {
  max = max || 5;
  var label = GmailApp.getUserLabelByName(K14.labels.input);
  if (!label) { logError('Intake', 'gmailIntakeRun', 'intake label missing: ' + K14.labels.input);
    return { ok: false, error: 'intake label missing' }; }

  var threads = label.getThreads(0, max);
  var sum = { processed: 0, created: 0, duplicate: 0, review: 0, error: 0 };

  for (var i = 0; i < threads.length; i++) {
    try {
      var res = executionProcessThread_(threads[i], {});
      sum.processed++;
      if (res.outcome === 'CREATED')         sum.created++;
      else if (res.outcome === 'DUPLICATE')  sum.duplicate++;
      else if (res.outcome === 'REVIEW' || res.outcome === 'CONFLICT') sum.review++;
      else                                   sum.error++;
    } catch (e) {
      sum.error++;
      logError('Intake', 'gmailIntakeRun', e.message, 'thread ' + i);
      gmailMove_(threads[i], K14.labels.input, K14.labels.error);
    }
    Utilities.sleep(1500);
  }
  logEvent('Intake', 'INTAKE_RUN', { detail: JSON.stringify(sum) });
  return { ok: true, summary: sum };
}
