"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Shell from "../../../components/layout/Shell"
import { Card, Avatar, StatusPill, Tag, Btn } from "../../../components/ui"
import { C, SOURCES } from "../../../lib/constants"
import { getLeads, getReps } from "../../../lib/data"

const TIMELINE = [
  { type:"WhatsApp", note:"Quote #EV-2847 sent — ₹17.05L after subsidy", time:"Today 2:30 PM", icon:"💬", color:C.green },
  { type:"Call",     note:"Discussed EMI options. Customer interested in 36-month plan.",     time:"Today 11:00 AM", icon:"📞", color:C.blue   },
  { type:"Visit",    note:"Walk-in. Test drove Nexon EV Max and Tiago EV.",                   time:"Yesterday 4:00 PM", icon:"🏪", color:C.yellow },
  { type:"Created",  note:"Lead created from walk-in enquiry.",                               time:"Mar 17, 10:20 AM",  icon:"✦", color:C.ink3  },
]

export default function LeadDetail() {
  const router = useRouter()
  const { id }  = useParams()
  const [tab,  setTab]  = useState("timeline")
  const [note, setNote] = useState("")
  const [saved,setSaved]= useState(false)

  const lead = getLeads().find(l=>l.id===parseInt(id)) || getLeads()[0]
  const src  = SOURCES[lead.source] || {}
  const reps = getReps()
  const rep  = reps.find(r=>r.id===lead.repId)

  return (
    <Shell title={lead.name}>
      <div style={{ maxWidth:720 }}>
        {/* Back */}
        <button onClick={()=>router.back()} style={{ background:"none", border:"none", color:C.ink3, cursor:"pointer", fontSize:13, marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Back to Leads</button>

        {/* Header card */}
        <Card style={{ marginBottom:16, padding:"18px 20px" }}>
          <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
            <Avatar name={lead.name} size={52} color={lead.status==="HOT"?C.red:C.blue} />
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <h1 style={{ fontSize:20, fontWeight:800, color:C.ink, marginBottom:3 }}>{lead.name}</h1>
                  <div style={{ fontSize:12, color:C.ink3 }}>{lead.phone}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <StatusPill status={lead.status} />
                  <div style={{ fontSize:18, fontWeight:900, color:C.green }}>AI: {lead.score}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                <Tag label={lead.vehicle} color={C.blue} />
                <span style={{ background:`${src.color}15`, color:src.color, fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:10 }}>{src.icon} {src.label}</span>
                {rep && <Tag label={rep.name} color={rep.color} />}
              </div>
            </div>
          </div>
          {/* Quote */}
          <div style={{ background:C.bg, borderRadius:10, padding:"9px 12px", marginTop:14, fontSize:11, color:C.ink3, fontStyle:"italic", border:`1px solid ${C.border}` }}>"{lead.comment}"</div>
          {/* Action row */}
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            {[{l:"📞 Call",c:C.blue},{l:"💬 WhatsApp",c:C.green},{l:"📄 Build Quote",c:C.orange,href:"/buildprice"},{l:"👤 Assign",c:C.purple,href:"/assign"}].map(a=>(
              <button key={a.l} onClick={()=>a.href&&router.push(a.href)} style={{ background:`${a.c}10`, border:`1px solid ${a.c}30`, color:a.c, borderRadius:9, padding:"8px 14px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${a.c}20`}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${a.c}10`}}
              >{a.l}</button>
            ))}
          </div>
        </Card>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, marginBottom:16, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          {["timeline","notes"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, background:tab===t?C.green:"transparent", color:tab===t?"#fff":C.ink3, border:"none", padding:"10px", fontSize:12, fontWeight:tab===t?700:500, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", textTransform:"capitalize" }}>{t}</button>
          ))}
        </div>

        {tab==="timeline" && (
          <Card>
            {TIMELINE.map((ev,i)=>(
              <div key={i} style={{ display:"flex", gap:14, position:"relative" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:`${ev.color}15`, border:`1.5px solid ${ev.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, zIndex:1 }}>{ev.icon}</div>
                  {i<TIMELINE.length-1 && <div style={{ width:2, flex:1, minHeight:20, background:C.border }}/>}
                </div>
                <div style={{ flex:1, paddingBottom:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:ev.color }}>{ev.type}</span>
                    <span style={{ fontSize:10, color:C.ink3 }}>{ev.time}</span>
                  </div>
                  <div style={{ fontSize:12, color:C.ink2, marginTop:4, lineHeight:1.5 }}>{ev.note}</div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {tab==="notes" && (
          <Card>
            <p style={{ fontSize:11, color:C.ink3, marginBottom:8 }}>Add notes in Hindi or English — Pulse AI reads these every morning for lead classification.</p>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What did the customer say today? Any objections, interests, or updates..." style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, color:C.ink, fontSize:12, padding:12, minHeight:100, resize:"none", outline:"none", fontFamily:"inherit", lineHeight:1.6 }}/>
            {note && (
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <Btn onClick={()=>setSaved(true)} style={{ flex:1 }}>Save Note</Btn>
                {saved && <span style={{ fontSize:12, color:C.green, alignSelf:"center" }}>✓ Saved</span>}
              </div>
            )}
          </Card>
        )}
      </div>
    </Shell>
  )
}
