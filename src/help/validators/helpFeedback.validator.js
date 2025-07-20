// src/help/validators/helpFeedback.validator.js
const { body, validationResult } = require("express-validator");

const validateFeedback = [
    body("help_entry_id")
        .isInt({ min: 1 })
        .withMessage("Valid help entry ID is required"),

    body("is_helpful")
        .isBoolean()
        .withMessage("is_helpful must be a boolean value"),

    body("comment")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Comment must be no more than 1000 characters"),

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
    validateFeedback,
};
