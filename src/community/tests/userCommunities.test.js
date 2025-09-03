const userCommunitiesController = require("../controllers/userCommunities.controller");
const userCommunitiesModel = require("../models/userCommunities.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("../models/userCommunities.model");
jest.mock("../../utils/ApiError");

describe("UserCommunitiesController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                userIdentifier: "johndoe",
            },
            query: {
                limit: "20",
                offset: "0",
                sort: "role",
                search: "",
            },
        };
        res = {
            json: jest.fn(),
        };
        next = jest.fn();

        // Reset mocks
        jest.clearAllMocks();

        // Mock data
        const mockCommunities = [
            {
                id: 1,
                name: "Tech Community",
                unique_url: "tech-community",
                tagline: "For tech enthusiasts",
                memberCount: 120,
                isAdmin: true,
                role: "owner",
                joined_at: new Date("2023-01-01"),
                profileImage: {
                    id: 10,
                    provider: "s3",
                    key: "communities/1/profile.jpg",
                    alt_text: "Tech Community Logo",
                },
                coverImage: {
                    id: 11,
                    provider: "s3",
                    key: "communities/1/cover.jpg",
                    alt_text: "Tech Community Cover",
                },
            },
            {
                id: 2,
                name: "Art Community",
                unique_url: "art-community",
                tagline: "For art enthusiasts",
                memberCount: 85,
                isAdmin: false,
                role: "member",
                joined_at: new Date("2023-02-15"),
                profileImage: null,
                coverImage: null,
            },
        ];

        // Set up mock implementations
        userCommunitiesModel.checkUserExists = jest
            .fn()
            .mockResolvedValue(true);
        userCommunitiesModel.getUserCommunities = jest
            .fn()
            .mockResolvedValue(mockCommunities);
        userCommunitiesModel.countUserCommunities = jest
            .fn()
            .mockResolvedValue(2);
    });

    describe("getUserCommunities", () => {
        it("should get communities for a user by unique URL", async () => {
            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(userCommunitiesModel.checkUserExists).toHaveBeenCalledWith(
                "johndoe"
            );
            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                "johndoe",
                expect.objectContaining({
                    limit: 20,
                    offset: 0,
                    sortBy: "role",
                    search: "",
                })
            );

            expect(
                userCommunitiesModel.countUserCommunities
            ).toHaveBeenCalledWith(
                "johndoe",
                expect.objectContaining({
                    search: "",
                })
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: 1,
                            name: "Tech Community",
                            uniqueUrl: "tech-community",
                            isAdmin: true,
                        }),
                        expect.objectContaining({
                            id: 2,
                            name: "Art Community",
                            uniqueUrl: "art-community",
                            isAdmin: false,
                        }),
                    ]),
                    pagination: expect.objectContaining({
                        total: 2,
                        limit: 20,
                        offset: 0,
                        hasMore: false,
                    }),
                })
            );
        });

        it("should get communities for a user by ID", async () => {
            req.params.userIdentifier = "123";

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(userCommunitiesModel.checkUserExists).toHaveBeenCalledWith(
                "123"
            );
            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith("123", expect.any(Object));
            expect(res.json).toHaveBeenCalled();
        });

        it("should handle sort by joined date", async () => {
            req.query.sort = "joined";

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    sortBy: "joined",
                })
            );
        });

        it("should handle search parameter", async () => {
            req.query.search = "tech";

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    search: "tech",
                })
            );
            expect(
                userCommunitiesModel.countUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    search: "tech",
                })
            );
        });

        it("should handle pagination", async () => {
            req.query.limit = "10";
            req.query.offset = "20";
            userCommunitiesModel.countUserCommunities.mockResolvedValue(50);

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    limit: 10,
                    offset: 20,
                })
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    pagination: expect.objectContaining({
                        total: 50,
                        limit: 10,
                        offset: 20,
                        hasMore: true,
                    }),
                })
            );
        });

        it("should handle empty result gracefully", async () => {
            userCommunitiesModel.getUserCommunities.mockResolvedValue([]);
            userCommunitiesModel.countUserCommunities.mockResolvedValue(0);

            await userCommunitiesController.getUserCommunities(req, res, next);

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

        it("should handle invalid sort parameter", async () => {
            req.query.sort = "invalid";

            await userCommunitiesController.getUserCommunities(req, res, next);

            // Should default to 'role'
            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    sortBy: "role",
                })
            );
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            userCommunitiesModel.checkUserExists.mockRejectedValue(dbError);

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should handle long search terms", async () => {
            const longSearchTerm = "a".repeat(100);
            req.query.search = longSearchTerm;

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    search: longSearchTerm,
                })
            );
        });

        it("should handle search with special characters", async () => {
            const specialSearch = "tech & art%";
            req.query.search = specialSearch;

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    search: specialSearch,
                })
            );
        });

        it("should correctly handle user not found", async () => {
            // Mock checkUserExists to return false
            userCommunitiesModel.checkUserExists.mockResolvedValue(false);

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(userCommunitiesModel.checkUserExists).toHaveBeenCalledWith(
                "johndoe"
            );
            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(
                userCommunitiesModel.getUserCommunities
            ).not.toHaveBeenCalled();
        });

        it("should pass numeric IDs correctly", async () => {
            req.params.userIdentifier = "123";

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(userCommunitiesModel.checkUserExists).toHaveBeenCalledWith(
                "123"
            );
        });

        it("should handle very large limit values", async () => {
            req.query.limit = "1000"; // Too large

            await userCommunitiesController.getUserCommunities(req, res, next);

            // Should clamp to max allowed or use default
            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    limit: expect.any(Number),
                })
            );
        });

        it("should handle the case when both search and sort are specified", async () => {
            req.query.search = "tech";
            req.query.sort = "joined";

            await userCommunitiesController.getUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    search: "tech",
                    sortBy: "joined",
                })
            );
        });
    });

    describe("getMyUserCommunities", () => {
        beforeEach(() => {
            req = {
                user: {
                    id: 123,
                    email: "user@example.com",
                    fullName: "John Doe"
                },
                query: {
                    limit: "20",
                    offset: "0",
                    sort: "role",
                    search: "",
                },
            };
        });

        it("should get communities for authenticated user", async () => {
            await userCommunitiesController.getMyUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                123, // Should use user ID from req.user
                expect.objectContaining({
                    limit: 20,
                    offset: 0,
                    sortBy: "role",
                    search: "",
                })
            );

            expect(
                userCommunitiesModel.countUserCommunities
            ).toHaveBeenCalledWith(
                123,
                expect.objectContaining({
                    search: "",
                })
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: 1,
                            name: "Tech Community",
                            uniqueUrl: "tech-community",
                            isAdmin: true,
                        }),
                        expect.objectContaining({
                            id: 2,
                            name: "Art Community",
                            uniqueUrl: "art-community",
                            isAdmin: false,
                        }),
                    ]),
                    pagination: expect.objectContaining({
                        total: 2,
                        limit: 20,
                        offset: 0,
                        hasMore: false,
                    }),
                })
            );
        });

        it("should handle sort by joined date for authenticated user", async () => {
            req.query.sort = "joined";

            await userCommunitiesController.getMyUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                123,
                expect.objectContaining({
                    sortBy: "joined",
                })
            );
        });

        it("should handle search parameter for authenticated user", async () => {
            req.query.search = "tech";

            await userCommunitiesController.getMyUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                123,
                expect.objectContaining({
                    search: "tech",
                })
            );
            expect(
                userCommunitiesModel.countUserCommunities
            ).toHaveBeenCalledWith(
                123,
                expect.objectContaining({
                    search: "tech",
                })
            );
        });

        it("should handle pagination for authenticated user", async () => {
            req.query.limit = "10";
            req.query.offset = "20";
            userCommunitiesModel.countUserCommunities.mockResolvedValue(50);

            await userCommunitiesController.getMyUserCommunities(req, res, next);

            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                123,
                expect.objectContaining({
                    limit: 10,
                    offset: 20,
                })
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    pagination: expect.objectContaining({
                        total: 50,
                        limit: 10,
                        offset: 20,
                        hasMore: true,
                    }),
                })
            );
        });

        it("should handle empty result for authenticated user", async () => {
            userCommunitiesModel.getUserCommunities.mockResolvedValue([]);
            userCommunitiesModel.countUserCommunities.mockResolvedValue(0);

            await userCommunitiesController.getMyUserCommunities(req, res, next);

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

        it("should handle database errors for authenticated user", async () => {
            const dbError = new Error("Database error");
            userCommunitiesModel.getUserCommunities.mockRejectedValue(dbError);

            await userCommunitiesController.getMyUserCommunities(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should handle invalid sort parameter for authenticated user", async () => {
            req.query.sort = "invalid";

            await userCommunitiesController.getMyUserCommunities(req, res, next);

            // Should default to 'role'
            expect(
                userCommunitiesModel.getUserCommunities
            ).toHaveBeenCalledWith(
                123,
                expect.objectContaining({
                    sortBy: "role",
                })
            );
        });
    });
});
