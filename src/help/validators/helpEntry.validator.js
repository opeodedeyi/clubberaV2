// src/help/validators/helpEntry.validator.js
const { body, param, validationResult } = require("express-validator");

const validateCreateEntry = [
    body("help_topic_id")
        .isInt({ min: 1 })
        .withMessage("Valid topic ID is required"),

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ max: 255 })
        .withMessage("Title must be no more than 255 characters"),

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

    body("content").notEmpty().withMessage("Content is required"),

    body("access_level")
        .optional()
        .isIn(["public", "registered", "premium", "staff"])
        .withMessage(
            "Invalid access level. Must be one of: public, registered, premium, staff"
        ),

    body("position")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Position must be a non-negative integer"),

    body("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean value"),

    body("cover_image")
        .optional()
        .isObject()
        .withMessage("cover_image must be an object"),

    body("cover_image.key")
        .if(body("cover_image").exists())
        .notEmpty()
        .withMessage("Image key is required when cover_image is provided"),

    body("cover_image.provider")
        .if(body("cover_image").exists())
        .optional()
        .isString()
        .withMessage("Provider must be a string"),

    body("cover_image.alt_text")
        .if(body("cover_image").exists())
        .optional()
        .isString()
        .withMessage("Alt text must be a string"),

    body("related_entries")
        .optional()
        .isArray()
        .withMessage("related_entries must be an array"),

    body("related_entries.*")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Each related entry ID must be a positive integer"),

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

const validateUpdateEntry = [
    param("id").isInt({ min: 1 }).withMessage("Invalid entry ID"),

    body("help_topic_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Valid topic ID is required"),

    body("title")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Title cannot be empty")
        .isLength({ max: 255 })
        .withMessage("Title must be no more than 255 characters"),

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

    body("content")
        .optional()
        .notEmpty()
        .withMessage("Content cannot be empty"),

    body("access_level")
        .optional()
        .isIn(["public", "registered", "staff"])
        .withMessage(
            "Invalid access level. Must be one of: public, registered, premium, staff"
        ),

    body("position")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Position must be a non-negative integer"),

    body("cover_image")
        .optional()
        .isObject()
        .withMessage("cover_image must be an object"),

    body("cover_image.key")
        .if(
            body("cover_image")
                .exists()
                .and(body("cover_image.remove").not().equals(true))
        )
        .notEmpty()
        .withMessage(
            "Image key is required when cover_image is provided without remove flag"
        ),

    body("cover_image.provider")
        .if(body("cover_image").exists().and(body("cover_image.key").exists()))
        .optional()
        .isString()
        .withMessage("Provider must be a string"),

    body("cover_image.alt_text")
        .if(body("cover_image").exists().and(body("cover_image.key").exists()))
        .optional()
        .isString()
        .withMessage("Alt text must be a string"),

    body("cover_image.remove")
        .if(body("cover_image").exists())
        .optional()
        .isBoolean()
        .withMessage("Remove flag must be a boolean"),

    body("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean value"),

    body("related_entries")
        .optional()
        .isArray()
        .withMessage("related_entries must be an array"),

    body("related_entries.*")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Each related entry ID must be a positive integer"),

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
    validateCreateEntry,
    validateUpdateEntry,
};
