'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { teacherApi } from '@/lib/api/teacherApi';
import type { Class, CreateClassRequest, UpdateClassRequest } from '@/types/teacher';

export default function TeacherClassesPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['teacher']);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateClassRequest>({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const data = await teacherApi.getClasses();
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

  // Create class
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Class name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newClass = await teacherApi.createClass({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      });

      setClasses([...classes, newClass]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update class
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass || !formData.name.trim()) {
      setError('Class name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const updatedClass = await teacherApi.updateClass(selectedClass.id, {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
      });

      setClasses(classes.map((c) => (c.id === updatedClass.id ? updatedClass : c)));
      setShowEditModal(false);
      setSelectedClass(null);
      setFormData({ name: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update class');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete class
  const handleDelete = async () => {
    if (!selectedClass) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await teacherApi.deleteClass(selectedClass.id);
      setClasses(classes.filter((c) => c.id !== selectedClass.id));
      setShowDeleteModal(false);
      setSelectedClass(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal
  const openEditModal = (classItem: Class) => {
    setSelectedClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || '',
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (classItem: Class) => {
    setSelectedClass(classItem);
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[52px] font-normal leading-tight text-neutral-700 uppercase">
              My Classes
            </h1>
            <p className="text-base text-neutral-600 mt-2">
              {classes.length} {classes.length === 1 ? 'class' : 'classes'}
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => setShowCreateModal(true)}>Create Class</Button>
            <Link
              href="/teacher/dashboard"
              className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase flex items-center"
            >
              ← Back
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2px]">
            <p className="text-sm font-mono text-red-700">{error}</p>
          </div>
        )}

        {classes.length === 0 && !error && (
          <Card>
            <p className="text-base font-mono text-neutral-600 text-center py-8">
              No classes yet. Create your first class to get started!
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
                  Created {new Date((classItem as any).created_at || classItem.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/teacher/classes/${classItem.id}`}
                    className="flex-1 text-center text-sm font-mono text-primary hover:text-primary-400 uppercase border border-primary px-3 py-2 rounded-[2px]"
                  >
                    Manage →
                  </Link>
                  <button
                    onClick={() => openEditModal(classItem)}
                    className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase px-3 py-2 border border-neutral-300 rounded-[2px]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(classItem)}
                    className="text-sm font-mono text-red-600 hover:text-red-700 uppercase px-3 py-2 border border-red-300 rounded-[2px]"
                  >
                    Del
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">
              Create New Class
            </h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">
                  Class Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Math 101"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-mono text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the class"
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                    setFormData({ name: '', description: '' });
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
      {showEditModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">Edit Class</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">
                  Class Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-mono text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                    setSelectedClass(null);
                    setFormData({ name: '', description: '' });
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
      {showDeleteModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">Delete Class</h2>
            <p className="text-sm font-mono text-neutral-600 mb-6">
              Are you sure you want to delete "{selectedClass.name}"? This action cannot be
              undone and will remove all students and assignments associated with this class.
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
                  setSelectedClass(null);
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
