"use client"
import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import Link from "next/link"

const T = {
  bg:"#0a0c10", card:"#12151c", cardHov:"#171b24", border:"#1e2330",
  accent:"#00c896", blue:"#3b82f6", orange:"#f97316", purple:"#a855f7",
  ink:"#f0f4ff", ink2:"#8b95b0", ink3:"#4a5468",
  gradient:"linear-gradient(135deg, #00c896 0%, #0ea5e9 100%)",
}

const BRAND_COLORS = { "Tata Motors":"#00c896", "Ola Electric":"#f97316", "Ather Energy":"#3b82f6", "MG":"#ef4444", "Hyundai":"#a855f7", "Bajaj":"#f59e0b", "Kia":"#ec4899", "Mahindra":"#10b981" }

function StarRating({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? "#f59e0b" : T.ink3, fontSize:12 }}>★</span>
      ))}
      <span style={{ fontSize:11, color:T.ink2, marginLeft:4 }}>{rating} ({Math.floor(Math.random()*200+50)})</span>
    </span>
  )
}

function ServiceCard({ sc }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?T.cardHov:T.card, border:`1.5px solid ${hov?T.accent+"50":T.border}`, borderRadius:20, padding:"20px", transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)", transform:hov?"translateY(-3px)":"none", boxShadow:hov?`0 10px 32px ${T.accent}15`:"none" }}>
      
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ width:44, height:44, borderRadius:14, background:`${T.accent}15`, border:`1px solid ${T.accent}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🔧</div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, color: sc.waitTime?.includes("30")||sc.waitTime?.includes("45") ? T.accent : T.orange, fontWeight:700 }}>⏱ {sc.waitTime}</div>
          <div style={{ fontSize:10, color:T.ink3 }}>Est. wait time</div>
        </div>
      </div>

      {/* Name & Address */}
      <div style={{ fontSize:15, fontWeight:800, color:T.ink, marginBottom:4, lineHeight:1.3 }}>{sc.name}</div>
      <div style={{ fontSize:11, color:T.ink3, marginBottom:10 }}>📍 {sc.address}</div>

      {/* Brands */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
        {(sc.brands||[]).map(b => (
          <span key={b} style={{ background:`${BRAND_COLORS[b]||T.blue}20`, color:BRAND_COLORS[b]||T.blue, border:`1px solid ${BRAND_COLORS[b]||T.blue}30`, fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{b}</span>
        ))}
      </div>

      {/* Rating */}
      <div style={{ marginBottom:12 }}>
        <StarRating rating={sc.rating} />
      </div>

      {/* Services */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {(sc.services||[]).slice(0,3).map(s => (
          <span key={s} style={{ background:T.bg, border:`1px solid ${T.border}`, color:T.ink3, fontSize:9.5, padding:"3px 8px", borderRadius:8 }}>{s}</span>
        ))}
        {sc.services?.length > 3 && <span style={{ fontSize:9.5, color:T.ink3, padding:"3px 8px" }}>+{sc.services.length-3} more</span>}
      </div>

      {/* Hours & CTA */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ flex:1, fontSize:11, color:T.ink2 }}>🕐 {sc.hours}</div>
        <a href={`tel:${sc.phone}`} style={{ background:T.gradient, color:"#000", fontSize:11, fontWeight:800, padding:"8px 16px", borderRadius:20, textDecoration:"none" }}>📞 Call</a>
      </div>
    </div>
  )
}

function ServiceCentersPage() {
  const [centers, setCenters] = useState([])
  const [filters, setFilters] = useState({ brands:[], districts:[], states:[] })
  const [loading, setLoading] = useState(true)
  const [brand,   setBrand]   = useState("")
  const [district,setDistrict]= useState("")

  useEffect(() => { load() }, [brand, district])

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (brand)    p.set("brand", brand)
      if (district) p.set("district", district)
      const data = await fetch(`/api/marketplace/service-centers?${p}`).then(r=>r.json())
      if (data.success) { setCenters(data.centers); setFilters(data.filters) }
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing:border-box; }`}</style>

      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(10,12,16,0.92)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${T.border}`, padding:"0 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:32, height:32, background:T.gradient, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#000" }}>E</div>
            <span style={{ fontSize:18, fontWeight:800, color:T.ink }}>EV<span style={{ color:T.accent }}>.CRM</span></span>
          </Link>
          <div style={{ display:"flex", gap:10 }}>
            <Link href="/showroom" style={{ color:T.ink2, fontSize:13, fontWeight:600, textDecoration:"none", padding:"8px 14px", border:`1px solid ${T.border}`, borderRadius:20 }}>🚗 Buy Vehicles</Link>
            <Link href="/charging" style={{ color:T.ink2, fontSize:13, fontWeight:600, textDecoration:"none", padding:"8px 14px", border:`1px solid ${T.border}`, borderRadius:20 }}>⚡ Chargers</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:13, color:T.accent, fontWeight:700, marginBottom:8 }}>🔧 EV SERVICE NETWORK</div>
          <h1 style={{ fontSize:36, fontWeight:900, color:T.ink, margin:0, letterSpacing:"-1px" }}>
            Authorized <span style={{ background:T.gradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Service Centers</span>
          </h1>
          <p style={{ fontSize:14, color:T.ink2, marginTop:10 }}>Find certified EV service centers near you — battery diagnostics, software updates, and repairs.</p>
        </div>

        {/* Filters */}
        <div style={{ display:"flex", gap:10, marginBottom:28, flexWrap:"wrap" }}>
          {[
            { label:"All Brands", val:brand, set:setBrand, opts:[{v:"",l:"All Brands"}, ...filters.brands.map(b=>({v:b,l:b}))] },
            { label:"All Cities", val:district, set:setDistrict, opts:[{v:"",l:"All Cities"}, ...filters.districts.map(d=>({v:d,l:d}))] },
          ].map(sel => (
            <select key={sel.label} value={sel.val} onChange={e=>sel.set(e.target.value)}
              style={{ background:T.card, border:`1.5px solid ${T.border}`, color:sel.val?T.ink:T.ink2, borderRadius:20, padding:"9px 16px", fontSize:12, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
              {sel.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
          <div style={{ marginLeft:"auto", background:`${T.accent}10`, border:`1px solid ${T.accent}25`, borderRadius:20, padding:"9px 16px", fontSize:12, color:T.accent, fontWeight:700 }}>
            {centers.length} centers found
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:18 }}>
            {[...Array(4)].map((_,i)=><div key={i} style={{ height:300, background:T.card, borderRadius:20, border:`1px solid ${T.border}` }}/>)}
          </div>
        ) : centers.length === 0 ? (
          <div style={{ textAlign:"center", padding:80 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔧</div>
            <div style={{ fontSize:18, fontWeight:800, color:T.ink }}>No centers found</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:18 }}>
            {centers.map(sc => <ServiceCard key={sc.id} sc={sc} />)}
          </div>
        )}

        {/* Info banner */}
        <div style={{ marginTop:48, background:T.card, border:`1px solid ${T.border}`, borderRadius:20, padding:"24px 28px", display:"flex", gap:32, alignItems:"center" }}>
          <div style={{ fontSize:40 }}>🏆</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:T.ink, marginBottom:4 }}>List Your Service Center</div>
            <div style={{ fontSize:13, color:T.ink2 }}>Are you an authorized EV service provider? Join our network and get high-intent customers.</div>
          </div>
          <a href="mailto:partners@evcrm.in" style={{ marginLeft:"auto", background:T.gradient, color:"#000", fontWeight:800, fontSize:13, padding:"12px 24px", borderRadius:20, textDecoration:"none", whiteSpace:"nowrap" }}>Contact Us →</a>
        </div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(ServiceCentersPage), { ssr: false })
