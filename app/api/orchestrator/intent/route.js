export const dynamic = "force-dynamic"

import { fetchGoogleAutocomplete, fetchIntentQuestionTree, fetchPeopleAlsoAsk } from "../../../../lib/orchestrator/intentEngine.js"

// GET /api/orchestrator/intent?q=nexon+ev&mode=tree|paa|suggest
// Returns Google Autocomplete, People Also Ask (PAA), and AlsoAsked question trees.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") || searchParams.get("query") || "ev charging station"
  const mode = searchParams.get("mode") || "tree" // "suggest", "tree", "paa"

  try {
    if (mode === "suggest") {
      const suggestions = await fetchGoogleAutocomplete(query)
      return Response.json({
        success: true,
        query,
        mode,
        count: suggestions.length,
        suggestions
      })
    }

    if (mode === "paa") {
      const paaData = await fetchPeopleAlsoAsk(query)
      return Response.json({
        success: true,
        ...paaData
      })
    }

    // Default mode: Full AlsoAsked / AnswerThePublic intent tree
    const treeData = await fetchIntentQuestionTree(query)
    return Response.json({
      success: true,
      mode: "tree",
      ...treeData
    })
  } catch (err) {
    return Response.json({
      success: false,
      error: err.message || "Failed to fetch intent data"
    }, { status: 500 })
  }
}
