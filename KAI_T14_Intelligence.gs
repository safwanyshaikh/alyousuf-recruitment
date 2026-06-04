// ════════════════════════════════════════════════════════════════════════════════
// KAI T14 — GCC RECRUITMENT INTELLIGENCE ENGINE V2
// ════════════════════════════════════════════════════════════════════════════════
// Successor to GCC Matching Engine V2. Three independent scoring dimensions:
//   1. Match Score      — Can this candidate fill this role? (0–100, per req)
//   2. Compliance Score — Is it safe to submit them? (0–100, with risk flags)
//   3. Profile Completeness — How complete is the profile? (0–100, data quality)
//
// Seven GCC Recruitment Classes (blue → white collar):
//   UNSKILLED_WORKER | SEMI_SKILLED_WORKER | SKILLED_TRADESMAN | MEP_TRADES
//   TECHNICIAN | ENGINEER | PROFESSIONAL_MANAGEMENT
//
// Age rule → archive (not hard reject). Nationality → hard block from JD.
// Re-evaluation engine updates Compliance + Completeness for all candidates
// without re-parsing CVs or calling Gemini.
//
// Requires: KAI_T13_Intelligence.gs (classifyTradeT13_, bestEligibilityT13_)
//           KAI_API_Bridge_MASTER.gs (SS_ID, COL, computeBasicScore_, parseEducation_)
// ════════════════════════════════════════════════════════════════════════════════

// ── SECTION A: EDUCATION RANK SYSTEM ─────────────────────────────────────────
// Maps parseEducation_() output levels to a numeric rank (0–7).
// NEVER call parseEducation_ again inside T14 — use eduRankFromLevel_ on the
// already-parsed educationLevel field to avoid double-parsing overhead.

var EDU_LEVELS_T14_ = ['','Matriculation','High School','ITI / Certificate','Diploma','Degree','Masters','PhD'];

function eduRankFromLevel_(level) {
  var l = String(level||'').trim();
  var idx = EDU_LEVELS_T14_.indexOf(l);
  return idx >= 0 ? idx : 0; // unknown → 0 (safest)
}

// Parses raw education text → rank (0–7). Used when only raw text is available.
function rawEduRankT14_(rawEdu) {
  var s = String(rawEdu||'').toLowerCase().trim();
  if (!s) return 0;
  if (/\bphd\b|\bdoctorate\b/.test(s))                              return 7;
  if (/\bmaster|mba|m\.?tech|m\.?e\b/.test(s))                     return 6;
  if (/\bdegree|bachelor|b\.?tech|b\.?e\b|b\.?sc/.test(s))         return 5;
  if (/\bdiploma\b/.test(s))                                         return 4;
  if (/\biti\b|\bcertificate\b|\bcertification\b/.test(s))          return 3;
  if (/high school|10\+2|12th|intermediate|hsc|puc/.test(s))        return 3;
  if (/matriculation|ssc|10th/.test(s))                              return 2;
  if (/8th|7th|6th|5th|primary|below 10/.test(s))                   return 1;
  return 0;
}


// ── SECTION B: RECRUITMENT CLASS ENGINE ──────────────────────────────────────

// Each class defines the minimum education rank required for the role,
// and the cap applied to Match Score if candidate falls below that rank.
var RECRUITMENT_CLASS_DEFS_T14_ = {
  UNSKILLED_WORKER:       { minEduRank: 0, eduCapBelow: null, label: 'Unskilled' },
  SEMI_SKILLED_WORKER:    { minEduRank: 1, eduCapBelow: 75,   label: 'Semi-Skilled' },
  SKILLED_TRADESMAN:      { minEduRank: 2, eduCapBelow: 72,   label: 'Skilled Tradesman' },
  MEP_TRADES:             { minEduRank: 3, eduCapBelow: 68,   label: 'MEP Trades' },
  TECHNICIAN:             { minEduRank: 3, eduCapBelow: 62,   label: 'Technician' },
  ENGINEER:               { minEduRank: 5, eduCapBelow: 58,   label: 'Engineer' },
  PROFESSIONAL_MANAGEMENT:{ minEduRank: 5, eduCapBelow: 50,   label: 'Professional / Management' }
};

