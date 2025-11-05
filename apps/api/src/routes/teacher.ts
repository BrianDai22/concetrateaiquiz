/**
 * Teacher Routes
 * Teacher-only endpoints for class and assignment management
 */

import { FastifyInstance } from 'fastify'
import { ClassService, AssignmentService } from '@concentrate/services'
import {
  CreateClassSchema,
  UpdateClassSchema,
  ClassQuerySchema,
  AddStudentSchema,
  AddMultipleStudentsSchema,
  ClassIdParamSchema,
  CreateAssignmentSchema,
  UpdateAssignmentSchema,
  AssignmentQuerySchema,
  GradeSubmissionSchema,
  AssignmentIdParamSchema,
  SubmissionIdParamSchema,
  UserSearchSchema,
} from '@concentrate/validation'
import { requireAuth } from '../hooks/auth.js'
import { requireRole } from '../hooks/rbac.js'

export async function teacherRoutes(app: FastifyInstance) {
  // ============ CLASS ROUTES ============

  /**
   * GET /teacher/classes
   * List teacher's classes
   */
  app.get(
    '/classes',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const classService = new ClassService(request.db)
      const validated = ClassQuerySchema.parse(request.query)

      // Pass options object for pagination
      const options: { page?: number; limit?: number } = {}
      if (validated.page !== undefined) options.page = validated.page
      if (validated.limit !== undefined) options.limit = validated.limit

      const classes = await classService.getClassesByTeacher(
        request.user!.userId,
        options
      )
      return reply.send({ classes })
    }
  )

  /**
   * POST /teacher/classes
   * Create a new class
   */
  app.post(
    '/classes',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const classService = new ClassService(request.db)
      const validated = CreateClassSchema.parse(request.body)

      // Transform description: undefined -> null for service compatibility
      const classData = {
        name: validated.name,
        description: validated.description ?? null,
      }

      const classRecord = await classService.createClass(
        request.user!.userId,
        classData
      )
      return reply.code(201).send({ class: classRecord })
    }
  )

  /**
   * PUT /teacher/classes/:id
   * Update a class
   */
  app.put(
    '/classes/:id',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const classService = new ClassService(request.db)
      const { id } = ClassIdParamSchema.parse(request.params)
      const validated = UpdateClassSchema.parse(request.body)

      // Filter undefined properties for exactOptionalPropertyTypes
      const updates: { name?: string; description?: string | null } = {}
      if (validated.name !== undefined) updates.name = validated.name
      if (validated.description !== undefined) updates.description = validated.description

      const classRecord = await classService.updateClass(
        id,
        request.user!.userId,
        updates
      )
      return reply.send({ class: classRecord })
    }
  )

  /**
   * DELETE /teacher/classes/:id
   * Delete a class
   */
  app.delete(
    '/classes/:id',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const classService = new ClassService(request.db)
      const { id } = ClassIdParamSchema.parse(request.params)

      await classService.deleteClass(id, request.user!.userId)
      return reply.code(204).send()
    }
  )

  /**
   * POST /teacher/classes/:id/students
   * Add student(s) to class
   */
  app.post(
    '/classes/:id/students',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const classService = new ClassService(request.db)
      const { id } = ClassIdParamSchema.parse(request.params)

      // Check if it's single or multiple students
      const body = request.body as { studentId?: string; studentIds?: string[] }

      if (body.studentIds) {
        // Multiple students
        const validated = AddMultipleStudentsSchema.parse(request.body)
        const count = await classService.enrollMultipleStudents(
          id,
          validated.studentIds,
          request.user!.userId
        )
        return reply.send({ enrolled: count })
      } else {
        // Single student
        const validated = AddStudentSchema.parse(request.body)
        await classService.enrollStudent(id, validated.studentId, request.user!.userId)
        return reply.send({ success: true })
      }
    }
  )

  /**
   * DELETE /teacher/classes/:classId/students/:studentId
   * Remove student from class
   */
  app.delete(
    '/classes/:classId/students/:studentId',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const classService = new ClassService(request.db)
      const params = request.params as { classId: string; studentId: string }

      await classService.removeStudent(
        params.classId,
        params.studentId,
        request.user!.userId
      )
      return reply.code(204).send()
    }
  )

  /**
   * GET /teacher/users/search
   * Search for students by email to add to class
   */
  app.get(
    '/users/search',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const validated = UserSearchSchema.parse(request.query)

      if (!validated.email) {
        return reply.code(400).send({ error: 'email query parameter required' })
      }

      // Search for students only (non-suspended)
      const users = await request.db
        .selectFrom('users')
        .selectAll()
        .where('email', 'ilike', `%${validated.email}%`)
        .where('role', '=', 'student')
        .where('suspended', '=', false)
        .limit(validated.limit || 10)
        .execute()

      return reply.send({ users })
    }
  )

  // ============ ASSIGNMENT ROUTES ============

  /**
   * GET /teacher/assignments
   * List teacher's assignments
   */
  app.get(
    '/assignments',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)
      const validated = AssignmentQuerySchema.parse(request.query)

      // Pass options object for pagination
      const options: { page?: number; limit?: number } = {}
      if (validated.page !== undefined) options.page = validated.page
      if (validated.limit !== undefined) options.limit = validated.limit

      const assignments = await assignmentService.getAssignmentsByTeacher(
        request.user!.userId,
        options
      )
      return reply.send({ assignments })
    }
  )

  /**
   * POST /teacher/assignments
   * Create a new assignment
   */
  app.post(
    '/assignments',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)

      // Extend validation to include class_id from body
      const body = request.body as { classId?: string; title?: string; description?: string; dueDate?: string }
      const classId = body.classId
      if (!classId) {
        return reply.code(400).send({ error: 'classId is required' })
      }

      const validated = CreateAssignmentSchema.parse(request.body)

      // Transform schema data to service format
      const assignmentData = {
        title: validated.title,
        description: validated.description,
        due_date: new Date(validated.dueDate),
      }

      const assignment = await assignmentService.createAssignment(
        classId,
        request.user!.userId,
        assignmentData
      )
      return reply.code(201).send({ assignment })
    }
  )

  /**
   * PUT /teacher/assignments/:id
   * Update an assignment
   */
  app.put(
    '/assignments/:id',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)
      const { id } = AssignmentIdParamSchema.parse(request.params)
      const validated = UpdateAssignmentSchema.parse(request.body)

      // Filter undefined and transform dueDate -> due_date
      const updates: { title?: string; description?: string; due_date?: Date } = {}
      if (validated.title !== undefined) updates.title = validated.title
      if (validated.description !== undefined) updates.description = validated.description
      if (validated.dueDate !== undefined) updates.due_date = new Date(validated.dueDate)

      const assignment = await assignmentService.updateAssignment(
        id,
        request.user!.userId,
        updates
      )
      return reply.send({ assignment })
    }
  )

  /**
   * DELETE /teacher/assignments/:id
   * Delete an assignment
   */
  app.delete(
    '/assignments/:id',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)
      const { id } = AssignmentIdParamSchema.parse(request.params)

      await assignmentService.deleteAssignment(id, request.user!.userId)
      return reply.code(204).send()
    }
  )

  /**
   * GET /teacher/submissions
   * List submissions for teacher's assignments
   */
  app.get(
    '/submissions',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)
      const query = request.query as { assignment_id?: string }

      if (query.assignment_id) {
        const submissions = await assignmentService.getSubmissionsByAssignment(
          query.assignment_id,
          request.user!.userId
        )
        return reply.send({ submissions })
      }

      return reply.code(400).send({ error: 'assignment_id query parameter required' })
    }
  )

  /**
   * GET /teacher/assignments/:id/stats
   * Get submission statistics for an assignment
   */
  app.get(
    '/assignments/:id/stats',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)
      const { id } = AssignmentIdParamSchema.parse(request.params)

      const stats = await assignmentService.getSubmissionStats(
        id,
        request.user!.userId
      )

      return reply.send({ stats })
    }
  )

  /**
   * POST /teacher/submissions/:id/grade
   * Grade a submission
   */
  app.post(
    '/submissions/:id/grade',
    { preHandler: [requireAuth, requireRole('teacher')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)
      const { id: submissionId } = SubmissionIdParamSchema.parse(request.params)
      const validated = GradeSubmissionSchema.parse(request.body)

      // Fetch submission to get assignmentId and studentId
      const submission = await request.db
        .selectFrom('submissions')
        .selectAll()
        .where('id', '=', submissionId)
        .executeTakeFirst()

      if (!submission) {
        return reply.code(404).send({ error: 'Submission not found' })
      }

      const grade = await assignmentService.gradeSubmission(
        submission.assignment_id,
        submission.student_id,
        request.user!.userId,
        validated.grade,
        validated.feedback
      )
      return reply.send({ grade })
    }
  )
}
