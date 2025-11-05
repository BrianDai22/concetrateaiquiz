# Session 32: GCP Deployment Execution - ACTIVE DEPLOYMENT

**Date:** 2025-11-05
**Duration:** ~2-3 hours
**Status:** 🔴 **ACTIVE - API CONTAINER CRASHING - NEEDS IMMEDIATE ATTENTION**

---

## 🚨 CURRENT STATE - READ THIS FIRST

### What's Happening NOW:
You are **actively deploying** the School Portal to GCP VM at **35.225.50.31**.

**Current Problem:**
- ✅ Docker images built successfully (all 3: api, frontend, nginx)
- ✅ Containers started with `docker compose up -d`
- 🔴 **API container is RESTARTING in a crash loop** (exit code 1)
- ⏸️  Cannot proceed until API is fixed

**Your Location:**
- SSH session on GCP VM: `school-portal-vm`
- Working directory: `~/concetrateaiquiz`
- Latest code pulled (commit: `9e10052`)

### Next Immediate Steps:
```bash
# 1. Check API logs to see the error
docker compose logs api --tail=50

# 2. Common fixes depending on error:
# - If database password mismatch: Check .env.docker.prod vs docker-compose.yml
# - If "Cannot find module": Rebuild with --no-cache
# - If database not ready: Wait 30s and restart
```

---

## 📋 DEPLOYMENT PROGRESS CHECKLIST

### Phase 1: Infrastructure Setup ✅ COMPLETE
- [x] GCP VM created (e2-standard-2, Ubuntu 22.04)
- [x] Static IP reserved: **35.225.50.31**
- [x] Firewall configured (ports 22, 80, 443)
- [x] VM accessible via SSH

### Phase 2: VM Setup ✅ COMPLETE
- [x] Docker installed
- [x] Docker Compose installed
- [x] Repository cloned from GitHub
- [x] Logged out/in for Docker permissions

### Phase 3: Docker Build ✅ COMPLETE
- [x] Fixed `.dockerignore` (tsconfig.json, package-lock.json)
- [x] Fixed Dockerfile npm workspaces handling
- [x] Fixed package build order (shared → validation → ui → database → services)
- [x] Fixed Next.js 15 Suspense boundaries (3 pages)
- [x] Created missing `public` directory
- [x] All images built successfully

### Phase 4: Application Startup 🔴 IN PROGRESS - BLOCKED
- [x] `.env.docker.prod` generated with secrets
- [x] Database password configured
- [x] Containers started
- [ ] **BLOCKED: API container crashing**
- [ ] Database migrations pending
- [ ] Health check pending
- [ ] Application access test pending

---

## 🔧 FIXES APPLIED THIS SESSION

### Critical Docker Build Fixes (9 commits):

**1. Docker Compose Compatibility** (commits: `affe276`, more)
```bash
# Changed all scripts from old syntax to new
docker-compose → docker compose
```

**2. .dockerignore Fixes** (commits: `d1dbc8f`, `ebf19b3`)
```diff
# Removed exclusions that broke builds:
- package-lock.json  # NEEDED for npm ci
- tsconfig.json      # NEEDED for TypeScript compilation
```

**3. Dockerfile npm Workspaces** (commit: `e483c99`)
```diff
# Fixed node_modules copying - workspaces install to root only
- COPY --from=deps /app/packages/*/node_modules ...
+ COPY --from=deps /app/node_modules ./node_modules
```

**4. Package Build Order** (commit: `536b42b`)
```diff
# Fixed dependency order in package.json:
- database → validation → shared → ui
+ shared → validation → ui → database → services
```

**5. Next.js 15 Suspense Boundaries** (commits: `2255216`, `28bac68`, `e951da2`)
```tsx
// Fixed 3 pages using useSearchParams():
// - apps/frontend/app/(auth)/oauth/callback/page.tsx
// - apps/frontend/app/(auth)/login/page.tsx
// - apps/frontend/app/student/assignments/page.tsx

// Pattern applied to all:
function ContentComponent() {
  const searchParams = useSearchParams(); // Now inside Suspense
  // ... component logic
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <ContentComponent />
    </Suspense>
  );
}
```

**6. Missing Public Directory** (commit: `9e10052`)
```bash
mkdir -p apps/frontend/public
touch apps/frontend/public/.gitkeep
```

---

## 🗂️ FILES MODIFIED THIS SESSION

### Deployment Scripts:
- `deployment/health-check.sh` - Updated docker compose syntax
- `deployment/setup-ssl.sh` - Updated docker compose syntax

### Docker Configuration:
- `.dockerignore` - Removed tsconfig.json and package-lock.json exclusions
- `Dockerfile.api` - Fixed npm workspaces node_modules handling
- `Dockerfile.frontend` - Fixed npm workspaces node_modules handling

