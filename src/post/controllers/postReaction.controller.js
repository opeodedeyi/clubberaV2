// src/post/controllers/postReaction.controller.js
const PostModel = require("../models/post.model");
const PostReactionModel = require("../models/postReaction.model");
const ApiError = require("../../utils/ApiError");

class PostReactionController {
    async addReaction(req, res, next) {
        try {
            const { postId } = req.params;
            const { id: userId } = req.user;
            const { reactionType = "like" } = req.body;

            // Check if post exists
            const post = await PostModel.findById(postId);
            if (!post) {
                return next(new ApiError("Post not found", 404));
            }

            // Check if post is supporters-only and if user has access
            if (post.is_supporters_only) {
                const hasAccess = await PostModel.isSupporterAccessible(
                    postId,
                    userId
                );
                if (!hasAccess) {
                    return next(
                        new ApiError(
                            "This post is for community supporters only",
                            403
                        )
                    );
                }
            }

            // Add reaction
            const reaction = await PostReactionModel.addReaction(
                postId,
                userId,
                reactionType
            );

            if (reaction.alreadyExists) {
                return res.status(200).json({
                    status: "success",
                    message: "Reaction already exists",
                    data: { postId, userId, reactionType },
                });
            }

            return res.status(201).json({
                status: "success",
                data: reaction,
            });
        } catch (error) {
            next(error);
        }
    }

    async removeReaction(req, res, next) {
        try {
            const { postId } = req.params;
            const { id: userId } = req.user;
            const { reactionType = "like" } = req.body;

            // Check if post exists
            const post = await PostModel.findById(postId);
            if (!post) {
                return next(new ApiError("Post not found", 404));
            }

            // Remove reaction
            const reaction = await PostReactionModel.removeReaction(
                postId,
                userId,
                reactionType
            );

            if (!reaction) {
                return next(new ApiError("Reaction not found", 404));
            }

            return res.status(200).json({
                status: "success",
                message: "Reaction removed successfully",
                data: { postId, userId, reactionType },
            });
        } catch (error) {
            next(error);
        }
    }

    async getReactions(req, res, next) {
        try {
            const { postId } = req.params;
            const { limit = 50, offset = 0, reactionType = "like" } = req.query;

            // Check if post exists
            const post = await PostModel.findById(postId);
            if (!post) {
                return next(new ApiError("Post not found", 404));
            }

            // Get reactions
            const reactions = await PostReactionModel.getReactionsByPostId(
                postId,
                {
                    limit: parseInt(limit, 10),
                    offset: parseInt(offset, 10),
                    reactionType,
                }
            );

            // Get count of reactions
            const count = await PostReactionModel.countReactions(
                postId,
                reactionType
            );

            return res.status(200).json({
                status: "success",
                data: reactions,
                pagination: {
                    limit: parseInt(limit, 10),
                    offset: parseInt(offset, 10),
                    total: count,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserReaction(req, res, next) {
        try {
            const { postId } = req.params;
            const { id: userId } = req.user;
            const { reactionType = "like" } = req.query;

            // Check if post exists
            const post = await PostModel.findById(postId);
            if (!post) {
                return next(new ApiError("Post not found", 404));
            }

            // Check if user has reacted
            const hasReacted = await PostReactionModel.hasUserReacted(
                postId,
                userId,
                reactionType
            );

            return res.status(200).json({
                status: "success",
                data: {
                    postId,
                    userId,
                    reactionType,
                    hasReacted,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PostReactionController();
