/**
 * 🧹 EvCRM Blog Post Deduplication Tool
 * Deduplicates blog_posts in Supabase by slug and title.
 */

import { readTable, writeTable } from "../lib/store.js"

async function main() {
  console.log("🔍 Reading blog posts from Supabase database for deduplication...")

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables required.")
    process.exit(1)
  }

  const posts = await readTable("blog_posts")
  console.log(`Initial total posts in database: ${posts.length}`)

  const uniqueMap = new Map()
  const cleanPosts = []

  for (const post of posts) {
    const key = (post.slug || post.title || "").toLowerCase().trim()
    if (!key) continue

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, true)
      cleanPosts.push(post)
    }
  }

  console.log(`Unique articles after deduplication: ${cleanPosts.length}`)
  console.log(`Removing ${posts.length - cleanPosts.length} duplicate entries...`)

  await writeTable("blog_posts", cleanPosts)
  console.log("✅ Supabase blog_posts table successfully deduplicated!")
}

main().catch(console.error)
