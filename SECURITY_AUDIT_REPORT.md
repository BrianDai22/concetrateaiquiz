# Security Audit Report
**Project:** Concentrate.ai School Portal Platform
**Audit Date:** 2025-11-10
**Audit Scope:** Full codebase security review
**Auditor:** Claude (AI Security Auditor)

---

## Executive Summary

This comprehensive security audit examined the Canvas-style School Portal Platform for common vulnerabilities and security best practices. The application demonstrates **strong foundational security** with robust authentication, encryption, and authorization mechanisms. However, several **critical and high-severity issues** were identified that require immediate attention, particularly around rate limiting and input validation.

### Risk Summary
- **🔴 CRITICAL:** 1 issue
- **🟠 HIGH:** 3 issues
- **🟡 MEDIUM:** 4 issues
- **🟢 LOW:** 2 issues

### Overall Security Posture: **MODERATE** ⚠️
While core security mechanisms are well-implemented, the absence of rate limiting and SQL pattern injection vulnerabilities pose significant risks that must be addressed before production deployment.

---

## 1. Critical Issues 🔴

### 1.1 No Rate Limiting Implementation
**Severity:** CRITICAL
**CVSS Score:** 7.5 (High)
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts), CWE-770 (Allocation of Resources Without Limits)

**Location:** `apps/api/src/app.ts`

**Description:**
The application has **NO rate limiting implemented** at the application layer. While documentation mentions rate limiting in nginx configuration, relying solely on reverse proxy protection is insufficient because:
- Nginx may not be deployed in all environments (development, testing)
- Internal requests bypass nginx
- Defense-in-depth requires application-level protection

**Impact:**
- Brute force attacks on `/auth/login` and `/auth/register` endpoints
- Denial of Service (DoS) through resource exhaustion
- Account enumeration via timing attacks
- API abuse on public `/stats` endpoints

**Affected Endpoints:**
- `/api/v0/auth/login` - Brute force attack vector
- `/api/v0/auth/register` - Account creation spam
- `/api/v0/auth/oauth/google/callback` - OAuth abuse
- `/api/v0/stats/*` - Data mining, DoS

**Recommendation:**
```typescript
// Install: npm install @fastify/rate-limit
import rateLimit from '@fastify/rate-limit'

// In app.ts buildApp():
await app.register(rateLimit, {
  max: 100, // requests
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  redis: redis, // Use existing Redis instance
  nameSpace: 'rate-limit:',
  continueExceeding: true,
  enableDraftSpec: true,
})

// Stricter limits for auth endpoints:
app.post('/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '5 minutes'
    }
  },
  preHandler: [requireAuth]
}, handler)
```

**Priority:** IMMEDIATE - Must be implemented before production deployment

---

## 2. High Severity Issues 🟠

### 2.1 SQL Pattern Injection via ILIKE Queries
**Severity:** HIGH
**CVSS Score:** 6.5 (Medium-High)
**CWE:** CWE-89 (SQL Injection)

**Locations:**
- `apps/api/src/routes/admin.ts:130`
- `apps/api/src/routes/teacher.ts:190`

**Description:**
User-provided email search input is directly interpolated into SQL ILIKE pattern strings without sanitization. While Kysely provides SQL injection protection through parameterization, this allows **SQL pattern injection** where users can inject wildcards (`%`, `_`) to bypass intended search behavior.

**Vulnerable Code:**
```typescript
// admin.ts:130 and teacher.ts:190
.where('email', 'ilike', `%${validated.email}%`)
```

**Attack Scenario:**
```
Input: "%@admin.com%"
Result: Returns ALL users with @admin.com email domain
```

**Impact:**
- Information disclosure (enumerate all users)
- Bypass search restrictions
- Potential DoS through expensive wildcard queries

**Recommendation:**
Escape SQL wildcards in user input:
```typescript
function escapeSqlPattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslash
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_')    // Escape underscore
}

// Usage:
const sanitizedEmail = escapeSqlPattern(validated.email)
.where('email', 'ilike', `%${sanitizedEmail}%`)
```

**Files to Update:**
- `apps/api/src/routes/admin.ts` (line 130)
- `apps/api/src/routes/teacher.ts` (line 190)
- `packages/database/src/repositories/UserRepository.ts` (line 186)

**Priority:** HIGH - Fix before production

