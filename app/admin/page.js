"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../lib/AuthContext"
import { authFetch } from "../../lib/token-storage"
import { OpsProxy } from "../../lib/ops-proxy"
import { C as h } from "../../lib/constants"

// ── UI Components ───────────────────────────────────────────────────

function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 950, color: h.ink, margin: 0, letterSpacing: "-1px" }}>{title}</h1>
        <p style={{ fontSize: 14, color: h.ink2, marginTop: 4 }}>{sub}</p>
      </div>
      {action}
    </div>
  )
}

function StatCard({ label, val, sub, color }) {
  return (
    <div style={{ background: h.card, border: `1px solid ${h.border}`, borderRadius: 24, padding: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: h.ink2, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 950, color: color, marginTop: 12, letterSpacing: "-1px" }}>{val}</div>
      <div style={{ fontSize: 12, color: h.ink3, marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function NavItem({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
      borderRadius: 12, background: active ? `${h.accent}15` : "none", border: "none",
      color: active ? h.accent : h.ink2, cursor: "pointer", transition: "all 0.2s",
      textAlign: "left"
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: active ? 800 : 600 }}>{label}</span>
    </button>
  )
}

// ── Main Page Component ──────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const { user: g, loading: y, refresh: G } = useAuth()
  
  // State from recovered logic
  const [v, S] = useState("dashboard") // View
  const [k, D] = useState(null)        // Local User state
  const [w, C] = useState(null)        // Stats
  const [z, R] = useState([])          // Users list
  const [E, T] = useState([])          // System Logs
  const [W, I] = useState(true)        // Page Loading
  const [A, B] = useState(false)       // Action Loading
  const [_, F] = useState("")          // Search
  const [O, L] = useState(null)        // Modal View
  const [N, P] = useState(null)        // Selected Object (User/Client)
  const [M, U] = useState(false)       // Modal Loading
  const [H, V] = useState(false)       // Global Busy
  const [K, Y] = useState([])          // Clients/Nodes
  const [q, J] = useState(false)       // Syncing
  const [X, Z] = useState(null)        // Provisioning result
  const [Q, $] = useState(1)           // Wizard step
  const [ee, et] = useState({ name: "", domain: "", folderId: "", template: "agency" })
  const [en, ei] = useState(null)      // Selected Client
  const [eo, er] = useState([])        // Published Articles
  const [ea, el] = useState([])        // Pending Articles
  const [es, ed] = useState(false)     // Editorial Syncing

  // Auth Guard
  useEffect(() => {
    if (!y) {
      if (!g) {
        router.replace("/login")
        return
      }
      if (g.role !== "superadmin" && g.role !== "founder") {
        router.replace("/dealer")
        return
      }
      D(g)
      loadInitialData()
    }
  }, [g, y])

  // Periodic Refresh logic
  useEffect(() => {
    if (v === "pulse") {
      const itv = setInterval(fetchLogs, 4000)
      fetchLogs()
      return () => clearInterval(itv)
    }
    if (v === "factory") fetchClients()
    if (v === "editorial") fetchEditorial()
  }, [v])

  const loadInitialData = async () => {
    I(true)
    try {
      const [sRes, uRes] = await Promise.all([
        authFetch("/api/admin/stats"),
        authFetch("/api/admin/users/all")
      ])
      const sData = await sRes.json()
      const uData = await uRes.json()
      if (sData.success) C(sData)
      if (uData.success) R(uData.users || [])
    } finally {
      I(false)
    }
  }

  const fetchClients = async () => {
    J(true)
    try {
      const res = await authFetch("/api/admin/ops-manager/clients")
      const data = await res.json()
      if (data.success) Y(data.clients || [])
    } finally {
      J(false)
    }
  }

  const fetchLogs = async () => {
    B(true)
    try {
      const res = await authFetch("/api/admin/system/logs")
      const data = await res.json()
      if (data.success) T(data.logs || [])
    } finally {
      B(false)
    }
  }

  const fetchEditorial = async () => {
    if (!k?.opsmanager_url) return
    ed(true)
    try {
      // Use OpsProxy to fetch from the specific dealership's Rack
      const pending = await OpsProxy.get("pending_reviews", k, "ev-crm")
      const published = await OpsProxy.get("pulse", k, "ev-crm")
      el(Array.isArray(pending) ? pending : [])
      er(Array.isArray(published) ? published : [])
    } catch (e) {
      console.error("[Editorial Sync Error]:", e)
    } finally {
      ed(false)
    }
  }

  const handleApprove = async (id) => {
    if (!k?.opsmanager_url) return
    try {
      const article = ea.find(a => a.id === id)
      if (!article) return
      
      const res = await OpsProxy.act("APPROVE_NEWS", {
        id,
        article: { 
          ...article.aiResult, 
          sourceName: article.sourceName,
          publishedAt: new Date().toISOString()
        }
      }, k, "ev-crm")

      if (res.success) {
        alert("✅ Sovereign Publication Successful!")
        fetchEditorial()
      } else {
        alert("❌ Error: " + (res.error || "Publication failed"))
      }
    } catch (e) {
      alert("❌ Error: " + e.message)
    }
  }

  const handleIgniteSync = async () => {
    if (!confirm("🚀 Ignite AI Content Engine? This will scan for new industry trends immediately.")) return
    B(true)
    try {
      const res = await fetch("/api/cron/pulse-update?secret=manual&force=true")
      const data = await res.json()
      if (data.success) {
        alert(`✅ Success! Generated ${data.count} tiered articles.`)
        loadInitialData()
      } else {
        alert("❌ Sync failed. Check logs for [CRITICAL] errors.")
      }
    } finally {
      B(false)
    }
  }

  const handleSignOut = () => {
    authFetch("/api/auth/logout", { method: "POST" }).finally(() => {
      // clear token is handled in AuthContext or manually
      router.push("/login")
    })
  }

  // Loading Screen
  if (y || (W && !k)) {
    return (
      <div style={{ minHeight: "100vh", background: h.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: h.ink }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: h.accent, className: "login-spin", marginBottom: 20 }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: h.ink2, letterSpacing: 1 }}>ACCESSING EXPERT ENVIRONMENT...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: h.bg, display: "flex", fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* ── Sidebar Navigation ────────────────────────────────────────── */}
      <div style={{ width: 260, borderRight: `1px solid ${h.border}`, padding: 24, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, background: h.card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, background: h.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900 }}>E</div>
          <span style={{ fontSize: 20, fontWeight: 900, color: h.ink }}>EV.OS <span style={{ color: h.accent, fontSize: 10 }}>OPERATOR</span></span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <NavItem label="Global Hub" icon="🛰️" active={v === "dashboard"} onClick={() => S("dashboard")} />
          <NavItem label="Intelligence" icon="🧠" active={v === "intelligence"} onClick={() => S("intelligence")} />
          <NavItem label="Social Hub" icon="📢" active={v === "social"} onClick={() => S("social")} />
          <NavItem label="User Ops" icon="👥" active={v === "users"} onClick={() => S("users")} />
          <NavItem label="Sovereign Pulse" icon="🛰️" active={v === "pulse"} onClick={() => S("pulse")} />
          <NavItem label="Editorial Studio" icon="✍️" active={v === "editorial"} onClick={() => S("editorial")} />
          <NavItem label="Business Factory" icon="🏗️" active={v === "factory"} onClick={() => S("factory")} />
          <NavItem label="Infrastructure" icon="🛡️" active={v === "infra"} onClick={() => S("infra")} />
        </nav>

        <div style={{ borderTop: `1px solid ${h.border}`, paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: h.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👑</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: h.ink }}>{k?.name || "Founder"}</div>
              <div style={{ fontSize: 10, color: h.accent, fontWeight: 700 }}>System Overseer</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ width: "100%", background: "none", border: `1px solid ${h.red}40`, color: h.red, borderRadius: 10, padding: "10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <div style={{ flex: 1, marginLeft: 260, padding: "40px 60px" }}>
        
        {/* GLOBAL HUB VIEW */}
        {v === "dashboard" && (
          <>
            <PageHeader title="Global Platform Hub" sub="Real-time performance metrics across all India dealerships." 
              action={<button onClick={() => {L("wizard"); $("1")}} style={{ background: h.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 20px ${h.accent}33` }}>🚀 Launch Sovereign Node</button>} 
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
              <StatCard label="Total Revenue (MRR)" val={w?.mrr ? `₹${w.mrr.toLocaleString()}` : "₹ 0"} sub="Based on active subscriptions" color={h.accent} />
              <StatCard label="Active Dealers" val={w?.stats?.totalDealers || 0} sub={`${w?.stats?.activeDealer || 0} Live Now`} color={h.blue} />
              <StatCard label="Platform Users" val={w?.stats?.totalUsers || 0} sub="Founders, Dealers & Reps" color={h.ink} />
            </div>
          </>
        )}

        {/* INTELLIGENCE VIEW */}
        {v === "intelligence" && (
          <>
            <PageHeader title="Sovereign Intelligence" sub="Real-time global leads, analytics, and operational tracking." 
              action={<button style={{ background: h.blue, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>📊 Export Sovereign Ledger</button>} 
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
              <StatCard label="Global Leads" val="142" sub="+12 today" color={h.accent} />
              <StatCard label="Fleet Traffic" val="4.8k" sub="Unique Visitors" color={h.blue} />
              <StatCard label="Conversion Rate" val="2.4%" sub="Global Avg" color={h.ink} />
              <StatCard label="Server Health" val="99.9%" sub="Zero Downtime" color={h.accent} />
            </div>
            <div style={{ background: h.card, borderRadius: 24, border: `1px solid ${h.border}`, overflow: "hidden" }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${h.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: h.ink, margin: 0 }}>Master Sovereign Ledger (Live)</h3>
                <span style={{ fontSize: 11, color: h.blue, fontWeight: 800 }}>SYNCED WITH 5TB DRIVE V3</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: `1px solid ${h.border}` }}>
                    {["TIME", "CLIENT", "SOURCE", "DATA", "STATUS"].map(head => (
                      <th key={head} style={{ padding: "16px 24px", textAlign: "left", fontSize: 10, fontWeight: 800, color: h.ink2, textTransform: "uppercase", letterSpacing: 1 }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { time: "Just Now", client: "SocialCom", source: "Web Form", data: "Balaji L. - Inquiry about Sovereign Setup", status: "NEW" },
                    { time: "14m ago", client: "EvCRM", source: "Meta Ads", data: "Nikhil S. - Dealership Quote Request", status: "DOCKED" },
                    { time: "1h ago", client: "BalajiCars", source: "WhatsApp", data: "Rahul K. - Inventory Search", status: "DOCKED" },
                    { time: "3h ago", client: "SocialCom", source: "Web Form", data: "Deepak M. - White-label Partnership", status: "PROCESSED" }
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: i === 3 ? "none" : `1px solid ${h.border}` }}>
                      <td style={{ padding: "16px 24px", fontSize: 12, color: h.ink2 }}>{row.time}</td>
                      <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 700, color: h.ink }}>{row.client}</td>
                      <td style={{ padding: "16px 24px" }}><span style={{ fontSize: 10, fontWeight: 800, background: `${h.blue}15`, color: h.blue, padding: "4px 8px", borderRadius: 6 }}>{row.source}</span></td>
                      <td style={{ padding: "16px 24px", fontSize: 12, color: h.ink }}>{row.data}</td>
                      <td style={{ padding: "16px 24px" }}><span style={{ fontSize: 10, fontWeight: 900, color: row.status === "NEW" ? h.accent : h.ink2 }}>● {row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* SOVEREIGN PULSE VIEW */}
        {v === "pulse" && (
          <>
            <PageHeader title="Sovereign Pulse" sub="Real-time monitoring of your Global Raw Storage Racks & Edge Gateways." 
              action={<button onClick={fetchLogs} style={{ background: h.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 20px ${h.accent}33` }}>🛰️ Scan Infrastructure</button>} 
            />
            <div style={{ background: "#0D1117", border: `1px solid ${h.border}`, borderRadius: 20, padding: 24, minHeight: 500, boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, background: h.accent, borderRadius: "50%", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#8B949E", textTransform: "uppercase", letterSpacing: 1 }}>Engine Heartbeat</span>
                </div>
                {A && <span style={{ fontSize: 9, color: h.accent, fontWeight: 800 }}>LIVE FEEDING...</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 420 }}>
                {E.length === 0 ? (
                  <div style={{ color: "#484F58", fontSize: 12, fontFamily: "monospace" }}>Waiting for heartbeat packets...</div>
                ) : E.map(log => (
                  <div key={log.id} style={{ display: "flex", gap: 16, borderLeft: `2px solid ${log.status === "ERROR" ? h.red : h.accent}`, paddingLeft: 16, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: "#8B949E", fontFamily: "monospace", width: 90, opacity: 0.6 }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: log.status === "ERROR" ? h.red : h.accent }}>[{log.op}]</div>
                      <div style={{ fontSize: 12, color: "#C9D1D9", marginTop: 2, opacity: 0.9 }}>{log.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* EDITORIAL STUDIO VIEW */}
        {v === "editorial" && (
          <>
            <PageHeader title="AI Editorial Studio" sub="Manage AI-generated news and blogs for evcrm.in." 
              action={
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={fetchEditorial} style={{ background: h.card, color: h.ink, border: `1px solid ${h.border}`, borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>🔄 Refresh Feed</button>
                  <button onClick={handleIgniteSync} style={{ background: h.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>⚡ Ignite AI Sync</button>
                </div>
              } 
            />
            <div style={{ display: "grid", gap: 32 }}>
              {ea.length > 0 && (
                <div style={{ background: `${h.accent}10`, border: `1px solid ${h.accent}40`, borderRadius: 24, padding: 32 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: h.accent, marginBottom: 20, margin: 0 }}>⏳ Pending Review ({ea.length})</h3>
                  <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
                    {ea.map(item => (
                      <div key={item.id} style={{ background: h.card, border: `1px solid ${h.border}`, borderRadius: 16, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: h.ink2 }}>FROM: {item.sourceName}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: h.ink, marginTop: 4 }}>{item.aiResult?.headline}</div>
                          <div style={{ fontSize: 12, color: h.ink2, marginTop: 4 }}>{item.aiResult?.subheadline}</div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => handleApprove(item.id)} style={{ background: h.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Approve & Publish</button>
                          <button style={{ background: h.red, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ background: h.card, border: `1px solid ${h.border}`, borderRadius: 24, padding: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: h.ink, marginBottom: 20, margin: 0 }}>📰 Published Articles</h3>
                <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
                  {er.map(item => (
                    <div key={item.id} style={{ borderBottom: `1px solid ${h.border}`, paddingBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, background: `${h.blue}20`, color: h.blue, padding: "2px 6px", borderRadius: 4 }}>{item.category}</span>
                          <span style={{ fontSize: 11, color: h.ink2 }}>{new Date(item.publishedAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: h.ink, marginTop: 4 }}>{item.title}</div>
                      </div>
                      <a href={`/pulse/${item.slug}`} target="_blank" style={{ background: h.bg, border: `1px solid ${h.border}`, color: h.accent, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>View Live ↗</a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {O === "wizard" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(10px)" }}>
          <div style={{ background: h.card, border: `1px solid ${h.border}`, borderRadius: 32, padding: 40, width: 500, boxShadow: "0 30px 100px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
              {[1, 2, 3].map(step => <div key={step} style={{ flex: 1, height: 4, borderRadius: 2, background: step <= Q ? h.accent : `${h.ink2}30` }} />)}
            </div>
            {Q === "1" && (
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: h.ink, marginBottom: 8 }}>Identity Setup</h2>
                <p style={{ fontSize: 13, color: h.ink2, marginBottom: 24 }}>What is the name and domain of this Sovereign Node?</p>
                <div style={{ display: "grid", gap: 16 }}>
                  <input placeholder="Business Name (e.g. Balaji Cars)" value={ee.name} onChange={e => et({ ...ee, name: e.target.value })} style={{ background: h.bg, border: `1px solid ${h.border}`, borderRadius: 12, padding: 14, color: h.ink }} />
                  <input placeholder="Domain (e.g. balajicars.com)" value={ee.domain} onChange={e => et({ ...ee, domain: e.target.value })} style={{ background: h.bg, border: `1px solid ${h.border}`, borderRadius: 12, padding: 14, color: h.ink }} />
                  <button onClick={() => $("2")} style={{ background: h.accent, color: "#fff", padding: 14, borderRadius: 12, fontWeight: 800, border: "none", cursor: "pointer", marginTop: 10 }}>Continue to Storage ›</button>
                </div>
              </div>
            )}
            <button onClick={() => L(null)} style={{ width: "100%", background: "none", border: "none", color: h.ink2, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 20 }}>Cancel Wizard</button>
          </div>
        </div>
      )}

    </div>
  )
}
