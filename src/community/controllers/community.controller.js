// src/community/controllers/community.controller.js

const communityModel = require("../models/community.model");
const locationModel = require("../models/location.model");
const imageModel = require("../models/image.model");
const tagModel = require("../models/tag.model");
const subscriptionModel = require("../models/subscription.model");
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

class CommunityController {
    async createCommunity(req, res, next) {
        try {
            const userId = req.user.id;
            const {
                location,
                tags,
                profile_image,
                cover_image,
                ...communityData
            } = req.body;

            communityData.created_by = userId;

            const operations = [
                communityModel.create({
                    ...communityData,
                    useTransaction: true,
                }),
            ];

            const results = await db.executeTransaction(operations);
            const community = results[0].rows[0];

            await communityModel.addMember({
                community_id: community.id,
                user_id: userId,
                role: "owner",
            });

            await subscriptionModel.createFreeSubscription(
                community.id,
                userId
            );

            let locationData = null;
            if (location && (location.city || (location.lat && location.lng))) {
                locationData = await locationModel.create({
                    community_id: community.id,
                    name: location.city || null,
                    lat: location.lat || null,
                    lng: location.lng || null,
                    address: location.address || null,
                });
            }

            let tagsData = [];
            if (tags && tags.length > 0) {
                try {
                    for (const tagName of tags) {
                        await tagModel.assignTagByName({
                            community_id: community.id,
                            tag_name: tagName,
                        });
                    }
                    tagsData = await tagModel.getCommunityTags(community.id);
                } catch (tagError) {
                    return next(
                        new ApiError(
                            `Error with tags: ${tagError.message}`,
                            400
                        )
                    );
                }
            }

            let profileImageData = null;
            if (profile_image) {
                profileImageData = await imageModel.create({
                    entity_id: community.id,
                    image_type: "profile",
                    provider: profile_image.provider,
                    key: profile_image.key,
                    alt_text: profile_image.alt_text || null,
                });
            }

            let coverImageData = null;
            if (cover_image) {
                coverImageData = await imageModel.create({
                    entity_id: community.id,
                    image_type: "banner",
                    provider: cover_image.provider,
                    key: cover_image.key,
                    alt_text: cover_image.alt_text || null,
                });
            }

            // Get subscription details
            const subscription = await subscriptionModel.getByCommunitySummary(
                community.id
            );

            const completeData = {
                ...community,
                location: locationData,
                tags: tagsData,
                profile_image: profileImageData,
                cover_image: coverImageData,
                subscription: subscription,
            };

            res.status(201).json({
                status: "success",
                data: completeData,
            });
        } catch (error) {
            if (
                error.code === "23505" &&
                error.constraint === "communities_unique_url_key"
            ) {
                return next(new ApiError("Community URL already exists", 400));
            }
            next(error);
        }
    }

