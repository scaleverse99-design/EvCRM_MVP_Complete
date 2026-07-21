"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { C } from "../../lib/constants"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import KnowledgeSearchBar from "../../components/home/KnowledgeSearchBar"

// Public blog index — consumer-facing vehicle content published by dealers
// to the evcrm.in hub. This is an SEO surface (topical depth that ranks the
// main domain) and a top-of-funnel entry: articles link to matched live
// inventory + nearby dealers.
export default function BlogPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/blog")
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <TopBar />
      <div style={{ background: C.ink, padding: "48px 20px", textAlign: "center", color: "#fff" }}>
        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>EvCRM Vehicle Guides</h1>
        <p style={{ fontSize: 16, opacity: 0.7, marginTop: 8, marginBottom: 24 }}>Reviews, comparisons & buying advice — then buy from trusted dealers near you.</p>
        <KnowledgeSearchBar placeholder="Ask about any car or EV model, or a buying question…" />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: C.ink3 }}>Loading articles…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: C.ink3 }}>No articles published yet. Check back soon.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {posts.map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ height: 140, background: "linear-gradient(135deg,#F3F4F6,#E5E7EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>{p.coverEmoji || "🚗"}</div>
                  <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
                    {p.tags?.[0] && <div style={{ fontSize: 10, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{p.tags[0]}</div>}
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: C.ink, margin: 0, lineHeight: 1.35 }}>{p.title}</h2>
                    <p style={{ fontSize: 13, color: C.ink3, lineHeight: 1.6, margin: "10px 0 14px" }}>{p.excerpt}</p>
                    <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: C.ink3 }}>
                      <span>By {p.authorName}</span>
                      <span>{new Date(p.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
