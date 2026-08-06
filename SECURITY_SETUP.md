# EvCRM Security Setup Guide

## Quick Start

This guide will help you set up and maintain security for the EvCRM platform.

## Prerequisites

- Node.js 16+
- npm 7+
- Access to `.env.production` file
- Admin access to infrastructure (Firebase, Supabase, etc.)

---

## 1. Initial Setup

### 1.1 Generate Required Secrets

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (64 characters for AES-256)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.2 Configure Environment Variables

1. Copy `.env.example` to `.env.production`
2. Fill in all required values:

```env
JWT_SECRET=<your-generated-secret>
ENCRYPTION_KEY=<your-generated-key>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-key>
RAZORPAY_KEY_SECRET=<your-key>
CLOUDFLARE_API_TOKEN=<your-token>
GEMINI_API_KEY=<your-key>
RESEND_API_KEY=<your-key>
```

### 1.3 Install Security Dependencies

```bash
npm install bcryptjs jsonwebtoken helmet cors dotenv
```

### 1.4 Run Security Audit

```bash
node scripts/security-audit.js
```

Fix any issues identified by the audit before proceeding.

---

## 2. Security Best Practices

### 2.1 For Developers

1. **Never commit secrets** - Use `.env.local` for local development
2. **Sanitize all inputs** - Use utilities from `lib/security.js`
3. **Protect API endpoints** - Use `protectedAPI` wrapper
4. **Log security events** - Use `logSecurityEvent` function
5. **Test authentication** - Write tests for auth flows

### 2.2 For DevOps

1. **Use secrets manager** - Never store secrets in code
2. **Enable HTTPS only** - Reject unencrypted traffic
3. **Implement DDoS protection** - Use Cloudflare or similar
4. **Monitor logs** - Set up log aggregation
5. **Rotate credentials** - Every 90 days minimum

### 2.3 For Product Managers

1. **Plan security features** - MFA, audit trails, etc.
2. **Define data classification** - What data is sensitive?
3. **Set retention policies** - How long to keep logs?
4. **Communicate changes** - Notify users of security updates

---

## 3. Deployment Checklist

### Before Every Deployment

- [ ] Run `npm audit` - Check for vulnerabilities
- [ ] Run `npm install` - Update to latest versions
- [ ] Run `scripts/security-audit.js` - Verify setup
- [ ] Code review completed
- [ ] Tests passing
- [ ] No sensitive data in code
- [ ] Environment variables set
- [ ] Database backups ready
- [ ] Rollback plan documented

### Deployment Commands

```bash
# Install dependencies (production)
npm ci

# Build
npm run build

# Run security audit
node scripts/security-audit.js

# Deploy
npm run deploy
```

---

## 4. Monitoring & Maintenance

### Daily
- Check error logs for security-related issues
- Monitor authentication failures
- Review rate limit alerts

### Weekly
- Review access logs for anomalies
- Check for suspicious IPs
- Verify backups are working

### Monthly
- Update dependencies
- Rotate non-critical credentials
- Review security audit results

### Quarterly
- Full security assessment
- Penetration testing
- Update security documentation

---

## 5. Common Issues & Solutions

### Issue: Rate limiting too strict
**Solution**: Adjust in `lib/securityConfig.js` → `rateLimitPolicies`

### Issue: API authentication failing
**Solution**: Verify `JWT_SECRET` is set and correct

### Issue: Encryption errors
**Solution**: Ensure `ENCRYPTION_KEY` is 64-character hex string

### Issue: Failed deployment
**Solution**: Run security audit to identify issues

---

## 6. Security Files Reference

| File | Purpose |
|------|---------|
| `lib/security.js` | Input validation, sanitization, encryption |
| `lib/apiProtection.js` | API endpoint protection wrapper |
| `lib/securityConfig.js` | Centralized security policies |
| `scripts/security-audit.js` | Security validation script |
| `SECURITY.md` | Comprehensive security guide |
| `.env.example` | Environment variables template |

---

## 7. Key Security Features

### ✅ Implemented
- JWT authentication with expiration
- bcrypt password hashing (12 rounds)
- Rate limiting (multi-level)
- Input validation & sanitization
- CORS protection
- Security headers (CSP, HSTS, etc.)
- Session management
- Audit logging
- IP allowlist/blocklist support
- Encryption (AES-256-GCM)

### 🔄 To Implement
- Multi-factor authentication (MFA)
- Two-factor authentication (2FA)
- API key management
- Webhook signature verification
- Data encryption at rest
- Advanced threat detection

---

## 8. Compliance

### GDPR
- User consent for data processing ✓
- Right to be forgotten (data deletion)
- Data portability
- Privacy policy updated

### ISO 27001
- Information security policies ✓
- Access control ✓
- Encryption ✓
- Incident response ✓

### SOC 2
- Security monitoring ✓
- User access controls ✓
- Change management
- System recovery

---

## 9. Incident Response

### If a Security Incident Occurs

1. **Immediate Action** (within 1 hour)
   - Identify what happened
   - Contain the damage
   - Notify security team

2. **Investigation** (within 24 hours)
   - Gather evidence
   - Analyze logs
   - Determine scope

3. **Recovery** (within 72 hours)
   - Fix the vulnerability
   - Restore systems
   - Deploy patches

4. **Communication** (within 48-72 hours)
   - Notify affected users
   - File compliance reports
   - Update security measures

---

## 10. Support & Resources

- **Security Team**: [security@evcrm.in](mailto:security@evcrm.in)
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Node.js Security**: https://nodejs.org/en/docs/guides/security/
- **Report a Vulnerability**: Use GitHub Security Advisory

---

## Version History

- **2026-07-27**: Initial security setup guide

---

## Questions?

Contact the security team or create an issue in the internal wiki.