// Maps T13 position level + collar → T14 recruitment class.
// T13 level values: OPERATOR, HELPER, TRAINEE, TRADESMAN, TECHNICIAN,
//                   INSPECTOR, FOREMAN, SUPERVISOR, ENGINEER, MANAGER, SPECIALIST
function classToRecruitmentClassT14_(t13Level, collar) {
  var lv = String(t13Level||'').toUpperCase();
  var co = String(collar||'').toUpperCase();
  if (lv === 'HELPER'   || lv === 'TRAINEE')              return 'UNSKILLED_WORKER';
  if (lv === 'OPERATOR')                                  return 'SEMI_SKILLED_WORKER';
  if (lv === 'TRADESMAN') {
    if (co === 'GREY')                                    return 'MEP_TRADES';
    return 'SKILLED_TRADESMAN';
  }
  if (lv === 'TECHNICIAN' || lv === 'INSPECTOR' || lv === 'FOREMAN') return 'TECHNICIAN';
  if (lv === 'SUPERVISOR')                                return 'TECHNICIAN';
  if (lv === 'ENGINEER')                                  return 'ENGINEER';
  if (lv === 'MANAGER'  || lv === 'SPECIALIST')          return 'PROFESSIONAL_MANAGEMENT';
  return 'SKILLED_TRADESMAN'; // safe default for unclassified blue-collar
}

// Returns recruitment class name for a trade string.
function getRecruitmentClassT14_(trade) {
  try {
    var cls    = classifyTradeT13_(trade);
    var level  = cls ? cls.level  : 'TRADESMAN';
    var collar = cls ? cls.collar : 'BLUE';
    return classToRecruitmentClassT14_(level, collar);
  } catch(e) {
    return 'SKILLED_TRADESMAN';
  }
}


// ── SECTION C: MATCH SCORE ENGINE V2 ─────────────────────────────────────────
//
// Scoring weights:
//   Trade Relevance     40%  (T13 eligibility — hard gate at 0)
//   Experience          25%  (GCC class-aware bands)
//   Age                 10%  (archive instead of hard reject)
//   GCC Experience      10%  (history in Gulf, not current location)
//   Campaign Location   10%  (requirement-context aware)
//   Certifications       5%  (only when req explicitly demands)
//
// Post-calculation: education tier cap (class-specific, soft cap not hard gate)
// Post-calculation: nationality hard block (HIDDEN tier, archive reason)

function computeMatchScoreT14_(reqTrade, reqMinExp, reqCerts, campaignType,
                                 reqNationality, reqMinAge, reqMaxAge, cand) {

  var recruitmentClass = getRecruitmentClassT14_(reqTrade);
  var classDef         = RECRUITMENT_CLASS_DEFS_T14_[recruitmentClass];

  // ── Stage 1: Nationality Hard Block ──────────────────────────────────────
  var natBlock = nationalityBlockT14_(reqNationality, cand);
  if (natBlock.blocked) {
    return {
      score: 0, tier: 'HIDDEN',
      hardFail:      'NATIONALITY_BLOCK',
      archiveReason: 'NATIONALITY_MISMATCH',
      archiveDetail: 'Req allows [' + natBlock.allowed + '], candidate is ' + (cand.nationality||'Unknown'),
      recruitmentClass: recruitmentClass,
      educationCapped: false, educationCapValue: null,
      compliance:      computeComplianceScoreT14_(cand, recruitmentClass),
      profileCompleteness: computeBasicScore_(cand).score,
      breakdown: {}
    };
  }

  // ── Stage 2: Trade Relevance (40%) — hard gate ────────────────────────────
  var tradeRaw = tradeRelevanceScoreGCC_(reqTrade, cand);
  if (tradeRaw === 0) {
    return {
      score: 0, tier: 'HIDDEN',
      hardFail:      'TRADE_MISMATCH',
      archiveReason: null,
      recruitmentClass: recruitmentClass,
      educationCapped: false, educationCapValue: null,
      compliance:      computeComplianceScoreT14_(cand, recruitmentClass),
      profileCompleteness: computeBasicScore_(cand).score,
      breakdown: { trade: 0 }
    };
  }

  // ── Stage 3: Age — archive (not hard reject) ──────────────────────────────
  var ageResult = ageScoreT14_(cand.dob, cand.age, reqMinAge, reqMaxAge);
  if (ageResult.archive) {
    return {
      score: 0, tier: 'ARCHIVED',
      hardFail:      null,
      archiveReason: ageResult.archiveReason,
      archiveDetail: ageResult.archiveDetail,
      recruitmentClass: recruitmentClass,
      educationCapped: false, educationCapValue: null,
      compliance:      computeComplianceScoreT14_(cand, recruitmentClass),
      profileCompleteness: computeBasicScore_(cand).score,
      breakdown: { trade: Math.round(tradeRaw * 0.40), age: 0 }
    };
  }

  // ── Stages 4–7: remaining weighted stages ────────────────────────────────
  var expScore  = experienceScoreGCC_(cand.experience, reqMinExp);
  var gccScore  = gccExpScoreGCC_(cand.gulfExp);
  var locScore  = locationScoreGCC_(cand, campaignType);
  var certScore = certScoreGCC_(reqCerts, cand);

  var raw = Math.min(100, Math.round(
    tradeRaw       * 0.40 +
    expScore       * 0.25 +
    ageResult.score* 0.10 +
    gccScore       * 0.10 +
    locScore       * 0.10 +
    certScore      * 0.05
  ));

  // ── Education Tier Cap (T14 addition) ────────────────────────────────────
  var eduCapped = false;
  var eduCapValue = null;
  var candEduRank = rawEduRankT14_(cand.educationRaw || cand.education || '');

  if (classDef && classDef.minEduRank > 0 && classDef.eduCapBelow !== null) {
    if (candEduRank < classDef.minEduRank) {
      eduCapped   = true;
      eduCapValue = classDef.eduCapBelow;
      raw         = Math.min(raw, classDef.eduCapBelow);
    }
  }

  var compliance = computeComplianceScoreT14_(cand, recruitmentClass);
  var pc         = computeBasicScore_(cand).score;

  return {
    score: raw,
    tier:  getMatchTierGCC_(raw),
    hardFail:      null,
    archiveReason: null,
    recruitmentClass: recruitmentClass,
    educationCapped:  eduCapped,
    educationCapValue:eduCapValue,
    compliance:       compliance,
    profileCompleteness: pc,
    breakdown: {
      trade:      Math.round(tradeRaw        * 0.40),
      experience: Math.round(expScore        * 0.25),
      age:        Math.round(ageResult.score * 0.10),
      gcc:        Math.round(gccScore        * 0.10),
      location:   Math.round(locScore        * 0.10),
      certs:      Math.round(certScore       * 0.05)
    }
  };
}