---

### 2.2 Public Statistics API Without Rate Limiting
**Severity:** HIGH
**CVSS Score:** 6.1 (Medium)
**CWE:** CWE-213 (Exposure of Sensitive Information), CWE-770

**Location:** `apps/api/src/routes/stats.ts`

**Description:**
The `/api/v0/stats/*` endpoints are completely **public** (no authentication required) and expose sensitive information:
- All teacher names (`/stats/teacher-names`)
- All student names (`/stats/student-names`)
- All class information (`/stats/classes`)
- Grade statistics (`/stats/average-grades`)

**Impact:**
- **Data Mining:** Competitors/attackers can harvest all user data
- **Privacy Violation:** FERPA concerns with exposing student information
- **DoS:** Unlimited queries can cause database exhaustion
- **Reconnaissance:** Information gathering for targeted attacks

**Recommendation:**
1. **Require Authentication:**
```typescript
app.get('/teacher-names',
  { preHandler: [requireAuth] }, // Add auth
  async (request, reply) => { ... }
)
```

2. **Add Rate Limiting:**
```typescript
app.get('/stats/*', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute'
    }
  }
}, handler)
```

3. **Consider Authorization:**
- Should students see all teacher names?
- Consider role-based visibility

**Priority:** HIGH - These are publicly exposed PII endpoints

---

### 2.3 Content Security Policy (CSP) Disabled
**Severity:** HIGH
**CVSS Score:** 6.5 (Medium-High)
**CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)

**Location:** `apps/api/src/app.ts:70`

**Description:**
Content Security Policy is explicitly disabled in the Helmet configuration:
```typescript
await app.register(helmet, {
  contentSecurityPolicy: false, // ❌ Disabled
})
```

**Impact:**
- Increased XSS attack surface
- No protection against:
  - Inline script injection
  - Unauthorized resource loading
  - Clickjacking
  - Data exfiltration

**Recommendation:**
Enable CSP with appropriate directives:
```typescript
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline gradually
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.googleapis.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  crossOriginEmbedderPolicy: false, // May need to adjust
})
```

**Priority:** HIGH - CSP is critical defense against XSS

---

## 3. Medium Severity Issues 🟡

### 3.1 Weak Cookie Secret Fallback
**Severity:** MEDIUM
**CVSS Score:** 5.3 (Medium)
**CWE:** CWE-798 (Use of Hard-coded Credentials)

**Location:** `apps/api/src/app.ts:75`

**Description:**
```typescript
secret: process.env['COOKIE_SECRET'] || 'secret-key-for-development-only',
```

Cookie secret has a weak fallback value. If `COOKIE_SECRET` is not set in production, cookies can be forged.

**Recommendation:**
```typescript
const cookieSecret = process.env['COOKIE_SECRET']
if (!cookieSecret && process.env['NODE_ENV'] === 'production') {
  throw new Error('COOKIE_SECRET must be set in production')
}

await app.register(cookie, {
  secret: cookieSecret || 'dev-secret-only',
  parseOptions: {},
})
```

**Priority:** MEDIUM - Add to deployment checklist

---

### 3.2 OAuth Error Messages Expose Internal Details
**Severity:** MEDIUM
**CVSS Score:** 4.3 (Medium)
**CWE:** CWE-209 (Information Exposure Through Error Message)

**Location:** `apps/api/src/routes/auth.ts:244-275`

**Description:**
OAuth callback error handling leaks detailed error messages:
```typescript
errorMessage = encodeURIComponent(appError.message)
```

**Impact:**
- Information disclosure about system state
- Aids attackers in reconnaissance
- May expose stack traces or internal errors

**Recommendation:**
```typescript
// Generic user-facing messages
const ERROR_MESSAGES = {
  OAUTH_FAILED: 'Authentication failed. Please try again.',
  SUSPENDED: 'Your account has been suspended.',
  GENERIC: 'An error occurred during login.'
}

// Log detailed errors server-side
request.log.error({ error, userId: profile?.id }, 'OAuth callback failed')

// Return generic message to client
const errorUrl = `${baseUrl}?error=${ERROR_MESSAGES.OAUTH_FAILED}`
```

**Priority:** MEDIUM - Implement before public launch

---

