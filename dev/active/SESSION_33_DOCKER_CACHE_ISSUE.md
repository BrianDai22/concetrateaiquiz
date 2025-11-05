# Session 33: Docker Cache Issue - Critical Discovery

**Date:** 2025-11-05
**Duration:** Extended debugging session with AI consensus analysis
**Status:** 🔴 **REAL ROOT CAUSE FOUND - VOLUME MOUNTS ISSUE**

---

## 🚨 CRITICAL DISCOVERY: The REAL Root Cause

After using AI consensus analysis with GPT-5 Pro and Gemini 2.5 Pro debating the issue, we discovered the **ACTUAL root cause** - it's NOT Docker cache or TypeScript compilation!

### 🔥 THE REAL PROBLEM: Volume Mounts Overwriting Built Artifacts

**Development volume mounts in `docker-compose.yml` are replacing the compiled code with source code at runtime!**

### The Problems

**Initial Symptom (Both Containers):**
```
API: Error: Cannot find module '/app/node_modules/@concentrate/database/dist/index.js'
Frontend: Error: Cannot find module '/app/apps/frontend/server.js'
```

**What's Actually Happening:**

In `docker-compose.yml`, these volume mounts are the culprit:
```yaml
# API service (lines 55-58)
volumes:
  - ./apps/api/src:/app/apps/api/src
  - ./packages:/app/packages  # ← OVERWRITES compiled dist/ folders!

# Frontend service (lines 87-91)
volumes:
  - ./apps/frontend:/app/apps/frontend  # ← OVERWRITES .next/standalone!
```

**The Timeline:**
1. **Build Phase** ✅: Docker builds successfully, creates all dist/ folders and .next/standalone
2. **Runtime Phase** ❌: `docker compose up` mounts host directories, replacing built artifacts
3. **Result**: Container has source code instead of compiled code = MODULE_NOT_FOUND errors

**Why Previous Fixes Didn't Work:**
- Our Dockerfile fixes were actually correct!
- The builds were always succeeding
- But volume mounts immediately replaced the built code at runtime
- This is why `--no-cache` didn't help - it wasn't a cache issue!

**Proof:**
When inspecting the container:
```bash
/app $ ls -la /app/packages/database/dist/
NO DIST!
```

---

## ✅ THE REAL SOLUTION - Use Production Configuration!

### The Fix: Use `docker-compose.prod.yml` which removes volume mounts

The production compose file already exists and has `volumes: []` for both api and frontend services!

### On GCP VM, Run These Commands:
```bash
# 1. Pull the latest code with production config
cd ~/concetrateaiquiz
git pull origin main

# 2. Stop all containers
docker compose down

# 3. Build containers (can skip --no-cache now that we know the issue)
docker compose build api frontend

# 4. START WITH PRODUCTION CONFIG - THIS IS THE KEY!
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Verify success
sleep 30
docker compose ps
docker compose logs api --tail=20
docker compose logs frontend --tail=20
```

**Why This ACTUALLY Works:**
- `docker-compose.prod.yml` overrides the development volume mounts with `volumes: []`
- Built artifacts (dist/ folders, .next/standalone) remain intact inside containers
- No more source code overwriting compiled code at runtime!
- The Dockerfiles were always correct - it was a configuration issue!

---

## 📋 CHANGES MADE THIS SESSION

### 1. Frontend Dockerfile Fix ✅
**File:** `Dockerfile.frontend:90`
**Change:**
```dockerfile
# Before:
CMD ["node", "server.js"]

# After:
CMD ["node", "apps/frontend/server.js"]
```

**Reason:** Next.js standalone preserves workspace structure - server.js is at `apps/frontend/server.js`, not root

**Status:** ✅ Committed (`efd6066`) and pushed to GitHub

---

### 2. API Dockerfile Analysis ✅
**File:** `Dockerfile.api`
**Finding:** No code changes needed!

**Verification:**
- All workspace packages **already have** `"main": "dist/index.js"` in package.json ✅
- Dockerfile.api copies entire `packages/` directory correctly ✅
- The issue was **NOT** the Dockerfile - it was Docker cache!

---

## 🔍 DIAGNOSTIC FINDINGS

### What We Discovered Inside the Container:

1. **Symlinks exist correctly:**
   ```
   /app/node_modules/@concentrate/database → ../../packages/database
   ```

2. **Package.json has correct "main" field:**
   ```json
   "main": "dist/index.js"
   ```

3. **Packages directory exists:**
   ```
   /app/packages/database/package.json ✅
   /app/packages/database/src/ ✅
   ```

4. **BUT: No dist/ folders! ❌**
   ```
   /app/packages/database/dist/ → NO DIST!
   ```

This proved the build step was skipped due to cache.

---

## 🎯 QUICK START FOR NEXT SESSION

### 1-2-3 Steps to Resume:

**1. Verify Current State:**
```bash
# On GCP VM
cd ~/concetrateaiquiz
docker compose ps
```

