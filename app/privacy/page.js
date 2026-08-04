"use client"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { C } from "../../lib/constants"

// Written to match what the code actually does, table by table, rather
// than generic boilerplate — this is also the page linked from the MCP
// connector directory submission, so it has to be checkable, not just
// plausible.

const Section = ({ children, style: xs = {} }) => (
  <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px", ...xs }}>{children}</div>
)

const H2 = ({ children }) => (
  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: "28px 0 10px" }}>{children}</h2>
)

export default function PrivacyPage() {
  return (
    <>
      <TopBar />
      <Section style={{ padding: "48px 20px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: 0.5, textTransform: "uppercase" }}>Privacy</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.ink, margin: "8px 0 4px" }}>Privacy Policy</h1>
        <p style={{ fontSize: 12, color: C.ink3 }}>Last updated 2026-08-04</p>
      </Section>

      <Section style={{ padding: "0 20px 64px", fontSize: 13.5, color: C.ink2, lineHeight: 1.8 }}>
        <p>
          EvCRM (evcrm.in) is a vehicle marketplace and data platform operated by Scaleverse
          Technologies Pvt Ltd. This page describes what we collect, why, and how long we keep it —
          specifically, not in general terms.
        </p>

        <H2>What we do not collect</H2>
        <ul style={{ paddingLeft: 18 }}>
          <li>We do not collect IP addresses for analytics or tracking purposes.</li>
          <li>We do not use third-party tracking cookies to build advertising profiles.</li>
          <li>We do not sell personal data.</li>
          <li>The public MCP server (below) requires no login and collects no account data — anyone can query it anonymously.</li>
        </ul>

        <H2>What we do collect, and why</H2>

        <p style={{ fontWeight: 700, color: C.ink, marginTop: 16 }}>Account data (dealers, buyers who register)</p>
        <p>Name, email, phone, and dealership details you provide when creating an account, used to operate the marketplace — listings, leads, bookings. Not sold or shared with third parties beyond what's needed to complete a transaction you initiated (e.g. connecting a buyer to a dealer they contacted).</p>

        <p style={{ fontWeight: 700, color: C.ink, marginTop: 16 }}>Search intent (query_signals)</p>
        <p>When a query is made through our public data tools — the on-site search, or the MCP server — we log the normalized topic (e.g. "used cars, Vijayawada") and a count of how often it's asked. We do not store who asked it. This aggregate signal decides which topics we write content about; it is never tied to an individual.</p>

        <p style={{ fontWeight: 700, color: C.ink, marginTop: 16 }}>Outbound click tracking (outbound_clicks)</p>
        <p>When a link to a third-party site (e.g. a listing on a partner marketplace) is followed from evcrm.in, we record the destination, the vehicle model/city context, and a timestamp — no IP address, no user identifier, no cookie, no browsing history. This exists to show demand ("N people looked for this model in this city"), not to identify anyone.</p>

        <p style={{ fontWeight: 700, color: C.ink, marginTop: 16 }}>Live visitor count (active_visitors)</p>
        <p>Pages may show a real-time count of people currently viewing the site. This uses a random identifier generated in your browser and held only in that tab's session storage — not a cookie, not linked to any account, and deleted automatically within minutes of the tab closing or going idle. We use it only to compute a live count; we do not use it to track individuals or their browsing history.</p>

        <p style={{ fontWeight: 700, color: C.ink, marginTop: 16 }}>Third-party sourced data (dealer_outreach)</p>
        <p>When we source nearby dealership information from Google Places for a city we don't have a partner in, we store that business's publicly listed name, address, and phone number to answer future queries about that city without a repeat lookup. This is public business information, not personal data about you as a visitor.</p>

        <H2>MCP server and AI tool queries</H2>
        <p>
          Our MCP server (<a href="/cte" style={{ color: C.green }}>evcrm.in/api/mcp</a>) is public and requires
          no authentication. Queries made through it by AI assistants are treated the same as search
          intent above: the topic may be logged in aggregate to improve what data we cover; no
          identifying information about you or your AI session is collected, because the server has
          no way to see who is asking — only what.
        </p>
        <p>
          We do not fabricate data to answer a query. Where we cannot answer from verified data, the
          server returns nothing rather than a guess — see our <a href="/cte" style={{ color: C.green }}>connector documentation</a>.
        </p>

        <H2>Data retention</H2>
        <ul style={{ paddingLeft: 18 }}>
          <li>Account data: retained while your account is active, deleted on request.</li>
          <li>Search intent and click data: aggregate counts, retained indefinitely as they identify no individual.</li>
          <li>Live visitor session identifiers: deleted within minutes.</li>
        </ul>

        <H2>Contact</H2>
        <p>
          Questions about this policy, or a request to access or delete your data:{" "}
          <a href="mailto:support@evcrm.in" style={{ color: C.green }}>support@evcrm.in</a>
        </p>
      </Section>
      <Footer />
    </>
  )
}
