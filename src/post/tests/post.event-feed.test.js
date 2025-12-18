// src/post/tests/post.event-feed.test.js
// Test to verify event data is correctly returned in feed

const PostModel = require("../models/post.model");
const db = require("../../config/db");

// Mock the database
jest.mock("../../config/db");

describe("PostModel - Event Data in Feed", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("findByCommunity with event posts", () => {
        it("should return event posts with description, attendance_status, and starting_in", async () => {
            const mockEventPost = {
                id: 1,
                community_id: 1,
                user_id: 5,
                content: "Join us for this amazing event!",
                is_supporters_only: false,
                content_type: "event",
                parent_id: null,
                is_hidden: false,
                created_at: new Date(),
                updated_at: new Date(),
                user: {
                    id: 5,
                    full_name: "Test User",
                    unique_url: "test-user",
                    profile_image: null,
                },
                community_name: "Test Community",
                community_url: "test-community",
                likes_count: "5",
                replies_count: "2",
                user_has_liked: false,
                event_data: {
                    id: 10,
                    unique_url: "tech-meetup-123",
                    title: "Tech Meetup",
                    description: "A great tech meetup for developers",
                    start_time: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
                    end_time: new Date(Date.now() + 90000000).toISOString(),
                    current_attendees: 15,
                    attendance_status: "attending",
                    cover_image: {
                        id: 1,
                        provider: "s3",
                        key: "events/cover.jpg",
                        alt_text: "Event cover",
                    },
                },
            };

            db.query.mockResolvedValue({
                rows: [mockEventPost],
            });

            const result = await PostModel.findByCommunity(1, {
                userId: 5,
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(1);
            expect(result[0].content_type).toBe("event");
            expect(result[0].event_data).toBeDefined();
            expect(result[0].event_data.description).toBe(
                "A great tech meetup for developers"
            );
            expect(result[0].event_data.attendance_status).toBe("attending");
            expect(result[0].event_data.starting_in).toBeDefined();
            // Should contain time information (could be "23 hours" or "1 day" depending on exact timing)
            expect(result[0].event_data.starting_in).toMatch(/(hour|day)/i);
        });

        it("should show 'Started' for events that already began", async () => {
            const mockEventPost = {
                id: 1,
                community_id: 1,
                user_id: 5,
                content: "Event is happening now!",
                content_type: "event",
                event_data: {
                    id: 10,
                    unique_url: "tech-meetup-123",
                    title: "Tech Meetup",
                    description: "Event description",
                    start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                    end_time: new Date(Date.now() + 3600000).toISOString(),
                    current_attendees: 15,
                    attendance_status: null,
                    cover_image: null,
                },
            };

            db.query.mockResolvedValue({
                rows: [mockEventPost],
            });

            const result = await PostModel.findByCommunity(1, {
                userId: 5,
            });

            expect(result[0].event_data.starting_in).toBe("Started");
        });

        it("should return null attendance_status when user is not logged in", async () => {
            const mockEventPost = {
                id: 1,
                community_id: 1,
                user_id: 5,
                content: "Event post",
                content_type: "event",
                event_data: {
                    id: 10,
                    unique_url: "tech-meetup-123",
                    title: "Tech Meetup",
                    description: "Event description",
                    start_time: new Date(Date.now() + 86400000).toISOString(),
                    end_time: new Date(Date.now() + 90000000).toISOString(),
                    current_attendees: 15,
                    attendance_status: null, // No user logged in
                    cover_image: null,
                },
            };

            db.query.mockResolvedValue({
                rows: [mockEventPost],
            });

            const result = await PostModel.findByCommunity(1, {
                userId: null, // Not logged in
            });

            expect(result[0].event_data.attendance_status).toBeNull();
        });
    });

    describe("findUserFeed with event posts", () => {
        it("should return event posts with starting_in in user feed", async () => {
            const mockEventPost = {
                id: 1,
                community_id: 1,
                user_id: 5,
                content: "Event in my feed",
                content_type: "event",
                event_data: {
                    id: 10,
                    unique_url: "tech-meetup-123",
                    title: "Tech Meetup",
                    description: "Event description",
                    start_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
                    end_time: new Date(Date.now() + 10800000).toISOString(),
                    current_attendees: 15,
                    attendance_status: "maybe",
                    cover_image: null,
                },
            };

            db.query.mockResolvedValue({
                rows: [mockEventPost],
            });

            const result = await PostModel.findUserFeed(5, {});

            expect(result).toBeDefined();
            expect(result.length).toBe(1);
            expect(result[0].event_data.attendance_status).toBe("maybe");
            expect(result[0].event_data.starting_in).toBeDefined();
            expect(result[0].event_data.starting_in).toContain("hour");
        });
    });

    describe("_formatTimeUntil helper", () => {
        it("should format days correctly", () => {
            const seconds = 86400 * 2 + 3600 * 3; // 2 days, 3 hours
            const result = PostModel._formatTimeUntil(seconds);
            expect(result).toBe("2 days, 3 hours");
        });

        it("should format hours correctly", () => {
            const seconds = 3600 * 5 + 60 * 30; // 5 hours, 30 minutes
            const result = PostModel._formatTimeUntil(seconds);
            expect(result).toBe("5 hours, 30 minutes");
        });

        it("should format minutes correctly", () => {
            const seconds = 60 * 45; // 45 minutes
            const result = PostModel._formatTimeUntil(seconds);
            expect(result).toBe("45 minutes");
        });

        it("should return 'Started' for negative/zero seconds", () => {
            expect(PostModel._formatTimeUntil(0)).toBe("Started");
            expect(PostModel._formatTimeUntil(-3600)).toBe("Started");
        });

        it("should return 'Less than a minute' for small durations", () => {
            const result = PostModel._formatTimeUntil(30);
            expect(result).toBe("Less than a minute");
        });
    });
});
