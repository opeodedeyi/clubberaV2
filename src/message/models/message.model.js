// src/message/models/message.model.js

const db = require("../../config/db");

class MessageModel {
    // Create a new message
    static async create(messageData) {
        const {
            senderId,
            recipientType,
            recipientId,
            content,
            parentMessageId = null,
        } = messageData;

        const query = {
            text: `
                INSERT INTO messages(
                    sender_id,
                    recipient_type,
                    recipient_id,
                    content,
                    parent_message_id
                )
                VALUES($1, $2, $3, $4, $5)
                RETURNING *
            `,
            values: [
                senderId,
                recipientType,
                recipientId,
                content,
                parentMessageId,
            ],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    // Find a message by ID with sender information
    static async findById(messageId, userId = null) {
        let query;

        if (userId) {
            // Only return message if user has access (sender, recipient, or community member)
            query = {
                text: `
                    SELECT m.*,
                           sender.full_name as sender_name,
                           sender.unique_url as sender_unique_url
                    FROM messages m
                    LEFT JOIN users sender ON m.sender_id = sender.id
                    WHERE m.id = $1
                    AND m.is_deleted = false
                    AND (
                        m.sender_id = $2
                        OR (m.recipient_type = 'user' AND m.recipient_id = $2)
                        OR (m.recipient_type = 'community' AND EXISTS(
                            SELECT 1 FROM community_members cm
                            WHERE cm.community_id = m.recipient_id AND cm.user_id = $2
                        ))
                    )
                `,
                values: [messageId, userId],
            };
        } else {
            query = {
                text: `
                    SELECT m.*,
                           sender.full_name as sender_name,
                           sender.unique_url as sender_unique_url
                    FROM messages m
                    LEFT JOIN users sender ON m.sender_id = sender.id
                    WHERE m.id = $1 AND m.is_deleted = false
                `,
                values: [messageId],
            };
        }

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    // Find messages in a conversation between two users
    static async findUserConversation(userId, otherUserId, options = {}) {
        const { limit = 50, offset = 0, beforeMessageId = null } = options;

        let whereConditions = [
            "recipient_type = $3",
            "is_deleted = false",
            "((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))",
        ];
        let values = [userId, otherUserId, "user"];
        let paramCount = 3;

        if (beforeMessageId) {
            whereConditions.push(`id < $${++paramCount}`);
            values.push(beforeMessageId);
        }

        const query = {
            text: `
                SELECT m.*,
                       sender.full_name as sender_name,
                       sender.unique_url as sender_unique_url
                FROM messages m
                LEFT JOIN users sender ON m.sender_id = sender.id
                WHERE ${whereConditions.join(" AND ")}
                ORDER BY m.created_at DESC
                LIMIT $${++paramCount} OFFSET $${++paramCount}
            `,
            values: [...values, limit, offset],
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }

    // Find messages in a community conversation
    static async findCommunityConversation(communityId, userId, options = {}) {
        const { limit = 50, offset = 0, beforeMessageId = null } = options;

        // First verify user is a member of the community
        const memberCheck = await db.query(
            "SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2",
            [communityId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return []; // User is not a member
        }

        let whereConditions = [
            "recipient_type = $1",
            "recipient_id = $2",
            "is_deleted = false",
        ];
        let values = ["community", communityId];
        let paramCount = 2;

        if (beforeMessageId) {
            whereConditions.push(`id < $${++paramCount}`);
            values.push(beforeMessageId);
        }

        const query = {
            text: `
                SELECT m.*,
                       sender.full_name as sender_name,
                       sender.unique_url as sender_unique_url,
                       cm.role as sender_role
                FROM messages m
                LEFT JOIN users sender ON m.sender_id = sender.id
                LEFT JOIN community_members cm ON m.sender_id = cm.user_id AND m.recipient_id = cm.community_id
                WHERE ${whereConditions.join(" AND ")}
                ORDER BY m.created_at DESC
                LIMIT $${++paramCount} OFFSET $${++paramCount}
            `,
            values: [...values, limit, offset],
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }

    // Get all conversations for a user
    static async findUserConversations(userId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const query = {
            text: `
                WITH latest_messages AS (
                    SELECT DISTINCT ON (
                        CASE
                            WHEN recipient_type = 'user' THEN
                                CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END
                            WHEN recipient_type = 'community' THEN recipient_id
                        END,
                        recipient_type
                    )
                    m.*,
                    CASE
                        WHEN recipient_type = 'user' THEN
                            CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END
                        WHEN recipient_type = 'community' THEN recipient_id
                    END as conversation_with_id
                    FROM messages m
                    WHERE (
                        (recipient_type = 'user' AND (sender_id = $1 OR recipient_id = $1))
                        OR
                        (recipient_type = 'community' AND (
                            sender_id = $1 OR EXISTS(
                                SELECT 1 FROM community_members cm
                                WHERE cm.community_id = m.recipient_id AND cm.user_id = $1
                                AND cm.role IN ('owner', 'organizer', 'moderator')
                            )
                        ))
                    )
                    AND is_deleted = false
                    ORDER BY conversation_with_id, recipient_type, created_at DESC
                )
                SELECT
                    lm.*,
                    lm.conversation_with_id as conversation_recipient_id,
                    CASE
                        WHEN lm.recipient_type = 'user' THEN 'direct'
                        WHEN lm.recipient_type = 'community' THEN 'community'
                    END as message_type,
                    CASE
                        WHEN lm.recipient_type = 'user' THEN u.full_name
                        WHEN lm.recipient_type = 'community' THEN c.name
                    END as conversation_name,
                    CASE
                        WHEN lm.recipient_type = 'user' THEN u.unique_url
                        WHEN lm.recipient_type = 'community' THEN c.unique_url
                    END as conversation_url,
                    CASE
                        WHEN lm.recipient_type = 'user' THEN
                            CASE WHEN user_img.id IS NOT NULL THEN
                                json_build_object(
                                    'id', user_img.id,
                                    'provider', user_img.provider,
                                    'key', user_img.key,
                                    'alt_text', user_img.alt_text
                                )
                            ELSE NULL END
                        WHEN lm.recipient_type = 'community' THEN
                            CASE WHEN comm_img.id IS NOT NULL THEN
                                json_build_object(
                                    'id', comm_img.id,
                                    'provider', comm_img.provider,
                                    'key', comm_img.key,
                                    'alt_text', comm_img.alt_text
                                )
                            ELSE NULL END
                    END as conversation_profile_image,
                    sender.full_name as sender_name,
                    COALESCE(unread.unread_count, 0) as unread_count
                FROM latest_messages lm
                LEFT JOIN users u ON lm.recipient_type = 'user' AND lm.conversation_with_id = u.id
                LEFT JOIN communities c ON lm.recipient_type = 'community' AND lm.conversation_with_id = c.id
                LEFT JOIN users sender ON lm.sender_id = sender.id
                LEFT JOIN images user_img ON lm.recipient_type = 'user' AND user_img.entity_type = 'user' AND user_img.entity_id = lm.conversation_with_id AND user_img.image_type = 'profile'
                LEFT JOIN images comm_img ON lm.recipient_type = 'community' AND comm_img.entity_type = 'community' AND comm_img.entity_id = lm.conversation_with_id AND comm_img.image_type = 'profile'
                LEFT JOIN (
                    SELECT
                        CASE
                            WHEN recipient_type = 'user' THEN
                                CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END
                            WHEN recipient_type = 'community' THEN recipient_id
                        END as conv_id,
                        recipient_type,
                        COUNT(*) as unread_count
                    FROM messages
                    WHERE (
                        (recipient_type = 'user' AND recipient_id = $1 AND sender_id != $1)
                        OR
                        (recipient_type = 'community' AND EXISTS(
                            SELECT 1 FROM community_members cm
                            WHERE cm.community_id = messages.recipient_id AND cm.user_id = $1
                            AND cm.role IN ('owner', 'organizer', 'moderator')
                        ) AND sender_id != $1)
                    )
                    AND is_read = false AND is_deleted = false
                    GROUP BY conv_id, recipient_type
                ) unread ON unread.conv_id = lm.conversation_with_id AND unread.recipient_type = lm.recipient_type
                ORDER BY lm.created_at DESC
                LIMIT $2 OFFSET $3
            `,
            values: [userId, limit, offset],
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }

    // Mark a message as read
    static async markAsRead(messageId, userId) {
        const query = {
            text: `
                UPDATE messages
                SET is_read = true, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                AND (
                    (recipient_type = 'user' AND recipient_id = $2)
                    OR (recipient_type = 'community' AND EXISTS(
                        SELECT 1 FROM community_members cm
                        WHERE cm.community_id = messages.recipient_id AND cm.user_id = $2
                    ))
                )
                AND sender_id != $2
                RETURNING *
            `,
            values: [messageId, userId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    // Mark all messages in a conversation as read
    static async markConversationAsRead(userId, recipientType, recipientId) {
        let query;

        if (recipientType === "user") {
            // Mark direct conversation as read
            query = {
                text: `
                    UPDATE messages
                    SET is_read = true, updated_at = CURRENT_TIMESTAMP
                    WHERE recipient_type = 'user'
                    AND recipient_id = $1
                    AND sender_id = $2
                    AND is_read = false AND is_deleted = false
                `,
                values: [userId, recipientId],
            };
        } else if (recipientType === "community") {
            // Mark community conversation as read
            query = {
                text: `
                    UPDATE messages
                    SET is_read = true, updated_at = CURRENT_TIMESTAMP
                    WHERE recipient_type = 'community'
                    AND recipient_id = $1
                    AND EXISTS(
                        SELECT 1 FROM community_members cm
                        WHERE cm.community_id = $1 AND cm.user_id = $2
                    )
                    AND sender_id != $2
                    AND is_read = false AND is_deleted = false
                `,
                values: [recipientId, userId],
            };
        } else {
            throw new Error("Invalid recipient type");
        }

        const result = await db.query(query.text, query.values);
        return { updated_count: result.rowCount };
    }

    // Soft delete a message
    static async softDelete(messageId, userId) {
        const query = {
            text: `
                UPDATE messages
                SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND sender_id = $2
                RETURNING *
            `,
            values: [messageId, userId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    // Get unread message count for a user
    static async getUnreadCount(userId) {
        const query = {
            text: `
                SELECT COUNT(*) as count
                FROM messages m
                WHERE (
                    (m.recipient_type = 'user' AND m.recipient_id = $1)
                    OR
                    (m.recipient_type = 'community' AND EXISTS(
                        SELECT 1 FROM community_members cm
                        WHERE cm.community_id = m.recipient_id AND cm.user_id = $1
                    ))
                )
                AND m.sender_id != $1
                AND m.is_read = false AND m.is_deleted = false
            `,
            values: [userId],
        };

        const result = await db.query(query.text, query.values);
        return parseInt(result.rows[0].count);
    }

    // Check if a user can message another user (they must share a community)
    static async canUserMessage(senderId, recipientId) {
        const query = {
            text: `
                SELECT EXISTS(
                    SELECT 1
                    FROM community_members cm1
                    JOIN community_members cm2 ON cm1.community_id = cm2.community_id
                    WHERE cm1.user_id = $1 AND cm2.user_id = $2
                ) as can_message
            `,
            values: [senderId, recipientId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0].can_message;
    }

    // Check if a user can message a community (they must be a member)
    static async canUserMessageCommunity(senderId, communityId) {
        const query = {
            text: `
                SELECT EXISTS(
                    SELECT 1
                    FROM community_members cm
                    WHERE cm.user_id = $1 AND cm.community_id = $2
                ) as can_message
            `,
            values: [senderId, communityId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0].can_message;
    }
}

module.exports = MessageModel;
