"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Global test setup for Vitest
const vitest_1 = require("vitest");
// Mock environment variables for testing
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/concentrate_quiz_test';
process.env['REDIS_URL'] = 'redis://localhost:6379/1';
process.env['JWT_SECRET'] = 'test-secret-key-for-testing-only';
process.env['JWT_EXPIRES_IN'] = '7d';
process.env['REFRESH_TOKEN_EXPIRES_IN'] = '30d';
// Clean up function after each test
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
    vitest_1.vi.restoreAllMocks();
});
// Setup before each test
(0, vitest_1.beforeEach)(() => {
    // Reset any module mocks
    vitest_1.vi.resetModules();
});
// Global test utilities
global.testUtils = {
    createMockUser: (role = 'student') => ({
        id: `test-user-${Math.random().toString(36).substr(2, 9)}`,
        email: `test-${role}@example.com`,
        name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        role,
        suspended: false,
        createdAt: new Date(),
        updatedAt: new Date()
    }),
    createMockClass: (teacherId) => ({
        id: `test-class-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Test Class',
        description: 'A test class for unit testing',
        teacherId,
        createdAt: new Date(),
        updatedAt: new Date()
    }),
    createMockAssignment: (classId) => ({
        id: `test-assignment-${Math.random().toString(36).substr(2, 9)}`,
        classId,
        title: 'Test Assignment',
        description: 'Complete the test assignment',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdAt: new Date(),
        updatedAt: new Date()
    })
};
//# sourceMappingURL=setup.js.map