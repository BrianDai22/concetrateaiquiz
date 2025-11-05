/**
 * Student Routes
 * Student-only endpoints for viewing classes, assignments, and submitting work
 */

import { FastifyInstance } from 'fastify'
import { ClassService, AssignmentService } from '@concentrate/services'
import {
  SubmitAssignmentSchema,
  UpdateSubmissionSchema,
  AssignmentIdParamSchema,
  SubmissionIdParamSchema,
  GradeIdParamSchema,
} from '@concentrate/validation'
import { requireAuth } from '../hooks/auth.js'
import { requireRole } from '../hooks/rbac.js'

export async function studentRoutes(app: FastifyInstance) {
  /**
   * GET /student/classes
   * Get student's enrolled classes
   */
  app.get(
    '/classes',
    { preHandler: [requireAuth, requireRole('student')] },
    async (request, reply) => {
      const classService = new ClassService(request.db)

      const classes = await classService.getClassesForStudent(request.user!.userId)
      return reply.send({ classes })
    }
  )

  /**
   * GET /student/assignments
   * Get all assignments for student's classes
   */
  app.get(
    '/assignments',
    { preHandler: [requireAuth, requireRole('student')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)

      const assignments = await assignmentService.getAssignmentsForStudent(
        request.user!.userId
      )
      return reply.send({ assignments })
    }
  )

  /**
   * GET /student/assignments/:id
   * Get assignment details
   */
  app.get(
    '/assignments/:id',
    { preHandler: [requireAuth, requireRole('student')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)
      const { id } = AssignmentIdParamSchema.parse(request.params)

      const assignment = await assignmentService.getAssignmentById(id)
      return reply.send({ assignment })
    }
  )

  /**
   * POST /student/submissions
   * Submit an assignment
   */
  app.post(
    '/submissions',
    { preHandler: [requireAuth, requireRole('student')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)

      // Get assignmentId from request body
      const body = request.body as { assignmentId?: string; content?: string; fileUrl?: string }
      const assignmentId = body.assignmentId
      if (!assignmentId) {
        return reply.code(400).send({ error: 'assignmentId is required' })
      }

      const validated = SubmitAssignmentSchema.parse(request.body)

      const submission = await assignmentService.submitAssignment(
        assignmentId,
        request.user!.userId,
        validated.content,
        validated.fileUrl
      )
      return reply.code(201).send({ submission })
    }
  )

  /**
   * PUT /student/submissions/:id
   * Update a submission (before grading)
   */
  app.put(
    '/submissions/:id',
    { preHandler: [requireAuth, requireRole('student')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)
      const { id: submissionId } = SubmissionIdParamSchema.parse(request.params)
      const validated = UpdateSubmissionSchema.parse(request.body)

      // Fetch submission to get assignmentId
      const existingSubmission = await request.db
        .selectFrom('submissions')
        .select(['assignment_id', 'student_id'])
        .where('id', '=', submissionId)
        .executeTakeFirst()

      if (!existingSubmission) {
        return reply.code(404).send({ error: 'Submission not found' })
      }

      // Filter undefined properties for exactOptionalPropertyTypes
      const updates: { content?: string; file_url?: string } = {}
      if (validated.content !== undefined) updates.content = validated.content
      if (validated.fileUrl !== undefined) updates.file_url = validated.fileUrl

      const submission = await assignmentService.updateSubmission(
        existingSubmission.assignment_id,
        request.user!.userId,
        updates
      )
      return reply.send({ submission })
    }
  )

  /**
   * GET /student/grades
   * Get all grades for student with assignment details
   */
  app.get(
    '/grades',
    { preHandler: [requireAuth, requireRole('student')] },
    async (request, reply) => {
      const assignmentService = new AssignmentService(request.db)

      const grades = await assignmentService.getGradesWithAssignmentByStudent(
        request.user!.userId
      )

      return reply.send({ grades: grades.filter((g) => g.grade !== null) })
    }
  )

  /**
   * GET /student/grades/:id
   * Get specific grade details
   */
  app.get(
    '/grades/:id',
    { preHandler: [requireAuth, requireRole('student')] },
    async (request, reply) => {
      const { id: gradeId } = GradeIdParamSchema.parse(request.params)

      // Fetch grade directly from database to get associated assignment
      const grade = await request.db
        .selectFrom('grades')
        .innerJoin('submissions', 'grades.submission_id', 'submissions.id')
        .selectAll('grades')
        .select(['submissions.assignment_id', 'submissions.student_id'])
        .where('grades.id', '=', gradeId)
        .where('submissions.student_id', '=', request.user!.userId)
        .executeTakeFirst()

      if (!grade) {
        return reply.code(404).send({ error: 'Grade not found' })
      }

      return reply.send({ grade })
    }
  )
}
