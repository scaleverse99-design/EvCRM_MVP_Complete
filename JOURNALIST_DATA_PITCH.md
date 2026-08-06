# Data Pitch — For Journalist Outreach

**Purpose**: Get a real backlink from a legitimate auto publication by offering
them a genuinely newsworthy data finding — not a press release, an actual
insight from real search data.

**Every number below is real**, pulled directly from Google Search Console
data for evcrm.in, verified 2026-08-05. Do not round up, do not add filler
stats. If a journalist asks "how did you get this," the honest answer is
"our own site's Search Console export" — say that plainly if asked.

---

## The finding (this is the actual story)

Out of 431 real Google searches that surfaced evcrm.in over 28 days, **84
queries got real impressions but almost zero clicks** — people are searching
for something, Google shows them a result, and they don't click. The
dominant cluster (roughly 70 of those 84) is entirely charging-station
related: "ev charging stations hyderabad," "find ev chargers," "public ev
charging stations," "charging station route planner."

The likely reason, diagnosed and now fixed on our end: search snippets were
showing generic company branding instead of anything about charging
stations — a technical mismatch between what ranked and what searchers saw,
not a lack of real demand.

**The story angle for a journalist**: real evidence that Indian EV buyers
are actively searching for charging infrastructure information — route
planning, network comparisons (Tata Power vs Statiq vs Ather Grid), battery
swap availability — at meaningful volume, and that a lot of that search
demand is currently going unanswered by clear, dedicated results. That's a
legitimate infrastructure-gap story, not a promotional one.

---

## Draft pitch email

**Subject:** Real search data: what Indian EV buyers are actually looking
for on charging infrastructure

```
Hi [Name],

I run EvCRM (evcrm.in), an EV dealer/marketplace platform. While reviewing
our own Google Search Console data, I found something that might be a
useful data point for a piece on India's EV charging infrastructure gap.

Over the last 28 days, out of 431 distinct searches that led to our site,
84 queries were specifically about charging stations — "find ev chargers,"
"charging station route planner," "public ev charging stations near me,"
network-specific searches (Tata Power, Statiq, Ather Grid). Real search
volume, not survey data.

What stood out: most of these searches aren't converting into clicks on any
result — including ours until we fixed a technical snippet issue. That
suggests a broader pattern: real, active demand for charging-network
information that current search results (across the board, not just us)
aren't answering clearly.

Happy to share the underlying query list if useful for a piece — happy to
be cited as the source, or to stay on background if you'd rather source it
independently.

Best,
[Your name]
EvCRM — evcrm.in
```

---

## Supporting data table (attach or paste if they want specifics)

| Query pattern | Impressions (28 days) | Clicks |
|---|---|---|
| ev charging stations hyderabad | 11 | 0 |
| find electric car charging points | 11 | 0 |
| public ev charging stations | 10 | 0 |
| find ev chargers | 9 | 0 |
| charging station route planner | 5 | 0 |
| ev charging stations map | 6 | 0 |
| electric vehicle charging station | 6 | 0 |

(Full 431-query dataset available if a journalist wants to independently
verify or dig deeper — don't hand over raw Search Console access, export a
CSV instead.)

---

## Where to send this

Real, relevant Indian auto/EV publications (already in your codebase's own
news-monitoring list, `lib/orchestrator/allIndiaAutoMonitor.js` —
confirms these are outlets you already track):

- **ET Auto** (auto.economictimes.indiatimes.com) — has an EV-specific
  vertical, publishes data-driven pieces regularly
- **MotorBeam** (motorbeam.com) — frequently covers EV infra topics
- **Team-BHP** (team-bhp.com forum) — huge engaged community, a forum post
  with real data can get picked up organically, doesn't need a journalist
  intermediary
- **RushLane** (rushlane.com) — covers EV charging network news specifically

**How to actually find a contact**: most of these have an "Editorial" or
"Tips" email on their About/Contact page — do not cold-DM a generic
info@ address, look for a named auto/EV beat reporter's byline and search
their name + "email" or LinkedIn.

---

## What NOT to do

- Don't inflate the numbers. 431 queries and 84 near-zero-CTR ones is a
  real, modest, honest dataset — it doesn't need embellishing to be a
  legitimate pitch.
- Don't promise "exclusive" to more than one outlet at once.
- Don't follow up more than once if there's no response — one pitch, one
  polite follow-up after ~5 business days, then move to the next outlet.
