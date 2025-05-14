// src/communitySupport/models/community.model.js
const db = require("../../config/db");

class CommunityModel {
    async isUserCommunityOwner(userId, communityId) {
        const query = `
            SELECT EXISTS (
                SELECT 1 FROM community_members
                WHERE user_id = $1 
                AND community_id = $2 
                AND role = 'owner'
            ) as is_owner
        `;

        const result = await db.query(query, [userId, communityId]);
        return result.rows[0].is_owner;
    }

    async communityExists(communityId) {
        const query = `
            SELECT EXISTS (
                SELECT 1 FROM communities
                WHERE id = $1 AND is_active = true
            ) as exists
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0].exists;
    }

    async getCommunityBasicDetails(communityId) {
        const query = `
            SELECT id, name, unique_url, is_private, is_active, created_by
            FROM communities
            WHERE id = $1
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0];
    }

    async isUserCommunityMember(userId, communityId) {
        const query = `
            SELECT EXISTS (
                SELECT 1 FROM community_members
                WHERE user_id = $1 
                AND community_id = $2
            ) as is_member
        `;

        const result = await db.query(query, [userId, communityId]);
        return result.rows[0].is_member;
    }
}

module.exports = new CommunityModel();
