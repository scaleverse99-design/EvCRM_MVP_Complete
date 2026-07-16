"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../lib/AuthContext"
import { authFetch } from "../../lib/token-storage"
import { C } from "../../lib/constants"

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

const ROLE_COLORS = { founder: C.purple || "#8B5CF6", superadmin: C.purple || "#8B5CF6", dealer: C.accent, rep: C.orange, oem: C.blue }

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [view, setView] = useState("dashboard")
  const [localUser, setLocalUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [roleEdits, setRoleEdits] = useState({})   // { userId: selectedRole }
  const [toast, setToast] = useState(null)          // { type, msg }

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace("/login"); return }
    if (user.role !== "superadmin" && user.role !== "founder") { router.replace("/dealer"); return }
    setLocalUser(user)
  }, [user, authLoading, router])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, uRes] = await Promise.all([
        authFetch("/api/admin/stats"),
        authFetch("/api/admin/users/all"),
      ])
      const sData = await sRes.json()
      const uData = await uRes.json()
      if (sData.success) setStats(sData)
      if (uData.success) setUsers(uData.users || [])
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

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <NavItem label="Global Hub" icon="🛰️" active={view === "dashboard"} onClick={() => setView("dashboard")} />
          <NavItem label="User Ops" icon="👥" active={view === "users"} onClick={() => setView("users")} />
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

        {view === "dashboard" && (
          <>
            <PageHeader title="Global Platform Hub" sub="Real-time performance metrics across every dealership on EvCRM." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
              <StatCard label="Total Revenue (MRR)" val={stats?.mrr ? `₹${stats.mrr.toLocaleString("en-IN")}` : "₹0"} sub="Based on active subscriptions" color={C.accent} />
              <StatCard label="Active Dealers" val={stats?.stats?.totalDealers || 0} sub={`${stats?.stats?.activeDealer || 0} live now`} color={C.blue} />
              <StatCard label="Platform Users" val={stats?.stats?.totalUsers || 0} sub="Founders, dealers, reps & OEMs" color={C.ink} />
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
