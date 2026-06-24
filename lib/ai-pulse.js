import RSSParser from 'rss-parser'
import { db } from './firebase-admin.js'
import * as cheerio from 'cheerio'

const STEALTH_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const parser = new RSSParser({
  headers: { 'User-Agent': STEALTH_UA }
})

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

/**
 * EV PULSE: The Multimodal AI Content & SEO Engine
 */

async function logOp(op, detail, status = "INFO") {
  try {
    await db.collection('pulse_ops_logs').add({
      timestamp: new Date().toISOString(),
      op,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      status
    })
  } catch (err) {
    console.warn(`[Pulse Logger] Failed to log op ${op}:`, err.message)
  }
}

/**
 * SCOPE MATRIX: Geographic tiers for dominance
 */
const SCOPES = {
  INTERNATIONAL: "international",
  NATIONAL: "national",
  REGIONAL: "regional"
}

const INTL_FEEDS = [
  "https://electrek.co/feed/",
  "https://insideevs.com/rss/articles/all/",
  "https://cleantechnica.com/feed/"
]

/**
 * STATE MATRIX: Target Indian regions
 */
const STATE_MATRIX = [
  "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", 
  "Gujarat", "Telangana", "Uttar Pradesh", "West Bengal"
]

/**
 * DISCOVERY MATRIX: High-intent Indian EV queries
 */
const TREND_QUERIES = [
  "latest EV industry news India",
  "FAME III subsidy India update",
  "electric car launches India 2024",
  "Tata Punch EV real world range review",
  "electric vehicle registration charges India",
  "best electric scooters in india 2024"
]

/**
 * ENGINE_PAUSED: Set to true to disable autonomous background sync.
 * When paused, the engine will only run if the 'force' flag is explicitly passed.
 */
const ENGINE_PAUSED = true;

export async function runPulseUpdate(force = false) {
  if (ENGINE_PAUSED && !force) {
    console.log('[Pulse Engine] Autonomous sync is PAUSED. Manual bypass (force=true) required.')
    return { status: 'PAUSED', message: 'Engine is in Maintenance/Manual Mode.' }
  }

  const windowParam = force ? "when:7d" : "when:24h"
  await logOp('INIT', `Omni-Scope Sync Active... [Window: ${windowParam}]`)
  
  // ── PRE-FLIGHT DIAGNOSTIC ──────────────────────────────────────
  const hasGemini = !!process.env.GEMINI_API_KEY || !!process.env.NEXT_PUBLIC_GEMINI_API_KEY
  await logOp('SYSTEM_CHECK', {
    brain: hasGemini ? "ONLINE (Active)" : "OFFLINE (Missing Keys)",
    mode: force ? "OVERDRIVE (Force Bypass)" : "STANDARD",
    timestamp: new Date().toISOString()
  }, hasGemini ? 'INFO' : 'ERROR')

  if (!hasGemini) {
    await logOp('CRITICAL_FAILURE', 'ENGINE REJECTED: GEMINI_API_KEY is missing. Add keys to Firebase secrets.', 'ERROR')
    return []
  }
  
  try {
    const updates = []

    // ── STREAM 1: INTERNATIONAL (Global Intelligence) ────────────────
    await logOp('INTL_FETCH', 'Scanning Global EV Giants (Electrek, InsideEVs)...')
    for (const feedUrl of INTL_FEEDS) {
      if (updates.length >= 4 && !force) break
      try {
        const feed = await parser.parseURL(feedUrl)
        for (const item of feed.items.slice(0, 2)) {
          const res = await processDiscoveryItem(item, "International", SCOPES.INTERNATIONAL, force)
          if (res) updates.push(res)
        }
      } catch (e) { 
        await logOp('RSS_BLOCK', `Intl Feed Fail: ${feedUrl}. Status: ${e.message}`, 'WARNING') 
      }
    }

    // ── STREAM 2 & 3: NATIONAL & REGIONAL (India Focus) ─────────────
    const activeQueries = TREND_QUERIES.sort(() => 0.5 - Math.random()).slice(0, 3)
    const activeStates = STATE_MATRIX.sort(() => 0.5 - Math.random()).slice(0, 3)

    for (let i = 0; i < activeQueries.length; i++) {
      const query = activeQueries[i]
      const state = activeStates[i]
      
      try {
        // Attempt Local
        const localQuery = `${query} ${state}`
        const localUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(localQuery)}+${windowParam}&hl=en-IN&gl=IN&ceid=IN:en`
        
        await logOp('RSS_SCAN', `Hunting Regional in ${state.toUpperCase()}: ${query}`)
        let feed;
        try {
          feed = await parser.parseURL(localUrl)
        } catch (e) {
          await logOp('RSS_BLOCK', `Regional Block in ${state}: ${query}. Trying fallback...`)
          feed = { items: [] }
        }

        let currentScope = SCOPES.REGIONAL
        let currentState = state

        // Fallback to National if local is empty
        if ((!feed.items || feed.items.length === 0)) {
          await logOp('FALLBACK', `0 items in ${state}. Broadening to NATIONAL...`)
          const nationalUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+${windowParam}&hl=en-IN&gl=IN&ceid=IN:en`
          try {
            feed = await parser.parseURL(nationalUrl)
          } catch (e) {
            await logOp('RSS_BLOCK', `National Block for ${query}. Skipping.`)
            continue
          }
          currentScope = SCOPES.NATIONAL
          currentState = "National"
        }
        
        for (const item of feed.items.slice(0, 3)) {
          if (updates.length >= 10 && !force) break
          try {
            const res = await processDiscoveryItem(item, currentState, currentScope, force)
            if (res) updates.push(res)
          } catch (e) {
            await logOp('ITEM_FAIL', `Discovery item failed: ${item.title.slice(0,30)}`)
          }
        }
      } catch (e) {
        await logOp('STREAM_FAIL', `Regional sync chunk failed: ${e.message}`)
      }
    }
    
    await logOp('FINISH', `Omni-Scope Sync complete. ${updates.length} tiered articles unleashed.`)
    return updates
  } catch (error) {
    await logOp('CRITICAL_ERROR', error.message, 'ERROR')
    return [] // Never throw, just return empty so API doesn't crash
  }
}

