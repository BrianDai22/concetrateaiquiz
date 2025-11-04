# Quick OAuth Test Guide

Your Google OAuth credentials are now configured! Here's how to test it:

## ✅ Credentials Configured

```
Client ID: 956918938093-tkdu0ct5tri69knrrb1iahqt373ur0ci.apps.googleusercontent.com
Client Secret: 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
Callback URL: http://localhost:3001/api/v0/auth/oauth/google/callback
```

## 🚀 How to Test OAuth

### Step 1: Start the API Server

```bash
cd /Users/briandai/Documents/concentrateaiproject

# Make sure database is running (should be already)
docker-compose ps

# Start the API server
cd apps/api
JWT_SECRET=test-secret npm run dev
```

The API will start on `http://localhost:3001`

### Step 2: Test OAuth Flow in Browser

1. **Open your browser and navigate to:**
   ```
   http://localhost:3001/api/v0/auth/oauth/google
   ```

2. **You should be redirected to Google:**
   - Google login page appears
   - Select your Google account
   - Grant permissions

3. **Google redirects back:**
   - URL: `http://localhost:3001/api/v0/auth/oauth/google/callback?code=...`
   - Backend exchanges code for token
   - Creates user account
   - Sets JWT cookies
   - Redirects to: `http://localhost:3000/dashboard` (frontend URL)

4. **Check the cookies:**
   - Open DevTools (F12) → Application → Cookies
   - Look for: `access_token` and `refresh_token`

### Step 3: Verify User Was Created

```bash
# In another terminal, check the database
docker exec -it concentrate-quiz-db psql -U postgres -d concentrate-quiz -c "SELECT id, email, name, role, password_hash FROM users ORDER BY created_at DESC LIMIT 1;"
```

You should see your Google account email with:
- `role`: student
- `password_hash`: (null)

### Step 4: Check OAuth Account

```bash
docker exec -it concentrate-quiz-db psql -U postgres -d concentrate-quiz -c "SELECT user_id, provider, provider_account_id FROM oauth_accounts ORDER BY created_at DESC LIMIT 1;"
```

You should see:
- `provider`: google
- `provider_account_id`: Your Google user ID

### Step 5: Test Authenticated API Access

```bash
# Use the access_token from cookies (get from DevTools)
curl http://localhost:3001/api/v0/auth/me \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

Should return your user profile!

## 🔧 Google Cloud Console Configuration

**IMPORTANT:** Make sure your Google Cloud Console is configured:

1. Go to: https://console.cloud.google.com/apis/credentials

2. Find your OAuth 2.0 Client ID

3. **Authorized redirect URIs** must include:
   ```
   http://localhost:3001/api/v0/auth/oauth/google/callback
   ```

4. **Authorized JavaScript origins** should include:
   ```
   http://localhost:3001
   ```

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"

**Fix:** Update Google Cloud Console:
- Go to credentials → Edit OAuth client
- Add `http://localhost:3001/api/v0/auth/oauth/google/callback` to Authorized redirect URIs
- Save and wait 1-2 minutes for changes to propagate

### Error: "invalid_client"

**Fix:** Double-check credentials in `.env` file match Google Console

### Browser shows "Cannot GET /dashboard"

**Expected!** The frontend isn't running. The OAuth flow still worked - check cookies and database to confirm user was created.

## ✅ Success Indicators

OAuth is working if:
1. ✅ Redirects to Google login page
2. ✅ Returns to callback URL after authorization
3. ✅ Cookies are set (`access_token`, `refresh_token`)
4. ✅ User appears in database with Google email
5. ✅ OAuth account appears in `oauth_accounts` table
6. ✅ Can access authenticated endpoints with cookie

## 📝 Next Steps

Once OAuth is working:
1. Build the frontend (Next.js app) to handle the redirects
2. Add "Sign in with Google" button
3. Test full user flow
4. Deploy to production with HTTPS

---

**For full documentation, see:** [docs/OAUTH_SETUP.md](docs/OAUTH_SETUP.md)
