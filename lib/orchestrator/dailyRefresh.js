import { readTable, writeTable } from "../store"

const REFRESH_INTERVAL_MS = 2 * 3600 * 1000 // 2 hours

export function shouldTriggerDailyRefresh(posts) {
  if (!posts || posts.length === 0) return true
  const newest = posts.reduce((max, p) => {
    const t = new Date(p.publishedAt || 0).getTime()
    return t > max ? t : max
  }, 0)
  return (Date.now() - newest) > REFRESH_INTERVAL_MS
}

export async function ensureDailyNewsRefresh() {
  try {
    // /api/orchestrator/run requires Authorization: Bearer INTERNAL_API_SECRET
    // (see lib/orchestrator/auth.js — fails closed with 401/500 without it).
    // Missing this header here means every call silently 401s and never
    // actually refreshes anything, the exact bug class that broke daily
    // publishing for the .env.production case fixed earlier this session.
    const host = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://evcrm.in"
    const secret = process.env.INTERNAL_API_SECRET
    if (!secret) {
      console.warn("[ensureDailyNewsRefresh] INTERNAL_API_SECRET not set — skipping refresh call")
      return
    }
    await fetch(`${host}/api/orchestrator/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ discover: 10, research: 5, write: 3 }),
    })
  } catch (err) {
    console.warn("[ensureDailyNewsRefresh] Refresh request warning:", err.message)
  }
}
