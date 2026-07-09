"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { C } from "../../lib/constants"
import { Avatar, LiveBadge } from "../ui"
import { authFetch, clearToken } from "../../lib/token-storage"

// ── Role-based nav config ─────────────────────────────────────────────
const NAV_BY_ROLE = {
  superadmin: [
    { group: "🔱 Founder Controls", items: [
      { href:"/admin",             icon:"⚙️", label:"Platform Overview"  },
      { href:"/dealer/attendance", icon:"🗓", label:"Attendance Monitor"  },
      { href:"/team",              icon:"👥", label:"Team Management"    },
    ]},
    { group: "👁 Preview as Dealer", items: [
      { href:"/dealer",    icon:"⊞",  label:"Dealer Dashboard" },
      { href:"/leads",     icon:"◎",  label:"Leads Pipeline"   },
      { href:"/queue",     icon:"⚡", label:"AI Queue"         },
      { href:"/connect",   icon:"✉",  label:"Connect Hub"      },
      { href:"/assign",    icon:"👤", label:"Assignment"       },
    ]},
    { group: "⚡ Preview as Sales Rep", items: [
      { href:"/attendance",      icon:"📅", label:"Rep Attendance"     },
      { href:"/showroom",        icon:"🏪", label:"Showroom"           },
      { href:"/buildprice",      icon:"₹",  label:"Build & Price"      },
      { href:"/quotepro",        icon:"📄", label:"QuotePro"           },
    ]},
    { group: "🛠 Inventory & Tools", items: [
      { href:"/vehicles",        icon:"🚗", label:"Vehicle Inventory"  },
      { href:"/market-research", icon:"🔍", label:"Market Research"    },
      { href:"/command",         icon:"▦",  label:"Command Centre"     },
    ]},
  ],
  dealer: [
    { group: "Main", items: [
      { href:"/dealer",            icon:"⊞",  label:"Dashboard"         },
      { href:"/leads",             icon:"◎",  label:"Leads"              },
      { href:"/queue",             icon:"⚡", label:"AI Queue"           },
      { href:"/connect",           icon:"✉",  label:"Connect"            },
      { href:"/assign",            icon:"👤", label:"Assignment"         },
    ]},
    { group: "Team & HR", items: [
      { href:"/team",              icon:"👥", label:"My Team"            },
      { href:"/dealer/attendance", icon:"🗓", label:"Attendance Monitor" },
    ]},
    { group: "Sales Tools", items: [
      { href:"/vehicles",          icon:"🚗", label:"Inventory"          },
      { href:"/showroom",          icon:"🏪", label:"Showroom"           },
      { href:"/buildprice",        icon:"₹",  label:"Build & Price"      },
      { href:"/quotepro",          icon:"📄", label:"QuotePro"           },
      { href:"/market-research",   icon:"🔍", label:"Market Research"    },
    ]},
  ],
  rep: [
    { group: "Main", items: [
      { href:"/queue",      icon:"⚡", label:"My AI Queue"    },
      { href:"/leads",      icon:"◎",  label:"Leads"          },
      { href:"/connect",    icon:"✉",  label:"Connect"        },
      { href:"/attendance", icon:"📅", label:"My Attendance"  },
    ]},
    { group: "Sales", items: [
      { href:"/showroom",   icon:"🏪", label:"Showroom"       },
      { href:"/buildprice", icon:"₹",  label:"Build & Price"  },
      { href:"/quotepro",   icon:"📄", label:"QuotePro"       },
    ]},
  ],
}

