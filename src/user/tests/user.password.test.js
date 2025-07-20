// src/user/tests/user.password.test.js
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

// Import the API error class
const ApiError = require("../../utils/ApiError");

// Mock all dependencies before importing modules that use them
jest.mock("../../config/db");
jest.mock("../models/user.model");
jest.mock("../services/auth.service");
jest.mock("../services/user.service");
jest.mock("../../services/token.service");
jest.mock("../../services/email.service");

// Import mocked modules after mocking
const db = require("../../config/db");
const UserModel = require("../models/user.model");
const AuthService = require("../services/auth.service");
const UserService = require("../services/user.service");
const tokenService = require("../../services/token.service");
const emailService = require("../../services/email.service");

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
    is_email_confirmed: false,
    is_active: true,
    role: "user",
    created_at: new Date(),
};

describe("Password Management Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock user model
        UserModel.findByEmail = jest.fn().mockResolvedValue(testUser);
        UserModel.findById = jest.fn().mockResolvedValue(testUser);
        UserModel.updatePassword = jest.fn().mockResolvedValue({
            id: testUser.id,
            email: testUser.email,
        });

        // Mock token service
        tokenService.generateToken = jest.fn().mockResolvedValue({
            id: 1,
            user_id: testUser.id,
            token: "test-reset-token",
            purpose: "password_reset",
            expires_at: new Date(Date.now() + 3600000),
        });

        tokenService.verifyToken = jest
            .fn()
            .mockImplementation((token, purpose) => {
                if (token === "valid-token") {
                    return Promise.resolve({
                        id: 1,
                        user_id: testUser.id,
                        token: "valid-token",
                        purpose,
                        expires_at: new Date(Date.now() + 3600000),
                    });
                }
                return Promise.resolve(null);
            });

        tokenService.invalidateToken = jest.fn().mockResolvedValue(true);
        tokenService.invalidateAllUserTokens = jest
            .fn()
            .mockResolvedValue(true);

        // Mock email service
        emailService.sendPasswordResetEmail = jest.fn().mockResolvedValue(true);

        // Mock auth service
        AuthService.forgotPassword = jest.fn().mockImplementation((email) => {
            return Promise.resolve({
                message:
                    "If your email is registered, you will receive a password reset link shortly",
            });
        });

        AuthService.resetPassword = jest
            .fn()
            .mockImplementation((token, newPassword) => {
                if (token === "valid-token") {
                    return Promise.resolve({
                        message: "Password has been reset successfully",
                    });
                }
                throw new ApiError(
                    "Invalid or expired password reset link",
                    401
                );
            });

        // Mock user service
        UserService.changeUserPassword = jest.fn().mockResolvedValue({
            message: "Password changed successfully",
        });

        // Mock JWT verification for authenticated routes
        jest.spyOn(jwt, "verify").mockImplementation(() => ({
            userId: testUser.id,
        }));
    });

    describe("POST /api/users/forgot-password", () => {
        test("should request password reset and return success", async () => {
            const requestData = {
                email: testUser.email,
            };

            const response = await request(app)
                .post("/api/users/forgot-password")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain(
                "will receive a password reset link"
            );
            expect(AuthService.forgotPassword).toHaveBeenCalledWith(
                testUser.email
            );
        });

        test("should return success even when email does not exist (for security)", async () => {
            // Mock the implementation to simulate non-existent email
            AuthService.forgotPassword.mockResolvedValueOnce({
                message:
                    "If your email is registered, you will receive a password reset link shortly",
            });

            const requestData = {
                email: "nonexistent@example.com",
            };

            const response = await request(app)
                .post("/api/users/forgot-password")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain(
                "will receive a password reset link"
            );
        });

        test("should return validation error with invalid email", async () => {
            const requestData = {
                email: "not-an-email",
            };

            const response = await request(app)
                .post("/api/users/forgot-password")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("POST /api/users/reset-password", () => {
        test("should reset password with valid token", async () => {
            const resetData = {
                token: "valid-token",
                newPassword: "NewPassword123",
            };

            const response = await request(app)
                .post("/api/users/reset-password")
                .send(resetData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain(
                "Password has been reset successfully"
            );
            expect(AuthService.resetPassword).toHaveBeenCalledWith(
                "valid-token",
                "NewPassword123"
            );
        });

        test("should return error with invalid token", async () => {
            // Mock the implementation to throw an ApiError
            AuthService.resetPassword.mockRejectedValueOnce(
                new ApiError("Invalid or expired password reset link", 401)
            );

            const resetData = {
                token: "invalid-token",
                newPassword: "NewPassword123",
            };

            const response = await request(app)
                .post("/api/users/reset-password")
                .send(resetData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain("Invalid or expired");
        });

        test("should return validation error with weak password", async () => {
            const resetData = {
                token: "valid-token",
                newPassword: "weak",
            };

            const response = await request(app)
                .post("/api/users/reset-password")
                .send(resetData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("PUT /api/users/password", () => {
        test("should change password when authenticated and correct current password", async () => {
            // Make sure UserService.changeUserPassword is properly mocked
            UserService.changeUserPassword.mockResolvedValueOnce({
                message: "Password changed successfully",
            });

            const changeData = {
                currentPassword: "CurrentPassword123",
                newPassword: "NewPassword456",
            };

            const response = await request(app)
                .put("/api/users/password")
                .set("Authorization", "Bearer valid-token")
                .send(changeData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain(
                "Password changed successfully"
            );
            expect(UserService.changeUserPassword).toHaveBeenCalled();
        });

        test("should return 401 when not authenticated", async () => {
            const changeData = {
                currentPassword: "CurrentPassword123",
                newPassword: "NewPassword456",
            };

            const response = await request(app)
                .put("/api/users/password")
                .send(changeData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/authentication required/i);
        });
    });
});
