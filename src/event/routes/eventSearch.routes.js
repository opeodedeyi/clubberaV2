// src/event/routes/eventSearch.routes.js
const express = require("express");
const router = express.Router();
const EventSearchController = require("../controllers/eventSearch.controller");
const optionalAuth = require("../../middleware/optionalAuth");
const {
    validateEventSearch,
    validateEventUniqueUrl,
} = require("../validators/eventSearch.validator");

// Search for events
router.get(
    "/search",
    optionalAuth,
    validateEventSearch,
    EventSearchController.searchEvents
);

// Get event by unique URL
router.get(
    "/url/:uniqueUrl",
    optionalAuth,
    validateEventUniqueUrl,
    EventSearchController.getEventByUniqueUrl
);

module.exports = router;
