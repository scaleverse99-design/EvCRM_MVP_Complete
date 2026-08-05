/**
 * 🛠️ Set status: "published" for all 158 articles in Supabase
 */

import { readTable, writeTable } from "../lib/store.js"

async function main() {
  console.log("🔍 Fetching all articles from Supabase to mark as published...")

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.")
    process.exit(1)
  }

  const posts = await readTable("blog_posts")
  console.log(`Total posts found: ${posts.length}`)

  const updatedPosts = posts.map(p => ({
    ...p,
    status: "published"
  }))

  await writeTable("blog_posts", updatedPosts)
  console.log(`✅ All ${updatedPosts.length} articles marked as status: "published" in Supabase!`)
}

main().catch(console.error)
