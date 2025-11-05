# Session 35: Production Deployment Fixes
**Last Updated**: November 5, 2024, 10:57 AM PST

## Current Status: Frontend Build in Progress
The frontend is being rebuilt with correct production API URLs. Build started at 10:55 AM PST.

## What We Accomplished This Session

### ✅ Phase 1: Production Database Seeding (COMPLETED)
1. **Created production seed script** (`scripts/seed-production-correct.js`)
   - Uses built packages from `/app/packages/*/dist`
   - Works within Docker container environment
   - Handles both create and update scenarios

2. **Successfully seeded test users**:
   - admin@school.edu / Admin123!@#
   - teacher@school.edu / Teacher123!@#
   - student@school.edu / Student123!@#
   - Verified via API: `curl http://35.225.50.31/api/v0/stats/teacher-names`

### 🔄 Phase 2: Frontend API URL Fix (IN PROGRESS)

#### Problem Discovered
- Production frontend at http://35.225.50.31 was trying to connect to `localhost:3001`
- Root cause: Next.js `NEXT_PUBLIC_*` variables are baked into JavaScript at build time
- Frontend was built with `.env.local` containing localhost URLs

#### Solution Implemented
1. **Updated `Dockerfile.frontend`** (lines 48-56):
   ```dockerfile
   ARG NEXT_PUBLIC_API_URL
   ARG NEXT_PUBLIC_APP_URL
   ARG NEXT_PUBLIC_KEYCLOAK_URL
   ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
   ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
   ENV NEXT_PUBLIC_KEYCLOAK_URL=${NEXT_PUBLIC_KEYCLOAK_URL}
   ```

2. **Updated `docker-compose.prod.yml`** (lines 21-27):
   ```yaml
   frontend:
     build:
       args:
         NEXT_PUBLIC_API_URL: http://35.225.50.31/api/v0
         NEXT_PUBLIC_APP_URL: http://35.225.50.31
         NEXT_PUBLIC_KEYCLOAK_URL: http://35.225.50.31
   ```

3. **Files already transferred to GCP**:
   - Dockerfile.frontend
   - docker-compose.prod.yml

4. **Build currently running** (Background job ID: 0726b8):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache frontend
   ```

## Quick Reference for Next Session

### 1️⃣ Check Frontend Build Status
```bash
# Check if build completed
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 "cd ~/concetrateaiquiz && docker compose ps"

# If build failed, check logs
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 "cd ~/concetrateaiquiz && docker compose logs frontend"
```

### 2️⃣ Deploy New Frontend (if build succeeded)
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d frontend"
```

### 3️⃣ Verify Login Works
1. Navigate to http://35.225.50.31
2. Open browser console (F12)
3. Try logging in with: admin@school.edu / Admin123!@#
4. Check that API calls go to `http://35.225.50.31/api/v0/*` NOT `localhost:3001`

### 4️⃣ If Login Still Fails
Check these potential issues:
- Frontend container health: `docker compose ps`
- Nginx proxy working: `curl http://35.225.50.31/api/v0/stats/teacher-names`
- Frontend environment: `docker compose exec frontend env | grep NEXT_PUBLIC`

### 5️⃣ Next Priority: SSL Configuration
Once login works, proceed with SSL setup:
1. Get domain name from user
2. Update `.env.docker.prod` URLs (8 locations)
3. Update `nginx.conf` (uncomment HTTPS block)
4. Run SSL setup: `./deployment/setup-ssl.sh domain email`

## Key Files Modified This Session

| File | Changes | Why |
|------|---------|-----|
| `Dockerfile.frontend` | Added ARG/ENV for NEXT_PUBLIC_* vars | Fix hardcoded localhost in production build |
| `docker-compose.prod.yml` | Added build args for frontend | Pass production URLs at build time |
| `scripts/seed-production-correct.js` | Created new seed script | Works in production Docker environment |
| `.dockerignore` | Already had .env.local excluded | Prevents local env from affecting Docker builds |

## Critical Context

### Environment Variable Behavior
- `NEXT_PUBLIC_*` variables are **build-time only** in Next.js
- They get compiled into the JavaScript bundle during `npm run build`
- Runtime ENV changes have NO EFFECT on these variables
- Must rebuild frontend when changing API URLs

### Production Access
- **SSH**: `ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31`
- **Project Dir**: `~/concetrateaiquiz` (note the typo)
- **Docker Commands**: Always use both compose files:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml [command]
  ```

### Database State
- Schema initialized (11 tables)
- Test users seeded
- Strong JWT/Cookie secrets deployed
- Ready for application testing

## Blockers/Issues

1. **Frontend/Nginx showing "unhealthy"** in docker ps
   - This is expected without proper SSL configuration
   - Should resolve once frontend rebuild completes

2. **OAuth not configured**
   - Placeholder credentials in `.env.docker.prod`
   - Will need real Google OAuth credentials later

## Commands for Quick Recovery

```bash
# Quick health check
curl http://35.225.50.31/api/v0/stats/teacher-names

# Check all services
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml ps"

# View frontend logs
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f frontend"

# Restart frontend if needed
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml restart frontend"
```

## Time-Sensitive Notes
- Frontend rebuild takes ~5-10 minutes on GCP
- Build was started at 10:55 AM PST
- Should be complete by ~11:05 AM PST
- If switching sessions, check build status first!