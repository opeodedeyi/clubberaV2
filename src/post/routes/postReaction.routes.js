// src/post/routes/postReaction.routes.js
const express = require("express");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const optionalAuth = require("../../middleware/optionalAuth");
const PostReactionController = require("../controllers/postReaction.controller");
const ReactionValidator = require("../validators/reaction.validator");

const router = express.Router();

// Get all reactions for a post
router.get(
    "/:postId/reactions",
    optionalAuth,
    PostReactionController.getReactions
);

// Check if user has reacted to a post
router.get(
    "/:postId/reactions/me",
    authenticate,
    PostReactionController.getUserReaction
);

// Add a reaction to a post
router.post(
    "/:postId/reactions",
    authenticate,
    verifyEmail,
    ReactionValidator.validateAddReaction,
    PostReactionController.addReaction
);

// Remove a reaction from a post
router.delete(
    "/:postId/reactions",
    authenticate,
    verifyEmail,
    ReactionValidator.validateRemoveReaction,
    PostReactionController.removeReaction
);

module.exports = router;
