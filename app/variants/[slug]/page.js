"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { C, fmt } from "../../../lib/constants"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"
import SmartBuyWidget from "../../../components/marketplace/SmartBuyWidget"

export default function VariantsPage() {
  const { slug } = useParams()
  const [modelData, setModelData] = useState(null)

  useEffect(() => {
    if (!slug) return
    const formattedName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

    setModelData({
      slug,
      name: formattedName,
      brand: formattedName.split(" ")[0] || "Vehicle",
      variants: [
        { name: "Base Variant (Creative / XM)", price: 1249000, features: "3.3 kW AC Charger, Dual Airbags, ABS, LED DRLs, Digital Cluster" },
        { name: "Mid Variant (XZ+ / Fearless)", price: 1399000, features: "7.2 kW Fast Charger Support, 10.25 Inch Touchscreen, Rear Camera, Alloy Wheels" },
        { name: "Top Variant (XZ+ Lux / Empowered)", price: 1549000, features: "Sunroof, Ventilated Seats, 360 Degree Camera, Wireless Charging, Leatherette Upholstery" }
      ]
    })
  }, [slug])

  if (!modelData) return <div style={{ padding: "4rem", textAlign: "center", color: C.ink3 }}>Loading variant details…</div>

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: `${modelData.name} Variants & Prices in India`,
    description: `Compare all trim levels and variants of ${modelData.name}. Ex-showroom prices, feature additions, and best value for money variant guide.`,
    url: `https://evcrm.in/variants/${modelData.slug}`
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 16px 60px" }}>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.ink3, marginBottom: 16 }}>
          <Link href="/" style={{ color: C.green, textDecoration: "none", fontWeight: 700 }}>Home</Link> /
          <Link href={`/price/${modelData.slug}`} style={{ color: C.green, textDecoration: "none", fontWeight: 700 }}>{modelData.name}</Link> /
          <span>Variant Comparison</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
          {modelData.name} Variant Comparison & Pricing
        </h1>
        <p style={{ fontSize: 14, color: C.ink3, marginBottom: 28 }}>
          Compare base, mid, and top variants of {modelData.name}. Feature additions, price differences, and value for money recommendations.
        </p>

        {/* Quick Nav Sub-tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, overflowX: "auto", paddingBottom: 6 }}>
          <Link href={`/price/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>💰 On-Road Price</Link>
          <Link href={`/specs/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>⚙️ Technical Specs</Link>
          <span style={{ background: C.green, color: "#fff", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 800 }}>📋 Variants & Pricing</span>
          <Link href={`/colours/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>🎨 Colors & Gallery</Link>
        </div>

        {/* ── Variant Comparison Grid Cards ── */}
        <div style={{ display: "grid", gap: 20, marginBottom: 36 }}>
          {modelData.variants.map((v, idx) => (
            <div key={idx} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.5 }}>{idx === 1 ? "★ Recommended Value Choice" : `Option ${idx + 1}`}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 4 }}>{v.name}</div>
                <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 8, maxWidth: 500 }}>
                  <strong>Key Features:</strong> {v.features}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: C.ink3 }}>Ex-Showroom Price</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginTop: 2 }}>{fmt.currency(v.price)}</div>
                <Link href={`/price/${modelData.slug}`} style={{ display: "inline-block", marginTop: 10, background: C.green, color: "#fff", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>Check On-Road Price →</Link>
              </div>
            </div>
          ))}
        </div>

        <SmartBuyWidget brand={modelData.brand} model={modelData.name} />
      </main>

      <Footer />
    </div>
  )
}
