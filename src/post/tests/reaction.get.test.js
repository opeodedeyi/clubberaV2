// src/post/tests/reaction.get.test.js

const { validationResult } = require("express-validator");
const PostReactionController = require("../controllers/postReaction.controller");
const PostModel = require("../models/post.model");
const PostReactionModel = require("../models/postReaction.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("express-validator");
jest.mock("../models/post.model");
jest.mock("../models/postReaction.model");
jest.mock("../../utils/ApiError");

describe("Get Post Reactions", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {
                postId: "1",
            },
            query: {
                limit: "10",
                offset: "0",
                reactionType: "like",
            },
            user: {
                id: 1,
                email: "user@example.com",
                fullName: "Test User",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        // Default mock implementations
        validationResult.mockReturnValue({
            isEmpty: jest.fn().mockReturnValue(true),
            array: jest.fn().mockReturnValue([]),
        });

        PostModel.findById.mockResolvedValue({
            id: 1,
            community_id: 1,
            user_id: 2,
            content: "This is a test post",
            is_supporters_only: false,
            content_type: "post",
        });

        PostReactionModel.getReactionsByPostId.mockResolvedValue([
            {
                id: 1,
                post_id: 1,
                user_id: 1,
                reaction_type: "like",
                user_name: "Test User",
                user_url: "test-user",
                user_image: {
                    id: 5,
                    provider: "s3",
                    key: "user-profile.jpg",
                },
                created_at: new Date(),
            },
            {
                id: 2,
                post_id: 1,
                user_id: 2,
                reaction_type: "like",
                user_name: "Another User",
                user_url: "another-user",
                user_image: null,
                created_at: new Date(),
            },
        ]);

        PostReactionModel.countReactions.mockResolvedValue(2);
        PostReactionModel.hasUserReacted.mockResolvedValue(true);
    });

    it("should get reactions successfully", async () => {
        await PostReactionController.getReactions(req, res, next);

        expect(PostModel.findById).toHaveBeenCalledWith("1");
        expect(PostReactionModel.getReactionsByPostId).toHaveBeenCalledWith(
            "1",
            {
                limit: 10,
                offset: 0,
                reactionType: "like",
            }
        );
        expect(PostReactionModel.countReactions).toHaveBeenCalledWith(
            "1",
            "like"
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            data: expect.arrayContaining([
                expect.objectContaining({
                    id: 1,
                    post_id: 1,
                    user_id: 1,
                }),
                expect.objectContaining({
                    id: 2,
                    post_id: 1,
                    user_id: 2,
                }),
            ]),
            pagination: {
                limit: 10,
                offset: 0,
                total: 2,
            },
        });
    });

    it("should return 404 when post not found", async () => {
        PostModel.findById.mockResolvedValue(null);

        await PostReactionController.getReactions(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith("Post not found", 404);
    });

    it("should handle custom pagination parameters", async () => {
        req.query.limit = "5";
        req.query.offset = "10";

        await PostReactionController.getReactions(req, res, next);

        expect(PostReactionModel.getReactionsByPostId).toHaveBeenCalledWith(
            "1",
            {
                limit: 5,
                offset: 10,
                reactionType: "like",
            }
        );

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                pagination: expect.objectContaining({
                    limit: 5,
                    offset: 10,
                }),
            })
        );
    });

    it("should get user's reaction status", async () => {
        await PostReactionController.getUserReaction(req, res, next);

        expect(PostModel.findById).toHaveBeenCalledWith("1");
        expect(PostReactionModel.hasUserReacted).toHaveBeenCalledWith(
            "1",
            1,
            "like"
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                postId: "1",
                userId: 1,
                reactionType: "like",
                hasReacted: true,
            },
        });
    });

    it("should handle database errors", async () => {
        const error = new Error("Database error");
        PostModel.findById.mockRejectedValue(error);

        await PostReactionController.getReactions(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
