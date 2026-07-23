#!/usr/bin/env node

/**
 * Embeds the interactive [widget:transmission] tag into published Knowledge
 * Hub articles that are about car transmissions (the DCT explainer + any
 * "transmission types" article). The /learn renderer swaps that tag for the
 * live TransmissionWidget (Manual/Auto/DCT/CVT animation) — this is what turns
 * a text explainer into an interactive page users spend time on.
 *
 * Safe + idempotent: skips any article that already has the tag, only touches
 * articles whose title/slug clearly names a transmission topic, and updates
 * just those rows (never a whole-table rewrite).
 *
 * Usage:  node scripts/embed-transmission-widget.js         (dry run — lists matches)
 *         node scripts/embed-transmission-widget.js --apply (writes changes)
 */

import fs from "fs"
import { createClient } from "@supabase/supabase-js"

// Minimal .env loader (these scripts don't use dotenv).
function loadEnv() {
  for (const f of [".env", ".env.production", ".env.local"]) {
    try {
      for (const line of fs.readFileSync(f, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
      }
    } catch { /* file may not exist */ }
  }
}
loadEnv()

const SUPABASE_URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !KEY) { console.error("❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1) }

const APPLY = process.argv.includes("--apply")
const sb = createClient(SUPABASE_URL, KEY)

// A transmission article — title or slug mentions the gearbox topic.
const isTransmissionTopic = (a) => {
  const s = `${a.title || ""} ${a.slug || ""}`.toLowerCase()
  return /transmission|gearbox|\bdct\b|dual[- ]?clutch|\bamt\b|\bcvt\b|manual.*(auto|gear)|automatic.*gear/.test(s)
}

const WIDGET = "[widget:transmission]"

function insertWidget(body) {
  const blocks = (body || "").split(/\n\n+/)
  let at = blocks.findIndex(b => !b.trim().startsWith("## "))
  if (at === -1) at = 0
  blocks.splice(at + 1, 0, WIDGET)
  return blocks.join("\n\n")
}

async function run() {
  const { data, error } = await sb.from("blog_posts").select("id, data")
  if (error) { console.error("❌", error.message); process.exit(1) }

  const candidates = data
    .map(r => ({ id: r.id, a: r.data }))
    .filter(({ a }) => a.type === "knowledge" && isTransmissionTopic(a))

  console.log(`Found ${candidates.length} transmission article(s):\n`)
  let changed = 0, skipped = 0

  for (const { id, a } of candidates) {
    const already = (a.body || "").includes(WIDGET)
    console.log(`  ${already ? "⏭  has widget" : APPLY ? "✏️  embedding" : "•  would embed"} — ${a.title}  (/learn/${a.slug})`)
    if (already) { skipped++; continue }
    if (!APPLY) continue

    const updated = { ...a, body: insertWidget(a.body), updatedAt: new Date().toISOString() }
    const { error: upErr } = await sb.from("blog_posts").update({ data: updated }).eq("id", id)
    if (upErr) { console.log(`     ❌ ${upErr.message}`); continue }
    changed++
  }

  console.log(`\n${APPLY ? "✅ Applied" : "🔍 Dry run"} — ${changed} embedded, ${skipped} already had it.`)
  if (!APPLY) console.log("Re-run with --apply to write changes.")
}

run()
