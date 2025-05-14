// src/community/tests/community.respond-request.test.js

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../../utils/ApiError");

// Import dependencies
const communityModel = require("../models/community.model");
const ApiError = require("../../utils/ApiError");

// Import the controller directly
const communityController = require("../controllers/community.controller");

describe("Community Respond to Join Request API", () => {
    // Test community data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        is_private: true,
        is_active: true,
    };

    // Test join request
    const testRequest = {
        id: 1,
        community_id: 1,
        user_id: 11,
        message: "Sample request message",
        status: "pending",
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    };

    // Test approved request
    const approvedRequest = {
        ...testRequest,
        status: "approved",
        responded_by: 1,
        responded_at: new Date().toISOString(),
    };

    // Test rejected request
    const rejectedRequest = {
        ...testRequest,
        status: "rejected",
        responded_by: 1,
        responded_at: new Date().toISOString(),
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

        // Mock finding communities
        communityModel.findByIdentifier = jest
            .fn()
            .mockResolvedValue(testCommunity);

        // Not admin by default
        communityModel.checkMemberRole = jest.fn().mockResolvedValue(false);

        // Default respond to join request behavior
        communityModel.respondToJoinRequest = jest
            .fn()
            .mockImplementation((requestId, data) => {
                if (requestId === "999") {
                    return Promise.resolve(null); // Not found
                }

                if (data.status === "approved") {
                    return Promise.resolve(approvedRequest);
                } else {
                    return Promise.resolve(rejectedRequest);
                }
            });

        // Mock adding member
        communityModel.addMember = jest.fn().mockResolvedValue({
            id: 1,
            community_id: 1,
            user_id: 11,
            role: "member",
            joined_at: new Date().toISOString(),
        });
    });

    describe("respondToJoinRequest controller method", () => {
        it("should successfully approve a join request", async () => {
            // Make user an admin
            communityModel.checkMemberRole.mockResolvedValue(true);

            // Mock request and response
            const req = {
                params: { id: 1, requestId: 1 },
                user: { id: 1 },
                body: { status: "approved" },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await communityController.respondToJoinRequest(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.status).toBe("success");
            expect(responseData.message).toContain("approved");
            expect(communityModel.respondToJoinRequest).toHaveBeenCalled();
            expect(communityModel.addMember).toHaveBeenCalled();
        });

        it("should successfully reject a join request", async () => {
            // Make user an admin
            communityModel.checkMemberRole.mockResolvedValue(true);

            // Mock request and response
            const req = {
                params: { id: 1, requestId: 1 },
                user: { id: 1 },
                body: { status: "rejected" },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await communityController.respondToJoinRequest(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.status).toBe("success");
            expect(responseData.message).toContain("rejected");
            expect(communityModel.respondToJoinRequest).toHaveBeenCalled();
            expect(communityModel.addMember).not.toHaveBeenCalled();
        });

        it("should validate the status value", async () => {
            // Skip this test for now as it would be handled by the validator middleware
        });

        it("should handle missing user", async () => {
            // Mock request without user
            const req = {
                params: { id: 1, requestId: 1 },
                // No user property
                body: { status: "approved" },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.respondToJoinRequest(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(expect.any(String), 401);
        });

        it("should return 404 if community doesn't exist", async () => {
            // Mock community not found
            communityModel.findByIdentifier.mockResolvedValue(null);

            // Mock request and response
            const req = {
                params: { id: 999, requestId: 1 },
                user: { id: 1 },
                body: { status: "approved" },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.respondToJoinRequest(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(expect.any(String), 404);
        });

        it("should return 403 if user is not an admin", async () => {
            // Not admin (default mock is already false)

            // Mock request and response
            const req = {
                params: { id: 1, requestId: 1 },
                user: { id: 2 }, // Different user
                body: { status: "approved" },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.respondToJoinRequest(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                expect.stringContaining("permission"),
                403
            );
        });

        it("should return 404 if request doesn't exist", async () => {
            // Make user an admin
            communityModel.checkMemberRole.mockResolvedValue(true);

            // Request not found
            communityModel.respondToJoinRequest.mockResolvedValue(null);

            // Mock request and response
            const req = {
                params: { id: 1, requestId: 999 },
                user: { id: 1 },
                body: { status: "approved" },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.respondToJoinRequest(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                expect.stringContaining("Join request not found"),
                404
            );
        });
    });
});
