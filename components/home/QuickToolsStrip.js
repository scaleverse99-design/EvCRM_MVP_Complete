"use client"
import { C } from "../../lib/constants"
import { Card, Btn } from "../ui"

const TOOLS = [
  { id: "tco", name: "TCO Calculator", sub: "Monthly petrol savings vs EV charging", icon: "⛽", color: C.orange },
  { id: "subsidy", name: "Subsidy Estimator", sub: "Check your state's financial grants", icon: "🇮🇳", color: C.green },
  { id: "emi", name: "EMI Calculator", sub: "Plan your monthly loan payments", icon: "₹", color: C.ink },
  { id: "charge", name: "Charge Stations", sub: "Nearest charging & swapping hubs", icon: "⚡", color: C.green }
]

export default function QuickToolsStrip({ openTool }) {
  return (
    <section id="tools" style={{ background: "#fff", padding: "40px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(4, 1fr)", 
          gap: 20,
          overflowX: "auto",
          paddingBottom: 10,
          msOverflowStyle: "none",
          scrollbarWidth: "none"
        }}>
          {TOOLS.map(t => (
            <Card key={t.id} style={{ 
               minWidth: 260, 
               padding: 24, 
               display: "flex", 
               flexDirection: "column", 
               justifyContent: "space-between",
               borderLeft: `4px solid ${t.color}`
            }}>
              <div>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{t.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: C.ink, marginBottom: 6 }}>{t.name}</h3>
                <p style={{ fontSize: 12, color: C.ink3, lineHeight: 1.5, marginBottom: 20 }}>{t.sub}</p>
              </div>
              <Btn 
                variant="primary" 
                color={t.color} 
                style={{ width: "100%", background: t.color, color: "#fff" }}
                onClick={() => {
                   if (t.id === "charge") window.location.href = "/charging"
                   else openTool(t.id)
                }}
              >
                Use Tool ›
              </Btn>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
