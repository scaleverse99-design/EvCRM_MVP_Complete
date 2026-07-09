"use client"
import dynamic from "next/dynamic"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Shell from "../../components/layout/Shell"
import { Card, Tag, Avatar, ProgressBar, LiveBadge, SectionHeading, Btn, Modal, Input } from "../../components/ui"
import { C, fmt, STATUS_CONFIG, LOST_REASONS } from "../../lib/constants"
import { useAuth } from "../../lib/AuthContext"
import { authFetch } from "../../lib/token-storage"
import ImportModal from "../../components/ui/ImportModal"
import TrialBanner from "../../components/TrialBanner"

/* ── WhatsApp templates ─── */
const WA_REPLY_MAP = {
  tco:        (l) => `Hi ${l.name}, I'm from ${l.dealerName || 'EvCRM Dealer'}. I saw you calculated massive savings on our TCO tool for ${l.vehicle || 'EVs'}. Would you like to see our latest showroom offers?`,
  subsidy:    (l) => `Hi ${l.name}, great news! You're eligible for state subsidies on the ${l.vehicle || 'EV'}. Let's discuss how we can maximize your total savings?`,
  promo:      (l) => `Hi ${l.name}, we've received your inquiry for the promo code ${l.promo_code}. When can you visit our showroom to claim it?`,
  test_drive: (l) => `Hi ${l.name}, thanks for booking a test drive for the ${l.vehicle}! 🚗 We're excited to have you visit us. Can we confirm a time that works for you?`,
  default:    (l) => `Hi ${l.name}, thanks for your interest in ${l.vehicle || 'our vehicles'}. How can we help you today?`,
}

const MONTHS    = ["Oct","Nov","Dec","Jan","Feb","Mar"]
const SALES_MOCK = [11,14,18,15,16,22]
const DEALER_ID  = "hyd-d01"

/* ── Tab Nav ─── */
const TABS = [
  { id:"dashboard",  icon:"📊", label:"Dashboard"  },
  { id:"leads",      icon:"👥", label:"Leads"       },
  { id:"inventory",  icon:"🚗", label:"Inventory"   },
  { id:"bookings",   icon:"📅", label:"Bookings"    },
  { id:"customers",  icon:"🧑‍🤝‍🧑", label:"Customers"  },
  { id:"tasks",      icon:"✅", label:"Tasks"       },
  { id:"settings",   icon:"⚙️", label:"Settings"    },
]

/* ─────────────────────────────────────────────
   INVENTORY SECTION
───────────────────────────────────────────── */
const VEHICLE_TYPES  = ["4W","2W","3W"]
const BODY_TYPES     = ["SUV","Hatchback","Sedan","Crossover","Scooter","Motorcycle","Auto"]
const STATUS_OPTIONS = ["IN_STOCK","SOLD","RESERVED","UNAVAILABLE"]
const STATUS_COLORS  = { IN_STOCK:C.green, SOLD:C.red, RESERVED:C.orange, UNAVAILABLE:C.ink3 }

function emptyVehicle(dealership, dealerName) {
  return { brand:"", model:"", variant:"", type:"4W", bodyType:"SUV", year:2024, km:0, color:"", range:0, batteryCapacity:"", topSpeed:0, exShowroom:0, emi:0, status:"IN_STOCK", vin:"", isDemo:false, features:"", state:"Telangana", district:"Hyderabad", tags:"", dealership, dealerName }
}

