/**
 * Teacher-related types for frontend
 * Based on database schema from @concentrate/database
 */

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  fileUrl: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  submissionId: string;
  teacherId: string;
  grade: string | number;
  feedback: string | null;
  gradedAt: string;
  updatedAt: string;
}

export interface CreateClassRequest {
  name: string;
  description?: string;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string | null;
}

export interface CreateAssignmentRequest {
  classId: string;
  title: string;
  description: string;
  dueDate: string;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  dueDate?: string;
}

export interface AddStudentRequest {
  studentId: string;
}

export interface AddMultipleStudentsRequest {
  studentIds: string[];
}

export interface GradeSubmissionRequest {
  grade: number;
  feedback?: string | null;
}

export interface ClassWithStudentCount extends Class {
  studentCount?: number;
}

export interface AssignmentWithSubmissionCount extends Assignment {
  submissionCount?: number;
  gradedCount?: number;
}

export interface AssignmentStats {
  total: number;
  graded: number;
  ungraded: number;
}
