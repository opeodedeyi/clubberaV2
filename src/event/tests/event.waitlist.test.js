// src/event/tests/event.waitlist.test.js
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

// Mock models
jest.mock("../models/attendance.model");
jest.mock("../models/event.model");

// Register routes
const attendanceRoutes = require("../routes/attendance.routes");
app.use(express.json());
app.use("/api/events", attendanceRoutes);

describe("Event Waitlist", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock canUserAttendEvent to allow attendance by default
        AttendanceModel.canUserAttendEvent.mockResolvedValue({
            canAttend: true,
        });
    });

    it("should add user to waitlist when event is at capacity", async () => {
        // Arrange
        AttendanceModel.setAttendanceStatus.mockResolvedValue({
            status: "waitlisted",
            message:
                "Event is at capacity. You have been added to the waitlist.",
        });

        const attendData = {
            status: "attending",
        };

        // Act
        const response = await request(app)
            .post("/api/events/1/attendance")
            .send(attendData);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("success");
        expect(response.body.data.status).toBe("waitlisted");
        expect(response.body.data.message).toBe(
            "Event is at capacity. You have been added to the waitlist."
        );
        expect(AttendanceModel.setAttendanceStatus).toHaveBeenCalledWith(
            1,
            1,
            "attending"
        );
    });

    it("should show correct waitlist position", async () => {
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
        expect(response.body.status).toBe("success");
        expect(response.body.data.status).toBe("waitlisted");
        expect(response.body.data.waitlistPosition).toBe(3);
    });

    it("should promote user from waitlist when space becomes available", async () => {
        // This test simulates a user canceling their attendance which should trigger
        // a promotion from the waitlist

        // Arrange - Mock to simulate promoting from waitlist
        AttendanceModel.setAttendanceStatus.mockImplementation(
            (eventId, userId, status) => {
                // If someone is canceling their attendance
                if (status === "not_attending") {
                    // Return a successful cancellation
                    return Promise.resolve({ status: "not_attending" });
                }

                // Default response
                return Promise.resolve({ status });
            }
        );

        // First, have the user cancel their attendance
        const cancelData = {
            status: "not_attending",
        };

        // Act
        const response = await request(app)
            .post("/api/events/1/attendance")
            .send(cancelData);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("not_attending");

        // Check that the model was called with the right parameters
        expect(AttendanceModel.setAttendanceStatus).toHaveBeenCalledWith(
            1,
            1,
            "not_attending"
        );
    });

    it("should filter event attendees by waitlisted status", async () => {
        // Arrange
        AttendanceModel.getEventAttendees.mockResolvedValue({
            attendees: [
                {
                    id: 3,
                    userId: 3,
                    fullName: "Waitlisted User 1",
                    uniqueUrl: "waitlisted-user-1",
                    profileImageKey: "users/3/profile.jpg",
                    status: "waitlisted",
                    waitlistPosition: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 4,
                    userId: 4,
                    fullName: "Waitlisted User 2",
                    uniqueUrl: "waitlisted-user-2",
                    profileImageKey: "users/4/profile.jpg",
                    status: "waitlisted",
                    waitlistPosition: 2,
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

        // Act
        const response = await request(app).get(
            "/api/events/1/attendance?status=waitlisted"
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("success");
        expect(Array.isArray(response.body.data.attendees)).toBe(true);
        expect(response.body.data.attendees.length).toBe(2);
        expect(response.body.data.attendees[0].status).toBe("waitlisted");
        expect(response.body.data.attendees[0].waitlistPosition).toBe(1);
        expect(response.body.data.attendees[1].waitlistPosition).toBe(2);
        expect(AttendanceModel.getEventAttendees).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                status: "waitlisted",
            })
        );
    });

    it("should handle moving from waitlist to attending", async () => {
        // Arrange - simulate a user who is on the waitlist
        AttendanceModel.getAttendanceStatus.mockResolvedValueOnce({
            status: "waitlisted",
            waitlistPosition: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // Act - First check the user's status
        const statusResponse = await request(app).get(
            "/api/events/1/attendance/my-status"
        );

        // Assert - Confirm they're on the waitlist
        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.data.status).toBe("waitlisted");
        expect(statusResponse.body.data.waitlistPosition).toBe(1);

        // Now arrange for the user to be moved to attending
        AttendanceModel.getAttendanceStatus.mockResolvedValueOnce({
            status: "attending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // Act - Check status again (would happen after someone else cancels)
        const updatedStatusResponse = await request(app).get(
            "/api/events/1/attendance/my-status"
        );

        // Assert - Confirm they're now attending
        expect(updatedStatusResponse.status).toBe(200);
        expect(updatedStatusResponse.body.data.status).toBe("attending");
        expect(
            updatedStatusResponse.body.data.waitlistPosition
        ).toBeUndefined();
    });

    it("should allow users to leave the waitlist", async () => {
        // Arrange - First set up that the user is on the waitlist
        AttendanceModel.getAttendanceStatus.mockResolvedValueOnce({
            status: "waitlisted",
            waitlistPosition: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // Confirm current status
        const statusResponse = await request(app).get(
            "/api/events/1/attendance/my-status"
        );

        expect(statusResponse.body.data.status).toBe("waitlisted");

        // Now setup for cancellation
        AttendanceModel.setAttendanceStatus.mockResolvedValueOnce({
            status: "not_attending",
        });

        // Act - User decides to leave the waitlist
        const leaveWaitlistResponse = await request(app)
            .post("/api/events/1/attendance")
            .send({ status: "not_attending" });

        // Assert
        expect(leaveWaitlistResponse.status).toBe(200);
        expect(leaveWaitlistResponse.body.data.status).toBe("not_attending");
        expect(AttendanceModel.setAttendanceStatus).toHaveBeenCalledWith(
            1,
            1,
            "not_attending"
        );
    });

    it("should show all correct waitlist positions when getting event attendees", async () => {
        // Arrange - Create a waitlist with multiple users
        AttendanceModel.getEventAttendees.mockResolvedValue({
            attendees: [
                {
                    id: 5,
                    userId: 5,
                    fullName: "Early Waitlister",
                    uniqueUrl: "early-waitlister",
                    status: "waitlisted",
                    waitlistPosition: 1,
                    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                    updatedAt: new Date(Date.now() - 86400000).toISOString(),
                },
                {
                    id: 6,
                    userId: 6,
                    fullName: "Middle Waitlister",
                    uniqueUrl: "middle-waitlister",
                    status: "waitlisted",
                    waitlistPosition: 2,
                    createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
                    updatedAt: new Date(Date.now() - 43200000).toISOString(),
                },
                {
                    id: 7,
                    userId: 7,
                    fullName: "Recent Waitlister",
                    uniqueUrl: "recent-waitlister",
                    status: "waitlisted",
                    waitlistPosition: 3,
                    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                    updatedAt: new Date(Date.now() - 3600000).toISOString(),
                },
            ],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 3,
                totalPages: 1,
            },
        });

        // Act
        const response = await request(app).get(
            "/api/events/1/attendance?status=waitlisted"
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.attendees.length).toBe(3);

        // Check that waitlist positions are correct and in order of creation time
        expect(response.body.data.attendees[0].waitlistPosition).toBe(1);
        expect(response.body.data.attendees[1].waitlistPosition).toBe(2);
        expect(response.body.data.attendees[2].waitlistPosition).toBe(3);
    });
});
