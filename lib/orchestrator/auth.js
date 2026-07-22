// Shared-secret bearer auth for the orchestrator API. Every stage endpoint
// is world-reachable at evcrm.in/api/orchestrator/*, so without this a
// stranger with the URL could burn through your Gemini quota by hitting
// /discover in a loop. The secret is INTERNAL_API_SECRET, already in .env
// and unrelated to any user login — only the GitHub Actions cron and the
// admin dashboard know it.
//
// Returns null when authorized, or a Response when not (caller returns it
// directly). Keeps every route handler to a one-line preamble.

export function requireOrchestratorAuth(req) {
  const expected = process.env.INTERNAL_API_SECRET
  if (!expected) {
    // Failing closed instead of open — if the secret isn't set, don't let
    // anonymous callers in "temporarily." Better to hard-fail the deploy
    // than silently expose the endpoint to the internet.
    return Response.json({ error: "Server misconfigured: INTERNAL_API_SECRET not set" }, { status: 500 })
  }
  const header = req.headers.get("authorization") || ""
  const token = header.replace(/^Bearer\s+/i, "").trim()
  if (!token || token !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
