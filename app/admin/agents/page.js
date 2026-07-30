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
  const [targetAgent, setTargetAgent] = useState("Claude")
  const [submitting, setSubmitting] = useState(false)

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
    const interval = setInterval(fetchSyncState, 5000) // Poll every 5s for live state
    return () => clearInterval(interval)
  }, [])

  const handleAssignTask = async (e) => {
    e.preventDefault()
    if (!newTaskDesc.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/agents/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign-task",
          agent: targetAgent,
          description: newTaskDesc.trim()
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
  const metrics = syncState?.metrics || { tokensSaved: 125000, collaborations: 18 }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <TopBar />

      <main style={{ maxWidth: 1140, margin: "0 auto", padding: "40px 20px" }}>
        
        {/* Header Title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 32 }}>🤝</span>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: "-0.8px" }}>
                  AI Interconnect & Workload Hub
                </h1>
                <p style={{ fontSize: 13, color: C.ink3, fontWeight: 700 }}>
                  Antigravity (Gemini) ⚡ Claude Code Multi-Agent Coordination System
                </p>
              </div>
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 20, background: "#ecfdf5",
              border: "1px solid #a7f3d0", fontSize: 12, fontWeight: 800, color: "#047857"
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
              <span>LIVE SYNC ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
          
          <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>ESTIMATED TOKENS SAVED</span>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.green, marginTop: 4 }}>
              ⚡ {(metrics.tokensSaved || 0).toLocaleString()}
            </div>
            <p style={{ fontSize: 10, color: C.ink3, marginTop: 4 }}>Saved via shared workload & lock coordination</p>
          </div>

          <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>ACTIVE AGENTS</span>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.ink, marginTop: 4, display: "flex", gap: 8 }}>
              <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: 8, fontSize: 13 }}>Gemini 3.5 Flash</span>
              <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 8, fontSize: 13 }}>Claude Sonnet 3.5</span>
            </div>
            <p style={{ fontSize: 10, color: C.ink3, marginTop: 4 }}>Parallel execution with file lock safety</p>
          </div>

          <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>COLLABORATIVE SESSIONS</span>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.purple, marginTop: 4 }}>
              🔄 {metrics.collaborations || 0}
            </div>
            <p style={{ fontSize: 10, color: C.ink3, marginTop: 4 }}>Task handoffs & file lock syncs</p>
          </div>

        </div>

        {/* Live File Locks & Handoff Banner */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
          
          {/* Active File Locks */}
          <div style={{ background: "#fff", padding: 24, borderRadius: 20, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔒</span> Active File Locks ({lockKeys.length})
            </h3>
            {lockKeys.length === 0 ? (
              <p style={{ fontSize: 13, color: C.ink3, fontStyle: "italic" }}>
                No active file locks. All codebase files are available for instant editing.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lockKeys.map(file => (
                  <div key={file} style={{
                    padding: "10px 14px", background: "#f8fafc", borderRadius: 10,
                    border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>{file}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: 6 }}>
                      {locks[file].agent}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent Handoff Status */}
          <div style={{ background: "#fff", padding: 24, borderRadius: 20, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📜</span> Latest Handoff Status
            </h3>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 14, borderRadius: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>{handoff.status || "Idle"}</span>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.ink, margin: "4px 0" }}>{handoff.lastAction || "No recent handoffs."}</p>
              <p style={{ fontSize: 11, color: C.ink3, margin: 0 }}>Next: {handoff.nextSteps || "Awaiting task execution."}</p>
            </div>
          </div>

        </div>

        {/* Task Assignment & Shared Workload Board */}
        <div style={{ background: "#fff", padding: 24, borderRadius: 20, border: `1px solid ${C.border}`, marginBottom: 40 }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>
              📋 CTE Task Queue & Workload Assignments ({tasks.length})
            </h2>
          </div>

          {/* Add / Assign Task Form */}
          <form onSubmit={handleAssignTask} style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            <select
              value={targetAgent}
              onChange={e => setTargetAgent(e.target.value)}
              style={{
                padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`,
                fontSize: 13, fontWeight: 800, outline: "none", background: "#f8fafc"
              }}
            >
              <option value="Claude">Assign to @Claude</option>
              <option value="Antigravity">Assign to @Antigravity</option>
              <option value="Shared">Shared Task</option>
            </select>

            <input
              type="text"
              placeholder="Type task description (e.g. Optimize SEO Metadata, Fix Login Redirect, Add Token Booking)..."
              value={newTaskDesc}
              onChange={e => setNewTaskDesc(e.target.value)}
              style={{
                flex: 1, minWidth: 260, padding: "10px 16px", borderRadius: 12,
                border: `1.5px solid ${C.green}`, fontSize: 13, outline: "none",
                fontWeight: 700, background: "#f0fdf4"
              }}
            />

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 20px", borderRadius: 12, background: C.green,
                color: "#fff", border: "none", fontSize: 13, fontWeight: 900,
                cursor: "pointer", boxShadow: "0 4px 12px rgba(5,150,105,0.2)"
              }}
            >
              {submitting ? "Assigning..." : "Assign Task ➔"}
            </button>
          </form>

          {/* Task List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.map((task, idx) => (
              <div key={idx} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderRadius: 12, background: task.done ? "#f8fafc" : "#fff",
                border: `1px solid ${task.done ? "#e2e8f0" : C.border}`, opacity: task.done ? 0.7 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => handleToggleTask(idx, task.done)}
                    style={{ width: 18, height: 18, cursor: "pointer", accentColor: C.green }}
                  />
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: C.ink,
                    textDecoration: task.done ? "line-through" : "none"
                  }}>
                    {task.description}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                    background: task.assignedTo === "Claude" ? "#fef3c7" : (task.assignedTo === "Antigravity" ? "#eff6ff" : "#f1f5f9"),
                    color: task.assignedTo === "Claude" ? "#b45309" : (task.assignedTo === "Antigravity" ? "#1d4ed8" : "#475569")
                  }}>
                    @{task.assignedTo || "Unassigned"}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </main>

      <Footer />
    </div>
  )
}
