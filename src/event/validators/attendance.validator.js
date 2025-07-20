// src/event/validators/attendance.validator.js
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

// Validate attendance status update
const validateSetAttendanceStatus = [
    param("eventId")
        .isInt({ min: 1 })
        .withMessage("Event ID must be a positive integer"),

    body("status")
        .isIn(["attending", "not_attending", "maybe"])
        .withMessage("Status must be one of: attending, not_attending, maybe"),

    checkValidationErrors,
];

// Validate attendance query parameters
const validateGetAttendeesList = [
    param("eventId")
        .isInt({ min: 1 })
        .withMessage("Event ID must be a positive integer"),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be a positive integer not exceeding 100"),

    query("status")
        .optional()
        .isIn(["attending", "not_attending", "maybe", "waitlisted"])
        .withMessage(
            "Status must be one of: attending, not_attending, maybe, waitlisted"
        ),

    checkValidationErrors,
];

// Validate marking attendance
const validateMarkAttendance = [
    param("eventId")
        .isInt({ min: 1 })
        .withMessage("Event ID must be a positive integer"),

    body("userId")
        .isInt({ min: 1 })
        .withMessage("User ID must be a positive integer"),

    body("attended")
        .isBoolean()
        .withMessage("Attended must be a boolean value"),

    checkValidationErrors,
];

module.exports = {
    validateSetAttendanceStatus,
    validateGetAttendeesList,
    validateMarkAttendance,
};
