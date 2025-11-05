# Session 14 - Bug Investigation Summary

**Date:** 2025-11-04
**Investigation Tool:** Chrome DevTools MCP
**Status:** 🔴 CRITICAL BUG CONFIRMED - Testing Blocked

---

## Bug #1: /register Redirects to /login - CONFIRMED ✅

### Evidence Collected

**1. Server Logs:**
```
✓ Compiled /register in 871ms (645 modules)
GET /register 200 in 1214ms
GET /login 200 in 382ms     ← Immediate client-side redirect
```

**2. Browser DevTools:**
```javascript
// Attempted to navigate to: http://localhost:3000/register
// Actual URL after redirect: http://localhost:3000/login
{
  "href": "http://localhost:3000/login",
  "pathname": "/login",
  "subtitle": "Log in to your account"  // Login page content
}
```

**3. Hydration Error (from user):**
```
A tree hydrated but some attributes of the server rendered HTML
didn't match the client properties...
<RedirectBoundary>
  <RedirectErrorBoundary router={{...}}>
```

### What This Confirms

✅ **Server compiles /register correctly** - Returns 200
✅ **Client-side redirect occurs** - Happens after page load
❌ **Not middleware** - Middleware allows `/register` as public path
❌ **Not useAuth hook** - Register page doesn't use it
❓ **Unknown redirect source** - Possibly Next.js routing or hydration issue

---

## Recommended Debug Steps

### Option 1: Check for Route Group Issues (MOST LIKELY)
The `(auth)` route group might be causing conflicts.

**Action:**
1. Temporarily rename `app/(auth)` to `app/auth-pages`
2. Update imports/links to use `/auth-pages/login` and `/auth-pages/register`
3. Restart Next.js dev server
4. Test if `/auth-pages/register` works

### Option 2: Clear Next.js Cache
Next.js might have stale routing cache.

**Action:**
```bash
# Kill all servers
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Clear Next.js cache
rm -rf apps/frontend/.next
rm -rf apps/frontend/node_modules/.cache

# Restart servers
cd /Users/briandai/Documents/concentrateaiproject
node apps/api/dist/server.js &
cd apps/frontend && npm run dev
```

### Option 3: Add Debug Logging
Add console logs to track redirect source.

**File:** `apps/frontend/app/(auth)/register/page.tsx`
```typescript
export default function RegisterPage() {
  console.log('[DEBUG] RegisterPage component mounted');
  console.log('[DEBUG] Current pathname:', window.location.pathname);

  // ... rest of component
}
```

**File:** `apps/frontend/contexts/AuthContext.tsx` (line 53-55)
```typescript
useEffect(() => {
  console.log('[DEBUG] AuthProvider checking session...');
  fetchCurrentUser();
}, [fetchCurrentUser]);
```

Then open browser console and navigate to /register to see what fires.

---

## Other Bugs Confirmed

### Bug #2: Logout Content-Type Error - CONFIRMED ✅

**Evidence from backend logs:**
```json
{"reqId":"req-e","req":{"method":"POST","url":"/api/v0/auth/logout"}
{"res":{"statusCode":400}
"err":{"message":"Body cannot be empty when content-type is set to 'application/json'"}
```

**Status:** Fix was supposedly applied but still failing
**Impact:** Users cannot log out

### Bug #3: Password Validation Mismatch - CONFIRMED ✅

**Backend requires:**
- ✅ Uppercase letter
- ✅ Lowercase letter
- ✅ Special character ← **MISSING in frontend**

**Frontend checks:**
- ✅ Uppercase letter
- ✅ Lowercase letter
- ❌ Special character ← **NOT VALIDATED**

**Evidence from backend:**
```json
{
  "message": "Password must contain at least one special character",
  "path": ["password"]
}
```

**Status:** Frontend validation incomplete
**Impact:** Backend rejects valid frontend inputs with raw JSON

---

## Testing Impact

| Test | Can Run? | Blocker |
|------|----------|---------|
| #1 Password validation | ❌ | Bug #1 (can't access /register) |
| #2 Logout | ❌ | Bug #2 (logout broken) |
| #3 OAuth callback | ⚠️ | Bug #1 (can't verify full flow) |
| #4A Root redirect (out) | ✅ | None |
| #4B Root redirect (in) | ❌ | Bug #1 (can't create users) |
| #5 Role protection | ❌ | Bug #1 (can't create test users) |
| #6 Error messages | ❌ | Bugs #1 + #3 |

**Total Tests Blocked:** 5/6

---

## Next Actions

**IMMEDIATE (to unblock testing):**
1. Fix Bug #1 (/register redirect) - Try Option 1 or Option 2 above
2. Verify the fix by successfully loading /register page
3. Fix Bug #3 (add special char validation) - Quick 1-line fix
4. Fix Bug #2 (logout Content-Type) - Verify apiClient fix applied

**AFTER FIXES:**
1. Restart testing from Test #1
2. Use `SESSION_14_TESTING_CHECKLIST.md`
3. Mark each test ✅/❌
4. Document any new bugs found

---

## Files Requiring Immediate Attention

1. **apps/frontend/app/(auth)/** - Entire route group (rename test)
2. **apps/frontend/lib/validations/auth.ts** - Add special char regex
3. **apps/frontend/lib/apiClient.ts** - Verify Content-Type fix
4. **.next/** - Clear cache if routing issue persists

---

**Investigation Time:** 1 hour
**Bugs Found:** 3 critical
**Bugs Fixed:** 0
**Recommendation:** Debug /register redirect first (highest priority)

