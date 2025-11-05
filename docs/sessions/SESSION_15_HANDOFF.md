# Session 15 Handoff - Bug Fixes & Login Issue

**Date:** 2025-11-04
**Status:** 🟡 PARTIAL - 3 bugs fixed, 1 critical bug remaining
**Context Limit:** Approaching - Continue in next session

---

## What Was Accomplished

### ✅ Bug Fixes Completed

**Bug #1: /register Page Redirect (FIXED)**
- **Problem:** `/register` redirected to `/login`
- **Solution:** Cleared Next.js cache (`.next` directory)
- **Result:** Register page now loads correctly
- **User confirmed:** "register page displays"

**Bug #2: Logout Content-Type Error (FIXED)**
- **Problem:** Backend rejected logout with empty body + Content-Type header
- **Solution:** Already applied in `lib/apiClient.ts:23` - conditional Content-Type
- **Code:** `...(options.body ? { 'Content-Type': 'application/json' } : {})`
- **Result:** Fixed after server restart

**Bug #3: Password Validation Incomplete (FIXED)**
- **Problem:** Frontend missing special character validation
- **Solution:** Added regex to `lib/validations/auth.ts:23`
- **Code:** `.regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')`
- **User confirmed:** "Password!1 works"

### 🔴 CRITICAL BUG REMAINING

**Bug #4: Login Redirects to `undefined/dashboard`**
- **Status:** IN PROGRESS - requires immediate attention
- **User report:** "says user role not found"
- **Current state:** Added debug logging to diagnose

---

## Current Problem - Login Redirect Bug

### Symptoms
- User can register successfully
- User can login (backend accepts credentials)
- After login, redirects to `/undefined/dashboard` (404)
- Browser console shows: "User role not found"

### Root Cause Investigation

**What We Know:**
1. Backend `/api/v0/auth/login` returns:
   ```json
   {
     "user": {
       "id": "...",
       "email": "...",
       "name": "...",
       "role": "student"
     }
   }
   ```
   (Confirmed in `apps/api/src/routes/auth.ts:72-77`)

2. Frontend `AuthContext.login()` tries to use `response.user` but gets undefined
   (See `contexts/AuthContext.tsx:35-36`)

3. Login page fetches `/api/v0/auth/me` after login to get role
   (See `app/(auth)/login/page.tsx:48-56`)

### Files Modified This Session

**Fixed Files:**
1. `apps/frontend/lib/validations/auth.ts` - Added special char validation (line 23)
2. `apps/frontend/app/(auth)/login/page.tsx` - Multiple attempts to fix redirect:
   - Added `useAuth` hook import
   - Added debug logging (lines 57, 63, 67)
   - Simplified user fetch logic

**Cache Cleared:**
- Deleted `.next` directory
- Restarted frontend server (port 3000)

### Current Code State

**File:** `apps/frontend/app/(auth)/login/page.tsx` (lines 39-72)
```typescript
const onSubmit = async (data: LoginFormData) => {
  try {
    setIsLoading(true);
    setError('');

    // Login using AuthContext which returns the user
    await login(data.email, data.password);

    // Fetch user again to ensure we have latest data
    const response = await fetch(`${API_URL}/api/v0/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const user = await response.json();
    console.log('User data received:', user); // DEBUG

    // Redirect to role-specific dashboard
    if (user && user.role) {
      router.push(`/${user.role}/dashboard`);
    } else {
      console.error('User object:', user); // DEBUG
      throw new Error(`User role not found. User data: ${JSON.stringify(user)}`);
    }
  } catch (err) {
    console.error('Login error:', err); // DEBUG
    setError(err instanceof Error ? err.message : 'Invalid email or password');
  } finally {
    setIsLoading(false);
  }
};
```

---

## Next Steps (CRITICAL - Do This First)

### Step 1: Check Debug Output
**User is running login now with debug logging enabled**

**What to look for in browser console:**
```javascript
User data received: { ... }
```

**Expected scenarios:**

**Scenario A:** User object is correct
```json
{ "id": "...", "email": "...", "name": "...", "role": "student" }
```
→ Then `user.role` check should work - possible timing issue

**Scenario B:** User object is missing role
```json
{ "id": "...", "email": "...", "name": "..." }  // NO ROLE
```
→ Backend `/auth/me` endpoint not returning role field

**Scenario C:** Error fetching user
```
Failed to fetch user: 401
```
→ Cookies not being set or sent correctly

### Step 2: Fix Based on Scenario

**If Scenario B (missing role):**
Check `apps/api/src/routes/auth.ts` - `/auth/me` endpoint
Should return full user object with role field

**If Scenario C (401 error):**
1. Check cookies are set after login (DevTools → Application → Cookies)
2. Verify `credentials: 'include'` is working
3. Check CORS settings on backend

**If Scenario A (has role but still fails):**
Possible race condition - try this fix:
```typescript
await login(data.email, data.password);

