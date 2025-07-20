// src/post/controllers/poll.controller.js
const PollModel = require("../models/poll.model");
const PostModel = require("../models/post.model");
const ApiError = require("../../utils/ApiError");

class PollController {
    async createPoll(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { communityId, content, isSupportersOnly, pollData } =
                req.body;

            // Check if user is a member of the community
            const isMember = await PostModel.isUserAuthorized(
                userId,
                communityId
            );
            if (!isMember) {
                return next(
                    new ApiError("User is not a member of this community", 403)
                );
            }

            // Create poll
            const poll = await PollModel.createPoll({
                communityId,
                userId,
                content,
                isSupportersOnly,
                pollData,
            });

            // Get complete poll with author details
            const completePoll = await PollModel.getPollDetails(
                poll.id,
                userId
            );

            return res.status(201).json({
                status: "success",
                data: completePoll,
            });
        } catch (error) {
            if (error.message === "Poll must have at least 2 options") {
                return next(new ApiError(error.message, 400));
            }
            next(error);
        }
    }

    async getPoll(req, res, next) {
        try {
            const { pollId } = req.params;
            const userId = req.user ? req.user.id : null;

            const poll = await PollModel.getPollDetails(pollId, userId);
            if (!poll) {
                return next(new ApiError("Poll not found", 404));
            }

            // Check if poll is supporters-only and if user has access
            if (poll.is_supporters_only && userId) {
                const hasAccess = await PostModel.isSupporterAccessible(
                    pollId,
                    userId
                );
                if (!hasAccess) {
                    return next(
                        new ApiError(
                            "This poll is for community supporters only",
                            403
                        )
                    );
                }
            } else if (poll.is_supporters_only && !userId) {
                return next(
                    new ApiError(
                        "Authentication required to view this poll",
                        401
                    )
                );
            }

            return res.status(200).json({
                status: "success",
                data: poll,
            });
        } catch (error) {
            next(error);
        }
    }

    async votePoll(req, res, next) {
        try {
            const { pollId } = req.params;
            const { id: userId } = req.user;
            const { optionIndices } = req.body;

            if (
                !optionIndices ||
                (Array.isArray(optionIndices) && optionIndices.length === 0)
            ) {
                return next(new ApiError("Option indices are required", 400));
            }

            // Check if poll exists
            const poll = await PollModel.getPollDetails(pollId, userId);
            if (!poll) {
                return next(new ApiError("Poll not found", 404));
            }

            // Check if poll is supporters-only and if user has access
            if (poll.is_supporters_only) {
                const hasAccess = await PostModel.isSupporterAccessible(
                    pollId,
                    userId
                );
                if (!hasAccess) {
                    return next(
                        new ApiError(
                            "This poll is for community supporters only",
                            403
                        )
                    );
                }
            }

            try {
                // Vote for poll
                const updatedPoll = await PollModel.votePoll(
                    pollId,
                    userId,
                    optionIndices
                );

                // Get latest poll details
                const latestPoll = await PollModel.getPollDetails(
                    pollId,
                    userId
                );

                return res.status(200).json({
                    status: "success",
                    data: latestPoll,
                });
            } catch (error) {
                if (
                    error.message ===
                        "User has already voted and multiple votes are not allowed" ||
                    error.message === "Poll has ended" ||
                    error.message === "Invalid option index" ||
                    error.message === "Multiple votes not allowed"
                ) {
                    return next(new ApiError(error.message, 400));
                }
                throw error;
            }
        } catch (error) {
            next(error);
        }
    }

    async endPoll(req, res, next) {
        try {
            const { pollId } = req.params;
            const { id: userId } = req.user;

            try {
                // End poll
                const updatedPoll = await PollModel.endPoll(pollId, userId);

                if (!updatedPoll) {
                    return next(new ApiError("Poll not found", 404));
                }

                // Get latest poll details
                const latestPoll = await PollModel.getPollDetails(
                    pollId,
                    userId
                );

                return res.status(200).json({
                    status: "success",
                    data: latestPoll,
                });
            } catch (error) {
                if (error.message === "Unauthorized to end this poll") {
                    return next(new ApiError(error.message, 403));
                }
                throw error;
            }
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PollController();
