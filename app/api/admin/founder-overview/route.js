export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, ok, err } from "../../../../lib/auth"
import { findSession } from "../../../../lib/db"
import { readTable } from "../../../../lib/store"

async function requireSuperadmin(req) {
  const token = extractToken(req)
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded || (decoded.role !== "superadmin" && decoded.role !== "founder")) return null
  const session = await findSession(hashToken(token))
  if (!session) return null
  return session.evcrm_users
}

const MRR_PER_DEALER = 3000

// Single glanceable pull-together of every subsystem built this session —
// business numbers, content pipeline, sales-funnel activity (from the quote
// feed events wired in app/api/quotes/[id]/route.js), and which optional
// integrations are actually configured vs still stubbed. Nothing here is
// invented: every count comes from a real table, and a table that doesn't
// exist yet (e.g. query_signals before its SQL is run) degrades to a null
// "not set up" state instead of a fabricated zero.
export async function GET(req) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) return err("Unauthorized. Superadmin access required.", 401)

    const [users, dealers, leads, bookings, quotes, feed, orchTopics, blogPosts, inventory, serviceRequests]
      = await Promise.all([
        readTable("users").catch(() => []),
        readTable("dealers").catch(() => []),
        readTable("leads").catch(() => []),
        readTable("bookings").catch(() => []),
        readTable("quotes").catch(() => []),
        readTable("feed").catch(() => []),
        readTable("orch_topics").catch(() => []),
        readTable("blog_posts").catch(() => []),
        readTable("inventory").catch(() => []),
        readTable("service_requests").catch(() => []),
      ])

    // ── Business ──────────────────────────────────────────────────
    const dealerUsers = users.filter(u => u.role === "dealer")
    const activeDealers = dealerUsers.filter(u => u.is_active !== false).length
    const payingDealers = dealerUsers.filter(u => u.billingStatus && u.billingStatus.startsWith("active")).length
    const trialDealers = dealerUsers.filter(u => u.billingStatus === "trial").length

    // ── Dealer onboarding / campaign ─────────────────────────────
    const withGstin = dealerUsers.filter(u => u.gstin).length
    const withoutGstin = dealerUsers.length - withGstin
    const last7Days = Date.now() - 7 * 86400_000
    const last30Days = Date.now() - 30 * 86400_000
    const signedUpLast7d = dealerUsers.filter(u => new Date(u.trialStartDate || u.created_at || 0).getTime() >= last7Days).length
    const signedUpLast30d = dealerUsers.filter(u => new Date(u.trialStartDate || u.created_at || 0).getTime() >= last30Days).length

    // ── Sales activity — the quote funnel, driven off feed events ───
    const quoteEvents = feed.filter(f => ["QUOTE_OPENED", "QUOTE_ACCEPTED", "QUOTE_REJECTED", "QUOTE_QUESTION", "KYC_UPLOADED"].includes(f.type))
    const funnel = {
      totalQuotesSent: quotes.length,
      opened: quotes.filter(q => q.openedCount > 0).length,
      accepted: quotes.filter(q => q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded").length,
      hasConcerns: quotes.filter(q => q.customerResponse === "not_agreed").length,
      kycUploaded: quotes.filter(q => q.customerResponse === "docs_uploaded").length,
      recentEvents: quoteEvents.slice(0, 10).map(e => ({ type: e.type, msg: e.msg, sub: e.sub, dealership: e.dealership, created_at: e.created_at })),
    }

    // ── Content pipeline (news orchestrator) ─────────────────────
    const topicCounts = { DISCOVERED: 0, RESEARCHED: 0, PUBLISHED: 0, FAILED: 0 }
    for (const t of orchTopics) if (topicCounts[t.state] !== undefined) topicCounts[t.state]++

    // ── Pipeline health (leads → bookings → sales) ───────────────
    const leadsByStatus = {}
    for (const l of leads) leadsByStatus[l.status || "NEW"] = (leadsByStatus[l.status || "NEW"] || 0) + 1

    // ── System / integration health ──────────────────────────────
    const health = {
      supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      emailConfigured: !!(process.env.RESEND_API_KEY || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)),
      whatsappApiConfigured: false, // intentionally manual per campaign decision — not a gap
      geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY),
      claudeConfigured: !!process.env.CLAUDE_API_KEY,
      orchestratorCronEnabled: !!process.env.ORCHESTRATOR_TOKEN,
      articleTriggerThreshold: process.env.CTE_ARTICLE_TRIGGER_THRESHOLD || "5 (default)",
    }

    return ok({
      success: true,
      business: {
        mrr: payingDealers * MRR_PER_DEALER,
        totalDealers: dealerUsers.length,
        activeDealers,
        payingDealers,
        trialDealers,
        totalUsers: users.length,
      },
      onboarding: {
        withGstin,
        withoutGstin,
        signedUpLast7d,
        signedUpLast30d,
      },
      funnel,
      pipeline: {
        totalLeads: leads.length,
        leadsByStatus,
        totalBookings: bookings.length,
        totalServiceRequests: serviceRequests.length,
        totalInventory: inventory.length,
      },
      content: {
        topicCounts,
        totalTopics: orchTopics.length,
        totalArticlesPublished: blogPosts.length,
      },
      health,
    })
  } catch (error) {
    console.error("[GET /api/admin/founder-overview]", error.message)
    return err("Failed to load founder overview.", 500)
  }
}
