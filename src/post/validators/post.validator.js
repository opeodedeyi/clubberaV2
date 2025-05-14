// src/post/validators/post.validator.js
const { body, param, query, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

const validateCreatePost = [
    body("communityId").isInt().withMessage("Community ID must be an integer"),

    body("content")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Content is required")
        .isLength({ max: 5000 })
        .withMessage("Content must be at most 5000 characters"),

    body("isSupportersOnly")
        .optional()
        .isBoolean()
        .withMessage("isSupportersOnly must be a boolean"),

    body("images").optional().isArray().withMessage("Images must be an array"),

    body("images.*.provider")
        .optional()
        .isString()
        .withMessage("Image provider must be a string"),

    body("images.*.key")
        .optional()
        .isString()
        .withMessage("Image key must be a string"),

    body("images.*.altText")
        .optional()
        .isString()
        .withMessage("Image alt text must be a string"),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ApiError(errors.array()[0].msg, 400));
        }
        next();
    },
];

const validateUpdatePost = [
    param("id").isInt().withMessage("Post ID must be an integer"),

    body("content")
        .optional()
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Content cannot be empty if provided")
        .isLength({ max: 5000 })
        .withMessage("Content must be at most 5000 characters"),

    body("isSupportersOnly")
        .optional()
        .isBoolean()
        .withMessage("isSupportersOnly must be a boolean"),

    body("isHidden")
        .optional()
        .isBoolean()
        .withMessage("isHidden must be a boolean"),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ApiError(errors.array()[0].msg, 400));
        }
        next();
    },
];

module.exports = {
    validateCreatePost,
    validateUpdatePost,
};
