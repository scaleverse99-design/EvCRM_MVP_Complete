export const dynamic = "force-dynamic"

import { generateTrendingLinkedInPost, publishToLinkedIn } from "../../../../lib/social/linkedinPublisher.js"

// GET /api/cron/linkedin-auto-post
// Automates generating and posting viral trending automotive posts to LinkedIn
export async function GET(req) {
  try {
    const postData = await generateTrendingLinkedInPost()
    const result = await publishToLinkedIn(postData)

    return Response.json({
      success: true,
      message: "LinkedIn auto-post engine executed",
      postGenerated: postData,
      publishStatus: result
    })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
