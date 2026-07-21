// ── lib/indexnow.js ──────────────────────────────────────────────────
// IndexNow — free instant-indexing protocol (Bing, Yandex, Seznam, and
// anything else that adopts it; Bing also feeds Copilot/ChatGPT answers).
// One POST per new/updated URL tells the engines to crawl it now instead
// of whenever the next scheduled crawl happens.
//
// Protocol requirement: the key must also be served as a plain-text file
// at https://evcrm.in/{key}.txt — see app/<key>.txt/route.js. If you ever
// rotate INDEXNOW_KEY, that route's folder name must be renamed to match.

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "e7c1a94d2f5b48c3a6d9e0b1f4a7c8d2"

const HOST = "evcrm.in"

/**
 * Fire-and-forget ping for one or more evcrm.in URLs. Never throws — a
 * failed ping must never break the write (inventory create/update) that
 * triggered it. Skipped outside production so local dev doesn't spam the
 * engines with localhost-era test listings.
 */
export async function pingIndexNow(urls) {
  const urlList = (Array.isArray(urls) ? urls : [urls]).filter(Boolean)
  if (urlList.length === 0) return
  if (process.env.NODE_ENV !== "production") return

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    })
    console.log(`[indexnow] pinged ${urlList.length} url(s) → ${res.status}`)
  } catch (e) {
    console.error("[indexnow] ping failed:", e.message)
  }
}
