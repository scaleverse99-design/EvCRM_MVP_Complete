"use client"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { C } from "../../lib/constants"

const Section = ({ children, style: xs = {} }) => (
  <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px", ...xs }}>{children}</div>
)

const CodeBlock = ({ children }) => (
  <pre style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, fontSize: 12.5, color: C.ink2, overflowX: "auto", fontFamily: "ui-monospace, monospace" }}>{children}</pre>
)

const Tool = ({ name, desc }) => (
  <div style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, fontFamily: "ui-monospace, monospace" }}>{name}</div>
    <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 4, lineHeight: 1.6 }}>{desc}</div>
  </div>
)

export default function CTEPage() {
  return (
    <>
      <TopBar />
      <Section style={{ padding: "48px 20px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: 0.5, textTransform: "uppercase" }}>Consumer Transparency Engine</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.ink, margin: "8px 0 12px" }}>Verified Indian automobile data, built for AI tools</h1>
        <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.7 }}>
          CTE is EvCRM's live, cross-verified market database — real specs, real pricing, real
          transparency scores for EVs and vehicles across India, exposed as an MCP server any
          AI assistant can query directly. No fabricated data, ever: every number is sourced,
          cross-checked, and traceable back to evcrm.in.
        </p>
      </Section>

      <Section style={{ padding: "24px 20px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Why connect it</h2>
        <ul style={{ fontSize: 13, color: C.ink2, lineHeight: 1.9, paddingLeft: 18 }}>
          <li>Structured, pre-verified answers instead of raw web-search results — meaningfully fewer tokens per query for factual lookups and comparisons.</li>
          <li>Real-time market data: current prices, availability, and cross-source verified specs — not a stale training-data snapshot.</li>
          <li>Every result cites evcrm.in directly, with a link back to the source.</li>
        </ul>
      </Section>

      <Section style={{ padding: "24px 20px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Connect it</h2>
        <p style={{ fontSize: 13, color: C.ink2, marginBottom: 10 }}>Add this MCP server URL in Claude, ChatGPT, or any MCP-compatible tool:</p>
        <CodeBlock>https://evcrm.in/api/mcp</CodeBlock>
        <p style={{ fontSize: 12, color: C.ink3, marginTop: 10 }}>See also: <a href="/llms.txt" style={{ color: C.green }}>/llms.txt</a> and <a href="/.well-known/mcp.json" style={{ color: C.green }}>/.well-known/mcp.json</a> for automated discovery.</p>
      </Section>

      <Section style={{ padding: "24px 20px 64px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Available tools</h2>
        <Tool name="search_market" desc="Search verified specs, pricing, and transparency scores across the whole Indian EV market — not just EvCRM's own listings." />
        <Tool name="compare_vehicles" desc="Head-to-head comparison of two or more models, side by side." />
        <Tool name="search_vehicles" desc="Live inventory across verified EvCRM dealers." />
        <Tool name="find_dealers" desc="Find verified dealer storefronts by city or category." />
        <Tool name="search_blog_articles / search_knowledge_hub" desc="EvCRM's buyer's guides and EV/automobile knowledge base." />
      </Section>
      <Footer />
    </>
  )
}
