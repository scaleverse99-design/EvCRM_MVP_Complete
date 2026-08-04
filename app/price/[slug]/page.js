"use client"
// Every symbol below was used by this component but never imported, and
// there was no "use client" despite calling useParams — so every render
// threw a ReferenceError and all 1,344 /price/ URLs in the sitemap returned
// HTTP 500. Found 2026-08-04 by scripts/site-preflight.js, which samples
// sitemap URLs rather than trusting that they resolve.
//
// Imports mirror app/compare/[slug]/page.js, the sibling route with the
// same shape that works.
import { useParams } from "next/navigation"
import Link from "next/link"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"
import { C, fmt } from "../../../lib/constants"
import { POPULAR_MODELS, TOP_CITIES, calculateOnRoadPrice, getCityPricePairs } from "../../../lib/masterCatalog"
import { generateVehicleSchemaLD } from "../../../lib/dripPublisher.js"
import { LiveVisitorBadge, LiveActivityToast } from "../../../components/common/LiveVisitorBadge"

export default function CityPricePage() {
  const params = useParams()
  const slug = params?.slug || ""

  const cityPairs = getCityPricePairs()
  let currentPair = cityPairs.find(p => p.slug === slug)

  if (!currentPair && slug.includes("-price-in-")) {
    const [modelId, citySlug] = slug.split("-price-in-")
    const model = POPULAR_MODELS.find(m => m.id === modelId || m.id.includes(modelId))
    const city = TOP_CITIES.find(c => c.name.toLowerCase().replace(/\s+/g, "-") === citySlug)
    if (model && city) {
      currentPair = { slug, model, city, citySlug }
    }
  }

  if (!currentPair) {
    currentPair = cityPairs[0] || {
      model: POPULAR_MODELS[0],
      city: TOP_CITIES[0],
      citySlug: "hyderabad"
    }
  }

  const { model, city } = currentPair
  const price = calculateOnRoadPrice(model, city)
  const schemaData = generateVehicleSchemaLD(model, city, price)

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <TopBar />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px 60px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: C.ink3, marginBottom: 16 }}>
          <Link href="/" style={{ color: C.green, textDecoration: "none" }}>Home</Link> {" > "}
          <Link href="/showroom" style={{ color: C.green, textDecoration: "none" }}>Showroom</Link> {" > "}
          <span>{model.name} Price in {city.name}</span>
        </div>

        {/* Hero Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <LiveVisitorBadge location={city.name} />
          <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginTop: 12, lineHeight: 1.2 }}>
            {model.name} On-Road Price in <span style={{ color: C.green }}>{city.name}</span>
          </h1>
          <p style={{ fontSize: 14, color: C.ink2, maxWidth: 600, margin: "8px auto 0" }}>
            Check exact Ex-Showroom, RTO tax exemption, insurance cost, and {city.state} state EV subsidy.
          </p>
        </div>

        {/* Price Hero Summary Card */}
        <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 28, marginBottom: 32, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: C.ink3 }}>{model.brand} · {city.name}, {city.state}</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, margin: "4px 0 12px" }}>{model.name}</h2>
              
              <div style={{ fontSize: 13, color: C.ink3 }}>Estimated Net On-Road Price:</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: C.green, margin: "2px 0 8px" }}>
                {fmt.currency(price.netOnRoadPrice)}
              </div>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>
                🌱 RTO Exemption Saved You: {fmt.currency(price.rtoExemptionSaved)}
              </div>
            </div>

            <div style={{ textAlign: "center", background: C.bg, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 4 }}>{model.imageEmoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Claimed Range: {model.rangeKm} km</div>
              <div style={{ fontSize: 12, color: C.ink3, marginBottom: 14 }}>{model.batteryKwh} kWh Battery Pack</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href={`/showroom?query=${encodeURIComponent(model.brand)}`} style={{ background: C.green, color: "#fff", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
                  Check Dealer Stock in {city.name} →
                </Link>
                <Link href={`/compare/${model.id}-vs-mg-comet-ev`} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px", fontSize: 11.5, fontWeight: 700, color: C.ink, textDecoration: "none" }}>
                  Compare Rivals →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Itemized Price Table */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 16 }}>📋 Itemized Price Breakdown ({city.name})</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: 12, color: C.ink2 }}>Ex-Showroom Price</td>
                <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: C.ink }}>{fmt.currency(price.exShowroom)}</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: 12, color: C.ink2 }}>
                  RTO Road Tax ({city.state} EV Exemption)
                  <span style={{ fontSize: 11, color: C.green, display: "block" }}>0% EV Road Tax Policy</span>
                </td>
                <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: C.green }}>{fmt.currency(price.rtoTax)}</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: 12, color: C.ink2 }}>Comprehensive Insurance (1-Yr OD + 3-Yr TP)</td>
                <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: C.ink }}>{fmt.currency(price.insurance)}</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: 12, color: C.ink2 }}>FASTag, Registration & Handling Charges</td>
                <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: C.ink }}>{fmt.currency(price.fastTagTCS)}</td>
              </tr>
              {price.stateSubsidy > 0 && (
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: `${C.green}08` }}>
                  <td style={{ padding: 12, color: C.green, fontWeight: 700 }}>{city.state} Direct EV Subsidy</td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: C.green }}>-{fmt.currency(price.stateSubsidy)}</td>
                </tr>
              )}
              <tr style={{ background: C.bg }}>
                <td style={{ padding: 14, fontWeight: 900, color: C.ink, fontSize: 16 }}>Net On-Road Price in {city.name}</td>
                <td style={{ padding: 14, textAlign: "right", fontWeight: 900, color: C.green, fontSize: 18 }}>{fmt.currency(price.netOnRoadPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Other Top Cities Grid */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 14 }}>🏙️ {model.name} Price in Other Indian Cities</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {TOP_CITIES.map((c, i) => {
              const cSlug = c.name.toLowerCase().replace(/\s+/g, "-")
              return (
                <Link key={i} href={`/price/${model.id}-price-in-${cSlug}`} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.ink, textDecoration: "none" }}>
                  {model.name} Price in {c.name}
                </Link>
              )
            })}
          </div>
        </div>
      </main>

      <LiveActivityToast location={city.name} />
      <Footer />
    </div>
  )
}
