"use client"
import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { bookTestDrive } from "../../../lib/payments/tokenBooking"

const T = {
  bg:"#0a0c10", card:"#12151c", card2:"#0d1017", border:"#1e2330",
  accent:"#00c896", blue:"#3b82f6", orange:"#f97316", red:"#ef4444", purple:"#a855f7",
  ink:"#f0f4ff", ink2:"#8b95b0", ink3:"#4a5468",
  gradient:"linear-gradient(135deg, #00c896 0%, #0ea5e9 100%)",
}
const fmt = n => "₹" + Number(n).toLocaleString("en-IN")

function VehicleDetailPage() {
  const params = useParams()
  const vehicleId = params?.id

  const [vehicle,  setVehicle]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [booking,  setBooking]  = useState(false)

  // Booking form
  const [name,   setName]   = useState("")
  const [phone,  setPhone]  = useState("")
  const [email,  setEmail]  = useState("")
  const [date,   setDate]   = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [err,    setErr]    = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/marketplace/vehicles`)
        const data = await res.json()
        const v    = data.vehicles?.find(v => v.id === vehicleId)
        if (v) setVehicle(v)
      } finally { setLoading(false) }
    }
    if (vehicleId) load()
  }, [vehicleId])

  const handleBook = async () => {
    if (!name.trim() || !phone.trim()) { setErr("Name and phone are required"); return }
    setErr(""); setSubmitting(true)
    try {
      const booking = await bookTestDrive({ vehicleId, name:name.trim(), phone:phone.trim(), email:email.trim(), preferredDate:date||null })
      setSuccess(booking)
    } catch (e) { setErr(e.message || "Booking failed") }
    finally { setSubmitting(false) }
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:44, height:44, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 16px" }}/>
        <div style={{ color:T.ink2, fontSize:13, fontWeight:600 }}>Loading vehicle details…</div>
      </div>
    </div>
  )

  if (!vehicle) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🚫</div>
        <div style={{ fontSize:20, fontWeight:800, color:T.ink }}>Vehicle not found</div>
        <Link href="/buy-vehicles" style={{ display:"inline-block", marginTop:16, color:T.accent, fontWeight:700 }}>← Back to marketplace</Link>
      </div>
    </div>
  )

  const specs = [
    ["⚡ Range",          `${vehicle.range} km`],
    ["🔋 Battery",        vehicle.batteryCapacity || "—"],
    ["⚡ Charging",       vehicle.chargingTime || "—"],
    ["🏎 Top Speed",      `${vehicle.topSpeed} km/h`],
    ["⚡ Acceleration",   vehicle.acceleration || "—"],
    ["🚗 Body Type",      vehicle.bodyType || "—"],
    ["📅 Year",           vehicle.year],
    ["🎨 Colour",         vehicle.color || "—"],
    ["🛡 Warranty",       vehicle.warranty || "—"],
  ]

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing:border-box; }`}</style>

      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(10,12,16,0.92)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${T.border}`, padding:"0 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", height:60, display:"flex", alignItems:"center", gap:16 }}>
          <Link href="/buy-vehicles" style={{ color:T.ink2, fontSize:13, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>← Back to Marketplace</Link>
          <div style={{ flex:1 }}/>
          <div style={{ fontSize:13, color:T.ink2 }}>{vehicle.brand} {vehicle.model} {vehicle.variant}</div>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:32 }}>

          {/* Left: Details */}
          <div>
            {/* Hero image */}
            <div style={{ background:`linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%)`, borderRadius:24, height:340, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24, border:`1px solid ${T.border}`, position:"relative", overflow:"hidden" }}>
              <div style={{ fontSize:120, filter:"drop-shadow(0 16px 40px rgba(0,200,150,0.25))" }}>{vehicle.images?.[0]||"🚗"}</div>
              <div style={{ position:"absolute", top:16, left:16, display:"flex", gap:8 }}>
                {(vehicle.tags||[]).map(t => <span key={t} style={{ background:T.accent, color:"#000", fontSize:10, fontWeight:800, padding:"4px 10px", borderRadius:20 }}>{t}</span>)}
              </div>
              <div style={{ position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)", border:`1px solid ${T.border}`, color:T.accent, fontSize:13, fontWeight:700, padding:"6px 20px", borderRadius:20 }}>
                ⚡ {vehicle.range} km real-world range
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, color:T.ink3, marginBottom:4 }}>{vehicle.brand} · {vehicle.bodyType} · {vehicle.condition === "new" ? "Brand New" : `${vehicle.km?.toLocaleString()} km`}</div>
              <h1 style={{ fontSize:32, fontWeight:900, color:T.ink, margin:0, letterSpacing:"-0.5px" }}>{vehicle.model} <span style={{ fontWeight:500, color:T.ink2 }}>{vehicle.variant}</span></h1>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:8 }}>
                <span style={{ color:"#f59e0b", fontSize:14 }}>{"★".repeat(Math.round(vehicle.rating||4))}</span>
                <span style={{ fontSize:12, color:T.ink2 }}>{vehicle.rating} · {vehicle.reviews} reviews</span>
                <span style={{ fontSize:12, color:T.ink3 }}>|</span>
                <span style={{ fontSize:12, color:T.ink2 }}>🏪 {vehicle.dealerName}</span>
              </div>
            </div>

            {/* Price strip */}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, padding:"18px 24px", marginBottom:24, display:"flex", gap:32, alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, color:T.ink3, marginBottom:2 }}>Ex-showroom Price</div>
                <div style={{ fontSize:32, fontWeight:900, color:T.ink, letterSpacing:"-1px" }}>{fmt(vehicle.exShowroom)}</div>
              </div>
              <div style={{ width:1, height:48, background:T.border }}/>
              <div>
                <div style={{ fontSize:11, color:T.ink3, marginBottom:2 }}>On-road (est.)</div>
                <div style={{ fontSize:22, fontWeight:800, color:T.ink2 }}>{fmt(vehicle.onRoad || vehicle.exShowroom * 1.12)}</div>
              </div>
              <div style={{ width:1, height:48, background:T.border }}/>
              <div>
                <div style={{ fontSize:11, color:T.ink3, marginBottom:2 }}>EMI from</div>
                <div style={{ fontSize:22, fontWeight:800, color:T.accent }}>₹{vehicle.emi?.toLocaleString()}/mo</div>
              </div>
            </div>

            {/* Specs */}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, padding:"18px 24px", marginBottom:24 }}>
              <div style={{ fontSize:14, fontWeight:800, color:T.ink, marginBottom:16 }}>Vehicle Specifications</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {specs.map(([label, val]) => (
                  <div key={label} style={{ background:T.bg, borderRadius:12, padding:"12px 14px" }}>
                    <div style={{ fontSize:11, color:T.ink3, marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            {vehicle.features?.length > 0 && (
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, padding:"18px 24px" }}>
                <div style={{ fontSize:14, fontWeight:800, color:T.ink, marginBottom:14 }}>Key Features</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {vehicle.features.map(f => (
                    <div key={f} style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}20`, color:T.accent, fontSize:12, fontWeight:600, padding:"7px 14px", borderRadius:20 }}>✓ {f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking panel */}
          <div style={{ position:"sticky", top:80, height:"fit-content" }}>
            {success ? (
              /* Success */
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:24, padding:"28px", textAlign:"center" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🎉</div>
                <div style={{ fontSize:20, fontWeight:900, color:T.ink, marginBottom:8 }}>Booking Confirmed!</div>
                <div style={{ fontSize:13, color:T.ink2, marginBottom:20, lineHeight:1.7 }}>
                  <b style={{ color:T.ink }}>{success.dealerName}</b> will call you within 2 hours to schedule your test drive.
                </div>
                <div style={{ background:`${T.accent}15`, border:`1px solid ${T.accent}30`, borderRadius:16, padding:"16px", marginBottom:16 }}>
                  <div style={{ fontSize:11, color:T.ink3 }}>Token Amount</div>
                  <div style={{ fontSize:32, fontWeight:900, color:T.accent }}>₹1,000</div>
                  <div style={{ fontSize:11, color:T.ink3, marginTop:4 }}>Adjustable against purchase</div>
                </div>
                {success.viaGateway === false ? (
                  <div style={{ background:`${T.orange}10`, border:`1px solid ${T.orange}20`, borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:11, color:T.orange, textAlign:"left" }}>
                    ⚠️ Payment gateway not yet configured — the dealer will collect ₹1,000 at showroom visit.
                  </div>
                ) : (
                  <div style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}20`, borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:11, color:T.accent, textAlign:"left" }}>
                    ✓ Held securely by Razorpay — released to the dealer only once your test drive is confirmed, refunded automatically if you cancel.
                  </div>
                )}
                <Link href="/buy-vehicles" style={{ display:"block", background:"transparent", border:`1.5px solid ${T.border}`, color:T.ink2, borderRadius:14, padding:"12px", fontSize:13, fontWeight:600, textDecoration:"none", textAlign:"center" }}>Browse more vehicles</Link>
              </div>
            ) : (
              /* Booking form */
              <div style={{ background:T.card, border:`1.5px solid ${T.border}`, borderRadius:24, overflow:"hidden" }}>
                {/* Header */}
                <div style={{ background:`${T.accent}08`, borderBottom:`1px solid ${T.border}`, padding:"18px 24px" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:T.ink }}>Book Test Drive</div>
                  <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>48-hour test drive · Dealer visits available</div>
                </div>

                {/* Token callout */}
                <div style={{ margin:"16px 24px", background:`${T.accent}12`, border:`1px solid ${T.accent}30`, borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ fontSize:24, fontWeight:900, color:T.accent }}>₹1K</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.accent }}>Token Amount</div>
                    <div style={{ fontSize:10, color:T.ink3 }}>Holds vehicle · Adjustable on purchase</div>
                  </div>
                </div>

                {/* Form fields */}
                <div style={{ padding:"0 24px 24px", display:"grid", gap:14 }}>
                  {[
                    { label:"Your Name *",    val:name,  set:setName,  ph:"Full name",            type:"text" },
                    { label:"Phone Number *", val:phone, set:setPhone, ph:"10-digit mobile number",type:"tel" },
                    { label:"Email (optional)",val:email,set:setEmail, ph:"your@email.com",        type:"email" },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize:11, fontWeight:600, color:T.ink2, marginBottom:6 }}>{f.label}</div>
                      <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                        style={{ width:"100%", background:T.bg, border:`1.5px solid ${T.border}`, color:T.ink, borderRadius:12, padding:"11px 14px", fontSize:13, outline:"none", fontFamily:"inherit", transition:"border-color 0.15s" }}
                        onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}
                      />
                    </div>
                  ))}

                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:T.ink2, marginBottom:6 }}>Preferred Date (within 48hrs)</div>
                    <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                      min={new Date(Date.now()+86400000).toISOString().split("T")[0]}
                      max={new Date(Date.now()+48*3600000).toISOString().split("T")[0]}
                      style={{ width:"100%", background:T.bg, border:`1.5px solid ${T.border}`, color:T.ink, borderRadius:12, padding:"11px 14px", fontSize:13, outline:"none", fontFamily:"inherit", colorScheme:"dark" }}
                      onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}
                    />
                  </div>

                  {err && <div style={{ fontSize:12, color:T.red, background:`${T.red}10`, padding:"8px 12px", borderRadius:10 }}>⚠ {err}</div>}

                  <button onClick={handleBook} disabled={submitting}
                    style={{ background:submitting?T.ink3:T.gradient, border:"none", color:"#000", borderRadius:14, padding:"14px", fontSize:14, fontWeight:800, cursor:submitting?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.15s", marginTop:4 }}>
                    {submitting ? "Opening payment…" : "Pay ₹1,000 & Book →"}
                  </button>

                  <div style={{ fontSize:10, color:T.ink3, textAlign:"center", lineHeight:1.5 }}>
                    By booking, you agree to our terms. Token of ₹1,000 collected at showroom visit.
                  </div>
                </div>

                {/* Dealer info */}
                <div style={{ margin:"0 24px 24px", background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:"14px 16px" }}>
                  <div style={{ fontSize:11, color:T.ink3, marginBottom:6 }}>Dealer</div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{vehicle.dealerName}</div>
                  <div style={{ fontSize:11, color:T.ink2, marginTop:2 }}>📍 {vehicle.district}, {vehicle.state}</div>
                  <a href={`https://wa.me/${vehicle.dealerWhatsapp}`} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:10, background:`${T.accent}15`, color:T.accent, fontSize:11, fontWeight:700, padding:"6px 12px", borderRadius:20, textDecoration:"none" }}>
                    💬 Chat on WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(VehicleDetailPage), { ssr: false })
