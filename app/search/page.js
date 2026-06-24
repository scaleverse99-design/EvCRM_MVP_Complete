"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { C, fmt } from "../../lib/constants"
import { stripMarkdown } from "../../lib/markdown"

const T = {
  bg:      "#f8fafc",
  card:    "#ffffff",
  border:  "#e2e8f0",
  ink:     "#0f172a",
  ink2:    "#475569",
  ink3:    "#94a3b8",
  accent:  "#10b981",
  blue:    "#3b82f6",
}

function SearchResultsContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get("q") || ""
  const [results, setResults] = useState({ articles: [], vehicles: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!q) return
    async function search() {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.success) setResults(data)
      } catch (err) {
        console.error("Search failed", err)
      } finally {
        setLoading(false)
      }
    }
    search()
  }, [q])

  if (!q) return <div style={{ textAlign: "center", padding: 100, color: T.ink3 }}>Start typing to discover mobility intel...</div>

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: T.ink, letterSpacing: "-1px", marginBottom: 8 }}>
          Discovery: "{q}"
        </h1>
        <p style={{ fontSize: 14, color: T.ink3 }}>
          {loading ? "Scanning platform intelligence..." : `${results.articles.length + results.vehicles.length} matching entities found.`}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.ink3 }}>⚡ Connecting to Pulse Engine...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 40 }}>
          
          {/* SEARCH RESULTS: ARTICLES */}
          <div>
            <h2 style={{ fontSize: 11, fontWeight: 900, color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
              Industry Intelligence ({results.articles.length})
            </h2>
            
            {results.articles.length === 0 ? (
              <p style={{ color: T.ink3, fontSize: 13, fontStyle: "italic" }}>No articles matching this query.</p>
            ) : (
              <div style={{ display: "grid", gap: 24 }}>
                {results.articles.map(a => (
                  <a key={a.id} href={`/pulse/${a.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 20, display: "flex", overflow: "hidden", height: 160, transition: "transform 0.2s" }}>
                       <div style={{ width: 220, background: "#f1f5f9" }}>
                          <img src={a.featured_image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                       </div>
                       <div style={{ padding: 20, flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: T.accent, marginBottom: 6 }}>{a.state?.toUpperCase()} PULSE</div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 8, lineHeight: 1.2 }}>{a.title}</h3>
                          <p style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5 }}>{stripMarkdown(a.summary).slice(0, 160)}...</p>
                       </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* SEARCH RESULTS: VEHICLES (Spinny Style Cards) */}
          <aside>
            <h2 style={{ fontSize: 11, fontWeight: 900, color: T.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
              Marketplace Results ({results.vehicles.length})
            </h2>

            {results.vehicles.length === 0 ? (
              <p style={{ color: T.ink3, fontSize: 13, fontStyle: "italic" }}>No vehicles found.</p>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {results.vehicles.map(v => (
                  <a key={v.id} href={`/showroom`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 20, padding: 20 }}>
                       <div style={{ fontSize: 10, fontWeight: 900, color: T.blue, textTransform: "uppercase", marginBottom: 4 }}>{v.type}</div>
                       <div style={{ fontSize: 16, fontWeight: 900, color: T.ink }}>{v.brand} {v.model}</div>
                       <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>{fmt.currency(v.exShowroom || v.price)}</div>
                       <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9, background: "#f1f5f9", padding: "4px 8px", borderRadius: 4, fontWeight: 700 }}>{v.range || v.spec?.split('·')[0]}</span>
                          <span style={{ fontSize: 9, background: "#f1f5f9", padding: "4px 8px", borderRadius: 4, fontWeight: 700 }}>HIGH DEMAND</span>
                       </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}

export default function SearchPage() {
  return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      <TopBar />
      <Suspense fallback={<div style={{ textAlign: "center", padding: 100 }}>Loading Search Engine...</div>}>
        <SearchResultsContent />
      </Suspense>
      <Footer />
    </div>
  )
}
