import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserService } from '../../src/UserService'
import type { UserRepository } from '@concentrate/database'
import type { User, NewUser, UserUpdate } from '@concentrate/database'
import {
  AlreadyExistsError,
  NotFoundError,
  InvalidStateError,
  ForbiddenError,
} from '@concentrate/shared'

// Mock the hashPassword function
vi.mock('@concentrate/shared', async () => {
  const actual = await vi.importActual('@concentrate/shared')
  return {
    ...actual,
    hashPassword: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
  }
})

describe('UserService - Unit Tests', () => {
  let service: UserService
  let mockUserRepository: Partial<UserRepository>
  let mockDb: unknown

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'Test User',
    role: 'student',
    suspended: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  beforeEach(() => {
    // Reset mocks
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      suspend: vi.fn(),
      unsuspend: vi.fn(),
      findByRole: vi.fn(),
      findSuspended: vi.fn(),
      findAll: vi.fn(),
      countByRole: vi.fn(),
      count: vi.fn(),
      emailExists: vi.fn(),
      batchSuspend: vi.fn(),
    }

    mockDb = {} as unknown
    service = new UserService(mockDb as never)
    // Replace the repository with our mock
    ;(service as unknown as { userRepository: Partial<UserRepository> }).userRepository =
      mockUserRepository
  })

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const newUser: NewUser = {
        email: 'new@example.com',
        password_hash: 'plain_password',
        name: 'New User',
        role: 'student',
      }

      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue({
        ...mockUser,
        email: newUser.email,
        password_hash: 'hashed_plain_password',
      })

      const result = await service.createUser(newUser)

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(newUser.email)
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: newUser.email,
          password_hash: 'hashed_plain_password',
        })
      )
      expect(result.email).toBe(newUser.email)
    })

    it('should throw AlreadyExistsError if email exists', async () => {
      const newUser: NewUser = {
        email: 'existing@example.com',
        password_hash: 'password',
        name: 'User',
        role: 'student',
      }

      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)

      await expect(service.createUser(newUser)).rejects.toThrow(AlreadyExistsError)
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(newUser.email)
      expect(mockUserRepository.create).not.toHaveBeenCalled()
    })

    it('should handle user creation with null password', async () => {
      const newUser: NewUser = {
        email: 'new@example.com',
        password_hash: null,
        name: 'New User',
        role: 'student',
      }

      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockUserRepository.create = vi.fn().mockResolvedValue({
        ...mockUser,
        email: newUser.email,
        password_hash: null,
      })

      const result = await service.createUser(newUser)

      expect(result.password_hash).toBeNull()
    })
  })

  describe('getUserById', () => {
    it('should return user if found', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)

      const result = await service.getUserById('user-1')

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1')
      expect(result).toEqual(mockUser)
    })

    it('should throw NotFoundError if user not found', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.getUserById('nonexistent')).rejects.toThrow(NotFoundError)
      expect(mockUserRepository.findById).toHaveBeenCalledWith('nonexistent')
    })
  })

  describe('getUserByEmail', () => {
    it('should normalize email and return user', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(mockUser)

      const result = await service.getUserByEmail('  TEST@EXAMPLE.COM  ')

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(result).toEqual(mockUser)
    })

    it('should throw NotFoundError if user not found', async () => {
      mockUserRepository.findByEmail = vi.fn().mockResolvedValue(null)

      await expect(service.getUserByEmail('notfound@example.com')).rejects.toThrow(
        NotFoundError
      )
    })
  })

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updates: UserUpdate = { name: 'Updated Name' }
      const updatedUser = { ...mockUser, ...updates }

      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue(updatedUser)

      const result = await service.updateUser('user-1', updates)

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1')
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', updates)
      expect(result.name).toBe(updates.name)
    })

    it('should check email uniqueness when updating email', async () => {
      const updates: UserUpdate = { email: 'newemail@example.com' }

      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.emailExists = vi.fn().mockResolvedValue(false)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        ...updates,
      })

      await service.updateUser('user-1', updates)

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith(updates.email)
    })

    it('should throw AlreadyExistsError if new email exists', async () => {
      const updates: UserUpdate = { email: 'existing@example.com' }

      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.emailExists = vi.fn().mockResolvedValue(true)

      await expect(service.updateUser('user-1', updates)).rejects.toThrow(
        AlreadyExistsError
      )
      expect(mockUserRepository.update).not.toHaveBeenCalled()
    })

    it('should hash password if password is being updated', async () => {
      const updates: UserUpdate = { password_hash: 'newpassword' }

      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.update = vi.fn().mockResolvedValue({
        ...mockUser,
        password_hash: 'hashed_newpassword',
      })

      await service.updateUser('user-1', updates)

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          password_hash: 'hashed_newpassword',
        })
      )
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.delete = vi.fn().mockResolvedValue(undefined)

      await service.deleteUser('user-1')

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1')
      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1')
    })

    it('should prevent deletion of last admin', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const }

      mockUserRepository.findById = vi.fn().mockResolvedValue(adminUser)
      mockUserRepository.countByRole = vi.fn().mockResolvedValue(1)

      await expect(service.deleteUser('user-1')).rejects.toThrow(InvalidStateError)
      expect(mockUserRepository.delete).not.toHaveBeenCalled()
    })

    it('should allow deletion of non-last admin', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const }

      mockUserRepository.findById = vi.fn().mockResolvedValue(adminUser)
      mockUserRepository.countByRole = vi.fn().mockResolvedValue(2)
      mockUserRepository.delete = vi.fn().mockResolvedValue(undefined)

      await service.deleteUser('user-1')

      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1')
    })
  })

  describe('suspendUser', () => {
    it('should suspend user successfully', async () => {
      const suspendedUser = { ...mockUser, suspended: true }

      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.suspend = vi.fn().mockResolvedValue(suspendedUser)

      const result = await service.suspendUser('user-1')

      expect(mockUserRepository.suspend).toHaveBeenCalledWith('user-1')
      expect(result.suspended).toBe(true)
    })

    it('should prevent self-suspension', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)

      await expect(service.suspendUser('user-1', 'user-1')).rejects.toThrow(
        ForbiddenError
      )
      expect(mockUserRepository.suspend).not.toHaveBeenCalled()
    })

    it('should prevent suspending last admin', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const }

      mockUserRepository.findById = vi.fn().mockResolvedValue(adminUser)
      mockUserRepository.countByRole = vi.fn().mockResolvedValue(1)

      await expect(service.suspendUser('admin-1', 'user-2')).rejects.toThrow(
        InvalidStateError
      )
      expect(mockUserRepository.suspend).not.toHaveBeenCalled()
    })

    it('should return user if already suspended', async () => {
      const suspendedUser = { ...mockUser, suspended: true }

      mockUserRepository.findById = vi.fn().mockResolvedValue(suspendedUser)

      const result = await service.suspendUser('user-1')

      expect(mockUserRepository.suspend).not.toHaveBeenCalled()
      expect(result).toEqual(suspendedUser)
    })
  })

  describe('unsuspendUser', () => {
    it('should unsuspend user successfully', async () => {
      const suspendedUser = { ...mockUser, suspended: true }
      const activeUser = { ...mockUser, suspended: false }

      mockUserRepository.findById = vi.fn().mockResolvedValue(suspendedUser)
      mockUserRepository.unsuspend = vi.fn().mockResolvedValue(activeUser)

      const result = await service.unsuspendUser('user-1')

      expect(mockUserRepository.unsuspend).toHaveBeenCalledWith('user-1')
      expect(result.suspended).toBe(false)
    })

    it('should return user if already active', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)

      const result = await service.unsuspendUser('user-1')

      expect(mockUserRepository.unsuspend).not.toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })
  })

  describe('searchUsers', () => {
    it('should return all users when no filters', async () => {
      const users = [mockUser]

      mockUserRepository.findAll = vi.fn().mockResolvedValue(users)

      const result = await service.searchUsers()

      expect(mockUserRepository.findAll).toHaveBeenCalled()
      expect(result).toEqual(users)
    })

    it('should filter by role only', async () => {
      const users = [mockUser]

      mockUserRepository.findByRole = vi.fn().mockResolvedValue(users)

      const result = await service.searchUsers({ role: 'student' })

      expect(mockUserRepository.findByRole).toHaveBeenCalledWith('student')
      expect(result).toEqual(users)
    })

    it('should filter by suspended status only', async () => {
      const users = [mockUser]

      mockUserRepository.findSuspended = vi.fn().mockResolvedValue(users)

      const result = await service.searchUsers({ isSuspended: true })

      expect(mockUserRepository.findSuspended).toHaveBeenCalled()
      expect(result).toEqual(users)
    })

    it('should filter by role and suspension status', async () => {
      const users = [{ ...mockUser, suspended: true }]

      mockUserRepository.findByRole = vi.fn().mockResolvedValue(users)

      const result = await service.searchUsers({
        role: 'student',
        isSuspended: true,
      })

      expect(mockUserRepository.findByRole).toHaveBeenCalledWith('student')
      expect(result).toEqual(users)
    })
  })

  describe('getUsersByRole', () => {
    it('should return users by role', async () => {
      const users = [mockUser]

      mockUserRepository.findByRole = vi.fn().mockResolvedValue(users)

      const result = await service.getUsersByRole('student')

      expect(mockUserRepository.findByRole).toHaveBeenCalledWith('student')
      expect(result).toEqual(users)
    })
  })

  describe('batchSuspendUsers', () => {
    it('should suspend multiple users', async () => {
      const ids = ['user-1', 'user-2']

      mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)
      mockUserRepository.batchSuspend = vi.fn().mockResolvedValue(2)

      const result = await service.batchSuspendUsers(ids)

      expect(result).toBe(2)
      expect(mockUserRepository.batchSuspend).toHaveBeenCalledWith(ids)
    })

    it('should return 0 for empty array', async () => {
      const result = await service.batchSuspendUsers([])

      expect(result).toBe(0)
      expect(mockUserRepository.batchSuspend).not.toHaveBeenCalled()
    })

    it('should prevent batch suspension of self', async () => {
      const ids = ['user-1', 'user-2']

      await expect(service.batchSuspendUsers(ids, 'user-1')).rejects.toThrow(
        ForbiddenError
      )
      expect(mockUserRepository.batchSuspend).not.toHaveBeenCalled()
    })

    it('should prevent suspending all admins', async () => {
      const ids = ['admin-1', 'admin-2']
      const admin1 = { ...mockUser, id: 'admin-1', role: 'admin' as const }
      const admin2 = { ...mockUser, id: 'admin-2', role: 'admin' as const }

      mockUserRepository.findById = vi
        .fn()
        .mockResolvedValueOnce(admin1)
        .mockResolvedValueOnce(admin2)
      mockUserRepository.countByRole = vi.fn().mockResolvedValue(2)

      await expect(service.batchSuspendUsers(ids)).rejects.toThrow(InvalidStateError)
      expect(mockUserRepository.batchSuspend).not.toHaveBeenCalled()
    })
  })

  describe('getUserCount', () => {
    it('should return user count', async () => {
      mockUserRepository.count = vi.fn().mockResolvedValue(10)

      const result = await service.getUserCount()

      expect(mockUserRepository.count).toHaveBeenCalled()
      expect(result).toBe(10)
    })
  })

  describe('getUserCountByRole', () => {
    it('should return count by role', async () => {
      mockUserRepository.countByRole = vi.fn().mockResolvedValue(5)

      const result = await service.getUserCountByRole('student')

      expect(mockUserRepository.countByRole).toHaveBeenCalledWith('student')
      expect(result).toBe(5)
    })
  })

  describe('emailExists', () => {
    it('should normalize email and check existence', async () => {
      mockUserRepository.emailExists = vi.fn().mockResolvedValue(true)

      const result = await service.emailExists('  TEST@EXAMPLE.COM  ')

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith('test@example.com')
      expect(result).toBe(true)
    })
  })
})
