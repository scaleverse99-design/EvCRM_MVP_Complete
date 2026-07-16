"use client"
import dynamic from "next/dynamic"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { bookTestDrive } from "../../lib/payments/tokenBooking"

/* ── Design tokens ─────────────────────────── */
const T = {
  bg:      "#0a0c10",
  card:    "#12151c",
  cardHov: "#171b24",
  border:  "#1e2330",
  accent:  "#00c896",
  accentD: "#009e78",
  blue:    "#3b82f6",
  orange:  "#f97316",
  purple:  "#a855f7",
  red:     "#ef4444",
  ink:     "#f0f4ff",
  ink2:    "#8b95b0",
  ink3:    "#4a5468",
  gradient:"linear-gradient(135deg, #00c896 0%, #0ea5e9 100%)",
}

const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN")
const fmtEmi = (n) => "₹" + Number(n).toLocaleString("en-IN") + "/mo"

/* ── Static filter options ─────────────────── */
const TYPE_OPTS  = [{ v:"", l:"All Types" }, { v:"2W", l:"2-Wheeler" }, { v:"4W", l:"4-Wheeler" }, { v:"3W", l:"3-Wheeler" }]
const SORT_OPTS  = [{ v:"default", l:"Relevance" }, { v:"price_asc", l:"Price ↑" }, { v:"price_desc", l:"Price ↓" }, { v:"range_desc", l:"Range ↓" }, { v:"rating_desc", l:"Rating ↓" }]
const RANGE_OPTS = [{ v:"", l:"Any Range" }, { v:"100", l:"100+ km" }, { v:"200", l:"200+ km" }, { v:"300", l:"300+ km" }, { v:"400", l:"400+ km" }]
const TAGS_HIGHLIGHT = ["bestseller", "long-range", "budget-friendly", "premium", "city-ev"]

