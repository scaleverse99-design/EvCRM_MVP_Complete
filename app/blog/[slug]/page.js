"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { C, fmt } from "../../../lib/constants"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"

// Renders the article body: '## ' lines become headings, blank lines split
// paragraphs. Keeps the AI/dealer text as plain text (no HTML injection).
function ArticleBody({ text }) {
  const blocks = (text || "").split(/\n{2,}/).map(b => b.trim()).filter(Boolean)
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return <h2 key={i} style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: "28px 0 10px" }}>{block.slice(3)}</h2>
        }
        return <p key={i} style={{ fontSize: 15, lineHeight: 1.75, color: C.ink2, margin: "0 0 16px" }}>{block}</p>
      })}
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

  const heroPhoto = vehicles.find(hasRealPhoto)?.images?.[0]

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar />

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px 40px" }}>
        <Link href="/blog" style={{ fontSize: 12, color: C.green, fontWeight: 700, textDecoration: "none" }}>← All articles</Link>
        {heroPhoto ? (
          <div style={{ height: 280, borderRadius: 18, overflow: "hidden", margin: "16px 0" }}>
            <img src={heroPhoto} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px 28px 12px" }}>
          <ArticleBody text={post.body} />
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
