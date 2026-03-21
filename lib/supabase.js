import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL  || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
  },
})

/** Sign in with email + password */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

/** Sign up new user with role metadata */
export async function signUp(email, password, role = "dealer", dealership = "") {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, dealership } },
  })
  if (error) throw new Error(error.message)
  return data
}

/** Sign out */
export async function signOut() {
  await supabase.auth.signOut()
}

/** Get current session */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Get current user */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Send password reset email */
export async function resetPassword(email) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })
  if (error) throw new Error(error.message)
}

/** Extract role from user object */
export function getUserRole(user) {
  if (!user) return "dealer"
  if (user.user_metadata?.role) return user.user_metadata.role
  if (user.email?.startsWith("rep")) return "rep"
  return "dealer"
}

/** Get dashboard route for a role */
export function getRoleDest(role) {
  return role === "rep" ? "/queue" : "/dealer"
}
