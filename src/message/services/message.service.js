// src/message/services/message.service.js

const MessageModel = require("../models/message.model");
const { socketManager } = require("../../config/socket");
const NotificationService = require("../../notification/services/notification.service");

class MessageService {
    // Send a message
    static async sendMessage(messageData) {
        const {
            senderId,
            recipientType,
            recipientId,
            content,
            parentMessageId,
        } = messageData;

        // Validate permissions
        if (recipientType === "user") {
            const canMessage = await MessageModel.canUserMessage(
                senderId,
                recipientId
            );
            if (!canMessage) {
                throw new Error(
                    "You can only message users who share a community with you"
                );
            }
        } else if (recipientType === "community") {
            const canMessage = await MessageModel.canUserMessageCommunity(
                senderId,
                recipientId
            );
            if (!canMessage) {
                throw new Error(
                    "You must be a member of the community to send messages"
                );
            }
        } else {
            throw new Error("Invalid recipient type");
        }

        // Create the message
        const message = await MessageModel.create({
            senderId,
            recipientType,
            recipientId,
            content,
            parentMessageId,
        });

        // Get message with sender info
        const messageWithSender = await MessageModel.findById(message.id);

        // Send real-time notification
        this.sendRealTimeMessage(messageWithSender);

        // Create persistent notification
        await this.createMessageNotification(messageWithSender);

        return messageWithSender;
    }

    // Get a conversation between user and another user or community
    static async getConversation(
        userId,
        recipientType,
        recipientId,
        options = {}
    ) {
        let result;

        if (recipientType === "user") {
            // Check if user can message this user
            const canMessage = await MessageModel.canUserMessage(
                userId,
                recipientId
            );
            if (!canMessage) {
                throw new Error(
                    "You can only view conversations with users who share a community with you"
                );
            }
            result = await MessageModel.findUserConversation(
                userId,
                recipientId,
                options
            );
        } else if (recipientType === "community") {
            result = await MessageModel.findCommunityConversation(
                recipientId,
                userId,
                options
            );
        } else {
            throw new Error("Invalid recipient type");
        }

        // Auto-mark messages as read when viewing the conversation
        await MessageModel.markConversationAsRead(userId, recipientType, recipientId);

        return result;
    }

    // Get all conversations for a user
    static async getUserConversations(userId, options = {}) {
        return await MessageModel.findUserConversations(userId, options);
    }

    // Mark a message as read
    static async markMessageAsRead(messageId, userId) {
        const message = await MessageModel.markAsRead(messageId, userId);

        if (message) {
            // Send real-time read receipt
            this.sendReadReceipt(message, userId);
        }

        return message;
    }

    // Mark all messages in a conversation as read
    static async markConversationAsRead(userId, recipientType, recipientId) {
        return await MessageModel.markConversationAsRead(
            userId,
            recipientType,
            recipientId
        );
    }

    // Delete a message (soft delete)
    static async deleteMessage(messageId, userId) {
        return await MessageModel.softDelete(messageId, userId);
    }

    // Get unread message count for a user
    static async getUnreadCount(userId) {
        return await MessageModel.getUnreadCount(userId);
    }

    // Create persistent notification for new message
    static async createMessageNotification(message) {
        try {
            if (message.recipient_type === "user") {
                // Direct message notification
                await NotificationService.notifyNewMessage({
                    senderId: message.sender_id,
                    recipientId: message.recipient_id,
                    content: message.content,
                    messageId: message.id,
                    senderName: message.sender_name
                });
            } else if (message.recipient_type === "community") {
                // Get community name
                const db = require("../../config/db");
                const result = await db.query(
                    "SELECT name FROM communities WHERE id = $1",
                    [message.recipient_id]
                );
                const communityName = result.rows[0]?.name || "Community";

                // Community message notification
                await NotificationService.notifyNewCommunityMessage({
                    senderId: message.sender_id,
                    communityId: message.recipient_id,
                    content: message.content,
                    messageId: message.id,
                    senderName: message.sender_name,
                    communityName: communityName
                });
            }
        } catch (error) {
            console.error("Error creating message notification:", error);
            // Don't throw error, as message is already saved
        }
    }

    // Send real-time message notification via Socket.IO
    static sendRealTimeMessage(message) {
        try {
            if (message.recipient_type === "user") {
                // Send to specific user
                const recipientId = message.recipient_id;

                if (socketManager.io) {
                    console.log(`[Socket.IO] Emitting new_message to user_${recipientId}`);

                    // Send notification
                    socketManager.sendNotificationToUser(recipientId, {
                        type: "new_message",
                        message: message,
                    });

                    // Also emit the new_message event
                    socketManager.io
                        .to(`user_${recipientId}`)
                        .emit("new_message", {
                            message: message,
                        });
                } else {
                    console.error("[Socket.IO] socketManager.io is undefined - Socket.IO may not be initialized yet");
                }
            } else if (message.recipient_type === "community") {
                // Send to community owners, organizers, and moderators
                const communityId = message.recipient_id;
                if (socketManager.io) {
                    console.log(`[Socket.IO] Emitting new_community_message to community_${communityId}_organizers`);
                    socketManager.io
                        .to(`community_${communityId}_organizers`)
                        .emit("new_community_message", {
                            message: message,
                        });
                } else {
                    console.error("[Socket.IO] socketManager.io is undefined - Socket.IO may not be initialized yet");
                }
            }
        } catch (error) {
            console.error("Error sending real-time message:", error);
            // Don't throw error, as message is already saved
        }
    }

    // Send read receipt via Socket.IO
    static sendReadReceipt(message, readByUserId) {
        try {
            const senderId = message.sender_id;
            if (socketManager.io && senderId !== readByUserId) {
                socketManager.io
                    .to(`user_${senderId}`)
                    .emit("message_read_receipt", {
                        messageId: message.id,
                        readBy: readByUserId,
                        readAt: new Date().toISOString(),
                    });
            }
        } catch (error) {
            console.error("Error sending read receipt:", error);
        }
    }

    // Handle typing indicators
    static sendTypingIndicator(userId, recipientType, recipientId, isTyping) {
        try {
            if (!socketManager.io) return;

            if (recipientType === "user") {
                // Send typing indicator to specific user
                socketManager.io.to(`user_${recipientId}`).emit("user_typing", {
                    userId: userId,
                    recipientType: recipientType,
                    recipientId: recipientId,
                    isTyping: isTyping,
                });
            } else if (recipientType === "community") {
                // Send typing indicator to community owners, organizers, and moderators
                socketManager.io
                    .to(`community_${recipientId}_organizers`)
                    .emit("user_typing", {
                        userId: userId,
                        recipientType: recipientType,
                        recipientId: recipientId,
                        isTyping: isTyping,
                    });
            }
        } catch (error) {
            console.error("Error sending typing indicator:", error);
        }
    }

    // Validate message permissions
    static async validateMessagePermissions(
        userId,
        recipientType,
        recipientId
    ) {
        if (recipientType === "user") {
            return await MessageModel.canUserMessage(userId, recipientId);
        } else if (recipientType === "community") {
            return await MessageModel.canUserMessageCommunity(
                userId,
                recipientId
            );
        }
        return false;
    }
}

module.exports = MessageService;
