"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import Shell from "../../components/layout/Shell"
import { Tag, Btn, Card, Spinner } from "../../components/ui"
import { C, fmt } from "../../lib/constants"
import { db } from "../../lib/firebase-client"
import { collection, getDocs, query, serverTimestamp, addDoc } from "firebase/firestore"

const MOCK_DEALERS = [
  { id: 'd1', name: 'GreenDrive EV Motors', city: 'Bangalore', location: 'Indiranagar', rating: 4.8 },
  { id: 'd2', name: 'Indus Mobility Delhi', city: 'Delhi', location: 'Okhla Phase 3', rating: 4.6 },
  { id: 'd3', name: 'Pune EV Hub', city: 'Pune', location: 'Kothrud', rating: 4.9 }
]

const VEHICLE_TYPES = ["All", "2W", "3W", "4W"]

export default function MarketplacePage() {
  const [filter, setFilter] = useState("All")
  const [city, setCity] = useState("All")
  const [booked, setBooked] = useState(false)
  const [booking, setBooking] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const vSnap = await getDocs(query(collection(db, "evcrm_vehicles")))
        const masterVehicles = vSnap.docs.reduce((acc, d) => {
          acc[d.data().model] = { id: d.id, ...d.data() }
          return acc
        }, {})

        const iSnap = await getDocs(query(collection(db, "evcrm_inventory")))
        const items = iSnap.docs.map(d => {
          const inv = d.data()
          const v = masterVehicles[inv.model] || {}
          const dealer = MOCK_DEALERS[Math.floor(Math.random() * MOCK_DEALERS.length)]
          return { id: d.id, ...v, ...inv, dealer }
        }).filter(item => item.status === "IN_STOCK")

        setProducts(items)
      } catch (err) {
        console.error("Firestore error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = products.filter(p => {
    const typeMatch = filter === "All" || p.type?.includes(filter)
    const cityMatch = city === "All" || p.dealer?.city === city
    return typeMatch && cityMatch
  })

  const doBook = async (product) => {
    setBooking(true)
    try {
      await addDoc(collection(db, "evcrm_leads"), {
        name: "Marketplace Customer",
        phone: "9876543210",
        vehicle: `${product.brand} ${product.model}`,
        dealer: product.dealer?.name,
        source: "marketplace",
        status: "NEW",
        score: 85,
        created_at: new Date().toISOString(),
        timestamp: serverTimestamp(),
        notes: `Marketplace Booking for ${product.brand} ${product.model}. Dealer: ${product.dealer?.name}`
      })
      setBooked(true)
    } catch (err) {
      console.error("Booking error:", err)
    } finally {
      setBooking(false)
    }
  }

  return (
    <Shell>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Page Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.5px" }}>
              Ev<span style={{ color: C.green }}>.Market</span>
            </div>
            <p style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>
              Live vehicle inventory from verified dealers across India.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/discover" style={{ fontSize: 12, fontWeight: 700, color: C.green, textDecoration: "none" }}>
              🌐 Consumer Portal ›
            </Link>
            <select
              onChange={(e) => setCity(e.target.value)}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", color: C.ink, background: "#fff" }}
            >
              <option value="All">All Cities</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Delhi">Delhi</option>
              <option value="Pune">Pune</option>
            </select>
          </div>
        </div>

        {/* Success Banner */}
        {booked && (
          <div style={{ background: C.greenL, border: `1px solid ${C.green}40`, borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.greenD }}>Booking Confirmed!</div>
              <div style={{ fontSize: 11, color: C.greenD, opacity: 0.8 }}>A new lead has been created in the CRM.</div>
            </div>
            <button onClick={() => setBooked(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.greenD, fontSize: 18 }}>✕</button>
          </div>
        )}

        {/* Type Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
          {VEHICLE_TYPES.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 18px", borderRadius: 20,
                border: `1.5px solid ${filter === f ? C.green : C.border}`,
                background: filter === f ? C.greenL : "#fff",
                color: filter === f ? C.greenD : C.ink2,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s", fontFamily: "inherit"
              }}
            >
              {f === "All" ? "All Types" : `e-${f}`}
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 12, color: C.ink3 }}>
            {loading ? "Loading..." : `${filtered.length} vehicles live`}
          </div>
        </div>

        {/* Vehicle Grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <Card style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔌</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>No vehicles available</div>
            <div style={{ fontSize: 12, color: C.ink3 }}>Try changing the filter or check back after the next inventory sync.</div>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {filtered.map(p => (
              <Card key={p.id} noPad>
                <div style={{ height: 160, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, borderRadius: "14px 14px 0 0" }}>
                  {p.type?.includes("4W") ? "🚙" : "🛵"}
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", marginBottom: 2 }}>{p.brand}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: C.ink }}>{p.model}</div>
                      <div style={{ fontSize: 11, color: C.ink3 }}>{p.type} · {p.range}km Range</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: C.greenD }}>{fmt.currency(p.exShowroomPrice || p.exShowroom)}</div>
                      <div style={{ fontSize: 9, color: C.ink3 }}>Ex-Showroom</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                    <Tag label="IN STOCK ✓" color={C.green} bg={C.greenL} />
                    <Tag label={`e-${p.type}`} color={C.blue} bg={C.blueL} />
                  </div>

                  <div style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, background: C.greenL, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🏪</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{p.dealer?.name}</div>
                      <div style={{ fontSize: 9, color: C.ink3 }}>{p.dealer?.location}, {p.dealer?.city}</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: C.yellow }}>★ {p.dealer?.rating}</div>
                  </div>

                  <Btn
                    loading={booking}
                    onClick={() => {
                      if (confirm(`Book ${p.brand} ${p.model} test ride at ${p.dealer?.name}?`)) {
                        doBook(p)
                      }
                    }}
                    style={{ width: "100%" }}
                  >
                    Book Test Ride ›
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
