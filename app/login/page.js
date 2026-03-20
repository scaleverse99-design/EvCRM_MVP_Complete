"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input, OTPInput, Btn, Spinner } from "../../components/ui"
import { C } from "../../lib/constants"

const ROLES = [
  { id:"dealer",   icon:"🏪", label:"Dealer",    sub:"Owner / Manager",  color:C.green,  dest:"/dealer"   },
  { id:"rep",      icon:"⚡", label:"Sales Rep",  sub:"Showroom floor",   color:C.orange, dest:"/queue"    },
  { id:"customer", icon:"🚗", label:"Customer",   sub:"MyGarage portal",  color:C.teal,   dest:"/mygarage" },
]

const BRAND_CFG = {
  dealer:   { stats:[{v:"1,000+",l:"EV Dealers"},{v:"₹300",l:"Per Month"},{v:"20+",l:"Sales/Month"}], tag:"Dealer Command Centre" },
  rep:      { stats:[{v:"10",l:"AI Leads/Day"},{v:"60s",l:"Quote Speed"},{v:"2×",l:"More Closings"}], tag:"Sales Rep Dashboard" },
  customer: { stats:[{v:"Live",l:"Order Track"},{v:"1-tap",l:"Service Req"},{v:"All",l:"Your Quotes"}], tag:"MyGarage Portal" },
}

function Countdown({ from=30 }) {
  const [sec, setSec] = useState(from)
  useEffect(()=>{ if(sec>0){ const t=setTimeout(()=>setSec(s=>s-1),1000); return()=>clearTimeout(t) } },[sec])
  return { sec, reset:()=>setSec(from) }
}

