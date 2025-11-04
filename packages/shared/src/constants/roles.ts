/**
 * User roles and permissions constants
 */

export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

/**
 * Permissions by role
 * Each role has a set of permissions that determine what actions they can perform
 */
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // User management
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'users:suspend',
    'users:unsuspend',
    // Teacher group management
    'teacher_groups:create',
    'teacher_groups:read',
    'teacher_groups:update',
    'teacher_groups:delete',
    'teacher_groups:add_member',
    'teacher_groups:remove_member',
    // View all data
    'classes:read_all',
    'assignments:read_all',
    'grades:read_all',
  ],
  [USER_ROLES.TEACHER]: [
    // Class management
    'classes:create',
    'classes:read_own',
    'classes:update_own',
    'classes:delete_own',
    'classes:add_student',
    'classes:remove_student',
    // Assignment management
    'assignments:create',
    'assignments:read_own',
    'assignments:update_own',
    'assignments:delete_own',
    // Grading
    'submissions:read_class',
    'grades:create',
    'grades:update_own',
    'grades:read_class',
  ],
  [USER_ROLES.STUDENT]: [
    // View own data
    'classes:read_enrolled',
    'assignments:read_class',
    'grades:read_own',
    // Submissions
    'submissions:create_own',
    'submissions:update_own',
    'submissions:read_own',
  ],
} as const

export type Permission = (typeof ROLE_PERMISSIONS)[UserRole][number]

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission as never)
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role]
}
