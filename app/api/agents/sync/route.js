import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const STATE_FILE = path.join(process.cwd(), ".agents", "sync_state.json")

function getSyncState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf8")
      return JSON.parse(raw || "{}")
    }
  } catch (e) {
    console.warn("Could not read sync_state.json:", e)
  }
  return {
    locks: {},
    tasks: [],
    handoff: { status: "Idle" },
    metrics: { tokensSaved: 0, collaborations: 0 }
  }
}

function writeSyncState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
    return true
  } catch (e) {
    console.error("Could not write sync_state.json:", e)
    return false
  }
}

export async function GET() {
  const state = getSyncState()
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...state
  })
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action, agent, file, description, taskIndex, tokens } = body
    const state = getSyncState()

    if (action === "lock" && file) {
      state.locks[file] = { agent: agent || "UnknownAgent", since: new Date().toISOString() }
    } else if (action === "unlock" && file) {
      delete state.locks[file]
    } else if (action === "assign-task" && description) {
      state.tasks.push({
        description,
        done: false,
        assignedTo: agent || "Unassigned",
        assignedBy: "API/Interconnect"
      })
    } else if (action === "complete-task" && typeof taskIndex === "number") {
      if (state.tasks[taskIndex]) {
        state.tasks[taskIndex].done = true
      }
    } else if (action === "log-tokens" && typeof tokens === "number") {
      if (!state.metrics) state.metrics = { tokensSaved: 0, collaborations: 0 }
      state.metrics.tokensSaved += tokens
      state.metrics.collaborations += 1
    } else if (action === "handoff" && description) {
      state.handoff = {
        status: `Handoff from ${agent || "Agent"}`,
        lastAction: description,
        nextSteps: "Awaiting next agent execution..."
      }
    }

    writeSyncState(state)
    return NextResponse.json({ success: true, state })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
