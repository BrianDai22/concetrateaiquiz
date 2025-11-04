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
import type { Assignment, Submission, Grade } from '@/types/teacher';

interface SubmissionWithStudent extends Submission {
  student?: {
    id: string;
    name: string;
    email: string;
  };
  grade?: Grade;
}

type FilterType = 'all' | 'graded' | 'ungraded';

export default function GradeAssignmentPage() {
  const params = useParams();
  const assignmentId = params.id as string;
  const { user, isLoading: authLoading } = useRequireAuth(['teacher']);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grading states (inline grading)
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeValue, setGradeValue] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assignment and submissions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch assignment info
        const allAssignments = await teacherApi.getAssignments();
        const foundAssignment = allAssignments.find((a) => a.id === assignmentId);

        if (!foundAssignment) {
          setError('Assignment not found');
          return;
        }

        setAssignment(foundAssignment);

        // Fetch submissions for this assignment
        const submissionsData = await teacherApi.getSubmissionsByAssignment(assignmentId);

        // Fetch student names for each submission
        const submissionsWithStudents = await Promise.all(
          submissionsData.map(async (sub) => {
            try {
              // Fetch student info - we can use the stats endpoint or user endpoint
              // For now, we'll just use the studentId
              return {
                ...sub,
                student: {
                  id: sub.studentId,
                  name: `Student ${sub.studentId.slice(0, 8)}`,
                  email: 'student@example.com',
                },
              };
            } catch {
              return {
                ...sub,
                student: {
                  id: sub.studentId,
                  name: `Student ${sub.studentId.slice(0, 8)}`,
                  email: 'unknown',
                },
              };
            }
          })
        );

        setSubmissions(submissionsWithStudents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && assignmentId) {
      fetchData();
    }
  }, [user, assignmentId]);

  // Filter submissions
  useEffect(() => {
    let filtered = submissions;

    if (filter === 'graded') {
      filtered = submissions.filter((s) => s.grade);
    } else if (filter === 'ungraded') {
      filtered = submissions.filter((s) => !s.grade);
    }

    setFilteredSubmissions(filtered);
  }, [filter, submissions]);

  // Submit grade
  const handleGrade = async (submissionId: string) => {
    if (gradeValue < 0 || gradeValue > 100) {
      setError('Grade must be between 0 and 100');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newGrade = await teacherApi.gradeSubmission(submissionId, {
        grade: gradeValue,
        feedback: feedback.trim() || null,
      });

      // Update local state
      setSubmissions(
        submissions.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                grade: newGrade,
              }
            : s
        )
      );

      // Reset grading form
      setGradingSubmissionId(null);
      setGradeValue(0);
      setFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit grade');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start grading a submission
  const startGrading = (submission: SubmissionWithStudent) => {
    setGradingSubmissionId(submission.id);
    if (submission.grade) {
      setGradeValue(Number(submission.grade.grade));
      setFeedback(submission.grade.feedback || '');
    } else {
      setGradeValue(0);
      setFeedback('');
    }
  };

  // Cancel grading
  const cancelGrading = () => {
    setGradingSubmissionId(null);
    setGradeValue(0);
    setFeedback('');
    setError(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <p className="text-lg font-mono text-neutral-700">Loading...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <Card>
          <p className="text-base font-mono text-neutral-600">Assignment not found</p>
          <Link
            href="/teacher/assignments"
            className="text-sm font-mono text-primary hover:text-primary-400 uppercase mt-4 inline-block"
          >
            ← Back to Assignments
          </Link>
        </Card>
      </div>
    );
  }

  const ungradedCount = submissions.filter((s) => !s.grade).length;
  const gradedCount = submissions.filter((s) => s.grade).length;

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[52px] font-normal leading-tight text-neutral-700 uppercase">
              Grade Assignment
            </h1>
            <p className="text-xl text-neutral-600 mt-2 font-mono">{assignment.title}</p>
            <p className="text-sm text-neutral-500 mt-1 font-mono">
              Due: {new Date(assignment.dueDate).toLocaleDateString()} •{' '}
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''} •{' '}
              {gradedCount} graded • {ungradedCount} pending
            </p>
          </div>
          <Link
            href="/teacher/assignments"
            className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase"
          >
            ← Back
          </Link>
        </div>

        {/* Assignment Description */}
        <Card className="mb-6">
          <h2 className="text-lg font-mono text-neutral-700 uppercase mb-2">Description</h2>
          <p className="text-sm text-neutral-600 font-mono">{assignment.description}</p>
        </Card>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-mono text-sm uppercase rounded-[2px] ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-neutral-300 text-neutral-700'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilter('ungraded')}
              className={`px-4 py-2 font-mono text-sm uppercase rounded-[2px] ${
                filter === 'ungraded'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-neutral-300 text-neutral-700'
              }`}
            >
              Ungraded ({ungradedCount})
            </button>
            <button
              onClick={() => setFilter('graded')}
              className={`px-4 py-2 font-mono text-sm uppercase rounded-[2px] ${
                filter === 'graded'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-neutral-300 text-neutral-700'
              }`}
            >
              Graded ({gradedCount})
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2px]">
            <p className="text-sm font-mono text-red-700">{error}</p>
          </div>
        )}

        {filteredSubmissions.length === 0 && !error && (
          <Card>
            <p className="text-base font-mono text-neutral-600 text-center py-8">
              {filter === 'ungraded'
                ? 'All submissions have been graded!'
                : filter === 'graded'
                  ? 'No graded submissions yet'
                  : 'No submissions yet'}
            </p>
          </Card>
        )}

        {/* Submissions */}
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id}>
              <div className="space-y-4">
                {/* Student Info */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-mono text-neutral-700">
                      {submission.student?.name || 'Unknown Student'}
                    </h3>
                    <p className="text-xs text-neutral-500 font-mono">
                      Submitted: {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  {submission.grade && (
                    <div className="text-right">
                      <p className="text-2xl font-mono text-primary">{submission.grade.grade}/100</p>
                      <p className="text-xs text-neutral-500 font-mono">
                        Graded {new Date(submission.grade.gradedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Submission Content */}
                <div className="p-3 bg-neutral-50 rounded-[2px] border border-neutral-200">
                  <p className="text-sm font-mono text-neutral-700 whitespace-pre-wrap">
                    {submission.content}
                  </p>
                  {submission.fileUrl && (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-primary hover:text-primary-400 uppercase mt-2 inline-block"
                    >
                      View Attachment →
                    </a>
                  )}
                </div>

                {/* Existing Feedback */}
                {submission.grade && submission.grade.feedback && gradingSubmissionId !== submission.id && (
                  <div className="p-3 bg-blue-50 rounded-[2px] border border-blue-200">
                    <p className="text-xs font-mono text-neutral-500 uppercase mb-1">Feedback:</p>
                    <p className="text-sm font-mono text-neutral-700">{submission.grade.feedback}</p>
                  </div>
                )}

                {/* Grading Form */}
                {gradingSubmissionId === submission.id ? (
                  <div className="p-4 bg-primary-50 rounded-[2px] border border-primary-200">
                    <h4 className="text-sm font-mono text-neutral-700 uppercase mb-3">
                      {submission.grade ? 'Update Grade' : 'Grade Submission'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-mono text-neutral-700 uppercase mb-2">
                          Grade (0-100) *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={gradeValue}
                          onChange={(e) => setGradeValue(Number(e.target.value))}
                          placeholder="85"
                          required
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-mono text-neutral-700 uppercase mb-2">
                        Feedback (optional)
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Great work! Consider..."
                        rows={3}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => handleGrade(submission.id)} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Grade'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={cancelGrading}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button onClick={() => startGrading(submission)}>
                      {submission.grade ? 'Update Grade' : 'Grade'}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