// Age scorer — returns { score, archive, archiveReason, archiveDetail }
// JD overrides: reqMinAge / reqMaxAge (0 = not specified, use defaults).
function ageScoreT14_(dob, ageField, reqMinAge, reqMaxAge) {
  var age = 0;
  if (dob && String(dob).trim() && String(dob) !== '—') {
    try {
      var d = new Date(dob);
      if (!isNaN(d)) age = Math.floor((new Date() - d) / (365.25 * 24 * 3600 * 1000));
    } catch(e) {}
  }
  if (!age && ageField) age = parseInt(String(ageField).match(/\d+/)||[0]) || 0;

  if (!age) return { score: 70, archive: false, archiveReason: null };

  var hardMin = (reqMinAge > 0) ? reqMinAge : 18;
  var hardMax = (reqMaxAge > 0) ? reqMaxAge : 50;

  if (age < hardMin) {
    return {
      score: 0, archive: true,
      archiveReason: 'AGE_BELOW_LIMIT',
      archiveDetail:  'Age ' + age + ', requirement minimum is ' + hardMin
    };
  }
  if (age > hardMax) {
    return {
      score: 0, archive: true,
      archiveReason: 'AGE_OVER_LIMIT',
      archiveDetail:  'Age ' + age + ', requirement maximum is ' + hardMax
    };
  }

  // Scoring within valid range
  if (age <= 21) return { score: 30,  archive: false };
  if (age <= 24) return { score: 65,  archive: false };
  if (age <= 45) return { score: 100, archive: false };
  return         { score: 50,  archive: false }; // 46–max: moderate
}


// ── SECTION D: COMPLIANCE SCORE ENGINE ───────────────────────────────────────
//
// Independent of Match Score. Answers: "Is this candidate safe to submit?"
// Does not reduce Match Score — displayed separately on the candidate card.
//
// Risk Levels:
//   85–100  LOW_RISK      — Safe to submit
//   70–84   MEDIUM_RISK   — Verify before submission
//   50–69   HIGH_RISK     — Resolve before submission
//   <50     CRITICAL_RISK — Do not submit without resolution