async function processDiscoveryItem(item, targetArea, scope, force) {
  const newsId = Buffer.from(item.title).toString('base64').slice(0, 24)
  const registry = await db.collection('pulse_registry').doc(newsId).get()
  
  if (registry.exists && !force) {
    return null
  }
  
  await logOp('TREND_DETECT', { title: item.title, area: targetArea, scope })
  const image = await scrapeImage(item.link)
  
  let ai = await generateAIContent(item.title, item.contentSnippet, targetArea, scope)
  
  // ── SAFE-SAVE FALLBACK (The Content Net) ────────────────────────
  if (!ai) {
    await logOp('SAFE_SAVE', `AI Unavailable. Using RSS Snippet for ${targetArea}.`)
    ai = {
      title: item.title,
      summary: item.contentSnippet?.slice(0, 500) || `Latest updates regarding ${item.title} in the EV sector. Found via ${item.link}`,
      key_takeaways: ["Source identified via RSS", "Awaiting AI deeper analysis"],
      slug: item.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50),
      scope,
      state: targetArea,
      is_trending: true,
      author_name: "EV Pulse",
      linkedin_copy: `Check out the latest: ${item.title} #EVNews`,
      instagram_copy: `New Update: ${item.title} 🚗⚡`,
      whatsapp_copy: `🚨 EV Update: ${item.title}`,
      requires_review: true,
      published: false,
      video_script: `[Visual: Fleet of EVs] \nAudio: Breaking in ${targetArea}! ${item.title}.`,
      tags: [targetArea, "Breaking"]
    }
  }

  const payload = {
    ...ai,
    featured_image_url: image || "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2072&auto=format&fit=crop",
    originalLink: item.link,
    publishedAt: new Date().toISOString(),
    id: newsId
  }
  
  try {
    await db.collection('pulse').doc(newsId).set(payload)
    await db.collection('pulse_registry').doc(newsId).set({
      publishedAt: new Date().toISOString(),
      title: item.title,
      slug: ai.slug,
      scope,
      state: targetArea
    })
    return payload
  } catch (e) {
    await logOp('DB_SAVE_FAIL', e.message, 'ERROR')
    return null
  }
}

