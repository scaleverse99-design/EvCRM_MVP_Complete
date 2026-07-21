import { readTable } from "../../lib/store"
import { fmt } from "../../lib/constants"
import ShowroomClient from "./ShowroomClient"

// Server component wrapper around the fully-client-side marketplace UI
// (ShowroomClient.js). Its only job is to run before any browser JS: build
// per-vehicle Open Graph tags and Vehicle/Offer JSON-LD when the page is
// hit as a deep link (/showroom?vehicleId=X — the URL every blog article,
// dealer inventory "View" link, and shared listing uses). Link-preview
// crawlers (WhatsApp, Facebook, Google) never execute client JS, so this
// has to be server-rendered or those shares just show the generic
// homepage card regardless of which vehicle was actually shared.
const isPubliclyVisible = (v) =>
  v.status === "IN_STOCK" && (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED")

async function getVehicleForMeta(vehicleId) {
  if (!vehicleId) return null
  try {
    const inventory = await readTable("inventory")
    const v = inventory.find(x => x.id === vehicleId && isPubliclyVisible(x))
    return v || null
  } catch {
    return null
  }
}

export async function generateMetadata({ searchParams }) {
  const vehicleId = searchParams?.vehicleId
  const v = await getVehicleForMeta(vehicleId)

  if (!v) {
    return {
      title: "Buy Vehicles — Verified Dealer Marketplace | EV.CRM",
      description: "Browse new and used cars, EVs, and two-wheelers from verified dealers across India. Real inventory, transparent pricing, free test drives.",
    }
  }

  const title = `${v.year ? v.year + " " : ""}${v.brand} ${v.model} - ${fmt.currency(v.exShowroom)} | ${v.dealerName || "Verified Dealer"}, ${v.district || "India"}`
  const description = `${v.fuelType || "Electric"}${v.transmission ? ", " + v.transmission : ""}, ${v.condition === "new" ? "Brand New" : `${(v.km || 0).toLocaleString()} km`}. Verified dealer listing on EV.CRM.`
  const hasPhoto = typeof v.images?.[0] === "string" && v.images[0].startsWith("http")
  const image = hasPhoto ? v.images[0] : "/hero-dashboard.png"

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://evcrm.in/showroom?vehicleId=${v.id}`,
      images: [{ url: image }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export default async function ShowroomPage({ searchParams }) {
  const vehicleId = searchParams?.vehicleId
  const v = await getVehicleForMeta(vehicleId)

  const jsonLd = v
    ? {
        "@context": "https://schema.org",
        "@type": v.type === "2W" ? "Motorcycle" : "Car",
        name: `${v.year ? v.year + " " : ""}${v.brand} ${v.model}`,
        brand: { "@type": "Brand", name: v.brand },
        model: v.model,
        ...(v.year ? { releaseDate: String(v.year) } : {}),
        ...(v.condition === "used" && v.km ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: v.km, unitCode: "KMT" } } : {}),
        fuelType: v.fuelType || "Electric",
        ...(v.transmission ? { vehicleTransmission: v.transmission } : {}),
        ...(v.bodyType ? { bodyType: v.bodyType } : {}),
        ...(v.color ? { color: v.color } : {}),
        vehicleCondition: v.condition === "used" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
        offers: {
          "@type": "Offer",
          price: v.exShowroom || 0,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: `https://evcrm.in/showroom?vehicleId=${v.id}`,
          ...(v.dealerName ? { seller: { "@type": "AutoDealer", name: v.dealerName, ...(v.district ? { address: { "@type": "PostalAddress", addressLocality: v.district, addressCountry: "IN" } } : {}) } } : {}),
        },
        ...(typeof v.images?.[0] === "string" && v.images[0].startsWith("http") ? { image: v.images[0] } : {}),
      }
    : null

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <ShowroomClient />
    </>
  )
}
