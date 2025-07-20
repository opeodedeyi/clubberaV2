const communityController = require("../controllers/community.controller");
const communityModel = require("../models/community.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../../utils/ApiError");

describe("CommunityController - getCommunityMembers", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: 1,
            },
            query: {
                limit: 20,
                offset: 0,
            },
            user: {
                id: 3,
            },
        };
        res = {
            json: jest.fn(),
        };
        next = jest.fn();

        // Reset mocks
        jest.clearAllMocks();

        // Default successful mock implementations
        communityModel.findByIdentifier.mockResolvedValue({
            id: 1,
            name: "Test Community",
            unique_url: "test-community",
        });

        communityModel.getMembers.mockResolvedValue([
            {
                id: 1,
                fullName: "Owner User",
                uniqueUrl: "owner-user",
                membershipId: 101,
                role: "owner",
                isPremium: false,
                joinedAt: new Date("2023-01-01"),
                profileImage: {
                    provider: "local",
                    key: "owner-profile.jpg",
                    altText: "Owner profile",
                },
            },
            {
                id: 2,
                fullName: "Moderator User",
                uniqueUrl: "moderator-user",
                membershipId: 102,
                role: "moderator",
                isPremium: false,
                joinedAt: new Date("2023-01-15"),
                profileImage: null,
            },
        ]);

        communityModel.countMembers.mockResolvedValue(2);
    });

    it("should get community members successfully", async () => {
        await communityController.getCommunityMembers(req, res, next);

        expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
        expect(communityModel.getMembers).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                limit: 20,
                offset: 0,
            })
        );
        expect(communityModel.countMembers).toHaveBeenCalledWith(
            1,
            expect.any(Object)
        );

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                data: expect.any(Array),
                pagination: expect.objectContaining({
                    total: 2,
                    limit: 20,
                    offset: 0,
                    hasMore: false,
                }),
            })
        );

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 404 if community not found", async () => {
        communityModel.findByIdentifier.mockResolvedValue(null);

        await communityController.getCommunityMembers(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "Community not found or inactive",
            404
        );
    });

    it("should apply role filter if provided", async () => {
        req.query.role = "moderator";

        await communityController.getCommunityMembers(req, res, next);

        expect(communityModel.getMembers).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                role: "moderator",
            })
        );
        expect(communityModel.countMembers).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                role: "moderator",
            })
        );
    });
});
