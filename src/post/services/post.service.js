// src/post/services/post.service.js
const PostModel = require("../models/post.model");
const ImageModel = require("../models/image.model");

class PostService {
    async isPostViewable(postId, userId) {
        const post = await PostModel.findById(postId);

        if (!post) {
            return false;
        }

        // If post is not supporters-only, it's viewable by everyone
        if (!post.is_supporters_only) {
            return true;
        }

        // If post is supporters-only, check if user is authenticated
        if (!userId) {
            return false;
        }

        // Check if user has supporter access
        return await PostModel.isSupporterAccessible(postId, userId);
    }

    async processPostData(post, userId) {
        if (!post) {
            return null;
        }

        // Get post images
        const images = await ImageModel.getImagesByPostId(post.id);

        // Check if user has liked the post
        let userHasLiked = false;
        if (userId) {
            const PostReactionModel = require("../models/postReaction.model");
            userHasLiked = await PostReactionModel.hasUserReacted(
                post.id,
                userId
            );
        }

        // Format the result
        return {
            ...post,
            images,
            userHasLiked,
        };
    }

    async getImagesForPosts(postIds) {
        if (!postIds || postIds.length === 0) {
            return {};
        }

        // Create placeholders for parameterized query
        const placeholders = postIds
            .map((_, index) => `$${index + 1}`)
            .join(",");

        const query = `
            SELECT *
            FROM images
            WHERE entity_type = 'post' AND entity_id IN (${placeholders})
            ORDER BY entity_id, position ASC`;

        const { query: dbQuery } = require("../../config/db");
        const result = await dbQuery(query, postIds);

        // Group images by post ID
        const imagesByPostId = {};
        result.rows.forEach((image) => {
            if (!imagesByPostId[image.entity_id]) {
                imagesByPostId[image.entity_id] = [];
            }
            imagesByPostId[image.entity_id].push(image);
        });

        return imagesByPostId;
    }
}

module.exports = new PostService();
