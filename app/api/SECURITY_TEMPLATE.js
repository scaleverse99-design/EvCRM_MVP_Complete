/**
 * API Route Security Template
 * Use this as a template for creating secure API routes
 * 
 * Example: app/api/example/secure-endpoint/route.js
 */

import { NextResponse } from "next/server"
import {
  sanitizeInput,
  sanitizeObject,
  isValidEmail,
  getClientIP,
  logSecurityEvent,
} from "../../../../lib/security"
import { protectedAPI } from "../../../../lib/apiProtection"
import { findUserById } from "../../../../lib/db"

/**
 * Example: GET /api/example/secure-endpoint
 * 
 * Query params:
 * - search: string to search for (optional)
 * 
 * Returns: { success: true, data: [...] }
 */
export const GET = protectedAPI(
  async (req, user, { clientIP, rateLimitResult }) => {
    try {
      // ── 1. Get and validate query parameters ─────────────────
      const { searchParams } = req.nextUrl
      const searchQuery = searchParams.get("search") || ""
      
      // Sanitize and validate
      const cleanSearch = sanitizeInput(searchQuery)
      
      if (cleanSearch && cleanSearch.length > 100) {
        return {
          success: false,
          error: "Search query too long (max 100 characters)",
        }
      }

      // ── 2. Check user permissions ────────────────────────────
      // (Already checked by protectedAPI, but you can add extra checks)
      if (user.role !== "admin" && user.role !== "dealer") {
        logSecurityEvent("UNAUTHORIZED_ACCESS_ATTEMPT", {
          userId: user.userId,
          userRole: user.role,
          endpoint: "/api/example/secure-endpoint",
          ip: clientIP,
        })
        return {
          success: false,
          error: "Insufficient permissions",
          status: 403,
        }
      }

      // ── 3. Fetch data from database (with permission check)
      // This is pseudo-code; adjust for your database
      const data = await fetchSecureData(user, cleanSearch)

      // ── 4. Log successful access
      logSecurityEvent("DATA_ACCESSED", {
        userId: user.userId,
        resource: "example_resource",
        query: cleanSearch ? "with search" : "full list",
        ip: clientIP,
      })

      return {
        success: true,
        data: data,
        rateLimitRemaining: rateLimitResult.remaining,
      }

    } catch (error) {
      console.error("[GET /api/example/secure-endpoint] Error:", error.message)
      logSecurityEvent("API_ERROR", {
        endpoint: "/api/example/secure-endpoint",
        error: error.message,
        method: "GET",
      })
      return {
        success: false,
        error: "An unexpected error occurred",
        status: 500,
      }
    }
  },
  {
    requireAuth: true,
    requiredRoles: ["dealer", "admin"], // Only these roles can access
    method: "GET",
    rateLimit: 30, // 30 requests per minute
    rateLimitWindow: 60,
  }
)

/**
 * Example: POST /api/example/secure-endpoint
 * 
 * Body:
 * {
 *   name: string (required, max 100 chars),
 *   email: string (required, valid email),
 *   description: string (optional, max 500 chars)
 * }
 * 
 * Returns: { success: true, data: { id, ... } }
 */
export const POST = protectedAPI(
  async (req, user, { clientIP }) => {
    try {
      // ── 1. Parse and validate request body ───────────────────
      const body = await req.json()

      // Validate required fields
      if (!body.name || !body.email) {
        return {
          success: false,
          error: "Name and email are required",
          status: 400,
        }
      }

      // Sanitize inputs
      const cleanData = sanitizeObject(body, ["name", "email", "description"])

      // ── 2. Validate email format ──────────────────────────────
      if (!isValidEmail(cleanData.email)) {
        return {
          success: false,
          error: "Invalid email format",
          status: 400,
        }
      }

      // ── 3. Check for duplicate email ──────────────────────────
      const exists = await checkDuplicateEmail(cleanData.email, user.userId)
      if (exists) {
        return {
          success: false,
          error: "Email already exists",
          status: 409,
        }
      }

      // ── 4. Create resource with user ownership ───────────────
      const newResource = {
        id: `res_${Date.now()}`,
        name: cleanData.name,
        email: cleanData.email,
        description: cleanData.description || "",
        created_by: user.userId,
        created_at: new Date().toISOString(),
        dealership_id: user.dealership, // Link to user's dealership
      }

      // ── 5. Save to database
      await saveResource(newResource)

      // ── 6. Log action
      logSecurityEvent("DATA_CREATED", {
        userId: user.userId,
        resource: "example_resource",
        resourceId: newResource.id,
        ip: clientIP,
      })

      return {
        success: true,
        data: {
          id: newResource.id,
          name: newResource.name,
          email: newResource.email,
        },
        message: "Resource created successfully",
      }

    } catch (error) {
      console.error("[POST /api/example/secure-endpoint] Error:", error.message)
      logSecurityEvent("API_ERROR", {
        endpoint: "/api/example/secure-endpoint",
        error: error.message,
        method: "POST",
        userId: user?.userId,
      })
      return {
        success: false,
        error: "Failed to create resource",
        status: 500,
      }
    }
  },
  {
    requireAuth: true,
    requiredRoles: ["dealer", "admin"],
    method: "POST",
    rateLimit: 10, // 10 requests per minute (stricter for write)
    rateLimitWindow: 60,
  }
)

