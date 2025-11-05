# QUICK START GUIDE FOR NEXT SESSION
**Created**: 2025-11-05T19:20:00Z
**Purpose**: Resume Docker deployment after context reset

## 🚨 CURRENT STATE
- ✅ Frontend container: DEPLOYED and WORKING (correct env vars)
- ✅ API Docker image: REBUILT with fix
- ❌ API container: NOT YET DEPLOYED (still running old broken image)
- ❌ Login: NOT YET TESTED

## 📋 NUMBERED ACTION ITEMS

### 1. Deploy the Fixed API Container
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api"
```

### 2. Verify API Started Successfully
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml ps"
```
**Expected**: API container status should be "Up" not "Restarting"

### 3. Check API Logs for Errors
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml logs api --tail=20"
```
**Expected**: Should see "Server listening on port 3001" WITHOUT module errors

### 4. Test API Health Endpoint
```bash
curl http://35.225.50.31/api/v0/health
```
**Expected**: Should return `{"status":"ok"}`

### 5. Test Login in Browser
- Open: http://35.225.50.31
- Open DevTools > Network tab
- Login with: `admin@school.edu` / `Admin123!@#`
- **Verify**: API calls go to `http://35.225.50.31/api/v0/*` NOT localhost

### 6. If Login Works - Check Other Test Accounts
```
Teacher: teacher1@school.edu / Teacher123!@#
Student: student1@school.edu / Student123!@#
```

### 7. If Everything Works - Prepare for SSL
Ask user for:
- Domain name (e.g., school-portal.example.com)
- Email for Let's Encrypt

### 8. Update Production URLs for SSL
Once domain is provided, update `.env.docker.prod`:
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "cd ~/concetrateaiquiz && nano .env.docker.prod"
```
Change all http://35.225.50.31 to https://[domain]

### 9. Setup Nginx SSL
Update nginx config with domain and run certbot

### 10. Final Production Test
Test login with HTTPS after SSL setup

## 🔧 TROUBLESHOOTING

### If API Still Has Module Errors:
```bash
# The fix is already in Dockerfile.api
# Just rebuild if needed:
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache api"
```

### If Frontend Shows Wrong API URL:
```bash
# Check runtime env vars:
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec frontend env | grep NEXT_PUBLIC"
```

### Quick Container Restart:
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31 \
  "cd ~/concetrateaiquiz && docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api frontend"
```

## 📝 KEY FILES MODIFIED THIS SESSION
- `Dockerfile.api` - Fixed with npm prune approach
- `docker-compose.prod.yml` - Added runtime env vars for frontend
- `Dockerfile.api.backup` - Original version saved as backup

## 🎯 SUCCESS METRICS
You'll know deployment is successful when:
1. ✅ API container stays "Up" (not restarting)
2. ✅ No module errors in API logs
3. ✅ Health endpoint returns 200 OK
4. ✅ Login works at http://35.225.50.31
5. ✅ API calls in browser go to production URL not localhost

## 💡 REMEMBER
- The npm workspace fix is ALREADY DONE
- The API image is ALREADY BUILT
- You just need to DEPLOY and TEST
- Frontend is ALREADY WORKING

## 🚀 ESTIMATED TIME
- Steps 1-5: ~5 minutes
- Step 6: ~2 minutes
- Steps 7-10 (SSL): ~15-20 minutes

---

**NEXT SESSION START HERE**: Run command #1 above to deploy the fixed API container!