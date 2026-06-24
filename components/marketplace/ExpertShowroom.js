"use client"
import Link from "next/link"
import { Tag, Btn, Card } from "../ui"
import { C } from "../../lib/constants"

export default function ExpertShowroom({ title, city, children }) {
  return (
    <div style={{ padding: '20px 0' }}>
      {/* Search Result Banner */}
      <div style={{ marginBottom: 32 }}>
        <Tag label={`ANALYSING SEARCH INTENT: ${city}`} color={C.blue} />
        <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 12, letterSpacing: '-0.7px' }}>
          Finding the best VFM (Value-for-Money) EV <br/>
          for <span style={{ color: C.greenD }}>{city}</span>
        </h1>
        <p style={{ marginTop: 12, fontSize: 13, color: C.ink3, lineHeight: 1.6, maxWidth: 640 }}>
           Based on our data of over 10,000 lead interactions, we've filtered the top performers 
           that balance range, price, and nearby service availability. 
           We've removed the corporate hype to give you the honest blueprint for your next buy.
        </p>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, animation: 'evcrm-pulse 1.5s infinite' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>
            Expert Analysis Active: Showing results sorted by real-world cost per KM and service trust score.
        </div>
      </div>

      {children}
      
      <div style={{ marginTop: 60, padding: 40, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
         <h2 style={{ fontSize: 18, fontWeight: 800 }}>Couldn't find your perfect match?</h2>
         <p style={{ fontSize: 12, color: C.ink3, marginTop: 8 }}>Our experts are online. Get a personalized PDF recommendation for your budget.</p>
         <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
            <Btn style={{ padding: '14px 40px' }}>Chat with an EV Expert ›</Btn>
         </div>
      </div>
    </div>
  )
}
