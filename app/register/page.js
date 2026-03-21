"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const G   = "#059669", GD = "#065F46", GL = "#D1FAE5"
const INK = "#111827", I2 = "#374151", I3 = "#6B7280"
const BG  = "#F9FAFB", BD = "#E5E7EB"
const RED = "#EF4444"

const CITIES   = ["Hyderabad","Bangalore","Chennai","Mumbai","Delhi","Pune","Ahmedabad","Kolkata","Jaipur","Lucknow","Coimbatore","Kochi","Visakhapatnam","Surat","Nagpur"]
const EV_BRANDS = ["Tata","Ather","Ola Electric","TVS","Bajaj","Hero","Okaya","Ampere","Revolt","Pure EV","Simple Energy","Ultraviolette"]

// ── Primitives ────────────────────────────────────────────────────
function Field({ label, type="text", placeholder, value, onChange, error, icon, hint, maxLength, required }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:16 }}>
      {label && (
        <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.4px", marginBottom:5, color:error?RED:focused?G:I3, transition:"color 0.15s" }}>
          {label}{required && <span style={{ color:RED }}> *</span>}
          {!required && <span style={{ color:I3, fontWeight:400, fontSize:10 }}> (optional)</span>}
        </label>
      )}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.4, pointerEvents:"none" }}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ width:"100%", background:"#fff", border:`1.5px solid ${error?RED:focused?G:BD}`, borderRadius:10, color:INK, fontSize:13, padding:`11px 14px 11px ${icon?"40px":"14px"}`, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s, box-shadow 0.15s", boxShadow:focused?`0 0 0 3px ${error?RED:G}12`:"none" }}
        />
      </div>
      {error && <p style={{ fontSize:10.5, marginTop:5, color:RED }}>{error}</p>}
      {hint && !error && <p style={{ fontSize:10.5, marginTop:5, color:I3 }}>{hint}</p>}
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
      {loading ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(0,0,0,0.15)", borderTopColor:"rgba(0,0,0,0.5)", animation:"evcrm-spin .7s linear infinite" }}/> : children}
    </button>
  )
}

