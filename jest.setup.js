// jest.setup.js
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.FRONTEND_URL = "http://localhost:4000";

// Setup environment variables for testing
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy_secret";

// Database configuration for integration tests
// Using your existing database with transaction-based test isolation
// Your .env file already has: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE

// Set test timeout for database operations
jest.setTimeout(30000);
