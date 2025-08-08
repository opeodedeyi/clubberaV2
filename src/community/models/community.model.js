// src/community/models/community.model.js

const db = require("../../config/db");

class CommunityModel {
    async checkUniqueUrlExists(uniqueUrl) {
        const query = `
            SELECT id FROM communities 
            WHERE unique_url = $1 AND is_active = true
            LIMIT 1
        `;
        const result = await db.query(query, [uniqueUrl]);
        return result.rows.length > 0;
    }

    async create(data) {
        const {
            name,
            unique_url,
            tagline,
            description,
            guidelines,
            is_private,
            created_by,
        } = data;

        const query = {
            text: `
                INSERT INTO communities 
                    (name, unique_url, tagline, description, guidelines, is_private, created_by)
                VALUES 
                    ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `,
            values: [
                name,
                unique_url,
                tagline || null,
                description || null,
                guidelines || null,
                is_private || false,
                created_by,
            ],
        };

        if (data.useTransaction) {
            return query;
        }

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    async findByIdentifier(identifier, includeInactive = false) {
        let query;
        let params;

        if (!isNaN(identifier)) {
            query = "SELECT * FROM communities WHERE id = $1";
            params = [identifier];
        } else {
            query = "SELECT * FROM communities WHERE unique_url = $1";
            params = [identifier];
        }

        if (!includeInactive) {
            query += " AND is_active = true";
        }

        const result = await db.query(query, params);
        return result.rows[0] || null;
    }

    async findAll(filters = {}) {
        const {
            search,
            is_private,
            created_by,
            member_id,
            is_active = true,
            limit = 20,
            offset = 0,
            order_by = "created_at",
            order_dir = "DESC",
        } = filters;

        let query = "SELECT c.* FROM communities c";
        const queryParams = [];
        let paramIndex = 1;
        let whereClause = [];

        if (member_id) {
            query += " JOIN community_members cm ON c.id = cm.community_id";
            whereClause.push(`cm.user_id = $${paramIndex++}`);
            queryParams.push(member_id);
        }

        if (is_active !== null && is_active !== undefined) {
            whereClause.push(`c.is_active = $${paramIndex++}`);
            queryParams.push(is_active);
        }

        if (search) {
            whereClause.push(
                `(c.name ILIKE $${paramIndex++} OR c.tagline ILIKE $${paramIndex++} OR c.description ILIKE $${paramIndex++})`
            );
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        if (is_private !== undefined) {
            whereClause.push(`c.is_private = $${paramIndex++}`);
            queryParams.push(is_private);
        }

        if (created_by) {
            whereClause.push(`c.created_by = $${paramIndex++}`);
            queryParams.push(created_by);
        }

        if (whereClause.length > 0) {
            query += " WHERE " + whereClause.join(" AND ");
        }

        const validColumns = ["created_at", "name", "updated_at"];
        const validDirections = ["ASC", "DESC"];

        const sanitizedOrderBy = validColumns.includes(order_by)
            ? order_by
            : "created_at";
        const sanitizedOrderDir = validDirections.includes(
            order_dir.toUpperCase()
        )
            ? order_dir.toUpperCase()
            : "DESC";

        query += ` ORDER BY c.${sanitizedOrderBy} ${sanitizedOrderDir}`;

        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limit, offset);

        const result = await db.query(query, queryParams);
        return result.rows;
    }

    async countAll(filters = {}) {
        const {
            search,
            is_private,
            created_by,
            member_id,
            is_active = true,
        } = filters;

        let query = "SELECT COUNT(*) FROM communities c";
        const queryParams = [];
        let paramIndex = 1;
        let whereClause = [];

        if (member_id) {
            query += " JOIN community_members cm ON c.id = cm.community_id";
            whereClause.push(`cm.user_id = $${paramIndex++}`);
            queryParams.push(member_id);
        }

        if (is_active !== null && is_active !== undefined) {
            whereClause.push(`c.is_active = $${paramIndex++}`);
            queryParams.push(is_active);
        }

        if (search) {
            whereClause.push(
                `(c.name ILIKE $${paramIndex++} OR c.tagline ILIKE $${paramIndex++} OR c.description ILIKE $${paramIndex++})`
            );
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        if (is_private !== undefined) {
            whereClause.push(`c.is_private = $${paramIndex++}`);
            queryParams.push(is_private);
        }

        if (created_by) {
            whereClause.push(`c.created_by = $${paramIndex++}`);
            queryParams.push(created_by);
        }

        if (whereClause.length > 0) {
            query += " WHERE " + whereClause.join(" AND ");
        }

        const result = await db.query(query, queryParams);
        return parseInt(result.rows[0].count);
    }

    async update(id, data) {
        const allowedFields = [
            "name",
            "tagline",
            "description",
            "guidelines",
            "is_private",
            "is_active",
        ];
        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key)) {
                setValues.push(`${key} = $${paramIndex++}`);
                queryParams.push(value);
            }
        }

