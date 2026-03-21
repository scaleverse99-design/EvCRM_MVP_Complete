"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const G   = "#059669", GD = "#065F46", GL = "#D1FAE5"
const INK = "#111827", I2 = "#374151", I3 = "#6B7280"
const BG  = "#F9FAFB", BD = "#E5E7EB"
const RED = "#EF4444", ORG = "#F97316", ORL = "#FFEDD5"

const EV_BRANDS = ["Tata","Ather","Ola Electric","TVS","Bajaj","Hero","Okaya","Ampere","Revolt","Pure EV","Simple Energy","Ultraviolette"]
const CITIES    = ["Hyderabad","Bangalore","Chennai","Mumbai","Delhi","Pune","Ahmedabad","Kolkata","Jaipur","Lucknow","Coimbatore","Kochi"]

function Field({ label, type="text", placeholder, value, onChange, error, icon, maxLength, required }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:14 }}>
      {label && (
        <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.4px", marginBottom:5, color:error?RED:focused?G:I3, transition:"color 0.15s" }}>
          {label}{required && <span style={{ color:RED }}> *</span>}
        </label>
      )}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:14, opacity:0.45, pointerEvents:"none" }}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ width:"100%", background:"#fff", border:`1.5px solid ${error?RED:focused?G:BD}`, borderRadius:9, color:INK, fontSize:13, padding:`10px 12px 10px ${icon?"38px":"12px"}`, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s, box-shadow 0.15s", boxShadow:focused?`0 0 0 3px ${error?RED:G}12`:"none" }}
        />
      </div>
      {error && <p style={{ fontSize:10.5, marginTop:4, color:RED }}>{error}</p>}
    </div>
  )
}

function Select({ label, value, onChange, options, error, icon, required }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.4px", marginBottom:5, color:error?RED:focused?G:I3 }}>{label}{required && <span style={{ color:RED }}> *</span>}</label>}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:14, opacity:0.45, pointerEvents:"none", zIndex:1 }}>{icon}</span>}
        <select value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ width:"100%", background:"#fff", border:`1.5px solid ${error?RED:focused?G:BD}`, borderRadius:9, color:value?INK:I3, fontSize:13, padding:`10px 12px 10px ${icon?"38px":"12px"}`, outline:"none", boxSizing:"border-box", fontFamily:"inherit", appearance:"none", cursor:"pointer" }}>
          <option value="">Select...</option>
          {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
        </select>
      </div>
      {error && <p style={{ fontSize:10.5, marginTop:4, color:RED }}>{error}</p>}
    </div>
  )
}

