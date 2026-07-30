"use client"
import Shell from "../../components/layout/Shell"
import { Card, Avatar, Tag, ProgressBar, SectionHeading } from "../../components/ui"
import { C, fmt } from "../../lib/constants"
import { getReps } from "../../lib/data"

const MONTHS = ["Oct","Nov","Dec","Jan","Feb","Mar"]
const SALES  = [11,14,18,15,16,22]

export default function CommandPage() {
  const reps = getReps()
  const maxS = Math.max(...SALES)

  return (
    <Shell title="Command Analytics">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>Command</h1>
          <p style={{ fontSize:12, color:C.ink3 }}>Dealer analytics — March 2026</p>
        </div>
        <Tag label="AI Insights Ready" color={C.green} dot />
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[{v:"₹18.4L",l:"Revenue",s:"▲34% vs Feb",c:C.green},{v:"22",l:"Units Sold",s:"▲38% vs Feb",c:C.blue},{v:"26%",l:"Conversion",s:"▲6pp vs Feb",c:C.purple},{v:"₹5.76L",l:"Dead Stock",s:"Hero Optima",c:C.red}].map((k,i)=>(
          <Card key={i} style={{ padding:"18px 20px" }}>
            <div style={{ fontSize:28, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</div>
            <div style={{ fontSize:12, color:C.ink, marginTop:6, fontWeight:600 }}>{k.l}</div>
            <div style={{ fontSize:10.5, color:k.c, marginTop:3, fontWeight:700 }}>{k.s}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Sales chart */}
        <Card>
          <SectionHeading>Monthly Sales Trend</SectionHeading>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:90 }}>
            {SALES.map((s,i)=>(
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:9.5, fontWeight:i===5?800:500, color:i===5?C.green:C.ink3 }}>{s}</span>
                <div style={{ width:"100%", background:i===5?C.green:C.greenL, borderRadius:"4px 4px 0 0", height:`${(s/maxS)*68}px`, transition:"height 0.4s" }}/>
                <span style={{ fontSize:8.5, color:C.ink3 }}>{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Funnel */}
        <Card>
          <SectionHeading>Conversion Funnel — March</SectionHeading>
          {[{l:"Total Leads",n:84,pct:100,c:C.blue},{l:"Test Drives",n:41,pct:49,c:C.purple},{l:"Quotes Sent",n:28,pct:33,c:C.yellow},{l:"Negotiating",n:18,pct:21,c:C.orange},{l:"Closed",n:22,pct:26,c:C.green}].map((f,i)=>(
            <div key={i} style={{ marginBottom:9 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11.5, color:C.ink2 }}>{f.l}</span>
                <span style={{ fontSize:11.5, fontWeight:700, color:f.c }}>{f.n} ({f.pct}%)</span>
              </div>
              <ProgressBar pct={f.pct} color={f.c} height={7} />
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* AI insights */}
        <Card>
          <SectionHeading>🤖 AI Insights — March</SectionHeading>
          {[{i:"📈",t:"Okaya Faast F4 demand +340% with zero stock. Estimated missed revenue: ₹6.3L."},{i:"🔴",t:"Hero Optima CX has been dead for 21 days. ₹5.76L capital at risk. Return to OEM."},{i:"⭐",t:"Priya Menon is top rep at 26% conversion. Assign her more HOT leads."},{i:"📉",t:"Tuesday walk-ins consistently low. Schedule Monday WhatsApp campaigns."},{i:"💬",t:"Price objection in 39% of lost deals. Train reps on 5-year TCO vs petrol."}].map((ins,i)=>(
            <div key={i} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<4?`1px solid ${C.border}`:"none", alignItems:"flex-start" }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{ins.i}</span>
              <span style={{ fontSize:11.5, color:C.ink2, lineHeight:1.5 }}>{ins.t}</span>
            </div>
          ))}
        </Card>

        {/* Lead source */}
        <Card>
          <SectionHeading>Lead Source Breakdown</SectionHeading>
          {[{s:"Walk-in",n:31,c:C.green},{s:"WhatsApp Campaign",n:22,c:C.blue},{s:"Web Showroom",n:18,c:C.yellow},{s:"OEM Referral",n:8,c:C.orange},{s:"Social Media",n:5,c:C.purple}].map((src,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
              <div style={{ width:10, height:10, borderRadius:3, background:src.c, flexShrink:0 }}/>
              <span style={{ flex:1, fontSize:11.5, color:C.ink2 }}>{src.s}</span>
              <div style={{ width:120, position:"relative" }}>
                <div style={{ background:C.bg, borderRadius:4, height:18, overflow:"hidden" }}>
                  <div style={{ width:`${(src.n/31)*100}%`, height:"100%", background:`${src.c}40` }}/>
                </div>
                <span style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", fontSize:10, fontWeight:700, color:src.c }}>{src.n}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Agent scorecards */}
      <Card>
        <SectionHeading>Agent Performance — March</SectionHeading>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}`, background:C.bg }}>
              {["Rank","Agent","Leads","Closed","Conversion","Capacity Used","Status"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:C.ink3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reps.map((r,i)=>{
              const pct = Math.round((r.leads/r.capacity)*100)
              const lc  = fmt.loadColor(pct)
              return (
                <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"12px 14px" }}><span style={{ fontSize:16 }}>{"🥇🥈🥉"[i]||"  "}</span></td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <Avatar name={r.name} size={32} color={r.color} status={r.status} />
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:C.ink }}>{r.name}</div>
                        <div style={{ fontSize:10, color:C.ink3 }}>{r.role}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"12px 14px" }}><span style={{ fontSize:13, fontWeight:700, color:C.blue }}>{r.leads}</span></td>
                  <td style={{ padding:"12px 14px" }}><span style={{ fontSize:13, fontWeight:700, color:C.green }}>{r.closed}</span></td>
                  <td style={{ padding:"12px 14px" }}><span style={{ fontSize:14, fontWeight:900, color:i===0?C.green:i===1?C.blue:C.ink3 }}>{r.rate}%</span></td>
                  <td style={{ padding:"12px 14px", minWidth:140 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <ProgressBar pct={pct} color={lc} height={6} />
                      <span style={{ fontSize:10, fontWeight:700, color:lc, whiteSpace:"nowrap" }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ background:r.status==="available"?C.greenL:r.status==="busy"?C.yellowL:C.bg, color:r.status==="available"?C.greenD:r.status==="busy"?C.yellow:C.ink3, fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20 }}>{r.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </Shell>
  )
}
