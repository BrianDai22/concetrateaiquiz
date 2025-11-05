/**
 * Student-related types for frontend
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

export interface GradeWithSubmission {
  submission: Submission;
  grade: Grade;
  assignment: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
  };
}

export interface SubmitAssignmentRequest {
  assignmentId: string;
  content: string;
  fileUrl?: string;
}

export interface UpdateSubmissionRequest {
  content?: string;
  fileUrl?: string;
}
