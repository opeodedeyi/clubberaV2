// src/post/models/post.model.js
const db = require("../../config/db");

class PostModel {
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
                u.full_name as author_name,
                u.unique_url as author_url,
                (
                SELECT json_build_object(
                    'id', i.id,
                    'provider', i.provider,
                    'key', i.key,
                    'alt_text', i.alt_text
                )
                FROM images i
                WHERE i.entity_type = 'user' AND i.entity_id = u.id AND i.image_type = 'profile'
                LIMIT 1
                ) as author_image,
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
            "SELECT user_id FROM posts WHERE id = $1",
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return null;
        }

        if (postCheck.rows[0].user_id !== userId) {
            throw new Error("Unauthorized to delete this post");
        }

        // Delete the post
        const query = "DELETE FROM posts WHERE id = $1 RETURNING id";
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
                u.full_name as author_name,
                u.unique_url as author_url,
                (
                SELECT json_build_object(
                    'id', i.id,
                    'provider', i.provider,
                    'key', i.key,
                    'alt_text', i.alt_text
                )
                FROM images i
                WHERE i.entity_type = 'user' AND i.entity_id = u.id AND i.image_type = 'profile'
                LIMIT 1
                ) as author_image,
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
                ) as user_has_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.community_id = $1 AND p.is_hidden = false AND p.parent_id IS NULL
            AND p.content_type != 'event'`; // Exclude event posts

        const values = [communityId, limit, offset, userId || null];
        let paramCount = 5;

        if (contentType) {
            query += ` AND p.content_type = ${paramCount}`;
            values.push(contentType);
            paramCount++;
        } else {
            // If no specific content type is requested, show only posts and polls
            query += ` AND p.content_type IN ('post', 'poll')`;
        }

        if (supportersOnly !== null) {
            query += ` AND p.is_supporters_only = ${paramCount}`;
            values.push(supportersOnly);
            paramCount++;
        }

        query += ` ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`;

        const result = await db.query(query, values);
        return result.rows;
    }

    async findRepliesByPostId(postId, options = {}) {
        const { limit = 20, offset = 0, userId = null } = options;

        const query = `
            SELECT 
                p.*,
                u.full_name as author_name,
                u.unique_url as author_url,
                (
                SELECT json_build_object(
                    'id', i.id,
                    'provider', i.provider,
                    'key', i.key,
                    'alt_text', i.alt_text
                )
                FROM images i
                WHERE i.entity_type = 'user' AND i.entity_id = u.id AND i.image_type = 'profile'
                LIMIT 1
                ) as author_image,
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
            FROM posts 
            WHERE community_id = $1 AND is_hidden = false AND parent_id IS NULL AND content_type != 'event'`;

        const values = [communityId];
        let paramCount = 2;

        if (contentType) {
            query += ` AND content_type = ${paramCount}`;
            values.push(contentType);
            paramCount++;
        } else {
            query += ` AND content_type IN ('post', 'poll')`;
        }

        if (supportersOnly !== null) {
            query += ` AND is_supporters_only = ${paramCount}`;
            values.push(supportersOnly);
            paramCount++;
        }

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
