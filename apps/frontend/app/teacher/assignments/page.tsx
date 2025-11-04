'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { teacherApi } from '@/lib/api/teacherApi';
import type {
  Assignment,
  Class,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
} from '@/types/teacher';

export default function TeacherAssignmentsPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['teacher']);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateAssignmentRequest>({
    classId: '',
    title: '',
    description: '',
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assignments and classes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [assignmentsData, classesData] = await Promise.all([
          teacherApi.getAssignments(),
          teacherApi.getClasses(),
        ]);
        setAssignments(assignmentsData);
        setClasses(classesData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  // Filter assignments by class
  useEffect(() => {
    if (selectedClassId === 'all') {
      setFilteredAssignments(assignments);
    } else {
      setFilteredAssignments(
        assignments.filter((a) => ((a as any).class_id || a.classId) === selectedClassId)
      );
    }
  }, [selectedClassId, assignments]);

  // Get class name by ID
  const getClassName = (classId: string) => {
    const classItem = classes.find((c) => c.id === classId);
    return classItem?.name || 'Unknown Class';
  };

  // Create assignment
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.classId || !formData.dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Convert date to ISO 8601 format (YYYY-MM-DD -> YYYY-MM-DDTHH:mm:ss.sssZ)
      const dueDateTime = new Date(formData.dueDate + 'T23:59:59.999Z').toISOString();

      const newAssignment = await teacherApi.createAssignment({
        classId: formData.classId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: dueDateTime,
      });

      setAssignments([...assignments, newAssignment]);
      setShowCreateModal(false);
      setFormData({ classId: '', title: '', description: '', dueDate: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update assignment
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAssignment || !formData.title.trim() || !formData.dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Convert date to ISO 8601 format (YYYY-MM-DD -> YYYY-MM-DDTHH:mm:ss.sssZ)
      const dueDateTime = new Date(formData.dueDate + 'T23:59:59.999Z').toISOString();

      const updatedAssignment = await teacherApi.updateAssignment(selectedAssignment.id, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: dueDateTime,
      });

      setAssignments(
        assignments.map((a) => (a.id === updatedAssignment.id ? updatedAssignment : a))
      );
      setShowEditModal(false);
      setSelectedAssignment(null);
      setFormData({ classId: '', title: '', description: '', dueDate: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete assignment
  const handleDelete = async () => {
    if (!selectedAssignment) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await teacherApi.deleteAssignment(selectedAssignment.id);
      setAssignments(assignments.filter((a) => a.id !== selectedAssignment.id));
      setShowDeleteModal(false);
      setSelectedAssignment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal
  const openEditModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const dueDate = (assignment as any).due_date || assignment.dueDate;
    setFormData({
      classId: (assignment as any).class_id || assignment.classId,
      title: assignment.title,
      description: assignment.description,
      dueDate: dueDate.split('T')[0], // Convert to YYYY-MM-DD
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowDeleteModal(true);
  };

  // Check if assignment is overdue
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

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[52px] font-normal leading-tight text-neutral-700 uppercase">
              Assignments
            </h1>
            <p className="text-base text-neutral-600 mt-2">
              {filteredAssignments.length} {filteredAssignments.length === 1 ? 'assignment' : 'assignments'}
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => setShowCreateModal(true)}>Create Assignment</Button>
            <Link
              href="/teacher/dashboard"
              className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase flex items-center"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Class Filter */}
        <div className="mb-6">
          <label className="block text-sm font-mono text-neutral-700 mb-2">Filter by Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Classes</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2px]">
            <p className="text-sm font-mono text-red-700">{error}</p>
          </div>
        )}

        {filteredAssignments.length === 0 && !error && (
          <Card>
            <p className="text-base font-mono text-neutral-600 text-center py-8">
              No assignments yet. Create your first assignment to get started!
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const dueDate = (assignment as any).due_date || assignment.dueDate;
            const classId = (assignment as any).class_id || assignment.classId;
            return (
              <Card key={assignment.id}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-mono text-neutral-700 uppercase">
                        {assignment.title}
                      </h2>
                      {isOverdue(dueDate) && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-mono uppercase rounded-[2px]">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 font-mono mb-3">
                      {assignment.description}
                    </p>
                    <div className="flex gap-4 text-xs text-neutral-500 font-mono">
                      <span>Class: {getClassName(classId)}</span>
                      <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/teacher/assignments/${assignment.id}/grade`}
                    className="text-sm font-mono text-primary hover:text-primary-400 uppercase px-3 py-2 border border-primary rounded-[2px]"
                  >
                    Grade
                  </Link>
                  <button
                    onClick={() => openEditModal(assignment)}
                    className="text-sm font-mono text-neutral-700 hover:text-neutral-900 uppercase px-3 py-2 border border-neutral-300 rounded-[2px]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(assignment)}
                    className="text-sm font-mono text-red-600 hover:text-red-700 uppercase px-3 py-2 border border-red-300 rounded-[2px]"
                  >
                    Del
                  </button>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">
              Create Assignment
            </h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Class *</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Title *</label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Week 5 Quiz"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Assignment details"
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-[2px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Due Date *</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
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
                    setFormData({ classId: '', title: '', description: '', dueDate: '' });
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
      {showEditModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">
              Edit Assignment
            </h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">
                  Class (read-only)
                </label>
                <Input
                  type="text"
                  value={getClassName(formData.classId)}
                  disabled
                  className="bg-neutral-100"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Title *</label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
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
              <div className="mb-6">
                <label className="block text-sm font-mono text-neutral-700 mb-2">Due Date *</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
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
                    setSelectedAssignment(null);
                    setFormData({ classId: '', title: '', description: '', dueDate: '' });
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

      {/* Delete Modal */}
      {showDeleteModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2px] p-6 max-w-md w-full">
            <h2 className="text-2xl font-mono text-neutral-700 uppercase mb-4">
              Delete Assignment
            </h2>
            <p className="text-sm font-mono text-neutral-600 mb-6">
              Are you sure you want to delete "{selectedAssignment.title}"? This will also delete
              all student submissions.
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
                  setSelectedAssignment(null);
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
