# Session 46: Quick Start - Chatbot Testing & Documentation

**Previous Session:** Session 45 - Chatbot Implementation (Complete)
**Current State:** Implementation complete, ready for testing and documentation
**Priority:** High - Need tests (90%+ coverage) and compliance documentation

---

## Quick Context

The chatbot is **fully implemented** and meets all SPECS.md requirements:
- ✅ Backend: ChatbotService + API route (`/api/v0/chatbot/chat`)
- ✅ Frontend: Chatbot component with MotherDuck design
- ✅ TypeScript builds successfully (no errors)
- ✅ OAuth isolation maintained (no Session 43 breakage)

**What's Missing:**
- ⚠️ No automated tests (need 90%+ coverage)
- ⚠️ No Testing & Verification Log document
- ⚠️ No Compliance Summary document
- ⚠️ Not deployed to production yet

---

## Pre-Work Checklist (Complete BEFORE starting)

- [ ] Read `dev/active/SESSION_45_CHATBOT_IMPLEMENTATION.md` (full context)
- [ ] Check git status - ensure on `main` branch, up to date
- [ ] Verify environment variables set (`.env` has `OPENAI_API_KEY`)
- [ ] Confirm Docker services running (`docker-compose ps`)
- [ ] Review SPECS.md lines 36-41 (Extra Credit chatbot requirements)
- [ ] Decide on task priority: Testing → Documentation → Deployment

---

## Task Option A: Write Comprehensive Tests (Recommended First)

### Checklist:
1. [ ] Create backend service unit tests with mocked OpenAI API
2. [ ] Create backend route integration tests
3. [ ] Create frontend component tests
4. [ ] Run coverage report, verify ≥90%
5. [ ] Fix any failing tests
6. [ ] Commit: "test: add comprehensive chatbot tests with 90%+ coverage"

### Steps:

**Step 1: Create ChatbotService Unit Tests**
```bash
# Create test file
touch packages/services/src/ChatbotService.test.ts
```

Test structure:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatbotService } from './ChatbotService'
import OpenAI from 'openai'

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Test response' } }]
        })
      }
    }
  }))
}))

describe('ChatbotService', () => {
  // Test chat() method
  // Test system prompt construction
  // Test role-specific context (student, teacher, admin)
  // Test error handling
})
```

**Validation:** Run `npm run test` - All ChatbotService tests pass ✅

---

**Step 2: Create Route Integration Tests**
```bash
# Create test file
touch apps/api/tests/routes/chatbot.test.ts
```

Test structure:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../src/app'
import { clearAllTables } from '../helpers/testHelpers'

describe('POST /api/v0/chatbot/chat', () => {
  // Test 401 for unauthenticated requests
  // Test 200 with valid auth
  // Test 400 for invalid input
  // Test response format
})
```

**Validation:** Run `npm run test` - All route tests pass ✅

---

**Step 3: Create Frontend Component Tests**
```bash
# Create test file
touch apps/frontend/components/Chatbot.test.tsx
```

Test structure:
```typescript
import { render, screen, userEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Chatbot } from './Chatbot'

describe('Chatbot Component', () => {
  // Test renders floating button
  // Test opens dialog
  // Test sends message
  // Test displays loading state
  // Test error handling
})
```

**Validation:** Run `npm run test` - All component tests pass ✅

---

**Step 4: Check Coverage**
```bash
npm run coverage
```

**Validation:** Coverage report shows ≥90% for:
- `ChatbotService.ts`
- `routes/chatbot.ts`
- `components/Chatbot.tsx`

If below 90%, add more test cases for edge cases.

---

**Step 5: Commit Tests**
```bash
git add -A
git commit -m "test: add comprehensive chatbot tests with mocked OpenAI API

- Add ChatbotService unit tests (mock OpenAI)
- Add chatbot route integration tests
- Add Chatbot component tests (mock fetch)
- Verify 90%+ test coverage
- Test all three user roles (student, teacher, admin)
- Test error scenarios (401, 400, 500)

Coverage: XX% (packages/services/src/ChatbotService.ts)
Coverage: XX% (apps/api/src/routes/chatbot.ts)
Coverage: XX% (apps/frontend/components/Chatbot.tsx)"
git push
```

**Validation:** Git push successful, tests passing in CI ✅

---

## Task Option B: Create Documentation