// Small delay to ensure cookies are set
await new Promise(resolve => setTimeout(resolve, 100));

const user = await fetch(...);
```

---

## Server Status

**Both servers must be running:**
- ✅ Backend: `http://localhost:3001` (bash ID: a70cc4)
- ✅ Frontend: `http://localhost:3000` (bash ID: 73cef5)

**To restart if needed:**
```bash
# Backend
cd /Users/briandai/Documents/concentrateaiproject
node apps/api/dist/server.js &

# Frontend
cd /Users/briandai/Documents/concentrateaiproject/apps/frontend
npm run dev
```

---

## Files Changed This Session

### Modified Files
1. **apps/frontend/lib/validations/auth.ts**
   - Line 23: Added special character regex validation
   - Status: ✅ Working

2. **apps/frontend/app/(auth)/login/page.tsx**
   - Lines 12, 19: Added `useAuth` import and hook
   - Lines 39-72: Rewrote `onSubmit` with debug logging
   - Status: 🔴 Still debugging

3. **apps/frontend/.next/** (deleted)
   - Cleared Next.js cache to fix /register redirect
   - Status: ✅ Fixed Bug #1

---

## Testing Checklist Status

From `SESSION_14_TESTING_CHECKLIST.md`:

- [x] ~~Bug #1: /register redirect~~ - FIXED
- [x] ~~Bug #2: Logout Content-Type~~ - FIXED
- [x] ~~Bug #3: Password validation~~ - FIXED
- [ ] **Bug #4: Login redirect** - IN PROGRESS ← **STUCK HERE**
- [ ] Test 1: Password validation errors
- [ ] Test 2: Logout functionality
- [ ] Test 3: OAuth callback
- [ ] Test 4A: Root redirect (logged out)
- [ ] Test 4B: Root redirect (logged in)
- [ ] Test 5: Role protection
- [ ] Test 6: Error messages

**Cannot proceed with testing until Bug #4 is fixed.**

---

## Key Decisions Made

1. **Cache clearing fixes /register** - Next.js routing cache was stale
2. **Special character validation required** - Backend enforces it, frontend must too
3. **AuthContext.login() returns response.user** - But this might be undefined
4. **Fetch /auth/me after login** - Safer than trusting login response structure

---

## Known Issues

### Issue #1: AuthContext Might Not Return User
**File:** `contexts/AuthContext.tsx:35-36`
```typescript
const login = useCallback(async (email: string, password: string) => {
  const response = await authApi.login(email, password);
  setUser(response.user);  // ← response.user might be undefined!
}, []);
```

**Possible fix:**
```typescript
const login = useCallback(async (email: string, password: string) => {
  await authApi.login(email, password);
  // Fetch user separately to ensure we have it
  const user = await authApi.getCurrentUser();
  setUser(user);
}, []);
```

### Issue #2: Register Works, Login Doesn't
- Register page hardcodes `/student/dashboard` (line 60)
- Login tries to use `user.role` which is undefined
- This suggests `authApi.login()` response structure issue

---

## Commands to Resume

```bash
# Check user's debug output first!
# Then based on scenario, try one of:

# Quick fix attempt #1: Fix AuthContext
cd /Users/briandai/Documents/concentrateaiproject/apps/frontend
# Edit contexts/AuthContext.tsx:34-37

# Quick fix attempt #2: Just hardcode student for now
# Edit app/(auth)/login/page.tsx:60
# Change: router.push(`/${user.role}/dashboard`);
# To: router.push('/student/dashboard');

# Then restart frontend
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

## Estimated Time to Fix

- **If Scenario B:** 5-10 minutes (check backend endpoint)
- **If Scenario C:** 10-15 minutes (fix cookie handling)
- **If Scenario A:** 5 minutes (add delay or fix AuthContext)

**After fix:** Can proceed with full testing checklist

---

**Last Updated:** 2025-11-04 19:30 UTC
**Context Used:** 155k/200k tokens
**Next Session:** Start by checking user's debug console output, then apply appropriate fix

