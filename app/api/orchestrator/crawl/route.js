import { NextResponse } from "next/server"
import { requireOrchestratorAuth } from "@/lib/orchestrator/auth"
import { readTable, writeTable } from "@/lib/store"
import { crawlBatch } from "../../../../cte-engine/crawler/lightweight-crawler"

export const dynamic = "force-dynamic"

export async function POST(req) {
  const authErr = requireOrchestratorAuth(req)
  if (authErr) return authErr

  try {
    const body = await req.json().catch(() => ({}))
    let targets = body.targets || []

    if (targets.length === 0) {
      // Default EV industry news targets
      targets = [
        "https://auto.economictimes.indiatimes.com/tag/electric-vehicles",
        "https://www.autocarindia.com/electric-cars"
      ]
    }

    const results = await crawlBatch(targets)

    // Store in feed table
    const feedRows = await readTable("feed")
    results.forEach(res => {
      feedRows.push({
        id: `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        data: res,
        created_at: new Date().toISOString()
      })
    })
    await writeTable("feed", feedRows)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      crawled: results.length,
      results
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
