# Session 13 - Google OAuth 2.0 Implementation Plan

**Created:** 2025-11-04  
**Session Goal:** Implement Google OAuth 2.0 authentication to fulfill project requirement  
**Prerequisites:** Backend complete (95%+ coverage), JWT auth system functional  
**Estimated Time:** 2-3 hours

---

## Executive Summary

This plan provides a step-by-step guide to integrate Google OAuth 2.0 into the existing JWT-based authentication system. The implementation will:
- Use the official `@fastify/oauth2` plugin with security best practices
- Integrate OAuth accounts with existing JWT session management
- Support both password and OAuth login flows
- Maintain 90%+ test coverage requirement
- Add no new dependencies beyond what's already approved

**Key Design Decision:** OAuth users will be merged with the existing user system. When a user logs in via Google OAuth for the first time, we create a new user account linked to their OAuth profile.

---

## Phase 1: Database & Repository Layer

### 1.1 Database Schema Review

**Current Schema Status:** ✅ COMPLETE  
The `oauth_accounts` table already exists in the schema:

```typescript
// packages/database/src/schema/index.ts (lines 84-99)
export interface OAuthAccountsTable {
  id: Generated<string>
  user_id: string                    // FK to users.id
  provider: string                   // 'google', 'github', etc.
  provider_account_id: string        // Google's unique user ID
  access_token: string | null        // OAuth access token
  refresh_token: string | null       // OAuth refresh token
  expires_at: Date | null            // Token expiration
  token_type: string | null          // Usually 'Bearer'
  scope: string | null               // Granted scopes
  id_token: string | null            // OpenID Connect ID token
  session_state: string | null       // OAuth session state
  created_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}
```

**No database migrations needed!** The schema is already OAuth-ready.

### 1.2 Create OAuthAccountRepository

**New File:** `packages/database/src/repositories/OAuthAccountRepository.ts`

**Purpose:** Encapsulate all OAuth account database operations following the existing repository pattern.

**Methods to Implement:**
```typescript
class OAuthAccountRepository {
  // Find OAuth account by provider and provider account ID
  async findByProviderAccount(provider: string, providerAccountId: string): Promise<OAuthAccount | null>
  
  // Find all OAuth accounts for a user
  async findByUserId(userId: string): Promise<OAuthAccount[]>
  
  // Create new OAuth account
  async create(data: NewOAuthAccount): Promise<OAuthAccount>
  
  // Update OAuth tokens (after refresh)
  async updateTokens(id: string, updates: OAuthAccountUpdate): Promise<OAuthAccount>
  
  // Delete OAuth account (unlink provider)
  async delete(id: string): Promise<void>
  
  // Check if provider account exists
  async providerAccountExists(provider: string, providerAccountId: string): Promise<boolean>
}
```

**Example Implementation Pattern:**
```typescript
import type { Kysely, Transaction } from 'kysely'
import type { Database, OAuthAccount, NewOAuthAccount, OAuthAccountUpdate } from '../schema'

export class OAuthAccountRepository {
  constructor(private db: Kysely<Database> | Transaction<Database>) {}

  async findByProviderAccount(
    provider: string,
    providerAccountId: string
  ): Promise<OAuthAccount | null> {
    const account = await this.db
      .selectFrom('oauth_accounts')
      .selectAll()
      .where('provider', '=', provider)
      .where('provider_account_id', '=', providerAccountId)
      .executeTakeFirst()
    
    return account ?? null
  }

  // ... other methods following UserRepository pattern
}
```

**Files to Create:**
1. `packages/database/src/repositories/OAuthAccountRepository.ts` (~150 lines)
2. `packages/database/src/repositories/__tests__/OAuthAccountRepository.test.ts` (~200 lines)
3. Update `packages/database/src/repositories/index.ts` to export new repository

**Testing Requirements:**
- 100% coverage on all repository methods
- Test create, read, update, delete operations
- Test null returns for not found cases
- Test unique constraints and error cases

---

## Phase 2: Service Layer

### 2.1 Create OAuthService

**New File:** `packages/services/src/OAuthService.ts`

**Purpose:** Business logic for OAuth authentication flow, integrating with existing AuthService.

**Key Responsibilities:**
1. Handle OAuth login flow (create user if new, return existing if found)
2. Link OAuth accounts to existing users
3. Fetch user profile from Google's userinfo endpoint
4. Generate JWT tokens for OAuth-authenticated users
5. Handle OAuth token refresh (future enhancement)

