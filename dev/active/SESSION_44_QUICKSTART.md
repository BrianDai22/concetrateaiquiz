# Session 44 Quick Start

## Current System State

✅ **Production Deployment:** Fully functional at https://coolstudentportal.online
✅ **OAuth Login:** Working correctly
✅ **All Containers:** Healthy (API, Frontend, Nginx, PostgreSQL, Redis)
✅ **SSL/HTTPS:** Enabled with Let's Encrypt certificates

**Last Session:** Successfully reverted broken chatbot implementation and fixed OAuth deployment issues

## Pre-Work Checklist

Before starting any work, validate production health:

- [ ] **Check site is accessible:** Visit https://coolstudentportal.online
- [ ] **Verify containers:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` (all should be "Up" and "healthy")
- [ ] **Test OAuth:** Try Google login at https://coolstudentportal.online/login
- [ ] **Review git status:** Check for any uncommitted changes
- [ ] **Read last session:** Review `/dev/active/SESSION_43_CHATBOT_REVERT_OAUTH_FIX.md`

## Quick Reference Commands

### Production Deployment (on GCP VM)
```bash
# SSH to production
ssh briandai@35.225.50.31
cd ~/concetrateaiquiz

# Pull latest changes
git pull origin main

# Deploy (ALWAYS use both compose files)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### Health Checks
```bash
# API health
curl https://coolstudentportal.online/api/v0/health

# Container logs
docker logs school-portal-api --tail 50
docker logs school-portal-frontend --tail 50
docker logs school-portal-nginx --tail 50

# Verify no dev volume mounts (should be empty)
docker inspect school-portal-api | grep -A 10 Mounts
```

### Environment Variables
```bash
# View production env vars
cat ~/concetrateaiquiz/.env.docker.prod | grep -E "(OAUTH|NEXT_PUBLIC|COOKIE)"

# After changing env vars:
# - For API: docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api
# - For NEXT_PUBLIC_*: Rebuild frontend with --no-cache
```

## Critical Production Patterns

### 1. Always Use Both Compose Files
```bash
# ✅ Correct
docker compose -f docker-compose.yml -f docker-compose.prod.yml [command]

# ❌ Wrong (uses dev mode with volume mounts)
docker compose [command]
```

### 2. NEXT_PUBLIC_* Variables Require Rebuild
```bash
# After changing NEXT_PUBLIC_API_URL or NEXT_PUBLIC_APP_URL:
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d frontend
```

### 3. OAuth Configuration
Required env vars in `.env.docker.prod`:
- `OAUTH_SUCCESS_REDIRECT=https://coolstudentportal.online/oauth/callback?success=true` (needs `?success=true`)
- `OAUTH_ERROR_REDIRECT=https://coolstudentportal.online/login`
- `OAUTH_CALLBACK_URL=https://coolstudentportal.online/api/v0/auth/oauth/google/callback`

## Known Issues to Avoid

1. **Hardcoded localhost in auth.ts:267** - OAuth error redirects go to localhost (low priority, errors are rare)
2. **Old Keycloak env vars** - Present but unused, can be cleaned up
3. **!reset directive in docker-compose.prod.yml** - Works but could be replaced with standard `volumes: []`

## Action Templates

### After Code Changes
```bash
# 1. Validate locally
npm run lint
npm run test

# 2. Commit and push
git add [files]
git commit -m "description"
git push origin main

# 3. Deploy to production (on GCP VM)
cd ~/concetrateaiquiz
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Verify deployment
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl https://coolstudentportal.online/api/v0/health
```

### OAuth Debugging Flow
```bash
# 1. Start watching logs
docker logs school-portal-api -f

# 2. Try OAuth in browser
# Visit: https://coolstudentportal.online/login
# Click: "Sign in with Google"

# 3. Check what happened in logs (Ctrl+C to stop watching)

# 4. Verify cookies in browser DevTools
# F12 → Application → Cookies → https://coolstudentportal.online
# Should see: access_token, refresh_token (Secure, HttpOnly, SameSite: Lax)

# 5. Test API with cookies
# In browser console:
fetch('https://coolstudentportal.online/api/v0/auth/me', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

### SSL Certificate Issues
```bash
# If nginx fails with certificate errors:
deployment/setup-ssl.sh coolstudentportal.online admin@coolstudentportal.online
sudo chown -R briandai:briandai ~/concetrateaiquiz/nginx_certs
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

## Self-Correction Protocol

After each action, validate the outcome:

1. **Made code changes?**
   - ✅ Run linter: `npm run lint`
   - ✅ Run tests: `npm run test`
   - ✅ Check no TypeScript errors: `npm run type-check`

2. **Deployed to production?**
   - ✅ All containers healthy: `docker compose ps`
   - ✅ API responding: `curl https://coolstudentportal.online/api/v0/health`
   - ✅ No errors in logs: `docker logs [container] --tail 50`

3. **Changed environment variables?**
   - ✅ Container restarted/rebuilt as needed
   - ✅ Verify with: `docker exec [container] printenv | grep [VAR_NAME]`

4. **Modified authentication flow?**
   - ✅ Test email/password login
   - ✅ Test OAuth login
   - ✅ Verify cookies in DevTools
   - ✅ Check user stays logged in on refresh

## Documentation Structure

- **Session Notes:** `/dev/active/SESSION_[N]_*.md` - Detailed work from each session
- **Quick Starts:** `/dev/active/SESSION_[N]_QUICKSTART.md` - Fast reference for next session
- **Context Docs:** `/docs/sessions/SESSION_[N]_*.md` - Archived completed sessions
- **Production Guide:** `/dev/active/PRODUCTION_DEBUGGING_GUIDE.md` - Troubleshooting reference

## Need Help?

1. Check last session notes: `/dev/active/SESSION_43_CHATBOT_REVERT_OAUTH_FIX.md`
2. Review production debugging guide: `/dev/active/PRODUCTION_DEBUGGING_GUIDE.md`
3. Check specs: `/docs/planning/SPECS.md` or `CLAUDE.md`
4. Deployment guides in: `/deployment/` directory
