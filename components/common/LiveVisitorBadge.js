"use client"
import { useState, useEffect } from "react"
import { C } from "../../lib/constants"

export function LiveVisitorBadge({ location = "Hyderabad", category = "vehicle" }) {
  const [visitorCount, setVisitorCount] = useState(128)

  useEffect(() => {
    // Generate realistic fluctuating live visitor count based on time of day
    const baseCount = 85 + Math.floor(Math.random() * 65)
    setVisitorCount(baseCount)

    const interval = setInterval(() => {
      setVisitorCount(prev => {
        const delta = Math.floor(Math.random() * 5) - 2
        const next = prev + delta
        return next < 40 ? 45 : next > 250 ? 240 : next
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F0FDF4", border: `1px solid ${C.green}40`, borderRadius: 20, padding: "6px 14px", marginBottom: 16 }}>
      <span style={{ position: "relative", display: "flex", height: 8, width: 8 }}>
        <span style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", position: "absolute", height: "100%", width: "100%", borderRadius: "50%", background: C.green, opacity: 0.75 }} />
        <span style={{ position: "relative", borderRadius: "50%", height: 8, width: 8, background: C.green }} />
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>
        <strong>{visitorCount} people</strong> actively viewing in {location} right now
      </span>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export function LiveActivityToast({ location = "Hyderabad" }) {
  const [toast, setToast] = useState(null)
  const [visible, setVisible] = useState(false)

  const RECENT_ACTIVITIES = [
    { name: "Rahul S.", area: "Jubilee Hills", action: "checked on-road price for Tata Nexon EV" },
    { name: "Priya M.", area: "Gachibowli", action: "requested test drive booking for MG Comet EV" },
    { name: "Vikram K.", area: "HSR Layout, Bangalore", action: "viewed state EV subsidy breakdown" },
    { name: "Anish R.", area: "Madhapur", action: "reserved vehicle token for Mahindra XUV400" },
    { name: "Suresh P.", area: "Kukatpally", action: "compared variants for Maruti Suzuki Wagon R" }
  ]

  useEffect(() => {
    const timer = setTimeout(() => {
      showRandomToast()
    }, 5000)

    const interval = setInterval(() => {
      showRandomToast()
    }, 18000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  const showRandomToast = () => {
    const randomItem = RECENT_ACTIVITIES[Math.floor(Math.random() * RECENT_ACTIVITIES.length)]
    setToast(randomItem)
    setVisible(true)
    setTimeout(() => setVisible(false), 5500)
  }

  if (!toast || !visible) return null

  return (
    <div style={{ position: "fixed", bottom: 20, left: 20, zIndex: 999, background: "#fff", border: `1.5px solid ${C.green}50`, borderRadius: 14, padding: "12px 16px", boxShadow: "0 10px 25px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 12, maxWidth: 340, animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ fontSize: 22, background: "#F0FDF4", borderRadius: 10, padding: 8 }}>⚡</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>{toast.name} ({toast.area})</div>
        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Just {toast.action}</div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
