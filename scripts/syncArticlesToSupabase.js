/**
 * 📄 EvCRM Blog Sync Tool
 * Syncs the 141 local formatted articles from data/blog_posts.json directly to Supabase production table.
 */

import { readTable, writeTable } from "../lib/store.js"

// Import the local json file
import fs from "fs"
import path from "path"

const localPostsPath = path.join(process.cwd(), "data", "blog_posts.json")
const localPosts = JSON.parse(fs.readFileSync(localPostsPath, "utf8"))

async function main() {
  console.log(`Loaded ${localPosts.length} formatted articles from local JSON file.`)
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be loaded!")
    process.exit(1)
  }

  console.log("Writing formatted articles directly to Supabase table 'blog_posts'...")
  await writeTable("blog_posts", localPosts)
  console.log("✅ Successfully synced articles database to Supabase production!")
}

main().catch(console.error)
