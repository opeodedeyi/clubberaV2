// src/communitySupport/tests/supportSubscription.test.js

const { validationResult } = require("express-validator");
const supportSubscriptionController = require("../controllers/supportSubscription.controller");
const supportSubscriptionModel = require("../models/supportSubscription.model");
const supportPlanModel = require("../models/supportPlan.model");
const communityModel = require("../models/community.model");
const paymentService = require("../../services/payment.service");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("express-validator");
jest.mock("../models/supportSubscription.model");
jest.mock("../models/supportPlan.model");
jest.mock("../models/community.model");
jest.mock("../../services/payment.service");
jest.mock("../../utils/ApiError");

describe("SupportSubscriptionController", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {
                communityId: "1",
                subscriptionId: "5",
            },
            query: {
                page: "1",
                limit: "10",
            },
            body: {
                paymentMethodId: "pm_123456789",
                paymentProvider: "stripe",
            },
            user: {
                id: 3,
                email: "user@example.com",
                full_name: "Test User",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        // Default mock implementations
        validationResult.mockReturnValue({
            isEmpty: jest.fn().mockReturnValue(true),
            array: jest.fn().mockReturnValue([]),
        });

        communityModel.communityExists.mockResolvedValue(true);

        supportPlanModel.getPlanByCommunityId.mockResolvedValue({
            id: 2,
            community_id: 1,
            name: "Test Support Plan",
            description: "Test description",
            monthly_price: 9.99,
            currency: "USD",
            is_active: true,
        });

        supportSubscriptionModel.getUserCommunitySubscription.mockResolvedValue(
            null
        );

        paymentService.getOrCreateStripeCustomer.mockResolvedValue({
            id: "cus_123456789",
        });

        paymentService.getOrCreateStripePlanProducts.mockResolvedValue({
            product: { id: "prod_123456789" },
            price: { id: "price_123456789" },
        });

        paymentService.createStripeSubscription.mockResolvedValue({
            id: "sub_123456789",
            status: "active",
            current_period_end:
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
        });

        supportSubscriptionModel.createSubscription.mockResolvedValue({
            id: 5,
            user_id: 3,
            community_id: 1,
            plan_id: 2,
            status: "active",
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            provider: "stripe",
            provider_subscription_id: "sub_123456789",
        });

        supportSubscriptionModel.getSubscriptionById.mockResolvedValue({
            id: 5,
            user_id: 3,
            community_id: 1,
            plan_id: 2,
            status: "active",
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            provider: "stripe",
            provider_subscription_id: "sub_123456789",
            cancel_at_period_end: false,
        });

        supportSubscriptionModel.getUserActiveSubscriptions.mockResolvedValue([
            {
                id: 5,
                user_id: 3,
                community_id: 1,
                plan_id: 2,
                status: "active",
                plan_name: "Test Support Plan",
                monthly_price: 9.99,
                currency: "USD",
                community_name: "Test Community",
                community_url: "test-community",
            },
        ]);

        supportSubscriptionModel.getCommunitySubscribers.mockResolvedValue({
            total: 1,
            results: [
                {
                    id: 5,
                    user_id: 3,
                    community_id: 1,
                    full_name: "Test User",
                    email: "user@example.com",
                    status: "active",
                },
            ],
        });

        supportSubscriptionModel.cancelSubscription.mockResolvedValue({
            id: 5,
            status: "active",
            cancel_at_period_end: true,
            canceled_at: new Date(),
        });

        supportSubscriptionModel.getPaymentHistory.mockResolvedValue([
            {
                id: 10,
                support_id: 5,
                amount: 9.99,
                currency: "USD",
                status: "succeeded",
                created_at: new Date(),
            },
        ]);

        communityModel.isUserCommunityOwner.mockResolvedValue(true);
    });

    describe("createSubscription", () => {
        it("should create a subscription successfully with Stripe", async () => {
            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(communityModel.communityExists).toHaveBeenCalledWith(1);
            expect(supportPlanModel.getPlanByCommunityId).toHaveBeenCalledWith(
                1
            );
            expect(
                supportSubscriptionModel.getUserCommunitySubscription
            ).toHaveBeenCalledWith(3, 1);

            expect(
                paymentService.getOrCreateStripeCustomer
            ).toHaveBeenCalledWith({
                email: "user@example.com",
                name: "Test User",
                userId: 3,
            });

            expect(
                paymentService.getOrCreateStripePlanProducts
            ).toHaveBeenCalledWith({
                communityId: 1,
                planId: 2,
                planName: "Test Support Plan",
                description: "Test description",
                amount: 9.99,
                currency: "usd",
            });

            expect(
                paymentService.createStripeSubscription
            ).toHaveBeenCalledWith({
                customerId: "cus_123456789",
                paymentMethodId: "pm_123456789",
                priceId: "price_123456789",
                metadata: {
                    userId: "3",
                    communityId: "1",
                    planId: "2",
                },
            });

            expect(
                supportSubscriptionModel.createSubscription
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 3,
                    communityId: 1,
                    planId: 2,
                    status: "active",
                    provider: "stripe",
                    providerSubscriptionId: "sub_123456789",
                })
            );

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.objectContaining({
                    id: 5,
                    user_id: 3,
                    community_id: 1,
                }),
            });
        });

        it("should handle validation errors", async () => {
            const validationError = { msg: "Payment method ID is required" };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });

        it("should return 404 if community not found", async () => {
            communityModel.communityExists.mockResolvedValue(false);

            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith("Community not found", 404);
        });

        it("should return 404 if community has no active support plan", async () => {
            supportPlanModel.getPlanByCommunityId.mockResolvedValue(null);

            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This community does not have an active support plan",
                404
            );
        });

        it("should return 404 if plan exists but is not active", async () => {
            supportPlanModel.getPlanByCommunityId.mockResolvedValue({
                id: 2,
                is_active: false,
            });

            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This community does not have an active support plan",
                404
            );
        });

        it("should return 400 if user already has a subscription", async () => {
            supportSubscriptionModel.getUserCommunitySubscription.mockResolvedValue(
                {
                    id: 5,
                    status: "active",
                }
            );

            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "You are already supporting this community",
                400
            );
        });

        it("should handle Stripe errors", async () => {
            const stripeError = new Error("Payment processing failed");
            paymentService.createStripeSubscription.mockRejectedValue(
                stripeError
            );

            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Payment processing failed",
                500
            );
        });

        it("should return 400 for unsupported payment provider", async () => {
            req.body.paymentProvider = "unknown";

            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Unsupported payment provider",
                400
            );
        });

        it("should return 501 for PayPal (not implemented yet)", async () => {
            req.body.paymentProvider = "paypal";

            await supportSubscriptionController.createSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "PayPal integration not implemented yet",
                501
            );
        });
    });

    describe("getSubscription", () => {
        it("should get user subscription for a community", async () => {
            const subscription = {
                id: 5,
                user_id: 3,
                community_id: 1,
                plan_name: "Test Support Plan",
                monthly_price: 9.99,
            };

            supportSubscriptionModel.getUserCommunitySubscription.mockResolvedValue(
                subscription
            );

            await supportSubscriptionController.getSubscription(req, res, next);

            expect(
                supportSubscriptionModel.getUserCommunitySubscription
            ).toHaveBeenCalledWith(3, 1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: subscription,
            });
        });

        it("should return 404 if user is not supporting the community", async () => {
            supportSubscriptionModel.getUserCommunitySubscription.mockResolvedValue(
                null
            );

            await supportSubscriptionController.getSubscription(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "You are not supporting this community",
                404
            );
        });

        it("should handle validation errors", async () => {
            const validationError = { msg: "Community ID must be an integer" };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportSubscriptionController.getSubscription(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });
    });

    describe("getUserSubscriptions", () => {
        it("should get all active subscriptions for a user", async () => {
            await supportSubscriptionController.getUserSubscriptions(
                req,
                res,
                next
            );

            expect(
                supportSubscriptionModel.getUserActiveSubscriptions
            ).toHaveBeenCalledWith(3);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.arrayContaining([
                    expect.objectContaining({
                        id: 5,
                        user_id: 3,
                        community_id: 1,
                    }),
                ]),
            });
        });

        it("should handle validation errors", async () => {
            const validationError = { msg: "Page must be a positive integer" };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportSubscriptionController.getUserSubscriptions(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            supportSubscriptionModel.getUserActiveSubscriptions.mockRejectedValue(
                dbError
            );

            await supportSubscriptionController.getUserSubscriptions(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe("getCommunitySubscribers", () => {
        it("should get all subscribers for a community as owner", async () => {
            await supportSubscriptionController.getCommunitySubscribers(
                req,
                res,
                next
            );

            expect(communityModel.isUserCommunityOwner).toHaveBeenCalledWith(
                3,
                1
            );
            expect(
                supportSubscriptionModel.getCommunitySubscribers
            ).toHaveBeenCalledWith(1, { limit: 10, offset: 0 });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: {
                    total: 1,
                    page: 1,
                    limit: 10, // This might also need to be updated to 10
                    results: expect.arrayContaining([
                        expect.objectContaining({
                            id: 5,
                            user_id: 3,
                            community_id: 1,
                        }),
                    ]),
                },
            });
        });

        it("should handle custom pagination parameters", async () => {
            req.query.page = "2";
            req.query.limit = "5";

            await supportSubscriptionController.getCommunitySubscribers(
                req,
                res,
                next
            );

            expect(
                supportSubscriptionModel.getCommunitySubscribers
            ).toHaveBeenCalledWith(1, { limit: 5, offset: 5 });
        });

        it("should return 403 if user is not community owner", async () => {
            communityModel.isUserCommunityOwner.mockResolvedValue(false);

            await supportSubscriptionController.getCommunitySubscribers(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only community owners can view subscribers",
                403
            );
        });

        it("should handle validation errors", async () => {
            const validationError = { msg: "Community ID must be an integer" };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportSubscriptionController.getCommunitySubscribers(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });
    });

    describe("cancelSubscription", () => {
        it("should cancel subscription at period end by default", async () => {
            await supportSubscriptionController.cancelSubscription(
                req,
                res,
                next
            );

            expect(
                supportSubscriptionModel.getSubscriptionById
            ).toHaveBeenCalledWith(5);
            expect(
                paymentService.cancelStripeSubscription
            ).toHaveBeenCalledWith("sub_123456789", true);

            expect(
                supportSubscriptionModel.cancelSubscription
            ).toHaveBeenCalledWith(5, true);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                message:
                    "Subscription will cancel at the end of the current billing period",
                data: expect.any(Object),
            });
        });

        it("should cancel subscription immediately if specified", async () => {
            req.body.cancelAtPeriodEnd = false;

            await supportSubscriptionController.cancelSubscription(
                req,
                res,
                next
            );

            expect(
                paymentService.cancelStripeSubscription
            ).toHaveBeenCalledWith("sub_123456789", false);

            expect(
                supportSubscriptionModel.cancelSubscription
            ).toHaveBeenCalledWith(5, false);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Subscription has been canceled immediately",
                })
            );
        });

        it("should return 404 if subscription not found", async () => {
            supportSubscriptionModel.getSubscriptionById.mockResolvedValue(
                null
            );

            await supportSubscriptionController.cancelSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Subscription not found",
                404
            );
        });

        it("should return 403 if user does not own the subscription", async () => {
            supportSubscriptionModel.getSubscriptionById.mockResolvedValue({
                id: 5,
                user_id: 999, // Different user
                provider_subscription_id: "sub_123456789",
            });

            await supportSubscriptionController.cancelSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "You can only cancel your own subscriptions",
                403
            );
        });

        it("should return 400 if subscription is already canceled", async () => {
            supportSubscriptionModel.getSubscriptionById.mockResolvedValue({
                id: 5,
                user_id: 3,
                status: "canceled",
                provider_subscription_id: "sub_123456789",
            });

            await supportSubscriptionController.cancelSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This subscription is already canceled",
                400
            );
        });

        it("should return 400 if subscription already has cancel_at_period_end", async () => {
            supportSubscriptionModel.getSubscriptionById.mockResolvedValue({
                id: 5,
                user_id: 3,
                status: "active",
                cancel_at_period_end: true,
                provider_subscription_id: "sub_123456789",
            });

            await supportSubscriptionController.cancelSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This subscription is already canceled",
                400
            );
        });

        it("should handle Stripe errors", async () => {
            const stripeError = new Error("Stripe API error");
            paymentService.cancelStripeSubscription.mockRejectedValue(
                stripeError
            );

            await supportSubscriptionController.cancelSubscription(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Payment provider error during cancellation",
                500
            );
        });
    });

    describe("getPaymentHistory", () => {
        it("should get payment history for user's own subscription", async () => {
            await supportSubscriptionController.getPaymentHistory(
                req,
                res,
                next
            );

            expect(
                supportSubscriptionModel.getSubscriptionById
            ).toHaveBeenCalledWith(5);
            expect(
                supportSubscriptionModel.getPaymentHistory
            ).toHaveBeenCalledWith(5, { limit: 10, offset: 0 });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: {
                    subscription: expect.objectContaining({
                        id: 5,
                        status: "active",
                    }),
                    payments: expect.arrayContaining([
                        expect.objectContaining({
                            id: 10,
                            support_id: 5,
                        }),
                    ]),
                },
            });
        });

        it("should allow community owner to view payment history", async () => {
            // Subscription is for a different user
            supportSubscriptionModel.getSubscriptionById.mockResolvedValue({
                id: 5,
                user_id: 999, // Not the requester
                community_id: 1,
                status: "active",
            });

            await supportSubscriptionController.getPaymentHistory(
                req,
                res,
                next
            );

            // Should check if requester is community owner
            expect(communityModel.isUserCommunityOwner).toHaveBeenCalledWith(
                3,
                1
            );
            expect(
                supportSubscriptionModel.getPaymentHistory
            ).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("should return 403 if not subscription owner or community owner", async () => {
            // Subscription is for a different user
            supportSubscriptionModel.getSubscriptionById.mockResolvedValue({
                id: 5,
                user_id: 999, // Not the requester
                community_id: 1,
                status: "active",
            });

            // Not the community owner either
            communityModel.isUserCommunityOwner.mockResolvedValue(false);

            await supportSubscriptionController.getPaymentHistory(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "You can only view your own payment history",
                403
            );
        });

        it("should return 404 if subscription not found", async () => {
            supportSubscriptionModel.getSubscriptionById.mockResolvedValue(
                null
            );

            await supportSubscriptionController.getPaymentHistory(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Subscription not found",
                404
            );
        });

        it("should handle custom pagination parameters", async () => {
            req.query.page = "2";
            req.query.limit = "5";

            await supportSubscriptionController.getPaymentHistory(
                req,
                res,
                next
            );

            expect(
                supportSubscriptionModel.getPaymentHistory
            ).toHaveBeenCalledWith(5, { limit: 5, offset: 5 });
        });

        it("should handle validation errors", async () => {
            const validationError = {
                msg: "Subscription ID must be an integer",
            };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportSubscriptionController.getPaymentHistory(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });
    });
});
