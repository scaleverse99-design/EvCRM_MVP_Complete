"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// ── Tokens ────────────────────────────────────────────────────────
const G   = "#059669", GD = "#065F46", GL = "#D1FAE5"
const INK = "#111827", I2 = "#374151", I3 = "#6B7280"
const BG  = "#F9FAFB", BD = "#E5E7EB"
const RED = "#EF4444", ORG = "#F97316"

// ── Primitives ────────────────────────────────────────────────────
function Field({ label, type="text", placeholder, value, onChange, error, icon, maxLength, autoComplete, disabled }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.4px", marginBottom:6, color:error?RED:focused?G:I3, transition:"color 0.15s" }}>{label}</label>}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.45, pointerEvents:"none" }}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          maxLength={maxLength} autoComplete={autoComplete} disabled={disabled}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ width:"100%", background:disabled?BG:"#fff", border:`1.5px solid ${error?RED:focused?G:BD}`, borderRadius:10, color:INK, fontSize:13, padding:`11px 14px 11px ${icon?"40px":"14px"}`, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s, box-shadow 0.15s", boxShadow:focused?`0 0 0 3px ${error?RED:G}15`:"none", cursor:disabled?"not-allowed":"text" }}
        />
      </div>
      {error && <p style={{ fontSize:10.5, marginTop:5, color:RED, lineHeight:1.4 }}>{error}</p>}
    </div>
  )
}

function OTPBoxes({ value, onChange, error, disabled }) {
  const refs  = useRef([])
  const chars = (value+"").split("").concat(Array(6).fill("")).slice(0,6)

  const set = (i, v) => {
    if (disabled) return
    const d   = v.replace(/\D/g,"").slice(-1)
    const arr = chars.map((x,idx)=>idx===i?d:x)
    onChange(arr.join("").replace(/\s/g,""))
    if (d && i<5) refs.current[i+1]?.focus()
  }
  const onKey = (i, e) => {
    if (disabled) return
    if (e.key==="Backspace" && !chars[i] && i>0) {
      refs.current[i-1]?.focus()
      const arr = chars.map((x,idx)=>idx===i-1?"":x)
      onChange(arr.join("").trimEnd())
    }
  }

  return (
    <div style={{ display:"flex", gap:9, justifyContent:"center" }}>
      {chars.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el} type="text" inputMode="numeric"
          maxLength={1} value={d||""} disabled={disabled}
          onChange={e=>set(i,e.target.value)} onKeyDown={e=>onKey(i,e)}
          style={{ width:46, height:52, borderRadius:10, textAlign:"center", border:`2px solid ${error?RED:d?G:BD}`, background:d?GL:disabled?BG:"#fff", color:INK, fontSize:22, fontWeight:800, outline:"none", transition:"all 0.15s", fontFamily:"inherit", boxShadow:d?`0 0 0 3px ${G}12`:"none", cursor:disabled?"not-allowed":"text" }}
        />
      ))}
    </div>
  )
}

