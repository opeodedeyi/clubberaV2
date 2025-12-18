// src/post/models/post.model.js
const db = require("../../config/db");

class PostModel {
    _formatTimeUntil(seconds) {
        if (seconds <= 0) {
            return "Started";
        }

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days} day${days !== 1 ? "s" : ""}${
                hours > 0 ? `, ${hours} hour${hours !== 1 ? "s" : ""}` : ""
            }`;
        } else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? "s" : ""}${
                minutes > 0
                    ? `, ${minutes} minute${minutes !== 1 ? "s" : ""}`
                    : ""
            }`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
        } else {
            return "Less than a minute";
        }
    }

    async create(postData) {
        const {
            communityId,
            userId,
            content,
            isSupportersOnly,
            contentType = "post",
            parentId = null,
            pollData = null,
        } = postData;

        const query = `
            INSERT INTO posts (
                community_id, 
                user_id, 
                content, 
                is_supporters_only, 
                content_type, 
                parent_id,
                poll_data
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`;

        const values = [
            communityId,
            userId,
            content,
            isSupportersOnly || false,
            contentType,
            parentId,
            pollData ? JSON.stringify(pollData) : null,
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async findById(postId) {
        const query = `
            SELECT
                p.*,
                json_build_object(
                    'id', u.id,
                    'full_name', u.full_name,
                    'unique_url', u.unique_url,
                    'profile_image', (
                        SELECT json_build_object(
                            'id', i.id,
                            'provider', i.provider,
                            'key', i.key,
                            'alt_text', i.alt_text
                        )
                        FROM images i
                        WHERE i.entity_type = 'user' AND i.entity_id = u.id AND i.image_type = 'profile'
                        LIMIT 1
                    )
                ) as user,
                c.name as community_name,
                c.unique_url as community_url,
                (
                SELECT COUNT(*)
                FROM post_reactions
                WHERE post_id = p.id AND reaction_type = 'like'
                ) as likes_count,
                (
                SELECT COUNT(*)
                FROM posts
                WHERE parent_id = p.id
                ) as replies_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN communities c ON p.community_id = c.id
            WHERE p.id = $1`;

        const result = await db.query(query, [postId]);
        return result.rows[0];
    }

    async update(postId, userId, updateData) {
        const { content, isSupportersOnly, isHidden, pollData } = updateData;

        // First check post ownership
        const postCheck = await db.query(
            "SELECT user_id, content_type FROM posts WHERE id = $1",
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return null;
        }

        if (postCheck.rows[0].user_id !== userId) {
            throw new Error("Unauthorized to update this post");
        }

        const updateFields = [];
        const values = [];
        let paramCount = 1;

        if (content !== undefined) {
            updateFields.push(`content = $${paramCount}`);
            values.push(content);
            paramCount++;
        }

        if (isSupportersOnly !== undefined) {
            updateFields.push(`is_supporters_only = $${paramCount}`);
            values.push(isSupportersOnly);
            paramCount++;
        }

        if (isHidden !== undefined) {
            updateFields.push(`is_hidden = $${paramCount}`);
            values.push(isHidden);
            paramCount++;
        }

        if (
            pollData !== undefined &&
            postCheck.rows[0].content_type === "poll"
        ) {
            updateFields.push(`poll_data = $${paramCount}`);
            values.push(JSON.stringify(pollData));
            paramCount++;
        }

        // Add edit tracking
        updateFields.push(`is_edited = true`);
        updateFields.push(`edited_at = CURRENT_TIMESTAMP`);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        if (updateFields.length === 0) {
            return await this.findById(postId);
        }

        values.push(postId);

        const query = `
            UPDATE posts 
            SET ${updateFields.join(", ")} 
            WHERE id = $${paramCount} 
            RETURNING *`;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async delete(postId, userId) {
        // Check if user is authorized to delete the post
        const postCheck = await db.query(
            "SELECT user_id, is_hidden FROM posts WHERE id = $1",
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return null;
        }

        if (postCheck.rows[0].user_id !== userId) {
            throw new Error("Unauthorized to delete this post");
        }

        // Check if already hidden
        if (postCheck.rows[0].is_hidden) {
            throw new Error("Post is already deleted");
        }

        // Soft delete: Set is_hidden to true
        const query = `
            UPDATE posts
            SET is_hidden = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, is_hidden`;
        const result = await db.query(query, [postId]);
        return result.rows[0];
    }

    async findByCommunity(communityId, options = {}) {
        const {
            limit = 20,
            offset = 0,
            contentType = null,
            supportersOnly = null,
            userId = null,
        } = options;

        let query = `
            SELECT
                p.*,
                json_build_object(
                    'id', u.id,
                    'full_name', u.full_name,
                    'unique_url', u.unique_url,
                    'profile_image', (
                        SELECT json_build_object(
                            'id', i.id,
                            'provider', i.provider,
                            'key', i.key,
                            'alt_text', i.alt_text
                        )
                        FROM images i
                        WHERE i.entity_type = 'user' AND i.entity_id = u.id AND i.image_type = 'profile'
                        LIMIT 1
                    )
                ) as user,
                c.name as community_name,
                c.unique_url as community_url,
                (
                SELECT COUNT(*)
                FROM post_reactions
                WHERE post_id = p.id AND reaction_type = 'like'
                ) as likes_count,
                (
                SELECT COUNT(*)
                FROM posts
                WHERE parent_id = p.id
                ) as replies_count,
                (
                SELECT EXISTS(
                    SELECT 1
                    FROM post_reactions
                    WHERE post_id = p.id AND user_id = $4 AND reaction_type = 'like'
                )
                ) as user_has_liked,
                CASE
                    WHEN p.content_type = 'event' THEN
                        json_build_object(
                            'id', e.id,
                            'unique_url', e.unique_url,
                            'title', e.title,
                            'description', e.description,
                            'start_time', e.start_time,
                            'end_time', e.end_time,
                            'current_attendees', e.current_attendees,
                            'attendance_status', (
                                SELECT ea.status
                                FROM event_attendees ea
                                WHERE ea.event_id = e.id AND ea.user_id = $4
                                LIMIT 1
                            ),
                            'cover_image', (
                                SELECT json_build_object(
                                    'id', ei.id,
                                    'provider', ei.provider,
                                    'key', ei.key,
                                    'alt_text', ei.alt_text
                                )
                                FROM images ei
                                WHERE ei.entity_type = 'event' AND ei.entity_id = e.id AND ei.image_type = 'cover'
                                LIMIT 1
                            )
                        )
                    ELSE NULL
                END as event_data
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN communities c ON p.community_id = c.id
            LEFT JOIN events e ON p.content_type = 'event' AND e.post_id = p.id
            WHERE p.community_id = $1 AND p.is_hidden = false AND p.parent_id IS NULL`;

        const values = [communityId, limit, offset, userId || null];
        let paramCount = 5;

        if (contentType) {
            query += ` AND p.content_type = $${paramCount}`;
            values.push(contentType);
            paramCount++;
        } else {
            // If no specific content type is requested, show posts, polls, and upcoming events
            query += ` AND p.content_type IN ('post', 'poll', 'event')`;
        }

        if (supportersOnly !== null) {
            query += ` AND p.is_supporters_only = $${paramCount}`;
            values.push(supportersOnly);
            paramCount++;
        }

        // Exclude events that have already ended
        query += ` AND (p.content_type != 'event' OR e.end_time IS NULL OR e.end_time > NOW())`;

        query += ` ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`;

        const result = await db.query(query, values);

        // Add startingIn for event posts
        const postsWithStartingIn = result.rows.map(post => {
            if (post.content_type === 'event' && post.event_data && post.event_data.start_time) {
                const now = new Date();
                const startTime = new Date(post.event_data.start_time);
                const secondsUntilStart = Math.floor((startTime - now) / 1000);
                post.event_data.starting_in = this._formatTimeUntil(secondsUntilStart);
            }
            return post;
        });

        return postsWithStartingIn;
    }

    async findUserFeed(userId, options = {}) {
        const {
            limit = 20,
            offset = 0,
            contentType = null,
            supportersOnly = null,
        } = options;

        let query = `
            SELECT
                p.*,
                json_build_object(
                    'id', u.id,
                    'full_name', u.full_name,
                    'unique_url', u.unique_url,
                    'profile_image', (
                        SELECT json_build_object(
                            'id', i.id,
                            'provider', i.provider,
                            'key', i.key,
                            'alt_text', i.alt_text
                        )
                        FROM images i
                        WHERE i.entity_type = 'user' AND i.entity_id = u.id AND i.image_type = 'profile'
                        LIMIT 1
                    )
                ) as user,
                c.name as community_name,
                c.unique_url as community_url,
                (
                SELECT COUNT(*)
                FROM post_reactions
                WHERE post_id = p.id AND reaction_type = 'like'
                ) as likes_count,
                (
                SELECT COUNT(*)
                FROM posts
                WHERE parent_id = p.id
                ) as replies_count,
                (
                SELECT EXISTS(
                    SELECT 1
                    FROM post_reactions
                    WHERE post_id = p.id AND user_id = $3 AND reaction_type = 'like'
                )
                ) as user_has_liked,
                CASE
                    WHEN p.content_type = 'event' THEN
                        json_build_object(
                            'id', e.id,
                            'unique_url', e.unique_url,
                            'title', e.title,
                            'description', e.description,
                            'start_time', e.start_time,
                            'end_time', e.end_time,
                            'current_attendees', e.current_attendees,
                            'attendance_status', (
                                SELECT ea.status
                                FROM event_attendees ea
                                WHERE ea.event_id = e.id AND ea.user_id = $3
                                LIMIT 1
                            ),
                            'cover_image', (
                                SELECT json_build_object(
                                    'id', ei.id,
                                    'provider', ei.provider,
                                    'key', ei.key,
                                    'alt_text', ei.alt_text
                                )
                                FROM images ei
                                WHERE ei.entity_type = 'event' AND ei.entity_id = e.id AND ei.image_type = 'cover'
                                LIMIT 1
                            )
                        )
                    ELSE NULL
                END as event_data
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN communities c ON p.community_id = c.id
            LEFT JOIN events e ON p.content_type = 'event' AND e.post_id = p.id
            INNER JOIN community_members cm ON p.community_id = cm.community_id
            WHERE cm.user_id = $3 AND p.is_hidden = false AND p.parent_id IS NULL`;

        const values = [limit, offset, userId];
        let paramCount = 4;

        if (contentType) {
            query += ` AND p.content_type = $${paramCount}`;
            values.push(contentType);
            paramCount++;
        } else {
            // If no specific content type is requested, show posts, polls, and upcoming events
            query += ` AND p.content_type IN ('post', 'poll', 'event')`;
        }

        if (supportersOnly !== null) {
            query += ` AND p.is_supporters_only = $${paramCount}`;
            values.push(supportersOnly);
            paramCount++;
        }

        // Exclude events that have already ended
        query += ` AND (p.content_type != 'event' OR e.end_time IS NULL OR e.end_time > NOW())`;

        query += ` ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`;

        const result = await db.query(query, values);

        // Add startingIn for event posts
        const postsWithStartingIn = result.rows.map(post => {
            if (post.content_type === 'event' && post.event_data && post.event_data.start_time) {
                const now = new Date();
                const startTime = new Date(post.event_data.start_time);
                const secondsUntilStart = Math.floor((startTime - now) / 1000);
                post.event_data.starting_in = this._formatTimeUntil(secondsUntilStart);
            }
            return post;
        });

        return postsWithStartingIn;
    }

    async findRepliesByPostId(postId, options = {}) {
        const { limit = 20, offset = 0, userId = null } = options;

        const query = `
            SELECT
                p.*,
                json_build_object(
                    'id', u.id,
                    'full_name', u.full_name,
                    'unique_url', u.unique_url,
                    'profile_image', (
                        SELECT json_build_object(
                            'id', i.id,
                            'provider', i.provider,
                            'key', i.key,
                            'alt_text', i.alt_text
                        )
                        FROM images i
                        WHERE i.entity_type = 'user' AND i.entity_id = u.id AND i.image_type = 'profile'
                        LIMIT 1
                    )
                ) as user,
                c.name as community_name,
                c.unique_url as community_url,
                (
                SELECT COUNT(*)
                FROM post_reactions
                WHERE post_id = p.id AND reaction_type = 'like'
                ) as likes_count,
                (
                SELECT EXISTS(
                    SELECT 1
                    FROM post_reactions
                    WHERE post_id = p.id AND user_id = $4 AND reaction_type = 'like'
                )
                ) as user_has_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN communities c ON p.community_id = c.id
            WHERE p.parent_id = $1 AND p.is_hidden = false
            ORDER BY p.created_at ASC
            LIMIT $2 OFFSET $3`;

        const result = await db.query(query, [
            postId,
            limit,
            offset,
            userId || null,
        ]);
        return result.rows;
    }

    async countCommunityPosts(communityId, filters = {}) {
        const { contentType = null, supportersOnly = null } = filters;

        let query = `
            SELECT COUNT(*)
            FROM posts p
            LEFT JOIN events e ON p.content_type = 'event' AND e.post_id = p.id
            WHERE p.community_id = $1 AND p.is_hidden = false AND p.parent_id IS NULL`;

        const values = [communityId];
        let paramCount = 2;

        if (contentType) {
            query += ` AND p.content_type = $${paramCount}`;
            values.push(contentType);
            paramCount++;
        } else {
            query += ` AND p.content_type IN ('post', 'poll', 'event')`;
        }

        if (supportersOnly !== null) {
            query += ` AND p.is_supporters_only = $${paramCount}`;
            values.push(supportersOnly);
            paramCount++;
        }

        // Exclude events that have already ended
        query += ` AND (p.content_type != 'event' OR e.end_time IS NULL OR e.end_time > NOW())`;

        const result = await db.query(query, values);
        return parseInt(result.rows[0].count, 10);
    }

    async countReplies(postId) {
        const query =
            "SELECT COUNT(*) FROM posts WHERE parent_id = $1 AND is_hidden = false";
        const result = await db.query(query, [postId]);
        return parseInt(result.rows[0].count, 10);
    }

    async isUserAuthorized(userId, communityId) {
        const query = `
            SELECT EXISTS (
                SELECT 1 FROM community_members 
                WHERE user_id = $1 AND community_id = $2
            ) as is_member`;

        const result = await db.query(query, [userId, communityId]);
        return result.rows[0].is_member;
    }

    async isSupporterAccessible(postId, userId) {
        const query = `
            SELECT 
                p.is_supporters_only,
                EXISTS (
                SELECT 1 FROM user_community_supports
                WHERE user_id = $2 AND community_id = p.community_id AND status = 'active'
                ) as is_supporter,
                p.user_id = $2 as is_author
            FROM posts p
            WHERE p.id = $1`;

        const result = await db.query(query, [postId, userId]);

        if (result.rows.length === 0) {
            return false;
        }

        const { is_supporters_only, is_supporter, is_author } = result.rows[0];

        // If post is not supporters-only, or user is the author or a supporter
        return !is_supporters_only || is_author || is_supporter;
    }

    async getPostImages(postId) {
        const query = `
            SELECT id, image_type, position, provider, key, alt_text, created_at
            FROM images
            WHERE entity_type = 'post' AND entity_id = $1
            ORDER BY position ASC`;

        const result = await db.query(query, [postId]);
        return result.rows;
    }
}

module.exports = new PostModel();