**Core Methods:**

```typescript
export class OAuthService {
  private userRepository: UserRepository
  private oauthAccountRepository: OAuthAccountRepository
  
  constructor(db: Kysely<Database> | Transaction<Database>) {
    this.userRepository = new UserRepository(db)
    this.oauthAccountRepository = new OAuthAccountRepository(db)
  }

  /**
   * Handle OAuth login callback
   * - Fetches user profile from Google
   * - Creates new user if first login
   * - Links OAuth account to user
   * - Returns user and JWT tokens
   */
  async handleOAuthLogin(
    provider: string,
    accessToken: string,
    refreshToken: string | undefined,
    expiresIn: number | undefined,
    idToken: string | undefined
  ): Promise<{ user: User; tokens: TokenPair }>

  /**
   * Fetch user profile from Google OAuth
   * - Makes API call to https://www.googleapis.com/oauth2/v1/userinfo
   * - Returns email, name, and unique provider ID
   */
  async fetchGoogleProfile(accessToken: string): Promise<GoogleProfile>

  /**
   * Link existing user to OAuth provider
   * - Useful for users who registered with password and want to add OAuth
   */
  async linkOAuthAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    tokens: OAuthTokens
  ): Promise<OAuthAccount>

  /**
   * Unlink OAuth account from user
   * - User must have password_hash OR another OAuth account
   * - Cannot unlink if it's the only authentication method
   */
  async unlinkOAuthAccount(userId: string, provider: string): Promise<void>
}
```

**Google Profile Interface:**
```typescript
interface GoogleProfile {
  sub: string              // Google's unique user ID
  email: string
  email_verified: boolean
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  locale?: string
}
```

**Business Rules:**
1. **First-time OAuth users:**
   - Create user with `email`, `name` from Google profile
   - Set `password_hash` to `null` (OAuth-only account)
   - Set default `role` to 'student' (can be changed by admin later)
   - Create linked OAuth account record

2. **Returning OAuth users:**
   - Find user by OAuth account
   - Update OAuth tokens if changed
   - Generate new JWT tokens

3. **Email conflicts:**
   - If email already exists with password, require user to login with password first
   - Then allow linking OAuth account via separate flow
   - Throw `AlreadyExistsError` if attempting OAuth login with existing email

4. **Cannot unlink last auth method:**
   - User must have either password OR another OAuth provider
   - Throw `InvalidStateError` if attempting to unlink the only auth method

**Files to Create:**
1. `packages/services/src/OAuthService.ts` (~250 lines)
2. `packages/services/src/__tests__/OAuthService.test.ts` (~400 lines)
3. Update `packages/services/src/index.ts` to export OAuthService

**External API Call:**
```typescript
// Use built-in fetch (Node.js 18+)
const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})

if (!response.ok) {
  throw new UnauthorizedError('Failed to fetch user profile from Google')
}

const profile: GoogleProfile = await response.json()
```

**Testing Requirements:**
- 100% coverage on OAuthService
- Mock Google userinfo API calls
- Test first-time OAuth login (user creation)
- Test returning OAuth login (existing user)
- Test email conflict scenarios
- Test linking/unlinking OAuth accounts
- Test token generation for OAuth users

---

## Phase 3: Validation Schemas

### 3.1 Update Validation Package

**File:** `packages/validation/src/auth.ts` (lines 72-89)

**Current Status:** ✅ OAuthCallbackSchema already exists!

```typescript
export const OAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required').optional(),
})
```

**No changes needed** - existing schema is sufficient.

**Optional Enhancement:** Add error query param validation
```typescript
export const OAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required').optional(),
  state: z.string().min(1, 'State parameter is required').optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})
```

This handles OAuth error callbacks like `?error=access_denied&error_description=...`

---

## Phase 4: Routes Implementation

### 4.1 Install @fastify/oauth2 Plugin

**Command:**
```bash
npm install @fastify/oauth2
```

**Current Status:** `@fastify/cookie` already installed ✅

**Version:** Latest stable (v8.x as of 2025)

### 4.2 Register OAuth Plugin in App

**File:** `apps/api/src/app.ts`

**Add after cookie registration (after line 49):**

