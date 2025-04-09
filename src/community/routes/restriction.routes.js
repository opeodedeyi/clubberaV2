// src/community/routes/restriction.routes.js

const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams ensures access to parent router params
const restrictionController = require("../controllers/restriction.controller");
const restrictionValidator = require("../validators/restriction.validator");
const { authenticate } = require("../../middleware/auth");

// Apply restriction (mute/ban) to a member
router.post(
    "/:userId/restrict",
    authenticate,
    restrictionValidator.createRestriction,
    restrictionController.restrictMember
);

// Get member restrictions (history)
router.get(
    "/:userId/restrictions",
    authenticate,
    restrictionValidator.getRestrictions,
    restrictionController.getMemberRestrictions
);

// Remove restriction from a member
router.delete(
    "/:userId/restrictions/:restrictionId",
    authenticate,
    restrictionValidator.removeRestriction,
    restrictionController.removeRestriction
);

module.exports = router;
