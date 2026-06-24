"use client"
export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import Shell from "../../../components/layout/Shell"
import { Card, Avatar, Btn, StatusPill } from "../../../components/ui"
import { C } from "../../../lib/constants"
import { db } from "../../../lib/firebase-client"
import { collection, query, onSnapshot, orderBy } from "firebase/firestore"

export default function DealerAttendancePage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    // For MVP, fetch recent attendance globally or for the specific dealership if saved.
    // Currently, `evcrm_attendance` just has repId, repName, date, lat, lng.
    // We will query ordered by date descending.
    const q = query(collection(db, "evcrm_attendance"), orderBy("date", "desc"))
    
    const unsub = onSnapshot(q, snap => {
      const recs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setRecords(recs)
      setLoading(false)
    })
    
    return () => unsub()
  }, [])

  const filteredRecords = records.filter(r => r.date === filterDate)

  const handleExportCSV = () => {
    const header = "Date,Rep Name,Punch In,Punch Out,In Location,Out Location\n"
    const rows = filteredRecords.map(r => {
      const inLoc = r.lat ? `${r.lat},${r.lng}` : "N/A"
      const outLoc = r.punchOutLat ? `${r.punchOutLat},${r.punchOutLng}` : "N/A"
      return `${r.date},"${r.repName}",${r.punchIn || "N/A"},${r.punchOut || "N/A"},"${inLoc}","${outLoc}"`
    }).join("\n")

    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_export_${filterDate}.csv`
    a.click()
  }

  return (
    <Shell title="Attendance Monitor">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.ink, marginBottom: 6 }}>Team Attendance</h1>
          <p style={{ fontSize: 13, color: C.ink3 }}>Monitor live geo-tagged attendance records for your sales team.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <input 
            type="date" 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
            style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, fontFamily: "inherit", color: C.ink, fontSize: 13, fontWeight: 700 }}
          />
          <Btn variant="secondary" onClick={handleExportCSV}>⬇ Export CSV</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink3, marginBottom: 4 }}>Total Punched In Today</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.green }}>{filteredRecords.filter(r => r.punchIn).length}</div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink3, marginBottom: 4 }}>Completed Day (Out)</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.ink }}>{filteredRecords.filter(r => r.punchOut).length}</div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink3, marginBottom: 4 }}>Currently Active</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.orange }}>{filteredRecords.filter(r => r.punchIn && !r.punchOut).length}</div>
        </Card>
      </div>

      <Card noPad>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.ink3 }}>Loading attendance records...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>No Records for {filterDate}</div>
            <div style={{ fontSize: 13, color: C.ink3 }}>Sales reps have not punched in for this date yet.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, textAlign: "left", fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "14px 20px" }}>Sales Rep</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Punch In</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Punch Out</th>
                <th style={{ padding: "14px 20px", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(rec => (
                <tr key={rec.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={rec.repName || "?"} size={36} color={C.orange} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{rec.repName || "Unknown Rep"}</div>
                        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{rec.date}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{rec.punchIn || "—"}</div>
                    {rec.lat && (
                      <a href={`https://maps.google.com/?q=${rec.lat},${rec.lng}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blue, textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: 4 }}>
                        📍 View Map
                      </a>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{rec.punchOut || "—"}</div>
                    {rec.punchOutLat && (
                      <a href={`https://maps.google.com/?q=${rec.punchOutLat},${rec.punchOutLng}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blue, textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: 4 }}>
                        📍 View Map
                      </a>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "center" }}>
                    <StatusPill status={rec.punchOut ? "CLOSED" : "WARM"} />
                    <div style={{ fontSize: 10, color: C.ink3, marginTop: 4, fontWeight: 700 }}>
                      {rec.punchOut ? "SHIFT ENDED" : "ON DUTY"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

    </Shell>
  )
}
