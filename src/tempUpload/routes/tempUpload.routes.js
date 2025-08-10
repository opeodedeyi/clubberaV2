// src/tempUpload/routes/tempUpload.routes.js

const router = require("express").Router();
const tempUploadController = require("../controllers/tempUpload.controller");
const validator = require("../validators/tempUpload.validator");
const { authenticate } = require("../../middleware/auth"); // Changed
const { verifyEmail } = require("../../middleware/verifyEmail"); // Changed

// All routes require authentication
router.use(authenticate);
router.use(verifyEmail);

// Get pre-signed URL for temporary uploads (used during entity creation)
router.post(
    "/url",
    validator.validateTempUploadUrl,
    tempUploadController.getTempUploadUrl
);

module.exports = router;