function PBtn({ children, onClick, loading, disabled, color=G }) {
  const off = disabled||loading
  return (
    <button onClick={onClick} disabled={off}
      style={{ width:"100%", background:off?"#E5E7EB":color, border:"none", color:off?I3:"#fff", borderRadius:10, padding:"13px", fontSize:13, fontWeight:700, cursor:off?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.15s", boxShadow:off?"none":`0 3px 14px ${color}38`, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
      onMouseEnter={e=>{ if(!off) e.currentTarget.style.opacity=".87" }}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}
    >
      {loading
        ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(0,0,0,0.15)", borderTopColor:"rgba(0,0,0,0.5)", animation:"evcrm-spin .7s linear infinite" }}/>
        : children}
    </button>
  )
}

function Alert({ type="error", msg, onClose }) {
  if (!msg) return null
  const cfg = {
    error:   { bg:"#FEF2F2", bd:RED,     c:"#991B1B", icon:"⚠️" },
    success: { bg:GL,        bd:G,        c:GD,        icon:"✓"  },
    info:    { bg:"#EFF6FF",  bd:"#3B82F6",c:"#1D4ED8", icon:"ℹ️" },
  }[type]||{}
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.bd}30`, borderRadius:10, padding:"10px 14px", marginBottom:16, display:"flex", gap:10, alignItems:"flex-start" }}>
      <span style={{ fontSize:14, flexShrink:0 }}>{cfg.icon}</span>
      <p style={{ fontSize:11.5, color:cfg.c, flex:1, lineHeight:1.5, margin:0 }}>{msg}</p>
      {onClose && <button onClick={onClose} style={{ background:"none", border:"none", color:cfg.c, cursor:"pointer", fontSize:14, flexShrink:0, opacity:0.7 }}>✕</button>}
    </div>
  )
}

// ── API helpers ───────────────────────────────────────────────────
async function api(path, body) {
  const res  = await fetch(path, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) })
  const data = await res.json()
  return { ok:res.ok, status:res.status, data }
}

// ── Success screen ─────────────────────────────────────────────────
function SuccessScreen({ role, name }) {
  const router = useRouter()
  const dest   = role==="dealer" ? "/dealer" : "/queue"
  const color  = role==="dealer" ? G : ORG
  const [pct,  setPct]  = useState(0)

  useEffect(()=>{
    const t = setInterval(()=>{
      setPct(p=>{ if(p>=100){ router.push(dest); clearInterval(t); return 100 } return p+3 })
    }, 45)
    return ()=>clearInterval(t)
  }, [])

  return (
    <div style={{ textAlign:"center", padding:"10px 0" }}>
      <div style={{ width:60, height:60, borderRadius:"50%", background:`${color}18`, border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 14px" }}>
        {role==="dealer"?"🏪":"⚡"}
      </div>
      <p style={{ fontSize:18, fontWeight:800, color:INK, marginBottom:4 }}>Welcome{name ? `, ${name.split(" ")[0]}` : ""}!</p>
      <p style={{ fontSize:12, color:I3, marginBottom:20 }}>Loading your {role==="dealer"?"dashboard":"queue"}...</p>
      <div style={{ background:BD, borderRadius:6, height:4, overflow:"hidden" }}>
        <div style={{ height:"100%", background:color, borderRadius:6, width:`${pct}%`, transition:"width 0.05s linear" }}/>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  MAIN LOGIN PAGE
//  Screens: login | forgot-email | forgot-otp | forgot-reset
// ════════════════════════════════════════════════════════════════
export default function LoginPage() {
  const router = useRouter()

  // Check if already logged in
  useEffect(()=>{
    fetch("/api/auth/me").then(r=>r.json()).then(d=>{
      if (d.success) router.push(d.user.role==="dealer"?"/dealer":"/queue")
    }).catch(()=>{})
  }, [])

  // ── State ─────────────────────────────────────────────────────
  const [role,    setRole]    = useState("dealer")
  const [screen,  setScreen]  = useState("login")   // login | forgot-email | forgot-otp | forgot-reset | success

  // Login form
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loginErr, setLoginErr] = useState("")
  const [logging,  setLogging]  = useState(false)
  const [loggedUser, setLoggedUser] = useState(null)

  // Forgot password flow
  const [fpEmail,   setFpEmail]   = useState("")
  const [fpOTP,     setFpOTP]     = useState("")
  const [fpNew,     setFpNew]     = useState("")
  const [fpConfirm, setFpConfirm] = useState("")
  const [fpMsg,     setFpMsg]     = useState({ type:"", text:"" })
  const [fpLoad,    setFpLoad]    = useState(false)
  const [fpErrors,  setFpErrors]  = useState({})
  const [cd,        setCd]        = useState(60)
  const [verified,  setVerified]  = useState(false)

  useEffect(()=>{
    if (screen==="forgot-otp" && cd>0) {
      const t = setTimeout(()=>setCd(c=>c-1), 1000)
      return ()=>clearTimeout(t)
    }
  }, [cd, screen])

  const activeColor = role==="dealer" ? G : ORG
  const ROLES = [
    { id:"dealer", icon:"🏪", label:"Dealer Owner", sub:"Admin access",  color:G   },
    { id:"rep",    icon:"⚡", label:"Sales Rep",    sub:"Team access",    color:ORG },
  ]

  // ── Login handler ─────────────────────────────────────────────
  const handleLogin = async () => {
    setLoginErr("")
    if (!email.trim()) { setLoginErr("Email is required"); return }
    if (!password)     { setLoginErr("Password is required"); return }

    setLogging(true)
    const { ok, data } = await api("/api/auth/login", { email:email.trim(), password })
    setLogging(false)

    if (!ok) {
      setLoginErr(data.error || "Login failed")
      return
    }

    setLoggedUser(data.user)

    // Verify role matches selected tab
    if (data.user.role !== role) {
      setLoginErr(`This account is a ${data.user.role} account. Please select the correct role tab.`)
      await fetch("/api/auth/logout", { method:"POST" })
      return
    }

    setScreen("success")
  }

  // ── Forgot password: step 1 — send OTP ───────────────────────
  const handleSendOTP = async () => {
    setFpErrors({})
    const emailClean = fpEmail.trim()
    if (!emailClean || !/\S+@\S+\.\S+/.test(emailClean)) {
      setFpErrors({ email:"Enter a valid email address" })
      return
    }
    setFpLoad(true)
    const { data } = await api("/api/auth/request-otp", { email:emailClean })
    setFpLoad(false)
    // Always show same message (prevent email enumeration)
    setFpMsg({ type:"info", text:"If this email is registered, an OTP has been sent. Check your inbox." })
    setScreen("forgot-otp")
    setCd(60)
  }

  // ── Forgot password: step 2 — verify OTP ─────────────────────
  const handleVerifyOTP = async () => {
    setFpMsg({})
    if (fpOTP.length !== 6) return

    setFpLoad(true)
    const { ok, data } = await api("/api/auth/verify-otp", { email:fpEmail.trim(), otp:fpOTP })
    setFpLoad(false)

    if (!ok) {
      setFpMsg({ type:"error", text:data.error||"Incorrect OTP" })
      setFpOTP("")
      return
    }

    setVerified(true)
    setFpMsg({ type:"success", text:"OTP verified! Set your new password below." })
    setScreen("forgot-reset")
  }

  // ── Forgot password: step 3 — reset password ──────────────────
  const handleResetPassword = async () => {
    setFpErrors({})
    const e = {}
    if (fpNew.length < 8)       e.password = "Password must be at least 8 characters"
    if (fpNew !== fpConfirm)    e.confirm  = "Passwords do not match"
    if (!/[A-Z]/.test(fpNew))  e.password = (e.password||"") + " Include an uppercase letter."
    if (!/\d/.test(fpNew))     e.password = (e.password||"") + " Include a number."
    if (Object.keys(e).length) { setFpErrors(e); return }

    setFpLoad(true)
    const { ok, data } = await api("/api/auth/reset-password", {
      email:           fpEmail.trim(),
      newPassword:     fpNew,
      confirmPassword: fpConfirm,
    })
    setFpLoad(false)

    if (!ok) {
      setFpMsg({ type:"error", text:data.error||"Reset failed" })
      return
    }

    setFpMsg({ type:"success", text:"Password reset successfully! Redirecting to login..." })
    setTimeout(()=>{
      setScreen("login"); setFpEmail(""); setFpOTP(""); setFpNew(""); setFpConfirm(""); setVerified(false)
    }, 2000)
  }

  return (
    <div style={{ minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)", width:"100%", maxWidth:420, padding:"36px 40px", border:`1px solid ${BD}` }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:38, height:38, borderRadius:9, background:`${G}18`, border:`1.5px solid ${G}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>⚡</div>
            <span style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:900, color:INK, letterSpacing:"-0.5px" }}>
              Ev<span style={{ color:G }}>.CRM</span>
            </span>
          </div>
          <p style={{ fontSize:11, color:I3 }}>India's EV Dealer Sales OS</p>
        </div>

        {/* ── SUCCESS ── */}
        {screen==="success" && loggedUser && (
          <SuccessScreen role={loggedUser.role} name={loggedUser.name} />
        )}

        {/* ── MAIN LOGIN ── */}
        {screen==="login" && (
          <>
            {/* Role tabs */}
            <div style={{ display:"flex", gap:8, marginBottom:24 }}>
              {ROLES.map(r=>(
                <button key={r.id} onClick={()=>{ setRole(r.id); setLoginErr("") }} style={{ flex:1, background:role===r.id?`${r.color}10`:"transparent", border:`1.5px solid ${role===r.id?r.color:BD}`, borderRadius:12, padding:"10px 8px", cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit", boxShadow:role===r.id?`0 0 0 3px ${r.color}12`:"none" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{r.icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:role===r.id?r.color:INK }}>{r.label}</div>
                  <div style={{ fontSize:9.5, color:I3, marginTop:2 }}>{r.sub}</div>
                </button>
              ))}
            </div>

            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:18, fontWeight:800, color:INK, marginBottom:4 }}>
                {role==="dealer" ? "Dealer Sign In" : "Sales Rep Sign In"}
              </h1>
              <p style={{ fontSize:12, color:I3 }}>Enter your registered email and password</p>
            </div>

            {loginErr && <Alert type="error" msg={loginErr} onClose={()=>setLoginErr("")} />}

            <Field label="EMAIL ADDRESS" type="email" placeholder="yourname@gmail.com" icon="✉️"
              value={email} autoComplete="email"
              onChange={e=>{ setEmail(e.target.value); setLoginErr("") }}
            />
            <Field label="PASSWORD" type="password" placeholder="Your password" icon="🔒"
              value={password} autoComplete="current-password"
              onChange={e=>{ setPassword(e.target.value); setLoginErr("") }}
            />

            <PBtn onClick={handleLogin} loading={logging} color={activeColor}>Sign In →</PBtn>

            <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:I3 }}>
              <button onClick={()=>{ setScreen("forgot-email"); setFpEmail(email); setFpMsg({}); setFpErrors({}) }} style={{ background:"none", border:"none", color:activeColor, fontSize:12, cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>
                Forgot password?
              </button>
            </p>
          </>
        )}

        {/* ── FORGOT: STEP 1 — email ── */}
        {screen==="forgot-email" && (
          <>
            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:18, fontWeight:800, color:INK, marginBottom:4 }}>Reset Password</h1>
              <p style={{ fontSize:12, color:I3 }}>Enter your registered email — we'll send a 6-digit OTP</p>
            </div>

            <Alert type={fpMsg.type} msg={fpMsg.text} onClose={()=>setFpMsg({})} />

            <Field label="REGISTERED EMAIL" type="email" placeholder="yourname@gmail.com" icon="✉️"
              value={fpEmail} autoComplete="email"
              onChange={e=>{ setFpEmail(e.target.value); setFpErrors({}) }}
              error={fpErrors.email}
            />

            <PBtn onClick={handleSendOTP} loading={fpLoad} disabled={!fpEmail.trim()}>
              Send OTP →
            </PBtn>
            <p style={{ textAlign:"center", marginTop:12, fontSize:12, color:I3 }}>
              <button onClick={()=>setScreen("login")} style={{ background:"none", border:"none", color:I3, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>← Back to login</button>
            </p>
          </>
        )}

        {/* ── FORGOT: STEP 2 — verify OTP ── */}
        {screen==="forgot-otp" && (
          <>
            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:18, fontWeight:800, color:INK, marginBottom:4 }}>Enter OTP</h1>
              <p style={{ fontSize:12, color:I3 }}>6-digit code sent to <strong>{fpEmail}</strong></p>
            </div>

            <Alert type={fpMsg.type} msg={fpMsg.text} onClose={()=>setFpMsg({})} />

            <p style={{ fontSize:11, fontWeight:700, color:I3, textAlign:"center", marginBottom:14, letterSpacing:"0.5px" }}>ENTER 6-DIGIT OTP</p>
            <OTPBoxes value={fpOTP} onChange={v=>{setFpOTP(v);setFpMsg({})}} error={fpMsg.type==="error"} disabled={fpLoad} />

            <div style={{ height:16 }}/>
            <PBtn onClick={handleVerifyOTP} loading={fpLoad} disabled={fpOTP.length!==6}>
              Verify OTP →
            </PBtn>

            <div style={{ display:"flex", justifyContent:"space-between", marginTop:14, fontSize:12 }}>
              <button onClick={()=>setScreen("forgot-email")} style={{ background:"none", border:"none", color:I3, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>← Change email</button>
              <span style={{ color:I3 }}>
                {cd > 0
                  ? <>Resend in <strong style={{ color:G }}>{cd}s</strong></>
                  : <button onClick={()=>{ setFpOTP(""); setFpMsg({}); handleSendOTP() }} style={{ background:"none", border:"none", color:G, fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Resend OTP</button>}
              </span>
            </div>

            <div style={{ marginTop:14, background:BG, border:`1px solid ${BD}`, borderRadius:10, padding:"9px 14px" }}>
              <p style={{ fontSize:11, color:I3, lineHeight:1.6, margin:0 }}>📧 Check your inbox and spam. OTP expires in 15 minutes.</p>
            </div>
          </>
        )}

        {/* ── FORGOT: STEP 3 — new password ── */}
        {screen==="forgot-reset" && (
          <>
            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:18, fontWeight:800, color:INK, marginBottom:4 }}>Set New Password</h1>
              <p style={{ fontSize:12, color:I3 }}>Choose a strong password for {fpEmail}</p>
            </div>

            <Alert type={fpMsg.type} msg={fpMsg.text} onClose={()=>setFpMsg({})} />

            <Field label="NEW PASSWORD" type="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" icon="🔒"
              value={fpNew} autoComplete="new-password"
              onChange={e=>{ setFpNew(e.target.value); setFpErrors({}) }}
              error={fpErrors.password}
            />
            <Field label="CONFIRM PASSWORD" type="password" placeholder="Repeat new password" icon="🔒"
              value={fpConfirm} autoComplete="new-password"
              onChange={e=>{ setFpConfirm(e.target.value); setFpErrors({}) }}
              error={fpErrors.confirm}
            />

            <PBtn onClick={handleResetPassword} loading={fpLoad} disabled={!fpNew||!fpConfirm}>
              Reset Password →
            </PBtn>
          </>
        )}

        {/* Footer */}
        {!["success"].includes(screen) && (
          <div style={{ marginTop:28, paddingTop:18, borderTop:`1px solid ${BD}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:10, color:I3 }}>© 2026 Ev.CRM</span>
            <div style={{ display:"flex", gap:12 }}>
              {["Privacy","Terms","Support"].map(l=>(
                <button key={l} style={{ background:"none", border:"none", color:I3, fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
