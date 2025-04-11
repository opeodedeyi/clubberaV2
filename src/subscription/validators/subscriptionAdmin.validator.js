const { body, param, query, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

// Helper function to validate request
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(errors.array()[0].msg, 400);
    }
    next();
};

exports.createSubscriptionPlan = [
    body("name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Plan name must be between 2 and 100 characters"),
    body("code")
        .trim()
        .isLength({ min: 2, max: 50 })
        .matches(/^[a-z0-9_]+$/)
        .withMessage(
            "Plan code must be lowercase alphanumeric with underscores"
        ),
    body("description").optional().trim(),
    body("price")
        .isFloat({ min: 0 })
        .withMessage("Price must be a non-negative number"),
    body("currency")
        .optional()
        .isLength({ min: 3, max: 3 })
        .isUppercase()
        .withMessage("Currency must be a 3-letter ISO currency code"),
    body("billing_interval")
        .isIn(["monthly", "yearly", "one_time"])
        .withMessage("Billing interval must be monthly, yearly, or one_time"),
    body("features")
        .optional()
        .isObject()
        .withMessage("Features must be an object"),
    body("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean"),
    validate,
];

exports.updateSubscriptionPlan = [
    param("id").isInt().withMessage("Invalid plan ID"),
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Plan name must be between 2 and 100 characters"),
    body("description").optional().trim(),
    body("features")
        .optional()
        .isObject()
        .withMessage("Features must be an object"),
    body("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean"),
    validate,
];

exports.updateSubscriptionPlanPrice = [
    param("id").isInt().withMessage("Invalid plan ID"),
    body("price")
        .isFloat({ min: 0 })
        .withMessage("Price must be a non-negative number"),
    body("currency")
        .optional()
        .isLength({ min: 3, max: 3 })
        .isUppercase()
        .withMessage("Currency must be a 3-letter ISO currency code"),
    validate,
];

exports.toggleSubscriptionPlanStatus = [
    param("id").isInt().withMessage("Invalid plan ID"),
    body("activate").isBoolean().withMessage("activate must be a boolean"),
    validate,
];

exports.offerPromotionalSubscription = [
    param("communityId").isInt().withMessage("Invalid community ID"),
    body("duration_months")
        .isInt({ min: 1, max: 12 })
        .withMessage("Duration must be between 1 and 12 months"),
    validate,
];

exports.listSubscriptionsByPlan = [
    param("plan_code")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Invalid plan code"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    query("offset")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Offset must be a non-negative integer"),
    query("active")
        .optional()
        .isBoolean()
        .withMessage("active must be a boolean"),
    validate,
];
