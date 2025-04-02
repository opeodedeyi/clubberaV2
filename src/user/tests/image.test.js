// src/user/tests/user.image.test.js
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

// Mock dependencies
jest.mock("../../config/db");
jest.mock("../models/user.model");
jest.mock("../models/image.model");
jest.mock("../../services/s3.service");
jest.mock("../services/user.service");

// Import mocked modules
const db = require("../../config/db");
const UserModel = require("../models/user.model");
const ImageModel = require("../models/image.model");
const s3Service = require("../../services/s3.service");
const UserService = require("../services/user.service");

// Import app and routes
const app = express();
app.use(express.json());

// Import routes
const imageRoutes = require("../routes/image.routes");
app.use("/api/images", imageRoutes);

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

const testImage = {
    id: 1,
    entity_type: "user",
    entity_id: 1,
    image_type: "profile",
    provider: "aws-s3",
    key: "user/1/profile-123456789.jpg",
    alt_text: "Profile picture",
    position: 0,
};

describe("Image Management Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock user model
        UserModel.findById = jest.fn().mockResolvedValue(testUser);

        // Mock image model
        ImageModel.findByEntity = jest
            .fn()
            .mockImplementation((entityType, entityId, imageType) => {
                if (
                    entityType === "user" &&
                    entityId === testUser.id &&
                    imageType === "profile"
                ) {
                    return Promise.resolve(testImage);
                }
                return Promise.resolve(null);
            });

        ImageModel.updateImage = jest.fn().mockResolvedValue(testImage);
        ImageModel.deleteImage = jest.fn().mockResolvedValue(true);

        // Mock S3 service
        s3Service.generatePresignedUrl = jest.fn().mockResolvedValue({
            uploadUrl: "https://example-bucket.s3.amazonaws.com/upload-url",
            key: "user/1/profile-123456789.jpg",
        });

        s3Service.deleteObject = jest.fn().mockResolvedValue(true);

        // Mock user service
        UserService.getUserFullProfile = jest.fn().mockResolvedValue({
            id: testUser.id,
            email: testUser.email,
            fullName: testUser.full_name,
            profileImage: testImage,
        });

        // Mock JWT verification for authenticated routes
        jest.spyOn(jwt, "verify").mockImplementation(() => ({
            userId: testUser.id,
        }));
    });

    describe("POST /api/images/upload-url", () => {
        test("should generate pre-signed URL when authenticated and valid data", async () => {
            const requestData = {
                fileType: "image/jpeg",
                imageType: "profile",
            };

            const response = await request(app)
                .post("/api/images/upload-url")
                .set("Authorization", "Bearer valid-token")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.data).toHaveProperty("uploadUrl");
            expect(response.body.data).toHaveProperty("key");
            expect(s3Service.generatePresignedUrl).toHaveBeenCalledWith(
                "image/jpeg",
                "user",
                testUser.id,
                "profile"
            );
        });

        test("should return validation error with invalid file type", async () => {
            const invalidData = {
                fileType: "application/pdf", // Invalid file type
                imageType: "profile",
            };

            const response = await request(app)
                .post("/api/images/upload-url")
                .set("Authorization", "Bearer valid-token")
                .send(invalidData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });

        test("should return 401 when not authenticated", async () => {
            const response = await request(app)
                .post("/api/images/upload-url")
                .send({
                    fileType: "image/jpeg",
                    imageType: "profile",
                })
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toMatch(/authentication required/i);
        });
    });

    describe("POST /api/images/save", () => {
        test("should save image metadata when authenticated and valid data", async () => {
            const saveData = {
                key: "user/1/profile-123456789.jpg",
                imageType: "profile",
                altText: "My new profile picture",
            };

            const response = await request(app)
                .post("/api/images/save")
                .set("Authorization", "Bearer valid-token")
                .send(saveData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain(
                "Profile image updated successfully"
            );
            expect(response.body.data).toHaveProperty("image");
            expect(response.body.data).toHaveProperty("profile");
            expect(ImageModel.updateImage).toHaveBeenCalledWith(
                "user",
                testUser.id,
                "profile",
                expect.objectContaining({
                    key: saveData.key,
                    altText: saveData.altText,
                })
            );
        });

        test("should return validation error with missing key", async () => {
            const invalidData = {
                imageType: "profile",
                altText: "My new profile picture",
                // Missing key
            };

            const response = await request(app)
                .post("/api/images/save")
                .set("Authorization", "Bearer valid-token")
                .send(invalidData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });
    });

    describe("DELETE /api/images", () => {
        test("should delete image when authenticated", async () => {
            const response = await request(app)
                .delete("/api/images?type=profile")
                .set("Authorization", "Bearer valid-token")
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain(
                "Profile image deleted successfully"
            );
            expect(ImageModel.deleteImage).toHaveBeenCalledWith(testImage.id);
        });

        test("should return 404 when image not found", async () => {
            // Mock image not found
            ImageModel.findByEntity.mockResolvedValueOnce(null);

            const response = await request(app)
                .delete("/api/images?type=banner")
                .set("Authorization", "Bearer valid-token")
                .expect("Content-Type", /json/)
                .expect(404);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain("Image not found");
        });
    });
});
