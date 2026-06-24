/**
 * lib/location.js
 * Browser-based location detection with IP-based fallback.
 * Maps lat/lng to Indian states and districts using refined GPS boundaries.
 */

const DISTRICT_BOUNDS = [
  {
    state: "Delhi",
    district: "Delhi",
    bounds: { lat: [28.4, 28.9], lng: [76.8, 77.3] }
  },
  {
    state: "Maharashtra",
    district: "Mumbai",
    bounds: { lat: [18.8, 19.3], lng: [72.7, 72.9] }
  },
  {
    state: "Karnataka",
    district: "Bangalore",
    bounds: { lat: [12.8, 13.1], lng: [77.4, 77.8] }
  },
  {
    state: "Telangana",
    district: "Hyderabad",
    bounds: { lat: [17.2, 17.6], lng: [78.2, 78.6] }
  },
  {
    state: "Andhra Pradesh",
    district: "Visakhapatnam",
    bounds: { lat: [17.5, 17.9], lng: [83.1, 83.5] }
  }
];

export async function detectLocation() {
  // 1. Check localStorage first
  const cached = typeof window !== "undefined" ? localStorage.getItem("evcrm_user_location") : null;
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("Cache parse error", e);
    }
  }

  // 2. Browser Geolocation (Highest Accuracy)
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000, enableHighAccuracy: true });
      });
      const { latitude, longitude } = pos.coords;
      const mapped = mapToDistrict(latitude, longitude);
      saveLocation(mapped);
      return mapped;
    } catch (e) {
      console.warn("Geolocation denied or timed out, falling back to IP", e.message);
    }
  }

  // 3. Fallback to IP Geolocation (ipapi.co)
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const mapped = {
      state: data.region || "Telangana",
      district: data.city || "Hyderabad",
      lat: data.latitude,
      lng: data.longitude,
      source: "ip"
    };
    saveLocation(mapped);
    return mapped;
  } catch (e) {
    console.error("IP Geoloc failed", e);
    return { state: "Telangana", district: "Hyderabad", lat: 17.3850, lng: 78.4867, source: "default" };
  }
}

function mapToDistrict(lat, lng) {
  const matched = DISTRICT_BOUNDS.find(d => 
    lat >= d.bounds.lat[0] && lat <= d.bounds.lat[1] &&
    lng >= d.bounds.lng[0] && lng <= d.bounds.lng[1]
  );

  if (matched) {
    return { state: matched.state, district: matched.district, lat, lng, source: "gps" };
  }

  // If no district match, we try to at least return the lat/lng so other services can use it.
  return { state: "India", district: "Nearby", lat, lng, source: "gps" };
}

function saveLocation(loc) {
  if (typeof window !== "undefined") {
    localStorage.setItem("evcrm_user_location", JSON.stringify(loc));
  }
}

export function setManualLocation(state, district) {
  const loc = { state, district, source: "manual" };
  saveLocation(loc);
  return loc;
}
