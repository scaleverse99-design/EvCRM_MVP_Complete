"use client"
import { C, fmt } from "../../lib/constants"
import { Card, Btn } from "../ui"
import SUBSIDIES from "../../data/subsidies.json"

export default function WhyBuyEVLocal({ location, openTool }) {
  const stateData = SUBSIDIES[location?.state] || SUBSIDIES["Telangana"]
  const data = stateData[location?.district] || stateData["default"]

  const stats = [
    { 
      label: "State Subsidy", 
      val: fmt.currency(data.subsidy_2w), 
      sub: `off on 2-Wheelers in ${location?.state || "Telangana"}`, 
      icon: "🇮🇳" 
    },
    { 
      label: "Fuel Savings", 
      val: fmt.currency(2400), 
      sub: "Monthly savings vs petrol commute", 
      icon: "⛽" 
    },
    { 
      label: "Break-even", 
      val: "22 Months", 
      sub: "Average time to recover EV premium", 
      icon: "⌛" 
    }
  ]

  return (
    <section style={{ padding: "80px 0", background: "#f8f9fa", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 2fr", 
          gap: 60,
          alignItems: "center"
        }}>
          <div>
            <div style={{ 
              display: "inline-block", 
              padding: "4px 12px", 
              borderRadius: 20, 
              background: C.greenL, 
              color: C.green, 
              fontSize: 10, 
              fontWeight: 900, 
              letterSpacing: 1, 
              marginBottom: 20 
            }}>
              LOCAL IMPACT
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: C.ink, marginBottom: 20, lineHeight: 1.1 }}>
              Why switch to EV in {location?.district || "Hyderabad"}?
            </h2>
            <p style={{ fontSize: 16, color: C.ink3, marginBottom: 32, lineHeight: 1.6 }}>
              The math is clear. With rising fuel prices and generous state incentives, 
              transitioning to electric is no longer just green—it's smart business.
            </p>
            <Btn 
              variant="primary" 
              color={C.green}
              onClick={() => openTool("subsidy")}
              style={{ padding: "16px 32px", color: "#fff" }}
            >
              Calculate Your Savings ›
            </Btn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {stats.map(s => (
              <Card key={s.label} style={{ padding: 32, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.green, marginBottom: 4 }}>{s.val}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: C.ink3, lineHeight: 1.5 }}>{s.sub}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
