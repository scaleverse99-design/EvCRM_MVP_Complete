import { readTable, writeTable } from "../store"

const REFRESH_INTERVAL_MS = 6 * 3600 * 1000 // 6 hours

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
    const host = process.env.NEXT_PUBLIC_BASE_URL || "https://evcrm.in"
    await fetch(`${host}/api/orchestrator/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    })
  } catch (err) {
    console.warn("[ensureDailyNewsRefresh] Refresh request warning:", err.message)
  }
}
