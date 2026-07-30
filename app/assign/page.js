"use client"
import { useState, useEffect } from "react"
import Shell from "../../components/layout/Shell"
import { Card, Avatar, StatusPill, Tag, ProgressBar, Toggle, Btn, Modal, Toast } from "../../components/ui"
import { C, SOURCES, fmt } from "../../lib/constants"
import { db } from "../../lib/firebase-client"
import { collection, query, onSnapshot, updateDoc, doc, serverTimestamp, where } from "firebase/firestore"

const METHODS = [
  { id:"roundrobin",  icon:"🔄", label:"Round Robin",      desc:"Equal distribution across active reps"      },
  { id:"performance", icon:"⭐", label:"Performance First", desc:"Best converting rep gets HOT leads first"   },
  { id:"load",        icon:"⚖️", label:"Load Balance",      desc:"Assign to least loaded available rep"       },
  { id:"speciality",  icon:"🎯", label:"Speciality Match",  desc:"Match vehicle brand to rep's expertise"     },
]

export default function AssignPage() {
  const [autoOn,     setAutoOn]     = useState(true)
  const [method,     setMethod]     = useState("roundrobin")
  const [leads,      setLeads]      = useState([])
  const [reps,       setReps]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [assignModal,setAssignModal]= useState(null)
  const [selectedRep,setSelectedRep]= useState(null)
  const [toast,      setToast]      = useState("")
  const [sourceRules,setSourceRules]= useState({ walkin:"manual", whatsapp:"auto", instagram:"auto", showroom:"auto", oem:"auto", referral:"manual", facebook:"auto" })

  useEffect(() => {
    // 1. Listen for Unassigned Leads
    const qL = query(collection(db, "evcrm_leads"))
    const unsubL = onSnapshot(qL, (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    // 2. Listen for Reps
    const qR = query(collection(db, "evcrm_reps"))
    const unsubR = onSnapshot(qR, (snap) => {
      setReps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })

    return () => { unsubL(); unsubR() }
  }, [])

  const unassigned = leads.filter(l => !l.repId)
  const history    = leads.filter(l => l.repId).sort((a,b) => (b.assigned_at||0) > (a.assigned_at||0) ? 1 : -1).slice(0, 5).map(l => ({
    ...l,
    rep: reps.find(r => r.id === l.repId)?.name || "Unknown",
    time: l.assigned_at ? new Date(l.assigned_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "Recently"
  }))

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500) }

  const doAssign = async (leadId, repId) => {
    try {
      const leadRef = doc(db, "evcrm_leads", leadId)
      await updateDoc(leadRef, {
        repId,
        assigned_at: new Date().toISOString(),
        assignment_method: "Manual"
      })
      
      const rep  = reps.find(r => r.id === repId)
      const lead = unassigned.find(l => l.id === leadId)
      setAssignModal(null); setSelectedRep(null)
      showToast(`✅ ${lead?.name?.split(" ")[0]} → ${rep?.name?.split(" ")[0]}`)
    } catch (err) {
      console.error("Assignment error:", err)
      showToast("❌ Failed to assign")
    }
  }

  const autoAssignAll = async () => {
    const list = [...unassigned]
    const availableReps = reps.filter(r => r.status === "available")
    if (availableReps.length === 0) {
      showToast("❌ No reps available for auto-assign")
      return
    }

    showToast(`⚡ Auto-assigning ${list.length} leads...`)
    
    for (let i = 0; i < list.length; i++) {
        const lead = list[i]
        const rep = availableReps[i % availableReps.length]
        const leadRef = doc(db, "evcrm_leads", lead.id)
        await updateDoc(leadRef, {
            repId: rep.id,
            assigned_at: new Date().toISOString(),
            assignment_method: "Auto"
        })
    }
    showToast(`⚡ ${list.length} leads auto-assigned!`)
  }

  return (
    <Shell title="Lead Assignment">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>Lead Assignment</h1>
          <p style={{ fontSize:12, color:C.ink3 }}>{unassigned.length} leads waiting · {reps.filter(r=>r.status==="available").length} reps available</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, background:autoOn?C.greenL:C.bg, border:`1px solid ${autoOn?C.green:C.border}`, borderRadius:10, padding:"8px 14px" }}>
            <span style={{ fontSize:12, fontWeight:700, color:autoOn?C.greenD:C.ink3 }}>Auto {autoOn?"ON":"OFF"}</span>
            <Toggle on={autoOn} onChange={() => setAutoOn(!autoOn)} />
          </div>
          {unassigned.length > 0 && (
            <Btn onClick={autoAssignAll}>⚡ Auto-Assign All {unassigned.length}</Btn>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:20 }}>
        {/* Left — unassigned leads */}
        <div>
          <h3 style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>Unassigned Leads ({unassigned.length})</h3>

          {unassigned.length === 0 ? (
            <Card>
              <div style={{ textAlign:"center", padding:"36px 20px" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
                <div style={{ fontSize:15, fontWeight:700, color:C.green }}>All leads assigned!</div>
                <div style={{ fontSize:12, color:C.ink3, marginTop:6 }}>No pending assignments right now.</div>
              </div>
            </Card>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {unassigned.map(lead => {
                const src    = SOURCES[lead.source] || {}
                const isAuto = autoOn && sourceRules[lead.source] === "auto"
                const sc     = { HOT:C.red, WARM:C.yellow, NEW:C.blue }[lead.status] || C.ink3
                return (
                  <Card key={lead.id} style={{ borderLeft:`3px solid ${sc}` }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <Avatar name={lead.name} size={40} color={sc} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between" }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{lead.name}</div>
                            <div style={{ fontSize:11, color:C.ink3, marginTop:1 }}>{lead.vehicle}</div>
                          </div>
                          <div style={{ fontSize:16, fontWeight:900, color:C.green }}>{lead.score}</div>
                        </div>
                        <div style={{ display:"flex", gap:7, marginTop:8, flexWrap:"wrap", alignItems:"center" }}>
                          <span style={{ background:`${src.color}15`, color:src.color, fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:8 }}>{src.icon} {src.label}</span>
                          <StatusPill status={lead.status} />
                          {isAuto && <Tag label="⚡ Auto-eligible" color={C.green} />}
                        </div>
                        <div style={{ display:"flex", gap:8, marginTop:10 }}>
                          <button onClick={() => { setAssignModal(lead); setSelectedRep(null) }} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, color:C.ink, borderRadius:9, padding:"8px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>👤 Assign Manually</button>
                          {isAuto ? (
                            <button onClick={() => { const ar=reps.filter(r=>r.active&&r.status!=="offline"); doAssign(lead.id,ar[unassigned.indexOf(lead)%ar.length]?.id) }} style={{ flex:1, background:C.green, border:"none", color:"#fff", borderRadius:9, padding:"8px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>⚡ Quick Auto</button>
                          ) : (
                            <div style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, color:C.ink3, borderRadius:9, padding:"8px", fontSize:11, textAlign:"center" }}>Manual only (rule)</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — method + rep load + history */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Assignment method */}
          <Card style={{ padding:"16px" }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>Assignment Method</h3>
            {METHODS.map(m => (
              <div key={m.id} onClick={() => setMethod(m.id)} style={{ background:method===m.id?C.greenL:C.bg, border:`1.5px solid ${method===m.id?C.green:C.border}`, borderRadius:10, padding:"10px 12px", marginBottom:7, cursor:"pointer", display:"flex", gap:10, alignItems:"center", transition:"all 0.15s" }}>
                <span style={{ fontSize:17 }}>{m.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:method===m.id?C.greenD:C.ink }}>{m.label}</div>
                  <div style={{ fontSize:10, color:C.ink3, marginTop:1 }}>{m.desc}</div>
                </div>
                <div style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${method===m.id?C.green:C.borderD}`, background:method===m.id?C.green:"none" }}/>
              </div>
            ))}
          </Card>

          {/* Team workload */}
          <Card style={{ padding:"16px" }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>Team Workload</h3>
            {reps.map(r => {
              const pct = Math.round((r.leads / r.capacity) * 100)
              const lc  = fmt.loadColor(pct)
              return (
                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, opacity:r.status==="offline"?0.5:1 }}>
                  <Avatar name={r.name} size={32} color={r.color} status={r.status} />
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:C.ink }}>{r.name.split(" ")[0]}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:lc }}>{pct}%</span>
                    </div>
                    <ProgressBar pct={pct} color={lc} height={5} />
                    <div style={{ fontSize:9.5, color:C.ink3, marginTop:2 }}>{r.leads}/{r.capacity} leads · {r.rate}% conv.</div>
                  </div>
                  <span style={{ background:r.status==="available"?C.greenL:r.status==="busy"?C.yellowL:C.bg, color:r.status==="available"?C.greenD:r.status==="busy"?C.yellow:C.ink3, fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:8 }}>{r.status}</span>
                </div>
              )
            })}
          </Card>

          {/* Today's history */}
          <Card style={{ padding:"16px" }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>Today's Log</h3>
            {history.map((l,i) => {
              const src = SOURCES[l.source] || {}
              return (
                <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:i<history.length-1?`1px solid ${C.border}`:"none", alignItems:"center" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.ink }}>{l.name}</div>
                    <div style={{ fontSize:10, color:C.ink3, marginTop:1 }}>{l.vehicle}</div>
                    <div style={{ display:"flex", gap:5, marginTop:3 }}>
                      <span style={{ background:`${src.color}15`, color:src.color, fontSize:8.5, fontWeight:600, padding:"1px 6px", borderRadius:6 }}>{src.icon}</span>
                      <span style={{ fontSize:10, color:C.ink3 }}>{l.time}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.ink }}>{l.rep.split(" ")[0]}</div>
                    <div style={{ fontSize:9, fontWeight:700, color:l.method==="Auto"?C.green:l.method==="Manual"?C.blue:C.orange, marginTop:2 }}>
                      {l.method==="Auto"?"⚡ Auto":l.method==="Manual"?"👤 Manual":"🔄 Round Robin"}
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      </div>

      {/* Manual assign modal */}
      {assignModal && (
        <Modal title="Assign Lead" onClose={() => setAssignModal(null)}>
          <div style={{ background:C.bg, borderRadius:10, padding:"10px 14px", marginBottom:18, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{assignModal.name}</div>
            <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{assignModal.vehicle} · {assignModal.status}</div>
          </div>
          <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:10, letterSpacing:"0.4px" }}>SELECT SALES REP</p>
          {reps.map(rep => {
            const pct   = Math.round((rep.leads / rep.capacity) * 100)
            const isSel = selectedRep === rep.id
            return (
              <div key={rep.id} onClick={() => rep.status !== "offline" && setSelectedRep(rep.id)} style={{ background:isSel?C.greenL:C.bg, border:`1.5px solid ${isSel?C.green:C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:8, cursor:rep.status==="offline"?"not-allowed":"pointer", opacity:rep.status==="offline"?0.4:1, transition:"all 0.15s" }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <Avatar name={rep.name} size={36} color={rep.color} status={rep.status} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:isSel?C.greenD:C.ink }}>{rep.name}</div>
                    <div style={{ fontSize:10, color:C.ink3 }}>{rep.role} · {rep.leads} leads · {rep.rate}% conv.</div>
                    <div style={{ marginTop:5 }}><ProgressBar pct={pct} color={fmt.loadColor(pct)} height={4} /></div>
                  </div>
                  {isSel && <span style={{ fontSize:18, color:C.green }}>✓</span>}
                </div>
              </div>
            )
          })}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <Btn variant="secondary" onClick={() => setAssignModal(null)} style={{ flex:1 }}>Cancel</Btn>
            <Btn disabled={!selectedRep} onClick={() => selectedRep && doAssign(assignModal.id, selectedRep)} style={{ flex:2 }}>
              {selectedRep ? `Assign to ${reps.find(r=>r.id===selectedRep)?.name.split(" ")[0]} →` : "Select a rep first"}
            </Btn>
          </div>
        </Modal>
      )}

      <Toast message={toast} />
    </Shell>
  )
}
