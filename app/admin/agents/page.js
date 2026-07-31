"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"
import { C } from "../../../lib/constants"

export default function AgentInterconnectDashboard() {
  const [syncState, setSyncState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTaskDesc, setNewTaskDesc] = useState("")
  const [targetAgent, setTargetAgent] = useState("Antigravity")
  const [submitting, setSubmitting] = useState(false)
  const [executingIdx, setExecutingIdx] = useState(null)

  const fetchSyncState = async () => {
    try {
      const res = await fetch("/api/agents/sync")
      const data = await res.json()
      if (data.success) {
        setSyncState(data)
      }
    } catch (e) {
      console.warn("Failed to fetch agent sync state:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSyncState()
    const interval = setInterval(fetchSyncState, 4000) // Poll every 4s for live state
    return () => clearInterval(interval)
  }, [])

  const handleAssignTask = async (e) => {
    e.preventDefault()
    if (!newTaskDesc.trim()) return

    setSubmitting(true)
    try {
      // Queues the task as PENDING. An agent (Claude Code / Antigravity)
      // picks it up off this board and does the actual work — this page
      // cannot run agents itself, so it never marks anything complete.
      const res = await fetch("/api/agents/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newTaskDesc.trim(),
          agent: targetAgent,
          source: "Admin Dashboard"
        })
      })
      const data = await res.json()
      if (data.success) {
        setNewTaskDesc("")
        fetchSyncState()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRunNow = async (idx) => {
    setExecutingIdx(idx)
    try {
      await fetch("/api/agents/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIndex: idx })
      })
      fetchSyncState()
    } catch (e) {
      console.error(e)
    } finally {
      setExecutingIdx(null)
    }
  }

  const handleToggleTask = async (idx, currentStatus) => {
    try {
      await fetch("/api/agents/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: currentStatus ? "reopen-task" : "complete-task",
          taskIndex: idx
        })
      })
      fetchSyncState()
    } catch (e) {
      console.error(e)
    }
  }

  const locks = syncState?.locks || {}
  const lockKeys = Object.keys(locks)
  const tasks = syncState?.tasks || []
  const handoff = syncState?.handoff || {}
  // NOTE: metrics.tokensSaved was inflated by the old fake executor (+15000 per
  // call, no real measurement) — the tiles now derive from the task list instead.

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <TopBar />

      <main style={{ maxWidth: 1140, margin: "0 auto", padding: "24px 16px 60px" }}>
        
        {/* Header Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28 }}>📱</span>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: C.ink, letterSpacing: "-0.5px", margin: 0 }}>
                  Remote Agent Interconnect
                </h1>
                <p style={{ fontSize: 12, color: C.ink3, fontWeight: 700, margin: "2px 0 0" }}>
                  Assign tasks to Claude Code or Antigravity — they pick them up from here
                </p>
              </div>
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20, background: "#ecfdf5",
              border: "1px solid #a7f3d0", fontSize: 11, fontWeight: 800, color: "#047857"
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
              <span>MOBILE SYNC ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Mobile Remote Task Submission Box */}
        <div style={{ background: "#fff", padding: 20, borderRadius: 20, border: `2px solid ${C.green}`, marginBottom: 28, boxShadow: "0 10px 30px rgba(5,150,105,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: C.green, textTransform: "uppercase", letterSpacing: 0.5 }}>
              📌 Assign a Task
            </span>
            
            <span style={{ fontSize: 10, fontWeight: 700, color: C.ink3 }}>
              Queues work for an agent — nothing runs from this page
            </span>
          </div>

          <form onSubmit={handleAssignTask} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={targetAgent}
                onChange={e => setTargetAgent(e.target.value)}
                style={{
                  padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${C.border}`,
                  fontSize: 12, fontWeight: 800, outline: "none", background: "#f8fafc", flex: 1
                }}
              >
                <option value="Antigravity">@Antigravity (Gemini)</option>
                <option value="Claude">@Claude (Claude Code)</option>
                <option value="Shared">@Shared Agent</option>
              </select>
            </div>

            <textarea
              rows={2}
              placeholder="Type task description (e.g. Update Ather 450 Apex specs, Fix login redirect, Sync station tariffs)..."
              value={newTaskDesc}
              onChange={e => setNewTaskDesc(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: `1.5px solid ${C.green}`, fontSize: 13, outline: "none",
                fontWeight: 700, background: "#f0fdf4", resize: "vertical", boxSizing: "border-box"
              }}
            />

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, background: C.green,
                color: "#fff", border: "none", fontSize: 14, fontWeight: 900,
                cursor: "pointer", boxShadow: "0 4px 14px rgba(5,150,105,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <span>{submitting ? "Queueing..." : "📌 Add to Task Queue →"}</span>
            </button>
          </form>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
          
          <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>OPEN TASKS</span>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.green, marginTop: 2 }}>
              📋 {tasks.filter(t => !t.done).length}
            </div>
            <p style={{ fontSize: 10, color: C.ink3, margin: "2px 0 0" }}>Waiting for an agent to pick up</p>
          </div>

          <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>ACTIVE AGENTS</span>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.ink, marginTop: 4, display: "flex", gap: 6 }}>
              <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 6px", borderRadius: 6, fontSize: 11 }}>Gemini 3.5</span>
              <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 6px", borderRadius: 6, fontSize: 11 }}>Claude 3.5</span>
            </div>
            <p style={{ fontSize: 10, color: C.ink3, margin: "2px 0 0" }}>Parallel Lock Safety</p>
          </div>

          <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>COMPLETED</span>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.purple, marginTop: 2 }}>
              ✓ {tasks.filter(t => t.done).length}
            </div>
            <p style={{ fontSize: 10, color: C.ink3, margin: "2px 0 0" }}>Marked done by an agent</p>
          </div>

        </div>

        {/* Task List with Live Logs */}
        <div style={{ background: "#fff", padding: 20, borderRadius: 20, border: `1px solid ${C.border}`, marginBottom: 32 }}>
          
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 16 }}>
            📋 Live Task Queue & Mobile Execution History ({tasks.length})
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tasks.map((task, idx) => (
              <div key={idx} style={{
                padding: "14px 16px", borderRadius: 14, background: task.done ? "#f8fafc" : "#fff",
                border: `1px solid ${task.done ? "#e2e8f0" : C.border}`, opacity: task.done ? 0.85 : 1
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 200 }}>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => handleToggleTask(idx, task.done)}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: C.green, marginTop: 2 }}
                    />
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 800, color: C.ink,
                        textDecoration: task.done ? "line-through" : "none"
                      }}>
                        {task.description}
                      </div>
                      <div style={{ fontSize: 10, color: C.ink3, marginTop: 4 }}>
                        Assigned by {task.assignedBy || "User"} · {task.done ? "Done" : task.status === "PENDING" ? "Pending — not picked up yet" : "Queued"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                      background: task.assignedTo === "Claude" ? "#fef3c7" : "#eff6ff",
                      color: task.assignedTo === "Claude" ? "#b45309" : "#1d4ed8"
                    }}>
                      @{task.assignedTo || "Antigravity"}
                    </span>

                    {!task.done && (
                      <button
                        onClick={() => handleRunNow(idx)}
                        disabled={executingIdx === idx}
                        title="Puts this task back at the top of the queue. An agent still has to pick it up — this does not run it."
                        style={{
                          background: C.green, color: "#fff", border: "none",
                          padding: "4px 10px", borderRadius: 8, fontSize: 11,
                          fontWeight: 800, cursor: "pointer"
                        }}
                      >
                        {executingIdx === idx ? "Queueing..." : "Re-queue ➔"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Execution Log Output */}
                {task.logs && task.logs.length > 0 && (
                  <div style={{ marginTop: 10, background: "#1e293b", padding: "10px 12px", borderRadius: 10, color: "#38bdf8", fontSize: 11, fontFamily: "monospace", lineHeight: 1.5 }}>
                    {task.logs.map((logLine, lIdx) => (
                      <div key={lIdx}>{logLine}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Handoff Status */}
        <div style={{ background: "#fff", padding: 20, borderRadius: 20, border: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span>📜</span> Latest Handoff Log
          </h3>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>{handoff.status || "Idle"}</span>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.ink, margin: "4px 0" }}>{handoff.lastAction || "No recent handoffs."}</p>
            <p style={{ fontSize: 11, color: C.ink3, margin: 0 }}>{handoff.nextSteps || "Awaiting task execution."}</p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
