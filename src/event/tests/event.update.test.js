// src/event/tests/event.update.test.js
const request = require("supertest");
const express = require("express");
const app = express();
const EventModel = require("../models/event.model");
const ImageModel = require("../models/image.model");

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
jest.mock("../models/event.model");
jest.mock("../models/image.model");

// Mock ApiError
jest.mock("../../utils/ApiError", () => {
    return class ApiError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    };
});

// Register routes
const eventRoutes = require("../routes/event.routes");
app.use(express.json());
app.use("/api/events", eventRoutes);

describe("Event Update", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock the permission check
        EventModel.canManageEvent.mockResolvedValue(true);

        // Mock event retrieval - called during update
        EventModel.getEventById.mockResolvedValue({
            id: 1,
            postId: 1,
            uniqueUrl: "test-event-123",
            title: "Original Title",
            description: "Original Description",
            eventType: "physical",
            startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endTime: new Date(Date.now() + 90000000).toISOString(),
            timezone: "UTC",
            locationDetails: "Original details",
            maxAttendees: 50,
            currentAttendees: 0,
            post: {
                id: 1,
                communityId: 1,
                userId: 1,
                content: "Original content",
                isSupportersOnly: false,
            },
        });

        // Mock event update
        EventModel.updateEvent.mockResolvedValue({
            id: 1,
            title: "Updated Title",
            description: "Updated Description",
            // other fields remain the same as in getEventById
        });

        // Mock image transfer
        ImageModel.transferTempImageToEvent.mockResolvedValue({
            id: 1,
            entityType: "event",
            entityId: 1,
            imageType: "cover",
            provider: "s3",
            key: "updated-image-key",
            altText: "",
        });
    });

    it("should update an event with new title and description", async () => {
        // Arrange
        const updateData = {
            title: "Updated Title",
            description: "Updated Description",
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(updateData);

        // Assert
        expect(response.status).toBe(200);
        expect(EventModel.updateEvent).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                title: updateData.title,
                description: updateData.description,
            }),
            null,
            undefined
        );
    });

    it("should update event date and time fields", async () => {
        // Arrange
        const newStart = new Date();
        newStart.setDate(newStart.getDate() + 5); // 5 days from now

        const newEnd = new Date(newStart);
        newEnd.setHours(newEnd.getHours() + 3); // 3 hours after start

        const updateData = {
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString(),
            timezone: "Europe/London",
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(updateData);

        // Assert
        expect(response.status).toBe(200);
        expect(EventModel.updateEvent).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                startTime: updateData.startTime,
                endTime: updateData.endTime,
                timezone: updateData.timezone,
            }),
            null,
            undefined
        );
    });

    it("should update post content and supporters-only flag", async () => {
        // Arrange
        const updateData = {
            content: "Updated content for the post",
            isSupportersOnly: true,
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(updateData);

        // Assert
        expect(response.status).toBe(200);
        expect(EventModel.updateEvent).toHaveBeenCalledWith(
            1,
            expect.any(Object),
            expect.objectContaining({
                content: updateData.content,
                isSupportersOnly: updateData.isSupportersOnly,
            }),
            undefined
        );
    });

    it("should update location information", async () => {
        // Arrange
        const updateData = {
            location: {
                name: "New Venue",
                locationType: "physical",
                lat: 40.7128,
                lng: -74.006,
                address: "123 New Street, New York, NY",
            },
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(updateData);

        // Assert
        expect(response.status).toBe(200);
        expect(EventModel.updateEvent).toHaveBeenCalledWith(
            1,
            expect.any(Object),
            null,
            updateData.location
        );
    });

    it("should update cover image", async () => {
        // Arrange
        const updateData = {
            coverImageKey: "temp-images/new-cover-123456.jpg",
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(updateData);

        // Assert
        expect(response.status).toBe(200);
        expect(ImageModel.transferTempImageToEvent).toHaveBeenCalledWith(
            1,
            updateData.coverImageKey,
            "cover"
        );
    });

    it("should reject update if user cannot manage the event", async () => {
        // Arrange
        EventModel.canManageEvent.mockResolvedValue(false);

        const updateData = {
            title: "Unauthorized Update",
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(updateData);

        // Assert
        expect(response.status).toBe(403);
        expect(EventModel.updateEvent).not.toHaveBeenCalled();
    });

    it("should validate end time is after start time when both are provided", async () => {
        // Arrange
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        const invalidUpdate = {
            startTime: tomorrow.toISOString(),
            endTime: now.toISOString(), // Before start time
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(invalidUpdate);

        // Assert
        expect(response.status).toBe(400);
        expect(EventModel.updateEvent).not.toHaveBeenCalled();
    });

    it("should validate start time is not in the past", async () => {
        // Arrange
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const invalidUpdate = {
            startTime: yesterday.toISOString(),
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(invalidUpdate);

        // Assert
        expect(response.status).toBe(400);
        expect(EventModel.updateEvent).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
        // Arrange
        EventModel.updateEvent.mockRejectedValue(new Error("Database error"));

        const updateData = {
            title: "Error Inducing Title",
        };

        // Act
        const response = await request(app)
            .put("/api/events/1")
            .send(updateData);

        // Assert
        expect(response.status).toBe(500);
    });

    it("should handle non-existent event", async () => {
        // Arrange
        EventModel.canManageEvent.mockImplementation(() => {
            throw new Error("Event not found");
        });

        const updateData = {
            title: "Update Non-existent Event",
        };

        // Act
        const response = await request(app)
            .put("/api/events/999")
            .send(updateData);

        // Assert
        expect(response.status).toBe(500);
        expect(EventModel.updateEvent).not.toHaveBeenCalled();
    });
});
