/**
 * ═══════════════════════════════════════════════════════════════════
 *  KAI — Candidates & Requirements API
 *  Version  : 1.0.0
 *  Date     : 14-Jun-2026
 *
 *  Routes served:
 *    candidates              — paginated, filtered candidate list
 *    metrics                 — aggregate stats banner counts
 *    requirementCommandCenter— full requirements list
 *    slots                   — candidate project/req assignments (by rowIndex)
 *    updateStage             — write stage back to Candidates sheet
 *    updateRequirement       — write field back to _Requirements
 *
 *  All requests arrive flat (no params wrapper) — doPost merges body.
 *
 *  Candidates sheet columns (1-based, from CONFIG.inputColumns):
 *    1  stage          2  applicationDate  3  nationality  4  name
 *    5  mobile         6  email            7  education    8  positionApplied
 *    9  trade         10  industry        11  experience   12  gulf
 *   13  dob           14  age             15  verdict      16  flags
 *   17  score         18  scoreBreakdown  19  recommendedRoles
 *   20  kaiAssessment 21  recruiterAction 22  cvLink       23  notes
 *   24  active        25  kaiNo
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// ROUTE HANDLERS — registered in CANDIDATES_ROUTES_ below
// ───────────────────────────────────────────────────────────────────

/**
 * Paginated, filtered read of Candidates sheet.
 * Params (all flat on body): page, limit, sort, q, nationality,
 *   trade (array), industry, verdict, experienceMin, experienceMax,
 *   hasCV, source, gccMobility, passportStatus, ecrStatus.
 */
