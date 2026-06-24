"use client"
import { useState, useEffect } from "react"
import { Tag } from "../../components/ui"
import { C, fmt } from "../../lib/constants"
import { getShowroomProducts } from "../../lib/data"
import { db } from "../../lib/firebase-client"
import { collection, addDoc, getDocs, query, serverTimestamp } from "firebase/firestore"
import VehicleCard from "../../components/marketplace/VehicleCard"
import RazorpayCheckout from "../../components/marketplace/RazorpayCheckout"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"

export default function ShowroomPage() {
  const [filter,   setFilter]   = useState("All")
  const [brandFilter, setBrandFilter] = useState("All Brands")
  const [selected, setSelected] = useState(null)
  const [booked,   setBooked]   = useState(false)
  const [booking,  setBooking]  = useState(false)
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  
  // ── Load Products ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        if (!db) throw new Error("Firestore not initialized")
        const q = query(collection(db, "evcrm_vehicles"))
        const snap = await getDocs(q)
        if (snap.empty) {
          setProducts(getShowroomProducts())
        } else {
          setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        }
      } catch (err) {
        setProducts(getShowroomProducts())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const types    = ["All","Scooter","4W SUV", "3W Cargo"]
  const brands   = ["All Brands", ...new Set(products.map(p => p.brand))].filter(Boolean)
  
  const filtered = products.filter(p => {
    const typeMatch = filter === "All" || p.type?.includes(filter)
    const brandMatch = brandFilter === "All Brands" || p.brand === brandFilter
    return typeMatch && brandMatch
  })

  const handleBooking = async (productId, direct = false) => {
    if (direct) {
      const p = products.find(x => x.id === productId)
      doBook(p)
    } else {
      setSelected(productId)
    }
  }

  const doBook = async (product, paymentId = "MOCKED") => {
    setBooking(true)
    try {
      await addDoc(collection(db, "evcrm_leads"), {
        name: "Public Customer", 
        phone: "9876543210", 
        vehicle: `${product.brand} ${product.model}`,
        source: "showroom",
        status: "NEW",
        score: 85,
        paymentId,
        created_at: new Date().toISOString(),
        timestamp: serverTimestamp(),
        notes: `Customer blocked ${product.brand} ${product.model} from showroom. Payment: ${paymentId}`
      })
      setBooked(true)
      setSelected(null)
    } catch (err) {
      alert("Failed to create booking.")
    } finally {
      setBooking(false)
    }
  }

  const baseStyle = { minHeight:"100vh", fontFamily:"'Inter','DM Sans',sans-serif", background:"#FAFAFA" }

  if (booked) return (
    <div style={{ ...baseStyle, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ background:"#fff", borderRadius:28, padding:48, maxWidth:400, width:"100%", textAlign:"center", boxShadow:"0 30px 100px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize:64, marginBottom:24 }}>🎉</div>
        <div style={{ fontSize:24, fontWeight:900, color:C.ink, marginBottom:12, letterSpacing:"-0.5px" }}>Booking Secured!</div>
        <div style={{ fontSize:14, color:C.ink3, lineHeight:1.8, marginBottom:32 }}>Your expert mobility asset has been reserved. An EV.OS specialist will call you shortly.</div>
        <button onClick={()=>setBooked(false)} style={{ background:C.ink, color:"#fff", border:"none", borderRadius:16, padding:"16px 32px", fontSize:14, fontWeight:800, cursor:"pointer", width:"100%" }}>Return to Marketplace</button>
      </div>
    </div>
  )

  if (selected) {
    const p   = products.find(x=>x.id===selected)
    const net = p.exShowroom - (p.fame2||0) - (p.stateSubsidy||0)
    return (
      <div style={baseStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
        <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <button onClick={()=>setSelected(null)} style={{ background:"#f1f5f9", border:"none", color:C.ink, borderRadius:12, padding:"8px 16px", cursor:"pointer", fontSize:12, fontWeight:800 }}>← BACK</button>
          <div style={{ fontSize:16, fontWeight:900, color:C.ink }}>EV<span style={{ color:C.green }}>.CRM</span> Marketplace</div>
          <div style={{ width:70 }} />
        </div>
        
        <div style={{ maxWidth:1000, margin:"0 auto", padding:40, display:"grid", gridTemplateColumns:"1fr 400px", gap:40 }}>
           <div>
              <div style={{ background:"#fff", borderRadius:32, border:`1px solid ${C.border}`, padding:40, textAlign:"center", marginBottom:32 }}>
                 <div style={{ fontSize:120, margin:"20px 0" }}>{p.type?.includes("4W") ? "SUV" : "🛵"}</div>
                 <h1 style={{ fontSize:40, fontWeight:900, color:C.ink, margin:0 }}>{p.brand} {p.model}</h1>
                 <p style={{ fontSize:16, color:C.ink3, marginTop:8 }}>Expert Vetted · {p.type}</p>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:20 }}>
                 {[{l:"REAL RANGE",v:`${p.range}km`,i:"🔋"},{l:"TOP SPEED",v:`${p.topSpeed}km/h`,i:"⚡"},{l:"CHARGE TIME",v:`${p.chargeTime}min`,i:"🕒"}].map((s,i)=>(
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:24, padding:24, textAlign:"center" }}>
                       <div style={{ fontSize:20, marginBottom:10 }}>{s.i}</div>
                       <div style={{ fontSize:18, fontWeight:900, color:C.ink }}>{s.v}</div>
                       <div style={{ fontSize:10, fontWeight:800, color:C.ink3, marginTop:4 }}>{s.l}</div>
                    </div>
                 ))}
              </div>
           </div>

           <aside>
              <div style={{ background:C.ink, borderRadius:32, padding:32, color:"#fff", position:"sticky", top:100 }}>
                 <div style={{ fontSize:12, fontWeight:900, color:C.green, textTransform:"uppercase", letterSpacing:1, marginBottom:24 }}>Price Breakdown</div>
                 
                 {[[`Ex-showroom`,fmt.currency(p.exShowroom)],p.fame2>0&&[`FAME-II Subsidy`,`−${fmt.currency(p.fame2)}`],p.stateSubsidy>0&&[`State Incentive`,`−${fmt.currency(p.stateSubsidy)}`]].filter(Boolean).map((r,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:i<2?`1px solid rgba(255,255,255,0.1)`:"none" }}>
                       <span style={{ fontSize:14, opacity:0.6 }}>{r[0]}</span>
                       <span style={{ fontSize:14, fontWeight:700 }}>{r[1]}</span>
                    </div>
                 ))}

                 <div style={{ marginTop:24, pt:24, borderTop:"2px solid rgba(255,255,255,0.2)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:16, fontWeight:800 }}>NETT PRICE</span>
                    <span style={{ fontSize:28, fontWeight:900, color:C.green }}>{fmt.currency(net)}</span>
                 </div>

                 <div style={{ marginTop:40 }}>
                    {p.available ? (
                       <RazorpayCheckout amount={10000} product={p} onSuccess={(pid) => doBook(p, pid)} onCancel={() => {}} />
                    ) : (
                       <button onClick={()=>doBook(p)} style={{ width:"100%", background:"#fff", color:C.ink, border:"none", borderRadius:16, padding:18, fontSize:14, fontWeight:900, cursor:"pointer" }}>JOIN WAITLIST →</button>
                    )}
                    <p style={{ textAlign:"center", fontSize:11, opacity:0.4, marginTop:16 }}>Fully refundable token booking</p>
                 </div>
              </div>
           </aside>
        </div>
      </div>
    )
  }

  return (
    <div style={baseStyle}>
      <TopBar />
      <div style={{ background:C.ink, padding:"60px 24px", textAlign:"center", color:"#fff" }}>
         <h1 style={{ fontSize:48, fontWeight:900, letterSpacing:"-1.5px", marginBottom:12 }}>Expert Vetted Marketplace</h1>
         <p style={{ fontSize:16, opacity:0.6, maxWidth:600, margin:"0 auto" }}>Discover high-performance electric mobility, hand-picked by EV.OS intelligence for the Indian road.</p>
      </div>

      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, position:"sticky", top:70, zIndex:80 }}>
         <div style={{ maxWidth:1200, margin:"0 auto", padding:"16px 24px", display:"flex", gap:20, alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:900, color:C.ink2 }}>FILTERS:</span>
            <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ padding:"8px 14px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontWeight:700 }}>
               {types.map(t=><option key={t}>{t}</option>)}
            </select>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} style={{ padding:"8px 14px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontWeight:700 }}>
               {brands.map(b=><option key={b}>{b}</option>)}
            </select>
            <div style={{ marginLeft:"auto", fontSize:12, fontWeight:700, color:C.ink3 }}>{filtered.length} Models Found</div>
         </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 24px 80px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:100, color:C.ink3 }}>Analyzing Inventory...</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:32 }}>
            {filtered.map(p => (
              <VehicleCard key={p.id} product={p} booking={booking} onClick={(id, direct) => handleBooking(id, direct)} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
