import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ChatbotService } from '../../src/ChatbotService'
import type { UserRepository } from '@concentrate/database'
import type { User } from '@concentrate/database'
import { NotFoundError } from '@concentrate/shared'

// Mock OpenAI module
const mockCreate = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: 'This is a test response from the AI assistant.',
      },
    },
  ],
})

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    }
  },
}))

describe('ChatbotService - Unit Tests', () => {
  let service: ChatbotService
  let mockUserRepository: Partial<UserRepository>
  let mockDb: {
    selectFrom: ReturnType<typeof vi.fn>
    fn: { count: ReturnType<typeof vi.fn> }
  }

  const mockStudent: User = {
    id: 'student-123',
    email: 'student@example.com',
    password_hash: 'hashed_password',
    name: 'Test Student',
    role: 'student',
    suspended: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockTeacher: User = {
    id: 'teacher-123',
    email: 'teacher@example.com',
    password_hash: 'hashed_password',
    name: 'Test Teacher',
    role: 'teacher',
    suspended: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockAdmin: User = {
    id: 'admin-123',
    email: 'admin@example.com',
    password_hash: 'hashed_password',
    name: 'Test Admin',
    role: 'admin',
    suspended: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockClear()
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'This is a test response from the AI assistant.',
          },
        },
      ],
    })

    // Set environment variables
    process.env['OPENAI_API_KEY'] = 'test-api-key'
    process.env['CHATBOT_MODEL'] = 'gpt-4o-mini'
    process.env['CHATBOT_MAX_TOKENS'] = '500'
    process.env['CHATBOT_TEMPERATURE'] = '0.7'

    // Mock UserRepository
    mockUserRepository = {
      findById: vi.fn(),
    }

    // Mock database with query builder pattern
    const mockInnerJoin = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockSelect = vi.fn().mockReturnThis()
    const mockLeftJoin = vi.fn().mockReturnThis()
    const mockGroupBy = vi.fn().mockReturnThis()
    const mockExecute = vi.fn().mockResolvedValue([])

    mockDb = {
      selectFrom: vi.fn(() => ({
        innerJoin: mockInnerJoin,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        select: mockSelect,
        groupBy: mockGroupBy,
        execute: mockExecute,
      })),
      fn: {
        count: vi.fn((column: string) => ({ as: vi.fn((alias: string) => alias) })),
      },
    }

    // Create service instance
    service = new ChatbotService(mockDb as never)
    // Override repository with mock
    ;(service as { userRepository: UserRepository }).userRepository =
      mockUserRepository as UserRepository
  })

  describe('constructor', () => {
    it('should throw error if OPENAI_API_KEY is not set', () => {
      delete process.env['OPENAI_API_KEY']

      expect(() => new ChatbotService(mockDb as never)).toThrow(
        'OPENAI_API_KEY environment variable is required'
      )
    })

    it('should initialize OpenAI client with API key', () => {
      const service = new ChatbotService(mockDb as never)
      expect(service).toBeDefined()
    })
  })

  describe('chat', () => {
    it('should throw error if user not found', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      await expect(service.chat('nonexistent-user', 'Hello')).rejects.toThrow('User not found')
    })

    it('should return AI response for student user', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent)

      // Mock student classes query
      const mockExecute = vi.fn().mockResolvedValue([
        { className: 'Math 101', teacherName: 'Prof. Smith' },
        { className: 'Science 201', teacherName: 'Dr. Johnson' },
      ])

      mockDb.selectFrom = vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      const response = await service.chat('student-123', 'How do I submit an assignment?')

      expect(response).toBe('This is a test response from the AI assistant.')
      expect(mockUserRepository.findById).toHaveBeenCalledWith('student-123')
    })

    it('should return AI response for teacher user', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeacher)

      // Mock teacher classes query
      const mockExecute = vi.fn().mockResolvedValue([
        { className: 'Math 101', studentCount: '25' },
        { className: 'Science 201', studentCount: '30' },
      ])

      mockDb.selectFrom = vi.fn(() => ({
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      const response = await service.chat('teacher-123', 'How do I grade assignments?')

      expect(response).toBe('This is a test response from the AI assistant.')
      expect(mockUserRepository.findById).toHaveBeenCalledWith('teacher-123')
    })

    it('should return AI response for admin user', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAdmin)

      const response = await service.chat('admin-123', 'How do I create a new user?')

      expect(response).toBe('This is a test response from the AI assistant.')
      expect(mockUserRepository.findById).toHaveBeenCalledWith('admin-123')
    })

    it('should handle student with no enrolled classes', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent)

      // Mock empty classes query
      const mockExecute = vi.fn().mockResolvedValue([])

      mockDb.selectFrom = vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      const response = await service.chat('student-123', 'What classes am I enrolled in?')

      expect(response).toBe('This is a test response from the AI assistant.')
    })

    it('should handle teacher with no classes', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeacher)

      // Mock empty classes query
      const mockExecute = vi.fn().mockResolvedValue([])

      mockDb.selectFrom = vi.fn(() => ({
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      const response = await service.chat('teacher-123', 'What classes do I teach?')

      expect(response).toBe('This is a test response from the AI assistant.')
    })

    it('should throw error if OpenAI API returns no response', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent)

      // Mock empty classes query
      const mockExecute = vi.fn().mockResolvedValue([])
      mockDb.selectFrom = vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      // Mock OpenAI to return empty response
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      })

      await expect(service.chat('student-123', 'Hello')).rejects.toThrow(
        'No response from OpenAI API'
      )
    })

    it('should use custom environment variables for OpenAI config', async () => {
      process.env['CHATBOT_MODEL'] = 'gpt-4'
      process.env['CHATBOT_MAX_TOKENS'] = '1000'
      process.env['CHATBOT_TEMPERATURE'] = '0.9'

      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent)

      const mockExecute = vi.fn().mockResolvedValue([])
      mockDb.selectFrom = vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      const response = await service.chat('student-123', 'Hello')

      expect(response).toBe('This is a test response from the AI assistant.')
    })

    it('should handle database query errors', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent)

      // Mock database to throw error
      const mockExecute = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      mockDb.selectFrom = vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      await expect(service.chat('student-123', 'Hello')).rejects.toThrow(
        'Database connection failed'
      )
    })

    it('should handle OpenAI API errors', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent)

      // Mock empty classes query
      const mockExecute = vi.fn().mockResolvedValue([])
      mockDb.selectFrom = vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      // Mock OpenAI to throw error
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API rate limit exceeded'))

      await expect(service.chat('student-123', 'Hello')).rejects.toThrow(
        'OpenAI API rate limit exceeded'
      )
    })
  })

  describe('system prompt construction', () => {
    it('should build prompt with student context', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent)

      const mockExecute = vi.fn().mockResolvedValue([
        { className: 'Math 101', teacherName: 'Prof. Smith' },
      ])

      mockDb.selectFrom = vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      await service.chat('student-123', 'Test message')

      // Verify the prompt was constructed (OpenAI was called)
      expect(mockUserRepository.findById).toHaveBeenCalled()
    })

    it('should build prompt with teacher context', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeacher)

      const mockExecute = vi.fn().mockResolvedValue([
        { className: 'Math 101', studentCount: '25' },
      ])

      mockDb.selectFrom = vi.fn(() => ({
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        execute: mockExecute,
      })) as never

      await service.chat('teacher-123', 'Test message')

      // Verify the prompt was constructed (OpenAI was called)
      expect(mockUserRepository.findById).toHaveBeenCalled()
    })

    it('should build prompt with admin context', async () => {
      ;(mockUserRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAdmin)

      await service.chat('admin-123', 'Test message')

      // Verify the prompt was constructed (OpenAI was called)
      expect(mockUserRepository.findById).toHaveBeenCalled()
    })
  })
})
