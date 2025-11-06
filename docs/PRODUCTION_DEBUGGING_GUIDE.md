# Production Debugging Guide

**For:** Session 37 and beyond
**Server:** 35.225.50.31 (GCP)

## Quick Reference

### Workflow
1. User provides logs/errors from production
2. Claude diagnoses issue locally
3. Claude creates and tests fix locally
4. Claude commits with descriptive message and pushes to GitHub
5. User pulls changes on production server
6. User rebuilds/restarts affected containers
7. User verifies fix and provides feedback

## Common Error Patterns

### Docker/Build Errors

#### MODULE_NOT_FOUND Errors
```
Error: Cannot find module '@workspace/package-name'
```
**Cause:** Workspace symlinks broken (usually by `npm prune --production`)
**Solution:** Ensure Dockerfile copies full workspace and doesn't use `npm prune --production`
**Reference:** SESSION_36_DOCKER_NPM_WORKSPACE_FIX.md

#### Missing dist/ Directories
```
Error: ENOENT: no such file or directory, open '/app/dist/...'
```
**Cause:** Build not running in Docker or build output not being copied
**Solution:**
1. Verify `RUN npm run build` in Dockerfile
2. Check build verification script runs
3. Ensure COPY commands include dist directories

### Database Errors

#### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Cause:** Database service not running or wrong connection string
**Check:**
```bash
docker compose ps  # Verify db service is running
docker compose logs db  # Check database logs
```

#### Migration Errors
```
Error: Migration failed...
```
**Cause:** Database schema out of sync
**Solution:**
```bash
# Check migration status
docker compose exec api npx kysely migrate:latest

# If needed, reset and reseed
docker compose down -v  # CAUTION: Destroys data
docker compose up -d
docker compose exec api npm run db:seed
```

### Environment Variable Errors

#### Missing Environment Variables
```
Error: DATABASE_URL is not defined
```
**Cause:** .env file missing or not loaded
**Check:**
```bash
# Verify .env.production exists on server
ls -la ~/concetrateaiquiz/.env.production

# Check docker compose loads env file
grep env_file docker-compose.prod.yml
```

### Authentication Errors

#### JWT Errors
```
Error: Invalid token / Token expired
```
**Cause:**
- JWT_SECRET mismatch between services
- Token expiry too short
- Clock skew between server and client

**Solution:**
1. Verify JWT_SECRET is consistent
2. Check JWT_EXPIRES_IN setting
3. Verify server time is synchronized

#### OAuth Errors
```
Error: Invalid redirect_uri
```
**Cause:** OAuth redirect URIs not configured for production domain
**Solution:** Update OAuth provider settings with production URL

### Network/Nginx Errors

#### 502 Bad Gateway
```
502 Bad Gateway
nginx/1.x.x
```
**Cause:** Backend service not running or not responding
**Check:**
```bash
docker compose ps  # Verify api/frontend services running
docker compose logs nginx  # Check nginx logs
```

#### CORS Errors
```
Access to fetch at 'http://...' from origin 'http://...' has been blocked by CORS policy
```
**Cause:** CORS not configured correctly for production
**Solution:** Update CORS allowed origins in API config

## Diagnostic Commands

### Check Service Status
```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Specific service
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps api
```

### View Logs
```bash
# All logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 api
```

### Inspect Container
```bash
# Execute shell in running container
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api sh

# Check files in container
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api ls -la /app
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api ls -la /app/dist
```

### Check Environment Variables
```bash
# View env vars in container
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api env

# Check specific var
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api env | grep DATABASE_URL
```

### Database Queries
```bash
# Access database
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec db psql -U postgres -d concentrate-quiz

# Run query
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec db psql -U postgres -d concentrate-quiz -c "SELECT COUNT(*) FROM users;"
```

## Fixing Issues Locally

### Testing Docker Build Locally
```bash
# Build API image
docker build -f Dockerfile.api -t test-api:local .

# Run build verification
docker run --rm test-api:local ls -la /app/dist

# Check for workspace packages
docker run --rm test-api:local ls -la /app/packages
```

### Testing Docker Compose Locally
```bash
# Use production docker compose files
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

## Log Interpretation

### Successful API Startup
```
Server running on port 3001
Database connected successfully
Redis connected successfully
```

### Build Verification Success
```
✓ Package: @concentrate/auth exists
✓ Package: @concentrate/db exists
✓ API dist directory exists
```

### Common Log Patterns to Look For

**Error Loading Modules:**
```
Error: Cannot find module
  at Function.Module._resolveFilename
```
→ Workspace or dependency issue

**Database Errors:**
```
error: connect ECONNREFUSED
```
→ Database not running or connection string wrong

**Port Already in Use:**
```
Error: listen EADDRINUSE: address already in use :::3001
```
→ Old container still running

## Deployment Checklist

Before deploying a fix:
- [ ] Issue identified and root cause understood
- [ ] Fix implemented locally
- [ ] Fix tested locally with same conditions as production
- [ ] Clear commit message describing what was fixed and why
- [ ] Pushed to GitHub

After deployment:
- [ ] User pulls latest changes
- [ ] User rebuilds affected containers
- [ ] User restarts services
- [ ] User checks logs for successful startup
- [ ] User verifies fix resolves issue
- [ ] User confirms no new errors introduced

## Emergency Rollback

If a deployment breaks production:

```bash
# 1. Check git log for last working commit
git log --oneline -5

# 2. Reset to last working commit
git reset --hard <commit-hash>

# 3. Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Verify services are working
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Useful Aliases

Add to `~/.bashrc` on production server:

```bash
# Docker compose shortcuts
alias dcp='docker compose -f docker-compose.yml -f docker-compose.prod.yml'
alias dcpl='dcp logs -f'
alias dcps='dcp ps'
alias dcpb='dcp build --no-cache'
alias dcpu='dcp up -d'
alias dcpd='dcp down'

# Quick log checks
alias logs-api='dcp logs -f api'
alias logs-frontend='dcp logs -f frontend'
alias logs-db='dcp logs -f db'
alias logs-nginx='dcp logs -f nginx'
```

## Contact/Escalation

If issue cannot be resolved:
1. Document exact steps taken
2. Capture full error logs
3. Note any environment-specific details
4. Consider if issue requires architecture changes vs. quick fix
5. Escalate to user for input/decision
