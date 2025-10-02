// src/message/controllers/message.controller.js

const MessageService = require('../services/message.service');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

class MessageController {
    /**
     * Send a message
     */
    static sendMessage = catchAsync(async (req, res) => {
        const senderId = req.user.id;
        const { recipientType, recipientId, content, parentMessageId } = req.body;

        const message = await MessageService.sendMessage({
            senderId,
            recipientType,
            recipientId,
            content,
            parentMessageId
        });

        res.status(201).json({
            status: 'success',
            data: {
                message
            }
        });
    });

    /**
     * Get a conversation (user-to-user or user-to-community)
     */
    static getConversation = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { recipientType, recipientId } = req.params;
        const { limit, offset, beforeMessageId } = req.query;

        const options = {
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        };

        if (beforeMessageId) {
            options.beforeMessageId = parseInt(beforeMessageId);
        }

        const messages = await MessageService.getConversation(
            userId,
            recipientType,
            parseInt(recipientId),
            options
        );

        res.json({
            status: 'success',
            data: {
                messages,
                pagination: {
                    limit: options.limit,
                    offset: options.offset,
                    hasMore: messages.length === options.limit
                }
            }
        });
    });

    /**
     * Get all conversations for the current user
     */
    static getUserConversations = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { limit, offset } = req.query;

        const options = {
            limit: limit ? parseInt(limit) : 20,
            offset: offset ? parseInt(offset) : 0
        };

        const conversations = await MessageService.getUserConversations(userId, options);

        res.json({
            status: 'success',
            data: {
                conversations,
                pagination: {
                    limit: options.limit,
                    offset: options.offset,
                    hasMore: conversations.length === options.limit
                }
            }
        });
    });

    /**
     * Mark a message as read
     */
    static markMessageAsRead = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { messageId } = req.params;

        const message = await MessageService.markMessageAsRead(parseInt(messageId), userId);

        if (!message) {
            throw new ApiError(404, 'Message not found or you don\'t have permission to mark it as read');
        }

        res.json({
            status: 'success',
            data: {
                message
            }
        });
    });

    /**
     * Mark all messages in a conversation as read
     */
    static markConversationAsRead = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { recipientType, recipientId } = req.body;

        const result = await MessageService.markConversationAsRead(
            userId,
            recipientType,
            parseInt(recipientId)
        );

        res.json({
            status: 'success',
            data: {
                updatedCount: result.updated_count || 0
            }
        });
    });

    /**
     * Delete a message (soft delete)
     */
    static deleteMessage = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { messageId } = req.params;

        const message = await MessageService.deleteMessage(parseInt(messageId), userId);

        if (!message) {
            throw new ApiError(404, 'Message not found or you don\'t have permission to delete it');
        }

        res.json({
            status: 'success',
            data: {
                message
            }
        });
    });

    /**
     * Get unread message count for the current user
     */
    static getUnreadCount = catchAsync(async (req, res) => {
        const userId = req.user.id;

        const unreadCount = await MessageService.getUnreadCount(userId);

        res.json({
            status: 'success',
            data: {
                unreadCount
            }
        });
    });

    /**
     * Send typing indicator
     */
    static sendTypingIndicator = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { recipientType, recipientId, isTyping } = req.body;

        // Validate permissions first
        const hasPermission = await MessageService.validateMessagePermissions(
            userId,
            recipientType,
            parseInt(recipientId)
        );

        if (!hasPermission) {
            throw new ApiError(403, 'You don\'t have permission to send typing indicators to this recipient');
        }

        MessageService.sendTypingIndicator(
            userId,
            recipientType,
            parseInt(recipientId),
            isTyping
        );

        res.json({
            status: 'success',
            data: {
                message: 'Typing indicator sent'
            }
        });
    });

    /**
     * Search messages in conversations
     */
    static searchMessages = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { query, recipientType, recipientId, limit } = req.query;

        if (!query || query.trim().length < 2) {
            throw new ApiError(400, 'Search query must be at least 2 characters long');
        }

        // This is a basic implementation - you might want to implement full-text search
        // For now, we'll get the conversation and filter by content
        const options = {
            limit: limit ? parseInt(limit) : 50,
            offset: 0
        };

        let messages = [];

        if (recipientType && recipientId) {
            messages = await MessageService.getConversation(
                userId,
                recipientType,
                parseInt(recipientId),
                { limit: 200 } // Get more messages for search
            );
        }

        // Simple text search - you might want to implement proper full-text search
        const searchResults = messages.filter(message =>
            message.content.toLowerCase().includes(query.toLowerCase())
        ).slice(0, options.limit);

        res.json({
            status: 'success',
            data: {
                messages: searchResults,
                query: query.trim(),
                count: searchResults.length
            }
        });
    });
}

module.exports = MessageController;