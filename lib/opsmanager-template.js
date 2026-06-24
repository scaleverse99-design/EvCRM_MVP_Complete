export const OPS_TEMPLATE = `
/**
 * Ev.CRM Opsmanager Server v5.0 — "Cloud OS Edition"
 * 
 * Capability: Multi-App Decentralized Hosting with Shadow Cache
 * Services:
 * - Data Engine (Shared/Namespaced Sheets)
 * - Shadow Cache (Fast-Read JSON Blobs on Drive)
 * - Media Engine (Scoped Drive Folders)
 * - Comm Engine (App-Identity Mail)
 */

const VERSION = "5.0.0-ATOMIC";
const SECURITY_TOKEN = "{{SECURITY_TOKEN}}"; // Injected at provision time

// ── ENTRY POINTS ─────────────────────────────────────────────────────────────

function doGet(e) {
  const path = e.parameter.path || 'index.html';
  
  // 1. Health API Check
  if (e.parameter.action === 'health') {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, version: VERSION, status: "RUNNING",
      quotas: { remaining_emails: MailApp.getRemainingDailyQuota() }
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. If no path and no action, show the Health Dashboard
  if (!e.parameter.path) {
    return HtmlService.createHtmlOutput(buildDashboardHTML())
      .setTitle("Ops Manager Cloud OS v5.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 3. Sovereign Hosting Mode: Serve files from "WEBSITE_ROOT" folder on Drive
  try {
    const rootFolder = getOrCreateFolder("WEBSITE_ROOT");
    const files = rootFolder.getFilesByName(path);
    
    if (files.hasNext()) {
      const file = files.next();
      const mime = file.getMimeType();
      const content = file.getBlob().getDataAsString();
      
      if (mime === "text/html") {
        return HtmlService.createTemplate(content).evaluate()
          .addMetaTag('viewport', 'width=device-width, initial-scale=1')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      } else {
        return ContentService.createTextOutput(content).setMimeType(getContentMimeType(path));
      }
    }
  } catch (err) {
    return ContentService.createTextOutput("Hosting Error: " + err.message);
  }

  return ContentService.createTextOutput("404: File Not Found in WEBSITE_ROOT");
}

function getContentMimeType(path) {
  if (path.endsWith(".js")) return ContentService.MimeType.JAVASCRIPT;
  if (path.endsWith(".css")) return ContentService.MimeType.CSS;
  if (path.endsWith(".json")) return ContentService.MimeType.JSON;
  return ContentService.MimeType.TEXT;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const payload = JSON.parse(e.postData.contents);
    
    // Security Check
    if (payload.token !== SECURITY_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "UNAUTHORIZED" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const actions = Array.isArray(payload.actions) ? payload.actions : [payload.actions];
    
    const results = actions.map(action => {
      if (!action.appId) return { success: false, error: "MISSING_APP_ID" };
      const result = handleAction(action);
      logTransaction(action, result);
      return result;
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true, results }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ── ACTION ROUTER ────────────────────────────────────────────────────────────

function handleAction(action) {
  const { type, data, appId } = action;
  const namespace = "APP_" + appId.toUpperCase().replace(/\\-/g, "_");

  switch (type) {
    case 'WRITE_RECORD':
      const writeRes = writeToSheet(namespace + "_" + data.sheet, data.row);
      syncShadowCache(namespace + "_" + data.sheet, appId);
      return writeRes;
    case 'QUERY_RECORDS':
      return querySheet(namespace + "_" + data.sheet, data.filters);
    case 'UPLOAD_FILE':
      return uploadToDrive(namespace + "_Assets", data.fileName, data.base64Content, data.mimeType);
    case 'SEND_MAIL':
      return sendGmail(data.to, data.subject, data.body, data.htmlBody, appId);
    default:
      return { success: false, error: "Action NOT_SUPPORTED" };
  }
}

// ── SERVICE IMPLEMENTATIONS ──────────────────────────────────────────────────

function writeToSheet(fullSheetName, rowData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(fullSheetName) || ss.insertSheet(fullSheetName);
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(Object.keys(rowData));
  }
  
  sheet.appendRow(Object.values(rowData));
  return { success: true, service: "SHEETS", resource: fullSheetName };
}

function querySheet(fullSheetName, filters) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(fullSheetName);
  if (!sheet) return { success: true, data: [] };
  
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  
  let data = values.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  if (filters) {
    data = data.filter(item => {
      return Object.keys(filters).every(key => item[key] == filters[key]);
    });
  }
  
  return { success: true, data: data.reverse().slice(0, 100) }; // Latest 100
}

function syncShadowCache(fullSheetName, appId) {
  try {
    const res = querySheet(fullSheetName);
    const jsonStr = JSON.stringify(res.data);
    
    let cacheFolder = getFolder("SHADOW_CACHE");
    let fileName = appId + "_" + fullSheetName + ".json";
    
    let files = cacheFolder.getFilesByName(fileName);
    let file = files.hasNext() ? files.next() : cacheFolder.createFile(fileName, jsonStr, MimeType.PLAIN_TEXT);
    
    if (file) {
      file.setContent(jsonStr);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  } catch (e) {
    console.error("Cache Sync Failed: " + e.message);
  }
}

function getFolder(name) {
  let folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function uploadToDrive(folderName, fileName, base64, mimeType) {
  let masterFolder = getFolder("Decentralized_Apps");
  let subFolders = masterFolder.getFoldersByName(folderName);
  let appFolder = subFolders.hasNext() ? subFolders.next() : masterFolder.createFolder(folderName);
  
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
  const file = appFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return { success: true, fileId: file.getId(), url: file.getUrl() };
}

function sendGmail(to, subject, body, htmlBody, appId) {
  const fullSubject = "[" + appId.toUpperCase() + "] " + subject;
  GmailApp.sendEmail(to, fullSubject, body, { htmlBody: htmlBody });
  return { success: true, service: "GMAIL" };
}

function buildDashboardHTML() {
  return \`
    <html>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body { background: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; }
          .card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
          .pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        </style>
      </head>
      <body class="p-8">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Ops Manager Cloud OS
            </h1>
            <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm border border-emerald-500/30 flex items-center">
              <span class="w-2 h-2 bg-emerald-400 rounded-full mr-2 pulse"></span> ONLINE
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="card p-6 rounded-2xl">
              <p class="text-slate-400 text-sm mb-1">Version</p>
              <p class="text-2xl font-mono text-blue-400">\${VERSION}</p>
            </div>
            <div class="card p-6 rounded-2xl">
              <p class="text-slate-400 text-sm mb-1">Emails Remaining</p>
              <p class="text-2xl font-mono text-emerald-400">\${MailApp.getRemainingDailyQuota()}</p>
            </div>
            <div class="card p-6 rounded-2xl">
              <p class="text-slate-400 text-sm mb-1">Active Namespace</p>
              <p class="text-2xl font-mono text-purple-400">UNIVERSAL</p>
            </div>
          </div>

          <div class="card rounded-2xl overflow-hidden">
            <div class="p-4 border-b border-white/10 bg-white/5">
              <h3 class="font-semibold">Recent Activity Log</h3>
            </div>
            <div class="p-0">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-800/50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th class="px-6 py-3">Timestamp</th>
                    <th class="px-6 py-3">App</th>
                    <th class="px-6 py-3">Action</th>
                    <th class="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  \${getRecentLogsHTML()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body>
    </html>
  \`;
}

function getRecentLogsHTML() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("PLATFORM_AUDIT_LOG");
    if (!sheet) return '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-500">No activity yet.</td></tr>';
    
    const rows = sheet.getRange(Math.max(1, sheet.getLastRow() - 9), 1, Math.min(sheet.getLastRow(), 10), 4).getValues().reverse();
    return rows.map(r => \`
      <tr>
        <td class="px-6 py-4 text-slate-400">\${new Date(r[0]).toLocaleTimeString()}</td>
        <td class="px-6 py-4 font-mono text-blue-300">\${r[1]}</td>
        <td class="px-6 py-4">\${r[2]}</td>
        <td class="px-6 py-4">
          <span class="px-2 py-0.5 rounded text-xs \${r[3] === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}">
            \${r[3]}
          </span>
        </td>
      </tr>
    \`).join('');
  } catch (e) { return ''; }
}

function logTransaction(action, result) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let auditSheet = ss.getSheetByName("PLATFORM_AUDIT_LOG") || ss.insertSheet("PLATFORM_AUDIT_LOG");
    if (auditSheet.getLastRow() === 0) auditSheet.appendRow(["Timestamp", "AppID", "Action", "Status"]);
    auditSheet.appendRow([new Date().toISOString(), action.appId, action.type, result.success ? "SUCCESS" : "ERROR"]);
  } catch (e) {}
}
`;
