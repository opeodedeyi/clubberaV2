// src/message/validators/message.validator.js

const { body, param, query } = require('express-validator');

class MessageValidator {
    /**
     * Validation rules for sending a message
     */
    static validateSendMessage = [
        body('recipientType')
            .isIn(['user', 'community'])
            .withMessage('Recipient type must be either "user" or "community"'),

        body('recipientId')
            .isInt({ min: 1 })
            .withMessage('Recipient ID must be a positive integer'),

        body('content')
            .isString()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage('Message content must be between 1 and 5000 characters'),

        body('parentMessageId')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('Parent message ID must be a positive integer')
    ];

    /**
     * Validation rules for getting a conversation
     */
    static validateGetConversation = [
        param('recipientType')
            .isIn(['user', 'community'])
            .withMessage('Recipient type must be either "user" or "community"'),

        param('recipientId')
            .isInt({ min: 1 })
            .withMessage('Recipient ID must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),

        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Offset must be 0 or greater'),

        query('beforeMessageId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Before message ID must be a positive integer')
    ];

    /**
     * Validation rules for getting user conversations
     */
    static validateGetUserConversations = [
        query('limit')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('Limit must be between 1 and 50'),

        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Offset must be 0 or greater')
    ];

    /**
     * Validation rules for marking a message as read
     */
    static validateMarkMessageAsRead = [
        param('messageId')
            .isInt({ min: 1 })
            .withMessage('Message ID must be a positive integer')
    ];

    /**
     * Validation rules for marking conversation as read
     */
    static validateMarkConversationAsRead = [
        body('recipientType')
            .isIn(['user', 'community'])
            .withMessage('Recipient type must be either "user" or "community"'),

        body('recipientId')
            .isInt({ min: 1 })
            .withMessage('Recipient ID must be a positive integer')
    ];

    /**
     * Validation rules for deleting a message
     */
    static validateDeleteMessage = [
        param('messageId')
            .isInt({ min: 1 })
            .withMessage('Message ID must be a positive integer')
    ];

    /**
     * Validation rules for typing indicator
     */
    static validateTypingIndicator = [
        body('recipientType')
            .isIn(['user', 'community'])
            .withMessage('Recipient type must be either "user" or "community"'),

        body('recipientId')
            .isInt({ min: 1 })
            .withMessage('Recipient ID must be a positive integer'),

        body('isTyping')
            .isBoolean()
            .withMessage('isTyping must be a boolean value')
    ];

    /**
     * Validation rules for searching messages
     */
    static validateSearchMessages = [
        query('query')
            .isString()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Search query must be between 2 and 100 characters'),

        query('recipientType')
            .optional()
            .isIn(['user', 'community'])
            .withMessage('Recipient type must be either "user" or "community"'),

        query('recipientId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Recipient ID must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('Limit must be between 1 and 50')
    ];
}

module.exports = MessageValidator;