export const dynamic = "force-dynamic"

import { readTable } from "../../../lib/store"

const CATEGORIES = ["EV Fundamentals", "ICE Fundamentals", "Buying Guides", "Tech Trends"]

// Public GET — published knowledge-hub articles, grouped by category.
// Separate content type from the per-model blog_posts (type:"knowledge"
// vs the default model-hub articles) sharing the same table/schema-free
// jsonb storage. Staggered rollout: an article only appears once its
// publishedAt has passed, even though its status is already "published" —
// this is what lets a batch be pre-generated but drip out N per day.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")

  const all = await readTable("blog_posts")
  const now = new Date()

  let articles = all.filter(p =>
    p.type === "knowledge" &&
    p.status === "published" &&
    new Date(p.publishedAt) <= now
  )

  if (category && CATEGORIES.includes(category)) {
    articles = articles.filter(p => p.category === category)
  }

  articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

  return Response.json({
    success: true,
    categories: CATEGORIES,
    articles: articles.map(p => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      coverEmoji: p.coverEmoji,
      publishedAt: p.publishedAt,
    })),
  })
}
