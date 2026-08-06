export const dynamic = "force-dynamic"

import { getBlogArticle } from "../../../../lib/blogArticle.js"

// Public GET — one published post by slug (model hub page), plus all linked
// vehicles sorted by distance to customer location (if lat/lng provided).
//
// The loading logic lives in lib/blogArticle.js because app/blog/[slug]/page.js
// (a server component) needs the same data to server-render the article and
// emit real per-article metadata. Two copies would drift.
export async function GET(req, { params }) {
  const { searchParams } = new URL(req.url)
  const data = await getBlogArticle(params.slug, {
    lat: parseFloat(searchParams.get("lat") || "0"),
    lng: parseFloat(searchParams.get("lng") || "0"),
  })

  if (!data) return Response.json({ error: "Post not found" }, { status: 404 })

  return Response.json({ success: true, ...data })
}
