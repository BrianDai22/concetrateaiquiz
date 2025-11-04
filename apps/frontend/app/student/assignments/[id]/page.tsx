'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { studentApi } from '@/lib/api/studentApi';
import type { Assignment } from '@/types/student';

export default function AssignmentDetailPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['student']);
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setIsLoading(true);
        const data = await studentApi.getAssignmentById(assignmentId);
        setAssignment(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignment');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && assignmentId) {
      fetchAssignment();
    }
  }, [user, assignmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Please enter your submission content');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await studentApi.submitAssignment({
        assignmentId,
        content: content.trim(),
        fileUrl: fileUrl.trim() || undefined,
      });

      setSuccess('Assignment submitted successfully!');
      setContent('');
      setFileUrl('');

      // Redirect to assignments page after 2 seconds
      setTimeout(() => {
        router.push('/student/assignments');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
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
      <div className="min-h-screen bg-neutral-100 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <p className="text-base font-mono text-neutral-600 text-center py-8">
              Assignment not found
            </p>
            <Link
              href="/student/assignments"
              className="block text-center text-sm font-mono text-primary hover:text-primary-400 uppercase mt-4"
            >
              ← Back to Assignments
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const overdue = isOverdue(assignment.dueDate);

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[52px] font-normal leading-tight text-neutral-700 uppercase">
              Submit Assignment
            </h1>
          </div>
          <Link
            href="/student/assignments"
            className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase"
          >
            ← Back to Assignments
          </Link>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-[2px]">
            <p className="text-sm font-mono text-green-700">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2px]">
            <p className="text-sm font-mono text-red-700">{error}</p>
          </div>
        )}

        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase">
              {assignment.title}
            </h2>
            {overdue && (
              <span className="text-xs font-mono text-red-600 bg-red-50 px-2 py-1 rounded-[2px] uppercase">
                Overdue
              </span>
            )}
          </div>

          <p className="text-base text-neutral-600 font-mono mb-4">{assignment.description}</p>

          <div className="flex items-center gap-4 text-sm font-mono text-neutral-500 border-t border-neutral-200 pt-4">
            <span className={overdue ? 'text-red-600 font-semibold' : ''}>
              Due: {new Date(assignment.dueDate).toLocaleDateString()} at{' '}
              {new Date(assignment.dueDate).toLocaleTimeString()}
            </span>
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-mono text-neutral-700 uppercase mb-6">Your Submission</h3>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-mono text-neutral-700 mb-2">
                Submission Content *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your assignment submission here..."
                className="w-full h-64 px-4 py-3 font-mono text-sm bg-white border border-neutral-300 rounded-[2px] focus:outline-none focus:border-primary resize-y"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="fileUrl" className="block text-sm font-mono text-neutral-700 mb-2">
                File URL (Optional)
              </label>
              <Input
                id="fileUrl"
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://example.com/your-file.pdf"
                disabled={isSubmitting}
              />
              <p className="text-xs font-mono text-neutral-500 mt-2">
                Provide a URL to any supporting files (Google Drive, Dropbox, etc.)
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting || !content.trim()}>
                {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
              </Button>
              <Link href="/student/assignments">
                <Button type="button" variant="secondary" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
