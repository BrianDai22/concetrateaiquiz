/**
 * Server Entry Point
 * Starts the Fastify server
 */

// Load environment variables from .env file
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env from project root (three levels up: dist -> api -> apps -> root)
dotenv.config({ path: resolve(__dirname, '../../../.env') })

import { buildApp } from './app.js'

const PORT = parseInt(process.env['PORT'] || '3001', 10)
const HOST = process.env['HOST'] || '0.0.0.0'

async function start() {
  try {
    const app = await buildApp()

    await app.listen({ port: PORT, host: HOST })

    console.log(`🚀 Server listening on http://${HOST}:${PORT}`)
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
