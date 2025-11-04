/**
 * Fastify Type Extensions
 * Extends Fastify's request interface to add custom properties
 */

import 'fastify'
import type { Kysely } from 'kysely'
import type { Database, UserRole } from '@concentrate/database'

declare module 'fastify' {
  interface FastifyRequest {
    db: Kysely<Database>
    user?: {
      userId: string
      role: UserRole
    }
  }
}
