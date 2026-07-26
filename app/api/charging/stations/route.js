import { NextResponse } from "next/server"
import STATIONS from "../../../../data/charging_stations.json"

const DISTRICT_COORDS = {
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Visakhapatnam": { lat: 17.6868, lng: 83.2185 },
  "Vizianagaram": { lat: 18.1066, lng: 83.3955 },
  "Cheepurupalle": { lat: 18.3054, lng: 83.5646 },
  "Cheepurupalli": { lat: 18.3054, lng: 83.5646 },
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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    let district = searchParams.get("district") || "Hyderabad"
    const searchQuery = (searchParams.get("query") || "").toLowerCase().trim()
    const brandFilter = (searchParams.get("brand") || "").toLowerCase().trim()
    const pincodeParam = (searchParams.get("pincode") || "").trim()

    let reqLat = parseFloat(searchParams.get("lat"))
    let reqLng = parseFloat(searchParams.get("lng"))
    let isUserGps = !isNaN(reqLat) && !isNaN(reqLng)
    let pincodeInfo = null

    // Handle 6-digit Indian Pincode Geocoding
    if (pincodeParam && /^\d{6}$/.test(pincodeParam)) {
      try {
        const [pinRes, geoRes] = await Promise.allSettled([
          fetch(`https://api.postalpincode.in/pincode/${pincodeParam}`).then(r => r.json()),
          fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincodeParam}&country=India&format=json`, {
            headers: { "User-Agent": "EvCRM/1.0" }
          }).then(r => r.json())
        ])

        let resolvedDistrict = district
        let resolvedLocality = ""
        let resolvedState = ""

        if (pinRes.status === "fulfilled" && Array.isArray(pinRes.value) && pinRes.value[0]?.Status === "Success") {
          const poList = pinRes.value[0].PostOffice || []
          if (poList.length > 0) {
            resolvedDistrict = poList[0].District || poList[0].Block || resolvedDistrict
            resolvedLocality = poList[0].Name || ""
            resolvedState = poList[0].State || ""
          }
        }

        let pinLat = null
        let pinLng = null

        if (geoRes.status === "fulfilled" && Array.isArray(geoRes.value) && geoRes.value.length > 0) {
          pinLat = parseFloat(geoRes.value[0].lat)
          pinLng = parseFloat(geoRes.value[0].lon)
        }

        if (!pinLat || !pinLng) {
          const dc = DISTRICT_COORDS[resolvedDistrict] || DISTRICT_COORDS["Vizianagaram"] || DISTRICT_COORDS["Hyderabad"]
          pinLat = dc.lat
          pinLng = dc.lng
        }

        reqLat = pinLat
        reqLng = pinLng
        district = resolvedDistrict
        isUserGps = true
        pincodeInfo = {
          pincode: pincodeParam,
          district: resolvedDistrict,
          locality: resolvedLocality,
          state: resolvedState,
          lat: pinLat,
          lng: pinLng
        }
      } catch (pinErr) {
        console.warn("Pincode geocoding error:", pinErr)
      }
    }

    const coords = isUserGps
      ? { lat: reqLat, lng: reqLng }
      : (DISTRICT_COORDS[district] || { lat: 17.3850, lng: 78.4867 })

    const apiKey = process.env.OPENCHARGEMAP_API_KEY || "42411a8d-310d-427a-98aa-6b4a595122bc"
    
    // Call OpenChargeMap API with expanded 100km radius for rural/town areas
    const ocmUrl = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=IN&maxresults=80&compact=true&verbose=false&latitude=${coords.lat}&longitude=${coords.lng}&distance=100&distanceunit=KM&key=${apiKey}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    let ocmStations = []
    let fetchedSuccess = false

    try {
      const res = await fetch(ocmUrl, {
        headers: { "User-Agent": "EvCRM/1.0" },
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const rawData = await res.json()
        if (Array.isArray(rawData) && rawData.length > 0) {
          fetchedSuccess = true
          ocmStations = rawData.map((item, idx) => {
            const info = item.AddressInfo || {}
            const operator = item.OperatorInfo?.Title || "Independent Charging Network"
            
            const ports = (item.Connections || []).map(conn => {
              const type = conn.ConnectionType?.Title || "EV Plug"
              const kw = conn.PowerKW ? `${conn.PowerKW}kW` : null
              return kw ? `${type} (${kw})` : type
            }).filter(Boolean)

            const title = info.Title || `EV Station #${item.ID || idx}`
            const isSwapping = title.toLowerCase().includes("swap") || operator.toLowerCase().includes("swap") || operator.toLowerCase().includes("battery smart") || operator.toLowerCase().includes("sun mobility")

            const stationLat = info.Latitude || coords.lat
            const stationLng = info.Longitude || coords.lng
            const dist = getDistanceKm(coords.lat, coords.lng, stationLat, stationLng)

            return {
              id: `ocm_${item.ID || idx}`,
              name: title,
              state: info.StateOrProvince || "",
              district: district,
              lat: stationLat,
              lng: stationLng,
              operator: operator,
              ports: ports.length > 0 ? ports : ["CCS2 Fast Charger (50kW)"],
              category: isSwapping ? "battery_swapping" : "charging_grid",
              status: item.StatusType?.IsOperational === false ? "Maintenance" : "Available",
              address: [info.AddressLine1, info.Town, info.StateOrProvince].filter(Boolean).join(", ") || info.Title || district,
              distanceKm: dist,
              isLive: true
            }
          })
        }
      }
    } catch (err) {
      console.warn("OpenChargeMap fetch failed, using fallback:", err.message)
    }

    // Load local fallback stations and compute distances
    const localStore = STATIONS.map(s => ({
      ...s,
      distanceKm: getDistanceKm(coords.lat, coords.lng, s.lat, s.lng)
    }))

    // Combine live stations with local curated store
    let allStations = fetchedSuccess && ocmStations.length > 0
      ? [...ocmStations, ...localStore.filter(ls => !ocmStations.some(os => os.name.toLowerCase() === ls.name.toLowerCase()))]
      : STATIONS.map(s => ({ ...s, distanceKm: getDistanceKm(coords.lat, coords.lng, s.lat, s.lng) }))

    // Filter by Brand / Search Query if provided
    if (brandFilter && brandFilter !== "all") {
      allStations = allStations.filter(s => 
        s.operator.toLowerCase().includes(brandFilter) ||
        s.name.toLowerCase().includes(brandFilter)
      )
    }

    if (searchQuery) {
      allStations = allStations.filter(s =>
        s.name.toLowerCase().includes(searchQuery) ||
        s.operator.toLowerCase().includes(searchQuery) ||
        s.address.toLowerCase().includes(searchQuery) ||
        s.ports.some(p => p.toLowerCase().includes(searchQuery))
      )
    }

    // Sort by nearest distance first
    allStations.sort((a, b) => {
      if (a.distanceKm === null) return 1
      if (b.distanceKm === null) return -1
      return a.distanceKm - b.distanceKm
    })

    return NextResponse.json({
      success: true,
      source: fetchedSuccess ? "openchargemap_live" : "local_fallback",
      district,
      isUserGps,
      pincodeInfo,
      total: allStations.length,
      stations: allStations
    })
  } catch (error) {
    console.error("Error in charging stations route:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
