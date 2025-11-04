'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { studentApi } from '@/lib/api/studentApi';
import type { Class } from '@/types/student';

export default function MyClassesPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['student']);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const data = await studentApi.getClasses();
        setClasses(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load classes');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchClasses();
    }
  }, [user]);

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
              My Classes
            </h1>
            <p className="text-base text-neutral-600 mt-2">
              {classes.length} {classes.length === 1 ? 'class' : 'classes'} enrolled
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

        {classes.length === 0 && !error && (
          <Card>
            <p className="text-base font-mono text-neutral-600 text-center py-8">
              You are not enrolled in any classes yet.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <Card key={classItem.id}>
              <h2 className="text-xl font-mono text-neutral-700 uppercase mb-2">
                {classItem.name}
              </h2>
              {classItem.description && (
                <p className="text-sm text-neutral-600 font-mono mb-4 line-clamp-3">
                  {classItem.description}
                </p>
              )}
              <div className="mt-auto pt-4 border-t border-neutral-200">
                <p className="text-xs text-neutral-500 font-mono mb-3">
                  Created {new Date(classItem.createdAt).toLocaleDateString()}
                </p>
                <Link
                  href={`/student/assignments?classId=${classItem.id}`}
                  className="inline-block text-sm font-mono text-primary hover:text-primary-400 uppercase"
                >
                  View Assignments →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
