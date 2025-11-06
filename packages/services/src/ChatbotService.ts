import type { Kysely, Transaction } from 'kysely'
import type { Database, User } from '@concentrate/database'
import { UserRepository } from '@concentrate/database'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

/**
 * ChatbotService - AI assistant for platform guidance
 *
 * Responsibilities:
 * - Provide context-aware responses to user questions
 * - Fetch user context (role, name, enrolled/taught classes)
 * - Construct role-specific system prompts
 * - Call OpenAI API with user context
 * - Handle API errors gracefully
 *
 * Business Rules:
 * - Stateless operation (no conversation history)
 * - User context fetched dynamically on each request
 * - System prompt tailored to user role
 * - Responses limited to platform-specific guidance
 * - Rate limits handled via OpenAI API
 */
export class ChatbotService {
  private userRepository: UserRepository
  private openai: OpenAI
  private db: Kysely<Database> | Transaction<Database>

  constructor(db: Kysely<Database> | Transaction<Database>) {
    this.db = db
    this.userRepository = new UserRepository(db)

    // Initialize OpenAI client
    const apiKey = process.env['OPENAI_API_KEY']
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    })
  }

  /**
   * Send a chat message and get AI response
   * @param userId - ID of the authenticated user
   * @param message - User's message
   * @returns AI-generated response
   * @throws Error if OpenAI API fails
   */
  async chat(userId: string, message: string): Promise<string> {
    // Fetch user context
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Build system prompt with user context
    const systemPrompt = await this.buildSystemPrompt(user)

    // Prepare messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]

    // Call OpenAI API
    const completion = await this.openai.chat.completions.create({
      model: process.env['CHATBOT_MODEL'] || 'gpt-4o-mini',
      messages: messages,
      max_tokens: parseInt(process.env['CHATBOT_MAX_TOKENS'] || '500', 10),
      temperature: parseFloat(process.env['CHATBOT_TEMPERATURE'] || '0.7'),
    })

    // Extract and return response
    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI API')
    }

    return response
  }

  /**
   * Build system prompt with user-specific context
   * @param user - User object with role and profile
   * @returns System prompt string
   */
  private async buildSystemPrompt(user: User): Promise<string> {
    const roleContext = await this.getRoleContext(user)

    const basePrompt = `You are a helpful assistant for the School Portal Platform.

User Information:
- Name: ${user.name}
- Role: ${user.role}
- Email: ${user.email}

${roleContext}

You can help users with:
- Understanding how to use platform features
- Navigating the interface
- Answering questions about assignments, classes, and grading
- Explaining role-specific capabilities

Guidelines:
- Provide clear, concise, and helpful responses
- Focus on platform-specific guidance
- If you don't know something, direct users to contact support
- Be friendly and professional

Answer the user's question based on their role and the platform's features.`

    return basePrompt
  }

  /**
   * Get role-specific context for system prompt
   * @param user - User object
   * @returns Role-specific context string
   */
  private async getRoleContext(user: User): Promise<string> {
    switch (user.role) {
      case 'student':
        return await this.getStudentContext(user.id)
      case 'teacher':
        return await this.getTeacherContext(user.id)
      case 'admin':
        return this.getAdminContext()
      default:
        return ''
    }
  }

  /**
   * Get context for student users
   */
  private async getStudentContext(userId: string): Promise<string> {
    // Fetch enrolled classes
    const classes = await this.db
      .selectFrom('class_students')
      .innerJoin('classes', 'classes.id', 'class_students.class_id')
      .innerJoin('users', 'users.id', 'classes.teacher_id')
      .where('class_students.student_id', '=', userId)
      .select(['classes.name as className', 'users.name as teacherName'])
      .execute()

    const classCount = classes.length
    const classList = classes.length > 0
      ? classes.map(c => `- ${c.className} (taught by ${c.teacherName})`).join('\n  ')
      : 'No classes enrolled yet'

    return `Current Enrollment:
  You are enrolled in ${classCount} class${classCount !== 1 ? 'es' : ''}:
  ${classList}

You can help students with:
- Submitting assignments
- Viewing grades and feedback
- Understanding class schedules
- Managing their enrolled classes
- Navigating the student dashboard`
  }

  /**
   * Get context for teacher users
   */
  private async getTeacherContext(userId: string): Promise<string> {
    // Fetch taught classes with student counts
    const classes = await this.db
      .selectFrom('classes')
      .leftJoin('class_students', 'class_students.class_id', 'classes.id')
      .where('classes.teacher_id', '=', userId)
      .select([
        'classes.name as className',
        this.db.fn.count('class_students.student_id').as('studentCount'),
      ])
      .groupBy('classes.id')
      .execute()

    const classCount = classes.length
    const classList = classes.length > 0
      ? classes.map(c => `- ${c.className} (${c.studentCount} student${c.studentCount !== 1 ? 's' : ''})`).join('\n  ')
      : 'No classes created yet'

    return `Classes You Teach:
  You teach ${classCount} class${classCount !== 1 ? 'es' : ''}:
  ${classList}

You can help teachers with:
- Creating and managing assignments
- Grading student submissions
- Managing class rosters (adding/removing students)
- Viewing class statistics
- Publishing lessons to classes
- Providing feedback to students`
  }

  /**
   * Get context for admin users
   */
  private getAdminContext(): string {
    return `Administrator Access:
  You have full administrative privileges.

You can help administrators with:
- Creating and managing user accounts (students, teachers, admins)
- Suspending or unsuspending users
- Creating and managing teacher groups
- Viewing system-wide statistics
- User management across the platform
- System configuration`
  }
}
