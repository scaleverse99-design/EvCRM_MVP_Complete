"use client"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { C, fmt } from "../../lib/constants"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { bookTestDrive } from "../../lib/payments/tokenBooking"

// Hosted booking page — the "Stripe Checkout" pattern for dealer storefronts.
// A dealer's own domain (custom domain or evcrm.in/{slug}) keeps their own
// branding for browsing, but the actual booking transaction happens here,
// on evcrm.in, then bounces back to wherever the customer came from. This
// keeps the transaction-critical flow (token payments, booking records) on
// one domain regardless of how many dealer domains exist, and means every
// dealer storefront — custom domain or not — funnels through evcrm.in at
// the moment that matters most.
function BookingPageContent() {
  const params = useSearchParams()
  const vehicleId = params.get("vehicleId")
  const mode = params.get("mode") === "reserve" ? "reserve" : "testdrive"
  const returnTo = params.get("returnTo") ? decodeURIComponent(params.get("returnTo")) : null

  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [date, setDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [success, setSuccess] = useState(null)

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const maxDate = new Date(Date.now() + 48 * 3600000).toISOString().split("T")[0]

  useEffect(() => {
    if (!vehicleId) { setLoadError("No vehicle specified"); setLoading(false); return }
    fetch("/api/marketplace/vehicles")
      .then(r => r.json())
      .then(d => {
        const v = (d.vehicles || []).find(x => x.id === vehicleId)
        if (!v) setLoadError("Vehicle not found")
        else setVehicle(v)
      })
      .catch(() => setLoadError("Failed to load vehicle"))
      .finally(() => setLoading(false))
  }, [vehicleId])

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !email.trim()) { setSubmitError("Name, phone, and email are required"); return }
    if (phone.replace(/\D/g, "").length < 10) { setSubmitError("Enter a valid 10-digit phone number"); return }
    if (!email.includes("@") || !email.includes(".")) { setSubmitError("Enter a valid email address"); return }
    setSubmitError(""); setSubmitting(true)
    try {
      const booking = await bookTestDrive({ vehicleId, name: name.trim(), phone: phone.trim(), email: email.trim(), preferredDate: date || null, payToken: mode === "reserve" })
      setSuccess(booking)
    } catch (e) { setSubmitError(e.message || "Booking failed") }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return <div style={{ padding: "4rem", textAlign: "center", color: C.ink3 }}>Loading…</div>
  }

  if (loadError || !vehicle) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <TopBar />
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
          <h2 style={{ color: C.red, margin: 0 }}>{loadError || "Vehicle not found"}</h2>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <TopBar />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 16px 60px" }}>
        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          {success ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
                {mode === "reserve" ? "Vehicle Reserved!" : "Test Drive Booked!"}
              </div>
              <div style={{ fontSize: 14, color: C.ink3, marginBottom: 24, lineHeight: 1.6 }}>
                Your booking for <b style={{ color: C.ink }}>{vehicle.brand} {vehicle.model}</b> is confirmed.<br />
                <b style={{ color: C.ink }}>{vehicle.dealerName}</b> will contact you shortly.
              </div>
              {returnTo ? (
                <a href={`${returnTo}?booked=1`}
                  style={{ display: "block", background: C.ink, color: "#fff", borderRadius: 14, padding: "14px 40px", fontSize: 14, fontWeight: 800, textDecoration: "none", fontFamily: "inherit" }}>
                  ← Return to {vehicle.dealerName}
                </a>
              ) : (
                <div style={{ fontSize: 12, color: C.ink3 }}>You can close this page now.</div>
              )}
            </div>
          ) : (
            <>
              <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.5 }}>🔒 Secure Booking · Ev.CRM</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginTop: 4 }}>
                  {mode === "reserve" ? "Reserve Vehicle" : "Book Free Test Drive"}
                </div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{vehicle.brand} {vehicle.model} · {vehicle.dealerName}</div>
              </div>

              <div style={{ padding: "20px 24px" }}>
                {mode === "reserve" && (
                  <div style={{ background: "#F0FDF4", border: `1px solid ${C.green}30`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>₹1,000</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Token Amount</div>
                      <div style={{ fontSize: 11, color: C.ink3 }}>Holds vehicle 48hrs · Adjustable on purchase</div>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    { label: "Your Name *", val: name, set: setName, ph: "Full name" },
                    { label: "Phone Number *", val: phone, set: setPhone, ph: "10-digit mobile number", type: "tel" },
                    { label: "Email Address *", val: email, set: setEmail, ph: "yourname@gmail.com", type: "email" },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>{f.label}</div>
                      <input type={f.type || "text"} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                        style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Preferred Date (within 48hrs)</div>
                    <input type="date" value={date} min={tomorrow} max={maxDate} onChange={e => setDate(e.target.value)}
                      style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, color: C.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                </div>

                {submitError && <div style={{ fontSize: 12, color: C.red, marginTop: 12, background: "#FEE2E2", padding: "8px 12px", borderRadius: 10 }}>⚠ {submitError}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  {returnTo && (
                    <a href={returnTo} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: `1.5px solid ${C.border}`, color: C.ink3, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "inherit" }}>
                      Cancel
                    </a>
                  )}
                  <button onClick={handleSubmit} disabled={submitting}
                    style={{ flex: returnTo ? 2 : 1, background: submitting ? C.ink3 : C.green, border: "none", color: "#fff", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {submitting ? "Processing…" : mode === "reserve" ? "Pay ₹1,000 & Confirm" : "Confirm Test Drive Booking"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center" }}>Loading…</div>}>
      <BookingPageContent />
    </Suspense>
  )
}
