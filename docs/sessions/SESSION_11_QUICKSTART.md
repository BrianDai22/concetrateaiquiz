# Session 11 Quick Start

## 📖 Context (30 seconds)

**Where We Are:**
- ✅ Service Layer: 100% complete (287 tests passing)
- ✅ Auth Routes: 100% complete (11 tests passing)
- ⚠️ Other Routes: Created but have TypeScript errors

**What's Working:**
```bash
cd apps/api
JWT_SECRET=test-secret npx vitest run --config vitest.config.ts --no-coverage
# Result: ✓ 11/11 auth tests passing
```

**What's Not:**
```bash
npx tsc --noEmit
# Result: 27 TypeScript errors in admin/teacher/student/stats routes
```

---

## 🎯 First Command

```bash
# See the errors
cd apps/api && npx tsc --noEmit
```

---

## 🔧 First Task

**Fix admin route errors (6 errors):**

Open these files side-by-side:
1. `packages/services/src/UserService.ts` (check method signatures)
2. `packages/validation/src/user.ts` (check schema fields)
3. `apps/api/src/routes/admin.ts` (fix route code)

**Pattern:**
```typescript
// ERROR: Argument count mismatch

// 1. Find actual signature in UserService.ts
async suspendUser(userId: string, reason?: string): Promise<User>

// 2. Update route code
const user = await userService.suspendUser(id, validated.reason)
// Remove the third parameter (request.user!.userId)
```

**Fix Order:**
1. Line 30: `searchUsers()` parameter structure
2. Line 63: `updateUser()` → 2 args, not 3
3. Line 79: `deleteUser()` → 1 arg, not 2
4. Line 98: Remove `validated.reason` (field doesn't exist)
5. Line 99: `suspendUser()` → 1-2 args, not 3
6. Line 116: `unsuspendUser()` → 1 arg, not 2

After each fix: `npx tsc --noEmit` to verify.

---

## ✅ Success Criteria

1. **TypeScript compiles:** `npx tsc --noEmit` → zero errors
2. **Tests pass:** Write ~40 more tests for other routes
3. **Coverage:** 100% on all route files

---

## 📄 Files to Read

1. `SESSION_10_SUMMARY.md` - Full context
2. `apps/api/src/routes/auth.ts` - Working example pattern
3. `apps/api/tests/routes/auth.test.ts` - Test pattern example

---

## ⏱️ Time Estimate

- Fix TypeScript errors: 1 hour
- Write integration tests: 2-3 hours
- Achieve 100% coverage: 1 hour
- **Total:** 4-5 hours

---

**After Session 11:**
API layer COMPLETE → Frontend development can start in Session 12
