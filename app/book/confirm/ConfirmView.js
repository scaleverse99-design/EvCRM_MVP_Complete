"use client"
// The human confirmation step for an MCP-originated booking.
//
// The AI never creates a booking — it hands the user a signed link that
// lands here. Nothing is written until this form is submitted, which is what
// makes it safe to expose book_test_drive on a public, unauthenticated MCP
// server. See lib/mcp/bookingIntent.js.
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { C, fmt } from "../../../lib/constants"

export default function ConfirmView() {
  const token = useSearchParams().get("token")

  const [vehicle, setVehicle] = useState(null)
  const [preferredDate, setPreferredDate] = useState("")
  const [loadErr, setLoadErr] = useState(null)
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    if (!token) { setLoadErr("This link is missing its token."); return }
    fetch(`/api/marketplace/book/confirm?token=${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || "This booking link is not valid.")
        return d
      })
      .then(d => { setVehicle(d.vehicle); setPreferredDate(d.preferredDate || "") })
      .catch(e => setLoadErr(e.message))
  }, [token])

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true); setSubmitErr(null)
    try {
      const r = await fetch("/api/marketplace/book/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form, preferredDate }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Could not confirm the booking.")
      setDone(d)
    } catch (e) {
      setSubmitErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const wrap = { minHeight: "100vh", background: C.bg, padding: "40px 16px" }
  const card = { maxWidth: 520, margin: "0 auto", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 28 }
  const input = { width: "100%", padding: "11px 13px", fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 12, boxSizing: "border-box" }

  if (loadErr) return (
    <div style={wrap}><div style={{ ...card, textAlign: "center" }}>
      <div style={{ fontSize: 38, marginBottom: 10 }}>🔗</div>
      <h2 style={{ color: C.red, margin: "0 0 8px", fontSize: 19 }}>{loadErr}</h2>
      <p style={{ fontSize: 13.5, color: C.ink3, lineHeight: 1.6 }}>
        Booking links expire after a short time. Ask your assistant for a fresh one, or browse the marketplace directly.
      </p>
      <Link href="/showroom" style={{ display: "inline-block", marginTop: 16, background: C.green, color: "#fff", borderRadius: 22, padding: "11px 24px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>Browse vehicles →</Link>
    </div></div>
  )

  if (done) return (
    <div style={wrap}><div style={{ ...card, textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
      <h2 style={{ margin: "0 0 6px", fontSize: 21, color: C.ink }}>
        {done.alreadyConfirmed ? "Already confirmed" : "Test drive booked"}
      </h2>
      <p style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>
        {done.booking.vehicleName}
        {done.booking.preferredDate ? <> on <strong>{done.booking.preferredDate}</strong></> : null}
        {done.booking.dealerName ? <><br />with {done.booking.dealerName}</> : null}
      </p>
      <p style={{ fontSize: 12.5, color: C.ink3, marginTop: 12 }}>
        The dealer will call you to confirm the slot. Reference: {done.booking.id}
      </p>
      <Link href="/showroom" style={{ display: "inline-block", marginTop: 18, background: C.green, color: "#fff", borderRadius: 22, padding: "11px 24px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>Browse more vehicles →</Link>
    </div></div>
  )

  if (!vehicle) return <div style={wrap}><div style={{ ...card, textAlign: "center", color: C.ink3 }}>Loading booking details…</div></div>

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
          Confirm your test drive
        </div>
        <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 18px", lineHeight: 1.6 }}>
          Nothing has been booked yet. Add your details below and the dealer will call you to confirm.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 18 }}>
          {vehicle.image
            ? <img src={vehicle.image} alt={vehicle.name} style={{ width: 78, height: 58, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
            : <div style={{ width: 78, height: 58, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, background: "#F3F4F6", borderRadius: 8, flexShrink: 0 }}>🚗</div>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink }}>{vehicle.name}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {vehicle.dealerName} · {vehicle.city}
            </div>
            {vehicle.exShowroom ? <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginTop: 3 }}>{fmt.currency(vehicle.exShowroom)}</div> : null}
          </div>
        </div>

        <form onSubmit={submit}>
          <input style={input} placeholder="Your name *" value={form.name} required
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={input} placeholder="Mobile number *" value={form.phone} required inputMode="numeric"
            onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input style={input} placeholder="Email (optional)" type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
          <input style={input} type="date" value={preferredDate || ""}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => setPreferredDate(e.target.value)} />
          <textarea style={{ ...input, minHeight: 70, resize: "vertical" }} placeholder="Anything the dealer should know? (optional)"
            value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />

          {submitErr && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{submitErr}</div>}

          <button type="submit" disabled={submitting}
            style={{ width: "100%", background: submitting ? C.ink3 : C.green, color: "#fff", border: "none", borderRadius: 24, padding: "13px 0", fontSize: 14, fontWeight: 800, cursor: submitting ? "default" : "pointer" }}>
            {submitting ? "Confirming…" : "Confirm test drive"}
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: C.ink3, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
          No payment is taken here. The dealer will contact you to arrange the slot.
        </p>
      </div>
    </div>
  )
}
