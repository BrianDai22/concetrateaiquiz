import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  generateCustomToken,
  type TokenPayload,
} from '../utils/jwt'
import { USER_ROLES } from '../constants/roles'
import { TokenExpiredError, TokenInvalidError } from '../utils/errors'

describe('generateAccessToken', () => {
  beforeEach(() => {
    // Ensure JWT_SECRET is set for tests
    process.env['JWT_SECRET'] = 'test-secret-for-jwt-testing'
  })

  afterEach(() => {
    delete process.env['JWT_SECRET']
  })

  it('should generate a valid access token', () => {
    const token = generateAccessToken('user-123', USER_ROLES.TEACHER)

    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('should generate different tokens for different users', () => {
    const token1 = generateAccessToken('user-1', USER_ROLES.TEACHER)
    const token2 = generateAccessToken('user-2', USER_ROLES.TEACHER)

    expect(token1).not.toBe(token2)
  })

  it('should generate different tokens for different roles', () => {
    const token1 = generateAccessToken('user-123', USER_ROLES.TEACHER)
    const token2 = generateAccessToken('user-123', USER_ROLES.STUDENT)

    expect(token1).not.toBe(token2)
  })

  it('should generate JWT with three parts', () => {
    const token = generateAccessToken('user-123', USER_ROLES.ADMIN)

    const parts = token.split('.')
    expect(parts).toHaveLength(3)
  })

  it('should throw error for empty userId', () => {
    expect(() => generateAccessToken('', USER_ROLES.TEACHER)).toThrow(
      'userId must be a non-empty string'
    )
  })

  it('should throw error for non-string userId', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => generateAccessToken(123 as any, USER_ROLES.TEACHER)).toThrow(
      'userId must be a non-empty string'
    )
  })

  it('should throw error for empty role', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => generateAccessToken('user-123', '' as any)).toThrow(
      'role must be a non-empty string'
    )
  })

  it('should throw error for non-string role', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => generateAccessToken('user-123', 123 as any)).toThrow(
      'role must be a non-empty string'
    )
  })

  it('should work with all user roles', () => {
    const adminToken = generateAccessToken('user-1', USER_ROLES.ADMIN)
    const teacherToken = generateAccessToken('user-2', USER_ROLES.TEACHER)
    const studentToken = generateAccessToken('user-3', USER_ROLES.STUDENT)

    expect(adminToken).toBeDefined()
    expect(teacherToken).toBeDefined()
    expect(studentToken).toBeDefined()
  })
})

describe('verifyAccessToken', () => {
  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret-for-jwt-testing'
  })

  afterEach(() => {
    delete process.env['JWT_SECRET']
  })

  it('should verify a valid token', () => {
    const userId = 'user-123'
    const role = USER_ROLES.TEACHER
    const token = generateAccessToken(userId, role)

    const payload = verifyAccessToken(token)

    expect(payload).toBeDefined()
    expect(payload.userId).toBe(userId)
    expect(payload.role).toBe(role)
  })

  it('should return payload with iat and exp fields', () => {
    const token = generateAccessToken('user-123', USER_ROLES.STUDENT)
    const payload = verifyAccessToken(token)

    expect(payload.iat).toBeDefined()
    expect(payload.exp).toBeDefined()
    expect(typeof payload.iat).toBe('number')
    expect(typeof payload.exp).toBe('number')
    expect(payload.exp).toBeGreaterThan(payload.iat ?? 0)
  })

  it('should verify tokens for all user roles', () => {
    const adminToken = generateAccessToken('admin-1', USER_ROLES.ADMIN)
    const teacherToken = generateAccessToken('teacher-1', USER_ROLES.TEACHER)
    const studentToken = generateAccessToken('student-1', USER_ROLES.STUDENT)

    const adminPayload = verifyAccessToken(adminToken)
    const teacherPayload = verifyAccessToken(teacherToken)
    const studentPayload = verifyAccessToken(studentToken)

    expect(adminPayload.role).toBe(USER_ROLES.ADMIN)
    expect(teacherPayload.role).toBe(USER_ROLES.TEACHER)
    expect(studentPayload.role).toBe(USER_ROLES.STUDENT)
  })

  it('should throw TokenExpiredError for expired token', () => {
    // Generate a token that expires immediately
    const token = generateCustomToken('user-123', USER_ROLES.TEACHER, '0s')

    // Wait a bit to ensure token is expired
    const delay = new Promise((resolve) => setTimeout(resolve, 100))

    return delay.then(() => {
      expect(() => verifyAccessToken(token)).toThrow(TokenExpiredError)
      expect(() => verifyAccessToken(token)).toThrow('Token has expired')
    })
  })

  it('should throw TokenInvalidError for malformed token', () => {
    expect(() => verifyAccessToken('not.a.valid.jwt')).toThrow(TokenInvalidError)
  })

  it('should throw TokenInvalidError for empty token', () => {
    expect(() => verifyAccessToken('')).toThrow(TokenInvalidError)
    expect(() => verifyAccessToken('')).toThrow('Token must be a non-empty string')
  })

  it('should throw TokenInvalidError for non-string token', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => verifyAccessToken(123 as any)).toThrow(TokenInvalidError)
  })

  it('should throw TokenInvalidError for token with wrong signature', () => {
    const token = generateAccessToken('user-123', USER_ROLES.TEACHER)

    // Change the secret
    process.env['JWT_SECRET'] = 'different-secret'

    expect(() => verifyAccessToken(token)).toThrow(TokenInvalidError)
  })

  it('should throw TokenInvalidError for token with invalid structure', () => {
    // Only header and payload, no signature
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9'

    expect(() => verifyAccessToken(invalidToken)).toThrow(TokenInvalidError)
  })

  it('should work across multiple verifications', () => {
    const token = generateAccessToken('user-123', USER_ROLES.ADMIN)

    const payload1 = verifyAccessToken(token)
    const payload2 = verifyAccessToken(token)
    const payload3 = verifyAccessToken(token)

    expect(payload1.userId).toBe('user-123')
    expect(payload2.userId).toBe('user-123')
    expect(payload3.userId).toBe('user-123')
  })
})

