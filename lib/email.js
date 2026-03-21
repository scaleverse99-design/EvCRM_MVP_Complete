import nodemailer from "nodemailer"

// ── Transport setup ───────────────────────────────────────────────
// Option A (default) — Gmail SMTP — completely free
// Get an App Password at: myaccount.google.com/apppasswords
// Enable 2FA first, then create an app password for "Mail"

function createTransport() {
  // Option A — Gmail SMTP (free, up to 500 emails/day)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  }

  // Option B — SendGrid (free tier: 100 emails/day)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host:   "smtp.sendgrid.net",
      port:   587,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    })
  }

  // Option C — Resend (free tier: 3,000 emails/month)
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host:   "smtp.resend.com",
      port:   465,
      secure: true,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY,
      },
    })
  }

  // Development fallback — logs to console, no actual email
  console.warn("⚠ No email provider configured. Set GMAIL_USER + GMAIL_APP_PASSWORD in .env.local")
  return nodemailer.createTransport({
    jsonTransport: true, // logs email object to console
  })
}

const transporter = createTransport()

const FROM_NAME  = process.env.EMAIL_FROM_NAME  || "Ev.CRM"
const FROM_EMAIL = process.env.EMAIL_FROM_EMAIL || process.env.GMAIL_USER || "noreply@evcrm.in"

// ── Email templates ───────────────────────────────────────────────

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Ev.CRM</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#065F46;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                      Ev<span style="color:#34D399;">.CRM</span>
                    </span>
                    <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px;">India's EV Dealer Sales OS</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #F3F4F6;background:#F9FAFB;">
              <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
                This email was sent by Ev.CRM. If you did not request this, please ignore it.<br/>
                © 2026 Ev.CRM · India's First EV Dealer Sales OS
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// ── Send OTP email (password reset) ──────────────────────────────

export async function sendOTPEmail({ to, name, otp, expiryMinutes = 15 }) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">
      Password Reset OTP
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#6B7280;line-height:1.6;">
      Hi ${name || "there"}, you requested a password reset for your Ev.CRM account.
    </p>

    <!-- OTP box -->
    <div style="background:#F0FDF4;border:2px solid #059669;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#065F46;letter-spacing:1px;margin-bottom:10px;">YOUR OTP</div>
      <div style="font-size:42px;font-weight:900;color:#065F46;letter-spacing:10px;font-family:'Courier New',monospace;">
        ${otp}
      </div>
      <div style="font-size:12px;color:#6B7280;margin-top:10px;">
        Valid for <strong>${expiryMinutes} minutes</strong>
      </div>
    </div>

    <!-- Warning -->
    <div style="background:#FEF9C3;border:1px solid #EAB308;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:12px;color:#713F12;line-height:1.6;">
        ⚠️ <strong>Never share this OTP with anyone.</strong> Ev.CRM staff will never ask for your OTP.
        If you did not request this, please ignore this email — your account is safe.
      </p>
    </div>

    <p style="margin:0;font-size:12px;color:#9CA3AF;">
      This OTP expires at <strong>${new Date(Date.now() + expiryMinutes * 60000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST</strong>.
    </p>
  `

  const info = await transporter.sendMail({
    from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject: `${otp} — Your Ev.CRM Password Reset OTP`,
    html:    baseTemplate(content),
    text:    `Your Ev.CRM OTP is: ${otp}\n\nValid for ${expiryMinutes} minutes. Do not share this with anyone.`,
  })

  if (info.message) {
    // jsonTransport (dev mode) — log instead of send
    console.log("📧 [DEV] OTP email:\n", JSON.parse(info.message))
  }

  return info
}

// ── Send password reset confirmation ─────────────────────────────

export async function sendPasswordResetConfirmation({ to, name }) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">
      Password Reset Successful ✓
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.6;">
      Hi ${name || "there"}, your Ev.CRM password has been successfully reset.
    </p>

    <div style="background:#F0FDF4;border:1px solid #059669;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#065F46;font-weight:600;">
        ✓ Password updated · ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:13px;color:#374151;line-height:1.6;">
      You can now log in with your new password at
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="color:#059669;font-weight:700;">evcrm.in/login</a>
    </p>

    <div style="background:#FEF2F2;border:1px solid #EF4444;border-radius:10px;padding:12px 16px;">
      <p style="margin:0;font-size:12px;color:#991B1B;line-height:1.6;">
        🔒 If you did not reset your password, please contact support immediately at
        <a href="mailto:support@evcrm.in" style="color:#991B1B;font-weight:700;">support@evcrm.in</a>
      </p>
    </div>
  `

  return transporter.sendMail({
    from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject: "✓ Your Ev.CRM password has been reset",
    html:    baseTemplate(content),
    text:    `Your Ev.CRM password was successfully reset. If you did not do this, contact support@evcrm.in immediately.`,
  })
}

// ── Send welcome email (when admin creates an account) ────────────

export async function sendWelcomeEmail({ to, name, role, tempPassword }) {
  const roleLabel = role === "dealer" ? "Dealer Admin" : "Sales Rep"
  const dest      = role === "dealer" ? "/dealer" : "/queue"

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">
      Welcome to Ev.CRM, ${name}! 🎉
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.6;">
      Your <strong>${roleLabel}</strong> account has been created. Here are your login credentials:
    </p>

    <div style="background:#F0FDF4;border:1px solid #059669;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;width:40%;">Email</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${to}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Password</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;font-family:monospace;letter-spacing:1px;">${tempPassword}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6B7280;">Role</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#059669;">${roleLabel}</td>
        </tr>
      </table>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 24px;border-radius:10px;margin-bottom:20px;">
      Sign In to Ev.CRM →
    </a>

    <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">
      Please change your password after first login using Forgot Password.
    </p>
  `

  return transporter.sendMail({
    from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject: `Welcome to Ev.CRM — Your ${roleLabel} account is ready`,
    html:    baseTemplate(content),
    text:    `Welcome to Ev.CRM! Your login: Email: ${to} / Password: ${tempPassword}\nLogin at: ${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })
}
