const { query } = require("express-validator");

exports.validateSearch = [
    query("query")
        .optional()
        .isString()
        .withMessage("Search query must be a string")
        .isLength({ min: 2 })
        .withMessage("Search query must be at least 2 characters long"),

    query("lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("Latitude must be between -90 and 90"),

    query("lng")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("Longitude must be between -180 and 180"),

    query("radius")
        .optional()
        .isFloat({ min: 0.1, max: 500 })
        .withMessage("Radius must be between 0.1 and 500 miles"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    query("offset")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Offset must be a non-negative integer"),

    // Custom validation: either query OR coordinates must be provided
    query()
        .custom((_, { req }) => {
            const { query, lat, lng } = req.query;
            if (!query && !(lat && lng)) {
                throw new Error("Either search query or coordinates (lat & lng) must be provided");
            }
            if ((lat && !lng) || (!lat && lng)) {
                throw new Error("Both latitude and longitude must be provided for proximity search");
            }
            return true;
        }),
];

module.exports = exports;
