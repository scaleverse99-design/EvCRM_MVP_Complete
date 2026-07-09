// ── app/api/cron/test-drive-reminders/route.js ───────────────────────
// 3.4 Pre-Drive Reminder — sends a WhatsApp reminder link to the feed for
// any test drive scheduled ~24h or ~2h out. There's no real job scheduler
// in this environment, so this route is designed to be hit by an external
// cron (e.g. Vercel Cron, or a simple GitHub Action) every 15-30 minutes:
//
//   vercel.json:
//   { "crons": [{ "path": "/api/cron/test-drive-reminders", "schedule": "*/15 * * * *" }] }
//
// Protect it with CRON_SECRET so it can't be triggered by randoms.

import { NextResponse } from "next/server"
import { readTable, writeTable } from "../../../../lib/store"

function withinWindow(target, hoursOut, toleranceMinutes = 15) {
  const now = Date.now()
  const targetMs = new Date(target).getTime() - hoursOut * 60 * 60 * 1000
  return Math.abs(now - targetMs) <= toleranceMinutes * 60 * 1000
}

export async function GET(req) {
  const auth = req.headers.get("authorization") || ""
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const bookings = await readTable("bookings")
  const feed = await readTable("feed")
  let sent = 0

  for (const b of bookings) {
    if (b.status === "CANCELLED" || !b.scheduledTime) continue
    const already24 = b.reminder24hSent
    const already2h = b.reminder2hSent

    if (!already24 && withinWindow(b.scheduledTime, 24)) {
      feed.unshift({
        id: `feed_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        dealership: b.dealership,
        type: "TEST_DRIVE_REMINDER",
        label: "⏰ 24H REMINDER DUE",
        msg: `Send ${b.name} a reminder — test drive tomorrow`,
        sub: `${b.vehicleName} · https://wa.me/${(b.phone||"").replace(/\D/g,"")}`,
        icon: "⏰", color: "#F97316", actionLabel: "Send", created_at: new Date().toISOString(),
      })
      b.reminder24hSent = true
      sent++
    }
    if (!already2h && withinWindow(b.scheduledTime, 2)) {
      feed.unshift({
        id: `feed_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        dealership: b.dealership,
        type: "TEST_DRIVE_REMINDER",
        label: "🔔 2H REMINDER DUE",
        msg: `${b.name}'s test drive is in ~2 hours`,
        sub: `${b.vehicleName} · https://wa.me/${(b.phone||"").replace(/\D/g,"")}`,
        icon: "🔔", color: "#EF4444", actionLabel: "Send", created_at: new Date().toISOString(),
      })
      b.reminder2hSent = true
      sent++
    }
  }

  if (sent > 0) {
    await writeTable("bookings", bookings)
    await writeTable("feed", feed)
  }

  return NextResponse.json({ success: true, remindersSent: sent })
}
