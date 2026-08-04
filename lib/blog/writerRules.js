// The single source of truth for content rules.
//
// Both sides import from here so they cannot drift:
//   - every writer prompt injects WRITER_RULES
//   - lib/blog/prePublishCheck.js enforces the same list
//
// That matters because the alternative — a gate that rejects for reasons the
// writer was never told — produces articles that fail repeatedly for the same
// reason and burns generation quota doing it.
//
// Full rationale, the incidents behind each rule, and the Google policies
// they map to: lib/blog/CONTENT_STANDARDS.md

export const MIN_WORDS = 450
export const TEMPLATE_OVERLAP = 0.55
export const MIN_DISTINCT_NUMBERS = 3

// Injected verbatim into writer prompts. Written as instructions to a writer,
// not as a policy summary, because that is what it has to do.
export const WRITER_RULES = `RULES — an article breaking any of these is rejected before publishing, so follow them exactly:

1. GROUND EVERY CLAIM. Use only the data supplied above. Never add specs, prices, ranges or model names from your own knowledge. If the data is thin, write a SHORTER article — never pad. A missing fact is correct; an invented one is a reader acting on a wrong number.

2. NO FALSE PRECISION. Never write "exact", "precise", "guaranteed" or "confirmed" about a figure that is estimated. Write "indicative" or "approximately", and state what it excludes.

3. MATCH CLAIMS TO THE VEHICLE. EV road-tax exemptions and EV subsidies apply ONLY to electric vehicles — never mention them for a petrol, diesel, CNG or hybrid vehicle. Costs that scale with price (insurance, road tax) must differ between a ₹1 lakh scooter and a ₹45 lakh car; never reuse one figure across price bands.

4. ARITHMETIC MUST HOLD. If you list charges on top of an ex-showroom price, the on-road total must be LARGER by those charges. A claimed saving must never exceed the price of the vehicle.

5. BE SUBSTANTIVE. At least ${MIN_WORDS} words, containing real figures from the data. If you cannot reach that from the data honestly, write less and say plainly what is not known.

6. BE DISTINCT. Do not follow a fixed section-by-section template. Structure the article around what THIS vehicle's data actually shows. An article more than half identical to another on the site is rejected.

7. ATTRIBUTE. Any fact from a named source gets that source named. Never copy sentences, descriptions or marketing copy from elsewhere — facts are free to reuse, wording is not.

8. WRITE FOR THE READER. Answer the question directly in the first paragraph. Include honest weaknesses where the data shows them — a guide that only praises is not useful and reads as promotional.`

// Compact variant for prompts that are already long, e.g. grounded calls
// where the source material dominates the token budget.
export const WRITER_RULES_SHORT = `RULES: Use ONLY the supplied data — never add facts from your own knowledge. Never claim "exact"/"guaranteed" over estimates. EV tax exemptions and subsidies apply to electric vehicles only. If you list charges above ex-showroom, the on-road total must be larger by them; a saving can never exceed the price. At least ${MIN_WORDS} words with real figures, or write less and say what is unknown. Do not follow a fixed template. Attribute sourced facts; never copy wording.`
