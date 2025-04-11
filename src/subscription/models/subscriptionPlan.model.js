const db = require("../../config/db");

class SubscriptionPlanModel {
    async getAllActivePlans() {
        const query = `
            SELECT * FROM subscription_plans
            WHERE is_active = true
            ORDER BY price ASC
        `;

        const result = await db.query(query);
        return result.rows;
    }

    async getSubscriptionPlanById(planId) {
        const query = `
            SELECT * FROM subscription_plans
            WHERE id = $1
        `;

        const result = await db.query(query, [planId]);
        return result.rows[0] || null;
    }

    async getSubscriptionPlanByCode(code) {
        const query = `
            SELECT * FROM subscription_plans
            WHERE code = $1
        `;

        const result = await db.query(query, [code]);
        return result.rows[0] || null;
    }

    async getFreePlan() {
        return this.getSubscriptionPlanByCode("free");
    }

    async createSubscriptionPlan(data) {
        const {
            name,
            code,
            description,
            price,
            currency = "USD",
            billing_interval,
            features,
            is_active = true,
        } = data;

        // Begin transaction
        const client = await db.getClient();

        try {
            await client.query("BEGIN");

            // Create the plan
            const planQuery = `
                INSERT INTO subscription_plans (
                    name, code, description, price, currency, 
                    billing_interval, features, is_active
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const planResult = await client.query(planQuery, [
                name,
                code,
                description,
                price,
                currency,
                billing_interval,
                features ? JSON.stringify(features) : null,
                is_active,
            ]);

            const planId = planResult.rows[0].id;

            // Create the initial price history entry
            const historyQuery = `
                INSERT INTO subscription_price_history (
                    plan_id, price, currency, effective_from
                )
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            await client.query(historyQuery, [
                planId,
                price,
                currency,
                new Date(),
            ]);

            await client.query("COMMIT");
            return planResult.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async updateSubscriptionPlan(planId, data) {
        const allowedFields = ["name", "description", "features", "is_active"];
        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

        // Build SET clause for allowed fields
        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key)) {
                if (key === "features" && typeof value === "object") {
                    setValues.push(`${key} = $${paramIndex++}`);
                    queryParams.push(JSON.stringify(value));
                } else {
                    setValues.push(`${key} = $${paramIndex++}`);
                    queryParams.push(value);
                }
            }
        }

        // Add updated_at timestamp
        setValues.push(`updated_at = $${paramIndex++}`);
        queryParams.push(new Date());

        // No fields to update
        if (setValues.length === 1) {
            // Only updated_at was added
            return this.getSubscriptionPlanById(planId);
        }

        // Add plan ID to params
        queryParams.push(planId);

        const query = `
            UPDATE subscription_plans
            SET ${setValues.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, queryParams);
        return result.rows[0] || null;
    }

    async updateSubscriptionPlanPrice(planId, price, currency = "USD") {
        // Get the current plan price
        const plan = await this.getSubscriptionPlanById(planId);
        if (!plan) {
            throw new Error("Plan not found");
        }

        // If price is the same, no need to update
        if (
            parseFloat(plan.price) === parseFloat(price) &&
            plan.currency === currency
        ) {
            return plan;
        }

        // Begin transaction
        const client = await db.getClient();

        try {
            await client.query("BEGIN");

            // Close the current price history entry
            const closeHistoryQuery = `
                UPDATE subscription_price_history
                SET effective_to = CURRENT_TIMESTAMP
                WHERE plan_id = $1 AND effective_to IS NULL
                RETURNING *
            `;

            await client.query(closeHistoryQuery, [planId]);

            // Add a new price history entry
            const newHistoryQuery = `
                INSERT INTO subscription_price_history (
                    plan_id, price, currency, effective_from
                )
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            await client.query(newHistoryQuery, [
                planId,
                price,
                currency,
                new Date(),
            ]);

            // Update the plan price
            const updatePlanQuery = `
                UPDATE subscription_plans
                SET price = $1, currency = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const planResult = await client.query(updatePlanQuery, [
                price,
                currency,
                planId,
            ]);

            await client.query("COMMIT");
            return planResult.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async getSubscriptionPlanPriceHistory(planId) {
        const query = `
            SELECT * FROM subscription_price_history
            WHERE plan_id = $1
            ORDER BY effective_from DESC
        `;

        const result = await db.query(query, [planId]);
        return result.rows;
    }

    async deactivateSubscriptionPlan(planId) {
        const query = `
            UPDATE subscription_plans
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [planId]);
        return result.rows[0] || null;
    }

    async activateSubscriptionPlan(planId) {
        const query = `
            UPDATE subscription_plans
            SET is_active = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [planId]);
        return result.rows[0] || null;
    }
}

module.exports = new SubscriptionPlanModel();
