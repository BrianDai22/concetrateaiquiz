'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { studentApi } from '@/lib/api/studentApi';
import type { GradeWithSubmission } from '@/types/student';

export default function GradesPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['student']);
  const [grades, setGrades] = useState<GradeWithSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setIsLoading(true);
        const data = await studentApi.getGrades();
        setGrades(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grades');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchGrades();
    }
  }, [user]);

  const calculateAverage = () => {
    if (grades.length === 0) return null;
    const sum = grades.reduce((acc, { grade }) => acc + Number(grade.grade), 0);
    return (sum / grades.length).toFixed(2);
  };

  const getGradeColor = (grade: string | number) => {
    const numGrade = Number(grade);
    if (numGrade >= 90) return 'text-green-600';
    if (numGrade >= 80) return 'text-green-500';
    if (numGrade >= 70) return 'text-primary';
    if (numGrade >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <p className="text-lg font-mono text-neutral-700">Loading...</p>
      </div>
    );
  }

  const averageGrade = calculateAverage();

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[52px] font-normal leading-tight text-neutral-700 uppercase">
              My Grades
            </h1>
            <p className="text-base text-neutral-600 mt-2">
              {grades.length} {grades.length === 1 ? 'grade' : 'grades'} received
              {averageGrade && ` • Average: ${averageGrade}%`}
            </p>
          </div>
          <Link
            href="/student/dashboard"
            className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2px]">
            <p className="text-sm font-mono text-red-700">{error}</p>
          </div>
        )}

        {grades.length === 0 && !error && (
          <Card>
            <p className="text-base font-mono text-neutral-600 text-center py-8">
              No grades yet. Complete and submit assignments to receive grades.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {grades.map(({ submission, grade, assignment }) => (
            <Card key={grade.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h2 className="text-xl font-mono text-neutral-700 uppercase">
                      {assignment.title}
                    </h2>
                    <span
                      className={`text-2xl font-mono font-bold ${getGradeColor(grade.grade)}`}
                    >
                      {grade.grade}%
                    </span>
                  </div>

                  {grade.feedback && (
                    <div className="mb-4 p-3 bg-neutral-50 rounded-[2px]">
                      <p className="text-sm font-mono text-neutral-700 uppercase mb-2">
                        Teacher Feedback:
                      </p>
                      <p className="text-sm text-neutral-600 font-mono whitespace-pre-wrap">
                        {grade.feedback}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-neutral-200 pt-3">
                    <p className="text-sm font-mono text-neutral-700 uppercase mb-2">
                      Your Submission:
                    </p>
                    <p className="text-sm text-neutral-600 font-mono line-clamp-3 mb-3">
                      {submission.content}
                    </p>
                    {submission.fileUrl && (
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-primary hover:text-primary-400 uppercase"
                      >
                        View Attached File →
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 mt-4">
                    <span>Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Graded: {new Date(grade.gradedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
