const sample = `registrations in the first seven months of the year, signifies a powerful and accelerating shift towards electric mobility across the nation, offering prospective buyers an increasingly mature and competitive landscape of eco-friendly commuting options. For anyone considering an electric scooter, this unprecedented growth means more choices, better technology, and a rapidly expanding support ecosystem. ## A New Milestone: 1 Million E2Ws in Seven Months India's electric two-wheeler (e2W) market has demonstrated breathtaking growth, recording 1.11 million registrations in the first seven months of 2026. This milestone was reached on July 6, 2026, an impressive six months faster than it took to achieve the same feat in 2025. The total registrations for July 2026 alone hit 184,018 units, reflecting a robust 68% year-on-year increase. This robust performance underscores a significant shift in consumer preference and a maturing market landscape, making electric scooters an increasingly viable and attractive option for daily commutes and longer rides alike. ## The July 2026 Market Leaders: Who's Riding Ahead? The competitive landscape of the Indian electric two-wheeler market in July 2026 saw some familiar names dominating the sales charts, with TVS Motor Company firmly in the lead.`

function parseBlocks(text) {
  if (!text || typeof text !== "string") return []

  // Step 1: Ensure any '## ' starts on a new double-newline block
  let normalized = text.replace(/([^\n])\s*##\s+/g, "$1\n\n## ")

  const out = []
  for (const chunk of normalized.split(/\n{2,}/)) {
    const trimmed = chunk.trim()
    if (!trimmed) continue

    if (trimmed.startsWith("## ")) {
      const content = trimmed.slice(3).trim()
      let headingText = ""
      let bodyText = ""

      if (content.includes("? ")) {
        const idx = content.indexOf("? ")
        headingText = content.slice(0, idx + 1).trim()
        bodyText = content.slice(idx + 2).trim()
      } else {
        // If heading and body text are on the same line, find split point
        // Look for the end of the heading phrase before paragraph sentence
        const match = content.match(/^(.+?\b(?:Months|Years|Days|Market|Growth|Guide|Price|Specs|Policy|India|Overview|Features|Details|Hub|Launch|Platform|Segment|Sale|Sales|Leaders|Ahead|Charge|Future|FY\d+))\s+([A-Z][a-z0-9'"].*)$/i)
        if (match) {
          headingText = match[1].trim()
          bodyText = match[2].trim()
        } else {
          headingText = content
        }
      }

      if (headingText) out.push({ type: "h2", text: headingText })
      if (bodyText) out.push({ type: "p", text: bodyText })
    } else {
      // Regular paragraph block — strip any stray raw '##' characters
      const cleanP = trimmed.replace(/##\s*/g, "").trim()
      if (cleanP) out.push({ type: "p", text: cleanP })
    }
  }

  return out
}

console.log(JSON.stringify(parseBlocks(sample), null, 2))
