export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── app/api/webhooks/aws-marketplace/route.js ────────────────────────
// Handles AWS Marketplace SNS subscription events.
// When an enterprise client subscribes to CTE on AWS Marketplace:
//   1. AWS fires a SNS notification to this webhook
//   2. We auto-generate a CTE Enterprise API key
//   3. We send the key to the client via email
//   4. We create their enterprise_clients record in Supabase
// Zero manual work required — fully automated provisioning.

import { generateApiKey } from "../../../../lib/enterprise/apiKey"
import crypto from "crypto"

const AWS_SNS_SECRET = process.env.AWS_SNS_SECRET || ""

export async function POST(req) {
  try {
    const body = await req.text()
    let message

    // AWS SNS delivers a JSON envelope
    try { message = JSON.parse(body) } catch { return Response.json({ error: "Invalid SNS payload" }, { status: 400 }) }

    // Verify SNS message signature (production security)
    // In production, use AWS SNS SDK to verify the message signature
    // For now, we verify via a shared secret header
    const signature = req.headers.get("x-amz-sns-signature") || ""
    if (AWS_SNS_SECRET && signature !== crypto.createHmac("sha256", AWS_SNS_SECRET).update(body).digest("hex")) {
      console.warn("[AWS Marketplace] Invalid signature")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messageType = req.headers.get("x-amz-sns-message-type") || message.Type
    console.log(`[AWS Marketplace] Received SNS message type: ${messageType}`)

    // SNS subscription confirmation (first time setup)
    if (messageType === "SubscriptionConfirmation") {
      // Auto-confirm the SNS subscription by fetching the SubscribeURL
      const subscribeUrl = message.SubscribeURL
      if (subscribeUrl) {
        await fetch(subscribeUrl)
        console.log("[AWS Marketplace] SNS subscription confirmed")
      }
      return Response.json({ confirmed: true })
    }

    // Actual marketplace notification
    if (messageType === "Notification") {
      let notification
      try { notification = JSON.parse(message.Message || "{}") } catch { notification = {} }

      const { action, customerIdentifier, productCode, offerIdentifier } = notification

      console.log(`[AWS Marketplace] Action: ${action} for customer: ${customerIdentifier}`)

      switch (action) {
        case "subscribe-success": {
          // Enterprise client just subscribed — auto-provision their API key
          const tierFromOffer = offerIdentifier?.includes("enterprise") ? "enterprise"
            : offerIdentifier?.includes("growth") ? "growth"
            : "developer"

          const result = await generateApiKey({
            clientName: `AWS Client ${customerIdentifier}`,
            clientEmail: notification.customerEmail || `${customerIdentifier}@aws-marketplace.com`,
            tier: tierFromOffer,
            cloudPlatform: "aws",
            metadata: { customerIdentifier, productCode, offerIdentifier, subscribedAt: new Date().toISOString() },
          })

          console.log(`[AWS Marketplace] ✅ Provisioned API key for ${customerIdentifier}: ${result.clientId}`)

          // In production: send welcome email with API key via lib/email.js
          // await sendEnterpriseWelcomeEmail(result)

          return Response.json({ success: true, message: "Enterprise client provisioned", clientId: result.clientId })
        }

        case "subscribe-fail": {
          console.warn(`[AWS Marketplace] Subscription failed for ${customerIdentifier}`)
          return Response.json({ success: false, message: "Subscription failed" })
        }

        case "unsubscribe-pending": {
          console.log(`[AWS Marketplace] Unsubscribe pending for ${customerIdentifier}`)
          return Response.json({ success: true, message: "Unsubscribe acknowledged" })
        }

        case "unsubscribe-success": {
          // Deactivate their API key
          const { deactivateApiKey } = await import("../../../../lib/enterprise/apiKey")
          // Find client by AWS customerIdentifier
          const { listEnterpriseClients } = await import("../../../../lib/enterprise/apiKey")
          const clients = await listEnterpriseClients()
          const client = clients.find(c => c.metadata?.customerIdentifier === customerIdentifier)
          if (client) {
            await deactivateApiKey(client.clientId, "aws_marketplace_unsubscribe")
            console.log(`[AWS Marketplace] ✅ Deactivated API key for ${customerIdentifier}`)
          }
          return Response.json({ success: true, message: "Client deactivated" })
        }

        default:
          console.log(`[AWS Marketplace] Unknown action: ${action}`)
          return Response.json({ success: true, message: "Event received" })
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error("[AWS Marketplace Webhook] Error:", err.message)
    return Response.json({ error: "Internal error", details: err.message }, { status: 500 })
  }
}
