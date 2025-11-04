# Google OAuth 2.0 Setup Guide

This guide explains how to set up Google OAuth authentication for the Concentrate.ai school portal platform.

## Overview

The application implements Google OAuth 2.0 for user authentication using the industry-standard authorization code flow. Users can:

- Sign in with their Google account
- Create a new account automatically (role: `student`)
- Link Google to an existing password-based account
- Use OAuth and password authentication interchangeably

## Architecture

### OAuth Flow

```
1. User clicks "Sign in with Google"
   → GET /api/v0/auth/oauth/google

2. Redirects to Google's authorization page
   → User grants permissions

3. Google redirects back with authorization code
   → GET /api/v0/auth/oauth/google/callback?code=...

4. Backend exchanges code for access token
   → Fetches user profile from Google
   → Creates/finds user in database
   → Generates JWT tokens
   → Sets HTTP-only cookies
   → Redirects to dashboard
```

### Database Schema

OAuth accounts are stored in the `oauth_accounts` table:

```sql
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,              -- 'google', 'github', etc.
  provider_account_id VARCHAR(255) NOT NULL,  -- Google user ID
  access_token TEXT,                          -- Google access token
  refresh_token TEXT,                         -- Google refresh token
  expires_at TIMESTAMP,                       -- Token expiration
  token_type VARCHAR(50),                     -- 'Bearer'
  scope TEXT,                                 -- 'openid profile email'
  id_token TEXT,                              -- Google ID token
  session_state TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);
```

## Google Cloud Console Setup

### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing):
   - Project name: `Concentrate School Portal`
   - Project ID: `concentrate-portal` (or auto-generated)

3. Enable Google+ API:
   - Navigation menu → APIs & Services → Library
   - Search for "Google+ API"
   - Click "Enable"

4. Configure OAuth Consent Screen:
   - Navigation menu → APIs & Services → OAuth consent screen
   - User Type: **External** (for testing) or **Internal** (for organization)
   - Application name: `Concentrate School Portal`
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `openid`, `profile`, `email`
   - Test users: Add your email for testing

5. Create OAuth 2.0 Client ID:
   - Navigation menu → APIs & Services → Credentials
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `Concentrate Portal Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:3001
     https://yourdomain.com
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3001/api/v0/auth/oauth/google/callback
     https://yourdomain.com/api/v0/auth/oauth/google/callback
     ```
   - Click "CREATE"

6. **Save your credentials**:
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `xxxxxx`

### Step 2: Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# OAuth Callback URL (must match Google Console)
OAUTH_CALLBACK_URL=http://localhost:3001/api/v0/auth/oauth/google/callback

# Frontend redirect URLs
OAUTH_SUCCESS_REDIRECT=http://localhost:3000/dashboard
OAUTH_ERROR_REDIRECT=http://localhost:3000/login?error=oauth_failed

# Existing configuration
JWT_SECRET=your-jwt-secret-key
COOKIE_SECRET=your-cookie-secret-key
```

### Step 3: Production Setup

For production deployment, update:

1. **Google Cloud Console:**
   - Add production URLs to authorized origins and redirect URIs
   - Example: `https://portal.concentrate.ai`

2. **Environment Variables:**
   ```bash
   GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-production-client-secret
   OAUTH_CALLBACK_URL=https://portal.concentrate.ai/api/v0/auth/oauth/google/callback
   OAUTH_SUCCESS_REDIRECT=https://portal.concentrate.ai/dashboard
   OAUTH_ERROR_REDIRECT=https://portal.concentrate.ai/login?error=oauth_failed
   NODE_ENV=production
   ```

## Testing OAuth Locally

### Step 1: Start the Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Start the API server
cd apps/api
npm run dev
```

The API will run on `http://localhost:3001`

### Step 2: Test OAuth Flow

1. **Navigate to OAuth URL:**
   ```
   http://localhost:3001/api/v0/auth/oauth/google
   ```

2. **You should be redirected to Google:**
   - Google login page appears
   - Select your Google account
   - Grant permissions (first time only)

3. **Google redirects back to callback:**
   ```
   http://localhost:3001/api/v0/auth/oauth/google/callback?code=...
   ```

4. **Backend processes OAuth:**
   - Exchanges code for access token
   - Fetches your Google profile
   - Creates user account (if new)
   - Sets JWT cookies
   - Redirects to dashboard

5. **Verify cookies are set:**
   - Open browser DevTools → Application → Cookies
   - Should see: `access_token` and `refresh_token`

### Step 3: Test API Access

With cookies set, you can now access protected endpoints:

```bash
# Get current user (uses OAuth-created account)
curl http://localhost:3001/api/v0/auth/me \
  -H "Cookie: access_token=YOUR_TOKEN"
```

## User Account Behavior

### New OAuth Users

When a user signs in with Google for the first time:

- **User created with:**
  - `email`: From Google profile
  - `name`: From Google profile
  - `role`: `student` (default)
  - `password_hash`: `null` (no password)
  - `suspended`: `false`

- **OAuth account created with:**
  - `provider`: `google`
  - `provider_account_id`: Google user ID
  - Access/refresh tokens stored

### Existing Email with Password

If a user tries to OAuth login with an email that already has a password:

