// src/communitySupport/validators/supportPlan.validator.js
const { body, param, query } = require("express-validator");

// Validate support plan creation
const validateCreatePlan = [
    param("communityId").isInt().withMessage("Community ID must be an integer"),

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Plan name is required")
        .isLength({ max: 100 })
        .withMessage("Plan name must be less than 100 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must be less than 1000 characters"),

    body("monthlyPrice")
        .notEmpty()
        .withMessage("Monthly price is required")
        .isFloat({ min: 0.5, max: 999.99 })
        .withMessage("Monthly price must be between $0.50 and $999.99"),

    body("currency")
        .optional()
        .trim()
        .isLength({ min: 3, max: 3 })
        .withMessage("Currency must be a 3-letter code")
        .isUppercase()
        .withMessage("Currency must be uppercase"),

    body("benefits")
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Benefits must be less than 2000 characters"),
];

// Validate support plan update
const validateUpdatePlan = [
    param("communityId").isInt().withMessage("Community ID must be an integer"),

    param("planId").isInt().withMessage("Plan ID must be an integer"),

    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Plan name cannot be empty")
        .isLength({ max: 100 })
        .withMessage("Plan name must be less than 100 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must be less than 1000 characters"),

    body("monthlyPrice")
        .optional()
        .isFloat({ min: 0.5, max: 999.99 })
        .withMessage("Monthly price must be between $0.50 and $999.99"),

    body("currency")
        .optional()
        .trim()
        .isLength({ min: 3, max: 3 })
        .withMessage("Currency must be a 3-letter code")
        .isUppercase()
        .withMessage("Currency must be uppercase"),

    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),

    body("benefits")
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Benefits must be less than 2000 characters"),
];

// Validate get plan by ID
const validateGetPlan = [
    param("communityId").isInt().withMessage("Community ID must be an integer"),
];

// Validate delete plan
const validateDeletePlan = [
    param("communityId").isInt().withMessage("Community ID must be an integer"),

    param("planId").isInt().withMessage("Plan ID must be an integer"),
];

module.exports = {
    validateCreatePlan,
    validateUpdatePlan,
    validateGetPlan,
    validateDeletePlan,
};
