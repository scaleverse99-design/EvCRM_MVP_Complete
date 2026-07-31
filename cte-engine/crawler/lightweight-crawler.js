/**
 * lightweight-crawler.js
 * Real, Nutch-inspired lightweight web crawler.
 * - Checks robots.txt per host
 * - Respects per-host rate limits (min 2000ms delay between requests to same domain)
 * - Lightweight fetch + regex/HTML parser (no Puppeteer, no heavy browser DOM)
 * - Persists crawl records to Supabase with real metadata only.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
const envPath = path.join(__dirname, '..', '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (m) {
      let val = m[2].trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = val
    }
  })
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// Last request timestamp per domain to enforce rate limits
const domainLastRequest = {}
const MIN_DOMAIN_INTERVAL_MS = 2000

// Cached robots.txt rules per domain
const robotsCache = {}

/**
 * Fetch and parse robots.txt for a host domain
 */
async function getRobotsRules(domain) {
  if (robotsCache[domain]) return robotsCache[domain]

  const robotsUrl = `https://${domain}/robots.txt`
  let disallowedPaths = []
  try {
    const res = await fetch(robotsUrl, { timeout: 5000 })
    if (res.ok) {
      const text = await res.text()
      const lines = text.split('\n')
      let isUserAgentMatch = false
      for (const line of lines) {
        const clean = line.trim().toLowerCase()
        if (clean.startsWith('user-agent:')) {
          const ua = clean.replace('user-agent:', '').trim()
          isUserAgentMatch = ua === '*' || ua.includes('bot') || ua.includes('crawler')
        } else if (isUserAgentMatch && clean.startsWith('disallow:')) {
          const p = line.trim().split(':')[1]?.trim()
          if (p) disallowedPaths.push(p)
        }
      }
    }
  } catch (err) {
    // If robots.txt fails to fetch, default to allowing unless explicitly forbidden
  }

  robotsCache[domain] = disallowedPaths
  return disallowedPaths
}

/**
 * Check if a URL path is allowed by host robots.txt
 */
async function isAllowedByRobots(targetUrl) {
  try {
    const urlObj = new URL(targetUrl)
    const domain = urlObj.hostname
    const pathName = urlObj.pathname
    const disallowed = await getRobotsRules(domain)

    for (const d of disallowed) {
      if (d === '/' || (d !== '' && pathName.startsWith(d))) {
        return false
      }
    }
    return true
  } catch (e) {
    return true
  }
}

/**
 * Rate limit delay per host
 */
async function enforceRateLimit(domain) {
  const now = Date.now()
  const last = domainLastRequest[domain] || 0
  const elapsed = now - last
  if (elapsed < MIN_DOMAIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_DOMAIN_INTERVAL_MS - elapsed))
  }
  domainLastRequest[domain] = Date.now()
}

/**
 * Crawl a single target URL
 */
async function crawlUrl(targetUrl) {
  try {
    const urlObj = new URL(targetUrl)
    const domain = urlObj.hostname

    // 1. Check robots.txt
    const allowed = await isAllowedByRobots(targetUrl)
    if (!allowed) {
      console.log(`[Crawler] 🚫 Blocked by robots.txt: ${targetUrl}`)
      return { url: targetUrl, status: 'BLOCKED_BY_ROBOTS', crawledAt: new Date().toISOString() }
    }

    // 2. Enforce rate limiting per domain
    await enforceRateLimit(domain)

    // 3. Fetch HTML content
    console.log(`[Crawler] 🕷️ Crawling: ${targetUrl}`)
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'EvCRM-LightweightCrawler/1.0 (+https://evcrm.in/llms.txt)'
      }
    })

    if (!res.ok) {
      return { url: targetUrl, status: res.status, crawledAt: new Date().toISOString() }
    }

    const html = await res.text()

    // 4. Lightweight extraction via Regex
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i)
    const description = metaDescMatch ? metaDescMatch[1].trim() : ''

    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["'](.*?)["']/i)
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : targetUrl

    // Strip scripts & styles, extract main text snippet
    const cleanText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000)

    const crawlResult = {
      url: targetUrl,
      canonical,
      domain,
      title,
      description,
      snippet: cleanText,
      status: 200,
      crawledAt: new Date().toISOString()
    }

    // 5. Persist to Supabase if configured
    if (supabase) {
      const record = {
        id: `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        data: crawlResult
      }
      await supabase.from('feed').upsert([record])
    }

    return crawlResult
  } catch (err) {
    console.error(`[Crawler] Error crawling ${targetUrl}:`, err.message)
    return { url: targetUrl, status: 500, error: err.message, crawledAt: new Date().toISOString() }
  }
}

/**
 * Crawl a batch of target URLs
 */
async function crawlBatch(urls) {
  const results = []
  for (const url of urls) {
    const res = await crawlUrl(url)
    results.push(res)
  }
  return results
}

module.exports = {
  crawlUrl,
  crawlBatch,
  isAllowedByRobots
}