### Checklist:
1. [ ] Create Testing and Verification Log (manual testing results)
2. [ ] Create Compliance Summary (SPECS.md mapping)
3. [ ] Commit: "docs: add chatbot testing log and compliance summary"

### Steps:

**Step 1: Testing and Verification Log**
```bash
touch docs/planning/CHATBOT_TESTING_LOG.md
```

Format (from original prompt):
```markdown
# Chatbot Testing and Verification Log

## Step 1: Backend ChatbotService Implementation
**SPECS.md Requirement:** Lines 36-41 - "API calls to LLM provider"
**Test Input:** User ID + "How do I submit an assignment?"
**Expected Output:** AI-generated response with student context
**Actual Result:** [Manual test result]
**Status:** ✅ Pass / ❌ Fail

## Step 2: API Route Protection
**SPECS.md Requirement:** Authentication required
**Test Input:** POST /api/v0/chatbot/chat without auth cookies
**Expected Output:** 401 Unauthorized
**Actual Result:** [Manual test result]
**Status:** ✅ Pass / ❌ Fail

[Continue for all features...]
```

**Validation:** Document created with all steps documented ✅

---

**Step 2: Compliance Summary**
```bash
touch docs/planning/CHATBOT_COMPLIANCE_SUMMARY.md
```

Format:
```markdown
# Chatbot Compliance Summary

## Checklist

| SPECS.md Requirement | Section | Implementation | Verification | Status |
|---------------------|---------|----------------|--------------|--------|
| API calls to LLM provider | Lines 36-41 | ChatbotService.chat() with OpenAI | Manual test + unit tests | ✅ Pass |
| App-level context | Lines 36-41 | Dynamic user context (role, classes) | Integration tests | ✅ Pass |
| Answer basic questions | Lines 36-41 | Role-specific system prompts | Manual testing | ✅ Pass |

## Notes

- **No deviations** from SPECS.md requirements
- **Simplified approach:** Stateless design (no conversation history)
- **OAuth isolation:** Separate route, no auth code modifications
- **Design system:** MotherDuck-inspired UI (monospace, light blue)
```

**Validation:** Compliance table complete with all requirements mapped ✅

---

**Step 3: Commit Documentation**
```bash
git add docs/planning/CHATBOT_TESTING_LOG.md docs/planning/CHATBOT_COMPLIANCE_SUMMARY.md
git commit -m "docs: add chatbot testing log and compliance summary

- Testing and Verification Log with manual test results
- Compliance Summary mapping SPECS.md requirements
- All requirements verified as passing
- No deviations or issues found"
git push
```

**Validation:** Documentation committed successfully ✅

---

## Task Option C: Deploy to Production

### Checklist:
1. [ ] Verify tests passing and coverage ≥90%
2. [ ] Manual test locally in all roles (student, teacher, admin)
3. [ ] Build backend and frontend
4. [ ] Deploy to production (Docker Compose)
5. [ ] Verify OAuth works in production
6. [ ] Test chatbot in production
7. [ ] Monitor logs for errors

### Steps:

**Step 1: Verify Tests**
```bash
npm run test
npm run coverage
```
**Validation:** All tests pass, coverage ≥90% ✅

---

**Step 2: Manual Local Testing**
```bash
# Start services
docker-compose up -d
cd apps/api && npm run dev  # Terminal 1
cd apps/frontend && npm run dev  # Terminal 2

# Open http://localhost:3000
# Login as student, teacher, admin
# Test chat in each role
```

**Validation:** Chat works in all roles, OAuth login works ✅

---

**Step 3: Build for Production**
```bash
npm run build:packages
cd apps/api && npm run build
cd apps/frontend && npm run build
```

**Validation:** Builds succeed (ignore pre-existing ESLint warnings in other files) ✅

---

**Step 4: Deploy to Production**
```bash
# Push to GitHub (triggers CI/CD)
git push

# SSH to production server
ssh user@coolstudentportal.online

# Pull latest code
cd /path/to/project
git pull

# Restart services
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

**Validation:** Services start successfully, no errors in logs ✅

---

**Step 5: Verify in Production**
```bash
# Open https://coolstudentportal.online
# Login with Google OAuth
# Click floating "Chat" button
# Send test message: "How do I submit an assignment?"
# Verify response includes student context
```

**Validation:** Chatbot works in production, OAuth stable ✅

---

**Step 6: Monitor Logs**
```bash
# Check Sentry for errors (if configured)
# Check Docker logs for OpenAI API errors
docker-compose logs api | grep -i error
docker-compose logs frontend | grep -i error
```

**Validation:** No critical errors, chatbot functioning ✅

---

## Common Issues & Solutions

### Issue: OpenAI API Key Not Found
**Symptom:** `OPENAI_API_KEY environment variable is required`
**Solution:**
```bash
# Check .env file
cat .env | grep OPENAI_API_KEY

