/**
 * Shared server-side loader for one Learn (knowledge) article + related posts.
 *
 * Same reason as lib/blogArticle.js: app/learn/[slug]/page.js was a client
 * component fetching in useEffect, so the article body only existed after
 * JavaScript ran and every article inherited the layout's generic <title>
 * (a client component cannot export generateMetadata). Loading server-side
 * is what lets the page emit real metadata, JSON-LD and rendered prose in
 * the HTML that crawlers actually receive.
 */

import { readTable } from "./store.js"

/**
 * @param {string} slug
 * @returns {Promise<{post, related}|null>} null when not found/unpublished
 */
export async function getLearnArticle(slug) {
  const all = await readTable("blog_posts")
  const now = new Date()

  const post = all.find(p =>
    p.slug === slug &&
    p.type === "knowledge" &&
    p.status === "published" &&
    new Date(p.publishedAt) <= now
  )
  if (!post) return null

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

  return {
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
  }
}