```typescript
import oauthPlugin from '@fastify/oauth2'

// Register Cookie support (already exists)
await app.register(cookie, { ... })

// Register Google OAuth
await app.register(oauthPlugin, {
  name: 'googleOAuth2',
  credentials: {
    client: {
      id: process.env['GOOGLE_CLIENT_ID'] || '',
      secret: process.env['GOOGLE_CLIENT_SECRET'] || '',
    },
    auth: oauthPlugin.GOOGLE_CONFIGURATION,
  },
  startRedirectPath: '/api/v0/auth/oauth/google',
  callbackUri: process.env['GOOGLE_REDIRECT_URI'] || 'http://localhost:3001/api/v0/auth/oauth/google/callback',
  scope: ['openid', 'profile', 'email'],
  callbackUriParams: {
    access_type: 'offline', // Request refresh token
  },
})
```

**Type Augmentation for TypeScript:**

Create `apps/api/src/types/fastify-oauth2.d.ts`:
```typescript
import '@fastify/oauth2'

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: {
      getAccessTokenFromAuthorizationCodeFlow(
        request: FastifyRequest
      ): Promise<{
        access_token: string
        refresh_token?: string
        expires_in?: number
        id_token?: string
        token_type: string
      }>
    }
  }
}
```

### 4.3 Update Auth Routes

**File:** `apps/api/src/routes/auth.ts`

**Replace placeholder routes (lines 147-170) with:**

```typescript
/**
 * GET /auth/oauth/google
 * Initiates Google OAuth flow
 * Redirects to Google's OAuth consent screen
 * 
 * NOTE: This route is handled automatically by @fastify/oauth2 plugin
 * No implementation needed - plugin decorates the route
 */
// Plugin registers this route automatically via startRedirectPath

/**
 * GET /auth/oauth/google/callback
 * Handles Google OAuth callback
 * Exchanges authorization code for access token
 * Creates/logs in user and sets JWT cookies
 */
app.get('/oauth/google/callback', async (request, reply) => {
  try {
    // Get tokens from OAuth flow
    const token = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)
    
    // Initialize OAuth service
    const oauthService = new OAuthService(request.db)
    
    // Handle OAuth login (create user if new, login if existing)
    const result = await oauthService.handleOAuthLogin(
      'google',
      token.access_token,
      token.refresh_token,
      token.expires_in,
      token.id_token
    )
    
    // Set JWT cookies (same as regular login)
    reply.setCookie('access_token', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    })
    
    reply.setCookie('refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })
    
    // Redirect to frontend dashboard
    return reply.redirect(
      process.env['FRONTEND_URL'] 
        ? `${process.env['FRONTEND_URL']}/dashboard` 
        : 'http://localhost:3000/dashboard'
    )
  } catch (error) {
    // Log error
    request.log.error('OAuth callback error:', error)
    
    // Redirect to frontend login with error
    const errorMessage = error instanceof Error ? error.message : 'OAuth login failed'
    return reply.redirect(
      process.env['FRONTEND_URL']
        ? `${process.env['FRONTEND_URL']}/login?error=${encodeURIComponent(errorMessage)}`
        : `http://localhost:3000/login?error=${encodeURIComponent(errorMessage)}`
    )
  }
})
```

**Import additions at top of file:**
```typescript
import { OAuthService } from '@concentrate/services'
```

**Update AuthService import in packages/services/src/index.ts:**
```typescript
export * from './OAuthService'
```

---

## Phase 5: Environment Configuration

### 5.1 Environment Variables

**Add to `.env` (create if doesn't exist):**

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v0/auth/oauth/google/callback

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000

# Existing vars
JWT_SECRET=your-jwt-secret-here
COOKIE_SECRET=your-cookie-secret-here
```

**Add to `.env.example` (for documentation):**
```bash
# Google OAuth Configuration
# Get these from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v0/auth/oauth/google/callback

# Frontend URL for OAuth redirects after login
FRONTEND_URL=http://localhost:3000

JWT_SECRET=
COOKIE_SECRET=
```

### 5.2 Google Cloud Console Setup

**Steps to obtain credentials:**

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Create new project or select existing

2. **Configure OAuth Consent Screen**
   - Click "OAuth consent screen" in sidebar
   - Select "External" user type (or "Internal" if Google Workspace)
   - Fill in application name, support email
   - Add scopes: `openid`, `profile`, `email`
   - Add test users for development

3. **Create OAuth 2.0 Client ID**
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "Concentrate Quiz Platform - Local Dev"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (frontend)
     - `http://localhost:3001` (backend)
   - Authorized redirect URIs:
     - `http://localhost:3001/api/v0/auth/oauth/google/callback`
   - Click "Create"

