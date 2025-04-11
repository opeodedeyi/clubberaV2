// src/community/tests/subscription.payments.test.js

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../models/subscriptionPayment.model");
jest.mock("../../utils/ApiError");

// Import dependencies
const communityModel = require("../models/community.model");
const subscriptionPaymentModel = require("../models/subscriptionPayment.model");
const ApiError = require("../../utils/ApiError");

// Import controller directly
const subscriptionController = require("../controllers/subscription.controller");

describe("Subscription Payment History API", () => {
    // Test data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        is_private: false,
        is_active: true,
        created_by: 1,
    };

    // Mock payment data
    const testPayments = Array(15)
        .fill()
        .map((_, i) => ({
            id: i + 1,
            subscription_id: 1,
            amount: "9.99",
            currency: "USD",
            payment_method: "credit_card",
            payment_provider: "stripe",
            provider_transaction_id: `tx_${i + 1}`,
            status: "succeeded",
            created_at: new Date(
                Date.now() - i * 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
        }));

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

        subscriptionPaymentModel.getByCommunityId = jest
            .fn()
            .mockImplementation((id, options) => {
                const { limit = 20, offset = 0 } = options || {};
                return Promise.resolve(
                    testPayments.slice(offset, offset + limit)
                );
            });

        subscriptionPaymentModel.countBySubscriptionId = jest
            .fn()
            .mockResolvedValue(testPayments.length);
    });

    describe("getPaymentHistory controller method", () => {
        it("should get payment history successfully", async () => {
            // Mock request and response
            const req = {
                params: { id: 1 },
                user: { id: 1 },
                query: {},
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.getPaymentHistory(req, res, next);

            // Assertions
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: testPayments.slice(0, 20),
                pagination: expect.objectContaining({
                    total: testPayments.length,
                    limit: 20,
                    offset: 0,
                }),
            });
            expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(
                1,
                1,
                "owner"
            );
            expect(
                subscriptionPaymentModel.getByCommunityId
            ).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    limit: 20,
                    offset: 0,
                })
            );
        });

        it("should handle pagination parameters", async () => {
            // Mock request with pagination
            const req = {
                params: { id: 1 },
                user: { id: 1 },
                query: {
                    limit: "5",
                    offset: "10",
                },
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.getPaymentHistory(req, res, next);

            // Verify pagination parameters are used
            expect(
                subscriptionPaymentModel.getByCommunityId
            ).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    limit: 5,
                    offset: 10,
                })
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    pagination: expect.objectContaining({
                        limit: 5,
                        offset: 10,
                    }),
                })
            );
        });

        it("should require authentication", async () => {
            // Mock request without user
            const req = {
                params: { id: 1 },
                query: {},
                // No user property
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.getPaymentHistory(req, res, next);

            // Controller should pass error to next
            expect(next).toHaveBeenCalled();
            expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
        });

        it("should return 404 if community doesn't exist", async () => {
            // Mock request
            const req = {
                params: { id: 999 },
                user: { id: 1 },
                query: {},
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.getPaymentHistory(req, res, next);

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
                query: {},
            };

            const res = {
                json: jest.fn(),
            };

            const next = jest.fn();

            // Call controller method directly
            await subscriptionController.getPaymentHistory(req, res, next);

            // Verify permission error
            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only the community owner can view payment history",
                403
            );
        });
    });
});
