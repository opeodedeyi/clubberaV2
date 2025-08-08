// src/community/routes/communitySearch.routes.js

const express = require("express");
const router = express.Router();
const communitySearchController = require("../controllers/communitySearch.controller");
const communitySearchValidator = require("../validators/communitySearch.validator");
const optionalAuth = require("../../middleware/optionalAuth");

// Route to search communities
router.get(
    "/search",
    optionalAuth, // Use optional authentication to include private communities for logged-in users
    communitySearchValidator.validateSearch,
    communitySearchController.searchCommunities
);

module.exports = router;
