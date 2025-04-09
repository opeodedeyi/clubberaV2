// src/community/tests/subscription.cancel.test.js

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../models/subscription.model");
jest.mock("../../utils/ApiError");

// Import dependencies
const communityModel = require("../models/community.model");
const subscriptionModel = require("../models/subscription.model");
const ApiError = require("../../utils/ApiError");

// Import controller directly
const subscriptionController = require("../controllers/subscription.controller");

describe("Subscription Cancel API", () => {
    // Test data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        is_private: false,
        is_active: true,
        created_by: 1,
    };

    const testSubscription = {
        id: 1,
        community_id: 1,
        plan_id: 2,
        status: "active",
        canceled_at: null,
        cancel_at_period_end: false,
    };

    const testCancelledAtPeriodEnd = {
        ...testSubscription,
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: true,
    };

    const testCancelledImmediately = {
        ...testSubscription,
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: false,
        status: "canceled",
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

        subscriptionModel.cancelSubscription = jest
            .fn()
            .mockImplementation((communityId, atPeriodEnd) => {
                if (atPeriodEnd) {
                    return Promise.resolve(testCancelledAtPeriodEnd);
                } else {
                    return Promise.resolve(testCancelledImmediately);
                }
            });
    });

    describe("cancelSubscription controller method", () => {
        it("should cancel subscription at period end by default", async () => {
            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1 },
                body: {}, // No at_period_end specified, should default to true
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.cancelSubscription(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                message:
                    "Subscription will be canceled at the end of the billing period",
                data: testCancelledAtPeriodEnd,
            });
            expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(
                1,
                1,
                "owner"
            );
            expect(subscriptionModel.cancelSubscription).toHaveBeenCalledWith(
                1,
                true
            );
        });

        it("should cancel subscription immediately when requested", async () => {
            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1 },
                body: { at_period_end: false },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.cancelSubscription(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                message: "Subscription canceled immediately",
                data: testCancelledImmediately,
            });
            expect(subscriptionModel.cancelSubscription).toHaveBeenCalledWith(
                1,
                false
            );
        });

        it("should require authentication", async () => {
            // Mock request without user
            const req = {
                params: { id: 1 },
                body: {},
                // No user property
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.cancelSubscription(req, res, next);

            // Controller should pass error to next
            expect(next).toHaveBeenCalled();
            expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
        });

        it("should return 404 if community doesn't exist", async () => {
            // Mock request
            const req = {
                params: { id: 999 },
                user: { id: 1 },
                body: {},
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.cancelSubscription(req, res, next);

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
                body: {},
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.cancelSubscription(req, res, next);

            // Verify permission error
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only the community owner can cancel the subscription",
                403
            );
        });
    });
});
