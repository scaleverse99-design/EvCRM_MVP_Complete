"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Avatar, StatusPill, Tag, Btn } from "../../components/ui"
import { C, SOURCES } from "../../lib/constants"
import { getLeads } from "../../lib/data"

export default function LeadsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState("All")
  const allLeads = getLeads()
  const shown = filter==="All" ? allLeads : allLeads.filter(l=>l.status===filter)

  const counts = ["HOT","WARM","NEW","COLD","CLOSED"].reduce((a,s)=>({...a,[s]:allLeads.filter(l=>l.status===s).length}),{})

  return (
    <Shell title="Lead Pipeline">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>Lead Pipeline</h1>
          <p style={{ fontSize:12, color:C.ink3 }}>{allLeads.length} total · {allLeads.filter(l=>!l.repId).length} unassigned · {allLeads.filter(l=>l.status==="HOT").length} HOT</p>
        </div>
        <Btn onClick={()=>router.push("/leads/new")}>+ New Lead</Btn>
      </div>

      {/* Filter pills */}
      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        {["All",...Object.keys(counts)].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ background:filter===f?C.green:C.card, border:`1px solid ${filter===f?C.green:C.border}`, color:filter===f?"#fff":C.ink3, borderRadius:20, padding:"5px 14px", fontSize:11, fontWeight:filter===f?700:500, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
            {f}{f!=="All"&&<span style={{ opacity:0.7, marginLeft:4 }}>({counts[f]||0})</span>}
          </button>
        ))}
        <div style={{ marginLeft:"auto", fontSize:11, color:C.ink3, alignSelf:"center" }}>{shown.length} results</div>
      </div>

      {/* Table */}
      <Card noPad>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}`, background:C.bg }}>
              {["Customer","Vehicle","Source","Assigned Rep","Status","AI Score","Time","Actions"].map(h=>(
                <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:C.ink3, letterSpacing:"0.3px", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((lead)=>{
              const src = SOURCES[lead.source]||{}
              return (
                <tr key={lead.id} className="row-hover" style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer", transition:"background 0.1s" }} onClick={()=>router.push(`/leads/${lead.id}`)}>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:9, alignItems:"center" }}>
                      <Avatar name={lead.name} size={34} color={lead.status==="HOT"?C.red:lead.status==="WARM"?C.yellow:C.blue} />
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:C.ink }}>{lead.name}</div>
                        <div style={{ fontSize:10, color:C.ink3, marginTop:1, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.comment}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"12px 14px" }}><span style={{ fontSize:11, color:C.ink2, whiteSpace:"nowrap" }}>{lead.vehicle}</span></td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ background:`${src.color}15`, color:src.color, fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:8, whiteSpace:"nowrap" }}>{src.icon} {src.label}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    {lead.repId ? <Tag label={`Rep #${lead.repId}`} color={C.blue} /> : <Tag label="Unassigned" color={C.red} />}
                  </td>
                  <td style={{ padding:"12px 14px" }}><StatusPill status={lead.status} /></td>
                  <td style={{ padding:"12px 14px" }}><span style={{ fontSize:14, fontWeight:900, color:C.green }}>{lead.score}</span></td>
                  <td style={{ padding:"12px 14px" }}><span style={{ fontSize:10.5, color:C.ink3, whiteSpace:"nowrap" }}>{lead.time}</span></td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:5 }} onClick={e=>e.stopPropagation()}>
                      {["📞","💬","📄"].map(a=>(
                        <button key={a} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:"5px 7px", cursor:"pointer", fontSize:12 }} title={a==="📞"?"Call":a==="💬"?"WhatsApp":"Quote"}>{a}</button>
                      ))}
                      {!lead.repId && (
                        <button onClick={()=>router.push("/assign")} style={{ background:C.green, border:"none", color:"#fff", borderRadius:7, padding:"5px 10px", cursor:"pointer", fontSize:10, fontWeight:600, fontFamily:"inherit", whiteSpace:"nowrap" }}>Assign</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {shown.length===0 && (
          <div style={{ textAlign:"center", padding:"48px 24px" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>◎</div>
            <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>No {filter !== "All" ? filter : ""} leads</div>
          </div>
        )}
      </Card>
    </Shell>
  )
}
