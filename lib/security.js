/**
 * Security utilities for the EvCRM application
 * Handles validation, sanitization, and security checks
 */

import crypto from "crypto"

// ── Input Validation ──────────────────────────────────────────────

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate strong password
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function isStrongPassword(password) {
  if (!password || typeof password !== "string") return false
  if (password.length < 8 || password.length > 128) return false
  
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
}

/**
 * Sanitize string input to prevent XSS
 * Removes dangerous HTML and scripts
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== "string") return ""
  
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim()
    .substring(0, 500) // Limit length
}

/**
 * Validate phone number format
 * Accepts formats: +1234567890, 1234567890, (123) 456-7890, etc.
 */
export function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return false
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
  return phoneRegex.test(phone.replace(/\s/g, ""))
}

/**
 * Validate URL format
 */
export function isValidUrl(url) {
  if (!url || typeof url !== "string") return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate numeric ID format
 */
export function isValidId(id) {
  if (!id || typeof id !== "string") return false
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 50
}

/**
 * Validate role against allowed roles
 */
export function isValidRole(role, allowedRoles = ["dealer", "rep", "oem", "superadmin"]) {
  return typeof role === "string" && allowedRoles.includes(role.toLowerCase())
}

/**
 * Sanitize object by validating and sanitizing all string fields
 */
export function sanitizeObject(obj, allowedKeys = null) {
  if (!obj || typeof obj !== "object") return {}
  
  const sanitized = {}
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if key is allowed
    if (allowedKeys && !allowedKeys.includes(key)) continue
    
    // Sanitize string values
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value)
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value
    } else if (value === null) {
      sanitized[key] = null
    }
    // Skip arrays, objects, and other types for safety
  }
  
  return sanitized
}

// ── Rate Limiting ──────────────────────────────────────────────────

const rateLimitStore = new Map() // Simple in-memory store

/**
 * Check if request exceeds rate limit
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier, maxRequests = 10, windowSeconds = 60) {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  
  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, { requests: [], resetAt: now + windowMs })
  }
  
  const entry = rateLimitStore.get(identifier)
  
  // Clear old requests outside the window
  entry.requests = entry.requests.filter(time => now - time < windowMs)
  
  // Add current request
  entry.requests.push(now)
  
  const isAllowed = entry.requests.length <= maxRequests
  const remaining = Math.max(0, maxRequests - entry.requests.length)
  
  return {
    allowed: isAllowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: isAllowed ? null : Math.ceil((entry.resetAt - now) / 1000)
  }
}

/**
 * Clear rate limit entry for identifier
 */
export function clearRateLimit(identifier) {
  rateLimitStore.delete(identifier)
}

// ── CSRF Protection ───────────────────────────────────────────────

/**
 * Generate CSRF token
 */
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Verify CSRF token (compare current token with stored token)
 */
export function verifyCSRFToken(token, storedToken) {
  return token && storedToken && crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(storedToken)
  )
}

// ── Security Headers ──────────────────────────────────────────────

/**
 * Get security headers for response
 */
export function getSecurityHeaders() {
  return {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' *.supabase.co *.googleapis.com *.razorpay.com https:;",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  }
}

// ── Data Encryption ───────────────────────────────────────────────

const ENCRYPTION_ALGORITHM = "aes-256-gcm"

/**
 * Encrypt sensitive data
 * Returns: { encrypted, iv, authTag } as base64 strings
 */
export function encryptData(data, key) {
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(key, "hex"), iv)
    
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex")
    encrypted += cipher.final("hex")
    
    const authTag = cipher.getAuthTag()
    
    return {
      encrypted: Buffer.from(encrypted, "hex").toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64")
    }
  } catch (error) {
    console.error("[Security] Encryption failed:", error.message)
    return null
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encrypted, iv, authTag, key) {
  try {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(key, "hex"),
      Buffer.from(iv, "base64")
    )
    
    decipher.setAuthTag(Buffer.from(authTag, "base64"))
    
    let decrypted = decipher.update(Buffer.from(encrypted, "base64"))
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return JSON.parse(decrypted.toString("utf8"))
  } catch (error) {
    console.error("[Security] Decryption failed:", error.message)
    return null
  }
}

// ── IP Validation ──────────────────────────────────────────────────

/**
 * Extract client IP from request headers
 * Handles proxies and load balancers
 */
export function getClientIP(headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-client-ip") ||
    "unknown"
  )
}

/**
 * Check if IP is in blocklist
 */
export function isIPBlocked(ip, blocklist = []) {
  return blocklist.some(blocked => {
    if (blocked.includes("*")) {
      // Wildcard pattern matching
      const pattern = new RegExp("^" + blocked.replace(/\*/g, ".*") + "$")
      return pattern.test(ip)
    }
    return ip === blocked
  })
}

// ── Audit Logging ──────────────────────────────────────────────────

/**
 * Log security events for audit trail
 */
export function logSecurityEvent(eventType, details) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    eventType,
    ...details,
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Security Event] ${eventType}:`, details)
  }
  
  // In production, this should be sent to a logging service
  // e.g., Sentry, DataDog, CloudWatch, etc.
  
  return logEntry
}

export default {
  isValidEmail,
  isStrongPassword,
  sanitizeInput,
  isValidPhoneNumber,
  isValidUrl,
  isValidId,
  isValidRole,
  sanitizeObject,
  checkRateLimit,
  clearRateLimit,
  generateCSRFToken,
  verifyCSRFToken,
  getSecurityHeaders,
  encryptData,
  decryptData,
  getClientIP,
  isIPBlocked,
  logSecurityEvent,
}
