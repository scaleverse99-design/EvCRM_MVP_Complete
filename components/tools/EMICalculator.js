"use client"
import { useState, useEffect } from "react"
import { C, fmt } from "../../lib/constants"
import { Slider, Card, Btn, Tag } from "../ui"

export default function EMICalculator({ initialPrice = 150000, onConvert }) {
  const [price, setPrice] = useState(initialPrice)
  const [downPayment, setDownPayment] = useState(initialPrice * 0.2) // 20% default
  const [tenure, setTenure] = useState(36)
  const [interest, setInterest] = useState(10.5)

  const loanAmount = price - downPayment
  const monRate = interest / 12 / 100
  const emi = Math.round(loanAmount * monRate * Math.pow(1 + monRate, tenure) / (Math.pow(1 + monRate, tenure) - 1))
  const totalAmount = emi * tenure
  const totalInterest = totalAmount - loanAmount

  return (
    <div style={{ animation: "evcrm-fade-in 0.3s ease" }}>
      <div style={{ marginBottom: 32 }}>
         <Slider label="Vehicle On-Road Price" min={50000} max={2500000} step={10000} value={price} onChange={setPrice} unit=" ₹" />
         <Slider label="Down Payment" min={price * 0.1} max={price * 0.9} step={5000} value={downPayment} onChange={setDownPayment} unit=" ₹" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
         <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, marginBottom: 8, display: "block" }}>TENURE (MONTHS)</label>
            <div style={{ display: "flex", gap: 4 }}>
               {[12, 24, 36, 48].map(m => (
                 <button 
                   key={m} onClick={() => setTenure(m)}
                   style={{ 
                     flex: 1, padding: "8px", borderRadius: 8, 
                     border: `1.5px solid ${tenure === m ? C.green : C.border}`,
                     background: tenure === m ? C.greenL : "none",
                     color: tenure === m ? C.greenD : C.ink,
                     fontWeight: 800, fontSize: 12, cursor: "pointer"
                   }}
                 >
                   {m}
                 </button>
               ))}
            </div>
         </div>
         <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, marginBottom: 8, display: "block" }}>INTEREST RATE (%)</label>
            <input 
              type="number" value={interest} onChange={e => setInterest(Number(e.target.value))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, outline: "none", fontSize: 13, background: "#fff" }}
            />
         </div>
      </div>

      <Card style={{ padding: 32, background: "#fff", border: `2px solid #1B4332`, marginBottom: 32, textAlign: "center" }}>
         <div style={{ fontSize: 12, fontWeight: 900, color: C.ink3, letterSpacing: 1, marginBottom: 8 }}>MONTHLY EMI</div>
         <div style={{ fontSize: 48, fontWeight: 900, color: "#1B4332", marginBottom: 8 }}>{fmt.currency(emi)}</div>
         <p style={{ fontSize: 12, color: C.ink3 }}>Loan Amount: {fmt.currency(loanAmount)}</p>

         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24, borderTop: `1px dashed ${C.border}`, paddingTop: 24 }}>
            <div>
               <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>Total Interest</div>
               <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{fmt.currency(totalInterest)}</div>
            </div>
            <div>
               <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>Total Payable</div>
               <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{fmt.currency(totalAmount)}</div>
            </div>
         </div>
      </Card>

      <div style={{ marginBottom: 32 }}>
         <div style={{ fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase", marginBottom: 16 }}>Preferred Finance Partners</div>
         <div style={{ display: "flex", gap: 20, opacity: 0.6, filter: "grayscale(1)" }}>
            {["Mahindra Finance", "Hero Fincorp", "Muthoot Finance"].map(p => (
              <div key={p} style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>{p.toUpperCase()}</div>
            ))}
         </div>
      </div>

      <Btn 
        onClick={() => onConvert({ emi, tenure, tool: "emi" })}
        style={{ width: "100%", padding: "16px", background: "#1B4332", color: "#F5C518", fontSize: 16, fontWeight: 800 }}
      >
        Check Loan Eligibility via Dealer ➔
      </Btn>
    </div>
  )
}
