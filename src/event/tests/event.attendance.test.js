// src/event/tests/event.attendance.test.js
const request = require("supertest");
const express = require("express");
const app = express();
const AttendanceModel = require("../models/attendance.model");
const EventModel = require("../models/event.model");

// Mock middleware
jest.mock("../../middleware/auth", () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, email: "test@example.com", isEmailConfirmed: true };
        next();
    },
}));

jest.mock("../../middleware/verifyEmail", () => ({
    verifyEmail: (req, res, next) => next(),
}));

jest.mock("../../middleware/optionalAuth", () => {
    // Create a mock function that allows us to set a user
    const mockMiddleware = jest.fn((req, res, next) => {
        // By default, set the user
        req.user = { id: 1, email: "test@example.com" };
        next();
    });

    // Return the middleware
    return mockMiddleware;
});

// Mock ApiError
jest.mock("../../utils/ApiError", () => {
    return class ApiError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    };
});

// Mock models
jest.mock("../models/attendance.model");
jest.mock("../models/event.model");

// Register routes
const attendanceRoutes = require("../routes/attendance.routes");
app.use(express.json());
app.use("/api/events", attendanceRoutes);

describe("Event Attendance", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock canUserAttendEvent to allow attendance by default
        AttendanceModel.canUserAttendEvent.mockResolvedValue({
            canAttend: true,
        });

        // Mock setAttendanceStatus
        AttendanceModel.setAttendanceStatus.mockResolvedValue({
            status: "attending",
        });

        // Mock getAttendanceStatus
        AttendanceModel.getAttendanceStatus.mockResolvedValue({
            status: "attending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // Mock getEventAttendees
        AttendanceModel.getEventAttendees.mockResolvedValue({
            attendees: [
                {
                    id: 1,
                    userId: 1,
                    fullName: "Test User 1",
                    uniqueUrl: "test-user-1",
                    profileImageKey: "users/1/profile.jpg",
                    status: "attending",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 2,
                    userId: 2,
                    fullName: "Test User 2",
                    uniqueUrl: "test-user-2",
                    profileImageKey: "users/2/profile.jpg",
                    status: "maybe",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 2,
                totalPages: 1,
            },
        });

        // Mock canManageEvent for marking attendance
        EventModel.canManageEvent.mockResolvedValue(true);

        // Mock markAttendance
        AttendanceModel.markAttendance.mockResolvedValue({
            status: "attending",
            attended: true,
        });
    });

    describe("Set Attendance Status", () => {
        it("should set status to attending", async () => {
            // Arrange
            const attendData = {
                status: "attending",
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance")
                .send(attendData);

            // Assert
            expect(response.status).toBe(200);
            expect(AttendanceModel.canUserAttendEvent).toHaveBeenCalledWith(
                1,
                1
            );
            expect(AttendanceModel.setAttendanceStatus).toHaveBeenCalledWith(
                1,
                1,
                "attending"
            );
        });

        it("should set status to not attending", async () => {
            // Arrange
            const attendData = {
                status: "not_attending",
            };

            AttendanceModel.setAttendanceStatus.mockResolvedValue({
                status: "not_attending",
            });

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance")
                .send(attendData);

            // Assert
            expect(response.status).toBe(200);
            expect(AttendanceModel.setAttendanceStatus).toHaveBeenCalledWith(
                1,
                1,
                "not_attending"
            );
        });

        it("should set status to maybe", async () => {
            // Arrange
            const attendData = {
                status: "maybe",
            };

            AttendanceModel.setAttendanceStatus.mockResolvedValue({
                status: "maybe",
            });

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance")
                .send(attendData);

            // Assert
            expect(response.status).toBe(200);
            expect(AttendanceModel.setAttendanceStatus).toHaveBeenCalledWith(
                1,
                1,
                "maybe"
            );
        });

        it("should handle waitlist when event is at capacity", async () => {
            // Arrange
            const attendData = {
                status: "attending",
            };

            AttendanceModel.setAttendanceStatus.mockResolvedValue({
                status: "waitlisted",
                message:
                    "Event is at capacity. You have been added to the waitlist.",
            });

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance")
                .send(attendData);

            // Assert
            expect(response.status).toBe(200);
        });

        it("should prevent attendance if user is banned", async () => {
            // Arrange
            AttendanceModel.canUserAttendEvent.mockResolvedValue({
                canAttend: false,
                reason: "You are currently banned from this community",
            });

            const attendData = {
                status: "attending",
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance")
                .send(attendData);

            // Assert
            expect(response.status).toBe(403);
            expect(AttendanceModel.setAttendanceStatus).not.toHaveBeenCalled();
        });

        it("should prevent attendance for supporters-only events", async () => {
            // Arrange
            AttendanceModel.canUserAttendEvent.mockResolvedValue({
                canAttend: false,
                reason: "This event is for community supporters only",
            });

            const attendData = {
                status: "attending",
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance")
                .send(attendData);

            // Assert
            expect(response.status).toBe(403);
            expect(AttendanceModel.setAttendanceStatus).not.toHaveBeenCalled();
        });

        it("should validate attendance status", async () => {
            // Arrange
            const invalidData = {
                status: "invalid_status",
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance")
                .send(invalidData);

            // Assert
            expect(response.status).toBe(400);
            expect(AttendanceModel.setAttendanceStatus).not.toHaveBeenCalled();
        });
    });

    describe("Get Attendance Status", () => {
        it("should get user's attendance status", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/1/attendance/my-status"
            );

            // Assert
            expect(response.status).toBe(200);
            expect(AttendanceModel.getAttendanceStatus).toHaveBeenCalledWith(
                1,
                1
            );
        });

        it("should return null status if user has not RSVP'd", async () => {
            // Arrange
            AttendanceModel.getAttendanceStatus.mockResolvedValue({
                status: null,
            });

            // Act
            const response = await request(app).get(
                "/api/events/1/attendance/my-status"
            );

            // Assert
            expect(response.status).toBe(200);
        });

        it("should include waitlist position for waitlisted users", async () => {
            // Arrange
            AttendanceModel.getAttendanceStatus.mockResolvedValue({
                status: "waitlisted",
                waitlistPosition: 3,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Act
            const response = await request(app).get(
                "/api/events/1/attendance/my-status"
            );

            // Assert
            expect(response.status).toBe(200);
        });
    });

    describe("Get Event Attendees", () => {
        it("should retrieve a list of attendees", async () => {
            // Act
            const response = await request(app).get("/api/events/1/attendance");

            // Assert
            expect(response.status).toBe(200);
            expect(AttendanceModel.getEventAttendees).toHaveBeenCalledWith(
                1,
                expect.any(Object)
            );
        });

        it("should filter by status", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/1/attendance?status=attending"
            );

            // Assert
            expect(response.status).toBe(200);
            expect(AttendanceModel.getEventAttendees).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    status: "attending",
                })
            );
        });

        it("should handle pagination", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/1/attendance?page=2&limit=5"
            );

            // Assert
            expect(response.status).toBe(200);
            expect(AttendanceModel.getEventAttendees).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    page: 2,
                    limit: 5,
                })
            );
        });

        it("should validate status parameter", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/1/attendance?status=invalid"
            );

            // Assert
            expect(response.status).toBe(400);
            expect(AttendanceModel.getEventAttendees).not.toHaveBeenCalled();
        });
    });

    describe("Mark Attendance", () => {
        it("should mark a user as having attended", async () => {
            // Arrange
            const markData = {
                userId: 2,
                attended: true,
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance/mark")
                .send(markData);

            // Assert
            expect(response.status).toBe(200);
            expect(EventModel.canManageEvent).toHaveBeenCalledWith(1, 1);
            expect(AttendanceModel.markAttendance).toHaveBeenCalledWith(
                1,
                2,
                true
            );
        });

        it("should mark a user as not having attended", async () => {
            // Arrange
            const markData = {
                userId: 2,
                attended: false,
            };

            AttendanceModel.markAttendance.mockResolvedValue({
                status: "attending",
                attended: false,
            });

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance/mark")
                .send(markData);

            // Assert
            expect(response.status).toBe(200);
            expect(AttendanceModel.markAttendance).toHaveBeenCalledWith(
                1,
                2,
                false
            );
        });

        it("should require organizer permissions", async () => {
            // Arrange
            EventModel.canManageEvent.mockResolvedValue(false);

            const markData = {
                userId: 2,
                attended: true,
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance/mark")
                .send(markData);

            // Assert
            expect(response.status).toBe(403);
            expect(AttendanceModel.markAttendance).not.toHaveBeenCalled();
        });

        it("should validate user ID parameter", async () => {
            // Arrange
            const invalidData = {
                userId: "not-a-number",
                attended: true,
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance/mark")
                .send(invalidData);

            // Assert
            expect(response.status).toBe(400);
            expect(AttendanceModel.markAttendance).not.toHaveBeenCalled();
        });

        it("should validate attended parameter", async () => {
            // Arrange
            const invalidData = {
                userId: 2,
                attended: "not-a-boolean",
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance/mark")
                .send(invalidData);

            // Assert
            expect(response.status).toBe(400);
            expect(AttendanceModel.markAttendance).not.toHaveBeenCalled();
        });

        it("should handle case where user has not RSVP'd", async () => {
            // Arrange
            const error = new Error("User has not RSVP'd for this event");
            error.statusCode = 404;
            AttendanceModel.markAttendance.mockRejectedValue(error);

            const markData = {
                userId: 3,
                attended: true,
            };

            // Act
            const response = await request(app)
                .post("/api/events/1/attendance/mark")
                .send(markData);

            // Assert
            expect(response.status).toBe(404);
        });
    });
});
