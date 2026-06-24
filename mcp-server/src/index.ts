#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared data folder (must point to smartnotes-dashboard/data)
const DATA_DIR = path.resolve(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Active project state inside the MCP server process
let ACTIVE_PROJECT_ID = 'smartnotes';

// Interfaces
interface ActionItem {
  id: string;
  text: string;
  due: string | null;
  done: boolean;
  snoozed: boolean;
  snoozeUntil: string | null;
  source_line: string;
  snote_id: string;
  snote_title: string;
  source_tool: string;
}

interface Snippet {
  type: 'code' | 'text' | 'image_ref';
  language?: string;
  content: string;
}

interface Entities {
  people: string[];
  companies: string[];
  projects: string[];
  deals: string[];
}

interface SNote {
  id: string;
  created_at: string;
  updated_at: string;
  source_tool: string;
  session_url: string;
  title: string;
  summary: string;
  full_content: string;
  snippets: Snippet[];
  tags: string[];
  entities: Entities;
  actions: ActionItem[];
  context_links: string[];
  pinned: boolean;
  format_ver: string;
  project_id?: string;
  completion_pct?: number;
  last_file?: string;
}

// Load configurations and environment variables
let GEMINI_API_KEY = '';
let SMARTNOTES_CLIENT_ID = 'notes';
let SMARTNOTES_BACKEND_URL = 'https://notes.socialcom.store';

try {
  let currentDir = __dirname;
  let envPath = '';
  // Check up to 5 parent directories to find .env
  for (let i = 0; i < 5; i++) {
    const checkPath = path.join(currentDir, '.env');
    if (fs.existsSync(checkPath)) {
      envPath = checkPath;
      break;
    }
    const checkDashboardPath = path.join(currentDir, 'smartnotes-dashboard', '.env');
    if (fs.existsSync(checkDashboardPath)) {
      envPath = checkDashboardPath;
      break;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  // Fallback to specific absolute path
  if (!envPath) {
    const fallbackPath = 'C:\\Users\\balaj\\.gemini\\antigravity-ide\\scratch\\.env';
    if (fs.existsSync(fallbackPath)) {
      envPath = fallbackPath;
    }
  }

  if (envPath) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        if (key === 'GEMINI_API_KEY') GEMINI_API_KEY = val;
        if (key === 'SMARTNOTES_CLIENT_ID') SMARTNOTES_CLIENT_ID = val;
        if (key === 'SMARTNOTES_BACKEND_URL') SMARTNOTES_BACKEND_URL = val;
      }
    }
    console.error(`[MCP] Successfully loaded env from: ${envPath}`);
  }
} catch (e) {
  console.error('[MCP] Failed to load .env in MCP server:', e);
}

