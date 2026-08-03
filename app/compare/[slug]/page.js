"use client"
import { useParams } from "next/navigation"
import Link from "next/link"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"
import { C, fmt } from "../../../lib/constants"
import { POPULAR_MODELS, getComparisonPairs } from "../../../lib/masterCatalog"

export default function ComparePage() {
  const params = useParams()
  const slug = params?.slug || ""

  const pairs = getComparisonPairs()
  let currentPair = pairs.find(p => p.slug === slug)

  // Fallback slug matching if direct slug missed
  if (!currentPair && slug.includes("-vs-")) {
    const [partA, partB] = slug.split("-vs-")
    const modelA = POPULAR_MODELS.find(m => m.id === partA || m.id.includes(partA))
    const modelB = POPULAR_MODELS.find(m => m.id === partB || m.id.includes(partB))
    if (modelA && modelB) {
      currentPair = { slug, modelA, modelB }
    }
  }

  if (!currentPair) {
    // Default fallback pair: Nexon EV vs MG ZS EV
    currentPair = pairs[0] || {
      modelA: POPULAR_MODELS[0],
      modelB: POPULAR_MODELS[3]
    }
  }

  const { modelA, modelB } = currentPair

  const winnerRange = modelA.rangeKm > modelB.rangeKm ? modelA : modelB
  const winnerPrice = modelA.exShowroom < modelB.exShowroom ? modelA : modelB
  const winnerBattery = modelA.batteryKwh > modelB.batteryKwh ? modelA : modelB

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <TopBar />

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 16px 60px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: C.ink3, marginBottom: 16 }}>
          <Link href="/" style={{ color: C.green, textDecoration: "none" }}>Home</Link> {" > "}
          <Link href="/showroom" style={{ color: C.green, textDecoration: "none" }}>Showroom</Link> {" > "}
          <span>Compare {modelA.name} vs {modelB.name}</span>
        </div>

        {/* Hero Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.8, background: `${C.green}15`, padding: "4px 12px", borderRadius: 20 }}>
            ⚡ Real-Time Comparison Matrix 2026
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginTop: 12, lineHeight: 1.2 }}>
            {modelA.name} <span style={{ color: C.green }}>vs</span> {modelB.name}
          </h1>
          <p style={{ fontSize: 14, color: C.ink2, maxWidth: 640, margin: "8px auto 0" }}>
            Detailed side-by-side comparison of price, battery range, charging time, top speed, and specs in India.
          </p>
        </div>

        {/* Head-to-Head Hero Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", gap: 16, alignItems: "center", marginBottom: 36 }}>
          {/* Model A Card */}
          <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 24, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: 54, marginBottom: 8 }}>{modelA.imageEmoji}</div>
            <div style={{ fontSize: 12, color: C.ink3 }}>{modelA.brand}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: "4px 0 8px" }}>{modelA.name}</h2>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{fmt.currency(modelA.exShowroom)}</div>
            <div style={{ fontSize: 11, color: C.ink3 }}>Ex-Showroom Price</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
              <Link href={`/price/${modelA.id}-price-in-hyderabad`} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: C.ink, textDecoration: "none" }}>
                City Prices →
              </Link>
              <Link href={`/showroom?query=${encodeURIComponent(modelA.brand)}`} style={{ background: C.green, color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>
                Check Stock
              </Link>
            </div>
          </div>

          {/* VS Badge */}
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, margin: "0 auto" }}>
              VS
            </div>
          </div>

          {/* Model B Card */}
          <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 24, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: 54, marginBottom: 8 }}>{modelB.imageEmoji}</div>
            <div style={{ fontSize: 12, color: C.ink3 }}>{modelB.brand}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: "4px 0 8px" }}>{modelB.name}</h2>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{fmt.currency(modelB.exShowroom)}</div>
            <div style={{ fontSize: 11, color: C.ink3 }}>Ex-Showroom Price</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
              <Link href={`/price/${modelB.id}-price-in-hyderabad`} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: C.ink, textDecoration: "none" }}>
                City Prices →
              </Link>
              <Link href={`/showroom?query=${encodeURIComponent(modelB.brand)}`} style={{ background: C.green, color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>
                Check Stock
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Decision Box */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, marginBottom: 36 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 14 }}>🏆 Quick Decision Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div style={{ background: C.bg, padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: C.ink3 }}>💰 More Affordable</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.green, marginTop: 2 }}>{winnerPrice.name}</div>
              <div style={{ fontSize: 11.5, color: C.ink2 }}>Saves {fmt.currency(Math.abs(modelA.exShowroom - modelB.exShowroom))}</div>
            </div>
            <div style={{ background: C.bg, padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: C.ink3 }}>🔋 Longest Range</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.green, marginTop: 2 }}>{winnerRange.name}</div>
              <div style={{ fontSize: 11.5, color: C.ink2 }}>{winnerRange.rangeKm} km claim per charge</div>
            </div>
            <div style={{ background: C.bg, padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: C.ink3 }}>⚡ Biggest Battery Pack</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.green, marginTop: 2 }}>{winnerBattery.name}</div>
              <div style={{ fontSize: 11.5, color: C.ink2 }}>{winnerBattery.batteryKwh} kWh capacity</div>
            </div>
          </div>
        </div>

        {/* Full Specifications Table */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, marginBottom: 36, overflowX: "auto" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 16 }}>📊 Full Specifications Comparison</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                <th style={{ textAlign: "left", padding: "10px", color: C.ink3 }}>Feature</th>
                <th style={{ textAlign: "center", padding: "10px", color: C.ink, fontWeight: 800 }}>{modelA.name}</th>
                <th style={{ textAlign: "center", padding: "10px", color: C.ink, fontWeight: 800 }}>{modelB.name}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Ex-Showroom Price", valA: fmt.currency(modelA.exShowroom), valB: fmt.currency(modelB.exShowroom) },
                { label: "Claimed Range", valA: `${modelA.rangeKm} km`, valB: `${modelB.rangeKm} km` },
                { label: "Battery Capacity", valA: `${modelA.batteryKwh} kWh`, valB: `${modelB.batteryKwh} kWh` },
                { label: "Top Speed", valA: `${modelA.topSpeedKmh} km/h`, valB: `${modelB.topSpeedKmh} km/h` },
                { label: "AC Charge Time", valA: `${modelA.chargingTimeHr} hrs`, valB: `${modelB.chargingTimeHr} hrs` },
                { label: "Fast DC Charge (0-80%)", valA: `${modelA.fastChargingMin} mins`, valB: `${modelB.fastChargingMin} mins` },
                { label: "Power / Torque", valA: `${modelA.powerBhp} bhp / ${modelA.torqueNm} Nm`, valB: `${modelB.powerBhp} bhp / ${modelB.torqueNm} Nm` },
                { label: "Seating Capacity", valA: `${modelA.seating} Seats`, valB: `${modelB.seating} Seats` },
                { label: "Battery Warranty", valA: `${modelA.warrantyYears} Years`, valB: `${modelB.warrantyYears} Years` }
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 10px", fontWeight: 600, color: C.ink2 }}>{row.label}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: C.ink }}>{row.valA}</td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: C.ink }}>{row.valB}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Similar Comparisons Links */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 14 }}>🔍 Popular EV Comparisons</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {pairs.slice(0, 10).map((p, i) => (
              <Link key={i} href={`/compare/${p.slug}`} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.ink, textDecoration: "none" }}>
                {p.modelA.name} vs {p.modelB.name}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
