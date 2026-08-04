"use client"
import { useState, useEffect, useRef } from "react"
import { C } from "../../lib/constants"

// Live visitor badge — a real count, or nothing at all.
//
// Two fabricated versions preceded this one, on 1,344 /price/ pages and
// every /blog/ page:
//
//   v1  `85 + Math.floor(Math.random() * 65)` rendered as "N people
//       actively viewing in <city> right now", drifting every 4 seconds to
//       look alive. Alongside it LiveActivityToast cycled five invented
//       people ("Rahul S. (Jubilee Hills) — Just requested test drive
//       booking...") as if they had just done those things.
//
//   v2  `850 + (location.length * 45)` rendered as "N+ verified price
//       guides accessed in <city>" — that is 850 plus the NUMBER OF LETTERS
//       in the city name, times 45. It carried a comment describing itself
//       as an "Honest Real-Data Social Proof Widget" using "real aggregate
//       search metrics". A number derived from string length is not a
//       metric, and labelling it honest is worse than leaving it unlabelled.
//
// Both were manufactured social proof shown to buyers, which is what
// India's CCPA Guidelines for Prevention and Regulation of Dark Patterns
// (2023) call false urgency — and they sat against the whole point of this
// site, which is being a source whose numbers can be checked.
//
// This version counts actual open pages via /api/presence. Two rules:
//   1. Never invent. Unknown count -> render nothing.
//   2. Never dress up a small real number. Below MIN_TO_SHOW the badge
//      hides itself. Showing nothing is honest; "1 person viewing" is true
//      but reads as dead, and that discomfort is precisely what produced
//      v1 and v2. Hiding removes the temptation rather than relying on
//      whoever edits this next to resist it.

const HEARTBEAT_MS = 30_000
const MIN_TO_SHOW = 3

export function LiveVisitorBadge({ location = "" }) {
  const [count, setCount] = useState(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    // Per-tab random id — not a user identifier. sessionStorage, so it dies
    // with the tab and cannot become tracking. Its only job is to stop one
    // person being counted twice.
    if (!sessionRef.current) {
      let s = sessionStorage.getItem("evcrm_presence")
      if (!s) {
        s = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "")
        sessionStorage.setItem("evcrm_presence", s)
      }
      sessionRef.current = s
    }

    let stopped = false
    const beat = async () => {
      // A hidden tab is not a person looking at the page. Counting it would
      // inflate the number, which is the failure this component exists to
      // stop repeating.
      if (document.visibilityState !== "visible") return
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionRef.current,
            path: window.location.pathname,
            city: location || "",
          }),
        })
        const data = await res.json()
        if (!stopped) setCount(typeof data.count === "number" ? data.count : null)
      } catch {
        if (!stopped) setCount(null) // unknown -> show nothing
      }
    }

    beat()
    const timer = setInterval(beat, HEARTBEAT_MS)
    document.addEventListener("visibilitychange", beat)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", beat)
    }
  }, [location])

  if (count === null || count < MIN_TO_SHOW) return null

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F0FDF4", border: `1px solid ${C.green}40`, borderRadius: 20, padding: "6px 14px", marginBottom: 16 }}>
      <span style={{ position: "relative", display: "flex", height: 8, width: 8 }}>
        <span style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", position: "absolute", height: "100%", width: "100%", borderRadius: "50%", background: C.green, opacity: 0.75 }} />
        <span style={{ position: "relative", borderRadius: "50%", height: 8, width: 8, background: C.green }} />
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>
        <strong>{count} people</strong> viewing evcrm.in right now
      </span>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// Deliberately a no-op, not a rewrite.
//
// This invented recent activity from a hardcoded list of five people who do
// not exist, presented as things that had just happened. That cannot be
// made honest by changing the numbers — only by having real activity to
// show. When there are real leads or bookings worth surfacing, build it
// from those: anonymised, real timestamps, and only when there is genuinely
// something to report.
export function LiveActivityToast() {
  return null
}
