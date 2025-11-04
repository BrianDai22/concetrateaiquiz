import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuthService } from '../../src/AuthService'
import {
  db,
  clearAllTables,
  createTestUser,
  clearRedis,
  redisTest,
} from '@concentrate/database'
import { verifyPassword, verifyAccessToken } from '@concentrate/shared'
import type { NewUser } from '@concentrate/database'
import {
  AlreadyExistsError,
  InvalidCredentialsError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '@concentrate/shared'

describe('AuthService - Integration Tests', () => {
  let service: AuthService

  beforeEach(async () => {
    await clearAllTables(db)
    await clearRedis()
    service = new AuthService(db)
  })

  afterEach(async () => {
    await clearAllTables(db)
    await clearRedis()
  })

  // ===========================================
  // Registration Tests
  // ===========================================
  describe('Registration', () => {
    it('should register user with real bcrypt hashing', async () => {
      const newUser: NewUser = {
        email: 'newuser@example.com',
        password_hash: 'MySecurePassword123!',
        name: 'New User',
        role: 'student',
      }

      const user = await service.register(newUser)

      expect(user.id).toBeDefined()
      expect(user.email).toBe('newuser@example.com')
      expect(user.password_hash).not.toBe('MySecurePassword123!')
      expect(user.password_hash).toBeDefined()

      // Verify password was actually hashed with bcrypt
      const isValid = await verifyPassword('MySecurePassword123!', user.password_hash!)
      expect(isValid).toBe(true)
    })

    it('should enforce unique email constraint in database', async () => {
      await service.register({
        email: 'duplicate@example.com',
        password_hash: 'password1',
        name: 'User 1',
        role: 'student',
      })

      await expect(
        service.register({
          email: 'duplicate@example.com',
          password_hash: 'password2',
          name: 'User 2',
          role: 'teacher',
        })
      ).rejects.toThrow(AlreadyExistsError)
    })

    it('should register OAuth user with null password', async () => {
      const oauthUser = await service.register({
        email: 'oauth@example.com',
        password_hash: null,
        name: 'OAuth User',
        role: 'student',
      })

      expect(oauthUser.password_hash).toBeNull()
    })
  })

  // ===========================================
  // Login Tests
  // ===========================================
  describe('Login', () => {
    beforeEach(async () => {
      // Create test user with known password
      await createTestUser(db, {
        email: 'login@example.com',
        password: 'TestPassword123',
        role: 'student',
      })
    })

    it('should login successfully with correct credentials', async () => {
      const result = await service.login('login@example.com', 'TestPassword123')

      expect(result.tokens.accessToken).toBeDefined()
      expect(result.tokens.refreshToken).toBeDefined()
      expect(result.user.email).toBe('login@example.com')
    })

    it('should create session in Redis on successful login', async () => {
      const result = await service.login('login@example.com', 'TestPassword123')

      // Check Redis for session
      const sessionKey = `session:${result.tokens.refreshToken}`
      const storedUserId = await redisTest.get(sessionKey)

      expect(storedUserId).toBe(result.user.id)
    })

    it('should generate valid JWT access token', async () => {
      const result = await service.login('login@example.com', 'TestPassword123')

      // Verify JWT token structure and content
      const decoded = verifyAccessToken(result.tokens.accessToken)
      expect(decoded.userId).toBe(result.user.id)
      expect(decoded.role).toBe('student')
    })

    it('should reject login with wrong password', async () => {
      await expect(
        service.login('login@example.com', 'WrongPassword')
      ).rejects.toThrow(InvalidCredentialsError)
    })

    it('should reject login with non-existent email', async () => {
      await expect(
        service.login('nonexistent@example.com', 'password')
      ).rejects.toThrow(InvalidCredentialsError)
    })

    it('should reject login for suspended user', async () => {
      // Suspend the user
      await db
        .updateTable('users')
        .set({ suspended: true })
        .where('email', '=', 'login@example.com')
        .execute()

      await expect(
        service.login('login@example.com', 'TestPassword123')
      ).rejects.toThrow(ForbiddenError)
    })

    it('should handle case-insensitive email login', async () => {
      const result = await service.login('LOGIN@EXAMPLE.COM', 'TestPassword123')

      expect(result.user.email).toBe('login@example.com')
    })
  })

  // ===========================================
  // Logout Tests
  // ===========================================
  describe('Logout', () => {
    it('should remove session from Redis', async () => {
      const user = await createTestUser(db, {
        email: 'logout@example.com',
        password: 'password',
      })

      const { tokens } = await service.login('logout@example.com', 'password')

      // Verify session exists
      const sessionKey = `session:${tokens.refreshToken}`
      let storedUserId = await redisTest.get(sessionKey)
      expect(storedUserId).toBe(user.id)

      // Logout
      await service.logout(tokens.refreshToken)

      // Verify session deleted
      storedUserId = await redisTest.get(sessionKey)
      expect(storedUserId).toBeNull()
    })
  })

  // ===========================================
  // Token Refresh Tests
  // ===========================================
  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      await createTestUser(db, {
        email: 'refresh@example.com',
        password: 'password',
      })

      const loginResult = await service.login('refresh@example.com', 'password')

      const refreshResult = await service.refreshAccessToken(
        loginResult.tokens.refreshToken,
        false
      )

      // Should get a valid access token
      expect(refreshResult.accessToken).toBeDefined()

      // Should verify successfully
      const decoded = verifyAccessToken(refreshResult.accessToken)
      expect(decoded.userId).toBe(loginResult.user.id)

      // Refresh token should remain the same (not rotated)
      expect(refreshResult.refreshToken).toBe(loginResult.tokens.refreshToken)
    })

    it('should rotate refresh token when requested', async () => {
      await createTestUser(db, {
        email: 'rotate@example.com',
        password: 'password',
      })

      const loginResult = await service.login('rotate@example.com', 'password')
      const oldRefreshToken = loginResult.tokens.refreshToken

      const refreshResult = await service.refreshAccessToken(oldRefreshToken, true)

      expect(refreshResult.refreshToken).not.toBe(oldRefreshToken)

      // Old token should be deleted from Redis
      const oldSessionKey = `session:${oldRefreshToken}`
      const oldSession = await redisTest.get(oldSessionKey)
      expect(oldSession).toBeNull()

      // New token should exist in Redis
      const newSessionKey = `session:${refreshResult.refreshToken}`
      const newSession = await redisTest.get(newSessionKey)
      expect(newSession).toBeDefined()
    })

    it('should reject refresh with invalid token', async () => {
      await expect(
        service.refreshAccessToken('invalid_refresh_token', false)
      ).rejects.toThrow(UnauthorizedError)
    })

    it('should reject refresh if user was deleted', async () => {
      const user = await createTestUser(db, {
        email: 'deleted@example.com',
        password: 'password',
      })

      const { tokens } = await service.login('deleted@example.com', 'password')

      // Delete user
      await db.deleteFrom('users').where('id', '=', user.id).execute()

      await expect(
        service.refreshAccessToken(tokens.refreshToken, false)
      ).rejects.toThrow(UnauthorizedError)

      // Session should be cleaned up
      const sessionKey = `session:${tokens.refreshToken}`
      const session = await redisTest.get(sessionKey)
      expect(session).toBeNull()
    })

    it('should reject refresh if user was suspended', async () => {
      const user = await createTestUser(db, {
        email: 'suspended@example.com',
        password: 'password',
      })

      const { tokens } = await service.login('suspended@example.com', 'password')

      // Suspend user
      await db.updateTable('users').set({ suspended: true }).where('id', '=', user.id).execute()

      await expect(
        service.refreshAccessToken(tokens.refreshToken, false)
      ).rejects.toThrow(ForbiddenError)

      // Session should be cleaned up
      const sessionKey = `session:${tokens.refreshToken}`
      const session = await redisTest.get(sessionKey)
      expect(session).toBeNull()
    })
  })

  // ===========================================
  // Token Verification Tests
  // ===========================================
  describe('Token Verification', () => {
    it('should verify valid access token', async () => {
      await createTestUser(db, {
        email: 'verify@example.com',
        password: 'password',
      })

      const { tokens, user: loginUser } = await service.login('verify@example.com', 'password')

      const verifiedUser = await service.verifyToken(tokens.accessToken)

      expect(verifiedUser.id).toBe(loginUser.id)
      expect(verifiedUser.email).toBe(loginUser.email)
    })

    it('should reject verification for suspended user', async () => {
      const user = await createTestUser(db, {
        email: 'verify-suspended@example.com',
        password: 'password',
      })

      const { tokens } = await service.login('verify-suspended@example.com', 'password')

      // Suspend user
      await db.updateTable('users').set({ suspended: true }).where('id', '=', user.id).execute()

      await expect(service.verifyToken(tokens.accessToken)).rejects.toThrow(ForbiddenError)
    })

    it('should reject verification for deleted user', async () => {
      const user = await createTestUser(db, {
        email: 'verify-deleted@example.com',
        password: 'password',
      })

      const { tokens } = await service.login('verify-deleted@example.com', 'password')

      // Delete user
      await db.deleteFrom('users').where('id', '=', user.id).execute()

      await expect(service.verifyToken(tokens.accessToken)).rejects.toThrow(NotFoundError)
    })
  })

  // ===========================================
  // Password Change Tests
  // ===========================================
  describe('Password Change', () => {
    it('should change password with real bcrypt hashing', async () => {
      const user = await createTestUser(db, {
        email: 'change@example.com',
        password: 'OldPassword123',
      })

      await service.changePassword(user.id, 'OldPassword123', 'NewPassword456', true)

      // Fetch user from DB
      const updatedUser = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', user.id)
        .executeTakeFirstOrThrow()

      // New password should be hashed
      expect(updatedUser.password_hash).not.toBe('NewPassword456')

      // Should be able to login with new password
      const loginResult = await service.login('change@example.com', 'NewPassword456')
      expect(loginResult.user.id).toBe(user.id)

      // Should not be able to login with old password
      await expect(service.login('change@example.com', 'OldPassword123')).rejects.toThrow(
        InvalidCredentialsError
      )
    })

    it('should revoke all sessions when changing password', async () => {
      const user = await createTestUser(db, {
        email: 'revoke@example.com',
        password: 'password',
      })

      // Create multiple sessions
      const session1 = await service.login('revoke@example.com', 'password')
      const session2 = await service.login('revoke@example.com', 'password')
      const session3 = await service.login('revoke@example.com', 'password')

      // Change password with session revocation
      await service.changePassword(user.id, 'password', 'newpassword', true)

      // All sessions should be deleted
      const sessionKey1 = `session:${session1.tokens.refreshToken}`
      const sessionKey2 = `session:${session2.tokens.refreshToken}`
      const sessionKey3 = `session:${session3.tokens.refreshToken}`

      const stored1 = await redisTest.get(sessionKey1)
      const stored2 = await redisTest.get(sessionKey2)
      const stored3 = await redisTest.get(sessionKey3)

      expect(stored1).toBeNull()
      expect(stored2).toBeNull()
      expect(stored3).toBeNull()
    })

    it('should reject password change with wrong current password', async () => {
      const user = await createTestUser(db, {
        email: 'wrong@example.com',
        password: 'CorrectPassword',
      })

      await expect(
        service.changePassword(user.id, 'WrongPassword', 'NewPassword', true)
      ).rejects.toThrow(InvalidCredentialsError)
    })
  })

  // ===========================================
  // Session Management Tests
  // ===========================================
  describe('Session Management', () => {
    it('should track multiple active sessions per user', async () => {
      const user = await createTestUser(db, {
        email: 'multi-session@example.com',
        password: 'password',
      })

      // Create 3 sessions
      await service.login('multi-session@example.com', 'password')
      await service.login('multi-session@example.com', 'password')
      await service.login('multi-session@example.com', 'password')

      const sessions = await service.getActiveSessions(user.id)
      expect(sessions.length).toBe(3)
    })

    it('should count active sessions correctly', async () => {
      const user = await createTestUser(db, {
        email: 'count-session@example.com',
        password: 'password',
      })

      expect(await service.getSessionCount(user.id)).toBe(0)

      await service.login('count-session@example.com', 'password')
      expect(await service.getSessionCount(user.id)).toBe(1)

      await service.login('count-session@example.com', 'password')
      await service.login('count-session@example.com', 'password')
      expect(await service.getSessionCount(user.id)).toBe(3)
    })

    it('should revoke all sessions for user', async () => {
      const user = await createTestUser(db, {
        email: 'revoke-all@example.com',
        password: 'password',
      })

      await service.login('revoke-all@example.com', 'password')
      await service.login('revoke-all@example.com', 'password')
      await service.login('revoke-all@example.com', 'password')

      expect(await service.getSessionCount(user.id)).toBe(3)

      const revokedCount = await service.revokeAllSessions(user.id)
      expect(revokedCount).toBe(3)

      expect(await service.getSessionCount(user.id)).toBe(0)
    })
  })

  // ===========================================
  // Complete Authentication Flow Tests
  // ===========================================
  describe('Complete Authentication Flows', () => {
    it('should handle complete registration -> login -> refresh -> logout flow', async () => {
      // Register
      const registeredUser = await service.register({
        email: 'flow@example.com',
        password_hash: 'MyPassword123',
        name: 'Flow User',
        role: 'student',
      })

      expect(registeredUser.id).toBeDefined()

      // Login
      const loginResult = await service.login('flow@example.com', 'MyPassword123')
      expect(loginResult.tokens.accessToken).toBeDefined()
      expect(loginResult.tokens.refreshToken).toBeDefined()

      // Verify token
      const verifiedUser = await service.verifyToken(loginResult.tokens.accessToken)
      expect(verifiedUser.id).toBe(registeredUser.id)

      // Refresh token
      const refreshResult = await service.refreshAccessToken(
        loginResult.tokens.refreshToken,
        false
      )
      expect(refreshResult.accessToken).toBeDefined()

      // Logout
      await service.logout(refreshResult.refreshToken)

      // Session should be deleted
      const sessionKey = `session:${refreshResult.refreshToken}`
      const session = await redisTest.get(sessionKey)
      expect(session).toBeNull()
    })

    it('should handle login from multiple devices (sessions)', async () => {
      await service.register({
        email: 'devices@example.com',
        password_hash: 'password',
        name: 'Multi Device User',
        role: 'student',
      })

      // Login from device 1
      const device1 = await service.login('devices@example.com', 'password')

      // Login from device 2
      const device2 = await service.login('devices@example.com', 'password')

      // Login from device 3
      const device3 = await service.login('devices@example.com', 'password')

      // All sessions should be active
      const sessions = await service.getActiveSessions(device1.user.id)
      expect(sessions).toContain(device1.tokens.refreshToken)
      expect(sessions).toContain(device2.tokens.refreshToken)
      expect(sessions).toContain(device3.tokens.refreshToken)

      // Logout from device 2
      await service.logout(device2.tokens.refreshToken)

      // Device 1 and 3 should still be active
      const remainingSessions = await service.getActiveSessions(device1.user.id)
      expect(remainingSessions).toContain(device1.tokens.refreshToken)
      expect(remainingSessions).toContain(device3.tokens.refreshToken)
      expect(remainingSessions).not.toContain(device2.tokens.refreshToken)
    })

    it('should handle concurrent logins from same user', async () => {
      await service.register({
        email: 'concurrent@example.com',
        password_hash: 'password',
        name: 'Concurrent User',
        role: 'student',
      })

      // Simulate concurrent logins
      const loginPromises = [
        service.login('concurrent@example.com', 'password'),
        service.login('concurrent@example.com', 'password'),
        service.login('concurrent@example.com', 'password'),
        service.login('concurrent@example.com', 'password'),
        service.login('concurrent@example.com', 'password'),
      ]

      const results = await Promise.all(loginPromises)

      // All logins should succeed
      expect(results.length).toBe(5)

      // All tokens should be unique
      const refreshTokens = results.map(r => r.tokens.refreshToken)
      const uniqueTokens = new Set(refreshTokens)
      expect(uniqueTokens.size).toBe(5)

      // All sessions should exist in Redis
      const sessionCount = await service.getSessionCount(results[0].user.id)
      expect(sessionCount).toBe(5)
    })
  })
})
