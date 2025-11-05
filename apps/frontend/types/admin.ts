/**
 * Admin-related types for frontend
 * Based on validation schemas from @concentrate/validation
 */

import { User, Role } from './auth';

/**
 * Extended User interface with admin-specific fields
 */
export interface AdminUser extends User {
  suspended: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for creating a new user
 * Maps to CreateUserSchema in backend
 */
export interface CreateUserRequest {
  email: string;
  password?: string; // Optional for OAuth users
  name: string;
  role: Role;
  suspended?: boolean;
}

/**
 * Request body for updating an existing user
 * Maps to UpdateUserSchema in backend
 */
export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: Role;
}

/**
 * Query parameters for filtering users
 * Maps to UserQuerySchema in backend
 */
export interface UserQueryParams {
  role?: Role;
  suspended?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Query parameters for searching users by email
 * Maps to UserSearchSchema in backend
 */
export interface UserSearchParams {
  email?: string;
  role?: Role;
  page?: number;
  limit?: number;
}

/**
 * Pagination metadata for user lists
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response for user lists
 */
export interface PaginatedUsersResponse {
  users: AdminUser[];
  pagination: PaginationMeta;
}

/**
 * Response for single user operations
 */
export interface UserResponse {
  user: AdminUser;
  message?: string;
}

/**
 * Teacher group (placeholder for future implementation)
 */
export interface TeacherGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for creating a teacher group
 */
export interface CreateTeacherGroupRequest {
  name: string;
  description?: string;
}

/**
 * Request body for updating a teacher group
 */
export interface UpdateTeacherGroupRequest {
  name?: string;
  description?: string | null;
}

/**
 * Statistics for admin dashboard
 */
export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalTeachers: number;
  totalStudents: number;
  suspendedUsers: number;
}
