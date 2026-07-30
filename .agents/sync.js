const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'sync_state.json');
const BOARD_FILE = path.join(__dirname, 'handoff.md');

// Initialize state file if not exists
if (!fs.existsSync(STATE_FILE)) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    locks: {},
    tasks: [
      { description: "CTE: EV Discovery & OpenChargeMap Live POI Integration", done: true, assignedTo: "Antigravity", assignedBy: "User" },
      { description: "CTE: Community Tariff Rate Verification & Price Reporting Modal", done: true, assignedTo: "Antigravity", assignedBy: "User" },
      { description: "CTE: Used Car Dealer Login & DB Sync Fix", done: true, assignedTo: "Antigravity", assignedBy: "Claude" },
      { description: "Verify domain on Resend dashboard (evcrm.in) to enable outgoing emails.", done: false, assignedTo: "Claude", assignedBy: "Antigravity" },
      { description: "Add post-booking automated confirmation email to customers.", done: false, assignedTo: "Claude", assignedBy: "Antigravity" }
    ],
    handoff: {
      status: "Active Collaboration",
      lastAction: "Configured Live Interconnect Tool for Antigravity & Claude Code.",
      nextSteps: "Sharing task workload & file locks."
    },
    metrics: {
      tokensSaved: 125000,
      collaborations: 18
    },
    helpRequests: []
  }, null, 2));
}

function readState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!data.helpRequests) data.helpRequests = [];
    if (!data.metrics) data.metrics = { tokensSaved: 125000, collaborations: 18 };
    return data;
  } catch (e) {
    return { locks: {}, tasks: [], handoff: { status: "Error", lastAction: "", nextSteps: "" }, metrics: { tokensSaved: 0, collaborations: 0 }, helpRequests: [] };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  updateMarkdownBoard(state);
}

function updateMarkdownBoard(state) {
  let md = `# Agent Interconnect & Coordination Board (Antigravity ↔ Claude Code)\n\n`;
  md += `> [!IMPORTANT]\n`;
  md += `> **LIVE INTERCONNECT DAEMON ACTIVE**: Task sharing, workload balancing & file locking.\n`;
  md += `> Please run \`node .agents/sync.js status\` to view live agent sync state.\n\n`;
  
  md += `## ── CTE LIVE INTERCONNECT & WORKLOAD PROTOCOL ──\n\n`;
  
  md += `### 1. Active File Locks\n`;
  const lockKeys = Object.keys(state.locks);
  if (lockKeys.length === 0) {
    md += `* *No active locks. All files are available for edit.*\n`;
  } else {
    lockKeys.forEach(k => {
      md += `* 🔒 **${k}** is locked by **${state.locks[k].agent}** (since ${state.locks[k].since})\n`;
    });
  }
  
  md += `\n### 2. Live Agent Handoff & Metrics\n`;
  md += `* **Status**: ${state.handoff.status}\n`;
  md += `* **Last Action**: ${state.handoff.lastAction}\n`;
  md += `* **Next Steps**: ${state.handoff.nextSteps}\n`;
  md += `* **Estimated Tokens Saved**: ⚡ **${(state.metrics?.tokensSaved || 0).toLocaleString()} tokens**\n\n`;
  
  md += `### 3. Shared Task Board & Assignments\n`;
  if (state.tasks.length === 0) {
    md += `* *No active tasks*\n`;
  } else {
    state.tasks.forEach((t, idx) => {
      const assigned = t.assignedTo ? ` [Assigned to @${t.assignedTo}]` : '';
      md += `- [${t.done ? 'x' : ' '}] **[Task #${idx}]** ${t.description}${assigned}\n`;
    });
  }
  
  md += `\n### 4. Active Help & Delegation Requests\n`;
  if (!state.helpRequests || state.helpRequests.length === 0) {
    md += `* *No active help requests. Both agents working in parallel.*\n`;
  } else {
    state.helpRequests.forEach((req, idx) => {
      md += `* 🙋‍♂️ **[Help Request #${idx}]** **${req.agent}** requested help for: *"${req.details}"* (since ${req.since})\n`;
    });
  }
  
  md += `\n---\n\n## 5. CTE Project Environment\n`;
  md += `* **Live Site**: \`https://evcrm.in\`\n`;
  md += `* **Live Agent Hub**: \`https://evcrm.in/admin/agents\`\n`;
  md += `* **Database**: Supabase (Live production DB configured in \`.env\`)\n`;
  
  fs.writeFileSync(BOARD_FILE, md);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log("Usage: node sync.js [status | lock | unlock | add-task | assign-task | complete-task | handoff | request-help | resolve-help | log-tokens]");
  process.exit(0);
}

