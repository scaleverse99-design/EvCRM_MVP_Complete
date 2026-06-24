"use client"
import { useState, useRef } from "react"
import { C, fmt } from "../../lib/constants"

// ── Avatar ────────────────────────────────────────────────────────────
export function Avatar({ name="?", size=36, color=C.green, status }) {
  const initials = fmt.ini(name)
  const dotColor = status==="available" ? C.green : status==="busy" ? C.yellow : C.ink3
  return (
    <div style={{ position:"relative", flexShrink:0, width:size, height:size }}>
      <div style={{
        width:size, height:size, borderRadius:"50%",
        background:`${color}20`, border:`1.5px solid ${color}50`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:size*0.33, fontWeight:800, color, letterSpacing:"-0.5px",
        fontFamily:"inherit"
      }}>{initials}</div>
      {status && (
        <div style={{
          position:"absolute", bottom:0, right:0,
          width:size*0.28, height:size*0.28, borderRadius:"50%",
          background:dotColor, border:`1.5px solid #fff`
        }}/>
      )}
    </div>
  )
}

// ── Badge / Tag ───────────────────────────────────────────────────────
export function Tag({ label, color=C.green, bg, dot=false }) {
  return (
    <span style={{
      background: bg || `${color}15`,
      color, border:`1px solid ${color}30`,
      fontSize:9.5, fontWeight:700,
      padding:"2px 9px", borderRadius:20,
      display:"inline-flex", alignItems:"center", gap:4,
      whiteSpace:"nowrap", lineHeight:1.6
    }}>
      {dot && <span style={{ width:5, height:5, borderRadius:"50%", background:color, flexShrink:0 }}/>}
      {label}
    </span>
  )
}

// ── Status Pill ───────────────────────────────────────────────────────
export function StatusPill({ status }) {
  const map = {
    HOT:    { color:"#EF4444", bg:"#FEE2E2" },
    WARM:   { color:"#EAB308", bg:"#FEF9C3" },
    NEW:    { color:"#3B82F6", bg:"#DBEAFE" },
    COLD:   { color:"#6B7280", bg:"#F3F4F6" },
    CLOSED: { color:"#059669", bg:"#D1FAE5" },
  }
  const s = map[status] || map.COLD
  return (
    <span style={{
      background:s.bg, color:s.color,
      fontSize:9.5, fontWeight:700,
      padding:"2px 9px", borderRadius:20, whiteSpace:"nowrap"
    }}>{status}</span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({ children, style={}, onClick, noPad=false }) {
  const base = {
    background:C.card,
    border:`1px solid ${C.border}`,
    borderRadius:14,
    padding: noPad ? 0 : "16px 18px",
    boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
    overflow:"hidden",
    ...style,
  }
  if (onClick) {
    return (
      <div onClick={onClick} style={{ ...base, cursor:"pointer", transition:"box-shadow 0.15s, transform 0.15s" }}
        onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)"; e.currentTarget.style.transform="translateY(-1px)" }}
        onMouseLeave={e=>{ e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.05)"; e.currentTarget.style.transform="translateY(0)" }}
      >{children}</div>
    )
  }
  return <div style={base}>{children}</div>
}

// ── Progress Bar ──────────────────────────────────────────────────────
export function ProgressBar({ pct=0, color=C.green, height=6 }) {
  return (
    <div style={{ background:C.bg, borderRadius:6, height, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,Math.max(0,pct))}%`, height:"100%", background:color, borderRadius:6, transition:"width 0.4s ease" }}/>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────
export function Toggle({ on, onChange, color=C.green }) {
  return (
    <div onClick={onChange} style={{
      width:40, height:22, borderRadius:11, cursor:"pointer",
      background: on ? color : C.borderD,
      position:"relative", transition:"background 0.2s", flexShrink:0
    }}>
      <div style={{
        position:"absolute", top:3, left: on ? 20 : 3,
        width:16, height:16, borderRadius:"50%",
        background:"#fff", transition:"left 0.2s",
        boxShadow:"0 1px 4px rgba(0,0,0,0.2)"
      }}/>
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant="primary", color, disabled, loading, style:extra={} }) {
  const variants = {
    primary:   { background: color||C.green, color:"#fff", border:"none",                    boxShadow:`0 2px 8px ${color||C.green}40` },
    secondary: { background: C.bg,           color: C.ink2, border:`1px solid ${C.border}`,  boxShadow:"none" },
    danger:    { background: "#FEE2E2",       color: C.red,  border:`1px solid #EF444430`,    boxShadow:"none" },
    ghost:     { background:"none",           color: C.ink3, border:"none",                   boxShadow:"none" },
  }
  const v = variants[variant] || variants.primary
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{
      ...v, borderRadius:10, padding:"9px 18px",
      fontSize:12, fontWeight:700, cursor: disabled||loading ? "not-allowed" : "pointer",
      fontFamily:"inherit", transition:"all 0.15s", opacity: disabled||loading ? 0.6 : 1,
      display:"flex", alignItems:"center", justifyContent:"center", gap:7,
      ...extra
    }}
      onMouseEnter={e=>{ if(!disabled&&!loading) e.currentTarget.style.opacity="0.88" }}
      onMouseLeave={e=>{ e.currentTarget.style.opacity="1" }}
    >
      {loading ? <Spinner size={14} color={variant==="primary"?"#fff":C.green}/> : children}
    </button>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────
export function Spinner({ size=20, color=C.green }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      border:`2px solid ${color}30`, borderTopColor:color,
      animation:"evcrm-spin 0.7s linear infinite", flexShrink:0
    }}/>
  )
}

