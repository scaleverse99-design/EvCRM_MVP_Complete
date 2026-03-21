import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_NAME  = process.env.EMAIL_FROM_NAME  || "Ev.CRM"
const FROM_EMAIL = process.env.EMAIL_FROM_EMAIL || "onboarding@resend.dev"
const FROM       = `${FROM_NAME} <${FROM_EMAIL}>`

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

  const { data, error } = await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: `${otp} — Your Ev.CRM Password Reset OTP`,
    html,
  })

  if (error) {
    console.error("[Resend OTP Error]", error)
    throw new Error(error.message || "Failed to send OTP email")
  }

  console.log(`[Email] OTP sent to ${to} — ID: ${data?.id}`)
  return data
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

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: "✓ Your Ev.CRM password has been reset",
    html,
  })

  if (error) console.error("[Resend Confirmation Error]", error)
}

// ── Send welcome email ────────────────────────────────────────────
export async function sendWelcomeEmail({ to, name, role, tempPassword }) {
  const roleLabel = role === "dealer" ? "Dealer Admin" : "Sales Rep"

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Welcome to Ev.CRM, ${name}! 🎉</h2>
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
      Sign In to Ev.CRM →
    </a>
    <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">Please change your password after first login.</p>
  `)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: `Welcome to Ev.CRM — Your ${roleLabel} account is ready`,
    html,
  })

  if (error) console.error("[Resend Welcome Error]", error)
}
