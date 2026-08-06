import ChargingClient from "./ChargingClient"

// Server wrapper around the client-side charging station locator
// (ChargingClient.js). ChargingClient is "use client" (uses browser
// geolocation), so it can't export metadata itself — without this wrapper
// the page silently inherited the ROOT layout's title/description
// ("EV.CRM — India's Premier EV Sales OS & Commerce Hub" / dealership CRM
// copy) for every search result, regardless of what the page actually
// shows. Confirmed via real Search Console data 2026-08-05: 84 real
// queries ("ev charging stations hyderabad", "find ev chargers", "public
// ev charging stations"...) getting real impressions but near-zero clicks
// — the snippet Google showed had zero connection to charging stations.
// Title/description below are built from the actual highest-impression
// real queries, not guessed.
export const metadata = {
  title: "EV Charging Stations Near You — Live Map & Availability | EvCRM",
  description: "Find public EV charging stations near you with real-time availability. Filter by network (Tata Power, Statiq, Ather Grid, ChargeZone), charging speed, or battery swap points across India.",
  openGraph: {
    title: "EV Charging Stations Near You — Live Map & Availability | EvCRM",
    description: "Find public EV charging stations near you with real-time availability. Filter by network, charging speed, or battery swap points across India.",
    url: "https://evcrm.in/charging",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EV Charging Stations Near You — Live Map & Availability | EvCRM",
    description: "Find public EV charging stations near you with real-time availability across India.",
  },
}

export default function ChargingPage() {
  return <ChargingClient />
}
