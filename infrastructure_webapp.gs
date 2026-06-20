/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFRASTRUCTURE — WEB APP ENTRY POINT
 * ───────────────────────────────────────────────────────────────────────────
 * Serves the presentation layer (index.html) over HtmlService so the browser
 * can reach the K14 public surface via google.script.run.
 *
 * This file owns HOSTING only. It contains NO intelligence:
 *   - It does not score, match, classify, rank, or reason.
 *   - It serves HTML and exposes nothing but the platform doGet contract.
 *
 * The UI calls K14 through google.script.run.screenCvPublic(...) etc.
 * Those entry points live in k14_core.gs (the single intelligence owner).
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** WEB.F01 — Serve the screening UI. */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Al Yousuf Enterprises — CV Screening Engine')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
