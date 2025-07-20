// src/post/controllers/reply.controller.js
const PostModel = require("../models/post.model");
const ImageModel = require("../models/image.model");
const ApiError = require("../../utils/ApiError");

class ReplyController {
    async createReply(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { postId } = req.params;
            const { content, images } = req.body;

            // Check if parent post exists
            const parentPost = await PostModel.findById(postId);
            if (!parentPost) {
                return next(new ApiError("Parent post not found", 404));
            }

            // Check if user is a member of the community
            const isMember = await PostModel.isUserAuthorized(
                userId,
                parentPost.community_id
            );
            if (!isMember) {
                return next(
                    new ApiError("User is not a member of this community", 403)
                );
            }

            // Check if parent post is supporters-only and if user has access
            if (parentPost.is_supporters_only) {
                const hasAccess = await PostModel.isSupporterAccessible(
                    postId,
                    userId
                );
                if (!hasAccess) {
                    return next(
                        new ApiError(
                            "The parent post is for community supporters only",
                            403
                        )
                    );
                }
            }

            // Create reply
            const reply = await PostModel.create({
                communityId: parentPost.community_id,
                userId,
                content,
                isSupportersOnly: parentPost.is_supporters_only, // Inherit supporters-only status
                contentType: "post",
                parentId: postId,
            });

            // Handle image attachments if provided
            let replyImages = [];
            if (images && Array.isArray(images) && images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    await ImageModel.saveImage({
                        postId: reply.id,
                        imageType: "content",
                        position: i,
                        provider: image.provider,
                        key: image.key,
                        altText: image.altText,
                    });
                }

                // Get saved images
                replyImages = await ImageModel.getImagesByPostId(reply.id);
            }

            // Get complete reply with author details
            const completeReply = await PostModel.findById(reply.id);
            completeReply.images = replyImages;

            return res.status(201).json({
                status: "success",
                data: completeReply,
            });
        } catch (error) {
            next(error);
        }
    }

    async getReplies(req, res, next) {
        try {
            const { postId } = req.params;
            const { limit = 20, offset = 0 } = req.query;
            const userId = req.user ? req.user.id : null;

            // Check if parent post exists
            const parentPost = await PostModel.findById(postId);
            if (!parentPost) {
                return next(new ApiError("Parent post not found", 404));
            }

            // Check if parent post is supporters-only and if user has access
            if (parentPost.is_supporters_only && userId) {
                const hasAccess = await PostModel.isSupporterAccessible(
                    postId,
                    userId
                );
                if (!hasAccess) {
                    return next(
                        new ApiError(
                            "The parent post is for community supporters only",
                            403
                        )
                    );
                }
            } else if (parentPost.is_supporters_only && !userId) {
                return next(
                    new ApiError(
                        "Authentication required to view these replies",
                        401
                    )
                );
            }

            // Get replies
            const replies = await PostModel.findRepliesByPostId(postId, {
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                userId,
            });

            // Get images for each reply
            const repliesWithImages = await Promise.all(
                replies.map(async (reply) => {
                    reply.images = await ImageModel.getImagesByPostId(reply.id);
                    return reply;
                })
            );

            // Get total count of replies
            const count = await PostModel.countReplies(postId);

            return res.status(200).json({
                status: "success",
                data: repliesWithImages,
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

    async updateReply(req, res, next) {
        try {
            const { replyId } = req.params;
            const { id: userId } = req.user;
            const { content } = req.body;

            const updatedReply = await PostModel.update(replyId, userId, {
                content,
            });

            if (!updatedReply) {
                return next(new ApiError("Reply not found", 404));
            }

            // Check if it's actually a reply
            if (!updatedReply.parent_id) {
                return next(new ApiError("Not a reply", 400));
            }

            // Get reply images
            updatedReply.images = await ImageModel.getImagesByPostId(replyId);

            return res.status(200).json({
                status: "success",
                data: updatedReply,
            });
        } catch (error) {
            if (error.message === "Unauthorized to update this post") {
                return next(new ApiError(error.message, 403));
            }
            next(error);
        }
    }

    async deleteReply(req, res, next) {
        try {
            const { replyId } = req.params;
            const { id: userId } = req.user;

            // First check if it's a reply
            const reply = await PostModel.findById(replyId);
            if (!reply) {
                return next(new ApiError("Reply not found", 404));
            }

            if (!reply.parent_id) {
                return next(new ApiError("Not a reply", 400));
            }

            const deletedReply = await PostModel.delete(replyId, userId);

            if (!deletedReply) {
                return next(new ApiError("Reply not found", 404));
            }

            return res.status(200).json({
                status: "success",
                message: "Reply deleted successfully",
                data: { id: deletedReply.id },
            });
        } catch (error) {
            if (error.message === "Unauthorized to delete this post") {
                return next(new ApiError(error.message, 403));
            }
            next(error);
        }
    }
}

module.exports = new ReplyController();
