/**
 * Authentication Hook
 * Verifies JWT from cookie and attaches user to request
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken, UnauthorizedError } from '@concentrate/shared'

/**
 * Require authentication
 * Verifies JWT from access_token cookie and attaches user to request
 */
export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    // Get token from cookie
    const token = request.cookies['access_token']

    if (!token) {
      throw new UnauthorizedError('Missing authentication token')
    }

    // Verify and decode token
    const payload = verifyAccessToken(token)

    // Attach user to request
    request.user = {
      userId: payload.userId,
      role: payload.role,
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error
    }
    throw new UnauthorizedError('Invalid or expired authentication token')
  }
}
