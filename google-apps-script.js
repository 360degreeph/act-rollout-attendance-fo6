/**
 * Attendance System - Google Sheets Backend Apps Script (Optimized for Staff Masterlist & Custom Logs)
 * Paste this code into your Google Sheet's Apps Script Editor (Extensions > Apps Script).
 * Make sure to deploy this as a Web App:
 * 1. Click "Deploy" > "New Deployment"
 * 2. Select type: "Web App"
 * 3. Set "Execute as": "Me"
 * 4. Set "Who has access": "Anyone"
 * 5. Copy the deployed Web App URL and paste it into the settings page of the Attendance Web App.
 */

// Helper to look up sheet names case-insensitively
function getSheetCaseInsensitive(ss, targetName) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sheetName = sheets[i].getName().toLowerCase().trim();
    if (sheetName === targetName.toLowerCase().trim()) {
      return sheets[i];
    }
  }
  return null;
}

// Initialize sheets if they do not exist, naming them logs & masterlist
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Logs Sheet (case-insensitive check)
  var logsSheet = getSheetCaseInsensitive(ss, "logs");
  if (!logsSheet) {
    logsSheet = ss.insertSheet("logs");
    // Setup exact user headers: TIMESTAMP, STAFFID, STATUS
    logsSheet.appendRow(["TIMESTAMP", "STAFFID", "STATUS"]);
    logsSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f3f4f6");
    logsSheet.setFrozenRows(1);
  }
  
  // 2. Masterlist Sheet (case-insensitive check)
  var studentsSheet = getSheetCaseInsensitive(ss, "masterlist");
  if (!studentsSheet) {
    studentsSheet = ss.insertSheet("masterlist");
    // Setup exact user headers: ID, NAME, POSITION, SEX, OFFICE, QRCODE, RFID
    studentsSheet.appendRow(["ID", "NAME", "POSITION", "SEX", "OFFICE", "QRCODE", "RFID"]);
    studentsSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#f3f4f6");
    studentsSheet.setFrozenRows(1);
    
    // Add some sample staffs for initial testing
    studentsSheet.appendRow(["STF-201", "Dr. David Carter", "Dean of Engineering", "Male", "Dean Office Rm 102", "STF-201"]);
    studentsSheet.appendRow(["STF-202", "Elena Vance", "Assistant Professor", "Female", "Civil Dept Rm 204", "STF-202"]);
    studentsSheet.appendRow(["STF-203", "Marcus Brody", "Chief Administrator", "Male", "Admin Center Bldg A", "STF-203"]);
  }
}

// Helper to dynamically locate column indices of the masterlist sheet
function getMasterlistColumnMapping(studentsSheet) {
  var mapping = { id: 1, name: 2, position: 3, sex: 4, office: 5, qrcode: 6, rfid: -1 }; // defaults (1-based indices)
  var lastColumn = studentsSheet.getLastColumn();
  if (lastColumn === 0) return mapping;
  
  var headers = studentsSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c].toString().toUpperCase().trim();
    if (h === "ID") mapping.id = c + 1;
    else if (h === "NAME" || h.includes("STAFF NAME")) mapping.name = c + 1;
    else if (h === "POSITION" || h.includes("JOB")) mapping.position = c + 1;
    else if (h === "SEX" || h.includes("GENDER")) mapping.sex = c + 1;
    else if (h === "OFFICE" || h.includes("ROOM") || h.includes("DEPT")) mapping.office = c + 1;
    else if (h === "QRCODE" || h.includes("QR")) mapping.qrcode = c + 1;
    else if (h === "RFID") mapping.rfid = c + 1;
  }
  return mapping;
}

