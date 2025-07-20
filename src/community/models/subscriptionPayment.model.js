// src/community/models/subscriptionPayment.model.js

const db = require("../../config/db");

class SubscriptionPaymentModel {
    async create(data) {
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

    async getById(paymentId) {
        const query = `
            SELECT * FROM subscription_payments
            WHERE id = $1
        `;

        const result = await db.query(query, [paymentId]);
        return result.rows[0] || null;
    }

    async getByTransactionId(transactionId) {
        const query = `
            SELECT * FROM subscription_payments
            WHERE provider_transaction_id = $1
        `;

        const result = await db.query(query, [transactionId]);
        return result.rows[0] || null;
    }

    async getBySubscriptionId(subscriptionId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const query = `
            SELECT * FROM subscription_payments
            WHERE subscription_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [subscriptionId, limit, offset]);
        return result.rows;
    }

    async getByCommunityId(communityId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const query = `
            SELECT sp.* 
            FROM subscription_payments sp
            JOIN community_subscriptions cs ON sp.subscription_id = cs.id
            WHERE cs.community_id = $1
            ORDER BY sp.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [communityId, limit, offset]);
        return result.rows;
    }

    async countBySubscriptionId(subscriptionId) {
        const query = `
            SELECT COUNT(*) FROM subscription_payments
            WHERE subscription_id = $1
        `;

        const result = await db.query(query, [subscriptionId]);
        return parseInt(result.rows[0].count);
    }

    async updateStatus(paymentId, status) {
        const query = `
            UPDATE subscription_payments
            SET status = $1
            WHERE id = $2
            RETURNING *
        `;

        const result = await db.query(query, [status, paymentId]);
        return result.rows[0] || null;
    }

    async getTotalRevenue(options = {}) {
        const { startDate, endDate, currency = "USD" } = options;

        let query = `
            SELECT 
                SUM(amount) as total_amount,
                COUNT(*) as total_payments,
                MIN(created_at) as first_payment,
                MAX(created_at) as last_payment
            FROM subscription_payments
            WHERE status = 'succeeded' AND currency = $1
        `;

        const queryParams = [currency];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND created_at >= $${paramIndex++}`;
            queryParams.push(startDate);
        }

        if (endDate) {
            query += ` AND created_at <= $${paramIndex++}`;
            queryParams.push(endDate);
        }

        const result = await db.query(query, queryParams);
        return result.rows[0];
    }

    async getRevenueByMonth(options = {}) {
        const { startDate, endDate, currency = "USD" } = options;

        let query = `
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                SUM(amount) as total_amount,
                COUNT(*) as payment_count
            FROM subscription_payments
            WHERE status = 'succeeded' AND currency = $1
        `;

        const queryParams = [currency];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND created_at >= $${paramIndex++}`;
            queryParams.push(startDate);
        }

        if (endDate) {
            query += ` AND created_at <= $${paramIndex++}`;
            queryParams.push(endDate);
        }

        query += `
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month ASC
        `;

        const result = await db.query(query, queryParams);
        return result.rows;
    }
}

module.exports = new SubscriptionPaymentModel();
