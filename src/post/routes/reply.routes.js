// src/post/routes/reply.routes.js
const express = require("express");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const optionalAuth = require("../../middleware/optionalAuth");
const ReplyController = require("../controllers/reply.controller");
const ReplyValidator = require("../validators/reply.validator");

const router = express.Router();

// Get all replies for a post
router.get("/:postId/replies", optionalAuth, ReplyController.getReplies);

// Create a reply to a post
router.post(
    "/:postId/replies",
    authenticate,
    verifyEmail,
    ReplyValidator.validateCreateReply,
    ReplyController.createReply
);

// Update a reply
router.put(
    "/replies/:replyId",
    authenticate,
    verifyEmail,
    ReplyValidator.validateUpdateReply,
    ReplyController.updateReply
);

// Delete a reply
router.delete(
    "/replies/:replyId",
    authenticate,
    verifyEmail,
    ReplyController.deleteReply
);

module.exports = router;
