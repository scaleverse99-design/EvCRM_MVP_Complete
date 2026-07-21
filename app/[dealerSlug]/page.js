import { readTable } from "../../lib/store"
import DealerStorefrontView from "../../components/storefront/DealerStorefrontView"

// Path-based dealer storefront: evcrm.in/{slug} — the free tier of the
// subdomain/custom-domain feature. Exists specifically so a dealer's
// storefront works immediately at registration without any DNS setup
// (unlike {slug}.evcrm.in, which needs a wildcard DNS record in Cloudflare
// that isn't configured yet). Next.js always matches a static route (e.g.
// /login, /showroom) before falling through to this dynamic segment, so
// real app pages are never shadowed — see RESERVED_SLUGS in
// app/api/register/route.js, which stops new dealers from ever being
// assigned a slug that collides with one.

// Per-dealer Open Graph metadata — same reasoning as /showroom's
// generateMetadata: link-preview crawlers (WhatsApp/Facebook/Google) never
// run client JS, so without server-side metadata every dealer's storefront
// share looked identical (the generic homepage card) regardless of which
// dealer's link was actually shared.
export async function generateMetadata({ params }) {
  try {
    const users = await readTable("users")
    const dealer = users.find(u => u.dealerSubdomain?.toLowerCase() === params.dealerSlug?.toLowerCase() && u.role === "dealer")
    if (!dealer) return {}

    const inventory = await readTable("inventory")
    const count = inventory.filter(v => v.dealership === dealer.dealership && v.status === "IN_STOCK").length

    const title = `${dealer.dealershipName} — ${dealer.dealerCategory === "ICE" ? "Used Cars" : "EVs"} in ${dealer.city || "India"} | EV.CRM`
    const description = `Browse ${count} vehicle${count === 1 ? "" : "s"} from ${dealer.dealershipName}. Verified dealer on EV.CRM.`

    return {
      title,
      description,
      openGraph: { title, description, url: `https://evcrm.in/${params.dealerSlug}`, type: "website" },
      twitter: { card: "summary_large_image", title, description },
    }
  } catch {
    return {}
  }
}

export default function DealerSlugPage({ params }) {
  return <DealerStorefrontView domainOverride={`${params.dealerSlug}.evcrm.in`} />
}
