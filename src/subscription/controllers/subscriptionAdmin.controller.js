const subscriptionPlanModel = require("../models/subscriptionPlan.model");
const subscriptionModel = require("../models/subscription.model");
const ApiError = require("../../utils/ApiError");

class SubscriptionAdminController {
    async getAllSubscriptionPlans(req, res, next) {
        try {
            // Get all plans including inactive ones for admins
            const query = `
                SELECT * FROM subscription_plans
                ORDER BY price ASC, name ASC
            `;

            const result = await db.query(query);

            res.json({
                status: "success",
                data: result.rows,
            });
        } catch (error) {
            next(error);
        }
    }

    async getSubscriptionPlanById(req, res, next) {
        try {
            const planId = req.params.id;

            const plan = await subscriptionPlanModel.getSubscriptionPlanById(
                planId
            );
            if (!plan) {
                return next(new ApiError("Subscription plan not found", 404));
            }

            res.json({
                status: "success",
                data: plan,
            });
        } catch (error) {
            next(error);
        }
    }

    async createSubscriptionPlan(req, res, next) {
        try {
            const data = req.body;

            // Check if plan code already exists
            const existingPlan =
                await subscriptionPlanModel.getSubscriptionPlanByCode(
                    data.code
                );
            if (existingPlan) {
                return next(
                    new ApiError("A plan with this code already exists", 400)
                );
            }

            const plan = await subscriptionPlanModel.createSubscriptionPlan(
                data
            );

            res.status(201).json({
                status: "success",
                message: "Subscription plan created successfully",
                data: plan,
            });
        } catch (error) {
            next(error);
        }
    }

    async updateSubscriptionPlan(req, res, next) {
        try {
            const planId = req.params.id;
            const data = req.body;

            // Check if plan exists
            const plan = await subscriptionPlanModel.getSubscriptionPlanById(
                planId
            );
            if (!plan) {
                return next(new ApiError("Subscription plan not found", 404));
            }

            // Prevent updating the free plan code
            if (plan.code === "free" && data.code && data.code !== "free") {
                return next(
                    new ApiError("Cannot change the code of the free plan", 400)
                );
            }

            const updatedPlan =
                await subscriptionPlanModel.updateSubscriptionPlan(
                    planId,
                    data
                );

            res.json({
                status: "success",
                message: "Subscription plan updated successfully",
                data: updatedPlan,
            });
        } catch (error) {
            next(error);
        }
    }

    async updateSubscriptionPlanPrice(req, res, next) {
        try {
            const planId = req.params.id;
            const { price, currency } = req.body;

            // Check if plan exists
            const plan = await subscriptionPlanModel.getSubscriptionPlanById(
                planId
            );
            if (!plan) {
                return next(new ApiError("Subscription plan not found", 404));
            }

            // Prevent updating the free plan price to non-zero
            if (plan.code === "free" && parseFloat(price) > 0) {
                return next(
                    new ApiError("Free plan must have zero price", 400)
                );
            }

            const updatedPlan =
                await subscriptionPlanModel.updateSubscriptionPlanPrice(
                    planId,
                    price,
                    currency
                );

            res.json({
                status: "success",
                message: "Subscription plan price updated successfully",
                data: updatedPlan,
            });
        } catch (error) {
            next(error);
        }
    }

    async getSubscriptionPlanPriceHistory(req, res, next) {
        try {
            const planId = req.params.id;

            // Check if plan exists
            const plan = await subscriptionPlanModel.getSubscriptionPlanById(
                planId
            );
            if (!plan) {
                return next(new ApiError("Subscription plan not found", 404));
            }

            const history =
                await subscriptionPlanModel.getSubscriptionPlanPriceHistory(
                    planId
                );

            res.json({
                status: "success",
                data: history,
            });
        } catch (error) {
            next(error);
        }
    }

    async toggleSubscriptionPlanStatus(req, res, next) {
        try {
            const planId = req.params.id;
            const { activate } = req.body;

            // Check if plan exists
            const plan = await subscriptionPlanModel.getSubscriptionPlanById(
                planId
            );
            if (!plan) {
                return next(new ApiError("Subscription plan not found", 404));
            }

            // Prevent deactivating the free plan
            if (plan.code === "free" && !activate) {
                return next(
                    new ApiError("Cannot deactivate the free plan", 400)
                );
            }

            let updatedPlan;
            if (activate) {
                updatedPlan =
                    await subscriptionPlanModel.activateSubscriptionPlan(
                        planId
                    );
            } else {
                updatedPlan =
                    await subscriptionPlanModel.deactivateSubscriptionPlan(
                        planId
                    );
            }

            res.json({
                status: "success",
                message: `Subscription plan ${
                    activate ? "activated" : "deactivated"
                } successfully`,
                data: updatedPlan,
            });
        } catch (error) {
            next(error);
        }
    }

    async offerPromotionalSubscription(req, res, next) {
        try {
            const communityId = req.params.communityId;
            const { duration_months } = req.body;
            const adminUserId = req.user.id;

            // Validate duration
            if (
                !duration_months ||
                duration_months < 1 ||
                duration_months > 12
            ) {
                return next(
                    new ApiError(
                        "Duration must be between 1 and 12 months",
                        400
                    )
                );
            }

            // Check if community exists
            const communityQuery = `SELECT * FROM communities WHERE id = $1 AND is_active = true`;
            const communityResult = await db.query(communityQuery, [
                communityId,
            ]);

            if (communityResult.rows.length === 0) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Offer the promotional subscription
            const subscription =
                await subscriptionModel.offerPromotionalProSubscription(
                    communityId,
                    duration_months,
                    adminUserId
                );

            res.json({
                status: "success",
                message: `Promotional ${duration_months}-month Pro subscription offered successfully`,
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    async listSubscriptionsByPlan(req, res, next) {
        try {
            const { plan_code } = req.params;
            const { limit = 50, offset = 0, active = true } = req.query;

            // Check if plan exists
            const plan = await subscriptionPlanModel.getSubscriptionPlanByCode(
                plan_code
            );
            if (!plan) {
                return next(new ApiError("Subscription plan not found", 404));
            }

            const subscriptions =
                await subscriptionModel.listCommunitiesWithSubscriptionType(
                    plan_code,
                    {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        active: active === "true" || active === true,
                    }
                );

            // Get total count
            const countQuery = `
                SELECT COUNT(*) FROM communities c
                JOIN community_subscriptions cs ON c.id = cs.community_id
                JOIN subscription_plans sp ON cs.plan_id = sp.id
                WHERE sp.code = $1
                ${active ? "AND cs.status = 'active'" : ""}
            `;

            const countResult = await db.query(countQuery, [plan_code]);
            const total = parseInt(countResult.rows[0].count);

            res.json({
                status: "success",
                data: subscriptions,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + subscriptions.length,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SubscriptionAdminController();
