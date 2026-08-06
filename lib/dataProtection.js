/**
 * Data Protection Middleware
 * Handles data classification, encryption, and access control
 */

import {
  encryptData,
  decryptData,
  logSecurityEvent,
  getClientIP,
} from "./security"
import { dataClassification, shouldEncrypt } from "./securityConfig"

/**
 * Classify data sensitivity level
 */
export function classifyData(fieldName, value) {
  const field = fieldName.toLowerCase()

  // Restricted data
  if (
    field.includes("payment") ||
    field.includes("credit_card") ||
    field.includes("bank") ||
    field.includes("ssn") ||
    field.includes("social_security") ||
    field.includes("government_id") ||
    field.includes("password")
  ) {
    return "restricted"
  }

  // Confidential data
  if (
    field.includes("email") ||
    field.includes("phone") ||
    field.includes("address") ||
    field.includes("personal") ||
    field.includes("financial")
  ) {
    return "confidential"
  }

  // Internal data
  if (
    field.includes("internal") ||
    field.includes("note") ||
    field.includes("comment")
  ) {
    return "internal"
  }

  // Public data
  return "public"
}

/**
 * Get encryption requirements for data class
 */
export function getEncryptionRequirements(dataClass) {
  return dataClassification[dataClass] || dataClassification.public
}

/**
 * Encrypt sensitive response data
 */
export function encryptResponseData(data, sensitiveFields = []) {
  if (!data || typeof data !== "object") return data

  const encrypted = { ...data }

  for (const field of sensitiveFields) {
    if (encrypted[field]) {
      const classification = classifyData(field, encrypted[field])
      const requirements = getEncryptionRequirements(classification)

      if (requirements.encryption) {
        try {
          const key = process.env.ENCRYPTION_KEY
          if (!key) {
            console.warn(`[Data Protection] ENCRYPTION_KEY not set, cannot encrypt ${field}`)
            continue
          }

          const result = encryptData(encrypted[field], key)
          encrypted[field] = {
            encrypted: true,
            ...result,
          }
        } catch (error) {
          console.error(`[Data Protection] Failed to encrypt ${field}:`, error.message)
        }
      }
    }
  }

  return encrypted
}

/**
 * Decrypt sensitive fields in data
 */
export function decryptResponseData(data) {
  if (!data || typeof data !== "object") return data

  const decrypted = { ...data }
  const key = process.env.ENCRYPTION_KEY

  for (const [field, value] of Object.entries(decrypted)) {
    if (value && typeof value === "object" && value.encrypted) {
      try {
        decrypted[field] = decryptData(value.encrypted, value.iv, value.authTag, key)
      } catch (error) {
        console.error(`[Data Protection] Failed to decrypt ${field}:`, error.message)
        decrypted[field] = null
      }
    }
  }

  return decrypted
}

/**
 * Filter data based on user access level
 */
export function filterDataByAccess(data, user, dataPermissions) {
  if (!data || typeof data !== "object") return data

  const filtered = {}

  for (const [field, value] of Object.entries(data)) {
    // Check if user has permission to access this field
    const permission = dataPermissions[field]

    if (!permission) {
      // No permission defined, skip field
      continue
    }

    // Check role-based access
    if (Array.isArray(permission.roles) && !permission.roles.includes(user.role)) {
      logSecurityEvent("FIELD_ACCESS_DENIED", {
        userId: user.userId,
        field,
        userRole: user.role,
      })
      continue
    }

    // Check ownership
    if (permission.ownerOnly && data.created_by !== user.userId && user.role !== "admin") {
      continue
    }

    filtered[field] = value
  }

  return filtered
}

/**
 * Track data access for audit trail
 */
export function trackDataAccess(userId, resourceId, resourceType, accessType = "read") {
  logSecurityEvent(`DATA_${accessType.toUpperCase()}`, {
    userId,
    resourceId,
    resourceType,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Mask sensitive data in logs
 */
export function maskSensitiveData(data) {
  if (!data || typeof data !== "object") return data

  const masked = { ...data }
  const sensitiveFields = [
    "password",
    "password_hash",
    "api_key",
    "secret_key",
    "token",
    "auth_token",
    "otp",
    "credit_card",
    "ssn",
    "social_security",
  ]

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = "***REDACTED***"
    }
  }

  return masked
}

/**
 * Export data for GDPR right to be forgotten
 */
export async function exportUserData(userId) {
  // TODO: Implement data export for user
  // Should include:
  // - User profile data
  // - All records created by user
  // - Audit trail of user actions
  // - Payments and transactions
  return {
    userId,
    exportedAt: new Date().toISOString(),
    data: [],
  }
}

/**
 * Delete user data (GDPR right to be forgotten)
 */
export async function deleteUserData(userId) {
  // TODO: Implement data deletion
  // Should:
  // - Delete user profile
  // - Anonymize user-created records
  // - Delete sessions
  // - Archive audit logs
  logSecurityEvent("DATA_DELETION_REQUESTED", {
    userId,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Anonymize user data
 */
export function anonymizeUserData(userData) {
  return {
    ...userData,
    email: "redacted@example.com",
    name: "Anonymized User",
    phone: "***-***-****",
    address: "Redacted",
  }
}

/**
 * Data retention policy enforcement
 */
export function shouldDeleteData(createdAt, dataType) {
  const retentionDays = {
    audit_logs: 90,
    session_logs: 30,
    error_logs: 30,
    auth_logs: 90,
    deleted_records: 30, // Keep for 30 days before hard delete
  }

  const daysSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  const retention = retentionDays[dataType] || 365

  return daysSinceCreation > retention
}

/**
 * Initialize data protection middleware
 */
export function initializeDataProtection() {
  // Validate encryption key
  if (!process.env.ENCRYPTION_KEY) {
    console.warn("[Data Protection] ENCRYPTION_KEY not set. Encryption disabled.")
  }

  // Set up automated data retention enforcement
  if (process.env.ENABLE_AUTO_RETENTION === "true") {
    setInterval(async () => {
      console.log("[Data Protection] Running automated data retention cleanup...")
      // TODO: Implement automatic cleanup of old logs
    }, 24 * 60 * 60 * 1000) // Run daily
  }

  console.log("[Data Protection] Middleware initialized")
}

export default {
  classifyData,
  getEncryptionRequirements,
  encryptResponseData,
  decryptResponseData,
  filterDataByAccess,
  trackDataAccess,
  maskSensitiveData,
  exportUserData,
  deleteUserData,
  anonymizeUserData,
  shouldDeleteData,
  initializeDataProtection,
}
