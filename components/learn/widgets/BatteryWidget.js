"use client"
import { useEffect, useRef, useState } from "react"

export default function BatteryWidget() {
  const canvasRef = useRef(null)
  const [tab, setTab] = useState("cell")
  const [charging, setCharging] = useState(true)
  const [temp, setTemp] = useState(35)
  const [cellVoltages, setCellVoltages] = useState([3.9, 4.2, 3.8, 4.1])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let rotationAngle = 0
    let animId

    // Setup ions
    const ions = []
    for(let i=0; i<12; i++) {
      ions.push({
        x: 80 + Math.random() * 400,
        y: 40 + Math.random() * 100,
        speed: (0.4 + Math.random() * 1.2)
      })
    }

    function render() {
      ctx.fillStyle = "#090d16"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const w = canvas.width
      const h = canvas.height
      const cy = h / 2
      rotationAngle += 0.05

      if (tab === "cell") {
        const anodeX = w * 0.22
        const cathodeX = w * 0.78

        ctx.fillStyle = "#1e293b"
        ctx.strokeStyle = "#475569"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.rect(anodeX - 25, cy - 60, 50, 120)
        ctx.fill()
        ctx.stroke()

        ctx.strokeStyle = "#3b82f6"
        ctx.beginPath()
        ctx.rect(cathodeX - 25, cy - 60, 50, 120)
        ctx.fill()
        ctx.stroke()

        ctx.strokeStyle = "#334155"
        ctx.lineWidth = 4
        ctx.setLineDash([8, 12])
        ctx.beginPath()
        ctx.moveTo(w/2, cy - 70)
        ctx.lineTo(w/2, cy + 70)
        ctx.stroke()
        ctx.setLineDash([])

        ions.forEach(ion => {
          const minX = anodeX + 30
          const maxX = cathodeX - 30
          if (charging) {
            ion.x -= ion.speed
            if (ion.x < minX) ion.x = maxX
          } else {
            ion.x += ion.speed
            if (ion.x > maxX) ion.x = minX
          }
          ctx.fillStyle = "#22c55e"
          ctx.beginPath()
          ctx.arc(ion.x, ion.y, 5, 0, Math.PI*2)
          ctx.fill()
        })
      } else if (tab === "bms") {
        const startX = w * 0.15
        const step = w * 0.23

        // Central BMS chip
        ctx.fillStyle = "#151f32"
        ctx.strokeStyle = "#22c55e"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.rect(w/2 - 70, 20, 140, 36)
        ctx.fill()
        ctx.stroke()

        // Drift cell voltages towards target
        setCellVoltages(prev => prev.map(v => {
          const diff = v - 3.7
          if (Math.abs(diff) > 0.01) {
            return v - diff * 0.002
          }
          return v
        }))

        for (let i = 0; i < 4; i++) {
          const cX = startX + (i * step)
          const cY = cy + 30

          ctx.fillStyle = "#1e293b"
          ctx.strokeStyle = "#334155"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.rect(cX - 25, cY - 40, 50, 80)
          ctx.fill()
          ctx.stroke()

          const prog = (cellVoltages[i] - 3.0) / 1.2
          const bH = Math.max(0, Math.min(68, 68 * prog))
          ctx.fillStyle = cellVoltages[i] > 3.95 ? "#f43f5e" : "#22c55e"
          ctx.beginPath()
          ctx.rect(cX - 20, cY + 34, 40, -bH)
          ctx.fill()

          ctx.fillStyle = "#22c55e"
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(w/2 - 50 + (i * 33), 56)
          ctx.lineTo(cX, cY - 40)
          ctx.stroke()
        }
      } else if (tab === "thermal") {
        const mX = w * 0.5
        ctx.fillStyle = "#1e293b"
        ctx.strokeStyle = temp > 45 ? "#f43f5e" : "#475569"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.rect(mX - 120, cy - 60, 240, 80)
        ctx.fill()
        ctx.stroke()

        // Liquid cooling pipe below
        const pipeY = cy + 45
        ctx.fillStyle = "#151f32"
        ctx.strokeStyle = "#334155"
        ctx.beginPath()
        ctx.rect(mX - 120, pipeY - 10, 240, 20)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = "#3b82f6"
        const offset = (rotationAngle * 20) % 60
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.arc(mX - 110 + offset + (i * 50), pipeY, 5, 0, Math.PI*2)
          ctx.fill()
        }
      }

      animId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [tab, charging, temp, cellVoltages])

  return (
    <div style={{ background: "#151f32", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["cell", "bms", "thermal"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: tab === t ? "#22c55e" : "#0f172a", color: tab === t ? "#000" : "#94a3b8", fontWeight: "bold", cursor: "pointer" }}>
            {t === "cell" ? "ION FLOW" : t === "bms" ? "BALANCING" : "COOLING"}
          </button>
        ))}
      </div>
      <div style={{ width: "100%", height: 180, background: "#090d16", borderRadius: 10, position: "relative", overflow: "hidden", marginBottom: 16 }}>
        <canvas ref={canvasRef} width={680} height={180} style={{ width: "100%", height: "100%" }} />
      </div>
      <div>
        {tab === "cell" && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setCharging(true)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #1e293b", background: charging ? "rgba(34,197,94,0.15)" : "#151f32", color: charging ? "#22c55e" : "#94a3b8", fontWeight: "bold", cursor: "pointer" }}>
              CHARGING
            </button>
            <button onClick={() => setCharging(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #1e293b", background: !charging ? "rgba(34,197,94,0.15)" : "#151f32", color: !charging ? "#22c55e" : "#94a3b8", fontWeight: "bold", cursor: "pointer" }}>
              DISCHARGING
            </button>
          </div>
        )}
        {tab === "bms" && (
          <button onClick={() => setCellVoltages([3.2, 4.2, 3.1, 4.0])} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #1e293b", background: "#151f32", color: "#22c55e", fontWeight: "bold", cursor: "pointer" }}>
            CREATE UNBALANCED CELLS
          </button>
        )}
        {tab === "thermal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold", color: "#94a3b8" }}>
              <span>BATTERY TEMP</span>
              <span style={{ color: "#22c55e" }}>{temp}°C</span>
            </div>
            <input type="range" min="25" max="55" value={temp} onChange={e => setTemp(parseInt(e.target.value))} style={{ width: "100%" }} />
          </div>
        )}
      </div>
    </div>
  )
}