- **Security behavior:** Blocks auto-linking
- **Error message:** "An account with this email already exists. Please log in with your password first to link your Google account."
- **Rationale:** Prevents account takeover if email is compromised

**To link Google:**
1. User must first login with password
2. Navigate to account settings
3. Click "Link Google Account"
4. This uses the `linkOAuthAccount()` service method

### Existing Email without Password

If a user was created via another OAuth provider (GitHub, etc.):

- **Behavior:** Automatically links Google to existing account
- **Rationale:** User already proved email ownership via OAuth

## API Endpoints

### GET /api/v0/auth/oauth/google

**Initiates Google OAuth flow**

- Automatically handled by @fastify/oauth2 plugin
- Generates authorization URL with:
  - `client_id`: Your Google Client ID
  - `redirect_uri`: Callback URL
  - `scope`: `openid profile email`
  - `response_type`: `code`
  - `state`: Random CSRF token

**Response:**
- **302 Redirect** to Google's authorization page

---

### GET /api/v0/auth/oauth/google/callback

**Handles OAuth callback from Google**

**Query Parameters:**
- `code` (required): Authorization code from Google
- `state` (required): CSRF token for validation

**Process:**
1. Exchange code for access token
2. Fetch user profile from Google
3. Call `OAuthService.handleGoogleCallback()`
4. Create/login user
5. Set JWT cookies
6. Redirect to success/error URL

**Response:**
- **302 Redirect** to dashboard (success) or login page (error)

**Cookies Set:**
- `access_token`: JWT access token (15 min expiry)
- `refresh_token`: JWT refresh token (7 day expiry)

---

## Security Considerations

### 1. HTTPS in Production

**Always use HTTPS** for OAuth in production:

```typescript
reply.setCookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ← HTTPS only
  sameSite: 'strict',
})
```

### 2. State Parameter (CSRF Protection)

The `@fastify/oauth2` plugin automatically:
- Generates random `state` parameter
- Validates state on callback
- Prevents CSRF attacks

### 3. Token Storage

- **OAuth tokens:** Stored in `oauth_accounts` table (server-side)
- **JWT tokens:** HTTP-only cookies (not accessible to JavaScript)
- **Never expose:** Google Client Secret in frontend code

### 4. Scope Limitations

We only request necessary scopes:
- `openid`: Authenticate user
- `profile`: Name, picture
- `email`: Email address

**Do NOT request** unnecessary scopes like:
- Google Drive access
- Gmail access
- Calendar access

### 5. Account Linking Security

- Users with passwords must authenticate before linking OAuth
- Prevents account takeover via email enumeration
- Implements principle of least privilege

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** OAuth callback URL doesn't match Google Console configuration

**Fix:**
1. Check `.env` file: `OAUTH_CALLBACK_URL` value
2. Check Google Console: Authorized redirect URIs
3. Ensure exact match (including protocol and port)

Example:
```
✅ http://localhost:3001/api/v0/auth/oauth/google/callback
❌ http://localhost:3000/api/v0/auth/oauth/google/callback (wrong port)
❌ https://localhost:3001/api/v0/auth/oauth/google/callback (wrong protocol)
```

---

### Error: "invalid_client"

**Cause:** Google Client ID or Secret is incorrect

**Fix:**
1. Verify `.env` variables:
   ```bash
   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret
   ```
2. Regenerate credentials in Google Console if needed

---

### Error: "access_denied"

**Cause:** User denied permissions or not on test users list

**Fix:**
1. For **External** app: Add email to Test Users in OAuth Consent Screen
2. For **Internal** app: Ensure user is in your Google Workspace organization

---

### Error: "Failed to fetch Google profile"

**Cause:** Access token invalid or Google API error

**Fix:**
1. Check Google+ API is enabled
2. Verify network connectivity
3. Check logs for detailed error:
   ```bash
   docker-compose logs -f api
   ```

---

### OAuth succeeds but user can't access resources

**Cause:** JWT cookies not set or expired

**Fix:**
1. Check browser cookies (DevTools → Application → Cookies)
2. Verify `JWT_SECRET` matches between sessions
3. Check cookie domain/path settings
4. Ensure CORS allows credentials:
   ```typescript
   app.register(cors, {
     origin: 'http://localhost:3000',
     credentials: true, // ← Required for cookies
   })
   ```

---

## Future Enhancements

Potential OAuth improvements for future sessions:

1. **Multiple OAuth Providers:**
   - GitHub OAuth
   - Microsoft OAuth
   - Account settings page to manage linked providers

2. **OAuth Token Refresh:**
   - Implement automatic token refresh
   - Use refresh tokens to get new access tokens
   - Update tokens in database

3. **Profile Picture Integration:**
   - Store Google profile picture URL
   - Display in UI
   - Update when user re-authenticates

4. **Email Verification:**
   - Trust verified emails from Google
   - Skip email verification step
   - Mark as `email_verified: true`

5. **OAuth Account Management:**
   - API endpoints to link/unlink providers
   - View all linked accounts
   - Prevent unlinking last auth method

---

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [@fastify/oauth2 Plugin](https://github.com/fastify/fastify-oauth2)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Document Version:** 1.0
**Last Updated:** Session 13 - 2025-11-04
**Maintained By:** Claude Code + Development Team
