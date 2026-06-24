import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const JWT_SECRET  = process.env.JWT_SECRET
const JWT_EXPIRES = "7d"
const BCRYPT_ROUNDS = 12

if (!JWT_SECRET) {
  console.warn("⚠ JWT_SECRET not set in environment variables")
}

// ── Password hashing ──────────────────────────────────────────────

/**
 * Hash a plain-text password using bcrypt (12 rounds)
 * This is the same security level as Apps Script but production-grade
 */
export async function hashPassword(plainText) {
  return bcrypt.hash(plainText, BCRYPT_ROUNDS)
}

/**
 * Compare plain text against stored bcrypt hash
 */
export async function verifyPassword(plainText, hash) {
  return bcrypt.compare(plainText, hash)
}

// ── OTP generation & hashing ──────────────────────────────────────

/**
 * Generate a cryptographically secure 6-digit OTP
 * NOT Math.random() — uses crypto.randomInt for security
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * Hash an OTP before storing in DB
 * Uses bcrypt so database leak doesn't expose OTPs
 */
export async function hashOTP(otp) {
  return bcrypt.hash(otp, 10) // 10 rounds is fine for 6-digit short-lived codes
}

/**
 * Verify a plain OTP against its stored hash
 */
export async function verifyOTP(plainOTP, hash) {
  return bcrypt.compare(plainOTP, hash)
}

// ── JWT tokens ────────────────────────────────────────────────────

/**
 * Generate a signed JWT containing user identity
 */
export function generateToken(payload) {
  return jwt.sign(
    {
      sub:        payload.userId,
      email:      payload.email,
      role:       payload.role,
      dealership: payload.dealership,
      iat:        Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

/**
 * Verify and decode a JWT
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

/**
 * Hash the JWT for storage in DB (so we never store the raw token)
 * SHA-256 is fine here — this is just for lookup/revocation
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

// ── Cookie helpers ────────────────────────────────────────────────

/**
 * Build secure Set-Cookie header string
 */
export function buildCookieHeader(token) {
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  const isProd = process.env.NODE_ENV === "production"

  return [
    `evcrm_token=${token}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",            // JavaScript cannot read this cookie
    "SameSite=Strict",     // CSRF protection
    isProd ? "Secure" : "", // HTTPS only in production
  ].filter(Boolean).join("; ")
}

export function clearCookieHeader() {
  return "evcrm_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict"
}

/**
 * Extract token from request cookies
 */
export function extractToken(req) {
  // 1. Try Authorization header (Bearer token)
  const authHeader = req.headers.get?.("authorization") || req.headers?.authorization
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  // 2. Fallback to cookie
  const cookieHeader = req.headers.get?.("cookie") || req.headers?.cookie || ""
  const match = cookieHeader.match(/evcrm_token=([^;]+)/)
  return match ? match[1] : null
}

// ── Rate limit check ──────────────────────────────────────────────

const MAX_FAILS_BY_EMAIL = 5   // 5 fails per email in 15 min
const MAX_FAILS_BY_IP    = 10  // 10 fails per IP in 15 min

export function isRateLimited(emailCount, ipCount) {
  return emailCount >= MAX_FAILS_BY_EMAIL || ipCount >= MAX_FAILS_BY_IP
}

// ── Standard API responses ────────────────────────────────────────

export function ok(data, status = 200) {
  return Response.json({ success: true, ...data }, { status })
}

export function err(message, status = 400) {
  return Response.json({ success: false, error: message }, { status })
}

/**
 * Validate auth middleware — use at the top of protected API routes
 */
export async function requireAuth(req, findSession, hashToken) {
  const token = extractToken(req)
  if (!token) return { user: null, error: "Not authenticated" }

  const decoded = verifyToken(token)
  if (!decoded)  return { user: null, error: "Invalid or expired token" }

  const session = await findSession(hashToken(token))
  if (!session)  return { user: null, error: "Session expired. Please log in again." }
  if (!session.evcrm_users?.is_active) return { user: null, error: "Account is disabled." }

  return { user: session.evcrm_users, error: null }
}
