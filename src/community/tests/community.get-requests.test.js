const communityController = require("../controllers/community.controller");
const communityModel = require("../models/community.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../../utils/ApiError");

describe("CommunityController - getJoinRequests", () => {
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

        communityModel.checkMemberRole.mockResolvedValue(true);

        communityModel.getJoinRequests.mockResolvedValue([
            {
                id: 101,
                userId: 5,
                communityId: 1,
                message: "I would like to join this community",
                status: "pending",
                createdAt: new Date("2023-02-01"),
                user: {
                    id: 5,
                    fullName: "Applicant One",
                    uniqueUrl: "applicant-one",
                    profileImage: {
                        provider: "local",
                        key: "applicant-profile.jpg",
                        altText: "Applicant profile",
                    },
                },
            },
            {
                id: 102,
                userId: 6,
                communityId: 1,
                message: "Please let me join",
                status: "pending",
                createdAt: new Date("2023-02-15"),
                user: {
                    id: 6,
                    fullName: "Applicant Two",
                    uniqueUrl: "applicant-two",
                    profileImage: null,
                },
            },
        ]);

        communityModel.countJoinRequests.mockResolvedValue(2);
    });

    it("should get join requests successfully", async () => {
        await communityController.getJoinRequests(req, res, next);

        expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
        expect(communityModel.checkMemberRole).toHaveBeenCalledWith(1, 3, [
            "owner",
            "organizer",
            "moderator",
        ]);
        expect(communityModel.getJoinRequests).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                limit: 20,
                offset: 0,
            })
        );
        expect(communityModel.countJoinRequests).toHaveBeenCalledWith(1);

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

        await communityController.getJoinRequests(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "Community not found or inactive",
            404
        );
    });

    it("should return 403 if user is not an admin", async () => {
        communityModel.checkMemberRole.mockResolvedValue(false);

        await communityController.getJoinRequests(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "You don't have permission to view join requests",
            403
        );
    });
});
