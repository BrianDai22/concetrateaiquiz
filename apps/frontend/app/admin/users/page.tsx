'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminApi } from '@/lib/api/adminApi';
import type {
  AdminUser,
  CreateUserRequest,
  UpdateUserRequest,
  UserQueryParams,
} from '@/types/admin';
import type { Role } from '@/types/auth';

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['admin']);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [suspendedFilter, setSuspendedFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [searchEmail, setSearchEmail] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    name: '',
    role: 'student',
    suspended: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users with filters
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params: UserQueryParams = {};
        if (roleFilter) params.role = roleFilter;
        if (suspendedFilter === 'active') params.suspended = false;
        if (suspendedFilter === 'suspended') params.suspended = true;

        const data = await adminApi.getUsers(params);
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user, roleFilter, suspendedFilter]);

  // Search users by email
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) {
      // If search is empty, refetch with filters
      const params: UserQueryParams = {};
      if (roleFilter) params.role = roleFilter;
      if (suspendedFilter === 'active') params.suspended = false;
      if (suspendedFilter === 'suspended') params.suspended = true;

      try {
        setIsLoading(true);
        const data = await adminApi.getUsers(params);
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await adminApi.searchUsers({ email: searchEmail.trim() });
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setIsLoading(false);
    }
  };

  // Create user
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.name.trim()) {
      setError('Email and name are required');
      return;
    }

    // Password is optional for OAuth users, but if provided, validate it
    if (formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newUser = await adminApi.createUser({
        email: formData.email.trim(),
        password: formData.password?.trim() || undefined,
        name: formData.name.trim(),
        role: formData.role,
        suspended: formData.suspended,
      });

      setUsers([...users, newUser]);
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'student',
        suspended: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update user
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const updateData: UpdateUserRequest = {};
      if (formData.email.trim() !== selectedUser.email) {
        updateData.email = formData.email.trim();
      }
      if (formData.name.trim() !== selectedUser.name) {
        updateData.name = formData.name.trim();
      }
      if (formData.role !== selectedUser.role) {
        updateData.role = formData.role;
      }

      const updatedUser = await adminApi.updateUser(selectedUser.id, updateData);
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'student',
        suspended: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete user
  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await adminApi.deleteUser(selectedUser.id);
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suspend user
  const handleSuspend = async (userId: string) => {
    try {
      setError(null);
      const updatedUser = await adminApi.suspendUser(userId);
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend user');
    }
  };

  // Unsuspend user
  const handleUnsuspend = async (userId: string) => {
    try {
      setError(null);
      const updatedUser = await adminApi.unsuspendUser(userId);
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsuspend user');
    }
  };

  // Open edit modal
  const openEditModal = (userItem: AdminUser) => {
    setSelectedUser(userItem);
    setFormData({
      email: userItem.email,
      password: '',
      name: userItem.name,
      role: userItem.role,
      suspended: userItem.suspended,
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (userItem: AdminUser) => {
    setSelectedUser(userItem);
    setShowDeleteModal(true);
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[52px] font-normal leading-tight text-neutral-700 uppercase">
              User Management
            </h1>
            <p className="text-base text-neutral-600 mt-2">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => setShowCreateModal(true)}>Create User</Button>
            <Link
              href="/admin/dashboard"
              className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase flex items-center"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <Input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by email..."
                className="flex-1"
              />
              <Button type="submit">Search</Button>
              {searchEmail && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearchEmail('');
                    handleSearch(new Event('submit') as unknown as React.FormEvent);
                  }}
                >
                  Clear
                </Button>
              )}
            </form>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as Role | '')}
                className="px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
              <select
                value={suspendedFilter}
                onChange={(e) =>
                  setSuspendedFilter(e.target.value as 'all' | 'active' | 'suspended')
                }
                className="px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </Card>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2px]">
            <p className="text-sm font-mono text-red-700">{error}</p>
          </div>
        )}

        {users.length === 0 && !error && (
          <Card>
            <p className="text-base font-mono text-neutral-600 text-center py-8">
              No users found matching the current filters.
            </p>
          </Card>
        )}

        {/* Users Table */}
        {users.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-4 text-xs font-mono text-neutral-600 uppercase">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-neutral-600 uppercase">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-neutral-600 uppercase">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-neutral-600 uppercase">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-neutral-600 uppercase">
                      Created
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-mono text-neutral-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-3 px-4 text-sm font-mono text-neutral-700">
                        {userItem.name}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-neutral-600">
                        {userItem.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-mono uppercase rounded-[2px] ${
                            userItem.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : userItem.role === 'teacher'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {userItem.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-mono uppercase rounded-[2px] ${
                            userItem.suspended
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {userItem.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-neutral-500">
                        {new Date(userItem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(userItem)}
                            className="text-xs font-mono text-neutral-700 hover:text-neutral-900 uppercase px-2 py-1 border border-neutral-300 rounded-[2px]"
                          >
                            Edit
                          </button>
                          {userItem.suspended ? (
                            <button
                              onClick={() => handleUnsuspend(userItem.id)}
                              className="text-xs font-mono text-green-600 hover:text-green-700 uppercase px-2 py-1 border border-green-300 rounded-[2px]"
                            >
                              Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspend(userItem.id)}
                              className="text-xs font-mono text-yellow-600 hover:text-yellow-700 uppercase px-2 py-1 border border-yellow-300 rounded-[2px]"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => openDeleteModal(userItem)}
                            className="text-xs font-mono text-red-600 hover:text-red-700 uppercase px-2 py-1 border border-red-300 rounded-[2px]"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">Create New User</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Name *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">
                  Password (optional for OAuth)
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 chars, uppercase, lowercase, number, special"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.suspended}
                    onChange={(e) => setFormData({ ...formData, suspended: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-mono text-neutral-700">Create as suspended</span>
                </label>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      email: '',
                      password: '',
                      name: '',
                      role: 'student',
                      suspended: false,
                    });
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

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">Edit User</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Name</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setFormData({
                      email: '',
                      password: '',
                      name: '',
                      role: 'student',
                      suspended: false,
                    });
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">Delete User</h2>
            <p className="text-sm font-mono text-neutral-600 mb-6">
              Are you sure you want to delete user "{selectedUser.name}" ({selectedUser.email})?
              This action cannot be undone and will remove all data associated with this user.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 text-white font-mono text-sm uppercase px-4 py-2 rounded-[2px] hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
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
