// src/notification/services/notification.service.js

const NotificationModel = require("../models/notification.model");
const { socketManager } = require("../../config/socket");

class NotificationService {
    // Create a single notification
    static async createNotification(notificationData) {
        const notification = await NotificationModel.create(notificationData);

        // Send real-time notification via Socket.IO
        this.sendRealTimeNotification(notification);

        return notification;
    }

    // Create multiple notifications (bulk)
    static async createBulkNotifications(notifications) {
        const createdNotifications = await NotificationModel.createBulk(
            notifications
        );

        // Send real-time notifications for all
        createdNotifications.forEach((notification) => {
            this.sendRealTimeNotification(notification);
        });

        return createdNotifications;
    }

    // Get user notifications
    static async getUserNotifications(userId, options = {}) {
        return await NotificationModel.findByUserId(userId, options);
    }

    // Get unread count
    static async getUnreadCount(userId) {
        return await NotificationModel.getUnreadCount(userId);
    }

    // Mark notification as read (supports grouped notifications)
    static async markAsRead(notificationId, userId) {
        // Check if this is a grouped notification
        if (
            typeof notificationId === "string" &&
            notificationId.startsWith("grouped_")
        ) {
            // Extract notification IDs from grouped notification
            // This requires the client to send the notification_ids array
            // Or we can fetch the group and mark all
            throw new Error("Use markMultipleAsRead for grouped notifications");
        }
        return await NotificationModel.markAsRead(notificationId, userId);
    }

    // Mark multiple notifications as read (for grouped notifications)
    static async markMultipleAsRead(notificationIds, userId) {
        return await NotificationModel.markMultipleAsRead(
            notificationIds,
            userId
        );
    }

    // Mark all notifications as read
    static async markAllAsRead(userId) {
        return await NotificationModel.markAllAsRead(userId);
    }

    // Send real-time notification via Socket.IO
    static sendRealTimeNotification(notification) {
        try {
            if (socketManager.io) {
                socketManager.io
                    .to(`user_${notification.user_id}`)
                    .emit("new_notification", {
                        notification: notification,
                    });
            }
        } catch (error) {
            console.error("Error sending real-time notification:", error);
        }
    }

    // Helper methods for specific notification types

    // Message notifications
    static async notifyNewMessage(messageData) {
        const { senderId, recipientId, messageId, senderName } = messageData;

        return await this.createNotification({
            userId: recipientId,
            type: "new_message",
            triggerEntityType: "message",
            triggerEntityId: messageId,
            actorUserId: senderId,
            title: `New message`,
            message: `You have received a new message from ${senderName}`,
            metadata: {
                senderId: senderId,
                messageId: messageId,
            },
        });
    }

    // Community message notifications
    static async notifyNewCommunityMessage(messageData) {
        const { senderId, communityId, messageId, senderName, communityName } =
            messageData;

        // Get community owners, organizers, and moderators
        const db = require("../../config/db");
        const result = await db.query(
            `
            SELECT user_id
            FROM community_members
            WHERE community_id = $1 AND role IN ('owner', 'organizer', 'moderator')
            AND user_id != $2
        `,
            [communityId, senderId]
        );

        const notifications = result.rows.map((row) => ({
            userId: row.user_id,
            type: "new_community_message",
            triggerEntityType: "message",
            triggerEntityId: messageId,
            actorUserId: senderId,
            title: `New message`,
            message: `${senderName} from the community ${communityName} sent you a message`,
            metadata: {
                senderId: senderId,
                communityId: communityId,
                messageId: messageId,
                communityName: communityName,
            },
        }));

        return await this.createBulkNotifications(notifications);
    }

