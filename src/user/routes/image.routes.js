const router = require("express").Router();
const controller = require("../controllers/image.controller");
const validator = require("../validators/image.validator");
const authMiddleware = require("../../middleware/auth");

// All these routes require authentication
router.use(authMiddleware.authenticate);

// Get pre-signed URL for direct S3 upload
router.post(
    "/upload-url",
    validator.validateGetUploadUrl,
    controller.getUploadUrl
);

// Save image metadata after successful upload
router.post("/save", validator.validateSaveImage, controller.saveProfileImage);

// Delete profile image
router.delete("/", controller.deleteProfileImage);

module.exports = router;
