"use client"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { C, NAV_ITEMS } from "../../lib/constants"
import { Avatar, LiveBadge } from "../ui"

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ open, onClose }) {
  const router   = useRouter()
  const pathname = usePathname()

  const navigate = (href) => {
    router.push(href)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div onClick={onClose} style={{
          position:"fixed", inset:0,
          background:"rgba(0,0,0,0.28)",
          zIndex:40, backdropFilter:"blur(2px)",
          animation:"evcrm-fade 0.15s ease both"
        }}/>
      )}

      {/* Drawer */}
      <aside style={{
        position:"fixed", top:0, left:0,
        width:248, height:"100vh",
        background:C.card, borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column",
        zIndex:50,
        boxShadow: open ? "6px 0 24px rgba(0,0,0,0.12)" : "none",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition:"transform 0.26s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:22, fontWeight:900, color:C.ink, lineHeight:1 }}>
              Ev<span style={{ color:C.green }}>.CRM</span>
            </div>
            <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>EV Dealer Sales OS</div>
          </div>
          <button onClick={onClose} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", color:C.ink3 }}>✕</button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"10px 10px", overflowY:"auto" }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <button key={item.href} onClick={()=>navigate(item.href)} style={{
                width:"100%", display:"flex", alignItems:"center",
                gap:12, padding:"10px 14px",
                borderRadius:10, border:"none", cursor:"pointer",
                background: isActive ? C.green : "transparent",
                color: isActive ? "#fff" : C.ink3,
                fontWeight: isActive ? 700 : 500,
                fontSize:13, marginBottom:2,
                transition:"background 0.12s, color 0.12s",
                textAlign:"left", fontFamily:"inherit"
              }}
                onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.background=C.bg; e.currentTarget.style.color=C.ink }}}
                onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.ink3 }}}
              >
                <span style={{ fontSize:17, flexShrink:0 }}>{item.icon}</span>
                <span style={{ flex:1 }}>{item.label}</span>
                {isActive && <span style={{ fontSize:12, opacity:0.7 }}>›</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:"14px 18px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
          <Avatar name="Dealer Admin" size={34} color={C.green} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:C.ink }}>Dealer Admin</div>
            <div style={{ fontSize:9.5, color:C.ink3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Sharma EV Motors</div>
          </div>
        </div>
      </aside>
    </>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────
function TopBar({ sidebarOpen, onToggle, title }) {
  return (
    <header style={{
      background:C.card, borderBottom:`1px solid ${C.border}`,
      padding:"0 24px", height:56, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      position:"sticky", top:0, zIndex:35,
      boxShadow:"0 1px 3px rgba(0,0,0,0.05)"
    }}>
      {/* Left */}
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={onToggle} title={sidebarOpen?"Close menu":"Open menu"} style={{
          background: sidebarOpen ? C.greenL : "transparent",
          border:`1px solid ${sidebarOpen ? C.green : "transparent"}`,
          borderRadius:8, width:34, height:34, cursor:"pointer",
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:4, padding:0, transition:"all 0.15s"
        }}>
          <Bar rot={sidebarOpen ? 45 : 0} trans={sidebarOpen ? "translate(0,5px)" : "none"} color={sidebarOpen?C.greenD:C.ink2} />
          <Bar opacity={sidebarOpen ? 0 : 1} color={sidebarOpen?C.greenD:C.ink2} />
          <Bar rot={sidebarOpen ? -45 : 0} trans={sidebarOpen ? "translate(0,-5px)" : "none"} color={sidebarOpen?C.greenD:C.ink2} />
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:17, fontWeight:900, color:C.ink }}>
            Ev<span style={{ color:C.green }}>.CRM</span>
          </span>
          {title && (
            <>
              <span style={{ color:C.borderD, fontSize:14 }}>›</span>
              <span style={{ fontSize:13, fontWeight:600, color:C.ink2 }}>{title}</span>
            </>
          )}
        </div>
      </div>

      {/* Right */}
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <LiveBadge />
        <button style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, width:36, height:36, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
          🔔
          <span style={{ position:"absolute", top:4, right:4, width:8, height:8, borderRadius:"50%", background:C.red, border:"1.5px solid #fff" }}/>
        </button>
        <span style={{ fontSize:11, color:C.ink3 }}>19 Mar 2026</span>
        <Avatar name="Dealer Admin" size={32} color={C.green} />
      </div>
    </header>
  )
}

