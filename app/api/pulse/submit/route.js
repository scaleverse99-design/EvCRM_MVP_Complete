/**
 * POST /api/pulse/submit
 * ISOLATED: News submission pipeline is not active in this build.
 */
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ success: false, error: 'News submission is disabled in this build.' }, { status: 503 })
}
