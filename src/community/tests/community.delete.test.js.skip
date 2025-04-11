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
            role: "user", // Default as regular user, not superuser
        };
        next();
    }),
}));

jest.mock("../../middleware/role", () => ({
    requireRole: (role) => (req, res, next) => {
        if (req.user && req.user.role === role) {
            return next();
        }
        return res.status(403).json({
            status: "error",
            message: `This action requires ${role} privileges`,
        });
    },
}));

// Get mocked middleware
const { authenticate } = require("../../middleware/auth");

describe("Community Permanent Deletion API", () => {
    // Test community data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        tagline: "This is a test community",
        description: "A community created for testing purposes",
        is_private: false,
        is_active: true,
        created_by: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
                role: "user", // Default as regular user
            };
            next();
        });

        // Mock community model methods
        communityModel.findByIdentifier = jest
            .fn()
            .mockResolvedValue(testCommunity);
        communityModel.delete = jest.fn().mockResolvedValue(true);
    });

    // Clean up after all tests
    afterAll(() => {
        // Ensure all mocks are restored
        jest.restoreAllMocks();
    });

    describe("DELETE /api/communities/:id", () => {
        it("should permanently delete a community when user is superuser", async () => {
            // Mock user as superuser
            authenticate.mockImplementation((req, res, next) => {
                req.user = {
                    id: 1,
                    email: "admin@example.com",
                    fullName: "Admin User",
                    isEmailConfirmed: true,
                    isActive: true,
                    role: "superuser",
                };
                next();
            });

            // Perform the test request
            const res = await request(app).delete("/api/communities/1");

            // Assertions
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("success");
            expect(res.body.message).toBe("Community permanently deleted");

            // Verify model calls
            expect(communityModel.findByIdentifier).toHaveBeenCalledWith(
                "1",
                true
            );
            expect(communityModel.delete).toHaveBeenCalledWith("1");
        });

        it("should require authentication", async () => {
            // Mock the authenticate middleware to fail
            authenticate.mockImplementation((req, res, next) => {
                return res.status(401).json({
                    status: "error",
                    message: "Authentication required",
                });
            });

            const res = await request(app).delete("/api/communities/1");

            expect(res.status).toBe(401);
            expect(communityModel.delete).not.toHaveBeenCalled();
        });

        it("should not allow regular users to delete communities", async () => {
            // Regular user role is already set in beforeEach

            const res = await request(app).delete("/api/communities/1");

            expect(res.status).toBe(403);
            expect(res.body.message).toContain("requires superuser privileges");
            expect(communityModel.delete).not.toHaveBeenCalled();
        });

        it("should not allow staff users to delete communities", async () => {
            // Mock user as staff (not superuser)
            authenticate.mockImplementation((req, res, next) => {
                req.user = {
                    id: 1,
                    email: "staff@example.com",
                    fullName: "Staff User",
                    isEmailConfirmed: true,
                    isActive: true,
                    role: "staff",
                };
                next();
            });

            const res = await request(app).delete("/api/communities/1");

            expect(res.status).toBe(403);
            expect(communityModel.delete).not.toHaveBeenCalled();
        });

        it("should return 404 if community doesn't exist", async () => {
            // Mock user as superuser
            authenticate.mockImplementation((req, res, next) => {
                req.user = {
                    id: 1,
                    role: "superuser",
                };
                next();
            });

            // Mock community not found
            communityModel.findByIdentifier.mockResolvedValue(null);

            const res = await request(app).delete("/api/communities/999");

            expect(res.status).toBe(404);
            expect(res.body.message).toContain("not found");
            expect(communityModel.delete).not.toHaveBeenCalled();
        });

        it("should handle server errors gracefully", async () => {
            // Mock user as superuser
            authenticate.mockImplementation((req, res, next) => {
                req.user = {
                    id: 1,
                    role: "superuser",
                };
                next();
            });

            // Mock server error
            communityModel.delete.mockRejectedValue(
                new Error("Database error")
            );

            const res = await request(app).delete("/api/communities/1");

            expect(res.status).toBe(500);
            expect(communityModel.delete).toHaveBeenCalled();
        });
    });
});
