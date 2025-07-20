// src/post/validators/poll.validator.js
const { body, param, validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

const validateCreatePoll = [
    body("communityId").isInt().withMessage("Community ID must be an integer"),

    body("content")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 5000 })
        .withMessage("Content must be at most 5000 characters"),

    body("isSupportersOnly")
        .optional()
        .isBoolean()
        .withMessage("isSupportersOnly must be a boolean"),

    body("pollData").isObject().withMessage("Poll data is required"),

    body("pollData.question")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Poll question must be at most 500 characters"),

    body("pollData.options")
        .isArray({ min: 2 })
        .withMessage("Poll must have at least 2 options"),

    body("pollData.options.*.text")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Option text is required")
        .isLength({ max: 200 })
        .withMessage("Option text must be at most 200 characters"),

    body("pollData.settings.allowMultipleVotes")
        .optional()
        .isBoolean()
        .withMessage("allowMultipleVotes must be a boolean"),

    body("pollData.settings.endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid ISO date"),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ApiError(errors.array()[0].msg, 400));
        }
        next();
    },
];

const validateVotePoll = [
    param("pollId").isInt().withMessage("Poll ID must be an integer"),

    body("optionIndices")
        .custom((value) => {
            if (Array.isArray(value)) {
                return value.every(
                    (index) => Number.isInteger(index) && index >= 0
                );
            } else {
                return Number.isInteger(value) && value >= 0;
            }
        })
        .withMessage("Option indices must be non-negative integers"),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ApiError(errors.array()[0].msg, 400));
        }
        next();
    },
];

module.exports = {
    validateCreatePoll,
    validateVotePoll,
};
