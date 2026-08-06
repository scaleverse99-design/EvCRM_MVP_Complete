export const dynamic = "force-dynamic"

import { getLearnArticle } from "../../../../lib/learnArticle.js"

// Public GET — one published knowledge article, plus a few related articles
// from the same category (keeps readers moving through the hub instead of
// bouncing after one page — same logic every content site uses).
//
// Loading lives in lib/learnArticle.js because app/learn/[slug]/page.js (a
// server component) needs the same data to server-render the article and emit
// real per-article metadata. Two copies would drift.
export async function GET(req, { params }) {
  const data = await getLearnArticle(params.slug)
  if (!data) return Response.json({ error: "Article not found" }, { status: 404 })
  return Response.json({ success: true, ...data })
}
