"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { C } from "../../lib/constants"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import KnowledgeSearchBar from "../../components/home/KnowledgeSearchBar"

const CATEGORY_ICONS = {
  "EV Fundamentals": "⚡",
  "ICE Fundamentals": "⛽",
  "Buying Guides": "🧭",
  "Tech Trends": "🚀",
}

// Public knowledge hub — evergreen EV/automobile education content, separate
// from the per-model buyer's guides (/blog). The point: whether or not a
// reader buys from us, they leave understanding the product — that's what
// makes evcrm.in the source people come back to and what Google indexes as
// an authority rather than a lead-gen page.
export default function LearnPage() {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/learn")
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setCategories(d.categories || []) })
      .finally(() => setLoading(false))
  }, [])

  const grouped = categories.map(cat => ({
    category: cat,
    items: articles.filter(a => a.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <TopBar />
      <div style={{ background: C.ink, padding: "48px 20px", textAlign: "center", color: "#fff" }}>
        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>EvCRM Learn</h1>
        <p style={{ fontSize: 16, opacity: 0.7, marginTop: 8, maxWidth: 620, marginLeft: "auto", marginRight: "auto", marginBottom: 24 }}>
          Everything about how EVs and vehicles actually work — motors, batteries, engines, transmissions, and the tech shaping what you'll drive next.
        </p>
        <KnowledgeSearchBar />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: C.ink3 }}>Loading articles…</div>
        ) : grouped.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: C.ink3 }}>No articles published yet. Check back soon.</div>
        ) : (
          grouped.map(({ category, items }) => (
            <div key={category} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: C.ink, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span>{CATEGORY_ICONS[category] || "📘"}</span> {category}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {items.map(a => (
                  <Link key={a.slug} href={`/learn/${a.slug}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, height: "100%", display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>{a.coverEmoji || CATEGORY_ICONS[category] || "📘"}</div>
                      <h3 style={{ fontSize: 15.5, fontWeight: 800, color: C.ink, margin: 0, lineHeight: 1.35 }}>{a.title}</h3>
                      <p style={{ fontSize: 12.5, color: C.ink3, lineHeight: 1.6, margin: "8px 0 0" }}>{a.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <Footer />
    </div>
  )
}
