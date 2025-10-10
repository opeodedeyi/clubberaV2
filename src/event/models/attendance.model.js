// src/event/models/attendance.model.js
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

class AttendanceModel {
    async markAttendance(eventId, userId, attended) {
        try {
            // Check if user has an attendance record
            const checkQuery = `
                SELECT * FROM event_attendees
                WHERE event_id = $1 AND user_id = $2;
            `;

            const checkResult = await db.query(checkQuery, [eventId, userId]);
            const existingAttendance = checkResult.rows[0];

            if (!existingAttendance) {
                throw new ApiError("User has not RSVP'd for this event", 404);
            }

            // Update the attendance record
            const updateQuery = `
                UPDATE event_attendees
                SET attended = $3, updated_at = NOW()
                WHERE event_id = $1 AND user_id = $2
                RETURNING *;
            `;

            const updateResult = await db.query(updateQuery, [
                eventId,
                userId,
                attended,
            ]);

            if (updateResult.rows.length === 0) {
                throw new ApiError("Failed to update attendance status", 500);
            }

            return {
                status: updateResult.rows[0].status,
                attended: updateResult.rows[0].attended,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
                `Error marking attendance: ${error.message}`,
                500
            );
        }
    }

    async setAttendanceStatus(eventId, userId, status) {
        try {
            // First, get the event to check capacity
            const eventQuery = `
                SELECT e.*, 
                (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id AND status = 'attending') AS current_attendees
                FROM events e
                WHERE e.id = $1;
            `;
            const eventResult = await db.query(eventQuery, [eventId]);

            if (eventResult.rows.length === 0) {
                throw new ApiError("Event not found", 404);
            }

            const event = eventResult.rows[0];

            // Check if user already has an attendance record
            const checkQuery = `
                SELECT * FROM event_attendees
                WHERE event_id = $1 AND user_id = $2;
            `;
            const checkResult = await db.query(checkQuery, [eventId, userId]);
            const existingAttendance = checkResult.rows[0];

            // Start transaction operations
            const operations = [];

            // Handle the various status change scenarios
            if (status === "attending") {
                // Check if event is at capacity
                if (
                    event.max_attendees !== null &&
                    parseInt(event.current_attendees) >= event.max_attendees &&
                    (!existingAttendance ||
                        existingAttendance.status !== "attending")
                ) {
                    // Event is full, set status to waitlisted
                    if (existingAttendance) {
                        // Update existing record to waitlisted
                        operations.push({
                            text: `
                                UPDATE event_attendees
                                SET status = 'waitlisted', updated_at = NOW()
                                WHERE event_id = $1 AND user_id = $2
                                RETURNING *;
                            `,
                            values: [eventId, userId],
                        });
                    } else {
                        // Create new waitlisted record
                        operations.push({
                            text: `
                                INSERT INTO event_attendees(event_id, user_id, status, created_at, updated_at)
                                VALUES($1, $2, 'waitlisted', NOW(), NOW())
                                RETURNING *;
                            `,
                            values: [eventId, userId],
                        });
                    }

                    // Return early with a special message
                    await db.executeTransaction(operations);

                    return {
                        status: "waitlisted",
                        message:
                            "Event is at capacity. You have been added to the waitlist.",
                    };
                }

                // Event has space or user is already attending
                if (existingAttendance) {
                    if (existingAttendance.status === "attending") {
                        // Already attending, no change needed
                        return { status: "attending" };
                    }

                    // Update from another status to attending
                    operations.push({
                        text: `
                            UPDATE event_attendees
                            SET status = 'attending', updated_at = NOW()
                            WHERE event_id = $1 AND user_id = $2
                            RETURNING *;
                        `,
                        values: [eventId, userId],
                    });

                    // Increment event attendee count
                    operations.push({
                        text: `
                            UPDATE events
                            SET current_attendees = current_attendees + 1, updated_at = NOW()
                            WHERE id = $1
                            RETURNING *;
                        `,
                        values: [eventId],
                    });
                } else {
                    // Create new attending record
                    operations.push({
                        text: `
                            INSERT INTO event_attendees(event_id, user_id, status, created_at, updated_at)
                            VALUES($1, $2, 'attending', NOW(), NOW())
                            RETURNING *;
                        `,
                        values: [eventId, userId],
                    });

                    // Increment event attendee count
                    operations.push({
                        text: `
                            UPDATE events
                            SET current_attendees = current_attendees + 1, updated_at = NOW()
                            WHERE id = $1
                            RETURNING *;
                        `,
                        values: [eventId],
                    });
                }
            } else if (status === "not_attending" || status === "maybe") {
                if (existingAttendance) {
                    const wasAttending =
                        existingAttendance.status === "attending";

                    // Update existing record
                    operations.push({
                        text: `
                            UPDATE event_attendees
                            SET status = $3, updated_at = NOW()
                            WHERE event_id = $1 AND user_id = $2
                            RETURNING *;
                        `,
                        values: [eventId, userId, status],
                    });

                    // If user was previously attending, decrement the counter
                    if (wasAttending) {
                        operations.push({
                            text: `
                                UPDATE events
                                SET current_attendees = current_attendees - 1, updated_at = NOW()
                                WHERE id = $1
                                RETURNING *;
                            `,
                            values: [eventId],
                        });

                        // If event has a waitlist, promote the next person
                        if (event.max_attendees !== null) {
                            // First, get the next waitlisted person
                            const nextWaitlistedQuery = `
                                SELECT user_id
                                FROM event_attendees
                                WHERE event_id = $1 AND status = 'waitlisted'
                                ORDER BY created_at ASC
                                LIMIT 1
                            `;
                            const nextWaitlistedResult = await db.query(nextWaitlistedQuery, [eventId]);

                            if (nextWaitlistedResult.rows.length > 0) {
                                const promotedUserId = nextWaitlistedResult.rows[0].user_id;

                                operations.push({
                                    text: `
                                        UPDATE event_attendees
                                        SET status = 'attending', updated_at = NOW()
                                        WHERE event_id = $1 AND user_id = $2 AND status = 'waitlisted'
                                        RETURNING *;
                                    `,
                                    values: [eventId, promotedUserId],
                                });

                                // Send notification to promoted user (after transaction)
                                // We'll handle this after the transaction completes
                                this._promotedUserId = promotedUserId;
                            }

                            // Don't increment counter here because we just decremented it and are replacing one attendee with another
                        }
                    }
                } else {
                    // Create new record with the specified status
                    operations.push({
                        text: `
                            INSERT INTO event_attendees(event_id, user_id, status, created_at, updated_at)
                            VALUES($1, $2, $3, NOW(), NOW())
                            RETURNING *;
                        `,
                        values: [eventId, userId, status],
                    });
                }
            } else {
                throw new ApiError(`Invalid attendance status: ${status}`, 400);
            }

            // Execute transaction
            await db.executeTransaction(operations);

            // Send waitlist promotion notification if someone was promoted
            if (this._promotedUserId) {
                try {
                    const NotificationService = require("../../notification/services/notification.service");

                    // Get event details
                    const eventDetailsQuery = `
                        SELECT e.id, e.title, p.community_id, c.name as community_name
                        FROM events e
                        JOIN posts p ON e.post_id = p.id
                        JOIN communities c ON p.community_id = c.id
                        WHERE e.id = $1
                    `;
                    const eventDetailsResult = await db.query(eventDetailsQuery, [eventId]);
                    const eventDetails = eventDetailsResult.rows[0];

                    await NotificationService.notifyWaitlistPromotion({
                        userId: this._promotedUserId,
                        eventId: eventDetails.id,
                        eventTitle: eventDetails.title,
                        communityName: eventDetails.community_name,
                    });

                    // Clear the promoted user ID
                    this._promotedUserId = null;
                } catch (error) {
                    console.error("Error sending waitlist promotion notification:", error);
                    // Don't throw error, as the promotion was successful
                }
            }

            // Return the current status
            return { status };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
                `Error setting attendance status: ${error.message}`,
                500
            );
        }
    }

    async getAttendanceStatus(eventId, userId) {
        try {
            const query = `
                SELECT status, created_at, updated_at
                FROM event_attendees
                WHERE event_id = $1 AND user_id = $2;
            `;

            const result = await db.query(query, [eventId, userId]);

            if (result.rows.length === 0) {
                return { status: null };
            }

            const attendance = result.rows[0];

            // If waitlisted, include position
            if (attendance.status === "waitlisted") {
                const positionQuery = `
                    SELECT COUNT(*) as position
                    FROM event_attendees
                    WHERE event_id = $1 AND status = 'waitlisted'
                    AND created_at < (
                        SELECT created_at
                        FROM event_attendees
                        WHERE event_id = $1 AND user_id = $2
                    );
                `;

                const positionResult = await db.query(positionQuery, [
                    eventId,
                    userId,
                ]);
                const position = parseInt(positionResult.rows[0].position) + 1;

                return {
                    status: attendance.status,
                    waitlistPosition: position,
                    createdAt: attendance.created_at,
                    updatedAt: attendance.updated_at,
                };
            }

            return {
                status: attendance.status,
                createdAt: attendance.created_at,
                updatedAt: attendance.updated_at,
            };
        } catch (error) {
            throw new ApiError(
                `Error getting attendance status: ${error.message}`,
                500
            );
        }
    }

    async getEventAttendees(eventId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                status = null, // null means all statuses
            } = options;

            const offset = (page - 1) * limit;
            const params = [eventId];
            let paramCounter = 2;

            // Build the WHERE clause
            let whereClause = `WHERE ea.event_id = $1`;

            if (status) {
                whereClause += ` AND ea.status = $${paramCounter}`;
                params.push(status);
                paramCounter++;
            }

            // Add pagination params
            params.push(limit);
            params.push(offset);

            const query = `
                SELECT ea.*, u.id as user_id, u.full_name, u.unique_url,
                (
                    SELECT key FROM images
                    WHERE entity_type = 'user' AND entity_id = u.id AND image_type = 'profile'
                    LIMIT 1
                ) as profile_image_key
                FROM event_attendees ea
                JOIN users u ON ea.user_id = u.id
                ${whereClause}
                ORDER BY 
                CASE WHEN ea.status = 'attending' THEN 1
                    WHEN ea.status = 'maybe' THEN 2
                    WHEN ea.status = 'waitlisted' THEN 3
                    ELSE 4
                END,
                ea.created_at ASC
                LIMIT $${paramCounter} OFFSET $${paramCounter + 1};
            `;

            const countQuery = `
                SELECT COUNT(*)
                FROM event_attendees ea
                ${whereClause};
            `;

            const [attendeesResult, countResult] = await Promise.all([
                db.query(query, params),
                db.query(countQuery, params.slice(0, status ? 2 : 1)), // Remove limit and offset params
            ]);

            // Calculate waitlist positions for waitlisted attendees
            const attendees = await Promise.all(
                attendeesResult.rows.map(async (row) => {
                    const attendee = {
                        id: row.id,
                        userId: row.user_id,
                        fullName: row.full_name,
                        uniqueUrl: row.unique_url,
                        profileImageKey: row.profile_image_key,
                        status: row.status,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                    };

                    // Add waitlist position if needed
                    if (row.status === "waitlisted") {
                        const positionQuery = `
                            SELECT COUNT(*) as position
                            FROM event_attendees
                            WHERE event_id = $1 AND status = 'waitlisted'
                            AND created_at < $2;
                        `;

                        const positionResult = await db.query(positionQuery, [
                            eventId,
                            row.created_at,
                        ]);
                        attendee.waitlistPosition =
                            parseInt(positionResult.rows[0].position) + 1;
                    }

                    return attendee;
                })
            );

            const totalCount = parseInt(countResult.rows[0].count);

            return {
                attendees,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems: totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                },
            };
        } catch (error) {
            throw new ApiError(
                `Error fetching event attendees: ${error.message}`,
                500
            );
        }
    }

    async canUserAttendEvent(eventId, userId) {
        try {
            // Get the event
            const eventQuery = `
                SELECT e.*, p.community_id, p.is_supporters_only
                FROM events e
                JOIN posts p ON e.post_id = p.id
                WHERE e.id = $1;
            `;

            const eventResult = await db.query(eventQuery, [eventId]);

            if (eventResult.rows.length === 0) {
                return {
                    canAttend: false,
                    reason: "Event not found",
                };
            }

            const event = eventResult.rows[0];

            // Check if event has already ended
            if (new Date(event.start_time) < new Date()) {
                return {
                    canAttend: false,
                    reason: "Event has already started or ended",
                };
            }

            // Handle membership using specialized model
            const CommunityMembershipModel = require("./communityMembership.model");
            const membershipResult = await CommunityMembershipModel.handleMembershipForEventAttendance(
                event.community_id,
                userId
            );

            if (!membershipResult.isMember) {
                return {
                    canAttend: false,
                    reason: membershipResult.reason,
                    actionTaken: membershipResult.actionTaken
                };
            }

            // Check if user has any active restrictions
            const restrictionQuery = `
                SELECT *
                FROM community_restrictions
                WHERE community_id = $1 AND user_id = $2
                AND type = 'ban'
                AND (expires_at IS NULL OR expires_at > NOW());
            `;

            const restrictionResult = await db.query(restrictionQuery, [
                event.community_id,
                userId,
            ]);

            if (restrictionResult.rows.length > 0) {
                return {
                    canAttend: false,
                    reason: "You are currently banned from this community",
                };
            }

            // Check if event is supporters-only
            if (event.is_supporters_only) {
                // Check if user is a supporter
                const supportQuery = `
                    SELECT *
                    FROM user_community_supports
                    WHERE community_id = $1 AND user_id = $2
                    AND status = 'active'
                    AND current_period_end > NOW();
                `;

                const supportResult = await db.query(supportQuery, [
                    event.community_id,
                    userId,
                ]);

                if (supportResult.rows.length === 0) {
                    return {
                        canAttend: false,
                        reason: "This event is for community supporters only",
                    };
                }
            }

            // All checks passed
            return {
                canAttend: true,
            };
        } catch (error) {
            throw new ApiError(
                `Error checking event attendance eligibility: ${error.message}`,
                500
            );
        }
    }
}

module.exports = new AttendanceModel();
