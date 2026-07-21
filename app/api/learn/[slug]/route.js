export const dynamic = "force-dynamic"

import { readTable } from "../../../../lib/store"

// Public GET — one published knowledge article, plus a few related articles
// from the same category (keeps readers moving through the hub instead of
// bouncing after one page — same logic every content site uses).
export async function GET(req, { params }) {
  const slug = params.slug
  const all = await readTable("blog_posts")
  const now = new Date()

  const post = all.find(p =>
    p.slug === slug &&
    p.type === "knowledge" &&
    p.status === "published" &&
    new Date(p.publishedAt) <= now
  )
  if (!post) return Response.json({ error: "Article not found" }, { status: 404 })

  const related = all
    .filter(p =>
      p.type === "knowledge" &&
      p.status === "published" &&
      p.slug !== slug &&
      p.category === post.category &&
      new Date(p.publishedAt) <= now
    )
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 4)
    .map(p => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, coverEmoji: p.coverEmoji }))

  return Response.json({
    success: true,
    post: {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      coverEmoji: post.coverEmoji,
      authorName: post.authorName,
      publishedAt: post.publishedAt,
      keyTakeaways: post.keyTakeaways || [],
      pullQuote: post.pullQuote || "",
      comparisonTable: post.comparisonTable || null,
    },
    related,
  })
}
