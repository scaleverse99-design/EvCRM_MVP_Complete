"use client"
import Link from "next/link"
import { Btn, Card, Tag } from "../../components/ui"
import { C } from "../../lib/constants"
import "../landing.css"

export default function BlogPage() {
  const posts = [
    {
      title: "How to Scale Your EV Dealership in 2026",
      excerpt: "The EV market in India is exploding. Here are the top 3 strategies to capture more market share...",
      date: "Oct 12, 2026",
      tag: "STRATEGY"
    },
    {
      title: "Why AI Lead Scoring is the Future of Auto Sales",
      excerpt: "Stop wasting time on lukewarm leads. Learn how EvCRM's priority algorithm works...",
      date: "Oct 10, 2026",
      tag: "AI"
    },
    {
      title: "EvCRM: The Journey to 99% Profit Margins",
      excerpt: "How we leveraged serverless architecture to build an enterprise CRM with zero overhead...",
      date: "Oct 05, 2026",
      tag: "ENGINEERING"
    }
  ]

  return (
    <div className="lp-container">
      {/* Blog Nav */}
      <nav className="lp-nav">
        <div className="lp-grid" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div className="lp-logo">
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: 24 }}>⚡</span> EvCRM <span style={{ color: C.ink3, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>Blog</span>
            </Link>
          </div>
          <Btn variant="secondary" onClick={() => window.location.href = "https://evcrm.in"}>Back to Site</Btn>
        </div>
      </nav>

      <main className="lp-grid">
        {/* Blog Header */}
        <header style={{ padding: '60px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 16 }}>Insights for <span style={{ color: C.green }}>EV Leaders.</span></h1>
          <p style={{ fontSize: 18, color: C.ink3 }}>Mastering sales and operations in the electric mobility age.</p>
        </header>

        {/* Featured Posts */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 32, paddingBottom: 100 }}>
          {posts.map((post, i) => (
            <Card key={i} style={{ padding: 0 }}>
              <div style={{ height: 200, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📖</div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 12 }}><Tag label={post.tag} color={C.green} /></div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, lineHeight: 1.3 }}>{post.title}</h2>
                <p style={{ fontSize: 14, color: C.ink3, lineHeight: 1.6, marginBottom: 20 }}>{post.excerpt}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.ink3 }}>{post.date}</span>
                  <Link href="#" style={{ fontSize: 13, fontWeight: 700, color: C.green, textDecoration: 'none' }}>Read More →</Link>
                </div>
              </div>
            </Card>
          ))}
        </section>

        {/* Newsletter CTA */}
        <section className="lp-cta-box animate-fade" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink }}>
          <h2 className="lp-cta-title" style={{ fontSize: 32 }}>Get EV insights weekly.</h2>
          <p className="lp-cta-sub" style={{ color: C.ink3 }}>Join 5,000+ dealership owners receiving our sales breakdown.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, maxWidth: 400, margin: '0 auto' }}>
            <input type="email" placeholder="Email address" style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}`, outline: 'none' }} />
            <Btn style={{ padding: '12px 24px' }}>Subscribe</Btn>
          </div>
        </section>
      </main>

      <footer style={{ padding: '60px 0', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: C.ink3 }}>Powered by EvCRM — Leading the electric mobility revolution.</p>
      </footer>
    </div>
  )
}
