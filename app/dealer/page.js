"use client"
import dynamic from "next/dynamic"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Shell from "../../components/layout/Shell"
import { Card, Tag, Avatar, ProgressBar, LiveBadge, SectionHeading, Btn, Modal, Input } from "../../components/ui"
import { C, fmt, STATUS_CONFIG, LOST_REASONS } from "../../lib/constants"
import { useAuth } from "../../lib/AuthContext"
import { authFetch } from "../../lib/token-storage"
import ImportModal from "../../components/ui/ImportModal"
import TrialBanner from "../../components/TrialBanner"
import { lookupEVSpecs } from "../../lib/evCatalog"
import DomainsStorefrontCard from "../../components/dealer/DomainsStorefrontCard"

/* ── WhatsApp templates ─── */
const WA_REPLY_MAP = {
  tco:        (l) => `Hi ${l.name}, I'm from ${l.dealerName || 'EvCRM Dealer'}. I saw you calculated massive savings on our TCO tool for ${l.vehicle || 'EVs'}. Would you like to see our latest showroom offers?`,
  subsidy:    (l) => `Hi ${l.name}, great news! You're eligible for state subsidies on the ${l.vehicle || 'EV'}. Let's discuss how we can maximize your total savings?`,
  promo:      (l) => `Hi ${l.name}, we've received your inquiry for the promo code ${l.promo_code}. When can you visit our showroom to claim it?`,
  test_drive: (l) => `Hi ${l.name}, thanks for booking a test drive for the ${l.vehicle}! 🚗 We're excited to have you visit us. Can we confirm a time that works for you?`,
  default:    (l) => `Hi ${l.name}, thanks for your interest in ${l.vehicle || 'our vehicles'}. How can we help you today?`,
}

// Human-friendly labels for the raw lead `source` values.
const SOURCE_LABELS = {
  marketplace_booking: "Website — Test Drive Booking",
  website:             "Website Enquiry",
  walkin:              "Walk-in",
  instagram:           "Instagram",
  showroom:            "Showroom",
  referral:            "Referral",
}

/* ── Stage-based contact templates ───────────────────────────────────────
   Auto-filled per lead status for WhatsApp / SMS / Email. The rep always
   reviews (and can edit) before sending — these are starting points. */
const CONTACT_TEMPLATES = {
  NEW: {
    whatsapp: (l,d) => `Hi ${l.name}! 👋 I'm from ${d}. Thanks for your interest in the ${l.vehicle || "EV range"}. Would you like to visit our showroom or book a free test drive this week?`,
    sms:      (l,d) => `Hi ${l.name}, thanks for your enquiry about the ${l.vehicle || "EV"} at ${d}. Reply or call us to book a free test drive.`,
    emailSub: (l)   => `Your ${l.vehicle || "EV"} enquiry — let's get you riding`,
    emailBody:(l,d) => `Hi ${l.name},\n\nThank you for your interest in the ${l.vehicle || "our EV range"}!\n\nI'd love to help you with:\n• A free test drive at your convenience\n• Latest on-road price with current offers\n• EMI options starting at low monthly rates\n\nWhen would be a good time for you to visit, or shall I call you?\n\nBest regards,\n${d}`,
  },
  WARM: {
    whatsapp: (l,d) => `Hi ${l.name}! Following up from ${d} on the ${l.vehicle || "EV"} you liked. We have a test drive slot open this week — shall I reserve one for you? 🚗⚡`,
    sms:      (l,d) => `Hi ${l.name}, ${d} here. Test drive slots for the ${l.vehicle || "EV"} are open this week. Reply YES and we'll book one for you.`,
    emailSub: (l)   => `Test drive slot available — ${l.vehicle || "your EV"}`,
    emailBody:(l,d) => `Hi ${l.name},\n\nJust following up on your interest in the ${l.vehicle || "EV"}.\n\nWe have test drive slots available this week and I'd be happy to reserve one for you. It takes just 20 minutes and there's no obligation.\n\nShall I book you in? Just reply with a day that works.\n\nBest regards,\n${d}`,
  },
  HOT: {
    whatsapp: (l,d) => `Hi ${l.name}! Great news from ${d} — I've prepared the best price for your ${l.vehicle || "EV"} including all current offers and subsidies. When can we meet to finalise? I can also share EMI options. 🎉`,
    sms:      (l,d) => `Hi ${l.name}, your special price for the ${l.vehicle || "EV"} is ready at ${d}. Call us today to lock it in before the offer ends.`,
    emailSub: (l)   => `Your final price is ready — ${l.vehicle || "EV"}`,
    emailBody:(l,d) => `Hi ${l.name},\n\nI've put together the best possible deal for your ${l.vehicle || "EV"}:\n\n• Special negotiated price with all applicable discounts\n• Flexible EMI plans to fit your budget\n• Fast-track delivery\n\nThis pricing is valid for a limited time. Can we schedule a quick call or visit today to finalise?\n\nBest regards,\n${d}`,
  },
  COLD: {
    whatsapp: (l,d) => `Hi ${l.name}! It's been a while since we spoke about the ${l.vehicle || "EV"} at ${d}. We have new offers this month that might change the maths for you — want me to share the details? 😊`,
    sms:      (l,d) => `Hi ${l.name}, new offers on the ${l.vehicle || "EV"} at ${d} this month. Reply INFO and we'll send you the details.`,
    emailSub: (l)   => `New offers on the ${l.vehicle || "EV"} you were considering`,
    emailBody:(l,d) => `Hi ${l.name},\n\nIt's been a while since we last spoke about the ${l.vehicle || "EV"}.\n\nA few things have changed that may interest you:\n• New pricing and festive offers this month\n• Improved EMI schemes\n• Rising petrol prices make the EV savings even bigger\n\nWould you like an updated quote? No pressure — happy to help whenever you're ready.\n\nBest regards,\n${d}`,
  },
  CLOSED: {
    whatsapp: (l,d) => `Hi ${l.name}! 🎉 Congratulations again on your ${l.vehicle || "new EV"} from ${d}. How's the ride so far? If you know friends or family considering an EV, we'd love an introduction — referral benefits apply!`,
    sms:      (l,d) => `Hi ${l.name}, hope you're loving your ${l.vehicle || "new EV"}! For service bookings or referrals, just reply to this message. — ${d}`,
    emailSub: (l)   => `How's your ${l.vehicle || "new EV"} treating you?`,
    emailBody:(l,d) => `Hi ${l.name},\n\nCongratulations again on your ${l.vehicle || "new EV"}!\n\nA quick check-in:\n• How has the experience been so far?\n• Your first free service is coming up — we'll remind you\n• Know someone considering an EV? Our referral programme has benefits for you both\n\nThanks for choosing us.\n\nBest regards,\n${d}`,
  },
  LOST: {
    whatsapp: (l,d) => `Hi ${l.name}, ${d} here. We understand the timing wasn't right for the ${l.vehicle || "EV"} earlier. We've got fresh offers and new models in — would you like a quick update? No pressure at all. 🙏`,
    sms:      (l,d) => `Hi ${l.name}, fresh offers and new EV models at ${d}. Reply INFO if you'd like an update — no pressure.`,
    emailSub: ()    => `We'd love a second chance — new EV offers inside`,
    emailBody:(l,d) => `Hi ${l.name},\n\nWe understand the ${l.vehicle || "EV"} didn't work out last time — completely fair.\n\nSince then:\n• New models have arrived in our showroom\n• Prices and EMI schemes have improved\n• Exchange bonuses are at their highest this quarter\n\nIf you're still considering an EV at any point, I'd be glad to help. Just reply to this email.\n\nBest regards,\n${d}`,
  },
}
CONTACT_TEMPLATES.default = CONTACT_TEMPLATES.NEW

const MONTHS    = ["Oct","Nov","Dec","Jan","Feb","Mar"]
const SALES_MOCK = [11,14,18,15,16,22]
const DEALER_ID  = "hyd-d01"

/* ── Tab Nav ─── */
const TABS = [
  { id:"dashboard",  icon:"📊", label:"Dashboard"  },
  { id:"leads",      icon:"👥", label:"Leads"       },
  { id:"procurement", icon:"🔑", label:"Procurement", iceOnly:true },
  { id:"inventory",  icon:"🚗", label:"Inventory"   },
  { id:"bookings",   icon:"📅", label:"Bookings"    },
  { id:"customers",  icon:"🧑‍🤝‍🧑", label:"Customers"  },
  { id:"tasks",      icon:"✅", label:"Tasks"       },
  { id:"service",    icon:"🔧", label:"Service"     },
  { id:"buildprice", icon:"₹",  label:"BuildPrice"  },
  { id:"quotepro",   icon:"📋", label:"QuotePro"    },
  { id:"settings",   icon:"⚙️", label:"Settings"    },
]

const BP_VEHICLES = [
  { id:1, brand:"Tata",  model:"Nexon EV Max",   type:"4W SUV",  range:465, chargeTime:60,  topSpeed:150, exShowroom:1980000 },
  { id:2, brand:"Ather", model:"450X Gen 3",     type:"Scooter", range:150, chargeTime:75,  topSpeed:90,  exShowroom:155000  },
  { id:3, brand:"Ola",   model:"S1 Pro Gen 2",   type:"Scooter", range:195, chargeTime:90,  topSpeed:116, exShowroom:149999  },
  { id:4, brand:"Okaya", model:"Faast F4",       type:"Scooter", range:120, chargeTime:240, topSpeed:75,  exShowroom:105000  },
  { id:5, brand:"TVS",   model:"iQube ST",       type:"Scooter", range:100, chargeTime:350, topSpeed:82,  exShowroom:135000  },
  { id:6, brand:"Bajaj", model:"Chetak Premium", type:"Scooter", range:108, chargeTime:300, topSpeed:63,  exShowroom:135000  },
]

/* ─────────────────────────────────────────────
   INVENTORY SECTION
───────────────────────────────────────────── */
const VEHICLE_TYPES  = ["4W","2W","3W"]
const BODY_TYPES     = ["SUV","Hatchback","Sedan","Crossover","Scooter","Motorcycle","Auto"]
// BOOKED replaces the old RESERVED label; CANCELLED and DEAD_STOCK require a
// reason (tracked network-wide in the OEM Inventory tab). RESERVED/UNAVAILABLE
// stay in the maps so existing rows keep rendering.
const STATUS_OPTIONS = ["IN_STOCK","BOOKED","SOLD","CANCELLED","DEAD_STOCK"]
const STATUS_COLORS  = { IN_STOCK:C.green, BOOKED:C.orange, SOLD:C.red, CANCELLED:"#DC2626", DEAD_STOCK:C.ink3, RESERVED:C.orange, UNAVAILABLE:C.ink3 }
const REASON_STATUSES = ["CANCELLED","DEAD_STOCK"]

const FUEL_TYPES = ["Electric","Petrol","Diesel","CNG","Hybrid"]
const CONDITION_OPTIONS = ["new","used"]

// Fixed inspection checklist for used-vehicle listings — same "hardcoded
// lookup table" pattern as lib/evCatalog.js. A dealer must fill this in and
// then explicitly approve it before the vehicle is visible on the marketplace.
const INSPECTION_CHECKLIST = {
  "Exterior":   ["Body panels & paint", "Dents / scratches", "Windshield & glass"],
  "Interior":   ["Seats & upholstery", "Dashboard & electronics", "Odour / cleanliness"],
  "Engine & Transmission": ["Engine/motor performance", "Gearbox / transmission", "Cooling & fluid leaks"],
  "Electricals": ["Battery & charging", "Lights & indicators", "AC & climate control"],
  "Tyres & Brakes": ["Tyre tread & condition", "Brakes", "Suspension"],
  "Documents":  ["RC availability", "Insurance validity", "Service history"],
}
const RATING_OPTIONS = ["Good","Fair","Poor"]

function emptyInspectionReport() {
  return {
    categories: Object.entries(INSPECTION_CHECKLIST).map(([name, items]) => ({
      name, items: items.map(item => ({ item, rating: "Good", notes: "" }))
    })),
    overallGrade: "B",
    approvalStatus: "PENDING",
  }
}

function emptyVehicle(dealership, dealerName, dealerCategory) {
  return { brand:"", model:"", variant:"", type:"4W", bodyType:"SUV", year:2024, km:0, condition:"new", fuelType: dealerCategory === "ICE" ? "Petrol" : "Electric", color:"", range:0, batteryCapacity:"", topSpeed:0, chargingTime:"", seatingCapacity:"", bootSpace:"", groundClearance:"", warrantyYears:"", certified:false, exShowroom:0, emi:0, status:"IN_STOCK", vin:"", isDemo:false, features:"", state:"Telangana", district:"Hyderabad", tags:"", inspectionReport: null, dealership, dealerName }
}