// Helpers
async function loadAllNotes(): Promise<SNote[]> {
  if (SMARTNOTES_BACKEND_URL && SMARTNOTES_CLIENT_ID) {
    const fetchUrl = `${SMARTNOTES_BACKEND_URL.replace(/\/$/, '')}/api/data?file=notes&clientId=${SMARTNOTES_CLIENT_ID}`;
    try {
      console.error(`[MCP] Fetching notes from remote: ${fetchUrl}`);
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const json = await res.json() as any;
        let notes: SNote[] = [];
        if (json && json.success && json.data && Array.isArray(json.data.notes)) {
          notes = json.data.notes;
        } else if (Array.isArray(json)) {
          notes = json;
        }
        if (notes.length > 0) {
          notes.forEach(note => {
            if (!note.project_id) {
              note.project_id = (note.title.toLowerCase().includes('ev.crm') || note.title.toLowerCase().includes('ev-crm')) ? 'ev-crm' : 'smartnotes';
            }
          });
          return notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } else {
        console.error(`[MCP] Remote fetch returned status ${res.status}`);
      }
    } catch (err) {
      console.error(`[MCP] Failed to fetch remote notes, falling back to local files:`, err);
    }
  }

  const notes: SNote[] = [];
  try {
    const files = fs.readdirSync(DATA_DIR);
    for (const file of files) {
      if (file.endsWith('.snote')) {
        const filePath = path.join(DATA_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const note = JSON.parse(content) as SNote;
          if (!note.project_id) {
            note.project_id = (note.title.toLowerCase().includes('ev.crm') || note.title.toLowerCase().includes('ev-crm')) ? 'ev-crm' : 'smartnotes';
          }
          notes.push(note);
        } catch (err) {
          console.error(`Error reading/parsing file ${file}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Error listing data directory:', err);
  }
  return notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function callGemini(prompt: string, responseSchema?: any): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (responseSchema) {
    body.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: responseSchema
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} - ${await response.text()}`);
  }

  const resJson = await response.json() as any;
  const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('Invalid response structure from Gemini API');
  }

  if (responseSchema) {
    return JSON.parse(textResponse);
  }
  return textResponse;
}

function saveNote(note: SNote) {
  const filePath = path.join(DATA_DIR, `${note.id}.snote`);
  fs.writeFileSync(filePath, JSON.stringify(note, null, 2), 'utf-8');
}

// Initialize server
const server = new Server(
  {
    name: 'scaleverse-smart-notes',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'session_save',
        description: 'Save a session\'s details and markdown content to a new .snote file.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Session title' },
            summary: { type: 'string', description: '2-3 line summary of the conversation' },
            full_content: { type: 'string', description: 'Raw markdown or conversation history' },
            project_id: { type: 'string', description: 'Project identifier (defaults to current project)' },
            tags: { type: 'array', items: { type: 'string' } },
            completion_pct: { type: 'number', description: 'Feature completion percentage 0-100' },
            last_file: { type: 'string', description: 'Last file being edited' },
            tool_source: { type: 'string', description: 'Source tool: e.g. claude, chatgpt, cursor' }
          },
          required: ['title', 'summary', 'full_content']
        }
      },
      {
        name: 'session_resume',
        description: 'Get an intelligent resume prompt for a specific session.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Unique .snote ID' }
          },
          required: ['session_id']
        }
      },
      {
        name: 'context_get',
        description: 'Retrieve all pinned sessions merged together as an active reference context.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project identifier filter' }
          }
        }
      },
      {
        name: 'context_inject',
        description: 'Get compressed technical context for the current task.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project identifier' },
            task_description: { type: 'string', description: 'Brief description of task' }
          },
          required: ['task_description']
        }
      },
      {
        name: 'bug_locate',
        description: 'Pinpoint bug location in codebase from error message.',
        inputSchema: {
          type: 'object',
          properties: {
            error_message: { type: 'string', description: 'Exception or warning description' },
            stack_trace: { type: 'string', description: 'Call stack trace logs' },
            project_id: { type: 'string', description: 'Project identifier' }
          },
          required: ['error_message']
        }
      },
      {
        name: 'codebase_check',
        description: 'Check if a function or component already exists to prevent duplication.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Function or component name' },
            type: { type: 'string', description: 'Type of entity, e.g. function, component, route' },
            project_id: { type: 'string', description: 'Project identifier' }
          },
          required: ['name']
        }
      },
      {
        name: 'action_list',
        description: 'List action items, filtered by project, status or tool.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Filter by project' },
            done: { type: 'boolean', description: 'Filter by completed status' },
            source_tool: { type: 'string', description: 'Filter by tool source' }
          }
        }
      },
      {
        name: 'action_create',
        description: 'Add a new action/task item to a note.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project identifier' },
            snote_id: { type: 'string', description: 'SNote ID to attach to' },
            text: { type: 'string', description: 'Task description' },
            due: { type: 'string', description: 'ISO due date string' }
          },
          required: ['snote_id', 'text']
        }
      },
      {
        name: 'note_search',
        description: 'Search saved sessions by keyword.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keyword query' },
            project_id: { type: 'string', description: 'Filter by project' }
          },
          required: ['query']
        }
      },
      {
        name: 'project_switch',
        description: 'Switch the active project isolation vault.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'New project context ID, e.g. smartnotes' }
          },
          required: ['project_id']
        }
      },
      {
        name: 'plan_today',
        description: 'Generate daily dev timetable and sprint schedule.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project identifier' },
            date: { type: 'string', description: 'Date to plan for' }
          }
        }
      },
      {
        name: 'handoff_capsule',
        description: 'Generate context handoff capsule on rate limit or session checkpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project identifier' },
            completion_pct: { type: 'number', description: 'Percent complete 0-100' },
            last_file: { type: 'string', description: 'Last file being edited' },
            reason: { type: 'string', description: 'Reason for handoff, e.g. rate_limit, manual' }
          }
        }
      },
      {
        name: 'tool_last_session',
        description: 'Get last session details from a specific tool.',
        inputSchema: {
          type: 'object',
          properties: {
            tool_name: { type: 'string', description: 'e.g. claude' },
            project_id: { type: 'string', description: 'Project identifier' }
          },
          required: ['tool_name']
        }
      },
      {
        name: 'context_package',
        description: 'Bundle multiple sessions into one Markdown capsule block.',
        inputSchema: {
          type: 'object',
          properties: {
            session_ids: { type: 'array', items: { type: 'string' } }
          },
          required: ['session_ids']
        }
      }
    ]
  };
});

