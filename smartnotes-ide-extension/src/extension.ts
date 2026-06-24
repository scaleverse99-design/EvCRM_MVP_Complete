import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import { SNote } from './types';

// Helper to make HTTP/HTTPS GET requests
function httpGet(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;
      client.get(urlStr, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Server returned status ${res.statusCode}: ${data}`));
          }
        });
      }).on('error', (err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

// Helper to make HTTP/HTTPS POST requests
function httpPost(urlStr: string, bodyData: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;
      const postData = JSON.stringify(bodyData);
      
      const req = client.request(urlStr, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Server returned status ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (err) => reject(err));
      req.write(postData);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

export function activate(context: vscode.ExtensionContext) {
  console.log('SmartNotes IDE Sync extension is now active!');

  const provider = new SmartNotesProvider();
  vscode.window.registerTreeDataProvider('smartnotes-contexts-view', provider);

  // 1. Refresh Command
  const refreshCmd = vscode.commands.registerCommand('smartnotes.refresh', () => {
    provider.refresh();
    vscode.window.showInformationMessage('SmartNotes contexts refreshed!');
  });

  // 2. Copy Context Command
  const copyCmd = vscode.commands.registerCommand('smartnotes.copy', (node: SmartNoteItem) => {
    if (!node || !node.note) {
      vscode.window.showErrorMessage('No context selected.');
      return;
    }
    const prompt = generateHandoffPromptText(node.note);
    vscode.env.clipboard.writeText(prompt).then(() => {
      vscode.window.showInformationMessage(`"${node.note.title}" handoff context copied to clipboard!`);
    });
  });

  // 3. Inject Context Command
  const injectCmd = vscode.commands.registerCommand('smartnotes.inject', (node: SmartNoteItem) => {
    if (!node || !node.note) {
      vscode.window.showErrorMessage('No context selected.');
      return;
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Open a text file first to inject context.');
      return;
    }

    const prompt = generateHandoffPromptText(node.note);
    editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, prompt);
    }).then(() => {
      vscode.window.showInformationMessage(`"${node.note.title}" handoff context injected!`);
    });
  });

  // 4. Save Selection Command
  const saveSelectionCmd = vscode.commands.registerCommand('smartnotes.saveSelection', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Open a file and select text to save.');
      return;
    }

    const selectedText = editor.document.getText(editor.selection);
    if (!selectedText.trim()) {
      vscode.window.showErrorMessage('No text selected. Please highlight some code or notes to save.');
      return;
    }

    const titleInput = await vscode.window.showInputBox({
      prompt: 'Enter a title for this SmartNotes session (optional)',
      placeHolder: 'e.g. Refactoring utility database query'
    });

    const config = vscode.workspace.getConfiguration('smartnotes');
    const rawBackendUrl = config.get<string>('backendUrl') || 'https://notes.socialcom.store';
    const clientId = config.get<string>('clientId') || 'notes';

    const backendUrl = rawBackendUrl.replace(/\/$/, '');

    // Format target API URL
    let targetUrl = `${backendUrl}/api/notes`;
    let useActEndpoint = false;

    // Use /api/act for standard production and custom workspaces
    if (clientId !== 'notes' || backendUrl.includes('notes.socialcom.store')) {
      targetUrl = `${backendUrl}/api/act?clientId=${clientId}`;
      useActEndpoint = true;
    }

    const payload = {
      id: `note-ide-${Date.now()}`,
      source_tool: 'antigravity', // default to IDE desktop
      session_url: editor.document.uri.toString(),
      title: titleInput || 'IDE Snippet Capture',
      full_content: selectedText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration_minutes: 1,
      attachments: [],
      summary: '',
      tags: ['ide-capture'],
      entities: { people: [], companies: [], projects: [], deals: [] },
      actions: [],
      context_links: [],
      pinned: false,
      format_ver: '2.0',
      project_id: 'smartnotes'
    };

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Saving session to SmartNotes...',
      cancellable: false
    }, async () => {
      try {
        if (useActEndpoint) {
          await httpPost(targetUrl, {
            action: 'SAVE_NOTE',
            data: payload
          });
        } else {
          await httpPost(targetUrl, payload);
        }
        vscode.window.showInformationMessage('Session saved to SmartNotes successfully!');
        provider.refresh();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to save: ${err.message}`);
      }
    });
  });

  // 5. Open Details Command
  const openDetailsCmd = vscode.commands.registerCommand('smartnotes.openDetails', (note: SNote) => {
    const panel = vscode.window.createWebviewPanel(
      'smartnotes-details',
      note.title || 'SmartNotes Detail',
      vscode.ViewColumn.Active,
      { enableScripts: true }
    );
    panel.webview.html = getWebviewContent(note);
  });

  // 6. Sync Codebase Command
  const syncCodebaseCmd = vscode.commands.registerCommand('smartnotes.syncCodebase', () => {
    syncCodebaseCommand();
  });

  // Background monitor: Sync file changes on save and perform duplicate check
  let saveTimer: NodeJS.Timeout | null = null;
  const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    const ext = path.extname(document.fileName).toLowerCase();
    const allowedExtensions = new Set([
      '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java',
      '.cpp', '.h', '.css', '.html', '.json', '.md', '.txt',
      '.yaml', '.yml'
    ]);
    if (!allowedExtensions.has(ext)) {
      return;
    }

    const projInfo = getProjectInfoForFile(document.fileName);
    if (!projInfo) {
      return;
    }

    const excludedDirs = ['node_modules', '.git', '.gemini', 'dist', 'build', '.next', 'out', 'bin', 'obj', 'venv', '.venv'];
    const pathParts = projInfo.relativePath.split('/');
    if (pathParts.some(part => excludedDirs.includes(part) || part.startsWith('.'))) {
      return;
    }

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(async () => {
      await autoSyncAndCheckDuplicates(document, projInfo);
    }, 1000);
  });

  // Continuous typing auto-saver (3s debounce)
  let changeTimer: NodeJS.Timeout | null = null;
  const changeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
    const document = event.document;
    const ext = path.extname(document.fileName).toLowerCase();
    const allowedExtensions = new Set([
      '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java',
      '.cpp', '.h', '.css', '.html', '.json', '.md', '.txt',
      '.yaml', '.yml'
    ]);
    if (!allowedExtensions.has(ext)) {
      return;
    }

    const projInfo = getProjectInfoForFile(document.fileName);
    if (!projInfo) {
      return;
    }

    const excludedDirs = ['node_modules', '.git', '.gemini', 'dist', 'build', '.next', 'out', 'bin', 'obj', 'venv', '.venv'];
    const pathParts = projInfo.relativePath.split('/');
    if (pathParts.some(part => excludedDirs.includes(part) || part.startsWith('.'))) {
      return;
    }

    if (changeTimer) {
      clearTimeout(changeTimer);
    }

    changeTimer = setTimeout(async () => {
      await autoSyncAndCheckDuplicates(document, projInfo);
    }, 3000);
  });

  // 7. Toggle Show All Context Command
  const toggleShowAllContextCmd = vscode.commands.registerCommand('smartnotes.toggleShowAllContext', async () => {
    const config = vscode.workspace.getConfiguration('smartnotes');
    const currentVal = config.get<boolean>('showAllContext') || false;
    const newVal = !currentVal;
    await config.update('showAllContext', newVal, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      newVal ? 'SmartNotes: Showing ALL context chats.' : 'SmartNotes: Showing only current project context.'
    );
    provider.refresh();
  });

  // Listener to refresh the view when active editor changes
  const editorListener = vscode.window.onDidChangeActiveTextEditor(() => {
    const config = vscode.workspace.getConfiguration('smartnotes');
    const showAll = config.get<boolean>('showAllContext') || false;
    if (!showAll) {
      provider.refresh();
    }
  });

  // 8. Organize Local Files Command
  const organizeLocalFilesCmd = vscode.commands.registerCommand('smartnotes.organizeLocalFiles', () => {
    organizeLocalFilesCommand();
  });

  // 9. Sync Workspace Docs Command
  const syncWorkspaceDocsCmd = vscode.commands.registerCommand('smartnotes.syncWorkspaceDocs', () => {
    syncWorkspaceDocsCommand();
  });

  context.subscriptions.push(refreshCmd, copyCmd, injectCmd, saveSelectionCmd, openDetailsCmd, syncCodebaseCmd, saveListener, changeListener, toggleShowAllContextCmd, editorListener, organizeLocalFilesCmd, syncWorkspaceDocsCmd);
}

