// src/test-helpers/test-setup.js
const db = require('../config/db');

// Global test setup
beforeAll(async () => {
    // Set longer timeout for database operations
    jest.setTimeout(30000);
});

// Global test cleanup - runs after ALL tests
afterAll(async () => {
    try {
        // Close all database connections
        if (db.pool && typeof db.pool.end === 'function') {
            await db.pool.end();
        }
    } catch (error) {
        console.error('Error closing database connections:', error);
    }
});

// Helper function to add cleanup to existing tests
const addCleanupToTest = (testSuite) => {
    const originalAfterAll = testSuite.afterAll || (() => {});
    
    testSuite.afterAll = async () => {
        await originalAfterAll();
        
        // Ensure database connections are cleaned up
        try {
            if (db.pool && db.pool.totalCount > 0) {
                console.log('Cleaning up database connections...');
                await db.pool.end();
            }
        } catch (error) {
            console.warn('Warning: Could not properly close database connections:', error.message);
        }
    };
    
    return testSuite;
};

module.exports = {
    addCleanupToTest
};