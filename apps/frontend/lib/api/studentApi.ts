import { apiClient } from '../apiClient';
import type {
  Class,
  Assignment,
  Submission,
  Grade,
  GradeWithSubmission,
  SubmitAssignmentRequest,
  UpdateSubmissionRequest,
} from '@/types/student';

export const studentApi = {
  /**
   * Get student's enrolled classes
   */
  getClasses: async (): Promise<Class[]> => {
    const response = await apiClient.get<{ classes: Class[] }>('/api/v0/student/classes');
    return response.classes;
  },

  /**
   * Get all assignments for student's classes
   */
  getAssignments: async (): Promise<Assignment[]> => {
    const response = await apiClient.get<{ assignments: Assignment[] }>(
      '/api/v0/student/assignments'
    );
    return response.assignments;
  },

  /**
   * Get assignment details by ID
   */
  getAssignmentById: async (id: string): Promise<Assignment> => {
    const response = await apiClient.get<{ assignment: Assignment }>(
      `/api/v0/student/assignments/${id}`
    );
    return response.assignment;
  },

  /**
   * Submit an assignment
   */
  submitAssignment: async (data: SubmitAssignmentRequest): Promise<Submission> => {
    const response = await apiClient.post<{ submission: Submission }>(
      '/api/v0/student/submissions',
      data
    );
    return response.submission;
  },

  /**
   * Update a submission (before it's graded)
   */
  updateSubmission: async (
    submissionId: string,
    data: UpdateSubmissionRequest
  ): Promise<Submission> => {
    const response = await apiClient.put<{ submission: Submission }>(
      `/api/v0/student/submissions/${submissionId}`,
      data
    );
    return response.submission;
  },

  /**
   * Get all grades for student
   */
  getGrades: async (): Promise<GradeWithSubmission[]> => {
    const response = await apiClient.get<{ grades: GradeWithSubmission[] }>(
      '/api/v0/student/grades'
    );
    return response.grades;
  },

  /**
   * Get specific grade details by ID
   */
  getGradeById: async (id: string): Promise<Grade> => {
    const response = await apiClient.get<{ grade: Grade }>(`/api/v0/student/grades/${id}`);
    return response.grade;
  },
};
