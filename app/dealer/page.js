"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Tag, Avatar, ProgressBar, LiveBadge, SectionHeading, Btn, Modal } from "../../components/ui"
import { C, fmt, STOCK_CONFIG } from "../../lib/constants"
import { getDealerInfo, getReps, getLiveFeed, getVehicles } from "../../lib/data"

const MONTHS = ["Oct","Nov","Dec","Jan","Feb","Mar"]
const SALES  = [11,14,18,15,16,22]

export default function DealerPage() {
  const router = useRouter()
  const [ticker,     setTicker]     = useState(0)
  const [orderModal, setOrderModal] = useState(null)
  useEffect(()=>{ const t=setInterval(()=>setTicker(x=>x+1),5000); return()=>clearInterval(t) },[])

  const dealer   = getDealerInfo()
  const reps     = getReps()
  const feed     = getLiveFeed()
  const vehicles = getVehicles()
  const maxS     = Math.max(...SALES)
  const revPct   = Math.round((dealer.monthlyRevenue/dealer.monthlyTarget)*100)

  const kpis = [
    { label:"Today's Leads",   val:ticker%4===0?"8":"7",              delta:"+1 this hour", color:C.blue,   icon:"◎" },
    { label:"Monthly Revenue", val:fmt.currency(dealer.monthlyRevenue),delta:"▲ 34% vs Feb", color:C.green,  icon:"₹" },
    { label:"Units Sold",      val:"22",                              delta:"Target: 28",    color:C.purple, icon:"🚗" },
    { label:"Follow-ups Due",  val:ticker%3===0?"6":"5",              delta:"⚠ Overdue",    color:C.red,    icon:"⚠" },
  ]

  const quickActions = [
    { icon:"✦",  label:"New Lead",      desc:"Add walk-in / phone",  color:C.green,  href:"/leads/new"  },
    { icon:"📄", label:"Build Quote",   desc:"Price + share 60s",    color:C.blue,   href:"/buildprice" },
    { icon:"⚡", label:"Today's Queue", desc:"10 AI-selected leads", color:C.orange, href:"/queue"      },
    { icon:"💬", label:"Connect",       desc:"WhatsApp + email",      color:C.teal,   href:"/connect"    },
    { icon:"👤", label:"Assign Leads",  desc:"6 waiting for rep",     color:C.purple, href:"/assign"     },
    { icon:"🏪", label:"Showroom",      desc:"Public product page",   color:C.yellow, href:"/showroom"   },
  ]

  return (
    <Shell title="Dashboard">
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        {kpis.map((k,i)=>(
          <Card key={i} style={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${k.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>{k.icon}</div>
              <Tag label={k.delta} color={k.color} />
            </div>
            <div style={{ fontSize:30, fontWeight:900, color:C.ink, letterSpacing:"-0.5px", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:12, color:C.ink3, marginTop:6 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom:24 }}>
        <p style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.6px", textTransform:"uppercase", marginBottom:12 }}>Quick Actions</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
          {quickActions.map(a=>(
            <button key={a.href} onClick={()=>router.push(a.href)} style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"14px 10px", cursor:"pointer", textAlign:"center", transition:"all 0.18s", fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}
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

      {/* Main 2-col */}
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, marginBottom:16 }}>

        {/* Live feed */}
        <Card noPad>
          <div style={{ padding:"14px 18px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>⚡ Live Activity</span>
            <LiveBadge />
          </div>
          <div style={{ padding:"8px 16px 4px" }}>
            {feed.map((ev,i)=>(
              <div key={ev.id} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<feed.length-1?`1px solid ${C.border}`:"none", alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:9, background:`${ev.color}15`, border:`1px solid ${ev.color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{ev.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ marginBottom:3 }}><span style={{ background:`${ev.color}15`, color:ev.color, fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:8 }}>{ev.label}</span></div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.ink, lineHeight:1.4, marginBottom:2 }}>{ev.msg}</div>
                  <div style={{ fontSize:10, color:C.ink3 }}>{ev.sub}</div>
                </div>
                <button style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:8, padding:"5px 10px", fontSize:9.5, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, fontFamily:"inherit" }}>{ev.actionLabel}</button>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Revenue */}
          <Card style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Revenue — March</span>
              <Tag label="▲ 34%" color={C.green} />
            </div>
            <div style={{ fontSize:32, fontWeight:900, color:C.ink, letterSpacing:"-1px" }}>₹18.4<span style={{ fontSize:16, color:C.ink3, fontWeight:400 }}>L</span></div>
            <div style={{ fontSize:11, color:C.ink3, marginBottom:10 }}>Target ₹22L · {revPct}% achieved</div>
            <ProgressBar pct={revPct} />
            <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:48, marginTop:12 }}>
              {SALES.map((s,i)=>(
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <div style={{ width:"100%", background:i===5?C.green:C.greenL, borderRadius:"3px 3px 0 0", height:`${(s/maxS)*40}px` }}/>
                  <span style={{ fontSize:7.5, color:C.ink3 }}>{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Agent scorecards */}
          <Card style={{ padding:"14px 16px" }}>
            <SectionHeading actionLabel="Full report" action={()=>router.push("/command")}>Agent Scorecards</SectionHeading>
            {reps.slice(0,3).map((r,i)=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:i<2?12:0 }}>
                <Avatar name={r.name} size={30} color={r.color} status={r.status} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:C.ink }}>{r.name.split(" ")[0]}</span>
                    <span style={{ fontSize:11, fontWeight:800, color:r.color }}>{r.rate}%</span>
                  </div>
                  <ProgressBar pct={(r.rate/30)*100} color={r.color} height={4} />
                  <div style={{ fontSize:9.5, color:C.ink3, marginTop:2 }}>{r.leads} leads · {r.closed} closed</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Inventory strip */}
      <Card noPad>
        <div style={{ padding:"14px 18px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>🚗 Vehicle Inventory Intelligence</span>
          <button onClick={()=>router.push("/vehicles")} style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>View All →</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${vehicles.length},1fr)` }}>
          {vehicles.map((v,i)=>{
            const st = STOCK_CONFIG[v.status]||STOCK_CONFIG.OK
            return (
              <div key={v.id} style={{ padding:"14px 16px", borderRight:i<vehicles.length-1?`1px solid ${C.border}`:"none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{v.brand} {v.model}</div>
                    <span style={{ background:st.bg, color:st.color, fontSize:8.5, fontWeight:700, padding:"2px 7px", borderRadius:6 }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:v.trend.startsWith("+")?C.green:C.red }}>{v.trend}</div>
                </div>
                <div style={{ display:"flex", gap:12, marginBottom:10 }}>
                  <div style={{ textAlign:"center" }}><div style={{ fontSize:18, fontWeight:900, color:v.stock===0?C.red:C.ink }}>{v.stock}</div><div style={{ fontSize:9, color:C.ink3 }}>Stock</div></div>
                  <div style={{ textAlign:"center" }}><div style={{ fontSize:18, fontWeight:900, color:C.blue }}>{v.demand}</div><div style={{ fontSize:9, color:C.ink3 }}>Demand</div></div>
                </div>
                {v.status==="NO_STOCK" && <button onClick={()=>setOrderModal(v)} style={{ width:"100%", background:C.green, color:"#fff", border:"none", borderRadius:8, padding:"7px", fontSize:10, fontWeight:700, cursor:"pointer" }}>📦 Order Stock</button>}
                {v.status==="DEAD"     && <button style={{ width:"100%", background:C.redL, color:C.red, border:`1px solid ${C.red}30`, borderRadius:8, padding:"7px", fontSize:10, fontWeight:700, cursor:"pointer" }}>🔴 Recovery</button>}
                {v.status==="LOW"      && <button onClick={()=>setOrderModal(v)} style={{ width:"100%", background:C.orangeL, color:C.orange, border:`1px solid ${C.orange}30`, borderRadius:8, padding:"7px", fontSize:10, fontWeight:700, cursor:"pointer" }}>📦 Restock</button>}
                {v.status==="OK"       && <button style={{ width:"100%", background:C.greenL, color:C.greenD, border:`1px solid ${C.green}30`, borderRadius:8, padding:"7px", fontSize:10, fontWeight:700, cursor:"pointer" }}>✅ Healthy</button>}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Stock order modal */}
      {orderModal && (
        <Modal title="Raise Stock Request" onClose={()=>setOrderModal(null)}>
          <div style={{ fontSize:12, color:C.ink3, marginBottom:16 }}>{orderModal.brand} {orderModal.model} · {fmt.currency(orderModal.price)}</div>
          <div style={{ display:"flex", gap:14, justifyContent:"center", background:C.bg, borderRadius:12, padding:14, marginBottom:16, border:`1px solid ${C.border}` }}>
            {[{v:orderModal.stock,l:"In Stock",c:C.red},{v:orderModal.demand,l:"Demand",c:C.orange},{v:orderModal.waitlist?.length||0,l:"Waitlisted",c:C.green}].map((s,i)=>(
              <div key={i} style={{ textAlign:"center" }}><div style={{ fontSize:22, fontWeight:900, color:s.c }}>{s.v}</div><div style={{ fontSize:9.5, color:C.ink3 }}>{s.l}</div></div>
            ))}
          </div>
          {orderModal.waitlist?.slice(0,3).map((c,i)=>(
            <div key={i} style={{ background:C.bg, borderRadius:9, padding:"8px 12px", marginBottom:6, display:"flex", justifyContent:"space-between", border:`1px solid ${C.border}` }}>
              <div><div style={{ fontSize:11, fontWeight:600, color:C.ink }}>{c.name}</div><div style={{ fontSize:9.5, color:C.ink3 }}>{c.note}</div></div>
              <span style={{ fontSize:10.5, color:C.blue }}>{c.phone}</span>
            </div>
          ))}
          <div style={{ textAlign:"center", margin:"16px 0" }}>
            <div style={{ fontSize:34, fontWeight:900, color:C.green }}>{orderModal.suggestOrder||10}</div>
            <div style={{ fontSize:11, color:C.ink3 }}>AI suggested quantity based on 30-day demand</div>
          </div>
          <Btn onClick={()=>setOrderModal(null)} style={{ width:"100%" }}>🚀 Raise Order — {orderModal.suggestOrder||10} Units</Btn>
        </Modal>
      )}
    </Shell>
  )
}
