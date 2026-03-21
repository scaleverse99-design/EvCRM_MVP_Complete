import { hashPassword, extractToken, verifyToken, hashToken, ok, err } from "../../../../lib/auth"
import { findSession, findUserById } from "../../../../lib/db"
import { sendWelcomeEmail } from "../../../../lib/email"
import supabaseAdmin from "../../../../lib/db"

// ── Auth middleware — only dealers (admins) can access ────────────
async function requireDealer(req) {
  const token = extractToken(req)
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded || decoded.role !== "dealer") return null

  const session = await findSession(hashToken(token))
  if (!session) return null

  return session.evcrm_users
}

// ── GET /api/admin/users — list all users ─────────────────────────
export async function GET(req) {
  try {
    const admin = await requireDealer(req)
    if (!admin) return err("Unauthorized. Dealer access required.", 401)

    const { searchParams } = new URL(req.url)
    const role   = searchParams.get("role")   // filter by role
    const search = searchParams.get("search") // search by name/email
    const page   = parseInt(searchParams.get("page") || "1")
    const limit  = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from("evcrm_users")
      .select("id, email, role, name, phone, dealership, city, is_active, last_login, created_at", { count:"exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (role)   query = query.eq("role", role)
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)

    const { data, error, count } = await query
    if (error) throw error

    return ok({ users: data, total: count, page, limit })

  } catch (error) {
    console.error("[GET /api/admin/users]", error.message)
    return err("Failed to fetch users.", 500)
  }
}

// ── POST /api/admin/users — create user ───────────────────────────
export async function POST(req) {
  try {
    const admin = await requireDealer(req)
    if (!admin) return err("Unauthorized.", 401)

    const { name, email, password, role, phone, dealership, city } = await req.json()

    // Validation
    if (!name || !email || !password || !role) {
      return err("Name, email, password and role are required.", 400)
    }
    if (!["dealer","rep"].includes(role)) {
      return err("Role must be dealer or rep.", 400)
    }

    const emailClean = email.toLowerCase().trim()

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from("evcrm_users")
      .select("id")
      .eq("email", emailClean)
      .single()

    if (existing) return err("Email already registered.", 409)

    const passwordHash = await hashPassword(password)

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("evcrm_users")
      .insert({
        email:         emailClean,
        password_hash: passwordHash,
        role,
        name:          name.trim(),
        phone:         phone?.trim() || null,
        dealership:    dealership?.trim() || admin.dealership || null,
        city:          city?.trim() || null,
        is_active:     true,
      })
      .select("id, email, role, name, phone, dealership, city, is_active, created_at")
      .single()

    if (insertError) throw insertError

    // Send welcome email
    try {
      await sendWelcomeEmail({ to: emailClean, name: name.trim(), role, tempPassword: password })
    } catch (e) {
      console.error("Welcome email failed:", e.message)
    }

    return ok({ user: newUser, message: `${role === "dealer" ? "Dealer" : "Sales Rep"} account created successfully.` }, 201)

  } catch (error) {
    console.error("[POST /api/admin/users]", error.message)
    return err("Failed to create user.", 500)
  }
}

// ── PATCH /api/admin/users — update user (activate/deactivate/edit) ──
export async function PATCH(req) {
  try {
    const admin = await requireDealer(req)
    if (!admin) return err("Unauthorized.", 401)

    const { id, is_active, name, phone, dealership, city, password } = await req.json()
    if (!id) return err("User ID required.", 400)

    const updates = {}
    if (typeof is_active === "boolean") updates.is_active = is_active
    if (name)       updates.name       = name.trim()
    if (phone)      updates.phone      = phone.trim()
    if (dealership) updates.dealership = dealership.trim()
    if (city)       updates.city       = city.trim()
    if (password)   updates.password_hash = await hashPassword(password)

    const { data, error } = await supabaseAdmin
      .from("evcrm_users")
      .update(updates)
      .eq("id", id)
      .select("id, email, role, name, is_active")
      .single()

    if (error) throw error

    return ok({ user: data, message: "User updated successfully." })

  } catch (error) {
    console.error("[PATCH /api/admin/users]", error.message)
    return err("Failed to update user.", 500)
  }
}

// ── DELETE /api/admin/users — deactivate user (soft delete) ───────
export async function DELETE(req) {
  try {
    const admin = await requireDealer(req)
    if (!admin) return err("Unauthorized.", 401)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return err("User ID required.", 400)

    // Soft delete — just deactivate, don't destroy data
    const { error } = await supabaseAdmin
      .from("evcrm_users")
      .update({ is_active: false })
      .eq("id", id)

    if (error) throw error

    return ok({ message: "User deactivated successfully." })

  } catch (error) {
    console.error("[DELETE /api/admin/users]", error.message)
    return err("Failed to deactivate user.", 500)
  }
}
