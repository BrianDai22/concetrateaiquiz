import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OAuthAccountRepository } from '../OAuthAccountRepository'
import {
  db,
  clearAllTables,
  createTestUser,
  createTestOAuthAccount,
} from '../../index'
import type { NewOAuthAccount } from '../../schema'

describe('OAuthAccountRepository', () => {
  let repository: OAuthAccountRepository
  let userId: string

  beforeEach(async () => {
    await clearAllTables(db)
    repository = new OAuthAccountRepository(db)

    // Create a test user for OAuth accounts
    const user = await createTestUser(db, {
      email: 'oauth-user@example.com',
      name: 'OAuth Test User',
    })
    userId = user.id
  })

  afterEach(async () => {
    await clearAllTables(db)
  })

  describe('create', () => {
    it('should create a new OAuth account with all fields', async () => {
      const newAccount: NewOAuthAccount = {
        user_id: userId,
        provider: 'google',
        provider_account_id: 'google-123456',
        access_token: 'access-token-abc',
        refresh_token: 'refresh-token-def',
        expires_at: new Date(Date.now() + 3600 * 1000),
        token_type: 'Bearer',
        scope: 'openid profile email',
        id_token: 'id-token-ghi',
        session_state: 'session-state-jkl',
      }

      const account = await repository.create(newAccount)

      expect(account.id).toBeDefined()
      expect(account.user_id).toBe(userId)
      expect(account.provider).toBe('google')
      expect(account.provider_account_id).toBe('google-123456')
      expect(account.access_token).toBe('access-token-abc')
      expect(account.refresh_token).toBe('refresh-token-def')
      expect(account.expires_at).toBeInstanceOf(Date)
      expect(account.token_type).toBe('Bearer')
      expect(account.scope).toBe('openid profile email')
      expect(account.id_token).toBe('id-token-ghi')
      expect(account.session_state).toBe('session-state-jkl')
      expect(account.created_at).toBeInstanceOf(Date)
      expect(account.updated_at).toBeInstanceOf(Date)
    })

    it('should create an OAuth account with minimal fields', async () => {
      const newAccount: NewOAuthAccount = {
        user_id: userId,
        provider: 'github',
        provider_account_id: 'github-789012',
        access_token: null,
        refresh_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
      }

      const account = await repository.create(newAccount)

      expect(account.id).toBeDefined()
      expect(account.user_id).toBe(userId)
      expect(account.provider).toBe('github')
      expect(account.provider_account_id).toBe('github-789012')
      expect(account.access_token).toBeNull()
      expect(account.refresh_token).toBeNull()
      expect(account.expires_at).toBeNull()
    })

    it('should throw error for duplicate provider account ID', async () => {
      await repository.create({
        user_id: userId,
        provider: 'google',
        provider_account_id: 'duplicate-123',
        access_token: null,
        refresh_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
      })

      await expect(
        repository.create({
          user_id: userId,
          provider: 'google',
          provider_account_id: 'duplicate-123',
          access_token: null,
          refresh_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
          id_token: null,
          session_state: null,
        })
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find OAuth account by ID', async () => {
      const created = await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
        providerAccountId: 'google-findById',
      })

      const found = await repository.findById(created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.provider).toBe('google')
      expect(found?.provider_account_id).toBe('google-findById')
    })

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById(
        '00000000-0000-0000-0000-000000000000'
      )

      expect(found).toBeNull()
    })
  })

  describe('findByProvider', () => {
    it('should find OAuth account by provider and provider account ID', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
        providerAccountId: 'google-provider-123',
      })

      const found = await repository.findByProvider('google', 'google-provider-123')

      expect(found).not.toBeNull()
      expect(found?.provider).toBe('google')
      expect(found?.provider_account_id).toBe('google-provider-123')
      expect(found?.user_id).toBe(userId)
    })

    it('should return null for non-existent provider account', async () => {
      const found = await repository.findByProvider('google', 'nonexistent-123')

      expect(found).toBeNull()
    })

    it('should distinguish between different providers', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
        providerAccountId: 'same-id-123',
      })

      await createTestOAuthAccount(db, {
        userId,
        provider: 'github',
        providerAccountId: 'same-id-123',
      })

      const googleAccount = await repository.findByProvider('google', 'same-id-123')
      const githubAccount = await repository.findByProvider('github', 'same-id-123')

      expect(googleAccount).not.toBeNull()
      expect(githubAccount).not.toBeNull()
      expect(googleAccount?.provider).toBe('google')
      expect(githubAccount?.provider).toBe('github')
      expect(googleAccount?.id).not.toBe(githubAccount?.id)
    })
  })

  describe('findByUserId', () => {
    it('should find all OAuth accounts for a user', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      await createTestOAuthAccount(db, {
        userId,
        provider: 'github',
      })

      const accounts = await repository.findByUserId(userId)

      expect(accounts).toHaveLength(2)
      expect(accounts.map(a => a.provider).sort()).toEqual(['github', 'google'])
    })

    it('should return empty array for user with no OAuth accounts', async () => {
      const newUser = await createTestUser(db, {
        email: 'no-oauth@example.com',
      })

      const accounts = await repository.findByUserId(newUser.id)

      expect(accounts).toEqual([])
    })

    it('should order accounts by created_at descending', async () => {
      const first = await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))

      const second = await createTestOAuthAccount(db, {
        userId,
        provider: 'github',
      })

      const accounts = await repository.findByUserId(userId)

      expect(accounts[0].id).toBe(second.id)
      expect(accounts[1].id).toBe(first.id)
    })
  })

  describe('findByUserIdAndProvider', () => {
    it('should find specific OAuth account for user and provider', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
        providerAccountId: 'google-specific-123',
      })

      await createTestOAuthAccount(db, {
        userId,
        provider: 'github',
      })

      const found = await repository.findByUserIdAndProvider(userId, 'google')

      expect(found).not.toBeNull()
      expect(found?.provider).toBe('google')
      expect(found?.provider_account_id).toBe('google-specific-123')
    })

    it('should return null if user has no account for provider', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      const found = await repository.findByUserIdAndProvider(userId, 'github')

      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update OAuth account', async () => {
      const created = await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
        accessToken: 'old-token',
      })

      const updated = await repository.update(created.id, {
        access_token: 'new-token',
        scope: 'openid profile email calendar',
      })

      expect(updated.id).toBe(created.id)
      expect(updated.access_token).toBe('new-token')
      expect(updated.scope).toBe('openid profile email calendar')
    })

    it('should throw error for non-existent OAuth account', async () => {
      await expect(
        repository.update('00000000-0000-0000-0000-000000000000', {
          access_token: 'new-token',
        })
      ).rejects.toThrow()
    })
  })

  describe('updateTokens', () => {
    it('should update OAuth account tokens', async () => {
      const created = await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
      })

      const expiresAt = new Date(Date.now() + 7200 * 1000)
      const updated = await repository.updateTokens(created.id, {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_at: expiresAt,
        id_token: 'new-id-token',
      })

      expect(updated.id).toBe(created.id)
      expect(updated.access_token).toBe('new-access')
      expect(updated.refresh_token).toBe('new-refresh')
      expect(updated.expires_at).toEqual(expiresAt)
      expect(updated.id_token).toBe('new-id-token')
    })

    it('should allow partial token updates', async () => {
      const created = await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
        accessToken: 'old-access',
      })

      const updated = await repository.updateTokens(created.id, {
        access_token: 'new-access',
      })

      expect(updated.access_token).toBe('new-access')
    })
  })

  describe('delete', () => {
    it('should delete OAuth account by ID', async () => {
      const created = await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      await repository.delete(created.id)

      const found = await repository.findById(created.id)
      expect(found).toBeNull()
    })

    it('should throw error for non-existent OAuth account', async () => {
      await expect(
        repository.delete('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('OAuth account with id 00000000-0000-0000-0000-000000000000 not found')
    })
  })

  describe('deleteByUserId', () => {
    it('should delete all OAuth accounts for a user', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      await createTestOAuthAccount(db, {
        userId,
        provider: 'github',
      })

      const deletedCount = await repository.deleteByUserId(userId)

      expect(deletedCount).toBe(2)

      const accounts = await repository.findByUserId(userId)
      expect(accounts).toHaveLength(0)
    })

    it('should return 0 for user with no OAuth accounts', async () => {
      const newUser = await createTestUser(db, {
        email: 'no-delete@example.com',
      })

      const deletedCount = await repository.deleteByUserId(newUser.id)

      expect(deletedCount).toBe(0)
    })
  })

  describe('deleteByUserIdAndProvider', () => {
    it('should delete specific OAuth account', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      await createTestOAuthAccount(db, {
        userId,
        provider: 'github',
      })

      await repository.deleteByUserIdAndProvider(userId, 'google')

      const googleAccount = await repository.findByUserIdAndProvider(userId, 'google')
      const githubAccount = await repository.findByUserIdAndProvider(userId, 'github')

      expect(googleAccount).toBeNull()
      expect(githubAccount).not.toBeNull()
    })

    it('should throw error if account does not exist', async () => {
      await expect(
        repository.deleteByUserIdAndProvider(userId, 'nonexistent')
      ).rejects.toThrow()
    })
  })

  describe('hasProvider', () => {
    it('should return true if user has OAuth account for provider', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      const hasGoogle = await repository.hasProvider(userId, 'google')
      expect(hasGoogle).toBe(true)
    })

    it('should return false if user does not have OAuth account for provider', async () => {
      const hasGithub = await repository.hasProvider(userId, 'github')
      expect(hasGithub).toBe(false)
    })
  })

  describe('countByUserId', () => {
    it('should count OAuth accounts for a user', async () => {
      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      await createTestOAuthAccount(db, {
        userId,
        provider: 'github',
      })

      const count = await repository.countByUserId(userId)
      expect(count).toBe(2)
    })

    it('should return 0 for user with no OAuth accounts', async () => {
      const newUser = await createTestUser(db, {
        email: 'no-count@example.com',
      })

      const count = await repository.countByUserId(newUser.id)
      expect(count).toBe(0)
    })
  })

  describe('findByProviderName', () => {
    it('should find all OAuth accounts for a provider', async () => {
      const user2 = await createTestUser(db, {
        email: 'user2@example.com',
      })

      await createTestOAuthAccount(db, {
        userId,
        provider: 'google',
      })

      await createTestOAuthAccount(db, {
        userId: user2.id,
        provider: 'google',
      })

      await createTestOAuthAccount(db, {
        userId,
        provider: 'github',
      })

      const googleAccounts = await repository.findByProviderName('google')

      expect(googleAccounts).toHaveLength(2)
      expect(googleAccounts.every(a => a.provider === 'google')).toBe(true)
    })

    it('should return empty array if no accounts exist for provider', async () => {
      const accounts = await repository.findByProviderName('nonexistent')
      expect(accounts).toEqual([])
    })
  })
})
