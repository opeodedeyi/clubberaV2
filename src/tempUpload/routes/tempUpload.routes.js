const router = require("express").Router();
const tempUploadController = require("../controllers/tempUpload.controller");
const validator = require("../validators/tempUpload.validator");
const authMiddleware = require("../../middleware/auth");
const verifyEmailMiddleware = require("../../middleware/verifyEmail");

// All routes require authentication
router.use(authMiddleware.authenticate);
router.use(verifyEmailMiddleware.verifyEmail);

// Get pre-signed URL for temporary uploads (used during entity creation)
router.post(
    "/url",
    validator.validateTempUploadUrl,
    tempUploadController.getTempUploadUrl
);

module.exports = router;
