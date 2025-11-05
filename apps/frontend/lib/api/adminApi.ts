import { apiClient } from '../apiClient';
import type {
  AdminUser,
  CreateUserRequest,
  UpdateUserRequest,
  UserQueryParams,
  UserSearchParams,
  UserResponse,
  TeacherGroup,
  CreateTeacherGroupRequest,
  UpdateTeacherGroupRequest,
} from '@/types/admin';

export const adminApi = {
  // ============ USER MANAGEMENT ROUTES ============

  /**
   * Get all users with optional filtering and pagination
   */
  getUsers: async (params?: UserQueryParams): Promise<AdminUser[]> => {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.set('role', params.role);
    if (params?.suspended !== undefined) queryParams.set('suspended', params.suspended.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const url = `/api/v0/admin/users${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<{ users: AdminUser[] }>(url);
    return response.users;
  },

  /**
   * Search users by email with optional role filter
   */
  searchUsers: async (params: UserSearchParams): Promise<AdminUser[]> => {
    const queryParams = new URLSearchParams();
    if (params.email) queryParams.set('email', params.email);
    if (params.role) queryParams.set('role', params.role);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const url = `/api/v0/admin/users/search?${queryParams}`;
    const response = await apiClient.get<{ users: AdminUser[] }>(url);
    return response.users;
  },

  /**
   * Create a new user
   */
  createUser: async (data: CreateUserRequest): Promise<AdminUser> => {
    const response = await apiClient.post<UserResponse>('/api/v0/admin/users', data);
    return response.user;
  },

  /**
   * Update an existing user
   */
  updateUser: async (userId: string, data: UpdateUserRequest): Promise<AdminUser> => {
    const response = await apiClient.put<UserResponse>(`/api/v0/admin/users/${userId}`, data);
    return response.user;
  },

  /**
   * Delete a user
   */
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/v0/admin/users/${userId}`);
  },

  /**
   * Suspend a user account
   */
  suspendUser: async (userId: string): Promise<AdminUser> => {
    const response = await apiClient.post<UserResponse>(
      `/api/v0/admin/users/${userId}/suspend`,
      {}
    );
    return response.user;
  },

  /**
   * Unsuspend a user account
   */
  unsuspendUser: async (userId: string): Promise<AdminUser> => {
    const response = await apiClient.post<UserResponse>(
      `/api/v0/admin/users/${userId}/unsuspend`,
      {}
    );
    return response.user;
  },

  // ============ TEACHER GROUPS ROUTES (Placeholder - 501 Not Implemented) ============

  /**
   * Get all teacher groups
   * Note: Returns 501 - Not Implemented (future feature)
   */
  getTeacherGroups: async (): Promise<TeacherGroup[]> => {
    try {
      const response = await apiClient.get<{ teacherGroups: TeacherGroup[] }>(
        '/api/v0/admin/teacher-groups'
      );
      return response.teacherGroups;
    } catch (error) {
      // Expected 501 response for now
      return [];
    }
  },

  /**
   * Create a new teacher group
   * Note: Returns 501 - Not Implemented (future feature)
   */
  createTeacherGroup: async (data: CreateTeacherGroupRequest): Promise<TeacherGroup | null> => {
    try {
      const response = await apiClient.post<{ teacherGroup: TeacherGroup }>(
        '/api/v0/admin/teacher-groups',
        data
      );
      return response.teacherGroup;
    } catch (error) {
      // Expected 501 response for now
      return null;
    }
  },

  /**
   * Update a teacher group
   * Note: Returns 501 - Not Implemented (future feature)
   */
  updateTeacherGroup: async (
    groupId: string,
    data: UpdateTeacherGroupRequest
  ): Promise<TeacherGroup | null> => {
    try {
      const response = await apiClient.put<{ teacherGroup: TeacherGroup }>(
        `/api/v0/admin/teacher-groups/${groupId}`,
        data
      );
      return response.teacherGroup;
    } catch (error) {
      // Expected 501 response for now
      return null;
    }
  },

  /**
   * Delete a teacher group
   * Note: Returns 501 - Not Implemented (future feature)
   */
  deleteTeacherGroup: async (groupId: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/v0/admin/teacher-groups/${groupId}`);
    } catch (error) {
      // Expected 501 response for now
      // Silently fail for future feature
    }
  },
};
