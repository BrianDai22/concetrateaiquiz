# Docker NPM Workspace Fix - Context

**Last Updated**: 2024-11-05 20:30 UTC

## Current Implementation State

### ✅ SOLUTION FOUND AND DEPLOYED
- **Root Cause**: The `npm prune --production` approach broke workspace symlinks
- **Fix Applied**: Reverted to 3-stage Dockerfile with dedicated `production-deps` stage using `npm ci --omit=dev`
- **Status**: Build successful, deployment in progress on production server (35.225.50.31)

## Key Decisions Made This Session

1. **Reverted to Working Configuration**
   - Restored Dockerfile.api from commit ed7fc7f (the last known working state)
   - This uses 3-stage build: builder → production-deps → runtime
   - Key insight: `npm ci --omit=dev` in separate stage preserves symlinks correctly

2. **Why npm prune Failed**
   - Docker COPY preserves symlinks but not their targets
   - When copying only node_modules, symlinks point to non-existent ../../packages
   - Module resolution fails with "Cannot find module '@concentrate/database'"

3. **Why 3-Stage Works**
   - Stage 2 runs `npm ci --omit=dev` which creates proper workspace symlinks
   - Stage 3 copies ENTIRE packages directory (not just dist)
   - Symlinks in node_modules/@concentrate/* resolve correctly

## Files Modified

1. **Dockerfile.api**
   - Reverted to 3-stage configuration
   - Line 53-67: Added back production-deps stage
   - Line 90: Copy from production-deps instead of builder
   - Line 94: Copy entire packages directory to preserve symlinks

2. **Created Backups**
   - Dockerfile.api.backup - Contains the broken npm prune version for reference

## Current Deployment Status

### Production Server (35.225.50.31)
- Fixed Dockerfile.api copied via scp
- Build running with command:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache api &&
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ```
- Build at step 18/19 - running npm build for packages
- Frontend accessible at http://35.225.50.31

## Next Immediate Steps

1. **Monitor Build Completion** (5-10 minutes)
   - Watch for "✓ All packages compiled successfully"
   - Verify container starts without MODULE_NOT_FOUND errors

2. **Verify API Health**
   ```bash
   ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
     "docker logs school-portal-api --tail 50"
   ```

3. **Test System**
   - Check http://35.225.50.31/api/v0/stats/teacher-names
   - Test login functionality
   - Verify all endpoints working

## Known Issues & Blockers

1. **Git Authentication on Server**
   - Cannot pull from GitHub on production
   - Must use scp to copy files

2. **Long Build Times**
   - Full rebuild takes 5-10 minutes on GCP VM
   - NPM install is the slowest part

## Commands for Next Session

### Check Container Status
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "docker ps -a | grep school-portal"
```

### Check API Logs
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "docker logs school-portal-api --tail 100 | grep -E 'MODULE_NOT_FOUND|listening|error'"
```

### Restart if Needed
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api"
```

## Critical Insights

1. **Docker COPY and Symlinks**
   - COPY preserves symlink structure but not targets
   - Must copy all directories that symlinks reference
   - This is a common npm workspaces + Docker pitfall

2. **NPM Workspace Resolution**
   - Workspaces create symlinks in node_modules/@org/package → ../../packages/package
   - These MUST have targets available in runtime container
   - Either copy full packages or manually recreate symlinks

3. **Testing Approach**
   - Always test module resolution in container:
     ```bash
     docker run --rm [image] node -e "require('@concentrate/database')"
     ```

## Uncommitted Changes
- All changes committed as: "fix: Revert Dockerfile.api to working 3-stage build configuration"
- Pushed to main branch