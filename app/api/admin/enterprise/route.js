export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── app/api/admin/enterprise/route.js ────────────────────────────────
// Admin API powering the /admin/enterprise dashboard.
// GET: Returns all enterprise clients with usage summary
// POST: Generates a new enterprise API key

import { listEnterpriseClients, generateApiKey } from "../../../../lib/enterprise/apiKey"

const ADMIN_SECRET = process.env.INTERNAL_API_SECRET || process.env.NEXT_PUBLIC_INTERNAL_API_SECRET

function isAuthorized(req) {
  const auth = req.headers.get("x-internal-secret") || req.headers.get("authorization")
  return !ADMIN_SECRET || auth?.includes(ADMIN_SECRET)
}

export async function GET(req) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const clients = await listEnterpriseClients()
    const totalCalls = clients.reduce((acc, c) => acc + (c.totalCallCount || 0), 0)
    const totalEarningsUSD = (totalCalls * 0.0002).toFixed(4)
    const activeClients = clients.filter(c => c.status === "active").length

    return Response.json({
      success: true,
      clients: clients.map(c => ({
        ...c,
        keyHash: undefined, // Never expose hash to frontend
      })),
      summary: {
        totalClients: clients.length,
        activeClients,
        totalCalls,
        totalEarningsUSD,
        totalEarningsINR: (parseFloat(totalEarningsUSD) * 84).toFixed(2),
      },
    })
  } catch (err) {
    console.error("[/api/admin/enterprise] GET error:", err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body
  try { body = await req.json() } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }) }

  const { clientName, clientEmail, tier, cloudPlatform, metadata } = body

  if (!clientName || !clientEmail) {
    return Response.json({ error: "clientName and clientEmail are required" }, { status: 400 })
  }

  try {
    const result = await generateApiKey({ clientName, clientEmail, tier, cloudPlatform, metadata })
    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error("[/api/admin/enterprise] POST error:", err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
