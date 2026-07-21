import { readTable } from "../lib/store"

// Dynamic sitemap — the foundation of the free-traffic hub model: every
// external channel (Google, Bing/IndexNow, GBP, WhatsApp shares) publishes
// evcrm.in URLs only, so all discovery traffic lands on the main site
// first and is routed onward to dealer storefronts from here. This sitemap
// therefore lists every live vehicle listing and every dealer storefront
// slug, not just the static pages — new inventory becomes crawlable as
// soon as the sitemap is re-fetched.
export const dynamic = "force-dynamic"

export default async function sitemap() {
  const baseUrl = "https://evcrm.in"
  const now = new Date().toISOString()

  const staticRoutes = [
    "",
    "/showroom",
    "/blog",
    "/learn",
    "/charging",
    "/service-centers",
    "/subsidies",
    "/news",
    "/login",
    "/register",
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: route === "" || route === "/showroom" ? 1.0 : 0.6,
  }))

  let vehicleRoutes = []
  let dealerRoutes = []
  let blogRoutes = []
  let learnRoutes = []
  try {
    const [inventory, users, blogPosts] = await Promise.all([readTable("inventory"), readTable("users"), readTable("blog_posts").catch(() => [])])

    // Same visibility rule as /api/marketplace/vehicles: IN_STOCK, and used
    // vehicles only once their inspection report is dealer-approved.
    vehicleRoutes = inventory
      .filter(v => v.status === "IN_STOCK" && (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED"))
      .map(v => ({
        url: `${baseUrl}/showroom?vehicleId=${v.id}`,
        lastModified: v.updatedAt || v.createdAt || now,
        changeFrequency: "daily",
        priority: 0.8,
      }))

    dealerRoutes = users
      .filter(u => u.role === "dealer" && u.is_active !== false && u.dealerSubdomain)
      .map(u => ({
        url: `${baseUrl}/${u.dealerSubdomain}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      }))

    blogRoutes = (blogPosts || [])
      .filter(p => p.status === "published" && p.type !== "knowledge")
      .map(p => ({
        url: `${baseUrl}/blog/${p.slug}`,
        lastModified: p.updatedAt || p.publishedAt || now,
        changeFrequency: "weekly",
        priority: 0.75,
      }))

    // Knowledge-hub articles roll out staggered (a few per day) — only
    // advertise ones whose publishedAt has actually passed, so the sitemap
    // never points a crawler at a page that still 404s.
    learnRoutes = (blogPosts || [])
      .filter(p => p.status === "published" && p.type === "knowledge" && new Date(p.publishedAt) <= new Date(now))
      .map(p => ({
        url: `${baseUrl}/learn/${p.slug}`,
        lastModified: p.updatedAt || p.publishedAt || now,
        changeFrequency: "monthly",
        priority: 0.7,
      }))
  } catch (e) {
    // A data-layer hiccup should degrade to the static sitemap, not a 500 —
    // Google treats a failing sitemap worse than a smaller one.
    console.error("[sitemap] dynamic section failed:", e.message)
  }

  return [...staticRoutes, ...vehicleRoutes, ...dealerRoutes, ...blogRoutes, ...learnRoutes]
}
