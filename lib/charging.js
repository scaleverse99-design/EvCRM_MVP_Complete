import STATIONS from "../data/charging_stations.json"

/**
 * lib/charging.js
 * Charging Station Discovery Service
 */

export function getNearbyStations(userLat, userLng, radiusKm = 15) {
  // 1. Calculate distance (Haversine formula)
  const nearby = STATIONS.map(s => {
    const dist = calculateDistance(userLat, userLng, s.lat, s.lng)
    return { ...s, distance: dist }
  })
  .filter(s => s.distance <= radiusKm)
  .sort((a, b) => a.distance - b.distance)

  // 2. Verified Status Logic
  // We rely on the stored status from the Sovereign Rack.
  // If no status is present, we default to "Available".
  return nearby.map(s => ({
    ...s,
    status: s.status || "Available",
    lastUpdated: s.lastUpdated || new Date().toISOString()
  }))
}

export function searchStationsByDistrict(district) {
  return STATIONS.filter(s => s.district === district)
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return Math.round(d * 10) / 10; // km rounded to 1 decimal
}
