import type { Kysely, Transaction } from 'kysely'
import type { Database, User, NewUser } from '@concentrate/database'
import { UserRepository, SessionRepository, redis } from '@concentrate/database'
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  AlreadyExistsError,
  InvalidCredentialsError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  TokenInvalidError,
} from '@concentrate/shared'

/**
 * Token pair returned after authentication
 */
export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * AuthService - Business logic for authentication and session management
 *
 * Responsibilities:
 * - User registration with password hashing
 * - Login with credential verification
 * - JWT token generation and verification
 * - Session management via Redis
 * - Token refresh
 * - Password change
 * - Session revocation
 *
 * Business Rules:
 * - Cannot register with existing email
 * - Cannot login if suspended
 * - Access tokens expire after 15 minutes
 * - Refresh tokens expire after 7 days
 * - Sessions stored in Redis with auto-expiration
 * - Old password must be verified before change
 */
export class AuthService {
  private userRepository: UserRepository
  private sessionRepository: SessionRepository

  constructor(db: Kysely<Database> | Transaction<Database>) {
    this.userRepository = new UserRepository(db)
    this.sessionRepository = new SessionRepository(redis)
  }

  /**
   * Register a new user
   * - Validates email uniqueness
   * - Hashes password
   * - Creates user
   * @param data - Registration data
   * @returns Created user
   * @throws AlreadyExistsError if email already exists
   */
  async register(data: NewUser): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(data.email)
    if (existingUser) {
      throw new AlreadyExistsError(`User with email ${data.email} already exists`)
    }

    // Hash password
    const hashedPassword = data.password_hash
      ? await hashPassword(data.password_hash)
      : null

    // Create user
    const user = await this.userRepository.create({
      ...data,
      password_hash: hashedPassword,
    })

