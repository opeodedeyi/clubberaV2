// src/communitySupport/models/supportSubscription.model.js
const db = require("../../config/db");

class SupportSubscriptionModel {
    async createSubscription(subscriptionData) {
        const {
            userId,
            communityId,
            planId,
            status,
            currentPeriodEnd,
            provider,
            providerSubscriptionId,
        } = subscriptionData;

        const query = `
            INSERT INTO user_community_supports (
                user_id, community_id, plan_id, status,
                current_period_start, current_period_end, 
                provider, provider_subscription_id
            )
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            userId,
            communityId,
            planId,
            status,
            currentPeriodEnd,
            provider,
            providerSubscriptionId,
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getUserCommunitySubscription(userId, communityId) {
        const query = `
            SELECT ucs.*, csp.name as plan_name, csp.monthly_price, csp.currency
            FROM user_community_supports ucs
            JOIN community_support_plans csp ON ucs.plan_id = csp.id
            WHERE ucs.user_id = $1 
            AND ucs.community_id = $2
            AND (ucs.status = 'active' OR ucs.status = 'past_due')
        `;

        const result = await db.query(query, [userId, communityId]);
        return result.rows[0] || null;
    }

    async getUserActiveSubscriptions(userId) {
        const query = `
            SELECT 
                ucs.*, 
                csp.name as plan_name, 
                csp.monthly_price, 
                csp.currency,
                c.name as community_name,
                c.unique_url as community_url
            FROM user_community_supports ucs
            JOIN community_support_plans csp ON ucs.plan_id = csp.id
            JOIN communities c ON ucs.community_id = c.id
            WHERE ucs.user_id = $1 
            AND (ucs.status = 'active' OR ucs.status = 'past_due')
            ORDER BY ucs.created_at DESC
        `;

        const result = await db.query(query, [userId]);
        return result.rows;
    }

    async getCommunitySubscribers(communityId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM user_community_supports
            WHERE community_id = $1 
            AND (status = 'active' OR status = 'past_due')
        `;

        const dataQuery = `
            SELECT 
                ucs.*, 
                u.full_name, 
                u.email
            FROM user_community_supports ucs
            JOIN users u ON ucs.user_id = u.id
            WHERE ucs.community_id = $1 
            AND (ucs.status = 'active' OR ucs.status = 'past_due')
            ORDER BY ucs.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, dataResult] = await Promise.all([
            db.query(countQuery, [communityId]),
            db.query(dataQuery, [communityId, limit, offset]),
        ]);

        return {
            total: parseInt(countResult.rows[0].total, 10),
            results: dataResult.rows,
        };
    }

    async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
        const query = `
            UPDATE user_community_supports
            SET 
                ${
                    cancelAtPeriodEnd
                        ? `
                cancel_at_period_end = true,
                canceled_at = CURRENT_TIMESTAMP
                `
                        : `
                status = 'canceled',
                canceled_at = CURRENT_TIMESTAMP
                `
                },
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [subscriptionId]);
        return result.rows[0];
    }

    async getSubscriptionById(subscriptionId) {
        const query = `
        SELECT * FROM user_community_supports
        WHERE id = $1
        `;

        const result = await db.query(query, [subscriptionId]);
        return result.rows[0] || null;
    }

    async updateSubscription(subscriptionId, updateData) {
        const allowedFields = [
            "status",
            "current_period_start",
            "current_period_end",
            "provider_subscription_id",
        ];

        // Filter update data to only include allowed fields
        const updates = Object.keys(updateData)
            .filter((key) => allowedFields.includes(key))
            .map((key, index) => `${key} = $${index + 2}`);

        if (updates.length === 0) {
            return this.getSubscriptionById(subscriptionId);
        }

        const query = `
            UPDATE user_community_supports
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const values = [subscriptionId, ...Object.values(updateData)];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async recordPayment(paymentData) {
        const {
            supportId,
            amount,
            currency,
            paymentMethod,
            paymentProvider,
            providerTransactionId,
            status,
            billingPeriodStart,
            billingPeriodEnd,
        } = paymentData;

        const query = `
            INSERT INTO community_support_payments (
                support_id, amount, currency, payment_method,
                payment_provider, provider_transaction_id, status,
                billing_period_start, billing_period_end
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            supportId,
            amount,
            currency,
            paymentMethod,
            paymentProvider,
            providerTransactionId,
            status,
            billingPeriodStart,
            billingPeriodEnd,
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getPaymentHistory(supportId, options = {}) {
        const { limit = 10, offset = 0 } = options;

        const query = `
            SELECT * FROM community_support_payments
            WHERE support_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [supportId, limit, offset]);
        return result.rows;
    }

    async findByProviderSubscriptionId(provider, providerSubscriptionId) {
        const query = `
            SELECT * FROM user_community_supports
            WHERE provider = $1 AND provider_subscription_id = $2
        `;

        const result = await db.query(query, [
            provider,
            providerSubscriptionId,
        ]);
        return result.rows[0] || null;
    }
}

module.exports = new SupportSubscriptionModel();
