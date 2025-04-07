const request = require("supertest");
const app = require("../../../index");
const communityModel = require("../models/community.model");

// Mock dependencies
jest.mock("../models/community.model");
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

// Get mocked middleware
const { authenticate } = require("../../middleware/auth");

describe("Community Reactivation API", () => {
    // Test community data (inactive)
    const inactiveCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        tagline: "This is a test community",
        description: "A community created for testing purposes",
        is_private: false,
        is_active: false,
        created_by: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    // Reactivated community
    const reactivatedCommunity = {
        ...inactiveCommunity,
        is_active: true,
    };

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

        // Mock community model methods
        communityModel.findByIdentifier = jest
            .fn()
            .mockResolvedValue(inactiveCommunity);
        communityModel.checkMemberRole = jest.fn().mockResolvedValue(true); // Default as owner
        communityModel.reactivate = jest
            .fn()
            .mockResolvedValue(reactivatedCommunity);
    });

    // Clean up after all tests
    afterAll(() => {
        // Ensure all mocks are restored
        jest.restoreAllMocks();
    });

    describe("PUT /api/communities/:id/reactivate", () => {
        it("should reactivate a community successfully when user is owner", async () => {
            // Setup mocks for this test
            communityModel.checkMemberRole.mockResolvedValue(true); // User is owner

            // Perform the test request
            const res = await request(app).put("/api/communities/1/reactivate");

            // Assertions
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("success");
            expect(res.body.message).toBe("Community reactivated successfully");
            expect(res.body.data.is_active).toBe(true);

            // Verify model calls
            expect(communityModel.findByIdentifier).toHaveBeenCalledWith(
                "1",
                true
            );
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(
                "1",
                1,
                "owner"
            );
            expect(communityModel.reactivate).toHaveBeenCalledWith("1");
        });

        it("should allow superusers to reactivate communities", async () => {
            // Mock user as superuser but not owner
            authenticate.mockImplementation((req, res, next) => {
                req.user = {
                    id: 2, // Different user ID
                    email: "admin@example.com",
                    fullName: "Admin User",
                    isEmailConfirmed: true,
                    isActive: true,
                    role: "superuser",
                };
                next();
            });
            communityModel.checkMemberRole.mockResolvedValue(false); // Not owner

            const res = await request(app).put("/api/communities/1/reactivate");

            expect(res.status).toBe(200);
            expect(res.body.status).toBe("success");
            expect(communityModel.reactivate).toHaveBeenCalledWith("1");
        });

        it("should require authentication", async () => {
            // Mock the authenticate middleware to fail
            authenticate.mockImplementation((req, res, next) => {
                return res.status(401).json({
                    status: "error",
                    message: "Authentication required",
                });
            });

            const res = await request(app).put("/api/communities/1/reactivate");

            expect(res.status).toBe(401);
            expect(communityModel.reactivate).not.toHaveBeenCalled();
        });

        it("should return 404 if community doesn't exist", async () => {
            // Mock community not found
            communityModel.findByIdentifier.mockResolvedValue(null);

            const res = await request(app).put(
                "/api/communities/999/reactivate"
            );

            expect(res.status).toBe(404);
            expect(res.body.message).toContain("not found");
            expect(communityModel.reactivate).not.toHaveBeenCalled();
        });

        it("should return 403 if user is not owner or superuser", async () => {
            // Mock user not being the owner and not a superuser
            communityModel.checkMemberRole.mockResolvedValue(false);

            // Regular user role (not superuser)
            authenticate.mockImplementation((req, res, next) => {
                req.user = {
                    id: 2,
                    email: "regular@example.com",
                    fullName: "Regular User",
                    isEmailConfirmed: true,
                    isActive: true,
                    role: "user",
                };
                next();
            });

            const res = await request(app).put("/api/communities/1/reactivate");

            expect(res.status).toBe(403);
            expect(res.body.message).toContain(
                "Only the community owner or administrators"
            );
            expect(communityModel.reactivate).not.toHaveBeenCalled();
        });

        it("should handle server errors gracefully", async () => {
            // Mock server error
            communityModel.reactivate.mockRejectedValue(
                new Error("Database error")
            );

            const res = await request(app).put("/api/communities/1/reactivate");

            expect(res.status).toBe(500);
            expect(communityModel.reactivate).toHaveBeenCalled();
        });
    });
});
