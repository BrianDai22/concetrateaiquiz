'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LogoutButton } from '@/components/LogoutButton';
import { adminApi } from '@/lib/api/adminApi';
import type { AdminUser } from '@/types/admin';

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  totalTeachers: number;
  totalStudents: number;
  suspendedUsers: number;
}

export default function AdminDashboard() {
  const { user, isLoading } = useRequireAuth(['admin']);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const users = await adminApi.getUsers({});

        const calculated: Stats = {
          totalUsers: users.length,
          totalAdmins: users.filter((u: AdminUser) => u.role === 'admin').length,
          totalTeachers: users.filter((u: AdminUser) => u.role === 'teacher').length,
          totalStudents: users.filter((u: AdminUser) => u.role === 'student').length,
          suspendedUsers: users.filter((u: AdminUser) => u.suspended).length,
        };

        setStats(calculated);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

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
              Admin Dashboard
            </h1>
            <p className="text-base text-neutral-600 mt-2">Welcome back, {user?.name}</p>
          </div>
          <LogoutButton />
        </div>

        {/* Quick Stats */}
        {statsLoading ? (
          <div className="mb-8">
            <Card>
              <p className="text-sm font-mono text-neutral-600 text-center py-4">
                Loading statistics...
              </p>
            </Card>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <div className="text-center">
                <p className="text-3xl font-mono text-primary mb-1">{stats.totalUsers}</p>
                <p className="text-xs font-mono text-neutral-600 uppercase">Total Users</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-3xl font-mono text-purple-600 mb-1">{stats.totalAdmins}</p>
                <p className="text-xs font-mono text-neutral-600 uppercase">Admins</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-3xl font-mono text-blue-600 mb-1">{stats.totalTeachers}</p>
                <p className="text-xs font-mono text-neutral-600 uppercase">Teachers</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-3xl font-mono text-green-600 mb-1">{stats.totalStudents}</p>
                <p className="text-xs font-mono text-neutral-600 uppercase">Students</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-3xl font-mono text-red-600 mb-1">{stats.suspendedUsers}</p>
                <p className="text-xs font-mono text-neutral-600 uppercase">Suspended</p>
              </div>
            </Card>
          </div>
        ) : null}

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <h2 className="text-xl font-mono text-neutral-700 uppercase mb-4">
              User Management
            </h2>
            <p className="text-sm text-neutral-600 font-mono mb-6">
              Create and manage teachers, students, and other admins
            </p>
            <Link href="/admin/users">
              <Button>Manage Users →</Button>
            </Link>
          </Card>

          <Card>
            <h2 className="text-xl font-mono text-neutral-700 uppercase mb-4">
              Teacher Groups
            </h2>
            <p className="text-sm text-neutral-600 font-mono mb-4">
              Organize teachers into groups and manage permissions
            </p>
            <p className="text-sm text-neutral-400 font-mono mt-4">Coming in Phase 3</p>
          </Card>

          <Card>
            <h2 className="text-xl font-mono text-neutral-700 uppercase mb-4">System Stats</h2>
            <p className="text-sm text-neutral-600 font-mono mb-4">
              View platform-wide statistics and analytics
            </p>
            <p className="text-sm text-neutral-400 font-mono mt-4">Coming in Phase 3</p>
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
