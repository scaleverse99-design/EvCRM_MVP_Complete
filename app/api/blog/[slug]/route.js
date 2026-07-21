export const dynamic = "force-dynamic"

import { readTable } from "../../../../lib/store"

// Public GET — one published post by slug (model hub page), plus all linked
// vehicles sorted by distance to customer location (if lat/lng provided).
export async function GET(req, { params }) {
  const slug = params.slug
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get("lat") || "0")
  const lng = parseFloat(searchParams.get("lng") || "0")

  const posts = await readTable("blog_posts")
  const post = posts.find(p => p.slug === slug && p.status === "published" && p.type !== "knowledge")
  if (!post) return Response.json({ error: "Post not found" }, { status: 404 })

  // Fetch all vehicles linked to this article via article_vehicles junction table
  const links = await readTable("article_vehicles")
  const linkedVehicleIds = links
    .filter(l => l.articleId === post.id)
    .map(l => l.vehicleId)

  const inventory = await readTable("inventory")
  const users = await readTable("users")

  // Gather all linked vehicles + dealer info, filter by visibility rules
  let vehicles = inventory
    .filter(v =>
      linkedVehicleIds.includes(v.id) &&
      v.status === "IN_STOCK" &&
      (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED")
    )
    .map(v => {
      const dealer = users.find(u => u.dealership === v.dealership)
      return {
        ...v,
        dealerName: v.dealerName,
        dealerCity: dealer?.city || v.district || "India",
        dealerSubdomain: dealer?.dealerSubdomain || "",
        distance: lat && lng && dealer?.lat && dealer?.lng
          ? Math.sqrt(Math.pow(lat - dealer.lat, 2) + Math.pow(lng - dealer.lng, 2))
          : 999999 // default to end of sort if no coords
      }
    })

  // Sort by distance (nearest first), then by price (lowest first)
  vehicles.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance
    return (a.exShowroom || 0) - (b.exShowroom || 0)
  })

  return Response.json({
    success: true,
    post: {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      tags: post.tags,
      coverEmoji: post.coverEmoji,
      authorName: post.authorName,
      publishedAt: post.publishedAt || post.createdAt,
      modelKey: post.modelKey,
    },
    matchedVehicles: vehicles.slice(0, 50), // cap at 50 vehicles per article
  })
}
