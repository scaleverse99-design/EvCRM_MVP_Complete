"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "../../lib/AuthContext"
import { authFetch } from "../../lib/token-storage"
import { C } from "../../lib/constants"
import OmniRadarView from "./OmniRadarView"

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h1 style={{ fontSize: 32, fontWeight: 950, color: C.ink, margin: 0, letterSpacing: "-1px" }}>{title}</h1>
      <p style={{ fontSize: 14, color: C.ink2, marginTop: 4 }}>{sub}</p>
    </div>
  )
}

function StatCard({ label, val, sub, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: C.ink2, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 950, color, marginTop: 12, letterSpacing: "-1px" }}>{val}</div>
      <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function NavItem({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
      borderRadius: 12, background: active ? `${C.accent}15` : "none", border: "none",
      color: active ? C.accent : C.ink2, cursor: "pointer", transition: "all 0.2s", textAlign: "left", fontFamily: "inherit",
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: active ? 800 : 600 }}>{label}</span>
    </button>
  )
}

// Same visual language as NavItem, but for pages that live at their own
// route (/admin/orchestrator, /admin/agents, /admin/enterprise) rather than
// an in-page tab — these existed with zero links pointing at them before.
function NavLink({ label, icon, href }) {
  return (
    <Link href={href} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
      borderRadius: 12, background: "none", border: "none",
      color: C.ink2, cursor: "pointer", transition: "all 0.2s", textAlign: "left", fontFamily: "inherit",
      textDecoration: "none", boxSizing: "border-box",
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ marginLeft: "auto", fontSize: 11, color: C.ink3 }}>↗</span>
    </Link>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: 1, padding: "16px 20px 6px" }}>{children}</div>
}

function SectionHeading2({ children }) {
  return <h3 style={{ fontSize: 14, fontWeight: 900, color: C.ink, margin: "0 0 14px", letterSpacing: "-0.2px" }}>{children}</h3>
}

function MiniStat({ label, val, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || C.ink, marginTop: 6 }}>{val}</div>
    </div>
  )
}

function QuickLinkCard({ href, icon, title, desc }) {
  return (
    <Link href={href} style={{ display: "block", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, textDecoration: "none", transition: "border-color 0.15s" }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 4 }}>{title} <span style={{ color: C.ink3, fontWeight: 600 }}>↗</span></div>
      <div style={{ fontSize: 11, color: C.ink3 }}>{desc}</div>
    </Link>
  )
}

function HealthRow({ label, ok, note }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.ink2 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: ok ? C.green : C.ink3, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: ok ? C.green : C.border, display: "inline-block" }} />
        {note || (ok ? "Configured" : "Not set up")}
      </span>
    </div>
  )
}

