import { Resend } from "resend"
import nodemailer from "nodemailer"

const FROM_NAME  = process.env.EMAIL_FROM_NAME  || "Ev.CRM"
const FROM_EMAIL = process.env.EMAIL_FROM_EMAIL || process.env.GMAIL_USER || "onboarding@resend.dev"
const FROM       = `${FROM_NAME} <${FROM_EMAIL}>`

// Initialize transporters
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const transporter = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD 
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null

// ── Base HTML template ────────────────────────────────────────────
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#065F46;padding:24px 32px;">
            <span style="font-size:22px;font-weight:900;color:#ffffff;">Ev<span style="color:#34D399;">.CRM</span></span>
            <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px;">India's EV Dealer Sales OS</div>
          </td>
        </tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #F3F4F6;background:#F9FAFB;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;">
              © 2026 Ev.CRM · India's First EV Dealer Sales OS<br/>
              If you did not request this email, please ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Core Send Function ────────────────────────────────────────────
async function sendGenericEmail(to, subject, html) {
  if (transporter) {
    // Send via Gmail
    const info = await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html
    })
    console.log(`[Email] Sent via Gmail to ${to} — ID: ${info.messageId}`)
    return info
  } else if (resend) {
    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html
    })
    if (error) throw new Error(error.message)
    console.log(`[Email] Sent via Resend to ${to} — ID: ${data?.id}`)
    return data
  } else {
    console.error("[Email Error] No email provider configured! Set GMAIL_USER or RESEND_API_KEY")
    throw new Error("No email provider configured")
  }
}

// ── Send OTP email ────────────────────────────────────────────────
export async function sendOTPEmail({ to, name, otp, expiryMinutes = 15 }) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Password Reset OTP</h2>
    <p style="margin:0 0 24px;font-size:13px;color:#6B7280;">Hi ${name || "there"}, here is your OTP to reset your Ev.CRM password.</p>

    <div style="background:#F0FDF4;border:2px solid #059669;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#065F46;letter-spacing:1px;margin-bottom:10px;">YOUR OTP</div>
      <div style="font-size:42px;font-weight:900;color:#065F46;letter-spacing:10px;font-family:'Courier New',monospace;">${otp}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:10px;">Valid for <strong>${expiryMinutes} minutes</strong></div>
    </div>

    <div style="background:#FEF9C3;border:1px solid #EAB308;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:12px;color:#713F12;">
        ⚠️ <strong>Never share this OTP.</strong> Ev.CRM staff will never ask for your OTP.
      </p>
    </div>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">This OTP expires in ${expiryMinutes} minutes.</p>
  `)
  
  return sendGenericEmail(to, `${otp} — Your Ev.CRM Password Reset OTP`, html)
}

// ── Send password reset confirmation ─────────────────────────────
export async function sendPasswordResetConfirmation({ to, name }) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Password Reset Successful ✓</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">Hi ${name || "there"}, your Ev.CRM password has been successfully reset.</p>
    <div style="background:#F0FDF4;border:1px solid #059669;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#065F46;font-weight:600;">✓ Password updated successfully</p>
    </div>
    <p style="margin:0;font-size:13px;color:#374151;">
      You can now <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="color:#059669;font-weight:700;">sign in</a> with your new password.
    </p>
    <div style="margin-top:16px;background:#FEF2F2;border:1px solid #EF4444;border-radius:10px;padding:12px 16px;">
      <p style="margin:0;font-size:12px;color:#991B1B;">
        🔒 If you did not reset your password, contact support immediately.
      </p>
    </div>
  `)

  return sendGenericEmail(to, "✓ Your Ev.CRM password has been reset", html)
}

