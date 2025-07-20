// src/event/routes/image.routes.js
const express = require("express");
const router = express.Router();
const ImageController = require("../controllers/image.controller");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const {
    validateSaveEventImage,
    validateTransferTempImage,
    validateDeleteEventImage,
} = require("../validators/image.validator");

// Save image metadata for an event
router.post(
    "/:eventId/images",
    authenticate,
    verifyEmail,
    validateSaveEventImage,
    ImageController.saveEventImage
);

// Transfer temporary image to event
router.post(
    "/:eventId/images/transfer",
    authenticate,
    verifyEmail,
    validateTransferTempImage,
    ImageController.transferTempImageToEvent
);

// Get all images for an event
router.get("/:eventId/images", ImageController.getEventImages);

// Delete an image for an event
router.delete(
    "/:eventId/images",
    authenticate,
    verifyEmail,
    validateDeleteEventImage,
    ImageController.deleteEventImage
);

module.exports = router;
