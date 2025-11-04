/**
 * JWT token generation and verification utilities
 */

import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import type { UserRole } from '../constants/roles'
import { TokenExpiredError, TokenInvalidError } from './errors'

/**
 * JWT token payload
 */
export interface TokenPayload {
  userId: string
  role: UserRole
  iat?: number
  exp?: number
}

/**
 * JWT configuration
 */
const JWT_CONFIG = {
  accessTokenExpiry: '15m', // 15 minutes
  refreshTokenExpiry: '7d', // 7 days
  algorithm: 'HS256' as const,
} as const

/**
 * Get JWT secret from environment
 * Falls back to a test secret if not set (for testing only)
 */
function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET']
  if (secret === undefined || secret.length === 0) {
    // Only use fallback in test environment
    if (process.env['NODE_ENV'] === 'test') {
      return 'test-secret-key-do-not-use-in-production'
    }
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return secret
}

/**
 * Generate an access token for a user
 *
 * @param userId - The user's ID
 * @param role - The user's role
 * @returns The signed JWT token
 *
 * @example
 * ```typescript
 * const token = generateAccessToken('user-123', 'teacher')
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * ```
 */
export function generateAccessToken(userId: string, role: UserRole): string {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('userId must be a non-empty string')
  }

  if (typeof role !== 'string' || role.length === 0) {
    throw new Error('role must be a non-empty string')
  }

  const payload: TokenPayload = {
    userId,
    role,
  }

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_CONFIG.accessTokenExpiry,
    algorithm: JWT_CONFIG.algorithm,
  })
}

/**
 * Verify and decode an access token
 *
 * @param token - The JWT token to verify
 * @returns The decoded token payload
 * @throws {TokenExpiredError} If the token has expired
 * @throws {TokenInvalidError} If the token is invalid or malformed
 *
 * @example
 * ```typescript
 * try {
 *   const payload = verifyAccessToken(token)
 *   console.log(payload.userId, payload.role)
 * } catch (error) {
 *   if (error instanceof TokenExpiredError) {
 *     console.log('Token expired')
 *   }
 * }
 * ```
 */
export function verifyAccessToken(token: string): TokenPayload {
  if (typeof token !== 'string' || token.length === 0) {
    throw new TokenInvalidError('Token must be a non-empty string')
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_CONFIG.algorithm],
    })

    // Validate the payload is an object (not a string)
    if (typeof decoded === 'string') {
      throw new TokenInvalidError('Invalid token payload')
    }

    // Validate the payload structure
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded['userId'] !== 'string' ||
      typeof decoded['role'] !== 'string'
    ) {
      throw new TokenInvalidError('Invalid token payload')
    }

    return decoded as unknown as TokenPayload
  } catch (error: unknown) {
    if (error instanceof TokenExpiredError || error instanceof TokenInvalidError) {
      throw error
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError('Token has expired')
    }

    if (error instanceof jwt.JsonWebTokenError) {
      const message = error.message ?? 'Invalid token'
      throw new TokenInvalidError(`Invalid token: ${message}`)
    }

    // Unknown error
    throw new TokenInvalidError('Token verification failed')
  }
}

/**
 * Generate a refresh token
 *
 * Refresh tokens are opaque random strings, not JWTs.
 * They should be stored in the database and associated with a user session.
 *
 * @returns A random hex string to use as a refresh token
 *
 * @example
 * ```typescript
 * const refreshToken = generateRefreshToken()
 * // Returns: "a1b2c3d4e5f6..."
 * ```
 */
export function generateRefreshToken(): string {
  // Generate 32 random bytes (256 bits) as hex string
  return randomBytes(32).toString('hex')
}

/**
 * Generate a JWT token with custom expiry
 * Used internally for testing or special cases
 *
 * @param userId - The user's ID
 * @param role - The user's role
 * @param expiresIn - Token expiry (e.g., '1h', '7d')
 * @returns The signed JWT token
 */
export function generateCustomToken(
  userId: string,
  role: UserRole,
  expiresIn: string
): string {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('userId must be a non-empty string')
  }

  if (typeof role !== 'string' || role.length === 0) {
    throw new Error('role must be a non-empty string')
  }

  const payload: TokenPayload = {
    userId,
    role,
  }

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
    algorithm: JWT_CONFIG.algorithm,
  })
}
