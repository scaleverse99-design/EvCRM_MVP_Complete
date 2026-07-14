"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { saveToken } from "../../lib/token-storage"
import { C } from "../../lib/constants"
import Link from "next/link"

const RED = C.red;
const ACCENT = C.accent;

// ── Field ─────────────────────────────────────────────────────────
function Field({ label, type="text", placeholder, value, onChange, error, icon, hint, autoComplete }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:"block", fontSize:11, fontWeight:800, letterSpacing:"0.6px", marginBottom:6, color:error?RED:focused?ACCENT:C.ink3, transition:"color 0.15s", textTransform:"uppercase" }}>{label}</label>}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.4, pointerEvents:"none", color:C.ink }}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ width:"100%", background:"#fff", border:`1.5px solid ${error?RED:focused?ACCENT:C.border}`, borderRadius:12, color:C.ink, fontSize:13, padding:`12px 14px 12px ${icon?"42px":"14px"}`, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"all 0.15s", boxShadow:focused?`0 0 16px ${ACCENT}15`:"none" }}
        />
      </div>
      {error && <p style={{ fontSize:10.5, marginTop:5, color:RED }}>{error}</p>}
      {hint && !error && <p style={{ fontSize:10.5, marginTop:5, color:C.ink3 }}>{hint}</p>}
    </div>
  )
}

// ── OTP boxes ─────────────────────────────────────────────────────
function OTPBoxes({ value, onChange, error, disabled }) {
  const refs = useRef([])
  const chars = [...(value||"").split(""), ...Array(6).fill("")].slice(0,6)

  const set = (i, v) => {
    if (disabled) return
    const d = v.replace(/\D/g,"").slice(-1)
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
          style={{ width:46, height:56, borderRadius:12, textAlign:"center", border:`1.5px solid ${error?RED:d?ACCENT:C.border}`, background:d?`${ACCENT}10`:"#fff", color:C.ink, fontSize:24, fontWeight:900, outline:"none", transition:"all 0.15s", fontFamily:"inherit", boxShadow:d?`0 0 16px ${ACCENT}15`:"none", cursor:disabled?"not-allowed":"text" }}
        />
      ))}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────
