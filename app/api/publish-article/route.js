export const dynamic = "force-dynamic"

import { readTable, writeTable } from "../../../lib/store"
import { pingIndexNow } from "../../../lib/indexnow"
import { slugify } from "../../../lib/blog"
import { requireOrchestratorAuth } from "../../../lib/orchestrator/auth"

// POST /api/publish-article
// Manual/external publisher — for when you want to push a fully-written
// article straight into blog_posts without running the orchestrator's
// discover→research→write chain. Same auth as the orchestrator (shared
// INTERNAL_API_SECRET) so a random visitor can't inject content.
//
// Deliberately writes into blog_posts with type="news" — the site reads
// from blog_posts, not from a separate "articles" table. Antigravity's
// earlier version pointed at a nonexistent "articles" table, so every
// article it published was invisible to /blog, /learn, and the MCP server.
//
// Body: { title, slug?, description?, content, category?, coverEmoji?,
//         sourceUrl?, seoKeywords? }
export async function POST(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { title, content, category = "cars" } = body
  if (!title || !content) {
    return Response.json({ error: "Missing required fields: title, content" }, { status: 400 })
  }

  const slug = body.slug || slugify(title)
  const nowIso = new Date().toISOString()

  const article = {
    id: `blog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    slug,
    type: "news",
    category,
    authorName: body.authorName || "EvCRM Newsroom",
    title,
    excerpt: body.description || body.excerpt || "",
    body: content,
    coverEmoji: body.coverEmoji || "🚗",
    seoKeywords: Array.isArray(body.seoKeywords) ? body.seoKeywords.slice(0, 10) : [],
    sourceUrl: body.sourceUrl || body.source_url || null,
    status: "published",
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: nowIso,
  }

  try {
    const posts = await readTable("blog_posts")
    posts.unshift(article)
    await writeTable("blog_posts", posts)
  } catch (e) {
    console.error("[api/publish-article] persist failed:", e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }

  try {
    pingIndexNow([
      `https://evcrm.in/blog/${slug}`,
      "https://evcrm.in/blog",
      "https://evcrm.in/sitemap.xml",
    ])
  } catch { /* ignore */ }

  return Response.json({
    success: true,
    slug,
    url: `https://evcrm.in/blog/${slug}`,
    message: "Article published to blog_posts",
  })
}