4. **Copy Credentials**
   - Client ID: Copy to `GOOGLE_CLIENT_ID`
   - Client Secret: **SAVE IMMEDIATELY** (only shown once after June 2025)
   - Copy to `GOOGLE_CLIENT_SECRET`

5. **Production Setup (Future)**
   - Repeat steps with production URLs
   - Use HTTPS for redirect URIs: `https://yourdomain.com/api/v0/auth/oauth/google/callback`
   - Submit app for verification if needed (>100 users)

**Important Notes:**
- Changes to OAuth settings take 5 minutes to a few hours to propagate
- Client secrets created after June 2025 are only visible once
- Localhost URIs are exempt from HTTPS requirement
- Redirect URIs must match EXACTLY (trailing slashes matter!)

---

## Phase 6: Testing Strategy

### 6.1 Repository Tests

**File:** `packages/database/src/repositories/__tests__/OAuthAccountRepository.test.ts`

**Test Coverage:**
```typescript
describe('OAuthAccountRepository', () => {
  // Setup/teardown with test database
  
  describe('findByProviderAccount', () => {
    it('should find OAuth account by provider and provider account ID')
    it('should return null if account not found')
  })
  
  describe('findByUserId', () => {
    it('should find all OAuth accounts for a user')
    it('should return empty array if user has no OAuth accounts')
  })
  
  describe('create', () => {
    it('should create new OAuth account')
    it('should throw error if user_id does not exist (FK constraint)')
    it('should throw error if provider+provider_account_id already exists')
  })
  
  describe('updateTokens', () => {
    it('should update access token and refresh token')
    it('should update expires_at timestamp')
    it('should throw error if account not found')
  })
  
  describe('delete', () => {
    it('should delete OAuth account by ID')
    it('should throw error if account not found')
  })
  
  describe('providerAccountExists', () => {
    it('should return true if account exists')
    it('should return false if account does not exist')
  })
})
```

**Estimated:** 15-20 tests, 100% coverage

### 6.2 Service Tests

**File:** `packages/services/src/__tests__/OAuthService.test.ts`

**Test Coverage:**
```typescript
describe('OAuthService', () => {
  // Mock fetch for Google API calls
  
  describe('fetchGoogleProfile', () => {
    it('should fetch user profile from Google')
    it('should throw error if access token is invalid')
    it('should throw error if Google API is down')
  })
  
  describe('handleOAuthLogin - First Time User', () => {
    it('should create new user from Google profile')
    it('should create linked OAuth account')
    it('should generate JWT tokens')
    it('should set default role to student')
    it('should set password_hash to null')
  })
  
  describe('handleOAuthLogin - Returning User', () => {
    it('should find existing user by OAuth account')
    it('should update OAuth tokens if changed')
    it('should generate new JWT tokens')
    it('should not create duplicate user')
  })
  
  describe('handleOAuthLogin - Email Conflicts', () => {
    it('should throw error if email exists with password')
    it('should allow login if email exists with same OAuth provider')
  })
  
  describe('linkOAuthAccount', () => {
    it('should link OAuth provider to existing user')
    it('should throw error if provider already linked')
    it('should throw error if user not found')
  })
  
  describe('unlinkOAuthAccount', () => {
    it('should unlink OAuth provider from user')
    it('should throw error if last authentication method')
    it('should allow unlink if user has password')
    it('should allow unlink if user has another OAuth provider')
  })
})
```

**Estimated:** 20-25 tests, 100% coverage

**Mocking Pattern:**
```typescript
// Mock fetch globally
global.fetch = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
})

it('should fetch Google profile', async () => {
  // Mock successful Google API response
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      sub: 'google-user-123',
      email: 'user@example.com',
      email_verified: true,
      name: 'John Doe',
      picture: 'https://lh3.googleusercontent.com/...',
    })
  })
  
  const profile = await oauthService.fetchGoogleProfile('mock-access-token')
  
  expect(profile.email).toBe('user@example.com')
  expect(profile.name).toBe('John Doe')
  expect(global.fetch).toHaveBeenCalledWith(
    'https://www.googleapis.com/oauth2/v1/userinfo',
    expect.objectContaining({
      headers: { 'Authorization': 'Bearer mock-access-token' }
    })
  )
})
```

### 6.3 Integration Tests

**File:** `apps/api/tests/routes/auth.test.ts`

