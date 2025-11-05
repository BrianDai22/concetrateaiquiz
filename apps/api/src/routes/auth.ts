/**
 * Authentication Routes
 * Handles user registration, login, logout, token refresh, and OAuth
 */

import { FastifyInstance } from 'fastify'
import { AuthService, OAuthService, UserService, type GoogleProfile } from '@concentrate/services'
import { SessionRepository } from '@concentrate/database'
import { redis } from '@concentrate/database'
import {
  RegisterSchema,
  LoginSchema,
} from '@concentrate/validation'
import { requireAuth } from '../hooks/auth.js'

export async function authRoutes(app: FastifyInstance) {
  // AuthService will be instantiated per-request using request.db

  /**
   * POST /auth/register
   * Register a new user
   */
  app.post('/register', async (request, reply) => {
    const validated = RegisterSchema.parse(request.body)
    const authService = new AuthService(request.db)

    const user = await authService.register({
      email: validated.email,
      password_hash: validated.password,
      name: validated.name,
      role: validated.role,
    })

    return reply.code(201).send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  })

  /**
   * POST /auth/login
   * Login with email and password
   * Sets HTTP-only cookie with tokens
   */
  app.post('/login', async (request, reply) => {
    const validated = LoginSchema.parse(request.body)
    const authService = new AuthService(request.db)

    const result = await authService.login(validated.email, validated.password)

    // Set tokens as HTTP-only cookies
    reply.setCookie('access_token', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    })

    reply.setCookie('refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return reply.send({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    })
  })

  /**
   * POST /auth/logout
   * Logout and clear session
   */
  app.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    const authService = new AuthService(request.db)
    const refreshToken = request.cookies['refresh_token']

    if (refreshToken) {
      await authService.logout(refreshToken)
    }

    // Clear cookies
    reply.clearCookie('access_token', { path: '/' })
    reply.clearCookie('refresh_token', { path: '/' })

    return reply.code(204).send()
  })

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  app.post('/refresh', async (request, reply) => {
    const authService = new AuthService(request.db)
    const refreshToken = request.cookies['refresh_token']

    if (!refreshToken) {
      return reply.code(401).send({ error: 'Missing refresh token' })
    }

    const tokens = await authService.refreshAccessToken(refreshToken, true)

    // Set new access token cookie
    reply.setCookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    })

    // If refresh token was rotated, update cookie
    if (tokens.refreshToken !== refreshToken) {
      reply.setCookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })
    }

    return reply.send({ success: true })
  })

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    // Fetch full user data from database
    const userService = new UserService(request.db)
    const fullUser = await userService.getUserById(request.user!.userId)

    return reply.send({
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: fullUser.role,
      },
    })
  })

  /**
   * GET /auth/oauth/google
   * Redirect to Google OAuth
   * Note: This route is automatically handled by @fastify/oauth2 plugin
   * The plugin redirects to Google's authorization page
   */

  /**
   * GET /auth/oauth/google/callback
   * Handle Google OAuth callback from Google
   * Exchanges code for tokens, creates/logs in user, sets JWT cookies
   */
  app.get('/oauth/google/callback', async (request, reply) => {
    try {
      // Exchange authorization code for access token
      const token = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)

      // Fetch user profile from Google
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token.token.access_token}`,
        },
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch Google profile')
      }

      const profile = (await profileResponse.json()) as GoogleProfile

      // Use OAuthService to handle login/registration
      const oauthService = new OAuthService(request.db)

      // Prepare tokens object with only defined values
      const tokens: {
        access_token: string
        refresh_token?: string
        expires_in?: number
        id_token?: string
      } = {
        access_token: token.token.access_token,
      }

      if (token.token.refresh_token) {
        tokens.refresh_token = token.token.refresh_token
      }
      if (token.token.expires_in) {
        tokens.expires_in = token.token.expires_in
      }
      if (token.token.id_token) {
        tokens.id_token = token.token.id_token
      }

      const result = await oauthService.handleGoogleCallback(profile, tokens)

      // Store session in Redis
      const sessionRepository = new SessionRepository(redis)
      await sessionRepository.create(result.user.id, result.tokens.refreshToken)

      // Set JWT tokens as HTTP-only cookies (same as regular login)
      reply.setCookie('access_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60, // 15 minutes
        path: '/',
      })

      reply.setCookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })

      // Redirect to frontend OAuth callback page with success parameter
      // The frontend page will then fetch user data and redirect to role-specific dashboard
      const redirectUrl = process.env['OAUTH_SUCCESS_REDIRECT'] || 'http://localhost:3000/oauth/callback?success=true'
      return reply.redirect(redirectUrl)
    } catch (error) {
      request.log.error(error)

      // Determine error message based on error type
      let errorMessage = 'oauth_failed'

      // Check if it's an AppError with proper structure
      const isAppError = error && typeof error === 'object' && 'code' in error && 'statusCode' in error

      if (isAppError) {
        const appError = error as { code: string; statusCode: number; message: string; name?: string }

        // Check for suspension (ForbiddenError with suspension message)
        if (appError.code === 'FORBIDDEN' || appError.statusCode === 403 ||
            (appError.message && appError.message.toLowerCase().includes('suspended'))) {
          errorMessage = encodeURIComponent('Your account has been suspended')
        } else if (appError.message) {
          errorMessage = encodeURIComponent(appError.message)
        }
      } else if (error instanceof Error && error.message) {
        // Fallback for regular Error objects
        if (error.message.toLowerCase().includes('suspended')) {
          errorMessage = encodeURIComponent('Your account has been suspended')
        } else {
          errorMessage = encodeURIComponent(error.message)
        }
      }

      // Redirect to error page with specific error message
      // Always use dynamic error message, ignore OAUTH_ERROR_REDIRECT env var
      const baseUrl = 'http://localhost:3000/login'
      const errorUrl = `${baseUrl}?error=${errorMessage}`
      return reply.redirect(errorUrl)
    }
  })
}
