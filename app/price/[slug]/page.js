// SERVER component — exists solely to give each of the 1,344 /price/ URLs a
// real <title> and description.
//
// Unlike /blog and /learn, this route's BODY was already server-rendered:
// it computes from lib/masterCatalog synchronously with no useEffect fetch,
// and a client component's markup is still rendered on the server. The one
// thing it could not do was export generateMetadata (client components
// can't), so all 1,344 pages were served under the layout's generic
// "EV.CRM — India's Premier EV Sales OS" title — competing with each other
// for every city+model query instead of ranking for their own.
//
// The interactive view stays a client component in PriceView.js.

import PriceView from "./PriceView"
import { calculateOnRoadPrice, resolveCityPriceSlug } from "../../../lib/masterCatalog"
import { fmt } from "../../../lib/constants"

const SITE = "https://evcrm.in"

export async function generateMetadata({ params }) {
  const { model, city } = resolveCityPriceSlug(params.slug)
  const price = calculateOnRoadPrice(model, city)
  const url = `${SITE}/price/${params.slug}`

  // fmt is an object of formatters (fmt.currency), not a callable.
  const title = `${model.name} On-Road Price in ${city.name} (${new Date().getFullYear()})`
  const description =
    `${model.name} on-road price in ${city.name}: ${fmt.currency(price.netOnRoadPrice)} including RTO, ` +
    `insurance and charges. Ex-showroom ${fmt.currency(price.exShowroom)}. Compare variants and book a test drive.`

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, siteName: "EvCRM" },
    twitter: { card: "summary", title, description },
  }
}

export default function CityPricePage() {
  return <PriceView />
}
