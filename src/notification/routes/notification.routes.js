// src/notification/routes/notification.routes.js

const express = require("express");
const NotificationController = require("../controllers/notification.controller");
const NotificationValidator = require("../validators/notification.validator");
const { authenticate } = require("../../middleware/auth");
const validate = require("../../middleware/validate");

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

// Get all notifications for current user
router.get(
    "/",
    NotificationValidator.validateGetNotifications,
    validate,
    NotificationController.getNotifications
);

// Get unread count
router.get("/unread-count", NotificationController.getUnreadCount);

// Mark multiple notifications as read (for grouped notifications)
router.put("/mark-multiple-read", NotificationController.markMultipleAsRead);

// Mark all notifications as read
router.put("/mark-all-read", NotificationController.markAllAsRead);

// Mark a specific notification as read
router.put(
    "/:notificationId/read",
    NotificationValidator.validateMarkAsRead,
    validate,
    NotificationController.markAsRead
);

// Admin/System routes for creating notifications
router.post(
    "/",
    NotificationValidator.validateCreateNotification,
    validate,
    NotificationController.createNotification
);

// Admin/System route for bulk notifications
router.post(
    "/bulk",
    NotificationValidator.validateCreateBulkNotifications,
    validate,
    NotificationController.createBulkNotifications
);

// Admin route for cleanup
router.delete(
    "/cleanup",
    NotificationValidator.validateCleanup,
    validate,
    NotificationController.cleanupOldNotifications
);

module.exports = router;