export function deactivate() {}

// Tree Data Provider for SmartNotes
class SmartNotesProvider implements vscode.TreeDataProvider<SmartNoteItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SmartNoteItem | undefined | null | void> = new vscode.EventEmitter<SmartNoteItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SmartNoteItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SmartNoteItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SmartNoteItem): Promise<SmartNoteItem[]> {
    if (element) {
      return []; // Leaf nodes
    }

    const config = vscode.workspace.getConfiguration('smartnotes');
    const rawBackendUrl = config.get<string>('backendUrl') || 'https://notes.socialcom.store';
    const clientId = config.get<string>('clientId') || 'notes';
    const showAll = config.get<boolean>('showAllContext') || false;

    const backendUrl = rawBackendUrl.replace(/\/$/, '');

    // Format fetch URL
    let targetUrl = `${backendUrl}/api/notes`;
    if (clientId !== 'notes' || backendUrl.includes('notes.socialcom.store')) {
      targetUrl = `${backendUrl}/api/data?file=notes&clientId=${clientId}`;
    }

    try {
      const dataStr = await httpGet(targetUrl);
      const res = JSON.parse(dataStr);
      let notes: SNote[] = [];

      if (Array.isArray(res)) {
        notes = res;
      } else if (res && res.success && res.data && Array.isArray(res.data.notes)) {
        notes = res.data.notes;
      }

      // Filter notes if showAll is false
      if (!showAll) {
        const activeProj = getActiveProject();
        if (activeProj) {
          notes = notes.filter(n => {
            const noteProj = n.project_id ? n.project_id.toLowerCase() : '';
            const inTags = n.tags && n.tags.map(t => t.toLowerCase()).includes(activeProj);
            return noteProj === activeProj || inTags;
          });
        }
      }

      return notes.map(note => new SmartNoteItem(note));
    } catch (err: any) {
      vscode.window.showErrorMessage(`SmartNotes: Failed to load contexts: ${err.message}`);
      return [];
    }
  }
}