// ── Dealer form ───────────────────────────────────────────────────────
function DealerForm({ onSuccess }) {
  const [step,    setStep]    = useState("creds")
  const [isSignup,setIsSignup]= useState(false)
  const [form,    setForm]    = useState({ phone:"", password:"", dealership:"" })
  const [otp,     setOtp]     = useState("")
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [cd,      setCd]      = useState(30)
  useEffect(()=>{ if(step==="otp"&&cd>0){ const t=setTimeout(()=>setCd(c=>c-1),1000); return()=>clearTimeout(t) } },[cd,step])

  const submit = () => {
    const e = {}
    if (!form.phone||form.phone.length<10) e.phone="Enter valid 10-digit number"
    if (!isSignup&&!form.password)          e.password="Password required"
    if (isSignup&&!form.dealership)         e.dealership="Dealership name required"
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true); setTimeout(()=>{ setLoading(false); setStep("otp"); setCd(30) }, 1200)
  }

  if (step==="otp") return (
    <div className="evcrm-fade-up">
      <h2 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:6 }}>Verify OTP</h2>
      <p style={{ fontSize:12, color:C.ink3, marginBottom:20 }}>Check Gmail linked to +91 {form.phone}</p>
      <div style={{ background:C.greenL, border:`1px solid ${C.green}40`, borderRadius:12, padding:"11px 14px", marginBottom:22, display:"flex", gap:10, alignItems:"center" }}>
        <span style={{ fontSize:16 }}>📧</span>
        <div><div style={{ fontSize:10.5, fontWeight:700, color:C.greenD }}>OTP sent via Gmail (free)</div><div style={{ fontSize:10, color:C.ink3 }}>Google Apps Script — zero SMS cost</div></div>
      </div>
      <p style={{ fontSize:10, fontWeight:700, color:C.ink3, textAlign:"center", marginBottom:12, letterSpacing:"0.5px" }}>ENTER 6-DIGIT OTP</p>
      <OTPInput value={otp} onChange={setOtp} />
      <div style={{ height:18 }}/>
      <Btn onClick={()=>{ if(otp.length!==6)return; setLoading(true); setTimeout(onSuccess,1400) }} loading={loading} disabled={otp.length!==6} style={{ width:"100%" }}>
        Verify & Sign In →
      </Btn>
      <p style={{ textAlign:"center", marginTop:12, fontSize:11, color:C.ink3 }}>
        {cd>0 ? <>Resend in <span style={{ color:C.green, fontWeight:700 }}>{cd}s</span></> : <button onClick={()=>setCd(30)} style={{ background:"none", border:"none", color:C.green, fontSize:11, cursor:"pointer", fontWeight:700 }}>Resend OTP</button>}
      </p>
      <button onClick={()=>setStep("creds")} style={{ display:"block", margin:"10px auto 0", background:"none", border:"none", color:C.ink3, fontSize:11, cursor:"pointer" }}>← Back</button>
    </div>
  )

  return (
    <div className="evcrm-fade-up">
      <h2 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>{isSignup?"Create Dealer Account":"Dealer Login"}</h2>
      <p style={{ fontSize:12, color:C.ink3, marginBottom:22 }}>{isSignup?"Set up your EV showroom on Ev.CRM":"Sign in to your command centre"}</p>
      {isSignup && <Input label="DEALERSHIP NAME *" placeholder="e.g. Sharma EV Motors" icon="🏪" value={form.dealership} onChange={e=>setForm(f=>({...f,dealership:e.target.value}))} error={errors.dealership} />}
      <Input label="PHONE NUMBER *" placeholder="98765 43210" type="tel" icon="📱" value={form.phone} maxLength={10} onChange={e=>setForm(f=>({...f,phone:e.target.value.replace(/\D/g,"")}))} error={errors.phone} hint={!errors.phone?"OTP will be sent to linked Gmail":null} />
      {!isSignup && <Input label="PASSWORD *" placeholder="Your password" type="password" icon="🔒" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} error={errors.password} />}
      {isSignup && (
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:7 }}>EV BRANDS YOU SELL</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["Tata","Ather","Ola","TVS","Bajaj","Okaya","Hero"].map(b=>(
              <button key={b} style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:8, padding:"5px 11px", fontSize:10, cursor:"pointer" }}>{b}</button>
            ))}
          </div>
        </div>
      )}
      <Btn onClick={submit} loading={loading} style={{ width:"100%" }}>{isSignup?"Create Account →":"Continue →"}</Btn>
      {!isSignup && <p style={{ textAlign:"center", marginTop:10 }}><button style={{ background:"none", border:"none", color:C.green, fontSize:11, cursor:"pointer", fontWeight:600 }}>Forgot password?</button></p>}
      <p style={{ textAlign:"center", marginTop:18, fontSize:12, color:C.ink3 }}>
        {isSignup?"Have an account? ":"New dealer? "}
        <button onClick={()=>{setIsSignup(!isSignup);setErrors({})}} style={{ background:"none", border:"none", color:C.green, fontSize:12, cursor:"pointer", fontWeight:700 }}>{isSignup?"Sign in":"Create account"}</button>
      </p>
    </div>
  )
}

