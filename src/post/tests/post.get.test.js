// src/post/tests/post.get.test.js

const { validationResult } = require("express-validator");
const PostController = require("../controllers/post.controller");
const PostModel = require("../models/post.model");
const ImageModel = require("../models/image.model");
const PollModel = require("../models/poll.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("express-validator");
jest.mock("../models/post.model");
jest.mock("../models/image.model");
jest.mock("../models/poll.model");
jest.mock("../../utils/ApiError");

describe("PostController - Get Post", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {
                id: "10",
            },
            user: {
                id: 5,
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

        // Mock PostModel methods
        PostModel.findById.mockResolvedValue({
            id: 10,
            community_id: 1,
            user_id: 5,
            content: "This is a test post",
            is_supporters_only: false,
            content_type: "post",
            author_name: "Test User",
            author_url: "test-user",
            author_image: null,
            community_name: "Test Community",
            community_url: "test-community",
            likes_count: 0,
            replies_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
        });
        PostModel.isSupporterAccessible.mockResolvedValue(true);

        // Mock ImageModel methods
        ImageModel.getImagesByPostId.mockResolvedValue([
            {
                id: 20,
                entity_type: "post",
                entity_id: 10,
                image_type: "content",
                position: 0,
                provider: "s3",
                key: "post-temp-123/test-image.jpg",
                alt_text: "Test image",
            },
        ]);

        // Mock PollModel methods
        PollModel.getPollDetails.mockResolvedValue({
            id: 10,
            userHasVoted: false,
            userVote: null,
            poll_data: {
                question: "Test poll question",
                options: [
                    { text: "Option 1", votes: 0 },
                    { text: "Option 2", votes: 0 },
                ],
                settings: { allowMultipleVotes: false },
                votes: [],
            },
        });
    });

    describe("getPost", () => {
        it("should get a post successfully", async () => {
            await PostController.getPost(req, res, next);

            expect(PostModel.findById).toHaveBeenCalledWith("10");
            expect(ImageModel.getImagesByPostId).toHaveBeenCalledWith("10");

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.objectContaining({
                        id: 10,
                        content: "This is a test post",
                        images: expect.arrayContaining([
                            expect.objectContaining({
                                id: 20,
                                key: "post-temp-123/test-image.jpg",
                            }),
                        ]),
                    }),
                })
            );
        });

        it("should handle a poll post", async () => {
            // Set the post type to poll
            PostModel.findById.mockResolvedValue({
                id: 10,
                community_id: 1,
                user_id: 5,
                content: "Test poll question",
                is_supporters_only: false,
                content_type: "poll",
                poll_data: {
                    question: "Test poll question",
                    options: [
                        { text: "Option 1", votes: 0 },
                        { text: "Option 2", votes: 0 },
                    ],
                    votes: [],
                },
                author_name: "Test User",
                author_url: "test-user",
                community_name: "Test Community",
                community_url: "test-community",
                created_at: new Date(),
                updated_at: new Date(),
            });

            await PostController.getPost(req, res, next);

            expect(PollModel.getPollDetails).toHaveBeenCalledWith("10", 5);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        content_type: "poll",
                        userHasVoted: false,
                        userVote: null,
                    }),
                })
            );
        });

        it("should return 404 if post not found", async () => {
            PostModel.findById.mockResolvedValue(null);

            await PostController.getPost(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith("Post not found", 404);
        });

        it("should check access for supporters-only posts", async () => {
            // Set post to supporters-only
            PostModel.findById.mockResolvedValue({
                id: 10,
                community_id: 1,
                user_id: 8, // Different user
                content: "This is a supporters-only post",
                is_supporters_only: true,
                content_type: "post",
                author_name: "Other User",
                author_url: "other-user",
                created_at: new Date(),
                updated_at: new Date(),
            });

            await PostController.getPost(req, res, next);

            expect(PostModel.isSupporterAccessible).toHaveBeenCalledWith(
                "10",
                5
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("should return 403 if user can't access supporters-only post", async () => {
            // Set post to supporters-only
            PostModel.findById.mockResolvedValue({
                id: 10,
                community_id: 1,
                user_id: 8, // Different user
                content: "This is a supporters-only post",
                is_supporters_only: true,
                content_type: "post",
                author_name: "Other User",
                author_url: "other-user",
                created_at: new Date(),
                updated_at: new Date(),
            });

            // User doesn't have access
            PostModel.isSupporterAccessible.mockResolvedValue(false);

            await PostController.getPost(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This post is for community supporters only",
                403
            );
        });

        it("should return 401 for supporters-only post when not authenticated", async () => {
            // Remove user from request
            req.user = null;

            // Set post to supporters-only
            PostModel.findById.mockResolvedValue({
                id: 10,
                is_supporters_only: true,
                content_type: "post",
            });

            await PostController.getPost(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Authentication required to view this post",
                401
            );
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            PostModel.findById.mockRejectedValue(dbError);

            await PostController.getPost(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });
});
