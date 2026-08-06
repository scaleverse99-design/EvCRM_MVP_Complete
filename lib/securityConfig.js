/**
 * Security Configuration
 * Centralized security policies and configurations
 */

// ── Rate Limiting Policies ────────────────────────────────────────
export const rateLimitPolicies = {
  auth: {
    login: { requests: 5, window: 900 }, // 5 per 15 minutes
    register: { requests: 3, window: 3600 }, // 3 per hour
    passwordReset: { requests: 3, window: 3600 }, // 3 per hour
  },
  api: {
    default: { requests: 30, window: 60 }, // 30 per minute
    search: { requests: 10, window: 60 }, // 10 per minute (heavy operation)
    upload: { requests: 5, window: 60 }, // 5 per minute
    payment: { requests: 3, window: 60 }, // 3 per minute
  },
  webhook: {
    default: { requests: 100, window: 60 }, // 100 per minute
  }
}

// ── Password Policy ───────────────────────────────────────────────
export const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUpperCase: true,
  requireLowerCase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: "!@#$%^&*()_+-=[]{}';:\"\\|,.<>/?",
  passwordExpiryDays: 90, // Require change every 90 days
  passwordHistoryCount: 5, // Can't reuse last 5 passwords
}

// ── Session Policy ────────────────────────────────────────────────
export const sessionPolicy = {
  expiryDays: 7,
  absoluteMaxAgeDays: 30, // Force logout after 30 days
  idleTimeoutMinutes: 30, // Logout if inactive for 30 minutes
  requireMfaAfterIdleMinutes: 15, // Require MFA re-authentication after 15 minutes idle
  maxConcurrentSessions: 3, // Max 3 simultaneous sessions per user
  invalidateOnPasswordChange: true,
  invalidateOnRoleChange: true,
}

// ── Encryption Policy ─────────────────────────────────────────────
export const encryptionPolicy = {
  algorithm: "aes-256-gcm",
  fieldsToEncrypt: [
    "payment_info",
    "bank_details",
    "social_security",
    "government_id",
    "personal_notes",
  ],
  keyRotationDays: 90,
}

// ── File Upload Policy ────────────────────────────────────────────
export const fileUploadPolicy = {
  maxFileSizeMB: 50,
  maxTotalUploadMB: 500,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  allowedExtensions: [
    "jpg", "jpeg", "png", "webp",
    "pdf",
    "doc", "docx",
    "xls", "xlsx",
  ],
  virusScanning: true,
  storageLocation: "secure-uploads", // Don't store in web root
  serveVia: "proxy", // Serve through /api/files proxy, not directly
  deleteAfterDays: 365, // Auto-delete after 1 year
}

// ── CORS Policy ───────────────────────────────────────────────────
export const corsPolicy = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "https://evcrm.in",
    "https://www.evcrm.in",
    "https://*.evcrm.in",
  ],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count", "X-Request-ID"],
  credentials: true,
  maxAge: 3600, // Preflight cache for 1 hour
}

// ── HTTP Security Headers ─────────────────────────────────────────
export const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com; " +
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
    "font-src 'self' fonts.gstatic.com data:; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' *.supabase.co *.googleapis.com *.razorpay.com https:;",
}

// ── IP Allowlist / Blocklist ──────────────────────────────────────
export const ipPolicy = {
  blocklist: process.env.IP_BLOCKLIST?.split(",") || [],
  allowlist: null, // If set, only these IPs are allowed
  checkHeaders: [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-client-ip",
  ],
}

// ── API Key Policy ────────────────────────────────────────────────
export const apiKeyPolicy = {
  rotationDays: 90,
  expiryWarningDays: 14, // Warn 14 days before expiry
  requirePrefix: "sk_", // Secret keys must start with this
  minKeyLength: 32,
  maxActiveKeys: 5, // Max 5 active keys per user
}

// ── Logging Policy ────────────────────────────────────────────────
export const loggingPolicy = {
  logLevels: {
    security: "always", // Always log security events
    authentication: "always",
    authorization: "always",
    errors: "always",
    api: "on-error", // Only log on error
    database: "debug", // Only in debug mode
  },
  sensitiveFieldsToMask: [
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
  ],
  retentionDays: 90,
  compressionAfterDays: 7,
}

// ── Audit Trail Policy ────────────────────────────────────────────
export const auditPolicy = {
  eventsToTrack: [
    "user.login",
    "user.logout",
    "user.created",
    "user.updated",
    "user.deleted",
    "role.changed",
    "permission.granted",
    "permission.revoked",
    "data.accessed",
    "data.created",
    "data.updated",
    "data.deleted",
    "file.uploaded",
    "file.downloaded",
    "payment.initiated",
    "payment.completed",
    "api.error",
    "security.incident",
  ],
  retentionYears: 3,
  immutable: true, // Audit logs cannot be modified
}

