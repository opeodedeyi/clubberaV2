const communityModel = require("../models/community.model");
const communityAdminModel = require("../models/communityAdmin.model");
const subscriptionModel = require("../models/subscription.model");
const userModel = require("../models/user.model");
const AuthService = require("../services/auth.service");
const emailService = require("../../services/email.service");
const ApiError = require("../../utils/ApiError");

class CommunityAdminController {
    async updateMemberRole(req, res, next) {
        try {
            const communityId = parseInt(req.params.communityId);
            const targetUserId = parseInt(req.params.userId);
            const { role } = req.body;
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

            // Check subscription status
            const subscription = await subscriptionModel.getByCommunitySummary(
                communityId
            );
            if (!subscription || subscription.plan_code === "free") {
                return next(
                    new ApiError(
                        "This feature requires a Pro subscription",
                        403
                    )
                );
            }

            // Get the current user's role in the community
            const currentUserMember = await communityModel.getMember(
                communityId,
                userId
            );
            if (!currentUserMember) {
                return next(
                    new ApiError("You are not a member of this community", 403)
                );
            }

            const currentUserRole = currentUserMember.role;

            // Only owners and organizers can update roles
            if (
                currentUserRole !== "owner" &&
                currentUserRole !== "organizer"
            ) {
                return next(
                    new ApiError(
                        "You don't have permission to update roles",
                        403
                    )
                );
            }

            // Check role hierarchy permissions
            const canAssign = this._canAssignRole(currentUserRole, role);
            if (!canAssign) {
                return next(
                    new ApiError(
                        `You don't have permission to assign the ${role} role`,
                        403
                    )
                );
            }

            // Get target user's current role
            const targetUserMember = await communityModel.getMember(
                communityId,
                targetUserId
            );
            if (!targetUserMember) {
                return next(
                    new ApiError(
                        "Target user is not a member of this community",
                        404
                    )
                );
            }

            const targetUserRole = targetUserMember.role;

            // Prevent owners from being demoted by non-owners
            if (targetUserRole === "owner" && currentUserRole !== "owner") {
                return next(
                    new ApiError(
                        "Only the owner can change the owner's role",
                        403
                    )
                );
            }

            // Prevent changing your own role
            if (userId === targetUserId) {
                return next(
                    new ApiError("You cannot change your own role", 403)
                );
            }

            // Update the role
            const updatedMember = await communityAdminModel.updateMemberRole(
                communityId,
                targetUserId,
                role,
                userId
            );

            if (!updatedMember) {
                return next(new ApiError("Failed to update role", 500));
            }

            const targetUser = await userModel.findById(targetUserId);
            if (targetUser && targetUser.email) {
                await emailService.sendRoleUpdateEmail({
                    email: targetUser.email,
                    name: targetUser.full_name,
                    communityName: community.name,
                    previousRole: targetUserRole,
                    newRole: role,
                    communityUrl: community.unique_url,
                });
            }

            res.json({
                status: "success",
                message: "Member role updated successfully",
                data: {
                    communityId,
                    userId: targetUserId,
                    previousRole: targetUserRole,
                    newRole: role,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async initiateOwnershipTransfer(req, res, next) {
        try {
            const communityId = parseInt(req.params.communityId);
            const { targetUserId, password } = req.body;
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

            if (!isOwner) {
                return next(
                    new ApiError(
                        "Only the community owner can transfer ownership",
                        403
                    )
                );
            }

            // Check subscription status
            const subscription = await subscriptionModel.getByCommunitySummary(
                communityId
            );
            if (!subscription || subscription.plan_code === "free") {
                return next(
                    new ApiError(
                        "This feature requires a Pro subscription",
                        403
                    )
                );
            }

            // Verify password
            const user = await userModel.findById(userId);
            const passwordValid = await AuthService.verifyPassword(
                password,
                user.password_hash
            );

            if (!passwordValid) {
                return next(new ApiError("Incorrect password", 401));
            }

            // Check if target user exists
            const targetUser = await userModel.findById(targetUserId);
            if (!targetUser) {
                return next(new ApiError("Target user not found", 404));
            }

            // Check if target user is an organizer (already validated in middleware, but double-check)
            const isOrganizer = await communityModel.checkMemberRole(
                communityId,
                targetUserId,
                "organizer"
            );

            if (!isOrganizer) {
                return next(
                    new ApiError(
                        "Ownership can only be transferred to an organizer",
                        400
                    )
                );
            }

            // Check if there's already a pending transfer
            const pendingTransfer =
                await communityAdminModel.getPendingOwnershipTransfer(
                    communityId
                );
            if (pendingTransfer) {
                return next(
                    new ApiError(
                        "There is already a pending ownership transfer for this community",
                        400
                    )
                );
            }

            // Create the transfer record
            const transfer = await communityAdminModel.createOwnershipTransfer({
                community_id: communityId,
                current_owner_id: userId,
                target_user_id: targetUserId,
            });

            // Log the action
            await communityAdminModel.createAuditLog({
                community_id: communityId,
                user_id: userId,
                action_type: "ownership_transfer_initiated",
                previous_state: { owner_id: userId },
                new_state: { pending_owner_id: targetUserId },
                metadata: {
                    transfer_id: transfer.id,
                    community_name: community.name,
                    expires_at: transfer.expires_at,
                },
            });

            // Send email to current owner (confirmation)
            await emailService.sendOwnershipTransferInitiatedEmail({
                email: user.email,
                name: user.full_name,
                communityName: community.name,
                targetUserName: targetUser.full_name,
                expiresAt: transfer.expires_at,
                cancelUrl: `${process.env.FRONTEND_URL}/communities/${community.unique_url}/admin/transfer/${transfer.id}/cancel`,
                communityUrl: community.unique_url,
            });

            // Send email to target user (request)
            await emailService.sendOwnershipTransferOfferEmail({
                email: targetUser.email,
                name: targetUser.full_name,
                communityName: community.name,
                ownerName: user.full_name,
                expiresAt: transfer.expires_at,
                acceptUrl: `${process.env.FRONTEND_URL}/communities/${community.unique_url}/admin/transfer/${transfer.id}/accept`,
                rejectUrl: `${process.env.FRONTEND_URL}/communities/${community.unique_url}/admin/transfer/${transfer.id}/reject`,
                communityUrl: community.unique_url,
            });

            res.json({
                status: "success",
                message: "Ownership transfer initiated successfully",
                data: {
                    transferId: transfer.id,
                    communityId,
                    currentOwnerId: userId,
                    targetUserId,
                    expiresAt: transfer.expires_at,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async respondToOwnershipTransfer(req, res, next) {
        try {
            const transferId = parseInt(req.params.transferId);
            const { action } = req.body;
            const userId = req.user.id;

            // Get the transfer details
            const transfer = await communityAdminModel.getOwnershipTransfer(
                transferId
            );
            if (!transfer) {
                return next(new ApiError("Transfer request not found", 404));
            }

            if (transfer.status !== "pending") {
                return next(
                    new ApiError(
                        `This transfer has already been ${transfer.status}`,
                        400
                    )
                );
            }

            if (new Date(transfer.expires_at) < new Date()) {
                return next(
                    new ApiError("This transfer request has expired", 400)
                );
            }

            // Validate user permission based on action
            if (action === "accept" || action === "reject") {
                // Only target user can accept or reject
                if (userId !== transfer.target_user_id) {
                    return next(
                        new ApiError(
                            "Only the designated user can accept or reject this transfer",
                            403
                        )
                    );
                }
            } else if (action === "cancel") {
                // Only current owner can cancel
                if (userId !== transfer.current_owner_id) {
                    return next(
                        new ApiError(
                            "Only the current owner can cancel this transfer",
                            403
                        )
                    );
                }
            }

            if (action === "accept") {
                // Execute the ownership transfer
                const result =
                    await communityAdminModel.executeOwnershipTransfer(
                        transferId
                    );
                if (!result) {
                    return next(
                        new ApiError(
                            "Failed to complete ownership transfer",
                            500
                        )
                    );
                }

                // Send email to previous owner
                await emailService.sendOwnershipTransferCompletedEmail({
                    email: result.previousOwnerEmail,
                    name: result.previousOwnerName,
                    communityName: result.communityName,
                    newOwnerName: result.newOwnerName,
                    communityUrl: transfer.community_url,
                });

                // Send email to new owner
                await emailService.sendOwnershipConfirmationEmail({
                    email: result.newOwnerEmail,
                    name: result.newOwnerName,
                    communityName: result.communityName,
                    communityUrl: transfer.community_url,
                });

                res.json({
                    status: "success",
                    message: "Ownership transfer completed successfully",
                    data: {
                        transferId,
                        communityId: transfer.community_id,
                        previousOwnerId: transfer.current_owner_id,
                        newOwnerId: transfer.target_user_id,
                    },
                });
            } else {
                // Update the status for reject or cancel actions
                const newStatus = action === "reject" ? "rejected" : "canceled";
                const result =
                    await communityAdminModel.updateOwnershipTransferStatus(
                        transferId,
                        newStatus
                    );

                // Log the action
                await communityAdminModel.createAuditLog({
                    community_id: transfer.community_id,
                    user_id: userId,
                    action_type: `ownership_transfer_${newStatus}`,
                    metadata: {
                        transfer_id: transferId,
                        community_name: transfer.community_name,
                    },
                });

                // Send appropriate emails based on action
                if (action === "reject") {
                    // Notify current owner of rejection
                    await emailService.sendOwnershipTransferRejectedEmail({
                        email: transfer.current_owner_email,
                        name: transfer.current_owner_name,
                        communityName: transfer.community_name,
                        targetUserName: transfer.target_user_name,
                        communityUrl: transfer.community_url,
                    });
                } else {
                    // Notify target user of cancellation
                    await emailService.sendOwnershipTransferCanceledEmail({
                        email: transfer.target_user_email,
                        name: transfer.target_user_name,
                        communityName: transfer.community_name,
                        ownerName: transfer.current_owner_name,
                        communityUrl: transfer.community_url,
                    });
                }

                res.json({
                    status: "success",
                    message: `Ownership transfer ${newStatus} successfully`,
                    data: {
                        transferId,
                        communityId: transfer.community_id,
                        status: newStatus,
                    },
                });
            }
        } catch (error) {
            next(error);
        }
    }

    async getOwnershipTransferStatus(req, res, next) {
        try {
            const transferId = parseInt(req.params.transferId);
            const userId = req.user.id;

            const transfer = await communityAdminModel.getOwnershipTransfer(
                transferId
            );
            if (!transfer) {
                return next(new ApiError("Transfer request not found", 404));
            }

            // Check if user is involved in the transfer
            if (
                userId !== transfer.current_owner_id &&
                userId !== transfer.target_user_id
            ) {
                return next(
                    new ApiError(
                        "You are not authorized to view this transfer",
                        403
                    )
                );
            }

            // Check if transfer has expired but still marked as pending
            if (
                transfer.status === "pending" &&
                new Date(transfer.expires_at) < new Date()
            ) {
                transfer.status = "expired";
                await communityAdminModel.updateOwnershipTransferStatus(
                    transferId,
                    "expired"
                );
            }

            res.json({
                status: "success",
                data: {
                    transferId: transfer.id,
                    communityId: transfer.community_id,
                    communityName: transfer.community_name,
                    currentOwnerId: transfer.current_owner_id,
                    currentOwnerName: transfer.current_owner_name,
                    targetUserId: transfer.target_user_id,
                    targetUserName: transfer.target_user_name,
                    status: transfer.status,
                    expiresAt: transfer.expires_at,
                    createdAt: transfer.created_at,
                    updatedAt: transfer.updated_at,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // Helper methods
    _canAssignRole(assignerRole, roleToAssign) {
        // Define role hierarchy
        const roleHierarchy = {
            owner: ["organizer", "moderator", "member"],
            organizer: ["moderator", "member"],
            moderator: ["member"],
            member: [],
        };

        return roleHierarchy[assignerRole]?.includes(roleToAssign) || false;
    }
}

module.exports = new CommunityAdminController();