**Test Coverage:**
```typescript
describe('OAuth Routes', () => {
  describe('GET /api/v0/auth/oauth/google', () => {
    it('should redirect to Google OAuth consent screen')
    it('should include correct scopes in redirect URL')
    it('should include state parameter for CSRF protection')
  })
  
  describe('GET /api/v0/auth/oauth/google/callback', () => {
    // Mock @fastify/oauth2 plugin behavior
    
    it('should handle successful OAuth callback for new user', async () => {
      // Mock Google OAuth token exchange
      // Mock Google userinfo API
      // Verify user created
      // Verify OAuth account created
      // Verify JWT cookies set
      // Verify redirect to frontend dashboard
    })
    
    it('should handle successful OAuth callback for existing user', async () => {
      // Mock returning user scenario
      // Verify no duplicate user created
      // Verify JWT cookies set
    })
    
    it('should handle OAuth error callback', async () => {
      // Mock error from Google (e.g., user denied access)
      // Verify redirect to login with error message
    })
    
    it('should handle invalid authorization code', async () => {
      // Mock token exchange failure
      // Verify error handling and redirect
    })
  })
  
  describe('OAuth + JWT Integration', () => {
    it('should allow OAuth-authenticated user to access protected routes')
    it('should refresh OAuth user JWT tokens')
    it('should logout OAuth user and clear cookies')
  })
})
```

**Estimated:** 8-12 tests

**Mocking @fastify/oauth2:**
```typescript
// Mock the plugin's token exchange method
app.decorate('googleOAuth2', {
  getAccessTokenFromAuthorizationCodeFlow: vi.fn().mockResolvedValue({
    access_token: 'mock-google-access-token',
    refresh_token: 'mock-google-refresh-token',
    expires_in: 3600,
    id_token: 'mock-id-token',
    token_type: 'Bearer',
  })
})
```

### 6.4 E2E Tests (Optional - Future Enhancement)

**File:** `apps/e2e/oauth-flow.spec.ts` (Playwright)

**Test Coverage:**
```typescript
test.describe('OAuth Flow', () => {
  test('should complete full Google OAuth login flow', async ({ page }) => {
    // Navigate to login page
    // Click "Sign in with Google" button
    // Handle Google OAuth consent (requires test Google account)
    // Verify redirect back to app
    // Verify user is logged in
    // Verify dashboard access
  })
})
```

**Note:** E2E OAuth testing is complex due to Google's authentication flow. Consider skipping until frontend is ready.

---

## Phase 7: Documentation

### 7.1 Update SPECS.md

**File:** `docs/planning/SPECS.md`

**Add OAuth section:**
```markdown
## Authentication

### Password-Based Authentication
- Email and password registration
- JWT tokens with refresh token rotation
- HTTP-only cookies for security

### OAuth 2.0 Authentication
- **Google OAuth** integration
- Supported scopes: openid, profile, email
- First-time users automatically create accounts
- OAuth accounts linked to user records
- Supports multiple OAuth providers per user

### Endpoints
- `GET /api/v0/auth/oauth/google` - Initiate OAuth flow
- `GET /api/v0/auth/oauth/google/callback` - OAuth callback handler
- Future: Microsoft, GitHub OAuth providers
```

### 7.2 Create OAuth Setup Guide

**File:** `docs/guides/OAUTH_SETUP.md`

**Content:**
```markdown
# OAuth Setup Guide

## Google OAuth Configuration

### 1. Google Cloud Console Setup
[Step-by-step instructions from Phase 5.2]

### 2. Environment Variables
[Instructions from Phase 5.1]

### 3. Local Development
[Testing OAuth flow locally]

### 4. Production Deployment
[Configuring production OAuth credentials]

## Testing OAuth

### Manual Testing
1. Start backend: `npm run dev:api`
2. Navigate to: `http://localhost:3001/api/v0/auth/oauth/google`
3. Complete Google sign-in
4. Verify redirect to dashboard with JWT cookies

### Automated Testing
[Instructions for running OAuth integration tests]
```

### 7.3 Update API Documentation

**File:** `docs/api/ENDPOINTS.md`

**Add OAuth endpoints:**
```markdown
### OAuth Endpoints

#### GET /api/v0/auth/oauth/google
Initiates Google OAuth 2.0 authentication flow.

**Response:** 302 Redirect to Google OAuth consent screen

---

#### GET /api/v0/auth/oauth/google/callback
Handles OAuth callback from Google.

