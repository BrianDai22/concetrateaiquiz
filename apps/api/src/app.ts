/**
 * Fastify App Factory
 * Creates and configures the Fastify application with all plugins and routes
 */

import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import oauth2 from '@fastify/oauth2'
import { db } from '@concentrate/database'
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  AlreadyExistsError,
  ValidationError,
  InvalidStateError,
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
} from '@concentrate/shared'
import { registerRoutes } from './routes/index.js'

/**
 * Build and configure Fastify app
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] || 'info',
    },
  })

  // Register CORS with dynamic origin
  await app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost',
      ]

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true)
        return
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
  })

  // Register Helmet for security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable for development
  })

  // Register Cookie support
  await app.register(cookie, {
    secret: process.env['COOKIE_SECRET'] || 'secret-key-for-development-only',
    parseOptions: {},
  })

  // Register Google OAuth2 plugin
  await app.register(oauth2, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env['GOOGLE_CLIENT_ID'] || '',
        secret: process.env['GOOGLE_CLIENT_SECRET'] || '',
      },
      auth: oauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/api/v0/auth/oauth/google',
    callbackUri: process.env['OAUTH_CALLBACK_URL'] || 'http://localhost:3001/api/v0/auth/oauth/google/callback',
    scope: ['openid', 'profile', 'email'],
  })

  // Inject database into request context
  app.decorateRequest('db', { getter: () => db })

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Register all routes
  await app.register(registerRoutes, { prefix: '/api/v0' })

  // Global error handler
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Log the error
    request.log.error(error)

    // Map custom errors to HTTP status codes
    if (error instanceof NotFoundError) {
      return reply.code(404).send({
        error: 'NotFoundError',
        message: error.message,
        statusCode: 404,
      })
    }

    if (error instanceof UnauthorizedError || error instanceof TokenExpiredError || error instanceof TokenInvalidError) {
      return reply.code(401).send({
        error: 'UnauthorizedError',
        message: error.message,
        statusCode: 401,
      })
    }

    if (error instanceof ForbiddenError) {
      return reply.code(403).send({
        error: 'ForbiddenError',
        message: error.message,
        statusCode: 403,
      })
    }

    if (error instanceof AlreadyExistsError) {
      return reply.code(409).send({
        error: 'AlreadyExistsError',
        message: error.message,
        statusCode: 409,
      })
    }

    if (error instanceof InvalidCredentialsError) {
      return reply.code(401).send({
        error: 'InvalidCredentialsError',
        message: error.message,
        statusCode: 401,
      })
    }

    if (error instanceof ValidationError) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: error.message,
        statusCode: 400,
      })
    }

    if (error instanceof InvalidStateError) {
      return reply.code(400).send({
        error: 'InvalidStateError',
        message: error.message,
        statusCode: 400,
      })
    }

    // Zod validation errors (from schema validation)
    if (error.name === 'ZodError' || error.validation) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: 'Invalid request data',
        details: error.validation,
        statusCode: 400,
      })
    }

    // Default error
    return reply.code(500).send({
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  })

  return app
}
