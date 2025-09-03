const recommendationsController = require("../controllers/recommendations.controller");
const recommendationsModel = require("../models/recommendations.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("../models/recommendations.model");
jest.mock("../../utils/ApiError");

describe("RecommendationsController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: {
                id: 123,
                email: "user@example.com",
                fullName: "John Doe"
            },
            query: {
                limit: "6"
            }
        };
        res = {
            json: jest.fn()
        };
        next = jest.fn();

        // Reset mocks
        jest.clearAllMocks();

        // Mock data
        const mockRecommendations = [
            {
                id: 1,
                name: "Tech Community",
                unique_url: "tech-community",
                tagline: "For tech enthusiasts",
                description: "A community for tech lovers",
                is_private: false,
                member_count: 120,
                profile_image: {
                    provider: "s3",
                    key: "communities/1/profile.jpg",
                    alt_text: "Tech Community Logo"
                },
                cover_image: null,
                tags: ["technology", "programming"],
                location: {
                    name: "San Francisco",
                    lat: 37.7749,
                    lng: -122.4194,
                    address: "San Francisco, CA"
                },
                created_at: new Date("2023-01-01"),
                recommendation_reason: "Based on your interests",
                relevance_score: 5
            },
            {
                id: 2,
                name: "Art Community",
                unique_url: "art-community",
                tagline: "For art enthusiasts",
                description: "A community for artists",
                is_private: false,
                member_count: 85,
                profile_image: null,
                cover_image: null,
                tags: ["art", "creativity"],
                location: null,
                created_at: new Date("2023-02-15"),
                recommendation_reason: "Trending community",
                relevance_score: 3
            }
        ];

        // Set up mock implementation for authenticated users
        recommendationsModel.getRecommendations = jest
            .fn()
            .mockResolvedValue({
                communities: mockRecommendations,
                strategiesUsed: ['interest', 'trending'],
                strategiesFailed: ['geographic', 'collaborative']
            });

        // Set up mock implementation for non-authenticated users
        recommendationsModel.getPopularCommunities = jest
            .fn()
            .mockResolvedValue({
                communities: mockRecommendations.slice(0, 2),
                strategiesUsed: ['popular'],
                strategiesFailed: []
            });
    });

    describe("getRecommendations", () => {
        it("should get recommendations for authenticated user", async () => {
            await recommendationsController.getRecommendations(req, res, next);

            expect(recommendationsModel.getRecommendations).toHaveBeenCalledWith(123, 6);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: 1,
                            name: "Tech Community",
                            uniqueUrl: "tech-community",
                            recommendationReason: "Based on your interests"
                        }),
                        expect.objectContaining({
                            id: 2,
                            name: "Art Community",
                            uniqueUrl: "art-community",
                            recommendationReason: "Trending community"
                        })
                    ]),
                    meta: expect.objectContaining({
                        total: 2,
                        requested: 6,
                        userId: 123,
                        isAuthenticated: true,
                        message: expect.any(String),
                        strategiesUsed: ['interest', 'trending']
                    })
                })
            );
        });

        it("should handle custom limit parameter", async () => {
            req.query.limit = "3";

            await recommendationsController.getRecommendations(req, res, next);

            expect(recommendationsModel.getRecommendations).toHaveBeenCalledWith(123, 3);
        });

        it("should use default limit when not provided", async () => {
            delete req.query.limit;

            await recommendationsController.getRecommendations(req, res, next);

            expect(recommendationsModel.getRecommendations).toHaveBeenCalledWith(123, 6);
        });

        it("should handle invalid limit values", async () => {
            req.query.limit = "25"; // Too high

            await recommendationsController.getRecommendations(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should handle limit too low", async () => {
            req.query.limit = "0"; // Too low

            await recommendationsController.getRecommendations(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should handle empty recommendations", async () => {
            recommendationsModel.getRecommendations.mockResolvedValue({
                communities: [],
                strategiesUsed: [],
                strategiesFailed: ['strategies_failed']
            });

            await recommendationsController.getRecommendations(req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: [],
                    meta: expect.objectContaining({
                        total: 0,
                        requested: 6,
                        isAuthenticated: true,
                        message: expect.stringContaining("No recommendations found with current criteria")
                    })
                })
            );
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            recommendationsModel.getRecommendations.mockRejectedValue(dbError);

            await recommendationsController.getRecommendations(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should format response correctly with all fields", async () => {
            await recommendationsController.getRecommendations(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: [
                    {
                        id: 1,
                        name: "Tech Community",
                        uniqueUrl: "tech-community",
                        tagline: "For tech enthusiasts",
                        description: "A community for tech lovers",
                        isPrivate: false,
                        memberCount: 120,
                        profileImage: {
                            provider: "s3",
                            key: "communities/1/profile.jpg",
                            alt_text: "Tech Community Logo"
                        },
                        coverImage: null,
                        tags: ["technology", "programming"],
                        location: {
                            name: "San Francisco",
                            lat: 37.7749,
                            lng: -122.4194,
                            address: "San Francisco, CA"
                        },
                        createdAt: new Date("2023-01-01"),
                        recommendationReason: "Based on your interests",
                        relevanceScore: 5
                    },
                    {
                        id: 2,
                        name: "Art Community",
                        uniqueUrl: "art-community",
                        tagline: "For art enthusiasts",
                        description: "A community for artists",
                        isPrivate: false,
                        memberCount: 85,
                        profileImage: null,
                        coverImage: null,
                        tags: ["art", "creativity"],
                        location: null,
                        createdAt: new Date("2023-02-15"),
                        recommendationReason: "Trending community",
                        relevanceScore: 3
                    }
                ],
                meta: {
                    total: 2,
                    requested: 6,
                    userId: 123,
                    isAuthenticated: true,
                    message: expect.any(String),
                    strategiesUsed: ['interest', 'trending'],
                    generatedAt: expect.any(String)
                }
            });
        });

        // Tests for non-authenticated users
        describe("non-authenticated users", () => {
            beforeEach(() => {
                // Remove user from request to simulate non-authenticated state
                req.user = undefined;
            });

            it("should get popular communities for non-authenticated users", async () => {
                await recommendationsController.getRecommendations(req, res, next);

                expect(recommendationsModel.getPopularCommunities).toHaveBeenCalledWith(6);
                expect(recommendationsModel.getRecommendations).not.toHaveBeenCalled();

                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        status: "success",
                        data: expect.arrayContaining([
                            expect.objectContaining({
                                id: 1,
                                name: "Tech Community",
                                recommendationReason: "Based on your interests" // Mock data has this
                            }),
                            expect.objectContaining({
                                id: 2,
                                name: "Art Community",
                                recommendationReason: "Trending community" // Mock data has this
                            })
                        ]),
                        meta: expect.objectContaining({
                            total: 2,
                            requested: 6,
                            userId: null,
                            isAuthenticated: false,
                            message: expect.stringContaining("popular communities"),
                            strategiesUsed: ['popular']
                        })
                    })
                );
            });

            it("should handle custom limit for non-authenticated users", async () => {
                req.query.limit = "4";

                await recommendationsController.getRecommendations(req, res, next);

                expect(recommendationsModel.getPopularCommunities).toHaveBeenCalledWith(4);
            });

            it("should handle empty popular communities", async () => {
                recommendationsModel.getPopularCommunities.mockResolvedValue({
                    communities: [],
                    strategiesUsed: [],
                    strategiesFailed: ['popular']
                });

                await recommendationsController.getRecommendations(req, res, next);

                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        status: "success",
                        data: [],
                        meta: expect.objectContaining({
                            total: 0,
                            isAuthenticated: false,
                            message: expect.stringContaining("No communities available")
                        })
                    })
                );
            });

            it("should handle database errors for non-authenticated users", async () => {
                const dbError = new Error("Database error");
                recommendationsModel.getPopularCommunities.mockRejectedValue(dbError);

                await recommendationsController.getRecommendations(req, res, next);

                expect(next).toHaveBeenCalledWith(dbError);
                expect(res.json).not.toHaveBeenCalled();
            });
        });

        // Test message generation
        describe("generateResultMessage", () => {
            it("should generate appropriate message for full results", () => {
                const message = recommendationsController.generateResultMessage(
                    6, 6, ['interest'], [], true
                );
                expect(message).toContain("based on your interests");
            });

            it("should generate message for partial results", () => {
                const message = recommendationsController.generateResultMessage(
                    3, 6, ['trending'], ['interest'], true
                );
                expect(message).toContain("Found 3 communities");
            });

            it("should generate message for no results", () => {
                const message = recommendationsController.generateResultMessage(
                    0, 6, [], ['all_communities_joined'], true
                );
                expect(message).toContain("already a member of all");
            });

            it("should generate message for non-authenticated users", () => {
                const message = recommendationsController.generateResultMessage(
                    4, 6, ['popular'], [], false
                );
                expect(message).toContain("Sign up for personalized");
            });
        });
    });
});