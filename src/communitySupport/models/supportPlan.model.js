// src/communitySupport/models/supportPlan.model.js
const db = require("../../config/db");

class SupportPlanModel {
    async createPlan(planData) {
        const {
            communityId,
            name,
            description,
            monthlyPrice,
            currency = "USD",
            benefits,
        } = planData;

        const query = `
            INSERT INTO community_support_plans (
                community_id, name, description, monthly_price, 
                currency, benefits, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING *
        `;

        const values = [
            communityId,
            name,
            description,
            monthlyPrice,
            currency,
            benefits,
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getPlanById(planId) {
        const query = `
            SELECT * FROM community_support_plans
            WHERE id = $1
        `;

        const result = await db.query(query, [planId]);
        return result.rows[0];
    }

    async getPlanByCommunityId(communityId) {
        const query = `
            SELECT * FROM community_support_plans
            WHERE community_id = $1
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0];
    }

    async updatePlan(planId, updateData) {
        const allowedFields = [
            "name",
            "description",
            "monthly_price",
            "currency",
            "is_active",
            "benefits",
        ];

        // Filter update data to only include allowed fields
        const updates = Object.keys(updateData)
            .filter((key) => allowedFields.includes(key))
            .map((key, index) => `${key} = $${index + 2}`);

        if (updates.length === 0) {
            return this.getPlanById(planId);
        }

        const query = `
            UPDATE community_support_plans
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const values = [planId, ...Object.values(updateData)];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async deletePlan(planId) {
        const query = `
            DELETE FROM community_support_plans
            WHERE id = $1
            RETURNING id
        `;

        const result = await db.query(query, [planId]);
        return result.rowCount > 0;
    }

    async hasActivePlan(communityId) {
        const query = `
            SELECT EXISTS(
                SELECT 1 FROM community_support_plans
                WHERE community_id = $1 AND is_active = true
            ) as has_plan
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0].has_plan;
    }
}

module.exports = new SupportPlanModel();
