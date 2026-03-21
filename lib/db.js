import { createClient } from "@supabase/supabase-js"

// ── Service client (backend only) ────────────────────────────────
// Uses SERVICE_ROLE key — never expose this to the browser
// This bypasses Row Level Security so our API can read/write all tables
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  }
)

export default supabaseAdmin

// ── User queries ─────────────────────────────────────────────────

export async function findUserByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from("evcrm_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("is_active", true)
    .single()

  if (error && error.code !== "PGRST116") throw error // PGRST116 = not found
  return data || null
}

export async function findUserById(id) {
  const { data, error } = await supabaseAdmin
    .from("evcrm_users")
    .select("id, email, role, name, phone, dealership, city, last_login")
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export async function updateLastLogin(userId) {
  await supabaseAdmin
    .from("evcrm_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", userId)
}

export async function updateUserPassword(email, passwordHash) {
  const { error } = await supabaseAdmin
    .from("evcrm_users")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("email", email.toLowerCase())
  if (error) throw error
}

// ── OTP queries ───────────────────────────────────────────────────

export async function createOTP(email, otpHash, purpose = "password_reset") {
  // Delete any existing unused OTPs for this email+purpose
  await supabaseAdmin
    .from("evcrm_otps")
    .delete()
    .eq("email", email.toLowerCase())
    .eq("purpose", purpose)

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  const { data, error } = await supabaseAdmin
    .from("evcrm_otps")
    .insert({
      email:      email.toLowerCase(),
      otp_hash:   otpHash,
      purpose,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findOTP(email, purpose = "password_reset") {
  const { data, error } = await supabaseAdmin
    .from("evcrm_otps")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("purpose", purpose)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function incrementOTPAttempts(otpId) {
  const { data } = await supabaseAdmin
    .from("evcrm_otps")
    .select("attempts")
    .eq("id", otpId)
    .single()

  const newAttempts = (data?.attempts || 0) + 1

  await supabaseAdmin
    .from("evcrm_otps")
    .update({ attempts: newAttempts })
    .eq("id", otpId)

  return newAttempts
}

export async function markOTPUsed(otpId) {
  await supabaseAdmin
    .from("evcrm_otps")
    .update({ used: true })
    .eq("id", otpId)
}

// ── Session queries ───────────────────────────────────────────────

export async function createSession(userId, tokenHash, ipAddress, userAgent) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const { data, error } = await supabaseAdmin
    .from("evcrm_sessions")
    .insert({
      user_id:    userId,
      token_hash: tokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findSession(tokenHash) {
  const { data, error } = await supabaseAdmin
    .from("evcrm_sessions")
    .select("*, evcrm_users(id, email, role, name, dealership, is_active)")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function deleteSession(tokenHash) {
  await supabaseAdmin
    .from("evcrm_sessions")
    .delete()
    .eq("token_hash", tokenHash)
}

// ── Login attempt tracking ────────────────────────────────────────

export async function logLoginAttempt(email, ipAddress, success) {
  await supabaseAdmin
    .from("evcrm_login_attempts")
    .insert({ email: email.toLowerCase(), ip_address: ipAddress, success })
}

export async function countRecentFailedAttempts(email, ipAddress, minutes = 15) {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString()

  // Count by email
  const { count: emailCount } = await supabaseAdmin
    .from("evcrm_login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .eq("success", false)
    .gte("created_at", since)

  // Count by IP
  const { count: ipCount } = await supabaseAdmin
    .from("evcrm_login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ipAddress)
    .eq("success", false)
    .gte("created_at", since)

  return { emailCount: emailCount || 0, ipCount: ipCount || 0 }
}
