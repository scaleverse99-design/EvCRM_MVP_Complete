import { readTable, writeTable } from "./store"

// ── User Queries ─────────────────────────────────────────────────

export async function findUserByEmail(email) {
  const emailClean = email.toLowerCase().trim()
  const users = await readTable("users")
  return users.find(u => u.email === emailClean) || null
}

export async function findUserById(id) {
  const users = await readTable("users")
  return users.find(u => u.id === id) || null
}

export async function createUser(userData) {
  const newUser = {
    ...userData,
    id: userData.id || `user_${Date.now()}`,
    created_at: new Date().toISOString(),
  }
  const users = await readTable("users")
  users.push(newUser)
  await writeTable("users", users)
  return newUser
}

// ── Session Queries ───────────────────────────────────────────────

export async function createSession(userId, tokenHash, ipAddress, userAgent) {
  const session = {
    id: `sess_${Date.now()}`,
    user_id: userId,
    token_hash: tokenHash,
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  }
  const sessions = await readTable("sessions")
  sessions.push(session)
  await writeTable("sessions", sessions)
  return session
}

export async function findSession(tokenHash) {
  const sessions = await readTable("sessions")
  const session = sessions.find(s => s.token_hash === tokenHash)
  if (!session) return null
  if (new Date(session.expires_at) < new Date()) return null

  const user = await findUserById(session.user_id)
  if (!user) return null

  return { ...session, evcrm_users: user }
}

export async function deleteSession(tokenHash) {
  const sessions = await readTable("sessions")
  const filtered = sessions.filter(s => s.token_hash !== tokenHash)
  await writeTable("sessions", filtered)
}

// ── Auth Logs & Tracking ──────────────────────────────────────────

export async function logLoginAttempt(email, ip, success) {
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    email,
    ip,
    success,
  }
  const logs = await readTable("auth_logs")
  logs.unshift(log)
  await writeTable("auth_logs", logs.slice(0, 100))
}

export async function countRecentFailedAttempts(email, ip) {
  const logs = await readTable("auth_logs")
  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000
  const recent = logs.filter(l => new Date(l.timestamp).getTime() > fifteenMinsAgo && !l.success)

  return {
    emailCount: recent.filter(l => l.email === email).length,
    ipCount: recent.filter(l => l.ip === ip).length,
  }
}

export async function updateLastLogin(userId) {
  const users = await readTable("users")
  const idx = users.findIndex(u => u.id === userId)
  if (idx !== -1) {
    users[idx].last_login = new Date().toISOString()
    await writeTable("users", users)
  }
}

// ── OTP & Password Updates ────────────────────────────────────────

export async function updateUserPassword(email, passwordHash) {
  const emailClean = email.toLowerCase().trim()
  const users = await readTable("users")
  const idx = users.findIndex(u => u.email === emailClean)
  if (idx !== -1) {
    users[idx].password_hash = passwordHash
    users[idx].updated_at = new Date().toISOString()
    await writeTable("users", users)
  }
}

export async function createOTP(email, otpHash, purpose = "password_reset") {
  const emailClean = email.toLowerCase().trim()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

  const otps = await readTable("otps")
  const filtered = otps.filter(o => !(o.email === emailClean && o.purpose === purpose))

  const otpRecord = {
    id: `otp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: emailClean,
    otp_hash: otpHash,
    purpose,
    used: false,
    attempts: 0,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  }
  filtered.push(otpRecord)
  await writeTable("otps", filtered)

  return otpRecord
}

export async function findOTP(email, purpose = "password_reset") {
  const emailClean = email.toLowerCase().trim()
  const otps = await readTable("otps")
  return (
    otps.find(o =>
      o.email === emailClean &&
      o.purpose === purpose &&
      !o.used &&
      new Date(o.expires_at) > new Date()
    ) || null
  )
}

export async function incrementOTPAttempts(otpId) {
  const otps = await readTable("otps")
  const idx = otps.findIndex(o => o.id === otpId)
  let newAttempts = 1
  if (idx !== -1) {
    otps[idx].attempts = (otps[idx].attempts || 0) + 1
    newAttempts = otps[idx].attempts
    await writeTable("otps", otps)
  }
  return newAttempts
}

export async function markOTPUsed(otpId) {
  const otps = await readTable("otps")
  const idx = otps.findIndex(o => o.id === otpId)
  if (idx !== -1) {
    otps[idx].used = true
    await writeTable("otps", otps)
  }
}

// ── Compatibility Layer ──────────────────────────────────────────
// Lets legacy code call this the way it would call a Supabase client —
// supabaseAdmin.from("evcrm_users").select().eq(...).single() — while
// everything actually flows through readTable/writeTable above.

const TABLE_ALIASES = {
  evcrm_users: "users",
  evcrm_sessions: "sessions",
  evcrm_otps: "otps",
  evcrm_auth_logs: "auth_logs",
}

const db = {
  from: (sheet) => {
    const table = TABLE_ALIASES[sheet] || sheet
    return {
      select: () => ({
        eq: (field, val) => ({
          eq: () => ({
            single: async () => {
              const user = await (field === "email" ? findUserByEmail(val) : findUserById(val))
              return { data: user, error: user ? null : { code: "PGRST116" } }
            },
          }),
          single: async () => {
            const user = await (field === "email" ? findUserByEmail(val) : findUserById(val))
            return { data: user, error: user ? null : { code: "PGRST116" } }
          },
        }),
        order: () => ({
          limit: (n) => ({
            then: async (resolve) => {
              const data = await readTable(table)
              resolve({ data: data.slice(0, n), error: null })
            },
          }),
          then: async (resolve) => {
            const data = await readTable(table)
            resolve({ data, error: null })
          },
        }),
        then: async (resolve) => {
          const data = await readTable(table)
          resolve({ data, error: null })
        },
      }),
      insert: (row) => ({
        select: () => ({
          single: async () => {
            const newUser = await createUser(row)
            return { data: newUser, error: newUser ? null : { message: "Insert failed" } }
          },
        }),
      }),
    }
  },
}

export default db
