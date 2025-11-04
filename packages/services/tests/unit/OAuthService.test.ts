import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OAuthService, type GoogleProfile } from '../../src/OAuthService'
import type { UserRepository, OAuthAccountRepository } from '@concentrate/database'
import type { User, OAuthAccount } from '@concentrate/database'
import {
  AlreadyExistsError,
  NotFoundError,
  InvalidCredentialsError,
} from '@concentrate/shared'

// Mock utilities
vi.mock('@concentrate/shared', async () => {
  const actual = await vi.importActual('@concentrate/shared')
  return {
    ...actual,
    generateAccessToken: vi.fn((userId: string, role: string) => `access_${userId}_${role}`),
    generateRefreshToken: vi.fn(() => `refresh_token_${Date.now()}`),
  }
})

describe('OAuthService - Unit Tests', () => {
  let service: OAuthService
  let mockUserRepository: Partial<UserRepository>
  let mockOAuthAccountRepository: Partial<OAuthAccountRepository>
  let mockDb: unknown

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: null,
    name: 'Test User',
    role: 'student',
    suspended: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockUserWithPassword: User = {
    ...mockUser,
    id: 'user-with-password',
    email: 'withpassword@example.com',
    password_hash: 'hashed_password',
  }

  const mockOAuthAccount: OAuthAccount = {
    id: 'oauth-123',
    user_id: 'user-123',
    provider: 'google',
    provider_account_id: 'google-123456',
    access_token: 'access-token-abc',
    refresh_token: 'refresh-token-def',
    expires_at: new Date(Date.now() + 3600 * 1000),
    token_type: 'Bearer',
    scope: 'openid profile email',
    id_token: 'id-token-ghi',
    session_state: null,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockGoogleProfile: GoogleProfile = {
    id: 'google-123456',
    email: 'test@example.com',
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://example.com/picture.jpg',
    verified_email: true,
  }

  const mockOAuthTokens = {
    access_token: 'access-token-abc',
    refresh_token: 'refresh-token-def',
    expires_in: 3600,
    id_token: 'id-token-ghi',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock repositories
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }

    mockOAuthAccountRepository = {
      findById: vi.fn(),
      findByProvider: vi.fn(),
      findByUserId: vi.fn(),
      findByUserIdAndProvider: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateTokens: vi.fn(),
      delete: vi.fn(),
      deleteByUserId: vi.fn(),
      deleteByUserIdAndProvider: vi.fn(),
      hasProvider: vi.fn(),
      countByUserId: vi.fn(),
    }

    // Create service instance
    mockDb = {} as unknown
    service = new OAuthService(mockDb as never)

    // Inject mocks
    ;(service as unknown as { userRepository: Partial<UserRepository> }).userRepository =
      mockUserRepository
    ;(service as unknown as { oauthAccountRepository: Partial<OAuthAccountRepository> }).oauthAccountRepository =
      mockOAuthAccountRepository
  })

  // ===========================================
  // handleGoogleCallback() Tests
  // ===========================================
  describe('handleGoogleCallback', () => {
    it('should login existing OAuth user and update tokens', async () => {
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(mockOAuthAccount)
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockOAuthAccountRepository.updateTokens = vi.fn().mockResolvedValue(mockOAuthAccount)

      const result = await service.handleGoogleCallback(mockGoogleProfile, mockOAuthTokens)

      expect(result.user).toEqual(mockUser)
      expect(result.isNewUser).toBe(false)
      expect(result.tokens.accessToken).toBe('access_user-123_student')
      expect(result.tokens.refreshToken).toContain('refresh_token_')

      expect(mockOAuthAccountRepository.findByProvider).toHaveBeenCalledWith('google', 'google-123456')
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123')
      expect(mockOAuthAccountRepository.updateTokens).toHaveBeenCalledWith(
        'oauth-123',
        expect.objectContaining({
          access_token: 'access-token-abc',
          refresh_token: 'refresh-token-def',
          id_token: 'id-token-ghi',
        })
      )
    })

    it('should create new user for new OAuth login', async () => {
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(null)
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue(mockUser)
      mockOAuthAccountRepository.create = vi.fn().mockResolvedValue(mockOAuthAccount)

      const result = await service.handleGoogleCallback(mockGoogleProfile, mockOAuthTokens)

      expect(result.user).toEqual(mockUser)
      expect(result.isNewUser).toBe(true)
      expect(result.tokens.accessToken).toBeDefined()
      expect(result.tokens.refreshToken).toBeDefined()

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password_hash: null,
        role: 'student',
        name: 'Test User',
        suspended: false,
      })

      expect(mockOAuthAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          provider: 'google',
          provider_account_id: 'google-123456',
          access_token: 'access-token-abc',
        })
      )
    })

    it('should link OAuth to existing user without password', async () => {
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(null)
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser) // User with no password
      mockOAuthAccountRepository.create = vi.fn().mockResolvedValue(mockOAuthAccount)

      const result = await service.handleGoogleCallback(mockGoogleProfile, mockOAuthTokens)

      expect(result.user).toEqual(mockUser)
      expect(result.isNewUser).toBe(false)

      // Should create OAuth account without creating new user
      expect(mockUserRepository.create).not.toHaveBeenCalled()
      expect(mockOAuthAccountRepository.create).toHaveBeenCalled()
    })

    it('should throw error for existing user with password', async () => {
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(null)
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUserWithPassword)

      await expect(
        service.handleGoogleCallback(mockGoogleProfile, mockOAuthTokens)
      ).rejects.toThrow(InvalidCredentialsError)

      expect(mockOAuthAccountRepository.create).not.toHaveBeenCalled()
    })

    it('should handle orphaned OAuth account', async () => {
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(mockOAuthAccount)
      mockUserRepository.findById = vi.fn().mockResolvedValue(null) // User not found
      mockOAuthAccountRepository.delete = vi.fn().mockResolvedValue(undefined)

      await expect(
        service.handleGoogleCallback(mockGoogleProfile, mockOAuthTokens)
      ).rejects.toThrow(NotFoundError)

      expect(mockOAuthAccountRepository.delete).toHaveBeenCalledWith('oauth-123')
    })

    it('should handle tokens without refresh token', async () => {
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(null)
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue(mockUser)
      mockOAuthAccountRepository.create = vi.fn().mockResolvedValue(mockOAuthAccount)

      const tokensWithoutRefresh = {
        access_token: 'access-token-abc',
        expires_in: 3600,
      }

      const result = await service.handleGoogleCallback(mockGoogleProfile, tokensWithoutRefresh)

      expect(result.user).toEqual(mockUser)
      expect(mockOAuthAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: 'access-token-abc',
          refresh_token: null,
        })
      )
    })

    it('should normalize email to lowercase and trim', async () => {
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(null)
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue(mockUser)
      mockOAuthAccountRepository.create = vi.fn().mockResolvedValue(mockOAuthAccount)

      const profileWithUppercaseEmail = {
        ...mockGoogleProfile,
        email: '  TEST@EXAMPLE.COM  ',
      }

      await service.handleGoogleCallback(profileWithUppercaseEmail, mockOAuthTokens)

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      )
    })
  })

  // ===========================================
  // linkOAuthAccount() Tests
  // ===========================================
  describe('linkOAuthAccount', () => {
    it('should link OAuth account to existing user', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUserWithPassword)
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(null)
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(null)
      mockOAuthAccountRepository.create = vi.fn().mockResolvedValue(mockOAuthAccount)

      const result = await service.linkOAuthAccount(
        'user-with-password',
        'google',
        mockGoogleProfile,
        mockOAuthTokens
      )

      expect(result).toEqual(mockOAuthAccount)
      expect(mockOAuthAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-with-password',
          provider: 'google',
          provider_account_id: 'google-123456',
        })
      )
    })

    it('should throw error if user not found', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.linkOAuthAccount('nonexistent-user', 'google', mockGoogleProfile, mockOAuthTokens)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw error if OAuth already linked to this user', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUserWithPassword)
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(mockOAuthAccount)

      await expect(
        service.linkOAuthAccount('user-with-password', 'google', mockGoogleProfile, mockOAuthTokens)
      ).rejects.toThrow(AlreadyExistsError)
    })

    it('should throw error if OAuth account belongs to another user', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUserWithPassword)
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(null)
      mockOAuthAccountRepository.findByProvider = vi.fn().mockResolvedValue(mockOAuthAccount)

      await expect(
        service.linkOAuthAccount('user-with-password', 'google', mockGoogleProfile, mockOAuthTokens)
      ).rejects.toThrow(AlreadyExistsError)
    })
  })

  // ===========================================
  // unlinkOAuthAccount() Tests
  // ===========================================
  describe('unlinkOAuthAccount', () => {
    it('should unlink OAuth account when user has password', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUserWithPassword)
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(mockOAuthAccount)
      mockOAuthAccountRepository.countByUserId = vi.fn().mockResolvedValue(1)
      mockOAuthAccountRepository.deleteByUserIdAndProvider = vi.fn().mockResolvedValue(undefined)

      await service.unlinkOAuthAccount('user-with-password', 'google')

      expect(mockOAuthAccountRepository.deleteByUserIdAndProvider).toHaveBeenCalledWith(
        'user-with-password',
        'google'
      )
    })

    it('should unlink OAuth account when user has multiple OAuth providers', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(mockOAuthAccount)
      mockOAuthAccountRepository.countByUserId = vi.fn().mockResolvedValue(2) // 2 OAuth accounts
      mockOAuthAccountRepository.deleteByUserIdAndProvider = vi.fn().mockResolvedValue(undefined)

      await service.unlinkOAuthAccount('user-123', 'google')

      expect(mockOAuthAccountRepository.deleteByUserIdAndProvider).toHaveBeenCalled()
    })

    it('should throw error if user not found', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.unlinkOAuthAccount('nonexistent-user', 'google')
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw error if OAuth account not found', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(null)

      await expect(
        service.unlinkOAuthAccount('user-123', 'google')
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw error if this is the only auth method', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser) // No password
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(mockOAuthAccount)
      mockOAuthAccountRepository.countByUserId = vi.fn().mockResolvedValue(1) // Only 1 OAuth account

      await expect(
        service.unlinkOAuthAccount('user-123', 'google')
      ).rejects.toThrow(InvalidCredentialsError)

      expect(mockOAuthAccountRepository.deleteByUserIdAndProvider).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // getUserOAuthAccounts() Tests
  // ===========================================
  describe('getUserOAuthAccounts', () => {
    it('should return all OAuth accounts for a user', async () => {
      const mockAccounts = [mockOAuthAccount, { ...mockOAuthAccount, provider: 'github' }]
      mockOAuthAccountRepository.findByUserId = vi.fn().mockResolvedValue(mockAccounts)

      const result = await service.getUserOAuthAccounts('user-123')

      expect(result).toEqual(mockAccounts)
      expect(mockOAuthAccountRepository.findByUserId).toHaveBeenCalledWith('user-123')
    })
  })

  // ===========================================
  // hasOAuthProvider() Tests
  // ===========================================
  describe('hasOAuthProvider', () => {
    it('should return true if user has provider', async () => {
      mockOAuthAccountRepository.hasProvider = vi.fn().mockResolvedValue(true)

      const result = await service.hasOAuthProvider('user-123', 'google')

      expect(result).toBe(true)
      expect(mockOAuthAccountRepository.hasProvider).toHaveBeenCalledWith('user-123', 'google')
    })

    it('should return false if user does not have provider', async () => {
      mockOAuthAccountRepository.hasProvider = vi.fn().mockResolvedValue(false)

      const result = await service.hasOAuthProvider('user-123', 'github')

      expect(result).toBe(false)
    })
  })

  // ===========================================
  // getOAuthAccount() Tests
  // ===========================================
  describe('getOAuthAccount', () => {
    it('should return OAuth account if found', async () => {
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(mockOAuthAccount)

      const result = await service.getOAuthAccount('user-123', 'google')

      expect(result).toEqual(mockOAuthAccount)
    })

    it('should return null if not found', async () => {
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(null)

      const result = await service.getOAuthAccount('user-123', 'github')

      expect(result).toBeNull()
    })
  })

  // ===========================================
  // refreshOAuthTokens() Tests
  // ===========================================
  describe('refreshOAuthTokens', () => {
    it('should refresh OAuth tokens', async () => {
      const updatedAccount = {
        ...mockOAuthAccount,
        access_token: 'new-access-token',
      }

      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(mockOAuthAccount)
      mockOAuthAccountRepository.updateTokens = vi.fn().mockResolvedValue(updatedAccount)

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      }

      const result = await service.refreshOAuthTokens('user-123', 'google', newTokens)

      expect(result).toEqual(updatedAccount)
      expect(mockOAuthAccountRepository.updateTokens).toHaveBeenCalledWith(
        'oauth-123',
        expect.objectContaining({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        })
      )
    })

    it('should throw error if OAuth account not found', async () => {
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(null)

      await expect(
        service.refreshOAuthTokens('user-123', 'google', {
          access_token: 'new-token',
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('should handle partial token updates', async () => {
      mockOAuthAccountRepository.findByUserIdAndProvider = vi.fn().mockResolvedValue(mockOAuthAccount)
      mockOAuthAccountRepository.updateTokens = vi.fn().mockResolvedValue(mockOAuthAccount)

      const partialTokens = {
        access_token: 'new-access-token',
      }

      await service.refreshOAuthTokens('user-123', 'google', partialTokens)

      expect(mockOAuthAccountRepository.updateTokens).toHaveBeenCalledWith(
        'oauth-123',
        expect.objectContaining({
          access_token: 'new-access-token',
          refresh_token: null,
        })
      )
    })
  })
})
