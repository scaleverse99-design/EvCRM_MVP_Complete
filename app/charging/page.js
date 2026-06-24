"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { C } from "../../lib/constants"
import STATIONS from "../../data/charging_stations.json"

export default function ChargeStationsPage() {
  const [location, setLocation] = useState(null)
  
  useEffect(() => {
    const saved = localStorage.getItem("evcrm_user_location")
    if (saved) setLocation(JSON.parse(saved))
  }, [])

  const currentDistrict = location?.district || "Hyderabad"
  const currentStore = STATIONS.filter(s => s.district === currentDistrict)
  
  const chargingGrids = currentStore.filter(s => s.category === "charging_grid").slice(0, 4)
  const swappingStations = currentStore.filter(s => s.category === "battery_swapping").slice(0, 4)

  const handleNavigate = (station) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`
    window.open(url, "_blank")
  }

  const handleViewAll = (cat) => {
    const query = cat === "swapping" ? "battery+swapping+stations" : "ev+charging+stations"
    const url = `https://www.google.com/maps/search/${query}+near+${currentDistrict}+${location?.state || ""}`
    window.open(url, "_blank")
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <TopBar location={location} setLocation={setLocation} />
      
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 20px" }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: "-1px" }}>Charge Stations</h1>
          </div>
          <p style={{ fontSize: 16, color: C.ink3, maxWidth: 600 }}>
            Discover the nearest high-speed charging grids and battery swapping hubs in <span style={{ color: C.green, fontWeight: 700 }}>{currentDistrict}</span>. 
            Directly connected to Google Maps for accurate navigation.
          </p>
        </div>

        {/* Section 1: Charging Grids */}
        <section style={{ marginBottom: 60 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>Charging Grids</h2>
            <button 
              onClick={() => handleViewAll("charging")}
              style={{ fontSize: 13, fontWeight: 700, color: C.green, background: "none", border: "none", cursor: "pointer" }}
            >
              View More on Maps ➔
            </button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {chargingGrids.length > 0 ? chargingGrids.map(s => (
              <StationCard key={s.id} station={s} onNavigate={() => handleNavigate(s)} />
            )) : (
              <EmptyState district={currentDistrict} type="Charging Stations" />
            )}
          </div>
        </section>

        {/* Section 2: Battery Swapping */}
        <section style={{ marginBottom: 60 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>Battery Swapping Stations</h2>
            <button 
              onClick={() => handleViewAll("swapping")}
              style={{ fontSize: 13, fontWeight: 700, color: C.green, background: "none", border: "none", cursor: "pointer" }}
            >
              View More on Maps ➔
            </button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {swappingStations.length > 0 ? swappingStations.map(s => (
              <StationCard key={s.id} station={s} onNavigate={() => handleNavigate(s)} variant="swapping" />
            )) : (
              <EmptyState district={currentDistrict} type="Swapping Stations" />
            )}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}

function StationCard({ station, onNavigate, variant }) {
  return (
    <div style={{ 
      background: "#fff", 
      borderRadius: 16, 
      border: `1px solid ${C.border}`, 
      padding: 24,
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "default"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ 
          padding: "4px 10px", 
          borderRadius: 6, 
          background: station.status === "Available" ? "#ecfdf5" : "#fef2f2",
          color: station.status === "Available" ? "#059669" : "#dc2626",
          fontSize: 10, fontWeight: 800, textTransform: "uppercase"
        }}>
          ● {station.status}
        </div>
        <div style={{ fontSize: 18 }}>{variant === "swapping" ? "🔄" : "🔌"}</div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 4 }}>{station.name}</h3>
      <p style={{ fontSize: 12, color: C.ink3, marginBottom: 16 }}>Operated by {station.operator}</p>
      
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {station.ports.map(p => (
          <span key={p} style={{ fontSize: 10, background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, color: C.ink2 }}>{p}</span>
        ))}
      </div>

      <button 
        onClick={onNavigate}
        style={{ 
          width: "100%", padding: "10px", borderRadius: 10, 
          background: C.green, color: "#fff", border: "none",
          fontSize: 12, fontWeight: 900, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8
        }}
      >
        <span>NAVIGATE</span>
        <span style={{ fontSize: 14 }}>➔</span>
      </button>
    </div>
  )
}

function EmptyState({ district, type }) {
  return (
    <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", background: "#f9fafb", borderRadius: 16, border: `1px dashed ${C.border}` }}>
      <p style={{ fontSize: 14, color: C.ink3 }}>No {type} found in our local database for <b>{district}</b>.</p>
      <p style={{ fontSize: 12, color: C.ink3, opacity: 0.6 }}>Try "View More on Maps" for real-time results.</p>
    </div>
  )
}
