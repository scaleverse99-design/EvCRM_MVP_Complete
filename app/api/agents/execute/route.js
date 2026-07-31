import { NextResponse } from "next/server"
import { readTable, writeTable } from "@/lib/store"

// ── Task intake endpoint (NOT a task executor) ─────────────────────────
// A Next.js route running on Cloud Run cannot run Claude Code or
// Antigravity — those are agents on a developer machine (or a scheduled
// cloud sandbox), not code this server can invoke. So this endpoint's only
// honest job is to RECORD a task as PENDING and let a real agent pick it up
// off the shared board (.agents/sync.js / /api/agents/sync).
//
// It previously pretended otherwise: it keyword-matched the task text
// ("seo" → "✓ Generated & updated SEO article metadata", "dealer" → "✓
// Database user records verified against Supabase"), pushed those strings
// into the task log, set status COMPLETED, and added a flat 15,000 to
// metrics.tokensSaved on every call. Nothing ran. A real user request —
// "im seeing lot of 404 pages please check solve them" — was marked done
// while the 404s were never looked at, and the dashboard's cumulative
// "tokens saved" figure was inflated by that same fake counter.
//
// That is the same class of failure as the fabricated VAHAN registration
// rows and the hardcoded token benchmark (see CTE_BUILD_PLAN.md §7b): output
// that looks like work product but is generated rather than measured. A task
// board that lies about completion is worse than no task board, because you
// stop checking. Do not reintroduce synthetic completion here.

const TABLE = "feed"
const SYNC_ID = "global_agent_sync_state"

async function getSyncState() {
  try {
    const rows = await readTable(TABLE)
    const syncRow = rows.find(r => r.id === SYNC_ID)
    if (syncRow && syncRow.data) return syncRow.data
  } catch (e) {
    console.warn("Could not read agent_sync from feed table:", e)
  }
  return { locks: {}, tasks: [], handoff: { status: "Idle" }, metrics: { tokensSaved: 0, collaborations: 0 } }
}

async function writeSyncState(state) {
  try {
    const rows = await readTable(TABLE)
    const existingIndex = rows.findIndex(r => r.id === SYNC_ID)
    const newRow = { id: SYNC_ID, data: state, updatedAt: new Date().toISOString() }

    if (existingIndex >= 0) rows[existingIndex] = newRow
    else rows.push(newRow)

    await writeTable(TABLE, rows)
    return true
  } catch (e) {
    console.error("Could not write agent_sync to feed table:", e)
    return false
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { taskIndex, description, agent, source } = body

    const state = await getSyncState()
    if (!state.tasks) state.tasks = []

    const nowIso = new Date().toISOString()
    const assignedBy = source || "Admin Dashboard"
    let idx = taskIndex
    let task

    if (typeof idx !== "number" && description) {
      task = {
        description,
        done: false,
        status: "PENDING",
        assignedTo: agent || "Antigravity",
        assignedBy,
        createdAt: nowIso,
        logs: [`Task queued at ${nowIso} — waiting for an agent to pick it up.`],
      }
      state.tasks.push(task)
      idx = state.tasks.length - 1
    } else if (typeof idx === "number" && state.tasks[idx]) {
      task = state.tasks[idx]
      // Re-queueing an existing task: mark it pending again, don't touch `done`.
      task.status = "PENDING"
      task.requeuedAt = nowIso
      if (!Array.isArray(task.logs)) task.logs = []
      task.logs.push(`Re-queued at ${nowIso} — waiting for an agent to pick it up.`)
    } else {
      return NextResponse.json({ success: false, error: "Provide a description to create a task, or a valid taskIndex to re-queue one." }, { status: 400 })
    }

    state.handoff = {
      status: `Task queued by ${assignedBy}`,
      lastAction: `Queued for @${task.assignedTo}: ${task.description}`,
      nextSteps: "Waiting for an agent to claim this task. Nothing runs until one does.",
    }

    await writeSyncState(state)

    return NextResponse.json({
      success: true,
      message: `Task queued for @${task.assignedTo}. It stays PENDING until an agent picks it up — this endpoint records work, it does not perform it.`,
      taskIndex: idx,
      task,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