// ── Send welcome email ────────────────────────────────────────────
export async function sendWelcomeEmail({ to, name, role, tempPassword, dealerCategory }) {
  const roleLabel = role === "dealer" 
    ? (dealerCategory === "ICE" ? "Used Car Dealer Admin" : "EV Dealer Admin") 
    : "Sales Rep"
  
  const branding = dealerCategory === "ICE" ? "EvCRM" : "EV.CRM"

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Welcome to ${branding}, ${name}! 🎉</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">Your <strong>${roleLabel}</strong> account has been created. Here are your login credentials:</p>

    <div style="background:#F0FDF4;border:1px solid #059669;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;width:40%;">Email</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${to}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Password</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;font-family:monospace;">${tempPassword}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Role</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#059669;">${roleLabel}</td>
        </tr>
      </table>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 24px;border-radius:10px;margin-bottom:16px;">
      Sign In to ${branding} →
    </a>
    <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">Please change your password after first login.</p>
  `)

  return sendGenericEmail(to, `Welcome to ${branding} — Your ${roleLabel} account is ready`, html)
}

// ── Send test drive booking confirmation welcome email ───────────
export async function sendBookingConfirmationEmail({ to, name, booking }) {
  const dateStr = booking.preferredDate 
    ? new Date(booking.preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "TBD (To Be Decided)"

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Booking Confirmed! 🚗</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">Hi ${name}, thank you for booking a test drive via ${booking.dealerName || "the dealership"}. Your booking is confirmed.</p>

    <div style="background:#F0FDF4;border:1px solid #059669;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;width:40%;">Vehicle</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${booking.vehicleName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Dealership</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${booking.dealerName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Preferred Date</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#059669;">${dateStr}</td>
        </tr>
        ${booking.tokenAmount > 0 ? `
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Token Paid</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">₹${booking.tokenAmount.toLocaleString("en-IN")}</td>
        </tr>
        ` : `
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Booking Type</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#059669;">Free Test Drive (No Token)</td>
        </tr>
        `}
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Booking ID</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;font-family:monospace;">${booking.id}</td>
        </tr>
      </table>
    </div>

    <div style="background:#EFF6FF;border:1px solid #3B82F6;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:12px;color:#1E40AF;">
        ℹ️ A sales representative from the dealership will reach out to you shortly to confirm the test-drive slot.
      </p>
    </div>
  `)

  return sendGenericEmail(to, `✓ Booking Confirmed — ${booking.vehicleName}`, html)
}

