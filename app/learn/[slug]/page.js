// SERVER component — see app/blog/[slug]/page.js for the full diagnosis.
// Same bug, same fix: this page was a client component fetching in useEffect,
// so crawlers received "Loading…" and every Learn article shared the layout's
// generic <title> because a client component cannot export generateMetadata.

import { notFound } from "next/navigation"
import { getLearnArticle } from "../../../lib/learnArticle.js"
import LearnArticleView from "./ArticleView"

export const dynamic = "force-dynamic"

const SITE = "https://evcrm.in"

export async function generateMetadata({ params }) {
  const data = await getLearnArticle(params.slug).catch(() => null)
  if (!data) return { title: "Article not found — EvCRM" }

  const { post } = data
  const url = `${SITE}/learn/${post.slug}`
  const description = (post.excerpt || "").slice(0, 160)

  return {
    title: post.title,
    description,
    keywords: post.category || undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url,
      siteName: "EvCRM",
      publishedTime: post.publishedAt,
    },
    twitter: { card: "summary", title: post.title, description },
  }
}

export default async function LearnArticlePage({ params }) {
  const data = await getLearnArticle(params.slug)
  if (!data) notFound()

  const { post, related } = data

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: "EvCRM" },
    publisher: { "@type": "Organization", name: "EvCRM", url: SITE },
    datePublished: post.publishedAt,
    mainEntityOfPage: `${SITE}/learn/${post.slug}`,
    ...(post.category ? { keywords: post.category } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LearnArticleView post={post} related={related} />
    </>
  )
}
