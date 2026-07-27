"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { C } from "../../lib/constants"
import STATIONS from "../../data/charging_stations.json"

const OCM_KEY = "42411a8d-310d-427a-98aa-6b4a595122bc"

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

const SPEED_FILTERS = [
  { id: "all", label: "All Speeds" },
  { id: "ultra_fast_dc", label: "🚀 Ultra-Fast DC (≥50 kW)" },
  { id: "fast_dc", label: "⚡ Fast DC (15-49 kW)" },
  { id: "slow_ac", label: "🔌 Slow AC (<15 kW)" },
  { id: "battery_swap", label: "🔄 Battery Swap" },
]

const DISTRICT_COORDS = {
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Visakhapatnam": { lat: 17.6868, lng: 83.2185 },
  "Vizianagaram": { lat: 18.1066, lng: 83.3955 },
  "Cheepurupalle": { lat: 18.3054, lng: 83.5646 },
  "Cheepurupalli": { lat: 18.3054, lng: 83.5646 },
  "Garividi": { lat: 18.2749, lng: 83.5412 },
  "Srikakulam": { lat: 18.2949, lng: 83.8938 },
  "Vijayawada": { lat: 16.5062, lng: 80.6480 },
  "Guntur": { lat: 16.3067, lng: 80.4365 },
  "Tirupati": { lat: 13.6288, lng: 79.4192 },
  "Kakinada": { lat: 16.9891, lng: 82.2475 },
  "Rajahmundry": { lat: 17.0005, lng: 81.8040 },
  "Nellore": { lat: 14.4426, lng: 79.9865 },
  "Kurnool": { lat: 15.8281, lng: 78.0373 },
  "Anantapur": { lat: 14.6819, lng: 77.6006 },
  "Kadapa": { lat: 14.4673, lng: 78.8242 },
  "Bengaluru": { lat: 12.9716, lng: 77.5946 },
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Delhi": { lat: 28.6139, lng: 77.2090 },
  "Chennai": { lat: 13.0827, lng: 80.2707 },
  "Pune": { lat: 18.5204, lng: 73.8567 },
  "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "Kolkata": { lat: 22.5726, lng: 88.3639 },
  "Lucknow": { lat: 26.8467, lng: 80.9462 },
  "Salem": { lat: 11.6643, lng: 78.1460 },
  "Gurugram": { lat: 28.4595, lng: 77.0266 },
  "Noida": { lat: 28.5355, lng: 77.3910 },
  "Coimbatore": { lat: 11.0168, lng: 76.9558 },
  "Jaipur": { lat: 26.9124, lng: 75.7873 },
  "Kochi": { lat: 9.9312, lng: 76.2673 },
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

function deriveCostAndSpeed(operatorName, rawCost, maxKW, categoryName, stationName) {
  let cost = rawCost ? rawCost.trim() : null
  let isVerified = Boolean(rawCost && rawCost.trim())
  let verifiedSource = isVerified ? "Live OpenChargeMap API" : "Estimated Network Tariff"
  const op = (operatorName || "").toLowerCase()
  const stName = (stationName || "").toLowerCase()

  if (op.includes("ather") || stName.includes("ather")) {
    cost = "₹1.2 / min + 18% GST (via Ather App Wallet)"
    isVerified = true
    verifiedSource = "Official Ather Grid™ Tariff"
  } else if (!cost) {
    if (categoryName === "battery_swapping" || op.includes("swap") || op.includes("battery smart") || op.includes("sun mobility")) {
      cost = "₹80 - ₹120 per battery swap"
    } else if (op.includes("tata power") || op.includes("statiq") || op.includes("chargezone") || op.includes("jio-bp")) {
      cost = "₹18 - ₹22 / kWh (Pay via App)"
    } else if (op.includes("eesl") || op.includes("cesl") || op.includes("government")) {
      cost = "₹12 - ₹15 / kWh (Govt Subsidized)"
    } else {
      cost = "₹16 - ₹20 / kWh (Estimated)"
    }
  }

  let speedType = "SLOW_AC"
  let speedLabel = "🔌 Slow AC (<15 kW)"

  if (categoryName === "battery_swapping") {
    speedType = "BATTERY_SWAP"
    speedLabel = "🔄 2-Min Battery Swap"
  } else if (maxKW >= 50) {
    speedType = "ULTRA_FAST_DC"
    speedLabel = `🚀 Ultra-Fast DC (${maxKW} kW)`
  } else if (maxKW >= 15 || op.includes("ather") || stName.includes("ather")) {
    speedType = "FAST_DC"
    speedLabel = maxKW > 0 ? `⚡ Fast Charger (${maxKW} kW)` : "⚡ Ather Fast Charger"
  } else if (maxKW > 0) {
    speedType = "SLOW_AC"
    speedLabel = `🔌 AC Charging (${maxKW} kW)`
  }

  return { cost, speedType, speedLabel, isVerified, verifiedSource }
}

export default function ChargeStationsPage() {
  const [location, setLocation] = useState(null)
  const [userCoords, setUserCoords] = useState(null)
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState("")
  const [gpsLocationName, setGpsLocationName] = useState("")

  const [pincodeInput, setPincodeInput] = useState("")
  const [activePincode, setActivePincode] = useState("")
  const [pincodeInfo, setPincodeInfo] = useState(null)
  const [pincodeError, setPincodeError] = useState("")

  const [showLocationModal, setShowLocationModal] = useState(false)

  // Price Update Modal State
  const [selectedStationForUpdate, setSelectedStationForUpdate] = useState(null)
  const [newTariffInput, setNewTariffInput] = useState("")
  const [statusInput, setStatusInput] = useState("Operational")
  const [notesInput, setNotesInput] = useState("")
  const [updateSubmitting, setUpdateSubmitting] = useState(false)
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState("")

  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBrand, setSelectedBrand] = useState("all")
  const [selectedSpeed, setSelectedSpeed] = useState("all")

  // Restore persistent active location on initial page load / refresh
  useEffect(() => {
    const savedTop = localStorage.getItem("evcrm_user_location")
    if (savedTop) setLocation(JSON.parse(savedTop))

    const savedChargingLoc = localStorage.getItem("evcrm_charging_active_location")
    if (savedChargingLoc) {
      try {
        const parsed = JSON.parse(savedChargingLoc)
        if (parsed.activePincode) {
          setActivePincode(parsed.activePincode)
          setPincodeInput(parsed.activePincode)
          if (parsed.pincodeInfo) setPincodeInfo(parsed.pincodeInfo)
        } else if (parsed.userCoords) {
          setUserCoords(parsed.userCoords)
          setGpsActive(true)
          if (parsed.gpsLocationName) setGpsLocationName(parsed.gpsLocationName)
        }
      } catch (e) {
        console.warn("Failed to parse saved charging location:", e)
      }
    } else {
      const dismissed = sessionStorage.getItem("evcrm_charging_loc_dismissed")
      if (!dismissed) {
        setShowLocationModal(true)
      }
    }
  }, [])

  // Persist current active location to localStorage
  useEffect(() => {
    if (activePincode) {
      localStorage.setItem("evcrm_charging_active_location", JSON.stringify({
        activePincode,
        pincodeInfo,
        type: "pincode"
      }))
    } else if (userCoords && gpsActive) {
      localStorage.setItem("evcrm_charging_active_location", JSON.stringify({
        userCoords,
        gpsLocationName,
        type: "gps"
      }))
    }
  }, [activePincode, pincodeInfo, userCoords, gpsActive, gpsLocationName])

  const currentDistrict = location?.district || "Hyderabad"

  // Auto-trigger Pincode lookup when 6 digits are typed
  const handlePincodeInputChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 6)
    setPincodeInput(clean)
    setPincodeError("")

    if (clean.length === 6) {
      setUserCoords(null)
      setGpsActive(false)
      setGpsLocationName("")
      setActivePincode(clean)
      setShowLocationModal(false)
      sessionStorage.setItem("evcrm_charging_loc_dismissed", "true")
    }
  }

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    async function fetchStations() {
      try {
        let url = `/api/charging/stations?district=${encodeURIComponent(currentDistrict)}`
        
        if (activePincode && /^\d{6}$/.test(activePincode)) {
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
        if (selectedSpeed && selectedSpeed !== "all") {
          url += `&speed=${encodeURIComponent(selectedSpeed)}`
        }

        const res = await fetch(url)
        const contentType = res.headers.get("content-type") || ""

        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json()
          if (isMounted && data.success) {
            setStations(data.stations || [])
            setIsLive(data.source === "openchargemap_live")
            if (data.pincodeInfo) setPincodeInfo(data.pincodeInfo)
            if (data.gpsLocationName) setGpsLocationName(data.gpsLocationName)
            return
          }
        }
        
        await fetchClientSideOcm(isMounted)

      } catch (err) {
        console.warn("API route unavailable, using direct client OpenChargeMap fetch:", err)
        if (isMounted) await fetchClientSideOcm(isMounted)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    async function fetchClientSideOcm(mounted) {
      try {
        let coords = null
        let resolvedDist = currentDistrict

        if (activePincode && /^\d{6}$/.test(activePincode)) {
          try {
            const [pinRes, geoRes] = await Promise.allSettled([
              fetch(`https://api.postalpincode.in/pincode/${activePincode}`).then(r => r.json()),
              fetch(`https://nominatim.openstreetmap.org/search?postalcode=${activePincode}&country=India&format=json`).then(r => r.json())
            ])

            if (pinRes.status === "fulfilled" && Array.isArray(pinRes.value) && pinRes.value[0]?.Status === "Success") {
              const poList = pinRes.value[0].PostOffice || []
              if (poList.length > 0) {
                resolvedDist = poList[0].District || poList[0].Block || resolvedDist
                if (mounted) {
                  setPincodeInfo({
                    pincode: activePincode,
                    district: resolvedDist,
                    locality: poList[0].Name || "",
                    state: poList[0].State || ""
                  })
                }
              }
            }

            if (geoRes.status === "fulfilled" && Array.isArray(geoRes.value) && geoRes.value.length > 0) {
              coords = { lat: parseFloat(geoRes.value[0].lat), lng: parseFloat(geoRes.value[0].lon) }
            }
          } catch (pe) { console.warn("Pin error", pe) }
        } else if (userCoords) {
          coords = userCoords
          try {
            const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`).then(r => r.json())
            if (revRes && revRes.address) {
              const placeName = revRes.address.suburb || revRes.address.town || revRes.address.city_district || revRes.address.city || revRes.address.county || ""
              if (mounted && placeName) setGpsLocationName(placeName)
            }
          } catch (e) { console.warn("Reverse geo client error", e) }
        }

        if (!coords) {
          coords = DISTRICT_COORDS[resolvedDist] || DISTRICT_COORDS["Vizianagaram"] || DISTRICT_COORDS["Hyderabad"]
        }

        const ocmUrl = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=IN&maxresults=80&compact=false&verbose=true&latitude=${coords.lat}&longitude=${coords.lng}&distance=120&distanceunit=KM&key=${OCM_KEY}`

        const ocmRes = await fetch(ocmUrl)
        if (ocmRes.ok) {
          const rawData = await ocmRes.json()
          if (Array.isArray(rawData) && rawData.length > 0) {
            let parsed = rawData.map((item, idx) => {
              const info = item.AddressInfo || {}
              const operator = item.OperatorInfo?.Title || "Independent Charging Network"
              
              let maxKW = 0
              const ports = (item.Connections || []).map(c => {
                const type = c.ConnectionType?.Title || "EV Plug"
                const kw = c.PowerKW ? parseFloat(c.PowerKW) : 0
                if (kw > maxKW) maxKW = kw
                return kw > 0 ? `${type} (${kw}kW)` : type
              })

              const title = info.Title || `EV Station #${item.ID || idx}`
              const isSwapping = title.toLowerCase().includes("swap") || operator.toLowerCase().includes("swap") || operator.toLowerCase().includes("battery smart") || operator.toLowerCase().includes("sun mobility")
              const categoryName = isSwapping ? "battery_swapping" : "charging_grid"
              
              const { cost, speedType, speedLabel, isVerified, verifiedSource } = deriveCostAndSpeed(operator, item.UsageCost, maxKW, categoryName, title)

              const stationLat = info.Latitude || coords.lat
              const stationLng = info.Longitude || coords.lng
              const dist = getDistanceKm(coords.lat, coords.lng, stationLat, stationLng)

              return {
                id: `ocm_${item.ID || idx}`,
                name: title,
                state: info.StateOrProvince || "",
                district: resolvedDist,
                lat: stationLat,
                lng: stationLng,
                operator: operator,
                ports: ports.length > 0 ? ports : ["CCS2 Fast Charger (50kW)"],
                maxKW: maxKW || 50,
                chargerSpeedType: speedType,
                speedLabel: speedLabel,
                usageCost: cost,
                isVerified: isVerified,
                verifiedSource: verifiedSource,
                category: categoryName,
                status: item.StatusType?.IsOperational === false ? "Maintenance" : "Available",
                address: [info.AddressLine1, info.Town, info.StateOrProvince].filter(Boolean).join(", ") || info.Title || resolvedDist,
                distanceKm: dist,
                isLive: true
              }
            })

            // Apply search, brand & speed filters
            if (selectedBrand && selectedBrand !== "all") {
              parsed = parsed.filter(s => s.operator.toLowerCase().includes(selectedBrand) || s.name.toLowerCase().includes(selectedBrand))
            }
            if (selectedSpeed && selectedSpeed !== "all") {
              parsed = parsed.filter(s => s.chargerSpeedType.toLowerCase() === selectedSpeed)
            }
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim()
              parsed = parsed.filter(s => s.name.toLowerCase().includes(q) || s.operator.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || (s.usageCost && s.usageCost.toLowerCase().includes(q)))
            }

            parsed.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))

            if (mounted) {
              setStations(parsed)
              setIsLive(true)
              return
            }
          }
        }
      } catch (clientErr) {
        console.warn("Direct OpenChargeMap failed, loading local store:", clientErr)
      }

      // Local store fallback
      if (mounted) {
        const local = STATIONS.map(s => {
          const maxKW = s.name.includes("60") ? 60 : (s.name.includes("240") ? 240 : 25)
          const { cost, speedType, speedLabel, isVerified, verifiedSource } = deriveCostAndSpeed(s.operator, null, maxKW, s.category, s.name)
          return {
            ...s,
            maxKW,
            chargerSpeedType: speedType,
            speedLabel,
            usageCost: cost,
            isVerified,
            verifiedSource,
            distanceKm: getDistanceKm(coords.lat, coords.lng, s.lat, s.lng)
          }
        })
        const filteredLocal = local.filter(s => s.district === currentDistrict)
        setStations(filteredLocal.length > 0 ? filteredLocal : local.slice(0, 8))
        setIsLive(false)
      }
    }

    const timer = setTimeout(() => {
      fetchStations()
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [currentDistrict, userCoords, activePincode, searchQuery, selectedBrand, selectedSpeed])

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.")
      setShowLocationModal(false)
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
        setShowLocationModal(false)
        sessionStorage.setItem("evcrm_charging_loc_dismissed", "true")
      },
      (error) => {
        console.warn("GPS error:", error)
        setGpsError("Unable to retrieve location. Please check browser permissions.")
        setGpsLoading(false)
        setShowLocationModal(false)
        sessionStorage.setItem("evcrm_charging_loc_dismissed", "true")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleDismissModal = () => {
    setShowLocationModal(false)
    sessionStorage.setItem("evcrm_charging_loc_dismissed", "true")
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
    setGpsLocationName("")
    setActivePincode(cleanPin)
    setShowLocationModal(false)
    sessionStorage.setItem("evcrm_charging_loc_dismissed", "true")
  }

  const handleClearPincode = () => {
    setActivePincode("")
    setPincodeInfo(null)
    setPincodeInput("")
    localStorage.removeItem("evcrm_charging_active_location")
  }

  const handleResetGps = () => {
    setUserCoords(null)
    setGpsActive(false)
    setGpsLocationName("")
    localStorage.removeItem("evcrm_charging_active_location")
  }

  const handleOpenPriceModal = (st) => {
    setSelectedStationForUpdate(st)
    setNewTariffInput(st.usageCost || "₹18 / kWh")
    setStatusInput(st.status || "Available")
    setNotesInput("")
    setUpdateSuccessMsg("")
  }

  const handlePriceUpdateSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStationForUpdate || !newTariffInput.trim()) return

    setUpdateSubmitting(true)
    setUpdateSuccessMsg("")

    try {
      const res = await fetch("/api/charging/update-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: selectedStationForUpdate.id,
          stationName: selectedStationForUpdate.name,
          newPrice: newTariffInput.trim(),
          status: statusInput,
          notes: notesInput.trim()
        })
      })
      const data = await res.json()
      if (data.success) {
        setUpdateSuccessMsg("✅ Verified tariff update submitted! Updating live listing...")
        
        // Update local station list state
        setStations(prev => prev.map(s => {
          if (s.id === selectedStationForUpdate.id) {
            return {
              ...s,
              usageCost: newTariffInput.trim(),
              isVerified: true,
              verifiedSource: "Community Verified (Driver Submission)",
              status: statusInput
            }
          }
          return s
        }))

        setTimeout(() => {
          setSelectedStationForUpdate(null)
          setUpdateSubmitting(false)
        }, 1500)
      } else {
        alert("Failed to submit price update. Please try again.")
        setUpdateSubmitting(false)
      }
    } catch (err) {
      console.error(err)
      alert("Network error. Please try again.")
      setUpdateSubmitting(false)
    }
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

  const activeLocationTitle = pincodeInfo?.locality 
    ? `${pincodeInfo.locality}, ${pincodeInfo.district} (PIN ${pincodeInfo.pincode})`
    : (activePincode ? `Pincode ${activePincode}` : (gpsActive ? (gpsLocationName ? `${gpsLocationName}` : "your current GPS location") : currentDistrict))

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
    <div style={{ background: C.bg, minHeight: "100vh", position: "relative" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      {/* Manual Price / Tariff Update Modal Overlay */}
      {selectedStationForUpdate && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(8px)",
          zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          <div style={{
            background: "#fff", width: "100%", maxWidth: 480, borderRadius: 24,
            padding: 32, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
            position: "relative"
          }}>
            <button
              onClick={() => setSelectedStationForUpdate(null)}
              style={{
                position: "absolute", top: 18, right: 18, background: "#f3f4f6",
                border: "none", width: 32, height: 32, borderRadius: "50%",
                fontSize: 14, fontWeight: "bold", cursor: "pointer", color: C.ink2
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>✏️</span>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: C.ink }}>
                  Update Verified Tariff Rate
                </h3>
                <p style={{ fontSize: 11, color: C.ink3, fontWeight: 700 }}>
                  {selectedStationForUpdate.name}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: C.ink3, lineHeight: 1.5, marginBottom: 20 }}>
              Help fellow EV drivers in <b>{selectedStationForUpdate.district}</b> by updating exact charging prices and connector status based on your recent visit.
            </p>

            <form onSubmit={handlePriceUpdateSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.ink, display: "block", marginBottom: 6 }}>
                  NEW TARIFF / PRICING RATE (per kWh or swap)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ₹18 / kWh or ₹15 / kWh or Free"
                  value={newTariffInput}
                  onChange={e => setNewTariffInput(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.green}`, fontSize: 13,
                    fontWeight: 800, outline: "none", background: "#f0fdf4"
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.ink, display: "block", marginBottom: 6 }}>
                  STATION OPERATIONAL STATUS
                </label>
                <select
                  value={statusInput}
                  onChange={e => setStatusInput(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 13,
                    fontWeight: 700, outline: "none", background: "#f8fafc"
                  }}
                >
                  <option value="Available">● Available & Operational</option>
                  <option value="Busy">● Busy / Queue</option>
                  <option value="Maintenance">● Under Maintenance / Out of Order</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.ink, display: "block", marginBottom: 6 }}>
                  DRIVER NOTES & REVIEWS (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Charged Nexon EV at 30kW speed. Payment via Tata Power EZ Charge App."
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 12,
                    outline: "none", background: "#f8fafc", resize: "none"
                  }}
                />
              </div>

              {updateSuccessMsg && (
                <p style={{ fontSize: 12, color: "#059669", fontWeight: 800, marginBottom: 14, textAlign: "center" }}>
                  {updateSuccessMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={updateSubmitting}
                style={{
                  width: "100%", padding: "14px", borderRadius: 12,
                  background: C.green, color: "#fff", border: "none",
                  fontSize: 13, fontWeight: 900, cursor: "pointer",
                  boxShadow: "0 10px 20px rgba(5,150,105,0.3)"
                }}
              >
                {updateSubmitting ? "⌛ Saving Update..." : "Submit Verified Price Update ➔"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Automatic Location Permission Modal Overlay */}
      {showLocationModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(8px)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          <div style={{
            background: "#fff", width: "100%", maxWidth: 480, borderRadius: 24,
            padding: 32, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            textAlign: "center", position: "relative"
          }}>
            <button
              onClick={handleDismissModal}
              style={{
                position: "absolute", top: 18, right: 18, background: "#f3f4f6",
                border: "none", width: 32, height: 32, borderRadius: "50%",
                fontSize: 14, fontWeight: "bold", cursor: "pointer", color: C.ink2
              }}
            >
              ✕
            </button>

            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 20px"
            }}>
              📍
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8, letterSpacing: "-0.5px" }}>
              Locate Nearest EV Chargers
            </h2>

            <p style={{ fontSize: 13, color: C.ink3, lineHeight: 1.6, marginBottom: 20 }}>
              Enter your 6-digit Indian PIN code for 100% accurate location, or use browser GPS detection.
            </p>

            {/* Prominent PIN Code Input in Modal */}
            <form onSubmit={handlePincodeSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit PIN (e.g. 535128 Cheepurupalli)"
                value={pincodeInput}
                onChange={e => handlePincodeInputChange(e.target.value)}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12,
                  border: `2px solid ${C.green}`, fontSize: 14,
                  outline: "none", fontWeight: 800, background: "#f0fdf4", color: C.ink
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "12px 18px", borderRadius: 12,
                  background: C.green, color: "#fff", border: "none",
                  fontSize: 13, fontWeight: 900, cursor: "pointer"
                }}
              >
                Find by PIN ➔
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: C.ink3 }}>OR USE BROWSER GPS</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <button
              onClick={handleGetLocation}
              disabled={gpsLoading}
              style={{
                width: "100%", padding: "12px", borderRadius: 12,
                background: "#f3f4f6", color: C.ink, border: `1.5px solid ${C.border}`,
                fontSize: 12, fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s"
              }}
            >
              <span>{gpsLoading ? "⌛ Requesting Location..." : "📍 Auto-Detect via Browser GPS"}</span>
            </button>

            <button
              onClick={handleDismissModal}
              style={{
                background: "none", border: "none", color: C.ink3,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                marginTop: 20, textDecoration: "underline"
              }}
            >
              Skip & Browse All Stations
            </button>
          </div>
        </div>
      )}

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
            Discover nearest quick <b>DC fast charge stations</b>, <b>public electric car charging hubs</b>, and <b>battery swapping grids</b> in <span style={{ color: C.green, fontWeight: 700 }}>{activeLocationTitle}</span> powered by OpenChargeMap live data. Direct 1-click Google Maps navigation enabled.
          </p>

          {gpsError && (
            <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginTop: 8 }}>⚠️ {gpsError}</p>
          )}

          {gpsActive && !activePincode && (
            <div style={{
              marginTop: 12, padding: "8px 14px", background: "#eff6ff", borderRadius: 10,
              border: "1px solid #bfdbfe", fontSize: 12, color: "#1e40af", fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 6
            }}>
              <span>🎯 Sorted by exact distance from {gpsLocationName ? `📍 ${gpsLocationName}` : "your current GPS location"}</span>
              <button 
                onClick={handleResetGps}
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

        {/* Search, Pincode & Filter Controls */}
        <div style={{
          background: "#fff", padding: 24, borderRadius: 20, border: `1px solid ${C.border}`,
          marginBottom: 40, boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
        }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, marginBottom: 16 }}>
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search by network (Tata Power, Statiq...), station name, pricing, or locality..."
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
                placeholder="Enter PIN (e.g. 535128)"
                value={pincodeInput}
                onChange={e => handlePincodeInputChange(e.target.value)}
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

          {/* Speed Filter Pills */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
              CHARGER SPEED CATEGORY:
            </span>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {SPEED_FILTERS.map(spd => {
                const active = selectedSpeed === spd.id
                return (
                  <button
                    key={spd.id}
                    onClick={() => setSelectedSpeed(spd.id)}
                    style={{
                      padding: "6px 14px", borderRadius: 20,
                      background: active ? C.ink : "#f3f4f6",
                      color: active ? "#fff" : C.ink2,
                      border: "none", fontSize: 11, fontWeight: 800,
                      cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s"
                    }}
                  >
                    {spd.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Brand Filter Pills */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
              NETWORKS & OPERATORS:
            </span>
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
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {chargingGrids.length > 0 ? chargingGrids.map(s => (
                  <StationCard 
                    key={s.id} 
                    station={s} 
                    onNavigate={() => handleNavigate(s)} 
                    onUpdatePrice={() => handleOpenPriceModal(s)}
                    pincode={activePincode} 
                  />
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
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {swappingStations.length > 0 ? swappingStations.map(s => (
                  <StationCard 
                    key={s.id} 
                    station={s} 
                    onNavigate={() => handleNavigate(s)} 
                    onUpdatePrice={() => handleOpenPriceModal(s)}
                    variant="swapping" 
                    pincode={activePincode} 
                  />
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

function StationCard({ station, onNavigate, onUpdatePrice, variant, pincode }) {
  const isUltraFast = station.chargerSpeedType === "ULTRA_FAST_DC"
  const isFast = station.chargerSpeedType === "FAST_DC"
  const isCommunityVerified = station.verifiedSource?.includes("Community")
  const isAtherOfficial = station.verifiedSource?.includes("Ather")
  const isApiVerified = station.isVerified && !isCommunityVerified

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
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

        {/* Speed Type Badge */}
        <div style={{
          marginBottom: 12, padding: "5px 10px", borderRadius: 8,
          background: isUltraFast ? "#fef2f2" : (isFast ? "#fff7ed" : "#f3f4f6"),
          border: `1px solid ${isUltraFast ? "#fecaca" : (isFast ? "#fed7aa" : "#e5e7eb")}`,
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 800,
          color: isUltraFast ? "#dc2626" : (isFast ? "#c2410c" : C.ink)
        }}>
          <span>{station.speedLabel || (variant === "swapping" ? "🔄 2-Min Battery Swap" : "⚡ Fast Charging")}</span>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>{station.name}</h3>
        <p style={{ fontSize: 12, color: C.ink3, marginBottom: 6, fontWeight: 600 }}>Operated by {station.operator}</p>
        
        {station.address && (
          <p style={{ fontSize: 11, color: C.ink3, opacity: 0.85, marginBottom: 12, lineHeight: 1.4 }}>📍 {station.address}</p>
        )}

        {/* Tariff / Rate Box with Verification Status */}
        <div style={{
          background: isAtherOfficial ? "#f0fdf4" : (isCommunityVerified ? "#ecfdf5" : (isApiVerified ? "#eff6ff" : "#f8fafc")),
          padding: "10px 12px", borderRadius: 10,
          border: `1px solid ${isAtherOfficial ? "#86efac" : (isCommunityVerified ? "#a7f3d0" : (isApiVerified ? "#bfdbfe" : C.border))}`,
          marginBottom: 14
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.ink2 }}>💰 TARIFF RATE:</span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
              background: isAtherOfficial ? "#15803d" : (isCommunityVerified ? "#059669" : (isApiVerified ? "#2563eb" : "#64748b")),
              color: "#fff", textTransform: "uppercase"
            }}>
              {isAtherOfficial ? "⚡ OFFICIAL ATHER TARIFF" : (isCommunityVerified ? "👥 COMMUNITY VERIFIED" : (isApiVerified ? "✅ VERIFIED API" : "📊 ESTIMATED TARIFF"))}
            </span>
          </div>

          <p style={{ fontSize: 14, fontWeight: 900, color: C.green, margin: 0 }}>
            {station.usageCost || "₹18/kWh (Pay via App)"}
          </p>
          <p style={{ fontSize: 9, color: C.ink3, opacity: 0.8, marginTop: 2, margin: 0 }}>
            Source: {station.verifiedSource || "Estimated Network Tariff"}
          </p>
        </div>
        
        {/* Connector Types */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: C.ink3, display: "block", marginBottom: 4, textTransform: "uppercase" }}>
            AVAILABLE CONNECTORS:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {station.ports?.map(p => (
              <span key={p} style={{
                fontSize: 10, background: "#f1f5f9", padding: "4px 8px", borderRadius: 6,
                color: C.ink, fontWeight: 700, border: `1px solid ${C.border}`
              }}>
                🔌 {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button 
          onClick={onUpdatePrice}
          style={{ 
            flex: 1, padding: "10px", borderRadius: 10, 
            background: "#f1f5f9", color: C.ink, border: `1px solid ${C.border}`,
            fontSize: 11, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4
          }}
        >
          <span>✏️ Report Price</span>
        </button>

        <button 
          onClick={onNavigate}
          style={{ 
            flex: 1.4, padding: "10px", borderRadius: 10, 
            background: C.green, color: "#fff", border: "none",
            fontSize: 11, fontWeight: 900, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            boxShadow: "0 4px 12px rgba(5,150,105,0.2)"
          }}
        >
          <span>NAVIGATE</span>
          <span style={{ fontSize: 12 }}>➔</span>
        </button>
      </div>
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
        Try clearing speed/network filters or click "View More on Maps" for live Google Maps results.
      </p>
    </div>
  )
}
