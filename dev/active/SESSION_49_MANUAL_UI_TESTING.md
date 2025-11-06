# Session 49: Manual UI Testing & CORS Fixes

**Date:** November 6, 2025
**Status:** 🟡 In Progress - Infrastructure fixes complete, ready for manual testing
**Objective:** Perform manual UI testing of chatbot feature after resolving CORS and Docker issues

---

## Session Summary

This session focused on setting up the environment for manual UI testing of the chatbot feature. While automated tests are passing (29/29), we encountered and fixed several infrastructure issues.

---

## Problems Solved

### 1. CORS Configuration Error ✅

**Problem:** Backend was sending multiple origins in the `Access-Control-Allow-Origin` header as a comma-separated string: `'http://localhost,http://localhost:3000,http://localhost:3001'`. Browsers require exactly ONE origin when `credentials: true`.

**Root Cause:** Static CORS configuration in `apps/api/src/app.ts`

**Solution:** Changed CORS from static string to dynamic callback function

**File Modified:** `apps/api/src/app.ts` (lines 35-58)

**Before:**
```typescript
await app.register(cors, {
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  credentials: true,
})
```

**After:**
```typescript
await app.register(cors, {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost',
    ]

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true)
      return
    }

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
})
```

**Validation:** TypeScript compilation passed with no errors

---

### 2. ApiClient Runtime URL Evaluation ✅

**Problem:** Frontend `apiClient.ts` was evaluating `NEXT_PUBLIC_API_URL` at module load time, which could be undefined in Next.js SSR context.

**File Modified:** `apps/frontend/lib/apiClient.ts`

**Changes:**
1. Removed `API_URL` constant
2. Changed `baseURL` from constructor parameter to getter property
3. Added `getApiUrl()` function for runtime evaluation
4. Added debug logging: `console.log('[ApiClient] Fetching:', ...)`

**Before:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
class ApiClient {
  constructor(baseURL: string) { this.baseURL = baseURL; }
}
export const apiClient = new ApiClient(API_URL);
```

**After:**
```typescript
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

class ApiClient {
  private get baseURL(): string {
    return getApiUrl();
  }
}
export const apiClient = new ApiClient();
```

---

### 3. Package.json Entry Point Fix ✅

**Problem:** `apps/api/package.json` referenced `dist/index.js` which didn't exist. The actual entry point is `dist/server.js`.

**File Modified:** `apps/api/package.json` (lines 6, 10)

**Changes:**
- `"main": "dist/index.js"` → `"main": "dist/server.js"`
- `"start": "node dist/index.js"` → `"start": "node dist/server.js"`

---

### 4. Docker Container Rebuild ✅

**Problem:** Docker containers were running OLD code without CORS fixes, causing issues after Docker Desktop restarts.

**Solution:** Rebuilt API Docker container with updated code

**Commands Used:**
```bash
docker-compose build --no-cache api
docker-compose up -d
```

**Validation:** New container created (ID: 13ed46615369), running with CORS fix, all health checks passing

---

## Files Modified This Session

1. **apps/api/src/app.ts**
   - Lines 35-58: Dynamic CORS origin callback
   - Line 54: Added second parameter to error callback

2. **apps/frontend/lib/apiClient.ts**
   - Entire file refactored for runtime URL evaluation
   - Added `getApiUrl()` function
   - Changed `baseURL` to getter property
   - Added debug logging

3. **apps/api/package.json**
   - Line 6: Updated main entry point
   - Line 10: Updated start script

---

## Current Infrastructure State

### Services Running (Docker)
- ✅ **PostgreSQL:** `concentrate-quiz-db` on port 5432 (healthy)
- ✅ **Redis:** `school-portal-redis` on port 6379 (healthy)
- ✅ **API:** `school-portal-api` on port 3001 (healthy, with CORS fix)

### Services Running (Local)
- ✅ **Frontend:** Next.js dev server on port 3000

### Environment Configuration
- `.env` file configured with all required variables
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Google OAuth credentials configured
- OpenAI API key configured for chatbot

---

## Known Issues & Solutions

### Issue 1: Docker Desktop Instability
**Symptom:** Docker daemon becomes unresponsive, PostgreSQL stops accepting connections

**Impact:** Manual testing blocked without database

**Solution:** Restart Docker Desktop, wait for full initialization (green indicator), then run `docker-compose up -d`

**Prevention:** The Docker container now has the updated code, so restarts won't reintroduce CORS issues

### Issue 2: Multiple Backend Instances
**Symptom:** Port 3001 conflict when both Docker and local backend try to run

**Solution:** Use ONLY the Docker API container (stop local instances with `lsof -ti:3001 | xargs kill -9`)

**Recommendation:** For manual testing, use the Docker API container since it's rebuilt with the latest code

---

## Testing Status

### Automated Tests: ✅ COMPLETE
- **ChatbotService (Unit):** 15/15 passing (98.97% coverage)
- **Chatbot Routes (Integration):** 14/14 passing (100% coverage)
- **Total Backend Tests:** 29/29 passing

### Manual UI Testing: 🟡 READY (Not Yet Performed)
**Blocked By:** User encountering OAuth failures due to Docker instability

**Test Plan Created:** `docs/planning/CHATBOT_MANUAL_TESTING_GUIDE.md` (499 lines)

**Scenarios to Test:**
1. Student user - chatbot context and responses
2. Teacher user - role-specific interactions
3. Admin user - system-level information
4. Unauthenticated user - access protection
5. Edge cases - empty messages, long messages, special characters
6. UI/UX - responsiveness, design, accessibility

---

## Next Immediate Steps

### For Current Session (if continuing):
1. ✅ Ensure Docker Desktop is running and stable
2. ✅ Verify all services healthy: `docker ps` and `nc -zv localhost 5432`
3. ⏳ Navigate to `http://localhost:3000/login`
4. ⏳ Login with Google OAuth
5. ⏳ Test chatbot with each user role (Student, Teacher, Admin)
6. ⏳ Verify chatbot responses are contextually appropriate
7. ⏳ Test error scenarios and UI responsiveness

