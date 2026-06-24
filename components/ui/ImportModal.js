"use client"
import { useState } from "react"
import Papa from "papaparse"
import { Modal, Btn, Card, Tag } from "./index"
import { C } from "../../lib/constants"
import { useAuth } from "../../lib/AuthContext"

export default function ImportModal({ open, onClose, dealership }) {
  const { refresh } = useAuth()
  const [file, setFile] = useState(null)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Upload, 2: Preview/Map, 3: Success

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data)
        setStep(2)
      }
    })
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealership,
          records: data.map(r => ({
            name: r.name || r["Full Name"] || r.Customer || "",
            phone: r.phone || r["Phone Number"] || r.Mobile || "",
            vehicle: r.vehicle || r.Car || r.Model || "",
            status: "NEW",
            source: "bulk_import"
          }))
        })
      })
      const result = await res.json()
      if (result.success) {
        setStep(3)
        refresh() // Refresh Auth/Status
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Modal title="Bulk Import Data" onClose={onClose}>
      {step === 1 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Upload your Customer Spreadsheet</div>
          <div style={{ fontSize: 12, color: C.ink3, marginBottom: 20 }}>Support CSV files. Ensure you have columns for Name, Phone, and Vehicle.</div>
          
          <label style={{ display: "block", border: `2px dashed ${C.border}`, borderRadius: 16, padding: 40, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />
            <div style={{ color: C.green, fontWeight: 700 }}>Choose CSV File</div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>or drag and drop here</div>
          </label>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>Preview: {data.length} records found</div>
          <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 20 }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                <tr>
                  <th style={{ padding: 8, textAlign: "left" }}>Name</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Phone</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Vehicle</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}50` }}>
                    <td style={{ padding: 8 }}>{r.name || r["Full Name"] || r.Customer || "-"}</td>
                    <td style={{ padding: 8 }}>{r.phone || r["Phone Number"] || r.Mobile || "-"}</td>
                    <td style={{ padding: 8 }}>{r.vehicle || r.Car || r.Model || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 5 && <div style={{ padding: 8, textAlign: "center", color: C.ink3, fontSize: 10 }}>+ {data.length - 5} more rows</div>}
          </div>
          
          <div style={{ background: `${C.blue}10`, padding: 12, borderRadius: 10, marginBottom: 20, border: `1px solid ${C.blue}20` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 4 }}>Mapping Fields</div>
            <div style={{ fontSize: 10, color: C.ink2 }}>We've auto-detected your columns. Click import to add these leads to your CRM.</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</Btn>
            <Btn loading={loading} style={{ flex: 2 }} onClick={handleImport}>Commit Import →</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Import Successful!</div>
          <div style={{ fontSize: 13, color: C.ink3, marginBottom: 24 }}>{data.length} leads have been added to your dealership pipeline.</div>
          <Btn onClick={onClose} style={{ width: "100%" }}>Return to Dashboard</Btn>
        </div>
      )}
    </Modal>
  )
}
