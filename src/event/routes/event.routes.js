// src/event/routes/event.routes.js
const express = require("express");
const router = express.Router();
const EventController = require("../controllers/event.controller");
const { authenticate } = require("../../middleware/auth");
const optionalAuth = require("../../middleware/optionalAuth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const {
    validateEventId,
    validateEventUrl,
    validateCreateEvent,
    validateUpdateEvent,
    validateCommunityEventsQuery,
    validateUserEventsQuery,
} = require("../validators/event.validator");
const {
    validateSaveEventImage,
} = require("../validators/image.validator");

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

// Get a specific event by ID
router.get("/:eventId", optionalAuth, validateEventId, EventController.getEvent);

// Get a specific event by unique URL
router.get("/url/:uniqueUrl", optionalAuth, validateEventUrl, EventController.getEventByUrl);

// Update an event
router.put(
    "/:eventId",
    authenticate,
    verifyEmail,
    validateUpdateEvent,
    EventController.updateEvent
);

// Update event cover image
router.put(
    "/:eventId/cover-image",
    authenticate,
    verifyEmail,
    validateSaveEventImage,
    EventController.updateEventCoverImage
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
