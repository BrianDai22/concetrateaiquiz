/**
 * Route Registration
 * Registers all API routes
 */

import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.js'
import { adminRoutes } from './admin.js'
import { teacherRoutes } from './teacher.js'
import { studentRoutes } from './student.js'
import { statsRoutes } from './stats.js'

export async function registerRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return { message: 'Canvas School Portal API v0' }
  })

  // Auth routes
  await app.register(authRoutes, { prefix: '/auth' })

  // Admin routes
  await app.register(adminRoutes, { prefix: '/admin' })

  // Teacher routes
  await app.register(teacherRoutes, { prefix: '/teacher' })

  // Student routes
  await app.register(studentRoutes, { prefix: '/student' })

  // Stats routes (public)
  await app.register(statsRoutes, { prefix: '/stats' })
}