// Implement handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const notes = await loadAllNotes();

  try {
    switch (name) {
      case 'session_save': {
        const { title, summary, full_content, project_id = ACTIVE_PROJECT_ID, tags = [], completion_pct = 0, last_file = '', tool_source = 'manual' } = args as any;
        const id = `note-${Date.now()}`;
        const now = new Date().toISOString();

        const entities: Entities = { people: [], companies: [], projects: [], deals: [] };
        const lowerContent = full_content.toLowerCase();
        if (lowerContent.includes('balaji')) entities.people.push('Balaji');
        if (lowerContent.includes('hemanth')) entities.people.push('Hemanth');
        if (lowerContent.includes('scaleverse')) entities.companies.push('Scaleverse');
        if (lowerContent.includes('smartnotes')) entities.projects.push('SmartNotes');

        const newNote: SNote = {
          id,
          created_at: now,
          updated_at: now,
          source_tool: tool_source,
          session_url: '',
          title,
          summary,
          full_content,
          snippets: [],
          tags,
          entities,
          actions: [],
          context_links: [],
          pinned: false,
          format_ver: '2.0',
          project_id,
          completion_pct,
          last_file
        };

        saveNote(newNote);
        return {
          content: [{ type: 'text', text: `Session saved in Project Isolation Vault: ${project_id}\nID: ${id}\nTitle: ${title}` }]
        };
      }

      case 'session_resume': {
        const { session_id } = args as any;
        const note = notes.find(n => n.id === session_id);
        if (!note) {
          return { isError: true, content: [{ type: 'text', text: `Session ${session_id} not found.` }] };
        }
        const openActions = note.actions.filter(a => !a.done);
        const resumePrompt = `## SmartNotes Resume Context
Continuing from last session: "${note.title}"
Summary: ${note.summary}
Project: ${note.project_id || 'smartnotes'}
Last edited file: ${note.last_file || 'N/A'}
Completed: ${note.completion_pct || 0}%

${openActions.length > 0 ? `Open tasks:\n${openActions.map(a => `- ${a.text}`).join('\n')}` : 'All checklist items completed.'}

Please continue from this exact state.`;
        return { content: [{ type: 'text', text: resumePrompt }] };
      }

      case 'context_get': {
        const { project_id = ACTIVE_PROJECT_ID } = args as any;
        const pinned = notes.filter(n => n.pinned && n.project_id === project_id);
        if (pinned.length === 0) {
          return { content: [{ type: 'text', text: `No pinned context exists for project: ${project_id}` }] };
        }
        let merged = `## Pinned Workspace Context for ${project_id.toUpperCase()}\n\n`;
        pinned.forEach(n => {
          merged += `### ${n.title} (${n.source_tool})\n${n.summary}\n\n${n.full_content}\n\n---\n\n`;
        });
        return { content: [{ type: 'text', text: merged }] };
      }

      case 'context_inject': {
        const { project_id = ACTIVE_PROJECT_ID, task_description } = args as any;
        // Generate a compressed prompt format
        const responseText = `PROJECT: ${project_id} | STACK: React+Vite, Express, local Drive storage
ACTIVE TASK: ${task_description}
ISOLATION VAULT: sealed context logic active.
SCOPE: Only modify files related to ${task_description.split(' ').slice(0, 3).join('_')}.`;
        return { content: [{ type: 'text', text: responseText }] };
      }

      case 'bug_locate': {
        const { error_message, stack_trace = '', project_id = ACTIVE_PROJECT_ID } = args as any;
        const project = project_id.toLowerCase();
        
        const codebaseNotes = notes.filter(n => n.project_id === project && n.tags.includes('codebase'));

        // Extract filenames from stack trace or error message
        const fileRegex = /([a-zA-Z0-9_-]+\.(?:js|jsx|ts|tsx|py|go|java|cpp|h|css|html|json|yaml|yml))/g;
        const mentionedFiles = new Set<string>();
        let fileMatch;
        while ((fileMatch = fileRegex.exec(stack_trace + ' ' + error_message)) !== null) {
          mentionedFiles.add(fileMatch[1].toLowerCase());
        }

        let relevantNotes = codebaseNotes.filter(note => {
          const titleLower = note.title.toLowerCase();
          for (const file of mentionedFiles) {
            if (titleLower.endsWith(file) || titleLower.includes('/' + file) || titleLower.includes(' / ' + file)) {
              return true;
            }
          }
          return false;
        });

        // Fallback: keyword matching
        if (relevantNotes.length === 0) {
          const keywords = error_message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3 && !['error', 'warning', 'failed', 'cannot', 'read', 'undefined', 'null'].includes(w));
          relevantNotes = codebaseNotes.filter(note => {
            const contentLower = (note.full_content || '').toLowerCase() + ' ' + note.title.toLowerCase();
            return keywords.some((kw: string) => contentLower.includes(kw));
          }).slice(0, 5); // Limit context
        }

        // Final fallback: latest codebase notes
        if (relevantNotes.length === 0) {
          relevantNotes = codebaseNotes.slice(0, 5);
        }

        const filesContext = relevantNotes.map(n => {
          return `### File: ${n.title}\n\`\`\`\n${n.full_content}\n\`\`\``;
        }).join('\n\n');

        const prompt = `You are a Senior Project Manager and Debugging Expert.
We encountered a bug in the project '${project}'. Here are the details:

Error Message:
${error_message}

Stack Trace:
${stack_trace}

Here is the relevant codebase context we indexed:
${filesContext || 'No relevant codebase files indexed.'}

Please check the code and diagnose the issue. Return a JSON response matching this schema:
{
  "file": "Relative file path of the bug, or 'Unknown'",
  "line": 45,
  "functionName": "Name of the function containing the bug, or 'Unknown'",
  "issue": "A brief explanation of what is causing the error",
  "suggestedFix": "Code diff or code replacement showing how to fix it",
  "pastErrorMatches": "A brief description of any similar errors solved in notes, if any"
}`;

        const schema = {
          type: 'OBJECT',
          properties: {
            file: { type: 'STRING' },
            line: { type: 'INTEGER' },
            functionName: { type: 'STRING' },
            issue: { type: 'STRING' },
            suggestedFix: { type: 'STRING' },
            pastErrorMatches: { type: 'STRING' }
          },
          required: ['file', 'line', 'functionName', 'issue', 'suggestedFix', 'pastErrorMatches']
        };

        try {
          const result = await callGemini(prompt, schema);
          const report = `### 🛸 SmartNotes Bug Radar Diagnostic
- **File**: \`${result.file}\`
- **Line**: ${result.line > 0 ? result.line : 'Unknown'}
- **Function**: \`${result.functionName}\`
- **Issue**: ${result.issue}

#### 💡 Suggested Fix:
\`\`\`
${result.suggestedFix}
\`\`\`

*Pattern matching notes from session history: ${result.pastErrorMatches}*`;

          return { content: [{ type: 'text', text: report }] };
        } catch (err: any) {
          console.error(`[MCP] Gemini diagnosis failed:`, err.message);
          return { content: [{ type: 'text', text: `Failed to diagnose error with Gemini. Backend error: ${err.message}` }] };
        }
      }

      case 'codebase_check': {
        const { name, type = 'function', project_id = ACTIVE_PROJECT_ID } = args as any;
        const project = project_id.toLowerCase();
        
        const codebaseNotes = notes.filter(n => n.project_id === project && n.tags.includes('codebase'));
        const searchName = name.trim();
        const matchRegex = new RegExp(`\\b(function|const|let|var|class|def|func)\\s+${searchName}\\b`, 'i');

        const duplicates: { file: string, match: string }[] = [];

        for (const note of codebaseNotes) {
          let filePath = note.title;
          if (note.title.includes(' / ')) {
            filePath = note.title.split(' / ').slice(1).join(' / ');
          }

          const code = note.full_content || '';
          if (matchRegex.test(code) || code.includes(`function ${searchName}`) || code.includes(`def ${searchName}`) || code.includes(`func ${searchName}`)) {
            duplicates.push({
              file: filePath,
              match: searchName
            });
          }
        }

        if (duplicates.length > 0) {
          return {
            content: [{
              type: 'text',
              text: `⚠️ Duplicate Detected! The ${type} '${name}' already exists in the codebase:\n` +
                    duplicates.map(d => `- File: ${d.file}`).join('\n') +
                    `\n\nPlease import it instead of writing a new one.`
            }]
          };
        } else {
          return {
            content: [{ type: 'text', text: `✅ Unique! No duplicate found for ${type} '${name}' in project ${project}.` }]
          };
        }
      }

      case 'action_list': {
        const { project_id = ACTIVE_PROJECT_ID, done, source_tool } = args as any;
        let actions = notes.filter(n => n.project_id === project_id).flatMap(n => n.actions);

        if (done !== undefined) {
          actions = actions.filter(a => a.done === done);
        }
        if (source_tool !== undefined) {
          actions = actions.filter(a => a.source_tool === source_tool);
        }

        if (actions.length === 0) {
          return { content: [{ type: 'text', text: `No tasks found for project ${project_id}.` }] };
        }

        const report = actions.map(a => `[${a.done ? 'x' : ' '}] ${a.text} (ID: ${a.id})`).join('\n');
        return { content: [{ type: 'text', text: report }] };
      }

      case 'action_create': {
        const { snote_id, text, due = null } = args as any;
        const note = notes.find(n => n.id === snote_id);
        if (!note) {
          return { isError: true, content: [{ type: 'text', text: `Note ${snote_id} not found.` }] };
        }

        const newAction: ActionItem = {
          id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          text,
          due,
          done: false,
          snoozed: false,
          snoozeUntil: null,
          source_line: 'Added via MCP Server',
          snote_id: note.id,
          snote_title: note.title,
          source_tool: note.source_tool
        };

        note.actions.push(newAction);
        note.updated_at = new Date().toISOString();
        saveNote(note);

        return { content: [{ type: 'text', text: `Task created: ${newAction.id}` }] };
      }

      case 'note_search': {
        const { query, project_id = ACTIVE_PROJECT_ID } = args as any;
        const q = query.toLowerCase();

        const filtered = notes.filter(n => {
          const matchProject = n.project_id === project_id;
          const matchSearch = n.title.toLowerCase().includes(q) ||
                              n.summary.toLowerCase().includes(q) ||
                              n.full_content.toLowerCase().includes(q);
          return matchProject && matchSearch;
        });

        if (filtered.length === 0) {
          return { content: [{ type: 'text', text: `No sessions found matching "${query}" in ${project_id}.` }] };
        }

        const list = filtered.map(n => `### ${n.title} (ID: ${n.id})\nSummary: ${n.summary}`).join('\n---\n');
        return { content: [{ type: 'text', text: list }] };
      }

      case 'project_switch': {
        const { project_id } = args as any;
        ACTIVE_PROJECT_ID = project_id;
        const count = notes.filter(n => n.project_id === project_id).length;
        return {
          content: [{ type: 'text', text: `Active project context shifted to: ${project_id}. Loaded ${count} sessions.` }]
        };
      }

      case 'plan_today': {
        const { project_id = ACTIVE_PROJECT_ID } = args as any;
        const plan = project_id === 'smartnotes' 
          ? `## SmartNotes Daily Plan
Sprint Goal: Universal Handoff + Pulse Monitor
Schedule:
- 09:00 - 10:30 | Navigation sidebar & active state routers
- 10:30 - 12:00 | Handoff panel rate limit alerts
- 13:00 - 15:00 | Bug Radar parser & optimize helpers
- 15:00 - 16:00 | Verify local workers & builds`
          : `## EV-CRM Daily Plan
Sprint Goal: Login & Dashboard Routing
Schedule:
- 09:00 - 10:30 | JWT login page layout & validation
- 10:30 - 12:00 | Protected route auth middleware redirects
- 13:00 - 15:00 | Express endpoints (/dealers, /leads)
- 15:00 - 16:00 | Trigger session checkpoint save`;
        
        return { content: [{ type: 'text', text: plan }] };
      }

      case 'handoff_capsule': {
        const { project_id = ACTIVE_PROJECT_ID, completion_pct = 40, last_file = 'src/app.js', reason = 'rate_limit' } = args as any;
        
        const capsule = `## Handoff Capsule [${reason.toUpperCase()}]
Project: ${project_id}
Status: ${completion_pct}% complete
Last Working File: ${last_file}
Timestamp: ${new Date().toISOString()}

Please copy this markdown context to continue building in another editor tool seamlessly.`;
        return { content: [{ type: 'text', text: capsule }] };
      }

      case 'tool_last_session': {
        const { tool_name, project_id = ACTIVE_PROJECT_ID } = args as any;
        const toolNotes = notes.filter(n => n.source_tool === tool_name && n.project_id === project_id);
        if (toolNotes.length === 0) {
          return { content: [{ type: 'text', text: `No sessions found for tool ${tool_name} in project ${project_id}.` }] };
        }
        const last = toolNotes[0];
        return { content: [{ type: 'text', text: `Last session in ${tool_name} was: "${last.title}"\nSummary: ${last.summary}` }] };
      }

      case 'context_package': {
        const { session_ids } = args as any;
        const selected = notes.filter(n => session_ids.includes(n.id));
        if (selected.length === 0) {
          return { isError: true, content: [{ type: 'text', text: 'None of the provided note IDs were found.' }] };
        }
        let output = `# Context Package Bundle\n\n`;
        selected.forEach(n => {
          output += `## ${n.title} (${n.project_id})\nSummary: ${n.summary}\n\n${n.full_content}\n\n---\n\n`;
        });
        return { content: [{ type: 'text', text: output }] };
      }

      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Tool not found: ${name}` }]
        };
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error executing tool ${name}: ${err.message || err}` }]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 SmartNotes MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
