import type { Kysely, Transaction } from 'kysely'
import type { Database, User, OAuthAccount } from '@concentrate/database'
import { UserRepository, OAuthAccountRepository } from '@concentrate/database'
import {
  generateAccessToken,
  generateRefreshToken,
  AlreadyExistsError,
  NotFoundError,
  InvalidCredentialsError,
} from '@concentrate/shared'

/**
 * Google user profile from OAuth provider
 */
export interface GoogleProfile {
  id: string // Google account ID
  email: string
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  verified_email?: boolean
}

/**
 * OAuth callback result with user and tokens
 */
export interface OAuthCallbackResult {
  user: User
  tokens: {
    accessToken: string
    refreshToken: string
  }
  isNewUser: boolean
}

/**
 * OAuthService - Business logic for OAuth authentication
 *
 * Responsibilities:
 * - Process OAuth callbacks from providers
 * - Create or find users based on OAuth profile
 * - Link OAuth accounts to existing users
 * - Generate JWT tokens for OAuth users
 * - Manage OAuth account tokens
 *
 * Business Rules:
 * - OAuth users are created with password_hash: null
 * - Default role for OAuth users is 'student'
 * - Email is used to match existing users
 * - If email exists with password, require linking
 * - OAuth tokens are stored in oauth_accounts table
 * - JWT tokens are generated same as regular login
 */
export class OAuthService {
  private userRepository: UserRepository
  private oauthAccountRepository: OAuthAccountRepository

  constructor(db: Kysely<Database> | Transaction<Database>) {
    this.userRepository = new UserRepository(db)
    this.oauthAccountRepository = new OAuthAccountRepository(db)
  }

  /**
   * Handle Google OAuth callback
   * - Finds or creates user based on Google profile
   * - Creates or updates OAuth account
   * - Generates JWT tokens
   * @param profile - Google user profile
   * @param tokens - OAuth tokens from Google
   * @returns User, JWT tokens, and isNewUser flag
   */
  async handleGoogleCallback(
    profile: GoogleProfile,
    tokens: {
      access_token: string
      refresh_token?: string
      expires_in?: number
      id_token?: string
    }
  ): Promise<OAuthCallbackResult> {
    // Check if OAuth account already exists
    const existingOAuthAccount = await this.oauthAccountRepository.findByProvider(
      'google',
      profile.id
    )

    let user: User
    let isNewUser = false

    if (existingOAuthAccount) {
      // OAuth account exists - get the user
      const existingUser = await this.userRepository.findById(
        existingOAuthAccount.user_id
      )
      if (!existingUser) {
        // Orphaned OAuth account - should not happen but handle it
        await this.oauthAccountRepository.delete(existingOAuthAccount.id)
        throw new NotFoundError('User account not found for OAuth account')
      }
      user = existingUser

      // Update OAuth tokens
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null

      await this.oauthAccountRepository.updateTokens(existingOAuthAccount.id, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt,
        id_token: tokens.id_token || null,
      })
    } else {
      // OAuth account doesn't exist - check if user exists by email
      const existingUserByEmail = await this.userRepository.findByEmail(
        profile.email.toLowerCase().trim()
      )

      if (existingUserByEmail) {
        // User exists - check if they have a password
        if (existingUserByEmail.password_hash) {
          // User has password-based account
          // For security, don't auto-link OAuth - require explicit linking
          throw new InvalidCredentialsError(
            'An account with this email already exists. Please log in with your password first to link your Google account.'
          )
        }

        // User exists but no password (created via another OAuth provider)
        // Safe to link this OAuth account
        user = existingUserByEmail
      } else {
        // New user - create account
        user = await this.userRepository.create({
          email: profile.email.toLowerCase().trim(),
          password_hash: null, // OAuth users have no password
          role: 'student', // Default role for OAuth users
          name: profile.name,
          suspended: false,
        })
        isNewUser = true
      }

      // Create OAuth account
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null

      await this.oauthAccountRepository.create({
        user_id: user.id,
        provider: 'google',
        provider_account_id: profile.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt,
        token_type: 'Bearer',
        scope: 'openid profile email',
        id_token: tokens.id_token || null,
        session_state: null,
      })
    }

    // Generate JWT tokens (same as regular login)
    const accessToken = generateAccessToken(user.id, user.role)
    const refreshToken = generateRefreshToken()