### Build Configuration:
- `package.json` - Fixed build:packages script order

### Frontend Pages (Suspense fixes):
- `apps/frontend/app/(auth)/oauth/callback/page.tsx`
- `apps/frontend/app/(auth)/login/page.tsx`
- `apps/frontend/app/student/assignments/page.tsx`

### New Files:
- `apps/frontend/public/.gitkeep` - Created missing directory

---

## 🐛 KNOWN ISSUES & SOLUTIONS

### Issue 1: API Container Crash Loop 🔴 ACTIVE
**Symptom:** Container restarts every few seconds with exit code 1

**Diagnosis Commands:**
```bash
docker compose logs api --tail=50
docker compose logs postgres --tail=20
docker compose ps
```

**Common Causes & Fixes:**

**A. Database Password Mismatch**
```bash
# Check if passwords match:
cat .env.docker.prod | grep DATABASE_URL
cat docker-compose.yml | grep POSTGRES_PASSWORD

# If mismatch, edit one to match the other:
nano .env.docker.prod  # or nano docker-compose.yml
docker compose restart api
```

**B. Database Not Ready**
```bash
# Wait for postgres to fully initialize:
docker compose logs postgres | grep "ready to accept"
sleep 30
docker compose restart api
```

**C. Missing Dependencies**
```bash
# Rebuild API image:
docker compose build --no-cache api
docker compose up -d
```

**D. Port Conflict**
```bash
# Check if port 3001 is in use on host:
docker compose exec api netstat -tulpn | grep 3001
```

### Issue 2: Frontend Build Errors (RESOLVED)
All Next.js 15 Suspense boundary errors fixed.

### Issue 3: Docker Build Cache Issues (RESOLVED)
Always use `--no-cache` flag when rebuilding.

---

## 📝 ENVIRONMENT CONFIGURATION

### Generated Secrets (from configure-production.sh):
The script generated these in `.env.docker.prod`:
- `JWT_SECRET` - Random 64-byte base64
- `COOKIE_SECRET` - Random 64-byte base64
- `DB_PASSWORD` - Random 32-byte base64

**IMPORTANT:** These passwords must match in two places:
1. `.env.docker.prod` → `DATABASE_URL=postgresql://postgres:PASSWORD@...`
2. `docker-compose.yml` → `POSTGRES_PASSWORD: PASSWORD`

### OAuth Configuration:
**Skipped during deployment** - User chose not to configure Google OAuth.
Can be added later by editing `.env.docker.prod` and restarting.

---

## 🎯 IMMEDIATE NEXT STEPS (IN ORDER)

### Step 1: Fix API Container Crash
```bash
# SSH into VM if not already there:
~/google-cloud-sdk/bin/gcloud compute ssh school-portal-vm --zone=us-central1-a

cd ~/concetrateaiquiz

# Check API logs:
docker compose logs api --tail=50

# Based on error, apply appropriate fix from "KNOWN ISSUES" section above
```

### Step 2: Verify All Containers Running
```bash
docker compose ps

# Expected output - all should show "Up" or "Up (healthy)":
# - concentrate-quiz-db (postgres)
# - school-portal-redis
# - school-portal-api
# - school-portal-frontend
# - school-portal-nginx
```

### Step 3: Run Database Migrations
```bash
# Wait for API to be stable first
docker compose exec api npm run migrate
```

### Step 4: Test Application
```bash
# Test API health:
curl http://localhost/api/v0/health
# Expected: {"status":"ok",...}

# Test in browser:
# Open: http://35.225.50.31
# Expected: See School Portal login page
```

### Step 5: Create First User & Test
```bash
# In browser at http://35.225.50.31:
# 1. Click "Register"
# 2. Create an admin account
# 3. Login
# 4. Test creating teacher/student
```

---

## 📊 DEPLOYMENT ARCHITECTURE

### GCP Resources:
```
Project: school-portal-prod-1762319504
Region: us-central1
Zone: us-central1-a

VM: school-portal-vm
- Type: e2-standard-2 (2 vCPU, 8GB RAM)
- Disk: 50GB SSD
- OS: Ubuntu 22.04 LTS
- Static IP: 35.225.50.31
```

### Docker Services (from docker-compose.yml):
```yaml
Services:
  postgres:5432    - Database (PostgreSQL 17)
  redis:6379       - Cache (Redis 7)
  api:3001         - Fastify Backend
  frontend:3000    - Next.js 15 Frontend
  nginx:80/443     - Reverse Proxy

Networks:
  school-portal-network (bridge)

Volumes:
  postgres_data
  redis_data
  nginx_certs
  certbot_www
```

### Request Flow:
```
Internet → 35.225.50.31:80 → Nginx
  ├─ /api/v0/* → API:3001 (Fastify)
  │   └─ Connects to Postgres:5432 & Redis:6379
  └─ /* → Frontend:3000 (Next.js)
      └─ Proxies API requests to /api/v0
```

