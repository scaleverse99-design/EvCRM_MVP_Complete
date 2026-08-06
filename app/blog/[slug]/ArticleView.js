"use client"
// Presentation only. Data arrives as props from the SERVER component in
// page.js — this component must never fetch its own article.
//
// It was doing exactly that (useEffect + fetch) until 2026-08-06, which meant
// the article body only existed after JavaScript ran. AI crawlers mostly
// don't run JS, so they received "Loading…" and nothing else. Passing the
// data down from a server parent is what makes Next.js render the real
// article into the initial HTML — "use client" here does NOT prevent server
// rendering, it only marks the hydration boundary.
import Link from "next/link"
import { C, fmt } from "../../../lib/constants"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"
import SmartBuyWidget from "../../../components/marketplace/SmartBuyWidget"
import { LiveVisitorBadge, LiveActivityToast } from "../../../components/common/LiveVisitorBadge"

// Inline markdown renderer for article paragraphs. Handles three things the
// orchestrator's news writer actually emits, in one pass so they compose:
//   1. **bold**            -> <strong> (FAQ questions come through this way)
//   2. [text](url)         -> clean clickable link showing only the label
//   3. [domain/path]       -> a bare-bracket citation with the scheme + parens
//                             stripped by the model; reconstructed into a small
//                             superscript source link showing just the domain,
//                             so a giant raw URL doesn't sit in the prose.
// Anything else passes through as plain text. No HTML injection — we never
// dangerouslySetInnerHTML, we build React nodes. Model-hub/dealer articles
// have none of these, so it's a no-op for them.
const INLINE = /(\*\*(?=\S)([^*]+?)\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))|(\[([^\]\s]+\.[a-z]{2,}[^\]]*)\])/gi

// The bracket content of a bare citation is a URL missing its scheme
// ("businesstoday.in/latest/..."). Rebuild the href and show only the domain.
function citationLink(raw, key) {
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const domain = url.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./, "")
  return (
    <a key={key} href={url} target="_blank" rel="noopener noreferrer nofollow"
      title={url}
      style={{ color: C.green, textDecoration: "none", fontWeight: 700, fontSize: "0.72em", verticalAlign: "super", marginLeft: 2, whiteSpace: "nowrap" }}>
      {domain}↗
    </a>
  )
}

function cleanProse(str) {
  if (!str || typeof str !== "string") return ""
  return str
    .replace(/##\s*/g, "")
    .replace(/\*{3,}/g, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/(?!evcrm\.in)[^)\s]+)\)/gi, "")
    .replace(/\[\s*(?:HT Auto|CarDekho|CarWale|Autocar India|Team-BHP|Kia India|Tata Motors|Mahindra|Hyundai|Kia|FoneArena|MotorBeam|Overdrive|ZigWheels|RushLane|NDTV Auto|Moneycontrol|LiveMint|Economic Times|CNBC TV18|BS Motoring|India Today|ETAuto|Rediff|Greater Kashmir|Wikipedia)[^\]]*\]/gi, "")
    .replace(/(?:FoneArena\.com|CarDekho\.com|CarWale\.com|AutocarIndia\.com|Livemint\.com)[,\s]*/gi, "")
    .replace(/\[\s*\]/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function renderInline(rawText) {
  const text = cleanProse(rawText)
  const nodes = []
  let lastIndex = 0
  let m
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index))
    if (m[1]) {
      // **bold** inline tags — limit to short inline phrases so whole paragraphs aren't turned bold
      const boldStr = m[2]
      if (boldStr.length < 120) {
        nodes.push(<strong key={m.index} style={{ fontWeight: 700, color: C.ink }}>{boldStr}</strong>)
      } else {
        nodes.push(boldStr)
      }
    } else if (m[3]) {
      // [text](url)
      const url = m[5]
      const safe = /^https?:\/\//i.test(url) ? url : "#"
      nodes.push(
        <a key={m.index} href={safe} target="_blank" rel="noopener noreferrer nofollow"
          style={{ color: C.green, textDecoration: "none", fontWeight: 600 }}>{m[4]}</a>
      )
    } else {
      // [domain/path] bare citation
      nodes.push(citationLink(m[7], m.index))
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes.length ? nodes : text
}

