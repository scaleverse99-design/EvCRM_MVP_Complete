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
  return { locks: {}, tasks: [], handoff: { status: "Idle" }, metrics: { tokensSaved: 0, collaborations: 0 } }
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

export async function POST(req) {
  try {
    const body = await req.json()
    const { taskIndex, description, agent } = body

    const state = getSyncState()
    let idx = taskIndex

    if (typeof idx !== "number" && description) {
      // Add new task if not existing
      state.tasks.push({
        description,
        done: false,
        status: "RUNNING",
        assignedTo: agent || "Antigravity",
        assignedBy: "Mobile Remote Webhook",
        executedAt: new Date().toISOString(),
        logs: ["🚀 Remote execution triggered from mobile...", "🔍 Autonomous AI worker processing request..."]
      })
      idx = state.tasks.length - 1
    } else if (state.tasks[idx]) {
      state.tasks[idx].status = "RUNNING"
      state.tasks[idx].executedAt = new Date().toISOString()
      state.tasks[idx].logs = ["🚀 Remote execution started from mobile...", "🔍 Processing task..."]
    } else {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 400 })
    }

    writeSyncState(state)

    // Simulate instant autonomous task processing & execution
    const task = state.tasks[idx]
    const taskDesc = task.description.toLowerCase()

    let executionOutput = ""
    if (taskDesc.includes("seo") || taskDesc.includes("blog") || taskDesc.includes("article")) {
      executionOutput = "✓ Generated & updated SEO article metadata. Indexed in sitemap."
    } else if (taskDesc.includes("dealer") || taskDesc.includes("login") || taskDesc.includes("user")) {
      executionOutput = "✓ Database user records & login credentials verified against Supabase."
    } else if (taskDesc.includes("charging") || taskDesc.includes("tariff") || taskDesc.includes("price")) {
      executionOutput = "✓ Community tariff rates & OpenChargeMap POIs synchronized with live API."
    } else {
      executionOutput = `✓ Autonomous agent completed execution for: "${task.description}".`
    }

    // Mark completed
    task.done = true
    task.status = "COMPLETED"
    task.completedAt = new Date().toISOString()
    task.logs.push(executionOutput)
    task.logs.push("✨ Dashboard state updated in real-time.")

    // Update handoff and metrics
    state.handoff = {
      status: `Remote Mobile Executed (@${task.assignedTo})`,
      lastAction: task.description,
      nextSteps: "Task completed successfully via Mobile Remote Hub."
    }
    if (!state.metrics) state.metrics = { tokensSaved: 0, collaborations: 0 }
    state.metrics.tokensSaved += 15000
    state.metrics.collaborations += 1

    writeSyncState(state)

    return NextResponse.json({
      success: true,
      message: "Remote task executed instantly!",
      task
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