async function scrapeImage(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000) 
    
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'User-Agent': STEALTH_UA }
    })
    clearTimeout(timeout)
    
    if (!res.ok) return null
    
    const html = await res.text()
    const $ = cheerio.load(html)
    
    const ogImage = $('meta[property="og:image"]').attr('content')
    const twitterImage = $('meta[name="twitter:image"]').attr('content')
    const itemPropImage = $('meta[itemprop="image"]').attr('content')
    
    return ogImage || twitterImage || itemPropImage || null
  } catch (err) {
    return null
  }
}

export async function generateAIContent(title, snippet, targetArea = "National", scope = "national", tone = "Professional") {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]
  let lastError = null

  for (const model of models) {
    try {
      const prompt = `
        Objective: Create a high-authority, investigative news article for "EV.CRM".
        Reference Style: Times of India (TOI) Editorial / Investigative Journalism.
        Voice: Authoritative, Professional, Global but Localized Context.
        Scope: ${scope.toUpperCase()} 
        Context Region: ${targetArea}
        Author Tone: ${tone}
        Source: "${title}" - ${snippet}
        
        STRUCTURAL REQUIREMENTS (TOI JOURNALISM):
        1. Catchy Investigative Headline: Benefit-driven, impactful.
        2. Impactful Lede: A strong opening paragraph that summarizes the "Why" and "Now" (The Hook).
        3. Investigated Body: Structured journalistic flow (Context -> The Data -> The Impact -> The Future).
        4. Expert Perspective: Include expert-toned analysis sections (placeholder for simulated expertise).
        5. For Guides/Listicles: 
           - Use H2 for each model: "Model Name (Battery/Variant)"
           - Section: **Key Specs** (List real-world range, top speed, charging time)
           - Section: **Best For** (Identify target persona: families, students, etc.)
           - Section: **Model Differentiation** (Unique value vs competitors)
        6. Digital Visuals: Suggest captions for images/infographics.
        7. Comparative Data: Strictly valid Markdown table at the end comparing top features.
        8. Pro-Tip: Concluding expert advice on subsidies/infrastructure in ${targetArea}.
        
        Return a strictly valid JSON object with:
        {
          "title": "TOI-Style Investigative Headline",
          "category": "News | Review | Tech | Policy | Industry",
          "key_takeaways": ["Expert Point 1", "Expert Point 2", "Expert Point 3"],
          "summary": "Full article in Markdown (H2, H3, lists, tables). Ensure investigative tone throughout.",
          "slug": "url-friendly-slug",
          "seo_title": "Max 60 chars Title",
          "seo_description": "Max 160 chars Meta Description",
          "tags": ["Tag1", "Tag2"],
          "scope": "${scope}",
          "state": "${targetArea}",
          "is_trending": true,
          "author_name": "Ravi Kumar",
          "linkedin_copy": "Professional summary for industry lead readers.",
          "instagram_copy": "Viral hook and insights for social engagement.",
          "whatsapp_copy": "Actionable community alert.",
          "video_script": "60s high-energy investigative narrative script.",
          "reels_hook": "Shocking/intriguing opening line.",
          "creative_brief": "Advice on background visuals and vibe."
        }
      `

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": STEALTH_UA
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
        })
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error.message)
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error("Empty AI Response")
      
      return JSON.parse(text)
    } catch (err) {
      lastError = err.message
      if (err.message.includes('429')) await new Promise(r => setTimeout(r, 2000))
    }
  }

  // ── OPENROUTER FALLBACK (Gemma 4 / Llama 3) ───────────────────────
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
  if (OPENROUTER_KEY) {
    try {
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemma-4-31b-it:free",
          messages: [{ role: "system", content: "Return ONLY valid JSON. " + prompt.substring(0, 1000) }],
          max_tokens: 2000,
          temperature: 0.7
        })
      })
      const orData = await orRes.json()
      const orText = orData.choices?.[0]?.message?.content
      if (orText) {
          const cleaned = orText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          return JSON.parse(cleaned)
      }
    } catch (e) {
      console.warn("[Pulse AI] OpenRouter Fallback failed:", e.message)
    }
  }

  await logOp('AI_EXHAUSTED', `All models failed. Last error: ${lastError}`, "ERROR")
  return null
}

export async function logResearch(topic, tone, result) {
  try {
    await db.collection("research_history").add({
      timestamp: new Date().toISOString(),
      topic,
      tone,
      title: result?.title || "N/A",
      type: "GEMINI_DRAFT"
    })
  } catch (err) {
    console.warn("[Research Logger] Failed:", err.message)
  }
}