function computeComplianceScoreT14_(cand, recruitmentClass) {
  var score = 100;
  var flags = [];

  var classDef  = RECRUITMENT_CLASS_DEFS_T14_[recruitmentClass] || null;
  var candEduRk = rawEduRankT14_(cand.educationRaw || cand.education || '');

  // Education below class minimum
  if (classDef && classDef.minEduRank > 0 && candEduRk < classDef.minEduRank) {
    score -= 20;
    flags.push({
      code:    'EDUCATION_BELOW_CLASS',
      detail:  'Candidate education rank ' + candEduRk + ' below required rank ' +
               classDef.minEduRank + ' for ' + (classDef.label||recruitmentClass)
    });
  }

  // Passport status
  var ppExp    = cand.passportExpiry ? new Date(cand.passportExpiry) : null;
  var ppStatus = String(cand.passportStatus||'').trim();
  if (ppStatus === 'Expired') {
    score -= 30; flags.push({ code: 'PASSPORT_EXPIRED', detail: 'Passport expired — not deployable' });
  } else if (ppStatus === '<6mo') {
    score -= 15; flags.push({ code: 'PASSPORT_NEAR_EXPIRY', detail: 'Passport expires within 6 months' });
  }

  // Passport number missing
  var ppNo = String(cand.passportNo||'').trim();
  if (!ppNo || ppNo.length < 6) {
    score -= 10; flags.push({ code: 'MISSING_PASSPORT_NO', detail: 'Passport number not captured' });
  }

  // Mobile missing
  var mob = String(cand.mobile||'').replace(/[^\d]/g,'');
  if (!mob || mob.length < 8) {
    score -= 20; flags.push({ code: 'MISSING_CONTACT', detail: 'Mobile number missing or invalid' });
  }

  // Trade missing
  var trade = String(cand.trade||cand.positionApplied||'').trim();
  if (!trade || trade.length < 2) {
    score -= 15; flags.push({ code: 'MISSING_TRADE', detail: 'Trade / position not specified' });
  }

  // Medical status
  var medStat = String(cand.medicalStatus||'').toLowerCase().trim();
  if (/unfit|failed|reject/.test(medStat)) {
    score -= 30; flags.push({ code: 'MEDICAL_UNFIT', detail: 'Medical status: ' + cand.medicalStatus });
  }

  // Notice period > 90 days
  var notice = parseInt(cand.noticeDays||'0') || 0;
  if (notice > 90) {
    score -= 5; flags.push({ code: 'LONG_NOTICE', detail: 'Notice period ' + notice + ' days' });
  }

  // ECR status (relevant for Saudi Arabia deployment)
  var ecr = String(cand.ecrStatus||'').toUpperCase().trim();
  if (ecr === 'ECR') {
    flags.push({ code: 'ECR_STATUS', detail: 'ECR passport — Saudi local transfers restricted' });
    // No score deduction — informational only (not all roles are Saudi)
  }

  var finalScore = Math.max(0, score);
  var riskLevel;
  if (finalScore >= 85)     riskLevel = 'LOW_RISK';
  else if (finalScore >= 70) riskLevel = 'MEDIUM_RISK';
  else if (finalScore >= 50) riskLevel = 'HIGH_RISK';
  else                       riskLevel = 'CRITICAL_RISK';

  return { score: finalScore, riskLevel: riskLevel, flags: flags };
}


// ── SECTION E: NATIONALITY BLOCK ENGINE ──────────────────────────────────────
// reqNationality: comma-separated whitelist (e.g. "Indian,Nepali") or blank (= any)
// Returns { blocked: bool, allowed: string }

function nationalityBlockT14_(reqNationality, cand) {
  var raw = String(reqNationality||'').trim();
  if (!raw || raw.length < 2) return { blocked: false, allowed: '' };

  var allowedList = raw.split(/[,;\/]+/).map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean);
  if (allowedList.length === 0) return { blocked: false, allowed: '' };

  var candNat = String(cand.nationality||'').trim().toLowerCase();
  if (!candNat || candNat.length < 2) return { blocked: false, allowed: raw }; // unknown nationality — don't block

  var match = allowedList.some(function(a) { return candNat.indexOf(a) >= 0 || a.indexOf(candNat) >= 0; });
  return { blocked: !match, allowed: raw };
}


// ── SECTION F: JD INTELLIGENCE CAPTURE ───────────────────────────────────────
// Called after every JD creation. Writes structured intelligence to _KAI_Knowledge.
// This sheet is append-only — never modified after write.