function Bar({ rot=0, trans="none", opacity=1, color=C.ink2 }) {
  return <span style={{ display:"block", width:16, height:2, background:color, borderRadius:2, transition:"all 0.2s", transform:`rotate(${rot}deg) ${trans}`, opacity }}/>
}

// ── Shell ─────────────────────────────────────────────────────────────
export default function Shell({ children, title }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        html { font-size:16px; }
        body { font-family:'DM Sans','Segoe UI',system-ui,sans-serif; background:${C.bg}; color:${C.ink}; -webkit-font-smoothing:antialiased; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.borderD}; border-radius:4px; }
        button,input,textarea,select { font-family:inherit; }
        button:focus,input:focus,textarea:focus { outline:none; }
        a { text-decoration:none; color:inherit; }
        @keyframes evcrm-spin  { to { transform:rotate(360deg) } }
        @keyframes evcrm-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes evcrm-pop   { from { opacity:0; transform:scale(0.94) } to { opacity:1; transform:scale(1) } }
        @keyframes evcrm-up    { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes evcrm-pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        .evcrm-fade-up { animation: evcrm-up 0.4s ease both; }
        .evcrm-delay-1 { animation-delay:0.07s }
        .evcrm-delay-2 { animation-delay:0.14s }
        .evcrm-delay-3 { animation-delay:0.21s }
        .evcrm-delay-4 { animation-delay:0.28s }
        .row-hover:hover { background:${C.bg} !important; }
      `}</style>

      <Sidebar open={open} onClose={()=>setOpen(false)} />

      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <TopBar sidebarOpen={open} onToggle={()=>setOpen(o=>!o)} title={title} />
        <main style={{ flex:1, padding:"24px 28px", minWidth:0 }}>
          {children}
        </main>
      </div>

      {/* ── Floating Market Research Button ─────────────────────── */}
      <FloatingMR />
    </>
  )
}

// ── Floating Market Research pill ────────────────────────────────
function FloatingMR() {
  const router   = useRouter()
  const pathname = usePathname()
  const [hovered, setHovered] = useState(false)

  // Hide on the market-research page itself
  if (pathname === "/market-research") return null

  return (
    <button
      onClick={() => router.push("/market-research")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Open Market Research & Compare"
      style={{
        position: "fixed", bottom: 28, right: 28,
        background: hovered
          ? `linear-gradient(135deg, ${C.greenD}, #00A86B)`
          : `linear-gradient(135deg, ${C.greenD}, ${C.green})`,
        color: "#fff", border: "none",
        borderRadius: hovered ? 16 : 28,
        padding: hovered ? "11px 20px 11px 14px" : "13px 16px",
        cursor: "pointer", fontFamily: "inherit",
        display: "flex", alignItems: "center", gap: 9,
        boxShadow: hovered
          ? `0 8px 32px ${C.green}60, 0 2px 8px rgba(0,0,0,0.15)`
          : `0 4px 20px ${C.green}50, 0 2px 8px rgba(0,0,0,0.10)`,
        transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "translateY(-2px) scale(1.03)" : "translateY(0) scale(1)",
        zIndex: 999, whiteSpace: "nowrap",
        overflow: "hidden",
        maxWidth: hovered ? 220 : 50,
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>🔍</span>
      {hovered && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>Market Research</span>
          <span style={{ fontSize: 9.5, opacity: 0.8, lineHeight: 1.2 }}>Research · Compare · Pitch</span>
        </div>
      )}
    </button>
  )
}
