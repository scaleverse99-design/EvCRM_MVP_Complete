"use client"
import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { C, fmt } from "../../lib/constants"
import { bookTestDrive } from "../../lib/payments/tokenBooking"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"

/* ── Responsive styles injected once ──────────────────────────────── */
const MOBILE_STYLES = `
  .showroom-hero-title { font-size: 48px; font-weight: 900; letter-spacing: -1.5px; margin-bottom: 12px; }
  .showroom-hero-subtitle { font-size: 16px; opacity: 0.6; max-width: 600px; margin: 0 auto; }
  .showroom-filter-bar { max-width: 1200px; margin: 0 auto; padding: 16px 24px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
  .showroom-vehicle-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 32px; }
  .showroom-detail-grid { max-width: 1000px; margin: 0 auto; padding: 40px; display: grid; grid-template-columns: 1fr 400px; gap: 40px; }
  .showroom-detail-specs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .showroom-detail-hero-name { font-size: 40px; }
  @media (max-width: 768px) {
    .showroom-hero-title { font-size: 28px; letter-spacing: -0.8px; }
    .showroom-hero-subtitle { font-size: 14px; padding: 0 16px; }
    .showroom-filter-bar { padding: 12px 16px; gap: 10px; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
    .showroom-filter-bar::-webkit-scrollbar { display: none; }
    .showroom-vehicle-grid { grid-template-columns: 1fr; gap: 20px; }
    .showroom-detail-grid { grid-template-columns: 1fr; padding: 20px 16px; gap: 24px; }
    .showroom-detail-specs { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .showroom-detail-hero-name { font-size: 26px; }
  }
  @media (max-width: 480px) {
    .showroom-hero-title { font-size: 24px; }
    .showroom-filter-bar select { font-size: 12px; padding: 7px 10px; min-width: 100px; }
  }
`

const TYPE_ICON = { "2W": "🛵", "4W": "🚗", "3W": "🛺" }

