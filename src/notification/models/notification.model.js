// src/notification/models/notification.model.js

const db = require("../../config/db");

class NotificationModel {
    // Create a new notification
    static async create(notificationData) {
        const {
            userId,
            type,
            triggerEntityType,
            triggerEntityId,
            actorUserId = null,
            title,
            message = null,
            metadata = {}
        } = notificationData;

        const query = {
            text: `
                INSERT INTO notifications(
                    user_id,
                    type,
                    trigger_entity_type,
                    trigger_entity_id,
                    actor_user_id,
                    title,
                    message,
                    metadata
                )
                VALUES($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `,
            values: [
                userId,
                type,
                triggerEntityType,
                triggerEntityId,
                actorUserId,
                title,
                message,
                JSON.stringify(metadata)
            ]
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    // Create multiple notifications for multiple users
    static async createBulk(notifications) {
        if (!notifications || notifications.length === 0) {
            return [];
        }

        const values = [];
        const placeholders = [];

        notifications.forEach((notification, index) => {
            const offset = index * 8;
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
            );

            values.push(
                notification.userId,
                notification.type,
                notification.triggerEntityType,
                notification.triggerEntityId,
                notification.actorUserId || null,
                notification.title,
                notification.message || null,
                JSON.stringify(notification.metadata || {})
            );
        });

        const query = {
            text: `
                INSERT INTO notifications(
                    user_id, type, trigger_entity_type, trigger_entity_id,
                    actor_user_id, title, message, metadata
                )
                VALUES ${placeholders.join(', ')}
                RETURNING *
            `,
            values: values
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }

    // Get notifications for a user (with grouping)
    static async findByUserId(userId, options = {}) {
        const { limit = 50, offset = 0, unreadOnly = false, grouped = true } = options;

        let whereConditions = ["user_id = $1"];
        let values = [userId];
        let paramCount = 1;

        if (unreadOnly) {
            whereConditions.push("is_read = false");
        }

        const query = {
            text: `
                SELECT
                    n.*,
                    actor.full_name as actor_name,
                    actor.unique_url as actor_url
                FROM notifications n
                LEFT JOIN users actor ON n.actor_user_id = actor.id
                WHERE ${whereConditions.join(" AND ")}
                ORDER BY n.created_at DESC
                LIMIT $${++paramCount} OFFSET $${++paramCount}
            `,
            values: [...values, limit, offset]
        };

        const result = await db.query(query.text, query.values);

        if (grouped) {
            return this.groupNotifications(result.rows);
        }

        return result.rows;
    }

    // Group similar notifications together
    static groupNotifications(notifications) {
        const grouped = [];
        const processed = new Set();
        const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        notifications.forEach((notification, index) => {
            if (processed.has(index)) return;

            // Find similar notifications within time window
            const similar = [];
            const notificationTime = new Date(notification.created_at).getTime();

            for (let i = index + 1; i < notifications.length; i++) {
                if (processed.has(i)) continue;

                const other = notifications[i];
                const otherTime = new Date(other.created_at).getTime();

                // Check if notifications should be grouped
                let shouldGroup;

                // Special grouping for messages: group by sender (actor), not message ID
                if (notification.type === 'new_message' || notification.type === 'new_community_message') {
                    shouldGroup =
                        notification.type === other.type &&
                        notification.actor_user_id === other.actor_user_id &&
                        Math.abs(notificationTime - otherTime) <= timeWindow;
                } else {
                    // Default grouping: same type, entity type, and entity ID
                    shouldGroup =
                        notification.type === other.type &&
                        notification.trigger_entity_type === other.trigger_entity_type &&
                        notification.trigger_entity_id === other.trigger_entity_id &&
                        Math.abs(notificationTime - otherTime) <= timeWindow;
                }

                if (shouldGroup) {
                    similar.push(other);
                    processed.add(i);
                }
            }

            processed.add(index);

            if (similar.length > 0) {
                // Create grouped notification
                const actors = [notification.actor_name]
                    .concat(similar.slice(0, 1).map(s => s.actor_name))
                    .filter(Boolean);

                const totalCount = similar.length + 1;
                const remainingCount = totalCount - actors.length;

                let actorText;
                if (totalCount === 2) {
                    actorText = actors.join(' and ');
                } else {
                    actorText = `${actors[0]}, ${actors[1]} and ${remainingCount} ${remainingCount === 1 ? 'other' : 'others'}`;
                }

                // Smart title generation based on notification type
                let groupedTitle;
                let groupedMessage;

                if (notification.type === 'new_message' || notification.type === 'new_community_message') {
                    // Message notifications: show count from same sender
                    groupedTitle = `${totalCount} new messages`;
                    groupedMessage = `You have received ${totalCount} new messages from ${notification.actor_name}`;
                } else if (notification.title.includes('from')) {
                    // Message-type notifications: "New message from [actor]"
                    groupedTitle = notification.title.replace(/from .+$/, `from ${actorText}`);
                    groupedMessage = notification.message;
                } else if (notification.type === 'community_join_request') {
                    // Join requests: Replace community name pattern
                    groupedTitle = `${totalCount} join requests for ` + notification.title.replace(/^New join request for /, '');
                    groupedMessage = notification.message;
                } else if (notification.type === 'new_event' || notification.type === 'new_post') {
                    // Events/Posts: Keep original title, add count
                    groupedTitle = `${totalCount} new ${notification.type.replace('new_', '')}s`;
                    groupedMessage = notification.message;
                } else {
                    // Default: Add actor text to beginning
                    groupedTitle = `${actorText}: ${notification.title}`;
                    groupedMessage = notification.message;
                }

                grouped.push({
                    id: `grouped_${notification.id}`,
                    type: notification.type,
                    trigger_entity_type: notification.trigger_entity_type,
                    trigger_entity_id: notification.trigger_entity_id,
                    title: groupedTitle,
                    message: groupedMessage,
                    metadata: notification.metadata,
                    is_read: notification.is_read && similar.every(s => s.is_read),
                    created_at: notification.created_at,
                    is_grouped: true,
                    count: totalCount,
                    actors: actors,
                    actor_ids: [notification.actor_user_id].concat(similar.map(s => s.actor_user_id)).filter(Boolean),
                    notification_ids: [notification.id].concat(similar.map(s => s.id))
                });
            } else {
                // Single notification
                grouped.push({
                    ...notification,
                    is_grouped: false,
                    count: 1
                });
            }
        });

        return grouped;
    }

    // Get unread count for a user
    static async getUnreadCount(userId) {
        const query = {
            text: `
                SELECT COUNT(*) as count
                FROM notifications
                WHERE user_id = $1 AND is_read = false
            `,
            values: [userId]
        };

        const result = await db.query(query.text, query.values);
        return parseInt(result.rows[0].count);
    }

    // Mark a notification as read
    static async markAsRead(notificationId, userId) {
        const query = {
            text: `
                UPDATE notifications
                SET is_read = true
                WHERE id = $1 AND user_id = $2
                RETURNING *
            `,
            values: [notificationId, userId]
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    // Mark all notifications as read for a user
    static async markAllAsRead(userId) {
        const query = {
            text: `
                UPDATE notifications
                SET is_read = true
                WHERE user_id = $1 AND is_read = false
            `,
            values: [userId]
        };

        const result = await db.query(query.text, query.values);
        return { updated_count: result.rowCount };
    }

    // Mark multiple notifications as read (for grouped notifications)
    static async markMultipleAsRead(notificationIds, userId) {
        const query = {
            text: `
                UPDATE notifications
                SET is_read = true
                WHERE id = ANY($1) AND user_id = $2 AND is_read = false
            `,
            values: [notificationIds, userId]
        };

        const result = await db.query(query.text, query.values);
        return { updated_count: result.rowCount };
    }

    // Delete old notifications (cleanup)
    static async deleteOld(daysOld = 30) {
        const query = {
            text: `
                DELETE FROM notifications
                WHERE created_at < NOW() - INTERVAL '$1 days'
            `,
            values: [daysOld]
        };

        const result = await db.query(query.text, query.values);
        return { deleted_count: result.rowCount };
    }

    // Find notification by ID
    static async findById(notificationId, userId = null) {
        let query;

        if (userId) {
            // Only return if user owns the notification
            query = {
                text: `
                    SELECT
                        n.*,
                        actor.full_name as actor_name,
                        actor.unique_url as actor_url
                    FROM notifications n
                    LEFT JOIN users actor ON n.actor_user_id = actor.id
                    WHERE n.id = $1 AND n.user_id = $2
                `,
                values: [notificationId, userId]
            };
        } else {
            query = {
                text: `
                    SELECT
                        n.*,
                        actor.full_name as actor_name,
                        actor.unique_url as actor_url
                    FROM notifications n
                    LEFT JOIN users actor ON n.actor_user_id = actor.id
                    WHERE n.id = $1
                `,
                values: [notificationId]
            };
        }

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    // Get notifications by trigger entity (for debugging/admin)
    static async findByTriggerEntity(triggerEntityType, triggerEntityId) {
        const query = {
            text: `
                SELECT
                    n.*,
                    u.full_name as recipient_name,
                    actor.full_name as actor_name
                FROM notifications n
                LEFT JOIN users u ON n.user_id = u.id
                LEFT JOIN users actor ON n.actor_user_id = actor.id
                WHERE n.trigger_entity_type = $1 AND n.trigger_entity_id = $2
                ORDER BY n.created_at DESC
            `,
            values: [triggerEntityType, triggerEntityId]
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }
}

module.exports = NotificationModel;