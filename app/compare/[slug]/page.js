// SERVER component — gives each of the 43 comparison pages its own title.
//
// The body already server-rendered (it computes from lib/masterCatalog
// synchronously, and Next renders client components on the server too). The
// one thing a client component cannot do is export generateMetadata, so all
// 43 shipped the layout's generic "EV.CRM — India's Premier EV Sales OS".
// A site audit on 2026-08-07 found 48 pages sharing that one title; Google
// treats identically-titled pages as duplicates and ranks one at most.
//
// "X vs Y" is high commercial intent and among the most valuable queries
// this site could hold, so these were the costliest pages to leave untitled.

import CompareView from "./CompareView"
import { resolveComparisonSlug } from "../../../lib/masterCatalog"

const SITE = "https://evcrm.in"

export async function generateMetadata({ params }) {
  const { modelA, modelB } = resolveComparisonSlug(params.slug)
  const year = new Date().getFullYear()
  const url = `${SITE}/compare/${params.slug}`

  const title = `${modelA.name} vs ${modelB.name}: Price, Range & Specs Compared (${year})`
  const description =
    `Compare ${modelA.name} and ${modelB.name} side by side — on-road price, real-world range, ` +
    `battery, charging time and features. Find which suits you and book a test drive with a verified dealer.`

  return {
    title,
    description: description.slice(0, 300),
    keywords: `${modelA.name} vs ${modelB.name}, ${modelA.name} comparison, ${modelB.name} comparison`,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, siteName: "EvCRM" },
    twitter: { card: "summary", title, description },
  }
}

export default function ComparePage() {
  return <CompareView />
}
