// src/message/routes/message.routes.js

const express = require("express");
const MessageController = require("../controllers/message.controller");
const MessageValidator = require("../validators/message.validator");
const { authenticate } = require("../../middleware/auth");
const validate = require("../../middleware/validate");

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

// Send a message to a user or community
router.post(
    "/",
    MessageValidator.validateSendMessage,
    validate,
    MessageController.sendMessage
);

// get all Conversations for a current user
router.get(
    "/conversations",
    MessageValidator.validateGetUserConversations,
    validate,
    MessageController.getUserConversations
);

// Mark all messages as read
router.put(
    "/conversations/read",
    MessageValidator.validateMarkConversationAsRead,
    validate,
    MessageController.markConversationAsRead
);

// Unread count
router.get("/unread-count", MessageController.getUnreadCount);

// send typing indicator
router.post(
    "/typing",
    MessageValidator.validateTypingIndicator,
    validate,
    MessageController.sendTypingIndicator
);

// search messages in a conversation
router.get(
    "/search",
    MessageValidator.validateSearchMessages,
    validate,
    MessageController.searchMessages
);

// Get conversation with a user
router.get(
    "/:recipientType/:recipientId",
    MessageValidator.validateGetConversation,
    validate,
    MessageController.getConversation
);

// Mark a message as read
router.put(
    "/:messageId/read",
    MessageValidator.validateMarkMessageAsRead,
    validate,
    MessageController.markMessageAsRead
);

// deleta a message
router.delete(
    "/:messageId",
    MessageValidator.validateDeleteMessage,
    validate,
    MessageController.deleteMessage
);

module.exports = router;
