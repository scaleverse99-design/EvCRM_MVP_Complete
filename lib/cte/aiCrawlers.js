// Detects the three things people call "AI searching" and separates what is
// actually observable from what is not — established over this session's
// discussion, not assumed:
//
//   1. The user's query TO the AI            — never observable (unless MCP)
//   2. The AI's outbound query to ITS index   — never observable, ever;
//                                                that request never reaches us
//   3. The AI's fetch of OUR page, once it
//      decided we were worth checking        — fully observable, right now,
//                                                in our own request logs
//
// This module is layer 3. It cannot tell us what was asked — only that live
// AI search touched a specific page at a specific time. Combined with
// query_signals (exact queries, small volume) and Search Console (real
// queries, but only for pages we already rank on), it's the third leg: an
// outcome signal on whether AI search is actually finding us.
//
// SEARCH crawlers only — GPTBot/ClaudeBot/Google-Extended are TRAINING
// crawlers (they feed model training, unrelated to any live user question)
// and are deliberately excluded. Logging them would answer "will we be in
// next year's training data", not "is AI search finding us right now",
// and conflating the two would make the resulting report meaningless.
//
// User-agent strings are trivially spoofed — OpenAI and Perplexity publish
// IP ranges for verification; Anthropic's own guidance is to control via
// robots.txt rather than IP-verify. So: log what the UA claims, but never
// treat an unverified hit as certain. `verified` stays false until an IP
// check is added; the report layer must say "self-reported" accordingly.
export const SEARCH_BOTS = {
  "OAI-SearchBot": /OAI-SearchBot/i,     // live ChatGPT search fetching this page right now
  "ChatGPT-User": /ChatGPT-User/i,       // a user's ChatGPT session browsing on their behalf
  "Claude-SearchBot": /Claude-SearchBot/i, // live Claude search fetching this page right now
  "PerplexityBot": /PerplexityBot/i,     // live Perplexity search/answer generation
  "bingbot": /bingbot/i,                 // feeds Bing, and Copilot's Bing-backed search
}

/** Returns the matched bot name, or null if the UA isn't a known search crawler. */
export function detectSearchBot(userAgent) {
  if (!userAgent) return null
  for (const [name, pattern] of Object.entries(SEARCH_BOTS)) {
    if (pattern.test(userAgent)) return name
  }
  return null
}
