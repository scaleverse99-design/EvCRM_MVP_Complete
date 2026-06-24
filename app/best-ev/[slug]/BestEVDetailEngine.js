"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, Btn, Tag } from "../../../components/ui"
import { C } from "../../../lib/constants"
import { useAuth } from "../../../lib/AuthContext"
import { OpsProxy } from "../../../lib/ops-proxy"
import ReactMarkdown from 'react-markdown'

export default function BestEVDetailEngine() {
  const { slug } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.opsmanager_url || !slug) return
      setLoading(true)
      try {
        const vehicles = await OpsProxy.get("vehicles", user, "ev-crm")
        const found = vehicles.find(v => v.slug === slug || v.model?.toLowerCase().replace(/\s+/g, '-') === slug)
        setData(found || null)
      } catch (err) {
        console.error("[Best-EV Sync Error]:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [slug, user?.opsmanager_url])

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.ink3 }}>Consulting Sovereign Database...</div>
  if (!data) return <div style={{ padding: 40, textAlign: "center" }}>Vehicle not found in your Drive Rack.</div>

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 60 }}>
      <Btn onClick={() => router.push("/vehicles")} style={{ marginBottom: 20 }}>← Back to All EVs</Btn>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <Tag color={C.blue}>{data.type || "Electric"}</Tag>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: C.ink, marginTop: 10, marginBottom: 4 }}>{data.brand} {data.model}</h1>
            <p style={{ fontSize: 18, color: C.ink3 }}>{data.variant || "Performance Edition"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>₹{data.price_range || "Contact Dealer"}</div>
            <div style={{ fontSize: 12, color: C.ink3 }}>Ex-Showroom Price</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15, marginBottom: 30 }}>
           <div style={{ background: C.bg, padding: 15, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>🔋</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, marginTop: 4 }}>RANGE</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{data.range || "450"} km</div>
           </div>
           <div style={{ background: C.bg, padding: 15, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>⚡</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, marginTop: 4 }}>BATTERY</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{data.battery_size || "60"} kWh</div>
           </div>
           <div style={{ background: C.bg, padding: 15, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>🚀</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, marginTop: 4 }}>0-100 KM/H</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{data.acceleration || "7.2"}s</div>
           </div>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.7, color: C.ink2 }}>
          <ReactMarkdown>
            {data.description || "Expert review coming soon for this model."}
          </ReactMarkdown>
        </div>
      </Card>
    </div>
  )
}