describe('generateRefreshToken', () => {
  it('should generate a refresh token', () => {
    const token = generateRefreshToken()

    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('should generate hex string', () => {
    const token = generateRefreshToken()

    // Should only contain hex characters
    expect(token).toMatch(/^[0-9a-f]+$/)
  })

  it('should generate 64-character token (32 bytes as hex)', () => {
    const token = generateRefreshToken()

    expect(token.length).toBe(64)
  })

  it('should generate different tokens each time', () => {
    const token1 = generateRefreshToken()
    const token2 = generateRefreshToken()
    const token3 = generateRefreshToken()

    expect(token1).not.toBe(token2)
    expect(token2).not.toBe(token3)
    expect(token1).not.toBe(token3)
  })

  it('should generate cryptographically random tokens', () => {
    const tokens = new Set<string>()
    const iterations = 100

    for (let i = 0; i < iterations; i++) {
      tokens.add(generateRefreshToken())
    }

    // All tokens should be unique
    expect(tokens.size).toBe(iterations)
  })
})

describe('generateCustomToken', () => {
  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret-for-jwt-testing'
  })

  afterEach(() => {
    delete process.env['JWT_SECRET']
  })

  it('should generate token with custom expiry', () => {
    const token = generateCustomToken('user-123', USER_ROLES.TEACHER, '1h')

    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('should generate verifiable token', () => {
    const userId = 'user-456'
    const role = USER_ROLES.ADMIN
    const token = generateCustomToken(userId, role, '2h')

    const payload = verifyAccessToken(token)

    expect(payload.userId).toBe(userId)
    expect(payload.role).toBe(role)
  })

  it('should throw error for empty userId', () => {
    expect(() => generateCustomToken('', USER_ROLES.TEACHER, '1h')).toThrow(
      'userId must be a non-empty string'
    )
  })

  it('should throw error for empty role', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => generateCustomToken('user-123', '' as any, '1h')).toThrow(
      'role must be a non-empty string'
    )
  })

  it('should support various expiry formats', () => {
    const token1 = generateCustomToken('user-1', USER_ROLES.STUDENT, '1h')
    const token2 = generateCustomToken('user-2', USER_ROLES.STUDENT, '7d')
    const token3 = generateCustomToken('user-3', USER_ROLES.STUDENT, '60')

    expect(token1).toBeDefined()
    expect(token2).toBeDefined()
    expect(token3).toBeDefined()
  })
})

