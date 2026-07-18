"use client"

import DealerStorefrontView from "../../components/storefront/DealerStorefrontView"

// Reached via middleware rewrite when the request's Host header is a real
// subdomain (ramdealers.evcrm.in) or a verified custom domain (ramdealers.in).
// Resolves the dealer from window.location.hostname (no override).
export default function DealerStorefront() {
  return <DealerStorefrontView />
}
