"use client"
import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { C } from "../../lib/constants"
import { Card, Tag, Btn } from "../ui"
import STATIONS from "../../data/charging_stations.json"
import { getNearbyStations, searchStationsByDistrict } from "../../lib/charging"

// ── Leaflet is SSR-incompatible — load client-side only ──────────────
const MapContainer   = dynamic(() => import("react-leaflet").then(m => m.MapContainer),   { ssr: false })
const TileLayer      = dynamic(() => import("react-leaflet").then(m => m.TileLayer),      { ssr: false })
const Marker         = dynamic(() => import("react-leaflet").then(m => m.Marker),         { ssr: false })
const Popup          = dynamic(() => import("react-leaflet").then(m => m.Popup),          { ssr: false })
const useMap         = dynamic(() => import("react-leaflet").then(m => m.useMap),         { ssr: false })

// Fix Leaflet default icon in Next.js
function fixLeafletIcon() {
  if (typeof window === "undefined") return
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet")
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  })
}

// Custom colored markers using SVG data URIs
function makeIcon(color) {
  if (typeof window === "undefined") return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <text x="12" y="17" font-size="12" text-anchor="middle" fill="white" font-family="sans-serif">⚡</text>
  </svg>`
  return L.divIcon({
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
    className: ""
  })
}

// Component to fly to user location
function FlyTo({ lat, lng }) {
  // We load useMap lazily — this is a child component rendered only inside MapContainer
  const [mod, setMod] = useState(null)
  useEffect(() => {
    import("react-leaflet").then(m => setMod(m))
  }, [])
  
  if (!mod) return null
  const map = mod.useMap()
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 13, { duration: 1.2 })
  }, [lat, lng, map])
  return null
}

// ─────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────
export default function ChargingMapPreview({ location }) {
  const [stations, setStations]     = useState([])
  const [selected, setSelected]     = useState(null)
  const [mapReady, setMapReady]     = useState(false)
  const [destination, setDestination] = useState("")
  const [centerLat, setCenterLat]   = useState(17.4474)
  const [centerLng, setCenterLng]   = useState(78.3762)

  useEffect(() => {
    // Fix Leaflet icons after mount
    import("leaflet/dist/leaflet.css").catch(() => {})
    fixLeafletIcon()
    setMapReady(true)
  }, [])

  useEffect(() => {
    let list = []
    if (location?.lat && location?.lng) {
      list = getNearbyStations(location.lat, location.lng, 50)
      setCenterLat(location.lat)
      setCenterLng(location.lng)
    } else {
      const district = location?.district || "Hyderabad"
      list = searchStationsByDistrict(district)
      if (list.length === 0) list = STATIONS.slice(0, 10) // fallback all
      if (list[0]) { setCenterLat(list[0].lat); setCenterLng(list[0].lng) }
    }
    setStations(list)
    setSelected(list[0] || null)
  }, [location])

  const navigateTo = (s) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`
    window.open(url, "_blank")
  }

  const handleRouteSearch = () => {
    if (!destination.trim()) return
    const q = encodeURIComponent(destination + " EV charging station")
    window.open(`https://www.google.com/maps/search/${q}`, "_blank")
  }

  return (
    <>
      {/* Inject Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <section id="map" style={{ padding: "80px 0", background: "#F1F5F9" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
            <div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
                Reliable Charging Network.
              </h2>
              <p style={{ fontSize: 14, color: C.ink3 }}>
                Real-time EV charger locations near you — {stations.length} stations found
                {location?.district ? ` in ${location.district}` : " in your area"}.
              </p>
            </div>
            <Tag label="28+ VERIFIED STATIONS" color={C.blue} bg="#fff" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, height: 520 }}>

            {/* ── REAL MAP ─────────────────────────────────────── */}
            <div style={{ borderRadius: 24, overflow: "hidden", border: `1px solid ${C.border}`, position: "relative" }}>
              {mapReady ? (
                <MapContainer
                  center={[centerLat, centerLng]}
                  zoom={12}
                  style={{ width: "100%", height: "100%" }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {stations.map(s => (
                    <Marker
                      key={s.id}
                      position={[s.lat, s.lng]}
                      icon={makeIcon(s.status === "Available" ? "#10b981" : "#f97316")}
                      eventHandlers={{ click: () => setSelected(s) }}
                    >
                      <Popup>
                        <div style={{ minWidth: 180, fontFamily: "sans-serif" }}>
                          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{s.address}</div>
                          <div style={{ fontSize: 11, color: s.status === "Available" ? "#10b981" : "#f97316", fontWeight: 700 }}>
                            ● {s.status}
                          </div>
                          <button
                            onClick={() => navigateTo(s)}
                            style={{ marginTop: 8, background: "#10b981", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%" }}
                          >
                            Navigate ➔
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>Loading Map...</div>
                </div>
              )}

              {/* Route Planner Overlay */}
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, width: 260, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", padding: 14, borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: C.ink3, textTransform: "uppercase", marginBottom: 10 }}>⚡ Find Charger En-Route</div>
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRouteSearch()}
                  placeholder="Enter destination..."
                  style={{ width: "100%", background: "#fff", padding: "7px 10px", borderRadius: 8, fontSize: 12, border: `1.5px solid ${C.green}`, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  onClick={handleRouteSearch}
                  style={{ marginTop: 8, width: "100%", background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                >
                  Find Chargers Along Route
                </button>
              </div>

              {/* Legend */}
              <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 1000, background: "rgba(255,255,255,0.9)", borderRadius: 10, padding: "8px 12px", display: "flex", gap: 14, fontSize: 11 }}>
                <span><span style={{ color: "#10b981", fontWeight: 900 }}>●</span> Available</span>
                <span><span style={{ color: "#f97316", fontWeight: 900 }}>●</span> Busy</span>
              </div>
            </div>

            {/* ── STATION DETAIL PANEL ─────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              {selected ? (
                <Card style={{ padding: 22, flex: 1, borderTop: `5px solid ${selected.status === "Available" ? C.green : "#f97316"}` }}>
                  <div style={{ marginBottom: 16 }}>
                    <Tag label={selected.operator} color={C.blue} bg={C.blueL || "#eff6ff"} />
                    <h3 style={{ fontSize: 18, fontWeight: 900, marginTop: 8, marginBottom: 4 }}>{selected.name}</h3>
                    <p style={{ fontSize: 12, color: C.ink3, marginBottom: 2 }}>{selected.address}</p>
                    <p style={{ fontSize: 11, color: C.ink3 }}>{selected.district}, {selected.state}</p>
                    {selected.distance && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginTop: 6 }}>
                        📍 {selected.distance} km away
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase", marginBottom: 8 }}>Available Ports</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {selected.ports.map(p => (
                        <div key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "7px 12px", borderRadius: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{p}</span>
                          <Tag label="LIVE" color={C.green} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected.status === "Available" ? C.green : "#f97316", display: "block" }} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{selected.status}</span>
                    </div>
                    <button
                      onClick={() => navigateTo(selected)}
                      style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                    >
                      Navigate on Maps ➔
                    </button>
                  </div>
                </Card>
              ) : (
                <Card style={{ padding: 40, textAlign: "center", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ color: C.ink3 }}>Select a station pin on the map to see details.</p>
                </Card>
              )}

              {/* Station list scrollable */}
              <Card style={{ padding: 12, flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: C.ink3, textTransform: "uppercase", marginBottom: 10 }}>
                  Nearby Stations ({stations.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                  {stations.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setSelected(s)}
                      style={{
                        padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                        background: selected?.id === s.id ? "#f0fdf4" : "#f8fafc",
                        border: `1px solid ${selected?.id === s.id ? C.green : "transparent"}`,
                        transition: "all 0.15s"
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: C.ink3 }}>{s.distance ? `${s.distance} km · ` : ""}{s.operator}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ padding: 14, background: C.green, color: "#fff" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 22 }}>📱</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Real-time charger alerts.</div>
                    <div style={{ fontSize: 10, opacity: 0.85 }}>WhatsApp alert when a charger becomes free.</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