// ── Compliance Requirements ───────────────────────────────────────
export const compliancePolicy = {
  standards: [
    "GDPR", // Europe
    "ISO 27001", // Information Security
    "SOC 2", // Security & Availability
  ],
  dataResidency: "India", // Store data in India
  encryption: "required", // All data at rest must be encrypted
  auditRetention: 3, // Keep audit logs for 3 years
}

// ── Two-Factor Authentication Policy ──────────────────────────────
export const mfaPolicy = {
  enabled: true,
  optional: false, // Make MFA mandatory
  methods: ["totp", "email", "sms"], // Supported MFA methods
  totpIssuer: "EvCRM",
  codeLength: 6,
  codeExpirySeconds: 30,
  backupCodesCount: 10,
  requireMfaForRoles: ["admin", "superadmin"], // Mandatory for admins
}

// ── Data Classification ───────────────────────────────────────────
export const dataClassification = {
  public: {
    encryption: false,
    accessControl: false,
    examples: ["blog posts", "public listings"],
  },
  internal: {
    encryption: false,
    accessControl: true,
    examples: ["team communications"],
  },
  confidential: {
    encryption: true,
    accessControl: true,
    examples: ["customer data", "business metrics"],
  },
  restricted: {
    encryption: true,
    accessControl: true,
    auditRequired: true,
    examples: ["financial data", "payment info", "government IDs"],
  },
}

// ── Webhook Security ──────────────────────────────────────────────
export const webhookPolicy = {
  signatureAlgorithm: "sha256",
  retryAttempts: 3,
  retryDelaySeconds: [60, 300, 900], // 1, 5, 15 minutes
  timeout: 30000, // 30 seconds
  maxPayloadSizeMB: 10,
  requireSSL: true,
}

// ── Default Role Permissions ──────────────────────────────────────
export const rolePermissions = {
  superadmin: [
    "admin:read", "admin:write", "admin:delete",
    "user:*",
    "settings:*",
    "audit:*",
  ],
  admin: [
    "user:read", "user:write",
    "data:read", "data:write",
    "reports:read",
  ],
  oem: [
    "vehicles:read", "vehicles:write",
    "orders:read", "orders:write",
    "reports:read",
  ],
  dealer: [
    "inventory:read", "inventory:write",
    "customers:read", "customers:write",
    "orders:read", "orders:write",
  ],
  rep: [
    "leads:read", "leads:write",
    "quotes:read", "quotes:write",
  ],
  customer: [
    "bookings:read", "bookings:write",
    "profile:read", "profile:write",
  ],
}

// ── Security Event Severity Levels ───────────────────────────────
export const securityEventSeverity = {
  CRITICAL: ["massive_data_breach", "complete_system_compromise", "payment_fraud"],
  HIGH: ["unauthorized_access", "permission_escalation", "multiple_auth_failures"],
  MEDIUM: ["suspicious_activity", "rate_limit_exceeded", "unusual_location"],
  LOW: ["normal_log_entries", "status_checks"],
}

// ── Helper Functions ──────────────────────────────────────────────

/**
 * Get rate limit policy for an endpoint
 */
export function getRateLimitPolicy(endpoint) {
  const [category, action] = endpoint.split(":")
  return rateLimitPolicies[category]?.[action] || rateLimitPolicies.api.default
}

/**
 * Get allowed file types
 */
export function getAllowedFileTypes() {
  return fileUploadPolicy.allowedExtensions
}

/**
 * Check if field should be encrypted
 */
export function shouldEncrypt(fieldName) {
  return encryptionPolicy.fieldsToEncrypt.some(
    field => fieldName.toLowerCase().includes(field.toLowerCase())
  )
}

/**
 * Mask sensitive fields in logs
 */
export function maskSensitiveFields(data) {
  if (!data || typeof data !== "object") return data

  const masked = { ...data }

  for (const [key, value] of Object.entries(masked)) {
    if (loggingPolicy.sensitiveFieldsToMask.some(
      field => key.toLowerCase().includes(field.toLowerCase())
    )) {
      masked[key] = "***REDACTED***"
    }
  }

  return masked
}

export default {
  rateLimitPolicies,
  passwordPolicy,
  sessionPolicy,
  encryptionPolicy,
  fileUploadPolicy,
  corsPolicy,
  securityHeaders,
  ipPolicy,
  apiKeyPolicy,
  loggingPolicy,
  auditPolicy,
  compliancePolicy,
  mfaPolicy,
  dataClassification,
  webhookPolicy,
  rolePermissions,
  securityEventSeverity,
  getRateLimitPolicy,
  getAllowedFileTypes,
  shouldEncrypt,
  maskSensitiveFields,
}
