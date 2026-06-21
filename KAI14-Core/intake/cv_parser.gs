/**
 * KAI14-Core · intake/cv_parser.gs   (Deliverable 2: CV Extraction)
 * LAYER OWNER: Intake (ingestion)
 * ───────────────────────────────────────────────────────────────────
 * Extracts the CV attachment from a Gmail message, saves it to Drive, and
 * returns the bytes for K14 to parse. No parsing intelligence here — that
 * belongs to k14/parser.gs.
 */

var CV_DRIVE_FOLDER = 'KAI14_CVs';
var CV_MIME_OK = ['application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function cvDriveFolder_() {
  var it = DriveApp.getFoldersByName(CV_DRIVE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CV_DRIVE_FOLDER);
}

/**
 * extractCv_ — pull the first usable attachment from a message.
 * @param {GmailMessage} message
 * @returns {object|null} { cvLink, bytesBase64, mimeType, fileName, emailText } or null
 */
function extractCv_(message) {
  var atts = message.getAttachments();
  var picked = null;
  for (var i = 0; i < atts.length; i++) {
    var ct = atts[i].getContentType();
    if (CV_MIME_OK.indexOf(ct) >= 0) { picked = atts[i]; break; }
  }
  // Fallback: first attachment of any type if none matched.
  if (!picked && atts.length) picked = atts[0];
  if (!picked) return null;

  var blob = picked.copyBlob();
  var file = cvDriveFolder_().createFile(blob)
              .setName('CV_' + Utilities.formatDate(new Date(), K14.tz, 'yyyyMMdd_HHmmss') +
                       '_' + picked.getName());

  return {
    cvLink:      file.getUrl(),
    bytesBase64: Utilities.base64Encode(picked.copyBlob().getBytes()),
    mimeType:    picked.getContentType(),
    fileName:    picked.getName(),
    emailText:   message.getPlainBody ? message.getPlainBody().slice(0, 2000) : ''
  };
}
