/**
 * Shared server-side loader for one blog article + its linked inventory.
 *
 * Extracted 2026-08-06 so the page (server component) and the public API
 * route read through ONE implementation. Before this, only the API route
 * could load an article, which forced app/blog/[slug]/page.js to fetch in
 * useEffect — meaning the article body existed only after JavaScript ran.
 *
 * ── Why that mattered more than it sounds ────────────────────────────
 * Measured live 2026-08-06 against evcrm.in as OAI-SearchBot: an article
 * page served 10,918 bytes of HTML containing 73 bytes of visible text
 * ("Loading…") — a 0.7% signal ratio, with the article's own words absent
 * entirely and the generic site <title> in place of the article's. Most AI
 * crawlers do not execute JavaScript, so every published article was
 * effectively invisible to them; and because a client component cannot
 * export generateMetadata, all ~150 articles shared one <title>, which is
 * why Search Console only ever showed navigational queries.
 *
 * Loading here (server-side) is what lets page.js emit real metadata,
 * real JSON-LD, and fully-rendered prose in the initial HTML.
 */

import { readTable } from "./store.js"
import { resolveVehiclePurchaseOptions } from "./affiliateRouter.js"

/**
 * @param {string} slug
 * @param {{lat?: number, lng?: number}} [opts] customer coords for distance sort
 * @returns {Promise<{post, matchedVehicles, purchaseOptions}|null>} null when not found
 */
export async function getBlogArticle(slug, opts = {}) {
  const lat = Number(opts.lat) || 0
  const lng = Number(opts.lng) || 0

  const posts = await readTable("blog_posts")
  const post = posts.find(p => p.slug === slug && p.status === "published" && p.type !== "knowledge")
  if (!post) return null

  const links = await readTable("article_vehicles")
  const linkedVehicleIds = links.filter(l => l.articleId === post.id).map(l => l.vehicleId)

  const [inventory, users] = await Promise.all([readTable("inventory"), readTable("users")])

  const vehicles = inventory
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
          : 999999, // no coords → sort to the end
      }
    })

  vehicles.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance
    return (a.exShowroom || 0) - (b.exShowroom || 0)
  })

  const brandName = post.tags?.[0] || post.title.split(" ")[0] || "Tata"
  const modelName = post.tags?.[1] || post.title.split(" ")[1] || "Nexon EV"
  const purchaseOptions = await resolveVehiclePurchaseOptions(brandName, modelName)

  return {
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
      keyTakeaways: post.keyTakeaways || [],
      pullQuote: post.pullQuote || "",
      comparisonTable: post.comparisonTable || null,
      images: Array.isArray(post.images) ? post.images : [],
    },
    matchedVehicles: vehicles.slice(0, 50),
    purchaseOptions,
  }
}
