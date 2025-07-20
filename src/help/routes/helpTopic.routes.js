// src/help/routes/helpTopic.routes.js
const express = require("express");
const { authenticate } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/role");
const optionalAuth = require("../../middleware/optionalAuth");
const HelpTopicController = require("../controllers/helpTopic.controller");
const {
    validateCreateTopic,
    validateUpdateTopic,
} = require("../validators/helpTopic.validator");

const router = express.Router();

// Routes requiring staff/superuser role
router.post(
    "/topics/",
    authenticate,
    requireRole(["staff", "superuser"]),
    validateCreateTopic,
    HelpTopicController.createTopic
);

router.put(
    "/topics/:id",
    authenticate,
    requireRole(["staff", "superuser"]),
    validateUpdateTopic,
    HelpTopicController.updateTopic
);

router.delete(
    "/topics/:id",
    authenticate,
    requireRole(["staff", "superuser"]),
    HelpTopicController.deleteTopic
);

// Public routes (with optional auth for access control)
router.get("/topics/", HelpTopicController.getAllTopics);
router.get("/topics/:id", HelpTopicController.getTopicById);
router.get("/topics/url/:url", optionalAuth, HelpTopicController.getTopicByUrl);

module.exports = router;
