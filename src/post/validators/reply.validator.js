// src/post/validators/reply.validator.js
const { body, param, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

const validateCreateReply = [
    param("postId").isInt().withMessage("Post ID must be an integer"),

    body("content")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Content is required")
        .isLength({ max: 2000 })
        .withMessage("Content must be at most 2000 characters"),

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

const validateUpdateReply = [
    param("replyId").isInt().withMessage("Reply ID must be an integer"),

    body("content")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Content is required")
        .isLength({ max: 2000 })
        .withMessage("Content must be at most 2000 characters"),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ApiError(errors.array()[0].msg, 400));
        }
        next();
    },
];

module.exports = {
    validateCreateReply,
    validateUpdateReply,
};
