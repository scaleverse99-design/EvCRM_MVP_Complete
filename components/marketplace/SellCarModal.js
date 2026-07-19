"use client"
import { useState } from "react"
import { C } from "../../lib/constants"

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"]
const CONDITIONS = ["Good", "Fair", "Poor"]

// Public "Sell Your Car" form — a website visitor offers a vehicle to a
// dealer with zero login required. Lands directly in that dealer's
// Procurement pipeline (see app/api/marketplace/procurement/route.js).
//
// Only ever rendered on a dealer's own storefront (single-dealer context,
// and only when that dealer has opted in via their sellCarEnabled
// setting) — deliberately NOT offered on the shared marketplace, since
// EvCRM has no fair way to route an unscoped submission to one of many
// dealers, and dealers would have no way to trust the platform is
// distributing those leads fairly.
export default function SellCarModal({ dealership, dealerName: fixedDealerName, onClose }) {
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

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!sellerName.trim() || !sellerPhone.trim()) { setError("Name and phone are required"); return }
    if (sellerPhone.replace(/\D/g, "").length < 10) { setError("Enter a valid 10-digit phone number"); return }
    if (!brand.trim() || !model.trim()) { setError("Brand and model are required"); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch("/api/marketplace/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealership, sellerName: sellerName.trim(), sellerPhone: sellerPhone.trim(), sellerEmail: sellerEmail.trim(), brand: brand.trim(), model: model.trim(), variant: variant.trim(), year, km, fuelType, condition, askingPrice, message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Submission failed")
      setSuccess(data.procurement)
    } catch (e) { setError(e.message || "Submission failed") }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, overflow: "hidden", boxShadow: "0 30px 100px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
        {success ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💰</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Request Sent!</div>
            <div style={{ fontSize: 14, color: C.ink3, marginBottom: 24, lineHeight: 1.6 }}>
              Your <b style={{ color: C.ink }}>{success.brand} {success.model}</b> has been offered to <b style={{ color: C.ink }}>{success.dealerName}</b>.<br />
              They'll call you shortly to schedule an inspection.
            </div>
            <button onClick={onClose} style={{ background: C.ink, border: "none", color: "#fff", borderRadius: 14, padding: "14px 40px", fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>💰 Sell Your Car</div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>To {fixedDealerName}</div>
              </div>
              <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", color: C.ink3, borderRadius: 10, width: 32, height: 32, cursor: "pointer", fontSize: 16, fontFamily: "inherit" }}>✕</button>
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
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Message (optional)</div>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Anything else the dealer should know..."
                    rows={2} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
                </div>
              </div>

              {error && <div style={{ fontSize: 12, color: C.red, marginTop: 12, background: "#FEE2E2", padding: "8px 12px", borderRadius: 10 }}>⚠ {error}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1.5px solid ${C.border}`, color: C.ink3, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={handleSubmit} disabled={loading}
                  style={{ flex: 2, background: loading ? C.ink3 : C.green, border: "none", color: "#fff", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {loading ? "Submitting…" : "Get My Offer"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