// ── Rep form ──────────────────────────────────────────────────────────
function RepForm({ onSuccess }) {
  const [step,    setStep]    = useState("phone")
  const [phone,   setPhone]   = useState("")
  const [otp,     setOtp]     = useState("")
  const [pin,     setPin]     = useState(["","","",""])
  const [loading, setLoading] = useState(false)
  const [cd,      setCd]      = useState(30)
  const [phoneErr,setPhoneErr]= useState("")
  useEffect(()=>{ if(step==="otp"&&cd>0){ const t=setTimeout(()=>setCd(c=>c-1),1000); return()=>clearTimeout(t) } },[cd,step])

  if (step==="phone") return (
    <div className="evcrm-fade-up">
      <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:C.orangeL, border:`1px solid ${C.orange}40`, borderRadius:20, padding:"3px 10px", marginBottom:12, fontSize:9, fontWeight:700, color:C.orange }}>⚡ Sales Rep Access</div>
      <h2 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>Rep Login</h2>
      <p style={{ fontSize:12, color:C.ink3, marginBottom:22 }}>Your AI queue is ready for today</p>
      <Input label="YOUR PHONE NUMBER *" placeholder="98765 43210" type="tel" icon="📱" value={phone} maxLength={10} onChange={e=>{setPhone(e.target.value.replace(/\D/g,"")); setPhoneErr("")}} error={phoneErr} hint={!phoneErr?"Linked to your Ev.CRM rep account":null} />
      <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:18, display:"flex", gap:10, alignItems:"center" }}>
        <span>📧</span><div><div style={{ fontSize:10.5, fontWeight:700, color:C.ink }}>OTP sent via Gmail (free)</div><div style={{ fontSize:9.5, color:C.ink3 }}>No SMS charges</div></div>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:18 }}>
        {[{v:"10",l:"AI Queue",c:C.orange},{v:"3",l:"HOT leads",c:C.red},{v:"2",l:"Quotes",c:C.ink3}].map((s,i)=>(
          <div key={i} style={{ flex:1, textAlign:"center", background:C.bg, borderRadius:10, padding:"10px 6px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:18, fontWeight:900, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:9, color:C.ink3, marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <Btn onClick={()=>{ if(phone.length<10){setPhoneErr("Enter valid number");return} setLoading(true); setTimeout(()=>{setLoading(false);setStep("otp");setCd(30)},1200) }} loading={loading} color={C.orange} style={{ width:"100%" }}>Send OTP →</Btn>
    </div>
  )

  if (step==="otp") return (
    <div className="evcrm-fade-up">
      <h2 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:6 }}>Verify OTP</h2>
      <p style={{ fontSize:12, color:C.ink3, marginBottom:20 }}>Check Gmail linked to +91 {phone}</p>
      <div style={{ background:C.orangeL, border:`1px solid ${C.orange}40`, borderRadius:12, padding:"11px 14px", marginBottom:22 }}><span style={{ color:C.orange, fontSize:11, fontWeight:600 }}>📧 OTP sent to your Gmail</span></div>
      <p style={{ fontSize:10, fontWeight:700, color:C.ink3, textAlign:"center", marginBottom:12 }}>ENTER 6-DIGIT OTP</p>
      <OTPInput value={otp} onChange={setOtp} />
      <div style={{ height:18 }}/>
      <Btn onClick={()=>{setLoading(true);setTimeout(()=>{setLoading(false);setStep("pin")},1200)}} loading={loading} disabled={otp.length!==6} color={C.orange} style={{ width:"100%" }}>Verify OTP →</Btn>
      <p style={{ textAlign:"center", marginTop:12, fontSize:11, color:C.ink3 }}>
        {cd>0?<>Resend in <span style={{ color:C.orange, fontWeight:700 }}>{cd}s</span></>:<button onClick={()=>setCd(30)} style={{ background:"none",border:"none",color:C.orange,fontSize:11,cursor:"pointer",fontWeight:700 }}>Resend</button>}
      </p>
      <button onClick={()=>setStep("phone")} style={{ display:"block",margin:"10px auto 0",background:"none",border:"none",color:C.ink3,fontSize:11,cursor:"pointer" }}>← Back</button>
    </div>
  )

  return (
    <div className="evcrm-fade-up">
      <h2 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4, textAlign:"center" }}>Enter PIN</h2>
      <p style={{ fontSize:12, color:C.ink3, marginBottom:24, textAlign:"center" }}>Your 4-digit daily access PIN</p>
      <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:28 }}>
        {pin.map((d,i)=>(
          <input key={i} type="password" inputMode="numeric" maxLength={1} value={d}
            onChange={e=>{ const v=e.target.value.replace(/\D/g,"").slice(-1); const np=pin.map((p,idx)=>idx===i?v:p); setPin(np); if(v&&i<3) document.querySelector(`#pin-${i+1}`)?.focus() }}
            onKeyDown={e=>{ if(e.key==="Backspace"&&!d&&i>0){ document.querySelector(`#pin-${i-1}`)?.focus(); setPin(p=>p.map((x,idx)=>idx===i-1?"":x)) } }}
            id={`pin-${i}`}
            style={{ width:56,height:60,background:d?C.greenL:C.bg,border:`2px solid ${d?C.green:C.border}`,borderRadius:12,color:C.ink,fontSize:24,fontWeight:900,textAlign:"center",outline:"none",transition:"all 0.15s" }}
          />
        ))}
      </div>
      <Btn onClick={()=>{setLoading(true);setTimeout(onSuccess,1500)}} loading={loading} disabled={pin.join("").length!==4} color={C.orange} style={{ width:"100%" }}>Enter Dashboard →</Btn>
    </div>
  )
}

