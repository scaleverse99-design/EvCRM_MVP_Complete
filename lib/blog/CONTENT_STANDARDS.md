# EvCRM content standards

The rule book every article is written to and checked against.

Two things enforce it, and they share one source so they cannot drift:

- `lib/blog/writerRules.js` — the rules injected into every writer prompt
- `lib/blog/prePublishCheck.js` — the gate that blocks publication

If you change a rule, change it in `writerRules.js`. The gate imports from there.

---

## Why this exists

This site has been penalised once already.

**2026-07-31 — AdSense "low value content".** 16 model guides, 302–675 words,
generated from a fill-in-the-blank title (*"Best reasons to buy the {brand}
{model}"*) using the model's general knowledge, with no real data behind them.
Nine were retired, seven rewritten from verified specs and live inventory.

**2026-08-04 — 15 "Master OEM buying guides"** published straight to production
from a single string template. They told buyers a **petrol** Hyundai Creta gets
"0% EV road tax exemption" and a "₹10K State EV Subsidy"; quoted ₹42K insurance
identically for a ₹5.54L Wagon R and a ₹45.95L IONIQ 5; listed ₹57K of charges
then reported the on-road price unchanged from ex-showroom; and promised "up to
₹2.0L" road-tax saving on a ₹1.10L scooter.

Both got through because nothing checked. Now something does.

---

## The policies that actually apply

Read these rather than SEO blog posts. They are the documents Google enforces.

- **Google Search Essentials** — <https://developers.google.com/search/docs/essentials>
- **Spam policies for Google web search** — <https://developers.google.com/search/docs/essentials/spam-policies>
- **Creating helpful, reliable, people-first content** — <https://developers.google.com/search/docs/fundamentals/creating-helpful-content>
- **AdSense Program policies** — <https://support.google.com/adsense/answer/48182>
- **Structured data general guidelines** — <https://developers.google.com/search/docs/appearance/structured-data/sd-policies>

The three spam-policy clauses this site is most exposed to:

| Clause | What it means here |
|---|---|
| **Scaled content abuse** | Generating many pages primarily for search rather than for readers. Volume is not the trigger — *emptiness at volume* is. |
| **Thin affiliate pages** | Pages whose only substance is someone else's product data plus an affiliate link. Add your own data or don't publish. |
| **Site reputation abuse** | Hosting third-party or low-quality content that trades on the host domain's standing. |

Note what is **not** prohibited: templated pages at scale. Amazon and IMDb are
templates over millions of pages and rank fine, because each page carries
distinct real data. Template + unique data is fine. Template + nothing is not.

---

## The rules

### 1. Ground every claim
Write only what the supplied data supports. If the data is thin, write a
shorter article — never pad with general knowledge. A missing fact is
correct; an invented one is a reader acting on a wrong number.

### 2. Never assert precision over an estimate
Do not write "exact", "guaranteed" or "confirmed" about a figure that is
estimated. Say "indicative" or "approximately", and say what it excludes.

### 3. Match claims to the vehicle
EV road-tax exemptions and EV subsidies apply to **electric** vehicles only.
Never attach them to a petrol, diesel, CNG or hybrid vehicle. Costs that scale
with price (insurance, road tax) must scale — the same rupee figure cannot
apply to a ₹1L scooter and a ₹46L car.

### 4. Arithmetic must hold
If you list charges on top of ex-showroom, the on-road total must be larger by
those charges. A claimed saving can never exceed the price of the thing.

### 5. One page per question, not one page per phrasing
"Cheapest electric scooter under 1 lakh" and "best 2-wheeler EV under 1 lakh"
are the same question — one page. "Ather 450X vs Ola S1 Pro" is a different
question — its own page. Cover synonyms *within* a page (headings, FAQ), never
by cloning the page.

### 6. Answer the question people actually typed
`lib/orchestrator/intentEngine.js` returns real Google Autocomplete phrasings.
Use them as section headings where the data supports an answer — "how much tata
nexon ev cost per km" is what someone searched. Skip any question the data
cannot answer rather than inventing an answer to fit a heading.

### 7. Attribute
Facts taken from a source get a link to that source. Facts are free to use;
someone else's sentences, photos and page structure are not.

### 8. Minimum substance
450 words, and at least a few distinct figures. Below that it is not an
article, and the 2026-07-31 flag was pages in exactly that range.

---

## What actually earns rankings here

Not volume. The thing competitors cannot copy:

- **Real dealer availability** — who has this model near you, at what price
- **Verified specs and transparency scores** cross-checked across sources
- **Computed answers** — EMI, affordability, on-road cost, with the method stated
- **Official data** — e-VAHAN state registration figures, cited

Every new dataset unlocks a whole page *type* across the catalogue at once. That
is how a site legitimately gets to thousands of pages: data first, pages follow.
Pages first is how it gets penalised.

---

## Before pointing Google at anything

    node scripts/site-preflight.js

Checks robots.txt, sitemap integrity, indexability, structured data and AI
discovery endpoints. Exits non-zero on failure. Run it after any deploy that
changes routing or content.
