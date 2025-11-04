'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { studentApi } from '@/lib/api/studentApi';
import type { Assignment } from '@/types/student';

export default function AssignmentsPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['student']);
  const searchParams = useSearchParams();
  const classIdFilter = searchParams.get('classId');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const data = await studentApi.getAssignments();

        // Filter by classId if provided
        const filtered = classIdFilter
          ? data.filter((a) => a.classId === classIdFilter)
          : data;

        setAssignments(filtered);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignments');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchAssignments();
    }
  }, [user, classIdFilter]);

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return `Due ${date.toLocaleDateString()}`;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <p className="text-lg font-mono text-neutral-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[52px] font-normal leading-tight text-neutral-700 uppercase">
              Assignments
            </h1>
            <p className="text-base text-neutral-600 mt-2">
              {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
              {classIdFilter && ' for this class'}
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

        {assignments.length === 0 && !error && (
          <Card>
            <p className="text-base font-mono text-neutral-600 text-center py-8">
              {classIdFilter
                ? 'No assignments found for this class.'
                : 'You have no assignments yet.'}
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {assignments.map((assignment) => {
            const overdue = isOverdue(assignment.dueDate);

            return (
              <Card key={assignment.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-mono text-neutral-700 uppercase">
                        {assignment.title}
                      </h2>
                      {overdue && (
                        <span className="text-xs font-mono text-red-600 bg-red-50 px-2 py-1 rounded-[2px] uppercase">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 font-mono mb-3">
                      {assignment.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-mono text-neutral-500">
                      <span className={overdue ? 'text-red-600 font-semibold' : ''}>
                        {formatDueDate(assignment.dueDate)}
                      </span>
                      <span>•</span>
                      <span>Created {new Date(assignment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Link
                    href={`/student/assignments/${assignment.id}`}
                    className="inline-block text-sm font-mono text-primary hover:text-primary-400 uppercase whitespace-nowrap ml-4"
                  >
                    View/Submit →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