function routeCandidates_(p) {
  try {
    var page  = Math.max(1, parseInt(p.page  || 1));
    var limit = Math.max(1, Math.min(200, parseInt(p.limit || 50)));
    var sort  = String(p.sort || 'newest');

    var all = getAllCandidatesRaw_();

    // ── Filters ──────────────────────────────────────────────────
    var q           = String(p.q || '').toLowerCase().trim();
    var natFilter   = String(p.nationality || '').toLowerCase().trim();
    var tradeFilter = normaliseArr_(p.trade);
    var indFilter   = String(p.industry || '').toLowerCase().trim();
    var verdFilter  = String(p.verdict  || '').toLowerCase().trim();
    var expMin      = p.experienceMin != null ? parseFloat(p.experienceMin) : null;
    var expMax      = p.experienceMax != null ? parseFloat(p.experienceMax) : null;
    var hasCvFilter = p.hasCV  != null ? String(p.hasCV).toLowerCase()  : null;

    var filtered = all.filter(function(r) {
      if (natFilter   && r.nationality.toLowerCase().indexOf(natFilter) < 0)   return false;
      if (indFilter   && r.industry.toLowerCase().indexOf(indFilter) < 0)      return false;
      if (verdFilter  && r.verdict.toLowerCase() !== verdFilter)               return false;
      if (tradeFilter.length && !matchAny_(r.trade, tradeFilter))              return false;
      if (expMin != null && r.experience < expMin)                             return false;
      if (expMax != null && r.experience > expMax)                             return false;
      if (hasCvFilter === 'true'  && !r.cvLink)                               return false;
      if (hasCvFilter === 'false' &&  r.cvLink)                               return false;
      if (q) {
        var haystack = (r.name + ' ' + r.mobile + ' ' + r.email + ' ' +
                        r.trade + ' ' + r.kaiNo).toLowerCase();
        if (haystack.indexOf(q) < 0) return false;
      }
      return true;
    });

    // ── Sort ─────────────────────────────────────────────────────
    if (sort === 'oldest') {
      filtered.sort(function(a,b){ return String(a.applicationDate).localeCompare(String(b.applicationDate)); });
    } else if (sort === 'score') {
      filtered.sort(function(a,b){ return b.score - a.score; });
    } else {
      // newest (default)
      filtered.sort(function(a,b){ return String(b.applicationDate).localeCompare(String(a.applicationDate)); });
    }

    // ── Paginate ──────────────────────────────────────────────────
    var total  = filtered.length;
    var offset = (page - 1) * limit;
    var page_  = filtered.slice(offset, offset + limit);

    return {
      ok: true,
      data: {
        records:    page_,
        total:      total,
        page:       page,
        limit:      limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (ex) {
    Logger.log('routeCandidates_ error: ' + ex.message);
    return { ok: false, error: 'candidates error: ' + ex.message };
  }
}

/**
 * Aggregate metric counts for the banner row.
 * Uses 60s cache — invalidated on stage update.
 */
function routeMetrics_(p) {
  try {
    var key = 'kai_metrics_v1';
    var cache = CacheService.getScriptCache();
    var hit = cache.get(key);
    if (hit) return { ok: true, data: JSON.parse(hit) };

    var all = getAllCandidatesRaw_();
    var m = {
      total: 0, needsCall: 0, ready: 0, shortlisted: 0,
      submitted: 0, selected: 0, mobilization: 0, deployed: 0
    };
    all.forEach(function(r) {
      m.total++;
      var st = String(r.stage || '').toLowerCase();
      var v  = String(r.verdict || '').toLowerCase();
      if (v === 'needs_call'   || st === 'pending action') m.needsCall++;
      if (v === 'shortlisted'  || st === 'screened')       m.ready++;
      if (st === 'shortlisted')                            m.shortlisted++;
      if (st === 'client sent')                            m.submitted++;
      if (st === 'selected')                               m.selected++;
      if (st === 'visa processing')                        m.mobilization++;
      if (st === 'deployed')                               m.deployed++;
    });

    try { cache.put(key, JSON.stringify(m), 60); } catch(e) {}
    return { ok: true, data: m };
  } catch (ex) {
    return { ok: false, error: 'metrics error: ' + ex.message };
  }
}

/**
 * Full requirements list for the Recruiting / Command Center screen.
 * Reads _Requirements sheet (21 columns).
 */
function routeRequirementCommandCenter_(p) {
  try {
    var key = 'kai_reqs_v1';
    var cache = CacheService.getScriptCache();
    var hit = cache.get(key);
    if (hit) return { ok: true, data: JSON.parse(hit) };

    var ss    = getMasterSS_();
    var sheet = ss ? ss.getSheetByName('_Requirements') : null;
    if (!sheet || sheet.getLastRow() < 2) {
      return { ok: true, data: { requirements: [], total: 0 } };
    }

    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 21).getValues();
    var reqs = [];
    rows.forEach(function(r) {
      var reqId = String(r[0] || '').trim();
      if (!reqId) return;
      reqs.push({
        reqId:       reqId,
        status:      String(r[1]  || '').trim(),
        clientName:  String(r[2]  || '').trim(),
        country:     String(r[3]  || '').trim(),
        trade:       String(r[4]  || '').trim(),
        quantity:    Number(r[5])  || 0,
        salary:      String(r[6]  || '').trim(),
        benefits:    String(r[7]  || '').trim(),
        deadline:    r[8] instanceof Date ? Utilities.formatDate(r[8], 'Asia/Kolkata', 'yyyy-MM-dd') : String(r[8] || ''),
        notes:       String(r[9]  || '').trim(),
        createdAt:   r[10] instanceof Date ? Utilities.formatDate(r[10], 'Asia/Kolkata', 'yyyy-MM-dd') : String(r[10] || ''),
        assignedTo:  String(r[11] || '').trim(),
        priority:    String(r[12] || '').trim(),
        openPositions: Number(r[13]) || 0,
        filled:      Number(r[14]) || 0,
        industry:    String(r[15] || '').trim(),
        jdLink:      String(r[16] || '').trim(),
        col17:       String(r[17] || '').trim(),
        col18:       String(r[18] || '').trim(),
        col19:       String(r[19] || '').trim(),
        col20:       String(r[20] || '').trim()
      });
    });

    var result = { requirements: reqs, total: reqs.length };
    try { cache.put(key, JSON.stringify(result), 30); } catch(e) {}
    return { ok: true, data: result };
  } catch (ex) {
    Logger.log('routeRequirementCommandCenter_ error: ' + ex.message);
    return { ok: false, error: 'requirementCommandCenter error: ' + ex.message };
  }
}

/**
 * Candidate's project/requirement assignments.
 * Called by CandidatesContactsView with rowIndex — resolves kaiNo then
 * returns getCandidateProjects() results.
 */
function routeSlots_(p) {
  try {
    var rowIndex = parseInt(p.rowIndex || 0);
    if (!rowIndex || rowIndex < 2) {
      return { ok: true, data: { slots: [] } };
    }

    var ss       = getMasterSS_();
    var candName = (typeof CONFIG !== 'undefined' && CONFIG.sheetName) || 'Candidates';
    var sheet    = ss ? ss.getSheetByName(candName) : null;
    if (!sheet) return { ok: true, data: { slots: [] } };

    // Read just that one row (25 cols) to get kaiNo
    var row   = sheet.getRange(rowIndex, 1, 1, 25).getValues()[0];
    var kaiNo = String(row[24] || '').trim();   // col 25 = index 24

    if (!kaiNo) return { ok: true, data: { slots: [] } };

    var projects = getCandidateProjects(kaiNo);
    return { ok: true, data: { slots: projects, kaiNo: kaiNo } };
  } catch (ex) {
    Logger.log('routeSlots_ error: ' + ex.message);
    return { ok: false, error: 'slots error: ' + ex.message };
  }
}

/**
 * Write stage back to Candidates sheet row.
 * Params: rowIndex, stage
 */
function routeUpdateStage_(p) {
  try {
    var rowIndex = parseInt(p.rowIndex || 0);
    var stage    = String(p.stage || '').trim();
    if (!rowIndex || rowIndex < 2) return { ok: false, error: 'rowIndex required.' };
    if (!stage) return { ok: false, error: 'stage required.' };

    var ss       = getMasterSS_();
    var candName = (typeof CONFIG !== 'undefined' && CONFIG.sheetName) || 'Candidates';
    var sheet    = ss ? ss.getSheetByName(candName) : null;
    if (!sheet) return { ok: false, error: 'Candidates sheet not found.' };

    sheet.getRange(rowIndex, 1).setValue(stage);  // col 1 = stage
    // Invalidate caches
    try {
      var c = CacheService.getScriptCache();
      c.remove('kai_metrics_v1');
      c.remove('kai_cands_raw_v1');
    } catch(e) {}
    return { ok: true };
  } catch (ex) {
    return { ok: false, error: 'updateStage error: ' + ex.message };
  }
}

/**
 * Write a field back to _Requirements.
 * Params: reqId, field, value
 */
function routeUpdateRequirement_(p) {
  try {
    var reqId = String(p.reqId || '').trim();
    if (!reqId) return { ok: false, error: 'reqId required.' };

    var ss    = getMasterSS_();
    var sheet = ss ? ss.getSheetByName('_Requirements') : null;
    if (!sheet) return { ok: false, error: '_Requirements sheet not found.' };

    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var rowIdx = -1;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === reqId) { rowIdx = i + 2; break; }
    }
    if (rowIdx < 0) return { ok: false, error: 'Requirement not found: ' + reqId };

    var REQ_FIELD_COL_ = {
      status: 2, clientName: 3, country: 4, trade: 5, quantity: 6,
      salary: 7, benefits: 8, deadline: 9, notes: 10, assignedTo: 12,
      priority: 13, industry: 16, jdLink: 17
    };
    var col = REQ_FIELD_COL_[p.field];
    if (!col) return { ok: false, error: 'Unknown field: ' + p.field };

    sheet.getRange(rowIdx, col).setValue(p.value);
    try { CacheService.getScriptCache().remove('kai_reqs_v1'); } catch(e) {}
    return { ok: true };
  } catch (ex) {
    return { ok: false, error: 'updateRequirement error: ' + ex.message };
  }
}

