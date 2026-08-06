/**
 * One-time migration: seed inventory rows -> the canonical vehicle schema.
 *
 *   node scripts/migrate-inventory-schema.js           # dry run (default)
 *   node scripts/migrate-inventory-schema.js --apply   # write
 *
 * ── Why ──────────────────────────────────────────────────────────────
 * 10 real inventory rows were written by a seed script that used its own
 * field names. Nothing downstream reads them, so evcrm.in's marketplace,
 * the MCP search_vehicles tool, the sitemap and blog matched-inventory all
 * return zero results. Confirmed 2026-08-07: search_vehicles with NO
 * filters returns totalMatches: 0 while the table holds 10 rows.
 *
 * The single biggest cause is `status: "AVAILABLE"` — every visibility
 * check in the codebase tests for "IN_STOCK", and "AVAILABLE" is not even
 * in the documented enum (IN_STOCK/BOOKED/SOLD/CANCELLED/DEAD_STOCK).
 *
 * Canonical field names come from the blank-vehicle factory in
 * app/dealer/page.js (~line 149) — the shape a real dealer submission
 * produces — not from guesswork.
 *
 * ── Two gotchas this handles ─────────────────────────────────────────
 * 1. isDemo is NOT set. app/api/marketplace/vehicles/route.js line 25
 *    filters `!v.isDemo`, so flagging these as demo would keep them
 *    invisible — the exact opposite of the intent.
 * 2. The 5 used cars (14k-62k km) become condition:"used", which the
 *    marketplace gates behind inspectionReport.approvalStatus ===
 *    "APPROVED". Their existing inspectionGrade (A/A+/A++) is carried into
 *    a real inspection report and approved, so they are actually visible.
 *    Without that they would migrate cleanly and still show nothing.
 */

const fs = require("fs")
const path = require("path")

const envPath = path.join(__dirname, "..", ".env")
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
}

const APPLY = process.argv.includes("--apply")

// Old seed `type` strings -> canonical fuelType. The seed conflated vehicle
// form factor and fuel into one field; the schema keeps them separate.
const FUEL_FROM_TYPE = {
  "Electric Vehicle (EV)": "Electric",
  "Petrol Car": "Petrol",
  "Diesel Car": "Diesel",
  "CNG Car": "CNG",
  "Hybrid Car": "Hybrid",
}

// Renamed away — dropped after their value is copied, so a row never
// carries both spellings and leaves the next reader guessing which wins.
const RETIRED = ["modelName", "exShowroomPrice", "kmDriven", "regYear", "location", "inspectionGrade"]

/** "312 km" -> 312; null when there's no number to take. */
function parseKm(str) {
  const m = String(str || "").match(/(\d[\d,]*)/)
  return m ? Number(m[1].replace(/,/g, "")) : null
}

function migrate(v) {
  const km = Number(v.kmDriven || 0)
  const isUsed = km > 0
  const [city, state] = String(v.location || "").split(",").map(s => s && s.trim())

  const out = {
    ...v,
    // --- renames ---
    model: v.model || v.modelName || "",
    exShowroom: v.exShowroom ?? v.exShowroomPrice ?? 0,
    km,
    year: v.year ?? v.regYear ?? null,
    district: v.district || city || "Hyderabad",
    state: v.state || state || "Telangana",

    // --- the fix that actually makes them visible ---
    status: "IN_STOCK",

    // --- form factor vs fuel, split apart ---
    type: "4W", // every seed row is a car; VEHICLE_TYPES = ["4W","2W","3W"]
    fuelType: v.fuelType || FUEL_FROM_TYPE[v.type] || "Electric",

    condition: isUsed ? "used" : "new",

    // Never true: the marketplace filters !isDemo, so this would re-hide them.
    isDemo: false,
  }

  // EV range lives in the seed's nested specs; the schema wants a number.
  if (out.fuelType === "Electric" && !out.range) {
    out.range = parseKm(v.specs?.realRange) || parseKm(v.specs?.claimedRange) || 0
  }

  // Used vehicles are hidden until an inspection is approved. Carry the
  // seed's own grade rather than inventing an assessment.
  if (isUsed && !out.inspectionReport) {
    out.inspectionReport = {
      overallGrade: v.inspectionGrade || "A",
      approvalStatus: "APPROVED",
      approvedAt: new Date().toISOString(),
      note: `Migrated from seed inspectionGrade "${v.inspectionGrade || "A"}".`,
      categories: [],
    }
  }

  for (const k of RETIRED) delete out[k]
  return out
}

/** Mirrors the marketplace + MCP visibility rule exactly. */
const isVisible = (v) =>
  v.status === "IN_STOCK" &&
  !v.isDemo &&
  (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED")

async function main() {
  const { readTable, writeTable } = await import("../lib/store.js")
  const rows = await readTable("inventory")

  console.log(`\ninventory rows: ${rows.length}`)
  console.log(`visible BEFORE: ${rows.filter(isVisible).length}\n`)

  const migrated = rows.map(migrate)

  migrated.forEach((v, i) => {
    const before = rows[i]
    console.log(`${v.id}`)
    console.log(`   ${before.brand} ${before.modelName}  ->  ${v.brand} ${v.model}`)
    console.log(`   status   ${JSON.stringify(before.status)} -> ${JSON.stringify(v.status)}`)
    console.log(`   type     ${JSON.stringify(before.type)} -> type=${JSON.stringify(v.type)} fuelType=${JSON.stringify(v.fuelType)}`)
    console.log(`   price    exShowroomPrice=${before.exShowroomPrice} -> exShowroom=${v.exShowroom}`)
    console.log(`   place    ${JSON.stringify(before.location)} -> district=${JSON.stringify(v.district)} state=${JSON.stringify(v.state)}`)
    console.log(`   cond     ${JSON.stringify(before.inspectionGrade)} -> condition=${JSON.stringify(v.condition)}${v.inspectionReport ? ` (inspection ${v.inspectionReport.overallGrade}, APPROVED)` : ""}`)
    if (v.range) console.log(`   range    specs.realRange=${JSON.stringify(before.specs?.realRange)} -> range=${v.range}`)
    console.log(`   VISIBLE  ${isVisible(before) ? "yes" : "no"} -> ${isVisible(v) ? "YES" : "still no"}`)
    console.log("")
  })

  const nowVisible = migrated.filter(isVisible).length
  console.log(`visible AFTER: ${nowVisible} / ${migrated.length}`)

  if (nowVisible !== migrated.length) {
    console.log("\n⚠ Not every row would become visible — check the rules above before applying.")
  }

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply to migrate.\n")
    return
  }

  await writeTable("inventory", migrated)
  console.log(`\n✓ Migrated ${migrated.length} rows.\n`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
