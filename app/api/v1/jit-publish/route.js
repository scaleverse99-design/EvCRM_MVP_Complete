import { NextResponse } from "next/server"
import { fastJitPublish } from "../../../../lib/orchestrator/fastJitPublisher"

export async function POST(req) {
  try {
    const { query, city } = await req.json()
    if (!query) {
      return NextResponse.json({ success: false, error: "Query is required" }, { status: 400 })
    }

    const result = await fastJitPublish(query, city || "Hyderabad")
    return NextResponse.json(result)
  } catch (err) {
    console.error("❌ JIT Publish error:", err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
