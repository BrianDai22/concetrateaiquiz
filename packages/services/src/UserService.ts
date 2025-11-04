import type { Kysely, Transaction } from 'kysely'
import type {
  Database,
  User,
  NewUser,
  UserUpdate,
  UserRole,
} from '@concentrate/database'
import { UserRepository } from '@concentrate/database'
import {
  hashPassword,
  AlreadyExistsError,
  NotFoundError,
  InvalidStateError,
  ForbiddenError,
} from '@concentrate/shared'

/**
 * UserService - Business logic for user management
 *
 * Responsibilities:
 * - User CRUD operations with business rules
 * - User suspension/unsuspension
 * - User search and filtering
 * - Password hashing
 * - Email uniqueness validation
 *
 * Business Rules:
 * - Email must be unique across all users
 * - Passwords must be hashed before storage
 * - Cannot suspend yourself
 * - Cannot suspend/delete the last admin
 * - Cannot delete user with active data (classes, assignments, etc.)
 */
export class UserService {
  private userRepository: UserRepository

  constructor(db: Kysely<Database> | Transaction<Database>) {
    this.userRepository = new UserRepository(db)
  }

  /**
   * Create a new user
   * - Validates email uniqueness
   * - Hashes password before storage
   * @param data - User data
   * @returns Created user
   * @throws AlreadyExistsError if email already exists
   */
  async createUser(data: NewUser): Promise<User> {
    // Normalize email to lowercase
    const normalizedEmail = data.email.toLowerCase().trim()

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(normalizedEmail)
    if (existingUser) {
      throw new AlreadyExistsError(`User with email ${data.email} already exists`)
    }

    // Hash password if provided
    let hashedPassword = data.password_hash
    if (data.password_hash) {
      hashedPassword = await hashPassword(data.password_hash)
    }

    // Create user with normalized email
    const user = await this.userRepository.create({
      ...data,
      email: normalizedEmail,
      password_hash: hashedPassword ?? null,
    })

    return user
  }

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User if found
   * @throws NotFoundError if user not found
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`)
    }
    return user
  }

  /**
   * Get user by email
   * - Normalizes email to lowercase
   * @param email - User email
   * @returns User if found
   * @throws NotFoundError if user not found
   */
  async getUserByEmail(email: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim()
    const user = await this.userRepository.findByEmail(normalizedEmail)
    if (!user) {
      throw new NotFoundError(`User with email ${email} not found`)
    }
    return user
  }

  /**
   * Update user
   * - Validates email uniqueness if email is being changed
   * - Hashes password if password is being changed
   * @param id - User ID
   * @param updates - User updates
   * @returns Updated user
   * @throws NotFoundError if user not found
   * @throws AlreadyExistsError if new email already exists
   */
  async updateUser(id: string, updates: UserUpdate): Promise<User> {
    // Check if user exists
    const existingUser = await this.getUserById(id)

    // If email is being updated, check uniqueness
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await this.userRepository.emailExists(updates.email)
      if (emailExists) {
        throw new AlreadyExistsError(
          `User with email ${updates.email} already exists`
        )
      }
    }

    // If password is being updated, hash it
    let processedUpdates = { ...updates }
    if (updates.password_hash) {
      const hashedPassword = await hashPassword(updates.password_hash)
      processedUpdates = {
        ...updates,
        password_hash: hashedPassword,
      }
    }

    // Update user
    const updatedUser = await this.userRepository.update(id, processedUpdates)
    return updatedUser
  }

  /**
   * Delete user
   * - Prevents deletion of last admin
   * - Should check for active data (implemented in repository)
   * @param id - User ID
   * @throws NotFoundError if user not found
   * @throws InvalidStateError if trying to delete last admin
   */
  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id)

    // Prevent deletion of last admin
    if (user.role === 'admin') {
      const adminCount = await this.userRepository.countByRole('admin')
      if (adminCount <= 1) {
        throw new InvalidStateError(
          'Cannot delete the last admin user'
        )
      }
    }

    await this.userRepository.delete(id)
  }

  /**
   * Suspend user
   * - Prevents suspending yourself (requires current user ID)
   * - Prevents suspending last admin
   * @param id - User ID to suspend
   * @param currentUserId - ID of user performing the action
   * @throws NotFoundError if user not found
   * @throws ForbiddenError if trying to suspend yourself
   * @throws InvalidStateError if trying to suspend last admin
   */
  async suspendUser(id: string, currentUserId?: string): Promise<User> {
    const user = await this.getUserById(id)

    // Prevent self-suspension
    if (currentUserId && id === currentUserId) {
      throw new ForbiddenError('You cannot suspend yourself')
    }

    // Prevent suspending last admin
    if (user.role === 'admin') {
      const adminCount = await this.userRepository.countByRole('admin')
      if (adminCount <= 1) {
        throw new InvalidStateError(
          'Cannot suspend the last admin user'
        )
      }
    }

    // Check if already suspended
    if (user.suspended) {
      return user
    }

    const suspendedUser = await this.userRepository.suspend(id)
    return suspendedUser
  }

  /**
   * Unsuspend user
   * @param id - User ID to unsuspend
   * @returns Updated user
   * @throws NotFoundError if user not found
   */
  async unsuspendUser(id: string): Promise<User> {
    const user = await this.getUserById(id)

    // Check if already active
    if (!user.suspended) {
      return user
    }

    const unsuspendedUser = await this.userRepository.unsuspend(id)
    return unsuspendedUser
  }

  /**
   * Search users with filters and pagination
   * @param options - Search options
   * @returns List of users
   */
  async searchUsers(options?: {
    role?: UserRole
    isSuspended?: boolean
    page?: number
    limit?: number
  }): Promise<User[]> {
    // If filtering by role and suspension status
    if (options?.role && options.isSuspended !== undefined) {
      const allUsersOfRole = await this.userRepository.findByRole(options.role)
      return allUsersOfRole.filter((user) => user.suspended === options.isSuspended)
    }

    // If filtering by role only
    if (options?.role) {
      return this.userRepository.findByRole(options.role)
    }

    // If filtering by suspension status only
    if (options?.isSuspended === true) {
      return this.userRepository.findSuspended()
    } else if (options?.isSuspended === false) {
      const allUsers = await this.userRepository.findAll(
        options?.page !== undefined && options?.limit !== undefined
          ? { page: options.page, limit: options.limit }
          : undefined
      )
      return allUsers.filter((user) => !user.suspended)
    }

    // No filters
    return this.userRepository.findAll(
      options?.page !== undefined && options?.limit !== undefined
        ? { page: options.page, limit: options.limit }
        : undefined
    )
  }

  /**
   * Get users by role
   * @param role - User role
   * @returns List of users
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.findByRole(role)
  }

  /**
   * Batch suspend users
   * - Validates that current user is not in the list
   * - Prevents suspending all admins
   * @param ids - Array of user IDs to suspend
   * @param currentUserId - ID of user performing the action
   * @returns Number of users suspended
   * @throws ForbiddenError if trying to suspend yourself
   * @throws InvalidStateError if trying to suspend all admins
   */
  async batchSuspendUsers(
    ids: string[],
    currentUserId?: string
  ): Promise<number> {
    if (ids.length === 0) {
      return 0
    }

    // Prevent self-suspension
    if (currentUserId && ids.includes(currentUserId)) {
      throw new ForbiddenError(
        'You cannot suspend yourself'
      )
    }

    // Get all users to check for admins
    const users = await Promise.all(ids.map((id) => this.userRepository.findById(id)))
    const validUsers = users.filter((user): user is User => user !== null)

    // Check if we're suspending all admins
    const adminIds = validUsers
      .filter((user) => user.role === 'admin')
      .map((user) => user.id)

    if (adminIds.length > 0) {
      const totalAdmins = await this.userRepository.countByRole('admin')
      if (adminIds.length >= totalAdmins) {
        throw new InvalidStateError(
          'Cannot suspend all admin users'
        )
      }
    }

    // Batch suspend
    const count = await this.userRepository.batchSuspend(ids)
    return count
  }

  /**
   * Get user count
   * @returns Total number of users
   */
  async getUserCount(): Promise<number> {
    return this.userRepository.count()
  }

  /**
   * Get user count by role
   * @param role - User role
   * @returns Number of users with the role
   */
  async getUserCountByRole(role: UserRole): Promise<number> {
    return this.userRepository.countByRole(role)
  }

  /**
   * Check if email exists
   * @param email - Email address
   * @returns True if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim()
    return this.userRepository.emailExists(normalizedEmail)
  }
}
