export const dynamic = "force-dynamic"

import { generateFullRegistryGuides } from "../../../../lib/orchestrator/vehicleGuideGenerator.js"

// GET /api/cron/vehicle-registry-harvest
// Generates buyer guides for all vehicles in INDIAN_AUTO_REGISTRY (EV + ICE)
export async function GET(req) {
  try {
    const res = await generateFullRegistryGuides()
    return Response.json({
      success: true,
      message: "Indian Auto Registry vehicle guides harvest completed",
      ...res
    })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
