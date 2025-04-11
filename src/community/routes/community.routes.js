// src/community/routes/community.routes.js

const express = require("express");
const router = express.Router();
const communityController = require("../controllers/community.controller");
const subscriptionController = require("../controllers/subscription.controller");
const communityValidator = require("../validators/community.validator");
const subscriptionValidator = require("../validators/subscription.validator");
const restrictionRoutes = require("./restriction.routes");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const { requireRole } = require("../../middleware/role");

// Create a new community
router.post(
    "/",
    authenticate,
    verifyEmail,
    communityValidator.createCommunity,
    communityController.createCommunity
);

// Get a community by ID or unique url
router.get(
    "/:identifier",
    optionalAuth,
    communityController.getCommunityDetails
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

// Get community members (authenticated users only)
router.get(
    "/:id/members",
    authenticate,
    communityValidator.validateGetMembers,
    communityController.getCommunityMembers
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

// Subscription related routes - now using the subscription controller
// Get community subscription details
router.get(
    "/:id/subscription",
    authenticate,
    subscriptionController.getCommunitySubscription
);

// Get available subscription plans
router.get("/subscription-plans", subscriptionController.getSubscriptionPlans);

// Upgrade to Pro plan
router.post(
    "/:id/subscription/upgrade",
    authenticate,
    subscriptionValidator.upgradeSubscription,
    subscriptionController.upgradeToPro
);

// Downgrade to Free plan
router.post(
    "/:id/subscription/downgrade",
    authenticate,
    subscriptionController.downgradeToFree
);

// Cancel subscription
router.post(
    "/:id/subscription/cancel",
    authenticate,
    subscriptionValidator.cancelSubscription,
    subscriptionController.cancelSubscription
);

// Get payment history
router.get(
    "/:id/subscription/payments",
    authenticate,
    subscriptionValidator.getPaymentHistory,
    subscriptionController.getPaymentHistory
);

// Use restriction routes
router.use("/:id/members", restrictionRoutes);

module.exports = router;