        setValues.push(`updated_at = $${paramIndex++}`);
        queryParams.push(new Date());

        if (setValues.length === 1) {
            return this.findByIdentifier(id, true);
        }

        queryParams.push(id);

        const query = `
            UPDATE communities
            SET ${setValues.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, queryParams);
        return result.rows[0] || null;
    }

    async deactivate(id) {
        return this.update(id, { is_active: false });
    }

    async reactivate(id) {
        return this.update(id, { is_active: true });
    }

    async delete(id) {
        const query = "DELETE FROM communities WHERE id = $1";
        const result = await db.query(query, [id]);
        return result.rowCount > 0;
    }

    async checkActiveBan(communityId, userId) {
        const query = `
            SELECT * FROM community_restrictions
            WHERE community_id = $1 AND user_id = $2 AND type = 'ban'
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            LIMIT 1
        `;

        const result = await db.query(query, [communityId, userId]);
        return result.rows[0] || null;
    }

    async createJoinRequest(data) {
        const { community_id, user_id, message } = data;

        const query = `
            INSERT INTO community_join_requests (community_id, user_id, message)
            VALUES ($1, $2, $3)
            ON CONFLICT (community_id, user_id, status) 
            WHERE status = 'pending'
            DO UPDATE SET 
                message = EXCLUDED.message,
                created_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await db.query(query, [
            community_id,
            user_id,
            message || null,
        ]);
        return result.rows[0];
    }

    async getJoinRequests(communityId, options = {}) {
        const { limit = 50, offset = 0 } = options;

        // First get the basic join request data with user info
        const query = `
        SELECT 
            jr.id as request_id,
            jr.user_id,
            jr.community_id,
            jr.message,
            jr.status,
            jr.created_at,
            u.id as user_id,
            u.full_name,
            u.unique_url
        FROM community_join_requests jr
        JOIN users u ON jr.user_id = u.id
        WHERE jr.community_id = $1 AND jr.status = 'pending'
        ORDER BY jr.created_at ASC
        LIMIT $2 OFFSET $3
    `;

        const result = await db.query(query, [communityId, limit, offset]);
        const requests = result.rows;

        // Get profile images for all requesters in a single query
        if (requests.length > 0) {
            const userIds = requests.map((request) => request.user_id);

            const imagesQuery = `
                SELECT 
                    entity_id as user_id,
                    provider,
                    key, 
                    alt_text
                FROM images
                WHERE entity_type = 'user' 
                AND image_type = 'profile'
                AND entity_id = ANY($1)
            `;

            const imagesResult = await db.query(imagesQuery, [userIds]);
            const profileImages = imagesResult.rows;

            // Create a map of user_id to profile image for quick lookup
            const profileImageMap = {};
            for (const image of profileImages) {
                profileImageMap[image.user_id] = {
                    provider: image.provider,
                    key: image.key,
                    altText: image.alt_text,
                };
            }

            // Attach profile images to join requests
            for (const request of requests) {
                if (profileImageMap[request.user_id]) {
                    request.profileImage = profileImageMap[request.user_id];
                }
            }
        }

        // Format the results to match the expected structure
        return requests.map((request) => ({
            id: request.request_id,
            userId: request.user_id,
            communityId: request.community_id,
            message: request.message,
            status: request.status,
            createdAt: request.created_at,
            user: {
                id: request.user_id,
                fullName: request.full_name,
                uniqueUrl: request.unique_url,
                profileImage: request.profileImage || null,
            },
        }));
    }

    async countJoinRequests(communityId) {
        const query = `
            SELECT COUNT(*) 
            FROM community_join_requests
            WHERE community_id = $1 AND status = 'pending'
        `;

        const result = await db.query(query, [communityId]);
        return parseInt(result.rows[0].count);
    }

    async respondToJoinRequest(requestId, data) {
        const { status, responded_by } = data;

        const query = `
            UPDATE community_join_requests
            SET status = $1, responded_by = $2, responded_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND status = 'pending'
            RETURNING *
        `;

        const result = await db.query(query, [status, responded_by, requestId]);
        return result.rows[0] || null;
    }

    async addMember(data) {
        const { community_id, user_id, role = "member" } = data;

        const query = `
            INSERT INTO community_members (community_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, community_id) 
            DO UPDATE SET role = EXCLUDED.role
            RETURNING *
        `;

        const result = await db.query(query, [community_id, user_id, role]);
        return result.rows[0];
    }

    async removeMember(communityId, userId) {
        const query = `
            DELETE FROM community_members
            WHERE community_id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await db.query(query, [communityId, userId]);
        return result.rowCount > 0;
    }

    async checkMemberRole(communityId, userId, roles) {
        const rolesArray = Array.isArray(roles) ? roles : [roles];

        const query = `
            SELECT * FROM community_members
            WHERE community_id = $1 AND user_id = $2 AND role = ANY($3)
        `;

        const result = await db.query(query, [communityId, userId, rolesArray]);
        return result.rows.length > 0;
    }

    async getMember(communityId, userId) {
        const query = `
            SELECT id, user_id, community_id, role, is_premium, joined_at
            FROM community_members
            WHERE community_id = $1 AND user_id = $2
            LIMIT 1
        `;

        const result = await db.query(query, [communityId, userId]);
        return result.rows[0] || null;
    }

    async getMembers(communityId, options = {}) {
        const { limit = 20, offset = 0, role } = options;

        let query = `
            SELECT 
                cm.id as membership_id,
                cm.user_id,
                cm.community_id,
                cm.role,
                cm.is_premium,
                cm.joined_at,
                u.id as user_id,
                u.full_name,
                u.unique_url
            FROM community_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.community_id = $1
        `;

        const queryParams = [communityId];
        let paramIndex = 2;

        if (role) {
            query += ` AND cm.role = $${paramIndex++}`;
            queryParams.push(role);
        }

        query += ` ORDER BY 
            CASE 
                WHEN cm.role = 'owner' THEN 1
                WHEN cm.role = 'organizer' THEN 2
                WHEN cm.role = 'moderator' THEN 3
                ELSE 4
            END,
            cm.joined_at ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

        queryParams.push(limit, offset);

        const result = await db.query(query, queryParams);
        const members = result.rows;

        // Get profile images for all members in a single query
        if (members.length > 0) {
            const userIds = members.map((member) => member.user_id);

            const imagesQuery = `
                SELECT 
                    entity_id as user_id,
                    provider,
                    key, 
                    alt_text
                FROM images
                WHERE entity_type = 'user' 
                AND image_type = 'profile'
                AND entity_id = ANY($1)
            `;

            const imagesResult = await db.query(imagesQuery, [userIds]);
            const profileImages = imagesResult.rows;

            // Create a map of user_id to profile image for quick lookup
            const profileImageMap = {};
            for (const image of profileImages) {
                profileImageMap[image.user_id] = {
                    provider: image.provider,
                    key: image.key,
                    altText: image.alt_text,
                };
            }

            // Attach profile images to members
            for (const member of members) {
                if (profileImageMap[member.user_id]) {
                    member.profileImage = profileImageMap[member.user_id];
                }
            }
        }

        return members.map((member) => ({
            id: member.user_id,
            fullName: member.full_name,
            uniqueUrl: member.unique_url,
            membershipId: member.membership_id,
            role: member.role,
            isPremium: member.is_premium,
            joinedAt: member.joined_at,
            profileImage: member.profileImage || null,
        }));
    }

    async countMembers(communityId, options = {}) {
        const { role } = options;

        let query = `
            SELECT COUNT(*) 
            FROM community_members
            WHERE community_id = $1
        `;

        const queryParams = [communityId];

        if (role) {
            query += ` AND role = $2`;
            queryParams.push(role);
        }

        const result = await db.query(query, queryParams);
        return parseInt(result.rows[0].count);
    }
}

module.exports = new CommunityModel();
