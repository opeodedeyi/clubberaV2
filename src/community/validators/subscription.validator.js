// src/community/validators/subscription.validator.js

const { body, param, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

// Helper function to validate request
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(errors.array()[0].msg, 400);
    }
    next();
};

exports.upgradeSubscription = [
    param("id").isInt().withMessage("Invalid community ID"),
    body("plan_code")
        .isIn(["pro_monthly", "pro_yearly"])
        .withMessage("Plan code must be either pro_monthly or pro_yearly"),
    body("payment_details")
        .optional()
        .isObject()
        .withMessage("Payment details must be an object"),
    body("payment_details.payment_method")
        .optional()
        .isString()
        .withMessage("Payment method must be a string"),
    body("payment_details.amount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Amount must be a positive number"),
    validate,
];

exports.cancelSubscription = [
    param("id").isInt().withMessage("Invalid community ID"),
    body("at_period_end")
        .optional()
        .isBoolean()
        .withMessage("at_period_end must be a boolean"),
    validate,
];

exports.getPaymentHistory = [
    param("id").isInt().withMessage("Invalid community ID"),
    validate,
];
