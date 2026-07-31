"use client"

// ── app/admin/enterprise/page.js ─────────────────────────────────────
// Enterprise Cloud Integration Admin Dashboard
// Live view of all enterprise API clients, usage metrics, and revenue.
// Accessible at: /admin/enterprise

import { useState, useEffect } from "react"

const TIER_COLORS = {
  developer: "#6366f1",
  growth: "#10b981",
  enterprise: "#f59e0b",
}

const PLATFORM_ICONS = {
  aws: "☁️",
  gcp: "🌐",
  azure: "🔷",
  direct: "⚡",
}

const PLATFORM_LABELS = {
  aws: "AWS Marketplace",
  gcp: "GCP Analytics Hub",
  azure: "Azure Marketplace",
  direct: "Direct / API Key",
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      border: `1px solid ${color}30`,
      borderRadius: 16,
      padding: "24px 28px",
      flex: 1,
      minWidth: 180,
      boxShadow: `0 0 20px ${color}15`,
    }}>
      <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ color, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export default function EnterpriseAdminPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newClientForm, setNewClientForm] = useState({ clientName: "", clientEmail: "", tier: "developer", cloudPlatform: "direct" })
  const [generatedKey, setGeneratedKey] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchClients()
    const interval = setInterval(fetchClients, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchClients() {
    try {
      const res = await fetch("/api/admin/enterprise")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (err) {
      console.error("Failed to load enterprise clients:", err)
    } finally {
      setLoading(false)
    }
  }

  async function generateKey() {
    if (!newClientForm.clientName || !newClientForm.clientEmail) return
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientForm),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedKey(data)
        fetchClients()
        setNewClientForm({ clientName: "", clientEmail: "", tier: "developer", cloudPlatform: "direct" })
      }
    } catch (err) {
      console.error("Failed to generate API key:", err)
    } finally {
      setGenerating(false)
    }
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Compute stats
  const totalCalls = clients.reduce((acc, c) => acc + (c.totalCallCount || 0), 0)
  const totalEarningsUSD = (totalCalls * 0.0002).toFixed(2)
  const totalEarningsINR = (totalCalls * 0.0002 * 84).toFixed(0)
  const activeClients = clients.filter(c => c.status === "active").length

  const containerStyle = {
    minHeight: "100vh",
    background: "#020617",
    color: "#e2e8f0",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: "32px",
  }

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: "1px solid #1e293b",
  }

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 28 }}>☁️</span>
              <h1 style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
                CTE Enterprise Cloud Dashboard
              </h1>
            </div>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
              Live enterprise API clients, usage metrics, and revenue across AWS, GCP & Azure Marketplace
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["AWS Marketplace", "GCP Analytics Hub", "Azure Marketplace"].map(platform => (
              <a key={platform} href="#" style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: "#1e293b", color: "#94a3b8", textDecoration: "none",
                border: "1px solid #334155",
              }}>{platform}</a>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <StatCard label="Active Enterprise Clients" value={activeClients} sub={`${clients.length} total registered`} color="#6366f1" />
          <StatCard label="Total API Calls" value={totalCalls.toLocaleString()} sub="All time across all clients" color="#10b981" />
          <StatCard label="CTE Net Revenue" value={`$${totalEarningsUSD}`} sub={`₹${Number(totalEarningsINR).toLocaleString("en-IN")} total earnings`} color="#f59e0b" />
          <StatCard label="Tokens Saved for Clients" value={`${(totalCalls * 400 / 1000).toFixed(0)}K`} sub="vs expensive raw web scraping" color="#06b6d4" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24 }}>

          {/* Client Table */}
          <div style={{ background: "#0f172a", borderRadius: 16, border: "1px solid #1e293b", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>Enterprise Clients</h2>
              <button onClick={fetchClients} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading enterprise clients...</div>
            ) : clients.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌐</div>
                <div style={{ color: "#64748b", fontSize: 15 }}>No enterprise clients yet.</div>
                <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>Generate the first API key using the form →</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0a1120" }}>
                    {["Client", "Platform", "Tier", "Calls (Month / Total)", "Revenue", "Status"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #1e293b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, i) => {
                    const earningsUSD = (client.totalCallCount || 0) * 0.0002
                    return (
                      <tr key={client.clientId} style={{ borderBottom: "1px solid #1e293b", background: i % 2 === 0 ? "transparent" : "#0a1120" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{client.clientName}</div>
                          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{client.clientEmail}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontSize: 18, marginRight: 6 }}>{PLATFORM_ICONS[client.cloudPlatform] || "⚡"}</span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{PLATFORM_LABELS[client.cloudPlatform] || client.cloudPlatform}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: `${TIER_COLORS[client.tier]}20`, color: TIER_COLORS[client.tier],
                            border: `1px solid ${TIER_COLORS[client.tier]}40`,
                          }}>{client.tier?.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: 13 }}>
                          <span style={{ color: "#10b981", fontWeight: 600 }}>{(client.monthlyCallCount || 0).toLocaleString()}</span>
                          <span style={{ color: "#334155" }}> / </span>
                          {(client.totalCallCount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ color: "#f59e0b", fontWeight: 600, fontSize: 13 }}>${earningsUSD.toFixed(2)}</div>
                          <div style={{ color: "#475569", fontSize: 11 }}>₹{(earningsUSD * 84).toFixed(0)}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: client.status === "active" ? "#10b98120" : "#ef444420",
                            color: client.status === "active" ? "#10b981" : "#ef4444",
                          }}>{client.status?.toUpperCase() || "ACTIVE"}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Generate API Key Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#0f172a", borderRadius: 16, border: "1px solid #1e293b", padding: 24 }}>
              <h2 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>
                🔑 Generate Enterprise API Key
              </h2>

              {[
                { label: "Client Name", key: "clientName", type: "text", placeholder: "e.g. Tata Motors AI Team" },
                { label: "Client Email", key: "clientEmail", type: "email", placeholder: "contact@enterprise.com" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={newClientForm[key]}
                    onChange={e => setNewClientForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Tier</label>
                <select
                  value={newClientForm.tier}
                  onChange={e => setNewClientForm(f => ({ ...f, tier: e.target.value }))}
                  style={{ width: "100%", background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                >
                  <option value="developer">Developer — 100K calls/month</option>
                  <option value="growth">Growth — 1M calls/month</option>
                  <option value="enterprise">Enterprise — Unlimited</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Cloud Platform</label>
                <select
                  value={newClientForm.cloudPlatform}
                  onChange={e => setNewClientForm(f => ({ ...f, cloudPlatform: e.target.value }))}
                  style={{ width: "100%", background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                >
                  <option value="direct">⚡ Direct API Key</option>
                  <option value="aws">☁️ AWS Marketplace</option>
                  <option value="gcp">🌐 GCP Analytics Hub</option>
                  <option value="azure">🔷 Azure Marketplace</option>
                </select>
              </div>

              <button
                onClick={generateKey}
                disabled={generating || !newClientForm.clientName || !newClientForm.clientEmail}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white", fontWeight: 600, fontSize: 14,
                  opacity: (generating || !newClientForm.clientName || !newClientForm.clientEmail) ? 0.5 : 1,
                  transition: "all 0.2s",
                }}
              >
                {generating ? "⏳ Generating..." : "🔑 Generate Enterprise API Key"}
              </button>
            </div>

            {/* Generated Key Display */}
            {generatedKey && (
              <div style={{ background: "#0f172a", borderRadius: 16, border: "1px solid #10b98140", padding: 24 }}>
                <div style={{ color: "#10b981", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>✅ API Key Generated!</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>⚠️ Save this key now — it won't be shown again:</div>
                <div style={{
                  background: "#020617", borderRadius: 8, padding: "12px 14px",
                  fontFamily: "monospace", fontSize: 11, color: "#10b981",
                  wordBreak: "break-all", border: "1px solid #10b98130",
                  marginBottom: 12,
                }}>{generatedKey.apiKey}</div>
                <button
                  onClick={() => copyKey(generatedKey.apiKey)}
                  style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}
                >
                  {copied ? "✅ Copied!" : "📋 Copy API Key"}
                </button>
                <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
                  <div>Client ID: <span style={{ color: "#64748b", fontFamily: "monospace" }}>{generatedKey.clientId}</span></div>
                  <div>Tier: <span style={{ color: TIER_COLORS[generatedKey.tier] }}>{generatedKey.tier}</span></div>
                </div>
              </div>
            )}

            {/* API Usage Example */}
            <div style={{ background: "#0f172a", borderRadius: 16, border: "1px solid #1e293b", padding: 24 }}>
              <h3 style={{ margin: "0 0 14px 0", fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>📖 Quick Integration Guide</h3>
              <div style={{ fontFamily: "monospace", fontSize: 11, background: "#020617", borderRadius: 8, padding: 14, color: "#94a3b8", border: "1px solid #1e293b" }}>
                <div style={{ color: "#475569", marginBottom: 8 }}># Single query</div>
                <div style={{ color: "#6366f1" }}>GET</div>
                <div style={{ wordBreak: "break-all" }}>https://evcrm.in/api/v1/enterprise</div>
                <div style={{ color: "#334155" }}>  ?query=ather+450x&type=all</div>
                <div style={{ marginTop: 8, color: "#334155" }}>Authorization: Bearer cte_live_...</div>
                <div style={{ marginTop: 12, color: "#475569" }}># Bulk stream (Growth+ only)</div>
                <div style={{ color: "#10b981" }}>GET</div>
                <div style={{ wordBreak: "break-all" }}>https://evcrm.in/api/v1/enterprise/stream</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
