const express = require("express");
const router = express.Router();
const subscriptionAdminController = require("../controllers/subscriptionAdmin.controller");
const subscriptionAdminValidator = require("../validators/subscriptionAdmin.validator");
const { authenticate } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/role");

// Ensure all routes require superuser role
router.use(authenticate, requireRole("superuser"));

// Get all subscription plans (including inactive)
router.get("/plans", subscriptionAdminController.getAllSubscriptionPlans);

// Get a specific subscription plan
router.get("/plans/:id", subscriptionAdminController.getSubscriptionPlanById);

// Create a new subscription plan
router.post(
    "/plans",
    subscriptionAdminValidator.createSubscriptionPlan,
    subscriptionAdminController.createSubscriptionPlan
);

// Update a subscription plan
router.put(
    "/plans/:id",
    subscriptionAdminValidator.updateSubscriptionPlan,
    subscriptionAdminController.updateSubscriptionPlan
);

// Update a subscription plan's price
router.put(
    "/plans/:id/price",
    subscriptionAdminValidator.updateSubscriptionPlanPrice,
    subscriptionAdminController.updateSubscriptionPlanPrice
);

// Get a subscription plan's price history
router.get(
    "/plans/:id/price-history",
    subscriptionAdminController.getSubscriptionPlanPriceHistory
);

// Activate or deactivate a subscription plan
router.put(
    "/plans/:id/status",
    subscriptionAdminValidator.toggleSubscriptionPlanStatus,
    subscriptionAdminController.toggleSubscriptionPlanStatus
);

// Offer a promotional subscription to a community
router.post(
    "/communities/:communityId/promotional",
    subscriptionAdminValidator.offerPromotionalSubscription,
    subscriptionAdminController.offerPromotionalSubscription
);

// List all communities with a specific subscription plan
router.get(
    "/subscriptions/:plan_code",
    subscriptionAdminValidator.listSubscriptionsByPlan,
    subscriptionAdminController.listSubscriptionsByPlan
);

module.exports = router;