// Helper to dynamically locate column indices of the logs sheet
function getLogsColumnMapping(logsSheet) {
  var mapping = { timestamp: 1, staffId: 2, status: 3 }; // defaults
  var lastColumn = logsSheet.getLastColumn();
  if (lastColumn === 0) return mapping;
  
  var headers = logsSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c].toString().toUpperCase().trim();
    if (h === "TIMESTAMP" || h.includes("TIME") || h.includes("DATE")) mapping.timestamp = c + 1;
    else if (h === "STAFFID" || h === "STAFF ID" || h.includes("ID")) mapping.staffId = c + 1;
    else if (h === "STATUS" || h.includes("LOG")) mapping.status = c + 1;
  }
  return mapping;
}

// Handle GET requests (load logs, students, and basic stats)
function doGet(e) {
  initSheets();
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logsSheet = getSheetCaseInsensitive(ss, "logs");
    var studentsSheet = getSheetCaseInsensitive(ss, "masterlist");
    
    // Dynamically map columns in staff masterlist
    var colMap = getMasterlistColumnMapping(studentsSheet);
    var studentsData = studentsSheet.getDataRange().getValues();
    var students = [];
    // Skip header row
    for (var i = 1; i < studentsData.length; i++) {
      var row = studentsData[i];
      var stdId = row[colMap.id - 1] ? row[colMap.id - 1].toString().trim() : "";
      if (!stdId) continue; // skip blank rows
      
      students.push({
        studentId: stdId,
        name: row[colMap.name - 1] ? row[colMap.name - 1].toString().trim() : ("Staff (" + stdId + ")"),
        department: row[colMap.office - 1] ? row[colMap.office - 1].toString().trim() : "Office", // map to department for frontend compatibility
        position: row[colMap.position - 1] ? row[colMap.position - 1].toString().trim() : "Staff Member",
        sex: row[colMap.sex - 1] ? row[colMap.sex - 1].toString().trim() : "Unknown",
        office: row[colMap.office - 1] ? row[colMap.office - 1].toString().trim() : "Office",
        qrcode: row[colMap.qrcode - 1] ? row[colMap.qrcode - 1].toString().trim() : stdId,
        rfid: (colMap.rfid > 0 && row[colMap.rfid - 1]) ? row[colMap.rfid - 1].toString().trim() : ""
      });
    }
    
    // Dynamically map columns in logs
    var logColMap = getLogsColumnMapping(logsSheet);
    var logsData = logsSheet.getDataRange().getValues();
    var logs = [];
    // Skip header row
    for (var j = 1; j < logsData.length; j++) {
      var logRow = logsData[j];
      var logId = logRow[logColMap.staffId - 1] ? logRow[logColMap.staffId - 1].toString().trim() : "";
      if (!logId) continue;
      
      // Look up staff name from masterlist for UI readability
      var staffName = "Unknown Staff";
      for (var k = 0; k < students.length; k++) {
        if (students[k].studentId.toLowerCase() === logId.toLowerCase()) {
          staffName = students[k].name;
          break;
        }
      }
      
      logs.push({
        timestamp: logRow[logColMap.timestamp - 1],
        studentId: logId,
        studentName: staffName,
        status: logRow[logColMap.status - 1] ? logRow[logColMap.status - 1].toString().trim() : "IN"
      });
    }
    
    var response = {
      success: true,
      students: students,
      logs: logs
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests (performing scans or registering students/staff)
function doPost(e) {
  initSheets();
  
  try {
    var postData;
    if (e.postData.type === "application/json") {
      postData = JSON.parse(e.postData.contents);
    } else {
      postData = e.parameter;
    }
    
    var action = postData.action || "scan";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "scan") {
      var scanValue = (postData.studentId || "").toString().trim(); // scanned QR content
      if (!scanValue) {
        throw new Error("Scan ID/QR content is required");
      }
      
      var studentsSheet = getSheetCaseInsensitive(ss, "masterlist");
      var colMap = getMasterlistColumnMapping(studentsSheet);
      var studentsData = studentsSheet.getDataRange().getValues();
      var staffId = "";
      var staffName = "";
      var position = "Staff Member";
      var sex = "Unknown";
      var office = "Office";
      var qrcode = "";
      var rfidVal = "";
      var staffFound = false;
      
      // Look up staff details: Match scanValue against ID, QRCODE, or RFID column
      for (var i = 1; i < studentsData.length; i++) {
        var rowId = studentsData[i][colMap.id - 1] ? studentsData[i][colMap.id - 1].toString().trim() : "";
        var rowQr = studentsData[i][colMap.qrcode - 1] ? studentsData[i][colMap.qrcode - 1].toString().trim() : "";
        var rowRfid = (colMap.rfid > 0 && studentsData[i][colMap.rfid - 1]) ? studentsData[i][colMap.rfid - 1].toString().trim() : "";
        
        var scanLower = scanValue.toLowerCase();
        if (rowId.toLowerCase() === scanLower || rowQr.toLowerCase() === scanLower || (rowRfid !== "" && rowRfid.toLowerCase() === scanLower)) {
          staffId = rowId;
          staffName = studentsData[i][colMap.name - 1] ? studentsData[i][colMap.name - 1].toString().trim() : "";
          position = studentsData[i][colMap.position - 1] ? studentsData[i][colMap.position - 1].toString().trim() : "Staff Member";
          sex = studentsData[i][colMap.sex - 1] ? studentsData[i][colMap.sex - 1].toString().trim() : "Unknown";
          office = studentsData[i][colMap.office - 1] ? studentsData[i][colMap.office - 1].toString().trim() : "Office";
          qrcode = rowQr;
          rfidVal = rowRfid;
          staffFound = true;
          break;
        }
      }
      
      // If staff is not in masterlist, auto-register them
      if (!staffFound) {
        staffId = scanValue;
        staffName = "Staff (" + scanValue + ")";
        position = "Auto-Registered";
        qrcode = scanValue;
        
        // Append to masterlist matching the dynamic columns
        var newRow = [];
        var maxColIndex = Math.max(colMap.id, colMap.name, colMap.position, colMap.sex, colMap.office, colMap.qrcode, colMap.rfid);
        for (var cIdx = 1; cIdx <= maxColIndex; cIdx++) {
          if (cIdx === colMap.id) newRow.push("'" + staffId); // force string
          else if (cIdx === colMap.name) newRow.push(staffName);
          else if (cIdx === colMap.position) newRow.push(position);
          else if (cIdx === colMap.sex) newRow.push("");
          else if (cIdx === colMap.office) newRow.push("");
          else if (cIdx === colMap.qrcode) newRow.push("'" + qrcode); // force string
          else if (cIdx === colMap.rfid) newRow.push("");
          else newRow.push("");
        }
        studentsSheet.appendRow(newRow);
      }
      
      var logsSheet = getSheetCaseInsensitive(ss, "logs");
      var logColMap = getLogsColumnMapping(logsSheet);
      var logsData = logsSheet.getDataRange().getValues();
      var lastStatus = "OUT"; // Default to check-in if no previous scans
      
      var timestamp = postData.timestamp ? new Date(postData.timestamp) : new Date();
      var currentManilaDate = Utilities.formatDate(timestamp, "Asia/Manila", "yyyy-MM-dd");
      
      // Find the last scan for this staff in logs to toggle status (IN -> OUT -> IN)
      for (var j = logsData.length - 1; j >= 1; j--) {
        var loggedId = logsData[j][logColMap.staffId - 1] ? logsData[j][logColMap.staffId - 1].toString().trim() : "";
        if (loggedId.toLowerCase() === staffId.toLowerCase()) {
          var lastLogTimestamp = logsData[j][logColMap.timestamp - 1];
          
          // Only toggle status if the last scan was from TODAY. If yesterday, ignore it (default to OUT).
          if (lastLogTimestamp instanceof Date || !isNaN(new Date(lastLogTimestamp))) {
            var dateObj = (lastLogTimestamp instanceof Date) ? lastLogTimestamp : new Date(lastLogTimestamp);
            var lastLogDate = Utilities.formatDate(dateObj, "Asia/Manila", "yyyy-MM-dd");
            
            if (lastLogDate === currentManilaDate) {
              lastStatus = logsData[j][logColMap.status - 1] ? logsData[j][logColMap.status - 1].toString().trim() : "OUT";
            }
          }
          break;
        }
      }
      
      var newStatus = (lastStatus === "IN") ? "OUT" : "IN";
      
      // Append new scan log to logs sheet matching custom headers TIMESTAMP, STAFFID, STATUS
      var logRecord = [];
      var maxLogColIndex = Math.max(logColMap.timestamp, logColMap.staffId, logColMap.status);
      for (var lIdx = 1; lIdx <= maxLogColIndex; lIdx++) {
        if (lIdx === logColMap.timestamp) logRecord.push(timestamp);
        else if (lIdx === logColMap.staffId) logRecord.push("'" + staffId); // force string
        else if (lIdx === logColMap.status) logRecord.push(newStatus);
        else logRecord.push("");
      }
      logsSheet.appendRow(logRecord);
      
      var result = {
        success: true,
        log: {
          timestamp: timestamp.toISOString(),
          studentId: staffId,
          studentName: staffName,
          status: newStatus,
          department: office, // map office as department for frontend compatibility
          position: position,
          sex: sex,
          office: office,
          qrcode: qrcode
        }
      };
      
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === "register") {
      var id = (postData.studentId || "").toString().trim();
      var name = postData.name || "";
      var positionVal = postData.position || "";
      var sexVal = postData.sex || "";
      var officeVal = postData.office || "";
      var rfidValParam = postData.rfid || "";
      
      if (!id || !name) {
        throw new Error("Staff ID and Name are required");
      }
      
      var studentsSheet = getSheetCaseInsensitive(ss, "masterlist");
      var colMap = getMasterlistColumnMapping(studentsSheet);
      var studentsData = studentsSheet.getDataRange().getValues();
      var exists = false;
      var existingRow = -1;
      
      for (var k = 1; k < studentsData.length; k++) {
        var rowId = studentsData[k][colMap.id - 1] ? studentsData[k][colMap.id - 1].toString().trim() : "";
        if (rowId.toLowerCase() === id.toLowerCase()) {
          exists = true;
          existingRow = k + 1; // 1-indexed
          break;
        }
      }
      
      if (exists) {
        // Update existing staff columns
        studentsSheet.getRange(existingRow, colMap.name).setValue(name);
        studentsSheet.getRange(existingRow, colMap.position).setValue(positionVal);
        studentsSheet.getRange(existingRow, colMap.sex).setValue(sexVal);
        studentsSheet.getRange(existingRow, colMap.office).setValue(officeVal);
        if (colMap.rfid > 0) {
          studentsSheet.getRange(existingRow, colMap.rfid).setValue("'" + rfidValParam);
        }
        // QRCODE column is skipped as it is auto-generated via formula
      } else {
        // Append new staff matching dynamic columns
        var newRow = [];
        var maxColIndex = Math.max(colMap.id, colMap.name, colMap.position, colMap.sex, colMap.office, colMap.rfid);
        for (var cIdx = 1; cIdx <= maxColIndex; cIdx++) {
          if (cIdx === colMap.id) newRow.push("'" + id); // force string
          else if (cIdx === colMap.name) newRow.push(name);
          else if (cIdx === colMap.position) newRow.push(positionVal);
          else if (cIdx === colMap.sex) newRow.push(sexVal);
          else if (cIdx === colMap.office) newRow.push(officeVal);
          else if (cIdx === colMap.rfid) newRow.push("'" + rfidValParam);
          else newRow.push("");
        }
        studentsSheet.appendRow(newRow);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Staff registered successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else {
      throw new Error("Invalid action");
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
