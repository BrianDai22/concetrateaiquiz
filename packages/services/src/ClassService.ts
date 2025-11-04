import type { Kysely, Transaction } from 'kysely'
import type { Database, Class, NewClass, ClassUpdate, User } from '@concentrate/database'
import { ClassRepository, UserRepository } from '@concentrate/database'
import {
  NotFoundError,
  ForbiddenError,
  AlreadyExistsError,
} from '@concentrate/shared'

/**
 * ClassService - Business logic for class management
 *
 * Responsibilities:
 * - Class CRUD operations with teacher ownership validation
 * - Student enrollment management
 * - Class-student association management
 * - Student transfer between classes
 *
 * Business Rules:
 * - Only teachers can create classes
 * - Teacher can only update/delete their own classes
 * - Student must have student role for enrollment
 * - Cannot enroll student already in class
 * - Cannot remove student with graded assignments (future enhancement)
 * - Cannot delete class with active assignments (future enhancement)
 */
export class ClassService {
  private classRepository: ClassRepository
  private userRepository: UserRepository

  constructor(db: Kysely<Database> | Transaction<Database>) {
    this.classRepository = new ClassRepository(db)
    this.userRepository = new UserRepository(db)
  }

  /**
   * Create a new class
   * - Validates teacher role
   * - Creates class
   * @param teacherId - Teacher ID
   * @param data - Class data
   * @returns Created class
   * @throws NotFoundError if teacher not found
   * @throws ForbiddenError if user is not a teacher
   */
  async createClass(teacherId: string, data: Omit<NewClass, 'teacher_id'>): Promise<Class> {
    // Verify teacher exists and has teacher role
    const teacher = await this.userRepository.findById(teacherId)
    if (!teacher) {
      throw new NotFoundError('Teacher not found')
    }

    if (teacher.role !== 'teacher') {
      throw new ForbiddenError('Only teachers can create classes')
    }

    // Create class
    const classData: NewClass = {
      ...data,
      teacher_id: teacherId,
    }

    const createdClass = await this.classRepository.create(classData)
    return createdClass
  }

  /**
   * Get class by ID
   * @param id - Class ID
   * @returns Class if found
   * @throws NotFoundError if class not found
   */
  async getClassById(id: string): Promise<Class> {
    const classRecord = await this.classRepository.findById(id)
    if (!classRecord) {
      throw new NotFoundError(`Class with ID ${id} not found`)
    }
    return classRecord
  }

  /**
   * Update class
   * - Validates teacher ownership
   * @param id - Class ID
   * @param teacherId - Teacher ID performing the update
   * @param updates - Class updates
   * @returns Updated class
   * @throws NotFoundError if class not found
   * @throws ForbiddenError if not the class teacher
   */
  async updateClass(
    id: string,
    teacherId: string,
    updates: ClassUpdate
  ): Promise<Class> {
    const classRecord = await this.getClassById(id)

    // Verify ownership
    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only update your own classes')
    }

