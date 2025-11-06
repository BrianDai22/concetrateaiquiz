# Session 37: Production Deployment Fixes

**Date:** 2025-11-05
**Status:** Active
**Previous Sessions:** 31-36 (archived in dev/active/archive/)

## Session Overview

This session focuses on fixing production issues after the Docker npm workspace fix was deployed. The user is handling deployment operations manually via SSH to the production server, while Claude handles local fixes and commits to GitHub.

## Current Production State

**Server:** 35.225.50.31
**Deployment Method:** Manual SSH + git pull + docker compose rebuild

### What's Working
- ✅ Frontend deployed and running
- ✅ Docker npm workspace fix committed (3-stage Dockerfile)
- ✅ Git repository synced with latest changes

### What Needs Fixing
- 🔄 Production issues reported by user (logs pending)
- ⏳ Awaiting production logs and error reports

## Cleanup Completed This Session

1. **Removed Dockerfile.api.backup** - Backup file from previous session
2. **Consolidated seed scripts** - Kept only `seed-production.js` (working version)
   - Removed: seed-production-correct.js, seed-production-final.js, seed-production-fixed.js
3. **Added Docker workspace fix documentation**
   - DOCKER_NPM_WORKSPACE_FIX-context.md
   - DOCKER_NPM_WORKSPACE_FIX-quickstart.md

## Workflow for This Session

### User Responsibilities
1. Deploy to production server via SSH
2. Run docker compose rebuild/restart commands
3. Monitor production logs
4. Report errors and issues to Claude

### Claude Responsibilities
1. Diagnose issues from logs
2. Fix problems locally
3. Test fixes locally
4. Commit with descriptive messages
5. Push to GitHub for user to pull

### Deployment Commands (User)
```bash
# SSH to production server
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31

# Navigate to project
cd ~/concetrateaiquiz

# Pull latest changes
git pull origin main

# Rebuild and restart affected services
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache api
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
```

## Production Environment

**Database:** PostgreSQL (managed via docker compose)
**Cache:** Redis (managed via docker compose)
**Reverse Proxy:** Nginx
**SSL:** Certbot

**Environment Variables:**
- Database credentials
- JWT secrets
- OAuth credentials
- API keys

## Known Issues from Previous Sessions

### Docker npm Workspace Issue (RESOLVED)
- **Problem:** `MODULE_NOT_FOUND` error in production
- **Root Cause:** `npm prune --production` broke workspace symlinks
- **Solution:** Reverted to 3-stage Dockerfile (commit ed7fc7f)
- **Status:** Fixed and deployed

### Pending Issues
- Awaiting user logs for new production issues

## Next Steps

1. User deploys latest changes to production
2. User provides production logs and error reports
3. Claude diagnoses and fixes issues locally
4. Claude commits and pushes fixes
5. User pulls and redeploys
6. Repeat until all issues resolved

## Test Credentials

**Production URL:** http://35.225.50.31
**Admin Login:** admin@school.edu / Admin123!@#

## Session Notes

- Production server is running on GCP (Google Cloud Platform)
- User prefers to handle deployment manually to save Claude context
- Focus on local fixes and clear commit messages
- User will provide logs as issues arise
