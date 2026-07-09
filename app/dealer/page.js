"use client"
import dynamic from "next/dynamic"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Shell from "../../components/layout/Shell"
import { Card, Tag, Avatar, ProgressBar, LiveBadge, SectionHeading, Btn, Modal, Input } from "../../components/ui"
import { C, fmt, STATUS_CONFIG } from "../../lib/constants"
import { useAuth } from "../../lib/AuthContext"
import { authFetch } from "../../lib/token-storage"
import ImportModal from "../../components/ui/ImportModal"

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
  { id:"dashboard", icon:"📊", label:"Dashboard"  },
  { id:"leads",     icon:"👥", label:"Leads"       },
  { id:"inventory", icon:"🚗", label:"Inventory"   },
  { id:"bookings",  icon:"📅", label:"Bookings"    },
]

/* ─────────────────────────────────────────────
   INVENTORY SECTION
───────────────────────────────────────────── */
const VEHICLE_TYPES  = ["4W","2W","3W"]
const BODY_TYPES     = ["SUV","Hatchback","Sedan","Crossover","Scooter","Motorcycle","Auto"]
const STATUS_OPTIONS = ["IN_STOCK","SOLD","RESERVED","UNAVAILABLE"]
const STATUS_COLORS  = { IN_STOCK:C.green, SOLD:C.red, RESERVED:C.orange, UNAVAILABLE:C.ink3 }

function emptyVehicle(dealership, dealerName) {
  return { brand:"", model:"", variant:"", type:"4W", bodyType:"SUV", year:2024, km:0, color:"", range:0, batteryCapacity:"", topSpeed:0, exShowroom:0, emi:0, status:"IN_STOCK", features:"", state:"Telangana", district:"Hyderabad", tags:"", dealership, dealerName }
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
      if (editItem) {
        await authFetch("/api/dealer/inventory", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:editItem.id, ...payload }) })
      } else {
        await authFetch("/api/dealer/inventory", { method:"POST",  headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) })
      }
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

  return (
    <div>
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
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
                    <div style={{ fontWeight:700, color:C.ink }}>{v.brand} {v.model}</div>
                    <div style={{ fontSize:10, color:C.ink3 }}>{v.variant} · {v.color || "—"} · {v.year}</div>
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
          </div>
          <div style={{ marginTop:14, display:"grid", gap:14 }}>
            <F label="Features (comma-separated)" field="features" />
            <F label="Tags (comma-separated)"      field="tags" />
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
    </div>
  )
}

