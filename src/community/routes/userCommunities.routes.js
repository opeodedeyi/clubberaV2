// src/community/routes/userCommunities.routes.js

const express = require("express");
const router = express.Router();
const userCommunitiesController = require("../controllers/userCommunities.controller");
const userCommunitiesValidator = require("../validators/userCommunities.validator");
const optionalAuth = require("../../middleware/optionalAuth");

// Route to get user communities
router.get(
    "/:userIdentifier/communities",
    optionalAuth, // Optional authentication
    userCommunitiesValidator.validateGetUserCommunities,
    userCommunitiesController.getUserCommunities
);

module.exports = router;
