export const dynamic = "force-dynamic"

import { readTable } from "../../../lib/store"

// Public GET — published posts only, newest first, no bodies (list view).
export async function GET() {
  const all = await readTable("blog_posts")
  const published = all
    .filter(p => p.status === "published" && p.type !== "knowledge")
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
    .map(p => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      tags: p.tags,
      coverEmoji: p.coverEmoji,
      authorName: p.authorName,
      publishedAt: p.publishedAt || p.createdAt,
    }))
  return Response.json({ success: true, posts: published })
}
