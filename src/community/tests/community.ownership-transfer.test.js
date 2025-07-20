const communityAdminController = require("../controllers/communityAdmin.controller");
const communityModel = require("../models/community.model");
const communityAdminModel = require("../models/communityAdmin.model");
const subscriptionModel = require("../models/subscription.model");
const userModel = require("../models/user.model");
const AuthService = require("../services/auth.service");
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

describe("CommunityAdminController - Ownership Transfer", () => {
    const originalEnv = process.env;

    beforeAll(() => {
        process.env.FRONTEND_URL = "https://example.com";
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("initiateOwnershipTransfer", () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                params: {
                    communityId: 1,
                },
                body: {
                    targetUserId: 2,
                    password: "correctPassword",
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
            subscriptionModel.getByCommunitySummary.mockResolvedValue({
                plan_code: "pro_monthly",
            });
            userModel.findById.mockImplementation((userId) => {
                if (userId === 3) {
                    return Promise.resolve({
                        id: 3,
                        email: "owner@example.com",
                        full_name: "Current Owner",
                        password_hash: "hashedpw",
                    });
                } else {
                    return Promise.resolve({
                        id: 2,
                        email: "target@example.com",
                        full_name: "Target User",
                    });
                }
            });
            AuthService.verifyPassword = jest.fn().mockResolvedValue(true);
            communityAdminModel.getPendingOwnershipTransfer.mockResolvedValue(
                null
            );
            communityAdminModel.createOwnershipTransfer.mockResolvedValue({
                id: 1,
                community_id: 1,
                current_owner_id: 3,
                target_user_id: 2,
                status: "pending",
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
            });
            communityAdminModel.createAuditLog.mockResolvedValue({});
            emailService.sendOwnershipTransferInitiatedEmail = jest
                .fn()
                .mockResolvedValue(true);
            emailService.sendOwnershipTransferOfferEmail = jest
                .fn()
                .mockResolvedValue(true);
        });

        it("should initiate ownership transfer successfully", async () => {
            await communityAdminController.initiateOwnershipTransfer(
                req,
                res,
                next
            );

            expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(
                1,
                3,
                "owner"
            );
            expect(
                subscriptionModel.getByCommunitySummary
            ).toHaveBeenCalledWith(1);
            expect(AuthService.verifyPassword).toHaveBeenCalled();
            expect(
                communityAdminModel.createOwnershipTransfer
            ).toHaveBeenCalled();
            expect(communityAdminModel.createAuditLog).toHaveBeenCalled();
            expect(
                emailService.sendOwnershipTransferInitiatedEmail
            ).toHaveBeenCalledTimes(1);
            expect(
                emailService.sendOwnershipTransferOfferEmail
            ).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: "Ownership transfer initiated successfully",
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 404 if community not found", async () => {
            communityModel.findByIdentifier.mockResolvedValue(null);

            await communityAdminController.initiateOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Community not found or inactive",
                404
            );
        });

        it("should return 403 if user is not the owner", async () => {
            communityModel.checkMemberRole.mockResolvedValue(false);

            await communityAdminController.initiateOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only the community owner can transfer ownership",
                403
            );
        });

        it("should return 403 if not a Pro subscription", async () => {
            subscriptionModel.getByCommunitySummary.mockResolvedValue({
                plan_code: "free",
            });

            await communityAdminController.initiateOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This feature requires a Pro subscription",
                403
            );
        });

        it("should return 401 if password is incorrect", async () => {
            AuthService.verifyPassword.mockResolvedValue(false);

            await communityAdminController.initiateOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith("Incorrect password", 401);
        });

        it("should return 400 if there's already a pending transfer", async () => {
            communityAdminModel.getPendingOwnershipTransfer.mockResolvedValue({
                id: 5,
                status: "pending",
            });

            await communityAdminController.initiateOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "There is already a pending ownership transfer for this community",
                400
            );
        });
    });

    describe("respondToOwnershipTransfer", () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                params: {
                    transferId: 1,
                },
                body: {
                    action: "accept",
                },
                user: {
                    id: 2, // target user
                },
            };
            res = {
                json: jest.fn(),
            };
            next = jest.fn();

            // Reset mocks
            jest.clearAllMocks();

            // Default successful mock implementations
            const expires = new Date();
            expires.setHours(expires.getHours() + 24);

            communityAdminModel.getOwnershipTransfer.mockResolvedValue({
                id: 1,
                community_id: 1,
                community_name: "Test Community",
                community_url: "test-community",
                current_owner_id: 3,
                current_owner_name: "Current Owner",
                current_owner_email: "owner@example.com",
                target_user_id: 2,
                target_user_name: "Target User",
                target_user_email: "target@example.com",
                status: "pending",
                expires_at: expires,
            });

            communityAdminModel.executeOwnershipTransfer.mockResolvedValue({
                transferId: 1,
                communityId: 1,
                communityName: "Test Community",
                previousOwnerId: 3,
                previousOwnerName: "Current Owner",
                previousOwnerEmail: "owner@example.com",
                newOwnerId: 2,
                newOwnerName: "Target User",
                newOwnerEmail: "target@example.com",
                status: "accepted",
            });

            communityAdminModel.updateOwnershipTransferStatus.mockResolvedValue(
                {
                    id: 1,
                    status: "rejected",
                }
            );

            communityAdminModel.createAuditLog.mockResolvedValue({});
            emailService.sendOwnershipTransferCompletedEmail = jest
                .fn()
                .mockResolvedValue(true);
            emailService.sendOwnershipConfirmationEmail = jest
                .fn()
                .mockResolvedValue(true);
            emailService.sendOwnershipTransferRejectedEmail = jest
                .fn()
                .mockResolvedValue(true);
            emailService.sendOwnershipTransferCanceledEmail = jest
                .fn()
                .mockResolvedValue(true);
        });

        it("should accept ownership transfer successfully", async () => {
            await communityAdminController.respondToOwnershipTransfer(
                req,
                res,
                next
            );

            expect(
                communityAdminModel.getOwnershipTransfer
            ).toHaveBeenCalledWith(1);
            expect(
                communityAdminModel.executeOwnershipTransfer
            ).toHaveBeenCalledWith(1);
            expect(
                emailService.sendOwnershipTransferCompletedEmail
            ).toHaveBeenCalledTimes(1);
            expect(
                emailService.sendOwnershipConfirmationEmail
            ).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: "Ownership transfer completed successfully",
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it("should reject ownership transfer successfully", async () => {
            req.body.action = "reject";

            await communityAdminController.respondToOwnershipTransfer(
                req,
                res,
                next
            );

            expect(
                communityAdminModel.getOwnershipTransfer
            ).toHaveBeenCalledWith(1);
            expect(
                communityAdminModel.updateOwnershipTransferStatus
            ).toHaveBeenCalledWith(1, "rejected");
            expect(communityAdminModel.createAuditLog).toHaveBeenCalled();
            expect(
                emailService.sendOwnershipTransferRejectedEmail
            ).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: "Ownership transfer rejected successfully",
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it("should cancel ownership transfer successfully", async () => {
            req.body.action = "cancel";
            req.user.id = 3; // switch to owner

            await communityAdminController.respondToOwnershipTransfer(
                req,
                res,
                next
            );

            expect(
                communityAdminModel.getOwnershipTransfer
            ).toHaveBeenCalledWith(1);
            expect(
                communityAdminModel.updateOwnershipTransferStatus
            ).toHaveBeenCalledWith(1, "canceled");
            expect(communityAdminModel.createAuditLog).toHaveBeenCalled();
            expect(
                emailService.sendOwnershipTransferCanceledEmail
            ).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: "Ownership transfer canceled successfully",
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 404 if transfer not found", async () => {
            communityAdminModel.getOwnershipTransfer.mockResolvedValue(null);

            await communityAdminController.respondToOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Transfer request not found",
                404
            );
        });

        it("should return 400 if transfer already processed", async () => {
            communityAdminModel.getOwnershipTransfer.mockResolvedValue({
                id: 1,
                status: "accepted",
            });

            await communityAdminController.respondToOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This transfer has already been accepted",
                400
            );
        });

        it("should return 400 if transfer expired", async () => {
            const expired = new Date();
            expired.setDate(expired.getDate() - 1);

            communityAdminModel.getOwnershipTransfer.mockResolvedValue({
                id: 1,
                status: "pending",
                expires_at: expired,
            });

            await communityAdminController.respondToOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This transfer request has expired",
                400
            );
        });

        it("should return 403 if wrong user tries to accept", async () => {
            req.user.id = 999; // some other user

            await communityAdminController.respondToOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only the designated user can accept or reject this transfer",
                403
            );
        });

        it("should return 403 if wrong user tries to cancel", async () => {
            req.body.action = "cancel";
            req.user.id = 999; // not the owner

            await communityAdminController.respondToOwnershipTransfer(
                req,
                res,
                next
            );

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only the current owner can cancel this transfer",
                403
            );
        });
    });
});
