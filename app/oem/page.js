"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { C } from "../../lib/constants"
import { useAuth } from "../../lib/AuthContext"
import { authFetch } from "../../lib/token-storage"

const SVC_COLORS = { OPEN:"#F97316", IN_PROGRESS:"#3B82F6", RESOLVED:"#059669", ESCALATED_OEM:"#8B5CF6" }

function fmtDT(iso) {
  return iso ? new Date(iso).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"
}

export default function OEMDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [dealers, setDealers]         = useState([])
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [acting, setActing]           = useState(null)

  useEffect(() => {
    if (!authLoading && user && user.role !== "oem") router.replace("/login")
  }, [user, authLoading, router])

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/oem")
      const d = await r.json()
      if (d.dealers) setDealers(d.dealers)
      if (d.escalations) setEscalations(d.escalations)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { if (user?.role === "oem") load() }, [user, load])

  const sponsor = async (dealership) => {
    if (!window.confirm(`Sponsor this dealer's monthly subscription? This unlocks their CRM data for your OEM account.`)) return
    setActing(dealership)
    await authFetch("/api/oem", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"sponsor", dealership }) })
    await load()
    setActing(null)
  }

  const assignAgent = async (requestId) => {
    const agent = window.prompt("Service agent name to assign:")
    if (!agent) return
    setActing(requestId)
    await authFetch("/api/oem", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"assign_agent", requestId, agent }) })
    await load()
    setActing(null)
  }

  if (authLoading || !user) return <div style={{ padding:60, textAlign:"center", fontFamily:"system-ui", color:"#64748b" }}>Loading…</div>

  const card = { background:"#fff", border:`1px solid ${C.border}`, borderRadius:14, padding:18 }

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFB", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", color:C.ink }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ background:"#1E293B", padding:"16px 24px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:19, fontWeight:900, color:"#fff" }}>Ev<span style={{ color:"#6EE7B7" }}>.CRM</span> <span style={{ fontSize:11, fontWeight:700, background:"#334155", borderRadius:6, padding:"3px 10px", marginLeft:8, verticalAlign:"middle" }}>OEM CONSOLE</span></div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{user.name} · Network: {user.dealership}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"24px 20px 60px" }}>

        {/* ── Dealer network ── */}
        <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Dealer Network</div>
        <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>
          OEM-distributed dealers share full data automatically. Self-registered dealers stay private until you sponsor their monthly subscription.
        </div>

        {loading ? <div style={{ padding:30, color:C.ink3, fontSize:13 }}>Loading network…</div> : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:14, marginBottom:32 }}>
            {dealers.length === 0 && <div style={{ ...card, color:C.ink3, fontSize:13 }}>No dealers linked to your OEM network yet.</div>}
            {dealers.map(d => (
              <div key={d.dealership} style={{ ...card, borderColor: d.access ? `${C.green}40` : C.border }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800 }}>{d.name}</div>
                    <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{d.dealership} · {d.email}</div>
                  </div>
                  {d.access ? (
                    <span style={{ background:"#D1FAE5", color:"#065F46", fontSize:9.5, fontWeight:800, borderRadius:7, padding:"4px 10px", whiteSpace:"nowrap" }}>
                      {d.oemDistributed ? "✓ FULL ACCESS · OEM-DISTRIBUTED" : "✓ ACCESS · SPONSORED"}
                    </span>
                  ) : (
                    <span style={{ background:"#F3F4F6", color:C.ink3, fontSize:9.5, fontWeight:800, borderRadius:7, padding:"4px 10px", whiteSpace:"nowrap" }}>🔒 SELF-REGISTERED</span>
                  )}
                </div>

                {d.access ? (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
                    {[["Leads", d.leads], ["Bookings", d.bookings], ["Svc Open", d.serviceOpen], ["Escalated", d.serviceEscalated]].map(([l, v]) => (
                      <div key={l} style={{ background:"#F8FAFB", borderRadius:9, padding:"8px 4px" }}>
                        <div style={{ fontSize:17, fontWeight:900, color: l === "Escalated" && v > 0 ? "#8B5CF6" : C.ink }}>{v}</div>
                        <div style={{ fontSize:9, color:C.ink3, marginTop:2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:11.5, color:C.ink3, lineHeight:1.6, marginBottom:10 }}>
                      This dealer registered independently — their data is private. Sponsor their subscription (billing: <b>{d.billingStatus}</b>) to unlock network access.
                    </div>
                    <button onClick={() => sponsor(d.dealership)} disabled={acting === d.dealership}
                      style={{ width:"100%", background:"#1E293B", color:"#fff", border:"none", borderRadius:10, padding:"11px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                      {acting === d.dealership ? "…" : "💳 Sponsor Monthly Subscription → Unlock Access"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Escalated service requests ── */}
        <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>
          Service Escalations {escalations.length > 0 && <span style={{ background:"#8B5CF6", color:"#fff", fontSize:11, fontWeight:800, borderRadius:10, padding:"2px 10px", marginLeft:6, verticalAlign:"middle" }}>{escalations.length}</span>}
        </div>
        <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>Requests escalated by dealers (or auto-escalated after 48h). Assign a service agent to take ownership.</div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {!loading && escalations.length === 0 && <div style={{ ...card, color:C.ink3, fontSize:13 }}>No escalations right now. 🎉</div>}
          {escalations.map(r => (
            <div key={r.id} style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, flexWrap:"wrap", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800 }}>{r.issueType} — {r.vehicle}</div>
                  <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{r.customerName} · {r.customerPhone} · Dealer: {r.dealership}</div>
                </div>
                <span style={{ background:"#EDE9FE", color:"#8B5CF6", fontSize:10, fontWeight:800, borderRadius:8, padding:"4px 12px" }}>
                  ESCALATED {r.escalatedBy === "auto" ? "· AUTO (48H)" : "BY DEALER"}
                </span>
              </div>
              <div style={{ fontSize:12, color:C.ink2, lineHeight:1.6, marginBottom:8 }}>{r.description}</div>
              {r.oemNote && <div style={{ background:"#F8FAFB", borderRadius:9, padding:"8px 12px", fontSize:11.5, color:C.ink2, marginBottom:8 }}>📝 Dealer note: {r.oemNote}</div>}
              <div style={{ display:"flex", gap:14, flexWrap:"wrap", fontSize:11, color:C.ink3, marginBottom:10 }}>
                <span>Raised: <b>{fmtDT(r.createdAt)}</b></span>
                <span>Escalated: <b style={{ color:"#8B5CF6" }}>{fmtDT(r.escalatedAt)}</b></span>
                {r.oemAgent && <span style={{ color:"#059669", fontWeight:700 }}>👷 Agent: {r.oemAgent} (since {fmtDT(r.oemAssignedAt)})</span>}
              </div>
              {!r.oemAgent && (
                <button onClick={() => assignAgent(r.id)} disabled={acting === r.id}
                  style={{ background:"#8B5CF6", color:"#fff", border:"none", borderRadius:9, padding:"10px 18px", fontSize:11.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                  👷 Assign Service Agent
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
