"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { C, fmt } from "../../../lib/constants"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"

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

function renderInline(text) {
  const nodes = []
  let lastIndex = 0
  let m
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index))
    if (m[1]) {
      // **bold**
      nodes.push(<strong key={m.index} style={{ fontWeight: 800, color: C.ink }}>{m[2]}</strong>)
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
// the paragraph (a single '\n', not a blank line) — the Gemini writer does
// exactly that, and the old "split on blank lines only" logic swallowed the
// entire section (heading + body + citations) into one block that rendered as
// a giant unprocessed <h2>. We split on blank lines first (to preserve
// paragraph grouping), then break any heading line out of the block it leads.
function parseBlocks(text) {
  const out = []
  for (const chunk of (text || "").split(/\n{2,}/)) {
    let buf = []
    const flush = () => { const t = buf.join("\n").trim(); if (t) out.push({ type: "p", text: t }); buf = [] }
    for (const line of chunk.split("\n")) {
      if (line.trim().startsWith("## ")) { flush(); out.push({ type: "h2", text: line.trim().slice(3) }) }
      else buf.push(line)
    }
    flush()
  }
  return out
}

// Renders the article body. The pull quote and comparison table are woven in
// AT SECTION BOUNDARIES rather than stacked at the top, so the visuals break
// up the middle of the article. The comparison table slots in right before a
// "comparison / vs" heading when the article has one; otherwise the visuals
// fall back to evenly-spaced section breaks.
function ArticleBody({ text, pullQuote, comparisonTable, midImage }) {
  const blocks = parseBlocks(text)
  const headingIdx = blocks.map((b, i) => (b.type === "h2" ? i : -1)).filter(i => i >= 0)
  const at = (frac) => headingIdx.length > 1
    ? headingIdx[Math.min(headingIdx.length - 1, Math.max(1, Math.round(headingIdx.length * frac)))]
    : -1

  // Space the three visuals across the body so none collide: photo ~1/4 in,
  // pull quote ~1/2 in, table before a comparison heading (else ~3/4 in).
  const imageAt = midImage?.url ? at(1 / 4) : -1
  let quoteAt = pullQuote ? at(1 / 2) : -1
  const cmpHeading = comparisonTable?.rows?.length
    ? headingIdx.find(i => /compar|versus|\bvs\.?\b/i.test(blocks[i].text))
    : undefined
  let tableAt = comparisonTable?.rows?.length
    ? (cmpHeading !== undefined ? cmpHeading : at(3 / 4))
    : -1
  // Nudge collisions apart so two blocks never anchor to the same heading.
  if (quoteAt !== -1 && quoteAt === imageAt) quoteAt = at(1 / 2 + 0.15)
  if (tableAt !== -1 && (tableAt === imageAt || tableAt === quoteAt)) tableAt = at(3 / 4 + 0.1)

  return (
    <>
      {blocks.map((block, i) => {
        const injected = []
        if (i === imageAt) injected.push(<ArticleImage key={`img-${i}`} image={midImage} />)
        if (i === quoteAt) injected.push(<PullQuote key={`pq-${i}`} text={pullQuote} />)
        if (i === tableAt) injected.push(<ComparisonTable key={`ct-${i}`} table={comparisonTable} />)
        const node = block.type === "h2"
          ? <h2 key={i} style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: "28px 0 10px" }}>{renderInline(block.text)}</h2>
          : <p key={i} style={{ fontSize: 15, lineHeight: 1.75, color: C.ink2, margin: "0 0 16px" }}>{renderInline(block.text)}</p>
        return <span key={`w-${i}`} style={{ display: "contents" }}>{injected}{node}</span>
      })}
      {/* If the article had no headings to anchor to, still show the visuals. */}
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

export default function BlogPostPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/blog/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setPost(d.post); setVehicles(d.matchedVehicles || []) })
      .catch(() => setError("Article not found"))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: C.ink3 }}>Loading…</div>

  if (error || !post) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg }}>
        <TopBar />
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <h2 style={{ color: C.red, margin: 0 }}>{error || "Article not found"}</h2>
          <Link href="/blog" style={{ display: "inline-block", marginTop: 16, color: C.green, fontWeight: 700, textDecoration: "none" }}>← All articles</Link>
        </div>
      </div>
    )
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: post.authorName || "EvCRM" },
    publisher: { "@type": "Organization", name: "EvCRM", url: "https://evcrm.in" },
    datePublished: post.publishedAt,
    mainEntityOfPage: `https://evcrm.in/blog/${post.slug}`,
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
  }

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
      <Footer />
    </div>
  )
}
