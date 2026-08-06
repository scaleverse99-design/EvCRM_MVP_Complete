/**
 * API Protection Wrapper
 * Enforces authentication, validation, rate limiting, and security checks
 * on all API routes
 */

import { NextResponse } from "next/server"
import { verifyToken } from "./auth"
import { findSession } from "./db"
import {
  checkRateLimit,
  getClientIP,
  isIPBlocked,
  getSecurityHeaders,
  logSecurityEvent,
} from "./security"

// IP blocklist (can be loaded from database in production)
const IP_BLOCKLIST = process.env.IP_BLOCKLIST?.split(",") || []

/**
 * Protected API wrapper
 * Provides authentication, validation, and security checks
 * 
 * Usage:
 * export const POST = protectedAPI(async (req, user) => {
 *   // Your handler logic here
 *   return { success: true, data: ... }
 * }, { requireAuth: true, rateLimit: 10 })
 */
export function protectedAPI(handler, options = {}) {
  const {
    requireAuth = true,
    requiredRoles = null, // null = any role, or array like ["dealer", "admin"]
    method = "POST", // "POST", "GET", "PUT", "DELETE", etc.
    rateLimit = 30, // requests per minute
    rateLimitWindow = 60, // seconds
    allowedMethods = null, // null = only specified method
  } = options

  return async (req) => {
    try {
      // ── 1. Check HTTP method ────────────────────────────────────
      const reqMethod = req.method
      const allowedList = allowedMethods || [method]
      
      if (!allowedList.includes(reqMethod)) {
        return sendError("Method not allowed", 405, req)
      }

      // ── 2. Get client IP ────────────────────────────────────────
      const clientIP = getClientIP(req.headers)

      // ── 3. Check IP blocklist ───────────────────────────────────
      if (isIPBlocked(clientIP, IP_BLOCKLIST)) {
        logSecurityEvent("IP_BLOCKED", { ip: clientIP, path: req.nextUrl.pathname })
        return sendError("Access denied", 403, req)
      }

      // ── 4. Rate limiting ────────────────────────────────────────
      const rateLimitKey = `api_${clientIP}_${req.nextUrl.pathname}`
      const rateLimitResult = checkRateLimit(rateLimitKey, rateLimit, rateLimitWindow)

      if (!rateLimitResult.allowed) {
        logSecurityEvent("RATE_LIMIT_EXCEEDED", { 
          ip: clientIP, 
          path: req.nextUrl.pathname,
          limit: rateLimit,
          window: rateLimitWindow
        })
        
        const response = sendError("Rate limit exceeded", 429, req)
        response.headers.set("Retry-After", String(rateLimitResult.retryAfter))
        return response
      }

      // ── 5. Authentication check ─────────────────────────────────
      let user = null
      
      if (requireAuth) {
        // Extract token from cookie or Authorization header
        const token = extractToken(req)

        if (!token) {
          logSecurityEvent("AUTH_MISSING", { ip: clientIP, path: req.nextUrl.pathname })
          return sendError("Authentication required", 401, req)
        }

        // Verify token
        const decoded = verifyToken(token)
        
        if (!decoded || !decoded.userId) {
          logSecurityEvent("AUTH_INVALID", { ip: clientIP, path: req.nextUrl.pathname })
          return sendError("Invalid or expired token", 401, req)
        }

        // Check session exists in DB (for token revocation)
        const hashToken = require("crypto")
          .createHash("sha256")
          .update(token)
          .digest("hex")
        
        const session = await findSession(hashToken)
        
        if (!session) {
          logSecurityEvent("SESSION_NOT_FOUND", { userId: decoded.userId, ip: clientIP })
          return sendError("Session not found or expired", 401, req)
        }

        user = decoded

        // ── 6. Role-based access control ────────────────────────
        if (requiredRoles && !requiredRoles.includes(user.role)) {
          logSecurityEvent("RBAC_DENIED", { 
            userId: user.userId,
            role: user.role,
            required: requiredRoles,
            path: req.nextUrl.pathname
          })
          return sendError("Insufficient permissions", 403, req)
        }
      }

      // ── 7. Call the handler ─────────────────────────────────────
      const result = await handler(req, user, { clientIP, rateLimitResult })

      // ── 8. Add security headers to response ─────────────────────
      const response = new NextResponse(JSON.stringify(result), { status: 200 })
      
      Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      response.headers.set("X-Request-ID", generateRequestId())
      response.headers.set("X-Content-Type-Options", "nosniff")
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")

      return response

    } catch (error) {
      console.error("[API Protection] Error:", error)
      logSecurityEvent("API_ERROR", { 
        error: error.message,
        path: req.nextUrl.pathname,
        method: req.method
      })
      return sendError("Internal server error", 500, req)
    }
  }
}

/**
 * Extract JWT token from request
 * Checks both Authorization header and cookies
 */
function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers.get("authorization") || ""
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  
  if (bearerMatch) {
    return bearerMatch[1]
  }

  // Check cookies
  const cookieHeader = req.headers.get("cookie") || ""
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map(c => {
      const [key, ...val] = c.split("=")
      return [key, val.join("=")]
    })
  )

  return cookies.auth_token || null
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Send error response with security headers
 */
function sendError(message, status, req) {
  const response = new NextResponse(
    JSON.stringify({ error: message, status }),
    { status }
  )

  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  response.headers.set("X-Request-ID", generateRequestId())
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")

  return response
}

export default protectedAPI
