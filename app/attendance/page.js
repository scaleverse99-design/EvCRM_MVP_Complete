"use client"
import { useState, useEffect } from "react"
import Shell from "../../components/layout/Shell"
import { Card, Btn } from "../../components/ui"
import { C } from "../../lib/constants"
import { db } from "../../lib/firebase-client"
import {
  collection, addDoc, query, where, onSnapshot,
  updateDoc, doc, orderBy, serverTimestamp
} from "firebase/firestore"

// ── Helpers ────────────────────────────────────────────────────────────
const today       = () => new Date().toISOString().slice(0, 10)
const now12       = () => new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true })
const monthDates  = () => {
  const d = new Date(), year = d.getFullYear(), month = d.getMonth()
  const days = new Date(year, month+1, 0).getDate()
  return Array.from({ length:days }, (_,i) => {
    const dt = new Date(year, month, i+1)
    return { date:`${year}-${String(month+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`, day:i+1, weekday:dt.getDay() }
  })
}
const MONTHS_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const DAYS          = ["Su","Mo","Tu","We","Th","Fr","Sa"]

export default function AttendancePage() {
  const [user,      setUser]      = useState(null)
  const [todayRec,  setTodayRec]  = useState(null)
  const [allRecs,   setAllRecs]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [punching,  setPunching]  = useState(false)
  const [geoError,  setGeoError]  = useState(null)
  const [tab,       setTab]       = useState(0) // 0=Punch 1=Calendar

  // Fetch logged-in user
  useEffect(() => {
    fetch("/api/auth/me").then(r=>r.json()).then(d => setUser(d.user))
  }, [])

  // Listen to attendance records for this user
  useEffect(() => {
    if (!user?.id) return
    const q = query(
      collection(db, "evcrm_attendance"),
      where("repId","==",user.id),
      orderBy("date","desc")
    )
    const unsub = onSnapshot(q, snap => {
      const recs = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      setAllRecs(recs)
      setTodayRec(recs.find(r => r.date === today()) || null)
      setLoading(false)
    })
    return () => unsub()
  }, [user?.id])

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject("Geolocation not supported"); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat:pos.coords.latitude, lng:pos.coords.longitude, accuracy:pos.coords.accuracy }),
      err => reject(err.message),
      { enableHighAccuracy:true, timeout:10000 }
    )
  })

  const punchIn = async () => {
    setGeoError(null); setPunching(true)
    try {
      const { lat, lng, accuracy } = await getLocation()
      await addDoc(collection(db, "evcrm_attendance"), {
        repId:    user.id,
        repName:  user.name,
        date:     today(),
        punchIn:  now12(),
        punchOut: null,
        lat, lng, accuracy,
        punchInAt:  serverTimestamp(),
        punchOutAt: null,
      })
    } catch(e) { setGeoError(String(e)) }
    finally { setPunching(false) }
  }

  const punchOut = async () => {
    if (!todayRec) return
    setGeoError(null); setPunching(true)
    try {
      const { lat, lng, accuracy } = await getLocation()
      await updateDoc(doc(db, "evcrm_attendance", todayRec.id), {
        punchOut:  now12(),
        punchOutLat: lat, punchOutLng: lng,
        punchOutAt: serverTimestamp(),
      })
    } catch(e) { setGeoError(String(e)) }
    finally { setPunching(false) }
  }

  // Calendar data map
  const recMap = {}
  allRecs.forEach(r => { recMap[r.date] = r })
  const dates = monthDates()
  const firstDay = dates[0].weekday
  const d = new Date()

  // Stats
  const present   = allRecs.filter(r => r.punchIn && r.punchOut).length
  const halfDay   = allRecs.filter(r => r.punchIn && !r.punchOut && r.date < today()).length
  const thisMonth = d.getMonth()
  const monthRecs = allRecs.filter(r => r.date?.startsWith(`${d.getFullYear()}-${String(thisMonth+1).padStart(2,"0")}`))

  return (
    <Shell title="My Attendance">
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>My Attendance</h1>
        <p style={{ fontSize:12, color:C.ink3 }}>Track your punch in/out with live geo-tag — {MONTHS_LABELS[thisMonth]} {d.getFullYear()}</p>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Days Present",  val:present,       color:C.green  },
          { label:"Half Days",     val:halfDay,       color:C.orange },
          { label:"This Month",    val:monthRecs.length, color:C.blue },
          { label:"Total Records", val:allRecs.length, color:C.purple },
        ].map((s,i) => (
          <Card key={i} style={{ padding:"14px 18px" }}>
            <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:11, color:C.ink3 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:18, background:C.bg, padding:4, borderRadius:12, border:`1px solid ${C.border}`, width:"fit-content" }}>
        {["Punch In/Out","Calendar"].map((t,i) => (
          <button key={t} onClick={() => setTab(i)} style={{ padding:"8px 20px", borderRadius:9, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:tab===i?700:500, color:tab===i?"#fff":C.ink3, background:tab===i?C.green:"transparent", transition:"all 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── PUNCH TAB ───────────────────────────────────────────── */}
      {tab === 0 && (
        <div style={{ maxWidth:480 }}>
          {/* Today's card */}
          <Card style={{ marginBottom:14 }}>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:11, color:C.ink3, marginBottom:4, letterSpacing:"0.4px" }}>TODAY</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.ink }}>{new Date().toDateString()}</div>
            </div>

            {/* Live status */}
            <div style={{ background: todayRec?.punchIn ? (todayRec?.punchOut ? C.greenL : C.orangeL) : C.bg, border:`1px solid ${todayRec?.punchIn ? (todayRec?.punchOut ? C.green : C.orange) : C.border}30`, borderRadius:12, padding:"14px 18px", marginBottom:16, textAlign:"center" }}>
              {!todayRec?.punchIn && (
                <div style={{ color:C.ink3, fontSize:12 }}>You have not punched in yet today.</div>
              )}
              {todayRec?.punchIn && !todayRec?.punchOut && (
                <>
                  <div style={{ fontSize:11, color:C.orange, fontWeight:700, marginBottom:4 }}>● ON DUTY</div>
                  <div style={{ fontSize:18, fontWeight:900, color:C.ink }}>In: {todayRec.punchIn}</div>
                  {todayRec.lat && <div style={{ fontSize:10, color:C.ink3, marginTop:4 }}>📍 {todayRec.lat.toFixed(5)}, {todayRec.lng.toFixed(5)}</div>}
                </>
              )}
              {todayRec?.punchOut && (
                <>
                  <div style={{ fontSize:11, color:C.green, fontWeight:700, marginBottom:4 }}>✓ DAY COMPLETE</div>
                  <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:6 }}>
                    <div><div style={{ fontSize:15, fontWeight:800, color:C.ink }}>{todayRec.punchIn}</div><div style={{ fontSize:10, color:C.ink3 }}>Punch In</div></div>
                    <div><div style={{ fontSize:15, fontWeight:800, color:C.ink }}>{todayRec.punchOut}</div><div style={{ fontSize:10, color:C.ink3 }}>Punch Out</div></div>
                  </div>
                </>
              )}
            </div>

            {geoError && (
              <div style={{ background:C.redL, border:`1px solid ${C.red}30`, borderRadius:10, padding:"10px 14px", fontSize:11, color:C.red, marginBottom:12 }}>
                ⚠ Location error: {geoError}
              </div>
            )}

            {/* Action button */}
            {!todayRec?.punchIn && (
              <Btn onClick={punchIn} loading={punching} style={{ width:"100%", background:C.green }}>
                📍 Punch In — Geo-tag My Location
              </Btn>
            )}
            {todayRec?.punchIn && !todayRec?.punchOut && (
              <button onClick={punchOut} disabled={punching} style={{ width:"100%", background:C.orange, color:"#fff", border:"none", borderRadius:12, padding:"14px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", opacity:punching?0.7:1 }}>
                {punching ? "Getting location…" : "📍 Punch Out — Geo-tag Exit"}
              </button>
            )}
            {todayRec?.punchOut && (
              <div style={{ textAlign:"center", fontSize:12, color:C.green, fontWeight:700 }}>
                ✅ You're all done for today!
              </div>
            )}
          </Card>

          {/* Recent history */}
          <h3 style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>Recent History</h3>
          {allRecs.slice(0,7).map((r,i) => (
            <div key={r.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:"10px 14px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{r.date}</div>
                <div style={{ fontSize:10.5, color:C.ink3 }}>In: {r.punchIn||"—"} · Out: {r.punchOut||"—"}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {r.lat && (
                  <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" style={{ fontSize:10, color:C.blue, textDecoration:"none" }}>📍</a>
                )}
                <span style={{ background: r.punchOut?C.greenL:r.date<today()?C.redL:C.orangeL, color:r.punchOut?C.green:r.date<today()?C.red:C.orange, fontSize:9.5, fontWeight:700, padding:"2px 8px", borderRadius:8 }}>
                  {r.punchOut?"Full":r.date<today()?"Absent":"In Progress"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CALENDAR TAB ─────────────────────────────────────────── */}
      {tab === 1 && (
        <Card style={{ maxWidth:420 }}>
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.ink }}>{MONTHS_LABELS[thisMonth]} {d.getFullYear()}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:8 }}>
            {DAYS.map(day => (
              <div key={day} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:C.ink3, padding:"4px 0" }}>{day}</div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
            {Array.from({ length:firstDay }, (_,i) => <div key={`empty-${i}`} />)}
            {dates.map(({ date, day }) => {
              const rec = recMap[date]
              const isToday = date === today()
              const isFuture = date > today()
              let bg = C.bg, color = C.ink3, label = ""
              if (rec?.punchIn && rec?.punchOut) { bg = C.greenL; color = C.green }
              else if (rec?.punchIn) { bg = C.orangeL; color = C.orange; label = "H" }
              else if (!isFuture && !isToday && day <= d.getDate()) { bg = C.redL; color = C.red }
              return (
                <div key={date} style={{ aspectRatio:"1", background:bg, borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:isToday?`2px solid ${C.green}`:"none", position:"relative" }}>
                  <span style={{ fontSize:11, fontWeight:isToday?800:500, color: isToday?C.green:color }}>{day}</span>
                  {label && <span style={{ fontSize:7, color, fontWeight:700 }}>{label}</span>}
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display:"flex", gap:14, marginTop:14, justifyContent:"center" }}>
            {[{c:C.green,l:"Present"},{c:C.orange,l:"Half Day"},{c:C.red,l:"Absent"}].map(({c,l}) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:`${c}30`, border:`1px solid ${c}50` }} />
                <span style={{ fontSize:10, color:C.ink3 }}>{l}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Shell>
  )
}
