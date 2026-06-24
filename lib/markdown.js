/**
 * Professional Markdown Utility for EvCRM
 * Purpose: Ensures clean, high-authority text rendering in snippets and metas.
 */

export function stripMarkdown(md) {
  if (!md) return "";
  
  return md
    // 1. Remove Headers (#)
    .replace(/^#+\s+/gm, "")
    // 2. Remove Emphasis (*, _)
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // 3. Remove Links ([text](url))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // 4. Remove Tables (Simple logic to strip them out of previews as they look messy)
    .replace(/\|(.+)\|/g, "")
    // 5. Remove Code Blocks (```)
    .replace(/```[a-z]*\n([\s\S]*?)\n```/g, "$1")
    // 6. Remove HTML tags
    .replace(/<[^>]*>?/gm, "")
    // 7. Cleanup extra newlines and whitespace
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMarkdownForTables(md) {
  if (!md) return "";
  
  // remark-gfm requires a newline before a table to render it correctly
  // This looks for table headers (e.g., | Feature |) and ensures they have a double newline before them
  return md.replace(/([^\n])\n\|/g, "$1\n\n|");
}