function captureJDIntelligenceT14_(ss, jdId, client, trade, deployCountry, rawText, parsedPositions) {
  if (!jdId && !trade) return; // nothing useful to capture

  var sheet = ensureKAIKnowledgeSheet_(ss);
  if (!sheet) return;

  var now           = new Date();
  var recruitClass  = getRecruitmentClassT14_(trade);
  var campaignType  = deployCountry ?
    inferCampaignType_([null, null, null, deployCountry, null, null, null, null, null, null, '']) :
    'UNKNOWN';

  var posCount = parsedPositions ? parsedPositions.length : 1;
  var posJson  = parsedPositions ? JSON.stringify(parsedPositions).slice(0, 800) : '';

  // Extract nationality hints from raw text
  var natHint = '';
  var natMatch = rawText.match(/nationality[:\s]+([A-Za-z ,\/&]+?)[\.\n\r]/i);
  if (natMatch) natHint = natMatch[1].trim().slice(0, 80);

  // Extract cert hints
  var CERT_KEYS = ['6g','aws','asme','cswip','cwi','nebosh','ndt','nace','api','aramco','adnoc','sabic'];
  var rawLow = rawText.toLowerCase();
  var certsFound = CERT_KEYS.filter(function(k){ return rawLow.indexOf(k) >= 0; }).join(',');

  sheet.appendRow([
    jdId, now, client, trade, recruitClass, deployCountry, campaignType,
    natHint, certsFound, posCount, posJson,
    rawText.slice(0, 500)
  ]);
}

function ensureKAIKnowledgeSheet_(ss) {
  var sheet = ss.getSheetByName('_KAI_Knowledge');
  if (sheet) return sheet;
  try {
    sheet = ss.insertSheet('_KAI_Knowledge');
    sheet.appendRow([
      'JD_ID', 'Captured_At', 'Client', 'Trade', 'Recruitment_Class',
      'Deploy_Country', 'Campaign_Type', 'Nationality_Hint', 'Certs_Found',
      'Position_Count', 'Positions_JSON', 'Raw_Extract'
    ]);
    sheet.setFrozenRows(1);
    return sheet;
  } catch(e) {
    Logger.log('ensureKAIKnowledgeSheet_ error: ' + e.message);
    return null;
  }
}


// ── SECTION G: RE-EVALUATION ENGINE ──────────────────────────────────────────
// Batch recalculates Compliance + Profile Completeness for all active candidates.
// Does NOT re-parse CVs. Does NOT call Gemini. Does NOT touch kaiAssessment.
// Updates columns: score (profile completeness), missingFields, educationEnum.
// Match Score (per-requirement) is NOT updated — it requires a reqId context.
//
// Recommended: run monthly or after taxonomy/rule changes.