// ── Shared logout ──────────────────────────────────────────────────────
async function doLogout(router) {
  try { await authFetch("/api/auth/logout", { method:"POST" }) } catch (_) {}
  clearToken()
  router.push("/login")
}

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ open, onClose, user, onLogout }) {
  const router   = useRouter()
  const pathname = usePathname()

  const navigate = (href) => { router.push(href); onClose() }

  const role    = user?.role || "rep"
  const navRole = (role === "founder") ? "superadmin" : role
  const groups  = NAV_BY_ROLE[navRole] || NAV_BY_ROLE.rep

  // Label & color by role
  const roleCfg = {
    superadmin: { label:"Founder", color:"#065F46", badge:"🔱" },
    founder:    { label:"Founder", color:"#065F46", badge:"🔱" },
    dealer:     { label:"Dealer",  color:C.green,   badge:"🏪" },
    rep:        { label:"Rep",     color:C.orange,  badge:"⚡" },
  }[role] || { label:"User", color:C.blue, badge:"👤" }

  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.28)", zIndex:40, backdropFilter:"blur(2px)" }}/>
      )}
      <aside style={{
        position:"fixed", top:0, left:0, width:260, height:"100vh",
        background: "#fff", borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", zIndex:50,
        boxShadow: open ? "10px 0 40px rgba(0,0,0,0.1)" : "none",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition:"transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        color: C.ink
      }}>
        {/* Unified Brand */}
        <div style={{ padding:"24px 20px", borderBottom:`1px solid ${C.border}`, marginBottom: 10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
             <div style={{ 
               width: 28, height: 28, borderRadius: 7, 
               background: C.green, 
               display: "flex", alignItems: "center", justifyContent: "center", 
               fontSize: 12, fontWeight: 900, color: "#fff"
             }}>E</div>
             <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.6px", color: C.ink }}>
                EV<span style={{ color:C.green }}>.CRM</span>
             </div>
          </div>
          <div style={{ marginTop: 12, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ background:C.bg, color:C.ink2, fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:6, letterSpacing: "0.5px", border:`1px solid ${C.border}` }}>
              {roleCfg.badge} {roleCfg.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Nav — grouped */}
        <nav style={{ flex:1, padding:"0 12px", overflowY:"auto" }}>
          {groups.map((group, gi) => (
            <div key={gi} style={{ marginBottom:14 }}>
              {group.group !== "Main" && (
                <div style={{ fontSize:9, fontWeight:800, color:C.ink3, opacity:0.6, letterSpacing:"1px", padding:"12px 14px 6px", textTransform:"uppercase" }}>
                  {group.group}
                </div>
              )}
              {group.items.map(item => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <button key={item.href} onClick={() => navigate(item.href)} style={{
                    width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                    borderRadius:12, border:"none", cursor:"pointer",
                    background: isActive ? C.greenL : "transparent",
                    color: isActive ? C.greenD : C.ink3,
                    fontWeight: isActive ? 800 : 500,
                    fontSize:13, marginBottom:2,
                    transition:"all 0.2s ease",
                    textAlign:"left", fontFamily:"inherit"
                  }}
                    onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.background=C.bg; e.currentTarget.style.color=C.ink }}}
                    onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.ink3 }}}
                  >
                    <span style={{ fontSize:15, flexShrink:0, opacity: isActive?1:0.7 }}>{item.icon}</span>
                    <span style={{ flex:1 }}>{item.label}</span>
                    {isActive && <span style={{ fontSize:10 }}>●</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer: Profile + Logout */}
        <div style={{ padding: "12px", borderTop:`1px solid ${C.border}` }}>
          <button onClick={() => navigate("/profile")} style={{ padding:"10px 12px", borderRadius: 12, display:"flex", alignItems:"center", gap:12, width:"100%", background:"transparent", border:"none", cursor:"pointer", textAlign:"left", color: C.ink }}
            onMouseEnter={e => e.currentTarget.style.background=C.bg}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}
          >
            <Avatar name={user?.name || "U"} size={32} color={roleCfg.color} />
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name || "User"}</div>
              <div style={{ fontSize:10, color:C.ink3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>Expert Hub →</div>
            </div>
          </button>
          <button onClick={onLogout} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"transparent", border:"none", cursor:"pointer", color: C.ink3, fontSize:12, fontWeight:600, marginTop: 4 }}
            onMouseEnter={e => {e.currentTarget.style.color=C.red; e.currentTarget.style.background=C.redL}}
            onMouseLeave={e => {e.currentTarget.style.color=C.ink3; e.currentTarget.style.background="transparent"}}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────
