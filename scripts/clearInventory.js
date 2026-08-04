/**
 * 🧹 EvCRM Inventory Wipe Script
 * Completely empties the inventory table in local store & Supabase
 */
import { writeTable } from "../lib/store.js"
import fs from "fs"
import path from "path"

async function main() {
  console.log("Wiping all inventory records from database...")
  
  // 1. Wipe local json
  const localPath = path.join(process.cwd(), "data", "inventory.json")
  fs.writeFileSync(localPath, JSON.stringify([], null, 2), "utf8")
  console.log("✅ Local data/inventory.json cleared.")

  // 2. Wipe Supabase table if keys are present
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await writeTable("inventory", [])
    console.log("✅ Supabase production inventory table cleared!")
  }
}

main().catch(console.error)
