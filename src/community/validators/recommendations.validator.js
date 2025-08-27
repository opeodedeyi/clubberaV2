const { query, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

// Helper function to validate request
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(errors.array()[0].msg, 400);
    }
    next();
};

// Validator for get recommendations endpoint
exports.validateGetRecommendations = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage("Limit must be between 1 and 20"),

    validate,
];

module.exports = exports;