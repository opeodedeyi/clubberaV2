// src/post/tests/post.create.test.js

const { validationResult } = require("express-validator");
const PostController = require("../controllers/post.controller");
const PostModel = require("../models/post.model");
const ImageModel = require("../models/image.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("express-validator");
jest.mock("../models/post.model");
jest.mock("../models/image.model");
jest.mock("../../utils/ApiError");

describe("PostController - Create Post", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {},
            body: {
                communityId: 1,
                content: "This is a test post",
                isSupportersOnly: false,
                images: [
                    {
                        provider: "s3",
                        key: "post-temp-123/test-image.jpg",
                        altText: "Test image",
                    },
                ],
            },
            user: {
                id: 5,
                email: "user@example.com",
                fullName: "Test User",
                isEmailConfirmed: true,
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
        PostModel.isUserAuthorized.mockResolvedValue(true);
        PostModel.create.mockResolvedValue({
            id: 10,
            community_id: 1,
            user_id: 5,
            content: "This is a test post",
            is_supporters_only: false,
            content_type: "post",
            created_at: new Date(),
        });
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
            likes_count: 0,
            replies_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
        });

        // Mock ImageModel methods
        ImageModel.saveImage.mockResolvedValue({
            id: 20,
            entity_type: "post",
            entity_id: 10,
            image_type: "content",
            position: 0,
            provider: "s3",
            key: "post-temp-123/test-image.jpg",
            alt_text: "Test image",
        });
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
    });

    describe("createPost", () => {
        it("should create a post successfully", async () => {
            await PostController.createPost(req, res, next);

            expect(PostModel.isUserAuthorized).toHaveBeenCalledWith(5, 1);
            expect(PostModel.create).toHaveBeenCalledWith({
                communityId: 1,
                userId: 5,
                content: "This is a test post",
                isSupportersOnly: false,
                contentType: "post",
            });
            expect(ImageModel.saveImage).toHaveBeenCalledWith({
                postId: 10,
                imageType: "content",
                position: 0,
                provider: "s3",
                key: "post-temp-123/test-image.jpg",
                altText: "Test image",
            });
            expect(PostModel.findById).toHaveBeenCalledWith(10);
            expect(ImageModel.getImagesByPostId).toHaveBeenCalledWith(10);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.objectContaining({
                        id: 10,
                        community_id: 1,
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

        it("should create a post without images", async () => {
            // Remove images from request
            req.body.images = undefined;

            await PostController.createPost(req, res, next);

            expect(PostModel.create).toHaveBeenCalled();
            expect(ImageModel.saveImage).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle validation errors", async () => {
            const validationError = { msg: "Content is required" };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            // This would be called in the validator middleware
            // but we're testing the controller directly
            ApiError.mockImplementation((message, statusCode) => {
                return { message, statusCode };
            });

            // Call middleware directly to test validation
            const validateCreatePost =
                require("../validators/post.validator").validateCreatePost;

            // Simulate middleware execution (simplified)
            // In reality, this should test the actual middleware chain
            validationResult.isEmpty = jest.fn().mockReturnValue(false);
            validationResult.array = jest
                .fn()
                .mockReturnValue([validationError]);

            expect(() =>
                validateCreatePost[validateCreatePost.length - 1](
                    req,
                    res,
                    next
                )
            ).not.toThrow();

            expect(next).toHaveBeenCalled();
        });

        it("should return 403 if user is not a member of the community", async () => {
            PostModel.isUserAuthorized.mockResolvedValue(false);

            await PostController.createPost(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "User is not a member of this community",
                403
            );
        });

        it("should handle database errors during post creation", async () => {
            const dbError = new Error("Database error");
            PostModel.create.mockRejectedValue(dbError);

            await PostController.createPost(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it("should handle image upload errors", async () => {
            const imageError = new Error("Failed to save image");
            ImageModel.saveImage.mockRejectedValue(imageError);

            await PostController.createPost(req, res, next);

            expect(next).toHaveBeenCalledWith(imageError);
        });
    });
});
