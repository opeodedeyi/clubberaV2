// src/community/validators/community.validator.js

const { body, param, query, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

// Helper function to validate request
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(errors.array()[0].msg, 400);
    }
    next();
};

// Validators for community endpoints
exports.createCommunity = [
    body("name")
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
    body("tags")
        .optional()
        .isArray()
        .withMessage("Tags must be an array of tag names"),
    body("tags.*")
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Each tag must be a string between 1 and 50 characters"),
    body("profile_image")
        .optional()
        .isObject()
        .withMessage("Profile image must be an object"),
    body("cover_image")
        .optional()
        .isObject()
        .withMessage("Cover image must be an object"),
    validate,
];

exports.joinCommunity = [
    param("id").isInt().withMessage("Invalid community ID"),
    body("message")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Join request message must be 500 characters or less"),
    validate,
];

exports.leaveCommunity = [
    param("id").isInt().withMessage("Invalid community ID"),
    validate,
];

exports.getJoinRequests = [
    param("id").isInt().withMessage("Invalid community ID"),
    validate,
];

exports.respondToJoinRequest = [
    param("id").isInt().withMessage("Invalid community ID"),
    param("requestId").isInt().withMessage("Invalid request ID"),
    body("status")
        .isIn(["approved", "rejected"])
        .withMessage("Status must be approved or rejected"),
    validate,
];

exports.validateGetMembers = [
    param("id").isInt().withMessage("Invalid community ID"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and a100"),
    query("offset")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Offset must be a positive number"),
    query("role")
        .optional()
        .isIn(["owner", "organizer", "moderator", "member"])
        .withMessage("Invalid role filter"),
    validate,
];

exports.checkPermissions = [
    param("id").isInt().withMessage("Invalid community ID"),
    validate,
];
