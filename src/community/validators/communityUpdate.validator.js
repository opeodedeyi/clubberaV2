// src/community/validators/communityUpdate.validator.js

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

// Validator for updating basic community details
exports.validateBasicDetailsUpdate = [
    param("id").isInt().withMessage("Invalid community ID"),

    body("name")
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage("Community name must be between 3 and 50 characters"),

    body("tagline")
        .optional()
        .trim()
        .isLength({ max: 150 })
        .withMessage("Tagline must be 150 characters or less"),

    body("description").optional().trim(),

    body("guidelines").optional().trim(),

    body("is_private")
        .optional()
        .isBoolean()
        .withMessage("is_private must be a boolean value"),

    body("location")
        .optional()
        .isObject()
        .withMessage("Location must be an object"),

    body("location.city")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("City name must be between 1 and 100 characters"),

    body("location.lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("Latitude must be between -90 and 90"),

    body("location.lng")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("Longitude must be between -180 and 180"),

    body("location.address")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Address must be 255 characters or less"),

    validate,
];

// Validator for updating profile image
exports.validateProfileImageUpdate = [
    param("id").isInt().withMessage("Invalid community ID"),

    body("provider")
        .notEmpty()
        .withMessage("Image provider is required")
        .isString()
        .withMessage("Provider must be a string"),

    body("key")
        .notEmpty()
        .withMessage("Image key is required")
        .isString()
        .withMessage("Key must be a string"),

    body("alt_text")
        .optional()
        .isString()
        .withMessage("Alt text must be a string")
        .isLength({ max: 255 })
        .withMessage("Alt text must be 255 characters or less"),

    validate,
];

// Validator for updating cover image
exports.validateCoverImageUpdate = [
    param("id").isInt().withMessage("Invalid community ID"),

    body("provider")
        .notEmpty()
        .withMessage("Image provider is required")
        .isString()
        .withMessage("Provider must be a string"),

    body("key")
        .notEmpty()
        .withMessage("Image key is required")
        .isString()
        .withMessage("Key must be a string"),

    body("alt_text")
        .optional()
        .isString()
        .withMessage("Alt text must be a string")
        .isLength({ max: 255 })
        .withMessage("Alt text must be 255 characters or less"),

    validate,
];

// Validator for updating tags
exports.validateTagsUpdate = [
    param("id").isInt().withMessage("Invalid community ID"),

    body("tags").isArray().withMessage("Tags must be an array of tag names"),

    body("tags.*")
        .isString()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Each tag must be a string between 1 and 50 characters")
        .matches(/^[a-zA-Z0-9\s-]+$/)
        .withMessage(
            "Tags can only contain letters, numbers, spaces, and hyphens"
        ),

    validate,
];

module.exports = exports;
