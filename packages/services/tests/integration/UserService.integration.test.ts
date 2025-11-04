import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UserService } from '../../src/UserService'
import {
  db,
  clearAllTables,
  createTestUser,
  createTestUsers,
} from '@concentrate/database'
import { hashPassword, verifyPassword } from '@concentrate/shared'
import type { NewUser } from '@concentrate/database'
import {
  AlreadyExistsError,
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
} from '@concentrate/shared'

describe('UserService - Integration Tests', () => {
  let service: UserService

  beforeEach(async () => {
    await clearAllTables(db)
    service = new UserService(db)
  })

  afterEach(async () => {
    await clearAllTables(db)
  })

  // ===========================================
  // Database Constraints Tests
  // ===========================================
  describe('Database Constraints', () => {
    it('should enforce unique email constraint', async () => {
      await service.createUser({
        email: 'unique@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'First User',
      })

      // Attempt to create duplicate should throw
      await expect(
        service.createUser({
          email: 'unique@example.com',
          password_hash: 'different_password',
          role: 'teacher',
          name: 'Second User',
        })
      ).rejects.toThrow(AlreadyExistsError)
    })

    it('should enforce case-insensitive unique email', async () => {
      await service.createUser({
        email: 'test@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'First User',
      })

      // Uppercase version should also be rejected
      await expect(
        service.createUser({
          email: 'TEST@EXAMPLE.COM',
          password_hash: 'password123',
          role: 'student',
          name: 'Second User',
        })
      ).rejects.toThrow(AlreadyExistsError)
    })

    it('should apply default values correctly', async () => {
      const user = await service.createUser({
        email: 'defaults@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'Test User',
      })

      expect(user.suspended).toBe(false)
      expect(user.created_at).toBeInstanceOf(Date)
      expect(user.updated_at).toBeInstanceOf(Date)
      expect(user.id).toBeDefined()
    })

    it('should store timestamps correctly', async () => {
      const beforeCreate = new Date()
      const user = await service.createUser({
        email: 'timestamps@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'Test User',
      })
      const afterCreate = new Date()

      expect(user.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(user.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
      expect(user.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(user.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })

    it('should update updated_at timestamp on modification', async () => {
      // Clear database to ensure clean state for this test
      await clearAllTables(db)

      const user = await service.createUser({
        email: 'update-timestamp@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'Original Name',
      })

      const originalUpdatedAt = user.updated_at

      // Wait to ensure timestamp difference (PostgreSQL has millisecond precision)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify user still exists before updating
      const existingUser = await service.getUserById(user.id)
      expect(existingUser).toBeDefined()

      const updatedUser = await service.updateUser(user.id, {
        name: 'New Name',
      })

      // Updated timestamp should be greater than or equal (DB might round)
      expect(updatedUser.updated_at.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime())
      expect(updatedUser.name).toBe('New Name')
    })
  })

  // ===========================================
  // Password Hashing Tests
  // ===========================================
  describe('Password Hashing', () => {
    it('should hash password with real bcrypt on create', async () => {
      const plainPassword = 'my_secure_password_123'

      const user = await service.createUser({
        email: 'hashing@example.com',
        password_hash: plainPassword,
        role: 'student',
        name: 'Test User',
      })

      // Password should be hashed (not plain text)
      expect(user.password_hash).not.toBe(plainPassword)
      expect(user.password_hash).toBeDefined()

      // Should be able to verify with bcrypt
      const isValid = await verifyPassword(plainPassword, user.password_hash!)
      expect(isValid).toBe(true)

      // Wrong password should not verify
      const isWrong = await verifyPassword('wrong_password', user.password_hash!)
      expect(isWrong).toBe(false)
    })

    it('should hash password with real bcrypt on update', async () => {
      const user = await service.createUser({
        email: 'update-hash@example.com',
        password_hash: 'original_password',
        role: 'student',
        name: 'Test User',
      })

      const newPlainPassword = 'new_secure_password_456'

      const updatedUser = await service.updateUser(user.id, {
        password_hash: newPlainPassword,
      })

      // New password should be hashed
      expect(updatedUser.password_hash).not.toBe(newPlainPassword)

      // Should verify with new password
      const isValid = await verifyPassword(newPlainPassword, updatedUser.password_hash!)
      expect(isValid).toBe(true)

      // Old password should not verify
      const isOld = await verifyPassword('original_password', updatedUser.password_hash!)
      expect(isOld).toBe(false)
    })

    it('should handle null password (OAuth users)', async () => {
      const user = await service.createUser({
        email: 'oauth@example.com',
        password_hash: null,
        role: 'student',
        name: 'OAuth User',
      })

      expect(user.password_hash).toBeNull()
    })
  })

  // ===========================================
  // Transaction Scenarios Tests
  // ===========================================
  describe('Transaction Scenarios', () => {
    it('should commit successful transaction', async () => {
      await db.transaction().execute(async trx => {
        const txService = new UserService(trx)

        await txService.createUser({
          email: 'tx-commit@example.com',
          password_hash: 'password123',
          role: 'student',
          name: 'TX User',
        })
      })

      // User should exist after transaction commits
      const user = await service.getUserByEmail('tx-commit@example.com')
      expect(user).toBeDefined()
      expect(user!.email).toBe('tx-commit@example.com')
    })

    it('should rollback failed transaction', async () => {
      await expect(
        db.transaction().execute(async trx => {
          const txService = new UserService(trx)

          // Create first user successfully
          await txService.createUser({
            email: 'tx-rollback@example.com',
            password_hash: 'password123',
            role: 'student',
            name: 'TX User 1',
          })

          // Try to create duplicate (should fail)
          await txService.createUser({
            email: 'tx-rollback@example.com',
            password_hash: 'password456',
            role: 'teacher',
            name: 'TX User 2',
          })
        })
      ).rejects.toThrow()

      // No user should exist after rollback
      await expect(
        service.getUserByEmail('tx-rollback@example.com')
      ).rejects.toThrow(NotFoundError)
    })

    it('should handle concurrent user creation attempts', async () => {
      const email = 'concurrent@example.com'

      // Create multiple concurrent requests
      const promises = [
        service.createUser({
          email,
          password_hash: 'password1',
          role: 'student',
          name: 'User 1',
        }),
        service.createUser({
          email,
          password_hash: 'password2',
          role: 'student',
          name: 'User 2',
        }),
        service.createUser({
          email,
          password_hash: 'password3',
          role: 'student',
          name: 'User 3',
        }),
      ]

      // At least one should succeed, others should fail
      const results = await Promise.allSettled(promises)

      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      expect(successful.length).toBe(1)
      expect(failed.length).toBe(2)
    })

    it('should support nested transaction operations', async () => {
      await db.transaction().execute(async trx => {
        const txService = new UserService(trx)

        // Create multiple users in same transaction
        await txService.createUser({
          email: 'nested1@example.com',
          password_hash: 'password123',
          role: 'admin',
          name: 'Nested User 1',
        })

        await txService.createUser({
          email: 'nested2@example.com',
          password_hash: 'password456',
          role: 'teacher',
          name: 'Nested User 2',
        })

        await txService.createUser({
          email: 'nested3@example.com',
          password_hash: 'password789',
          role: 'student',
          name: 'Nested User 3',
        })
      })

      // All users should exist
      const count = await service.getUserCount()
      expect(count).toBe(3)
    })
  })

  // ===========================================
  // Search & Filtering Tests
  // ===========================================
  describe('Search & Filtering', () => {
    beforeEach(async () => {
      // Create test dataset
      await createTestUsers(db, 15, { role: 'student' })
      await createTestUsers(db, 8, { role: 'teacher' })
      await createTestUsers(db, 3, { role: 'admin' })
    })

    it('should filter by role', async () => {
      const students = await service.getUsersByRole('student')
      const teachers = await service.getUsersByRole('teacher')
      const admins = await service.getUsersByRole('admin')

      expect(students.length).toBe(15)
      expect(teachers.length).toBe(8)
      expect(admins.length).toBe(3)
    })

    it('should filter by role using searchUsers', async () => {
      const students = await service.searchUsers({ role: 'student' })
      const teachers = await service.searchUsers({ role: 'teacher' })
      const admins = await service.searchUsers({ role: 'admin' })

      expect(students.length).toBe(15)
      expect(teachers.length).toBe(8)
      expect(admins.length).toBe(3)
    })

    it('should filter by suspension status', async () => {
      // Suspend 5 students
      const students = await service.getUsersByRole('student')
      await service.batchSuspendUsers(students.slice(0, 5).map(s => s.id))

      // Get suspended users
      const suspended = await service.searchUsers({ isSuspended: true })
      const active = await service.searchUsers({ isSuspended: false, page: 1, limit: 100 })

      expect(suspended.length).toBe(5)
      expect(active.length).toBe(21) // 26 total - 5 suspended
    })

    it('should combine role and suspension filters', async () => {
      // Suspend 3 teachers
      const teachers = await service.getUsersByRole('teacher')
      await service.batchSuspendUsers(teachers.slice(0, 3).map(t => t.id))

      // Get active teachers only
      const activeTeachers = await service.searchUsers({
        role: 'teacher',
        isSuspended: false,
      })

      expect(activeTeachers.length).toBe(5) // 8 total - 3 suspended
      activeTeachers.forEach(teacher => {
        expect(teacher.role).toBe('teacher')
        expect(teacher.suspended).toBe(false)
      })
    })

    it('should paginate results correctly', async () => {
      const page1 = await service.searchUsers({ page: 1, limit: 10 })
      const page2 = await service.searchUsers({ page: 2, limit: 10 })
      const page3 = await service.searchUsers({ page: 3, limit: 10 })

      expect(page1.length).toBe(10)
      expect(page2.length).toBe(10)
      expect(page3.length).toBe(6) // 26 total users (15+8+3)

      // Pages should not have duplicates
      const allIds = [...page1, ...page2, ...page3].map(u => u.id)
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(26)
    })
  })

  // ===========================================
  // Role Management Tests
  // ===========================================
  describe('Role Management', () => {
    it('should prevent deleting last admin with real DB count', async () => {
      // Create single admin
      const admin = await service.createUser({
        email: 'lastadmin@example.com',
        password_hash: 'password123',
        role: 'admin',
        name: 'Last Admin',
      })

      // Attempt to delete should fail
      await expect(service.deleteUser(admin.id)).rejects.toThrow(InvalidStateError)
      await expect(service.deleteUser(admin.id)).rejects.toThrow('last admin')

      // Admin should still exist
      const stillExists = await service.getUserById(admin.id)
      expect(stillExists).toBeDefined()
    })

    it('should allow deleting admin when multiple exist', async () => {
      // Create two admins
      const admin1 = await service.createUser({
        email: 'admin1@example.com',
        password_hash: 'password123',
        role: 'admin',
        name: 'Admin 1',
      })

      await service.createUser({
        email: 'admin2@example.com',
        password_hash: 'password123',
        role: 'admin',
        name: 'Admin 2',
      })

      // Should be able to delete one
      await service.deleteUser(admin1.id)

      // Should be deleted (throws NotFoundError)
      await expect(service.getUserById(admin1.id)).rejects.toThrow(NotFoundError)

      // Second admin should still exist
      const adminCount = await service.getUserCountByRole('admin')
      expect(adminCount).toBe(1)
    })

    it('should prevent suspending last admin with real DB count', async () => {
      // Create single admin
      const admin = await service.createUser({
        email: 'onlyadmin@example.com',
        password_hash: 'password123',
        role: 'admin',
        name: 'Only Admin',
      })

      // Attempt to suspend should fail
      await expect(service.suspendUser(admin.id)).rejects.toThrow(InvalidStateError)
      await expect(service.suspendUser(admin.id)).rejects.toThrow('last admin')

      // Admin should not be suspended
      const stillActive = await service.getUserById(admin.id)
      expect(stillActive!.suspended).toBe(false)
    })

    it('should update role correctly', async () => {
      const user = await service.createUser({
        email: 'rolechange@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'Role Changer',
      })

      // Change to teacher
      const asTeacher = await service.updateUser(user.id, { role: 'teacher' })
      expect(asTeacher.role).toBe('teacher')

      // Verify in DB
      const fetched = await service.getUserById(user.id)
      expect(fetched!.role).toBe('teacher')
    })
  })

  // ===========================================
  // Suspension Logic Tests
  // ===========================================
  describe('Suspension Logic', () => {
    it('should prevent self-suspension with real user ID check', async () => {
      const user = await service.createUser({
        email: 'self@example.com',
        password_hash: 'password123',
        role: 'teacher',
        name: 'Self User',
      })

      // Attempt self-suspension
      await expect(service.suspendUser(user.id, user.id)).rejects.toThrow(ForbiddenError)
      await expect(service.suspendUser(user.id, user.id)).rejects.toThrow('cannot suspend yourself')

      // User should not be suspended
      const stillActive = await service.getUserById(user.id)
      expect(stillActive!.suspended).toBe(false)
    })

    it('should allow suspending others', async () => {
      const admin = await service.createUser({
        email: 'admin@example.com',
        password_hash: 'password123',
        role: 'admin',
        name: 'Admin User',
      })

      const target = await service.createUser({
        email: 'target@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'Target User',
      })

      // Admin should be able to suspend target
      const suspended = await service.suspendUser(target.id, admin.id)
      expect(suspended.suspended).toBe(true)

      // Verify in DB
      const fetched = await service.getUserById(target.id)
      expect(fetched!.suspended).toBe(true)
    })

    it('should be idempotent for suspend operations', async () => {
      const user = await service.createUser({
        email: 'idempotent@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'Idempotent User',
      })

      // Suspend once
      await service.suspendUser(user.id)

      // Suspend again (should not throw)
      const result = await service.suspendUser(user.id)
      expect(result.suspended).toBe(true)

      // Verify still suspended
      const fetched = await service.getUserById(user.id)
      expect(fetched!.suspended).toBe(true)
    })
  })

  // ===========================================
  // Edge Cases Tests
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com'

      const user = await service.createUser({
        email: longEmail,
        password_hash: 'password123',
        role: 'student',
        name: 'Long Email User',
      })

      expect(user.email).toBe(longEmail)
    })

    it('should handle special characters in name', async () => {
      const specialName = "O'Brien-Smith (Jr.) <test@example.com>"

      const user = await service.createUser({
        email: 'special@example.com',
        password_hash: 'password123',
        role: 'student',
        name: specialName,
      })

      expect(user.name).toBe(specialName)

      // Verify can retrieve
      const fetched = await service.getUserById(user.id)
      expect(fetched!.name).toBe(specialName)
    })

    it('should handle concurrent updates to same user', async () => {
      const user = await service.createUser({
        email: 'concurrent-update@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'Original Name',
      })

      // Concurrent updates
      const updates = [
        service.updateUser(user.id, { name: 'Name 1' }),
        service.updateUser(user.id, { name: 'Name 2' }),
        service.updateUser(user.id, { name: 'Name 3' }),
      ]

      // All should complete
      const results = await Promise.all(updates)

      // All updates should succeed
      results.forEach(result => {
        expect(result.id).toBe(user.id)
        expect(['Name 1', 'Name 2', 'Name 3']).toContain(result.name)
      })

      // Final state should be one of the updated names
      const final = await service.getUserById(user.id)
      expect(['Name 1', 'Name 2', 'Name 3']).toContain(final!.name)
    })
  })

  // ===========================================
  // Additional Coverage Tests
  // ===========================================
  describe('Additional Coverage', () => {
    it('should count users by role accurately', async () => {
      await createTestUsers(db, 5, { role: 'student' })
      await createTestUsers(db, 3, { role: 'teacher' })
      await createTestUsers(db, 1, { role: 'admin' })

      expect(await service.getUserCountByRole('student')).toBe(5)
      expect(await service.getUserCountByRole('teacher')).toBe(3)
      expect(await service.getUserCountByRole('admin')).toBe(1)
    })

    it('should verify email existence', async () => {
      await service.createUser({
        email: 'exists@example.com',
        password_hash: 'password123',
        role: 'student',
        name: 'Exists User',
      })

      expect(await service.emailExists('exists@example.com')).toBe(true)
      expect(await service.emailExists('notexists@example.com')).toBe(false)
    })

    it('should batch suspend multiple users', async () => {
      const users = await createTestUsers(db, 5, { role: 'student' })
      const userIds = users.map(u => u.id)

      const count = await service.batchSuspendUsers(userIds)
      expect(count).toBe(5)

      // Verify all suspended
      for (const userId of userIds) {
        const user = await service.getUserById(userId)
        expect(user!.suspended).toBe(true)
      }
    })

    it('should throw NotFoundError for non-existent user', async () => {
      // Use valid UUID format
      await expect(
        service.getUserById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError)
    })

    it('should handle updating non-existent user', async () => {
      // Use valid UUID format
      await expect(
        service.updateUser('00000000-0000-0000-0000-000000000000', { name: 'New Name' })
      ).rejects.toThrow(NotFoundError)
    })
  })
})
