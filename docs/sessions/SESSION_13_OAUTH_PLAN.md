# Session 13 - Google OAuth Integration Plan

**Priority**: After Session 12 (100% Coverage)
**Estimated Time**: 1-2 sessions
**Requirement**: SPECS.md requires "at least 1 OAuth provider"

---

## Overview

Implement complete Google OAuth 2.0 authentication flow to allow users to register and login using their Google accounts. This integrates with the existing JWT cookie-based authentication system.

---

## Phase 1: Database Schema (30 min)

### Create OAuth Accounts Table

**Migration**: `packages/database/migrations/002_oauth_accounts.ts`

```sql
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_account_id);

-- Auto-update trigger
CREATE TRIGGER oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Update Kysely Types

Add to `packages/database/src/types.ts`:

```typescript
export interface OAuthAccount {
  id: string
  user_id: string
  provider: 'google' | 'microsoft' | 'github'
  provider_account_id: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: Date | null
  scope: string | null
  created_at: Date
  updated_at: Date
}

export interface Database {
  // ... existing tables
  oauth_accounts: OAuthAccount
}
```

---

## Phase 2: Google OAuth Setup (15 min)

### Google Cloud Console Setup

1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/v0/auth/oauth/google/callback`
6. Get Client ID and Client Secret

### Environment Variables

Add to `.env`:
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v0/auth/oauth/google/callback
```

---

## Phase 3: OAuth Repository (45 min)

**File**: `packages/database/src/repositories/OAuthRepository.ts`

### Methods to Implement:

```typescript
export class OAuthRepository {
  // Link OAuth account to user
  async linkOAuthAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    tokens: {
      accessToken: string
      refreshToken?: string
      expiresAt?: Date
      scope?: string
    }
  ): Promise<OAuthAccount>

  // Find OAuth account by provider and provider account ID
  async findByProvider(
    provider: string,
    providerAccountId: string
  ): Promise<OAuthAccount | null>

  // Find OAuth accounts by user ID
  async findByUserId(userId: string): Promise<OAuthAccount[]>

  // Update OAuth tokens
  async updateTokens(
    id: string,
    tokens: {
      accessToken: string
      refreshToken?: string
      expiresAt?: Date
    }
  ): Promise<OAuthAccount>

  // Delete OAuth account
  async delete(id: string): Promise<void>

  // Unlink OAuth account from user
  async unlinkByProvider(
    userId: string,
    provider: string
  ): Promise<void>
}
```

**Tests**: `packages/database/src/repositories/OAuthRepository.test.ts`
- Target: 100% coverage, ~30-40 tests

---

## Phase 4: Auth Service OAuth Methods (1 hour)

**File**: `packages/services/src/AuthService.ts`

### Methods to Add:

```typescript
export class AuthService {
  // ... existing methods

  /**
   * Initiate Google OAuth flow
   * Returns authorization URL to redirect user to
   */
  getGoogleAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email profile',
      state: state || randomBytes(16).toString('hex'),
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  /**
   * Handle Google OAuth callback
   * Exchange code for tokens, get user info, create/link account
   */
  async handleGoogleCallback(code: string): Promise<{
    user: User
    tokens: { accessToken: string; refreshToken: string }
    isNewUser: boolean
  }> {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()

    // 2. Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    )
    const googleUser = await userInfoResponse.json()

    // 3. Check if OAuth account exists
    const oauthAccount = await this.oauthRepository.findByProvider(
      'google',
      googleUser.id
    )

    let user: User
    let isNewUser = false

    if (oauthAccount) {
      // Existing OAuth account - get user
      user = await this.userRepository.findById(oauthAccount.user_id)

      // Update tokens
      await this.oauthRepository.updateTokens(oauthAccount.id, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      })
    } else {
      // Check if user exists with this email
      const existingUser = await this.userRepository.findByEmail(googleUser.email)

      if (existingUser) {
        // Link OAuth to existing user
        user = existingUser
        await this.oauthRepository.linkOAuthAccount(
          user.id,
          'google',
          googleUser.id,
          {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            scope: tokens.scope,
          }
        )
      } else {
        // Create new user
        user = await this.userRepository.create({
          email: googleUser.email,
          name: googleUser.name,
          password_hash: null, // OAuth-only user, no password
          role: 'student', // Default role for OAuth users
          suspended: false,
        })

        // Link OAuth account
        await this.oauthRepository.linkOAuthAccount(
          user.id,
          'google',
          googleUser.id,
          {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            scope: tokens.scope,
          }
        )

        isNewUser = true
      }
    }

    // 4. Generate our JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    })
    const refreshToken = generateRefreshToken({
      userId: user.id,
      role: user.role,
    })

    // 5. Store refresh token in Redis
    await this.sessionRepository.create(refreshToken, user.id)

    return {
      user,
      tokens: { accessToken, refreshToken },
      isNewUser,
    }
  }
}
```

**Tests**: Add to `packages/services/src/AuthService.test.ts`
- Test getGoogleAuthUrl generation
- Mock Google API responses for handleGoogleCallback
- Test new user creation via OAuth
- Test existing user OAuth linking
- Test token updates for returning users
- Target: 100% coverage on OAuth methods

---

## Phase 5: API Routes (30 min)

**File**: `apps/api/src/routes/auth.ts`

### Update OAuth Routes (currently 501 placeholders):

```typescript
/**
 * GET /auth/oauth/google
 * Initiate Google OAuth flow
 */
