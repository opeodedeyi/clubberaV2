// src/communitySupport/validators/supportSubscription.validator.js
const { body, param, query } = require("express-validator");

// Validate subscription creation
const validateCreateSubscription = [
    param("communityId").isInt().withMessage("Community ID must be an integer"),

    body("paymentMethodId")
        .notEmpty()
        .withMessage("Payment method ID is required"),

    body("paymentProvider")
        .notEmpty()
        .withMessage("Payment provider is required")
        .isIn(["stripe", "paypal"])
        .withMessage("Payment provider must be 'stripe' or 'paypal'"),
];

// Validate get user subscription
const validateGetSubscription = [
    param("communityId").isInt().withMessage("Community ID must be an integer"),
];

// Validate get user subscriptions
const validateGetUserSubscriptions = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
];

// Validate get community subscribers
const validateGetCommunitySubscribers = [
    param("communityId").isInt().withMessage("Community ID must be an integer"),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
];

// Validate cancel subscription
const validateCancelSubscription = [
    param("subscriptionId")
        .isInt()
        .withMessage("Subscription ID must be an integer"),

    body("cancelAtPeriodEnd")
        .optional()
        .isBoolean()
        .withMessage("cancelAtPeriodEnd must be a boolean"),
];

// Validate get payment history
const validateGetPaymentHistory = [
    param("subscriptionId")
        .isInt()
        .withMessage("Subscription ID must be an integer"),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
];

module.exports = {
    validateCreateSubscription,
    validateGetSubscription,
    validateGetUserSubscriptions,
    validateGetCommunitySubscribers,
    validateCancelSubscription,
    validateGetPaymentHistory,
};
