"use client"
import { useState } from "react"
import { Card, Tag, Btn } from "../../components/ui"
import { C, fmt } from "../../lib/constants"
import { getCustomerOrder, getQuotes } from "../../lib/data"

export default function MyGaragePage() {
  const [tab,    setTab]    = useState("order")
  const [svcTxt, setSvcTxt] = useState("")
  const [svcSent,setSvcSent]= useState(false)
  const order  = getCustomerOrder()
  const quotes = getQuotes()

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFB", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        button:focus{outline:none}
      `}</style>

      {/* Header */}
      <div style={{ background:C.greenD, padding:"16px 20px 14px", borderBottom:`3px solid ${C.greenMid}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, maxWidth:600, margin:"0 auto 12px" }}>
          <div>
            <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:20, fontWeight:900, color:"#fff", lineHeight:1 }}>Ev<span style={{ color:C.greenMid }}>.CRM</span></div>
            <div style={{ fontSize:9.5, color:"rgba(255,255,255,0.6)", marginTop:1 }}>MyGarage Customer Portal</div>
          </div>
          <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#fff" }}>AV</div>
        </div>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>Amit Verma</div>
          <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.65)", marginTop:2 }}>Sharma EV Motors, Bangalore</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:C.greenD, display:"flex", maxWidth:600, margin:"0 auto" }}>
        {["order","quotes","service"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, background:"none", border:"none", borderBottom:`2px solid ${tab===t?C.greenMid:"transparent"}`, color:tab===t?C.greenMid:"rgba(255,255,255,0.55)", padding:"11px 0", fontSize:11, fontWeight:tab===t?700:400, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize", transition:"all 0.15s" }}>
            {t==="order"?"Order Status":t==="quotes"?"My Quotes":"Service"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth:600, margin:"0 auto", padding:"16px 16px 40px" }}>

        {tab==="order" && (
          <div>
            {/* Vehicle card */}
            <div style={{ background:"#fff", borderRadius:16, padding:18, marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, color:C.ink3, marginBottom:4 }}>YOUR VEHICLE</div>
              <div style={{ fontSize:17, fontWeight:900, color:C.ink }}>{order.vehicle}</div>
              <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{order.variant}</div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <Tag label="BOOKED ✓" color={C.greenD} />
                <Tag label={`Order ${order.id}`} color={C.blue} />
              </div>
              <div style={{ marginTop:10, fontSize:18, fontWeight:900, color:C.greenD }}>{fmt.currency(order.price)}</div>
            </div>

            {/* Timeline */}
            <div style={{ background:"#fff", borderRadius:16, padding:18, marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:14, letterSpacing:"0.4px" }}>ORDER TIMELINE</div>
              {order.timeline.map((step,i)=>(
                <div key={i} style={{ display:"flex", gap:12, position:"relative" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, background:step.done?C.greenD:step.active?C.greenL:"#F3F4F6", border:`2px solid ${step.done?C.greenD:step.active?C.green:C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, zIndex:1 }}>
                      {step.done ? <span style={{ color:"#fff" }}>✓</span> : step.active ? <span style={{ color:C.green }}>●</span> : null}
                    </div>
                    {i < order.timeline.length-1 && <div style={{ width:2, height:28, background:step.done?C.greenD:C.border }}/>}
                  </div>
                  <div style={{ flex:1, paddingBottom:16 }}>
                    <div style={{ fontSize:12, fontWeight:step.done||step.active?700:400, color:step.done?C.greenD:step.active?C.ink:"#999" }}>{step.label}</div>
                    <div style={{ fontSize:10.5, color:"#999", marginTop:2 }}>{step.date}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div style={{ background:"#fff", borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:10 }}>YOUR DEALER</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:2 }}>{order.dealer}</div>
              <div style={{ fontSize:11, color:C.ink3, marginBottom:12 }}>Sales Rep: <strong>{order.rep}</strong></div>
              <button style={{ width:"100%", background:C.greenD, color:"#fff", border:"none", borderRadius:10, padding:12, fontSize:12, fontWeight:700, cursor:"pointer" }}>💬 WhatsApp {order.rep.split(" ")[0]}</button>
            </div>
          </div>
        )}

        {tab==="quotes" && (
          <div>
            {quotes.map((q,i)=>(
              <div key={i} style={{ background:"#fff", borderRadius:16, padding:18, marginBottom:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:C.ink }}>{q.vehicle}</div>
                    <div style={{ fontSize:10.5, color:C.ink3, marginTop:2 }}>Quote #{q.id} · {q.sentAt}</div>
                  </div>
                  <Tag label={q.status} color={q.status==="ACCEPTED"?C.greenD:q.status==="VIEWED"?C.blue:C.ink3} />
                </div>
                <div style={{ fontSize:22, fontWeight:900, color:C.greenD, marginBottom:4 }}>{fmt.currency(q.netPrice)}</div>
                <div style={{ fontSize:11, color:C.ink3, marginBottom:10 }}>EMI from ₹{q.emi36?.toLocaleString("en-IN")}/month</div>
                {q.offer && (
                  <div style={{ background:C.greenL, borderRadius:9, padding:"8px 12px", marginBottom:10, border:`1px solid ${C.green}20` }}>
                    <div style={{ fontSize:9, fontWeight:700, color:C.greenD, marginBottom:3 }}>SPECIAL OFFER</div>
                    <div style={{ fontSize:11, color:C.ink, lineHeight:1.5 }}>{q.offer}</div>
                  </div>
                )}
                <div style={{ display:"flex", gap:8 }}>
                  <button style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:9, padding:10, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>📄 Download PDF</button>
                  {q.status!=="ACCEPTED" && <button style={{ flex:1, background:C.green, border:"none", color:"#fff", borderRadius:9, padding:10, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>✅ Accept Quote</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="service" && (
          <div>
            {!svcSent ? (
              <div style={{ background:"#fff", borderRadius:16, padding:18, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:14, fontWeight:800, color:C.ink, marginBottom:16 }}>Raise Service Request</div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:6 }}>YOUR VEHICLE</div>
                  <select style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", fontSize:12, color:C.ink, outline:"none" }}>
                    <option>{order.vehicle}</option>
                  </select>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:8 }}>ISSUE TYPE</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                    {["Battery concern","Charging issue","Software update","Tyre/Brakes","Noise","Other"].map(t=>(
                      <button key={t} style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:8, padding:"6px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:6 }}>DESCRIBE YOUR ISSUE</div>
                  <textarea value={svcTxt} onChange={e=>setSvcTxt(e.target.value)} placeholder="Describe the issue in detail..." style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:12, fontSize:12, color:C.ink, minHeight:90, resize:"none", outline:"none", fontFamily:"inherit", lineHeight:1.6, boxSizing:"border-box" }}/>
                </div>
                <button onClick={()=>setSvcSent(true)} style={{ width:"100%", background:C.greenD, color:"#fff", border:"none", borderRadius:10, padding:13, fontSize:13, fontWeight:800, cursor:"pointer" }}>Submit Request</button>
              </div>
            ) : (
              <div style={{ background:"#fff", borderRadius:16, padding:28, textAlign:"center", border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:44, marginBottom:14 }}>✅</div>
                <div style={{ fontSize:16, fontWeight:800, color:C.greenD, marginBottom:8 }}>Request Submitted!</div>
                <div style={{ fontSize:12, color:C.ink3, lineHeight:1.7, marginBottom:20 }}>{order.rep} will contact you within 2 hours.</div>
                <button onClick={()=>setSvcSent(false)} style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"10px 20px", fontSize:12, cursor:"pointer" }}>New Request</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
