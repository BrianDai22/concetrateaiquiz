/**
 * Chatbot Routes
 * Handles AI assistant chat messages with context-aware responses
 */

import { FastifyInstance } from 'fastify'
import { ChatbotService } from '@concentrate/services'
import { z } from 'zod'
import { requireAuth } from '../hooks/auth.js'

/**
 * Zod schema for chat message validation
 */
const ChatMessageSchema = z.object({
  message: z.string().min(1).max(1000).trim(),
})

export async function chatbotRoutes(app: FastifyInstance) {
  /**
   * POST /chatbot/chat
   * Send a message to the AI assistant
   * Protected route - requires authentication
   *
   * Request body:
   * - message: string (1-1000 characters)
   *
   * Response:
   * - response: string (AI-generated response)
   * - timestamp: Date
   */
  app.post('/chat', { preHandler: requireAuth }, async (request, reply) => {
    // Validate input
    const validated = ChatMessageSchema.parse(request.body)

    // Get authenticated user ID from request (set by requireAuth middleware)
    const userId = request.user?.id
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    // Instantiate chatbot service with request database connection
    const chatbotService = new ChatbotService(request.db)

    // Get AI response
    const response = await chatbotService.chat(userId, validated.message)

    // Return response
    return reply.code(200).send({
      response,
      timestamp: new Date(),
    })
  })
}
