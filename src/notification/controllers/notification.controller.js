// src/notification/controllers/notification.controller.js

const NotificationService = require('../services/notification.service');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

class NotificationController {
    /**
     * Get all notifications for the current user
     */
    static getNotifications = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { limit, offset, unreadOnly, grouped } = req.query;

        const options = {
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
            unreadOnly: unreadOnly === 'true',
            grouped: grouped !== 'false' // Default to true, can disable with ?grouped=false
        };

        const notifications = await NotificationService.getUserNotifications(userId, options);

        res.json({
            status: 'success',
            data: {
                notifications,
                pagination: {
                    limit: options.limit,
                    offset: options.offset,
                    hasMore: notifications.length === options.limit
                }
            }
        });
    });

    /**
     * Get unread notifications count
     */
    static getUnreadCount = catchAsync(async (req, res) => {
        const userId = req.user.id;

        const unreadCount = await NotificationService.getUnreadCount(userId);

        res.json({
            status: 'success',
            data: {
                unreadCount
            }
        });
    });

    /**
     * Mark a notification as read
     */
    static markAsRead = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const notification = await NotificationService.markAsRead(parseInt(notificationId), userId);

        if (!notification) {
            throw new ApiError(404, 'Notification not found or you don\'t have permission to mark it as read');
        }

        res.json({
            status: 'success',
            data: {
                notification
            }
        });
    });

    /**
     * Mark multiple notifications as read (for grouped notifications)
     */
    static markMultipleAsRead = catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { notificationIds } = req.body;

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            throw new ApiError(400, 'notificationIds array is required');
        }

        const result = await NotificationService.markMultipleAsRead(notificationIds, userId);

        res.json({
            status: 'success',
            data: {
                updatedCount: result.updated_count || 0
            }
        });
    });

    /**
     * Mark all notifications as read
     */
    static markAllAsRead = catchAsync(async (req, res) => {
        const userId = req.user.id;

        const result = await NotificationService.markAllAsRead(userId);

        res.json({
            status: 'success',
            data: {
                updatedCount: result.updated_count || 0
            }
        });
    });

    /**
     * Create a notification (admin/system use)
     */
    static createNotification = catchAsync(async (req, res) => {
        const {
            userId,
            type,
            triggerEntityType,
            triggerEntityId,
            actorUserId,
            title,
            message,
            metadata
        } = req.body;

        const notification = await NotificationService.createNotification({
            userId,
            type,
            triggerEntityType,
            triggerEntityId,
            actorUserId,
            title,
            message,
            metadata
        });

        res.status(201).json({
            status: 'success',
            data: {
                notification
            }
        });
    });

    /**
     * Create bulk notifications (admin/system use)
     */
    static createBulkNotifications = catchAsync(async (req, res) => {
        const { notifications } = req.body;

        if (!Array.isArray(notifications) || notifications.length === 0) {
            throw new ApiError(400, 'Notifications array is required and cannot be empty');
        }

        const createdNotifications = await NotificationService.createBulkNotifications(notifications);

        res.status(201).json({
            status: 'success',
            data: {
                notifications: createdNotifications,
                count: createdNotifications.length
            }
        });
    });

    /**
     * Cleanup old notifications (admin use)
     */
    static cleanupOldNotifications = catchAsync(async (req, res) => {
        const { daysOld } = req.query;
        const days = daysOld ? parseInt(daysOld) : 30;

        const result = await NotificationService.cleanupOldNotifications(days);

        res.json({
            status: 'success',
            data: {
                deletedCount: result.deleted_count || 0,
                daysOld: days
            }
        });
    });
}

module.exports = NotificationController;