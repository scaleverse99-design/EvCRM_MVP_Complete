# EvCRM Security Hardening Guide

## Overview
This document provides comprehensive security guidelines and implementation details for the EvCRM platform. All developers and DevOps team members should be familiar with these guidelines.

---

## 1. Authentication & Authorization

### 1.1 JWT Token Security
- **Algorithm**: HS256 with strong secret (minimum 32 characters)
- **Expiration**: 7 days (configurable via JWT_EXPIRES)
- **Storage**: HttpOnly, Secure, SameSite=Strict cookies
- **Validation**: Always verify token signature and expiration before processing

### 1.2 Rate Limiting
The system implements multi-level rate limiting:
- **Email-based**: 5 failed attempts per 15 minutes
- **IP-based**: 10 failed attempts per 15 minutes
- **API endpoints**: 30 requests per minute per user/IP

### 1.3 Password Security
- **Hashing**: bcrypt with 12 rounds
- **Minimum Requirements**:
  - At least 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character
- **Never** store or log passwords in plain text
- **Always** use secure password hashing (bcrypt, scrypt, or Argon2)

### 1.4 Session Management
- Sessions stored in database with token hash (NOT plain tokens)
- Session expiration: 7 days from creation
- Automatic session validation on every request
- IP and User-Agent logging for anomaly detection

---

## 2. Data Protection

### 2.1 Input Validation & Sanitization
All user inputs must be validated and sanitized:

```javascript
import {
  isValidEmail,
  sanitizeInput,
  isValidPhoneNumber,
  sanitizeObject
} from "../lib/security"

// Email validation
if (!isValidEmail(email)) {
  return sendError("Invalid email format", 400)
}

// Input sanitization
const cleanName = sanitizeInput(req.body.name)

// Object sanitization
const cleanData = sanitizeObject(req.body, ["email", "name", "phone"])
```

### 2.2 Output Encoding
- Always HTML-encode user-controlled content before displaying
- Use React's automatic escaping (avoid dangerouslySetInnerHTML)
- Encode JSON responses appropriately

### 2.3 Database Security
- Use parameterized queries (our JSON file-based DB is safe from SQL injection)
- Never concatenate user input into queries
- Always hash sensitive data before storage (passwords, OTPs, tokens)
- Implement query result filtering based on user permissions

### 2.4 Encryption
Sensitive data at rest:
- Payment information (encrypted using AES-256-GCM)
- Personal identifiable information (PII)
- API keys and secrets

```javascript
import { encryptData, decryptData } from "../lib/security"

// Encrypt
const encrypted = encryptData(sensitiveData, encryptionKey)

// Decrypt
const decrypted = decryptData(encrypted.encrypted, encrypted.iv, encrypted.authTag, encryptionKey)
```

---

## 3. API Security

### 3.1 Using Protected API Wrapper
All API endpoints should use the protectedAPI wrapper:

```javascript
import { protectedAPI } from "../lib/apiProtection"

export const POST = protectedAPI(
  async (req, user, { clientIP, rateLimitResult }) => {
    // Handler logic
    return { success: true, data: result }
  },
  {
    requireAuth: true,
    requiredRoles: ["dealer", "admin"],
    rateLimit: 10,
    rateLimitWindow: 60
  }
)
```

### 3.2 CORS Configuration
- Only allow requests from trusted domains
- Use credentials: "include" carefully
- Implement preflight response validation

### 3.3 HTTP Headers
Security headers automatically added by protectedAPI:
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Referrer-Policy

---

## 4. Environment Variables & Secrets

### 4.1 Required Environment Variables
```env
JWT_SECRET=<32+ character random string>
ENCRYPTION_KEY=<64-character hex string for AES-256>
SUPABASE_SERVICE_ROLE_KEY=<production key>
RAZORPAY_KEY_SECRET=<production key>
CLOUDFLARE_API_TOKEN=<token>
GEMINI_API_KEY=<api key>
IP_BLOCKLIST=<comma-separated IPs to block>
```

### 4.2 Secrets Management
- **NEVER** commit `.env.production` to git
- Use `.env.example` as template
- Store production secrets in:
  - Firebase Secrets Manager
  - Google Cloud Secret Manager
  - AWS Secrets Manager
  - HashiCorp Vault

### 4.3 Credential Rotation
- Rotate API keys every 90 days
- Immediately rotate if compromised
- Maintain rotation audit log

---

## 5. File Upload Security