function reEvaluateCandidatesT14_(params) {
  params = params || {};
  var limit   = parseInt(params.limit||'0')   || 0; // 0 = all
  var dryRun  = String(params.dryRun||'')     === 'true';
  var kaiNoFilter = String(params.kaiNo||'').trim();

  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok:true, evaluated:0, updated:0, skipped:0, errors:[] };
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 42).getValues();
  var evaluated = 0, updated = 0, skipped = 0;
  var errors = [];
  var updates = [];

  var now = new Date();

  data.forEach(function(row, i) {
    if (limit > 0 && evaluated >= limit) return;

    var active = String(row[COL.active-1]||'').toUpperCase().trim();
    if (active === 'SUPERSEDED') { skipped++; return; }

    var kaiNo = String(row[COL.kaiNo-1]||'').trim();
    if (kaiNoFilter && kaiNo !== kaiNoFilter) return;

    var name  = String(row[COL.name-1]||'').trim();
    var email = String(row[COL.email-1]||'').trim();
    if (!name && !email) { skipped++; return; }

    evaluated++;

    try {
      // Build a minimal candidate object from raw row data
      var cand = {
        name:         name,
        mobile:       String(row[COL.mobile-1]||'').trim(),
        email:        email,
        trade:        String(row[COL.trade-1]||'').trim(),
        positionApplied: String(row[COL.positionApplied-1]||'').trim(),
        education:    String(row[COL.education-1]||'').trim(),
        educationRaw: String(row[COL.education-1]||'').trim(),
        dob:          String(row[COL.dob-1]||'').trim(),
        age:          parseInt(row[COL.age-1])||0,
        passport:     extractPassportNo_(String(row[COL.kaiAssessment-1]||''),
                                          String(row[COL.notes-1]||'')),
        gulfExp:      String(row[COL.gulfExp-1]||'').trim(),
        currentLocation: String(row[COL.currentLocation-1]||'').trim(),
        nationality:  String(row[COL.nationality-1]||'').trim(),
        passportNo:   extractPassportNo_(String(row[COL.kaiAssessment-1]||''),
                                          String(row[COL.notes-1]||'')),
        passportStatus: computePassportStatus_(row[COL.passportExpiry-1]),
        noticeDays:   parseInt(row[COL.noticeDays-1])||0,
        medicalStatus:String(row[COL.medicalStatus-1]||'').trim(),
        ecrStatus:    String(row[COL.ecrStatus-1]||'').trim()
      };

      // 1. Profile Completeness
      var pc = computeBasicScore_(cand);

      // 2. Compliance Score (candidate-level, no req context → use SKILLED_TRADESMAN as baseline)
      var tradeName    = cand.trade || cand.positionApplied || '';
      var recClass     = tradeName ? getRecruitmentClassT14_(tradeName) : 'SKILLED_TRADESMAN';
      var compliance   = computeComplianceScoreT14_(cand, recClass);

      // 3. Missing fields
      var missing = (pc.missing||[]).join(',');

      // 4. Education enum (re-derive)
      var eduParsed = parseEducation_(cand.education);
      var eduEnum   = eduParsed.level;

      // Stage update: only write if something changed
      var curScore   = parseInt(row[COL.score-1])||0;
      var curMissing = String(row[COL.missingFields-1]||'').trim();
      var curEduEnum = String(row[COL.educationEnum-1]||'').trim();

      var changed = (curScore !== pc.score) || (curMissing !== missing) || (curEduEnum !== eduEnum);

      if (changed && !dryRun) {
        updates.push({
          rowIndex:   i + 2,
          score:      pc.score,
          missing:    missing,
          eduEnum:    eduEnum,
          compliance: compliance.score,
          riskLevel:  compliance.riskLevel
        });
        updated++;
      } else if (!changed) {
        skipped++;
      }

    } catch(ex) {
      errors.push({ kaiNo: kaiNo, error: ex.message });
    }
  });

  // Batch write updates (minimise API calls)
  if (!dryRun && updates.length > 0) {
    updates.forEach(function(u) {
      try {
        sheet.getRange(u.rowIndex, COL.score).setValue(u.score);
        sheet.getRange(u.rowIndex, COL.missingFields).setValue(u.missing);
        sheet.getRange(u.rowIndex, COL.educationEnum).setValue(u.eduEnum);
        // Store compliance score in deployScore column (repurposed for T14)
        sheet.getRange(u.rowIndex, COL.deployScore).setValue(u.compliance);
      } catch(we) {
        errors.push({ rowIndex: u.rowIndex, error: we.message });
      }
    });
  }

  return {
    ok:        true,
    evaluated: evaluated,
    updated:   updated,
    skipped:   skipped,
    dryRun:    dryRun,
    errors:    errors,
    summary:   'Re-evaluated ' + evaluated + ' candidates. Updated: ' + updated +
               '. Errors: ' + errors.length + '.'
  };
}

// Passport status helper (used in re-evaluation without full record object)
function computePassportStatus_(ppExpCell) {
  if (!(ppExpCell instanceof Date) || isNaN(ppExpCell)) return 'Unknown';
  var mLeft = (ppExpCell - new Date()) / (1000*60*60*24*30);
  if (mLeft > 6) return 'Valid';
  if (mLeft > 0) return '<6mo';
  return 'Expired';
}

// Re-evaluate a single candidate by kaiNo (for on-demand refresh from UI)
function reEvaluateSingleT14_(ss, kaiNo) {
  if (!kaiNo) return { ok:false, error:'kaiNo required' };
  return reEvaluateCandidatesT14_({ kaiNo: kaiNo });
}


// ── SECTION H: T14 GEMINI ASSESSMENT PROMPT ──────────────────────────────────
// Replaces the generic 2–3 sentence assessment with a senior technical manager brief.
// Rules enforced in prompt:
//   - Never repeat fields the recruiter already sees in the grid
//   - Focus on Gulf employer tier, certifications, career trajectory, red flags
//   - Output: 2–4 complete sentences, no bullet points

