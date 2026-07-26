"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { C } from "../../lib/constants"
import STATIONS from "../../data/charging_stations.json"

const BRAND_FILTERS = [
  { id: "all", label: "All Networks" },
  { id: "tata", label: "Tata Power" },
  { id: "statiq", label: "Statiq" },
  { id: "ather", label: "Ather Grid" },
  { id: "chargezone", label: "ChargeZone" },
  { id: "sun mobility", label: "Sun Mobility" },
  { id: "battery smart", label: "Battery Smart" },
  { id: "eesl", label: "EESL" },
]

export default function ChargeStationsPage() {
  const [location, setLocation] = useState(null)
  const [userCoords, setUserCoords] = useState(null)
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState("")

  const [pincodeInput, setPincodeInput] = useState("")
  const [activePincode, setActivePincode] = useState("")
  const [pincodeInfo, setPincodeInfo] = useState(null)
  const [pincodeError, setPincodeError] = useState("")

  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBrand, setSelectedBrand] = useState("all")

  useEffect(() => {
    const saved = localStorage.getItem("evcrm_user_location")
    if (saved) setLocation(JSON.parse(saved))
  }, [])

  const currentDistrict = location?.district || "Hyderabad"

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    async function fetchStations() {
      try {
        let url = `/api/charging/stations?district=${encodeURIComponent(currentDistrict)}`
        if (activePincode) {
          url += `&pincode=${encodeURIComponent(activePincode)}`
        } else if (userCoords) {
          url += `&lat=${userCoords.lat}&lng=${userCoords.lng}`
        }
        if (searchQuery.trim()) {
          url += `&query=${encodeURIComponent(searchQuery.trim())}`
        }
        if (selectedBrand && selectedBrand !== "all") {
          url += `&brand=${encodeURIComponent(selectedBrand)}`
        }

        const res = await fetch(url)
        const data = await res.json()
        if (isMounted && data.success) {
          setStations(data.stations || [])
          setIsLive(data.source === "openchargemap_live")
          if (data.pincodeInfo) {
            setPincodeInfo(data.pincodeInfo)
          }
        }
      } catch (err) {
        console.warn("Failed to fetch live charging stations:", err)
        if (isMounted) {
          const fallback = STATIONS.filter(s => s.district === currentDistrict)
          setStations(fallback.length > 0 ? fallback : STATIONS.slice(0, 8))
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      fetchStations()
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [currentDistrict, userCoords, activePincode, searchQuery, selectedBrand])

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.")
      return
    }

    setGpsLoading(true)
    setGpsError("")
    setActivePincode("")
    setPincodeInfo(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserCoords(coords)
        setGpsActive(true)
        setGpsLoading(false)
      },
      (error) => {
        console.warn("GPS error:", error)
        setGpsError("Unable to retrieve location. Please check browser permissions.")
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handlePincodeSubmit = (e) => {
    e?.preventDefault()
    const cleanPin = pincodeInput.trim()
    if (!/^\d{6}$/.test(cleanPin)) {
      setPincodeError("Please enter a valid 6-digit Indian PIN code.")
      return
    }
    setPincodeError("")
    setUserCoords(null)
    setGpsActive(false)
    setActivePincode(cleanPin)
  }

  const handleClearPincode = () => {
    setActivePincode("")
    setPincodeInfo(null)
    setPincodeInput("")
  }

  const chargingGrids = stations.filter(s => s.category === "charging_grid" || !s.category)
  const swappingStations = stations.filter(s => s.category === "battery_swapping")

  const handleNavigate = (station) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`
    window.open(url, "_blank")
  }

  const handleViewAll = (cat) => {
    const query = cat === "swapping" ? "battery+swapping+stations" : "ev+charging+stations"
    const url = `https://www.google.com/maps/search/${query}+near+${pincodeInfo?.district || currentDistrict}+${location?.state || ""}`
    window.open(url, "_blank")
  }

  // JSON-LD Structured Data Schema for SEO & GSC Top Queries
  const jsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `EV Charging Stations & Swapping Hubs in ${pincodeInfo?.district || currentDistrict}`,
    "description": `Find public electric car charging stations, quick DC fast chargers, and EV battery recharge stations near ${pincodeInfo?.district || currentDistrict}.`,
    "itemListElement": stations.slice(0, 10).map((s, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "EVChargingStation",
        "name": s.name,
        "operator": s.operator,
        "address": s.address,
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": s.lat,
          "longitude": s.lng
        }
      }
    }))
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Schema.org Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      <TopBar location={location} setLocation={setLocation} />
      
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 20px" }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: "-1px" }}>
                EV Charging Stations
              </h1>
            </div>

            {/* Live Data Badge & GPS Trigger */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={handleGetLocation}
                disabled={gpsLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderRadius: 20,
                  background: gpsActive ? "#059669" : "#fff",
                  color: gpsActive ? "#fff" : C.ink,
                  border: `1.5px solid ${gpsActive ? "#059669" : C.border}`,
                  fontSize: 12, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  transition: "all 0.2s"
                }}
              >
                <span>{gpsLoading ? "⌛ Locating..." : (gpsActive ? "📍 GPS Active" : "📍 Auto GPS Location")}</span>
              </button>

              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 20,
                background: isLive ? "#ecfdf5" : "#f3f4f6",
                border: `1px solid ${isLive ? "#a7f3d0" : "#e5e7eb"}`,
                fontSize: 12, fontWeight: 800,
                color: isLive ? "#047857" : "#4b5563"
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isLive ? "#10b981" : "#9ca3af",
                  boxShadow: isLive ? "0 0 8px #10b981" : "none"
                }} />
                <span>{isLive ? "OpenChargeMap Live Sync" : "EvCRM Station Network"}</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 15, color: C.ink3, maxWidth: 780, lineHeight: 1.6 }}>
            Discover nearest quick <b>DC fast charge stations</b>, <b>public electric car charging hubs</b>, and <b>battery swapping grids</b> in <span style={{ color: C.green, fontWeight: 700 }}>{pincodeInfo?.locality ? `${pincodeInfo.locality}, ${pincodeInfo.district}` : currentDistrict}</span> powered by OpenChargeMap live data. Direct 1-click Google Maps navigation enabled.
          </p>

          {gpsError && (
            <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginTop: 8 }}>⚠️ {gpsError}</p>
          )}

          {gpsActive && (
            <div style={{
              marginTop: 12, padding: "8px 14px", background: "#eff6ff", borderRadius: 10,
              border: "1px solid #bfdbfe", fontSize: 12, color: "#1e40af", fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 6
            }}>
              <span>🎯 Sorted by exact distance from your current GPS location</span>
              <button 
                onClick={() => { setUserCoords(null); setGpsActive(false) }}
                style={{ background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", textDecoration: "underline", marginLeft: 8 }}
              >
                Reset
              </button>
            </div>
          )}

          {activePincode && (
            <div style={{
              marginTop: 12, padding: "8px 14px", background: "#ecfdf5", borderRadius: 10,
              border: "1px solid #a7f3d0", fontSize: 12, color: "#047857", fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 6
            }}>
              <span>📍 Pincode: <b>{activePincode}</b> {pincodeInfo?.locality ? `(${pincodeInfo.locality}, ${pincodeInfo.district})` : ""} — Sorted by nearest distance</span>
              <button 
                onClick={handleClearPincode}
                style={{ background: "none", border: "none", color: "#047857", cursor: "pointer", textDecoration: "underline", marginLeft: 8, fontWeight: 800 }}
              >
                Clear PIN
              </button>
            </div>
          )}
        </div>

        {/* Search, Pincode & Brand Filter Section */}
        <div style={{
          background: "#fff", padding: 24, borderRadius: 20, border: `1px solid ${C.border}`,
          marginBottom: 40, boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
        }}>
          
          {/* Row 1: Search Query + Pincode Entry Form */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, marginBottom: 16 }}>
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search by network (Tata Power, Statiq, Ather...), station name, or locality..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "12px 18px", paddingRight: 36,
                  borderRadius: 12, border: `1.5px solid ${C.border}`,
                  fontSize: 13, outline: "none", background: "#f9fafb", color: C.ink
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 14, color: C.ink3
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Pincode Lookup Form */}
            <form onSubmit={handlePincodeSubmit} style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                maxLength={6}
                placeholder="Enter PIN (e.g. 500081)"
                value={pincodeInput}
                onChange={e => { setPincodeInput(e.target.value); setPincodeError("") }}
                style={{
                  width: 170, padding: "12px 14px",
                  borderRadius: 12, border: `1.5px solid ${pincodeError ? "#dc2626" : C.border}`,
                  fontSize: 13, outline: "none", background: "#f9fafb", color: C.ink, fontWeight: 700
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "12px 18px", borderRadius: 12,
                  background: C.green, color: "#fff", border: "none",
                  fontSize: 12, fontWeight: 900, cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Find by PIN ➔
              </button>
            </form>
          </div>

          {pincodeError && (
            <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginBottom: 12 }}>⚠️ {pincodeError}</p>
          )}

          {/* Quick Brand Filter Pills */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {BRAND_FILTERS.map(brand => {
              const active = selectedBrand === brand.id
              return (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrand(brand.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    background: active ? C.green : "#f3f4f6",
                    color: active ? "#fff" : C.ink2,
                    border: "none", fontSize: 11, fontWeight: 800,
                    cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s"
                  }}
                >
                  {brand.label}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: C.ink3 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
            <p style={{ fontSize: 14, fontWeight: 700 }}>Fetching live nearest stations...</p>
          </div>
        ) : (
          <>
            {/* Section 1: Charging Grids */}
            <section style={{ marginBottom: 60 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>
                  Public Fast Charging Grids ({chargingGrids.length})
                </h2>
                <button 
                  onClick={() => handleViewAll("charging")}
                  style={{ fontSize: 13, fontWeight: 700, color: C.green, background: "none", border: "none", cursor: "pointer" }}
                >
                  View More on Maps ➔
                </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                {chargingGrids.length > 0 ? chargingGrids.map(s => (
                  <StationCard key={s.id} station={s} onNavigate={() => handleNavigate(s)} pincode={activePincode} />
                )) : (
                  <EmptyState district={pincodeInfo?.district || currentDistrict} type="Charging Stations" query={searchQuery} pincode={activePincode} />
                )}
              </div>
            </section>

            {/* Section 2: Battery Swapping */}
            <section style={{ marginBottom: 60 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>
                  Battery Swapping Hubs ({swappingStations.length})
                </h2>
                <button 
                  onClick={() => handleViewAll("swapping")}
                  style={{ fontSize: 13, fontWeight: 700, color: C.green, background: "none", border: "none", cursor: "pointer" }}
                >
                  View More on Maps ➔
                </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                {swappingStations.length > 0 ? swappingStations.map(s => (
                  <StationCard key={s.id} station={s} onNavigate={() => handleNavigate(s)} variant="swapping" pincode={activePincode} />
                )) : (
                  <EmptyState district={pincodeInfo?.district || currentDistrict} type="Swapping Stations" query={searchQuery} pincode={activePincode} />
                )}
              </div>
            </section>
          </>
        )}

      </main>

      <Footer />
    </div>
  )
}

function StationCard({ station, onNavigate, variant, pincode }) {
  return (
    <div style={{ 
      background: "#fff", 
      borderRadius: 16, 
      border: `1px solid ${C.border}`, 
      padding: 24,
      display: "flex",
      flexDirection: "column",
      justify: "space-between",
      transition: "transform 0.2s, box-shadow 0.2s",
      boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
      cursor: "default"
    }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{ 
              padding: "4px 10px", 
              borderRadius: 6, 
              background: station.status === "Available" ? "#ecfdf5" : "#fef2f2",
              color: station.status === "Available" ? "#059669" : "#dc2626",
              fontSize: 10, fontWeight: 800, textTransform: "uppercase"
            }}>
              ● {station.status}
            </div>
            {station.isLive && (
              <span style={{ fontSize: 9, fontWeight: 800, background: "#eff6ff", color: "#2563eb", padding: "3px 6px", borderRadius: 4 }}>
                LIVE POI
              </span>
            )}
            {station.distanceKm !== null && station.distanceKm !== undefined && (
              <span style={{ fontSize: 9, fontWeight: 800, background: "#fef3c7", color: "#b45309", padding: "3px 6px", borderRadius: 4 }}>
                📍 {station.distanceKm} km {pincode ? `from PIN ${pincode}` : "away"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 18 }}>{variant === "swapping" ? "🔄" : "🔌"}</div>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>{station.name}</h3>
        <p style={{ fontSize: 12, color: C.ink3, marginBottom: 6, fontWeight: 600 }}>Operated by {station.operator}</p>
        {station.address && (
          <p style={{ fontSize: 11, color: C.ink3, opacity: 0.85, marginBottom: 14, lineHeight: 1.4 }}>📍 {station.address}</p>
        )}
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {station.ports?.map(p => (
            <span key={p} style={{ fontSize: 10, background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, color: C.ink2, fontWeight: 600 }}>{p}</span>
          ))}
        </div>
      </div>

      <button 
        onClick={onNavigate}
        style={{ 
          width: "100%", padding: "11px", borderRadius: 10, 
          background: C.green, color: "#fff", border: "none",
          fontSize: 12, fontWeight: 900, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginTop: "auto", boxShadow: "0 4px 12px rgba(5,150,105,0.2)"
        }}
      >
        <span>NAVIGATE</span>
        <span style={{ fontSize: 14 }}>➔</span>
      </button>
    </div>
  )
}

function EmptyState({ district, type, query, pincode }) {
  return (
    <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", background: "#f9fafb", borderRadius: 16, border: `1px dashed ${C.border}` }}>
      <p style={{ fontSize: 14, color: C.ink3 }}>
        No {type} found {query ? `matching "${query}"` : `near ${pincode ? `PIN ${pincode}` : district}`}.
      </p>
      <p style={{ fontSize: 12, color: C.ink3, opacity: 0.6, marginTop: 4 }}>
        Try clearing filters or click "View More on Maps" for live Google Maps results.
      </p>
    </div>
  )
}
