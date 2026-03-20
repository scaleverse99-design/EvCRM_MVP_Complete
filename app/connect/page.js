"use client"
import { useState } from "react"
import Shell from "../../components/layout/Shell"
import { Card, Avatar, StatusPill } from "../../components/ui"
import { C } from "../../lib/constants"
import { getLeads, getMessages } from "../../lib/data"

const CONV_IDS = [1, 2, 6]

export default function ConnectPage() {
  const [activeId, setActiveId] = useState(1)
  const [reply,    setReply]    = useState("")
  const [msgs,     setMsgs]     = useState(getMessages())

  const leads   = getLeads().filter(l => CONV_IDS.includes(l.id))
  const lead    = leads.find(l => l.id === activeId) || leads[0]
  const thread  = msgs[lead.id] || []

  const send = () => {
    if (!reply.trim()) return
    setMsgs(m => ({ ...m, [lead.id]: [...(m[lead.id]||[]), { from:"rep", text:reply, time:"Now", read:true }] }))
    setReply("")
  }

  return (
    <Shell title="Connect Inbox">
      <div style={{ display:"flex", gap:16, height:"calc(100vh - 120px)", minHeight:500 }}>

        {/* Conversation list */}
        <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:8 }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:C.ink, marginBottom:6 }}>Conversations</h2>
          {leads.map(l => {
            const unread = (msgs[l.id]||[]).filter(m => !m.read && m.from==="customer").length
            const isActive = activeId === l.id
            return (
              <div key={l.id} onClick={() => setActiveId(l.id)} style={{
                background: isActive ? C.greenL : C.card,
                border: `1px solid ${isActive ? C.green : C.border}`,
                borderRadius: 12, padding: "12px 14px", cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: isActive ? `0 0 0 2px ${C.green}25` : "none"
              }}>
                <div style={{ display:"flex", gap:10 }}>
                  <Avatar name={l.name} size={36} color={isActive ? C.greenD : C.blue} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:12, fontWeight:700, color: isActive ? C.greenD : C.ink }}>{l.name}</span>
                      {unread > 0 && (
                        <span style={{ background:C.red, color:"#fff", fontSize:9, fontWeight:800, borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center" }}>{unread}</span>
                      )}
                    </div>
                    <div style={{ fontSize:10.5, color:C.ink3, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.vehicle}</div>
                    <div style={{ marginTop:5 }}><StatusPill status={l.status} /></div>
                  </div>
                </div>
              </div>
            )
          })}

          <div style={{ marginTop:8, background:C.bg, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.ink3, marginBottom:6 }}>CHANNEL INFO</div>
            <div style={{ fontSize:11, color:C.ink2 }}>📱 WhatsApp Business</div>
            <div style={{ fontSize:10, color:C.ink3, marginTop:3 }}>Dealer's own number · ₹0 cost</div>
          </div>
        </div>

        {/* Chat window */}
        <Card noPad style={{ flex:1, display:"flex", flexDirection:"column" }}>
          {/* Chat header */}
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
            <Avatar name={lead.name} size={38} color={C.blue} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{lead.name}</div>
              <div style={{ fontSize:10, color:C.ink3 }}>{lead.vehicle} · via WhatsApp Business</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {["📞 Call","📄 Quote"].map(a => (
                <button key={a} style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:8, padding:"6px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{a}</button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:10, background:C.bg }}>
            {thread.map((msg, i) => (
              <div key={i} style={{ display:"flex", justifyContent: msg.from==="rep" ? "flex-end" : "flex-start" }}>
                <div style={{
                  background: msg.from==="rep" ? C.greenD : C.card,
                  color: msg.from==="rep" ? "#fff" : C.ink,
                  borderRadius: msg.from==="rep" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                  padding: "10px 14px", maxWidth:"68%",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: msg.from==="rep" ? "none" : `1px solid ${C.border}`
                }}>
                  <div style={{ fontSize:12.5, lineHeight:1.5 }}>{msg.text}</div>
                  <div style={{ fontSize:9.5, marginTop:4, opacity:0.6, textAlign:"right" }}>
                    {msg.time}{msg.from==="rep" && " ✓✓"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply bar */}
          <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, background:C.card, display:"flex", gap:10 }}>
            <input
              value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key==="Enter" && send()}
              placeholder="Type a message... (Enter to send)"
              style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:24, padding:"10px 16px", fontSize:12, outline:"none", fontFamily:"inherit", color:C.ink }}
            />
            <button onClick={send} style={{ background:C.green, border:"none", color:"#fff", borderRadius:"50%", width:42, height:42, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, flexShrink:0 }}>→</button>
          </div>
        </Card>
      </div>
    </Shell>
  )
}