// Tree Item class representing a single note
class SmartNoteItem extends vscode.TreeItem {
  constructor(public readonly note: SNote) {
    super(note.title || 'Untitled Session', vscode.TreeItemCollapsibleState.None);

    this.tooltip = `${note.title}\n\nSummary: ${note.summary || 'N/A'}\nSource: ${note.source_tool}\nProject: ${note.project_id || 'smartnotes'}`;
    this.description = note.source_tool === 'antigravity' ? 'antigravity' : note.source_tool;

    // Use specific tool emojis as tree icons
    let emoji = '🧠';
    if (note.source_tool === 'claude') { emoji = '🟠'; }
    else if (note.source_tool === 'chatgpt') { emoji = '🟢'; }
    else if (note.source_tool === 'gemini') { emoji = '🔵'; }
    else if (note.source_tool === 'perplexity') { emoji = '🟣'; }
    else if (note.source_tool === 'cursor') { emoji = '💻'; }
    else if (note.source_tool === 'antigravity') { emoji = '🛸'; }

    this.label = `${emoji} ${note.title}`;
    this.contextValue = 'smartnote';
    this.command = {
      command: 'smartnotes.openDetails',
      title: 'Open Note Details',
      arguments: [note]
    };
  }
}

// Helper to generate handoff capsule prompt text
function generateHandoffPromptText(note: SNote): string {
  const openActions = note.actions ? note.actions.filter(a => !a.done) : [];
  const completedActions = note.actions ? note.actions.filter(a => a.done) : [];

  let prompt = `[SMARTNOTES HANDOFF CAPSULE]
=========================================
You are continuing a session from another AI tool. Below is the comprehensive context capsule and handoff document. Read it carefully to absorb all prior context, constraints, and progress before responding.

SESSION TITLE: ${note.title || 'Untitled Note'}
ORIGINAL TOOL: ${note.source_tool || 'AI Assistant'}
DATE CAPTURED: ${note.created_at ? new Date(note.created_at).toLocaleString() : 'N/A'}
`;

  if (note.summary) {
    prompt += `\n--- EXECUTIVE SUMMARY ---\n${note.summary}\n`;
  }

  if (note.full_content) {
    prompt += `\n--- CONVERSATION CONTENT & TRANSCRIPT CONTEXT ---\n${note.full_content}\n`;
  }

  if (note.snippets && note.snippets.length > 0) {
    prompt += `\n--- ATTACHED CODE SNIPPETS ---\n`;
    note.snippets.forEach((s, idx) => {
      prompt += `\n[Snippet #${idx + 1} (${s.language || 'text'})]:\n\`\`\`${s.language || ''}\n${s.content}\n\`\`\`\n`;
    });
  }

  if (note.attachments && note.attachments.length > 0) {
    prompt += `\n--- SYNCED ATTACHMENTS ---\n`;
    note.attachments.forEach(a => {
      prompt += `- ${a.name} (${a.type}, size: ${a.size})\n`;
    });
  }

  if (openActions.length > 0 || completedActions.length > 0) {
    prompt += `\n--- ACTION ITEMS ---\n`;
    if (openActions.length > 0) {
      prompt += `[TODO]:\n` + openActions.map(a => `[ ] ${a.text}`).join('\n') + `\n`;
    }
    if (completedActions.length > 0) {
      prompt += `[COMPLETED]:\n` + completedActions.map(a => `[x] ${a.text}`).join('\n') + `\n`;
    }
  }

  if (note.tags && note.tags.length > 0) {
    prompt += `\n--- TAGS & CATEGORIES ---\nTags: ${note.tags.join(', ')}\n`;
  }

  prompt += `
=========================================
INSTRUCTIONS FOR THE ASSISTANT:
1. Acknowledge receipt of this SmartNotes Handoff Capsule.
2. Confirm you have absorbed all prior discussion details, decisions, code snippets, and active action items.
3. Summarize your understanding of the current state of work in 1-2 sentences.
4. Ask the user how they would like to proceed with the remaining open items or next steps.
`;

  return prompt;
}

