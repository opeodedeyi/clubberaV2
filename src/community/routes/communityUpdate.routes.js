// src/community/routes/communityUpdate.routes.js

const express = require("express");
const router = express.Router();
const communityUpdateController = require("../controllers/communityUpdate.controller");
const communityUpdateValidator = require("../validators/communityUpdate.validator");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");

// Update basic community details
router.put(
    "/:id",
    authenticate,
    verifyEmail,
    communityUpdateValidator.validateBasicDetailsUpdate,
    communityUpdateController.updateBasicDetails
);

// Update community profile image
router.put(
    "/:id/profile-image",
    authenticate,
    verifyEmail,
    communityUpdateValidator.validateProfileImageUpdate,
    communityUpdateController.updateProfileImage
);

// Update community cover image
router.put(
    "/:id/cover-image",
    authenticate,
    verifyEmail,
    communityUpdateValidator.validateCoverImageUpdate,
    communityUpdateController.updateCoverImage
);

// Update community tags
router.put(
    "/:id/tags",
    authenticate,
    verifyEmail,
    communityUpdateValidator.validateTagsUpdate,
    communityUpdateController.updateTags
);

module.exports = router;
