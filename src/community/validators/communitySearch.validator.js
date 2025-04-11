const { query } = require("express-validator");

exports.validateSearch = [
    query("query")
        .notEmpty()
        .withMessage("Search query is required")
        .isString()
        .withMessage("Search query must be a string")
        .isLength({ min: 2 })
        .withMessage("Search query must be at least 2 characters long"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    query("offset")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Offset must be a non-negative integer"),
];

module.exports = exports;
