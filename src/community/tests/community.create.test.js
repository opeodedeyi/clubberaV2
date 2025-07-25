const request = require("supertest");
const app = require("../../../index");
const db = require("../../config/db");
const tokenService = require("../../services/token.service");

// Mock dependencies
jest.mock("../../config/db");
jest.mock("../../services/token.service");
jest.mock("../models/community.model");
jest.mock("../models/location.model");
jest.mock("../models/image.model");
jest.mock("../models/tag.model");
jest.mock("../models/subscription.model");
jest.mock("../../middleware/auth", () => ({
    authenticate: jest.fn((req, res, next) => {
        // By default, add a verified user to the request
        req.user = {
            id: 1,
            email: "test@example.com",
            fullName: "Test User",
            isEmailConfirmed: true,
            isActive: true,
            role: "user",
        };
        next();
    }),
}));
jest.mock("../../middleware/verifyEmail", () => ({
    verifyEmail: jest.fn((req, res, next) => {
        // By default, let requests pass through
        next();
    }),
}));

// Get mocked middleware
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");

// Import mocked models
const communityModel = require("../models/community.model");
const locationModel = require("../models/location.model");
const imageModel = require("../models/image.model");
const tagModel = require("../models/tag.model");
const subscriptionModel = require("../models/subscription.model");

