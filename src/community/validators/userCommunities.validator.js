const { param, query, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

// Helper function to validate request
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(errors.array()[0].msg, 400);
    }
    next();
};

// Validators for user communities endpoints
exports.validateGetUserCommunities = [
    param("userIdentifier")
        .notEmpty()
        .withMessage("User identifier is required"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    query("offset")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Offset must be a non-negative integer"),

    query("sort")
        .optional()
        .isIn(["role", "joined"])
        .withMessage("Sort must be 'role' or 'joined'"),

    query("search")
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage(
            "Search term must be a string with maximum length of 100 characters"
        ),

    validate,
];

// Validators for my user communities endpoint (token-based)
exports.validateGetMyUserCommunities = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    query("offset")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Offset must be a non-negative integer"),

    query("sort")
        .optional()
        .isIn(["role", "joined"])
        .withMessage("Sort must be 'role' or 'joined'"),

    query("search")
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage(
            "Search term must be a string with maximum length of 100 characters"
        ),

    validate,
];

module.exports = exports;
