// src/utils/community-permissions.js
const db = require("../config/db");

/**
 * Community permission utilities for checking user roles and subscription status
 */
class CommunityPermissions {
    
    /**
     * Get user's role in a community
     * @param {number} userId 
     * @param {number} communityId 
     * @returns {Promise<{role: string|null, isMember: boolean}>}
     */
    static async getUserRole(userId, communityId) {
        try {
            const query = `
                SELECT role
                FROM community_members
                WHERE user_id = $1 AND community_id = $2;
            `;
            const result = await db.query(query, [userId, communityId]);

            if (result.rows.length === 0) {
                return { role: null, isMember: false };
            }

            return { 
                role: result.rows[0].role, 
                isMember: true 
            };
        } catch (error) {
            console.error('Error getting user role:', error);
            return { role: null, isMember: false };
        }
    }

    /**
     * Check if community has active paid subscription
     * @param {number} communityId 
     * @returns {Promise<{hasPaidPlan: boolean, planCode: string|null, features: object|null}>}
     */
    static async getCommunitySubscriptionStatus(communityId) {
        try {
            const query = `
                SELECT cs.status, sp.code, sp.features
                FROM community_subscriptions cs
                JOIN subscription_plans sp ON cs.plan_id = sp.id
                WHERE cs.community_id = $1 
                AND cs.status = 'active'
                AND cs.current_period_end > NOW();
            `;
            const result = await db.query(query, [communityId]);

            if (result.rows.length === 0) {
                return { 
                    hasPaidPlan: false, 
                    planCode: null, 
                    features: null 
                };
            }

            const subscription = result.rows[0];
            const hasPaidPlan = subscription.features?.pro_features === true;

            return {
                hasPaidPlan,
                planCode: subscription.code,
                features: subscription.features
            };
        } catch (error) {
            console.error('Error getting community subscription status:', error);
            return { 
                hasPaidPlan: false, 
                planCode: null, 
                features: null 
            };
        }
    }

    /**
     * Check if user can create events in community
     * Rules:
     * - Owners can always create events
     * - Organizers can create events only if community has active paid subscription
     * - Moderators/Members cannot create events
     */
    static async canCreateEvents(userId, communityId) {
        try {
            const { role, isMember } = await this.getUserRole(userId, communityId);

            if (!isMember) {
                return {
                    allowed: false,
                    reason: "You must be a member of this community to create events"
                };
            }

            // Owners can always create events
            if (role === 'owner') {
                return { allowed: true };
            }

            // Organizers can create events only if community has active paid subscription
            if (role === 'organizer') {
                const subscription = await this.getCommunitySubscriptionStatus(communityId);

                if (!subscription.hasPaidPlan) {
                    return {
                        allowed: false,
                        reason: "Only community owners can create events on the free plan. Upgrade to Pro to allow organizers to create events."
                    };
                }

                return { allowed: true };
            }

            // Moderators and members cannot create events
            return {
                allowed: false,
                reason: "Only community owners and organizers can create events"
            };

        } catch (error) {
            console.error('Error checking event creation permissions:', error);
            return {
                allowed: false,
                reason: "Unable to verify permissions. Please try again."
            };
        }
    }

    /**
     * Check if user can manage events (edit/delete)
     * Rules:
     * - Event creators can manage their own events (if they still have creation permissions)
     * - Community owners can always manage any event in their community
     * - Community organizers can manage events only if community has paid subscription
     * - Moderators cannot manage events (only owners and organizers can)
     */
    static async canManageEvent(userId, eventId) {
        try {
            const query = `
                SELECT e.*, p.user_id as event_creator_id, p.community_id,
                       cm.role as user_role
                FROM events e
                JOIN posts p ON e.post_id = p.id
                LEFT JOIN community_members cm ON p.community_id = cm.community_id AND cm.user_id = $1
                WHERE e.id = $2;
            `;
            const result = await db.query(query, [userId, eventId]);

            if (result.rows.length === 0) {
                return {
                    allowed: false,
                    reason: "Event not found"
                };
            }

            const event = result.rows[0];

            // If user is not a community member, check if they're the event creator
            if (!event.user_role) {
                if (event.event_creator_id === userId) {
                    // Event creator can manage their event only if they still have permission to create events
                    return await this.canCreateEvents(userId, event.community_id);
                }
                return {
                    allowed: false,
                    reason: "You don't have permission to manage this event"
                };
            }

            // Community owners can always manage any event
            if (event.user_role === 'owner') {
                return { allowed: true };
            }

            // Community organizers can manage events only if community has paid subscription
            if (event.user_role === 'organizer') {
                const subscription = await this.getCommunitySubscriptionStatus(event.community_id);

                if (!subscription.hasPaidPlan) {
                    return {
                        allowed: false,
                        reason: "Only community owners can manage events on the free plan. Upgrade to Pro to allow organizers to manage events."
                    };
                }

                return { allowed: true };
            }

            // Moderators and members cannot manage events
            return {
                allowed: false,
                reason: "Only community owners and organizers can manage events"
            };

        } catch (error) {
            console.error('Error checking event management permissions:', error);
            return {
                allowed: false,
                reason: "Unable to verify permissions. Please try again."
            };
        }
    }

    /**
     * Check if user can manage community (general admin actions)
     * @param {number} userId 
     * @param {number} communityId 
     * @param {string[]} allowedRoles - Array of roles allowed (default: ['owner', 'organizer', 'moderator'])
     */
    static async canManageCommunity(userId, communityId, allowedRoles = ['owner', 'organizer', 'moderator']) {
        try {
            const { role, isMember } = await this.getUserRole(userId, communityId);

            if (!isMember) {
                return {
                    allowed: false,
                    reason: "You are not a member of this community"
                };
            }

            if (allowedRoles.includes(role)) {
                return { allowed: true, role };
            }

            return {
                allowed: false,
                reason: `You need ${allowedRoles.join(' or ')} permissions to perform this action`
            };

        } catch (error) {
            console.error('Error checking community management permissions:', error);
            return {
                allowed: false,
                reason: "Unable to verify permissions. Please try again."
            };
        }
    }
}

module.exports = CommunityPermissions;