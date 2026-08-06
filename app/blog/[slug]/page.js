// SERVER component. Loads the article server-side so three things end up in
// the HTML that crawlers actually receive:
//
//   1. real per-article <title> / <meta description> / OG tags (generateMetadata)
//   2. Article JSON-LD
//   3. the article prose itself, fully rendered
//
// ── What this replaced, measured live 2026-08-06 as OAI-SearchBot ─────
// evcrm.in/blog/aston-martin-… returned 10,918 bytes of HTML holding 73
// bytes of visible text ("Loading…") — a 0.7% signal ratio. The word
// "Aston" appeared nowhere in the response, there was no ld+json, and the
// <title> was the generic site-wide "EV.CRM — India's Premier EV Sales OS".
// Cause: the page was a client component fetching in useEffect, and a client
// component cannot export generateMetadata, so all ~150 articles shared one
// title. That is why ai_search_bot_hits sat at 0 and Search Console showed
// only navigational queries — there were no article pages for anything to
// rank or cite.
//
// ArticleView stays a client component for the interactive children
// (SmartBuyWidget, LiveVisitorBadge). Receiving data as props is what lets
// Next.js server-render it — "use client" marks the hydration boundary, it
// does not opt out of SSR.

import { notFound } from "next/navigation"
import { getBlogArticle } from "../../../lib/blogArticle.js"
import ArticleView from "./ArticleView"

export const dynamic = "force-dynamic"

const SITE = "https://evcrm.in"

export async function generateMetadata({ params }) {
  const data = await getBlogArticle(params.slug).catch(() => null)
  if (!data) return { title: "Article not found — EvCRM" }

  const { post } = data
  const url = `${SITE}/blog/${post.slug}`
  const description = (post.excerpt || "").slice(0, 160)
  const ogImage = post.images?.[0]?.url

  return {
    title: post.title,
    description,
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url,
      siteName: "EvCRM",
      publishedTime: post.publishedAt,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: post.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function BlogPostPage({ params }) {
  const data = await getBlogArticle(params.slug)
  if (!data) notFound()

  const { post, matchedVehicles, purchaseOptions } = data

  // Emitted from the server so it's in the served HTML. Previously this lived
  // in the client component, which meant it only ever existed post-hydration.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: post.authorName || "EvCRM" },
    publisher: { "@type": "Organization", name: "EvCRM", url: SITE },
    datePublished: post.publishedAt,
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleView post={post} vehicles={matchedVehicles} purchaseOptions={purchaseOptions} />
    </>
  )
}
