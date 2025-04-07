const db = require("../../config/db");

class CommunityModel {
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

        // For transactional use
        if (data.useTransaction) {
            return query;
        }

        // For direct use
        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    async findByIdentifier(identifier, includeInactive = false) {
        let query;
        let params;

        // Check if identifier is a number (ID) or string (unique_url)
        if (!isNaN(identifier)) {
            query = "SELECT * FROM communities WHERE id = $1";
            params = [identifier];
        } else {
            query = "SELECT * FROM communities WHERE unique_url = $1";
            params = [identifier];
        }

        // Only include active communities unless specifically requested
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
            is_active = true, // Default to active communities only
            limit = 20,
            offset = 0,
            order_by = "created_at",
            order_dir = "DESC",
        } = filters;

        let query = "SELECT c.* FROM communities c";
        const queryParams = [];
        let paramIndex = 1;
        let whereClause = [];

        // Join for member_id filter if provided
        if (member_id) {
            query += " JOIN community_members cm ON c.id = cm.community_id";
            whereClause.push(`cm.user_id = $${paramIndex++}`);
            queryParams.push(member_id);
        }

        // Active status filter
        if (is_active !== null && is_active !== undefined) {
            whereClause.push(`c.is_active = $${paramIndex++}`);
            queryParams.push(is_active);
        }

        // Add search condition
        if (search) {
            whereClause.push(
                `(c.name ILIKE $${paramIndex++} OR c.tagline ILIKE $${paramIndex++} OR c.description ILIKE $${paramIndex++})`
            );
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        // Add is_private filter
        if (is_private !== undefined) {
            whereClause.push(`c.is_private = $${paramIndex++}`);
            queryParams.push(is_private);
        }

        // Add created_by filter
        if (created_by) {
            whereClause.push(`c.created_by = $${paramIndex++}`);
            queryParams.push(created_by);
        }

        // Add WHERE clause if any conditions exist
        if (whereClause.length > 0) {
            query += " WHERE " + whereClause.join(" AND ");
        }

        // Add ORDER BY clause
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

        // Add pagination
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

        // Join for member_id filter if provided
        if (member_id) {
            query += " JOIN community_members cm ON c.id = cm.community_id";
            whereClause.push(`cm.user_id = $${paramIndex++}`);
            queryParams.push(member_id);
        }

        // Active status filter
        if (is_active !== null && is_active !== undefined) {
            whereClause.push(`c.is_active = $${paramIndex++}`);
            queryParams.push(is_active);
        }

        // Add search condition
        if (search) {
            whereClause.push(
                `(c.name ILIKE $${paramIndex++} OR c.tagline ILIKE $${paramIndex++} OR c.description ILIKE $${paramIndex++})`
            );
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        // Add is_private filter
        if (is_private !== undefined) {
            whereClause.push(`c.is_private = $${paramIndex++}`);
            queryParams.push(is_private);
        }

        // Add created_by filter
        if (created_by) {
            whereClause.push(`c.created_by = $${paramIndex++}`);
            queryParams.push(created_by);
        }

        // Add WHERE clause if any conditions exist
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
            return this.findByIdentifier(id, true);
        }

        // Add community ID to params
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

        const query = `
            SELECT jr.*, u.full_name, u.email, u.unique_url as user_url
            FROM community_join_requests jr
            JOIN users u ON jr.user_id = u.id
            WHERE jr.community_id = $1 AND jr.status = 'pending'
            ORDER BY jr.created_at ASC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [communityId, limit, offset]);
        return result.rows;
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
}

module.exports = new CommunityModel();