    // Note: Session storage in Redis is handled by the auth routes
    // to keep this service stateless and consistent with the pattern

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
      isNewUser,
    }
  }

  /**
   * Link OAuth account to existing user
   * - Used when user wants to add OAuth to password-based account
   * - Requires user to be already authenticated
   * @param userId - User ID to link to
   * @param provider - OAuth provider (e.g., 'google')
   * @param profile - OAuth profile from provider
   * @param tokens - OAuth tokens
   * @returns Created OAuth account
   * @throws AlreadyExistsError if OAuth account already linked
   */
  async linkOAuthAccount(
    userId: string,
    provider: string,
    profile: GoogleProfile,
    tokens: {
      access_token: string
      refresh_token?: string
      expires_in?: number
      id_token?: string
    }
  ): Promise<OAuthAccount> {
    // Check if user exists
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Check if OAuth account already exists for this provider
    const existingOAuthAccount =
      await this.oauthAccountRepository.findByUserIdAndProvider(userId, provider)
    if (existingOAuthAccount) {
      throw new AlreadyExistsError(
        `${provider} account is already linked to your account`
      )
    }

    // Check if this OAuth provider account is used by another user
    const existingProviderAccount = await this.oauthAccountRepository.findByProvider(
      provider,
      profile.id
    )
    if (existingProviderAccount) {
      throw new AlreadyExistsError(
        `This ${provider} account is already linked to another user`
      )
    }

    // Create OAuth account
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null

    const oauthAccount = await this.oauthAccountRepository.create({
      user_id: userId,
      provider,
      provider_account_id: profile.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      token_type: 'Bearer',
      scope: 'openid profile email',
      id_token: tokens.id_token || null,
      session_state: null,
    })

    return oauthAccount
  }

  /**
   * Unlink OAuth account from user
   * - Removes OAuth account
   * - User can still login if they have password
   * @param userId - User ID
   * @param provider - OAuth provider
   * @throws NotFoundError if OAuth account not found
   * @throws InvalidCredentialsError if this is the only auth method
   */
  async unlinkOAuthAccount(userId: string, provider: string): Promise<void> {
    // Check if user exists
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Check if OAuth account exists
    const oauthAccount = await this.oauthAccountRepository.findByUserIdAndProvider(
      userId,
      provider
    )
    if (!oauthAccount) {
      throw new NotFoundError(`No ${provider} account linked to your account`)
    }

    // Check if user has other auth methods
    const oauthCount = await this.oauthAccountRepository.countByUserId(userId)
    const hasPassword = user.password_hash !== null

    if (oauthCount === 1 && !hasPassword) {
      throw new InvalidCredentialsError(
        'Cannot unlink your only authentication method. Please set a password first.'
      )
    }

    // Delete OAuth account
    await this.oauthAccountRepository.deleteByUserIdAndProvider(userId, provider)
  }

  /**
   * Get all OAuth accounts for a user
   * @param userId - User ID
   * @returns Array of OAuth accounts
   */
  async getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
    return await this.oauthAccountRepository.findByUserId(userId)
  }

  /**
   * Check if user has specific OAuth provider linked
   * @param userId - User ID
   * @param provider - OAuth provider
   * @returns true if user has provider linked
   */
  async hasOAuthProvider(userId: string, provider: string): Promise<boolean> {
    return await this.oauthAccountRepository.hasProvider(userId, provider)
  }

  /**
   * Get OAuth account for user and provider
   * @param userId - User ID
   * @param provider - OAuth provider
   * @returns OAuth account if found, null otherwise
   */
  async getOAuthAccount(
    userId: string,
    provider: string
  ): Promise<OAuthAccount | null> {
    return await this.oauthAccountRepository.findByUserIdAndProvider(
      userId,
      provider
    )
  }

  /**
   * Refresh OAuth tokens
   * - Updates access token, refresh token, and expiration
   * @param userId - User ID
   * @param provider - OAuth provider
   * @param tokens - New OAuth tokens
   * @returns Updated OAuth account
   * @throws NotFoundError if OAuth account not found
   */
  async refreshOAuthTokens(
    userId: string,
    provider: string,
    tokens: {
      access_token: string
      refresh_token?: string
      expires_in?: number
      id_token?: string
    }
  ): Promise<OAuthAccount> {
    const oauthAccount = await this.oauthAccountRepository.findByUserIdAndProvider(
      userId,
      provider
    )
    if (!oauthAccount) {
      throw new NotFoundError(`No ${provider} account linked to your account`)
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null

    return await this.oauthAccountRepository.updateTokens(oauthAccount.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      id_token: tokens.id_token || null,
    })
  }
}
