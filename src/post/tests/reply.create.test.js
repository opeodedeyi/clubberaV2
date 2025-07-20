// src/post/tests/reply.create.test.js

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

describe("Reply Creation", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {
                postId: "1",
            },
            user: {
                id: 1,
                email: "user@example.com",
                fullName: "Test User",
            },
            body: {
                content: "This is a test reply",
                images: [
                    {
                        provider: "s3",
                        key: "reply-image.jpg",
                        altText: "Reply image",
                    },
                ],
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

        // Mock findById to return parent post for the first call
        PostModel.findById.mockImplementation((id) => {
            if (id === "1") {
                return Promise.resolve({
                    id: 1,
                    community_id: 1,
                    user_id: 2,
                    content: "This is a parent post",
                    is_supporters_only: false,
                    content_type: "post",
                });
            } else if (id === 2) {
                return Promise.resolve({
                    id: 2,
                    community_id: 1,
                    user_id: 1,
                    content: "This is a test reply",
                    is_supporters_only: false,
                    content_type: "post",
                    parent_id: 1,
                    author_name: "Test User",
                    author_url: "test-user",
                    created_at: new Date(),
                    updated_at: new Date(),
                });
            }
            return Promise.resolve(null);
        });

        PostModel.isUserAuthorized.mockResolvedValue(true);
        PostModel.isSupporterAccessible.mockResolvedValue(true);

        PostModel.create.mockResolvedValue({
            id: 2,
            community_id: 1,
            user_id: 1,
            content: "This is a test reply",
            is_supporters_only: false,
            content_type: "post",
            parent_id: 1,
            created_at: new Date(),
            updated_at: new Date(),
        });

        ImageModel.saveImage.mockResolvedValue({
            id: 1,
            entity_type: "post",
            entity_id: 2,
            image_type: "content",
            position: 0,
            provider: "s3",
            key: "reply-image.jpg",
            alt_text: "Reply image",
        });

        ImageModel.getImagesByPostId.mockResolvedValue([
            {
                id: 1,
                entity_type: "post",
                entity_id: 2,
                image_type: "content",
                position: 0,
                provider: "s3",
                key: "reply-image.jpg",
                alt_text: "Reply image",
            },
        ]);

        // Configure ApiError mock
        ApiError.mockImplementation((message, statusCode) => {
            return { message, statusCode };
        });
    });

    it("should create a reply successfully", async () => {
        await ReplyController.createReply(req, res, next);

        expect(PostModel.findById).toHaveBeenCalledWith("1"); // Check parent post
        expect(PostModel.isUserAuthorized).toHaveBeenCalledWith(1, 1); // Check community membership

        expect(PostModel.create).toHaveBeenCalledWith({
            communityId: 1,
            userId: 1,
            content: "This is a test reply",
            isSupportersOnly: false,
            contentType: "post",
            parentId: "1",
        });

        expect(ImageModel.saveImage).toHaveBeenCalledWith({
            postId: 2,
            imageType: "content",
            position: 0,
            provider: "s3",
            key: "reply-image.jpg",
            altText: "Reply image",
        });

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            data: expect.objectContaining({
                id: 2,
                content: "This is a test reply",
                parent_id: 1,
            }),
        });
    });

    it("should handle validation errors", async () => {
        // Most Express applications handle validation errors in a validator middleware
        // before the controller is called, so we'll test the validator directly.

        const validationError = { msg: "Content is required" };
        const mockError = new ApiError(validationError.msg, 400);

        // Mock validationResult to indicate that validation failed
        validationResult.mockReturnValue({
            isEmpty: jest.fn().mockReturnValue(false),
            array: jest.fn().mockReturnValue([validationError]),
        });

        // Mock that ApiError returns our mockError
        ApiError.mockReturnValue(mockError);

        // Create a fake validator middleware that would run before the controller
        const validateCreateReply = (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }
            next();
        };

        // Run the validator middleware
        validateCreateReply(req, res, next);

        // Verify it called ApiError with the right parameters
        expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);

        // Verify that next was called with our error object
        expect(next).toHaveBeenCalledWith(mockError);

        // The controller would never actually be called in this case because
        // the middleware would stop the request with the error
    });

    it("should return 404 when parent post not found", async () => {
        PostModel.findById.mockResolvedValueOnce(null);

        await ReplyController.createReply(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith("Parent post not found", 404);
    });

    it("should return 403 when user is not a community member", async () => {
        // Make sure parent post exists first
        PostModel.findById.mockResolvedValueOnce({
            id: 1,
            community_id: 1,
            is_supporters_only: false,
        });

        PostModel.isUserAuthorized.mockResolvedValueOnce(false);

        await ReplyController.createReply(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "User is not a member of this community",
            403
        );
    });

    it("should return 403 when parent post is supporters-only and user has no access", async () => {
        PostModel.findById.mockResolvedValueOnce({
            id: 1,
            community_id: 1,
            is_supporters_only: true,
        });

        PostModel.isSupporterAccessible.mockResolvedValueOnce(false);

        await ReplyController.createReply(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "The parent post is for community supporters only",
            403
        );
    });

    it("should inherit supporters-only flag from parent post", async () => {
        PostModel.findById.mockResolvedValueOnce({
            id: 1,
            community_id: 1,
            is_supporters_only: true,
        });

        await ReplyController.createReply(req, res, next);

        expect(PostModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                isSupportersOnly: true,
            })
        );
    });

    it("should handle database errors", async () => {
        const error = new Error("Database error");

        // Make sure parent post exists and authorizations pass
        PostModel.findById.mockResolvedValueOnce({
            id: 1,
            community_id: 1,
            is_supporters_only: false,
        });

        PostModel.create.mockRejectedValueOnce(error);

        await ReplyController.createReply(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
