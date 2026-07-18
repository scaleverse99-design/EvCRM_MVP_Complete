"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import C from "../../lib/constants"
import TopBar from "../../components/home/TopBar"
import VehicleCard from "../../components/home/VehicleCard"
import BookingModal from "../../components/marketplace/BookingModal"

export default function DealerStorefront() {
  const router = useRouter()
  const [dealer, setDealer] = useState(null)
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookingMode, setBookingMode] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  useEffect(() => {
    const fetchDealerData = async () => {
      try {
        setLoading(true)

        // Get Host header to identify dealer
        const domain = typeof window !== "undefined" ? window.location.hostname : ""

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
  }, [])

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
                onClick={() => {
                  setSelectedVehicle(vehicle)
                  setBookingMode("test-drive")
                }}
                style={{ cursor: "pointer" }}
              >
                <VehicleCard
                  vehicle={vehicle}
                  onBook={() => {
                    setSelectedVehicle(vehicle)
                    setBookingMode("test-drive")
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {bookingMode && selectedVehicle && (
        <BookingModal
          vehicle={selectedVehicle}
          dealer={dealer}
          onClose={() => setBookingMode(null)}
        />
      )}
    </div>
  )
}
