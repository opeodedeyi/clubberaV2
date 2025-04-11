const communityController = require("../controllers/community.controller");
const communityModel = require("../models/community.model");
const imageModel = require("../models/image.model");
const locationModel = require("../models/location.model");
const tagModel = require("../models/tag.model");
const subscriptionModel = require("../models/subscription.model");
const restrictionModel = require("../models/restriction.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../models/image.model");
jest.mock("../models/location.model");
jest.mock("../models/tag.model");
jest.mock("../models/subscription.model");
jest.mock("../models/restriction.model");
jest.mock("../../utils/ApiError");

describe("CommunityController - getCommunityDetails", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                identifier: "test-community",
            },
            user: {
                id: 10,
            },
        };
        res = {
            json: jest.fn(),
        };
        next = jest.fn();

        // Reset mocks
        jest.clearAllMocks();

        // Set up mock implementations
        communityModel.findByIdentifier.mockResolvedValue({
            id: 1,
            name: "Test Community",
            unique_url: "test-community",
            tagline: "A community for testing",
            description: "This is a test community",
            guidelines: "Follow the rules",
            is_private: false,
            is_active: true,
            created_at: new Date("2023-01-01"),
            updated_at: new Date("2023-01-15"),
        });

        imageModel.getProfileImage = jest.fn().mockResolvedValue({
            id: 5,
            provider: "s3",
            key: "communities/1/profile.jpg",
            alt_text: "Community profile",
        });

        imageModel.getCoverImage = jest.fn().mockResolvedValue({
            id: 6,
            provider: "s3",
            key: "communities/1/cover.jpg",
            alt_text: "Community cover",
        });

        locationModel.findByCommunity = jest.fn().mockResolvedValue({
            id: 7,
            name: "New York",
            lat: 40.7128,
            lng: -74.006,
            address: "New York, NY",
        });

        tagModel.getCommunityTags.mockResolvedValue([
            { id: 1, name: "technology" },
            { id: 2, name: "programming" },
        ]);

        communityModel.countMembers = jest.fn().mockResolvedValue(120);

        subscriptionModel.getByCommunitySummary.mockResolvedValue({
            id: 3,
            plan_code: "pro_monthly",
            status: "active",
        });

        communityModel.getMember = jest.fn().mockResolvedValue({
            id: 42,
            role: "moderator",
            joined_at: new Date("2023-01-05"),
        });

        restrictionModel.getActiveRestrictions = jest
            .fn()
            .mockResolvedValue([]);
    });

    it("should get full community details for authenticated user who is a member", async () => {
        await communityController.getCommunityDetails(req, res, next);

        expect(communityModel.findByIdentifier).toHaveBeenCalledWith(
            "test-community"
        );
        expect(imageModel.getProfileImage).toHaveBeenCalledWith(1);
        expect(imageModel.getCoverImage).toHaveBeenCalledWith(1);
        expect(locationModel.findByCommunity).toHaveBeenCalledWith(1);
        expect(tagModel.getCommunityTags).toHaveBeenCalledWith(1);
        expect(communityModel.countMembers).toHaveBeenCalledWith(1);
        expect(subscriptionModel.getByCommunitySummary).toHaveBeenCalledWith(1);

        // Check user relationship checks
        expect(communityModel.getMember).toHaveBeenCalledWith(1, 10);
        expect(restrictionModel.getActiveRestrictions).toHaveBeenCalledWith(
            1,
            10
        );

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    id: 1,
                    name: "Test Community",
                    uniqueUrl: "test-community",
                    profileImage: expect.any(Object),
                    coverImage: expect.any(Object),
                    location: expect.any(Object),
                    tags: expect.any(Array),
                    memberCount: 120,
                    subscription: expect.objectContaining({
                        plan: "pro_monthly",
                        status: "active",
                        isPro: true,
                    }),
                    user: expect.objectContaining({
                        isMember: true,
                        isAdmin: true,
                        membershipDetails: expect.any(Object),
                    }),
                }),
            })
        );
    });

    it("should get community details for unauthenticated user", async () => {
        // Remove user from request to simulate unauthenticated request
        req.user = undefined;

        await communityController.getCommunityDetails(req, res, next);

        // User relationship checks should not be called
        expect(communityModel.getMember).not.toHaveBeenCalled();
        expect(restrictionModel.getActiveRestrictions).not.toHaveBeenCalled();

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    id: 1,
                    name: "Test Community",
                    user: null, // No user relationship data
                }),
            })
        );
    });

    it("should get community details by ID", async () => {
        req.params.identifier = "1";

        await communityController.getCommunityDetails(req, res, next);

        expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if community not found", async () => {
        communityModel.findByIdentifier.mockResolvedValue(null);

        await communityController.getCommunityDetails(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "Community not found or inactive",
            404
        );
    });

    it("should include active restrictions if user has any", async () => {
        restrictionModel.getActiveRestrictions.mockResolvedValue([
            {
                id: 8,
                type: "mute",
                reason: "Inappropriate behavior",
                expires_at: new Date("2023-12-31"),
            },
        ]);

        await communityController.getCommunityDetails(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    user: expect.objectContaining({
                        activeRestrictions: expect.arrayContaining([
                            expect.objectContaining({
                                type: "mute",
                            }),
                        ]),
                    }),
                }),
            })
        );
    });

    it("should mark a regular member as not an admin", async () => {
        communityModel.getMember.mockResolvedValue({
            id: 42,
            role: "member",
            joined_at: new Date("2023-01-05"),
        });

        await communityController.getCommunityDetails(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    user: expect.objectContaining({
                        isMember: true,
                        isAdmin: false,
                    }),
                }),
            })
        );
    });

    it("should handle nonexistent user-community relationship", async () => {
        communityModel.getMember.mockResolvedValue(null);

        await communityController.getCommunityDetails(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    user: expect.objectContaining({
                        isMember: false,
                        isAdmin: false,
                        membershipDetails: null,
                    }),
                }),
            })
        );
    });

    // New tests for missing optional fields

    it("should handle missing profile image", async () => {
        imageModel.getProfileImage.mockResolvedValue(null);

        await communityController.getCommunityDetails(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    profileImage: null,
                }),
            })
        );
    });

    it("should handle missing cover image", async () => {
        imageModel.getCoverImage.mockResolvedValue(null);

        await communityController.getCommunityDetails(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    coverImage: null,
                }),
            })
        );
    });

    it("should handle missing location", async () => {
        locationModel.findByCommunity.mockResolvedValue(null);

        await communityController.getCommunityDetails(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    location: null,
                }),
            })
        );
    });

    it("should handle missing tags", async () => {
        tagModel.getCommunityTags.mockResolvedValue([]);

        await communityController.getCommunityDetails(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    tags: [],
                }),
            })
        );
    });

    it("should handle missing subscription", async () => {
        subscriptionModel.getByCommunitySummary.mockResolvedValue(null);

        await communityController.getCommunityDetails(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    subscription: expect.objectContaining({
                        plan: "free",
                        status: "inactive",
                        isPro: false,
                    }),
                }),
            })
        );
    });

    it("should handle errors when fetching related data", async () => {
        // Simulate errors for various fetches
        imageModel.getProfileImage.mockRejectedValue(
            new Error("Profile image error")
        );
        locationModel.findByCommunity.mockRejectedValue(
            new Error("Location error")
        );

        // Should still return a valid response with nulls for failed fetches
        await communityController.getCommunityDetails(req, res, next);

        expect(next).not.toHaveBeenCalled(); // Should not trigger error middleware
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.objectContaining({
                    profileImage: null,
                    location: null,
                }),
            })
        );
    });
});