// ── Success ───────────────────────────────────────────────────────
function SuccessScreen({ name }) {
  const router = useRouter()
  const [pct, setPct] = useState(0)

  useState(()=>{
    const t = setInterval(()=>{
      setPct(p=>{ if(p>=100){ router.push("/dealer"); clearInterval(t); return 100 } return p+2 })
    }, 40)
    return ()=>clearInterval(t)
  })

  return (
    <div style={{ textAlign:"center", padding:"16px 0" }}>
      <div style={{ fontSize:50, marginBottom:14 }}>🎉</div>
      <h2 style={{ fontSize:20, fontWeight:800, color:INK, marginBottom:6 }}>Welcome, {name?.split(" ")[0]}!</h2>
      <p style={{ fontSize:12, color:I3, marginBottom:20, lineHeight:1.7 }}>
        Your dealer account is ready.<br/>Taking you to your dashboard...
      </p>
      <div style={{ background:BD, borderRadius:6, height:4, overflow:"hidden" }}>
        <div style={{ height:"100%", background:G, borderRadius:6, width:`${pct}%`, transition:"width 0.04s linear" }}/>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  REGISTER PAGE — 2 steps
//  Step 1: Account (required) — name, email, password
//  Step 2: Business (optional) — dealership, city, brands, gstin
// ════════════════════════════════════════════════════════════════
export default function RegisterPage() {
  const router  = useRouter()
  const [step,    setStep]    = useState(1)  // 1 | 2 | success
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [globalErr, setGlobalErr] = useState("")

  const [form, setForm] = useState({
    // Step 1 — required
    name:       "",
    email:      "",
    password:   "",
    confirm:    "",
    // Step 2 — optional
    phone:      "",
    dealership: "",
    city:       "",
    gstin:      "",
    brands:     [],
  })

  const set = (k) => (e) => {
    setForm(f=>({...f,[k]:e.target.value}))
    setErrors(er=>({...er,[k]:""}))
    setGlobalErr("")
  }

  const toggleBrand = (b) => {
    setForm(f=>({ ...f, brands: f.brands.includes(b) ? f.brands.filter(x=>x!==b) : [...f.brands,b] }))
  }

  // ── Validate step 1 ───────────────────────────────────────────
  const validateStep1 = () => {
    const e = {}
    if (!form.name.trim())           e.name     = "Full name is required"
    if (!form.email.trim())          e.email    = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email"
    if (!form.password)              e.password = "Password is required"
    else if (form.password.length<8) e.password = "Minimum 8 characters"
    else if (!/[A-Z]/.test(form.password)) e.password = "Must include an uppercase letter"
    else if (!/\d/.test(form.password))    e.password = "Must include a number"
    if (form.password !== form.confirm) e.confirm = "Passwords do not match"
    return e
  }

  const handleStep1 = () => {
    const e = validateStep1()
    if (Object.keys(e).length) { setErrors(e); return }
    setStep(2)
  }

  // ── Submit registration ───────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true); setGlobalErr("")

    try {
      const res  = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({
          name:       form.name.trim(),
          email:      form.email.trim().toLowerCase(),
          password:   form.password,
          role:       "dealer",
          phone:      form.phone.trim()||null,
          dealership: form.dealership.trim()||null,
          city:       form.city||null,
          gstin:      form.gstin.trim()||null,
          brands:     form.brands,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.errors) setErrors(data.errors)
        else setGlobalErr(data.error||"Registration failed. Please try again.")
        if (data.errors?.email) setStep(1)
        return
      }

      setStep("success")
      setTimeout(()=>router.push("/dealer"), 2000)

    } catch {
      setGlobalErr("Network error. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  // ── Progress indicator ────────────────────────────────────────
  const stepPct = step===1 ? 50 : step===2 ? 100 : 100

  return (
    <div style={{ minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes evcrm-spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:focus, input:focus, select:focus { outline: none; }
      `}</style>

      <div style={{ width:"100%", maxWidth:480 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:22 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:5 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:`${G}18`, border:`1.5px solid ${G}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚡</div>
            <span style={{ fontFamily:"Georgia,serif", fontSize:21, fontWeight:900, color:INK, letterSpacing:"-0.5px" }}>Ev<span style={{ color:G }}>.CRM</span></span>
          </div>
          <p style={{ fontSize:11, color:I3 }}>India's EV Dealer Sales OS</p>
        </div>

        <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 4px 32px rgba(0,0,0,0.08)", border:`1px solid ${BD}`, padding:"32px 36px" }}>

          {/* Success */}
          {step==="success" ? <SuccessScreen name={form.name} /> : (
            <>
              {/* Header */}
              <div style={{ marginBottom:22 }}>
                <h1 style={{ fontSize:19, fontWeight:800, color:INK, marginBottom:4 }}>
                  {step===1 ? "Create Your Dealer Account" : "Tell Us About Your Business"}
                </h1>
                <p style={{ fontSize:12, color:I3 }}>
                  {step===1 ? "Set up your Ev.CRM account in 2 steps" : "These details help personalise your dashboard — you can update them later"}
                </p>
              </div>

              {/* Step indicator */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
                {[1,2].map(s=>(
                  <div key={s} style={{ display:"flex", alignItems:"center", gap:8, flex:s===1?1:"auto" }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:step>=s?G:BD, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:step>=s?"#fff":I3, flexShrink:0, transition:"all 0.2s" }}>
                      {step>s?"✓":s}
                    </div>
                    <span style={{ fontSize:11, color:step>=s?G:I3, fontWeight:step>=s?700:400, transition:"color 0.2s" }}>
                      {s===1?"Account":"Business Details"}
                    </span>
                    {s===1 && <div style={{ flex:1, height:2, background:step>1?G:BD, borderRadius:2, transition:"background 0.3s" }}/>}
                  </div>
                ))}
              </div>

              {/* Global error */}
              {globalErr && (
                <div style={{ background:"#FEF2F2", border:`1px solid ${RED}30`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:11.5, color:"#991B1B", display:"flex", gap:8, alignItems:"center" }}>
                  <span>⚠️</span><span>{globalErr}</span>
                </div>
              )}

              {/* ── STEP 1: Account details ── */}
              {step===1 && (
                <div>
                  <Field label="FULL NAME" placeholder="Balaji Lankalapalli" icon="👤"
                    value={form.name} onChange={set("name")} error={errors.name} required />
                  <Field label="EMAIL ADDRESS" type="email" placeholder="yourname@gmail.com" icon="✉️"
                    value={form.email} onChange={set("email")} error={errors.email} required
                    hint="This will be your login email" />
                  <Field label="PASSWORD" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" icon="🔒"
                    value={form.password} onChange={set("password")} error={errors.password} required />
                  <Field label="CONFIRM PASSWORD" type="password" placeholder="Repeat your password" icon="🔒"
                    value={form.confirm} onChange={set("confirm")} error={errors.confirm} required />

                  <PBtn onClick={handleStep1}>
                    Continue → Business Details
                  </PBtn>

                  <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:I3 }}>
                    Already have an account?{" "}
                    <button onClick={()=>router.push("/login")} style={{ background:"none", border:"none", color:G, fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Sign in →</button>
                  </p>
                </div>
              )}

              {/* ── STEP 2: Business details (all optional) ── */}
              {step===2 && (
                <div>
                  <div style={{ background:GL, border:`1px solid ${G}25`, borderRadius:10, padding:"10px 14px", marginBottom:20, fontSize:11.5, color:GD }}>
                    ℹ️ All fields on this page are <strong>optional</strong>. You can skip and fill them later from your dashboard settings.
                  </div>

                  <Field label="DEALERSHIP NAME" placeholder="e.g. Sharma EV Motors" icon="🏪"
                    value={form.dealership} onChange={set("dealership")} />
                  <Field label="PHONE NUMBER" type="tel" placeholder="9999900000" icon="📱"
                    value={form.phone} maxLength={10}
                    onChange={e=>setForm(f=>({...f,phone:e.target.value.replace(/\D/g,"")}))} />

                  {/* City dropdown */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.4px", marginBottom:5, color:I3 }}>
                      CITY <span style={{ color:I3, fontWeight:400, fontSize:10 }}>(optional)</span>
                    </label>
                    <select value={form.city} onChange={set("city")} style={{ width:"100%", background:"#fff", border:`1.5px solid ${BD}`, borderRadius:10, color:form.city?INK:I3, fontSize:13, padding:"11px 14px", outline:"none", fontFamily:"inherit", appearance:"none", cursor:"pointer" }}>
                      <option value="">Select your city...</option>
                      {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <Field label="GSTIN" placeholder="22AAAAA0000A1Z5" icon="📋"
                    value={form.gstin} onChange={set("gstin")} />

                  {/* EV Brands */}
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.4px", marginBottom:8, color:I3 }}>
                      EV BRANDS YOU SELL <span style={{ fontWeight:400, fontSize:10 }}>(optional)</span>
                    </label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {EV_BRANDS.map(b=>(
                        <button key={b} onClick={()=>toggleBrand(b)} style={{ background:form.brands.includes(b)?GL:"transparent", border:`1px solid ${form.brands.includes(b)?G:BD}`, color:form.brands.includes(b)?GD:I2, borderRadius:8, padding:"5px 12px", fontSize:10.5, cursor:"pointer", fontFamily:"inherit", fontWeight:form.brands.includes(b)?700:400, transition:"all 0.12s" }}>{b}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>setStep(1)} style={{ flex:1, background:BG, border:`1px solid ${BD}`, color:I2, borderRadius:10, padding:"12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                      ← Back
                    </button>
                    <div style={{ flex:2 }}>
                      <PBtn onClick={handleSubmit} loading={loading}>
                        Create Account →
                      </PBtn>
                    </div>
                  </div>

                  <p style={{ textAlign:"center", marginTop:12, fontSize:11, color:I3 }}>
                    <button onClick={handleSubmit} disabled={loading} style={{ background:"none", border:"none", color:I3, fontSize:11, cursor:"pointer", fontFamily:"inherit", textDecoration:"underline" }}>
                      Skip for now and create account
                    </button>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign:"center", marginTop:16, fontSize:10, color:I3 }}>© 2026 Ev.CRM · Privacy · Terms</p>
      </div>
    </div>
  )
}