/* ── Inventory Report Modal — 5.9 ── */
function InventoryReportModal({ inventory, onClose }) {
  const byModel = {}
  inventory.forEach(v => {
    const key = `${v.brand} ${v.model}`
    byModel[key] = byModel[key] || { received:0, sold:0, pipeline:0, closing:0 }
    byModel[key].received++
    if (v.status === "SOLD") byModel[key].sold++
    else if (v.status === "RESERVED") byModel[key].pipeline++
    else if (v.status === "IN_STOCK") byModel[key].closing++
  })
  return (
    <Modal title="📊 Monthly Inventory Report" onClose={onClose} width={520}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead><tr style={{ background:C.bg }}>
          {["Model","Received","Sold","In Pipeline","Closing Stock"].map(h=>(
            <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {Object.entries(byModel).map(([model,stats]) => (
            <tr key={model} style={{ borderTop:`1px solid ${C.border}` }}>
              <td style={{ padding:"8px 10px", fontWeight:700, color:C.ink }}>{model}</td>
              <td style={{ padding:"8px 10px", color:C.ink2 }}>{stats.received}</td>
              <td style={{ padding:"8px 10px", color:C.red }}>{stats.sold}</td>
              <td style={{ padding:"8px 10px", color:C.orange }}>{stats.pipeline}</td>
              <td style={{ padding:"8px 10px", color:C.green, fontWeight:700 }}>{stats.closing}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}

function InventorySection({ dealership, user }) {
  const [inventory, setInventory] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [addModal,  setAddModal]  = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [form,      setForm]      = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const [filterStatus, setFilterStatus] = useState("")
  const [reportOpen, setReportOpen] = useState(false)

  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await authFetch(`/api/dealer/inventory?dealership=${dealership}`)
      const data = await res.json()
      if (data.success) setInventory(data.inventory)
    } finally { setLoading(false) }
  }, [dealership])

  useEffect(() => { loadInventory() }, [loadInventory])

  const openAdd = () => { setForm(emptyVehicle(dealership, user?.name)); setEditItem(null); setAddModal(true) }
  const openEdit = (item) => {
    setForm({ ...item, features: Array.isArray(item.features) ? item.features.join(", ") : item.features, tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags })
    setEditItem(item)
    setAddModal(true)
  }

  const handleSave = async () => {
    if (!form.brand || !form.model) return alert("Brand and model are required")
    setSaving(true)
    try {
      const payload = {
        ...form,
        features: typeof form.features === "string" ? form.features.split(",").map(s=>s.trim()).filter(Boolean) : form.features,
        tags:     typeof form.tags === "string"     ? form.tags.split(",").map(s=>s.trim()).filter(Boolean)     : form.tags,
        exShowroom: Number(form.exShowroom), emi: Number(form.emi), range: Number(form.range),
        topSpeed: Number(form.topSpeed), km: Number(form.km), year: Number(form.year),
      }
      const res = editItem
        ? await authFetch("/api/dealer/inventory", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:editItem.id, ...payload }) })
        : await authFetch("/api/dealer/inventory", { method:"POST",  headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Save failed"); return }
      setAddModal(false); setForm(null); setEditItem(null)
      loadInventory()
    } finally { setSaving(false) }
  }

  const handleToggleStatus = async (item) => {
    const next = item.status === "IN_STOCK" ? "UNAVAILABLE" : "IN_STOCK"
    await authFetch("/api/dealer/inventory", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:item.id, status:next }) })
    loadInventory()
  }

  const handleDelete = async (id) => {
    if (!confirm("Remove this vehicle from inventory?")) return
    setDeleting(id)
    try {
      await authFetch(`/api/dealer/inventory?id=${id}`, { method:"DELETE" })
      loadInventory()
    } finally { setDeleting(null) }
  }

  const displayed = filterStatus ? inventory.filter(v => v.status === filterStatus) : inventory
  const inStock   = inventory.filter(v => v.status === "IN_STOCK").length
  const sold      = inventory.filter(v => v.status === "SOLD").length

  const F = ({ label, field, type="text", opts }) => (
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:C.ink2, marginBottom:5 }}>{label}</div>
      {opts ? (
        <select value={form?.[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
          style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }}>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form?.[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} placeholder={label}
          style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }}
        />
      )}
    </div>
  )

  const modelGroups = {}
  inventory.forEach(v => {
    const key = `${v.brand} ${v.model}`
    modelGroups[key] = modelGroups[key] || 0
    if (v.status === "IN_STOCK") modelGroups[key]++
  })
  const zeroStockModels = Object.entries(modelGroups).filter(([,c])=>c===0).map(([name])=>name)

  return (
    <div>
      {zeroStockModels.length > 0 && (
        <div style={{ background:`${C.orange}12`, border:`1px solid ${C.orange}35`, borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:12, fontWeight:700, color:C.orange }}>
          📦 Zero stock: {zeroStockModels.join(", ")} — consider restocking
        </div>
      )}

      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:12 }}>
          {[["🚗","Total",inventory.length,C.blue],["✅","In Stock",inStock,C.green],["🏷","Sold",sold,C.red]].map(([icon,label,val,color])=>(
            <div key={label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 18px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>{icon}</span>
              <div><div style={{ fontSize:18, fontWeight:900, color }}>{val}</div><div style={{ fontSize:10, color:C.ink3 }}>{label}</div></div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, color:filterStatus?C.ink:C.ink2, borderRadius:20, padding:"8px 14px", fontSize:11, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
          </select>
          <button onClick={()=>setReportOpen(true)}
            style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:20, padding:"8px 16px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            📊 Report
          </button>
          <Link href="/buy-vehicles" target="_blank"
            style={{ background:`${C.blue}15`, border:`1px solid ${C.blue}25`, color:C.blue, borderRadius:20, padding:"8px 16px", fontSize:11, fontWeight:700, textDecoration:"none" }}>
            🌐 View Marketplace
          </Link>
          <button onClick={openAdd}
            style={{ background:C.green, border:"none", color:"#fff", borderRadius:20, padding:"8px 18px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* Inventory table */}
      <Card noPad>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Vehicle","Type","Range","Price","Status","Listed On","Actions"].map(h=>(
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.ink2, textTransform:"uppercase", letterSpacing:"0.5px", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:C.ink3 }}>Loading inventory…</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:"center" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>🚗</div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>No vehicles in inventory</div>
                  <div style={{ fontSize:12, color:C.ink3, marginTop:4 }}>Click "+ Add Vehicle" to list your first EV on the marketplace.</div>
                </td></tr>
              ) : displayed.map((v,i) => (
                <tr key={v.id} style={{ borderTop:`1px solid ${C.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"11px 16px" }}>
                    <div style={{ fontWeight:700, color:C.ink, display:"flex", alignItems:"center", gap:6 }}>
                      {v.brand} {v.model}
                      {v.isDemo && <span style={{ background:`${C.purple}15`, color:C.purple, fontSize:8, fontWeight:700, padding:"1px 6px", borderRadius:6 }}>DEMO</span>}
                    </div>
                    <div style={{ fontSize:10, color:C.ink3 }}>{v.variant} · {v.color || "—"} · {v.year} {v.vin ? `· ${v.vin}` : ""}</div>
                  </td>
                  <td style={{ padding:"11px 16px" }}>
                    <span style={{ background:`${C.blue}15`, color:C.blue, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:8 }}>{v.type}</span>
                    <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>{v.bodyType}</div>
                  </td>
                  <td style={{ padding:"11px 16px", fontWeight:700, color:C.ink }}>⚡ {v.range} km</td>
                  <td style={{ padding:"11px 16px" }}>
                    <div style={{ fontWeight:700, color:C.ink }}>{fmt.currency(v.exShowroom)}</div>
                    <div style={{ fontSize:10, color:C.ink3 }}>{v.emi ? `₹${v.emi?.toLocaleString()}/mo EMI` : "—"}</div>
                  </td>
                  <td style={{ padding:"11px 16px" }}>
                    <button onClick={()=>handleToggleStatus(v)}
                      style={{ background:`${STATUS_COLORS[v.status]||C.ink3}15`, color:STATUS_COLORS[v.status]||C.ink3, border:`1px solid ${STATUS_COLORS[v.status]||C.ink3}30`, borderRadius:20, padding:"4px 12px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      {(v.status||"—").replace("_"," ")}
                    </button>
                  </td>
                  <td style={{ padding:"11px 16px", color:C.ink3 }}>
                    {v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—"}
                  </td>
                  <td style={{ padding:"11px 16px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openEdit(v)}
                        style={{ background:`${C.blue}15`, border:`1px solid ${C.blue}25`, color:C.blue, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        ✏ Edit
                      </button>
                      <Link href={`/vehicles/${v.id}`} target="_blank"
                        style={{ background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, textDecoration:"none" }}>
                        🌐 View
                      </Link>
                      <button onClick={()=>handleDelete(v.id)} disabled={deleting===v.id}
                        style={{ background:`${C.red}15`, border:`1px solid ${C.red}25`, color:C.red, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        {deleting===v.id ? "…" : "✕"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {addModal && form && (
        <Modal title={editItem ? `Edit — ${editItem.brand} ${editItem.model}` : "Add Vehicle to Inventory"} onClose={()=>{ setAddModal(false); setForm(null); setEditItem(null) }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <F label="Brand *"           field="brand" />
            <F label="Model *"           field="model" />
            <F label="Variant"           field="variant" />
            <F label="Colour"            field="color" />
            <F label="Vehicle Type"      field="type"     opts={VEHICLE_TYPES} />
            <F label="Body Type"         field="bodyType" opts={BODY_TYPES} />
            <F label="Year"              field="year"        type="number" />
            <F label="KM Driven (0=new)" field="km"          type="number" />
            {/* ── rebuilt: remainder of the form (was lost) ── */}
            <F label="Range (km)"        field="range"       type="number" />
            <F label="Battery Capacity"  field="batteryCapacity" />
            <F label="Top Speed (km/h)"  field="topSpeed"    type="number" />
            <F label="Ex-Showroom Price" field="exShowroom"  type="number" />
            <F label="EMI / month"       field="emi"         type="number" />
            <F label="Status"            field="status"      opts={STATUS_OPTIONS} />
            <F label="State"             field="state" />
            <F label="District"          field="district" />
            <F label="VIN"               field="vin" />
          </div>
          <div style={{ marginTop:14, display:"grid", gap:14 }}>
            <F label="Features (comma-separated)" field="features" />
            <F label="Tags (comma-separated)"      field="tags" />
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:C.ink2, cursor:"pointer" }}>
              <input type="checkbox" checked={form?.isDemo||false} onChange={e=>setForm(f=>({...f,isDemo:e.target.checked}))} />
              This is a demo/test-drive vehicle (excluded from marketplace stock counts)
            </label>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={()=>{ setAddModal(false); setForm(null); setEditItem(null) }}
              style={{ flex:1, background:"transparent", border:`1.5px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"11px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:2, background: saving ? C.ink3 : C.green, border:"none", color:"#fff", borderRadius:10, padding:"11px", fontSize:13, fontWeight:700, cursor: saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saving ? "Saving…" : editItem ? "Save Changes" : "Add Vehicle"}
            </button>
          </div>
        </Modal>
      )}

      {reportOpen && <InventoryReportModal inventory={inventory} onClose={()=>setReportOpen(false)} />}
    </div>
  )
}

/* ─────────────────────────────────────────────
   LEADS SECTION
   (rebuilt — original body was lost; only the
   props signature `{ leads, loading, onRefresh }`
   was recoverable from context)
───────────────────────────────────────────── */
function getWhatsAppLink(l) {
  const fn = WA_REPLY_MAP[l.source_context] || WA_REPLY_MAP.default
  return `https://wa.me/${(l.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(fn(l))}`
}

function toCSV(rows) {
  const headers = ["Name","Phone","Vehicle","Status","Source","City","Follow-up"]
  const lines = rows.map(l => [l.name,l.phone,l.vehicle,l.status,l.source,l.city||"",l.next_followup||""].map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(","))
  return [headers.join(","), ...lines].join("\n")
}

/* ── Lead Detail Modal — 2.2, 2.9 notes, 3.7 test drive history ── */
function LeadDetailModal({ lead, reps, onClose, onRefresh }) {
  const [noteText, setNoteText] = useState("")
  const [saving, setSaving] = useState(false)
  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW

  const addNote = async (channel="note") => {
    if (!noteText.trim()) return
    setSaving(true)
    try {
      await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:lead.id, addNote:{ text:noteText.trim(), channel } }) })
      setNoteText("")
      onRefresh?.()
    } finally { setSaving(false) }
  }

  const toggleDND = async () => {
    await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:lead.id, dnd: !lead.dnd }) })
    onRefresh?.()
  }

  return (
    <Modal title={lead.name} onClose={onClose} width={560}>
      <div style={{ display:"flex", gap:16, marginBottom:16 }}>
        <Avatar name={lead.name} size={44} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:C.ink3 }}>{lead.phone} {lead.email ? `· ${lead.email}` : ""}</div>
          <div style={{ fontSize:12, color:C.ink3 }}>{lead.vehicle || "No vehicle interest set"} {lead.city ? `· ${lead.city}` : ""}</div>
        </div>
        <span style={{ background:sc.bg, color:sc.color, fontSize:10, fontWeight:700, padding:"4px 12px", borderRadius:8, height:"fit-content" }}>{sc.label}</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16, padding:12, background:C.bg, borderRadius:10 }}>
        <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Source</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{lead.source||"—"}</div></div>
        <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Rep</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{reps.find(r=>r.id===lead.assignedRep)?.name || "Unassigned"}</div></div>
        <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Follow-up</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{lead.next_followup ? new Date(lead.next_followup).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}</div></div>
      </div>

      {lead.lostReason && (
        <div style={{ background:`${C.red}10`, border:`1px solid ${C.red}25`, borderRadius:8, padding:"8px 12px", marginBottom:16, fontSize:11, color:C.red }}>
          Lost reason: <b>{lead.lostReason}</b>
        </div>
      )}

      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:16 }}>
        {!lead.dnd ? (
          <a href={getWhatsAppLink(lead)} target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-block", background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, textDecoration:"none" }}>
            💬 Message on WhatsApp
          </a>
        ) : (
          <span style={{ background:`${C.red}10`, color:C.red, borderRadius:8, padding:"8px 16px", fontSize:11, fontWeight:700 }}>🔕 Do Not Disturb — messaging blocked</span>
        )}
        <button onClick={toggleDND} style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:8, padding:"8px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          {lead.dnd ? "Remove DND" : "🔕 Mark DND"}
        </button>
      </div>

      <SectionHeading>Communication Timeline</SectionHeading>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Log a note, call, or message…"
          onKeyDown={e=>e.key==="Enter" && addNote()}
          style={{ flex:1, background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"8px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }} />
        <button onClick={()=>addNote("call")} disabled={saving} title="Log as call"
          style={{ background:C.blue, border:"none", color:"#fff", borderRadius:10, padding:"8px 12px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          📞
        </button>
        <button onClick={()=>addNote("note")} disabled={saving}
          style={{ background:C.green, border:"none", color:"#fff", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          {saving ? "…" : "Add"}
        </button>
      </div>
      <div style={{ maxHeight:220, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
        {(lead.notes||[]).length === 0 ? (
          <div style={{ fontSize:11, color:C.ink3, textAlign:"center", padding:"12px 0" }}>No activity logged yet</div>
        ) : lead.notes.map(n => (
          <div key={n.id} style={{ padding:"8px 10px", background:C.bg, borderRadius:8 }}>
            <div style={{ fontSize:11, color:C.ink }}>{n.channel==="call" ? "📞 " : ""}{n.text}</div>
            <div style={{ fontSize:9, color:C.ink3, marginTop:3 }}>{n.author} · {new Date(n.created_at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function LeadsSection({ leads, loading, onRefresh, reps=[] }) {
  const [updating, setUpdating] = useState(null)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterRep, setFilterRep] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState(new Set())
  const [detailLead, setDetailLead] = useState(null)
  const [lostPrompt, setLostPrompt] = useState(null) // { lead }

  const setStatus = async (lead, status) => {
    if (status === "LOST") { setLostPrompt({ lead }); return }
    setUpdating(lead.id)
    try {
      await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:lead.id, status }) })
      onRefresh?.()
    } finally { setUpdating(null) }
  }

  const confirmLost = async (reason) => {
    const lead = lostPrompt.lead
    setLostPrompt(null)
    setUpdating(lead.id)
    try {
      await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:lead.id, status:"LOST", lostReason:reason }) })
      onRefresh?.()
    } finally { setUpdating(null) }
  }

  const setRep = async (lead, assignedRep) => {
    setUpdating(lead.id)
    try {
      await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:lead.id, assignedRep }) })
      onRefresh?.()
    } finally { setUpdating(null) }
  }

  const displayed = leads.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false
    if (filterRep && l.assignedRep !== filterRep) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.name?.toLowerCase().includes(q) && !l.phone?.includes(q)) return false
    }
    return true
  })

  const toggleSelect = (id) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  const toggleSelectAll = () => {
    setSelected(prev => prev.size === displayed.length ? new Set() : new Set(displayed.map(l=>l.id)))
  }

  const bulkAssignRep = async (repId) => {
    for (const id of selected) {
      await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, assignedRep:repId }) })
    }
    setSelected(new Set()); onRefresh?.()
  }
  const bulkSetStatus = async (status) => {
    for (const id of selected) {
      await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, status }) })
    }
    setSelected(new Set()); onRefresh?.()
  }
  const bulkExport = () => {
    const rows = leads.filter(l => selected.has(l.id))
    const blob = new Blob([toCSV(rows)], { type:"text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "leads-export.csv"; a.click()
    URL.revokeObjectURL(url)
  }
  // 7.5 Bulk WhatsApp Campaign — skips DND leads automatically (7.7)
  const bulkWhatsApp = () => {
    const rows = leads.filter(l => selected.has(l.id) && !l.dnd)
    const skipped = leads.filter(l => selected.has(l.id) && l.dnd).length
    rows.forEach((l,i) => setTimeout(()=>window.open(getWhatsAppLink(l), "_blank"), i*300))
    if (skipped > 0) alert(`Skipped ${skipped} lead(s) marked Do Not Disturb`)
    setSelected(new Set())
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:10, flexWrap:"wrap" }}>
        <div style={{ fontSize:13, color:C.ink2 }}>{leads.length} leads in your pipeline</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or phone…"
            style={{ background:C.card, border:`1px solid ${C.border}`, color:C.ink, borderRadius:20, padding:"8px 14px", fontSize:11, outline:"none", fontFamily:"inherit", width:180 }} />
          <select value={filterRep} onChange={e=>setFilterRep(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, color:filterRep?C.ink:C.ink2, borderRadius:20, padding:"8px 14px", fontSize:11, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
            <option value="">All Reps</option>
            {reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, color:filterStatus?C.ink:C.ink2, borderRadius:20, padding:"8px 14px", fontSize:11, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
            <option value="">All Status</option>
            {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:`${C.blue}10`, border:`1px solid ${C.blue}25`, borderRadius:10, padding:"8px 14px", marginBottom:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.blue }}>{selected.size} selected</span>
          <select onChange={e=>e.target.value && bulkAssignRep(e.target.value)} defaultValue=""
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"4px 10px", fontSize:10, fontFamily:"inherit", cursor:"pointer" }}>
            <option value="">Assign rep…</option>
            {reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select onChange={e=>e.target.value && bulkSetStatus(e.target.value)} defaultValue=""
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"4px 10px", fontSize:10, fontFamily:"inherit", cursor:"pointer" }}>
            <option value="">Set status…</option>
            {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={bulkWhatsApp} style={{ background:"none", border:`1px solid ${C.green}30`, color:C.green, borderRadius:8, padding:"4px 12px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>💬 WA Campaign</button>
          <button onClick={bulkExport} style={{ background:"none", border:`1px solid ${C.blue}30`, color:C.blue, borderRadius:8, padding:"4px 12px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>⬇ Export CSV</button>
          <button onClick={()=>setSelected(new Set())} style={{ marginLeft:"auto", background:"none", border:"none", color:C.ink3, fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
        </div>
      )}

      <Card noPad>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr style={{ background:C.bg }}>
            <th style={{ padding:"10px 16px", width:30 }}><input type="checkbox" checked={selected.size>0 && selected.size===displayed.length} onChange={toggleSelectAll} /></th>
            {["Customer","Vehicle","Source","Status","Rep","Follow-up","Actions"].map(h=>(
              <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding:40, textAlign:"center", color:C.ink3 }}>Loading leads…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:40, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
                <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>No leads match</div>
              </td></tr>
            ) : displayed.map(l => {
              const sc = STATUS_CONFIG[l.status] || STATUS_CONFIG.NEW
              return (
                <tr key={l.id} style={{ borderTop:`1px solid ${C.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 16px" }} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(l.id)} onChange={()=>toggleSelect(l.id)} />
                  </td>
                  <td style={{ padding:"10px 16px", cursor:"pointer" }} onClick={()=>setDetailLead(l)}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar name={l.name} size={28} />
                      <div><div style={{ fontWeight:700, color:C.ink }}>{l.name}</div><div style={{ fontSize:10, color:C.ink3 }}>{l.phone}</div></div>
                      {(l.notes||[]).length > 0 && <span style={{ fontSize:9, color:C.ink3 }}>📝{l.notes.length}</span>}
                    </div>
                  </td>
                  <td style={{ padding:"10px 16px", color:C.ink2, cursor:"pointer" }} onClick={()=>setDetailLead(l)}>{l.vehicle || "—"}</td>
                  <td style={{ padding:"10px 16px" }}><Tag label={l.source||"direct"} color={C.ink3} /></td>
                  <td style={{ padding:"10px 16px" }}>
                    <select value={l.status} disabled={updating===l.id} onChange={e=>setStatus(l, e.target.value)}
                      style={{ background:sc.bg, color:sc.color, border:`1px solid ${sc.color}30`, borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:700, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                      {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"10px 16px" }}>
                    <select value={l.assignedRep||""} disabled={updating===l.id} onChange={e=>setRep(l, e.target.value)}
                      style={{ background:C.bg, border:`1px solid ${C.border}`, color:l.assignedRep?C.ink:C.ink3, borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                      <option value="">Unassigned</option>
                      {reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"10px 16px", color:C.ink3 }}>
                    {l.next_followup ? new Date(l.next_followup).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}
                  </td>
                  <td style={{ padding:"10px 16px" }}>
                    {l.dnd ? (
                      <span style={{ background:`${C.red}10`, color:C.red, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700 }}>🔕 DND</span>
                    ) : (
                      <a href={getWhatsAppLink(l)} target="_blank" rel="noopener noreferrer"
                        style={{ background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, textDecoration:"none" }}>
                        💬 WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {detailLead && <LeadDetailModal lead={leads.find(l=>l.id===detailLead.id) || detailLead} reps={reps} onClose={()=>setDetailLead(null)} onRefresh={onRefresh} />}

      {lostPrompt && (
        <Modal title="Why was this lead lost?" onClose={()=>setLostPrompt(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {LOST_REASONS.map(reason => (
              <button key={reason} onClick={()=>confirmLost(reason)}
                style={{ textAlign:"left", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:12, fontWeight:600, color:C.ink, cursor:"pointer", fontFamily:"inherit" }}>
                {reason}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   BOOKINGS SECTION
───────────────────────────────────────────── */
const PAYMENT_STATUS_LABELS = {
  AUTHORIZED_HELD:      { label:"Held in PG",       color:C.orange },
  CAPTURED_HELD_IN_PG:  { label:"Captured · Held",  color:C.blue },
  RELEASED_TO_DEALER:   { label:"Released to you",  color:C.green },
  REFUNDED:             { label:"Refunded",          color:C.red },
  FAILED:               { label:"Payment failed",    color:C.red },
  SKIPPED_NO_GATEWAY:   { label:"No gateway (demo)",  color:C.ink3 },
}

const OUTCOME_COLORS = { "Interested":C.green, "Ready to Book":C.green, "Needs Time":C.orange, "Not Interested":C.ink3, "No-Show":C.red }

function BookingsSection({ dealership, reps=[] }) {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [acting,   setActing]   = useState(null)
  const [view,     setView]     = useState("list") // list | calendar

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch(`/api/dealer/bookings?dealership=${dealership}`).then(r=>r.json())
      if (data.success) setBookings(data.bookings || [])
    } finally { setLoading(false) }
  }, [dealership])

  useEffect(() => { load() }, [load])

  const STATUS_COLORS = { PENDING_PAYMENT:C.orange, CONFIRMED:C.green, SALE_CONFIRMED:C.green, CANCELLED:C.red, COMPLETED:C.blue }

  const runAction = async (booking, action, extra={}) => {
    if (action === "cancel" && !confirm("Cancel this booking and refund the customer if payment was captured?")) return
    setActing(booking.id + action)
    try {
      const res  = await authFetch("/api/dealer/bookings", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:booking.id, action, ...extra }) })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Action failed"); return }
      load()
    } finally { setActing(null) }
  }

  // 3.2 Test Drive Calendar — group scheduled/preferred dates
  const byDate = {}
  bookings.filter(b => b.status !== "CANCELLED").forEach(b => {
    const d = b.scheduledTime || b.preferredDate
    if (!d) return
    const key = new Date(d).toDateString()
    byDate[key] = byDate[key] || []
    byDate[key].push(b)
  })
  const sortedDates = Object.keys(byDate).sort((a,b)=>new Date(a)-new Date(b))

  return (
    <div>
      <div style={{ marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:13, color:C.ink2 }}>Test drive bookings received from the marketplace</div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ display:"flex", background:C.bg, borderRadius:8, padding:2 }}>
            <button onClick={()=>setView("list")} style={{ background:view==="list"?C.card:"transparent", border:"none", borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:view==="list"?C.ink:C.ink3 }}>☰ List</button>
            <button onClick={()=>setView("calendar")} style={{ background:view==="calendar"?C.card:"transparent", border:"none", borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:view==="calendar"?C.ink:C.ink3 }}>📅 Calendar</button>
          </div>
          <Link href="/buy-vehicles" target="_blank" style={{ fontSize:12, fontWeight:600, color:C.accent, textDecoration:"none" }}>🌐 View Marketplace →</Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:"center", color:C.ink3 }}>Loading bookings…</div>
      ) : bookings.length === 0 ? (
        <Card style={{ padding:60, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>No bookings yet</div>
          <div style={{ fontSize:12, color:C.ink3, marginTop:6, marginBottom:20 }}>
            When customers book test drives from the marketplace, they appear here automatically.
          </div>
          <Link href="/buy-vehicles" target="_blank" style={{ display:"inline-block", background:C.accent||C.green, color:"#fff", fontWeight:700, fontSize:12, padding:"10px 24px", borderRadius:20, textDecoration:"none" }}>
            Preview Marketplace →
          </Link>
        </Card>
      ) : view === "calendar" ? (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {sortedDates.length === 0 && <Card style={{ padding:40, textAlign:"center", color:C.ink3 }}>No scheduled test drives</Card>}
          {sortedDates.map(dateKey => (
            <Card key={dateKey} noPad>
              <div style={{ padding:"10px 16px", background:C.bg, borderBottom:`1px solid ${C.border}`, fontSize:12, fontWeight:700, color:C.ink }}>
                {new Date(dateKey).toLocaleDateString("en-IN",{weekday:"long", day:"numeric", month:"long"})}
              </div>
              {byDate[dateKey].map(b => (
                <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
                  <Avatar name={b.name} size={28} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{b.name} — {b.vehicleName}</div>
                    <div style={{ fontSize:10, color:C.ink3 }}>{b.scheduledTime ? new Date(b.scheduledTime).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "Time TBD"} {b.assignedRep ? `· ${reps.find(r=>r.id===b.assignedRep)?.name || b.assignedRep}` : ""}</div>
                  </div>
                  {b.outcome && <span style={{ background:`${OUTCOME_COLORS[b.outcome]||C.ink3}15`, color:OUTCOME_COLORS[b.outcome]||C.ink3, fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:8 }}>{b.outcome}</span>}
                </div>
              ))}
            </Card>
          ))}
        </div>
      ) : (
        <Card noPad>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr style={{ background:C.bg }}>
              {["Customer","Vehicle","Schedule","Rep","Outcome","Token","Payment","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {bookings.map(b => {
                const ps = PAYMENT_STATUS_LABELS[b.paymentStatus] || { label:b.paymentStatus||"—", color:C.ink3 }
                const canFinalize = b.paymentStatus === "AUTHORIZED_HELD" && b.status !== "CANCELLED"
                const canCancel   = !["CANCELLED","REFUNDED"].includes(b.status) && b.paymentStatus !== "REFUNDED"
                return (
                  <tr key={b.id} style={{ borderTop:`1px solid ${C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 16px" }}><div style={{ fontWeight:700, color:C.ink }}>{b.name}</div><div style={{ fontSize:10, color:C.ink3 }}>{b.phone}</div></td>
                    <td style={{ padding:"10px 16px", color:C.ink2 }}>{b.vehicleName}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <input type="datetime-local" defaultValue={b.scheduledTime ? new Date(b.scheduledTime).toISOString().slice(0,16) : ""}
                        onBlur={e => e.target.value && runAction(b, "schedule", { scheduledTime: new Date(e.target.value).toISOString() })}
                        style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 6px", fontSize:10, color:C.ink, fontFamily:"inherit", outline:"none" }} />
                    </td>
                    <td style={{ padding:"10px 16px" }}>
                      <select value={b.assignedRep||""} onChange={e=>runAction(b,"schedule",{ assignedRep:e.target.value })}
                        style={{ background:C.bg, border:`1px solid ${C.border}`, color:b.assignedRep?C.ink:C.ink3, borderRadius:6, padding:"4px 8px", fontSize:10, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                        <option value="">Unassigned</option>
                        {reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:"10px 16px" }}>
                      <select value={b.outcome||""} onChange={e=>runAction(b,"outcome",{ outcome:e.target.value })} disabled={!b.outcome && acting===b.id+"outcome"}
                        style={{ background:b.outcome?`${OUTCOME_COLORS[b.outcome]||C.ink3}15`:C.bg, color:b.outcome?(OUTCOME_COLORS[b.outcome]||C.ink3):C.ink3, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 8px", fontSize:10, fontWeight:700, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                        <option value="">— Pending —</option>
                        <option value="Interested">Interested</option>
                        <option value="Needs Time">Needs Time</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Ready to Book">Ready to Book</option>
                      </select>
                    </td>
                    <td style={{ padding:"10px 16px", color:C.green, fontWeight:700 }}>₹{(b.tokenAmount||1000).toLocaleString()}</td>
                    <td style={{ padding:"10px 16px" }}><span style={{ background:`${ps.color}15`, color:ps.color, fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:8 }}>{ps.label}</span></td>
                    <td style={{ padding:"10px 16px" }}>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {canFinalize && (
                          <button onClick={()=>runAction(b,"finalize")} disabled={acting===b.id+"finalize"}
                            style={{ background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            {acting===b.id+"finalize" ? "…" : "✓ Confirm Sale"}
                          </button>
                        )}
                        {!b.noShow && b.status !== "CANCELLED" && (
                          <button onClick={()=>runAction(b,"noshow")} disabled={acting===b.id+"noshow"}
                            style={{ background:`${C.orange}15`, border:`1px solid ${C.orange}25`, color:C.orange, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            {acting===b.id+"noshow" ? "…" : "🚫 No-Show"}
                          </button>
                        )}
                        {canCancel && (
                          <button onClick={()=>runAction(b,"cancel")} disabled={acting===b.id+"cancel"}
                            style={{ background:`${C.red}15`, border:`1px solid ${C.red}25`, color:C.red, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            {acting===b.id+"cancel" ? "…" : "✕ Cancel"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   CUSTOMER SECTION — post-sale customers,
   service reminders, upgrade campaign outreach
───────────────────────────────────────────── */
function getUpgradeLink(c) {
  const msg = `Hi ${c.name}, it's been a while since you got your ${c.vehicle}! We have some great upgrade offers this month — want to hear about them?`
  return `https://wa.me/${(c.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
}

/* ── Customer Detail Modal — 4.2 full profile, 4.7 comm log ── */
function CustomerDetailModal({ customer, onClose, onRefresh }) {
  const [form, setForm] = useState({ vin:customer.vin||"", address:customer.address||"", financeStatus:customer.financeStatus||"none", insuranceExpiry: customer.insuranceExpiry ? customer.insuranceExpiry.slice(0,10) : "" })
  const [saving, setSaving] = useState(false)
  const [commNote, setCommNote] = useState("")

  const save = async () => {
    setSaving(true)
    try {
      await authFetch("/api/dealer/customers", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:customer.id, vin:form.vin, address:form.address, financeStatus:form.financeStatus, insuranceExpiry: form.insuranceExpiry ? new Date(form.insuranceExpiry).toISOString() : null }) })
      onRefresh?.()
    } finally { setSaving(false) }
  }

  const logComm = async (channel) => {
    if (!commNote.trim()) return
    await authFetch("/api/dealer/customers", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:customer.id, addComm:{ channel, note:commNote.trim() } }) })
    setCommNote(""); onRefresh?.()
  }

  return (
    <Modal title={customer.name} onClose={onClose} width={560}>
      <div style={{ display:"flex", gap:16, marginBottom:16 }}>
        <Avatar name={customer.name} size={44} />
        <div>
          <div style={{ fontSize:12, color:C.ink3 }}>{customer.phone} {customer.email ? `· ${customer.email}` : ""}</div>
          <div style={{ fontSize:12, color:C.ink3 }}>{customer.vehicle} · {fmt.currency(customer.purchaseAmount)}</div>
        </div>
      </div>

      <SectionHeading>Vehicle & Finance Details</SectionHeading>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:10, color:C.ink3, marginBottom:4 }}>VIN</div>
          <input value={form.vin} onChange={e=>setForm(f=>({...f,vin:e.target.value}))} placeholder="Vehicle identification number"
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
        </div>
        <div>
          <div style={{ fontSize:10, color:C.ink3, marginBottom:4 }}>Finance Status</div>
          <select value={form.financeStatus} onChange={e=>setForm(f=>({...f,financeStatus:e.target.value}))}
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:11, fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
            <option value="none">Cash purchase</option>
            <option value="applied">Loan applied</option>
            <option value="approved">Loan approved</option>
            <option value="disbursed">Loan disbursed</option>
          </select>
        </div>
        <div style={{ gridColumn:"1 / -1" }}>
          <div style={{ fontSize:10, color:C.ink3, marginBottom:4 }}>Address</div>
          <input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="Delivery / home address"
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
        </div>
        <div>
          <div style={{ fontSize:10, color:C.ink3, marginBottom:4 }}>Insurance Expiry</div>
          <input type="date" value={form.insuranceExpiry} onChange={e=>setForm(f=>({...f,insuranceExpiry:e.target.value}))}
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
        </div>
      </div>
      <button onClick={save} disabled={saving}
        style={{ background:C.green, border:"none", color:"#fff", borderRadius:8, padding:"8px 18px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:20 }}>
        {saving ? "Saving…" : "Save Details"}
      </button>

      <SectionHeading>Communication Log</SectionHeading>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input value={commNote} onChange={e=>setCommNote(e.target.value)} placeholder="Log a call/WhatsApp/SMS…"
          onKeyDown={e=>e.key==="Enter" && logComm("call")}
          style={{ flex:1, background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:10, padding:"8px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }} />
        <button onClick={()=>logComm("call")} style={{ background:C.blue, border:"none", color:"#fff", borderRadius:10, padding:"8px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>📞 Log</button>
      </div>
      <div style={{ maxHeight:160, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
        {(customer.commLog||[]).length === 0 ? (
          <div style={{ fontSize:11, color:C.ink3, textAlign:"center", padding:"10px 0" }}>No communications logged yet</div>
        ) : customer.commLog.map(c => (
          <div key={c.id} style={{ padding:"6px 10px", background:C.bg, borderRadius:8, fontSize:11 }}>
            <span style={{ fontWeight:700 }}>{c.channel === "whatsapp" ? "💬" : "📞"} {c.note}</span>
            <div style={{ fontSize:9, color:C.ink3, marginTop:2 }}>{new Date(c.created_at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function CustomerSection({ dealership }) {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [acting,    setActing]    = useState(null)
  const [search,    setSearch]    = useState("")
  const [selected,  setSelected]  = useState(new Set())
  const [detailCust,setDetailCust]= useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch(`/api/dealer/customers?dealership=${dealership}`).then(r=>r.json())
      if (data.success) setCustomers(data.customers || [])
    } finally { setLoading(false) }
  }, [dealership])

  useEffect(() => { load() }, [load])

  const completeReminder = async (customerId, reminderId) => {
    setActing(reminderId)
    try {
      await authFetch("/api/dealer/customers", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:customerId, completeReminderId:reminderId }) })
      load()
    } finally { setActing(null) }
  }

  const displayed = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.vehicle?.toLowerCase().includes(q) || c.vin?.toLowerCase().includes(q)
  })

  const toggleSelect = (id) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  // 4.8 Upgrade Campaigns — bulk WhatsApp (opens each link; browser may prompt to allow popups for 3+)
  const bulkUpgradeCampaign = () => {
    const targets = customers.filter(c => selected.has(c.id))
    targets.forEach((c,i) => setTimeout(()=>window.open(getUpgradeLink(c), "_blank"), i*300))
    setSelected(new Set())
  }

  const now = new Date()
  const insuranceSoon = customers.filter(c => c.insuranceExpiry && (new Date(c.insuranceExpiry)-now)/(1000*60*60*24) <= 30 && (new Date(c.insuranceExpiry)-now) > 0)

  return (
    <div>
      {insuranceSoon.length > 0 && (
        <div style={{ background:`${C.orange}12`, border:`1px solid ${C.orange}35`, borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:12, fontWeight:700, color:C.orange }}>
          🛡 {insuranceSoon.length} customer{insuranceSoon.length===1?"":"s"} with insurance expiring within 30 days — {insuranceSoon.map(c=>c.name).join(", ")}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:10 }}>
        <div style={{ fontSize:13, color:C.ink2 }}>{customers.length} customers who completed a purchase</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, vehicle, VIN…"
          style={{ background:C.card, border:`1px solid ${C.border}`, color:C.ink, borderRadius:20, padding:"8px 14px", fontSize:11, outline:"none", fontFamily:"inherit", width:220 }} />
      </div>

      {selected.size > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:`${C.purple}10`, border:`1px solid ${C.purple}25`, borderRadius:10, padding:"8px 14px", marginBottom:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.purple }}>{selected.size} selected</span>
          <button onClick={bulkUpgradeCampaign} style={{ background:C.purple, border:"none", color:"#fff", borderRadius:8, padding:"5px 14px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>💬 Send Upgrade Campaign</button>
          <button onClick={()=>setSelected(new Set())} style={{ marginLeft:"auto", background:"none", border:"none", color:C.ink3, fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
        </div>
      )}

      {loading ? (
        <div style={{ padding:60, textAlign:"center", color:C.ink3 }}>Loading customers…</div>
      ) : customers.length === 0 ? (
        <Card style={{ padding:60, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🧑‍🤝‍🧑</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>No customers yet</div>
          <div style={{ fontSize:12, color:C.ink3, marginTop:6 }}>
            When you confirm a sale on the Bookings tab, the buyer automatically becomes a customer here — with a first service reminder scheduled.
          </div>
        </Card>
      ) : (
        <Card noPad>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr style={{ background:C.bg }}>
              <th style={{ padding:"10px 16px", width:30 }}><input type="checkbox" checked={selected.size>0 && selected.size===displayed.length} onChange={()=>setSelected(selected.size===displayed.length ? new Set() : new Set(displayed.map(c=>c.id)))} /></th>
              {["Customer","Vehicle","Purchased","Amount","Service Reminders","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {displayed.map(c => (
                <tr key={c.id} style={{ borderTop:`1px solid ${C.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 16px" }} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} onChange={()=>toggleSelect(c.id)} /></td>
                  <td style={{ padding:"10px 16px", cursor:"pointer" }} onClick={()=>setDetailCust(c)}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar name={c.name} size={28} />
                      <div><div style={{ fontWeight:700, color:C.ink }}>{c.name}</div><div style={{ fontSize:10, color:C.ink3 }}>{c.phone}</div></div>
                    </div>
                  </td>
                  <td style={{ padding:"10px 16px", color:C.ink2, cursor:"pointer" }} onClick={()=>setDetailCust(c)}>{c.vehicle}</td>
                  <td style={{ padding:"10px 16px", color:C.ink3 }}>{new Date(c.purchaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</td>
                  <td style={{ padding:"10px 16px", fontWeight:700, color:C.green }}>{fmt.currency(c.purchaseAmount)}</td>
                  <td style={{ padding:"10px 16px" }}>
                    {(c.serviceReminders||[]).length === 0 ? <span style={{ color:C.ink3 }}>—</span> : (
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {c.serviceReminders.map(r => {
                          const overdue = !r.done && new Date(r.dueDate) < new Date()
                          return (
                            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:10, color: r.done ? C.ink3 : overdue ? C.red : C.ink2, textDecoration: r.done ? "line-through" : "none" }}>
                                {r.type} · {new Date(r.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}{overdue && !r.done ? " (overdue)" : ""}
                              </span>
                              {!r.done && (
                                <button onClick={()=>completeReminder(c.id, r.id)} disabled={acting===r.id}
                                  style={{ background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:6, padding:"1px 6px", fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                                  {acting===r.id ? "…" : "✓ Done"}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:"10px 16px" }}>
                    <a href={getUpgradeLink(c)} target="_blank" rel="noopener noreferrer"
                      style={{ background:`${C.purple}15`, border:`1px solid ${C.purple}25`, color:C.purple, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, textDecoration:"none" }}>
                      💬 Upgrade
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {detailCust && <CustomerDetailModal customer={customers.find(c=>c.id===detailCust.id) || detailCust} onClose={()=>setDetailCust(null)} onRefresh={load} />}
    </div>
  )
}

/* ─────────────────────────────────────────────
   TASK SECTION — daily workflow, auto-generated
   follow-up/service tasks, overdue alerts
───────────────────────────────────────────── */
function TaskSection({ dealership, reps=[] }) {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(null)
  const [newTitle, setNewTitle] = useState("")
  const [newDue,   setNewDue]   = useState("")
  const [newRep,   setNewRep]   = useState("")
  const [showFilter, setShowFilter] = useState("open") // open | done | all
  const [filterRep, setFilterRep] = useState("") // 9.2 My Tasks — filter by rep
  const [completingTask, setCompletingTask] = useState(null) // 9.4 outcome note prompt
  const [outcomeNote, setOutcomeNote] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch(`/api/dealer/tasks?dealership=${dealership}`).then(r=>r.json())
      if (data.success) setTasks(data.tasks || [])
    } finally { setLoading(false) }
  }, [dealership])

  useEffect(() => { load() }, [load])

  const confirmDone = async () => {
    const t = completingTask
    setActing(t.id)
    setCompletingTask(null)
    try {
      await authFetch("/api/dealer/tasks", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:t.id, status:"DONE", outcomeNote: outcomeNote.trim() || null }) })
      setOutcomeNote(""); load()
    } finally { setActing(null) }
  }

  const addTask = async () => {
    if (!newTitle.trim()) return
    setActing("new")
    try {
      await authFetch("/api/dealer/tasks", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dealership, title:newTitle, type:"manual", dueDate: newDue || null, assignedRep: newRep || null }) })
      setNewTitle(""); setNewDue(""); setNewRep(""); load()
    } finally { setActing(null) }
  }

  const displayed = tasks
    .filter(t => showFilter==="all" ? true : showFilter==="done" ? t.status==="DONE" : t.status!=="DONE")
    .filter(t => !filterRep || t.assignedRep === filterRep)
  const overdueCount = tasks.filter(t => t.status!=="DONE" && t.dueDate && new Date(t.dueDate) < new Date()).length

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:13, color:C.ink2 }}>
          {tasks.filter(t=>t.status!=="DONE").length} open tasks
          {overdueCount > 0 && <span style={{ color:C.red, fontWeight:700 }}> · {overdueCount} overdue</span>}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <select value={filterRep} onChange={e=>setFilterRep(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, color:filterRep?C.ink:C.ink2, borderRadius:20, padding:"8px 14px", fontSize:11, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
            <option value="">All Reps (Owner view)</option>
            {reps.map(r=><option key={r.id} value={r.id}>{r.name}'s Tasks</option>)}
          </select>
          <select value={showFilter} onChange={e=>setShowFilter(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:20, padding:"8px 14px", fontSize:11, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
            <option value="open">Open</option>
            <option value="done">Done</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex", gap:10 }}>
          <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Add a task…"
            style={{ flex:1, background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }} />
          <select value={newRep} onChange={e=>setNewRep(e.target.value)}
            style={{ background:C.bg, border:`1.5px solid ${C.border}`, color:newRep?C.ink:C.ink3, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
            <option value="">Unassigned</option>
            {reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)}
            style={{ background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }} />
          <button onClick={addTask} disabled={acting==="new"}
            style={{ background:C.green, border:"none", color:"#fff", borderRadius:10, padding:"9px 18px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {acting==="new" ? "…" : "+ Add"}
          </button>
        </div>
      </Card>

      {loading ? (
        <div style={{ padding:60, textAlign:"center", color:C.ink3 }}>Loading tasks…</div>
      ) : displayed.length === 0 ? (
        <Card style={{ padding:60, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>Nothing here</div>
          <div style={{ fontSize:12, color:C.ink3, marginTop:6 }}>Follow-up and service tasks are created automatically from leads and customer sales.</div>
        </Card>
      ) : (
        <Card noPad>
          <div>
            {displayed.map(t => {
              const overdue = t.status!=="DONE" && t.dueDate && new Date(t.dueDate) < new Date()
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderTop:`1px solid ${C.border}` }}>
                  <div style={{ width:22, height:22, borderRadius:6, border:`1.5px solid ${t.status==="DONE"?C.green:C.border}`, background:t.status==="DONE"?C.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor: t.status==="DONE" ? "default" : "pointer" }}
                    onClick={()=> t.status!=="DONE" && setCompletingTask(t)}>
                    {t.status==="DONE" && <span style={{ color:"#fff", fontSize:12 }}>✓</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:t.status==="DONE"?C.ink3:C.ink, textDecoration:t.status==="DONE"?"line-through":"none" }}>{t.title}</div>
                    <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>
                      {t.type==="follow_up" ? "Lead follow-up" : t.type==="service" ? "Service reminder" : "Manual task"}
                      {t.autoGenerated && " · auto"}
                      {t.assignedRep && ` · ${reps.find(r=>r.id===t.assignedRep)?.name || "rep"}`}
                      {t.outcomeNote && ` · "${t.outcomeNote}"`}
                    </div>
                  </div>
                  {t.dueDate && (
                    <span style={{ fontSize:10, fontWeight:700, color: overdue ? C.red : C.ink3 }}>
                      {overdue ? "Overdue · " : ""}{new Date(t.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {completingTask && (
        <Modal title="Mark task complete" onClose={()=>setCompletingTask(null)}>
          <div style={{ fontSize:12, color:C.ink2, marginBottom:12 }}>{completingTask.title}</div>
          <Input label="Outcome note (optional)" value={outcomeNote} onChange={e=>setOutcomeNote(e.target.value)} />
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            <button onClick={()=>setCompletingTask(null)} style={{ flex:1, background:"transparent", border:`1.5px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"11px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={confirmDone} style={{ flex:2, background:C.green, border:"none", color:"#fff", borderRadius:10, padding:"11px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>✓ Mark Done</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SETTINGS SECTION — Module 10
   10.1 Dealer Profile, 10.2 Team Management,
   10.3 Working Hours, 10.4 Notification Prefs,
   10.5 Routing Rules, 10.6 Pipeline Stages,
   10.7 WhatsApp Templates, 10.8 OEM Integrations,
   10.9 Billing & Subscription
───────────────────────────────────────────── */
function SettingRow({ label, sub, children }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function SettingsSection({ dealership, dealer, reps, onRepsRefresh }) {
  const [settings, setSettings] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [newRep,   setNewRep]   = useState({ name:"", phone:"", email:"" })
  const [addingRep, setAddingRep] = useState(false)
  const [newStage, setNewStage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch(`/api/dealer/settings?dealership=${dealership}`).then(r=>r.json())
      if (data.success) setSettings(data.settings)
    } finally { setLoading(false) }
  }, [dealership])

  useEffect(() => { load() }, [load])

  const save = async (partial) => {
    setSaving(true)
    try {
      const res = await authFetch("/api/dealer/settings", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dealership, ...partial }) })
      const data = await res.json()
      if (data.success) setSettings(s => ({ ...s, ...partial }))
    } finally { setSaving(false) }
  }

  const addRep = async () => {
    if (!newRep.name.trim()) return
    setAddingRep(true)
    try {
      await authFetch("/api/dealer/reps", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dealership, ...newRep }) })
      setNewRep({ name:"", phone:"", email:"" })
      onRepsRefresh?.()
    } finally { setAddingRep(false) }
  }

  const toggleRepActive = async (rep) => {
    await authFetch("/api/dealer/reps", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:rep.id, active: rep.active===false ? true : false }) })
    onRepsRefresh?.()
  }

  const addPipelineStage = () => {
    if (!newStage.trim()) return
    const stages = [...(settings.pipelineStages||[]), newStage.trim().toUpperCase()]
    setNewStage("")
    save({ pipelineStages: stages })
  }
  const removeStage = (stage) => {
    save({ pipelineStages: (settings.pipelineStages||[]).filter(s=>s!==stage) })
  }

  if (loading || !settings) return <div style={{ padding:60, textAlign:"center", color:C.ink3 }}>Loading settings…</div>

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      {/* 10.1 Dealer Profile */}
      <Card>
        <SectionHeading>🏪 Dealer Profile</SectionHeading>
        <Input label="Showroom Name" value={settings.name||""} onChange={e=>setSettings(s=>({...s,name:e.target.value}))} />
        <Input label="Address" value={settings.address||""} onChange={e=>setSettings(s=>({...s,address:e.target.value}))} />
        <Input label="GST Number" value={settings.gstNumber||""} onChange={e=>setSettings(s=>({...s,gstNumber:e.target.value}))} />
        <Input label="Contact WhatsApp" value={settings.whatsapp||""} onChange={e=>setSettings(s=>({...s,whatsapp:e.target.value}))} />
        <button onClick={()=>save({ name:settings.name, address:settings.address, gstNumber:settings.gstNumber, whatsapp:settings.whatsapp })} disabled={saving}
          style={{ background:C.green, border:"none", color:"#fff", borderRadius:8, padding:"8px 18px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </Card>

      {/* 10.2 Team Management */}
      <Card>
        <SectionHeading>👥 Team Management</SectionHeading>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14, maxHeight:180, overflowY:"auto" }}>
          {reps.length === 0 ? <div style={{ fontSize:11, color:C.ink3 }}>No reps added yet</div> : reps.map(r => (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:8, opacity:r.active===false?0.5:1 }}>
              <Avatar name={r.name} size={26} color={r.color} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{r.name} {r.active===false && "(inactive)"}</div>
                <div style={{ fontSize:9, color:C.ink3 }}>{r.phone||"no phone"} · {r.rate||0}% conversion</div>
              </div>
              <button onClick={()=>toggleRepActive(r)} style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:6, padding:"3px 8px", fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {r.active===false ? "Reactivate" : "Deactivate"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <input value={newRep.name} onChange={e=>setNewRep(r=>({...r,name:e.target.value}))} placeholder="Rep name"
            style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
          <input value={newRep.phone} onChange={e=>setNewRep(r=>({...r,phone:e.target.value}))} placeholder="Phone"
            style={{ width:100, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
          <button onClick={addRep} disabled={addingRep} style={{ background:C.green, border:"none", color:"#fff", borderRadius:8, padding:"7px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {addingRep ? "…" : "+ Add"}
          </button>
        </div>
      </Card>

      {/* 10.3 Working Hours */}
      <Card>
        <SectionHeading>🕐 Working Hours</SectionHeading>
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
          <input type="time" value={settings.workingHours?.start||"09:00"} onChange={e=>setSettings(s=>({...s,workingHours:{...s.workingHours,start:e.target.value}}))}
            style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:12, fontFamily:"inherit", outline:"none" }} />
          <span style={{ fontSize:11, color:C.ink3 }}>to</span>
          <input type="time" value={settings.workingHours?.end||"19:00"} onChange={e=>setSettings(s=>({...s,workingHours:{...s.workingHours,end:e.target.value}}))}
            style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:12, fontFamily:"inherit", outline:"none" }} />
        </div>
        <div style={{ fontSize:10, color:C.ink3, marginBottom:12 }}>Leads received outside these hours are queued and assigned the next morning.</div>
        <button onClick={()=>save({ workingHours: settings.workingHours })} disabled={saving}
          style={{ background:C.green, border:"none", color:"#fff", borderRadius:8, padding:"8px 18px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Save Hours
        </button>
      </Card>

      {/* 10.4 Notification Preferences */}
      <Card>
        <SectionHeading>🔔 Notification Preferences</SectionHeading>
        {[["newLead","New lead created"],["testDriveBooked","Test drive booked"],["dealClosed","Deal closed"],["overdueFollowup","Overdue follow-up"]].map(([key,label])=>(
          <SettingRow key={key} label={label}>
            <input type="checkbox" checked={settings.notificationPrefs?.[key] ?? true}
              onChange={e=>save({ notificationPrefs: { ...settings.notificationPrefs, [key]: e.target.checked } })} />
          </SettingRow>
        ))}
      </Card>

      {/* 10.5 Lead Routing Rules */}
      <Card>
        <SectionHeading>🔀 Lead Routing Rules</SectionHeading>
        <select value={settings.routingRule} onChange={e=>save({ routingRule: e.target.value })}
          style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:12, fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
          <option value="manual">Manual — dealer assigns each lead</option>
          <option value="round_robin">Round Robin — rotate evenly across reps</option>
          <option value="lowest_workload">Lowest Workload — assign to least-busy rep</option>
          <option value="specialisation">Specialisation — match rep to vehicle type</option>
        </select>
      </Card>

      {/* 10.6 Pipeline Stage Customisation */}
      <Card>
        <SectionHeading>🧭 Pipeline Stages</SectionHeading>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
          {(settings.pipelineStages||[]).map(stage => (
            <span key={stage} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:700, color:C.ink, display:"flex", alignItems:"center", gap:6 }}>
              {stage} <span onClick={()=>removeStage(stage)} style={{ cursor:"pointer", color:C.red }}>✕</span>
            </span>
          ))}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <input value={newStage} onChange={e=>setNewStage(e.target.value)} placeholder="New stage name…"
            style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
          <button onClick={addPipelineStage} style={{ background:C.green, border:"none", color:"#fff", borderRadius:8, padding:"7px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ Add</button>
        </div>
      </Card>

      {/* 10.7 WhatsApp Template Management */}
      <Card>
        <SectionHeading>💬 WhatsApp Templates</SectionHeading>
        <div style={{ fontSize:10, color:C.ink3, marginBottom:10 }}>Built-in templates used across Leads/Bookings (edit coming in a future release):</div>
        {Object.keys(WA_REPLY_MAP).map(key => (
          <div key={key} style={{ padding:"6px 0", borderBottom:`1px solid ${C.border}`, fontSize:11, color:C.ink2, textTransform:"capitalize" }}>{key.replace("_"," ")}</div>
        ))}
      </Card>

      {/* 10.8 OEM Integration Settings — reserved for OEM phase */}
      <Card>
        <SectionHeading>🏭 OEM Integrations</SectionHeading>
        <div style={{ fontSize:10, color:C.ink3, marginBottom:10 }}>Connect OEM partner lead feeds directly to your pipeline.</div>
        {["Tata Motors","Ather Energy","Mahindra"].map(oem => (
          <SettingRow key={oem} label={oem} sub="Not connected">
            <span style={{ background:C.bg, color:C.ink3, fontSize:9, fontWeight:700, padding:"3px 10px", borderRadius:8 }}>Coming Soon</span>
          </SettingRow>
        ))}
      </Card>

      {/* 10.9 Billing & Subscription */}
      <Card>
        <SectionHeading>💳 Billing & Subscription</SectionHeading>
        <SettingRow label="Plan" sub="₹3,000/month after free trial"><span style={{ fontWeight:700, fontSize:12, color:C.ink }}>Standard</span></SettingRow>
        <SettingRow label="Billing Status"><span style={{ fontWeight:700, fontSize:12, color:C.green, textTransform:"capitalize" }}>{dealer?.billingStatus || "trial"}</span></SettingRow>
        <SettingRow label="Payment Method"><span style={{ fontSize:11, color:C.ink3 }}>{dealer?.mandateStatus === "authorized" ? "On file" : "Not added"}</span></SettingRow>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN DEALER DASHBOARD
───────────────────────────────────────────── */
function DealerDashboard() {
  const router = useRouter()
  const { user } = useAuth()

  const [activeTab,   setActiveTab]   = useState("dashboard")
  const [importModal, setImportModal] = useState(false)
  const [quickLead,   setQuickLead]   = useState(null)
  const [creating,    setCreating]    = useState(false)

  const [leads,     setLeads]     = useState([])
  const [feed,      setFeed]      = useState([])
  const [reps,      setReps]      = useState([])
  const [bookings,  setBookings]  = useState([])
  const [inventory, setInventory] = useState([])
  const [tasks,     setTasks]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const dealership = user?.dealership || DEALER_ID

  // Auth guard
  useEffect(() => {
    if (!user) return
    if (user.role === "founder" || user.role === "superadmin") router.replace("/admin")
  }, [user, router])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsRes, feedRes, repsRes, bookingsRes, inventoryRes, tasksRes] = await Promise.all([
        authFetch(`/api/dealer/leads?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/feed?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/reps?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/bookings?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/inventory?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/tasks?dealership=${dealership}`).then(r=>r.json()),
      ])
      if (leadsRes.success)     setLeads(leadsRes.leads)
      if (feedRes.success)      setFeed(feedRes.feed)
      if (repsRes.success)      setReps(repsRes.reps)
      if (bookingsRes.success)  setBookings(bookingsRes.bookings)
      if (inventoryRes.success) setInventory(inventoryRes.inventory)
      if (tasksRes.success)     setTasks(tasksRes.tasks)
    } catch (e) {
      setError("Could not connect to CRM. Please refresh.")
    }
    finally  { setLoading(false) }
  }, [dealership])

  useEffect(() => {
    if (!user) return
    loadAll()
    const t = setInterval(loadAll, 30000)
    return () => clearInterval(t)
  }, [user, loadAll])

  const stats = useMemo(() => {
    const today      = new Date().toDateString()
    const todayLeads = leads.filter(l => l.created_at && new Date(l.created_at).toDateString()===today).length
    const soldUnits  = leads.filter(l => l.status==="CLOSED").length
    const revenue    = leads.filter(l => l.status==="CLOSED").reduce((a,l) => a+(parseFloat(l.amount)||0), 0)
    const overdue    = leads.filter(l => l.next_followup && new Date(l.next_followup)<new Date() && l.status!=="CLOSED").length
    const hotLeads   = leads.filter(l => l.status==="HOT").length
    const mktLeads   = leads.filter(l => l.source==="marketplace_booking").length
    const sortedLeads = [...leads].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
    const testDrivesScheduled = bookings.filter(b => !["CANCELLED"].includes(b.status)).length
    const testDrivesDone      = bookings.filter(b => b.outcome).length
    const testDrivesConverted = bookings.filter(b => b.status === "SALE_CONFIRMED").length
    const conversionRate      = testDrivesDone > 0 ? Math.round((testDrivesConverted / testDrivesDone) * 100) : 0
    const funnel = {
      NEW:        leads.filter(l => l.status === "NEW").length,
      CONTACTED:  leads.filter(l => ["WARM","FOLLOW_UP"].includes(l.status)).length,
      TEST_DRIVE: leads.filter(l => l.status === "HOT").length,
      QUOTED:     leads.filter(l => l.status === "QUOTED").length,
      WON:        leads.filter(l => l.status === "CLOSED").length,
      LOST:       leads.filter(l => l.status === "LOST").length,
    }
    const modelGroups = {}
    inventory.forEach(v => {
      const key = `${v.brand} ${v.model}`
      modelGroups[key] = modelGroups[key] || { total: 0, inStock: 0 }
      modelGroups[key].total++
      if (v.status === "IN_STOCK") modelGroups[key].inStock++
    })
    const zeroStockModels = Object.entries(modelGroups).filter(([,g]) => g.inStock === 0).map(([name]) => name)
    return { todayLeads, soldUnits, revenue, overdue, hotLeads, mktLeads, sortedLeads, testDrivesScheduled, conversionRate, funnel, zeroStockModels }
  }, [leads, bookings, inventory])

  const kpis = [
    { label:"Today's Leads",       val:loading?"...":String(stats.todayLeads),        delta:stats.todayLeads>0?`+${stats.todayLeads} today`:"Waiting",     color:C.blue,   icon:"◎" },
    { label:"Test Drives Scheduled", val:loading?"...":String(stats.testDrivesScheduled), delta:"From Bookings tab",                                    color:C.orange, icon:"🚙"},
    { label:"Units Sold",          val:loading?"...":String(stats.soldUnits),         delta:"Target: 28",                                                 color:C.purple, icon:"🚗"},
    { label:"Monthly Revenue",     val:loading?"...":fmt.currency(stats.revenue),     delta:"Live from CRM",                                              color:C.green,  icon:"₹" },
  ]

  const getWhatsAppLink = (l) => {
    const fn = WA_REPLY_MAP[l.source_context] || WA_REPLY_MAP.default
    return `https://wa.me/${(l.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(fn(l))}`
  }

  const handleCreateLead = async (skipDuplicateCheck=false) => {
    if (!quickLead?.name || !quickLead?.phone) return
    setCreating(true)
    try {
      const res  = await authFetch("/api/dealer/leads", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...quickLead, dealership, skipDuplicateCheck}) })
      const data = await res.json()
      if (res.status === 409) {
        // 2.6 Duplicate Detection — same phone already exists
        if (confirm(`${data.duplicate?.name || "A lead"} with this phone number already exists (status: ${data.duplicate?.status}). Add anyway?`)) {
          return handleCreateLead(true)
        }
        return
      }
      if (data.success) {
        await authFetch("/api/dealer/feed", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dealership, type:"LEAD_CREATED", label:"NEW LEAD", msg:`${quickLead.name} added via Dashboard`, sub:quickLead.vehicle||"General Inquiry", icon:"✦", color:C.green, actionLabel:"View" }) })
        setQuickLead(null); loadAll()
      }
    } catch { alert("Failed to create lead.") }
    finally  { setCreating(false) }
  }

  const quickActions = [
    { icon:"✦",  label:"Quick Lead",    desc:"Add walk-in / phone", color:C.green,  onClick:()=>setQuickLead({name:"",phone:"",vehicle:""}) },
    { icon:"📄", label:"Build Quote",   desc:"Price + share 60s",   color:C.blue,   href:"/buildprice" },
    { icon:"🌩", label:"Import Data",   desc:"Upload Excel/CSV",    color:C.purple, onClick:()=>setImportModal(true) },
    { icon:"⚡", label:"Today's Queue", desc:"AI-selected leads",   color:C.orange, href:"/queue" },
    { icon:"💬", label:"Connect",       desc:"WhatsApp + email",    color:C.teal,   href:"/connect" },
    { icon:"🌐", label:"Marketplace",   desc:"View your listings",  color:C.green,  href:"/buy-vehicles" },
  ]

  const maxS   = Math.max(...SALES_MOCK)
  const revPct = stats.revenue>0 ? Math.min(Math.round((stats.revenue/2200000)*100),100) : 0

  if (loading && !leads.length) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <style>{`@keyframes evcrm-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:40, height:40, borderRadius:10, background:C.accent||C.green, animation:"evcrm-spin .8s linear infinite", marginBottom:20 }}/>
        <p style={{ fontSize:13, fontWeight:700, color:C.ink3, letterSpacing:1 }}>LOADING DEALER DASHBOARD...</p>
      </div>
    )
  }

  return (
    <Shell title="Dealer Dashboard">
      <TrialBanner dealer={user} />

      {/* Dealer welcome bar */}
      <div style={{ background:`${C.green}10`, border:`1px solid ${C.green}25`, borderRadius:10, padding:"10px 16px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>🏪</span>
          <span style={{ fontSize:12, fontWeight:600, color:C.green }}>Dealer Portal — <b>{user?.name || "Dealer"}</b> · {user?.dealership || dealership}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:11, color:C.ink3 }}>Live CRM Dashboard</span>
          <Link href="/buy-vehicles" target="_blank" style={{ fontSize:11, fontWeight:700, color:C.accent||C.green, textDecoration:"none", background:`${C.green}10`, border:`1px solid ${C.green}25`, borderRadius:20, padding:"4px 12px" }}>🌐 Marketplace</Link>
        </div>
      </div>

      {error && <div style={{ background:`${C.red}10`, border:`1px solid ${C.red}25`, borderRadius:10, padding:"10px 16px", marginBottom:20, fontSize:12, color:C.red }}>⚠ {error}</div>}

      {/* ── Tab Navigation ─── */}
      <div style={{ display:"flex", gap:4, marginBottom:24, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{ flex:1, background:activeTab===t.id?C.bg:"transparent", border:activeTab===t.id?`1px solid ${C.border}`:"1px solid transparent", color:activeTab===t.id?C.ink:C.ink2, borderRadius:10, padding:"9px 12px", fontSize:12, fontWeight:activeTab===t.id?700:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.15s" }}>
            <span>{t.icon}</span><span>{t.label}</span>
            {t.id==="leads" && stats.hotLeads>0 && <span style={{ background:C.red, color:"#fff", fontSize:9, fontWeight:800, borderRadius:10, padding:"1px 6px", marginLeft:2 }}>{stats.hotLeads}</span>}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ───
          rebuilt: the original rendering of this tab was lost;
          layout follows the same KPI/quick-action/feed patterns
          used elsewhere in this file ── */}
      {activeTab === "dashboard" && (
        <>
          {!loading && stats.overdue > 0 && (
            <div style={{ background:`${C.red}12`, border:`1px solid ${C.red}35`, borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16 }}>⚠</span>
              <span style={{ fontSize:12, fontWeight:700, color:C.red }}>{stats.overdue} lead{stats.overdue===1?"":"s"} overdue for follow-up (48h+ no activity)</span>
              <button onClick={()=>setActiveTab("leads")} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.red}40`, color:C.red, borderRadius:8, padding:"4px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>View Leads →</button>
            </div>
          )}

          {!loading && stats.zeroStockModels.length > 0 && (
            <div style={{ background:`${C.orange}12`, border:`1px solid ${C.orange}35`, borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16 }}>📦</span>
              <span style={{ fontSize:12, fontWeight:700, color:C.orange }}>Zero stock: {stats.zeroStockModels.join(", ")}</span>
              <button onClick={()=>setActiveTab("inventory")} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.orange}40`, color:C.orange, borderRadius:8, padding:"4px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Restock →</button>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginBottom:20 }}>
            {kpis.map(k => (
              <Card key={k.label}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:11, color:C.ink3, marginBottom:6 }}>{k.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:C.ink }}>{k.val}</div>
                    <div style={{ fontSize:10, color:k.color, fontWeight:700, marginTop:4 }}>{k.delta}</div>
                  </div>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${k.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:k.color }}>{k.icon}</div>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }}>
            <Card>
              <SectionHeading>Lead Pipeline</SectionHeading>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[["NEW",C.blue],["CONTACTED",C.teal],["TEST_DRIVE",C.orange],["QUOTED",C.purple],["WON",C.green],["LOST",C.ink3]].map(([stage,color])=>{
                  const count = stats.funnel[stage] || 0
                  const maxCount = Math.max(...Object.values(stats.funnel), 1)
                  return (
                    <div key={stage} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:9, color:C.ink3, width:70, flexShrink:0 }}>{stage.replace("_"," ")}</span>
                      <div style={{ flex:1, background:C.bg, borderRadius:6, height:14, overflow:"hidden" }}>
                        <div style={{ width:`${(count/maxCount)*100}%`, height:"100%", background:color, borderRadius:6, transition:"width 0.3s" }}/>
                      </div>
                      <span style={{ fontSize:10, fontWeight:800, color:C.ink, width:20, textAlign:"right" }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card>
              <SectionHeading>Today's Tasks</SectionHeading>
              {(() => {
                const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
                const dueToday = tasks.filter(t => t.status!=="DONE" && t.dueDate && new Date(t.dueDate) <= todayEnd)
                return dueToday.length === 0 ? (
                  <div style={{ padding:"20px 0", textAlign:"center", color:C.ink3, fontSize:11 }}>Nothing due today 🎉</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {dueToday.slice(0,5).map(t => {
                      const overdue = new Date(t.dueDate) < new Date()
                      return (
                        <div key={t.id} onClick={()=>setActiveTab("tasks")} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:8, background:C.bg, cursor:"pointer" }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", background:overdue?C.red:C.orange, flexShrink:0 }}/>
                          <span style={{ fontSize:11, color:C.ink, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</span>
                        </div>
                      )
                    })}
                    {dueToday.length > 5 && <div style={{ fontSize:10, color:C.ink3, textAlign:"center", marginTop:4 }}>+{dueToday.length-5} more</div>}
                  </div>
                )
              })()}
            </Card>

            <Card>
              <SectionHeading>Test Drive → Sale</SectionHeading>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 0" }}>
                <div style={{ position:"relative", width:100, height:100 }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke={C.border} strokeWidth="10"/>
                    <circle cx="50" cy="50" r="42" fill="none" stroke={C.green} strokeWidth="10"
                      strokeDasharray={`${2*Math.PI*42}`} strokeDashoffset={`${2*Math.PI*42*(1-stats.conversionRate/100)}`}
                      strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition:"stroke-dashoffset 0.4s" }}/>
                  </svg>
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:C.ink }}>{stats.conversionRate}%</div>
                </div>
                <div style={{ fontSize:10, color:C.ink3, marginTop:8 }}>of test drives convert to sale</div>
              </div>
            </Card>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:10, marginBottom:20 }}>
            {quickActions.map(a => {
              const body = (
                <>
                  <div style={{ width:32, height:32, borderRadius:9, background:`${a.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, marginBottom:8 }}>{a.icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{a.label}</div>
                  <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>{a.desc}</div>
                </>
              )
              return a.href ? (
                <Link key={a.label} href={a.href} style={{ textDecoration:"none" }}>
                  <Card>{body}</Card>
                </Link>
              ) : (
                <div key={a.label} onClick={a.onClick}>
                  <Card>{body}</Card>
                </div>
              )
            })}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:16 }}>
            <Card>
              <SectionHeading action={loadAll} actionLabel="Refresh">Live Activity Feed <LiveBadge/></SectionHeading>
              {feed.length === 0 ? (
                <div style={{ padding:"24px 0", textAlign:"center", color:C.ink3, fontSize:12 }}>No activity yet</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {feed.map(f => (
                    <div key={f.id} style={{ display:"flex", gap:10, alignItems:"flex-start", paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:`${f.color||C.green}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{f.icon||"•"}</div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{f.msg}</div>
                        <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>{f.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionHeading>Revenue Progress</SectionHeading>
              <div style={{ fontSize:24, fontWeight:900, color:C.ink, marginBottom:6 }}>{fmt.currency(stats.revenue)}</div>
              <ProgressBar pct={revPct} />
              <div style={{ fontSize:10, color:C.ink3, marginTop:6, marginBottom:20 }}>{revPct}% of ₹22L monthly target</div>

              <SectionHeading>Sales Reps</SectionHeading>
              {reps.length === 0 ? (
                <div style={{ padding:"12px 0", textAlign:"center", color:C.ink3, fontSize:12 }}>No reps added yet</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {reps.map(r => (
                    <div key={r.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar name={r.name} size={26} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{r.name}</div>
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, color:C.green }}>{r.rate || 0}%</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card noPad>
            <div style={{ padding:"14px 18px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>🚗 Inventory Snapshot</span>
              <button onClick={()=>setActiveTab("inventory")} style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>View All →</button>
            </div>
            {inventory.length === 0 ? (
              <div style={{ padding:24, textAlign:"center", color:C.ink3, fontSize:12 }}>No inventory yet</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)" }}>
                {inventory.slice(0,5).map((v,i) => (
                  <div key={v.id} style={{ padding:"12px 14px", borderRight:i<4?`1px solid ${C.border}`:"none" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{v.brand} {v.model}</div>
                    <div style={{ fontSize:9, color:C.ink3, marginBottom:6 }}>{v.variant}</div>
                    <span style={{ background:v.status==="IN_STOCK"?`${C.green}15`:`${C.red}15`, color:v.status==="IN_STOCK"?C.green:C.red, fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:8 }}>
                      {v.status==="IN_STOCK" ? "In Stock" : v.status.replace("_"," ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "leads"     && <LeadsSection leads={leads} loading={loading} onRefresh={loadAll} reps={reps} />}

      {activeTab === "inventory" && <InventorySection dealership={dealership} user={user} />}

      {activeTab === "bookings"  && <BookingsSection dealership={dealership} reps={reps} />}

      {activeTab === "customers" && <CustomerSection dealership={dealership} />}

      {activeTab === "tasks"     && <TaskSection dealership={dealership} reps={reps} />}

      {activeTab === "settings"  && <SettingsSection dealership={dealership} dealer={user} reps={reps} onRepsRefresh={loadAll} />}

      {/* Quick Lead modal */}
      {quickLead && (
        <Modal title="Quick Add Lead" onClose={()=>setQuickLead(null)}>
          <Input label="Customer Name" value={quickLead.name} onChange={e=>setQuickLead(q=>({...q,name:e.target.value}))} />
          <Input label="Phone Number" value={quickLead.phone} onChange={e=>setQuickLead(q=>({...q,phone:e.target.value}))} />
          <Input label="Vehicle (optional)" value={quickLead.vehicle} onChange={e=>setQuickLead(q=>({...q,vehicle:e.target.value}))} />
          <Input label="City (optional)" value={quickLead.city||""} onChange={e=>setQuickLead(q=>({...q,city:e.target.value}))} />
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.4px", color:C.ink3, marginBottom:6 }}>Source</div>
            <select value={quickLead.source||"walk_in"} onChange={e=>setQuickLead(q=>({...q,source:e.target.value}))}
              style={{ width:"100%", background:C.card, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"10px 13px", fontSize:13, fontFamily:"inherit", outline:"none", marginBottom:16 }}>
              <option value="walk_in">Walk-in</option>
              <option value="phone">Phone</option>
              <option value="referral">Referral</option>
              <option value="social">Social Media</option>
              <option value="website">Website</option>
            </select>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            <button onClick={()=>setQuickLead(null)}
              style={{ flex:1, background:"transparent", border:`1.5px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"11px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button onClick={()=>handleCreateLead()} disabled={creating}
              style={{ flex:2, background: creating ? C.ink3 : C.green, border:"none", color:"#fff", borderRadius:10, padding:"11px", fontSize:13, fontWeight:700, cursor: creating?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {creating ? "Adding…" : "Add Lead"}
            </button>
          </div>
        </Modal>
      )}

      {importModal && <ImportModal open={importModal} onClose={()=>setImportModal(false)} dealership={dealership} />}
    </Shell>
  )
}

export default dynamic(() => Promise.resolve(DealerDashboard), { ssr: false })
