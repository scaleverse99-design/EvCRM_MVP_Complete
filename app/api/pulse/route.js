/**
 * GET /api/pulse
 * ISOLATED: News/pulse features are not active in this build.
 * Returns an empty list so callers degrade gracefully.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ success: true, news: [], source: 'disabled' })
}
