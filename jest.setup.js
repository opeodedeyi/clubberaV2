// jest.setup.js
process.env.JWT_SECRET = "test-jwt-secret";
process.env.FRONTEND_URL = "http://localhost:4000";

// Setup environment variables for testing
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy_secret";
