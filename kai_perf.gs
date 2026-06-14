/**
 * ═══════════════════════════════════════════════════════════════════
 *  KAI — Performance Layer
 *  Version  : 1.0.0
 *  Date     : 14-Jun-2026
 *
 *  Fixes:
 *    1. Screen loaders — return all data for a screen in ONE HTTP call
 *       Cuts Lovable round trips from 3–4 calls to 1 per screen load
 *    2. batchRead — generic multi-action single call
 *    3. CacheService — 30s cache on all read operations
 *
 *  Add to ROUTES_ fallback in kai_sprint4_api.gs doPost (see instruction).
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// PERF ROUTES — merged into main router via doPost fallback
// ───────────────────────────────────────────────────────────────────

var PERF_ROUTES_ = {

  // ── Generic batch read ─────────────────────────────────────────
  // Lovable sends an array of { action, params } — all run in one call
  // Example:
  //   { "action": "batchRead", "params": { "reads": [
  //     { "action": "getSubmissionBatches", "params": { "filters": {} } },
  //     { "action": "getPipelineEntries",   "params": { "filters": { "reqId": "REQ-001" } } }
  //   ] } }
  'batchRead': function(p) {
    var reads   = p.reads || [];
    var results = {};
    reads.forEach(function(read) {
      var action  = read.action;
      var handler = ROUTES_[action] || PERF_ROUTES_[action];
      if (!handler) {
        results[action] = { ok: false, error: 'Unknown action: ' + action };
      } else {
        try {
          results[action] = handler(read.params || {});
        } catch (e) {
          results[action] = { ok: false, error: e.message };
        }
      }
    });
    return { ok: true, data: results };
  },

  // ── Screen: Batch Queue ─────────────────────────────────────────
  // Replaces 2 separate calls: getSubmissionBatches + (optional) getProjectCandidates
  // Params: { filters: { status, trade, clientName } }
  'screenLoadBatchQueue': function(p) {
    var batches = getSubmissionBatches(p.filters || {});
    return {
      ok: true,
      data: {
        batches: batches,
        counts: {
          draft:     batches.filter(function(b) { return b.status === 'DRAFT'; }).length,
          ready:     batches.filter(function(b) { return b.status === 'READY'; }).length,
          submitted: batches.filter(function(b) { return b.status === 'SUBMITTED'; }).length,
          closed:    batches.filter(function(b) { return b.status === 'CLOSED'; }).length
        }
      }
    };
  },

  // ── Screen: Batch Detail ────────────────────────────────────────
  // Replaces 4 separate calls: getBatch + getItems + getPackages + getTimeline
  // Params: { batchId }
  'screenLoadBatchDetail': function(p) {
    if (!p.batchId) return { ok: false, error: 'batchId is required.' };
    var batch    = getSubmissionBatch(p.batchId);
    if (!batch)  return { ok: false, error: 'Batch not found: ' + p.batchId };
    var items    = getBatchItems(p.batchId);
    var packages = getPackagesByBatch(p.batchId);
    var timeline = getBatchTimelineEvents(p.batchId);
    return {
      ok: true,
      data: { batch: batch, items: items, packages: packages, timeline: timeline }
    };
  },

  // ── Screen: Submission Package ──────────────────────────────────
  // Replaces 2 separate calls: getPackagesByBatch + getBatch
  // Params: { batchId }
  'screenLoadPackage': function(p) {
    if (!p.batchId) return { ok: false, error: 'batchId is required.' };
    var batch    = getSubmissionBatch(p.batchId);
    var packages = getPackagesByBatch(p.batchId);
    var current  = packages.filter(function(pkg) { return pkg.packageStatus === 'CURRENT'; })[0] || null;
    return {
      ok: true,
      data: { batch: batch, currentPackage: current, allVersions: packages }
    };
  },

  // ── Screen: Pipeline ────────────────────────────────────────────
  // Replaces 2–3 separate calls: getPipelineEntries + getClientResponses + getBatch
  // Params: { filters: { batchId, reqId, pipelineStatus } }
  'screenLoadPipeline': function(p) {
    var filters  = p.filters || {};
    var entries  = getPipelineEntries(filters);
    var responses = getClientResponses(
      filters.batchId ? { batchId: filters.batchId } :
      filters.reqId   ? { reqId:   filters.reqId   } : {}
    );
    // Index responses by pipelineId for O(1) Lovable lookup
    var responseMap = {};
    responses.forEach(function(r) {
      if (!responseMap[r.pipelineId]) responseMap[r.pipelineId] = [];
      responseMap[r.pipelineId].push(r);
    });
    return {
      ok: true,
      data: { entries: entries, responsesByPipeline: responseMap }
    };
  },

  // ── Screen: Project Candidates ──────────────────────────────────
  // Replaces 1 call but adds counts for the badge display
  // Params: { reqId }
  'screenLoadProjectCandidates': function(p) {
    if (!p.reqId) return { ok: false, error: 'reqId is required.' };
    var candidates = getProjectCandidates(p.reqId);
    return {
      ok: true,
      data: { candidates: candidates, count: candidates.length }
    };
  }

};

// ───────────────────────────────────────────────────────────────────
// CACHE HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Read from CacheService; on miss run fn() and cache for ttl seconds.
 * Use for any read that doesn't need to be real-time.
 * Max cached value: 100KB (GAS limit). Silently bypasses cache on overflow.
 * @param {string} key
 * @param {function} fn
 * @param {number} ttl  seconds (default 30)
 */
function getCached_(key, fn, ttl) {
  try {
    var cache  = CacheService.getScriptCache();
    var cached = cache.get(key);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  var result = fn();

  try {
    var serialized = JSON.stringify(result);
    if (serialized.length < 90000) {        // stay under 100KB GAS limit
      CacheService.getScriptCache().put(key, serialized, ttl || 30);
    }
  } catch (e) {}

  return result;
}

/**
 * Invalidate a cache key. Call after any write that affects the cached data.
 * @param {string} key
 */
function invalidateCache_(key) {
  try { CacheService.getScriptCache().remove(key); } catch (e) {}
}

/**
 * Cached wrapper for getPipelineEntries. TTL: 30 seconds.
 * Cache is bypassed after any status update (handled in updatePipelineStatus).
 */
function getPipelineEntriesCached_(filters) {
  var key = 'pipe_' + JSON.stringify(filters || {});
  return getCached_(key, function() { return getPipelineEntries(filters); }, 30);
}

/**
 * Cached wrapper for getSubmissionBatches. TTL: 20 seconds.
 */
function getSubmissionBatchesCached_(filters) {
  var key = 'batches_' + JSON.stringify(filters || {});
  return getCached_(key, function() { return getSubmissionBatches(filters); }, 20);
}
