// src/user/tests/user.update.test.js
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

// Mock dependencies
jest.mock("../../config/db");
jest.mock("../models/user.model");
jest.mock("../models/location.model");
jest.mock("../models/image.model");
jest.mock("../models/tag.model");
jest.mock("../services/auth.service");

// Import mocked modules
const db = require("../../config/db");
const UserModel = require("../models/user.model");
const LocationModel = require("../models/location.model");
const TagModel = require("../models/tag.model");
const AuthService = require("../services/auth.service");

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
    unique_url: "test-user",
    bio: "Test bio",
    gender: "male",
    birthday: "1990-01-01",
    is_email_confirmed: true,
    is_active: true,
    role: "user",
    created_at: new Date(),
    updated_at: new Date(),
};

const updatedUser = {
    ...testUser,
    full_name: "Updated Name",
    bio: "Updated bio",
};

const testInterests = [
    { id: 1, name: "technology" },
    { id: 2, name: "programming" },
];

describe("User Update Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock JWT verification to return testUser id
        jest.spyOn(jwt, "verify").mockImplementation(() => ({
            userId: testUser.id,
        }));

        // Mock database
        db.query = jest.fn().mockImplementation((text, params) => {
            if (text.includes("UPDATE users")) {
                return { rows: [updatedUser] };
            }
            if (text.includes("locations")) {
                return {
                    rows: [
                        { id: 1, name: "New York", lat: 40.7128, lng: -74.006 },
                    ],
                };
            }
            return { rows: [] };
        });

        // Mock db pool
        db.pool = {
            connect: jest.fn().mockImplementation(() => ({
                query: jest.fn().mockImplementation((text, params) => {
                    if (text.includes("tags")) {
                        return { rows: testInterests };
                    }
                    return { rows: [] };
                }),
                release: jest.fn(),
            })),
        };

        // Mock user model
        // First call returns the original user, subsequent calls return the updated user
        UserModel.findById = jest
            .fn()
            .mockResolvedValueOnce(testUser) // Initial call returns original user
            .mockResolvedValue(updatedUser); // Subsequent calls return updated user

        UserModel.updateProfile = jest.fn().mockResolvedValue(updatedUser);

        UserModel.updatePassword = jest.fn().mockResolvedValue({
            id: testUser.id,
            email: testUser.email,
            full_name: testUser.full_name,
        });

        // Mock location model
        LocationModel.findByEntity = jest.fn().mockResolvedValue({
            id: 1,
            name: "New York",
            lat: 40.7128,
            lng: -74.006,
        });

        // Mock tag model
        TagModel.findTagsByEntityGrouped = jest.fn().mockResolvedValue({
            interest: testInterests,
        });
        TagModel.updateEntityTags = jest.fn().mockResolvedValue(testInterests);

        // Mock auth service
        AuthService.verifyPassword = jest.fn().mockResolvedValue(true);
        AuthService.hashPassword = jest
            .fn()
            .mockResolvedValue("new_hashed_password");
    });

    describe("PUT /api/users/profile", () => {
        test("should update user profile successfully", async () => {
            const updateData = {
                fullName: "Updated Name",
                bio: "Updated bio",
                gender: "male",
                location: {
                    city: "Los Angeles",
                    lat: 34.0522,
                    lng: -118.2437,
                },
            };

            const response = await request(app)
                .put("/api/users/profile")
                .set("Authorization", "Bearer valid-token")
                .send(updateData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Profile updated");
            expect(response.body.data.fullName).toBe("Updated Name");
            expect(UserModel.updateProfile).toHaveBeenCalled();
        });

        test("should return validation error with invalid data", async () => {
            const invalidData = {
                fullName: "A", // Too short
                birthday: "not-a-date",
            };

            const response = await request(app)
                .put("/api/users/profile")
                .set("Authorization", "Bearer valid-token")
                .send(invalidData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body.errors).toBeDefined();
        });

        test("should return 401 when not authenticated", async () => {
            const response = await request(app)
                .put("/api/users/profile")
                .send({ fullName: "Updated Name" })
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/authentication required/i);
        });
    });

    describe("PUT /api/users/interests", () => {
        test("should update user interests successfully", async () => {
            const updateData = {
                interests: ["Technology", "Programming", "Travel"],
            };

            const response = await request(app)
                .put("/api/users/interests")
                .set("Authorization", "Bearer valid-token")
                .send(updateData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Interests updated");
            expect(TagModel.updateEntityTags).toHaveBeenCalledWith(
                "user",
                testUser.id,
                updateData.interests,
                "interest"
            );
        });

        test("should return validation error with invalid interests", async () => {
            const invalidData = {
                interests: [
                    "A",
                    "Technology with $ invalid characters",
                    "A".repeat(50),
                ],
            };

            const response = await request(app)
                .put("/api/users/interests")
                .set("Authorization", "Bearer valid-token")
                .send(invalidData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body.errors).toBeDefined();
        });

        test("should return validation error when interests is not an array", async () => {
            const invalidData = {
                interests: "Technology, Programming",
            };

            const response = await request(app)
                .put("/api/users/interests")
                .set("Authorization", "Bearer valid-token")
                .send(invalidData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body.errors).toBeDefined();
        });
    });

    describe("PUT /api/users/password", () => {
        test("should change password successfully", async () => {
            const passwordData = {
                currentPassword: "CurrentPassword123",
                newPassword: "NewPassword456",
            };

            const response = await request(app)
                .put("/api/users/password")
                .set("Authorization", "Bearer valid-token")
                .send(passwordData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Password changed");
            expect(AuthService.verifyPassword).toHaveBeenCalledWith(
                passwordData.currentPassword,
                testUser.password_hash
            );
            expect(AuthService.hashPassword).toHaveBeenCalledWith(
                passwordData.newPassword
            );
            expect(UserModel.updatePassword).toHaveBeenCalled();
        });

        test("should return error when current password is incorrect", async () => {
            // Mock password verification to fail
            AuthService.verifyPassword.mockResolvedValueOnce(false);

            const passwordData = {
                currentPassword: "WrongPassword123",
                newPassword: "NewPassword456",
            };

            const response = await request(app)
                .put("/api/users/password")
                .set("Authorization", "Bearer valid-token")
                .send(passwordData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain(
                "Current password is incorrect"
            );
        });

        test("should return validation error with weak password", async () => {
            const passwordData = {
                currentPassword: "CurrentPassword123",
                newPassword: "weak",
            };

            const response = await request(app)
                .put("/api/users/password")
                .set("Authorization", "Bearer valid-token")
                .send(passwordData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body.errors).toBeDefined();
        });

        test("should return validation error when new password is same as current", async () => {
            const passwordData = {
                currentPassword: "SamePassword123",
                newPassword: "SamePassword123",
            };

            const response = await request(app)
                .put("/api/users/password")
                .set("Authorization", "Bearer valid-token")
                .send(passwordData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].msg).toContain(
                "different from current password"
            );
        });
    });
});
