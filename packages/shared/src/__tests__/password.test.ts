import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../utils/password'

describe('hashPassword', () => {
  it('should hash a password successfully', async () => {
    const password = 'mySecurePassword123'
    const hash = await hashPassword(password)

    expect(hash).toBeDefined()
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('should return hash in correct format (salt:hash)', async () => {
    const password = 'testPassword'
    const hash = await hashPassword(password)

    const parts = hash.split(':')
    expect(parts).toHaveLength(2)
    expect(parts[0]).toBeDefined()
    expect(parts[1]).toBeDefined()

    // Check that both parts are hex strings
    const saltHex = parts[0]
    const hashHex = parts[1]
    expect(saltHex).toMatch(/^[0-9a-f]+$/)
    expect(hashHex).toMatch(/^[0-9a-f]+$/)

    // Salt should be 32 bytes (64 hex chars)
    expect(saltHex?.length).toBe(64)
    // Hash should be 64 bytes (128 hex chars)
    expect(hashHex?.length).toBe(128)
  })

  it('should produce different hashes for the same password (due to random salt)', async () => {
    const password = 'samePassword'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    expect(hash1).not.toBe(hash2)
  })

  it('should produce different hashes for different passwords', async () => {
    const password1 = 'password1'
    const password2 = 'password2'
    const hash1 = await hashPassword(password1)
    const hash2 = await hashPassword(password2)

    expect(hash1).not.toBe(hash2)
  })

  it('should throw error for empty password', async () => {
    await expect(hashPassword('')).rejects.toThrow('Password cannot be empty')
  })

  it('should throw error for non-string password', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(hashPassword(123 as any)).rejects.toThrow('Password must be a string')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(hashPassword(null as any)).rejects.toThrow('Password must be a string')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(hashPassword(undefined as any)).rejects.toThrow('Password must be a string')
  })

  it('should hash complex passwords with special characters', async () => {
    const complexPassword = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:",.<>?'
    const hash = await hashPassword(complexPassword)

    expect(hash).toBeDefined()
    expect(hash.split(':')).toHaveLength(2)
  })

  it('should hash very long passwords', async () => {
    const longPassword = 'a'.repeat(1000)
    const hash = await hashPassword(longPassword)

    expect(hash).toBeDefined()
    expect(hash.split(':')).toHaveLength(2)
  })
})

describe('verifyPassword', () => {
  it('should verify correct password successfully', async () => {
    const password = 'correctPassword'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)

    expect(isValid).toBe(true)
  })

  it('should reject incorrect password', async () => {
    const correctPassword = 'correctPassword'
    const incorrectPassword = 'wrongPassword'
    const hash = await hashPassword(correctPassword)
    const isValid = await verifyPassword(incorrectPassword, hash)

    expect(isValid).toBe(false)
  })

  it('should reject password with different case', async () => {
    const password = 'CaseSensitive'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword('casesensitive', hash)

    expect(isValid).toBe(false)
  })

  it('should reject password with extra characters', async () => {
    const password = 'password'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword('password123', hash)

    expect(isValid).toBe(false)
  })

  it('should reject password with missing characters', async () => {
    const password = 'password123'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword('password', hash)

    expect(isValid).toBe(false)
  })

  it('should verify complex passwords with special characters', async () => {
    const complexPassword = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:",.<>?'
    const hash = await hashPassword(complexPassword)
    const isValid = await verifyPassword(complexPassword, hash)

    expect(isValid).toBe(true)
  })

  it('should throw error for empty password', async () => {
    const hash = await hashPassword('validPassword')
    await expect(verifyPassword('', hash)).rejects.toThrow('Password cannot be empty')
  })

  it('should throw error for non-string password', async () => {
    const hash = await hashPassword('validPassword')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(verifyPassword(123 as any, hash)).rejects.toThrow('Password must be a string')
  })

  it('should throw error for non-string hash', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(verifyPassword('password', 123 as any)).rejects.toThrow('Stored hash must be a string')
  })

  it('should throw error for invalid hash format (no colon)', async () => {
    await expect(verifyPassword('password', 'invalidhashformat')).rejects.toThrow('Invalid hash format')
  })

  it('should throw error for invalid hash format (too many parts)', async () => {
    await expect(verifyPassword('password', 'part1:part2:part3')).rejects.toThrow('Invalid hash format')
  })

  it('should throw error for invalid hash format (empty parts)', async () => {
    await expect(verifyPassword('password', ':')).rejects.toThrow('Invalid hash format')
  })

  it('should return false for malformed hex in hash', async () => {
    // Invalid hex characters in salt - Buffer.from() is lenient and won't throw
    // but the hash won't match, so verification should return false
    const invalidHash = 'zzzzz:' + 'a'.repeat(128)
    const result = await verifyPassword('password', invalidHash)
    expect(result).toBe(false)
  })
})

describe('password security', () => {
  it('should use timing-safe comparison (same length hashes)', async () => {
    const password = 'testPassword'
    const hash = await hashPassword(password)

    // This test ensures that verification doesn't throw on valid format
    // Even with wrong password, it should return false, not throw
    const result = await verifyPassword('wrongPassword', hash)
    expect(result).toBe(false)
  })

  it('should handle multiple verifications with same hash', async () => {
    const password = 'testPassword'
    const hash = await hashPassword(password)

    const result1 = await verifyPassword(password, hash)
    const result2 = await verifyPassword(password, hash)
    const result3 = await verifyPassword(password, hash)

    expect(result1).toBe(true)
    expect(result2).toBe(true)
    expect(result3).toBe(true)
  })

  it('should produce hashes that are consistently verifiable', async () => {
    const password = 'consistentPassword'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    // Each hash should verify with the correct password
    expect(await verifyPassword(password, hash1)).toBe(true)
    expect(await verifyPassword(password, hash2)).toBe(true)

    // But hashes should be different (different salts)
    expect(hash1).not.toBe(hash2)
  })
})

describe('edge cases', () => {
  it('should handle Unicode characters in password', async () => {
    const unicodePassword = '密码🔒émojis'
    const hash = await hashPassword(unicodePassword)
    const isValid = await verifyPassword(unicodePassword, hash)

    expect(isValid).toBe(true)
  })

  it('should handle passwords with whitespace', async () => {
    const passwordWithSpaces = '  password with spaces  '
    const hash = await hashPassword(passwordWithSpaces)
    const isValid = await verifyPassword(passwordWithSpaces, hash)

    expect(isValid).toBe(true)
  })

  it('should reject password without whitespace if original had whitespace', async () => {
    const passwordWithSpaces = '  password  '
    const hash = await hashPassword(passwordWithSpaces)
    const isValid = await verifyPassword('password', hash)

    expect(isValid).toBe(false)
  })

  it('should handle newline characters in password', async () => {
    const passwordWithNewline = 'password\nwith\nnewlines'
    const hash = await hashPassword(passwordWithNewline)
    const isValid = await verifyPassword(passwordWithNewline, hash)

    expect(isValid).toBe(true)
  })
})
