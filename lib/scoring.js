// ── AI Lead Scoring Algorithm ─────────────────────────────────
// Evaluates lead quality on 0-10 scale based on multiple factors

export function calculateLeadScore(lead) {
  let score = 0
  let factors = {}

  // 1. Lead Status (0-3 points)
  // HOT leads are actively interested, NEW leads need nurturing
  const statusScores = { 
    NEW: 1,      // Just entered the funnel
    WARM: 2,     // Showing interest
    HOT: 3,      // Ready to close
    COLD: 0,     // Lost momentum
    CLOSED: 0    // Already converted
  }
  const statusScore = statusScores[lead.status] || 0
  score += statusScore
  factors.statusScore = statusScore

  // 2. Time since last contact (0-2 points)
  // Fresh contacts are better - prevents stale leads
  let recencyScore = 2
  if (lead.last_contact) {
    const hoursSinceContact = (Date.now() - new Date(lead.last_contact)) / (1000 * 60 * 60)
    if (hoursSinceContact > 168) recencyScore = 0        // More than 1 week = cold
    else if (hoursSinceContact > 72) recencyScore = 1    // More than 3 days = cooling
  }
  score += recencyScore
  factors.recencyScore = recencyScore

  // 3. Source quality (0-2 points)
  // OEM & referral sources are high-quality, walk-ins need more nurturing
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

  // 4. Vehicle preference clarity (0-1 point)
  // Specified vehicle interest = serious intent
  const vehicleScore = (lead.vehicle && lead.vehicle.length > 0) ? 1 : 0
  score += vehicleScore
  factors.vehicleScore = vehicleScore

  // 5. Budget alignment (0-1 point)
  // If budget falls within market range (10L-50L), they're likely serious
  let budgetScore = 0
  if (lead.budget) {
    const budget = parseInt(lead.budget.replace(/[^0-9]/g, ""))
    if (budget >= 1000000 && budget <= 5000000) budgetScore = 1  // ₹10L-₹50L range
  }
  score += budgetScore
  factors.budgetScore = budgetScore

  // 6. Engagement frequency (0-0.5 points)
  // Multiple touchpoints = higher intent
  let engagementScore = 0
  const contactCount = lead.contact_count || 0
  if (contactCount > 5) engagementScore = 0.5
  else if (contactCount > 2) engagementScore = 0.25
  score += engagementScore
  factors.engagementScore = engagementScore

  // 7. Test drive scheduled (0-1 point)
  // Scheduling a test drive = concrete sales signal
  const testDriveScore = (lead.test_ride_date || lead.test_drive_scheduled) ? 2 : 0
  score += testDriveScore
  factors.testDriveScore = testDriveScore

  // 8. Tool Interaction & Intent (Phase 0 spec)
  // Added points for using specific discovery tools
  if (lead.used_tco) { score += 2; factors.tcoScore = 2; }
  if (lead.used_subsidy) { score += 2; factors.subsidyScore = 2; }
  if (lead.used_emi) { score += 1; factors.emiScore = 1; }
  if (lead.whatsapp_consent) { score += 1; factors.whatsappScore = 1; }

  // Normalize to 0-10 scale (total possible = 17.5 after Phase 0 additions)
  const normalizedScore = Math.min(Math.round((score / 17.5) * 10 * 10) / 10, 10)

  // Categorize into actionable recommendations
  const recommendation = 
    normalizedScore >= 8.5 ? "URGENT" : 
    normalizedScore >= 6.5 ? "PRIORITY" : 
    normalizedScore >= 4.5 ? "FOLLOW-UP" : 
    "NURTURE"

  return {
    score: normalizedScore,
    factors: factors,
    recommendation: recommendation,
    maxScore: 11.5
  }
}

// Helper to get color for recommendation level
export function getRecommendationColor(recommendation, C) {
  return recommendation === "URGENT" ? C.red : 
         recommendation === "PRIORITY" ? C.orange : 
         recommendation === "FOLLOW-UP" ? C.yellow : 
         C.blue
}

// Helper to get emoji for recommendation level
export function getRecommendationIcon(recommendation) {
  return recommendation === "URGENT" ? "🔴" : 
         recommendation === "PRIORITY" ? "🟠" : 
         recommendation === "FOLLOW-UP" ? "🟡" : 
         "🔵"
}

// Score interpretation
export function getScoreInterpretation(score) {
  if (score >= 8.5) return "Extremely hot - close immediately"
  if (score >= 7.5) return "Very warm - schedule call today"
  if (score >= 6) return "Warm - prioritize this week"
  if (score >= 4) return "Lukewarm - nurture consistently"
  return "Cold - may need re-engagement"
}

// Batch calculate scores for multiple leads
export function batchCalculateScores(leads) {
  return leads.map(lead => ({
    ...lead,
    ...calculateLeadScore(lead)
  }))
}

// Sort leads by score (descending)
export function sortByScore(leads) {
  return [...leads].sort((a, b) => b.score - a.score)
}

// Filter leads by recommendation
export function filterByRecommendation(leads, recommendation) {
  return leads.filter(lead => lead.recommendation === recommendation)
}
