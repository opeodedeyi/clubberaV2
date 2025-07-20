// src/help/validators/helpSearch.validator.js
const { query, validationResult } = require("express-validator");

const validateSearch = [
    query("query")
        .trim()
        .notEmpty()
        .withMessage("Search query is required")
        .isLength({ min: 2 })
        .withMessage("Search query must be at least 2 characters"),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: "error",
                errors: errors.array().map((error) => ({
                    field: error.path,
                    message: error.msg,
                })),
            });
        }
        next();
    },
];

module.exports = {
    validateSearch,
};
