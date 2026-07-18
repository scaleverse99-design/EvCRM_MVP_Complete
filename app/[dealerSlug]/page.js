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
export default function DealerSlugPage({ params }) {
  return <DealerStorefrontView domainOverride={`${params.dealerSlug}.evcrm.in`} />
}
