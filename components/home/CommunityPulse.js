"use client"
import { C } from "../../lib/constants"
import { Card, Tag, Btn } from "../ui"
import REVIEWS from "../../data/reviews.json"

export default function CommunityPulse({ location }) {
  const local = REVIEWS.filter(r => r.district === location?.district || r.district === "Hyderabad").slice(0, 3)

  return (
    <section id="community" style={{ padding: "80px 0", background: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ 
            display: "inline-flex", alignItems: "center", gap: 6, 
            background: C.greenL, color: C.greenD, 
            padding: "4px 12px", borderRadius: 20, 
            fontSize: 10, fontWeight: 900, marginBottom: 16 
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "evcrm-pulse 1.5s infinite" }} />
            VERIFIED VOICES
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: C.ink, marginBottom: 12 }}>What real owners are saying.</h2>
          <p style={{ fontSize: 13, color: C.ink3 }}>Join India's most trusted community of electric vehicle early adopters.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 40 }}>
          {local.map(r => (
            <Card key={r.id} style={{ padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{r.vehicle} · {r.district}</div>
                  </div>
                  <div style={{ fontSize: 16 }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: C.ink2, marginBottom: 24, fontStyle: "italic" }}>
                  "{r.review}"
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {r.tags.map(t => (
                  <Tag key={t} label={t.toUpperCase()} color={t === "Safety" ? C.red : C.blue} bg={t === "Safety" ? C.redL : C.blueL} />
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
           <Btn variant="primary" style={{ background: C.green }}>Read All Reviews ›</Btn>
           <Btn variant="secondary">Write a Review</Btn>
        </div>
        
        <p style={{ textAlign: "center", fontSize: 11, color: C.ink3, marginTop: 24, opacity: 0.6 }}>
          ✓ Reviews are verified via vehicle registration and purchase confirmation.
        </p>
      </div>
    </section>
  )
}