// ── Customer form ─────────────────────────────────────────────────────
function CustomerForm({ onSuccess }) {
  const [step,    setStep]    = useState("choice")
  const [phone,   setPhone]   = useState("")
  const [otp,     setOtp]     = useState("")
  const [loading, setLoading] = useState(false)
  const [cd,      setCd]      = useState(30)
  const [phoneErr,setPhoneErr]= useState("")
  useEffect(()=>{ if(step==="otp"&&cd>0){ const t=setTimeout(()=>setCd(c=>c-1),1000); return()=>clearTimeout(t) } },[cd,step])

  if (step==="choice") return (
    <div className="evcrm-fade-up">
      <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:C.tealL, border:`1px solid ${C.teal}40`, borderRadius:20, padding:"3px 10px", marginBottom:12, fontSize:9, fontWeight:700, color:C.teal }}>🚗 MyGarage Portal</div>
      <h2 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>Welcome Back</h2>
      <p style={{ fontSize:12, color:C.ink3, marginBottom:22 }}>Track your EV order, quotes and service</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        {[{id:"phone",icon:"📱",label:"Continue with Phone",sub:"OTP via Gmail · free & instant",color:C.teal},{id:"link",icon:"🔗",label:"Use MyGarage Link",sub:"Permanent link from your dealer",color:C.ink3}].map(opt=>(
          <button key={opt.id} onClick={()=>setStep(opt.id)} style={{ background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"15px 16px",cursor:"pointer",textAlign:"left",display:"flex",gap:12,alignItems:"center",transition:"all 0.15s",fontFamily:"inherit" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=opt.color;e.currentTarget.style.background=opt.id==="phone"?C.tealL:C.bg}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.bg}}
          >
            <span style={{ fontSize:22 }}>{opt.icon}</span>
            <div style={{ flex:1 }}><div style={{ fontSize:12,fontWeight:700,color:C.ink }}>{opt.label}</div><div style={{ fontSize:10,color:C.ink3,marginTop:2 }}>{opt.sub}</div></div>
            <span style={{ color:C.ink3,fontSize:16 }}>›</span>
          </button>
        ))}
      </div>
      <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:14 }}>
        <p style={{ fontSize:10,fontWeight:700,color:C.ink3,marginBottom:8 }}>WHAT YOU CAN DO IN MYGARAGE</p>
        {[{i:"📍",t:"Track delivery status live"},{i:"📄",t:"View and download your quotes"},{i:"🔧",t:"Raise service requests"},{i:"💬",t:"Contact your assigned rep"}].map((f,i)=>(
          <div key={i} style={{ display:"flex",gap:10,padding:"5px 0",borderBottom:i<3?`1px solid ${C.border}`:"none" }}>
            <span style={{ fontSize:13 }}>{f.i}</span><span style={{ fontSize:11,color:C.ink3 }}>{f.t}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (step==="phone") return (
    <div className="evcrm-fade-up">
      <h2 style={{ fontSize:22,fontWeight:800,color:C.ink,marginBottom:6 }}>Enter Your Phone</h2>
      <p style={{ fontSize:12,color:C.ink3,marginBottom:20 }}>OTP will be sent to linked Gmail</p>
      <Input label="PHONE NUMBER *" placeholder="98765 43210" type="tel" icon="📱" value={phone} maxLength={10} onChange={e=>{setPhone(e.target.value.replace(/\D/g,""));setPhoneErr("")}} error={phoneErr} />
      <Btn onClick={()=>{ if(phone.length<10){setPhoneErr("Enter valid number");return} setLoading(true); setTimeout(()=>{setLoading(false);setStep("otp");setCd(30)},1200) }} loading={loading} color={C.teal} style={{ width:"100%" }}>Send OTP →</Btn>
      <button onClick={()=>setStep("choice")} style={{ display:"block",margin:"10px auto 0",background:"none",border:"none",color:C.ink3,fontSize:11,cursor:"pointer" }}>← Back</button>
    </div>
  )

  if (step==="link") return (
    <div className="evcrm-fade-up">
      <h2 style={{ fontSize:22,fontWeight:800,color:C.ink,marginBottom:6 }}>Enter Your Link</h2>
      <p style={{ fontSize:12,color:C.ink3,marginBottom:20 }}>Paste the MyGarage link shared by your dealer</p>
      <Input label="MYGARAGE LINK" placeholder="evcrm.in/mygarage/abc123" icon="🔗" value="" onChange={()=>{}} hint="Check WhatsApp from your dealer" />
      <Btn onClick={()=>{setLoading(true);setTimeout(onSuccess,1400)}} loading={loading} color={C.teal} style={{ width:"100%" }}>Open MyGarage →</Btn>
      <button onClick={()=>setStep("choice")} style={{ display:"block",margin:"10px auto 0",background:"none",border:"none",color:C.ink3,fontSize:11,cursor:"pointer" }}>← Back</button>
    </div>
  )

  return (
    <div className="evcrm-fade-up">
      <h2 style={{ fontSize:22,fontWeight:800,color:C.ink,marginBottom:6 }}>Verify It's You</h2>
      <p style={{ fontSize:12,color:C.ink3,marginBottom:18 }}>OTP sent to Gmail for +91 {phone}</p>
      <div style={{ background:C.tealL,border:`1px solid ${C.teal}40`,borderRadius:12,padding:"11px 14px",marginBottom:20,display:"flex",gap:8,alignItems:"center" }}><span>📧</span><span style={{ fontSize:11,color:C.teal,fontWeight:600 }}>Check your Gmail inbox for the OTP</span></div>
      <p style={{ fontSize:10,fontWeight:700,color:C.ink3,textAlign:"center",marginBottom:12 }}>ENTER 6-DIGIT CODE</p>
      <OTPInput value={otp} onChange={setOtp} />
      <div style={{ height:18 }}/>
      <Btn onClick={()=>{setLoading(true);setTimeout(onSuccess,1400)}} loading={loading} disabled={otp.length!==6} color={C.teal} style={{ width:"100%" }}>Open MyGarage →</Btn>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────
function SuccessScreen({ role }) {
  const router = useRouter()
  const r = ROLES.find(x=>x.id===role)||ROLES[0]
  useEffect(()=>{ const t=setTimeout(()=>router.push(r.dest),1800); return()=>clearTimeout(t) },[])
  return (
    <div className="evcrm-fade-up" style={{ textAlign:"center" }}>
      <div style={{ width:72,height:72,borderRadius:"50%",background:`${r.color}20`,border:`2px solid ${r.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 18px",boxShadow:`0 0 24px ${r.color}44` }}>{r.icon}</div>
      <div style={{ fontSize:22,fontWeight:800,color:C.ink,marginBottom:6 }}>Welcome to Ev.CRM!</div>
      <div style={{ fontSize:12,color:C.ink3,marginBottom:24 }}>Loading {r.label === "Customer" ? "your garage" : "your dashboard"}...</div>
      <div style={{ background:C.bg,borderRadius:6,height:4,overflow:"hidden" }}>
        <div style={{ height:"100%",background:r.color,borderRadius:6,animation:"evcrm-load 1.8s linear forwards" }}/>
      </div>
      <style>{`@keyframes evcrm-load { from{width:0%} to{width:100%} }`}</style>
    </div>
  )
}

// ── Main login page ───────────────────────────────────────────────────
export default function LoginPage() {
  const [role,    setRole]    = useState("dealer")
  const [success, setSuccess] = useState(false)
  const r   = ROLES.find(x=>x.id===role)||ROLES[0]
  const cfg = BRAND_CFG[role]

  return (
    <div style={{
      minHeight:"100vh", display:"flex",
      fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",
      background:C.bg
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans','Segoe UI',system-ui,sans-serif}
        button:focus,input:focus{outline:none}
        @keyframes evcrm-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes evcrm-fade{from{opacity:0}to{opacity:1}}
        .evcrm-fade-up{animation:evcrm-up 0.4s ease both}
        @keyframes evcrm-pulse{0%,100%{opacity:1}50%{opacity:0.2}}
      `}</style>

      {/* Left brand panel */}
      <div style={{ width:"42%", background:"#FFFFFF", borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", justifyContent:"center", padding:"48px 44px", position:"relative", overflow:"hidden", flexShrink:0 }}>
        {/* Grid bg */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.04 }}>
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke={r.color} strokeWidth="0.8"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>
        <div style={{ position:"absolute", top:"-15%", left:"-10%", width:"55%", height:"55%", borderRadius:"50%", background:`radial-gradient(circle, ${r.color}12 0%, transparent 70%)` }}/>

        <div style={{ position:"relative", zIndex:1 }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:44 }} className="evcrm-fade-up">
            <div style={{ width:42,height:42,borderRadius:11,background:`${r.color}18`,border:`1.5px solid ${r.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{r.icon}</div>
            <div>
              <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:22, fontWeight:900, color:C.ink }}>Ev<span style={{ color:r.color }}>.CRM</span></div>
              <div style={{ fontSize:9.5, color:C.ink3 }}>India's EV Dealer OS</div>
            </div>
          </div>
          <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:38, fontWeight:900, color:C.ink, lineHeight:1.15, marginBottom:14, animation:"evcrm-up 0.5s 0.1s ease both" }}>{cfg.tag}</div>
          <p style={{ fontSize:13, color:C.ink3, lineHeight:1.6, marginBottom:36, maxWidth:280, animation:"evcrm-up 0.5s 0.2s ease both" }}>
            {role==="dealer" ? "Command your EV showroom — leads, stock, quotes and analytics in one place." : role==="rep" ? "Your AI-powered daily engine. Follow up smarter, close faster." : "Track your EV from booking to delivery and beyond."}
          </p>
          {/* Stats */}
          <div style={{ display:"flex", animation:"evcrm-up 0.5s 0.3s ease both" }}>
            {cfg.stats.map((s,i)=>(
              <div key={i} style={{ flex:1, paddingLeft:i>0?20:0, borderLeft:i>0?`1px solid ${r.color}25`:"none" }}>
                <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:26, fontWeight:900, color:r.color }}>{s.v}</div>
                <div style={{ fontSize:10, color:C.ink3, marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:36, height:2, width:48, background:`linear-gradient(90deg,${r.color},transparent)`, borderRadius:2 }}/>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"40px 52px", position:"relative" }}>
        <div style={{ position:"absolute", top:0, right:0, width:"50%", height:"50%", background:`radial-gradient(circle at 100% 0%, ${r.color}06 0%, transparent 60%)`, pointerEvents:"none" }}/>
        <div style={{ maxWidth:380, width:"100%", position:"relative" }}>
          {/* Role selector */}
          {!success && (
            <div style={{ marginBottom:28 }} className="evcrm-fade-up">
              <p style={{ fontSize:10, fontWeight:700, color:C.ink3, letterSpacing:"0.6px", marginBottom:10 }}>SIGN IN AS</p>
              <div style={{ display:"flex", gap:8 }}>
                {ROLES.map(ro=>(
                  <button key={ro.id} onClick={()=>setRole(ro.id)} style={{
                    flex:1, background: role===ro.id ? `${ro.color}12` : C.bg,
                    border:`1.5px solid ${role===ro.id ? ro.color : C.border}`,
                    borderRadius:12, padding:"11px 8px", cursor:"pointer",
                    textAlign:"center", transition:"all 0.15s", fontFamily:"inherit",
                    boxShadow: role===ro.id ? `0 0 0 3px ${ro.color}15` : "none"
                  }}>
                    <div style={{ fontSize:19, marginBottom:3 }}>{ro.icon}</div>
                    <div style={{ fontSize:10.5, fontWeight:700, color:role===ro.id?ro.color:C.ink }}>{ro.label}</div>
                    <div style={{ fontSize:9, color:C.ink3, marginTop:1 }}>{ro.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {success     ? <SuccessScreen role={role} /> :
           role==="dealer"   ? <DealerForm onSuccess={()=>setSuccess(true)} /> :
           role==="rep"      ? <RepForm    onSuccess={()=>setSuccess(true)} /> :
                               <CustomerForm onSuccess={()=>setSuccess(true)} />}

          {!success && (
            <div style={{ marginTop:32, paddingTop:20, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:10, color:C.ink3 }}>© 2026 Ev.CRM</div>
              <div style={{ display:"flex", gap:14 }}>
                {["Privacy","Terms","Support"].map(l=><button key={l} style={{ background:"none",border:"none",color:C.ink3,fontSize:10,cursor:"pointer" }}>{l}</button>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
