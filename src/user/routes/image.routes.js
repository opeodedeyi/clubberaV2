// src/user/routes/images.routes.js

const router = require("express").Router();
const controller = require("../controllers/image.controller");
const validator = require("../validators/image.validator");
const authMiddleware = require("../../middleware/auth");

// All these routes require authentication
router.use(authMiddleware.authenticate);

// Get pre-signed URL for direct S3 upload
router.post(
    "/images/upload-url",
    validator.validateGetUploadUrl,
    controller.getUploadUrl
);

// Save image metadata after successful upload
router.post(
    "/images/save",
    validator.validateSaveImage,
    controller.saveProfileImage
);

// Delete profile image
router.delete("/images", controller.deleteProfileImage);

module.exports = router;
