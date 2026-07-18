import { redirect } from "next/navigation"

// The dark "/buy-vehicles" marketplace has been retired in favour of the
// canonical light showroom (rendered at "/" and "/showroom"). This route now
// permanently redirects so any old bookmark, external link, or cached page
// lands on the one real marketplace. Preserves the ?tag=/?type= etc. query so
// deep links keep working. The previous dark UI lives in git history if needed.
export default function BuyVehiclesRedirect({ searchParams }) {
  const qs = new URLSearchParams(searchParams || {}).toString()
  redirect(qs ? `/showroom?${qs}` : "/showroom")
}
