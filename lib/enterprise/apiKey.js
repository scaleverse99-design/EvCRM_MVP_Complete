// ── lib/enterprise/apiKey.js ─────────────────────────────────────────
// Enterprise API key management for CTE Cloud Partner integrations.
// Handles key generation, validation, rate-limit enforcement, and
// per-client usage tracking for AWS/GCP/Azure Marketplace billing.

import { getSupabaseAdmin } from "../supabaseAdmin"
import crypto from "crypto"

// Tier limits (API calls per month)
export const TIER_LIMITS = {
  developer:  100_000,
  growth:   1_000_000,
  enterprise: Infinity,
}

// Pricing (USD per call — what CTE earns after cloud fee)
export const TIER_PRICING_USD = {
  developer:  0.0002,
  growth:     0.0002,
  enterprise: 0.0002,
}

// Cloud marketplace platform enum
export const CLOUD_PLATFORMS = ["aws", "gcp", "azure", "direct"]

/**
 * Generates a new CTE Enterprise API key and persists it to Supabase.
 * Returns the full key (only shown once — never returned again from DB).
 */
export async function generateApiKey({ clientName, clientEmail, tier = "developer", cloudPlatform = "direct", metadata = {} }) {
  const sb = getSupabaseAdmin()
  if (!sb) throw new Error("Supabase not configured")

  if (!TIER_LIMITS[tier]) throw new Error(`Invalid tier: ${tier}`)
  if (!CLOUD_PLATFORMS.includes(cloudPlatform)) throw new Error(`Invalid cloudPlatform: ${cloudPlatform}`)

  const rawKey = `cte_live_${crypto.randomBytes(24).toString("hex")}`
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")
  const clientId = `client_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`
  const now = new Date().toISOString()

  const record = {
    clientId,
    clientName,
    clientEmail,
    tier,
    cloudPlatform,
    keyHash,           // Only store the hash — never the raw key
    status: "active",
    monthlyCallCount: 0,
    totalCallCount: 0,
    billingMonthStart: now,
    createdAt: now,
    metadata,
  }

  const { error } = await sb.from("enterprise_clients").insert({ id: clientId, data: record })
  if (error) throw new Error(`Failed to create enterprise client: ${error.message}`)

  return { clientId, apiKey: rawKey, tier, cloudPlatform, createdAt: now }
}

/**
 * Validates an incoming API key. Returns the client record if valid,
 * throws an error with the appropriate HTTP status code if invalid.
 */
export async function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith("cte_live_")) {
    const err = new Error("Invalid or missing CTE API key. Pass your key in the Authorization header: Bearer cte_live_...")
    err.status = 401
    throw err
  }

  const sb = getSupabaseAdmin()
  if (!sb) throw new Error("Supabase not configured")

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")

  const { data, error } = await sb
    .from("enterprise_clients")
    .select("data")
    .eq("data->>keyHash", keyHash)
    .single()

  if (error || !data) {
    const err = new Error("API key not found")
    err.status = 401
    throw err
  }

  const client = data.data
  if (client.status !== "active") {
    const err = new Error(`API key is ${client.status}. Please contact support@evcrm.in.`)
    err.status = 403
    throw err
  }

  // Rate limit check
  const limit = TIER_LIMITS[client.tier]
  if (client.monthlyCallCount >= limit) {
    const err = new Error(`Monthly API limit reached (${limit.toLocaleString()} calls for ${client.tier} tier). Upgrade at evcrm.in/enterprise.`)
    err.status = 429
    throw err
  }

  return client
}

/**
 * Increments the call counter for a client and logs usage to Supabase.
 * Called after every successful enterprise API call.
 */
export async function recordApiCall(clientId, { toolName, queryHash, estimatedTokensSaved = 400 }) {
  const sb = getSupabaseAdmin()
  if (!sb) return

  const now = new Date().toISOString()

  // Log the individual call to enterprise_usage
  const usageRecord = {
    id: `usage_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    clientId,
    toolName,
    queryHash,
    estimatedTokensSaved,
    timestamp: now,
  }

  // Upsert usage log and increment counters in parallel
  await Promise.allSettled([
    sb.from("enterprise_usage").insert({ id: usageRecord.id, data: usageRecord }),
    sb.rpc("increment_enterprise_call_count", { p_client_id: clientId }).catch(() => {
      // Fallback: manual read-modify-write if RPC not available
      return sb
        .from("enterprise_clients")
        .select("data")
        .eq("id", clientId)
        .single()
        .then(({ data }) => {
          if (!data) return
          const updated = {
            ...data.data,
            monthlyCallCount: (data.data.monthlyCallCount || 0) + 1,
            totalCallCount: (data.data.totalCallCount || 0) + 1,
            lastCallAt: now,
          }
          return sb.from("enterprise_clients").update({ data: updated }).eq("id", clientId)
        })
    }),
  ])
}

/**
 * Returns the monthly usage summary for a client (for billing reconciliation).
 */
export async function getMonthlyUsage(clientId) {
  const sb = getSupabaseAdmin()
  if (!sb) return null

  const { data: clientRow } = await sb
    .from("enterprise_clients")
    .select("data")
    .eq("id", clientId)
    .single()

  if (!clientRow) return null
  const client = clientRow.data

  const billingStart = new Date(client.billingMonthStart).toISOString()
  const { data: usageLogs } = await sb
    .from("enterprise_usage")
    .select("data")
    .eq("data->>clientId", clientId)
    .gte("data->>timestamp", billingStart)

  const calls = usageLogs?.length || 0
  const earningsUSD = calls * TIER_PRICING_USD[client.tier]

  return {
    clientId,
    clientName: client.clientName,
    tier: client.tier,
    cloudPlatform: client.cloudPlatform,
    billingMonthStart: client.billingMonthStart,
    totalCallsThisMonth: calls,
    cteEarningsUSD: earningsUSD.toFixed(4),
    cteEarningsINR: (earningsUSD * 84).toFixed(2),
    limit: TIER_LIMITS[client.tier],
    remainingCalls: Math.max(0, TIER_LIMITS[client.tier] - calls),
  }
}

/**
 * Lists all enterprise clients (for admin dashboard).
 */
export async function listEnterpriseClients() {
  const sb = getSupabaseAdmin()
  if (!sb) return []

  const { data, error } = await sb.from("enterprise_clients").select("data")
  if (error) return []
  return (data || []).map(row => row.data)
}

/**
 * Deactivates an API key (called from marketplace unsubscribe webhooks).
 */
export async function deactivateApiKey(clientId, reason = "unsubscribed") {
  const sb = getSupabaseAdmin()
  if (!sb) return

  const { data } = await sb
    .from("enterprise_clients")
    .select("data")
    .eq("id", clientId)
    .single()

  if (!data) return

  const updated = {
    ...data.data,
    status: "cancelled",
    cancellationReason: reason,
    cancelledAt: new Date().toISOString(),
  }

  await sb.from("enterprise_clients").update({ data: updated }).eq("id", clientId)
}
