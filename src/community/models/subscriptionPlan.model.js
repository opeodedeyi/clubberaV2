// src/community/models/subscriptionPlan.model.js

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

    async getById(planId) {
        const query = `
            SELECT * FROM subscription_plans
            WHERE id = $1
        `;

        const result = await db.query(query, [planId]);
        return result.rows[0] || null;
    }

    async getByCode(code) {
        const query = `
            SELECT * FROM subscription_plans
            WHERE code = $1
        `;

        const result = await db.query(query, [code]);
        return result.rows[0] || null;
    }

    async getFreePlan() {
        return this.getByCode("free");
    }

    async create(data) {
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

        const query = `
            INSERT INTO subscription_plans (
                name, code, description, price, currency, 
                billing_interval, features, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const result = await db.query(query, [
            name,
            code,
            description,
            price,
            currency,
            billing_interval,
            features ? JSON.stringify(features) : null,
            is_active,
        ]);

        await this.addPriceHistory({
            plan_id: result.rows[0].id,
            price,
            currency,
            effective_from: new Date(),
        });

        return result.rows[0];
    }

    async update(planId, data) {
        const allowedFields = ["name", "description", "features", "is_active"];
        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

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

        setValues.push(`updated_at = $${paramIndex++}`);
        queryParams.push(new Date());

        // No fields to update
        if (setValues.length === 1) {
            // Only updated_at was added
            return this.getById(planId);
        }

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

    async updatePrice(planId, price, currency = "USD") {
        const plan = await this.getById(planId);
        if (!plan) {
            throw new Error("Plan not found");
        }

        if (
            parseFloat(plan.price) === parseFloat(price) &&
            plan.currency === currency
        ) {
            return plan;
        }

        await this.closePriceHistory(planId);

        await this.addPriceHistory({
            plan_id: planId,
            price,
            currency,
            effective_from: new Date(),
        });

        const query = `
            UPDATE subscription_plans
            SET price = $1, currency = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

        const result = await db.query(query, [price, currency, planId]);
        return result.rows[0];
    }

    async addPriceHistory(data) {
        const { plan_id, price, currency, effective_from } = data;

        const query = `
            INSERT INTO subscription_price_history (
                plan_id, price, currency, effective_from
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await db.query(query, [
            plan_id,
            price,
            currency,
            effective_from,
        ]);

        return result.rows[0];
    }

    async closePriceHistory(planId) {
        const query = `
            UPDATE subscription_price_history
            SET effective_to = CURRENT_TIMESTAMP
            WHERE plan_id = $1 AND effective_to IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [planId]);
        return result.rows[0] || null;
    }

    async getPriceHistory(planId) {
        const query = `
            SELECT * FROM subscription_price_history
            WHERE plan_id = $1
            ORDER BY effective_from DESC
        `;

        const result = await db.query(query, [planId]);
        return result.rows;
    }
}

module.exports = new SubscriptionPlanModel();
