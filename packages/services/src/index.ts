/**
 * @concentrate/services
 *
 * Business logic layer for school portal platform
 *
 * Services implement business rules and orchestrate repository operations.
 * All services support dependency injection and transaction handling.
 */

export { UserService } from './UserService'
export { AuthService } from './AuthService'
export type { TokenPair } from './AuthService'
export { ClassService } from './ClassService'
export { AssignmentService } from './AssignmentService'
export { OAuthService } from './OAuthService'
export type { GoogleProfile, OAuthCallbackResult } from './OAuthService'
export { ChatbotService } from './ChatbotService'
