#!/usr/bin/env node
/**
 * One-time seed script: migrate all data from local /data/*.json files into Supabase.
 * Run this ONCE after configuring SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.js
 *
 * This script:
 * 1. Reads all JSON files from /data
 * 2. Imports rows into Supabase (one upsert per row to avoid duplicates)
 * 3. Reports success/failure per table
 */

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const DATA_DIR = path.join(process.cwd(), "data")

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars before running this script")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const TABLES = [
  "users", "sessions", "bookings", "leads", "quotes", "inventory",
  "customers", "tasks", "service_requests", "service_settings",
  "otps", "auth_logs", "dealers", "reps", "feed"
]

async function seedTable(tableName) {
  const file = path.join(DATA_DIR, `${tableName}.json`)
  if (!fs.existsSync(file)) {
    console.log(`⊘ ${tableName}: no JSON file found, skipping`)
    return { table: tableName, rows: 0, error: null }
  }

  let rows
  try {
    rows = JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (e) {
    return { table: tableName, rows: 0, error: `Parse error: ${e.message}` }
  }

  if (!Array.isArray(rows)) {
    return { table: tableName, rows: 0, error: "Not an array" }
  }

  if (rows.length === 0) {
    console.log(`⊘ ${tableName}: empty, skipping`)
    return { table: tableName, rows: 0, error: null }
  }

  // Insert rows as JSONB blobs: each row becomes { id: <unique>, data: <the object> }
  const toInsert = rows.map((data, i) => ({
    id: data.id || `${tableName}_${i}_${Date.now()}`,
    data: data,
  }))

  try {
    const { error } = await sb.from(tableName).upsert(toInsert, { onConflict: "id" })
    if (error) {
      return { table: tableName, rows: 0, error: error.message }
    }
    console.log(`✓ ${tableName}: seeded ${rows.length} rows`)
    return { table: tableName, rows: rows.length, error: null }
  } catch (e) {
    return { table: tableName, rows: 0, error: e.message }
  }
}

async function main() {
  console.log(`\n🌱 Seeding Supabase from /data/*.json\n`)
  const results = []
  for (const table of TABLES) {
    const result = await seedTable(table)
    results.push(result)
  }

  const totalRows = results.reduce((s, r) => s + r.rows, 0)
  const errors = results.filter(r => r.error)

  console.log(`\n✓ Seeded ${totalRows} total rows across ${results.filter(r => r.rows > 0).length} tables`)
  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} table(s) had errors:`)
    errors.forEach(r => console.log(`  ${r.table}: ${r.error}`))
  }

  console.log(`\n✓ Seed complete. Your Supabase is ready for production.\n`)
  process.exit(errors.length > 0 ? 1 : 0)
}

main()
