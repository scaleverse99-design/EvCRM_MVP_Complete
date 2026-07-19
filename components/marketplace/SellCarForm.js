"use client"
import { useState } from "react"
import { C } from "../../lib/constants"

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"]
const CONDITIONS = ["Good", "Fair", "Poor"]
const MAX_PHOTOS = 6

// Downscales a photo before it ever leaves the browser — this form is public
// and unauthenticated (walk-in/WhatsApp customers, no login), so nothing
// server-side caps upload size; the compression here is the only guard.
function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const MAX_SIDE = 1000
        let width = img.width, height = img.height
        if (width >= height) { if (width > MAX_SIDE) { height *= MAX_SIDE / width; width = MAX_SIDE } }
        else { if (height > MAX_SIDE) { width *= MAX_SIDE / height; height = MAX_SIDE } }
        const canvas = document.createElement("canvas")
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.75))
      }
      img.onerror = reject
      img.src = event.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Shared "Sell Your Car" form — a seller (customer) offers a vehicle to a
// specific dealer with zero login required. Lands directly in that dealer's
// Procurement pipeline (see app/api/marketplace/procurement/route.js).
// Rendered two ways: inside SellCarModal's overlay (storefront button,
// pass onClose) and as a full standalone page at evcrm.in/{slug}/sell
// (dealer-shared WhatsApp link for offline/walk-in customers, no onClose).
export default function SellCarForm({ dealership, dealerName, onClose, source }) {
  const [sellerName, setSellerName] = useState("")
  const [sellerPhone, setSellerPhone] = useState("")
  const [sellerEmail, setSellerEmail] = useState("")
  const [brand, setBrand] = useState("")
  const [model, setModel] = useState("")
  const [variant, setVariant] = useState("")
  const [year, setYear] = useState("")
  const [km, setKm] = useState("")
  const [fuelType, setFuelType] = useState("Petrol")
  const [condition, setCondition] = useState("Good")
  const [askingPrice, setAskingPrice] = useState("")
  const [message, setMessage] = useState("")
  const [photos, setPhotos] = useState([])
  const [compressing, setCompressing] = useState(false)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState("")

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) { setError(`You can upload up to ${MAX_PHOTOS} photos`); return }
    setCompressing(true)
    try {
      const compressed = await Promise.all(files.slice(0, room).map(compressPhoto))
      setPhotos(p => [...p, ...compressed])
    } catch {
      setError("Couldn't process one of those photos — try a different file")
    } finally {
      setCompressing(false)
      e.target.value = ""
    }
  }
  const removePhoto = (idx) => setPhotos(p => p.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (!sellerName.trim() || !sellerPhone.trim()) { setError("Name and phone are required"); return }
    if (sellerPhone.replace(/\D/g, "").length < 10) { setError("Enter a valid 10-digit phone number"); return }
    if (!brand.trim() || !model.trim()) { setError("Brand and model are required"); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch("/api/marketplace/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealership, sellerName: sellerName.trim(), sellerPhone: sellerPhone.trim(), sellerEmail: sellerEmail.trim(), brand: brand.trim(), model: model.trim(), variant: variant.trim(), year, km, fuelType, condition, askingPrice, message: message.trim(), photos, source }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Submission failed")
      setSuccess(data.procurement)
    } catch (e) { setError(e.message || "Submission failed") }
    finally { setLoading(false) }
  }

  if (success) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>💰</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Request Sent!</div>
        <div style={{ fontSize: 14, color: C.ink3, marginBottom: 24, lineHeight: 1.6 }}>
          Your <b style={{ color: C.ink }}>{success.brand} {success.model}</b> has been offered to <b style={{ color: C.ink }}>{success.dealerName}</b>.<br />
          They'll call you shortly to discuss it.
        </div>
        {onClose ? (
          <button onClick={onClose} style={{ background: C.ink, border: "none", color: "#fff", borderRadius: 14, padding: "14px 40px", fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>Done</button>
        ) : (
          <div style={{ fontSize: 12, color: C.ink3 }}>You can close this page now.</div>
        )}
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>💰 Sell Your Car</div>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>To {dealerName}</div>
        </div>
        {onClose && <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", color: C.ink3, borderRadius: 10, width: 32, height: 32, cursor: "pointer", fontSize: 16, fontFamily: "inherit" }}>✕</button>}
      </div>

      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {[
            { label: "Your Name *", val: sellerName, set: setSellerName, ph: "Full name" },
            { label: "Phone Number *", val: sellerPhone, set: setSellerPhone, ph: "10-digit mobile number", type: "tel" },
            { label: "Email (for confirmation)", val: sellerEmail, set: setSellerEmail, ph: "yourname@gmail.com", type: "email" },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>{f.label}</div>
              <input type={f.type || "text"} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Brand *</div>
              <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Maruti Suzuki"
                style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Model *</div>
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Swift"
                style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Year</div>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2020"
                style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>KM Driven</div>
              <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="45000"
                style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Fuel Type</div>
              <select value={fuelType} onChange={e => setFuelType(e.target.value)}
                style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}>
                {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Condition</div>
              <select value={condition} onChange={e => setCondition(e.target.value)}
                style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Your Asking Price (₹)</div>
            <input type="number" value={askingPrice} onChange={e => setAskingPrice(e.target.value)} placeholder="450000"
              style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Vehicle Photos ({photos.length}/{MAX_PHOTOS})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative", width: 64, height: 64 }}>
                  <img src={p} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
                  <button onClick={() => removePhoto(i)} type="button"
                    style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.red, color: "#fff", border: "2px solid #fff", fontSize: 11, lineHeight: 1, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label style={{ width: 64, height: 64, borderRadius: 8, border: `1.5px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: compressing ? "not-allowed" : "pointer", color: C.ink3, fontSize: 20 }}>
                  {compressing ? "…" : "+"}
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} disabled={compressing} style={{ display: "none" }} />
                </label>
              )}
            </div>
            <div style={{ fontSize: 9.5, color: C.ink3, marginTop: 4 }}>Photos of the exterior, interior, and odometer help the dealer make a fair offer faster.</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Message (optional)</div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Anything else the dealer should know..."
              rows={2} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: C.red, marginTop: 12, background: "#FEE2E2", padding: "8px 12px", borderRadius: 10 }}>⚠ {error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {onClose && <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1.5px solid ${C.border}`, color: C.ink3, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>}
          <button onClick={handleSubmit} disabled={loading || compressing}
            style={{ flex: onClose ? 2 : 1, background: (loading || compressing) ? C.ink3 : C.green, border: "none", color: "#fff", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 800, cursor: (loading || compressing) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {loading ? "Submitting…" : "Get My Offer"}
          </button>
        </div>
      </div>
    </>
  )
}