    // Event notifications
    static async notifyNewEvent(eventData) {
        const { creatorId, communityId, eventId, eventTitle, communityName } =
            eventData;

        // Get all community members
        const db = require("../../config/db");
        const result = await db.query(
            `
            SELECT user_id
            FROM community_members
            WHERE community_id = $1 AND user_id != $2
        `,
            [communityId, creatorId]
        );

        const notifications = result.rows.map((row) => ({
            userId: row.user_id,
            type: "new_event",
            triggerEntityType: "event",
            triggerEntityId: eventId,
            actorUserId: creatorId,
            title: `New event: ${eventTitle}`,
            message: `A new event has been created in ${communityName}`,
            metadata: {
                eventId: eventId,
                communityId: communityId,
                eventTitle: eventTitle,
                communityName: communityName,
            },
        }));

        return await this.createBulkNotifications(notifications);
    }

    // Community join request notifications
    static async notifyJoinRequest(requestData) {
        const { userId, communityId, communityName, requesterName } =
            requestData;

        // Get community owners, organizers, and moderators
        const db = require("../../config/db");
        const result = await db.query(
            `
            SELECT user_id
            FROM community_members
            WHERE community_id = $1 AND role IN ('owner', 'organizer', 'moderator')
        `,
            [communityId]
        );

        const notifications = result.rows.map((row) => ({
            userId: row.user_id,
            type: "community_join_request",
            triggerEntityType: "community",
            triggerEntityId: communityId,
            actorUserId: userId,
            title: `Community join request`,
            message: `${requesterName} wants to join ${communityName}`,
            metadata: {
                requesterId: userId,
                communityId: communityId,
                communityName: communityName,
                requesterName: requesterName,
            },
        }));

        return await this.createBulkNotifications(notifications);
    }

    // Join request response notifications
    static async notifyJoinRequestResponse(responseData) {
        const { userId, communityId, communityName, approved } = responseData;

        const type = approved
            ? "join_request_approved"
            : "join_request_rejected";
        const title = approved
            ? `Welcome to ${communityName}!`
            : `Join request declined for ${communityName}`;
        const message = approved
            ? `Your request to join ${communityName} has been approved`
            : `Your request to join ${communityName} has been declined`;

        return await this.createNotification({
            userId: userId,
            type: type,
            triggerEntityType: "community",
            triggerEntityId: communityId,
            actorUserId: null, // System notification
            title: title,
            message: message,
            metadata: {
                communityId: communityId,
                communityName: communityName,
                approved: approved,
            },
        });
    }

    // Post notifications
    static async notifyNewPost(postData) {
        const {
            authorId,
            communityId,
            postId,
            content,
            communityName,
            authorName,
        } = postData;

        // Get all community members
        const db = require("../../config/db");
        const result = await db.query(
            `
            SELECT user_id
            FROM community_members
            WHERE community_id = $1 AND user_id != $2
        `,
            [communityId, authorId]
        );

        const notifications = result.rows.map((row) => ({
            userId: row.user_id,
            type: "new_post",
            triggerEntityType: "post",
            triggerEntityId: postId,
            actorUserId: authorId,
            title: `New post in ${communityName}`,
            message: `${authorName}: ${
                content.length > 100
                    ? content.substring(0, 100) + "..."
                    : content
            }`,
            metadata: {
                postId: postId,
                communityId: communityId,
                communityName: communityName,
                authorName: authorName,
            },
        }));

        return await this.createBulkNotifications(notifications);
    }

    // Community announcement
    static async notifyAnnouncement(announcementData) {
        const { communityId, title, message, communityName } = announcementData;

        // Get all community members
        const db = require("../../config/db");
        const result = await db.query(
            `
            SELECT user_id
            FROM community_members
            WHERE community_id = $1
        `,
            [communityId]
        );

        const notifications = result.rows.map((row) => ({
            userId: row.user_id,
            type: "community_announcement",
            triggerEntityType: "community",
            triggerEntityId: communityId,
            actorUserId: null, // System notification
            title: `Announcement: ${title}`,
            message: message,
            metadata: {
                communityId: communityId,
                communityName: communityName,
                announcementTitle: title,
            },
        }));

        return await this.createBulkNotifications(notifications);
    }

    // Cleanup old notifications
    static async cleanupOldNotifications(daysOld = 30) {
        return await NotificationModel.deleteOld(daysOld);
    }
}

module.exports = NotificationService;