// Icon-illustrated "get the gist in 5 seconds" box — mirrors the Learn page.
// The news writer already emits keyTakeaways/pullQuote; rendering them here is
// what turns a wall of paragraphs into something that reads like an article.
function KeyTakeaways({ items }) {
  if (!items?.length) return null
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.green}30`, borderRadius: 16, padding: "20px 22px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>🔑 Key Takeaways</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon || "•"}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// A stock photo placed inside the article, with a small photographer credit
// (Pexels asks for it, and it reads as editorial). Renders nothing without a
// url, so a keyless/no-image article is unaffected.
function ArticleImage({ image }) {
  if (!image?.url) return null
  return (
    <figure style={{ margin: "24px 0" }}>
      <div style={{ borderRadius: 14, overflow: "hidden", background: "#F3F4F6" }}>
        <img src={image.url} alt={image.alt || ""} loading="lazy" style={{ width: "100%", display: "block", objectFit: "cover" }} />
      </div>
      {image.credit && (
        <figcaption style={{ fontSize: 11, color: C.ink3, marginTop: 6, textAlign: "right" }}>
          Photo: <a href={image.creditUrl || "https://www.pexels.com"} target="_blank" rel="noopener noreferrer nofollow" style={{ color: C.ink3 }}>{image.credit} / Pexels</a>
        </figcaption>
      )}
    </figure>
  )
}

function PullQuote({ text }) {
  if (!text) return null
  return (
    <div style={{ borderLeft: `4px solid ${C.green}`, background: `${C.green}08`, borderRadius: "0 12px 12px 0", padding: "18px 22px", margin: "24px 0" }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>"{text}"</div>
    </div>
  )
}

function ComparisonTable({ table }) {
  if (!table?.rows?.length) return null
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", margin: "24px 0", overflowX: "auto" }}>
      {table.title && <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, marginBottom: 14 }}>{table.title}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {(table.headers || []).map((h, i) => (
              <th key={i} style={{ textAlign: i === 0 ? "left" : "center", padding: "8px 10px", fontSize: 10.5, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `2px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ textAlign: ci === 0 ? "left" : "center", padding: "10px", fontSize: ci === 0 ? 12.5 : 14, fontWeight: ci === 0 ? 700 : 500, color: C.ink, borderBottom: `1px solid ${C.border}` }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Splits body text into typed blocks. Critically, a '## ' heading is peeled
