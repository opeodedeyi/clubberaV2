// src/post/routes/poll.routes.js
const express = require("express");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const optionalAuth = require("../../middleware/optionalAuth");
const PollController = require("../controllers/poll.controller");
const PollValidator = require("../validators/poll.validator");

const router = express.Router();

// Get a specific poll
router.get("/polls/:pollId", optionalAuth, PollController.getPoll);

// Create a new poll
router.post(
    "/polls",
    authenticate,
    verifyEmail,
    PollValidator.validateCreatePoll,
    PollController.createPoll
);

// Vote on a poll
router.post(
    "/polls/:pollId/vote",
    authenticate,
    verifyEmail,
    PollValidator.validateVotePoll,
    PollController.votePoll
);

// End a poll (only by creator)
router.post(
    "/polls/:pollId/end",
    authenticate,
    verifyEmail,
    PollController.endPoll
);

module.exports = router;