const ROLE_COLORS = { founder: C.purple || "#8B5CF6", superadmin: C.purple || "#8B5CF6", dealer: C.accent, rep: C.orange, oem: C.blue }

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [view, setView] = useState("dashboard")
  const [localUser, setLocalUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [roleEdits, setRoleEdits] = useState({})   // { userId: selectedRole }
  const [toast, setToast] = useState(null)          // { type, msg }

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace("/login?founder=evcrm2026"); return }
    if (user.role !== "superadmin" && user.role !== "founder") { router.replace("/dealer"); return }
    setLocalUser(user)
  }, [user, authLoading, router])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, uRes, oRes] = await Promise.all([
        authFetch("/api/admin/stats"),
        authFetch("/api/admin/users/all"),
        authFetch("/api/admin/founder-overview"),
      ])
      const sData = await sRes.json()
      const uData = await uRes.json()
      const oData = await oRes.json()
      if (sData.success) setStats(sData)
      if (uData.success) setUsers(uData.users || [])
      if (oData.success) setOverview(oData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (localUser) loadData() }, [localUser, loadData])

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const toggleActive = async (u) => {
    setActing(u.id + "_active")
    try {
      const res = await authFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, is_active: u.is_active === false }),
      })
      const data = await res.json()
      if (!res.ok) { showToast("error", data.error || "Failed"); return }
      showToast("success", data.message)
      await loadData()
    } finally {
      setActing(null)
    }
  }

  const changeRole = async (u) => {
    const newRole = roleEdits[u.id]
    if (!newRole || newRole === u.role) return
    setActing(u.id + "_role")
    try {
      const res = await authFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { showToast("error", data.error || "Failed"); return }
      showToast("success", `${u.name || u.email}: ${data.message}`)
      // clear edit state for this user
      setRoleEdits(prev => { const n = {...prev}; delete n[u.id]; return n })
      await loadData()
    } finally {
      setActing(null)
    }
  }

  const handleSignOut = () => {
    authFetch("/api/auth/logout", { method: "POST" }).finally(() => router.push("/login"))
  }

  const filteredUsers = users.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false
    if (search && !`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (authLoading || (loading && !localUser)) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.ink }}>
        <style>{`@keyframes evcrm-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accent, animation: "evcrm-spin .8s linear infinite", marginBottom: 20 }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: C.ink2, letterSpacing: 1 }}>ACCESSING FOUNDER CONSOLE...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 260, borderRight: `1px solid ${C.border}`, padding: 24, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, background: C.card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900 }}>E</div>
          <span style={{ fontSize: 20, fontWeight: 900, color: C.ink }}>EV.OS <span style={{ color: C.accent, fontSize: 10 }}>FOUNDER</span></span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          <NavItem label="Overview" icon="🛰️" active={view === "dashboard"} onClick={() => setView("dashboard")} />
          <NavItem label="User Ops" icon="👥" active={view === "users"} onClick={() => setView("users")} />

          <SectionLabel>Growth</SectionLabel>
          <NavLink label="Content Pipeline" icon="📰" href="/admin/orchestrator" />
          <NavLink label="Dealer Analytics" icon="📈" href="/dealer/analytics" />
          <NavLink label="OEM Console" icon="🏭" href="/oem" />

          <SectionLabel>Intelligence</SectionLabel>
          <NavItem label="Omni-Radar" icon="🌐" active={view === "omniradar"} onClick={() => setView("omniradar")} />
          <NavLink label="AutoAhrefs" icon="🔥" href="/admin/auto-ahrefs" />

          <SectionLabel>Platform</SectionLabel>
          <NavLink label="Enterprise API" icon="🔌" href="/admin/enterprise" />
          <NavLink label="Agent Sync" icon="🤖" href="/admin/agents" />
        </nav>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👑</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>{localUser?.name || "Founder"}</div>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 700 }}>System Overseer</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ width: "100%", background: "none", border: `1px solid ${C.red}40`, color: C.red, borderRadius: 10, padding: "10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, marginLeft: 260, padding: "40px 60px" }}>

        {view === "omniradar" && <OmniRadarView />}

        {view === "dashboard" && (
          <>
            <PageHeader title="Founder Overview" sub="Everything built this session, in one place — business, onboarding, sales funnel, content, and system health." />

            {/* ── Business ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
              <StatCard label="Total Revenue (MRR)" val={stats?.mrr ? `₹${stats.mrr.toLocaleString("en-IN")}` : "₹0"} sub={`${overview?.business?.payingDealers || 0} paying dealers`} color={C.accent} />
              <StatCard label="Total Dealers" val={overview?.business?.totalDealers ?? stats?.stats?.totalDealers ?? 0} sub={`${overview?.business?.activeDealers ?? 0} active · ${overview?.business?.trialDealers ?? 0} on trial`} color={C.blue} />
              <StatCard label="Platform Users" val={overview?.business?.totalUsers ?? stats?.stats?.totalUsers ?? 0} sub="Founders, dealers, reps & OEMs" color={C.ink} />
            </div>

            {/* ── Dealer onboarding / campaign ── */}
            <SectionHeading2>Dealer Onboarding</SectionHeading2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              <MiniStat label="Signed up (7d)" val={overview?.onboarding?.signedUpLast7d ?? "—"} />
              <MiniStat label="Signed up (30d)" val={overview?.onboarding?.signedUpLast30d ?? "—"} />
              <MiniStat label="GSTIN provided" val={overview?.onboarding?.withGstin ?? "—"} color={C.green} />
              <MiniStat label="GSTIN missing" val={overview?.onboarding?.withoutGstin ?? "—"} color={C.orange} />
            </div>

            {/* ── Quote / sales funnel ── */}
            <SectionHeading2>Quote Funnel — Dynamic Quote Engagement</SectionHeading2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
              <MiniStat label="Quotes sent" val={overview?.funnel?.totalQuotesSent ?? "—"} />
              <MiniStat label="Opened by customer" val={overview?.funnel?.opened ?? "—"} color={C.blue} />
              <MiniStat label="Accepted" val={overview?.funnel?.accepted ?? "—"} color={C.green} />
              <MiniStat label="Has concerns" val={overview?.funnel?.hasConcerns ?? "—"} color={C.red} />
            </div>
            {overview?.funnel?.recentEvents?.length > 0 && (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "8px 20px", marginBottom: 32 }}>
                {overview.funnel.recentEvents.map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < overview.funnel.recentEvents.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ fontSize: 12, color: C.ink2 }}>{e.msg}</span>
                    <span style={{ fontSize: 10, color: C.ink3 }}>{e.dealership} · {new Date(e.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Content pipeline ── */}
            <SectionHeading2>Content Pipeline (News Orchestrator)</SectionHeading2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              <MiniStat label="Discovered" val={overview?.content?.topicCounts?.DISCOVERED ?? "—"} />
              <MiniStat label="Researched" val={overview?.content?.topicCounts?.RESEARCHED ?? "—"} />
              <MiniStat label="Published" val={overview?.content?.totalArticlesPublished ?? "—"} color={C.green} />
              <MiniStat label="Failed" val={overview?.content?.topicCounts?.FAILED ?? "—"} color={overview?.content?.topicCounts?.FAILED > 0 ? C.red : C.ink3} />
            </div>

            {/* ── Pipeline (leads/bookings) ── */}
            <SectionHeading2>Lead & Booking Pipeline</SectionHeading2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              <MiniStat label="Total leads" val={overview?.pipeline?.totalLeads ?? "—"} />
              <MiniStat label="Bookings" val={overview?.pipeline?.totalBookings ?? "—"} />
              <MiniStat label="Service requests" val={overview?.pipeline?.totalServiceRequests ?? "—"} />
              <MiniStat label="Inventory listed" val={overview?.pipeline?.totalInventory ?? "—"} />
            </div>

            {/* ── System health ── */}
            <SectionHeading2>System Health — What's Actually Wired Up</SectionHeading2>
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "4px 20px", marginBottom: 24 }}>
              <HealthRow label="Supabase (production data)" ok={overview?.health?.supabaseConfigured} />
              <HealthRow label="Email (welcome messages)" ok={overview?.health?.emailConfigured} />
              <HealthRow label="WhatsApp broadcast" ok={false} note="Manual by design — see campaign docs" />
              <HealthRow label="Content writer (Gemini)" ok={overview?.health?.geminiConfigured} />
              <HealthRow label="Content writer (Claude, paid)" ok={overview?.health?.claudeConfigured} />
              <HealthRow label="Orchestrator cron" ok={overview?.health?.orchestratorCronEnabled} note={overview?.health?.orchestratorCronEnabled ? "Enabled" : "Needs repo secrets"} />
            </div>

            {/* ── Quick links to the pages that were previously unreachable ── */}
            <SectionHeading2>Jump To</SectionHeading2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div onClick={() => setView("omniradar")} style={{ cursor: "pointer" }}>
                <QuickLinkCard href="#" icon="🌐" title="Omni-Radar" desc="Master Triangulation Intelligence Loop" />
              </div>
              <QuickLinkCard href="/admin/auto-ahrefs" icon="🔥" title="AutoAhrefs India" desc="Competitor Gap Matrix & Intelligence" />
              <QuickLinkCard href="/admin/orchestrator" icon="📰" title="Content Pipeline" desc="News orchestrator queue, manual triggers" />
              <QuickLinkCard href="/dealer/analytics" icon="📈" title="Dealer Analytics" desc="Per-dealer performance dashboard" />
              <QuickLinkCard href="/oem" icon="🏭" title="OEM Console" desc="Dealer network, bulk onboarding, stock requests" />
              <QuickLinkCard href="/admin/enterprise" icon="🔌" title="Enterprise API" desc="MCP/API clients, tiers, revenue" />
              <QuickLinkCard href="/admin/agents" icon="🤖" title="Agent Sync" desc="Claude ↔ Antigravity task board" />
              <QuickLinkCard href="/cte" icon="🔗" title="MCP Server Docs" desc="Public connector documentation" />
            </div>
          </>
        )}

        {view === "users" && (
          <>
            <PageHeader title="User Ops" sub={`${filteredUsers.length} of ${users.length} accounts across the platform.`} />

            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.ink, outline: "none", fontFamily: "inherit" }} />
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.ink, outline: "none", fontFamily: "inherit", cursor: "pointer" }}>
                <option value="all">All roles</option>
                <option value="founder">Founder</option>
                <option value="dealer">Dealer</option>
                <option value="rep">Sales Rep</option>
                <option value="oem">OEM</option>
              </select>
            </div>

            {/* Toast */}
            {toast && (
              <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${toast.type === "error" ? C.red : C.green}40`, borderRadius: 14, padding: "14px 20px", display: "flex", gap: 10, alignItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", maxWidth: 360 }}>
                <span style={{ fontSize: 16 }}>{toast.type === "error" ? "⚠️" : "✅"}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: toast.type === "error" ? C.red : C.green }}>{toast.msg}</span>
              </div>
            )}

            <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                    {["Name", "Email", "Role", "Dealership", "Status", "Change Role", "Active"].map(head => (
                      <th key={head} style={{ padding: "14px 20px", textAlign: "left", fontSize: 10, fontWeight: 800, color: C.ink2, textTransform: "uppercase", letterSpacing: 1 }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.ink3 }}>Loading users…</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.ink3 }}>No users match.</td></tr>
                  ) : filteredUsers.map(u => {
                    const pendingRole = roleEdits[u.id]
                    const isDirty = pendingRole && pendingRole !== u.role
                    return (
                    <tr key={u.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: C.ink }}>{u.name || "—"}</td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: C.ink2 }}>{u.email}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ background: `${ROLE_COLORS[u.role] || C.ink3}15`, color: ROLE_COLORS[u.role] || C.ink3, fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "3px 10px", textTransform: "uppercase" }}>{u.role}</span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: C.ink3 }}>{u.dealership || "—"}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: u.is_active === false ? C.red : C.green }}>{u.is_active === false ? "● INACTIVE" : "● ACTIVE"}</span>
                      </td>

                      {/* ── Role Editor ── */}
                      <td style={{ padding: "14px 20px" }}>
                        {u.role !== "founder" ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <select
                              value={pendingRole ?? u.role}
                              onChange={e => setRoleEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                              style={{ background: C.bg, border: `1.5px solid ${isDirty ? C.accent : C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: C.ink, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
                            >
                              <option value="dealer">🏪 Dealer</option>
                              <option value="rep">⚡ Sales Rep</option>
                              <option value="oem">🏭 OEM</option>
                              <option value="superadmin">🔱 Superadmin</option>
                            </select>
                            {isDirty && (
                              <button
                                onClick={() => changeRole(u)}
                                disabled={acting === u.id + "_role"}
                                style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", opacity: acting === u.id + "_role" ? 0.6 : 1 }}
                              >
                                {acting === u.id + "_role" ? "…" : "Save"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: C.ink3 }}>Protected</span>
                        )}
                      </td>

                      {/* ── Active Toggle ── */}
                      <td style={{ padding: "14px 20px" }}>
                        {u.role !== "founder" && (
                          <button onClick={() => toggleActive(u)} disabled={acting === u.id + "_active"}
                            style={{ background: "none", border: `1px solid ${u.is_active === false ? C.green : C.red}40`, color: u.is_active === false ? C.green : C.red, borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: acting === u.id + "_active" ? 0.6 : 1 }}>
                            {acting === u.id + "_active" ? "…" : u.is_active === false ? "Activate" : "Deactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
