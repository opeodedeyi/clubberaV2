// src/post/tests/reply.get.test.js

const { validationResult } = require("express-validator");
const ReplyController = require("../controllers/reply.controller");
const PostModel = require("../models/post.model");
const ImageModel = require("../models/image.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("express-validator");
jest.mock("../models/post.model");
jest.mock("../models/image.model");
jest.mock("../../utils/ApiError");

describe("Get Replies", () => {
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
            content: "This is a parent post",
            is_supporters_only: false,
            content_type: "post",
        });

        PostModel.isSupporterAccessible.mockResolvedValue(true);

        PostModel.findRepliesByPostId.mockResolvedValue([
            {
                id: 2,
                parent_id: 1,
                user_id: 1,
                content: "This is a reply",
                is_supporters_only: false,
                author_name: "Test User",
                author_url: "test-user",
                likes_count: 3,
                user_has_liked: true,
                created_at: new Date(),
            },
            {
                id: 3,
                parent_id: 1,
                user_id: 3,
                content: "This is another reply",
                is_supporters_only: false,
                author_name: "Another User",
                author_url: "another-user",
                likes_count: 1,
                user_has_liked: false,
                created_at: new Date(),
            },
        ]);

        PostModel.countReplies.mockResolvedValue(2);

        ImageModel.getImagesByPostId.mockImplementation((id) => {
            if (id === 2) {
                return Promise.resolve([
                    {
                        id: 1,
                        entity_type: "post",
                        entity_id: 2,
                        image_type: "content",
                        key: "reply-image-1.jpg",
                    },
                ]);
            }
            return Promise.resolve([]);
        });
    });

    it("should get replies successfully", async () => {
        await ReplyController.getReplies(req, res, next);

        expect(PostModel.findById).toHaveBeenCalledWith("1"); // Check parent post
        expect(PostModel.findRepliesByPostId).toHaveBeenCalledWith("1", {
            limit: 10,
            offset: 0,
            userId: 1,
        });
        expect(PostModel.countReplies).toHaveBeenCalledWith("1");
        expect(ImageModel.getImagesByPostId).toHaveBeenCalledWith(2);
        expect(ImageModel.getImagesByPostId).toHaveBeenCalledWith(3);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            data: expect.arrayContaining([
                expect.objectContaining({
                    id: 2,
                    content: "This is a reply",
                    images: expect.arrayContaining([
                        expect.objectContaining({ key: "reply-image-1.jpg" }),
                    ]),
                }),
                expect.objectContaining({
                    id: 3,
                    content: "This is another reply",
                    images: [],
                }),
            ]),
            pagination: {
                limit: 10,
                offset: 0,
                total: 2,
            },
        });
    });

    it("should return 404 when parent post not found", async () => {
        PostModel.findById.mockResolvedValue(null);

        await ReplyController.getReplies(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith("Parent post not found", 404);
    });

    it("should return 403 when parent post is supporters-only and user has no access", async () => {
        PostModel.findById.mockResolvedValue({
            id: 1,
            is_supporters_only: true,
        });

        PostModel.isSupporterAccessible.mockResolvedValue(false);

        await ReplyController.getReplies(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "The parent post is for community supporters only",
            403
        );
    });

    it("should return 401 when parent post is supporters-only and user is not authenticated", async () => {
        req.user = null;

        PostModel.findById.mockResolvedValue({
            id: 1,
            is_supporters_only: true,
        });

        await ReplyController.getReplies(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "Authentication required to view these replies",
            401
        );
    });

    it("should handle custom pagination parameters", async () => {
        req.query.limit = "5";
        req.query.offset = "10";

        await ReplyController.getReplies(req, res, next);

        expect(PostModel.findRepliesByPostId).toHaveBeenCalledWith("1", {
            limit: 5,
            offset: 10,
            userId: 1,
        });

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                pagination: expect.objectContaining({
                    limit: 5,
                    offset: 10,
                }),
            })
        );
    });

    it("should handle database errors", async () => {
        const error = new Error("Database error");
        PostModel.findById.mockRejectedValue(error);

        await ReplyController.getReplies(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