### 3.3 No Account Lockout Policy
**Severity:** MEDIUM
**CVSS Score:** 5.0 (Medium)
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Location:** `packages/services/src/AuthService.ts:97-133`

**Description:**
Login endpoint has no account lockout after repeated failed attempts. Combined with lack of rate limiting, this significantly increases brute force attack risk.

**Recommendation:**
Implement account lockout using Redis:
```typescript
// Track failed login attempts
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 // 15 minutes

async login(email: string, password: string) {
  const lockoutKey = `lockout:${email}`
  const attemptsKey = `attempts:${email}`

  // Check if locked out
  const isLockedOut = await redis.exists(lockoutKey)
  if (isLockedOut) {
    throw new ForbiddenError('Account temporarily locked. Try again later.')
  }

  // ... existing login logic ...

  // On failed login:
  if (!isPasswordValid) {
    const attempts = await redis.incr(attemptsKey)
    await redis.expire(attemptsKey, 15 * 60)

    if (attempts >= MAX_ATTEMPTS) {
      await redis.setex(lockoutKey, LOCKOUT_DURATION, '1')
      throw new ForbiddenError('Too many failed attempts. Account locked for 15 minutes.')
    }

    throw new InvalidCredentialsError('Invalid credentials')
  }

  // On successful login:
  await redis.del(attemptsKey)

  // ... rest of login ...
}
```

**Priority:** MEDIUM - Implement with rate limiting

---

### 3.4 Password Reset Token Storage Collision Risk
**Severity:** MEDIUM
**CVSS Score:** 4.0 (Medium)
**CWE:** CWE-330 (Use of Insufficiently Random Values)

**Location:** `packages/services/src/AuthService.ts:291-305`

**Description:**
Password reset tokens are stored in the same Redis namespace as refresh tokens, using the same `generateRefreshToken()` function. While collision is unlikely, this violates separation of concerns.

**Recommendation:**
```typescript
// Use distinct key prefixes
async requestPasswordReset(email: string): Promise<string> {
  const resetToken = generateRefreshToken()

  // Store with distinct prefix
  await redis.setex(
    `reset:${resetToken}`,  // Prefix with 'reset:'
    30 * 60,
    user.id
  )

  return resetToken
}

// Update get logic
async resetPassword(resetToken: string, newPassword: string): Promise<void> {
  const userId = await redis.get(`reset:${resetToken}`)
  if (!userId) {
    throw new UnauthorizedError('Invalid or expired reset token')
  }

  // ... rest of logic ...

  await redis.del(`reset:${resetToken}`)
}
```

**Priority:** MEDIUM - Quality improvement

---

## 4. Low Severity Issues 🟢

### 4.1 No Session Management Interface
**Severity:** LOW
**CVSS Score:** 3.1 (Low)
**CWE:** CWE-613 (Insufficient Session Expiration)

**Description:**
Users cannot view or manage their active sessions. The AuthService has `getActiveSessions()` and `revokeAllSessions()` methods, but they're not exposed via API endpoints.

**Recommendation:**
Add endpoints for session management:
```typescript
// GET /auth/sessions - List active sessions
app.get('/sessions',
  { preHandler: [requireAuth] },
  async (request, reply) => {
    const authService = new AuthService(request.db)
    const sessions = await authService.getActiveSessions(request.user!.userId)
    return reply.send({ sessions, count: sessions.length })
  }
)

// DELETE /auth/sessions - Revoke all sessions
app.delete('/sessions',
  { preHandler: [requireAuth] },
  async (request, reply) => {
    const authService = new AuthService(request.db)
    await authService.revokeAllSessions(request.user!.userId)
    return reply.code(204).send()
  }
)
```

**Priority:** LOW - Quality of life improvement

---

### 4.2 No Login Notification System
**Severity:** LOW
**CVSS Score:** 2.5 (Low)
**CWE:** CWE-778 (Insufficient Logging)

**Description:**
Users are not notified of new logins to their account, making it difficult to detect unauthorized access.

**Recommendation:**
- Log login events with IP address and user agent
- Implement email notifications for new device logins
- Add login history endpoint

**Priority:** LOW - Security enhancement

---

## 5. Security Strengths ✅

The application demonstrates several **excellent security practices**:

