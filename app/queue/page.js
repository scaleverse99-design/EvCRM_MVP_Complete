"use client"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Avatar, StatusPill, Tag } from "../../components/ui"
import { C } from "../../lib/constants"
import { getAIQueue } from "../../lib/data"

export default function QueuePage() {
  const router = useRouter()
  const queue  = getAIQueue()

  return (
    <Shell title="AI Queue">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>⚡ Today's AI Queue</h1>
          <p style={{ fontSize:12, color:C.ink3 }}>Pulse AI scored 47 leads and selected your top {queue.length} for today · Updated 8:00 AM</p>
        </div>
        <div style={{ background:C.greenL, border:`1px solid ${C.green}40`, borderRadius:12, padding:"10px 18px", textAlign:"center" }}>
          <div style={{ fontSize:26, fontWeight:900, color:C.green, lineHeight:1 }}>{queue.length}<span style={{ fontSize:12, color:C.ink3 }}>/10</span></div>
          <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>leads today</div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {queue.map((lead,i)=>(
          <Card key={lead.id} style={{ cursor:"pointer" }} onClick={()=>router.push(`/leads/${lead.id}`)}>
            <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:C.bg, border:`1.5px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:C.ink3, flexShrink:0 }}>{i+1}</div>
              <Avatar name={lead.name} size={40} color={lead.status==="HOT"?C.red:lead.status==="WARM"?C.yellow:C.blue} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>{lead.name}</div>
                    <div style={{ fontSize:11, color:C.ink3, marginTop:1 }}>{lead.vehicle}</div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <StatusPill status={lead.status} />
                    <div style={{ fontSize:18, fontWeight:900, color:C.green }}>{lead.score}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div style={{ background:C.bg, borderRadius:9, padding:"10px 12px", border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.ink3, marginBottom:4 }}>WHY TODAY</div>
                <div style={{ fontSize:11, color:C.ink2, lineHeight:1.5 }}>{lead.reason}</div>
              </div>
              <div style={{ background:C.greenL, borderRadius:9, padding:"10px 12px", border:`1px solid ${C.green}30` }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.greenD, marginBottom:4 }}>SUGGESTED ACTION</div>
                <div style={{ fontSize:11, color:C.ink, lineHeight:1.5 }}>{lead.action}</div>
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }} onClick={e=>e.stopPropagation()}>
              {[{l:"📞 Call",c:C.blue},{l:"💬 WhatsApp",c:C.green},{l:"📄 Build Quote",c:C.orange,href:"/buildprice"}].map(a=>(
                <button key={a.l} onClick={()=>a.href&&router.push(a.href)} style={{ flex:1, background:`${a.c}10`, border:`1px solid ${a.c}30`, color:a.c, borderRadius:8, padding:"8px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{a.l}</button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  )
}
