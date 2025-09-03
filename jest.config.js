module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/src/test-helpers/',
        '/coverage/'
    ],
    testMatch: ['**/*.test.js'],
    verbose: true,
    setupFiles: ['./jest.setup.js'],
    setupFilesAfterEnv: ['<rootDir>/src/test-helpers/test-setup.js'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/*.skip.js'
    ],
    // Global test timeout for database operations
    testTimeout: 30000,
    // Improved error handling
    detectOpenHandles: true,
    forceExit: false
};