function TopBar({ sidebarOpen, onToggle, title, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  const roleColor = { superadmin:C.accent, founder:C.accent, dealer:C.greenMid, rep:C.greenMid }[user?.role] || C.blue

  return (
    <header style={{
      background: "#fff", borderBottom:`1px solid ${C.border}`,
      padding:"0 24px", height:64, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      position:"sticky", top:0, zIndex:35,
      boxShadow:"0 2px 12px rgba(0,0,0,0.05)",
      color: C.ink
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <button onClick={onToggle} style={{
          background: C.bg,
          border:`1px solid ${C.border}`,
          borderRadius:10, width:36, height:36, cursor:"pointer",
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:4, padding:0, transition:"all 0.2s"
        }}>
          <Bar rot={sidebarOpen ? 45 : 0} trans={sidebarOpen ? "translate(0,5px)" : "none"} color={C.ink} />
          <Bar opacity={sidebarOpen ? 0 : 1} color={C.ink} />
          <Bar rot={sidebarOpen ? -45 : 0} trans={sidebarOpen ? "translate(0,-5px)" : "none"} color={C.ink} />
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.6px" }}>
            EV<span style={{ color:C.green }}>.CRM</span>
          </div>
          {title && (
            <>
              <span style={{ color:C.border, fontSize:16, margin:"0 4px" }}>/</span>
              <span style={{ fontSize:13, fontWeight:700, color:C.ink2 }}>{title}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <LiveBadge />
        
        <div ref={menuRef} style={{ position:"relative" }}>
          <button onClick={() => setMenuOpen(m => !m)} style={{ background:C.bg, border:`1px solid ${C.border}`, padding:"6px 12px", borderRadius: 12, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ textAlign: "right" }}>
                <div style={{ fontSize:11, fontWeight:800, color: C.ink }}>{user?.name || "Expert"}</div>
                <div style={{ fontSize:9, fontWeight:700, color: C.green, textTransform: "uppercase" }}>{user?.role || "rep"}</div>
            </div>
            <Avatar name={user?.name || "U"} size={32} color={roleColor} />
          </button>

          {menuOpen && (
            <div style={{
              position:"absolute", top:"calc(100% + 10px)", right:0, width:220,
              background:"#fff", border:`1px solid ${C.border}`, borderRadius:14,
              boxShadow:"0 12px 40px rgba(0,0,0,0.12)", zIndex:200, overflow:"hidden"
            }}>
              <div style={{ padding:"14px", borderBottom:`1px solid ${C.border}`, background:C.bg }}>
                <div style={{ fontSize:12, fontWeight:800, color: C.ink }}>{user?.name || "User"}</div>
                <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>{user?.email || ""}</div>
              </div>
              <button onClick={() => { setMenuOpen(false); window.location.href="/profile" }} style={{ width:"100%", padding:"12px 14px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left", fontSize:12, color:C.ink2, fontFamily:"inherit", display:"flex", alignItems:"center", gap:10 }}
                onMouseEnter={e=> {e.currentTarget.style.background=C.bg; e.currentTarget.style.color=C.ink}}
                onMouseLeave={e=> {e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.ink2}}
              >
                <span>👤</span> My Profile
              </button>
              <div style={{ height:1, background:C.border }} />
              <button onClick={onLogout} style={{ width:"100%", padding:"12px 14px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left", fontSize:12, color:C.red, fontFamily:"inherit", display:"flex", alignItems:"center", gap:10, fontWeight:700 }}
                onMouseEnter={e=>e.currentTarget.style.background=C.redL}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function Bar({ rot=0, trans="none", opacity=1, color=C.ink2 }) {
  return <span style={{ display:"block", width:16, height:2, background:color, borderRadius:2, transition:"all 0.2s", transform:`rotate(${rot}deg) ${trans}`, opacity }}/>
}

import { useAuth } from "../../lib/AuthContext"

// ... (existing NAV_BY_ROLE and doLogout) ...

// ── Shell ─────────────────────────────────────────────────────────────
export default function Shell({ children, title }) {
  const [open, setOpen] = useState(false)
  const { user, loading, logout: handleLogout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Protection Logic
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", background: "#F9FAFB", gap: 20, flexDirection: "column" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.green}20`, borderTopColor: C.green, animation: "evcrm-spin 1s linear infinite" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink3, letterSpacing: "0.5px" }}>
          Ev<span style={{ color: C.green }}>.CRM</span> — Checking session...
        </div>
        <style>{`@keyframes evcrm-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <>
      <Sidebar open={open} onClose={() => setOpen(false)} user={user} onLogout={handleLogout} />
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <TopBar sidebarOpen={open} onToggle={() => setOpen(o => !o)} title={title} user={user} onLogout={handleLogout} />
        <main style={{ flex:1, padding:"24px 28px", minWidth:0 }}>
          {children}
        </main>
      </div>
      <FloatingMR />
    </>
  )
}

// ── Floating Market Research pill ────────────────────────────────
function FloatingMR() {
  const router   = useRouter()
  const pathname = usePathname()
  const [hovered, setHovered] = useState(false)
  if (pathname === "/market-research") return null
  return (
    <button
      onClick={() => router.push("/market-research")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:"fixed", bottom:28, right:28,
        background: hovered ? `linear-gradient(135deg, ${C.greenD}, #00A86B)` : `linear-gradient(135deg, ${C.greenD}, ${C.green})`,
        color:"#fff", border:"none",
        borderRadius: hovered ? 16 : 28,
        padding: hovered ? "11px 20px 11px 14px" : "13px 16px",
        cursor:"pointer", fontFamily:"inherit",
        display:"flex", alignItems:"center", gap:9,
        boxShadow: hovered ? `0 8px 32px ${C.green}60, 0 2px 8px rgba(0,0,0,0.15)` : `0 4px 20px ${C.green}50`,
        transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "translateY(-2px) scale(1.03)" : "translateY(0) scale(1)",
        zIndex:999, whiteSpace:"nowrap", overflow:"hidden",
        maxWidth: hovered ? 220 : 50,
      }}
    >
      <span style={{ fontSize:20, flexShrink:0 }}>🔍</span>
      {hovered && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
          <span style={{ fontSize:12, fontWeight:800, lineHeight:1.2 }}>Market Research</span>
          <span style={{ fontSize:9.5, opacity:0.8, lineHeight:1.2 }}>Research · Compare · Pitch</span>
        </div>
      )}
    </button>
  )
}
