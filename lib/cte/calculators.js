// Deterministic calculators for the MCP server.
//
// Everything else CTE serves is a lookup — it can only answer what is in the
// database, and when the data is missing it has to source or decline. These
// are different: they are arithmetic. Same inputs, same answer, every time.
// No API, no key, no quota, no cache, and — the reason they matter this week
// — no surface on which a number can be invented.
//
// They also answer questions people demonstrably ask. `intentEngine`'s
// autocomplete expansion includes "emi", "on road price", "price", "cost per
// km" among its cost modifiers, and those came back with real search volume.
//
// ── The line these must not cross ─────────────────────────────────────
// Computing an EMI is arithmetic. Telling someone they are ELIGIBLE for a
// loan, or which lender to pick, is assessment and advice — that belongs to
// the lender, and doing it ourselves would put us in territory that needs
// registration we do not have. Same for insurance: an estimate of premium
// for a price band is a rule of thumb; comparing named policies is what an
// IRDAI-registered web aggregator does.
//
// So: state the method, state that figures are indicative, never assert
// eligibility, never recommend a provider.

// ── EMI ────────────────────────────────────────────────────────────────
// Standard reducing-balance amortisation, which is what Indian auto loans
// use: EMI = P·r·(1+r)^n / ((1+r)^n − 1), r = monthly rate, n = months.
export function calculateEmi({ principal, annualRatePercent, tenureMonths }) {
  const P = Number(principal)
  const annual = Number(annualRatePercent)
  const n = Math.round(Number(tenureMonths))

  if (!Number.isFinite(P) || P <= 0) return { error: "principal must be a positive number (rupees)" }
  if (!Number.isFinite(annual) || annual < 0 || annual > 60) return { error: "annualRatePercent must be between 0 and 60" }
  if (!Number.isFinite(n) || n < 1 || n > 480) return { error: "tenureMonths must be between 1 and 480" }

  const r = annual / 12 / 100
  // r === 0 would divide by zero in the standard formula; a 0% loan is just
  // the principal spread evenly.
  const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPayable = emi * n
  const totalInterest = totalPayable - P

  const round = (x) => Math.round(x)
  return {
    emiPerMonth: round(emi),
    totalPayable: round(totalPayable),
    totalInterest: round(totalInterest),
    principal: round(P),
    annualRatePercent: annual,
    tenureMonths: n,
    method: "Reducing-balance amortisation: EMI = P·r·(1+r)^n / ((1+r)^n − 1), r = annual rate / 12 / 100.",
    note: "Indicative. Excludes processing fees, insurance bundled into the loan, and any lender-specific charges. Your actual rate depends on the lender and your credit profile.",
  }
}

// What loan a given monthly budget supports — the same formula inverted.
// "What car can I afford at ₹15,000/month?" is a question people actually
// ask, and it is answerable exactly.
export function affordabilityFromEmi({ emiPerMonth, annualRatePercent, tenureMonths, downPayment = 0 }) {
  const E = Number(emiPerMonth)
  const annual = Number(annualRatePercent)
  const n = Math.round(Number(tenureMonths))
  const down = Number(downPayment) || 0

  if (!Number.isFinite(E) || E <= 0) return { error: "emiPerMonth must be a positive number (rupees)" }
  if (!Number.isFinite(annual) || annual < 0 || annual > 60) return { error: "annualRatePercent must be between 0 and 60" }
  if (!Number.isFinite(n) || n < 1 || n > 480) return { error: "tenureMonths must be between 1 and 480" }

  const r = annual / 12 / 100
  const principal = r === 0 ? E * n : (E * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n))

  return {
    loanAmount: Math.round(principal),
    vehicleBudget: Math.round(principal + down),
    downPayment: Math.round(down),
    emiPerMonth: Math.round(E),
    annualRatePercent: annual,
    tenureMonths: n,
    method: "Reducing-balance formula solved for principal: P = E·((1+r)^n − 1) / (r·(1+r)^n).",
    note: "Indicative borrowing capacity for this EMI, not a statement that any lender will approve it. Eligibility depends on income, credit history and the lender's own criteria.",
  }
}

// ── On-road price ──────────────────────────────────────────────────────
// ex-showroom + road tax + insurance + registration/handling.
//
// Road tax is set per state and varies by price slab, fuel type and
// sometimes buyer category, and several states discount or waive it for EVs
// as policy — which changes on its own schedule. Rather than hardcode a
// national guess, only states whose rate we can state are included, and
// anything else returns an honest "not available for this state" instead of
// a plausible-looking wrong number. Adding a state means adding a verified
// rate here, deliberately.
//
// EV_ROAD_TAX_PERCENT values below are placeholders pending verification
// against each state's motor vehicle taxation notification. The function
// refuses to compute until a state is present, so an unverified state simply
// cannot produce output.
const EV_ROAD_TAX_PERCENT = {
  // state (lowercase) : percent of ex-showroom, or 0 where fully exempted
}

const INSURANCE_RATE_PERCENT = 3.5 // rough first-year comprehensive, indicative only

export function estimateOnRoadPrice({ exShowroom, state, isElectric = true }) {
  const P = Number(exShowroom)
  if (!Number.isFinite(P) || P <= 0) return { error: "exShowroom must be a positive number (rupees)" }
  if (!state) return { error: "state is required — road tax is set per state, and a national average would be wrong everywhere" }

  const key = String(state).toLowerCase().trim()
  const taxPercent = EV_ROAD_TAX_PERCENT[key]
  if (taxPercent === undefined) {
    return {
      error: `No verified road-tax rate on file for "${state}".`,
      reason: "Road tax is set per state and several states waive or discount it for EVs. Rather than apply a national average that would be wrong in most states, this returns nothing until a verified rate for the state is added.",
      whatIsKnown: { exShowroomINR: Math.round(P) },
    }
  }

  const roadTax = P * (taxPercent / 100)
  const insurance = P * (INSURANCE_RATE_PERCENT / 100)
  const total = P + roadTax + insurance

  return {
    exShowroomINR: Math.round(P),
    roadTaxINR: Math.round(roadTax),
    insuranceINR: Math.round(insurance),
    estimatedOnRoadINR: Math.round(total),
    state,
    method: `ex-showroom + road tax (${taxPercent}% for ${isElectric ? "EV" : "vehicle"} in ${state}) + first-year comprehensive insurance (~${INSURANCE_RATE_PERCENT}%).`,
    note: "Indicative. Excludes registration/handling charges, accessories, extended warranty and dealer-specific fees. Confirm with the dealer.",
  }
}