function escapeHtml(text: string): string {
  if (!text) { return ''; }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getWebviewContent(note: SNote): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 20px;
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
    }
    .card {
      border: 1px solid var(--vscode-widget-border);
      border-radius: 8px;
      padding: 20px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--vscode-widget-border);
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      color: var(--vscode-textLink-foreground);
    }
    .badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-weight: bold;
      text-transform: uppercase;
    }
    .meta {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 15px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-foreground);
    }
    .summary {
      font-size: 13px;
      line-height: 1.5;
      background: var(--vscode-textBlockQuote-background);
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid var(--vscode-textBlockQuote-border);
      white-space: pre-wrap;
    }
    .actions-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .action-item {
      display: flex;
      align-items: center;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .action-checkbox {
      margin-right: 8px;
    }
    .content-box {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      background: var(--vscode-textCodeBlock-background);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      white-space: pre-wrap;
      max-height: 300px;
      border: 1px solid var(--vscode-widget-border);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">${escapeHtml(note.title)}</h1>
      <span class="badge">${escapeHtml(note.source_tool)}</span>
    </div>
    <div class="meta">
      <strong>Project:</strong> ${escapeHtml(note.project_id || 'smartnotes')} | 
      <strong>Captured:</strong> ${note.created_at ? new Date(note.created_at).toLocaleString() : 'N/A'}
    </div>
    
    ${note.summary ? `
    <div class="section-title">AI Executive Summary</div>
    <div class="summary">${escapeHtml(note.summary)}</div>
    ` : ''}

    ${note.actions && note.actions.length > 0 ? `
    <div class="section-title">Action Items</div>
    <ul class="actions-list">
      ${note.actions.map(act => `
        <li class="action-item">
          <input type="checkbox" class="action-checkbox" ${act.done ? 'checked' : ''} disabled />
          <span>${escapeHtml(act.text)}</span>
        </li>
      `).join('')}
    </ul>
    ` : ''}

    ${note.full_content ? `
    <div class="section-title">Capsule Content</div>
    <pre class="content-box"><code>${escapeHtml(note.full_content)}</code></pre>
    ` : ''}
  </div>
</body>
</html>`;
}

async function syncCodebaseCommand() {
  const config = vscode.workspace.getConfiguration('smartnotes');
  const rawBackendUrl = config.get<string>('backendUrl') || 'https://notes.socialcom.store';
  const clientId = config.get<string>('clientId') || 'notes';
  const backendUrl = rawBackendUrl.replace(/\/$/, '');

  const options: vscode.QuickPickItem[] = [];

  // Option 1: Active Workspace
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    options.push({
      label: '$(folder) Sync Active Workspace',
      description: workspaceFolders[0].name,
      detail: workspaceFolders[0].uri.fsPath
    });
  }

  // Option 2: Scratch Projects
  const scratchDir = 'C:\\Users\\balaj\\.gemini\\antigravity-ide\\scratch';
  try {
    if (fs.existsSync(scratchDir)) {
      const children = fs.readdirSync(scratchDir, { withFileTypes: true });
      children.forEach(child => {
        if (child.isDirectory() && !child.name.startsWith('.')) {
          // Check if it's the active workspace to avoid duplication
          const isActive = workspaceFolders && workspaceFolders.some(f => f.uri.fsPath.toLowerCase() === path.join(scratchDir, child.name).toLowerCase());
          if (!isActive) {
            options.push({
              label: `$(project) Sync Project: ${child.name}`,
              description: 'Scratch folder project',
              detail: path.join(scratchDir, child.name)
            });
          }
        }
      });
    }
  } catch (err) {
    // Ignore error
  }

  if (options.length === 0) {
    vscode.window.showErrorMessage('No workspaces or scratch projects found to sync.');
    return;
  }

  const selection = await vscode.window.showQuickPick(options, {
    placeHolder: 'Select a project codebase to sync to SmartNotes'
  });

  if (!selection || !selection.detail) {
    return;
  }

  const projectPath = selection.detail;
  const projectName = selection.label.includes('Sync Active Workspace') 
    ? (workspaceFolders ? workspaceFolders[0].name : 'ActiveWorkspace')
    : selection.label.replace('Sync Project: ', '').replace('$(project) ', '');

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Scanning and syncing ${projectName} codebase...`,
    cancellable: false
  }, async (progress) => {
    try {
      progress.report({ message: 'Scanning files...' });
      const filesToSync: FileInfo[] = [];
      scanFilesRecursive(projectPath, projectPath, filesToSync);

      if (filesToSync.length === 0) {
        vscode.window.showWarningMessage(`No source files found to sync in ${projectName}.`);
        return;
      }

      progress.report({ message: `Uploading ${filesToSync.length} files...` });

      // Determine endpoint
      let targetUrl = `${backendUrl}/api/notes`;
      let useActEndpoint = false;
      if (clientId !== 'notes' || backendUrl.includes('notes.socialcom.store')) {
        targetUrl = `${backendUrl}/api/act?clientId=${clientId}`;
        useActEndpoint = true;
      }

      let successCount = 0;
      for (let i = 0; i < filesToSync.length; i++) {
        const file = filesToSync[i];
        progress.report({ message: `Uploading [${i + 1}/${filesToSync.length}] ${file.relativePath}` });
        try {
          const payload = {
            id: `note-codefile-${projectName.toLowerCase()}-${Buffer.from(file.relativePath).toString('hex')}`,
            source_tool: 'antigravity', // IDE
            session_url: vscode.Uri.file(file.fullPath).toString(),
            title: `${projectName} / ${file.relativePath}`,
            full_content: file.content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            duration_minutes: 1,
            attachments: [],
            summary: `Codebase file from ${projectName}. Relative path: ${file.relativePath}`,
            tags: ['codebase', projectName.toLowerCase()],
            entities: { people: [], companies: [], projects: [projectName], deals: [] },
            actions: [],
            context_links: [],
            pinned: false,
            format_ver: '2.0',
            project_id: projectName.toLowerCase()
          };

          if (useActEndpoint) {
            await httpPost(targetUrl, {
              action: 'SAVE_NOTE',
              data: payload
            });
          } else {
            await httpPost(targetUrl, payload);
          }
          successCount++;
        } catch (e) {
          // Continue with next file
        }
      }

      vscode.window.showInformationMessage(`Successfully synced ${successCount} codebase files for ${projectName}!`);
      vscode.commands.executeCommand('smartnotes.refresh');
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to sync codebase: ${err.message}`);
    }
  });
}

async function organizeLocalFilesCommand() {
  const config = vscode.workspace.getConfiguration('smartnotes');
  const rawBackendUrl = config.get<string>('backendUrl') || 'https://notes.socialcom.store';
  const clientId = config.get<string>('clientId') || 'notes';
  const backendUrl = rawBackendUrl.replace(/\/$/, '');

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Organizing SmartNotes files into project directories...',
    cancellable: false
  }, async (progress) => {
    try {
      progress.report({ message: 'Fetching notes from backend...' });
      
      // Fetch notes for the active client
      let targetUrl = `${backendUrl}/api/notes`;
      if (clientId !== 'notes' || backendUrl.includes('notes.socialcom.store')) {
        targetUrl = `${backendUrl}/api/data?file=notes&clientId=${clientId}`;
      }
      
      const dataStr = await httpGet(targetUrl);
      const res = JSON.parse(dataStr);
      let notes: SNote[] = [];

      if (Array.isArray(res)) {
        notes = res;
      } else if (res && res.success && res.data && Array.isArray(res.data.notes)) {
        notes = res.data.notes;
      }

      if (notes.length === 0) {
        vscode.window.showInformationMessage('No notes found to organize.');
        return;
      }

      progress.report({ message: `Grouping ${notes.length} notes...` });

      // Group by project_id
      const grouped: { [key: string]: SNote[] } = {};
      notes.forEach(note => {
        let proj = note.project_id || 'general';
        proj = proj.toLowerCase().trim();
        if (!grouped[proj]) {
          grouped[proj] = [];
        }
        grouped[proj].push(note);
      });

      const scratchDir = 'C:\\Users\\balaj\\.gemini\\antigravity-ide\\scratch';
      
      // Dynamic mapping of active VSCode workspace folders
      const activeWorkspaceDirs: { [key: string]: string[] } = {};
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders) {
        workspaceFolders.forEach(folder => {
          const normName = normalizeProjectName(folder.name);
          if (!activeWorkspaceDirs[normName]) {
            activeWorkspaceDirs[normName] = [];
          }
          activeWorkspaceDirs[normName].push(folder.uri.fsPath);
        });
      }

      const projectMappings: { [key: string]: string[] } = {
        'socialcom-store': [path.join(scratchDir, 'socialcom-store')],
        'ev-crm': [
          'C:\\Users\\balaj\\Downloads\\EvCRM_MVP_Complete\\evcrm-mvp',
          path.join(scratchDir, 'ev-crm')
        ],
        'smartnotes': [
          path.join(scratchDir, 'smartnotes-ide-extension'),
          path.join(scratchDir, 'smartnotes-dashboard')
        ],
        'officeconnect': [
          path.join(scratchDir, 'OfficeConnectMVP'),
          path.join(scratchDir, 'OfficeConnectBackend'),
          path.join(scratchDir, 'OfficeConnectPitch')
        ],
        'taskbarpro': [path.join(scratchDir, 'TaskBarPro')],
        'aura-commerce': [path.join(scratchDir, 'aura-commerce')],
        'craftman': [path.join(scratchDir, 'craftman')],
        'ops-manager': [
          'C:\\Users\\balaj\\Downloads\\EvCRM_MVP_Complete\\evcrm-mvp\\ops-manager-cloudrun',
          path.join(scratchDir, 'ops-manager')
        ],
        'salesverse-crm': [path.join(scratchDir, 'salesverse-crm')],
        'socialsell': [path.join(scratchDir, 'socialsell')],
        'gogaga-holidays': [path.join(scratchDir, 'gogaga-holidays')],
        'general': [path.join(scratchDir, 'general')]
      };

      let organizedProjectsCount = 0;

      for (const [project, projectNotes] of Object.entries(grouped)) {
        let targetDirs = projectMappings[project] || [];
        
        // Dynamically add open workspace paths matching this project
        const activeDirsForProject = activeWorkspaceDirs[project] || [];
        targetDirs = Array.from(new Set([...targetDirs, ...activeDirsForProject]));

        if (targetDirs.length === 0) {
          targetDirs = [path.join(scratchDir, project)];
        }

        // Sort chronologically
        projectNotes.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

        // Build master context markdown
        let consolidatedMarkdown = `# 🧠 SmartNotes Project Master Context: ${project.toUpperCase()}\n`;
        consolidatedMarkdown += `* **Generated On:** ${new Date().toLocaleString()}\n`;
        consolidatedMarkdown += `* **Total Capture Sessions:** ${projectNotes.length}\n`;
        consolidatedMarkdown += `* **Project Status / Goal:** Context source from Idea to Final Document.\n\n`;
        consolidatedMarkdown += `---\n\n`;
        consolidatedMarkdown += `## 📋 Table of Contents\n`;
        consolidatedMarkdown += `1. [Active Todo / Action Items](#-active-todo--action-items)\n`;
        consolidatedMarkdown += `2. [Completed Action Items](#-completed-action-items)\n`;
        consolidatedMarkdown += `3. [Chronological Project Timeline](#-chronological-project-timeline)\n`;
        consolidatedMarkdown += `4. [Master Conversation Log & Key Decisions](#-master-conversation-log--key-decisions)\n\n`;
        consolidatedMarkdown += `---\n\n`;
        consolidatedMarkdown += `## ⚡ Active Todo / Action Items\n`;

        const activeTodos: string[] = [];
        const completedTodos: string[] = [];
        projectNotes.forEach(note => {
          const actions = note.actions || [];
          actions.forEach(act => {
            const itemText = `${act.text} (from session: _${note.title || 'Untitled'}_)`;
            if (act.done) {
              completedTodos.push(itemText);
            } else {
              activeTodos.push(itemText);
            }
          });
        });

        if (activeTodos.length > 0) {
          consolidatedMarkdown += activeTodos.map(todo => `* [ ] ${todo}`).join('\n') + '\n';
        } else {
          consolidatedMarkdown += `*No active action items found.*\n`;
        }

        consolidatedMarkdown += `\n---\n\n## ✅ Completed Action Items\n`;
        if (completedTodos.length > 0) {
          consolidatedMarkdown += completedTodos.map(todo => `* [x] ${todo}`).join('\n') + '\n';
        } else {
          consolidatedMarkdown += `*No completed action items recorded yet.*\n`;
        }

        consolidatedMarkdown += `\n---\n\n## ⏱️ Chronological Project Timeline\n`;
        projectNotes.forEach(note => {
          const dateStr = note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Undated';
          const summaryText = note.summary || 'No session summary available.';
          consolidatedMarkdown += `* **[${dateStr}]** _${note.title || 'Untitled Session'}_ (${note.source_tool || 'unknown'}): ${summaryText}\n`;
        });

        consolidatedMarkdown += `\n---\n\n## 💬 Master Conversation Log & Key Decisions\n`;
        projectNotes.forEach((note, idx) => {
          const dateStr = note.created_at ? new Date(note.created_at).toLocaleString() : 'N/A';
          consolidatedMarkdown += `\n### 🟢 Session #${idx + 1}: ${note.title || 'Untitled Session'}\n`;
          consolidatedMarkdown += `* **Timestamp:** ${dateStr}\n`;
          consolidatedMarkdown += `* **Source Assistant:** \`${note.source_tool || 'N/A'}\`\n`;
          consolidatedMarkdown += `* **Tags:** ${note.tags && note.tags.length > 0 ? note.tags.map(t => `\`${t}\``).join(', ') : 'none'}\n\n`;
          consolidatedMarkdown += `#### Executive Summary:\n${note.summary || 'No summary available for this session.'}\n\n`;
          consolidatedMarkdown += `#### Conversation Log & Details:\n${note.full_content || 'No conversation transcript available.'}\n`;

          if (note.snippets && note.snippets.length > 0) {
            consolidatedMarkdown += `\n#### Associated Code Snippets:\n`;
            note.snippets.forEach((snippet, sIdx) => {
              consolidatedMarkdown += `\n##### Snippet #${sIdx + 1} (${snippet.language || 'text'}):\n\`\`\`${snippet.language || ''}\n${snippet.content}\n\`\`\`\n`;
            });
          }
          consolidatedMarkdown += `\n---\n`;
        });

        // Write files
        targetDirs.forEach(dirPath => {
          try {
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }

            const smartnotesDir = path.join(dirPath, '.smartnotes');
            const sessionsDir = path.join(smartnotesDir, 'sessions');
            if (!fs.existsSync(sessionsDir)) {
              fs.mkdirSync(sessionsDir, { recursive: true });
            }

            // Write master
            fs.writeFileSync(path.join(dirPath, 'smartnotes_context.md'), consolidatedMarkdown, 'utf8');

            // Write individual session files
            projectNotes.forEach(note => {
              const dateStr = note.created_at ? note.created_at.split('T')[0] : 'undated';
              const cleanTitle = (note.title || 'Untitled Session').replace(/[\/\\?%*:|"<>]/g, '-').trim().substring(0, 100);
              const sessionFile = `[${dateStr}] [${note.source_tool || 'AI'}] ${cleanTitle}`;
              const noteFilePath = path.join(sessionsDir, `${sessionFile}.md`);
              
              let noteMarkdown = `# Session: ${note.title || 'Untitled Session'}\n`;
              noteMarkdown += `* **Date Captured:** ${note.created_at ? new Date(note.created_at).toLocaleString() : 'N/A'}\n`;
              noteMarkdown += `* **Source Tool:** ${note.source_tool || 'manual'}\n`;
              noteMarkdown += `* **Tags:** ${note.tags ? note.tags.join(', ') : 'none'}\n`;
              noteMarkdown += `* **Original URL:** ${note.session_url || 'N/A'}\n\n`;
              noteMarkdown += `---\n\n## Executive Summary\n${note.summary || 'No summary available.'}\n\n`;
              noteMarkdown += `## Conversation Transcript\n${note.full_content || 'No conversation contents.'}\n`;

              if (note.snippets && note.snippets.length > 0) {
                noteMarkdown += `\n## Code Snippets\n`;
                note.snippets.forEach((s, idx) => {
                  noteMarkdown += `### Snippet #${idx + 1} (${s.language || 'text'})\n\`\`\`${s.language || ''}\n${s.content}\n\`\`\`\n\n`;
                });
              }

              fs.writeFileSync(noteFilePath, noteMarkdown, 'utf8');
            });
          } catch (writeErr: any) {
            console.error(`Failed to write project ${project} in ${dirPath}:`, writeErr.message);
          }
        });

        organizedProjectsCount++;
      }

      vscode.window.showInformationMessage(`SmartNotes: Successfully organized files for ${organizedProjectsCount} projects!`);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to organize files: ${err.message}`);
    }
  });
}

async function syncWorkspaceDocsCommand() {
  const config = vscode.workspace.getConfiguration('smartnotes');
  const rawBackendUrl = config.get<string>('backendUrl') || 'http://localhost:3001';
  const clientId = config.get<string>('clientId') || 'notes';
  const backendUrl = rawBackendUrl.replace(/\/$/, '');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No active workspace folders found to sync.');
    return;
  }

  // Pre-fill path, check if there's a docs folder
  const activePath = workspaceFolders[0].uri.fsPath;
  const docsPath = path.join(activePath, 'docs');
  const defaultPath = fs.existsSync(docsPath) ? docsPath : activePath;

  const targetPath = await vscode.window.showInputBox({
    prompt: 'Enter folder path containing project documentation (PDFs, Markdown specs, Word files)',
    value: defaultPath,
    placeHolder: 'e.g. C:\\project\\docs'
  });

  if (!targetPath) {
    return;
  }

  if (!fs.existsSync(targetPath)) {
    vscode.window.showErrorMessage(`Path does not exist: ${targetPath}`);
    return;
  }

  const projectName = workspaceFolders[0].name;

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Importing and cloud-syncing documentation for ${projectName}...`,
    cancellable: false
  }, async (progress) => {
    try {
      progress.report({ message: 'Sending sync request to local backend...' });
      
      const payload = {
        dirPath: targetPath,
        clientId: clientId,
        projectId: projectName.toLowerCase()
      };

      const importUrl = `${backendUrl}/api/import-docs`;
      console.log(`[Extension] Posting to import-docs: ${importUrl}`);
      
      const responseStr = await httpPost(importUrl, payload);
      const res = JSON.parse(responseStr);
      
      if (res.success) {
        vscode.window.showInformationMessage(res.message);
        vscode.commands.executeCommand('smartnotes.refresh');
      } else {
        vscode.window.showErrorMessage(`Sync failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to sync documents: ${err.message}`);
    }
  });
}

