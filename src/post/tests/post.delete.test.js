// src/post/tests/post.delete.test.js

const { validationResult } = require("express-validator");
const PostController = require("../controllers/post.controller");
const PostModel = require("../models/post.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("express-validator");
jest.mock("../models/post.model");
jest.mock("../../utils/ApiError");

describe("PostController - Delete Post", () => {
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
        PostModel.delete.mockResolvedValue({
            id: 10,
        });
    });

    describe("deletePost", () => {
        it("should delete a post successfully", async () => {
            await PostController.deletePost(req, res, next);

            expect(PostModel.delete).toHaveBeenCalledWith("10", 5);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: "Post deleted successfully",
                    data: { id: 10 },
                })
            );
        });

        it("should return 404 if post not found", async () => {
            PostModel.delete.mockResolvedValue(null);

            await PostController.deletePost(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith("Post not found", 404);
        });

        it("should return 403 if user is not the author", async () => {
            const unauthorizedError = new Error(
                "Unauthorized to delete this post"
            );
            PostModel.delete.mockRejectedValue(unauthorizedError);

            await PostController.deletePost(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Unauthorized to delete this post",
                403
            );
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            // Mock a different error to test the general error handling
            dbError.message = "Database connection failed";
            PostModel.delete.mockRejectedValue(dbError);

            await PostController.deletePost(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });
});