/**
 * Example: PUT /api/example/secure-endpoint
 * 
 * Body:
 * {
 *   id: string (required),
 *   name: string (optional),
 *   description: string (optional)
 * }
 */
export const PUT = protectedAPI(
  async (req, user, { clientIP }) => {
    try {
      const body = await req.json()

      if (!body.id) {
        return {
          success: false,
          error: "Resource ID is required",
          status: 400,
        }
      }

      // ── Check ownership ──────────────────────────────────────
      const resource = await getResourceById(body.id, user)
      
      if (!resource) {
        return {
          success: false,
          error: "Resource not found or you don't have access",
          status: 404,
        }
      }

      if (resource.created_by !== user.userId && user.role !== "admin") {
        logSecurityEvent("UNAUTHORIZED_UPDATE_ATTEMPT", {
          userId: user.userId,
          resourceId: body.id,
          ip: clientIP,
        })
        return {
          success: false,
          error: "You don't have permission to update this resource",
          status: 403,
        }
      }

      // ── Update resource ─────────────────────────────────────
      const cleanData = sanitizeObject(body, ["name", "description"])
      const updated = await updateResource(body.id, cleanData)

      logSecurityEvent("DATA_UPDATED", {
        userId: user.userId,
        resourceId: body.id,
        ip: clientIP,
      })

      return {
        success: true,
        data: updated,
      }

    } catch (error) {
      console.error("[PUT /api/example/secure-endpoint] Error:", error.message)
      logSecurityEvent("API_ERROR", {
        endpoint: "/api/example/secure-endpoint",
        error: error.message,
        method: "PUT",
      })
      return {
        success: false,
        error: "Failed to update resource",
        status: 500,
      }
    }
  },
  {
    requireAuth: true,
    requiredRoles: ["dealer", "admin"],
    method: "PUT",
    rateLimit: 10,
    rateLimitWindow: 60,
  }
)

/**
 * Example: DELETE /api/example/secure-endpoint
 */
export const DELETE = protectedAPI(
  async (req, user, { clientIP }) => {
    try {
      const { searchParams } = req.nextUrl
      const resourceId = searchParams.get("id")

      if (!resourceId) {
        return {
          success: false,
          error: "Resource ID is required",
          status: 400,
        }
      }

      // ── Check ownership ──────────────────────────────────────
      const resource = await getResourceById(resourceId, user)
      
      if (!resource) {
        return {
          success: false,
          error: "Resource not found",
          status: 404,
        }
      }

      if (resource.created_by !== user.userId && user.role !== "admin") {
        logSecurityEvent("UNAUTHORIZED_DELETE_ATTEMPT", {
          userId: user.userId,
          resourceId,
          ip: clientIP,
        })
        return {
          success: false,
          error: "You don't have permission to delete this resource",
          status: 403,
        }
      }

      // ── Soft delete (set deleted_at timestamp) ───────────────
      await softDeleteResource(resourceId)

      logSecurityEvent("DATA_DELETED", {
        userId: user.userId,
        resourceId,
        ip: clientIP,
      })

      return {
        success: true,
        message: "Resource deleted successfully",
      }

    } catch (error) {
      console.error("[DELETE /api/example/secure-endpoint] Error:", error.message)
      return {
        success: false,
        error: "Failed to delete resource",
        status: 500,
      }
    }
  },
  {
    requireAuth: true,
    requiredRoles: ["dealer", "admin"],
    method: "DELETE",
    rateLimit: 5, // Very restrictive for delete
    rateLimitWindow: 60,
  }
)

// ── Helper Functions (stub implementations) ──────────────────────

async function fetchSecureData(user, searchQuery) {
  // TODO: Implement data fetching with proper permission checks
  // Make sure to filter by dealership_id === user.dealership
  return []
}

async function checkDuplicateEmail(email, userId) {
  // TODO: Check if email already exists
  return false
}

async function saveResource(resource) {
  // TODO: Save to database
}

async function getResourceById(id, user) {
  // TODO: Fetch resource and verify user has access
  return null
}

async function updateResource(id, data) {
  // TODO: Update resource
  return data
}

async function softDeleteResource(id) {
  // TODO: Mark as deleted instead of hard delete
}

export default { GET, POST, PUT, DELETE }