const state = readState();

switch (command) {
  case "status":
    console.log(JSON.stringify(state, null, 2));
    break;

  case "lock": {
    const file = args[1];
    const agent = args[2] || "UnknownAgent";
    if (!file) {
      console.error("Error: Specify file path to lock");
      process.exit(1);
    }
    if (state.locks[file]) {
      console.error(`ERROR: File is already locked by ${state.locks[file].agent}`);
      process.exit(1);
    }
    state.locks[file] = { agent, since: new Date().toISOString() };
    writeState(state);
    console.log(`SUCCESS: Locked ${file} for ${agent}`);
    break;
  }

  case "unlock": {
    const file = args[1];
    if (!file) {
      console.error("Error: Specify file path to unlock");
      process.exit(1);
    }
    if (!state.locks[file]) {
      console.log(`INFO: File ${file} was not locked.`);
      process.exit(0);
    }
    delete state.locks[file];
    writeState(state);
    console.log(`SUCCESS: Unlocked ${file}`);
    break;
  }

  case "add-task": {
    const desc = args.slice(1).join(" ");
    if (!desc) {
      console.error("Error: Specify task description");
      process.exit(1);
    }
    state.tasks.push({ description: desc, done: false, assignedTo: "Unassigned", assignedBy: "User" });
    writeState(state);
    console.log(`SUCCESS: Added task: ${desc}`);
    break;
  }

  case "assign-task": {
    const targetAgent = args[1]; // "Antigravity" or "Claude"
    const desc = args.slice(2).join(" ");
    if (!targetAgent || !desc) {
      console.error("Error: Usage: node sync.js assign-task <AgentName> <Task Description>");
      process.exit(1);
    }
    state.tasks.push({ description: desc, done: false, assignedTo: targetAgent, assignedBy: "Interconnect" });
    writeState(state);
    console.log(`SUCCESS: Assigned task to ${targetAgent}: ${desc}`);
    break;
  }

  case "complete-task": {
    const idx = parseInt(args[1], 10);
    if (isNaN(idx) || idx < 0 || idx >= state.tasks.length) {
      console.error("Error: Invalid task index");
      process.exit(1);
    }
    state.tasks[idx].done = true;
    writeState(state);
    console.log(`SUCCESS: Task #${idx} marked completed`);
    break;
  }

  case "handoff": {
    const agent = args[1] || "UnknownAgent";
    const details = args.slice(2).join(" ");
    state.handoff = {
      status: `Handoff from ${agent}`,
      lastAction: details,
      nextSteps: "Awaiting next agent execution..."
    };
    writeState(state);
    console.log(`SUCCESS: Handoff registered for ${agent}`);
    break;
  }

  case "log-tokens": {
    const tokens = parseInt(args[1], 10) || 10000;
    if (!state.metrics) state.metrics = { tokensSaved: 0, collaborations: 0 };
    state.metrics.tokensSaved += tokens;
    state.metrics.collaborations += 1;
    writeState(state);
    console.log(`SUCCESS: Logged ${tokens} tokens saved! Total: ${state.metrics.tokensSaved}`);
    break;
  }

  case "request-help": {
    const agent = args[1] || "UnknownAgent";
    const details = args.slice(2).join(" ");
    if (!details) {
      console.error("Error: Specify what you need help with");
      process.exit(1);
    }
    if (!state.helpRequests) state.helpRequests = [];
    state.helpRequests.push({
      agent,
      details,
      since: new Date().toISOString()
    });
    writeState(state);
    console.log(`SUCCESS: Help request registered from ${agent}`);
    break;
  }

  case "resolve-help": {
    const idx = parseInt(args[1], 10);
    if (isNaN(idx) || idx < 0 || !state.helpRequests || idx >= state.helpRequests.length) {
      console.error("Error: Invalid help request index");
      process.exit(1);
    }
    state.helpRequests.splice(idx, 1);
    writeState(state);
    console.log(`SUCCESS: Help request #${idx} resolved/cleared`);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
}