**Query Parameters:**
- `code` (string) - Authorization code from Google
- `state` (string, optional) - CSRF protection state

**Response:** 302 Redirect to frontend dashboard with JWT cookies set

**Error Response:** 302 Redirect to login page with error query param
```

---

## Phase 8: Error Handling & Edge Cases

### 8.1 Error Scenarios

**Scenario 1: Google API Down**
```typescript
// In OAuthService.fetchGoogleProfile()
if (!response.ok) {
  throw new UnauthorizedError('Failed to fetch user profile from Google')
}
```

**Scenario 2: User Denies OAuth Consent**
```typescript
// Google redirects to callback with ?error=access_denied
// @fastify/oauth2 throws error
// Caught in callback route, redirects to login with error message
```

**Scenario 3: Email Already Exists**
```typescript
// In OAuthService.handleOAuthLogin()
const existingUser = await this.userRepository.findByEmail(profile.email)
if (existingUser && !existingOAuthAccount) {
  throw new AlreadyExistsError(
    'An account with this email already exists. Please login with your password and link your Google account from settings.'
  )
}
```

**Scenario 4: OAuth Account Already Linked to Different User**
```typescript
// Should never happen, but defensive check
const oauthAccount = await this.oauthAccountRepository.findByProviderAccount(provider, profile.sub)
if (oauthAccount && oauthAccount.user_id !== userId) {
  throw new InvalidStateError('This Google account is already linked to another user')
}
```

**Scenario 5: Network Timeout**
```typescript
// Wrap fetch in timeout
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  })
  clearTimeout(timeoutId)
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('Google API request timed out')
  }
  throw error
}
```

### 8.2 Security Considerations

**CSRF Protection:**
- `@fastify/oauth2` automatically handles state parameter
- No additional implementation needed

**Token Storage:**
- Store OAuth tokens in database (encrypted at rest via PostgreSQL)
- Never expose OAuth tokens in API responses
- JWT tokens stored in HTTP-only cookies (already implemented)

**Refresh Token Security:**
- Store refresh tokens hashed (future enhancement)
- Rotate OAuth refresh tokens on use (Google best practice)

**Rate Limiting:**
- Add rate limiting to OAuth callback endpoint
- Prevent brute force attacks on authorization codes

**Email Verification:**
- Google provides `email_verified` field
- Only accept verified emails (add check in OAuthService)

```typescript
if (!profile.email_verified) {
  throw new ValidationError('Email not verified by Google')
}
```

**Suspended User Check:**
- Check if OAuth user is suspended before login
- Prevent suspended users from bypassing auth via OAuth

```typescript
const user = await this.userRepository.findById(oauthAccount.user_id)
if (user.suspended) {
  throw new ForbiddenError('Your account has been suspended')
}
```

---

## Phase 9: Implementation Checklist

### Pre-Implementation
- [ ] Review current database schema (oauth_accounts table)
- [ ] Verify `@fastify/cookie` is installed and configured
- [ ] Set up Google Cloud Console project
- [ ] Obtain OAuth Client ID and Secret
- [ ] Configure authorized redirect URIs

### Database & Repository (Day 1 - 1 hour)
- [ ] Create `OAuthAccountRepository.ts`
- [ ] Implement repository methods (create, find, update, delete)
- [ ] Write repository unit tests (15-20 tests)
- [ ] Verify 100% coverage on repository
- [ ] Export repository from index.ts

### Service Layer (Day 1 - 1.5 hours)
- [ ] Create `OAuthService.ts`
- [ ] Implement `fetchGoogleProfile()` method
- [ ] Implement `handleOAuthLogin()` method
- [ ] Implement `linkOAuthAccount()` method
- [ ] Implement `unlinkOAuthAccount()` method
- [ ] Write service unit tests (20-25 tests)
- [ ] Mock fetch for Google API calls
- [ ] Verify 100% coverage on service
- [ ] Export service from index.ts

### Routes & Integration (Day 2 - 1 hour)
- [ ] Install `@fastify/oauth2` plugin
- [ ] Register OAuth plugin in `app.ts`
- [ ] Create TypeScript type augmentation
- [ ] Update auth routes with OAuth callback handler
- [ ] Configure environment variables
- [ ] Test OAuth flow manually

### Testing (Day 2 - 1 hour)
- [ ] Write integration tests for OAuth routes
- [ ] Mock @fastify/oauth2 plugin behavior
- [ ] Test first-time user creation
- [ ] Test returning user login
- [ ] Test error scenarios
- [ ] Verify 90%+ overall coverage maintained

### Documentation (Day 2 - 30 min)
- [ ] Update SPECS.md with OAuth section
- [ ] Create OAUTH_SETUP.md guide
- [ ] Update API endpoint documentation
- [ ] Add OAuth environment variables to .env.example
- [ ] Document Google Cloud Console setup steps

### Final Verification
- [ ] All tests passing (existing + new OAuth tests)
- [ ] Coverage ≥ 90% overall
- [ ] TypeScript compilation clean
- [ ] Manual OAuth flow works end-to-end
- [ ] Error handling tested
- [ ] Security considerations addressed

---

## Phase 10: Rollback Plan

If OAuth implementation fails or introduces bugs:

### Immediate Rollback Steps:
1. **Revert route changes:**
   ```bash
   git checkout apps/api/src/routes/auth.ts
   ```

2. **Revert app.ts changes:**
   ```bash
   git checkout apps/api/src/app.ts
   ```

3. **Remove OAuth plugin:**
   ```bash
   npm uninstall @fastify/oauth2
   ```

4. **Keep database layer:**
   - OAuthAccountRepository can remain (no harm)
   - Schema is already deployed (no rollback needed)

### Partial Implementation Strategy:
If time-constrained, implement in phases:
- **Phase 1 only:** Database + Repository (no user-facing changes)
- **Phase 1-2:** + Service layer (still no user-facing changes)
- **Phase 1-3:** Full implementation

Each phase is independently testable and doesn't break existing functionality.

---

## Phase 11: Success Criteria

### Functional Requirements:
- [ ] User can click "Sign in with Google" button (frontend future work)
- [ ] OAuth flow redirects to Google consent screen
- [ ] User grants permissions and returns to app
- [ ] New user account created automatically
- [ ] Existing user logs in successfully
- [ ] JWT tokens set in HTTP-only cookies
- [ ] OAuth-authenticated user can access protected routes

### Technical Requirements:
- [ ] 90%+ test coverage maintained (targeting 100%)
- [ ] 0 TypeScript errors
- [ ] All existing tests still passing
- [ ] New OAuth tests passing (35-45 new tests)
- [ ] No new dependencies beyond @fastify/oauth2
- [ ] Security best practices followed

### Documentation Requirements:
- [ ] OAuth setup guide created
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Google Cloud Console setup documented

---

## Phase 12: Future Enhancements

### Post-Session 13 Improvements:

**1. Multiple OAuth Providers**
- Microsoft OAuth
- GitHub OAuth
- Use same pattern, just register additional plugins

**2. Account Linking UI**
- Frontend page to link/unlink OAuth providers
- Show all linked accounts
- Manage authentication methods

**3. OAuth Token Refresh**
- Implement background job to refresh expired OAuth tokens
- Use refresh_token to obtain new access_token
- Update tokens in database

**4. Profile Sync**
- Periodically sync user profile from Google
- Update name, email, picture if changed

**5. Automatic Profile Pictures**
- Store Google profile picture URL
- Display in user interface
- Fallback to initials if no picture

**6. OAuth Scopes Management**
- Request additional scopes (Google Calendar, Drive, etc.)
- Store granted scopes
- Check scope before API calls

**7. Rate Limiting**
- Add rate limits to OAuth endpoints
- Prevent abuse and brute force attempts

**8. OAuth Audit Logging**
- Log all OAuth login attempts
- Track provider, success/failure, timestamp
- Admin dashboard to view OAuth activity

---

## Estimated Timeline

**Total Time:** 4-5 hours (can split across 2 sessions)

| Phase | Task | Time | Difficulty |
|-------|------|------|------------|
| 1 | Database & Repository | 1 hour | Easy ⭐ |
| 2 | Service Layer | 1.5 hours | Medium ⭐⭐ |
| 3 | Validation | 10 min | Easy ⭐ |
| 4 | Routes & Integration | 1 hour | Medium ⭐⭐ |
| 5 | Environment Config | 20 min | Easy ⭐ |
| 6 | Testing | 1 hour | Medium ⭐⭐ |
| 7 | Documentation | 30 min | Easy ⭐ |
| 8 | Error Handling | 20 min | Easy ⭐ |
| 9 | Verification | 30 min | Easy ⭐ |

**Recommended Approach:** Complete Phases 1-2 in Session 13A, then Phases 3-9 in Session 13B.

---

## Quick Start Commands

```bash
# Install OAuth plugin
npm install @fastify/oauth2

