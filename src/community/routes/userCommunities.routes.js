// src/community/routes/userCommunities.routes.js

const express = require("express");
const router = express.Router();
const userCommunitiesController = require("../controllers/userCommunities.controller");
const userCommunitiesValidator = require("../validators/userCommunities.validator");
const optionalAuth = require("../../middleware/optionalAuth");
const { authenticate } = require("../../middleware/auth");

// Route to get current user's communities (token-based)
router.get(
    "/my/communities",
    authenticate, // Required authentication
    userCommunitiesValidator.validateGetMyUserCommunities,
    userCommunitiesController.getMyUserCommunities
);

// Route to get user communities by ID or unique URL
router.get(
    "/:userIdentifier/communities",
    optionalAuth, // Optional authentication
    userCommunitiesValidator.validateGetUserCommunities,
    userCommunitiesController.getUserCommunities
);

module.exports = router;
