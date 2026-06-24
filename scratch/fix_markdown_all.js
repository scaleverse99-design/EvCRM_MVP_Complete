const fs = require('fs');

const ADMIN_PATH = 'app/admin/page.js';
const NEWS_PATH = 'app/news/page.js';
const DETAIL_PATH = 'app/pulse/[slug]/page.js';

// Helper to strip markdown
function stripMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/^#+\s+/gm, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\|(.+)\|/g, "")
    .replace(/```[a-z]*\n([\s\S]*?)\n```/g, "$1")
    .replace(/<[^>]*>?/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 1. Fix Admin
if (fs.existsSync(ADMIN_PATH)) {
  let content = fs.readFileSync(ADMIN_PATH, 'utf8');
  content = content.replace(/\{p\.linkedin_copy \|\|/g, '{stripMarkdown(p.linkedin_copy) ||');
  content = content.replace(/\{p\.x_hook \|\|/g, '{stripMarkdown(p.x_hook || p.title) ||'); // Fixed logic for x_hook
  content = content.replace(/\{p\.instagram_copy \|\|/g, '{stripMarkdown(p.instagram_copy) ||');
  fs.writeFileSync(ADMIN_PATH, content);
  console.log('Fixed Admin Dashboard snippets.');
}

// 2. Fix News Page
if (fs.existsSync(NEWS_PATH)) {
  let content = fs.readFileSync(NEWS_PATH, 'utf8');
  // Add import if missing
  if (!content.includes('import { stripMarkdown }')) {
    content = 'import { stripMarkdown } from "../../lib/markdown"\n' + content;
  }
  // Increase length to 250 and strip markdown
  content = content.replace(/\{megaStory\.summary\.slice\(0, 180\)\}/g, '{stripMarkdown(megaStory.summary).slice(0, 250)}');
  content = content.replace(/\{item\.summary\.slice\(0, 100\)\}/g, '{stripMarkdown(item.summary).slice(0, 160)}'); // Assuming small grid also has summary
  fs.writeFileSync(NEWS_PATH, content);
  console.log('Fixed News Page snippets.');
}

// 3. Fix Detail Page Normalization
if (fs.existsSync(DETAIL_PATH)) {
  let content = fs.readFileSync(DETAIL_PATH, 'utf8');
  if (!content.includes('import { normalizeMarkdownForTables }')) {
     content = content.replace(/import ReactMarkdown/, 'import { normalizeMarkdownForTables } from "../../../lib/markdown"\nimport ReactMarkdown');
  }
  content = content.replace(/\{data\.summary\}/g, '{normalizeMarkdownForTables(data.summary)}');
  fs.writeFileSync(DETAIL_PATH, content);
  console.log('Fixed Detail Page table normalization.');
}
