const express = require("express");
const router = express.Router();
const communityController = require("../controllers/community.controller");
const communityValidator = require("../validators/community.validator");
const { authenticate } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/role");
const { verifyEmail } = require("../../middleware/verifyEmail");

// Create a new community
router.post(
    "/",
    authenticate,
    verifyEmail,
    communityValidator.createCommunity,
    communityController.createCommunity
);

// Deactivate a community (owner only)
router.put(
    "/:id/deactivate",
    authenticate,
    communityController.deactivateCommunity
);

// Reactivate a community (owner or superuser)
router.put(
    "/:id/reactivate",
    authenticate,
    communityController.reactivateCommunity
);

// Permanently delete a community (superuser only)
router.delete(
    "/:id",
    authenticate,
    requireRole("superuser"),
    communityController.deleteCommunity
);

// Join a community or request to join (private)
router.post(
    "/:id/join",
    authenticate,
    verifyEmail,
    communityValidator.joinCommunity,
    communityController.joinCommunity
);

// Leave a community
router.delete(
    "/:id/members/me",
    authenticate,
    communityValidator.leaveCommunity,
    communityController.leaveCommunity
);

// Get pending join requests (admins only)
router.get(
    "/:id/join-requests",
    authenticate,
    communityValidator.getJoinRequests,
    communityController.getJoinRequests
);

// Respond to join request (admins only)
router.put(
    "/:id/join-requests/:requestId",
    authenticate,
    communityValidator.respondToJoinRequest,
    communityController.respondToJoinRequest
);

module.exports = router;