    return user
  }

  /**
   * Login with email and password
   * - Verifies credentials
   * - Checks if user is suspended
   * - Generates token pair
   * - Creates session in Redis
   * @param email - User email
   * @param password - User password (plain text)
   * @returns Token pair and user
   * @throws InvalidCredentialsError if credentials are invalid
   * @throws ForbiddenError if user is suspended
   */
  async login(
    email: string,
    password: string
  ): Promise<{ tokens: TokenPair; user: User }> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim())
    if (!user) {
      throw new InvalidCredentialsError('Invalid email or password')
    }

    // Verify password
    const passwordHash = user.password_hash ?? ''
    const isPasswordValid = await verifyPassword(password, passwordHash)
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('Invalid email or password')
    }

    // Check if user is suspended
    if (user.suspended) {
      throw new ForbiddenError('Your account has been suspended')
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role)
    const refreshToken = generateRefreshToken()

    // Store session in Redis
    await this.sessionRepository.create(user.id, refreshToken)

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      user,
    }
  }

  /**
   * Logout
   * - Removes session from Redis
   * @param refreshToken - Refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepository.delete(refreshToken)
  }

  /**
   * Refresh access token
   * - Verifies refresh token exists in Redis
   * - Generates new access token
   * - Optionally rotates refresh token
   * @param refreshToken - Refresh token
   * @param rotate - Whether to rotate refresh token (default: false)
   * @returns New token pair
   * @throws UnauthorizedError if refresh token is invalid
   */
  async refreshAccessToken(
    refreshToken: string,
    rotate: boolean = false
  ): Promise<TokenPair> {
    // Check if session exists in Redis
    const session = await this.sessionRepository.get(refreshToken)
    if (!session) {
      throw new UnauthorizedError('Invalid or expired refresh token')
    }

    // Get user
    const user = await this.userRepository.findById(session.userId)
    if (!user) {
      // User was deleted - clean up session
      await this.sessionRepository.delete(refreshToken)
      throw new UnauthorizedError('User not found')
    }

    // Check if user is suspended
    if (user.suspended) {
      // User was suspended - clean up session
      await this.sessionRepository.delete(refreshToken)
      throw new ForbiddenError('Your account has been suspended')
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.role)

    // Optionally rotate refresh token
    let newRefreshToken = refreshToken
    if (rotate) {
      newRefreshToken = generateRefreshToken()

      // Delete old session and create new one
      await this.sessionRepository.delete(refreshToken)
      await this.sessionRepository.create(user.id, newRefreshToken)
    } else {
      // Extend session TTL
      await this.sessionRepository.refresh(refreshToken)
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
    }
  }

  /**
   * Verify access token
   * - Decodes and validates JWT
   * - Returns user if valid
   * @param accessToken - Access token
   * @returns User from database
   * @throws TokenInvalidError if token is invalid
   * @throws NotFoundError if user not found
   */
  async verifyToken(accessToken: string): Promise<User> {
    try {
      const payload = verifyAccessToken(accessToken)

      // Get user from database
      const user = await this.userRepository.findById(payload.userId)
      if (!user) {
        throw new NotFoundError('User not found')
      }

      // Check if user is suspended
      if (user.suspended) {
        throw new ForbiddenError('Your account has been suspended')
      }

      return user
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error
      }
      throw new TokenInvalidError('Invalid or expired access token')
    }
  }

  /**
   * Change password
   * - Verifies current password
   * - Hashes new password
   * - Updates password
   * - Optionally revokes all sessions
   * @param userId - User ID
   * @param currentPassword - Current password (plain text)
   * @param newPassword - New password (plain text)
   * @param revokeAllSessions - Whether to revoke all sessions (default: true)
   * @throws NotFoundError if user not found
   * @throws InvalidCredentialsError if current password is invalid
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    revokeAllSessions: boolean = true
  ): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Verify current password
    const passwordHash = user.password_hash ?? ''
    const isPasswordValid = await verifyPassword(
      currentPassword,
      passwordHash
    )
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('Current password is incorrect')
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    await this.userRepository.update(userId, {
      password_hash: hashedPassword,
    })

    // Revoke all sessions
    if (revokeAllSessions) {
      await this.revokeAllSessions(userId)
    }
  }

  /**
   * Request password reset
   * - Generates reset token
   * - TODO: Send email with reset link
   * @param email - User email
   * @returns Reset token (in production, this would be sent via email)
   * @throws NotFoundError if user not found
   */
  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim())
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Generate reset token
    const resetToken = generateRefreshToken()

    // Store in Redis with 30 minute TTL
    await this.sessionRepository.create(user.id, resetToken, 30 * 60)

    // TODO: Send email with reset link
    // For now, return the token (in production, this would be sent via email)
    return resetToken
  }

  /**
   * Reset password with token
   * - Verifies reset token
   * - Hashes new password
   * - Updates password
   * - Revokes all sessions
   * @param resetToken - Reset token
   * @param newPassword - New password (plain text)
   * @throws UnauthorizedError if reset token is invalid
   * @throws NotFoundError if user not found
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    // Verify reset token exists in Redis
    const session = await this.sessionRepository.get(resetToken)
    if (!session) {
      throw new UnauthorizedError('Invalid or expired reset token')
    }

    // Get user
    const user = await this.userRepository.findById(session.userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    await this.userRepository.update(user.id, {
      password_hash: hashedPassword,
    })

    // Delete reset token
    await this.sessionRepository.delete(resetToken)

    // Revoke all other sessions
    await this.revokeAllSessions(user.id)
  }

  /**
   * Revoke all sessions for a user
   * - Removes all sessions from Redis
   * @param userId - User ID
   * @returns Number of sessions revoked
   */
  async revokeAllSessions(userId: string): Promise<number> {
    return this.sessionRepository.deleteAllForUser(userId)
  }

  /**
   * Get active sessions for a user
   * - Returns all session tokens from Redis
   * @param userId - User ID
   * @returns Array of refresh tokens
   */
  async getActiveSessions(userId: string): Promise<string[]> {
    return this.sessionRepository.getAllForUser(userId)
  }

  /**
   * Get session count for a user
   * @param userId - User ID
   * @returns Number of active sessions
   */
  async getSessionCount(userId: string): Promise<number> {
    return this.sessionRepository.countForUser(userId)
  }
}
