export const dynamic = "force-dynamic"

import { ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"
import jwt from "jsonwebtoken"
import bcryptjs from "bcryptjs"

// Verify JWT token for dealer profile verification
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret")
  } catch (e) {
    throw new Error(`Invalid or expired token: ${e.message}`)
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Locate the pending user for a verification token. Phone-only imports have
// email:"" on both the token and the record, so dealership (unique per
// account) is the reliable key; email is a consistency cross-check.
async function findPendingUser(decoded) {
  const users = await readTable("users")
  const idx = users.findIndex(u => u.dealership === decoded.dealership && (u.email || "") === (decoded.email || ""))
  return { users, idx }
}

// GET /api/dealer/verify-profile?token=... — pre-filled data for the form
export async function GET(req) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")
    if (!token) return err("Token required", 400)

    const decoded = verifyToken(token)
    if (decoded.type !== "dealer_verification") return err("Invalid token type", 400)

    const { users, idx } = await findPendingUser(decoded)
    if (idx === -1) return err("User not found", 404)
    const user = users[idx]

    if (user.status !== "pending_verification") {
      return err("This profile is already verified or no longer pending", 400)
    }

    return ok({
      success: true,
      user: {
        email: user.email || "",
        emailLocked: !!user.email, // email supplied by the OEM import is fixed; blank = dealer types their own
        name: user.name,
        phone: user.phone || "",
        city: user.city || "",
        state: user.state || "",
        businessName: user.dealershipName || "",
        ownerName: user.ownerName || "",
      },
      expiryAt: user.verificationTokenExpiry,
    })
  } catch (e) {
    return err(`Failed to load profile: ${e.message}`, 400)
  }
}

// POST /api/dealer/verify-profile — dealer confirms/edits details, sets password
export async function POST(req) {
  try {
    const body = await req.json()
    const { token, data } = body
    if (!token) return err("Token required", 400)
    if (!data) return err("Profile data required", 400)

    const decoded = verifyToken(token)
    if (decoded.type !== "dealer_verification") return err("Invalid token type", 400)

    const { users, idx } = await findPendingUser(decoded)
    if (idx === -1) return err("User not found", 404)
    const user = users[idx]

    if (user.status !== "pending_verification") {
      return err("This profile is already verified", 400)
    }

    if (!data.name || !data.name.trim()) return err("Name is required", 400)
    if (!data.city || !data.city.trim()) return err("City is required", 400)
    if (!data.state || !data.state.trim()) return err("State is required", 400)

    // Email: locked when the OEM supplied one; required (and must be unused)
    // when the account was imported with only a phone number.
    let email = user.email || ""
    if (email) {
      if (data.email && data.email.toLowerCase().trim() !== email) return err("Email cannot be changed", 400)
    } else {
      email = (data.email || "").toLowerCase().trim()
      if (!email) return err("Please enter your email address — it becomes your login", 400)
      if (!isValidEmail(email)) return err("Invalid email format", 400)
      const taken = users.some((u, i) => i !== idx && (u.email || "").toLowerCase() === email)
      if (taken) return err("This email is already registered on EvCRM — use a different one", 400)
    }

    // Password: dealers never receive the generated temp password, so setting
    // one here is how they get login access.
    if (!data.password || String(data.password).length < 8) {
      return err("Please set a password (minimum 8 characters)", 400)
    }
    const password_hash = await bcryptjs.hash(String(data.password), 10)

    users[idx] = {
      ...user,
      email,
      password_hash,
      name: data.name.trim(),
      phone: data.phone ? data.phone.toString().trim() : user.phone,
      city: data.city.trim(),
      state: data.state.trim(),
      dealershipName: data.businessName ? data.businessName.trim() : user.dealershipName,
      ownerName: data.ownerName ? data.ownerName.trim() : user.ownerName,
      status: "active",
      verificationToken: null,
      verificationTokenExpiry: null,
      verifiedAt: new Date().toISOString(),
    }
    await writeTable("users", users)

    return ok({
      success: true,
      message: "Profile verified! You can now log in with your email and password.",
      user: { email, dealership: user.dealership, name: users[idx].name },
    })
  } catch (e) {
    return err(`Failed to verify profile: ${e.message}`, 400)
  }
}