// ───────────────────────────────────────────────────────────────────
// ROUTE REGISTRATION — picked up by CANDIDATES_ROUTES_ in doPost
// ───────────────────────────────────────────────────────────────────

var CANDIDATES_ROUTES_ = {
  'candidates':               routeCandidates_,
  'metrics':                  routeMetrics_,
  'requirementCommandCenter': routeRequirementCommandCenter_,
  'slots':                    routeSlots_,
  'updateStage':              routeUpdateStage_,
  'updateRequirement':        routeUpdateRequirement_
};

// ───────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Read all non-archived Candidates rows. 60s cache. ~9k rows = ~1.5s cold.
 */
function getAllCandidatesRaw_() {
  var key   = 'kai_cands_raw_v1';
  var cache = CacheService.getScriptCache();

  // Cache holds only up to 100KB — skip for large datasets, read fresh
  var ss       = getMasterSS_();
  var candName = (typeof CONFIG !== 'undefined' && CONFIG.sheetName) || 'Candidates';
  var sheet    = ss ? ss.getSheetByName(candName) : null;
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 25).getValues();
  var tz   = 'Asia/Kolkata';
  var records = [];

  data.forEach(function(row, idx) {
    var av = String(row[23] || '').toUpperCase().trim(); // col 24 = active
    if (av === 'SUPERSEDED' || av === 'ARCHIVED') return;
    var name = String(row[3] || '').trim();
    var email = String(row[5] || '').trim();
    if (!name && !email) return;

    var appDtRaw = row[1]; // col 2
    var appDt = null;
    if (appDtRaw instanceof Date) appDt = appDtRaw;
    else if (typeof appDtRaw === 'number' && appDtRaw > 25000) {
      appDt = new Date(Math.round((appDtRaw - 25569) * 86400000));
    } else if (appDtRaw) {
      var tmp = new Date(String(appDtRaw)); if (!isNaN(tmp)) appDt = tmp;
    }

    records.push({
      rowIndex:        idx + 2,
      stage:           String(row[0]  || 'Pending action'),
      applicationDate: appDt ? Utilities.formatDate(appDt, tz, 'yyyy-MM-dd HH:mm') : '',
      nationality:     String(row[2]  || ''),
      name:            name,
      mobile:          String(row[4]  || '').replace(/^'/, ''),
      email:           email,
      education:       String(row[6]  || ''),
      positionApplied: String(row[7]  || ''),
      trade:           String(row[8]  || ''),
      industry:        String(row[9]  || ''),
      experience:      Number(row[10]) || 0,
      gulfExperience:  String(row[11] || ''),
      verdict:         String(row[14] || ''),
      score:           Number(row[16]) || 0,
      recommendedRoles:String(row[18] || ''),
      recruiterAction: String(row[20] || ''),
      cvLink:          String(row[21] || ''),
      notes:           String(row[22] || ''),
      kaiNo:           String(row[24] || '')
    });
  });

  return records;
}

function normaliseArr_(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(function(v){ return String(v).toLowerCase().trim(); }).filter(Boolean);
  return [String(val).toLowerCase().trim()].filter(Boolean);
}

function matchAny_(value, arr) {
  var v = String(value || '').toLowerCase();
  for (var i = 0; i < arr.length; i++) {
    if (v.indexOf(arr[i]) >= 0) return true;
  }
  return false;
}
