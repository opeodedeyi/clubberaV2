// src/community/controllers/restriction.controller.js

const communityModel = require("../models/community.model");
const restrictionModel = require("../models/restriction.model");
const ApiError = require("../../utils/ApiError");

class RestrictionController {
    async restrictMember(req, res, next) {
        try {
            const communityId = req.params.id;
            const targetUserId = req.params.userId;
            const adminUserId = req.user.id;
            const { type, reason, expires_at } = req.body;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if admin has permission
            const isAdmin = await communityModel.checkMemberRole(
                communityId,
                adminUserId,
                ["owner", "organizer", "moderator"]
            );

            if (!isAdmin) {
                return next(
                    new ApiError(
                        "You do not have permission to restrict members",
                        403
                    )
                );
            }

            // Check if target user is a member
            const targetIsMember = await communityModel.checkMemberRole(
                communityId,
                targetUserId,
                ["owner", "organizer", "moderator", "member"]
            );

            if (!targetIsMember) {
                return next(
                    new ApiError("User is not a member of this community", 404)
                );
            }

            // Check if target is an owner
            const targetIsOwner = await communityModel.checkMemberRole(
                communityId,
                targetUserId,
                "owner"
            );
            if (targetIsOwner) {
                return next(
                    new ApiError("Cannot restrict the community owner", 403)
                );
            }

            // Check admin roles if target is an organizer or moderator
            const targetIsOrganizer = await communityModel.checkMemberRole(
                communityId,
                targetUserId,
                "organizer"
            );
            const targetIsModerator = await communityModel.checkMemberRole(
                communityId,
                targetUserId,
                "moderator"
            );
            const adminIsOwner = await communityModel.checkMemberRole(
                communityId,
                adminUserId,
                "owner"
            );
            const adminIsOrganizer = await communityModel.checkMemberRole(
                communityId,
                adminUserId,
                "organizer"
            );

            if (targetIsOrganizer && !adminIsOwner) {
                return next(
                    new ApiError("Only owners can restrict organizers", 403)
                );
            }

            if (targetIsModerator && !adminIsOwner && !adminIsOrganizer) {
                return next(
                    new ApiError(
                        "Only owners and organizers can restrict moderators",
                        403
                    )
                );
            }

            // Parse expiration date if provided
            let expirationDate = null;
            if (expires_at) {
                expirationDate = new Date(expires_at);
                if (isNaN(expirationDate.getTime())) {
                    return next(
                        new ApiError("Invalid expiration date format", 400)
                    );
                }

                // Ensure expiration is in the future
                if (expirationDate <= new Date()) {
                    return next(
                        new ApiError(
                            "Expiration date must be in the future",
                            400
                        )
                    );
                }
            }

            // Create restriction
            const restriction = await restrictionModel.createRestriction({
                community_id: communityId,
                user_id: targetUserId,
                type,
                reason,
                applied_by: adminUserId,
                expires_at: expirationDate,
            });

            // If ban, remove from community
            if (type === "ban") {
                await communityModel.removeMember(communityId, targetUserId);
            }

            res.status(200).json({
                status: "success",
                message: `User ${
                    type === "ban" ? "banned" : "muted"
                } successfully`,
                data: {
                    restriction,
                    expires_at: expirationDate
                        ? expirationDate.toISOString()
                        : null,
                    is_permanent: expirationDate === null,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getMemberRestrictions(req, res, next) {
        try {
            const communityId = req.params.id;
            const targetUserId = req.params.userId;
            const adminUserId = req.user.id;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if admin has permission
            const isAdmin = await communityModel.checkMemberRole(
                communityId,
                adminUserId,
                ["owner", "organizer", "moderator"]
            );

            if (!isAdmin) {
                return next(
                    new ApiError(
                        "You do not have permission to view restrictions",
                        403
                    )
                );
            }

            // Get all restrictions
            const restrictions = await restrictionModel.getUserRestrictions(
                communityId,
                targetUserId
            );

            // Add additional information to each restriction
            const enhancedRestrictions = restrictions.map((restriction) => {
                const expiresAt = restriction.expires_at;
                const now = new Date();

                return {
                    ...restriction,
                    is_active: !expiresAt || new Date(expiresAt) > now,
                    is_permanent: !expiresAt,
                    status: !expiresAt
                        ? "permanent"
                        : new Date(expiresAt) > now
                        ? "active"
                        : "expired",
                };
            });

            res.status(200).json({
                status: "success",
                data: enhancedRestrictions,
            });
        } catch (error) {
            next(error);
        }
    }

    async removeRestriction(req, res, next) {
        try {
            const communityId = req.params.id;
            const targetUserId = req.params.userId;
            const restrictionId = req.params.restrictionId;
            const adminUserId = req.user.id;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if admin has permission
            const isAdmin = await communityModel.checkMemberRole(
                communityId,
                adminUserId,
                ["owner", "organizer", "moderator"]
            );

            if (!isAdmin) {
                return next(
                    new ApiError(
                        "You do not have permission to manage restrictions",
                        403
                    )
                );
            }

            // Check if restriction exists and belongs to the right community and user
            const restriction = await restrictionModel.getRestrictionById(
                restrictionId
            );

            if (!restriction) {
                return next(new ApiError("Restriction not found", 404));
            }

            if (
                restriction.community_id !== parseInt(communityId) ||
                restriction.user_id !== parseInt(targetUserId)
            ) {
                return next(
                    new ApiError(
                        "Restriction does not match the specified community and user",
                        400
                    )
                );
            }

            // Check if already expired
            if (
                restriction.expires_at &&
                new Date(restriction.expires_at) <= new Date()
            ) {
                return next(
                    new ApiError("Restriction has already expired", 400)
                );
            }

            // Remove the restriction (set expiration to now)
            const updatedRestriction = await restrictionModel.removeRestriction(
                restrictionId
            );

            res.status(200).json({
                status: "success",
                message: "Restriction removed successfully",
                data: updatedRestriction,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RestrictionController();
