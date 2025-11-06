# Session 51: Quick Start Guide

**Previous Session:** 50 - Manual UI Testing & CORS Fixes (COMPLETE)
**Date:** November 6, 2025
**Starting Point:** Clean working directory, all systems operational

---

## Pre-Flight Checklist

Before starting any work, verify these 5 items:

- [ ] **Docker Desktop running** - Check menu bar for green indicator
- [ ] **Services healthy** - Run: `docker ps` (3 containers: API, PostgreSQL, Redis)
- [ ] **API responding** - Run: `curl http://localhost:3001/health`
- [ ] **Git status clean** - Run: `git status` (only .env files uncommitted)
- [ ] **Tests passing** - Run: `npm run test` (should see 29/29 pass)

**Expected Result:** All checks pass, system ready for development

---

## What Was Just Completed

Session 50 successfully:
1. ✅ Fixed CORS configuration (dynamic callback)
2. ✅ Fixed chatbot API URL routing
3. ✅ Fixed apiClient runtime evaluation
4. ✅ Updated OpenAI API key configuration
5. ✅ Completed manual UI testing (chatbot working)
6. ✅ Pushed commit `df2162c` to GitHub

**Current State:** Chatbot feature fully functional with role-based context

---

## Quick Start Steps

### Step 1: Verify System Health (2 min)

**Goal:** Ensure all services are running

**Commands:**
```bash
docker ps
curl http://localhost:3001/health
git status
```

**Validation:**
- ✅ 3 Docker containers running (healthy)
- ✅ API returns `{"status":"ok"}`
- ✅ Git working directory clean (except .env files)

**If Failed:** Restart Docker Desktop and run `docker-compose up -d`

---

### Step 2: Start Frontend (1 min)

**Goal:** Get frontend dev server running

**Commands:**
```bash
cd apps/frontend
npm run dev
```

**Validation:**
- ✅ Frontend starts on `http://localhost:3000`
- ✅ No build errors in console

**If Failed:** Clear Next.js cache: `rm -rf .next && npm run dev`

---

### Step 3: Verify Chatbot Works (2 min)

**Goal:** Confirm chatbot functionality before starting new work

**Steps:**
1. Navigate to `http://localhost:3000/login`
2. Sign in with Google OAuth
3. Click "Chat" button (bottom-right)
4. Send test message: "What classes am I enrolled in?"

**Validation:**
- ✅ Login successful
- ✅ Chatbot responds within 5 seconds
- ✅ No CORS errors in console (F12)
- ✅ Response is contextually appropriate

**If Failed:** Check OpenAI API key in `.env.docker.dev` and rebuild API container

---

### Step 4: Review Next Work (3 min)

**Goal:** Understand what to work on next

**Check these files:**
1. `docs/planning/SPECS.md` - Full requirements
2. `dev/active/` - Active task documentation
3. `CLAUDE.md` - Project overview and status

**Decide on:** What feature/task to work on next based on SPECS.md

---

## Common Issues & Solutions

### Issue: Port 3000 Already in Use
**Solution:**
```bash
lsof -ti:3000 | xargs kill -9
cd apps/frontend && npm run dev
```

### Issue: Port 3001 Already in Use
**Solution:**
```bash
lsof -ti:3001 | xargs kill -9
docker-compose up -d
```

### Issue: Docker Not Responding
**Solution:**
1. Restart Docker Desktop from UI
2. Wait for green indicator in menu bar
3. Run `docker-compose up -d`
4. Wait 10 seconds for PostgreSQL to initialize

### Issue: Tests Failing
**Solution:**
```bash
# Check if database is accessible
nc -zv localhost 5432

# If not, restart Docker services
docker-compose up -d
sleep 10

# Rerun tests
npm run test
```

---

## Key Files Reference

### Configuration Files
- `.env` - Local development environment variables (not committed)
- `.env.docker.dev` - Docker environment variables (not committed)
- `apps/frontend/.env.local` - Frontend config (`NEXT_PUBLIC_API_URL`)
- `docker-compose.yml` - Docker service definitions

### Recent Changes (Session 50)
- `apps/api/src/app.ts` - CORS dynamic callback (lines 35-58)
- `apps/frontend/components/Chatbot.tsx` - API URL fix (lines 35-36)
- `apps/frontend/lib/apiClient.ts` - Runtime URL evaluation
- `apps/api/package.json` - Entry point fix

### Documentation
- `docs/planning/SPECS.md` - Full project requirements
- `CLAUDE.md` - Project overview and Claude Code instructions
- `TESTING.md` - Testing guidelines
- `dev/active/SESSION_50_COMPLETE.md` - Previous session details

---

## Available npm Scripts

### Testing
```bash
npm run test              # Run all tests
npm run coverage          # Generate coverage report
npm run test:e2e          # Run Playwright E2E tests
```

### Development
```bash
npm run dev               # Start all services in dev mode
npm run build             # Build all packages
npm run lint              # Run ESLint
npm run format            # Run Prettier
```

### Docker
```bash
docker-compose up -d      # Start all services
docker-compose down       # Stop all services
docker-compose build api  # Rebuild API container
docker ps                 # List running containers
```

---

## Current Architecture

### Tech Stack
- **Frontend:** Next.js 15, React 19, TailwindCSS, Radix UI
- **Backend:** Fastify, TypeScript, Zod validation
- **Database:** PostgreSQL 17 with Kysely ORM
- **Cache:** Redis 7
- **Auth:** JWT cookies + Google OAuth
- **AI:** OpenAI GPT-4o-mini for chatbot

### Service Ports
- `3000` - Frontend (Next.js dev server - local)
- `3001` - API (Fastify - Docker)
- `5432` - PostgreSQL (Docker)
- `6379` - Redis (Docker)

### Authentication Flow
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. Google redirects back to `/api/v0/auth/oauth/google/callback`
4. Backend creates JWT tokens (access + refresh)
5. Tokens stored in HTTP-only cookies
6. Frontend redirects to `/oauth/callback?success=true`

---

## Success Criteria

This session is ready to start when:

- ✅ All 5 pre-flight checks pass
- ✅ Frontend accessible at `http://localhost:3000`
- ✅ API responding at `http://localhost:3001/health`
- ✅ Chatbot tested and working
- ✅ Next task identified from SPECS.md

---

## Next Feature Suggestions (From SPECS.md)

Based on project requirements, consider working on:

1. **Frontend UI Development**
   - Dashboard components for each role
   - Class management interface
   - Assignment submission interface

2. **Additional OAuth Providers**
   - Microsoft OAuth integration
   - GitHub OAuth integration

3. **School Statistics API**
   - Public endpoints for school-wide metrics
   - Average grades calculation
   - Teacher/student listings

4. **Deployment Preparation**
   - Complete Docker Compose setup with Nginx
   - CI/CD pipeline configuration
   - Production environment configuration

Choose based on project priorities and current development phase.

---

## Emergency Recovery

If you encounter critical issues:

```bash
# Stop everything
docker-compose down
lsof -ti:3000,3001 | xargs kill -9

# Restart Docker Desktop (from UI)

# Start fresh
docker-compose up -d
sleep 10
cd apps/frontend && npm run dev
```

---

**Last Updated:** November 6, 2025, 11:15 AM PST
**Session:** 51 Quick Start
**Status:** Ready for new session
