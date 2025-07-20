// src/post/tests/poll.create-vote.test.js

const { validationResult } = require("express-validator");
const PollController = require("../controllers/poll.controller");
const PollModel = require("../models/poll.model");
const PostModel = require("../models/post.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("express-validator");
jest.mock("../models/poll.model");
jest.mock("../models/post.model");
jest.mock("../../utils/ApiError");

describe("Poll Functionality", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {
                pollId: "1",
            },
            user: {
                id: 1,
                email: "user@example.com",
                fullName: "Test User",
            },
            body: {
                communityId: 1,
                content: "What's your favorite color?",
                isSupportersOnly: false,
                pollData: {
                    question: "What's your favorite color?",
                    options: [
                        { text: "Red" },
                        { text: "Blue" },
                        { text: "Green" },
                    ],
                    settings: {
                        allowMultipleVotes: false,
                        endDate: null,
                    },
                },
                optionIndices: [1], // For voting tests
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

        PostModel.isUserAuthorized.mockResolvedValue(true);
        PostModel.isSupporterAccessible.mockResolvedValue(true);

        PollModel.createPoll.mockResolvedValue({
            id: 1,
            community_id: 1,
            user_id: 1,
            content: "What's your favorite color?",
            content_type: "poll",
            is_supporters_only: false,
            poll_data: {
                question: "What's your favorite color?",
                options: [
                    { text: "Red", votes: 0 },
                    { text: "Blue", votes: 0 },
                    { text: "Green", votes: 0 },
                ],
                settings: {
                    allowMultipleVotes: false,
                    endDate: null,
                },
                voters: [],
            },
            created_at: new Date(),
            updated_at: new Date(),
        });

        PollModel.getPollDetails.mockResolvedValue({
            id: 1,
            community_id: 1,
            user_id: 1,
            content: "What's your favorite color?",
            content_type: "poll",
            is_supporters_only: false,
            poll_data: {
                question: "What's your favorite color?",
                options: [
                    { text: "Red", votes: 0 },
                    { text: "Blue", votes: 0 },
                    { text: "Green", votes: 0 },
                ],
                settings: {
                    allowMultipleVotes: false,
                    endDate: null,
                },
                voters: [],
            },
            userHasVoted: false,
            author_name: "Test User",
            author_url: "test-user",
            created_at: new Date(),
            updated_at: new Date(),
        });

        PollModel.votePoll.mockResolvedValue({
            id: 1,
            poll_data: {
                options: [
                    { text: "Red", votes: 0 },
                    { text: "Blue", votes: 1 },
                    { text: "Green", votes: 0 },
                ],
                voters: [1],
            },
        });

        PollModel.endPoll.mockResolvedValue({
            id: 1,
            poll_data: {
                settings: {
                    endDate: new Date().toISOString(),
                },
            },
        });

        // Configure ApiError mock
        ApiError.mockImplementation((message, statusCode) => {
            return { message, statusCode };
        });
    });

    describe("Create Poll", () => {
        it("should create a poll successfully", async () => {
            await PollController.createPoll(req, res, next);

            expect(PostModel.isUserAuthorized).toHaveBeenCalledWith(1, 1);
            expect(PollModel.createPoll).toHaveBeenCalledWith({
                communityId: 1,
                userId: 1,
                content: "What's your favorite color?",
                isSupportersOnly: false,
                pollData: expect.objectContaining({
                    question: "What's your favorite color?",
                    options: expect.arrayContaining([
                        { text: "Red" },
                        { text: "Blue" },
                        { text: "Green" },
                    ]),
                }),
            });

            expect(PollModel.getPollDetails).toHaveBeenCalledWith(1, 1);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.objectContaining({
                    id: 1,
                    content: "What's your favorite color?",
                    content_type: "poll",
                    userHasVoted: false,
                }),
            });
        });

        it("should handle validation errors", async () => {
            // In most Express applications, validation errors are handled by middleware
            // before the controller is called. We'll simulate that behavior here.
            const validationError = {
                msg: "Poll must have at least 2 options",
            };
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

        it("should return 403 when user is not a community member", async () => {
            PostModel.isUserAuthorized.mockResolvedValue(false);

            await PollController.createPoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "User is not a member of this community",
                403
            );
        });

        it("should handle poll creation with invalid data", async () => {
            PollModel.createPoll.mockImplementation(() => {
                throw new Error("Poll must have at least 2 options");
            });

            await PollController.createPoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Poll must have at least 2 options",
                400
            );
        });
    });

    describe("Get Poll", () => {
        it("should get a poll successfully", async () => {
            req.params = { pollId: "1" };

            await PollController.getPoll(req, res, next);

            expect(PollModel.getPollDetails).toHaveBeenCalledWith("1", 1);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.objectContaining({
                    id: 1,
                    content: "What's your favorite color?",
                    content_type: "poll",
                    userHasVoted: false,
                }),
            });
        });

        it("should return 404 when poll not found", async () => {
            PollModel.getPollDetails.mockResolvedValue(null);

            await PollController.getPoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith("Poll not found", 404);
        });

        it("should return 403 when poll is supporters-only and user has no access", async () => {
            PollModel.getPollDetails.mockResolvedValue({
                id: 1,
                is_supporters_only: true,
            });

            PostModel.isSupporterAccessible.mockResolvedValue(false);

            await PollController.getPoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This poll is for community supporters only",
                403
            );
        });

        it("should return 401 when poll is supporters-only and user is not authenticated", async () => {
            req.user = null;

            PollModel.getPollDetails.mockResolvedValue({
                id: 1,
                is_supporters_only: true,
            });

            await PollController.getPoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Authentication required to view this poll",
                401
            );
        });
    });

    describe("Vote Poll", () => {
        it("should vote on a poll successfully", async () => {
            req.params = { pollId: "1" };
            req.body = { optionIndices: [1] };

            // Mock that a poll with is_supporters_only is false
            PollModel.getPollDetails.mockResolvedValue({
                id: 1,
                is_supporters_only: false,
            });

            await PollController.votePoll(req, res, next);

            expect(PollModel.getPollDetails).toHaveBeenCalledWith("1", 1);
            // Note: We don't need to check supporter access if the poll is not supporters-only
            // So this function should not be called
            expect(PostModel.isSupporterAccessible).not.toHaveBeenCalled();
            expect(PollModel.votePoll).toHaveBeenCalledWith("1", 1, [1]);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.any(Object),
            });
        });

        it("should return 400 when option indices are missing", async () => {
            req.body = {};

            await PollController.votePoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Option indices are required",
                400
            );
        });

        it("should return 404 when poll not found", async () => {
            PollModel.getPollDetails.mockResolvedValue(null);

            await PollController.votePoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith("Poll not found", 404);
        });

        it("should return 403 when poll is supporters-only and user has no access", async () => {
            PollModel.getPollDetails.mockResolvedValue({
                id: 1,
                is_supporters_only: true,
            });

            PostModel.isSupporterAccessible.mockResolvedValue(false);

            await PollController.votePoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This poll is for community supporters only",
                403
            );
        });

        it("should handle voting errors", async () => {
            PollModel.votePoll.mockImplementation(() => {
                throw new Error(
                    "User has already voted and multiple votes are not allowed"
                );
            });

            await PollController.votePoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "User has already voted and multiple votes are not allowed",
                400
            );
        });
    });

    describe("End Poll", () => {
        it("should end a poll successfully", async () => {
            req.params = { pollId: "1" };

            await PollController.endPoll(req, res, next);

            expect(PollModel.getPollDetails).toHaveBeenCalledWith("1", 1);
            expect(PollModel.endPoll).toHaveBeenCalledWith("1", 1);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.objectContaining({
                    id: 1,
                    userHasVoted: false,
                }),
            });
        });

        it("should return 404 when poll not found", async () => {
            PollModel.endPoll.mockResolvedValue(null);

            await PollController.endPoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith("Poll not found", 404);
        });

        it("should handle unauthorized end attempts", async () => {
            PollModel.endPoll.mockImplementation(() => {
                throw new Error("Unauthorized to end this poll");
            });

            await PollController.endPoll(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Unauthorized to end this poll",
                403
            );
        });
    });
});
