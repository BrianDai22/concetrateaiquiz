'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { teacherApi } from '@/lib/api/teacherApi';
import { apiClient } from '@/lib/apiClient';
import type { Class, Assignment } from '@/types/teacher';

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ClassDetailPage() {
  const params = useParams();
  const classId = params.id as string;
  const { user, isLoading: authLoading } = useRequireAuth(['teacher']);

  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form state
  const [studentEmail, setStudentEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch class data, students, and assignments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch class info
        const allClasses = await teacherApi.getClasses();
        const foundClass = allClasses.find((c) => c.id === classId);

        if (!foundClass) {
          setError('Class not found');
          return;
        }

        setClassData(foundClass);

        // Fetch students in class (using stats endpoint)
        const studentsResponse = await apiClient.get<{ students: Student[] }>(
          `/api/v0/stats/classes/${classId}`
        );
        setStudents(studentsResponse.students || []);

        // Fetch assignments for this class
        const allAssignments = await teacherApi.getAssignments();
        const classAssignments = allAssignments.filter((a) => a.classId === classId);
        setAssignments(classAssignments);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load class data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && classId) {
      fetchData();
    }
  }, [user, classId]);

  // Add student by email
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentEmail.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // First, find the student by email (using stats endpoint to get all students)
      const allStudentsResponse = await apiClient.get<{ students: Student[] }>(
        '/api/v0/stats/student-names'
      );

      // Since stats endpoint only returns names, we need to use a different approach
      // Let's use the User endpoint if available, or we can search through enrolled students
      // For now, we'll need the student ID. This is a limitation - backend needs a GET /users/search endpoint

      // Temporary workaround: Ask for student ID instead
      setError(
        'Feature requires student ID. Backend needs a user search endpoint. Please use student ID for now.'
      );

      // TODO: Implement when backend has user search endpoint
      // await teacherApi.addStudentToClass(classId, { studentId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove student
  const handleRemoveStudent = async () => {
    if (!selectedStudent) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await teacherApi.removeStudentFromClass(classId, selectedStudent.id);

      // Update local state
      setStudents(students.filter((s) => s.id !== selectedStudent.id));
      setShowRemoveModal(false);
      setSelectedStudent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove student');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <p className="text-lg font-mono text-neutral-700">Loading...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <Card>
          <p className="text-base font-mono text-neutral-600">Class not found</p>
          <Link
            href="/teacher/classes"
            className="text-sm font-mono text-primary hover:text-primary-400 uppercase mt-4 inline-block"
          >
            ← Back to Classes
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[52px] font-normal leading-tight text-neutral-700 uppercase">
              {classData.name}
            </h1>
            <p className="text-base text-neutral-600 mt-2">{classData.description}</p>
          </div>
          <Link
            href="/teacher/classes"
            className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase"
          >
            ← Back to Classes
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2px]">
            <p className="text-sm font-mono text-red-700">{error}</p>
          </div>
        )}

        {/* Students Section */}
        <Card className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase">
              Students ({students.length})
            </h2>
            <Button onClick={() => setShowAddModal(true)}>Add Student</Button>
          </div>

          {students.length === 0 ? (
            <p className="text-sm font-mono text-neutral-600 text-center py-4">
              No students enrolled yet
            </p>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex justify-between items-center p-3 bg-neutral-50 rounded-[2px] border border-neutral-200"
                >
                  <div>
                    <p className="text-sm font-mono text-neutral-700">{student.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{student.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowRemoveModal(true);
                    }}
                    className="text-xs font-mono text-red-600 hover:text-red-700 uppercase px-3 py-1 border border-red-300 rounded-[2px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Assignments Section */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase">
              Assignments ({assignments.length})
            </h2>
            <Link href="/teacher/assignments">
              <Button>Create Assignment</Button>
            </Link>
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm font-mono text-neutral-600 text-center py-4">
              No assignments yet
            </p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 bg-neutral-50 rounded-[2px] border border-neutral-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-base font-mono text-neutral-700 uppercase mb-1">
                        {assignment.title}
                      </h3>
                      <p className="text-sm text-neutral-600 font-mono mb-2">
                        {assignment.description}
                      </p>
                      <p className="text-xs text-neutral-500 font-mono">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/teacher/assignments/${assignment.id}/grade`}
                      className="text-sm font-mono text-primary hover:text-primary-400 uppercase ml-4"
                    >
                      Grade →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">Add Student</h2>
            <p className="text-sm text-neutral-600 font-mono mb-4">
              Note: This feature requires a user search endpoint in the backend. For now, you can
              manually add students by ID through the API.
            </p>
            <form onSubmit={handleAddStudent}>
              <div className="mb-6">
                <label className="block text-sm font-mono text-neutral-700 mb-2">
                  Student Email
                </label>
                <Input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Student'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setStudentEmail('');
                    setError(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Student Modal */}
      {showRemoveModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">Remove Student</h2>
            <p className="text-sm font-mono text-neutral-600 mb-6">
              Are you sure you want to remove {selectedStudent.name} from this class?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRemoveStudent}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 text-white font-mono text-sm uppercase px-4 py-2 rounded-[2px] hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Removing...' : 'Remove'}
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRemoveModal(false);
                  setSelectedStudent(null);
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