interface FileInfo {
  name: string;
  fullPath: string;
  relativePath: string;
  content: string;
}

function scanFilesRecursive(dir: string, baseDir: string = dir, fileList: FileInfo[] = []): FileInfo[] {
  if (fileList.length >= 50) return fileList; // Hard cap of 50 files

  const allowedExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java',
    '.cpp', '.h', '.css', '.html', '.json', '.md', '.txt',
    '.yaml', '.yml'
  ]);

  const excludedDirs = new Set([
    'node_modules', '.git', '.gemini', 'dist', 'build',
    '.next', 'out', 'bin', 'obj', 'venv', '.venv',
    'env', '.env', 'brain', '.system_generated', '.tempmediaStorage'
  ]);

  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (file.isDirectory()) {
        if (!excludedDirs.has(file.name) && !file.name.startsWith('.')) {
          scanFilesRecursive(fullPath, baseDir, fileList);
        }
      } else {
        const ext = path.extname(file.name).toLowerCase();
        if (allowedExtensions.has(ext)) {
          // Read content, only if size is reasonable (< 150KB)
          const stats = fs.statSync(fullPath);
          if (stats.size < 150000) {
            const content = fs.readFileSync(fullPath, 'utf8');
            fileList.push({
              name: file.name,
              fullPath,
              relativePath,
              content
            });
          }
        }
      }
      if (fileList.length >= 50) break;
    }
  } catch (err) {
    // Ignore read errors
  }
  return fileList;
}

