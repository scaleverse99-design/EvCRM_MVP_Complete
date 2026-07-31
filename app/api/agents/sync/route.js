import { NextResponse } from "next/server"
import { readTable, writeTable } from "../../../lib/store"

const TABLE = "agent_sync"

async function getSyncState() {
  try {
    const rows = await readTable(TABLE)
    if (rows && rows.length > 0 && rows[0].state) {
      return rows[0].state
    }
  } catch (e) {
    console.warn("Could not read agent_sync from store:", e)
  }
  return {
    locks: {},
    tasks: [],
    handoff: { status: "Idle" },
    metrics: { tokensSaved: 125000, collaborations: 18 }
  }
}

async function writeSyncState(state) {
  try {
    await writeTable(TABLE, [{ id: "global_agent_sync_state", state, updatedAt: new Date().toISOString() }])
    return true
  } catch (e) {
    console.error("Could not write agent_sync to store:", e)
    return false
  }
}

export async function GET() {
  const state = await getSyncState()
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
    const state = await getSyncState()

    if (action === "lock" && file) {
      state.locks[file] = { agent: agent || "UnknownAgent", since: new Date().toISOString() }
    } else if (action === "unlock" && file) {
      delete state.locks[file]
    } else if (action === "assign-task" && description) {
      state.tasks.push({
        description,
        done: false,
        assignedTo: agent || "Antigravity",
        assignedBy: "Mobile Web Dashboard",
        createdAt: new Date().toISOString()
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

    await writeSyncState(state)
    return NextResponse.json({ success: true, state })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