function PBtn({ children, onClick, loading, disabled, color=ACCENT, type="submit" }) {
  const off = disabled||loading
  return (
    <button type={type} onClick={onClick} disabled={off}
      style={{ width:"100%", background:off?C.bg:color, border:"none", color:"#fff", borderRadius:12, padding:"14px", fontSize:13, fontWeight:900, cursor:off?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow:off?"none":`0 4px 16px ${color}33`, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
      onMouseEnter={e=>{ if(!off) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.opacity="0.9" } }}
      onMouseLeave={e=>{ if(!off) { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.opacity="1" } }}
    >
      {loading ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", animation:"evcrm-spin .7s linear infinite" }}/> : children}
    </button>
  )
}

// ── Alert ─────────────────────────────────────────────────────────
function Alert({ type="error", msg, onClose }) {
  if (!msg) return null
  const cfg = {
    error:   { bg:"#FEF2F2", bc:RED,      c:"#B91C1C", icon:"⚠️" },
    success: { bg:"#F0FDF4", bc:ACCENT,   c:"#15803D", icon:"✓"  },
    info:    { bg:"#EFF6FF", bc:"#3B82F6", c:"#1D4ED8", icon:"ℹ️" },
  }[type]||{}
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.bc}30`, borderRadius:12, padding:"12px 16px", marginBottom:18, display:"flex", gap:10, alignItems:"flex-start" }}>
      <span style={{ fontSize:14, flexShrink:0 }}>{cfg.icon}</span>
      <p style={{ fontSize:11.5, color:cfg.c, flex:1, lineHeight:1.5, margin:0, fontWeight: 700 }}>{msg}</p>
      {onClose && <button onClick={onClose} style={{ background:"none", border:"none", color:cfg.c, cursor:"pointer", fontSize:14, opacity:.5, flexShrink:0 }}>✕</button>}
    </div>
  )
}

// ── Success screen ─────────────────────────────────────────────────
function SuccessScreen({ role, name }) {
  const router = useRouter()
  const dest   = (role==="superadmin"||role==="founder") ? "/admin" : (role==="oem" ? "/oem" : (role==="rep" ? "/queue" : "/dealer"))
  const [pct,  setPct] = useState(0)
  const [msg,  setMsg] = useState("Accessing Expert Environment...")

  useEffect(()=>{
    // Progress bar is purely cosmetic — keep it a PURE state updater with no
    // side effects (React double-invokes updaters in StrictMode and drops
    // side effects inside them, which previously stopped the redirect firing).
    const bar = setInterval(()=>{
      setPct(p => p >= 100 ? 100 : p + 2)
    }, 20)
    // Navigation is driven by its own timeout, decoupled from render state.
    // Full-page navigation (not router.replace) so the root AuthProvider
    // re-mounts and re-reads the freshly-saved token — a soft navigation
    // leaves the provider's user=null and Shell bounces back to /login (loop).
    const go = setTimeout(()=>{ window.location.assign(dest) }, 1100)
    return ()=>{ clearInterval(bar); clearTimeout(go) }
  }, [])

  return (
    <div style={{ textAlign:"center", padding:"20px 0" }}>
      <div style={{
        width:72, height:72, borderRadius: 20,
        background: ACCENT,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:32, color: "#fff", margin:"0 auto 20px",
        boxShadow: `0 10px 30px ${ACCENT}33`
      }}>
        {role==="dealer"?"🏪":role==="oem"?"🏭":"⚡"}
      </div>
      <p style={{ fontSize:22, fontWeight:900, color:C.ink, marginBottom:6, letterSpacing:"-0.5px" }}>Welcome Back{name?`, ${name.split(" ")[0]}`:""}!</p>
      <p style={{ fontSize:12, color:C.ink3, marginBottom:24 }}>{msg}</p>
      <div style={{ background:C.bg, borderRadius:10, height:6, overflow:"hidden" }}>
        <div style={{ height:"100%", background:ACCENT, borderRadius:10, width:`${pct}%`, transition:"width 0.04s linear" }}/>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  MAIN LOGIN PAGE
//  Screens: login → forgot-email → forgot-otp → forgot-reset
// ════════════════════════════════════════════════════════════════
export default function LoginPage() {
  const router = useRouter()

  // Check already logged in (Accelerated Pre-flight)
  useEffect(()=>{
    import("../../lib/token-storage").then(({ getToken, authFetch }) => {
      const token = getToken()
      if (!token) return

      authFetch("/api/auth/me").then(r=>r.json()).then(d=>{
        if (d.success) {
          const route = (d.user.role === "superadmin" || d.user.role === "founder") ? "/admin" : (d.user.role === "oem" ? "/oem" : (d.user.role === "rep" ? "/queue" : "/dealer"))
          window.location.assign(route) // full nav so AuthProvider re-reads the token
        }
      }).catch(()=>{})
    })
  }, [])

  const [screen,   setScreen]   = useState("login")
  const [role,     setRole]     = useState("dealer")
  const [loggedUser, setLoggedUser] = useState(null)

  // Login fields
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loginErr, setLoginErr] = useState("")
  const [logging,  setLogging]  = useState(false)

  // Forgot password fields
  const [fpEmail,   setFpEmail]   = useState("")
  const [fpOTP,     setFpOTP]     = useState("")
  const [fpNew,     setFpNew]     = useState("")
  const [fpConfirm, setFpConfirm] = useState("")
  const [fpMsg,     setFpMsg]     = useState({})
  const [fpLoad,    setFpLoad]    = useState(false)
  const [fpErrors,  setFpErrors]  = useState({})
  const [cd,        setCd]        = useState(60)

  useEffect(()=>{
    if (screen==="forgot-otp" && cd>0) {
      const t = setTimeout(()=>setCd(c=>c-1), 1000)
      return ()=>clearTimeout(t)
    }
  }, [cd, screen])

  const ROLES = [
    { id:"dealer",     icon:"🏪", label:"Dealer Owner", sub:"Admin access",   color:ACCENT },
    { id:"rep",        icon:"⚡", label:"Sales Rep",    sub:"Team access",    color:C.orange },
    { id:"oem",        icon:"🏭", label:"OEM",          sub:"Network access", color:"#8B5CF6" },
    { id:"superadmin", icon:"🔱", label:"Founder",      sub:"System access",  color:C.greenD  },
  ]
  const activeColor = role==="dealer" ? ACCENT : role==="rep" ? C.orange : role==="oem" ? "#8B5CF6" : C.greenD

  // ── Login ─────────────────────────────────────────────────────
  const handleLogin = async () => {
    setLoginErr("")
    // Chrome autofill often fills the inputs without firing React's onChange,
    // leaving the state empty — so fall back to the live DOM values.
    const emailVal = (email.trim() || document.querySelector('input[type=email]')?.value?.trim() || "")
    const passVal  = (password || document.querySelector('input[type=password]')?.value || "")
    if (!emailVal) { setLoginErr("Email is required"); return }
    if (!passVal)  { setLoginErr("Password is required"); return }

    setLogging(true)
    try {
      const res  = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:emailVal, password:passVal }) })
      const data = await res.json()

      if (!res.ok) { setLoginErr(data.error||"Invalid email or password"); return }

      // Save JWT to localStorage (Firebase Hosting strips Set-Cookie headers)
      if (data.token) saveToken(data.token)

      setLoggedUser(data.user)
      setScreen("success")
    } catch {
      setLoginErr("Network error. Please try again.")
    } finally {
      setLogging(false)
    }
  }

  // ── Forgot: Send OTP ──────────────────────────────────────────
  const handleSendOTP = async () => {
    setFpErrors({}); setFpMsg({})
    const emailClean = (fpEmail.trim() || document.querySelector('input[type=email]')?.value?.trim() || "")
    if (!emailClean || !/\S+@\S+\.\S+/.test(emailClean)) {
      setFpErrors({ email:"Enter a valid email address" }); return
    }
    setFpLoad(true)
    try {
      const res = await fetch("/api/auth/request-otp", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:emailClean }) })
      const data = await res.json()
      // If dev mode sent us the OTP back because the email provider domain is unverified, show it directly!
      if (data._dev_otp) {
        setFpMsg({ type:"info", text:`[MVP TEST] Since the email domain isn't fully verified yet, here is your OTP: ${data._dev_otp}` })
      } else {
        setFpMsg({ type:"info", text:"If this email is registered, an OTP has been sent. Check your inbox and spam folder." })
      }
      setScreen("forgot-otp")
      setCd(60)
    } catch {
      setFpMsg({ type:"error", text:"Failed to send OTP. Please try again." })
    } finally {
      setFpLoad(false) 
    }
  }

  // ── Forgot: Verify OTP ────────────────────────────────────────
  const handleVerifyOTP = async () => {
    setFpMsg({})
    const inputs = document.querySelectorAll('input[inputMode="numeric"]')
    let otpVal = ""
    inputs.forEach(i => { otpVal += i.value })
    const finalOtp = fpOTP.length === 6 ? fpOTP : otpVal
    if (finalOtp.length!==6) {
      setFpMsg({ type:"error", text:"Please enter the 6-digit OTP" })
      return
    }
    setFpLoad(true)
    try {
      const res  = await fetch("/api/auth/verify-otp", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:fpEmail.trim() || document.querySelector('input[type=email]')?.value?.trim() || "", otp:finalOtp }) })
      const data = await res.json()
      if (!res.ok) { setFpMsg({ type:"error", text:data.error||"Incorrect OTP. Please try again." }); setFpOTP(""); return }
      setFpMsg({ type:"success", text:"OTP verified! Set your new password." })
      setScreen("forgot-reset")
    } catch {
      setFpMsg({ type:"error", text:"Verification failed. Please try again." })
    } finally { setFpLoad(false) }
  }

  // ── Forgot: Reset password ────────────────────────────────────
  const handleReset = async () => {
    setFpErrors({})
    // Autofill fallback: read live DOM values if React state is empty.
    const pwInputs = document.querySelectorAll('input[type=password]')
    const newVal     = fpNew     || pwInputs[0]?.value || ""
    const confirmVal = fpConfirm || pwInputs[1]?.value || ""
    const e = {}
    if (newVal.length < 8)      e.password = "Minimum 8 characters"
    else if (!/[A-Z]/.test(newVal)) e.password = "Must include an uppercase letter"
    else if (!/\d/.test(newVal))    e.password = "Must include a number"
    if (newVal !== confirmVal)   e.confirm  = "Passwords do not match"
    if (Object.keys(e).length) { setFpErrors(e); return }

    setFpLoad(true)
    try {
      const res  = await fetch("/api/auth/reset-password", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:fpEmail.trim(), newPassword:newVal, confirmPassword:confirmVal }) })
      const data = await res.json()
      if (!res.ok) { setFpMsg({ type:"error", text:data.error||"Reset failed. Please try again." }); return }
      setFpMsg({ type:"success", text:"Password reset successfully! You can now sign in with your new password." })
      setTimeout(()=>{ setScreen("login"); setFpEmail(""); setFpOTP(""); setFpNew(""); setFpConfirm(""); setFpMsg({}) }, 2500)
    } catch {
      setFpMsg({ type:"error", text:"Reset failed. Please try again." })
    } finally { setFpLoad(false) }
  }

  const backToLogin = () => { setScreen("login"); setFpEmail(""); setFpOTP(""); setFpNew(""); setFpConfirm(""); setFpMsg({}); setFpErrors({}) }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", color: C.ink }}>
      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <div style={{ 
              width:40, height:40, borderRadius:10, 
              background: ACCENT, 
              display:"flex", alignItems:"center", justifyContent:"center", 
              fontSize:20, fontWeight:900, color:"#fff",
              boxShadow: `0 4px 12px ${ACCENT}33`
            }}>E</div>
            <span style={{ fontSize:28, fontWeight:900, color:C.ink, letterSpacing:"-0.8px" }}>EV<span style={{ color:ACCENT }}>.CRM</span></span>
          </div>
          <p style={{ fontSize:12, color:C.ink3, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>India's EV Sales OS & Commerce Hub</p>
        </div>

        <div style={{ background:"#fff", borderRadius:24, border:`1px solid ${C.border}`, padding:"40px", boxShadow: "0 12px 40px rgba(0,0,0,0.06)" }}>

          {/* ── SUCCESS ── */}
          {screen==="success" && loggedUser && <SuccessScreen role={loggedUser.role} name={loggedUser.name} />}

          {/* ── LOGIN ── */}
          {screen==="login" && (
            <form onSubmit={(e)=>{ e.preventDefault(); handleLogin() }}>
              {/* Role tabs */}
              <div style={{ display:"flex", gap:8, marginBottom:24 }}>
                {ROLES.map(r=>(
                  <button key={r.id} type="button" onClick={()=>{ setRole(r.id); setLoginErr("") }}
                    style={{ 
                      flex:1, background:role===r.id?`${r.color}10`:C.bg, 
                      border:`1.5px solid ${role===r.id?r.color:C.border}`, 
                      borderRadius:14, padding:"12px 8px", cursor:"pointer", transition:"all 0.2s", 
                      fontFamily:"inherit", boxShadow:role===r.id?`0 4px 12px ${r.color}15`:"none" 
                    }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{r.icon}</div>
                    <div style={{ fontSize:11, fontWeight:800, color:role===r.id?C.ink:C.ink3, textTransform:"uppercase", letterSpacing:"0.5px" }}>{r.label}</div>
                    <div style={{ fontSize:9.5, color:role===r.id?r.color:C.ink3, marginTop:2, fontWeight: 700 }}>{r.sub}</div>
                  </button>
                ))}
              </div>

              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:20, fontWeight:900, color:C.ink, marginBottom:6, letterSpacing:"-0.5px" }}>
                  {role==="dealer" ? "Dealer Sign In" : role==="rep" ? "Sales Rep Sign In" : role==="oem" ? "OEM Partner Sign In" : "Founder Sign In"}
                </h1>
                <p style={{ fontSize:13, color:C.ink3, lineHeight:1.5 }}>
                  {role==="dealer" ? "Access your dealer command centre" : role==="rep" ? "Access your AI sales queue" : role==="oem" ? "Access your dealer network console" : "Manage the platform and cloud oversight"}
                </p>
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

              <PBtn type="submit" loading={logging} color={activeColor}>
                Sign In →
              </PBtn>

              <div style={{ textAlign:"center", marginTop:18 }}>
                <button type="button" onClick={()=>{ setScreen("forgot-email"); setFpEmail(email); setFpMsg({}) }}
                  style={{ background:"none", border:"none", color:C.ink3, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight: 600 }}>
                  Forgot password?
                </button>
              </div>

              {role==="dealer" && (
                <div style={{ textAlign:"center", marginTop:12 }}>
                  <span style={{ fontSize:12, color:C.ink3 }}>New to Ev.CRM? </span>
                  <button type="button" onClick={()=>router.push("/register")}
                    style={{ background:"none", border:"none", color:ACCENT, fontSize:12, cursor:"pointer", fontWeight:800, fontFamily:"inherit" }}>
                    Create dealer account →
                  </button>
                </div>
              )}

              {role==="oem" && (
                <div style={{ textAlign:"center", marginTop:12 }}>
                  <span style={{ fontSize:12, color:C.ink3 }}>New OEM partner? </span>
                  <button type="button" onClick={()=>router.push("/oem/register")}
                    style={{ background:"none", border:"none", color:"#8B5CF6", fontSize:12, cursor:"pointer", fontWeight:800, fontFamily:"inherit" }}>
                    Register your network →
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ── FORGOT: STEP 1 — Enter email ── */}
          {screen==="forgot-email" && (
            <form onSubmit={(e)=>{ e.preventDefault(); handleSendOTP() }}>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:18, fontWeight:800, color:C.ink, marginBottom:4 }}>Reset Password</h1>
                <p style={{ fontSize:12, color:C.ink3 }}>Enter your registered email — we'll send a 6-digit OTP</p>
              </div>

              <Alert type={fpMsg.type} msg={fpMsg.text} onClose={()=>setFpMsg({})} />

              <Field label="REGISTERED EMAIL" type="email" placeholder="yourname@gmail.com" icon="✉️"
                value={fpEmail} autoComplete="email"
                onChange={e=>{ setFpEmail(e.target.value); setFpErrors({}) }}
                error={fpErrors.email}
              />

              <PBtn type="submit" loading={fpLoad}>
                Send OTP →
              </PBtn>

              <div style={{ textAlign:"center", marginTop:12 }}>
                <button type="button" onClick={backToLogin} style={{ background:"none", border:"none", color:C.ink3, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>← Back to sign in</button>
              </div>
            </form>
          )}

          {/* ── FORGOT: STEP 2 — Verify OTP ── */}
          {screen==="forgot-otp" && (
            <form onSubmit={(e)=>{ e.preventDefault(); handleVerifyOTP() }}>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:18, fontWeight:800, color:C.ink, marginBottom:4 }}>Enter OTP</h1>
                <p style={{ fontSize:12, color:C.ink3 }}>6-digit code sent to <strong>{fpEmail}</strong></p>
              </div>

              <Alert type={fpMsg.type} msg={fpMsg.text} onClose={()=>setFpMsg({})} />

              <p style={{ fontSize:11, fontWeight:700, color:C.ink3, textAlign:"center", marginBottom:14, letterSpacing:"0.5px" }}>ENTER 6-DIGIT OTP</p>
              <OTPBoxes value={fpOTP} onChange={v=>{setFpOTP(v);setFpMsg({})}} error={fpMsg.type==="error"} disabled={fpLoad} />
              <div style={{ height:16 }}/>

              <PBtn type="submit" loading={fpLoad}>
                Verify OTP →
              </PBtn>

              <div style={{ display:"flex", justifyContext:"space-between", alignItems:"center", marginTop:14, fontSize:12 }}>
                <button type="button" onClick={()=>setScreen("forgot-email")} style={{ background:"none", border:"none", color:C.ink3, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>← Change email</button>
                <span style={{ color:C.ink3 }}>
                  {cd>0 ? <>Resend in <strong style={{ color:ACCENT }}>{cd}s</strong></> :
                    <button type="button" onClick={()=>{ setFpOTP(""); setFpMsg({}); handleSendOTP() }} style={{ background:"none", border:"none", color:ACCENT, fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Resend OTP</button>}
                </span>
              </div>

              <div style={{ marginTop:14, background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 14px" }}>
                <p style={{ fontSize:11, color:C.ink3, lineHeight:1.6, margin:0 }}>📧 Check your inbox and spam folder. OTP expires in <strong>15 minutes</strong>.</p>
              </div>
            </form>
          )}

          {/* ── FORGOT: STEP 3 — New password ── */}
          {screen==="forgot-reset" && (
            <form onSubmit={(e)=>{ e.preventDefault(); handleReset() }}>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:18, fontWeight:800, color:C.ink, marginBottom:4 }}>Set New Password</h1>
                <p style={{ fontSize:12, color:C.ink3 }}>Choose a strong password for <strong>{fpEmail}</strong></p>
              </div>

              <Alert type={fpMsg.type} msg={fpMsg.text} onClose={()=>setFpMsg({})} />

              <Field label="NEW PASSWORD" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" icon="🔒"
                value={fpNew} autoComplete="new-password"
                onChange={e=>{ setFpNew(e.target.value); setFpErrors({}) }}
                error={fpErrors.password}
              />
              <Field label="CONFIRM PASSWORD" type="password" placeholder="Repeat new password" icon="🔒"
                value={fpConfirm} autoComplete="new-password"
                onChange={e=>{ setFpConfirm(e.target.value); setFpErrors({}) }}
                error={fpErrors.confirm}
              />

              <PBtn type="submit" loading={fpLoad}>
                Reset Password →
              </PBtn>
            </form>
          )}

          {/* Footer */}
          {!["success"].includes(screen) && (
            <div style={{ marginTop:32, paddingTop:20, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10, color:C.ink3, fontWeight: 700 }}>© 2026 EV.CRM</span>
              <div style={{ display:"flex", gap:14 }}>
                {["Privacy","Terms","Support"].map(l=>(
                  <button key={l} style={{ background:"none", border:"none", color:C.ink3, fontSize:10, cursor:"pointer", fontFamily:"inherit", fontWeight: 600 }}>{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