# If missing, add:
echo "OPENAI_API_KEY=sk-proj-..." >> .env

# Restart services
```

---

### Issue: 401 Unauthorized Error
**Symptom:** Chatbot returns "Please log in to use the chatbot"
**Solution:**
- Verify you're logged in (check cookies in DevTools)
- Verify `requireAuth` middleware is working
- Check backend logs for auth errors

---

### Issue: Build Fails with ESLint Errors
**Symptom:** Frontend build shows ESLint errors
**Solution:**
- **These are pre-existing errors, NOT from chatbot**
- Chatbot TypeScript compiles successfully
- Can ignore for now, or fix separately
- ESLint errors are in: login/page.tsx, register/page.tsx, etc.

---

### Issue: Test Coverage Below 90%
**Symptom:** Coverage report shows <90% for chatbot files
**Solution:**
- Add tests for error cases (missing user, API failures)
- Add tests for all three roles (student, teacher, admin)
- Test edge cases (empty input, long input, special characters)

---

## Files to Reference

**Implementation:**
- `packages/services/src/ChatbotService.ts` - Service logic
- `apps/api/src/routes/chatbot.ts` - API route
- `apps/frontend/components/Chatbot.tsx` - Frontend component

**Documentation:**
- `docs/planning/CHATBOT_PRD.md` - Full requirements
- `dev/active/SESSION_45_CHATBOT_IMPLEMENTATION.md` - Complete context
- `docs/planning/SPECS.md` - Lines 36-41 (chatbot requirements)

**Tests (to create):**
- `packages/services/src/ChatbotService.test.ts`
- `apps/api/tests/routes/chatbot.test.ts`
- `apps/frontend/components/Chatbot.test.tsx`

**Documentation (to create):**
- `docs/planning/CHATBOT_TESTING_LOG.md`
- `docs/planning/CHATBOT_COMPLIANCE_SUMMARY.md`

---

## Success Criteria

### Testing Complete:
- ✅ All tests passing
- ✅ Coverage ≥90% for chatbot files
- ✅ Edge cases tested (auth, validation, errors)
- ✅ All three roles tested (student, teacher, admin)

### Documentation Complete:
- ✅ Testing Log with all steps documented
- ✅ Compliance Summary with SPECS.md mapping
- ✅ All requirements verified as passing
- ✅ No deviations or issues found

### Deployment Complete:
- ✅ Deployed to production (https://coolstudentportal.online)
- ✅ OAuth authentication working
- ✅ Chatbot responding correctly
- ✅ No errors in production logs
- ✅ All three roles tested in production

---

## Recommended Order

**Best Practice: Do in this order**

1. **Testing** (2-3 hours)
   - Ensures code quality before deployment
   - Catches bugs early
   - Provides confidence for production deployment

2. **Documentation** (30-45 minutes)
   - Testing Log from test results
   - Compliance Summary from verified requirements
   - Demonstrates thoroughness to hiring team

3. **Deployment** (30-60 minutes)
   - Deploy with confidence (tests passing)
   - Verify in production
   - Monitor for issues

---

## Quick Commands Reference

```bash
# Development
docker-compose up -d              # Start services
cd apps/api && npm run dev        # Backend dev server
cd apps/frontend && npm run dev   # Frontend dev server

# Testing
npm run test                      # Run all tests
npm run coverage                  # Coverage report
npm run test:watch                # Watch mode

# Building
npm run build:packages            # Build packages
cd apps/api && npm run build      # Build backend
cd apps/frontend && npm run build # Build frontend

# Git
git status                        # Check status
git add -A                        # Stage all
git commit -m "message"           # Commit
git push                          # Push to remote

# Production
ssh user@coolstudentportal.online # SSH to server
docker-compose logs -f            # Follow logs
docker-compose restart api        # Restart service
```

---

**End of Quickstart**

Choose your task (A, B, or C), complete the checklist, validate each step, and proceed!
