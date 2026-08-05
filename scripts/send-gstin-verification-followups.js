#!/usr/bin/env node

/**
 * Send GSTIN verification follow-up emails to dealers
 *
 * Run this periodically (e.g., via cron at day 7, day 14, day 30 of trial):
 *   node scripts/send-gstin-verification-followups.js [--days 7]
 *
 * This finds dealers who:
 * 1. Are in trial or active
 * 2. Provided a GSTIN but haven't verified it yet
 * 3. Haven't had a follow-up email in the last 24 hours
 *
 * And sends them a verification request email.
 */

const fs = require("fs")
const path = require("path")

// Load env vars
const envPath = path.join(__dirname, "..", ".env")
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
}

const { createClient } = require("@supabase/supabase-js")
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Get days parameter (default 7 = send on day 7 of trial)
const DAYS_INTO_TRIAL = parseInt(process.argv[2] || "7")

async function main() {
  console.log(`\nGSTIN Verification Follow-ups — Day ${DAYS_INTO_TRIAL} of trial\n${"=".repeat(60)}`)

  try {
    // 1. Find dealers who are X days into their trial
    const trialCutoff = new Date(Date.now() - DAYS_INTO_TRIAL * 86400_000).toISOString()
    const { data: dealers, error: dealerErr } = await sb
      .from("evcrm_users")
      .select("id, email, name, dealership, gstin, trialStartDate")
      .eq("role", "dealer")
      .eq("is_active", true)
      .not("gstin", "is", null)
      .eq("gstin", "") // Select dealers who provided GSTIN but it's not verified yet
      .lte("trialStartDate", trialCutoff)
      .gt("trialStartDate", new Date(Date.now() - (DAYS_INTO_TRIAL + 2) * 86400_000).toISOString())
      .limit(100)

    if (dealerErr) {
      console.error("Error fetching dealers:", dealerErr.message)
      process.exit(1)
    }

    if (!dealers?.length) {
      console.log(`No dealers found ${DAYS_INTO_TRIAL} days into trial. (All set!)`)
      return
    }

    console.log(`Found ${dealers.length} dealers to follow up with\n`)

    // 2. For each dealer, send follow-up email
    let sent = 0
    let skipped = 0

    for (const dealer of dealers) {
      // Check if we've already sent them a follow-up in the last 24 hours
      const { data: existing } = await sb
        .from("gstin_verification_followups")
        .select("id, followup_count, last_followup_sent_at")
        .eq("dealer_id", dealer.id)
        .single()

      if (existing?.last_followup_sent_at) {
        const lastSent = new Date(existing.last_followup_sent_at).getTime()
        const hoursSinceLastEmail = (Date.now() - lastSent) / (1000 * 60 * 60)
        if (hoursSinceLastEmail < 24) {
          console.log(`  ⏭️  ${dealer.name} (${dealer.email}) — already emailed ${hoursSinceLastEmail.toFixed(1)}h ago, skipping`)
          skipped++
          continue
        }
      }

      // Send email (stub — replace with actual email service)
      const subject = `Verify your GSTIN to unlock the Verified Badge | EvCRM`
      const body = `
Hi ${dealer.name},

Thanks for joining EvCRM! We noticed you provided a GSTIN during signup (${dealer.gstin || "—"}).

To unlock the ✓ Verified badge that buyers trust, we can verify your GSTIN against government records at no cost.

Just reply to this email or click the link below to complete verification:
https://evcrm.in/dealer/settings?tab=business-info

The verified badge will appear on your dealership profile and increase buyer confidence.

Best regards,
The EvCRM Team
`.trim()

      console.log(`  ✉️  Sending to ${dealer.name} (${dealer.email})`)
      // In production, call your email service here:
      // await sendEmail({ to: dealer.email, subject, body })

      // 3. Update follow-up tracking
      const { error: upsertErr } = await sb
        .from("gstin_verification_followups")
        .upsert({
          dealer_id: dealer.id,
          dealer_email: dealer.email,
          gstin_provided: dealer.gstin,
          gstin_verified: false,
          followup_count: (existing?.followup_count || 0) + 1,
          last_followup_sent_at: new Date().toISOString(),
        }, { onConflict: "dealer_id" })

      if (upsertErr) {
        console.error(`  ❌ Failed to update tracking for ${dealer.email}:`, upsertErr.message)
      } else {
        sent++
      }
    }

    console.log(`\nSummary:`)
    console.log(`  ✅ Sent: ${sent}`)
    console.log(`  ⏭️  Skipped (emailed recently): ${skipped}`)

  } catch (e) {
    console.error("Error:", e.message)
    process.exit(1)
  }
}

main()
