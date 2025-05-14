// src/community/tests/community.join.test.js

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../../utils/ApiError");

// Import dependencies
const communityModel = require("../models/community.model");
const ApiError = require("../../utils/ApiError");

// Import the controller directly
const communityController = require("../controllers/community.controller");

describe("Community Join API", () => {
    // Test community data
    const testPublicCommunity = {
        id: 1,
        name: "Public Community",
        unique_url: "public-community",
        is_private: false,
        is_active: true,
    };

    const testPrivateCommunity = {
        id: 4,
        name: "Private Community",
        unique_url: "private-community",
        is_private: true,
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

        // Mock finding communities
        communityModel.findByIdentifier = jest.fn().mockImplementation((id) => {
            if (id === "1" || id === 1)
                return Promise.resolve(testPublicCommunity);
            if (id === "4" || id === 4)
                return Promise.resolve(testPrivateCommunity);
            return Promise.resolve(null);
        });

        // Default not a member
        communityModel.checkMemberRole = jest.fn().mockResolvedValue(false);

        // Default not banned
        communityModel.checkActiveBan = jest.fn().mockResolvedValue(null);

        // Mock join request
        communityModel.createJoinRequest = jest
            .fn()
            .mockImplementation((data) => {
                return Promise.resolve({
                    id: 1,
                    ...data,
                    status: "pending",
                    created_at: new Date().toISOString(),
                });
            });

        // Mock add member
        communityModel.addMember = jest.fn().mockImplementation((data) => {
            return Promise.resolve({
                id: 1,
                ...data,
                role: data.role || "member",
                joined_at: new Date().toISOString(),
            });
        });
    });

    describe("joinCommunity controller method", () => {
        it("should successfully join a public community", async () => {
            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1, isEmailConfirmed: true },
                body: {},
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await communityController.joinCommunity(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.status).toBe("success");
            expect(responseData.message).toContain("joined community");
            expect(communityModel.addMember).toHaveBeenCalled();
        });

        it("should create a join request for a private community", async () => {
            // Mock request and response
            const req = {
                params: { id: 4 }, // Private community
                user: { id: 1, isEmailConfirmed: true },
                body: { message: "I would like to join your community" },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await communityController.joinCommunity(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.status).toBe("success");
            expect(responseData.message).toContain("request sent");
            expect(communityModel.createJoinRequest).toHaveBeenCalled();
            expect(communityModel.addMember).not.toHaveBeenCalled();
        });

        it("should handle missing user", async () => {
            // Mock request without user
            const req = {
                params: { id: 1 },
                // No user property
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.joinCommunity(req, res, next);

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
                user: { id: 1, isEmailConfirmed: true },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.joinCommunity(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(expect.any(String), 404);
        });

        it("should return 400 if already a member", async () => {
            // Set up for this test - user is already a member
            communityModel.checkMemberRole.mockResolvedValue(true);

            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1, isEmailConfirmed: true },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.joinCommunity(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                expect.stringContaining("already a member"),
                400
            );
        });

        it("should return 403 if user is banned", async () => {
            // Set up for this test - user is banned
            communityModel.checkActiveBan.mockResolvedValue({
                id: 1,
                type: "ban",
                expires_at: null,
            });

            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1, isEmailConfirmed: true },
            };

            const res = {};
            const next = jest.fn();

            // Call controller method directly
            await communityController.joinCommunity(req, res, next);

            // Assertions
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                expect.stringContaining("banned"),
                403
            );
        });
    });
});
