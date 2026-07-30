"use client"
import { useState } from "react"
import { C, fmt } from "../../lib/constants"

const ISSUE_TYPES = ["Motor issue", "Battery concern", "Charging issue", "Software update", "Tyre/Brakes", "Noise", "Other"]
const MAX_ATTACH_BYTES = 3 * 1024 * 1024 // 3MB total

const STATUS_META = {
  OPEN:          { label: "Waiting for dealer", color: "#F97316", bg: "#FFEDD5" },
  IN_PROGRESS:   { label: "Dealer responded",   color: "#3B82F6", bg: "#DBEAFE" },
  RESOLVED:      { label: "Resolved",           color: "#059669", bg: "#D1FAE5" },
  ESCALATED_OEM: { label: "Escalated to OEM",   color: "#8B5CF6", bg: "#EDE9FE" },
}

function fmtDT(iso) {
  return iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"
}

export default function MyGaragePage() {
  // auth flow
  const [step, setStep]       = useState("phone")   // phone → otp → portal
  const [phone, setPhone]     = useState("")
  const [otp, setOtp]         = useState("")
  const [demoOtp, setDemoOtp] = useState(null)
  const [token, setToken]     = useState(null)
  const [busy, setBusy]       = useState(false)
  const [errMsg, setErrMsg]   = useState("")

  // portal data
  const [bookings, setBookings] = useState([])
  const [quotes, setQuotes]     = useState([])
  const [requests, setRequests] = useState([])
  const [tab, setTab]           = useState("orders") // orders | raise | requests

  // raise-request form
  const [form, setForm] = useState({ vehicle: "", orderId: "", dealership: "", issueType: "Motor issue", description: "" })
  const [attachments, setAttachments] = useState([])
  const [submitted, setSubmitted] = useState(false)

  const requestOtp = async () => {
    setErrMsg(""); setBusy(true)
    try {
      const r = await fetch("/api/service/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) })
      const d = await r.json()
      if (!r.ok) { setErrMsg(d.error || "Failed to send OTP"); return }
      setDemoOtp(d.demo_otp || null)
      setStep("otp")
    } catch { setErrMsg("Network error — try again") }
    finally { setBusy(false) }
  }

  const verifyOtp = async () => {
    setErrMsg(""); setBusy(true)
    try {
      const r = await fetch("/api/service/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, otp }) })
      const d = await r.json()
      if (!r.ok) { setErrMsg(d.error || "Invalid OTP"); return }
      setToken(d.token)
      setBookings(d.bookings || [])
      setQuotes(d.quotes || [])
      setRequests(d.requests || [])
      // Pre-fill the request form from the most recent purchase
      const latest = (d.bookings || [])[0]
      if (latest) setForm(f => ({ ...f, vehicle: latest.vehicleName, orderId: latest.id, dealership: latest.dealership }))
      setStep("portal")
    } catch { setErrMsg("Network error — try again") }
    finally { setBusy(false) }
  }

  const handleFiles = (e) => {
    const files = [...(e.target.files || [])]
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setAttachments(prev => {
          const next = [...prev, { name: file.name, type: file.type, data: ev.target.result }]
          const total = next.reduce((s, a) => s + a.data.length, 0)
          if (total > MAX_ATTACH_BYTES) { alert("Attachments too large — keep photos/videos under 3MB total"); return prev }
          return next
        })
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  const submitRequest = async () => {
    if (!form.description.trim()) { setErrMsg("Please describe the issue"); return }
    setErrMsg(""); setBusy(true)
    try {
      const booking = bookings.find(b => b.id === form.orderId)
      const r = await fetch("/api/service/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName: booking?.name || quotes[0]?.customerName || "Customer",
          vehicle: form.vehicle, orderId: form.orderId || null,
          dealership: form.dealership || booking?.dealership || "hyd-d01",
          orderDetails: booking ? { vehicleName: booking.vehicleName, dealerName: booking.dealerName, bookedAt: booking.createdAt, tokenAmount: booking.tokenAmount, status: booking.status } : null,
          issueType: form.issueType, description: form.description, attachments,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setErrMsg(d.error || "Failed to submit"); return }
      setRequests(q => [d.request, ...q])
      setAttachments([]); setForm(f => ({ ...f, description: "" }))
      setSubmitted(true)
    } catch { setErrMsg("Network error — try again") }
    finally { setBusy(false) }
  }

  const inputSt = { width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "13px 14px", fontSize: 15, color: C.ink, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }
  const cardSt  = { background: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFB", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} button:focus{outline:none}`}</style>

      {/* Header */}
      <div style={{ background: C.greenD || "#065F46", padding: "16px 20px 14px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Ev<span style={{ color: "#6EE7B7" }}>.CRM</span></div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>MyGarage — Orders & Service Portal</div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "18px 16px 48px" }}>

        {errMsg && <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 600, marginBottom: 14 }}>⚠ {errMsg}</div>}

        {/* ── STEP 1: phone ── */}
        {step === "phone" && (
          <div style={cardSt}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Sign in with your mobile number</div>
            <div style={{ fontSize: 12, color: C.ink3, marginBottom: 16, lineHeight: 1.6 }}>Use the number you gave at the time of purchase — we'll show your orders and let you raise service requests.</div>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" inputMode="numeric" style={{ ...inputSt, marginBottom: 12 }} />
            <button onClick={requestOtp} disabled={busy} style={{ width: "100%", background: C.greenD || "#065F46", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              {busy ? "Sending…" : "Send OTP"}
            </button>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === "otp" && (
          <div style={cardSt}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Enter the OTP</div>
            <div style={{ fontSize: 12, color: C.ink3, marginBottom: 14 }}>Sent to +91 {phone.replace(/\D/g, "").slice(-10)}</div>
            {demoOtp && (
              <div style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#854D0E", marginBottom: 12 }}>
                🔧 Demo mode (no SMS gateway yet): your OTP is <b>{demoOtp}</b>
              </div>
            )}
            <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" inputMode="numeric" maxLength={6}
              style={{ ...inputSt, marginBottom: 12, letterSpacing: 6, textAlign: "center", fontWeight: 800, fontSize: 20 }} />
            <button onClick={verifyOtp} disabled={busy} style={{ width: "100%", background: C.greenD || "#065F46", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
              {busy ? "Verifying…" : "Verify & Continue"}
            </button>
            <button onClick={() => setStep("phone")} style={{ width: "100%", background: "none", border: "none", color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Change number</button>
          </div>
        )}

        {/* ── STEP 3: portal ── */}
        {step === "portal" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 4 }}>
              {[["orders", "My Orders"], ["raise", "Raise Request"], ["requests", `My Requests${requests.length ? ` (${requests.length})` : ""}`]].map(([id, label]) => (
                <button key={id} onClick={() => { setTab(id); setSubmitted(false) }}
                  style={{ flex: 1, background: tab === id ? (C.greenD || "#065F46") : "none", color: tab === id ? "#fff" : C.ink2, border: "none", borderRadius: 9, padding: "11px 4px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Orders */}
            {tab === "orders" && (
              bookings.length === 0 && quotes.length === 0 ? (
                <div style={{ ...cardSt, textAlign: "center", padding: 32 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🛵</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>No purchases found for this number</div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 6 }}>You can still raise a service request for your vehicle.</div>
                </div>
              ) : (
                <>
                  {bookings.map(b => (
                    <div key={b.id} style={cardSt}>
                      <div style={{ fontSize: 10, color: C.ink3, marginBottom: 4 }}>ORDER {b.id.toUpperCase()}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: C.ink }}>{b.vehicleName}</div>
                      <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 3 }}>{b.dealerName} · Booked {fmtDT(b.createdAt)}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                        <span style={{ background: "#D1FAE5", color: "#065F46", fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "4px 12px" }}>{b.status}</span>
                        {b.tokenAmount ? <span style={{ fontSize: 11, color: C.ink3 }}>Token paid: ₹{b.tokenAmount.toLocaleString("en-IN")}</span> : null}
                      </div>
                    </div>
                  ))}
                  {quotes.map(q => (
                    <div key={q.id} style={cardSt}>
                      <div style={{ fontSize: 10, color: C.ink3, marginBottom: 4 }}>QUOTE #{q.quoteId}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{q.vehicleName}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#065F46", marginTop: 6 }}>{fmt.currency(q.netPrice)}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                        <span style={{ background: q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded" ? "#D1FAE5" : "#F3F4F6", color: q.customerResponse ? "#065F46" : C.ink3, fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "4px 12px" }}>
                          {q.customerResponse === "docs_uploaded" ? "DOCS UPLOADED" : (q.customerResponse || "sent").toUpperCase()}
                        </span>
                        <a href={`/quote/${q.id}`} style={{ fontSize: 11, fontWeight: 700, color: "#065F46" }}>View quote →</a>
                      </div>
                    </div>
                  ))}
                </>
              )
            )}

            {/* Raise request */}
            {tab === "raise" && (submitted ? (
              <div style={{ ...cardSt, textAlign: "center", padding: 32 }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#065F46", marginBottom: 8 }}>Request submitted!</div>
                <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.7, marginBottom: 18 }}>Your dealer has been notified with your order details. Track the response under <b>My Requests</b>.</div>
                <button onClick={() => setTab("requests")} style={{ background: C.greenD || "#065F46", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>View My Requests</button>
              </div>
            ) : (
              <div style={cardSt}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 14 }}>Raise Service Request</div>

                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink3, marginBottom: 6 }}>VEHICLE</div>
                {bookings.length > 0 ? (
                  <select value={form.orderId} onChange={e => { const b = bookings.find(x => x.id === e.target.value); setForm(f => ({ ...f, orderId: e.target.value, vehicle: b?.vehicleName || f.vehicle, dealership: b?.dealership || f.dealership })) }}
                    style={{ ...inputSt, marginBottom: 12 }}>
                    {bookings.map(b => <option key={b.id} value={b.id}>{b.vehicleName}</option>)}
                  </select>
                ) : (
                  <input value={form.vehicle} onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))} placeholder="Your vehicle (e.g. Ather 450X)" style={{ ...inputSt, marginBottom: 12 }} />
                )}

                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink3, marginBottom: 8 }}>ISSUE TYPE</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                  {ISSUE_TYPES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, issueType: t }))}
                      style={{ background: form.issueType === t ? "#D1FAE5" : "#F8FAFB", border: `1.5px solid ${form.issueType === t ? "#065F46" : C.border}`, color: form.issueType === t ? "#065F46" : C.ink2, borderRadius: 9, padding: "9px 14px", fontSize: 12, fontWeight: form.issueType === t ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>
                  ))}
                </div>

                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink3, marginBottom: 6 }}>DESCRIBE YOUR ISSUE</div>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Motor making grinding noise since yesterday, power drops at speed…"
                  style={{ ...inputSt, minHeight: 100, resize: "none", lineHeight: 1.6, marginBottom: 14 }} />

                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink3, marginBottom: 6 }}>PHOTOS / VIDEO (OPTIONAL)</div>
                {attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {attachments.map((a, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        {a.type.startsWith("image") ? (
                          <img src={a.data} alt={a.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border}` }} />
                        ) : (
                          <div style={{ width: 64, height: 64, borderRadius: 10, border: `1px solid ${C.border}`, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎥</div>
                        )}
                        <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                          style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#EF4444", color: "#fff", border: "none", fontSize: 11, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{ display: "block", background: "#F8FAFB", border: `1.5px dashed ${C.border}`, borderRadius: 12, padding: 16, textAlign: "center", cursor: "pointer", marginBottom: 16 }}>
                  <input type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: "none" }} />
                  <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.ink2 }}>Add photos or a short video</div>
                  <div style={{ fontSize: 10, color: C.ink3, marginTop: 2 }}>Helps the service team diagnose faster · max 3MB</div>
                </label>

                <button onClick={submitRequest} disabled={busy}
                  style={{ width: "100%", background: C.greenD || "#065F46", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  {busy ? "Submitting…" : "Submit Service Request"}
                </button>
              </div>
            ))}

            {/* My requests */}
            {tab === "requests" && (
              requests.length === 0 ? (
                <div style={{ ...cardSt, textAlign: "center", padding: 32 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔧</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>No service requests yet</div>
                </div>
              ) : requests.map(r => {
                const sm = STATUS_META[r.status] || STATUS_META.OPEN
                return (
                  <div key={r.id} style={cardSt}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{r.issueType} · {r.vehicle}</div>
                        <div style={{ fontSize: 10.5, color: C.ink3, marginTop: 2 }}>Raised {fmtDT(r.createdAt)}</div>
                      </div>
                      <span style={{ background: sm.bg, color: sm.color, fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap" }}>{sm.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.6, marginBottom: 10 }}>{r.description}</div>
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                      {(r.timeline || []).slice().reverse().map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: C.ink3, marginBottom: 5 }}>
                          <span style={{ flexShrink: 0 }}>{fmtDT(t.at)}</span>
                          <span style={{ color: C.ink2 }}>{t.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}
      </div>
    </div>
  )
}
