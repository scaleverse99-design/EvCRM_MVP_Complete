"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Avatar, StatusPill } from "../../components/ui"
import { C } from "../../lib/constants"
import { useAuth } from "../../lib/AuthContext"
import { OpsProxy } from "../../lib/ops-proxy"

export default function QueuePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    if (!user) return
    
    const fetchQueue = async () => {
      try {
        const leads = await OpsProxy.get("evcrm_leads", user)
        if (!leads || !Array.isArray(leads)) {
          setQueue([])
          setLoading(false)
          return
        }

        // Calculate scores for each lead
        const scoredLeads = leads.map(lead => {
          const scoreData = calculateLeadScore(lead)
          return {
            ...lead,
            score: scoreData.score,
            recommendation: scoreData.recommendation,
            factors: scoreData.factors
          }
        })

        // Sort by score descending and take top 10
        setQueue(scoredLeads.sort((a, b) => b.score - a.score).slice(0, 10))
      } catch (error) {
        console.error("Queue Sync Error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchQueue()
    const itv = setInterval(fetchQueue, 30000) // Poll every 30s
    return () => clearInterval(itv)
  }, [user])

  // Scoring algorithm (same as server-side)
  function calculateLeadScore(lead) {
    let score = 0
    let factors = {}

    // 1. Lead Status (0-3 points)
    const statusScores = { NEW: 1, WARM: 2, HOT: 3, COLD: 0, CLOSED: 0 }
    const statusScore = statusScores[lead.status] || 0
    score += statusScore
    factors.statusScore = statusScore

    // 2. Time since last contact (0-2 points)
    let recencyScore = 2
    if (lead.last_contact) {
      const hoursSinceContact = (Date.now() - new Date(lead.last_contact)) / (1000 * 60 * 60)
      if (hoursSinceContact > 168) recencyScore = 0 // More than 1 week
      else if (hoursSinceContact > 72) recencyScore = 1 // More than 3 days
    }
    score += recencyScore
    factors.recencyScore = recencyScore

    // 3. Source quality (0-2 points)
    const sourceScores = {
      "OEM Direct": 2,
      "Lead Aggregator": 1.5,
      "Social Media": 1,
      "Google Ads": 1.5,
      "Referral": 2,
      "Walk-in": 0.5,
      "Direct": 1
    }
    const sourceScore = sourceScores[lead.source] || 0.5
    score += sourceScore
    factors.sourceScore = sourceScore

    // 4. Vehicle preference (0-1 point)
    const vehicleScore = (lead.vehicle && lead.vehicle.length > 0) ? 1 : 0
    score += vehicleScore
    factors.vehicleScore = vehicleScore

    // 5. Budget alignment (0-1 point)
    let budgetScore = 0
    if (lead.budget) {
      const budget = parseInt(lead.budget.replace(/[^0-9]/g, ""))
      if (budget >= 1000000 && budget <= 5000000) budgetScore = 1
    }
    score += budgetScore
    factors.budgetScore = budgetScore

    // 6. Engagement count (0-0.5 points)
    let engagementScore = 0
    const contactCount = lead.contact_count || 0
    if (contactCount > 5) engagementScore = 0.5
    else if (contactCount > 2) engagementScore = 0.25
    score += engagementScore
    factors.engagementScore = engagementScore

    // 7. Test drive interest (0-1 point)
    const testDriveScore = (lead.test_drive_scheduled) ? 1 : 0
    score += testDriveScore
    factors.testDriveScore = testDriveScore

    // Normalize to 0-10 scale
    const normalizedScore = Math.min(Math.round((score / 11.5) * 10 * 10) / 10, 10)

    return {
      score: normalizedScore,
      factors: factors,
      recommendation: normalizedScore >= 8 ? "URGENT" : normalizedScore >= 6 ? "PRIORITY" : normalizedScore >= 4 ? "FOLLOW-UP" : "NURTURE"
    }
  }

  const handleRecalculateScores = async () => {
    setRecalculating(true)
    try {
      const token = localStorage.getItem("auth_token")
      const res = await fetch("/api/leads/score-batch", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: JSON.stringify({})
      })
      if (res.ok) {
        alert("✅ All lead scores recalculated!")
      }
    } catch (error) {
      console.error("Recalculation error:", error)
    } finally {
      setRecalculating(false)
    }
  }

  const getRecommendationColor = (rec) => {
    return rec === "URGENT" ? C.red : rec === "PRIORITY" ? C.orange : rec === "FOLLOW-UP" ? C.yellow : C.blue
  }

  const getRecommendationIcon = (rec) => {
    return rec === "URGENT" ? "🔴" : rec === "PRIORITY" ? "🟠" : rec === "FOLLOW-UP" ? "🟡" : "🔵"
  }

  return (
    <Shell title="AI Queue">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginBottom: 4 }}>⚡ Pulse AI Queue</h1>
          <p style={{ fontSize: 12, color: C.ink3 }}>
            {loading ? "Scoring leads..." : `AI selected your top ${queue.length} leads for today based on real-time scoring`}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: C.greenL, border: `1px solid ${C.green}40`, borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.green, lineHeight: 1 }}>{queue.length}<span style={{ fontSize: 12, color: C.ink3 }}>/10</span></div>
            <div style={{ fontSize: 10, color: C.ink3, marginTop: 2 }}>leads today</div>
          </div>
          <button onClick={handleRecalculateScores} disabled={recalculating} style={{ fontSize: 10, fontWeight: 600, padding: "6px 12px", background: recalculating ? C.border : C.blue, color: recalculating ? C.ink3 : "#fff", border: "none", borderRadius: 8, cursor: recalculating ? "not-allowed" : "pointer" }}>
            {recalculating ? "Recalculating..." : "🔄 Refresh Scores"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {queue.map((lead, i) => (
          <Card key={lead.id} style={{ cursor: "pointer", position: "relative" }} onClick={() => router.push(`/leads/${lead.id}`)}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.bg, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.ink3, flexShrink: 0 }}>{i + 1}</div>
              <Avatar name={lead.name} size={40} color={lead.status === "HOT" ? C.red : lead.status === "WARM" ? C.yellow : C.blue} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{lead.name}</div>
                    <div style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>{lead.vehicle || "No vehicle preference"} • {lead.source || "Unknown source"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <StatusPill status={lead.status} />
                    <div 
                      style={{ 
                        fontSize: 24, 
                        fontWeight: 900, 
                        color: getRecommendationColor(lead.recommendation),
                        cursor: "pointer",
                        position: "relative"
                      }}
                      onMouseEnter={() => setTooltip(lead.id)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {lead.score.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown Tooltip */}
            {tooltip === lead.id && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                zIndex: 50,
                minWidth: 220,
                fontSize: 11
              }}>
                <div style={{ fontWeight: 800, color: C.ink, marginBottom: 8 }}>📊 Score Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Status ({lead.status}):</span>
                    <span style={{ fontWeight: 700 }}>+{lead.factors?.statusScore?.toFixed(1) || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Recency:</span>
                    <span style={{ fontWeight: 700 }}>+{lead.factors?.recencyScore?.toFixed(1) || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Source Quality:</span>
                    <span style={{ fontWeight: 700 }}>+{lead.factors?.sourceScore?.toFixed(1) || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Vehicle Match:</span>
                    <span style={{ fontWeight: 700 }}>+{lead.factors?.vehicleScore?.toFixed(1) || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Budget Alignment:</span>
                    <span style={{ fontWeight: 700 }}>+{lead.factors?.budgetScore?.toFixed(1) || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Engagement:</span>
                    <span style={{ fontWeight: 700 }}>+{lead.factors?.engagementScore?.toFixed(1) || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Test Drive:</span>
                    <span style={{ fontWeight: 700 }}>+{lead.factors?.testDriveScore?.toFixed(1) || 0}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                    <span>Total:</span>
                    <span style={{ color: getRecommendationColor(lead.recommendation) }}>{lead.score.toFixed(1)}/10</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: C.bg, borderRadius: 9, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: C.ink3, marginBottom: 4 }}>PRIORITY LEVEL</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: getRecommendationColor(lead.recommendation) }}>{getRecommendationIcon(lead.recommendation)} {lead.recommendation}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 9, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: C.ink3, marginBottom: 4 }}>LAST CONTACT</div>
                <div style={{ fontSize: 11, color: C.ink2 }}>{lead.last_contact ? new Date(lead.last_contact).toLocaleDateString() : "Never"}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
              {[
                { l: "📞 Call", c: C.blue },
                { l: "💬 WhatsApp", c: C.green },
                { l: "📄 View Details", c: C.orange, href: `/leads/${lead.id}` }
              ].map(a => (
                <button key={a.l} onClick={() => router.push(a.href)} style={{ flex: 1, background: `${a.c}10`, border: `1px solid ${a.c}30`, color: a.c, borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{a.l}</button>
              ))}
            </div>
          </Card>
        ))}
        {!loading && queue.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", background: C.card, borderRadius: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>No leads to prioritize yet</div>
            <p style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>Once you add leads, AI will automatically score and prioritize them.</p>
          </div>
        )}
      </div>
    </Shell>
  )
}
