const db = require("../../config/db");

class UserCommunitiesModel {
    async checkUserExists(userIdentifier) {
        let query;
        let params;

        if (isNaN(userIdentifier)) {
            query =
                "SELECT EXISTS(SELECT 1 FROM users WHERE unique_url = $1) as exists";
            params = [userIdentifier];
        } else {
            query =
                "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) as exists";
            params = [parseInt(userIdentifier)];
        }

        const result = await db.query(query, params);
        return result.rows[0].exists;
    }

    async getUserCommunities(userIdentifier, options = {}) {
        const {
            limit = 20,
            offset = 0,
            sortBy = "role",
            search = null,
        } = options;

        let userId;

        if (isNaN(userIdentifier)) {
            const userQuery = {
                text: "SELECT id FROM users WHERE unique_url = $1",
                values: [userIdentifier],
            };
            const userResult = await db.query(userQuery.text, userQuery.values);

            if (!userResult.rows.length) {
                return [];
            }

            userId = userResult.rows[0].id;
        } else {
            userId = parseInt(userIdentifier);
        }

        let query = `
            SELECT 
                c.id, 
                c.name, 
                c.unique_url, 
                c.tagline,
                cm.role,
                cm.joined_at
            FROM 
                communities c
            JOIN 
                community_members cm ON c.id = cm.community_id
            WHERE 
                cm.user_id = $1
                AND c.is_active = true
        `;

        const queryParams = [userId];
        let paramIndex = 2;

        // Add search filter if provided
        if (search) {
            query += ` AND (c.name ILIKE $${paramIndex} OR c.tagline ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        if (sortBy === "role") {
            query += `
                ORDER BY 
                    CASE 
                        WHEN cm.role = 'owner' THEN 1
                        WHEN cm.role = 'organizer' THEN 2
                        WHEN cm.role = 'moderator' THEN 3
                        ELSE 4
                    END,
                    cm.joined_at DESC
            `;
        } else {
            query += ` ORDER BY cm.joined_at DESC`;
        }

        // Add pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        // Execute query
        const result = await db.query(query, queryParams);

        // Fetch additional data for communities (member count, images)
        const communities = result.rows;

        if (communities.length > 0) {
            const communityIds = communities.map((c) => c.id);

            // Get member counts
            const countQuery = `
                SELECT community_id, COUNT(*) as member_count
                FROM community_members
                WHERE community_id = ANY($1)
                GROUP BY community_id
            `;

            const memberCountsResult = await db.query(countQuery, [
                communityIds,
            ]);

            // Create a map of community_id -> member_count
            const memberCountMap = {};
            memberCountsResult.rows.forEach((row) => {
                memberCountMap[row.community_id] = parseInt(row.member_count);
            });

            // Get profile images
            const profileImagesQuery = `
                SELECT 
                    entity_id as community_id,
                    id as image_id,
                    provider,
                    key,
                    alt_text
                FROM 
                    images
                WHERE 
                    entity_type = 'community'
                    AND image_type = 'profile'
                    AND entity_id = ANY($1)
            `;

            const profileImagesResult = await db.query(profileImagesQuery, [
                communityIds,
            ]);

            // Create a map of community_id -> profile_image
            const profileImageMap = {};
            profileImagesResult.rows.forEach((row) => {
                profileImageMap[row.community_id] = {
                    id: row.image_id,
                    provider: row.provider,
                    key: row.key,
                    alt_text: row.alt_text,
                };
            });

            // Get cover images
            const coverImagesQuery = `
                SELECT 
                    entity_id as community_id,
                    id as image_id,
                    provider,
                    key,
                    alt_text
                FROM 
                    images
                WHERE 
                    entity_type = 'community'
                    AND image_type = 'banner'
                    AND entity_id = ANY($1)
            `;

            const coverImagesResult = await db.query(coverImagesQuery, [
                communityIds,
            ]);

            // Create a map of community_id -> cover_image
            const coverImageMap = {};
            coverImagesResult.rows.forEach((row) => {
                coverImageMap[row.community_id] = {
                    id: row.image_id,
                    provider: row.provider,
                    key: row.key,
                    alt_text: row.alt_text,
                };
            });

            // Add member counts and images to each community
            communities.forEach((community) => {
                community.memberCount = memberCountMap[community.id] || 0;
                community.profileImage = profileImageMap[community.id] || null;
                community.coverImage = coverImageMap[community.id] || null;

                // Check if user is an admin
                community.isAdmin = [
                    "owner",
                    "organizer",
                    "moderator",
                ].includes(community.role);
            });
        }

        return communities;
    }

    async countUserCommunities(userIdentifier, options = {}) {
        const { search = null } = options;

        let userId;

        if (isNaN(userIdentifier)) {
            const userQuery = {
                text: "SELECT id FROM users WHERE unique_url = $1",
                values: [userIdentifier],
            };
            const userResult = await db.query(userQuery.text, userQuery.values);

            if (!userResult.rows.length) {
                return 0; // User not found
            }

            userId = userResult.rows[0].id;
        } else {
            userId = parseInt(userIdentifier);
        }

        // Build the count query
        let query = `
            SELECT COUNT(*)
            FROM communities c
            JOIN community_members cm ON c.id = cm.community_id
            WHERE cm.user_id = $1
            AND c.is_active = true
        `;

        const queryParams = [userId];

        if (search) {
            query += ` AND (c.name ILIKE $2 OR c.tagline ILIKE $2)`;
            queryParams.push(`%${search}%`);
        }

        const result = await db.query(query, queryParams);
        return parseInt(result.rows[0].count);
    }
}

module.exports = new UserCommunitiesModel();
