// src/community/tests/subscription.downgrade.test.js

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../models/subscription.model");
jest.mock("../models/subscriptionPlan.model");
jest.mock("../../utils/ApiError");

// Import dependencies
const communityModel = require("../models/community.model");
const subscriptionModel = require("../models/subscription.model");
const subscriptionPlanModel = require("../models/subscriptionPlan.model");
const ApiError = require("../../utils/ApiError");

// Import controller directly
const subscriptionController = require("../controllers/subscription.controller");

describe("Subscription Downgrade API", () => {
    // Test data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        is_private: false,
        is_active: true,
        created_by: 1,
    };

    const testFreePlan = {
        id: 1,
        name: "Free Plan",
        code: "free",
        price: "0.00",
        currency: "USD",
        billing_interval: "monthly",
        features: {
            pro_features: false,
            emails: 0,
        },
    };

    const testDowngradedSubscription = {
        id: 1,
        community_id: 1,
        plan_id: 1,
        status: "active",
        starts_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: null,
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

        // Mock model methods
        communityModel.findByIdentifier = jest.fn().mockImplementation((id) => {
            if (id === 999) return Promise.resolve(null);
            return Promise.resolve(testCommunity);
        });

        communityModel.checkMemberRole = jest
            .fn()
            .mockImplementation((communityId, userId, role) => {
                // User 1 is owner of community 1
                if (communityId === 1 && userId === 1 && role === "owner") {
                    return Promise.resolve(true);
                }
                return Promise.resolve(false);
            });

        subscriptionPlanModel.getFreePlan = jest
            .fn()
            .mockResolvedValue(testFreePlan);
        subscriptionModel.downgradeToFree = jest
            .fn()
            .mockResolvedValue(testDowngradedSubscription);
    });

    describe("downgradeToFree controller method", () => {
        it("should downgrade subscription to free plan successfully", async () => {
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
            await subscriptionController.downgradeToFree(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                message: "Community downgraded to Free plan",
                data: testDowngradedSubscription,
            });
            expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(
                1,
                1,
                "owner"
            );
            expect(subscriptionModel.downgradeToFree).toHaveBeenCalledWith(1);
        });

        it("should require authentication", async () => {
            // Mock request without user
            const req = {
                params: { id: 1 },
                // No user property
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.downgradeToFree(req, res, next);

            // Controller should pass error to next
            expect(next).toHaveBeenCalled();
            expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
        });

        it("should return 404 if community doesn't exist", async () => {
            // Mock request
            const req = {
                params: { id: 999 },
                user: { id: 1 },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.downgradeToFree(req, res, next);

            // Verify error handling
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Community not found or inactive",
                404
            );
        });

        it("should return 403 if user is not the owner", async () => {
            // Mock request with non-owner user
            const req = {
                params: { id: 1 },
                user: {
                    id: 2, // Different user
                    email: "nonowner@example.com",
                },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.downgradeToFree(req, res, next);

            // Verify permission error
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only the community owner can change the subscription",
                403
            );
        });
    });
});
