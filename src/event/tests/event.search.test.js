// src/event/tests/event.search.edge.test.js
const request = require("supertest");
const express = require("express");
const app = express();
const EventSearchModel = require("../models/eventSearch.model");

// Mock middleware to properly set user in request
jest.mock("../../middleware/optionalAuth", () => {
    return (req, res, next) => {
        // In this mock, we explicitly set the user for all requests
        req.user = { id: 1, email: "test@example.com" };
        next();
    };
});

// Mock models
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
const eventSearchRoutes = require("../routes/eventSearch.routes");
app.use(express.json());
app.use("/api/events", eventSearchRoutes);

describe("Event Search Edge Cases", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock response for searchEvents
        EventSearchModel.searchEvents.mockResolvedValue({
            events: [
                {
                    id: 1,
                    uniqueUrl: "music-event-123",
                    title: "Music Festival",
                    description: "A great music festival",
                    tags: [{ id: 1, name: "Music" }],
                    // ... other standard fields
                },
            ],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 1,
                totalPages: 1,
            },
        });
    });

    it("should handle a search query with special characters", async () => {
        // Act - Include special characters that could cause SQL injection
        const response = await request(app).get(
            "/api/events/search?query=Music%20Festival%27%20OR%201=1--"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query).toBe("Music Festival' OR 1=1--");

        // Verify the model was called with sanitized parameters
        // The actual sanitization happens in the model, not the controller
        expect(EventSearchModel.searchEvents).toHaveBeenCalled();
    });

    it("should handle a very long search query", async () => {
        // Generate a long search string
        const longQuery = "a".repeat(255);

        // Act
        const response = await request(app).get(
            `/api/events/search?query=${longQuery}`
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query.length).toBe(255);
    });

    it("should handle a search query with boolean operators", async () => {
        // Act - Include boolean operators that might affect SQL query
        const response = await request(app).get(
            "/api/events/search?query=Music%20AND%20Festival%20OR%20Concert"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query).toBe("Music AND Festival OR Concert");
    });

    it("should handle a search query with quotes", async () => {
        // Act - Include quotes that might break SQL strings
        const response = await request(app).get(
            "/api/events/search?query=Music%20%22Festival%22"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query).toBe('Music "Festival"');
    });

    it("should handle multiple tags as a comma-separated string", async () => {
        // Act
        const response = await request(app).get(
            "/api/events/search?tags=Music,Festival,Live"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(Array.isArray(callArgs.tags)).toBe(true);
        expect(callArgs.tags).toEqual(["Music", "Festival", "Live"]);
    });

    it("should handle a single tag", async () => {
        // Act
        const response = await request(app).get(
            "/api/events/search?tags=Music"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(Array.isArray(callArgs.tags)).toBe(true);
        expect(callArgs.tags).toEqual(["Music"]);
    });

    it("should handle tag with special characters", async () => {
        // Act - Include special characters in tag
        const response = await request(app).get(
            "/api/events/search?tags=Music%26Jazz"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.tags).toEqual(["Music&Jazz"]);
    });

    it("should handle a numeric search query", async () => {
        // Act - Search with numbers that might be interpreted as numeric types
        const response = await request(app).get(
            "/api/events/search?query=2023%20Festival"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query).toBe("2023 Festival");
    });

    it("should handle a search query with SQL commands", async () => {
        // Act - Include SQL commands that might attempt injection
        const response = await request(app).get(
            "/api/events/search?query=Festival%3B%20DROP%20TABLE%20events%3B"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query).toBe("Festival; DROP TABLE events;");
    });

    it("should handle URL-encoded characters in search query", async () => {
        // Act - Include URL-encoded characters
        const response = await request(app).get(
            "/api/events/search?query=Festival%20%26%20Concert%20%3D%20Fun%21"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query).toBe("Festival & Concert = Fun!");
    });

    it("should handle community ID and sort parameters together", async () => {
        // Act - Combine multiple parameters
        const response = await request(app).get(
            "/api/events/search?communityId=1&sortBy=relevance&query=Music"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.communityId).toBe(1);
        expect(callArgs.sortBy).toBe("relevance");
        expect(callArgs.query).toBe("Music");
    });

    it("should handle all parameters together", async () => {
        // Act - Include all possible parameters
        const response = await request(app).get(
            "/api/events/search?query=Festival&tags=Music,Live&timeRange=1w&sortBy=relevance&page=2&limit=20&communityId=1"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query).toBe("Festival");
        expect(callArgs.tags).toEqual(["Music", "Live"]);
        expect(callArgs.timeRange).toBe("1w");
        expect(callArgs.sortBy).toBe("relevance");
        expect(callArgs.page).toBe(2);
        expect(callArgs.limit).toBe(20);
        expect(callArgs.communityId).toBe(1);
    });

    it("should handle repeated parameters with the last value taking precedence", async () => {
        // Act - Include repeated parameters
        const response = await request(app).get(
            "/api/events/search?sortBy=date&sortBy=relevance"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.sortBy).toBe("relevance");
    });

    it("should reject invalid time range values", async () => {
        // Act - Use invalid time range
        const response = await request(app).get(
            "/api/events/search?timeRange=1y"
        );

        // Assert
        expect(response.status).toBe(400); // Should reject with validation error
        expect(EventSearchModel.searchEvents).not.toHaveBeenCalled();
    });

    it("should handle empty query string", async () => {
        // Act - Empty query string
        const response = await request(app).get("/api/events/search?query=");

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.query).toBe("");
    });

    it("should handle tags with whitespace", async () => {
        // Act - Tags with whitespace that needs trimming
        const response = await request(app).get(
            "/api/events/search?tags=%20Music%20,%20%20Festival%20"
        );

        // Assert
        expect(response.status).toBe(200);
        const callArgs = EventSearchModel.searchEvents.mock.calls[0][0];
        expect(callArgs.tags).toEqual(["Music", "Festival"]);
    });

    it("should handle null values gracefully", async () => {
        // Setup a mock that returns null values
        EventSearchModel.searchEvents.mockImplementationOnce((options) => {
            return Promise.resolve({
                events: [
                    {
                        id: 1,
                        uniqueUrl: "music-event-123",
                        title: "Music Festival",
                        description: null, // Null description
                        tags: null, // Null tags
                        communityName: null, // Null community name
                        coverImage: null, // Null cover image
                        // ... other fields would be here
                    },
                ],
                pagination: {
                    page: 1,
                    limit: 10,
                    totalItems: 1,
                    totalPages: 1,
                },
            });
        });

        // Act - Simple query with all defaults
        const response = await request(app).get("/api/events/search");

        // Assert
        expect(response.status).toBe(200);
        // The important thing is that it doesn't crash when null values are present
        expect(response.body.data.events).toHaveLength(1);
    });
});
