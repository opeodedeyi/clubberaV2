// src/help/routes/helpFeedback.routes.js
const express = require("express");
const { authenticate } = require("../../middleware/auth");
const optionalAuth = require("../../middleware/optionalAuth");
const { requireRole } = require("../../middleware/role");
const HelpFeedbackController = require("../controllers/helpFeedback.controller");
const { validateFeedback } = require("../validators/helpFeedback.validator");

const router = express.Router();

// Add feedback (available to all users, authenticated or not)
router.post(
    "/feedback/",
    optionalAuth,
    validateFeedback,
    HelpFeedbackController.addFeedback
);

// View feedback stats (staff/superuser only)
router.get(
    "/feedback/entry/:entry_id",
    authenticate,
    requireRole(["staff", "superuser"]),
    HelpFeedbackController.getFeedbackStats
);

module.exports = router;
