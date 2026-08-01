/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Legacy routes flagged in Google Search Console (301 Permanent Redirect to active features)
      { source: "/shortlisted", destination: "/mygarage", permanent: true },
      { source: "/pricing", destination: "/showroom", permanent: true },
      { source: "/vehicles", destination: "/showroom", permanent: true },

      // 2026-07-31: near-duplicate news articles (same real-world event,
      // discovered + written on separate orchestrator runs before
      // lib/orchestrator/discover.js's dedupe was strengthened — see
      // CTE_BUILD_PLAN.md / a live AdSense "low value content" policy flag
      // that caught this). Redirecting instead of deleting preserves any
      // link/index value the older URL accrued.
      { source: "/blog/india-s-ev-charging-stations-surpass-52-000-a-buyer-s-guide-g2b20", destination: "/blog/india-crosses-52-000-public-ev-charging-stations-what-it-mea-tuj7u", permanent: true },
      { source: "/blog/india-s-ev-charging-network-surges-past-52-700-stations-ne5vb", destination: "/blog/india-crosses-52-000-public-ev-charging-stations-what-it-mea-tuj7u", permanent: true },
      { source: "/blog/delhi-ev-policy-2026-incentives-ban-on-ice-vehicles-set-to-t-65wdg", destination: "/blog/delhi-ev-policy-2026-why-electric-two-wheelers-are-set-for-m-g2xxv", permanent: true },
      { source: "/blog/kia-syros-ev-bookings-open-for-july-23-launch-up-to-526-km-r-iulz2", destination: "/blog/kia-syros-ev-launched-prices-revealed-bookings-deliveries-op-a32h4", permanent: true },
      { source: "/blog/maruti-suzuki-announces-second-price-hike-in-three-months-7kkld", destination: "/blog/maruti-suzuki-car-prices-to-rise-by-up-to-rs-30-000-from-aug-apcxf", permanent: true },
    ]
  },
}

module.exports = nextConfig
