'use client';

import React from 'react';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { LogoutButton } from '@/components/LogoutButton';

export default function TeacherDashboard() {
  const { user, isLoading } = useRequireAuth(['teacher']);

  if (isLoading) {
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
              Teacher Dashboard
            </h1>
            <p className="text-base text-neutral-600 mt-2">
              Welcome back, {user?.name}
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <h2 className="text-xl font-mono text-neutral-700 uppercase mb-4">
              My Classes
            </h2>
            <p className="text-sm text-neutral-600 font-mono">
              Create and manage your classes
            </p>
            <p className="text-sm text-neutral-400 font-mono mt-4">
              Coming in Phase 4
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-mono text-neutral-700 uppercase mb-4">
              Assignments
            </h2>
            <p className="text-sm text-neutral-600 font-mono">
              Create assignments and track submissions
            </p>
            <p className="text-sm text-neutral-400 font-mono mt-4">
              Coming in Phase 4
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-mono text-neutral-700 uppercase mb-4">
              Grading
            </h2>
            <p className="text-sm text-neutral-600 font-mono">
              Grade submissions and provide feedback
            </p>
            <p className="text-sm text-neutral-400 font-mono mt-4">
              Coming in Phase 4
            </p>
          </Card>
        </div>

        <Card className="mt-6">
          <h2 className="text-xl font-mono text-neutral-700 uppercase mb-4">
            Your Account
          </h2>
          <div className="space-y-2 font-mono text-sm">
            <p>
              <span className="text-neutral-600">Email:</span>{' '}
              <span className="text-neutral-700">{user?.email}</span>
            </p>
            <p>
              <span className="text-neutral-600">Role:</span>{' '}
              <span className="text-neutral-700 uppercase">{user?.role}</span>
            </p>
            <p>
              <span className="text-neutral-600">User ID:</span>{' '}
              <span className="text-neutral-500 text-xs">{user?.id}</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
