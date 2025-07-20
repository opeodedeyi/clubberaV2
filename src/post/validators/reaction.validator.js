// src/post/validators/reaction.validator.js
const { body, param, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

const validateAddReaction = [
    param("postId").isInt().withMessage("Post ID must be an integer"),

    body("reactionType")
        .optional()
        .isString()
        .isIn(["like"])
        .withMessage('Reaction type must be "like"'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ApiError(errors.array()[0].msg, 400));
        }
        next();
    },
];

const validateRemoveReaction = [
    param("postId").isInt().withMessage("Post ID must be an integer"),

    body("reactionType")
        .optional()
        .isString()
        .isIn(["like"])
        .withMessage('Reaction type must be "like"'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ApiError(errors.array()[0].msg, 400));
        }
        next();
    },
];

module.exports = {
    validateAddReaction,
    validateRemoveReaction,
};
