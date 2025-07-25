// src/event/validators/event.validator.js
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

// Validate event ID parameter
const validateEventId = [
    param("eventId")
        .isInt({ min: 1 })
        .withMessage("Event ID must be a positive integer"),
    checkValidationErrors,
];

// Validate event creation
const validateCreateEvent = [
    body("title")
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("Title must be between 3 and 255 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 10000 })
        .withMessage("Description cannot exceed 10000 characters"),

    body("content")
        .optional()
        .trim()
        .isLength({ max: 10000 })
        .withMessage("Content cannot exceed 10000 characters"),

    body("eventType")
        .optional()
        .isIn(["physical", "online"])
        .withMessage('Event type must be either "physical" or "online"'),

    body("startTime")
        .isISO8601()
        .withMessage("Start time must be a valid ISO 8601 date string"),

    body("endTime")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("End time must be a valid ISO 8601 date string")
        .custom((value, { req }) => {
            if (value && new Date(value) <= new Date(req.body.startTime)) {
                throw new Error("End time must be after start time");
            }
            return true;
        }),

    body("timezone")
        .optional()
        .isString()
        .withMessage("Timezone must be a valid string")
        .custom((value) => {
            // Simple check to validate timezone format
            try {
                Intl.DateTimeFormat(undefined, { timeZone: value });
                return true;
            } catch (error) {
                throw new Error("Invalid timezone");
            }
        }),

    body("locationDetails")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Location details cannot exceed 1000 characters"),

    body("maxAttendees")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("Maximum attendees must be a positive integer"),

    body("isSupportersOnly")
        .optional()
        .isBoolean()
        .withMessage("isSupportersOnly must be a boolean value"),

    body("location")
        .optional()
        .isObject()
        .withMessage("Location must be an object"),

    body("location.name")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Location name cannot exceed 255 characters"),

    body("location.locationType")
        .optional()
        .isString()
        .withMessage("Location type must be a string"),

    body("location.lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("Latitude must be a valid coordinate between -90 and 90"),

    body("location.lng")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage(
            "Longitude must be a valid coordinate between -180 and 180"
        ),

    body("location.address")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Address cannot exceed 500 characters"),

    body("coverImageKey")
        .optional()
        .isString()
        .withMessage("Cover image key must be a string"),

    // Validate the past date only if it's more than 5 minutes in the past
    body("startTime").custom((value) => {
        const startTime = new Date(value);
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        if (startTime < fiveMinutesAgo) {
            throw new Error("Event start time cannot be in the past");
        }
        return true;
    }),

    checkValidationErrors,
];

// Validate event update
const validateUpdateEvent = [
    param("eventId")
        .isInt({ min: 1 })
        .withMessage("Event ID must be a positive integer"),

    body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("Title must be between 3 and 255 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 10000 })
        .withMessage("Description cannot exceed 10000 characters"),

    body("content")
        .optional()
        .trim()
        .isLength({ max: 10000 })
        .withMessage("Content cannot exceed 10000 characters"),

    body("eventType")
        .optional()
        .isIn(["physical", "online"])
        .withMessage('Event type must be either "physical" or "online"'),

    body("startTime")
        .optional()
        .isISO8601()
        .withMessage("Start time must be a valid ISO 8601 date string"),

    body("endTime")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("End time must be a valid ISO 8601 date string")
        .custom((value, { req }) => {
            if (
                value &&
                req.body.startTime &&
                new Date(value) <= new Date(req.body.startTime)
            ) {
                throw new Error("End time must be after start time");
            }
            return true;
        }),

    body("timezone")
        .optional()
        .isString()
        .withMessage("Timezone must be a valid string")
        .custom((value) => {
            // Simple check to validate timezone format
            try {
                Intl.DateTimeFormat(undefined, { timeZone: value });
                return true;
            } catch (error) {
                throw new Error("Invalid timezone");
            }
        }),

    body("locationDetails")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Location details cannot exceed 1000 characters"),

    body("maxAttendees")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("Maximum attendees must be a positive integer"),

    body("isSupportersOnly")
        .optional()
        .isBoolean()
        .withMessage("isSupportersOnly must be a boolean value"),

    body("location")
        .optional()
        .isObject()
        .withMessage("Location must be an object"),

    body("location.name")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Location name cannot exceed 255 characters"),

    body("location.locationType")
        .optional()
        .isString()
        .withMessage("Location type must be a string"),

    body("location.lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("Latitude must be a valid coordinate between -90 and 90"),

    body("location.lng")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage(
            "Longitude must be a valid coordinate between -180 and 180"
        ),

    body("location.address")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Address cannot exceed 500 characters"),

    body("coverImageKey")
        .optional()
        .isString()
        .withMessage("Cover image key must be a string"),

    // Only validate future date if startTime is being updated
    body("startTime")
        .optional()
        .custom((value) => {
            const startTime = new Date(value);
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            if (startTime < fiveMinutesAgo) {
                throw new Error("Event start time cannot be in the past");
            }
            return true;
        }),

    checkValidationErrors,
];

// Validate community events query
const validateCommunityEventsQuery = [
    param("communityId")
        .isInt({ min: 1 })
        .withMessage("Community ID must be a positive integer"),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be a positive integer not exceeding 100"),

    query("upcoming")
        .optional()
        .customSanitizer((value) => {
            if (value === "true" || value === true) return true;
            if (value === "false" || value === false) return false;
            return undefined;
        }),

    query("pastEvents")
        .optional()
        .customSanitizer((value) => {
            if (value === "true" || value === true) return true;
            if (value === "false" || value === false) return false;
            return undefined;
        }),

    query("isSupportersOnly")
        .optional()
        .customSanitizer((value) => {
            if (value === "true" || value === true) return true;
            if (value === "false" || value === false) return false;
            return null;
        }),

    query("startDate")
        .optional()
        .isISO8601()
        .withMessage("StartDate must be a valid ISO 8601 date string"),

    query("endDate")
        .optional()
        .isISO8601()
        .withMessage("EndDate must be a valid ISO 8601 date string"),

    query("timezone")
        .optional()
        .isString()
        .withMessage("Timezone must be a valid string")
        .custom((value) => {
            try {
                Intl.DateTimeFormat(undefined, { timeZone: value });
                return true;
            } catch (error) {
                throw new Error("Invalid timezone");
            }
        }),

    checkValidationErrors,
];

module.exports = {
    validateEventId,
    validateCreateEvent,
    validateUpdateEvent,
    validateCommunityEventsQuery,
};