describe("Community Creation API", () => {
    // Test community data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        tagline: "This is a test community",
        description: "A community created for testing purposes",
        is_private: false,
        created_by: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    // Close the server after all tests
    let server;

    // Setup before each test
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Reset middleware to default behavior
        authenticate.mockImplementation((req, res, next) => {
            req.user = {
                id: 1,
                email: "test@example.com",
                fullName: "Test User",
                isEmailConfirmed: true,
                isActive: true,
                role: "user",
            };
            next();
        });

        verifyEmail.mockImplementation((req, res, next) => {
            next();
        });

        // Mock database methods
        db.executeTransaction = jest.fn().mockResolvedValue([
            {
                rows: [testCommunity],
            },
        ]);

        // Mock community model
        communityModel.create = jest.fn().mockImplementation((data) => {
            if (data.useTransaction) {
                return {
                    text: "INSERT INTO communities...", // Mock SQL query
                    values: [
                        data.name,
                        data.unique_url,
                        data.tagline,
                        data.description,
                        data.guidelines,
                        data.is_private,
                        data.created_by,
                    ],
                };
            } else {
                return Promise.resolve(testCommunity);
            }
        });

        communityModel.addMember = jest.fn().mockResolvedValue({
            community_id: testCommunity.id,
            user_id: 1,
            role: "owner",
        });

        // Mock subscription model
        subscriptionModel.createFreeSubscription = jest.fn().mockResolvedValue({
            id: 1,
            community_id: testCommunity.id,
            plan: "free",
            status: "active",
            created_by: 1,
            created_at: new Date().toISOString(),
        });

        // Mock location model
        locationModel.create = jest.fn().mockResolvedValue({
            id: 1,
            entity_type: "community",
            entity_id: testCommunity.id,
            name: "New York",
            location_type: "address",
            lat: 40.7128,
            lng: -74.006,
        });

        // Mock image model
        imageModel.create = jest.fn().mockImplementation((data) => {
            return Promise.resolve({
                id: data.image_type === "profile" ? 1 : 2,
                entity_type: "community",
                entity_id: testCommunity.id,
                image_type: data.image_type,
                provider: "s3",
                key: `community/${testCommunity.id}/${data.image_type}.jpg`,
                alt_text: data.alt_text || null,
            });
        });

        // Mock tag model
        tagModel.assignTagByName = jest.fn().mockResolvedValue({
            id: 1,
            tag_id: 1,
            entity_type: "community",
            entity_id: testCommunity.id,
            assignment_type: "category",
        });

        tagModel.getCommunityTags = jest.fn().mockResolvedValue([
            { id: 1, name: "Technology", assignment_type: "category" },
            { id: 2, name: "Education", assignment_type: "category" },
        ]);
    });

    // Clean up after all tests
    afterAll(() => {
        // Ensure all mocks are restored
        jest.restoreAllMocks();
    });

    describe("POST /api/communities", () => {
        it("should create a new community successfully", async () => {
            // Setup request data
            const requestData = {
                name: "Test Community",
                unique_url: "test-community",
                tagline: "This is a test community",
                description: "A community created for testing purposes",
                is_private: false,
                location: {
                    city: "New York",
                    lat: 40.7128,
                    lng: -74.006,
                },
                tags: ["Technology", "Education"],
                profile_image: {
                    provider: "s3",
                    key: "temp/profile.jpg",
                    alt_text: "Community profile image",
                },
                cover_image: {
                    provider: "s3",
                    key: "temp/cover.jpg",
                    alt_text: "Community cover image",
                },
            };

            // Perform the test request
            const res = await request(app)
                .post("/api/communities")
                .send(requestData);

            // Assertions
            expect(res.status).toBe(201);
            expect(res.body.status).toBe("success");
            expect(res.body.data.name).toBe(testCommunity.name);
            expect(res.body.data.unique_url).toBe(testCommunity.unique_url);

            // Verify model calls
            expect(communityModel.create).toHaveBeenCalled();
            expect(db.executeTransaction).toHaveBeenCalled();
            expect(communityModel.addMember).toHaveBeenCalledWith({
                community_id: testCommunity.id,
                user_id: 1,
                role: "owner",
            });

            // Verify subscription creation
            expect(
                subscriptionModel.createFreeSubscription
            ).toHaveBeenCalledWith(testCommunity.id, 1);

            expect(locationModel.create).toHaveBeenCalled();
            expect(tagModel.assignTagByName).toHaveBeenCalledTimes(2); // Once for each tag
            expect(tagModel.assignTagByName).toHaveBeenCalledWith({
                community_id: testCommunity.id,
                tag_name: "Technology",
            });
            expect(tagModel.assignTagByName).toHaveBeenCalledWith({
                community_id: testCommunity.id,
                tag_name: "Education",
            });
            expect(imageModel.create).toHaveBeenCalledTimes(2); // One for profile, one for cover
        });

        it("should require authentication", async () => {
            // Mock the authenticate middleware to fail
            authenticate.mockImplementation((req, res, next) => {
                return res.status(401).json({
                    status: "error",
                    message: "Authentication required",
                });
            });

            const res = await request(app)
                .post("/api/communities")
                .send({ name: "Test Community" });

            expect(res.status).toBe(401);
        });

        it("should require verified email", async () => {
            // Mock the verifyEmail middleware to fail
            verifyEmail.mockImplementation((req, res, next) => {
                return res.status(403).json({
                    status: "error",
                    message:
                        "Email verification required. Please verify your email before proceeding.",
                });
            });

            const res = await request(app)
                .post("/api/communities")
                .send({ name: "Test Community" });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain("Email verification required");
        });

        it("should validate community name", async () => {
            // Mock the validation to fail
            // This assumes express-validator is used in your routes
            const res = await request(app).post("/api/communities").send({
                name: "A", // Too short
                unique_url: "test-community",
            });

            expect(res.status).toBe(400);
        });

        it("should validate unique URL format", async () => {
            const res = await request(app).post("/api/communities").send({
                name: "Test Community",
                unique_url: "invalid url with spaces", // Invalid format
            });

            expect(res.status).toBe(400);
        });

        it("should handle duplicate unique URL", async () => {
            // Mock database error for duplicate URL
            db.executeTransaction.mockRejectedValueOnce({
                code: "23505",
                constraint: "communities_unique_url_key",
                message: "duplicate key value violates unique constraint",
            });

            const res = await request(app).post("/api/communities").send({
                name: "Test Community",
                unique_url: "existing-url",
            });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("URL already exists");
        });

        it("should create a community without optional fields", async () => {
            const res = await request(app).post("/api/communities").send({
                name: "Minimal Community",
                unique_url: "minimal-community",
            });

            expect(res.status).toBe(201);
            expect(res.body.status).toBe("success");

            // Verify that only required operations were performed
            expect(communityModel.create).toHaveBeenCalled();
            expect(db.executeTransaction).toHaveBeenCalled();
            expect(communityModel.addMember).toHaveBeenCalled();
            expect(locationModel.create).not.toHaveBeenCalled();
            expect(tagModel.assignTagByName).not.toHaveBeenCalled();
            expect(imageModel.create).not.toHaveBeenCalled();
        });
    });
});
