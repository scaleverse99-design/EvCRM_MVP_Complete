"use client"
import { useState } from "react"
import { Tag } from "../../components/ui"
import { C, fmt } from "../../lib/constants"
import { getShowroomProducts } from "../../lib/data"

export default function ShowroomPage() {
  const [filter,   setFilter]   = useState("All")
  const [selected, setSelected] = useState(null)
  const [booked,   setBooked]   = useState(false)
  const products = getShowroomProducts()
  const types    = ["All","Scooter","4W SUV"]
  const shown    = filter==="All" ? products : products.filter(p=>p.type.includes(filter))

  const baseStyle = { minHeight:"100vh", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", background:"#F8FAFB" }

  if (booked) return (
    <div style={{ ...baseStyle, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&family=DM+Serif+Display&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ background:"#fff", borderRadius:20, padding:32, maxWidth:360, width:"100%", textAlign:"center", boxShadow:"0 4px 30px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🎉</div>
        <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:24, fontWeight:900, color:C.ink, marginBottom:8 }}>Booking Received!</div>
        <div style={{ fontSize:12, color:C.ink3, lineHeight:1.8, marginBottom:22 }}>A rep from Sharma EV Motors will call you within 30 minutes to confirm your booking.</div>
        <button onClick={()=>setBooked(false)} style={{ background:C.greenD, color:"#fff", border:"none", borderRadius:10, padding:"12px 24px", fontSize:13, fontWeight:700, cursor:"pointer" }}>← Back to Showroom</button>
      </div>
    </div>
  )

  if (selected) {
    const p   = products.find(x=>x.id===selected)
    const net = p.exShowroom - p.fame2 - p.stateSubsidy
    return (
      <div style={baseStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&family=DM+Serif+Display&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
        <div style={{ background:C.greenD, padding:"14px 20px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 }}>
          <button onClick={()=>setSelected(null)} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:16, fontWeight:900, color:"#fff" }}>Ev<span style={{ color:C.greenMid }}>.CRM</span></div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", marginLeft:"auto" }}>Sharma EV Motors</div>
        </div>
        <div style={{ maxWidth:560, margin:"0 auto", padding:"20px 16px 40px" }}>
          <div style={{ background:"#fff", borderRadius:16, padding:20, marginBottom:14, boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:42, textAlign:"center", marginBottom:14 }}>🛵</div>
            <div style={{ fontSize:18, fontWeight:900, color:C.ink }}>{p.brand} {p.model}</div>
            <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{p.type}</div>
            <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:C.orange }}>★ {p.rating}</span>
              <span style={{ fontSize:11, color:C.ink3 }}>({p.reviews} reviews)</span>
              {!p.available && <Tag label="OUT OF STOCK" color={C.red} />}
              {p.available && p.deliveryWeeks > 0 && <Tag label={`${p.deliveryWeeks} week delivery`} color={C.green} />}
            </div>
          </div>
          <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:10 }}>SPECIFICATIONS</div>
            {[{l:"Range",v:`${p.range}km`},{l:"Top Speed",v:`${p.topSpeed}km/h`},{l:"Charge Time",v:`${p.chargeTime}min`}].map((s,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:12, color:C.ink3 }}>{s.l}</span>
                <strong style={{ fontSize:12, color:C.ink }}>{s.v}</strong>
              </div>
            ))}
          </div>
          <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:10 }}>PRICING</div>
            {[[`Ex-showroom`,fmt.currency(p.exShowroom),C.ink],p.fame2>0&&[`FAME-II Subsidy`,`−${fmt.currency(p.fame2)}`,C.green],p.stateSubsidy>0&&[`State Incentive`,`−${fmt.currency(p.stateSubsidy)}`,C.green]].filter(Boolean).map((r,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, color:C.ink3 }}>{r[0]}</span>
                <strong style={{ fontSize:12, color:r[2] }}>{r[1]}</strong>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0" }}>
              <span style={{ fontSize:14, fontWeight:800, color:C.ink }}>Net Price</span>
              <span style={{ fontSize:20, fontWeight:900, color:C.greenD }}>{fmt.currency(net)}</span>
            </div>
          </div>
          <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:16, boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:8 }}>AVAILABLE COLOURS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {p.colors.map(col=><span key={col} style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, fontSize:11, padding:"6px 12px", borderRadius:8 }}>{col}</span>)}
            </div>
          </div>
          {p.available ? (
            <button onClick={()=>setBooked(true)} style={{ width:"100%", background:C.greenD, color:"#fff", border:"none", borderRadius:14, padding:15, fontSize:15, fontWeight:900, cursor:"pointer", boxShadow:`0 4px 20px ${C.greenD}55` }}>
              🚗 Book Now — {fmt.currency(net)}
            </button>
          ) : (
            <button style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.ink, borderRadius:14, padding:13, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              📋 Join Waitlist
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={baseStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&family=DM+Serif+Display&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ background:C.greenD, padding:"14px 20px 12px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, maxWidth:800, margin:"0 auto 10px" }}>
          <div>
            <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:18, fontWeight:900, color:"#fff" }}>Ev<span style={{ color:C.greenMid }}>.CRM</span></div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", marginTop:1 }}>Sharma EV Motors · Bangalore · 📞 98765 43210</div>
          </div>
        </div>
        <div style={{ maxWidth:800, margin:"0 auto", display:"flex", gap:7 }}>
          {types.map(t=>(
            <button key={t} onClick={()=>setFilter(t)} style={{ background:filter===t?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.08)", border:`1px solid ${filter===t?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, color:"#fff", borderRadius:16, padding:"5px 13px", fontSize:11, fontWeight:filter===t?700:400, cursor:"pointer", fontFamily:"inherit" }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth:800, margin:"0 auto", padding:"16px 16px 40px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:14 }}>Available Vehicles ({shown.length})</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
          {shown.map(p=>{
            const net = p.exShowroom - p.fame2 - p.stateSubsidy
            return (
              <div key={p.id} onClick={()=>setSelected(p.id)} style={{ background:"#fff", borderRadius:16, padding:18, boxShadow:"0 2px 16px rgba(0,0,0,0.06)", cursor:"pointer", border:`1px solid ${p.available?C.border:C.red+"30"}`, transition:"transform 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.12)"}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 16px rgba(0,0,0,0.06)"}}
              >
                <div style={{ fontSize:36, textAlign:"center", marginBottom:12 }}>{p.type.includes("4W")?"🚙":"🛵"}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color:C.ink }}>{p.brand} {p.model}</div>
                    <div style={{ fontSize:10.5, color:C.ink3, marginTop:1 }}>{p.type}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:900, color:C.greenD }}>{fmt.currency(net)}</div>
                    <div style={{ fontSize:9.5, color:C.ink3, textDecoration:"line-through" }}>{fmt.currency(p.exShowroom)}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10, marginBottom:10, flexWrap:"wrap" }}>
                  {[{l:`${p.range}km`,i:"⚡"},{l:`${p.chargeTime}min`,i:"🔌"},{l:`${p.topSpeed}km/h`,i:"🏎"}].map((s,i)=>(
                    <span key={i} style={{ fontSize:10.5, color:C.ink3 }}>{s.i} {s.l}</span>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:11, color:C.orange }}>★ {p.rating}</span>
                  <span style={{ fontSize:10.5, color:C.ink3 }}>({p.reviews})</span>
                  {!p.available && <Tag label="OUT OF STOCK" color={C.red} />}
                  {p.available && <Tag label={`${p.deliveryWeeks}wk delivery`} color={C.green} />}
                </div>
                <button onClick={e=>{e.stopPropagation();if(p.available)setBooked(true);else setSelected(p.id)}} style={{ width:"100%", background:p.available?C.greenD:C.bg, color:p.available?"#fff":C.ink, border:p.available?"none":`1px solid ${C.border}`, borderRadius:10, padding:"11px", fontSize:12, fontWeight:p.available?800:600, cursor:"pointer" }}>
                  {p.available ? `Book Now — ${fmt.currency(net)}` : "Join Waitlist"}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
