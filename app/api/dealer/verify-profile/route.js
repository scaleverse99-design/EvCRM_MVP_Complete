export const dynamic = "force-dynamic"

import { ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"
import jwt from "jsonwebtoken"

// Verify JWT token for dealer profile verification
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret")
  } catch (e) {
    throw new Error(`Invalid or expired token: ${e.message}`)
  }
}

// GET /api/dealer/verify-profile?token=... — Get pre-filled data for verification form
export async function GET(req) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")

    if (!token) return err("Token required", 400)

    const decoded = verifyToken(token)

    if (decoded.type !== "dealer_verification") {
      return err("Invalid token type", 400)
    }

    // Find user by email and dealership
    const users = await readTable("users")
    const user = users.find(u => u.email === decoded.email && u.dealership === decoded.dealership)

    if (!user) return err("User not found", 404)

    if (user.status !== "pending_verification") {
      return err("This profile is already verified or no longer pending", 400)
    }

    // Return pre-filled data (no sensitive info like password)
    return ok({
      success: true,
      user: {
        email: user.email,
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

// POST /api/dealer/verify-profile — Dealer saves verified details
export async function POST(req) {
  try {
    const body = await req.json()
    const { token, data } = body

    if (!token) return err("Token required", 400)
    if (!data) return err("Profile data required", 400)

    const decoded = verifyToken(token)

    if (decoded.type !== "dealer_verification") {
      return err("Invalid token type", 400)
    }

    // Find user
    const users = await readTable("users")
    const userIdx = users.findIndex(u => u.email === decoded.email && u.dealership === decoded.dealership)

    if (userIdx === -1) return err("User not found", 404)

    const user = users[userIdx]

    if (user.status !== "pending_verification") {
      return err("This profile is already verified", 400)
    }

    // Validate data
    if (!data.name || !data.name.trim()) return err("Name is required", 400)
    if (!data.city || !data.city.trim()) return err("City is required", 400)
    if (!data.state || !data.state.trim()) return err("State is required", 400)

    // Email cannot be changed
    if (data.email && data.email !== user.email) {
      return err("Email cannot be changed", 400)
    }

    // Update user record
    const updatedUser = {
      ...user,
      name: data.name.trim(),
      phone: data.phone ? data.phone.toString().trim() : user.phone,
      city: data.city.trim(),
      state: data.state.trim(),
      dealershipName: data.businessName ? data.businessName.trim() : user.dealershipName,
      ownerName: data.ownerName ? data.ownerName.trim() : user.ownerName,
      status: "active", // Mark as verified
      verificationToken: null, // Invalidate token
      verificationTokenExpiry: null,
    }

    users[userIdx] = updatedUser
    await writeTable("users", users)

    return ok({
      success: true,
      message: "Profile verified! You can now log in with your email and password.",
      user: {
        email: updatedUser.email,
        dealership: updatedUser.dealership,
        name: updatedUser.name,
      },
    })
  } catch (e) {
    return err(`Failed to verify profile: ${e.message}`, 400)
  }
}
