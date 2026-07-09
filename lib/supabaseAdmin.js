// ── lib/supabaseAdmin.js ─────────────────────────────────────────────
// Server-only Supabase client using the service-role key (bypasses RLS).
// Never import this from a "use client" file — the service role key must
// never reach the browser. For client-side Supabase Auth, use lib/supabase.js
// (anon key) instead — this file is purely for server-side table CRUD.

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

let client = null

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL && SERVICE_KEY &&
    !SUPABASE_URL.includes("your-project") &&
    !SERVICE_KEY.includes("eyJhbGci...")
  )
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return client
}
