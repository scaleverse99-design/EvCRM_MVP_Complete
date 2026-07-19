"use client"
import { useEffect, useState } from "react"
import { C } from "../../lib/constants"
import TopBar from "../home/TopBar"
import Footer from "../home/Footer"
import SellCarForm from "./SellCarForm"

// Standalone, full-page "Sell Your Car" form at evcrm.in/{slug}/sell — a
// dealer's own shareable link for offline customers (walk-in, phone,
// WhatsApp). Deliberately independent of the storefront's sellCarEnabled
// toggle (that flag only controls the public button on the storefront
// page itself) — a dealer choosing to send this link out is itself the
// opt-in, so the link always works for any Used Car Dealer's slug.
export default function SellCarPageClient({ dealerSlug }) {
  const [dealer, setDealer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/dealer/resolve-domain?domain=${dealerSlug}.evcrm.in`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setDealer(d.dealer))
      .catch(() => setError("Dealer not found"))
      .finally(() => setLoading(false))
  }, [dealerSlug])

  if (loading) {
    return <div style={{ padding: "4rem", textAlign: "center", color: C.ink3 }}>Loading…</div>
  }

  if (error || !dealer || dealer.dealerCategory !== "ICE") {
    return (
      <div style={{ minHeight: "100vh" }}>
        <TopBar hideLogo={true} />
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
          <h2 style={{ color: C.red, margin: 0 }}>This link isn't available</h2>
          <p style={{ color: C.ink3, marginTop: 8 }}>The dealer may not have this feature enabled, or the link is incorrect.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <TopBar hideLogo={true} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px 60px" }}>
        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <SellCarForm dealership={dealer.dealership} dealerName={dealer.dealershipName} source="Shared Link" />
        </div>
      </div>
      <Footer />
    </div>
  )
}
