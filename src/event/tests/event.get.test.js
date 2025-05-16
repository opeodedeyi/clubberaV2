// src/event/tests/event.get.test.js
const request = require("supertest");
const express = require("express");
const app = express();
const EventModel = require("../models/event.model");
const EventSearchModel = require("../models/eventSearch.model");

// Mock middleware to properly set user in request
jest.mock("../../middleware/optionalAuth", () => {
    return (req, res, next) => {
        // Set a user for all requests - we'll use this for the tests
        req.user = { id: 1, email: "test@example.com" };
        next();
    };
});

// Mock models
jest.mock("../models/event.model");
jest.mock("../models/eventSearch.model");

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
const eventSearchRoutes = require("../routes/eventSearch.routes");
app.use(express.json());
app.use("/api/events", eventRoutes);
app.use("/api/events", eventSearchRoutes);

describe("Event Retrieval", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock getEventById
        EventModel.getEventById.mockResolvedValue({
            id: 1,
            postId: 1,
            uniqueUrl: "test-event-123",
            title: "Test Event",
            description: "Test Description",
            eventType: "physical",
            startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endTime: new Date(Date.now() + 90000000).toISOString(),
            timezone: "UTC",
            locationDetails: "Test location details",
            maxAttendees: 50,
            currentAttendees: 10,
            attendeeCount: 10,
            waitlistCount: 5,
            coverImage: {
                id: 1,
                entityType: "event",
                entityId: 1,
                imageType: "cover",
                provider: "s3",
                key: "events/1/cover.jpg",
                altText: "Event cover image",
            },
            post: {
                id: 1,
                communityId: 1,
                userId: 1,
                content: "Event post content",
                isSupportersOnly: false,
            },
            location: {
                id: 1,
                name: "Test Venue",
                locationType: "physical",
                lat: 40.7128,
                lng: -74.006,
                address: "123 Test Street, New York, NY",
            },
        });

        // Mock getEventByUniqueUrl to include the userId parameter in the return value
        // so we can check it was passed correctly
        EventSearchModel.getEventByUniqueUrl.mockImplementation(
            (uniqueUrl, userId) => {
                return Promise.resolve({
                    id: 1,
                    uniqueUrl: "test-event-123",
                    title: "Test Event",
                    description: "Test Description",
                    eventType: "physical",
                    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                    endTime: new Date(Date.now() + 90000000).toISOString(),
                    timezone: "UTC",
                    locationDetails: "Test location details",
                    formattedDate: "January 1, 2025",
                    formattedTime: "10:00 AM",
                    communityName: "Test Community",
                    maxAttendees: 50,
                    currentAttendees: 10,
                    attendeeCount: 10,
                    coverImage: {
                        id: 1,
                        entityType: "event",
                        entityId: 1,
                        imageType: "cover",
                        provider: "s3",
                        key: "events/1/cover.jpg",
                        altText: "Event cover image",
                    },
                    tags: [
                        { id: 1, name: "Music" },
                        { id: 2, name: "Live" },
                    ],
                    startingIn: "1 day",
                    isPastEvent: false,
                    post: {
                        id: 1,
                        communityId: 1,
                        userId: 1,
                        content: "Event post content",
                        isSupportersOnly: false,
                    },
                    location: {
                        id: 1,
                        name: "Test Venue",
                        locationType: "physical",
                        lat: 40.7128,
                        lng: -74.006,
                        address: "123 Test Street, New York, NY",
                    },
                    // Store the passed userId in the response so we can check it
                    requestedByUserId: userId,
                });
            }
        );

        // Mock getCommunityEvents - important change: store the input parameters separately
        // from the output to verify what the controller is actually sending
        EventModel.getCommunityEvents.mockImplementation(
            (communityId, options) => {
                return Promise.resolve({
                    events: [
                        {
                            id: 1,
                            postId: 1,
                            uniqueUrl: "test-event-123",
                            title: "Test Event 1",
                            description: "Test Description 1",
                            eventType: "physical",
                            startTime: new Date(
                                Date.now() + 86400000
                            ).toISOString(),
                            timezone: "UTC",
                            coverImage: { key: "events/1/cover.jpg" },
                            attendeeCount: 10,
                            // Store the query options passed to the model
                            // (after controller processing)
                            queryOptions: { ...options },
                        },
                        {
                            id: 2,
                            postId: 2,
                            uniqueUrl: "test-event-456",
                            title: "Test Event 2",
                            description: "Test Description 2",
                            eventType: "online",
                            startTime: new Date(
                                Date.now() + 172800000
                            ).toISOString(), // 2 days from now
                            timezone: "UTC",
                            coverImage: { key: "events/2/cover.jpg" },
                            attendeeCount: 5,
                            queryOptions: { ...options },
                        },
                    ],
                    pagination: {
                        page: parseInt(options.page) || 1,
                        limit: parseInt(options.limit) || 10,
                        totalItems: 2,
                        totalPages: 1,
                    },
                });
            }
        );
    });

    describe("Get Event by ID", () => {
        it("should retrieve an event by ID", async () => {
            // Act
            const response = await request(app).get("/api/events/1");

            // Assert
            expect(response.status).toBe(200);
            expect(EventModel.getEventById).toHaveBeenCalledWith(1);
        });

        it("should handle non-existent event", async () => {
            // Arrange
            EventModel.getEventById.mockRejectedValue(
                new Error("Event not found")
            );

            // Act
            const response = await request(app).get("/api/events/999");

            // Assert
            expect(response.status).toBe(500);
        });

        it("should validate event ID parameter", async () => {
            // Act
            const response = await request(app).get("/api/events/invalid-id");

            // Assert
            expect(response.status).toBe(400);
            expect(EventModel.getEventById).not.toHaveBeenCalled();
        });
    });

    describe("Get Event by Unique URL", () => {
        it("should retrieve an event by unique URL", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/url/test-event-123"
            );

            // Assert
            expect(response.status).toBe(200);
            expect(EventSearchModel.getEventByUniqueUrl).toHaveBeenCalled();
        });

        it("should retrieve event with user-specific data when logged in", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/url/test-event-123"
            );

            // Assert
            expect(response.status).toBe(200);

            // Check that the controller passed the user ID to the model
            expect(response.body.data.event.requestedByUserId).toBe(1);
        });

        it("should handle non-existent event URL", async () => {
            // Arrange
            EventSearchModel.getEventByUniqueUrl.mockRejectedValue(
                new Error("Event not found")
            );

            // Act
            const response = await request(app).get(
                "/api/events/url/non-existent-event"
            );

            // Assert
            expect(response.status).toBe(500);
        });
    });

    describe("Get Community Events", () => {
        it("should retrieve events for a community", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/communities/1/events"
            );

            // Assert
            expect(response.status).toBe(200);
            expect(EventModel.getCommunityEvents).toHaveBeenCalled();
            const args = EventModel.getCommunityEvents.mock.calls[0];
            expect(args[0]).toBe(1); // Community ID should be passed
        });

        it("should filter upcoming events", async () => {
            // This test passes string params to controller, but checks the boolean values sent to model

            // Act - important: we send 'true' as a string here, just like a real request would
            const response = await request(app).get(
                "/api/events/communities/1/events?upcoming=true"
            );

            // Assert
            expect(response.status).toBe(200);

            // Verify the controller properly converted 'true' string to boolean true
            const mockCall = EventModel.getCommunityEvents.mock.calls[0][1];
            expect(mockCall.upcoming).toBe(true);

            // This verifies that the controller properly parsed the upcoming=true param
            const options = response.body.data.events[0].queryOptions;
            expect(options.upcoming).toBe(true);
        });

        it("should filter past events", async () => {
            // Act - again sending string params
            const response = await request(app).get(
                "/api/events/communities/1/events?upcoming=false&pastEvents=true"
            );

            // Assert
            expect(response.status).toBe(200);

            // Verify controller correctly processed both upcoming=false and pastEvents=true
            const mockCall = EventModel.getCommunityEvents.mock.calls[0][1];
            expect(mockCall.upcoming).toBe(false);
            expect(mockCall.pastEvents).toBe(true);

            // Check options in response
            const options = response.body.data.events[0].queryOptions;
            expect(options.upcoming).toBe(false);
            expect(options.pastEvents).toBe(true);
        });

        it("should filter by supporters-only", async () => {
            // Act - sending string param 'true'
            const response = await request(app).get(
                "/api/events/communities/1/events?isSupportersOnly=true"
            );

            // Assert
            expect(response.status).toBe(200);

            // Verify controller correctly processed isSupportersOnly=true
            const mockCall = EventModel.getCommunityEvents.mock.calls[0][1];
            expect(mockCall.isSupportersOnly).toBe(true);

            // Check options in response
            const options = response.body.data.events[0].queryOptions;
            expect(options.isSupportersOnly).toBe(true);
        });

        it("should handle pagination", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/communities/1/events?page=2&limit=5"
            );

            // Assert
            expect(response.status).toBe(200);

            // Get the options from the response
            const options = response.body.data.events[0].queryOptions;
            expect(options.page).toBe(2);
            expect(options.limit).toBe(5);
        });

        it("should validate community ID parameter", async () => {
            // Act
            const response = await request(app).get(
                "/api/events/communities/invalid-id/events"
            );

            // Assert
            expect(response.status).toBe(400);
            expect(EventModel.getCommunityEvents).not.toHaveBeenCalled();
        });
    });
});
