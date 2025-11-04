"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTestData = exports.createAuthenticatedRequest = void 0;
// Integration test setup for API testing
const vitest_1 = require("vitest");
require("./setup"); // Import base setup
// Database and Redis cleanup utilities will be added here
let dbConnection;
let redisConnection;
(0, vitest_1.beforeAll)(async () => {
    // Setup test database connection
    // This will be implemented when we create the database package
    console.log('Setting up integration test environment...');
});
(0, vitest_1.afterAll)(async () => {
    // Clean up database and Redis connections
    if (dbConnection) {
        await dbConnection.destroy();
    }
    if (redisConnection) {
        await redisConnection.quit();
    }
    console.log('Integration test environment cleaned up');
});
(0, vitest_1.beforeEach)(async () => {
    // Clear test data before each test
    // This will be implemented with database migrations
});
(0, vitest_1.afterEach)(async () => {
    // Additional cleanup if needed
});
// Helper to create authenticated test requests
const createAuthenticatedRequest = (_role) => {
    // This will be implemented when we create the auth system
    const token = 'test-jwt-token';
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};
exports.createAuthenticatedRequest = createAuthenticatedRequest;
// Helper to seed test data
const seedTestData = async () => {
    // This will be implemented when we create the database schema
    console.log('Seeding test data...');
};
exports.seedTestData = seedTestData;
//# sourceMappingURL=setup.integration.js.map