// src/help/routes/helpEntry.routes.js
const express = require("express");
const { authenticate } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/role");
const optionalAuth = require("../../middleware/optionalAuth");
const HelpEntryController = require("../controllers/helpEntry.controller");
const {
    validateCreateEntry,
    validateUpdateEntry,
} = require("../validators/helpEntry.validator");

const router = express.Router();

// Routes requiring staff/superuser role
router.post(
    "/entries/",
    authenticate,
    requireRole(["staff", "superuser"]),
    validateCreateEntry,
    HelpEntryController.createEntry
);

router.put(
    "/entries/:id",
    authenticate,
    requireRole(["staff", "superuser"]),
    validateUpdateEntry,
    HelpEntryController.updateEntry
);

router.delete(
    "/entries/:id",
    authenticate,
    requireRole(["staff", "superuser"]),
    HelpEntryController.deleteEntry
);

// Public routes (with optional auth for access control)
router.get("/", optionalAuth, HelpEntryController.getAllEntries);
router.get("/:id", optionalAuth, HelpEntryController.getEntryById);
router.get("/url/:url", optionalAuth, HelpEntryController.getEntryByUrl);

module.exports = router;
