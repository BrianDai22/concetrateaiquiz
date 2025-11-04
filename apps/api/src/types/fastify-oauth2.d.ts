/**
 * TypeScript type declarations for @fastify/oauth2 plugin
 *
 * This file adds type support for the Google OAuth2 plugin integration
 */

import 'fastify'
import '@fastify/oauth2'
import type { FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Google OAuth2 instance registered by @fastify/oauth2 plugin
     * Provides methods for OAuth2 authentication flow
     */
    googleOAuth2: {
      /**
       * Generate authorization URL for Google OAuth
       * @param params - Optional state and scope parameters
       * @returns Authorization URL to redirect user to
       */
      generateAuthorizationUri(params?: {
        state?: string
        scope?: string[]
      }): string

      /**
       * Exchange authorization code for access token
       * Accepts a FastifyRequest and extracts code from query parameters
       * @param request - Fastify request object with OAuth code in query
       * @returns OAuth2 token response
       */
      getAccessTokenFromAuthorizationCodeFlow(
        request: FastifyRequest
      ): Promise<{
        token: {
          access_token: string
          refresh_token?: string
          expires_in?: number
          token_type: string
          id_token?: string
          scope?: string
        }
      }>

      /**
       * Get new access token using refresh token
       * @param params - Refresh token parameters
       * @returns New access token response
       */
      getNewAccessTokenUsingRefreshToken(
        params: {
          refresh_token: string
        }
      ): Promise<{
        token: {
          access_token: string
          refresh_token?: string
          expires_in?: number
          token_type: string
        }
      }>
    }
  }
}
