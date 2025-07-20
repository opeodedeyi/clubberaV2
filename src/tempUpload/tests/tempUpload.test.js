const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

// Mock dependencies
jest.mock("../../services/s3.service");
jest.mock("../../utils/ApiError");

// Import mocked modules
const s3Service = require("../../services/s3.service");
const ApiError = require("../../utils/ApiError");

// Create a flag to control authentication behavior in tests
let shouldAuthenticate = true;

// Create mock middleware
const mockAuth = (req, res, next) => {
    if (!shouldAuthenticate) {
        return res.status(401).json({
            status: "error",
            message: "Authentication required",
        });
    }

    // Set the user object as the real middleware would
    req.user = {
        id: 1,
        full_name: "Test User",
        email: "test@example.com",
        is_email_confirmed: true,
    };
    next();
};

const mockVerifyEmail = (req, res, next) => {
    next();
};

// Create express app for testing
const app = express();
app.use(express.json());

// Create a router for testing
const router = express.Router();
router.use((req, res, next) => mockAuth(req, res, next));
router.use((req, res, next) => mockVerifyEmail(req, res, next));

// Import controllers and validators
const tempUploadController = require("../controllers/tempUpload.controller");
const validator = require("../validators/tempUpload.validator");

// Set up the route manually instead of using the full routes file
router.post(
    "/url",
    validator.validateTempUploadUrl,
    tempUploadController.getTempUploadUrl
);

// Apply router
app.use("/api/tempUpload", router);

describe("Temporary Upload Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset authentication to succeed by default
        shouldAuthenticate = true;

        // Mock S3 service
        s3Service.generatePresignedUrl = jest.fn().mockResolvedValue({
            uploadUrl:
                "https://example-bucket.s3.amazonaws.com/temp-upload-url",
            key: "community-temp-1/123456789/profile-123456789.jpg",
        });
    });

    describe("POST /api/tempUpload/url", () => {
        test("should generate pre-signed URL for community when authenticated", async () => {
            const requestData = {
                fileType: "image/jpeg",
                entityType: "community",
                imageType: "profile",
            };

            const response = await request(app)
                .post("/api/tempUpload/url")
                .set("Authorization", "Bearer valid-token")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.data).toHaveProperty("uploadUrl");
            expect(response.body.data).toHaveProperty("key");
            expect(response.body.data).toHaveProperty(
                "entityType",
                "community"
            );
            expect(response.body.data).toHaveProperty("imageType", "profile");

            expect(s3Service.generatePresignedUrl).toHaveBeenCalledWith(
                "image/jpeg",
                expect.stringContaining("community-temp-1"),
                expect.any(Number),
                "profile"
            );
        });

        test("should generate pre-signed URL for post when authenticated", async () => {
            const requestData = {
                fileType: "image/png",
                entityType: "post",
                imageType: "content",
            };

            const response = await request(app)
                .post("/api/tempUpload/url")
                .set("Authorization", "Bearer valid-token")
                .send(requestData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.data).toHaveProperty("entityType", "post");
            expect(s3Service.generatePresignedUrl).toHaveBeenCalledWith(
                "image/png",
                expect.stringContaining("post-temp-1"),
                expect.any(Number),
                "content"
            );
        });

        test("should return validation error with invalid file type", async () => {
            const invalidData = {
                fileType: "application/pdf", // Invalid file type
                entityType: "community",
                imageType: "profile",
            };

            const response = await request(app)
                .post("/api/tempUpload/url")
                .set("Authorization", "Bearer valid-token")
                .send(invalidData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });

        test("should return validation error with invalid entity type", async () => {
            const invalidData = {
                fileType: "image/jpeg",
                entityType: "invalid", // Invalid entity type
                imageType: "profile",
            };

            const response = await request(app)
                .post("/api/tempUpload/url")
                .set("Authorization", "Bearer valid-token")
                .send(invalidData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });

        test("should return validation error with invalid image type for entity", async () => {
            const invalidData = {
                fileType: "image/jpeg",
                entityType: "community",
                imageType: "invalid", // Invalid image type for community
            };

            const response = await request(app)
                .post("/api/tempUpload/url")
                .set("Authorization", "Bearer valid-token")
                .send(invalidData)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body.status).toBe("error");
            expect(response.body).toHaveProperty("errors");
        });

        test("should return 401 when not authenticated", async () => {
            // Set the flag to fail authentication
            shouldAuthenticate = false;

            const response = await request(app)
                .post("/api/tempUpload/url")
                .send({
                    fileType: "image/jpeg",
                    entityType: "community",
                    imageType: "profile",
                })
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
        });
    });
});
