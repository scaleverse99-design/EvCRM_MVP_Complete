export const dynamic = "force-dynamic"

import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"
import { slugify } from "../../../../lib/blog"
import { pingIndexNow } from "../../../../lib/indexnow"

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

// GET — the caller dealer's own posts (all statuses)
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const all = await readTable("blog_posts")
  const mine = all.filter(p => p.dealership === user.dealership)
  mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return Response.json({ success: true, posts: mine })
}

// POST — create a post (draft or published)
export async function POST(req) {
  const user = await getUser(req)
  if (!user || !["dealer", "founder", "superadmin"].includes(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { title, excerpt, blogBody, matchModels, tags, coverEmoji, status } = body
  if (!title?.trim() || !blogBody?.trim()) {
    return Response.json({ error: "Title and body are required" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const published = status === "published"
  const post = {
    id: `blog_${Date.now()}`,
    slug: slugify(title),
    dealership: user.dealership,
    authorName: user.name || "Dealer",
    title: title.trim(),
    excerpt: (excerpt || "").trim(),
    body: blogBody.trim(),
    matchModels: (Array.isArray(matchModels) ? matchModels : []).filter(Boolean).slice(0, 3),
    tags: (Array.isArray(tags) ? tags : []).filter(Boolean).slice(0, 8),
    coverEmoji: coverEmoji || "🚗",
    status: published ? "published" : "draft",
    createdAt: now,
    updatedAt: now,
    publishedAt: published ? now : null,
  }

  const posts = await readTable("blog_posts")
  posts.unshift(post)
  await writeTable("blog_posts", posts)

  if (published) {
    pingIndexNow([`https://evcrm.in/blog/${post.slug}`, "https://evcrm.in/blog", "https://evcrm.in/sitemap.xml"])
  }

  return Response.json({ success: true, post })
}

// PATCH — edit or change publish status of an own post
export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, title, excerpt, blogBody, matchModels, tags, coverEmoji, status } = body
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  const posts = await readTable("blog_posts")
  const idx = posts.findIndex(p => p.id === id)
  if (idx === -1) return Response.json({ error: "Post not found" }, { status: 404 })
  if (user.role === "dealer" && posts[idx].dealership !== user.dealership) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const p = posts[idx]
  const wasPublished = p.status === "published"

  if (title !== undefined) p.title = String(title).trim()
  if (excerpt !== undefined) p.excerpt = String(excerpt).trim()
  if (blogBody !== undefined) p.body = String(blogBody).trim()
  if (matchModels !== undefined) p.matchModels = (Array.isArray(matchModels) ? matchModels : []).filter(Boolean).slice(0, 3)
  if (tags !== undefined) p.tags = (Array.isArray(tags) ? tags : []).filter(Boolean).slice(0, 8)
  if (coverEmoji !== undefined) p.coverEmoji = coverEmoji
  if (status !== undefined) {
    p.status = status === "published" ? "published" : "draft"
    if (p.status === "published" && !p.publishedAt) p.publishedAt = new Date().toISOString()
  }
  p.updatedAt = new Date().toISOString()
  posts[idx] = p
  await writeTable("blog_posts", posts)

  if (p.status === "published" || wasPublished) {
    pingIndexNow([`https://evcrm.in/blog/${p.slug}`, "https://evcrm.in/blog", "https://evcrm.in/sitemap.xml"])
  }

  return Response.json({ success: true, post: p })
}

// DELETE — remove an own post
export async function DELETE(req) {
  const user = await getUser(req)
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  let posts = await readTable("blog_posts")
  const target = posts.find(p => p.id === id)
  if (!target) return Response.json({ error: "Not found" }, { status: 404 })
  if (user.role === "dealer" && target.dealership !== user.dealership) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  posts = posts.filter(p => p.id !== id)
  await writeTable("blog_posts", posts)
  return Response.json({ success: true })
}
