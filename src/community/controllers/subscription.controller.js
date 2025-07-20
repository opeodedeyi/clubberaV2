// src/community/controllers/subscription.controller.js

const communityModel = require("../models/community.model");
const subscriptionModel = require("../models/subscription.model");
const subscriptionPlanModel = require("../models/subscriptionPlan.model");
const subscriptionPaymentModel = require("../models/subscriptionPayment.model");
const ApiError = require("../../utils/ApiError");

class SubscriptionController {
    async getCommunitySubscription(req, res, next) {
        try {
            const communityId = req.params.id;
            const userId = req.user.id;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if user has permission (only members can view)
            const isMember = await communityModel.checkMemberRole(
                communityId,
                userId,
                ["owner", "organizer", "moderator", "member"]
            );

            if (!isMember) {
                return next(
                    new ApiError(
                        "You do not have permission to view subscription details",
                        403
                    )
                );
            }

            // Get subscription with plan details
            const subscription = await subscriptionModel.getByCommunityFull(
                communityId
            );
            if (!subscription) {
                return next(
                    new ApiError(
                        "No subscription found for this community",
                        404
                    )
                );
            }

            res.json({
                status: "success",
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    async getSubscriptionPlans(req, res, next) {
        try {
            const plans = await subscriptionPlanModel.getAllActivePlans();

            res.json({
                status: "success",
                data: plans,
            });
        } catch (error) {
            next(error);
        }
    }

    async upgradeToPro(req, res, next) {
        try {
            const communityId = req.params.id;
            const userId = req.user.id;
            const { plan_code, payment_details } = req.body;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if user is the owner
            const isOwner = await communityModel.checkMemberRole(
                communityId,
                userId,
                "owner"
            );
            if (!isOwner) {
                return next(
                    new ApiError(
                        "Only the community owner can upgrade the subscription",
                        403
                    )
                );
            }

            // In a real application, this is where you'd integrate with a payment provider
            // For now, we'll just upgrade the subscription directly

            // Upgrade to pro
            const subscription = await subscriptionModel.upgradeToPro(
                communityId,
                plan_code || "pro_monthly",
                userId,
                payment_details || {}
            );

            res.json({
                status: "success",
                message: "Community upgraded to Pro plan",
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    async downgradeToFree(req, res, next) {
        try {
            const communityId = req.params.id;
            const userId = req.user.id;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if user is the owner
            const isOwner = await communityModel.checkMemberRole(
                communityId,
                userId,
                "owner"
            );
            if (!isOwner) {
                return next(
                    new ApiError(
                        "Only the community owner can change the subscription",
                        403
                    )
                );
            }

            // Downgrade to free
            const subscription = await subscriptionModel.downgradeToFree(
                communityId
            );

            res.json({
                status: "success",
                message: "Community downgraded to Free plan",
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    async cancelSubscription(req, res, next) {
        try {
            const communityId = req.params.id;
            const userId = req.user.id;
            const { at_period_end = true } = req.body;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if user is the owner
            const isOwner = await communityModel.checkMemberRole(
                communityId,
                userId,
                "owner"
            );
            if (!isOwner) {
                return next(
                    new ApiError(
                        "Only the community owner can cancel the subscription",
                        403
                    )
                );
            }

            // Cancel subscription
            const subscription = await subscriptionModel.cancelSubscription(
                communityId,
                at_period_end
            );

            res.json({
                status: "success",
                message: at_period_end
                    ? "Subscription will be canceled at the end of the billing period"
                    : "Subscription canceled immediately",
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    async getPaymentHistory(req, res, next) {
        try {
            const communityId = req.params.id;
            const userId = req.user.id;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if user is the owner
            const isOwner = await communityModel.checkMemberRole(
                communityId,
                userId,
                "owner"
            );
            if (!isOwner) {
                return next(
                    new ApiError(
                        "Only the community owner can view payment history",
                        403
                    )
                );
            }

            // Get payment history
            const options = {
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0,
            };

            const payments = await subscriptionPaymentModel.getByCommunityId(
                communityId,
                options
            );
            const count = await subscriptionPaymentModel.countBySubscriptionId(
                communityId
            );

            res.json({
                status: "success",
                data: payments,
                pagination: {
                    total: count,
                    limit: options.limit,
                    offset: options.offset,
                    hasMore: options.offset + payments.length < count,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async createFreeSubscription(communityId, userId) {
        try {
            return await subscriptionModel.createFreeSubscription(
                communityId,
                userId
            );
        } catch (error) {
            console.error("Error creating free subscription:", error);
            throw error;
        }
    }
}

module.exports = new SubscriptionController();