// onto its OWN block even when the writer put it on the line directly above
// the paragraph. Detects if a paragraph contains key-value list structures or on-road breakdown text.
function parseBlocks(text) {
  if (!text || typeof text !== "string") return []

  // Step 1: Ensure any '## ' starts on a new double-newline block
  let normalized = text.replace(/([^\n])\s*##\s+/g, "$1\n\n## ")

  const out = []
  for (const chunk of normalized.split(/\n{2,}/)) {
    const trimmed = chunk.trim()
    if (!trimmed) continue

    if (trimmed.startsWith("## ")) {
      const content = trimmed.slice(3).trim()
      let headingText = ""
      let bodyText = ""

      if (content.includes("? ")) {
        const idx = content.indexOf("? ")
        headingText = content.slice(0, idx + 1).trim()
        bodyText = content.slice(idx + 2).trim()
      } else {
        const match = content.match(/^(.+?\b(?:Months|Years|Days|Market|Growth|Guide|Price|Specs|Policy|India|Overview|Features|Details|Hub|Launch|Platform|Segment|Sale|Sales|Leaders|Ahead|Charge|Future|FY\d+))\s+([A-Z][a-z0-9'"].*)$/i)
        if (match) {
          headingText = match[1].trim()
          bodyText = match[2].trim()
        } else {
          headingText = content
        }
      }

      if (headingText) out.push({ type: "h2", text: headingText })
      if (bodyText) out.push({ type: "p", text: bodyText })
    } else {
      const cleanP = trimmed.replace(/##\s*/g, "").trim()
      if (cleanP) {
        // Detect if it is a price list or bullet block
        if (cleanP.includes("Ex-Showroom Price:") || cleanP.includes("RTO Road Tax:") || cleanP.includes("Net On-Road Price:")) {
          out.push({ type: "price_breakdown", text: cleanP })
        } else if (cleanP.includes(" - ") || cleanP.includes("\n-") || cleanP.includes("\n•")) {
          out.push({ type: "bullet_list", text: cleanP })
        } else {
          out.push({ type: "p", text: cleanP })
        }
      }
    }
  }

  return out
}

// Render dynamic on-road price tables for the user
function PriceBreakdownCard({ text }) {
  // Extract key-values e.g. "Ex-Showroom Price: ₹14.49L" or "- Ex-Showroom Price: ₹14.49L"
  const lines = text.split(/[-–•\n]+/).map(x => x.trim()).filter(Boolean)
  const parsed = []
  
  lines.forEach(line => {
    const parts = line.split(":")
    if (parts.length >= 2) {
      const label = parts[0].trim()
      const val = parts.slice(1).join(":").trim()
      parsed.push({ label, val })
    }
  })

  if (parsed.length === 0) {
    return <p style={{ fontSize: 15, lineHeight: 1.75, color: C.ink2, margin: "0 0 16px" }}>{renderInline(text)}</p>
  }

  return (
    <div style={{ background: "#F8FAFC", border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "20px 24px", margin: "20px 0 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>⚡ Localized Cost Breakdown</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {parsed.map((item, idx) => {
          const isTotal = item.label.toLowerCase().includes("total") || item.label.toLowerCase().includes("net on-road")
          return (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: isTotal ? "none" : `1px dashed ${C.border}`, paddingBottom: isTotal ? 0 : 8, paddingTop: isTotal ? 6 : 0, marginTop: isTotal ? 6 : 0 }}>
              <span style={{ fontSize: isTotal ? 14 : 13, fontWeight: isTotal ? 800 : 600, color: isTotal ? C.ink : C.ink2 }}>{item.label}</span>
              <span style={{ fontSize: isTotal ? 18 : 14, fontWeight: 900, color: isTotal ? C.green : C.ink }}>{item.val}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Render clean bullet list grids
function BulletListGrid({ text }) {
  const items = text.split(/[-–•\n]+/).map(x => x.trim()).filter(x => x.length > 2)
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, margin: "16px 0 24px" }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FAFBFD", borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, color: C.green, marginTop: 1 }}>⚡</span>
          <span style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6 }}>{renderInline(item)}</span>
        </div>
      ))}
    </div>
  )
}

function ArticleBody({ text, pullQuote, comparisonTable, midImage }) {
  const blocks = parseBlocks(text)
  const headingIdx = blocks.map((b, i) => (b.type === "h2" ? i : -1)).filter(i => i >= 0)
  const at = (frac) => headingIdx.length > 1
    ? headingIdx[Math.min(headingIdx.length - 1, Math.max(1, Math.round(headingIdx.length * frac)))]
    : -1

  const imageAt = midImage?.url ? at(1 / 4) : -1
  let quoteAt = pullQuote ? at(1 / 2) : -1
  const cmpHeading = comparisonTable?.rows?.length
    ? headingIdx.find(i => /compar|versus|\bvs\.?\b/i.test(blocks[i].text))
    : undefined
  let tableAt = comparisonTable?.rows?.length
    ? (cmpHeading !== undefined ? cmpHeading : at(3 / 4))
    : -1
  if (quoteAt !== -1 && quoteAt === imageAt) quoteAt = at(1 / 2 + 0.15)
  if (tableAt !== -1 && (tableAt === imageAt || tableAt === quoteAt)) tableAt = at(3 / 4 + 0.1)

  return (
    <>
      {blocks.map((block, i) => {
        const injected = []
        if (i === imageAt) injected.push(<ArticleImage key={`img-${i}`} image={midImage} />)
        if (i === quoteAt) injected.push(<PullQuote key={`pq-${i}`} text={pullQuote} />)
        if (i === tableAt) injected.push(<ComparisonTable key={`ct-${i}`} table={comparisonTable} />)

        let node = null
        if (block.type === "h2") {
          node = <h2 key={i} style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: "28px 0 10px" }}>{renderInline(block.text)}</h2>
        } else if (block.type === "price_breakdown") {
          node = <PriceBreakdownCard key={i} text={block.text} />
        } else if (block.type === "bullet_list") {
          node = <BulletListGrid key={i} text={block.text} />
        } else {
          node = <p key={i} style={{ fontSize: 15, lineHeight: 1.75, color: C.ink2, margin: "0 0 16px" }}>{renderInline(block.text)}</p>
        }
        return <span key={`w-${i}`} style={{ display: "contents" }}>{injected}{node}</span>
      })}
      {imageAt === -1 && midImage?.url ? <ArticleImage image={midImage} /> : null}
      {quoteAt === -1 && pullQuote && <PullQuote text={pullQuote} />}
      {tableAt === -1 && comparisonTable?.rows?.length ? <ComparisonTable table={comparisonTable} /> : null}
    </>
  )
}