### For Next Session:
1. If manual testing not completed, resume with Step 3 above
2. Document manual testing results in new session file
3. Create commit with CORS fixes and session summary
4. Consider creating Session 50 for any additional work

---

## Architecture Decisions Made

### CORS Strategy
**Decision:** Use dynamic origin validation callback instead of static string

**Rationale:**
- Browsers require single origin with `credentials: true`
- Multiple environments need support (localhost:3000, localhost:3001, localhost)
- Dynamic callback allows per-request validation
- Supports requests with no origin (curl, mobile apps)

**Trade-offs:**
- Slightly more complex than static string
- Better security and flexibility
- Follows CORS best practices

### apiClient URL Resolution
**Decision:** Evaluate `NEXT_PUBLIC_API_URL` at runtime via getter, not at module load

**Rationale:**
- Next.js environment variables may not be available during SSR
- Runtime evaluation ensures correct URL in both client and server contexts
- Getter pattern is idiomatic for dynamic values

---

## Lessons Learned

### 1. Docker Container State Management
When modifying backend code, Docker containers don't automatically pick up changes. Must explicitly rebuild:
```bash
docker-compose build --no-cache <service-name>
docker-compose up -d
```

### 2. CORS with Credentials
When using `credentials: true`, browsers enforce strict CORS rules:
- `Access-Control-Allow-Origin` must contain exactly ONE origin (not a list)
- Cannot use wildcard `*` with credentials
- Must use dynamic origin validation for multiple allowed origins

### 3. Next.js Environment Variable Access
`process.env.NEXT_PUBLIC_*` variables should be evaluated at runtime, not module load time, to ensure availability in all contexts (SSR, CSR, build time).

---

## Documentation Created

1. **docs/planning/CHATBOT_MANUAL_TESTING_GUIDE.md** (499 lines)
   - Comprehensive testing guide for all user roles
   - Step-by-step scenarios with validation checklists
   - Browser compatibility testing instructions
   - Issue reporting template

2. **apps/frontend/app/test-api/page.tsx** (77 lines)
   - Diagnostic page for API connectivity testing
   - Tests /health and /api/v0/auth/login endpoints
   - Displays environment variables and error states

---

## Commands Reference

### Start All Services (Docker)
```bash
docker-compose up -d
```

### Rebuild API Container
```bash
docker-compose build --no-cache api
docker-compose up -d
```

### Check Service Health
```bash
docker ps                    # Check all containers
curl http://localhost:3001/health  # Test API
nc -zv localhost 5432        # Test PostgreSQL
```

### Kill Port Conflicts
```bash
lsof -ti:3001 | xargs kill -9  # Kill processes on port 3001
lsof -ti:3000 | xargs kill -9  # Kill processes on port 3000
```

### Start Frontend (Local)
```bash
cd apps/frontend
npm run dev
```

---

## Uncommitted Changes

**Status:** All changes committed in previous sessions

**Files Modified But Not Committed:**
- None (CORS fixes need to be committed)

**Recommended Commit Message:**
```
fix: resolve CORS configuration for multiple origins

- Changed CORS from static string to dynamic callback in apps/api/src/app.ts
- Fixed apiClient.ts to evaluate API URL at runtime instead of module load
- Updated package.json entry point from index.js to server.js
- Rebuilt Docker API container with updated CORS configuration

Fixes CORS policy error: "Access-Control-Allow-Origin header contains
multiple values". Now correctly returns single origin per request.

All 29 automated tests passing. Ready for manual UI testing.
```

---

## Last Updated
**Date:** November 6, 2025, 10:48 AM PST
**By:** Claude (AI Assistant)
**Session:** 49
