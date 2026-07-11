export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

// Customer-token guard: the JWT issued by /api/service/verify
function getCustomer(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try {
    const payload = verifyToken(token)
    // customer tokens carry the phone number in `sub`
    return payload?.role === "customer" && payload?.sub ? { ...payload, phone: payload.sub } : null
  } catch { return null }
}

// ── GET /api/service/requests — customer's own requests ────────────
export async function GET(req) {
  const customer = getCustomer(req)
  if (!customer) return err("Unauthorized", 401)

  const requests = await readTable("service_requests")
  const mine = requests
    .filter(r => r.customerPhone === customer.phone)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return ok({ requests: mine })
}

// ── POST /api/service/requests — raise a new service request ───────
// Body: { customerName, vehicle, orderId, dealership, issueType,
//         description, attachments: [{name,type,data}] }
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024 // ~4MB total (base64)

export async function POST(req) {
  const customer = getCustomer(req)
  if (!customer) return err("Unauthorized", 401)

  const body = await req.json()
  if (!body.description?.trim()) return err("Please describe the issue", 400)

  const attachments = Array.isArray(body.attachments) ? body.attachments : []
  const totalSize = attachments.reduce((s, a) => s + (a.data?.length || 0), 0)
  if (totalSize > MAX_ATTACHMENT_BYTES) {
    return err("Attachments too large — keep photos/videos under 3MB total", 413)
  }

  const now = new Date().toISOString()
  const request = {
    id: `svc_${Date.now()}`,
    dealership:    body.dealership || "hyd-d01",
    customerName:  body.customerName || "Customer",
    customerPhone: customer.phone,
    vehicle:       body.vehicle || "",
    orderId:       body.orderId || null,
    orderDetails:  body.orderDetails || null,
    issueType:     body.issueType || "Other",
    description:   body.description.trim(),
    attachments:   attachments.map(a => ({ name: a.name, type: a.type, data: a.data })),
    status:        "OPEN",           // OPEN → IN_PROGRESS → RESOLVED | ESCALATED_OEM
    createdAt:     now,
    respondedAt:   null,
    respondedBy:   null,
    resolvedAt:    null,
    escalatedAt:   null,
    timeline: [{ at: now, event: "Request raised by customer", by: customer.phone }],
  }

  const requests = await readTable("service_requests")
  requests.unshift(request)
  await writeTable("service_requests", requests)

  return ok({ request })
}
