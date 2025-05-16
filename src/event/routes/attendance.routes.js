// src/event/routes/attendance.routes.js
const express = require("express");
const router = express.Router();
const AttendanceController = require("../controllers/attendance.controller");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");
const optionalAuth = require("../../middleware/optionalAuth");
const {
    validateSetAttendanceStatus,
    validateGetAttendeesList,
    validateMarkAttendance,
} = require("../validators/attendance.validator");

// Set attendance status for an event
router.post(
    "/:eventId/attendance",
    authenticate,
    verifyEmail,
    validateSetAttendanceStatus,
    AttendanceController.setAttendanceStatus
);

// Get user's attendance status for an event
router.get(
    "/:eventId/attendance/my-status",
    authenticate,
    AttendanceController.getAttendanceStatus
);

// Get list of attendees for an event
// Uses optional auth to potentially show more detailed info for logged-in users
router.get(
    "/:eventId/attendance",
    optionalAuth,
    validateGetAttendeesList,
    AttendanceController.getEventAttendees
);

// Mark user's actual attendance for an event (for organizers)
router.post(
    "/:eventId/attendance/mark",
    authenticate,
    verifyEmail,
    validateMarkAttendance,
    AttendanceController.markAttendance
);

module.exports = router;
