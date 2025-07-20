const communityAdminController = require("../controllers/communityAdmin.controller");
const communityModel = require("../models/community.model");
const communityAdminModel = require("../models/communityAdmin.model");
const subscriptionModel = require("../models/subscription.model");
const userModel = require("../models/user.model");
const emailService = require("../../services/email.service");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../models/communityAdmin.model");
jest.mock("../models/subscription.model");
jest.mock("../models/user.model");
jest.mock("../services/auth.service");
jest.mock("../../services/email.service");
jest.mock("../../utils/ApiError");

describe("CommunityAdminController - updateMemberRole", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                communityId: 1,
                userId: 2,
            },
            body: {
                role: "moderator",
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
        subscriptionModel.getByCommunitySummary.mockResolvedValue({
            plan_code: "pro_monthly",
        });
        communityModel.getMember = jest
            .fn()
            .mockImplementation((communityId, userId) => {
                if (userId === req.user.id) {
                    return Promise.resolve({ role: "owner" });
                } else {
                    return Promise.resolve({ role: "member" });
                }
            });
        communityAdminModel.updateMemberRole.mockResolvedValue({
            role: "moderator",
        });
        userModel.findById.mockResolvedValue({
            email: "user@example.com",
            full_name: "Test User",
        });
        emailService.sendRoleUpdateEmail = jest.fn().mockResolvedValue(true);
    });

    it("should update member role successfully", async () => {
        await communityAdminController.updateMemberRole(req, res, next);

        expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
        expect(subscriptionModel.getByCommunitySummary).toHaveBeenCalledWith(1);
        expect(communityModel.getMember).toHaveBeenCalledTimes(2);
        expect(communityAdminModel.updateMemberRole).toHaveBeenCalledWith(
            1,
            2,
            "moderator",
            3
        );
        expect(emailService.sendRoleUpdateEmail).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                message: "Member role updated successfully",
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 404 if community not found", async () => {
        communityModel.findByIdentifier.mockResolvedValue(null);

        await communityAdminController.updateMemberRole(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "Community not found or inactive",
            404
        );
    });

    it("should return 403 if not a Pro subscription", async () => {
        subscriptionModel.getByCommunitySummary.mockResolvedValue({
            plan_code: "free",
        });

        await communityAdminController.updateMemberRole(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "This feature requires a Pro subscription",
            403
        );
    });

    it("should return 403 if user is not an admin", async () => {
        communityModel.getMember.mockImplementation((communityId, userId) => {
            if (userId === req.user.id) {
                return Promise.resolve({ role: "member" });
            } else {
                return Promise.resolve({ role: "member" });
            }
        });

        await communityAdminController.updateMemberRole(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "You don't have permission to update roles",
            403
        );
    });

    it("should return 403 if organizer tries to promote to organizer", async () => {
        communityModel.getMember.mockImplementation((communityId, userId) => {
            if (userId === req.user.id) {
                return Promise.resolve({ role: "organizer" });
            } else {
                return Promise.resolve({ role: "member" });
            }
        });
        req.body.role = "organizer";

        await communityAdminController.updateMemberRole(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "You don't have permission to assign the organizer role",
            403
        );
    });

    it("should return 403 if user tries to change their own role", async () => {
        req.params.userId = req.user.id;

        await communityAdminController.updateMemberRole(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "You cannot change your own role",
            403
        );
    });
});
