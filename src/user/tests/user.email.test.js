// src/user/tests/user.email.test.js
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

// Mock dependencies
jest.mock("../../config/db");
jest.mock("../models/user.model");
jest.mock("../services/auth.service");
jest.mock("../../services/token.service");
jest.mock("../../services/email.service");

// Import mocked modules
const db = require("../../config/db");
const UserModel = require("../models/user.model");
const AuthService = require("../services/auth.service");
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

const verifiedUser = {
    ...testUser,
    is_email_confirmed: true,
};

describe("Email Verification Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock user model
        UserModel.findByEmail = jest.fn().mockResolvedValue(testUser);
        UserModel.findById = jest.fn().mockResolvedValue(testUser);
        UserModel.confirmEmail = jest.fn().mockResolvedValue(verifiedUser);

        // Mock token service
        tokenService.generateToken = jest.fn().mockResolvedValue({
            id: 1,
            user_id: testUser.id,
            token: "verification-token",
            purpose: "email_confirmation",
            expires_at: new Date(Date.now() + 3600000),
        });

        tokenService.generateVerificationCode = jest.fn().mockResolvedValue({
            id: 1,
            user_id: testUser.id,
            token: "123456",
            verificationCode: "123456",
            purpose: "email_verification_code",
            expires_at: new Date(Date.now() + 3600000),
        });

        tokenService.verifyToken = jest
            .fn()
            .mockImplementation((token, purpose) => {
                if (token === "valid-token" || token === "123456") {
                    return Promise.resolve({
                        id: 1,
                        user_id: testUser.id,
                        token,
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
        emailService.sendVerificationCodeEmail = jest
            .fn()
            .mockResolvedValue(true);
        emailService.sendVerificationLinkEmail = jest
            .fn()
            .mockResolvedValue(true);

        // Mock auth service
        AuthService.requestEmailVerificationCode = jest.fn().mockResolvedValue({
            message: "Verification code sent to your email",
        });

        AuthService.verifyEmailWithCode = jest
            .fn()
            .mockImplementation((email, code) => {
                if (code === "123456") {
                    return Promise.resolve({
                        message: "Email verified successfully",
                        isVerified: true,
                    });
                }
                throw {
                    statusCode: 401,
                    message: "Invalid or expired verification code",
                };
            });

        AuthService.requestEmailVerificationLink = jest.fn().mockResolvedValue({
            message: "Verification link sent to your email",
        });

        AuthService.verifyEmailWithLink = jest
            .fn()
            .mockImplementation((token) => {
                if (token === "valid-token") {
                    return Promise.resolve({
                        message: "Email verified successfully",
                        isVerified: true,
                    });
                }
                throw {
                    statusCode: 401,
                    message: "Invalid or expired verification link",
                };
            });

        // Mock JWT verification for authenticated routes
        jest.spyOn(jwt, "verify").mockImplementation(() => ({
            userId: testUser.id,
        }));
    });

    describe("POST /api/users/verify-email-code-request", () => {
        test("should request verification code when authenticated", async () => {
            const response = await request(app)
                .post("/api/users/verify-email-code-request")
                .set("Authorization", "Bearer valid-token")
                .send({ email: testUser.email })
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Verification code sent");
            expect(AuthService.requestEmailVerificationCode).toHaveBeenCalled();
        });

        test("should return 401 when not authenticated", async () => {
            const response = await request(app)
                .post("/api/users/verify-email-code-request")
                .send({ email: testUser.email })
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/authentication required/i);
        });
    });

    describe("POST /api/users/verify-email-code", () => {
        test("should verify email with valid code", async () => {
            const verifyData = {
                email: testUser.email,
                verificationCode: "123456",
            };

            const response = await request(app)
                .post("/api/users/verify-email-code")
                .send(verifyData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain(
                "Email verified successfully"
            );
            expect(AuthService.verifyEmailWithCode).toHaveBeenCalledWith(
                testUser.email,
                "123456"
            );
        });

        test("should return error with invalid code", async () => {
            // Import ApiError for consistent error format
            const ApiError = require("../../utils/ApiError");

            // Mock the implementation to throw proper ApiError
            AuthService.verifyEmailWithCode.mockRejectedValueOnce(
                new ApiError("Invalid or expired verification code", 401)
            );

            // Use a valid format but "wrong" code to bypass validation but fail verification
            const verifyData = {
                email: testUser.email,
                verificationCode: "111111", // Valid format but wrong code
            };

            const response = await request(app)
                .post("/api/users/verify-email-code")
                .send(verifyData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain(
                "Invalid or expired verification code"
            );
        });

        test("should return validation error with invalid format", async () => {
            const verifyData = {
                email: "not-an-email",
                verificationCode: "12", // Too short
            };

            const response = await request(app)
                .post("/api/users/verify-email-code")
                .send(verifyData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("POST /api/users/verify-email-link-request", () => {
        test("should request verification link when authenticated", async () => {
            const response = await request(app)
                .post("/api/users/verify-email-link-request")
                .set("Authorization", "Bearer valid-token")
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Verification link sent");
            expect(
                AuthService.requestEmailVerificationLink
            ).toHaveBeenCalledWith(testUser.id);
        });

        test("should return 401 when not authenticated", async () => {
            const response = await request(app)
                .post("/api/users/verify-email-link-request")
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/authentication required/i);
        });
    });

    describe("GET /api/users/verify-email", () => {
        test("should verify email with valid token", async () => {
            const response = await request(app)
                .get("/api/users/verify-email?token=valid-token")
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain(
                "Email verified successfully"
            );
            expect(AuthService.verifyEmailWithLink).toHaveBeenCalledWith(
                "valid-token"
            );
        });

        test("should return error with invalid token", async () => {
            // Import ApiError
            const ApiError = require("../../utils/ApiError");

            // Mock the implementation to throw ApiError
            AuthService.verifyEmailWithLink.mockRejectedValueOnce(
                new ApiError("Invalid or expired verification link", 401)
            );

            const response = await request(app)
                .get("/api/users/verify-email?token=invalid-token")
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain(
                "Invalid or expired verification link"
            );
        });

        test("should return validation error with missing token", async () => {
            const response = await request(app)
                .get("/api/users/verify-email")
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });
    });
});
