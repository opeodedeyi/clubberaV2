// src/post/tests/post.community-posts.test.js

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

describe("PostController - Get Community Posts", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {
                communityId: "1",
            },
            query: {
                limit: "20",
                offset: "0",
                contentType: "",
                supportersOnly: "",
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
        PostModel.findByCommunity.mockResolvedValue([
            {
                id: 10,
                community_id: 1,
                user_id: 5,
                content: "Regular post",
                is_supporters_only: false,
                content_type: "post",
                author_name: "Test User",
                author_url: "test-user",
                likes_count: 2,
                replies_count: 1,
                user_has_liked: false,
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                id: 11,
                community_id: 1,
                user_id: 8,
                content: "Poll question",
                is_supporters_only: false,
                content_type: "poll",
                poll_data: {
                    question: "Poll question",
                    options: [
                        { text: "Option 1", votes: 5 },
                        { text: "Option 2", votes: 3 },
                    ],
                },
                author_name: "Other User",
                author_url: "other-user",
                likes_count: 0,
                replies_count: 0,
                user_has_liked: false,
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);

        PostModel.isSupporterAccessible.mockResolvedValue(true);
        PostModel.countCommunityPosts.mockResolvedValue(2);

        // Mock ImageModel methods
        ImageModel.getImagesByPostId.mockImplementation(async (postId) => {
            if (postId === 10) {
                return [
                    {
                        id: 20,
                        entity_type: "post",
                        entity_id: 10,
                        image_type: "content",
                        position: 0,
                        provider: "s3",
                        key: "post-10/image.jpg",
                        alt_text: "Test image",
                    },
                ];
            }
            return [];
        });

        // Mock PollModel methods
        PollModel.getPollDetails.mockResolvedValue({
            id: 11,
            userHasVoted: false,
            poll_data: {
                question: "Poll question",
                options: [
                    { text: "Option 1", votes: 5 },
                    { text: "Option 2", votes: 3 },
                ],
                settings: { allowMultipleVotes: false },
            },
        });
    });

    describe("getCommunityPosts", () => {
        it("should get community posts successfully", async () => {
            await PostController.getCommunityPosts(req, res, next);

            expect(PostModel.findByCommunity).toHaveBeenCalledWith(
                "1",
                expect.objectContaining({
                    limit: 20,
                    offset: 0,
                    userId: 5,
                })
            );
            expect(ImageModel.getImagesByPostId).toHaveBeenCalledWith(10);
            expect(PollModel.getPollDetails).toHaveBeenCalledWith(11, 5);
            expect(PostModel.countCommunityPosts).toHaveBeenCalledWith(
                "1",
                expect.any(Object)
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: 10,
                            content: "Regular post",
                            content_type: "post",
                            images: expect.arrayContaining([
                                expect.objectContaining({
                                    id: 20,
                                    key: "post-10/image.jpg",
                                }),
                            ]),
                        }),
                        expect.objectContaining({
                            id: 11,
                            content: "Poll question",
                            content_type: "poll",
                            userHasVoted: false,
                        }),
                    ]),
                    pagination: expect.objectContaining({
                        limit: 20,
                        offset: 0,
                        total: 2,
                    }),
                })
            );
        });

        it("should handle pagination parameters", async () => {
            req.query.limit = "10";
            req.query.offset = "20";

            await PostController.getCommunityPosts(req, res, next);

            expect(PostModel.findByCommunity).toHaveBeenCalledWith(
                "1",
                expect.objectContaining({
                    limit: 10,
                    offset: 20,
                })
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    pagination: expect.objectContaining({
                        limit: 10,
                        offset: 20,
                    }),
                })
            );
        });

        it("should filter by content type", async () => {
            req.query.contentType = "post";

            await PostController.getCommunityPosts(req, res, next);

            expect(PostModel.findByCommunity).toHaveBeenCalledWith(
                "1",
                expect.objectContaining({
                    contentType: "post",
                })
            );
        });

        it("should filter by supporters only", async () => {
            req.query.supportersOnly = "true";

            await PostController.getCommunityPosts(req, res, next);

            expect(PostModel.findByCommunity).toHaveBeenCalledWith(
                "1",
                expect.objectContaining({
                    supportersOnly: true,
                })
            );
            expect(PostModel.countCommunityPosts).toHaveBeenCalledWith(
                "1",
                expect.objectContaining({
                    supportersOnly: true,
                })
            );
        });

        it("should filter out supporters-only posts for non-authenticated users", async () => {
            // Set up one supporters-only post
            PostModel.findByCommunity.mockResolvedValue([
                {
                    id: 10,
                    content: "Regular post",
                    is_supporters_only: false,
                    content_type: "post",
                },
                {
                    id: 12,
                    content: "Supporters-only post",
                    is_supporters_only: true,
                    content_type: "post",
                },
            ]);

            // Remove user from request
            req.user = null;

            await PostController.getCommunityPosts(req, res, next);

            // Only the non-supporters-only post should be returned
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({ id: 10 }),
                    ]),
                })
            );

            // Verify only one post was returned
            const responseData = res.json.mock.calls[0][0].data;
            expect(responseData.length).toBe(1);
            expect(responseData[0].id).toBe(10);
        });

        it("should filter out inaccessible supporters-only posts for authenticated users", async () => {
            // Set up one supporters-only post
            PostModel.findByCommunity.mockResolvedValue([
                {
                    id: 10,
                    content: "Regular post",
                    is_supporters_only: false,
                    content_type: "post",
                },
                {
                    id: 12,
                    content: "Supporters-only post",
                    is_supporters_only: true,
                    content_type: "post",
                },
            ]);

            // Make the supporters-only post inaccessible
            PostModel.isSupporterAccessible.mockResolvedValue(false);

            await PostController.getCommunityPosts(req, res, next);

            // Only the non-supporters-only post should be returned
            const responseData = res.json.mock.calls[0][0].data;
            expect(responseData.length).toBe(1);
            expect(responseData[0].id).toBe(10);
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            PostModel.findByCommunity.mockRejectedValue(dbError);

            await PostController.getCommunityPosts(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });
});
