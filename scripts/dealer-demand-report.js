// Turns recorded outbound clicks into the sentence you say on a dealer call.
//
//   node scripts/dealer-demand-report.js [days] [city]
//   node scripts/dealer-demand-report.js 30 Vijayawada
//
// The redirect strategy only pays off if the data comes back out in a form
// you can actually use in a conversation. Raw rows in Supabase are not that;
// "47 people in your city wanted a Nexon EV last month and all of them went
// to CarWale" is.
//
// Reads real rows and prints real counts. If the table is empty it says so
// rather than showing an illustrative example — a fabricated demand figure
// shown to a dealer would be found out on the first call, and it is the same
// class of mistake as the Math.random() VAHAN rows.
const fs = require("fs")
const path = require("path")

const envPath = path.join(__dirname, "..", ".env")
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const { createClient } = require("@supabase/supabase-js")

const DAYS = Number(process.argv[2] || 30)
const CITY = process.argv[3] || null

async function main() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const since = new Date(Date.now() - DAYS * 86400_000).toISOString()

  let q = sb.from("outbound_clicks").select("*").gte("clicked_at", since)
  if (CITY) q = q.ilike("city", CITY)
  const { data, error } = await q

  if (error) {
    console.error(`Could not read outbound_clicks: ${error.code} — ${error.message}`)
    console.error("Has lib/cte/outbound_clicks.sql been run in Supabase?")
    process.exit(1)
  }

  if (!data.length) {
    console.log(`No outbound clicks recorded in the last ${DAYS} days${CITY ? ` for ${CITY}` : ""}.`)
    console.log("Nothing to pitch yet — this is the honest answer, not a reason to estimate one.")
    return
  }

  const byCityModel = new Map()
  const byDestination = new Map()
  for (const r of data) {
    const key = `${r.city || "unknown city"}|${r.brand || ""} ${r.model || "unspecified"}`.trim()
    byCityModel.set(key, (byCityModel.get(key) || 0) + 1)
    byDestination.set(r.destination_host, (byDestination.get(r.destination_host) || 0) + 1)
  }

  console.log(`\nOutbound clicks, last ${DAYS} days${CITY ? ` — ${CITY}` : ""}: ${data.length} total\n`)

  console.log("Where that demand went:")
  for (const [host, n] of [...byDestination].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${host}`)
  }

  console.log("\nDemand by city and model — the dealer pitch:")
  const ranked = [...byCityModel].sort((a, b) => b[1] - a[1]).slice(0, 25)
  for (const [key, n] of ranked) {
    const [city, model] = key.split("|")
    console.log(`  ${String(n).padStart(5)}  ${city} — ${model}`)
  }

  const [topKey, topN] = ranked[0]
  const [topCity, topModel] = topKey.split("|")
  const topDest = [...byDestination].sort((a, b) => b[1] - a[1])[0][0]
  console.log(`\nSay this:\n  "In the last ${DAYS} days, ${topN} ${topN === 1 ? "person" : "people"} in ${topCity} came to us looking for a ${topModel}.`)
  console.log(`   We had no dealer there, so they went to ${topDest}. List with us and they come to you instead."\n`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
