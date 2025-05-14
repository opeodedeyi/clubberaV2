// src/communitySupport/tests/supportPlan.test.js

const { validationResult } = require("express-validator");
const supportPlanController = require("../controllers/supportPlan.controller");
const supportPlanModel = require("../models/supportPlan.model");
const communityModel = require("../models/community.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("express-validator");
jest.mock("../models/supportPlan.model");
jest.mock("../models/community.model");
jest.mock("../../utils/ApiError");

describe("SupportPlanController", () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup request, response, and next function
        req = {
            params: {
                communityId: "1",
                planId: "2",
            },
            body: {
                name: "Test Support Plan",
                description: "This is a test support plan",
                monthlyPrice: 9.99,
                currency: "USD",
                benefits: "Access to exclusive content",
            },
            user: {
                id: 3,
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        // Default mock implementations
        validationResult.mockReturnValue({
            isEmpty: jest.fn().mockReturnValue(true),
            array: jest.fn().mockReturnValue([]),
        });

        communityModel.isUserCommunityOwner.mockResolvedValue(true);
        supportPlanModel.hasActivePlan.mockResolvedValue(false);

        supportPlanModel.createPlan.mockResolvedValue({
            id: 2,
            community_id: 1,
            name: "Test Support Plan",
            description: "This is a test support plan",
            monthly_price: 9.99,
            currency: "USD",
            benefits: "Access to exclusive content",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        });

        supportPlanModel.getPlanById.mockResolvedValue({
            id: 2,
            community_id: 1,
            name: "Test Support Plan",
            description: "This is a test support plan",
            monthly_price: 9.99,
            currency: "USD",
            benefits: "Access to exclusive content",
            is_active: true,
        });

        supportPlanModel.getPlanByCommunityId.mockResolvedValue({
            id: 2,
            community_id: 1,
            name: "Test Support Plan",
            description: "This is a test support plan",
            monthly_price: 9.99,
            currency: "USD",
            benefits: "Access to exclusive content",
            is_active: true,
        });

        supportPlanModel.updatePlan.mockResolvedValue({
            id: 2,
            community_id: 1,
            name: "Updated Plan",
            description: "Updated description",
            monthly_price: 19.99,
            currency: "USD",
            benefits: "Updated benefits",
            is_active: true,
        });

        supportPlanModel.deletePlan.mockResolvedValue(true);
    });

    describe("createPlan", () => {
        it("should create a support plan successfully", async () => {
            await supportPlanController.createPlan(req, res, next);

            expect(communityModel.isUserCommunityOwner).toHaveBeenCalledWith(
                3,
                1
            );
            expect(supportPlanModel.hasActivePlan).toHaveBeenCalledWith(1);
            expect(supportPlanModel.createPlan).toHaveBeenCalledWith({
                communityId: 1,
                name: "Test Support Plan",
                description: "This is a test support plan",
                monthlyPrice: 9.99,
                currency: "USD",
                benefits: "Access to exclusive content",
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.objectContaining({
                    id: 2,
                    community_id: 1,
                    name: "Test Support Plan",
                }),
            });
        });

        it("should handle validation errors", async () => {
            const validationError = { msg: "Monthly price is required" };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportPlanController.createPlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });

        it("should return 403 if user is not the community owner", async () => {
            communityModel.isUserCommunityOwner.mockResolvedValue(false);

            await supportPlanController.createPlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only community owners can create support plans",
                403
            );
        });

        it("should return 400 if community already has a support plan", async () => {
            supportPlanModel.hasActivePlan.mockResolvedValue(true);

            await supportPlanController.createPlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "This community already has an active support plan. Please update the existing plan.",
                400
            );
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            supportPlanModel.createPlan.mockRejectedValue(dbError);

            await supportPlanController.createPlan(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe("getPlan", () => {
        it("should get a community support plan successfully", async () => {
            await supportPlanController.getPlan(req, res, next);

            expect(supportPlanModel.getPlanByCommunityId).toHaveBeenCalledWith(
                1
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.objectContaining({
                    id: 2,
                    community_id: 1,
                    name: "Test Support Plan",
                }),
            });
        });

        it("should return 404 if no plan found", async () => {
            supportPlanModel.getPlanByCommunityId.mockResolvedValue(null);

            await supportPlanController.getPlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "No support plan found for this community",
                404
            );
        });

        it("should handle validation errors", async () => {
            const validationError = { msg: "Community ID must be an integer" };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportPlanController.getPlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            supportPlanModel.getPlanByCommunityId.mockRejectedValue(dbError);

            await supportPlanController.getPlan(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe("updatePlan", () => {
        beforeEach(() => {
            req.body = {
                name: "Updated Plan",
                description: "Updated description",
                monthlyPrice: 19.99,
                benefits: "Updated benefits",
            };
        });

        it("should update a support plan successfully", async () => {
            await supportPlanController.updatePlan(req, res, next);

            expect(communityModel.isUserCommunityOwner).toHaveBeenCalledWith(
                3,
                1
            );
            expect(supportPlanModel.getPlanById).toHaveBeenCalledWith(2);
            expect(supportPlanModel.updatePlan).toHaveBeenCalledWith(2, {
                name: "Updated Plan",
                description: "Updated description",
                monthly_price: 19.99,
                benefits: "Updated benefits",
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                data: expect.objectContaining({
                    id: 2,
                    name: "Updated Plan",
                    monthly_price: 19.99,
                }),
            });
        });

        it("should handle validation errors", async () => {
            const validationError = {
                msg: "Monthly price must be between $0.50 and $999.99",
            };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportPlanController.updatePlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });

        it("should return 403 if user is not the community owner", async () => {
            communityModel.isUserCommunityOwner.mockResolvedValue(false);

            await supportPlanController.updatePlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only community owners can update support plans",
                403
            );
        });

        it("should return 404 if plan not found", async () => {
            supportPlanModel.getPlanById.mockResolvedValue(null);

            await supportPlanController.updatePlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Support plan not found",
                404
            );
        });

        it("should return 404 if plan belongs to a different community", async () => {
            supportPlanModel.getPlanById.mockResolvedValue({
                id: 2,
                community_id: 999, // Different from request
                name: "Test Support Plan",
            });

            await supportPlanController.updatePlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Support plan not found",
                404
            );
        });

        it("should handle partial updates correctly", async () => {
            req.body = {
                name: "Updated Plan Name",
            };

            await supportPlanController.updatePlan(req, res, next);

            expect(supportPlanModel.updatePlan).toHaveBeenCalledWith(2, {
                name: "Updated Plan Name",
            });
        });

        it("should handle isActive flag updates", async () => {
            req.body = {
                isActive: false,
            };

            await supportPlanController.updatePlan(req, res, next);

            expect(supportPlanModel.updatePlan).toHaveBeenCalledWith(2, {
                is_active: false,
            });
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            supportPlanModel.updatePlan.mockRejectedValue(dbError);

            await supportPlanController.updatePlan(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe("deletePlan", () => {
        it("should delete a support plan successfully", async () => {
            await supportPlanController.deletePlan(req, res, next);

            expect(communityModel.isUserCommunityOwner).toHaveBeenCalledWith(
                3,
                1
            );
            expect(supportPlanModel.getPlanById).toHaveBeenCalledWith(2);
            expect(supportPlanModel.deletePlan).toHaveBeenCalledWith(2);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: "success",
                message: "Support plan deleted successfully",
            });
        });

        it("should handle validation errors", async () => {
            const validationError = { msg: "Plan ID must be an integer" };
            validationResult.mockReturnValue({
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([validationError]),
            });

            await supportPlanController.deletePlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(validationError.msg, 400);
        });

        it("should return 403 if user is not the community owner", async () => {
            communityModel.isUserCommunityOwner.mockResolvedValue(false);

            await supportPlanController.deletePlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Only community owners can delete support plans",
                403
            );
        });

        it("should return 404 if plan not found", async () => {
            supportPlanModel.getPlanById.mockResolvedValue(null);

            await supportPlanController.deletePlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Support plan not found",
                404
            );
        });

        it("should return 404 if plan belongs to a different community", async () => {
            supportPlanModel.getPlanById.mockResolvedValue({
                id: 2,
                community_id: 999, // Different from request
                name: "Test Support Plan",
            });

            await supportPlanController.deletePlan(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Support plan not found",
                404
            );
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database error");
            supportPlanModel.deletePlan.mockRejectedValue(dbError);

            await supportPlanController.deletePlan(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });
});
