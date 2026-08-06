"use client"
import { useState, useEffect, useCallback } from "react"
import { Card, Btn, Input, SectionHeading, EmptyState } from "../ui"
import { C } from "../../lib/constants"
import { authFetch } from "../../lib/token-storage"

export default function OffersSection({ dealership }) {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState(null)

  const [title, setTitle] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [applicableVehicle, setApplicableVehicle] = useState("")
  const [validDays, setValidDays] = useState("7")
  const [windowDays, setWindowDays] = useState("60")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/dealer/offers?dealership=${dealership}`)
      const data = await res.json()
      if (data.success) setOffers(data.offers)
    } finally {
      setLoading(false)
    }
  }, [dealership])

  useEffect(() => { if (dealership) load() }, [dealership, load])

  const handleCreate = async () => {
    if (!title.trim() || !discountAmount || Number(discountAmount) <= 0) return
    setCreating(true)
    setResult(null)
    try {
      const res = await authFetch("/api/dealer/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealership,
          title: title.trim(),
          discountAmount: Number(discountAmount),
          applicableVehicle: applicableVehicle.trim() || undefined,
          validDays: Number(validDays) || 7,
          windowDays: Number(windowDays) || 60,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
        setTitle("")
        setDiscountAmount("")
        setApplicableVehicle("")
        await load()
      } else {
        setResult({ error: data.error || "Failed to create offer" })
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <SectionHeading>Announce an Offer</SectionHeading>
      <p style={{ fontSize: 12, color: C.ink3, marginBottom: 16, lineHeight: 1.6 }}>
        Any customer who said no (or never replied) in the last {windowDays || 60} days gets their price
        auto-updated and you get notified to reach out again. New offers always replace old ones on the
        same quote — they never stack. Set how many days this offer stays valid; after that, prices
        automatically revert.
      </p>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="OFFER TITLE" placeholder="e.g. ₹15,000 off all Ather 450X this week" value={title} onChange={e => setTitle(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="DISCOUNT AMOUNT (₹)" type="number" placeholder="15000" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
            <Input label="APPLIES TO (OPTIONAL)" placeholder="e.g. Ather 450X — leave blank for all vehicles" value={applicableVehicle} onChange={e => setApplicableVehicle(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="OFFER VALID FOR (DAYS)" type="number" placeholder="7" value={validDays} onChange={e => setValidDays(e.target.value)} hint="Price auto-reverts after this" />
            <Input label="RE-ENGAGE LEADS FROM LAST (DAYS)" type="number" placeholder="60" value={windowDays} onChange={e => setWindowDays(e.target.value)} hint="How far back to check rejected quotes" />
          </div>
          <Btn onClick={handleCreate} loading={creating} disabled={!title.trim() || !discountAmount}>
            Announce Offer & Re-engage Leads →
          </Btn>
        </div>
      </Card>

      {result?.error && (
        <div style={{ background: "#FEF2F2", border: `1px solid ${C.red}40`, borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 12, color: C.red }}>
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <Card style={{ marginBottom: 20, background: C.greenL, border: `1px solid ${C.green}30` }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.greenD, marginBottom: 8 }}>✅ Offer live</div>
          <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.8 }}>
            {result.matchedCount} matching lead{result.matchedCount === 1 ? "" : "s"} found · {result.updatedCount} re-priced and notified
            {result.emailsSent > 0 && ` · ${result.emailsSent} email${result.emailsSent === 1 ? "" : "s"} sent`}
          </div>
          {result.whatsappLinks?.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>Tap to send WhatsApp update</div>
              {result.whatsappLinks.map(w => (
                <a key={w.quoteId} href={w.waLink} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", textDecoration: "none" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{w.customerName || "Customer"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#25D366" }}>💬 Send →</span>
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      <SectionHeading>Offer History</SectionHeading>
      {loading ? (
        <div style={{ fontSize: 12, color: C.ink3, padding: 20, textAlign: "center" }}>Loading…</div>
      ) : offers.length === 0 ? (
        <EmptyState icon="🏷️" title="No offers yet" sub="Announce your first offer above to start re-engaging rejected leads." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {offers.map(o => (
            <Card key={o.id} noPad style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>
                    ₹{o.discountAmount?.toLocaleString("en-IN")} off{o.applicableVehicle ? ` · ${o.applicableVehicle}` : " · all vehicles"} · valid {o.validDays || 7} days
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.ink3 }}>{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginTop: 2 }}>{o.reengagement?.updatedCount || 0} leads re-engaged</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