app.get('/oauth/google', async (request, reply) => {
  const authService = new AuthService(request.db)

  // Generate state parameter for CSRF protection
  const state = randomBytes(16).toString('hex')

  // Store state in cookie for validation
  reply.setCookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
    path: '/',
  })

  const authUrl = authService.getGoogleAuthUrl(state)

  return reply.redirect(authUrl)
})

/**
 * GET /auth/oauth/google/callback
 * Handle Google OAuth callback
 */
app.get('/oauth/google/callback', async (request, reply) => {
  const authService = new AuthService(request.db)

  // Validate state parameter (CSRF protection)
  const { state, code } = request.query as { state?: string; code?: string }
  const storedState = request.cookies['oauth_state']

  if (!state || !storedState || state !== storedState) {
    return reply.code(400).send({ error: 'Invalid state parameter' })
  }

  if (!code) {
    return reply.code(400).send({ error: 'Missing authorization code' })
  }

  // Clear state cookie
  reply.clearCookie('oauth_state')

  try {
    const result = await authService.handleGoogleCallback(code)

    // Set JWT tokens as cookies
    reply.setCookie('access_token', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })

    reply.setCookie('refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    // Redirect to frontend dashboard
    const redirectUrl = result.isNewUser
      ? `${process.env.FRONTEND_URL}/welcome`
      : `${process.env.FRONTEND_URL}/dashboard`

    return reply.redirect(redirectUrl)
  } catch (error) {
    request.log.error(error)
    return reply.code(500).send({ error: 'OAuth authentication failed' })
  }
})
```

---

## Phase 6: Integration Tests (45 min)

**File**: `apps/api/tests/routes/oauth.test.ts`

### Tests to Write:

```typescript
describe('OAuth Routes', () => {
  describe('GET /api/v0/auth/oauth/google', () => {
    it('should redirect to Google OAuth with correct params')
    it('should set oauth_state cookie')
    it('should include state parameter in URL')
  })

  describe('GET /api/v0/auth/oauth/google/callback', () => {
    it('should create new user from Google OAuth')
    it('should link OAuth to existing user by email')
    it('should login existing OAuth user')
    it('should set access_token and refresh_token cookies')
    it('should reject callback with invalid state')
    it('should reject callback without code')
    it('should handle Google API errors gracefully')
  })
})
```

**Note**: Mock Google API responses using nock or similar

---

## Phase 7: Validation Schemas (15 min)

**File**: `packages/validation/src/oauth.ts`

```typescript
import { z } from 'zod'

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export const OAuthProviderSchema = z.enum(['google', 'microsoft', 'github'])

export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>
```

---

## Implementation Checklist

### Database Layer:
- [ ] Create oauth_accounts migration
- [ ] Update Kysely types
- [ ] Run migration
- [ ] Create OAuthRepository
- [ ] Write OAuthRepository tests (100% coverage)

### Service Layer:
- [ ] Add OAuth methods to AuthService
- [ ] Write AuthService OAuth tests (100% coverage)
- [ ] Mock Google API responses

### API Layer:
- [ ] Implement GET /oauth/google
- [ ] Implement GET /oauth/google/callback
- [ ] Add OAuth validation schemas
- [ ] Write integration tests

### Testing:
- [ ] Test new user OAuth registration
- [ ] Test existing user OAuth login
- [ ] Test OAuth account linking
- [ ] Test CSRF protection (state parameter)
- [ ] Test error handling
- [ ] Achieve 100% coverage on OAuth code

### Google Setup:
- [ ] Create Google OAuth credentials
- [ ] Configure redirect URI
- [ ] Add environment variables
- [ ] Test OAuth flow end-to-end

---

## Success Criteria

✅ Users can click "Login with Google"
✅ OAuth flow redirects to Google
✅ Callback creates new user or logs in existing user
✅ JWT tokens set as HTTP-only cookies
✅ OAuth account linked to user record
✅ 100% test coverage on OAuth code
✅ All 71+ existing tests still passing
✅ TypeScript compiles with no errors

---

## Estimated Timeline

- Database migration: 30 min
- OAuthRepository + tests: 45 min
- AuthService OAuth methods + tests: 1 hour
- API routes implementation: 30 min
- Integration tests: 45 min
- Google setup + manual testing: 30 min

**Total: 4 hours (1-2 sessions)**

---

## Files Summary

### New Files (7):
1. `packages/database/migrations/002_oauth_accounts.ts`
2. `packages/database/src/repositories/OAuthRepository.ts`
3. `packages/database/src/repositories/OAuthRepository.test.ts`
4. `packages/validation/src/oauth.ts`
5. `packages/validation/src/oauth.test.ts`
6. `apps/api/tests/routes/oauth.test.ts`
7. `.env` updates

### Modified Files (4):
1. `packages/database/src/types.ts` (add OAuthAccount interface)
2. `packages/services/src/AuthService.ts` (add OAuth methods)
3. `packages/services/src/AuthService.test.ts` (add OAuth tests)
4. `apps/api/src/routes/auth.ts` (implement OAuth routes)

---

## Next Session Start Command

```bash
# Session 13 (after 100% coverage achieved)
cd packages/database

# Create migration
cat > migrations/002_oauth_accounts.ts << 'EOF'
// Migration content here
EOF

# Run migration
npm run migrate
```
