export const dynamic = "force-dynamic"
export const maxDuration = 300

import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth.js"
import { runYouTubeTrends } from "../../../../lib/orchestrator/youtubeTrends.js"

// Purchase-shaped seeds by design. Measured 2026-08-06: broad category
// terms ("automotive india") return quiz videos and a mobile-game video
// with ~6x the views and near-zero buying intent, while narrower
// purchase-shaped terms return launch reviews and dealer inventory.
// Volume is not value — see the header of lib/orchestrator/youtubeTrends.js.
const DEFAULT_KEYWORDS = [
  "new car launch india price",
  "indian used-car industry",
  "electric scooter india price",
  "ev charging india cost",
  "suv comparison india 2026",
  "car waiting period india",
]

// GET /api/cron/youtube-trends
//
// Measures real YouTube demand and QUEUES topics into orch_topics with
// state="DISCOVERED". It does not publish anything: the existing
// research → write stages and the /admin/orchestrator review UI handle
// what happens next.
//
// Queue-don't-publish is deliberate. This site already took a live
// AdSense "low value / scaled content" flag when 3 near-identical
// articles about one Kia Syros launch went out in 4 days. A single real
// event spikes dozens of videos at once, so a naive spike → publish loop
// would reproduce that failure faster and at higher volume. The shared
// dedup from discover.js plus human approval is what prevents it.
//
// ?measureOnly=true scores keywords and writes nothing — safe to run any
// time to see what the signal looks like before trusting it.
export async function GET(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const measureOnly = searchParams.get("measureOnly") === "true"
  const recencyDays = Number(searchParams.get("recencyDays")) || 30
  const kwParam = searchParams.get("keywords")
  const keywords = kwParam ? kwParam.split(",").map(s => s.trim()).filter(Boolean) : DEFAULT_KEYWORDS

  const started = Date.now()
  try {
    const result = await runYouTubeTrends(keywords, { recencyDays, queueTopics: !measureOnly })
    return Response.json({
      success: true,
      durationMs: Date.now() - started,
      keywordsScored: keywords.length,
      recencyDays,
      publishedNothing: true, // topics are queued for review, never auto-published here
      ...result,
    })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
