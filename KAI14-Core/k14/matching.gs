/**
 * KAI14-Core · k14/matching.gs   (Deliverable 9: Candidate Matching)
 * LAYER OWNER: K14 (intelligence)
 * ───────────────────────────────────────────────────────────────────
 * Match candidates to one requirement → ranked Top-N. Reads Candidates +
 * _Requirements; writes nothing. Returns ranked objects with a transparent
 * match score and reasons.
 */

/**
 * matchRequirement — rank candidates for a requirement.
 * @param {string} reqId
 * @param {object} [opts] - { topN, testMode }
 * @returns {object} { ok, requirementId, count, matches:[...] }
 */
function matchRequirement(reqId, opts) {
  opts = opts || {};
  var req = requirementGet(reqId);
  if (!req) return { ok: false, error: 'requirement not found: ' + reqId };

  var topN = opts.topN || K14.matchTopN;
  var cands = candidateAll_(opts.testMode === true);
  var reqTrade = String(req.Trade || '').toLowerCase().trim();
  var reqMinExp = parseFloat(req.MinExperience) || 0;
  var reqNat = String(req.Nationality || '').toLowerCase().trim();

  var scored = [];
  cands.forEach(function (c) {
    var trade = String(c.Trade || '').toLowerCase().trim();
    if (!trade) return;

    var s = 0, reasons = [];
    // Trade is the gate — exact or contains.
    if (trade === reqTrade)            { s += 50; reasons.push('trade exact'); }
    else if (reqTrade && (trade.indexOf(reqTrade) >= 0 || reqTrade.indexOf(trade) >= 0))
                                       { s += 35; reasons.push('trade related'); }
    else return;                       // different trade → not a match

    var exp = parseFloat(c.Experience) || 0;
    if (exp >= reqMinExp)              { s += 20; reasons.push('exp ok (' + exp + 'y)'); }
    else                              { s += Math.max(0, 20 - (reqMinExp - exp) * 5);
                                        reasons.push('exp short (' + exp + '/' + reqMinExp + ')'); }

    if (parseFloat(c.GulfExperience) > 0) { s += 15; reasons.push('Gulf exp'); }
    if (reqNat && String(c.Nationality || '').toLowerCase().trim() === reqNat)
                                          { s += 10; reasons.push('nationality match'); }
    s += Math.min(5, (parseInt(c.Score, 10) || 0) / 20);  // candidate quality nudge

    scored.push({
      kaiNo: c.KAINo,
      name: c.FullName,
      trade: c.Trade,
      experience: exp,
      gulfExperience: parseFloat(c.GulfExperience) || 0,
      nationality: c.Nationality,
      candidateScore: parseInt(c.Score, 10) || 0,
      verdict: c.Verdict,
      matchScore: Math.round(s),
      reasons: reasons.join(', ')
    });
  });

  scored.sort(function (a, b) { return b.matchScore - a.matchScore; });
  var matches = scored.slice(0, topN);
  logEvent('K14', 'MATCH_RUN',
    { detail: reqId + ' | candidates=' + cands.length + ' | matched=' + matches.length });
  return { ok: true, requirementId: reqId, count: matches.length, matches: matches };
}