describe('JWT environment configuration', () => {
  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret-for-jwt-testing'
  })

  afterEach(() => {
    // Clean up
    delete process.env['JWT_SECRET']
  })

  it('should throw error when JWT_SECRET is not set in production', () => {
    delete process.env['JWT_SECRET']
    process.env['NODE_ENV'] = 'production'

    expect(() => generateAccessToken('user-123', USER_ROLES.TEACHER)).toThrow(
      'JWT_SECRET environment variable is not set'
    )

    delete process.env['NODE_ENV']
  })

  it('should use test secret when JWT_SECRET is not set in test environment', () => {
    delete process.env['JWT_SECRET']
    process.env['NODE_ENV'] = 'test'

    const token = generateAccessToken('user-123', USER_ROLES.TEACHER)

    expect(token).toBeDefined()

    delete process.env['NODE_ENV']
  })

  it('should throw TokenInvalidError for token with missing userId', () => {
    // Generate a token manually without userId
    const jwt = require('jsonwebtoken')
    const secret = process.env['JWT_SECRET'] ?? ''
    const tokenWithoutUserId = jwt.sign({ role: USER_ROLES.TEACHER }, secret)

    expect(() => verifyAccessToken(tokenWithoutUserId)).toThrow(TokenInvalidError)
    expect(() => verifyAccessToken(tokenWithoutUserId)).toThrow('Invalid token payload')
  })

  it('should throw TokenInvalidError for token with missing role', () => {
    // Generate a token manually without role
    const jwt = require('jsonwebtoken')
    const secret = process.env['JWT_SECRET'] ?? ''
    const tokenWithoutRole = jwt.sign({ userId: 'user-123' }, secret)

    expect(() => verifyAccessToken(tokenWithoutRole)).toThrow(TokenInvalidError)
    expect(() => verifyAccessToken(tokenWithoutRole)).toThrow('Invalid token payload')
  })

  it('should throw TokenInvalidError for token that returns string payload', () => {
    // jwt.verify can return a string if the payload is a string
    const jwt = require('jsonwebtoken')
    const secret = process.env['JWT_SECRET'] ?? ''
    const stringToken = jwt.sign('just-a-string', secret)

    expect(() => verifyAccessToken(stringToken)).toThrow(TokenInvalidError)
    expect(() => verifyAccessToken(stringToken)).toThrow('Invalid token payload')
  })

  it('should throw TokenInvalidError for unknown verification errors', () => {
    // Create a valid token first
    const token = generateAccessToken('user-123', USER_ROLES.TEACHER)

    // Mock jwt module to throw a generic error (not a JWT error)
    const jwt = require('jsonwebtoken')
    const originalVerify = jwt.verify

    // Replace verify with a function that throws a generic Error
    jwt.verify = () => {
      throw new Error('Unknown error during verification')
    }

    expect(() => verifyAccessToken(token)).toThrow(TokenInvalidError)
    expect(() => verifyAccessToken(token)).toThrow('Token verification failed')

    // Restore original implementation
    jwt.verify = originalVerify
  })

  it('should handle JsonWebTokenError without message', () => {
    // Create a valid token first
    const token = generateAccessToken('user-123', USER_ROLES.TEACHER)

    // Mock jwt module to throw JsonWebTokenError without message
    const jwt = require('jsonwebtoken')
    const originalVerify = jwt.verify

    // Create a JsonWebTokenError without a message
    jwt.verify = () => {
      const error = new jwt.JsonWebTokenError('')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(error as any).message = undefined
      throw error
    }

    expect(() => verifyAccessToken(token)).toThrow(TokenInvalidError)
    expect(() => verifyAccessToken(token)).toThrow('Invalid token: Invalid token')

    // Restore original implementation
    jwt.verify = originalVerify
  })
})

describe('token payload structure', () => {
  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret-for-jwt-testing'
  })

  afterEach(() => {
    delete process.env['JWT_SECRET']
  })

  it('should include userId in payload', () => {
    const token = generateAccessToken('user-abc', USER_ROLES.STUDENT)
    const payload = verifyAccessToken(token)

    expect(payload).toHaveProperty('userId')
    expect(payload.userId).toBe('user-abc')
  })

  it('should include role in payload', () => {
    const token = generateAccessToken('user-123', USER_ROLES.ADMIN)
    const payload = verifyAccessToken(token)

    expect(payload).toHaveProperty('role')
    expect(payload.role).toBe(USER_ROLES.ADMIN)
  })

  it('should include iat (issued at) in payload', () => {
    const token = generateAccessToken('user-123', USER_ROLES.TEACHER)
    const payload = verifyAccessToken(token)

    expect(payload).toHaveProperty('iat')
    expect(typeof payload.iat).toBe('number')
  })

  it('should include exp (expiry) in payload', () => {
    const token = generateAccessToken('user-123', USER_ROLES.TEACHER)
    const payload = verifyAccessToken(token)

    expect(payload).toHaveProperty('exp')
    expect(typeof payload.exp).toBe('number')
  })
})
