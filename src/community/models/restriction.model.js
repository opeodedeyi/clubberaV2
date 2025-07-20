// src/community/models/restriction.model.js

const db = require("../../config/db");

class CommunityRestrictionModel {
    async createRestriction(data) {
        const { community_id, user_id, type, reason, applied_by, expires_at } =
            data;

        const query = `
            INSERT INTO community_restrictions 
                (community_id, user_id, type, reason, applied_by, expires_at)
            VALUES 
                ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await db.query(query, [
            community_id,
            user_id,
            type,
            reason || null,
            applied_by,
            expires_at || null,
        ]);

        return result.rows[0];
    }

    async getUserRestrictions(communityId, userId) {
        const query = `
            SELECT * FROM community_restrictions
            WHERE community_id = $1 AND user_id = $2
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [communityId, userId]);
        return result.rows;
    }

    async getActiveRestrictions(communityId, userId, type = null) {
        let query = `
            SELECT * FROM community_restrictions
            WHERE community_id = $1 AND user_id = $2
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        `;

        const queryParams = [communityId, userId];

        if (type) {
            query += " AND type = $3";
            queryParams.push(type);
        }

        const result = await db.query(query, queryParams);
        return result.rows;
    }

    async hasActiveBan(communityId, userId) {
        const query = `
            SELECT * FROM community_restrictions
            WHERE community_id = $1 AND user_id = $2 AND type = 'ban'
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            LIMIT 1
        `;

        const result = await db.query(query, [communityId, userId]);
        return result.rows.length > 0;
    }

    async hasActiveMute(communityId, userId) {
        const query = `
            SELECT * FROM community_restrictions
            WHERE community_id = $1 AND user_id = $2 AND type = 'mute'
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            LIMIT 1
        `;

        const result = await db.query(query, [communityId, userId]);
        return result.rows.length > 0;
    }

    async getRestrictionById(restrictionId) {
        const query = `
            SELECT * FROM community_restrictions
            WHERE id = $1
        `;

        const result = await db.query(query, [restrictionId]);
        return result.rows[0] || null;
    }

    async removeRestriction(restrictionId) {
        const query = `
            UPDATE community_restrictions
            SET expires_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [restrictionId]);
        return result.rows[0] || null;
    }

    async clearExpiredRestrictions() {
        const query = `
            UPDATE community_restrictions 
            SET expires_at = NULL
            WHERE expires_at < CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await db.query(query);
        return result.rows;
    }
}

module.exports = new CommunityRestrictionModel();
