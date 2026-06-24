"use client"
import dynamic from "next/dynamic"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Tag, Avatar, ProgressBar, LiveBadge, SectionHeading, Btn, Modal, Input } from "../../components/ui"
import { C, fmt, STOCK_CONFIG } from "../../lib/constants"
import { db } from "../../lib/firebase-client"
import { collection, query, onSnapshot, orderBy, limit, where, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "../../lib/AuthContext"
import ImportModal from "../../components/ui/ImportModal"

const WA_REPLY_MAP = {
  tco: (l) => `Hi ${l.name}, I'm from ${l.dealerName || 'EvCRM Dealer'}. I saw you calculated massive savings on our TCO tool for ${l.vehicle || 'EVs'}. Would you like to see our latest showroom offers?`,
  subsidy: (l) => `Hi ${l.name}, great news! You're eligible for state subsidies on the ${l.vehicle || 'EV'}. Let's discuss how we can maximize your total savings?`,
  promo: (l) => `Hi ${l.name}, we've received your inquiry for the promo code ${l.promo_code}. When can you visit our showroom to claim it?`,
  default: (l) => `Hi ${l.name}, thanks for your interest in ${l.vehicle || 'our vehicles'}. How can we help you today?`
}

const MONTHS = ["Oct","Nov","Dec","Jan","Feb","Mar"]
const SALES_MOCK = [11,14,18,15,16,22]

function DealerDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [ticker, setTicker] = useState(0)
  const [orderModal, setOrderModal] = useState(null)
  const [importModal, setImportModal] = useState(false)
  
  // Quick Lead Modal
  const [quickLead, setQuickLead] = useState(null) 
  const [creating, setCreating] = useState(false)

  // Real-time states
  const [leads, setLeads] = useState([])
  const [feed, setFeed] = useState([])
  const [reps, setReps] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. SHIELDED DEALER GUARD
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (user.role === "superadmin") {
      router.replace("/admin")
      return
    }
  }, [user, loading])

  useEffect(() => {
    if (!user?.dealership || loading) return

    const qLeads = query(collection(db, "evcrm_leads"), where("dealership", "==", user.dealership))
    const unsubLeads = onSnapshot(qLeads, (snap) => {
      setLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })

    const qFeed = query(collection(db, "evcrm_feed"), where("dealership", "==", user.dealership), orderBy("created_at", "desc"), limit(5))
    const unsubFeed = onSnapshot(qFeed, (snap) => {
      setFeed(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })

    const qReps = query(collection(db, "evcrm_reps"), where("dealership", "==", user.dealership), orderBy("rate", "desc"))
    const unsubReps = onSnapshot(qReps, (snap) => {
      setReps(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })

    const qVehicles = query(collection(db, "evcrm_vehicles"), where("dealership", "==", user.dealership))
    const unsubVehicles = onSnapshot(qVehicles, (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })

    const t = setInterval(() => setTicker(x => x + 1), 5000)

    return () => {
      unsubLeads()
      unsubFeed()
      unsubReps()
      unsubVehicles()
      clearInterval(t)
    }
  }, [user?.dealership])

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const sortedLeads = [...leads].sort((a, b) => {
      const ta = a.created_at?.seconds || 0
      const tb = b.created_at?.seconds || 0
      return tb - ta
    })

    const todayLeads = leads.filter(l => {
      if (!l.created_at) return true 
      return new Date(l.created_at.seconds * 1000).toDateString() === today
    }).length

    const soldUnits = leads.filter(l => l.status === "CLOSED").length
    const revenue = leads.filter(l => l.status === "CLOSED").reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
    const overdue = leads.filter(l => l.next_followup && new Date(l.next_followup).getTime() < Date.now() && l.status !== "CLOSED").length
    
    return { todayLeads, soldUnits, revenue, overdue, sortedLeads }
  }, [leads])

  const kpis = [
    { label:"Today's Leads",   val: loading ? "..." : stats.todayLeads.toString(), delta: stats.todayLeads > 0 ? `+${stats.todayLeads} today` : "Waiting for leads", color:C.blue,   icon:"◎" },
    { label:"Monthly Revenue", val: loading ? "..." : fmt.currency(stats.revenue), delta:"Live from CRM", color:C.green,  icon:"₹" },
    { label:"Units Sold",      val: loading ? "..." : stats.soldUnits.toString(),   delta:"Target: 28",    color:C.purple, icon:"🚗" },
    { label:"Follow-ups Due",  val: loading ? "..." : stats.overdue.toString(),     delta: stats.overdue > 0 ? "⚠ Overdue" : "Up to date", color:C.red,    icon:"⚠" },
  ]

  const handleToggleInventory = async (vId, currentStatus) => {
    const newStatus = currentStatus === "IN_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK"
    try {
      await updateDoc(doc(db, "evcrm_inventory", vId), { status: newStatus })
    } catch (e) {
      console.error("Toggle failed", e)
    }
  }

  const getWhatsAppLink = (lead) => {
    const context = lead.source_context || "default"
    const msg = encodeURIComponent(WA_REPLY_MAP[context](lead))
    return `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${msg}`
  }

  const handleCreateLead = async () => {
    if (!quickLead.name || !quickLead.phone) return
    if (!user?.dealership) {
      if (typeof window !== 'undefined') window.alert("Error: No dealership associated with your account.")
      return
    }
    setCreating(true)
    try {
      await addDoc(collection(db, "evcrm_leads"), {
        ...quickLead,
        dealership: user.dealership,
        status: "NEW",
        created_at: serverTimestamp(),
        source: "direct_dashboard"
      })

      await addDoc(collection(db, "evcrm_feed"), {
        dealership: user.dealership,
        type: "LEAD_CREATED",
        label: "NEW LEAD",
        msg: `${quickLead.name} added via Dashboard`,
        sub: quickLead.vehicle || "General Inquiry",
        icon: "✦",
        color: C.green,
        created_at: serverTimestamp(),
        actionLabel: "View"
      })

      setQuickLead(null)
    } catch (e) {
      if (typeof window !== 'undefined') window.alert("Failed to create lead. Please check your connection.")
    } finally {
      setCreating(false)
    }
  }

  const quickActions = [
    { icon:"✦",  label:"Quick Lead",    desc:"Add walk-in / phone",  color:C.green,  onClick: () => setQuickLead({ name:"", phone:"", vehicle:"" }) },
    { icon:"📄", label:"Build Quote",   desc:"Price + share 60s",    color:C.blue,   href:"/buildprice" },
    { icon:"🌩", label:"Import Data",   desc:"Upload Excel/CSV",     color:C.purple, onClick: () => setImportModal(true) },
    { icon:"⚡", label:"Today's Queue", desc:"AI-selected leads",    color:C.orange, href:"/queue"      },
    { icon:"💬", label:"Connect",       desc:"WhatsApp + email",      color:C.teal,   href:"/connect"    },
    { icon:"🏪", label:"Showroom",      desc:"Product catalog",      color:C.yellow, href:"/showroom"   },
  ]

  const maxS = Math.max(...SALES_MOCK)
  const revPct = stats.revenue > 0 ? Math.min(Math.round((stats.revenue / 2200000) * 100), 100) : 0

  if (loading && !user) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:C.ink }}>
        <style>{`@keyframes evcrm-spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ width:40, height:40, borderRadius:10, background:C.accent, animation:"evcrm-spin .8s linear infinite", marginBottom:20 }} />
        <p style={{ fontSize:13, fontWeight:700, color:C.ink3, letterSpacing:1 }}>ACCESSING EXPERT ENVIRONMENT...</p>
      </div>
    )
  }

  return (
    <Shell title="Dashboard">
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        {kpis.map((k,i)=>(
          <Card key={i} style={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${k.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>{k.icon}</div>
              <Tag label={k.delta} color={k.color} />
            </div>
            <div style={{ fontSize: stats.revenue > 100000 && k.label === "Monthly Revenue" ? 22 : 30, fontWeight:900, color:C.ink, letterSpacing:"-0.5px", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:12, color:C.ink3, marginTop:6 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom:24 }}>
        <p style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.6px", textTransform:"uppercase", marginBottom:12 }}>Quick Actions</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
          {quickActions.map(a=>(
            <button key={a.label} onClick={() => a.href ? router.push(a.href) : a.onClick()} style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"14px 10px", cursor:"pointer", textAlign:"center", transition:"all 0.18s", fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=a.color; e.currentTarget.style.background=`${a.color}10`; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 4px 16px ${a.color}25` }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none" }}
            >
              <div style={{ width:38, height:38, borderRadius:10, background:`${a.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{a.icon}</div>
              <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{a.label}</div>
              <div style={{ fontSize:9, color:C.ink3 }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, marginBottom:16 }}>
        <Card noPad>
          <div style={{ padding:"14px 18px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>⚡ Live Activity</span>
            <LiveBadge />
          </div>
          <div style={{ padding:"8px 16px 4px" }}>
            {feed.length === 0 && !loading && (
              <div style={{ padding:40, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>✨</div>
                <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>Zero Activity</div>
                <div style={{ fontSize:12, color:C.ink3, marginTop:4 }}>Add a lead or import data to see live updates.</div>
              </div>
            )}
            {feed.map((ev,i)=>(
              <div key={ev.id} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<feed.length-1?`1px solid ${C.border}`:"none", alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:9, background:`${ev.color || C.blue}15`, border:`1px solid ${ev.color || C.blue}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{ev.icon || "✦"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ marginBottom:3 }}><span style={{ background:`${ev.color || C.blue}15`, color:ev.color || C.blue, fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:8 }}>{ev.label || "EVENT"}</span></div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.ink, lineHeight:1.4, marginBottom:2 }}>{ev.msg}</div>
                  <div style={{ fontSize:10, color:C.ink3 }}>{ev.sub}</div>
                </div>
                <button style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:8, padding:"5px 10px", fontSize:9.5, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, fontFamily:"inherit" }}>{ev.actionLabel || "View"}</button>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Revenue Progression</span>
              <Tag label={revPct > 0 ? `▲ ${revPct}% achieved` : "Getting started"} color={C.green} />
            </div>
            <div style={{ fontSize:28, fontWeight:900, color:C.ink, letterSpacing:"-1px" }}>{fmt.currency(stats.revenue)}</div>
            <div style={{ fontSize:11, color:C.ink3, marginBottom:10 }}>Target ₹22L · Monthly tracker</div>
            <ProgressBar pct={revPct} />
            <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:48, marginTop:12 }}>
              {SALES_MOCK.map((s,i)=>(
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <div style={{ width:"100%", background:i===5?C.green:C.greenL, borderRadius:"3px 3px 0 0", height:`${(s/maxS)*40}px` }}/>
                  <span style={{ fontSize:7.5, color:C.ink3 }}>{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding:"14px 16px" }}>
            <SectionHeading actionLabel="My Team" action={()=>router.push("/team")}>Agent Scorecards</SectionHeading>
            {reps.slice(0,3).map((r,i)=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:i<2?12:0 }}>
                <Avatar name={r.name} size={30} color={r.color || C.blue} status={r.status} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:C.ink }}>{r.name.split(" ")[0]}</span>
                    <span style={{ fontSize:11, fontWeight:800, color:r.color || C.blue }}>{r.rate || 0}%</span>
                  </div>
                  <ProgressBar pct={((r.rate || 0)/30)*100} color={r.color || C.blue} height={4} />
                  <div style={{ fontSize:9.5, color:C.ink3, marginTop:2 }}>{r.leads || 0} leads · {r.closed || 0} closed</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {quickLead && (
        <Modal title="Add Instant Lead" onClose={() => setQuickLead(null)}>
          <div style={{ display:"grid", gap:14 }}>
            <Input label="Customer Name" placeholder="Ex. Rajesh Kumar" value={quickLead.name} onChange={e => setQuickLead({...quickLead, name: e.target.value})} />
            <Input label="Phone Number" placeholder="Ex. 9876543210" value={quickLead.phone} onChange={e => setQuickLead({...quickLead, phone: e.target.value})} />
            <Input label="Vehicle of Interest" placeholder="Ex. Tata Nexon EV" value={quickLead.vehicle} onChange={e => setQuickLead({...quickLead, vehicle: e.target.value})} />
            <div style={{ display:"flex", gap:10, marginTop:10 }}>
              <Btn variant="secondary" style={{ flex:1 }} onClick={() => setQuickLead(null)}>Cancel</Btn>
              <Btn loading={creating} style={{ flex:2 }} onClick={handleCreateLead}>Create Lead →</Btn>
            </div>
          </div>
        </Modal>
      )}

      <ImportModal open={importModal} onClose={() => setImportModal(false)} dealership={user?.dealership} />
    </Shell>
  )
}

export default dynamic(() => Promise.resolve(DealerDashboard), { ssr: false })
