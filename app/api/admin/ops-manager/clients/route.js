export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, ok, err } from "../../../../../lib/auth"
import { findSession } from "../../../../../lib/db"
import supabaseAdmin from "../../../../../lib/db"

async function requireSuperadmin(req) {
  const token = extractToken(req)
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded || (decoded.role !== "superadmin" && decoded.role !== "founder")) return null

  const session = await findSession(hashToken(token))
  if (!session) return null

  return session.evcrm_users
}

export async function GET(req) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) return err("Unauthorized.", 401)

    // Fetch dealers
    const { data, error } = await supabaseAdmin
      .from("evcrm_users")
      .select("id, email, name, dealership, city, is_active, opsmanager_url, created_at")
      .eq("role", "dealer")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Transform to 'clients' format expected by dashboard
    const clients = data.map(u => ({
      id: u.id,
      businessName: u.dealership || u.name,
      domain: u.email.split("@")[1], // fallback domain
      siteUrl: u.opsmanager_url ? `https://${u.email.split("@")[1]}` : "#",
      storageConfig: { folderId: "REDACTED" },
      status: u.is_active ? "ACTIVE" : "INACTIVE"
    }))

    return ok({ success: true, clients })

  } catch (error) {
    console.error("[GET /api/admin/ops-manager/clients]", error.message)
    return err("Failed to fetch clients.", 500)
  }
}
