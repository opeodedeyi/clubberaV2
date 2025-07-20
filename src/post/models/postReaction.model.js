// src/post/models/postReaction.model.js
const db = require("../../config/db");

class PostReactionModel {
    async addReaction(postId, userId, reactionType = "like") {
        try {
            const query = `
                INSERT INTO post_reactions (post_id, user_id, reaction_type)
                VALUES ($1, $2, $3)
                RETURNING *`;

            const result = await db.query(query, [
                postId,
                userId,
                reactionType,
            ]);
            return result.rows[0];
        } catch (error) {
            // Handle unique constraint violation (user already reacted)
            if (error.code === "23505") {
                return { alreadyExists: true };
            }
            throw error;
        }
    }

    async removeReaction(postId, userId, reactionType = "like") {
        const query = `
            DELETE FROM post_reactions
            WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3
            RETURNING *`;

        const result = await db.query(query, [postId, userId, reactionType]);
        return result.rows[0];
    }

    async getReactionsByPostId(postId, options = {}) {
        const { limit = 50, offset = 0, reactionType = "like" } = options;

        const query = `
            SELECT 
                pr.*,
                u.full_name as user_name,
                u.unique_url as user_url,
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
                ) as user_image
            FROM post_reactions pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.post_id = $1 AND pr.reaction_type = $4
            ORDER BY pr.created_at DESC
            LIMIT $2 OFFSET $3`;

        const result = await db.query(query, [
            postId,
            limit,
            offset,
            reactionType,
        ]);
        return result.rows;
    }

    async countReactions(postId, reactionType = "like") {
        const query = `
            SELECT COUNT(*) 
            FROM post_reactions 
            WHERE post_id = $1 AND reaction_type = $2`;

        const result = await db.query(query, [postId, reactionType]);
        return parseInt(result.rows[0].count, 10);
    }

    async hasUserReacted(postId, userId, reactionType = "like") {
        const query = `
            SELECT EXISTS (
                SELECT 1 
                FROM post_reactions 
                WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3
            ) as has_reacted`;

        const result = await db.query(query, [postId, userId, reactionType]);
        return result.rows[0].has_reacted;
    }
}

module.exports = new PostReactionModel();
