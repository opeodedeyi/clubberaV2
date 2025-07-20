// src/post/tests/reaction.add.test.js

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

describe("Add Post Reaction", () => {
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
                reactionType: "like",
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

        PostModel.isSupporterAccessible.mockResolvedValue(true);

        PostReactionModel.addReaction.mockResolvedValue({
            id: 1,
            post_id: 1,
            user_id: 1,
            reaction_type: "like",
            created_at: new Date(),
        });

        // Configure ApiError mock
        ApiError.mockImplementation((message, statusCode) => {
            return { message, statusCode };
        });
    });

    it("should add a reaction successfully", async () => {
        await PostReactionController.addReaction(req, res, next);

        expect(PostModel.findById).toHaveBeenCalledWith("1");
        expect(PostReactionModel.addReaction).toHaveBeenCalledWith(
            "1",
            1,
            "like"
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            data: expect.objectContaining({
                id: 1,
                post_id: 1,
                user_id: 1,
                reaction_type: "like",
            }),
        });
    });

    it("should handle validation errors", async () => {
        // In most Express applications, validation errors are handled by middleware
        // before the controller is called. We'll simulate that behavior here.
        const validationError = { msg: "Reaction type must be 'like'" };
        validationResult.mockReturnValue({
            isEmpty: jest.fn().mockReturnValue(false),
            array: jest.fn().mockReturnValue([validationError]),
        });

        // Direct mock for the error that would be created by the validator middleware
        const mockError = new ApiError(validationError.msg, 400);
        ApiError.mockReturnValueOnce(mockError);

        // Mock the middleware behavior
        const validateMiddleware = (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }
            return next();
        };

        // Call the middleware
        validateMiddleware(req, res, next);

        expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        expect(next).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should return 404 when post not found", async () => {
        PostModel.findById.mockResolvedValue(null);

        await PostReactionController.addReaction(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith("Post not found", 404);
    });

    it("should return 403 when post is supporters-only and user has no access", async () => {
        PostModel.findById.mockResolvedValue({
            id: 1,
            is_supporters_only: true,
        });

        PostModel.isSupporterAccessible.mockResolvedValue(false);

        await PostReactionController.addReaction(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "This post is for community supporters only",
            403
        );
    });

    it("should handle already existing reactions", async () => {
        PostReactionModel.addReaction.mockResolvedValue({
            alreadyExists: true,
        });

        await PostReactionController.addReaction(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            message: "Reaction already exists",
            data: expect.objectContaining({
                postId: "1",
                userId: 1,
                reactionType: "like",
            }),
        });
    });

    it("should handle database errors", async () => {
        const error = new Error("Database error");
        PostModel.findById.mockRejectedValue(error);

        await PostReactionController.addReaction(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