export async function sendInspectionBookingEmail({ to, name, booking, vehicle }) {
  const dateStr = new Date(booking.inspectionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Inspection Visit Confirmed! 🔍</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">Hi ${name}, your mechanic inspection visit has been scheduled. Bring your trusted mechanic to inspect the vehicle at the dealership.</p>

    <div style="background:#EFF6FF;border:1px solid #3B82F6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;width:40%;">Vehicle</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${booking.vehicleName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Dealership</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${booking.dealerName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Inspection Date</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#2563EB;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Time Slot</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#2563EB;">${booking.inspectionTime}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Location</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${vehicle.dealerName} — ${[vehicle.district, vehicle.state].filter(Boolean).join(", ")}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Booking ID</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;font-family:monospace;">${booking.id}</td>
        </tr>
      </table>
    </div>

    <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:12px;color:#92400E;">
        🔧 <strong>Bring your own mechanic</strong> — the dealer will make the vehicle available for inspection at the scheduled time. No charges from the dealer or EvCRM for this visit.
      </p>
    </div>
  `)

  return sendGenericEmail(to, `🔍 Inspection Visit Confirmed — ${booking.vehicleName}`, html)
}

export async function sendProcurementInquiryEmail({ to, sellerName, dealerName, brand, model }) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Request Received! 🚗💰</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">Hi ${sellerName}, thanks for offering your <strong>${brand} ${model}</strong> to <strong>${dealerName}</strong>. Your request has been received and the dealer will reach out to you shortly.</p>

    <div style="background:#F0FDF4;border:1px solid #059669;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#065F46;">
        ✓ The dealer will call you to schedule a vehicle inspection<br/>
        ✓ You'll receive an offer based on the inspection<br/>
        ✓ No obligation — you're free to decline the offer
      </p>
    </div>
  `)

  return sendGenericEmail(to, `✓ Request Received — ${dealerName} will contact you soon`, html)
}

// ── Send OEM network sponsorship welcome (informational only) ────
export async function sendOEMSponsorshipEmail({ to, dealerName, oemName, daysUsingCRM }) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">You're now part of the ${oemName} network! 🤝</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">
      Hi ${dealerName}, you've been using EvCRM as an independent dealer for ${daysUsingCRM} day${daysUsingCRM === 1 ? "" : "s"}.
      <strong>${oemName}</strong> is now formally integrating its dealer network onto this platform, and your monthly
      subscription is sponsored by them going forward — no action needed on your part.
    </p>
    <div style="background:#F0FDF4;border:1px solid #059669;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#065F46;font-weight:600;">✓ Subscription now sponsored by ${oemName}</p>
    </div>
    <p style="margin:0;font-size:13px;color:#374151;">Please continue using EvCRM as you have been — everything stays the same on your end.</p>
  `)

  return sendGenericEmail(to, `You're now part of the ${oemName} dealer network on EvCRM`, html)
}

export async function sendQuoteEmail({ to, customerName, vehicleName, netPrice, link, dealerName }) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Your Vehicle Quotation</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">Hi ${customerName}, here is the digital price reference quote prepared for you by <strong>${dealerName}</strong>.</p>
    
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;width:40%;">Vehicle</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${vehicleName || "Vehicle Model"}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Dealership</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${dealerName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Net Reference Price</td>
          <td style="padding:6px 0;font-size:15px;font-weight:900;color:#059669;">₹${Number(netPrice).toLocaleString("en-IN")}</td>
        </tr>
      </table>
    </div>

    <a href="${link}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 24px;border-radius:10px;margin-bottom:16px;">
      Review & Respond to Quote →
    </a>
    
    <p style="margin:16px 0 0;font-size:11px;color:#9CA3AF;">You can upload your KYC documents or submit inline comments directly through the link above.</p>
  `)
  
  return sendGenericEmail(to, `Reference Quote for ${vehicleName || "vehicle"} — ${dealerName}`, html)
}

// ── Send bulk import dealer verification email ────────────────────
export async function sendBulkImportVerificationEmail({ email, dealerName, businessName, ownerName, phone, city, state, verificationToken, oemName, dealerCategory }) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"}/dealer/verify-profile?token=${verificationToken}`
  const branding = dealerCategory === "ICE" ? "EvCRM" : "EV.CRM"

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Verify Your ${branding} Account 👋</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">
      Hi <strong>${dealerName}</strong>, we've created your ${branding} account as part of <strong>${oemName}</strong>'s dealer network.
      Please verify the details below — if anything is incorrect, you can edit and save.
    </p>

    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;font-size:12px;color:#6B7280;width:45%;"><strong>Business Name</strong></td>
          <td style="padding:8px 0;font-size:13px;color:#111827;">${businessName}</td>
        </tr>
        <tr style="border-top:1px solid #E5E7EB;">
          <td style="padding:8px 0;font-size:12px;color:#6B7280;"><strong>Email</strong></td>
          <td style="padding:8px 0;font-size:13px;color:#111827;font-family:monospace;">${email}</td>
        </tr>
        <tr style="border-top:1px solid #E5E7EB;">
          <td style="padding:8px 0;font-size:12px;color:#6B7280;"><strong>Phone</strong></td>
          <td style="padding:8px 0;font-size:13px;color:#111827;">${phone || "—"}</td>
        </tr>
        <tr style="border-top:1px solid #E5E7EB;">
          <td style="padding:8px 0;font-size:12px;color:#6B7280;"><strong>City</strong></td>
          <td style="padding:8px 0;font-size:13px;color:#111827;">${city}</td>
        </tr>
        <tr style="border-top:1px solid #E5E7EB;">
          <td style="padding:8px 0;font-size:12px;color:#6B7280;"><strong>State</strong></td>
          <td style="padding:8px 0;font-size:13px;color:#111827;">${state}</td>
        </tr>
        ${ownerName ? `
        <tr style="border-top:1px solid #E5E7EB;">
          <td style="padding:8px 0;font-size:12px;color:#6B7280;"><strong>Owner</strong></td>
          <td style="padding:8px 0;font-size:13px;color:#111827;">${ownerName}</td>
        </tr>
        ` : ""}
      </table>
    </div>

    <a href="${verificationUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 24px;border-radius:10px;margin-bottom:20px;">
      ✓ Verify & Edit Profile →
    </a>

    <div style="background:#EFF6FF;border:1px solid #3B82F6;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0;font-size:12px;color:#1E40AF;">
        ℹ️ This verification link expires in <strong>7 days</strong>. On the verification page you'll confirm your details and set your password — then you can log in.
      </p>
    </div>

    <p style="margin:0;font-size:12px;color:#6B7280;">
      If anything is wrong, click the button above to edit before saving. Your account is not active until you verify.
    </p>
  `)

  return sendGenericEmail(email, `Verify Your ${branding} Account — ${oemName}`, html)
}