# Run all tests
JWT_SECRET=test-secret npm run test

# Run OAuth tests only
JWT_SECRET=test-secret npx vitest run packages/database/src/repositories/__tests__/OAuthAccountRepository.test.ts
JWT_SECRET=test-secret npx vitest run packages/services/src/__tests__/OAuthService.test.ts
JWT_SECRET=test-secret npx vitest run apps/api/tests/routes/auth.test.ts

# Check coverage
JWT_SECRET=test-secret npm run test:coverage

# TypeScript check
npm run type-check

# Start dev server
npm run dev:api

# Test OAuth flow manually
# 1. Navigate to: http://localhost:3001/api/v0/auth/oauth/google
# 2. Complete Google sign-in
# 3. Verify redirect to dashboard
```

---

## Files Summary

### New Files to Create (6 files):
1. `packages/database/src/repositories/OAuthAccountRepository.ts` (~150 lines)
2. `packages/database/src/repositories/__tests__/OAuthAccountRepository.test.ts` (~200 lines)
3. `packages/services/src/OAuthService.ts` (~250 lines)
4. `packages/services/src/__tests__/OAuthService.test.ts` (~400 lines)
5. `apps/api/src/types/fastify-oauth2.d.ts` (~20 lines)
6. `docs/guides/OAUTH_SETUP.md` (~100 lines)

### Files to Modify (6 files):
1. `packages/database/src/repositories/index.ts` (+1 line export)
2. `packages/services/src/index.ts` (+1 line export)
3. `apps/api/src/app.ts` (+15 lines OAuth plugin registration)
4. `apps/api/src/routes/auth.ts` (+60 lines OAuth routes)
5. `apps/api/tests/routes/auth.test.ts` (+150 lines OAuth integration tests)
6. `docs/planning/SPECS.md` (+20 lines OAuth documentation)

**Total New Lines:** ~1,350 lines
**Total Modified Lines:** ~250 lines
**New Tests:** ~35-45 tests

---

## Key Dependencies

**Already Installed:**
- ✅ `@fastify/cookie` - Required for OAuth plugin (session management)
- ✅ `fastify` - Core framework
- ✅ `zod` - Validation (OAuthCallbackSchema already exists!)

**To Install:**
- ⬜ `@fastify/oauth2` - Official Fastify OAuth 2.0 plugin

**No other dependencies needed!** All other functionality uses built-in Node.js APIs (fetch, crypto, etc.)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Google API changes | Low | Medium | Use official @fastify/oauth2 plugin (maintained) |
| Test coverage drops below 90% | Low | High | Write tests alongside implementation |
| OAuth security vulnerabilities | Medium | High | Use @fastify/oauth2's built-in CSRF protection |
| Environment config issues | Medium | Low | Document clearly, provide .env.example |
| Time overrun | Medium | Medium | Implement in phases, can pause after Phase 2 |
| Breaking existing tests | Low | High | Run full test suite after each phase |

---

## Conclusion

This plan provides a comprehensive, step-by-step approach to implementing Google OAuth 2.0 authentication. The implementation follows the existing codebase patterns, maintains test coverage requirements, and integrates seamlessly with the current JWT authentication system.

**Key Advantages:**
- ✅ Database schema already supports OAuth (no migrations needed)
- ✅ Validation schemas already exist (no new schemas needed)
- ✅ Uses official, well-maintained @fastify/oauth2 plugin
- ✅ Integrates with existing JWT authentication flow
- ✅ Maintains 90%+ test coverage requirement
- ✅ Minimal new dependencies (only @fastify/oauth2)
- ✅ Clear rollback strategy if issues arise
- ✅ Phased implementation allows stopping at any point

**Recommended Execution:**
1. **Session 13A (2 hours):** Phases 1-2 (Database + Service layer)
2. **Break:** Review, test, commit progress
3. **Session 13B (2 hours):** Phases 3-9 (Routes + Testing + Documentation)
4. **Final Review:** Verification and manual testing

**Next Steps After Session 13:**
- Frontend OAuth button implementation
- Multiple OAuth providers (Microsoft, GitHub)
- OAuth account linking UI
- Profile picture integration

---

**Questions? Concerns?**
Review this plan, then begin implementation starting with Phase 1. Good luck! 🚀
