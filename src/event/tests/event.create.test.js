// src/event/tests/event.create.test.js
const request = require("supertest");
const express = require("express");
const app = express();
const EventModel = require("../models/event.model");
const ImageModel = require("../models/image.model");
const { v4: uuidv4 } = require("uuid");

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

// Mock the EventModel
jest.mock("../models/event.model");

// Mock ImageModel
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

describe("Event Creation", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default successful mock implementation
        EventModel.createEvent.mockResolvedValue({
            id: 1,
            postId: 1,
            uniqueUrl: `test-event-${uuidv4().substring(0, 8)}`,
            title: "Test Event",
            description: "Test Description",
            eventType: "physical",
            startTime: new Date(Date.now() + 86400000).toISOString(),
        });

        // Mock EventModel.getEventById to be called after creation
        EventModel.getEventById = jest.fn().mockResolvedValue({
            id: 1,
            postId: 1,
            uniqueUrl: `test-event-${uuidv4().substring(0, 8)}`,
            title: "Test Event",
            description: "Test Description",
            eventType: "physical",
            startTime: new Date(Date.now() + 86400000).toISOString(),
        });

        // Mock image transfer
        ImageModel.transferTempImageToEvent = jest.fn().mockResolvedValue({
            id: 1,
            entityType: "event",
            entityId: 1,
            imageType: "cover",
            key: "test-image-key",
        });
    });

    it("should create an event successfully with minimum required fields", async () => {
        // Arrange
        const eventData = {
            title: "Test Event",
            startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(eventData);

        // Assert
        expect(response.status).toBe(201);
        expect(EventModel.createEvent).toHaveBeenCalledWith(
            {
                title: eventData.title,
                startTime: eventData.startTime,
                description: undefined,
                endTime: undefined,
                eventType: undefined,
                timezone: undefined,
                locationDetails: undefined,
                maxAttendees: undefined,
            },
            {
                communityId: 1,
                content: "",
                isSupportersOnly: false,
            },
            1,
            undefined
        );
    });

    it("should create an event with all optional fields", async () => {
        // Arrange
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        const dayAfter = new Date(tomorrow);
        dayAfter.setHours(12, 0, 0, 0);

        const eventData = {
            title: "Full Event Test",
            description: "This is a complete event with all fields",
            content: "Additional content for the post",
            eventType: "online",
            startTime: tomorrow.toISOString(),
            endTime: dayAfter.toISOString(),
            timezone: "America/New_York",
            locationDetails: "Meeting room details and access info",
            maxAttendees: 50,
            isSupportersOnly: true,
            location: {
                name: "Virtual Meeting Room",
                locationType: "online",
                address: "https://meeting.example.com/room",
            },
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(eventData);

        // Assert
        expect(response.status).toBe(201);
        expect(EventModel.createEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: eventData.title,
                description: eventData.description,
                eventType: eventData.eventType,
                maxAttendees: eventData.maxAttendees,
            }),
            expect.objectContaining({
                communityId: 1,
                content: eventData.content,
                isSupportersOnly: true,
            }),
            1,
            eventData.location
        );
    });

    it("should validate required fields", async () => {
        // Arrange
        const incompleteData = {
            description: "Test Description",
            eventType: "physical",
            // Missing required fields: title, startTime
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(incompleteData);

        // Assert
        expect(response.status).toBe(400);
        expect(EventModel.createEvent).not.toHaveBeenCalled();
    });

    it("should validate date fields", async () => {
        // Arrange
        const invalidDateData = {
            title: "Test Event",
            startTime: "not-a-date",
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(invalidDateData);

        // Assert
        expect(response.status).toBe(400);
        expect(EventModel.createEvent).not.toHaveBeenCalled();
    });

    it("should validate end time is after start time", async () => {
        // Arrange
        const now = new Date();
        const invalidTimeData = {
            title: "Test Event",
            startTime: new Date(now.getTime() + 3600000).toISOString(), // 1 hour from now
            endTime: now.toISOString(), // Now (before start time)
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(invalidTimeData);

        // Assert
        expect(response.status).toBe(400);
        expect(EventModel.createEvent).not.toHaveBeenCalled();
    });

    it("should validate that start time is not in the past", async () => {
        // Arrange
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // Yesterday

        const pastEventData = {
            title: "Past Event",
            startTime: pastDate.toISOString(),
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(pastEventData);

        // Assert
        expect(response.status).toBe(400);
        expect(EventModel.createEvent).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
        // Arrange
        EventModel.createEvent.mockRejectedValue(
            new Error("Database connection error")
        );

        const eventData = {
            title: "Test Event",
            startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(eventData);

        // Assert
        expect(response.status).toBe(500);
    });

    it("should validate maximum attendees is a positive number", async () => {
        // Arrange
        const invalidAttendeesData = {
            title: "Test Event",
            startTime: new Date(Date.now() + 86400000).toISOString(),
            maxAttendees: -10,
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(invalidAttendeesData);

        // Assert
        expect(response.status).toBe(400);
        expect(EventModel.createEvent).not.toHaveBeenCalled();
    });

    it("should validate timezone format", async () => {
        // Arrange
        const invalidTimezoneData = {
            title: "Test Event",
            startTime: new Date(Date.now() + 86400000).toISOString(),
            timezone: "Invalid/Timezone",
        };

        // Act
        const response = await request(app)
            .post("/api/events/communities/1/events")
            .send(invalidTimezoneData);

        // Assert
        expect(response.status).toBe(400);
        expect(EventModel.createEvent).not.toHaveBeenCalled();
    });
});
