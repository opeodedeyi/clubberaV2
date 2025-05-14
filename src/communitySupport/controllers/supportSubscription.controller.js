// src/communitySupport/controllers/supportSubscription.controller.js
const { validationResult } = require("express-validator");
const supportSubscriptionModel = require("../models/supportSubscription.model");
const supportPlanModel = require("../models/supportPlan.model");
const communityModel = require("../models/community.model");
const paymentService = require("../../services/payment.service");
const ApiError = require("../../utils/ApiError");

class SupportSubscriptionController {
    async createSubscription(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const communityId = parseInt(req.params.communityId, 10);
            const userId = req.user.id;
            const { paymentMethodId, paymentProvider } = req.body;

            // Check if community exists
            const communityExists = await communityModel.communityExists(
                communityId
            );
            if (!communityExists) {
                return next(new ApiError("Community not found", 404));
            }

            // Check if community has a support plan
            const supportPlan = await supportPlanModel.getPlanByCommunityId(
                communityId
            );
            if (!supportPlan || !supportPlan.is_active) {
                return next(
                    new ApiError(
                        "This community does not have an active support plan",
                        404
                    )
                );
            }

            // Check if user is already supporting this community
            const existingSubscription =
                await supportSubscriptionModel.getUserCommunitySubscription(
                    userId,
                    communityId
                );

            if (existingSubscription) {
                return next(
                    new ApiError(
                        "You are already supporting this community",
                        400
                    )
                );
            }

            let subscriptionData = null;

            // Process payment based on provider
            if (paymentProvider === "stripe") {
                try {
                    // Get or create Stripe customer
                    const customer =
                        await paymentService.getOrCreateStripeCustomer({
                            email: req.user.email,
                            name: req.user.full_name,
                            userId,
                        });

                    // Get or create Stripe product and price
                    const { price } =
                        await paymentService.getOrCreateStripePlanProducts({
                            communityId,
                            planId: supportPlan.id,
                            planName: supportPlan.name,
                            description: supportPlan.description,
                            amount: parseFloat(supportPlan.monthly_price),
                            currency: supportPlan.currency.toLowerCase(),
                        });

                    // Create Stripe subscription
                    const stripeSubscription =
                        await paymentService.createStripeSubscription({
                            customerId: customer.id,
                            paymentMethodId,
                            priceId: price.id,
                            metadata: {
                                userId: userId.toString(),
                                communityId: communityId.toString(),
                                planId: supportPlan.id.toString(),
                            },
                        });

                    // Calculate period end date
                    const currentPeriodEnd = new Date(
                        stripeSubscription.current_period_end * 1000
                    );

                    // Prepare subscription data
                    subscriptionData = {
                        userId,
                        communityId,
                        planId: supportPlan.id,
                        status: stripeSubscription.status,
                        currentPeriodEnd,
                        provider: "stripe",
                        providerSubscriptionId: stripeSubscription.id,
                    };
                } catch (error) {
                    console.error("Stripe subscription error:", error);
                    return next(new ApiError("Payment processing failed", 500));
                }
            } else if (paymentProvider === "paypal") {
                // PayPal integration would be implemented here
                return next(
                    new ApiError("PayPal integration not implemented yet", 501)
                );
            } else {
                return next(new ApiError("Unsupported payment provider", 400));
            }

            // Create subscription record
            const subscription =
                await supportSubscriptionModel.createSubscription(
                    subscriptionData
                );

            res.status(201).json({
                status: "success",
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    async getSubscription(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const communityId = parseInt(req.params.communityId, 10);
            const userId = req.user.id;

            // Get subscription
            const subscription =
                await supportSubscriptionModel.getUserCommunitySubscription(
                    userId,
                    communityId
                );

            if (!subscription) {
                return next(
                    new ApiError("You are not supporting this community", 404)
                );
            }

            res.status(200).json({
                status: "success",
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserSubscriptions(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const userId = req.user.id;

            // Get subscriptions
            const subscriptions =
                await supportSubscriptionModel.getUserActiveSubscriptions(
                    userId
                );

            res.status(200).json({
                status: "success",
                data: subscriptions,
            });
        } catch (error) {
            next(error);
        }
    }

    async getCommunitySubscribers(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const communityId = parseInt(req.params.communityId, 10);
            const userId = req.user.id;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const offset = (page - 1) * limit;

            // Check if user is a community organizer or owner
            const isCommunityOwner = await communityModel.isUserCommunityOwner(
                userId,
                communityId
            );

            if (!isCommunityOwner) {
                return next(
                    new ApiError(
                        "Only community owners can view subscribers",
                        403
                    )
                );
            }

            // Get subscribers
            const subscribers =
                await supportSubscriptionModel.getCommunitySubscribers(
                    communityId,
                    { limit, offset }
                );

            res.status(200).json({
                status: "success",
                data: {
                    total: subscribers.total,
                    page,
                    limit,
                    results: subscribers.results,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async cancelSubscription(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const subscriptionId = parseInt(req.params.subscriptionId, 10);
            const userId = req.user.id;
            const cancelAtPeriodEnd = req.body.cancelAtPeriodEnd !== false; // Default to true

            // Get subscription
            const subscription =
                await supportSubscriptionModel.getSubscriptionById(
                    subscriptionId
                );

            if (!subscription) {
                return next(new ApiError("Subscription not found", 404));
            }

            // Check if user owns this subscription
            if (subscription.user_id !== userId) {
                return next(
                    new ApiError(
                        "You can only cancel your own subscriptions",
                        403
                    )
                );
            }

            // If subscription is already canceled, return error
            if (
                subscription.status === "canceled" ||
                subscription.cancel_at_period_end
            ) {
                return next(
                    new ApiError("This subscription is already canceled", 400)
                );
            }

            // If using a payment provider, cancel there first
            if (
                subscription.provider === "stripe" &&
                subscription.provider_subscription_id
            ) {
                try {
                    await paymentService.cancelStripeSubscription(
                        subscription.provider_subscription_id,
                        cancelAtPeriodEnd
                    );
                } catch (error) {
                    console.error("Stripe cancellation error:", error);
                    return next(
                        new ApiError(
                            "Payment provider error during cancellation",
                            500
                        )
                    );
                }
            }

            // Update subscription in database
            const updatedSubscription =
                await supportSubscriptionModel.cancelSubscription(
                    subscriptionId,
                    cancelAtPeriodEnd
                );

            res.status(200).json({
                status: "success",
                message: cancelAtPeriodEnd
                    ? "Subscription will cancel at the end of the current billing period"
                    : "Subscription has been canceled immediately",
                data: updatedSubscription,
            });
        } catch (error) {
            next(error);
        }
    }

    async getPaymentHistory(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const subscriptionId = parseInt(req.params.subscriptionId, 10);
            const userId = req.user.id;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const offset = (page - 1) * limit;

            // Get subscription
            const subscription =
                await supportSubscriptionModel.getSubscriptionById(
                    subscriptionId
                );

            if (!subscription) {
                return next(new ApiError("Subscription not found", 404));
            }

            // Check if user owns this subscription or is community owner
            if (subscription.user_id !== userId) {
                const isCommunityOwner =
                    await communityModel.isUserCommunityOwner(
                        userId,
                        subscription.community_id
                    );

                if (!isCommunityOwner) {
                    return next(
                        new ApiError(
                            "You can only view your own payment history",
                            403
                        )
                    );
                }
            }

            // Get payment history
            const payments = await supportSubscriptionModel.getPaymentHistory(
                subscriptionId,
                { limit, offset }
            );

            res.status(200).json({
                status: "success",
                data: {
                    subscription: {
                        id: subscription.id,
                        status: subscription.status,
                        created_at: subscription.created_at,
                    },
                    payments,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SupportSubscriptionController();