/* ── Vehicle card ──────────────────────────── */
function VehicleCard({ v, onBook }) {
  const [hov, setHov] = useState(false)
  const tagColor = { bestseller:T.accent, "long-range":T.blue, "budget-friendly":T.orange, premium:T.purple, "city-ev":T.red, "ultra-fast-charge":T.blue }
  
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.cardHov : T.card, border:`1.5px solid ${hov ? T.accent+"40" : T.border}`, borderRadius:20, overflow:"hidden", transition:"all 0.22s cubic-bezier(0.4,0,0.2,1)", cursor:"pointer", display:"flex", flexDirection:"column", transform: hov ? "translateY(-4px)" : "none", boxShadow: hov ? `0 12px 40px ${T.accent}18` : "none" }}
    >
      {/* Image area */}
      <div style={{ position:"relative", background:`linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%)`, height:180, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        <div style={{ fontSize:72, filter:"drop-shadow(0 8px 24px rgba(0,200,150,0.2))", transition:"transform 0.3s", transform: hov ? "scale(1.08)" : "scale(1)" }}>{v.images?.[0] || "🚗"}</div>
        {/* Tags */}
        <div style={{ position:"absolute", top:12, left:12, display:"flex", gap:6, flexWrap:"wrap" }}>
          {(v.tags||[]).slice(0,2).map(t => (
            <span key={t} style={{ background:tagColor[t]||T.accent, color:"#000", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:20, letterSpacing:"0.5px", textTransform:"uppercase" }}>{t}</span>
          ))}
        </div>
        {/* Condition badge */}
        <div style={{ position:"absolute", top:12, right:12, background: v.condition==="new" ? `${T.accent}20` : `${T.orange}20`, border:`1px solid ${v.condition==="new" ? T.accent : T.orange}`, color:v.condition==="new"?T.accent:T.orange, fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>
          {v.condition === "new" ? "NEW" : `${v.km?.toLocaleString()} km`}
        </div>
        {/* Range pill at bottom */}
        <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", border:`1px solid ${T.border}`, color:T.accent, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, whiteSpace:"nowrap" }}>
          ⚡ {v.range} km range
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:"16px 18px 18px", flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ fontSize:11, color:T.ink2, marginBottom:4 }}>{v.brand} · {v.bodyType}</div>
        <div style={{ fontSize:17, fontWeight:800, color:T.ink, marginBottom:2, lineHeight:1.2 }}>{v.model}</div>
        <div style={{ fontSize:11, color:T.ink3, marginBottom:12 }}>{v.variant}</div>

        {/* Stats row */}
        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          {[["🔋", v.batteryCapacity||"—"], ["🏎", v.topSpeed+"km/h"], ["⭐", v.rating]].map(([icon, val], i) => (
            <div key={i} style={{ flex:1, background:T.bg, borderRadius:10, padding:"6px 8px", textAlign:"center" }}>
              <div style={{ fontSize:12 }}>{icon}</div>
              <div style={{ fontSize:10, fontWeight:700, color:T.ink2, marginTop:2 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Price */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:22, fontWeight:900, color:T.ink, letterSpacing:"-0.5px" }}>{fmt(v.exShowroom)}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
            <span style={{ fontSize:11, color:T.ink3 }}>Ex-showroom</span>
            <span style={{ fontSize:11, color:T.accent, fontWeight:600 }}>{fmtEmi(v.emi)} EMI</span>
          </div>
        </div>

        {/* Dealer */}
        <div style={{ fontSize:10, color:T.ink3, marginBottom:14 }}>🏪 {v.dealerName} · {v.district}</div>

        {/* CTAs */}
        <div style={{ display:"flex", gap:8, marginTop:"auto" }}>
          <Link href={`/vehicles/${v.id}`} style={{ flex:1, background:T.bg, border:`1.5px solid ${T.border}`, color:T.ink, borderRadius:12, padding:"10px 0", fontSize:12, fontWeight:700, textAlign:"center", textDecoration:"none", transition:"all 0.15s" }}>
            View Details
          </Link>
          <button onClick={(e) => { e.stopPropagation(); onBook(v) }}
            style={{ flex:1.5, background:T.gradient, border:"none", color:"#000", borderRadius:12, padding:"10px 0", fontSize:12, fontWeight:800, cursor:"pointer", letterSpacing:"0.3px" }}>
            Book Test Drive →
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Filter Chip ────────────────────────────── */
function Chip({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{ background: active ? (color||T.accent) : "transparent", color: active ? "#000" : T.ink2, border:`1.5px solid ${active ? (color||T.accent) : T.border}`, borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:active?700:500, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s", fontFamily:"inherit" }}>
      {label}
    </button>
  )
}

/* ── Booking Modal ──────────────────────────── */
function BookingModal({ vehicle, onClose }) {
  const [name, setName]         = useState("")
  const [phone, setPhone]       = useState("")
  const [email, setEmail]       = useState("")
  const [date, setDate]         = useState("")
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(null)
  const [error, setError]       = useState("")

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const maxDate  = new Date(Date.now() + 48 * 3600000).toISOString().split("T")[0]

  const handleBook = async () => {
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required"); return }
    if (phone.replace(/\D/g,"").length < 10) { setError("Enter a valid 10-digit phone number"); return }
    setError(""); setLoading(true)
    try {
      const booking = await bookTestDrive({ vehicleId:vehicle.id, name:name.trim(), phone:phone.trim(), email:email.trim(), preferredDate:date||null })
      setSuccess(booking)
    } catch (e) { setError(e.message || "Booking failed") }
    finally  { setLoading(false) }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:T.card, border:`1.5px solid ${T.border}`, borderRadius:24, width:"100%", maxWidth:480, overflow:"hidden", animation:"modalIn 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(10px) } to { opacity:1; transform:none } }`}</style>

        {success ? (
          /* Success state */
          <div style={{ padding:40, textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:900, color:T.ink, marginBottom:8 }}>Test Drive Booked!</div>
            <div style={{ fontSize:14, color:T.ink2, marginBottom:20, lineHeight:1.6 }}>
              Your test drive for <b style={{ color:T.ink }}>{success.vehicleName}</b> is confirmed.<br/>
              The dealer <b style={{ color:T.ink }}>{success.dealerName}</b> will call you within 2 hours.
            </div>
            <div style={{ background:`${T.accent}15`, border:`1px solid ${T.accent}30`, borderRadius:14, padding:"14px 20px", marginBottom:20 }}>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:4 }}>Token Amount (Hold vehicle 48hrs)</div>
              <div style={{ fontSize:28, fontWeight:900, color:T.accent }}>₹1,000</div>
              <div style={{ fontSize:11, color:T.ink3, marginTop:4 }}>Adjustable against final purchase price</div>
            </div>
            {success.viaGateway === false ? (
              <div style={{ background:`${T.orange}10`, border:`1px solid ${T.orange}20`, borderRadius:12, padding:"10px 16px", marginBottom:24, fontSize:12, color:T.orange, textAlign:"left" }}>
                ⚠️ Payment gateway not yet configured for this environment. Your booking is confirmed — the dealer will collect ₹1,000 token at showroom visit.
              </div>
            ) : (
              <div style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}20`, borderRadius:12, padding:"10px 16px", marginBottom:24, fontSize:12, color:T.accent, textAlign:"left" }}>
                ✓ Your ₹1,000 is held securely by Razorpay — it's only released to the dealer once your test drive is confirmed, and refunded automatically if you cancel.
              </div>
            )}
            <button onClick={onClose} style={{ background:T.gradient, border:"none", color:"#000", borderRadius:14, padding:"14px 40px", fontSize:14, fontWeight:800, cursor:"pointer", width:"100%", fontFamily:"inherit" }}>
              Done ✓
            </button>
          </div>
        ) : (
          /* Form */
          <>
            <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:T.ink }}>Book Test Drive</div>
                <div style={{ fontSize:12, color:T.ink2, marginTop:2 }}>{vehicle.brand} {vehicle.model} · {vehicle.dealerName}</div>
              </div>
              <button onClick={onClose} style={{ background:T.bg, border:`1px solid ${T.border}`, color:T.ink2, borderRadius:10, width:32, height:32, cursor:"pointer", fontSize:16, fontFamily:"inherit" }}>✕</button>
            </div>

            <div style={{ padding:"20px 24px" }}>
              {/* Token info */}
              <div style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}25`, borderRadius:14, padding:"12px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:28, fontWeight:900, color:T.accent }}>₹1,000</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.accent }}>Token Amount</div>
                  <div style={{ fontSize:11, color:T.ink3 }}>Holds vehicle for 48hrs · Adjustable on purchase</div>
                </div>
              </div>

              <div style={{ display:"grid", gap:14 }}>
                {[
                  { label:"Your Name *",   val:name,  set:setName,  ph:"Full name" },
                  { label:"Phone Number *",val:phone, set:setPhone, ph:"10-digit mobile number", type:"tel" },
                  { label:"Email (optional)",val:email,set:setEmail,ph:"your@email.com", type:"email" },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize:11, fontWeight:600, color:T.ink2, marginBottom:6 }}>{f.label}</div>
                    <input type={f.type||"text"} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                      style={{ width:"100%", background:T.bg, border:`1.5px solid ${T.border}`, color:T.ink, borderRadius:12, padding:"11px 14px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color 0.15s" }}
                      onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}
                    />
                  </div>
                ))}

                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:T.ink2, marginBottom:6 }}>Preferred Date (within 48hrs)</div>
                  <input type="date" value={date} min={tomorrow} max={maxDate} onChange={e=>setDate(e.target.value)}
                    style={{ width:"100%", background:T.bg, border:`1.5px solid ${T.border}`, color:T.ink, borderRadius:12, padding:"11px 14px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box", colorScheme:"dark" }}
                    onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}
                  />
                </div>
              </div>

              {error && <div style={{ fontSize:12, color:T.red, marginTop:12, background:`${T.red}10`, padding:"8px 12px", borderRadius:10 }}>⚠ {error}</div>}

              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button onClick={onClose} style={{ flex:1, background:"transparent", border:`1.5px solid ${T.border}`, color:T.ink2, borderRadius:12, padding:"12px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                <button onClick={handleBook} disabled={loading}
                  style={{ flex:2, background: loading ? T.ink3 : T.gradient, border:"none", color:"#000", borderRadius:12, padding:"12px", fontSize:13, fontWeight:800, cursor: loading?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                  {loading ? "Opening payment…" : "Pay ₹1,000 & Book →"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────── */
function BuyVehiclesPage() {
  const router = useRouter()

  const [vehicles, setVehicles] = useState([])
  const [filters,  setFilters]  = useState({ brands:[], districts:[], types:[] })
  const [loading,  setLoading]  = useState(true)

  // Active filters
  const [type,     setType]     = useState("")
  const [brand,    setBrand]    = useState("")
  const [district, setDistrict] = useState("")
  const [minRange, setMinRange] = useState("")
  const [sort,     setSort]     = useState("default")
  const [q,        setQ]        = useState("")
  const [bookVehicle, setBookVehicle] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (type)     params.set("type",     type)
      if (brand)    params.set("brand",    brand)
      if (district) params.set("district", district)
      if (minRange) params.set("minRange", minRange)
      if (sort !== "default") params.set("sort", sort)
      if (q)        params.set("q",        q)
      const res  = await fetch(`/api/marketplace/vehicles?${params}`)
      const data = await res.json()
      if (data.success) { setVehicles(data.vehicles); setFilters(data.filters) }
    } finally { setLoading(false) }
  }, [type, brand, district, minRange, sort, q])

  useEffect(() => { load() }, [load])

  const typeIconMap = { "2W":"🛵", "4W":"🚗", "3W":"🛺" }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter', -apple-system, sans-serif" }}>
      <style>{`
        * { box-sizing:border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:${T.bg}; } ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        @keyframes shimmer { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
        .bv-nav-search { flex: 1; max-width: 480px; margin: 0 32px; position: relative; }
        .bv-nav-links { display: flex; gap: 10px; }
        .bv-hero-title { font-size: 40px; font-weight: 900; letter-spacing: -1px; line-height: 1.1; }
        .bv-vehicle-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .bv-trust-bar { display: flex; justify-content: center; gap: 40px; margin-top: 56px; padding-top: 40px; border-top: 1px solid ${T.border}; }
        .bv-filter-chips { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        @media (max-width: 768px) {
          .bv-nav-search { display: none !important; }
          .bv-nav-links { display: none !important; }
          .bv-hero-title { font-size: 26px; letter-spacing: -0.5px; }
          .bv-vehicle-grid { grid-template-columns: 1fr; gap: 16px; }
          .bv-trust-bar { flex-wrap: wrap; gap: 20px; margin-top: 32px; padding-top: 24px; }
          .bv-trust-bar > div { width: calc(50% - 10px); }
          .bv-filter-chips { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
          .bv-filter-chips::-webkit-scrollbar { display: none; }
        }
        @media (max-width: 480px) {
          .bv-hero-title { font-size: 22px; }
        }
      `}</style>

      {/* ── Top Nav ─── */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(10,12,16,0.92)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${T.border}`, padding:"0 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:32, height:32, background:T.gradient, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#000" }}>E</div>
            <span style={{ fontSize:18, fontWeight:800, color:T.ink }}>EV<span style={{ color:T.accent }}>.CRM</span></span>
          </Link>

          {/* Search */}
          <div className="bv-nav-search">
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16 }}>🔍</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search brand, model, type…"
              style={{ width:"100%", background:T.card, border:`1.5px solid ${T.border}`, color:T.ink, borderRadius:40, padding:"10px 16px 10px 42px", fontSize:13, outline:"none", fontFamily:"inherit", transition:"border-color 0.15s" }}
              onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}
            />
          </div>

          <div className="bv-nav-links">
            <Link href="/charging" style={{ color:T.ink2, fontSize:13, fontWeight:600, textDecoration:"none", padding:"8px 14px", border:`1px solid ${T.border}`, borderRadius:20 }}>⚡ Chargers</Link>
            <Link href="/service-centers"   style={{ color:T.ink2, fontSize:13, fontWeight:600, textDecoration:"none", padding:"8px 14px", border:`1px solid ${T.border}`, borderRadius:20 }}>🔧 Service</Link>
            <Link href="/dealer" style={{ background:T.gradient, color:"#000", fontSize:13, fontWeight:800, textDecoration:"none", padding:"8px 18px", borderRadius:20 }}>CRM Portal</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─── */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 24px 24px" }}>
        <div style={{ marginBottom:32, textAlign:"center" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${T.accent}10`, border:`1px solid ${T.accent}25`, borderRadius:20, padding:"6px 16px", marginBottom:16 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:T.accent, animation:"pulse 1.5s infinite" }}/>
            <span style={{ fontSize:12, fontWeight:700, color:T.accent }}>LIVE INVENTORY — {vehicles.length} vehicles available</span>
          </div>
          <h1 className="bv-hero-title" style={{ color:T.ink, margin:0 }}>
            Buy Your Dream <span style={{ background:T.gradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Electric Vehicle</span>
          </h1>
          <p style={{ fontSize:15, color:T.ink2, marginTop:12, maxWidth:540, margin:"12px auto 0" }}>
            Browse certified EV inventory from trusted dealers. Book a 48-hour test drive with just ₹1,000 token.
          </p>
        </div>

        {/* ── Filter bar ─── */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, padding:"16px 20px", marginBottom:28 }}>
          {/* Type chips */}
          <div className="bv-filter-chips" style={{ marginBottom:14 }}>
            <span style={{ fontSize:11, fontWeight:700, color:T.ink3, marginRight:4 }}>TYPE</span>
            {TYPE_OPTS.map(o => <Chip key={o.v} label={`${typeIconMap[o.v]||""} ${o.l}`.trim()} active={type===o.v} onClick={() => setType(o.v)} />)}
          </div>
          {/* Brand + District + Range + Sort */}
          <div className="bv-filter-chips">
            <span style={{ fontSize:11, fontWeight:700, color:T.ink3, marginRight:4 }}>FILTER</span>
            {[
              { label:"All Brands", value:brand, set:setBrand, opts:[{ v:"", l:"All Brands" }, ...filters.brands.map(b=>({ v:b, l:b }))] },
              { label:"All Cities", value:district, set:setDistrict, opts:[{ v:"", l:"All Cities" }, ...filters.districts.map(d=>({ v:d, l:d }))] },
              { label:"Any Range",  value:minRange, set:setMinRange, opts:RANGE_OPTS },
              { label:"Sort by",    value:sort,     set:setSort,     opts:SORT_OPTS },
            ].map(sel => (
              <select key={sel.label} value={sel.value} onChange={e=>sel.set(e.target.value)}
                style={{ background:T.bg, border:`1.5px solid ${T.border}`, color:sel.value ? T.ink : T.ink2, borderRadius:20, padding:"7px 14px", fontSize:12, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                {sel.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ))}

            {(type||brand||district||minRange) && (
              <button onClick={() => { setType(""); setBrand(""); setDistrict(""); setMinRange(""); setSort("default") }}
                style={{ background:`${T.red}15`, border:`1px solid ${T.red}30`, color:T.red, borderRadius:20, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                ✕ Clear filters
              </button>
            )}
          </div>
          {/* Tag highlights */}
          <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:700, color:T.ink3, marginRight:4 }}>POPULAR</span>
            {TAGS_HIGHLIGHT.map(t => (
              <Link key={t} href={`/buy-vehicles?tag=${t}`} style={{ background:T.bg, border:`1px solid ${T.border}`, color:T.ink3, fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, textDecoration:"none", textTransform:"capitalize" }}>#{t}</Link>
            ))}
          </div>
        </div>

        {/* ── Grid ─── */}
        {loading ? (
          <div className="bv-vehicle-grid">
            {[...Array(6)].map((_,i) => (
              <div key={i} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:20, height:420, background:`linear-gradient(90deg, ${T.card} 25%, ${T.cardHov} 50%, ${T.card} 75%)`, backgroundSize:"200% 100%", animation:"shimmer 1.5s infinite" }}/>
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 20px" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
            <div style={{ fontSize:20, fontWeight:800, color:T.ink, marginBottom:8 }}>No vehicles found</div>
            <div style={{ fontSize:14, color:T.ink2 }}>Try adjusting your filters or search query</div>
          </div>
        ) : (
          <div className="bv-vehicle-grid">
            {vehicles.map(v => <VehicleCard key={v.id} v={v} onBook={setBookVehicle} />)}
          </div>
        )}

        {/* ── Bottom trust bar ─── */}
        <div className="bv-trust-bar">
          {[["🔒","Secure Booking","₹1K token, adjustable"], ["🚗","Free Test Drive","48-hour trial period"], ["✅","Certified Dealers","Verified & rated"], ["🤝","Finance Assist","Dealer-aligned EMI options"]].map(([icon, label, sub]) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{label}</div>
              <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {bookVehicle && <BookingModal vehicle={bookVehicle} onClose={() => { setBookVehicle(null); load() }} />}
    </div>
  )
}

export default dynamic(() => Promise.resolve(BuyVehiclesPage), { ssr: false })
