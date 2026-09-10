/**
 * KINORA pre-registration endpoint.
 * Recommended setup:
 * 1) Create a Google Sheet.
 * 2) Extensions > Apps Script.
 * 3) Paste this code and save.
 * 4) Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 5) Copy the Web App URL ending in /exec into KINORA_SHEET_ENDPOINT in app.js.
 */
const SHEET_NAME = 'PreRegistration';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['created_at', 'email', 'locale', 'source', 'consent', 'page']);
      sheet.setFrozenRows(1);
    }

    const p = e && e.parameter ? e.parameter : {};
    const email = String(p.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ ok: false, error: 'invalid_email' });
    }

    // Prevent duplicate rows for the same email.
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const values = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
      if (values.some(v => String(v).trim().toLowerCase() === email)) {
        return json_({ ok: true, duplicate: true });
      }
    }

    sheet.appendRow([
      new Date(),
      email,
      String(p.locale || ''),
      String(p.source || ''),
      String(p.consent || ''),
      String(p.page || '')
    ]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: 'KINORA pre-registration' });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
