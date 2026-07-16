"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { C } from "../../lib/constants"
import { useAuth } from "../../lib/AuthContext"
import { authFetch } from "../../lib/token-storage"

const SVC_COLORS = { OPEN:"#F97316", IN_PROGRESS:"#3B82F6", RESOLVED:"#059669", ESCALATED_OEM:"#8B5CF6" }
const STOCK_COLORS = { PENDING:"#F97316", APPROVED:"#3B82F6", FULFILLED:"#059669", REJECTED:"#EF4444" }

function fmtDT(iso) {
  return iso ? new Date(iso).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"
}

const TABS = [
  { id:"network",  icon:"🏪", label:"My Network" },
  { id:"onboard",  icon:"➕", label:"Onboard Dealer" },
  { id:"insidesales", icon:"📞", label:"Inside Sales" },
  { id:"feedback", icon:"💬", label:"Feedback" },
  { id:"stock",    icon:"📦", label:"Stock Requests" },
  { id:"reports",  icon:"📊", label:"Reports" },
]

export default function OEMDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [tab, setTab] = useState("network")
  const [dealers, setDealers]         = useState([])
  const [escalations, setEscalations] = useState([])
  const [quoteRejections, setQuoteRejections] = useState([])
  const [repComments, setRepComments] = useState([])
  const [stockRequests, setStockRequests] = useState([])
  const [locationTrends, setLocationTrends] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(null)

  // Onboard-dealer form
  const [form, setForm] = useState({ businessName:"", ownerName:"", email:"", phone:"", city:"", state:"" })
  const [onboarding, setOnboarding] = useState(false)
  const [onboardErrors, setOnboardErrors] = useState({})
  const [onboardResult, setOnboardResult] = useState(null)
  const [duplicateDealer, setDuplicateDealer] = useState(null)

  // Bulk import state
  const [onboardMode, setOnboardMode] = useState("manual") // "manual" or "bulk"
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkParsing, setBulkParsing] = useState(false)
  const [bulkPreview, setBulkPreview] = useState(null) // { importId, summary, preview, errorDetails }
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)

  useEffect(() => {
    if (!authLoading && user && user.role !== "oem") router.replace("/login")
  }, [user, authLoading, router])

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/oem")
      const d = await r.json()
      if (d.dealers) setDealers(d.dealers)
      if (d.escalations) setEscalations(d.escalations)
      if (d.quoteRejections) setQuoteRejections(d.quoteRejections)
      if (d.repComments) setRepComments(d.repComments)
      if (d.stockRequests) setStockRequests(d.stockRequests)
      if (d.locationTrends) setLocationTrends(d.locationTrends)
      if (d.leads) setLeads(d.leads)
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

  const assignInsideSales = async (leadId) => {
    const agent = window.prompt("Inside sales agent name to assign:")
    if (!agent) return
    setActing(leadId)
    await authFetch("/api/oem", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"assign_inside_sales", leadId, agent }) })
    await load()
    setActing(null)
  }

  const verifyLead = async (leadId, verified) => {
    setActing(leadId)
    await authFetch("/api/oem", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"verify_lead", leadId, verified }) })
    await load()
    setActing(null)
  }

  const updateStockRequest = async (requestId, status) => {
    setActing(requestId)
    await authFetch("/api/oem", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"update_stock_request", requestId, status }) })
    await load()
    setActing(null)
  }

  const handleOnboard = async () => {
    setOnboardErrors({}); setOnboardResult(null); setDuplicateDealer(null)
    setOnboarding(true)
    try {
      const res = await authFetch("/api/oem/onboard-dealer", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) })
      const data = await res.json()
      if (res.ok && data.success) {
        setOnboardResult(data)
        setForm({ businessName:"", ownerName:"", email:"", phone:"", city:"", state:"" })
        await load()
      } else {
        setOnboardErrors(data.errors || { global: data.error || "Onboarding failed" })
        if (data.duplicate?.canSponsor) {
          setDuplicateDealer(data.duplicate)
          await load() // dealer may have just been linked into this OEM's network
        }
      }
    } finally {
      setOnboarding(false)
    }
  }

  const sponsorDuplicate = async () => {
    if (!duplicateDealer) return
    await sponsor(duplicateDealer.dealership)
    setDuplicateDealer(null)
    setTab("network")
  }

  // Bulk import handlers
  const handleBulkFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkFile(file)
    setBulkParsing(true)
    setBulkPreview(null)
    setBulkResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await authFetch("/api/oem/bulk-import", { method: "POST", body: formData })
      const data = await res.json()

      if (data.success) {
        setBulkPreview(data)
      } else {
        setBulkPreview({ error: data.message || "Failed to parse file" })
      }
    } catch (err) {
      setBulkPreview({ error: `Error: ${err.message}` })
    } finally {
      setBulkParsing(false)
    }
  }

  const handleBulkConfirm = async () => {
    if (!bulkPreview?.importId) return
    setBulkConfirming(true)

    try {
      const res = await authFetch("/api/oem/bulk-import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: bulkPreview.importId }),
      })
      const data = await res.json()

      if (data.success) {
        setBulkResult(data)
        setBulkFile(null)
        setBulkPreview(null)
        await load()
      } else {
        setBulkPreview({ ...bulkPreview, error: data.message || "Failed to confirm import" })
      }
    } catch (err) {
      setBulkPreview({ ...bulkPreview, error: `Error: ${err.message}` })
    } finally {
      setBulkConfirming(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const res = await authFetch("/api/oem/bulk-import")
      const csv = await res.text()
      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "dealer-template.csv"
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Failed to download template: ${err.message}`)
    }
  }

  if (authLoading || !user) return <div style={{ padding:60, textAlign:"center", fontFamily:"system-ui", color:"#64748b" }}>Loading…</div>

  const card = { background:"#fff", border:`1px solid ${C.border}`, borderRadius:14, padding:18 }
  const input = { width:"100%", background:"#F8FAFB", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", fontSize:13, color:C.ink, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFB", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", color:C.ink }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ background:"#1E293B", padding:"16px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:19, fontWeight:900, color:"#fff" }}>Ev<span style={{ color:"#6EE7B7" }}>.CRM</span> <span style={{ fontSize:11, fontWeight:700, background:"#334155", borderRadius:6, padding:"3px 10px", marginLeft:8, verticalAlign:"middle" }}>OEM CONSOLE</span></div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{user.name} · Network: {user.dealership}</div>
          </div>
          <button onClick={logout}
            style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.8)", borderRadius:9, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}
            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#fff" }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.8)" }}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 20px 60px" }}>

        {/* ── Tabs ── */}
        <div style={{ display:"flex", gap:4, marginBottom:24, background:"#fff", border:`1px solid ${C.border}`, borderRadius:14, padding:4, overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, whiteSpace:"nowrap", background:tab===t.id?"#F8FAFB":"transparent", border:tab===t.id?`1px solid ${C.border}`:"1px solid transparent", color:tab===t.id?C.ink:C.ink3, borderRadius:10, padding:"10px 14px", fontSize:12, fontWeight:tab===t.id?700:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <span>{t.icon}</span><span>{t.label}</span>
              {t.id==="stock" && stockRequests.filter(r=>r.status==="PENDING").length>0 && <span style={{ background:"#F97316", color:"#fff", fontSize:9, fontWeight:800, borderRadius:10, padding:"1px 6px" }}>{stockRequests.filter(r=>r.status==="PENDING").length}</span>}
              {t.id==="network" && escalations.length>0 && <span style={{ background:"#8B5CF6", color:"#fff", fontSize:9, fontWeight:800, borderRadius:10, padding:"1px 6px" }}>{escalations.length}</span>}
            </button>
          ))}
        </div>

        {/* ── MY NETWORK ── */}
        {tab === "network" && (
          <>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Dealer Network</div>
            <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>
              OEM-distributed dealers share full data automatically. Self-registered dealers stay private until you sponsor their monthly subscription.
            </div>

            {loading ? <div style={{ padding:30, color:C.ink3, fontSize:13 }}>Loading network…</div> : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:14, marginBottom:32 }}>
                {dealers.length === 0 && <div style={{ ...card, color:C.ink3, fontSize:13 }}>No dealers linked to your OEM network yet. Use "Onboard Dealer" to add your first one.</div>}
                {dealers.map(d => (
                  <div key={d.dealership} style={{ ...card, borderColor: d.access ? `${C.green}40` : C.border }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800 }}>{d.businessName || d.name}</div>
                        <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{d.dealership} · {d.email}</div>
                      </div>
                      {d.access ? (
                        <span style={{ background:"#D1FAE5", color:"#065F46", fontSize:9.5, fontWeight:800, borderRadius:7, padding:"4px 10px", whiteSpace:"nowrap" }}>
                          {d.oemDistributed ? "✓ FULL ACCESS · DISTRIBUTED" : "✓ ACCESS · SPONSORED"}
                        </span>
                      ) : (
                        <span style={{ background:"#F3F4F6", color:C.ink3, fontSize:9.5, fontWeight:800, borderRadius:7, padding:"4px 10px", whiteSpace:"nowrap" }}>🔒 SELF-REGISTERED</span>
                      )}
                    </div>

                    {d.access ? (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
                        {[["Leads", d.leads], ["Conv %", d.conversionRate+"%"], ["Svc Open", d.serviceOpen], ["Escalated", d.serviceEscalated]].map(([l, v]) => (
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
          </>
        )}

        {/* ── ONBOARD DEALER ── */}
        {tab === "onboard" && (
          <div style={{ maxWidth:580 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Onboard a New Dealer</div>
            <div style={{ fontSize:12, color:C.ink3, marginBottom:20, lineHeight:1.6 }}>
              This is how you distribute EvCRM directly to your dealer network. The dealer gets full network access immediately — no sponsorship step needed, since they came from you.
            </div>

            {/* Mode Toggle */}
            <div style={{ display:"flex", gap:12, marginBottom:20 }}>
              <button onClick={()=>setOnboardMode("manual")}
                style={{ flex:1, background:onboardMode==="manual"?"#1E293B":"#F3F4F6", color:onboardMode==="manual"?"#fff":C.ink2, border:"none", borderRadius:10, padding:"12px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                ✎ Manual Entry (1–10)
              </button>
              <button onClick={()=>setOnboardMode("bulk")}
                style={{ flex:1, background:onboardMode==="bulk"?"#1E293B":"#F3F4F6", color:onboardMode==="bulk"?"#fff":C.ink2, border:"none", borderRadius:10, padding:"12px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                📤 Bulk Import (2K+)
              </button>
            </div>

            {/* MANUAL MODE */}
            {onboardMode === "manual" && (
              <>
            {onboardResult ? (
              <div style={{ ...card, borderColor:`${C.green}40`, background:"#F0FDF4" }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#065F46", marginBottom:10 }}>✓ {onboardResult.dealer.businessName} onboarded</div>
                <div style={{ fontSize:12, color:C.ink2, marginBottom:14 }}>{onboardResult.message}</div>
                <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:14, fontSize:12 }}>
                  <div style={{ marginBottom:6 }}><b>Email:</b> {onboardResult.dealer.email}</div>
                  <div style={{ marginBottom:6 }}><b>Temp password:</b> <code style={{ background:"#F8FAFB", padding:"2px 8px", borderRadius:6, fontWeight:700 }}>{onboardResult.tempPassword}</code></div>
                  <div><b>Dealership ID:</b> {onboardResult.dealer.dealership}</div>
                </div>
                <button onClick={()=>setOnboardResult(null)} style={{ marginTop:14, background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ Onboard Another</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:C.ink3, marginBottom:6, display:"block" }}>DEALERSHIP BUSINESS NAME</label>
                  <input style={input} placeholder="e.g. Sunrise Motors" value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} />
                  {onboardErrors.businessName && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>{onboardErrors.businessName}</div>}
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:C.ink3, marginBottom:6, display:"block" }}>OWNER NAME</label>
                  <input style={input} placeholder="e.g. Suresh Patil" value={form.ownerName} onChange={e=>setForm({...form,ownerName:e.target.value})} />
                  {onboardErrors.ownerName && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>{onboardErrors.ownerName}</div>}
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:C.ink3, marginBottom:6, display:"block" }}>EMAIL</label>
                  <input style={input} type="email" placeholder="owner@dealership.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
                  {onboardErrors.email && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>{onboardErrors.email}</div>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:800, color:C.ink3, marginBottom:6, display:"block" }}>PHONE</label>
                    <input style={input} placeholder="10-digit mobile" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:800, color:C.ink3, marginBottom:6, display:"block" }}>CITY</label>
                    <input style={input} placeholder="e.g. Pune" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:C.ink3, marginBottom:6, display:"block" }}>STATE</label>
                  <input style={input} placeholder="e.g. Maharashtra" value={form.state} onChange={e=>setForm({...form,state:e.target.value})} />
                </div>
                {onboardErrors.global && <div style={{ fontSize:12, color:C.red }}>{onboardErrors.global}</div>}
                {duplicateDealer && (
                  <div style={{ background:"#EFF6FF", border:"1px solid #3B82F6", borderRadius:10, padding:14 }}>
                    <div style={{ fontSize:12.5, color:"#1E40AF", marginBottom:10 }}>
                      <b>{duplicateDealer.businessName || "This dealer"}</b> already has an EvCRM account. Sponsor their subscription instead to bring them into your network.
                    </div>
                    <button onClick={sponsorDuplicate} disabled={acting === duplicateDealer.dealership}
                      style={{ width:"100%", background:"#1E293B", color:"#fff", border:"none", borderRadius:10, padding:"11px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                      {acting === duplicateDealer.dealership ? "…" : "💳 Sponsor This Dealer Instead →"}
                    </button>
                  </div>
                )}
                <button onClick={handleOnboard} disabled={onboarding}
                  style={{ background:"#1E293B", color:"#fff", border:"none", borderRadius:10, padding:"13px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", opacity:onboarding?0.7:1 }}>
                  {onboarding ? "Onboarding…" : "➕ Onboard Dealer — Grant Full Access"}
                </button>
              </div>
            )}
              </>
            )}

            {/* BULK IMPORT MODE */}
            {onboardMode === "bulk" && (
              <>
                {bulkResult ? (
                  <div style={{ ...card, borderColor:`${C.green}40`, background:"#F0FDF4" }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#065F46", marginBottom:10 }}>✓ Import Complete</div>
                    <div style={{ fontSize:12, color:C.ink2, marginBottom:14 }}>
                      Successfully created <b>{bulkResult.summary.created}</b> dealer accounts. Verification emails have been sent.
                      {bulkResult.summary.failed > 0 && <> <b>{bulkResult.summary.failed}</b> accounts failed to create.</>}
                    </div>
                    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:14, fontSize:12, marginBottom:14 }}>
                      <div style={{ marginBottom:6 }}><b>Created:</b> {bulkResult.summary.created} / {bulkResult.summary.requested}</div>
                      <div><b>Failed:</b> {bulkResult.summary.failed}</div>
                    </div>
                    <div style={{ background:"#EFF6FF", border:"1px solid #3B82F6", borderRadius:10, padding:12, fontSize:12, color:"#1E40AF", marginBottom:14 }}>
                      ℹ️ Dealers will receive a verification email. They have 24 hours to verify their details and set a password.
                    </div>
                    <button onClick={()=>{setBulkResult(null); setBulkFile(null); setBulkPreview(null)}}
                      style={{ width:"100%", background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"11px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      📤 Import Another File
                    </button>
                  </div>
                ) : bulkPreview ? (
                  <div>
                    {bulkPreview.error ? (
                      <div style={{ ...card, borderColor:`#EF4444`, background:"#FEF2F2" }}>
                        <div style={{ fontSize:13, fontWeight:800, color:C.red, marginBottom:10 }}>✕ Error</div>
                        <div style={{ fontSize:12, color:C.ink2, marginBottom:14 }}>{bulkPreview.error}</div>
                        <button onClick={()=>{setBulkFile(null); setBulkPreview(null)}}
                          style={{ width:"100%", background:C.red, color:"#fff", border:"none", borderRadius:10, padding:"11px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                          Try Another File
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ ...card, marginBottom:16 }}>
                          <div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>📊 Preview</div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:16 }}>
                            <div style={{ background:"#F0FDF4", borderRadius:10, padding:12, textAlign:"center" }}>
                              <div style={{ fontSize:18, fontWeight:900, color:"#059669" }}>{bulkPreview.summary.validRows}</div>
                              <div style={{ fontSize:10, color:C.ink3, marginTop:4 }}>Valid</div>
                            </div>
                            <div style={{ background:"#FEF3C7", borderRadius:10, padding:12, textAlign:"center" }}>
                              <div style={{ fontSize:18, fontWeight:900, color:"#D97706" }}>{bulkPreview.summary.duplicates}</div>
                              <div style={{ fontSize:10, color:C.ink3, marginTop:4 }}>Duplicates</div>
                            </div>
                            <div style={{ background:"#FEE2E2", borderRadius:10, padding:12, textAlign:"center" }}>
                              <div style={{ fontSize:18, fontWeight:900, color:C.red }}>{bulkPreview.summary.errors}</div>
                              <div style={{ fontSize:10, color:C.ink3, marginTop:4 }}>Errors</div>
                            </div>
                            <div style={{ background:"#F3F4F6", borderRadius:10, padding:12, textAlign:"center" }}>
                              <div style={{ fontSize:18, fontWeight:900, color:C.ink2 }}>{bulkPreview.summary.totalRows}</div>
                              <div style={{ fontSize:10, color:C.ink3, marginTop:4 }}>Total</div>
                            </div>
                          </div>

                          {bulkPreview.errorDetails && bulkPreview.errorDetails.length > 0 && (
                            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:12, marginBottom:14 }}>
                              <div style={{ fontSize:12, fontWeight:800, color:C.red, marginBottom:8 }}>⚠️ Errors Found</div>
                              {bulkPreview.errorDetails.slice(0, 5).map((err, i) => (
                                <div key={i} style={{ fontSize:11, color:C.ink2, marginBottom:4, paddingBottom:4, borderBottom: i < 4 ? `1px solid #FECACA` : "none" }}>
                                  <b>Row {err.row}:</b> {err.email || "(no email)"} — {err.errors}
                                </div>
                              ))}
                              {bulkPreview.fullErrorCount > 5 && <div style={{ fontSize:11, color:C.ink3, marginTop:8 }}>… and {bulkPreview.fullErrorCount - 5} more errors</div>}
                            </div>
                          )}

                          <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Sample Valid Rows:</div>
                          <div style={{ background:"#F8FAFB", border:`1px solid ${C.border}`, borderRadius:10, padding:12, overflowX:"auto" }}>
                            <table style={{ fontSize:11, width:"100%", borderCollapse:"collapse" }}>
                              <thead>
                                <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                                  {["Name", "Email", "City", "State"].map(h => (
                                    <th key={h} style={{ padding:"6px 8px", textAlign:"left", fontWeight:700, color:C.ink3 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {bulkPreview.preview.slice(0, 5).map((row, i) => (
                                  <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                                    <td style={{ padding:"6px 8px" }}>{row.name}</td>
                                    <td style={{ padding:"6px 8px", fontSize:10 }}>{row.email}</td>
                                    <td style={{ padding:"6px 8px" }}>{row.city}</td>
                                    <td style={{ padding:"6px 8px" }}>{row.state}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div style={{ display:"flex", gap:12 }}>
                          <button onClick={()=>{setBulkFile(null); setBulkPreview(null)}}
                            style={{ flex:1, background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"11px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            ← Cancel
                          </button>
                          <button onClick={handleBulkConfirm} disabled={bulkConfirming}
                            style={{ flex:1, background:"#059669", color:"#fff", border:"none", borderRadius:10, padding:"11px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:bulkConfirming?0.7:1 }}>
                            {bulkConfirming ? "Creating accounts…" : `✓ Confirm & Send ${bulkPreview.summary.validRows} Emails`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ ...card, marginBottom:16 }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>📤 Upload Dealer List</div>
                      <p style={{ fontSize:12, color:C.ink3, marginBottom:14, lineHeight:1.5 }}>
                        Upload an Excel or CSV file with your dealer information. We'll validate, show you a preview, then create accounts and send verification emails.
                      </p>
                      <label style={{ display:"block", border:`2px dashed #3B82F6`, borderRadius:12, padding:"32px 20px", textAlign:"center", cursor:"pointer", background:"#EFF6FF", transition:"all 0.2s" }}
                        onMouseEnter={e=>{ e.currentTarget.style.background="#DBEAFE"; e.currentTarget.style.borderColor="#1E40AF" }}
                        onMouseLeave={e=>{ e.currentTarget.style.background="#EFF6FF"; e.currentTarget.style.borderColor="#3B82F6" }}>
                        <div style={{ fontSize:32, marginBottom:8 }}>📁</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#1E40AF", marginBottom:4 }}>{bulkFile ? bulkFile.name : "Choose file or drag & drop"}</div>
                        <div style={{ fontSize:11, color:"#0284C7" }}>Excel (.xlsx) or CSV — up to 5 MB</div>
                        <input type="file" onChange={handleBulkFileSelect} accept=".xlsx,.xls,.csv" style={{ display:"none" }} disabled={bulkParsing} />
                      </label>
                      <button onClick={downloadTemplate}
                        style={{ width:"100%", marginTop:12, background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        📥 Download Template
                      </button>
                    </div>

                    {bulkParsing && <div style={{ ...card, textAlign:"center", color:C.ink3, fontSize:12 }}>Parsing file…</div>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── INSIDE SALES ── */}
        {tab === "insidesales" && (
          <>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Inside Sales — Call & Verify</div>
            <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>
              Assign an inside sales agent to call leads across your network, confirm genuine interest, then verify — dealers see a badge and can prioritize follow-up.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {!loading && leads.length === 0 && <div style={{ ...card, color:C.ink3, fontSize:13 }}>No leads yet from your accessible dealers.</div>}
              {leads.map(l => (
                <div key={l.id} style={card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, flexWrap:"wrap", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800 }}>
                        {l.name} {l.vehicle ? `— ${l.vehicle}` : ""}
                        {l.oemVerified && <span style={{ fontSize:9, fontWeight:800, color:"#065F46", background:"#D1FAE5", borderRadius:6, padding:"2px 8px", marginLeft:8 }}>✓ OEM-VERIFIED</span>}
                      </div>
                      <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{l.phone} · {l.dealerName} · {l.status}</div>
                    </div>
                    <span style={{ background:"#F3F4F6", color:C.ink3, fontSize:9.5, fontWeight:800, borderRadius:7, padding:"4px 10px", whiteSpace:"nowrap" }}>{fmtDT(l.createdAt)}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <button onClick={()=>assignInsideSales(l.id)} disabled={acting===l.id}
                      style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:8, padding:"7px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      {l.insideSalesAgent ? `📞 ${l.insideSalesAgent}` : "📞 Assign Agent"}
                    </button>
                    {l.insideSalesAgent && (
                      <button onClick={()=>verifyLead(l.id, !l.oemVerified)} disabled={acting===l.id}
                        style={{ background: l.oemVerified ? "none" : "#059669", color: l.oemVerified ? C.ink2 : "#fff", border:`1px solid ${l.oemVerified ? C.border : "#059669"}`, borderRadius:8, padding:"7px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        {acting===l.id ? "…" : l.oemVerified ? "Unverify" : "✓ Mark Verified — Send to Showroom"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── FEEDBACK ── */}
        {tab === "feedback" && (
          <>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Quote Rejections</div>
            <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>Customers who declined a quote across your network, with their stated reasons.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:32 }}>
              {!loading && quoteRejections.length === 0 && <div style={{ ...card, color:C.ink3, fontSize:13 }}>No quote rejections recorded.</div>}
              {quoteRejections.map(q => (
                <div key={q.id} style={card}>
                  <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:6 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{q.customerName} — {q.vehicleName}</div>
                    <span style={{ fontSize:10, color:C.ink3 }}>{q.dealerName} · {fmtDT(q.createdAt)}</span>
                  </div>
                  {q.rejectionReasons.length > 0 && (
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                      {q.rejectionReasons.map((r,i) => <span key={i} style={{ background:"#FEF2F2", color:"#B91C1C", fontSize:10, fontWeight:700, borderRadius:7, padding:"3px 9px" }}>{r}</span>)}
                    </div>
                  )}
                  {q.customerFeedback && <div style={{ fontSize:12, color:C.ink2, fontStyle:"italic" }}>"{q.customerFeedback}"</div>}
                </div>
              ))}
            </div>

            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Sales Rep Comments</div>
            <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>Recent notes logged by reps against leads across your network.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {!loading && repComments.length === 0 && <div style={{ ...card, color:C.ink3, fontSize:13 }}>No rep comments logged yet.</div>}
              {repComments.map((c,i) => (
                <div key={i} style={card}>
                  <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:6 }}>
                    <div style={{ fontSize:12, fontWeight:800 }}>{c.leadName} — {c.vehicle}</div>
                    <span style={{ fontSize:10, color:C.ink3 }}>{c.dealership} · {fmtDT(c.at)}</span>
                  </div>
                  <div style={{ fontSize:12, color:C.ink2 }}>{c.text}</div>
                  <div style={{ fontSize:10, color:C.ink3, marginTop:4 }}>via {c.channel} · {c.author}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STOCK REQUESTS ── */}
        {tab === "stock" && (
          <>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Restock Requests</div>
            <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>Dealers request vehicle stock directly from your inventory pipeline.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {!loading && stockRequests.length === 0 && <div style={{ ...card, color:C.ink3, fontSize:13 }}>No stock requests yet.</div>}
              {stockRequests.map(r => (
                <div key={r.id} style={card}>
                  <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800 }}>{r.vehicleModel} {r.variant} × {r.quantity}</div>
                      <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{r.dealerName} ({r.dealership}) · {fmtDT(r.createdAt)}</div>
                    </div>
                    <span style={{ background:`${STOCK_COLORS[r.status]}15`, color:STOCK_COLORS[r.status], fontSize:10, fontWeight:800, borderRadius:8, padding:"4px 12px", height:"fit-content" }}>{r.status}</span>
                  </div>
                  {r.note && <div style={{ fontSize:12, color:C.ink2, marginBottom:10 }}>📝 {r.note}</div>}
                  {r.status === "PENDING" && (
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>updateStockRequest(r.id,"APPROVED")} disabled={acting===r.id} style={{ background:"#3B82F6", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Approve</button>
                      <button onClick={()=>updateStockRequest(r.id,"REJECTED")} disabled={acting===r.id} style={{ background:"none", border:`1px solid ${C.red}40`, color:C.red, borderRadius:8, padding:"8px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Reject</button>
                    </div>
                  )}
                  {r.status === "APPROVED" && (
                    <button onClick={()=>updateStockRequest(r.id,"FULFILLED")} disabled={acting===r.id} style={{ background:"#059669", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Mark Fulfilled</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── REPORTS ── */}
        {tab === "reports" && (
          <>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Dealer Performance</div>
            <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>Conversion rate and subscription revenue across accessible dealers.</div>
            <div style={{ ...card, padding:0, marginBottom:32, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8FAFB", borderBottom:`1px solid ${C.border}` }}>
                    {["Dealer","Leads","Closed","Conv %","Bookings","Subscription"].map(h=>(
                      <th key={h} style={{ padding:"12px 18px", textAlign:"left", fontSize:10, fontWeight:800, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dealers.filter(d=>d.access).length === 0 && (
                    <tr><td colSpan={6} style={{ padding:30, textAlign:"center", color:C.ink3, fontSize:13 }}>No accessible dealer data yet.</td></tr>
                  )}
                  {dealers.filter(d=>d.access).map(d => (
                    <tr key={d.dealership} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 18px", fontSize:12, fontWeight:700 }}>{d.businessName}</td>
                      <td style={{ padding:"12px 18px", fontSize:12 }}>{d.leads}</td>
                      <td style={{ padding:"12px 18px", fontSize:12 }}>{d.closed}</td>
                      <td style={{ padding:"12px 18px", fontSize:12, fontWeight:700, color:d.conversionRate>=20?"#059669":C.ink2 }}>{d.conversionRate}%</td>
                      <td style={{ padding:"12px 18px", fontSize:12 }}>{d.bookings}</td>
                      <td style={{ padding:"12px 18px", fontSize:12 }}>{d.subscriptionCost ? `₹${d.subscriptionCost.toLocaleString("en-IN")}/mo` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Vehicle Demand by Location</div>
            <div style={{ fontSize:12, color:C.ink3, marginBottom:14 }}>Booking volume per model, by state, across your accessible network.</div>
            <div style={{ ...card, padding:0, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8FAFB", borderBottom:`1px solid ${C.border}` }}>
                    {["State","Model","Bookings"].map(h=>(
                      <th key={h} style={{ padding:"12px 18px", textAlign:"left", fontSize:10, fontWeight:800, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {locationTrends.length === 0 && (
                    <tr><td colSpan={3} style={{ padding:30, textAlign:"center", color:C.ink3, fontSize:13 }}>No booking trend data yet.</td></tr>
                  )}
                  {locationTrends.map((t,i) => (
                    <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 18px", fontSize:12, fontWeight:700 }}>{t.state}</td>
                      <td style={{ padding:"12px 18px", fontSize:12 }}>{t.model}</td>
                      <td style={{ padding:"12px 18px", fontSize:12, fontWeight:700 }}>{t.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