---

## 💾 USEFUL COMMANDS FOR DEBUGGING

### Container Management:
```bash
# View all containers
docker compose ps

# View logs (all services)
docker compose logs -f

# View logs (specific service, last 50 lines)
docker compose logs api --tail=50
docker compose logs frontend --tail=50
docker compose logs postgres --tail=50
docker compose logs nginx --tail=50

# Restart specific service
docker compose restart api

# Stop all services
docker compose down

# Start all services
docker compose up -d

# Rebuild and restart specific service
docker compose build --no-cache api
docker compose up -d api

# Execute command in container
docker compose exec api sh
docker compose exec postgres psql -U postgres -d concentrate-quiz
```

### Database Commands:
```bash
# Check if postgres is ready
docker compose exec postgres pg_isready -U postgres

# Connect to database
docker compose exec postgres psql -U postgres -d concentrate-quiz

# List tables
docker compose exec postgres psql -U postgres -d concentrate-quiz -c "\dt"

# Run migrations
docker compose exec api npm run migrate
```

### Health Checks:
```bash
# API health
curl http://localhost/api/v0/health

# Nginx access test
curl http://localhost/

# From outside VM:
curl http://35.225.50.31/api/v0/health
```

---

## 🔍 TROUBLESHOOTING GUIDE

### Problem: "Cannot connect to database"
**Check:**
1. Is postgres running? `docker compose ps postgres`
2. Do passwords match in `.env.docker.prod` and `docker-compose.yml`?
3. Has postgres finished initializing? `docker compose logs postgres | grep ready`

**Fix:**
```bash
# Restart both postgres and api
docker compose restart postgres
sleep 10
docker compose restart api
```

### Problem: "Port already in use"
**Check:**
```bash
docker compose ps
netstat -tulpn | grep :3001
```

**Fix:**
```bash
docker compose down
docker compose up -d
```

### Problem: "Module not found" in API
**Fix:**
```bash
# Rebuild without cache
docker compose build --no-cache api
docker compose up -d api
```

### Problem: Frontend shows blank page
**Check:**
```bash
docker compose logs frontend
curl http://localhost:3000
```

**Fix:**
```bash
docker compose restart frontend
```

### Problem: 502 Bad Gateway from Nginx
**Likely Cause:** API or Frontend not responding

**Check:**
```bash
docker compose ps api frontend
curl http://localhost:3001/health  # Direct API test
curl http://localhost:3000/        # Direct frontend test
```

---

## 📖 REFERENCE DOCUMENTATION

### Key Files on VM:
- `/home/[user]/concetrateaiquiz/` - Application root
- `.env.docker.prod` - Production environment variables
- `docker-compose.yml` - Base services configuration
- `docker-compose.prod.yml` - Production overrides

### Repository:
- GitHub: `https://github.com/BrianDai22/concetrateaiquiz.git`
- Latest commit: `9e10052`
- Branch: `main`

### Deployment Docs:
- `QUICK_DEPLOY.md` - Quickstart guide (root)
- `deployment/GCP_DEPLOYMENT_GUIDE.md` - Full 14-phase guide
- `deployment/DEPLOYMENT_INFO.md` - Infrastructure details
- `deployment/configure-production.sh` - Main deployment script
- `deployment/health-check.sh` - Health verification script

---

## ⚠️ CRITICAL NOTES

1. **OAuth Not Configured:** Application works with email/password only. Google OAuth can be added later.

2. **No SSL Yet:** Application runs on HTTP only. SSL setup pending after successful deployment.

3. **Database Password:** The password in `.env.docker.prod` and `docker-compose.yml` MUST match exactly.

4. **Docker Cache:** Always use `--no-cache` when rebuilding to avoid cache issues.

5. **VM Costs:** ~$75/month when running. Can stop VM to save costs (keeps disk only ~$8/month).

---

## 🎬 WHAT TO DO WHEN YOU RESUME

1. **Check current container status:**
   ```bash
   docker compose ps
   docker compose logs api --tail=20
   ```

2. **If API still crashing:**
   - Read the API logs carefully
   - Apply fix from "KNOWN ISSUES" section
   - Test with `curl http://localhost/api/v0/health`

3. **Once API is stable:**
   - Run migrations
   - Test in browser at http://35.225.50.31
   - Create admin user
   - Test all 3 roles (admin, teacher, student)

4. **After successful test:**
   - Consider setting up SSL (optional)
   - Record demo video
   - Submit to adam@concentrate.ai

---

**Last Updated:** 2025-11-05 (end of Session 32)
**Next Session Priority:** Fix API container crash and complete deployment
**Estimated Time to Fix:** 5-15 minutes once error is identified
