import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UserRepository } from '../UserRepository'
import {
  db,
  clearAllTables,
  createTestUser,
  createTestUsers,
} from '../../index'
import type { NewUser } from '../../schema'

describe('UserRepository', () => {
  let repository: UserRepository

  beforeEach(async () => {
    await clearAllTables(db)
    repository = new UserRepository(db)
  })

  afterEach(async () => {
    await clearAllTables(db)
  })

  describe('create', () => {
    it('should create a new user with all fields', async () => {
      const newUser: NewUser = {
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        role: 'student',
        name: 'Test User',
        suspended: false,
      }

      const user = await repository.create(newUser)

      expect(user.id).toBeDefined()
      expect(user.email).toBe('test@example.com')
      expect(user.password_hash).toBe('hashed_password_123')
      expect(user.role).toBe('student')
      expect(user.name).toBe('Test User')
      expect(user.suspended).toBe(false)
      expect(user.created_at).toBeInstanceOf(Date)
      expect(user.updated_at).toBeInstanceOf(Date)
    })

    it('should create a user with minimal fields (OAuth user)', async () => {
      const newUser: NewUser = {
        email: 'oauth@example.com',
        password_hash: null,
        role: 'student',
        name: 'OAuth User',
      }

      const user = await repository.create(newUser)

      expect(user.id).toBeDefined()
      expect(user.email).toBe('oauth@example.com')
      expect(user.password_hash).toBeNull()
      expect(user.role).toBe('student')
      expect(user.name).toBe('OAuth User')
      expect(user.suspended).toBe(false) // Default value
    })

    it('should create users with different roles', async () => {
      const admin = await repository.create({
        email: 'admin@example.com',
        password_hash: 'hash',
        role: 'admin',
        name: 'Admin User',
      })

      const teacher = await repository.create({
        email: 'teacher@example.com',
        password_hash: 'hash',
        role: 'teacher',
        name: 'Teacher User',
      })

      const student = await repository.create({
        email: 'student@example.com',
        password_hash: 'hash',
        role: 'student',
        name: 'Student User',
      })

      expect(admin.role).toBe('admin')
      expect(teacher.role).toBe('teacher')
      expect(student.role).toBe('student')
    })

    it('should throw error for duplicate email', async () => {
      await repository.create({
        email: 'duplicate@example.com',
        password_hash: 'hash',
        role: 'student',
        name: 'First User',
      })

      await expect(
        repository.create({
          email: 'duplicate@example.com',
          password_hash: 'hash',
          role: 'student',
          name: 'Second User',
        })
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find user by ID', async () => {
      const created = await createTestUser(db, {
        email: 'find@example.com',
        name: 'Find Me',
      })

      const found = await repository.findById(created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.email).toBe('find@example.com')
      expect(found?.name).toBe('Find Me')
    })

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById(
        '00000000-0000-0000-0000-000000000000'
      )

      expect(found).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const created = await createTestUser(db, {
        email: 'email@example.com',
        name: 'Email User',
      })

      const found = await repository.findByEmail('email@example.com')

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.email).toBe('email@example.com')
    })

    it('should return null for non-existent email', async () => {
      const found = await repository.findByEmail('nonexistent@example.com')

      expect(found).toBeNull()
    })

    it('should be case-sensitive for email search', async () => {
      await createTestUser(db, { email: 'test@example.com' })

      // Email should be normalized before calling repository
      const found = await repository.findByEmail('TEST@EXAMPLE.COM')

      expect(found).toBeNull() // Case-sensitive search
    })
  })

  describe('findAll', () => {
    it('should return empty array when no users exist', async () => {
      const users = await repository.findAll()

      expect(users).toEqual([])
    })

    it('should return all users with default pagination', async () => {
      await createTestUsers(db, 5)

      const users = await repository.findAll()

      expect(users).toHaveLength(5)
    })

    it('should paginate users correctly', async () => {
      await createTestUsers(db, 15)

      const page1 = await repository.findAll({ page: 1, limit: 5 })
      const page2 = await repository.findAll({ page: 2, limit: 5 })
      const page3 = await repository.findAll({ page: 3, limit: 5 })

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)
      expect(page3).toHaveLength(5)

      // Ensure different users on each page
      const page1Ids = page1.map((u) => u.id)
      const page2Ids = page2.map((u) => u.id)
      expect(page1Ids).not.toEqual(page2Ids)
    })

    it('should return users ordered by created_at desc', async () => {
      const user1 = await createTestUser(db, { name: 'First' })
      const user2 = await createTestUser(db, { name: 'Second' })
      const user3 = await createTestUser(db, { name: 'Third' })

      const users = await repository.findAll()

      // Most recent first
      expect(users[0]?.id).toBe(user3.id)
      expect(users[1]?.id).toBe(user2.id)
      expect(users[2]?.id).toBe(user1.id)
    })

    it('should handle page beyond available users', async () => {
      await createTestUsers(db, 3)

      const users = await repository.findAll({ page: 10, limit: 10 })

      expect(users).toEqual([])
    })
  })

  describe('update', () => {
    it('should update user name', async () => {
      const user = await createTestUser(db, { name: 'Original Name' })

      const updated = await repository.update(user.id, {
        name: 'Updated Name',
      })

      expect(updated.id).toBe(user.id)
      expect(updated.name).toBe('Updated Name')
      expect(updated.email).toBe(user.email) // Other fields unchanged
    })

    it('should update user email', async () => {
      const user = await createTestUser(db, { email: 'old@example.com' })

      const updated = await repository.update(user.id, {
        email: 'new@example.com',
      })

      expect(updated.email).toBe('new@example.com')
    })

    it('should update user role', async () => {
      const user = await createTestUser(db, { role: 'student' })

      const updated = await repository.update(user.id, { role: 'teacher' })

      expect(updated.role).toBe('teacher')
    })

    it('should update suspended status', async () => {
      const user = await createTestUser(db, { suspended: false })

      const updated = await repository.update(user.id, { suspended: true })

      expect(updated.suspended).toBe(true)
    })

    it('should update multiple fields at once', async () => {
      const user = await createTestUser(db, {
        name: 'Old Name',
        email: 'old@example.com',
        role: 'student',
      })

      const updated = await repository.update(user.id, {
        name: 'New Name',
        email: 'new@example.com',
        role: 'teacher',
      })

      expect(updated.name).toBe('New Name')
      expect(updated.email).toBe('new@example.com')
      expect(updated.role).toBe('teacher')
    })

    it('should throw error for non-existent user', async () => {
      await expect(
        repository.update('00000000-0000-0000-0000-000000000000', {
          name: 'New Name',
        })
      ).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete existing user', async () => {
      const user = await createTestUser(db)

      await repository.delete(user.id)

      const found = await repository.findById(user.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent user', async () => {
      await expect(
        repository.delete('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow()
    })
  })

  describe('suspend', () => {
    it('should suspend active user', async () => {
      const user = await createTestUser(db, { suspended: false })

      const suspended = await repository.suspend(user.id)

      expect(suspended.id).toBe(user.id)
      expect(suspended.suspended).toBe(true)
    })

    it('should suspend already suspended user (idempotent)', async () => {
      const user = await createTestUser(db, { suspended: true })

      const suspended = await repository.suspend(user.id)

      expect(suspended.suspended).toBe(true)
    })

    it('should throw error for non-existent user', async () => {
      await expect(
        repository.suspend('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow()
    })
  })

  describe('unsuspend', () => {
    it('should unsuspend suspended user', async () => {
      const user = await createTestUser(db, { suspended: true })

      const unsuspended = await repository.unsuspend(user.id)

      expect(unsuspended.id).toBe(user.id)
      expect(unsuspended.suspended).toBe(false)
    })

    it('should unsuspend already active user (idempotent)', async () => {
      const user = await createTestUser(db, { suspended: false })

      const unsuspended = await repository.unsuspend(user.id)

      expect(unsuspended.suspended).toBe(false)
    })

    it('should throw error for non-existent user', async () => {
      await expect(
        repository.unsuspend('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow()
    })
  })

  describe('findByRole', () => {
    it('should find all admins', async () => {
      await createTestUser(db, { role: 'admin' })
      await createTestUser(db, { role: 'admin' })
      await createTestUser(db, { role: 'teacher' })
      await createTestUser(db, { role: 'student' })

      const admins = await repository.findByRole('admin')

      expect(admins).toHaveLength(2)
      expect(admins.every((u) => u.role === 'admin')).toBe(true)
    })

    it('should find all teachers', async () => {
      await createTestUser(db, { role: 'admin' })
      await createTestUser(db, { role: 'teacher' })
      await createTestUser(db, { role: 'teacher' })
      await createTestUser(db, { role: 'teacher' })

      const teachers = await repository.findByRole('teacher')

      expect(teachers).toHaveLength(3)
      expect(teachers.every((u) => u.role === 'teacher')).toBe(true)
    })

    it('should find all students', async () => {
      await createTestUsers(db, 5, { role: 'student' })
      await createTestUser(db, { role: 'teacher' })

      const students = await repository.findByRole('student')

      expect(students).toHaveLength(5)
      expect(students.every((u) => u.role === 'student')).toBe(true)
    })

    it('should return empty array when no users with role exist', async () => {
      await createTestUser(db, { role: 'student' })

      const admins = await repository.findByRole('admin')

      expect(admins).toEqual([])
    })
  })

  describe('findSuspended', () => {
    it('should find all suspended users', async () => {
      await createTestUser(db, { suspended: true })
      await createTestUser(db, { suspended: true })
      await createTestUser(db, { suspended: false })
      await createTestUser(db, { suspended: false })

      const suspended = await repository.findSuspended()

      expect(suspended).toHaveLength(2)
      expect(suspended.every((u) => u.suspended === true)).toBe(true)
    })

    it('should return empty array when no suspended users exist', async () => {
      await createTestUsers(db, 3, { suspended: false })

      const suspended = await repository.findSuspended()

      expect(suspended).toEqual([])
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      await createTestUser(db, {
        name: 'John Smith',
        email: 'john.smith@example.com',
      })
      await createTestUser(db, {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
      })
      await createTestUser(db, {
        name: 'Bob Johnson',
        email: 'bob@company.com',
      })
    })

    it('should search by partial name match', async () => {
      const results = await repository.search('john')

      expect(results).toHaveLength(2) // John Smith and Bob Johnson
      expect(results.some((u) => u.name === 'John Smith')).toBe(true)
      expect(results.some((u) => u.name === 'Bob Johnson')).toBe(true)
    })

    it('should search by partial email match', async () => {
      const results = await repository.search('example.com')

      expect(results).toHaveLength(2)
      expect(results.every((u) => u.email.includes('example.com'))).toBe(true)
    })

    it('should be case-insensitive', async () => {
      const results = await repository.search('JOHN')

      expect(results).toHaveLength(2)
    })

    it('should return empty array for no matches', async () => {
      const results = await repository.search('nonexistent')

      expect(results).toEqual([])
    })

    it('should paginate search results', async () => {
      await createTestUsers(db, 15, { name: 'Test User' })

      const page1 = await repository.search('Test', { page: 1, limit: 5 })
      const page2 = await repository.search('Test', { page: 2, limit: 5 })

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)
    })
  })

  describe('count', () => {
    it('should return 0 when no users exist', async () => {
      const count = await repository.count()

      expect(count).toBe(0)
    })

    it('should count all users', async () => {
      await createTestUsers(db, 10)

      const count = await repository.count()

      expect(count).toBe(10)
    })

    it('should return correct count after deletions', async () => {
      const users = await createTestUsers(db, 5)

      await repository.delete(users[0]!.id)
      await repository.delete(users[1]!.id)

      const count = await repository.count()

      expect(count).toBe(3)
    })
  })

  describe('countByRole', () => {
    it('should count users by role', async () => {
      await createTestUsers(db, 3, { role: 'admin' })
      await createTestUsers(db, 5, { role: 'teacher' })
      await createTestUsers(db, 7, { role: 'student' })

      const adminCount = await repository.countByRole('admin')
      const teacherCount = await repository.countByRole('teacher')
      const studentCount = await repository.countByRole('student')

      expect(adminCount).toBe(3)
      expect(teacherCount).toBe(5)
      expect(studentCount).toBe(7)
    })

    it('should return 0 for role with no users', async () => {
      await createTestUsers(db, 5, { role: 'student' })

      const adminCount = await repository.countByRole('admin')

      expect(adminCount).toBe(0)
    })
  })

  describe('countSuspended', () => {
    it('should count suspended users', async () => {
      await createTestUsers(db, 3, { suspended: true })
      await createTestUsers(db, 7, { suspended: false })

      const count = await repository.countSuspended()

      expect(count).toBe(3)
    })

    it('should return 0 when no suspended users exist', async () => {
      await createTestUsers(db, 5, { suspended: false })

      const count = await repository.countSuspended()

      expect(count).toBe(0)
    })
  })

  describe('findWithFilters', () => {
    beforeEach(async () => {
      await createTestUser(db, { role: 'admin', suspended: false })
      await createTestUser(db, { role: 'admin', suspended: true })
      await createTestUser(db, { role: 'teacher', suspended: false })
      await createTestUser(db, { role: 'teacher', suspended: true })
      await createTestUser(db, { role: 'student', suspended: false })
      await createTestUser(db, { role: 'student', suspended: true })
    })

    it('should filter by role only', async () => {
      const teachers = await repository.findWithFilters({ role: 'teacher' })

      expect(teachers).toHaveLength(2)
      expect(teachers.every((u) => u.role === 'teacher')).toBe(true)
    })

    it('should filter by suspended status only', async () => {
      const suspended = await repository.findWithFilters({ suspended: true })

      expect(suspended).toHaveLength(3)
      expect(suspended.every((u) => u.suspended === true)).toBe(true)
    })

    it('should filter by both role and suspended status', async () => {
      const suspendedStudents = await repository.findWithFilters({
        role: 'student',
        suspended: true,
      })

      expect(suspendedStudents).toHaveLength(1)
      expect(suspendedStudents[0]?.role).toBe('student')
      expect(suspendedStudents[0]?.suspended).toBe(true)
    })

    it('should return all users when no filters provided', async () => {
      const all = await repository.findWithFilters()

      expect(all).toHaveLength(6)
    })

    it('should paginate filtered results', async () => {
      await createTestUsers(db, 10, { role: 'student' })

      const page1 = await repository.findWithFilters(
        { role: 'student' },
        { page: 1, limit: 5 }
      )
      const page2 = await repository.findWithFilters(
        { role: 'student' },
        { page: 2, limit: 5 }
      )

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)
    })
  })

  describe('batchSuspend', () => {
    it('should suspend multiple users', async () => {
      const users = await createTestUsers(db, 5, { suspended: false })
      const idsToSuspend = [users[0]!.id, users[2]!.id, users[4]!.id]

      const count = await repository.batchSuspend(idsToSuspend)

      expect(count).toBe(3)

      const suspended = await repository.findSuspended()
      expect(suspended).toHaveLength(3)
    })

    it('should return 0 for empty array', async () => {
      const count = await repository.batchSuspend([])

      expect(count).toBe(0)
    })

    it('should handle non-existent IDs gracefully', async () => {
      const count = await repository.batchSuspend([
        '00000000-0000-0000-0000-000000000000',
      ])

      expect(count).toBe(0)
    })

    it('should be idempotent for already suspended users', async () => {
      const user = await createTestUser(db, { suspended: true })

      const count = await repository.batchSuspend([user.id])

      expect(count).toBe(1) // Still counts as "updated"
    })

    it('should handle undefined numUpdatedRows gracefully', async () => {
      // Create a mock db that returns undefined numUpdatedRows
      const mockDb = {
        updateTable: () => ({
          set: () => ({
            where: () => ({
              executeTakeFirst: async () => ({ numUpdatedRows: undefined }),
            }),
          }),
        }),
      }

      const mockRepository = new UserRepository(mockDb as never)
      const count = await mockRepository.batchSuspend(['test-id'])

      expect(count).toBe(0)
    })
  })

  describe('batchUnsuspend', () => {
    it('should unsuspend multiple users', async () => {
      const users = await createTestUsers(db, 5, { suspended: true })
      const idsToUnsuspend = [users[1]!.id, users[3]!.id]

      const count = await repository.batchUnsuspend(idsToUnsuspend)

      expect(count).toBe(2)

      const suspended = await repository.findSuspended()
      expect(suspended).toHaveLength(3) // 5 - 2 = 3
    })

    it('should return 0 for empty array', async () => {
      const count = await repository.batchUnsuspend([])

      expect(count).toBe(0)
    })

    it('should handle non-existent IDs gracefully', async () => {
      const count = await repository.batchUnsuspend([
        '00000000-0000-0000-0000-000000000000',
      ])

      expect(count).toBe(0)
    })

    it('should handle undefined numUpdatedRows gracefully', async () => {
      // Create a mock db that returns undefined numUpdatedRows
      const mockDb = {
        updateTable: () => ({
          set: () => ({
            where: () => ({
              executeTakeFirst: async () => ({ numUpdatedRows: undefined }),
            }),
          }),
        }),
      }

      const mockRepository = new UserRepository(mockDb as never)
      const count = await mockRepository.batchUnsuspend(['test-id'])

      expect(count).toBe(0)
    })
  })

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      await createTestUser(db, { email: 'exists@example.com' })

      const exists = await repository.emailExists('exists@example.com')

      expect(exists).toBe(true)
    })

    it('should return false for non-existent email', async () => {
      const exists = await repository.emailExists('nonexistent@example.com')

      expect(exists).toBe(false)
    })

    it('should be case-sensitive', async () => {
      await createTestUser(db, { email: 'test@example.com' })

      const exists = await repository.emailExists('TEST@EXAMPLE.COM')

      expect(exists).toBe(false) // Case-sensitive check
    })
  })

  describe('findByIds', () => {
    it('should find multiple users by IDs', async () => {
      const users = await createTestUsers(db, 5)
      const idsToFind = [users[0]!.id, users[2]!.id, users[4]!.id]

      const found = await repository.findByIds(idsToFind)

      expect(found).toHaveLength(3)
      expect(found.map((u) => u.id).sort()).toEqual(idsToFind.sort())
    })

    it('should return empty array for empty input', async () => {
      const found = await repository.findByIds([])

      expect(found).toEqual([])
    })

    it('should return only existing users', async () => {
      const users = await createTestUsers(db, 2)
      const idsToFind = [
        users[0]!.id,
        '00000000-0000-0000-0000-000000000000',
      ]

      const found = await repository.findByIds(idsToFind)

      expect(found).toHaveLength(1)
      expect(found[0]?.id).toBe(users[0]?.id)
    })

    it('should handle all non-existent IDs', async () => {
      const found = await repository.findByIds([
        '00000000-0000-0000-0000-000000000000',
        '11111111-1111-1111-1111-111111111111',
      ])

      expect(found).toEqual([])
    })
  })

  describe('transaction support', () => {
    it('should work within a transaction', async () => {
      await db.transaction().execute(async (trx) => {
        const txRepository = new UserRepository(trx)

        const user = await txRepository.create({
          email: 'tx@example.com',
          password_hash: 'hash',
          role: 'student',
          name: 'Transaction User',
        })

        expect(user.id).toBeDefined()

        // Should be visible within transaction
        const found = await txRepository.findById(user.id)
        expect(found).not.toBeNull()
      })
    })

    it('should rollback on transaction failure', async () => {
      let userId: string | undefined

      try {
        await db.transaction().execute(async (trx) => {
          const txRepository = new UserRepository(trx)

          const user = await txRepository.create({
            email: 'rollback@example.com',
            password_hash: 'hash',
            role: 'student',
            name: 'Rollback User',
          })

          userId = user.id

          // Force transaction rollback
          throw new Error('Force rollback')
        })
      } catch {
        // Expected error
      }

      // User should not exist after rollback
      if (userId) {
        const found = await repository.findById(userId)
        expect(found).toBeNull()
      }
    })
  })
})
