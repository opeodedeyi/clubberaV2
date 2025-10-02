// src/notification/validators/notification.validator.js

const { body, param, query } = require('express-validator');

class NotificationValidator {
    // Validate get notifications request
    static validateGetNotifications = [
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be an integer between 1 and 100'),
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Offset must be a non-negative integer'),
        query('unreadOnly')
            .optional()
            .isIn(['true', 'false'])
            .withMessage('unreadOnly must be "true" or "false"'),
        query('grouped')
            .optional()
            .isIn(['true', 'false'])
            .withMessage('grouped must be "true" or "false"')
    ];

    // Validate mark as read request
    static validateMarkAsRead = [
        param('notificationId')
            .isInt({ min: 1 })
            .withMessage('Notification ID must be a positive integer')
    ];

    // Validate create notification request
    static validateCreateNotification = [
        body('userId')
            .isInt({ min: 1 })
            .withMessage('User ID must be a positive integer'),
        body('type')
            .isIn([
                'new_message', 'new_community_message', 'message_reply',
                'community_join_request', 'join_request_approved', 'join_request_rejected',
                'new_event', 'event_updated', 'event_cancelled',
                'community_announcement', 'new_post', 'post_reply',
                'event_reminder', 'community_role_changed'
            ])
            .withMessage('Invalid notification type'),
        body('triggerEntityType')
            .isIn(['message', 'event', 'post', 'community', 'community_join_request'])
            .withMessage('Invalid trigger entity type'),
        body('triggerEntityId')
            .isInt({ min: 1 })
            .withMessage('Trigger entity ID must be a positive integer'),
        body('actorUserId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Actor user ID must be a positive integer'),
        body('title')
            .notEmpty()
            .isLength({ max: 255 })
            .withMessage('Title is required and must be at most 255 characters'),
        body('message')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Message must be at most 1000 characters'),
        body('metadata')
            .optional()
            .isObject()
            .withMessage('Metadata must be an object')
    ];

    // Validate bulk notifications request
    static validateCreateBulkNotifications = [
        body('notifications')
            .isArray({ min: 1, max: 100 })
            .withMessage('Notifications must be an array with 1-100 items'),
        body('notifications.*.userId')
            .isInt({ min: 1 })
            .withMessage('Each notification must have a valid user ID'),
        body('notifications.*.type')
            .isIn([
                'new_message', 'new_community_message', 'message_reply',
                'community_join_request', 'join_request_approved', 'join_request_rejected',
                'new_event', 'event_updated', 'event_cancelled',
                'community_announcement', 'new_post', 'post_reply',
                'event_reminder', 'community_role_changed'
            ])
            .withMessage('Each notification must have a valid type'),
        body('notifications.*.triggerEntityType')
            .isIn(['message', 'event', 'post', 'community', 'community_join_request'])
            .withMessage('Each notification must have a valid trigger entity type'),
        body('notifications.*.triggerEntityId')
            .isInt({ min: 1 })
            .withMessage('Each notification must have a valid trigger entity ID'),
        body('notifications.*.actorUserId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Actor user ID must be a positive integer'),
        body('notifications.*.title')
            .notEmpty()
            .isLength({ max: 255 })
            .withMessage('Each notification must have a title (max 255 characters)'),
        body('notifications.*.message')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Message must be at most 1000 characters'),
        body('notifications.*.metadata')
            .optional()
            .isObject()
            .withMessage('Metadata must be an object')
    ];

    // Validate cleanup request
    static validateCleanup = [
        query('daysOld')
            .optional()
            .isInt({ min: 1, max: 365 })
            .withMessage('Days old must be an integer between 1 and 365')
    ];
}

module.exports = NotificationValidator;