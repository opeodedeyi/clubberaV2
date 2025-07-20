// src/post/tests/post.update.test.js

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

describe("PostController - Update Post", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {
                id: "10",
            },
            body: {
                content: "Updated post content",
                isSupportersOnly: true,
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
        PostModel.update.mockResolvedValue({
            id: 10,
            community_id: 1,
            user_id: 5,
            content: "Updated post content",
            is_supporters_only: true,
            content_type: "post",
            is_edited: true,
            edited_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        });

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
    });

    describe("updatePost", () => {
        it("should update a post successfully", async () => {
            await PostController.updatePost(req, res, next);

            expect(PostModel.update).toHaveBeenCalledWith("10", 5, {
                content: "Updated post content",
                isSupportersOnly: true,
            });
            expect(ImageModel.getImagesByPostId).toHaveBeenCalledWith("10");

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.objectContaining({
                        id: 10,
                        content: "Updated post content",
                        is_supporters_only: true,
                        is_edited: true,
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

        it("should update post with isHidden flag", async () => {
            req.body.isHidden = true;

            await PostController.updatePost(req, res, next);

            expect(PostModel.update).toHaveBeenCalledWith(
                "10",
                5,
                expect.objectContaining({
                    isHidden: true,
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("should return 404 if post not found", async () => {
            PostModel.update.mockResolvedValue(null);

            await PostController.updatePost(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith("Post not found", 404);
        });

        it("should return 403 if user is not the author", async () => {
            const unauthorizedError = new Error(
                "Unauthorized to update this post"
            );
            PostModel.update.mockRejectedValue(unauthorizedError);

            await PostController.updatePost(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Unauthorized to update this post",
                403
            );
        });

        it("should handle validation errors", async () => {
            const validationError = {
                msg: "Content cannot be empty if provided",
            };
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
            const validateUpdatePost =
                require("../validators/post.validator").validateUpdatePost;

            // Simulate middleware execution (simplified)
            validationResult.isEmpty = jest.fn().mockReturnValue(false);
            validationResult.array = jest
                .fn()
                .mockReturnValue([validationError]);

            expect(() =>
                validateUpdatePost[validateUpdatePost.length - 1](
                    req,
                    res,
                    next
                )
            ).not.toThrow();

            expect(next).toHaveBeenCalled();
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            PostModel.update.mockRejectedValue(dbError);

            await PostController.updatePost(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });
});
