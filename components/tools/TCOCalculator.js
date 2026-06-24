"use client"
import { useState } from 'react'

export default function TCOCalculator() {
  const [km, setKm] = useState(1000)
  const [petrolMileage, setPetrolMileage] = useState(15)
  const [evRange, setEvRange] = useState(250)
  const [batterySize, setBatterySize] = useState(30)
  
  const petrolPrice = 100 // Avg INR
  const electricityPrice = 8 // Avg INR per Unit

  const petrolCost = (km / petrolMileage) * petrolPrice
  const evCost = (km / (evRange / batterySize)) * electricityPrice
  const monthlySavings = petrolCost - evCost

  return (
    <div style={{ background: "#0f172a", borderRadius: 32, padding: 40, color: "#fff", boxShadow: "0 20px 80px rgba(0,0,0,0.4)" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
         <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
         <h3 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Petrol vs. EV Calculator</h3>
         <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>See exactly how much you save in India based on your usage.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>
         <div style={{ display: "grid", gap: 20 }}>
            <div>
               <label style={{ fontSize: 11, fontWeight: 900, color: "#10b981", display: "block", marginBottom: 10, textTransform: "uppercase" }}>Monthly Run (KM)</label>
               <input type="range" min="500" max="5000" step="100" value={km} onChange={e => setKm(e.target.value)} style={{ width: "100%", accentColor: "#10b981" }} />
               <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{km} KM</div>
            </div>

            <div>
               <label style={{ fontSize: 11, fontWeight: 900, color: "#3b82f6", display: "block", marginBottom: 10, textTransform: "uppercase" }}>Petrol Mileage (KM/L)</label>
               <input type="number" value={petrolMileage} onChange={e => setPetrolMileage(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: 12, borderRadius: 10, color: "#fff", fontWeight: 700 }} />
            </div>
         </div>

         <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 24, padding: 32, border: "1px solid rgba(255,255,255,0.08)", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#94a3b8", marginBottom: 10 }}>ESTIMATED MONTHLY SAVINGS</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#10b981" }}>₹{Math.round(monthlySavings).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>Avg. Electricity Rate: ₹8/Unit</div>
         </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
         <div style={{ padding: 20, background: "rgba(255,255,255,0.05)", borderRadius: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#ef4444", marginBottom: 4 }}>PETROL COST</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>₹{Math.round(petrolCost).toLocaleString()}</div>
         </div>
         <div style={{ padding: 20, background: "rgba(255,255,255,0.05)", borderRadius: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", marginBottom: 4 }}>EV COST</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>₹{Math.round(evCost).toLocaleString()}</div>
         </div>
      </div>
    </div>
  )
}