// ── Input ─────────────────────────────────────────────────────────────
export function Input({ label, type="text", placeholder, value, onChange, error, hint, icon, maxLength, name, autoComplete }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:16 }}>
      {label && (
        <label style={{
          display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.4px",
          color: error ? C.red : focused ? C.green : C.ink3,
          marginBottom:6, transition:"color 0.15s"
        }}>{label}</label>
      )}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, opacity:0.5 }}>{icon}</span>}
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder} maxLength={maxLength}
          name={name} autoComplete={autoComplete}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{
            width:"100%", background:C.card,
            border:`1.5px solid ${error ? C.red : focused ? C.green : C.border}`,
            borderRadius:10, color:C.ink, fontSize:13,
            padding:`10px ${icon?"38px":"13px"} 10px 13px`,
            paddingLeft: icon ? 38 : 13,
            outline:"none", transition:"border-color 0.15s, box-shadow 0.15s",
            boxSizing:"border-box", fontFamily:"inherit",
            boxShadow: focused ? `0 0 0 3px ${error?C.red:C.green}15` : "none"
          }}
        />
      </div>
      {(error||hint) && <div style={{ fontSize:10.5, marginTop:5, color: error ? C.red : C.ink3 }}>{error||hint}</div>}
    </div>
  )
}

// ── OTP Input ─────────────────────────────────────────────────────────
export function OTPInput({ value, onChange, length=6, error }) {
  const refs = useRef([])
  const digits = value.split("").concat(Array(length).fill("")).slice(0,length)

  const handleChange = (i, v) => {
    const d = v.replace(/\D/g,"").slice(-1)
    const next = digits.map((x,idx)=>idx===i?d:x).join("")
    onChange(next)
    if (d && i < length-1) refs.current[i+1]?.focus()
  }
  const handleKey = (i, e) => {
    if (e.key==="Backspace" && !digits[i] && i>0) {
      refs.current[i-1]?.focus()
      onChange(digits.map((x,idx)=>idx===i-1?"":x).join(""))
    }
  }

  return (
    <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
      {digits.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e=>handleChange(i,e.target.value)}
          onKeyDown={e=>handleKey(i,e)}
          style={{
            width:46, height:52, borderRadius:10, textAlign:"center",
            border:`2px solid ${error?C.red:d?C.green:C.border}`,
            background: d ? C.greenL : C.card,
            color:C.ink, fontSize:22, fontWeight:800, outline:"none",
            transition:"all 0.15s", fontFamily:"inherit",
            boxShadow: d ? `0 0 0 3px ${C.green}15` : "none"
          }}
        />
      ))}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────
export function Modal({ title, children, onClose, width=440 }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:999, backdropFilter:"blur(4px)",
      animation:"evcrm-fade 0.15s ease both"
    }} onClick={onClose}>
      <div style={{
        background:C.card, borderRadius:20, padding:28,
        width, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
        animation:"evcrm-pop 0.2s ease both"
      }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:800, color:C.ink }}>{title}</div>
          <button onClick={onClose} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, color:C.ink3, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────
export function Toast({ message }) {
  if (!message) return null
  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background:C.ink, color:"#fff", fontSize:12, fontWeight:700,
      padding:"10px 20px", borderRadius:24, zIndex:9999,
      boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap",
      animation:"evcrm-pop 0.2s ease both"
    }}>{message}</div>
  )
}

// ── Live Dot ──────────────────────────────────────────────────────────
export function LiveBadge() {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      background:C.greenL, color:C.greenD,
      fontSize:9.5, fontWeight:700, padding:"3px 9px",
      borderRadius:20, border:`1px solid ${C.green}30`
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:C.green, animation:"evcrm-pulse 1.5s infinite" }}/>
      LIVE
    </span>
  )
}

// ── Section Heading ───────────────────────────────────────────────────
export function SectionHeading({ children, action, actionLabel }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{children}</div>
      {action && (
        <button onClick={action} style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:8, padding:"4px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{actionLabel}</button>
      )}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub, btnLabel, onBtn }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px" }}>
      <div style={{ fontSize:44, marginBottom:14 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:6 }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:C.ink3, marginBottom:18 }}>{sub}</div>}
      {onBtn && <Btn onClick={onBtn}>{btnLabel}</Btn>}
    </div>
  )
}
// ── Slider ────────────────────────────────────────────────────────────
export function Slider({ label, min=0, max=100, step=1, value, onChange, unit="" }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>{label}</label>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.greenD }}>{value}{unit}</div>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.green, cursor: "pointer" }}
      />
    </div>
  )
}

// ── Tool Modal Wrapper ──────────────────────────────────────────────
export function ToolModal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#fff", zIndex: 3000, 
      display: "flex", flexDirection: "column",
      animation: "evcrm-slide-up 0.3s ease-out"
    }}>
      <header style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
           <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer" }}>✕</button>
           <h2 style={{ fontSize: 18, fontWeight: 900 }}>{title}</h2>
        </div>
        <Btn variant="secondary" onClick={onClose}>Close</Btn>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {children}
        </div>
      </div>
    </div>
  )
}
