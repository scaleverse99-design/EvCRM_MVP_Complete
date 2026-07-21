"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { C } from "../../../lib/constants"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"

// Renders the article body: '## ' lines become headings, blank lines split
// paragraphs. Keeps the AI-written text as plain text (no HTML injection).
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

export default function LearnArticlePage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/learn/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setPost(d.post); setRelated(d.related || []) })
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
          <Link href="/learn" style={{ display: "inline-block", marginTop: 16, color: C.green, fontWeight: 700, textDecoration: "none" }}>← All articles</Link>
        </div>
      </div>
    )
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: "EvCRM" },
    publisher: { "@type": "Organization", name: "EvCRM", url: "https://evcrm.in" },
    datePublished: post.publishedAt,
    mainEntityOfPage: `https://evcrm.in/learn/${post.slug}`,
    ...(post.category ? { keywords: post.category } : {}),
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar />

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px 40px" }}>
        <Link href="/learn" style={{ fontSize: 12, color: C.green, fontWeight: 700, textDecoration: "none" }}>← All articles</Link>
        <div style={{ fontSize: 64, textAlign: "center", margin: "16px 0" }}>{post.coverEmoji || "📘"}</div>
        {post.category && (
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: C.green, background: `${C.green}12`, border: `1px solid ${C.green}30`, borderRadius: 20, padding: "4px 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>{post.category}</span>
          </div>
        )}
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, lineHeight: 1.2, letterSpacing: "-0.5px", margin: "0 0 12px", textAlign: "center" }}>{post.title}</h1>
        <div style={{ fontSize: 12, color: C.ink3, marginBottom: 24, textAlign: "center" }}>
          By EvCRM · {new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>

        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px 28px 12px" }}>
          <ArticleBody text={post.body} />
        </div>
      </article>

      {related.length > 0 && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 16px 60px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: C.ink, textAlign: "center", margin: "24px 0 20px" }}>Keep learning</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {related.map(r => (
              <Link key={r.slug} href={`/learn/${r.slug}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{r.coverEmoji || "📘"}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, lineHeight: 1.35 }}>{r.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px 60px", textAlign: "center" }}>
        <Link href="/showroom" style={{ display: "inline-block", background: C.green, color: "#fff", borderRadius: 24, padding: "12px 28px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
          Browse vehicles on the marketplace →
        </Link>
      </div>
      <Footer />
    </div>
  )
}
