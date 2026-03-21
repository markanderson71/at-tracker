// ═══════════════════════════════════════════════════════════════════════
// AT DEVELOPMENT TRACKER — Google Apps Script API
// ═══════════════════════════════════════════════════════════════════════
//
// HOW TO SET UP:
// 1. Upload AT_Development_Tracker_DataSource.xlsx to Google Drive
// 2. Open it in Google Sheets
// 3. Go to Extensions → Apps Script
// 4. Delete any existing code and paste this entire file
// 5. Click Deploy → New deployment
// 6. Select type: "Web app"
// 7. Set "Execute as": Me
// 8. Set "Who has access": Anyone (or Anyone with the link)
// 9. Click Deploy and authorize when prompted
// 10. Copy the Web App URL — this is your API endpoint
// 11. Paste that URL into the React app's API_URL constant
//
// SHEET NAMES MUST MATCH EXACTLY:
//   - LearningObjectives
//   - DiaryEntries
//   - GateStatus
//   - Reference (read-only, not modified by API)
//
// ═══════════════════════════════════════════════════════════════════════

// ── Configuration ─────────────────────────────────────────────────────

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ── HTTP Handlers ─────────────────────────────────────────────────────

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var action = (e.parameter && e.parameter.action) || "";
    var sheet = (e.parameter && e.parameter.sheet) || "";
    var result;

    switch (action) {

      // ── READ: Get all rows from a sheet ──────────────────
      case "getAll":
        result = getAllRows(sheet);
        break;

      // ── CREATE: Add a new row ────────────────────────────
      case "create":
        var createData = JSON.parse(e.postData.contents);
        result = createRow(sheet, createData);
        break;

      // ── UPDATE: Update a row by id ───────────────────────
      case "update":
        var updateData = JSON.parse(e.postData.contents);
        result = updateRow(sheet, updateData);
        break;

      // ── DELETE: Delete a row by id ───────────────────────
      case "delete":
        var deleteId = e.parameter.id || "";
        result = deleteRow(sheet, deleteId);
        break;

      // ── BATCH UPDATE: Update multiple rows at once ───────
      case "batchUpdate":
        var batchData = JSON.parse(e.postData.contents);
        result = batchUpdate(sheet, batchData);
        break;

      // ── HEALTH CHECK ─────────────────────────────────────
      case "ping":
        result = { status: "ok", timestamp: new Date().toISOString() };
        break;

      default:
        result = { error: "Unknown action: " + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all rows from a sheet as an array of objects.
 * Header row (row 1) defines the keys.
 */
function getAllRows(sheetName) {
  var ss = getSpreadsheet();
  var ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: "Sheet not found: " + sheetName };

  var data = ws.getDataRange().getValues();
  if (data.length < 1) return { rows: [] };

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      // Convert dates to ISO strings
      if (val instanceof Date) {
        val = val.toISOString().split("T")[0];
      }
      row[headers[j]] = val !== undefined && val !== null ? String(val) : "";
      if (row[headers[j]] !== "") hasData = true;
    }
    if (hasData) rows.push(row);
  }

  return { rows: rows };
}

/**
 * Create a new row. Data object keys must match header names.
 */
function createRow(sheetName, data) {
  var ss = getSpreadsheet();
  var ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: "Sheet not found: " + sheetName };

  var headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  var newRow = [];

  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    newRow.push(data[key] !== undefined ? data[key] : "");
  }

  ws.appendRow(newRow);

  return { success: true, id: data.id || data.gateId || "" };
}

/**
 * Update a row by matching the 'id' column (column A).
 * For GateStatus, matches on 'gateId' (also column A).
 */
function updateRow(sheetName, data) {
  var ss = getSpreadsheet();
  var ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: "Sheet not found: " + sheetName };

  var allData = ws.getDataRange().getValues();
  var headers = allData[0];
  var idCol = 0; // Column A is always the ID

  var targetId = data.id || data.gateId || "";
  if (!targetId) return { error: "No id provided for update" };

  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][idCol]) === String(targetId)) {
      // Found the row — update it
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        if (data[key] !== undefined) {
          ws.getRange(i + 1, j + 1).setValue(data[key]);
        }
      }
      return { success: true, id: targetId };
    }
  }

  return { error: "Row not found with id: " + targetId };
}

/**
 * Delete a row by id (column A).
 */
function deleteRow(sheetName, targetId) {
  var ss = getSpreadsheet();
  var ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: "Sheet not found: " + sheetName };

  var allData = ws.getDataRange().getValues();

  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(targetId)) {
      ws.deleteRow(i + 1);
      return { success: true, id: targetId };
    }
  }

  return { error: "Row not found with id: " + targetId };
}

/**
 * Batch update multiple rows. Expects { rows: [...] } array.
 */
function batchUpdate(sheetName, payload) {
  var rows = payload.rows || [];
  var results = [];

  for (var i = 0; i < rows.length; i++) {
    results.push(updateRow(sheetName, rows[i]));
  }

  return { success: true, results: results };
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY: Test from Apps Script editor
// ═══════════════════════════════════════════════════════════════════════

/**
 * Run this function manually to test the setup.
 * Check the Execution Log for output.
 */
function testSetup() {
  var sheets = ["LearningObjectives", "DiaryEntries", "GateStatus"];
  
  for (var i = 0; i < sheets.length; i++) {
    var result = getAllRows(sheets[i]);
    if (result.error) {
      Logger.log("ERROR on " + sheets[i] + ": " + result.error);
    } else {
      Logger.log(sheets[i] + ": " + result.rows.length + " rows found");
    }
  }
  
  Logger.log("Setup test complete. If all sheets show row counts, you're good to deploy.");
}

/**
 * Run this ONCE to add the new columns needed for baseline and examiner scoring.
 * Safe to run multiple times — it checks before adding.
 */
function addScoringColumns() {
  var ss = getSpreadsheet();
  var ws = ss.getSheetByName("GateStatus");
  if (!ws) { Logger.log("GateStatus sheet not found!"); return; }
  
  var headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  var newCols = [
    "baselineMark", "baselineChris", "baselineGates", "baselineMike", 
    "baselineNotes", "chrisScore", "gatesScore", "mikeScore"
  ];
  
  var added = 0;
  for (var i = 0; i < newCols.length; i++) {
    if (headers.indexOf(newCols[i]) === -1) {
      var nextCol = ws.getLastColumn() + 1;
      ws.getRange(1, nextCol).setValue(newCols[i]);
      added++;
    }
  }
  
  Logger.log("Added " + added + " new columns. Total columns now: " + ws.getLastColumn());
  Logger.log("GateStatus headers: " + ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0].join(", "));
}

/**
 * Run this ONCE to add columns for attachments and comments to DiaryEntries.
 * Safe to run multiple times.
 */
function addDiaryColumns() {
  var ss = getSpreadsheet();
  var ws = ss.getSheetByName("DiaryEntries");
  if (!ws) { Logger.log("DiaryEntries sheet not found!"); return; }
  
  var headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  var newCols = ["attachments", "comments"];
  
  var added = 0;
  for (var i = 0; i < newCols.length; i++) {
    if (headers.indexOf(newCols[i]) === -1) {
      var nextCol = ws.getLastColumn() + 1;
      ws.getRange(1, nextCol).setValue(newCols[i]);
      added++;
    }
  }
  
  Logger.log("Added " + added + " new columns to DiaryEntries.");
}
