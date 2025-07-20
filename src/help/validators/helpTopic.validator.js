// src/help/validators/helpTopic.validator.js
const { body, param, validationResult } = require("express-validator");

const validateCreateTopic = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Topic name is required")
        .isLength({ max: 100 })
        .withMessage("Topic name must be no more than 100 characters"),

    body("description")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Description must be no more than 1000 characters"),

    body("unique_url")
        .trim()
        .notEmpty()
        .withMessage("Unique URL is required")
        .matches(/^[a-z0-9-]+$/)
        .withMessage(
            "Unique URL can only contain lowercase letters, numbers, and hyphens"
        )
        .isLength({ max: 255 })
        .withMessage("Unique URL must be no more than 255 characters"),

    body("position")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Position must be a non-negative integer"),

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

const validateUpdateTopic = [
    param("id").isInt({ min: 1 }).withMessage("Invalid topic ID"),

    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Topic name cannot be empty")
        .isLength({ max: 100 })
        .withMessage("Topic name must be no more than 100 characters"),

    body("description")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Description must be no more than 1000 characters"),

    body("unique_url")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Unique URL cannot be empty")
        .matches(/^[a-z0-9-]+$/)
        .withMessage(
            "Unique URL can only contain lowercase letters, numbers, and hyphens"
        )
        .isLength({ max: 255 })
        .withMessage("Unique URL must be no more than 255 characters"),

    body("position")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Position must be a non-negative integer"),

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
    validateCreateTopic,
    validateUpdateTopic,
};
