"use client"
import { useEffect, useRef, useState } from "react"

const SPECS = {
  mt: {
    pros: [
      "Direct Connection: Zero mechanical power slip.",
      "Simple design: No complex computer logic or high-pressure pumps.",
      "Long life: Cheapest maintenance, long gear set life."
    ],
    cons: [
      "Congestion Pain: Tiring clutch leg stress in bumper-to-bumper Indian traffic.",
      "Mechanical Stall: Stalls immediately if wheel speed drops without clutch release."
    ]
  },
  at: {
    pros: [
      "No Clutch Operations: Automatic gear shifting handles all city runs.",
      "Smooth Creep Mode: Crawls forward smoothly with zero engine stall risk.",
      "Amplified Torque: Torque converter fluid turbine multiplies engine torque."
    ],
    cons: [
      "Fluid Parasitic Slip: Slippage in fluid coupling lowers fuel efficiency by 5-8%.",
      "Complex rebuilding: Extremely costly repair sets."
    ]
  },
  dct: {
    pros: [
      "Lightning Shifts: The next gear is pre-selected on a second clutch, so shifts take milliseconds.",
      "No Torque Break: One clutch releases as the other engages — power barely dips.",
      "Sporty + Efficient: Near-manual efficiency with fully automatic convenience."
    ],
    cons: [
      "Low-Speed Jerkiness: Can feel hesitant in crawling city traffic.",
      "Heat & Cost: Dual clutches run hot and are expensive to service."
    ]
  },
  cvt: {
    pros: [
      "Infinite Ratios: Seamlessly shifts widths for maximum efficiency.",
      "Zero Shift Shocks: Infinite gear states mean there are no gear jumps.",
      "Lightweight: Small overall mechanical size."
    ],
    cons: [
      "Rubber-Band Effect: RPM spikes before belt adjusts and speed increases.",
      "Lower Peak Torque: Steel belt can slip under heavy hauling load."
    ]
  }
}

// Plain-language "how many gears & how they change" note per type — this is
// the takeaway a buyer actually remembers, shown under the animation.
const GEAR_NOTE = {
  mt: { gears: "5–6 gears", how: "You press the clutch and move the lever yourself for every change." },
  at: { gears: "4–8 gears", how: "A fluid torque converter + computer shift gears for you — no clutch pedal." },
  dct: { gears: "6–7 gears", how: "Two clutches: one drives the current gear while the other pre-selects the next for an instant swap." },
  cvt: { gears: "No fixed gears", how: "A belt on two cone pulleys glides through infinite ratios — smooth, stepless." },
}