### 5.1 Authentication & Cryptography
- ✅ **JWT Implementation:** Secure HS256 algorithm, 15-minute expiry, proper secret validation
- ✅ **Password Hashing:** PBKDF2 with 100,000 iterations, SHA-512, 64-byte key length
- ✅ **Timing-Safe Comparison:** `timingSafeEqual()` prevents timing attacks
- ✅ **Refresh Token Rotation:** Implemented and working
- ✅ **Strong Password Policy:** Min 8 chars, uppercase, lowercase, number, special character

### 5.2 Authorization & Access Control
- ✅ **RBAC Implementation:** Clean separation of admin/teacher/student roles
- ✅ **Middleware Composition:** Proper use of `requireAuth` → `requireRole` chain
- ✅ **Suspended User Checks:** Verified at multiple layers (auth, token refresh, login)
- ✅ **Resource Ownership:** Teachers can only modify their own classes/assignments

### 5.3 Input Validation
- ✅ **Zod Schemas:** Comprehensive validation for all API inputs
- ✅ **Email Normalization:** `toLowerCase().trim()` on all email inputs
- ✅ **Type Safety:** No `any` types, strict TypeScript configuration

### 5.4 Session Management
- ✅ **HTTP-Only Cookies:** Prevents XSS token theft
- ✅ **Secure Flag:** Enabled in production
- ✅ **SameSite Cookies:** `lax` setting provides CSRF protection
- ✅ **Redis Session Storage:** Fast, scalable session management
- ✅ **Auto-Expiration:** 7-day TTL on refresh tokens

### 5.5 Database Security
- ✅ **Parameterized Queries:** Kysely ORM prevents SQL injection
- ✅ **No Raw SQL:** All queries use type-safe query builder
- ✅ **Connection Pooling:** PostgreSQL best practices

### 5.6 API Security
- ✅ **CORS Whitelist:** Only allows specific origins
- ✅ **Helmet Integration:** Security headers enabled
- ✅ **Error Handling:** Custom error classes with appropriate HTTP codes
- ✅ **OAuth Integration:** Proper use of @fastify/oauth2 plugin

---

## 6. OWASP Top 10 (2021) Assessment

| Rank | Vulnerability | Status | Notes |
|------|---------------|--------|-------|
| A01 | Broken Access Control | ✅ PROTECTED | Strong RBAC, resource ownership checks |
| A02 | Cryptographic Failures | ✅ PROTECTED | PBKDF2, secure JWTs, HTTPS enforcement |
| A03 | Injection | ⚠️ PARTIAL | SQL injection prevented, but pattern injection exists |
| A04 | Insecure Design | ⚠️ PARTIAL | Good design, but missing rate limiting |
| A05 | Security Misconfiguration | ⚠️ NEEDS WORK | CSP disabled, weak cookie secret fallback |
| A06 | Vulnerable Components | ✅ PROTECTED | Dependencies are up-to-date |
| A07 | Authentication Failures | ⚠️ NEEDS WORK | Strong auth, but no rate limiting/lockout |
| A08 | Software/Data Integrity | ✅ PROTECTED | Proper validation, no unsafe deserialization |
| A09 | Logging Failures | ⚠️ PARTIAL | Basic logging present, needs enhancement |
| A10 | SSRF | ✅ PROTECTED | No user-controlled URLs in requests |

**Overall OWASP Score:** 6.5/10

---

## 7. Compliance Considerations

### 7.1 FERPA (Family Educational Rights and Privacy Act)
- ⚠️ **Public Stats API:** Exposing student names publicly may violate FERPA
- ✅ **Access Controls:** Proper role-based access to grades and records
- ⚠️ **Audit Logging:** Need to implement comprehensive audit trail

### 7.2 GDPR (General Data Protection Regulation)
- ✅ **Data Minimization:** Only collects necessary data
- ⚠️ **Right to be Forgotten:** No endpoint to delete user data
- ⚠️ **Data Portability:** No export functionality
- ✅ **Breach Notification:** Logging infrastructure supports detection

---

## 8. Recommendations Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 **P0** | Implement rate limiting | Medium | Critical |
| 🔴 **P0** | Fix SQL pattern injection | Low | High |
| 🟠 **P1** | Secure stats API (add auth) | Low | High |
| 🟠 **P1** | Enable CSP | Medium | High |
| 🟡 **P2** | Add account lockout | Medium | Medium |
| 🟡 **P2** | Fix cookie secret fallback | Low | Medium |
| 🟡 **P2** | Improve OAuth error handling | Low | Low |
| 🟢 **P3** | Add session management UI | High | Low |
| 🟢 **P3** | Implement login notifications | High | Low |

