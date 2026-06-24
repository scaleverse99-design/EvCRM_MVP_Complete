"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"

const T = {
  bg:      "#f8fafc",
  card:    "#ffffff",
  border:  "#e2e8f0",
  ink:     "#0f172a",
  ink2:    "#475569",
  ink3:    "#94a3b8",
  accent:  "#10b981",
  highlight: "#f97316",
}

export default function PulseDetailEngine() {
  const { slug } = useParams()
  const router = useRouter()

  const [article, setArticle] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!slug) return
      try {
        const res = await fetch('/api/pulse')
        const data = await res.json()
        if (data.success && data.news?.length) {
          const found = data.news.find(a => (a.slug || a.seo_slug) === slug)
          setArticle(found || null)
          setRelated(data.news.filter(a => (a.slug || a.seo_slug) !== slug).slice(0, 3))
        }
      } catch (err) {
        console.error("[Pulse Detail Error]:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <TopBar />
      <div style={{ textAlign: "center", padding: "120px 20px", color: T.ink3, fontSize: 16 }}>
        📡 Loading article...
      </div>
    </div>
  )

  if (!article) return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <TopBar />
      <div style={{ textAlign: "center", padding: "120px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: T.ink, fontWeight: 800 }}>Article Not Found</h2>
        <p style={{ color: T.ink3 }}>This article may have been removed or not yet published.</p>
        <button onClick={() => router.push("/news")}
          style={{ marginTop: 24, background: T.accent, color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
          ← Back to News
        </button>
      </div>
      <Footer />
    </div>
  )

  const tags = typeof article.tags === 'string' ? article.tags.split(',') : (article.tags || [])
  const pubDate = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: T.ink }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .article-body p { margin: 0 0 20px; color: #475569; line-height: 1.8; font-size: 17px; }
        .article-body h3 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 36px 0 14px; }
        .article-body strong { color: #0f172a; }
        .read-more-btn:hover { background: #0f172a !important; color: #fff !important; }
        .back-btn:hover { background: #e2e8f0 !important; }
      ` }} />

      <TopBar />

      <main style={{ maxWidth: 1140, margin: "0 auto", padding: "40px 20px 80px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "start" }}>

        {/* ── LEFT: ARTICLE ── */}
        <article>
          {/* Back button */}
          <button className="back-btn" onClick={() => router.push("/news")}
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.ink2, padding: "8px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 28, display: "flex", alignItems: "center", gap: 6, transition: "0.2s" }}>
            ← Back to News
          </button>

          {/* Category */}
          <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: `${T.accent}15`, color: T.accent, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {article.category || "Industry Intelligence"}
            </span>
            {article.type === 'blog' && (
              <span style={{ background: `${T.highlight}15`, color: T.highlight, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Blog
              </span>
            )}
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 34, fontWeight: 900, color: T.ink, lineHeight: 1.2, margin: "0 0 16px", letterSpacing: "-0.5px" }}>
            {article.title}
          </h1>

          {/* Subheadline */}
          {article.subheadline && (
            <p style={{ fontSize: 19, color: T.ink2, fontWeight: 500, lineHeight: 1.5, margin: "0 0 24px", borderLeft: `4px solid ${T.accent}`, paddingLeft: 16 }}>
              {article.subheadline}
            </p>
          )}

          {/* Meta */}
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: T.ink3, fontWeight: 600, marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
            {pubDate && <span>📅 {pubDate}</span>}
            <span>⏱ {article.reading_time || "3 min read"}</span>
            <span>✍️ {article.source_name || "EVCRM Intelligence Agent"}</span>
          </div>

          {/* Hero image */}
          {article.featured_image_url && (
            <img src={article.featured_image_url} alt={article.title}
              style={{ width: "100%", borderRadius: 20, marginBottom: 36, maxHeight: 420, objectFit: "cover", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }} />
          )}

          {/* Body — rendered as HTML from AI */}
          <div className="article-body"
            dangerouslySetInnerHTML={{ __html: article.body_html || `<p>${article.summary || ''}</p>` }} />

          {/* Stakeholder Insight box */}
          {article.stakeholder_insight && (
            <div style={{ marginTop: 40, padding: 28, background: T.ink, borderRadius: 18, color: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: T.accent, letterSpacing: 1, marginBottom: 10 }}>🧠 INDUSTRY TAKEAWAY</div>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, fontStyle: "italic", opacity: 0.9 }}>{article.stakeholder_insight}</p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ marginTop: 36, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tags.map((tag, i) => (
                <span key={i} style={{ background: "#f1f5f9", color: T.ink2, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* ── RIGHT: SIDEBAR ── */}
        <aside style={{ position: "sticky", top: 100 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
            <h4 style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: T.ink2, textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: T.accent }}>📡</span> Related Intelligence
            </h4>

            {related.length === 0 ? (
              <p style={{ fontSize: 13, color: T.ink3 }}>More articles loading...</p>
            ) : related.map(item => (
              <a key={item.id || item.slug} href={`/pulse/${item.slug || item.seo_slug}`}
                style={{ display: "block", marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${T.border}`, textDecoration: "none" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.highlight, marginBottom: 4, textTransform: "uppercase" }}>
                  {item.category || "EV News"}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: T.ink3, marginTop: 6 }}>{item.reading_time || "3 min read"}</div>
              </a>
            ))}
          </div>

          {/* CTA Box */}
          <div style={{ marginTop: 20, background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 20, padding: 24, color: "#fff" }}>
            <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.8 }}>🚗 EV DEALER CRM</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 10px" }}>Manage Your EV Business</h3>
            <p style={{ fontSize: 13, opacity: 0.85, margin: "0 0 16px", lineHeight: 1.5 }}>Track leads, inventory, and sales. Built for India's EV revolution.</p>
            <a href="/register" style={{ display: "block", textAlign: "center", background: "#fff", color: "#059669", padding: "12px", borderRadius: 12, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
              Get Started Free →
            </a>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  )
}
