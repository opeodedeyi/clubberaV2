module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/node_modules/'],
    testMatch: ['**/*.test.js'],
    verbose: true,
    setupFiles: ['./jest.setup.js']
};