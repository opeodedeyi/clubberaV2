// src/post/controllers/poll.controller.js
const PollModel = require("../models/poll.model");
const PostModel = require("../models/post.model");
const ApiError = require("../../utils/ApiError");
const CommunityPermissions = require("../../utils/community-permissions");

class PollController {
    async createPoll(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { communityId, content, isSupportersOnly, pollData } =
                req.body;

            // Check if user can create polls in the community
            const canCreatePoll = await CommunityPermissions.canCreatePolls(
                userId,
                communityId
            );
            if (!canCreatePoll.allowed) {
                return next(new ApiError(canCreatePoll.reason, 403));
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

    async votePoll(req, res, next) {
        try {
            const { pollId } = req.params;
            const { id: userId } = req.user;
            const { optionIndices } = req.body;

            if (
                !optionIndices ||
                (Array.isArray(optionIndices) && optionIndices.length === 0)
            ) {
                return next(new ApiError("At least one option must be selected", 400));
            }

            // PROTECTION: Check if poll exists and get initial data
            const poll = await PollModel.getPollDetails(pollId, userId);
            if (!poll) {
                return next(new ApiError("Poll not found", 404));
            }

            // PROTECTION: Check if user is a member of the poll's community
            const isMember = await PostModel.isUserAuthorized(
                userId,
                poll.community_id
            );
            if (!isMember) {
                return next(
                    new ApiError("You must be a member of this community to vote", 403)
                );
            }

            // PROTECTION: Check if poll is supporters-only and if user has access
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
                // Vote or change vote (automatically handled)
                const result = await PollModel.votePoll(
                    pollId,
                    userId,
                    optionIndices
                );

                // Get latest poll details with full data
                const latestPoll = await PollModel.getPollDetails(
                    pollId,
                    userId
                );

                const message = result.voteAction === 'changed'
                    ? 'Vote changed successfully'
                    : 'Vote recorded successfully';

                return res.status(200).json({
                    status: "success",
                    message: message,
                    data: latestPoll,
                });
            } catch (error) {
                // Handle specific validation errors
                if (
                    error.message === "Poll has ended" ||
                    error.message === "Invalid option index" ||
                    error.message === "This poll only allows voting for one option" ||
                    error.message === "At least one option must be selected" ||
                    error.message === "Poll has been deleted"
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
