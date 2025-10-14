// src/post/routes/post.routes.js
const express = require("express");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const optionalAuth = require("../../middleware/optionalAuth");
const PostController = require("../controllers/post.controller");
const PostValidator = require("../validators/post.validator");

const router = express.Router();

// Get user's feed (posts from all their communities)
router.get("/feed", authenticate, verifyEmail, PostController.getFeed);

// Get posts for a community (public or supporters-only if authorized)
router.get(
    "/community/:communityId",
    optionalAuth,
    PostController.getCommunityPosts
);

// Get a specific post
router.get("/:id", optionalAuth, PostController.getPost);

// Create a new post
router.post(
    "/",
    authenticate,
    verifyEmail,
    PostValidator.validateCreatePost,
    PostController.createPost
);

// Delete a post
router.delete("/:id", authenticate, verifyEmail, PostController.deletePost);

module.exports = router;
