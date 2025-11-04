/**
 * Password hashing utilities using PBKDF2
 */

import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const pbkdf2Async = promisify(pbkdf2)

/**
 * Configuration for PBKDF2 hashing
 */
const PBKDF2_CONFIG = {
  iterations: 100000,
  keyLength: 64,
  digest: 'sha512',
  saltLength: 32,
} as const

/**
 * Hash a password using PBKDF2
 *
 * @param password - The plain text password to hash
 * @returns Promise resolving to the hashed password in format: salt:hash (hex-encoded)
 *
 * @example
 * ```typescript
 * const hashedPassword = await hashPassword('mySecurePassword123')
 * // Returns: "a1b2c3d4...f8:e9d8c7b6...a5"
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  // Input validation
  if (typeof password !== 'string') {
    throw new TypeError('Password must be a string')
  }

  if (password.length === 0) {
    throw new Error('Password cannot be empty')
  }

  // Generate a random salt
  const salt = randomBytes(PBKDF2_CONFIG.saltLength)

  // Hash the password with the salt
  const hash = await pbkdf2Async(
    password,
    salt,
    PBKDF2_CONFIG.iterations,
    PBKDF2_CONFIG.keyLength,
    PBKDF2_CONFIG.digest
  )

  // Return salt and hash as hex strings separated by colon
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

/**
 * Verify a password against a hash
 *
 * @param password - The plain text password to verify
 * @param storedHash - The stored hash in format: salt:hash (hex-encoded)
 * @returns Promise resolving to true if password matches, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await verifyPassword('myPassword', storedHash)
 * if (isValid) {
 *   console.log('Password is correct')
 * }
 * ```
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  // Input validation
  if (typeof password !== 'string') {
    throw new TypeError('Password must be a string')
  }

  if (typeof storedHash !== 'string') {
    throw new TypeError('Stored hash must be a string')
  }

  if (password.length === 0) {
    throw new Error('Password cannot be empty')
  }

  // Parse the stored hash
  const parts = storedHash.split(':')
  if (parts.length !== 2) {
    throw new Error('Invalid hash format')
  }

  const [saltHex, hashHex] = parts

  if (
    saltHex === undefined ||
    hashHex === undefined ||
    saltHex.length === 0 ||
    hashHex.length === 0
  ) {
    throw new Error('Invalid hash format')
  }

  // Convert hex strings to buffers
  const salt = Buffer.from(saltHex, 'hex')
  const storedHashBuffer = Buffer.from(hashHex, 'hex')

  // Hash the provided password with the stored salt
  const hash = await pbkdf2Async(
    password,
    salt,
    PBKDF2_CONFIG.iterations,
    PBKDF2_CONFIG.keyLength,
    PBKDF2_CONFIG.digest
  )

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(hash, storedHashBuffer)
}
