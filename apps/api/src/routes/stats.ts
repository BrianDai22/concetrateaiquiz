/**
 * Stats Routes
 * Public endpoints for school-wide statistics
 */

import { FastifyInstance } from 'fastify'
import { UserService, ClassService } from '@concentrate/services'
import { ClassIdParamSchema } from '@concentrate/validation'

export async function statsRoutes(app: FastifyInstance) {
  /**
   * GET /stats/average-grades
   * Get average grade across all classes
   */
  app.get('/average-grades', async (request, reply) => {
    // Get all grades directly from database (public endpoint, no auth required)
    const grades = await request.db
      .selectFrom('grades')
      .selectAll()
      .execute()

    if (grades.length === 0) {
      return reply.send({ average: 0, count: 0 })
    }

    const sum = grades.reduce(
      (acc: number, grade: { grade: string | number }) => acc + Number(grade.grade),
      0
    )
    const average = sum / grades.length

    return reply.send({ average, count: grades.length })
  })

  /**
   * GET /stats/average-grades/:id
   * Get average grade for a specific class
   */
  app.get('/average-grades/:id', async (request, reply) => {
    const { id: classId } = ClassIdParamSchema.parse(request.params)

    // Get all grades for this class using database join
    const grades = await request.db
      .selectFrom('grades')
      .innerJoin('submissions', 'grades.submission_id', 'submissions.id')
      .innerJoin('assignments', 'submissions.assignment_id', 'assignments.id')
      .select('grades.grade')
      .where('assignments.class_id', '=', classId)
      .execute()

    if (grades.length === 0) {
      return reply.send({ average: 0, count: 0 })
    }

    const sum = grades.reduce(
      (acc: number, grade: { grade: string | number }) => acc + Number(grade.grade),
      0
    )
    const average = sum / grades.length

    return reply.send({ average, count: grades.length })
  })

  /**
   * GET /stats/teacher-names
   * Get list of all teacher names
   */
  app.get('/teacher-names', async (request, reply) => {
    const userService = new UserService(request.db)

    const teachers = await userService.getUsersByRole('teacher')
    const names = teachers.map((t) => t.name)

    return reply.send({ teachers: names, count: names.length })
  })

  /**
   * GET /stats/student-names
   * Get list of all student names
   */
  app.get('/student-names', async (request, reply) => {
    const userService = new UserService(request.db)

    const students = await userService.getUsersByRole('student')
    const names = students.map((s) => s.name)

    return reply.send({ students: names, count: names.length })
  })

  /**
   * GET /stats/classes
   * Get list of all classes
   */
  app.get('/classes', async (request, reply) => {
    const classService = new ClassService(request.db)

    const classes = await classService.getAllClasses()

    return reply.send({ classes, count: classes.length })
  })

  /**
   * GET /stats/classes/:id
   * Get list of students in a class
   */
  app.get('/classes/:id', async (request, reply) => {
    const classService = new ClassService(request.db)
    const userService = new UserService(request.db)
    const { id } = ClassIdParamSchema.parse(request.params)

    const studentIds = await classService.getEnrolledStudents(id)
    const students = await Promise.all(
      studentIds.map((studentId) => userService.getUserById(studentId))
    )

    return reply.send({ students, count: students.length })
  })
}
