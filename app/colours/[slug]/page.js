"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { C } from "../../../lib/constants"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"
import SmartBuyWidget from "../../../components/marketplace/SmartBuyWidget"

export default function ColoursPage() {
  const { slug } = useParams()
  const [modelData, setModelData] = useState(null)
  const [activeColor, setActiveColor] = useState(0)

  useEffect(() => {
    if (!slug) return
    const formattedName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

    setModelData({
      slug,
      name: formattedName,
      brand: formattedName.split(" ")[0] || "Vehicle",
      colours: [
        { name: "Teal Blue Metallic", hex: "#0F4C5C", desc: "Signature dual-tone metallic teal body with white roof contrast" },
        { name: "Pristine White", hex: "#F4F4F9", desc: "Classic high-gloss ceramic white finish" },
        { name: "Daytona Grey", hex: "#4A4E69", desc: "Premium matte-textured dark grey shade" },
        { name: "Flame Red", hex: "#D90429", desc: "Vibrant sport glossy red edition" },
        { name: "Midnight Black", hex: "#1A1A1A", desc: "Deep dark jet black edition" }
      ]
    })
  }, [slug])

  if (!modelData) return <div style={{ padding: "4rem", textAlign: "center", color: C.ink3 }}>Loading colour gallery…</div>

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: `${modelData.name} Official Colours & Photo Gallery`,
    description: `Official color options and exterior paint shades for ${modelData.name}. View Teal Blue, Pristine White, Daytona Grey, Flame Red swatches.`,
    url: `https://evcrm.in/colours/${modelData.slug}`
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 16px 60px" }}>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.ink3, marginBottom: 16 }}>
          <Link href="/" style={{ color: C.green, textDecoration: "none", fontWeight: 700 }}>Home</Link> /
          <Link href={`/price/${modelData.slug}`} style={{ color: C.green, textDecoration: "none", fontWeight: 700 }}>{modelData.name}</Link> /
          <span>Colours & Gallery</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
          {modelData.name} Colours & Exterior Paint Shades
        </h1>
        <p style={{ fontSize: 14, color: C.ink3, marginBottom: 28 }}>
          Explore all official factory colour options, dual-tone roof combinations, and finish previews for {modelData.name}.
        </p>

        {/* Quick Nav Sub-tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, overflowX: "auto", paddingBottom: 6 }}>
          <Link href={`/price/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>💰 On-Road Price</Link>
          <Link href={`/specs/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>⚙️ Technical Specs</Link>
          <Link href={`/variants/${modelData.slug}`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: C.ink2, textDecoration: "none" }}>📋 Variants & Pricing</Link>
          <span style={{ background: C.green, color: "#fff", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 800 }}>🎨 Colors & Gallery</span>
        </div>

        {/* ── Interactive Color Swatch Preview Block ── */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "32px", marginBottom: 36, textAlign: "center" }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: modelData.colours[activeColor].hex, margin: "0 auto 16px", border: `4px solid ${C.border}`, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: "0 0 6px" }}>{modelData.colours[activeColor].name}</h3>
          <p style={{ fontSize: 13, color: C.ink3, maxWidth: 500, margin: "0 auto 24px" }}>{modelData.colours[activeColor].desc}</p>

          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            {modelData.colours.map((c, idx) => (
              <button key={idx} onClick={() => setActiveColor(idx)}
                style={{ width: 36, height: 36, borderRadius: "50%", background: c.hex, border: activeColor === idx ? `3px solid ${C.green}` : `1px solid ${C.border}`, cursor: "pointer", outline: "none" }}
                title={c.name} />
            ))}
          </div>
        </div>

        <SmartBuyWidget brand={modelData.brand} model={modelData.name} />
      </main>

      <Footer />
    </div>
  )
}
