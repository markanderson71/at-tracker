// ═══════════════════════════════════════════════════════════════════════
// Google Sheets API Helper
// ═══════════════════════════════════════════════════════════════════════
//
// SETUP: Replace the URL below with your Google Apps Script deployment URL.
// See DEPLOY.md for step-by-step instructions.
//
// ═══════════════════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_SHEETS_API_URL || "YOUR_APPS_SCRIPT_URL_HERE";

/**
 * Fetch all rows from a sheet.
 * @param {string} sheetName - "LearningObjectives" | "DiaryEntries" | "GateStatus"
 * @returns {Promise<Array>} Array of row objects
 */
export async function fetchSheet(sheetName) {
  try {
    const res = await fetch(`${API_URL}?action=getAll&sheet=${sheetName}`);
    const data = await res.json();
    return data.rows || [];
  } catch (err) {
    console.error(`Failed to fetch ${sheetName}:`, err);
    return [];
  }
}

/**
 * Create a new row in a sheet.
 * @param {string} sheetName
 * @param {Object} rowData - Keys must match sheet column headers
 */
export async function createRow(sheetName, rowData) {
  try {
    const res = await fetch(`${API_URL}?action=create&sheet=${sheetName}`, {
      method: "POST",
      body: JSON.stringify(rowData),
    });
    return await res.json();
  } catch (err) {
    console.error(`Failed to create in ${sheetName}:`, err);
    return { error: err.message };
  }
}

/**
 * Update an existing row by id.
 * @param {string} sheetName
 * @param {Object} rowData - Must include `id` (or `gateId` for GateStatus)
 */
export async function updateRow(sheetName, rowData) {
  try {
    const res = await fetch(`${API_URL}?action=update&sheet=${sheetName}`, {
      method: "POST",
      body: JSON.stringify(rowData),
    });
    return await res.json();
  } catch (err) {
    console.error(`Failed to update in ${sheetName}:`, err);
    return { error: err.message };
  }
}

/**
 * Delete a row by id.
 * @param {string} sheetName
 * @param {string} id
 */
export async function deleteRow(sheetName, id) {
  try {
    const res = await fetch(`${API_URL}?action=delete&sheet=${sheetName}&id=${id}`);
    return await res.json();
  } catch (err) {
    console.error(`Failed to delete from ${sheetName}:`, err);
    return { error: err.message };
  }
}

/**
 * Batch update multiple rows.
 * @param {string} sheetName
 * @param {Array} rows - Array of row objects, each must include `id`
 */
export async function batchUpdate(sheetName, rows) {
  try {
    const res = await fetch(`${API_URL}?action=batchUpdate&sheet=${sheetName}`, {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
    return await res.json();
  } catch (err) {
    console.error(`Failed to batch update ${sheetName}:`, err);
    return { error: err.message };
  }
}

/**
 * Health check — ping the API.
 */
export async function ping() {
  try {
    const res = await fetch(`${API_URL}?action=ping`);
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}
