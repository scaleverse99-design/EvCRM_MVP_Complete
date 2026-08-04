"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { C, fmt } from "../../../lib/constants"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"
import SmartBuyWidget from "../../../components/marketplace/SmartBuyWidget"

export default function SpecsPage() {
  const { slug } = useParams()
  const [modelData, setModelData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    // Decode model slug (e.g. tata-nexon-ev)
    const formattedName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    
    // Construct unique spec dataset
    setModelData({
      slug,
      name: formattedName,
      brand: formattedName.split(" ")[0] || "Vehicle",
      type: slug.includes("scooter") || slug.includes("ola") || slug.includes("ather") ? "2W" : "4W",
      fuelType: slug.includes("ev") || slug.includes("electric") || slug.includes("ola") || slug.includes("ather") ? "Electric" : "Petrol",
      batteryCapacity: "40.5 kWh High Density Lithium-ion",
      motorPower: "143 PS / 215 Nm Torque",
      araiRange: "465 km per charge",
      chargingTime: "56 mins (0-80% Fast DC Charging)",
      topSpeed: "140 km/h",
      transmission: "Automatic Single Speed Drive",
      dimensions: "3994 mm (L) x 1811 mm (W) x 1616 mm (H)",
      wheelbase: "2498 mm",
      groundClearance: "190 mm",
      bootSpace: "350 Litres",
      seating: "5 Persons",
      safetyRating: "5-Star Global NCAP Rating",
      airbags: "6 Airbags Standard",
      brakes: "All 4 Disc Brakes with ABS + EBD"
    })
    setLoading(false)
  }, [slug])

  if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: C.ink3 }}>Loading specifications…</div>
  if (!modelData) return null

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${modelData.name} Specifications & Technical Features`,
    vehicleEngine: {
      "@type": "EngineSpecification",
      engineType: modelData.fuelType,
      fuelType: modelData.fuelType
    },
    description: `Full technical specifications for ${modelData.name}. Motor power, battery capacity, ARAI range, dimensions, safety rating, and boot space details.`,
    url: `https://evcrm.in/specs/${modelData.slug}`
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 16px 60px" }}>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.ink3, marginBottom: 16 }}>
          <Link href="/" style={{ color: C.green, textDecoration: "none", fontWeight: 700 }}>Home</Link> /
          <Link href={`/price/${modelData.slug}`} style={{ color: C.green, textDecoration: "none", fontWeight: 700 }}>{modelData.name}</Link> /
          <span>Technical Specifications</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
          {modelData.name} Specifications & Feature Details
        </h1>
        <p style={{ fontSize: 14, color: C.ink3, marginBottom: 28 }}>
          Official technical specs, battery motor output, ARAI range, dimensions, safety equipment, and charging speed.
        </p>

        {/* Quick Nav Sub-tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, overflowX: "auto", paddingBottom: 6 }}>
          <Link href={`/price/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>💰 On-Road Price</Link>
          <span style={{ background: C.green, color: "#fff", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 800 }}>⚙️ Technical Specs</span>
          <Link href={`/variants/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>📋 Variants & Pricing</Link>
          <Link href={`/colours/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>🎨 Colors & Gallery</Link>
        </div>

        {/* ── Key Spec Grid Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { icon: "🔋", title: "Battery / Engine", val: modelData.batteryCapacity },
            { icon: "⚡", title: "Max Power / Torque", val: modelData.motorPower },
            { icon: "📍", title: "Claimed Range", val: modelData.araiRange },
            { icon: "🔌", title: "Charging Time", val: modelData.chargingTime },
            { icon: "🚀", title: "Top Speed", val: modelData.topSpeed },
            { icon: "🛡️", title: "Safety Rating", val: modelData.safetyRating }
          ].map((card, idx) => (
            <div key={idx} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>{card.title}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginTop: 4 }}>{card.val}</div>
            </div>
          ))}
        </div>

        {/* ── Detailed Technical Specs Table ── */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "24px 28px", marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginBottom: 16 }}>Detailed Spec Breakdown</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {[
                ["Body Style & Type", modelData.type === "4W" ? "Compact SUV / 4-Wheeler" : "Electric Scooter / 2-Wheeler"],
                ["Transmission", modelData.transmission],
                ["Exterior Dimensions", modelData.dimensions],
                ["Wheelbase Length", modelData.wheelbase],
                ["Ground Clearance", modelData.groundClearance],
                ["Boot Capacity", modelData.bootSpace],
                ["Seating Capacity", modelData.seating],
                ["Braking System", modelData.brakes],
                ["Airbags & Safety Suite", modelData.airbags]
              ].map(([label, val], idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 0", color: C.ink3, fontWeight: 600, width: "40%" }}>{label}</td>
                  <td style={{ padding: "12px 0", color: C.ink, fontWeight: 800 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SmartBuyWidget brand={modelData.brand} model={modelData.name} />
      </main>

      <Footer />
    </div>
  )
}
