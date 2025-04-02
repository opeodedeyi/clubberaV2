// src/user/tests/user.logout.test.js
const request = require("supertest");
const express = require("express");

// Mock dependencies
jest.mock("../../config/db");
jest.mock("../models/user.model");
jest.mock("../services/auth.service");
jest.mock("../../services/token.service");

// Import mocked modules
const db = require("../../config/db");
const UserModel = require("../models/user.model");
const AuthService = require("../services/auth.service");
const tokenService = require("../../services/token.service");

// Import app and routes
const app = express();
app.use(express.json());

// Import routes
const userRoutes = require("../routes/user.routes");
app.use("/api/users", userRoutes);

// Test data
const testUser = {
    id: 1,
    full_name: "Test User",
    email: "test@example.com",
    password_hash: "hashed_password",
    is_email_confirmed: true,
    is_active: true,
    role: "user",
    created_at: new Date(),
};

describe("Logout Route", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock user model
        UserModel.findById = jest.fn().mockResolvedValue(testUser);

        // Mock token service
        tokenService.invalidateToken = jest.fn().mockResolvedValue(true);

        // Mock auth service
        AuthService.logout = jest.fn().mockImplementation((token) => {
            return Promise.resolve({
                message: "Logged out successfully",
            });
        });
    });

    describe("POST /api/users/logout", () => {
        test("should logout successfully with token", async () => {
            const logoutData = {
                token: "auth-token-123",
            };

            const response = await request(app)
                .post("/api/users/logout")
                .send(logoutData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Logged out successfully");
            expect(AuthService.logout).toHaveBeenCalledWith("auth-token-123");
        });

        test("should logout successfully even without token", async () => {
            const response = await request(app)
                .post("/api/users/logout")
                .send({})
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Logged out successfully");
            expect(AuthService.logout).toHaveBeenCalledWith(undefined);
        });

        test("should handle errors during logout gracefully", async () => {
            // Use ApiError for consistent error format
            const ApiError = require("../../utils/ApiError");

            // Mock auth service to throw a properly formatted error
            AuthService.logout.mockRejectedValueOnce(
                new ApiError("Database error", 500)
            );

            const logoutData = {
                token: "auth-token-123",
            };

            const response = await request(app)
                .post("/api/users/logout")
                .send(logoutData)
                .expect("Content-Type", /json/)
                .expect(500);

            expect(response.body.status).toBe("error");
        });
    });
});
