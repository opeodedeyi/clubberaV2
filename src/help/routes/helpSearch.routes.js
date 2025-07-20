// src/help/routes/helpSearch.routes.js
const express = require("express");
const optionalAuth = require("../../middleware/optionalAuth");
const HelpSearchController = require("../controllers/helpSearch.controller");
const { validateSearch } = require("../validators/helpSearch.validator");

const router = express.Router();

// All search routes use optional auth to determine access level
router.get(
    "/search/query",
    optionalAuth,
    validateSearch,
    HelpSearchController.searchHelpEntries
);
router.get(
    "/search/popular",
    optionalAuth,
    HelpSearchController.getPopularEntries
);

module.exports = router;