    async deactivateCommunity(req, res, next) {
        try {
            const communityId = req.params.id;
            const userId = req.user.id;

            // Check if community exists
            const community = await communityModel.findByIdentifier(
                communityId,
                true
            );
            if (!community) {
                return next(new ApiError("Community not found", 404));
            }

            // Check if user is the owner
            const isOwner = await communityModel.checkMemberRole(
                communityId,
                userId,
                "owner"
            );
            if (!isOwner) {
                return next(
                    new ApiError(
                        "Only the community owner can deactivate it",
                        403
                    )
                );
            }

            const deactivatedCommunity = await communityModel.deactivate(
                communityId
            );

            res.json({
                status: "success",
                message: "Community deactivated successfully",
                data: {
                    id: deactivatedCommunity.id,
                    name: deactivatedCommunity.name,
                    is_active: deactivatedCommunity.is_active,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async reactivateCommunity(req, res, next) {
        try {
            const communityId = req.params.id;
            const userId = req.user.id;

            const community = await communityModel.findByIdentifier(
                communityId,
                true
            );
            if (!community) {
                return next(new ApiError("Community not found", 404));
            }

            const isOwner = await communityModel.checkMemberRole(
                communityId,
                userId,
                "owner"
            );
            const isSuperuser = req.user.role === "superuser";

            if (!isOwner && !isSuperuser) {
                return next(
                    new ApiError(
                        "Only the community owner or administrators can reactivate it",
                        403
                    )
                );
            }

            const reactivatedCommunity = await communityModel.reactivate(
                communityId
            );

            res.json({
                status: "success",
                message: "Community reactivated successfully",
                data: {
                    id: reactivatedCommunity.id,
                    name: reactivatedCommunity.name,
                    is_active: reactivatedCommunity.is_active,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteCommunity(req, res, next) {
        try {
            const communityId = req.params.id;

            if (req.user.role !== "superuser") {
                return next(
                    new ApiError(
                        "Only administrators can permanently delete communities",
                        403
                    )
                );
            }

            const community = await communityModel.findByIdentifier(
                communityId,
                true
            );
            if (!community) {
                return next(new ApiError("Community not found", 404));
            }

            await communityModel.delete(communityId);

            res.json({
                status: "success",
                message: "Community permanently deleted",
            });
        } catch (error) {
            next(error);
        }
    }

    async joinCommunity(req, res, next) {
        try {
            // Check if user exists in the request
            if (!req.user) {
                return next(new ApiError("Authentication required", 401));
            }

            const communityId = req.params.id;
            const userId = req.user.id;

            // Check if community exists and is active
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if user is already a member
            const isMember = await communityModel.checkMemberRole(
                communityId,
                userId,
                ["owner", "organizer", "moderator", "member"]
            );

            if (isMember) {
                return next(
                    new ApiError(
                        "You are already a member of this community",
                        400
                    )
                );
            }

            // Check if user is banned
            const activeBan = await communityModel.checkActiveBan(
                communityId,
                userId
            );
            if (activeBan) {
                return next(
                    new ApiError("You are banned from this community", 403)
                );
            }

            // For private communities, create a join request
            if (community.is_private) {
                const joinRequest = await communityModel.createJoinRequest({
                    community_id: communityId,
                    user_id: userId,
                    message: req.body.message,
                });

                return res.json({
                    status: "success",
                    message: "Join request sent successfully",
                    data: {
                        membership_status: "pending",
                        community_id: parseInt(communityId),
                        user_id: userId,
                        request: joinRequest,
                    },
                });
            }

            // For public communities, join directly
            const membership = await communityModel.addMember({
                community_id: communityId,
                user_id: userId,
            });

            res.json({
                status: "success",
                message: "Successfully joined community",
                data: {
                    membership_status: "active",
                    community_id: parseInt(communityId),
                    user_id: userId,
                    membership: membership,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async leaveCommunity(req, res, next) {
        try {
            if (!req.user) {
                return next(new ApiError("Authentication required", 401));
            }

            const communityId = req.params.id;
            const userId = req.user.id;

            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            const isOwner = await communityModel.checkMemberRole(
                communityId,
                userId,
                "owner"
            );
            if (isOwner) {
                return next(
                    new ApiError(
                        "Owners cannot leave. Transfer ownership first",
                        400
                    )
                );
            }

            const isMember = await communityModel.checkMemberRole(
                communityId,
                userId,
                ["owner", "organizer", "moderator", "member"]
            );

            if (!isMember) {
                return next(
                    new ApiError("You are not a member of this community", 400)
                );
            }

            await communityModel.removeMember(communityId, userId);

            res.json({
                status: "success",
                message: "Successfully left community",
            });
        } catch (error) {
            next(error);
        }
    }

    async getJoinRequests(req, res, next) {
        try {
            if (!req.user) {
                return next(new ApiError("Authentication required", 401));
            }

            const communityId = req.params.id;
            const userId = req.user.id;

            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            const isAdmin = await communityModel.checkMemberRole(
                communityId,
                userId,
                ["owner", "organizer", "moderator"]
            );

            if (!isAdmin) {
                return next(
                    new ApiError(
                        "You do not have permission to view join requests",
                        403
                    )
                );
            }

            const options = {
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0,
            };

            const [requests, total] = await Promise.all([
                communityModel.getJoinRequests(communityId, options),
                communityModel.countJoinRequests(communityId),
            ]);

            res.json({
                status: "success",
                data: requests,
                pagination: {
                    total,
                    limit: options.limit,
                    offset: options.offset,
                    hasMore: total > options.offset + options.limit,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async respondToJoinRequest(req, res, next) {
        try {
            if (!req.user) {
                return next(new ApiError("Authentication required", 401));
            }

            const communityId = req.params.id;
            const requestId = req.params.requestId;
            const userId = req.user.id;
            const { status } = req.body;

            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            const isAdmin = await communityModel.checkMemberRole(
                communityId,
                userId,
                ["owner", "organizer", "moderator"]
            );

            if (!isAdmin) {
                return next(
                    new ApiError(
                        "You do not have permission to respond to join requests",
                        403
                    )
                );
            }

            const updatedRequest = await communityModel.respondToJoinRequest(
                requestId,
                {
                    status,
                    responded_by: userId,
                }
            );

            if (!updatedRequest) {
                return next(
                    new ApiError(
                        "Join request not found or already processed",
                        404
                    )
                );
            }

            if (status === "approved") {
                await communityModel.addMember({
                    community_id: communityId,
                    user_id: updatedRequest.user_id,
                });

                res.json({
                    status: "success",
                    message:
                        "Join request approved and user added to community",
                    data: updatedRequest,
                });
            } else {
                res.json({
                    status: "success",
                    message: "Join request rejected",
                    data: updatedRequest,
                });
            }
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CommunityController();
