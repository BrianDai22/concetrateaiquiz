import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../../src/AuthService'
import type { UserRepository } from '@concentrate/database'
import type { SessionRepository } from '@concentrate/database'
import type { User } from '@concentrate/database'
import {
  AlreadyExistsError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  InvalidCredentialsError,
} from '@concentrate/shared'

// Mock crypto and JWT utilities
vi.mock('@concentrate/shared', async () => {
  const actual = await vi.importActual('@concentrate/shared')
  return {
    ...actual,
    hashPassword: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
    verifyPassword: vi.fn((password: string, hash: string) =>
      Promise.resolve(hash === `hashed_${password}`)
    ),
    generateAccessToken: vi.fn((userId: string, role: string) => `access_${userId}_${role}`),
    generateRefreshToken: vi.fn(() => `refresh_token_${Date.now()}`),
    verifyAccessToken: vi.fn((token: string) => {
      if (token.startsWith('access_')) {
        const parts = token.split('_')
        return { userId: parts[1], role: parts[2] }
      }
      throw new Error('Invalid token')
    }),
  }
})

describe('AuthService - Unit Tests', () => {
  let service: AuthService
  let mockUserRepository: Partial<UserRepository>
  let mockSessionRepository: Partial<SessionRepository>
  let mockDb: unknown

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed_password123',
    name: 'Test User',
    role: 'student',
    suspended: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock repositories
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }

    mockSessionRepository = {
      create: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      refresh: vi.fn(),
      deleteAllForUser: vi.fn(),
      getAllForUser: vi.fn(),
      countForUser: vi.fn(),
    }

    // Create service instance
    mockDb = {} as unknown
    service = new AuthService(mockDb as never)

    // Inject mocks
    ;(service as unknown as { userRepository: Partial<UserRepository> }).userRepository =
      mockUserRepository
    ;(service as unknown as { sessionRepository: Partial<SessionRepository> }).sessionRepository =
      mockSessionRepository
  })

  // ===========================================
  // register() Tests
  // ===========================================
  describe('register', () => {
    it('should register a new user with hashed password', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue({
        ...mockUser,
        email: 'newuser@example.com',
        password_hash: 'hashed_newpassword',
      })

      const result = await service.register({
        email: 'newuser@example.com',
        password_hash: 'newpassword',
        name: 'New User',
        role: 'student',
      })

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com')
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          password_hash: 'hashed_newpassword',
        })
      )
      expect(result.email).toBe('newuser@example.com')
    })

    it('should throw AlreadyExistsError if email already exists', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)

      await expect(
        service.register({
          email: 'existing@example.com',
          password_hash: 'password',
          name: 'User',
          role: 'student',
        })
      ).rejects.toThrow(AlreadyExistsError)

      expect(mockUserRepository.create).not.toHaveBeenCalled()
    })

    it('should register OAuth user with null password', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue({
        ...mockUser,
        email: 'oauth@example.com',
        password_hash: null,
      })

      const result = await service.register({
        email: 'oauth@example.com',
        password_hash: null,
        name: 'OAuth User',
        role: 'student',
      })

      expect(result.password_hash).toBeNull()
    })

    it('should create user with provided email (no normalization in AuthService)', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue({
        ...mockUser,
        email: 'NORMALIZED@EXAMPLE.COM',
      })

      await service.register({
        email: 'NORMALIZED@EXAMPLE.COM',
        password_hash: 'password',
        name: 'User',
        role: 'student',
      })

      // AuthService doesn't normalize - it passes email as-is
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('NORMALIZED@EXAMPLE.COM')
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'NORMALIZED@EXAMPLE.COM',
        })
      )
    })

    it('should not hash password if it is null', async () => {
      const { hashPassword } = await import('@concentrate/shared')

      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: null,
      })

      await service.register({
        email: 'oauth@example.com',
        password_hash: null,
        name: 'OAuth User',
        role: 'student',
      })

      expect(hashPassword).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // login() Tests
  // ===========================================
  describe('login', () => {
    it('should login successfully and return tokens + user', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)
      mockSessionRepository.create = vi.fn().mockResolvedValue(undefined)

      const result = await service.login('test@example.com', 'password123')

      expect(result.tokens.accessToken).toBe('access_user-123_student')
      expect(result.tokens.refreshToken).toContain('refresh_token_')
      expect(result.user).toEqual(mockUser)
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('refresh_token_')
      )
    })

    it('should throw InvalidCredentialsError for non-existent user', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)

      await expect(service.login('nonexistent@example.com', 'password')).rejects.toThrow(
        InvalidCredentialsError
      )
    })

    it('should throw InvalidCredentialsError for wrong password', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)

      await expect(service.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        InvalidCredentialsError
      )
    })

    it('should throw ForbiddenError for suspended user', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue({
        ...mockUser,
        suspended: true,
      })

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
        ForbiddenError
      )
    })

    it('should create session in Redis on successful login', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)
      mockSessionRepository.create = vi.fn().mockResolvedValue(undefined)

      await service.login('test@example.com', 'password123')

      expect(mockSessionRepository.create).toHaveBeenCalled()
      const createCall = (mockSessionRepository.create as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(createCall[0]).toBe('user-123')
      expect(createCall[1]).toContain('refresh_token_')
    })

    it('should normalize email before login', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)
      mockSessionRepository.create = vi.fn().mockResolvedValue(undefined)

      await service.login('TEST@EXAMPLE.COM', 'password123')

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
    })

    it('should throw InvalidCredentialsError for OAuth user (null password) login attempt', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: null,
      })

      await expect(service.login('test@example.com', 'anypassword')).rejects.toThrow(
        InvalidCredentialsError
      )
    })

    it('should generate correct token format', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)
      mockSessionRepository.create = vi.fn().mockResolvedValue(undefined)

      const result = await service.login('test@example.com', 'password123')

      expect(result.tokens.accessToken).toMatch(/^access_/)
      expect(result.tokens.refreshToken).toMatch(/^refresh_token_/)
    })
  })

  // ===========================================
  // logout() Tests
  // ===========================================
  describe('logout', () => {
    it('should delete session from Redis', async () => {
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)

      await service.logout('refresh_token_123')

      expect(mockSessionRepository.delete).toHaveBeenCalledWith('refresh_token_123')
    })

    it('should handle non-existent token gracefully', async () => {
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)

      await expect(service.logout('nonexistent_token')).resolves.not.toThrow()
    })
  })

  // ===========================================
  // refreshAccessToken() Tests
  // ===========================================
  describe('refreshAccessToken', () => {
    it('should return new access token for valid refresh token', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockSessionRepository.refresh = vi.fn().mockResolvedValue(undefined)

      const result = await service.refreshAccessToken('refresh_token_123', false)

      expect(result.accessToken).toBe('access_user-123_student')
      expect(result.refreshToken).toBe('refresh_token_123')
      expect(mockSessionRepository.refresh).toHaveBeenCalledWith('refresh_token_123')
    })

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue(null)

      await expect(service.refreshAccessToken('invalid_token', false)).rejects.toThrow(
        UnauthorizedError
      )
    })

    it('should throw UnauthorizedError if user not found', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue(null)
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)

      await expect(service.refreshAccessToken('refresh_token_123', false)).rejects.toThrow(
        UnauthorizedError
      )
      expect(mockSessionRepository.delete).toHaveBeenCalledWith('refresh_token_123')
    })

    it('should throw ForbiddenError if user is suspended', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue({
        ...mockUser,
        suspended: true,
      })
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)

      await expect(service.refreshAccessToken('refresh_token_123', false)).rejects.toThrow(
        ForbiddenError
      )
      expect(mockSessionRepository.delete).toHaveBeenCalledWith('refresh_token_123')
    })

    it('should rotate refresh token when rotate=true', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)
      mockSessionRepository.create = vi.fn().mockResolvedValue(undefined)

      const result = await service.refreshAccessToken('old_refresh_token', true)

      expect(result.refreshToken).not.toBe('old_refresh_token')
      expect(result.refreshToken).toContain('refresh_token_')
      expect(mockSessionRepository.delete).toHaveBeenCalledWith('old_refresh_token')
      expect(mockSessionRepository.create).toHaveBeenCalled()
    })

    it('should not rotate refresh token when rotate=false', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockSessionRepository.refresh = vi.fn().mockResolvedValue(undefined)

      const result = await service.refreshAccessToken('refresh_token_123', false)

      expect(result.refreshToken).toBe('refresh_token_123')
      expect(mockSessionRepository.delete).not.toHaveBeenCalled()
      expect(mockSessionRepository.create).not.toHaveBeenCalled()
    })

    it('should extend TTL when not rotating', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockSessionRepository.refresh = vi.fn().mockResolvedValue(undefined)

      await service.refreshAccessToken('refresh_token_123', false)

      expect(mockSessionRepository.refresh).toHaveBeenCalledWith('refresh_token_123')
    })

    it('should not clean up session on database errors (error propagation)', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockRejectedValue(new Error('DB error'))
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)

      // On database errors, the service lets the error propagate without cleanup
      await expect(service.refreshAccessToken('refresh_token_123', false)).rejects.toThrow('DB error')
      expect(mockSessionRepository.delete).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // verifyToken() Tests
  // ===========================================
  describe('verifyToken', () => {
    it('should return user for valid token', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)

      const result = await service.verifyToken('access_user-123_student')

      expect(result).toEqual(mockUser)
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123')
    })

    it('should throw error for invalid token signature', async () => {
      const { verifyAccessToken } = await import('@concentrate/shared')
      ;(verifyAccessToken as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await expect(service.verifyToken('invalid_token')).rejects.toThrow()
    })

    it('should throw NotFoundError if user not found', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.verifyToken('access_user-123_student')).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError if user is suspended', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue({
        ...mockUser,
        suspended: true,
      })

      await expect(service.verifyToken('access_user-123_student')).rejects.toThrow(ForbiddenError)
    })
  })

  // ===========================================
  // changePassword() Tests
  // ===========================================
  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: 'hashed_newpassword',
      })
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(undefined)

      await service.changePassword('user-123', 'password123', 'newpassword', true)

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', {
        password_hash: 'hashed_newpassword',
      })
      expect(mockSessionRepository.deleteAllForUser).toHaveBeenCalledWith('user-123')
    })

    it('should throw InvalidCredentialsError for wrong current password', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)

      await expect(
        service.changePassword('user-123', 'wrongpassword', 'newpassword', true)
      ).rejects.toThrow(InvalidCredentialsError)
    })

    it('should throw NotFoundError for non-existent user', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.changePassword('user-999', 'password123', 'newpassword', true)
      ).rejects.toThrow(NotFoundError)
    })

    it('should revoke all sessions by default', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: 'hashed_newpassword',
      })
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(undefined)

      await service.changePassword('user-123', 'password123', 'newpassword', true)

      expect(mockSessionRepository.deleteAllForUser).toHaveBeenCalledWith('user-123')
    })

    it('should not revoke sessions when revokeAllSessions=false', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: 'hashed_newpassword',
      })
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(undefined)

      await service.changePassword('user-123', 'password123', 'newpassword', false)

      expect(mockSessionRepository.deleteAllForUser).not.toHaveBeenCalled()
    })

    it('should throw error for OAuth user (null password)', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: null,
      })

      await expect(
        service.changePassword('user-123', 'anypassword', 'newpassword', true)
      ).rejects.toThrow(InvalidCredentialsError)
    })

    it('should hash new password correctly', async () => {
      const { hashPassword } = await import('@concentrate/shared')

      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: 'hashed_newpassword',
      })
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(undefined)

      await service.changePassword('user-123', 'password123', 'newpassword', true)

      expect(hashPassword).toHaveBeenCalledWith('newpassword')
    })
  })

  // ===========================================
  // requestPasswordReset() Tests
  // ===========================================
  describe('requestPasswordReset', () => {
    it('should generate reset token for valid email', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        // Would have reset token fields
      })

      const token = await service.requestPasswordReset('test@example.com')

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
    })

    it('should throw NotFoundError for non-existent email', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)

      await expect(service.requestPasswordReset('nonexistent@example.com')).rejects.toThrow(
        NotFoundError
      )
    })

    it('should normalize email before lookup', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue(mockUser)

      await service.requestPasswordReset('TEST@EXAMPLE.COM')

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
    })
  })

  // ===========================================
  // resetPassword() Tests
  // ===========================================
  describe('resetPassword', () => {
    const validResetToken = 'valid_reset_token_123'

    it('should reset password with valid token', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: 'hashed_newpassword',
      })
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(undefined)

      await service.resetPassword(validResetToken, 'newpassword')

      expect(mockSessionRepository.get).toHaveBeenCalledWith(validResetToken)
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', {
        password_hash: 'hashed_newpassword',
      })
      expect(mockSessionRepository.delete).toHaveBeenCalledWith(validResetToken)
      expect(mockSessionRepository.deleteAllForUser).toHaveBeenCalledWith('user-123')
    })

    it('should throw UnauthorizedError for invalid token', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue(null)

      await expect(service.resetPassword('invalid_token', 'newpassword')).rejects.toThrow(
        UnauthorizedError
      )
    })

    it('should throw UnauthorizedError for expired token (not in Redis)', async () => {
      // If token is not in Redis, it's expired (TTL elapsed)
      mockSessionRepository.get = vi.fn().mockResolvedValue(null)

      await expect(service.resetPassword('expired_token', 'newpassword')).rejects.toThrow(
        UnauthorizedError
      )
    })

    it('should revoke all sessions after reset', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: 'hashed_newpassword',
      })
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(undefined)

      await service.resetPassword(validResetToken, 'newpassword')

      expect(mockSessionRepository.deleteAllForUser).toHaveBeenCalledWith('user-123')
    })

    it('should clear reset token after use', async () => {
      mockSessionRepository.get = vi.fn().mockResolvedValue({ userId: 'user-123' })
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: 'hashed_newpassword',
      })
      mockSessionRepository.delete = vi.fn().mockResolvedValue(undefined)
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(undefined)

      await service.resetPassword(validResetToken, 'newpassword')

      // Reset token should be deleted from Redis
      expect(mockSessionRepository.delete).toHaveBeenCalledWith(validResetToken)
    })
  })

  // ===========================================
  // revokeAllSessions() Tests
  // ===========================================
  describe('revokeAllSessions', () => {
    it('should delete all sessions for user', async () => {
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(5)

      const count = await service.revokeAllSessions('user-123')

      expect(count).toBe(5)
      expect(mockSessionRepository.deleteAllForUser).toHaveBeenCalledWith('user-123')
    })

    it('should return 0 when no sessions exist', async () => {
      mockSessionRepository.deleteAllForUser = vi.fn().mockResolvedValue(0)

      const count = await service.revokeAllSessions('user-123')

      expect(count).toBe(0)
    })
  })

  // ===========================================
  // getActiveSessions() Tests
  // ===========================================
  describe('getActiveSessions', () => {
    it('should return all session tokens for user', async () => {
      mockSessionRepository.getAllForUser = vi.fn().mockResolvedValue([
        'token1',
        'token2',
        'token3',
      ])

      const sessions = await service.getActiveSessions('user-123')

      expect(sessions).toEqual(['token1', 'token2', 'token3'])
      expect(mockSessionRepository.getAllForUser).toHaveBeenCalledWith('user-123')
    })

    it('should return empty array when no sessions', async () => {
      mockSessionRepository.getAllForUser = vi.fn().mockResolvedValue([])

      const sessions = await service.getActiveSessions('user-123')

      expect(sessions).toEqual([])
    })
  })

  // ===========================================
  // getSessionCount() Tests
  // ===========================================
  describe('getSessionCount', () => {
    it('should return correct session count', async () => {
      mockSessionRepository.countForUser = vi.fn().mockResolvedValue(3)

      const count = await service.getSessionCount('user-123')

      expect(count).toBe(3)
      expect(mockSessionRepository.countForUser).toHaveBeenCalledWith('user-123')
    })

    it('should return 0 when no sessions', async () => {
      mockSessionRepository.countForUser = vi.fn().mockResolvedValue(0)

      const count = await service.getSessionCount('user-123')

      expect(count).toBe(0)
    })
  })
})
