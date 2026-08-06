/**
 * Source adapter: data.gov.in (Government of India open data portal).
 *
 * DETERMINISTIC. No LLM anywhere in this file. Fetches official e-VAHAN
 * datasets, maps their rows onto CTE's common fact shape, and returns
 * them. Same input always produces the same output, and nothing is ever
 * inferred — a field that isn't in the source row is left out, not
 * guessed.
 *
 * This is what CTE was supposed to be: crawl → clean → store → serve,
 * with the expensive work done ahead of time so the MCP server hands
 * back a verified fact at zero marginal cost.
 *
 * Verified against the live API 2026-08-06 with the key in .env:
 *   - /lists?filters[title]=vahan returns 9 real e-VAHAN datasets
 *   - resource rows are clean and structured, e.g.
 *     { state_name: "Andhra Pradesh", electric_vehicle_count: 51322 }
 *
 * KNOWN GRANULARITY LIMIT, stated honestly so nobody builds on a wrong
 * assumption: these are state-level and year-level aggregates published
 * as parliamentary answers. They answer "how many EVs are registered in
 * Telangana" and "EV registrations by year". They do NOT contain
 * model-level or month-level data, so they cannot answer "Nexon EV
 * monthly average" — a different source is needed for that.
 */

const API_BASE = "https://api.data.gov.in"
const SOURCE_NAME = "data.gov.in (e-VAHAN, Ministry of Road Transport & Highways)"

// Each entry maps one real dataset to how its rows should be read. Resource
// ids and field names were read off the live API, not assumed — adding a
// new dataset means probing it first and writing its mapping here, which
// is exactly the deterministic contract: no parser runs against a shape
// nobody has looked at.
export const DATASETS = [
  {
    resourceId: "3382eae5-e6fd-4e45-be4b-520b3bd0c76d",
    title: "State/UT-wise registered electric vehicles (e-VAHAN)",
    // The source title carries the as-of date; there is no per-row date
    // field, so the period is a property of the dataset, not the row.
    period: "as of 2023-03-06",
    geographyField: "state_name",
    unit: "vehicles",
    // One column -> one metric. A dataset with several numeric columns
    // declares one entry per column, so each becomes its own fact with
    // its own scope rather than being collapsed into an ambiguous total.
    values: [
      { field: "electric_vehicle_count", metric: "ev_registrations_total", scope: "all electric vehicles" },
    ],
  },
  {
    resourceId: "3385b910-9ed9-4b5b-9008-0cc36c73235f",
    title: "State/UT-wise electric buses (e-VAHAN)",
    period: "as of 2024-11-22",
    geographyField: "state_ut",
    unit: "vehicles",
    // Field names read off the live API response 2026-08-06 — this
    // dataset separates pure-electric from strong-hybrid, and conflating
    // them (or silently taking `_total`) would misreport what "electric
    // bus" means. Each is kept as its own fact with an explicit scope.
    values: [
      { field: "pure_electric_buses", metric: "electric_bus_count", scope: "pure electric buses" },
      { field: "strong_hybrid_electric_buses", metric: "electric_bus_count", scope: "strong hybrid electric buses" },
      { field: "_total", metric: "electric_bus_count", scope: "pure electric + strong hybrid combined" },
    ],
  },
]

function apiKey() {
  const key = process.env.DATA_GOV_IN_API_KEY
  if (!key) throw new Error("DATA_GOV_IN_API_KEY not set — register a free key at data.gov.in (My Account → Generate Key)")
  return key
}

async function fetchResource(resourceId, limit = 1000) {
  const url = `${API_BASE}/resource/${resourceId}?api-key=${apiKey()}&format=json&limit=${limit}`
  const res = await fetch(url, { headers: { "User-Agent": "EvCRM-CTE/1.0 (+https://evcrm.in)" } })
  if (!res.ok) throw new Error(`data.gov.in returned HTTP ${res.status} for ${resourceId}`)
  const json = await res.json()
  if (json.status && json.status !== "ok") throw new Error(`data.gov.in status: ${json.status}`)
  return json
}

function toNumber(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  if (typeof raw !== "string") return null
  const cleaned = raw.replace(/,/g, "").trim()
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Fetches every configured dataset and returns raw CTE facts.
 * Throws only on a missing key; individual dataset failures are collected
 * and reported so one bad dataset never kills a whole ingest run.
 */
export async function fetchDataGovInFacts() {
  const facts = []
  const errors = []
  const fetchedAt = new Date().toISOString()

  for (const ds of DATASETS) {
    try {
      const json = await fetchResource(ds.resourceId)
      const records = json.records || []
      const availableFields = new Set((json.field || []).map(f => f.id))

      // Fail loudly if the portal changed a column name out from under a
      // mapping — silently emitting nothing would look like "no data"
      // rather than "this adapter needs updating".
      const missing = ds.values.map(v => v.field).filter(f => !availableFields.has(f))
      if (missing.length) {
        errors.push({ resourceId: ds.resourceId, error: `mapped field(s) not present in response: ${missing.join(", ")}; available: ${[...availableFields].join(", ")}` })
        continue
      }
      if (!availableFields.has(ds.geographyField)) {
        errors.push({ resourceId: ds.resourceId, error: `geography field "${ds.geographyField}" not in response; available: ${[...availableFields].join(", ")}` })
        continue
      }

      for (const row of records) {
        const geography = String(row[ds.geographyField] || "").trim()
        if (!geography) continue

        for (const v of ds.values) {
          const value = toNumber(row[v.field])
          // A cell we can't read cleanly is dropped, never estimated.
          if (value === null) continue

          facts.push({
            metric: v.metric,
            value,
            unit: ds.unit,
            period: ds.period,
            geography,
            scope: v.scope,
            sourceName: SOURCE_NAME,
            sourceUrl: `https://data.gov.in/resource/${ds.resourceId}`,
            sourceDatasetId: ds.resourceId,
            sourceDatasetTitle: ds.title,
            fetchedAt,
          })
        }
      }
    } catch (e) {
      errors.push({ resourceId: ds.resourceId, error: e.message })
    }
  }

  return { facts, errors }
}