export default function TransmissionWidget() {
  const canvasRef = useRef(null)
  const [tab, setTab] = useState("mt")
  const [rpm, setRpm] = useState(1000)
  const [gear, setGear] = useState(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let rotationAngle = 0
    let animId

    function render() {
      ctx.fillStyle = "#090d16"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const w = canvas.width
      const h = canvas.height
      const cy = h / 2
      const speed = rpm / 2000
      rotationAngle += 0.05 * speed

      // Input shaft
      ctx.lineWidth = 12
      ctx.strokeStyle = "#475569"
      ctx.beginPath()
      ctx.moveTo(10, cy)
      ctx.lineTo(w * 0.22, cy)
      ctx.stroke()

      // Output shaft
      ctx.beginPath()
      ctx.moveTo(w * 0.78, cy)
      ctx.lineTo(w - 10, cy)
      ctx.stroke()

      if (tab === "mt") {
        const cY = cy + 60
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.moveTo(w * 0.35, cY)
        ctx.lineTo(w * 0.65, cY)
        ctx.stroke()

        const gearXCoords = [w * 0.38, w * 0.44, w * 0.50, w * 0.56, w * 0.62]
        const gearRatios = [
          { in: 20, out: 50 },
          { in: 26, out: 44 },
          { in: 32, out: 38 },
          { in: 38, out: 32 },
          { in: 44, out: 26 }
        ]

        for (let i = 0; i < 5; i++) {
          const gearX = gearXCoords[i]
          const isCurrent = gear === (i + 1)
          const inCol = isCurrent ? "#22c55e" : "#475569"
          const outCol = isCurrent ? "#a855f7" : "#334155"

          ctx.save()
          ctx.translate(gearX, cy)
          ctx.rotate(rotationAngle)
          drawGear(ctx, 0, 0, gearRatios[i].in, inCol)
          ctx.restore()

          ctx.save()
          ctx.translate(gearX, cY)
          const ratio = gearRatios[i].in / gearRatios[i].out
          ctx.rotate(-rotationAngle * ratio)
          drawGear(ctx, 0, 0, gearRatios[i].out, outCol)
          ctx.restore()
        }

        if (gear === -1) {
          ctx.save()
          ctx.translate(w * 0.68, cy)
          ctx.rotate(rotationAngle)
          drawGear(ctx, 0, 0, 20, "#22c55e")
          ctx.restore()

          ctx.save()
          ctx.translate(w * 0.68, cy + 30)
          ctx.rotate(-rotationAngle)
          drawGear(ctx, 0, 0, 14, "#eab308")
          ctx.restore()

          ctx.save()
          ctx.translate(w * 0.68, cY)
          ctx.rotate(rotationAngle * 0.8)
          drawGear(ctx, 0, 0, 36, "#f43f5e")
          ctx.restore()
        }
      } else if (tab === "at") {
        const tcX = w * 0.32
        ctx.save()
        ctx.translate(tcX - 10, cy)
        ctx.rotate(rotationAngle)
        drawBlades(ctx, 36, "#e11d48")
        ctx.restore()

        ctx.save()
        ctx.translate(tcX + 25, cy)
        ctx.rotate(rotationAngle * 0.85)
        drawBlades(ctx, 36, "#3b82f6")
        ctx.restore()

        const planX = w * 0.65
        ctx.save()
        ctx.translate(planX, cy)
        ctx.rotate(rotationAngle * 0.45)
        drawGear(ctx, 0, 0, 16, "#eab308")
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2
          drawGear(ctx, Math.cos(angle) * 30, Math.sin(angle) * 30, 10, "#a855f7")
        }
        ctx.restore()
      } else if (tab === "dct") {
        // Two clutches: odd gears (1,3,5) on the top rail, even (2,4,6) on the
        // bottom. The clutch driving the CURRENT gear glows green; the OTHER
        // clutch has already pre-selected the next gear (amber) — that pre-arm
        // is the whole trick behind DCT's instant shifts.
        const clutchX = w * 0.24
        const oddY = cy - 42
        const evenY = cy + 42
        const oddActive = ((gear % 2) + 2) % 2 === 1

        ctx.lineWidth = 6
        ctx.strokeStyle = "#334155"
        ctx.beginPath(); ctx.moveTo(clutchX, oddY); ctx.lineTo(w * 0.74, oddY); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(clutchX, evenY); ctx.lineTo(w * 0.74, evenY); ctx.stroke()

        ctx.save(); ctx.translate(clutchX, oddY); ctx.rotate(rotationAngle); drawClutch(ctx, 22, oddActive ? "#22c55e" : "#475569"); ctx.restore()
        ctx.save(); ctx.translate(clutchX, evenY); ctx.rotate(rotationAngle); drawClutch(ctx, 22, !oddActive ? "#22c55e" : "#475569"); ctx.restore()

        const oddGears = [1, 3, 5]
        const evenGears = [2, 4, 6]
        const oddXs = [0.40, 0.54, 0.68].map(f => w * f)
        const evenXs = [0.44, 0.58, 0.70].map(f => w * f)

        const drawDctGear = (gnum, x, railY) => {
          const active = gear === gnum
          const armed = gear + 1 === gnum
          const col = active ? "#22c55e" : armed ? "#eab308" : "#475569"
          const spin = active ? rotationAngle : armed ? rotationAngle * 0.12 : 0
          ctx.save(); ctx.translate(x, railY); ctx.rotate(spin); drawGear(ctx, 0, 0, 15, col); ctx.restore()
          ctx.fillStyle = active ? "#22c55e" : armed ? "#eab308" : "#64748b"
          ctx.font = "bold 11px sans-serif"
          ctx.textAlign = "center"
          ctx.fillText(active ? gnum + " ▶" : armed ? gnum + " ⏭" : String(gnum), x, railY < cy ? railY - 22 : railY + 30)
        }
        oddGears.forEach((g, i) => drawDctGear(g, oddXs[i], oddY))
        evenGears.forEach((g, i) => drawDctGear(g, evenXs[i], evenY))
      } else if (tab === "cvt") {
        const pX = w * 0.32
        const sX = w * 0.68
        const progress = (rpm - 1000) / 5000
        const priRadius = 24 + (progress * 26)
        const secRadius = 50 - (progress * 26)

        ctx.save()
        ctx.translate(pX, cy - 35)
        ctx.rotate(rotationAngle)
        drawPulley(ctx, priRadius)
        ctx.restore()

        ctx.save()
        ctx.translate(sX, cy + 35)
        const ratio = priRadius / secRadius
        ctx.rotate(rotationAngle * ratio)
        drawPulley(ctx, secRadius)
        ctx.restore()

        ctx.lineWidth = 10
        ctx.strokeStyle = "#475569"
        ctx.beginPath()
        ctx.arc(pX, cy - 35, priRadius, -Math.PI, 0)
        ctx.arc(sX, cy + 35, secRadius, 0, Math.PI)
        ctx.closePath()
        ctx.stroke()
      }

      animId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [tab, rpm, gear])

  return (
    <div style={{ background: "#151f32", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["mt", "Manual"], ["at", "Auto"], ["dct", "DCT"], ["cvt", "CVT"]].map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setGear(1) }} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: tab === t ? "#22c55e" : "#0f172a", color: tab === t ? "#000" : "#94a3b8", fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ width: "100%", height: 200, background: "#090d16", borderRadius: 10, position: "relative", overflow: "hidden", marginBottom: 16 }}>
        <canvas ref={canvasRef} width={680} height={200} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold", color: "#94a3b8" }}>
          <span>THROTTLE ACCELERATOR</span>
          <span style={{ color: "#22c55e" }}>RPM: {rpm}</span>
        </div>
        <input type="range" min="1000" max="6000" value={rpm} onChange={e => setRpm(parseInt(e.target.value))} style={{ width: "100%" }} />
        {(tab === "mt" || tab === "dct") && (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
            {(tab === "mt" ? [1, 2, 3, 4, 5, -1] : [1, 2, 3, 4, 5, 6]).map(g => (
              <button key={g} onClick={() => setGear(g)} style={{ padding: "8px 12px", border: "1px solid #1e293b", borderRadius: 6, background: gear === g ? "rgba(34,197,94,0.15)" : "#151f32", color: gear === g ? "#22c55e" : "#94a3b8", fontWeight: "bold", cursor: "pointer" }}>
                {g === -1 ? "Rev" : `${g}G`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Plain-language takeaway + trade-offs — the educational payoff so a
          reader leaves knowing how many gears each type has and how it shifts. */}
      <div style={{ marginTop: 16, background: "#0f172a", borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.5 }}>
          <span style={{ color: "#22c55e", fontWeight: 800 }}>{GEAR_NOTE[tab].gears}</span>
          <span style={{ color: "#64748b" }}> — </span>
          {GEAR_NOTE[tab].how}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Pros</div>
            {SPECS[tab].pros.map((p, i) => (
              <div key={i} style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5, marginBottom: 5 }}>✓ {p}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#f43f5e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Cons</div>
            {SPECS[tab].cons.map((c, i) => (
              <div key={i} style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5, marginBottom: 5 }}>✗ {c}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function drawGear(ctx, x, y, r, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#090d16"
  ctx.lineWidth = 2
  const count = Math.floor(r / 3)
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(angle) * (r - 2), y + Math.sin(angle) * (r - 2))
    ctx.lineTo(x + Math.cos(angle) * (r + 4), y + Math.sin(angle) * (r + 4))
    ctx.stroke()
  }
}

function drawBlades(ctx, r, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * r / 2, Math.sin(angle) * r / 2, r / 2, angle, angle + Math.PI / 2)
    ctx.stroke()
  }
}

function drawClutch(ctx, r, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#090d16"
  ctx.lineWidth = 2.5
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(0, 0, r - i * 6 - 3, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawPulley(ctx, r) {
  ctx.fillStyle = "#1e293b"
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#64748b"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, r - 5, 0, Math.PI * 2)
  ctx.stroke()
}