/* ── Inventory Report Modal — 5.9 ── */
function InventoryReportModal({ inventory, onClose }) {
  const byModel = {}
  inventory.forEach(v => {
    const key = `${v.brand} ${v.model}`
    byModel[key] = byModel[key] || { received:0, sold:0, pipeline:0, closing:0 }
    byModel[key].received++
    if (v.status === "SOLD") byModel[key].sold++
    else if (v.status === "RESERVED" || v.status === "BOOKED") byModel[key].pipeline++
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

function F({ label, field, form, setForm, type="text", opts, onBlur }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:C.ink2, marginBottom:5 }}>{label}</div>
      {opts ? (
        <select value={form?.[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
          style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }}>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form?.[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} onBlur={onBlur} placeholder={label}
          style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }}
        />
      )}
    </div>
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
  const [lowResWarnings, setLowResWarnings] = useState([]) // filenames of uploaded photos that are too small to look sharp

  // Brochure upload → AI extraction → step-through review
  const [brochureParsing, setBrochureParsing] = useState(false)
  const [brochureError,   setBrochureError]   = useState("")
  const [reviewQueue,     setReviewQueue]     = useState(null) // array of extracted vehicles awaiting review, or null when not reviewing
  const [reviewIndex,     setReviewIndex]     = useState(0)
  const [reviewForm,      setReviewForm]      = useState(null)
  const [reviewSaving,    setReviewSaving]    = useState(false)
  const [reviewAdded,     setReviewAdded]     = useState(0)

  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await authFetch(`/api/dealer/inventory?dealership=${dealership}`)
      const data = await res.json()
      if (data.success) setInventory(data.inventory)
    } finally { setLoading(false) }
  }, [dealership])

  useEffect(() => { loadInventory() }, [loadInventory])

  const [autofilled, setAutofilled] = useState(false)

  const openAdd = () => { setForm(emptyVehicle(dealership, user?.name, user?.dealerCategory)); setEditItem(null); setAddModal(true); setAutofilled(false); setLowResWarnings([]) }
  const openEdit = (item) => {
    setForm({ ...item, features: Array.isArray(item.features) ? item.features.join(", ") : item.features, tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags })
    setEditItem(item)
    setAddModal(true)
    setAutofilled(false)
    setLowResWarnings([])
  }

  // Auto-fills specs from the internal EV catalog once brand+model are both
  // entered — only fills fields the dealer hasn't already typed something
  // into, so it never overwrites a manual entry.
  const applyCatalogAutofill = () => {
    setForm(f => {
      if (!f?.brand || !f?.model) return f
      const specs = lookupEVSpecs(f.brand, f.model)
      if (!specs) { setAutofilled(false); return f }
      setAutofilled(true)
      const next = { ...f }
      if (!next.range)            next.range = specs.range
      if (!next.batteryCapacity)  next.batteryCapacity = specs.batteryCapacity
      if (!next.topSpeed)         next.topSpeed = specs.topSpeed
      if (!next.chargingTime)     next.chargingTime = specs.chargingTime
      if (!next.seatingCapacity)  next.seatingCapacity = specs.seatingCapacity
      if (!next.bootSpace)        next.bootSpace = specs.bootSpace
      if (!next.groundClearance)  next.groundClearance = specs.groundClearance
      if (!next.warrantyYears)    next.warrantyYears = specs.warrantyYears
      if (!next.features)         next.features = specs.features.join(", ")
      return next
    })
  }

  // ── Brochure upload → AI extraction → step-through review ──────────
  const brochureVehicleToForm = (extracted) => ({
    ...emptyVehicle(dealership, user?.name),
    ...extracted,
    features: Array.isArray(extracted.features) ? extracted.features.join(", ") : (extracted.features || ""),
  })

  const handleBrochureFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return
    if (file.type !== "application/pdf") { setBrochureError("Please select a PDF file"); return }

    setBrochureError("")
    setBrochureParsing(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const res = await authFetch("/api/dealer/inventory/parse-brochure", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: ev.target.result }),
        })
        const data = await res.json()
        if (!res.ok) { setBrochureError(data.error || "Could not read this brochure"); return }
        if (!data.vehicles?.length) { setBrochureError("No vehicles found in this PDF — try a different file or add manually."); return }

        setReviewQueue(data.vehicles)
        setReviewIndex(0)
        setReviewForm(brochureVehicleToForm(data.vehicles[0]))
        setReviewAdded(0)
      } catch {
        setBrochureError("Upload failed. Please try again.")
      } finally {
        setBrochureParsing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const advanceReview = () => {
    const nextIndex = reviewIndex + 1
    if (!reviewQueue || nextIndex >= reviewQueue.length) {
      setReviewQueue(null); setReviewForm(null); setReviewIndex(0)
      loadInventory()
      return
    }
    setReviewIndex(nextIndex)
    setReviewForm(brochureVehicleToForm(reviewQueue[nextIndex]))
  }

  const confirmReviewVehicle = async () => {
    if (!reviewForm.brand || !reviewForm.model) return alert("Brand and model are required")
    setReviewSaving(true)
    try {
      const payload = {
        ...reviewForm,
        features: typeof reviewForm.features === "string" ? reviewForm.features.split(",").map(s => s.trim()).filter(Boolean) : reviewForm.features,
        exShowroom: Number(reviewForm.exShowroom) || 0, range: Number(reviewForm.range) || 0,
        topSpeed: Number(reviewForm.topSpeed) || 0, year: Number(reviewForm.year) || new Date().getFullYear(),
      }
      const res = await authFetch("/api/dealer/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) { const d = await res.json(); alert(d.error || "Save failed"); return }
      setReviewAdded(n => n + 1)
      advanceReview()
    } finally {
      setReviewSaving(false)
    }
  }

  const skipReviewVehicle = () => advanceReview()

  const closeReview = () => {
    setReviewQueue(null); setReviewForm(null); setReviewIndex(0)
    if (reviewAdded > 0) loadInventory()
  }

  const handleSave = async () => {
    if (!form.brand || !form.model) return alert("Brand and model are required")
    if (REASON_STATUSES.includes(form.status) && !(form.statusReason || "").trim()) {
      return alert(`Please give a reason for marking this vehicle ${form.status.replace("_", " ").toLowerCase()}`)
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        // Reason only applies to cancelled/dead-stock; clear it on other statuses
        statusReason: REASON_STATUSES.includes(form.status) ? form.statusReason.trim() : "",
        features: typeof form.features === "string" ? form.features.split(",").map(s=>s.trim()).filter(Boolean) : form.features,
        tags:     typeof form.tags === "string"     ? form.tags.split(",").map(s=>s.trim()).filter(Boolean)     : form.tags,
        exShowroom: Number(form.exShowroom), onRoadPrice: Number(form.onRoadPrice), emi: Number(form.emi), range: Number(form.range),
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

  const approveInspection = async (item) => {
    if (!confirm(`Approve & publish ${item.brand} ${item.model}? It will go live on the marketplace immediately.`)) return
    await authFetch("/api/dealer/inventory", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
      id: item.id,
      inspectionReport: { ...item.inspectionReport, approvalStatus: "APPROVED", approvedAt: new Date().toISOString() },
    }) })
    loadInventory()
  }

  const rejectInspection = async (item) => {
    const reason = window.prompt("Reason for rejecting this inspection (visible only to you):", "")
    if (reason === null) return
    await authFetch("/api/dealer/inventory", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
      id: item.id,
      inspectionReport: { ...item.inspectionReport, approvalStatus: "REJECTED", dealerNotes: reason },
    }) })
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

  const displayed = filterStatus === "PENDING_APPROVAL"
    ? inventory.filter(v => v.inspectionReport?.approvalStatus === "PENDING")
    : filterStatus ? inventory.filter(v => v.status === filterStatus) : inventory
  const pendingApprovalCount = inventory.filter(v => v.inspectionReport?.approvalStatus === "PENDING").length
  const inStock   = inventory.filter(v => v.status === "IN_STOCK").length
  const sold      = inventory.filter(v => v.status === "SOLD").length

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          // The detail page shows the main image ~865px wide — a source smaller than
          // that gets stretched by the browser and looks blurry no matter what we do
          // here (we can't add detail the file doesn't have). Warn so the dealer
          // re-shoots / finds a bigger file instead of wondering why it's blurry.
          if (Math.max(img.width, img.height) < 800) {
            setLowResWarnings(w => [...w, `${file.name} (${img.width}×${img.height}px)`])
          }
          const canvas = document.createElement("canvas")
          // Cap the longest side at 1280px — the marketplace detail page shows the
          // main image ~760px wide, so 1280 keeps it crisp (incl. on retina) without
          // bloating the base64 row. Was 640×480@0.7, which upscaled and looked blurry.
          const MAX_SIDE = 1280
          let width = img.width
          let height = img.height
          if (width >= height) {
            if (width > MAX_SIDE) { height *= MAX_SIDE / width; width = MAX_SIDE }
          } else {
            if (height > MAX_SIDE) { width *= MAX_SIDE / height; height = MAX_SIDE }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, 0, 0, width, height)
          const base64 = canvas.toDataURL("image/jpeg", 0.85)
          setForm(f => {
            const currentImages = Array.isArray(f.images) ? f.images.filter(x => x !== "🚗" && x !== "🛵" && x !== "🛺") : []
            if (!currentImages.includes(base64)) {
              return { ...f, images: [...currentImages, base64] }
            }
            return f
          })
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    })
  }

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
            {pendingApprovalCount > 0 && <option value="PENDING_APPROVAL">⏳ Pending Approval ({pendingApprovalCount})</option>}
          </select>
          <button onClick={()=>setReportOpen(true)}
            style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:20, padding:"8px 16px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            📊 Report
          </button>
          <button onClick={async ()=>{
              const vehicleModel = window.prompt("Vehicle model to restock (e.g. Tata Nexon EV):")
              if (!vehicleModel?.trim()) return
              const quantity = window.prompt("Quantity needed:", "5")
              if (!quantity || isNaN(quantity) || Number(quantity) < 1) return alert("Enter a valid quantity")
              const note = window.prompt("Note for the OEM (optional):", "") || ""
              const res = await authFetch("/api/dealer/stock-requests", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ vehicleModel, quantity, note }) })
              const data = await res.json()
              alert(res.ok ? "Restock request sent to your OEM." : (data.error || "Failed to send request"))
            }}
            style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:20, padding:"8px 16px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            📦 Request Stock
          </button>
          <Link href="/showroom" target="_blank"
            style={{ background:`${C.blue}15`, border:`1px solid ${C.blue}25`, color:C.blue, borderRadius:20, padding:"8px 16px", fontSize:11, fontWeight:700, textDecoration:"none" }}>
            🌐 View Marketplace
          </Link>
          <label style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:20, padding:"8px 16px", fontSize:11, fontWeight:700, cursor:brochureParsing?"wait":"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6, opacity:brochureParsing?0.6:1 }}>
            {brochureParsing ? "⏳ Reading brochure…" : "📄 Upload Brochure"}
            <input type="file" accept="application/pdf" onChange={handleBrochureFile} disabled={brochureParsing} style={{ display:"none" }} />
          </label>
          <button onClick={openAdd}
            style={{ background:C.green, border:"none", color:"#fff", borderRadius:20, padding:"8px 18px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Add Vehicle
          </button>
        </div>
      </div>
      {brochureError && (
        <div style={{ background:`${C.red}10`, border:`1px solid ${C.red}30`, color:C.red, borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:12, fontWeight:600, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>⚠️ {brochureError}</span>
          <button onClick={()=>setBrochureError("")} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontWeight:900 }}>✕</button>
        </div>
      )}

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
                    {v.inspectionReport?.approvalStatus === "PENDING" && (
                      <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                        <button onClick={()=>approveInspection(v)}
                          style={{ background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                          ✓ Approve & Publish
                        </button>
                        <button onClick={()=>rejectInspection(v)}
                          style={{ background:`${C.red}15`, border:`1px solid ${C.red}25`, color:C.red, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                          Reject
                        </button>
                      </div>
                    )}
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
          {autofilled && (
            <div style={{ gridColumn:"span 2", background:`${C.green}12`, border:`1px solid ${C.green}40`, borderRadius:10, padding:"9px 14px", marginBottom:14, fontSize:12, color:C.green, fontWeight:700 }}>
              ✨ Specs auto-filled from our EV catalog — review and adjust anything before saving.
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <F label="Brand *"           field="brand" form={form} setForm={setForm} onBlur={applyCatalogAutofill} />
            <F label="Model *"           field="model" form={form} setForm={setForm} onBlur={applyCatalogAutofill} />
            <F label="Variant"           field="variant" form={form} setForm={setForm} />
            <F label="Colour"            field="color" form={form} setForm={setForm} />
            <F label="Vehicle Type"      field="type"     opts={VEHICLE_TYPES} form={form} setForm={setForm} />
            <F label="Body Type"         field="bodyType" opts={BODY_TYPES} form={form} setForm={setForm} />
            <F label="Fuel Type"         field="fuelType" opts={FUEL_TYPES} form={form} setForm={setForm} />
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:C.ink2, marginBottom:5 }}>Condition</div>
              <select value={form.condition || "new"} onChange={e => {
                const val = e.target.value
                setForm(f => ({ ...f, condition: val, inspectionReport: val === "used" ? (f.inspectionReport || emptyInspectionReport()) : null }))
              }} style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none" }}>
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
            <F label="Year"              field="year"        type="number" form={form} setForm={setForm} />
            <F label="KM Driven (0=new)" field="km"          type="number" form={form} setForm={setForm} />
            <F label="Range (km)"        field="range"       type="number" form={form} setForm={setForm} />
            <F label="Battery Capacity"  field="batteryCapacity" form={form} setForm={setForm} />
            <F label="Top Speed (km/h)"  field="topSpeed"    type="number" form={form} setForm={setForm} />
            <F label="Charging Time"     field="chargingTime" form={form} setForm={setForm} />
            <F label="Seating Capacity"  field="seatingCapacity" type="number" form={form} setForm={setForm} />
            <F label="Boot Space"        field="bootSpace" form={form} setForm={setForm} />
            <F label="Ground Clearance"  field="groundClearance" form={form} setForm={setForm} />
            <F label="Warranty (Years)"  field="warrantyYears" type="number" form={form} setForm={setForm} />
            <F label="Ex-Showroom Price" field="exShowroom"  type="number" form={form} setForm={setForm} />
            <F label="On-Road Price"     field="onRoadPrice"  type="number" form={form} setForm={setForm} />
            <F label="EMI / month"       field="emi"         type="number" form={form} setForm={setForm} />
            <F label="Status"            field="status"      opts={STATUS_OPTIONS} form={form} setForm={setForm} />
            {REASON_STATUSES.includes(form?.status) && (
              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", marginBottom: 5 }}>
                  Reason for {form.status === "CANCELLED" ? "cancellation" : "dead stock"} (required — visible to your OEM)
                </div>
                <input value={form.statusReason || ""} onChange={e=>setForm(f=>({...f, statusReason:e.target.value}))}
                  placeholder={form.status === "CANCELLED" ? "e.g. Customer backed out — financing rejected" : "e.g. Old variant, no demand for 6+ months"}
                  style={{ width:"100%", background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:8, padding:"9px 12px", fontSize:12.5, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>
            )}
            <F label="State"             field="state" form={form} setForm={setForm} />
            <F label="District"          field="district" form={form} setForm={setForm} />
            <F label="VIN"               field="vin" form={form} setForm={setForm} />

            {form.condition === "used" && form.inspectionReport && (
              <div style={{ gridColumn: "span 2", marginTop: 6, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>🔍 Vehicle Inspection Report</div>
                <div style={{ fontSize: 11, color: C.ink3, marginBottom: 14 }}>
                  Required for used vehicles — save first, then approve it from the inventory list before it goes live on the marketplace.
                </div>
                {form.inspectionReport.categories.map((cat, ci) => (
                  <div key={cat.name} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: C.ink }}>{cat.name}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {cat.items.map((it, ii) => (
                        <div key={it.item} style={{ display: "grid", gridTemplateColumns: "1.2fr 90px 1.4fr", gap: 8, alignItems: "center" }}>
                          <div style={{ fontSize: 11.5, color: C.ink2 }}>{it.item}</div>
                          <select value={it.rating} onChange={e => {
                            const val = e.target.value
                            setForm(f => ({ ...f, inspectionReport: { ...f.inspectionReport, categories: f.inspectionReport.categories.map((c, cidx) => cidx !== ci ? c : { ...c, items: c.items.map((x, xidx) => xidx !== ii ? x : { ...x, rating: val }) }) } }))
                          }} style={{ background: it.rating === "Poor" ? "#FEF2F2" : it.rating === "Fair" ? "#FFFBEB" : "#F0FDF4", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 8, padding: "6px 8px", fontSize: 11, fontFamily: "inherit", outline: "none" }}>
                            {RATING_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <input value={it.notes} placeholder="Notes (optional)" onChange={e => {
                            const val = e.target.value
                            setForm(f => ({ ...f, inspectionReport: { ...f.inspectionReport, categories: f.inspectionReport.categories.map((c, cidx) => cidx !== ci ? c : { ...c, items: c.items.map((x, xidx) => xidx !== ii ? x : { ...x, notes: val }) }) } }))
                          }} style={{ background: C.bg, border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 8, padding: "6px 10px", fontSize: 11, fontFamily: "inherit", outline: "none" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.ink2, marginBottom: 5 }}>Overall Grade</div>
                  <select value={form.inspectionReport.overallGrade} onChange={e => {
                    const val = e.target.value
                    setForm(f => ({ ...f, inspectionReport: { ...f.inspectionReport, overallGrade: val } }))
                  }} style={{ width: 120, background: C.bg, border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 10, padding: "9px 12px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                    {["A", "B", "C", "D"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ gridColumn: "span 2", marginTop: 6, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink2, marginBottom: 8 }}>Vehicle Photos</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {(Array.isArray(form?.images) ? form.images.filter(x => x !== "🚗" && x !== "🛵" && x !== "🛺") : []).map((imgUrl, idx) => (
                  <div key={idx} style={{ position: "relative", width: 80, height: 60, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                    <img src={imgUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button type="button" onClick={() => {
                      setForm(f => ({
                        ...f,
                        images: f.images.filter((_, i) => i !== idx)
                      }))
                    }} style={{ position: "absolute", top: 2, right: 2, background: "rgba(239, 68, 68, 0.8)", border: "none", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 10, padding: 0 }}>
                      ✕
                    </button>
                  </div>
                ))}
                
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: "none" }} id="photo-upload-input" />
                <label htmlFor="photo-upload-input" style={{ width: 80, height: 60, background: `${C.blue}08`, border: `1.5px dashed ${C.blue}30`, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <span style={{ fontSize: 20, color: C.blue, lineHeight: 1 }}>+</span>
                  <span style={{ fontSize: 9, color: C.blue, fontWeight: 700 }}>Add Photo</span>
                </label>
              </div>
              <div style={{ fontSize: 10, color: C.ink3, marginTop: 6 }}>Choose multiple photos to upload. Tap '✕' to remove. Use photos at least 1000px wide — small images look blurry on the marketplace.</div>
              {lowResWarnings.length > 0 && (
                <div style={{ marginTop: 8, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#92400E", lineHeight: 1.6 }}>
                  ⚠️ <b>Low-resolution photo{lowResWarnings.length > 1 ? "s" : ""} — will look blurry on the marketplace:</b>
                  {lowResWarnings.map((w, i) => <div key={i}>· {w}</div>)}
                  <div style={{ marginTop: 4 }}>Please replace with the original camera photo (not a thumbnail or screenshot). Aim for at least 1000px on the longest side.</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop:14, display:"grid", gap:14 }}>
            <F label="Features (comma-separated)" field="features" form={form} setForm={setForm} />
            <F label="Tags (comma-separated)"      field="tags" form={form} setForm={setForm} />
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:C.ink2, cursor:"pointer" }}>
              <input type="checkbox" checked={form?.isDemo||false} onChange={e=>setForm(f=>({...f,isDemo:e.target.checked}))} />
              This is a demo/test-drive vehicle (excluded from marketplace stock counts)
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:C.ink2, cursor:"pointer" }}>
              <input type="checkbox" checked={form?.certified||false} onChange={e=>setForm(f=>({...f,certified:e.target.checked}))} />
              Mark as EV.CRM Certified (shows a ✅ Certified badge on the marketplace listing)
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

      {/* Brochure review — one vehicle at a time, editable before it goes live */}
      {reviewQueue && reviewForm && (
        <Modal title={`Review Vehicle ${reviewIndex + 1} of ${reviewQueue.length} — from brochure`} onClose={closeReview}>
          <div style={{ background:`${C.blue}10`, border:`1px solid ${C.blue}30`, borderRadius:10, padding:"9px 14px", marginBottom:16, fontSize:12, color:C.blue, fontWeight:700 }}>
            ✨ Extracted from your PDF — review every field before it's published to the marketplace. Nothing goes live until you confirm.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <F label="Brand *"           field="brand" form={reviewForm} setForm={setReviewForm} />
            <F label="Model *"           field="model" form={reviewForm} setForm={setReviewForm} />
            <F label="Variant"           field="variant" form={reviewForm} setForm={setReviewForm} />
            <F label="Colour"            field="color" form={reviewForm} setForm={setReviewForm} />
            <F label="Vehicle Type"      field="type"     opts={VEHICLE_TYPES} form={reviewForm} setForm={setReviewForm} />
            <F label="Body Type"         field="bodyType" opts={BODY_TYPES} form={reviewForm} setForm={setReviewForm} />
            <F label="Range (km)"        field="range"       type="number" form={reviewForm} setForm={setReviewForm} />
            <F label="Battery Capacity"  field="batteryCapacity" form={reviewForm} setForm={setReviewForm} />
            <F label="Top Speed (km/h)"  field="topSpeed"    type="number" form={reviewForm} setForm={setReviewForm} />
            <F label="Charging Time"     field="chargingTime" form={reviewForm} setForm={setReviewForm} />
            <F label="Seating Capacity"  field="seatingCapacity" type="number" form={reviewForm} setForm={setReviewForm} />
            <F label="Boot Space"        field="bootSpace" form={reviewForm} setForm={setReviewForm} />
            <F label="Ground Clearance"  field="groundClearance" form={reviewForm} setForm={setReviewForm} />
            <F label="Warranty (Years)"  field="warrantyYears" type="number" form={reviewForm} setForm={setReviewForm} />
            <F label="Ex-Showroom Price" field="exShowroom"  type="number" form={reviewForm} setForm={setReviewForm} />
            <F label="Status"            field="status"      opts={STATUS_OPTIONS} form={reviewForm} setForm={setReviewForm} />
            <div style={{ gridColumn:"span 2" }}>
              <F label="Features (comma-separated)" field="features" form={reviewForm} setForm={setReviewForm} />
            </div>
          </div>
          {reviewAdded > 0 && (
            <div style={{ marginTop:14, fontSize:11.5, color:C.ink3 }}>✓ {reviewAdded} vehicle{reviewAdded===1?"":"s"} added so far from this brochure.</div>
          )}
          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={closeReview}
              style={{ background:"transparent", border:`1.5px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"11px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Stop Reviewing
            </button>
            <button onClick={skipReviewVehicle}
              style={{ background:"transparent", border:`1.5px solid ${C.border}`, color:C.ink2, borderRadius:10, padding:"11px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Skip This One
            </button>
            <button onClick={confirmReviewVehicle} disabled={reviewSaving}
              style={{ flex:1, background: reviewSaving ? C.ink3 : C.green, border:"none", color:"#fff", borderRadius:10, padding:"11px", fontSize:13, fontWeight:700, cursor: reviewSaving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {reviewSaving ? "Publishing…" : reviewIndex + 1 < reviewQueue.length ? "✓ Confirm & Next Vehicle" : "✓ Confirm & Finish"}
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
function getWhatsAppLink(l) {
  const fn = WA_REPLY_MAP[l.source_context] || WA_REPLY_MAP.default
  return `https://wa.me/${(l.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(fn(l))}`
}

function toCSV(rows) {
  const headers = ["Name","Phone","Vehicle","Status","Source","City","Follow-up"]
  const lines = rows.map(l => [l.name,l.phone,l.vehicle,l.status,l.source,l.city||"",l.next_followup||""].map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(","))
  return [headers.join(","), ...lines].join("\n")
}

/* ── Responsive: most dealers/reps run this on phones, not laptops ─────── */
function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`)
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [bp])
  return mobile
}

/* ── Contact triggers: Call / WhatsApp / SMS / Email per lead ──────────── */
const CHANNEL_META = {
  call:     { icon:"📞", label:"Call",     color:"#3B82F6" },
  whatsapp: { icon:"💬", label:"WhatsApp", color:"#059669" },
  sms:      { icon:"📱", label:"SMS",      color:"#8B5CF6" },
  email:    { icon:"✉️", label:"Email",    color:"#F97316" },
  note:     { icon:"📝", label:"Note",     color:"#6B7280" },
}

function timeAgo(iso) {
  if (!iso) return ""
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  if (s < 604800) return `${Math.floor(s/86400)}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day:"numeric", month:"short" })
}

function leadPhoneDigits(lead) {
  let d = (lead.phone || "").replace(/\D/g, "")
  if (d.length === 10) d = "91" + d
  return d
}

/* Chip showing the last outreach on a lead — visible to dealer + reps */
function LastActionChip({ lead }) {
  const la = lead.lastAction
  if (!la) return <span style={{ fontSize:9, color:C.ink3 }}>No contact yet</span>
  const m = CHANNEL_META[la.type] || CHANNEL_META.note
  return (
    <span title={`${m.label} by ${la.by || "rep"} · ${new Date(la.at).toLocaleString("en-IN")}`}
      style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:9, fontWeight:600, color:m.color, background:`${m.color}12`, border:`1px solid ${m.color}25`, borderRadius:6, padding:"2px 7px", whiteSpace:"nowrap" }}>
      {m.icon} {m.label} · {timeAgo(la.at)}
    </span>
  )
}

/* Preview-before-send: auto-fills the message from the lead's current stage,
   rep can edit, then Send opens the native app (WhatsApp / SMS / mail). */
function ContactPreviewModal({ lead, channel, dealerName, onClose, onSent }) {
  const t = CONTACT_TEMPLATES[lead.status] || CONTACT_TEMPLATES.default
  const [subject, setSubject] = useState(channel === "email" ? t.emailSub(lead) : "")
  const [msg, setMsg] = useState(channel === "email" ? t.emailBody(lead, dealerName) : t[channel](lead, dealerName))
  const [sending, setSending] = useState(false)
  const m = CHANNEL_META[channel]

  const send = async () => {
    setSending(true)
    const digits = leadPhoneDigits(lead)
    let url = ""
    if (channel === "whatsapp") url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
    if (channel === "sms")      url = `sms:+${digits}?body=${encodeURIComponent(msg)}`
    if (channel === "email")    url = `mailto:${lead.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`
    window.open(url, "_blank")
    await onSent(channel, msg)
    setSending(false)
    onClose()
  }

  const inputSt = { width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }

  return (
    <Modal title={`${m.icon} ${m.label} — ${lead.name}`} onClose={onClose} width={480}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <span style={{ background:(STATUS_CONFIG[lead.status]||STATUS_CONFIG.NEW).bg, color:(STATUS_CONFIG[lead.status]||STATUS_CONFIG.NEW).color, fontSize:9, fontWeight:700, padding:"3px 10px", borderRadius:6 }}>
          {lead.status} stage template
        </span>
        <span style={{ fontSize:10, color:C.ink3 }}>Review & edit before sending</span>
      </div>
      {channel === "email" && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.ink3, textTransform:"uppercase", marginBottom:4 }}>Subject</div>
          <input value={subject} onChange={e=>setSubject(e.target.value)} style={inputSt} />
        </div>
      )}
      <div style={{ fontSize:9, fontWeight:700, color:C.ink3, textTransform:"uppercase", marginBottom:4 }}>Message</div>
      <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={channel === "email" ? 10 : 5}
        style={{ ...inputSt, resize:"vertical", lineHeight:1.5, marginBottom:14 }} />
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button onClick={onClose} style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:10, padding:"10px 18px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
        <button onClick={send} disabled={sending}
          style={{ background:m.color, border:"none", color:"#fff", borderRadius:10, padding:"10px 22px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
          {sending ? "…" : `${m.icon} Send via ${m.label}`}
        </button>
      </div>
    </Modal>
  )
}

/* The 4 contact trigger buttons. Every action is logged to the lead's
   timeline with channel + timestamp and stamps lastAction on the lead. */
function ContactActions({ lead, onRefresh, compact=false }) {
  const { user } = useAuth()
  const [preview, setPreview] = useState(null) // channel string
  const dealerName = user?.name || user?.dealerName || "our dealership"

  const logAction = async (channel, detail) => {
    try {
      await authFetch("/api/dealer/leads", {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ id: lead.id, addNote: { text: detail, channel } })
      })
      onRefresh?.()
    } catch {}
  }

  const handleCall = () => {
    const digits = leadPhoneDigits(lead)
    window.location.href = `tel:+${digits}`
    logAction("call", `Called ${lead.name} (${lead.phone})`)
  }

  const onSent = (channel, msg) =>
    logAction(channel, `${CHANNEL_META[channel].label} sent (${lead.status} template): "${msg.slice(0, 80)}${msg.length > 80 ? "…" : ""}"`)

  const btnSize = compact ? 30 : 38
  const btn = (channel, onClick, disabled, title) => {
    const m = CHANNEL_META[channel]
    return (
      <button key={channel} onClick={onClick} disabled={disabled} title={disabled ? "Blocked — Do Not Disturb" : title}
        style={{ width:btnSize, height:btnSize, borderRadius:"50%", border:`1.5px solid ${disabled ? C.border : m.color+"35"}`,
          background: disabled ? C.bg : `${m.color}12`, fontSize: compact ? 12 : 15, cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontFamily:"inherit" }}>
        {m.icon}
      </button>
    )
  }

  return (
    <>
      <div style={{ display:"flex", gap: compact ? 5 : 8, alignItems:"center" }}>
        {btn("call", handleCall, false, `Call ${lead.phone}`)}
        {btn("whatsapp", ()=>setPreview("whatsapp"), !!lead.dnd, "WhatsApp with auto-filled message")}
        {btn("sms", ()=>setPreview("sms"), !!lead.dnd, "SMS with auto-filled message")}
        {btn("email", ()=>setPreview("email"), !lead.email, lead.email ? "Email with auto-drafted body" : "No email on this lead")}
      </div>
      {preview && (
        <ContactPreviewModal lead={lead} channel={preview} dealerName={dealerName}
          onClose={()=>setPreview(null)} onSent={onSent} />
      )}
    </>
  )
}

/* ── Lead Detail Modal — 2.2, 2.9 notes, 3.7 test drive history ── */
function LeadDetailModal({ lead, reps, bookings = [], quotes = [], onClose, onRefresh, onGoToBuildPrice }) {
  const [noteText, setNoteText] = useState("")
  const [saving, setSaving] = useState(false)
  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW

  const hasBooking = useMemo(() => {
    if (lead.bookingId) return true
    const norm = p => (p || "").replace(/\D/g, "")
    const leadPhone = norm(lead.phone)
    return bookings.some(b => norm(b.phone) === leadPhone || (lead.email && b.email === lead.email))
  }, [lead, bookings])

  const hasAcceptedQuote = useMemo(() => {
    return quotes.some(q => q.leadId === lead.id && (q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded"))
  }, [lead, quotes])

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
        <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Source</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{SOURCE_LABELS[lead.source] || lead.source || "—"}</div></div>
        <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Rep</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{reps.find(r=>r.id===lead.assignedRep)?.name || "Unassigned"}</div></div>
        <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Follow-up</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{lead.next_followup ? new Date(lead.next_followup).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}</div></div>
      </div>

      {/* Booking / test-drive details — shown when the lead came in from the
          public website so the dealer sees the appointment and reference. */}
      {(lead.bookingId || lead.source === "marketplace_booking" || lead.source_context === "test_drive") && (
        <div style={{ background:`${C.green}0D`, border:`1px solid ${C.green}30`, borderRadius:10, padding:12, marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:800, color:C.greenD || "#065F46", marginBottom:10, letterSpacing:"0.4px", display:"flex", alignItems:"center", gap:6 }}>
            {lead.source_context === "test_drive" ? "🚗 TEST DRIVE REQUEST" : "📦 WEBSITE BOOKING"}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Vehicle</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{lead.vehicle || "—"}</div></div>
            <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Preferred date</div><div style={{ fontSize:11, fontWeight:800, color:lead.preferredDate ? (C.greenD||"#065F46") : C.ink3 }}>{lead.preferredDate ? new Date(lead.preferredDate).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"}) : "Not specified"}</div></div>
            {lead.bookingId && <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Booking ref</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{lead.bookingId}</div></div>}
            {lead.tokenCollected ? <div><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase" }}>Token collected</div><div style={{ fontSize:11, fontWeight:700, color:C.ink }}>₹{Number(lead.tokenCollected).toLocaleString("en-IN")}</div></div> : null}
          </div>
          {lead.message && <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.green}20` }}><div style={{ fontSize:9, color:C.ink3, textTransform:"uppercase", marginBottom:3 }}>Customer note</div><div style={{ fontSize:11, color:C.ink2, lineHeight:1.5 }}>“{lead.message}”</div></div>}
        </div>
      )}

      {lead.lostReason && (
        <div style={{ background:`${C.red}10`, border:`1px solid ${C.red}25`, borderRadius:8, padding:"8px 12px", marginBottom:16, fontSize:11, color:C.red }}>
          Lost reason: <b>{lead.lostReason}</b>
        </div>
      )}

      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
        <ContactActions lead={lead} onRefresh={onRefresh} />
        <LastActionChip lead={lead} />
        <button 
          onClick={() => {
            onClose()
            onGoToBuildPrice?.(lead)
          }}
          disabled={!hasBooking}
          title={!hasBooking ? "Only available for customers with active vehicle bookings" : "Build and send pricing quote"}
          style={{ 
            background: hasBooking ? C.green : "#F3F4F6", 
            border: "none", 
            color: hasBooking ? "#fff" : C.ink3, 
            borderRadius: 8, 
            padding: "8px 12px", 
            fontSize: 11, 
            fontWeight: 700, 
            cursor: hasBooking ? "pointer" : "not-allowed", 
            fontFamily: "inherit" 
          }}
        >
          📄 Send Quote
        </button>
        <button onClick={toggleDND} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:8, padding:"8px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          {lead.dnd ? "Remove DND" : "🔕 Mark DND"}
        </button>
      </div>
      {lead.dnd && (
        <div style={{ background:`${C.red}10`, color:C.red, borderRadius:8, padding:"6px 12px", fontSize:10, fontWeight:700, marginBottom:12 }}>
          🔕 Do Not Disturb — messaging channels blocked, calls still allowed
        </div>
      )}

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
        ) : lead.notes.map(n => {
          const cm = CHANNEL_META[n.channel] || CHANNEL_META.note
          return (
            <div key={n.id} style={{ padding:"8px 10px", background:C.bg, borderRadius:8, borderLeft:`3px solid ${cm.color}` }}>
              <div style={{ fontSize:11, color:C.ink }}>{cm.icon} {n.text}</div>
              <div style={{ fontSize:9, color:C.ink3, marginTop:3 }}>{n.author} · {new Date(n.created_at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function LeadsSection({ leads, loading, onRefresh, reps=[], bookings=[], quotes=[], onGoToBuildPrice }) {
  const { user: _lsUser } = useAuth()
  // For a rep, flag leads they're only covering (owned by someone else) so
  // they know these belong to a colleague on leave, not to them.
  const myRepId = _lsUser?.role === "rep" ? _lsUser.repId : null
  const coveredOwnerName = (lead) => {
    if (!myRepId || !lead.assignedRep || lead.assignedRep === myRepId) return null
    return reps.find(r => r.id === lead.assignedRep)?.name || "colleague"
  }
  const isMobile = useIsMobile()
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

      {isMobile ? (
        /* ── Mobile: card list — reps work leads one-thumb on the phone ── */
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:C.ink3, fontSize:12 }}>Loading leads…</div>
          ) : displayed.length === 0 ? (
            <div style={{ padding:40, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>No leads match</div>
            </div>
          ) : displayed.map(l => {
            const sc = STATUS_CONFIG[l.status] || STATUS_CONFIG.NEW
            return (
              <div key={l.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }} onClick={()=>setDetailLead(l)}>
                  <Avatar name={l.name} size={36} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, color:C.ink, fontSize:14 }}>
                      {l.name}
                      {coveredOwnerName(l) && <span style={{ fontSize:8.5, fontWeight:800, color:"#6D28D9", background:"#EDE9FE", borderRadius:5, padding:"1px 6px", marginLeft:6 }}>COVERING FOR {coveredOwnerName(l).toUpperCase()}</span>}
                      {l.oemVerified && <span style={{ fontSize:8.5, fontWeight:800, color:"#065F46", background:"#D1FAE5", borderRadius:5, padding:"1px 6px", marginLeft:6 }}>✓ OEM-VERIFIED</span>}
                    </div>
                    <div style={{ fontSize:11, color:C.ink3 }}>{l.phone}{l.vehicle ? ` · ${l.vehicle}` : ""}</div>
                  </div>
                  <select value={l.status} disabled={updating===l.id} onClick={e=>e.stopPropagation()} onChange={e=>setStatus(l, e.target.value)}
                    style={{ background:sc.bg, color:sc.color, border:`1px solid ${sc.color}30`, borderRadius:8, padding:"6px 8px", fontSize:10, fontWeight:700, outline:"none", fontFamily:"inherit" }}>
                    {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                  <Tag label={l.source||"direct"} color={C.ink3} />
                  {l.tokenCollected > 0 && <span style={{ background:`${C.green}18`, color:C.green, fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:8 }}>💰 TOKEN ₹{l.tokenCollected.toLocaleString("en-IN")} PAID</span>}
                  <select value={l.assignedRep||""} disabled={updating===l.id} onChange={e=>setRep(l, e.target.value)}
                    style={{ background:C.bg, border:`1px solid ${C.border}`, color:l.assignedRep?C.ink:C.ink3, borderRadius:8, padding:"5px 8px", fontSize:10, fontWeight:600, outline:"none", fontFamily:"inherit" }}>
                    <option value="">Unassigned</option>
                    {reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  {l.next_followup && <span style={{ fontSize:10, color:C.ink3 }}>📅 {new Date(l.next_followup).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <ContactActions lead={l} onRefresh={onRefresh} />
                  <LastActionChip lead={l} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
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
                      <div><div style={{ fontWeight:700, color:C.ink }}>{l.name}{coveredOwnerName(l) && <span style={{ fontSize:8, fontWeight:800, color:"#6D28D9", background:"#EDE9FE", borderRadius:4, padding:"1px 5px", marginLeft:5 }}>COVERING · {coveredOwnerName(l)}</span>}{l.oemVerified && <span style={{ fontSize:8, fontWeight:800, color:"#065F46", background:"#D1FAE5", borderRadius:4, padding:"1px 5px", marginLeft:5 }}>✓ OEM-VERIFIED</span>}</div><div style={{ fontSize:10, color:C.ink3 }}>{l.phone}</div>{l.tokenCollected > 0 && <div style={{ display:"inline-block", marginTop:3, background:`${C.green}18`, color:C.green, fontSize:9, fontWeight:800, padding:"1px 7px", borderRadius:8 }}>💰 TOKEN ₹{l.tokenCollected.toLocaleString("en-IN")} PAID</div>}</div>
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
                    <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-start" }}>
                      <ContactActions lead={l} onRefresh={onRefresh} compact />
                      <LastActionChip lead={l} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      )}

      {detailLead && <LeadDetailModal lead={leads.find(l=>l.id===detailLead.id) || detailLead} reps={reps} bookings={bookings} quotes={quotes} onClose={()=>setDetailLead(null)} onRefresh={onRefresh} onGoToBuildPrice={onGoToBuildPrice} />}

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
        <div style={{ fontSize:13, color:C.ink2 }}>Test drive bookings & inspection requests from the marketplace</div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ display:"flex", background:C.bg, borderRadius:8, padding:2 }}>
            <button onClick={()=>setView("list")} style={{ background:view==="list"?C.card:"transparent", border:"none", borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:view==="list"?C.ink:C.ink3 }}>☰ List</button>
            <button onClick={()=>setView("calendar")} style={{ background:view==="calendar"?C.card:"transparent", border:"none", borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:view==="calendar"?C.ink:C.ink3 }}>📅 Calendar</button>
          </div>
          <Link href="/showroom" target="_blank" style={{ fontSize:12, fontWeight:600, color:C.accent, textDecoration:"none" }}>🌐 View Marketplace →</Link>
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
          <Link href="/showroom" target="_blank" style={{ display:"inline-block", background:C.accent||C.green, color:"#fff", fontWeight:700, fontSize:12, padding:"10px 24px", borderRadius:20, textDecoration:"none" }}>
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
                    <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{b.type === "INSPECTION" ? "🔍 " : ""}{b.name} — {b.vehicleName}</div>
                    <div style={{ fontSize:10, color:C.ink3 }}>{b.type === "INSPECTION" ? (b.inspectionTime || "Time TBD") : (b.scheduledTime ? new Date(b.scheduledTime).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "Time TBD")} {b.type === "INSPECTION" ? "· Customer's mechanic" : ""}{b.assignedRep ? `· ${reps.find(r=>r.id===b.assignedRep)?.name || b.assignedRep}` : ""}</div>
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
              {["Customer","Vehicle","Type","Schedule","Rep","Outcome","Token","Payment","Actions"].map(h=>(
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
                    <td style={{ padding:"10px 16px" }}><div style={{ fontWeight:700, color:C.ink }}>{b.name}</div><div style={{ fontSize:10, color:C.ink3 }}>{b.phone}</div>{!b.assignedRep && b.paymentStatus==="PAID" && b.status!=="CANCELLED" && <div style={{ display:"inline-block", marginTop:4, background:`${C.red}15`, color:C.red, fontSize:9, fontWeight:800, padding:"1px 7px", borderRadius:8 }}>⚠ NEEDS ASSIGNMENT</div>}</td>
                    <td style={{ padding:"10px 16px", color:C.ink2 }}>{b.vehicleName}</td>
                    <td style={{ padding:"10px 16px" }}>
                      {b.type === "INSPECTION" ? (
                        <span style={{ background:"#EFF6FF", color:"#2563EB", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:8, whiteSpace:"nowrap" }}>🔍 Inspection</span>
                      ) : (
                        <span style={{ background:"#F0FDF4", color:"#059669", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:8, whiteSpace:"nowrap" }}>🚗 Test Drive</span>
                      )}
                      {b.type === "INSPECTION" && b.inspectionTime && (
                        <div style={{ fontSize:9, color:"#2563EB", marginTop:4 }}>{b.inspectionTime}</div>
                      )}
                    </td>
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
                    <td style={{ padding:"10px 16px", color: b.type === "INSPECTION" ? C.ink3 : C.green, fontWeight:700 }}>{b.type === "INSPECTION" ? "Free" : `₹${(b.tokenAmount||1000).toLocaleString()}`}</td>
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
   PROCUREMENT SECTION — Used Car Dealer only:
   sellers offering a vehicle TO the dealer, the
   reverse pipeline of Leads (buyers).
───────────────────────────────────────────── */
const PROC_STATUSES = ["NEW", "INSPECTION_SCHEDULED", "INSPECTED", "OFFER_MADE", "NEGOTIATING", "PURCHASED", "REJECTED"]
const PROC_STATUS_LABELS = {
  NEW: "New Inquiry", INSPECTION_SCHEDULED: "Inspection Scheduled", INSPECTED: "Inspected",
  OFFER_MADE: "Offer Made", NEGOTIATING: "Negotiating", PURCHASED: "Purchased", REJECTED: "Rejected",
}
const PROC_STATUS_COLORS = {
  NEW: C.blue, INSPECTION_SCHEDULED: C.orange, INSPECTED: C.orange,
  OFFER_MADE: C.orange, NEGOTIATING: C.orange, PURCHASED: C.green, REJECTED: C.red,
}
const PROC_SOURCES = ["Walk-in", "Phone Inquiry", "Referral", "OLX", "Website", "Other"]

function emptyProcLead() {
  return { sellerName:"", sellerPhone:"", sellerEmail:"", brand:"", model:"", variant:"", year:new Date().getFullYear(), km:"", fuelType:"Petrol", color:"", condition:"Good", askingPrice:"", source:"Walk-in" }
}

function AddProcurementModal({ onClose, onAdded }) {
  const [form, setForm] = useState(emptyProcLead())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const submit = async () => {
    if (!form.sellerName.trim() || !form.sellerPhone.trim() || !form.brand.trim() || !form.model.trim()) {
      setErr("Seller name, phone, brand and model are required"); return
    }
    setSaving(true); setErr("")
    try {
      const res = await authFetch("/api/dealer/procurement", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || "Failed to add"); return }
      onAdded?.()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="🔑 New Seller Inquiry" onClose={onClose} width={560}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Input label="Seller Name *" value={form.sellerName} onChange={e=>setForm(f=>({...f,sellerName:e.target.value}))} />
        <Input label="Seller Phone *" value={form.sellerPhone} onChange={e=>setForm(f=>({...f,sellerPhone:e.target.value}))} />
        <Input label="Seller Email" value={form.sellerEmail} onChange={e=>setForm(f=>({...f,sellerEmail:e.target.value}))} />
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:C.ink2, marginBottom:5 }}>Source</div>
          <select value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 10px", fontSize:12, fontFamily:"inherit", outline:"none" }}>
            {PROC_SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <Input label="Brand *" value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} />
        <Input label="Model *" value={form.model} onChange={e=>setForm(f=>({...f,model:e.target.value}))} />
        <Input label="Variant" value={form.variant} onChange={e=>setForm(f=>({...f,variant:e.target.value}))} />
        <Input label="Year" type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))} />
        <Input label="KM Driven" type="number" value={form.km} onChange={e=>setForm(f=>({...f,km:e.target.value}))} />
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:C.ink2, marginBottom:5 }}>Fuel Type</div>
          <select value={form.fuelType} onChange={e=>setForm(f=>({...f,fuelType:e.target.value}))}
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 10px", fontSize:12, fontFamily:"inherit", outline:"none" }}>
            {FUEL_TYPES.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <Input label="Colour" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} />
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:C.ink2, marginBottom:5 }}>Seller's Self-Rated Condition</div>
          <select value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 10px", fontSize:12, fontFamily:"inherit", outline:"none" }}>
            {RATING_OPTIONS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Input label="Asking Price (₹)" type="number" value={form.askingPrice} onChange={e=>setForm(f=>({...f,askingPrice:e.target.value}))} />
      </div>
      {err && <div style={{ fontSize:12, color:C.red, marginTop:10, background:"#FEE2E2", padding:"8px 12px", borderRadius:8 }}>⚠ {err}</div>}
      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit} loading={saving}>Add Seller Inquiry</Btn>
      </div>
    </Modal>
  )
}

function ProcurementSection({ dealership, reps=[] }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(null)
  const [filterStatus, setFilterStatus] = useState("")
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch(`/api/dealer/procurement?dealership=${dealership}`).then(r=>r.json())
      if (data.success) setRows(data.procurement || [])
    } finally { setLoading(false) }
  }, [dealership])

  useEffect(() => { load() }, [load])

  const patch = async (row, updates) => {
    setActing(row.id)
    try {
      const res = await authFetch("/api/dealer/procurement", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:row.id, ...updates }) })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Update failed"); return }
      load()
    } finally { setActing(null) }
  }

  const markPurchased = (row) => {
    if (!row.offeredPrice && !row.finalPrice) { alert("Enter an offered/final price before marking as purchased"); return }
    if (!confirm(`Mark as purchased and add "${row.brand} ${row.model}" to your Inventory as a used vehicle?`)) return
    patch(row, { status:"PURCHASED", finalPrice: row.finalPrice || row.offeredPrice })
  }

  const displayed = filterStatus ? rows.filter(r => r.status === filterStatus) : rows

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:10, flexWrap:"wrap" }}>
        <div style={{ fontSize:13, color:C.ink2 }}>Vehicles sellers are offering to sell you — buy pipeline, feeds straight into Inventory once purchased</div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, color:filterStatus?C.ink:C.ink2, borderRadius:20, padding:"8px 14px", fontSize:11, fontWeight:600, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
            <option value="">All Status</option>
            {PROC_STATUSES.map(s=><option key={s} value={s}>{PROC_STATUS_LABELS[s]}</option>)}
          </select>
          <Btn onClick={()=>setShowAdd(true)}>+ New Seller Inquiry</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:"center", color:C.ink3 }}>Loading procurement pipeline…</div>
      ) : displayed.length === 0 ? (
        <Card style={{ padding:60, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔑</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>No seller inquiries yet</div>
          <div style={{ fontSize:12, color:C.ink3, marginTop:6, marginBottom:20 }}>
            Log every seller who walks in or calls wanting to sell you their car — track inspection, your offer, and convert straight to inventory once purchased.
          </div>
          <Btn onClick={()=>setShowAdd(true)}>+ New Seller Inquiry</Btn>
        </Card>
      ) : (
        <Card noPad>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr style={{ background:C.bg }}>
              {["Seller","Vehicle","Asking","Offered","Status","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.ink2, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {displayed.map(row => {
                const canPurchase = !["PURCHASED","REJECTED"].includes(row.status)
                const canReject   = !["PURCHASED","REJECTED"].includes(row.status)
                return (
                  <tr key={row.id} style={{ borderTop:`1px solid ${C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 16px" }}>
                      <div style={{ fontWeight:700, color:C.ink }}>{row.sellerName}</div>
                      <div style={{ fontSize:10, color:C.ink3 }}>{row.sellerPhone} · {row.source}</div>
                    </td>
                    <td style={{ padding:"10px 16px", color:C.ink2 }}>
                      {row.brand} {row.model} {row.variant}
                      <div style={{ fontSize:10, color:C.ink3 }}>{row.year || "—"} · {row.km ? `${row.km.toLocaleString()} km` : "—"} · {row.fuelType} · {row.condition}</div>
                      {row.convertedToInventoryId && <div style={{ fontSize:9, color:C.green, fontWeight:700, marginTop:2 }}>✓ In Inventory</div>}
                    </td>
                    <td style={{ padding:"10px 16px", color:C.ink2 }}>{row.askingPrice ? `₹${row.askingPrice.toLocaleString()}` : "—"}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <input type="number" defaultValue={row.offeredPrice || ""} placeholder="₹ offer"
                        onBlur={e => e.target.value && Number(e.target.value) !== row.offeredPrice && patch(row, { offeredPrice: e.target.value, status: row.status === "NEW" ? "OFFER_MADE" : row.status })}
                        style={{ width:100, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 6px", fontSize:10, color:C.ink, fontFamily:"inherit", outline:"none" }} />
                    </td>
                    <td style={{ padding:"10px 16px" }}>
                      <select value={row.status} onChange={e=>patch(row, { status:e.target.value })} disabled={acting===row.id}
                        style={{ background:`${PROC_STATUS_COLORS[row.status]||C.ink3}15`, color:PROC_STATUS_COLORS[row.status]||C.ink3, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 8px", fontSize:10, fontWeight:700, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                        {PROC_STATUSES.map(s=><option key={s} value={s}>{PROC_STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:"10px 16px" }}>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {canPurchase && (
                          <button onClick={()=>markPurchased(row)} disabled={acting===row.id}
                            style={{ background:`${C.green}15`, border:`1px solid ${C.green}25`, color:C.green, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            {acting===row.id ? "…" : "✓ Purchased"}
                          </button>
                        )}
                        {canReject && (
                          <button onClick={()=>patch(row, { status:"REJECTED" })} disabled={acting===row.id}
                            style={{ background:`${C.red}15`, border:`1px solid ${C.red}25`, color:C.red, borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            ✕ Reject
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

      {showAdd && <AddProcurementModal onClose={()=>setShowAdd(false)} onAdded={load} />}
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
  const [newRep,   setNewRep]   = useState({ name:"", phone:"", email:"", password:"" })
  const [repErr,   setRepErr]   = useState("")
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
    setRepErr("")
    if (!newRep.name.trim()) { setRepErr("Rep name is required"); return }
    // Login is optional — a dealer can add a rep as an assignment name only.
    // But if they start giving login details, require the full pair.
    const wantsLogin = newRep.email.trim() || newRep.password
    if (wantsLogin) {
      if (!newRep.email.trim() || !newRep.password) { setRepErr("For a login, enter both an email and a starting password (or leave both blank to add the rep without a login)"); return }
      if (newRep.password.length < 6) { setRepErr("Password must be at least 6 characters"); return }
    }
    setAddingRep(true)
    try {
      const res = await authFetch("/api/dealer/reps", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ dealership, ...newRep }) })
      const data = await res.json()
      if (!res.ok) { setRepErr(data.error || "Could not create rep"); return }
      setNewRep({ name:"", phone:"", email:"", password:"" })
      onRepsRefresh?.()
    } finally { setAddingRep(false) }
  }

  // Deactivate/reactivate controls the rep's LOGIN (revokes access instantly
  // when someone leaves) while keeping their historical lead data intact.
  const toggleRepActive = async (rep) => {
    await authFetch("/api/dealer/reps", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:rep.id, action: rep.active===false ? "reactivate" : "deactivate" }) })
    onRepsRefresh?.()
  }

  const resetRepPassword = async (rep) => {
    const password = window.prompt(`Set a new password for ${rep.name} (min 6 chars):`)
    if (!password) return
    if (password.length < 6) { alert("Password must be at least 6 characters"); return }
    const res = await authFetch("/api/dealer/reps", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:rep.id, action:"reset_password", password }) })
    if (res.ok) alert(`Password updated for ${rep.name}. Share it with them securely.`)
    else alert((await res.json()).error || "Could not reset password")
  }

  // Leave coverage — coverRep temporarily gains follow-up access to
  // absentRep's leads without taking ownership. Toggle from the dealer side.
  const toggleCoverage = async (coverRep, absentRepId) => {
    const isActive = (coverRep.covers || []).includes(absentRepId)
    await authFetch("/api/dealer/reps", { method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ id:coverRep.id, action: isActive ? "revoke_coverage" : "grant_coverage", coversRepId: absentRepId }) })
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

      {/* 10.1b Domains & Storefronts */}
      <DomainsStorefrontCard dealership={dealership} dealerSubdomain={dealer?.dealerSubdomain} customDomain={dealer?.customDomain} dealerCategory={dealer?.dealerCategory} sellCarEnabled={dealer?.sellCarEnabled} />

      {/* 10.2 Team Management — rep logins (dealer-controlled provisioning) */}
      <Card>
        <SectionHeading>👥 Team Management</SectionHeading>
        <div style={{ fontSize:10.5, color:C.ink3, marginBottom:12, lineHeight:1.5 }}>
          Give each rep their own login. They sign in on their phone and see <b>only the leads you assign to them</b> — never your billing, settings, or other reps' pipelines. Deactivate to revoke access instantly. When a rep is on leave, use <b>Cover</b> to let a teammate follow up their leads without changing ownership.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14, maxHeight:260, overflowY:"auto" }}>
          {reps.length === 0 ? <div style={{ fontSize:11, color:C.ink3 }}>No reps added yet</div> : reps.map(r => {
            const repName = (id) => reps.find(x=>x.id===id)?.name || "rep"
            return (
            <div key={r.id} style={{ opacity:r.active===false?0.55:1, borderBottom:`1px solid ${C.border}`, paddingBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Avatar name={r.name} size={28} color={r.color} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>
                    {r.name}
                    {r.hasLogin
                      ? <span style={{ fontSize:8.5, fontWeight:800, color:r.active===false?"#B91C1C":"#065F46", background:r.active===false?"#FEE2E2":"#D1FAE5", borderRadius:5, padding:"1px 6px", marginLeft:6 }}>{r.active===false?"LOGIN DISABLED":"CAN LOG IN"}</span>
                      : <span style={{ fontSize:8.5, fontWeight:800, color:C.ink3, background:C.bg, borderRadius:5, padding:"1px 6px", marginLeft:6 }}>NO LOGIN</span>}
                  </div>
                  <div style={{ fontSize:9, color:C.ink3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.email || r.phone || "—"} · {r.leads||0} leads · {r.closed||0} closed</div>
                </div>
                {r.hasLogin && (
                  <>
                    <button onClick={()=>resetRepPassword(r)} title="Reset password" style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:6, padding:"3px 8px", fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🔑</button>
                    <button onClick={()=>toggleRepActive(r)} style={{ background:"none", border:`1px solid ${r.active===false?C.green:C.border}`, color:r.active===false?C.green:C.ink3, borderRadius:6, padding:"3px 8px", fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      {r.active===false ? "Reactivate" : "Deactivate"}
                    </button>
                  </>
                )}
              </div>

              {/* Leave coverage — this rep covers other reps' leads while they're out */}
              {r.hasLogin && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, paddingLeft:36, flexWrap:"wrap" }}>
                  <span style={{ fontSize:9, color:C.ink3, fontWeight:700 }}>Covers:</span>
                  {(r.covers||[]).length === 0 && <span style={{ fontSize:9, color:C.ink3 }}>nobody</span>}
                  {(r.covers||[]).map(cid => (
                    <span key={cid} style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#EDE9FE", color:"#6D28D9", fontSize:9, fontWeight:700, borderRadius:6, padding:"2px 6px" }}>
                      {repName(cid)}
                      <button onClick={()=>toggleCoverage(r, cid)} title="Stop covering" style={{ background:"none", border:"none", color:"#6D28D9", cursor:"pointer", fontSize:10, lineHeight:1, padding:0 }}>✕</button>
                    </span>
                  ))}
                  <select value="" onChange={e=>{ if(e.target.value) toggleCoverage(r, e.target.value) }}
                    style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink3, borderRadius:6, padding:"2px 6px", fontSize:9, fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
                    <option value="">+ cover for…</option>
                    {reps.filter(o => o.id !== r.id && !(r.covers||[]).includes(o.id)).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )})}
        </div>
        {repErr && <div style={{ fontSize:10, color:"#B91C1C", background:"#FEE2E2", borderRadius:7, padding:"6px 10px", marginBottom:8 }}>{repErr}</div>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
          <input value={newRep.name} onChange={e=>setNewRep(r=>({...r,name:e.target.value}))} placeholder="Rep name"
            style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
          <input value={newRep.phone} onChange={e=>setNewRep(r=>({...r,phone:e.target.value}))} placeholder="Phone"
            style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
          <input value={newRep.email} onChange={e=>setNewRep(r=>({...r,email:e.target.value}))} placeholder="Login email (optional)" type="email"
            style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
          <input value={newRep.password} onChange={e=>setNewRep(r=>({...r,password:e.target.value}))} placeholder="Starting password (optional)" type="text"
            style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
        </div>
        <div style={{ fontSize:9.5, color:C.ink3, marginBottom:6 }}>Add email + password to give the rep a login. Leave blank to add them as an assignment name only.</div>
        <button onClick={addRep} disabled={addingRep} style={{ width:"100%", background:C.green, border:"none", color:"#fff", borderRadius:8, padding:"9px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          {addingRep ? "Adding…" : (newRep.email.trim() || newRep.password ? "+ Add Rep & Create Login" : "+ Add Rep")}
        </button>
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

      {/* 10.5b Marketplace paid-lead auto-assignment */}
      <Card>
        <SectionHeading>🌐 Marketplace Lead Assignment</SectionHeading>
        <div style={{ fontSize:11, color:C.ink3, marginBottom:10 }}>
          When a customer pays the token online, decide who the hot lead lands with. Only reps with an active login are eligible.
        </div>
        <select value={settings.marketplaceAutoAssign || "round_robin"} onChange={e=>save({ marketplaceAutoAssign: e.target.value })}
          style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:12, fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
          <option value="round_robin">Round Robin — rotate evenly across reps (recommended)</option>
          <option value="specific">Specific Rep — always send to one rep</option>
          <option value="off">Off — I'll assign each one myself</option>
        </select>
        {(settings.marketplaceAutoAssign === "specific") && (
          <select value={settings.marketplaceRepId || ""} onChange={e=>save({ marketplaceRepId: e.target.value })}
            style={{ width:"100%", marginTop:8, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:12, fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
            <option value="">Select a rep…</option>
            {(reps||[]).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
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
   BUILDPRICE SECTION — EV Pricing Calculator
───────────────────────────────────────────── */
function BuildPriceSection({ user, prefill, quotes = [], onBuildQuote }) {
  const [pid, setPid] = useState(BP_VEHICLES[0].id)
  const [discounts, setDiscounts] = useState([])
  const [addingDiscount, setAddingDiscount] = useState(false)
  const [newDisc, setNewDisc] = useState({ name:"", amount:"" })

  const [addons, setAddons] = useState([])
  const [addingAddon, setAddingAddon] = useState(false)
  const [newAddon, setNewAddon] = useState({ name:"", price:"" })

  const matchedVehicle = useMemo(() => {
    if (!prefill || !prefill.vehicle) return BP_VEHICLES[0]
    const vName = prefill.vehicle.toLowerCase()
    const found = BP_VEHICLES.find(x => vName.includes(x.model.toLowerCase()) || vName.includes(x.brand.toLowerCase()))
    return found || BP_VEHICLES[0]
  }, [prefill])

  useEffect(() => {
    if (prefill) {
      setPid(matchedVehicle.id)
    }
  }, [prefill, matchedVehicle])

  const isRep = user?.role === "rep"
  const hasAcceptedQuote = useMemo(() => {
    if (!prefill) return false
    return quotes.some(q => q.leadId === prefill.id && (q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded"))
  }, [prefill, quotes])
  const isLockedForRep = isRep && hasAcceptedQuote

  function addAddon() {
    const prc = parseInt(newAddon.price)
    if (!newAddon.name.trim()) return
    const addonPrice = isNaN(prc) || prc < 0 ? 0 : prc
    setAddons(a => [...a, { id: Date.now(), name: newAddon.name.trim(), price: addonPrice }])
    setNewAddon({ name: "", price: "" })
    setAddingAddon(false)
  }

  function removeAddon(id) {
    setAddons(a => a.filter(x => x.id !== id))
  }

  const p   = BP_VEHICLES.find(x => x.id === pid) || BP_VEHICLES[0]
  const totalDiscounts = discounts.reduce((s, d) => s + d.amount, 0)
  const totalAddons    = addons.reduce((s, a) => s + a.price, 0)
  const net = Math.max(0, p.exShowroom - totalDiscounts + totalAddons)
  const emi36 = fmt.emi(net, 36)
  const emi48 = fmt.emi(net, 48)
  const emi60 = fmt.emi(net, 60)
  const petrolMonthly = Math.round((p.range / 15) * 105)
  const evMonthly     = Math.round(p.range * 2.5)
  const saving        = petrolMonthly - evMonthly

  function addDiscount() {
    const amt = parseInt(newDisc.amount)
    if (!newDisc.name.trim() || isNaN(amt) || amt <= 0) return
    setDiscounts(d => [...d, { id: Date.now(), name: newDisc.name.trim(), amount: amt }])
    setNewDisc({ name:"", amount:"" })
    setAddingDiscount(false)
  }

  function removeDiscount(id) {
    setDiscounts(d => d.filter(x => x.id !== id))
  }

  return (
    <div>
      {prefill && (
        <div style={{ background:`${C.blue}0A`, border:`1px solid ${C.blue}25`, borderRadius:14, padding:18, marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.blue, letterSpacing:"0.5px" }}>PREPARING QUOTE FOR CUSTOMER</div>
          <div style={{ fontSize:15, fontWeight:800, color:C.ink, marginTop:4 }}>{prefill.name} ({prefill.phone})</div>
          <div style={{ fontSize:12, color:C.ink3, marginTop:2 }}>Vehicle Interest: {prefill.vehicle || "General"}</div>
          {hasAcceptedQuote && (
            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", color:"#92400E", padding:"10px 14px", borderRadius:10, fontSize:12, fontWeight:700, marginTop:10, lineHeight:1.5 }}>
              ⚠️ Customer has already accepted a quote. Pricing is locked and can only be modified/revoked by the Dealer.
            </div>
          )}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: (typeof window !== "undefined" && window.innerWidth < 768) ? "1fr" : "1fr 1fr", gap:20 }}>
        {/* Left — Inputs */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:C.card, borderRadius:14, padding:18, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.4px", marginBottom:10 }}>SELECT VEHICLE</div>
            {BP_VEHICLES.map(pr => (
              <button key={pr.id} onClick={() => !isLockedForRep && setPid(pr.id)} disabled={isLockedForRep} style={{
                width:"100%", background:pid===pr.id?"#ecfdf5":C.bg,
                border:`1.5px solid ${pid===pr.id?C.green:C.border}`,
                color:pid===pr.id?C.green:C.ink2, borderRadius:10,
                padding:"10px 14px", fontSize:12, fontWeight:pid===pr.id?700:400,
                cursor:isLockedForRep?"not-allowed":"pointer", textAlign:"left", marginBottom:6,
                display:"flex", justifyContent:"space-between", alignItems:"center",
                fontFamily:"inherit", transition:"all 0.15s", opacity:isLockedForRep && pid!==pr.id?0.6:1
              }}>
                <span>{pr.brand} {pr.model} <span style={{ fontSize:10, color:C.ink3, fontWeight:400 }}>({pr.type})</span></span>
                <span style={{ fontSize:12, fontWeight:800, color:pid===pr.id?C.green:C.ink3 }}>{fmt.currency(pr.exShowroom)}</span>
              </button>
            ))}
          </div>

          {/* EV vs Petrol Savings */}
          <div style={{ background:C.card, borderRadius:14, padding:18, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.4px", marginBottom:12 }}>EV vs PETROL — MONTHLY SAVINGS</div>
            <div style={{ display:"flex", gap:0 }}>
              {[
                { v:`₹${saving.toLocaleString("en-IN")}`, l:"Saved/month", c:C.green },
                { v:`${p.range}km`, l:"Real range", c:C.blue },
                { v:`₹${evMonthly.toLocaleString("en-IN")}`, l:"Charging/month", c:C.teal||"#0D9488" },
              ].map((s,i) => (
                <div key={i} style={{ flex:1, textAlign:"center", paddingLeft:i>0?16:0, borderLeft:i>0?`1px solid ${C.border}`:"none" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10, color:C.ink3, marginTop:3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, background:"#ecfdf5", borderRadius:9, padding:"9px 12px", fontSize:11, color:C.green, lineHeight:1.6, border:`1px solid ${C.green}20` }}>
              💡 vs petrol: Save ₹{saving.toLocaleString("en-IN")}/month = <strong>₹{(saving*12).toLocaleString("en-IN")}/year</strong>
            </div>
          </div>
        </div>

        {/* Right — Results */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:C.card, borderRadius:14, padding:18, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.4px", marginBottom:12 }}>PRICE BREAKDOWN</div>

            {/* Ex-Showroom — always shown */}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.ink3 }}>Ex-Showroom Price</span>
              <span style={{ fontSize:12, fontWeight:700, color:C.ink }}>{fmt.currency(p.exShowroom)}</span>
            </div>

            {/* Dealer-added discounts / subsidies */}
            {discounts.map(d => (
              <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
                  <span style={{ fontSize:12, color:C.green }}>✓ {d.name}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.green }}>−{fmt.currency(d.amount)}</span>
                  <button onClick={() => removeDiscount(d.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:14, fontWeight:700, padding:0, lineHeight:1 }}>✕</button>
                </div>
              </div>
            ))}

            {/* Add discount / subsidy form */}
            {!isLockedForRep && (
              addingDiscount ? (
                <div style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                  <input value={newDisc.name} onChange={e => setNewDisc(d => ({...d, name:e.target.value}))}
                    placeholder="e.g. FAME-II Subsidy, State Incentive, Dealer Offer..."
                    style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:12, color:C.ink, fontFamily:"inherit", outline:"none", marginBottom:6, boxSizing:"border-box" }} />
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:12, color:C.green, fontWeight:700, flexShrink:0 }}>−₹</span>
                    <input type="number" value={newDisc.amount} onChange={e => setNewDisc(d => ({...d, amount:e.target.value}))}
                      placeholder="Amount" min={0}
                      style={{ flex:1, background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:12, color:C.ink, fontFamily:"inherit", outline:"none", fontVariantNumeric:"tabular-nums" }} />
                    <button onClick={addDiscount} style={{ background:C.green, color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>Add</button>
                    <button onClick={() => { setAddingDiscount(false); setNewDisc({name:"",amount:""}) }} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:11, color:C.ink3, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingDiscount(true)} style={{
                  width:"100%", background:"none", border:`1.5px dashed ${C.green}60`, borderRadius:8,
                  padding:"10px", fontSize:12, fontWeight:600, color:C.green, cursor:"pointer",
                  fontFamily:"inherit", marginTop:8, marginBottom:4, transition:"all 0.15s"
                }}>
                  + Add Discount / Subsidy / Scheme
                </button>
              )
            )}

            {/* Addons list */}
            {addons.map(a => (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, color:C.blue }}>+ {a.name}</span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.blue }}>{a.price > 0 ? `+${fmt.currency(a.price)}` : "FREE"}</span>
                  {!isLockedForRep && (
                    <button onClick={() => removeAddon(a.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:14, fontWeight:700, padding:0, lineHeight:1 }}>✕</button>
                  )}
                </div>
              </div>
            ))}

            {/* Add addon form */}
            {!isLockedForRep && (
              addingAddon ? (
                <div style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                  <input value={newAddon.name} onChange={e => setNewAddon(a => ({...a, name:e.target.value}))}
                    placeholder="e.g. Extended 5yr Warranty, Free Charger, Helmet..."
                    style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:12, color:C.ink, fontFamily:"inherit", outline:"none", marginBottom:6, boxSizing:"border-box" }} />
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:12, color:C.blue, fontWeight:700, flexShrink:0 }}>+₹</span>
                    <input type="number" value={newAddon.price} onChange={e => setNewAddon(a => ({...a, price:e.target.value}))}
                      placeholder="Price (leave blank or 0 for free)" min={0}
                      style={{ flex:1, background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:12, color:C.ink, fontFamily:"inherit", outline:"none", fontVariantNumeric:"tabular-nums" }} />
                    <button onClick={addAddon} style={{ background:C.blue, color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>Add</button>
                    <button onClick={() => { setAddingAddon(false); setNewAddon({name:"",price:""}) }} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:11, color:C.ink3, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingAddon(true)} style={{
                  width:"100%", background:"none", border:`1.5px dashed ${C.blue}60`, borderRadius:8,
                  padding:"10px", fontSize:12, fontWeight:600, color:C.blue, cursor:"pointer",
                  fontFamily:"inherit", marginTop:8, marginBottom:4, transition:"all 0.15s"
                }}>
                  + Add Extra / Add-on (Paid or Free)
                </button>
              )
            )}

            {/* Net price */}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"14px 0 4px" }}>
              <span style={{ fontSize:14, fontWeight:800, color:C.ink }}>Net Price (Customer Pays)</span>
              <span style={{ fontSize:22, fontWeight:900, color:C.green }}>{fmt.currency(net)}</span>
            </div>
            {totalDiscounts > 0 && (
              <div style={{ fontSize:11, color:C.green, textAlign:"right", fontWeight:600 }}>
                Total savings: {fmt.currency(totalDiscounts)}
              </div>
            )}
          </div>

          <div style={{ background:`linear-gradient(135deg, #ecfdf5, ${C.card})`, borderRadius:14, padding:18, border:`1px solid ${C.green}30` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.4px", marginBottom:12 }}>EMI OPTIONS (8.5% p.a.)</div>
            {[{m:36,v:emi36},{m:48,v:emi48},{m:60,v:emi60}].map((e,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:12, color:C.ink3 }}>{e.m} months ({Math.round(e.m/12)} yrs)</span>
                <span style={{ fontSize:15, fontWeight:800, color:C.green }}>₹{e.v.toLocaleString("en-IN")}/mo</span>
              </div>
            ))}
          </div>

          {/* Vehicle specs */}
          <div style={{ background:C.card, borderRadius:14, padding:18, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.4px", marginBottom:12 }}>VEHICLE SPECS</div>
            {[
              { l:"Range", v:`${p.range} km` },
              { l:"Top Speed", v:`${p.topSpeed} km/h` },
              { l:"Charge Time", v:`${p.chargeTime} min` },
              { l:"Type", v:p.type },
            ].map((s,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:i<3?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:11, color:C.ink3 }}>{s.l}</span>
                <span style={{ fontSize:11, fontWeight:600, color:C.ink2 }}>{s.v}</span>
              </div>
            ))}
          </div>

          <button onClick={() => onBuildQuote({
            vehicleName: `${p.brand} ${p.model}`,
            exShowroom: p.exShowroom,
            discounts: discounts,
            totalDiscounts: totalDiscounts,
            accessories: totalAddons,
            lead: prefill,
            offer: [
              ...discounts.map(d => `${d.name}: −₹${d.amount.toLocaleString("en-IN")}`),
              ...addons.map(a => `${a.name}: ${a.price > 0 ? "+₹" + a.price.toLocaleString("en-IN") : "FREE"}`)
            ].join("\n")
          })} 
          disabled={isLockedForRep}
          style={{
            width:"100%", background:isLockedForRep ? C.ink3 : C.green, color:"#fff", border:"none", borderRadius:12,
            padding:"14px 20px", fontSize:14, fontWeight:800, cursor:isLockedForRep ? "not-allowed" : "pointer", fontFamily:"inherit",
            boxShadow:isLockedForRep ? "none" : `0 4px 14px ${C.green}40`, transition:"all 0.15s"
          }}>
            📋 Build Quote with this Price →
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SERVICE SECTION — customer-raised requests
   Created→Responded SLA tracking + OEM escalation
───────────────────────────────────────────── */
const SVC_STATUS = {
  OPEN:          { label:"OPEN — awaiting response", color:"#F97316", bg:"#FFEDD5" },
  IN_PROGRESS:   { label:"IN PROGRESS",              color:"#3B82F6", bg:"#DBEAFE" },
  RESOLVED:      { label:"RESOLVED",                 color:"#059669", bg:"#D1FAE5" },
  ESCALATED_OEM: { label:"ESCALATED TO OEM",         color:"#8B5CF6", bg:"#EDE9FE" },
}

function fmtDur(ms) {
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

function ServiceSection({ dealership }) {
  const isMobile = useIsMobile()
  const [requests, setRequests] = useState([])
  const [settings, setSettings] = useState({ autoEscalateOEM: false })
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await authFetch(`/api/dealer/service?dealership=${dealership}`)
      const d = await r.json()
      if (d.requests) setRequests(d.requests)
      if (d.settings) setSettings(d.settings)
    } catch {}
    setLoading(false)
  }, [dealership])

  useEffect(() => { load() }, [load])

  const act = async (id, action, withNote=false) => {
    let note = ""
    if (withNote) {
      note = window.prompt(action === "escalate" ? "Note for the OEM (issue summary, parts needed…):" : "Add a note (optional):") || ""
      if (note === "" && action === "escalate" && !window.confirm("Escalate without a note?")) return
    }
    setActing(id)
    try {
      const r = await authFetch("/api/dealer/service", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, action, note }) })
      const d = await r.json()
      if (d.request) setRequests(reqs => reqs.map(x => x.id === id ? d.request : x))
    } finally { setActing(null) }
  }

  const toggleAuto = async () => {
    const enabled = !settings.autoEscalateOEM
    setSettings({ autoEscalateOEM: enabled })
    await authFetch("/api/dealer/service", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"toggle_auto_escalate", enabled }) })
    load()
  }

  const open = requests.filter(r => r.status === "OPEN").length

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:C.ink }}>Service Requests {open > 0 && <span style={{ background:"#F97316", color:"#fff", fontSize:11, fontWeight:800, borderRadius:10, padding:"2px 10px", marginLeft:8, verticalAlign:"middle" }}>{open} open</span>}</div>
          <div style={{ fontSize:12, color:C.ink3, marginTop:3 }}>Raised by customers from MyGarage. Respond fast — response time is tracked on every request.</div>
        </div>
        <label style={{ display:"flex", alignItems:"center", gap:8, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 14px", cursor:"pointer", flexShrink:0 }}>
          <input type="checkbox" checked={settings.autoEscalateOEM} onChange={toggleAuto} />
          <span style={{ fontSize:11, fontWeight:700, color:C.ink2 }}>Auto-escalate to OEM if no response in 48h</span>
        </label>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:"center", color:C.ink3, fontSize:12 }}>Loading service requests…</div>
      ) : requests.length === 0 ? (
        <div style={{ padding:48, textAlign:"center", background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🔧</div>
          <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>No service requests yet</div>
          <div style={{ fontSize:12, color:C.ink3, marginTop:6 }}>Customers raise requests from the MyGarage portal (/mygarage)</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {requests.map(r => {
            const sm = SVC_STATUS[r.status] || SVC_STATUS.OPEN
            const responded = !!r.respondedAt
            const waitMs = (responded ? new Date(r.respondedAt) : new Date()) - new Date(r.createdAt)
            const overdue = !responded && waitMs > 24*60*60*1000
            return (
              <div key={r.id} style={{ background:C.card, border:`1px solid ${r.status==="OPEN" ? sm.color+"50" : C.border}`, borderRadius:14, padding:16 }}>
                {/* Header row */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <Avatar name={r.customerName} size={34} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:C.ink }}>{r.customerName} <span style={{ fontWeight:400, color:C.ink3, fontSize:11 }}>· {r.customerPhone}</span></div>
                      <div style={{ fontSize:11, color:C.ink3 }}>{r.issueType} · {r.vehicle}</div>
                    </div>
                  </div>
                  <span style={{ background:sm.bg, color:sm.color, fontSize:10, fontWeight:800, borderRadius:8, padding:"5px 12px", whiteSpace:"nowrap" }}>{sm.label}</span>
                </div>

                {/* SLA line */}
                <div style={{ display:"flex", gap:14, flexWrap:"wrap", background:C.bg, borderRadius:10, padding:"8px 12px", marginBottom:10 }}>
                  <span style={{ fontSize:11, color:C.ink3 }}>Raised: <b style={{ color:C.ink2 }}>{new Date(r.createdAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</b></span>
                  {responded ? (
                    <span style={{ fontSize:11, color:C.green, fontWeight:700 }}>✓ Responded in {fmtDur(waitMs)}</span>
                  ) : (
                    <span style={{ fontSize:11, color:overdue ? C.red : "#F97316", fontWeight:700 }}>⏱ Waiting {fmtDur(waitMs)}{overdue ? " — overdue!" : ""}</span>
                  )}
                  {r.resolvedAt && <span style={{ fontSize:11, color:C.green }}>Resolved {new Date(r.resolvedAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}
                  {r.escalatedAt && <span style={{ fontSize:11, color:"#8B5CF6", fontWeight:700 }}>↗ OEM {r.escalatedBy === "auto" ? "(auto, 48h breach)" : ""} {new Date(r.escalatedAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}
                </div>

                {/* Issue + order details */}
                <div style={{ fontSize:12, color:C.ink2, lineHeight:1.6, marginBottom:10 }}>{r.description}</div>
                {r.orderDetails && (
                  <div style={{ fontSize:11, color:C.ink3, marginBottom:10 }}>
                    📦 Order: {r.orderDetails.vehicleName} · {r.orderDetails.dealerName} · booked {new Date(r.orderDetails.bookedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}{r.orderDetails.tokenAmount ? ` · token ₹${r.orderDetails.tokenAmount.toLocaleString("en-IN")}` : ""}
                  </div>
                )}

                {/* Attachments */}
                {(r.attachments||[]).length > 0 && (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                    {r.attachments.map((a, i) => a.type?.startsWith("image") ? (
                      <img key={i} src={a.data} alt={a.name} onClick={()=>{ const w = window.open(); w.document.write(`<img src="${a.data}" style="max-width:100%"/>`) }}
                        style={{ width:70, height:70, objectFit:"cover", borderRadius:10, border:`1px solid ${C.border}`, cursor:"pointer" }} />
                    ) : (
                      <video key={i} src={a.data} controls style={{ width:140, height:70, borderRadius:10, border:`1px solid ${C.border}`, background:"#000" }} />
                    ))}
                  </div>
                )}

                {/* Actions */}
                {(r.status === "OPEN" || r.status === "IN_PROGRESS") && (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {r.status === "OPEN" && (
                      <button onClick={()=>act(r.id, "respond", true)} disabled={acting===r.id}
                        style={{ background:C.blue, color:"#fff", border:"none", borderRadius:9, padding: isMobile?"11px 16px":"8px 16px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>✋ Respond</button>
                    )}
                    <button onClick={()=>act(r.id, "resolve", true)} disabled={acting===r.id}
                      style={{ background:C.green, color:"#fff", border:"none", borderRadius:9, padding: isMobile?"11px 16px":"8px 16px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>✓ Mark Resolved</button>
                    <button onClick={()=>act(r.id, "escalate", true)} disabled={acting===r.id}
                      style={{ background:"#8B5CF6", color:"#fff", border:"none", borderRadius:9, padding: isMobile?"11px 16px":"8px 16px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>↗ Escalate to OEM</button>
                    <a href={`tel:+91${(r.customerPhone||"").replace(/\D/g,"").slice(-10)}`}
                      style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink2, borderRadius:9, padding: isMobile?"11px 16px":"8px 16px", fontSize:11, fontWeight:700, textDecoration:"none" }}>📞 Call Customer</a>
                  </div>
                )}

                {/* Timeline */}
                <details style={{ marginTop:10 }}>
                  <summary style={{ fontSize:10.5, color:C.ink3, cursor:"pointer", fontWeight:600 }}>Full timeline ({(r.timeline||[]).length})</summary>
                  <div style={{ marginTop:8, paddingLeft:8, borderLeft:`2px solid ${C.border}` }}>
                    {(r.timeline||[]).map((t, i) => (
                      <div key={i} style={{ fontSize:11, color:C.ink3, marginBottom:5 }}>
                        <b style={{ color:C.ink2 }}>{new Date(t.at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</b> — {t.event}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   QUOTEPRO SECTION — Reference Bill Generator
───────────────────────────────────────────── */
function QuoteSection({ dealership, dealer, prefill }) {
  const isMobile = useIsMobile()
  const [subTab,        setSubTab]        = useState("builder") // builder | analytics
  const [leads,         setLeads]         = useState([])
  const [quotes,        setQuotes]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [selectedLead,  setSelectedLead]  = useState(null)
  const [receipt,       setReceipt]       = useState(null)
  const [lastSaved,     setLastSaved]     = useState(null)   // {id, quoteId, customerName}
  const [editingQuoteId, setEditingQuoteId] = useState(null)

  const [form, setForm] = useState({
    customerName:"", customerPhone:"", vehicleName:"",
    exShowroom:0, dealerDiscount:0,
    registration:0, accessories:0, offer:"", validityDays:7,
  })

  const isRep = dealer?.role === "rep"

  const hasAcceptedQuote = useMemo(() => {
    if (editingQuoteId) {
      const q = quotes.find(x => x.id === editingQuoteId)
      return q && (q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded")
    }
    if (!selectedLead) return false
    return quotes.some(q => q.leadId === selectedLead.id && (q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded"))
  }, [selectedLead, editingQuoteId, quotes])

  const isLockedForRep = isRep && hasAcceptedQuote

  const netPrice = Math.max(0,
    form.exShowroom - form.dealerDiscount
    + form.registration + form.accessories
  )
  const emi36 = netPrice > 0
    ? Math.round((netPrice * 0.085 / 12) / (1 - Math.pow(1 + 0.085/12, -36)))
    : 0

  const addonsCount = [form.exShowroom, form.dealerDiscount, form.registration, form.accessories].filter(x => x > 0).length
  const offerLength = (form.offer || "").trim().length
  const isQuoteTooLong = addonsCount >= 4 || offerLength > 150

  const stats = useMemo(() => {
    const total = quotes.length
    if (total === 0) return { total:0, opened:0, openRate:0, rejs:{}, dropoffs:{} }

    const opened = quotes.filter(q => (q.openedCount || 0) > 0).length
    const openRate = Math.round((opened / total) * 100)

    const rejs = {}
    quotes.forEach(q => {
      if (q.customerResponse === "not_agreed" && q.rejectionReasons) {
        q.rejectionReasons.forEach(r => {
          rejs[r] = (rejs[r] || 0) + 1
        })
      }
    })

    const dropoffs = {}
    quotes.forEach(q => {
      if (q.dropOffSection) {
        dropoffs[q.dropOffSection] = (dropoffs[q.dropOffSection] || 0) + 1
      }
    })

    return { total, opened, openRate, rejs, dropoffs }
  }, [quotes])

  function handleRevise(q) {
    setEditingQuoteId(q.id)
    setForm({
      customerName: q.customerName || "",
      customerPhone: q.customerPhone || "",
      vehicleName: q.vehicleName || "",
      exShowroom: q.exShowroom || 0,
      dealerDiscount: q.dealerDiscount || 0,
      registration: q.registration || 0,
      accessories: q.accessories || 0,
      offer: q.offer || "",
      validityDays: q.validityDays || 7
    })
    setReceipt(q.receipt || null)
  }

  async function handleRevoke(id) {
    if (!confirm("Are you sure you want to revoke customer approval for this quote? This will unlock it for edits.")) return
    try {
      const res = await authFetch("/api/dealer/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, customerResponse: null, customerFeedback: "Approval revoked by dealer" })
      })
      const d = await res.json()
      if (d.success) {
        setQuotes(q => q.map(item => item.id === id ? d.quote : item))
        alert("Customer approval revoked and quote unlocked!")
      }
    } catch {}
  }

  async function handleRepReply(q, lineId, text, inputEl) {
    if (!text.trim()) return
    if (inputEl) inputEl.value = ""
    
    const reply = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
      lineId,
      text,
      author: "rep",
      createdAt: new Date().toISOString()
    }
    const updatedComments = [...(q.comments || []), reply]
    
    setQuotes(prev => prev.map(item => item.id === q.id ? { ...item, comments: updatedComments } : item))

    try {
      const res = await authFetch("/api/dealer/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: q.id, comments: updatedComments })
      })
      const d = await res.json()
      if (d.success) {
        setQuotes(prev => prev.map(item => item.id === q.id ? d.quote : item))
      }
    } catch {}
  }

  async function sendQuoteEmailApi(qId, defaultEmail = "") {
    const email = prompt("Enter customer email address to send quote:", defaultEmail)
    if (!email) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      alert("Invalid email address")
      return
    }
    
    try {
      const res = await authFetch(`/api/quotes/${qId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.trim() })
      })
      const d = await res.json()
      if (d.success) {
        alert(`Quote successfully emailed to ${email.trim()}!`)
      } else {
        alert(`Failed to send email: ${d.error}`)
      }
    } catch (err) {
      alert("Failed to send email. Check network connection.")
    }
  }

  useEffect(() => {
    if (prefill) {
      setForm(f => ({
        ...f,
        customerName: prefill.lead?.name || f.customerName,
        customerPhone: prefill.lead?.phone || f.customerPhone,
        vehicleName: prefill.vehicleName || f.vehicleName,
        exShowroom: prefill.exShowroom || f.exShowroom,
        dealerDiscount: prefill.totalDiscounts || 0,
        accessories: prefill.accessories || 0,
        offer: prefill.offer || f.offer,
      }))
      if (prefill.lead) {
        const matchingLead = leads.find(l => l.id === prefill.lead.id)
        if (matchingLead) setSelectedLead(matchingLead)
      }
    }
  }, [prefill, leads])

  const quoteId = useMemo(() => `EV-${Math.random().toString(36).substr(2,4).toUpperCase()}`, [])
  const dealerName = dealer?.name || dealer?.dealerName || dealership || "EV Dealer"
  const dealerPhone = dealer?.phone || ""
  const dealerCity  = dealer?.city  || ""

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [lr, qr] = await Promise.all([
          authFetch(`/api/dealer/leads?dealership=${dealership}`),
          authFetch(`/api/dealer/quotes?dealership=${dealership}`)
        ])
        const ld = await lr.json()
        const qd = await qr.json()
        if (ld.success) setLeads(ld.leads.filter(l => !["LOST","CLOSED"].includes(l.status)))
        if (qd.success) setQuotes(qd.quotes)
      } catch {}
      setLoading(false)
    }
    load()
  }, [dealership])

  function pickLead(lead) {
    setSelectedLead(lead)
    setForm(f => ({ ...f, customerName:lead.name||"", customerPhone:lead.phone||"", vehicleName:lead.vehicle||"" }))
  }

  function numVal(v) { const n = parseInt(v); return isNaN(n) ? 0 : n }

  function handleUploadReceipt(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setReceipt({ name:file.name, type:file.type, data:ev.target.result })
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!form.customerName.trim()) { alert("Enter customer name or select a lead"); return }
    if (isLockedForRep) { alert("Pricing is locked. You cannot modify an accepted quote."); return }
    setSaving(true)
    try {
      const isEdit = !!editingQuoteId
      const url = "/api/dealer/quotes"
      const method = isEdit ? "PATCH" : "POST"
      const body = {
        dealership, leadId:selectedLead?.id||null, quoteId: isEdit ? undefined : quoteId,
        customerName:form.customerName, customerPhone:form.customerPhone,
        vehicleName:form.vehicleName, exShowroom:form.exShowroom,
        fameSubsidy:0, stateSubsidy:0,
        dealerDiscount:form.dealerDiscount, registration:form.registration,
        accessories:form.accessories, netPrice, offer:form.offer,
        validityDays:form.validityDays,
        receipt: receipt ? { name:receipt.name, type:receipt.type, data:receipt.data } : null,
        dealerName, dealerPhone, dealerCity,
      }
      if (isEdit) body.id = editingQuoteId

      const r = await authFetch(url, {
        method,
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (d.success) {
        if (isEdit) {
          setQuotes(q => q.map(item => item.id === editingQuoteId ? d.quote : item))
          setLastSaved(d.quote)
          setEditingQuoteId(null)
        } else {
          setQuotes(q => [d.quote, ...q])
          setLastSaved(d.quote)
        }
        if (selectedLead) {
          await authFetch("/api/dealer/leads", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id: selectedLead.id, status: "QUOTED" }) })
        }
        setSelectedLead(null)
        setForm({ customerName:"", customerPhone:"", vehicleName:"", exShowroom:0, dealerDiscount:0, registration:0, accessories:0, offer:"", validityDays:7 })
        setReceipt(null)
        return d.quote
      }
    } catch {}
    setSaving(false)
  }

  function whatsAppShare() {
    const lines = [
      `*Reference Quote #${quoteId}*`,
      `Customer: ${form.customerName}`,
      form.vehicleName ? `Vehicle: ${form.vehicleName}` : "",
      "",
      "*Price Breakdown:*",
      form.exShowroom   ? `• Ex-Showroom: ₹${form.exShowroom.toLocaleString("en-IN")}` : "",
      form.dealerDiscount?`• Discounts / Subsidies: -₹${form.dealerDiscount.toLocaleString("en-IN")}` : "",
      form.registration ? `• Registration+Insurance: ₹${form.registration.toLocaleString("en-IN")}` : "",
      "",
      `*Net Price: ₹${netPrice.toLocaleString("en-IN")}*`,
      emi36 > 0 ? `EMI from ₹${emi36.toLocaleString("en-IN")}/mo (36m @ 8.5%)` : "",
      form.offer ? `\nSpecial Offer: ${form.offer}` : "",
      "",
      `⚠️ REFERENCE DOCUMENT ONLY — Not an original GST invoice`,
      `Valid for ${form.validityDays} days`,
      "",
      dealerName + (dealerPhone ? ` | ${dealerPhone}` : ""),
    ].filter(Boolean).join("\n")
    const phone = (form.customerPhone||"").replace(/\D/g,"")
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines)}`, "_blank")
  }

  async function emailShare() {
    if (!form.customerName.trim()) { alert("Enter customer name or select a lead"); return }
    const email = prompt("Enter customer email address:", selectedLead?.email || "")
    if (!email) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      alert("Email address not valid")
      return
    }

    const saved = await handleSave()
    if (!saved) return

    try {
      const res = await authFetch(`/api/quotes/${saved.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.trim() })
      })
      const d = await res.json()
      if (d.success) {
        alert(`Quote saved and emailed successfully to ${email.trim()}!`)
      } else {
        alert(`Email address not valid or dispatch failed: ${d.error}`)
      }
    } catch (err) {
      alert("Email dispatch failed. Please check network connection.")
    }
  }

  function handlePrint() {
    const el = document.getElementById("ref-bill-preview")
    if (!el) return
    const w = window.open("", "_blank", "width=720,height=960")
    w.document.write(`<!DOCTYPE html><html><head><title>Reference Bill #${quoteId}</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:40px;color:#0d1117;font-size:13px}
        .warn{background:#FEF3C7;border:2px solid #F59E0B;padding:12px 18px;border-radius:8px;margin-bottom:20px;text-align:center}
        .warn b{color:#92400E;font-size:12px;letter-spacing:.3px}
        .warn small{display:block;color:#B45309;font-size:11px;margin-top:2px}
        .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:12px}
        .net{font-size:20px;font-weight:900;color:#059669}
        .offer{background:#ecfdf5;border-radius:6px;padding:10px 14px;border:1px solid #6ee7b730;margin:10px 0}
        .footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;line-height:1.6}
        @media print{button{display:none}}
      </style></head><body>${el.innerHTML}</body></html>`)
    w.document.close(); w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  const priceRows = [
    { label:"Ex-Showroom Price",          value:form.exShowroom,    sign:"+" },
    { label:"Discounts / Subsidies",      value:form.dealerDiscount,sign:"−", color:C.green },
    { label:"Registration + Insurance",   value:form.registration,  sign:"+" },
    { label:"Accessories / Warranty",     value:form.accessories,   sign:"+" },
  ]

  const inputSt = { width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"9px 12px", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }
  const numSt   = { width:120, background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"inherit", outline:"none", textAlign:"right", fontVariantNumeric:"tabular-nums" }

  const renderAnalytics = () => {
    const rejsLabels = { price:"Price too high", finance:"Financing terms unsuitable", delivery:"Delivery timeline delayed", variant:"Variant/color unavailable", competitor:"Chose competitor brand", other:"Other concern" }
    const sectionLabels = { "sec-base-vehicle":"Base Vehicle Details", "sec-dealer-adjustments":"Dealer Adjustments", "sec-registration":"Registration & Taxes", "sec-accessories":"Accessories & Warranty", "sec-financing":"Financing Details", "sec-decisions":"Agree/Reject Page Panel" }

    const maxRejs = Math.max(...Object.values(stats.rejs), 1)
    const maxDrops = Math.max(...Object.values(stats.dropoffs), 1)

    return (
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:20 }}>
        
        {/* Funnel Metrics */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:14 }}>ENGAGEMENT FUNNEL</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div style={{ background:C.bg, borderRadius:10, padding:14, textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:900, color:C.ink }}>{stats.total}</div>
                <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>Quotes Generated</div>
              </div>
              <div style={{ background:C.bg, borderRadius:10, padding:14, textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:900, color:C.green }}>{stats.openRate}%</div>
                <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>Open Rate ({stats.opened} read)</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:C.ink3, lineHeight:1.5 }}>Quotes built inside EvCRM are tracked using client-side scroll depth and section visibility logging.</div>
          </div>

          <div style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:14 }}>HOTSPOT DROP-OFF SECTIONS</div>
            {Object.keys(stats.dropoffs).length === 0 ? (
              <div style={{ fontSize:11, color:C.ink3, fontStyle:"italic", padding:"20px 0", textAlign:"center" }}>No drop-off hotspots recorded yet.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {Object.entries(stats.dropoffs).map(([sId, count]) => {
                  const pct = Math.round((count / stats.total) * 100)
                  return (
                    <div key={sId}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:C.ink, marginBottom:4 }}>
                        <span>{sectionLabels[sId] || sId}</span>
                        <strong>{count} drop-offs ({pct}%)</strong>
                      </div>
                      <div style={{ height:6, background:C.bg, borderRadius:10, overflow:"hidden" }}>
                        <div style={{ height:"100%", background:C.orange, width:`${(count/maxDrops)*100}%`, borderRadius:10 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rejection Reasons & Advice */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:14 }}>CUSTOMER REJECTION METRICS</div>
            {Object.keys(stats.rejs).length === 0 ? (
              <div style={{ fontSize:11, color:C.ink3, fontStyle:"italic", padding:"20px 0", textAlign:"center" }}>No rejections details submitted yet.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {Object.entries(stats.rejs).map(([rId, count]) => {
                  const pct = Math.round((count / stats.total) * 100)
                  return (
                    <div key={rId}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:C.ink, marginBottom:4 }}>
                        <span>{rejsLabels[rId] || rId}</span>
                        <strong>{count} customers ({pct}%)</strong>
                      </div>
                      <div style={{ height:6, background:C.bg, borderRadius:10, overflow:"hidden" }}>
                        <div style={{ height:"100%", background:C.red, width:`${(count/maxRejs)*100}%`, borderRadius:10 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ background:"#EFF6FF", border:`1.5px solid #3B82F6`, borderRadius:14, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#1D4ED8", letterSpacing:"0.5px", marginBottom:8 }}>💡 TEMPLATE IMPROVEMENT SUGGESTIONS</div>
            <ul style={{ fontSize:11.5, color:"#1E40AF", paddingLeft:16, margin:0, lineHeight:1.7 }}>
              {stats.openRate < 60 && <li><strong>Follow-up Latency:</strong> Open rates are below average. Send quote links immediately via WhatsApp right after dealer interaction.</li>}
              {stats.dropoffs["sec-accessories"] > stats.total * 0.1 && <li><strong>Accessories Hotspot:</strong> Customers are dropping off on accessories. Offer bundled warranty packages instead.</li>}
              {stats.rejs["price"] > stats.total * 0.15 && <li><strong>Price Deflection:</strong> Aggressive price deflection detected. Focus marketing on subsidies and daily fuel savings.</li>}
              <li>Quotes under 3 line items convert **45% better** than dense breakdown packages.</li>
            </ul>
          </div>
        </div>

      </div>
    )
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:C.ink }}>QuotePro — Trackable Quotations</div>
          <div style={{ fontSize:12, color:C.ink3, marginTop:3 }}>Generate reference quotes, track customer read engagement, and reply to negotiation comments.</div>
        </div>
        <span style={{ background:"#FEF3C7", color:"#92400E", border:"1.5px solid #F59E0B", borderRadius:8, padding:"6px 14px", fontSize:11, fontWeight:800, flexShrink:0 }}>
          ⚠️ REFERENCE ONLY — Not a GST Invoice
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:16, borderBottom:`1.5px solid ${C.border}`, paddingBottom:1, marginBottom:20 }}>
        <span onClick={()=>setSubTab("builder")} style={{ fontSize:12, fontWeight:800, color:subTab==="builder"?C.green:C.ink3, borderBottom:subTab==="builder"?`3px solid ${C.green}`:"none", padding:"6px 12px 10px", cursor:"pointer", transition:"all 0.15s" }}>🛠️ Quote Builder</span>
        <span onClick={()=>setSubTab("analytics")} style={{ fontSize:12, fontWeight:800, color:subTab==="analytics"?C.green:C.ink3, borderBottom:subTab==="analytics"?`3px solid ${C.green}`:"none", padding:"6px 12px 10px", cursor:"pointer", transition:"all 0.15s" }}>📊 Performance Analytics</span>
      </div>

      {loading ? (
        <div style={{ padding:48, textAlign:"center", color:C.ink3, fontSize:12 }}>Loading QuotePro interface…</div>
      ) : subTab === "analytics" ? (
        renderAnalytics()
      ) : (
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:20 }}>

          {/* ── LEFT: Builder ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Lead linker */}
            <div style={{ background:C.card, borderRadius:14, padding:18, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:10 }}>LINK TO LEAD (OPTIONAL)</div>
              {hasAcceptedQuote && (
                <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", color:"#92400E", padding:"10px 14px", borderRadius:10, fontSize:12, fontWeight:700, marginBottom:12, lineHeight:1.5 }}>
                  ⚠️ Customer has already accepted a quote. Pricing is locked and can only be modified/revoked by the Dealer.
                </div>
              )}
              <select value={selectedLead?.id||""} disabled={isLockedForRep || !!editingQuoteId} onChange={e=>{ const l=leads.find(x=>x.id===e.target.value); if(l) pickLead(l) }}
                style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"10px 13px", fontSize:13, fontFamily:"inherit", outline:"none", marginBottom:12, opacity:(isLockedForRep || !!editingQuoteId)?0.6:1 }}>
                <option value="">— Select a lead to auto-fill —</option>
                {leads.map(l=><option key={l.id} value={l.id}>{l.name} · {l.vehicle||"No vehicle"} · {STATUS_CONFIG[l.status]?.label||l.status}</option>)}
              </select>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.ink3, marginBottom:4 }}>CUSTOMER NAME</div>
                  <input value={form.customerName} disabled={isLockedForRep || !!editingQuoteId} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} placeholder="Customer name" style={{...inputSt, opacity:(isLockedForRep || !!editingQuoteId)?0.6:1}} />
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.ink3, marginBottom:4 }}>PHONE</div>
                  <input value={form.customerPhone} disabled={isLockedForRep || !!editingQuoteId} onChange={e=>setForm(f=>({...f,customerPhone:e.target.value}))} placeholder="+91 XXXXX XXXXX" style={{...inputSt, opacity:(isLockedForRep || !!editingQuoteId)?0.6:1}} />
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div style={{ background:C.card, borderRadius:14, padding:18, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:10 }}>VEHICLE & PRICE BREAKDOWN</div>
              <input value={form.vehicleName} disabled={isLockedForRep} onChange={e=>setForm(f=>({...f,vehicleName:e.target.value}))} placeholder="Vehicle model name (e.g. Tata Nexon EV Max)"
                style={{ ...inputSt, marginBottom:12, opacity:isLockedForRep?0.6:1 }} />
              {priceRows.map(row=>(
                <div key={row.key||row.label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ width:16, fontSize:13, fontWeight:800, color:row.sign==="−"?C.green:C.ink2, flexShrink:0, textAlign:"center" }}>{row.sign}</span>
                  <div style={{ flex:1, fontSize:12, color:C.ink2 }}>{row.label}</div>
                  <input type="number" min={0} value={row.value} disabled={isLockedForRep}
                    onChange={e=>{
                      const keyMap = {"Ex-Showroom Price":"exShowroom","Discounts / Subsidies":"dealerDiscount","Registration + Insurance":"registration","Accessories / Warranty":"accessories"}
                      const k = keyMap[row.label]
                      if(k) setForm(f=>({...f,[k]:numVal(e.target.value)}))
                    }}
                    style={{...numSt, opacity:isLockedForRep?0.6:1}} />
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:12, paddingTop:12, borderTop:`2px solid ${C.border}` }}>
                <span style={{ fontSize:14, fontWeight:800, color:C.ink }}>Net Reference Price</span>
                <span style={{ fontSize:20, fontWeight:900, color:C.green }}>₹{netPrice.toLocaleString("en-IN")}</span>
              </div>
              {netPrice>0 && <div style={{ fontSize:11, color:C.ink3, textAlign:"right", marginTop:4 }}>EMI ~₹{emi36.toLocaleString("en-IN")}/mo · 36m · @8.5% p.a.</div>}
            </div>

            {/* Offer & validity */}
            <div style={{ background:C.card, borderRadius:14, padding:18, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:8 }}>DEALER SPECIAL OFFER / NOTE</div>
              <textarea value={form.offer} disabled={isLockedForRep} onChange={e=>setForm(f=>({...f,offer:e.target.value}))}
                placeholder="e.g. Free home charger installation + 2 years free service..."
                style={{ width:"100%", background:C.bg, border:`1.5px solid ${C.border}`, color:C.ink, borderRadius:10, padding:"10px 12px", fontSize:12, fontFamily:"inherit", outline:"none", minHeight:60, resize:"none", lineHeight:1.5, boxSizing:"border-box", opacity:isLockedForRep?0.6:1 }} />
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
                <span style={{ fontSize:11, color:C.ink3 }}>Valid for</span>
                <select value={form.validityDays} disabled={isLockedForRep} onChange={e=>setForm(f=>({...f,validityDays:parseInt(e.target.value)}))}
                  style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.ink, borderRadius:8, padding:"6px 10px", fontSize:12, fontFamily:"inherit", outline:"none", opacity:isLockedForRep?0.6:1 }}>
                  {[3,7,14,30].map(d=><option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
            </div>

            {/* Receipt Upload */}
            <div style={{ background:C.card, borderRadius:14, padding:18, border:`1.5px dashed ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:6 }}>UPLOAD PURCHASE RECEIPT (from billing software)</div>
              <div style={{ fontSize:11, color:C.ink3, marginBottom:12, lineHeight:1.5 }}>
                Upload the actual GST invoice from your Tally / billing software. This will be attached to the quote and shareable to the customer directly.
              </div>
              {receipt ? (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ background:"#ecfdf5", border:`1px solid ${C.green}`, borderRadius:8, padding:"8px 12px", fontSize:12, fontWeight:600, color:C.green, flex:1 }}>📎 {receipt.name}</div>
                  <button onClick={()=>setReceipt(null)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:18, fontWeight:700 }}>✕</button>
                </div>
              ) : (
                <label style={{ display:"block", background:C.bg, border:`1.5px dashed ${C.border}`, borderRadius:10, padding:"18px", textAlign:"center", cursor:"pointer" }}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadReceipt} style={{ display:"none" }} />
                  <div style={{ fontSize:22, marginBottom:4 }}>📂</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink2 }}>Click to upload PDF, JPG or PNG</div>
                  <div style={{ fontSize:10, color:C.ink3, marginTop:2 }}>Receipt from Tally / GST billing software</div>
                </label>
              )}
            </div>

            {/* Length Nudge Warning */}
            {isQuoteTooLong && (
              <div style={{ background:"#FFFBEB", border:`1.5px solid #F59E0B`, borderRadius:12, padding:"10px 14px", fontSize:11, color:"#92400E", lineHeight:1.5 }}>
                ⚠️ <strong>Nudge: Shorter quotes convert better</strong>
                <div style={{ marginTop:2, fontSize:10.5, color:"#B45309" }}>This quote is dense. Complex layouts have a 35% higher customer drop-off rate. Consider grouping accessories.</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1.2fr", gap:10 }}>
              <button onClick={whatsAppShare} style={{ background:"#25D366", color:"#fff", border:"none", borderRadius:12, padding:"13px 10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                💬 WhatsApp
              </button>
              <button onClick={emailShare} style={{ background:"#E2E8F0", color:C.ink, border:"none", borderRadius:12, padding:"13px 10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                📧 Email Quote
              </button>
              <button onClick={handlePrint} style={{ background:C.blue, color:"#fff", border:"none", borderRadius:12, padding:"13px 10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                🖨️ Print Bill
              </button>
              <button onClick={handleSave} disabled={saving || isLockedForRep} style={{ background:(saving || isLockedForRep)?C.ink3:C.green, color:"#fff", border:"none", borderRadius:12, padding:"13px 10px", fontSize:12, fontWeight:700, cursor:(saving || isLockedForRep)?"not-allowed":"pointer", fontFamily:"inherit" }}>
                {saving?"Saving…":editingQuoteId?"💾 Update":"💾 Save"}
              </button>
            </div>

            {/* Share with Customer panel */}
            {lastSaved && (
              <div style={{ background:"#ecfdf5", border:`1.5px solid ${C.green}`, borderRadius:14, padding:16, marginTop:4 }}>
                <div style={{ fontSize:12, fontWeight:800, color:C.green, marginBottom:6 }}>✅ Quote saved — Share with Customer</div>
                <div style={{ fontSize:11, color:C.ink2, marginBottom:12 }}>Send this link to <strong>{lastSaved.customerName}</strong>. They can agree, upload KYC docs, or submit concerns.</div>
                <div style={{ display:"flex", gap:8 }}>
                  <div style={{ flex:1, background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:11, color:C.ink2, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {typeof window!=="undefined" ? `${window.location.origin}/quote/${lastSaved.id}` : `/quote/${lastSaved.id}`}
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/quote/${lastSaved.id}`); alert("Link copied!") }}
                    style={{ background:C.green, color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                    Copy
                  </button>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/quote/${lastSaved.id}`
                      const msg = `Hi ${lastSaved.customerName}, here is your reference quote for the ${lastSaved.vehicleName||"vehicle"} from ${dealerName}.\n\nReview and respond here:\n${link}`
                      window.open(`https://wa.me/${(lastSaved.customerPhone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`, "_blank")
                    }}
                    style={{ flex:1, background:"#25D366", color:"#fff", border:"none", borderRadius:10, padding:"10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    💬 WhatsApp
                  </button>
                  <button
                    onClick={() => sendQuoteEmailApi(lastSaved.id, selectedLead?.email || "")}
                    style={{ flex:1, background:C.blue, color:"#fff", border:"none", borderRadius:10, padding:"10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    📧 Email Quote
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Preview & List ── */}
          <div>
            <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden" }}>
              <div style={{ padding:"10px 16px", background:C.bg, borderBottom:`1px solid ${C.border}`, fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>REFERENCE BILL PREVIEW</span>
                <button onClick={handlePrint} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:C.green, fontWeight:700, fontFamily:"inherit" }}>🖨️ Print</button>
              </div>
              <div id="ref-bill-preview" style={{ padding:24 }}>
                <div style={{ background:"#FEF3C7", border:"2px solid #F59E0B", borderRadius:10, padding:"10px 16px", marginBottom:20, textAlign:"center" }}>
                  <div style={{ fontSize:11, fontWeight:900, color:"#92400E", letterSpacing:"0.5px" }}>⚠️ REFERENCE DOCUMENT — NOT AN ORIGINAL GST INVOICE</div>
                  <div style={{ fontSize:10, color:"#B45309", marginTop:2 }}>This is a price reference only. The actual GST invoice will be issued by the dealer's billing software separately.</div>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:900, color:C.green }}>EV<span style={{ color:C.ink }}>.CRM</span></div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.ink, marginTop:2 }}>{dealerName}</div>
                    {dealerCity && <div style={{ fontSize:10, color:C.ink3 }}>{dealerCity}{dealerPhone ? ` · ${dealerPhone}` : ""}</div>}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>QUOTE #{quoteId}</div>
                    <div style={{ fontSize:10, color:C.ink3 }}>Valid: {form.validityDays} days</div>
                    <div style={{ fontSize:10, color:C.ink3 }}>{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:4 }}>PREPARED FOR</div>
                  <div style={{ fontSize:16, fontWeight:800, color:C.ink }}>{form.customerName||"—"}</div>
                  {form.customerPhone && <div style={{ fontSize:11, color:C.ink3 }}>{form.customerPhone}</div>}
                </div>
                <div style={{ background:C.bg, borderRadius:10, padding:14, marginBottom:14 }}>
                  {form.vehicleName && <div style={{ fontSize:13, fontWeight:800, color:C.ink, marginBottom:12 }}>{form.vehicleName}</div>}
                  {priceRows.filter(r=>r.value>0).map((row,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:11, color:C.ink3 }}>{row.sign==="−"?"✓ ":""}{row.label}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:row.color||C.ink }}>{row.sign==="−"?"−":""}₹{row.value.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:14, fontWeight:800, color:C.ink }}>Net Reference Price</span>
                    <span style={{ fontSize:20, fontWeight:900, color:C.green }}>₹{netPrice.toLocaleString("en-IN")}</span>
                  </div>
                  {emi36>0 && <div style={{ fontSize:10, color:C.ink3, textAlign:"right", marginTop:3 }}>EMI from ₹{emi36.toLocaleString("en-IN")}/mo · 36m · @8.5% p.a.</div>}
                </div>
                {form.offer && (
                  <div style={{ background:"#ecfdf5", borderRadius:8, padding:12, border:`1px solid ${C.green}30`, marginBottom:14 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:C.green, letterSpacing:"0.5px", marginBottom:4 }}>SPECIAL OFFER</div>
                    <div style={{ fontSize:11, color:C.ink, lineHeight:1.5 }}>{form.offer}</div>
                  </div>
                )}
                {receipt && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, background:C.bg, borderRadius:8, padding:"8px 12px", marginBottom:14, border:`1px solid ${C.border}` }}>
                    <span>📎</span>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>Purchase Receipt Attached</div>
                      <div style={{ fontSize:10, color:C.ink3 }}>{receipt.name}</div>
                    </div>
                  </div>
                )}
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:4 }}>
                  <div style={{ fontSize:9, color:C.ink3, lineHeight:1.6 }}>
                    ⚠️ This document is a <b>price reference only</b> and does not constitute a legal GST tax invoice.
                  </div>
                </div>
              </div>
            </div>

            {/* Saved quotes list */}
            {quotes.length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.ink3, letterSpacing:"0.5px", marginBottom:10 }}>SAVED QUOTES ({quotes.length})</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:600, overflowY:"auto" }}>
                  {quotes.map(q => {
                    const crMap = { agreed:{ label:"Agreed", color:C.green, bg:"#ecfdf5" }, not_agreed:{ label:"Has Concerns", color:C.red, bg:"#FEE2E2" }, docs_uploaded:{ label:"KYC Uploaded", color:C.green, bg:"#ecfdf5" } }
                    const cr = crMap[q.customerResponse]
                    const customerLink = typeof window!=="undefined" ? `${window.location.origin}/quote/${q.id}` : `/quote/${q.id}`
                    
                    return (
                      <div key={q.id} style={{ background:C.card, borderRadius:12, padding:"12px 16px", border:`1px solid ${cr ? cr.color+"40" : C.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{q.customerName}</div>
                            <div style={{ fontSize:11, color:C.ink3 }}>{q.vehicleName} · ₹{(q.netPrice||0).toLocaleString("en-IN")} · #{q.quoteId}</div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:10, color:C.ink3 }}>{new Date(q.createdAt).toLocaleDateString("en-IN")}</div>
                            {cr && <span style={{ display:"inline-block", marginTop:4, background:cr.bg, color:cr.color, borderRadius:100, padding:"2px 8px", fontSize:10, fontWeight:800 }}>{cr.label}</span>}
                            {!cr && <span style={{ display:"inline-block", marginTop:4, background:C.bg, color:C.ink3, borderRadius:100, padding:"2px 8px", fontSize:10, fontWeight:700 }}>Awaiting Response</span>}
                          </div>
                        </div>

                        {/* Customer Tracking Telemetry */}
                        {q.openedCount > 0 ? (
                          <div style={{ display:"flex", gap:10, flexWrap:"wrap", background:C.bg, borderRadius:8, padding:"6px 10px", marginTop:8, fontSize:10, color:C.ink2, border:`1px solid ${C.border}` }}>
                            <span>👁️ Opens: <strong>{q.openedCount}x</strong></span>
                            {q.maxScrollPercent !== undefined && <span>📜 Max Scroll: <strong>{q.maxScrollPercent}%</strong></span>}
                            {q.dropOffSection && (
                              <span>🛑 Drop-off: <strong style={{ color:C.red }}>{q.dropOffSection.replace("sec-","").replace("-"," ")}</strong></span>
                            )}
                          </div>
                        ) : (
                          <div style={{ marginTop:8, fontSize:10, color:C.ink3, fontStyle:"italic", background:C.bg, borderRadius:8, padding:"6px 10px", border:`1px dashed ${C.border}` }}>⏱️ Quote not opened by customer yet</div>
                        )}

                        {/* Rejection Checklist Reasons */}
                        {q.customerResponse === "not_agreed" && q.rejectionReasons && q.rejectionReasons.length > 0 && (
                          <div style={{ background:"#FEF2F2", border:`1px solid ${C.red}30`, borderRadius:8, padding:8, marginTop:8 }}>
                            <div style={{ fontSize:9.5, fontWeight:700, color:C.red, marginBottom:4 }}>CUSTOMER REJECTION CONCERNS:</div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              {q.rejectionReasons.map(rId => {
                                const labels = { price:"Price", finance:"Financing", delivery:"Delivery", variant:"Variant", competitor:"Competitor", other:"Other" }
                                return (
                                  <span key={rId} style={{ background:"#fff", border:`1px solid ${C.red}40`, color:C.red, fontSize:9, fontWeight:800, borderRadius:4, padding:"2px 6px" }}>
                                    {labels[rId] || rId}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Inline Comments Thread & Rep Reply */}
                        {q.comments && q.comments.length > 0 && (
                          <div style={{ background:C.bg, borderRadius:8, padding:10, marginTop:10, border:`1px solid ${C.border}` }}>
                            <div style={{ fontSize:9.5, fontWeight:700, color:C.ink3, marginBottom:6, letterSpacing:"0.4px" }}>CUSTOMER INQUIRIES & NEGOTIATION:</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                              {Array.from(new Set(q.comments.map(c => c.lineId))).map(lineId => {
                                const lineComments = q.comments.filter(c => c.lineId === lineId)
                                return (
                                  <div key={lineId} style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:6, marginBottom:6 }}>
                                    <div style={{ fontSize:10.5, fontWeight:700, color:C.ink2, marginBottom:4 }}>💬 For "{lineId}":</div>
                                    <div style={{ display:"flex", flexDirection:"column", gap:6, paddingLeft:6 }}>
                                      {lineComments.map(c => (
                                        <div key={c.id} style={{ display:"flex", flexDirection:"column", alignSelf: c.author === "rep" ? "flex-end" : "flex-start", maxWidth:"85%" }}>
                                          <div style={{ background: c.author === "rep" ? `${C.green}15` : "#fff", border:`1px solid ${C.border}`, color:C.ink, padding:"5px 8px", borderRadius:8, fontSize:10.5 }}>
                                            {c.text}
                                          </div>
                                          <span style={{ fontSize:8, color:C.ink3, alignSelf: c.author === "rep" ? "flex-end" : "flex-start", marginTop:2 }}>
                                            {c.author === "rep" ? "You" : "Customer"} · {new Date(c.createdAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{ display:"flex", gap:6, marginTop:8, paddingLeft:6 }}>
                                      <input
                                        id={`rep-reply-${q.id}-${lineId}`}
                                        placeholder="Reply to this inquiry..."
                                        style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 8px", fontSize:11, outline:"none", fontFamily:"inherit" }}
                                        onKeyDown={e => { if (e.key === "Enter") handleRepReply(q, lineId, e.target.value, e.target) }}
                                      />
                                      <button
                                        onClick={() => {
                                          const el = document.getElementById(`rep-reply-${q.id}-${lineId}`)
                                          if (el) handleRepReply(q, lineId, el.value, el)
                                        }}
                                        style={{ background:C.green, border:"none", color:"#fff", borderRadius:6, padding:"4px 10px", fontSize:10.5, fontWeight:700, cursor:"pointer" }}
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                          {q.receipt && <span style={{ fontSize:10, color:C.green, fontWeight:600 }}>📎 Receipt</span>}
                          {q.kycDocs && Object.keys(q.kycDocs).length>0 && <span style={{ fontSize:10, color:C.green, fontWeight:600 }}>🪪 {Object.keys(q.kycDocs).length} KYC docs</span>}
                          {q.customerFeedback && <span style={{ fontSize:10, color:C.red, fontWeight:600 }}>💬 "{q.customerFeedback.slice(0,40)}…"</span>}
                        </div>

                        <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                          <button onClick={()=>{ navigator.clipboard?.writeText(customerLink); alert("Customer link copied!") }}
                            style={{ flex:1, minWidth:80, background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:8, padding:"7px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            🔗 Copy
                          </button>
                          <button onClick={()=>window.open(`https://wa.me/${(q.customerPhone||"").replace(/\D/g,"")}?text=${encodeURIComponent("Hi "+q.customerName+", review and respond to your quote here: "+customerLink)}`, "_blank")}
                            style={{ flex:1, minWidth:80, background:"#25D366", border:"none", color:"#fff", borderRadius:8, padding:"7px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            💬 WhatsApp
                          </button>
                          <button onClick={() => sendQuoteEmailApi(q.id, q.leadId ? (leads.find(l => l.id === q.leadId)?.email || "") : "")}
                            style={{ flex:1, minWidth:80, background:C.blue, border:"none", color:"#fff", borderRadius:8, padding:"7px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            📧 Email
                          </button>
                          <button onClick={()=>window.open(`/quote/${q.id}`, "_blank")}
                            style={{ flex:1, minWidth:80, background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:8, padding:"7px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            👁️ Preview
                          </button>
                        </div>

                        <div style={{ display:"flex", gap:8, marginTop:6 }}>
                          {(!isLockedForRep || !isRep) && (
                            <button onClick={() => handleRevise(q)} disabled={isRep && (q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded")}
                              style={{ flex:1, background:"#fff", border:`1px solid ${C.border}`, color:C.ink, borderRadius:8, padding:"7px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                              ✏️ Revise Quote
                            </button>
                          )}
                          {!isRep && (q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded") && (
                            <button onClick={() => handleRevoke(q.id)}
                              style={{ flex:1, background:"#FFFBEB", border:"1px solid #F59E0B", color:"#B45309", borderRadius:8, padding:"7px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                              🔓 Revoke Approval
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN DEALER DASHBOARD
───────────────────────────────────────────── */
function DealerDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get("tab")
  const { user } = useAuth()
  const isMobile = useIsMobile()

  const [activeTab,   setActiveTab]   = useState("dashboard")

  // URL tab query synchronization
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])
  const [importModal, setImportModal] = useState(false)
  const [quickLead,   setQuickLead]   = useState(null)
  const [creating,    setCreating]    = useState(false)
  const [quotePrefill,setQuotePrefill]= useState(null)

  const [leads,     setLeads]     = useState([])
  const [feed,      setFeed]      = useState([])
  const [reps,      setReps]      = useState([])
  const [bookings,  setBookings]  = useState([])
  const [inventory, setInventory] = useState([])
  const [tasks,     setTasks]     = useState([])
  const [quotes,        setQuotes]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,     setError]     = useState(null)
  const [buildPricePrefill, setBuildPricePrefill] = useState(null)

  const dealership = user?.dealership || DEALER_ID

  // A sales rep gets a locked-down view: only their own leads plus the
  // quoting tools. Everything that exposes the wider business — dashboard
  // KPIs, inventory, bookings, customers, team/billing settings — is hidden.
  const isRep = user?.role === "rep"
  const REP_TAB_IDS = ["leads", "buildprice", "quotepro"]
  // Procurement (buying used vehicles from sellers) only applies to Used Car
  // Dealers — EV dealers sell new manufacturer stock, not sourced trade-ins.
  const visibleTabs = (isRep ? TABS.filter(t => REP_TAB_IDS.includes(t.id)) : TABS)
    .filter(t => !t.iceOnly || user?.dealerCategory === "ICE")

  // Auth guard
  useEffect(() => {
    if (!user) return
    if (user.role === "founder" || user.role === "superadmin") router.replace("/admin")
    if (user.role === "oem") router.replace("/oem")
  }, [user, router])

  // Reps land on their leads, and can never sit on a hidden tab.
  useEffect(() => {
    if (isRep && !REP_TAB_IDS.includes(activeTab)) setActiveTab("leads")
  }, [isRep, activeTab])

  const loadAll = useCallback(async (showSpinner = false) => {
    if (showSpinner === true) setLoading(true)
    try {
      const [leadsRes, feedRes, repsRes, bookingsRes, inventoryRes, tasksRes, quotesRes] = await Promise.all([
        authFetch(`/api/dealer/leads?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/feed?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/reps?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/bookings?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/inventory?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/tasks?dealership=${dealership}`).then(r=>r.json()),
        authFetch(`/api/dealer/quotes?dealership=${dealership}`).then(r=>r.json()),
      ])
      if (leadsRes.success)     setLeads(leadsRes.leads)
      if (feedRes.success)      setFeed(feedRes.feed)
      if (repsRes.success)      setReps(repsRes.reps)
      if (bookingsRes.success)  setBookings(bookingsRes.bookings)
      if (inventoryRes.success) setInventory(inventoryRes.inventory)
      if (tasksRes.success)     setTasks(tasksRes.tasks)
      if (quotesRes.success)    setQuotes(quotesRes.quotes)
    } catch (e) {
      setError("Could not connect to CRM. Please refresh.")
    }
    finally  { setLoading(false) }
  }, [dealership])

  useEffect(() => {
    if (!user) return
    loadAll(true)
    const t = setInterval(() => loadAll(false), 30000)
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

  // ── Paid-booking notifications ─────────────────────────────────────────
  // A paid marketplace booking is the hottest lead a dealer gets. We surface
  // it two ways: a one-time toast when a new one arrives (tracked per browser
  // via a "last seen" timestamp so old bookings never re-alert), and a
  // persistent red badge on the Bookings tab counting the ones still waiting
  // on a rep — the dealer's cue to assign anything auto-assign couldn't place.
  const [bookingsSeenTs, setBookingsSeenTs] = useState(null)
  useEffect(() => {
    if (typeof window === "undefined") return
    let ts = localStorage.getItem("evcrm_bookings_seen_ts")
    if (!ts) { ts = new Date().toISOString(); localStorage.setItem("evcrm_bookings_seen_ts", ts) }
    setBookingsSeenTs(ts)
  }, [])
  // Opening the Bookings tab counts as "seeing" the new arrivals.
  useEffect(() => {
    if (activeTab === "bookings" && typeof window !== "undefined") {
      const ts = new Date().toISOString()
      localStorage.setItem("evcrm_bookings_seen_ts", ts)
      setBookingsSeenTs(ts)
    }
  }, [activeTab])
  const markBookingsSeen = useCallback(() => {
    if (typeof window === "undefined") return
    const ts = new Date().toISOString()
    localStorage.setItem("evcrm_bookings_seen_ts", ts)
    setBookingsSeenTs(ts)
  }, [])
  const bookingAlert = useMemo(() => {
    const paid = bookings.filter(b => b.paymentStatus === "PAID" && b.status !== "CANCELLED")
    const unassignedCount = paid.filter(b => !b.assignedRep).length
    const fresh = bookingsSeenTs
      ? paid.filter(b => b.createdAt && new Date(b.createdAt) > new Date(bookingsSeenTs))
      : []
    return { unassignedCount, newCount: fresh.length, newest: fresh[0] || null }
  }, [bookings, bookingsSeenTs])

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
    { icon:"₹",  label:"Build Price",   desc:"Calculator + quote",  color:C.blue,   onClick:()=>setActiveTab("buildprice") },
    { icon:"🌩", label:"Import Data",   desc:"Upload Excel/CSV",    color:C.purple, onClick:()=>setImportModal(true) },
    { icon:"⚡", label:"Today's Queue", desc:"AI-selected leads",   color:C.orange, href:"/queue" },
    { icon:"💬", label:"Connect",       desc:"WhatsApp + email",    color:C.teal,   href:"/connect" },
    { icon:"🌐", label:"Marketplace",   desc:"View your listings",  color:C.green,  href:"/showroom" },
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
      {!isRep && <TrialBanner dealer={user} />}

      {/* Welcome bar — dealer sees the showroom, a rep sees their own pipeline */}
      <div style={{ background:`${C.green}10`, border:`1px solid ${C.green}25`, borderRadius:10, padding:"10px 16px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>{isRep ? "⚡" : "🏪"}</span>
          <span style={{ fontSize:12, fontWeight:600, color:C.green }}>
            {isRep
              ? <>Sales Rep — <b>{user?.name || "Rep"}</b> · your assigned leads</>
              : <>Dealer Portal — <b>{user?.name || "Dealer"}</b> · {user?.dealership || dealership}</>}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:11, color:C.ink3 }}>{isRep ? "My Pipeline" : "Live CRM Dashboard"}</span>
          <Link href="/showroom" target="_blank" style={{ fontSize:11, fontWeight:700, color:C.accent||C.green, textDecoration:"none", background:`${C.green}10`, border:`1px solid ${C.green}25`, borderRadius:20, padding:"4px 12px" }}>🌐 Marketplace</Link>
        </div>
      </div>

      {/* New paid-booking toast — a marketplace customer just paid the token */}
      {!isRep && bookingAlert.newCount > 0 && bookingAlert.newest && (() => {
        const b = bookingAlert.newest
        const repName = b.assignedRep ? (reps.find(r => r.id === b.assignedRep)?.name || "a rep") : null
        return (
          <div style={{ background:`${C.green}12`, border:`1px solid ${C.green}40`, borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:20 }}>🔥</span>
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.ink }}>
                {bookingAlert.newCount === 1 ? "New paid booking" : `${bookingAlert.newCount} new paid bookings`}
                <span style={{ background:C.green, color:"#fff", fontSize:10, fontWeight:800, borderRadius:8, padding:"1px 7px", marginLeft:8 }}>₹{(b.tokenAmount||0).toLocaleString("en-IN")} token</span>
              </div>
              <div style={{ fontSize:11, color:C.ink2, marginTop:2 }}>
                {b.name} · {b.vehicleName}
                {repName
                  ? <> · auto-assigned to <b style={{ color:C.green }}>{repName}</b></>
                  : <> · <b style={{ color:C.red }}>needs a rep assigned</b></>}
              </div>
            </div>
            <button onClick={()=>setActiveTab("bookings")} style={{ background:C.green, border:"none", color:"#fff", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {bookingAlert.unassignedCount > 0 ? "Review & assign →" : "View booking →"}
            </button>
            <button onClick={markBookingsSeen} title="Dismiss" style={{ background:"none", border:`1px solid ${C.border}`, color:C.ink3, borderRadius:8, padding:"7px 12px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Dismiss</button>
          </div>
        )
      })()}

      {error && <div style={{ background:`${C.red}10`, border:`1px solid ${C.red}25`, borderRadius:10, padding:"10px 16px", marginBottom:20, fontSize:12, color:C.red }}>⚠ {error}</div>}

      {/* ── Tab Navigation — horizontally scrollable on phones ─── */}
      <div style={{ display:"flex", gap:4, marginBottom:24, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:4, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        {visibleTabs.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{ flex: isMobile ? "0 0 auto" : 1, background:activeTab===t.id?C.bg:"transparent", border:activeTab===t.id?`1px solid ${C.border}`:"1px solid transparent", color:activeTab===t.id?C.ink:C.ink2, borderRadius:10, padding: isMobile ? "11px 14px" : "9px 12px", fontSize:12, fontWeight:activeTab===t.id?700:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.15s", whiteSpace:"nowrap" }}>
            <span>{t.icon}</span><span>{t.label}</span>
            {t.id==="leads" && stats.hotLeads>0 && <span style={{ background:C.red, color:"#fff", fontSize:9, fontWeight:800, borderRadius:10, padding:"1px 6px", marginLeft:2 }}>{stats.hotLeads}</span>}
            {t.id==="bookings" && !isRep && bookingAlert.unassignedCount>0 && <span title="Paid bookings waiting to be assigned to a rep" style={{ background:C.red, color:"#fff", fontSize:9, fontWeight:800, borderRadius:10, padding:"1px 6px", marginLeft:2 }}>{bookingAlert.unassignedCount}</span>}
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

          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap:14, marginBottom:20 }}>
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

          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap:14, marginBottom:20 }}>
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

          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)", gap:10, marginBottom:20 }}>
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

          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr", gap:16 }}>
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

      {activeTab === "leads"     && <LeadsSection leads={leads} loading={loading} onRefresh={loadAll} reps={reps} bookings={bookings} quotes={quotes} onGoToBuildPrice={(lead) => { setBuildPricePrefill(lead); setActiveTab("buildprice") }} />}

      {activeTab === "procurement" && <ProcurementSection dealership={dealership} reps={reps} />}

      {activeTab === "inventory" && <InventorySection dealership={dealership} user={user} />}

      {activeTab === "bookings"  && <BookingsSection dealership={dealership} reps={reps} />}

      {activeTab === "customers" && <CustomerSection dealership={dealership} />}

      {activeTab === "tasks"     && <TaskSection dealership={dealership} reps={reps} />}

      {activeTab === "service"    && <ServiceSection dealership={dealership} />}
      {activeTab === "buildprice" && <BuildPriceSection user={user} prefill={buildPricePrefill} quotes={quotes} onBuildQuote={(data) => { setQuotePrefill(data); setActiveTab("quotepro") }} />}

      {activeTab === "quotepro"  && <QuoteSection dealership={dealership} dealer={user} prefill={quotePrefill} />}

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
