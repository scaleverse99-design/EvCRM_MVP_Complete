"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { C, fmt } from "../../lib/constants"
import { bookTestDrive } from "../../lib/payments/tokenBooking"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"

const TYPE_ICON = { "2W": "🛵", "4W": "🚗", "3W": "🛺" }

/* ── Vehicle card (light theme) ──────────────────────────────────── */
function VehicleCard({ v, onView, onBook }) {
  const hasPhoto = v.images && v.images.length > 0 && v.images[0] && v.images[0] !== "🚗" && v.images[0] !== "🛵" && v.images[0] !== "🛺"

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s" }}>
      <div onClick={() => onView(v)} style={{ cursor: "pointer", position: "relative", background: "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)", height: 160, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {hasPhoto ? (
          <img src={v.images[0]} alt={`${v.brand} ${v.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 64 }}>{TYPE_ICON[v.type] || "🚗"}</div>
        )}
        {(v.tags || [])[0] && (
          <span style={{ position: "absolute", top: 12, left: 12, background: C.green, color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" }}>{v.tags[0]}</span>
        )}
        <span style={{ position: "absolute", top: 12, right: 12, background: v.condition === "new" ? "#D1FAE5" : "#FEF3C7", color: v.condition === "new" ? "#065F46" : "#92400E", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
          {v.condition === "new" ? "NEW" : `${v.km?.toLocaleString()} km`}
        </span>
      </div>
      <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4 }}>{v.brand} · {v.bodyType}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginBottom: 10, cursor: "pointer" }} onClick={() => onView(v)}>{v.model}</div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.ink3, marginBottom: 14 }}>
          <span>🔋 {v.range} km</span>
          <span>⚡ {v.topSpeed} km/h</span>
          {v.rating ? <span>⭐ {v.rating}</span> : null}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 2 }}>
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

/* ── Product detail panel ─────────────────────────────────────────── */
function ProductDetail({ v, onBack, onBook }) {
  const [activeImg, setActiveImg] = useState(0)
  const validImages = Array.isArray(v.images) ? v.images.filter(x => x !== "🚗" && x !== "🛵" && x !== "🛺") : []
  const hasPhotos = validImages.length > 0

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#FAFAFA" }}>
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: "#F3F4F6", border: "none", color: C.ink, borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit" }}>← BACK</button>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.ink }}>EV<span style={{ color: C.green }}>.CRM</span> Marketplace</div>
        <div style={{ width: 70 }} />
      </div>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 40, display: "grid", gridTemplateColumns: "1fr 400px", gap: 40 }}>
        <div>
          <div style={{ background: "#fff", borderRadius: 32, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", marginBottom: 32, overflow: "hidden" }}>
            {hasPhotos ? (
              <div>
                <div style={{ width: "100%", height: 260, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
                  <img src={validImages[activeImg] || validImages[0]} alt={`${v.brand} ${v.model}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                {validImages.length > 1 && (
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                    {validImages.map((imgUrl, i) => (
                      <button key={i} onClick={() => setActiveImg(i)} style={{ width: 60, height: 45, borderRadius: 8, border: i === activeImg ? `2px solid ${C.green}` : `1px solid ${C.border}`, overflow: "hidden", padding: 0, cursor: "pointer", background: "none" }}>
                        <img src={imgUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 120, margin: "20px 0" }}>{TYPE_ICON[v.type] || "🚗"}</div>
            )}
            <h1 style={{ fontSize: 40, fontWeight: 900, color: C.ink, margin: 0 }}>{v.brand} {v.model}</h1>
            <p style={{ fontSize: 16, color: C.ink3, marginTop: 8 }}>{v.variant} · {v.bodyType}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[{ l: "REAL RANGE", v: `${v.range}km`, i: "🔋" }, { l: "TOP SPEED", v: `${v.topSpeed}km/h`, i: "⚡" }, { l: "BATTERY", v: v.batteryCapacity || "—", i: "🔌" }].map((s, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 24, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 10 }}>{s.i}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.ink }}>{s.v}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <aside>
          <div style={{ background: C.ink, borderRadius: 32, padding: 32, color: "#fff", position: "sticky", top: 100 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6EE7B7", textTransform: "uppercase", letterSpacing: 1, marginBottom: 24 }}>Price</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
              <span style={{ fontSize: 14, opacity: 0.6 }}>Ex-showroom</span>
              <span style={{ fontSize: 28, fontWeight: 900, color: "#6EE7B7" }}>{fmt.currency(v.exShowroom || v.price)}</span>
            </div>
            {v.onRoadPrice ? (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px dashed rgba(255,255,255,0.15)" }}>
                <span style={{ fontSize: 14, opacity: 0.6 }}>On-Road</span>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#6EE7B7" }}>{fmt.currency(v.onRoadPrice)}</span>
              </div>
            ) : null}
            {v.emi ? (
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>EMI from {fmt.currency(v.emi)}/mo</div>
            ) : null}
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 16 }}>🏪 {v.dealerName} · {v.district}</div>
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => onBook({ vehicle: v, mode: "testdrive" })} style={{ width: "100%", background: "#fff", color: C.ink, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 16, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                🗓 BOOK FREE TEST DRIVE
              </button>
              <button onClick={() => onBook({ vehicle: v, mode: "reserve" })} style={{ width: "100%", background: C.green, color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
                ⚡ RESERVE VEHICLE (₹1,000)
              </button>
              <p style={{ textAlign: "center", fontSize: 10, opacity: 0.5, margin: "4px 0 0" }}>
                Token is fully adjustable against the final purchase price
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────────── */
export default function ShowroomPage() {
  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters] = useState({ brands: [], districts: [] })
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState("All")
  const [brand, setBrand] = useState("All Brands")
  const [viewing, setViewing] = useState(null)
  const [bookVehicle, setBookVehicle] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (type !== "All") params.set("type", type)
      if (brand !== "All Brands") params.set("brand", brand)
      const res = await fetch(`/api/marketplace/vehicles?${params}`)
      const data = await res.json()
      if (data.success) { setVehicles(data.vehicles); setFilters(data.filters) }
    } finally { setLoading(false) }
  }, [type, brand])

  useEffect(() => { load() }, [load])

  const brands = ["All Brands", ...(filters.brands || [])]

  if (viewing) return <ProductDetail v={viewing} onBack={() => setViewing(null)} onBook={setBookVehicle} />

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#FAFAFA" }}>
      <TopBar />
      <div style={{ background: C.ink, padding: "60px 24px", textAlign: "center", color: "#fff" }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 12 }}>Expert Vetted Marketplace</h1>
        <p style={{ fontSize: 16, opacity: 0.6, maxWidth: 600, margin: "0 auto" }}>Discover high-performance electric mobility, hand-picked by EV.OS intelligence for the Indian road.</p>
      </div>

      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 70, zIndex: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: C.ink2 }}>FILTERS:</span>
          <select value={type} onChange={e => setType(e.target.value)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
            {["All", "2W", "4W", "3W"].map(t => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
          </select>
          <select value={brand} onChange={e => setBrand(e.target.value)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
            {brands.map(b => <option key={b}>{b}</option>)}
          </select>
          <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.ink3 }}>{vehicles.length} Models Found</div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 100, color: C.ink3 }}>Loading live inventory…</div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 100, color: C.ink3 }}>No vehicles match these filters.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 32 }}>
            {vehicles.map(v => <VehicleCard key={v.id} v={v} onView={setViewing} onBook={setBookVehicle} />)}
          </div>
        )}
      </div>
      <Footer />

      {bookVehicle && <BookingModal vehicle={bookVehicle.vehicle} mode={bookVehicle.mode} onClose={() => { setBookVehicle(null); load() }} />}
    </div>
  )
}
