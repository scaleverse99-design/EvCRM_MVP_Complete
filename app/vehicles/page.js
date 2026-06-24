"use client"
import { useState, useEffect } from "react"
import Shell from "../../components/layout/Shell"
import { Card, Tag, Btn, Modal } from "../../components/ui"
import { C, fmt, STOCK_CONFIG } from "../../lib/constants"
import { getVehicles } from "../../lib/data"
import { db } from "../../lib/firebase-client"
import { collection, getDocs, query } from "firebase/firestore"

export default function VehiclesPage() {
  const [orderModal,  setOrderModal]  = useState(null)
  const [captureModal,setCaptureModal]= useState(null)
  const [toast,       setToast]       = useState("")
  const [vehicles,    setVehicles]    = useState([])
  const [loading,     setLoading]     = useState(true)

  // ── Load Inventory ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        if (!db) throw new Error("Firestore not initialized")
        const q = query(collection(db, "evcrm_vehicles"))
        const snap = await getDocs(q)
        if (snap.empty) {
          setVehicles(getVehicles())
        } else {
          setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        }
      } catch (err) {
        console.warn("Firestore load failed, using mock data:", err.message)
        setVehicles(getVehicles())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),2500) }

  if (loading) return <Shell title="Vehicle Intelligence"><div style={{ textAlign:"center", padding:40 }}>Loading inventory...</div></Shell>

  return (
    <Shell title="Vehicle Intelligence">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>Vehicle Intelligence</h1>
          <p style={{ fontSize:12, color:C.ink3 }}>Inventory status, demand tracking and smart ordering</p>
        </div>
      </div>

      {/* Alert summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {[
          { v:vehicles.filter(x=>x.status==="NO_STOCK").length, l:"No Stock + High Demand", c:C.red    },
          { v:vehicles.filter(x=>x.status==="DEAD").length,     l:"Dead Stock Risk",         c:C.orange },
          { v:vehicles.filter(x=>x.status==="LOW").length,      l:"Low Stock",               c:C.yellow },
        ].map((a,i)=>(
          <div key={i} style={{ background:C.card, border:`1.5px solid ${a.c}30`, borderRadius:12, padding:"14px 18px", display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ fontSize:28, fontWeight:900, color:a.c }}>{a.v}</div>
            <div style={{ fontSize:12, color:C.ink2 }}>{a.l}</div>
          </div>
        ))}
      </div>

      {/* Vehicle table */}
      <Card noPad>
        <div style={{ padding:"14px 18px 12px", borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Inventory Status ({vehicles.length} vehicles)</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
              {["Vehicle","Type","Price","Stock","Demand","30d Trend","Status","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:C.ink3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v,i)=>{
              const st = STOCK_CONFIG[v.status]||STOCK_CONFIG.OK
              return (
                <tr key={v.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{v.brand} {v.model}</div>
                    <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>{v.spec || `${v.range}km range`}</div>
                  </td>
                  <td style={{ padding:"14px 16px" }}><Tag label={v.type} color={C.blue} /></td>
                  <td style={{ padding:"14px 16px" }}><span style={{ fontSize:13, fontWeight:700, color:C.ink2 }}>{fmt.currency(v.exShowroom || v.price)}</span></td>
                  <td style={{ padding:"14px 16px" }}><span style={{ fontSize:18, fontWeight:900, color:v.stock===0?C.red:v.stock<4?C.orange:C.green }}>{v.stock || 0}</span></td>
                  <td style={{ padding:"14px 16px" }}><span style={{ fontSize:18, fontWeight:900, color:C.blue }}>{v.demand || 0}</span></td>
                  <td style={{ padding:"14px 16px" }}><span style={{ fontSize:15, fontWeight:800, color:v.trend?.startsWith("+")?C.green:C.red }}>{v.trend || "0%"}</span></td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{ background:st.bg, color:st.color, fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20 }}>{st.label}</span>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      {(v.status==="NO_STOCK"||v.status==="LOW") && (
                        <button onClick={()=>setOrderModal(v)} style={{ background:C.greenL, border:`1px solid ${C.green}30`, color:C.greenD, borderRadius:8, padding:"6px 12px", fontSize:10.5, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>📦 Order Stock</button>
                      )}
                      {v.status==="NO_STOCK" && (
                        <button onClick={()=>setCaptureModal(v)} style={{ background:C.blueL, border:`1px solid ${C.blue}30`, color:C.blue, borderRadius:8, padding:"6px 12px", fontSize:10.5, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>+ Waitlist</button>
                      )}
                      {v.status==="DEAD" && (
                        <button style={{ background:"#FEE2E2", border:`1px solid ${C.red}30`, color:C.red, borderRadius:8, padding:"6px 12px", fontSize:10.5, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>🔴 Recovery</button>
                      )}
                      {v.status==="OK" && (
                        <span style={{ fontSize:11, color:C.green, fontWeight:600 }}>✅ Healthy</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {/* Order Modal */}
      {orderModal && (
        <Modal title="Raise Stock Request" onClose={()=>setOrderModal(null)}>
          <div style={{ fontSize:12, color:C.ink3, marginBottom:16 }}>{orderModal.brand} {orderModal.model} · {fmt.currency(orderModal.exShowroom || orderModal.price)}</div>
          <div style={{ display:"flex", gap:16, background:C.bg, borderRadius:12, padding:16, marginBottom:16, border:`1px solid ${C.border}` }}>
            {[{v:orderModal.stock || 0,l:"In Stock",c:C.red},{v:orderModal.demand || 0,l:"Demand",c:C.orange},{v:orderModal.waitlist?.length||0,l:"Waitlisted",c:C.green}].map((s,i)=>(
              <div key={i} style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:26, fontWeight:900, color:s.c }}>{s.v}</div>
                <div style={{ fontSize:10, color:C.ink3, marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>
          {orderModal.waitlist?.slice(0,4).map((c,i)=>(
            <div key={i} style={{ background:C.bg, borderRadius:9, padding:"8px 12px", marginBottom:6, display:"flex", justifyContent:"space-between", border:`1px solid ${C.border}` }}>
              <div><div style={{ fontSize:11, fontWeight:600, color:C.ink }}>{c.name}</div><div style={{ fontSize:10, color:C.ink3 }}>{c.note}</div></div>
              <span style={{ fontSize:10.5, color:C.blue }}>{c.phone}</span>
            </div>
          ))}
          <div style={{ textAlign:"center", margin:"16px 0" }}>
            <div style={{ fontSize:36, fontWeight:900, color:C.green }}>{orderModal.suggestOrder||10}</div>
            <div style={{ fontSize:11, color:C.ink3 }}>AI suggested quantity (30-day demand)</div>
          </div>
          <Btn onClick={()=>{ setOrderModal(null); showToast(`📦 Order raised — ${orderModal.suggestOrder||10} units of ${orderModal.model}`) }} style={{ width:"100%" }}>
            🚀 Raise Order — {orderModal.suggestOrder||10} Units
          </Btn>
        </Modal>
      )}

      {captureModal && (
        <Modal title="Capture Customer Requirement" onClose={()=>setCaptureModal(null)}>
          <div style={{ fontSize:12, color:C.ink3, marginBottom:16 }}>{captureModal.brand} {captureModal.model} — No stock available</div>
          {[{l:"Customer Name *",p:"Full name",t:"text"},{l:"Phone Number *",p:"+91 XXXXX XXXXX",t:"tel"},{l:"Preferred Colour",p:"e.g. White, Black",t:"text"},{l:"Max Budget",p:"e.g. ₹1.1L",t:"text"}].map((f,i)=>(
            <div key={i} style={{ marginBottom:12 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:C.ink3, marginBottom:5 }}>{f.l}</div>
              <input type={f.t} placeholder={f.p} style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 12px", fontSize:12, color:C.ink, outline:"none", fontFamily:"inherit" }}/>
            </div>
          ))}
          <Btn onClick={()=>{ setCaptureModal(null); showToast("✅ Customer added to waitlist!") }} style={{ width:"100%" }}>Add to Waitlist →</Btn>
        </Modal>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:C.ink, color:"#fff", fontSize:12, fontWeight:700, padding:"10px 20px", borderRadius:24, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap" }}>{toast}</div>
      )}
    </Shell>
  )
}
