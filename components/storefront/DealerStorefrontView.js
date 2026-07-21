"use client"

import { useEffect, useState } from "react"
import { C, fmt } from "../../lib/constants"
import TopBar from "../home/TopBar"
import SellCarModal from "../marketplace/SellCarModal"

// Renders a dealer's white-label storefront. `domainOverride`, when given,
// is sent as the `domain` param to resolve-domain instead of the browser's
// hostname — this lets the same component serve both real subdomains/custom
// domains (hostname-based, via middleware rewrite) and path-based
// storefronts like evcrm.in/{slug} (which fabricate "{slug}.evcrm.in" so
// the existing subdomain-matching logic in resolve-domain just works).
export default function DealerStorefrontView({ domainOverride }) {
  const [dealer, setDealer] = useState(null)
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSellCar, setShowSellCar] = useState(false)
  const [justBooked, setJustBooked] = useState(false)

  useEffect(() => {
    const fetchDealerData = async () => {
      try {
        setLoading(true)

        const domain = domainOverride || (typeof window !== "undefined" ? window.location.hostname : "")

        const response = await fetch(`/api/dealer/resolve-domain?domain=${domain}`)
        if (!response.ok) {
          setError("Dealer storefront not found")
          setLoading(false)
          return
        }

        const data = await response.json()
        setDealer(data.dealer)
        setInventory(data.inventoryItems || [])
      } catch (err) {
        console.error("Failed to load dealer storefront:", err)
        setError("Failed to load dealer information")
      } finally {
        setLoading(false)
      }
    }

    fetchDealerData()

    // The hosted booking page (evcrm.in/booking) bounces the customer back
    // here with ?booked=1 once their booking succeeds — see app/booking/page.js.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("booked") === "1") {
      setJustBooked(true)
    }
  }, [domainOverride])

  // Every booking transaction (test drive / reserve) happens on evcrm.in
  // itself — not on the dealer's own domain — even when the customer got
  // here via a custom domain. Same pattern as a hosted payment checkout:
  // the dealer keeps their own branding for browsing, but the sensitive
  // transaction always runs on our domain, then bounces back here after.
  const bookVehicle = (vehicleId, mode = "testdrive") => {
    // origin + pathname (not just origin) — a custom domain's storefront is
    // always at "/", but a path-based one (evcrm.in/{slug}) lives at
    // "/{slug}"; origin alone would bounce the customer back to the
    // evcrm.in homepage instead of the actual storefront they came from.
    const returnTo = encodeURIComponent(window.location.origin + window.location.pathname)
    window.location.href = `https://evcrm.in/booking?vehicleId=${vehicleId}&mode=${mode}&returnTo=${returnTo}`
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Loading storefront...</h2>
      </div>
    )
  }

  if (error || !dealer) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: C.red }}>❌ {error || "Dealer not found"}</h2>
        <p>This storefront is not currently active.</p>
      </div>
    )
  }

  // AutoDealer/LocalBusiness structured data — powers the dealer's rich
  // result (name, location, what they sell) in search. The canonical URL is
  // the main-domain storefront (evcrm.in/{slug}) per the hub model: all
  // published/discovery URLs live on evcrm.in.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: dealer.dealershipName,
    url: dealer.dealerSubdomain ? `https://evcrm.in/${dealer.dealerSubdomain}` : "https://evcrm.in",
    ...(dealer.phone && dealer.phone !== "Not provided" ? { telephone: dealer.phone } : {}),
    ...(dealer.city && dealer.city !== "Not specified"
      ? { address: { "@type": "PostalAddress", addressLocality: dealer.city, addressCountry: "IN" } }
      : {}),
    makesOffer: inventory.slice(0, 20).map(v => ({
      "@type": "Offer",
      itemOffered: { "@type": v.type === "2W" ? "Motorcycle" : "Car", name: `${v.brand} ${v.model}` },
      price: v.exShowroom || 0,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    })),
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.white }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar />

      {justBooked && (
        <div style={{ background: "#F0FDF4", borderBottom: `1px solid ${C.green}30`, padding: "10px 16px", textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>✓ Booking confirmed! {dealer.dealershipName} will contact you shortly.</span>
        </div>
      )}

      {/* Dealer Header */}
      <div
        style={{
          backgroundColor: C.blue,
          color: C.white,
          padding: "2rem 1rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          {dealer.dealershipName}
        </h1>
        <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
          {dealer.city && <span>📍 {dealer.city}</span>}
          {dealer.phone && <span> • 📞 {dealer.phone}</span>}
        </div>
        {dealer.email && (
          <div style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            📧 {dealer.email}
          </div>
        )}
        {dealer.dealerCategory === "ICE" && dealer.sellCarEnabled && (
          <button onClick={() => setShowSellCar(true)}
            style={{ marginTop: "1rem", background: C.green, border: "none", color: "#fff", borderRadius: 24, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            💰 Sell Your Car to {dealer.dealershipName}
          </button>
        )}
      </div>

      {/* Inventory Section */}
      <div style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>
          Our Vehicles ({inventory.length})
        </h2>

        {inventory.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              backgroundColor: C.lightGray,
              borderRadius: "8px",
            }}
          >
            <p>No vehicles available at this time.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "1rem",
            }}
          >
            {inventory.map((vehicle) => {
              const hasPhoto = Array.isArray(vehicle.images) && vehicle.images[0] && !["🚗", "🛵", "🛺"].includes(vehicle.images[0])
              return (
                <div key={vehicle.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ height: 140, background: "linear-gradient(135deg,#F3F4F6,#E5E7EB)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {hasPhoto
                      ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ fontSize: 48 }}>{vehicle.type === "2W" ? "🛵" : vehicle.type === "3W" ? "🛺" : "🚗"}</div>}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{vehicle.brand}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 6 }}>{vehicle.model}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: C.ink, marginBottom: 10 }}>{fmt.currency(vehicle.exShowroom || vehicle.price || 0)}</div>
                    <button onClick={() => bookVehicle(vehicle.id, "testdrive")}
                      style={{ width: "100%", padding: "10px", backgroundColor: C.green, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                      Book Test Drive
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showSellCar && <SellCarModal dealership={dealer.dealership} dealerName={dealer.dealershipName} onClose={() => setShowSellCar(false)} />}
    </div>
  )
}
