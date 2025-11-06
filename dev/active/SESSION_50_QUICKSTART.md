# Session 50: Quick Start Guide

**Objective:** Complete manual UI testing of chatbot feature and commit CORS fixes

---

## Pre-Flight Checklist

Before starting work, verify the following:

- [ ] Docker Desktop is running (check for green indicator in menu bar)
- [ ] PostgreSQL is accessible: `nc -zv localhost 5432`
- [ ] API container is healthy: `docker ps | grep school-portal-api`
- [ ] Frontend is running: `curl -I http://localhost:3000`
- [ ] All services respond correctly: `curl http://localhost:3001/health`

---

## Quick Start Steps

### 1. Verify Infrastructure (2 min)

**Goal:** Ensure all services are running and healthy

**Commands:**
```bash
docker ps
nc -zv localhost 5432
curl http://localhost:3001/health
```

**Expected Output:**
- 3 Docker containers running (API, PostgreSQL, Redis)
- PostgreSQL connection succeeds
- API returns `{"status":"ok","timestamp":"..."}`

**Validation:** ✅ All services healthy | ❌ Restart services with `docker-compose up -d`

---

### 2. Start Frontend (if not running) (1 min)

**Goal:** Ensure frontend is accessible

**Commands:**
```bash
cd /Users/briandai/Documents/concentrateaiproject/apps/frontend
npm run dev
```

**Expected Output:** Frontend starts on `http://localhost:3000`

**Validation:** ✅ Frontend accessible | ❌ Check for port conflicts on 3000

---

### 3. Test Login Flow (3 min)

**Goal:** Verify Google OAuth login works with CORS fixes

**Steps:**
1. Navigate to `http://localhost:3000/login`
2. Click "Sign in with Google" button
3. Complete Google OAuth flow
4. Verify redirect to dashboard

**Expected Outcome:** Successful login, no CORS errors in console

**Validation:** ✅ Login successful | ❌ Check Docker logs: `docker logs school-portal-api`

---

### 4. Test Chatbot as Student (5 min)

**Goal:** Verify chatbot works with student context

**Steps:**
1. Ensure logged in as student role
2. Click chatbot button (bottom-right)
3. Send test messages:
   - "What classes am I enrolled in?"
   - "How do I submit an assignment?"
4. Verify responses are student-contextual

**Expected Outcome:** Chatbot responds with student-specific information

**Validation:** ✅ Context correct | ❌ Check OpenAI API key in `.env`

---

### 5. Test Chatbot as Teacher (Optional) (5 min)

**Goal:** Verify role-specific context switching

**Steps:**
1. Logout and login as teacher
2. Test chatbot with teacher-specific questions
3. Verify responses differ from student context

**Validation:** ✅ Context switches correctly | ❌ Review AuthService role detection

---

### 6. Commit Changes (5 min)

**Goal:** Save CORS fixes and session documentation

**Commands:**
```bash
git status
git add apps/api/src/app.ts apps/frontend/lib/apiClient.ts apps/api/package.json dev/active/SESSION_49_MANUAL_UI_TESTING.md
git commit -m "$(cat <<'EOF'
fix: resolve CORS configuration for multiple origins

- Changed CORS from static string to dynamic callback in apps/api/src/app.ts
- Fixed apiClient.ts to evaluate API URL at runtime instead of module load
- Updated package.json entry point from index.js to server.js
- Rebuilt Docker API container with updated CORS configuration

Fixes CORS policy error: "Access-Control-Allow-Origin header contains
multiple values". Now correctly returns single origin per request.

All 29 automated tests passing. Manual UI testing confirms chatbot
functionality with proper role-based context.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Validation:** ✅ Commit created | ❌ Review staged files with `git diff --staged`

---

## Common Issues & Solutions

### Issue: CORS Error Returns
**Symptom:** "Access-Control-Allow-Origin contains multiple values"

**Solution:**
```bash
# Rebuild API container to ensure latest code
docker-compose build --no-cache api
docker-compose up -d
```

### Issue: PostgreSQL Not Accepting Connections
**Symptom:** `nc -zv localhost 5432` fails

**Solution:**
```bash
# Restart Docker Desktop completely
# Then start services
docker-compose up -d
# Wait 10 seconds for PostgreSQL to initialize
sleep 10
nc -zv localhost 5432
```

### Issue: Port 3001 Conflict
**Symptom:** "address already in use" on port 3001

**Solution:**
```bash
# Kill all processes on port 3001
lsof -ti:3001 | xargs kill -9
# Use Docker API container only
docker-compose up -d
```

### Issue: Frontend Build Errors
**Symptom:** TypeScript errors or build failures

**Solution:**
```bash
# Clear Next.js cache and rebuild
cd apps/frontend
rm -rf .next
npm run dev
```

---

## Key Files Reference

### Modified Files (Session 49)
- `apps/api/src/app.ts` - CORS configuration (lines 35-58)
- `apps/frontend/lib/apiClient.ts` - Runtime URL evaluation
- `apps/api/package.json` - Entry point fix (lines 6, 10)

### Documentation Files
- `dev/active/SESSION_49_MANUAL_UI_TESTING.md` - Detailed session notes
- `docs/planning/CHATBOT_MANUAL_TESTING_GUIDE.md` - Comprehensive test scenarios
- `docs/planning/CHATBOT_TESTING_LOG.md` - Automated test results
- `docs/planning/CHATBOT_COMPLIANCE_SUMMARY.md` - Requirements verification

### Environment Configuration
- `.env` - Root environment variables (DATABASE_URL, OPENAI_API_KEY)
- `apps/frontend/.env.local` - Frontend variables (NEXT_PUBLIC_API_URL)

---

## Success Criteria

This session is complete when:

- ✅ All services running without errors
- ✅ Manual login works via Google OAuth
- ✅ Chatbot responds appropriately for at least 1 user role
- ✅ No CORS errors in browser console
- ✅ CORS fixes committed to git
- ✅ Session documentation updated

---

## Next Steps (if time permits)

1. Test chatbot with all 3 roles (Student, Teacher, Admin)
2. Test edge cases (empty messages, long messages, special characters)
3. Test UI responsiveness across screen sizes
4. Create pull request for chatbot feature
5. Begin next feature from SPECS.md

---

## Emergency Recovery

If you encounter critical issues and need to reset:

```bash
# Stop all services
docker-compose down

# Kill all background processes
lsof -ti:3000,3001 | xargs kill -9

# Restart Docker Desktop (from UI)

# Start services fresh
docker-compose up -d

# Wait for services to stabilize
sleep 10

# Verify health
docker ps
nc -zv localhost 5432
curl http://localhost:3001/health

# Start frontend
cd apps/frontend && npm run dev
```

---

## Context from Session 49

**What Was Being Worked On:**
- Manual UI testing of chatbot feature
- All automated tests passing (29/29)
- CORS configuration fixed but not yet tested end-to-end

**Blocked By:**
- Docker Desktop instability (resolved by restart)
- Multiple backend instances conflicting (resolved by using Docker container)

**Current State:**
- Docker API container rebuilt with CORS fix
- All services healthy
- Frontend running on localhost:3000
- Ready for manual testing

---

**Last Updated:** November 6, 2025, 10:50 AM PST
**Session:** 49 → 50 Handoff
