export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── app/api/webhooks/azure-marketplace/route.js ──────────────────────
// Handles Azure SaaS Fulfillment API v2 subscription lifecycle events.
// Azure Marketplace uses a two-step subscription flow:
//   Step 1: Client subscribes on Azure Portal → Azure sends subscription token
//   Step 2: We resolve the token and activate the subscription
// This webhook handles: Subscribed, Unsubscribed, SuspendedDueToNonPayment

import { generateApiKey, deactivateApiKey, listEnterpriseClients } from "../../../../lib/enterprise/apiKey"

const AZURE_CLIENT_ID = process.env.AZURE_MARKETPLACE_CLIENT_ID || ""
const AZURE_CLIENT_SECRET = process.env.AZURE_MARKETPLACE_CLIENT_SECRET || ""
const AZURE_TENANT_ID = process.env.AZURE_MARKETPLACE_TENANT_ID || ""

/**
 * Gets an Azure AD token for calling Azure Marketplace Fulfillment API.
 */
async function getAzureToken() {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: "20e940b3-4c77-4b0b-9a53-9e16a1b010a7/.default",
    })

    const resp = await fetch(tokenUrl, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } })
    const data = await resp.json()
    return data.access_token
  } catch (err) {
    console.error("[Azure Marketplace] Failed to get token:", err.message)
    return null
  }
}

/**
 * Activates an Azure SaaS subscription via Fulfillment API v2.
 */
async function activateAzureSubscription(subscriptionId, planId) {
  try {
    const token = await getAzureToken()
    if (!token) return false

    const url = `https://marketplaceapi.microsoft.com/api/saas/subscriptions/${subscriptionId}/activate?api-version=2018-08-31`
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ planId, quantity: "0" }),
    })

    console.log(`[Azure Marketplace] Activate subscription ${subscriptionId}: ${resp.status}`)
    return resp.ok
  } catch (err) {
    console.error("[Azure Marketplace] Subscription activation failed:", err.message)
    return false
  }
}

export async function POST(req) {
  try {
    const body = await req.text()
    let notification
    try { notification = JSON.parse(body) } catch {
      return Response.json({ error: "Invalid Azure webhook payload" }, { status: 400 })
    }

    const { id: subscriptionId, publisherId, offerId, planId, action, subscription } = notification

    console.log(`[Azure Marketplace] Action: ${action} for subscription: ${subscriptionId}`)

    switch (action) {
      case "Subscribed": {
        // New enterprise client subscribed on Azure Portal
        const tierFromPlan = planId?.includes("enterprise") ? "enterprise"
          : planId?.includes("growth") ? "growth"
          : "developer"

        const clientEmail = subscription?.beneficiary?.emailId || subscription?.purchaser?.emailId || "support@evcrm.in"
        const clientName = subscription?.name || `Azure Client ${subscriptionId}`

        const result = await generateApiKey({
          clientName,
          clientEmail,
          tier: tierFromPlan,
          cloudPlatform: "azure",
          metadata: {
            azureSubscriptionId: subscriptionId,
            planId,
            offerId,
            publisherId,
            subscribedAt: new Date().toISOString(),
          },
        })

        // Activate the subscription via Azure Fulfillment API
        await activateAzureSubscription(subscriptionId, planId)

        console.log(`[Azure Marketplace] ✅ Provisioned for Azure subscription ${subscriptionId}: ${result.clientId}`)
        return Response.json({ success: true, clientId: result.clientId })
      }

      case "Unsubscribed": {
        // Find and deactivate the CTE enterprise client
        const clients = await listEnterpriseClients()
        const client = clients.find(c => c.metadata?.azureSubscriptionId === subscriptionId)
        if (client) {
          await deactivateApiKey(client.clientId, "azure_marketplace_unsubscribed")
          console.log(`[Azure Marketplace] ✅ Deactivated client for Azure subscription ${subscriptionId}`)
        }
        return Response.json({ success: true })
      }

      case "SuspendedDueToNonPayment": {
        // Temporarily suspend (don't fully deactivate — Azure can reinstate)
        console.warn(`[Azure Marketplace] Subscription ${subscriptionId} suspended due to non-payment`)
        const clients = await listEnterpriseClients()
        const client = clients.find(c => c.metadata?.azureSubscriptionId === subscriptionId)
        if (client) {
          // Mark as suspended
          const { getSupabaseAdmin } = await import("../../../../lib/supabaseAdmin")
          const sb = getSupabaseAdmin()
          if (sb) {
            const { data } = await sb.from("enterprise_clients").select("data").eq("id", client.clientId).single()
            if (data) {
              await sb.from("enterprise_clients").update({ data: { ...data.data, status: "suspended", suspendedAt: new Date().toISOString() } }).eq("id", client.clientId)
            }
          }
        }
        return Response.json({ success: true })
      }

      case "Reinstated": {
        // Reactivate a suspended subscription
        const clients = await listEnterpriseClients()
        const client = clients.find(c => c.metadata?.azureSubscriptionId === subscriptionId)
        if (client) {
          const { getSupabaseAdmin } = await import("../../../../lib/supabaseAdmin")
          const sb = getSupabaseAdmin()
          if (sb) {
            const { data } = await sb.from("enterprise_clients").select("data").eq("id", client.clientId).single()
            if (data) {
              await sb.from("enterprise_clients").update({ data: { ...data.data, status: "active", reinstatedAt: new Date().toISOString() } }).eq("id", client.clientId)
            }
          }
        }
        return Response.json({ success: true })
      }

      case "ChangePlan": {
        console.log(`[Azure Marketplace] Plan change for ${subscriptionId}: ${planId}`)
        return Response.json({ success: true })
      }

      default:
        console.log(`[Azure Marketplace] Unhandled action: ${action}`)
        return Response.json({ success: true })
    }
  } catch (err) {
    console.error("[Azure Marketplace Webhook] Error:", err.message)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}
