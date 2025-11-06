# Google OAuth Production Setup Guide

## Quick Reference
**Domain:** https://coolstudentportal.online
**Backend Callback:** https://coolstudentportal.online/api/v0/auth/oauth/google/callback
**Frontend Callback:** https://coolstudentportal.online/oauth/callback

---

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
1. Visit https://console.cloud.google.com/
2. Select your project or create a new one
3. Navigate to **APIs & Services** → **Credentials**

### 1.2 Configure OAuth Consent Screen
1. Click **OAuth consent screen** in the left sidebar
2. Choose **External** user type
3. Fill in required fields:
   - **App name:** School Portal
   - **User support email:** your-email@example.com
   - **Developer contact:** your-email@example.com
4. Click **Save and Continue**
5. **Scopes:** Click **Add or Remove Scopes**
   - Add: `openid`
   - Add: `profile`
   - Add: `email`
6. Click **Save and Continue**
7. **Test users:** (Optional) Add test emails for testing
8. Click **Save and Continue**

### 1.3 Create OAuth Client ID
1. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Choose **Web application**
3. **Name:** School Portal Production
4. **Authorized JavaScript origins:**
   ```
   https://coolstudentportal.online
   ```
5. **Authorized redirect URIs:**
   ```
   https://coolstudentportal.online/api/v0/auth/oauth/google/callback
   ```
6. Click **Create**
7. **SAVE YOUR CREDENTIALS:**
   - Copy **Client ID** (ends with `.apps.googleusercontent.com`)
   - Copy **Client Secret**

---

## Step 2: Update Production Environment on VM

### 2.1 SSH to VM
```bash
ssh -i ~/.ssh/google_compute_engine briandai@35.225.50.31
cd ~/concetrateaiquiz
```

### 2.2 Pull Latest Changes
```bash
git pull origin main
```

### 2.3 Edit .env.docker.prod
```bash
nano .env.docker.prod
```

Update these lines with your actual credentials:
```env
# Replace with your actual Google OAuth credentials
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET

# These should already be correct (verify):
OAUTH_CALLBACK_URL=https://coolstudentportal.online/api/v0/auth/oauth/google/callback
OAUTH_SUCCESS_REDIRECT=https://coolstudentportal.online/oauth/callback
OAUTH_ERROR_REDIRECT=https://coolstudentportal.online/login?error=oauth_failed
```

Save and exit (Ctrl+X, Y, Enter)

---

## Step 3: Rebuild and Deploy

### 3.1 Rebuild API Container
```bash
# Stop API container
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop api

# Rebuild with new environment variables
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache api

# Start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check API logs for OAuth initialization
docker logs school-portal-api | grep -i oauth
```

### 3.2 Verify Containers are Healthy
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                     STATUS
school-portal-api        Up (healthy)
school-portal-frontend   Up (healthy)
school-portal-nginx      Up (healthy)
concentrate-quiz-db      Up (healthy)
school-portal-redis      Up (healthy)
```

---

## Step 4: Test OAuth Flow

### 4.1 Test in Browser
1. Visit https://coolstudentportal.online/login
2. Look for **"Sign in with Google"** button
3. Click the button
4. You should be redirected to Google's consent screen
5. Sign in with a Google account
6. Accept permissions
7. You should be redirected back to the School Portal dashboard

### 4.2 Verify User Creation
```bash
# Check database for new OAuth user
docker exec -it concentrate-quiz-db psql -U postgres -d concentrate-quiz -c "SELECT id, email, role FROM users ORDER BY created_at DESC LIMIT 5;"

# Check OAuth accounts table
docker exec -it concentrate-quiz-db psql -U postgres -d concentrate-quiz -c "SELECT user_id, provider, provider_account_id FROM oauth_accounts ORDER BY created_at DESC LIMIT 5;"
```

### 4.3 Test Logout and Re-login
1. Logout from the dashboard
2. Login again with Google - should be instant (no consent screen)

---

## Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Cause:** The callback URL in Google Console doesn't match the one in your app.

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Verify **Authorized redirect URIs** exactly matches:
   ```
   https://coolstudentportal.online/api/v0/auth/oauth/google/callback
   ```
4. No trailing slash, must use HTTPS

### Issue: "Access blocked: This app's request is invalid"

**Cause:** OAuth consent screen not configured or missing scopes.

**Fix:**
1. Go to **OAuth consent screen**
2. Ensure status is **Published** or **In testing**
3. Verify scopes: `openid`, `profile`, `email`

### Issue: User redirected to /login with error parameter

**Cause:** Backend OAuth callback failed.

**Fix:**
1. Check API logs:
   ```bash
   docker logs school-portal-api --tail 50
   ```
2. Look for OAuth-related errors
3. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

### Issue: "Cannot read properties of null" in frontend

**Cause:** Frontend can't fetch user data after OAuth login.

**Fix:**
1. Check if API is accessible from browser:
   ```bash
   curl https://coolstudentportal.online/api/v0/health
   ```
2. Verify CORS settings in `.env.docker.prod`:
   ```env
   CORS_ORIGIN=https://coolstudentportal.online
   ```

---

## OAuth Flow Diagram

```
User                 Frontend                Backend                 Google
 |                      |                       |                       |
 |  Click "Google"      |                       |                       |
 |--------------------->|                       |                       |
 |                      |  GET /oauth/google    |                       |
 |                      |---------------------->|                       |
 |                      |                       |  Redirect to Google   |
 |                      |                       |---------------------->|
 |                                              |                       |
 |  Google Consent Screen                                              |
 |<--------------------------------------------------------------------|
 |                                              |                       |
 |  User approves                               |                       |
 |-------------------------------------------------------------------->|
 |                                              |                       |
 |                      |                       |  Callback with code   |
 |                      |                       |<----------------------|
 |                      |                       |                       |
 |                      |                       |  Exchange code        |
 |                      |                       |---------------------->|
 |                      |                       |                       |
 |                      |                       |  Access token         |
 |                      |                       |<----------------------|
 |                      |                       |                       |
 |                      |                       | Fetch user profile    |
 |                      |                       |---------------------->|
 |                      |                       |                       |
 |                      |                       | User data             |
 |                      |                       |<----------------------|
 |                      |                       |                       |
 |                      |   Set cookies +       |                       |
 |                      |   Redirect to         |                       |
 |                      |   /oauth/callback     |                       |
 |                      |<----------------------|                       |
 |  Dashboard           |                       |                       |
 |<---------------------|                       |                       |
```

---

## Security Notes

1. **Never commit `.env.docker.prod` to git** - it contains secrets
2. **Use separate OAuth clients** for development and production
3. **Rotate secrets regularly** - update `JWT_SECRET` and `COOKIE_SECRET` every 90 days
4. **Monitor failed login attempts** in API logs
5. **Review OAuth consent screen** - ensure it accurately describes your app

---

## Next Steps

- [ ] Set up OAuth client in Google Cloud Console
- [ ] Update `.env.docker.prod` on VM with credentials
- [ ] Rebuild API container
- [ ] Test OAuth login flow
- [ ] Verify user creation in database
- [ ] Test with multiple Google accounts
- [ ] (Optional) Add Microsoft or GitHub OAuth providers
