import type { Kysely, Transaction } from 'kysely'
import type { Database, Class, NewClass, ClassUpdate } from '../schema'

/**
 * ClassRepository - Encapsulates all database operations for classes table
 *
 * Following Repository Pattern:
 * - Accept Kysely instance or Transaction for flexibility
 * - No business logic - only data access operations
 * - Return null for not found, throw for database errors
 * - Support pagination and filtering
 */
export class ClassRepository {
  constructor(private db: Kysely<Database> | Transaction<Database>) {}

  /**
   * Create a new class
   * @param classData - Class data to insert
   * @returns The created class
   * @throws Database error if creation fails
   */
  async create(classData: NewClass): Promise<Class> {
    return await this.db
      .insertInto('classes')
      .values(classData)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Find class by ID
   * @param id - Class ID
   * @returns Class if found, null otherwise
   */
  async findById(id: string): Promise<Class | null> {
    const classRecord = await this.db
      .selectFrom('classes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return classRecord ?? null
  }

  /**
   * Find all classes with optional pagination
   * @param options - Pagination options (page, limit)
   * @returns Array of classes
   */
  async findAll(options?: {
    page?: number
    limit?: number
  }): Promise<Class[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    return await this.db
      .selectFrom('classes')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Update class by ID
   * @param id - Class ID
   * @param updates - Partial class data to update
   * @returns Updated class
   * @throws Error if class not found
   */
  async update(id: string, updates: ClassUpdate): Promise<Class> {
    return await this.db
      .updateTable('classes')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Delete class by ID
   * @param id - Class ID
   * @throws Error if class not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.db
      .deleteFrom('classes')
      .where('id', '=', id)
      .executeTakeFirst()

    if (result.numDeletedRows === 0n) {
      throw new Error(`Class with id ${id} not found`)
    }
  }

  /**
   * Find classes by teacher ID
   * @param teacherId - Teacher ID
   * @param options - Pagination options
   * @returns Array of classes taught by the teacher
   */
  async findByTeacher(
    teacherId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Class[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    return await this.db
      .selectFrom('classes')
      .selectAll()
      .where('teacher_id', '=', teacherId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Count total number of classes
   * @returns Total class count
   */
  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('classes')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  /**
   * Count classes by teacher
   * @param teacherId - Teacher ID
   * @returns Number of classes for the teacher
   */
  async countByTeacher(teacherId: string): Promise<number> {
    const result = await this.db
      .selectFrom('classes')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('teacher_id', '=', teacherId)
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  // ========== Student Enrollment Methods ==========

  /**
   * Add a student to a class
   * @param classId - Class ID
   * @param studentId - Student ID
   * @returns The enrollment record (class_id, student_id, enrolled_at)
   * @throws Error if enrollment already exists or foreign key constraint fails
   */
  async addStudent(
    classId: string,
    studentId: string
  ): Promise<{ class_id: string; student_id: string; enrolled_at: Date }> {
    return await this.db
      .insertInto('class_students')
      .values({ class_id: classId, student_id: studentId })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Remove a student from a class
   * @param classId - Class ID
   * @param studentId - Student ID
   * @throws Error if enrollment not found
   */
  async removeStudent(classId: string, studentId: string): Promise<void> {
    const result = await this.db
      .deleteFrom('class_students')
      .where('class_id', '=', classId)
      .where('student_id', '=', studentId)
      .executeTakeFirst()

    if (result.numDeletedRows === 0n) {
      throw new Error(
        `Student ${studentId} is not enrolled in class ${classId}`
      )
    }
  }

  /**
   * Add multiple students to a class
   * @param classId - Class ID
   * @param studentIds - Array of student IDs
   * @returns Number of students added
   */
  async addMultipleStudents(
    classId: string,
    studentIds: string[]
  ): Promise<number> {
    if (studentIds.length === 0) {
      return 0
    }

    const values = studentIds.map((studentId) => ({
      class_id: classId,
      student_id: studentId,
    }))

    const result = await this.db
      .insertInto('class_students')
      .values(values)
      .executeTakeFirst()

    if (result.numInsertedOrUpdatedRows === undefined) {
      return 0
    }
    return Number(result.numInsertedOrUpdatedRows)
  }

  /**
   * Remove multiple students from a class
   * @param classId - Class ID
   * @param studentIds - Array of student IDs
   * @returns Number of students removed
   */
  async removeMultipleStudents(
    classId: string,
    studentIds: string[]
  ): Promise<number> {
    if (studentIds.length === 0) {
      return 0
    }

    const result = await this.db
      .deleteFrom('class_students')
      .where('class_id', '=', classId)
      .where('student_id', 'in', studentIds)
      .executeTakeFirst()

    if (result.numDeletedRows === undefined) {
      return 0
    }
    return Number(result.numDeletedRows)
  }

  /**
   * Get all students enrolled in a class
   * @param classId - Class ID
   * @returns Array of student IDs
   */
  async getEnrolledStudents(classId: string): Promise<string[]> {
    const enrollments = await this.db
      .selectFrom('class_students')
      .select('student_id')
      .where('class_id', '=', classId)
      .orderBy('enrolled_at', 'asc')
      .execute()

    return enrollments.map((e) => e.student_id)
  }

  /**
   * Count students enrolled in a class
   * @param classId - Class ID
   * @returns Number of enrolled students
   */
  async countStudentsInClass(classId: string): Promise<number> {
    const result = await this.db
      .selectFrom('class_students')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('class_id', '=', classId)
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  /**
   * Check if a student is enrolled in a class
   * @param classId - Class ID
   * @param studentId - Student ID
   * @returns true if enrolled, false otherwise
   */
  async isStudentEnrolled(
    classId: string,
    studentId: string
  ): Promise<boolean> {
    const result = await this.db
      .selectFrom('class_students')
      .select('student_id')
      .where('class_id', '=', classId)
      .where('student_id', '=', studentId)
      .executeTakeFirst()

    return result !== undefined
  }

  /**
   * Find all classes a student is enrolled in
   * @param studentId - Student ID
   * @returns Array of classes
   */
  async findClassesForStudent(studentId: string): Promise<Class[]> {
    return await this.db
      .selectFrom('classes')
      .innerJoin('class_students', 'classes.id', 'class_students.class_id')
      .selectAll('classes')
      .where('class_students.student_id', '=', studentId)
      .orderBy('class_students.enrolled_at', 'desc')
      .execute()
  }

  /**
   * Count classes a student is enrolled in
   * @param studentId - Student ID
   * @returns Number of classes
   */
  async countClassesForStudent(studentId: string): Promise<number> {
    const result = await this.db
      .selectFrom('class_students')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('student_id', '=', studentId)
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  /**
   * Get enrollment date for a student in a class
   * @param classId - Class ID
   * @param studentId - Student ID
   * @returns Enrollment date if found, null otherwise
   */
  async getEnrollmentDate(
    classId: string,
    studentId: string
  ): Promise<Date | null> {
    const result = await this.db
      .selectFrom('class_students')
      .select('enrolled_at')
      .where('class_id', '=', classId)
      .where('student_id', '=', studentId)
      .executeTakeFirst()

    return result?.enrolled_at ?? null
  }

  /**
   * Transfer students from one class to another
   * @param fromClassId - Source class ID
   * @param toClassId - Destination class ID
   * @param studentIds - Array of student IDs to transfer
   * @returns Number of students transferred
   */
  async transferStudents(
    fromClassId: string,
    toClassId: string,
    studentIds: string[]
  ): Promise<number> {
    if (studentIds.length === 0) {
      return 0
    }

    // Use transaction if available, otherwise this needs to be called within a transaction
    const removed = await this.removeMultipleStudents(fromClassId, studentIds)
    await this.addMultipleStudents(toClassId, studentIds)

    return removed
  }

  /**
   * Remove all students from a class
   * @param classId - Class ID
   * @returns Number of students removed
   */
  async removeAllStudents(classId: string): Promise<number> {
    const result = await this.db
      .deleteFrom('class_students')
      .where('class_id', '=', classId)
      .executeTakeFirst()

    if (result.numDeletedRows === undefined) {
      return 0
    }
    return Number(result.numDeletedRows)
  }
}
