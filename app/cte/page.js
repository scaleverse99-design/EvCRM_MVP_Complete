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

      <Section style={{ padding: "24px 20px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Available tools</h2>
        <Tool name="search_market" desc="Search verified specs, pricing, and transparency scores across the whole Indian EV market — not just EvCRM's own listings." />
        <Tool name="compare_vehicles" desc="Head-to-head comparison of two or more models, side by side." />
        <Tool name="search_vehicles" desc="Live inventory across verified EvCRM dealers." />
        <Tool name="get_vehicle_details" desc="Full specs for one listing by ID." />
        <Tool name="find_dealers" desc="Find verified dealer storefronts by city or category, plus real nearby dealerships (Google Places) when no partner covers that city — clearly labelled as non-partners." />
        <Tool name="calculate_emi" desc="Loan EMI, total interest, and total payable for a given principal, rate and tenure. Deterministic amortisation — no AI, no estimation." />
        <Tool name="vehicle_budget_from_emi" desc="Loan amount and vehicle budget a given monthly EMI supports — the EMI formula solved for principal." />
        <Tool name="search_blog_articles / get_blog_article" desc="EvCRM's per-model buyer's guides, and one article in full with current matching inventory." />
        <Tool name="search_knowledge_hub / get_knowledge_article" desc="EV/automobile fundamentals, buying guides, and current industry tech trends." />
      </Section>

      <Section style={{ padding: "24px 20px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Try it</h2>
        <p style={{ fontSize: 13, color: C.ink2, marginBottom: 10 }}>Once connected, ask things like:</p>
        <ul style={{ fontSize: 13, color: C.ink2, lineHeight: 2, paddingLeft: 18 }}>
          <li>"Best electric scooter under ₹1.5 lakh in India"</li>
          <li>"Compare the Ola S1 Pro and Ather 450X"</li>
          <li>"EMI on a ₹6 lakh vehicle loan at 9.5% over 5 years"</li>
          <li>"Find used car dealers in Vijayawada"</li>
        </ul>
      </Section>

      <Section style={{ padding: "24px 20px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Data, privacy, and auth</h2>
        <ul style={{ fontSize: 13, color: C.ink2, lineHeight: 1.9, paddingLeft: 18 }}>
          <li>No authentication required — the server is public and read-only.</li>
          <li>No user data is collected by the server. Query topics (not raw personal data) are logged in aggregate to understand demand and improve coverage — see our <a href="/privacy" style={{ color: C.green }}>privacy policy</a>.</li>
          <li>Every response states its source: <code style={{ fontFamily: "ui-monospace, monospace" }}>verified_db</code> for EvCRM's own data, <code style={{ fontFamily: "ui-monospace, monospace" }}>live</code> for third-party-sourced facts with citations.</li>
          <li>We do not fabricate data. A question we cannot answer from verified data returns nothing rather than a guess.</li>
        </ul>
      </Section>

      <Section style={{ padding: "24px 20px 64px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Support</h2>
        <p style={{ fontSize: 13, color: C.ink2 }}>
          Questions or issues with the connector: <a href="mailto:support@evcrm.in" style={{ color: C.green }}>support@evcrm.in</a>
        </p>
      </Section>
      <Footer />
    </>
  )
}