var KAI_ASSESSMENT_INSTRUCTION_T14_ =
  'You are a senior GCC technical recruitment manager with 15 years placing blue-collar ' +
  'and technical professionals in Saudi Arabia and UAE. Write a 2–4 line internal ' +
  'assessment for the recruiter — direct, no fluff.\n' +
  'RULES:\n' +
  '- DO NOT repeat: name, nationality, trade, years of experience, education level, ' +
  'mobile, or email — recruiter already sees these.\n' +
  '- DO focus on: quality of Gulf employers (Aramco/SABIC/ADNOC vs. local contractors), ' +
  'specific certifications held, career trajectory (growth vs. stagnant), notable ' +
  'red flags (gaps >6 months, frequent job switching, skills mismatch with stated trade), ' +
  'deployability (can go now vs. 30–90 days vs. blocked).\n' +
  '- If critical info is absent from the CV, state what is missing and why it matters.\n' +
  '- Never write "The candidate has X years experience" or "He/She is a [trade]".\n' +
  '- Tone: senior technical manager briefing a recruiter, not HR copy.\n' +
  '- Output: the kaiAssessment value only — 2–4 sentences, no bullets, no markdown.';

// Full CV parse prompt with T14 assessment rules embedded
var CV_PARSE_PROMPT_T14_ =
  'You are a GCC recruitment CV parser for an oil & gas manpower agency.\n' +
  'Extract all structured information from the attached CV.\n' +
  'Return ONLY a valid JSON object — no markdown, no explanation, just JSON.\n' +
  '{\n' +
  '  "name": "",\n' +
  '  "nationality": "",\n' +
  '  "mobile": "",\n' +
  '  "email": "",\n' +
  '  "dob": "",\n' +
  '  "age": 0,\n' +
  '  "education": "",\n' +
  '  "positionApplied": "",\n' +
  '  "trade": "",\n' +
  '  "industry": "",\n' +
  '  "experience": 0,\n' +
  '  "gulfExp": "",\n' +
  '  "currentLocation": "",\n' +
  '  "empStatus": "",\n' +
  '  "noticeDays": 0,\n' +
  '  "top3Positions": "",\n' +
  '  "passportNo": "",\n' +
  '  "passportExpiry": "",\n' +
  '  "ecrStatus": "",\n' +
  '  "kaiAssessment": "",\n' +
  '  "recruiterAction": "",\n' +
  '  "recommendedRoles": "",\n' +
  '  "missingFields": ""\n' +
  '}\n\n' +
  'EXTRACTION RULES:\n' +
  '- experience: total years as decimal (e.g. 8.5). Count all roles, not just current.\n' +
  '- gulfExp: all GCC/Gulf experience — list countries, employers, durations, current/past.\n' +
  '  Example: "Saudi Arabia 4yr (Aramco), UAE 2yr (ADNOC contractor)"\n' +
  '- trade: primary technical trade (e.g. "Welder", "QC Inspector", "Pipe Fitter").\n' +
  '  If multiple trades, choose the one with most recent/longest experience.\n' +
  '- industry: e.g. "Oil & Gas", "Construction", "Petrochemical"\n' +
  '- positionApplied: most recent or most senior role held\n' +
  '- top3Positions: up to 3 roles this candidate qualifies for, comma-separated\n' +
  '- passportNo: one capital letter + 7 digits (Indian format, e.g. A1234567)\n' +
  '- passportExpiry: yyyy-MM-dd format, or empty string\n' +
  '- ecrStatus: "ECNR" if ECR-Exemption stamp present; otherwise "ECR" for Indian nationals\n' +
  '- recruiterAction: one specific next action (e.g. "Call to confirm Saudi availability")\n' +
  '- missingFields: comma-separated list of fields not found in CV\n\n' +
  'ASSESSMENT RULE (kaiAssessment field):\n' +
  KAI_ASSESSMENT_INSTRUCTION_T14_;


// ── SECTION I: PUBLIC ENTRY POINTS ───────────────────────────────────────────
// GAS editor dropdown visible (no trailing underscore)

function reEvaluateCandidates()  { return Logger.log(JSON.stringify(reEvaluateCandidatesT14_({}))); }
function reEvaluateDryRun()      { return Logger.log(JSON.stringify(reEvaluateCandidatesT14_({ dryRun: 'true' }))); }
function reEvaluateSingle()      {
  // Edit kaiNo below, then run from dropdown
  var kaiNo = 'AYE-KAI-2026-000001';
  return Logger.log(JSON.stringify(reEvaluateSingleT14_(SpreadsheetApp.openById(SS_ID), kaiNo)));
}

