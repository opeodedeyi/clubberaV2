// src/community/tests/community.leave.test.js

// Mock dependencies directly
jest.mock("../models/community.model");
jest.mock("../../utils/ApiError");

// Import dependencies for testing
const communityModel = require("../models/community.model");
const ApiError = require("../../utils/ApiError");
const communityController = require("../controllers/community.controller");

describe("Community Leave API", () => {
    // Test community data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        is_private: false,
        is_active: true,
    };

    // Setup before each test
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Setup ApiError mock
        ApiError.mockImplementation((message, statusCode) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
        });

        // Setup default mocks
        communityModel.findByIdentifier = jest
            .fn()
            .mockResolvedValue(testCommunity);
        communityModel.checkMemberRole = jest.fn().mockResolvedValue(false);
        communityModel.removeMember = jest.fn().mockResolvedValue(true);
    });

    describe("leaveCommunity controller method", () => {
        it("should successfully leave a community", async () => {
            // Set up mocks for this specific test
            communityModel.checkMemberRole = jest
                .fn()
                .mockImplementation((communityId, userId, roles) => {
                    // Regular member check returns true
                    if (Array.isArray(roles)) {
                        return Promise.resolve(true);
                    }
                    // Not an owner
                    if (roles === "owner") {
                        return Promise.resolve(false);
                    }
                    return Promise.resolve(false);
                });

            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1 },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await communityController.leaveCommunity(req, res, next);

            // Assertions
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(
                1,
                1,
                "owner"
            );
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(
                1,
                1,
                expect.arrayContaining(["member"])
            );
            expect(communityModel.removeMember).toHaveBeenCalledWith(1, 1);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                message: expect.stringContaining("Successfully left community"),
            });
        });

        it("should handle missing user", async () => {
            // Mock request with undefined user
            const req = {
                params: { id: 1 },
                // No user property
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.leaveCommunity(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(expect.any(String), 401);
        });

        it("should return 404 if community doesn't exist", async () => {
            // Mock community not found
            communityModel.findByIdentifier.mockResolvedValue(null);

            // Mock request and response
            const req = {
                params: { id: 999 },
                user: { id: 1 },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.leaveCommunity(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(expect.any(String), 404);
        });

        it("should return 400 if user is not a member", async () => {
            // Set up for this test
            communityModel.checkMemberRole = jest
                .fn()
                .mockImplementation((communityId, userId, roles) => {
                    // Not an owner
                    if (roles === "owner") {
                        return Promise.resolve(false);
                    }
                    // Not a member either
                    return Promise.resolve(false);
                });

            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1 },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.leaveCommunity(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                expect.stringContaining("not a member"),
                400
            );
        });

        it("should not allow owners to leave", async () => {
            // Set up for this test - user is an owner
            communityModel.checkMemberRole = jest
                .fn()
                .mockImplementation((communityId, userId, roles) => {
                    // User is an owner
                    if (roles === "owner") {
                        return Promise.resolve(true);
                    }
                    // Also a regular member
                    return Promise.resolve(true);
                });

            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1 },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.leaveCommunity(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                expect.stringContaining("Transfer ownership"),
                400
            );
            // The owner check should prevent reaching the removeMember stage
            expect(communityModel.removeMember).not.toHaveBeenCalled();
        });
    });
});