### 5.1 File Type Validation
- Validate file extensions
- Check MIME types (don't rely solely on this)
- Scan files for malware

### 5.2 Storage Security
- Store uploads outside web root
- Use unique filenames (not user-provided)
- Limit file size (e.g., 50MB max)
- Serve files via proxy endpoint (not directly)

---

## 6. Logging & Monitoring

### 6.1 Security Events to Log
- Authentication attempts (success/failure)
- Authorization failures
- Rate limit violations
- API errors
- File uploads
- Data access patterns

### 6.2 Log Contents
Never log:
- Passwords or password hashes
- API keys or secrets
- Credit card numbers
- OTPs or verification codes
- Personal sensitive information

Always log:
- Timestamp
- User ID
- IP address
- Request details
- Action/outcome
- Error messages (sanitized)

### 6.3 Log Storage
- Store in secure, tamper-evident location
- Rotate logs regularly
- Retain logs for minimum 90 days
- Implement log aggregation (e.g., ELK stack, DataDog)

---

## 7. Third-Party & Dependencies

### 7.1 Dependency Security
```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Keep dependencies updated
npm update

# Use npm ci for production (instead of npm install)
npm ci
```

### 7.2 Vulnerable Package Handling
- Review npm audit reports regularly
- Use Snyk or Dependabot for continuous monitoring
- Don't include unnecessary packages
- Pin package versions for stability

---

## 8. Infrastructure Security

### 8.1 Database Security
- Encrypt connections (SSL/TLS)
- Use strong credentials
- Implement database-level access controls
- Regular backups with encryption
- Test restore procedures

### 8.2 API Gateway / Load Balancer
- Enable DDoS protection
- Implement rate limiting at gateway level
- Use WAF (Web Application Firewall)
- Enable request/response logging

### 8.3 Deployment Security
- Use HTTPS only (enforce redirect)
- Implement HSTS (Strict-Transport-Security)
- Keep deployment platforms updated
- Use secure configuration management
- Implement infrastructure as code (IaC)

---

## 9. Incident Response

### 9.1 Security Incident Checklist
1. **Identify**: What happened?
2. **Contain**: Prevent further damage
3. **Eradicate**: Remove the threat
4. **Recover**: Restore systems to normal
5. **Learn**: Post-mortem and prevention

### 9.2 Breach Response
- Immediately rotate all compromised credentials
- Audit logs for unauthorized access
- Notify affected users
- File regulatory reports if required
- Implement fixes to prevent recurrence

### 9.3 Security Contacts
- Security Lead: [Name/Email]
- DevOps Lead: [Name/Email]
- Incident Commander: [Name/Email]

---

## 10. Regular Security Tasks

### 10.1 Daily
- Monitor security logs for anomalies
- Check rate limit alerts
- Review failed authentication attempts

### 10.2 Weekly
- Review access logs
- Check for suspicious IPs
- Update IP blocklist if needed

### 10.3 Monthly
- Review security patches
- Update dependencies
- Rotate non-critical credentials
- Review access controls

### 10.4 Quarterly
- Security audit
- Penetration testing (if applicable)
- Update security policies
- Team security training

### 10.5 Annually
- Full security assessment
- Update incident response plan
- Comprehensive penetration test
- Update compliance documentation

---

## 11. Security Checklist for New Features

Before deploying new features:

- [ ] All inputs validated and sanitized
- [ ] Authentication/authorization checked
- [ ] Rate limiting applied
- [ ] Security headers set
- [ ] Error handling (no sensitive info exposed)
- [ ] Logging implemented
- [ ] Database queries are safe
- [ ] File uploads (if applicable) validated
- [ ] Third-party services vetted
- [ ] Security tests written
- [ ] Code review completed
- [ ] OWASP Top 10 considerations checked

---

## 12. OWASP Top 10 Mitigations

1. **SQL Injection**: Using parameterized queries (JSON storage)
2. **Authentication Flaws**: JWT with rate limiting, strong password requirements
3. **XSS**: Input sanitization, output encoding, CSP headers
4. **XML External Entities (XXE)**: Not parsing untrusted XML
5. **Broken Access Control**: RBAC, middleware validation
6. **Security Misconfiguration**: Centralized security configuration, regular audits
7. **Cross-Site Request Forgery (CSRF)**: CSRF token validation, SameSite cookies
8. **Using Components with Known Vulnerabilities**: npm audit, dependency scanning
9. **Insufficient Logging & Monitoring**: Comprehensive security event logging
10. **Broken API**: API protection wrapper, input validation, rate limiting

---

## 13. Developer Guidelines

### 13.1 Code Review Checklist
Security items to check in every PR:
- No secrets committed
- All inputs validated
- Authentication/authorization proper
- Error messages don't expose sensitive info
- Security headers present
- Dependencies have no vulnerabilities
- Rate limiting considered

### 13.2 Local Development Security
- Use `.env.local` for local secrets (in .gitignore)
- Don't use production credentials locally
- Use HTTPS for local development (if possible)
- Keep dependencies updated locally
- Run security checks before committing

### 13.3 Testing Security
- Write tests for authentication/authorization
- Test invalid input handling
- Test rate limiting
- Verify error messages are safe
- Test edge cases

---

## 14. References & Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP API Security: https://owasp.org/www-project-api-security/
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- CWE Top 25: https://cwe.mitre.org/top25/

---

## Appendix: Common Security Issues & Fixes

### Issue: Rate limiting not working
**Fix**: Verify rate limit store is persistent across requests

### Issue: Tokens not expiring
**Fix**: Check JWT_EXPIRES environment variable and session expiration logic

### Issue: Sensitive data in logs
**Fix**: Use sanitizeInput() on all user-controlled values before logging

### Issue: CORS errors on API calls
**Fix**: Ensure production domain is in CORS allowlist

### Issue: Failed deployments with env vars
**Fix**: Verify all required environment variables are set in deployment platform

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-07-27 | 1.0.0 | Initial security hardening guide |

---

## Sign-Off

This document must be reviewed and approved by:
- [ ] Security Lead
- [ ] CTO/Technical Lead
- [ ] DevOps Lead

Last Updated: 2026-07-27
Next Review: 2026-10-27
