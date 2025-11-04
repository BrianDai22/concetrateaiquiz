/**
 * Role-Based Access Control Hook
 * Checks if authenticated user has required role
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { ForbiddenError, UnauthorizedError } from '@concentrate/shared'
import type { UserRole } from '@concentrate/database'

/**
 * Require specific role(s)
 * Must be used AFTER requireAuth hook
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    // User must be authenticated first
    if (!request.user) {
      throw new UnauthorizedError('Authentication required')
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      )
    }
  }
}