// Quick compliance check for a single candidate (run from dropdown for testing)
function testComplianceT14() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Candidates');
  if (!sheet || sheet.getLastRow() < 2) { Logger.log('No candidates'); return; }

  var row  = sheet.getRange(2, 1, 1, 42).getValues()[0];
  var cand = {
    name:          String(row[COL.name-1]||''),
    mobile:        String(row[COL.mobile-1]||''),
    email:         String(row[COL.email-1]||''),
    trade:         String(row[COL.trade-1]||''),
    positionApplied:String(row[COL.positionApplied-1]||''),
    education:     String(row[COL.education-1]||''),
    educationRaw:  String(row[COL.education-1]||''),
    dob:           String(row[COL.dob-1]||''),
    age:           parseInt(row[COL.age-1])||0,
    passportNo:    extractPassportNo_(String(row[COL.kaiAssessment-1]||''), String(row[COL.notes-1]||'')),
    passportStatus:computePassportStatus_(row[COL.passportExpiry-1]),
    noticeDays:    parseInt(row[COL.noticeDays-1])||0,
    medicalStatus: String(row[COL.medicalStatus-1]||''),
    ecrStatus:     String(row[COL.ecrStatus-1]||''),
    nationality:   String(row[COL.nationality-1]||'')
  };

  var rc     = getRecruitmentClassT14_(cand.trade || cand.positionApplied);
  var result = computeComplianceScoreT14_(cand, rc);
  Logger.log('Candidate: ' + cand.name + ' | Class: ' + rc);
  Logger.log('Compliance: ' + result.score + ' (' + result.riskLevel + ')');
  result.flags.forEach(function(f){ Logger.log('  FLAG: ' + f.code + ' — ' + f.detail); });
}

// Test T14 match score against first requirement in sheet
function testMatchScoreT14() {
  var ss  = SpreadsheetApp.openById(SS_ID);
  var rs  = ss.getSheetByName('_Requirements');
  var cs  = ss.getSheetByName('Candidates');
  if (!rs || !cs || rs.getLastRow() < 2 || cs.getLastRow() < 2) {
    Logger.log('Sheets not found or empty'); return;
  }

  var req   = rs.getRange(2, 1, 1, 25).getValues()[0];
  var cRow  = cs.getRange(2, 1, 1, 42).getValues()[0];
  var trade = String(req[4]||'');
  var cand  = {
    trade:          String(cRow[COL.trade-1]||''),
    positionApplied:String(cRow[COL.positionApplied-1]||''),
    experience:     parseFloat(cRow[COL.experience-1])||0,
    gulfExp:        String(cRow[COL.gulfExp-1]||''),
    dob:            String(cRow[COL.dob-1]||''),
    age:            parseInt(cRow[COL.age-1])||0,
    currentLocation:String(cRow[COL.currentLocation-1]||''),
    nationality:    String(cRow[COL.nationality-1]||''),
    education:      String(cRow[COL.education-1]||''),
    educationRaw:   String(cRow[COL.education-1]||''),
    name:           String(cRow[COL.name-1]||''),
    mobile:         String(cRow[COL.mobile-1]||''),
    email:          String(cRow[COL.email-1]||''),
    passportNo:     extractPassportNo_(String(cRow[COL.kaiAssessment-1]||''), ''),
    passportStatus: computePassportStatus_(cRow[COL.passportExpiry-1]),
    noticeDays:     parseInt(cRow[COL.noticeDays-1])||0,
    medicalStatus:  String(cRow[COL.medicalStatus-1]||''),
    ecrStatus:      String(cRow[COL.ecrStatus-1]||'')
  };

  var campaignType = inferCampaignType_(req);
  var result = computeMatchScoreT14_(
    trade, parseFloat(req[6])||0, String(req[12]||''), campaignType,
    String(req[11]||''), parseInt(req[7])||0, parseInt(req[8])||0, cand
  );

  Logger.log('Req: ' + String(req[0]) + ' | Trade: ' + trade);
  Logger.log('Candidate: ' + cand.name + ' | Trade: ' + cand.trade);
  Logger.log('Recruitment Class: ' + result.recruitmentClass);
  Logger.log('Match Score: ' + result.score + ' (' + result.tier + ')');
  if (result.hardFail)      Logger.log('Hard Fail: ' + result.hardFail);
  if (result.archiveReason) Logger.log('Archive: '  + result.archiveReason + ' — ' + result.archiveDetail);
  if (result.educationCapped) Logger.log('Edu Cap: ' + result.educationCapValue);
  Logger.log('Compliance: ' + result.compliance.score + ' (' + result.compliance.riskLevel + ')');
  Logger.log('Profile Completeness: ' + result.profileCompleteness);
  Logger.log('Breakdown: ' + JSON.stringify(result.breakdown));
}
