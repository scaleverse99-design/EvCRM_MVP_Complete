"use client"

import { useEffect, useState } from "react"
import { C } from "../../lib/constants"
import TopBar from "../home/TopBar"
import VehicleCard from "../marketplace/VehicleCard"
import { bookTestDrive } from "../../lib/payments/tokenBooking"

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
  const [bookingVehicle, setBookingVehicle] = useState(null)
  const [bookingData, setBookingData] = useState({ name: "", phone: "", email: "", date: "" })
  const [bookingError, setBookingError] = useState("")
  const [bookingSuccess, setBookingSuccess] = useState(false)

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
  }, [domainOverride])

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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.white }}>
      <TopBar hideLogo={true} />

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
            {inventory.map((vehicle) => (
              <div
                key={vehicle.id}
                style={{ cursor: "pointer" }}
              >
                <VehicleCard
                  vehicle={vehicle}
                  onBook={() => {
                    setBookingVehicle(vehicle)
                    setBookingError("")
                    setBookingSuccess(false)
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {bookingVehicle && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setBookingVehicle(null)}
        >
          <div
            style={{
              backgroundColor: C.white,
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "1rem" }}>Book Test Drive</h3>
            {!bookingSuccess ? (
              <>
                <p style={{ fontSize: "0.9rem", color: C.ink3, marginBottom: "1rem" }}>
                  {bookingVehicle.brand} {bookingVehicle.model}
                </p>
                {bookingError && (
                  <div style={{ color: C.red, fontSize: "0.9rem", marginBottom: "1rem", background: "#FEE2E2", padding: "0.5rem", borderRadius: "6px" }}>
                    {bookingError}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={bookingData.name}
                    onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                    style={{ padding: "0.75rem", border: `1px solid ${C.border}`, borderRadius: "6px", fontFamily: "inherit" }}
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={bookingData.email}
                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                    style={{ padding: "0.75rem", border: `1px solid ${C.border}`, borderRadius: "6px", fontFamily: "inherit" }}
                  />
                  <input
                    type="tel"
                    placeholder="Your phone"
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                    style={{ padding: "0.75rem", border: `1px solid ${C.border}`, borderRadius: "6px", fontFamily: "inherit" }}
                  />
                  <input
                    type="date"
                    value={bookingData.date}
                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                    style={{ padding: "0.75rem", border: `1px solid ${C.border}`, borderRadius: "6px", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        setBookingError("")
                        await bookTestDrive({
                          vehicleId: bookingVehicle.id,
                          name: bookingData.name.trim(),
                          email: bookingData.email.trim(),
                          phone: bookingData.phone.trim(),
                          preferredDate: bookingData.date || null,
                          payToken: false,
                        })
                        setBookingSuccess(true)
                      } catch (err) {
                        setBookingError(err.message || "Booking failed")
                      }
                    }}
                    style={{ padding: "0.75rem", backgroundColor: C.green, color: C.white, border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Book Test Drive
                  </button>
                  <button
                    onClick={() => setBookingVehicle(null)}
                    style={{ padding: "0.75rem", backgroundColor: C.lightGray, color: C.ink, border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div>
                <p style={{ color: C.green, fontWeight: "700", marginBottom: "1rem" }}>✅ Booking confirmed!</p>
                <p style={{ fontSize: "0.9rem", color: C.ink3, marginBottom: "1rem" }}>
                  {dealer.dealershipName} will contact you soon to confirm the test drive.
                </p>
                <button
                  onClick={() => setBookingVehicle(null)}
                  style={{ width: "100%", padding: "0.75rem", backgroundColor: C.blue, color: C.white, border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
