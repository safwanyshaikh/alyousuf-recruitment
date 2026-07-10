/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFRASTRUCTURE — WEB APP ENTRY POINT (infrastructure_webapp.gs)
 * ───────────────────────────────────────────────────────────────────────────
 * Owns HOSTING only. Two entry points:
 *
 *   doGet(e)   — serves index.html (legacy internal screening UI)
 *   doPost(e)  — JSON API router for Lovable React frontend
 *
 * doPost dispatch table (action → handler in infrastructure_api.gs):
 *
 *   AUTH        : login, logout, validateToken
 *   CANDIDATES  : listCandidates, getCandidate, createCandidate,
 *                 updateCandidateState, createCandidateFromScreening,
 *                 getCandidateTimeline
 *   REQUIREMENTS: listRequirements, getRequirement, createRequirement
 *   CLIENTS     : listClients, getClient, createClient
 *   PROJECTS    : listProjects, getProject, createProject
 *   CAMPAIGNS   : listCampaigns, getCampaign, createCampaign
 *   ASSOCIATES  : listAssociates, getAssociate, createAssociate
 *   K14         : screenCv, matchCandidates, getTopMatches, getRequirementMatch
 *   SUBMISSION  : addToProject, shortlistCandidate, createSubmission,
 *                 addToSubmission, generatePackage, submitToClient,
 *                 listSubmissions, listPipeline
 *   PIPELINE    : advancePipeline, advanceMobilization, captureOutcome,
 *                 listMobilization
 *   QUEUE       : getQueue
 *   DASHBOARD   : getDashboard
 *   MISC        : healthcheck
 *
 * Request format (from Lovable):
 *   POST {deploymentUrl}
 *   Content-Type: application/json
 *   { "action": "listCandidates", "token": "...", "payload": { ... } }
 *
 * Response format:
 *   { "ok": true,  "data": { ... } }
 *   { "ok": false, "error": "..." }
 *
 * No business logic lives here. Zero intelligence. Hosting only.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── WEB.C01 · Public routes (no auth required) ───────────────────────────

var WEB_PUBLIC_ROUTES = ['login', 'healthcheck'];

// ── WEB.F01 · Serve the screening UI (existing GAS-served HTML path) ─────

/** WEB.F01 — Serve the internal screening UI (google.script.run path). */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Al Yousuf Enterprises — CV Screening Engine')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── WEB.F02 · JSON API router (Lovable React frontend path) ──────────────

/**
 * WEB.F02 — doPost JSON router.
 * Parses the request body, validates auth for protected routes,
 * dispatches to the appropriate handler in infrastructure_api.gs.
 */
function doPost(e) {
  try {
    // Parse body
    var body;
    try {
      body = JSON.parse(e.postData ? e.postData.contents : '{}');
    } catch (_) {
      return webJson_({ ok: false, error: 'Invalid JSON body.' }, 400);
    }

    var action  = String(body.action || '').trim();
    var payload = body.payload || {};
    var token   = String(body.token || '').trim();

    if (!action) return webJson_({ ok: false, error: 'action is required.' }, 400);

    // Auth gate
    var user = null;
    if (WEB_PUBLIC_ROUTES.indexOf(action) < 0) {
      var authResult = apiValidateToken_(token);
      if (!authResult.ok) return webJson_({ ok: false, error: authResult.error || 'Unauthorized.' }, 401);
      user = { email: authResult.email, role: authResult.role, name: authResult.name };
    }

    // Dispatch
    var result = webDispatch_(action, payload, user);
    return webJson_(result);

  } catch (err) {
    return webJson_({ ok: false, error: 'Server error: ' + err.message }, 500);
  }
}

// ── WEB.F03 · Dispatch table ─────────────────────────────────────────────

