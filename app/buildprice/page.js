"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Btn, ProgressBar } from "../../components/ui"
import { C, fmt } from "../../lib/constants"
import { getShowroomProducts } from "../../lib/data"

const STATES = [
  { name:"Karnataka",  subsidy:12500 }, { name:"Maharashtra",subsidy:10000 },
  { name:"Delhi",      subsidy:15000 }, { name:"Tamil Nadu", subsidy:8000  },
  { name:"Gujarat",    subsidy:10000 }, { name:"Uttar Pradesh",subsidy:5000 },
  { name:"Rajasthan",  subsidy:7500  }, { name:"Telangana",  subsidy:10000 },
]

export default function BuildPricePage() {
  const router    = useRouter()
  const products  = getShowroomProducts()
  const [pid,     setPid]     = useState(products[0].id)
  const [stateIdx,setStateIdx]= useState(0)

  const p    = products.find(x => x.id === pid) || products[0]
  const st   = STATES[stateIdx]
  const net  = p.exShowroom - p.fame2 - p.stateSubsidy - st.subsidy
  const emi36 = fmt.emi(net, 36)
  const emi48 = fmt.emi(net, 48)
  const emi60 = fmt.emi(net, 60)
  const petrolMonthly = Math.round((p.range / 15) * 105)
  const evMonthly     = Math.round(p.range * 2.5)
  const saving        = petrolMonthly - evMonthly

  return (
    <Shell title="BuildPrice">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, maxWidth:900 }}>
        {/* Left — Inputs */}
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>BuildPrice</h1>
          <p style={{ fontSize:12, color:C.ink3, marginBottom:20 }}>EV pricing calculator with subsidies & EMI</p>

          <Card style={{ marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:10, letterSpacing:"0.4px" }}>SELECT VEHICLE</p>
            {products.map(pr => (
              <button key={pr.id} onClick={() => setPid(pr.id)} style={{
                width:"100%", background:pid===pr.id?C.greenL:C.bg,
                border:`1px solid ${pid===pr.id?C.green:C.border}`,
                color:pid===pr.id?C.greenD:C.ink2, borderRadius:10,
                padding:"10px 14px", fontSize:12, fontWeight:pid===pr.id?700:400,
                cursor:"pointer", textAlign:"left", marginBottom:6,
                display:"flex", justifyContent:"space-between", alignItems:"center",
                fontFamily:"inherit", transition:"all 0.15s"
              }}>
                <span>{pr.brand} {pr.model} <span style={{ fontSize:10, color:C.ink3, fontWeight:400 }}>({pr.type})</span></span>
                <span style={{ fontSize:12, fontWeight:800, color:pid===pr.id?C.green:C.ink3 }}>{fmt.currency(pr.exShowroom)}</span>
              </button>
            ))}
          </Card>

          <Card>
            <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:10, letterSpacing:"0.4px" }}>CUSTOMER STATE</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {STATES.map((s,i) => (
                <button key={s.name} onClick={() => setStateIdx(i)} style={{ background:stateIdx===i?C.blueL:C.bg, border:`1px solid ${stateIdx===i?C.blue:C.border}`, color:stateIdx===i?C.blue:C.ink2, borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:stateIdx===i?700:400, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>{s.name}</button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right — Results */}
        <div>
          <h2 style={{ fontSize:16, fontWeight:700, color:C.ink, marginBottom:14, opacity:0 }}>_</h2>
          <Card style={{ marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:12, letterSpacing:"0.4px" }}>PRICE BREAKDOWN</p>
            {[
              { l:"Ex-Showroom Price",            v:fmt.currency(p.exShowroom),    c:C.ink                                      },
              { l:"FAME-II Central Subsidy",       v:p.fame2>0?`−${fmt.currency(p.fame2)}`:"Not eligible",     c:p.fame2>0?C.green:C.ink3 },
              { l:"OEM / State Incentive",         v:p.stateSubsidy>0?`−${fmt.currency(p.stateSubsidy)}`:"N/A",c:p.stateSubsidy>0?C.green:C.ink3 },
              { l:`${st.name} State Subsidy`,      v:st.subsidy>0?`−${fmt.currency(st.subsidy)}`:"N/A",        c:st.subsidy>0?C.green:C.ink3 },
            ].map((r,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, color:C.ink3 }}>{r.l}</span>
                <span style={{ fontSize:12, fontWeight:700, color:r.c }}>{r.v}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 4px" }}>
              <span style={{ fontSize:14, fontWeight:800, color:C.ink }}>Net Price (Customer Pays)</span>
              <span style={{ fontSize:22, fontWeight:900, color:C.green }}>{fmt.currency(net)}</span>
            </div>
          </Card>

          <Card style={{ marginBottom:14, background:`linear-gradient(135deg, ${C.greenL}, ${C.card})`, border:`1px solid ${C.green}30` }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:12, letterSpacing:"0.4px" }}>EMI OPTIONS (8.5% p.a.)</p>
            {[{m:36,v:emi36},{m:48,v:emi48},{m:60,v:emi60}].map((e,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:12, color:C.ink3 }}>{e.m} months ({Math.round(e.m/12)} yrs)</span>
                <span style={{ fontSize:15, fontWeight:800, color:C.greenD }}>₹{e.v.toLocaleString("en-IN")}/mo</span>
              </div>
            ))}
          </Card>

          <Card style={{ marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:12, letterSpacing:"0.4px" }}>EV vs PETROL — MONTHLY</p>
            <div style={{ display:"flex", gap:0 }}>
              {[{v:`₹${saving.toLocaleString("en-IN")}`,l:"Saved/month",c:C.green},{v:`${p.range}km`,l:"Real range",c:C.blue},{v:`₹${evMonthly.toLocaleString("en-IN")}`,l:"Charging/month",c:C.teal}].map((s,i) => (
                <div key={i} style={{ flex:1, textAlign:"center", paddingLeft:i>0?16:0, borderLeft:i>0?`1px solid ${C.border}`:"none" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10, color:C.ink3, marginTop:3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, background:C.greenL, borderRadius:9, padding:"9px 12px", fontSize:11, color:C.greenD, lineHeight:1.6, border:`1px solid ${C.green}20` }}>
              💡 vs petrol 2W: You save ₹{saving.toLocaleString("en-IN")}/month = <strong>₹{(saving*12).toLocaleString("en-IN")}/year</strong>
            </div>
          </Card>

          <Btn onClick={() => router.push("/quotepro")} style={{ width:"100%" }}>Build Quote with this Price →</Btn>
        </div>
      </div>
    </Shell>
  )
}
