// src/user/tests/user.test.js
const request = require("supertest");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Mock dependencies
jest.mock("../../config/db");
jest.mock("../models/user.model");
jest.mock("../models/location.model");
jest.mock("../models/image.model");
jest.mock("../models/tag.model");
jest.mock("../../services/token.service");
jest.mock("../../services/email.service");
jest.mock("../../services/password.service");
jest.mock("../../services/googleLogin.service");

// Import mocked modules
const db = require("../../config/db");
const UserModel = require("../models/user.model");
const LocationModel = require("../models/location.model");
const ImageModel = require("../models/image.model");
const TagModel = require("../models/tag.model");
const tokenService = require("../../services/token.service");
const emailService = require("../../services/email.service");
const passwordService = require("../../services/password.service");
const googleLoginService = require("../../services/googleLogin.service");

// Import app and routes
const app = express();
app.use(express.json());

// Import routes
const userRoutes = require("../routes/user.routes");
app.use("/api/users", userRoutes);

// Global test data
const testUser = {
    id: 1,
    full_name: "Test User",
    email: "test@example.com",
    password_hash: bcrypt.hashSync("Password123", 10),
    unique_url: "test-user",
    bio: "Test bio",
    is_email_confirmed: false,
    created_at: new Date(),
};

const mockLocation = {
    id: 1,
    name: "New York",
    location_type: "primary",
    lat: 40.7128,
    lng: -74.006,
    address: "123 Test St",
};