// Real dealer-uploaded photos start with http(s); auto-created listings
// default to an emoji placeholder ("🚗"/"🛵"/"🛺") which isn't a real image.
const hasRealPhoto = (v) => typeof v?.images?.[0] === "string" && v.images[0].startsWith("http")

// One spec cell for the variant card grid — skips rendering entirely when
// the dealer never filled the field in, rather than showing an empty value.
function Spec({ icon, label, value }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 9, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{value}</div>
      </div>
    </div>
  )
}

// Full specification + Buy Now card for one variant of the model. Shows the
// dealer's real photo when available, falls back to a styled emoji tile —
// same visual weight either way so the grid doesn't look broken when photos
// are missing.
function VariantCard({ v }) {
  const isEV = v.fuelType === "Electric"
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ height: 160, background: "linear-gradient(135deg,#F3F4F6,#E5E7EB)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {hasRealPhoto(v) ? (
          <img src={v.images[0]} alt={`${v.brand} ${v.model} ${v.variant || ""}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 56 }}>{v.type === "2W" ? "🛵" : v.type === "3W" ? "🛺" : "🚗"}</div>
        )}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: C.ink3 }}>{v.brand}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 2 }}>
          {v.model} {v.variant && <span style={{ fontWeight: 500, color: C.ink3, fontSize: 12.5 }}>{v.variant}</span>}
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.ink, margin: "4px 0 12px" }}>{fmt.currency(v.exShowroom || 0)}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: C.bg, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
          <Spec icon="🚘" label="Body Type" value={v.bodyType} />
          <Spec icon={isEV ? "🔋" : "⛽"} label="Fuel Type" value={v.fuelType} />
          <Spec icon="⚙️" label="Transmission" value={v.transmission} />
          <Spec icon={isEV ? "⚡" : "🔧"} label={isEV ? "Motor" : "Engine"} value={v.engineDetails} />
          {isEV ? (
            <Spec icon="🔋" label="Range" value={v.range ? `${v.range} km` : null} />
          ) : (
            <Spec icon="📍" label="KM Driven" value={v.condition === "used" ? `${(v.km || 0).toLocaleString()} km` : "New"} />
          )}
          <Spec icon="🎨" label="Colour" value={v.color} />
          <Spec icon="🪑" label="Seating" value={v.seatingCapacity} />
          <Spec icon="🧳" label="Boot Space" value={v.bootSpace} />
        </div>

        <div style={{ fontSize: 10.5, color: C.ink3, marginBottom: 10 }}>🏪 {v.dealerName}{v.district ? ` · ${v.district}` : ""}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <Link href={`/showroom?vehicleId=${v.id}`} style={{ flex: 1, textAlign: "center", background: C.green, color: "#fff", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>Buy Now →</Link>
          {v.dealerSubdomain && <Link href={`/${v.dealerSubdomain}`} title="Visit dealer storefront" style={{ background: "#F3F4F6", color: C.ink2, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🏪</Link>}
        </div>
      </div>
    </div>
  )
}

// A missing article is handled by page.js calling notFound() BEFORE this
// renders, so there is deliberately no loading or error branch here — those
// states can't occur when the data is resolved server-side.
// JSON-LD also moved to page.js: emitted from a client component it landed
// only in the hydrated DOM, never in the served HTML, which is why a live
// fetch of an article page found no `application/ld+json` at all.
export default function ArticleView({ post, vehicles = [], purchaseOptions = null }) {
  // Hero priority: a real dealer vehicle photo (model articles) > a stock
  // photo (news articles have no matched inventory) > the emoji. Whichever
  // stock photo isn't spent on the hero goes into the middle of the article.
  const vehicleHero = vehicles.find(hasRealPhoto)?.images?.[0]
  const stockImages = Array.isArray(post.images) ? post.images.filter(im => im?.url) : []
  const heroPhoto = vehicleHero || stockImages[0]?.url
  const heroCredit = vehicleHero ? null : stockImages[0] // credit only for stock heroes
  const midImage = vehicleHero ? stockImages[0] : stockImages[1]

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <TopBar />

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px 40px" }}>
        <Link href="/blog" style={{ fontSize: 12, color: C.green, fontWeight: 700, textDecoration: "none" }}>← All articles</Link>
        {heroPhoto ? (
          <div style={{ margin: "16px 0" }}>
            <div style={{ height: 280, borderRadius: 18, overflow: "hidden" }}>
              <img src={heroPhoto} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            {heroCredit && (
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 6, textAlign: "right" }}>
                Photo: <a href={heroCredit.creditUrl || "https://www.pexels.com"} target="_blank" rel="noopener noreferrer nofollow" style={{ color: C.ink3 }}>{heroCredit.credit} / Pexels</a>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 64, textAlign: "center", margin: "16px 0" }}>{post.coverEmoji || "🚗"}</div>
        )}
        <LiveVisitorBadge location={post.tags?.[3] || "Hyderabad"} />
        <h1 style={{ fontSize: 34, fontWeight: 900, color: C.ink, lineHeight: 1.2, letterSpacing: "-0.5px", margin: "0 0 12px" }}>{post.title}</h1>
        <div style={{ fontSize: 12, color: C.ink3, marginBottom: 8 }}>
          By {post.authorName} · Published on EvCRM · {new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
        {post.tags?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
            {post.tags.map(t => <span key={t} style={{ fontSize: 10, fontWeight: 700, color: C.ink2, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 10px" }}>{t}</span>)}
          </div>
        )}

        <KeyTakeaways items={post.keyTakeaways} />

        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px 28px 12px" }}>
          <ArticleBody text={post.body} pullQuote={post.pullQuote} comparisonTable={post.comparisonTable} midImage={midImage} />
        </div>

        <SmartBuyWidget 
          brand={post.tags?.[0] || "Tata"} 
          model={post.tags?.[1] || "Nexon EV"} 
          purchaseOptions={purchaseOptions} 
        />
      </article>

      {/* Specifications & available variants — the conversion block, powered
          by live inventory linked to this model's article. */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 16px 60px" }}>
        {vehicles.length > 0 ? (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: C.ink, textAlign: "center", margin: "24px 0 6px" }}>
              📋 Specifications & Available Variants
            </h2>
            <p style={{ fontSize: 13, color: C.ink3, textAlign: "center", marginBottom: 24 }}>Engine, transmission, colours and pricing — live listings from verified dealers near you.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {vehicles.map(v => <VariantCard key={v.id} v={v} />)}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Link href="/showroom" style={{ display: "inline-block", background: C.green, color: "#fff", borderRadius: 24, padding: "12px 28px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
              Browse all vehicles on the marketplace →
            </Link>
          </div>
        )}
      </div>
      <LiveActivityToast location={post.tags?.[3] || "Hyderabad"} />
      <Footer />
    </div>
  )
}
