// Purges the Cloudflare cache for evcrm.in after a deploy, so the new build
// is visible immediately without a manual dashboard purge. Safe to run even
// after the Cache Rule (bypass HTML, cache only /_next/static/*) is in place —
// this is just a backup in case that rule is ever removed or misconfigured.
const fs = require("fs")
const path = require("path")

function loadEnv(file) {
  const env = {}
  const filePath = path.join(__dirname, "..", file)
  if (!fs.existsSync(filePath)) return env
  fs.readFileSync(filePath, "utf8").split(/\r?\n/).forEach(line => {
    const m = line.match(/^([A-Z_]+)=\"?([^\"]*)\"?$/)
    if (m) env[m[1]] = m[2]
  })
  return env
}

async function main() {
  const env = loadEnv(".env.production")
  const token = env.CLOUDFLARE_API_TOKEN
  const zoneId = env.CLOUDFLARE_ZONE_ID

  if (!token || !zoneId) {
    console.log("[cloudflare-purge] CLOUDFLARE_API_TOKEN/ZONE_ID not set in .env.production — skipping purge (safe to ignore if you purge manually or rely on the Cache Rule).")
    return
  }

  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ purge_everything: true }),
  })
  const data = await res.json()
  if (data.success) {
    console.log("[cloudflare-purge] Cache purged successfully.")
  } else {
    console.error("[cloudflare-purge] Purge failed:", JSON.stringify(data.errors))
  }
}

main().catch(err => console.error("[cloudflare-purge] Error:", err.message))
