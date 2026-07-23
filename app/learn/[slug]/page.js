"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { C } from "../../../lib/constants"
import TopBar from "../../../components/home/TopBar"
import Footer from "../../../components/home/Footer"

import TransmissionWidget from "../../../components/learn/widgets/TransmissionWidget"
import BatteryWidget from "../../../components/learn/widgets/BatteryWidget"

// Inline renderer — handles **bold**, [text](url) links, and bare
// [domain/path] citations (the orchestrator's cited news articles can surface
// at either route, and their writer sometimes strips citations down to a bare
// bracketed URL). Keep this in sync with the same helper in app/blog/[slug].
// No-op for plain text, and never injects HTML (builds React nodes).
const INLINE = /(\*\*(?=\S)([^*]+?)\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))|(\[([^\]\s]+\.[a-z]{2,}[^\]]*)\])/gi

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
      nodes.push(<strong key={m.index} style={{ fontWeight: 800, color: C.ink }}>{m[2]}</strong>)
    } else if (m[3]) {
      const url = m[5]
      const safe = /^https?:\/\//i.test(url) ? url : "#"
      nodes.push(
        <a key={m.index} href={safe} target="_blank" rel="noopener noreferrer nofollow"
          style={{ color: C.green, textDecoration: "none", fontWeight: 600 }}>{m[4]}</a>
      )
    } else {
      nodes.push(citationLink(m[7], m.index))
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes.length ? nodes : text
}

// Splits body text into typed blocks, peeling a '## ' heading onto its own
// block even when the writer put it a single '\n' above the paragraph (not a
// blank line) — otherwise the whole section renders as one giant unprocessed
// heading. Keep in sync with app/blog/[slug].
function parseBlocks(text) {
  const out = []
  for (const chunk of (text || "").split(/\n{2,}/)) {
    let buf = []
    const flush = () => { const t = buf.join("\n").trim(); if (t) out.push(t); buf = [] }
    for (const line of chunk.split("\n")) {
      if (line.trim().startsWith("## ")) { flush(); out.push(line.trim()) }
      else buf.push(line)
    }
    flush()
  }
  return out
}

// Renders the article body: '## ' lines become headings, blank lines split
// paragraphs. Inline `[text](url)` citations render as clean source links.
// Renders interactive widgets inline when custom tags are encountered.
function ArticleBody({ text }) {
  const blocks = parseBlocks(text)
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return <h2 key={i} style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: "28px 0 10px" }}>{renderInline(block.slice(3))}</h2>
        }
        if (block === "[widget:transmission]") {
          return <TransmissionWidget key={i} />
        }
        if (block === "[widget:battery]") {
          return <BatteryWidget key={i} />
        }
        return <p key={i} style={{ fontSize: 15, lineHeight: 1.75, color: C.ink2, margin: "0 0 16px" }}>{renderInline(block)}</p>
      })}
    </>
  )
}

// Icon-illustrated "get the gist in 5 seconds" box — no real image needed,
// makes the page feel visual instead of a wall of text.
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

function PullQuote({ text }) {
  if (!text) return null
  return (
    <div style={{ borderLeft: `4px solid ${C.green}`, background: `${C.green}08`, borderRadius: "0 12px 12px 0", padding: "18px 22px", margin: "0 0 20px" }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>"{text}"</div>
    </div>
  )
}

function ComparisonTable({ table }) {
  if (!table?.rows?.length) return null
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 20, overflowX: "auto" }}>
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

        <KeyTakeaways items={post.keyTakeaways} />
        <PullQuote text={post.pullQuote} />
        <ComparisonTable table={post.comparisonTable} />

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