function getProjectInfoForFile(filePath: string): { projectName: string, projectPath: string, relativePath: string } | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      if (filePath.toLowerCase().startsWith(folder.uri.fsPath.toLowerCase())) {
        const relativePath = path.relative(folder.uri.fsPath, filePath).replace(/\\/g, '/');
        return {
          projectName: folder.name,
          projectPath: folder.uri.fsPath,
          relativePath
        };
      }
    }
  }

  // Check scratch directory
  const scratchDir = 'C:\\Users\\balaj\\.gemini\\antigravity-ide\\scratch';
  if (filePath.toLowerCase().startsWith(scratchDir.toLowerCase())) {
    const relativeToScratch = path.relative(scratchDir, filePath);
    const parts = relativeToScratch.split(path.sep);
    if (parts.length > 1) {
      const projectName = parts[0];
      const projectPath = path.join(scratchDir, projectName);
      const relativePath = parts.slice(1).join('/').replace(/\\/g, '/');
      return {
        projectName,
        projectPath,
        relativePath
      };
    }
  }

  // Fallback for files outside workspace or scratch directory
  const dirName = path.dirname(filePath);
  const projectName = path.basename(dirName) || 'General';
  const relativePath = path.basename(filePath);
  return {
    projectName,
    projectPath: dirName,
    relativePath
  };
}

