# Session 14 - Phase 2 Testing Checklist

**Date:** 2025-11-04
**Status:** Implementation complete ✅ | Testing required 🧪
**Context:** All 6 critical auth bugs fixed, manual testing needed before proceeding

---

## Quick Start

**Prerequisites:**
- Backend running on port 3001
- Frontend running on port 3000
- Browser DevTools open (Network + Console tabs)

**If servers not running:**
```bash
# Terminal 1 - Backend
cd /Users/briandai/Documents/concentrateaiproject
node apps/api/dist/server.js

# Terminal 2 - Frontend
cd /Users/briandai/Documents/concentrateaiproject/apps/frontend
npm run dev
```

---

## Test 1: Password Validation ✅/❌

**Bug Fixed:** Frontend validation now matches backend (uppercase + lowercase required)

**Steps:**
1. Open: http://localhost:3000/register
2. Fill form:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password` (all lowercase)
   - Confirm: `password`
3. Click "CREATE ACCOUNT"

**Expected:**
- ✅ Error appears BEFORE hitting backend
- ✅ Message: "Password must contain at least one uppercase letter"
- ✅ Error displays cleanly under password field
- ❌ NO raw JSON like `[{"validation":"regex",...}]`

**Try again with:** `Password1`
- ✅ Should pass frontend validation

**File:** `apps/frontend/lib/validations/auth.ts` (lines 19-22)

---

## Test 2: Logout Functionality ✅/❌

**Bug Fixed:** API client no longer sends Content-Type header for DELETE with no body

**Steps:**
1. Login to any account (use register from Test 1)
2. Open DevTools → Network tab
3. Click "LOG OUT" button (top-right of dashboard)
4. Find `/api/v0/auth/logout` request in Network tab
5. Check request headers

**Expected:**
- ✅ Logout succeeds (200 OK status)
- ✅ Redirects to `/login`
- ✅ Request headers do NOT include `Content-Type: application/json`
- ❌ NO error: "Body cannot be empty when content-type is set to 'application/json'"

**File:** `apps/frontend/lib/apiClient.ts` (line 23)

---

## Test 3: OAuth Callback Redirect ✅/❌

**Bug Fixed:** OAuth callback now redirects to role-based dashboard instead of `/`

**Steps:**
1. Logout if logged in
2. Go to: http://localhost:3000/login
3. Click "SIGN IN WITH GOOGLE" button
4. Complete Google OAuth flow
5. Watch URL after Google redirects back

**Expected:**
- ✅ Shows `/oauth/callback?success=true` briefly
- ✅ Displays: "Login successful! Redirecting..."
- ✅ Redirects to: `/student/dashboard` (or your role's dashboard)
- ❌ Does NOT redirect to `/` (404)

**File:** `apps/frontend/app/(auth)/oauth/callback/page.tsx` (line 42)

---

## Test 4: Root Page Redirect ✅/❌

**Bug Fixed:** Root `/` now redirects based on auth state instead of showing 404

**Part A - Logged Out:**
1. Ensure logged out (click logout if needed)
2. Visit: http://localhost:3000/
3. Watch URL

**Expected:**
- ✅ Shows loading spinner briefly
- ✅ Redirects to: `/login`
- ❌ NO 404 error

**Part B - Logged In:**
1. Login as any user
2. Visit: http://localhost:3000/
3. Watch URL

**Expected:**
- ✅ Shows loading spinner briefly
- ✅ Redirects to: `/student/dashboard` (or your role)
- ❌ NO 404 error
- ❌ NO "School Portal / Get Started" static page

**File:** `apps/frontend/app/page.tsx` (completely rewritten)

---

## Test 5: Role-Based Protection ✅/❌

**Bug Fixed:** Dashboards now enforce role requirements via `useRequireAuth` hook

**Steps:**
1. Register/login as **student** (from Test 1)
2. Verify you're at: `/student/dashboard`
3. In URL bar, manually type: `http://localhost:3000/admin/dashboard`
4. Press Enter
5. Watch what happens

**Expected:**
- ✅ Automatically redirects to: `/student/dashboard`
- ❌ Does NOT show admin dashboard
- ❌ Does NOT allow access

**Also test:**
- Student accessing `/teacher/dashboard` → redirects to `/student/dashboard`

**Files:**
- `apps/frontend/app/admin/dashboard/page.tsx` (line 9)
- `apps/frontend/app/teacher/dashboard/page.tsx` (line 9)
- `apps/frontend/app/student/dashboard/page.tsx` (line 9)

---

## Test 6: Error Message Display ✅/❌

**Bug Fixed:** With frontend validation matching backend, errors display cleanly

**Steps:**
1. Go to: http://localhost:3000/register
2. Fill form:
   - Name: `Test`
   - Email: `test2@example.com`
   - Password: `test` (too short, no uppercase)
   - Confirm: `test`
3. Click "CREATE ACCOUNT"

**Expected:**
- ✅ Error message: "Password must be at least 8 characters"
- ✅ Displays as clean text under password field
- ❌ NOT raw JSON: `[{"validation":"regex","code":"invalid_string",...}]`

**Try different weak passwords:**
- `testtest` (no uppercase) → "Password must contain at least one uppercase letter"
- `TESTTEST` (no lowercase) → "Password must contain at least one lowercase letter"

**File:** `apps/frontend/lib/validations/auth.ts`

---

## Summary Checklist

Mark each test:

- [ ] Test 1: Password validation shows clean errors
- [ ] Test 2: Logout works without Content-Type error
- [ ] Test 3: OAuth redirects to dashboard (not 404)
- [ ] Test 4A: Root page redirects to login when logged out
- [ ] Test 4B: Root page redirects to dashboard when logged in
- [ ] Test 5: Students can't access admin dashboard
- [ ] Test 6: Error messages display as clean text

**If ALL pass:** ✅ Phase 2 complete! Ready for Phase 3 (Admin Dashboard)

**If ANY fail:**
1. Note which test failed
2. Check browser console for errors
3. Review the file listed in that test section
4. Verify servers are running on correct ports

---

## Next Steps After All Tests Pass

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: complete Phase 2 authentication UI with bug fixes

   - Implement login/register with password + Google OAuth
   - Add auth context with role-based protection
   - Create dashboard placeholders for all roles
   - Fix 6 critical bugs (validation, logout, OAuth redirect, role protection)
   "
   ```

2. **Begin Phase 3:** Admin Dashboard implementation
   - User management UI (create/edit/suspend users)
   - Teacher group management
   - System statistics dashboard

---

**Last Updated:** 2025-11-04 18:30 UTC
**Servers Required:** Frontend (3000) + Backend (3001)
**Estimated Testing Time:** 10-15 minutes
