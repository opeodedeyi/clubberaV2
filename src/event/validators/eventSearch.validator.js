// src/event/validators/eventSearch.validator.js
const { param, query, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

// Common middleware to check for validation errors
const checkValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ApiError(errors.array()[0].msg, 400));
    }
    next();
};

// Validate event search
const validateEventSearch = [
    query("query")
        .optional()
        .isString()
        .withMessage("Search query must be a string")
        .isLength({ max: 255 })
        .withMessage("Search query cannot exceed 255 characters"),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be a positive integer not exceeding 100"),

    query("timeRange")
        .optional()
        .isIn(["24h", "1w", "1m"])
        .withMessage("Time range must be one of: 24h, 1w, 1m"),

    query("tags")
        .optional()
        .customSanitizer((value) => {
            // If it's an array, return it as is
            if (Array.isArray(value)) {
                return value;
            }
            // If it's a string, split by comma
            if (typeof value === "string") {
                return value.split(",").map((tag) => tag.trim());
            }
            // Otherwise return empty array
            return [];
        }),

    query("sortBy")
        .optional()
        .isIn(["date", "relevance"])
        .withMessage("Sort by must be one of: date, relevance"),

    query("communityId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Community ID must be a positive integer"),

    checkValidationErrors,
];

// Validate unique URL
const validateEventUniqueUrl = [
    param("uniqueUrl")
        .notEmpty()
        .withMessage("Unique URL is required")
        .isString()
        .withMessage("Unique URL must be a string")
        .isLength({ max: 255 })
        .withMessage("Unique URL cannot exceed 255 characters"),

    checkValidationErrors,
];

module.exports = {
    validateEventSearch,
    validateEventUniqueUrl,
};
