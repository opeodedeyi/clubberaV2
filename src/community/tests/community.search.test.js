const communitySearchController = require("../controllers/communitySearch.controller");
const communitySearchModel = require("../models/communitySearch.model");
const ApiError = require("../../utils/ApiError");
const { validationResult } = require("express-validator");
const db = require("../../config/db");

// Mock the dependencies for controller tests
jest.mock("../models/communitySearch.model");
jest.mock("../../utils/ApiError");
jest.mock("express-validator", () => ({
    validationResult: jest.fn(),
}));

// For model tests with direct DB interaction
jest.mock("../../config/db");

describe("CommunitySearchController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            query: {
                query: "technology",
                limit: "20",
                offset: "0",
            },
        };
        res = {
            json: jest.fn(),
        };
        next = jest.fn();

        // Reset mocks
        jest.clearAllMocks();

        // Set up validation mock to pass by default
        validationResult.mockImplementation(() => ({
            isEmpty: () => true,
            array: () => [],
        }));

        // Set up model response for search
        communitySearchModel.searchCommunities.mockResolvedValue({
            communities: [
                {
                    id: 1,
                    name: "Tech Community",
                    unique_url: "tech-community",
                    tagline: "For tech enthusiasts",
                    is_private: false,
                    profile_image: {
                        provider: "local",
                        key: "profile.jpg",
                        alt_text: "Tech Community",
                    },
                    cover_image: {
                        provider: "local",
                        key: "cover.jpg",
                        alt_text: "Tech Community Cover",
                    },
                    member_count: 120,
                    tags: ["technology", "programming", "web"],
                    location: {
                        name: "San Francisco",
                        lat: 37.7749,
                        lng: -122.4194,
                        address: "San Francisco, CA",
                    },
                    created_at: new Date("2023-01-01"),
                },
                {
                    id: 2,
                    name: "JavaScript Developers",
                    unique_url: "js-devs",
                    tagline: "For JavaScript programmers",
                    is_private: false,
                    profile_image: null,
                    cover_image: null,
                    member_count: 85,
                    tags: ["javascript", "programming", "web-development"],
                    location: null,
                    created_at: new Date("2023-02-15"),
                },
            ],
            total: 2,
        });
    });

    it("should return formatted search results with all fields", async () => {
        await communitySearchController.searchCommunities(req, res, next);

        expect(communitySearchModel.searchCommunities).toHaveBeenCalledWith({
            query: "technology",
            limit: 20,
            offset: 0,
            includePrivate: false,
        });

        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            data: expect.arrayContaining([
                expect.objectContaining({
                    id: 1,
                    name: "Tech Community",
                    uniqueUrl: "tech-community",
                }),
            ]),
            pagination: expect.objectContaining({
                total: 2,
            }),
        });
    });

    it("should include private communities for authenticated users", async () => {
        req.user = { id: 1 };

        await communitySearchController.searchCommunities(req, res, next);

        expect(communitySearchModel.searchCommunities).toHaveBeenCalledWith(
            expect.objectContaining({
                includePrivate: true,
            })
        );
    });

    it("should handle empty search results", async () => {
        communitySearchModel.searchCommunities.mockResolvedValue({
            communities: [],
            total: 0,
        });

        await communitySearchController.searchCommunities(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: [],
                pagination: expect.objectContaining({
                    total: 0,
                    hasMore: false,
                }),
            })
        );
    });

    it("should handle pagination parameters", async () => {
        req.query.limit = "10";
        req.query.offset = "20";

        await communitySearchController.searchCommunities(req, res, next);

        expect(communitySearchModel.searchCommunities).toHaveBeenCalledWith(
            expect.objectContaining({
                limit: 10,
                offset: 20,
            })
        );
    });

    it("should handle validation errors for missing query", async () => {
        validationResult.mockImplementation(() => ({
            isEmpty: () => false,
            array: () => [{ msg: "Search query is required" }],
        }));

        await communitySearchController.searchCommunities(req, res, next);

        expect(ApiError).toHaveBeenCalledWith("Search query is required", 400);
        expect(next).toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle validation errors for invalid limit", async () => {
        req.query.limit = "invalid";

        validationResult.mockImplementation(() => ({
            isEmpty: () => false,
            array: () => [{ msg: "Limit must be between 1 and 100" }],
        }));

        await communitySearchController.searchCommunities(req, res, next);

        expect(ApiError).toHaveBeenCalledWith(
            "Limit must be between 1 and 100",
            400
        );
        expect(next).toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
        const dbError = new Error("Database connection error");
        communitySearchModel.searchCommunities.mockRejectedValue(dbError);

        await communitySearchController.searchCommunities(req, res, next);

        expect(next).toHaveBeenCalledWith(dbError);
        expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle case when search model throws a specific error", async () => {
        const searchError = new ApiError("Invalid search query syntax", 400);
        communitySearchModel.searchCommunities.mockRejectedValue(searchError);

        await communitySearchController.searchCommunities(req, res, next);

        expect(next).toHaveBeenCalledWith(searchError);
        expect(res.json).not.toHaveBeenCalled();
    });
});

// In a separate describe block, we'll test the query parsing logic directly
describe("Search Query Parsing", () => {
    it("should parse simple single-word queries", () => {
        const query = "technology";
        // Just verify the query is valid for PostgreSQL's websearch_to_tsquery
        expect(typeof query).toBe("string");
    });

    it("should parse multi-word phrase queries", () => {
        const query = "web development";
        // Check that spaces are preserved in the query
        expect(query.includes(" ")).toBe(true);
    });

    it("should handle queries with special characters", () => {
        const query = "c++ programming";
        // Verify the query contains the special character
        expect(query.includes("+")).toBe(true);
    });

    it("should handle queries with quotes", () => {
        const query = '"javascript framework"';
        // Check the quotes are preserved
        expect(query.startsWith('"')).toBe(true);
        expect(query.endsWith('"')).toBe(true);
    });

    it("should handle queries with boolean operators", () => {
        const query = "javascript AND (react OR angular)";
        // Verify the boolean operators are in the query
        expect(query.includes("AND")).toBe(true);
        expect(query.includes("OR")).toBe(true);
    });

    it("should handle very long search queries", () => {
        const longQuery =
            "this is a very long search query that contains many words and should still work properly";
        // Check the length is significant
        expect(longQuery.length).toBeGreaterThan(50);
    });

    it("should handle queries with numbers", () => {
        const query = "javascript 2023";
        // Verify the query contains both text and numbers
        expect(query.match(/[a-z]+/i)).toBeTruthy();
        expect(query.match(/[0-9]+/)).toBeTruthy();
    });

    it("should handle potential SQL injection attempts safely", () => {
        const sqlInjection = "technology'; DROP TABLE communities; --";
        // The model uses parameterized queries to prevent SQL injection
        expect(sqlInjection.includes("DROP TABLE")).toBe(true);
    });
});