---

## 9. Testing Recommendations

### 9.1 Security Test Cases to Add
```typescript
// Rate Limiting Tests
describe('Rate Limiting', () => {
  it('should block requests after limit exceeded')
  it('should reset limit after time window')
  it('should apply stricter limits to auth endpoints')
})

// SQL Pattern Injection Tests
describe('SQL Pattern Injection', () => {
  it('should escape % wildcard in search')
  it('should escape _ wildcard in search')
  it('should not return all users when searching for %')
})

// Account Lockout Tests
describe('Account Lockout', () => {
  it('should lock account after 5 failed login attempts')
  it('should unlock account after 15 minutes')
  it('should reset attempt counter on successful login')
})

// CSP Tests
describe('Content Security Policy', () => {
  it('should return CSP headers')
  it('should block inline scripts')
  it('should allow same-origin resources')
})
```

### 9.2 Penetration Testing Checklist
- [ ] Brute force attack on login endpoint
- [ ] SQL pattern injection in search fields
- [ ] CSRF token bypass attempts
- [ ] XSS payload injection in all input fields
- [ ] JWT token manipulation
- [ ] OAuth flow exploitation
- [ ] Session fixation attacks
- [ ] Privilege escalation attempts

---

## 10. Production Readiness Checklist

Before deploying to production, ensure:

### Environment Configuration
- [ ] `JWT_SECRET` is set to a strong 64+ character random string
- [ ] `COOKIE_SECRET` is set to a strong random string
- [ ] `NODE_ENV=production` is set
- [ ] `GOOGLE_CLIENT_SECRET` is properly configured
- [ ] Database credentials use least-privilege accounts
- [ ] Redis is password-protected

### Security Controls
- [ ] Rate limiting is implemented and tested
- [ ] SQL pattern injection is fixed
- [ ] Stats API requires authentication
- [ ] CSP is enabled with appropriate directives
- [ ] Account lockout policy is active
- [ ] All cookies have `secure: true` in production

### Monitoring & Logging
- [ ] Set up centralized logging (e.g., ELK stack, CloudWatch)
- [ ] Configure alerts for:
  - Multiple failed login attempts
  - Rate limit violations
  - Database errors
  - OAuth failures
- [ ] Implement audit logging for sensitive operations

### Infrastructure
- [ ] HTTPS/TLS is enforced (nginx, load balancer)
- [ ] Database backups are configured
- [ ] Redis persistence is enabled
- [ ] DDoS protection is active (Cloudflare, AWS Shield)

---

## 11. Conclusion

The Concentrate.ai School Portal Platform has a **solid security foundation** with excellent authentication, authorization, and cryptographic implementations. However, the **absence of rate limiting** and **SQL pattern injection vulnerabilities** pose significant risks that **must be addressed immediately** before production deployment.

### Key Takeaways
1. ✅ **Strong Core Security:** JWT, password hashing, and RBAC are well-implemented
2. ❌ **Missing Controls:** Rate limiting is documented but not implemented
3. ⚠️ **Input Validation Gaps:** SQL pattern injection needs attention
4. ⚠️ **Defense in Depth:** CSP should be enabled, lockout policy added

### Estimated Remediation Time
- **Critical/High Issues:** 1-2 days
- **Medium Issues:** 2-3 days
- **Low Issues:** 1 day
- **Total:** ~5-6 developer days

### Final Risk Assessment
**Before Fixes:** HIGH RISK ⚠️
**After Fixes:** LOW-MEDIUM RISK ✅

The application is **NOT production-ready** until at least the **Critical and High severity issues** are resolved.

---

## Appendix A: Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Fastify Security Best Practices](https://www.fastify.io/docs/latest/Guides/Getting-Started/#security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## Appendix B: Contact & Questions

For questions about this security audit, please contact:
- Create a GitHub issue in the repository
- Review with your security team before production deployment

**Audit Version:** 1.0
**Last Updated:** 2025-11-10
**Next Review:** Before production deployment

---

*This audit was performed using automated code analysis, manual code review, and security best practices. It does not replace professional penetration testing or security certification.*