function PBtn({ children, onClick, loading, disabled, color=G }) {
  const off = disabled||loading
  return (
    <button onClick={onClick} disabled={off}
      style={{ width:"100%", background:off?"#E5E7EB":color, border:"none", color:off?I3:"#fff", borderRadius:10, padding:"13px", fontSize:13, fontWeight:700, cursor:off?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:off?"none":`0 3px 14px ${color}38`, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.15s" }}
      onMouseEnter={e=>{ if(!off) e.currentTarget.style.opacity=".87" }}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}
    >
      {loading ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(0,0,0,0.15)", borderTopColor:"rgba(0,0,0,0.5)", animation:"evcrm-spin .7s linear infinite" }}/> : children}
    </button>
  )
}

// ── Success Screen ─────────────────────────────────────────────────
function SuccessScreen({ role, name, autoLoggedIn }) {
  const router = useRouter()
  return (
    <div style={{ textAlign:"center", padding:"20px 0" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
      <h2 style={{ fontSize:22, fontWeight:800, color:INK, marginBottom:8 }}>
        Welcome to Ev.CRM{name ? `, ${name.split(" ")[0]}` : ""}!
      </h2>
      {autoLoggedIn ? (
        <>
          <p style={{ fontSize:13, color:I3, marginBottom:24, lineHeight:1.6 }}>Your account is ready. Taking you to your dashboard...</p>
          <div style={{ background:BD, borderRadius:6, height:4, overflow:"hidden", marginBottom:20 }}>
            <div style={{ height:"100%", background:G, borderRadius:6, animation:"evcrm-load 2s linear forwards" }}/>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize:13, color:I3, marginBottom:20, lineHeight:1.7 }}>
            Your dealer account has been created and is <strong>pending approval</strong>.<br/>
            You'll receive a welcome email once your account is activated.
          </p>
          <div style={{ background:GL, border:`1px solid ${G}30`, borderRadius:12, padding:"14px 18px", marginBottom:24, fontSize:12, color:GD, lineHeight:1.7, textAlign:"left" }}>
            ✅ Account created successfully<br/>
            📧 Welcome email sent to your inbox<br/>
            ⏳ Admin approval usually takes a few hours<br/>
            🔔 You'll get an email when approved
          </div>
          <button onClick={()=>router.push("/login")} style={{ background:G, color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Go to Login →
          </button>
        </>
      )}
      <style>{`@keyframes evcrm-load { from{width:0%} to{width:100%} }`}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  REGISTER PAGE
// ════════════════════════════════════════════════════════════════
export default function RegisterPage() {
  const router = useRouter()
  const [role,    setRole]    = useState("dealer")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [errors,  setErrors]  = useState({})
  const [globalErr, setGlobalErr] = useState("")

  const [form, setForm] = useState({
    name:        "",
    email:       "",
    password:    "",
    confirm:     "",
    phone:       "",
    dealership:  "",
    city:        "",
    brands:      [],
    gstin:       "",
  })

  const set = (k) => (e) => {
    setForm(f=>({...f,[k]:e.target.value}))
    setErrors(er=>({...er,[k]:""}))
    setGlobalErr("")
  }

  const toggleBrand = (b) => {
    setForm(f=>({...f, brands: f.brands.includes(b) ? f.brands.filter(x=>x!==b) : [...f.brands, b]}))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name     = "Full name is required"
    if (!form.email.trim())   e.email    = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email"
    if (!form.password)       e.password = "Password is required"
    else if (form.password.length < 8)  e.password = "Minimum 8 characters"
    else if (!/[A-Z]/.test(form.password)) e.password = "Must include an uppercase letter"
    else if (!/\d/.test(form.password))    e.password = "Must include a number"
    if (form.password !== form.confirm)   e.confirm  = "Passwords do not match"
    if (!form.phone.trim())   e.phone    = "Phone number is required"
    if (role==="dealer" && !form.dealership.trim()) e.dealership = "Dealership name is required"
    if (!form.city)           e.city     = "City is required"
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true); setGlobalErr("")

    try {
      const res  = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({
          name:       form.name.trim(),
          email:      form.email.trim().toLowerCase(),
          password:   form.password,
          role,
          phone:      form.phone.trim(),
          dealership: form.dealership.trim(),
          city:       form.city,
          brands:     form.brands,
          gstin:      form.gstin.trim(),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.errors) setErrors(data.errors)
        else setGlobalErr(data.error || "Registration failed. Please try again.")
        return
      }

      setSuccess({ role, name:form.name, autoLoggedIn:data.autoLoggedIn })
      if (data.autoLoggedIn) {
        setTimeout(()=>router.push(role==="dealer"?"/dealer":"/queue"), 2000)
      }
    } catch (err) {
      setGlobalErr("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const activeColor = role==="dealer" ? G : ORG

  return (
    <div style={{ minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:520 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:38, height:38, borderRadius:9, background:`${G}18`, border:`1.5px solid ${G}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>⚡</div>
            <span style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:900, color:INK, letterSpacing:"-0.5px" }}>Ev<span style={{ color:G }}>.CRM</span></span>
          </div>
          <p style={{ fontSize:11, color:I3 }}>India's EV Dealer Sales OS</p>
        </div>

        <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 4px 32px rgba(0,0,0,0.08)", border:`1px solid ${BD}`, padding:"32px 36px" }}>

          {success ? (
            <SuccessScreen role={success.role} name={success.name} autoLoggedIn={success.autoLoggedIn} />
          ) : (
            <>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:20, fontWeight:800, color:INK, marginBottom:4 }}>Create Your Account</h1>
                <p style={{ fontSize:12, color:I3 }}>Join 1,000+ EV dealers already using Ev.CRM</p>
              </div>

              {/* Role selector */}
              <div style={{ display:"flex", gap:8, marginBottom:24 }}>
                {[
                  { id:"dealer", icon:"🏪", label:"Dealer Owner",   sub:"Full admin access",    color:G   },
                  { id:"rep",    icon:"⚡", label:"Sales Rep",      sub:"Team member access",    color:ORG },
                ].map(r=>(
                  <button key={r.id} onClick={()=>{ setRole(r.id); setErrors({}) }} style={{ flex:1, background:role===r.id?`${r.color}10`:"transparent", border:`1.5px solid ${role===r.id?r.color:BD}`, borderRadius:12, padding:"10px 8px", cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit", boxShadow:role===r.id?`0 0 0 3px ${r.color}12`:"none" }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{r.icon}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:role===r.id?r.color:INK }}>{r.label}</div>
                    <div style={{ fontSize:9.5, color:I3, marginTop:2 }}>{r.sub}</div>
                  </button>
                ))}
              </div>

              {/* Global error */}
              {globalErr && (
                <div style={{ background:"#FEF2F2", border:`1px solid ${RED}30`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:11.5, color:"#991B1B", display:"flex", gap:8 }}>
                  <span>⚠️</span><span>{globalErr}</span>
                </div>
              )}

              {/* Form */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <Field label="FULL NAME" placeholder="Balaji Lankalapalli" icon="👤" value={form.name} onChange={set("name")} error={errors.name} required />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <Field label="EMAIL ADDRESS" type="email" placeholder="yourname@gmail.com" icon="✉️" value={form.email} onChange={set("email")} error={errors.email} required />
                </div>
                <Field label="PASSWORD" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" icon="🔒" value={form.password} onChange={set("password")} error={errors.password} required />
                <Field label="CONFIRM PASSWORD" type="password" placeholder="Repeat password" icon="🔒" value={form.confirm} onChange={set("confirm")} error={errors.confirm} required />
                <div style={{ gridColumn:"1/-1" }}>
                  <Field label="PHONE NUMBER" type="tel" placeholder="9999900000" icon="📱" value={form.phone} onChange={e=>{ setForm(f=>({...f,phone:e.target.value.replace(/\D/g,"")})); setErrors(er=>({...er,phone:""})) }} error={errors.phone} maxLength={10} required />
                </div>
              </div>

              {role==="dealer" && (
                <>
                  <Field label="DEALERSHIP NAME" placeholder="e.g. Sharma EV Motors" icon="🏪" value={form.dealership} onChange={set("dealership")} error={errors.dealership} required />
                  <Select label="CITY" value={form.city} onChange={set("city")} options={CITIES} icon="📍" error={errors.city} required />
                  <Field label="GSTIN (Optional)" placeholder="22AAAAA0000A1Z5" icon="📋" value={form.gstin} onChange={set("gstin")} />

                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:I3, letterSpacing:"0.4px", marginBottom:8 }}>EV BRANDS YOU SELL</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {EV_BRANDS.map(b=>(
                        <button key={b} onClick={()=>toggleBrand(b)} style={{ background:form.brands.includes(b)?GL:"transparent", border:`1px solid ${form.brands.includes(b)?G:BD}`, color:form.brands.includes(b)?GD:I2, borderRadius:8, padding:"5px 11px", fontSize:10.5, cursor:"pointer", fontFamily:"inherit", fontWeight:form.brands.includes(b)?700:400, transition:"all 0.12s" }}>{b}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {role==="rep" && (
                <Select label="CITY" value={form.city} onChange={set("city")} options={CITIES} icon="📍" error={errors.city} required />
              )}

              {/* Info box */}
              <div style={{ background:role==="dealer"?GL:ORL, border:`1px solid ${activeColor}25`, borderRadius:10, padding:"10px 14px", marginBottom:20, fontSize:11, color:role==="dealer"?GD:"#7C2D12", lineHeight:1.7 }}>
                {role==="dealer"
                  ? <><strong>ℹ️ Dealer accounts</strong> are reviewed within a few hours. You'll get an email when approved.</>
                  : <><strong>ℹ️ Sales Rep accounts</strong> are activated instantly. Make sure your dealer has added you first.</>}
              </div>

              <PBtn onClick={handleSubmit} loading={loading} color={activeColor}>
                {role==="dealer" ? "Create Dealer Account →" : "Create Rep Account →"}
              </PBtn>

              <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:I3 }}>
                Already have an account?{" "}
                <button onClick={()=>router.push("/login")} style={{ background:"none", border:"none", color:activeColor, fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Sign in →</button>
              </p>
            </>
          )}
        </div>

        <p style={{ textAlign:"center", marginTop:16, fontSize:10, color:I3 }}>© 2026 Ev.CRM · Privacy · Terms</p>
      </div>
    </div>
  )
}