    const updatedClass = await this.classRepository.update(id, updates)
    return updatedClass
  }

  /**
   * Delete class
   * - Validates teacher ownership
   * - Checks for active assignments (future enhancement)
   * @param id - Class ID
   * @param teacherId - Teacher ID performing the deletion
   * @throws NotFoundError if class not found
   * @throws ForbiddenError if not the class teacher
   */
  async deleteClass(id: string, teacherId: string): Promise<void> {
    const classRecord = await this.getClassById(id)

    // Verify ownership
    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only delete your own classes')
    }

    await this.classRepository.delete(id)
  }

  /**
   * Get classes by teacher
   * @param teacherId - Teacher ID
   * @param options - Pagination options
   * @returns List of classes
   */
  async getClassesByTeacher(
    teacherId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Class[]> {
    return this.classRepository.findByTeacher(teacherId, options)
  }

  /**
   * Get classes for student
   * @param studentId - Student ID
   * @returns List of classes
   */
  async getClassesForStudent(studentId: string): Promise<Class[]> {
    return this.classRepository.findClassesForStudent(studentId)
  }

  /**
   * Enroll student in class
   * - Validates student role
   * - Checks if already enrolled
   * @param classId - Class ID
   * @param studentId - Student ID
   * @param teacherId - Teacher ID performing the enrollment (for authorization)
   * @throws NotFoundError if class or student not found
   * @throws ForbiddenError if user is not a student or not the class teacher
   * @throws AlreadyExistsError if student already enrolled
   */
  async enrollStudent(
    classId: string,
    studentId: string,
    teacherId: string
  ): Promise<void> {
    // Verify class exists and teacher ownership
    const classRecord = await this.getClassById(classId)
    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only enroll students in your own classes')
    }

    // Verify student exists and has student role
    const student = await this.userRepository.findById(studentId)
    if (!student) {
      throw new NotFoundError('Student not found')
    }

    if (student.role !== 'student') {
      throw new ForbiddenError('User must have student role to be enrolled')
    }

    // Check if already enrolled
    const isEnrolled = await this.classRepository.isStudentEnrolled(
      classId,
      studentId
    )
    if (isEnrolled) {
      throw new AlreadyExistsError('Student is already enrolled in this class')
    }

    await this.classRepository.addStudent(classId, studentId)
  }

  /**
   * Enroll multiple students in class
   * - Validates all students have student role
   * - Filters out already enrolled students
   * @param classId - Class ID
   * @param studentIds - Array of student IDs
   * @param teacherId - Teacher ID performing the enrollment
   * @returns Number of students enrolled
   * @throws NotFoundError if class not found
   * @throws ForbiddenError if not the class teacher
   */
  async enrollMultipleStudents(
    classId: string,
    studentIds: string[],
    teacherId: string
  ): Promise<number> {
    if (studentIds.length === 0) {
      return 0
    }

    // Verify class exists and teacher ownership
    const classRecord = await this.getClassById(classId)
    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only enroll students in your own classes')
    }

    // Verify all students exist and have student role
    const students = await Promise.all(
      studentIds.map((id) => this.userRepository.findById(id))
    )

    const validStudents = students.filter((student): student is User => {
      return student !== null && student.role === 'student'
    })

    if (validStudents.length === 0) {
      return 0
    }

    const validStudentIds = validStudents.map((student) => student.id)

    // Filter out already enrolled students
    const enrollmentChecks = await Promise.all(
      validStudentIds.map((studentId) =>
        this.classRepository.isStudentEnrolled(classId, studentId)
      )
    )

    const studentsToEnroll = validStudentIds.filter(
      (_, index) => !enrollmentChecks[index]
    )

    if (studentsToEnroll.length === 0) {
      return 0
    }

    await this.classRepository.addMultipleStudents(classId, studentsToEnroll)
    return studentsToEnroll.length
  }

  /**
   * Remove student from class
   * - Validates teacher ownership
   * @param classId - Class ID
   * @param studentId - Student ID
   * @param teacherId - Teacher ID performing the removal
   * @throws NotFoundError if class not found
   * @throws ForbiddenError if not the class teacher
   */
  async removeStudent(
    classId: string,
    studentId: string,
    teacherId: string
  ): Promise<void> {
    // Verify class exists and teacher ownership
    const classRecord = await this.getClassById(classId)
    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only remove students from your own classes')
    }

    await this.classRepository.removeStudent(classId, studentId)
  }

  /**
   * Transfer students between classes
   * - Validates both classes belong to the teacher
   * - Removes from old class and adds to new class
   * @param fromClassId - Source class ID
   * @param toClassId - Destination class ID
   * @param studentIds - Array of student IDs to transfer
   * @param teacherId - Teacher ID performing the transfer
   * @returns Number of students transferred
   * @throws NotFoundError if either class not found
   * @throws ForbiddenError if not the teacher of both classes
   */
  async transferStudents(
    fromClassId: string,
    toClassId: string,
    studentIds: string[],
    teacherId: string
  ): Promise<number> {
    if (studentIds.length === 0) {
      return 0
    }

    // Verify both classes exist and teacher ownership
    const fromClass = await this.getClassById(fromClassId)
    const toClass = await this.getClassById(toClassId)

    if (fromClass.teacher_id !== teacherId || toClass.teacher_id !== teacherId) {
      throw new ForbiddenError(
        'You can only transfer students between your own classes'
      )
    }

    // Use the repository's transfer method
    await this.classRepository.transferStudents(fromClassId, toClassId, studentIds)
    return studentIds.length
  }

  /**
   * Get enrolled students in a class
   * @param classId - Class ID
   * @returns List of student IDs
   * @throws NotFoundError if class not found
   */
  async getEnrolledStudents(classId: string): Promise<string[]> {
    await this.getClassById(classId) // Verify class exists
    return this.classRepository.getEnrolledStudents(classId)
  }

  /**
   * Check if student is enrolled in class
   * @param classId - Class ID
   * @param studentId - Student ID
   * @returns True if enrolled
   */
  async isStudentEnrolled(classId: string, studentId: string): Promise<boolean> {
    return this.classRepository.isStudentEnrolled(classId, studentId)
  }

  /**
   * Get all classes with pagination
   * @param options - Pagination options
   * @returns List of classes
   */
  async getAllClasses(options?: {
    page?: number
    limit?: number
  }): Promise<Class[]> {
    return this.classRepository.findAll(options)
  }

  /**
   * Get class count
   * @returns Total number of classes
   */
  async getClassCount(): Promise<number> {
    return this.classRepository.count()
  }

  /**
   * Get class count by teacher
   * @param teacherId - Teacher ID
   * @returns Number of classes for the teacher
   */
  async getClassCountByTeacher(teacherId: string): Promise<number> {
    return this.classRepository.countByTeacher(teacherId)
  }

  /**
   * Get student count in class
   * @param classId - Class ID
   * @returns Number of enrolled students
   */
  async getStudentCountInClass(classId: string): Promise<number> {
    return this.classRepository.countStudentsInClass(classId)
  }

  /**
   * Get class count for student
   * @param studentId - Student ID
   * @returns Number of classes student is enrolled in
   */
  async getClassCountForStudent(studentId: string): Promise<number> {
    return this.classRepository.countClassesForStudent(studentId)
  }
}
