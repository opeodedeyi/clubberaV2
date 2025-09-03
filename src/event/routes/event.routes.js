// src/event/routes/event.routes.js
const express = require("express");
const router = express.Router();
const EventController = require("../controllers/event.controller");
const { authenticate } = require("../../middleware/auth");
const optionalAuth = require("../../middleware/optionalAuth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const {
    validateEventId,
    validateCreateEvent,
    validateUpdateEvent,
    validateCommunityEventsQuery,
    validateUserEventsQuery,
} = require("../validators/event.validator");

// Create a new event in a community
router.post(
    "/communities/:communityId/events",
    authenticate,
    verifyEmail,
    validateCreateEvent,
    EventController.createEvent
);

// Get events for a community
router.get(
    "/communities/:communityId/events",
    validateCommunityEventsQuery,
    EventController.getCommunityEvents
);

// Get logged-in user's events (put before /:eventId to avoid conflicts)
router.get(
    "/user/my-events",
    authenticate,
    validateUserEventsQuery,
    EventController.getUserEvents
);

// Get a specific event
router.get("/:eventId", optionalAuth, validateEventId, EventController.getEvent);

// Update an event
router.put(
    "/:eventId",
    authenticate,
    verifyEmail,
    validateUpdateEvent,
    EventController.updateEvent
);

// Delete an event
router.delete(
    "/:eventId",
    authenticate,
    verifyEmail,
    validateEventId,
    EventController.deleteEvent
);

module.exports = router;
