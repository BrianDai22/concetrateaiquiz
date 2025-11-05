# Docker NPM Workspace Fix - Quick Start Guide

## 🚨 CRITICAL CONTEXT FOR NEXT SESSION

### Current Status
- **Build Running**: Docker build in progress on production (35.225.50.31)
- **Solution Applied**: Reverted to 3-stage Dockerfile that worked in commit ed7fc7f
- **Expected Completion**: ~10 minutes from 20:30 UTC

## 1️⃣ First Thing to Check
```bash
# Check if API container is running
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "docker ps | grep school-portal-api"
```

If status shows "Up" → ✅ Success, skip to step 4
If status shows "Restarting" → ❌ Still broken, check logs (step 2)

## 2️⃣ Check for Module Errors
```bash
# Look for MODULE_NOT_FOUND errors
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "docker logs school-portal-api --tail 50 | grep MODULE"
```

If errors exist → The fix didn't work, see troubleshooting
If no errors → Continue to step 3

## 3️⃣ Verify API Health
```bash
# Test the health endpoint
curl http://35.225.50.31:3001/health

# Test a public endpoint
curl http://35.225.50.31/api/v0/stats/teacher-names
```

Both should return data without errors

## 4️⃣ Test Login System
1. Open http://35.225.50.31 in browser
2. Try logging in with test credentials:
   - Email: admin@school.edu
   - Password: Admin123!@#

## 5️⃣ If Everything Works - Clean Up
```bash
# Remove backup files and temp documentation
rm Dockerfile.api.backup
rm dev/active/SESSION_36_DOCKER_NPM_WORKSPACE_FIX.md
rm scripts/seed-production*.js  # Keep only one
```

## 6️⃣ Document Success
Update the session log with:
- Deployment confirmed working
- All endpoints tested
- Login functionality verified

## ⚠️ Troubleshooting

### If Container Still Failing:
The problem is deeper than expected. Check:

1. **Inspect node_modules structure**:
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "docker exec school-portal-api ls -la /app/node_modules/@concentrate/"
```
Should show symlinks or directories for database, services, shared, validation

2. **Check package directory**:
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "docker exec school-portal-api ls -la /app/packages/"
```
Should show all package directories with their dist folders

3. **Manual Fix Option**:
If symlinks are broken, try the alternative approach from the research:
- Modify Dockerfile.api to manually recreate symlinks
- Or switch to copying node_modules from builder instead of production-deps

### Key Insight
The root issue is Docker COPY doesn't preserve symlink targets. The 3-stage build with `npm ci --omit=dev` in a separate stage should work because it creates proper workspace resolution.

## 📝 Summary for Handoff
- **What was done**: Fixed npm workspace module resolution in Docker production builds
- **How it was fixed**: Reverted to 3-stage Dockerfile with dedicated production-deps stage
- **Why it broke**: npm prune approach didn't preserve workspace symlinks properly
- **Current state**: Build/deployment in progress, should complete by session start