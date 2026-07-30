# Antigravity & Claude Live AI Interconnect Protocol

This repository uses a local AI Coordination Daemon (`.agents/sync.js`) and live API (`/api/agents/sync`) to synchronize work, assign tasks between agents, prevent file conflicts, and optimize token usage between **Antigravity (Gemini)** and **Claude Code**.

## 🚀 Live Interconnect Instructions for AI Agents

At the start of every session, you MUST:
1. Run `node .agents/sync.js status` to check active file locks, task queue, and handoff state.
2. Review assigned tasks for your agent (`@Antigravity` or `@Claude`).

### 1. Assigning & Delegating Tasks
To assign a task to the other agent or share workload:
```bash
node .agents/sync.js assign-task Claude "Optimize SEO blog metadata"
node .agents/sync.js assign-task Antigravity "Fix production API 500 error"
```

### 2. Locking & Unlocking Files
Before editing any file, request a lock to prevent concurrent edit conflicts:
```bash
node .agents/sync.js lock <file_path> <AgentName>
```
Once edits are saved, unlock the file:
```bash
node .agents/sync.js unlock <file_path>
```

### 3. Token Optimization & Handoff
When completing a milestone or hitting token limits, log saved tokens and register your handoff:
```bash
node .agents/sync.js log-tokens 15000
node .agents/sync.js handoff <AgentName> "Brief description of completed workload"
node .agents/sync.js complete-task <task_index>
```

### 4. Visual Interconnect Dashboard
Access the live visual interconnect web interface at:
`https://evcrm.in/admin/agents` or `/admin/agents`
