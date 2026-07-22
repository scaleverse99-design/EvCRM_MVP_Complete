"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../lib/AuthContext"
import { authFetch } from "../../../lib/token-storage"
import { C } from "../../../lib/constants"

// /admin/orchestrator — control panel for the news article pipeline.
// Everything routes through /api/admin/orchestrator-proxy so the browser
// never sees INTERNAL_API_SECRET; that endpoint gates on founder/superadmin
// role from the existing auth token.

const STATE_COLORS = {
  DISCOVERED: "#3B82F6",
  RESEARCHED: "#F59E0B",
  PUBLISHED: "#059669",
  FAILED:    "#DC2626",
}

function StatCard({ label, val, color = C.ink }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color, marginTop: 6, letterSpacing: "-0.5px" }}>{val}</div>
    </div>
  )
}

function ActionBtn({ label, onClick, busy, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        background: busy ? C.ink3 : (primary ? C.green : "#fff"),
        color: primary ? "#fff" : C.ink,
        border: primary ? "none" : `1.5px solid ${C.border}`,
        borderRadius: 10,
        padding: "9px 16px",
        fontSize: 13,
        fontWeight: 700,
        cursor: busy ? "not-allowed" : "pointer",
        fontFamily: "inherit",
      }}
    >
      {busy ? "Working…" : label}
    </button>
  )
}

export default function OrchestratorDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null) // which action is running
  const [lastRun, setLastRun] = useState(null) // structured result of the last action

  const call = useCallback(async (action, params = {}) => {
    setBusy(action)
    setLastRun(null)
    try {
      const res = await authFetch("/api/admin/orchestrator-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Request failed")
      return json
    } finally {
      setBusy(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const json = await call("status")
      setData(json)
    } catch (e) {
      setLastRun({ error: e.message })
    } finally {
      setLoading(false)
    }
  }, [call])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace("/login"); return }
    if (user.role !== "founder" && user.role !== "superadmin") { router.replace("/dealer"); return }
    refresh()
  }, [authLoading, user, router, refresh])

  const runAction = async (action, params) => {
    try {
      const json = await call(action, params)
      setLastRun(json.result)
      await refresh()
    } catch (e) {
      setLastRun({ error: e.message })
    }
  }

  if (authLoading || loading) {
    return <div style={{ padding: 60, textAlign: "center", color: C.ink3, background: C.bg, minHeight: "100vh" }}>Loading orchestrator…</div>
  }
  if (!data) return null

  const { counts, total, recent, config } = data

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Admin</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, margin: "6px 0 4px", letterSpacing: "-1px" }}>News Orchestrator</h1>
          <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>
            Automated pipeline: Gemini discovers trending Indian auto news →
            grounded research produces cited briefs → writer publishes SEO
            articles to /blog. Runs on GitHub Actions cron 3x/day; buttons
            here trigger manual runs.
          </p>
        </div>

        {/* Config badges */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: config.geminiConfigured ? "#DCFCE7" : "#FEE2E2", color: config.geminiConfigured ? "#065F46" : "#991B1B", padding: "5px 12px", borderRadius: 20 }}>
            Gemini {config.geminiConfigured ? "✓ ready" : "✕ missing GEMINI_API_KEY"}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, background: "#EFF6FF", color: "#1E40AF", padding: "5px 12px", borderRadius: 20 }}>
            Writer: {config.writer}
          </span>
          {config.writer === "claude" && (
            <span style={{ fontSize: 11, fontWeight: 700, background: config.claudeConfigured ? "#DCFCE7" : "#FEE2E2", color: config.claudeConfigured ? "#065F46" : "#991B1B", padding: "5px 12px", borderRadius: 20 }}>
              Claude {config.claudeConfigured ? "✓ ready" : "✕ missing CLAUDE_API_KEY"}
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, background: "#F3F4F6", color: C.ink2, padding: "5px 12px", borderRadius: 20 }}>
            {total} topics tracked
          </span>
        </div>

        {/* Queue counts */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Discovered — awaiting research" val={counts.DISCOVERED} color={STATE_COLORS.DISCOVERED} />
          <StatCard label="Researched — awaiting write" val={counts.RESEARCHED} color={STATE_COLORS.RESEARCHED} />
          <StatCard label="Published to /blog" val={counts.PUBLISHED} color={STATE_COLORS.PUBLISHED} />
          <StatCard label="Failed" val={counts.FAILED} color={STATE_COLORS.FAILED} />
        </div>

        {/* Actions */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 4 }}>Manual triggers</div>
          <div style={{ fontSize: 11.5, color: C.ink3, marginBottom: 14 }}>
            Each stage runs on a small batch to protect Gemini's daily quota. Refresh the page after a run to see updated counts.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionBtn label="🔍 Discover 10 topics" onClick={() => runAction("discover", { count: 10 })} busy={busy === "discover"} />
            <ActionBtn label="📚 Research next 5"     onClick={() => runAction("research", { count: 5 })} busy={busy === "research"} />
            <ActionBtn label="✍️ Write next 3"         onClick={() => runAction("write", { count: 3 })} busy={busy === "write"} />
            <ActionBtn label="🚀 Run full cycle"       onClick={() => runAction("run", { discover: 10, research: 5, write: 3 })} busy={busy === "run"} primary />
            <ActionBtn label="↻ Refresh"               onClick={refresh} busy={busy === "status"} />
          </div>
        </div>

        {/* Last run result */}
        {lastRun && (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 10 }}>Last run</div>
            <pre style={{ fontSize: 11, background: C.bg, padding: 12, borderRadius: 10, overflow: "auto", margin: 0, maxHeight: 280 }}>
              {JSON.stringify(lastRun, null, 2)}
            </pre>
          </div>
        )}

        {/* Recent topics table */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Recent topics ({recent.length})</div>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: C.ink3, fontSize: 13 }}>
              No topics yet. Click "Discover 10 topics" above to seed the queue.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: C.bg, textAlign: "left" }}>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: C.ink3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4 }}>Topic</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: C.ink3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4 }}>Category</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: C.ink3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4 }}>State</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: C.ink3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4 }}>Discovered</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: C.ink3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4 }}>Article / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(t => (
                    <tr key={t.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 14px", color: C.ink, maxWidth: 340 }}>
                        <div style={{ fontWeight: 700 }}>{t.topic}</div>
                        {t.sourceUrl && (
                          <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: C.ink3, textDecoration: "none" }}>
                            {t.publisher || "source"} ↗
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", color: C.ink2 }}>{t.category}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: STATE_COLORS[t.state] || C.ink3, padding: "3px 10px", borderRadius: 20 }}>
                          {t.state}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: C.ink3, fontSize: 11 }}>
                        {t.discoveredAt ? new Date(t.discoveredAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", maxWidth: 320 }}>
                        {t.articleUrl ? (
                          <a href={t.articleUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.green, fontWeight: 700, textDecoration: "none" }}>
                            View article ↗
                          </a>
                        ) : t.error ? (
                          <span style={{ fontSize: 11, color: "#DC2626" }}>{t.error}</span>
                        ) : (
                          <span style={{ fontSize: 11, color: C.ink3 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
