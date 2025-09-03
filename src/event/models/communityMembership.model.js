// src/event/models/communityMembership.model.js

const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

class CommunityMembershipModel {
    async checkMembership(communityId, userId) {
        try {
            const query = `
                SELECT role
                FROM community_members
                WHERE community_id = $1 AND user_id = $2;
            `;
            
            const result = await db.query(query, [communityId, userId]);
            return result.rows[0] || null;
        } catch (error) {
            throw new ApiError(`Error checking membership: ${error.message}`, 500);
        }
    }

    async checkActiveBan(communityId, userId) {
        try {
            const query = `
                SELECT *
                FROM community_restrictions
                WHERE community_id = $1 AND user_id = $2
                AND type = 'ban'
                AND (expires_at IS NULL OR expires_at > NOW());
            `;
            
            const result = await db.query(query, [communityId, userId]);
            return result.rows.length > 0;
        } catch (error) {
            throw new ApiError(`Error checking ban status: ${error.message}`, 500);
        }
    }

    async getCommunityPrivacyStatus(communityId) {
        try {
            const query = `
                SELECT is_private
                FROM communities
                WHERE id = $1 AND is_active = true;
            `;
            
            const result = await db.query(query, [communityId]);
            
            if (result.rows.length === 0) {
                throw new ApiError("Community not found", 404);
            }
            
            return result.rows[0].is_private;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error getting community privacy status: ${error.message}`, 500);
        }
    }

    async autoJoinPublicCommunity(communityId, userId) {
        try {
            // First check if community is public
            const isPrivate = await this.getCommunityPrivacyStatus(communityId);
            if (isPrivate) {
                throw new ApiError("Cannot auto-join private community", 400);
            }

            // Check if user is banned
            const isBanned = await this.checkActiveBan(communityId, userId);
            if (isBanned) {
                throw new ApiError("Cannot join community - user is banned", 403);
            }

            // Check if user is already a member
            const existingMembership = await this.checkMembership(communityId, userId);
            if (existingMembership) {
                return existingMembership;
            }

            // Add user as member
            const query = `
                INSERT INTO community_members (community_id, user_id, role, joined_at)
                VALUES ($1, $2, 'member', NOW())
                RETURNING *;
            `;

            const result = await db.query(query, [communityId, userId]);
            return result.rows[0];
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error auto-joining community: ${error.message}`, 500);
        }
    }

    async createJoinRequest(communityId, userId, message = null) {
        try {
            // Check if join request already exists
            const existingRequestQuery = `
                SELECT id, status
                FROM community_join_requests
                WHERE community_id = $1 AND user_id = $2
                AND status = 'pending';
            `;

            const existingResult = await db.query(existingRequestQuery, [communityId, userId]);
            
            if (existingResult.rows.length > 0) {
                return existingResult.rows[0]; // Return existing pending request
            }

            // Create new join request
            const query = `
                INSERT INTO community_join_requests (community_id, user_id, message, status, created_at)
                VALUES ($1, $2, $3, 'pending', NOW())
                RETURNING *;
            `;

            const result = await db.query(query, [
                communityId,
                userId,
                message || "Requested to join in order to attend event"
            ]);

            return result.rows[0];
        } catch (error) {
            throw new ApiError(`Error creating join request: ${error.message}`, 500);
        }
    }

    async handleMembershipForEventAttendance(communityId, userId) {
        try {
            // Check if user is already a member
            const membership = await this.checkMembership(communityId, userId);
            if (membership) {
                return {
                    isMember: true,
                    membership,
                    actionTaken: null
                };
            }

            // User is not a member - check community privacy
            const isPrivate = await this.getCommunityPrivacyStatus(communityId);
            
            if (isPrivate) {
                // For private communities, create join request
                const joinRequest = await this.createJoinRequest(communityId, userId);
                
                return {
                    isMember: false,
                    membership: null,
                    actionTaken: "join_request_sent",
                    joinRequest,
                    reason: "You must be a member of the community to attend this event. A join request has been sent."
                };
            } else {
                // For public communities, auto-join
                const newMembership = await this.autoJoinPublicCommunity(communityId, userId);
                
                return {
                    isMember: true,
                    membership: newMembership,
                    actionTaken: "auto_joined"
                };
            }
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error handling membership for event attendance: ${error.message}`, 500);
        }
    }
}

module.exports = new CommunityMembershipModel();