**2. If Containers Still Crashing:**
```bash
# Force clean rebuild (THIS IS THE FIX)
docker compose down
docker compose build --no-cache api frontend
docker compose up -d
sleep 30
docker compose ps
```

**3. If Containers Running Successfully:**
```bash
# Run migrations
docker compose exec api npm run migrate

# Test API
curl http://localhost/api/v0/health

# Test in browser
# Open: http://35.225.50.31
```

---

## 📊 FILES MODIFIED THIS SESSION

### Committed Changes:
1. **Dockerfile.frontend** - Fixed server.js path (commit `efd6066`)

### No Changes Needed:
1. **Dockerfile.api** - Already correct
2. **packages/*/package.json** - All have "main" field already

---

## 🧠 KEY LEARNINGS

### 1. Docker Cache Behavior
- `docker compose build` **without** `--no-cache` → reuses old layers
- All output showing `#X CACHED` means **commands didn't run**
- Critical for monorepos where build order matters

### 2. npm Workspaces in Docker
- Workspace packages need:
  1. `"main": "dist/index.js"` in package.json ✅
  2. Actual dist/ folders created by build ❌ (was missing due to cache)
  3. Symlinks in node_modules ✅
  4. Full packages/ directory copied ✅

### 3. Next.js Standalone Output
- Preserves monorepo structure: `apps/frontend/server.js`
- NOT at root: `server.js`
- CMD must match actual structure

---

## 🔧 TROUBLESHOOTING GUIDE

### If API Still Crashes After `--no-cache` Rebuild:

**Check build logs for TypeScript errors:**
```bash
docker compose build --no-cache api 2>&1 | tee api-build.log
grep -i error api-build.log
```

**Inspect what's actually in the image:**
```bash
docker compose run --rm api sh
ls -la /app/packages/database/dist/
```

### If Frontend Still Crashes:

**Check server.js location:**
```bash
docker compose run --rm frontend sh
ls -la /app/server.js                    # Should NOT exist
ls -la /app/apps/frontend/server.js      # Should exist
```

---

## 📝 ENVIRONMENT STATE

### GCP VM Info:
- **VM:** school-portal-vm
- **IP:** 35.225.50.31
- **Zone:** us-central1-a
- **Working Dir:** ~/concetrateaiquiz
- **Branch:** main
- **Latest Commit:** efd6066

### Container Status (Before Fix):
- ✅ concentrate-quiz-db: Healthy
- ✅ school-portal-redis: Healthy
- 🔴 school-portal-api: **Restarting (crash loop)**
- 🔴 school-portal-frontend: **Restarting (crash loop)**
- 🟡 school-portal-nginx: Running but failing (upstreams down)

### Expected Status (After Fix):
- ✅ All 5 containers: Healthy / Up
- ✅ API: Responding to /api/v0/health
- ✅ Frontend: Accessible at http://35.225.50.31
- ✅ Nginx: Routing correctly

---

## ⚠️ IMPORTANT NOTES

1. **DO NOT run `docker compose build` without `--no-cache`**
   It will just reuse broken cache!

2. **Frontend fix is already on GitHub**
   The Dockerfile.frontend CMD change is committed and pushed

3. **No code changes needed for API**
   The Dockerfile and package.json files are all correct

4. **The ONLY issue was Docker cache**
   Once rebuilt with `--no-cache`, everything should work

---

## 🎬 IMMEDIATE NEXT STEPS

### On GCP VM:
1. Run `docker compose build --no-cache api frontend` ⏰ 5-8 min
2. Run `docker compose up -d`
3. Wait 30 seconds
4. Check `docker compose ps` - should see all "Up"
5. Test: `curl http://localhost/api/v0/health`
6. Open browser: http://35.225.50.31
7. Register admin user
8. Test all 3 roles

### After Successful Deployment:
1. Run database migrations
2. Test all features
3. Consider SSL setup (optional)
4. Record demo video
5. Submit to adam@concentrate.ai

---

**Last Updated:** 2025-11-05 (Session 33) - FIXES COMPLETED AND PUSHED TO GITHUB
**Status:** ✅ READY FOR DEPLOYMENT TO GCP VM
**Commit:** 0dab246 - fix: resolve Docker container crashes by fixing TypeScript compilation and Next.js build

## 🚀 DEPLOYMENT READY - EXECUTE ON GCP VM NOW:

```bash
# SSH into GCP VM
gcloud compute ssh school-portal-vm --zone us-central1-a

# Navigate to project directory
cd ~/concetrateaiquiz

# Pull the latest fixes from GitHub
git pull origin main

# Stop existing containers
docker compose down

# Force rebuild with fixes (5-8 minutes)
docker compose build --no-cache api frontend

# Start all containers
docker compose up -d

# Wait and verify
sleep 30
docker compose ps

# All containers should show "Up" status
# Test the application at: http://35.225.50.31
```

**Estimated Time:** 10-15 minutes total
**Success Indicators:**
- All 5 containers show "Up" status
- No "Restarting" containers
- API responds at http://localhost/api/v0/health
- Frontend loads at http://35.225.50.31
