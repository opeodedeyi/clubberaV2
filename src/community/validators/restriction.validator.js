// src/community/validators/restriction.validator.js

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

exports.createRestriction = [
    param("id").isInt().withMessage("Invalid community ID"),
    param("userId").isInt().withMessage("Invalid user ID"),
    body("type")
        .isIn(["mute", "ban"])
        .withMessage("Restriction type must be mute or ban"),
    body("reason")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Reason must be 500 characters or less"),
    body("expires_at")
        .optional()
        .isISO8601()
        .withMessage(
            "Expiration date must be in ISO format (YYYY-MM-DDTHH:MM:SSZ)"
        ),
    validate,
];

exports.getRestrictions = [
    param("id").isInt().withMessage("Invalid community ID"),
    param("userId").isInt().withMessage("Invalid user ID"),
    validate,
];

exports.removeRestriction = [
    param("id").isInt().withMessage("Invalid community ID"),
    param("userId").isInt().withMessage("Invalid user ID"),
    param("restrictionId").isInt().withMessage("Invalid restriction ID"),
    validate,
];
