"use client"
import { useState } from "react"
import TCOCalculator from "../tools/TCOCalculator"
import SubsidyEstimator from "../tools/SubsidyEstimator"
import EMICalculator from "../tools/EMICalculator"
import { ToolModal } from "../ui"

const T = {
  accent:  "#10b981", // Emerald
  ink:     "#0f172a", // Deep Slate
  ink2:    "#475569", // Muted
  border:  "rgba(255,255,255,0.1)",
}

export default function HomeToolsWrapper() {
  const [activeTool, setActiveTool] = useState(null)

  const ToolBtn = ({ id, label, icon, color=T.accent }) => (
    <button 
      onClick={() => setActiveTool(id)}
      style={{ 
        width: "100%", padding: "16px", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`,
        borderRadius: 16, display: "flex", alignItems: "center", gap: 14, color: "#fff",
        cursor: "pointer", transition: "all 0.2s", textAlign: "left", marginBottom: 12
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.5 }}>OPEN ↗</span>
    </button>
  )

  return (
    <div>
      <ToolBtn id="tco" label="Ownership (TCO) Calculator" icon="📊" />
      <ToolBtn id="subsidy" label="FAME-II Subsidy Estimator" icon="🏛️" />
      <ToolBtn id="emi" label="EV Financing & EMI Planner" icon="💳" />

      {activeTool === "tco" && (
        <ToolModal title="Ownership (TCO) Intelligence" onClose={() => setActiveTool(null)}>
           <TCOCalculator onConvert={() => setActiveTool(null)} />
        </ToolModal>
      )}
      {activeTool === "subsidy" && (
        <ToolModal title="Subsidy & Policy Estimator" onClose={() => setActiveTool(null)}>
           <SubsidyEstimator onConvert={() => setActiveTool(null)} />
        </ToolModal>
      )}
      {activeTool === "emi" && (
        <ToolModal title="Financing Intelligence" onClose={() => setActiveTool(null)}>
           <EMICalculator onConvert={() => setActiveTool(null)} />
        </ToolModal>
      )}
    </div>
  )
}
