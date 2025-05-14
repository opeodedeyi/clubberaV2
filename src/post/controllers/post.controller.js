// Import additional dependencies at the top
const PostModel = require("../models/post.model");
const ImageModel = require("../models/image.model");
const ApiError = require("../../utils/ApiError");

class PostController {
    async createPost(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { communityId, content, isSupportersOnly, images } = req.body;

            // Check if user is a member of the community
            const isMember = await PostModel.isUserAuthorized(
                userId,
                communityId
            );
            if (!isMember) {
                return next(
                    new ApiError("User is not a member of this community", 403)
                );
            }

            // Create post
            const post = await PostModel.create({
                communityId,
                userId,
                content,
                isSupportersOnly,
                contentType: "post",
            });

            // Handle image attachments if provided
            let postImages = [];
            if (images && Array.isArray(images) && images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    await ImageModel.saveImage({
                        postId: post.id,
                        imageType: "content",
                        position: i,
                        provider: image.provider,
                        key: image.key,
                        altText: image.altText,
                    });
                }

                // Get saved images
                postImages = await ImageModel.getImagesByPostId(post.id);
            }

            // Get complete post with author details
            const completePost = await PostModel.findById(post.id);
            completePost.images = postImages;

            return res.status(201).json({
                status: "success",
                data: completePost,
            });
        } catch (error) {
            next(error);
        }
    }

    async getPost(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user ? req.user.id : null;

            const post = await PostModel.findById(id);

            if (!post) {
                return next(new ApiError("Post not found", 404));
            }

            // Check if post is supporters-only and if user has access
            if (post.is_supporters_only && userId) {
                const hasAccess = await PostModel.isSupporterAccessible(
                    id,
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
            } else if (post.is_supporters_only && !userId) {
                return next(
                    new ApiError(
                        "Authentication required to view this post",
                        401
                    )
                );
            }

            // Get post images
            post.images = await ImageModel.getImagesByPostId(id);

            // For poll type posts, ensure poll data is complete
            if (post.content_type === "poll") {
                // Get poll with user voting status
                const PollModel = require("../models/poll.model");
                const pollDetails = await PollModel.getPollDetails(id, userId);
                if (pollDetails) {
                    post.userHasVoted = pollDetails.userHasVoted;
                }
            }

            return res.status(200).json({
                status: "success",
                data: post,
            });
        } catch (error) {
            next(error);
        }
    }

    async updatePost(req, res, next) {
        try {
            const { id } = req.params;
            const { id: userId } = req.user;
            const { content, isSupportersOnly, isHidden } = req.body;

            const updatedPost = await PostModel.update(id, userId, {
                content,
                isSupportersOnly,
                isHidden,
            });

            if (!updatedPost) {
                return next(new ApiError("Post not found", 404));
            }

            // Get post images
            updatedPost.images = await ImageModel.getImagesByPostId(id);

            return res.status(200).json({
                status: "success",
                data: updatedPost,
            });
        } catch (error) {
            if (error.message === "Unauthorized to update this post") {
                return next(new ApiError(error.message, 403));
            }
            next(error);
        }
    }

    async deletePost(req, res, next) {
        try {
            const { id } = req.params;
            const { id: userId } = req.user;

            const deletedPost = await PostModel.delete(id, userId);

            if (!deletedPost) {
                return next(new ApiError("Post not found", 404));
            }

            return res.status(200).json({
                status: "success",
                message: "Post deleted successfully",
                data: { id: deletedPost.id },
            });
        } catch (error) {
            if (error.message === "Unauthorized to delete this post") {
                return next(new ApiError(error.message, 403));
            }
            next(error);
        }
    }

    async getCommunityPosts(req, res, next) {
        try {
            const { communityId } = req.params;
            const {
                limit = 20,
                offset = 0,
                contentType,
                supportersOnly,
            } = req.query;
            const userId = req.user ? req.user.id : null;

            const posts = await PostModel.findByCommunity(communityId, {
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                contentType,
                supportersOnly:
                    supportersOnly === "true"
                        ? true
                        : supportersOnly === "false"
                        ? false
                        : null,
                userId,
            });

            // Filter out supporters-only posts if user is not authenticated or not a supporter
            let filteredPosts = posts;
            if (userId) {
                // If user is logged in, filter posts they don't have access to
                const accessPromises = posts
                    .filter((post) => post.is_supporters_only)
                    .map((post) =>
                        PostModel.isSupporterAccessible(post.id, userId)
                    );

                const accessResults = await Promise.all(accessPromises);

                // Create a map of post_id -> hasAccess
                const accessMap = {};
                posts
                    .filter((post) => post.is_supporters_only)
                    .forEach((post, index) => {
                        accessMap[post.id] = accessResults[index];
                    });

                filteredPosts = posts.filter(
                    (post) => !post.is_supporters_only || accessMap[post.id]
                );
            } else {
                // If not logged in, filter out all supporters-only posts
                filteredPosts = posts.filter(
                    (post) => !post.is_supporters_only
                );
            }

            // Process each post based on its type
            const processedPosts = await Promise.all(
                filteredPosts.map(async (post) => {
                    // Get images for the post
                    post.images = await ImageModel.getImagesByPostId(post.id);

                    // For poll type posts, ensure poll data is complete
                    if (post.content_type === "poll") {
                        // Get poll with user voting status
                        const PollModel = require("../models/poll.model");
                        const pollDetails = await PollModel.getPollDetails(
                            post.id,
                            userId
                        );
                        if (pollDetails) {
                            post.userHasVoted = pollDetails.userHasVoted;
                        }
                    }

                    return post;
                })
            );

            // Get the total count of posts from the model
            const totalCount = await PostModel.countCommunityPosts(
                communityId,
                {
                    contentType,
                    supportersOnly:
                        supportersOnly === "true"
                            ? true
                            : supportersOnly === "false"
                            ? false
                            : null,
                }
            );

            return res.status(200).json({
                status: "success",
                data: processedPosts,
                pagination: {
                    limit: parseInt(limit, 10),
                    offset: parseInt(offset, 10),
                    total: totalCount,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PostController();
