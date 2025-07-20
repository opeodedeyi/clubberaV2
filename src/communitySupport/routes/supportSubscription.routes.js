// src/communitySupport/routes/supportSubscription.routes.js
const express = require("express");
const router = express.Router();
const supportSubscriptionController = require("../controllers/supportSubscription.controller");
const supportSubscriptionValidator = require("../validators/supportSubscription.validator");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");

// Subscribe to a community support plan
router.post(
    "/:communityId/subscribe",
    authenticate,
    verifyEmail,
    supportSubscriptionValidator.validateCreateSubscription,
    supportSubscriptionController.createSubscription
);

// Get current user's subscription to a community
router.get(
    "/:communityId/subscription",
    authenticate,
    supportSubscriptionValidator.validateGetSubscription,
    supportSubscriptionController.getSubscription
);

// Get all of current user's active subscriptions
router.get(
    "/subscriptions",
    authenticate,
    supportSubscriptionValidator.validateGetUserSubscriptions,
    supportSubscriptionController.getUserSubscriptions
);

// Get all subscribers for a community (community owner only)
router.get(
    "/:communityId/subscribers",
    authenticate,
    verifyEmail,
    supportSubscriptionValidator.validateGetCommunitySubscribers,
    supportSubscriptionController.getCommunitySubscribers
);

// Cancel a subscription
router.post(
    "/subscriptions/:subscriptionId/cancel",
    authenticate,
    supportSubscriptionValidator.validateCancelSubscription,
    supportSubscriptionController.cancelSubscription
);

// Get payment history for a subscription
router.get(
    "/subscriptions/:subscriptionId/payments",
    authenticate,
    supportSubscriptionValidator.validateGetPaymentHistory,
    supportSubscriptionController.getPaymentHistory
);

module.exports = router;
