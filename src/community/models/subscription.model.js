// src/community/models/subscription.model.js

const db = require("../../config/db");
const subscriptionPlanModel = require("./subscriptionPlan.model");

class SubscriptionModel {
    async create(data) {
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

    async createFreeSubscription(communityId, userId) {
        // Get the free plan
        const freePlan = await subscriptionPlanModel.getFreePlan();
        if (!freePlan) {
            throw new Error("Free plan not found");
        }

        return this.create({
            community_id: communityId,
            plan_id: freePlan.id,
            status: "active",
            created_by: userId,
        });
    }

    async getByCommunitySummary(communityId) {
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

    async getByCommunityFull(communityId) {
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

    async getActiveSubscription(communityId) {
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

    async hasProSubscription(communityId) {
        const subscription = await this.getActiveSubscription(communityId);

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

    async update(subscriptionId, data) {
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
            return this.getById(subscriptionId);
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

    async getById(subscriptionId) {
        const query = `
            SELECT * FROM community_subscriptions
            WHERE id = $1
        `;

        const result = await db.query(query, [subscriptionId]);
        return result.rows[0] || null;
    }

    async changePlan(communityId, planId, options = {}) {
        const {
            status = "active",
            current_period_start = new Date(),
            current_period_end = null,
            provider = null,
            provider_subscription_id = null,
        } = options;

        // Get the current subscription
        const currentSubscription = await this.getByCommunitySummary(
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

    async upgradeToPro(communityId, planCode, userId, paymentDetails = {}) {
        // Get the pro plan
        const proPlan = await subscriptionPlanModel.getByCode(
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
        const updatedSubscription = await this.changePlan(
            communityId,
            proPlan.id,
            {
                current_period_start: now,
                current_period_end: periodEnd,
                provider: paymentDetails.provider,
                provider_subscription_id:
                    paymentDetails.provider_subscription_id,
            }
        );

        // Create payment record if amount is provided
        if (paymentDetails.amount) {
            await this.recordPayment({
                subscription_id: updatedSubscription.id,
                amount: paymentDetails.amount,
                currency: paymentDetails.currency || proPlan.currency,
                payment_method: paymentDetails.payment_method,
                payment_provider: paymentDetails.provider,
                provider_transaction_id: paymentDetails.provider_transaction_id,
                status: paymentDetails.status || "succeeded",
                billing_period_start: now,
                billing_period_end: periodEnd,
            });
        }

        return updatedSubscription;
    }

    async downgradeToFree(communityId) {
        // Get the free plan
        const freePlan = await subscriptionPlanModel.getFreePlan();
        if (!freePlan) {
            throw new Error("Free plan not found");
        }

        // Change the plan
        return this.changePlan(communityId, freePlan.id, {
            current_period_end: null,
        });
    }

    async recordPayment(data) {
        const {
            subscription_id,
            amount,
            currency = "USD",
            payment_method,
            payment_provider,
            provider_transaction_id,
            status = "succeeded",
            billing_period_start,
            billing_period_end,
        } = data;

        const query = `
            INSERT INTO subscription_payments (
                subscription_id, amount, currency, payment_method,
                payment_provider, provider_transaction_id, status,
                billing_period_start, billing_period_end
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const result = await db.query(query, [
            subscription_id,
            amount,
            currency,
            payment_method,
            payment_provider,
            provider_transaction_id,
            status,
            billing_period_start,
            billing_period_end,
        ]);

        return result.rows[0];
    }

    async getPaymentHistory(subscriptionId) {
        const query = `
            SELECT * FROM subscription_payments
            WHERE subscription_id = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [subscriptionId]);
        return result.rows;
    }

    async cancelSubscription(communityId, atPeriodEnd = true) {
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
}

module.exports = new SubscriptionModel();