/* ── Vehicle card (light theme) ──────────────────────────────────── */
function VehicleCard({ v, onView, onBook }) {
  const hasPhoto = v.images && v.images.length > 0 && v.images[0] && v.images[0] !== "🚗" && v.images[0] !== "🛵" && v.images[0] !== "🛺"

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s" }}>
      <div onClick={() => onView(v)} style={{ cursor: "pointer", position: "relative", background: "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)", height: 160, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {hasPhoto ? (
          <img src={v.images[0]} alt={`${v.brand} ${v.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 64 }}>{TYPE_ICON[v.type] || "🚗"}</div>
        )}
        {(v.tags || [])[0] && (
          <span style={{ position: "absolute", top: 10, left: 10, background: C.green, color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" }}>{v.tags[0]}</span>
        )}
        <span style={{ position: "absolute", top: 10, right: 10, background: v.condition === "new" ? "#D1FAE5" : "#FEF3C7", color: v.condition === "new" ? "#065F46" : "#92400E", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
          {v.condition === "new" ? "NEW" : `${v.km?.toLocaleString()} km`}
        </span>
      </div>
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4 }}>{v.brand} · {v.bodyType}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginBottom: 10, cursor: "pointer" }} onClick={() => onView(v)}>{v.model}</div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.ink3, marginBottom: 14, flexWrap: "wrap" }}>
          {(!v.fuelType || v.fuelType === "Electric") ? (
            <>
              <span>🔋 {v.range} km</span>
              <span>⚡ {v.topSpeed} km/h</span>
            </>
          ) : (
            <span>⛽ {v.fuelType}</span>
          )}
          {v.rating ? <span>⭐ {v.rating}</span> : null}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 2 }}>
          {fmt.currency(v.exShowroom || v.price)}
          {v.onRoadPrice ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginLeft: 8 }}>
              (On-Road: {fmt.currency(v.onRoadPrice)})
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 11, color: C.ink3, marginBottom: 14 }}>🏪 {v.dealerName} · {v.district}</div>
        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <button onClick={() => onView(v)} style={{ flex: 1, background: "#F3F4F6", border: `1px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>View Details</button>
          <button onClick={() => onBook({ vehicle: v, mode: "testdrive" })} style={{ flex: 1.5, background: C.green, border: "none", color: "#fff", borderRadius: 12, padding: "10px 0", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Book Test Drive →</button>
        </div>
      </div>
    </div>
  )
}

/* ── Booking modal ────────────────────────────────────────────────── */
function BookingModal({ vehicle, mode = "testdrive", onClose }) {
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [date, setDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState("")

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const maxDate = new Date(Date.now() + 48 * 3600000).toISOString().split("T")[0]

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("evcrm_customer")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setName(parsed.name || "")
          setPhone(parsed.phone || "")
          setEmail(parsed.email || "")
          setProfileLoaded(true)
        } catch (e) {
          // ignore
        }
      }
    }
  }, [])

  const handleClearProfile = () => {
    localStorage.removeItem("evcrm_customer")
    setName("")
    setPhone("")
    setEmail("")
    setProfileLoaded(false)
    setError("")
  }

  const handleBook = async () => {
    if (!name.trim() || !phone.trim() || !email.trim()) { 
      setError("Name, Phone, and Gmail are required"); 
      return 
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Enter a valid Gmail/email address");
      return;
    }
    setError(""); setLoading(true)
    try {
      const booking = await bookTestDrive({ vehicleId: vehicle.id, name: name.trim(), phone: phone.trim(), email: email.trim(), preferredDate: date || null, payToken: mode === "reserve" })
      // Auto-register/save profile details for future bookings
      localStorage.setItem("evcrm_customer", JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }))
      setSuccess(booking)
    } catch (e) { setError(e.message || "Booking failed") }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContext: "center", padding: 20, justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 30px 100px rgba(0,0,0,0.25)" }}>
        {success ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
              {mode === "reserve" ? "Vehicle Reserved!" : "Test Drive Booked!"}
            </div>
            <div style={{ fontSize: 14, color: C.ink3, marginBottom: 20, lineHeight: 1.6 }}>
              {mode === "reserve" ? (
                <>Your token booking for <b style={{ color: C.ink }}>{success.vehicleName}</b> is confirmed.<br />The dealer <b style={{ color: C.ink }}>{success.dealerName}</b> will reserve this vehicle for you.</>
              ) : (
                <>Your test drive request for <b style={{ color: C.ink }}>{success.vehicleName}</b> is confirmed.<br />The dealer <b style={{ color: C.ink }}>{success.dealerName}</b> will call you within 2 hours.</>
              )}
            </div>
            {mode === "reserve" && (
              <div style={{ background: "#F0FDF4", border: `1px solid ${C.green}30`, borderRadius: 14, padding: "14px 20px", marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4 }}>Token Amount (Hold vehicle 48hrs)</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>₹1,000</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>Adjustable against final purchase price</div>
              </div>
            )}
            {mode === "reserve" && (
              success.viaGateway === false ? (
                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "10px 16px", marginBottom: 24, fontSize: 12, color: "#92400E", textAlign: "left" }}>
                  ⚠️ The dealer will collect the ₹1,000 token when you visit — your booking is already confirmed.
                </div>
              ) : (
                <div style={{ background: "#F0FDF4", border: `1px solid ${C.green}30`, borderRadius: 12, padding: "10px 16px", marginBottom: 24, fontSize: 12, color: "#065F46", textAlign: "left" }}>
                  ✓ Your ₹1,000 is held securely by Razorpay — released to the dealer only once your test drive is confirmed, refunded automatically if you cancel.
                </div>
              )
            )}
            <button onClick={onClose} style={{ background: C.ink, border: "none", color: "#fff", borderRadius: 14, padding: "14px 40px", fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>Done ✓</button>
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
                  {mode === "reserve" ? "Book & Reserve Vehicle" : "Book Free Test Drive"}
                </div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{vehicle.brand} {vehicle.model} · {vehicle.dealerName}</div>
              </div>
              <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", color: C.ink3, borderRadius: 10, width: 32, height: 32, cursor: "pointer", fontSize: 16, fontFamily: "inherit" }}>✕</button>
            </div>
            
            <div style={{ padding: "20px 24px" }}>
              {/* Show ₹1000 Booking Info */}
              {mode === "reserve" && (
                <div style={{ background: "#F0FDF4", border: `1px solid ${C.green}30`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>₹1,000</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Token Amount</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>Holds vehicle for 48hrs · Adjustable on purchase</div>
                  </div>
                </div>
              )}

              {profileLoaded && (
                <div style={{ background: "#F3F4F6", border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 12px", marginBottom: 16, fontSize: 11, color: C.ink2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>👤 Profile loaded (Auto-filled details)</span>
                  <button onClick={handleClearProfile} style={{ background: "none", border: "none", color: C.red, fontSize: 11, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Clear</button>
                </div>
              )}

              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { label: "Your Name *", val: name, set: setName, ph: "Full name" },
                  { label: "Phone Number *", val: phone, set: setPhone, ph: "10-digit mobile number", type: "tel" },
                  { label: "Gmail Address *", val: email, set: setEmail, ph: "yourname@gmail.com", type: "email" },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>{f.label}</div>
                    <input type={f.type || "text"} value={f.val} onChange={e => { f.set(e.target.value); if(profileLoaded) setProfileLoaded(false); }} placeholder={f.ph}
                      style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Preferred Date (within 48hrs)</div>
                  <input type="date" value={date} min={tomorrow} max={maxDate} onChange={e => setDate(e.target.value)}
                    style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>

              {error && <div style={{ fontSize: 12, color: C.red, marginTop: 12, background: "#FEE2E2", padding: "8px 12px", borderRadius: 10 }}>⚠ {error}</div>}
              
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1.5px solid ${C.border}`, color: C.ink3, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={handleBook} disabled={loading}
                  style={{ flex: 2, background: loading ? C.ink3 : C.green, border: "none", color: "#fff", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {loading ? "Processing…" : mode === "reserve" ? "Pay ₹1,000 & Confirm" : "Confirm Test Drive Booking"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Inspection booking modal ────────────────────────────────────── */
function InspectionModal({ vehicle, onClose }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [inspDate, setInspDate] = useState("")
  const [inspTime, setInspTime] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState("")

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const maxDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]

  const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"]

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("evcrm_customer")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setName(parsed.name || "")
          setPhone(parsed.phone || "")
          setEmail(parsed.email || "")
        } catch (e) { /* ignore */ }
      }
    }
  }, [])

  const handleBook = async () => {
    if (!name.trim() || !phone.trim()) { setError("Name and Phone are required"); return }
    if (phone.replace(/\D/g, "").length < 10) { setError("Enter a valid 10-digit phone number"); return }
    if (!inspDate) { setError("Please select an inspection date"); return }
    if (!inspTime) { setError("Please select a time slot"); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch("/api/marketplace/inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, name: name.trim(), phone: phone.trim(), email: email.trim(), inspectionDate: inspDate, inspectionTime: inspTime, message: message.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Booking failed")
      localStorage.setItem("evcrm_customer", JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }))
      setSuccess(data.booking)
    } catch (e) { setError(e.message || "Booking failed") }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 30px 100px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
        {success ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Inspection Visit Booked!</div>
            <div style={{ fontSize: 14, color: C.ink3, marginBottom: 20, lineHeight: 1.6 }}>
              Your mechanic inspection for <b style={{ color: C.ink }}>{success.vehicleName}</b> is confirmed.<br />
              Visit <b style={{ color: C.ink }}>{success.dealerName}</b> with your mechanic on the scheduled date.
            </div>
            <div style={{ background: "#EFF6FF", border: "1px solid #3B82F6", borderRadius: 14, padding: "14px 20px", marginBottom: 16, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>Date</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#2563EB" }}>{new Date(success.inspectionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>Time</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#2563EB" }}>{success.inspectionTime}</span>
              </div>
            </div>
            <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 12, padding: "10px 16px", marginBottom: 24, fontSize: 12, color: "#92400E", textAlign: "left" }}>
              🔧 Bring your trusted mechanic to the dealership. The dealer will make the vehicle available for inspection. No charges from EvCRM or the dealer.
            </div>
            <button onClick={onClose} style={{ background: C.ink, border: "none", color: "#fff", borderRadius: 14, padding: "14px 40px", fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>🔍 Book Mechanic Inspection</div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{vehicle.brand} {vehicle.model} · {vehicle.dealerName}</div>
              </div>
              <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", color: C.ink3, borderRadius: 10, width: 32, height: 32, cursor: "pointer", fontSize: 16, fontFamily: "inherit" }}>✕</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF", marginBottom: 4 }}>How it works</div>
                <div style={{ fontSize: 11, color: "#3B82F6", lineHeight: 1.5 }}>
                  1. Pick a date & time below<br/>
                  2. Bring your own trusted mechanic<br/>
                  3. The dealer will keep the vehicle ready<br/>
                  4. No charges from the dealer or EvCRM
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { label: "Your Name *", val: name, set: setName, ph: "Full name" },
                  { label: "Phone Number *", val: phone, set: setPhone, ph: "10-digit mobile number", type: "tel" },
                  { label: "Email (for confirmation)", val: email, set: setEmail, ph: "yourname@gmail.com", type: "email" },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>{f.label}</div>
                    <input type={f.type || "text"} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                ))}

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Inspection Date *</div>
                  <input type="date" value={inspDate} min={tomorrow} max={maxDate} onChange={e => setInspDate(e.target.value)}
                    style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Preferred Time Slot *</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {TIME_SLOTS.map(slot => (
                      <button key={slot} onClick={() => setInspTime(slot)}
                        style={{ background: inspTime === slot ? "#2563EB" : "#F3F4F6", color: inspTime === slot ? "#fff" : C.ink2, border: inspTime === slot ? "1.5px solid #2563EB" : `1.5px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Message to dealer (optional)</div>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Any specific concerns about the vehicle..."
                    rows={2} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
                </div>
              </div>

              {error && <div style={{ fontSize: 12, color: C.red, marginTop: 12, background: "#FEE2E2", padding: "8px 12px", borderRadius: 10 }}>⚠ {error}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1.5px solid ${C.border}`, color: C.ink3, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={handleBook} disabled={loading}
                  style={{ flex: 2, background: loading ? C.ink3 : "#2563EB", border: "none", color: "#fff", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {loading ? "Booking..." : "Confirm Inspection Visit"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── EMI calculator — pure client-side, standard reducing-balance formula ── */
// Feature flag: EMI figures are illustrative only and we have no finance-provider
// tie-up yet, so the whole EMI surface (calculator card + "EMI starts at" panel
// block) is hidden until a real provider is wired up. Flip to true to re-enable.
const EMI_ENABLED = false

function EMICalculator({ price }) {
  const [downPayment, setDownPayment] = useState(Math.round(price * 0.2))
  const [months, setMonths] = useState(36)
  const rate = 0.105 // 10.5% p.a., matches typical EV loan rates — illustrative only
  const principal = Math.max(price - downPayment, 0)
  const r = rate / 12
  const emi = principal > 0 ? Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)) : 0
  const totalPayable = emi * months
  const totalInterest = Math.max(totalPayable - principal, 0)

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 24, padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: C.ink, marginBottom: 18 }}>💳 EMI Calculator</div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.ink3, marginBottom: 6 }}>
          <span>Down Payment</span><span style={{ fontWeight: 800, color: C.ink }}>{fmt.currency(downPayment)}</span>
        </div>
        <input type="range" min={0} max={price} step={5000} value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} style={{ width: "100%", accentColor: C.green }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.ink3, marginBottom: 6 }}>
          <span>Loan Duration</span><span style={{ fontWeight: 800, color: C.ink }}>{months} months</span>
        </div>
        <input type="range" min={12} max={84} step={6} value={months} onChange={e => setMonths(Number(e.target.value))} style={{ width: "100%", accentColor: C.green }} />
      </div>
      <div style={{ background: C.bg, borderRadius: 16, padding: 18, textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5 }}>Estimated EMI</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.green, marginTop: 4 }}>{fmt.currency(emi)}<span style={{ fontSize: 13, color: C.ink3, fontWeight: 700 }}>/mo</span></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.ink3, padding: "6px 0" }}>
        <span>Principal</span><span style={{ fontWeight: 700, color: C.ink }}>{fmt.currency(principal)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.ink3, padding: "6px 0" }}>
        <span>Total Interest</span><span style={{ fontWeight: 700, color: C.ink }}>{fmt.currency(totalInterest)}</span>
      </div>
      <p style={{ fontSize: 9.5, color: C.ink3, marginTop: 10, lineHeight: 1.5 }}>Illustrative at ~10.5% p.a. Actual rate depends on your credit profile and lender.</p>
    </div>
  )
}

/* ── Product detail panel — Cars24 style ─────────────────────────── */
const DETAIL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  .sd-page { font-family: 'DM Sans','Segoe UI',sans-serif; background: #F5F5F5; min-height: 100vh; }
  .sd-nav { background: #fff; border-bottom: 1px solid #E5E7EB; padding: 0 24px; position: sticky; top: 0; z-index: 200; display: flex; align-items: center; gap: 16px; height: 56px; }
  .sd-body { max-width: 1160px; margin: 0 auto; padding: 24px 20px 80px; display: grid; grid-template-columns: 1fr 380px; gap: 28px; align-items: start; }
  .sd-img-main { width: 100%; height: 380px; object-fit: cover; border-radius: 0; display: block; }
  .sd-img-emoji { height: 380px; display: flex; align-items: center; justify-content: center; font-size: 130px; background: linear-gradient(135deg,#F3F4F6,#E5E7EB); }
  .sd-thumb-row { display: flex; gap: 0; background: #1a1a1a; }
  .sd-thumb { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 6px; cursor: pointer; border-right: 1px solid #333; transition: background 0.15s; gap: 5px; border-bottom: 3px solid transparent; }
  .sd-thumb:last-child { border-right: none; }
  .sd-thumb.active { border-bottom-color: #22C55E; }
  .sd-thumb img { width: 44px; height: 32px; object-fit: cover; border-radius: 4px; }
  .sd-panel { background: #fff; border-radius: 16px; border: 1px solid #E5E7EB; overflow: hidden; position: sticky; top: 72px; }
  .sd-tag { display: inline-flex; align-items: center; gap: 5px; background: #F3F4F6; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: #374151; white-space: nowrap; }
  .sd-trust-row { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #F0FDF4; border-top: 1px solid #BBF7D0; border-bottom: 1px solid #BBF7D0; flex-wrap: wrap; }
  .sd-trust-badge { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #166534; }
  .sd-trust-sep { width: 1px; height: 14px; background: #86EFAC; }
  .sd-highlights { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  .sd-highlight-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 18px 16px; }
  .sd-tab { padding: 12px 0; border-bottom: 3px solid transparent; font-size: 14px; font-weight: 600; color: #6B7280; cursor: pointer; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; transition: color 0.15s; }
  .sd-tab.active { color: #111; border-bottom-color: #22C55E; }
  .sd-overview-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; }
  .sd-ov-cell { display: flex; flex-direction: column; gap: 4px; padding: 16px 0; border-right: 1px solid #E5E7EB; padding-right: 20px; margin-right: 20px; }
  .sd-ov-cell:last-child { border-right: none; }
  .sd-feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .sd-specs-tbl { width: 100%; border-collapse: collapse; }
  .sd-specs-tbl td { padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 13px; }
  .sd-specs-tbl td:first-child { color: #6B7280; width: 50%; }
  .sd-specs-tbl td:last-child { font-weight: 700; color: #111; }
  .sd-book-btn { width: 100%; background: #22C55E; color: #fff; border: none; border-radius: 14px; padding: 16px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; transition: background 0.15s; }
  .sd-book-btn:hover { background: #16A34A; }
  .sd-reserve-btn { width: 100%; background: #fff; color: #111; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 14px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; margin-top: 10px; transition: border-color 0.15s; }
  .sd-reserve-btn:hover { border-color: #22C55E; color: #16A34A; }
  .sd-similar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 16px; }
  @media (max-width: 900px) {
    .sd-body { grid-template-columns: 1fr; }
    .sd-panel { position: static; }
    .sd-img-main { height: 260px; }
    .sd-img-emoji { height: 260px; }
    .sd-highlights { grid-template-columns: 1fr 1fr; }
    .sd-overview-row { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 480px) {
    .sd-body { padding: 12px 12px 80px; gap: 16px; }
    .sd-highlights { grid-template-columns: 1fr; }
    .sd-overview-row { grid-template-columns: 1fr; }
    .sd-feat-grid { grid-template-columns: 1fr; }
  }
`

function ProductDetail({ v, vehicles = [], onBack, onView, onBook }) {
  const [activeImg, setActiveImg] = useState(0)
  const [bookingMode, setBookingMode] = useState(null)
  const [showInspection, setShowInspection] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [showBreakup, setShowBreakup] = useState(false)
  const validImages = Array.isArray(v.images) ? v.images.filter(x => x !== "🚗" && x !== "🛵" && x !== "🛺") : []
  const hasPhotos = validImages.length > 0
  const featureList = Array.isArray(v.features) ? v.features.filter(Boolean) : []
  const similar = vehicles.filter(x => x.id !== v.id && x.type === v.type).slice(0, 4)

  const imgCategories = hasPhotos ? validImages.map(url => ({ url })) : []

  // "Great things" highlights based on vehicle data
  const highlights = [
    v.range      && { icon: "🔋", title: `${v.range} km real-world range`, sub: "ARAI certified range, real-world tested" },
    v.condition === "new" && { icon: "✨", title: "Brand new vehicle", sub: "Direct from showroom, zero km" },
    v.condition !== "new" && v.km && { icon: "📍", title: `${v.km?.toLocaleString()} km driven`, sub: v.km < 25000 ? "Lightly used, high value" : "Well maintained" },
    v.batteryCapacity && { icon: "⚡", title: v.batteryCapacity + " battery", sub: "Efficient energy storage" },
    v.warrantyYears   && { icon: "🛡️", title: `${v.warrantyYears}-year warranty`, sub: "Manufacturer backed coverage" },
    v.chargingTime    && { icon: "🔌", title: v.chargingTime + " charge", sub: "Fast charge compatible" },
    featureList.length > 0 && { icon: "🎯", title: "Premium features", sub: featureList.slice(0,2).join(", ") },
  ].filter(Boolean).slice(0, 6)

  const emiApprox = v.exShowroom ? Math.round((v.exShowroom * 0.8 * 0.00875 * Math.pow(1.00875,36))/(Math.pow(1.00875,36)-1)) : null

  return (
    <div className="sd-page">
      <style>{DETAIL_STYLES}</style>

      {/* ── Top Nav ── */}
      <nav className="sd-nav">
        <button onClick={onBack} style={{ background: "none", border: "1px solid #E5E7EB", color: "#374151", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#111" }}>EvCRM <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7280" }}>Marketplace</span></div>
      </nav>

      <div className="sd-body">
        {/* ── LEFT: Image + Content ── */}
        <div>
          {/* Image Block */}
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #E5E7EB", marginBottom: 20 }}>
            {hasPhotos ? (
              <>
                <div style={{ position: "relative" }}>
                  <img src={validImages[activeImg]} alt={`${v.brand} ${v.model}`} className="sd-img-main" />
                  {(v.tags||[])[0] && (
                    <span style={{ position: "absolute", top: 14, left: 14, background: "#22C55E", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>{v.tags[0]}</span>
                  )}
                  <span style={{ position: "absolute", top: 14, right: 14, background: v.condition === "new" ? "#DCFCE7" : "#FEF3C7", color: v.condition === "new" ? "#166534" : "#92400E", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
                    {v.condition === "new" ? "NEW" : `${v.km?.toLocaleString()} km`}
                  </span>
                </div>
                {imgCategories.length > 1 && (
                  <div className="sd-thumb-row">
                    {imgCategories.map((cat, i) => (
                      <button key={i} className={`sd-thumb${activeImg === i ? " active" : ""}`} onClick={() => setActiveImg(i)}>
                        <img src={cat.url} alt={`${v.brand} ${v.model} photo ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="sd-img-emoji">{TYPE_ICON[v.type] || "🚗"}</div>
            )}
          </div>

          {/* Title + Tags */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 20px 0", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, marginBottom: 6 }}>{(v.fuelType && v.fuelType !== "Electric") ? "CERTIFIED STOCK" : "EV.CRM CERTIFIED STOCK"}</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
              {v.year && <span style={{ fontWeight: 500 }}>{v.year} </span>}{v.brand} {v.model} <span style={{ fontWeight: 500, color: "#6B7280" }}>{v.variant}</span>
            </h1>
            {/* Pill tags */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {v.range      ? <span className="sd-tag">⚡ {v.range} km</span> : null}
              {v.condition !== "new" && v.km ? <span className="sd-tag">📍 {v.km?.toLocaleString()} km</span> : null}
              {v.condition === "new"  ? <span className="sd-tag">✨ New</span> : null}
              {v.bodyType   ? <span className="sd-tag">{v.bodyType}</span> : null}
              {v.color      ? <span className="sd-tag">🎨 {v.color}</span> : null}
              {v.topSpeed   ? <span className="sd-tag">🏎 {v.topSpeed} km/h</span> : null}
            </div>
            {/* Location */}
            <div style={{ fontSize: 13, color: "#6B7280", paddingBottom: 16, borderBottom: "1px solid #F3F4F6" }}>
              📍 {[v.dealerName, v.district, v.state].filter(Boolean).join(", ")}
            </div>
            {/* Trust badges — "Certified" and warranty are dealer-controlled, not shown by
                default. Free Test Drive is an always-true platform fact, so it always shows. */}
            <div className="sd-trust-row">
              {v.certified ? <><span className="sd-trust-badge">✅ EV.CRM Certified</span><span className="sd-trust-sep" /></> : null}
              {v.warrantyYears ? <><span className="sd-trust-badge">🛡️ {v.warrantyYears}yr Warranty</span><span className="sd-trust-sep" /></> : null}
              <span className="sd-trust-badge">🗓 Free Test Drive</span>
            </div>
          </div>

          {/* ── Great Things About This EV ── */}
          {highlights.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 20, marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111", margin: "0 0 16px" }}>{(v.fuelType && v.fuelType !== "Electric") ? "Great things about this Vehicle" : "Great things about this EV"}</h2>
              <div className="sd-highlights">
                {highlights.map((h, i) => (
                  <div key={i} className="sd-highlight-card">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{h.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>{h.title}</div>
                    <div style={{ fontSize: 12, color: "#22C55E", fontWeight: 600 }}>{h.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Inspection Report (used vehicles only) ── */}
          {v.condition === "used" && v.inspectionReport?.categories && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111", margin: 0 }}>🔍 Inspection Report</h2>
                {v.inspectionReport.overallGrade && (
                  <span style={{ background: "#F0FDF4", color: "#059669", fontSize: 13, fontWeight: 800, padding: "5px 14px", borderRadius: 20, border: "1px solid #BBF7D0" }}>
                    Overall Grade: {v.inspectionReport.overallGrade}
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {v.inspectionReport.categories.map(cat => (
                  <div key={cat.name}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#111", marginBottom: 8 }}>{cat.name}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {cat.items.map(it => {
                        const color = it.rating === "Poor" ? "#DC2626" : it.rating === "Fair" ? "#D97706" : "#059669"
                        return (
                          <div key={it.item} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5 }}>
                            <span style={{ color: "#4B5563" }}>{it.item}</span>
                            <span style={{ color, fontWeight: 700 }}>{it.rating}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 24, padding: "0 20px", borderBottom: "1px solid #F3F4F6" }}>
              {[["overview","Overview"],["specs","Specs & Details"],["features","Features"]].map(([id,label]) => (
                <button key={id} className={`sd-tab${activeTab===id?" active":""}`} onClick={() => setActiveTab(id)}>{label}</button>
              ))}
            </div>

            <div style={{ padding: 20 }}>
              {activeTab === "overview" && (
                <>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#111", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>Vehicle Overview</h3>
                  <div className="sd-overview-row">
                    {[
                      { icon: "📅", label: "Reg. Year", val: v.year },
                      { icon: (!v.fuelType || v.fuelType === "Electric") ? "⚡" : "⛽", label: "Vehicle Type", val: (!v.fuelType || v.fuelType === "Electric") ? (v.type === "4W" ? "Electric Car" : v.type === "2W" ? "Electric 2W" : "Electric 3W") : `${v.fuelType} ${v.type === "4W" ? "Car" : v.type === "2W" ? "2W" : "3W"}` },
                      { icon: "📍", label: "KM Driven", val: v.condition === "new" ? "0 km (New)" : `${v.km?.toLocaleString()} km` },
                      { icon: "🎨", label: "Colour", val: v.color || "—" },
                      { icon: "🚘", label: "Body Type", val: v.bodyType || "—" },
                      { icon: "🏙", label: "Location", val: [v.district, v.state].filter(Boolean).join(", ") || "—" },
                    ].filter(r => r.val).map((r, i) => (
                      <div key={i} className="sd-ov-cell">
                        <div style={{ fontSize: 20 }}>{r.icon}</div>
                        <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{r.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{r.val}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "specs" && (
                <>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#111", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>Technical Specifications</h3>
                  <table className="sd-specs-tbl">
                    <tbody>
                      {[
                        ["Real-World Range", v.range ? `${v.range} km` : null],
                        ["Battery Capacity", v.batteryCapacity],
                        ["Top Speed", v.topSpeed ? `${v.topSpeed} km/h` : null],
                        ["Charging Time", v.chargingTime],
                        ["Seating Capacity", v.seatingCapacity ? `${v.seatingCapacity} seats` : null],
                        ["Boot Space", v.bootSpace],
                        ["Ground Clearance", v.groundClearance],
                        ["Warranty", v.warrantyYears ? `${v.warrantyYears} years` : null],
                        ["Year", v.year],
                        ["Body Type", v.bodyType],
                        ["Variant", v.variant],
                        ["Colour", v.color],
                        ["Condition", v.condition === "new" ? "Brand New" : `Used · ${v.km?.toLocaleString()} km`],
                      ].filter(([, val]) => val).map(([label, val]) => (
                        <tr key={label}>
                          <td>{label}</td>
                          <td>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {activeTab === "features" && (
                <>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#111", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>Key Features</h3>
                  {featureList.length > 0 ? (
                    <div className="sd-feat-grid">
                      {featureList.map((feat, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#374151", padding: "6px 0" }}>
                          <span style={{ color: "#22C55E", fontWeight: 900, flexShrink: 0, marginTop: 1 }}>✓</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#9CA3AF", fontSize: 13 }}>No features listed for this vehicle.</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* EMI Calculator — hidden behind EMI_ENABLED until a finance provider is tied up */}
          {EMI_ENABLED && (
            <div id="sd-emi-calc" style={{ marginTop: 0 }}>
              <EMICalculator price={v.exShowroom || v.price || 0} />
            </div>
          )}
        </div>

        {/* ── RIGHT: Sticky Booking Panel ── */}
        <aside>
          <div className="sd-panel">
            {/* Price section */}
            <div style={{ padding: "20px 20px 16px" }}>
              {EMI_ENABLED && emiApprox && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>EMI starts at</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#111" }}>₹{emiApprox.toLocaleString("en-IN")}<span style={{ fontSize: 14, fontWeight: 600, color: "#6B7280" }}>/mo</span></div>
                    <button onClick={() => {
                      // Instant scroll on purpose: smooth-behavior scrolling silently
                      // no-ops on this page (verified — smooth lands at 0, auto lands
                      // correctly), so don't "upgrade" this back to behavior:"smooth".
                      const el = document.getElementById("sd-emi-calc")
                      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "auto" })
                    }} style={{ background: "none", border: "none", color: "#22C55E", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Check EMI →</button>
                  </div>
                </div>
              )}
              <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Ex-showroom</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#111", letterSpacing: "-0.5px" }}>{fmt.currency(v.exShowroom || v.price)}</div>
                  </div>
                  {v.onRoadPrice ? (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>On-Road (est.)</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#374151" }}>{fmt.currency(v.onRoadPrice)}</div>
                    </div>
                  ) : null}
                </div>
                {v.onRoadPrice ? (
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                    + {fmt.currency(v.onRoadPrice - (v.exShowroom || v.price))} other charges
                    <button onClick={() => setShowBreakup(s => !s)} style={{ background: "none", border: "none", color: "#22C55E", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginLeft: 4 }}>
                      {showBreakup ? "Hide breakup ↑" : "Price breakup →"}
                    </button>
                  </div>
                ) : null}
                {showBreakup && v.onRoadPrice ? (
                  <div style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
                    {[
                      ["Ex-showroom price", v.exShowroom || v.price],
                      ["RTO, insurance & other charges", v.onRoadPrice - (v.exShowroom || v.price)],
                    ].map(([label, amt]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", padding: "4px 0" }}>
                        <span>{label}</span><span style={{ fontWeight: 700, color: "#374151" }}>{fmt.currency(amt)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0 2px", borderTop: "1px solid #E5E7EB", marginTop: 4 }}>
                      <span style={{ fontWeight: 700, color: "#111" }}>On-road total (est.)</span>
                      <span style={{ fontWeight: 900, color: "#111" }}>{fmt.currency(v.onRoadPrice)}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Trust — "Certified EV" only when the dealer marks it; Safe Booking + Refundable
                Token are always-true platform facts. */}
            <div style={{ background: "#F0FDF4", borderTop: "1px solid #BBF7D0", borderBottom: "1px solid #BBF7D0", padding: "10px 20px", display: "flex", gap: 14, flexWrap: "wrap" }}>
              {v.certified ? <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>✅ Certified EV</span> : null}
              <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>🔒 Safe Booking</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>↩ Refundable Token</span>
            </div>

            {/* Dealer */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>DEALER</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{v.dealerName}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>📍 {[v.district, v.state].filter(Boolean).join(", ")}</div>
            </div>

            {/* CTA Buttons */}
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="sd-book-btn" onClick={() => setBookingMode("testdrive")}>
                🗓 Book free test drive
              </button>
              <button className="sd-reserve-btn" onClick={() => setBookingMode("reserve")}>
                ⚡ Reserve Vehicle (₹1,000)
              </button>
              {v.condition !== "new" && (
                <button onClick={() => setShowInspection(true)}
                  style={{ width: "100%", background: "#EFF6FF", color: "#2563EB", border: "1.5px solid #BFDBFE", borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s" }}>
                  🔍 Book Mechanic Inspection
                </button>
              )}
              <p style={{ textAlign: "center", fontSize: 10, color: "#9CA3AF", margin: "4px 0 0", lineHeight: 1.5 }}>
                {v.condition !== "new"
                  ? "Bring your own mechanic to inspect before you buy"
                  : "Token of ₹1,000 is fully adjustable against the final purchase price"}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Similar EVs ── */}
      {similar.length > 0 && (
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 20px 60px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111", marginBottom: 16 }}>{(v.fuelType && v.fuelType !== "Electric") ? "Similar Vehicles You Might Like" : "Similar EVs You Might Like"}</h2>
          <div className="sd-similar-grid">
            {similar.map(s => (
              <div key={s.id} onClick={() => onView(s)} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s" }}>
                <div style={{ height: 120, background: "linear-gradient(135deg,#F3F4F6,#E5E7EB)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {Array.isArray(s.images) && s.images[0] && s.images[0] !== "🚗" && s.images[0] !== "🛵" && s.images[0] !== "🛺"
                    ? <img src={s.images[0]} alt={s.model} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ fontSize: 44 }}>{TYPE_ICON[s.type] || "🚗"}</div>}
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{s.brand}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 4 }}>{s.model}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#22C55E" }}>{fmt.currency(s.exShowroom || s.price)}</div>
                  {s.range && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>⚡ {s.range} km range</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingMode && <BookingModal vehicle={v} mode={bookingMode} onClose={() => setBookingMode(null)} />}
      {showInspection && <InspectionModal vehicle={v} onClose={() => setShowInspection(false)} />}
    </div>
  )
}

// Deep-link support: /showroom?vehicleId=X (shared from blog articles,
// dealer inventory "View" links, sitemap/IndexNow) opens straight into that
// vehicle's detail view instead of the generic list. Isolated in its own
// component so only this leaf needs the Suspense boundary useSearchParams()
// requires for static prerendering — the rest of the page renders normally.
function VehicleIdSync({ vehicles, onMatch }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    const vehicleId = searchParams?.get("vehicleId")
    if (!vehicleId || vehicles.length === 0) return
    const match = vehicles.find(v => v.id === vehicleId)
    if (match) {
      onMatch(match)
      // Strip the param once applied — otherwise clicking "Back" out of the
      // detail view would find it in the URL again and immediately reopen it.
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, vehicles, onMatch, router, pathname])
  return null
}

/* ── Main page ─────────────────────────────────────────────────────── */
export default function ShowroomPage() {
  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters] = useState({ brands: [], districts: [] })
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState("All")
  const [brand, setBrand] = useState("All Brands")
  const [fuelType, setFuelType] = useState("All Fuel Types")
  const [viewing, setViewing] = useState(null)
  const [bookVehicle, setBookVehicle] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (type !== "All") params.set("type", type)
      if (brand !== "All Brands") params.set("brand", brand)
      if (fuelType !== "All Fuel Types") params.set("fuelType", fuelType)
      const res = await fetch(`/api/marketplace/vehicles?${params}`)
      const data = await res.json()
      if (data.success) { setVehicles(data.vehicles); setFilters(data.filters) }
    } finally { setLoading(false) }
  }, [type, brand, fuelType])

  useEffect(() => { load() }, [load])

  const brands = ["All Brands", ...(filters.brands || [])]

  if (viewing) return <ProductDetail v={viewing} vehicles={vehicles} onBack={() => setViewing(null)} onView={setViewing} onBook={setBookVehicle} />

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#FAFAFA" }}>
      <Suspense fallback={null}>
        <VehicleIdSync vehicles={vehicles} onMatch={setViewing} />
      </Suspense>
      <style>{MOBILE_STYLES}</style>
      <TopBar />
      <div style={{ background: C.ink, padding: "48px 20px", textAlign: "center", color: "#fff" }}>
        <h1 className="showroom-hero-title">Expert Vetted Marketplace</h1>
        <p className="showroom-hero-subtitle">Discover high-performance electric mobility, hand-picked by EV.OS intelligence for the Indian road.</p>
      </div>

      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 56, zIndex: 80 }}>
        <div className="showroom-filter-bar">
          <span style={{ fontSize: 12, fontWeight: 900, color: C.ink2, whiteSpace: "nowrap" }}>FILTERS:</span>
          <select value={type} onChange={e => setType(e.target.value)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, fontFamily: "inherit", minWidth: 110 }}>
            {["All", "2W", "4W", "3W"].map(t => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
          </select>
          <select value={brand} onChange={e => setBrand(e.target.value)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, fontFamily: "inherit", minWidth: 120 }}>
            {brands.map(b => <option key={b}>{b}</option>)}
          </select>
          <select value={fuelType} onChange={e => setFuelType(e.target.value)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, fontFamily: "inherit", minWidth: 130 }}>
            {["All Fuel Types", "Electric", "Petrol", "Diesel", "CNG", "Hybrid"].map(f => <option key={f}>{f}</option>)}
          </select>
          <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.ink3, whiteSpace: "nowrap" }}>{vehicles.length} Models Found</div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: C.ink3 }}>Loading live inventory…</div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: C.ink3 }}>No vehicles match these filters.</div>
        ) : (
          <div className="showroom-vehicle-grid">
            {vehicles.map(v => <VehicleCard key={v.id} v={v} onView={setViewing} onBook={setBookVehicle} />)}
          </div>
        )}
      </div>
      <Footer />

      {bookVehicle && <BookingModal vehicle={bookVehicle.vehicle} mode={bookVehicle.mode} onClose={() => { setBookVehicle(null); load() }} />}
    </div>
  )
}
