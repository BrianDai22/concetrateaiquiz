/**
 * Admin Routes
 * Admin-only endpoints for user and system management
 */

import { FastifyInstance } from 'fastify'
import { UserService } from '@concentrate/services'
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserQuerySchema,
  UserIdParamSchema,
} from '@concentrate/validation'
import { requireAuth } from '../hooks/auth.js'
import { requireRole } from '../hooks/rbac.js'

export async function adminRoutes(app: FastifyInstance) {
  /**
   * GET /admin/users
   * List all users with pagination and filtering
   */
  app.get(
    '/users',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (request, reply) => {
      const userService = new UserService(request.db)
      const validated = UserQuerySchema.parse(request.query)

      // Transform schema fields to match service signature, filtering undefined
      const searchOptions: {
        role?: 'admin' | 'teacher' | 'student'
        isSuspended?: boolean
        page?: number
        limit?: number
      } = {}

      if (validated.role !== undefined) searchOptions.role = validated.role
      if (validated.suspended !== undefined) searchOptions.isSuspended = validated.suspended
      if (validated.page !== undefined) searchOptions.page = validated.page
      if (validated.limit !== undefined) searchOptions.limit = validated.limit

      const users = await userService.searchUsers(searchOptions)
      return reply.send({ users })
    }
  )

  /**
   * POST /admin/users
   * Create a new user
   */
  app.post(
    '/users',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (request, reply) => {
      const userService = new UserService(request.db)
      const validated = CreateUserSchema.parse(request.body)

      // Transform password -> password_hash for service
      const userData = {
        email: validated.email,
        password_hash: validated.password || null,
        name: validated.name,
        role: validated.role,
        suspended: validated.suspended ?? false,
      }

      const user = await userService.createUser(userData)
      return reply.code(201).send({ user })
    }
  )

  /**
   * PUT /admin/users/:id
   * Update a user
   */
  app.put(
    '/users/:id',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (request, reply) => {
      const userService = new UserService(request.db)
      const { id } = UserIdParamSchema.parse(request.params)
      const validated = UpdateUserSchema.parse(request.body)

      // Filter out undefined properties for exactOptionalPropertyTypes
      const updates: { email?: string; name?: string; role?: 'admin' | 'teacher' | 'student' } = {}
      if (validated.email !== undefined) updates.email = validated.email
      if (validated.name !== undefined) updates.name = validated.name
      if (validated.role !== undefined) updates.role = validated.role

      const user = await userService.updateUser(id, updates)
      return reply.send({ user })
    }
  )

  /**
   * DELETE /admin/users/:id
   * Delete a user
   */
  app.delete(
    '/users/:id',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (request, reply) => {
      const userService = new UserService(request.db)
      const { id } = UserIdParamSchema.parse(request.params)

      await userService.deleteUser(id)
      return reply.code(204).send()
    }
  )

  /**
   * POST /admin/users/:id/suspend
   * Suspend a user
   */
  app.post(
    '/users/:id/suspend',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (request, reply) => {
      const userService = new UserService(request.db)
      const { id } = UserIdParamSchema.parse(request.params)

      const user = await userService.suspendUser(id, request.user!.userId)
      return reply.send({ user })
    }
  )

  /**
   * POST /admin/users/:id/unsuspend
   * Unsuspend a user
   */
  app.post(
    '/users/:id/unsuspend',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (request, reply) => {
      const userService = new UserService(request.db)
      const { id } = UserIdParamSchema.parse(request.params)

      const user = await userService.unsuspendUser(id)
      return reply.send({ user })
    }
  )

  /**
   * GET /admin/teacher-groups
   * List teacher groups
   * TODO: Implement teacher groups in future session
   */
  app.get(
    '/teacher-groups',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (_request, reply) => {
      return reply.code(501).send({
        error: 'Not implemented',
        message: 'Teacher groups will be implemented in a future session',
      })
    }
  )

  /**
   * POST /admin/teacher-groups
   * Create teacher group
   * TODO: Implement teacher groups in future session
   */
  app.post(
    '/teacher-groups',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (_request, reply) => {
      return reply.code(501).send({
        error: 'Not implemented',
        message: 'Teacher groups will be implemented in a future session',
      })
    }
  )

  /**
   * PUT /admin/teacher-groups/:id
   * Update teacher group
   * TODO: Implement teacher groups in future session
   */
  app.put(
    '/teacher-groups/:id',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (_request, reply) => {
      return reply.code(501).send({
        error: 'Not implemented',
        message: 'Teacher groups will be implemented in a future session',
      })
    }
  )

  /**
   * DELETE /admin/teacher-groups/:id
   * Delete teacher group
   * TODO: Implement teacher groups in future session
   */
  app.delete(
    '/teacher-groups/:id',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (_request, reply) => {
      return reply.code(501).send({
        error: 'Not implemented',
        message: 'Teacher groups will be implemented in a future session',
      })
    }
  )
}