function getActiveProject(): string | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    const folders = vscode.workspace.workspaceFolders;
    const name = folders && folders.length > 0 ? folders[0].name : null;
    return name ? normalizeProjectName(name) : 'smartnotes';
  }
  const info = getProjectInfoForFile(editor.document.fileName);
  return info ? normalizeProjectName(info.projectName) : 'smartnotes';
}

function normalizeProjectName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('smartnotes') || 
      lower.includes('ops-manager') || 
      lower.includes('opsmanager') ||
      lower.includes('brain') || 
      lower.includes('general') || 
      lower.includes('scratch') || 
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(lower)) {
    return 'smartnotes';
  }
  if (lower.includes('ev-crm') || lower.includes('evcrm')) {
    return 'ev-crm';
  }
  return lower;
}

function extractFunctionsFromContent(content: string, relativePath: string): string[] {
  const funcs: string[] = [];
  const ext = path.extname(relativePath).toLowerCase();

  // Standard regexes
  const jsFuncRegex = /\bfunction\s+([a-zA-Z0-9_$]+)\s*\(/g;
  const jsArrowRegex = /\b(const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g;
  const pyFuncRegex = /\bdef\s+([a-zA-Z0-9_$]+)\s*\(/g;
  const goFuncRegex = /\bfunc\s+(?:\([^)]*\)\s*)?([a-zA-Z0-9_$]+)\s*\(/g;
  const methodRegex = /^\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/gm;

  const reservedWords = new Set(['if', 'for', 'while', 'switch', 'catch', 'constructor', 'get', 'set', 'async', 'describe', 'it', 'test', 'expect']);

  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    let m;
    while ((m = jsFuncRegex.exec(content)) !== null) {
      if (m[1] && !reservedWords.has(m[1])) funcs.push(m[1]);
    }
    let m2;
    while ((m2 = jsArrowRegex.exec(content)) !== null) {
      if (m2[2] && !reservedWords.has(m2[2])) funcs.push(m2[2]);
    }
    let m3;
    while ((m3 = methodRegex.exec(content)) !== null) {
      if (m3[1] && !reservedWords.has(m3[1]) && isNaN(Number(m3[1]))) {
        funcs.push(m3[1]);
      }
    }
  } else if (ext === '.py') {
    let m;
    while ((m = pyFuncRegex.exec(content)) !== null) {
      if (m[1]) funcs.push(m[1]);
    }
  } else if (ext === '.go') {
    let m;
    while ((m = goFuncRegex.exec(content)) !== null) {
      if (m[1]) funcs.push(m[1]);
    }
  }

  return Array.from(new Set(funcs));
}

async function autoSyncAndCheckDuplicates(
  document: vscode.TextDocument,
  projInfo: { projectName: string, projectPath: string, relativePath: string }
) {
  const config = vscode.workspace.getConfiguration('smartnotes');
  const rawBackendUrl = config.get<string>('backendUrl') || 'https://notes.socialcom.store';
  const clientId = config.get<string>('clientId') || 'notes';
  const backendUrl = rawBackendUrl.replace(/\/$/, '');

  const content = document.getText();
  const projectName = projInfo.projectName;
  const project_id = projectName.toLowerCase();
  
  // Use a deterministic ID based on the file relative path to overwrite/update the codebase file note
  const fileNoteId = `note-codefile-${project_id}-${Buffer.from(projInfo.relativePath).toString('hex')}`;

  // 1. Sync the file content to SmartNotes
  let targetUrl = `${backendUrl}/api/notes`;
  let useActEndpoint = false;
  if (clientId !== 'notes' || backendUrl.includes('notes.socialcom.store')) {
    targetUrl = `${backendUrl}/api/act?clientId=${clientId}`;
    useActEndpoint = true;
  }

  const payload = {
    id: fileNoteId,
    source_tool: 'antigravity',
    session_url: document.uri.toString(),
    title: `${projectName} / ${projInfo.relativePath}`,
    full_content: content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    duration_minutes: 1,
    attachments: [],
    summary: `Codebase file from ${projectName}. Relative path: ${projInfo.relativePath}`,
    tags: ['codebase', project_id],
    entities: { people: [], companies: [], projects: [projectName], deals: [] },
    actions: [],
    context_links: [],
    pinned: false,
    format_ver: '2.0',
    project_id
  };

  try {
    if (useActEndpoint) {
      await httpPost(targetUrl, {
        action: 'SAVE_NOTE',
        data: payload
      });
    } else {
      await httpPost(targetUrl, payload);
    }
    console.log(`[SmartNotes Monitor] Synced file: ${projInfo.relativePath}`);
  } catch (err: any) {
    console.error(`[SmartNotes Monitor] Failed to sync ${projInfo.relativePath}:`, err.message);
  }

  // 2. Perform duplicate check
  try {
    let fetchUrl = `${backendUrl}/api/notes`;
    if (clientId !== 'notes' || backendUrl.includes('notes.socialcom.store')) {
      fetchUrl = `${backendUrl}/api/data?file=notes&clientId=${clientId}`;
    }

    const dataStr = await httpGet(fetchUrl);
    const res = JSON.parse(dataStr);
    let allNotes: SNote[] = [];

    if (Array.isArray(res)) {
      allNotes = res;
    } else if (res && res.success && res.data && Array.isArray(res.data.notes)) {
      allNotes = res.data.notes;
    }

    const otherCodebaseNotes = allNotes.filter(n => 
      n.project_id === project_id && 
      n.tags.includes('codebase') && 
      n.id !== fileNoteId
    );

    if (otherCodebaseNotes.length === 0) {
      return;
    }

    const currentFunctions = extractFunctionsFromContent(content, projInfo.relativePath);
    if (currentFunctions.length === 0) {
      return;
    }

    const duplicates: { funcName: string, foundInFile: string }[] = [];

    otherCodebaseNotes.forEach(note => {
      let otherFilePath = note.title;
      if (note.title.includes(' / ')) {
        otherFilePath = note.title.split(' / ').slice(1).join(' / ');
      }

      const otherFunctions = extractFunctionsFromContent(note.full_content || '', otherFilePath);
      currentFunctions.forEach(f => {
        if (otherFunctions.includes(f)) {
          duplicates.push({
            funcName: f,
            foundInFile: otherFilePath
          });
        }
      });
    });

    if (duplicates.length > 0) {
      const dupMessages = duplicates.map(d => `Function "${d.funcName}()" is already defined in "${d.foundInFile}"`).join('\n');
      vscode.window.showWarningMessage(
        `⚠️ SmartNotes Anti-Duplication Warning:\n${dupMessages}\n\nPlease reuse the existing code to keep the codebase clean!`,
        { modal: false }
      );
    }
  } catch (err: any) {
    console.error(`[SmartNotes Monitor] Duplicate check failed:`, err.message);
  }
}


