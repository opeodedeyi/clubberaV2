const db = require("../../config/db");
const subscriptionPlanModel = require("./subscriptionPlan.model");

class SubscriptionModel {
    async createCommunitySubscription(data) {
        const {
            community_id,
            plan_id,
            status = "active",
            starts_at = new Date(),
            current_period_start = new Date(),
            current_period_end,
            provider = null,
            provider_subscription_id = null,
            created_by,
        } = data;

        const query = `
            INSERT INTO community_subscriptions (
                community_id, plan_id, status, starts_at, current_period_start,
                current_period_end, provider, provider_subscription_id, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const result = await db.query(query, [
            community_id,
            plan_id,
            status,
            starts_at,
            current_period_start,
            current_period_end,
            provider,
            provider_subscription_id,
            created_by,
        ]);

        return result.rows[0];
    }

    async createFreeCommunitySubscription(communityId, userId) {
        // Get the free plan
        const freePlan = await subscriptionPlanModel.getFreePlan();
        if (!freePlan) {
            throw new Error("Free plan not found");
        }

        return this.createCommunitySubscription({
            community_id: communityId,
            plan_id: freePlan.id,
            status: "active",
            created_by: userId,
        });
    }

    async getCommunitySubscriptionSummary(communityId) {
        const query = `
            SELECT 
                cs.id, cs.community_id, cs.status, cs.starts_at, 
                cs.current_period_start, cs.current_period_end,
                sp.id as plan_id, sp.name as plan_name, sp.code as plan_code,
                sp.price, sp.currency, sp.billing_interval,
                sp.features
            FROM community_subscriptions cs
            JOIN subscription_plans sp ON cs.plan_id = sp.id
            WHERE cs.community_id = $1
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0] || null;
    }

    async getCommunitySubscriptionDetails(communityId) {
        const query = `
            SELECT 
                cs.*, 
                sp.name as plan_name, sp.code as plan_code,
                sp.price, sp.currency, sp.billing_interval,
                sp.features
            FROM community_subscriptions cs
            JOIN subscription_plans sp ON cs.plan_id = sp.id
            WHERE cs.community_id = $1
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0] || null;
    }

    async getActiveCommunitySubscription(communityId) {
        const query = `
            SELECT 
                cs.*, 
                sp.name as plan_name, sp.code as plan_code,
                sp.features
            FROM community_subscriptions cs
            JOIN subscription_plans sp ON cs.plan_id = sp.id
            WHERE cs.community_id = $1 
            AND cs.status = 'active'
            AND (cs.current_period_end IS NULL OR cs.current_period_end > CURRENT_TIMESTAMP)
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0] || null;
    }

    async checkCommunityHasProFeatures(communityId) {
        const subscription = await this.getActiveCommunitySubscription(
            communityId
        );

        if (!subscription) {
            return false;
        }

        // Check if plan has pro features
        try {
            const features =
                typeof subscription.features === "string"
                    ? JSON.parse(subscription.features)
                    : subscription.features;

            return features && features.pro_features === true;
        } catch (error) {
            console.error("Error parsing plan features:", error);
            return false;
        }
    }

    async updateCommunitySubscription(subscriptionId, data) {
        const allowedFields = [
            "plan_id",
            "status",
            "current_period_start",
            "current_period_end",
            "canceled_at",
            "cancel_at_period_end",
            "provider",
            "provider_subscription_id",
        ];

        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

        // Build SET clause for allowed fields
        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key)) {
                setValues.push(`${key} = $${paramIndex++}`);
                queryParams.push(value);
            }
        }

        // Add updated_at timestamp
        setValues.push(`updated_at = $${paramIndex++}`);
        queryParams.push(new Date());

        // No fields to update
        if (setValues.length === 1) {
            // Only updated_at was added
            return this.getSubscriptionById(subscriptionId);
        }

        // Add subscription ID to params
        queryParams.push(subscriptionId);

        const query = `
            UPDATE community_subscriptions
            SET ${setValues.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, queryParams);
        return result.rows[0] || null;
    }

    async getSubscriptionById(subscriptionId) {
        const query = `
            SELECT * FROM community_subscriptions
            WHERE id = $1
        `;

        const result = await db.query(query, [subscriptionId]);
        return result.rows[0] || null;
    }

    async changeCommunitySubscriptionPlan(communityId, planId, options = {}) {
        const {
            status = "active",
            current_period_start = new Date(),
            current_period_end = null,
            provider = null,
            provider_subscription_id = null,
        } = options;

        // Get the current subscription
        const currentSubscription = await this.getCommunitySubscriptionSummary(
            communityId
        );
        if (!currentSubscription) {
            throw new Error("No subscription found for this community");
        }

        // Update the subscription
        const query = `
            UPDATE community_subscriptions
            SET 
                plan_id = $1,
                status = $2,
                current_period_start = $3,
                current_period_end = $4,
                provider = $5,
                provider_subscription_id = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE community_id = $7
            RETURNING *
        `;

        const result = await db.query(query, [
            planId,
            status,
            current_period_start,
            current_period_end,
            provider,
            provider_subscription_id,
            communityId,
        ]);

        return result.rows[0];
    }

    async offerPromotionalProSubscription(
        communityId,
        durationMonths,
        adminUserId
    ) {
        // Get pro monthly plan
        const proPlan = await subscriptionPlanModel.getSubscriptionPlanByCode(
            "pro_monthly"
        );
        if (!proPlan) {
            throw new Error("Pro plan not found");
        }

        // Calculate period end date
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

        // Change the plan
        return this.changeCommunitySubscriptionPlan(communityId, proPlan.id, {
            current_period_start: now,
            current_period_end: periodEnd,
            provider: "promotional",
            provider_subscription_id: `promo-${Date.now()}-${adminUserId}`,
        });
    }

    async upgradeCommunityToPro(
        communityId,
        planCode,
        userId,
        paymentDetails = {}
    ) {
        // Get the pro plan
        const proPlan = await subscriptionPlanModel.getSubscriptionPlanByCode(
            planCode || "pro_monthly"
        );
        if (!proPlan) {
            throw new Error("Pro plan not found");
        }

        // Calculate period end date based on billing interval
        let periodEnd = null;
        const now = new Date();

        if (proPlan.billing_interval === "monthly") {
            periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else if (proPlan.billing_interval === "yearly") {
            periodEnd = new Date(now);
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        // Change the plan
        return this.changeCommunitySubscriptionPlan(communityId, proPlan.id, {
            current_period_start: now,
            current_period_end: periodEnd,
            provider: paymentDetails.provider,
            provider_subscription_id: paymentDetails.provider_subscription_id,
        });
    }

    async downgradeCommunityToFree(communityId) {
        // Get the free plan
        const freePlan = await subscriptionPlanModel.getFreePlan();
        if (!freePlan) {
            throw new Error("Free plan not found");
        }

        // Change the plan
        return this.changeCommunitySubscriptionPlan(communityId, freePlan.id, {
            current_period_end: null,
        });
    }

    async cancelCommunitySubscription(communityId, atPeriodEnd = true) {
        const query = `
            UPDATE community_subscriptions
            SET 
                ${
                    atPeriodEnd
                        ? "cancel_at_period_end = true"
                        : "status = 'canceled'"
                },
                canceled_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE community_id = $1
            RETURNING *
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0];
    }

    async listCommunitiesWithSubscriptionType(planCode, options = {}) {
        const { limit = 50, offset = 0, active = true } = options;

        const query = `
            SELECT 
                c.id, c.name, c.unique_url, c.is_private,
                cs.id as subscription_id, cs.status, cs.current_period_end,
                sp.name as plan_name, sp.code as plan_code
            FROM communities c
            JOIN community_subscriptions cs ON c.id = cs.community_id
            JOIN subscription_plans sp ON cs.plan_id = sp.id
            WHERE sp.code = $1
            ${active ? "AND cs.status = 'active'" : ""}
            ORDER BY cs.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [planCode, limit, offset]);
        return result.rows;
    }
}

module.exports = new SubscriptionModel();
