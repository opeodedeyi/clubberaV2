// src/community/controllers/community.controller.js

const communityModel = require("../models/community.model");
const locationModel = require("../models/location.model");
const imageModel = require("../models/image.model");
const tagModel = require("../models/tag.model");
const subscriptionModel = require("../models/subscription.model");
const restrictionModel = require("../models/restriction.model");
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

function generateUniqueUrl(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

// Simple hash function to generate numeric ID for advisory locks
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

class CommunityController {
    async createCommunity(req, res, next) {
        const client = await db.pool.connect();

        try {
            await client.query("BEGIN");

            const userId = req.user.id;
            const {
                name,
                location,
                tags,
                profile_image,
                cover_image,
                ...communityData
            } = req.body;

            // Generate unique URL with database-level locking to prevent race conditions
            let baseUrl = generateUniqueUrl(name);
            let uniqueUrl = baseUrl;
            let counter = 1;

            // Use advisory lock to prevent concurrent URL generation conflicts
            const lockId = Math.abs(hashCode(baseUrl));
            await client.query("SELECT pg_advisory_xact_lock($1)", [lockId]);

            // Check for existing URLs
            while (true) {
                const checkQuery = `
                    SELECT id FROM communities
                    WHERE unique_url = $1 AND is_active = true
                    LIMIT 1
                `;

                const result = await client.query(checkQuery, [uniqueUrl]);

                if (result.rows.length === 0) {
                    // URL is available
                    break;
                }

                // URL exists, try next variation
                uniqueUrl = `${baseUrl}-${counter}`;
                counter++;
            }

            communityData.name = name;
            communityData.unique_url = uniqueUrl;
            communityData.created_by = userId;

            // Create community within transaction
            const createQuery = `
                INSERT INTO communities
                    (name, unique_url, tagline, description, guidelines, is_private, created_by)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const communityResult = await client.query(createQuery, [
                communityData.name,
                communityData.unique_url,
                communityData.tagline || null,
                communityData.description || null,
                communityData.guidelines || null,
                communityData.is_private || false,
                communityData.created_by,
            ]);

            const community = communityResult.rows[0];

            // Add owner as member within transaction
            const addMemberQuery = `
                INSERT INTO community_members (community_id, user_id, role)
                VALUES ($1, $2, $3)
                RETURNING *
            `;

            await client.query(addMemberQuery, [community.id, userId, "owner"]);

            // Create free subscription within transaction
            const getPlanQuery = `
                SELECT id FROM subscription_plans WHERE code = 'free' LIMIT 1
            `;
            const planResult = await client.query(getPlanQuery);

            if (planResult.rows.length > 0) {
                const createSubQuery = `
                    INSERT INTO community_subscriptions
                        (community_id, plan_id, status, created_by)
                    VALUES ($1, $2, 'active', $3)
                    RETURNING *
                `;

                await client.query(createSubQuery, [
                    community.id,
                    planResult.rows[0].id,
                    userId,
                ]);
            }

            // Commit transaction - community is now created atomically
            await client.query("COMMIT");

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
                    // Log error but don't fail the creation
                    console.error("Error assigning tags:", tagError);
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
            await client.query("ROLLBACK");

            if (
                error.code === "23505" &&
                error.constraint === "communities_unique_url_key"
            ) {
                return next(new ApiError("Community URL already exists", 400));
            }
            next(error);
        } finally {
            client.release();
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

            console.log(req.user);

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
                // Check if there's already a pending request
                const existingRequest =
                    await communityModel.getJoinRequestByUser(
                        communityId,
                        userId
                    );

                if (existingRequest && existingRequest.status === "pending") {
                    return res.json({
                        status: "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {
                            membership_status: "pending",
                            community_id: parseInt(communityId),
                            user_id: userId,
                            request: existingRequest,
                        },
                    });
                }

                const joinRequest = await communityModel.createJoinRequest({
                    community_id: communityId,
                    user_id: userId,
                    message: req.body.message,
                });

                // Send notification to community owners and organizers (only for new requests)
                try {
                    const NotificationService = require("../../notification/services/notification.service");
                    await NotificationService.notifyJoinRequest({
                        userId: userId,
                        communityId: communityId,
                        communityName: community.name,
                        requesterName: req.user.fullName || req.user.full_name,
                    });
                } catch (error) {
                    console.error(
                        "Error sending join request notification:",
                        error
                    );
                    // Don't fail the request if notification fails
                }

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

            // Send notification to community owners and organizers
            try {
                const NotificationService = require("../../notification/services/notification.service");
                await NotificationService.notifyUserJoinedCommunity({
                    userId: userId,
                    userName: req.user.fullName || req.user.full_name,
                    communityId: communityId,
                    communityName: community.name,
                });
            } catch (error) {
                console.error(
                    "Error sending user joined community notification:",
                    error
                );
                // Don't fail the request if notification fails
            }

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

            const communityId = parseInt(req.params.id);
            const userId = req.user.id;

            // Check if community exists
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Check if user has permission to view join requests (owner, organizer, moderator)
            const isAdmin = await communityModel.checkMemberRole(
                communityId,
                userId,
                ["owner", "organizer", "moderator"]
            );

            if (!isAdmin) {
                return next(
                    new ApiError(
                        "You don't have permission to view join requests",
                        403
                    )
                );
            }

            // Get join requests with pagination
            const options = {
                limit: parseInt(req.query.limit) || 20,
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

            const canRespond = await communityModel.checkMemberRole(
                communityId,
                userId,
                ["owner", "organizer"]
            );

            if (!canRespond) {
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

                // Send approval notification to the requester
                try {
                    const NotificationService = require("../../notification/services/notification.service");
                    await NotificationService.notifyJoinRequestResponse({
                        userId: updatedRequest.user_id,
                        communityId: communityId,
                        communityName: community.name,
                        approved: true,
                    });
                } catch (error) {
                    console.error(
                        "Error sending join request approval notification:",
                        error
                    );
                    // Don't fail the request if notification fails
                }

                res.json({
                    status: "success",
                    message:
                        "Join request approved and user added to community",
                    data: updatedRequest,
                });
            } else {
                // Send rejection notification to the requester
                try {
                    const NotificationService = require("../../notification/services/notification.service");
                    await NotificationService.notifyJoinRequestResponse({
                        userId: updatedRequest.user_id,
                        communityId: communityId,
                        communityName: community.name,
                        approved: false,
                    });
                } catch (error) {
                    console.error(
                        "Error sending join request rejection notification:",
                        error
                    );
                    // Don't fail the request if notification fails
                }

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

    async getCommunityMembers(req, res, next) {
        try {
            const communityId = parseInt(req.params.id);
            const { limit = 20, offset = 0, role } = req.query;

            // Check if community exists
            const community = await communityModel.findByIdentifier(
                communityId
            );
            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Get members with pagination
            const options = {
                limit: parseInt(limit),
                offset: parseInt(offset),
                role: role, // Optional filter by role
            };

            const [members, total] = await Promise.all([
                communityModel.getMembers(communityId, options),
                communityModel.countMembers(communityId, { role }),
            ]);

            res.json({
                status: "success",
                data: members,
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

    async getCommunityDetails(req, res, next) {
        try {
            const identifier = req.params.identifier;
            const userId = req.user?.id; // Optional chaining for unauthenticated users

            // Try to find community by ID or unique URL
            let community;
            if (!isNaN(identifier)) {
                community = await communityModel.findByIdentifier(
                    parseInt(identifier)
                );
            } else {
                community = await communityModel.findByIdentifier(identifier);
            }

            if (!community) {
                return next(
                    new ApiError("Community not found or inactive", 404)
                );
            }

            // Initialize response with all possible fields set to null
            const response = {
                id: community.id,
                name: community.name,
                uniqueUrl: community.unique_url,
                tagline: community.tagline || null,
                description: community.description || null,
                guidelines: community.guidelines || null,
                isPrivate: community.is_private,
                isActive: community.is_active,
                createdAt: community.created_at,
                updatedAt: community.updated_at,
                profileImage: null,
                coverImage: null,
                location: null,
                tags: [],
                memberCount: 0,
                subscription: {
                    plan: "free",
                    status: "inactive",
                    isPro: false,
                },
                user: null,
            };

            // Try to get profile image (handle if not exists)
            try {
                const profileImage = await imageModel.getProfileImage(
                    community.id
                );
                if (profileImage) {
                    response.profileImage = profileImage;
                }
            } catch (error) {
                console.error("Error fetching profile image:", error);
            }

            // Try to get cover image (handle if not exists)
            try {
                const coverImage = await imageModel.getCoverImage(community.id);
                if (coverImage) {
                    response.coverImage = coverImage;
                }
            } catch (error) {
                console.error("Error fetching cover image:", error);
            }

            // Try to get location (handle if not exists)
            try {
                const location = await locationModel.findByCommunity(
                    community.id
                );
                if (location) {
                    response.location = location;
                }
            } catch (error) {
                console.error("Error fetching location:", error);
            }

            // Try to get tags (handle if not exists)
            try {
                const tags = await tagModel.getCommunityTags(community.id);
                if (tags && tags.length > 0) {
                    response.tags = tags.map((tag) => tag.name);
                }
            } catch (error) {
                console.error("Error fetching tags:", error);
            }

            // Try to get member count
            try {
                const memberCount = await communityModel.countMembers(
                    community.id
                );
                if (memberCount !== null && memberCount !== undefined) {
                    response.memberCount = memberCount;
                }
            } catch (error) {
                console.error("Error fetching member count:", error);
            }

            // Try to get subscription details
            try {
                const subscription =
                    await subscriptionModel.getByCommunitySummary(community.id);
                if (subscription) {
                    response.subscription = {
                        plan: subscription.plan_code || "free",
                        status: subscription.status || "inactive",
                        isPro: subscription.plan_code !== "free",
                    };
                }
            } catch (error) {
                console.error("Error fetching subscription:", error);
            }

            // If user is authenticated, check relationship with community
            if (userId) {
                // Initialize user relationship
                const userRelationship = {
                    isMember: false,
                    isAdmin: false,
                    membershipDetails: null,
                    activeRestrictions: null,
                    joinRequestStatus: null, // 'pending', 'approved', 'rejected', or null
                    joinRequestId: null,
                    joinRequestDate: null,
                };

                // Check if user is a member and get role
                try {
                    // We need to create this method in the community model
                    const membership = await communityModel.getMember(
                        community.id,
                        userId
                    );
                    if (membership) {
                        userRelationship.isMember = true;
                        userRelationship.membershipDetails = membership;

                        // Check if user is an admin (owner, organizer, or moderator)
                        const adminRoles = ["owner", "organizer", "moderator"];
                        userRelationship.isAdmin = adminRoles.includes(
                            membership.role
                        );
                    }
                } catch (error) {
                    console.error("Error checking membership:", error);
                }

                // Check for any active restrictions
                try {
                    // Using your existing restriction model
                    const activeRestrictions =
                        await restrictionModel.getActiveRestrictions(
                            community.id,
                            userId
                        );
                    if (activeRestrictions && activeRestrictions.length > 0) {
                        userRelationship.activeRestrictions =
                            activeRestrictions;
                    }
                } catch (error) {
                    console.error("Error checking restrictions:", error);
                }

                if (community.is_private && !userRelationship.isMember) {
                    try {
                        const existingRequest =
                            await communityModel.getJoinRequestByUser(
                                community.id,
                                userId
                            );
                        if (existingRequest) {
                            userRelationship.joinRequestStatus =
                                existingRequest.status;
                            userRelationship.joinRequestId = existingRequest.id;
                            userRelationship.joinRequestDate =
                                existingRequest.created_at;
                        } else {
                            userRelationship.joinRequestStatus = null;
                        }
                    } catch (error) {
                        console.error("Error checking join request:", error);
                        userRelationship.joinRequestStatus = null;
                    }
                }

                response.user = userRelationship;
            }

            res.json({
                status: "success",
                data: response,
            });
        } catch (error) {
            next(error);
        }
    }

    async checkUserPermissions(req, res, next) {
        try {
            const communityId = parseInt(req.params.id);
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

            // Check if user is a member
            const membership = await communityModel.getMember(
                communityId,
                userId
            );

            if (!membership) {
                return res.json({
                    status: "success",
                    data: {
                        isMember: false,
                        isOwner: false,
                        isOrganizer: false,
                        isAdmin: false,
                        canCreateEvents: false,
                        canEditCommunity: false,
                        canManageMembers: false,
                        canViewAnalytics: false,
                        role: null,
                    },
                });
            }

            // Determine permissions based on role
            const role = membership.role;
            const isOwner = role === "owner";
            const isOrganizer = role === "organizer";
            const isModerator = role === "moderator";
            const isAdmin = isOwner || isOrganizer || isModerator;

            // Define specific permissions
            const permissions = {
                isMember: true,
                isOwner,
                isOrganizer,
                isModerator,
                isAdmin,
                role,
                // Specific action permissions
                canCreateEvents: isOwner || isOrganizer,
                canEditCommunity: isOwner || isOrganizer,
                canManageMembers: isOwner || isOrganizer || isModerator,
                canViewAnalytics: isOwner || isOrganizer,
                canManageRoles: isOwner || isOrganizer,
                canDeleteCommunity: isOwner,
                canTransferOwnership: isOwner,
                canManageSubscription: isOwner,
            };

            res.json({
                status: "success",
                data: permissions,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CommunityController();
