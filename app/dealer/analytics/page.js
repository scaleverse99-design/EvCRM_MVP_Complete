"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../lib/AuthContext"
import { authFetch } from "../../../lib/token-storage"
import { C } from "../../../lib/constants"
import Shell from "../../../components/layout/Shell"

// Placeholder data structure for analytics
const mockAnalytics = {
  period: "last_30_days",
  leads: {
    total: 127,
    qualified: 89,
    converted: 12,
    conversionRate: 9.4,
    trend: "+18%"
  },
  revenue: {
    estimatedValue: 2840000,
    pipelineValue: 5200000,
    avgDealValue: 236667,
    trend: "+25%"
  },
  traffic: {
    profileViews: 3450,
    vehicleViews: 8920,
    callsInitiated: 156,
    messagesReceived: 412
  },
  inventory: {
    activeListings: 34,
    topModel: "Tata Nexon EV Max",
    topModelViews: 1240,
    brands: [
      { name: "Tata Motors", views: 3200, leads: 34 },
      { name: "Ather Energy", views: 2100, leads: 28 },
      { name: "Ola Electric", views: 1850, leads: 21 },
      { name: "Mahindra", views: 1770, leads: 18 }
    ]
  },
  teamPerformance: [
    { rep: "Ramesh Kumar", leads: 32, converted: 3, rate: 9.4, calls: 45 },
    { rep: "Priya Sharma", leads: 28, converted: 4, rate: 14.3, calls: 38 },
    { rep: "Amit Patel", leads: 24, converted: 2, rate: 8.3, calls: 32 },
    { rep: "Zainab Khan", leads: 20, converted: 2, rate: 10.0, calls: 28 },
    { rep: "Unassigned", leads: 23, converted: 1, rate: 4.3, calls: 13 }
  ],
  engagement: {
    dashboardLogins: 47,
    leadUpdates: 89,
    messagesUsed: 156,
    reportGenerated: 12,
    builderToolUsed: 34
  }
}

