// src/event/controllers/attendance.controller.js
const AttendanceModel = require("../models/attendance.model");
const ApiError = require("../../utils/ApiError");

class AttendanceController {
    async markAttendance(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;
            const { attended } = req.body;

            // Check if user can manage this event (only organizers can mark attendance)
            const EventModel = require("../models/event.model");
            const canManage = await EventModel.canManageEvent(
                parseInt(eventId),
                userId
            );

            if (!canManage) {
                throw new ApiError(
                    "You do not have permission to mark attendance for this event",
                    403
                );
            }

            // Mark attendance
            const result = await AttendanceModel.markAttendance(
                parseInt(eventId),
                parseInt(req.body.userId), // The user whose attendance is being marked
                attended
            );

            res.status(200).json({
                status: "success",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async setAttendanceStatus(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;
            const { status } = req.body;

            // Check if user can attend this event
            const validation = await AttendanceModel.canUserAttendEvent(
                parseInt(eventId),
                userId
            );

            if (!validation.canAttend) {
                throw new ApiError(validation.reason, 403);
            }

            // Set attendance status
            const result = await AttendanceModel.setAttendanceStatus(
                parseInt(eventId),
                userId,
                status
            );

            res.status(200).json({
                status: "success",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async getAttendanceStatus(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;

            const status = await AttendanceModel.getAttendanceStatus(
                parseInt(eventId),
                userId
            );

            res.status(200).json({
                status: "success",
                data: status,
            });
        } catch (error) {
            next(error);
        }
    }

    async getEventAttendees(req, res, next) {
        try {
            const { eventId } = req.params;
            const { page, limit, status } = req.query;

            const options = {
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
                status: status || null,
            };

            const result = await AttendanceModel.getEventAttendees(
                parseInt(eventId),
                options
            );

            res.status(200).json({
                status: "success",
                data: {
                    attendees: result.attendees,
                    pagination: result.pagination,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AttendanceController();
