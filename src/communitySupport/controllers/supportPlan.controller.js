// src/communitySupport/controllers/supportPlan.controller.js
const { validationResult } = require("express-validator");
const supportPlanModel = require("../models/supportPlan.model");
const communityModel = require("../models/community.model");
const ApiError = require("../../utils/ApiError");

class SupportPlanController {
    async createPlan(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const communityId = parseInt(req.params.communityId, 10);
            const userId = req.user.id;

            // Check if user is the community owner
            const isCommunityOwner = await communityModel.isUserCommunityOwner(
                userId,
                communityId
            );

            if (!isCommunityOwner) {
                return next(
                    new ApiError(
                        "Only community owners can create support plans",
                        403
                    )
                );
            }

            // Check if community already has a support plan
            const hasExistingPlan = await supportPlanModel.hasActivePlan(
                communityId
            );
            if (hasExistingPlan) {
                return next(
                    new ApiError(
                        "This community already has an active support plan. Please update the existing plan.",
                        400
                    )
                );
            }

            // Create plan
            const planData = {
                communityId,
                name: req.body.name,
                description: req.body.description,
                monthlyPrice: req.body.monthlyPrice,
                currency: req.body.currency || "USD",
                benefits: req.body.benefits,
            };

            const plan = await supportPlanModel.createPlan(planData);

            res.status(201).json({
                status: "success",
                data: plan,
            });
        } catch (error) {
            next(error);
        }
    }

    async getPlan(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const communityId = parseInt(req.params.communityId, 10);

            // Get plan
            const plan = await supportPlanModel.getPlanByCommunityId(
                communityId
            );

            if (!plan) {
                return next(
                    new ApiError(
                        "No support plan found for this community",
                        404
                    )
                );
            }

            res.status(200).json({
                status: "success",
                data: plan,
            });
        } catch (error) {
            next(error);
        }
    }

    async updatePlan(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const communityId = parseInt(req.params.communityId, 10);
            const planId = parseInt(req.params.planId, 10);
            const userId = req.user.id;

            // Check if user is the community owner
            const isCommunityOwner = await communityModel.isUserCommunityOwner(
                userId,
                communityId
            );

            if (!isCommunityOwner) {
                return next(
                    new ApiError(
                        "Only community owners can update support plans",
                        403
                    )
                );
            }

            // Check if plan exists and belongs to the community
            const existingPlan = await supportPlanModel.getPlanById(planId);
            if (!existingPlan || existingPlan.community_id !== communityId) {
                return next(new ApiError("Support plan not found", 404));
            }

            // Prepare update data with snake_case for DB
            const updateData = {};
            if (req.body.name !== undefined) updateData.name = req.body.name;
            if (req.body.description !== undefined)
                updateData.description = req.body.description;
            if (req.body.monthlyPrice !== undefined)
                updateData.monthly_price = req.body.monthlyPrice;
            if (req.body.currency !== undefined)
                updateData.currency = req.body.currency;
            if (req.body.isActive !== undefined)
                updateData.is_active = req.body.isActive;
            if (req.body.benefits !== undefined)
                updateData.benefits = req.body.benefits;

            // Update plan
            const updatedPlan = await supportPlanModel.updatePlan(
                planId,
                updateData
            );

            res.status(200).json({
                status: "success",
                data: updatedPlan,
            });
        } catch (error) {
            next(error);
        }
    }

    async deletePlan(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const communityId = parseInt(req.params.communityId, 10);
            const planId = parseInt(req.params.planId, 10);
            const userId = req.user.id;

            // Check if user is the community owner
            const isCommunityOwner = await communityModel.isUserCommunityOwner(
                userId,
                communityId
            );

            if (!isCommunityOwner) {
                return next(
                    new ApiError(
                        "Only community owners can delete support plans",
                        403
                    )
                );
            }

            // Check if plan exists and belongs to the community
            const existingPlan = await supportPlanModel.getPlanById(planId);
            if (!existingPlan || existingPlan.community_id !== communityId) {
                return next(new ApiError("Support plan not found", 404));
            }

            // Delete plan
            await supportPlanModel.deletePlan(planId);

            res.status(200).json({
                status: "success",
                message: "Support plan deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SupportPlanController();