function StatCard({ label, value, sub, color = C.green, trend = null }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, margin: "8px 0" }}>{value}</div>
      <div style={{ fontSize: 12, color: C.ink3 }}>{sub}</div>
      {trend && <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginTop: 6 }}>{trend}</div>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [data, setData] = useState(mockAnalytics)
  const [loading, setLoading] = useState(false)

  // In production, fetch from /api/dealer/analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const res = await authFetch("/api/dealer/analytics?period=last_30_days")
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (e) {
        console.error("Analytics fetch failed:", e)
      } finally {
        setLoading(false)
      }
    }
    // Uncomment when API is ready:
    // fetchAnalytics()
  }, [])

  return (
    <Shell>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 40 }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: C.ink, margin: 0 }}>Advanced Analytics</h1>
          <p style={{ fontSize: 14, color: C.ink3, margin: "8px 0 0" }}>Deep performance insights across leads, revenue, inventory & team</p>
        </div>

        {/* Period Selector */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          {["last_7_days", "last_30_days", "last_90_days", "all_time"].map(p => (
            <button key={p}
              onClick={() => setActiveTab(p)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: activeTab === p ? C.green : C.card,
                color: activeTab === p ? "#fff" : C.ink2,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              {p === "last_7_days" ? "Last 7 days" : p === "last_30_days" ? "Last 30 days" : p === "last_90_days" ? "Last 90 days" : "All time"}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 20, marginTop: 40 }}>📊 Performance Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 40 }}>
            <StatCard label="Total Leads Received" value={data.leads.total} sub={`${data.leads.qualified} qualified`} color={C.blue} trend={data.leads.trend} />
            <StatCard label="Conversion Rate" value={`${data.leads.conversionRate}%`} sub={`${data.leads.converted} vehicles sold`} color={C.green} />
            <StatCard label="Revenue (Estimated)" value={`₹${(data.revenue.estimatedValue / 100000).toFixed(1)}L`} sub={`₹${(data.revenue.avgDealValue / 100000).toFixed(1)}L avg deal`} color={C.orange} />
            <StatCard label="Pipeline Value" value={`₹${(data.revenue.pipelineValue / 100000).toFixed(1)}L`} sub="Next 60 days" color={C.purple} />
          </div>

          {/* Traffic & Engagement */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 20 }}>👁️ How Buyers Find You</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 40 }}>
            <StatCard label="Profile Views" value={data.traffic.profileViews.toLocaleString()} sub="Your dealership page" />
            <StatCard label="Vehicle Views" value={data.traffic.vehicleViews.toLocaleString()} sub="Your inventory" />
            <StatCard label="Calls Initiated" value={data.traffic.callsInitiated} sub="Direct contact attempts" />
            <StatCard label="Messages Received" value={data.traffic.messagesReceived} sub="Live inquiries" />
          </div>

          {/* Inventory Performance */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 20 }}>🚗 Inventory Performance</h2>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>Active Listings</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.green, margin: "8px 0" }}>{data.inventory.activeListings}</div>
                <div style={{ fontSize: 12, color: C.ink3 }}>Ready for buyers</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>Top Performing Model</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: "8px 0" }}>{data.inventory.topModel}</div>
                <div style={{ fontSize: 12, color: C.ink3 }}>{data.inventory.topModelViews.toLocaleString()} views</div>
              </div>
            </div>

            {/* Brand breakdown */}
            <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 16 }}>By Brand</h3>
              {data.inventory.brands.map((brand, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{brand.name}</span>
                    <span style={{ fontSize: 12, color: C.ink3 }}>{brand.views.toLocaleString()} views • {brand.leads} leads</span>
                  </div>
                  <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: C.green, width: `${(brand.views / 3200) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Performance */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 20 }}>👥 Team Performance</h2>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                  {["Rep Name", "Leads", "Converted", "Rate", "Calls/Msgs"].map(h => (
                    <th key={h} style={{ padding: 14, textAlign: "left", fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.teamPerformance.map((rep, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: 14, fontSize: 13, fontWeight: 700, color: C.ink }}>{rep.rep}</td>
                    <td style={{ padding: 14, fontSize: 13, color: C.ink2 }}>{rep.leads}</td>
                    <td style={{ padding: 14, fontSize: 13, fontWeight: 700, color: C.green }}>{rep.converted}</td>
                    <td style={{ padding: 14, fontSize: 13, color: C.ink2 }}>{rep.rate.toFixed(1)}%</td>
                    <td style={{ padding: 14, fontSize: 13, color: C.ink3 }}>{rep.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Feature Usage */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 20, marginTop: 40 }}>📈 Platform Engagement</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <StatCard label="Dashboard Logins" value={data.engagement.dashboardLogins} sub="Your activity" />
            <StatCard label="Lead Updates" value={data.engagement.leadUpdates} sub="Status changes" />
            <StatCard label="Messages Sent" value={data.engagement.messagesUsed} sub="WhatsApp/SMS" />
            <StatCard label="Reports Generated" value={data.engagement.reportGenerated} sub="Monthly reports" />
            <StatCard label="BuildPrice Used" value={data.engagement.builderToolUsed} sub="Quotes created" />
          </div>
        </div>

        {/* Export & Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
          <button style={{
            padding: "12px 24px",
            background: C.green,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit"
          }}>
            📥 Export Report
          </button>
          <button style={{
            padding: "12px 24px",
            background: C.card,
            color: C.ink,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit"
          }}>
            📧 Email Report
          </button>
        </div>

        {/* Insights & Recommendations */}
        <div style={{ background: "#FEF9C3", border: "1px dashed #EAB308", borderRadius: 12, padding: 20, marginTop: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#854D0E", marginBottom: 8 }}>💡 Smart Insights</div>
          <ul style={{ fontSize: 12, color: "#854D0E", margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Your <strong>Nexon EV Max</strong> is getting 3x more views than other models — consider allocating more units to inventory.</li>
            <li><strong>Priya Sharma</strong> has the highest conversion rate (14.3%) — she's your top closer. Consider having her mentor other reps.</li>
            <li>23 leads are still unassigned. Quick action: assign them to available reps within 2 hours to improve conversion.</li>
          </ul>
        </div>

      </div>
    </Shell>
  )
}
