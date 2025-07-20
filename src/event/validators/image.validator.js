// src/event/validators/image.validator.js
const { body, param, query, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

// Common middleware to check for validation errors
const checkValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ApiError(errors.array()[0].msg, 400));
    }
    next();
};

// Validate save event image
const validateSaveEventImage = [
    param("eventId")
        .isInt({ min: 1 })
        .withMessage("Event ID must be a positive integer"),

    body("key")
        .notEmpty()
        .withMessage("Image key is required")
        .isString()
        .withMessage("Image key must be a string"),

    body("imageType")
        .optional()
        .isString()
        .withMessage("Image type must be a string")
        .isIn(["cover", "gallery"])
        .withMessage('Image type must be either "cover" or "gallery"'),

    body("altText")
        .optional()
        .isString()
        .withMessage("Alt text must be a string")
        .isLength({ max: 255 })
        .withMessage("Alt text cannot exceed 255 characters"),

    checkValidationErrors,
];

// Validate transfer temp image
const validateTransferTempImage = [
    param("eventId")
        .isInt({ min: 1 })
        .withMessage("Event ID must be a positive integer"),

    body("tempKey")
        .notEmpty()
        .withMessage("Temporary image key is required")
        .isString()
        .withMessage("Temporary image key must be a string"),

    body("imageType")
        .optional()
        .isString()
        .withMessage("Image type must be a string")
        .isIn(["cover", "gallery"])
        .withMessage('Image type must be either "cover" or "gallery"'),

    body("altText")
        .optional()
        .isString()
        .withMessage("Alt text must be a string")
        .isLength({ max: 255 })
        .withMessage("Alt text cannot exceed 255 characters"),

    checkValidationErrors,
];

// Validate delete event image
const validateDeleteEventImage = [
    param("eventId")
        .isInt({ min: 1 })
        .withMessage("Event ID must be a positive integer"),

    query("imageType")
        .optional()
        .isString()
        .withMessage("Image type must be a string")
        .isIn(["cover", "gallery"])
        .withMessage('Image type must be either "cover" or "gallery"'),

    checkValidationErrors,
];

module.exports = {
    validateSaveEventImage,
    validateTransferTempImage,
    validateDeleteEventImage,
};