describe("User Authentication Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup email service mock
        emailService.sendWelcomeEmail = jest.fn().mockResolvedValue(true);
        emailService.sendPasswordlessLoginEmail = jest
            .fn()
            .mockResolvedValue(true);

        // Setup password service mock
        passwordService.generatePasswordlessLoginToken = jest
            .fn()
            .mockResolvedValue({
                message: "Login link sent to your email",
                expiresAt: new Date(),
            });

        passwordService.verifyPasswordlessToken = jest
            .fn()
            .mockResolvedValue(testUser.id);

        // Setup Google login service mock
        googleLoginService.getUserData = jest.fn().mockResolvedValue({
            email: "google@example.com",
            name: "Google User",
            picture: "https://example.com/avatar.jpg",
            emailVerified: true,
        });

        // Setup token service mock
        tokenService.generateToken = jest
            .fn()
            .mockImplementation((userId, purpose) => {
                return Promise.resolve({
                    id: 1,
                    user_id: userId,
                    token: "mock-token-" + purpose,
                    purpose,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                });
            });

        tokenService.verifyToken = jest
            .fn()
            .mockImplementation((token, purpose) => {
                if (token === "valid-token") {
                    return Promise.resolve({
                        id: 1,
                        user_id: testUser.id,
                        token,
                        purpose,
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    });
                }
                return Promise.resolve(null);
            });

        tokenService.verifyJWT = jest.fn().mockImplementation((token) => {
            if (token === "valid-token") {
                return { userId: testUser.id };
            }
            return null;
        });

        tokenService.invalidateToken = jest.fn().mockResolvedValue(true);

        // Setup database transaction mock
        db.executeTransaction = jest
            .fn()
            .mockImplementation(async (operations) => {
                return [{ rows: [testUser] }];
            });

        db.query = jest.fn().mockImplementation((text, params) => {
            if (text.includes("locations")) {
                return { rows: [mockLocation] };
            }
            if (text.includes("images")) {
                return { rows: [] };
            }
            if (text.includes("tag_assignments")) {
                return { rows: [] };
            }
            if (text.includes("UPDATE users SET is_email_confirmed")) {
                return { rows: [{ ...testUser, is_email_confirmed: true }] };
            }
            return { rows: [testUser] };
        });

        // Setup user model mocks
        UserModel.emailExists = jest.fn().mockResolvedValue(false);
        UserModel.findByEmail = jest.fn().mockImplementation((email) => {
            if (email === testUser.email) {
                return Promise.resolve(testUser);
            }
            return Promise.resolve(null);
        });
        UserModel.findById = jest.fn().mockResolvedValue(testUser);
        UserModel.createUserOperation = jest.fn().mockReturnValue({
            text: "INSERT INTO users...",
            values: [],
        });

        // Setup location model mocks
        LocationModel.findByEntity = jest.fn().mockResolvedValue(mockLocation);
        LocationModel.createLocationOperation = jest.fn().mockReturnValue({
            text: "INSERT INTO locations...",
            values: [],
        });

        // Setup image model mocks
        ImageModel.findByEntity = jest.fn().mockResolvedValue(null);
        ImageModel.createImageOperation = jest.fn().mockReturnValue({
            text: "INSERT INTO images...",
            values: [],
        });

        // Setup tag model mocks
        TagModel.findTagsByEntityGrouped = jest.fn().mockResolvedValue({
            interest: [{ id: 1, name: "Technology" }],
            skill: [{ id: 2, name: "JavaScript" }],
        });
    });

    describe("POST /api/users/create-user", () => {
        test("should create a new user and return 201 status", async () => {
            const userData = {
                email: "newuser@example.com",
                password: "Password123",
                fullName: "New User",
                bio: "Test bio",
                location: {
                    city: "New York",
                    lat: 40.7128,
                    lng: -74.006,
                },
            };

            const response = await request(app)
                .post("/api/users/create-user")
                .send(userData)
                .expect("Content-Type", /json/)
                .expect(201);

            expect(response.body.status).toBe("success");
            expect(response.body.data).toHaveProperty("id");
            expect(response.body.data).toHaveProperty("email", testUser.email);
            expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
        });

        test("should return validation error with invalid data", async () => {
            const invalidUserData = {
                email: "not-an-email",
                password: "123", // Too short
                fullName: "A", // Too short
            };

            const response = await request(app)
                .post("/api/users/create-user")
                .send(invalidUserData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });

        test("should return error when email already exists", async () => {
            // Mock email exists function to return true
            UserModel.emailExists.mockResolvedValueOnce(true);

            const userData = {
                email: "existing@example.com",
                password: "Password123",
                fullName: "Existing User",
            };

            const response = await request(app)
                .post("/api/users/create-user")
                .send(userData)
                .expect("Content-Type", /json/)
                .expect(409);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/email already registered/i);
        });
    });

    describe("POST /api/users/login", () => {
        test("should log in a user and return user data with token", async () => {
            // Configure bcrypt to return true for password comparison
            jest.spyOn(bcrypt, "compare").mockImplementationOnce(() =>
                Promise.resolve(true)
            );

            const loginData = {
                email: testUser.email,
                password: "Password123",
            };

            const response = await request(app)
                .post("/api/users/login")
                .send(loginData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.data).toHaveProperty("token");
            expect(response.body.data).toHaveProperty("user");
            expect(response.body.data.user).toHaveProperty(
                "email",
                testUser.email
            );
        });

        test("should return error with invalid credentials", async () => {
            // Configure bcrypt to return false for password comparison
            jest.spyOn(bcrypt, "compare").mockImplementationOnce(() =>
                Promise.resolve(false)
            );

            const loginData = {
                email: testUser.email,
                password: "WrongPassword",
            };

            const response = await request(app)
                .post("/api/users/login")
                .send(loginData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/invalid email or password/i);
        });

        test("should return error when user not found", async () => {
            const loginData = {
                email: "nonexistent@example.com",
                password: "Password123",
            };

            const response = await request(app)
                .post("/api/users/login")
                .send(loginData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/invalid email or password/i);
        });
    });

    describe("GET /api/users/profile", () => {
        test("should return user profile when authenticated", async () => {
            // Mock JWT verification
            jest.spyOn(jwt, "verify").mockImplementationOnce(() => ({
                userId: testUser.id,
            }));

            const response = await request(app)
                .get("/api/users/profile")
                .set("Authorization", "Bearer valid-token")
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.data).toHaveProperty("email", testUser.email);
            expect(response.body.data).toHaveProperty(
                "fullName",
                testUser.full_name
            );
        });

        test("should return 401 when not authenticated", async () => {
            const response = await request(app)
                .get("/api/users/profile")
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/authentication required/i);
        });

        test("should return 401 with invalid token", async () => {
            // Mock JWT verification to throw an error
            jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
                throw new Error("Invalid token");
            });

            const response = await request(app)
                .get("/api/users/profile")
                .set("Authorization", "Bearer invalid-token")
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/invalid or expired token/i);
        });
    });

    describe("POST /api/users/passwordless-request", () => {
        test("should request passwordless login and return success", async () => {
            const requestData = {
                email: testUser.email,
            };

            const response = await request(app)
                .post("/api/users/passwordless-request")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toMatch(
                /you will receive a login link/i
            );
            expect(
                passwordService.generatePasswordlessLoginToken
            ).toHaveBeenCalled();
        });

        test("should return success even when email does not exist (for security)", async () => {
            const requestData = {
                email: "nonexistent@example.com",
            };

            const response = await request(app)
                .post("/api/users/passwordless-request")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toMatch(
                /you will receive a login link/i
            );
            expect(
                passwordService.generatePasswordlessLoginToken
            ).not.toHaveBeenCalled();
        });

        test("should return error with invalid email format", async () => {
            const requestData = {
                email: "not-an-email",
            };

            const response = await request(app)
                .post("/api/users/passwordless-request")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("POST /api/users/passwordless-verify", () => {
        test("should verify token and return user data with auth token", async () => {
            // Mock JWT verification
            jest.spyOn(jwt, "verify").mockImplementationOnce(() => ({
                userId: testUser.id,
            }));

            const verifyData = {
                token: "valid-token",
            };

            const response = await request(app)
                .post("/api/users/passwordless-verify")
                .send(verifyData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toMatch(/login successful/i);
            expect(response.body.data).toHaveProperty("token");
            expect(response.body.data).toHaveProperty("user");
            expect(response.body.data.user).toHaveProperty(
                "email",
                testUser.email
            );
            expect(
                passwordService.verifyPasswordlessToken
            ).toHaveBeenCalledWith("valid-token");
        });

        test("should return error with invalid token", async () => {
            // Import ApiError for proper error type
            const ApiError = require("../../utils/ApiError");

            // Mock password service to throw an ApiError instead of a generic Error
            passwordService.verifyPasswordlessToken.mockRejectedValueOnce(
                new ApiError("Invalid or expired login link", 401)
            );

            const verifyData = {
                token: "invalid-token",
            };

            const response = await request(app)
                .post("/api/users/passwordless-verify")
                .send(verifyData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(
                /invalid or expired login link/i
            );
        });
    });

    describe("POST /api/users/google-login", () => {
        test("should login with Google code and return user data with token", async () => {
            const loginData = {
                code: "google-auth-code",
            };

            const response = await request(app)
                .post("/api/users/google-login")
                .send(loginData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toMatch(/google login successful/i);
            expect(response.body.data).toHaveProperty("token");
            expect(response.body.data).toHaveProperty("user");
            expect(googleLoginService.getUserData).toHaveBeenCalledWith(
                "google-auth-code",
                undefined
            );
        });

        test("should login with Google ID token and return user data with token", async () => {
            const loginData = {
                idToken: "google-id-token",
            };

            const response = await request(app)
                .post("/api/users/google-login")
                .send(loginData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toMatch(/google login successful/i);
            expect(response.body.data).toHaveProperty("token");
            expect(response.body.data).toHaveProperty("user");
            expect(googleLoginService.getUserData).toHaveBeenCalledWith(
                undefined,
                "google-id-token"
            );
        });

        test("should create a new user if Google email does not exist", async () => {
            // Set mock to return null for the Google email
            UserModel.findByEmail.mockImplementationOnce(() =>
                Promise.resolve(null)
            );

            const loginData = {
                idToken: "google-id-token",
            };

            const response = await request(app)
                .post("/api/users/google-login")
                .send(loginData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.data).toHaveProperty("token");
            expect(response.body.data).toHaveProperty("user");
            expect(UserModel.createUserOperation).toHaveBeenCalled();
        });

        test("should return error when neither code nor idToken is provided", async () => {
            const loginData = {};

            const response = await request(app)
                .post("/api/users/google-login")
                .send(loginData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body.errors).toBeDefined();
        });

        test("should handle Google authentication errors", async () => {
            // Mock Google service to throw an error
            googleLoginService.getUserData.mockRejectedValueOnce(
                new Error("Google auth failed")
            );

            const loginData = {
                code: "invalid-code",
            };

            const response = await request(app)
                .post("/api/users/google-login")
                .send(loginData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(
                /google authentication failed/i
            );
        });
    });
});
