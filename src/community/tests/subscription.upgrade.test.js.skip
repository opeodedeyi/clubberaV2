// src/community/tests/subscription.upgrade.test.js

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

describe("Subscription Upgrade API", () => {
    // Test data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        is_private: false,
        is_active: true,
        created_by: 1,
    };

    const testProMonthlyPlan = {
        id: 2,
        name: "Pro Monthly",
        code: "pro_monthly",
        price: "9.99",
        currency: "USD",
        billing_interval: "monthly",
        features: {
            pro_features: true,
            emails: 1000,
        },
    };

    const testProYearlyPlan = {
        id: 3,
        name: "Pro Yearly",
        code: "pro_yearly",
        price: "99.99",
        currency: "USD",
        billing_interval: "yearly",
        features: {
            pro_features: true,
            emails: 1000,
        },
    };

    const testUpgradedSubscription = {
        id: 1,
        community_id: 1,
        plan_id: 2,
        status: "active",
        starts_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
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

        subscriptionPlanModel.getByCode = jest
            .fn()
            .mockImplementation((code) => {
                if (code === "pro_monthly")
                    return Promise.resolve(testProMonthlyPlan);
                if (code === "pro_yearly")
                    return Promise.resolve(testProYearlyPlan);
                return Promise.resolve(null);
            });

        subscriptionModel.upgradeToPro = jest
            .fn()
            .mockResolvedValue(testUpgradedSubscription);
    });

    describe("upgradeToPro controller method", () => {
        it("should upgrade subscription to monthly plan successfully", async () => {
            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1 },
                body: {
                    plan_code: "pro_monthly",
                    payment_details: {
                        payment_method: "credit_card",
                        amount: 9.99,
                    },
                },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.upgradeToPro(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: "Community upgraded to Pro plan",
                    data: testUpgradedSubscription,
                })
            );
            expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(
                1,
                1,
                "owner"
            );
            expect(subscriptionModel.upgradeToPro).toHaveBeenCalledWith(
                1,
                "pro_monthly",
                1,
                expect.any(Object)
            );
        });

        it("should upgrade subscription to yearly plan successfully", async () => {
            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1 },
                body: {
                    plan_code: "pro_yearly",
                    payment_details: {
                        payment_method: "credit_card",
                        amount: 99.99,
                    },
                },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.upgradeToPro(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalled();
            // Removed expectation for subscriptionPlanModel.getByCode since it's not called directly in controller
            expect(subscriptionModel.upgradeToPro).toHaveBeenCalledWith(
                1,
                "pro_yearly",
                1,
                expect.any(Object)
            );
        });

        it("should require authentication", async () => {
            // Mock request without user
            const req = {
                params: { id: 1 },
                body: { plan_code: "pro_monthly" },
                // No user property
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.upgradeToPro(req, res, next);

            // Controller should pass error to next
            expect(next).toHaveBeenCalled();
            expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
        });

        it("should return 404 if community doesn't exist", async () => {
            // Mock request
            const req = {
                params: { id: 999 },
                user: { id: 1 },
                body: { plan_code: "pro_monthly" },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.upgradeToPro(req, res, next);

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
                body: { plan_code: "pro_monthly" },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.upgradeToPro(req, res, next);

            // Verify permission error
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only the community owner can upgrade the subscription",
                403
            );
        });
    });
});