/* ─────────────────────────────────────────────
   LEADS SECTION
   (rebuilt — original body was lost; only the
   props signature `{ leads, loading, onRefresh }`
   was recoverable from context)
───────────────────────────────────────────── */
function LeadsSection({ leads, loading, onRefresh }) {
  const [updating, setUpdating] = useState(null)
  const [filterStatus, setFilterStatus] = useState("")

  const getWhatsAppLink = (l) => {
    const fn = WA_REPLY_MAP[l.source_context] || WA_REPLY_MAP.default
    return `https://wa.me/${(l.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(fn(l))}`
  }

  const setStatus = async (lead, status) => {
    setUpdating(lead.id)
    try {
      await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:lead.id, status }) })
      onRefresh?.()
    } finally { setUpdating(null) }
  }

  const displayed = filterStatus ? leads.filter(l => l.status === filterStatus) : leads

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:13, color:C.ink2 }}>{leads.length} leads in your pipeline</div>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{ background:C.card, border:`1px solid ${C.border}`, color:filterStatus?C.ink:C.ink2, borderRadius:20, padding:"8px 14px", fontSize:11, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">All Status</option>
          {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Card noPad>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr style={{ background:C.bg }}>
            {["Customer","Vehicle","Source","Status","Follow-up","Actions"].map(h=>(
              <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:"center", color:C.ink3 }}>Loading leads…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
                <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>No leads yet</div>
              </td></tr>
            ) : displayed.map(l => {
              const sc = STATUS_CONFIG[l.status] || STATUS_CONFIG.NEW
              return (
                <tr key={l.id} style={{ borderTop:`1px solid ${C.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar name={l.name} size={28} />
                      <div><div style={{ fontWeight:700, color:C.ink }}>{l.name}</div><div style={{ fontSize:10, color:C.ink3 }}>{l.phone}</div></div>
                    </div>
                  </td>
                  <td style={{ padding:"10px 16px", color:C.ink2 }}>{l.vehicle || "—"}</td>
                  <td style={{ padding:"10px 16px" }}><Tag label={l.source||"direct"} color={C.ink3} /></td>
                  <td style={{ padding:"10px 16px" }}>
                    <select value={l.status} disabled={updating===l.id} onChange={e=>setStatus(l, e.target.value)}
                      style={{ background:sc.bg, color:sc.color, border:`1px solid ${sc.color}30`, borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:700, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                      {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"10px 16px", color:C.ink3 }}>
                    {l.next_followup ? new Date(l.next_followup).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}
                  </td>
                  <td style={{ padding:"10px 16px" }}>
                    <a href={getWhatsAppLink(l)} target="_blank" rel="noopener noreferrer"
                      style={{ background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, textDecoration:"none" }}>
                      💬 WhatsApp
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
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

function BookingsSection({ dealership }) {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [acting,   setActing]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch(`/api/dealer/bookings?dealership=${dealership}`).then(r=>r.json())
      if (data.success) setBookings(data.bookings || [])
    } finally { setLoading(false) }
  }, [dealership])

  useEffect(() => { load() }, [load])

  const STATUS_COLORS = { PENDING_PAYMENT:C.orange, CONFIRMED:C.green, SALE_CONFIRMED:C.green, CANCELLED:C.red, COMPLETED:C.blue }

  const runAction = async (booking, action) => {
    if (action === "cancel" && !confirm("Cancel this booking and refund the customer if payment was captured?")) return
    setActing(booking.id + action)
    try {
      const res  = await authFetch("/api/dealer/bookings", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:booking.id, action }) })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Action failed"); return }
      load()
    } finally { setActing(null) }
  }

  return (
    <div>
      <div style={{ marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:13, color:C.ink2 }}>Test drive bookings received from the marketplace</div>
        <Link href="/buy-vehicles" target="_blank" style={{ fontSize:12, fontWeight:600, color:C.accent, textDecoration:"none" }}>🌐 View Marketplace →</Link>
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
      ) : (
        <Card noPad>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr style={{ background:C.bg }}>
              {["Customer","Vehicle","Date","Token","Status","Payment","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {bookings.map(b => {
                const sc = STATUS_COLORS[b.status] || C.ink3
                const ps = PAYMENT_STATUS_LABELS[b.paymentStatus] || { label:b.paymentStatus||"—", color:C.ink3 }
                const canFinalize = b.paymentStatus === "AUTHORIZED_HELD" && b.status !== "CANCELLED"
                const canCancel   = !["CANCELLED","REFUNDED"].includes(b.status) && b.paymentStatus !== "REFUNDED"
                return (
                  <tr key={b.id} style={{ borderTop:`1px solid ${C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 16px" }}><div style={{ fontWeight:700, color:C.ink }}>{b.name}</div><div style={{ fontSize:10, color:C.ink3 }}>{b.phone}</div></td>
                    <td style={{ padding:"10px 16px", color:C.ink2 }}>{b.vehicleName}</td>
                    <td style={{ padding:"10px 16px", color:C.ink3 }}>{b.preferredDate ? new Date(b.preferredDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "TBD"}</td>
                    <td style={{ padding:"10px 16px", color:C.green, fontWeight:700 }}>₹{(b.tokenAmount||1000).toLocaleString()}</td>
                    <td style={{ padding:"10px 16px" }}><span style={{ background:`${sc}15`, color:sc, fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:8 }}>{(b.status||"—").replace("_"," ")}</span></td>
                    <td style={{ padding:"10px 16px" }}><span style={{ background:`${ps.color}15`, color:ps.color, fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:8 }}>{ps.label}</span></td>
                    <td style={{ padding:"10px 16px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        {canFinalize && (
                          <button onClick={()=>runAction(b,"finalize")} disabled={acting===b.id+"finalize"}
                            style={{ background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            {acting===b.id+"finalize" ? "…" : "✓ Confirm Sale & Release"}
                          </button>
                        )}
                        {canCancel && (
                          <button onClick={()=>runAction(b,"cancel")} disabled={acting===b.id+"cancel"}
                            style={{ background:`${C.red}15`, border:`1px solid ${C.red}25`, color:C.red, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            {acting===b.id+"cancel" ? "…" : "✕ Cancel & Refund"}
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
   MAIN DEALER DASHBOARD
───────────────────────────────────────────── */
function DealerDashboard() {
  const router = useRouter()
  const { user } = useAuth()

  const [activeTab,   setActiveTab]   = useState("dashboard")
  const [importModal, setImportModal] = useState(false)
  const [quickLead,   setQuickLead]   = useState(null)
  const [creating,    setCreating]    = useState(false)

  const [leads,   setLeads]   = useState([])
  const [feed,    setFeed]    = useState([])
  const [reps,    setReps]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const dealership = user?.dealership || DEALER_ID

  // Auth guard
  useEffect(() => {
    if (!user) return
    if (user.role === "founder" || user.role === "superadmin") router.replace("/admin")
  }, [user, router])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsRes, feedRes, repsRes] = await Promise.all([
        authFetch(`/api/dealer/leads?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/feed?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/reps?dealership=${dealership}`).then(r=>r.json()),
      ])
      if (leadsRes.success) setLeads(leadsRes.leads)
      if (feedRes.success)  setFeed(feedRes.feed)
      if (repsRes.success)  setReps(repsRes.reps)
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
    return { todayLeads, soldUnits, revenue, overdue, hotLeads, mktLeads, sortedLeads }
  }, [leads])

  const kpis = [
    { label:"Today's Leads",      val:loading?"...":String(stats.todayLeads),    delta:stats.todayLeads>0?`+${stats.todayLeads} today`:"Waiting",     color:C.blue,   icon:"◎" },
    { label:"Monthly Revenue",     val:loading?"...":fmt.currency(stats.revenue), delta:"Live from CRM",                                              color:C.green,  icon:"₹" },
    { label:"Units Sold",          val:loading?"...":String(stats.soldUnits),     delta:"Target: 28",                                                  color:C.purple, icon:"🚗"},
    { label:"Marketplace Leads",   val:loading?"...":String(stats.mktLeads),      delta:stats.mktLeads>0?`${stats.hotLeads} HOT`:"From /buy-vehicles", color:C.orange, icon:"🛒"},
  ]

  const getWhatsAppLink = (l) => {
    const fn = WA_REPLY_MAP[l.source_context] || WA_REPLY_MAP.default
    return `https://wa.me/${(l.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(fn(l))}`
  }

  const handleCreateLead = async () => {
    if (!quickLead?.name || !quickLead?.phone) return
    setCreating(true)
    try {
      const res  = await authFetch("/api/dealer/leads", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...quickLead, dealership}) })
      const data = await res.json()
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
        </>
      )}

      {activeTab === "leads"     && <LeadsSection leads={leads} loading={loading} onRefresh={loadAll} />}

      {activeTab === "inventory" && <InventorySection dealership={dealership} user={user} />}

      {activeTab === "bookings"  && <BookingsSection dealership={dealership} />}

      {/* Quick Lead modal */}
      {quickLead && (
        <Modal title="Quick Add Lead" onClose={()=>setQuickLead(null)}>
          <Input label="Customer Name" value={quickLead.name} onChange={e=>setQuickLead(q=>({...q,name:e.target.value}))} />
          <Input label="Phone Number" value={quickLead.phone} onChange={e=>setQuickLead(q=>({...q,phone:e.target.value}))} />
          <Input label="Vehicle (optional)" value={quickLead.vehicle} onChange={e=>setQuickLead(q=>({...q,vehicle:e.target.value}))} />
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            <button onClick={()=>setQuickLead(null)}
              style={{ flex:1, background:"transparent", border:`1.5px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"11px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button onClick={handleCreateLead} disabled={creating}
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