function webDispatch_(action, payload, user) {
  switch (action) {

    // ── Auth ──────────────────────────────────────────────────────────
    case 'login':
      return apiLogin_(String(payload.email || ''), String(payload.password || ''));
    case 'logout':
      return apiLogout_(String(payload.token || ''));
    case 'validateToken':
      return apiValidateToken_(String(payload.token || ''));

    // ── Healthcheck ───────────────────────────────────────────────────
    case 'healthcheck':
      return { ok: true, data: { status: 'ok', ts: new Date().toISOString() } };

    // ── Candidates ────────────────────────────────────────────────────
    case 'listCandidates':
      return apiHCandidateList_(payload, user);
    case 'getCandidate':
      return apiHCandidateGet_(payload, user);
    case 'createCandidate':
      return apiHCandidateCreate_(payload, user);
    case 'updateCandidateState':
      return apiHCandidateUpdateState_(payload, user);
    case 'createCandidateFromScreening':
      return apiHCandidateCreateFromScreening_(payload, user);
    case 'getCandidateTimeline':
      return apiHCandidateTimeline_(payload, user);

    // ── Requirements ──────────────────────────────────────────────────
    case 'listRequirements':
      return apiHRequirementList_(payload, user);
    case 'getRequirement':
      return apiHRequirementGet_(payload, user);
    case 'createRequirement':
      return apiHRequirementCreate_(payload, user);

    // ── Clients ───────────────────────────────────────────────────────
    case 'listClients':
      return apiHClientList_(payload, user);
    case 'getClient':
      return apiHClientGet_(payload, user);
    case 'createClient':
      return apiHClientCreate_(payload, user);

    // ── Projects ──────────────────────────────────────────────────────
    case 'listProjects':
      return apiHProjectList_(payload, user);
    case 'getProject':
      return apiHProjectGet_(payload, user);
    case 'createProject':
      return apiHProjectCreate_(payload, user);

    // ── Campaigns ─────────────────────────────────────────────────────
    case 'listCampaigns':
      return apiHCampaignList_(payload, user);
    case 'getCampaign':
      return apiHCampaignGet_(payload, user);
    case 'createCampaign':
      return apiHCampaignCreate_(payload, user);

    // ── Associates / Sourcing Partners ────────────────────────────────
    case 'listAssociates':
      return apiHAssociateList_(payload, user);
    case 'getAssociate':
      return apiHAssociateGet_(payload, user);
    case 'createAssociate':
      return apiHAssociateCreate_(payload, user);

    // ── K14 Intelligence ──────────────────────────────────────────────
    case 'screenCv':
      return apiHScreenCv_(payload, user);
    case 'matchCandidates':
      return apiHMatchCandidates_(payload, user);
    case 'getTopMatches':
      return apiHGetTopMatches_(payload, user);
    case 'getRequirementMatch':
      return apiHGetRequirementMatch_(payload, user);

    // ── Submission Workflow ───────────────────────────────────────────
    case 'addToProject':
      return apiHAddToProject_(payload, user);
    case 'shortlistCandidate':
      return apiHShortlist_(payload, user);
    case 'createSubmission':
      return apiHSubmissionCreate_(payload, user);
    case 'addToSubmission':
      return apiHSubmissionAddCandidate_(payload, user);
    case 'generatePackage':
      return apiHSubmissionGeneratePackage_(payload, user);
    case 'submitToClient':
      return apiHSubmissionSubmit_(payload, user);
    case 'listSubmissions':
      return apiHSubmissionList_(payload, user);
    case 'listPipeline':
      return apiHPipelineList_(payload, user);

    // ── Pipeline / Mobilization ───────────────────────────────────────
    case 'advancePipeline':
      return apiHPipelineAdvance_(payload, user);
    case 'advanceMobilization':
      return apiHMobilizationAdvance_(payload, user);
    case 'captureOutcome':
      return apiHOutcomeCapture_(payload, user);
    case 'listMobilization':
      return apiHMobilizationList_(payload, user);

    // ── Queue ─────────────────────────────────────────────────────────
    case 'getQueue':
      return apiHQueueGet_(payload, user);

    // ── Dashboard ─────────────────────────────────────────────────────
    case 'getDashboard':
      return apiHDashboard_(payload, user);

    default:
      return { ok: false, error: 'Unknown action: ' + action };
  }
}

// ── WEB.U01 · JSON response helper ───────────────────────────────────────

function webJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
