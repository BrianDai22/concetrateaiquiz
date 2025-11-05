import { apiClient } from '../apiClient';
import type {
  Class,
  Assignment,
  Submission,
  Grade,
  CreateClassRequest,
  UpdateClassRequest,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  AddStudentRequest,
  AddMultipleStudentsRequest,
  GradeSubmissionRequest,
  AssignmentStats,
} from '@/types/teacher';

export const teacherApi = {
  // ============ CLASS ROUTES ============

  /**
   * Get teacher's classes
   */
  getClasses: async (params?: { page?: number; limit?: number }): Promise<Class[]> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const url = `/api/v0/teacher/classes${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<{ classes: Class[] }>(url);
    return response.classes;
  },

  /**
   * Create a new class
   */
  createClass: async (data: CreateClassRequest): Promise<Class> => {
    const response = await apiClient.post<{ class: Class }>('/api/v0/teacher/classes', data);
    return response.class;
  },

  /**
   * Update a class
   */
  updateClass: async (classId: string, data: UpdateClassRequest): Promise<Class> => {
    const response = await apiClient.put<{ class: Class }>(
      `/api/v0/teacher/classes/${classId}`,
      data
    );
    return response.class;
  },

  /**
   * Delete a class
   */
  deleteClass: async (classId: string): Promise<void> => {
    await apiClient.delete(`/api/v0/teacher/classes/${classId}`);
  },

  /**
   * Add a single student to class
   */
  addStudentToClass: async (classId: string, data: AddStudentRequest): Promise<void> => {
    await apiClient.post(`/api/v0/teacher/classes/${classId}/students`, data);
  },

  /**
   * Add multiple students to class
   */
  addMultipleStudentsToClass: async (
    classId: string,
    data: AddMultipleStudentsRequest
  ): Promise<number> => {
    const response = await apiClient.post<{ enrolled: number }>(
      `/api/v0/teacher/classes/${classId}/students`,
      data
    );
    return response.enrolled;
  },

  /**
   * Remove student from class
   */
  removeStudentFromClass: async (classId: string, studentId: string): Promise<void> => {
    await apiClient.delete(`/api/v0/teacher/classes/${classId}/students/${studentId}`);
  },

  // ============ ASSIGNMENT ROUTES ============

  /**
   * Get teacher's assignments
   */
  getAssignments: async (params?: { page?: number; limit?: number }): Promise<Assignment[]> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const url = `/api/v0/teacher/assignments${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<{ assignments: Assignment[] }>(url);
    return response.assignments;
  },

  /**
   * Create a new assignment
   */
  createAssignment: async (data: CreateAssignmentRequest): Promise<Assignment> => {
    const response = await apiClient.post<{ assignment: Assignment }>(
      '/api/v0/teacher/assignments',
      data
    );
    return response.assignment;
  },

  /**
   * Update an assignment
   */
  updateAssignment: async (
    assignmentId: string,
    data: UpdateAssignmentRequest
  ): Promise<Assignment> => {
    const response = await apiClient.put<{ assignment: Assignment }>(
      `/api/v0/teacher/assignments/${assignmentId}`,
      data
    );
    return response.assignment;
  },

  /**
   * Delete an assignment
   */
  deleteAssignment: async (assignmentId: string): Promise<void> => {
    await apiClient.delete(`/api/v0/teacher/assignments/${assignmentId}`);
  },

  // ============ SUBMISSION & GRADING ROUTES ============

  /**
   * Get submissions for an assignment
   */
  getSubmissionsByAssignment: async (assignmentId: string): Promise<Submission[]> => {
    const response = await apiClient.get<{ submissions: Submission[] }>(
      `/api/v0/teacher/submissions?assignment_id=${assignmentId}`
    );
    return response.submissions;
  },

  /**
   * Grade a submission
   */
  gradeSubmission: async (
    submissionId: string,
    data: GradeSubmissionRequest
  ): Promise<Grade> => {
    const response = await apiClient.post<{ grade: Grade }>(
      `/api/v0/teacher/submissions/${submissionId}/grade`,
      data
    );
    return response.grade;
  },

  /**
   * Get submission statistics for an assignment
   */
  getAssignmentStats: async (assignmentId: string): Promise<AssignmentStats> => {
    const response = await apiClient.get<{ stats: AssignmentStats }>(
      `/api/v0/teacher/assignments/${assignmentId}/stats`
    );
    return response.stats;
  },
};
